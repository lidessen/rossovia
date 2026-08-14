import { createRequire } from "node:module";
import { existsSync, readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { CellInput, CellRunRecord, TraceEvent } from "../../../../packages/work-cell/src/contracts";
import { runCell } from "../../../../packages/work-cell/src/run-cell";
import type { WorkerCard, WorkerCatalog } from "../../../../packages/work-cell/src/worker-catalog";
import type { TaskContinueOperation } from "../../../autonomy/src/conversation-coordinator";
import {
  attemptEvidence,
  attemptLeaseStanding,
  createAttempt,
  evidenceRef,
  finalRecordSettlementInput,
  preparePrincipalTaskRun,
  releaseWorktreeLease,
  writeImmutableJson,
  writeTaskRunSettlement,
  type AttemptCorrelation,
  type PreparedPrincipalTaskRun,
  type TaskRunExecution,
  type TaskRunLease,
} from "../task-run";
import { readStrictTaskAttemptEvidence } from "../task-attempts";
import { PrincipalTaskError } from "../tasks";
import type { PrincipalTask } from "../contracts";
import { loadHome, resolveHome, workspaceFor } from "../home";
import { expandPath } from "../paths";
import { observeWorkspace, requiredGit } from "../workspace";
import { taskActionSourceRef } from "./contracts";

const requireFromHere = createRequire(import.meta.url);

export type ConversationCarrierErrorCode =
  | "task-not-found"
  | "task-settled"
  | "task-not-runnable"
  | "task-not-bound"
  | "stale-revision"
  | "stale-context"
  | "worktree-dirty"
  | "project-unresolved"
  | "worktree-unobserved"
  | "worker-unknown"
  | "worker-unavailable"
  | "lease-conflict"
  | "carrier-duplicate"
  | "carrier-not-found"
  | "carrier-not-live"
  | "carrier-unknown"
  | "control-unsupported"
  | "source-unavailable";

export class ConversationCarrierError extends Error {
  constructor(readonly code: ConversationCarrierErrorCode, message: string) {
    super(message);
    this.name = "ConversationCarrierError";
  }
}

export type CarrierSettlementStatus = "recorded" | "runner-failed" | "control-stopped";

export interface CarrierSettlement {
  readonly status: CarrierSettlementStatus | "unresolved";
  readonly evidenceRefs: readonly string[];
  readonly cellStatus?: CellRunRecord["status"];
  readonly error?: string;
}

export type CarrierLiveness =
  | { readonly state: "live"; readonly runId?: string }
  | { readonly state: "settled"; readonly settlement: CarrierSettlement }
  | { readonly state: "unresolved"; readonly settlement: CarrierSettlement };

export interface ConversationCarrierIdentity {
  /** The exact retained carrier identity; equals the Task attempt id. */
  readonly carrierId: string;
  readonly conversationId: string;
  readonly turnId: string;
  readonly actionId: string;
  readonly taskId: string;
  readonly attemptId: string;
  readonly workerId: string;
  readonly worktree: string;
}

export interface CarrierActivityDelta {
  readonly text: string;
}

export interface CarrierControlReceipt {
  readonly carrierId: string;
  readonly control: "stop";
  readonly outcome: "settled";
  readonly evidenceRefs: readonly string[];
}

export interface ConversationCarrierHandle {
  readonly identity: ConversationCarrierIdentity;
  liveness(): CarrierLiveness;
  onActivity(listener: (activity: CarrierActivityDelta) => void): () => void;
  onSettled(listener: (settlement: CarrierSettlement) => void): () => void;
  readonly settled: Promise<CarrierSettlement>;
  /**
   * Stop only this exact retained carrier: the durable control receipt is
   * written before the abort, and the abort is dispatched synchronously. The
   * terminal attempt settlement follows as separate evidence.
   */
  stop(actor: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
  }): CarrierControlReceipt;
  /**
   * Bounded-retention diagnostic: after terminal settlement the carrier drops
   * its listener sets and its retained CellInput/Task/lease payloads, so a
   * settled handle keeps only its identity, terminal settlement, and evidence
   * refs. Tests assert repeated settle stays bounded through this surface.
   */
  retention(): { activityListeners: number; settledListeners: number; retainedPayloads: number };
}

export interface CarrierStartReceipt {
  readonly carrierId: string;
  readonly taskId: string;
  readonly sourceRevision: number;
  readonly taskRevision: number;
  readonly evidenceRefs: readonly string[];
}

