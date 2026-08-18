import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { isAbsolute, join, relative } from "node:path";
import { isDeepStrictEqual } from "node:util";
import type {
  CellInput,
  CellRunRecord,
  TraceEvent,
} from "../../../packages/work-cell/src/contracts";
import type { CellHost } from "../../../packages/work-cell/src/host-port";
import type { CellToolSet } from "../../../packages/work-cell/src/tool-port";
import type { WorkerCard, WorkerCatalog } from "../../../packages/work-cell/src/worker-catalog";
import {
  createRossoviaSubWorkerTool,
  ROSSOVIA_SUB_WORKER_TOOL_NAME,
} from "./integrations/rossovia-sub-worker";
import { loadHome, resolveHome, workspaceFor } from "./home";
import {
  acquireWorktreeWriterLease,
  canonicalGitDirectory,
  isProcessDefinitelyAbsent,
  readWorktreeWriterLease,
  releaseWorktreeWriterLease,
  worktreeWriterLeasePath,
  WorktreeWriterLeaseSchema,
  type WorktreeWriterLease,
} from "./orchestration/worktree-writer";
// The exact Git metadata location and the owner-process absence observation
// remain part of the current task-run export surface as bounded
// compatibility aliases over the canonical O3 owner.
export { canonicalGitDirectory, isProcessDefinitelyAbsent };
import {
  reconcileRun,
  // Runtime value import: the compatibility adapter below uses
  // `instanceof ReconcileRunRefusal` to translate typed O2 reconciliation
  // refusals into the frozen historical observable messages.
  ReconcileRunRefusal,
  RunControlRegistry,
  runOrdinaryTaskRun,
  type ReconcileRunResult,
  type RunRequest,
  type RunTerminalOutcome,
} from "./orchestration/run";
import { runCommand } from "./process";
import {
  readStrictTaskAttemptEvidence,
  TaskAttemptIdSchema,
  type ParsedTaskRunAttempt,
  type StrictTaskAttemptEvidence,
  type TaskRunSettlementStatus,
} from "./task-attempts";
import { showPrincipalTask } from "./tasks";
import { requiredGit } from "./workspace";

const ORDINARY_OPENCODE_EXCLUDES = [
  ".git",
  "node_modules",
  "dist",
  "build",
  "target",
  "coverage",
  ".next",
  "outputs",
  ".work-cell",
  ".reasonix",
] as const;

/**
 * Ordinary model-visible command authority is intentionally empty. Exact argv
 * selection is not filesystem confinement when Agent-edited tests or package
 * scripts execute as host code; trusted verification stays outside this loop
 * until a confined check owner exists.
 */
export const ORDINARY_TASK_ALLOWED_COMMANDS = [] as const;

/**
 * Workbench policy identity for the DeepSeek in-process HarnessAgent + Pi
 * adapter. Keep this value local to the control plane: importing the concrete
 * Work Cell adapter would make the Workbench CLI depend on sibling runtime
 * source at module-load time. The integration test locks this protocol value
 * to the driver descriptor without introducing that production dependency.
 */
export const PI_HARNESS_TASK_RUN_ADAPTER = "ai-sdk-harness-pi-v1";

// Ordinary project work must not inherit Work Cell's five-minute probe default;
// this is a broad emergency ceiling rather than a user-facing approval mechanism.
export const ORDINARY_TASK_MAX_DURATION_MS = 30 * 60 * 1_000;

const requireFromHere = createRequire(import.meta.url);

export interface TaskRunArguments {
  id: string;
  /** Worker selected from the current worker policy catalog. */
  workerId: string;
  /** Continue one exact prior attempt lineage instead of starting fresh. */
  continueFromAttemptId?: string;
  /** Optional explicit positive per-run step cap, lowered into the CellInput budget. */
  maxSteps?: number;
}

interface TaskRunDependencies {
  /** Test seam for reproducing drift after initial binding resolution. */
  beforeLeaseAcquire?(): void;
  /** Test seam for worker card resolution; the default reads the current worker policy catalog. */
  resolveWorkerCard?(workerId: string): WorkerCard;
  /**
   * The catalog that binds the resolved worker card to a driver. Defaults to
   * the current worker policy catalog; no opencode-cli fallback exists.
   */
  catalog?: WorkerCatalog;
  /**
   * Execution-form seam: the default derives the catalog AI SDK execution;
   * a conversation-owned carrier supplies its own derivation for the same
   * guarded preparation.
   */
  deriveExecution?(card: WorkerCard): TaskRunExecution;
  /**
   * Test seam replacing the one asynchronous catalog-backed Task Cell
   * execution (WorkerCatalog.createDriver -> runCell).
   */
  executeTaskCell?: TaskCellExecutor;
  /**
   * Optional foreground Run-control bundle: one existing O2 registry plus a
   * publication callback. Used only by the CLI signal adapter; conversation and
   * other callers must not pass this.
   */
  controlBundle?: {
    readonly registry: RunControlRegistry;
    readonly onControlAvailable: (runId: string) => void;
  };
  /**
   * Test-only override for caller-injected CellTools forwarded to the parent
   * Work Cell. Receives the Run identity and the shared registry so the tool
   * can correlate its effects to the exact Run and stop any child Runs it
   * creates. The child Run itself receives no tools. Production callers should
   * omit this and rely on the default `sub_worker` tool injected when a
   * `controlBundle` is supplied.
   */
  createCellTools?: (context: { runId: string; registry: RunControlRegistry }) => CellToolSet;
}

/** One execution request as retained on the attempt record. */
export interface TaskRunExecution {
  driver: string;
  model: string;
  reasoningEffort?: string;
}

export interface TaskRunResult {
  version: "rosso.task-run-result.v1";
  taskId: string;
  taskRevision: number;
  sourceRevision: number;
  attemptId: string;
  inputRef: string;
  finalRecordRef: string;
  attemptRef: string;
  settlementRef: string;
  workCellRunId: string;
  cellStatus: CellRunRecord["status"];
  /**
   * Harness/legacy session id observed in the Work Cell final record, when
   * one exists. Observation only; ordinary continuation authority is exact
   * prior-attempt lineage, never a session id.
   */
  sessionId?: string;
  semanticAcceptance: "not-evaluated";
}

export interface TaskAttemptReconcileArguments {
  id: string;
  attemptId: string;
}

export interface TaskAttemptReconcileResult {
  version: "rosso.task-attempt-reconcile.v1";
  taskId: string;
  taskRevision: number;
  attemptId: string;
  settlementRef: string;
  status: TaskRunSettlementStatus;
  workCellRunId?: string;
  cellStatus?: string;
  error?: string;
}

/**
 * The shared normal settlement derivation for one validated owner-backed
 * Work Cell final record: a passed run records normally, any other terminal
 * status settles runner-failed with the retained run/status evidence. The
 * ordinary CLI run, a conversation-owned carrier, and crash
 * reconcile-attempt finalization all derive the same append-only settlement
 * from the same owner evidence; nothing is forged or copied.
 */
