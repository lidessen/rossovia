import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import { z } from "zod";
import type { CandidateArtifact, CandidateFieldRecord } from "./candidate-field";
import type { CellUsage } from "../contracts";
import { normalizeAiSdkUsage as normalizeUsage } from "../ai-sdk-usage";
import {
  createValidationModel,
  requireValidationConfiguration,
  validationModelName,
  validationProviderName,
} from "../validation-model";

(globalThis as typeof globalThis & { AI_SDK_LOG_WARNINGS?: boolean }).AI_SDK_LOG_WARNINGS = false;

const ProbeManifestSchema = z.object({
  id: z.string().min(1),
  root: z.string().min(1),
  outputDir: z.string().min(1),
  sources: z.array(z.object({
    path: z.string().min(1),
    maxChars: z.number().int().positive(),
  })).min(1),
  namingExpressionProbe: z.object({
    candidateLimit: z.number().int().min(1).max(12),
    materialPerOperator: z.number().int().min(1).max(4),
    randomSeed: z.string().min(1),
    estimatedTokens: z.number().int().positive(),
  }),
});

const CandidateEnvelopeSchema = z.object({
  record: z.custom<CandidateFieldRecord>((value) => {
    const record = value as Partial<CandidateFieldRecord> | null;
    return record?.version === "work-cell.candidate-field.v1" && Array.isArray(record.artifacts);
  }),
});

const NamingCandidateSchema = z.object({
  name: z.string().min(1).max(80),
  spokenForm: z.string().min(1).max(120),
  formationPath: z.string().min(1).max(400),
  plainRelation: z.string().min(1).max(500),
  risk: z.string().min(1).max(300),
  relationIndexes: z.array(z.number().int().positive()).max(3),
});

const NamingSetSchema = z.object({
  disposition: z.enum(["candidates", "all-rejected"]),
  candidates: z.array(NamingCandidateSchema).max(12),
  observation: z.string().min(1).max(500),
}).superRefine((value, context) => {
  if (value.disposition === "all-rejected" && value.candidates.length > 0) {
    context.addIssue({ code: "custom", path: ["candidates"], message: "all-rejected requires an empty candidate list" });
  }
  if (value.disposition === "candidates" && value.candidates.length === 0) {
    context.addIssue({ code: "custom", path: ["candidates"], message: "candidates disposition requires at least one candidate" });
  }
});

export interface NamingExpressionResult extends z.infer<typeof NamingSetSchema> {}

const ProjectionRelationSchema = z.object({
  relation: z.string().min(1).max(500),
  boundary: z.string().min(1).max(300),
  materialIndexes: z.array(z.number().int().positive()).min(1).max(4),
});

const ProjectionRelationsSchema = z.object({
  relations: z.array(ProjectionRelationSchema).max(6),
});

type ProjectionRelation = z.infer<typeof ProjectionRelationSchema>;

export function selectProjectionMaterial(
  artifacts: CandidateArtifact[],
  perOperator: number,
  randomSeed: string,
): CandidateArtifact[] {
  const grouped = new Map<string, CandidateArtifact[]>();
  for (const artifact of artifacts) {
    const entries = grouped.get(artifact.operatorId) ?? [];
    entries.push(artifact);
    grouped.set(artifact.operatorId, entries);
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([operatorId, entries]) => entries
      .toSorted((left, right) => seededRank(randomSeed, operatorId, left.id).localeCompare(seededRank(randomSeed, operatorId, right.id)))
      .slice(0, perOperator));
}

if (import.meta.main) {
  await main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  });
}

