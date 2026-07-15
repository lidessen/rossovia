import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { ActivationFieldRecord, FieldDriverResult } from "./activation-field";
import { ActivationFieldDriverError } from "./activation-field";
import type { CellUsage } from "../contracts";
import { mapConcurrent } from "../concurrency";
import { buildResidualField, type ResidualNode } from "./residual-readout";

const OperatorSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  instructions: z.string().min(1),
  count: z.number().int().min(1).max(16),
});

export const CandidateFieldSpecSchema = z.object({
  id: z.string().min(1),
  emitters: z.array(OperatorSchema).min(2).max(12),
  mutators: z.array(OperatorSchema).min(1).max(8),
  archives: z.array(z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    instructions: z.string().min(1),
    capacity: z.number().int().min(1).max(8),
    operatorIds: z.array(z.string().regex(/^[a-z][a-z0-9-]*$/)).min(1),
  })).min(2).max(8),
  seedRetrieval: z.object({
    randomSeed: z.string().min(1),
    shelfSize: z.number().int().min(4).max(32),
    selectCount: z.number().int().min(1).max(4),
    balancedParticipationSeats: z.number().int().min(0).max(1).default(0),
  }),
  inhibitions: z.array(z.string().min(1)).max(12).default([]),
  sourceNodesPerEmission: z.number().int().min(2).max(8).default(4),
  mutationParentCount: z.number().int().min(2).max(4).default(2),
  concurrency: z.number().int().min(1).max(64).default(16),
  estimatedTokens: z.number().int().positive().optional(),
}).superRefine((value, context) => {
  for (const [path, ids] of [
    ["emitters", value.emitters.map((entry) => entry.id)],
    ["mutators", value.mutators.map((entry) => entry.id)],
    ["archives", value.archives.map((entry) => entry.id)],
  ] as const) {
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", path: [path], message: `${path} IDs must be unique` });
    }
  }
  const operators = new Set([...value.emitters, ...value.mutators].map((entry) => entry.id));
  const archiveOperators = value.archives.flatMap((archive) => archive.operatorIds);
  const unknown = archiveOperators.filter((id) => !operators.has(id));
  if (unknown.length > 0) {
    context.addIssue({ code: "custom", path: ["archives"], message: `archive operator IDs are unknown: ${[...new Set(unknown)].join(", ")}` });
  }
  if (new Set(archiveOperators).size !== archiveOperators.length) {
    context.addIssue({ code: "custom", path: ["archives"], message: "archive operator partitions must not overlap" });
  }
  if (value.seedRetrieval.balancedParticipationSeats >= value.seedRetrieval.selectCount) {
    context.addIssue({
      code: "custom",
      path: ["seedRetrieval", "balancedParticipationSeats"],
      message: "balanced participation must preserve at least one Agent-selected title seat",
    });
  }
});

export const SeedLibraryEntrySchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  title: z.string().min(1),
}).strict();

export const SeedLibrarySchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  entries: z.array(SeedLibraryEntrySchema).min(8),
}).strict().superRefine((value, context) => {
  if (new Set(value.entries.map((entry) => entry.id)).size !== value.entries.length) {
    context.addIssue({ code: "custom", path: ["entries"], message: "seed library entry IDs must be unique" });
  }
  if (new Set(value.entries.map((entry) => entry.title)).size !== value.entries.length) {
    context.addIssue({ code: "custom", path: ["entries"], message: "seed library titles must be unique" });
  }
});

export const SeedActivationDraftSchema = z.object({
  titleIds: z.array(z.string().min(1)).min(1).max(4)
    .describe("IDs copied only from the supplied random title shelf"),
  resonance: z.string().min(1)
    .describe("The remembered or retrieved relation that activated these titles; not a fabricated exact quotation"),
});

