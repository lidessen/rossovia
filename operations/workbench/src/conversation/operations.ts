import { existsSync, realpathSync } from "node:fs";
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
import { optionalGit, requiredGit } from "../workspace";
import { taskActionSourceRef, taskReceiptEvidenceRef } from "./contracts";
import type { ConversationOperation } from "../../../autonomy/src/conversation-coordinator";

export type ConversationOperationHostErrorCode =
  | "invalid-operation"
  | "project-unresolved"
  | "worktree-unobserved"
  | "stale-context"
  | "task-not-found"
  | "task-settled"
  | "stale-revision"
  | "operation-unavailable"
  | "source-unavailable";

export class ConversationOperationHostError extends Error {
  constructor(readonly code: ConversationOperationHostErrorCode, message: string) {
    super(message);
    this.name = "ConversationOperationHostError";
  }
}

/** The natural canonical receipt of one committed Task mutation. */
export interface TaskActionReceipt {
  readonly taskId: string;
  readonly sourceRevision: number;
  readonly taskRevision: number;
  readonly evidenceRefs: readonly string[];
}

export type CanonicalReceiptLookup =
  | { readonly standing: "settled"; readonly receipt: TaskActionReceipt }
  | { readonly standing: "absent" }
  | { readonly standing: "uninspectable"; readonly reason: string };

/**
 * The Workbench adapter that binds one typed conversation operation to the
 * existing canonical Task API. It owns no Task state and no conversation
 * lifecycle: it re-reads the registered projects, exact observed Worktrees,
 * and the Task source immediately before each effect, then returns the
 * canonical receipt. It never inspects Principal prose; the input is already
 * a strict typed operation chosen by the coordinator. `task_continue` and
 * `work_control` remain typed but unavailable: they fail visibly without any
 * effect until the execution carrier wave owns them.
 */
export interface ConversationOperationHost {
  readonly home: string;
  /** Validate against current sources and commit the canonical Task mutation. */
  executeOperation(input: {
    readonly conversationId: string;
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

export function createConversationTaskOperationHost(homeArgument?: string): ConversationOperationHost {
  return new WorkbenchTaskOperationHost(resolveHome(homeArgument));
}

class WorkbenchTaskOperationHost implements ConversationOperationHost {
  readonly home: string;

  constructor(home: string) {
    this.home = home;
  }

  executeOperation(input: {
    readonly conversationId: string;
    readonly actionId: string;
    readonly operation: ConversationOperation;
  }): TaskActionReceipt {
    const sourceRef = taskActionSourceRef(input.conversationId, input.actionId);
    try {
      switch (input.operation.kind) {
        case "task_create":
          return this.executeCreate(input.operation, sourceRef);
        case "task_correct":
          return this.executeCorrect(input.operation, sourceRef);
        case "task_continue":
          throw new ConversationOperationHostError(
            "operation-unavailable",
            "task_continue is not available until the execution carrier wave owns continuation; no effect was applied",
          );
        case "work_control":
          throw new ConversationOperationHostError(
            "operation-unavailable",
            "work_control is not available without an exact execution carrier; no effect was applied",
          );
        default: {
          const unreachable: never = input.operation;
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
    let tasks: PrincipalTasks;
    try {
      tasks = loadPrincipalTasks(this.home);
    } catch (error) {
      return {
        standing: "uninspectable",
        reason: `the canonical Task source cannot be read for reconciliation: ${errorMessage(error)}`,
      };
    }
    switch (input.operation.kind) {
      case "task_create": {
        const task = tasks.tasks.find((candidate) => candidate.origin.sourceRef === sourceRef);
        return task === undefined
          ? { standing: "absent" }
          : { standing: "settled", receipt: receiptFor(tasks, task) };
      }
      case "task_correct": {
        const task = taskById(tasks, input.operation.taskId);
        if (task === undefined) return { standing: "absent" };
        const committed = task.corrections.some((correction) => correction.sourceRef === sourceRef);
        return committed
          ? { standing: "settled", receipt: receiptFor(tasks, task) }
          : { standing: "absent" };
      }
      case "task_continue":
      case "work_control":
        // Unavailable operations never commit an effect; absence is certain.
        return { standing: "absent" };
      default: {
        const unreachable: never = input.operation;
        return {
          standing: "uninspectable",
          reason: `unknown operation kind: ${String(unreachable)}`,
        };
      }
    }
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

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== "" ? error.message : String(error);
}
