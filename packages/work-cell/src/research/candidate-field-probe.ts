import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { requireValidationCredentials } from "../validation-model";
import type { ActivationFieldRecord } from "./activation-field";
import { AiSdkCandidateFieldDriver } from "./ai-sdk-candidate-field";
import { CandidateFieldSpecSchema, SeedLibrarySchema, runCandidateField } from "./candidate-field";
import { WikisourceSeedRetriever } from "./wikisource-seed-retriever";

(globalThis as typeof globalThis & { AI_SDK_LOG_WARNINGS?: boolean }).AI_SDK_LOG_WARNINGS = false;

const ManifestSchema = z.object({
  candidateField: CandidateFieldSpecSchema,
  candidateSeedLibrary: z.string().min(1),
  candidateRetrievalEstimatedTokens: z.number().int().positive().optional(),
});

await main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
});

async function main(args: string[]): Promise<void> {
  const sourceArg = args[0];
  const manifestArg = args[1];
  const treatment = args[2] ?? "memory";
  if (!sourceArg || !manifestArg) {
    throw new Error("usage: bun src/research/candidate-field-probe.ts <activation-record.json> <manifest.json> [memory|wikisource]");
  }
  if (treatment !== "memory" && treatment !== "wikisource") throw new Error(`unknown candidate-field treatment: ${treatment}`);
  requireValidationCredentials("a live candidate-field probe");
  const sourcePath = resolve(sourceArg);
  const sourceContent = await readFile(sourcePath, "utf8");
  const stored = JSON.parse(sourceContent) as { record?: ActivationFieldRecord };
  if (!stored.record) throw new Error("source file does not contain an activation-field record");
  const manifestPath = resolve(manifestArg);
  const manifest = ManifestSchema.parse(JSON.parse(await readFile(manifestPath, "utf8")));
  const libraryPath = resolve(dirname(manifestPath), manifest.candidateSeedLibrary);
  const libraryContent = await readFile(libraryPath, "utf8");
  const library = SeedLibrarySchema.parse(JSON.parse(libraryContent));
  const seedRetriever = treatment === "wikisource" ? new WikisourceSeedRetriever() : undefined;
  const candidateField = treatment === "wikisource" && manifest.candidateRetrievalEstimatedTokens
    ? { ...manifest.candidateField, estimatedTokens: manifest.candidateRetrievalEstimatedTokens }
    : manifest.candidateField;
  const record = await runCandidateField(stored.record, candidateField, library, new AiSdkCandidateFieldDriver({
    ...(seedRetriever ? { seedRetriever } : {}),
  }));
  const output = resolve(dirname(sourcePath), `candidate-field-${treatment}-${record.sourceRunId}-${record.runId}.json`);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify({
    source: { path: sourcePath, sha256: createHash("sha256").update(sourceContent).digest("hex") },
    manifest: { path: manifestPath },
    seedLibrary: { path: libraryPath, sha256: createHash("sha256").update(libraryContent).digest("hex") },
    treatment,
    record,
  }, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    output,
    status: record.status,
    sourceRunId: record.sourceRunId,
    treatment,
    stats: record.stats,
    retrieval: retrievalSummary(record),
    archives: record.archives.map((archive) => ({
      ...archive,
      artifacts: archive.artifactIds.map((id) => record.artifacts.find((artifact) => artifact.id === id)),
    })),
    failures: record.failures,
    durationMs: record.durationMs,
    usage: record.usage,
    estimateAudit: record.estimateAudit,
  }, null, 2));
}

function retrievalSummary(record: Awaited<ReturnType<typeof runCandidateField>>) {
  const emissions = record.artifacts.filter((artifact) => artifact.phase === "emit");
  const activations = emissions.flatMap((artifact) => artifact.seedActivations);
  const evidence = activations.flatMap((activation) => activation.evidence);
  return {
    bases: Object.fromEntries(["memory", "retrieval", "mixed"].map((basis) => [
      basis,
      activations.filter((activation) => activation.basis === basis).length,
    ])),
    evidence: evidence.length,
    uniqueLocators: new Set(evidence.map((entry) => entry.locator)).size,
  };
}
