import { realpathSync } from "node:fs";
import { z } from "zod";
import {
  submitPrincipalTaskResult,
  type TaskMutationResult,
} from "../tasks";
import {
  createLocalTaskControlPlane,
  type LocalTaskControlPlane,
} from "../local-task-control-plane";
import {
  classifyTaskError,
  TaskActionError,
} from "./task-actions";
import {
  readStrictTaskAttemptEvidence,
} from "../task-attempts";
import { expandPath } from "../paths";
import { optionalGit } from "../workspace";
import type {
  AutonomyEffectVerificationSelector,
  OrdinaryAttemptResultSelector,
  PrincipalTask,
} from "../contracts";
import type {
  WorkItemProjection,
  WorkItemSetProjection,
} from "./work-items";

const sourceRevision = z.number().int().nonnegative();
const taskRevision = z.number().int().positive();

export const TaskVerifiedResultSelectorSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("autonomy-effect-verification.v1"),
    effectId: z.string().trim().min(1),
    verificationEventId: z.string().trim().min(1),
  }).strict(),
  z.object({
    kind: z.literal("ordinary-attempt-result.v1"),
    attemptId: z.string().uuid(),
    /** The exact bound Worktree HEAD the Principal's candidate observed. */
    expectedWorktreeHead: z.string().regex(/^[0-9a-f]{40}$/),
  }).strict(),
]);
export type TaskVerifiedResultSelector = z.infer<
  typeof TaskVerifiedResultSelectorSchema
>;

export const TaskVerifiedResultRequestSchema = z.object({
  kind: z.literal("submit-verified-execution"),
  summary: z.string().trim().min(1),
  authorizationId: z.string().uuid().optional(),
  selector: TaskVerifiedResultSelectorSchema,
  expectedSourceRevision: sourceRevision,
  expectedRevision: taskRevision,
}).strict().superRefine((request, context) => {
  if (request.selector.kind === "autonomy-effect-verification.v1") {
    if (request.authorizationId === undefined) {
      context.addIssue({
        code: "custom",
        path: ["authorizationId"],
        message: "an Autonomy effect selector requires its exact authorization id",
      });
    }
  } else if (request.authorizationId !== undefined) {
    context.addIssue({
      code: "custom",
      path: ["authorizationId"],
      message: "an ordinary attempt selector carries no execution authorization",
    });
  }
});

const TaskAcceptRequestSchema = z.object({
  kind: z.literal("accept"),
  expectedSourceRevision: sourceRevision,
  expectedRevision: taskRevision,
}).strict();