/**
 * The in-memory registry of one Workbench server: the exact retained runtime
 * handles of conversation-owned asynchronous ordinary Task carriers. It owns
 * liveness only while the handle exists; a retained `started` attempt without
 * a matching handle is liveness unknown, never live. Durable facts stay in the
 * Task attempt, Work Cell record, settlement, and control receipt evidence;
 * nothing here becomes a second task or execution store.
 */
export interface ConversationExecutionCarrierRegistry {
  readonly home: string;
  /**
   * Synchronously re-run the shared guarded task-run preparation and start at
   * most one asynchronous carrier for one committed task_continue action. The
   * exact durable (turnId, actionId) mapping refuses a second carrier for the
   * same committed action. Throws `ConversationCarrierError` with no effect on
   * any stale, unregistered, guessed, dirty, or mismatched selector.
   */
  startCarrier(input: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
    readonly operation: TaskContinueOperation;
  }): CarrierStartReceipt;
  carrier(carrierId: string): ConversationCarrierHandle | undefined;
  carriers(): readonly ConversationCarrierHandle[];
  /** The carrier started by one exact committed turn/action, when the runtime retained it. */
  startedCarrier(conversationId: string, actionId: string): ConversationCarrierHandle | undefined;
  /** Apply one exact control to one exact retained carrier; throws on conflict or unknown liveness. */
  controlCarrier(input: {
    readonly carrierId: string;
    readonly control: "stop";
    readonly actor: { readonly conversationId: string; readonly turnId: string; readonly actionId: string };
  }): CarrierControlReceipt;
}

export interface ConversationExecutionCarrierOptions {
  /** Test seam; defaults to the current worker policy catalog. */
  readonly catalog?: WorkerCatalog;
  readonly environment?: NodeJS.ProcessEnv;
}

export function createConversationExecutionCarrierRegistry(
  homeArgument: string | undefined,
  options: ConversationExecutionCarrierOptions = {},
): ConversationExecutionCarrierRegistry {
  const home = resolveHome(homeArgument);
  const catalog = options.catalog ?? currentCatalog(options.environment ?? process.env);
  return new WorkbenchConversationCarrierRegistry(home, catalog);
}

class WorkbenchConversationCarrierRegistry implements ConversationExecutionCarrierRegistry {
  readonly home: string;
  private readonly catalog: WorkerCatalog;
  private readonly handles = new Map<string, TaskRunCellCarrier>();
  private readonly startedByCommittedAction = new Map<string, string>();

  constructor(home: string, catalog: WorkerCatalog) {
    this.home = home;
    this.catalog = catalog;
  }

