import { createRequire } from "node:module";
import { existsSync, readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import type { CellRunRecord, TraceEvent } from "../../../../packages/work-cell/src/contracts";
import type { WorkerCard, WorkerCatalog } from "../../../../packages/work-cell/src/worker-catalog";
import type { TaskContinueOperation } from "../../../autonomy/src/conversation-coordinator";
import {
  createRunRequestRecord,
  RunControlRegistry,
  RunRequestConflictError,
  runOrdinaryTaskRun,
  runStanding,
  RunStopRefusal,
  stopRun,
  type RunRequest,
  type RunRequestRecordStanding,
  type RunResult,
  type RunStanding,
  type RunTerminalOutcome,
} from "../orchestration/run";
import {
  attemptLeaseStanding,
  buildTaskCellInput,
  deriveTaskRunExecution,
  executeTaskCellRun,
  resolveOrdinaryTaskRun,
  verifyCleanStatus,
  verifyCurrentBinding,
  verifyTaskSnapshotAfterLease,
  type ResolvedOrdinaryTaskRun,
} from "../task-run";
import {
  readStrictTaskAttemptEvidence,
  type ParsedTaskRunAttempt,
  type ParsedTaskRunSettlement,
  type StrictTaskAttemptEvidence,
} from "../task-attempts";
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
  | "control-conflict"
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
  /**
   * The exact retained carrier identity: the committed task_continue action
   * UUID, which is also the canonical Run identity and the Task attempt id.
   */
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
   * Stop only this exact retained carrier through the canonical Run control
   * owner: the durable Run control receipt is written before the abort, and
   * the abort is dispatched synchronously. The terminal attempt settlement
   * follows as separate evidence.
   */
  stop(actor: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
  }): CarrierControlReceipt;
  /**
   * Bounded-retention diagnostic: after terminal settlement the carrier drops
   * its listener sets, and a settled handle keeps only its identity, terminal
   * settlement, and evidence refs; the handle retains no CellInput, Task, or
   * lease payload at any point because the canonical Run owner holds them.
   * Tests assert repeated settle stays bounded through this surface.
   */
  retention(): { activityListeners: number; settledListeners: number; retainedPayloads: number };
}

export interface CarrierStartReceipt {
  /** The canonical Run identity; equals the committed task_continue action UUID. */
  readonly carrierId: string;
  readonly taskId: string;
  readonly sourceRevision: number;
  readonly taskRevision: number;
  readonly evidenceRefs: readonly string[];
}

/**
 * The exact owner-backed standing one reconnect hydration re-derives for a
 * committed task_continue action: the retained presentation handle's live or
 * terminal liveness, or — when this process retains no handle (a server
 * reload/restart) — the canonical Run-owned standing (`runStanding`) of the
 * Run whose identity equals the committed action, projected as terminal or
 * truthful unknown, never live. Hydration is read-only: it never starts,
 * stops, reconciles, or mutates any Run or attempt evidence.
 */
export type CarrierHydration =
  | {
    readonly standing: "live";
    readonly identity: ConversationCarrierIdentity;
  }
  | {
    readonly standing: "terminal";
    readonly identity: ConversationCarrierIdentity;
    readonly settlement: CarrierSettlement;
  }
  | {
    readonly standing: "unknown";
    readonly identity: ConversationCarrierIdentity;
    readonly reason: string;
  };

/**
 * The conversation-owned adapter over the canonical O2 Run owner
 * (`orchestration/run.ts`). The committed task_continue action UUID is the
 * only canonical Run identity: the registry publishes the immutable Run
 * request (with its exact journal-owned correlation) BEFORE writer
 * acquisition and mutable preparation, then the existing Orchestration Run
 * owner acquires at most one O3 writer claim, invokes at most one unchanged
 * Work Cell, owns the exact live stop, the truthful terminal outcome, the
 * read-only standing, and the idempotent reconciliation. The registry keeps
 * only presentation handles plus the per-process action mapping: no
 * AbortController, Work Cell invocation, finalization, writer lease, or
 * control receipt is owned here, and nothing here becomes a second task or
 * execution store. Durable facts stay in the Run request record, the
 * immutable CellInput, the Work Cell final, the settlement, the Run control
 * receipt, and the O3 claim in the Worktree Git metadata.
 */