export function finalRecordSettlementInput(
  taskId: string,
  taskRevision: number,
  attemptId: string,
  record: CellRunRecord,
): TaskRunSettlementInput {
  const base = {
    taskId,
    taskRevision,
    attemptId,
    workCellRunId: record.runId,
    cellStatus: record.status,
  };
  return record.status === "passed"
    ? { ...base, status: "recorded" }
    : {
        ...base,
        status: "runner-failed",
        error: record.error ?? `the Work Cell run settled with status ${record.status}`,
      };
}

/**
 * Reconcile one crash-retained ordinary task attempt through the canonical
 * O2 Run owner (`reconcileRun`). This function is the Task-selector and
 * result-shape compatibility adapter over the canonical owner: it validates
 * the exact Task attribution and the legacy attempt-id shape, translates the
 * typed O2 reconciliation refusals into the frozen historical messages, and
 * re-projects the O2 terminal outcome into the legacy
 * `rosso.task-attempt-reconcile.v1` result shape. It never independently
 * writes a settlement and never releases an O3 claim: every durable mutation
 * and every exact lease release happen inside the canonical owner, which
 * re-reads the strict attempt family (request record, CellInput, final
 * record, control receipt, settlement) and the exact task/attempt/worktree
 * claim bytes in the bound Worktree's Git metadata, and fails closed on a
 * live or unknown owner, mismatched identity, changed or missing lease, or
 * invalid evidence. Three exact finalizations exist, and each releases the
 * still-exact lease only after a durable settlement exists:
 * - an existing exact settlement plus a still-exact dead-owner lease retries
 *   only the lease release (idempotent finalization of a crash between
 *   settlement write and release);
 * - a durable stop receipt (with or without a retained cancelled final)
 *   derives the `control-stopped` settlement without redispatching control;
 * - a real owner final record without a settlement validates the final
 *   record against the immutable input and derives the shared normal
 *   settlement from it;
 * - neither retained terminal evidence settles `runner-failed` with a
 *   truthful interrupted/no-final reason.
 * It never forges a Work Cell final status, usage, diff, verification, or
 * session identity and moves no Task lifecycle; it enables only a fresh clean
 * run (or, once an owner-backed final record exists, normal continuation),
 * never an automatic retry.
 */
export function reconcilePrincipalTaskAttempt(
  homeArgument: string | undefined,
  arguments_: TaskAttemptReconcileArguments,
): TaskAttemptReconcileResult {
  if (!TaskAttemptIdSchema.safeParse(arguments_.attemptId).success) {
    throw new Error("task reconcile-attempt --attempt must be a valid attempt id");
  }
  const home = resolveHome(homeArgument);
  const observed = showPrincipalTask(home, arguments_.id);
  const task = observed.task;
  const attempt = attemptEvidence(home, arguments_.attemptId);
  const evidence = readStrictTaskAttemptEvidence(home, arguments_.attemptId);
  if (evidence.standing === "unavailable") {
    throw new Error(`attempt ${arguments_.attemptId} has no retained attempt evidence: ${attempt.attemptPath}`);
  }
  if (evidence.standing === "invalid") {
    throw new Error(`attempt ${arguments_.attemptId} retains invalid evidence and cannot be reconciled: ${evidence.error}`);
  }
  const attemptRecord = evidence.attempt!;
  if (attemptRecord.taskId !== task.id) {
    throw new Error(`attempt ${arguments_.attemptId} belongs to task ${attemptRecord.taskId}, not the requested task ${task.id}`);
  }
  let result: ReconcileRunResult;
  try {
    result = reconcileRun(home, arguments_.attemptId);
  } catch (error: unknown) {
    if (error instanceof ReconcileRunRefusal) {
      throwLegacyReconcileRefusal(
        error,
        home,
        arguments_,
        attempt,
        attemptRecord,
        evidence,
      );
    }
    throw error;
  }
  return reconcileResult(attempt, attemptRecord, result.outcome);
}

/**
 * Translate one typed O2 reconciliation refusal into the frozen historical
 * observable messages. `unproven-owner` and `invalid-lease` refusals are
 * translated through the exact O3 retained-claim read, which inspects only
 * and never writes or releases the claim.
 */
function throwLegacyReconcileRefusal(
  refusal: ReconcileRunRefusal,
  home: string,
  arguments_: TaskAttemptReconcileArguments,
  attempt: AttemptEvidence,
  attemptRecord: ParsedTaskRunAttempt,
  evidence: StrictTaskAttemptEvidence,
): never {
  if (refusal.code === "unknown") {
    throw new Error(`attempt ${arguments_.attemptId} has no retained attempt evidence: ${attempt.attemptPath}`);
  }
  if (refusal.code === "invalid") {
    throw new Error(
      `attempt ${arguments_.attemptId} retains invalid evidence and cannot be reconciled: ${refusal.message}`,
    );
  }
  if (refusal.code === "unreadable-input") {
    throw new Error(`attempt ${arguments_.attemptId} has no readable immutable CellInput: ${attempt.inputPath}`);
  }
  if (refusal.code === "owner-live") {
    throw new Error(
      `the task-run lease owner process ${refusal.pid ?? "unknown"} for attempt ${arguments_.attemptId} `
      + "is still alive or owned elsewhere; reconciliation fails closed",
    );
  }
  if (refusal.code === "unproven-owner" || refusal.code === "invalid-lease") {
    const worktree = reconcileLegacyWorktree(home, arguments_.attemptId, attemptRecord, evidence);
    readRetainedTaskRunLease(
      worktreeWriterLeasePath(worktree),
      attemptRecord.taskId,
      arguments_.attemptId,
      worktree,
    );
  }
  throw new Error(refusal.message);
}

/** The exact claim-owner Worktree for the legacy refusal translation. */
function reconcileLegacyWorktree(
  home: string,
  attemptId: string,
  attemptRecord: ParsedTaskRunAttempt,
  evidence: StrictTaskAttemptEvidence,
): string {
  const root = attemptRecord.worktree ?? evidence.input?.workspace.root;
  if (root === undefined) {
    throw new Error(`attempt ${attemptId} has no readable immutable CellInput: ${attemptEvidence(home, attemptId).inputPath}`);
  }
  try {
    return realpathSync(root);
  } catch {
    throw new Error(`attempt ${attemptId} CellInput workspace root cannot be resolved: ${root}`);
  }
}

function reconcileResult(
  attempt: AttemptEvidence,
  attemptRecord: ParsedTaskRunAttempt,
  outcome: RunTerminalOutcome,
): TaskAttemptReconcileResult {
  return {
    version: "rosso.task-attempt-reconcile.v1",
    taskId: attemptRecord.taskId,
    taskRevision: attemptRecord.taskRevision,
    attemptId: attemptRecord.attemptId,
    settlementRef: attempt.settlementRef,
    status: outcome.status,
    ...(outcome.workCellRunId === undefined ? {} : { workCellRunId: outcome.workCellRunId }),
    ...(outcome.cellStatus === undefined ? {} : { cellStatus: outcome.cellStatus }),
    ...(outcome.error === undefined ? {} : { error: outcome.error }),
  };
}

/**
 * Compatibility reader over the canonical O3 writer-claim validation:
 * reconcile reads the retained claim through the exact O3 owner identity
 * check; the observable refusal messages are the frozen O3 surface.
 */