  startCarrier(input: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
    readonly operation: TaskContinueOperation;
  }): CarrierStartReceipt {
    const actionKey = committedActionKey(input.conversationId, input.actionId);
    const existing = this.startedByCommittedAction.get(actionKey);
    if (existing !== undefined) {
      throw new ConversationCarrierError(
        "carrier-duplicate",
        `a carrier for turn ${input.turnId} action ${input.actionId} was already started: ${existing}`,
      );
    }

    // The same guarded preparation every ordinary task run performs: exact
    // worker resolution, canonical Task/source re-read, project and bound
    // Worktree revalidation with its current head, the atomic Worktree lease,
    // a fresh Task snapshot verification, and the clean status check. Only the
    // execution-form derivation and the catalog identity resolution are
    // carrier-specific; the authority sequence is never duplicated here.
    const prepared = this.prepareCarrierRun(input.operation);

    const attemptId = prepared.attemptId;
    try {
      verifyExpectedRevisions(prepared, input.operation);
      verifyContinueSelectors(this.home, prepared, input.operation);
      const correlation: AttemptCorrelation = {
        conversationId: input.conversationId,
        turnId: input.turnId,
        actionId: input.actionId,
        sourceRef: taskActionSourceRef(input.conversationId, input.actionId),
      };
      const attempt = createAttempt(
        prepared.home,
        prepared.task,
        prepared.observed.sourceRevision,
        attemptId,
        prepared.worktree,
        prepared.card.id,
        prepared.card,
        prepared.execution,
        undefined,
        correlation,
      );
      const carrier = new TaskRunCellCarrier({
        home: prepared.home,
        catalog: this.catalog,
        identity: {
          carrierId: attemptId,
          conversationId: input.conversationId,
          turnId: input.turnId,
          actionId: input.actionId,
          taskId: prepared.task.id,
          attemptId,
          workerId: prepared.card.id,
          worktree: prepared.worktree,
        },
        cellInput: attempt.expectedCellInput,
        attempt,
        lease: prepared.lease,
        task: prepared.task,
      });
      this.handles.set(attemptId, carrier);
      this.startedByCommittedAction.set(actionKey, attemptId);
      void carrier.run();
      return {
        carrierId: attemptId,
        taskId: prepared.task.id,
        sourceRevision: prepared.observed.sourceRevision,
        taskRevision: prepared.task.revision,
        evidenceRefs: [
          attempt.attemptRef,
          attempt.inputRef,
          attempt.finalRecordRef,
          attempt.settlementRef,
        ],
      };
    } catch (error) {
      releaseWorktreeLease(prepared.lease);
      throw mapPreparationError(error);
    }
  }

  carrier(carrierId: string): ConversationCarrierHandle | undefined {
    return this.handles.get(carrierId);
  }

  carriers(): readonly ConversationCarrierHandle[] {
    return [...this.handles.values()];
  }

  startedCarrier(conversationId: string, actionId: string): ConversationCarrierHandle | undefined {
    const attemptId = this.startedByCommittedAction.get(committedActionKey(conversationId, actionId));
    return attemptId === undefined ? undefined : this.handles.get(attemptId);
  }

  controlCarrier(input: {
    readonly carrierId: string;
    readonly control: "stop";
    readonly actor: { readonly conversationId: string; readonly turnId: string; readonly actionId: string };
  }): CarrierControlReceipt {
    if (input.control !== "stop") {
      throw new ConversationCarrierError(
        "control-unsupported",
        `control '${input.control}' is not owned by an ordinary Task carrier`,
      );
    }
    const carrier = this.handles.get(input.carrierId);
    if (carrier === undefined) {
      const standing = carrierStandingWithoutHandle(this.home, input.carrierId);
      if (standing.kind === "missing") {
        throw new ConversationCarrierError(
          "carrier-not-found",
          `carrier ${input.carrierId} is not a retained ordinary Task carrier`,
        );
      }
      if (standing.kind === "settled") {
        throw new ConversationCarrierError(
          "carrier-not-live",
          `carrier ${input.carrierId} already settled with status ${standing.status}; stop has no effect`,
        );
      }
      throw new ConversationCarrierError(
        "carrier-unknown",
        `carrier ${input.carrierId} has no retained runtime handle and no terminal settlement; `
        + "liveness is unknown and the stop cannot be verified",
      );
    }
    const liveness = carrier.liveness();
    if (liveness.state !== "live") {
      throw new ConversationCarrierError(
        "carrier-not-live",
        `carrier ${input.carrierId} is not live; stop has no effect`,
      );
    }
    return carrier.stop(input.actor);
  }

  private prepareCarrierRun(operation: TaskContinueOperation): PreparedPrincipalTaskRun {
    try {
      return preparePrincipalTaskRun(
        this.home,
        { id: operation.taskId, workerId: operation.workerId },
        {
          resolveWorkerCard: (workerId) => this.catalogWorkerCard(workerId),
          deriveExecution: carrierExecutionRequest,
        },
      );
    } catch (error) {
      throw mapPreparationError(error);
    }
  }

  /** The exact catalog identity for one selector; never a policy-catalog fallback. */
  private catalogWorkerCard(workerId: string): WorkerCard {
    try {
      return this.catalog.card(workerId);
    } catch (error) {
      const message = errorMessage(error);
      if (/is unavailable/u.test(message)) {
        throw new ConversationCarrierError(
          "worker-unavailable",
          `worker '${workerId}' is not available: ${message}`,
        );
      }
      throw new ConversationCarrierError(
        "worker-unknown",
        `worker '${workerId}' is not an exact runnable catalog identity: ${message}`,
      );
    }
  }
}

