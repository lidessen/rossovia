import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  unlinkSync,
} from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";
import { z } from "zod";
import type {
  CellInput,
  TraceEvent,
} from "../../../../packages/work-cell/src/contracts";
import type { WorkerCard, WorkerCatalog } from "../../../../packages/work-cell/src/worker-catalog";
import type {
  ContributionControlOperation,
  ContributionSpawnOperation,
} from "../../../autonomy/src/conversation-coordinator";
import type { ChildSummary } from "../../../autonomy/src/conversation-prompt";
import {
  admitPreparedDelegateBatch,
  type PreparedDelegateBatch,
  type TaskShapeAdmission,
} from "../../../autonomy/src/delegate-admission";
import {
  startDelegateBatch,
  type DelegateBatchHandle,
  type DelegateResultProjection,
} from "../../../autonomy/src/delegate-loop";
import { FileMissionTimeline } from "../../../autonomy/src/delegate-timeline";
import type { PrincipalTask, PrincipalTasks } from "../contracts";
import { loadHome, resolveHome, workspaceFor } from "../home";
import {
  createLocalTaskControlPlane,
  type LocalTaskReadPort,
} from "../local-task-control-plane";
import { expandPath } from "../paths";
import { observeWorkspace, requiredGit } from "../workspace";
import {
  acquireWorktreeLease,
  canonicalGitDirectory,
  evidenceRef,
  isProcessDefinitelyAbsent,
  ordinaryOpenCodeExcludes,
  ORDINARY_TASK_MAX_DURATION_MS,
  releaseWorktreeLease,
  verifyCleanStatus,
  writeImmutableJson,
  type TaskRunLease,
} from "../task-run";
import { digest, taskActionSourceRef } from "./contracts";
import { FileConversationJournal } from "./journal";
import { latestSettledTaskAction, observedWorktrees } from "./context";
import {
  committedActionKey,
  renderCarrierActivity,
} from "./execution-carrier";

const requireFromHere = createRequire(import.meta.url);

/** The bounded convergence wait for a committed action whose reservation exists without a started marker. */
const CONVERGENCE_POLL_MS = 25;
const CONVERGENCE_MAX_POLLS = 40;
const RESERVATION_PUBLISH_ATTEMPTS = 3;

export const CONTRIBUTION_SPAWN_VERSION = "rosso.conversation-contribution-spawn.v1" as const;
export const CONTRIBUTION_STARTED_VERSION = "rosso.conversation-contribution-started.v1" as const;
export const CONTRIBUTION_CONTROL_VERSION = "rosso.conversation-contribution-control.v1" as const;

/** The bounded terminal work-proof every temporary contribution must satisfy. */
export const CONTRIBUTION_TERMINAL_TOOL = "submit_contribution" as const;

/** The host-derived Task Shape admission identity for one temporary contribution. */
export const CONTRIBUTION_TASK_SHAPE_REVISION = "rosso.conversation-contribution-task-shape.v1" as const;

/** The one synthesis owner every conversation contribution names. */
export const CONTRIBUTION_RECONSTRUCTION_OWNER = "workbench-conversation-coordinator" as const;

/**
 * The exact prepared delegate-batch identity one conversation contribution
 * stores under in the delegate timeline: the durable (batchId, key) pair the
 * coordinator reads results by, expanded to the timeline's prepared-batch id.
 */
export function contributionPreparedBatchId(conversationId: string, batchId: string): string {
  return `conversation-contribution:${conversationId}:${batchId}`;
}

/** The canonical Task source every contribution derives its evidence from. */
export const CONTRIBUTION_TASK_SOURCE_REF = "workbench:state/tasks.json" as const;

const CONTRIBUTION_OBLIGATION_REF_PREFIX = "workbench:task:" as const;

export type ContributionErrorCode =
  | "contribution-duplicate"
  | "contribution-limit"
  | "task-missing"
  | "task-settled"
  | "task-not-bound"
  | "worker-unknown"
  | "worker-unavailable"
  | "capability-unsupported"
  | "effect-conflict"
  | "worktree-dirty"
  | "contribution-not-found"
  | "contribution-not-live"
  | "contribution-unknown"
  | "control-unsupported"
  | "control-conflict"
  | "dependency-unsettled"
  | "source-unavailable";

export class ContributionError extends Error {
  constructor(readonly code: ContributionErrorCode, message: string) {
    super(message);
    this.name = "ContributionError";
  }
}

export interface ContributionIdentity {
  /** The exact delegate batch identity of the formed contribution. */
  readonly batchId: string;
  readonly key: string;
  readonly cellId: string;
  readonly workerId: string;
  /** The exact retained catalog card, including its execution profile. */
  readonly worker: WorkerCard;
  readonly effectKind: "read-only" | "effectful";
  readonly taskId: string;
  readonly taskRevision: number;
  readonly sourceRevision: number;
  readonly conversationId: string;
  readonly turnId: string;
  readonly actionId: string;
}

export interface ContributionStartReceipt {
  readonly batchId: string;
  readonly key: string;
  readonly cellId: string;
  readonly workerId: string;
  readonly effectKind: "read-only" | "effectful";
  readonly taskId: string;
  readonly sourceRevision: number;
  readonly taskRevision: number;
  readonly evidenceRefs: readonly string[];
}

export interface ContributionControlReceipt {
  readonly batchId: string;
  readonly key: string;
  readonly taskId: string;
  readonly control: "stop";
  readonly outcome: "settled";
  readonly evidenceRefs: readonly string[];
}

export interface ContributionSettlement {
  readonly status: "completed" | "cancelled" | "failed" | "unresolved";
  readonly outcomeStatus?: string;
  readonly evidenceRefs: readonly string[];
  readonly error?: string;
}

export type ContributionLiveness =
  | { readonly state: "live" }
  | { readonly state: "settled"; readonly settlement: ContributionSettlement }
  | { readonly state: "unresolved"; readonly settlement: ContributionSettlement };

export interface ContributionHandle {
  readonly identity: ContributionIdentity;
  liveness(): ContributionLiveness;
  onActivity(listener: (activity: { text: string }) => void): () => void;
  onSettled(listener: (settlement: ContributionSettlement) => void): () => void;
  readonly settled: Promise<ContributionSettlement>;
  /**
   * Stop only this exact retained contribution: the durable control receipt
   * is written before the abort, and the abort is dispatched synchronously.
   * The terminal settlement follows as separate durable timeline evidence.
   */
  cancel(actor: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
  }): ContributionControlReceipt;
  /** Bounded-retention diagnostic over the runtime-only payloads. */
  retention(): { activityListeners: number; settledListeners: number; retainedPayloads: number };
}

export interface ContributionProjection {
  readonly batchId: string;
  readonly key: string;
  readonly workerId: string;
  readonly effectKind: "read-only" | "effectful";
  readonly taskId: string;
  readonly state: "live" | "settled" | "unknown" | "unresolved";
  /** The terminal outcome standing when the contribution has settled. */
  readonly status?: string;
}

export type ChildResultRefusalCode =
  | "not-found"
  | "not-settled"
  | "stale"
  | "source-unavailable"
  | "invalid";

export type ChildResultRead =
  | { readonly standing: "read"; readonly result: DelegateResultProjection }
  | { readonly standing: "refused"; readonly code: ChildResultRefusalCode; readonly reason: string };

/** The exact recovery outcome of one contribution-owned lease reconcile. */
export type ContributionLeaseReconcileResult =
  | { readonly outcome: "released"; readonly leasePath: string }
  | { readonly outcome: "not-retained"; readonly reason: string }
  | { readonly outcome: "refused"; readonly reason: string };

export interface ConversationContributionRegistry {
  readonly home: string;
  /**
   * Synchronously derive the full host-owned admission envelope from the
   * current canonical Task and runtime sources and start at most one bounded
   * delegate contribution for one committed `contribution_spawn` action. The
   * caller's spawn shape carries only intent plus non-derivable constraints;
   * the host derives the conversation's current Task from the durable
   * journal and re-validates its exact bound project/Worktree selection
   * against the current registered-project and Worktree observations
   * immediately before the effect. The exact durable (turnId, actionId)
   * mapping refuses a second contribution for the same committed action.
   * Throws `ContributionError` with no effect when the conversation has no
   * current Task, when the Task is missing, settled, or unbound, or when the
   * derived execution selection is unregistered, unobserved, or dirty, and
   * refuses overlapping effectful writers.
   */
    spawn(input: {
      readonly conversationId: string;
      readonly turnId: string;
      readonly actionId: string;
      readonly operation: ContributionSpawnOperation;
    }): Promise<ContributionStartReceipt>;
  /** The exact retained live contribution for one (batchId, key), when this process started it. */
  contribution(batchId: string, key: string): ContributionHandle | undefined;
  /** All contributions this process retains live handles for. */
  contributions(conversationId: string): readonly ContributionHandle[];
  /** The contribution started by one exact committed turn/action, when the runtime retained it. */
  startedContribution(conversationId: string, actionId: string): ContributionHandle | undefined;
  /**
   * Bounded liveness projection of every durable contribution of one
   * conversation: a retained handle that is still running claims live; a
   * durable terminal settlement claims that settlement; a durable spawn
   * receipt without a settlement is liveness unknown, never live.
   */
  listContributions(conversationId: string): Promise<readonly ContributionProjection[]>;
  /**
   * Bounded summaries of the conversation's settled, still-current child
   * contributions, for prompt composition. Stale results after a Task
   * correction are excluded; full evidence is loaded only through the exact
   * keyed result-read.
   */
  listSettledChildSummaries(conversationId: string): Promise<readonly ChildSummary[]>;
  /**
   * The keyed result-read for one exact settled contribution: the bounded
   * semantic projection succeeds only for the exact batch/key of this
   * conversation, only after settlement, and only while the contribution's
   * retained Task revision still matches the current Task source. Stale
   * results after a Task correction, unsettled results, and unknown
   * contributions are refused without guessing.
   */
  readChildResult(input: {
    readonly conversationId: string;
    readonly batchId: string;
    readonly key: string;
  }): Promise<ChildResultRead>;
  /** Apply one exact control to one exact retained contribution; throws on conflict or unknown liveness. */
  control(input: {
    readonly batchId: string;
    readonly key: string;
    readonly control: "stop";
    readonly actor: {
      readonly conversationId: string;
      readonly turnId: string;
      readonly actionId: string;
    };
  }): ContributionControlReceipt;
  /**
   * The narrowly contribution-owned recovery owner for one exact retained
   * task-run Worktree lease: it reuses the exact lease identity, PID
   * liveness, byte-match, and release semantics and never forges Task
   * attempt or Work Cell evidence. It recovers both a lock-only crash
   * (lease acquired, contribution never started) and a receipt-backed
   * terminal release failure; a live, unknown, mismatched, or unreadable
   * owner is refused fail-closed, and an already-absent lease is
   * not-retained, never re-acquired.
   */
  reconcileLease(input: {
    readonly conversationId: string;
    readonly batchId: string;
    readonly key: string;
  }): ContributionLeaseReconcileResult;
}

