import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { TaskMutationResult } from "../src/tasks";
import {
  AutonomyCliClient,
  type AutonomyClient,
  type TrustedRunnerStart,
} from "../src/ui/autonomy-client";
import {
  AGENT_ERA_BLOG_PUBLICATION_ADAPTER_ID,
  executeTaskExecutionLaunch,
  prepareTaskExecutionLaunch,
  TaskExecutionLaunchError,
  TaskExecutionLaunchRequestSchema,
  WORKBENCH_TASK_EXECUTION_CONTEXT_ENV,
} from "../src/ui/task-execution-launch";
import {
  WorkbenchTaskExecutionContextSchema,
  workbenchTaskExecutionContextDigest,
} from "../src/ui/task-execution-context";
import type { WorkItemSetProjection } from "../src/ui/work-items";

const temporaryRoots: string[] = [];
const taskId = "11111111-1111-4111-8111-111111111111";
const authorizationId = "22222222-2222-4222-8222-222222222222";
const proposalDigest = "a".repeat(64);
const runtimeRef =
  "source-project:operations/autonomy/experiments/agent-era-blog-publication-runtime.ts";
const runtimePath = resolve(
  import.meta.dir,
  "../../autonomy/experiments/agent-era-blog-publication-runtime.ts",
);
const runtimeDigest = createHash("sha256")
  .update(readFileSync(runtimePath))
  .digest("hex");

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "rossovia-task-launch-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  const worktreePath = join(root, "candidate");
  const receiptPath = join(
    home,
    "receipts",
    "execution-authorizations",
    "project",
    "mission",
    "proposal.json",
  );
  mkdirSync(worktreePath, { recursive: true });
  mkdirSync(resolve(receiptPath, ".."), { recursive: true });
  writeFileSync(receiptPath, "{}\n");
  return { root, home, worktreePath, receiptPath };
}

function request() {
  return {
    kind: "launch-authorized-execution" as const,
    authorizationId,
    proposalDigest,
    expectedSourceRevision: 4,
    expectedRevision: 3,
  };
}

function workItems(
  worktreePath: string,
  receiptPath: string,
  candidate:
    | "launch"
    | "link"
    | "already-linked" = "launch",
): WorkItemSetProjection {
  const launchCandidate = {
    authorizationId,
    proposalDigest,
    runtimeAdapterId: AGENT_ERA_BLOG_PUBLICATION_ADAPTER_ID,
    worktreePath,
    receiptPath,
    runtimeRef,
    runtimeDigest,
    evidenceRefs: [receiptPath],
  };
  const linkCandidate = {
    authorizationId,
    proposalDigest,
    evidenceRefs: [receiptPath, "state/execution-authorization-claims/claim.json"],
  };
  return {
    items: [{
      id: `principal-task:${taskId}`,
      kind: "principal-task",
      lifecycle: "open",
      nextActor: "agent",
      attention: "normal",
      title: "Launch one exact execution",
      summary: "Use the retained task as the operator entry",
      context: "project · mission",
      projectKey: "registered:project",
      missionId: "mission",
      runnerId: null,
      binding: {
        kind: "workbench-task",
        sourceId: taskId,
        projectContext: {
          projectKey: "registered:project",
          authority: "context-only",
        },
      },
      worktreeContext: {
        path: worktreePath,
        relation: "task-context",
        authority: "observation-only",
        standing: "observed",
      },
      evidence: {
        freshness: {
          kind: "observed-at-build",
          observedAt: "2026-07-29T12:00:00Z",
        },
        sourceRefs: [receiptPath],
      },
      updatedAt: "2026-07-29T12:00:00Z",
      actionLabel: "查看任务",
      consequence: "normal",
      attentionCode: null,
      taskDetail: {
        sourceRevision: 4,
        sourceRef: "home:tasks",
        ownership: "workbench-local",
        identityAssurance: "unverified-local-interaction",
        projectAuthority: "context-only",
        missionContext: {
          missionId: "mission",
          authority: "context-only",
          standing: "observed",
          currentCarrier: null,
        },
        executionContext: {
          latestLink: candidate === "already-linked"
            ? {
              authorizationId,
              proposalDigest,
              claimSourceRef: "state/execution-authorization-claims/claim.json",
              linkedAt: "2026-07-29T12:00:00Z",
              sourceRef: "test:launch",
            }
            : null,
          standing: "unavailable",
          authorizationConsumption: {
            standing: "unavailable",
            sourceRefs: [],
          },
          currentTurn: { standing: "unavailable", sourceRefs: [] },
          currentEffect: { standing: "unavailable", sourceRefs: [] },
          linkCandidate: candidate === "link" ? linkCandidate : null,
          launchCandidate: candidate === "launch" ? launchCandidate : null,
          correctionDeliveryCandidate: null,
          verifiedResultCandidate: null,
        },
        latestResultVerification: { standing: "none" },
        worktreeAuthority: "observation-only",
        worktreeStanding: "observed",
        task: {
          id: taskId,
          title: "Launch one exact execution",
          objective: "Start the authorized Mission from this task",
          acceptance: ["Consumption becomes linkable"],
          origin: {
            kind: "principal-explicit",
            sourceRef: "test:principal",
          },
          binding: {
            kind: "project-context",
            projectId: "project",
            worktreePath,
            missionId: "mission",
          },
          lifecycle: "open",
          nextActor: "agent",
          revision: 3,
          corrections: [],
          resultClaims: [],
          executionLinks: candidate === "already-linked"
            ? [{
              authorizationId,
              proposalDigest,
              claimSourceRef: "state/execution-authorization-claims/claim.json",
              linkedAt: "2026-07-29T12:00:00Z",
              sourceRef: "test:launch",
            }]
            : [],
          worktreeRebindings: [],
          createdAt: "2026-07-29T11:00:00Z",
          updatedAt: "2026-07-29T12:00:00Z",
        },
      },
    }],
    capabilities: {
      independentTasks: {
        standing: "available",
        count: 0,
        sourceRevision: 4,
      },
    },
  } as unknown as WorkItemSetProjection;
}

