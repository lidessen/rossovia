import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { isAbsolute, join, relative } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import type { CellInput, CellRunRecord } from "../../../packages/work-cell/src/contracts";
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
  workerId: z.string().min(1).optional(),
  driver: z.string().min(1),
  model: z.string().min(1),
  reasoningEffort: z.string().min(1).optional(),
  session: z.string().min(1).optional(),
  status: z.literal("started"),
  startedAt: z.iso.datetime(),
  /**
   * Optional conversation correlation retained by a conversation-owned
   * catalog attempt: the exact durable turn/action identity and the causal
   * action source reference the reconciliation path searches for.
   */
  correlation: z.object({
    conversationId: z.string().uuid(),
    turnId: z.string().uuid(),
    actionId: z.string().uuid(),
    sourceRef: z.string().min(1),
  }).strict().optional(),
}).passthrough();

const TaskRunSettlementSchema = z.object({
  version: z.literal("rosso.task-run-settlement.v1"),
  taskId: z.string().min(1),
  taskRevision: z.number().int().positive(),
  attemptId: z.string().min(1),
  inputRef: z.string().min(1),
  finalRecordRef: z.string().min(1),
  status: z.enum(["recorded", "runner-failed", "control-stopped"]),
  semanticAcceptance: z.literal("not-evaluated"),
  settledAt: z.iso.datetime(),
  /** Durable control receipt reference retained when a work_control stop settled this attempt. */
  controlRef: z.string().min(1).optional(),
  workCellRunId: z.string().min(1).optional(),
  cellStatus: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
}).passthrough();

export type ParsedTaskRunAttempt = z.infer<typeof TaskRunAttemptSchema>;
export type ParsedTaskRunSettlement = z.infer<typeof TaskRunSettlementSchema>;
export type TaskRunSettlementStatus = ParsedTaskRunSettlement["status"];

export type TaskAttemptStatus = "started" | "recorded" | "runner-failed" | "control-stopped" | "invalid";

export type TaskAttemptEvidenceStanding =
  | { standing: "available" }
  | { standing: "unavailable" }
  | { standing: "invalid"; error: string };