export interface ConversationContributionRegistryOptions {
  /** Create the canonical Task read port for this registry's resolved home. */
  readonly taskReadPortFactory?: (home: string) => LocalTaskReadPort;
  /** Test seam; defaults to the current worker policy catalog. */
  readonly catalog?: WorkerCatalog;
  readonly environment?: NodeJS.ProcessEnv;
  /** Bound on live contributions per conversation; read-only contributions may run in parallel up to it. */
  readonly maxLiveContributions?: number;
  readonly now?: () => string;
  /**
   * The timeline durability boundary the synchronous dependency check
   * joins before accepting a terminal settlement; defaults to fsync. A
   * throwing seam fails the check visibly, never accepts unverified
   * settlement.
   */
  readonly timelineSyncDurability?: (path: string) => void;
  /**
   * The ordered durability seams of the atomic reservation/started-marker
   * publication: fsync the fully written temporary file, publish via the
   * no-clobber hard link, then fsync the parent directory. A throwing seam
   * fails the publish before any successful started evidence is returned.
   * `removeTemporary` replaces the post-publication temporary removal; a
   * throwing seam fails the spawn visibly with no returned success, because
   * an unconfirmed publication cleanup must never be swallowed.
   * `onRetainedTemporary` is a test-only barrier invoked when the claim was
   * hard-linked but its directory-fsync durability boundary failed and the
   * temporary is therefore retained: a reader observing this state must
   * never return a started receipt or action.settled.
   */
  readonly atomicPublish?: {
    readonly syncFile?: (path: string) => void;
    readonly syncDirectory?: (path: string) => void;
    readonly removeTemporary?: (path: string) => void;
    readonly onRetainedTemporary?: (temporary: string) => void;
  };
  /**
   * Test-only crash barrier invoked synchronously after a successful
   * reservation publication and before lease acquisition; a throwing seam
   * simulates the winner exiting before start and leaves the reservation
   * intact.
   */
  readonly onReservationPublished?: () => void;
  /**
   * Test-only crash barriers at the exact durable-state boundaries of a
   * started spawn: after handle registration, after the durable delegate
   * prepare+dispatch, and after the started marker publication. A throwing
   * seam simulates the winner exiting at that boundary without cleanup.
   */
  readonly onHandleRegistered?: () => void;
  readonly onDelegateStarted?: () => void;
  readonly onStartedMarkerPublished?: () => void;
  /**
   * Test-only crash boundary invoked synchronously inside the failed-start
   * cleanup right after the started delegate is cancelled and before its
   * terminal settlement is awaited: the effectful lease is provably still
   * held while the old delegate has not settled, so a concurrent writer
   * must still be refused.
   */
  readonly onDelegateCancelled?: () => void;
}

export function createConversationContributionRegistry(
  homeArgument: string | undefined,
  options: ConversationContributionRegistryOptions = {},
): ConversationContributionRegistry {
  const home = resolveHome(homeArgument);
  const catalog = options.catalog ?? currentCatalog(options.environment ?? process.env);
  return new WorkbenchConversationContributionRegistry(home, catalog, options);
}

const SpawnReceiptSchema = z.object({
  version: z.literal(CONTRIBUTION_SPAWN_VERSION),
  batchId: z.string().min(1),
  key: z.string().min(1),
  cellId: z.string().min(1),
  workerId: z.string().min(1),
  executionProfile: z.record(z.string(), z.unknown()),
  effectKind: z.enum(["read-only", "effectful"]),
  taskId: z.string().min(1),
  taskRevision: z.number().int().positive(),
  sourceRevision: z.number().int().nonnegative(),
  conversationId: z.string().uuid(),
  turnId: z.string().uuid(),
  actionId: z.string().uuid(),
  sourceRef: z.string().min(1),
  intent: z.string().min(1),
  timelineRef: z.string().min(1),
  startedAt: z.string().min(1),
  /**
   * The exact task-run Worktree lease binding an effectful spawn reserves
   * BEFORE the lease is acquired: the deterministic lease path and owner
   * identity (task, batch-as-attempt, worktree). The reservation durably
   * binds the action to its lease owner before acquisition, so a
   * crash-retained lease is always traceable to its exact owner and
   * reconcile-required instead of hidden. The acquired lease file itself
   * carries the live pid and acquisition time.
   */
  lease: z.object({
    path: z.string().min(1),
    worktree: z.string().min(1),
    taskId: z.string().min(1),
    attemptId: z.string().min(1),
  }).strict().optional(),
}).strict();
type SpawnReceipt = z.infer<typeof SpawnReceiptSchema>;

type ContributionTaskCurrentness =
  | { readonly standing: "current" }
  | { readonly standing: "stale" }
  | { readonly standing: "unavailable"; readonly reason: string };

/**
 * The durable started marker one successful spawn publishes AFTER its
 * reservation, lease acquisition, and handle registration. It is the only
 * durable record that authorizes success: a loser or a reconciling operation
 * host may return a ContributionStartReceipt or action.settled only from
 * this marker. A reservation without a started marker is never a started
 * receipt and yields only unknown/uncertain/refused standings.
 */