function readRetainedTaskRunLease(
  leasePath: string,
  taskId: string,
  attemptId: string,
  worktree: string,
): { pid: number; raw: string } {
  return readWorktreeWriterLease(leasePath, { taskId, attemptId, worktree });
}

/**
 * The shared owner-backed relation between one attempt and the exact
 * retained task-run lease, located from the strict immutable attempt
 * CellInput's workspace root — never from the Task's current rebindable
 * worktreePath, so a legal X→Y Task rebind neither hides nor redirects
 * attempt A's retained exact lease in X. The lease location, schema, and
 * owner identity now come from the canonical O3 worktree-writer owner.
 * `retained` means the exact lease
 * file still exists for this attempt's owner identity (or exists but cannot
 * be proven to belong to a different attempt); `released` means the lease
 * file is absent or provably belongs to another attempt; `uninspectable`
 * means the immutable attempt evidence relation itself cannot be re-read. A
 * valid settlement plus a retained lease for the same attempt is
 * reconcile-required — never terminal — until the exact release succeeds.
 */
export type AttemptLeaseStanding = "released" | "retained" | "uninspectable";

export function attemptLeaseStanding(
  homeArgument: string | undefined,
  taskId: string,
  attemptId: string,
): AttemptLeaseStanding {
  const evidence = readStrictTaskAttemptEvidence(homeArgument, attemptId);
  if (evidence.standing !== "available") return "uninspectable";
  const attempt = evidence.attempt;
  const input = evidence.input;
  if (attempt === undefined || input === undefined) return "uninspectable";
  if (attempt.taskId !== taskId) return "uninspectable";
  // The entire immutable-root inspection — realpath, the exact Git metadata
  // directory, and the lease read — is guarded: a root that still exists but
  // is no longer a Git Worktree projects uninspectable, never a throw.
  let leasePath: string;
  try {
    const worktree = realpathSync(input.workspace.root);
    leasePath = worktreeWriterLeasePath(worktree);
  } catch {
    return "uninspectable";
  }
  if (!existsSync(leasePath)) return "released";
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(leasePath, "utf8"));
  } catch {
    return "retained";
  }
  const parsed = WorktreeWriterLeaseSchema.safeParse(value);
  if (!parsed.success) return "retained";
  if (parsed.data.taskId !== taskId || parsed.data.attemptId !== attemptId) {
    return "released";
  }
  return "retained";
}

export interface TaskWorkerListResult {
  version: "rosso.task-worker-list.v1";
  workers: Array<{
    id: string;
    labels: string[];
    description: string;
    provider: string;
    model: string;
    reasoningEffort: string;
    availability: WorkerCard["availability"];
  }>;
}

export function listPrincipalTaskWorkers(
  environment: NodeJS.ProcessEnv = process.env,
): TaskWorkerListResult {
  return {
    version: "rosso.task-worker-list.v1",
    workers: currentWorkerPolicy().currentWorkerCards(environment).map((card) => ({
      id: card.id,
      labels: [...card.labels],
      description: card.description,
      provider: card.executionProfile.provider,
      model: card.executionProfile.model,
      reasoningEffort: card.executionProfile.reasoningEffort ?? "provider-default",
      availability: structuredClone(card.availability),
    })),
  };
}

/** One asynchronous catalog-backed Task Cell execution request. */
export interface TaskCellExecutionInput {
  catalog: WorkerCatalog;
  cellInput: CellInput;
  /**
   * The caller-injected host port for this Task Cell. The O2 ordinary path
   * always injects the local adapter over its O3-authorized bound Worktree;
   * the field stays overridable only for the test seam.
   */
  host?: CellHost;
  signal?: AbortSignal;
  onTrace?: (event: TraceEvent) => void;
  /**
   * Optional caller-injected CellTool set forwarded to runCell. A parent Run
   * passes its sub_worker tool here so the child Cell can observe it; a
   * read-only child Run receives no tools so it cannot create a second-layer
   * sub_worker.
   */
  tools?: CellToolSet;
}

export type TaskCellExecutor = (input: TaskCellExecutionInput) => Promise<CellRunRecord>;

export type TaskCellOutcome =
  | { status: "final"; record: CellRunRecord }
  | { status: "failed"; error: string };

/**
 * The one asynchronous catalog-backed Task Cell owner shared by the ordinary
 * CLI run and the conversation carrier: WorkerCatalog.createDriver ->
 * driver.run via runCell, never a spawned harness process or a second
 * execution pathway. A run that produces a terminal record (including a
 * failed or cancelled cell) is `final`; a run that throws before a record is
 * `failed` with the visible error.
 */
export async function executeTaskCellRun(
  catalog: WorkerCatalog,
  cellInput: CellInput,
  options: {
    host?: CellHost;
    signal?: AbortSignal;
    onTrace?: (event: TraceEvent) => void;
    tools?: CellToolSet;
  } = {},
): Promise<TaskCellOutcome> {
  try {
    // The one shared Task Cell execution owner. The run-cell module is loaded
    // lazily so a minimal Workbench-only CLI fixture (without the Work Cell
    // sibling package) can still load for setup and other local commands.
    // The host port is explicit caller injection: the O2 ordinary path
    // supplies the local adapter bound to its O3-authorized Worktree, and
    // runCell never constructs a filesystem or process on its own.
    const host = options.host ?? workCellWorkspace().createLocalHost();
    const record = await workCellRunCell().runCell(cellInput, catalog.createDriver(cellInput), {
      host,
      ...(options.signal ? { signal: options.signal } : {}),
      ...(options.onTrace ? { onTrace: options.onTrace } : {}),
      ...(options.tools ? { tools: options.tools } : {}),
    });
    return { status: "final", record };
  } catch (error) {
    return { status: "failed", error: errorMessage(error) };
  }
}

export interface TaskAttemptFinalizationInput {
  attempt: AttemptEvidence;
  /** The immutable CellInput the retained final record must embed exactly. */
  expectedInput: CellInput;
  task: { id: string; revision: number };
  attemptId: string;
  /**
   * The exact O3 writer claim to release after the durable settlement. Absent
   * for read-only Runs, which never acquire a claim.
   */
  lease?: TaskRunLease;
  outcome: TaskCellOutcome;
  /** Durable control receipt ref when a work_control stop settled this attempt. */
  controlRef?: string;
  /** The exact requested execution identity the retained final record must match. */
  execution: TaskRunExecution;
  /** The catalog card that authorized the run. */
  card: WorkerCard;
}

export type TaskAttemptFinalization =
  | { status: "finalized"; settlement: TaskRunSettlementInput; finalRecord?: CellRunRecord }
  | { status: "unresolved"; error: string };

/**
 * The shared terminal finalization owner for every ordinary task run — the
 * CLI run, the conversation carrier, and reconcile-attempt's derivation — in
 * the canonical final record -> settlement -> lease release order. It never
 * forges usage, session, or diff evidence: a malformed, mismatched, or
 * driver-inconsistent final record settles runner-failed without terminal
 * claims, and a retention failure surfaces an `unresolved` standing with the
 * exact lease retained so reconcile-attempt can retry the exact finalization.
 */