describe("task execution launch", () => {
  test("accepts only selector and revision fields from the browser", () => {
    expect(TaskExecutionLaunchRequestSchema.safeParse({
      ...request(),
      runtimeModule: "/tmp/untrusted-runtime.ts",
    }).success).toBe(false);
    expect(TaskExecutionLaunchRequestSchema.safeParse({
      ...request(),
      environment: { ROSSO_BLOG_EFFECT_ROOT: "/tmp/untrusted" },
    }).success).toBe(false);
  });

  test("derives the trusted Blog runtime and environment on the server", () => {
    const { home, worktreePath, receiptPath } = fixture();
    const plan = prepareTaskExecutionLaunch(
      home,
      workItems(worktreePath, receiptPath),
      taskId,
      request(),
    );

    expect(plan).toMatchObject({
      kind: "start",
      authorizationId,
      proposalDigest,
      adapterId: AGENT_ERA_BLOG_PUBLICATION_ADAPTER_ID,
      start: {
        adapterId: AGENT_ERA_BLOG_PUBLICATION_ADAPTER_ID,
        missionId: "mission",
        runtimeModule: runtimePath,
        environment: {
          ROSSO_BLOG_EFFECT_ROOT: worktreePath,
          ROSSO_BLOG_AUTHORIZATION_RECEIPT: receiptPath,
        },
      },
    });
    if (plan.kind !== "start") throw new Error("expected a start plan");
    const context = WorkbenchTaskExecutionContextSchema.parse(JSON.parse(
      plan.start.environment[WORKBENCH_TASK_EXECUTION_CONTEXT_ENV]!,
    ));
    expect(context).toEqual({
      version: "rosso.workbench-task-execution-context.v1",
      taskId,
      sourceRevision: 4,
      taskRevision: 3,
      objective: "Start the authorized Mission from this task",
      acceptance: ["Consumption becomes linkable"],
      corrections: [],
      binding: {
        projectId: "project",
        missionId: "mission",
      },
      execution: {
        authorizationId,
        proposalDigest,
      },
    });
    expect(workbenchTaskExecutionContextDigest(context)).toMatch(
      /^[a-f0-9]{64}$/,
    );
  });

  test("starts once and reports that consumption still needs observation", async () => {
    const { home, worktreePath, receiptPath } = fixture();
    const starts: TrustedRunnerStart[] = [];
    const client = {
      async start(start: TrustedRunnerStart) {
        starts.push(start);
        return {
          live: true,
          missionId: start.missionId,
          runnerId: "runner-1",
          state: "running",
        };
      },
    } as unknown as AutonomyClient;

    const result = await executeTaskExecutionLaunch(
      home,
      workItems(worktreePath, receiptPath),
      taskId,
      request(),
      client,
    );

    expect(starts).toHaveLength(1);
    expect(result).toMatchObject({
      standing: "launch-started-awaiting-consumption",
      authorizationId,
      proposalDigest,
      runner: {
        live: true,
        missionId: "mission",
        runnerId: "runner-1",
      },
    });
  });

  test("links a consumed candidate on retry without starting again", async () => {
    const { home, worktreePath, receiptPath } = fixture();
    let starts = 0;
    let links = 0;
    const retained = workItems(
      worktreePath,
      receiptPath,
      "link",
    ).items[0]!.taskDetail!.task;
    const expectedResult: TaskMutationResult = {
      sourceRevision: 5,
      task: {
        ...retained,
        revision: 4,
        executionLinks: [{
          authorizationId,
          proposalDigest,
          claimSourceRef: "state/execution-authorization-claims/claim.json",
          linkedAt: "2026-07-29T12:01:00Z",
          sourceRef: "workbench-ui:launch-authorized-execution",
        }],
      },
    };
    const result = await executeTaskExecutionLaunch(
      home,
      workItems(worktreePath, receiptPath, "link"),
      taskId,
      request(),
      {
        async start() {
          starts += 1;
          throw new Error("must not start");
        },
      } as unknown as AutonomyClient,
      {
        linkExecution(_home, arguments_) {
          links += 1;
          expect(arguments_).toMatchObject({
            id: taskId,
            authorizationId,
            expectedSourceRevision: 4,
            expectedRevision: 3,
          });
          return expectedResult;
        },
      },
    );

    expect(starts).toBe(0);
    expect(links).toBe(1);
    expect(result).toEqual({
      standing: "execution-linked",
      result: expectedResult,
    });
  });

  test("returns an already linked execution idempotently", async () => {
    const { home, worktreePath, receiptPath } = fixture();
    let starts = 0;
    const projection = workItems(
      worktreePath,
      receiptPath,
      "already-linked",
    ) as any;
    projection.items[0].taskDetail.sourceRevision = 5;
    projection.items[0].taskDetail.task.revision = 4;
    const result = await executeTaskExecutionLaunch(
      home,
      projection,
      taskId,
      request(),
      {
        async start() {
          starts += 1;
          throw new Error("must not start");
        },
      } as unknown as AutonomyClient,
    );

    expect(starts).toBe(0);
    expect(result).toMatchObject({
      standing: "execution-already-linked",
      result: {
        sourceRevision: 5,
        task: {
          id: taskId,
          revision: 4,
          executionLinks: [{ authorizationId, proposalDigest }],
        },
      },
    });
  });

  test("rejects runtime source drift before starting", () => {
    const { home, worktreePath, receiptPath } = fixture();
    const projection = workItems(worktreePath, receiptPath) as any;
    projection.items[0].taskDetail.executionContext.launchCandidate.runtimeDigest =
      "f".repeat(64);

    expect(() =>
      prepareTaskExecutionLaunch(home, projection, taskId, request())
    ).toThrow(TaskExecutionLaunchError);
    expect(() =>
      prepareTaskExecutionLaunch(home, projection, taskId, request())
    ).toThrow("trusted runtime source digest");
  });
});

