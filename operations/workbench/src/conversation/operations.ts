import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
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
  | "lease-conflict"
  | "worker-unknown"
  | "worker-unavailable"
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
 * unavailable: they fail visibly without any effect.
 */
export interface ConversationOperationHost {
  readonly home: string;
  /** Validate against current sources and commit the canonical Task mutation or carrier effect. */
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
}

export function createConversationTaskOperationHost(
  homeArgument?: string,
  options: ConversationTaskOperationHostOptions = {},
): ConversationOperationHost {
  return new WorkbenchTaskOperationHost(resolveHome(homeArgument), options.carrierRegistry);
}

class WorkbenchTaskOperationHost implements ConversationOperationHost {
  readonly home: string;
  private readonly carrierRegistry: ConversationExecutionCarrierRegistry | undefined;

  constructor(home: string, carrierRegistry?: ConversationExecutionCarrierRegistry) {
    this.home = home;
    this.carrierRegistry = carrierRegistry;
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
      return this.findControlReceipt(sourceRef);
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
   * The canonical control receipt: the retained control record for this
   * action's causal source reference, validated against the strict evidence
   * reader so invalid or mismatched attempt evidence is never settled.
   */
  private findControlReceipt(sourceRef: string): CanonicalReceiptLookup {
    for (const attemptId of listAttemptDirectories(this.home)) {
      const evidence = readStrictTaskAttemptEvidence(this.home, attemptId);
      const controlRef = controlReceiptEvidence(this.home, attemptId, sourceRef);
      if (controlRef === undefined) continue;
      if (evidence.standing !== "available") {
        return {
          standing: "uninspectable",
          reason: `attempt ${attemptId} retains invalid evidence for this control: ${evidence.error ?? "unavailable"}`,
        };
      }
      return {
        standing: "settled",
        receipt: {
          taskId: evidence.attempt?.taskId ?? attemptId,
          evidenceRefs: [...controlRef],
        },
      };
    }
    return { standing: "absent" };
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

function mapCarrierError(error: ConversationCarrierError): ConversationOperationHostError {
  const code: ConversationOperationHostErrorCode =
    error.code === "carrier-duplicate" ? "carrier-duplicate"
    : error.code === "carrier-not-found" ? "carrier-not-found"
    : error.code === "carrier-not-live" ? "carrier-not-live"
    : error.code === "carrier-unknown" ? "carrier-unknown"
    : error.code === "control-unsupported" ? "control-unsupported"
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
 * The retained durable control receipt of one attempt for one causal action
 * source reference, when it exists: the strict control record plus any
 * strictly validated terminal settlement evidence of the same attempt. A
 * control record that does not parse as the exact receipt shape is never
 * settled.
 */
function controlReceiptEvidence(
  home: string,
  attemptId: string,
  sourceRef: string,
): string[] | undefined {
  const evidence = readStrictTaskAttemptEvidence(home, attemptId);
  const controlPath = join(home, "state", "task-attempts", attemptId, "control.json");
  if (!existsSync(controlPath)) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(controlPath, "utf8"));
  } catch {
    return undefined;
  }
  const parsed = TaskRunControlReceiptSchema.safeParse(value);
  if (!parsed.success || parsed.data.sourceRef !== sourceRef) return undefined;
  const refs = [evidenceRef(home, controlPath)];
  if (evidence.settlement !== undefined) {
    refs.push(evidence.refs.settlementRef);
  }
  return refs;
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== "" ? error.message : String(error);
}
