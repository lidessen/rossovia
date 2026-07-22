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
import { createTaskTools } from "./task-tools";
import {
  createValidationModel,
  validationModelName,
  validationProviderName,
  type ValidationModelOptions,
} from "./validation-model";

export type AiSdkDriverOptions = ValidationModelOptions & {
  /** Host-selected Task authority; it changes the actual tool surface, not only the prompt. */
  taskToolSet?: "manage" | "read-update";
};

const EXECUTION_TOOL_NAMES = new Set([
  "list_files",
  "read_file",
  "write_file",
  "run_command",
  "task_create",
  "task_update",
  "task_list",
  "task_get",
]);

const MAX_AGENT_OUTPUT_TOKENS = 16_000;

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
      tools: this.taskToolSet === "manage"
        ? ["task_list", "task_get", "task_create", "task_update"]
        : ["task_list", "task_get", "task_update"],
    });
    let terminalProtocolError: string | undefined;
    let terminalOnly = false;
    const outputSchema = input.outputSchema ? compileOutputSchema(input.outputSchema) : undefined;
    const inlineOutputSchema = this.structuredOutputMode === "inline" ? outputSchema : undefined;
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
    const executionAgent = new ToolLoopAgent({
      model: this.model,
      instructions: renderExecutionInstructions(input, { deferStructuredOutput: deferredStructuredOutput }),
      tools,
      stopWhen: terminalNames.length > 0 && !inlineOutputSchema
        ? [isStepCount(input.budget.maxSteps), stopAfterAcceptedTerminal]
        : isStepCount(input.budget.maxSteps),
      ...(inlineOutputSchema ? { output: Output.object({ schema: inlineOutputSchema.forAiSdk() }) } : {}),
      ...(input.terminalTools?.length
        ? {
            prepareStep: ({ stepNumber }) => {
              if (terminalSatisfied()) {
                terminalOnly = true;
                return finalOutputStep(input, inlineOutputSchema !== undefined);
              }
              // A terminal-only Cell needs one final action turn. When an
              // independent structured output is also required, reserve a
              // second tool-free turn for that result.
              const reservedSteps = inlineOutputSchema ? 2 : 1;
              if (stepNumber >= input.budget.maxSteps - reservedSteps) {
                terminalOnly = true;
                return {
                  // Terminal tools are dynamically registered from the caller's
                  // contract, so their names are not visible to AI SDK's static
                  // tool-set inference.
                  activeTools: terminalNames as never[],
                  toolChoice: terminalToolChoice(terminalNames) as never,
                  instructions: `${renderExecutionInstructions(input, { deferStructuredOutput: deferredStructuredOutput })}\n\nYou have reached the final action step. Invoke exactly one declared terminal tool now; do not continue analysis.`,
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
    let closureUsage: CellUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 };
    let executionResult;
    let closureResult: { text: string; output?: unknown; totalUsage: unknown; providerMetadata: unknown; steps: unknown[] } | undefined;
    try {
      executionResult = await executionAgent.generate({
        prompt: renderTaskPrompt(input),
        abortSignal: context.signal,
        timeout: { totalMs: input.budget.maxDurationMs },
        onStepEnd: ({ usage, finishReason, performance, providerMetadata, toolCalls, toolResults }) => {
          const stepUsage = normalizeUsage(usage, providerMetadata);
          observedUsage = addUsage(observedUsage, stepUsage);
          context.observeUsage(stepUsage);
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
      });
    } catch (error) {
      if (terminalProtocolError) {
        throw new CellExecutionError(terminalProtocolError, observedUsage);
      } else if (terminalSatisfied() && !inlineOutputSchema) {
        executionResult = terminalOnlyResult(terminalNames, observedUsage, "execution");
      } else {
        throw new CellExecutionError(
          error instanceof Error ? error.message : String(error),
          observedUsage,
        );
      }
    }
    if (terminalSatisfied() && !inlineOutputSchema && !executionResult.text.trim()) {
      executionResult = {
        ...executionResult,
        text: terminalOnlyResult(terminalNames, emptyUsage(), "execution").text,
      };
    }
    if (input.terminalTools?.length && !terminalSatisfied()) {
      context.emit("terminal.contract.recovery", { requiredTools: input.terminalTools, reason: "natural_finish_without_terminal_tool" });
      const availableTools = tools as Record<string, (typeof tools)[keyof typeof tools]>;
      const closureTools = Object.fromEntries(
        terminalNames.map((name) => [name, availableTools[name]!]),
      );
      const closureAgent = new ToolLoopAgent({
        model: this.model,
        instructions: [
          renderExecutionInstructions(input, { deferStructuredOutput: deferredStructuredOutput }),
          "## Terminal recovery phase",
          "The previous work ended without satisfying its terminal-tool contract. Do not continue investigation.",
          "Only the original task context and a compact projection of successful tool results are present; prior assistant reasoning, prose, rejected calls, and other transcript messages are absent. Retained results remain usable evidence, and a later rejected tool call does not erase them or prove that no files were read.",
          "Use the retained evidence, bound only genuinely missing facts, and invoke exactly one declared terminal tool now.",
          `You must invoke exactly one of: ${terminalNames.join(", ")}, then return a concise final report.`,
        ].join("\n"),
        tools: closureTools,
        stopWhen: inlineOutputSchema
          ? isStepCount(3)
          : [isStepCount(2), stopAfterAcceptedTerminal],
        ...(inlineOutputSchema ? { output: Output.object({ schema: inlineOutputSchema.forAiSdk() }) } : {}),
        prepareStep: () => {
          if (terminalSatisfied()) {
            terminalOnly = true;
            return finalOutputStep(input, inlineOutputSchema !== undefined);
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
        closureResult = await closureAgent.generate({
          messages: [
            { role: "user", content: renderTaskPrompt(input) },
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
            context.observeUsage(stepUsage);
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
      } catch (error) {
        if (terminalProtocolError) {
          throw new CellExecutionError(
            terminalProtocolError,
            addUsage(observedUsage, closureUsage),
          );
        } else if (terminalSatisfied() && !inlineOutputSchema) {
          closureResult = terminalOnlyResult(terminalNames, closureUsage, "recovery");
        } else {
          throw new CellExecutionError(
            error instanceof Error ? error.message : String(error),
            addUsage(observedUsage, closureUsage),
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
        output = (closureResult ?? executionResult).output;
      } catch (error) {
        throw new CellExecutionError(
          error instanceof Error ? error.message : String(error),
          addUsage(observedUsage, closureUsage),
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
        maxDurationMs: input.budget.maxDurationMs,
        maxOutputTokens: MAX_AGENT_OUTPUT_TOKENS,
      });
      if (settlement.output === undefined) {
        throw new CellExecutionError(
          settlement.error ?? "structured settlement produced no output",
          addUsage(executionUsage, settlement.usage),
        );
      }
      output = settlement.output;
      context.emit("structured.settlement.finished", { mode: "tool-settlement" });
    }
    const usage = settlement ? addUsage(executionUsage, settlement.usage) : executionUsage;
    return {
      terminalToolsCalled: [...terminalToolsCalled],
      ...(tasks.snapshot().length > 0 ? { tasks: tasks.snapshot() } : {}),
      finalText: closureResult ? `${executionResult.text}\n\n${closureResult.text}` : executionResult.text,
      ...(output === undefined ? {} : { output }),
      usage,
      rawSteps: sanitize([
        ...executionResult.steps,
        ...(closureResult?.steps ?? []),
        ...(settlement?.rawSteps ?? []),
      ]) as unknown[],
      providerMetadata: sanitize(executionResult.providerMetadata),
    };
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

    const tools = {
      ...(context.workspace.canRead
        ? {
            list_files: tool({
              description: "List files inside the declared workspace read scope.",
              inputSchema: z.object({
                path: z.string().default("."),
                maxEntries: z.number().int().positive().max(2_000).default(500),
              }),
              execute: async ({ path, maxEntries }) => {
                if (terminalOnly()) return terminalActionRequired();
                const files = await context.workspace.listFiles(path, maxEntries);
                context.emit("tool.list_files", { path, count: files.length });
                return { files };
              },
            }),
            read_file: tool({
              description: "Read a UTF-8 file inside the declared workspace read scope.",
              inputSchema: z.object({
                path: z.string().min(1),
                startLine: z.number().int().positive().default(1),
                endLine: z.number().int().positive().optional(),
              }),
              execute: async ({ path, startLine, endLine }) => {
                if (terminalOnly()) return terminalActionRequired();
                const content = await context.workspace.readText(path, startLine, endLine);
                context.emit("tool.read_file", { path, startLine, endLine, characters: content.length });
                return { path, content };
              },
            }),
          }
        : {}),
      ...(context.workspace.canWrite
        ? {
            write_file: tool({
              description: "Write a complete UTF-8 file inside the declared workspace write scope.",
              inputSchema: z.object({ path: z.string().min(1), content: z.string() }),
              execute: async ({ path, content }) => {
                if (terminalOnly()) return terminalActionRequired();
                await context.workspace.writeText(path, content);
                context.emit("tool.write_file", { path, characters: content.length });
                return { path, characters: content.length };
              },
            }),
          }
        : {}),
      ...(context.workspace.canRunCommands
        ? {
            run_command: tool({
              description: "Run one allow-listed executable without a shell inside the workspace.",
              inputSchema: z.object({
                argv: z.array(z.string()).min(1),
                cwd: z.string().default("."),
                timeoutMs: z.number().int().positive().max(input.budget.maxDurationMs).default(60_000),
              }),
              execute: async ({ argv, cwd, timeoutMs }) => {
                if (terminalOnly()) return terminalActionRequired();
                const result = await context.workspace.runCommand(argv, cwd, timeoutMs, context.signal);
                context.emit("tool.run_command", { argv, cwd, ...result });
                return result;
              },
            }),
          }
        : {}),
      ...createTaskTools(tasks, {
        projection: this.taskToolSet === "manage"
          ? { read: "all", create: true, update: "all", principal: input.id }
          : { read: "all", create: false, update: "status", updateScope: "owned", principal: input.id },
        actionBlocked: () => terminalOnly() ? terminalActionRequired() : undefined,
        emit: (event) => context.emit(event.type, event.data),
      }),
    };
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

function terminalActionRequired() {
  return {
    accepted: false,
    error: "The action phase is closed. Invoke one declared terminal tool now.",
  };
}

function finalOutputStep(input: CellInput, inlineStructuredOutput: boolean) {
  return {
    activeTools: [],
    toolChoice: "none" as const,
    instructions: `${renderExecutionInstructions(input, {
      deferStructuredOutput: input.outputSchema !== undefined && !inlineStructuredOutput,
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

function renderRecoveryEvidence(steps: readonly unknown[]): string {
  const evidence: unknown[] = [];
  const seen = new Set<string>();
  for (const [stepIndex, value] of steps.entries()) {
    const step = asRecord(value);
    const results = Array.isArray(step.toolResults) ? step.toolResults : [];
    for (const value of results) {
      const result = asRecord(value);
      const output = result.output;
      if (asRecord(output).accepted === false) continue;
      const retained = {
        step: stepIndex + 1,
        tool: result.toolName,
        input: result.input,
        output,
      };
      const identity = JSON.stringify({
        tool: retained.tool,
        input: retained.input,
        output: retained.output,
      });
      if (seen.has(identity)) continue;
      seen.add(identity);
      evidence.push(retained);
    }
  }
  return evidence.length > 0
    ? JSON.stringify(evidence)
    : "No successful tool result was retained; submit only the bounded facts available from the task contract.";
}

function renderExecutionInstructions(
  input: CellInput,
  options: { deferStructuredOutput?: boolean } = {},
): string {
  const terminalInstruction = input.terminalTools?.length
    ? `Finish by invoking exactly one declared terminal tool: ${input.terminalTools.map((terminal) => terminal.name).join(", ")}.`
    : "A terminal tool is not required. Leave a concise final response after completing the work.";
  const outputInstruction = input.outputSchema && !options.deferStructuredOutput
    ? `Return a final structured output that conforms exactly to this JSON Schema. This is independent of every tool input:\n${JSON.stringify(input.outputSchema)}`
    : undefined;
  const deferredOutputInstruction = input.outputSchema && options.deferStructuredOutput
    ? "A separate structured settlement phase will follow. Complete the necessary investigation first and leave a source-grounded report; do not guess schema fields or stop at placeholders."
    : undefined;
  const artifactInstruction = input.artifacts?.length
    ? `Create each declared artifact in the workspace write scope. Their paths and instructions are binding:\n${input.artifacts.map((artifact) => `- ${artifact.path}: ${artifact.instructions}`).join("\n")}`
    : undefined;
  const taskInstruction = input.tasks?.length
    ? `The host seeded these tasks. Use task_list/task_get for detail and task_update as work advances; leave no task pending or in_progress at completion. Task completion is process evidence, not correctness:\n${input.tasks.map((task) => `- ${task.subject}: ${task.description}`).join("\n")}`
    : "Use task_create only when several steps or outcomes create real omission risk; skip task tracking for simple work. Use task_list/task_get/task_update to keep created tasks accurate, and complete every created task before finishing. Task completion is process evidence, not correctness.";
  return [
    "You are one ephemeral Work Cell. Work only inside the granted tools and workspace.",
    "You own investigation order and local tool choice. You do not own durable acceptance.",
    "If the task exceeds your scope or capability, state the bounded blocker in the final response. Do not invoke another agent yourself.",
    terminalInstruction,
    outputInstruction,
    deferredOutputInstruction,
    artifactInstruction,
    taskInstruction,
    ...input.instructions,
    ...input.context.map((section) => `## ${section.title}\n${section.content}`),
  ].filter((section): section is string => Boolean(section)).join("\n\n");
}

function renderTaskPrompt(input: CellInput): string {
  return [
    `Intent:\n${input.intent}`,
    `Acceptance:\n${input.acceptance.map((item) => `- ${item}`).join("\n")}`,
    `Capabilities required:\n${input.capabilitiesRequired.join(", ") || "none"}`,
    `Workspace read scope:\n${input.workspace.readPaths.join("\n")}`,
    `Workspace write scope:\n${input.workspace.writePaths.join("\n") || "read-only"}`,
    `Allowed command executables:\n${input.workspace.allowedCommands.join(", ") || "none"}`,
  ].join("\n\n");
}

function addUsage(left: CellUsage, right: CellUsage): CellUsage {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    totalTokens: left.totalTokens + right.totalTokens,
    cachedInputTokens: left.cachedInputTokens + right.cachedInputTokens,
  };
}

function emptyUsage(): CellUsage {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function sanitize(value: unknown): unknown {
  const serialized = JSON.stringify(value, (_key, item) => {
    if (typeof item === "bigint") return item.toString();
    if (item instanceof Error) return { name: item.name, message: item.message };
    return item;
  });
  return serialized === undefined ? undefined : JSON.parse(serialized);
}
