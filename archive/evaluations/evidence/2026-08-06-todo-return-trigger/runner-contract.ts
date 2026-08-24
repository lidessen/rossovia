import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  WORK_CELL_RECORD_VERSION,
  type TraceEvent,
} from "../../../../packages/work-cell/src/contracts";
import {
  RETURN_TRIGGER_EVENT,
  RETURN_TRIGGER_VERSION,
  type ReturnTriggerArm,
} from "./return-trigger-driver";

export async function verifyExactFixture(root: string, manifestPath: string) {
  const manifest = await readFile(manifestPath, "utf8");
  const expected = new Map<string, string>();
  for (const line of manifest.trim().split("\n")) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    if (!match) throw new Error(`invalid fixture hash line: ${line}`);
    expected.set(match[2]!, match[1]!);
  }

  const actualPaths = await listRegularFiles(root);
  const expectedPaths = [...expected.keys()].sort();
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    throw new Error(
      `fixture file set mismatch: expected ${expectedPaths.join(", ")}; observed ${actualPaths.join(", ")}`,
    );
  }

  const observed: Record<string, string> = {};
  for (const path of expectedPaths) {
    const actual = sha256(await readFile(join(root, path)));
    const digest = expected.get(path)!;
    if (actual !== digest) {
      throw new Error(`fixture mismatch for ${path}: expected ${digest}, observed ${actual}`);
    }
    observed[path] = actual;
  }
  return observed;
}

export async function sha256RegularTree(root: string): Promise<string> {
  const digest = createHash("sha256");
  for (const path of await listRegularFiles(root)) {
    digest.update(path, "utf8");
    digest.update("\0");
    digest.update(await readFile(join(root, path)));
    digest.update("\0");
  }
  return digest.digest("hex");
}

export function classifyReturnTriggerDelivery(
  arm: ReturnTriggerArm,
  trace: TraceEvent[],
  primaryPath: string,
  expectedObligationSha256: string,
  recordVersion: string,
) {
  const errors: string[] = [];
  if (recordVersion !== WORK_CELL_RECORD_VERSION) {
    errors.push(`unknown Work Cell record version: ${recordVersion}`);
  }

  const primaryWriteIndex = trace.findIndex((event) => (
    event.type === "tool.write_file"
    && isObject(event.data)
    && event.data.path === primaryPath
  ));
  const deliveries = trace
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.type === RETURN_TRIGGER_EVENT);

  for (const { event } of deliveries) {
    if (!isObject(event.data) || event.data.version !== RETURN_TRIGGER_VERSION) {
      errors.push("unknown or missing return-trigger event version");
      continue;
    }
    if (event.data.primaryPath !== primaryPath) {
      errors.push("return-trigger event primary path mismatch");
    }
    if (event.data.obligationSha256 !== expectedObligationSha256) {
      errors.push("return-trigger event obligation hash mismatch");
    }
  }
  if (arm === "control" && deliveries.length > 0) {
    errors.push("control received a return-trigger event");
  }
  if (arm === "treatment" && primaryWriteIndex >= 0) {
    if (deliveries.length !== 1 || deliveries[0]?.index !== primaryWriteIndex + 1) {
      errors.push("treatment delivery is missing, duplicated, or misplaced");
    }
  } else if (deliveries.length > 0) {
    errors.push("return trigger appeared without a qualifying treatment primary write");
  }

  return {
    status: errors.length === 0 ? "valid" as const : "invalid" as const,
    recordVersion,
    expectedRecordVersion: WORK_CELL_RECORD_VERSION,
    expectedTriggerVersion: RETURN_TRIGGER_VERSION,
    qualifyingPrimaryWrite: primaryWriteIndex >= 0,
    eventCount: deliveries.length,
    eventIndex: deliveries[0]?.index ?? null,
    errors,
  };
}

async function listRegularFiles(root: string, prefix = ""): Promise<string[]> {
  const entries = await readdir(join(root, prefix), { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`fixture contains a symbolic link: ${path}`);
    if (entry.isDirectory()) files.push(...await listRegularFiles(root, path));
    else if (entry.isFile()) files.push(path);
    else throw new Error(`fixture contains a non-regular entry: ${path}`);
  }
  return files.sort();
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
