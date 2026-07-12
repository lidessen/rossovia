import { createDeepSeek, type DeepSeekLanguageModelOptions } from "@ai-sdk/deepseek";
import { Output, ToolLoopAgent, hasToolCall, stepCountIs, tool } from "ai";
import { z } from "zod";
import {
  GeneExpressionSchema,
  type CellInput,
  type CellUsage,
  type DriverDescriptor,
  type GeneExpression,
} from "./contracts";
import {
  CellBudgetExceededError,
  CellExecutionError,
  type CellDriver,
  type DriverContext,
  type DriverResult,
  type GeneSelectionResult,
} from "./driver";
// AI SDK and provider types remain confined to this adapter.
import { renderGenomeForSelection, type ExpressedGenome, type Genome } from "./genome";
import { compileOutputSchema } from "./output-schema";

export interface AiSdkDriverOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

const deepSeekNonThinking = {
  deepseek: {
    thinking: { type: "disabled" },
  } satisfies DeepSeekLanguageModelOptions,
};

export class AiSdkDeepSeekDriver implements CellDriver {
  readonly descriptor: DriverDescriptor;
  private readonly model;

  constructor(options: AiSdkDriverOptions = {}) {
    const modelId = options.model ?? "deepseek-v4-flash";
    const provider = createDeepSeek({
      apiKey: options.apiKey ?? process.env.DEEPSEEK_API_KEY ?? "",
      ...(options.baseURL ? { baseURL: options.baseURL } : {}),
    });
    this.model = provider(modelId);
    this.descriptor = {
      adapter: "ai-sdk-v6",
      provider: "deepseek",
      model: modelId,
      pricing: {
        inputPerMillionUsd: 0.14,
        cachedInputPerMillionUsd: 0.0028,
        outputPerMillionUsd: 0.28,
        source: "https://api-docs.deepseek.com/quick_start/pricing",
        revision: "2026-07-10",
      },
    };
  }

  async selectGenes(
    input: CellInput,
    genome: Genome,
    context: DriverContext,
  ): Promise<GeneSelectionResult> {
    let selection: GeneExpression | undefined;
    const expressionAgent = new ToolLoopAgent({
      model: this.model,
      instructions: [
        "You are the differentiation phase of one ephemeral work cell.",
        "Read the task and compact Principle Sequence. Select exactly one current lead P-ID for the principal contradiction and no more than three supporting P-IDs.",
        "Each support must contribute a distinct decision. Do not select a candidate or invent a P-ID. Inherited lineage is orientation, not a forced lead.",
        "Finish only by calling express_genes.",
      ].join("\n"),
      tools: {
        express_genes: tool({
          description: "Express the minimal task-specific P-ID team before loading interpretations.",
          inputSchema: GeneExpressionSchema,
          execute: async (value) => {
            selection = GeneExpressionSchema.parse(value);
            return {
              accepted: true,
              selected: [selection.lead, ...selection.supports],
            };
          },
        }),
      },
      toolChoice: { type: "tool", toolName: "express_genes" },
      stopWhen: hasToolCall("express_genes"),
      maxOutputTokens: 2_000,
      temperature: 0,
      providerOptions: deepSeekNonThinking,
    });

    const expressionResult = await expressionAgent.generate({
      prompt: [
        `Task intent:\n${input.intent}`,
        `Acceptance conditions:\n${input.acceptance.map((item) => `- ${item}`).join("\n")}`,
        `Available capabilities:\n${input.dna.capabilities.join(", ") || "none"}`,
        `Required capabilities:\n${input.capabilitiesRequired.join(", ") || "none"}`,
        `Principle Sequence:\n${renderGenomeForSelection(genome)}`,
      ].join("\n\n"),
      abortSignal: context.signal,
      timeout: { totalMs: Math.min(60_000, input.budget.maxDurationMs) },
    });

    if (!selection) throw new Error("gene expression protocol failed: express_genes was not accepted");
    const expressionUsage = normalizeUsage(expressionResult.totalUsage, expressionResult.providerMetadata);
    if (input.budget.tokenControl === "hard" && expressionUsage.totalTokens > input.budget.maxTokens) {
      throw new CellBudgetExceededError(
        expressionUsage.totalTokens,
        input.budget.maxTokens,
        expressionUsage,
      );
    }

    return {
      expression: selection,
      usage: expressionUsage,
      rawSteps: sanitize(expressionResult.steps) as unknown[],
      providerMetadata: sanitize(expressionResult.providerMetadata),
    };
  }

