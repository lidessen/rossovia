import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { ActivationFieldDriverError, type ActivationFieldRecord, type FieldDriverResult } from "./activation-field";
import { mapConcurrent } from "../concurrency";
import type { CellUsage } from "../contracts";
import {
  buildResidualField,
  ResidualRouteSchema,
  type ResidualNode,
  type ResidualRoute,
} from "./residual-readout";

const RoutingHeadSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  instructions: z.string().min(1),
  routeLimit: z.number().int().min(2).max(16).default(8),
}).strict();

const LexicalBasinSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  terms: z.array(z.string().min(1)).min(1),
}).strict();

export const LatentRoutingSpecSchema = z.object({
  id: z.string().min(1),
  heads: z.array(RoutingHeadSchema).min(2).max(16),
  fieldLayers: z.array(z.number().int().min(0).max(6)).min(1).default([0]),
  sparseVisibility: z.object({
    copiesPerNode: z.number().int().min(1).max(16),
    seed: z.string().min(1),
  }).strict().optional(),
  lexicalBasins: z.array(LexicalBasinSchema).default([]),
  concurrency: z.number().int().min(1).max(16).default(8),
  estimatedTokens: z.number().int().positive().optional(),
}).strict().superRefine((value, context) => {
  unique(value.heads.map((head) => head.id), "head", ["heads"], context);
  unique(value.fieldLayers.map(String), "field layer", ["fieldLayers"], context);
  unique(value.lexicalBasins.map((basin) => basin.id), "lexical basin", ["lexicalBasins"], context);
  if (value.sparseVisibility && value.sparseVisibility.copiesPerNode >= value.heads.length) {
    context.addIssue({
      code: "custom",
      path: ["sparseVisibility", "copiesPerNode"],
      message: "copiesPerNode must be smaller than the number of heads",
    });
  }
});

export type LatentRoutingSpec = z.infer<typeof LatentRoutingSpecSchema>;

export interface LatentRoutingDriver {
  readonly descriptor: { provider: string; model: string };
  route(request: {
    stimulus: string;
    head: LatentRoutingSpec["heads"][number];
    field: ResidualNode[];
  }, signal?: AbortSignal): Promise<FieldDriverResult<ResidualRoute>>;
}

export interface LatentRoutingHeadRecord {
  id: string;
  instructions: string;
  availableNodeIds: string[];
  route: ResidualRoute;
  routedLayers: number[];
}

export interface LatentRoutingRecord {
  version: "work-cell.latent-routing.v1";
  runId: string;
  sourceRunId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: "completed" | "partial" | "failed";
  driver: LatentRoutingDriver["descriptor"];
  spec: LatentRoutingSpec;
  field: { nodes: number; nodesByLayer: Record<string, number> };
  heads: LatentRoutingHeadRecord[];
  metrics: LatentRoutingMetrics;
  failures: Array<{ headId: string; error: string }>;
  usage: CellUsage;
  estimateAudit?: { estimatedTokens: number; actualTokens: number; relativeError: number };
  raw: unknown[];
}

export interface LatentRoutingMetrics {
  totalSelections: number;
  uniqueSelectedNodes: number;
  fieldCoverage: number;
  meanRouteSize: number;
  meanPairwiseJaccard: number;
  meanAvailableNodes: number;
  meanPairwiseAvailabilityJaccard: number;
  sourceDomains: {
    field: Record<string, number>;
    selectedOccurrences: Record<string, number>;
    selectedUnique: Record<string, number>;
  };
  lexicalBasins: Array<{
    id: string;
    field: { hits: number; total: number; share: number };
    selectedOccurrences: { hits: number; total: number; share: number };
    selectedUnique: { hits: number; total: number; share: number };
    sourceIntegrationLayers: Array<{ layer: number; hits: number; total: number; share: number }>;
  }>;
}

