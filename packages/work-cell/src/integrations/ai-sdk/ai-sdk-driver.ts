import { Output, ToolLoopAgent, isStepCount, tool } from "ai";
import { z } from "zod";
import {
  type CellInput,
  type CellUsage,
  type DriverDescriptor,
} from "../../contracts";
import {
  CellExecutionError,
  TerminalContractError,
  createStepAllowance,
  stepBudgetExhaustedMessage,
  type CellDriver,
  type DriverContext,
  type DriverResult,
} from "../../driver";
// AI SDK and provider types remain confined to this Integration island.
import { compileAiSdkOutputSchema } from "./output-schema";
import { normalizeAiSdkUsage as normalizeUsage } from "./ai-sdk-usage";
import { settleStructuredOutput, type StructuredSettlementResult } from "./structured-settlement";
import { TaskStore } from "../../task-store";
import {
  createCellToolDefinitions,
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
import type { TaskToolSet } from "./task-tool-set";

export type AiSdkDriverOptions = ValidationModelOptions & {
  /** Host-selected Task authority; it changes the actual tool surface, not only the prompt. */
  taskToolSet?: TaskToolSet;
};

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
  /** Declared cell-tool capability: the AI SDK adapter translates the neutral tool surface. */
  readonly supportsCellTools: true = true;
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
    // Injected cell tools retain only name, exact toolCallId, and settled
    // outcome per invocation. `DriverContext.cellTools` is already the gated
    // `CellToolSurface`; its neutral definitions live directly at
    // `context.cellTools.tools`. For an injected-tool run the adapter applies
    // one fail-closed retained-evidence projection: injected entries are
    // removed from step-level tool evidence, provider metadata is never
    // retained into the trace, and the final rawSteps and providerMetadata
    // are omitted entirely, because raw provider steps and metadata can echo
    // injected inputs or results. Normalized usage and the bounded
    // cell.tool.* events are preserved; runs without injected tools are
    // unchanged.
    const injectedCellToolsPresent = context.cellTools !== undefined;
    const injectedCellToolNames = context.cellTools
      ? new Set(Object.keys(context.cellTools.tools))
      : undefined;
    context.emit("task.tools.projected", {
      taskToolSet: this.taskToolSet,
      tools: taskToolNames(this.taskToolSet),
    });
    let terminalProtocolError: string | undefined;
    let terminalOnly = false;
    const outputSchema = input.outputSchema ? compileAiSdkOutputSchema(input.outputSchema) : undefined;
    // Inline structured output is a provider-adapter decision; the tool-based
    // settlement path stays the fallback for providers without native support.
    const inlineOutputSchema = this.structuredOutputMode === "inline"
      ? outputSchema
      : undefined;
    const deferredStructuredOutput = outputSchema !== undefined && inlineOutputSchema === undefined;
    // One shared monotonic, non-extendable explicit step allowance for every
    // provider/model step: the main loop, terminal recovery, and structured
    // settlement consume the same count. An omitted maxSteps installs no
    // step-count ceiling, so only maxDurationMs and the caller's abort signal
    // remain.
    const stepAllowance = createStepAllowance(input.budget.maxSteps);
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
    const hasTerminalTools = (input.terminalTools?.length ?? 0) > 0;
    const terminalSatisfied = () => terminalNames.some((name) => terminalToolsCalled.has(name));
    const stopAfterAcceptedTerminal = () => terminalSatisfied();
    const stopAfterCancellation = () => context.signal.aborted;
    // Phase ownership for simultaneous terminal and inline structured-output
    // contracts: the main execution phase never requires the final structured
    // output before terminal satisfaction. It may end naturally or stop right
    // after an accepted terminal tool; inline `Output.object` attaches only to
    // the closure phase, which performs terminal recovery and the final output
    // step under the same shared step allowance. A Cell with inline output but
    // no terminal tools keeps the single-agent inline path unchanged.
    const mainInlineOutput = inlineOutputSchema !== undefined && !hasTerminalTools;
    const executionAgent = new ToolLoopAgent({
      model: this.model,
      instructions: renderExecutionInstructions(input, {
        deferStructuredOutput: deferredStructuredOutput,
        deferStructuredOutputToClosure: hasTerminalTools && inlineOutputSchema !== undefined,
        taskToolSet: this.taskToolSet,
      }),
      tools,
      stopWhen: [
        ...(input.budget.maxSteps === undefined ? [] : [isStepCount(input.budget.maxSteps)]),
        ...(terminalNames.length > 0 ? [stopAfterAcceptedTerminal] : []),
        stopAfterCancellation,
      ],
      ...(mainInlineOutput ? { output: Output.object({ schema: inlineOutputSchema.forAiSdk() }) } : {}),
      ...(input.terminalTools?.length
        ? {
            prepareStep: ({ stepNumber }) => {
              // The closure phase owns terminal recovery and the final output
              // step; the main loop stops right after an accepted terminal
              // tool. Near an explicit finite step policy the main loop still
              // forces the terminal action so the closure keeps at least one
              // step for the final output. Applies only when the caller
              // selected an explicit finite step policy; an omitted maxSteps
              // never creates a hidden step deadline.
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
                    deferStructuredOutputToClosure: hasTerminalTools && inlineOutputSchema !== undefined,
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
          stepAllowance.consume();
          context.emit("agent.step.started", {
            callId,
            provider,
            model: modelId,
            stepNumber,
            activeTools,
          });
        },
        onToolExecutionStart: ({ callId, toolCall }) => {
          // Injected cell-tool invocations retain only the canonical bounded
          // cell.tool.settled evidence: the generic started/finished events
          // are suppressed for them, so an injected name (for example
          // write_file with no active write surface) can never be interpreted
          // as a host payload target and no callId/duration/outcome
          // duplication enters the trace. Host/task/terminal calls keep the
          // ordinary generic events.
          if (injectedCellToolNames?.has(toolCall.toolName)) return;
          context.emit("agent.tool.started", {
            callId,
            id: toolCall.toolCallId,
            name: toolCall.toolName,
            ...safeToolTarget(toolCall.toolName, toolCall.input),
          });
        },
        onToolExecutionEnd: ({ callId, toolCall, toolExecutionMs, toolOutput }) => {
          if (injectedCellToolNames?.has(toolCall.toolName)) return;
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
            ...(injectedCellToolsPresent ? {} : { providerMetadata: sanitize(providerMetadata) }),
            usage,
            cumulativeUsage: observedUsage,
            toolCalls: sanitize(redactCellToolStepEvidence(toolCalls, injectedCellToolNames)),
            toolResults: sanitize(redactCellToolStepEvidence(toolResults, injectedCellToolNames)),
          });
        },
      };
      if (context.liveObservation) {
        const observeChunk = createStreamActivityObserver(context, "execution");
        const streamed = await executionAgent.stream(callbacks);
        for await (const chunk of streamed.stream) observeChunk(chunk);
        executionResult = await materializeStreamedResult(streamed, mainInlineOutput);
      } else {
        const generated = await executionAgent.generate(callbacks);
        executionResult = materializeGeneratedResult(generated, mainInlineOutput);
      }
    } catch (error) {
      if (terminalProtocolError) {
        throw new TerminalContractError(terminalProtocolError, observedUsage, observedSettlementUsage);
      }
      // Terminal-contract exhaustion is classified only from a normally
      // completed or explicitly step-stopped unsatisfied loop — never from an
      // arbitrary provider or adapter throw. An actual provider error after
      // the final allowance is consumed keeps its real causal message even
      // when declared terminal tools remain unsatisfied, and a Cell without
      // declared terminal tools likewise preserves the provider error.
      if (terminalSatisfied() && !inlineOutputSchema) {
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
    const needsTerminalCarrier = hasTerminalTools && !terminalSatisfied();
    // Phase ownership: when terminal tools and inline structured output are
    // both declared, the closure phase owns the remaining contracts — it
    // performs terminal recovery and the final output when the main loop ended
    // without the terminal, and only the final output step when the terminal
    // was already accepted. Both closure forms consume the same shared,
    // non-extendable step allowance.
    const runsClosure = needsTerminalCarrier || (hasTerminalTools && inlineOutputSchema !== undefined);
    if (runsClosure) {
      // The allowance is shared and non-extendable: the closure never starts
      // when no provider step remains; the Cell fails truthfully instead of
      // passing without the required terminal tool or structured output. An
      // unsatisfied declared terminal contract keeps the canonical protocol
      // standing; an already accepted terminal with no step left for the final
      // output is a truthful structured-output failure.
      if (stepAllowance.remaining === 0) {
        if (needsTerminalCarrier) {
          throw new TerminalContractError(
            stepBudgetExhaustedMessage(stepAllowance.consumed, "the terminal-tool contract was not satisfied"),
            addUsage(observedUsage, closureUsage),
            observedSettlementUsage,
          );
        }
        throw new CellExecutionError(
          stepBudgetExhaustedMessage(stepAllowance.consumed, "the structured output contract was not satisfied"),
          addUsage(observedUsage, closureUsage),
          observedSettlementUsage,
        );
      }
      if (needsTerminalCarrier) {
        context.emit("terminal.contract.recovery", { requiredTools: input.terminalTools, reason: "natural_finish_without_terminal_tool" });
      }
      const availableTools = tools as Record<string, (typeof tools)[keyof typeof tools]>;
      const closureTools = Object.fromEntries(
        terminalNames.map((name) => [name, availableTools[name]!]),
      );
      // Captured once at closure start: the closure agent consumes only its
      // own provider steps, so its step-count stop condition is the allowance
      // remaining after the main turn, unchanged for the whole phase.
      const remainingClosureSteps = stepAllowance.remaining;
      // Whether the declared terminal was already accepted when the current
      // closure step began: only steps that start with the contract open are
      // actual terminal recovery; a step that starts with the terminal
      // accepted is the output-only closure step.
      let terminalSatisfiedBeforeStep = false;
      const closureAgent = new ToolLoopAgent({
        model: this.model,
        instructions: needsTerminalCarrier
          ? [
              renderExecutionInstructions(input, {
                deferStructuredOutput: deferredStructuredOutput,
                taskToolSet: this.taskToolSet,
              }),
              "## Terminal recovery phase",
              "The previous work ended without satisfying its terminal-tool contract. Do not continue investigation.",
              "Only the original task context and a compact projection of successful tool results are present; prior assistant reasoning, prose, rejected calls, and other transcript messages are absent. Retained results remain usable evidence, and a later rejected tool call does not erase them or prove that no files were read.",
              "Use the retained evidence, bound only genuinely missing facts, and invoke exactly one declared terminal tool now.",
              `You must invoke exactly one of: ${terminalNames.join(", ")}, then return the final structured output.`,
            ].join("\n")
          : [
              "The declared terminal tool was already accepted during execution. Do not take further actions.",
              "Return the final structured output now.",
            ].join("\n\n"),
        // The accepted-terminal closure exposes no tools at all: the terminal
        // contract is already satisfied, and a second terminal call would be a
        // protocol violation. The recovery closure exposes only the declared
        // terminal tools.
        tools: needsTerminalCarrier ? closureTools : {},
        // The same proven loop boundary as the main agent: a step-count
        // stop condition over this agent's own provider steps, sized to the
        // allowance that remains after the main turn. It stops before a
        // step that would exceed the shared maxSteps and lets a tool-free
        // final allowed step complete naturally with its output instead of
        // being cut off by exhaustion after the step already finished.
        stopWhen: needsTerminalCarrier && !inlineOutputSchema
          ? [() => stepAllowance.exhausted, stopAfterAcceptedTerminal]
          : [
              ...(remainingClosureSteps === undefined
                ? [() => stepAllowance.exhausted]
                : [isStepCount(remainingClosureSteps)]),
            ],
        ...(inlineOutputSchema ? { output: Output.object({ schema: inlineOutputSchema.forAiSdk() }) } : {}),
        prepareStep: needsTerminalCarrier
          ? () => {
              if (terminalSatisfied()) {
                terminalOnly = true;
                return finalOutputStep(input, inlineOutputSchema !== undefined);
              }
              terminalOnly = true;
              return {
                activeTools: terminalNames,
                toolChoice: terminalToolChoice(terminalNames) as never,
              };
            }
          : () => {
              terminalOnly = true;
              return finalOutputStep(input, true);
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
            needsTerminalCarrier
              ? {
                  role: "user",
                  content: "The work above ended without satisfying its terminal-tool contract. Use the retained investigation context and invoke exactly one declared terminal tool now. Do not restart the task.",
                }
              : {
                  role: "user",
                  content: "The declared terminal tool was already accepted. Do not take further actions; return the final structured output now.",
                },
          ],
          abortSignal: context.signal,
          timeout: { totalMs: input.budget.maxDurationMs },
          onStepStart: () => {
            // Consumed at step start so a recovery step that fails under the
            // forced terminal tool choice still counts against the shared
            // allowance. A step that begins with the declared terminal already
            // accepted is the output-only closure step, not terminal recovery.
            stepAllowance.consume();
            terminalSatisfiedBeforeStep = terminalSatisfied();
          },
          onStepEnd: ({ usage, finishReason, performance, providerMetadata, toolCalls, toolResults }) => {
            const stepUsage = normalizeUsage(usage, providerMetadata);
            closureUsage = addUsage(closureUsage, stepUsage);
            context.observeUsage(stepUsage, "execution");
            // Only steps that began with the terminal contract still open are
            // actual terminal recovery; a step that began with the terminal
            // already accepted is the output-only closure step and carries its
            // own truthful structured-output event.
            context.emit(
              needsTerminalCarrier && !terminalSatisfiedBeforeStep
                ? "terminal.recovery.step.finished"
                : "structured.output.step.finished",
              {
                finishReason,
                performance: sanitize(performance),
                ...(injectedCellToolsPresent ? {} : { providerMetadata: sanitize(providerMetadata) }),
                usage,
                cumulativeUsage: closureUsage,
                toolCalls: sanitize(toolCalls),
                toolResults: sanitize(toolResults),
              },
            );
          },
        });
        closureResult = materializeGeneratedResult(generatedClosure, inlineOutputSchema !== undefined);
      } catch (error) {
        if (terminalProtocolError) {
          throw new TerminalContractError(
            terminalProtocolError,
            addUsage(observedUsage, closureUsage),
            observedSettlementUsage,
          );
        } else if (terminalSatisfied() && !inlineOutputSchema) {
          closureResult = terminalOnlyResult(terminalNames, closureUsage, "recovery");
        } else {
          // An actual provider or adapter error inside the closure keeps its
          // real causal message even when the allowance is exhausted and the
          // terminal contract is still open; exhaustion is classified only
          // from a normally completed or explicitly step-stopped loop.
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
      throw new TerminalContractError(
        terminalProtocolError,
        addUsage(observedUsage, closureUsage),
        observedSettlementUsage,
      );
    }
    // Terminal recovery consumed the last remaining provider step without
    // satisfying the declared terminal contract: fail truthfully with the
    // canonical protocol standing instead of returning a result that would
    // pass verification.
    if (needsTerminalCarrier && !terminalSatisfied() && stepAllowance.exhausted) {
      throw new TerminalContractError(
        stepBudgetExhaustedMessage(stepAllowance.consumed, "the terminal-tool contract was not satisfied"),
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
      if (output === undefined && stepAllowance.exhausted) {
        throw new CellExecutionError(
          stepBudgetExhaustedMessage(stepAllowance.consumed, "the structured output contract was not satisfied"),
          addUsage(observedUsage, closureUsage),
          observedSettlementUsage,
        );
      }
    } else if (outputSchema) {
      if (stepAllowance.remaining === 0) {
        throw new CellExecutionError(
          stepBudgetExhaustedMessage(stepAllowance.consumed, "the structured output contract cannot be settled"),
          addUsage(observedUsage, closureUsage),
          observedSettlementUsage,
        );
      }
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
        stepAllowance,
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
      // A valid emit_structured_output call can arrive after the caller
      // cancelled while this settlement attempt was still in flight: the tool
      // execute assigns the accepted output, so the shared helper resolves
      // through every output-undefined and catch guard. The enclosing runCell
      // already emitted the immutable Cell final (cell.error then
      // cell.finished) with the original caller reason, so the accepted-output
      // completion stays causal only to that finalized cancellation and no
      // settlement event is emitted after the final.
      if (!context.signal.aborted) {
        context.emit("structured.settlement.finished", { mode: "tool-settlement" });
      }
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
      // Injected-aware fail-closed projection: raw provider steps and
      // provider metadata can echo injected tool inputs or results, so both
      // are omitted for an injected-tool run. Runs without injected tools
      // keep the ordinary evidence.
      rawSteps: injectedCellToolsPresent
        ? []
        : sanitize([
            ...executionResult.steps,
            ...(closureResult?.steps ?? []),
            ...(settlement?.rawSteps ?? []),
          ]) as unknown[],
      ...(injectedCellToolsPresent
        ? {}
        : { providerMetadata: sanitize(executionResult.providerMetadata) }),
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
    const terminalNames = (input.terminalTools ?? []).map((terminal) => terminal.name);
    return {
      ...tools,
      // Caller-injected cell tools translate the same neutral port; a name
      // that conflicts with the active host/task/terminal surface or a
      // non-object-root schema is rejected here, before any provider
      // dispatch, and the action closure applies to them exactly like host
      // tools.
      ...(context.cellTools
        ? createCellToolDefinitions({
            surface: context.cellTools,
            reservedNames: [...Object.keys(tools), ...terminalNames],
            actionBlocked: () => terminalOnly() ? terminalActionRequired() : undefined,
          })
        : {}),
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

/**
 * Per-invocation cell tool retention is exactly name, exact toolCallId, and
 * settled outcome: injected-tool entries are removed from the step-level
 * toolCalls/toolResults evidence so caller-owned input and result values
 * never enter the trace. Runs without injected tools keep the ordinary
 * step evidence unchanged.
 */
function redactCellToolStepEvidence<T>(
  entries: readonly T[],
  injectedCellToolNames: ReadonlySet<string> | undefined,
): readonly T[] {
  if (injectedCellToolNames === undefined) return entries;
  return entries.filter((entry) => {
    const name = (entry as { toolName?: unknown }).toolName;
    return typeof name !== "string" || !injectedCellToolNames.has(name);
  });
}

function finalOutputStep(
  input: CellInput,
  inlineStructuredOutput: boolean,
) {
  return {
    activeTools: [],
    toolChoice: "none" as const,
    instructions: [
      "The declared terminal tool was already accepted. Do not take further actions.",
      `Return the final ${inlineStructuredOutput ? "structured output" : "concise report"} now.`,
      ...(inlineStructuredOutput && input.outputSchema
        ? [`Return a final structured output that conforms exactly to this JSON Schema:\n${JSON.stringify(input.outputSchema)}`]
        : []),
    ].join("\n\n"),
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
