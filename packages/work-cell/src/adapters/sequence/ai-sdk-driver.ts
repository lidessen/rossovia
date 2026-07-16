import type { DeepSeekLanguageModelOptions } from "@ai-sdk/deepseek";
import { ToolLoopAgent, hasToolCall, tool } from "ai";
import type { CellUsage } from "../../contracts";
import type { DriverContext } from "../../driver";
import {
  GeneExpressionSchema,
  renderGenomeForSelection,
  type GeneExpression,
  type GeneSelectionResult,
  type Genome,
  type SequenceCellInput,
} from "./genome";
import { AiSdkDeepSeekDriver } from "../../ai-sdk-driver";
import type { SequenceSelector } from "./runtime";

const deepSeekNonThinking = {
  deepseek: {
    thinking: { type: "disabled" },
  } satisfies DeepSeekLanguageModelOptions,
};

/** Sequence-specific preparation paired with the general AI SDK executor. */
export class AiSdkDeepSeekSequenceDriver extends AiSdkDeepSeekDriver implements SequenceSelector {
  async selectSequenceGenes(
    input: SequenceCellInput,
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

    const result = await expressionAgent.generate({
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
    return {
      expression: selection,
      usage: normalizeUsage(result.totalUsage, result.providerMetadata),
      rawSteps: sanitize(result.steps) as unknown[],
      providerMetadata: sanitize(result.providerMetadata),
    };
  }
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
    cachedInputTokens: numberValue((record.inputTokenDetails as { cacheReadTokens?: unknown } | null | undefined)?.cacheReadTokens) || numberValue(provider.promptCacheHitTokens),
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
