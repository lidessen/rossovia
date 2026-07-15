import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { CellUsage } from "../contracts";
import { mapConcurrent } from "../concurrency";
import type { ActivationFieldRecord, CognitiveShape, FieldDriverResult } from "./activation-field";

export const ResidualReadoutSpecSchema = z.object({
  id: z.string().min(1),
  heads: z.array(z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    instructions: z.string().min(1),
    routeLimit: z.number().int().min(3).max(16).default(8),
  })).min(2).max(8),
  finalInstructions: z.string().min(1),
  minProposals: z.number().int().min(1).max(8).default(3),
  maxProposals: z.number().int().min(1).max(12).default(5),
  concurrency: z.number().int().min(1).max(8).default(4),
  fieldLayers: z.array(z.number().int().min(0).max(6)).min(1).optional(),
  estimatedTokens: z.number().int().positive().optional(),
}).superRefine((value, context) => {
  if (new Set(value.heads.map((head) => head.id)).size !== value.heads.length) {
    context.addIssue({ code: "custom", path: ["heads"], message: "read-head IDs must be unique" });
  }
  if (value.minProposals > value.maxProposals) {
    context.addIssue({ code: "custom", path: ["minProposals"], message: "minProposals must not exceed maxProposals" });
  }
});

export const ResidualRouteSchema = z.object({
  sourceNodeIds: z.array(z.string().min(1)).min(2).max(16),
  routingReason: z.string().min(1),
  expectedContrast: z.string().min(1),
});

export const ResidualHeadDeltaSchema = z.object({
  sourceNodeIds: z.array(z.string().min(1)).min(2).max(16),
  delta: z.string().min(1),
  proposalSeeds: z.array(z.object({
    label: z.string().min(1),
    explanation: z.string().min(1),
  })).max(6).default([]),
  unresolvedTension: z.string().min(1),
  disconfirmingObservation: z.string().min(1),
});

export const ResidualProjectionSchema = z.object({
  response: z.string().min(1),
  proposals: z.array(z.object({
    label: z.string().min(1),
    explanation: z.string().min(1),
    sourceHeadIds: z.array(z.string().min(1)).min(1),
    sourceNodeIds: z.array(z.string().min(1)).min(2),
  })),
  unresolvedTensions: z.array(z.string().min(1)).default([]),
});

export type ResidualReadoutSpec = z.infer<typeof ResidualReadoutSpecSchema>;
export type ResidualRoute = z.infer<typeof ResidualRouteSchema>;
export type ResidualHeadDelta = z.infer<typeof ResidualHeadDeltaSchema>;
export type ResidualProjection = z.infer<typeof ResidualProjectionSchema>;

export interface ResidualNode {
  id: string;
  layer: number;
  content: string;
  predictedConsequence: string;
  rootActivationIds: string[];
  shape?: CognitiveShape;
}

export interface ResidualHeadRecord {
  id: string;
  instructions: string;
  route: ResidualRoute;
  routedLayers: number[];
  delta: ResidualHeadDelta;
}

export interface ResidualReadoutDriver {
  readonly descriptor: { provider: string; model: string };
  route(request: {
    stimulus: string;
    head: ResidualReadoutSpec["heads"][number];
    field: ResidualNode[];
  }, signal?: AbortSignal): Promise<FieldDriverResult<ResidualRoute>>;
  read(request: {
    stimulus: string;
    head: ResidualReadoutSpec["heads"][number];
    nodes: ResidualNode[];
    route: ResidualRoute;
  }, signal?: AbortSignal): Promise<FieldDriverResult<ResidualHeadDelta>>;
  project(request: {
    stimulus: string;
    finalInstructions: string;
    heads: ResidualHeadRecord[];
    minProposals: number;
    maxProposals: number;
  }, signal?: AbortSignal): Promise<FieldDriverResult<ResidualProjection>>;
}

