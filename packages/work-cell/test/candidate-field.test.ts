import { expect, test } from "bun:test";
import type { ActivationFieldRecord, FieldDriverResult } from "../src/research/activation-field";
import {
  runCandidateField,
  type ArchiveSelection,
  type CandidateDraft,
  type CandidateFieldDriver,
  type SeedSelection,
} from "../src/research/candidate-field";
import type { CellUsage } from "../src/contracts";

test("candidate field branches at the artifact level and retains mutation and archive provenance", async () => {
  const record = await runCandidateField(sourceRecord(), spec(), seedLibrary(), new DeterministicCandidateDriver());

  expect(record.status).toBe("completed");
  expect(record.stats).toEqual({
    emitted: 4,
    mutated: 2,
    uniqueContents: 6,
    duplicateContents: 0,
    mutationParentCoverage: 1,
    archivedUniqueCandidates: 4,
  });
  expect(record.artifacts.filter((artifact) => artifact.phase === "mutate").map((artifact) => artifact.parentCandidateIds)).toEqual([
    ["e-0001", "e-0004"],
    ["e-0003", "e-0002"],
  ]);
  expect(record.artifacts.find((artifact) => artifact.id === "m-0001")!.sourceNodeIds.length).toBeGreaterThan(2);
  expect(record.archives).toHaveLength(2);
  expect(record.artifacts.every((artifact) => !("kind" in artifact))).toBe(true);
  expect(record.artifacts[0]!.seedTitleIds).toHaveLength(2);
  expect(record.artifacts[0]!.seedActivations).toEqual([{
    titleIds: record.artifacts[0]!.seedTitleIds,
    basis: "memory",
    resonance: "an oblique remembered relation",
    evidence: [],
  }]);
  const emissions = record.artifacts.filter((artifact) => artifact.phase === "emit");
  expect(emissions.every((artifact) => artifact.participationTitleIds.length === 1)).toBe(true);
  expect(new Set(emissions.flatMap((artifact) => artifact.participationTitleIds)).size).toBe(4);
  expect(record.usage.totalTokens).toBe(12);
});

test("candidate archive fails closed when a selector invents an unavailable artifact", async () => {
  const record = await runCandidateField(sourceRecord(), spec(), seedLibrary(), new FabricatingArchiveDriver());

  expect(record.status).toBe("failed");
  expect(record.archives).toHaveLength(0);
  expect(record.failures.map((failure) => failure.phase)).toEqual(["archive", "archive"]);
  expect(record.failures.every((failure) => failure.error.includes("unavailable artifacts"))).toBe(true);
});

test("candidate mutation does not count an unchanged parent as creative branching", async () => {
  const record = await runCandidateField(sourceRecord(), spec(), seedLibrary(), new RepeatingMutationDriver());

  expect(record.stats.mutated).toBe(0);
  expect(record.failures.filter((failure) => failure.phase === "mutate")).toHaveLength(2);
  expect(record.failures.some((failure) => failure.error.includes("instead of transforming"))).toBe(true);
});

test("source shelves replay one random seed while a different seed changes available material", async () => {
  const driver = new DeterministicCandidateDriver();
  const first = await runCandidateField(sourceRecord(), spec(), seedLibrary(), driver);
  const replay = await runCandidateField(sourceRecord(), spec(), seedLibrary(), driver);
  const changed = await runCandidateField(sourceRecord(), {
    ...spec(),
    seedRetrieval: { ...spec().seedRetrieval, randomSeed: "different-seed" },
  }, seedLibrary(), driver);

  const sources = (record: typeof first) => record.artifacts
    .filter((artifact) => artifact.phase === "emit")
    .map((artifact) => artifact.seedTitleIds);
  expect(sources(replay)).toEqual(sources(first));
  expect(sources(changed)).not.toEqual(sources(first));
});

test("title catalogs reject embedded excerpts and descriptions", async () => {
  const library = seedLibrary();
  const withExcerpt = {
    ...library,
    entries: library.entries.map((entry, index) => index === 0 ? { ...entry, content: "embedded source text" } : entry),
  };

  expect(runCandidateField(sourceRecord(), spec(), withExcerpt, new DeterministicCandidateDriver()))
    .rejects.toThrow("Unrecognized key");
});

test("balanced participation fails closed when a selector omits its reserved title", async () => {
  const record = await runCandidateField(sourceRecord(), spec(), seedLibrary(), new IgnoringParticipationDriver());

  expect(record.status).toBe("failed");
  const failures = record.failures.filter((failure) => failure.phase === "retrieve");
  expect(failures).toHaveLength(4);
  expect(failures.every((failure) => failure.error.includes("omitted balanced participation titles"))).toBe(true);
});

class DeterministicCandidateDriver implements CandidateFieldDriver {
  readonly descriptor = { provider: "test", model: "deterministic" };

  async retrieve(request: Parameters<CandidateFieldDriver["retrieve"]>[0]): Promise<FieldDriverResult<SeedSelection>> {
    return {
      value: { titleIds: request.shelf.slice(0, request.selectCount).map((entry) => entry.id), basis: "memory", resonance: "an oblique remembered relation", evidence: [] },
      usage: usage(),
    };
  }

  async emit(request: Parameters<CandidateFieldDriver["emit"]>[0]): Promise<FieldDriverResult<CandidateDraft>> {
    if (request.sample === 1) await Bun.sleep(2);
    return { value: { content: `${request.operator.id}-${request.sample}: an unrestricted associative object` }, usage: usage() };
  }