const StartedReceiptSchema = z.object({
  version: z.literal(CONTRIBUTION_STARTED_VERSION),
  batchId: z.string().min(1),
  key: z.string().min(1),
  cellId: z.string().min(1),
  workerId: z.string().min(1),
  effectKind: z.enum(["read-only", "effectful"]),
  taskId: z.string().min(1),
  taskRevision: z.number().int().positive(),
  sourceRevision: z.number().int().nonnegative(),
  conversationId: z.string().uuid(),
  turnId: z.string().uuid(),
  actionId: z.string().uuid(),
  sourceRef: z.string().min(1),
  startedAt: z.string().min(1),
  /**
   * The exact durable delegate start cross-link: the prepared batch
   * identity and its checkpoint digest, which canonical readers re-verify
   * against the timeline before accepting the marker as a committed start.
   */
  start: z.object({
    preparedBatchId: z.string().min(1),
    checkpointDigest: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict(),
}).strict();
type StartedReceipt = z.infer<typeof StartedReceiptSchema>;

const ControlReceiptSchema = z.object({
  version: z.literal(CONTRIBUTION_CONTROL_VERSION),
  control: z.literal("stop"),
  batchId: z.string().min(1),
  key: z.string().min(1),
  cellId: z.string().min(1),
  taskId: z.string().min(1),
  sourceRef: z.string().min(1),
  requestedBy: z.object({
    conversationId: z.string().uuid(),
    turnId: z.string().uuid(),
    actionId: z.string().uuid(),
  }).strict(),
  requestedAt: z.string().min(1),
  spawnRef: z.string().min(1),
}).strict();
type ControlReceipt = z.infer<typeof ControlReceiptSchema>;

/** The durable contribution state directory of one conversation. */
export function contributionStateDirectory(home: string, conversationId: string): string {
  return join(home, "state", "conversation-contributions", conversationId);
}

/** Read the durable spawn receipts of one conversation, for canonical reconciliation. */
export function readContributionSpawnReceipts(home: string, conversationId: string): SpawnReceipt[] {
  return readReceiptFiles(SpawnReceiptSchema, join(home, "state", "conversation-contributions", conversationId), "spawn-")
    .filter((receipt) => receipt.conversationId === conversationId);
}

/** Read the durable started markers of one conversation, for canonical reconciliation. */
export function readContributionStartedReceipts(home: string, conversationId: string): StartedReceipt[] {
  return readReceiptFiles(StartedReceiptSchema, join(home, "state", "conversation-contributions", conversationId), "started-")
    .filter((receipt) => receipt.conversationId === conversationId);
}

/** Read the durable control receipts of one conversation, for canonical reconciliation. */
export function readContributionControlReceipts(home: string, conversationId: string): ControlReceipt[] {
  return readReceiptFiles(ControlReceiptSchema, join(home, "state", "conversation-contributions", conversationId), "control-");
}

function readReceiptFiles<T>(schema: z.ZodType<T>, directory: string, prefix: string): T[] {
  if (!existsSync(directory)) return [];
  const receipts: T[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.startsWith(prefix) || !entry.name.endsWith(".json")) continue;
    try {
      receipts.push(schema.parse(JSON.parse(readFileSync(join(directory, entry.name), "utf8"))));
    } catch {
      // An unreadable receipt projects nothing; it is never guessed.
    }
  }
  return receipts;
}

const ContributionSubmissionSchema = z.object({
  conclusion: z.string().min(1).max(8_000),
}).strict();

class WorkbenchConversationContributionRegistry implements ConversationContributionRegistry {
  readonly home: string;
  private readonly catalog: WorkerCatalog;
  private readonly timeline: FileMissionTimeline;
  private readonly journal: FileConversationJournal;
  private readonly taskReadPort: LocalTaskReadPort;
  private readonly maxLiveContributions: number;
  private readonly now: () => string;
  private readonly handles = new Map<string, WorkbenchContributionHandle>();
  private readonly startedByCommittedAction = new Map<string, string>();
  private readonly keysByConversation = new Map<string, Set<string>>();
  private readonly syncFile: (path: string) => void;
  private readonly syncDirectory: (path: string) => void;
  private readonly removeTemporary: (path: string) => void;
  private readonly onRetainedTemporary: ((temporary: string) => void) | undefined;
  private readonly onReservationPublished: (() => void) | undefined;
  private readonly onHandleRegistered: (() => void) | undefined;
  private readonly onDelegateStarted: (() => void) | undefined;
  private readonly onStartedMarkerPublished: (() => void) | undefined;
  private readonly onDelegateCancelled: (() => void) | undefined;

  constructor(
    home: string,
    catalog: WorkerCatalog,
    options: ConversationContributionRegistryOptions,
  ) {
    this.home = home;
    this.catalog = catalog;
    this.timeline = new FileMissionTimeline(
      join(home, "state", "conversation-contributions"),
      undefined,
      options.timelineSyncDurability,
    );
    this.journal = new FileConversationJournal(home);
    const taskReadPortFactory = options.taskReadPortFactory ?? createLocalTaskControlPlane;
    this.taskReadPort = taskReadPortFactory(home);
    const max = options.maxLiveContributions ?? 8;
    if (!Number.isInteger(max) || max < 1) {
      throw new Error("maxLiveContributions must be a positive integer");
    }
    this.maxLiveContributions = max;
    this.now = options.now ?? (() => new Date().toISOString());
    this.syncFile = options.atomicPublish?.syncFile ?? fsyncFileDurability;
    this.syncDirectory = options.atomicPublish?.syncDirectory ?? fsyncFileDurability;
    this.removeTemporary = options.atomicPublish?.removeTemporary ?? unlinkSync;
    this.onRetainedTemporary = options.atomicPublish?.onRetainedTemporary;
    this.onReservationPublished = options.onReservationPublished;
    this.onHandleRegistered = options.onHandleRegistered;
    this.onDelegateStarted = options.onDelegateStarted;
    this.onStartedMarkerPublished = options.onStartedMarkerPublished;
    this.onDelegateCancelled = options.onDelegateCancelled;
  }

  async spawn(input: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
    readonly operation: ContributionSpawnOperation;
  }): Promise<ContributionStartReceipt> {
    const operation = input.operation;
    const actionKey = committedActionKey(input.conversationId, input.actionId);
    const existing = this.startedByCommittedAction.get(actionKey);
    if (existing !== undefined) {
      throw new ContributionError(
        "contribution-duplicate",
        `a contribution for turn ${input.turnId} action ${input.actionId} was already started: ${existing}`,
      );
    }

    // Cross-process at-most-once: the committed-action reservation is the
    // first atomic owner, but only the durable started marker authorizes
    // success. A matching started marker converges on the winner's strict
    // receipt with no duplicate worker; a reservation without a started
    // marker means the winner may still be publishing it, so the loser
    // waits bounded for the marker and otherwise yields unknown, never
    // success.
    const convergence = this.awaitStartedConvergence(input, operation);
    if (convergence.standing === "converged") return convergence.receipt;
    if (convergence.standing === "refused") throw convergence.error;

    const conversationKeys = this.conversationKeys(input.conversationId);
    if (conversationKeys.has(operation.key)) {
      throw new ContributionError(
        "contribution-duplicate",
        `contribution key ${operation.key} is already used by conversation ${input.conversationId}`,
      );
    }
    if (this.liveCount(input.conversationId) >= this.maxLiveContributions) {
      throw new ContributionError(
        "contribution-limit",
        `conversation ${input.conversationId} already has ${this.maxLiveContributions} live contributions`,
      );
    }

    const tasks = this.currentTasks();
    const currentTaskAction = this.conversationCurrentTaskAction(input.conversationId);
    if (currentTaskAction === undefined) {
      throw new ContributionError(
        "task-missing",
        `conversation ${input.conversationId} has no current settled Task action; `
        + "the contribution cannot derive a Task to contribute against",
      );
    }
    const task = taskById(tasks, currentTaskAction.taskId);
    if (task === undefined) {
      throw new ContributionError(
        "task-missing",
        `the conversation's current task ${currentTaskAction.taskId} does not exist in the canonical Task source`,
      );
    }
    if (task.lifecycle === "settled") {
      throw new ContributionError(
        "task-settled",
        `task ${task.id} is settled; reopen it before forming a contribution`,
      );
    }
    if (task.binding.kind !== "project-context" || task.binding.worktreePath === undefined) {
      throw new ContributionError(
        "task-not-bound",
        `task ${task.id} must be bound to an existing project Worktree before a contribution can read it`,
      );
    }

    const card = this.catalogCard(operation.workerId);
    const capabilities = [operation.capabilityNeed];
    if (operation.imagePaths !== undefined && !capabilities.includes("vision")) {
      capabilities.push("vision");
    }
    try {
      this.catalog.assertSupports(operation.workerId, capabilities);
    } catch (error) {
      throw new ContributionError(
        "capability-unsupported",
        `worker '${operation.workerId}' cannot cover the contribution's declared capabilities: ${errorMessage(error)}`,
      );
    }

    let worktree: string;
    try {
      worktree = realpathSync(expandPath(task.binding.worktreePath));
    } catch {
      throw new ContributionError(
        "task-not-bound",
        `task ${task.id} bound Worktree does not exist: ${task.binding.worktreePath}`,
      );
    }
    verifyContributionSelection(this.home, task, worktree);

    if (operation.effectKind === "effectful") {
      try {
        verifyCleanStatus(worktree);
      } catch (error) {
        throw new ContributionError("worktree-dirty", errorMessage(error));
      }
    }

    const batchId = randomUUID();
    // dependsOn eligibility derives only from durable terminal contribution
    // timeline evidence at the current Task revision: live, unknown, stale,
    // or receipt-only keys are refused before any preparation or effect.
    const settledKeys = this.eligibleSettledKeys(input.conversationId, operation.dependsOn);

    // Fallible preparation happens before the shared Worktree lease is
    // acquired: a refused admission never touches the writer lock.
    const { batch, cell } = this.prepareContribution({
      conversationId: input.conversationId,
      actionId: input.actionId,
      task,
      sourceRevision: tasks.sourceRevision,
      worktree,
      card,
      operation,
      batchId,
      settledKeys,
    });

    let reservationPublished = false;
    let reservationRef = "";
    for (let attempt = 0; attempt < RESERVATION_PUBLISH_ATTEMPTS; attempt += 1) {
      try {
        // The committed-action reservation is the FIRST cross-process atomic
        // owner for both read-only and effectful spawns: the strict
        // reservation — including, for effectful work, the exact lease
        // binding reserved before acquisition — is durably published so an
        // EEXIST loser always reads a fully written claim.
        reservationRef = this.publishSpawnReservation({
          conversationId: input.conversationId,
          turnId: input.turnId,
          actionId: input.actionId,
          batchId,
          key: operation.key,
          cellId: cell.id,
          card,
          effectKind: operation.effectKind,
          task,
          sourceRevision: tasks.sourceRevision,
          intent: operation.intent,
          timelineRef: evidenceRef(this.home, this.timeline.timelinePath(input.conversationId)),
          worktree,
        });
        reservationPublished = true;
        break;
      } catch (error) {
        if (!isAlreadyExists(error)) {
          // A durability or publication failure retracts the just-published
          // (or half-published) reservation so no claim without proven
          // durability remains, then fails visibly; a failed retraction is
          // surfaced, never swallowed.
          const retractionFailure = this.retractSpawnReservation(input.conversationId, input.actionId);
          if (retractionFailure !== undefined) {
            throw new ContributionError(
              "source-unavailable",
              `${errorMessage(error)}; additionally: ${retractionFailure}`,
            );
          }
          throw error;
        }
        // The atomic reservation lost to another process. A fully published
        // started marker means the winner already succeeded: converge on it
        // without a second lease or worker. A reservation without a marker
        // means the winner is still publishing, crashed, or retracted its
        // claim: wait bounded, then converge, re-claim, or yield unknown —
        // never success without a started marker.
        const convergence = this.awaitStartedConvergence(input, operation);
        if (convergence.standing === "converged") return convergence.receipt;
        if (convergence.standing === "refused") throw convergence.error;
      }
    }
    if (!reservationPublished) {
      // The bounded convergence never yielded a claim: without a durable
      // reservation this spawn holds nothing and may not proceed.
      throw new ContributionError(
        "contribution-unknown",
        `the committed action ${input.actionId} could not be reserved within the bounded convergence; the spawn is refused without a claim`,
      );
    }

    if (this.onReservationPublished !== undefined) {
      // Crash barrier: a winner that exits here leaves only the reservation,
      // which every later reader treats as unknown, never started.
      this.onReservationPublished();
    }

    let lease: TaskRunLease | undefined;
    if (operation.effectKind === "effectful") {
      try {
        // Only the reservation winner may acquire the shared task-run
        // Worktree lease: one Task/Worktree permits at most one effectful
        // execution owner, whether a task_continue carrier or a temporary
        // contribution, and overlapping writers are refused by the same
        // atomic owner evidence.
        lease = acquireWorktreeLease(worktree, task.id, batchId);
      } catch (error) {
        // The reservation lost the exact writer lock: retract the
        // just-published reservation so the refused action leaves no claimed
        // contribution and no started marker, then fail visibly with no
        // effect. A failed retraction is surfaced, never swallowed.
        const retractionFailure = this.retractSpawnReservation(input.conversationId, input.actionId);
        throw new ContributionError(
          "effect-conflict",
          `${errorMessage(error)}${retractionFailure === undefined ? "" : `; additionally: ${retractionFailure}`}`,
        );
      }
    }

    const handle = new WorkbenchContributionHandle({
      identity: {
        batchId,
        key: operation.key,
        cellId: cell.id,
        workerId: card.id,
        worker: card,
        effectKind: operation.effectKind,
        taskId: task.id,
        taskRevision: task.revision,
        sourceRevision: tasks.sourceRevision,
        conversationId: input.conversationId,
        turnId: input.turnId,
        actionId: input.actionId,
      },
      home: this.home,
      spawnRef: reservationRef,
      ...(lease === undefined ? {} : { lease }),
    });
    this.handles.set(batchId, handle);
    this.startedByCommittedAction.set(actionKey, batchId);

    if (this.onHandleRegistered !== undefined) {
      // Crash barrier: a winner that exits here leaves the reservation, the
      // lease, and the registered handle, but no started evidence.
      this.onHandleRegistered();
    }

    let delegate: DelegateBatchHandle;
    try {
      // The reservation winner durably prepares and dispatches the exact
      // DelegateLoop batch through the shared startDelegateBatch owner
      // BEFORE any canonical started evidence may commit.
      delegate = await this.startContributionDelegate(handle, batch, input.conversationId);
    } catch (error) {
      throw await this.failStartedSpawn(input, actionKey, batchId, lease, undefined, error);
    }

    let startLink: { checkpointDigest: string; childTimelineId: string } | undefined;
    try {
      startLink = this.timeline.durableStartLinkSync(
        input.conversationId,
        contributionPreparedBatchId(input.conversationId, batchId),
      );
    } catch (error) {
      throw await this.failStartedSpawn(input, actionKey, batchId, lease, delegate, error);
    }
    if (startLink === undefined) {
      throw await this.failStartedSpawn(input, actionKey, batchId, lease, delegate,
        new Error("the delegate batch left no durable prepared start evidence"));
    }

    if (this.onDelegateStarted !== undefined) {
      // Crash barrier: a winner that exits here leaves the reservation, the
      // lease, and the durable delegate start, but no started marker.
      this.onDelegateStarted();
    }

    let startedRef: string;
    try {
      // The durable started marker is the only record that authorizes
      // success: it commits only after the durable delegate start, and it
      // carries the exact start cross-link canonical readers re-verify.
      startedRef = this.publishStartedReceipt({
        conversationId: input.conversationId,
        turnId: input.turnId,
        actionId: input.actionId,
        batchId,
        key: operation.key,
        cellId: cell.id,
        card,
        effectKind: operation.effectKind,
        task,
        sourceRevision: tasks.sourceRevision,
        start: {
          preparedBatchId: contributionPreparedBatchId(input.conversationId, batchId),
          checkpointDigest: startLink.checkpointDigest,
        },
      });
    } catch (error) {
      throw await this.failStartedSpawn(input, actionKey, batchId, lease, delegate, error);
    }

    if (this.onStartedMarkerPublished !== undefined) {
      // Crash barrier: a winner that exits here leaves the committed started
      // marker with its verified cross-links, which reconnect settles from.
      this.onStartedMarkerPublished();
    }

    conversationKeys.add(operation.key);
    void this.runContribution(handle, delegate, input.conversationId);
    return {
      batchId,
      key: operation.key,
      cellId: cell.id,
      workerId: card.id,
      effectKind: operation.effectKind,
      taskId: task.id,
      sourceRevision: tasks.sourceRevision,
      taskRevision: task.revision,
      evidenceRefs: [startedRef],
    };
  }

  contribution(batchId: string, key: string): ContributionHandle | undefined {
    const handle = this.handles.get(batchId);
    return handle !== undefined && handle.identity.key === key ? handle : undefined;
  }

  contributions(conversationId: string): readonly ContributionHandle[] {
    return [...this.handles.values()].filter((handle) => handle.identity.conversationId === conversationId);
  }

  startedContribution(conversationId: string, actionId: string): ContributionHandle | undefined {
    const batchId = this.startedByCommittedAction.get(committedActionKey(conversationId, actionId));
    return batchId === undefined ? undefined : this.handles.get(batchId);
  }

  /**
   * The durable started marker for one exact committed action, read from
   * the action-keyed marker path with the publication commit boundary
   * joined: the directory fsync confirms the marker link is durable before
   * the read accepts it, and the strict reservation + durable delegate
   * start cross-links must verify. An in-flight, unverifiable, or absent
   * marker is never a committed started record.
   */
  private readStartedReceiptFor(conversationId: string, actionId: string): StartedReceipt | undefined {
    const directory = this.conversationDirectory(conversationId);
    const path = join(directory, `started-${actionId}.json`);
    let raw: string;
    try {
      raw = readFileSync(path, "utf8");
    } catch (error) {
      if (isMissing(error)) return undefined;
      throw new ContributionError(
        "source-unavailable",
        `the committed action ${actionId} holds an unreadable started marker: ${errorMessage(error)}`,
      );
    }
    try {
      this.syncDirectory(directory);
    } catch (error) {
      throw new ContributionError(
        "source-unavailable",
        `the started marker's publication durability boundary cannot be joined: ${errorMessage(error)}`,
      );
    }
    let started: StartedReceipt;
    try {
      started = StartedReceiptSchema.parse(JSON.parse(raw));
    } catch (error) {
      throw new ContributionError(
        "source-unavailable",
        `the committed action ${actionId} holds an invalid started marker: ${errorMessage(error)}`,
      );
    }
    const reason = verifyContributionStartedMarker(this.home, directory, started, {
      syncDirectory: this.syncDirectory,
    });
    if (reason !== undefined) {
      throw new ContributionError(
        "contribution-unknown",
        `the started marker for action ${actionId} is not a committed started record: ${reason}`,
      );
    }
    return started;
  }

  /**
   * Bounded convergence on one committed action's durable records: a fully
   * published started marker converges on the winner's strict receipt; a
   * reservation without a marker may still be mid-publication by a live
   * winner, so the caller waits bounded before yielding unknown or, when the
   * reservation was retracted, re-claiming. Never returns success without a
   * started marker.
   */
  private awaitStartedConvergence(
    input: {
      readonly conversationId: string;
      readonly turnId: string;
      readonly actionId: string;
    },
    operation: ContributionSpawnOperation,
  ):
    | { readonly standing: "converged"; readonly receipt: ContributionStartReceipt }
    | { readonly standing: "unclaimed" }
    | { readonly standing: "refused"; readonly error: ContributionError } {
    const directory = this.conversationDirectory(input.conversationId);
    for (let attempt = 0; attempt < CONVERGENCE_MAX_POLLS; attempt += 1) {
      let started: StartedReceipt | undefined;
      try {
        started = this.readStartedReceiptFor(input.conversationId, input.actionId);
      } catch (error) {
        if (error instanceof ContributionError && error.code === "contribution-unknown") {
          // An in-flight or unverifiable marker: keep polling bounded.
        } else {
          throw error;
        }
      }
      if (started !== undefined) {
        const mismatch = spawnReceiptMismatch(started, input, operation);
        if (mismatch === undefined) {
          return { standing: "converged", receipt: winnerReceipt(started, this.home) };
        }
        return {
          standing: "refused",
          error: new ContributionError(
            "contribution-duplicate",
            `the committed action ${input.actionId} already retains a started contribution that does not match this operation: ${mismatch}`,
          ),
        };
      }
      const reservation = readSpawnReservation(directory, input.actionId);
      if (reservation === undefined) return { standing: "unclaimed" };
      Bun.sleepSync(CONVERGENCE_POLL_MS);
    }
    return {
      standing: "refused",
      error: new ContributionError(
        "contribution-unknown",
        `the committed action ${input.actionId} retains a reservation without a started marker; `
        + "whether a worker started is unknown and the spawn cannot be re-claimed",
      ),
    };
  }

  async listContributions(conversationId: string): Promise<readonly ContributionProjection[]> {
    const projections: ContributionProjection[] = [];
    for (const receipt of this.readSpawnReceipts(conversationId)) {
      const handle = this.handles.get(receipt.batchId);
      if (handle !== undefined) {
        const liveness = handle.liveness();
        if (liveness.state === "live") {
          projections.push({
            batchId: receipt.batchId,
            key: receipt.key,
            workerId: receipt.workerId,
            effectKind: receipt.effectKind,
            taskId: receipt.taskId,
            state: "live",
          });
        } else if (liveness.state === "settled") {
          projections.push({
            batchId: receipt.batchId,
            key: receipt.key,
            workerId: receipt.workerId,
            effectKind: receipt.effectKind,
            taskId: receipt.taskId,
            state: "settled",
            status: liveness.settlement.outcomeStatus ?? liveness.settlement.status,
          });
        } else {
          projections.push({
            batchId: receipt.batchId,
            key: receipt.key,
            workerId: receipt.workerId,
            effectKind: receipt.effectKind,
            taskId: receipt.taskId,
            state: "unresolved",
          });
        }
        continue;
      }
      // No retained runtime handle: a durable terminal settlement may still
      // exist, and an unsettled spawn receipt is liveness unknown, never live.
      let recovered;
      try {
        recovered = await this.timeline.recoverBatch(conversationId, contributionPreparedBatchId(conversationId, receipt.batchId));
      } catch {
        projections.push({
          batchId: receipt.batchId,
          key: receipt.key,
          workerId: receipt.workerId,
          effectKind: receipt.effectKind,
          taskId: receipt.taskId,
          state: "unknown",
        });
        continue;
      }
      const outcome = recovered.ready && recovered.outcomes !== undefined
        ? recovered.outcomes.find((candidate) => candidate.key === receipt.key)
        : undefined;
      if (recovered.ready && outcome !== undefined) {
        // A terminal timeline settlement with a still-retained exact lease is
        // unresolved and reconcile-required, never settled: the retained
        // writer lock must stay visible until the exact release succeeds.
        if (receipt.lease !== undefined && contributionLeaseStanding(receipt.lease) === "retained") {
          projections.push({
            batchId: receipt.batchId,
            key: receipt.key,
            workerId: receipt.workerId,
            effectKind: receipt.effectKind,
            taskId: receipt.taskId,
            state: "unresolved",
            status: "reconcile-required: the retained task-run Worktree lease still blocks effectful writers",
          });
        } else {
          projections.push({
            batchId: receipt.batchId,
            key: receipt.key,
            workerId: receipt.workerId,
            effectKind: receipt.effectKind,
            taskId: receipt.taskId,
            state: "settled",
            status: outcome.status,
          });
        }
      } else {
        projections.push({
          batchId: receipt.batchId,
          key: receipt.key,
          workerId: receipt.workerId,
          effectKind: receipt.effectKind,
          taskId: receipt.taskId,
          state: "unknown",
        });
      }
    }
    return projections;
  }

  async listSettledChildSummaries(conversationId: string): Promise<readonly ChildSummary[]> {
    const summaries: ChildSummary[] = [];
    for (const receipt of this.readSpawnReceipts(conversationId)) {
      const currentness = this.taskCurrentness(receipt);
      if (currentness.standing === "unavailable") {
        throw new ContributionError("source-unavailable", currentness.reason);
      }
      if (currentness.standing === "stale") continue;
      let result: DelegateResultProjection;
      try {
        result = await this.timeline.readResult(conversationId, contributionPreparedBatchId(conversationId, receipt.batchId), receipt.key);
      } catch {
        continue;
      }
      if (result.semantic === undefined || result.semantic.finalText.trim() === "") continue;
      summaries.push({
        id: `${receipt.batchId}/${receipt.key}`,
        contribution: receipt.intent,
        conclusion: result.semantic.finalText.slice(0, 1_000),
        evidenceRefs: [{ batchId: receipt.batchId, key: receipt.key }],
      });
    }
    return summaries;
  }

  async readChildResult(input: {
    readonly conversationId: string;
    readonly batchId: string;
    readonly key: string;
  }): Promise<ChildResultRead> {
    const receipt = this.readSpawnReceipts(input.conversationId)
      .find((candidate) => candidate.batchId === input.batchId);
    if (receipt === undefined) {
      return {
        standing: "refused",
        code: "not-found",
        reason: `no durable contribution spawn exists for batch ${input.batchId} of conversation ${input.conversationId}`,
      };
    }
    if (receipt.key !== input.key) {
      return {
        standing: "refused",
        code: "not-found",
        reason: `batch ${input.batchId} does not retain a child result for key ${input.key}`,
      };
    }
    const currentness = this.taskCurrentness(receipt);
    if (currentness.standing === "unavailable") {
      return {
        standing: "refused",
        code: "source-unavailable",
        reason: currentness.reason,
      };
    }
    if (currentness.standing === "stale") {
      return {
        standing: "refused",
        code: "stale",
        reason:
          `the contribution ${input.batchId}/${input.key} was formed at task revision ${receipt.taskRevision} `
          + `and is stale against the current Task source; a corrected Task refuses its old evidence`,
      };
    }
    let recovered;
    try {
      recovered = await this.timeline.recoverBatch(input.conversationId, contributionPreparedBatchId(input.conversationId, input.batchId));
    } catch (error) {
      return {
        standing: "refused",
        code: "invalid",
        reason: `the contribution ${input.batchId}/${input.key} timeline cannot be read: ${errorMessage(error)}`,
      };
    }
    if (!recovered.ready || recovered.outcomes === undefined) {
      return {
        standing: "refused",
        code: "not-settled",
        reason: `the contribution ${input.batchId}/${input.key} has not settled; its result cannot be read`,
      };
    }
    try {
      const result = await this.timeline.readResult(
        input.conversationId,
        contributionPreparedBatchId(input.conversationId, input.batchId),
        input.key,
      );
      // The coordinator-facing identity is the exact raw (batchId, key) pair
      // the projection exposes; the prepared-batch id is host-internal.
      return {
        standing: "read",
        result: { ...result, receipt: { ...result.receipt, batchId: input.batchId } },
      };
    } catch (error) {
      return {
        standing: "refused",
        code: "invalid",
        reason: `the settled contribution ${input.batchId}/${input.key} cannot be projected: ${errorMessage(error)}`,
      };
    }
  }

  /**
   * Apply one exact control to one exact retained contribution. Without a
   * retained runtime handle the liveness is unknown in this process — even a
   * durable settlement cannot be claimed here — and the stop is refused as
   * unverifiable rather than guessed.
   */
  control(input: {
    readonly batchId: string;
    readonly key: string;
    readonly control: "stop";
    readonly actor: {
      readonly conversationId: string;
      readonly turnId: string;
      readonly actionId: string;
    };
  }): ContributionControlReceipt {
    if (input.control !== "stop") {
      throw new ContributionError(
        "control-unsupported",
        `control '${input.control}' is not owned by a temporary contribution`,
      );
    }
    const handle = this.contribution(input.batchId, input.key);
    if (handle !== undefined) {
      // The retained handle owns stop semantics: an exact same-actor replay
      // returns the retained receipt even after settlement, a distinct stop
      // action is refused, and an unsettled live contribution is stopped.
      return handle.cancel(input.actor);
    }
    const receipt = this.readSpawnReceipts(input.actor.conversationId)
      .find((candidate) => candidate.batchId === input.batchId && candidate.key === input.key);
    if (receipt === undefined) {
      throw new ContributionError(
        "contribution-not-found",
        `contribution ${input.batchId}/${input.key} has no durable spawn receipt; the stop target does not exist`,
      );
    }
    throw new ContributionError(
      "contribution-unknown",
      `contribution ${input.batchId}/${input.key} has no retained runtime handle in this process; `
      + "whether it settled or was interrupted cannot be verified and the stop is refused as unverifiable",
    );
  }

  /**
   * The exact retained-lease recovery owner. The lease binding is read from
   * the durable spawn reservation (published before acquisition, so both a
   * lock-only crash and a receipt-backed terminal release failure retain the
   * same exact identity); the current lease bytes must still match that
   * identity and its owner process must be verifiably absent before the
   * exact byte-match release runs. It never touches Task attempt or Work
   * Cell evidence and never re-acquires or guesses a lease.
   */
  reconcileLease(input: {
    readonly conversationId: string;
    readonly batchId: string;
    readonly key: string;
  }): ContributionLeaseReconcileResult {
    const receipt = this.readSpawnReceipts(input.conversationId)
      .find((candidate) => candidate.batchId === input.batchId);
    if (receipt === undefined) {
      return {
        outcome: "refused",
        reason: `conversation ${input.conversationId} has no durable contribution spawn for batch ${input.batchId}`,
      };
    }
    if (receipt.key !== input.key) {
      return {
        outcome: "refused",
        reason: `batch ${input.batchId} does not retain key ${input.key}; reconciliation fails closed`,
      };
    }
    const binding = receipt.lease;
    if (binding === undefined) {
      return {
        outcome: "not-retained",
        reason: `contribution ${input.batchId}/${input.key} holds no effectful lease binding; nothing to recover`,
      };
    }
    let raw: string;
    try {
      raw = readFileSync(binding.path, "utf8");
    } catch (error) {
      if (isMissing(error)) {
        return {
          outcome: "not-retained",
          reason: `the exact lease ${binding.path} is already absent; the release already succeeded`,
        };
      }
      return {
        outcome: "refused",
        reason: `the retained lease ${binding.path} cannot be read: ${errorMessage(error)}`,
      };
    }
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      return {
        outcome: "refused",
        reason: `the retained lease ${binding.path} does not carry the exact expected identity bytes`,
      };
    }
    const record = asRecord(value);
    if (
      record.taskId !== binding.taskId
      || record.attemptId !== binding.attemptId
      || record.worktree !== binding.worktree
    ) {
      return {
        outcome: "refused",
        reason:
          `the retained lease ${binding.path} belongs to a different owner identity than `
          + `contribution ${input.batchId}/${input.key}; reconciliation fails closed`,
      };
    }
    const pid = typeof record.pid === "number" && Number.isInteger(record.pid) && record.pid > 0
      ? record.pid
      : undefined;
    if (pid === undefined || !isProcessDefinitelyAbsent(pid)) {
      return {
        outcome: "refused",
        reason:
          `the retained lease owner process ${pid === undefined ? "unknown" : pid} for `
          + `contribution ${input.batchId}/${input.key} is still alive or cannot be proven absent; reconciliation fails closed`,
      };
    }
    try {
      releaseWorktreeLease({ path: binding.path, content: raw });
    } catch (error) {
      return {
        outcome: "refused",
        reason: `the exact lease release for ${binding.path} failed: ${errorMessage(error)}`,
      };
    }
    return { outcome: "released", leasePath: binding.path };
  }

  /** The exact catalog identity for one selector; never a policy-catalog fallback. */
  private catalogCard(workerId: string): WorkerCard {
    try {
      return this.catalog.card(workerId);
    } catch (error) {
      const message = errorMessage(error);
      if (/is unavailable/u.test(message)) {
        throw new ContributionError(
          "worker-unavailable",
          `worker '${workerId}' is not available: ${message}`,
        );
      }
      throw new ContributionError(
        "worker-unknown",
        `worker '${workerId}' is not an exact runnable catalog identity: ${message}`,
      );
    }
  }

  private currentTasks(): PrincipalTasks {
    try {
      return this.taskReadPort.list();
    } catch (error) {
      throw new ContributionError("source-unavailable", `the canonical Task source cannot be read: ${errorMessage(error)}`);
    }
  }

  /**
   * The conversation's current Task identity, derived through the exact
   * shared journal derivation the coordinator's projection uses: the latest
   * settled task_create/task_correct action receipt. The coordinator never
   * supplies this; the host re-derives it from the canonical sources
   * immediately before the effect. An unreadable journal is a visible source
   * failure; a readable journal without a settled Task action means there is
   * no current Task and the contribution is refused without guessing one.
   */
  private conversationCurrentTaskAction(
    conversationId: string,
  ): { taskId: string; sourceRevision: number } | undefined {
    let events: ReturnType<FileConversationJournal["readEventsSync"]>;
    try {
      events = this.journal.readEventsSync(conversationId);
    } catch (error) {
      throw new ContributionError(
        "source-unavailable",
        `the conversation journal cannot be read to derive the current Task: ${errorMessage(error)}`,
      );
    }
    return latestSettledTaskAction(events);
  }

  /**
   * dependsOn eligibility derives only from durable terminal contribution
   * timeline evidence at the current Task revision: a dependency must name a
   * still-current spawn receipt whose exact child has a terminal settlement
   * on its delegate timeline. Receipt existence alone, live or unknown
   * contributions, post-correction stale receipts, and unprovable timelines
   * are all refused visibly before any preparation or effect.
   */
  private eligibleSettledKeys(conversationId: string, dependsOn: readonly string[]): string[] {
    if (dependsOn.length === 0) return [];
    const current: SpawnReceipt[] = [];
    for (const receipt of this.readSpawnReceipts(conversationId)) {
      const currentness = this.taskCurrentness(receipt);
      if (currentness.standing === "unavailable") {
        throw new ContributionError("source-unavailable", currentness.reason);
      }
      if (currentness.standing === "current") current.push(receipt);
    }
    const byKey = new Map(current.map((receipt) => [receipt.key, receipt] as const));
    const eligible: string[] = [];
    for (const dependency of dependsOn) {
      const receipt = byKey.get(dependency);
      if (receipt === undefined) {
        throw new ContributionError(
          "dependency-unsettled",
          `dependency '${dependency}' has no still-current contribution of conversation ${conversationId}; `
          + "a dependency must derive from durable terminal contribution evidence at the current Task revision",
        );
      }
      let settled: boolean;
      try {
        settled = this.timeline.hasTerminalSettlementSync(
          conversationId,
          contributionPreparedBatchId(conversationId, receipt.batchId),
          dependency,
        );
      } catch (error) {
        throw new ContributionError(
          "dependency-unsettled",
          `dependency '${dependency}' cannot be proven terminally settled: ${errorMessage(error)}`,
        );
      }
      if (!settled) {
        throw new ContributionError(
          "dependency-unsettled",
          `dependency '${dependency}' has not terminally settled; a live or unknown dependency cannot be admitted`,
        );
      }
      eligible.push(dependency);
    }
    return eligible;
  }

  /**
   * Derive the complete internal delegate admission envelope from the current
   * Task and runtime sources. The coordinator's spawn shape contributed only
   * intent plus non-derivable constraints; every evidence field here — source
   * refs, obligation refs, acceptance, Task Shape admission, workspace,
   * exact execution profile, and withheld authority — is host-owned.
   */
  private prepareContribution(input: {
    readonly conversationId: string;
    readonly actionId: string;
    readonly task: PrincipalTask;
    readonly sourceRevision: number;
    readonly worktree: string;
    readonly card: WorkerCard;
    readonly operation: ContributionSpawnOperation;
    readonly batchId: string;
    readonly settledKeys: readonly string[];
  }): { batch: PreparedDelegateBatch; cell: CellInput } {
    const { task, card, operation } = input;
    const sourceRef = taskActionSourceRef(input.conversationId, input.actionId);
    const obligationRef = `${CONTRIBUTION_OBLIGATION_REF_PREFIX}${task.id}`;
    const writePaths = operation.effectKind === "effectful" ? ["."] : [];
    const excludes = ordinaryOpenCodeExcludes(input.worktree);
    const workspace: CellInput["workspace"] = {
      root: input.worktree,
      readPaths: ["."],
      writePaths,
      excludePaths: excludes,
      allowedCommands: [],
    };
    const cell: CellInput = {
      id: `workbench-contribution-${input.batchId}`,
      workerId: card.id,
      executionProfile: card.executionProfile,
      intent: operation.intent,
      workspace,
      ...(operation.imagePaths === undefined ? {} : { imagePaths: [...operation.imagePaths] }),
      instructions: [
        "Complete one bounded temporary contribution. Report only evidence read from the workspace and the declared sources; do not claim semantic acceptance.",
        operation.intent,
      ],
      // The exact retained worker card's hard capability labels, host-derived
      // so the declared capabilityNeed/vision requirement is provably covered.
      capabilities: [...card.labels],
      context: [],
      capabilitiesRequired: [
        operation.capabilityNeed,
        ...(operation.imagePaths !== undefined ? ["vision"] : []),
      ],
      acceptance: [...task.acceptance],
      terminalTools: [{
        name: CONTRIBUTION_TERMINAL_TOOL,
        description:
          "Submit exactly once when the bounded contribution is complete: state the evidence-backed conclusion and any uncertainty. This is a contribution record, never semantic acceptance.",
        inputSchema: ContributionSubmissionSchema.toJSONSchema() as Record<string, unknown>,
      }],
      budget: {
        maxSteps: 20,
        maxDurationMs: ORDINARY_TASK_MAX_DURATION_MS,
        maxCommandOutputBytes: 64_000,
      },
    };
    const taskShape: TaskShapeAdmission = {
      referenceProfile: {
        id: card.executionProfile.id,
        revision: card.executionProfile.version,
      },
      evidence: {
        status: "admitted",
        revision: CONTRIBUTION_TASK_SHAPE_REVISION,
        refs: [CONTRIBUTION_TASK_SOURCE_REF],
      },
      disposition: "guarded",
      principalInstability:
        "The conversation coordinator forms contributions only when they earn their cost; the host guards the exact effect boundary and the coordinator remains the one synthesis owner.",
      guardRefs: [sourceRef],
      reconstructionOwner: CONTRIBUTION_RECONSTRUCTION_OWNER,
      overloadDisposition: "escalate",
    };
    const batch: PreparedDelegateBatch = {
      id: contributionPreparedBatchId(input.conversationId, input.batchId),
      whole: {
        revision: digest({
          taskId: task.id,
          sourceRevision: input.sourceRevision,
          taskRevision: task.revision,
          effectKind: operation.effectKind,
          root: workspace.root,
          capabilityNeed: operation.capabilityNeed,
        }),
        sourceRefs: [CONTRIBUTION_TASK_SOURCE_REF],
        obligations: [obligationRef],
        settledContributionKeys: [...input.settledKeys],
        guardRefs: [sourceRef],
        capabilityNeeds: [
          operation.capabilityNeed,
          ...(operation.imagePaths !== undefined ? ["vision"] : []),
        ],
        reconstructionOwner: CONTRIBUTION_RECONSTRUCTION_OWNER,
        workspace,
        ...(operation.effectKind === "effectful"
          ? { effectPolicy: { kind: "isolated-writable-trial", root: input.worktree } as const }
          : {}),
      },
      contributions: [{
        key: operation.key,
        workerId: card.id,
        taskId: contributionTaskId(operation.key),
        task: operation.intent,
        sourceRefs: [CONTRIBUTION_TASK_SOURCE_REF],
        obligationRefs: [obligationRef],
        acceptance: [...task.acceptance],
        capabilityNeed: operation.capabilityNeed,
        dependsOn: [...operation.dependsOn],
        taskShape,
        cell,
      }],
    };
    admitPreparedDelegateBatch(batch);
    return { batch, cell };
  }

  private async startContributionDelegate(
    handle: WorkbenchContributionHandle,
    batch: PreparedDelegateBatch,
    conversationId: string,
  ): Promise<DelegateBatchHandle> {
    return await startDelegateBatch(checkpointFor(batch, conversationId), {
      timeline: this.timeline,
      workerCatalog: this.catalog,
      concurrency: 1,
      signal: handle.signal,
      executionObserver: {
        prepare: async () => {},
        start: async () => {},
        rejectBeforeStart: async () => {},
        settle: async () => {},
        uncertain: async () => {},
        trace: (_checkpoint, event) => handle.observeTrace(event),
      },
    });
  }

  /**
   * The exact failure finalization of a spawn whose reservation and lease
   * were already acquired but whose delegate start or started marker never
   * committed. The started delegate is cancelled first, and its exact
   * terminal settlement is AWAITED before the lease is released, the
   * reservation is retracted, or any writer may proceed: a new effectful
   * writer must never overlap a delegate that has not actually settled. A
   * delegate whose terminal settlement cannot be confirmed retains the
   * exact lease and durable spawn evidence and fails closed. A lease whose
   * exact release fails after a confirmed settlement keeps the spawn
   * reservation — the durable lease binding — retained as reconcile-required
   * evidence, retracting only the uncommitted started marker. Every cleanup
   * failure is surfaced visibly, never swallowed.
   */
  private async failStartedSpawn(
    input: {
      readonly conversationId: string;
      readonly actionId: string;
    },
    actionKey: string,
    batchId: string,
    lease: TaskRunLease | undefined,
    delegate: DelegateBatchHandle | undefined,
    error: unknown,
  ): Promise<ContributionError> {
    if (delegate !== undefined) {
      delegate.cancel();
      this.onDelegateCancelled?.();
      try {
        await delegate.settled;
      } catch (settlementError) {
        // Terminal stop cannot be confirmed: the exact Worktree lease and
        // the durable spawn reservation stay retained as reconcile-required
        // evidence. A new writer must never overlap a delegate whose stop
        // is unproven; only the production reconcileLease operation may
        // recover the retained lease once the owner process is verifiably
        // absent.
        this.startedByCommittedAction.delete(actionKey);
        this.handles.delete(batchId);
        return new ContributionError(
          "effect-conflict",
          `${errorMessage(error)}; additionally: the cancelled delegate never reached a durable terminal settlement (${errorMessage(settlementError)}); `
          + (lease === undefined
            ? "the durable spawn reservation stays retained as reconcile-required evidence"
            : `the exact task-run lease ${lease.path} and the durable spawn reservation stay retained; `
              + "recover them through the contribution reconcileLease operation only after the owner process is verifiably absent"),
        );
      }
    }
    this.startedByCommittedAction.delete(actionKey);
    this.handles.delete(batchId);
    if (lease !== undefined) {
      try {
        releaseWorktreeLease(lease);
      } catch (releaseError) {
        // The exact lease release failed AFTER the delegate settled: the
        // spawn reservation — the durable exact lease binding published
        // before acquisition — stays retained as reconcile-required
        // evidence. Retract only the uncommitted started marker (and its
        // publication temporaries); the reservation is deleted only after
        // a confirmed exact lease release, never while the writer block is
        // still up.
        const markerFailure = this.retractStartedReceipt(input.conversationId, input.actionId);
        return new ContributionError(
          "effect-conflict",
          `reconcile-required: ${errorMessage(error)}; additionally: the exact task-run lease ${lease.path} `
          + `(owner pid ${leaseOwnerPid(lease) ?? "unknown"}) could not be released after the delegate settled: ${errorMessage(releaseError)}; `
          + `the durable spawn reservation for action ${input.actionId} and the retained lease stay as exact recoverable evidence; `
          + "recover them through the contribution reconcileLease operation only after the owner process is verifiably absent"
          + (markerFailure === undefined ? "" : `; additionally: ${markerFailure}`),
        );
      }
    }
    const failures: string[] = [];
    const reservationFailure = this.retractSpawnReservation(input.conversationId, input.actionId);
    if (reservationFailure !== undefined) failures.push(reservationFailure);
    const markerFailure = this.retractStartedReceipt(input.conversationId, input.actionId);
    if (markerFailure !== undefined) failures.push(markerFailure);
    if (failures.length === 0) {
      return error instanceof ContributionError
        ? error
        : new ContributionError("source-unavailable", errorMessage(error));
    }
    return new ContributionError(
      "effect-conflict",
      `${errorMessage(error)}; additionally: ${failures.join("; ")}`,
    );
  }

  /**
   * Consume one already-started delegate batch: the settlement mapping runs
   * against the retained delegate handle that the spawn committed before
   * returning success; nothing here launches a worker.
   */
  private async runContribution(
    handle: WorkbenchContributionHandle,
    delegate: DelegateBatchHandle,
    conversationId: string,
  ): Promise<void> {
    try {
      const settlement = await delegate.settled;
      const outcome = settlement.outcomes[0];
      // Process settlement, not verification: a settled child produced
      // evidence; its verification standing stays in the outcome status and
      // the keyed result receipt (a plain Cell result is unverified).
      const status: ContributionSettlement["status"] =
        outcome === undefined || outcome.status === "runner_error" || outcome.status === "failed" ? "failed"
        : outcome.status === "cancelled" ? "cancelled"
        : "completed";
      handle.finishTerminal({
        status,
        ...(outcome === undefined ? {} : { outcomeStatus: outcome.status }),
        evidenceRefs: [
          handle.spawnRef,
          evidenceRef(this.home, this.timeline.timelinePath(conversationId)),
        ],
      });
    } catch (error) {
      if (handle.stopWasRequested() && !handle.hasTerminal()) {
        handle.finishTerminal({
          status: "cancelled",
          evidenceRefs: [handle.spawnRef],
        });
        return;
      }
      handle.finishTerminal({
        status: "failed",
        evidenceRefs: [handle.spawnRef],
        error: `the contribution execution failed: ${errorMessage(error)}`,
      });
    }
  }

  private publishSpawnReservation(input: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
    readonly batchId: string;
    readonly key: string;
    readonly cellId: string;
    readonly card: WorkerCard;
    readonly effectKind: "read-only" | "effectful";
    readonly task: PrincipalTask;
    readonly sourceRevision: number;
    readonly intent: string;
    readonly timelineRef: string;
    readonly worktree: string;
  }): string {
    const directory = this.conversationDirectory(input.conversationId);
    mkdirSync(directory, { recursive: true });
    // The reservation is the cross-process claim: its path is keyed by the
    // committed action identity and durably published (fully written temp
    // file, fsynced, no-clobber hard-linked, parent directory fsynced) so a
    // concurrent EEXIST loser never observes partial JSON and never starts a
    // duplicate worker.
    const path = join(directory, `spawn-${input.actionId}.json`);
    const value = SpawnReceiptSchema.parse({
      version: CONTRIBUTION_SPAWN_VERSION,
      batchId: input.batchId,
      key: input.key,
      cellId: input.cellId,
      workerId: input.card.id,
      executionProfile: input.card.executionProfile,
      effectKind: input.effectKind,
      taskId: input.task.id,
      taskRevision: input.task.revision,
      sourceRevision: input.sourceRevision,
      conversationId: input.conversationId,
      turnId: input.turnId,
      actionId: input.actionId,
      sourceRef: taskActionSourceRef(input.conversationId, input.actionId),
      intent: input.intent,
      timelineRef: input.timelineRef,
      startedAt: this.now(),
      ...(input.effectKind === "effectful"
        ? {
            lease: {
              path: join(canonicalGitDirectory(input.worktree), "rossovia-task-run.lock"),
              worktree: input.worktree,
              taskId: input.task.id,
              attemptId: input.batchId,
            },
          }
        : {}),
    });
    publishAtomically(path, value, {
      syncFile: this.syncFile,
      syncDirectory: this.syncDirectory,
      removeTemporary: this.removeTemporary,
      onRetainedTemporary: this.onRetainedTemporary,
    });
    return evidenceRef(this.home, path);
  }

  /**
   * The durable started marker: the only record that authorizes success,
   * published durably by the reservation winner after the durable delegate
   * prepare+dispatch, carrying the exact start cross-link canonical readers
   * re-verify. Without this marker no loser and no operation host may
   * return a ContributionStartReceipt or action.settled.
   */
  private publishStartedReceipt(input: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
    readonly batchId: string;
    readonly key: string;
    readonly cellId: string;
    readonly card: WorkerCard;
    readonly effectKind: "read-only" | "effectful";
    readonly task: PrincipalTask;
    readonly sourceRevision: number;
    readonly start: {
      readonly preparedBatchId: string;
      readonly checkpointDigest: string;
    };
  }): string {
    const directory = this.conversationDirectory(input.conversationId);
    mkdirSync(directory, { recursive: true });
    const path = join(directory, `started-${input.actionId}.json`);
    const value = StartedReceiptSchema.parse({
      version: CONTRIBUTION_STARTED_VERSION,
      batchId: input.batchId,
      key: input.key,
      cellId: input.cellId,
      workerId: input.card.id,
      effectKind: input.effectKind,
      taskId: input.task.id,
      taskRevision: input.task.revision,
      sourceRevision: input.sourceRevision,
      conversationId: input.conversationId,
      turnId: input.turnId,
      actionId: input.actionId,
      sourceRef: taskActionSourceRef(input.conversationId, input.actionId),
      startedAt: this.now(),
      start: {
        preparedBatchId: input.start.preparedBatchId,
        checkpointDigest: input.start.checkpointDigest,
      },
    });
    publishAtomically(path, value, {
      syncFile: this.syncFile,
      syncDirectory: this.syncDirectory,
      removeTemporary: this.removeTemporary,
      onRetainedTemporary: this.onRetainedTemporary,
    });
    return evidenceRef(this.home, path);
  }

  /**
   * Retract the reservation this registry just published, after a refused or
   * unproven publish. Returns a visible cleanup-failure description when the
   * retraction or its durability confirmation fails; callers never swallow
   * it.
   */
  private retractSpawnReservation(conversationId: string, actionId: string): string | undefined {
    const path = join(this.conversationDirectory(conversationId), `spawn-${actionId}.json`);
    return retractPublishedClaim(path, this.syncDirectory);
  }

  /**
   * Retract a half-published started marker after a refused publication.
   * Returns a visible cleanup-failure description; callers never swallow it.
   */
  private retractStartedReceipt(conversationId: string, actionId: string): string | undefined {
    const path = join(this.conversationDirectory(conversationId), `started-${actionId}.json`);
    return retractPublishedClaim(path, this.syncDirectory);
  }

  private readSpawnReceipts(conversationId: string): SpawnReceipt[] {
    const directory = this.conversationDirectory(conversationId);
    if (!existsSync(directory)) return [];
    const receipts: SpawnReceipt[] = [];
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.startsWith("spawn-") || !entry.name.endsWith(".json")) continue;
      try {
        const parsed = SpawnReceiptSchema.parse(JSON.parse(readFileSync(join(directory, entry.name), "utf8")));
        if (parsed.conversationId === conversationId) receipts.push(parsed);
      } catch {
        // An unreadable spawn receipt projects nothing; it is never guessed.
      }
    }
    return receipts;
  }

  /**
   * The contribution is current only while an observed Task still carries
   * its retained revision. A missing Task or revision mismatch is stale;
   * an unreadable Task source is unavailable and must never be reported as
   * an observed stale fact.
   */
  private taskCurrentness(receipt: SpawnReceipt): ContributionTaskCurrentness {
    let tasks: PrincipalTasks;
    try {
      tasks = this.taskReadPort.list();
    } catch (error) {
      return {
        standing: "unavailable",
        reason:
          `the canonical Task source cannot be read while checking contribution `
          + `${receipt.batchId}/${receipt.key}: ${errorMessage(error)}`,
      };
    }
    const task = taskById(tasks, receipt.taskId);
    return task !== undefined && task.revision === receipt.taskRevision
      ? { standing: "current" }
      : { standing: "stale" };
  }

  private conversationDirectory(conversationId: string): string {
    return join(this.home, "state", "conversation-contributions", conversationId);
  }

  private conversationKeys(conversationId: string): Set<string> {
    let keys = this.keysByConversation.get(conversationId);
    if (keys === undefined) {
      keys = new Set(this.readSpawnReceipts(conversationId).map((receipt) => receipt.key));
      this.keysByConversation.set(conversationId, keys);
    }
    return keys;
  }

  private liveCount(conversationId: string): number {
    let count = 0;
    for (const handle of this.handles.values()) {
      if (handle.identity.conversationId !== conversationId) continue;
      if (handle.liveness().state === "live") count += 1;
    }
    return count;
  }
}

