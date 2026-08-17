import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import type { CellInput, CellRunRecord } from "../../../../packages/work-cell/src/contracts";
import {
  readStrictTaskAttemptEvidence,
  type StrictTaskAttemptEvidence,
} from "../task-attempts";
import {
  acquireWorktreeWriterLease,
  inspectRetainedWorktreeWriterLease,
  isProcessDefinitelyAbsent,
  releaseWorktreeWriterLease,
  type WorktreeWriterLease,
  type WorktreeWriterOwnerIdentity,
} from "./worktree-writer";

const requireFromHere = createRequire(import.meta.url);

/**
 * O2 — Run lifecycle owner (Decision 055).
 *
 * One accepted ordinary request creates one durable Run identity over the
 * existing Task-attempt evidence family (the attempt directory), BEFORE O3
 * writer-claim acquisition and BEFORE any mutable preparation. The Run then
 * acquires at most one exact O3 writer claim, lowers at most one immutable
 * CellInput, invokes at most one unchanged Work Cell through a supplied
 * executor, and retains at most one truthful terminal outcome in the shared
 * append-only settlement. The public execution effects are `run` and exact
 * live `stop`; standing inspection is read-only and reconciliation is
 * idempotent owner maintenance that starts no Cell, replays no effect, and
 * mutates no Task.
 *
 * The durable request record keeps the frozen `rosso.task-run-attempt.v1`
 * byte shape and adds one O2-owned `requestDigest` field. An identical replay
 * of one accepted request converges on the retained Run without invoking a
 * second Cell; a different body under the same identity conflicts. No second
 * lifecycle store exists: the attempt record is the Run request, the
 * `cell-input.json` is the immutable lowering, the `cell-input.run.json` is
 * the exact Cell final, the `settlement.json` is the terminal outcome, and
 * the O3 claim in the Worktree Git metadata is the writer ownership.
 *
 * Run terminal outcome and O3 cleanup standing are independent: a Run whose
 * durable settlement exists is terminal while a still-retained exact writer
 * claim keeps cleanup `retained` (reconcile-required) and continues to block
 * another writer.
 */

/** The canonical Run request accepted by O2; `requestId` is the Run identity. */
export const RunRequestSchema = z.object({
  requestId: z.string().uuid(),
  taskId: z.string().min(1),
  taskRevision: z.number().int().positive(),
  sourceRevision: z.number().int().nonnegative(),
  workerId: z.string().min(1),
  execution: z.object({
    driver: z.string().min(1),
    model: z.string().min(1),
    reasoningEffort: z.string().min(1).optional(),
  }).strict(),
  /** The exact resolved Worktree root the O3 writer claim binds to. */
  worktree: z.string().min(1),
  /** Exact prior-attempt lineage for a stateless continuation, when requested. */
  continuation: z.object({
    continuedFromAttemptId: z.string().uuid(),
    workspaceDiff: z.object({
      added: z.array(z.string()),
      changed: z.array(z.string()),
      removed: z.array(z.string()),
    }).strict(),
  }).strict().optional(),
}).strict();

export type RunRequest = z.infer<typeof RunRequestSchema>;

export type RunTerminalStatus = "recorded" | "runner-failed" | "control-stopped";

/** O3 cleanup standing, independent of the Run's terminal outcome. */
export type RunCleanupStanding = "released" | "retained" | "uninspectable";

/** The retained attempt-directory evidence refs of one Run. */
export interface RunEvidenceRefs {
  readonly inputPath: string;
  readonly finalRecordPath: string;
  readonly attemptPath: string;
  readonly settlementPath: string;
  readonly inputRef: string;
  readonly finalRecordRef: string;
  readonly attemptRef: string;
  readonly settlementRef: string;
}

interface RunSettlementFields {
  readonly status: RunTerminalStatus;
  readonly workCellRunId?: string;
  readonly cellStatus?: string;
  readonly controlRef?: string;
  readonly error?: string;
}

/** One truthful terminal Run outcome; never synthesized from absent evidence. */
export interface RunTerminalOutcome {
  readonly runId: string;
  readonly taskId: string;
  readonly taskRevision: number;
  readonly status: RunTerminalStatus;
  readonly workCellRunId?: string;
  readonly cellStatus?: string;
  readonly controlRef?: string;
  readonly error?: string;
  readonly cleanup: RunCleanupStanding;
  /** Visible only when the terminal settlement is durable but the exact O3 release failed. */
  readonly cleanupError?: string;
  readonly refs: RunEvidenceRefs;
  /** The exact validated retained Cell final, when one exists. */
  readonly finalRecord?: CellRunRecord;
}

