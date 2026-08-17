import { Output, ToolLoopAgent, isStepCount, tool } from "ai";
import { z } from "zod";
import {
  type CellInput,
  type CellUsage,
  type DriverDescriptor,
} from "./contracts";
import {
  CellExecutionError,
  type CellDriver,
  type DriverContext,
  type DriverResult,
} from "./driver";
// AI SDK and provider types remain confined to this adapter.
import { compileOutputSchema } from "./output-schema";
import { normalizeAiSdkUsage as normalizeUsage } from "./ai-sdk-usage";
import { settleStructuredOutput, type StructuredSettlementResult } from "./structured-settlement";
import { TaskStore } from "./task-store";
import {
  createHostTools,
  EXECUTION_TOOL_NAMES,
  terminalActionRequired,
} from "./host-tools";
import {
  createValidationModel,
  validationModelName,
  validationProviderName,
  type ValidationModelOptions,
} from "./validation-model";
import {
  addUsage,
  asRecord,
  emptyUsage,
  renderExecutionInstructions,
  renderFirstUserInput,
  renderRecoveryEvidence,
  safeToolTarget,
  sanitize,
  taskToolNames,
} from "./driver-common";

export type AiSdkDriverOptions = ValidationModelOptions & {
  /** Host-selected Task authority; it changes the actual tool surface, not only the prompt. */
  taskToolSet?: TaskToolSet;
};

export const TaskToolSetSchema = z.enum(["manage", "read-update", "read-only"]);
export type TaskToolSet = z.infer<typeof TaskToolSetSchema>;

const MAX_AGENT_OUTPUT_TOKENS = 16_000;
const STREAM_PROGRESS_CHARACTERS = 1_000;

interface MaterializedAgentResult {
  text: string;
  output?: unknown;
  readOutput?: () => Promise<unknown>;
  totalUsage: unknown;
  providerMetadata: unknown;
  steps: unknown[];
}

export class AiSdkValidationDriver implements CellDriver {
  readonly descriptor: DriverDescriptor;
  protected readonly model;
  private readonly structuredOutputMode: "inline" | "tool-settlement";
  private readonly taskToolSet: NonNullable<AiSdkDriverOptions["taskToolSet"]>;

  constructor(options: AiSdkDriverOptions = {}) {
    const selection = createValidationModel(options);
    this.model = selection.model;
    this.structuredOutputMode = selection.structuredOutputMode;
    this.taskToolSet = options.taskToolSet ?? "manage";
    this.descriptor = {
      adapter: "ai-sdk-v7",
      provider: validationProviderName(selection),
      model: validationModelName(selection),
      ...(selection.pricing ? { pricing: selection.pricing } : {}),
    };
  }