class WorkbenchContributionHandle implements ContributionHandle {
  readonly identity: ContributionIdentity;
  readonly settled: Promise<ContributionSettlement>;
  readonly spawnRef: string;
  readonly signal: AbortSignal;
  private readonly home: string;
  private readonly controller = new AbortController();
  private lease: TaskRunLease | undefined;
  private readonly activityListeners = new Set<(activity: { text: string }) => void>();
  private readonly settledListeners = new Set<(settlement: ContributionSettlement) => void>();
  private resolveSettled!: (settlement: ContributionSettlement) => void;
  private settlement?: ContributionSettlement;
  private stopRequest?: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
  };
  private controlReceiptRef?: string;

  constructor(input: {
    readonly identity: ContributionIdentity;
    readonly home: string;
    readonly spawnRef: string;
    readonly lease?: TaskRunLease;
  }) {
    this.identity = input.identity;
    this.home = input.home;
    this.spawnRef = input.spawnRef;
    this.lease = input.lease;
    this.signal = this.controller.signal;
    this.settled = new Promise<ContributionSettlement>((resolve) => {
      this.resolveSettled = resolve;
    });
  }

  liveness(): ContributionLiveness {
    if (this.settlement !== undefined) {
      return this.settlement.status === "unresolved"
        ? { state: "unresolved", settlement: this.settlement }
        : { state: "settled", settlement: this.settlement };
    }
    return { state: "live" };
  }

  hasTerminal(): boolean {
    return this.settlement !== undefined;
  }

  stopWasRequested(): boolean {
    return this.stopRequest !== undefined;
  }

  retention(): { activityListeners: number; settledListeners: number; retainedPayloads: number } {
    return {
      activityListeners: this.activityListeners.size,
      settledListeners: this.settledListeners.size,
      retainedPayloads: Number(this.lease !== undefined),
    };
  }

  onActivity(listener: (activity: { text: string }) => void): () => void {
    if (this.settlement !== undefined) return () => {};
    this.activityListeners.add(listener);
    return () => this.activityListeners.delete(listener);
  }

  onSettled(listener: (settlement: ContributionSettlement) => void): () => void {
    if (this.settlement !== undefined) {
      listener(this.settlement);
      return () => {};
    }
    this.settledListeners.add(listener);
    return () => this.settledListeners.delete(listener);
  }

  cancel(actor: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
  }): ContributionControlReceipt {
    if (this.stopRequest !== undefined) {
      // Exact replay may reuse the durable receipt only for the same action
      // identity, even after settlement; a distinct stop action must never
      // adopt the first receipt.
      const retained = this.stopRequest;
      if (retained.conversationId === actor.conversationId && retained.actionId === actor.actionId) {
        return contributionControlReceipt(this.identity, [this.controlReceiptRef!, this.spawnRef]);
      }
      throw new ContributionError(
        "control-conflict",
        `contribution ${this.identity.batchId} already has a requested stop from action ${retained.actionId} `
        + `of conversation ${retained.conversationId}; a distinct stop action cannot be applied`,
      );
    }
    if (this.settlement !== undefined) {
      throw new ContributionError(
        "contribution-not-live",
        `contribution ${this.identity.batchId}/${this.identity.key} already settled with status ${this.settlement.status}; stop has no effect`,
      );
    }
    // The durable control receipt is written before any handle state commits
    // or the abort is dispatched, so a crash can never lose a requested stop.
    const controlRef = this.writeControlReceipt(actor);
    this.stopRequest = {
      conversationId: actor.conversationId,
      turnId: actor.turnId,
      actionId: actor.actionId,
    };
    this.controlReceiptRef = controlRef;
    this.controller.abort(new DOMException("contribution_control stop", "AbortError"));
    return contributionControlReceipt(this.identity, [controlRef, this.spawnRef]);
  }

  observeTrace(event: TraceEvent): void {
    const text = renderCarrierActivity(event);
    if (text === undefined) return;
    for (const listener of this.activityListeners) listener({ text });
  }

  /**
   * Terminal settlement retention: the lease is released only after the
   * durable timeline settlement exists, and the handle drops its listener
   * sets and its retained lease payload so settled handles stay bounded. A
   * failed exact release never swallows: the lease stays retained with the
   * handle, the settlement becomes unresolved and reconcile-required, and
   * the error names the exact lease and owner evidence.
   */
  finishTerminal(settlement: ContributionSettlement): void {
    if (this.settlement !== undefined) return;
    this.settlement = settlement;
    if (this.lease !== undefined) {
      const retainedLease = this.lease;
      try {
        releaseWorktreeLease(retainedLease);
        this.lease = undefined;
      } catch (error) {
        const pid = leaseOwnerPid(retainedLease);
        this.settlement = {
          status: "unresolved",
          evidenceRefs: settlement.evidenceRefs,
          error:
            `the durable contribution settlement exists but the exact task-run Worktree lease ${retainedLease.path}`
            + ` (owner pid ${pid === undefined ? "unknown" : pid}, retained in the durable spawn reservation) could not be released: ${errorMessage(error)};`
            + " the contribution is unresolved and reconcile-required: recover the retained lease through the contribution reconcileLease operation only after the owner process is verifiably absent",
        };
      }
    }
    const settledListeners = [...this.settledListeners];
    this.settledListeners.clear();
    this.activityListeners.clear();
    this.resolveSettled(this.settlement);
    for (const listener of settledListeners) listener(this.settlement);
  }

  private writeControlReceipt(actor: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
  }): string {
    const directory = join(this.home, "state", "conversation-contributions", this.identity.conversationId);
    mkdirSync(directory, { recursive: true });
    const path = join(directory, `control-${this.identity.batchId}.json`);
    writeImmutableJson(path, ControlReceiptSchema.parse({
      version: CONTRIBUTION_CONTROL_VERSION,
      control: "stop",
      batchId: this.identity.batchId,
      key: this.identity.key,
      cellId: this.identity.cellId,
      taskId: this.identity.taskId,
      sourceRef: taskActionSourceRef(actor.conversationId, actor.actionId),
      requestedBy: {
        conversationId: actor.conversationId,
        turnId: actor.turnId,
        actionId: actor.actionId,
      },
      requestedAt: new Date().toISOString(),
      spawnRef: this.spawnRef,
    }));
    return evidenceRef(this.home, path);
  }
}

