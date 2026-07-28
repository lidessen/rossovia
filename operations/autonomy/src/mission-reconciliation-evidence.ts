import { randomUUID } from "node:crypto";
import {
  link,
  mkdir,
  open,
  readFile,
  unlink,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import {
  CellRunRecordSchema,
  type CellRunRecord,
} from "../../../packages/work-cell/src/contracts";
import { digest, stableStringify } from "./canonical-json";
import { missionRunnerDirectory } from "./mission-paths";

export const MISSION_RECONCILIATION_CELL_RECORD_VERSION =
  "rosso.mission-reconciliation-cell-record.v1" as const;
export const MISSION_RECONCILIATION_ACTION_CELL_RECORD_VERSION =
  "rosso.mission-reconciliation-action-cell-record.v1" as const;

export const ReconciliationCellRecordRoleSchema = z.enum([
  "proposal",
  "verification",
]);

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const SafeRunIdSchema = z.string().min(1).regex(
  /^[A-Za-z0-9][A-Za-z0-9._:-]*$/,
  "runId must be a traversal-safe path component",
);

export const ReconciliationCellRecordEvidenceSchema = z.object({
  role: ReconciliationCellRecordRoleSchema,
  runId: z.string().min(1),
  cellId: z.string().min(1),
  ref: z.string().min(1),
  digest: Sha256Schema,
}).strict();

const StoredReconciliationCellRecordSchema = z.object({
  version: z.literal(MISSION_RECONCILIATION_CELL_RECORD_VERSION),
  role: ReconciliationCellRecordRoleSchema,
  record: CellRunRecordSchema,
}).strict();

const StoredReconciliationActionCellRecordSchema = z.object({
  version: z.literal(MISSION_RECONCILIATION_ACTION_CELL_RECORD_VERSION),
  role: ReconciliationCellRecordRoleSchema,
  record: CellRunRecordSchema,
}).strict();

export type ReconciliationCellRecordRole =
  z.infer<typeof ReconciliationCellRecordRoleSchema>;
export type ReconciliationCellRecordEvidence =
  z.infer<typeof ReconciliationCellRecordEvidenceSchema>;

export interface RetainMissionReconciliationCellRecordOptions {
  readonly home: string;
  readonly missionId: string;
  readonly role: ReconciliationCellRecordRole;
  readonly record: CellRunRecord;
}

export interface ReadMissionReconciliationCellRecordOptions {
  readonly home: string;
  readonly missionId: string;
  readonly digest: string;
}

export interface VerifyMissionReconciliationCellRecordOptions {
  readonly home: string;
  readonly missionId: string;
  readonly evidence: ReconciliationCellRecordEvidence;
}

export interface StoredMissionReconciliationCellRecord {
  readonly evidence: ReconciliationCellRecordEvidence;
  readonly record: CellRunRecord;
}

export async function retainMissionReconciliationCellRecord(
  options: RetainMissionReconciliationCellRecordOptions,
): Promise<ReconciliationCellRecordEvidence> {
  const role = ReconciliationCellRecordRoleSchema.parse(options.role);
  const record = requirePassedRecord(options.record);
  SafeRunIdSchema.parse(record.runId);
  const stored = StoredReconciliationCellRecordSchema.parse({
    version: MISSION_RECONCILIATION_CELL_RECORD_VERSION,
    role,
    record,
  });
  const recordDigest = digest(stored);
  const evidence = evidenceFor(stored, recordDigest);
  const root = reconciliationCellRecordDirectory(options.home, options.missionId);
  const recordPath = join(root, `${recordDigest}.json`);
  const indexPath = join(root, "by-run", `${record.runId}.json`);

  await retainExact(recordPath, canonicalBytes(stored), "reconciliation Cell record");
  await retainExact(
    indexPath,
    canonicalBytes(evidence),
    `reconciliation Cell run ${record.runId} already binds different evidence`,
  );

  return evidence;
}

/** Retain every started reconciliation-action Cell, including failed runs. */
export async function retainMissionReconciliationActionCellRecord(
  options: RetainMissionReconciliationCellRecordOptions,
): Promise<ReconciliationCellRecordEvidence> {
  const role = ReconciliationCellRecordRoleSchema.parse(options.role);
  const record = CellRunRecordSchema.parse(options.record) as CellRunRecord;
  SafeRunIdSchema.parse(record.runId);
  const stored = StoredReconciliationActionCellRecordSchema.parse({
    version: MISSION_RECONCILIATION_ACTION_CELL_RECORD_VERSION,
    role,
    record,
  });
  const recordDigest = digest(stored);
  const evidence = ReconciliationCellRecordEvidenceSchema.parse({
    role,
    runId: record.runId,
    cellId: record.cellId,
    ref: `file:reconciliation-action-cell-records/${recordDigest}.json`,
    digest: recordDigest,
  });
  const root = join(
    missionRunnerDirectory(options.home, options.missionId),
    "reconciliation-action-cell-records",
  );
  await retainExact(
    join(root, `${recordDigest}.json`),
    canonicalBytes(stored),
    "reconciliation action Cell record",
  );
  await retainExact(
    join(root, "by-run", `${record.runId}.json`),
    canonicalBytes(evidence),
    `reconciliation action Cell run ${record.runId} already binds different evidence`,
  );
  return evidence;
}

export async function readMissionReconciliationActionCellRecord(
  options: ReadMissionReconciliationCellRecordOptions,
): Promise<{
  readonly evidence: ReconciliationCellRecordEvidence;
  readonly record: CellRunRecord;
}> {
  const recordDigest = Sha256Schema.parse(options.digest);
  const root = join(
    missionRunnerDirectory(options.home, options.missionId),
    "reconciliation-action-cell-records",
  );
  const source = await requiredFile(
    join(root, `${recordDigest}.json`),
    `reconciliation action Cell record ${recordDigest}`,
  );
  const stored = StoredReconciliationActionCellRecordSchema.parse(
    JSON.parse(source.toString("utf8")),
  );
  if (digest(stored) !== recordDigest) {
    throw new Error(
      `reconciliation action Cell record ${recordDigest} failed its digest check`,
    );
  }
  const record = stored.record as CellRunRecord;
  const evidence = ReconciliationCellRecordEvidenceSchema.parse({
    role: stored.role,
    runId: record.runId,
    cellId: record.cellId,
    ref: `file:reconciliation-action-cell-records/${recordDigest}.json`,
    digest: recordDigest,
  });
  const index = ReconciliationCellRecordEvidenceSchema.parse(JSON.parse(
    (await requiredFile(
      join(root, "by-run", `${record.runId}.json`),
      `reconciliation action Cell run index ${record.runId}`,
    )).toString("utf8"),
  ));
  if (stableStringify(index) !== stableStringify(evidence)) {
    throw new Error(
      `reconciliation action Cell run ${record.runId} index does not match retained evidence`,
    );
  }
  return { evidence, record };
}

export async function readMissionReconciliationCellRecord(
  options: ReadMissionReconciliationCellRecordOptions,
): Promise<StoredMissionReconciliationCellRecord> {
  const recordDigest = Sha256Schema.parse(options.digest);
  const root = reconciliationCellRecordDirectory(options.home, options.missionId);
  const path = join(root, `${recordDigest}.json`);
  const source = await requiredFile(path, `reconciliation Cell record ${recordDigest}`);
  const stored = parseStoredRecord(source, recordDigest);
  const record = requirePassedRecord(stored.record);
  SafeRunIdSchema.parse(record.runId);
  return {
    evidence: evidenceFor(stored, recordDigest),
    record,
  };
}

export async function verifyMissionReconciliationCellRecord(
  options: VerifyMissionReconciliationCellRecordOptions,
): Promise<StoredMissionReconciliationCellRecord> {
  const evidence = ReconciliationCellRecordEvidenceSchema.parse(options.evidence);
  SafeRunIdSchema.parse(evidence.runId);
  const expectedRef = recordRef(evidence.digest);
  if (evidence.ref !== expectedRef) {
    throw new Error(`reconciliation Cell evidence ref does not match digest ${evidence.digest}`);
  }
  const retained = await readMissionReconciliationCellRecord({
    home: options.home,
    missionId: options.missionId,
    digest: evidence.digest,
  });
  if (
    retained.evidence.role !== evidence.role
    || retained.evidence.runId !== evidence.runId
    || retained.evidence.cellId !== evidence.cellId
    || stableStringify(retained.evidence) !== stableStringify(evidence)
  ) {
    throw new Error(`reconciliation Cell evidence does not match retained record ${evidence.digest}`);
  }

  const root = reconciliationCellRecordDirectory(options.home, options.missionId);
  const indexPath = join(root, "by-run", `${evidence.runId}.json`);
  const indexSource = await requiredFile(
    indexPath,
    `reconciliation Cell run index ${evidence.runId}`,
  );
  const index = ReconciliationCellRecordEvidenceSchema.parse(JSON.parse(indexSource.toString("utf8")));
  if (stableStringify(index) !== stableStringify(evidence)) {
    throw new Error(`reconciliation Cell run ${evidence.runId} index does not match retained evidence`);
  }
  return retained;
}

export function reconciliationCellRecordDirectory(
  home: string,
  missionId: string,
): string {
  return join(
    missionRunnerDirectory(home, missionId),
    "reconciliation-cell-records",
  );
}

function requirePassedRecord(unparsedRecord: unknown): CellRunRecord {
  const record = CellRunRecordSchema.parse(unparsedRecord);
  if (record.status !== "passed") {
    throw new Error(`reconciliation Cell record ${record.runId} is not passed`);
  }
  // The runtime schema and interface describe the same JSON contract. Zod's
  // inferred optional properties include `undefined`, while this package uses
  // exact optional properties in its TypeScript interfaces.
  return record as CellRunRecord;
}

function evidenceFor(
  stored: z.infer<typeof StoredReconciliationCellRecordSchema>,
  recordDigest: string,
): ReconciliationCellRecordEvidence {
  return ReconciliationCellRecordEvidenceSchema.parse({
    role: stored.role,
    runId: stored.record.runId,
    cellId: stored.record.cellId,
    ref: recordRef(recordDigest),
    digest: recordDigest,
  });
}

function recordRef(recordDigest: string): string {
  return `file:reconciliation-cell-records/${recordDigest}.json`;
}

function canonicalBytes(value: unknown): Buffer {
  return Buffer.from(stableStringify(value), "utf8");
}

function parseStoredRecord(
  source: Buffer,
  expectedDigest: string,
): z.infer<typeof StoredReconciliationCellRecordSchema> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source.toString("utf8"));
  } catch {
    throw new Error(`reconciliation Cell record ${expectedDigest} is not valid JSON`);
  }
  const stored = StoredReconciliationCellRecordSchema.parse(parsed);
  if (digest(stored) !== expectedDigest) {
    throw new Error(`reconciliation Cell record ${expectedDigest} failed its digest check`);
  }
  return stored;
}

async function retainExact(
  path: string,
  source: Buffer,
  conflictMessage: string,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(source);
    await handle.sync();
  } finally {
    await handle.close();
  }

  let created = false;
  try {
    await link(temporary, path);
    created = true;
  } catch (error) {
    if (!isCode(error, "EEXIST")) throw error;
    const retained = await readFile(path);
    if (!retained.equals(source)) throw new Error(conflictMessage);
  } finally {
    await unlink(temporary).catch((error: unknown) => {
      if (!isCode(error, "ENOENT")) throw error;
    });
  }

  if (created) await syncDirectory(dirname(path));
}

async function requiredFile(path: string, label: string): Promise<Buffer> {
  try {
    return await readFile(path);
  } catch (error) {
    if (isCode(error, "ENOENT")) throw new Error(`${label} is missing`);
    throw error;
  }
}

async function syncDirectory(path: string): Promise<void> {
  const directory = await open(path, "r");
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}

function isCode(error: unknown, code: string): boolean {
  return error !== null
    && typeof error === "object"
    && "code" in error
    && error.code === code;
}