export async function runLatentRouting(
  source: ActivationFieldRecord,
  unparsedSpec: unknown,
  driver: LatentRoutingDriver,
  signal?: AbortSignal,
): Promise<LatentRoutingRecord> {
  const spec = LatentRoutingSpecSchema.parse(unparsedSpec);
  const field = buildResidualField(source).filter((node) => spec.fieldLayers.includes(node.layer));
  if (field.length < 2) throw new Error("latent routing field must contain at least two nodes");
  const fieldById = new Map(field.map((node) => [node.id, node]));
  const visibleFields = assignVisibleFields(field, spec.heads, spec.sparseVisibility);
  const startedAt = new Date();
  const failures: LatentRoutingRecord["failures"] = [];

  const outcomes = await mapConcurrent(spec.heads, spec.concurrency, async (head) => {
    const visibleField = visibleFields.get(head.id)!;
    try {
      const result = await driver.route({ stimulus: source.input.stimulus, head, field: visibleField }, signal);
      const route = ResidualRouteSchema.parse(result.value);
      assertRoute(route, head, new Map(visibleField.map((node) => [node.id, node])));
      return { ok: true as const, head, visibleField, route, result };
    } catch (error) {
      failures.push({ headId: head.id, error: message(error) });
      return {
        ok: false as const,
        head,
        error,
        failureUsage: error instanceof ActivationFieldDriverError ? error.usage : emptyUsage(),
        failureRaw: error instanceof ActivationFieldDriverError ? error.raw : undefined,
      };
    }
  });

  const heads: LatentRoutingHeadRecord[] = [];
  const raw: unknown[] = [];
  let usage = emptyUsage();
  for (const outcome of outcomes) {
    if (!outcome.ok) {
      usage = addUsage(usage, outcome.failureUsage);
      if (outcome.failureRaw !== undefined) raw.push(outcome.failureRaw);
      continue;
    }
    usage = addUsage(usage, outcome.result.usage);
    raw.push(outcome.result.raw);
    heads.push({
      id: outcome.head.id,
      instructions: outcome.head.instructions,
      availableNodeIds: outcome.visibleField.map((node) => node.id),
      route: outcome.route,
      routedLayers: [...new Set(outcome.route.sourceNodeIds.map((id) => fieldById.get(id)!.layer))].sort(),
    });
  }
  failures.sort((left, right) => left.headId.localeCompare(right.headId));
  const finishedAt = new Date();
  return {
    version: "work-cell.latent-routing.v1",
    runId: randomUUID(),
    sourceRunId: source.runId,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    status: heads.length === spec.heads.length ? "completed" : heads.length > 0 ? "partial" : "failed",
    driver: driver.descriptor,
    spec,
    field: { nodes: field.length, nodesByLayer: countBy(field, (node) => String(node.layer)) },
    heads,
    metrics: analyzeLatentRoutes(source, field, heads, spec.lexicalBasins),
    failures,
    usage,
    ...(spec.estimatedTokens ? {
      estimateAudit: {
        estimatedTokens: spec.estimatedTokens,
        actualTokens: usage.totalTokens,
        relativeError: Math.abs(usage.totalTokens - spec.estimatedTokens) / spec.estimatedTokens,
      },
    } : {}),
    raw,
  };
}

export function analyzeLatentRoutes(
  source: ActivationFieldRecord,
  field: ResidualNode[],
  heads: LatentRoutingHeadRecord[],
  basins: LatentRoutingSpec["lexicalBasins"],
): LatentRoutingMetrics {
  const fieldById = new Map(field.map((node) => [node.id, node]));
  const selectedIds = heads.flatMap((head) => head.route.sourceNodeIds);
  const uniqueIds = [...new Set(selectedIds)];
  const selectedOccurrences = selectedIds.map((id) => fieldById.get(id)!).filter(Boolean);
  const selectedUnique = uniqueIds.map((id) => fieldById.get(id)!).filter(Boolean);
  return {
    totalSelections: selectedIds.length,
    uniqueSelectedNodes: uniqueIds.length,
    fieldCoverage: ratio(uniqueIds.length, field.length),
    meanRouteSize: ratio(selectedIds.length, heads.length),
    meanPairwiseJaccard: meanJaccard(heads.map((head) => new Set(head.route.sourceNodeIds))),
    meanAvailableNodes: ratio(heads.reduce((total, head) => total + head.availableNodeIds.length, 0), heads.length),
    meanPairwiseAvailabilityJaccard: meanJaccard(heads.map((head) => new Set(head.availableNodeIds))),
    sourceDomains: {
      field: countBy(field, sourceDomain),
      selectedOccurrences: countBy(selectedOccurrences, sourceDomain),
      selectedUnique: countBy(selectedUnique, sourceDomain),
    },
    lexicalBasins: basins.map((basin) => ({
      id: basin.id,
      field: lexicalShare(field, basin.terms),
      selectedOccurrences: lexicalShare(selectedOccurrences, basin.terms),
      selectedUnique: lexicalShare(selectedUnique, basin.terms),
      sourceIntegrationLayers: source.layers.map((nodes, index) => ({
        layer: index + 1,
        ...lexicalShare(nodes.map((node) => ({ content: node.newRelation, predictedConsequence: node.predictedConsequence })), basin.terms),
      })),
    })),
  };
}

