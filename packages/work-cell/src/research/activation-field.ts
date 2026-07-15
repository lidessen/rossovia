import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { CellUsage } from "../contracts";
import { mapConcurrent } from "../concurrency";

export const ACTIVATION_FIELD_VERSION = "work-cell.activation-field.v1" as const;

export const CognitiveShapeSchema = z.object({
  components: z.array(z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    weight: z.number().positive(),
    prompt: z.string().min(1).optional(),
  })).min(1).max(4),
  principles: z.array(z.object({
    pid: z.string().regex(/^P\d{2,}$/),
    weight: z.number().positive(),
    prompt: z.string().min(1).optional(),
  })).max(6),
  traits: z.array(z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    value: z.number().min(0).max(1),
    low: z.string().min(1),
    high: z.string().min(1),
  })),
  facets: z.array(z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    optionId: z.string().regex(/^[a-z][a-z0-9-]*$/),
    prompt: z.string().min(1),
  })),
});

export type CognitiveShape = z.infer<typeof CognitiveShapeSchema>;

export const ActivationReceptorSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  instructions: z.string().min(1),
  principlePids: z.array(z.string().regex(/^P\d{2,}$/)).max(3).default([]),
  componentId: z.string().regex(/^[a-z][a-z0-9-]*$/).optional(),
  temperature: z.number().min(0).max(2).optional(),
  shape: CognitiveShapeSchema.optional(),
});

export const ActivationFieldInputSchema = z.object({
  id: z.string().min(1),
  stimulus: z.string().min(1),
  snapshot: z.string().min(1),
  receptors: z.array(ActivationReceptorSchema).min(2),
  activationCount: z.number().int().min(2).max(512),
  concurrency: z.number().int().min(1).max(256).default(32),
  groupSize: z.number().int().min(4).max(32).default(8),
  workingSetSize: z.number().int().min(2).max(16).default(6),
  maxLayers: z.number().int().min(1).max(6).default(4),
  layerWidths: z.array(z.number().int().min(2).max(512)).max(6).default([]),
  estimatedTokens: z.number().int().positive().optional(),
  propagateShapes: z.boolean().default(false),
}).superRefine((value, context) => {
  const ids = value.receptors.map((receptor) => receptor.id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", path: ["receptors"], message: "receptor IDs must be unique" });
  }
  if (value.workingSetSize >= value.activationCount) {
    context.addIssue({
      code: "custom",
      path: ["workingSetSize"],
      message: "workingSetSize must be smaller than activationCount",
    });
  }
  if (value.layerWidths.length > value.maxLayers) {
    context.addIssue({
      code: "custom",
      path: ["layerWidths"],
      message: "layerWidths cannot declare more layers than maxLayers",
    });
  }
  if (value.layerWidths.some((width) => width > value.activationCount)) {
    context.addIssue({
      code: "custom",
      path: ["layerWidths"],
      message: "a layer width cannot exceed the initial activation count",
    });
  }
});

export const ActivationDraftSchema = z.object({
  impulse: z.string().min(1),
  relation: z.string().min(1),
  predictedConsequence: z.string().min(1),
  disconfirmingObservation: z.string().min(1),
});

export const CoalitionDraftSchema = z.object({
  parentIds: z.array(z.string().min(1)).min(2),
  newRelation: z.string().min(1),
  tensions: z.array(z.string().min(1)).max(4).default([]),
  predictedConsequence: z.string().min(1),
});

export const FieldExpressionSchema = z.object({
  response: z.string().min(1),
  sourceNodeIds: z.array(z.string().min(1)).min(1),
  emergentRelations: z.array(z.object({
    relation: z.string().min(1),
    sourceNodeIds: z.array(z.string().min(1)).min(2),
  })).default([]),
  unresolvedTensions: z.array(z.string().min(1)).default([]),
});

export type ActivationFieldInput = z.infer<typeof ActivationFieldInputSchema>;
export type ActivationDraft = z.infer<typeof ActivationDraftSchema>;
export type CoalitionDraft = z.infer<typeof CoalitionDraftSchema>;
export type FieldExpression = z.infer<typeof FieldExpressionSchema>;

export interface ActivationRecord extends ActivationDraft {
  id: string;
  receptorId: string;
  principlePids: string[];
  componentId?: string;
  temperature?: number;
  sample: number;
}

export interface CoalitionRecord {
  id: string;
  layer: number;
  group: number;
  parentIds: string[];
  newRelation: string;
  tensions: string[];
  predictedConsequence: string;
  shape?: CognitiveShape;
}

