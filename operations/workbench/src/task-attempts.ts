import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { isAbsolute, join, relative } from "node:path";
import { z } from "zod";
import type { CellRunRecord } from "../../../packages/work-cell/src/contracts";
import { resolveHome } from "./home";
import { showPrincipalTask } from "./tasks";

const requireFromHere = createRequire(import.meta.url);

const TaskRunAttemptSchema = z.object({
  version: z.literal("rosso.task-run-attempt.v1"),
  taskId: z.string().min(1),
  taskRevision: z.number().int().positive(),
  sourceRevision: z.number().int().nonnegative(),
  attemptId: z.string().min(1),
  inputRef: z.string().min(1),
  finalRecordRef: z.string().min(1),
  driver: z.string().min(1),
  model: z.string().min(1),
  reasoningEffort: z.string().min(1).optional(),
  session: z.string().min(1).optional(),
  status: z.literal("started"),
  startedAt: z.iso.datetime(),
}).passthrough();

const TaskRunSettlementSchema = z.object({
  version: z.literal("rosso.task-run-settlement.v1"),
  taskId: z.string().min(1),
  taskRevision: z.number().int().positive(),
  attemptId: z.string().min(1),
  inputRef: z.string().min(1),
  finalRecordRef: z.string().min(1),
  status: z.enum(["recorded", "runner-failed"]),
  semanticAcceptance: z.literal("not-evaluated"),
  settledAt: z.iso.datetime(),
}).passthrough();

export type TaskAttemptStatus = "started" | "recorded" | "runner-failed" | "invalid";

export type TaskAttemptEvidenceStanding =
  | { standing: "available" }
  | { standing: "unavailable" }
  | { standing: "invalid"; error: string };

export interface TaskAttemptProjection {
  attemptId: string;
  taskRevision?: number;
  sourceRevision?: number;
  driver?: string;
  model?: string;
  reasoningEffort?: string;
  /** Session requested by the caller for this attempt, when one was supplied. */
  requestedSession?: string;
  /** Session observed in this attempt's retained Work Cell final record, when available. */
  observedSession?: string;
  /** Terminal status retained in the Work Cell final record, when available. */
  cellStatus?: CellRunRecord["status"];
  usage?: CellRunRecord["usage"];
  workspaceDiff?: CellRunRecord["workspaceDiff"];
  verification?: CellRunRecord["verification"];
  status: TaskAttemptStatus;
  startedAt?: string;
  settledAt?: string;
  inputRef: string;
  attemptRef: string;
  finalRecordRef: string;
  settlementRef: string;
  evidence: {
    attempt: TaskAttemptEvidenceStanding;
    finalRecord: TaskAttemptEvidenceStanding;
    settlement: TaskAttemptEvidenceStanding;
  };
}

/**
 * Read-only projection of one task's recorded attempts. Facts are never copied:
 * requested run arguments come from the immutable attempt record, observed
 * session/status/usage/workspace diff/verification come from the retained Work
 * Cell final record, and settlement status comes from the append-only
 * settlement. The raw Work Cell trace is not exposed.
 */
