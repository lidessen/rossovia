import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { PrincipalTask, PrincipalTasks } from "../contracts";
import { resolveHome } from "../home";
import { expandPath } from "../paths";
import { resolveProject } from "../resolve";
import {
  correctPrincipalTask,
  createPrincipalTask,
  loadPrincipalTasks,
  PrincipalTaskError,
} from "../tasks";
import { evidenceRef } from "../task-run";
import { readStrictTaskAttemptEvidence } from "../task-attempts";
import { optionalGit, requiredGit } from "../workspace";
import { taskActionSourceRef, taskReceiptEvidenceRef } from "./contracts";
import type { ConversationOperation } from "../../../autonomy/src/conversation-coordinator";
import {
  ConversationCarrierError,
  listAttemptDirectories,
  TaskRunControlReceiptSchema,
  type CarrierControlReceipt,
  type ConversationExecutionCarrierRegistry,
} from "./execution-carrier";
import {
  ContributionError,
  contributionStateDirectory,
  readContributionControlReceipts,
  readContributionSpawnReceipts,
  type ConversationContributionRegistry,
} from "./contributions";

export type ConversationOperationHostErrorCode =
  | "invalid-operation"
  | "project-unresolved"
  | "worktree-unobserved"
  | "worktree-dirty"
  | "stale-context"
  | "task-not-found"
  | "task-settled"
  | "task-not-runnable"
  | "task-not-bound"
  | "stale-revision"
  | "operation-unavailable"
  | "carrier-duplicate"
  | "carrier-not-found"
  | "carrier-not-live"
  | "carrier-unknown"
  | "control-unsupported"
  | "control-conflict"
  | "lease-conflict"
  | "worker-unknown"
  | "worker-unavailable"
  | "contribution-duplicate"
  | "contribution-limit"
  | "contribution-not-found"
  | "contribution-not-live"
  | "contribution-unknown"
  | "capability-unsupported"
  | "effect-conflict"
  | "source-unavailable";

export class ConversationOperationHostError extends Error {
  constructor(readonly code: ConversationOperationHostErrorCode, message: string) {
    super(message);
    this.name = "ConversationOperationHostError";
  }
}

/** The natural canonical receipt of one committed Task mutation or carrier control. */
export interface TaskActionReceipt {
  readonly taskId: string;
  readonly sourceRevision?: number;
  readonly taskRevision?: number;
  /** The exact retained carrier started by a settled task_continue action. */
  readonly carrierId?: string;
  readonly evidenceRefs: readonly string[];
}

export type CanonicalReceiptLookup =
  | { readonly standing: "settled"; readonly receipt: TaskActionReceipt }
  | { readonly standing: "absent" }
  | { readonly standing: "uninspectable"; readonly reason: string };

/**
 * The Workbench adapter that binds one typed conversation operation to the
 * existing canonical Task API and the exact retained execution-carrier
 * runtime. It owns no Task state and no conversation lifecycle: it re-reads
 * the registered projects, exact observed Worktrees, the Task source, and the
 * exact Worktree lease immediately before each effect, then returns the
 * canonical receipt. It never inspects Principal prose; the input is already
 * a strict typed operation chosen by the coordinator. Without an installed
 * carrier registry, `task_continue` and `work_control` remain typed but
 * unavailable; without an installed contribution registry, `contribution_spawn`
 * and `contribution_control` remain typed but unavailable: all fail visibly
 * without any effect.
 */
export interface ConversationOperationHost {
  readonly home: string;
  /** Validate against current sources and commit the canonical Task mutation or carrier/contribution effect. */
  executeOperation(input: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
    readonly operation: ConversationOperation;
  }): TaskActionReceipt;
  /** Crash reconciliation: search the canonical Task owner for the action's causal reference. */
  findCanonicalReceipt(input: {
    readonly conversationId: string;
    readonly actionId: string;
    readonly operation: ConversationOperation;
  }): CanonicalReceiptLookup;
}