export function finalizeTaskAttempt(input: TaskAttemptFinalizationInput): TaskAttemptFinalization {
  // 1. Validate the produced record against the immutable CellInput and the
  //    exact requested execution identity before anything is retained: a
  //    malformed or mismatched final settles runner-failed without terminal
  //    claims and is never written as attempt evidence.
  let record: CellRunRecord | undefined;
  if (input.outcome.status === "final") {
    try {
      record = validateFinalRecord(
        input.outcome.record,
        input.expectedInput,
        input.execution,
        input.card,
      );
    } catch (error) {
      // Requested/observed mismatch stays visible: runner-failed without
      // terminal claims, never a fabricated relation to an invalid record.
      return settleAndReleaseTaskAttempt({
        ...input,
        settlement: {
          taskId: input.task.id,
          taskRevision: input.task.revision,
          attemptId: input.attemptId,
          status: "runner-failed",
          error: errorMessage(error),
        },
      });
    }
  }
  // 2. Retain the validated final record byte-exactly (canonical order:
  //    final record -> settlement -> lease release).
  if (record !== undefined) {
    try {
      writeImmutableJson(input.attempt.finalRecordPath, record);
    } catch (error) {
      return { status: "unresolved", error: `terminal evidence retention failed: ${errorMessage(error)}` };
    }
  }
  // 3. Derive the canonical settlement from the validated owner evidence.
  const settlement: TaskRunSettlementInput = input.controlRef !== undefined
    ? {
        taskId: input.task.id,
        taskRevision: input.task.revision,
        attemptId: input.attemptId,
        status: "control-stopped",
        controlRef: input.controlRef,
        ...(record === undefined ? {} : { workCellRunId: record.runId, cellStatus: record.status }),
      }
    : record !== undefined
      ? finalRecordSettlementInput(input.task.id, input.task.revision, input.attemptId, record)
      : {
          taskId: input.task.id,
          taskRevision: input.task.revision,
          attemptId: input.attemptId,
          status: "runner-failed",
          error: input.outcome.status === "failed"
            ? input.outcome.error
            : "the Work Cell run failed without a retained final record",
        };
  return settleAndReleaseTaskAttempt({ ...input, settlement });
}

/** Durable settlement first; the exact lease release only after it exists. */
function settleAndReleaseTaskAttempt(
  input: TaskAttemptFinalizationInput & { settlement: TaskRunSettlementInput },
): TaskAttemptFinalization {
  try {
    writeTaskRunSettlement(input.attempt, input.settlement);
  } catch (error) {
    return { status: "unresolved", error: `terminal evidence retention failed: ${errorMessage(error)}` };
  }
  if (input.lease !== undefined) {
    try {
      releaseWorktreeLease(input.lease);
    } catch (error) {
      return {
        status: "unresolved",
        error:
          "the durable settlement was retained but the task-run lease could not be released: "
          + `${errorMessage(error)}; task reconcile-attempt can retry the exact finalization`,
      };
    }
  }
  return {
    status: "finalized",
    settlement: input.settlement,
    ...(input.outcome.status === "final" && input.settlement.workCellRunId !== undefined
      ? { finalRecord: input.outcome.record }
      : {}),
  };
}

/**
 * Validate one produced Work Cell final record against the immutable CellInput
 * and the exact requested execution identity before it can be retained as
 * attempt evidence: cell/input identity, the requested driver adapter, and
 * the worker card's provider/model must all match. Harness/legacy session ids
 * are observation only and are never required, and nothing here forges usage,
 * diff, verification, or session evidence.
 */
function validateFinalRecord(
  record: CellRunRecord,
  expectedInput: CellInput,
  execution: TaskRunExecution,
  card: WorkerCard,
): CellRunRecord {
  if (record.cellId !== expectedInput.id) {
    throw new Error(`Work Cell final record cell id does not match immutable input: ${record.cellId}`);
  }
  if (!isDeepStrictEqual(record.input, expectedInput)) {
    throw new Error("Work Cell final record input does not match immutable CellInput");
  }
  if (record.driver.adapter !== execution.driver) {
    throw new Error(
      `Work Cell final record driver adapter ${record.driver.adapter} does not match the requested execution driver ${execution.driver}`,
    );
  }
  const profile = card.executionProfile;
  if (record.driver.provider !== profile.provider) {
    throw new Error(
      `Work Cell final record provider ${record.driver.provider} does not match worker ${card.id} execution profile provider ${profile.provider}`,
    );
  }
  if (record.driver.model !== execution.model) {
    throw new Error(
      `Work Cell final record driver model ${record.driver.model} does not match the requested model ${execution.model}`,
    );
  }
  return record;
}

/**
 * Run one ordinary task through the one canonical O2 Run owner
 * (`orchestration/run.ts`) over the existing attempt evidence family: one
 * durable Run identity before O3 acquisition, at most one unchanged Work
 * Cell through the shared catalog-backed executor, and one truthful terminal
 * settlement in the canonical final record -> settlement -> lease release
 * order. The CLI dispatch is asynchronous in-process; it never spawns an
 * opencode-cli harness process.
 */