  async mutate(request: Parameters<CandidateFieldDriver["mutate"]>[0]): Promise<FieldDriverResult<CandidateDraft>> {
    return { value: { content: `${request.operator.id}-${request.sample}: transformed object` }, usage: usage() };
  }

  async select(request: Parameters<CandidateFieldDriver["select"]>[0]): Promise<FieldDriverResult<ArchiveSelection>> {
    const artifactIds = request.archive.id === "aesthetic"
      ? request.candidates.slice(0, request.archive.capacity).map((candidate) => candidate.id)
      : request.candidates.slice(-request.archive.capacity).map((candidate) => candidate.id);
    return {
      value: { artifactIds, contrast: "different objects survive", rejectionSignal: "the objects become interchangeable" },
      usage: usage(),
    };
  }
}

class FabricatingArchiveDriver extends DeterministicCandidateDriver {
  override async select(): Promise<FieldDriverResult<ArchiveSelection>> {
    return {
      value: { artifactIds: ["missing", "e-0001"], contrast: "fabricated", rejectionSignal: "missing source" },
      usage: usage(),
    };
  }
}

class RepeatingMutationDriver extends DeterministicCandidateDriver {
  override async mutate(request: Parameters<CandidateFieldDriver["mutate"]>[0]): Promise<FieldDriverResult<CandidateDraft>> {
    return { value: { content: request.parents[0]!.content }, usage: usage() };
  }
}

class IgnoringParticipationDriver extends DeterministicCandidateDriver {
  override async retrieve(request: Parameters<CandidateFieldDriver["retrieve"]>[0]): Promise<FieldDriverResult<SeedSelection>> {
    return {
      value: {
        titleIds: request.shelf.slice(-request.selectCount).map((entry) => entry.id),
        basis: "memory",
        resonance: "ignores the reserved participation title",
        evidence: [],
      },
      usage: usage(),
    };
  }
}

function spec() {
  return {
    id: "candidate-field-test",
    emitters: [
      { id: "sound", instructions: "Begin with sound.", count: 2 },
      { id: "image", instructions: "Begin with image.", count: 2 },
    ],
    mutators: [{ id: "collision", instructions: "Collide two surfaces.", count: 2 }],
    archives: [
      { id: "aesthetic", instructions: "Preserve aesthetic force.", capacity: 2, operatorIds: ["sound"] },
      { id: "durable", instructions: "Preserve durable handles.", capacity: 2, operatorIds: ["image", "collision"] },
    ],
    seedRetrieval: { randomSeed: "test-seed", shelfSize: 4, selectCount: 2, balancedParticipationSeats: 1 },
    inhibitions: ["literal repair vocabulary"],
    sourceNodesPerEmission: 3,
    mutationParentCount: 2,
    concurrency: 4,
    estimatedTokens: 12,
  };
}

function seedLibrary() {
  return {
    id: "test-library",
    version: "1",
    entries: Array.from({ length: 8 }, (_, index) => ({
      id: `source-${index + 1}`,
      title: `Source ${index + 1}`,
    })),
  };
}

function sourceRecord(): ActivationFieldRecord {
  return {
    version: "work-cell.activation-field.v1",
    runId: "source-run",
    startedAt: "2026-07-13T00:00:00.000Z",
    finishedAt: "2026-07-13T00:00:01.000Z",
    durationMs: 1_000,
    status: "completed",
    driver: { provider: "test", model: "source" },
    input: {
      id: "source",
      stimulus: "Find a project name.",
      snapshot: "A concrete project source.",
      receptors: [
        { id: "r1", instructions: "one", principlePids: [] },
        { id: "r2", instructions: "two", principlePids: [] },
      ],
      activationCount: 4,
      concurrency: 2,
      groupSize: 4,
      workingSetSize: 2,
      maxLayers: 2,
      layerWidths: [2, 2],
      propagateShapes: false,
    },
    activations: [1, 2, 3, 4].map((number) => ({
      id: `a-${String(number).padStart(4, "0")}`,
      receptorId: number % 2 ? "r1" : "r2",
      principlePids: [],
      sample: number,
      impulse: `impulse ${number}`,
      relation: `relation ${number}`,
      predictedConsequence: `consequence ${number}`,
      disconfirmingObservation: `disconfirm ${number}`,
    })),
    layers: [
      [
        { id: "c-1-001", layer: 1, group: 1, parentIds: ["a-0001", "a-0002"], newRelation: "first pair", tensions: [], predictedConsequence: "first" },
        { id: "c-1-002", layer: 1, group: 2, parentIds: ["a-0003", "a-0004"], newRelation: "second pair", tensions: [], predictedConsequence: "second" },
      ],
      [
        { id: "c-2-001", layer: 2, group: 1, parentIds: ["c-1-001", "c-1-002"], newRelation: "combined", tensions: [], predictedConsequence: "all" },
      ],
    ],
    workingSet: [{ id: "c-2-001", content: "combined", predictedConsequence: "all", rootActivationIds: ["a-0001", "a-0002", "a-0003", "a-0004"] }],
    expression: { response: "control", sourceNodeIds: ["c-2-001"], emergentRelations: [], unresolvedTensions: [] },
    failures: [],
    usage: usage(),
    usageByPhase: { activation: usage(), integration: usage(), expression: usage() },
    raw: { activations: [], integrations: [] },
  };
}

function usage(): CellUsage {
  return { inputTokens: 1, outputTokens: 0, totalTokens: 1, cachedInputTokens: 0 };
}