export interface ConversationExecutionCarrierRegistry {
  readonly home: string;
  /**
   * Synchronously re-resolve the exact Task/source/project/Worktree
   * selectors, publish the immutable Run request for the committed action
   * (runId == actionId) before writer acquisition, and start at most one
   * asynchronous Run through the canonical O2 owner. The exact durable
   * (turnId, actionId) mapping refuses a second carrier for the same
   * committed action. An identical replay converges on the retained Run
   * without a second Cell; a different request body under the same identity
   * conflicts; any stale, unregistered, guessed, dirty, settled, or
   * mismatched selector throws `ConversationCarrierError` with no Run record
   * and no claim.
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
  /**
   * Apply one exact live stop through the canonical Run control owner
   * (`stopRun`): the durable Run control receipt is written before the
   * abort, an identical causal tuple replays the retained receipt, and a
   * distinct causal tuple, unknown Run, or terminal Run is refused with zero
   * effect. The registry owns no controller.
   */
  controlCarrier(input: {
    readonly carrierId: string;
    readonly control: "stop";
    readonly actor: { readonly conversationId: string; readonly turnId: string; readonly actionId: string };
  }): CarrierControlReceipt;
  /**
   * Re-derive the exact owner-backed standing of the carrier started by one
   * committed task_continue action, for reconnect hydration after durable
   * replay/reconciliation. The action's full journal-owned correlation —
   * conversation, turn, action, and the deterministic causal sourceRef — is
   * required: a retained presentation handle contributes its live or
   * terminal liveness only when its exact identity satisfies the same
   * correlation, and with no retained handle the canonical Run-owned
   * standing (`runStanding`) of the Run whose identity equals the committed
   * action is projected terminal only when the exact O3 release succeeded,
   * else truthful unknown — never live. Historical pre-Run-identity attempt
   * families fall back to the exact directory scan. Undefined when no exact
   * Run evidence exists for the action. Read-only: no start, stop,
   * reconciliation, or mutation is performed.
   */
  hydrateCarrier(input: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
    readonly sourceRef: string;
  }): CarrierHydration | undefined;
}

export interface ConversationExecutionCarrierOptions {
  /** Test seam; defaults to the current worker policy catalog. */
  readonly catalog?: WorkerCatalog;
  readonly environment?: NodeJS.ProcessEnv;
  /**
   * Test-only crash boundary invoked synchronously after the immutable Run
   * request record is published and before writer acquisition or any
   * mutable preparation: at this boundary the Run record exists while no
   * writer claim and no CellInput exist.
   */
  readonly onRunRequestPublished?: (runId: string) => void;
}

export function createConversationExecutionCarrierRegistry(
  homeArgument: string | undefined,
  options: ConversationExecutionCarrierOptions = {},
): ConversationExecutionCarrierRegistry {
  const home = resolveHome(homeArgument);
  const catalog = options.catalog ?? currentCatalog(options.environment ?? process.env);
  return new WorkbenchConversationCarrierRegistry(home, catalog, options);
}

class WorkbenchConversationCarrierRegistry implements ConversationExecutionCarrierRegistry {
  readonly home: string;
  private readonly catalog: WorkerCatalog;
  /** The canonical Run control registry the O2 owner registers live Runs into. */
  private readonly runControlRegistry = new RunControlRegistry();
  private readonly handles = new Map<string, TaskRunCellCarrier>();
  private readonly startedByCommittedAction = new Map<string, string>();
  private readonly onRunRequestPublished: ((runId: string) => void) | undefined;