export async function runPrincipalTask(
  homeArgument: string | undefined,
  arguments_: TaskRunArguments,
  dependencies: TaskRunDependencies = {},
): Promise<TaskRunResult> {
  const resolved = resolveOrdinaryTaskRun(homeArgument, arguments_, dependencies);
  const { home, task, observed, worktree, execution, continuation, card, projectId } = resolved;
  const host = workCellWorkspace().createLocalHost();
  let catalog: WorkerCatalog | undefined;
  const getCatalog = (): WorkerCatalog => {
    if (catalog === undefined) catalog = dependencies.catalog ?? currentCatalog();
    return catalog;
  };
  const request: RunRequest = {
    requestId: randomUUID(),
    taskId: task.id,
    taskRevision: task.revision,
    sourceRevision: observed.sourceRevision,
    workerId: card.id,
    execution,
    worktree,
    ...(continuation === undefined ? {} : { continuation }),
    ...(arguments_.maxSteps === undefined ? {} : { maxSteps: arguments_.maxSteps }),
  };
  const parentCellTools = (() => {
    if (dependencies.controlBundle === undefined) return undefined;
    if (dependencies.createCellTools !== undefined) {
      return dependencies.createCellTools({
        runId: request.requestId,
        registry: dependencies.controlBundle.registry,
      });
    }
    return {
      // The parent Run injects a hard cap of one into the sub_worker
      // closure: the first invocation admits one read-only child Run, and
      // every later invocation for the same parent is refused before any
      // asynchronous child preparation or evidence creation.
      [ROSSOVIA_SUB_WORKER_TOOL_NAME]: createRossoviaSubWorkerTool({
        home,
        parentRunId: request.requestId,
        taskId: task.id,
        taskRevision: task.revision,
        sourceRevision: observed.sourceRevision,
        worktree,
        ...(request.maxSteps === undefined ? {} : { maxSteps: request.maxSteps }),
        catalog: getCatalog(),
        host,
        registry: dependencies.controlBundle.registry,
        // The parent Run injects a hard cap of one through the explicit
        // admission envelope: the first sub_worker invocation consumes the
        // single admission synchronously, and every later invocation for the
        // same parent is refused before any asynchronous child preparation or
        // evidence creation.
        admission: { remaining: 1 },
        buildChildCellInput: (childRunId, workerId, prompt) =>
          buildReadOnlyChildCellInput(task, worktree, getCatalog().card(workerId), childRunId, prompt, request.maxSteps),
      }),
    };
  })();
  const result = await runOrdinaryTaskRun(home, request, {
    // The pre-claim seam is omitted when absent: never passed as undefined.
    ...(dependencies.beforeLeaseAcquire === undefined
      ? {}
      : { beforeLeaseAcquire: dependencies.beforeLeaseAcquire }),
    ...(dependencies.controlBundle === undefined
      ? {}
      : {
          registry: dependencies.controlBundle.registry,
          onControlAvailable: dependencies.controlBundle.onControlAvailable,
        }),
    card,
    revalidate: () => {
      verifyTaskSnapshotAfterLease(home, observed);
      verifyCurrentBinding(home, projectId, worktree);
      if (continuation !== undefined) {
        verifyContinuationDiff(worktree, continuation.workspaceDiff);
      } else {
        verifyCleanStatus(worktree);
      }
    },
    lowerCellInput: () => buildTaskCellInput(task, worktree, card.id, card, request.requestId, request.maxSteps),
    execute: async (cellInput, options) => {
      const executor = dependencies.executeTaskCell ?? defaultTaskCellExecutor;
      return executor({
        catalog: getCatalog(),
        cellInput,
        // The O2 owner constructs the local host adapter for its O3-authorized
        // bound Worktree and injects it explicitly on every attempt.
        host,
        ...(options.signal ? { signal: options.signal } : {}),
        ...(parentCellTools !== undefined && Object.keys(parentCellTools).length > 0
          ? { tools: parentCellTools }
          : {}),
      });
    },
  });
  if (result.standing === "unresolved") {
    throw new Error(result.error);
  }
  const outcome = result.outcome;
  if (outcome.cleanup !== "released") {
    // The durable settlement exists while the exact O3 release failed: the
    // terminal outcome is retained and reconcile-attempt retries only the
    // release, exactly as the historical unresolved finalization.
    throw new Error(
      outcome.cleanupError
      ?? "the durable settlement was retained but the task-run lease could not be released; "
        + "task reconcile-attempt can retry the exact finalization",
    );
  }
  if (outcome.status !== "recorded") {
    throw new Error(
      `the Work Cell run settled with status ${outcome.finalRecord?.status ?? "unknown"}; `
      + `the attempt settlement is ${outcome.status}`
      + `${outcome.error !== undefined ? `: ${outcome.error}` : ""}`,
    );
  }
  const finalRecord = outcome.finalRecord!;
  return {
    version: "rosso.task-run-result.v1",
    taskId: task.id,
    taskRevision: task.revision,
    sourceRevision: observed.sourceRevision,
    attemptId: request.requestId,
    inputRef: outcome.refs.inputRef,
    finalRecordRef: outcome.refs.finalRecordRef,
    attemptRef: outcome.refs.attemptRef,
    settlementRef: outcome.refs.settlementRef,
    workCellRunId: finalRecord.runId,
    cellStatus: finalRecord.status,
    ...(finalRecord.executionObservation.sessionId
      ? { sessionId: finalRecord.executionObservation.sessionId }
      : {}),
    semanticAcceptance: "not-evaluated",
  };
}

function defaultTaskCellExecutor(input: TaskCellExecutionInput): Promise<CellRunRecord> {
  return executeTaskCellRun(input.catalog, input.cellInput, {
    ...(input.host ? { host: input.host } : {}),
    ...(input.signal ? { signal: input.signal } : {}),
    ...(input.onTrace ? { onTrace: input.onTrace } : {}),
    ...(input.tools ? { tools: input.tools } : {}),
  }).then((outcome) => {
    if (outcome.status === "failed") throw new Error(outcome.error);
    return outcome.record;
  });
}

/**
 * The synchronous guarded preparation every ordinary task run performs
 * before any durable Run identity or execution effect: exact worker
 * resolution, canonical Task re-read, project/binding checks, the exact
 * observed Worktree and its current head, and the exact prior-attempt
 * lineage for a requested continuation. A conversation-owned asynchronous
 * catalog carrier reuses the same evidence family and lease through these
 * pieces instead of a parallel task-run database.
 */
export interface PreparedPrincipalTaskRun {
  readonly home: string;
  readonly card: WorkerCard;
  readonly execution: TaskRunExecution;
  readonly observed: ReturnType<typeof showPrincipalTask>;
  readonly task: ReturnType<typeof showPrincipalTask>["task"];
  readonly worktree: string;
  readonly attemptId: string;
  readonly lease: TaskRunLease;
  /** Exact prior-attempt lineage for a stateless continuation, when requested. */
  readonly continuation?: {
    continuedFromAttemptId: string;
    workspaceDiff: CellRunRecord["workspaceDiff"];
  };
}

export function preparePrincipalTaskRun(
  homeArgument: string | undefined,
  arguments_: TaskRunArguments,
  dependencies: TaskRunDependencies = {},
): PreparedPrincipalTaskRun {
  const resolved = resolveOrdinaryTaskRun(homeArgument, arguments_, dependencies);
  const attemptId = randomUUID();

  dependencies.beforeLeaseAcquire?.();
  const lease = acquireWorktreeLease(resolved.worktree, resolved.task.id, attemptId);
  try {
    verifyTaskSnapshotAfterLease(resolved.home, resolved.observed);
    verifyCurrentBinding(resolved.home, resolved.projectId, resolved.worktree);
    if (resolved.continuation !== undefined) {
      verifyContinuationDiff(resolved.worktree, resolved.continuation.workspaceDiff);
    } else {
      verifyCleanStatus(resolved.worktree);
    }
    return {
      home: resolved.home,
      card: resolved.card,
      execution: resolved.execution,
      observed: resolved.observed,
      task: resolved.task,
      worktree: resolved.worktree,
      attemptId,
      lease,
      ...(resolved.continuation === undefined ? {} : { continuation: resolved.continuation }),
    };
  } catch (error) {
    releaseWorktreeLease(lease);
    throw error;
  }
}

/**
 * The shared read-only acceptance of one ordinary task run, performed before
 * any durable Run identity: exact worker resolution, the canonical Task
 * re-read and lifecycle/binding checks, the exact observed Worktree with its
 * current head, and the exact prior-attempt lineage walk for a requested
 * continuation. No durable write and no O3 claim happens here; the O2 owner
 * creates the durable Run request record only after this acceptance, and
 * before O3 acquisition. The conversation-owned ordinary carrier resolves
 * the same fresh Task/source/project/Worktree selectors through this exact
 * function so a refused action leaves no Run record and no claim.
 */
export interface ResolvedOrdinaryTaskRun {
  readonly home: string;
  readonly card: WorkerCard;
  readonly execution: TaskRunExecution;
  readonly observed: ReturnType<typeof showPrincipalTask>;
  readonly task: ReturnType<typeof showPrincipalTask>["task"];
  readonly projectId: string;
  readonly worktree: string;
  /** Exact prior-attempt lineage for a stateless continuation, when requested. */
  readonly continuation?: {
    continuedFromAttemptId: string;
    workspaceDiff: CellRunRecord["workspaceDiff"];
  };
}