export type RunResult =
  | { readonly standing: "terminal"; readonly outcome: RunTerminalOutcome }
  | { readonly standing: "unresolved"; readonly refs: RunEvidenceRefs; readonly error: string };

/** A different request body replayed under one existing Run identity. */
export class RunRequestConflictError extends Error {
  constructor(readonly runId: string, message: string) {
    super(message);
    this.name = "RunRequestConflictError";
  }
}

export type RunRequestRecordStanding =
  | { readonly standing: "created"; readonly refs: RunEvidenceRefs; readonly digest: string }
  | { readonly standing: "converged"; readonly refs: RunEvidenceRefs; readonly digest: string };

/** The canonical deterministic request body: excludes nothing volatile. */
export function canonicalRunRequestJson(request: RunRequest): string {
  return JSON.stringify({
    requestId: request.requestId,
    taskId: request.taskId,
    taskRevision: request.taskRevision,
    sourceRevision: request.sourceRevision,
    workerId: request.workerId,
    driver: request.execution.driver,
    model: request.execution.model,
    ...(request.execution.reasoningEffort !== undefined
      ? { reasoningEffort: request.execution.reasoningEffort }
      : {}),
    worktree: request.worktree,
    ...(request.continuation !== undefined ? { continuation: request.continuation } : {}),
  });
}

export function runRequestDigest(request: RunRequest): string {
  return createHash("sha256").update(canonicalRunRequestJson(request)).digest("hex");
}

/**
 * Create the durable Run request record BEFORE any O3 acquisition or mutable
 * preparation. The attempt directory is created with no-clobber semantics:
 * an identical replay (same identity, same request digest) converges on the
 * retained Run; a different body under the same identity throws
 * `RunRequestConflictError`; an unreadable retained record fails closed.
 */
export function createRunRequestRecord(
  home: string,
  unparsedRequest: unknown,
): RunRequestRecordStanding {
  const request = RunRequestSchema.parse(unparsedRequest);
  const digest = runRequestDigest(request);
  const refs = taskRunHelpers().attemptEvidence(home, request.requestId);
  const directory = dirname(refs.attemptPath);
  // Before any per-Run directory is created, create only the existing shared
  // attempts parent; the per-Run directory itself stays an atomic no-clobber
  // create so an identical replay converges on the retained Run and a
  // different body under the same identity conflicts.
  mkdirSync(join(home, "state", "task-attempts"), { recursive: true });
  try {
    mkdirSync(directory, { recursive: false });
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
    return convergeOrConflict(request, digest, refs);
  }
  try {
    taskRunHelpers().writeImmutableJson(refs.attemptPath, {
      version: "rosso.task-run-attempt.v1",
      taskId: request.taskId,
      taskRevision: request.taskRevision,
      sourceRevision: request.sourceRevision,
      attemptId: request.requestId,
      inputRef: refs.inputRef,
      finalRecordRef: refs.finalRecordRef,
      workerId: request.workerId,
      driver: request.execution.driver,
      model: request.execution.model,
      ...(request.execution.reasoningEffort !== undefined
        ? { reasoningEffort: request.execution.reasoningEffort }
        : {}),
      ...(request.continuation !== undefined
        ? {
            continuation: {
              continuedFromAttemptId: request.continuation.continuedFromAttemptId,
              workspaceDiff: request.continuation.workspaceDiff,
            },
          }
        : {}),
      status: "started",
      startedAt: new Date().toISOString(),
      requestDigest: digest,
    });
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
    // Another writer created the exact record between our mkdir and write.
    return convergeOrConflict(request, digest, refs);
  }
  return { standing: "created", refs, digest };
}

function convergeOrConflict(
  request: RunRequest,
  digest: string,
  refs: RunEvidenceRefs,
): RunRequestRecordStanding {
  let retained: unknown;
  try {
    retained = JSON.parse(readFileSync(refs.attemptPath, "utf8"));
  } catch {
    throw new Error(
      `Run ${request.requestId} retains no readable durable request record; the identity cannot be reused: ${refs.attemptPath}`,
    );
  }
  const record = asRecord(retained);
  if (record.version !== "rosso.task-run-attempt.v1" || record.attemptId !== request.requestId) {
    throw new RunRequestConflictError(
      request.requestId,
      `Run ${request.requestId} retains a different durable request under the same identity`,
    );
  }
  if (typeof record.requestDigest === "string" && record.requestDigest === digest) {
    return { standing: "converged", refs, digest };
  }
  throw new RunRequestConflictError(
    request.requestId,
    `Run ${request.requestId} retains a different request body under the same identity; identical replay is refused`,
  );
}