export interface ConversationTaskOperationHostOptions {
  /**
   * The exact retained carrier runtime that starts and controls ordinary Task
   * carriers. Absent, `task_continue` and `work_control` fail visibly.
   */
  readonly carrierRegistry?: ConversationExecutionCarrierRegistry;
  /**
   * The exact retained temporary contribution runtime. Absent,
   * `contribution_spawn` and `contribution_control` fail visibly.
   */
  readonly contributionRegistry?: ConversationContributionRegistry;
}

export function createConversationTaskOperationHost(
  homeArgument?: string,
  options: ConversationTaskOperationHostOptions = {},
): ConversationOperationHost {
  return new WorkbenchTaskOperationHost(resolveHome(homeArgument), options);
}

class WorkbenchTaskOperationHost implements ConversationOperationHost {
  readonly home: string;
  private readonly carrierRegistry: ConversationExecutionCarrierRegistry | undefined;
  private readonly contributionRegistry: ConversationContributionRegistry | undefined;

  constructor(
    home: string,
    options: ConversationTaskOperationHostOptions,
  ) {
    this.home = home;
    this.carrierRegistry = options.carrierRegistry;
    this.contributionRegistry = options.contributionRegistry;
  }

  executeOperation(input: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
    readonly operation: ConversationOperation;
  }): TaskActionReceipt {
    const sourceRef = taskActionSourceRef(input.conversationId, input.actionId);
    const operation = input.operation;
    try {
      switch (operation.kind) {
        case "task_create":
          return this.executeCreate(operation, sourceRef);
        case "task_correct":
          return this.executeCorrect(operation, sourceRef);
        case "task_continue":
          return this.executeContinue({
            conversationId: input.conversationId,
            turnId: input.turnId,
            actionId: input.actionId,
            operation,
          });
        case "work_control":
          return this.executeControl({
            conversationId: input.conversationId,
            turnId: input.turnId,
            actionId: input.actionId,
            operation,
          });
        case "contribution_spawn":
          return this.executeContributionSpawn({
            conversationId: input.conversationId,
            turnId: input.turnId,
            actionId: input.actionId,
            operation,
          });
        case "contribution_control":
          return this.executeContributionControl({
            conversationId: input.conversationId,
            turnId: input.turnId,
            actionId: input.actionId,
            operation,
          });
        default: {
          const unreachable: never = operation;
          throw new ConversationOperationHostError(
            "invalid-operation",
            `unknown operation kind: ${String(unreachable)}`,
          );
        }
      }
    } catch (error) {
      throw mapOperationError(error);
    }
  }

  findCanonicalReceipt(input: {
    readonly conversationId: string;
    readonly actionId: string;
    readonly operation: ConversationOperation;
  }): CanonicalReceiptLookup {
    const sourceRef = taskActionSourceRef(input.conversationId, input.actionId);
    const operation = input.operation;
    if (operation.kind === "task_continue") {
      return this.findContinueReceipt(sourceRef);
    }
    if (operation.kind === "work_control") {
      return this.findControlReceipt({
        conversationId: input.conversationId,
        actionId: input.actionId,
        operation,
      });
    }
    if (operation.kind === "contribution_spawn") {
      return this.findContributionSpawnReceipt(input.conversationId, sourceRef);
    }
    if (operation.kind === "contribution_control") {
      return this.findContributionControlReceipt({
        conversationId: input.conversationId,
        actionId: input.actionId,
        operation,
      });
    }
    let tasks: PrincipalTasks;
    try {
      tasks = loadPrincipalTasks(this.home);
    } catch (error) {
      return {
        standing: "uninspectable",
        reason: `the canonical Task source cannot be read for reconciliation: ${errorMessage(error)}`,
      };
    }
    switch (operation.kind) {
      case "task_create": {
        const task = tasks.tasks.find((candidate) => candidate.origin.sourceRef === sourceRef);
        return task === undefined
          ? { standing: "absent" }
          : { standing: "settled", receipt: receiptFor(tasks, task) };
      }
      case "task_correct": {
        const task = taskById(tasks, operation.taskId);
        if (task === undefined) return { standing: "absent" };
        const committed = task.corrections.some((correction) => correction.sourceRef === sourceRef);
        return committed
          ? { standing: "settled", receipt: receiptFor(tasks, task) }
          : { standing: "absent" };
      }
      default: {
        const unreachable: never = operation;
        return {
          standing: "uninspectable",
          reason: `unknown operation kind: ${String(unreachable)}`,
        };
      }
    }
  }

  /**
   * A typed continue starts at most one carrier for its committed action: the
   * retained registry re-reads the exact canonical Task and source revision,
   * the registered project identity and current primary observation, the
   * bound Worktree path and head, and the exact Worktree lease immediately
   * before the effect. The returned receipt references the durable attempt
   * evidence, not a second task or execution store.
   */
  private executeContinue(
    input: {
      readonly conversationId: string;
      readonly turnId: string;
      readonly actionId: string;
      readonly operation: Extract<ConversationOperation, { kind: "task_continue" }>;
    },
  ): TaskActionReceipt {
    if (this.carrierRegistry === undefined) {
      throw new ConversationOperationHostError(
        "operation-unavailable",
        "task_continue is unavailable without an installed execution-carrier runtime; no effect was applied",
      );
    }
    const receipt = this.carrierRegistry.startCarrier({
      conversationId: input.conversationId,
      turnId: input.turnId,
      actionId: input.actionId,
      operation: input.operation,
    });
    return {
      taskId: receipt.taskId,
      sourceRevision: receipt.sourceRevision,
      taskRevision: receipt.taskRevision,
      carrierId: receipt.carrierId,
      evidenceRefs: [...receipt.evidenceRefs],
    };
  }

  /**
   * A typed control resolves one exact retained carrier and applies only that
   * mapped stop. A carrier without a retained runtime handle and without a
   * terminal settlement leaves liveness unknown and the control unverified;
   * an already settled carrier refuses visibly; pause/resume/recover are not
   * owned by an ordinary Task carrier.
   */
  private executeControl(input: {
    readonly conversationId: string;
    readonly turnId: string;
    readonly actionId: string;
    readonly operation: Extract<ConversationOperation, { kind: "work_control" }>;
  }): TaskActionReceipt {
    if (this.carrierRegistry === undefined) {
      throw new ConversationOperationHostError(
        "operation-unavailable",
        "work_control is unavailable without an installed execution-carrier runtime; no effect was applied",
      );
    }
    const operation = input.operation;
    if (operation.control !== "stop") {
      throw new ConversationOperationHostError(
        "control-unsupported",
        `control '${operation.control}' is not owned by an ordinary Task carrier; only an exact live stop is available`,
      );
    }
    let receipt: CarrierControlReceipt;
    try {
      receipt = this.carrierRegistry.controlCarrier({
        carrierId: operation.carrierId,
        control: operation.control,
        actor: {
          conversationId: input.conversationId,
          turnId: input.turnId,
          actionId: input.actionId,
        },
      });
    } catch (error) {
      if (error instanceof ConversationCarrierError) throw mapCarrierError(error);
      throw mapOperationError(error);
    }
    const evidence = readStrictTaskAttemptEvidence(this.home, operation.carrierId);
    const taskId = evidence.attempt?.taskId ?? operation.carrierId;
    return {
      taskId,
      ...(evidence.attempt?.sourceRevision === undefined
        ? {}
        : { sourceRevision: evidence.attempt.sourceRevision }),
      ...(evidence.attempt?.taskRevision === undefined
        ? {}
        : { taskRevision: evidence.attempt.taskRevision }),
      evidenceRefs: [...receipt.evidenceRefs],
    };
  }

  /**
   * The canonical continue receipt: the retained attempt carrying this
   * action's causal source reference, read through the strict evidence
   * reader. A matching correlation under invalid or mismatched evidence is
   * uninspectable, never settled.
   */
  private findContinueReceipt(sourceRef: string): CanonicalReceiptLookup {
    for (const attemptId of listAttemptDirectories(this.home)) {
      const evidence = readStrictTaskAttemptEvidence(this.home, attemptId);
      const correlation = evidence.attempt?.correlation;
      if (correlation?.sourceRef !== sourceRef) continue;
      if (evidence.standing !== "available") {
        return {
          standing: "uninspectable",
          reason: `attempt ${attemptId} retains invalid evidence for this action: ${evidence.error ?? "unavailable"}`,
        };
      }
      return {
        standing: "settled",
        receipt: {
          taskId: evidence.attempt!.taskId,
          sourceRevision: evidence.attempt!.sourceRevision,
          taskRevision: evidence.attempt!.taskRevision,
          evidenceRefs: [
            evidence.refs.attemptRef,
            evidence.refs.inputRef,
            evidence.refs.finalRecordRef,
            evidence.refs.settlementRef,
          ],
        },
      };
    }
    return { standing: "absent" };
  }

  /**
   * The canonical control receipt: the strict retained control record for
   * this action's causal source reference, cross-linked against the owning
   * attempt evidence and the requested operation — carrierId, attemptId,
   * taskId, worker, Worktree, actor identity, and stable refs must all
   * match. No matching sourceRef is provable absence and remains retryable;
   * a matching sourceRef whose record is unreadable or fails any cross-link
   * is uninspectable — visible uncertainty that cannot settle and cannot be
   * retried as if absent.
   */
  private findControlReceipt(input: {
    readonly conversationId: string;
    readonly actionId: string;
    readonly operation: Extract<ConversationOperation, { kind: "work_control" }>;
  }): CanonicalReceiptLookup {
    const sourceRef = taskActionSourceRef(input.conversationId, input.actionId);
    const carrierId = input.operation.carrierId;
    const controlPath = join(this.home, "state", "task-attempts", carrierId, "control.json");
    if (!existsSync(controlPath)) return { standing: "absent" };
    let value: unknown;
    try {
      value = JSON.parse(readFileSync(controlPath, "utf8"));
    } catch (error) {
      return {
        standing: "uninspectable",
        reason: `the retained control record for carrier ${carrierId} cannot be read: ${errorMessage(error)}`,
      };
    }
    const parsed = TaskRunControlReceiptSchema.safeParse(value);
    if (!parsed.success) {
      return {
        standing: "uninspectable",
        reason: `the retained control record for carrier ${carrierId} does not match the exact receipt shape`,
      };
    }
    const receipt = parsed.data;
    if (receipt.sourceRef !== sourceRef) {
      // A different committed action's receipt: provable absence for this one.
      return { standing: "absent" };
    }
    const evidence = readStrictTaskAttemptEvidence(this.home, carrierId);
    if (evidence.standing !== "available" || evidence.attempt === undefined) {
      return {
        standing: "uninspectable",
        reason:
          `carrier ${carrierId} retains invalid evidence for this control: ${evidence.error ?? "unavailable"}`,
      };
    }
    const mismatch = controlReceiptCrossLinkError(receipt, carrierId, evidence, input);
    if (mismatch !== undefined) {
      return {
        standing: "uninspectable",
        reason: `the retained control record for carrier ${carrierId} fails its exact identity: ${mismatch}`,
      };
    }
    const refs = [evidenceRef(this.home, controlPath)];
    if (evidence.settlement !== undefined) {
      refs.push(evidence.refs.settlementRef);
    }
    return {
      standing: "settled",
      receipt: {
        taskId: evidence.attempt.taskId,
        evidenceRefs: refs,
      },
    };
  }

  /**
   * A typed spawn starts at most one bounded contribution for its committed
   * action: the retained registry derives the conversation's current Task
   * from the durable journal, re-reads the exact canonical Task source, and
   * re-validates the Task's bound registered project, current primary
   * observation, bound Worktree path and head, and — for an effectful
   * contribution — the exact shared task-run Worktree lease immediately
   * before the effect. The coordinator's spawn shape supplied only intent
   * plus non-derivable constraints, so none of those selectors can be
   * invented by the model. The returned receipt references the durable spawn
   * and delegate timeline evidence, not a second task or result store.
   */
  private executeContributionSpawn(
    input: {
      readonly conversationId: string;
      readonly turnId: string;
      readonly actionId: string;
      readonly operation: Extract<ConversationOperation, { kind: "contribution_spawn" }>;
    },
  ): TaskActionReceipt {
    if (this.contributionRegistry === undefined) {
      throw new ConversationOperationHostError(
        "operation-unavailable",
        "contribution_spawn is unavailable without an installed temporary contribution runtime; no effect was applied",
      );
    }
    const receipt = this.contributionRegistry.spawn({
      conversationId: input.conversationId,
      turnId: input.turnId,
      actionId: input.actionId,
      operation: input.operation,
    });
    return {
      taskId: receipt.taskId,
      sourceRevision: receipt.sourceRevision,
      taskRevision: receipt.taskRevision,
      evidenceRefs: [...receipt.evidenceRefs],
    };
  }

  /**
   * A typed control resolves one exact retained contribution and applies only
   * that mapped stop. A contribution without a retained runtime handle and
   * without a durable settlement leaves liveness unknown and the control
   * unverified; an already settled contribution refuses visibly.
   */
  private executeContributionControl(
    input: {
      readonly conversationId: string;
      readonly turnId: string;
      readonly actionId: string;
      readonly operation: Extract<ConversationOperation, { kind: "contribution_control" }>;
    },
  ): TaskActionReceipt {
    if (this.contributionRegistry === undefined) {
      throw new ConversationOperationHostError(
        "operation-unavailable",
        "contribution_control is unavailable without an installed temporary contribution runtime; no effect was applied",
      );
    }
    const operation = input.operation;
    let receipt: ReturnType<ConversationContributionRegistry["control"]>;
    try {
      receipt = this.contributionRegistry.control({
        batchId: operation.batchId,
        key: operation.key,
        control: operation.control,
        actor: {
          conversationId: input.conversationId,
          turnId: input.turnId,
          actionId: input.actionId,
        },
      });
    } catch (error) {
      if (error instanceof ContributionError) throw mapContributionError(error);
      throw mapOperationError(error);
    }
    return {
      taskId: receipt.taskId,
      evidenceRefs: [...receipt.evidenceRefs],
    };
  }

  /**
   * The canonical spawn receipt: the durable spawn record carrying this
   * action's causal source reference, its exact batch/key, worker, effect
   * boundary, and retained Task revisions. An unreadable matching record is
   * uninspectable, never settled.
   */
  private findContributionSpawnReceipt(conversationId: string, sourceRef: string): CanonicalReceiptLookup {
    for (const receipt of readContributionSpawnReceipts(this.home, conversationId)) {
      if (receipt.sourceRef !== sourceRef) continue;
      return {
        standing: "settled",
        receipt: {
          taskId: receipt.taskId,
          sourceRevision: receipt.sourceRevision,
          taskRevision: receipt.taskRevision,
          evidenceRefs: [evidenceRef(this.home, join(
            contributionStateDirectory(this.home, conversationId),
            `spawn-${receipt.batchId}.json`,
          ))],
        },
      };
    }
    return { standing: "absent" };
  }

  /**
   * The canonical contribution control receipt: the durable control record
   * for this action's causal source reference, cross-linked against the
   * requested operation — batchId, key, and the actor's conversation/action
   * must all match. No matching sourceRef is provable absence and remains
   * retryable; a matching sourceRef whose record is unreadable or fails any
   * cross-link is uninspectable.
   */
  private findContributionControlReceipt(input: {
    readonly conversationId: string;
    readonly actionId: string;
    readonly operation: Extract<ConversationOperation, { kind: "contribution_control" }>;
  }): CanonicalReceiptLookup {
    const sourceRef = taskActionSourceRef(input.conversationId, input.actionId);
    const receipts = readContributionControlReceipts(this.home, input.conversationId);
    const matching = receipts.filter((receipt) => receipt.sourceRef === sourceRef);
    if (matching.length === 0) return { standing: "absent" };
    const receipt = matching[0]!;
    const mismatch =
      receipt.requestedBy.conversationId !== input.conversationId
        || receipt.requestedBy.actionId !== input.actionId
        ? "the receipt actor identity does not match the reconciled action"
        : receipt.batchId !== input.operation.batchId || receipt.key !== input.operation.key
          ? "the receipt target does not match the reconciled contribution control"
          : undefined;
    if (mismatch !== undefined) {
      return {
        standing: "uninspectable",
        reason: `the retained contribution control record fails its exact identity: ${mismatch}`,
      };
    }
    return {
      standing: "settled",
      receipt: {
        taskId: receipt.taskId,
        evidenceRefs: [evidenceRef(this.home, join(
          contributionStateDirectory(this.home, input.conversationId),
          `control-${receipt.batchId}.json`,
        ))],
      },
    };
  }

  private executeCreate(
    operation: Extract<ConversationOperation, { kind: "task_create" }>,
    sourceRef: string,
  ): TaskActionReceipt {
    let resolution: ReturnType<typeof resolveProject>;
    try {
      resolution = resolveProject(this.home, operation.projectId);
    } catch (error) {
      throw new ConversationOperationHostError(
        "project-unresolved",
        `project '${operation.projectId}' cannot be resolved to one registered current project: ${errorMessage(error)}`,
      );
    }
    if (resolution.registration !== "registered") {
      throw new ConversationOperationHostError(
        "project-unresolved",
        `project '${operation.projectId}' is ${resolution.registration}, not a registered current project; the action has no unbound fallback`,
      );
    }
    if (resolution.project.id !== operation.projectId) {
      throw new ConversationOperationHostError(
        "project-unresolved",
        `project identity mismatch: the operation must carry the exact registered project ID '${operation.projectId}', not an alias; the action has no unbound fallback`,
      );
    }
    const primaryWorkspace = resolution.workspace.path;
    const observedHead = resolution.workspace.head;
    if (observedHead === null || observedHead !== operation.expectedPrimaryHead) {
      throw new ConversationOperationHostError(
        "stale-context",
        `the registered project's current primary head ${observedHead ?? "unavailable"} does not match the expected head ${operation.expectedPrimaryHead}; the action is refused`,
      );
    }
    const canonicalWorktree = observedWorktreePath(
      primaryWorkspace,
      operation.worktreePath,
      operation.expectedWorktreeHead,
    );
    const tasks = loadPrincipalTasks(this.home);
    const result = createPrincipalTask(this.home, {
      title: operation.title,
      objective: operation.objective,
      acceptance: operation.acceptance,
      ...(operation.todos === undefined ? {} : { todos: operation.todos }),
      nextActor: "agent",
      sourceRef,
      expectedSourceRevision: tasks.sourceRevision,
      project: operation.projectId,
      worktree: canonicalWorktree,
    });
    return receiptFor(loadPrincipalTasks(this.home), result.task);
  }

  private executeCorrect(
    operation: Extract<ConversationOperation, { kind: "task_correct" }>,
    sourceRef: string,
  ): TaskActionReceipt {
    const tasks = loadPrincipalTasks(this.home);
    if (tasks.sourceRevision !== operation.expectedSourceRevision) {
      throw new ConversationOperationHostError(
        "stale-revision",
        `task source revision is stale for the correction: expected ${operation.expectedSourceRevision}, current ${tasks.sourceRevision}`,
      );
    }
    const task = taskById(tasks, operation.taskId);
    if (task === undefined) {
      throw new ConversationOperationHostError(
        "task-not-found",
        `task ${operation.taskId} does not exist in the canonical Task source`,
      );
    }
    if (task.revision !== operation.expectedRevision) {
      throw new ConversationOperationHostError(
        "stale-revision",
        `task revision is stale for the correction: expected ${operation.expectedRevision}, current ${task.revision}`,
      );
    }
    if (task.lifecycle === "settled") {
      throw new ConversationOperationHostError(
        "task-settled",
        `task ${task.id} is settled; reopen it before appending a correction`,
      );
    }
    const result = correctPrincipalTask(this.home, {
      id: task.id,
      expectedSourceRevision: tasks.sourceRevision,
      expectedRevision: task.revision,
      statement: operation.statement,
      sourceRef,
      nextActor: "agent",
    });
    return receiptFor(loadPrincipalTasks(this.home), result.task);
  }
}