describe("Autonomy CLI trusted start", () => {
  test("passes the selected runtime and server-derived environment to the CLI", async () => {
    const { root, home, worktreePath, receiptPath } = fixture();
    const cli = join(root, "fake-autonomy.ts");
    writeFileSync(
      cli,
      `console.log(JSON.stringify({
  live: true,
  missionId: process.argv[4],
  runnerId: "runner-fake",
  state: "running",
  arguments: process.argv.slice(2),
  effectRoot: process.env.ROSSO_BLOG_EFFECT_ROOT,
  receipt: process.env.ROSSO_BLOG_AUTHORIZATION_RECEIPT
}));\n`,
    );
    const client = new AutonomyCliClient(home, cli, process.execPath);
    const observed = await client.start({
      adapterId: AGENT_ERA_BLOG_PUBLICATION_ADAPTER_ID,
      missionId: "mission",
      runtimeModule: runtimePath,
      environment: {
        ROSSO_BLOG_EFFECT_ROOT: worktreePath,
        ROSSO_BLOG_AUTHORIZATION_RECEIPT: receiptPath,
      },
    }) as any;

    expect(observed).toMatchObject({
      live: true,
      runnerId: "runner-fake",
      state: "running",
      effectRoot: worktreePath,
      receipt: receiptPath,
    });
    expect(observed.arguments).toEqual([
      "runner",
      "start",
      "mission",
      "--runtime",
      runtimePath,
      "--home",
      home,
    ]);
  });
});