async function main(args: string[]): Promise<void> {
  const candidateArg = args[0];
  const manifestArg = args[1];
  if (!candidateArg || !manifestArg) {
    throw new Error("usage: bun src/research/naming-expression-probe.ts <candidate-field.json> <manifest.json>");
  }
  requireValidationConfiguration("a live naming-expression probe");

  const candidatePath = resolve(candidateArg);
  const candidateContent = await readFile(candidatePath, "utf8");
  const candidateRecord = CandidateEnvelopeSchema.parse(JSON.parse(candidateContent)).record;
  const manifestPath = resolve(manifestArg);
  const manifest = ProbeManifestSchema.parse(JSON.parse(await readFile(manifestPath, "utf8")));
  const root = isAbsolute(manifest.root) ? manifest.root : resolve(dirname(manifestPath), manifest.root);
  const snapshotParts: string[] = [];
  const sourceEvidence: Array<{ path: string; sha256: string; includedChars: number }> = [];
  for (const source of manifest.sources) {
    const path = resolve(root, source.path);
    const content = await readFile(path, "utf8");
    const excerpt = content.slice(0, source.maxChars);
    snapshotParts.push(`## ${source.path}\n\n${excerpt}`);
    sourceEvidence.push({
      path: source.path,
      sha256: createHash("sha256").update(content).digest("hex"),
      includedChars: excerpt.length,
    });
  }

  const material = selectProjectionMaterial(
    candidateRecord.artifacts,
    manifest.namingExpressionProbe.materialPerOperator,
    manifest.namingExpressionProbe.randomSeed,
  );
  if (material.length === 0) throw new Error("candidate field contains no projection material");
  const snapshot = snapshotParts.join("\n\n");
  const modelId = "deepseek-v4-flash";
  const selection = createValidationModel({ model: modelId });
  const model = selection.model;
  const startedAt = new Date();
  const relationProjection = await extractProjectionRelations({ model, snapshot, material });
  const [direct, projected] = await Promise.all([
    generatePrivateNamingSet({
      model,
      snapshot,
      limit: manifest.namingExpressionProbe.candidateLimit,
    }),
    generatePrivateNamingSet({
      model,
      snapshot,
      limit: manifest.namingExpressionProbe.candidateLimit,
      relations: relationProjection.output.relations,
    }),
  ]);
  assertNamingSet(direct.output, manifest.namingExpressionProbe.candidateLimit, 0);
  assertNamingSet(projected.output, manifest.namingExpressionProbe.candidateLimit, relationProjection.output.relations.length);
  const finishedAt = new Date();
  const runId = randomUUID();
  const usage = addUsage(relationProjection.usage, addUsage(direct.usage, projected.usage));
  const outputRoot = resolve(root, manifest.outputDir, manifest.id);
  await mkdir(outputRoot, { recursive: true });
  const output = resolve(outputRoot, `naming-expression-${runId}.json`);
  const envelope = {
    version: "work-cell.naming-expression-probe.v3",
    runId,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    driver: {
      provider: validationProviderName(selection),
      model: validationModelName(selection),
    },
    sourceEvidence,
    candidateField: {
      path: candidatePath,
      sha256: createHash("sha256").update(candidateContent).digest("hex"),
      runId: candidateRecord.runId,
      materialArtifactIds: material.map((artifact) => artifact.id),
      materialByOperator: Object.fromEntries([...new Set(material.map((artifact) => artifact.operatorId))].sort().map((operatorId) => [
        operatorId,
        material.filter((artifact) => artifact.operatorId === operatorId).map((artifact) => artifact.id),
      ])),
      projectedRelations: relationProjection.output.relations,
    },
    treatment: {
      direct: direct.output,
      projected: projected.output,
    },
    usageByTreatment: { relationProjection: relationProjection.usage, direct: direct.usage, projected: projected.usage },
    usage,
    estimateAudit: {
      estimatedTokens: manifest.namingExpressionProbe.estimatedTokens,
      actualTokens: usage.totalTokens,
      relativeError: Math.abs(usage.totalTokens - manifest.namingExpressionProbe.estimatedTokens) / manifest.namingExpressionProbe.estimatedTokens,
    },
    authority: "private generation evidence; candidates require an independent surface gate before human review",
  };
  await writeFile(output, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    output,
    durationMs: envelope.durationMs,
    materialArtifacts: material.length,
    materialOperators: new Set(material.map((artifact) => artifact.operatorId)).size,
    usage,
    estimateAudit: envelope.estimateAudit,
  }, null, 2));
}