function checkpointFor(
  batch: PreparedDelegateBatch,
  conversationId: string,
): Parameters<typeof startDelegateBatch>[0] {
  const [contribution] = batch.contributions;
  if (contribution === undefined || contribution.workerId === undefined) {
    throw new Error("a conversation contribution batch must carry one catalog-selected contribution");
  }
  return {
    id: batch.id,
    parentLoopId: conversationId,
    wholeRevision: batch.whole.revision,
    parentUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
    tasks: [{
      id: contribution.taskId,
      subject: contribution.task.slice(0, 120),
      description: contribution.task,
      status: "in_progress",
      owner: `delegate:${contribution.key}`,
      blockedBy: [],
    }],
    invocations: [{
      toolCallId: `contribution:${batch.id}`,
      toolName: "worker_spawn",
      call: {
        key: contribution.key,
        taskId: contribution.taskId,
        task: contribution.task,
        sourceRefs: [...contribution.sourceRefs],
        obligationRefs: [...contribution.obligationRefs],
        acceptance: [...contribution.acceptance],
        capabilityNeed: contribution.capabilityNeed,
        workerId: contribution.workerId,
      },
      input: { kind: "inline" },
    }],
    responseMessages: [],
    admission: admitPreparedDelegateBatch(batch),
  };
}