  async run(
    input: CellInput,
    expressed: ExpressedGenome,
    context: DriverContext,
  ): Promise<DriverResult> {
    const terminalToolsCalled = new Set<string>();
    const outputSchema = input.outputSchema ? compileOutputSchema(input.outputSchema) : undefined;
    const tools = this.createExecutionTools(input, context, (name) => terminalToolsCalled.add(name));
    const terminalNames = input.terminalTools?.map((terminal) => terminal.name) ?? [];
    const terminalSatisfied = () => terminalNames.some((name) => terminalToolsCalled.has(name));
    const executionAgent = new ToolLoopAgent({
      model: this.model,
      instructions: renderExecutionInstructions(input, expressed),
      tools,
      stopWhen: stepCountIs(input.budget.maxSteps),
      ...(outputSchema ? { output: Output.object({ schema: outputSchema.forAiSdk() }) } : {}),
      ...(input.terminalTools?.length
        ? {
            prepareStep: ({ stepNumber }) => {
              if (terminalSatisfied()) {
                return finalOutputStep(input, expressed);
              }
              // Reserve the final model turn for the report after a terminal
              // tool call. Otherwise a tool-only final step makes AI SDK reject
              // the run as having no output, even though the terminal contract
              // was actually satisfied.
              if (stepNumber >= input.budget.maxSteps - 2) {
                return {
                  // Terminal tools are dynamically registered from the caller's
                  // contract, so their names are not visible to AI SDK's static
                  // tool-set inference.
                  activeTools: terminalNames as never[],
                  toolChoice: "required",
                  system: `${renderExecutionInstructions(input, expressed)}\n\nYou have reached the final action step. Invoke exactly one declared terminal tool now; do not continue analysis.`,
                };
              }
              return undefined;
            },
          }
        : {}),
      maxOutputTokens: 16_000,
      temperature: 0,
      providerOptions: deepSeekNonThinking,
    });
    const budgetAbort = new AbortController();
    const executionSignal = AbortSignal.any([context.signal, budgetAbort.signal]);
    let observedUsage: CellUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 };
    let executionResult;
    let closureResult: { text: string; totalUsage: unknown; providerMetadata: unknown; steps: unknown[] } | undefined;
    try {
      executionResult = await executionAgent.generate({
        prompt: renderTaskPrompt(input),
        abortSignal: executionSignal,
        timeout: { totalMs: input.budget.maxDurationMs },
        onStepFinish: ({ usage, finishReason, toolCalls, toolResults }) => {
          observedUsage = addUsage(observedUsage, normalizeUsage(usage, undefined));
          context.emit("agent.step.finished", {
            finishReason,
            usage,
            cumulativeUsage: observedUsage,
            toolCalls: sanitize(toolCalls),
            toolResults: sanitize(toolResults),
          });
          if (input.budget.tokenControl === "hard" && observedUsage.totalTokens > context.maxTokens) budgetAbort.abort();
        },
      });
    } catch (error) {
      if (budgetAbort.signal.aborted) {
        throw new CellBudgetExceededError(observedUsage.totalTokens, context.maxTokens, observedUsage);
      }
      if (terminalSatisfied() && !outputSchema) {
        executionResult = terminalOnlyResult(terminalNames, observedUsage, "execution");
      } else {
        throw new CellExecutionError(
          error instanceof Error ? error.message : String(error),
          observedUsage,
        );
      }
    }
    if (terminalSatisfied() && !outputSchema && !executionResult.text.trim()) {
      executionResult = terminalOnlyResult(terminalNames, normalizeUsage(executionResult.totalUsage, executionResult.providerMetadata), "execution");
    }
    if (input.terminalTools?.length && !terminalSatisfied()) {
      context.emit("terminal.contract.recovery", { requiredTools: input.terminalTools, reason: "natural_finish_without_terminal_tool" });
      const closureAgent = new ToolLoopAgent({
        model: this.model,
        instructions: `The previous work ended without satisfying its terminal-tool contract. Do not continue analysis. You must now invoke exactly one of: ${terminalNames.join(", ")}, then return a concise final report.`,
        tools,
        stopWhen: stepCountIs(2),
        prepareStep: ({ stepNumber }) => {
          if (terminalSatisfied()) return finalOutputStep(input, expressed);
          if (stepNumber === 0) {
            return {
              activeTools: terminalNames as Array<keyof typeof tools>,
              toolChoice: "required",
            };
          }
          return undefined;
        },
        maxOutputTokens: 4_000,
        temperature: 0,
        providerOptions: deepSeekNonThinking,
      });
      let closureUsage: CellUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 };
      try {
        closureResult = await closureAgent.generate({
          prompt: `${renderTaskPrompt(input)}\n\nPrevious unfinished response:\n${executionResult.text}`,
          abortSignal: executionSignal,
          timeout: { totalMs: input.budget.maxDurationMs },
          onStepFinish: ({ usage, finishReason, toolCalls, toolResults }) => {
            closureUsage = addUsage(closureUsage, normalizeUsage(usage, undefined));
            context.emit("terminal.recovery.step.finished", {
              finishReason,
              usage,
              cumulativeUsage: closureUsage,
              toolCalls: sanitize(toolCalls),
              toolResults: sanitize(toolResults),
            });
          },
        });
      } catch (error) {
        if (terminalSatisfied() && !outputSchema) {
          closureResult = terminalOnlyResult(terminalNames, closureUsage, "recovery");
        } else {
          throw new CellExecutionError(
            error instanceof Error ? error.message : String(error),
            addUsage(observedUsage, closureUsage),
          );
        }
      }
      if (closureResult && terminalSatisfied() && !outputSchema && !closureResult.text.trim()) {
        closureResult = terminalOnlyResult(terminalNames, normalizeUsage(closureResult.totalUsage, closureResult.providerMetadata), "recovery");
      }
    }
    const usage = addUsage(
      normalizeUsage(executionResult.totalUsage, executionResult.providerMetadata),
      closureResult ? normalizeUsage(closureResult.totalUsage, closureResult.providerMetadata) : { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
    );
    if (input.budget.tokenControl === "hard" && usage.totalTokens > context.maxTokens) {
      throw new CellBudgetExceededError(usage.totalTokens, context.maxTokens, usage);
    }

    return {
      terminalToolsCalled: [...terminalToolsCalled],
      finalText: closureResult ? `${executionResult.text}\n\n${closureResult.text}` : executionResult.text,
      ...(executionResult.output === undefined ? {} : { output: executionResult.output }),
      usage,
      rawSteps: sanitize([...executionResult.steps, ...(closureResult?.steps ?? [])]) as unknown[],
      providerMetadata: sanitize(executionResult.providerMetadata),
    };
  }

  private createExecutionTools(
    input: CellInput,
    context: DriverContext,
    markTerminalTool: (name: string) => void,
  ) {
    const tools = {
      list_files: tool({
        description: "List files inside the declared workspace read scope.",
        inputSchema: z.object({
          path: z.string().default("."),
          maxEntries: z.number().int().positive().max(2_000).default(500),
        }),
        execute: async ({ path, maxEntries }) => {
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
          const content = await context.workspace.readText(path, startLine, endLine);
          context.emit("tool.read_file", { path, startLine, endLine, characters: content.length });
          return { path, content };
        },
      }),
      ...(context.workspace.canWrite
        ? {
            write_file: tool({
              description: "Write a complete UTF-8 file inside the declared workspace write scope.",
              inputSchema: z.object({ path: z.string().min(1), content: z.string() }),
              execute: async ({ path, content }) => {
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
                const result = await context.workspace.runCommand(argv, cwd, timeoutMs, context.signal);
                context.emit("tool.run_command", { argv, cwd, ...result });
                return result;
              },
            }),
          }
        : {}),
    };
    return {
      ...tools,
      ...Object.fromEntries((input.terminalTools ?? []).map((terminal) => [terminal.name, tool({
        description: terminal.description,
        inputSchema: z.fromJSONSchema(terminal.inputSchema),
        execute: async (value) => {
          markTerminalTool(terminal.name);
          context.emit("terminal.tool.called", { name: terminal.name, input: value });
          return { accepted: true };
        },
      })])),
    };
  }
}

