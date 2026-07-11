import { createDeepSeek, type DeepSeekLanguageModelOptions } from "@ai-sdk/deepseek";
import { ToolLoopAgent, hasToolCall, stepCountIs, tool } from "ai";
import { z } from "zod";
import {
  CellSubmissionSchema,
  CheckStepSchema,
  ChildCellSpecSchema,
  EvidenceSchema,
  GeneExpressionSchema,
  type CellInput,
  type CellSubmission,
  type CellUsage,
  type DriverDescriptor,
  type GeneExpression,
  StructuredResultSchema,
} from "./contracts";
import {
  CellBudgetExceededError,
  type CellDriver,
  type DriverContext,
  type DriverResult,
  type GeneSelectionResult,
} from "./driver";
// AI SDK and provider types remain confined to this adapter.
import { renderGenomeForSelection, type ExpressedGenome, type Genome } from "./genome";

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

const SubmissionToolSchema = z.object({
  outcome: z.enum(["completed", "partial", "split", "failed"]),
  artifactSummary: z.string().min(1),
  artifactFiles: z.array(z.string().min(1)).default([]),
  evidence: z.array(EvidenceSchema).default([]),
  checkSteps: z.array(CheckStepSchema).default([]),
  children: z.array(ChildCellSpecSchema).default([]),
  blockers: z.array(z.string().min(1)).default([]),
  result: StructuredResultSchema.optional(),
});

export function submissionToolSchema(canRunCommands: boolean) {
  const capabilityBoundSchema = canRunCommands ? SubmissionToolSchema : SubmissionToolSchema.extend({
    checkSteps: z
      .array(CheckStepSchema)
      .length(0, "checkSteps must be empty when this cell has no command authority")
      .default([]),
  });
  return capabilityBoundSchema;
}

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
    let submission: CellSubmission | undefined;
    const tools = this.createExecutionTools(input, context, (value) => {
      submission = CellSubmissionSchema.parse(value);
    });
    const executionAgent = new ToolLoopAgent({
      model: this.model,
      instructions: renderExecutionInstructions(input, expressed),
      tools,
      stopWhen: [hasToolCall("submit_result"), stepCountIs(input.budget.maxSteps)],
      maxOutputTokens: 16_000,
      temperature: 0,
      providerOptions: deepSeekNonThinking,
    });
    const budgetAbort = new AbortController();
    const executionSignal = AbortSignal.any([context.signal, budgetAbort.signal]);
    let observedUsage: CellUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 };
    let executionResult;
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
      throw error;
    }
    const usage = normalizeUsage(executionResult.totalUsage, executionResult.providerMetadata);
    if (input.budget.tokenControl === "hard" && usage.totalTokens > context.maxTokens) {
      throw new CellBudgetExceededError(usage.totalTokens, context.maxTokens, usage);
    }

    return {
      ...(submission ? { submission } : {}),
      finalText: executionResult.text,
      usage,
      rawSteps: sanitize(executionResult.steps) as unknown[],
      providerMetadata: sanitize(executionResult.providerMetadata),
    };
  }

  private createExecutionTools(
    input: CellInput,
    context: DriverContext,
    acceptSubmission: (value: unknown) => void,
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
      submit_result: tool({
        description: "Submit the cell's terminal outcome, artifact, evidence, checks, and optional child specifications.",
        inputSchema: submissionToolSchema(context.workspace.canRunCommands),
        execute: async (value) => {
          const submission = CellSubmissionSchema.parse({
            outcome: value.outcome,
            artifact: { summary: value.artifactSummary, files: value.artifactFiles },
            evidence: value.evidence,
            checkPlan: { steps: value.checkSteps },
            children: value.children,
            blockers: value.blockers,
            result: value.result,
          });
          acceptSubmission(submission);
          context.emit("cell.submitted", submission);
          return { accepted: true, outcome: submission.outcome };
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
    return tools;
  }
}

function renderExecutionInstructions(input: CellInput, expressed: ExpressedGenome): string {
  const treatment = input.treatment
    ? `\n\n## Separately labelled treatment\nTreatment ${input.treatment.id} is an experimental hypothesis outside the expressed P-ID team. Apply it only where it changes the task decision and retain evidence that could disconfirm it.\n${input.treatment.instructions}`
    : "";
  return [
    "You are one ephemeral Work Cell. Work only inside the granted tools and workspace.",
    "You own investigation order and local tool choice. You do not own durable acceptance.",
    "If the task exceeds your scope or capability, submit outcome split with bounded child specifications. Do not invoke another agent yourself.",
    "Finish exactly once with submit_result. Include traceable evidence and a mechanical check plan. Empty checks are allowed only when no mechanical check can test the artifact.",
    input.dna.baseInstructions,
    `## Expressed genes\nLead: ${expressed.expression.lead}\nSupports: ${expressed.expression.supports.join(", ") || "none"}\nPrincipal contradiction: ${expressed.expression.principalContradiction}`,
    `## Selected interpretations\n${expressed.context}`,
    treatment,
  ].join("\n\n");
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
  return JSON.parse(
    JSON.stringify(value, (_key, item) => {
      if (typeof item === "bigint") return item.toString();
      if (item instanceof Error) return { name: item.name, message: item.message };
      return item;
    }),
  );
}