function contributionTaskId(key: string): string {
  return `workbench-contribution:${key}`;
}

function contributionControlReceipt(
  identity: ContributionIdentity,
  evidenceRefs: readonly string[],
): ContributionControlReceipt {
  return {
    batchId: identity.batchId,
    key: identity.key,
    taskId: identity.taskId,
    control: "stop",
    outcome: "settled",
    evidenceRefs,
  };
}

function taskById(tasks: PrincipalTasks, idArgument: string): PrincipalTask | undefined {
  const folded = idArgument.trim().toLowerCase();
  if (folded.length === 0) return undefined;
  const matches = tasks.tasks.filter((task) => task.id.toLowerCase() === folded);
  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * The durable spawn reservation for one exact committed action, read from the
 * action-keyed receipt path. Absent means no reservation; an unreadable or
 * invalid reservation is a visible source failure, never a guess.
 */
function readSpawnReservation(directory: string, actionId: string): SpawnReceipt | undefined {
  const path = join(directory, `spawn-${actionId}.json`);
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    if (isMissing(error)) return undefined;
    throw new ContributionError(
      "source-unavailable",
      `the committed action ${actionId} holds an unreadable spawn reservation: ${errorMessage(error)}`,
    );
  }
  try {
    return SpawnReceiptSchema.parse(JSON.parse(raw));
  } catch (error) {
    throw new ContributionError(
      "source-unavailable",
      `the committed action ${actionId} holds an invalid spawn reservation: ${errorMessage(error)}`,
    );
  }
}