/** The operation's expected selectors against the freshly prepared re-read. */
function verifyExpectedRevisions(
  prepared: PreparedPrincipalTaskRun,
  operation: TaskContinueOperation,
): void {
  if (prepared.observed.sourceRevision !== operation.expectedSourceRevision) {
    throw new ConversationCarrierError(
      "stale-revision",
      `task source revision is stale for the continue: expected ${operation.expectedSourceRevision}, current ${prepared.observed.sourceRevision}`,
    );
  }
  if (prepared.task.revision !== operation.expectedRevision) {
    throw new ConversationCarrierError(
      "stale-revision",
      `task revision is stale for the continue: expected ${operation.expectedRevision}, current ${prepared.task.revision}`,
    );
  }
}

/**
 * Compare the operation's exact execution selection against fresh owner reads
 * performed after the Worktree lease is held and immediately before attempt
 * creation: the registered project identity, its current primary head, the
 * exact bound Worktree path, and its current head. Any X→Y drift between the
 * projection the coordinator copied and the current canonical owners fails
 * stale with no effect; the carrier never executes the drifted current
 * selection.
 */
function verifyContinueSelectors(
  home: string,
  prepared: PreparedPrincipalTaskRun,
  operation: TaskContinueOperation,
): void {
  const binding = prepared.task.binding;
  if (binding.kind !== "project-context" || binding.projectId !== operation.projectId) {
    throw new ConversationCarrierError(
      "stale-context",
      `task ${prepared.task.id} is not bound to the operation's exact registered project ${operation.projectId}; the action is refused`,
    );
  }
  let observedWorktreePath: string;
  try {
    observedWorktreePath = realpathSync(expandPath(operation.worktreePath));
  } catch {
    throw new ConversationCarrierError(
      "worktree-unobserved",
      `the operation's bound Worktree path cannot be resolved: ${operation.worktreePath}`,
    );
  }
  if (observedWorktreePath !== prepared.worktree) {
    throw new ConversationCarrierError(
      "stale-context",
      `the operation's bound Worktree ${observedWorktreePath} does not match the task's current bound Worktree ${prepared.worktree}; the action is refused`,
    );
  }
  let primaryHead: string;
  try {
    const current = loadHome(home);
    const project = current.projects.projects.find(
      (candidate) => candidate.id === operation.projectId,
    );
    if (project === undefined) {
      throw new Error(`project ${operation.projectId} is not a registered current project`);
    }
    const workspace = workspaceFor(current.workspaces, operation.projectId);
    const observation = observeWorkspace(project, workspace);
    if (observation.head === null) {
      throw new Error(`project ${operation.projectId} has no readable current primary head`);
    }
    primaryHead = observation.head;
  } catch (error) {
    throw new ConversationCarrierError(
      "project-unresolved",
      `the operation's registered project cannot be re-observed: ${errorMessage(error)}`,
    );
  }
  if (primaryHead !== operation.expectedPrimaryHead) {
    throw new ConversationCarrierError(
      "stale-context",
      `the registered project's current primary head ${primaryHead} does not match the expected head ${operation.expectedPrimaryHead}; the action is refused`,
    );
  }
  let worktreeHead: string;
  try {
    worktreeHead = requiredGit(["rev-parse", "HEAD"], prepared.worktree);
  } catch (error) {
    throw new ConversationCarrierError(
      "worktree-unobserved",
      `the bound Worktree's current head cannot be re-read: ${errorMessage(error)}`,
    );
  }
  if (!/^[0-9a-f]{40}$/u.test(worktreeHead) || worktreeHead !== operation.expectedWorktreeHead) {
    throw new ConversationCarrierError(
      "stale-context",
      `the bound Worktree's current head ${worktreeHead} does not match the expected head ${operation.expectedWorktreeHead}; the action is refused`,
    );
  }
}

/** The in-process AI SDK execution form a conversation carrier actually runs. */
function carrierExecutionRequest(card: WorkerCard): TaskRunExecution {
  return {
    driver: "ai-sdk-v7",
    model: card.executionProfile.model,
    ...(card.executionProfile.reasoningEffort === undefined
      ? {}
      : { reasoningEffort: card.executionProfile.reasoningEffort }),
  };
}

interface TaskRunCellCarrierInput {
  readonly home: string;
  readonly catalog: WorkerCatalog;
  readonly identity: ConversationCarrierIdentity;
  readonly cellInput: CellInput;
  readonly attempt: ReturnType<typeof attemptEvidence>;
  readonly lease: TaskRunLease;
  readonly task: PrincipalTask;
}