  async run(
    input: CellInput,
    context: DriverContext,
  ): Promise<DriverResult> {
    const terminalToolsCalled = new Set<string>();
    const tasks = TaskStore.fromSeeds(input.tasks, input.id);
    context.emit("task.tools.projected", {
      taskToolSet: this.taskToolSet,
      tools: taskToolNames(this.taskToolSet),
    });
    let terminalProtocolError: string | undefined;
    let terminalOnly = false;
    const outputSchema = input.outputSchema ? compileOutputSchema(input.outputSchema) : undefined;
    // Inline structured output is a provider-adapter decision; the tool-based
    // settlement path stays the fallback for providers without native support.
    const inlineOutputSchema = this.structuredOutputMode === "inline"
      ? outputSchema
      : undefined;
    const deferredStructuredOutput = outputSchema !== undefined && inlineOutputSchema === undefined;
    const tools = this.createExecutionTools(
      input,
      context,
      (name) => {
        if (terminalToolsCalled.size > 0) {
          terminalProtocolError = `expected exactly one terminal tool call; received ${[
            ...terminalToolsCalled,
            name,
          ].join(", ")}`;
          context.emit("terminal.contract.violation", { error: terminalProtocolError });
          return false;
        }
        terminalToolsCalled.add(name);
        return true;
      },
      () => terminalOnly,
      tasks,
    );
    const terminalNames = input.terminalTools?.map((terminal) => terminal.name) ?? [];
    const terminalSatisfied = () => terminalNames.some((name) => terminalToolsCalled.has(name));
    const stopAfterAcceptedTerminal = () => terminalSatisfied();
    const stopAfterCancellation = () => context.signal.aborted;
    const executionAgent = new ToolLoopAgent({
      model: this.model,
      instructions: renderExecutionInstructions(input, {
        deferStructuredOutput: deferredStructuredOutput,
        taskToolSet: this.taskToolSet,
      }),
      tools,
      stopWhen: [
        ...(input.budget.maxSteps === undefined ? [] : [isStepCount(input.budget.maxSteps)]),
        ...(terminalNames.length > 0 && !inlineOutputSchema ? [stopAfterAcceptedTerminal] : []),
        stopAfterCancellation,
      ],
      ...(inlineOutputSchema ? { output: Output.object({ schema: inlineOutputSchema.forAiSdk() }) } : {}),
      ...(input.terminalTools?.length
        ? {
            prepareStep: ({ stepNumber }) => {
              if (terminalSatisfied()) {
                terminalOnly = true;
                return finalOutputStep(input, inlineOutputSchema !== undefined, this.taskToolSet);
              }
              // A terminal-only Cell needs one final action turn. When an
              // independent structured output is also required, reserve a
              // second tool-free turn for that result. Applies only when the
              // caller selected an explicit finite step policy; an omitted
              // maxSteps never creates a hidden step deadline.
              const reservedSteps = inlineOutputSchema ? 2 : 1;
              if (input.budget.maxSteps !== undefined
                && stepNumber >= input.budget.maxSteps - reservedSteps) {
                terminalOnly = true;
                return {
                  // Terminal tools are dynamically registered from the caller's
                  // contract, so their names are not visible to AI SDK's static
                  // tool-set inference.
                  activeTools: terminalNames as never[],
                  toolChoice: terminalToolChoice(terminalNames) as never,
                  instructions: `${renderExecutionInstructions(input, {
                    deferStructuredOutput: deferredStructuredOutput,
                    taskToolSet: this.taskToolSet,
                  })}\n\nYou have reached the final action step. Invoke exactly one declared terminal tool now; do not continue analysis.`,
                };
              }
              terminalOnly = false;
              return undefined;
            },
          }
        : {}),
      maxOutputTokens: MAX_AGENT_OUTPUT_TOKENS,
      temperature: 0,
    });
    let observedUsage: CellUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 };
    let observedSettlementUsage: CellUsage = emptyUsage();
    let closureUsage: CellUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 };
    let executionResult: MaterializedAgentResult;
    let closureResult: MaterializedAgentResult | undefined;
    const firstUserInput = await renderFirstUserInput(input, context);
    try {
      const callbacks: Parameters<typeof executionAgent.generate>[0] = {
        ...(typeof firstUserInput === "string"
          ? { prompt: firstUserInput }
          : { messages: [firstUserInput] }),
        abortSignal: context.signal,
        timeout: { totalMs: input.budget.maxDurationMs },
        onStepStart: ({ callId, provider, modelId, stepNumber, activeTools }) => {
          context.emit("agent.step.started", {
            callId,
            provider,
            model: modelId,
            stepNumber,
            activeTools,
          });
        },
        onToolExecutionStart: ({ callId, toolCall }) => {
          context.emit("agent.tool.started", {
            callId,
            id: toolCall.toolCallId,
            name: toolCall.toolName,
            ...safeToolTarget(toolCall.toolName, toolCall.input),
          });
        },
        onToolExecutionEnd: ({ callId, toolCall, toolExecutionMs, toolOutput }) => {
          context.emit("agent.tool.finished", {
            callId,
            id: toolCall.toolCallId,
            name: toolCall.toolName,
            durationMs: toolExecutionMs,
            outcome: toolOutput.type,
          });
        },
        onStepEnd: ({ usage, finishReason, performance, providerMetadata, toolCalls, toolResults }) => {
          const stepUsage = normalizeUsage(usage, providerMetadata);
          observedUsage = addUsage(observedUsage, stepUsage);
          context.observeUsage(stepUsage, "execution");
          context.emit("agent.step.finished", {
            finishReason,
            performance: sanitize(performance),
            providerMetadata: sanitize(providerMetadata),
            usage,
            cumulativeUsage: observedUsage,
            toolCalls: sanitize(toolCalls),
            toolResults: sanitize(toolResults),
          });
        },
      };
      if (context.liveObservation) {
        const observeChunk = createStreamActivityObserver(context, "execution");
        const streamed = await executionAgent.stream(callbacks);
        for await (const chunk of streamed.stream) observeChunk(chunk);
        executionResult = await materializeStreamedResult(streamed, inlineOutputSchema !== undefined);
      } else {
        const generated = await executionAgent.generate(callbacks);
        executionResult = materializeGeneratedResult(generated, inlineOutputSchema !== undefined);
      }
    } catch (error) {
      if (terminalProtocolError) {
        throw new CellExecutionError(terminalProtocolError, observedUsage, observedSettlementUsage);
      } else if (terminalSatisfied() && !inlineOutputSchema) {
        executionResult = terminalOnlyResult(terminalNames, observedUsage, "execution");
      } else {
        throw new CellExecutionError(
          error instanceof Error ? error.message : String(error),
          observedUsage,
          observedSettlementUsage,
        );
      }
    }
    if (context.signal.aborted) {
      throw new CellExecutionError(
        context.signal.reason instanceof Error
          ? context.signal.reason.message
          : String(context.signal.reason ?? "Cell execution cancelled"),
        observedUsage,
        observedSettlementUsage,
      );
    }
    if (terminalSatisfied() && !inlineOutputSchema && !executionResult.text.trim()) {
      executionResult = {
        ...executionResult,
        text: terminalOnlyResult(terminalNames, emptyUsage(), "execution").text,
      };
    }
    const needsTerminalCarrier = input.terminalTools?.length && !terminalSatisfied();
    if (needsTerminalCarrier) {
      context.emit("terminal.contract.recovery", { requiredTools: input.terminalTools, reason: "natural_finish_without_terminal_tool" });
      const availableTools = tools as Record<string, (typeof tools)[keyof typeof tools]>;
      const closureTools = Object.fromEntries(
        terminalNames.map((name) => [name, availableTools[name]!]),
      );
      const closureAgent = new ToolLoopAgent({
        model: this.model,
        instructions: [
          renderExecutionInstructions(input, {
            deferStructuredOutput: deferredStructuredOutput,
            taskToolSet: this.taskToolSet,
          }),
          "## Terminal recovery phase",
          "The previous work ended without satisfying its terminal-tool contract. Do not continue investigation.",
          "Only the original task context and a compact projection of successful tool results are present; prior assistant reasoning, prose, rejected calls, and other transcript messages are absent. Retained results remain usable evidence, and a later rejected tool call does not erase them or prove that no files were read.",
          "Use the retained evidence, bound only genuinely missing facts, and invoke exactly one declared terminal tool now.",
          ...(terminalNames.length > 0
            ? [`You must invoke exactly one of: ${terminalNames.join(", ")}, then return a concise final report.`]
            : ["Return the smallest truthful final report now. Do not take any action or add facts."]),
        ].join("\n"),
        tools: closureTools,
        stopWhen: terminalNames.length === 0
          ? isStepCount(1)
          : inlineOutputSchema
          ? isStepCount(3)
          : [isStepCount(2), stopAfterAcceptedTerminal],
        ...(inlineOutputSchema ? { output: Output.object({ schema: inlineOutputSchema.forAiSdk() }) } : {}),
        prepareStep: () => {
          if (terminalNames.length === 0) {
            terminalOnly = true;
            return { activeTools: [], toolChoice: "none" as const };
          }
          if (terminalSatisfied()) {
            terminalOnly = true;
            return finalOutputStep(input, inlineOutputSchema !== undefined, this.taskToolSet);
          }
          terminalOnly = true;
          return {
            activeTools: terminalNames,
            toolChoice: terminalToolChoice(terminalNames) as never,
          };
        },
        // Recovery must be able to emit every terminal payload admitted by the
        // main loop. A smaller provider limit can truncate otherwise valid tool
        // input before Work Cell gets a chance to verify it.
        maxOutputTokens: MAX_AGENT_OUTPUT_TOKENS,
        temperature: 0,
      });
      try {
        const generatedClosure = await closureAgent.generate({
          messages: [
            typeof firstUserInput === "string"
              ? { role: "user", content: firstUserInput }
              : firstUserInput,
            {
              role: "user",
              content: `Retained successful tool evidence from the execution trace:\n${renderRecoveryEvidence(executionResult.steps)}`,
            },
            {
              role: "user",
              content: "The work above ended without satisfying its terminal-tool contract. Use the retained investigation context and invoke exactly one declared terminal tool now. Do not restart the task.",
            },
          ],
          abortSignal: context.signal,
          timeout: { totalMs: input.budget.maxDurationMs },
          onStepEnd: ({ usage, finishReason, performance, providerMetadata, toolCalls, toolResults }) => {
            const stepUsage = normalizeUsage(usage, providerMetadata);
            closureUsage = addUsage(closureUsage, stepUsage);
            context.observeUsage(stepUsage, "execution");
            context.emit("terminal.recovery.step.finished", {
              finishReason,
              performance: sanitize(performance),
              providerMetadata: sanitize(providerMetadata),
              usage,
              cumulativeUsage: closureUsage,
              toolCalls: sanitize(toolCalls),
              toolResults: sanitize(toolResults),
            });
          },
        });
        closureResult = materializeGeneratedResult(generatedClosure, inlineOutputSchema !== undefined);
      } catch (error) {
        if (terminalProtocolError) {
          throw new CellExecutionError(
            terminalProtocolError,
            addUsage(observedUsage, closureUsage),
            observedSettlementUsage,
          );
        } else if (terminalSatisfied() && !inlineOutputSchema) {
          closureResult = terminalOnlyResult(terminalNames, closureUsage, "recovery");
        } else {
          throw new CellExecutionError(
            error instanceof Error ? error.message : String(error),
            addUsage(observedUsage, closureUsage),
            observedSettlementUsage,
          );
        }
      }
      if (closureResult && terminalSatisfied() && !inlineOutputSchema && !closureResult.text.trim()) {
        closureResult = {
          ...closureResult,
          text: terminalOnlyResult(terminalNames, emptyUsage(), "recovery").text,
        };
      }
    }
    if (terminalProtocolError) {
      throw new CellExecutionError(
        terminalProtocolError,
        addUsage(observedUsage, closureUsage),
        observedSettlementUsage,
      );
    }
    const executionUsage = addUsage(
      normalizeUsage(executionResult.totalUsage, executionResult.providerMetadata),
      closureResult ? normalizeUsage(closureResult.totalUsage, closureResult.providerMetadata) : emptyUsage(),
    );
    let settlement: StructuredSettlementResult | undefined;
    let output: unknown;
    if (inlineOutputSchema) {
      try {
        const selectedResult = closureResult ?? executionResult;
        output = selectedResult.readOutput
          ? await selectedResult.readOutput()
          : selectedResult.output;
      } catch (error) {
        throw new CellExecutionError(
          error instanceof Error ? error.message : String(error),
          addUsage(observedUsage, closureUsage),
          observedSettlementUsage,
        );
      }
    } else if (outputSchema) {
      context.emit("structured.settlement.started", { mode: "tool-settlement" });
      settlement = await settleStructuredOutput({
        model: this.model,
        schema: outputSchema,
        intent: input.intent,
        acceptance: input.acceptance,
        retainedEvidence: [
          executionResult.text,
          closureResult?.text,
          renderRecoveryEvidence([...executionResult.steps, ...(closureResult?.steps ?? [])]),
        ].filter((part): part is string => Boolean(part?.trim())).join("\n\n"),
        context,
        maxOutputTokens: MAX_AGENT_OUTPUT_TOKENS,
      });
      if (settlement.output === undefined) {
        const failedSettlementUsage = addUsage(observedSettlementUsage, settlement.usage);
        throw new CellExecutionError(
          settlement.error ?? "structured settlement produced no output",
          addUsage(executionUsage, settlement.usage),
          failedSettlementUsage,
        );
      }
      output = settlement.output;
      context.emit("structured.settlement.finished", { mode: "tool-settlement" });
    }
    const usage = settlement ? addUsage(executionUsage, settlement.usage) : executionUsage;
    const settlementUsage = settlement
      ? addUsage(observedSettlementUsage, settlement.usage)
      : observedSettlementUsage;
    return {
      terminalToolsCalled: [...terminalToolsCalled],
      ...(tasks.snapshot().length > 0 ? { tasks: tasks.snapshot() } : {}),
      finalText: closureResult ? `${executionResult.text}\n\n${closureResult.text}` : executionResult.text,
      ...(output === undefined ? {} : { output }),
      usage,
      ...(settlementUsage.totalTokens > 0 ? { settlementUsage } : {}),
      rawSteps: sanitize([
        ...executionResult.steps,
        ...(closureResult?.steps ?? []),
        ...(settlement?.rawSteps ?? []),
      ]) as unknown[],
      providerMetadata: sanitize(executionResult.providerMetadata),
    };
  }

  /**
   * Narrow adapter seam for experiments that present state after a confirmed
   * write. The production driver preserves the ordinary tool result exactly;
   * subclasses own any additional policy and evidence.
   */
  protected decorateSuccessfulWriteResult(
    result: { path: string; characters: number },
    _context: DriverContext,
  ): unknown {
    return result;
  }

  private createExecutionTools(
    input: CellInput,
    context: DriverContext,
    markTerminalTool: (name: string) => boolean,
    terminalOnly: () => boolean,
    tasks: TaskStore,
  ) {
    const conflictingTerminalNames = (input.terminalTools ?? [])
      .map((terminal) => terminal.name)
      .filter((name) => EXECUTION_TOOL_NAMES.has(name));
    if (conflictingTerminalNames.length > 0) {
      throw new Error(
        `terminal tool names conflict with AI SDK execution tools: ${conflictingTerminalNames.join(", ")}`,
      );
    }

    const tools = createHostTools({
      input,
      context,
      tasks,
      taskToolSet: this.taskToolSet,
      fullWriteMode: "overwrite-allowed",
      actionBlocked: () => terminalOnly() ? terminalActionRequired() : undefined,
      decorateWriteResult: (result, hostContext) => this.decorateSuccessfulWriteResult(result, hostContext),
    });
    return {
      ...tools,
      ...Object.fromEntries((input.terminalTools ?? []).map((terminal) => [terminal.name, tool({
        description: terminal.description,
        inputSchema: z.fromJSONSchema(terminal.inputSchema),
        execute: async (value) => {
          if (!markTerminalTool(terminal.name)) return { accepted: false };
          context.emit("terminal.tool.called", { name: terminal.name, input: value });
          return { accepted: true };
        },
      })])),
    };
  }
}

