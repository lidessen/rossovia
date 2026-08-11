import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { z } from "zod";
import {
  MissionAnchorSeedSchema,
  type MissionAnchorSeed,
} from "../../../autonomy/src/mission-anchor";
import {
  ExecutionAuthorizationReceiptSchema,
  inspectExecution,
  type ExecutionAuthorizationReceipt,
} from "../execution-authorization";
import {
  linkPrincipalTaskExecution,
  showPrincipalTask,
  type TaskMutationResult,
} from "../tasks";
import { observeWorkspace } from "../workspace";
import type {
  AutonomyClient,
  TrustedRunnerStart,
} from "./autonomy-client";
import type {
  WorkItemProjection,
  WorkItemSetProjection,
} from "./work-items";
import { WorkbenchRunnerActivityProjectionSchema } from "./projection";
import {
  WORKBENCH_TASK_EXECUTION_CONTEXT_ENV,
  WorkbenchTaskExecutionContextSchema,
  workbenchTaskExecutionContextDigest,
  workbenchTaskExecutionContextFor,
} from "./task-execution-context";
import {
  trustedTaskExecutionRuntimeAdapterFor,
  type TaskExecutionRuntimeAdapterId,
} from "./task-execution-runtime-adapter";

export { WORKBENCH_TASK_EXECUTION_CONTEXT_ENV } from "./task-execution-context";
export {
  AGENT_ERA_BLOG_PUBLICATION_ADAPTER_ID,
} from "./task-execution-runtime-adapter";

const digest = z.string().regex(/^[0-9a-f]{64}$/);
const absolutePath = z.string().min(1).refine(isAbsolute, "must be an absolute path");

export const TaskExecutionLaunchRequestSchema = z.object({
  kind: z.literal("launch-authorized-execution"),
  authorizationId: z.string().uuid(),
  proposalDigest: digest,
  expectedSourceRevision: z.number().int().nonnegative(),
  expectedRevision: z.number().int().positive(),
}).strict();

const TaskExecutionLaunchCandidateSchema = z.object({
  authorizationId: z.string().uuid(),
  proposalDigest: digest,
  runtimeAdapterId: z.string().min(1),
  anchorSeed: MissionAnchorSeedSchema,
  worktreePath: absolutePath,
  receiptPath: absolutePath,
  runtimeRef: z.string().min(1),
  runtimeDigest: digest,
  evidenceRefs: z.array(z.string().min(1)).min(1),
}).strict();

const TaskExecutionLinkCandidateSchema = z.object({
  authorizationId: z.string().uuid(),
  proposalDigest: digest,
  evidenceRefs: z.array(z.string().min(1)).min(1),
}).strict();

export type TaskExecutionLaunchRequest = z.infer<
  typeof TaskExecutionLaunchRequestSchema
>;
export type TaskExecutionLaunchCandidate = z.infer<
  typeof TaskExecutionLaunchCandidateSchema
>;

export type TaskExecutionLaunchPlan =
  | {
    readonly kind: "start";
    readonly taskId: string;
    readonly projectId: string;
    readonly expectedSourceRevision: number;
    readonly expectedTaskRevision: number;
    readonly authorizationId: string;
    readonly proposalDigest: string;
    readonly adapterId: TaskExecutionRuntimeAdapterId;
    readonly anchorSeed: MissionAnchorSeed;
    readonly worktreePath: string;
    readonly receiptPath: string;
    readonly runtimeRef: string;
    readonly runtimeDigest: string;
    readonly start: TrustedRunnerStart;
    readonly evidenceRefs: readonly string[];
  }
  | {
    readonly kind: "link-only";
    readonly taskId: string;
    readonly authorizationId: string;
    readonly proposalDigest: string;
    readonly evidenceRefs: readonly string[];
  }
  | {
    readonly kind: "already-linked";
    readonly result: TaskMutationResult;
  };

export type TaskExecutionLaunchResult =
  | {
    readonly standing: "launch-started-awaiting-consumption";
    readonly authorizationId: string;
    readonly proposalDigest: string;
    readonly adapterId: TaskExecutionRuntimeAdapterId;
    readonly runner: unknown;
    readonly evidenceRefs: readonly string[];
  }
  | {
    readonly standing: "execution-linked";
    readonly result: TaskMutationResult;
  }
  | {
    readonly standing: "execution-already-linked";
    readonly result: TaskMutationResult;
  };