export function submitVerifiedTaskResult(
  home: string | undefined,
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
  if (request.selector.kind === "autonomy-effect-verification.v1") {
    const candidate = detail.executionContext.verifiedResultCandidate;
    if (
      candidate === null
      || request.authorizationId === undefined
      || candidate.authorizationId !== request.authorizationId
      || !sameAutonomySelector(candidate.selector, request.selector)
    ) {
      throw new TaskActionError(
        409,
        "task-drift",
        `task ${taskId} no longer has the requested current verified execution`,
      );
    }
    guardCurrentRevisions(detail, request);
    try {
      return submitPrincipalTaskResult(home, {
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
      });
    } catch (error: unknown) {
      throw classifyResultError(error, "submit");
    }
  }

  const candidate = detail.executionContext.attemptResultCandidate;
  if (
    candidate === null
    || !sameAttemptSelector(candidate.selector, request.selector)
  ) {
    throw new TaskActionError(
      409,
      "task-drift",
      `task ${taskId} no longer has the requested current verified attempt`,
    );
  }
  if (candidate.worktree.head !== request.selector.expectedWorktreeHead) {
    throw new TaskActionError(
      409,
      "task-drift",
      `task ${taskId} bound Worktree HEAD changed before verified result submission`,
    );
  }
  guardCurrentRevisions(detail, request);
  // Re-verify the exact attempt selector against its canonical owners
  // immediately before the claim mutation: the strict attempt evidence
  // family must still bind this Task at its current revision, record a
  // passed run with passing checks, and sit on the exact bound Worktree at
  // the exact expected HEAD. Stopped, failed, stale, malformed, or
  // unavailable evidence fails closed with no claim.
  const evidence = verifyOrdinaryAttemptEvidence(
    home,
    detail.task,
    request.selector,
  );
  try {
    return submitPrincipalTaskResult(home, {
      id: taskId,
      summary: request.summary,
      evidenceRefs: [...evidence.evidenceRefs],
      evidence: {
        kind: "runtime-verified-attempt",
        selector: {
          kind: "ordinary-attempt-result.v1",
          attemptId: request.selector.attemptId,
        },
        taskRevision: detail.task.revision,
        worktreeHead: request.selector.expectedWorktreeHead,
      },
      sourceRef: "workbench-ui:runtime-verified-attempt",
      expectedSourceRevision: request.expectedSourceRevision,
      expectedRevision: request.expectedRevision,
    });
  } catch (error: unknown) {
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
          && detail.latestResultVerification.selector.kind
            === "autonomy-effect-verification.v1"
          && sameAutonomySelector(
            claim.evidence.selector,
            detail.latestResultVerification.selector,
          )
        ? detail.latestResultVerification.selector
        : null
      : claim.evidence.kind === "runtime-verified-attempt"
        ? detail.latestResultVerification.standing === "verified-current"
            && detail.latestResultVerification.selector.kind
              === "ordinary-attempt-result.v1"
            && claim.evidence.selector.attemptId
              === detail.latestResultVerification.selector.attemptId
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

function sameAutonomySelector(
  left: AutonomyEffectVerificationSelector,
  right: AutonomyEffectVerificationSelector,
): boolean {
  return left.kind === right.kind
    && left.effectId === right.effectId
    && left.verificationEventId === right.verificationEventId;
}

function sameAttemptSelector(
  left: OrdinaryAttemptResultSelector,
  right: Extract<TaskVerifiedResultSelector, { kind: "ordinary-attempt-result.v1" }>,
): boolean {
  return left.kind === right.kind && left.attemptId === right.attemptId;
}

function guardCurrentRevisions(
  detail: NonNullable<WorkItemProjection["taskDetail"]>,
  request: { readonly expectedSourceRevision: number; readonly expectedRevision: number },
): void {
  if (
    detail.sourceRevision !== request.expectedSourceRevision
    || detail.task.revision !== request.expectedRevision
  ) {
    throw new TaskActionError(
      409,
      "task-drift",
      `task ${detail.task.id} changed before verified result submission`,
    );
  }
}

/**
 * Re-verify one ordinary attempt selector against its canonical owners
 * immediately before the claim mutation. The strict attempt evidence family
 * (immutable attempt record, CellInput, Work Cell final record, settlement)
 * must be fully available, belong to this exact Task at its current
 * revision, record a passed run with overall and terminal verification, bind
 * the Task's current bound Worktree, and the Worktree's current HEAD must
 * equal the exact HEAD the Principal's selector observed. Nothing here
 * copies runtime truth into the claim; the stable evidence refs returned
 * are the canonical owner refs.
 */
function verifyOrdinaryAttemptEvidence(
  home: string | undefined,
  task: PrincipalTask,
  selector: Extract<TaskVerifiedResultSelector, { kind: "ordinary-attempt-result.v1" }>,
): { evidenceRefs: string[] } {
  const evidence = readStrictTaskAttemptEvidence(home, selector.attemptId);
  if (evidence.standing !== "available") {
    throw new TaskActionError(
      409,
      "task-drift",
      `attempt ${selector.attemptId} evidence is no longer available for verified result submission: ${evidence.error ?? evidence.standing}`,
    );
  }
  const attempt = evidence.attempt;
  const input = evidence.input;
  const final = evidence.finalRecord;
  const settlement = evidence.settlement;
  if (
    attempt === undefined
    || input === undefined
    || final === undefined
    || settlement === undefined
  ) {
    throw new TaskActionError(
      409,
      "task-drift",
      `attempt ${selector.attemptId} evidence family is incomplete for verified result submission`,
    );
  }
  if (attempt.taskId !== task.id || attempt.taskRevision !== task.revision) {
    throw new TaskActionError(
      409,
      "task-drift",
      `attempt ${selector.attemptId} no longer belongs to task ${task.id} at its current revision ${task.revision}`,
    );
  }
  if (
    settlement.status !== "recorded"
    || settlement.workCellRunId !== final.runId
    || settlement.cellStatus !== final.status
    || final.status !== "passed"
    || final.verification.passed !== true
    || final.verification.terminal.passed !== true
  ) {
    throw new TaskActionError(
      409,
      "task-drift",
      `attempt ${selector.attemptId} is no longer a recorded passed verified run`,
    );
  }
  if (
    task.binding.kind !== "project-context"
    || task.binding.worktreePath === undefined
  ) {
    throw new TaskActionError(
      409,
      "task-drift",
      `task ${task.id} is no longer bound to an exact Worktree for verified result submission`,
    );
  }
  let inputRoot: string;
  let boundRoot: string;
  try {
    inputRoot = realpathSync(expandPath(input.workspace.root));
    boundRoot = realpathSync(expandPath(task.binding.worktreePath));
  } catch {
    throw new TaskActionError(
      409,
      "task-drift",
      `the attempt's Work Cell workspace cannot be related to the task's current bound Worktree`,
    );
  }
  if (inputRoot !== boundRoot) {
    throw new TaskActionError(
      409,
      "task-drift",
      `the attempt's Work Cell workspace does not match the task's current bound Worktree`,
    );
  }
  let head: string | null;
  try {
    head = optionalGit(["rev-parse", "HEAD"], inputRoot);
  } catch {
    head = null;
  }
  if (head === null || head !== selector.expectedWorktreeHead) {
    throw new TaskActionError(
      409,
      "task-drift",
      `the bound Worktree HEAD changed before verified result submission: expected ${selector.expectedWorktreeHead}, current ${head ?? "unavailable"}`,
    );
  }
  return {
    evidenceRefs: [
      evidence.refs.inputRef,
      evidence.refs.attemptRef,
      evidence.refs.finalRecordRef,
      evidence.refs.settlementRef,
    ],
  };
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
