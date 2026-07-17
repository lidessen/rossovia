import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { requireValidationConfiguration } from "../validation-model";
import type { ActivationFieldRecord } from "./activation-field";
import { AiSdkResidualReadoutDriver } from "./ai-sdk-residual-readout";
import { LatentRoutingSpecSchema, runLatentRouting } from "./latent-routing";

(globalThis as typeof globalThis & { AI_SDK_LOG_WARNINGS?: boolean }).AI_SDK_LOG_WARNINGS = false;

const ManifestSchema = z.object({ latentRouting: LatentRoutingSpecSchema }).strict();

await main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
});

async function main(args: string[]): Promise<void> {
  const sourceArg = args[0];
  const manifestArg = args[1];
  if (!sourceArg || !manifestArg) {
    throw new Error("usage: bun src/research/latent-routing-probe.ts <activation-record.json> <manifest.json>");
  }
  requireValidationConfiguration("a live latent-routing probe");
  const sourcePath = resolve(sourceArg);
  const sourceContent = await readFile(sourcePath, "utf8");
  const stored = JSON.parse(sourceContent) as { record?: ActivationFieldRecord };
  if (!stored.record) throw new Error("source file does not contain an activation-field record");
  const manifest = ManifestSchema.parse(JSON.parse(await readFile(resolve(manifestArg), "utf8")));
  const driver = new AiSdkResidualReadoutDriver();
  const record = await runLatentRouting(stored.record, manifest.latentRouting, driver);
  const output = resolve(dirname(sourcePath), `latent-routing-${record.sourceRunId}-${record.runId}.json`);
  const envelope = {
    source: { path: sourcePath, sha256: createHash("sha256").update(sourceContent).digest("hex") },
    record,
  };
  await writeFile(output, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    output,
    status: record.status,
    sourceRunId: record.sourceRunId,
    field: record.field,
    heads: record.heads,
    metrics: record.metrics,
    failures: record.failures,
    durationMs: record.durationMs,
    usage: record.usage,
    estimateAudit: record.estimateAudit,
  }, null, 2));
}
