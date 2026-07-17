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
import { SequencePreparationError, type SequenceSelector } from "./runtime";

/** Sequence-specific preparation paired with the general AI SDK executor. */
export class AiSdkValidationSequenceDriver extends AiSdkValidationDriver implements SequenceSelector {
  async selectSequenceGenes(
    input: SequenceCellInput,
    genome: Genome,
    context: DriverContext,
  ): Promise<GeneSelectionResult> {
    let selection: GeneExpression | undefined;
    const rawSteps: unknown[] = [];
    let usage = emptyUsage();
    const createExpressionAgent = (recovering = false) => new ToolLoopAgent({
      model: this.model,
      instructions: [
        "You are the differentiation phase of one ephemeral work cell.",
        "Read the task and compact Principle Sequence. Select exactly one current lead P-ID for the principal contradiction and no more than three supporting P-IDs.",
        "Each support must contribute a distinct decision. Do not select a candidate or invent a P-ID. Inherited lineage is orientation, not a forced lead.",
        "Finish only by calling express_genes.",
        ...(recovering ? [
          "## Gene-expression recovery",
          "A prior attempt ended without calling express_genes. Do not return prose or continue analysis.",
          "Call express_genes exactly once now with the smallest valid selection.",
        ] : []),
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
    const expressionAgent = createExpressionAgent();

    const prompt = [
      `Task intent:\n${input.intent}`,
      `Acceptance conditions:\n${input.acceptance.map((item) => `- ${item}`).join("\n")}`,
      `Available capabilities:\n${input.dna.capabilities.join(", ") || "none"}`,
      `Required capabilities:\n${input.capabilitiesRequired.join(", ") || "none"}`,
      `Principle Sequence:\n${renderGenomeForSelection(genome)}`,
    ].join("\n\n");
    const first = await expressionAgent.generate({
      prompt,
      abortSignal: context.signal,
      timeout: { totalMs: Math.min(60_000, input.budget.maxDurationMs) },
    });
    usage = addUsage(usage, normalizeUsage(first.totalUsage, first.providerMetadata));
    rawSteps.push(...sanitizeSteps(first.steps));

    let result = first;
    if (!selection) {
      context.emit("sequence.expression.recovery", {
        reason: "natural_finish_without_gene_expression",
      });
      try {
        result = await createExpressionAgent(true).generate({
          prompt,
          abortSignal: context.signal,
          timeout: { totalMs: Math.min(60_000, input.budget.maxDurationMs) },
        });
      } catch (error) {
        throw new SequencePreparationError(
          `gene expression recovery failed: ${error instanceof Error ? error.message : String(error)}`,
          { usage, rawSteps },
          error,
        );
      }
      usage = addUsage(usage, normalizeUsage(result.totalUsage, result.providerMetadata));
      rawSteps.push(...sanitizeSteps(result.steps));
    }

    if (!selection) {
      throw new SequencePreparationError(
        "gene expression protocol failed after one recovery: express_genes was not accepted",
        { usage, rawSteps },
      );
    }
    return {
      expression: selection,
      usage,
      rawSteps,
      providerMetadata: sanitize(result.providerMetadata),
    };
  }
}

function emptyUsage() {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 };
}

function addUsage(left: ReturnType<typeof emptyUsage>, right: ReturnType<typeof emptyUsage>) {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    totalTokens: left.totalTokens + right.totalTokens,
    cachedInputTokens: left.cachedInputTokens + right.cachedInputTokens,
  };
}

function sanitizeSteps(steps: unknown[]): unknown[] {
  return sanitize(steps) as unknown[];
}

function sanitize(value: unknown): unknown {
  const serialized = JSON.stringify(value, (_key, item) => {
    if (typeof item === "bigint") return item.toString();
    if (item instanceof Error) return { name: item.name, message: item.message };
    return item;
  });
  return serialized === undefined ? undefined : JSON.parse(serialized);
}
