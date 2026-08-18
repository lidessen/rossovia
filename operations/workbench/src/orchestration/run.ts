import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import type { CellInput, CellRunRecord } from "../../../../packages/work-cell/src/contracts";
import {
  readStrictTaskAttemptEvidence,
  RUN_CONTROL_RECEIPT_VERSION,
  RunControlReceiptSchema,
  type RunControlReceipt,
  type StrictTaskAttemptEvidence,
} from "../task-attempts";
import {
  acquireWorktreeWriterLease,
  inspectRetainedWorktreeWriterLease,
  isProcessDefinitelyAbsent,
  releaseWorktreeWriterLease,
  worktreeWriterLeasePath,
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
  /** Optional explicit positive per-run step cap, lowered into the immutable CellInput budget. */
  maxSteps: z.number().int().positive().optional(),
  /**
   * Run access mode. The omitted legacy value is `ordinary` and effectful:
   * it acquires an exact O3 writer claim and lowers ordinary workspace
   * write/command authority. `read-only` skips O3 acquisition entirely and
   * lowers an immutable CellInput with no write paths and no allowed commands.
   */
  access: z.enum(["ordinary", "read-only"]).optional(),
  /** Exact journal causality when the accepted request came from Conversation. */
  correlation: z.object({
    conversationId: z.string().uuid(),
    turnId: z.string().uuid(),
    actionId: z.string().uuid(),
    sourceRef: z.string().min(1),
  }).strict().optional(),
  /**
   * Parent-tool invocation binding for a read-only child Run: the exact parent
   * Run identity, the provider tool call identity, the complete prompt digest,
   * and the parent tool name. Independent from Conversation correlation.
   */
  parentTool: z.object({
    name: z.string().min(1),
    parentRunId: z.string().uuid(),
    toolCallId: z.string().min(1),
    promptDigest: z.string().regex(/^[a-f0-9]{64}$/),
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
    ...(request.maxSteps !== undefined ? { maxSteps: request.maxSteps } : {}),
    ...(request.access === "read-only" ? { access: request.access } : {}),
    ...(request.correlation !== undefined ? { correlation: request.correlation } : {}),
    ...(request.parentTool !== undefined ? { parentTool: request.parentTool } : {}),
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
 *
 * A conversation-owned Run (the ordinary `task_continue` path, whose
 * committed action UUID is the Run identity) includes its exact
 * journal-owned causal correlation in the canonical request and digest.
 * Replaying the UUID from a different conversation or turn therefore
 * conflicts instead of converging on foreign work.
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
      // The exact canonical Worktree identity is retained BEFORE any O3
      // writer-claim acquisition or mutable preparation, so an inputless
      // Run can still reconcile the exact dead-owner claim.
      worktree: canonicalWorktree(request.worktree),
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
      ...(request.maxSteps !== undefined ? { maxSteps: request.maxSteps } : {}),
      ...(request.access === "read-only" ? { access: request.access } : {}),
      ...(request.parentTool !== undefined ? { parentTool: request.parentTool } : {}),
      status: "started",
      startedAt: new Date().toISOString(),
      requestDigest: digest,
      ...(request.correlation === undefined ? {} : { correlation: request.correlation }),
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
  const retainedRequest = retainedRunRequest(record);
  if (
    retainedRequest !== undefined
    && typeof record.requestDigest === "string"
    && record.requestDigest === digest
    && record.requestDigest === runRequestDigest(retainedRequest)
  ) {
    return { standing: "converged", refs, digest };
  }
  throw new RunRequestConflictError(
    request.requestId,
    `Run ${request.requestId} retains a different request body under the same identity; identical replay is refused`,
  );
}

/** Reconstruct the exact canonical request from the retained request record. */
function retainedRunRequest(record: Record<string, unknown>): RunRequest | undefined {
  const parsed = RunRequestSchema.safeParse({
    requestId: record.attemptId,
    taskId: record.taskId,
    taskRevision: record.taskRevision,
    sourceRevision: record.sourceRevision,
    workerId: record.workerId,
    execution: {
      driver: record.driver,
      model: record.model,
      ...(typeof record.reasoningEffort === "string"
        ? { reasoningEffort: record.reasoningEffort }
        : {}),
    },
    worktree: record.worktree,
    ...(record.continuation === undefined ? {} : { continuation: record.continuation }),
    ...(typeof record.maxSteps === "number" ? { maxSteps: record.maxSteps } : {}),
    ...(record.access === "read-only" ? { access: record.access as "read-only" } : {}),
    ...(record.correlation === undefined ? {} : { correlation: record.correlation }),
    ...(record.parentTool !== undefined ? { parentTool: record.parentTool } : {}),
  });
  return parsed.success ? parsed.data : undefined;
}

/**
 * Strictly re-read a synchronously published request before O2 proceeds.
 * Caller-supplied refs or digests are never trusted: the canonical evidence
 * path is derived from the Run identity, and both the retained body and its
 * stored digest must equal the accepted request.
 */
function readPublishedRunRequestRecord(home: string, request: RunRequest): RunRequestRecordStanding {
  const refs = taskRunHelpers().attemptEvidence(home, request.requestId);
  if (!existsSync(refs.attemptPath)) {
    throw new RunRequestConflictError(
      request.requestId,
      `Run ${request.requestId} has no retained pre-published request record`,
    );
  }
  const digest = runRequestDigest(request);
  const retained = convergeOrConflict(request, digest, refs);
  return { standing: "created", refs: retained.refs, digest: retained.digest };
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

export { RUN_CONTROL_RECEIPT_VERSION, RunControlReceiptSchema } from "../task-attempts";
export type { RunControlReceipt } from "../task-attempts";

/**
 * Stop one exact live Run. The durable control receipt is written BEFORE the
 * abort is dispatched; a failed write changes nothing. Unknown, invalid,
 * already-settled, and non-live (no runtime handle, no terminal settlement)
 * Runs are refused; an existing receipt is reused only for the identical
 * requester AND exact causal source, and a distinct requester or a
 * same-actor different source conflicts.
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
    // The exact request-owned Worktree identity retained before O3
    // acquisition, with the immutable CellInput root as the historical
    // fallback.
    worktree: attempt.worktree ?? evidence.input?.workspace.root ?? "",
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
    // Exact receipt replay compares the full causal request identity already
    // owned by the stop request: the Run id, the requester, AND the exact
    // source reference. Same actor with a different source conflicts; only
    // the exact same source replays the retained receipt.
    if (
      retained !== undefined
      && retained.runId === runId
      && retained.requestedBy === control.requestedBy
      && retained.sourceRef === control.sourceRef
    ) {
      const receiptRef = taskRunHelpers().evidenceRef(home, receiptPath);
      return { runId, control: "stop", receiptRef, settlementRef: retained.settlementRef };
    }
    throw new RunStopRefusal(
      "different",
      `Run ${runId} already has a durable control receipt from a different requester or source; a distinct stop cannot be applied`,
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
  /** Absent for read-only Runs, which never acquire an O3 writer claim. */
  readonly lease?: WorktreeWriterLease;
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
  /**
   * When the caller already durably published the exact Run request record
   * BEFORE any O3 acquisition or mutable preparation (the synchronous
   * publication boundary of a conversation-owned Run), the owner proceeds
   * from that retained record instead of publishing again. O2 derives its
   * path and digest, strictly re-reads the retained body, and refuses any
   * mismatch with `RunRequestConflictError`.
   */
  readonly prePublished?: true;
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
  /**
   * Publication callback invoked exactly after the Run is registered in the
   * supplied `registry` and before the Work Cell is executed. Meaningful only
   * together with `registry`.
   */
  readonly onControlAvailable?: (runId: string) => void;
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
  let created: RunRequestRecordStanding;
  if (dependencies.prePublished === true) {
    created = readPublishedRunRequestRecord(home, request);
  } else {
    created = createRunRequestRecord(home, request);
  }
  if (created.standing === "converged") {
    return convergedRunResult(home, request);
  }
  const refs = created.refs;
  const registry = dependencies.registry;
  const controller = new AbortController();
  let lease: WorktreeWriterLease | undefined;
  let finalizationAttempted = false;
  const readOnly = request.access === "read-only";
  try {
    if (!readOnly) {
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
    }
    try {
      // Mutable preparation happens only after the exact O3 claim; the
      // immutable CellInput is retained before revalidation so a refused Run
      // keeps one exact inspectable input and zero Cell invocations.
      const cellInput = dependencies.lowerCellInput();
      // The lowered CellInput is bound and validated against the accepted
      // durable Run request BEFORE it is persisted or executed: identity,
      // worker, execution profile, Worktree, and maxSteps must match for
      // every run including read-only. The effectful-only O3 lease-path
      // check is separate and runs only when a claim was acquired.
      validateLoweredCellInput(cellInput, request);
      if (lease !== undefined) {
        validateLeaseBindsWorktree(lease, request);
      }
      taskRunHelpers().writeImmutableJson(refs.inputPath, cellInput);
      dependencies.revalidate?.();
      if (registry !== undefined) {
        registry.register(request.requestId, controller);
        dependencies.onControlAvailable?.(request.requestId);
      }
      const outcome = await executeOnce(dependencies.execute, cellInput, controller.signal);
      const controlRef = registry?.receiptRef(request.requestId);
      const finalization = (dependencies.finalize ?? defaultRunFinalize)({
        refs,
        expectedInput: cellInput,
        task: { id: request.taskId, revision: request.taskRevision },
        runId: request.requestId,
        ...(lease !== undefined ? { lease } : {}),
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
      // The terminal result derives only from a strict post-finalization
      // read of the exact attempt family, never from an in-memory projection
      // the strict owner could later reject.
      const retainedEvidence = readStrictTaskAttemptEvidence(home, request.requestId);
      if (
        retainedEvidence.standing === "available"
        && retainedEvidence.settlement !== undefined
      ) {
        const retainedOutcome = terminalOutcomeFromEvidence(
          refs,
          retainedEvidence,
          request.requestId,
          evidenceCleanupStanding(retainedEvidence, request.requestId),
        );
        if (retainedOutcome !== undefined) {
          return { standing: "terminal", outcome: retainedOutcome };
        }
      }
      return {
        standing: "unresolved",
        refs,
        error:
          `Run ${request.requestId} retained a settlement but its terminal evidence was rejected `
          + "by the strict attempt-family read; no truthful terminal outcome is projected",
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
    ...(input.lease !== undefined ? { lease: input.lease } : {}),
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

/**
 * The exact canonical Worktree identity retained by a durable Run request:
 * the resolved root when it exists, else the request's recorded path (which
 * every later read re-resolves and fails closed on).
 */
function canonicalWorktree(root: string): string {
  try {
    return realpathSync(root);
  } catch {
    return root;
  }
}

/**
 * Bind and validate one lowered CellInput against the accepted durable Run
 * request and the exact O3 claim BEFORE it is persisted or executed: the
 * Task/Run-derived Cell identity, the worker and execution profile, the
 * canonical workspace root, and the exact claim path. A mismatch settles a
 * truthful pre-Cell failure with zero Cell invocations and no invented
 * evidence.
 */
function validateLoweredCellInput(
  cellInput: CellInput,
  request: RunRequest,
): void {
  const expectedCellId = `workbench-task-${request.taskId}-attempt-${request.requestId}`;
  if (cellInput.id !== expectedCellId) {
    throw new Error(
      `lowered CellInput id ${cellInput.id} does not bind the exact Run-derived Cell identity ${expectedCellId}`,
    );
  }
  if (cellInput.workerId !== request.workerId) {
    throw new Error(
      `lowered CellInput worker ${cellInput.workerId ?? "unset"} does not match the accepted Run request worker ${request.workerId}`,
    );
  }
  const profile = cellInput.executionProfile;
  if (profile === undefined || profile.id !== request.workerId) {
    throw new Error(
      `lowered CellInput execution profile ${profile?.id ?? "unset"} does not match the accepted Run request worker ${request.workerId}`,
    );
  }
  if (profile.model !== request.execution.model) {
    throw new Error(
      `lowered CellInput execution model ${profile.model} does not match the accepted Run request model ${request.execution.model}`,
    );
  }
  // The requested reasoning effort binds to the lowered execution profile
  // with exact optional-value equality BEFORE the input is persisted or
  // executed: a profile that adds, drops, or changes the effort is a
  // truthful pre-Cell failure with zero Cell invocations.
  if (profile.reasoningEffort !== request.execution.reasoningEffort) {
    throw new Error(
      `lowered CellInput reasoning effort ${profile.reasoningEffort ?? "unset"} does not match the accepted Run request reasoning effort ${request.execution.reasoningEffort ?? "unset"}`,
    );
  }
  let observedRoot: string;
  try {
    observedRoot = realpathSync(cellInput.workspace.root);
  } catch {
    throw new Error(`lowered CellInput workspace root cannot be resolved: ${cellInput.workspace.root}`);
  }
  let expectedRoot: string;
  try {
    expectedRoot = realpathSync(request.worktree);
  } catch {
    throw new Error(`the accepted Run request Worktree cannot be resolved: ${request.worktree}`);
  }
  if (observedRoot !== expectedRoot) {
    throw new Error(
      `lowered CellInput workspace root ${observedRoot} does not match the accepted Run request Worktree ${expectedRoot}`,
    );
  }
  const loweredMaxSteps = cellInput.budget?.maxSteps;
  const requestedMaxSteps = request.maxSteps;
  if (loweredMaxSteps !== requestedMaxSteps) {
    const loweredLabel = loweredMaxSteps === undefined ? "absent" : String(loweredMaxSteps);
    const requestedLabel = requestedMaxSteps === undefined ? "absent" : String(requestedMaxSteps);
    throw new Error(
      `lowered CellInput maxSteps ${loweredLabel} does not match the accepted Run request maxSteps ${requestedLabel}`,
    );
  }
  // Read-only Runs must lower an immutable CellInput with no write paths and
  // no allowed commands before any execution; this is part of the shared
  // lowering validation, not the effectful O3 lease path.
  if (request.access === "read-only") {
    if (cellInput.workspace.writePaths.length > 0) {
      throw new Error("read-only Run lowered CellInput must have no write paths");
    }
    if (cellInput.workspace.allowedCommands.length > 0) {
      throw new Error("read-only Run lowered CellInput must have no allowed commands");
    }
  }
}

/**
 * Effectful-only O3 writer-claim validation: the exact acquired lease
 * must bind the accepted Run request Worktree. Read-only Runs skip this
 * check because they never acquire a claim.
 */
function validateLeaseBindsWorktree(
  lease: WorktreeWriterLease,
  request: RunRequest,
): void {
  if (lease.path !== worktreeWriterLeasePath(request.worktree)) {
    throw new Error(
      `the exact O3 writer claim ${lease.path} does not bind the accepted Run request Worktree`,
    );
  }
}

/** The exact claim-owner Worktree of one reconciled Run: request-owned first, else the immutable input root. */
function reconcileRunWorktree(
  runId: string,
  evidence: StrictTaskAttemptEvidence,
): string {
  const attempt = evidence.attempt!;
  if (attempt.worktree !== undefined) {
    try {
      return realpathSync(attempt.worktree);
    } catch {
      throw new ReconcileRunRefusal(
        "unreadable-input",
        `Run ${runId} request-owned Worktree identity cannot be resolved: ${attempt.worktree}`,
      );
    }
  }
  const input = evidence.input!;
  try {
    return realpathSync(input.workspace.root);
  } catch {
    throw new ReconcileRunRefusal(
      "unreadable-input",
      `Run ${runId} CellInput workspace root cannot be resolved: ${input.workspace.root}`,
    );
  }
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
  if (attempt === undefined) return "uninspectable";
  // A read-only Run never acquires an O3 writer claim, so its cleanup is
  // always released; no lease inspection is required or meaningful.
  if (attempt.access === "read-only") return "released";
  // The request-owned Worktree identity retained before O3 acquisition is the
  // standing source for an inputless Run; historical families fall back to
  // the immutable CellInput workspace root.
  const root = evidence.input?.workspace.root ?? attempt.worktree;
  if (root === undefined) return "uninspectable";
  let worktree: string;
  try {
    worktree = realpathSync(root);
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
    /** The recorded claim owner process when `owner-live` refuses the reconciliation. */
    readonly pid?: number,
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
  if (evidence.input === undefined && attempt.worktree === undefined) {
    throw new ReconcileRunRefusal(
      "unreadable-input",
      `Run ${runId} has no readable immutable CellInput or request-owned Worktree identity: ${refs.inputRef}`,
    );
  }
  // The exact Worktree identity for the retained claim comes from the
  // request-owned attempt field (retained before O3 acquisition) when it
  // exists, else from the strict immutable CellInput's workspace root.
  const worktree = reconcileRunWorktree(runId, evidence);

  if (evidence.settlement !== undefined) {
    return reconcileSettledRun(runId, evidence, worktree, refs, dependencies);
  }

  // A read-only Run never acquires an O3 writer claim, so it does not need
  // owner-absence proof before deriving a truthful no-final settlement from
  // the retained control receipt or final record. It remains unresolved when
  // neither terminal evidence exists.
  if (attempt.access === "read-only") {
    if (evidence.control === undefined && evidence.finalRecord === undefined) {
      throw new ReconcileRunRefusal(
        "unproven-owner",
        `Run ${runId} is a read-only Run with no retained terminal evidence; liveness is unknown`,
      );
    }
    const settlementInput = deriveNoFinalSettlementInput(runId, evidence, refs);
    taskRunHelpers().writeTaskRunSettlement(refs, settlementInput);
    const settledEvidence = readStrictTaskAttemptEvidence(home, runId);
    if (settledEvidence.standing !== "available" || settledEvidence.settlement === undefined) {
      throw new ReconcileRunRefusal(
        "invalid",
        `Run ${runId} retained no readable valid settlement after the shared settlement write; reconcile fails closed`,
      );
    }
    return reconcileSettledRun(runId, settledEvidence, worktree, refs, dependencies);
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
      inspected.pid,
    );
  }
  taskRunHelpers().writeTaskRunSettlement(refs, deriveNoFinalSettlementInput(runId, evidence, refs));
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

function deriveNoFinalSettlementInput(
  runId: string,
  evidence: StrictTaskAttemptEvidence,
  _refs: RunEvidenceRefs,
) {
  const attempt = evidence.attempt!;
  return evidence.control !== undefined
    ? {
      taskId: attempt.taskId,
      taskRevision: attempt.taskRevision,
      attemptId: runId,
      status: "control-stopped" as const,
      controlRef: evidence.controlRef,
      ...(evidence.finalRecord === undefined
        ? {}
        : {
          workCellRunId: evidence.finalRecord.runId,
          cellStatus: evidence.finalRecord.status,
        }),
    }
    : evidence.finalRecord !== undefined
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
  // A read-only Run never acquired an O3 writer claim, so no lease inspection
  // or release is required: cleanup is released by definition.
  if (attempt.access === "read-only") {
    return {
      runId,
      outcome: terminalOutcomeFromEvidence(refs, evidence, runId, "released")!,
    };
  }
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
      inspected.pid,
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

/**
 * One parent-tool sub_worker invocation creates exactly one read-only child
 * Run. The child Run identity is deterministic from the exact parentRunId and
 * the provider toolCallId, and the complete prompt is bound through the
 * parent-tool correlation digest. The child Run reuses the same Task
 * attribution and Worktree root, but its access mode is read-only: it skips
 * O3 acquisition, lowers no write paths and no allowed commands, and receives
 * no injected CellTools, so a second-layer sub_worker is impossible.
 */
export interface ReadOnlyChildRunInput {
  readonly parentRunId: string;
  readonly toolCallId: string;
  readonly taskId: string;
  readonly taskRevision: number;
  readonly sourceRevision: number;
  readonly worktree: string;
  readonly workerId: string;
  readonly prompt: string;
  readonly promptDigest: string;
  /** The parent tool name that invoked the child Run; defaults to sub_worker. */
  readonly parentToolName?: string;
  readonly execution: RunRequest["execution"];
  readonly maxSteps?: number;
}

export interface ReadOnlyChildRunResult {
  readonly childRunId: string;
  readonly outcome: RunTerminalOutcome;
}

export interface ReadOnlyChildRunDependencies {
  readonly lowerCellInput: () => CellInput;
  readonly execute: NonNullable<OrdinaryRunDependencies["execute"]>;
  readonly finalize?: OrdinaryRunDependencies["finalize"];
  readonly card?: unknown;
  readonly registry?: RunControlRegistry;
  readonly onControlAvailable?: (runId: string) => void;
}

/**
 * The Workbench Orchestration neutral one-shot child Run port. A single
 * read-only Run is created, executed, and finalized through the existing O2
 * owners; no second lifecycle, Work Cell orchestration, or O3 claim is
 * introduced.
 */
export async function runReadOnlyChildRun(
  home: string,
  input: ReadOnlyChildRunInput,
  dependencies: ReadOnlyChildRunDependencies,
): Promise<ReadOnlyChildRunResult> {
  const childRunId = deriveChildRunId(input.parentRunId, input.toolCallId);
  const request: RunRequest = {
    requestId: childRunId,
    taskId: input.taskId,
    taskRevision: input.taskRevision,
    sourceRevision: input.sourceRevision,
    workerId: input.workerId,
    execution: input.execution,
    worktree: input.worktree,
    access: "read-only",
    parentTool: {
      name: input.parentToolName ?? "sub_worker",
      parentRunId: input.parentRunId,
      toolCallId: input.toolCallId,
      promptDigest: input.promptDigest,
    },
    ...(input.maxSteps === undefined ? {} : { maxSteps: input.maxSteps }),
  };
  const result = await runOrdinaryTaskRun(home, request, {
    lowerCellInput: dependencies.lowerCellInput,
    execute: dependencies.execute,
    ...(dependencies.finalize === undefined ? {} : { finalize: dependencies.finalize }),
    ...(dependencies.card === undefined ? {} : { card: dependencies.card }),
    ...(dependencies.registry === undefined
      ? {}
      : {
          registry: dependencies.registry,
          ...(dependencies.onControlAvailable === undefined
            ? {}
            : { onControlAvailable: dependencies.onControlAvailable }),
        }),
  });
  if (result.standing === "unresolved") {
    throw new Error(result.error);
  }
  return { childRunId, outcome: result.outcome };
}

/**
 * Deterministically derive a child Run identity from the exact parent Run
 * identity and the provider tool call identity. The result is a valid UUID
 * (RFC 9562 v5) so it satisfies the existing RunRequest schema, while the
 * complete prompt is bound separately through the request digest/correlation.
 */
export function deriveChildRunId(parentRunId: string, toolCallId: string): string {
  const namespace = uuidBytes(ROSSOVIA_SUB_WORKER_NAMESPACE);
  const name = new TextEncoder().encode(`${parentRunId}:${toolCallId}`);
  const hash = createHash("sha1").update(namespace).update(name).digest();
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  return formatUuid(hash.subarray(0, 16));
}

/** Fixed Rossovia sub_worker UUIDv5 namespace; never changes. */
const ROSSOVIA_SUB_WORKER_NAMESPACE = "0191ec12-2de1-7b9e-8f3a-2c9e4d8a1f50";

function uuidBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, "");
  if (hex.length !== 32) throw new Error(`invalid UUID: ${uuid}`);
  const bytes = new Uint8Array(16);
  for (let index = 0; index < 16; index += 1) {
    bytes[index] = parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function formatUuid(bytes: Uint8Array): string {
  if (bytes.length !== 16) throw new Error("UUID must be 16 bytes");
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
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