async function generatePrivateNamingSet(input: {
  model: ReturnType<typeof createValidationModel>["model"];
  snapshot: string;
  limit: number;
  relations?: ProjectionRelation[];
}): Promise<{ output: NamingExpressionResult; usage: CellUsage }> {
  const hasRelations = input.relations !== undefined;
  return runStructuredProbe((correction) => generateText({
    model: input.model,
    instructions: [
      "You privately form possible names for one actual long-lived open-source project. This is generation evidence, not a human review packet or naming decision.",
      "Creativity is a true relation made memorable, not maximal distance from ordinary language. Associative fragments are private inputs, never public candidates merely because they are novel.",
      "A name may be borrowed, transformed, translated, compressed, inverted, invented, culturally rooted, or found through a private association. No language, length, cultural register, or formation path is preferred in advance.",
      "A person should be able to speak the name before hearing its story. The story may deepen the name but must not rescue an awkward surface.",
      "Do not repeat one formation template across the set. Reject a surface that merely paraphrases the mission, displays cultural or linguistic cleverness, or needs its explanation to become acceptable.",
      hasRelations
        ? "Private plain relations follow. They have already been separated from associative surfaces. A relation may influence formation, but do not copy its nouns, images, or sentence fragments into a name. Discard every relation if none becomes natural."
        : "No projected relation is available. Set every relationIndexes field to an empty array.",
      `Return at most ${input.limit} candidates that survive these boundaries; do not aim to use the limit. If none survive, return disposition all-rejected with an empty candidates list. Otherwise return disposition candidates. Explain each surviving relation and risk in one plain sentence. Do not recommend or adopt a winner.`,
      ...(correction ? ["## Structured-output correction", correction] : []),
    ].join("\n"),
    prompt: [
      "## Project source",
      input.snapshot,
      "## Concrete naming problem",
      "Find a durable project name for this whole project. Recover the relation before the word. The project seeks to make advanced AI production capability governable, inspectable, replaceable, and broadly usable rather than captured by a few firms. Its name must survive implementation changes and leave room for the project to grow.",
      ...(hasRelations ? [
        "## Private projected relations",
        JSON.stringify(input.relations!.map((relation, index) => ({ index: index + 1, relation: relation.relation, boundary: relation.boundary }))),
        "relationIndexes may cite zero to three relations that actually changed a candidate; an empty list is valid and preferable to forced influence.",
      ] : []),
    ].join("\n\n"),
    output: Output.object({ schema: NamingSetSchema }),
    maxOutputTokens: 2_800,
    temperature: 0.78,
    topP: 0.92,
  }), "Keep disposition and candidates consistent: all-rejected requires an empty list, while candidates requires at least one item.");
}

function assertNamingSet(value: NamingExpressionResult, limit: number, relationCount: number): void {
  if (value.candidates.length > limit) throw new Error(`naming treatment exceeded candidate limit ${limit}`);
  if (value.disposition === "all-rejected" && value.candidates.length > 0) throw new Error("all-rejected naming treatment returned candidates");
  if (value.disposition === "candidates" && value.candidates.length === 0) throw new Error("candidate naming treatment returned no candidates");
  const names = value.candidates.map((candidate) => candidate.name.trim().toLocaleLowerCase());
  if (new Set(names).size !== names.length) throw new Error("naming treatment returned duplicate candidate names");
  for (const candidate of value.candidates) {
    if (relationCount === 0 && candidate.relationIndexes.length > 0) {
      throw new Error(`direct baseline claimed unavailable relations for ${candidate.name}`);
    }
    const invalid = candidate.relationIndexes.filter((index) => index > relationCount);
    if (invalid.length > 0) throw new Error(`${candidate.name} cited unavailable relation indexes: ${invalid.join(", ")}`);
  }
}