  constructor(
    home: string,
    catalog: WorkerCatalog,
    options: ConversationExecutionCarrierOptions,
  ) {
    this.home = home;
    this.catalog = catalog;
    this.onRunRequestPublished = options.onRunRequestPublished;
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

    // Fresh guarded read-only acceptance: the exact worker, Task/source
    // revisions, registered project identity, current primary observation,
    // bound Worktree path and head, and the clean status are re-read from
    // their canonical owners before any durable Run identity or O3 claim. A
    // stale, unregistered, guessed, settled, or dirty selector fails here
    // with no effect: no Run record, no writer claim, no Cell.
    const resolved = this.resolveCarrierRun(input.operation);
    verifyExpectedRevisions(resolved, input.operation);
    verifyExecutionSelectors(this.home, { task: resolved.task, worktree: resolved.worktree }, input.operation);
    try {
      verifyCleanStatus(resolved.worktree);
    } catch (error) {
      throw mapPreparationError(error);
    }

    // The committed action UUID is the only canonical Run identity: one
    // durable Run request over the existing attempt evidence family,
    // published BEFORE writer acquisition and BEFORE any mutable
    // preparation. The exact journal-owned correlation is retained as
    // attribution evidence on the request record.
    const request: RunRequest = {
      requestId: input.actionId,
      taskId: resolved.task.id,
      taskRevision: resolved.task.revision,
      sourceRevision: resolved.observed.sourceRevision,
      workerId: resolved.card.id,
      execution: resolved.execution,
      worktree: resolved.worktree,
    };
    const correlation = {
      conversationId: input.conversationId,
      turnId: input.turnId,
      actionId: input.actionId,
      sourceRef: taskActionSourceRef(input.conversationId, input.actionId),
    };
    let published: RunRequestRecordStanding;
    try {
      published = createRunRequestRecord(this.home, request, correlation);
    } catch (error) {
      if (error instanceof RunRequestConflictError) {
        throw new ConversationCarrierError(
          "carrier-duplicate",
          `action ${input.actionId} already retains a different Run request under the same identity; identical replay is refused: ${error.message}`,
        );
      }
      throw mapPreparationError(error);
    }

    this.startedByCommittedAction.set(actionKey, input.actionId);

    if (published.standing === "converged") {
      // An identical replay converges on the retained Run: no second Cell is
      // invoked and no second claim is acquired. A retained Run without a
      // final is never restarted or replayed here; its standing is inspected
      // and its terminal outcome is reconciled only by the canonical Run
      // owner.
      return this.convergedCarrierReceipt(input.actionId);
    }

    if (this.onRunRequestPublished !== undefined) {
      // Test crash boundary: the immutable Run request is durably published
      // while no writer claim and no CellInput exist yet.
      this.onRunRequestPublished(input.actionId);
    }

    const identity: ConversationCarrierIdentity = {
      carrierId: input.actionId,
      conversationId: input.conversationId,
      turnId: input.turnId,
      actionId: input.actionId,
      taskId: resolved.task.id,
      attemptId: input.actionId,
      workerId: resolved.card.id,
      worktree: resolved.worktree,
    };
    const handle = new TaskRunCellCarrier({
      identity,
      stopOwner: (actor) => this.controlCarrier({
        carrierId: input.actionId,
        control: "stop",
        actor,
      }),
    });
    this.handles.set(input.actionId, handle);

    // The canonical O2 Run owner executes the published Run: at most one O3
    // writer claim, one immutable CellInput, one unchanged Work Cell, one
    // truthful terminal outcome, and the exact live-stop registry entry. The
    // presentation handle owns no controller, no execution, no
    // finalization, no lease, and no receipt.
    const runPromise = runOrdinaryTaskRun(this.home, request, {
      prePublished: published,
      registry: this.runControlRegistry,
      card: resolved.card,
      revalidate: () => {
        // The same fresh selectors re-read after the exact claim: any drift
        // settles a truthful pre-Cell failure with zero Cell invocations.
        verifyTaskSnapshotAfterLease(this.home, resolved.observed);
        verifyCurrentBinding(this.home, resolved.projectId, resolved.worktree);
        verifyCleanStatus(resolved.worktree);
        verifyExecutionSelectors(
          this.home,
          { task: resolved.task, worktree: resolved.worktree },
          input.operation,
        );
      },
      lowerCellInput: () => buildTaskCellInput(
        resolved.task,
        resolved.worktree,
        resolved.card.id,
        resolved.card,
        input.actionId,
      ),
      execute: async (cellInput, options) => {
        const outcome = await executeTaskCellRun(this.catalog, cellInput, {
          host: requireFromHere("../../../../packages/work-cell/src/workspace").createLocalHost(),
          ...(options.signal === undefined ? {} : { signal: options.signal }),
          onTrace: (event) => handle.observeTrace(event),
        });
        if (outcome.status === "failed") throw new Error(outcome.error);
        return outcome.record;
      },
    });
    void this.consumeRun(handle, runPromise);
    return {
      carrierId: input.actionId,
      taskId: resolved.task.id,
      sourceRevision: resolved.observed.sourceRevision,
      taskRevision: resolved.task.revision,
      evidenceRefs: [
        published.refs.attemptRef,
        published.refs.inputRef,
        published.refs.finalRecordRef,
        published.refs.settlementRef,
      ],
    };
  }