export interface ResidualReadoutRecord {
  version: "work-cell.residual-readout.v1";
  runId: string;
  sourceRunId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: "completed" | "partial" | "failed";
  driver: ResidualReadoutDriver["descriptor"];
  spec: ResidualReadoutSpec;
  field: {
    nodes: number;
    nodesByLayer: Record<string, number>;
  };
  heads: ResidualHeadRecord[];
  projection?: ResidualProjection;
  failures: Array<{ phase: "route" | "read" | "project"; id: string; error: string }>;
  usage: CellUsage;
  estimateAudit?: { estimatedTokens: number; actualTokens: number; relativeError: number };
  raw: { routes: unknown[]; reads: unknown[]; projection?: unknown };
}

export async function runResidualReadout(
  source: ActivationFieldRecord,
  unparsedSpec: unknown,
  driver: ResidualReadoutDriver,
  signal?: AbortSignal,
): Promise<ResidualReadoutRecord> {
  const spec = ResidualReadoutSpecSchema.parse(unparsedSpec);
  const completeField = buildResidualField(source);
  const field = spec.fieldLayers
    ? completeField.filter((node) => spec.fieldLayers!.includes(node.layer))
    : completeField;
  if (field.length < 2) throw new Error("residual readout field must contain at least two nodes");
  const fieldById = new Map(field.map((node) => [node.id, node]));
  const startedAt = new Date();
  const failures: ResidualReadoutRecord["failures"] = [];
  const routeRaw: unknown[] = [];
  const readRaw: unknown[] = [];
  let usage = emptyUsage();

  const outcomes = await mapConcurrent(spec.heads, spec.concurrency, async (head) => {
    let routed: FieldDriverResult<ResidualRoute>;
    let route: ResidualRoute;
    try {
      routed = await driver.route({ stimulus: source.input.stimulus, head, field }, signal);
    } catch (error) {
      failures.push({ phase: "route", id: head.id, error: message(error) });
      return { head, phase: "route" as const, error };
    }
    try {
      route = ResidualRouteSchema.parse(routed.value);
      assertUniqueSubset(route.sourceNodeIds, fieldById, head.id, "route");
      if (route.sourceNodeIds.length > head.routeLimit) throw new Error(`${head.id} route exceeds its routeLimit`);
    } catch (error) {
      failures.push({ phase: "route", id: head.id, error: message(error) });
      return { head, routeResult: routed, phase: "route" as const, error };
    }
    const nodes = route.sourceNodeIds.map((id) => fieldById.get(id)!);
    try {
      const read = await driver.read({ stimulus: source.input.stimulus, head, nodes, route }, signal);
      const delta = ResidualHeadDeltaSchema.parse(read.value);
      assertUniqueSubset(delta.sourceNodeIds, new Map(nodes.map((node) => [node.id, node])), head.id, "read");
      return { head, route, delta, routeResult: routed, readResult: read };
    } catch (error) {
      failures.push({ phase: "read", id: head.id, error: message(error) });
      return { head, route, routeResult: routed, phase: "read" as const, error };
    }
  });

  const heads: ResidualHeadRecord[] = [];
  for (const outcome of outcomes) {
    if ("routeResult" in outcome && outcome.routeResult) {
      usage = addUsage(usage, outcome.routeResult.usage);
      routeRaw.push(outcome.routeResult.raw);
    }
    if (!("readResult" in outcome) || !outcome.readResult || !("delta" in outcome) || !outcome.delta || !("route" in outcome) || !outcome.route) continue;
    usage = addUsage(usage, outcome.readResult.usage);
    readRaw.push(outcome.readResult.raw);
    heads.push({
      id: outcome.head.id,
      instructions: outcome.head.instructions,
      route: outcome.route,
      routedLayers: [...new Set(outcome.route.sourceNodeIds.map((id) => fieldById.get(id)!.layer))].sort((left, right) => left - right),
      delta: outcome.delta,
    });
  }
  heads.sort((left, right) => left.id.localeCompare(right.id));

  let projection: ResidualProjection | undefined;
  let projectionRaw: unknown;
  if (heads.length >= 2) {
    try {
      const result = await driver.project({
        stimulus: source.input.stimulus,
        finalInstructions: spec.finalInstructions,
        heads,
        minProposals: spec.minProposals,
        maxProposals: spec.maxProposals,
      }, signal);
      projection = ResidualProjectionSchema.parse(result.value);
      assertProjection(projection, heads, spec);
      usage = addUsage(usage, result.usage);
      projectionRaw = result.raw;
    } catch (error) {
      failures.push({ phase: "project", id: "projection", error: message(error) });
    }
  }

  failures.sort((left, right) => `${left.phase}:${left.id}`.localeCompare(`${right.phase}:${right.id}`));
  const finishedAt = new Date();
  const status = projection ? (failures.length === 0 && heads.length === spec.heads.length ? "completed" : "partial") : "failed";
  return {
    version: "work-cell.residual-readout.v1",
    runId: randomUUID(),
    sourceRunId: source.runId,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    status,
    driver: driver.descriptor,
    spec,
    field: { nodes: field.length, nodesByLayer: countBy(field, (node) => String(node.layer)) },
    heads,
    ...(projection ? { projection } : {}),
    failures,
    usage,
    ...(spec.estimatedTokens ? {
      estimateAudit: {
        estimatedTokens: spec.estimatedTokens,
        actualTokens: usage.totalTokens,
        relativeError: Math.abs(usage.totalTokens - spec.estimatedTokens) / spec.estimatedTokens,
      },
    } : {}),
    raw: { routes: routeRaw, reads: readRaw, ...(projectionRaw === undefined ? {} : { projection: projectionRaw }) },
  };
}

