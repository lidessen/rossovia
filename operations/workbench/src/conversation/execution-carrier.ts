import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CellInput, CellRunRecord, TraceEvent } from "../../../../packages/work-cell/src/contracts";
import { runCell } from "../../../../packages/work-cell/src/run-cell";
import type { WorkerCard, WorkerCatalog } from "../../../../packages/work-cell/src/worker-catalog";
import type { TaskContinueOperation } from "../../../autonomy/src/conversation-coordinator";
import {
  acquireWorktreeLease,
  attemptEvidence,
  createAttempt,
  evidenceRef,
  releaseWorktreeLease,
  resolveBoundWorktree,
  verifyCleanStatus,
  verifyCurrentBinding,
  verifyTaskSnapshotAfterLease,
  writeImmutableJson,
  type AttemptCorrelation,
  type TaskRunLease,
} from "../task-run";
import { loadPrincipalTasks, showPrincipalTask } from "../tasks";
import type { PrincipalTask } from "../contracts";
import { resolveProject } from "../resolve";
import { resolveHome } from "../home";
import { requiredGit } from "../workspace";
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
  readonly status: CarrierSettlementStatus;
  readonly evidenceRefs: readonly string[];
  readonly cellStatus?: CellRunRecord["status"];
  readonly error?: string;
}

