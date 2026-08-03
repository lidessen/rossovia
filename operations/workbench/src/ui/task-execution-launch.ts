import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { z } from "zod";
import {
  linkPrincipalTaskExecution,
  type TaskMutationResult,
} from "../tasks";
import type {
  AutonomyClient,
  TrustedRunnerStart,
} from "./autonomy-client";
import type {
  WorkItemProjection,
  WorkItemSetProjection,
} from "./work-items";
import {
  WORKBENCH_TASK_EXECUTION_CONTEXT_VERSION,
  WORKBENCH_TASK_EXECUTION_CONTEXT_ENV,
  WorkbenchTaskExecutionContextSchema,
} from "./task-execution-context";

export { WORKBENCH_TASK_EXECUTION_CONTEXT_ENV } from "./task-execution-context";

const repositoryRoot = resolve(import.meta.dir, "../../../..");
const blogPublicationRuntimeRef =
  "source-project:operations/autonomy/experiments/agent-era-blog-publication-runtime.ts";
const blogPublicationRuntimePath = resolve(
  repositoryRoot,
  "operations/autonomy/experiments/agent-era-blog-publication-runtime.ts",
);

export const AGENT_ERA_BLOG_PUBLICATION_ADAPTER_ID =
  "agent-era-blog-publication-v1";

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
  runtimeAdapterId: z.literal(AGENT_ERA_BLOG_PUBLICATION_ADAPTER_ID),
  worktreePath: absolutePath,
  receiptPath: absolutePath,
  runtimeRef: z.literal(blogPublicationRuntimeRef),
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
    readonly authorizationId: string;
    readonly proposalDigest: string;
    readonly adapterId: typeof AGENT_ERA_BLOG_PUBLICATION_ADAPTER_ID;
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
    readonly adapterId: typeof AGENT_ERA_BLOG_PUBLICATION_ADAPTER_ID;
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
  assertReceiptOwnedByHome(home, launchCandidate.data.receiptPath);
  assertRuntimeDigest(
    launchCandidate.data.runtimeDigest,
    blogPublicationRuntimePath,
  );

  return {
    kind: "start",
    taskId: task.id,
    authorizationId: launchCandidate.data.authorizationId,
    proposalDigest: launchCandidate.data.proposalDigest,
    adapterId: AGENT_ERA_BLOG_PUBLICATION_ADAPTER_ID,
    start: {
      adapterId: AGENT_ERA_BLOG_PUBLICATION_ADAPTER_ID,
      missionId: task.binding.missionId,
      runtimeModule: blogPublicationRuntimePath,
      environment: {
        ROSSO_BLOG_EFFECT_ROOT: launchCandidate.data.worktreePath,
        ROSSO_BLOG_AUTHORIZATION_RECEIPT: launchCandidate.data.receiptPath,
        [WORKBENCH_TASK_EXECUTION_CONTEXT_ENV]: JSON.stringify(
          WorkbenchTaskExecutionContextSchema.parse({
            version: WORKBENCH_TASK_EXECUTION_CONTEXT_VERSION,
            taskId: task.id,
            sourceRevision: detail.sourceRevision,
            taskRevision: task.revision,
            objective: task.objective,
            acceptance: task.acceptance,
            corrections: task.corrections.map((correction) => ({
              id: correction.id,
              statement: correction.statement,
              sourceRef: correction.sourceRef,
            })),
            binding: {
              projectId: task.binding.projectId,
              missionId: task.binding.missionId,
            },
            execution: {
              authorizationId: launchCandidate.data.authorizationId,
              proposalDigest: launchCandidate.data.proposalDigest,
            },
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
  dependencies: TaskExecutionLaunchDependencies = {
    linkExecution: linkPrincipalTaskExecution,
  },
): Promise<TaskExecutionLaunchResult> {
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
        result: dependencies.linkExecution(home, {
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
    const runner = await client.start(plan.start);
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