export interface FieldNode {
  id: string;
  content: string;
  predictedConsequence: string;
  rootActivationIds: string[];
  shape?: CognitiveShape;
}

export interface ActivationRequest {
  stimulus: string;
  snapshot: string;
  receptor: z.infer<typeof ActivationReceptorSchema>;
  sample: number;
}

export interface IntegrationRequest {
  stimulus: string;
  snapshot: string;
  layer: number;
  nodes: FieldNode[];
  shape?: CognitiveShape;
}

export interface ExpressionRequest {
  stimulus: string;
  snapshot: string;
  nodes: FieldNode[];
}

export interface FieldDriverResult<T> {
  value: T;
  usage: CellUsage;
  raw?: unknown;
}

export interface ActivationFieldDriver {
  readonly descriptor: { provider: string; model: string };
  activate(request: ActivationRequest, signal?: AbortSignal): Promise<FieldDriverResult<ActivationDraft>>;
  integrate(request: IntegrationRequest, signal?: AbortSignal): Promise<FieldDriverResult<CoalitionDraft>>;
  express(request: ExpressionRequest, signal?: AbortSignal): Promise<FieldDriverResult<FieldExpression>>;
}

export class ActivationFieldDriverError extends Error {
  constructor(
    message: string,
    readonly usage: CellUsage,
    readonly raw?: unknown,
  ) {
    super(message);
    this.name = "ActivationFieldDriverError";
  }
}

export interface ActivationFieldRecord {
  version: typeof ACTIVATION_FIELD_VERSION;
  runId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: "completed" | "partial" | "failed";
  driver: ActivationFieldDriver["descriptor"];
  input: ActivationFieldInput;
  activations: ActivationRecord[];
  layers: CoalitionRecord[][];
  workingSet: FieldNode[];
  expression?: FieldExpression;
  failures: Array<{ phase: "activation" | "integration" | "expression"; id: string; error: string }>;
  usage: CellUsage;
  usageByPhase: {
    activation: CellUsage;
    integration: CellUsage;
    expression: CellUsage;
  };
  estimateAudit?: {
    estimatedTokens: number;
    actualTokens: number;
    relativeError: number;
  };
  raw: {
    activations: unknown[];
    integrations: unknown[];
    expression?: unknown;
  };
}