function terminalToolChoice(names: string[]) {
  return names.length === 1
    ? { type: "tool" as const, toolName: names[0]! }
    : "required" as const;
}

function finalOutputStep(
  input: CellInput,
  inlineStructuredOutput: boolean,
  taskToolSet: TaskToolSet,
) {
  return {
    activeTools: [],
    toolChoice: "none" as const,
    instructions: `${renderExecutionInstructions(input, {
      deferStructuredOutput: input.outputSchema !== undefined && !inlineStructuredOutput,
      taskToolSet,
    })}\n\nA declared terminal tool has been called. Do not take further actions. Return the final ${inlineStructuredOutput ? "structured output" : "concise report"} now.`,
  };
}

function terminalOnlyResult(names: string[], usage: CellUsage, phase: "execution" | "recovery") {
  return {
    text: `Terminal contract satisfied during ${phase} through ${names.join(", ")}; no final text was generated.`,
    output: undefined,
    totalUsage: usage,
    providerMetadata: undefined,
    steps: [],
  };
}

function materializeGeneratedResult(
  result: {
    text: string;
    output?: unknown;
    totalUsage: unknown;
    providerMetadata: unknown;
    steps: unknown[];
  },
  includeOutput: boolean,
): MaterializedAgentResult {
  return {
    text: result.text,
    ...(includeOutput ? { readOutput: async () => result.output } : {}),
    totalUsage: result.totalUsage,
    providerMetadata: result.providerMetadata,
    steps: result.steps,
  };
}