/** In-process live control handles; durable truth stays in the evidence family. */
export class RunControlRegistry {
  private readonly live = new Map<string, { readonly controller: AbortController; receiptRef?: string }>();

  register(runId: string, controller: AbortController): void {
    if (this.live.has(runId)) {
      throw new Error(`Run ${runId} already has a live runtime handle`);
    }
    this.live.set(runId, { controller });
  }

  unregister(runId: string): void {
    this.live.delete(runId);
  }

  has(runId: string): boolean {
    return this.live.has(runId);
  }

  abort(runId: string, reason?: unknown): void {
    this.live.get(runId)?.controller.abort(
      reason ?? new DOMException("Run stopped", "AbortError"),
    );
  }

  receiptRef(runId: string): string | undefined {
    return this.live.get(runId)?.receiptRef;
  }

  setReceiptRef(runId: string, receiptRef: string): void {
    const entry = this.live.get(runId);
    if (entry === undefined) {
      throw new Error(`Run ${runId} has no live runtime handle for a control receipt`);
    }
    entry.receiptRef = receiptRef;
  }
}

/** One exact live stop: receipt before control, exact-replay-only reuse. */
export const RunStopRequestSchema = z.object({
  control: z.literal("stop"),
  requestedBy: z.string().min(1),
  sourceRef: z.string().min(1),
}).strict();

export type RunStopRequest = z.infer<typeof RunStopRequestSchema>;

export interface RunStopReceipt {
  readonly runId: string;
  readonly control: "stop";
  readonly receiptRef: string;
  readonly settlementRef: string;
}

export class RunStopRefusal extends Error {
  constructor(
    readonly code: "unknown" | "invalid" | "settled" | "not-live" | "different",
    message: string,
  ) {
    super(message);
    this.name = "RunStopRefusal";
  }
}

export const RUN_CONTROL_RECEIPT_VERSION = "rosso.run-control-receipt.v1" as const;

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

/**
 * Stop one exact live Run. The durable control receipt is written BEFORE the
 * abort is dispatched; a failed write changes nothing. Unknown, invalid,
 * already-settled, and non-live (no runtime handle, no terminal settlement)
 * Runs are refused; an existing receipt is reused only for the identical
 * requester and a distinct requester conflicts.
 */
export function stopRun(
  home: string,
  runId: string,
  unparsedControl: unknown,
  registry: RunControlRegistry,
): RunStopReceipt {
  const control = RunStopRequestSchema.parse(unparsedControl);
  const evidence = readStrictTaskAttemptEvidence(home, runId);
  if (evidence.standing === "unavailable") {
    throw new RunStopRefusal("unknown", `Run ${runId} is not a retained Run; stop has no effect`);
  }
  if (evidence.standing === "invalid") {
    throw new RunStopRefusal(
      "invalid",
      `Run ${runId} retains invalid evidence; the stop cannot be verified`,
    );
  }
  if (evidence.settlement !== undefined) {
    throw new RunStopRefusal(
      "settled",
      `Run ${runId} already settled with status ${evidence.settlement.status}; stop has no effect`,
    );
  }
  if (!registry.has(runId)) {
    throw new RunStopRefusal(
      "not-live",
      `Run ${runId} has no live runtime handle and no terminal settlement; `
      + "liveness is unknown and the stop cannot be verified",
    );
  }
  const attempt = evidence.attempt!;
  const receiptPath = join(dirname(join(home, evidence.refs.attemptRef)), "control.json");
  const receipt: RunControlReceipt = {
    version: RUN_CONTROL_RECEIPT_VERSION,
    control: "stop",
    runId,
    taskId: attempt.taskId,
    workerId: attempt.workerId ?? "",
    worktree: evidence.input?.workspace.root ?? "",
    sourceRef: control.sourceRef,
    requestedBy: control.requestedBy,
    requestedAt: new Date().toISOString(),
    attemptRef: evidence.refs.attemptRef,
    settlementRef: evidence.refs.settlementRef,
  };
  try {
    taskRunHelpers().writeImmutableJson(receiptPath, receipt);
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
    const retained = readRetainedControlReceipt(receiptPath);
    if (retained !== undefined && retained.runId === runId && retained.requestedBy === control.requestedBy) {
      const receiptRef = taskRunHelpers().evidenceRef(home, receiptPath);
      return { runId, control: "stop", receiptRef, settlementRef: retained.settlementRef };
    }
    throw new RunStopRefusal(
      "different",
      `Run ${runId} already has a durable control receipt from another requester; a distinct stop cannot be applied`,
    );
  }
  const receiptRef = taskRunHelpers().evidenceRef(home, receiptPath);
  // Receipt is durable before any control is dispatched.
  registry.setReceiptRef(runId, receiptRef);
  registry.abort(runId);
  return { runId, control: "stop", receiptRef, settlementRef: evidence.refs.settlementRef };
}