export async function runActivationField(
  unparsed: unknown,
  driver: ActivationFieldDriver,
  signal?: AbortSignal,
): Promise<ActivationFieldRecord> {
  const input = ActivationFieldInputSchema.parse(unparsed);
  const runId = randomUUID();
  const startedAt = new Date();
  const failures: ActivationFieldRecord["failures"] = [];
  const activationRaw: unknown[] = [];
  const integrationRaw: unknown[] = [];

  const jobs = Array.from({ length: input.activationCount }, (_, index) => ({
    id: `a-${String(index + 1).padStart(4, "0")}`,
    sample: Math.floor(index / input.receptors.length) + 1,
    receptor: input.receptors[index % input.receptors.length]!,
  }));

  const activationOutcomes = await mapConcurrent(jobs, input.concurrency, async (job) => {
    try {
      const result = await driver.activate({
        stimulus: input.stimulus,
        snapshot: input.snapshot,
        receptor: job.receptor,
        sample: job.sample,
      }, signal);
      return { job, result };
    } catch (error) {
      failures.push({ phase: "activation", id: job.id, error: message(error) });
      return {
        job,
        error,
        failureUsage: error instanceof ActivationFieldDriverError ? error.usage : emptyUsage(),
        failureRaw: error instanceof ActivationFieldDriverError ? error.raw : undefined,
      };
    }
  });

  const activations: ActivationRecord[] = [];
  let activationUsage = emptyUsage();
  for (const outcome of activationOutcomes) {
    if (!("result" in outcome)) {
      activationUsage = addUsage(activationUsage, outcome.failureUsage);
      activationRaw.push(outcome.failureRaw);
      continue;
    }
    const draft = ActivationDraftSchema.parse(outcome.result.value);
    activationUsage = addUsage(activationUsage, outcome.result.usage);
    activationRaw.push(outcome.result.raw);
    activations.push({
      id: outcome.job.id,
      receptorId: outcome.job.receptor.id,
      principlePids: outcome.job.receptor.principlePids,
      ...(outcome.job.receptor.componentId ? { componentId: outcome.job.receptor.componentId } : {}),
      ...(outcome.job.receptor.temperature !== undefined ? { temperature: outcome.job.receptor.temperature } : {}),
      sample: outcome.job.sample,
      ...draft,
    });
  }
  activations.sort((left, right) => left.id.localeCompare(right.id));

  const receptorById = new Map(input.receptors.map((receptor) => [receptor.id, receptor]));
  let nodes: FieldNode[] = activations.map((activation) => {
    const shape = receptorById.get(activation.receptorId)?.shape;
    return {
      id: activation.id,
      content: `${activation.impulse}\nRelation: ${activation.relation}`,
      predictedConsequence: activation.predictedConsequence,
      rootActivationIds: [activation.id],
      ...(shape ? { shape } : {}),
    };
  });
  const layers: CoalitionRecord[][] = [];
  let integrationUsage = emptyUsage();

  for (let layer = 1; nodes.length > input.workingSetSize && layer <= input.maxLayers; layer += 1) {
    const declaredWidth = input.layerWidths[layer - 1];
    const desiredNextSize = declaredWidth ?? Math.max(input.workingSetSize, Math.ceil(nodes.length / 4));
    const adaptiveGroupSize = Math.max(
      4,
      Math.min(input.groupSize, Math.ceil((2 * nodes.length) / desiredNextSize)),
    );
    const groups = declaredWidth === undefined
      ? overlappingGroups(nodes, adaptiveGroupSize)
      : distributedGroups(nodes, adaptiveGroupSize, desiredNextSize, `${input.id}:${layer}`);
    const outcomes = await mapConcurrent(groups, input.concurrency, async (group, groupIndex) => {
      const id = `c-${layer}-${String(groupIndex + 1).padStart(3, "0")}`;
      const shape = input.propagateShapes
        ? inheritCognitiveShape(group, `${input.id}:${layer}:${groupIndex + 1}`)
        : undefined;
      try {
        const result = await driver.integrate({
          stimulus: input.stimulus,
          snapshot: input.snapshot,
          layer,
          nodes: group,
          ...(shape ? { shape } : {}),
        }, signal);
        const draft = CoalitionDraftSchema.parse(result.value);
        assertParents(draft.parentIds, group, id);
        return { id, groupIndex, group, shape, result, draft };
      } catch (error) {
        failures.push({ phase: "integration", id, error: message(error) });
        return {
          id,
          groupIndex,
          group,
          error,
          failureUsage: error instanceof ActivationFieldDriverError ? error.usage : emptyUsage(),
          failureRaw: error instanceof ActivationFieldDriverError ? error.raw : undefined,
        };
      }
    });
    const layerRecords: CoalitionRecord[] = [];
    const nextNodes: FieldNode[] = [];
    for (const outcome of outcomes) {
      if (!("result" in outcome) || !outcome.result || !outcome.draft) {
        integrationUsage = addUsage(integrationUsage, outcome.failureUsage);
        integrationRaw.push(outcome.failureRaw);
        continue;
      }
      integrationUsage = addUsage(integrationUsage, outcome.result.usage);
      integrationRaw.push(outcome.result.raw);
      const selected = outcome.group.filter((node) => outcome.draft.parentIds.includes(node.id));
      const rootActivationIds = [...new Set(selected.flatMap((node) => node.rootActivationIds))].sort();
      const record: CoalitionRecord = {
        id: outcome.id,
        layer,
        group: outcome.groupIndex + 1,
        parentIds: [...outcome.draft.parentIds].sort(),
        newRelation: outcome.draft.newRelation,
        tensions: outcome.draft.tensions,
        predictedConsequence: outcome.draft.predictedConsequence,
        ...(outcome.shape ? { shape: outcome.shape } : {}),
      };
      layerRecords.push(record);
      nextNodes.push({
        id: record.id,
        content: record.newRelation,
        predictedConsequence: record.predictedConsequence,
        rootActivationIds,
        ...(outcome.shape ? { shape: outcome.shape } : {}),
      });
    }
    layerRecords.sort((left, right) => left.id.localeCompare(right.id));
    nextNodes.sort((left, right) => left.id.localeCompare(right.id));
    layers.push(layerRecords);
    if (nextNodes.length < 2 || (declaredWidth === undefined && nextNodes.length >= nodes.length)) {
      nodes = nextNodes;
      break;
    }
    nodes = nextNodes;
  }

  let expression: FieldExpression | undefined;
  let expressionUsage = emptyUsage();
  let expressionRaw: unknown;
  if (nodes.length > 0) {
    try {
      const result = await driver.express({ stimulus: input.stimulus, snapshot: input.snapshot, nodes }, signal);
      expression = FieldExpressionSchema.parse(result.value);
      assertExpressionSources(expression, nodes);
      expressionUsage = result.usage;
      expressionRaw = result.raw;
    } catch (error) {
      failures.push({ phase: "expression", id: "expression", error: message(error) });
      if (error instanceof ActivationFieldDriverError) {
        expressionUsage = error.usage;
        expressionRaw = error.raw;
      }
    }
  }

  failures.sort((left, right) => `${left.phase}:${left.id}`.localeCompare(`${right.phase}:${right.id}`));
  const usage = addUsage(addUsage(activationUsage, integrationUsage), expressionUsage);
  const finishedAt = new Date();
  const status = expression
    ? failures.length === 0 && nodes.length <= input.workingSetSize ? "completed" : "partial"
    : "failed";
  return {
    version: ACTIVATION_FIELD_VERSION,
    runId,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    status,
    driver: driver.descriptor,
    input,
    activations,
    layers,
    workingSet: nodes,
    ...(expression ? { expression } : {}),
    failures,
    usage,
    usageByPhase: { activation: activationUsage, integration: integrationUsage, expression: expressionUsage },
    ...(input.estimatedTokens ? {
      estimateAudit: {
        estimatedTokens: input.estimatedTokens,
        actualTokens: usage.totalTokens,
        relativeError: Math.abs(usage.totalTokens - input.estimatedTokens) / input.estimatedTokens,
      },
    } : {}),
    raw: {
      activations: activationRaw,
      integrations: integrationRaw,
      ...(expressionRaw === undefined ? {} : { expression: expressionRaw }),
    },
  };
}