export function verifyContributionStartedMarker(
  home: string,
  directory: string,
  started: StartedReceipt,
  joins: {
    readonly syncDirectory: (path: string) => void;
  },
): string | undefined {
  // Join the publication durability boundary BEFORE inspecting the
  // directory: a temporary whose removal is not durably confirmed must
  // still count as an unconfirmed publication, never as committed cleanup.
  try {
    joins.syncDirectory(directory);
  } catch (error) {
    return `the started marker's publication durability boundary cannot be joined: ${errorMessage(error)}`;
  }
  const markerFile = `started-${started.actionId}.json`;
  if (hasUnconfirmedPublishTemporary(directory, markerFile)) {
    return `the started marker ${markerFile} still has an unremoved publication temporary; the publish is not confirmed`;
  }
  const reservation = readReceiptFiles(SpawnReceiptSchema, directory, "spawn-")
    .find((candidate) => candidate.actionId === started.actionId);
  if (reservation === undefined) {
    return `the started marker for action ${started.actionId} has no matching reservation`;
  }
  // The strict relational identity: the started marker and its reservation
  // must agree on EVERY shared identity, not just the batch/key/effect
  // shape. Any mismatch means the marker is not a committed started record
  // for this action.
  if (
    reservation.conversationId !== started.conversationId
    || reservation.turnId !== started.turnId
    || reservation.actionId !== started.actionId
    || reservation.sourceRef !== started.sourceRef
    || reservation.batchId !== started.batchId
    || reservation.key !== started.key
    || reservation.cellId !== started.cellId
    || reservation.workerId !== started.workerId
    || reservation.effectKind !== started.effectKind
    || reservation.taskId !== started.taskId
    || reservation.taskRevision !== started.taskRevision
    || reservation.sourceRevision !== started.sourceRevision
  ) {
    return `the started marker for action ${started.actionId} does not match its reservation`;
  }
  if (started.start.preparedBatchId !== contributionPreparedBatchId(started.conversationId, started.batchId)) {
    return `the started marker for action ${started.actionId} does not reference its exact derived prepared batch identity`;
  }
  let link: ReturnType<FileMissionTimeline["durableStartLinkSync"]>;
  try {
    const timeline = new FileMissionTimeline(join(home, "state", "conversation-contributions"));
    link = timeline.durableStartLinkSync(started.conversationId, started.start.preparedBatchId);
  } catch (error) {
    return `the started marker's durable start cross-link cannot be verified: ${errorMessage(error)}`;
  }
  if (link === undefined || link.checkpointDigest !== started.start.checkpointDigest) {
    return `the started marker for action ${started.actionId} has no matching durable delegate start`;
  }
  if (
    link.cellId !== started.cellId
    || link.key !== started.key
    || link.workerId !== started.workerId
  ) {
    return `the started marker's durable start child does not correspond to its cell/key/worker identity`;
  }
  return undefined;
}