async function extractProjectionRelations(input: {
  model: ReturnType<typeof createValidationModel>["model"];
  snapshot: string;
  material: CandidateArtifact[];
}): Promise<{ output: z.infer<typeof ProjectionRelationsSchema>; usage: CellUsage }> {
  const result = await runStructuredProbe((correction) => generateText({
    model: input.model,
    instructions: [
      "You convert private associative material into zero to six plain relations grounded in a concrete project.",
      "You are not a naming agent. Do not propose, preserve, evaluate, or hint at any name, word, phrase, sound, spelling, translation, historical costume, or metaphorical object.",
      "Strip away distinctive surface material. Retain only a relation that changes how the project can be understood and state the boundary that keeps it from collapsing into a slogan.",
      "Returning no relations is valid when the material adds only novelty, ornament, or a paraphrase of the project source.",
      ...(correction ? ["## Structured-output correction", correction] : []),
    ].join("\n"),
    prompt: [
      "## Project source",
      input.snapshot,
      "## Private associative material",
      JSON.stringify(input.material.map((artifact, index) => ({ index: index + 1, content: artifact.content }))),
      "Return only relations that survive removal of the source wording. materialIndexes must identify the private inputs that changed each retained relation.",
    ].join("\n\n"),
    output: Output.object({ schema: ProjectionRelationsSchema }),
    maxOutputTokens: 1_800,
    temperature: 0.4,
    topP: 0.9,
  }), "Return an object with a relations array only; every retained relation requires relation, boundary, and one to four valid materialIndexes.");
  for (const relation of result.output.relations) {
    const invalid = relation.materialIndexes.filter((index) => index > input.material.length);
    if (invalid.length > 0) throw new Error(`relation projection cited unavailable material indexes: ${invalid.join(", ")}`);
  }
  return result;
}

interface StructuredGeneration<T> {
  output: T;
  totalUsage: unknown;
  providerMetadata: unknown;
}

async function runStructuredProbe<T>(
  call: (correction?: string) => Promise<StructuredGeneration<T>>,
  repairRequirement: string,
): Promise<{ output: T; usage: CellUsage }> {
  let recoveredUsage = emptyUsage();
  let correction: string | undefined;
  try {
    const result = await call();
    return { output: result.output, usage: normalizeUsage(result.totalUsage, result.providerMetadata) };
  } catch (error) {
    if (!recoverableStructuredError(error)) throw error;
    recoveredUsage = NoObjectGeneratedError.isInstance(error)
      ? normalizeUsage(error.usage, undefined)
      : emptyUsage();
    correction = structuredCorrection(error, repairRequirement);
  }
  try {
    const result = await call(correction);
    return {
      output: result.output,
      usage: addUsage(recoveredUsage, normalizeUsage(result.totalUsage, result.providerMetadata)),
    };
  } catch (error) {
    if (!recoverableStructuredError(error)) throw error;
    const usage = NoObjectGeneratedError.isInstance(error)
      ? addUsage(recoveredUsage, normalizeUsage(error.usage, undefined))
      : recoveredUsage;
    throw new Error(`${error.message}; structured retry exhausted; observed usage=${JSON.stringify(usage)}`);
  }
}

function recoverableStructuredError(error: unknown): error is Error {
  return NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error);
}

function structuredCorrection(error: Error, repairRequirement: string): string {
  const cause = "cause" in error && error.cause instanceof Error ? error.cause.message : error.message;
  return `The previous attempt failed the declared schema: ${cause}. Return one schema-valid object. ${repairRequirement}`;
}

function seededRank(seed: string, group: string, id: string): string {
  return createHash("sha256").update(`${seed}:${group}:${id}`).digest("hex");
}

function addUsage(left: CellUsage, right: CellUsage): CellUsage {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    totalTokens: left.totalTokens + right.totalTokens,
    cachedInputTokens: left.cachedInputTokens + right.cachedInputTokens,
  };
}

function emptyUsage(): CellUsage {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 };
}