class TaskRunCellCarrier implements ConversationCarrierHandle {
  readonly identity: ConversationCarrierIdentity;
  readonly settled: Promise<CarrierSettlement>;
  private readonly home: string;
  private readonly catalog: WorkerCatalog;
  private readonly attempt: ReturnType<typeof attemptEvidence>;
  private cellInput: CellInput | undefined;
  private lease: TaskRunLease | undefined;
  private task: PrincipalTask | undefined;
  private readonly controller = new AbortController();
  private readonly activityListeners = new Set<(activity: CarrierActivityDelta) => void>();
  private readonly settledListeners = new Set<(settlement: CarrierSettlement) => void>();
  private resolveSettled!: (settlement: CarrierSettlement) => void;
  private runId?: string;
  private settlement?: CarrierSettlement;
  private stopRequested = false;
  private controlReceiptPath?: string;

  constructor(input: TaskRunCellCarrierInput) {
    this.home = input.home;
    this.catalog = input.catalog;
    this.identity = input.identity;
    this.cellInput = input.cellInput;
    this.attempt = input.attempt;
    this.lease = input.lease;
    this.task = input.task;
    this.settled = new Promise<CarrierSettlement>((resolve) => {
      this.resolveSettled = resolve;
    });
  }

  liveness(): CarrierLiveness {
    if (this.settlement !== undefined) {
      return this.settlement.status === "unresolved"
        ? { state: "unresolved", settlement: this.settlement }
        : { state: "settled", settlement: this.settlement };
    }
    return this.runId === undefined
      ? { state: "live" }
      : { state: "live", runId: this.runId };
  }

  retention(): { activityListeners: number; settledListeners: number; retainedPayloads: number } {
    return {
      activityListeners: this.activityListeners.size,
      settledListeners: this.settledListeners.size,
      retainedPayloads: Number(this.cellInput !== undefined)
        + Number(this.task !== undefined)
        + Number(this.lease !== undefined),
    };
  }

  onActivity(listener: (activity: CarrierActivityDelta) => void): () => void {
    if (this.settlement !== undefined) return () => {};
    this.activityListeners.add(listener);
    return () => this.activityListeners.delete(listener);
  }

  onSettled(listener: (settlement: CarrierSettlement) => void): () => void {
    if (this.settlement !== undefined) {
      listener(this.settlement);
      return () => {};
    }
    this.settledListeners.add(listener);
    return () => this.settledListeners.delete(listener);
  }

