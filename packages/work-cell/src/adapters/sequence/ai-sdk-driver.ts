import { ToolLoopAgent, hasToolCall, tool } from "ai";
import type { DriverContext } from "../../driver";
import { normalizeAiSdkUsage as normalizeUsage } from "../../ai-sdk-usage";
import {
  GeneExpressionSchema,
  renderGenomeForSelection,
  type GeneExpression,
  type GeneSelectionResult,
  type Genome,
  type SequenceCellInput,
} from "./genome";
import { AiSdkValidationDriver } from "../../ai-sdk-driver";
import type { SequenceSelector } from "./runtime";

/** Sequence-specific preparation paired with the general AI SDK executor. */
export class AiSdkValidationSequenceDriver extends AiSdkValidationDriver implements SequenceSelector {
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

function sanitize(value: unknown): unknown {
  const serialized = JSON.stringify(value, (_key, item) => {
    if (typeof item === "bigint") return item.toString();
    if (item instanceof Error) return { name: item.name, message: item.message };
    return item;
  });
  return serialized === undefined ? undefined : JSON.parse(serialized);
}