function receiptFor(tasks: PrincipalTasks, task: PrincipalTask): TaskActionReceipt {
  return {
    taskId: task.id,
    sourceRevision: tasks.sourceRevision,
    taskRevision: task.revision,
    evidenceRefs: [taskReceiptEvidenceRef(task.id, tasks.sourceRevision)],
  };
}

function taskById(tasks: PrincipalTasks, idArgument: string): PrincipalTask | undefined {
  const folded = idArgument.trim().toLowerCase();
  if (folded.length === 0) return undefined;
  const matches = tasks.tasks.filter((task) => task.id.toLowerCase() === folded);
  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Re-verify that the operation's Worktree is an exact currently observed
 * Worktree of the registered project's primary workspace and that its current
 * head matches the expected head carried by the operation. A guessed, stale,
 * or missing path fails visibly; the host never substitutes one.
 */
function observedWorktreePath(
  primaryWorkspace: string,
  worktreeArgument: string,
  expectedHead: string,
): string {
  const candidate = expandPath(worktreeArgument);
  if (!existsSync(candidate)) {
    throw new ConversationOperationHostError(
      "worktree-unobserved",
      `task worktree does not exist: ${candidate}`,
    );
  }
  const canonical = realpathSync(candidate);
  let observed: string[];
  try {
    observed = requiredGit(["worktree", "list", "--porcelain"], primaryWorkspace)
      .split(/\r?\n/)
      .filter((line) => line.startsWith("worktree "))
      .map((line) => realpathSync(line.slice("worktree ".length)));
  } catch (error) {
    throw new ConversationOperationHostError(
      "worktree-unobserved",
      `the registered project's Worktrees cannot be observed: ${errorMessage(error)}`,
    );
  }
  if (!observed.includes(canonical)) {
    throw new ConversationOperationHostError(
      "worktree-unobserved",
      `task worktree is not an observed Worktree of the registered project: ${canonical}`,
    );
  }
  let head: string | null;
  try {
    head = optionalGit(["rev-parse", "HEAD"], canonical);
  } catch (error) {
    throw new ConversationOperationHostError(
      "worktree-unobserved",
      `the observed Worktree's head cannot be read: ${errorMessage(error)}`,
    );
  }
  if (head === null || head !== expectedHead) {
    throw new ConversationOperationHostError(
      "stale-context",
      `the observed Worktree's current head ${head ?? "unavailable"} does not match the expected head ${expectedHead}; the action is refused`,
    );
  }
  return canonical;
}

function mapOperationError(error: unknown): Error {
  if (error instanceof ConversationOperationHostError) return error;
  if (error instanceof ConversationCarrierError) return mapCarrierError(error);
  if (error instanceof ContributionError) return mapContributionError(error);
  if (error instanceof PrincipalTaskError) {
    const code: ConversationOperationHostErrorCode =
      error.code === "task-drift" ? "stale-revision"
      : error.code === "task-not-found" ? "task-not-found"
      : error.code === "source-unavailable" ? "source-unavailable"
      : "invalid-operation";
    return new ConversationOperationHostError(code, error.message);
  }
  const message = errorMessage(error);
  return new ConversationOperationHostError(
    "invalid-operation",
    `the operation cannot be applied through the canonical Task API: ${message}`,
  );
}

function mapContributionError(error: ContributionError): ConversationOperationHostError {
  const code: ConversationOperationHostErrorCode =
    error.code === "contribution-duplicate" ? "contribution-duplicate"
    : error.code === "contribution-limit" ? "contribution-limit"
    : error.code === "task-missing" ? "task-not-found"
    : error.code === "task-settled" ? "task-settled"
    : error.code === "task-not-bound" ? "task-not-bound"
    : error.code === "worker-unknown" ? "worker-unknown"
    : error.code === "worker-unavailable" ? "worker-unavailable"
    : error.code === "capability-unsupported" ? "capability-unsupported"
    : error.code === "effect-conflict" ? "effect-conflict"
    : error.code === "worktree-dirty" ? "worktree-dirty"
    : error.code === "contribution-not-found" ? "contribution-not-found"
    : error.code === "contribution-not-live" ? "contribution-not-live"
    : error.code === "contribution-unknown" ? "contribution-unknown"
    : error.code === "control-unsupported" ? "control-unsupported"
    : error.code === "control-conflict" ? "control-conflict"
    : error.code === "source-unavailable" ? "source-unavailable"
    : "operation-unavailable";
  return new ConversationOperationHostError(code, error.message);
}

function mapCarrierError(error: ConversationCarrierError): ConversationOperationHostError {
  const code: ConversationOperationHostErrorCode =
    error.code === "carrier-duplicate" ? "carrier-duplicate"
    : error.code === "carrier-not-found" ? "carrier-not-found"
    : error.code === "carrier-not-live" ? "carrier-not-live"
    : error.code === "carrier-unknown" ? "carrier-unknown"
    : error.code === "control-unsupported" ? "control-unsupported"
    : error.code === "control-conflict" ? "control-conflict"
    : error.code === "lease-conflict" ? "lease-conflict"
    : error.code === "task-not-found" ? "task-not-found"
    : error.code === "task-settled" ? "task-settled"
    : error.code === "task-not-runnable" ? "task-not-runnable"
    : error.code === "task-not-bound" ? "task-not-bound"
    : error.code === "stale-revision" ? "stale-revision"
    : error.code === "stale-context" ? "stale-context"
    : error.code === "worktree-dirty" ? "worktree-dirty"
    : error.code === "project-unresolved" ? "project-unresolved"
    : error.code === "worktree-unobserved" ? "worktree-unobserved"
    : error.code === "worker-unknown" ? "worker-unknown"
    : error.code === "worker-unavailable" ? "worker-unavailable"
    : error.code === "source-unavailable" ? "source-unavailable"
    : "operation-unavailable";
  return new ConversationOperationHostError(code, error.message);
}

/**
 * Cross-link one strict control receipt against its owning attempt evidence
 * and the requested operation. Returns a mismatch reason, or undefined when
 * every identity link matches: the requested actor conversation/action, the
 * exact carrier/attempt identity, the attempt's taskId and workerId, the
 * stable attempt/settlement refs, and the immutable CellInput's exact
 * Worktree.
 */
function controlReceiptCrossLinkError(
  receipt: z.infer<typeof TaskRunControlReceiptSchema>,
  attemptId: string,
  evidence: ReturnType<typeof readStrictTaskAttemptEvidence>,
  input: {
    readonly conversationId: string;
    readonly actionId: string;
  },
): string | undefined {
  if (receipt.requestedBy.conversationId !== input.conversationId
    || receipt.requestedBy.actionId !== input.actionId) {
    return "the requested actor identity does not match the reconciled action";
  }
  if (receipt.carrierId !== attemptId || receipt.attemptId !== attemptId) {
    return "the receipt does not belong to its carrier attempt";
  }
  const attempt = evidence.attempt!;
  if (receipt.taskId !== attempt.taskId) {
    return "the receipt task identity does not match its owning attempt";
  }
  if (attempt.workerId === undefined || receipt.workerId !== attempt.workerId) {
    return "the receipt worker identity does not match its owning attempt";
  }
  if (receipt.attemptRef !== evidence.refs.attemptRef
    || receipt.settlementRef !== evidence.refs.settlementRef) {
    return "the receipt stable refs do not match its owning attempt evidence";
  }
  const cellInput = evidence.input;
  if (cellInput === undefined) {
    return "the owning attempt's immutable CellInput is unavailable";
  }
  let inputWorktree: string;
  let receiptWorktree: string;
  try {
    inputWorktree = realpathSync(cellInput.workspace.root);
    receiptWorktree = realpathSync(receipt.worktree);
  } catch {
    return "the receipt Worktree cannot be related to the immutable CellInput workspace";
  }
  if (inputWorktree !== receiptWorktree) {
    return "the receipt Worktree does not match the immutable CellInput workspace";
  }
  return undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== "" ? error.message : String(error);
}
