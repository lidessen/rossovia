import { z } from "zod";
import {
  createLocalTaskControlPlane,
  LocalTaskControlError,
  type LocalTaskControlErrorCode,
  type LocalTaskControlPlane,
  type TaskMutationResult,
} from "../local-task-control-plane";

const nonempty = z.string().trim().min(1);
const actor = z.enum(["principal", "agent", "external"]);
const sourceRevision = z.number().int().nonnegative();
const taskRevision = z.number().int().positive();

export const TaskCreateRequestSchema = z.object({
  title: nonempty,
  objective: nonempty,
  acceptance: z.array(nonempty).min(1),
  nextActor: actor,
  expectedSourceRevision: sourceRevision,
  project: nonempty.optional(),
  worktree: nonempty.optional(),
  mission: nonempty.optional(),
}).strict();

const mutationExpectation = {
  expectedSourceRevision: sourceRevision,
  expectedRevision: taskRevision,
};

export const TaskMutationRequestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("link-execution"),
    authorizationId: z.string().uuid(),
    ...mutationExpectation,
  }).strict(),
  z.object({
    kind: z.literal("assign"),
    nextActor: actor,
    ...mutationExpectation,
  }).strict(),
  z.object({
    kind: z.literal("rebind-worktree"),
    expectedWorktreePath: nonempty,
    worktree: nonempty,
    ...mutationExpectation,
  }).strict(),
  z.object({
    kind: z.literal("correct"),
    statement: nonempty,
    nextActor: actor,
    ...mutationExpectation,
  }).strict(),
  z.object({
    kind: z.literal("submit"),
    summary: nonempty,
    evidenceRefs: z.array(nonempty).min(1),
    ...mutationExpectation,
  }).strict(),
  z.object({
    kind: z.literal("accept"),
    ...mutationExpectation,
  }).strict(),
  z.object({
    kind: z.literal("reopen"),
    statement: nonempty,
    nextActor: actor,
    ...mutationExpectation,
  }).strict(),
]);

export class TaskActionError extends Error {
  constructor(
    readonly status: number,
    readonly code:
      | "invalid-task"
      | "task-not-found"
      | "task-drift"
      | "invalid-transition"
      | "claim-mismatch"
      | "invalid-candidate"
      | "duplicate-review"
      | "source-unavailable",
    message: string,
  ) {
    super(message);
  }
}

export function executeTaskCreateAction(
  home: string | undefined,
  unparsed: unknown,
  controlPlane: LocalTaskControlPlane = createLocalTaskControlPlane(home),
): TaskMutationResult {
  const parsed = TaskCreateRequestSchema.safeParse(unparsed);
  if (!parsed.success) {
    throw new TaskActionError(
      400,
      "invalid-task",
      z.prettifyError(parsed.error),
    );
  }
  try {
    return controlPlane.execute({
      kind: "create",
      arguments: {
        title: parsed.data.title,
        objective: parsed.data.objective,
        acceptance: parsed.data.acceptance,
        nextActor: parsed.data.nextActor,
        expectedSourceRevision: parsed.data.expectedSourceRevision,
        sourceRef: "workbench-ui:unverified-local-interaction",
        ...(parsed.data.project === undefined
          ? {}
          : { project: parsed.data.project }),
        ...(parsed.data.worktree === undefined
          ? {}
          : { worktree: parsed.data.worktree }),
        ...(parsed.data.mission === undefined
          ? {}
          : { mission: parsed.data.mission }),
      },
    });
  } catch (error: unknown) {
    throw classifyTaskError(error);
  }
}

export function executeTaskMutationAction(
  home: string | undefined,
  id: string,
  unparsed: unknown,
  controlPlane: LocalTaskControlPlane = createLocalTaskControlPlane(home),
): TaskMutationResult {
  const normalizedId = id.trim();
  if (normalizedId.length === 0) {
    throw new TaskActionError(400, "invalid-task", "task id is required");
  }
  const parsed = TaskMutationRequestSchema.safeParse(unparsed);
  if (!parsed.success) {
    throw new TaskActionError(
      400,
      "invalid-task",
      z.prettifyError(parsed.error),
    );
  }
  const expectation = {
    id: normalizedId,
    expectedSourceRevision: parsed.data.expectedSourceRevision,
    expectedRevision: parsed.data.expectedRevision,
  };
  try {
    if (parsed.data.kind === "assign") {
      return controlPlane.execute({
        kind: "assign",
        arguments: {
          ...expectation,
          nextActor: parsed.data.nextActor,
        },
      });
    }
    if (parsed.data.kind === "correct") {
      return controlPlane.execute({
        kind: "correct",
        arguments: {
          ...expectation,
          statement: parsed.data.statement,
          nextActor: parsed.data.nextActor,
          sourceRef: "workbench-ui:unverified-local-interaction",
        },
      });
    }
    if (parsed.data.kind === "link-execution") {
      return controlPlane.execute({
        kind: "link-execution",
        arguments: {
          ...expectation,
          authorizationId: parsed.data.authorizationId,
          sourceRef: "workbench-ui:unverified-local-interaction",
        },
      });
    }
    if (parsed.data.kind === "rebind-worktree") {
      return controlPlane.execute({
        kind: "rebind-worktree",
        arguments: {
          ...expectation,
          expectedWorktreePath: parsed.data.expectedWorktreePath,
          worktree: parsed.data.worktree,
          sourceRef: "workbench-ui:unverified-local-interaction",
        },
      });
    }
    if (parsed.data.kind === "submit") {
      return controlPlane.execute({
        kind: "submit",
        arguments: {
          ...expectation,
          summary: parsed.data.summary,
          evidenceRefs: parsed.data.evidenceRefs,
          sourceRef: "workbench-ui:unverified-local-interaction",
        },
      });
    }
    if (parsed.data.kind === "accept") {
      return controlPlane.execute({
        kind: "accept",
        arguments: {
          ...expectation,
          sourceRef: "workbench-ui:unverified-local-interaction",
        },
      });
    }
    return controlPlane.execute({
      kind: "reopen",
      arguments: {
        ...expectation,
        statement: parsed.data.statement,
        nextActor: parsed.data.nextActor,
        sourceRef: "workbench-ui:unverified-local-interaction",
      },
    });
  } catch (error: unknown) {
    throw classifyTaskError(error);
  }
}

export function classifyTaskError(error: unknown): TaskActionError {
  if (error instanceof TaskActionError) return error;
  if (error instanceof LocalTaskControlError) {
    return new TaskActionError(
      taskErrorStatus(error.code),
      error.code,
      error.message,
    );
  }
  return new TaskActionError(
    500,
    "source-unavailable",
    error instanceof Error ? error.message : String(error),
  );
}

function taskErrorStatus(code: LocalTaskControlErrorCode): number {
  if (code === "invalid-task") return 400;
  if (code === "task-not-found") return 404;
  if (code === "source-unavailable") return 503;
  return 409;
}
