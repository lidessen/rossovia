import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
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
  type DelegateResultProjection,
} from "../../../autonomy/src/delegate-loop";
import { FileMissionTimeline } from "../../../autonomy/src/delegate-timeline";
import type { PrincipalTask } from "../contracts";
import { loadPrincipalTasks } from "../tasks";
import { resolveHome } from "../home";
import { expandPath } from "../paths";
import {
  acquireWorktreeLease,
  evidenceRef,
  ordinaryOpenCodeExcludes,
  ORDINARY_TASK_MAX_DURATION_MS,
  releaseWorktreeLease,
  verifyCleanStatus,
  type TaskRunLease,
} from "../task-run";
import { digest, taskActionSourceRef } from "./contracts";
import {
  renderCarrierActivity,
  verifyExecutionSelectors,
} from "./execution-carrier";

const requireFromHere = createRequire(import.meta.url);

export const CONTRIBUTION_SPAWN_VERSION = "rosso.conversation-contribution-spawn.v1" as const;
export const CONTRIBUTION_CONTROL_VERSION = "rosso.conversation-contribution-control.v1" as const;

/** The bounded terminal work-proof every temporary contribution must satisfy. */
export const CONTRIBUTION_TERMINAL_TOOL = "submit_contribution" as const;

/** The host-derived Task Shape admission identity for one temporary contribution. */
export const CONTRIBUTION_TASK_SHAPE_REVISION = "rosso.conversation-contribution-task-shape.v1" as const;

/** The one synthesis owner every conversation contribution names. */
export const CONTRIBUTION_RECONSTRUCTION_OWNER = "workbench-conversation-coordinator" as const;

/** The canonical Task source every contribution derives its evidence from. */
export const CONTRIBUTION_TASK_SOURCE_REF = "workbench:state/tasks.json" as const;

const CONTRIBUTION_OBLIGATION_REF_PREFIX = "workbench:task:" as const;

export type ContributionErrorCode =
  | "contribution-duplicate"
  | "contribution-limit"
  | "contribution-stale"
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

export type ChildResultRefusalCode = "not-found" | "not-settled" | "stale" | "invalid";

export type ChildResultRead =
  | { readonly standing: "read"; readonly result: DelegateResultProjection }
  | { readonly standing: "refused"; readonly code: ChildResultRefusalCode; readonly reason: string };

export interface ConversationContributionRegistry {
  readonly home: string;
  /**
   * Synchronously derive the full host-owned admission envelope from the
   * current canonical Task and runtime sources and start at most one bounded
   * delegate contribution for one committed `contribution_spawn` action. The
   * exact durable (turnId, actionId) mapping refuses a second contribution
   * for the same committed action, and the caller's spawn shape carries only
   * intent plus non-derivable constraints. Throws `ContributionError` with no
   * effect on any stale, unregistered, guessed, dirty, or mismatched
   * selector, and refuses overlapping effectful writers.
   */
  spawn(input: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
    readonly operation: ContributionSpawnOperation;
  }): ContributionStartReceipt;
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
}