export function resolveOrdinaryTaskRun(
  homeArgument: string | undefined,
  arguments_: TaskRunArguments,
  dependencies: TaskRunDependencies,
): ResolvedOrdinaryTaskRun {
  validatePolicy(arguments_);
  const home = resolveHome(homeArgument);
  const card = resolveWorkerCard(arguments_.workerId, dependencies);
  const execution = dependencies.deriveExecution
    ? dependencies.deriveExecution(card)
    : deriveTaskRunExecution(card);
  const observed = showPrincipalTask(home, arguments_.id);
  const task = observed.task;
  if (task.lifecycle === "settled") {
    throw new Error(`cannot run settled task ${task.id}; completed tasks are viewable history`);
  }
  if (task.lifecycle !== "open" || task.nextActor !== "agent") {
    throw new Error(`task ${task.id} must be open and assigned to the Agent before it can run`);
  }
  if (task.binding.kind !== "project-context" || task.binding.worktreePath === undefined) {
    throw new Error(`task ${task.id} must be bound to an existing project Worktree before it can run`);
  }

  const projectId = task.binding.projectId;
  const worktree = resolveBoundWorktree(
    home,
    projectId,
    task.binding.worktreePath,
  );
  const worktreeHead = requiredGit(["rev-parse", "HEAD"], worktree);
  if (!/^[0-9a-f]{40}$/u.test(worktreeHead)) {
    throw new Error(`the bound Worktree's current head cannot be read: ${worktree}`);
  }
  const continuation = arguments_.continueFromAttemptId
    ? continuationEvidence(home, task.id, worktree, arguments_.continueFromAttemptId, execution)
    : undefined;
  return {
    home,
    card,
    execution,
    observed,
    task,
    projectId,
    worktree,
    ...(continuation === undefined ? {} : { continuation }),
  };
}

/**
 * Derive one stateless continuation from one exact prior attempt: the
 * anchor's strict attempt evidence family must be fully available, its
 * settlement recorded, its final passed and owner-backed, its immutable
 * CellInput must bind the exact current Worktree, and its retained execution
 * identity (driver/model) must equal the requested one. The cumulative
 * workspaceDiff is the union of the anchor's own final diff with every
 * predecessor's diff along its exact continuedFromAttemptId lineage; a
 * missing, invalid, mismatched, foreign, or cyclic predecessor fails closed
 * and no execution is started.
 */
function continuationEvidence(
  home: string,
  taskId: string,
  worktree: string,
  anchorAttemptId: string,
  execution: TaskRunExecution,
): { continuedFromAttemptId: string; workspaceDiff: CellRunRecord["workspaceDiff"] } {
  const cumulative = {
    added: new Set<string>(),
    changed: new Set<string>(),
    removed: new Set<string>(),
  };
  let currentId: string | undefined = anchorAttemptId;
  const visited = new Set<string>();
  while (currentId !== undefined) {
    if (!TaskAttemptIdSchema.safeParse(currentId).success) {
      throw new Error(
        `continuation lineage attempt id is not a canonical UUID: ${currentId}`,
      );
    }
    if (visited.has(currentId)) {
      throw new Error(`continuation lineage is cyclic at attempt ${currentId}`);
    }
    visited.add(currentId);
    const evidence = readStrictTaskAttemptEvidence(home, currentId);
    if (evidence.standing !== "available") {
      throw new Error(
        `continuation anchor attempt ${anchorAttemptId} has no usable retained evidence at attempt ${currentId}: `
        + `${evidence.error ?? evidence.standing}`,
      );
    }
    const attempt = evidence.attempt!;
    if (attempt.taskId !== taskId) {
      throw new Error(
        `continuation lineage attempt ${currentId} belongs to task ${attempt.taskId}, not the requested task ${taskId}`,
      );
    }
    if (attempt.driver !== execution.driver || attempt.model !== execution.model) {
      throw new Error(
        `continuation lineage attempt ${currentId} was executed with driver ${attempt.driver} model ${attempt.model}; `
        + `the requested execution ${execution.driver} ${execution.model} differs and cannot continue it`,
      );
    }
    const record = evidence.finalRecord;
    const settlement = evidence.settlement;
    if (record === undefined || settlement === undefined || settlement.status !== "recorded" || record.status !== "passed") {
      throw new Error(
        `continuation lineage attempt ${currentId} has no owner-backed passed final: `
        + `${record === undefined ? "no retained Work Cell final record" : `final status ${record.status}, settlement ${settlement?.status ?? "absent"}`}`,
      );
    }
    let root: string;
    try {
      root = realpathSync(record.input.workspace.root);
    } catch {
      throw new Error(`continuation lineage attempt ${currentId} final record workspace root cannot be resolved`);
    }
    if (root !== worktree) {
      throw new Error(
        `continuation lineage attempt ${currentId} belongs to Worktree ${root}, not the task's current bound Worktree ${worktree}`,
      );
    }
    for (const kind of ["added", "changed", "removed"] as const) {
      for (const path of record.workspaceDiff[kind]) cumulative[kind].add(path);
    }
    currentId = attempt.continuation?.continuedFromAttemptId;
  }
  return {
    continuedFromAttemptId: anchorAttemptId,
    workspaceDiff: {
      added: [...cumulative.added].sort(),
      changed: [...cumulative.changed].sort(),
      removed: [...cumulative.removed].sort(),
    },
  };
}

function verifyContinuationDiff(
  worktree: string,
  retained: CellRunRecord["workspaceDiff"],
): void {
  const retainedPaths = new Set([
    ...retained.added,
    ...retained.changed,
    ...retained.removed,
  ]);
  const currentPaths = gitVisiblePaths(worktree);
  const extraPaths = [...currentPaths].filter((path) => !retainedPaths.has(path)).sort();
  if (extraPaths.length > 0) {
    throw new Error(
      `task Worktree has Git-visible paths outside the retained continuation workspace diff union: ${extraPaths.join(", ")}`,
    );
  }
}

function gitVisiblePaths(worktree: string): Set<string> {
  const result = runCommand(
    "git",
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    { cwd: worktree },
  );
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || `git status failed in ${worktree}`);
  }
  if (!result.stdout) return new Set();
  const fields = result.stdout.split("\0");
  if (fields.pop() !== "") throw new Error("Git porcelain v1 -z output was not NUL-terminated");
  const paths = new Set<string>();
  for (let index = 0; index < fields.length; index += 1) {
    const entry = fields[index]!;
    if (entry.length < 4 || entry[2] !== " ") {
      throw new Error("Git porcelain v1 -z output contained an invalid status entry");
    }
    const status = entry.slice(0, 2);
    paths.add(entry.slice(3));
    if (status.includes("R") || status.includes("C")) {
      const source = fields[index + 1];
      if (!source) throw new Error("Git porcelain v1 -z rename entry lacked its source path");
      paths.add(source);
      index += 1;
    }
  }
  return paths;
}