  stop(actor: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
  }): CarrierControlReceipt {
    if (this.settlement !== undefined) {
      throw new ConversationCarrierError(
        "carrier-not-live",
        `carrier ${this.identity.carrierId} already settled with status ${this.settlement.status}; stop has no effect`,
      );
    }
    if (this.stopRequested) {
      return controlReceipt(this.identity.carrierId, [this.controlReceiptPath!, this.attempt.settlementRef]);
    }
    this.stopRequested = true;
    this.controlReceiptPath = writeControlReceipt(this.home, this.attempt, this.identity, {
      control: "stop",
      actor,
    });
    this.controller.abort(new DOMException("work_control stop", "AbortError"));
    return controlReceipt(this.identity.carrierId, [this.controlReceiptPath!, this.attempt.settlementRef]);
  }

  /**
   * The asynchronous continuation launched by the registry after the durable
   * attempt start. Terminal evidence retention and the exact lease release
   * are the only finalization steps: a failure to retain the final record or
   * the durable settlement never invents a runner-failed receipt, and a
   * failed lease release never marks the carrier settled — both surface a
   * visible `unresolved` standing instead, so reconcile-attempt can retry the
   * exact finalization. The lease is released only after a durable settlement
   * exists. At terminal the carrier drops its listener sets and its retained
   * CellInput/Task/lease payloads so settled handles stay bounded.
   */
  async run(): Promise<void> {
    let record: CellRunRecord | undefined;
    let failure: string | undefined;
    try {
      const cellInput = this.cellInput;
      if (cellInput === undefined) {
        throw new Error("the carrier lost its immutable CellInput before the run");
      }
      record = await runCell(cellInput, this.catalog.createDriver(cellInput), {
        signal: this.controller.signal,
        onTrace: (event) => this.observeTrace(event),
      });
    } catch (error) {
      failure = errorMessage(error);
    }
    let settlement: CarrierSettlement;
    let durableSettlement = false;
    try {
      if (record !== undefined) {
        writeImmutableJson(this.attempt.finalRecordPath, record);
      }
      settlement = this.stopRequested
        ? this.settleControlStopped(record)
        : record === undefined
          ? this.settleRunnerFailed(failure ?? "the Work Cell run failed without a retained final record")
          : this.settleFromFinalRecord(record);
      durableSettlement = true;
    } catch (error) {
      // Durable settlement absence stays unresolved: never an invented
      // runner-failed receipt. The lease is retained so reconcile-attempt can
      // retry the exact finalization after the owner process is verifiably
      // dead.
      settlement = {
        status: "unresolved",
        evidenceRefs: [this.attempt.settlementRef],
        error: `terminal evidence retention failed: ${errorMessage(error)}`,
      };
    }
    if (durableSettlement) {
      const lease = this.lease;
      if (lease !== undefined) {
        try {
          releaseWorktreeLease(lease);
        } catch (error) {
          // The durable settlement exists but the exact lease finalization
          // did not complete; the carrier is not marked settled.
          settlement = {
            status: "unresolved",
            evidenceRefs: [this.attempt.settlementRef],
            error:
              `the durable settlement was retained but the task-run lease could not be released: `
              + `${errorMessage(error)}; task reconcile-attempt can retry the exact finalization`,
          };
        }
      }
    }
    this.finishTerminal(settlement);
  }

  private finishTerminal(settlement: CarrierSettlement): void {
    this.settlement = settlement;
    const settledListeners = [...this.settledListeners];
    this.settledListeners.clear();
    this.activityListeners.clear();
    // Bounded runtime retention: a terminal handle keeps only its identity,
    // terminal settlement, and evidence refs; the large CellInput/Task/lease
    // payloads and all listener closures are dropped.
    this.cellInput = undefined;
    this.task = undefined;
    this.lease = undefined;
    this.resolveSettled(settlement);
    for (const listener of settledListeners) listener(settlement);
  }

  private settleControlStopped(record?: CellRunRecord): CarrierSettlement {
    const controlRef = this.controlReceiptPath;
    if (controlRef === undefined) {
      throw new Error(`carrier ${this.identity.carrierId} was stopped without a durable control receipt`);
    }
    const task = this.requiredTask();
    writeTaskRunSettlement(this.attempt, {
      taskId: task.id,
      taskRevision: task.revision,
      attemptId: this.identity.attemptId,
      status: "control-stopped",
      controlRef,
      ...(record === undefined ? {} : { workCellRunId: record.runId, cellStatus: record.status }),
    });
    return {
      status: "control-stopped",
      evidenceRefs: [controlRef, this.attempt.settlementRef],
      ...(record === undefined ? {} : { cellStatus: record.status }),
    };
  }

  /** The shared normal settlement derivation from one validated owner-backed final record. */
  private settleFromFinalRecord(record: CellRunRecord): CarrierSettlement {
    const task = this.requiredTask();
    const input = finalRecordSettlementInput(task.id, task.revision, this.identity.attemptId, record);
    writeTaskRunSettlement(this.attempt, input);
    return {
      status: input.status,
      evidenceRefs: [this.attempt.settlementRef, this.attempt.finalRecordRef],
      cellStatus: record.status,
      ...(input.error === undefined ? {} : { error: input.error }),
    };
  }

  private settleRunnerFailed(error: string, record?: CellRunRecord): CarrierSettlement {
    const task = this.requiredTask();
    writeTaskRunSettlement(this.attempt, {
      taskId: task.id,
      taskRevision: task.revision,
      attemptId: this.identity.attemptId,
      status: "runner-failed",
      ...(record === undefined ? {} : { workCellRunId: record.runId, cellStatus: record.status }),
      error,
    });
    return {
      status: "runner-failed",
      evidenceRefs: [this.attempt.settlementRef],
      ...(record === undefined ? {} : { cellStatus: record.status }),
      error,
    };
  }

  private requiredTask(): PrincipalTask {
    if (this.task === undefined) {
      throw new Error(`carrier ${this.identity.carrierId} lost its retained Task before settlement`);
    }
    return this.task;
  }

  private observeTrace(event: TraceEvent): void {
    if (event.type === "cell.started") {
      const data = asRecord(event.data);
      if (typeof data.runId === "string" && data.runId.length > 0) this.runId = data.runId;
    }
    const text = renderCarrierActivity(event);
    if (text === undefined) return;
    for (const listener of this.activityListeners) listener({ text });
  }
}