export function distributedGroups<T extends { id: string }>(
  nodes: T[],
  groupSize: number,
  count: number,
  salt: string,
): T[][] {
  const sorted = [...nodes].sort((left, right) => left.id.localeCompare(right.id));
  if (sorted.length < 2) return [];
  const size = Math.min(groupSize, sorted.length);
  const strideCandidates = Array.from({ length: sorted.length - 1 }, (_, index) => index + 1)
    .filter((candidate) => greatestCommonDivisor(candidate, sorted.length) === 1);
  const stride = strideCandidates[hashIndex(`${salt}:stride`, strideCandidates.length)] ?? 1;
  const phase = hashIndex(`${salt}:phase`, sorted.length);
  return Array.from({ length: count }, (_, groupIndex) => {
    const start = (phase + Math.floor((groupIndex * sorted.length) / count)) % sorted.length;
    return Array.from({ length: size }, (_, offset) => sorted[(start + offset * stride) % sorted.length]!);
  });
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = left;
  let b = right;
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

export function inheritCognitiveShape(nodes: FieldNode[], salt: string): CognitiveShape | undefined {
  const shapes = nodes.flatMap((node) => node.shape ? [node.shape] : []);
  if (shapes.length === 0) return undefined;
  const chosen = selectDistinct(shapes, Math.min(2, shapes.length), `${salt}:contributors`);
  const components = aggregateWeights(chosen.flatMap((shape) => shape.components), 3);
  const principles = aggregateWeights(chosen.flatMap((shape) => shape.principles), 4, "pid");
  const traitIds = [...new Set(shapes.flatMap((shape) => shape.traits.map((trait) => trait.id)))].sort();
  const traits = traitIds.map((id) => {
    const candidates = shapes.flatMap((shape) => shape.traits.filter((trait) => trait.id === id));
    const source = candidates[hashIndex(`${salt}:trait:${id}`, candidates.length)]!;
    const mutation = (hashFraction(`${salt}:mutation:${id}`) - 0.5) * 0.16;
    return { ...source, value: round6(Math.max(0, Math.min(1, source.value + mutation))) };
  });
  const facetIds = [...new Set(shapes.flatMap((shape) => shape.facets.map((facet) => facet.id)))].sort();
  const facets = facetIds.map((id) => {
    const candidates = shapes.flatMap((shape) => shape.facets.filter((facet) => facet.id === id));
    return candidates[hashIndex(`${salt}:facet:${id}`, candidates.length)]!;
  });
  return CognitiveShapeSchema.parse({ components, principles, traits, facets });
}

export function renderCognitiveShape(shape: CognitiveShape): string {
  return [
    "Think as this inherited partial cognitive temperament.",
    `Centers of gravity: ${shape.components.map((entry) => entry.prompt ?? entry.id).join(" ")}.`,
    `Characteristic ways of thinking: ${shape.principles.map((entry, index) => `${index === 0 ? "Dominantly" : "Also"}: ${entry.prompt ?? entry.pid}`).join(" ") || "No principle disposition is inherited."}`,
    `Temperament: ${shape.traits.map(renderInheritedTrait).join(" ") || "No continuous disposition is inherited."}`,
    `Imaginative habitat: ${shape.facets.map((facet) => facet.prompt).join(" ") || "No perceptual domain is inherited."}`,
    "Think from these tendencies and their blind spots; do not describe the profile or compensate into a balanced general assistant.",
  ].join("\n");
}

function renderInheritedTrait(trait: CognitiveShape["traits"][number]): string {
  if (trait.value <= 0.18) return `You are strongly drawn toward ${trait.low}; ${trait.high} tends to feel premature or remote.`;
  if (trait.value <= 0.4) return `You usually begin with ${trait.low}, while allowing some movement toward ${trait.high}.`;
  if (trait.value < 0.6) return `You move between ${trait.low} and ${trait.high} without a settled preference.`;
  if (trait.value < 0.82) return `You usually begin with ${trait.high}, while retaining some pull toward ${trait.low}.`;
  return `You are strongly drawn toward ${trait.high}; ${trait.low} tends to feel constraining or insufficient.`;
}

function aggregateWeights<T extends { weight: number }>(
  entries: T[],
  limit: number,
  key: "id" | "pid" = "id",
): T[] {
  const totals = new Map<string, { exemplar: T; total: number }>();
  for (const entry of entries) {
    const id = key === "id"
      ? (entry as T & { id: string }).id
      : (entry as T & { pid: string }).pid;
    const current = totals.get(id);
    totals.set(id, {
      exemplar: current?.exemplar ?? entry,
      total: (current?.total ?? 0) + entry.weight,
    });
  }
  const selected = [...totals.values()]
    .sort((left, right) => right.total - left.total)
    .slice(0, limit);
  const total = selected.reduce((sum, entry) => sum + entry.total, 0);
  return selected.map((entry) => ({
    ...entry.exemplar,
    weight: round6(entry.total / total),
  }));
}

function selectDistinct<T>(entries: T[], count: number, salt: string): T[] {
  return entries
    .map((entry, index) => ({ entry, score: hashFraction(`${salt}:${index}`) }))
    .sort((left, right) => left.score - right.score)
    .slice(0, count)
    .map(({ entry }) => entry);
}

function hashIndex(value: string, length: number): number {
  return Math.floor(hashFraction(value) * length);
}

function hashFraction(value: string): number {
  return createHash("sha256").update(value).digest().readUInt32BE(0) / 0x1_0000_0000;
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function overlappingGroups<T extends { id: string }>(nodes: T[], groupSize: number): T[][] {
  if (nodes.length <= groupSize) return [nodes];
  const sorted = [...nodes].sort((left, right) => left.id.localeCompare(right.id));
  const groups: T[][] = [];
  const seen = new Set<string>();
  const add = (group: T[]) => {
    if (group.length < 2) return;
    const key = group.map((node) => node.id).sort().join("|");
    if (seen.has(key)) return;
    seen.add(key);
    groups.push(group);
  };
  for (let start = 0; start < sorted.length; start += groupSize) {
    add(sorted.slice(start, start + groupSize));
  }
  const offset = Math.max(1, Math.floor(groupSize / 2));
  for (let start = offset; start < sorted.length + offset; start += groupSize) {
    add(Array.from({ length: Math.min(groupSize, sorted.length) }, (_, index) => sorted[(start + index) % sorted.length]!));
  }
  return groups;
}

function assertParents(parentIds: string[], group: FieldNode[], coalitionId: string): void {
  if (new Set(parentIds).size !== parentIds.length) throw new Error(`${coalitionId} repeats a parent ID`);
  const allowed = new Set(group.map((node) => node.id));
  const invalid = parentIds.filter((id) => !allowed.has(id));
  if (invalid.length) throw new Error(`${coalitionId} references parents outside its local group: ${invalid.join(", ")}`);
}

function assertExpressionSources(expression: FieldExpression, nodes: FieldNode[]): void {
  const allowed = new Set(nodes.map((node) => node.id));
  const referenced = [
    ...expression.sourceNodeIds,
    ...expression.emergentRelations.flatMap((relation) => relation.sourceNodeIds),
  ];
  const invalid = referenced.filter((id) => !allowed.has(id));
  if (invalid.length) throw new Error(`expression references nodes outside the working set: ${invalid.join(", ")}`);
}

function emptyUsage(): CellUsage {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 };
}

function addUsage(left: CellUsage, right: CellUsage): CellUsage {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    totalTokens: left.totalTokens + right.totalTokens,
    cachedInputTokens: left.cachedInputTokens + right.cachedInputTokens,
  };
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