/**
 * Bounded compatibility alias for the canonical O3 writer-claim type. The
 * authoritative owner is the O3 worktree-writer module; this name remains
 * only so current task-run consumers keep compiling, and it grants no new
 * writer authority.
 */
export type TaskRunLease = WorktreeWriterLease;

/**
 * Bounded compatibility alias over the canonical O3 writer-claim acquire.
 * Ordinary Task runs acquire the exact O3 claim; the historical signature
 * and refusal message are retained byte-for-byte.
 */
export function acquireWorktreeLease(
  worktree: string,
  taskId: string,
  attemptId: string,
): TaskRunLease {
  return acquireWorktreeWriterLease(worktree, { taskId, attemptId });
}

export interface AttemptEvidence {
  inputPath: string;
  finalRecordPath: string;
  attemptPath: string;
  settlementPath: string;
  inputRef: string;
  finalRecordRef: string;
  attemptRef: string;
  settlementRef: string;
}

/**
 * Correlation retained on a conversation-owned catalog attempt: the exact
 * durable turn/action identity and the causal source reference reconciliation
 * searches for after a crash. It is evidence only; it changes no Task state.
 */
export interface AttemptCorrelation {
  readonly conversationId: string;
  readonly turnId: string;
  readonly actionId: string;
  readonly sourceRef: string;
}

export function createAttempt(
  home: string,
  task: ReturnType<typeof showPrincipalTask>["task"],
  sourceRevision: number,
  attemptId: string,
  worktree: string,
  workerId: string,
  worker: WorkerCard,
  execution: TaskRunExecution,
  continuation?: { continuedFromAttemptId: string; workspaceDiff: CellRunRecord["workspaceDiff"] },
  correlation?: AttemptCorrelation,
): AttemptEvidence & { expectedCellInput: CellInput } {
  const attempt = attemptEvidence(home, attemptId);
  const cellInput = taskCellInputObject(task, worktree, workerId, worker, attemptId);
  const expectedCellInput = workCellContracts().CellInputSchema.parse(cellInput) as CellInput;
  mkdirSync(join(home, "state", "task-attempts"), { recursive: true });
  mkdirSync(join(home, "state", "task-attempts", attemptId), { recursive: false });
  writeImmutableJson(attempt.inputPath, cellInput);
  writeImmutableJson(attempt.attemptPath, {
    version: "rosso.task-run-attempt.v1",
    taskId: task.id,
    taskRevision: task.revision,
    sourceRevision,
    attemptId,
    inputRef: attempt.inputRef,
    finalRecordRef: attempt.finalRecordRef,
    workerId,
    driver: execution.driver,
    model: execution.model,
    ...(execution.reasoningEffort
      ? { reasoningEffort: execution.reasoningEffort }
      : {}),
    ...(continuation
      ? {
          continuation: {
            continuedFromAttemptId: continuation.continuedFromAttemptId,
            workspaceDiff: continuation.workspaceDiff,
          },
        }
      : {}),
    ...(correlation === undefined ? {} : { correlation }),
    status: "started",
    startedAt: new Date().toISOString(),
  });
  return { ...attempt, expectedCellInput };
}

/**
 * The shared ordinary lowering of one accepted Task snapshot into the
 * immutable CellInput: exact worker identity and execution profile, task
 * objective and corrections as instructions, acceptance, todos when present,
 * the exact Worktree policy, and the emergency duration envelope. The O2
 * ordinary path and the conversation-owned carrier lower the same shape.
 */
export function buildTaskCellInput(
  task: ReturnType<typeof showPrincipalTask>["task"],
  worktree: string,
  workerId: string,
  worker: WorkerCard,
  attemptId: string,
  maxSteps?: number,
): CellInput {
  const cellInput = taskCellInputObject(task, worktree, workerId, worker, attemptId, maxSteps);
  return workCellContracts().CellInputSchema.parse(cellInput) as CellInput;
}

/**
 * Lower one read-only sub_worker child Run into an immutable CellInput. The
 * child reuses the parent Task identity and revisions/worktree, but runs with
 * the model-selected worker card's execution profile, the complete receiver
 * prompt as its intent, and a workspace with whole-Worktree reads and no
 * writes or commands.
 */
export function buildReadOnlyChildCellInput(
  task: ReturnType<typeof showPrincipalTask>["task"],
  worktree: string,
  worker: WorkerCard,
  childRunId: string,
  prompt: string,
  maxSteps?: number,
): CellInput {
  const cellInput = {
    id: `workbench-task-${task.id}-attempt-${childRunId}`,
    workerId: worker.id,
    executionProfile: worker.executionProfile,
    intent: prompt,
    workspace: {
      root: worktree,
      readPaths: ["."],
      writePaths: [] as string[],
      excludePaths: ordinaryOpenCodeExcludes(worktree),
      allowedCommands: [] as string[],
    },
    instructions: [
      "Complete the bounded child task described in the prompt. Do not claim semantic acceptance.",
    ],
    capabilities: [],
    context: [],
    capabilitiesRequired: [],
    acceptance: ["Do not claim semantic acceptance."],
    budget: {
      maxDurationMs: ORDINARY_TASK_MAX_DURATION_MS,
      ...(maxSteps === undefined ? {} : { maxSteps }),
    },
  };
  return workCellContracts().CellInputSchema.parse(cellInput) as CellInput;
}

function taskCellInputObject(
  task: ReturnType<typeof showPrincipalTask>["task"],
  worktree: string,
  workerId: string,
  worker: WorkerCard,
  attemptId: string,
  maxSteps?: number,
): Record<string, unknown> {
  return {
    id: `workbench-task-${task.id}-attempt-${attemptId}`,
    workerId,
    executionProfile: worker.executionProfile,
    intent: task.objective,
    workspace: {
      root: worktree,
      readPaths: ["."],
      writePaths: ["."],
      excludePaths: ordinaryOpenCodeExcludes(worktree),
      allowedCommands: [...ORDINARY_TASK_ALLOWED_COMMANDS],
    },
    instructions: [
      "Complete the current Workbench Task in the bound worktree. Do not claim semantic acceptance.",
      ...task.corrections.map((correction) => correction.statement),
    ],
    capabilities: [],
    context: [],
    capabilitiesRequired: [],
    acceptance: task.acceptance,
    ...(task.todos.length > 0
      ? { tasks: task.todos.map((todo) => ({ subject: todo, description: todo })) }
      : {}),
    budget: {
      maxDurationMs: ORDINARY_TASK_MAX_DURATION_MS,
      ...(maxSteps === undefined ? {} : { maxSteps }),
    },
  };
}

export function attemptEvidence(home: string, attemptId: string): AttemptEvidence {
  const directory = join(home, "state", "task-attempts", attemptId);
  const inputPath = join(directory, "cell-input.json");
  const finalRecordPath = join(directory, "cell-input.run.json");
  const attemptPath = join(directory, "attempt.json");
  const settlementPath = join(directory, "settlement.json");
  return {
    inputPath,
    finalRecordPath,
    attemptPath,
    settlementPath,
    inputRef: evidenceRef(home, inputPath),
    finalRecordRef: evidenceRef(home, finalRecordPath),
    attemptRef: evidenceRef(home, attemptPath),
    settlementRef: evidenceRef(home, settlementPath),
  };
}