export interface TaskExecutionLaunchDependencies {
  readonly linkExecution: typeof linkPrincipalTaskExecution;
  readonly showTask: typeof showPrincipalTask;
  readonly inspectExecution: typeof inspectExecution;
  readonly readReceipt: (receiptPath: string) => ExecutionAuthorizationReceipt;
  readonly observeWorktree: (worktreePath: string) => ReturnType<typeof observeWorkspace>;
}

export class TaskExecutionLaunchError extends Error {
  constructor(
    readonly status: 400 | 404 | 409 | 503,
    readonly code:
      | "invalid-launch"
      | "task-not-found"
      | "task-drift"
      | "launch-unavailable"
      | "unsupported-runtime"
      | "launch-failed",
    message: string,
  ) {
    super(message);
  }
}

/**
 * Form one task launch solely from the current server projection. Runtime and
 * environment paths never come from the browser request.
 */
export function prepareTaskExecutionLaunch(
  home: string,
  workItems: WorkItemSetProjection,
  taskId: string,
  unparsedRequest: unknown,
): TaskExecutionLaunchPlan {
  const parsed = TaskExecutionLaunchRequestSchema.safeParse(unparsedRequest);
  if (!parsed.success) {
    throw new TaskExecutionLaunchError(
      400,
      "invalid-launch",
      z.prettifyError(parsed.error),
    );
  }
  const request = parsed.data;
  const item = taskWorkItem(workItems.items, taskId);
  const detail = item.taskDetail!;
  const task = detail.task;

  const retainedLink = task.executionLinks.find(
    (link) =>
      link.authorizationId === request.authorizationId
      && link.proposalDigest === request.proposalDigest,
  );
  if (retainedLink !== undefined) {
    return {
      kind: "already-linked",
      result: {
        sourceRevision: detail.sourceRevision,
        task,
      },
    };
  }

  if (
    detail.sourceRevision !== request.expectedSourceRevision
    || task.revision !== request.expectedRevision
  ) {
    throw new TaskExecutionLaunchError(
      409,
      "task-drift",
      `task ${task.id} or its source changed after the launch action was formed`,
    );
  }
  if (
    task.binding.kind !== "project-context"
    || task.binding.missionId === undefined
    || task.binding.worktreePath === undefined
  ) {
    throw new TaskExecutionLaunchError(
      409,
      "launch-unavailable",
      `task ${task.id} requires exact project, Mission, and Worktree context before launch`,
    );
  }
  if (
    task.lifecycle === "settled"
    || task.lifecycle === "verifying"
    || task.nextActor !== "agent"
  ) {
    throw new TaskExecutionLaunchError(
      409,
      "launch-unavailable",
      `task ${task.id} is ${task.lifecycle} with next actor ${task.nextActor}; launch requires active Agent-owned work`,
    );
  }

  const executionContext = detail.executionContext as unknown as Record<
    string,
    unknown
  >;
  const linkCandidate = TaskExecutionLinkCandidateSchema.safeParse(
    executionContext.linkCandidate,
  );
  if (linkCandidate.success) {
    assertRequestedSelector(request, linkCandidate.data);
    return {
      kind: "link-only",
      taskId: task.id,
      authorizationId: linkCandidate.data.authorizationId,
      proposalDigest: linkCandidate.data.proposalDigest,
      evidenceRefs: linkCandidate.data.evidenceRefs,
    };
  }

  const launchCandidate = TaskExecutionLaunchCandidateSchema.safeParse(
    executionContext.launchCandidate,
  );
  if (!launchCandidate.success) {
    throw new TaskExecutionLaunchError(
      409,
      "launch-unavailable",
      `task ${task.id} has no current authorized execution available to start or link`,
    );
  }
  assertRequestedSelector(request, launchCandidate.data);
  if (launchCandidate.data.worktreePath !== task.binding.worktreePath) {
    throw new TaskExecutionLaunchError(
      409,
      "task-drift",
      "the launch candidate Worktree no longer matches the task Worktree context",
    );
  }
  if (launchCandidate.data.anchorSeed.missionId !== task.binding.missionId) {
    throw new TaskExecutionLaunchError(
      409,
      "task-drift",
      "the launch anchor no longer matches the task Mission context",
    );
  }
  assertReceiptOwnedByHome(home, launchCandidate.data.receiptPath);
  const runtimeAdapter = trustedTaskExecutionRuntimeAdapterFor(
    launchCandidate.data.runtimeRef,
  );
  if (
    runtimeAdapter === null
    || runtimeAdapter.id !== launchCandidate.data.runtimeAdapterId
  ) {
    throw new TaskExecutionLaunchError(
      409,
      "unsupported-runtime",
      "the launch candidate does not select one exact trusted runtime adapter",
    );
  }
  assertRuntimeDigest(
    launchCandidate.data.runtimeDigest,
    runtimeAdapter.runtimeModule,
  );

  return {
    kind: "start",
    taskId: task.id,
    projectId: task.binding.projectId,
    expectedSourceRevision: detail.sourceRevision,
    expectedTaskRevision: task.revision,
    authorizationId: launchCandidate.data.authorizationId,
    proposalDigest: launchCandidate.data.proposalDigest,
    adapterId: runtimeAdapter.id,
    anchorSeed: launchCandidate.data.anchorSeed,
    worktreePath: launchCandidate.data.worktreePath,
    receiptPath: launchCandidate.data.receiptPath,
    runtimeRef: launchCandidate.data.runtimeRef,
    runtimeDigest: launchCandidate.data.runtimeDigest,
    start: {
      adapterId: runtimeAdapter.id,
      missionId: task.binding.missionId,
      runtimeModule: runtimeAdapter.runtimeModule,
      environment: {
        ...runtimeAdapter.environment({
          worktreePath: launchCandidate.data.worktreePath,
          receiptPath: launchCandidate.data.receiptPath,
        }),
        [WORKBENCH_TASK_EXECUTION_CONTEXT_ENV]: JSON.stringify(
          workbenchTaskExecutionContextFor(task, {
            authorizationId: launchCandidate.data.authorizationId,
            proposalDigest: launchCandidate.data.proposalDigest,
          }),
        ),
      },
    },
    evidenceRefs: launchCandidate.data.evidenceRefs,
  };
}

