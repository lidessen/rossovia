import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { requireValidationConfiguration } from "../validation-model";
import type { ActivationFieldRecord } from "./activation-field";
import { AiSdkResidualReadoutDriver } from "./ai-sdk-residual-readout";
import { ResidualReadoutSpecSchema, runResidualReadout } from "./residual-readout";

(globalThis as typeof globalThis & { AI_SDK_LOG_WARNINGS?: boolean }).AI_SDK_LOG_WARNINGS = false;

const ManifestSchema = z.object({ residualReadout: ResidualReadoutSpecSchema });

await main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
});

async function main(args: string[]): Promise<void> {
  const sourceArg = args[0];
  const manifestArg = args[1];
  if (!sourceArg || !manifestArg) {
    throw new Error("usage: bun src/research/residual-readout-probe.ts <activation-record.json> <manifest.json> [--layers 0,1,2,3]");
  }
  requireValidationConfiguration("a live residual-readout probe");
  const sourcePath = resolve(sourceArg);
  const sourceContent = await readFile(sourcePath, "utf8");
  const stored = JSON.parse(sourceContent) as { record?: ActivationFieldRecord };
  if (!stored.record) throw new Error("source file does not contain an activation-field record");
  const manifest = ManifestSchema.parse(JSON.parse(await readFile(resolve(manifestArg), "utf8")));
  const layersFlag = args.indexOf("--layers");
  const fieldLayers = layersFlag >= 0
    ? String(args[layersFlag + 1] ?? "").split(",").map(Number)
    : undefined;
  if (fieldLayers && (fieldLayers.some((layer) => !Number.isInteger(layer) || layer < 0) || fieldLayers.length === 0)) {
    throw new Error("--layers must be a comma-separated list of non-negative integers");
  }
  const driver = new AiSdkResidualReadoutDriver();
  const record = await runResidualReadout(stored.record, {
    ...manifest.residualReadout,
    ...(fieldLayers ? { fieldLayers, id: `${manifest.residualReadout.id}-layers-${fieldLayers.join("-")}` } : {}),
  }, driver);
  const output = resolve(dirname(sourcePath), `residual-readout-${record.sourceRunId}-${record.runId}.json`);
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
    failures: record.failures,
    durationMs: record.durationMs,
    usage: record.usage,
    estimateAudit: record.estimateAudit,
    projection: record.projection,
  }, null, 2));
}