export interface TaskAttemptProjection {
  attemptId: string;
  taskRevision?: number;
  sourceRevision?: number;
  workerId?: string;
  driver?: string;
  model?: string;
  reasoningEffort?: string;
  /** Conversation correlation retained by a conversation-owned catalog attempt. */
  correlation?: {
    conversationId: string;
    turnId: string;
    actionId: string;
    sourceRef: string;
  };
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
      ...(attempt.value.workerId !== undefined ? { workerId: attempt.value.workerId } : {}),
      driver: attempt.value.driver,
      model: attempt.value.model,
      ...(attempt.value.reasoningEffort !== undefined
        ? { reasoningEffort: attempt.value.reasoningEffort }
        : {}),
      ...(attempt.value.correlation !== undefined
        ? { correlation: attempt.value.correlation }
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

/**
 * One strict read of an attempt directory's whole evidence family: the
 * immutable attempt record (including its optional conversation correlation),
 * the immutable CellInput, the retained Work Cell final record, and the
 * append-only settlement, each validated against its exact schema and the
 * stable directory refs. The standing is `available` only when every present
 * source parses and matches its owner; `invalid` when any present source is
 * malformed or mismatched (such evidence can never settle anything);
 * `unavailable` when the attempt record itself is missing. Callers that need
 * terminal status must require standing `available` plus a validated
 * settlement; an invalid or absent settlement projects unknown, never
 * settled. This is the single strict owner-backed reader for carrier
 * standing, projections, and receipt reconciliation.
 */
export interface StrictTaskAttemptEvidence {
  readonly standing: "available" | "unavailable" | "invalid";
  readonly error?: string;
  readonly attempt?: ParsedTaskRunAttempt;
  readonly input?: CellInput;
  readonly finalRecord?: CellRunRecord;
  readonly settlement?: ParsedTaskRunSettlement;
  readonly refs: {
    inputRef: string;
    attemptRef: string;
    finalRecordRef: string;
    settlementRef: string;
  };
}

export function readStrictTaskAttemptEvidence(
  homeArgument: string | undefined,
  attemptId: string,
): StrictTaskAttemptEvidence {
  const home = resolveHome(homeArgument);
  const refs = attemptRefs(home, attemptId);
  const attemptJson = readJson(join(home, refs.attemptRef));
  if (attemptJson.standing === "unavailable") {
    return { standing: "unavailable", refs };
  }
  const attempt = parseEvidence(attemptJson, TaskRunAttemptSchema, (candidate) => {
    if (candidate.attemptId !== attemptId) return "attempt id does not match its evidence directory";
    if (candidate.inputRef !== refs.inputRef) return "attempt input ref does not match its stable evidence ref";
    if (candidate.finalRecordRef !== refs.finalRecordRef) {
      return "attempt final record ref does not match its stable evidence ref";
    }
    return undefined;
  });
  if (attempt.value === undefined) {
    return {
      standing: "invalid",
      error: attempt.standing.standing === "invalid" ? attempt.standing.error : "attempt evidence is unavailable",
      refs,
    };
  }
  const attemptRecord = attempt.value;

  const invalid: string[] = [];
  const inputJson = readJson(join(home, refs.inputRef));
  let input: CellInput | undefined;
  if (inputJson.standing === "invalid") {
    invalid.push(`immutable CellInput is malformed: ${inputJson.error ?? "invalid JSON"}`);
  } else if (inputJson.standing === "available") {
    const parsed = parseEvidence(inputJson, workCellContracts().CellInputSchema.transform(
      (value) => value as CellInput,
    ), (candidate) => {
      const expectedId = `workbench-task-${attemptRecord.taskId}-attempt-${attemptId}`;
      if (candidate.id !== expectedId) return "CellInput id does not match its exact task/attempt owner";
      const attemptWorker = attemptRecord.workerId;
      if (attemptWorker !== undefined) {
        if (candidate.workerId !== attemptWorker) return "CellInput workerId does not match the attempt record";
        if (candidate.executionProfile?.id !== attemptWorker) {
          return "CellInput execution profile id does not match the attempt record";
        }
      } else if (
        candidate.workerId !== undefined
        && candidate.executionProfile !== undefined
        && candidate.workerId !== candidate.executionProfile.id
      ) {
        return "CellInput workerId does not match its execution profile identity";
      }
      return undefined;
    });
    if (parsed.value === undefined) {
      invalid.push(`immutable CellInput is invalid: ${parsed.standing.standing === "invalid" ? parsed.standing.error : "unavailable"}`);
    } else {
      input = parsed.value;
    }
  }

  const finalJson = readJson(join(home, refs.finalRecordRef));
  let finalRecord: CellRunRecord | undefined;
  if (finalJson.standing === "invalid") {
    invalid.push(`Work Cell final record is malformed: ${finalJson.error ?? "invalid JSON"}`);
  } else if (finalJson.standing === "available") {
    const parsed = parseEvidence(finalJson, workCellContracts().CellRunRecordSchema.transform(
      (value) => value as CellRunRecord,
    ), (candidate) => {
      const expectedCellId = `workbench-task-${attemptRecord.taskId}-attempt-${attemptId}`;
      if (candidate.cellId !== expectedCellId || candidate.input.id !== expectedCellId) {
        return "Work Cell final record does not belong to this task attempt";
      }
      if (candidate.driver.model !== attemptRecord.model) {
        return "Work Cell final record model does not match the attempt record";
      }
      const expectedAdapter = adapterForAttemptDriver(attemptRecord.driver);
      if (expectedAdapter !== undefined && candidate.driver.adapter !== expectedAdapter) {
        return "Work Cell final record driver adapter does not match the attempt execution form";
      }
      if (input === undefined) {
        return "Work Cell final record cannot be verified without its immutable CellInput";
      }
      if (!isDeepStrictEqual(candidate.input, input)) {
        return "Work Cell final record embedded input does not match its immutable CellInput";
      }
      return undefined;
    });
    if (parsed.value === undefined) {
      invalid.push(`Work Cell final record is invalid: ${parsed.standing.standing === "invalid" ? parsed.standing.error : "unavailable"}`);
    } else {
      finalRecord = parsed.value;
    }
  }

  const settlementJson = readJson(join(home, refs.settlementRef));
  let settlement: ParsedTaskRunSettlement | undefined;
  if (settlementJson.standing === "invalid") {
    invalid.push(`settlement is malformed: ${settlementJson.error ?? "invalid JSON"}`);
  } else if (settlementJson.standing === "available") {
    const parsed = parseEvidence(settlementJson, TaskRunSettlementSchema, (candidate) => {
      if (candidate.taskId !== attemptRecord.taskId) return "settlement task id does not match the attempt record";
      if (candidate.attemptId !== attemptId) return "settlement attempt id does not match its evidence directory";
      if (candidate.inputRef !== refs.inputRef) return "settlement input ref does not match its stable evidence ref";
      if (candidate.finalRecordRef !== refs.finalRecordRef) {
        return "settlement final record ref does not match its stable evidence ref";
      }
      if (candidate.taskRevision !== attemptRecord.taskRevision) {
        return "settlement task revision does not match the attempt record";
      }
      const relation = settlementFinalRelationError(candidate, finalRecord);
      if (relation !== undefined) return relation;
      return undefined;
    });
    if (parsed.value === undefined) {
      invalid.push(`settlement is invalid: ${parsed.standing.standing === "invalid" ? parsed.standing.error : "unavailable"}`);
    } else {
      settlement = parsed.value;
    }
  }

  if (invalid.length > 0) {
    // The valid attempt record stays attributable so callers can project the
    // carrier as unknown/uninspectable; the standing still never settles.
    return { standing: "invalid", error: invalid.join("; "), attempt: attemptRecord, refs };
  }
  return {
    standing: "available",
    attempt: attemptRecord,
    ...(input === undefined ? {} : { input }),
    ...(finalRecord === undefined ? {} : { finalRecord }),
    ...(settlement === undefined ? {} : { settlement }),
    refs,
  };
}

function workCellContracts(): typeof import("../../../packages/work-cell/src/contracts") {
  return requireFromHere("../../../packages/work-cell/src/contracts");
}

/** The exact Work Cell adapter a retained attempt execution form produces. */
function adapterForAttemptDriver(driver: string): string | undefined {
  if (driver === "opencode-cli") return "opencode-cli.v1";
  if (driver === "ai-sdk-v7") return "ai-sdk-v7";
  return undefined;
}

/**
 * The exact settlement↔final relation: terminal claims must match the
 * retained owner final, and each status admits only its permitted shape.
 * `recorded` requires the exact passed final; `runner-failed` admits a
 * non-passed final (with matching run/cell evidence and error) or no final
 * (with no terminal claims); `control-stopped` requires its durable control
 * receipt and, when the final exists, matching claims. Contradictions are
 * invalid/uninspectable evidence.
 */
function settlementFinalRelationError(
  settlement: ParsedTaskRunSettlement,
  final: CellRunRecord | undefined,
): string | undefined {
  const runId = settlement.workCellRunId;
  const cellStatus = settlement.cellStatus;
  if (runId === undefined && cellStatus !== undefined) {
    return "settlement carries a cell status without its Work Cell run id";
  }
  if (final === undefined) {
    if (runId !== undefined || cellStatus !== undefined) {
      return "settlement claims a Work Cell final that was not retained";
    }
    if (settlement.status === "recorded") {
      return "recorded settlement requires the exact passed Work Cell final";
    }
    if (settlement.status === "control-stopped" && settlement.controlRef === undefined) {
      return "control-stopped settlement requires its durable control receipt";
    }
    return undefined;
  }
  // Whenever a final record exists, every settlement kind — including
  // control-stopped — must carry the exact run/cell evidence and match it.
  if (runId === undefined || cellStatus === undefined) {
    return "settlement does not carry the exact retained final evidence";
  }
  if (runId !== final.runId) {
    return "settlement Work Cell run id does not match the retained final record";
  }
  if (cellStatus !== final.status) {
    return "settlement cell status does not match the retained final record";
  }
  if (settlement.status === "recorded") {
    if (final.status !== "passed") {
      return "recorded settlement requires the exact passed Work Cell final";
    }
    return undefined;
  }
  if (settlement.status === "runner-failed") {
    if (final.status === "passed") {
      return "runner-failed settlement contradicts a passed Work Cell final";
    }
    if (settlement.error !== (final.error ?? `the Work Cell run settled with status ${final.status}`)) {
      return "runner-failed settlement error does not match the retained final record";
    }
    return undefined;
  }
  if (settlement.status === "control-stopped") {
    if (settlement.controlRef === undefined) {
      return "control-stopped settlement requires its durable control receipt";
    }
    return undefined;
  }
  return undefined;
}