/** True when an unremoved temporary sibling of one published claim remains. */
export function hasUnconfirmedPublishTemporary(directory: string, fileName: string): boolean {
  if (!existsSync(directory)) return false;
  const prefix = `${fileName}.tmp-`;
  return readdirSync(directory).some((entry) => entry.startsWith(prefix));
}

/** The strict identity match one reservation or started marker must satisfy to converge on it. */
function spawnReceiptMismatch(
  receipt: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
    readonly key: string;
    readonly workerId: string;
    readonly effectKind: "read-only" | "effectful";
  },
  input: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
  },
  operation: ContributionSpawnOperation,
): string | undefined {
  return receipt.conversationId !== input.conversationId ? "the record belongs to another conversation"
    : receipt.turnId !== input.turnId ? "the record was started by another turn"
    : receipt.actionId !== input.actionId ? "the record was started by another action"
    : receipt.key !== operation.key ? `the record retains key ${receipt.key}, not ${operation.key}`
    : receipt.workerId !== operation.workerId ? `the record retains worker ${receipt.workerId}, not ${operation.workerId}`
    : receipt.effectKind !== operation.effectKind ? `the record is ${receipt.effectKind}, not ${operation.effectKind}`
    : undefined;
}

/** The winner's strict started receipt projected for a converging loser; no worker starts. */
function winnerReceipt(receipt: StartedReceipt, home: string): ContributionStartReceipt {
  return {
    batchId: receipt.batchId,
    key: receipt.key,
    cellId: receipt.cellId,
    workerId: receipt.workerId,
    effectKind: receipt.effectKind,
    taskId: receipt.taskId,
    sourceRevision: receipt.sourceRevision,
    taskRevision: receipt.taskRevision,
    evidenceRefs: [evidenceRef(home, join(
      contributionStateDirectory(home, receipt.conversationId),
      `started-${receipt.actionId}.json`,
    ))],
  };
}

/**
 * Durably publish one claim: fully write the unique temporary file, fsync
 * it, publish via the no-clobber hard link, fsync the parent directory, then
 * remove the temporary. Any durability step failure throws before any
 * successful started evidence can be returned.
 *
 * Linked and durably published are distinct states: when the no-clobber
 * link exists but the directory fsync failed, the temporary is RETAINED
 * until the caller-owned retraction removes the exact claim, all matching
 * temporaries, and fsyncs the directory — the unremoved temporary is the
 * exact marker every reader uses to refuse the uncommitted link. Only an
 * unlinked claim (pre-link failure or EEXIST) or a fully durable
 * publication removes the temporary directly. A temporary-removal failure
 * after a durable publication throws a visible cleanup error too: an
 * unconfirmed cleanup is never swallowed.
 */
function publishAtomically(
  path: string,
  value: unknown,
  seams: {
    readonly syncFile: (path: string) => void;
    readonly syncDirectory: (path: string) => void;
    readonly removeTemporary: (path: string) => void;
    readonly onRetainedTemporary: ((temporary: string) => void) | undefined;
  },
): void {
  const temporary = `${path}.tmp-${randomUUID()}`;
  let linked = false;
  let durablyPublished = false;
  try {
    writeImmutableJson(temporary, value);
    seams.syncFile(temporary);
    linkSync(temporary, path);
    linked = true;
    seams.syncDirectory(dirname(path));
    durablyPublished = true;
  } finally {
    if (linked && !durablyPublished) {
      // The link exists without a proven publication durability boundary:
      // retain the temporary so every reader refuses the uncommitted link,
      // and let the caller-owned retraction remove claim and temporaries.
      // The body's durability failure stays the deciding error.
      seams.onRetainedTemporary?.(temporary);
    } else {
      try {
        seams.removeTemporary(temporary);
      } catch (error) {
        // An unremovable temporary after a durable publication is a visible
        // cleanup failure, never a swallowed best-effort: the spawn must fail
        // rather than return success over a claim its canonical readers will
        // refuse as unconfirmed. When the publication itself did not succeed,
        // the primary durability/EEXIST error stays the deciding failure.
        if (durablyPublished && !isMissing(error)) {
          throw new Error(
            `the publication temporary ${temporary} could not be removed after a durable publication: ${errorMessage(error)}`,
          );
        }
      }
    }
  }
}

/**
 * Retract one published claim after a refused or unproven publish: remove
 * the exact claim file AND any leftover publication temporaries of the same
 * claim, then join the parent directory durability boundary. Returns a
 * visible cleanup-failure description when any removal or durability
 * confirmation fails; callers never swallow it. Removing the leftover
 * temporaries keeps a failed publication from permanently poisoning every
 * later read of the same claim.
 */
function retractPublishedClaim(path: string, syncDirectory: (path: string) => void): string | undefined {
  const failures: string[] = [];
  const remove = (candidate: string, label: string): void => {
    try {
      unlinkSync(candidate);
    } catch (error) {
      if (!isMissing(error)) failures.push(`${label} ${candidate} could not be retracted: ${errorMessage(error)}`);
    }
  };
  remove(path, "the claim");
  try {
    const directory = dirname(path);
    const entries = readdirSync(directory);
    const prefix = `${basename(path)}.tmp-`;
    for (const entry of entries) {
      if (entry.startsWith(prefix)) remove(join(directory, entry), "the publication temporary");
    }
  } catch (error) {
    failures.push(`the claim temporaries at ${dirname(path)} could not be inspected: ${errorMessage(error)}`);
  }
  try {
    syncDirectory(dirname(path));
  } catch (error) {
    failures.push(`the claim retraction at ${dirname(path)} cannot be durably confirmed: ${errorMessage(error)}`);
  }
  return failures.length === 0 ? undefined : failures.join("; ");
}

/** The exact fsync-based durability step shared by the atomic publication and canonical reads. */
export function fsyncFileDurability(path: string): void {
  const handle = openSync(path, "r");
  try {
    fsyncSync(handle);
  } finally {
    closeSync(handle);
  }
}

/**
 * The standing of one spawn-receipt-retained exact lease: retained when the
 * lease file still exists and provably belongs to the same owner identity
 * (an unreadable file fails closed as retained), released when it is absent
 * or provably belongs to another owner.
 */
function contributionLeaseStanding(lease: {
  readonly path: string;
  readonly taskId: string;
  readonly attemptId: string;
}): "retained" | "released" {
  if (!existsSync(lease.path)) return "released";
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(lease.path, "utf8"));
  } catch {
    return "retained";
  }
  const record = asRecord(value);
  return record.taskId === lease.taskId && record.attemptId === lease.attemptId
    ? "retained"
    : "released";
}

/** The owner pid of one exact lease, when its content parses. */
function leaseOwnerPid(lease: TaskRunLease): number | undefined {
  try {
    const pid = asRecord(JSON.parse(lease.content)).pid;
    return typeof pid === "number" ? pid : undefined;
  } catch {
    return undefined;
  }
}

function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code?: unknown }).code === "ENOENT";
}

function isAlreadyExists(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code?: unknown }).code === "EEXIST";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}

/**
 * Revalidate one conversation-derived Task binding against the current
 * canonical owners immediately before a contribution effect: the bound
 * project must still be a registered current project with a readable primary
 * head, the bound Worktree must still exist and be an exact currently
 * observed Worktree of that project's primary workspace, and its current
 * head must be readable. The coordinator supplied none of these selectors;
 * the host derives and re-validates every one of them itself, and any
 * unreadable, unregistered, or unobserved selection is refused with no
 * effect.
 */
function verifyContributionSelection(
  home: string,
  task: PrincipalTask,
  worktree: string,
): void {
  const binding = task.binding;
  if (binding.kind !== "project-context") {
    throw new ContributionError(
      "task-not-bound",
      `task ${task.id} has no project binding to re-validate`,
    );
  }
  let current;
  try {
    current = loadHome(home);
  } catch (error) {
    throw new ContributionError(
      "task-not-bound",
      `task ${task.id}'s binding cannot be re-validated: the current home cannot be read: ${errorMessage(error)}`,
    );
  }
  const project = current.projects.projects.find(
    (candidate) => candidate.id === binding.projectId,
  );
  if (project === undefined) {
    throw new ContributionError(
      "task-not-bound",
      `task ${task.id} is bound to project '${binding.projectId}', which is not a registered current project; the action is refused`,
    );
  }
  let primaryWorkspace: string;
  let primaryHead: string | null;
  try {
    const workspace = workspaceFor(current.workspaces, binding.projectId);
    const observation = observeWorkspace(project, workspace);
    primaryWorkspace = observation.path;
    primaryHead = observation.head;
  } catch (error) {
    throw new ContributionError(
      "task-not-bound",
      `the bound project's primary workspace cannot be re-observed: ${errorMessage(error)}`,
    );
  }
  if (primaryHead === null) {
    throw new ContributionError(
      "task-not-bound",
      `the bound project '${binding.projectId}' has no readable current primary head`,
    );
  }
  let observed: string[];
  try {
    observed = observedWorktrees(primaryWorkspace).map((record) => record.path);
  } catch (error) {
    throw new ContributionError(
      "task-not-bound",
      `the registered project's Worktrees cannot be observed: ${errorMessage(error)}`,
    );
  }
  if (!observed.includes(worktree)) {
    throw new ContributionError(
      "task-not-bound",
      `task ${task.id}'s bound Worktree ${worktree} is not a currently observed Worktree of the registered project '${binding.projectId}'; the action is refused`,
    );
  }
  let worktreeHead: string;
  try {
    worktreeHead = requiredGit(["rev-parse", "HEAD"], worktree);
  } catch (error) {
    throw new ContributionError(
      "task-not-bound",
      `the bound Worktree's current head cannot be re-read: ${errorMessage(error)}`,
    );
  }
  if (!/^[0-9a-f]{40}$/u.test(worktreeHead)) {
    throw new ContributionError(
      "task-not-bound",
      `the bound Worktree's current head is unreadable`,
    );
  }
}

function currentCatalog(environment: NodeJS.ProcessEnv): WorkerCatalog {
  return requireFromHere("../../../autonomy/src/worker-policy").createCurrentWorkerCatalog(environment);
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== "" ? error.message : String(error);
}
