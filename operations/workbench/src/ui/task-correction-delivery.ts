import { z } from "zod";
import { MissionInputReceiptSchema } from "../../../autonomy/src/mission-input";
import type { PrincipalTask } from "../contracts";
import {
  recordPrincipalTaskCorrectionDelivery,
  type TaskMutationResult,
} from "../tasks";
import {
  RunnerTargetSchema,
  type ContributionAttribution,
  type RunnerTarget,
} from "./actions";
import { TaskActionError } from "./task-actions";
import type {
  WorkItemProjection,
  WorkItemSetProjection,
} from "./work-items";

const sourceRevision = z.number().int().nonnegative();
const taskRevision = z.number().int().positive();

export const TaskCorrectionDeliveryRequestSchema = z.object({
  kind: z.literal("deliver-correction"),
  correctionId: z.string().uuid(),
  authorizationId: z.string().uuid(),
  target: RunnerTargetSchema,
  expectedSourceRevision: sourceRevision,
  expectedRevision: taskRevision,
}).strict();

export type TaskCorrectionDeliveryRequest = z.infer<
  typeof TaskCorrectionDeliveryRequestSchema
>;

export interface TaskCorrectionDeliveryPlan {
  readonly taskId: string;
  readonly correction: PrincipalTask["corrections"][number];
  readonly executionLink: PrincipalTask["executionLinks"][number];
  readonly target: RunnerTarget;
  readonly attribution: ContributionAttribution;
  readonly expectedSourceRevision: number;
  readonly expectedRevision: number;
  readonly retainedResult: TaskMutationResult | null;
}

export function prepareTaskCorrectionDelivery(
  workItems: WorkItemSetProjection,
  taskId: string,
  unparsed: unknown,
): TaskCorrectionDeliveryPlan {
  const parsed = TaskCorrectionDeliveryRequestSchema.safeParse(unparsed);
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
  if (task.lifecycle === "settled" || task.lifecycle === "verifying") {
    throw new TaskActionError(
      409,
      "invalid-transition",
      `task ${taskId} is ${task.lifecycle}; correction delivery applies only while work remains active`,
    );
  }
  const correction = task.corrections.find(
    (candidate) => candidate.id === request.correctionId,
  );
  if (correction === undefined) {
    throw new TaskActionError(
      404,
      "task-not-found",
      `Principal task correction not found: ${request.correctionId}`,
    );
  }
  const executionLink = detail.executionContext.latestLink;
  if (
    executionLink === null
    || executionLink.authorizationId !== request.authorizationId
  ) {
    throw new TaskActionError(
      409,
      "invalid-transition",
      `task ${taskId} correction delivery is not bound to its latest execution link`,
    );
  }
  const inputId = `task:${task.id}:correction:${correction.id}:authorization:${executionLink.authorizationId}`;
  const retainedDelivery = correction.deliveries.find(
    (delivery) => delivery.inputId === inputId,
  );
  if (retainedDelivery !== undefined) {
    if (
      retainedDelivery.authorizationId !== executionLink.authorizationId
      || retainedDelivery.proposalDigest !== executionLink.proposalDigest
      || retainedDelivery.claimSourceRef !== executionLink.claimSourceRef
      || retainedDelivery.missionId !== request.target.missionId
      || retainedDelivery.deliveredViaRunnerId !== request.target.runnerId
      || (
        item.projectKey !== null
        && request.target.projectKey !== item.projectKey
      )
    ) {
      throw new TaskActionError(
        409,
        "task-drift",
        `task ${taskId} retained correction delivery does not match the requested runner target`,
      );
    }
    return {
      taskId: task.id,
      correction,
      executionLink,
      target: request.target,
      attribution: {
        inputId,
        actorRef: "principal:local-workbench",
        sourceRef: `workbench-task:${task.id}/correction:${correction.id}`,
      },
      expectedSourceRevision: detail.sourceRevision,
      expectedRevision: task.revision,
      retainedResult: {
        sourceRevision: detail.sourceRevision,
        task,
      },
    };
  }
  if (
    detail.sourceRevision !== request.expectedSourceRevision
    || task.revision !== request.expectedRevision
  ) {
    throw new TaskActionError(
      409,
      "task-drift",
      `task ${taskId} changed before correction delivery`,
    );
  }
  if (detail.executionContext.currentTurn.standing !== "exact") {
    throw new TaskActionError(
      409,
      "invalid-transition",
      `task ${taskId} current Mission turn is not exact for correction delivery`,
    );
  }
  const carrier = detail.missionContext.currentCarrier;
  if (
    carrier === null
    || carrier.live !== true
    || carrier.runnerId === null
    || carrier.state === null
    || carrier.runnerId !== request.target.runnerId
    || carrier.state !== request.target.expectedState
    || detail.missionContext.missionId !== request.target.missionId
  ) {
    throw new TaskActionError(
      409,
      "task-drift",
      `task ${taskId} current runner target changed before correction delivery`,
    );
  }
  if (
    item.projectKey !== null
    && request.target.projectKey !== item.projectKey
  ) {
    throw new TaskActionError(
      409,
      "task-drift",
      `task ${taskId} runner project binding changed before correction delivery`,
    );
  }

  return {
    taskId: task.id,
    correction,
    executionLink,
    target: request.target,
    attribution: {
      inputId,
      actorRef: "principal:local-workbench",
      sourceRef: `workbench-task:${task.id}/correction:${correction.id}`,
    },
    expectedSourceRevision: request.expectedSourceRevision,
    expectedRevision: request.expectedRevision,
    retainedResult: null,
  };
}

