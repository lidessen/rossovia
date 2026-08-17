import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import type { CellInput, CellRunRecord } from "../../../packages/work-cell/src/contracts";
import { resolveHome } from "./home";
import { showPrincipalTask } from "./tasks";

const requireFromHere = createRequire(import.meta.url);

/** Canonical identifier for every retained ordinary Task attempt directory. */
export const TaskAttemptIdSchema = z.string().uuid();

const TaskRunAttemptSchema = z.object({
  version: z.literal("rosso.task-run-attempt.v1"),
  taskId: z.string().min(1),
  taskRevision: z.number().int().positive(),
  sourceRevision: z.number().int().nonnegative(),
  attemptId: TaskAttemptIdSchema,
  inputRef: z.string().min(1),
  finalRecordRef: z.string().min(1),
  /**
   * The exact canonical Worktree identity retained by the O2 Run request
   * BEFORE any O3 writer-claim acquisition or mutable preparation. This
   * O2-owned request field lets a new-format inputless Run reconcile the
   * exact dead-owner claim from the request identity alone; historical
   * attempt records lacking it remain readable and fail closed for that
   * recovery.
   */
  worktree: z.string().min(1).optional(),
  workerId: z.string().min(1).optional(),
  driver: z.string().min(1),
  model: z.string().min(1),
  reasoningEffort: z.string().min(1).optional(),
  session: z.string().min(1).optional(),
  /**
   * Exact prior-attempt lineage retained by a stateless continuation: the
   * anchor attempt id and the cumulative owner-backed workspaceDiff union
   * verified before the run. Legacy `session` stays readable for historical
   * OpenCode compatibility records only; production continuation authority
   * is this lineage, never a session id.
   */
  continuation: z.object({
    continuedFromAttemptId: TaskAttemptIdSchema,
    workspaceDiff: z.object({
      added: z.array(z.string()),
      changed: z.array(z.string()),
      removed: z.array(z.string()),
    }).strict(),
  }).strict().optional(),
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

/**
 * The exact O2 stop control receipt version written by the O2 `stopRun`
 * owner (`orchestration/run.ts`). The conversation-owned carrier writes the
 * same file with its own frozen carrier shape (see below); both are strict
 * Run evidence with exact Run/task/worktree/request/settlement cross-links.
 */
export const RUN_CONTROL_RECEIPT_VERSION = "rosso.run-control-receipt.v1" as const;

/** The exact O2 stop receipt shape: `runId` names the Run identity. */
export const RunControlReceiptSchema = z.object({
  version: z.literal(RUN_CONTROL_RECEIPT_VERSION),
  control: z.literal("stop"),
  runId: z.string().uuid(),
  taskId: z.string().min(1),
  workerId: z.string().min(1),
  worktree: z.string().min(1),
  sourceRef: z.string().min(1),
  requestedBy: z.string().min(1),
  requestedAt: z.iso.datetime(),
  attemptRef: z.string().min(1),
  settlementRef: z.string().min(1),
}).strict();

export type RunControlReceipt = z.infer<typeof RunControlReceiptSchema>;

/** The conversation-owned carrier stop receipt shape: `carrierId` names the attempt. */
const CarrierControlReceiptSchema = z.object({
  version: z.literal("rosso.task-run-control-receipt.v1"),
  control: z.literal("stop"),
  carrierId: z.string().uuid(),
  taskId: z.string().min(1),
  attemptId: z.string().min(1),
  workerId: z.string().min(1),
  worktree: z.string().min(1),
  sourceRef: z.string().min(1),
  requestedBy: z.object({
    conversationId: z.string().uuid(),
    turnId: z.string().uuid(),
    actionId: z.string().uuid(),
  }).strict(),
  requestedAt: z.string().min(1),
  attemptRef: z.string().min(1),
  settlementRef: z.string().min(1),
}).strict();

export type CarrierControlReceipt = z.infer<typeof CarrierControlReceiptSchema>;

/** The union of every existing durable control receipt evidence shape. */
export type ControlReceiptEvidence = RunControlReceipt | CarrierControlReceipt;

const ControlReceiptEvidenceSchema = z.union([
  RunControlReceiptSchema,
  CarrierControlReceiptSchema,
]);

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
  /** Exact prior-attempt lineage anchor retained by a stateless continuation, when one exists. */
  continuedFromAttemptId?: string;
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
      ...(attempt.value.continuation !== undefined
        ? { continuedFromAttemptId: attempt.value.continuation.continuedFromAttemptId }
        : {}),
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
 * the immutable CellInput, the retained Work Cell final record, the durable
 * control receipt when one exists, and the append-only settlement, each
 * validated against its exact schema and the stable directory refs. The
 * standing is `available` only when every present source parses and matches
 * its owner; `invalid` when any present source is malformed or mismatched
 * (such evidence can never settle anything); `unavailable` when the attempt
 * record itself is missing. Callers that need terminal status must require
 * standing `available` plus a validated settlement; an invalid or absent
 * settlement projects unknown, never settled. This is the single strict
 * owner-backed reader for carrier standing, projections, and receipt
 * reconciliation.
 */
export interface StrictTaskAttemptEvidence {
  readonly standing: "available" | "unavailable" | "invalid";
  readonly error?: string;
  readonly attempt?: ParsedTaskRunAttempt;
  readonly input?: CellInput;
  readonly finalRecord?: CellRunRecord;
  /** The exact retained control receipt, validated against the family cross-links. */
  readonly control?: ControlReceiptEvidence;
  readonly settlement?: ParsedTaskRunSettlement;
  /** The exact canonical control receipt ref of this attempt family. */
  readonly controlRef: string;
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
  // The durable control receipt is strict Run evidence at its exact canonical
  // ref inside the attempt directory.
  const controlRef = evidenceRef(home, join(dirname(join(home, refs.attemptRef)), "control.json"));
  const attemptJson = readJson(join(home, refs.attemptRef));
  if (attemptJson.standing === "unavailable") {
    return { standing: "unavailable", refs, controlRef };
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
      controlRef,
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
      const requestWorktree = attemptRecord.worktree;
      if (requestWorktree !== undefined) {
        const rootError = attemptWorktreeInputRootError(requestWorktree, candidate.workspace.root);
        if (rootError !== undefined) return rootError;
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
      const fingerprintStandingError = aiSdkFamilyFingerprintStandingError(
        attemptRecord.driver,
        candidate,
      );
      if (fingerprintStandingError !== undefined) return fingerprintStandingError;
      if (input === undefined) {
        return "Work Cell final record cannot be verified without its immutable CellInput";
      }
      const inputCompatibility = legacyDefaultMaxStepsInputCompatibilityError(candidate.input, input);
      if (inputCompatibility !== undefined) return inputCompatibility;
      if (
        input.executionProfile !== undefined
        && candidate.driver.provider !== input.executionProfile.provider
      ) {
        return "Work Cell final record provider does not match its immutable execution profile";
      }
      return undefined;
    });
    if (parsed.value === undefined) {
      invalid.push(`Work Cell final record is invalid: ${parsed.standing.standing === "invalid" ? parsed.standing.error : "unavailable"}`);
    } else {
      finalRecord = parsed.value;
    }
  }

  const controlJson = readJson(join(home, controlRef));
  let control: ControlReceiptEvidence | undefined;
  if (controlJson.standing === "invalid") {
    invalid.push(`control receipt is malformed: ${controlJson.error ?? "invalid JSON"}`);
  } else if (controlJson.standing === "available") {
    const parsed = parseEvidence(controlJson, ControlReceiptEvidenceSchema, (candidate) =>
      controlReceiptIdentityError(candidate, attemptRecord, attemptId, refs, input));
    if (parsed.value === undefined) {
      invalid.push(`control receipt is invalid: ${parsed.standing.standing === "invalid" ? parsed.standing.error : "unavailable"}`);
    } else {
      control = parsed.value;
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
      const relation = settlementFinalRelationError(candidate, finalRecord, control, controlRef);
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
    return { standing: "invalid", error: invalid.join("; "), attempt: attemptRecord, refs, controlRef };
  }
  return {
    standing: "available",
    attempt: attemptRecord,
    ...(input === undefined ? {} : { input }),
    ...(finalRecord === undefined ? {} : { finalRecord }),
    ...(control === undefined ? {} : { control }),
    ...(settlement === undefined ? {} : { settlement }),
    refs,
    controlRef,
  };
}

function workCellContracts(): typeof import("../../../packages/work-cell/src/contracts") {
  return requireFromHere("../../../packages/work-cell/src/contracts");
}

/** The exact Work Cell adapter a retained attempt execution form produces. */
function adapterForAttemptDriver(driver: string): string | undefined {
  if (driver === "opencode-cli") return "opencode-cli.v1";
  if (driver === "ai-sdk-v7") return "ai-sdk-v7";
  if (driver === "ai-sdk-harness-pi-v1") return "ai-sdk-harness-pi-v1";
  return undefined;
}

/**
 * Narrow version-aware compatibility for exactly one legacy evidence
 * relation: the former BudgetSchema default injected `maxSteps: 20` into the
 * embedded final input while the immutable raw CellInput retained no own
 * maxSteps. Only that pair is accepted — the raw budget omits maxSteps, the
 * embedded final is otherwise identical and carries exactly `maxSteps: 20`.
 * 19, 21, arbitrary added fields, or any other difference stays invalid, and
 * nothing rewrites the historical bytes: the raw input remains without
 * maxSteps and the final record keeps its injected value. General
 * deep-equality is untouched for every other pair.
 */
export function legacyDefaultMaxStepsInputCompatibilityError(
  finalInput: CellInput,
  rawInput: CellInput,
): string | undefined {
  if (isDeepStrictEqual(finalInput, rawInput)) return undefined;
  if (rawInput.budget.maxSteps !== undefined) {
    return "Work Cell final record embedded input does not match its immutable CellInput";
  }
  if (finalInput.budget.maxSteps !== 20) {
    return "Work Cell final record embedded input does not match its immutable CellInput";
  }
  const { maxSteps: _legacyDefault, ...restBudget } = finalInput.budget;
  const withoutLegacyDefault: CellInput = { ...finalInput, budget: restBudget };
  return isDeepStrictEqual(withoutLegacyDefault, rawInput)
    ? undefined
    : "Work Cell final record embedded input does not match its immutable CellInput";
}

/**
 * Production AI SDK evidence must carry a truthful provider fingerprint
 * standing: a newly retained ai-sdk-v7 or ai-sdk-harness-pi-v1 final record
 * never becomes strict attempt evidence without one. Historical OpenCode
 * compatibility records may omit the standing. Contradictory
 * value/standing/reason combinations are rejected structurally by the Work
 * Cell final record schema itself; this gate only covers the absent
 * standing the optional schema field would otherwise admit.
 */
function aiSdkFamilyFingerprintStandingError(
  driver: string,
  final: CellRunRecord,
): string | undefined {
  if (driver !== "ai-sdk-v7" && driver !== "ai-sdk-harness-pi-v1") return undefined;
  if (final.executionObservation.providerFingerprintStanding === undefined) {
    return `${driver} Work Cell final record must carry a truthful provider fingerprint standing`;
  }
  return undefined;
}

/**
 * The exact settlement↔final↔control relation: terminal claims must match the
 * retained owner final, and each status admits only its permitted shape.
 * `recorded` requires the exact passed final; `runner-failed` admits a
 * non-passed final (with matching run/cell evidence and error) or no final
 * (with no terminal claims); `control-stopped` requires its durable control
 * receipt and, when the final exists, matching claims. The durable control
 * receipt is strict Run evidence: a settlement carrying a control ref must be
 * control-stopped with the exact receipt of this attempt family, a retained
 * exact receipt must be carried by the terminal settlement, and a
 * control-stopped settlement without its exact receipt is invalid.
 * Contradictions are invalid/uninspectable evidence.
 */
function settlementFinalRelationError(
  settlement: ParsedTaskRunSettlement,
  final: CellRunRecord | undefined,
  control: ControlReceiptEvidence | undefined,
  controlRef: string,
): string | undefined {
  const runId = settlement.workCellRunId;
  const cellStatus = settlement.cellStatus;
  if (settlement.controlRef !== undefined) {
    if (settlement.status !== "control-stopped") {
      return "a settlement carrying a control receipt must be control-stopped";
    }
    if (settlement.controlRef !== controlRef) {
      return "settlement control ref does not match the exact retained control receipt";
    }
    if (control === undefined) {
      return "control-stopped settlement requires its exact retained control receipt";
    }
  } else if (control !== undefined) {
    return "the retained control receipt is not carried by the terminal settlement";
  }
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

/**
 * The exact cross-links one retained control receipt must satisfy against
 * its owning attempt family: the Run/carrier identity, the task attribution,
 * the worker attribution, the attempt/settlement refs, and the canonical
 * Worktree (the request-owned identity first, else the immutable CellInput
 * workspace root). Any mismatch fails closed as invalid evidence.
 */
function controlReceiptIdentityError(
  candidate: ControlReceiptEvidence,
  attemptRecord: ParsedTaskRunAttempt,
  attemptId: string,
  refs: {
    inputRef: string;
    attemptRef: string;
    finalRecordRef: string;
    settlementRef: string;
  },
  input: CellInput | undefined,
): string | undefined {
  const recordedRunId = "runId" in candidate ? candidate.runId : candidate.carrierId;
  if (recordedRunId !== attemptId) {
    return "control receipt run identity does not match its evidence directory";
  }
  if (candidate.attemptRef !== refs.attemptRef) {
    return "control receipt attempt ref does not match its stable evidence ref";
  }
  if (candidate.settlementRef !== refs.settlementRef) {
    return "control receipt settlement ref does not match its stable evidence ref";
  }
  if (candidate.taskId !== attemptRecord.taskId) {
    return "control receipt task id does not match the attempt record";
  }
  if (attemptRecord.workerId !== undefined && candidate.workerId !== attemptRecord.workerId) {
    return "control receipt worker id does not match the attempt record";
  }
  const expectedRoot = attemptRecord.worktree ?? input?.workspace.root;
  if (expectedRoot === undefined) {
    return "control receipt Worktree cannot be verified without a request-owned Worktree identity or immutable CellInput";
  }
  let observedRoot: string;
  try {
    observedRoot = realpathSync(candidate.worktree);
  } catch {
    return `control receipt Worktree cannot be resolved: ${candidate.worktree}`;
  }
  let expectedCanonical: string;
  try {
    expectedCanonical = realpathSync(expectedRoot);
  } catch {
    return `the expected Worktree identity cannot be resolved: ${expectedRoot}`;
  }
  if (observedRoot !== expectedCanonical) {
    return `control receipt Worktree ${candidate.worktree} does not match the exact request-owned Worktree ${expectedCanonical}`;
  }
  return undefined;
}

/**
 * The exact request↔input Worktree cross-link: when the O2 request record
 * retains its canonical Worktree identity and the immutable CellInput also
 * exists, the two must resolve to the same canonical root. Historical records
 * without the request-owned field skip the check.
 */
function attemptWorktreeInputRootError(
  requestWorktree: string,
  inputRoot: string,
): string | undefined {
  let expectedRoot: string;
  try {
    expectedRoot = realpathSync(requestWorktree);
  } catch {
    return "the request-owned Worktree identity cannot be resolved";
  }
  let observedRoot: string;
  try {
    observedRoot = realpathSync(inputRoot);
  } catch {
    return "the immutable CellInput workspace root cannot be resolved";
  }
  return observedRoot === expectedRoot
    ? undefined
    : "immutable CellInput workspace root does not match the request-owned Worktree identity";
}
