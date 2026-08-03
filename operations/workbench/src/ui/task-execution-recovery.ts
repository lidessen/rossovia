import { z } from "zod";
import type { LocalTaskControlPlane } from "../local-task-control-plane";
import {
  sameWorkbenchTaskExecutionContextRef,
  WorkbenchTaskExecutionContextRefSchema,
  type WorkbenchTaskExecutionContextRef,
} from "../task-execution-context";
import { executeWorkbenchAction, RunnerTargetSchema } from "./actions";
import type { AutonomyClient } from "./autonomy-client";
import { classifyTaskError, TaskActionError } from "./task-actions";
import type {
  WorkItemProjection,
  WorkItemSetProjection,
} from "./work-items";

const digest = z.string().regex(/^[0-9a-f]{64}$/);
const sourceRevision = z.number().int().nonnegative();
const taskRevision = z.number().int().positive();
const TaskExecutionRecoveryTargetSchema = RunnerTargetSchema.extend({
  expectedState: z.literal("interrupted"),
});
const TaskExecutionRecoveryTurnSchema = z.object({
  turnId: z.string().min(1),
  authorizationId: z.string().uuid(),
  proposalDigest: digest,
  claimSourceRef: z.string().min(1),
}).strict();

export const TaskExecutionRecoveryRequestSchema = z.object({
  kind: z.literal("recover-linked-execution"),
  authorizationId: z.string().uuid(),
  proposalDigest: digest,
  turn: TaskExecutionRecoveryTurnSchema,
  target: TaskExecutionRecoveryTargetSchema,
  command: z.literal("resume"),
  expectedSourceRevision: sourceRevision,
  expectedRevision: taskRevision,
}).strict();

const TaskExecutionRecoveryCandidateSchema = z.object({
  authorizationId: z.string().uuid(),
  proposalDigest: digest,
  turn: TaskExecutionRecoveryTurnSchema,
  target: TaskExecutionRecoveryTargetSchema,
  command: z.literal("resume"),
  evidenceRefs: z.array(z.string().min(1)).min(1),
}).strict();

export type TaskExecutionRecoveryRequest = z.infer<
  typeof TaskExecutionRecoveryRequestSchema
>;

export interface TaskExecutionRecoveryPlan {
  readonly taskId: string;
  readonly expectedSourceRevision: number;
  readonly expectedTaskRevision: number;
  readonly expectedWorktreePath: string;
  readonly taskContext: WorkbenchTaskExecutionContextRef;
  readonly authorizationId: string;
  readonly proposalDigest: string;
  readonly turn: z.infer<typeof TaskExecutionRecoveryTurnSchema>;
  readonly target: z.infer<typeof TaskExecutionRecoveryTargetSchema>;
  readonly command: "resume";
  readonly evidenceRefs: readonly string[];
}

/**
 * Bind interrupted-turn recovery to the task's latest exact execution. The
 * returned plan contains only the candidate rebuilt by the server.
 */
export function prepareTaskExecutionRecovery(
  workItems: WorkItemSetProjection,
  taskId: string,
  unparsed: unknown,
): TaskExecutionRecoveryPlan {
  const parsed = TaskExecutionRecoveryRequestSchema.safeParse(unparsed);
  if (!parsed.success) {
    throw new TaskActionError(
      400,
      "invalid-task",
      z.prettifyError(parsed.error),
    );
  }
  const request = parsed.data;
  const item = taskWorkItem(workItems.items, taskId);
  const detail = item.taskDetail!;
  const task = detail.task;
  if (
    detail.sourceRevision !== request.expectedSourceRevision
    || task.revision !== request.expectedRevision
  ) {
    throw new TaskActionError(
      409,
      "task-drift",
      `task ${taskId} changed before execution recovery`,
    );
  }

  const candidate = TaskExecutionRecoveryCandidateSchema.safeParse(
    detail.executionContext.recoveryCandidate,
  );
  if (!candidate.success) {
    throw new TaskActionError(
      409,
      "invalid-transition",
      `task ${taskId} has no exact interrupted execution available to recover`,
    );
  }
  const latestExecutionLink = task.executionLinks.at(-1);
  const expectedWorktreePath = task.binding.kind === "project-context"
    ? task.binding.worktreePath
    : undefined;
  if (
    latestExecutionLink?.taskContext === undefined
    || expectedWorktreePath === undefined
  ) {
    throw new TaskActionError(
      409,
      "invalid-transition",
      `task ${taskId} recovery requires exact task context and a current Worktree`,
    );
  }
  if (
    candidate.data.authorizationId !== request.authorizationId
    || candidate.data.proposalDigest !== request.proposalDigest
    || !sameTurn(candidate.data.turn, request.turn)
    || candidate.data.command !== request.command
    || candidate.data.target.missionId !== request.target.missionId
    || candidate.data.target.runnerId !== request.target.runnerId
    || candidate.data.target.expectedState !== request.target.expectedState
    || candidate.data.target.projectKey !== request.target.projectKey
  ) {
    throw new TaskActionError(
      409,
      "task-drift",
      `task ${taskId} execution recovery target changed after the action was formed`,
    );
  }

  return {
    taskId: task.id,
    expectedSourceRevision: detail.sourceRevision,
    expectedTaskRevision: task.revision,
    expectedWorktreePath,
    taskContext: latestExecutionLink.taskContext,
    authorizationId: candidate.data.authorizationId,
    proposalDigest: candidate.data.proposalDigest,
    turn: candidate.data.turn,
    target: candidate.data.target,
    command: candidate.data.command,
    evidenceRefs: candidate.data.evidenceRefs,
  };
}