export function assignVisibleFields(
  field: ResidualNode[],
  heads: LatentRoutingSpec["heads"],
  sparse: LatentRoutingSpec["sparseVisibility"],
): Map<string, ResidualNode[]> {
  if (!sparse) return new Map(heads.map((head) => [head.id, field]));
  const visible = new Map(heads.map((head) => [head.id, [] as ResidualNode[]]));
  const loads = new Map(heads.map((head) => [head.id, 0]));
  for (const node of field) {
    const selected = heads
      .map((head) => ({
        head,
        load: loads.get(head.id)!,
        score: createHash("sha256").update(`${sparse.seed}:${node.id}:${head.id}`).digest("hex"),
      }))
      .sort((left, right) => left.load - right.load || left.score.localeCompare(right.score) || left.head.id.localeCompare(right.head.id))
      .slice(0, sparse.copiesPerNode);
    for (const { head } of selected) {
      visible.get(head.id)!.push(node);
      loads.set(head.id, loads.get(head.id)! + 1);
    }
  }
  for (const [headId, nodes] of visible) {
    if (nodes.length < 2) throw new Error(`${headId} sparse visibility contains fewer than two nodes`);
  }
  return visible;
}

function assertRoute(
  route: ResidualRoute,
  head: LatentRoutingSpec["heads"][number],
  fieldById: Map<string, ResidualNode>,
): void {
  if (route.sourceNodeIds.length > head.routeLimit) throw new Error(`${head.id} route exceeds its routeLimit`);
  if (new Set(route.sourceNodeIds).size !== route.sourceNodeIds.length) throw new Error(`${head.id} route repeats a node`);
  const missing = route.sourceNodeIds.filter((id) => !fieldById.has(id));
  if (missing.length) throw new Error(`${head.id} route references unavailable nodes: ${missing.join(", ")}`);
}

function lexicalShare<T extends { content: string; predictedConsequence: string }>(nodes: T[], terms: string[]) {
  const normalizedTerms = terms.map((term) => term.toLocaleLowerCase());
  const hits = nodes.filter((node) => {
    const text = `${node.content}\n${node.predictedConsequence}`.toLocaleLowerCase();
    return normalizedTerms.some((term) => text.includes(term));
  }).length;
  return { hits, total: nodes.length, share: ratio(hits, nodes.length) };
}

function sourceDomain(node: ResidualNode): string {
  return node.shape?.facets.find((facet) => facet.id === "source-domain")?.optionId ?? "unshaped";
}

function meanJaccard(sets: Array<Set<string>>): number {
  if (sets.length < 2) return 0;
  let total = 0;
  let pairs = 0;
  for (let left = 0; left < sets.length; left += 1) {
    for (let right = left + 1; right < sets.length; right += 1) {
      const union = new Set([...sets[left]!, ...sets[right]!]);
      const intersection = [...sets[left]!].filter((id) => sets[right]!.has(id)).length;
      total += ratio(intersection, union.size);
      pairs += 1;
    }
  }
  return ratio(total, pairs);
}

function countBy<T>(values: T[], key: (value: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const id = key(value);
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 1_000_000) / 1_000_000;
}

function unique(values: string[], label: string, path: Array<string | number>, context: z.RefinementCtx): void {
  if (new Set(values).size !== values.length) {
    context.addIssue({ code: "custom", path, message: `${label} values must be unique` });
  }
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