/**
 * Start once, or link a consumption claim observed on a later retry. A start
 * never fabricates the claim required by the existing task-link mutation.
 */
export async function executeTaskExecutionLaunch(
  home: string,
  workItems: WorkItemSetProjection,
  taskId: string,
  unparsedRequest: unknown,
  client: AutonomyClient,
  dependencies: Partial<TaskExecutionLaunchDependencies> = {},
): Promise<TaskExecutionLaunchResult> {
  const activeDependencies: TaskExecutionLaunchDependencies = {
    linkExecution: linkPrincipalTaskExecution,
    showTask: showPrincipalTask,
    inspectExecution,
    readReceipt: readExecutionAuthorizationReceipt,
    observeWorktree: (worktreePath) => observeWorkspace(
      { id: null, repository: null },
      { path: worktreePath },
    ),
    ...dependencies,
  };
  const plan = prepareTaskExecutionLaunch(
    home,
    workItems,
    taskId,
    unparsedRequest,
  );
  if (plan.kind === "already-linked") {
    return {
      standing: "execution-already-linked",
      result: plan.result,
    };
  }
  const request = TaskExecutionLaunchRequestSchema.parse(unparsedRequest);
  if (plan.kind === "link-only") {
    try {
      return {
        standing: "execution-linked",
        result: activeDependencies.linkExecution(home, {
          id: plan.taskId,
          authorizationId: plan.authorizationId,
          sourceRef: "workbench-ui:launch-authorized-execution",
          expectedSourceRevision: request.expectedSourceRevision,
          expectedRevision: request.expectedRevision,
        }),
      };
    } catch (error: unknown) {
      throw reclassifyMutationFailure(error);
    }
  }
  try {
    if (client.start === undefined) {
      throw new TaskExecutionLaunchError(
        503,
        "unsupported-runtime",
        "the selected Autonomy client cannot start a trusted runner",
      );
    }
    const start = await trustedStartForCurrentAnchor(plan, client);
    assertCurrentLaunchSources(home, plan, activeDependencies);
    const runner = await client.start(start);
    return {
      standing: "launch-started-awaiting-consumption",
      authorizationId: plan.authorizationId,
      proposalDigest: plan.proposalDigest,
      adapterId: plan.adapterId,
      runner,
      evidenceRefs: plan.evidenceRefs,
    };
  } catch (error: unknown) {
    if (error instanceof TaskExecutionLaunchError) throw error;
    throw new TaskExecutionLaunchError(
      503,
      "launch-failed",
      error instanceof Error ? error.message : String(error),
    );
  }
}