export const SeedEvidenceSchema = z.object({
  titleId: z.string().min(1),
  provider: z.string().min(1),
  locator: z.string().min(1),
  sourceUrl: z.string().url(),
  excerpt: z.string().min(1).max(2_000),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

export const SeedSelectionSchema = SeedActivationDraftSchema.extend({
  basis: z.enum(["memory", "retrieval", "mixed"])
    .describe("Whether the activation came from fallible model memory, external retrieval, or both"),
  evidence: z.array(SeedEvidenceSchema).max(4),
}).superRefine((value, context) => {
  const selected = new Set(value.titleIds);
  const evidenceIds = value.evidence.map((entry) => entry.titleId);
  if (new Set(evidenceIds).size !== evidenceIds.length) {
    context.addIssue({ code: "custom", path: ["evidence"], message: "retrieval evidence title IDs must be unique" });
  }
  const unknown = evidenceIds.filter((id) => !selected.has(id));
  if (unknown.length > 0) {
    context.addIssue({ code: "custom", path: ["evidence"], message: `retrieval evidence is outside the selected titles: ${unknown.join(", ")}` });
  }
  if (value.basis === "memory" && value.evidence.length !== 0) {
    context.addIssue({ code: "custom", path: ["basis"], message: "memory activation cannot claim retrieval evidence" });
  }
  if (value.basis === "retrieval" && value.evidence.length !== value.titleIds.length) {
    context.addIssue({ code: "custom", path: ["basis"], message: "retrieval activation requires evidence for every selected title" });
  }
  if (value.basis === "mixed" && (value.evidence.length === 0 || value.evidence.length === value.titleIds.length)) {
    context.addIssue({ code: "custom", path: ["basis"], message: "mixed activation requires partial retrieval evidence" });
  }
});

export const CandidateDraftSchema = z.object({
  content: z.string().min(1).max(1_200),
});

export const ArchiveSelectionSchema = z.object({
  artifactIds: z.array(z.string().min(1)).min(1).max(8),
  contrast: z.string().min(1),
  rejectionSignal: z.string().min(1),
});

export type CandidateFieldSpec = z.infer<typeof CandidateFieldSpecSchema>;
export type SeedLibrary = z.infer<typeof SeedLibrarySchema>;
export type SeedLibraryEntry = z.infer<typeof SeedLibraryEntrySchema>;
export type SeedActivationDraft = z.infer<typeof SeedActivationDraftSchema>;
export type SeedEvidence = z.infer<typeof SeedEvidenceSchema>;
export type SeedSelection = z.infer<typeof SeedSelectionSchema>;
export type CandidateDraft = z.infer<typeof CandidateDraftSchema>;
export type ArchiveSelection = z.infer<typeof ArchiveSelectionSchema>;

export interface CandidateArtifact extends CandidateDraft {
  id: string;
  phase: "emit" | "mutate";
  operatorId: string;
  sourceNodeIds: string[];
  parentCandidateIds: string[];
  seedTitleIds: string[];
  participationTitleIds: string[];
  seedActivations: SeedSelection[];
}

export interface CandidateArchiveRecord {
  id: string;
  instructions: string;
  operatorIds: string[];
  artifactIds: string[];
  contrast: string;
  rejectionSignal: string;
}

export interface CandidateFieldDriver {
  readonly descriptor: { provider: string; model: string };
  retrieve(request: {
    stimulus: string;
    operator: CandidateFieldSpec["emitters"][number];
    sample: number;
    nodes: ResidualNode[];
    shelf: SeedLibraryEntry[];
    selectCount: number;
    requiredTitleIds: string[];
    randomSeed: string;
  }, signal?: AbortSignal): Promise<FieldDriverResult<SeedSelection>>;
  emit(request: {
    stimulus: string;
    operator: CandidateFieldSpec["emitters"][number];
    sample: number;
    nodes: ResidualNode[];
    seeds: SeedLibraryEntry[];
    activation: SeedSelection;
    inhibitions: string[];
  }, signal?: AbortSignal): Promise<FieldDriverResult<CandidateDraft>>;
  mutate(request: {
    stimulus: string;
    operator: CandidateFieldSpec["mutators"][number];
    sample: number;
    parents: CandidateArtifact[];
    inhibitions: string[];
  }, signal?: AbortSignal): Promise<FieldDriverResult<CandidateDraft>>;
  select(request: {
    stimulus: string;
    snapshot: string;
    archive: CandidateFieldSpec["archives"][number];
    candidates: Array<Pick<CandidateArtifact, "id" | "content">>;
    inhibitions: string[];
  }, signal?: AbortSignal): Promise<FieldDriverResult<ArchiveSelection>>;
}

export interface SeedMaterialRetriever {
  readonly descriptor: { provider: string };
  retrieve(request: {
    entry: SeedLibraryEntry;
    randomSeed: string;
  }, signal?: AbortSignal): Promise<SeedEvidence>;
}

export interface CandidateFieldRecord {
  version: "work-cell.candidate-field.v1";
  runId: string;
  sourceRunId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: "completed" | "partial" | "failed";
  driver: CandidateFieldDriver["descriptor"];
  spec: CandidateFieldSpec;
  seedLibrary: { id: string; version: string; entries: number };
  artifacts: CandidateArtifact[];
  archives: CandidateArchiveRecord[];
  failures: Array<{ phase: "retrieve" | "emit" | "mutate" | "archive"; id: string; error: string }>;
  stats: {
    emitted: number;
    mutated: number;
    uniqueContents: number;
    duplicateContents: number;
    mutationParentCoverage: number;
    archivedUniqueCandidates: number;
  };
  usage: CellUsage;
  usageByPhase: { retrieve: CellUsage; emit: CellUsage; mutate: CellUsage; archive: CellUsage };
  estimateAudit?: { estimatedTokens: number; actualTokens: number; relativeError: number };
  raw: { retrievals: unknown[]; emissions: unknown[]; mutations: unknown[]; archives: unknown[] };
}

export async function runCandidateField(
  source: ActivationFieldRecord,
  unparsedSpec: unknown,
  unparsedLibrary: unknown,
  driver: CandidateFieldDriver,
  signal?: AbortSignal,
): Promise<CandidateFieldRecord> {
  const spec = CandidateFieldSpecSchema.parse(unparsedSpec);
  const seedLibrary = SeedLibrarySchema.parse(unparsedLibrary);
  if (spec.seedRetrieval.shelfSize > seedLibrary.entries.length) {
    throw new Error(`seed shelf size ${spec.seedRetrieval.shelfSize} exceeds library size ${seedLibrary.entries.length}`);
  }
  if (spec.seedRetrieval.selectCount > spec.seedRetrieval.shelfSize) {
    throw new Error("seed selectCount cannot exceed shelfSize");
  }
  const field = buildResidualField(source);
  const startedAt = new Date();
  const failures: CandidateFieldRecord["failures"] = [];
  let retrieveUsage = emptyUsage();
  let emitUsage = emptyUsage();
  let mutateUsage = emptyUsage();
  let archiveUsage = emptyUsage();

  const emissionJobs = spec.emitters.flatMap((operator) =>
    Array.from({ length: operator.count }, (_, index) => ({ operator, sample: index + 1 })));
  const participationOrder = seededShelf(
    seedLibrary.entries,
    `${spec.seedRetrieval.randomSeed}:balanced-participation`,
    seedLibrary.entries.length,
  );
  const retrievalOutcomes = await mapConcurrent(emissionJobs, spec.concurrency, async (job, index) => {
    const id = `e-${String(index + 1).padStart(4, "0")}`;
    const nodes = sampleResidualNodes(field, index, spec.sourceNodesPerEmission);
    const requiredTitles = spec.seedRetrieval.balancedParticipationSeats === 1
      ? [participationOrder[index % participationOrder.length]!]
      : [];
    const shelf = seededShelfWithRequired(
      seedLibrary.entries,
      `${spec.seedRetrieval.randomSeed}:${job.operator.id}:${job.sample}`,
      spec.seedRetrieval.shelfSize,
      requiredTitles,
    );
    try {
      const result = await driver.retrieve({
        stimulus: source.input.stimulus,
        operator: job.operator,
        sample: job.sample,
        nodes,
        shelf,
        selectCount: spec.seedRetrieval.selectCount,
        requiredTitleIds: requiredTitles.map((entry) => entry.id),
        randomSeed: `${spec.seedRetrieval.randomSeed}:${job.operator.id}:${job.sample}`,
      }, signal);
      let selection: SeedSelection;
      try {
        selection = SeedSelectionSchema.parse(result.value);
        assertSeedSelection(
          selection,
          shelf,
          spec.seedRetrieval.selectCount,
          requiredTitles.map((entry) => entry.id),
          id,
        );
      } catch (error) {
        throw new ActivationFieldDriverError(message(error), result.usage, result.raw);
      }
      const selected = selection.titleIds.map((entryId) => shelf.find((entry) => entry.id === entryId)!);
      return { id, job, nodes, shelf, requiredTitles, selected, selection, result };
    } catch (error) {
      failures.push({ phase: "retrieve", id, error: message(error) });
      return { id, job, nodes, shelf, requiredTitles, error };
    }
  });

  const retrievalRaw: unknown[] = [];
  for (const outcome of retrievalOutcomes) {
    if (!("result" in outcome) || !outcome.result) {
      const retained = usageFromError(outcome.error);
      retrieveUsage = addUsage(retrieveUsage, retained.usage);
      if (retained.raw !== undefined) retrievalRaw.push(retained.raw);
      continue;
    }
    retrieveUsage = addUsage(retrieveUsage, outcome.result.usage);
    retrievalRaw.push({ selection: outcome.selection, provider: outcome.result.raw });
  }

  const emissionOutcomes = await mapConcurrent(retrievalOutcomes.filter((outcome) => "selected" in outcome), spec.concurrency, async (retrieved) => {
    const { id, job, nodes, requiredTitles, selected, selection } = retrieved as Extract<typeof retrievalOutcomes[number], {
      requiredTitles: SeedLibraryEntry[];
      selected: SeedLibraryEntry[];
      selection: SeedSelection;
    }>;
    try {
      const result = await driver.emit({
        stimulus: source.input.stimulus,
        operator: job.operator,
        sample: job.sample,
        nodes,
        seeds: selected,
        activation: selection,
        inhibitions: spec.inhibitions,
      }, signal);
      return { id, job, nodes, requiredTitles, selected, selection, result, draft: CandidateDraftSchema.parse(result.value) };
    } catch (error) {
      failures.push({ phase: "emit", id, error: message(error) });
      return { id, job, nodes, requiredTitles, selected, selection, error };
    }
  });

  const emissions: CandidateArtifact[] = [];
  const emissionRaw: unknown[] = [];
  for (const outcome of emissionOutcomes) {
    if (!("result" in outcome) || !outcome.result || !("draft" in outcome) || !outcome.draft) {
      const retained = usageFromError(outcome.error);
      emitUsage = addUsage(emitUsage, retained.usage);
      if (retained.raw !== undefined) emissionRaw.push(retained.raw);
      continue;
    }
    emitUsage = addUsage(emitUsage, outcome.result.usage);
    emissionRaw.push(outcome.result.raw);
    emissions.push({
      id: outcome.id,
      ...outcome.draft,
      phase: "emit",
      operatorId: outcome.job.operator.id,
      sourceNodeIds: outcome.nodes.map((node) => node.id),
      parentCandidateIds: [],
      seedTitleIds: outcome.selected.map((entry) => entry.id),
      participationTitleIds: outcome.requiredTitles.map((entry) => entry.id),
      seedActivations: [outcome.selection],
    });
  }

  const mutationJobs = spec.mutators.flatMap((operator) =>
    Array.from({ length: operator.count }, (_, index) => ({ operator, sample: index + 1 })));
  const mutationOutcomes = await mapConcurrent(mutationJobs, spec.concurrency, async (job, index) => {
    const id = `m-${String(index + 1).padStart(4, "0")}`;
    try {
      const parents = selectMutationParents(emissions, index, spec.mutationParentCount);
      const result = await driver.mutate({
        stimulus: source.input.stimulus,
        operator: job.operator,
        sample: job.sample,
        parents,
        inhibitions: spec.inhibitions,
      }, signal);
      const draft = CandidateDraftSchema.parse(result.value);
      if (parents.some((parent) => normalizeContent(parent.content) === normalizeContent(draft.content))) {
        throw new ActivationFieldDriverError(
          `${id} repeated a parent artifact instead of transforming it`,
          result.usage,
          result.raw,
        );
      }
      return { id, job, parents, result, draft };
    } catch (error) {
      failures.push({ phase: "mutate", id, error: message(error) });
      return { id, job, error };
    }
  });

  const mutations: CandidateArtifact[] = [];
  const mutationRaw: unknown[] = [];
  for (const outcome of mutationOutcomes) {
    if (!("result" in outcome) || !outcome.result || !("draft" in outcome) || !outcome.draft || !("parents" in outcome) || !outcome.parents) {
      const retained = usageFromError(outcome.error);
      mutateUsage = addUsage(mutateUsage, retained.usage);
      if (retained.raw !== undefined) mutationRaw.push(retained.raw);
      continue;
    }
    mutateUsage = addUsage(mutateUsage, outcome.result.usage);
    mutationRaw.push(outcome.result.raw);
    mutations.push({
      id: outcome.id,
      ...outcome.draft,
      phase: "mutate",
      operatorId: outcome.job.operator.id,
      parentCandidateIds: outcome.parents.map((parent) => parent.id),
      sourceNodeIds: [...new Set(outcome.parents.flatMap((parent) => parent.sourceNodeIds))].sort(),
      seedTitleIds: [...new Set(outcome.parents.flatMap((parent) => parent.seedTitleIds))].sort(),
      participationTitleIds: [...new Set(outcome.parents.flatMap((parent) => parent.participationTitleIds))].sort(),
      seedActivations: uniqueSeedActivations(outcome.parents.flatMap((parent) => parent.seedActivations)),
    });
  }

  const artifacts = [...emissions, ...mutations];
  const selectable = uniqueArtifacts(artifacts);
  const archiveOutcomes = await mapConcurrent(spec.archives, spec.concurrency, async (archive) => {
    try {
      const eligible = selectable.filter((candidate) => archive.operatorIds.includes(candidate.operatorId));
      if (eligible.length < archive.capacity) throw new Error(`only ${eligible.length} unique artifacts are available for capacity ${archive.capacity}`);
      const result = await driver.select({
        stimulus: source.input.stimulus,
        snapshot: source.input.snapshot,
        archive,
        candidates: eligible.map(({ id, content }) => ({ id, content })),
        inhibitions: spec.inhibitions,
      }, signal);
      const selection = ArchiveSelectionSchema.parse(result.value);
      assertArchiveSelection(selection, eligible, archive);
      return { archive, result, selection };
    } catch (error) {
      failures.push({ phase: "archive", id: archive.id, error: message(error) });
      return { archive, error };
    }
  });

  const archives: CandidateArchiveRecord[] = [];
  const archiveRaw: unknown[] = [];
  for (const outcome of archiveOutcomes) {
    if (!("result" in outcome) || !outcome.result || !("selection" in outcome) || !outcome.selection) {
      const retained = usageFromError(outcome.error);
      archiveUsage = addUsage(archiveUsage, retained.usage);
      if (retained.raw !== undefined) archiveRaw.push(retained.raw);
      continue;
    }
    archiveUsage = addUsage(archiveUsage, outcome.result.usage);
    archiveRaw.push(outcome.result.raw);
    archives.push({
      id: outcome.archive.id,
      instructions: outcome.archive.instructions,
      operatorIds: outcome.archive.operatorIds,
      ...outcome.selection,
    });
  }
  archives.sort((left, right) => left.id.localeCompare(right.id));
  failures.sort((left, right) => `${left.phase}:${left.id}`.localeCompare(`${right.phase}:${right.id}`));

  const normalized = artifacts.map((artifact) => normalizeContent(artifact.content));
  const mutationParents = new Set(mutations.flatMap((artifact) => artifact.parentCandidateIds));
  const archived = new Set(archives.flatMap((archive) => archive.artifactIds));
  const usage = addUsage(addUsage(addUsage(retrieveUsage, emitUsage), mutateUsage), archiveUsage);
  const finishedAt = new Date();
  const status = archives.length === spec.archives.length && failures.length === 0
    ? "completed"
    : artifacts.length > 0 && archives.length > 0 ? "partial" : "failed";
  return {
    version: "work-cell.candidate-field.v1",
    runId: randomUUID(),
    sourceRunId: source.runId,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    status,
    driver: driver.descriptor,
    spec,
    seedLibrary: { id: seedLibrary.id, version: seedLibrary.version, entries: seedLibrary.entries.length },
    artifacts,
    archives,
    failures,
    stats: {
      emitted: emissions.length,
      mutated: mutations.length,
      uniqueContents: new Set(normalized).size,
      duplicateContents: normalized.length - new Set(normalized).size,
      mutationParentCoverage: emissions.length === 0 ? 0 : mutationParents.size / emissions.length,
      archivedUniqueCandidates: archived.size,
    },
    usage,
    usageByPhase: { retrieve: retrieveUsage, emit: emitUsage, mutate: mutateUsage, archive: archiveUsage },
    ...(spec.estimatedTokens ? {
      estimateAudit: {
        estimatedTokens: spec.estimatedTokens,
        actualTokens: usage.totalTokens,
        relativeError: Math.abs(usage.totalTokens - spec.estimatedTokens) / spec.estimatedTokens,
      },
    } : {}),
    raw: { retrievals: retrievalRaw, emissions: emissionRaw, mutations: mutationRaw, archives: archiveRaw },
  };
}

function sampleResidualNodes(field: ResidualNode[], index: number, count: number): ResidualNode[] {
  const grouped = [...groupBy(field, (node) => node.layer).entries()].sort(([left], [right]) => left - right);
  if (grouped.length === 0) throw new Error("candidate field requires residual nodes");
  const selected: ResidualNode[] = [];
  for (let offset = 0; selected.length < count && offset < count * grouped.length * 2; offset += 1) {
    const [, nodes] = grouped[(index + offset) % grouped.length]!;
    const node = nodes[(index * 7 + offset * 5) % nodes.length]!;
    if (!selected.some((entry) => entry.id === node.id)) selected.push(node);
  }
  if (selected.length < count) throw new Error(`cannot select ${count} distinct residual nodes`);
  return selected;
}

function selectMutationParents(artifacts: CandidateArtifact[], index: number, count: number): CandidateArtifact[] {
  const groups = [...groupBy(artifacts, (artifact) => artifact.operatorId).values()].filter((group) => group.length > 0);
  if (groups.length < count) throw new Error(`mutation requires ${count} distinct emitter operators`);
  return Array.from({ length: count }, (_, offset) => {
    const group = groups[(index + offset * 3) % groups.length]!;
    return group[(Math.floor(index / groups.length) + offset * 5) % group.length]!;
  });
}

function uniqueArtifacts(artifacts: CandidateArtifact[]): CandidateArtifact[] {
  const seen = new Set<string>();
  return artifacts.filter((artifact) => {
    const normalized = normalizeContent(artifact.content);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function uniqueSeedActivations(activations: SeedSelection[]): SeedSelection[] {
  const seen = new Set<string>();
  return activations.filter((activation) => {
    const key = JSON.stringify(activation);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function assertArchiveSelection(
  selection: ArchiveSelection,
  candidates: CandidateArtifact[],
  archive: CandidateFieldSpec["archives"][number],
): void {
  if (selection.artifactIds.length !== archive.capacity) {
    throw new Error(`${archive.id} must select exactly ${archive.capacity} candidates`);
  }
  if (new Set(selection.artifactIds).size !== selection.artifactIds.length) {
    throw new Error(`${archive.id} repeats an artifact ID`);
  }
  const available = new Set(candidates.map((candidate) => candidate.id));
  const invalid = selection.artifactIds.filter((id) => !available.has(id));
  if (invalid.length > 0) throw new Error(`${archive.id} selected unavailable artifacts: ${invalid.join(", ")}`);
}

function normalizeContent(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function seededShelf(entries: SeedLibraryEntry[], seed: string, count: number): SeedLibraryEntry[] {
  return [...entries]
    .map((entry) => ({ entry, rank: createHash("sha256").update(`${seed}:${entry.id}`).digest("hex") }))
    .sort((left, right) => left.rank.localeCompare(right.rank))
    .slice(0, count)
    .map(({ entry }) => entry);
}

function seededShelfWithRequired(
  entries: SeedLibraryEntry[],
  seed: string,
  count: number,
  required: SeedLibraryEntry[],
): SeedLibraryEntry[] {
  const requiredIds = new Set(required.map((entry) => entry.id));
  return [
    ...required,
    ...seededShelf(entries.filter((entry) => !requiredIds.has(entry.id)), seed, count - required.length),
  ];
}

function assertSeedSelection(
  selection: SeedSelection,
  shelf: SeedLibraryEntry[],
  count: number,
  requiredTitleIds: string[],
  id: string,
): void {
  if (selection.titleIds.length !== count) throw new Error(`${id} must activate exactly ${count} title entries`);
  if (new Set(selection.titleIds).size !== selection.titleIds.length) throw new Error(`${id} repeats a title entry`);
  const available = new Set(shelf.map((entry) => entry.id));
  const invalid = selection.titleIds.filter((entryId) => !available.has(entryId));
  if (invalid.length > 0) throw new Error(`${id} activated title IDs outside its shelf: ${invalid.join(", ")}`);
  const selected = new Set(selection.titleIds);
  const omitted = requiredTitleIds.filter((entryId) => !selected.has(entryId));
  if (omitted.length > 0) throw new Error(`${id} omitted balanced participation titles: ${omitted.join(", ")}`);
}

function groupBy<T, K>(values: T[], key: (value: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const value of values) {
    const id = key(value);
    const group = groups.get(id);
    if (group) group.push(value);
    else groups.set(id, [value]);
  }
  return groups;
}

function usageFromError(error: unknown): { usage: CellUsage; raw?: unknown } {
  return error instanceof ActivationFieldDriverError
    ? { usage: error.usage, ...(error.raw === undefined ? {} : { raw: error.raw }) }
    : { usage: emptyUsage() };
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
