import { z } from "zod";
import {
  createLocalTaskControlPlane,
  LocalTaskControlError,
  type LocalTaskControlPlane,
  type TaskMutationResult,
} from "../local-task-control-plane";
import {
  classifyTaskError,
  TaskActionError,
} from "./task-actions";
import type {
  WorkItemProjection,
  WorkItemSetProjection,
} from "./work-items";

const sourceRevision = z.number().int().nonnegative();
const taskRevision = z.number().int().positive();

export const TaskVerifiedResultRequestSchema = z.object({
  kind: z.literal("submit-verified-execution"),
  summary: z.string().trim().min(1),
  authorizationId: z.string().uuid(),
  selector: z.object({
    kind: z.literal("autonomy-effect-verification.v1"),
    effectId: z.string().trim().min(1),
    verificationEventId: z.string().trim().min(1),
  }).strict(),
  expectedSourceRevision: sourceRevision,
  expectedRevision: taskRevision,
}).strict();

const TaskAcceptRequestSchema = z.object({
  kind: z.literal("accept"),
  expectedSourceRevision: sourceRevision,
  expectedRevision: taskRevision,
}).strict();

export function submitVerifiedTaskResult(
  controlPlane: LocalTaskControlPlane,
  workItems: WorkItemSetProjection,
  taskId: string,
  unparsed: unknown,
): TaskMutationResult {
  const request = parseRequest(
    TaskVerifiedResultRequestSchema,
    unparsed,
    "runtime-verified task result",
  );
  const item = taskWorkItem(workItems.items, taskId);
  const detail = item.taskDetail!;
  const candidate = detail.executionContext.verifiedResultCandidate;
  if (
    candidate === null
    || candidate.authorizationId !== request.authorizationId
    || !sameSelector(candidate.selector, request.selector)
  ) {
    throw new TaskActionError(
      409,
      "task-drift",
      `task ${taskId} no longer has the requested current verified execution`,
    );
  }
  if (
    detail.sourceRevision !== request.expectedSourceRevision
    || detail.task.revision !== request.expectedRevision
  ) {
    throw new TaskActionError(
      409,
      "task-drift",
      `task ${taskId} changed before verified result submission`,
    );
  }
  try {
    return controlPlane.execute({
      kind: "submit",
      arguments: {
        id: taskId,
        summary: request.summary,
        evidenceRefs: [...candidate.evidenceRefs],
        evidence: {
          kind: "runtime-verified-effect",
          authorizationId: candidate.authorizationId,
          selector: candidate.selector,
        },
        sourceRef: "workbench-ui:runtime-verified-effect",
        expectedSourceRevision: request.expectedSourceRevision,
        expectedRevision: request.expectedRevision,
      },
    });
  } catch (error: unknown) {
    if (error instanceof LocalTaskControlError) throw classifyTaskError(error);
    throw classifyResultError(error, "submit");
  }
}

export function acceptTaskResult(
  home: string | undefined,
  workItems: WorkItemSetProjection,
  taskId: string,
  unparsed: unknown,
  controlPlane: LocalTaskControlPlane = createLocalTaskControlPlane(home),
): TaskMutationResult {
  const request = parseRequest(
    TaskAcceptRequestSchema,
    unparsed,
    "task result acceptance",
  );
  const item = taskWorkItem(workItems.items, taskId);
  const detail = item.taskDetail!;
  if (
    detail.sourceRevision !== request.expectedSourceRevision
    || detail.task.revision !== request.expectedRevision
  ) {
    throw new TaskActionError(
      409,
      "task-drift",
      `task ${taskId} changed before result acceptance`,
    );
  }
  const claim = detail.task.resultClaims.find(
    (candidate) => candidate.standing === "submitted",
  );
  if (claim === undefined) {
    throw new TaskActionError(
      409,
      "invalid-transition",
      `task ${taskId} has no submitted result claim`,
    );
  }
  const runtimeVerificationSelector =
    claim.evidence.kind === "runtime-verified-effect"
      ? detail.latestResultVerification.standing === "verified-current"
          && sameSelector(
            claim.evidence.selector,
            detail.latestResultVerification.selector,
          )
        ? detail.latestResultVerification.selector
        : null
      : undefined;
  if (runtimeVerificationSelector === null) {
    throw new TaskActionError(
      409,
      "task-drift",
      `task ${taskId} runtime verification is no longer current; correct or resubmit the result`,
    );
  }
  try {
    return controlPlane.execute({
      kind: "accept",
      arguments: {
        id: taskId,
        sourceRef: "workbench-ui:unverified-local-interaction",
        expectedSourceRevision: request.expectedSourceRevision,
        expectedRevision: request.expectedRevision,
        ...(runtimeVerificationSelector === undefined
          ? {}
          : { runtimeVerificationSelector }),
      },
    });
  } catch (error: unknown) {
    throw classifyTaskError(error);
  }
}

function parseRequest<T>(
  schema: z.ZodType<T>,
  unparsed: unknown,
  label: string,
): T {
  const parsed = schema.safeParse(unparsed);
  if (!parsed.success) {
    throw new TaskActionError(
      400,
      "invalid-task",
      `${label}: ${z.prettifyError(parsed.error)}`,
    );
  }
  return parsed.data;
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

function sameSelector(
  left: {
    readonly kind: "autonomy-effect-verification.v1";
    readonly effectId: string;
    readonly verificationEventId: string;
  },
  right: {
    readonly kind: "autonomy-effect-verification.v1";
    readonly effectId: string;
    readonly verificationEventId: string;
  },
): boolean {
  return left.kind === right.kind
    && left.effectId === right.effectId
    && left.verificationEventId === right.verificationEventId;
}

function classifyResultError(
  error: unknown,
  action: "submit" | "accept",
): TaskActionError {
  if (error instanceof TaskActionError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes("source revision is stale")
    || message.includes("task revision is stale")
  ) {
    return new TaskActionError(409, "task-drift", message);
  }
  if (
    error instanceof SyntaxError
    || error instanceof z.ZodError
    || message.includes("required rossovia workbench source not found")
    || message.includes("cannot persist Rossovia state")
  ) {
    return new TaskActionError(503, "source-unavailable", message);
  }
  return new TaskActionError(
    409,
    "invalid-transition",
    `cannot ${action} task result: ${message}`,
  );
}