export interface ConversationContributionRegistryOptions {
  /** Test seam; defaults to the current worker policy catalog. */
  readonly catalog?: WorkerCatalog;
  readonly environment?: NodeJS.ProcessEnv;
  /** Bound on live contributions per conversation; read-only contributions may run in parallel up to it. */
  readonly maxLiveContributions?: number;
  readonly now?: () => string;
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
}).strict();
type SpawnReceipt = z.infer<typeof SpawnReceiptSchema>;

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
  private readonly maxLiveContributions: number;
  private readonly now: () => string;
  private readonly handles = new Map<string, WorkbenchContributionHandle>();
  private readonly startedByCommittedAction = new Map<string, string>();
  private readonly keysByConversation = new Map<string, Set<string>>();

  constructor(
    home: string,
    catalog: WorkerCatalog,
    options: ConversationContributionRegistryOptions,
  ) {
    this.home = home;
    this.catalog = catalog;
    this.timeline = new FileMissionTimeline(join(home, "state", "conversation-contributions"));
    const max = options.maxLiveContributions ?? 8;
    if (!Number.isInteger(max) || max < 1) {
      throw new Error("maxLiveContributions must be a positive integer");
    }
    this.maxLiveContributions = max;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  spawn(input: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
    readonly operation: ContributionSpawnOperation;
  }): ContributionStartReceipt {
    const operation = input.operation;
    const actionKey = committedActionKey(input.conversationId, input.actionId);
    const existing = this.startedByCommittedAction.get(actionKey);
    if (existing !== undefined) {
      throw new ContributionError(
        "contribution-duplicate",
        `a contribution for turn ${input.turnId} action ${input.actionId} was already started: ${existing}`,
      );
    }
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
    if (tasks.sourceRevision !== operation.expectedSourceRevision) {
      throw new ContributionError(
        "contribution-stale",
        `task source revision is stale for the contribution: expected ${operation.expectedSourceRevision}, current ${tasks.sourceRevision}`,
      );
    }
    const task = taskById(tasks, operation.taskId);
    if (task === undefined) {
      throw new ContributionError(
        "task-missing",
        `task ${operation.taskId} does not exist in the canonical Task source`,
      );
    }
    if (task.revision !== operation.expectedRevision) {
      throw new ContributionError(
        "contribution-stale",
        `task revision is stale for the contribution: expected ${operation.expectedRevision}, current ${task.revision}`,
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
    try {
      verifyExecutionSelectors(this.home, { task, worktree }, operation);
    } catch (error) {
      throw new ContributionError(
        "contribution-stale",
        `the contribution's exact execution selection is stale: ${errorMessage(error)}`,
      );
    }

    if (operation.effectKind === "effectful") {
      try {
        verifyCleanStatus(worktree);
      } catch (error) {
        throw new ContributionError("worktree-dirty", errorMessage(error));
      }
    }

    const batchId = randomUUID();
    let lease: TaskRunLease | undefined;
    if (operation.effectKind === "effectful") {
      try {
        // The exact shared task-run Worktree lease: one Task/Worktree permits
        // at most one effectful execution owner, whether a task_continue
        // carrier or a temporary contribution, and overlapping writers are
        // refused by the same atomic owner evidence.
        lease = acquireWorktreeLease(worktree, task.id, batchId);
      } catch (error) {
        throw new ContributionError("effect-conflict", errorMessage(error));
      }
    }

    const { batch, cell } = this.prepareContribution({
      conversationId: input.conversationId,
      actionId: input.actionId,
      task,
      sourceRevision: tasks.sourceRevision,
      worktree,
      card,
      operation,
      batchId,
      settledKeys: [...conversationKeys].filter((key) => key !== operation.key),
    });

    const spawnRef = this.writeSpawnReceipt({
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
    });

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
      spawnRef,
      ...(lease === undefined ? {} : { lease }),
    });
    this.handles.set(batchId, handle);
    this.startedByCommittedAction.set(actionKey, batchId);
    conversationKeys.add(operation.key);
    void this.runContribution(handle, batch, input.conversationId);
    return {
      batchId,
      key: operation.key,
      cellId: cell.id,
      workerId: card.id,
      effectKind: operation.effectKind,
      taskId: task.id,
      sourceRevision: tasks.sourceRevision,
      taskRevision: task.revision,
      evidenceRefs: [spawnRef],
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
        recovered = await this.timeline.recoverBatch(conversationId, receipt.batchId);
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
        projections.push({
          batchId: receipt.batchId,
          key: receipt.key,
          workerId: receipt.workerId,
          effectKind: receipt.effectKind,
          taskId: receipt.taskId,
          state: "settled",
          status: outcome.status,
        });
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
      if (!this.isStillCurrent(receipt)) continue;
      let result: DelegateResultProjection;
      try {
        result = await this.timeline.readResult(conversationId, receipt.batchId, receipt.key);
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
    if (!this.isStillCurrent(receipt)) {
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
      recovered = await this.timeline.recoverBatch(input.conversationId, input.batchId);
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
      const result = await this.timeline.readResult(input.conversationId, input.batchId, input.key);
      return { standing: "read", result };
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
      const liveness = handle.liveness();
      if (liveness.state !== "live") {
        throw new ContributionError(
          "contribution-not-live",
          `contribution ${input.batchId}/${input.key} is not live; stop has no effect`,
        );
      }
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

  private currentTasks(): ReturnType<typeof loadPrincipalTasks> {
    try {
      return loadPrincipalTasks(this.home);
    } catch (error) {
      throw new ContributionError("source-unavailable", `the canonical Task source cannot be read: ${errorMessage(error)}`);
    }
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
      capabilities: [],
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
      id: `conversation-contribution:${input.conversationId}:${input.batchId}`,
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

  private async runContribution(
    handle: WorkbenchContributionHandle,
    batch: PreparedDelegateBatch,
    conversationId: string,
  ): Promise<void> {
    try {
      await startDelegateBatch(checkpointFor(batch, conversationId), {
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
      }).then(async (delegate) => {
        const settlement = await delegate.settled;
        const outcome = settlement.outcomes[0];
        // Process settlement, not verification: a settled child produced
        // evidence; its verification standing stays in the outcome status and
        // the keyed result receipt (a plain Cell result is unverified).
        const status: ContributionSettlement["status"] =
          outcome === undefined || outcome.status === "runner_error" ? "failed"
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

  private writeSpawnReceipt(input: {
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
  }): string {
    const directory = this.conversationDirectory(input.conversationId);
    mkdirSync(directory, { recursive: true });
    const path = join(directory, `spawn-${input.batchId}.json`);
    writeImmutableJson(path, SpawnReceiptSchema.parse({
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
    }));
    return evidenceRef(this.home, path);
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

  /** The contribution is still current only while its Task revision still matches the current source. */
  private isStillCurrent(receipt: SpawnReceipt): boolean {
    let tasks;
    try {
      tasks = loadPrincipalTasks(this.home);
    } catch {
      return false;
    }
    const task = taskById(tasks, receipt.taskId);
    return task !== undefined && task.revision === receipt.taskRevision;
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
    if (this.settlement !== undefined) {
      throw new ContributionError(
        "contribution-not-live",
        `contribution ${this.identity.batchId}/${this.identity.key} already settled with status ${this.settlement.status}; stop has no effect`,
      );
    }
    if (this.stopRequest !== undefined) {
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
   * sets and its retained lease payload so settled handles stay bounded.
   */
  finishTerminal(settlement: ContributionSettlement): void {
    if (this.settlement !== undefined) return;
    this.settlement = settlement;
    if (this.lease !== undefined) {
      try {
        releaseWorktreeLease(this.lease);
      } catch (error) {
        this.settlement = {
          status: "unresolved",
          evidenceRefs: settlement.evidenceRefs,
          error:
            `the durable settlement exists but the contribution lease could not be released: `
            + `${errorMessage(error)}`,
        };
      }
    }
    this.lease = undefined;
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

function committedActionKey(conversationId: string, actionId: string): string {
  return `${conversationId}\u0000${actionId}`;
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

function taskById(tasks: ReturnType<typeof loadPrincipalTasks>, idArgument: string): PrincipalTask | undefined {
  const folded = idArgument.trim().toLowerCase();
  if (folded.length === 0) return undefined;
  const matches = tasks.tasks.filter((task) => task.id.toLowerCase() === folded);
  return matches.length === 1 ? matches[0] : undefined;
}

function writeImmutableJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
}

function currentCatalog(environment: NodeJS.ProcessEnv): WorkerCatalog {
  return requireFromHere("../../../autonomy/src/worker-policy").createCurrentWorkerCatalog(environment);
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== "" ? error.message : String(error);
}