  /**
   * The terminal standing of one executed Run comes only from the canonical
   * Run-owned standing read after the O2 owner finishes: terminal with the
   * exact retained evidence when the O3 release succeeded, truthful
   * unresolved otherwise. A pre-Cell refusal settles runner-failed through
   * the owner and rethrows; the standing read stays the single terminal
   * source.
   */
  private async consumeRun(handle: TaskRunCellCarrier, runPromise: Promise<RunResult>): Promise<void> {
    try {
      await runPromise;
    } catch {
      // The O2 owner settles pre-Cell refusals and rethrows the original
      // error; the canonical standing below projects the retained outcome.
    }
    const standing = runStanding(this.home, handle.identity.carrierId);
    handle.finishTerminal(settlementFromRunStanding(standing, handle.identity.carrierId));
  }

  /** The retained Run's own evidence projected as the converged start receipt. */
  private convergedCarrierReceipt(actionId: string): CarrierStartReceipt {
    const evidence = readStrictTaskAttemptEvidence(this.home, actionId);
    if (evidence.standing !== "available" || evidence.attempt === undefined) {
      throw new ConversationCarrierError(
        "carrier-unknown",
        `Run ${actionId} retains no usable evidence for identical replay convergence: `
        + `${evidence.error ?? evidence.standing}`,
      );
    }
    const attempt = evidence.attempt;
    return {
      carrierId: actionId,
      taskId: attempt.taskId,
      sourceRevision: attempt.sourceRevision,
      taskRevision: attempt.taskRevision,
      evidenceRefs: [
        evidence.refs.attemptRef,
        evidence.refs.inputRef,
        evidence.refs.finalRecordRef,
        evidence.refs.settlementRef,
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
    let receipt;
    try {
      receipt = stopRun(this.home, input.carrierId, {
        control: "stop",
        requestedBy: runStopRequester(input.actor),
        sourceRef: taskActionSourceRef(input.actor.conversationId, input.actor.actionId),
      }, this.runControlRegistry);
    } catch (error) {
      if (error instanceof RunStopRefusal) throw mapRunStopRefusal(error);
      throw new ConversationCarrierError(
        "carrier-unknown",
        `the exact live stop for carrier ${input.carrierId} cannot be applied: ${errorMessage(error)}`,
      );
    }
    return {
      carrierId: input.carrierId,
      control: "stop",
      outcome: "settled",
      evidenceRefs: [receipt.receiptRef, receipt.settlementRef],
    };
  }

  hydrateCarrier(input: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
    readonly sourceRef: string;
  }): CarrierHydration | undefined {
    // The full journal-owned correlation gates every projection path: the
    // supplied sourceRef must equal the deterministic taskActionSourceRef
    // for the exact conversation/action before any retained-handle
    // liveness can be projected. A mismatched sourceRef fails closed with
    // no live or terminal projection and no stop affordance.
    if (input.sourceRef !== taskActionSourceRef(input.conversationId, input.actionId)) {
      return undefined;
    }
    const attemptId = this.startedByCommittedAction.get(
      committedActionKey(input.conversationId, input.actionId),
    );
    if (attemptId !== undefined) {
      const handle = this.handles.get(attemptId);
      // The retained handle contributes its standing only when its exact
      // identity satisfies the full journal-owned correlation; a turn
      // mismatch is a partial match and must never hydrate a foreign handle.
      if (handle !== undefined && handle.identity.turnId === input.turnId) {
        return hydrationFromHandle(handle);
      }
    }
    // The canonical Run-owned standing for this committed action: the
    // committed action UUID is the Run identity, so the exact retained
    // attempt family is `state/task-attempts/<actionId>`.
    const standing = runStanding(this.home, input.actionId);
    if (standing.standing !== "unavailable") {
      const evidence = readStrictTaskAttemptEvidence(this.home, input.actionId);
      const correlation = evidence.attempt?.correlation;
      if (
        correlation !== undefined
        && correlation.conversationId === input.conversationId
        && correlation.turnId === input.turnId
        && correlation.actionId === input.actionId
        && correlation.sourceRef === input.sourceRef
      ) {
        return hydrationFromRunStanding(input, evidence, standing);
      }
      // A Run record exists at this exact action identity but its retained
      // correlation does not match the full journal-owned correlation: fail
      // closed, never attach a foreign Run and never select by order.
      return undefined;
    }
    // Historical pre-Run-identity attempt families: the exact directory scan.
    return carrierHydrationFromEvidence(this.home, {
      conversationId: input.conversationId,
      turnId: input.turnId,
      actionId: input.actionId,
      sourceRef: input.sourceRef,
    });
  }

  /** The fresh read-only acceptance of one continue: no durable write, no claim. */
  private resolveCarrierRun(operation: TaskContinueOperation): ResolvedOrdinaryTaskRun {
    try {
      return resolveOrdinaryTaskRun(
        this.home,
        { id: operation.taskId, workerId: operation.workerId },
        {
          resolveWorkerCard: (workerId) => this.catalogWorkerCard(workerId),
          deriveExecution: deriveTaskRunExecution,
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

/** The operation's expected selectors against the freshly resolved re-read. */
function verifyExpectedRevisions(
  resolved: ResolvedOrdinaryTaskRun,
  operation: TaskContinueOperation,
): void {
  if (resolved.observed.sourceRevision !== operation.expectedSourceRevision) {
    throw new ConversationCarrierError(
      "stale-revision",
      `task source revision is stale for the continue: expected ${operation.expectedSourceRevision}, current ${resolved.observed.sourceRevision}`,
    );
  }
  if (resolved.task.revision !== operation.expectedRevision) {
    throw new ConversationCarrierError(
      "stale-revision",
      `task revision is stale for the continue: expected ${operation.expectedRevision}, current ${resolved.task.revision}`,
    );
  }
}

/**
 * The exact execution selection any bound-work effect must re-verify: the
 * registered project identity, its expected current primary head, the exact
 * bound Worktree path, and its expected head. A `task_continue` carrier and a
 * temporary contribution both copy these selectors from the projection, and
 * the host re-reads every one of them immediately before the effect.
 */
export interface ExecutionSelection {
  readonly projectId: string;
  readonly expectedPrimaryHead: string;
  readonly worktreePath: string;
  readonly expectedWorktreeHead: string;
}

/**
 * Compare one operation's exact execution selection against fresh owner reads
 * performed immediately before attempt/contribution creation: the registered
 * project identity, its current primary head, the exact bound Worktree path,
 * and its current head. Any X→Y drift between the projection the coordinator
 * copied and the current canonical owners fails stale with no effect; the
 * carrier never executes the drifted current selection.
 */
export function verifyExecutionSelectors(
  home: string,
  input: {
    /** The freshly re-read Task whose current binding owns the work. */
    readonly task: PrincipalTask;
    /** The exact bound Worktree path resolved from the Task's current binding. */
    readonly worktree: string;
  },
  operation: ExecutionSelection,
): void {
  const binding = input.task.binding;
  if (binding.kind !== "project-context" || binding.projectId !== operation.projectId) {
    throw new ConversationCarrierError(
      "stale-context",
      `task ${input.task.id} is not bound to the operation's exact registered project ${operation.projectId}; the action is refused`,
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
  if (observedWorktreePath !== input.worktree) {
    throw new ConversationCarrierError(
      "stale-context",
      `the operation's bound Worktree ${observedWorktreePath} does not match the task's current bound Worktree ${input.worktree}; the action is refused`,
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
    worktreeHead = requiredGit(["rev-parse", "HEAD"], input.worktree);
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

interface TaskRunCellCarrierInput {
  readonly identity: ConversationCarrierIdentity;
  /** The canonical Run control owner this presentation handle delegates its exact stop to. */
  readonly stopOwner: (actor: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
  }) => CarrierControlReceipt;
}

/**
 * The presentation handle of one conversation-owned Run. It owns no
 * AbortController, no Work Cell invocation, no finalization, no writer
 * lease, and no control receipt: the canonical O2 Run owner owns every one
 * of those. The handle projects the owner-backed terminal settlement the
 * registry derives from the canonical Run standing after the owner finishes,
 * relays bounded trace activity while live, and delegates an exact stop to
 * the canonical Run control owner. Bounded retention: a terminal handle
 * keeps only its identity and terminal settlement and drops all listener
 * closures.
 */
class TaskRunCellCarrier implements ConversationCarrierHandle {
  readonly identity: ConversationCarrierIdentity;
  readonly settled: Promise<CarrierSettlement>;
  private readonly stopOwner: TaskRunCellCarrierInput["stopOwner"];
  private readonly activityListeners = new Set<(activity: CarrierActivityDelta) => void>();
  private readonly settledListeners = new Set<(settlement: CarrierSettlement) => void>();
  private resolveSettled!: (settlement: CarrierSettlement) => void;
  private settlement?: CarrierSettlement;
  private runId?: string;

  constructor(input: TaskRunCellCarrierInput) {
    this.identity = input.identity;
    this.stopOwner = input.stopOwner;
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
      // The handle retains no CellInput, Task, or lease payload: the
      // canonical Run owner holds every execution payload.
      retainedPayloads: 0,
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
    // The canonical Run control owner applies the exact live stop and writes
    // the durable Run receipt; this handle owns no controller and no receipt.
    return this.stopOwner(actor);
  }

  observeTrace(event: TraceEvent): void {
    if (event.type === "cell.started") {
      const data = asRecord(event.data);
      if (typeof data.runId === "string" && data.runId.length > 0) this.runId = data.runId;
    }
    const text = renderCarrierActivity(event);
    if (text === undefined) return;
    for (const listener of this.activityListeners) listener({ text });
  }

  /** Terminal retention projected from the canonical Run standing; never mutated twice. */
  finishTerminal(settlement: CarrierSettlement): void {
    if (this.settlement !== undefined) return;
    this.settlement = settlement;
    const settledListeners = [...this.settledListeners];
    this.settledListeners.clear();
    this.activityListeners.clear();
    this.resolveSettled(settlement);
    for (const listener of settledListeners) listener(settlement);
  }
}

/** The exact durable (conversation, action) identity key shared by every committed-action runtime mapping. */
export function committedActionKey(conversationId: string, actionId: string): string {
  return `${conversationId}\u0000${actionId}`;
}

/**
 * The exact causal requester identity of one conversation-owned exact live
 * stop, retained on the canonical Run control receipt: the committed
 * work_control conversation/turn/action tuple of the controlling action. An
 * identical causal tuple replays the retained receipt; a distinct tuple
 * conflicts.
 */
export function runStopRequester(actor: {
  readonly conversationId: string;
  readonly turnId: string;
  readonly actionId: string;
}): string {
  return `conversation:${actor.conversationId}:turn:${actor.turnId}:action:${actor.actionId}`;
}

/** One canonical Run control refusal projected onto the carrier error codes. */
function mapRunStopRefusal(refusal: RunStopRefusal): ConversationCarrierError {
  const code: ConversationCarrierErrorCode =
    refusal.code === "unknown" ? "carrier-not-found"
    : refusal.code === "invalid" ? "carrier-unknown"
    : refusal.code === "settled" ? "carrier-not-live"
    : refusal.code === "not-live" ? "carrier-unknown"
    : "control-conflict";
  return new ConversationCarrierError(code, refusal.message);
}

/**
 * One truthful terminal Run outcome projected onto the carrier settlement
 * surface. Every status keeps its exact durable evidence refs: `recorded`
 * cites the settlement and the retained final record, `control-stopped`
 * cites the durable Run control receipt and the settlement, `runner-failed`
 * cites the settlement. Nothing is invented for a terminal outcome whose
 * exact O3 release did not succeed: that outcome projects unresolved and
 * reconcile-required instead.
 */
function settlementFromRunStanding(standing: RunStanding, runId: string): CarrierSettlement {
  if (standing.standing === "terminal") {
    const outcome = standing.outcome;
    if (outcome.cleanup === "released") return settlementFromRunOutcome(outcome);
    return {
      status: "unresolved",
      evidenceRefs: [outcome.refs.settlementRef],
      error:
        "the durable settlement exists but the exact task-run writer claim was not released: "
        + `${outcome.cleanupError ?? "retained"}; task reconcile-attempt can retry the exact release`,
    };
  }
  if (standing.standing === "invalid") {
    return {
      status: "unresolved",
      evidenceRefs: [standing.refs.settlementRef],
      error: `Run ${runId} retains invalid evidence: ${standing.error}`,
    };
  }
  if (standing.standing === "unresolved") {
    return {
      status: "unresolved",
      evidenceRefs: [standing.refs.settlementRef],
      error: `Run ${runId} retained no terminal settlement; liveness cannot be claimed`,
    };
  }
  return {
    status: "unresolved",
    evidenceRefs: [],
    error: `Run ${runId} retains no durable request record`,
  };
}

/** One released terminal Run outcome projected onto the carrier settlement surface. */
function settlementFromRunOutcome(outcome: RunTerminalOutcome): CarrierSettlement {
  if (outcome.status === "recorded") {
    return {
      status: "recorded",
      evidenceRefs: [outcome.refs.settlementRef, outcome.refs.finalRecordRef],
      ...(outcome.cellStatus === undefined ? {} : { cellStatus: outcome.cellStatus }),
    };
  }
  if (outcome.status === "control-stopped") {
    return {
      status: "control-stopped",
      evidenceRefs: outcome.controlRef === undefined
        ? [outcome.refs.settlementRef]
        : [outcome.controlRef, outcome.refs.settlementRef],
      ...(outcome.cellStatus === undefined ? {} : { cellStatus: outcome.cellStatus }),
      ...(outcome.error === undefined ? {} : { error: outcome.error }),
    };
  }
  return {
    status: "runner-failed",
    evidenceRefs: [outcome.refs.settlementRef],
    ...(outcome.cellStatus === undefined ? {} : { cellStatus: outcome.cellStatus }),
    ...(outcome.error === undefined ? {} : { error: outcome.error }),
  };
}

/** The retained handle's exact liveness projected as a read-only hydration. */
function hydrationFromHandle(handle: ConversationCarrierHandle): CarrierHydration {
  const liveness = handle.liveness();
  return liveness.state === "live"
    ? { standing: "live", identity: handle.identity }
    : {
      standing: "terminal",
      identity: handle.identity,
      settlement: liveness.settlement,
    };
}

/**
 * Project the canonical Run-owned standing of one committed task_continue
 * action (runId == actionId) onto the reconnect hydration surface. A
 * terminal standing is projected only when the exact O3 release succeeded;
 * a terminal settlement beside a still-retained exact claim, an unsettled
 * Run, or invalid Run evidence projects truthful unknown — never live, never
 * a new effect. The identity comes from the exact retained attempt record,
 * already gated by the full journal-owned correlation.
 */
function hydrationFromRunStanding(
  correlation: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
    readonly sourceRef: string;
  },
  evidence: StrictTaskAttemptEvidence,
  standing: RunStanding,
): CarrierHydration {
  const attempt = evidence.attempt!;
  const identity: ConversationCarrierIdentity = {
    carrierId: correlation.actionId,
    conversationId: correlation.conversationId,
    turnId: correlation.turnId,
    actionId: correlation.actionId,
    taskId: attempt.taskId,
    attemptId: correlation.actionId,
    workerId: attempt.workerId ?? "",
    worktree: attempt.worktree ?? evidence.input?.workspace.root ?? "",
  };
  if (standing.standing === "invalid") {
    return {
      standing: "unknown",
      identity,
      reason: `Run evidence is invalid and cannot settle standing: ${standing.error}`,
    };
  }
  if (standing.standing === "unresolved") {
    return {
      standing: "unknown",
      identity,
      reason: "the Run retains no terminal settlement; liveness cannot be claimed",
    };
  }
  const outcome = standing.outcome;
  if (outcome.cleanup !== "released") {
    return {
      standing: "unknown",
      identity,
      reason:
        "the Run retains a terminal settlement but its exact writer claim was not released; "
        + "reconcile the retained claim through the canonical Run owner before terminal standing is claimed",
    };
  }
  return {
    standing: "terminal",
    identity,
    settlement: settlementFromRunOutcome(outcome),
  };
}

/**
 * Re-derive the standing of one committed task_continue action from the
 * canonical attempt evidence family when this process retains no runtime
 * handle (server reload/restart). The action's full journal-owned
 * correlation — conversation, turn, action, and the deterministic causal
 * sourceRef — selects the exact attempt family: every field must match the
 * immutable attempt record's retained correlation. Zero, partial, or
 * multiple matching attempt families fail closed as no projection, so no
 * selection is ever made by directory or UUID order and no foreign Task or
 * attempt identity is ever attached to the journal action. A single exact
 * family's strict evidence is then projected terminal only when the
 * settlement is valid and its exact lease release succeeded — otherwise
 * unknown, never live, never a new effect. Undefined when no attempt
 * retains the action's full correlation.
 */
export function carrierHydrationFromEvidence(
  home: string,
  correlation: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
    readonly sourceRef: string;
  },
): CarrierHydration | undefined {
  const matches: Array<{ attemptId: string; attempt: ParsedTaskRunAttempt }> = [];
  for (const attemptId of listAttemptDirectories(home)) {
    const evidence = readStrictTaskAttemptEvidence(home, attemptId);
    const attempt = evidence.attempt;
    if (attempt === undefined) continue;
    const attemptCorrelation = attempt.correlation;
    if (
      attemptCorrelation === undefined
      || attemptCorrelation.conversationId !== correlation.conversationId
      || attemptCorrelation.turnId !== correlation.turnId
      || attemptCorrelation.actionId !== correlation.actionId
      || attemptCorrelation.sourceRef !== correlation.sourceRef
    ) continue;
    matches.push({ attemptId, attempt });
  }
  // Fail closed unless exactly one attempt family retains the full
  // correlation: never select by directory or UUID order, never attach a
  // foreign attempt identity to the journal action.
  if (matches.length !== 1) return undefined;
  const { attemptId, attempt } = matches[0]!;
  const evidence = readStrictTaskAttemptEvidence(home, attemptId);
  const identity: ConversationCarrierIdentity = {
    carrierId: attemptId,
    conversationId: correlation.conversationId,
    turnId: correlation.turnId,
    actionId: correlation.actionId,
    taskId: attempt.taskId,
    attemptId,
    workerId: attempt.workerId ?? "",
    worktree: evidence.input?.workspace.root ?? "",
  };
  const withoutHandle = carrierStandingWithoutHandle(home, attemptId);
  if (withoutHandle.kind === "settled" && evidence.settlement !== undefined) {
    return {
      standing: "terminal",
      identity,
      settlement: terminalSettlementFromEvidence(
        evidence.settlement,
        evidence,
      ),
    };
  }
  const reason = evidence.standing === "invalid"
    ? `attempt evidence is invalid and cannot settle standing: ${evidence.error ?? "invalid evidence"}`
    : withoutHandle.kind === "settled"
      ? "the attempt settled but its terminal settlement could not be re-read"
      : "the attempt has no valid terminal settlement and liveness cannot be claimed";
  return { standing: "unknown", identity, reason };
}

/**
 * Project one validated append-only settlement into the carrier terminal
 * standing with its exact canonical evidence refs: `recorded` cites the
 * settlement and the retained final record, `control-stopped` cites the
 * durable control receipt and the settlement, `runner-failed` cites the
 * settlement. Nothing is invented for a malformed settlement.
 */
function terminalSettlementFromEvidence(
  settlement: ParsedTaskRunSettlement,
  evidence: StrictTaskAttemptEvidence,
): CarrierSettlement {
  // The strict evidence validation already guarantees a present cellStatus
  // equals the retained final record's exact CellTerminalStatus; the
  // projection only narrows the schema-validated string back to that union.
  const cellStatus = settlement.cellStatus as CellRunRecord["status"] | undefined;
  switch (settlement.status) {
    case "recorded":
      return {
        status: "recorded",
        evidenceRefs: [
          evidence.refs.settlementRef,
          evidence.refs.finalRecordRef,
        ],
        cellStatus: cellStatus!,
      };
    case "control-stopped":
      return {
        status: "control-stopped",
        evidenceRefs: settlement.controlRef === undefined
          ? [evidence.refs.settlementRef]
          : [settlement.controlRef, evidence.refs.settlementRef],
        ...(cellStatus === undefined ? {} : { cellStatus }),
        ...(settlement.error === undefined ? {} : { error: settlement.error }),
      };
    case "runner-failed":
      return {
        status: "runner-failed",
        evidenceRefs: [evidence.refs.settlementRef],
        ...(cellStatus === undefined ? {} : { cellStatus }),
        ...(settlement.error === undefined ? {} : { error: settlement.error }),
      };
  }
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
export function renderCarrierActivity(event: TraceEvent): string | undefined {
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
  return requireFromHere("../../../autonomy/src/worker-policy").createCurrentWorkerCatalog(environment);
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
