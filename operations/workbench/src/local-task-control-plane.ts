import type { PrincipalTask, PrincipalTasks } from "./contracts";
import {
  acceptPrincipalTaskResult,
  assignPrincipalTask,
  correctPrincipalTask,
  createPrincipalTask,
  linkPrincipalTaskExecution,
  listPrincipalTasks,
  PrincipalTaskError,
  rebindPrincipalTaskWorktree,
  reopenPrincipalTask,
  reviewPrincipalTaskResult,
  showPrincipalTask,
  StaleTaskRevisionError,
  submitPrincipalTaskResult,
  type StaleTaskRevisionRecovery,
  type TaskAcceptArguments,
  type TaskAssignArguments,
  type TaskCorrectArguments,
  type TaskCreateArguments,
  type TaskLinkExecutionArguments,
  type TaskMutationResult,
  type TaskRebindWorktreeArguments,
  type TaskReopenArguments,
  type TaskReviewArguments,
  type TaskSubmitArguments,
} from "./tasks";

export type { StaleTaskRevisionRecovery, TaskMutationResult } from "./tasks";

export type LocalTaskControlErrorCode =
  | "invalid-task"
  | "task-not-found"
  | "task-drift"
  | "invalid-transition"
  | "claim-mismatch"
  | "invalid-candidate"
  | "duplicate-review"
  | "source-unavailable";

export class LocalTaskControlError extends Error {
  constructor(
    readonly code: LocalTaskControlErrorCode,
    message: string,
    options: ErrorOptions = {},
    readonly recovery?: StaleTaskRevisionRecovery,
  ) {
    super(message, options);
  }
}

export type LocalTaskCommand =
  | { readonly kind: "create"; readonly arguments: TaskCreateArguments }
  | { readonly kind: "assign"; readonly arguments: TaskAssignArguments }
  | { readonly kind: "correct"; readonly arguments: TaskCorrectArguments }
  | { readonly kind: "link-execution"; readonly arguments: TaskLinkExecutionArguments }
  | { readonly kind: "rebind-worktree"; readonly arguments: TaskRebindWorktreeArguments }
  | { readonly kind: "submit"; readonly arguments: TaskSubmitArguments }
  | { readonly kind: "review"; readonly arguments: TaskReviewArguments }
  | { readonly kind: "accept"; readonly arguments: TaskAcceptArguments }
  | { readonly kind: "reopen"; readonly arguments: TaskReopenArguments };

export interface LocalTaskControlPlane {
  list(): PrincipalTasks;
  show(id: string): {
    sourceRevision: number;
    task: PrincipalTask;
  };
  execute(command: LocalTaskCommand): TaskMutationResult;
}

interface LocalTaskControlDependencies {
  readonly list: typeof listPrincipalTasks;
  readonly show: typeof showPrincipalTask;
  readonly create: typeof createPrincipalTask;
  readonly assign: typeof assignPrincipalTask;
  readonly correct: typeof correctPrincipalTask;
  readonly linkExecution: typeof linkPrincipalTaskExecution;
  readonly rebindWorktree: typeof rebindPrincipalTaskWorktree;
  readonly submit: typeof submitPrincipalTaskResult;
  readonly review: typeof reviewPrincipalTaskResult;
  readonly accept: typeof acceptPrincipalTaskResult;
  readonly reopen: typeof reopenPrincipalTask;
}

const defaultDependencies: LocalTaskControlDependencies = {
  list: listPrincipalTasks,
  show: showPrincipalTask,
  create: createPrincipalTask,
  assign: assignPrincipalTask,
  correct: correctPrincipalTask,
  linkExecution: linkPrincipalTaskExecution,
  rebindWorktree: rebindPrincipalTaskWorktree,
  submit: submitPrincipalTaskResult,
  review: reviewPrincipalTaskResult,
  accept: acceptPrincipalTaskResult,
  reopen: reopenPrincipalTask,
};

export function createLocalTaskControlPlane(
  home: string | undefined,
  dependencies: LocalTaskControlDependencies = defaultDependencies,
): LocalTaskControlPlane {
  return {
    list() {
      return executeTaskOperation("source-unavailable", () => dependencies.list(home));
    },
    show(id) {
      return executeTaskOperation(
        "source-unavailable",
        () => dependencies.show(home, id),
      );
    },
    execute(command) {
      if (command.kind === "create") {
        return executeTaskOperation(
          "invalid-task",
          () => dependencies.create(home, command.arguments),
        );
      }
      if (command.kind === "assign") {
        return executeTaskOperation(
          "invalid-transition",
          () => dependencies.assign(home, command.arguments),
        );
      }
      if (command.kind === "correct") {
        return executeTaskOperation(
          "invalid-transition",
          () => dependencies.correct(home, command.arguments),
        );
      }
      if (command.kind === "link-execution") {
        return executeTaskOperation(
          "source-unavailable",
          () => dependencies.linkExecution(home, command.arguments),
        );
      }
      if (command.kind === "rebind-worktree") {
        return executeTaskOperation(
          "invalid-transition",
          () => dependencies.rebindWorktree(home, command.arguments),
        );
      }
      if (command.kind === "submit") {
        return executeTaskOperation(
          "invalid-transition",
          () => dependencies.submit(home, command.arguments),
        );
      }
      if (command.kind === "review") {
        return executeTaskOperation(
          "invalid-transition",
          () => dependencies.review(home, command.arguments),
        );
      }
      if (command.kind === "accept") {
        return executeTaskOperation(
          "invalid-transition",
          () => dependencies.accept(home, command.arguments),
        );
      }
      return executeTaskOperation(
        "invalid-transition",
        () => dependencies.reopen(home, command.arguments),
      );
    },
  };
}

function executeTaskOperation<Result>(
  fallback: LocalTaskControlErrorCode,
  operation: () => Result,
): Result {
  try {
    return operation();
  } catch (error: unknown) {
    if (error instanceof LocalTaskControlError) throw error;
    if (error instanceof StaleTaskRevisionError) {
      throw new LocalTaskControlError(
        error.code,
        error.message,
        { cause: error },
        error.recovery,
      );
    }
    if (error instanceof PrincipalTaskError) {
      throw new LocalTaskControlError(
        error.code,
        error.message,
        { cause: error },
      );
    }
    throw new LocalTaskControlError(
      fallback,
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  }
}