export function recordTaskCorrectionDelivery(
  home: string | undefined,
  plan: TaskCorrectionDeliveryPlan,
  unparsedRunnerResult: unknown,
): TaskMutationResult {
  const parsed = z.object({
    receipt: MissionInputReceiptSchema,
  }).passthrough().safeParse(unparsedRunnerResult);
  if (!parsed.success) {
    throw new TaskActionError(
      502,
      "source-unavailable",
      `Mission runner returned invalid correction delivery evidence: ${
        z.prettifyError(parsed.error)
      }`,
    );
  }
  const receipt = parsed.data.receipt;
  if (
    receipt.inputId !== plan.attribution.inputId
    || receipt.actorRef !== plan.attribution.actorRef
    || receipt.sourceRef !== plan.attribution.sourceRef
    || receipt.payload.kind !== "contribution"
    || receipt.payload.text !== plan.correction.statement
  ) {
    throw new TaskActionError(
      502,
      "source-unavailable",
      "Mission runner returned correction delivery evidence that does not match the requested task correction",
    );
  }
  try {
    return recordPrincipalTaskCorrectionDelivery(home, {
      id: plan.taskId,
      correctionId: plan.correction.id,
      authorizationId: plan.executionLink.authorizationId,
      proposalDigest: plan.executionLink.proposalDigest,
      claimSourceRef: plan.executionLink.claimSourceRef,
      missionId: plan.target.missionId,
      inputId: receipt.inputId,
      inputEventId: receipt.eventId,
      inputWatermark: receipt.watermark,
      payloadDigest: receipt.payloadDigest,
      recordedAt: receipt.at,
      sourceRef: plan.attribution.sourceRef,
      deliveredViaRunnerId: plan.target.runnerId,
      expectedSourceRevision: plan.expectedSourceRevision,
      expectedRevision: plan.expectedRevision,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      error instanceof SyntaxError
      || error instanceof z.ZodError
      || message.includes("required rossovia workbench source not found")
      || message.includes("cannot persist Rossovia state")
    ) {
      throw new TaskActionError(503, "source-unavailable", message);
    }
    throw new TaskActionError(409, "invalid-transition", message);
  }
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