function committedActionKey(conversationId: string, actionId: string): string {
  return `${conversationId}\u0000${actionId}`;
}

function controlReceipt(carrierId: string, evidenceRefs: readonly string[]): CarrierControlReceipt {
  return { carrierId, control: "stop", outcome: "settled", evidenceRefs };
}

/**
 * The strict durable control receipt shape written before an abort. A
 * reconciliation read that does not parse as this exact shape is never
 * settled as a control receipt.
 */
export const TaskRunControlReceiptSchema = z.object({
  version: z.literal("rosso.task-run-control-receipt.v1"),
  control: z.literal("stop"),
  carrierId: z.string().min(1),
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

/**
 * Durable control receipt written before the abort so a crash can never leave
 * a stop without its causal record. It references the exact carrier attempt
 * and the controlling turn/action; the terminal settlement is separate
 * evidence retained by the same attempt.
 */
function writeControlReceipt(
  home: string,
  attempt: ReturnType<typeof attemptEvidence>,
  identity: ConversationCarrierIdentity,
  input: {
    readonly control: "stop";
    readonly actor: { readonly conversationId: string; readonly turnId: string; readonly actionId: string };
  },
): string {
  const directory = join(home, "state", "task-attempts", identity.attemptId);
  const path = join(directory, "control.json");
  writeImmutableJson(path, {
    version: "rosso.task-run-control-receipt.v1",
    control: input.control,
    carrierId: identity.carrierId,
    taskId: identity.taskId,
    attemptId: identity.attemptId,
    workerId: identity.workerId,
    worktree: identity.worktree,
    sourceRef: taskActionSourceRef(input.actor.conversationId, input.actor.actionId),
    requestedBy: {
      conversationId: input.actor.conversationId,
      turnId: input.actor.turnId,
      actionId: input.actor.actionId,
    },
    requestedAt: new Date().toISOString(),
    attemptRef: attempt.attemptRef,
    settlementRef: attempt.settlementRef,
  });
  return evidenceRef(home, path);
}

/**
 * Standing of one carrierId for which this process retains no runtime handle:
 * missing attempt evidence, terminal settlement whose exact lease release
 * succeeded, or an unsettled/reconcile-required retained attempt whose
 * liveness cannot be claimed. A valid settlement beside a still-retained
 * exact lease for the same attempt is unknown, never terminal.
 */
export function carrierStandingWithoutHandle(
  home: string,
  carrierId: string,
): { kind: "missing" } | { kind: "settled"; status: CarrierSettlementStatus } | { kind: "unknown" } {
  const evidence = readStrictTaskAttemptEvidence(home, carrierId);
  if (evidence.standing === "unavailable") return { kind: "missing" };
  if (evidence.standing === "invalid") {
    // Invalid or mismatched evidence projects unknown/uninspectable, never settled.
    return { kind: "unknown" };
  }
  if (evidence.settlement !== undefined) {
    // A valid settlement is terminal only once the exact lease release
    // succeeded: a still-retained exact lease for the same attempt is
    // reconcile-required, never recorded/terminal.
    const attempt = evidence.attempt;
    if (attempt === undefined) return { kind: "unknown" };
    const lease = attemptLeaseStanding(home, attempt.taskId, carrierId);
    if (lease === "released") {
      return { kind: "settled", status: evidence.settlement.status };
    }
    return { kind: "unknown" };
  }
  return { kind: "unknown" };
}

/** All attempt directories with readable attempt evidence, newest first by name order. */
export function listAttemptDirectories(home: string): string[] {
  const attemptsRoot = join(home, "state", "task-attempts");
  if (!existsSync(attemptsRoot)) return [];
  return readdirSync(attemptsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left));
}

/**
 * Bounded safe activity projection for one retained Work Cell trace event.
 * Only whitelisted event kinds with sanitized scalar fields are rendered;
 * file contents, reasoning text, command arguments, and raw traces never
 * enter a conversation delta.
 */
function renderCarrierActivity(event: TraceEvent): string | undefined {
  switch (event.type) {
    case "cell.started": {
      const data = asRecord(event.data);
      const driver = asRecord(data.driver);
      return `[work-cell] started ${typeof data.cellId === "string" ? data.cellId : "unknown"}`
        + ` via ${driver.provider ?? "unknown"}/${driver.model ?? "unknown"}`;
    }
    case "agent.step.started": {
      const data = asRecord(event.data);
      const tools = Array.isArray(data.activeTools) && data.activeTools.every((item) => typeof item === "string")
        ? data.activeTools.join(",")
        : undefined;
      return `[work-cell] model step=${typeof data.stepNumber === "number" ? data.stepNumber : "?"}`
        + `${tools === undefined ? "" : ` tools=${tools}`}`;
    }
    case "agent.step.finished": {
      const data = asRecord(event.data);
      return `[work-cell] model settled reason=${typeof data.finishReason === "string" ? data.finishReason : "unknown"}`;
    }
    case "agent.tool.started": {
      const data = asRecord(event.data);
      return `[work-cell] tool started ${typeof data.name === "string" ? data.name : "unknown"}`;
    }
    case "agent.tool.finished": {
      const data = asRecord(event.data);
      return `[work-cell] tool finished ${typeof data.name === "string" ? data.name : "unknown"}`
        + `${typeof data.outcome === "string" ? ` outcome=${data.outcome}` : ""}`;
    }
    case "tool.read_file": {
      const data = asRecord(event.data);
      return `[work-cell] read ${typeof data.path === "string" ? data.path : "unknown"}`
        + `${typeof data.characters === "number" ? ` characters=${data.characters}` : ""}`;
    }
    case "tool.list_files": {
      const data = asRecord(event.data);
      return `[work-cell] list ${typeof data.path === "string" ? data.path : "."}`
        + `${typeof data.count === "number" ? ` entries=${data.count}` : ""}`;
    }
    case "tool.write_file": {
      const data = asRecord(event.data);
      return `[work-cell] write ${typeof data.path === "string" ? data.path : "unknown"}`
        + `${typeof data.characters === "number" ? ` characters=${data.characters}` : ""}`;
    }
    case "cell.finished": {
      const data = asRecord(event.data);
      return `[work-cell] finished status=${typeof data.status === "string" ? data.status : "unknown"}`;
    }
    case "cell.error": {
      const data = asRecord(event.data);
      return `[work-cell] error status=${typeof data.status === "string" ? data.status : "unknown"}`;
    }
    case "cell.capability_mismatch":
    case "terminal.contract.violation":
      return `[work-cell] ${event.type}`;
    default:
      if (event.type.startsWith("task.") || event.type.startsWith("terminal.")) {
        return `[work-cell] ${event.type}`;
      }
      return undefined;
  }
}

function currentCatalog(environment: NodeJS.ProcessEnv): WorkerCatalog {
  return requireFromHere("../../autonomy/src/worker-policy").createCurrentWorkerCatalog(environment);
}

/** One preparation/creation failure becomes a carrier-code-visible refusal. */
function mapPreparationError(error: unknown): ConversationCarrierError {
  if (error instanceof ConversationCarrierError) return error;
  if (error instanceof PrincipalTaskError) {
    const code: ConversationCarrierErrorCode =
      error.code === "task-not-found" ? "task-not-found"
      : error.code === "task-drift" ? "stale-revision"
      : "source-unavailable";
    return new ConversationCarrierError(code, error.message);
  }
  const message = errorMessage(error);
  const code: ConversationCarrierErrorCode =
    /cannot run settled task/u.test(message) ? "task-settled"
    : /must be open and assigned/u.test(message) ? "task-not-runnable"
    : /must be bound to an existing project Worktree/u.test(message) ? "task-not-bound"
    : /no local workspace is attached/u.test(message) ? "project-unresolved"
    : /task Worktree does not exist/u.test(message) ? "worktree-unobserved"
    : /not currently bound to registered project/u.test(message) ? "worktree-unobserved"
    : /must use an isolated Worktree/u.test(message) ? "worktree-unobserved"
    : /head cannot be read/u.test(message) ? "worktree-unobserved"
    : /already has an active task-run lease/u.test(message) ? "lease-conflict"
    : /changed before attempt creation/u.test(message) ? "stale-context"
    : /is not clean/u.test(message) ? "worktree-dirty"
    : /must be a non-empty worker id/u.test(message) ? "worker-unknown"
    : "source-unavailable";
  return new ConversationCarrierError(code, `the carrier cannot be prepared: ${message}`);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== "" ? error.message : String(error);
}