export async function executeTaskExecutionRecovery(
  workItems: WorkItemSetProjection,
  taskId: string,
  unparsed: unknown,
  client: AutonomyClient,
  controlPlane: LocalTaskControlPlane,
): Promise<unknown> {
  const plan = prepareTaskExecutionRecovery(workItems, taskId, unparsed);
  return await executeWorkbenchAction({
    kind: "recovery",
    target: plan.target,
    command: plan.command,
  }, client, undefined, (activity) => {
    assertCurrentRecoveryTurn(activity, plan);
    assertCurrentRecoveryTask(controlPlane, plan);
  });
}

function assertCurrentRecoveryTurn(
  activity: unknown,
  plan: TaskExecutionRecoveryPlan,
): void {
  const parsed = z.object({
    currentTurn: z.object({
      turnId: z.string().min(1),
      launchAuthorizationRef: z.object({
        authorizationId: z.string().uuid(),
        proposalDigest: digest,
        claimSourceRef: z.string().min(1),
      }).strict(),
      workbenchTaskContext: WorkbenchTaskExecutionContextRefSchema,
    }).passthrough(),
  }).passthrough().safeParse(activity);
  const observed = parsed.success
    ? {
      turnId: parsed.data.currentTurn.turnId,
      ...parsed.data.currentTurn.launchAuthorizationRef,
      taskContext: parsed.data.currentTurn.workbenchTaskContext,
    }
    : null;
  if (
    observed === null
    || !sameTurn(observed, plan.turn)
    || !sameWorkbenchTaskExecutionContextRef(observed.taskContext, plan.taskContext)
  ) {
    throw new TaskActionError(
      409,
      "task-drift",
      `task ${plan.taskId} current turn changed before execution recovery`,
    );
  }
}

function assertCurrentRecoveryTask(
  controlPlane: LocalTaskControlPlane,
  plan: TaskExecutionRecoveryPlan,
): void {
  let observed: ReturnType<LocalTaskControlPlane["show"]>;
  try {
    observed = controlPlane.show(plan.taskId);
  } catch (error: unknown) {
    throw classifyTaskError(error);
  }
  const latestExecutionLink = observed.task.executionLinks.at(-1);
  const currentWorktreePath = observed.task.binding.kind === "project-context"
    ? observed.task.binding.worktreePath
    : undefined;
  if (
    observed.sourceRevision !== plan.expectedSourceRevision
    || observed.task.revision !== plan.expectedTaskRevision
    || currentWorktreePath !== plan.expectedWorktreePath
    || latestExecutionLink?.authorizationId !== plan.authorizationId
    || latestExecutionLink.proposalDigest !== plan.proposalDigest
    || latestExecutionLink.claimSourceRef !== plan.turn.claimSourceRef
    || latestExecutionLink.taskContext === undefined
    || !sameWorkbenchTaskExecutionContextRef(
      latestExecutionLink.taskContext,
      plan.taskContext,
    )
  ) {
    throw new TaskActionError(
      409,
      "task-drift",
      `task ${plan.taskId} source or Worktree changed before execution recovery`,
    );
  }
}

function sameTurn(
  left: z.infer<typeof TaskExecutionRecoveryTurnSchema>,
  right: z.infer<typeof TaskExecutionRecoveryTurnSchema>,
): boolean {
  return left.turnId === right.turnId
    && left.authorizationId === right.authorizationId
    && left.proposalDigest === right.proposalDigest
    && left.claimSourceRef === right.claimSourceRef;
}

function taskWorkItem(
  items: readonly WorkItemProjection[],
  taskId: string,
): WorkItemProjection {
  const item = items.find(
    (candidate) =>
      candidate.id === `principal-task:${taskId}`
      && candidate.kind === "principal-task"
      && candidate.taskDetail !== undefined,
  );
  if (item === undefined) {
    throw new TaskActionError(
      404,
      "task-not-found",
      `Principal task not found: ${taskId}`,
    );
  }
  return item;
}