export interface CarrierLiveness {
  readonly state: "live" | "settled" | "unknown";
  readonly runId?: string;
  readonly settlement?: CarrierSettlement;
}

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
   * Synchronously re-read every canonical selector and start at most one
   * asynchronous carrier for one committed task_continue action. The exact
   * durable (turnId, actionId) mapping refuses a second carrier for the same
   * committed action. Throws `ConversationCarrierError` with no effect on any
   * stale, unregistered, guessed, dirty, or mismatched selector.
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

    const observed = this.rereadTask(input.operation);
    const task = observed.task;

    let card: WorkerCard;
    try {
      card = this.catalog.card(input.operation.workerId);
    } catch (error: unknown) {
      throw new ConversationCarrierError(
        "worker-unknown",
        `worker '${input.operation.workerId}' is not an exact runnable catalog identity: ${errorMessage(error)}`,
      );
    }

    const bound = this.rereadBoundWorktree(task);
    const worktree = bound.worktree;
    const worktreeHead = requiredGit(["rev-parse", "HEAD"], worktree);
    if (!/^[0-9a-f]{40}$/u.test(worktreeHead)) {
      throw new ConversationCarrierError(
        "worktree-unobserved",
        `the bound Worktree's current head cannot be read: ${worktree}`,
      );
    }

    const attemptId = randomUUID();
    let lease: TaskRunLease;
    try {
      lease = acquireWorktreeLease(worktree, task.id, attemptId);
    } catch (error) {
      throw new ConversationCarrierError(
        "lease-conflict",
        `the exact Worktree lease cannot be acquired for the continue: ${errorMessage(error)}`,
      );
    }
    let attempt;
    try {
      verifyTaskSnapshotAfterLease(this.home, observed);
      verifyCurrentBinding(this.home, bound.projectId, worktree);
      verifyCleanStatus(worktree);
      const correlation: AttemptCorrelation = {
        conversationId: input.conversationId,
        turnId: input.turnId,
        actionId: input.actionId,
        sourceRef: taskActionSourceRef(input.conversationId, input.actionId),
      };
      attempt = createAttempt(
        this.home,
        task,
        observed.sourceRevision,
        attemptId,
        worktree,
        card.id,
        card,
        {
          driver: "ai-sdk-v7",
          model: card.executionProfile.model,
          ...(card.executionProfile.reasoningEffort === undefined
            ? {}
            : { reasoningEffort: card.executionProfile.reasoningEffort }),
        },
        undefined,
        correlation,
      );
    } catch (error) {
      releaseWorktreeLease(lease);
      throw mapCarrierError(error);
    }

    const carrier = new TaskRunCellCarrier({
      home: this.home,
      catalog: this.catalog,
      identity: {
        carrierId: attemptId,
        conversationId: input.conversationId,
        turnId: input.turnId,
        actionId: input.actionId,
        taskId: task.id,
        attemptId,
        workerId: card.id,
        worktree,
      },
      cellInput: attempt.expectedCellInput,
      attempt,
      lease,
      task,
    });
    this.handles.set(attemptId, carrier);
    this.startedByCommittedAction.set(actionKey, attemptId);
    void carrier.run();
    return {
      carrierId: attemptId,
      taskId: task.id,
      sourceRevision: observed.sourceRevision,
      taskRevision: task.revision,
      evidenceRefs: [
        attempt.attemptRef,
        attempt.inputRef,
        attempt.finalRecordRef,
        attempt.settlementRef,
      ],
    };
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

  /** Exact canonical Task and source revision reread immediately before the start effect. */
  private rereadTask(operation: TaskContinueOperation): {
    sourceRevision: number;
    task: PrincipalTask;
  } {
    let observed;
    try {
      observed = showPrincipalTask(this.home, operation.taskId);
    } catch (error) {
      throw new ConversationCarrierError("source-unavailable",
        `the canonical Task source cannot be read for the continue: ${errorMessage(error)}`);
    }
    let sourceRevision;
    try {
      sourceRevision = loadPrincipalTasks(this.home).sourceRevision;
    } catch (error) {
      throw new ConversationCarrierError("source-unavailable",
        `the canonical Task source cannot be read for the continue: ${errorMessage(error)}`);
    }
    if (sourceRevision !== operation.expectedSourceRevision) {
      throw new ConversationCarrierError(
        "stale-revision",
        `task source revision is stale for the continue: expected ${operation.expectedSourceRevision}, current ${sourceRevision}`,
      );
    }
    const task = observed.task;
    if (task.revision !== operation.expectedRevision) {
      throw new ConversationCarrierError(
        "stale-revision",
        `task revision is stale for the continue: expected ${operation.expectedRevision}, current ${task.revision}`,
      );
    }
    if (task.lifecycle === "settled") {
      throw new ConversationCarrierError(
        "task-settled",
        `task ${task.id} is settled; a settled task is viewable history and cannot run`,
      );
    }
    if (task.lifecycle !== "open" || task.nextActor !== "agent") {
      throw new ConversationCarrierError(
        "task-not-runnable",
        `task ${task.id} must be open and assigned to the Agent before it can run`,
      );
    }
    return observed;
  }

  /**
   * Re-read the registered project identity, its current primary observation,
   * and the exact bound Worktree membership immediately before the start
   * effect. A stale, unregistered, discovered, or guessed route fails visibly
   * with no effect.
   */
  private rereadBoundWorktree(task: PrincipalTask): { worktree: string; projectId: string } {
    const binding = task.binding;
    if (binding.kind !== "project-context" || binding.worktreePath === undefined) {
      throw new ConversationCarrierError(
        "task-not-bound",
        `task ${task.id} must be bound to an existing project Worktree before it can run`,
      );
    }
    const projectId = binding.projectId;
    const worktreePath = binding.worktreePath;
    let resolution;
    try {
      resolution = resolveProject(this.home, projectId);
    } catch (error) {
      throw new ConversationCarrierError(
        "project-unresolved",
        `project '${projectId}' cannot be resolved to one registered current project: ${errorMessage(error)}`,
      );
    }
    if (resolution.registration !== "registered") {
      throw new ConversationCarrierError(
        "project-unresolved",
        `project '${projectId}' is ${resolution.registration}, not a registered current project; the continue has no unbound fallback`,
      );
    }
    if (resolution.project.id !== projectId) {
      throw new ConversationCarrierError(
        "project-unresolved",
        `project identity mismatch: the bound project '${projectId}' does not match the registered project`,
      );
    }
    if (resolution.workspace.head === null) {
      throw new ConversationCarrierError(
        "stale-context",
        `the registered project's current primary observation is unavailable for project '${projectId}'`,
      );
    }
    try {
      return {
        worktree: resolveBoundWorktree(this.home, projectId, worktreePath),
        projectId,
      };
    } catch (error) {
      throw new ConversationCarrierError(
        "worktree-unobserved",
        `the bound Worktree cannot be verified for the continue: ${errorMessage(error)}`,
      );
    }
  }
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
  private readonly cellInput: CellInput;
  private readonly attempt: ReturnType<typeof attemptEvidence>;
  private readonly lease: TaskRunLease;
  private readonly task: PrincipalTask;
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
      return { state: "settled", settlement: this.settlement };
    }
    return this.runId === undefined
      ? { state: "live" }
      : { state: "live", runId: this.runId };
  }

  onActivity(listener: (activity: CarrierActivityDelta) => void): () => void {
    this.activityListeners.add(listener);
    return () => this.activityListeners.delete(listener);
  }

  onSettled(listener: (settlement: CarrierSettlement) => void): () => void {
    if (this.settlement !== undefined) listener(this.settlement);
    else this.settledListeners.add(listener);
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

  /** The asynchronous continuation launched by the registry after the durable attempt start. */
  async run(): Promise<void> {
    let record: CellRunRecord | undefined;
    let failure: string | undefined;
    try {
      record = await runCell(this.cellInput, this.catalog.createDriver(this.cellInput), {
        signal: this.controller.signal,
        onTrace: (event) => this.observeTrace(event),
      });
    } catch (error) {
      failure = errorMessage(error);
    }
    let settlement: CarrierSettlement;
    try {
      if (record !== undefined) {
        writeImmutableJson(this.attempt.finalRecordPath, record);
      }
      settlement = this.stopRequested
        ? this.settleControlStopped(record)
        : record === undefined
          ? this.settleRunnerFailed(failure ?? "the Work Cell run failed without a retained final record")
          : record.status === "passed"
            ? this.settleRecorded(record)
            : this.settleRunnerFailed(record.error ?? `the Work Cell run settled with status ${record.status}`, record);
    } catch (error) {
      // The attempt stays reconcilable as `started` in its durable owner; the
      // in-memory handle must still terminate so a stop can never hang.
      settlement = {
        status: "runner-failed",
        evidenceRefs: [this.attempt.settlementRef],
        error: `terminal evidence retention failed: ${errorMessage(error)}`,
      };
    }
    try {
      releaseWorktreeLease(this.lease);
    } catch (error) {
      console.error(`task-run lease release failed for carrier ${this.identity.carrierId}: ${errorMessage(error)}`);
    }
    this.settlement = settlement;
    this.resolveSettled(settlement);
    for (const listener of this.settledListeners) listener(settlement);
    this.settledListeners.clear();
  }

  private settleControlStopped(record?: CellRunRecord): CarrierSettlement {
    const controlRef = this.controlReceiptPath;
    if (controlRef === undefined) {
      throw new Error(`carrier ${this.identity.carrierId} was stopped without a durable control receipt`);
    }
    writeImmutableJson(this.attempt.settlementPath, {
      version: "rosso.task-run-settlement.v1",
      taskId: this.task.id,
      taskRevision: this.task.revision,
      attemptId: this.identity.attemptId,
      inputRef: this.attempt.inputRef,
      finalRecordRef: this.attempt.finalRecordRef,
      status: "control-stopped",
      controlRef,
      ...(record === undefined ? {} : {
        workCellRunId: record.runId,
        cellStatus: record.status,
      }),
      semanticAcceptance: "not-evaluated",
      settledAt: new Date().toISOString(),
    });
    return {
      status: "control-stopped",
      evidenceRefs: [controlRef, this.attempt.settlementRef],
      ...(record === undefined ? {} : { cellStatus: record.status }),
    };
  }

  private settleRecorded(record: CellRunRecord): CarrierSettlement {
    writeImmutableJson(this.attempt.settlementPath, {
      version: "rosso.task-run-settlement.v1",
      taskId: this.task.id,
      taskRevision: this.task.revision,
      attemptId: this.identity.attemptId,
      inputRef: this.attempt.inputRef,
      finalRecordRef: this.attempt.finalRecordRef,
      status: "recorded",
      workCellRunId: record.runId,
      cellStatus: record.status,
      semanticAcceptance: "not-evaluated",
      settledAt: new Date().toISOString(),
    });
    return {
      status: "recorded",
      evidenceRefs: [this.attempt.settlementRef, this.attempt.finalRecordRef],
      cellStatus: record.status,
    };
  }

  private settleRunnerFailed(error: string, record?: CellRunRecord): CarrierSettlement {
    writeImmutableJson(this.attempt.settlementPath, {
      version: "rosso.task-run-settlement.v1",
      taskId: this.task.id,
      taskRevision: this.task.revision,
      attemptId: this.identity.attemptId,
      inputRef: this.attempt.inputRef,
      finalRecordRef: this.attempt.finalRecordRef,
      status: "runner-failed",
      ...(record === undefined ? {} : {
        workCellRunId: record.runId,
        cellStatus: record.status,
      }),
      semanticAcceptance: "not-evaluated",
      error,
      settledAt: new Date().toISOString(),
    });
    return {
      status: "runner-failed",
      evidenceRefs: [this.attempt.settlementRef],
      ...(record === undefined ? {} : { cellStatus: record.status }),
      error,
    };
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
 * missing attempt evidence, terminal settlement, or an unsettled retained
 * attempt whose liveness cannot be claimed.
 */
export function carrierStandingWithoutHandle(
  home: string,
  carrierId: string,
): { kind: "missing" } | { kind: "settled"; status: CarrierSettlementStatus } | { kind: "unknown" } {
  const directory = join(home, "state", "task-attempts", carrierId);
  if (!existsSync(directory)) return { kind: "missing" };
  const settlementPath = join(directory, "settlement.json");
  if (existsSync(settlementPath)) {
    try {
      const value = JSON.parse(readFileSync(settlementPath, "utf8")) as { status?: unknown };
      if (value.status === "recorded" || value.status === "runner-failed" || value.status === "control-stopped") {
        return { kind: "settled", status: value.status };
      }
    } catch {
      // An unreadable settlement is not terminal evidence.
    }
    return { kind: "unknown" };
  }
  return { kind: "unknown" };
}

/** Readable one-line evidence for one carrier attempt, ignoring malformed content. */
export function attemptCorrelationEvidence(
  home: string,
  attemptId: string,
): {
  correlation?: AttemptCorrelation;
  attemptRef?: string;
  inputRef?: string;
  finalRecordRef?: string;
  settlementRef?: string;
  taskId?: string;
  sourceRevision?: number;
  taskRevision?: number;
} {
  const attempt = attemptEvidence(home, attemptId);
  if (!existsSync(attempt.attemptPath)) return {};
  let value: Record<string, unknown>;
  try {
    value = JSON.parse(readFileSync(attempt.attemptPath, "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
  const correlation = asRecord(value.correlation);
  const sourceRef = typeof correlation.sourceRef === "string" ? correlation.sourceRef : undefined;
  const conversationId = typeof correlation.conversationId === "string" ? correlation.conversationId : undefined;
  const turnId = typeof correlation.turnId === "string" ? correlation.turnId : undefined;
  const actionId = typeof correlation.actionId === "string" ? correlation.actionId : undefined;
  const taskId = typeof value.taskId === "string" && value.taskId.length > 0 ? value.taskId : undefined;
  const sourceRevision = typeof value.sourceRevision === "number" ? value.sourceRevision : undefined;
  const taskRevision = typeof value.taskRevision === "number" ? value.taskRevision : undefined;
  const result: {
    correlation?: AttemptCorrelation;
    attemptRef?: string;
    inputRef?: string;
    finalRecordRef?: string;
    settlementRef?: string;
    taskId?: string;
    sourceRevision?: number;
    taskRevision?: number;
  } = {
    attemptRef: attempt.attemptRef,
    inputRef: attempt.inputRef,
    finalRecordRef: attempt.finalRecordRef,
    settlementRef: attempt.settlementRef,
  };
  if (taskId !== undefined) result.taskId = taskId;
  if (sourceRevision !== undefined) result.sourceRevision = sourceRevision;
  if (taskRevision !== undefined) result.taskRevision = taskRevision;
  if (
    sourceRef !== undefined
    && conversationId !== undefined
    && turnId !== undefined
    && actionId !== undefined
  ) {
    result.correlation = { sourceRef, conversationId, turnId, actionId };
  }
  return result;
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

function mapCarrierError(error: unknown): ConversationCarrierError {
  if (error instanceof ConversationCarrierError) return error;
  const message = errorMessage(error);
  if (/active task-run lease/u.test(message)) {
    return new ConversationCarrierError("lease-conflict", message);
  }
  if (/not clean/u.test(message)) {
    return new ConversationCarrierError("worktree-dirty", message);
  }
  return new ConversationCarrierError(
    "source-unavailable",
    `the carrier cannot be prepared: ${message}`,
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== "" ? error.message : String(error);
}