function readRetainedControlReceipt(path: string): RunControlReceipt | undefined {
  try {
    const parsed = RunControlReceiptSchema.safeParse(JSON.parse(readFileSync(path, "utf8")));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

/** One Cell invocation request observed by the O2 owner. */
export interface RunFinalizationInput {
  readonly refs: RunEvidenceRefs;
  readonly expectedInput: CellInput;
  readonly task: { readonly id: string; readonly revision: number };
  readonly runId: string;
  readonly lease: WorktreeWriterLease;
  readonly outcome:
    | { readonly status: "final"; readonly record: CellRunRecord }
    | { readonly status: "failed"; readonly error: string };
  readonly controlRef?: string;
  readonly execution: RunRequest["execution"];
  /** The resolved worker card the host's shared finalization validates against. */
  readonly card: unknown;
}

export type RunFinalization =
  | {
    readonly status: "finalized";
    readonly settlement: RunSettlementFields;
    readonly finalRecord?: CellRunRecord;
  }
  | { readonly status: "unresolved"; readonly error: string };

export interface OrdinaryRunDependencies {
  /** Test seam invoked after durable request creation and before O3 acquisition. */
  readonly beforeLeaseAcquire?: () => void;
  readonly acquireLease?: (worktree: string, owner: WorktreeWriterOwnerIdentity) => WorktreeWriterLease;
  readonly releaseLease?: (lease: WorktreeWriterLease) => void;
  /** Host revalidation after the O3 claim; throws on any drift. */
  readonly revalidate?: () => void;
  /** Host lowering of the accepted request into the immutable CellInput. */
  readonly lowerCellInput?: () => CellInput;
  /** The one unchanged Work Cell invocation. */
  readonly execute?: (cellInput: CellInput, options: { readonly signal?: AbortSignal }) => Promise<CellRunRecord>;
  /** Shared finalization; defaults to the canonical finalizeTaskAttempt. */
  readonly finalize?: (input: RunFinalizationInput) => RunFinalization;
  /** The resolved worker card, required by the default shared finalization. */
  readonly card?: unknown;
  /** Optional in-process live-handle registry enabling exact live stop. */
  readonly registry?: RunControlRegistry;
}

/**
 * Run one accepted request: durable Run identity -> at most one O3 writer
 * claim -> mutable preparation -> at most one unchanged Work Cell -> one
 * truthful terminal outcome in the shared settlement. A pre-Cell refusal
 * (claim refused, stale revalidation, lowering failure) settles the same
 * `runner-failed` terminal outcome with zero Cell invocations and no invented
 * final. An identical replay converges without invoking a second Cell.
 */
export async function runOrdinaryTaskRun(
  home: string,
  unparsedRequest: unknown,
  dependencies: OrdinaryRunDependencies = {},
): Promise<RunResult> {
  const request = RunRequestSchema.parse(unparsedRequest);
  if (dependencies.execute === undefined) {
    throw new Error("runOrdinaryTaskRun requires a Cell executor");
  }
  if (dependencies.lowerCellInput === undefined) {
    throw new Error("runOrdinaryTaskRun requires a CellInput lowerer");
  }
  const created = createRunRequestRecord(home, request);
  if (created.standing === "converged") {
    return convergedRunResult(home, request);
  }
  const refs = created.refs;
  const registry = dependencies.registry;
  const controller = new AbortController();
  let lease: WorktreeWriterLease | undefined;
  let finalizationAttempted = false;
  try {
    try {
      dependencies.beforeLeaseAcquire?.();
    } catch (error) {
      settleRefusal(refs, request, error);
      throw error;
    }
    try {
      lease = (dependencies.acquireLease ?? acquireWorktreeWriterLease)(
        request.worktree,
        { taskId: request.taskId, attemptId: request.requestId },
      );
    } catch (error) {
      // O3 refusal: a truthful pre-Cell terminal Run with no claim held.
      settleRefusal(refs, request, error);
      throw error;
    }
    try {
      // Mutable preparation happens only after the exact O3 claim; the
      // immutable CellInput is retained before revalidation so a refused Run
      // keeps one exact inspectable input and zero Cell invocations.
      const cellInput = dependencies.lowerCellInput();
      taskRunHelpers().writeImmutableJson(refs.inputPath, cellInput);
      dependencies.revalidate?.();
      if (registry !== undefined) registry.register(request.requestId, controller);
      const outcome = await executeOnce(dependencies.execute, cellInput, controller.signal);
      const controlRef = registry?.receiptRef(request.requestId);
      const finalization = (dependencies.finalize ?? defaultRunFinalize)({
        refs,
        expectedInput: cellInput,
        task: { id: request.taskId, revision: request.taskRevision },
        runId: request.requestId,
        lease,
        outcome,
        ...(controlRef !== undefined ? { controlRef } : {}),
        execution: request.execution,
        card: dependencies.card,
      });
      finalizationAttempted = true;
      if (finalization.status === "unresolved") {
        if (existsSync(refs.settlementPath)) {
          // The durable settlement was retained; only the exact O3 release
          // failed. The Run outcome is terminal while cleanup remains
          // reconcile-required: the two standings are independent.
          const evidence = readStrictTaskAttemptEvidence(home, request.requestId);
          const outcome = terminalOutcomeFromEvidence(
            refs,
            evidence,
            request.requestId,
            "retained",
            finalization.error,
          );
          if (outcome === undefined) throw new Error(finalization.error);
          return { standing: "terminal", outcome };
        }
        throw new Error(finalization.error);
      }
      return {
        standing: "terminal",
        outcome: terminalOutcome(
          request,
          refs,
          finalization.settlement,
          "released",
          undefined,
          finalization.finalRecord,
        ),
      };
    } catch (error) {
      // Any post-claim failure before the shared finalization ran: retain the
      // truthful runner-failed outcome, release the exact claim, and surface
      // the original refusal. No Cell final is ever synthesized. Once the
      // shared finalization ran, it owns the terminal evidence and the claim:
      // an unresolved finalization keeps the exact lease so reconcile-attempt
      // can retry the exact finalization.
      if (!finalizationAttempted) {
        if (!existsSync(refs.settlementPath)) {
          try {
            taskRunHelpers().writeTaskRunSettlement(refs, {
              taskId: request.taskId,
              taskRevision: request.taskRevision,
              attemptId: request.requestId,
              status: "runner-failed",
              error: errorMessage(error),
            });
          } catch {
            // The original failure stays primary.
          }
        }
        if (lease !== undefined) {
          try {
            (dependencies.releaseLease ?? releaseWorktreeWriterLease)(lease);
          } catch {
            // Release failure stays visible through reconcile; never mask the original error.
          }
          lease = undefined;
        }
      }
      throw error;
    }
  } finally {
    registry?.unregister(request.requestId);
  }
}

function settleRefusal(
  refs: RunEvidenceRefs,
  request: RunRequest,
  error: unknown,
): void {
  if (existsSync(refs.settlementPath)) return;
  try {
    taskRunHelpers().writeTaskRunSettlement(refs, {
      taskId: request.taskId,
      taskRevision: request.taskRevision,
      attemptId: request.requestId,
      status: "runner-failed",
      error: errorMessage(error),
    });
  } catch {
    // The original failure stays primary.
  }
}

function convergedRunResult(home: string, request: RunRequest): RunResult {
  const evidence = readStrictTaskAttemptEvidence(home, request.requestId);
  if (evidence.standing === "unavailable" || evidence.standing === "invalid") {
    throw new Error(
      `Run ${request.requestId} retains no usable evidence for identical replay convergence: `
      + `${evidence.standing === "invalid" ? evidence.error ?? "invalid" : "unavailable"}`,
    );
  }
  // The full canonical refs (paths plus stable refs) stay the retained
  // evidence surface of one Run; the strict reader's ref-only projection is
  // never substituted where the exact path fields are required.
  const refs = taskRunHelpers().attemptEvidence(home, request.requestId);
  const cleanup = evidenceCleanupStanding(evidence, request.requestId);
  if (evidence.settlement !== undefined) {
    const outcome = terminalOutcomeFromEvidence(refs, evidence, request.requestId, cleanup);
    if (outcome !== undefined) return { standing: "terminal", outcome };
  }
  return {
    standing: "unresolved",
    refs,
    error:
      `the identical request converges on Run ${request.requestId} without a retained terminal settlement; liveness is unknown`,
  };
}

function executeOnce(
  execute: NonNullable<OrdinaryRunDependencies["execute"]>,
  cellInput: CellInput,
  signal: AbortSignal,
): Promise<
  | { readonly status: "final"; readonly record: CellRunRecord }
  | { readonly status: "failed"; readonly error: string }
> {
  return Promise.resolve()
    .then(() => execute(cellInput, { signal }))
    .then(
      (record) => ({ status: "final" as const, record }),
      (error) => ({ status: "failed" as const, error: errorMessage(error) }),
    );
}

function defaultRunFinalize(input: RunFinalizationInput): RunFinalization {
  if (input.card === undefined) {
    throw new Error("the shared finalization requires the resolved worker card");
  }
  return taskRunHelpers().finalizeTaskAttempt({
    attempt: input.refs,
    expectedInput: input.expectedInput,
    task: input.task,
    attemptId: input.runId,
    lease: input.lease,
    outcome: input.outcome,
    ...(input.controlRef !== undefined ? { controlRef: input.controlRef } : {}),
    // The exact execution identity is rebuilt with the absent reasoning
    // effort omitted (never passed as undefined) so the requested identity
    // stays assignable to the shared finalization's exact type.
    execution: {
      driver: input.execution.driver,
      model: input.execution.model,
      ...(input.execution.reasoningEffort !== undefined
        ? { reasoningEffort: input.execution.reasoningEffort }
        : {}),
    },
    card: input.card as never,
  });
}

function terminalOutcome(
  request: RunRequest,
  refs: RunEvidenceRefs,
  settlement: RunSettlementFields,
  cleanup: RunCleanupStanding,
  cleanupError: string | undefined,
  finalRecord: CellRunRecord | undefined,
): RunTerminalOutcome {
  return {
    runId: request.requestId,
    taskId: request.taskId,
    taskRevision: request.taskRevision,
    status: settlement.status,
    ...(settlement.workCellRunId !== undefined ? { workCellRunId: settlement.workCellRunId } : {}),
    ...(settlement.cellStatus !== undefined ? { cellStatus: settlement.cellStatus } : {}),
    ...(settlement.controlRef !== undefined ? { controlRef: settlement.controlRef } : {}),
    ...(settlement.error !== undefined ? { error: settlement.error } : {}),
    cleanup,
    ...(cleanupError !== undefined ? { cleanupError } : {}),
    refs,
    ...(finalRecord !== undefined ? { finalRecord } : {}),
  };
}

/**
 * Read-only standing of one Run, derived only from the canonical evidence
 * family and the exact O3 claim: `unavailable` when the durable request
 * record is missing, `invalid` when retained evidence is untrustworthy,
 * `unresolved` when no terminal settlement exists (liveness unknown), and
 * `terminal` with the retained outcome plus the independent cleanup standing.
 */
export type RunStanding =
  | { readonly standing: "unavailable" }
  | { readonly standing: "invalid"; readonly error: string; readonly refs: RunEvidenceRefs }
  | {
    readonly standing: "unresolved";
    readonly refs: RunEvidenceRefs;
    readonly cleanup: RunCleanupStanding;
    readonly attempt: { readonly taskId: string; readonly attemptId: string; readonly startedAt: string };
  }
  | { readonly standing: "terminal"; readonly outcome: RunTerminalOutcome };

export function runStanding(home: string, runId: string): RunStanding {
  const evidence = readStrictTaskAttemptEvidence(home, runId);
  if (evidence.standing === "unavailable") return { standing: "unavailable" };
  // The full canonical refs (paths plus stable refs) are retained on every
  // inspectable standing; the strict reader's ref-only projection is never
  // substituted where the exact path fields are required.
  const refs = taskRunHelpers().attemptEvidence(home, runId);
  if (evidence.standing === "invalid") {
    return { standing: "invalid", error: evidence.error ?? "invalid evidence", refs };
  }
  const cleanup = evidenceCleanupStanding(evidence, runId);
  if (evidence.settlement !== undefined) {
    const outcome = terminalOutcomeFromEvidence(refs, evidence, runId, cleanup);
    if (outcome !== undefined) return { standing: "terminal", outcome };
  }
  const attempt = evidence.attempt!;
  return {
    standing: "unresolved",
    refs,
    cleanup,
    attempt: {
      taskId: attempt.taskId,
      attemptId: attempt.attemptId,
      startedAt: attempt.startedAt,
    },
  };
}

function evidenceCleanupStanding(
  evidence: StrictTaskAttemptEvidence,
  runId: string,
): RunCleanupStanding {
  const attempt = evidence.attempt;
  const input = evidence.input;
  if (attempt === undefined || input === undefined) return "uninspectable";
  let worktree: string;
  try {
    worktree = realpathSync(input.workspace.root);
  } catch {
    return "uninspectable";
  }
  try {
    const inspected = inspectRetainedWorktreeWriterLease({
      worktree,
      taskId: attempt.taskId,
      attemptId: runId,
    });
    if (inspected.standing === "absent" || inspected.standing === "different-owner") {
      return "released";
    }
    if (inspected.standing === "exact") return "retained";
    return "uninspectable";
  } catch {
    return "uninspectable";
  }
}

function terminalOutcomeFromEvidence(
  refs: RunEvidenceRefs,
  evidence: StrictTaskAttemptEvidence,
  runId: string,
  cleanup: RunCleanupStanding,
  cleanupError?: string,
): RunTerminalOutcome | undefined {
  const attempt = evidence.attempt;
  const settlement = evidence.settlement;
  if (attempt === undefined || settlement === undefined) return undefined;
  return {
    runId,
    taskId: attempt.taskId,
    taskRevision: attempt.taskRevision,
    status: settlement.status,
    ...(settlement.workCellRunId !== undefined ? { workCellRunId: settlement.workCellRunId } : {}),
    ...(settlement.cellStatus !== undefined ? { cellStatus: settlement.cellStatus } : {}),
    ...(settlement.controlRef !== undefined ? { controlRef: settlement.controlRef } : {}),
    ...(settlement.error !== undefined ? { error: settlement.error } : {}),
    cleanup,
    ...(cleanupError !== undefined ? { cleanupError } : {}),
    refs,
    ...(evidence.finalRecord !== undefined ? { finalRecord: evidence.finalRecord } : {}),
  };
}

export class ReconcileRunRefusal extends Error {
  constructor(
    readonly code:
      | "unknown"
      | "invalid"
      | "unreadable-input"
      | "owner-live"
      | "unproven-owner"
      | "invalid-lease",
    message: string,
  ) {
    super(message);
    this.name = "ReconcileRunRefusal";
  }
}

export interface ReconcileRunResult {
  readonly runId: string;
  readonly outcome: RunTerminalOutcome;
}

export interface ReconcileRunDependencies {
  /** Test seam invoked after inspection and immediately before the exact O3 release. */
  readonly beforeLeaseRelease?: () => void;
  /** Owner-absence proof; defaults to the canonical O3 process check. */
  readonly ownerAbsent?: (pid: number) => boolean;
}

/**
 * Idempotent owner maintenance for one Run. Reconciliation starts no Cell,
 * replays no effect, and mutates no Task. It derives the terminal outcome
 * only from the canonical evidence family — after a shared settlement write
 * the exact family is strictly re-read and required valid with the expected
 * settlement relation before any release or outcome derivation:
 * - a retained exact settlement plus a retained exact claim retries only the
 *   exact O3 release after proving the recorded owner absent (and reports a
 *   terminal outcome with `cleanup: "retained"` when the release still fails);
 * - a retained owner final without a settlement derives the shared normal
 *   settlement from the exact record;
 * - otherwise it retains the truthful interrupted/no-final `runner-failed`
 *   outcome only after the recorded owner is proven absent;
 * - an already-released claim converges on the retained outcome without any
 *   mutation.
 */
export function reconcileRun(
  home: string,
  runId: string,
  dependencies: ReconcileRunDependencies = {},
): ReconcileRunResult {
  const evidence = readStrictTaskAttemptEvidence(home, runId);
  if (evidence.standing === "unavailable") {
    throw new ReconcileRunRefusal("unknown", `Run ${runId} has no retained durable request record`);
  }
  if (evidence.standing === "invalid") {
    throw new ReconcileRunRefusal(
      "invalid",
      `Run ${runId} retains invalid evidence and cannot be reconciled: ${evidence.error ?? "invalid"}`,
    );
  }
  const attempt = evidence.attempt!;
  // The full canonical refs (paths plus stable refs) are retained for every
  // settlement write and outcome; the strict reader's ref-only projection is
  // never substituted where the exact path fields are required.
  const refs = taskRunHelpers().attemptEvidence(home, runId);
  if (evidence.input === undefined) {
    throw new ReconcileRunRefusal(
      "unreadable-input",
      `Run ${runId} has no readable immutable CellInput: ${evidence.refs.inputRef}`,
    );
  }
  let worktree: string;
  try {
    worktree = realpathSync(evidence.input.workspace.root);
  } catch {
    throw new ReconcileRunRefusal(
      "unreadable-input",
      `Run ${runId} CellInput workspace root cannot be resolved: ${evidence.input.workspace.root}`,
    );
  }

  if (evidence.settlement !== undefined) {
    return reconcileSettledRun(runId, evidence, worktree, refs, dependencies);
  }

  const inspected = inspectRetainedWorktreeWriterLease({
    worktree,
    taskId: attempt.taskId,
    attemptId: runId,
  });
  if (inspected.standing === "absent" || inspected.standing === "different-owner") {
    // No retained exact claim proves the recorded owner absent: without a
    // claim the Cell could never have started, but liveness cannot be proven
    // for a Run between request creation and claim acquisition.
    throw new ReconcileRunRefusal(
      "unproven-owner",
      `Run ${runId} retains no exact writer claim and no terminal settlement; the owner cannot be proven absent`,
    );
  }
  if (inspected.standing === "invalid") {
    throw new ReconcileRunRefusal("invalid-lease", inspected.reason);
  }
  if (!(dependencies.ownerAbsent ?? isProcessDefinitelyAbsent)(inspected.pid)) {
    throw new ReconcileRunRefusal(
      "owner-live",
      `Run ${runId} writer-claim owner process ${inspected.pid} is still alive or cannot be proven absent; reconciliation fails closed`,
    );
  }
  const settlementInput = evidence.finalRecord !== undefined
    ? taskRunHelpers().finalRecordSettlementInput(
      attempt.taskId,
      attempt.taskRevision,
      runId,
      evidence.finalRecord,
    )
    : {
      taskId: attempt.taskId,
      taskRevision: attempt.taskRevision,
      attemptId: runId,
      status: "runner-failed" as const,
      error:
        "interrupted before a final Work Cell record was retained; reconciled by the Run owner",
    };
  taskRunHelpers().writeTaskRunSettlement(refs, settlementInput);
  // The shared settlement write is durable, but the pre-write evidence
  // snapshot still carries no settlement and must never derive the terminal
  // outcome. Strictly re-read the exact attempt family and require it to be
  // available and valid with the expected settlement relation before any
  // exact O3 release or outcome derivation happens.
  const settledEvidence = readStrictTaskAttemptEvidence(home, runId);
  if (settledEvidence.standing !== "available" || settledEvidence.settlement === undefined) {
    throw new ReconcileRunRefusal(
      "invalid",
      `Run ${runId} retained no readable valid settlement after the shared settlement write; reconcile fails closed`,
    );
  }
  return reconcileSettledRun(runId, settledEvidence, worktree, refs, dependencies);
}

function reconcileSettledRun(
  runId: string,
  evidence: StrictTaskAttemptEvidence,
  worktree: string,
  refs: RunEvidenceRefs,
  dependencies: ReconcileRunDependencies,
): ReconcileRunResult {
  if (evidence.attempt === undefined || evidence.settlement === undefined) {
    // A settled reconciliation derives its terminal outcome only from the
    // exact attempt record and the durable settlement together; without both,
    // no truthful outcome exists and the reconciliation fails closed instead
    // of projecting an undefined terminal outcome.
    throw new ReconcileRunRefusal(
      "invalid",
      `Run ${runId} retains no usable attempt record and settlement for settled reconciliation; reconcile fails closed`,
    );
  }
  const attempt = evidence.attempt;
  const inspected = inspectRetainedWorktreeWriterLease({
    worktree,
    taskId: attempt.taskId,
    attemptId: runId,
  });
  if (inspected.standing === "absent" || inspected.standing === "different-owner") {
    // The exact release already succeeded (or another writer now owns the
    // Worktree): idempotent convergence without any mutation.
    return {
      runId,
      outcome: terminalOutcomeFromEvidence(refs, evidence, runId, "released")!,
    };
  }
  if (inspected.standing === "invalid") {
    throw new ReconcileRunRefusal("invalid-lease", inspected.reason);
  }
  if (!(dependencies.ownerAbsent ?? isProcessDefinitelyAbsent)(inspected.pid)) {
    throw new ReconcileRunRefusal(
      "owner-live",
      `Run ${runId} writer-claim owner process ${inspected.pid} is still alive or cannot be proven absent; reconciliation fails closed`,
    );
  }
  dependencies.beforeLeaseRelease?.();
  try {
    releaseWorktreeWriterLease({ path: inspected.leasePath, content: inspected.raw });
  } catch (error) {
    // The Run outcome remains terminal; only the O3 cleanup standing is
    // reconcile-required and continues to block another writer.
    return {
      runId,
      outcome: terminalOutcomeFromEvidence(refs, evidence, runId, "retained", errorMessage(error))!,
    };
  }
  return {
    runId,
    outcome: terminalOutcomeFromEvidence(refs, evidence, runId, "released")!,
  };
}

function taskRunHelpers(): typeof import("../task-run") {
  return requireFromHere("../task-run");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isAlreadyExists(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "EEXIST";
}