/**
 * The shared terminal settlement writer: every ordinary task run — the
 * CLI run and a conversation-owned asynchronous carrier — retains the same
 * append-only settlement shape on the attempt evidence through the shared
 * finalization owner. The terminal attempt settlement is separate evidence
 * from any control receipt and never moves Task lifecycle.
 */
export interface TaskRunSettlementInput {
  readonly taskId: string;
  readonly taskRevision: number;
  readonly attemptId: string;
  readonly status: "recorded" | "runner-failed" | "control-stopped";
  readonly workCellRunId?: string;
  readonly cellStatus?: CellRunRecord["status"];
  readonly controlRef?: string;
  readonly error?: string;
}

export function writeTaskRunSettlement(
  attempt: AttemptEvidence,
  input: TaskRunSettlementInput,
): void {
  writeImmutableJson(attempt.settlementPath, {
    version: "rosso.task-run-settlement.v1",
    taskId: input.taskId,
    taskRevision: input.taskRevision,
    attemptId: input.attemptId,
    inputRef: attempt.inputRef,
    finalRecordRef: attempt.finalRecordRef,
    status: input.status,
    ...(input.workCellRunId === undefined ? {} : { workCellRunId: input.workCellRunId }),
    ...(input.cellStatus === undefined ? {} : { cellStatus: input.cellStatus }),
    ...(input.controlRef === undefined ? {} : { controlRef: input.controlRef }),
    semanticAcceptance: "not-evaluated",
    ...(input.error === undefined ? {} : { error: input.error }),
    settledAt: new Date().toISOString(),
  });
}

export function ordinaryOpenCodeExcludes(worktree: string): string[] {
  const tracked = (requiredGit(["ls-files", "-z"], worktree) ?? "")
    .split("\0")
    .filter(Boolean);
  return ORDINARY_OPENCODE_EXCLUDES.filter((candidate) =>
    !tracked.some((path) => path.split("/").includes(candidate))
  );
}

/**
 * Bounded compatibility alias over the canonical O3 writer-claim release:
 * the exact byte-match refusal and removal stay the frozen O3 surface.
 */
export function releaseWorktreeLease(lease: TaskRunLease): void {
  releaseWorktreeWriterLease(lease);
}



function workCellContracts(): typeof import("../../../packages/work-cell/src/contracts") {
  return requireFromHere("../../../packages/work-cell/src/contracts");
}

function workCellRunCell(): typeof import("../../../packages/work-cell/src/run-cell") {
  return requireFromHere("../../../packages/work-cell/src/run-cell");
}

function workCellWorkspace(): typeof import("../../../packages/work-cell/src/workspace") {
  return requireFromHere("../../../packages/work-cell/src/workspace");
}

// The sibling worker policy is loaded only when worker list/task run actually
// need it, so a minimal Workbench-only CLI fixture (without Autonomy) can still
// load for setup and other local task commands. currentWorkerCards remains the
// single worker policy source; there is no fallback or copied default here.
function currentWorkerPolicy(): typeof import("../../autonomy/src/worker-policy") {
  return requireFromHere("../../autonomy/src/worker-policy");
}

/** The one catalog that binds the resolved worker card to its driver. */
function currentCatalog(environment: NodeJS.ProcessEnv = process.env): WorkerCatalog {
  return currentWorkerPolicy().createCurrentWorkerCatalog(environment);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function validatePolicy(arguments_: TaskRunArguments): void {
  if (!arguments_.workerId.trim()) throw new Error("task run --worker must be a non-empty worker id");
  if (
    arguments_.continueFromAttemptId !== undefined
    && !TaskAttemptIdSchema.safeParse(arguments_.continueFromAttemptId).success
  ) {
    throw new Error("task run --continue must be a valid attempt id");
  }
}

function resolveWorkerCard(
  workerId: string,
  dependencies: TaskRunDependencies,
): WorkerCard {
  if (dependencies.resolveWorkerCard) return dependencies.resolveWorkerCard(workerId);
  const card = currentWorkerPolicy().currentWorkerCards().find((candidate) => candidate.id === workerId);
  if (card === undefined) throw new Error(`unknown worker ${workerId}; run 'rossovia worker list'`);
  if (card.availability.status === "unavailable") {
    throw new Error(`worker ${workerId} is unavailable: ${card.availability.reason}`);
  }
  return card;
}

export function deriveTaskRunExecution(card: WorkerCard): TaskRunExecution {
  const { model, reasoningEffort } = card.executionProfile;
  return {
    // Retain the mechanism, not merely provider/model: a generic AI SDK driver
    // cannot masquerade as the selected in-process HarnessAgent + Pi runtime.
    driver: card.executionProfile.provider === "deepseek"
      ? PI_HARNESS_TASK_RUN_ADAPTER
      : "ai-sdk-v7",
    model,
    ...(reasoningEffort ? { reasoningEffort } : {}),
  };
}

export function resolveBoundWorktree(
  home: string,
  projectId: string,
  configuredWorktree: string,
): string {
  if (!existsSync(configuredWorktree)) {
    throw new Error(`task Worktree does not exist: ${configuredWorktree}`);
  }
  const worktree = realpathSync(configuredWorktree);
  verifyCurrentBinding(home, projectId, worktree);
  return worktree;
}

export function verifyTaskSnapshotAfterLease(
  home: string,
  expected: ReturnType<typeof showPrincipalTask>,
): void {
  const current = showPrincipalTask(home, expected.task.id);
  if (
    current.sourceRevision !== expected.sourceRevision
    || current.task.revision !== expected.task.revision
    || current.task.lifecycle !== expected.task.lifecycle
    || current.task.nextActor !== expected.task.nextActor
    || !isDeepStrictEqual(current.task.binding, expected.task.binding)
  ) {
    throw new Error(
      `task ${expected.task.id} changed before attempt creation after the task-run lease was acquired`,
    );
  }
}

export function verifyCleanStatus(worktree: string): void {
  const status = requiredGit(["status", "--porcelain"], worktree) ?? "";
  if (status.trim()) throw new Error(`task Worktree is not clean: ${worktree}`);
}

export function verifyCurrentBinding(home: string, projectId: string, worktree: string): void {
  const current = loadHome(home);
  const primary = realpathSync(workspaceFor(current.workspaces, projectId).path);
  if (worktree === primary) {
    throw new Error(`task ${projectId} must use an isolated Worktree rather than the primary workspace`);
  }
  const observed = requiredGit(["worktree", "list", "--porcelain"], primary)
    .split(/\r?\n/u)
    .filter((line) => line.startsWith("worktree "))
    .map((line) => realpathSync(line.slice("worktree ".length)));
  if (!observed.includes(worktree)) {
    throw new Error(`task Worktree is not currently bound to registered project ${projectId}: ${worktree}`);
  }
}

export function evidenceRef(home: string, path: string): string {
  const ref = relative(home, path);
  if (!ref || isAbsolute(ref) || ref.split(/[\\/]/u).includes("..")) {
    throw new Error(`task attempt path escapes Rossovia home: ${path}`);
  }
  return ref;
}

export function writeImmutableJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
}
