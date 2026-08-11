import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
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
  type TaskExecutionLaunchDependencies,
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
const anchorSeed = {
  version: "rosso.mission-anchor-seed.v1" as const,
  id: `workbench-task-anchor-seed:${taskId}:${authorizationId}`,
  missionId: "mission",
  authorityRef: "principal:test",
  sourceRef: "test:principal",
  anchor: {
    id: `workbench-task-anchor:${taskId}`,
    revision: `mission-head:${"d".repeat(40)}:task-revision:3`,
    statement: [
      "Mission mainline: Launch one exact execution",
      "Mission acceptance:",
      "- The formal carrier starts once",
      "Workbench task objective: Start the authorized Mission from this task",
      "Workbench task acceptance:",
      "- Consumption becomes linkable",
    ].join("\n"),
    sourceRefs: [
      "/workspace/project/operations/missions/mission.json",
      "home:tasks",
      "test:principal",
      "/home/receipts/execution-authorizations/project/mission/proposal.json",
    ],
    reconciledWatermark: 0,
  },
};

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
    anchorSeed: structuredClone(anchorSeed),
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

function currentLaunchDependencies(
  projection: WorkItemSetProjection,
  overrides: Partial<TaskExecutionLaunchDependencies> = {},
): Partial<TaskExecutionLaunchDependencies> {
  const detail = projection.items[0]!.taskDetail!;
  const candidate = detail.executionContext.launchCandidate!;
  return {
    showTask: () => ({
      sourceRevision: detail.sourceRevision,
      task: detail.task,
    }),
    inspectExecution: () => ({
      projectId: "project",
      missionId: "mission",
      missionSource: {
        path: "operations/missions/mission.json",
        gitHead: "d".repeat(40),
      },
      status: "authorized-awaiting-execution",
      authorizationId,
      proposalDigest,
      runtimeRef,
      runtimeDigest,
      receiptPath: candidate.receiptPath,
    }) as any,
    readReceipt: () => ({
      authorizationId,
      projectId: "project",
      missionId: "mission",
      proposalDigest,
      actorRef: anchorSeed.authorityRef,
      sourceRef: anchorSeed.sourceRef,
    }) as any,
    observeWorktree: (worktreePath) => ({
      path: worktreePath,
      origin: null,
      head: "d".repeat(40),
      branch: null,
      dirty: false,
      status: ["## HEAD (no branch)"],
      instructionFiles: [],
      orientationFiles: [],
    }),
    ...overrides,
  };
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
    expect(TaskExecutionLaunchRequestSchema.safeParse({
      ...request(),
      anchorFile: "/tmp/untrusted-anchor.json",
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
      anchorSeed,
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

  test("starts a fresh Mission with one server-formed anchor on the trusted carrier", async () => {
    const { home, worktreePath, receiptPath } = fixture();
    const projection = workItems(worktreePath, receiptPath);
    const starts: TrustedRunnerStart[] = [];
    const client = {
      async activity() {
        return {
          intentLineage: {
            standing: "uninitialized",
            activeAnchor: null,
          },
        };
      },
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
      projection,
      taskId,
      request(),
      client,
      currentLaunchDependencies(projection),
    );

    expect(starts).toHaveLength(1);
    expect(starts[0]!.initialAnchor).toEqual(anchorSeed);
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

  test("blocks a stale anchor when the task changes during lineage inspection", async () => {
    const { home, worktreePath, receiptPath } = fixture();
    const projection = workItems(worktreePath, receiptPath);
    const detail = projection.items[0]!.taskDetail!;
    let taskChanged = false;
    let starts = 0;

    await expect(executeTaskExecutionLaunch(
      home,
      projection,
      taskId,
      request(),
      {
        async activity() {
          taskChanged = true;
          return {
            intentLineage: {
              standing: "uninitialized",
              activeAnchor: null,
            },
          };
        },
        async start() {
          starts += 1;
          throw new Error("must not start");
        },
      } as unknown as AutonomyClient,
      currentLaunchDependencies(projection, {
        showTask: () => ({
          sourceRevision: taskChanged ? 5 : detail.sourceRevision,
          task: taskChanged
            ? {
              ...detail.task,
              revision: 4,
              corrections: [{
                id: "33333333-3333-4333-8333-333333333333",
                at: "2026-07-29T12:01:00Z",
                statement: "Use the corrected Mission objective",
                sourceRef: "principal:test/correction",
                deliveries: [],
              }],
            }
            : detail.task,
        }),
      }),
    )).rejects.toMatchObject({
      status: 409,
      code: "task-drift",
    });
    expect(starts).toBe(0);
  });

  test("reuses an existing Mission anchor without reseeding the Blog carrier", async () => {
    const { home, worktreePath, receiptPath } = fixture();
    const projection = workItems(worktreePath, receiptPath);
    const starts: TrustedRunnerStart[] = [];
    const result = await executeTaskExecutionLaunch(
      home,
      projection,
      taskId,
      request(),
      {
        async activity() {
          return {
            intentLineage: {
              standing: "seeded",
              activeAnchor: {
                id: "existing-anchor",
                revision: "existing-r1",
                reconciledWatermark: 2,
              },
            },
          };
        },
        async start(start: TrustedRunnerStart) {
          starts.push(start);
          return {
            live: true,
            missionId: start.missionId,
            runnerId: "runner-existing-anchor",
            state: "running",
          };
        },
      } as unknown as AutonomyClient,
      currentLaunchDependencies(projection),
    );

    expect(starts).toHaveLength(1);
    expect(starts[0]!.initialAnchor).toBeUndefined();
    expect(result).toMatchObject({
      standing: "launch-started-awaiting-consumption",
      adapterId: AGENT_ERA_BLOG_PUBLICATION_ADAPTER_ID,
    });
  });

  test("fails closed when current Mission anchor evidence is unavailable", async () => {
    const { home, worktreePath, receiptPath } = fixture();
    let starts = 0;
    await expect(executeTaskExecutionLaunch(
      home,
      workItems(worktreePath, receiptPath),
      taskId,
      request(),
      {
        async activity() {
          return {
            intentLineage: {
              standing: "unavailable",
              reason: "timeline read failed",
              activeAnchor: null,
            },
          };
        },
        async start() {
          starts += 1;
          throw new Error("must not start");
        },
      } as unknown as AutonomyClient,
    )).rejects.toMatchObject({
      status: 503,
      code: "launch-failed",
    });
    expect(starts).toBe(0);
  });

  test("does not seed a Mission after legacy unanchored history exists", async () => {
    const { home, worktreePath, receiptPath } = fixture();
    let starts = 0;
    await expect(executeTaskExecutionLaunch(
      home,
      workItems(worktreePath, receiptPath),
      taskId,
      request(),
      {
        async activity() {
          return {
            intentLineage: {
              standing: "legacy-unanchored",
              activeAnchor: null,
              priorEventCount: 1,
              priorTimelineDigest: "f".repeat(64),
            },
          };
        },
        async start() {
          starts += 1;
          throw new Error("must not start");
        },
      } as unknown as AutonomyClient,
    )).rejects.toMatchObject({
      status: 409,
      code: "launch-unavailable",
    });
    expect(starts).toBe(0);
  });

  test("surfaces anchor drift from the same carrier start without fallback", async () => {
    const { home, worktreePath, receiptPath } = fixture();
    const projection = workItems(worktreePath, receiptPath);
    const starts: TrustedRunnerStart[] = [];
    await expect(executeTaskExecutionLaunch(
      home,
      projection,
      taskId,
      request(),
      {
        async activity() {
          return {
            intentLineage: {
              standing: "uninitialized",
              activeAnchor: null,
            },
          };
        },
        async start(start: TrustedRunnerStart) {
          starts.push(start);
          throw new Error(
            "Mission mission conflicts with its authorized initial anchor",
          );
        },
      } as unknown as AutonomyClient,
      currentLaunchDependencies(projection),
    )).rejects.toMatchObject({
      status: 503,
      code: "launch-failed",
      message: "Mission mission conflicts with its authorized initial anchor",
    });
    expect(starts).toHaveLength(1);
    expect(starts[0]!.initialAnchor).toEqual(anchorSeed);
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

  test("rejects a non-Blog runtime that is not in the closed adapter source", () => {
    const { home, worktreePath, receiptPath } = fixture();
    const projection = workItems(worktreePath, receiptPath) as any;
    projection.items[0].taskDetail.executionContext.launchCandidate.runtimeRef =
      "source-project:operations/autonomy/experiments/other-runtime.ts";

    expect(() =>
      prepareTaskExecutionLaunch(home, projection, taskId, request())
    ).toThrow(TaskExecutionLaunchError);
    expect(() =>
      prepareTaskExecutionLaunch(home, projection, taskId, request())
    ).toThrow("one exact trusted runtime adapter");
  });

  test("rejects an initial anchor that drifted to another Mission", () => {
    const { home, worktreePath, receiptPath } = fixture();
    const projection = workItems(worktreePath, receiptPath) as any;
    projection.items[0].taskDetail.executionContext.launchCandidate.anchorSeed
      .missionId = "other-mission";

    expect(() =>
      prepareTaskExecutionLaunch(home, projection, taskId, request())
    ).toThrow(TaskExecutionLaunchError);
    expect(() =>
      prepareTaskExecutionLaunch(home, projection, taskId, request())
    ).toThrow("launch anchor no longer matches");
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

  test("materializes only the server seed for Autonomy --anchor and removes it after start", async () => {
    const { root, home, worktreePath, receiptPath } = fixture();
    const cli = join(root, "fake-autonomy-anchor.ts");
    writeFileSync(
      cli,
      `import { readFileSync } from "node:fs";
const arguments_ = process.argv.slice(2);
const anchorIndex = arguments_.indexOf("--anchor");
const anchorPath = anchorIndex === -1 ? null : arguments_[anchorIndex + 1];
console.log(JSON.stringify({
  live: true,
  missionId: process.argv[4],
  runnerId: "runner-anchor",
  state: "running",
  arguments: arguments_,
  anchorPath,
  anchorSeed: anchorPath === null ? null : JSON.parse(readFileSync(anchorPath, "utf8"))
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
      initialAnchor: anchorSeed,
    }) as any;

    expect(observed.anchorSeed).toEqual(anchorSeed);
    expect(observed.arguments).toEqual([
      "runner",
      "start",
      "mission",
      "--runtime",
      runtimePath,
      "--anchor",
      observed.anchorPath,
      "--home",
      home,
    ]);
    expect(existsSync(observed.anchorPath)).toBe(false);
  });
});
