import { z } from "zod";
import {
  CellInputSchema,
  type CellInput,
  type CellPreparation,
  type CellRunRecord,
  type TraceEvent,
} from "../../contracts";
import type { CellDriver, DriverContext } from "../../driver";
import { traceEvent } from "../../driver";
import {
  GeneExpressionSchema,
  SequenceCellInputSchema,
  expressGenome,
  loadGenome,
  type GeneSelectionResult,
  type Genome,
  type SequenceCellInput,
} from "./genome";
import { runCell } from "../../run-cell";
import { Workspace } from "../../workspace";

export const SEQUENCE_PREPARATION_ADAPTER = "sequence.v1" as const;

export const SequencePreparationEvidenceSchema = z.object({
  sequencePath: z.string().min(1),
  geneExpression: GeneExpressionSchema,
  loadedInterpretations: z.array(z.string().min(1)),
}).strict();

export type SequencePreparationEvidence = z.infer<typeof SequencePreparationEvidenceSchema>;

export interface SequenceSelector {
  selectSequenceGenes(
    input: SequenceCellInput,
    genome: Genome,
    context: DriverContext,
  ): Promise<GeneSelectionResult>;
}

export interface PreparedSequenceCell {
  input: CellInput;
  preparation: CellPreparation;
}

export async function prepareSequenceCell(
  unparsedInput: unknown,
  selector: SequenceSelector,
  signal: AbortSignal,
): Promise<PreparedSequenceCell> {
  const input = SequenceCellInputSchema.parse(unparsedInput);
  const workspace = await Workspace.create(input.workspace, input.budget);
  const preparationTrace: TraceEvent[] = [];
  const context: DriverContext = {
    workspace,
    signal,
    emit(type, data) {
      preparationTrace.push(traceEvent(type, data));
    },
  };
  const genome = await loadGenome(input, workspace);
  preparationTrace.push(traceEvent("sequence.loaded", {
    source: genome.source,
    genes: genome.genes.map((gene) => gene.pid),
    inheritedLineage: genome.inheritedLineage,
  }));
  const selected = await selector.selectSequenceGenes(input, genome, context);
  const expressed = await expressGenome(input, workspace, genome, selected.expression);
  preparationTrace.push(traceEvent("sequence.expressed", {
    expression: expressed.expression,
    interpretationPaths: expressed.interpretationPaths,
  }));

  const preparedInput = CellInputSchema.parse({
    id: input.id,
    intent: input.intent,
    workspace: input.workspace,
    instructions: [input.dna.baseInstructions],
    capabilities: input.dna.capabilities,
    context: [{
      id: "sequence-expression",
      title: "Selected Sequence interpretations",
      content: [
        `Lead: ${expressed.expression.lead}`,
        `Supports: ${expressed.expression.supports.join(", ") || "none"}`,
        `Principal contradiction: ${expressed.expression.principalContradiction}`,
        "",
        expressed.context,
      ].join("\n"),
      sources: [genome.source, ...expressed.interpretationPaths],
    }],
    capabilitiesRequired: input.capabilitiesRequired,
    acceptance: input.acceptance,
    ...(input.terminalTools ? { terminalTools: input.terminalTools } : {}),
    ...(input.outputSchema ? { outputSchema: input.outputSchema } : {}),
    ...(input.artifacts ? { artifacts: input.artifacts } : {}),
    budget: input.budget,
    ...(input.workEstimate ? { workEstimate: input.workEstimate } : {}),
    ...(input.executionProfile ? { executionProfile: input.executionProfile } : {}),
  });
  return {
    input: preparedInput,
    preparation: {
      adapter: SEQUENCE_PREPARATION_ADAPTER,
      usage: selected.usage,
      rawSteps: [...preparationTrace, ...selected.rawSteps],
      evidence: {
        sequencePath: genome.source,
        geneExpression: expressed.expression,
        loadedInterpretations: expressed.interpretationPaths,
      },
    },
  };
}

export async function runSequenceCell(
  unparsedInput: unknown,
  driver: CellDriver & SequenceSelector,
  externalSignal?: AbortSignal,
): Promise<CellRunRecord> {
  const input = SequenceCellInputSchema.parse(unparsedInput);
  const startedAt = new Date();
  const timeoutSignal = AbortSignal.timeout(input.budget.maxDurationMs);
  const signal = externalSignal ? AbortSignal.any([externalSignal, timeoutSignal]) : timeoutSignal;
  const missing = input.capabilitiesRequired.filter((required) => !input.dna.capabilities.includes(required));
  let prepared: CellInput;
  let preparation: CellPreparation | undefined;
  let executionDriver: CellDriver = driver;
  if (missing.length > 0) {
    prepared = lowerSequenceInput(input);
  } else {
    try {
      const result = await prepareSequenceCell(input, driver, signal);
      prepared = result.input;
      preparation = result.preparation;
    } catch (caught) {
      const error = caught instanceof Error ? caught : new Error(String(caught));
      prepared = lowerSequenceInput(input);
      preparation = {
        adapter: SEQUENCE_PREPARATION_ADAPTER,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
        rawSteps: [],
        evidence: { error: error.message },
      };
      executionDriver = {
        descriptor: driver.descriptor,
        async run() {
          throw error;
        },
      };
    }
  }
  const record = await runCell(prepared, executionDriver, { signal, ...(preparation ? { preparation } : {}) });
  const finishedAt = new Date();
  return {
    ...record,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
  };
}

function lowerSequenceInput(input: SequenceCellInput): CellInput {
  return CellInputSchema.parse({
    id: input.id,
    intent: input.intent,
    workspace: input.workspace,
    instructions: [input.dna.baseInstructions],
    capabilities: input.dna.capabilities,
    capabilitiesRequired: input.capabilitiesRequired,
    acceptance: input.acceptance,
    ...(input.terminalTools ? { terminalTools: input.terminalTools } : {}),
    ...(input.outputSchema ? { outputSchema: input.outputSchema } : {}),
    ...(input.artifacts ? { artifacts: input.artifacts } : {}),
    budget: input.budget,
    ...(input.workEstimate ? { workEstimate: input.workEstimate } : {}),
    ...(input.executionProfile ? { executionProfile: input.executionProfile } : {}),
  });
}

export function sequencePreparation(record: CellRunRecord): SequencePreparationEvidence | undefined {
  if (record.preparation?.adapter !== SEQUENCE_PREPARATION_ADAPTER) return undefined;
  const parsed = SequencePreparationEvidenceSchema.safeParse(record.preparation.evidence);
  return parsed.success ? parsed.data : undefined;
}