export function buildResidualField(source: ActivationFieldRecord): ResidualNode[] {
  const receptors = new Map(source.input.receptors.map((receptor) => [receptor.id, receptor]));
  const nodes = new Map<string, ResidualNode>();
  for (const activation of source.activations) {
    const shape = receptors.get(activation.receptorId)?.shape;
    nodes.set(activation.id, {
      id: activation.id,
      layer: 0,
      content: `${activation.impulse}\nRelation: ${activation.relation}`,
      predictedConsequence: activation.predictedConsequence,
      rootActivationIds: [activation.id],
      ...(shape ? { shape } : {}),
    });
  }
  for (const layer of source.layers) {
    for (const coalition of layer) {
      const parents = coalition.parentIds.map((id) => nodes.get(id)).filter((node): node is ResidualNode => node !== undefined);
      if (parents.length !== coalition.parentIds.length) throw new Error(`${coalition.id} cannot reconstruct every parent`);
      nodes.set(coalition.id, {
        id: coalition.id,
        layer: coalition.layer,
        content: coalition.newRelation,
        predictedConsequence: coalition.predictedConsequence,
        rootActivationIds: [...new Set(parents.flatMap((parent) => parent.rootActivationIds))].sort(),
        ...(coalition.shape ? { shape: coalition.shape } : {}),
      });
    }
  }
  return [...nodes.values()].sort((left, right) => left.layer - right.layer || left.id.localeCompare(right.id));
}

function assertProjection(projection: ResidualProjection, heads: ResidualHeadRecord[], spec: ResidualReadoutSpec): void {
  if (projection.proposals.length < spec.minProposals || projection.proposals.length > spec.maxProposals) {
    throw new Error(`projection must return ${spec.minProposals}-${spec.maxProposals} proposals`);
  }
  const labels = projection.proposals.map((proposal) => proposal.label.trim().toLocaleLowerCase());
  if (new Set(labels).size !== labels.length) throw new Error("projection proposal labels must be unique");
  const headsById = new Map(heads.map((head) => [head.id, head]));
  for (const proposal of projection.proposals) {
    assertUniqueSubset(proposal.sourceHeadIds, headsById, proposal.label, "projection head");
    const allowedNodes = new Map(proposal.sourceHeadIds.flatMap((id) =>
      headsById.get(id)!.delta.sourceNodeIds.map((nodeId) => [nodeId, true] as const)));
    assertUniqueSubset(proposal.sourceNodeIds, allowedNodes, proposal.label, "projection node");
  }
}

function assertUniqueSubset<T>(ids: string[], allowed: Map<string, T>, owner: string, phase: string): void {
  if (new Set(ids).size !== ids.length) throw new Error(`${owner} ${phase} repeats a source ID`);
  const invalid = ids.filter((id) => !allowed.has(id));
  if (invalid.length) throw new Error(`${owner} ${phase} references unavailable sources: ${invalid.join(", ")}`);
}

function countBy<T>(values: T[], key: (value: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const id = key(value);
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
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