async function materializeStreamedResult(
  result: {
    text: PromiseLike<string>;
    output: PromiseLike<unknown>;
    totalUsage: PromiseLike<unknown>;
    providerMetadata: PromiseLike<unknown>;
    steps: PromiseLike<unknown[]>;
  },
  includeOutput: boolean,
): Promise<MaterializedAgentResult> {
  const [text, totalUsage, providerMetadata, steps] = await Promise.all([
    result.text,
    result.totalUsage,
    result.providerMetadata,
    result.steps,
  ]);
  return {
    text,
    ...(includeOutput ? { readOutput: async () => await result.output } : {}),
    totalUsage,
    providerMetadata,
    steps,
  };
}

function createStreamActivityObserver(context: DriverContext, phase: string) {
  const reasoning = new Map<string, { characters: number; reported: number }>();
  const responses = new Map<string, { characters: number; reported: number }>();

  return (chunk: unknown): void => {
    const value = asRecord(chunk);
    const type = typeof value.type === "string" ? value.type : "";
    const id = typeof value.id === "string" ? value.id : "unknown";

    if (type === "reasoning-start") {
      reasoning.set(id, { characters: 0, reported: 0 });
      context.emit("agent.reasoning.started", { phase, id });
      return;
    }
    if (type === "reasoning-delta") {
      const state = reasoning.get(id) ?? { characters: 0, reported: 0 };
      if (!reasoning.has(id)) context.emit("agent.reasoning.started", { phase, id });
      const text = typeof value.text === "string" ? value.text : "";
      state.characters += text.length;
      reasoning.set(id, state);
      if (state.characters - state.reported >= STREAM_PROGRESS_CHARACTERS) {
        state.reported = state.characters;
        context.emit("agent.reasoning.progress", { phase, id, characters: state.characters });
      }
      return;
    }
    if (type === "reasoning-end") {
      const state = reasoning.get(id) ?? { characters: 0, reported: 0 };
      context.emit("agent.reasoning.finished", { phase, id, characters: state.characters });
      reasoning.delete(id);
      return;
    }
    if (type === "text-start") {
      responses.set(id, { characters: 0, reported: 0 });
      context.emit("agent.response.started", { phase, id });
      return;
    }
    if (type === "text-delta") {
      const state = responses.get(id) ?? { characters: 0, reported: 0 };
      if (!responses.has(id)) context.emit("agent.response.started", { phase, id });
      const text = typeof value.text === "string" ? value.text : "";
      state.characters += text.length;
      responses.set(id, state);
      if (state.characters - state.reported >= STREAM_PROGRESS_CHARACTERS) {
        state.reported = state.characters;
        context.emit("agent.response.progress", { phase, id, characters: state.characters });
      }
      return;
    }
    if (type === "text-end") {
      const state = responses.get(id) ?? { characters: 0, reported: 0 };
      context.emit("agent.response.finished", { phase, id, characters: state.characters });
      responses.delete(id);
    }
  };
}