function finalOutputStep(
  input: CellInput,
  expressed: ExpressedGenome,
) {
  return {
    activeTools: [],
    toolChoice: "none" as const,
    system: `${renderExecutionInstructions(input, expressed)}\n\nA declared terminal tool has been called. Do not take further actions. Return the final ${input.outputSchema ? "structured output" : "concise report"} now.`,
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

function renderExecutionInstructions(input: CellInput, expressed: ExpressedGenome): string {
  const treatment = input.treatment
    ? `\n\n## Separately labelled treatment\nTreatment ${input.treatment.id} is an experimental hypothesis outside the expressed P-ID team. Apply it only where it changes the task decision and retain evidence that could disconfirm it.\n${input.treatment.instructions}`
    : "";
  const terminalInstruction = input.terminalTools?.length
    ? `Finish by invoking exactly one declared terminal tool: ${input.terminalTools.map((terminal) => terminal.name).join(", ")}.`
    : "A terminal tool is not required. Leave a concise final response after completing the work.";
  const outputInstruction = input.outputSchema
    ? `Return a final structured output that conforms exactly to this JSON Schema. This is independent of every tool input:\n${JSON.stringify(input.outputSchema)}`
    : undefined;
  const artifactInstruction = input.artifacts?.length
    ? `Create each declared artifact in the workspace write scope. Their paths and instructions are binding:\n${input.artifacts.map((artifact) => `- ${artifact.path}: ${artifact.instructions}`).join("\n")}`
    : undefined;
  return [
    "You are one ephemeral Work Cell. Work only inside the granted tools and workspace.",
    "You own investigation order and local tool choice. You do not own durable acceptance.",
    "If the task exceeds your scope or capability, state the bounded blocker in the final response. Do not invoke another agent yourself.",
    terminalInstruction,
    outputInstruction,
    artifactInstruction,
    input.dna.baseInstructions,
    `## Expressed genes\nLead: ${expressed.expression.lead}\nSupports: ${expressed.expression.supports.join(", ") || "none"}\nPrincipal contradiction: ${expressed.expression.principalContradiction}`,
    `## Selected interpretations\n${expressed.context}`,
    treatment,
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

function normalizeUsage(usage: unknown, metadata: unknown): CellUsage {
  const record = asRecord(usage);
  const provider = asRecord(asRecord(metadata).deepseek);
  const inputTokens = numberValue(record.inputTokens);
  const outputTokens = numberValue(record.outputTokens);
  return {
    inputTokens,
    outputTokens,
    totalTokens: numberValue(record.totalTokens) || inputTokens + outputTokens,
    cachedInputTokens:
      numberValue(record.cachedInputTokens) || numberValue(provider.promptCacheHitTokens),
  };
}

function addUsage(left: CellUsage, right: CellUsage): CellUsage {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    totalTokens: left.totalTokens + right.totalTokens,
    cachedInputTokens: left.cachedInputTokens + right.cachedInputTokens,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function sanitize(value: unknown): unknown {
  const serialized = JSON.stringify(value, (_key, item) => {
    if (typeof item === "bigint") return item.toString();
    if (item instanceof Error) return { name: item.name, message: item.message };
    return item;
  });
  return serialized === undefined ? undefined : JSON.parse(serialized);
}