function assertCurrentLaunchSources(
  home: string,
  plan: Extract<TaskExecutionLaunchPlan, { readonly kind: "start" }>,
  dependencies: TaskExecutionLaunchDependencies,
): void {
  let observedTask: ReturnType<typeof showPrincipalTask>;
  let observedExecution: ReturnType<typeof inspectExecution>;
  let observedReceipt: ExecutionAuthorizationReceipt;
  let observedWorktree: ReturnType<typeof observeWorkspace>;
  try {
    observedTask = dependencies.showTask(home, plan.taskId);
    observedExecution = dependencies.inspectExecution(
      home,
      plan.projectId,
      plan.start.missionId,
    );
    observedReceipt = dependencies.readReceipt(plan.receiptPath);
    observedWorktree = dependencies.observeWorktree(plan.worktreePath);
  } catch (error: unknown) {
    throw new TaskExecutionLaunchError(
      409,
      "task-drift",
      `task ${plan.taskId} launch sources could not be revalidated before trusted start: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const currentTaskContext = workbenchTaskExecutionContextFor(
    observedTask.task,
    {
      authorizationId: plan.authorizationId,
      proposalDigest: plan.proposalDigest,
    },
  );
  const plannedTaskContext = WorkbenchTaskExecutionContextSchema.parse(
    JSON.parse(plan.start.environment[WORKBENCH_TASK_EXECUTION_CONTEXT_ENV]!),
  );
  const expectedAnchorRevision =
    `mission-head:${observedExecution.missionSource.gitHead}:task-revision:${observedTask.task.revision}`;
  const taskBinding = observedTask.task.binding;
  const mismatches: string[] = [];
  if (observedTask.sourceRevision !== plan.expectedSourceRevision) {
    mismatches.push("task source revision");
  }
  if (observedTask.task.revision !== plan.expectedTaskRevision) {
    mismatches.push("task revision");
  }
  if (observedTask.task.lifecycle !== "open" || observedTask.task.nextActor !== "agent") {
    mismatches.push("task responsibility");
  }
  if (
    taskBinding.kind !== "project-context"
    || taskBinding.projectId !== plan.projectId
    || taskBinding.missionId !== plan.start.missionId
    || taskBinding.worktreePath !== plan.worktreePath
  ) {
    mismatches.push("task context");
  }
  if (
    workbenchTaskExecutionContextDigest(currentTaskContext)
    !== workbenchTaskExecutionContextDigest(plannedTaskContext)
  ) {
    mismatches.push("task semantics");
  }
  if (
    observedExecution.projectId !== plan.projectId
    || observedExecution.missionId !== plan.start.missionId
  ) {
    mismatches.push("Mission context");
  }
  if (observedExecution.status !== "authorized-awaiting-execution") {
    mismatches.push("authorization standing");
  }
  if (
    observedExecution.authorizationId !== plan.authorizationId
    || observedExecution.proposalDigest !== plan.proposalDigest
  ) {
    mismatches.push("authorization selector");
  }
  if (
    observedExecution.runtimeRef !== plan.runtimeRef
    || observedExecution.runtimeDigest !== plan.runtimeDigest
  ) {
    mismatches.push("runtime source");
  }
  if (!sameObservedPath(observedExecution.receiptPath, plan.receiptPath)) {
    mismatches.push("authorization receipt");
  }
  if (
    observedReceipt.authorizationId !== plan.authorizationId
    || observedReceipt.projectId !== plan.projectId
    || observedReceipt.missionId !== plan.start.missionId
    || observedReceipt.proposalDigest !== plan.proposalDigest
    || observedReceipt.actorRef !== plan.anchorSeed.authorityRef
    || observedReceipt.sourceRef !== plan.anchorSeed.sourceRef
  ) {
    mismatches.push("anchor authority");
  }
  if (plan.anchorSeed.anchor.revision !== expectedAnchorRevision) {
    mismatches.push("anchor revision");
  }
  if (
    observedWorktree.dirty
    || observedWorktree.branch !== null
    || observedWorktree.head !== observedExecution.missionSource.gitHead
  ) {
    mismatches.push("clean detached Worktree HEAD");
  }
  if (mismatches.length > 0) {
    throw new TaskExecutionLaunchError(
      409,
      "task-drift",
      `task ${plan.taskId} launch sources changed before trusted start: ${mismatches.join(", ")}`,
    );
  }
  assertRuntimeDigest(plan.runtimeDigest, plan.start.runtimeModule);
}

async function trustedStartForCurrentAnchor(
  plan: Extract<TaskExecutionLaunchPlan, { readonly kind: "start" }>,
  client: AutonomyClient,
): Promise<TrustedRunnerStart> {
  let activity: z.infer<typeof WorkbenchRunnerActivityProjectionSchema>;
  try {
    activity = WorkbenchRunnerActivityProjectionSchema.parse(
      await client.activity(plan.start.missionId),
    );
  } catch (error: unknown) {
    throw new TaskExecutionLaunchError(
      503,
      "launch-failed",
      `cannot inspect current Mission anchor before trusted start: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  if (activity.intentLineage.standing === "legacy-unanchored") {
    throw new TaskExecutionLaunchError(
      409,
      "launch-unavailable",
      `Mission ${plan.start.missionId} has prior unanchored history; initial anchor seeding is no longer valid`,
    );
  }
  if (activity.intentLineage.standing === "unavailable") {
    throw new TaskExecutionLaunchError(
      503,
      "launch-failed",
      `current Mission anchor is unavailable: ${activity.intentLineage.reason}`,
    );
  }
  if (activity.intentLineage.standing !== "uninitialized") {
    return plan.start;
  }
  return {
    ...plan.start,
    initialAnchor: plan.anchorSeed,
  };
}

function taskWorkItem(
  items: readonly WorkItemProjection[],
  taskId: string,
): WorkItemProjection {
  const normalized = taskId.trim();
  if (normalized.length === 0) {
    throw new TaskExecutionLaunchError(
      400,
      "invalid-launch",
      "task id is required",
    );
  }
  const item = items.find(
    (candidate) =>
      candidate.binding.kind === "workbench-task"
      && candidate.binding.sourceId === normalized,
  );
  if (item?.taskDetail === undefined) {
    throw new TaskExecutionLaunchError(
      404,
      "task-not-found",
      `Workbench task not found: ${normalized}`,
    );
  }
  return item;
}

function assertRequestedSelector(
  request: TaskExecutionLaunchRequest,
  candidate: {
    readonly authorizationId: string;
    readonly proposalDigest: string;
  },
): void {
  if (
    candidate.authorizationId !== request.authorizationId
    || candidate.proposalDigest !== request.proposalDigest
  ) {
    throw new TaskExecutionLaunchError(
      409,
      "task-drift",
      "the execution authorization changed after the launch action was formed",
    );
  }
}

function assertReceiptOwnedByHome(home: string, receiptPath: string): void {
  const receiptRoot = resolve(home, "receipts", "execution-authorizations");
  const relation = relative(receiptRoot, resolve(receiptPath));
  if (
    relation.length === 0
    || relation === ".."
    || relation.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)
    || isAbsolute(relation)
  ) {
    throw new TaskExecutionLaunchError(
      409,
      "launch-unavailable",
      "the launch receipt is outside the current Workbench home",
    );
  }
}

function readExecutionAuthorizationReceipt(
  receiptPath: string,
): ExecutionAuthorizationReceipt {
  return ExecutionAuthorizationReceiptSchema.parse(
    JSON.parse(readFileSync(receiptPath, "utf8")),
  );
}

function sameObservedPath(left: string, right: string): boolean {
  if (left === right) return true;
  try {
    return realpathSync(left) === realpathSync(right);
  } catch {
    return false;
  }
}

function assertRuntimeDigest(expected: string, runtimePath: string): void {
  let observed: string;
  try {
    observed = createHash("sha256")
      .update(readFileSync(runtimePath))
      .digest("hex");
  } catch (error: unknown) {
    throw new TaskExecutionLaunchError(
      503,
      "unsupported-runtime",
      `cannot read trusted runtime ${runtimePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  if (observed !== expected) {
    throw new TaskExecutionLaunchError(
      409,
      "unsupported-runtime",
      "the trusted runtime source digest no longer matches the authorized proposal",
    );
  }
}

function reclassifyMutationFailure(error: unknown): TaskExecutionLaunchError {
  if (error instanceof TaskExecutionLaunchError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes("source revision is stale")
    || message.includes("task revision is stale")
  ) {
    return new TaskExecutionLaunchError(409, "task-drift", message);
  }
  return new TaskExecutionLaunchError(409, "launch-unavailable", message);
}