export function showPrincipalTaskAttempts(
  homeArgument: string | undefined,
  idArgument: string,
): TaskAttemptProjection[] {
  const home = resolveHome(homeArgument);
  const observed = showPrincipalTask(home, idArgument);
  const attemptsRoot = join(home, "state", "task-attempts");
  if (!existsSync(attemptsRoot)) return [];
  const requestedId = observed.task.id.toLowerCase();
  const projections: TaskAttemptProjection[] = [];
  for (const entry of readdirSync(attemptsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const evidence = readAttemptEvidence(home, entry.name, requestedId);
    if (evidence === undefined) continue;
    projections.push(projectAttempt(home, entry.name, requestedId, evidence));
  }
  projections.sort((left, right) => {
    if (left.startedAt === undefined) return right.startedAt === undefined
      ? left.attemptId.localeCompare(right.attemptId)
      : 1;
    if (right.startedAt === undefined) return -1;
    return left.startedAt.localeCompare(right.startedAt)
      || left.attemptId.localeCompare(right.attemptId);
  });
  return projections;
}

interface JsonEvidence {
  standing: "available" | "unavailable" | "invalid";
  value?: unknown;
  error?: string;
}

interface AttemptEvidence {
  attemptJson: JsonEvidence;
  settlementJson: JsonEvidence;
  finalRecordJson: JsonEvidence;
}

function readAttemptEvidence(
  home: string,
  attemptId: string,
  requestedTaskId: string,
): AttemptEvidence | undefined {
  const directory = join(home, "state", "task-attempts", attemptId);
  const attemptJson = readJson(join(directory, "attempt.json"));
  const settlementJson = readJson(join(directory, "settlement.json"));
  const attemptTaskId = taskIdClaim(attemptJson.value);
  const ownerTaskId = attemptTaskId ?? taskIdClaim(settlementJson.value);
  if (ownerTaskId?.toLowerCase() !== requestedTaskId) return undefined;
  return {
    attemptJson,
    settlementJson,
    finalRecordJson: readJson(join(directory, "cell-input.run.json")),
  };
}

function readJson(path: string): JsonEvidence {
  if (!existsSync(path)) return { standing: "unavailable" };
  try {
    return { standing: "available", value: JSON.parse(readFileSync(path, "utf8")) };
  } catch (error: unknown) {
    return {
      standing: "invalid",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function taskIdClaim(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || !("taskId" in value)) return undefined;
  const taskId = value.taskId;
  return typeof taskId === "string" && taskId.length > 0 ? taskId : undefined;
}

function projectAttempt(
  home: string,
  attemptId: string,
  requestedTaskId: string,
  evidence: AttemptEvidence,
): TaskAttemptProjection {
  const refs = attemptRefs(home, attemptId);
  const attempt = parseEvidence(
    evidence.attemptJson,
    TaskRunAttemptSchema,
    (candidate) => {
      if (candidate.taskId.toLowerCase() !== requestedTaskId) return "attempt task id does not match requested task";
      if (candidate.attemptId !== attemptId) return "attempt id does not match its evidence directory";
      if (candidate.inputRef !== refs.inputRef) return "attempt input ref does not match its stable evidence ref";
      if (candidate.finalRecordRef !== refs.finalRecordRef) {
        return "attempt final record ref does not match its stable evidence ref";
      }
      return undefined;
    },
  );
  const settlement = parseEvidence(
    evidence.settlementJson,
    TaskRunSettlementSchema,
    (candidate) => {
      if (candidate.taskId.toLowerCase() !== requestedTaskId) {
        return "settlement task id does not match requested task";
      }
      if (candidate.attemptId !== attemptId) return "settlement attempt id does not match its evidence directory";
      if (candidate.inputRef !== refs.inputRef) return "settlement input ref does not match its stable evidence ref";
      if (candidate.finalRecordRef !== refs.finalRecordRef) {
        return "settlement final record ref does not match its stable evidence ref";
      }
      if (attempt.value !== undefined && candidate.taskRevision !== attempt.value.taskRevision) {
        return "settlement task revision does not match the attempt record";
      }
      return undefined;
    },
  );
  const finalRecord = parseEvidence(
    evidence.finalRecordJson,
    workCellContracts().CellRunRecordSchema.transform(
      (record) => record as CellRunRecord,
    ),
    (candidate) => {
      const expectedCellId = `workbench-task-${requestedTaskId}-attempt-${attemptId}`;
      if (candidate.cellId !== expectedCellId || candidate.input.id !== expectedCellId) {
        return "Work Cell final record does not belong to this task attempt";
      }
      if (attempt.value !== undefined && candidate.driver.model !== attempt.value.model) {
        return "Work Cell final record model does not match the attempt record";
      }
      return undefined;
    },
  );

  return {
    attemptId,
    ...(attempt.value !== undefined ? {
      taskRevision: attempt.value.taskRevision,
      sourceRevision: attempt.value.sourceRevision,
      driver: attempt.value.driver,
      model: attempt.value.model,
      ...(attempt.value.reasoningEffort !== undefined
        ? { reasoningEffort: attempt.value.reasoningEffort }
        : {}),
      ...(attempt.value.session !== undefined ? { requestedSession: attempt.value.session } : {}),
      startedAt: attempt.value.startedAt,
    } : {}),
    ...(finalRecord.value?.executionObservation.sessionId !== undefined
      ? { observedSession: finalRecord.value.executionObservation.sessionId }
      : {}),
    ...(finalRecord.value !== undefined ? {
      cellStatus: finalRecord.value.status,
      usage: finalRecord.value.usage,
      workspaceDiff: finalRecord.value.workspaceDiff,
      verification: finalRecord.value.verification,
    } : {}),
    status: settlement.value?.status
      ?? (settlement.standing.standing === "invalid"
        || attempt.standing.standing === "invalid" ? "invalid" : "started"),
    ...(settlement.value !== undefined ? { settledAt: settlement.value.settledAt } : {}),
    ...refs,
    evidence: {
      attempt: attempt.standing,
      finalRecord: finalRecord.standing,
      settlement: settlement.standing,
    },
  };
}

interface ParsedEvidence<T> {
  value?: T;
  standing: TaskAttemptEvidenceStanding;
}

function parseEvidence<T>(
  source: JsonEvidence,
  schema: { safeParse(value: unknown): { success: true; data: T } | { success: false; error: Error } },
  validate: (value: T) => string | undefined,
): ParsedEvidence<T> {
  if (source.standing === "unavailable") return { standing: { standing: "unavailable" } };
  if (source.standing === "invalid") {
    return { standing: { standing: "invalid", error: source.error ?? "invalid JSON" } };
  }
  const parsed = schema.safeParse(source.value);
  if (!parsed.success) {
    return { standing: { standing: "invalid", error: parsed.error.message } };
  }
  const error = validate(parsed.data);
  if (error !== undefined) return { standing: { standing: "invalid", error } };
  return { value: parsed.data, standing: { standing: "available" } };
}

function attemptRefs(home: string, attemptId: string): {
  inputRef: string;
  attemptRef: string;
  finalRecordRef: string;
  settlementRef: string;
} {
  const directory = join(home, "state", "task-attempts", attemptId);
  return {
    inputRef: evidenceRef(home, join(directory, "cell-input.json")),
    attemptRef: evidenceRef(home, join(directory, "attempt.json")),
    finalRecordRef: evidenceRef(home, join(directory, "cell-input.run.json")),
    settlementRef: evidenceRef(home, join(directory, "settlement.json")),
  };
}

function evidenceRef(home: string, path: string): string {
  const ref = relative(home, path);
  if (!ref || isAbsolute(ref) || ref.split(/[\\/]/u).includes("..")) {
    throw new Error(`task attempt path escapes Rossovia home: ${path}`);
  }
  return ref;
}

function workCellContracts(): typeof import("../../../packages/work-cell/src/contracts") {
  return requireFromHere("../../../packages/work-cell/src/contracts");
}
