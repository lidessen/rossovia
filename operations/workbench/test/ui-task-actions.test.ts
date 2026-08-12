import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import {
  CellInputSchema,
  CellRunRecordSchema,
} from "../../../packages/work-cell/src/contracts";
import {
  authorizeExecution,
  executionAuthorizationReceiptPath,
  ExecutionAuthorizationReceiptSchema,
} from "../src/execution-authorization";
import {
  executionAuthorizationClaimPath,
  executionAuthorizationReceiptDigest,
  ExecutionAuthorizationClaimSchema,
} from "../src/execution-authorization-claim";
import { initializeHome } from "../src/home";
import {
  missionExecutionProposalDigest,
  type MissionExecutionProposal,
} from "../src/mission-execution-proposal";
import {
  createLocalTaskControlPlane,
  LocalTaskControlError,
  type LocalTaskControlPlane,
} from "../src/local-task-control-plane";
import { registerProject } from "../src/register";
import {
  WORKBENCH_TASK_EXECUTION_CONTEXT_ENV,
  WorkbenchTaskExecutionContextSchema,
  workbenchTaskExecutionContextFor,
  workbenchTaskExecutionContextRef,
  type WorkbenchTaskExecutionContextRef,
} from "../src/task-execution-context";
import { principalTasksPath } from "../src/tasks";
import {
  runPrincipalTask,
  type TaskRunRequest,
  type TaskRunRunner,
} from "../src/task-run";
import type {
  AutonomyClient,
  TrustedRunnerStart,
} from "../src/ui/autonomy-client";
import type {
  ContributionAttribution,
  RunnerTarget,
} from "../src/ui/actions";
import { createWorkbenchRequestHandler } from "../src/ui/server";
import { TaskMutationRequestSchema } from "../src/ui/task-actions";

const temporaryRoots: string[] = [];
const publicationRuntimeRef =
  "source-project:operations/autonomy/experiments/agent-era-blog-publication-runtime.ts";
const publicationRuntimePath = resolve(
  import.meta.dir,
  "../../autonomy/experiments/agent-era-blog-publication-runtime.ts",
);
const publicationRuntimeDigest = createHash("sha256")
  .update(readFileSync(publicationRuntimePath))
  .digest("hex");

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "rossovia-ui-tasks-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  initializeHome(home);
  const origin = "http://127.0.0.1:4317";
  const handler = createWorkbenchRequestHandler({
    home,
    port: 4317,
    roots: [],
  }, {} as AutonomyClient);
  return { root, home, origin, handler };
}

function retainedAttemptRunner(): TaskRunRunner {
  return {
    run(request: TaskRunRequest) {
      const input = CellInputSchema.parse(
        JSON.parse(readFileSync(request.inputPath, "utf8")),
      );
      const record = CellRunRecordSchema.parse({
        version: "work-cell.run.v4",
        runId: "ui-attempt-run",
        cellId: input.id,
        driver: {
          adapter: "opencode-cli.v1",
          provider: "deepseek",
          model: request.model,
        },
        startedAt: "2026-08-12T18:01:00.000Z",
        finishedAt: "2026-08-12T18:02:00.000Z",
        durationMs: 60_000,
        status: "passed",
        input,
        finalText: "Retained UI fixture result.",
        artifacts: [],
        verification: {
          passed: true,
          terminal: { passed: true, required: [], called: [] },
          artifacts: { passed: true, errors: [] },
        },
        workspaceDiff: {
          added: ["evidence/new.txt"],
          changed: ["src/existing.ts"],
          removed: [],
        },
        usage: {
          inputTokens: 120,
          outputTokens: 40,
          totalTokens: 160,
          cachedInputTokens: 20,
        },
        usageByPhase: {
          preparation: {
            inputTokens: 20,
            outputTokens: 0,
            totalTokens: 20,
            cachedInputTokens: 20,
          },
          execution: {
            inputTokens: 100,
            outputTokens: 40,
            totalTokens: 140,
            cachedInputTokens: 0,
          },
        },
        executionObservation: { sessionId: "session-ui-attempt" },
        trace: [],
        rawSteps: [],
      });
      writeFileSync(
        request.finalRecordPath,
        `${JSON.stringify(record, null, 2)}\n`,
        { flag: "wx" },
      );
      return { runId: record.runId, status: record.status };
    },
  };
}

function git(cwd: string, ...arguments_: string[]): string {
  const result = Bun.spawnSync(["git", ...arguments_], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}

function projectWithMission(root: string): string {
  const project = join(root, "project");
  mkdirSync(join(project, "operations", "missions"), { recursive: true });
  git(project, "init", "-b", "main");
  git(project, "config", "user.name", "Task UI Test");
  git(project, "config", "user.email", "task-ui@example.test");
  writeFileSync(join(project, "README.md"), "# Task UI fixture\n");
  writeFileSync(
    join(project, "operations", "missions", "daily-task-loop.json"),
    `${JSON.stringify({
      version: "mission-record.v1",
      id: "daily-task-loop",
      title: "Daily task loop",
      sources: ["test:ui-task-mission-context"],
      createdAt: "2026-07-28T00:00:00Z",
      updatedAt: "2026-07-28T00:00:00Z",
      mainline: {
        contradiction: "Associate task and Mission without execution attribution",
        acceptance: ["Only context is persisted"],
        status: "active",
      },
      executionProposal: taskExecutionProposal(),
      branches: [],
      currentFocus: "mainline",
    }, null, 2)}\n`,
  );
  git(project, "add", "README.md", "operations/missions/daily-task-loop.json");
  git(project, "commit", "-m", "fixture");
  git(project, "remote", "add", "origin", "https://example.test/lidessen/task-ui-fixture.git");
  return project;
}

function taskExecutionProposal(): MissionExecutionProposal {
  return {
    version: "mission-execution-proposal.v1",
    proposalId: "task-ui-execution",
    mode: "supervised",
    status: "awaiting-principal-authorization",
    runtimeRef: "source-project:runtime.ts",
    runtimeDigest: "b".repeat(64),
    externalProvider: { name: "test-provider", boundary: "external" },
    externalDisclosure: { dataCategories: ["task-context"] },
    candidateWorktree: {
      rootRef: "environment:ROSSO_TASK_WORKTREE",
      binding: "operator-selected-at-launch",
    },
    scope: { writePaths: ["."], commands: [] },
    budget: {
      parent: { maxModelSteps: 1, maxOutputTokensPerStep: 100 },
      delegatedCell: {
        maxSteps: 1,
        maxOutputTokensPerStep: 100,
        maxDurationMs: 1_000,
      },
      estimatedTokens: 200,
      estimatedTokensSemantics: "forecast-only-not-stop-condition",
    },
    authority: {
      externalDisclosure: "withheld",
      budgetRelease: "withheld",
      write: "withheld",
      execute: "withheld",
      commit: "withheld",
      merge: "withheld",
      publish: "withheld",
    },
    pendingDecisions: [{
      id: "external-disclosure",
      label: "Authorize the declared test disclosure",
      proposal: "Send only task context",
      status: "pending",
      options: [{
        replyKey: "ALLOW",
        label: "Allow",
        immediateResult: "Permit the declared request",
        tradeoff: "Task context crosses the test boundary",
      }, {
        replyKey: "HOLD",
        label: "Hold",
        immediateResult: "Keep execution blocked",
        tradeoff: "No execution starts",
      }],
      compactReplyKey: "ALLOW",
    }],
  };
}

function launchExecutionProposal(): MissionExecutionProposal {
  return {
    ...taskExecutionProposal(),
    proposalId: "task-ui-blog-publication-launch",
    runtimeRef: publicationRuntimeRef,
    runtimeDigest: publicationRuntimeDigest,
    candidateWorktree: {
      rootRef: "environment:ROSSO_BLOG_EFFECT_ROOT",
      binding: "operator-selected-at-launch",
    },
  };
}

function consumedAuthorization(
  home: string,
  project: string,
  projectId: string,
  missionId: string,
) {
  const authorizationId = "11111111-1111-4111-8111-111111111111";
  const proposal = taskExecutionProposal();
  const proposalId = proposal.proposalId;
  const proposalDigest = missionExecutionProposalDigest(proposal);
  const head = git(project, "rev-parse", "HEAD");
  const receipt = ExecutionAuthorizationReceiptSchema.parse({
    version: "rosso.execution-authorization-receipt.v1",
    authorizationId,
    projectId,
    missionId,
    missionSource: {
      path: `operations/missions/${missionId}.json`,
      gitHead: head,
    },
    proposalId,
    proposalDigest,
    choices: [{ decisionId: "external-disclosure", replyKey: "ALLOW" }],
    immediateAuthorizedResults: [{
      decisionId: "external-disclosure",
      result: "Permit the declared request",
    }],
    executionBoundary: {
      runtimeRef: proposal.runtimeRef,
      runtimeDigest: proposal.runtimeDigest,
      externalProvider: proposal.externalProvider,
      externalDisclosure: proposal.externalDisclosure,
      candidateWorktree: proposal.candidateWorktree,
      scope: proposal.scope,
      budget: proposal.budget,
    },
    authorityBoundary: {
      kind: "single-execution",
      maxUses: 1,
      externalDisclosure: "authorized-for-declared-boundary",
      budgetRelease: "authorized-for-declared-budget",
      write: "authorized-for-declared-paths",
      execute: "authorized-once",
      commit: "withheld",
      merge: "withheld",
      publish: "withheld",
      productAcceptance: "withheld",
    },
    actorRef: "principal:test",
    sourceRef: "conversation:test/ui-task-execution",
    attributionBoundary: "references-are-attribution-not-authentication",
    authorizedAt: "2026-07-28T11:59:00Z",
  });
  const receiptPath = executionAuthorizationReceiptPath(
    home,
    projectId,
    missionId,
    proposalId,
  );
  writeJson(receiptPath, receipt);
  const claimPath = executionAuthorizationClaimPath(home, authorizationId);
  writeJson(claimPath, ExecutionAuthorizationClaimSchema.parse({
    version: "rosso.execution-authorization-claim.v1",
    authorizationId,
    projectId,
    missionId,
    proposalId,
    proposalDigest,
    receipt: {
      ref: relative(home, receiptPath),
      digest: executionAuthorizationReceiptDigest(receipt),
    },
    localEvidence: {
      worktree: project,
      gitHead: head,
    },
    claimedAt: "2026-07-28T12:00:00Z",
  }));
  return {
    authorizationId,
    proposalDigest,
    claimSourceRef: relative(home, claimPath),
    workbenchTaskContext: null as WorkbenchTaskExecutionContextRef | null,
  };
}

function bindConsumedAuthorizationToTask(
  home: string,
  execution: ReturnType<typeof consumedAuthorization>,
  task: unknown,
): WorkbenchTaskExecutionContextRef {
  const claimPath = join(home, execution.claimSourceRef);
  const claim = ExecutionAuthorizationClaimSchema.parse(
    JSON.parse(readFileSync(claimPath, "utf8")),
  );
  const taskContext = workbenchTaskExecutionContextRef(
    workbenchTaskExecutionContextFor(task as never, {
      authorizationId: execution.authorizationId,
      proposalDigest: execution.proposalDigest,
    }),
  );
  writeJson(claimPath, ExecutionAuthorizationClaimSchema.parse({
    ...claim,
    workbenchTaskContext: taskContext,
  }));
  execution.workbenchTaskContext = taskContext;
  return taskContext;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function authorizedTaskLaunchFixture() {
  const { home, origin, root } = fixture();
  const project = projectWithMission(root);
  const missionPath = join(
    project,
    "operations",
    "missions",
    "daily-task-loop.json",
  );
  const mission = JSON.parse(readFileSync(missionPath, "utf8"));
  const proposal = launchExecutionProposal();
  writeJson(missionPath, {
    ...mission,
    executionProposal: proposal,
  });
  git(project, "add", "operations/missions/daily-task-loop.json");
  git(project, "commit", "-m", "prepare task launch fixture");

  const candidate = join(root, "candidate");
  git(project, "worktree", "add", "--detach", candidate, "HEAD");
  registerProject(home, {
    path: project,
    id: "repository:task-ui-fixture",
    aliases: ["fixture"],
  });
  const authorized = authorizeExecution(home, {
    project: "fixture",
    missionId: "daily-task-loop",
    proposalId: proposal.proposalId,
    proposalDigest: missionExecutionProposalDigest(proposal),
    choices: ["external-disclosure=ALLOW"],
    actorRef: "principal:test",
    sourceRef: "conversation:test/task-launch",
  });
  return { home, origin, proposal, candidate, authorized };
}

function liveRunnerStatus(missionId: string) {
  return {
    version: "rosso.mission-runner.v1" as const,
    runnerId: `runner-${missionId}`,
    missionId,
    pid: 1234,
    state: "running" as const,
    startedAt: "2026-07-28T12:00:00Z",
    updatedAt: "2026-07-28T12:01:00Z",
    inputWatermark: 0,
    reconciledWatermark: 0,
    socketPath: `/tmp/${missionId}.sock`,
    stopReason: null,
  };
}

function correctionDeliveryClient(
  missionId: string,
  execution: ReturnType<typeof consumedAuthorization>,
) {
  const status = liveRunnerStatus(missionId);
  const contributions: {
    target: RunnerTarget;
    text: string;
    attribution: ContributionAttribution | undefined;
  }[] = [];
  const client: AutonomyClient = {
    async status() {
      return { ...status, live: true };
    },
    async activity() {
      return {
        source: "mission-timeline",
        observedAt: "2026-07-28T12:01:00Z",
        eventCount: 1,
        intentLineage: {
          standing: "seeded",
          activeAnchor: {
            id: "anchor:daily-task-loop",
            revision: "r1",
            reconciledWatermark: 0,
          },
        },
        currentTurn: {
          turnId: "turn-daily-task-loop",
          startedAt: "2026-07-28T12:00:00Z",
          baselineWatermark: 0,
          state: "open",
          launchAuthorizationRef: {
            authorizationId: execution.authorizationId,
            proposalDigest: execution.proposalDigest,
            claimSourceRef: execution.claimSourceRef,
          },
          workbenchTaskContext: execution.workbenchTaskContext ?? undefined,
        },
      };
    },
    async contribute(target, text, attribution) {
      contributions.push({ target, text, attribution });
      return {
        status: {
          ...status,
          state: "input-pending",
          inputWatermark: 1,
        },
        receipt: {
          inputId: attribution!.inputId,
          watermark: 1,
          actorRef: attribution!.actorRef,
          sourceRef: attribution!.sourceRef,
          payload: { kind: "contribution", text },
          payloadDigest: "c".repeat(64),
          eventId: "event-task-correction-1",
          at: "2026-07-28T12:02:00Z",
        },
      };
    },
    async control() {
      throw new Error("not expected");
    },
    async recover() {
      throw new Error("not expected");
    },
  };
  return { client, contributions, status };
}

function taskRecoveryClient(
  missionId: string,
  execution: ReturnType<typeof consumedAuthorization>,
) {
  const persistedStatus = {
    ...liveRunnerStatus(missionId),
    state: "interrupted" as const,
  };
  const liveStatus = {
    ...persistedStatus,
    recoveryCapabilities: {
      abandon: false,
      resume: true,
      replace: false,
    },
  };
  const recoveries: {
    target: RunnerTarget;
    command: "resume" | "replace" | "abandon";
  }[] = [];
  let resumeAvailable = true;
  let activityCalls = 0;
  let driftAtActivityCall: number | null = null;
  let taskContextDriftAtActivityCall: number | null = null;
  let beforeActivityCall: {
    readonly call: number;
    readonly run: () => void;
  } | null = null;
  const client: AutonomyClient = {
    async status() {
      return {
        ...liveStatus,
        live: true,
        recoveryCapabilities: {
          ...liveStatus.recoveryCapabilities,
          resume: resumeAvailable,
        },
      };
    },
    async activity() {
      activityCalls += 1;
      if (activityCalls === beforeActivityCall?.call) {
        const run = beforeActivityCall.run;
        beforeActivityCall = null;
        run();
      }
      const turnExecution = activityCalls === driftAtActivityCall
        ? {
          authorizationId: "33333333-3333-4333-8333-333333333333",
          proposalDigest: "e".repeat(64),
          claimSourceRef:
            "state/execution-authorization-claims/33333333-3333-4333-8333-333333333333.json",
        }
        : execution;
      return {
        source: "mission-timeline",
        observedAt: "2026-07-28T12:01:00Z",
        eventCount: 1,
        intentLineage: {
          standing: "seeded",
          activeAnchor: {
            id: "anchor:daily-task-loop",
            revision: "r1",
            reconciledWatermark: 0,
          },
        },
        currentTurn: {
          turnId: "turn-daily-task-loop",
          startedAt: "2026-07-28T12:00:00Z",
          baselineWatermark: 0,
          state: "open",
          launchAuthorizationRef: {
            authorizationId: turnExecution.authorizationId,
            proposalDigest: turnExecution.proposalDigest,
            claimSourceRef: turnExecution.claimSourceRef,
          },
          workbenchTaskContext:
            activityCalls === taskContextDriftAtActivityCall
              && execution.workbenchTaskContext !== null
              ? {
                ...execution.workbenchTaskContext,
                taskId: "another-task",
              }
              : execution.workbenchTaskContext ?? undefined,
        },
      };
    },
    async contribute() {
      throw new Error("not expected");
    },
    async control() {
      throw new Error("not expected");
    },
    async recover(target, command) {
      recoveries.push({ target, command });
      return {
        status: {
          ...persistedStatus,
          state: "running",
          live: true,
        },
      };
    },
  };
  return {
    client,
    persistedStatus,
    recoveries,
    setResumeAvailable(value: boolean) {
      resumeAvailable = value;
    },
    driftAtNextActivityOffset(offset: number) {
      driftAtActivityCall = activityCalls + offset;
    },
    driftTaskContextAtNextActivityOffset(offset: number) {
      taskContextDriftAtActivityCall = activityCalls + offset;
    },
    runBeforeNextActivityOffset(offset: number, run: () => void) {
      beforeActivityCall = { call: activityCalls + offset, run };
    },
  };
}

function verifiedExecutionClient(
  missionId: string,
  worktree: string,
  execution: ReturnType<typeof consumedAuthorization>,
) {
  const status = liveRunnerStatus(missionId);
  const selector = {
    kind: "autonomy-effect-verification.v1" as const,
    effectId: "effect-verified-task-result",
    verificationEventId: "event-effect-verified-task-result",
  };
  let verificationCurrent = true;
  const client: AutonomyClient = {
    async status() {
      return { ...status, live: true };
    },
    async activity() {
      return {
        source: "mission-timeline",
        observedAt: "2026-07-28T12:05:00Z",
        eventCount: 4,
        intentLineage: {
          standing: "seeded",
          activeAnchor: {
            id: "anchor:daily-task-loop",
            revision: "r1",
            reconciledWatermark: 0,
          },
        },
        currentTurn: {
          turnId: "turn-daily-task-loop",
          startedAt: "2026-07-28T12:00:00Z",
          baselineWatermark: 0,
          state: "settled",
          settlementKind: "finished",
          runStatus: "returned",
          launchAuthorizationRef: {
            authorizationId: execution.authorizationId,
            proposalDigest: execution.proposalDigest,
            claimSourceRef: execution.claimSourceRef,
          },
          workbenchTaskContext: execution.workbenchTaskContext ?? undefined,
        },
        currentEffect: {
          effectId: selector.effectId,
          launchAuthorizationRef: {
            authorizationId: execution.authorizationId,
            proposalDigest: execution.proposalDigest,
            claimSourceRef: execution.claimSourceRef,
          },
          phase: "settled",
          writer: {
            cellId: "verified-task-cell",
            runId: "verified-task-run",
          },
          workspace: {
            root: worktree,
            baseHead: "a".repeat(40),
            baselineClean: true,
          },
          scope: {
            writePaths: ["src"],
            allowedCommands: [],
          },
          currentTool: null,
          recentTools: [],
          diff: {
            changed: ["src/result.ts"],
            added: [],
            removed: [],
            patchRef: "effect-artifacts/result.patch",
            patchDigest: "d".repeat(64),
            outsideScope: [],
          },
          verification: {
            mechanical: {
              verdict: "passed",
              evidenceRefs: ["cell-run:verified-task-run"],
            },
            independent: {
              verifierRef: "supervisor:verified-task-result",
              verdict: "passed",
              evidenceRefs: ["file:verification/result.json"],
              subject: {
                gitHead: "a".repeat(40),
                files: [{
                  path: "src/result.ts",
                  sha256: "e".repeat(64),
                }],
              },
            },
            principal: { verdict: "withheld", evidenceRefs: [] },
          },
          authority: {
            commit: "withheld",
            merge: "withheld",
            publish: "withheld",
          },
          stale: false,
          uncertain: false,
        },
        currentVerifiedResult: verificationCurrent
          ? {
            standing: "verified-current",
            selector,
          }
          : null,
      };
    },
    async contribute() {
      throw new Error("not expected");
    },
    async control() {
      throw new Error("not expected");
    },
    async recover() {
      throw new Error("not expected");
    },
  };
  return {
    client,
    selector,
    status,
    setVerificationCurrent(value: boolean) {
      verificationCurrent = value;
    },
  };
}

function post(
  handler: ReturnType<typeof createWorkbenchRequestHandler>,
  origin: string,
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return handler(new Request(`${origin}${path}`, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  }));
}

describe("Workbench task UI actions", () => {
  test("accepts only the exact UI request needed to link a consumed execution", () => {
    const request = {
      kind: "link-execution",
      authorizationId: "11111111-1111-4111-8111-111111111111",
      expectedSourceRevision: 2,
      expectedRevision: 3,
    } as const;
    expect(TaskMutationRequestSchema.parse(request)).toEqual(request);
    expect(TaskMutationRequestSchema.safeParse({
      ...request,
      proposalDigest: "a".repeat(64),
    }).success).toBe(false);
  });

  test("runs create, assign, correct, submit, accept, and reopen through revision-bound HTTP actions", async () => {
    const { handler, origin } = fixture();

    const createdResponse = await post(handler, origin, "/api/tasks", {
      title: "Ship the task UI",
      objective: "Close one daily-use task loop",
      acceptance: ["The result remains after refresh"],
      nextActor: "agent",
      expectedSourceRevision: 0,
    });
    expect(createdResponse.status).toBe(200);
    const created = await createdResponse.json();
    const taskId = created.result.task.id as string;
    expect(created.result).toMatchObject({
      sourceRevision: 1,
      task: {
        origin: {
          kind: "principal-explicit",
          sourceRef: "workbench-ui:unverified-local-interaction",
        },
        lifecycle: "open",
        nextActor: "agent",
        revision: 1,
      },
    });

    const assigned = await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "assign",
      nextActor: "principal",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    });
    expect(await assigned.json()).toMatchObject({
      result: {
        sourceRevision: 2,
        task: { nextActor: "principal", revision: 2 },
      },
    });

    const corrected = await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "correct",
      statement: "Keep task management primary.",
      nextActor: "agent",
      expectedSourceRevision: 2,
      expectedRevision: 2,
    });
    expect(await corrected.json()).toMatchObject({
      result: {
        sourceRevision: 3,
        task: {
          lifecycle: "open",
          nextActor: "agent",
          revision: 3,
        },
      },
    });

    const submitted = await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "submit",
      summary: "The UI task loop is implemented.",
      evidenceRefs: ["test:ui-task-actions"],
      expectedSourceRevision: 3,
      expectedRevision: 3,
    });
    expect(await submitted.json()).toMatchObject({
      result: {
        sourceRevision: 4,
        task: {
          lifecycle: "verifying",
          nextActor: "principal",
          revision: 4,
        },
      },
    });

    const accepted = await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "accept",
      expectedSourceRevision: 4,
      expectedRevision: 4,
    });
    expect(await accepted.json()).toMatchObject({
      result: {
        sourceRevision: 5,
        task: {
          lifecycle: "settled",
          nextActor: "none",
          revision: 5,
        },
      },
    });

    const reopened = await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "reopen",
      statement: "Observed use requires another pass.",
      nextActor: "agent",
      expectedSourceRevision: 5,
      expectedRevision: 5,
    });
    expect(await reopened.json()).toMatchObject({
      result: {
        sourceRevision: 6,
        task: {
          lifecycle: "open",
          nextActor: "agent",
          revision: 6,
        },
      },
    });

    const snapshot = await handler(new Request(`${origin}/api/snapshot`));
    const body = await snapshot.json();
    expect(body.workItems.items).toContainEqual(expect.objectContaining({
      id: `principal-task:${taskId}`,
      kind: "principal-task",
      runnerId: null,
    }));
  });

  test("rebinds a task to another observed Worktree without changing project or Mission", async () => {
    const { handler, home, origin, root } = fixture();
    const project = projectWithMission(root);
    const oldWorktree = join(root, "old-task-worktree");
    const newWorktree = join(root, "new-task-worktree");
    git(project, "worktree", "add", "-b", "task/old", oldWorktree);
    git(project, "worktree", "add", "-b", "task/new", newWorktree);
    registerProject(home, {
      path: project,
      id: "repository:task-ui-fixture",
      aliases: ["fixture"],
    });
    const createdResponse = await post(handler, origin, "/api/tasks", {
      title: "Move task to a clean candidate",
      objective: "Keep the same project and Mission",
      acceptance: ["The rebinding is retained in task history"],
      nextActor: "agent",
      expectedSourceRevision: 0,
      project: "fixture",
      worktree: oldWorktree,
      mission: "daily-task-loop",
    });
    const created = await createdResponse.json();
    const taskId = created.result.task.id as string;

    const reboundResponse = await post(
      handler,
      origin,
      `/api/tasks/${taskId}/actions`,
      {
        kind: "rebind-worktree",
        expectedWorktreePath: realpathSync(oldWorktree),
        worktree: newWorktree,
        expectedSourceRevision: 1,
        expectedRevision: 1,
      },
    );
    expect(reboundResponse.status).toBe(200);
    expect(await reboundResponse.json()).toMatchObject({
      result: {
        sourceRevision: 2,
        task: {
          revision: 2,
          binding: {
            projectId: "repository:task-ui-fixture",
            missionId: "daily-task-loop",
            worktreePath: realpathSync(newWorktree),
          },
          worktreeRebindings: [{
            fromWorktreePath: realpathSync(oldWorktree),
            toWorktreePath: realpathSync(newWorktree),
            sourceRef: "workbench-ui:unverified-local-interaction",
          }],
        },
      },
    });

    const staleResponse = await post(
      handler,
      origin,
      `/api/tasks/${taskId}/actions`,
      {
        kind: "rebind-worktree",
        expectedWorktreePath: realpathSync(oldWorktree),
        worktree: oldWorktree,
        expectedSourceRevision: 2,
        expectedRevision: 2,
      },
    );
    expect(staleResponse.status).toBe(409);
    expect(await staleResponse.json()).toMatchObject({
      error: "task-drift",
    });
  });

  test("creates only a validated Mission context through the UI adapter", async () => {
    const { handler, home, origin, root } = fixture();
    const project = projectWithMission(root);
    registerProject(home, {
      path: project,
      id: "repository:task-ui-fixture",
      aliases: ["fixture"],
    });

    const response = await post(handler, origin, "/api/tasks", {
      title: "Mission-context task",
      objective: "Relate work without claiming that an execution exists",
      acceptance: ["The persisted binding contains no runner or authorization fact"],
      nextActor: "agent",
      expectedSourceRevision: 0,
      project: "fixture",
      mission: "daily-task-loop",
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.result.task).toMatchObject({
      binding: {
        kind: "project-context",
        projectId: "repository:task-ui-fixture",
        missionId: "daily-task-loop",
      },
      lifecycle: "open",
      nextActor: "agent",
    });
    expect(body.result.task.binding).not.toHaveProperty("runnerId");
    expect(body.result.task.binding).not.toHaveProperty("authorizationId");

    const execution = consumedAuthorization(
      home,
      project,
      "repository:task-ui-fixture",
      "daily-task-loop",
    );
    bindConsumedAuthorizationToTask(home, execution, body.result.task);
    const linked = await post(
      handler,
      origin,
      `/api/tasks/${body.result.task.id}/actions`,
      {
        kind: "link-execution",
        authorizationId: execution.authorizationId,
        expectedSourceRevision: 1,
        expectedRevision: 1,
      },
    );
    expect(linked.status).toBe(200);
    expect(await linked.json()).toMatchObject({
      result: {
        sourceRevision: 2,
        task: {
          lifecycle: "open",
          nextActor: "agent",
          revision: 2,
          executionLinks: [{
            authorizationId: execution.authorizationId,
            proposalDigest: execution.proposalDigest,
            claimSourceRef: execution.claimSourceRef,
            taskContext: execution.workbenchTaskContext,
            sourceRef: "workbench-ui:unverified-local-interaction",
          }],
        },
      },
    });
  });

  test("starts one authorized task execution and links only the observed consumption claim", async () => {
    const { home, origin, root } = fixture();
    const project = projectWithMission(root);
    const missionPath = join(
      project,
      "operations",
      "missions",
      "daily-task-loop.json",
    );
    const mission = JSON.parse(readFileSync(missionPath, "utf8"));
    const proposal = launchExecutionProposal();
    writeJson(missionPath, {
      ...mission,
      executionProposal: proposal,
    });
    git(project, "add", "operations/missions/daily-task-loop.json");
    git(project, "commit", "-m", "prepare task launch fixture");

    const candidate = join(root, "candidate");
    git(project, "worktree", "add", "--detach", candidate, "HEAD");
    registerProject(home, {
      path: project,
      id: "repository:task-ui-fixture",
      aliases: ["fixture"],
    });
    const authorized = authorizeExecution(home, {
      project: "fixture",
      missionId: "daily-task-loop",
      proposalId: proposal.proposalId,
      proposalDigest: missionExecutionProposalDigest(proposal),
      choices: ["external-disclosure=ALLOW"],
      actorRef: "principal:test",
      sourceRef: "conversation:test/task-launch",
    });

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
        const canonicalHome = realpathSync(home);
        const workbenchTaskContext = workbenchTaskExecutionContextRef(
          WorkbenchTaskExecutionContextSchema.parse(JSON.parse(
            start.environment[WORKBENCH_TASK_EXECUTION_CONTEXT_ENV]!,
          )),
        );
        const claimPath = executionAuthorizationClaimPath(
          canonicalHome,
          authorized.receipt.authorizationId,
        );
        writeJson(claimPath, ExecutionAuthorizationClaimSchema.parse({
          version: "rosso.execution-authorization-claim.v1",
          authorizationId: authorized.receipt.authorizationId,
          projectId: "repository:task-ui-fixture",
          missionId: "daily-task-loop",
          proposalId: proposal.proposalId,
          proposalDigest: missionExecutionProposalDigest(proposal),
          receipt: {
            ref: relative(canonicalHome, authorized.receiptPath),
            digest: executionAuthorizationReceiptDigest(authorized.receipt),
          },
          localEvidence: {
            worktree: realpathSync(candidate),
            gitHead: git(candidate, "rev-parse", "HEAD"),
          },
          workbenchTaskContext,
          claimedAt: "2026-07-29T12:00:00Z",
        }));
        return {
          live: true,
          missionId: start.missionId,
          runnerId: "runner-task-launch",
          state: "running",
        };
      },
    } as unknown as AutonomyClient;
    const handler = createWorkbenchRequestHandler({
      home,
      port: 4317,
      roots: [],
    }, client);

    const created = await post(handler, origin, "/api/tasks", {
      title: "Start an authorized Agent",
      objective: "Use this task as the exact Workbench launch entry",
      acceptance: ["The consumed authorization is linked back to this task"],
      nextActor: "agent",
      expectedSourceRevision: 0,
      project: "fixture",
      worktree: candidate,
      mission: "daily-task-loop",
    });
    expect(created.status).toBe(200);
    const task = (await created.json()).result.task;

    const launchRequest = {
      kind: "launch-authorized-execution",
      authorizationId: authorized.receipt.authorizationId,
      proposalDigest: missionExecutionProposalDigest(proposal),
      expectedSourceRevision: 1,
      expectedRevision: 1,
    };
    const launched = await post(
      handler,
      origin,
      `/api/tasks/${task.id}/actions`,
      launchRequest,
    );

    const launchedBody = await launched.json();
    expect({
      status: launched.status,
      body: launchedBody,
    }).toMatchObject({ status: 200 });
    expect(starts).toHaveLength(1);
    expect(starts[0]).toMatchObject({
      adapterId: "agent-era-blog-publication-v1",
      missionId: "daily-task-loop",
      runtimeModule: publicationRuntimePath,
      environment: {
        ROSSO_BLOG_EFFECT_ROOT: realpathSync(candidate),
        ROSSO_BLOG_AUTHORIZATION_RECEIPT: authorized.receiptPath,
      },
      initialAnchor: {
        version: "rosso.mission-anchor-seed.v1",
        missionId: "daily-task-loop",
        authorityRef: "principal:test",
        sourceRef: "conversation:test/task-launch",
        anchor: {
          statement: expect.stringContaining(
            "Workbench task objective: Use this task as the exact Workbench launch entry",
          ),
          reconciledWatermark: 0,
        },
      },
    });
    const anchorSourceRefs = starts[0]?.initialAnchor?.anchor.sourceRefs ?? [];
    expect(anchorSourceRefs).toContain(realpathSync(missionPath));
    expect(anchorSourceRefs).toContain(realpathSync(principalTasksPath(home)));
    expect(anchorSourceRefs).toContain(realpathSync(authorized.receiptPath));
    expect(launchedBody).toMatchObject({
      result: {
        standing: "execution-linked",
        result: {
          sourceRevision: 2,
          task: {
            id: task.id,
            revision: 2,
            executionLinks: [{
              authorizationId: authorized.receipt.authorizationId,
              proposalDigest: missionExecutionProposalDigest(proposal),
              taskContext: workbenchTaskExecutionContextRef(
                workbenchTaskExecutionContextFor(task, {
                  authorizationId: authorized.receipt.authorizationId,
                  proposalDigest: missionExecutionProposalDigest(proposal),
                }),
              ),
            }],
          },
        },
      },
    });

    const retried = await post(
      handler,
      origin,
      `/api/tasks/${task.id}/actions`,
      launchRequest,
    );
    expect(retried.status).toBe(200);
    expect(await retried.json()).toMatchObject({
      result: {
        standing: "execution-already-linked",
        result: {
          sourceRevision: 2,
          task: {
            id: task.id,
            revision: 2,
          },
        },
      },
    });
    expect(starts).toHaveLength(1);
  });

  test("starts once when consumption is delayed and serializes same-task UI actions", async () => {
    const {
      home,
      origin,
      proposal,
      candidate,
      authorized,
    } = authorizedTaskLaunchFixture();
    const starts: TrustedRunnerStart[] = [];
    let announceStart!: () => void;
    let releaseStart!: () => void;
    const startEntered = new Promise<void>((resolve) => {
      announceStart = resolve;
    });
    const startReleased = new Promise<void>((resolve) => {
      releaseStart = resolve;
    });
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
        announceStart();
        await startReleased;
        return {
          live: false,
          missionId: start.missionId,
          runnerId: "runner-delayed-claim",
          state: "mission-stopped",
        };
      },
    } as unknown as AutonomyClient;
    const handler = createWorkbenchRequestHandler({
      home,
      port: 4317,
      roots: [],
    }, client);
    const created = await post(handler, origin, "/api/tasks", {
      title: "Start one delayed Agent",
      objective: "Do not duplicate a launch while its claim is delayed",
      acceptance: ["Exactly one start call is made"],
      nextActor: "agent",
      expectedSourceRevision: 0,
      project: "fixture",
      worktree: candidate,
      mission: "daily-task-loop",
    });
    const task = (await created.json()).result.task;
    const launchRequest = {
      kind: "launch-authorized-execution",
      authorizationId: authorized.receipt.authorizationId,
      proposalDigest: missionExecutionProposalDigest(proposal),
      expectedSourceRevision: 1,
      expectedRevision: 1,
    };

    const launchResponse = post(
      handler,
      origin,
      `/api/tasks/${task.id}/actions`,
      launchRequest,
    );
    await startEntered;
    const concurrentMutation = await post(
      handler,
      origin,
      `/api/tasks/${task.id}/actions`,
      {
        kind: "assign",
        nextActor: "principal",
        expectedSourceRevision: 1,
        expectedRevision: 1,
      },
    );
    expect(concurrentMutation.status).toBe(409);
    expect(await concurrentMutation.json()).toMatchObject({
      error: "task-action-in-flight",
    });

    releaseStart();
    const launched = await launchResponse;
    expect(launched.status).toBe(200);
    expect(await launched.json()).toMatchObject({
      result: {
        standing: "launch-started-awaiting-consumption",
        runner: {
          live: false,
          runnerId: "runner-delayed-claim",
        },
      },
    });
    expect(starts).toHaveLength(1);
  });

  test("delivers one retained task correction to the exact live Mission turn and records its receipt", async () => {
    const { home, origin, root } = fixture();
    const project = projectWithMission(root);
    registerProject(home, {
      path: project,
      id: "repository:task-ui-fixture",
      aliases: ["fixture"],
    });
    const execution = consumedAuthorization(
      home,
      project,
      "repository:task-ui-fixture",
      "daily-task-loop",
    );
    const delivery = correctionDeliveryClient("daily-task-loop", execution);
    writeJson(
      join(home, "missions", "daily-task-loop", "runner-status.json"),
      delivery.status,
    );
    const handler = createWorkbenchRequestHandler({
      home,
      port: 4317,
      roots: [],
    }, delivery.client);

    const created = await post(handler, origin, "/api/tasks", {
      title: "Deliver a task correction",
      objective: "Keep one correction linked to its Mission input receipt",
      acceptance: ["The exact input receipt is retained on the correction"],
      nextActor: "agent",
      expectedSourceRevision: 0,
      project: "fixture",
      mission: "daily-task-loop",
    });
    const createdBody = await created.json();
    const taskId = createdBody.result.task.id as string;
    bindConsumedAuthorizationToTask(home, execution, createdBody.result.task);
    const linked = await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "link-execution",
      authorizationId: execution.authorizationId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    });
    expect(linked.status).toBe(200);
    const corrected = await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "correct",
      statement: "Keep task state primary and do not widen the implementation.",
      nextActor: "agent",
      expectedSourceRevision: 2,
      expectedRevision: 2,
    });
    const correctedBody = await corrected.json();
    const correctionId = correctedBody.result.task.corrections[0].id as string;

    const snapshotResponse = await handler(new Request(`${origin}/api/snapshot`));
    const snapshot = await snapshotResponse.json();
    const taskItem = snapshot.workItems.items.find(
      (item: { id: string }) => item.id === `principal-task:${taskId}`,
    );
    const candidate = taskItem.taskDetail.executionContext.correctionDeliveryCandidate;
    expect(candidate).toMatchObject({
      correctionId,
      authorizationId: execution.authorizationId,
      target: {
        missionId: "daily-task-loop",
        runnerId: "runner-daily-task-loop",
        expectedState: "running",
      },
    });

    const request = {
      kind: "deliver-correction",
      correctionId,
      authorizationId: execution.authorizationId,
      target: candidate.target,
      expectedSourceRevision: 3,
      expectedRevision: 3,
    };
    const delivered = await post(
      handler,
      origin,
      `/api/tasks/${taskId}/actions`,
      request,
    );
    expect(delivered.status).toBe(200);
    expect(await delivered.json()).toMatchObject({
      result: {
        sourceRevision: 4,
        task: {
          lifecycle: "open",
          nextActor: "agent",
          revision: 4,
          corrections: [{
            id: correctionId,
            deliveries: [{
              authorizationId: execution.authorizationId,
              missionId: "daily-task-loop",
              inputWatermark: 1,
              inputEventId: "event-task-correction-1",
              deliveredViaRunnerId: "runner-daily-task-loop",
            }],
          }],
        },
      },
    });
    expect(delivery.contributions).toHaveLength(1);
    expect(delivery.contributions[0]).toMatchObject({
      text: "Keep task state primary and do not widen the implementation.",
      attribution: {
        actorRef: "principal:local-workbench",
        sourceRef: `workbench-task:${taskId}/correction:${correctionId}`,
      },
    });

    const replay = await post(
      handler,
      origin,
      `/api/tasks/${taskId}/actions`,
      request,
    );
    expect(replay.status).toBe(200);
    expect((await replay.json()).result).toMatchObject({
      sourceRevision: 4,
      task: { revision: 4 },
    });
    expect(delivery.contributions).toHaveLength(1);
  });

  test("recovers only the task's latest exact interrupted execution", async () => {
    const { home, origin, root } = fixture();
    const project = projectWithMission(root);
    registerProject(home, {
      path: project,
      id: "repository:task-ui-fixture",
      aliases: ["fixture"],
    });
    const execution = consumedAuthorization(
      home,
      project,
      "repository:task-ui-fixture",
      "daily-task-loop",
    );
    const recovery = taskRecoveryClient("daily-task-loop", execution);
    writeJson(
      join(home, "missions", "daily-task-loop", "runner-status.json"),
      recovery.persistedStatus,
    );
    const handler = createWorkbenchRequestHandler({
      home,
      port: 4317,
      roots: [],
    }, recovery.client);

    const created = await post(handler, origin, "/api/tasks", {
      title: "Recover one interrupted task execution",
      objective: "Resume only the execution linked to this Workbench task",
      acceptance: ["A same-Mission task without the execution link cannot recover it"],
      nextActor: "agent",
      expectedSourceRevision: 0,
      project: "fixture",
      worktree: project,
      mission: "daily-task-loop",
    });
    const taskId = (await created.json()).result.task.id as string;
    bindConsumedAuthorizationToTask(
      home,
      execution,
      JSON.parse(readFileSync(principalTasksPath(home), "utf8")).tasks[0],
    );
    const linked = await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "link-execution",
      authorizationId: execution.authorizationId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    });
    expect(linked.status).toBe(200);

    const snapshot = await (
      await handler(new Request(`${origin}/api/snapshot`))
    ).json();
    const taskItem = snapshot.workItems.items.find(
      (item: { id: string }) => item.id === `principal-task:${taskId}`,
    );
    const candidate = taskItem.taskDetail.executionContext.recoveryCandidate;
    expect(candidate).toMatchObject({
      authorizationId: execution.authorizationId,
      proposalDigest: execution.proposalDigest,
      turn: {
        turnId: "turn-daily-task-loop",
        authorizationId: execution.authorizationId,
        proposalDigest: execution.proposalDigest,
        claimSourceRef: execution.claimSourceRef,
      },
      command: "resume",
      target: {
        missionId: "daily-task-loop",
        runnerId: "runner-daily-task-loop",
        expectedState: "interrupted",
      },
    });

    const recovered = await post(
      handler,
      origin,
      `/api/tasks/${taskId}/actions`,
      {
        kind: "recover-linked-execution",
        authorizationId: candidate.authorizationId,
        proposalDigest: candidate.proposalDigest,
        turn: candidate.turn,
        target: candidate.target,
        command: candidate.command,
        expectedSourceRevision: 2,
        expectedRevision: 2,
      },
    );
    expect(recovered.status).toBe(200);
    expect(recovery.recoveries).toEqual([{
      target: candidate.target,
      command: "resume",
    }]);

    const sameMission = await post(handler, origin, "/api/tasks", {
      title: "Same Mission without an execution link",
      objective: "Remain unable to recover another task's execution",
      acceptance: ["No recovery call is made"],
      nextActor: "agent",
      expectedSourceRevision: 2,
      project: "fixture",
      mission: "daily-task-loop",
    });
    const sameMissionTask = (await sameMission.json()).result.task;
    const rejected = await post(
      handler,
      origin,
      `/api/tasks/${sameMissionTask.id}/actions`,
      {
        kind: "recover-linked-execution",
        authorizationId: candidate.authorizationId,
        proposalDigest: candidate.proposalDigest,
        turn: candidate.turn,
        target: candidate.target,
        command: candidate.command,
        expectedSourceRevision: 3,
        expectedRevision: 1,
      },
    );
    expect(rejected.status).toBe(409);
    expect(await rejected.json()).toMatchObject({
      error: "invalid-transition",
    });
    expect(recovery.recoveries).toHaveLength(1);

    const staleSelector = await post(
      handler,
      origin,
      `/api/tasks/${taskId}/actions`,
      {
        kind: "recover-linked-execution",
        authorizationId: "22222222-2222-4222-8222-222222222222",
        proposalDigest: "f".repeat(64),
        turn: candidate.turn,
        target: candidate.target,
        command: candidate.command,
        expectedSourceRevision: 3,
        expectedRevision: 2,
      },
    );
    expect(staleSelector.status).toBe(409);
    expect(await staleSelector.json()).toMatchObject({
      error: "task-drift",
    });
    expect(recovery.recoveries).toHaveLength(1);

    recovery.setResumeAvailable(false);
    const unsupported = await post(
      handler,
      origin,
      `/api/tasks/${taskId}/actions`,
      {
        kind: "recover-linked-execution",
        authorizationId: candidate.authorizationId,
        proposalDigest: candidate.proposalDigest,
        turn: candidate.turn,
        target: candidate.target,
        command: candidate.command,
        expectedSourceRevision: 3,
        expectedRevision: 2,
      },
    );
    expect(unsupported.status).toBe(409);
    expect(await unsupported.json()).toMatchObject({
      error: "invalid-transition",
    });
    expect(recovery.recoveries).toHaveLength(1);
  });

  test("rejects recovery when final runtime lineage drifts after projection", async () => {
    const { home, origin, root } = fixture();
    const project = projectWithMission(root);
    registerProject(home, {
      path: project,
      id: "repository:task-ui-fixture",
      aliases: ["fixture"],
    });
    const execution = consumedAuthorization(
      home,
      project,
      "repository:task-ui-fixture",
      "daily-task-loop",
    );
    const recovery = taskRecoveryClient("daily-task-loop", execution);
    writeJson(
      join(home, "missions", "daily-task-loop", "runner-status.json"),
      recovery.persistedStatus,
    );
    const handler = createWorkbenchRequestHandler({
      home,
      port: 4317,
      roots: [],
    }, recovery.client);
    const created = await post(handler, origin, "/api/tasks", {
      title: "Reject a drifted recovery turn",
      objective: "Bind recovery to the exact final activity read",
      acceptance: ["Changed turn authorization prevents recovery"],
      nextActor: "agent",
      expectedSourceRevision: 0,
      project: "fixture",
      worktree: project,
      mission: "daily-task-loop",
    });
    const taskId = (await created.json()).result.task.id as string;
    bindConsumedAuthorizationToTask(
      home,
      execution,
      JSON.parse(readFileSync(principalTasksPath(home), "utf8")).tasks[0],
    );
    expect((await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "link-execution",
      authorizationId: execution.authorizationId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    })).status).toBe(200);

    const snapshot = await (
      await handler(new Request(`${origin}/api/snapshot`))
    ).json();
    const taskItem = snapshot.workItems.items.find(
      (item: { id: string }) => item.id === `principal-task:${taskId}`,
    );
    const candidate = taskItem.taskDetail.executionContext.recoveryCandidate;
    expect(candidate).not.toBeNull();

    recovery.driftAtNextActivityOffset(2);
    const rejected = await post(
      handler,
      origin,
      `/api/tasks/${taskId}/actions`,
      {
        kind: "recover-linked-execution",
        authorizationId: candidate.authorizationId,
        proposalDigest: candidate.proposalDigest,
        turn: candidate.turn,
        target: candidate.target,
        command: candidate.command,
        expectedSourceRevision: 2,
        expectedRevision: 2,
      },
    );
    expect(rejected.status).toBe(409);
    expect(await rejected.json()).toMatchObject({
      error: "task-drift",
      message: expect.stringContaining(
        "current turn changed before execution recovery",
      ),
    });
    expect(recovery.recoveries).toEqual([]);

    recovery.driftTaskContextAtNextActivityOffset(2);
    const taskContextRejected = await post(
      handler,
      origin,
      `/api/tasks/${taskId}/actions`,
      {
        kind: "recover-linked-execution",
        authorizationId: candidate.authorizationId,
        proposalDigest: candidate.proposalDigest,
        turn: candidate.turn,
        target: candidate.target,
        command: candidate.command,
        expectedSourceRevision: 2,
        expectedRevision: 2,
      },
    );
    expect(taskContextRejected.status).toBe(409);
    expect(await taskContextRejected.json()).toMatchObject({
      error: "task-drift",
      message: expect.stringContaining(
        "current turn changed before execution recovery",
      ),
    });
    expect(recovery.recoveries).toEqual([]);

    const claimPath = join(home, execution.claimSourceRef);
    const originalClaim = ExecutionAuthorizationClaimSchema.parse(
      JSON.parse(readFileSync(claimPath, "utf8")),
    );
    recovery.runBeforeNextActivityOffset(2, () => {
      writeJson(claimPath, ExecutionAuthorizationClaimSchema.parse({
        ...originalClaim,
        workbenchTaskContext: {
          ...originalClaim.workbenchTaskContext!,
          taskId: "another-task",
        },
      }));
    });
    const claimContextRejected = await post(
      handler,
      origin,
      `/api/tasks/${taskId}/actions`,
      {
        kind: "recover-linked-execution",
        authorizationId: candidate.authorizationId,
        proposalDigest: candidate.proposalDigest,
        turn: candidate.turn,
        target: candidate.target,
        command: candidate.command,
        expectedSourceRevision: 2,
        expectedRevision: 2,
      },
    );
    expect(claimContextRejected.status).toBe(409);
    expect(await claimContextRejected.json()).toMatchObject({
      error: "task-drift",
      message: expect.stringContaining(
        "authorization consumption changed before execution recovery",
      ),
    });
    expect(recovery.recoveries).toEqual([]);
    writeJson(claimPath, originalClaim);

    recovery.runBeforeNextActivityOffset(2, () => {
      writeJson(claimPath, ExecutionAuthorizationClaimSchema.parse({
        ...originalClaim,
        localEvidence: {
          ...originalClaim.localEvidence,
          worktree: realpathSync(home),
        },
      }));
    });
    const claimWorktreeRejected = await post(
      handler,
      origin,
      `/api/tasks/${taskId}/actions`,
      {
        kind: "recover-linked-execution",
        authorizationId: candidate.authorizationId,
        proposalDigest: candidate.proposalDigest,
        turn: candidate.turn,
        target: candidate.target,
        command: candidate.command,
        expectedSourceRevision: 2,
        expectedRevision: 2,
      },
    );
    expect(claimWorktreeRejected.status).toBe(409);
    expect(await claimWorktreeRejected.json()).toMatchObject({
      error: "task-drift",
      message: expect.stringContaining(
        "authorization consumption changed before execution recovery",
      ),
    });
    expect(recovery.recoveries).toEqual([]);
    writeJson(claimPath, originalClaim);
  });

  test("rejects recovery when the task Worktree is rebound after projection", async () => {
    const { home, origin, root } = fixture();
    const project = projectWithMission(root);
    const oldWorktree = join(root, "recovery-old-worktree");
    const newWorktree = join(root, "recovery-new-worktree");
    git(project, "worktree", "add", "-b", "task/recovery-old", oldWorktree);
    git(project, "worktree", "add", "-b", "task/recovery-new", newWorktree);
    registerProject(home, {
      path: project,
      id: "repository:task-ui-fixture",
      aliases: ["fixture"],
    });
    const execution = consumedAuthorization(
      home,
      oldWorktree,
      "repository:task-ui-fixture",
      "daily-task-loop",
    );
    const recovery = taskRecoveryClient("daily-task-loop", execution);
    writeJson(
      join(home, "missions", "daily-task-loop", "runner-status.json"),
      recovery.persistedStatus,
    );
    const controlPlane = createLocalTaskControlPlane(home);
    const handler = createWorkbenchRequestHandler({
      home,
      port: 4317,
      roots: [],
    }, recovery.client, { localTaskControlPlane: controlPlane });
    const created = await post(handler, origin, "/api/tasks", {
      title: "Reject recovery after Worktree rebind",
      objective: "Keep recovery bound to the current task Worktree",
      acceptance: ["A post-projection rebind prevents old execution recovery"],
      nextActor: "agent",
      expectedSourceRevision: 0,
      project: "fixture",
      worktree: oldWorktree,
      mission: "daily-task-loop",
    });
    const taskId = (await created.json()).result.task.id as string;
    bindConsumedAuthorizationToTask(
      home,
      execution,
      controlPlane.show(taskId).task,
    );
    expect((await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "link-execution",
      authorizationId: execution.authorizationId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    })).status).toBe(200);

    const snapshot = await (
      await handler(new Request(`${origin}/api/snapshot`))
    ).json();
    const taskItem = snapshot.workItems.items.find(
      (item: { id: string }) => item.id === `principal-task:${taskId}`,
    );
    const candidate = taskItem.taskDetail.executionContext.recoveryCandidate;
    expect(candidate).not.toBeNull();

    recovery.runBeforeNextActivityOffset(2, () => {
      controlPlane.execute({
        kind: "rebind-worktree",
        arguments: {
          id: taskId,
          expectedWorktreePath: realpathSync(oldWorktree),
          worktree: newWorktree,
          sourceRef: "test:concurrent-worktree-rebind",
          expectedSourceRevision: 2,
          expectedRevision: 2,
        },
      });
    });
    const rejected = await post(
      handler,
      origin,
      `/api/tasks/${taskId}/actions`,
      {
        kind: "recover-linked-execution",
        authorizationId: candidate.authorizationId,
        proposalDigest: candidate.proposalDigest,
        turn: candidate.turn,
        target: candidate.target,
        command: candidate.command,
        expectedSourceRevision: 2,
        expectedRevision: 2,
      },
    );
    expect(rejected.status).toBe(409);
    expect(await rejected.json()).toMatchObject({
      error: "task-drift",
      message: expect.stringContaining(
        "source or Worktree changed before execution recovery",
      ),
    });
    expect(controlPlane.show(taskId).task.binding).toMatchObject({
      worktreePath: realpathSync(newWorktree),
    });
    expect(recovery.recoveries).toEqual([]);
  });

  test("submits and accepts a result only against the current Autonomy verification selector", async () => {
    const { home, origin, root } = fixture();
    const project = projectWithMission(root);
    registerProject(home, {
      path: project,
      id: "repository:task-ui-fixture",
      aliases: ["fixture"],
    });
    const execution = consumedAuthorization(
      home,
      project,
      "repository:task-ui-fixture",
      "daily-task-loop",
    );
    const verified = verifiedExecutionClient(
      "daily-task-loop",
      project,
      execution,
    );
    writeJson(
      join(home, "missions", "daily-task-loop", "runner-status.json"),
      verified.status,
    );
    const handler = createWorkbenchRequestHandler({
      home,
      port: 4317,
      roots: [],
    }, verified.client);
    const created = await post(handler, origin, "/api/tasks", {
      title: "Return a verified Agent result",
      objective: "Keep runtime verification distinct from Agent references",
      acceptance: ["The exact Autonomy selector is retained and rechecked"],
      nextActor: "agent",
      expectedSourceRevision: 0,
      project: "fixture",
      worktree: project,
      mission: "daily-task-loop",
    });
    const taskId = (await created.json()).result.task.id as string;
    bindConsumedAuthorizationToTask(
      home,
      execution,
      JSON.parse(readFileSync(principalTasksPath(home), "utf8")).tasks[0],
    );
    const linked = await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "link-execution",
      authorizationId: execution.authorizationId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    });
    expect(linked.status).toBe(200);

    const snapshot = await (
      await handler(new Request(`${origin}/api/snapshot`))
    ).json();
    expect(snapshot.errors).toEqual([]);
    const taskItem = snapshot.workItems.items.find(
      (item: { id: string }) => item.id === `principal-task:${taskId}`,
    );
    expect(taskItem.taskDetail.executionContext.currentEffect.standing).toBe(
      "exact",
    );
    expect(taskItem.taskDetail.task.binding.worktreePath).toBe(
      realpathSync(project),
    );
    expect(snapshot.runners[0].activity.currentEffect.workspace.root).toBe(
      project,
    );
    expect(snapshot.runners[0].activity.currentVerifiedResult).toEqual({
      standing: "verified-current",
      selector: verified.selector,
    });
    const candidate =
      taskItem.taskDetail.executionContext.verifiedResultCandidate;
    expect(candidate).toEqual({
      authorizationId: execution.authorizationId,
      selector: verified.selector,
      evidenceRefs: [
        join(
          realpathSync(home),
          "missions",
          "daily-task-loop",
          "runner-status.json",
        ),
        execution.claimSourceRef,
      ],
    });

    const submitted = await post(
      handler,
      origin,
      `/api/tasks/${taskId}/actions`,
      {
        kind: "submit-verified-execution",
        summary: "The Agent result passed the current runtime verification.",
        authorizationId: execution.authorizationId,
        selector: verified.selector,
        expectedSourceRevision: 2,
        expectedRevision: 2,
      },
    );
    expect(submitted.status).toBe(200);
    expect(await submitted.json()).toMatchObject({
      result: {
        sourceRevision: 3,
        task: {
          lifecycle: "verifying",
          nextActor: "principal",
          revision: 3,
          resultClaims: [{
            evidence: {
              kind: "runtime-verified-effect",
              authorizationId: execution.authorizationId,
              selector: verified.selector,
            },
            evidenceRefs: [
              join(
                realpathSync(home),
                "missions",
                "daily-task-loop",
                "runner-status.json",
              ),
              execution.claimSourceRef,
            ],
          }],
        },
      },
    });

    verified.setVerificationCurrent(false);
    const delegate = createLocalTaskControlPlane(home);
    let acceptAttempts = 0;
    const sourceFailureControlPlane: LocalTaskControlPlane = {
      list: () => delegate.list(),
      show: (id) => delegate.show(id),
      execute(command) {
        if (command.kind === "accept") {
          acceptAttempts += 1;
          throw new LocalTaskControlError(
            "source-unavailable",
            "opaque typed storage fracture",
          );
        }
        return delegate.execute(command);
      },
    };
    const sourceFailureHandler = createWorkbenchRequestHandler({
      home,
      port: 4317,
      roots: [],
    }, verified.client, {
      localTaskControlPlane: sourceFailureControlPlane,
    });
    const staleAcceptance = await post(
      sourceFailureHandler,
      origin,
      `/api/tasks/${taskId}/actions`,
      {
        kind: "accept",
        expectedSourceRevision: 3,
        expectedRevision: 3,
      },
    );
    expect(staleAcceptance.status).toBe(409);
    expect(await staleAcceptance.json()).toMatchObject({
      error: "task-drift",
    });
    expect(acceptAttempts).toBe(0);

    verified.setVerificationCurrent(true);
    const sourceFailure = await post(
      sourceFailureHandler,
      origin,
      `/api/tasks/${taskId}/actions`,
      {
        kind: "accept",
        expectedSourceRevision: 3,
        expectedRevision: 3,
      },
    );
    expect(sourceFailure.status).toBe(503);
    expect(await sourceFailure.json()).toEqual({
      error: "source-unavailable",
      message: "opaque typed storage fracture",
    });
    expect(acceptAttempts).toBe(1);

    const accepted = await post(
      handler,
      origin,
      `/api/tasks/${taskId}/actions`,
      {
        kind: "accept",
        expectedSourceRevision: 3,
        expectedRevision: 3,
      },
    );
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toMatchObject({
      result: {
        sourceRevision: 4,
        task: {
          lifecycle: "settled",
          resultClaims: [{
            standing: "accepted",
            resolution: {
              kind: "accepted",
              basis: "runtime-verified-effect",
              acceptanceBoundary: "workbench-local-task-only",
            },
          }],
        },
      },
    });
  });

  test("enforces same-origin, JSON, size, and optimistic revision boundaries", async () => {
    const { handler, origin } = fixture();
    const request = {
      title: "Boundary test",
      objective: "Reject unsafe task writes",
      acceptance: ["Every mutation is exact"],
      nextActor: "principal",
      expectedSourceRevision: 0,
    };

    const wrongOrigin = await post(
      handler,
      origin,
      "/api/tasks",
      request,
      { Origin: "http://127.0.0.1:9999" },
    );
    expect(wrongOrigin.status).toBe(403);

    const missingOrigin = await handler(new Request(`${origin}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }));
    expect(missingOrigin.status).toBe(403);

    const forgedRequestOrigin = await handler(new Request(
      "http://localhost:4317/api/tasks",
      {
        method: "POST",
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      },
    ));
    expect(forgedRequestOrigin.status).toBe(403);

    const wrongType = await handler(new Request(`${origin}/api/tasks`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "text/plain" },
      body: JSON.stringify(request),
    }));
    expect(wrongType.status).toBe(415);

    const tooLarge = await post(
      handler,
      origin,
      "/api/tasks",
      request,
      { "Content-Length": String(64 * 1024 + 1) },
    );
    expect(tooLarge.status).toBe(413);

    const created = await post(handler, origin, "/api/tasks", request);
    const createdBody = await created.json();
    const stale = await post(
      handler,
      origin,
      `/api/tasks/${createdBody.result.task.id}/actions`,
      {
        kind: "assign",
        nextActor: "agent",
        expectedSourceRevision: 0,
        expectedRevision: 1,
      },
    );
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({ error: "task-drift" });
  });

  test.each(["missing", "malformed"])(
    "returns source-unavailable instead of blaming a user action when the task source is %s",
    async (condition) => {
      const { handler, home, origin } = fixture();
      if (condition === "missing") {
        rmSync(principalTasksPath(home));
      } else {
        writeFileSync(principalTasksPath(home), "{not-json", "utf8");
      }

      const response = await post(handler, origin, "/api/tasks", {
        title: "Unavailable source",
        objective: "Do not misclassify source failure",
        acceptance: ["The response is a 5xx source failure"],
        nextActor: "principal",
        expectedSourceRevision: 0,
      });
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        error: "source-unavailable",
      });
    },
  );

  test.each(["missing", "malformed"])(
    "marks the snapshot incomplete when the Principal task source is %s",
    async (condition) => {
      const { handler, home, origin } = fixture();
      if (condition === "missing") {
        rmSync(principalTasksPath(home));
      } else {
        writeFileSync(principalTasksPath(home), "{not-json", "utf8");
      }

      const response = await handler(new Request(`${origin}/api/snapshot`));
      expect(response.status).toBe(200);
      const snapshot = await response.json();
      expect(snapshot.complete).toBeFalse();
      expect(snapshot.workItems.capabilities.independentTasks).toMatchObject({
        standing: "unavailable",
        count: null,
        sourceRevision: null,
      });
      expect(snapshot.errors).toContainEqual(expect.objectContaining({
        scope: "home",
        source: principalTasksPath(home),
      }));
    },
  );

  test("projects owner-backed attempt facts without mutating sources or retaining stale final facts", async () => {
    const { handler, home, origin, root } = fixture();
    const project = projectWithMission(root);
    const worktree = join(root, "attempt-worktree");
    git(project, "worktree", "add", "-b", "task/attempt-ui", worktree);
    registerProject(home, {
      path: project,
      id: "repository:task-ui-fixture",
      aliases: ["fixture"],
    });
    const created = await post(handler, origin, "/api/tasks", {
      title: "Inspect an ordinary task attempt",
      objective: "Project existing owner evidence into the Task detail",
      acceptance: ["No attempt source bytes change during GET"],
      nextActor: "agent",
      expectedSourceRevision: 0,
      project: "fixture",
      worktree,
    });
    expect(created.status).toBe(200);
    const taskId = (await created.json()).result.task.id as string;
    const attempt = runPrincipalTask(home, {
      id: taskId,
      driver: "opencode-cli",
      model: "deepseek/deepseek-v4-flash",
      variant: "low",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, retainedAttemptRunner());
    const sourcePaths = [
      principalTasksPath(home),
      attempt.inputRef,
      attempt.attemptRef,
      attempt.finalRecordRef,
      attempt.settlementRef,
    ].map((source) => isAbsolute(source) ? source : join(home, source));
    const before = sourcePaths.map((source) => readFileSync(source));

    const response = await handler(new Request(`${origin}/api/snapshot`));
    expect(response.status).toBe(200);
    const snapshot = await response.json();
    const taskItem = snapshot.workItems.items.find(
      (item: { id: string }) => item.id === `principal-task:${taskId}`,
    );
    const projected = taskItem.taskDetail.attempts;
    expect(projected).toMatchObject({
      standing: "available",
      sourceRef: "state/task-attempts",
      attempts: [{
        attemptId: attempt.attemptId,
        driver: "opencode-cli",
        model: "deepseek/deepseek-v4-flash",
        variant: "low",
        observedSession: "session-ui-attempt",
        cellStatus: "passed",
        status: "recorded",
        usage: { totalTokens: 160 },
        workspaceDiff: {
          added: ["evidence/new.txt"],
          changed: ["src/existing.ts"],
          removed: [],
        },
        verification: { passed: true, terminal: { passed: true } },
        evidence: {
          attempt: { standing: "available" },
          finalRecord: { standing: "available" },
          settlement: { standing: "available" },
        },
      }],
    });
    expect(projected.attempts[0]).not.toHaveProperty("trace");
    expect(projected.attempts[0]).not.toHaveProperty("rawSteps");
    expect(taskItem.taskDetail.task.resultClaims).toEqual([]);
    sourcePaths.forEach((source, index) => {
      expect(readFileSync(source)).toEqual(before[index]!);
    });

    const finalPath = join(home, attempt.finalRecordRef);
    writeFileSync(finalPath, "{}\n");
    const invalidFinalBytes = readFileSync(finalPath);
    const refreshed = await (
      await handler(new Request(`${origin}/api/snapshot`))
    ).json();
    const refreshedTask = refreshed.workItems.items.find(
      (item: { id: string }) => item.id === `principal-task:${taskId}`,
    );
    const refreshedAttempt = refreshedTask.taskDetail.attempts.attempts[0];
    expect(refreshedAttempt.status).toBe("recorded");
    expect(refreshedAttempt.evidence.finalRecord.standing).toBe("invalid");
    expect(refreshedAttempt).not.toHaveProperty("observedSession");
    expect(refreshedAttempt).not.toHaveProperty("cellStatus");
    expect(refreshedAttempt).not.toHaveProperty("usage");
    expect(refreshedAttempt).not.toHaveProperty("workspaceDiff");
    expect(refreshedAttempt).not.toHaveProperty("verification");
    expect(readFileSync(finalPath)).toEqual(invalidFinalBytes);
  });

  test("distinguishes an available empty attempt source from an unavailable source", async () => {
    const { handler, home, origin } = fixture();
    const created = await post(handler, origin, "/api/tasks", {
      title: "Task without an attempt",
      objective: "Keep empty history distinct from a failed owner read",
      acceptance: ["The Task stays visible in both cases"],
      nextActor: "principal",
      expectedSourceRevision: 0,
    });
    const taskId = (await created.json()).result.task.id as string;
    const taskBytes = readFileSync(principalTasksPath(home));

    const emptyResponse = await handler(new Request(`${origin}/api/snapshot`));
    expect(emptyResponse.status).toBe(200);
    const emptySnapshot = await emptyResponse.json();
    const emptyTask = emptySnapshot.workItems.items.find(
      (item: { id: string }) => item.id === `principal-task:${taskId}`,
    );
    expect(emptyTask.taskDetail.attempts).toEqual({
      standing: "available",
      sourceRef: "state/task-attempts",
      attempts: [],
    });
    expect(readFileSync(principalTasksPath(home))).toEqual(taskBytes);

    const attemptsRoot = join(home, "state", "task-attempts");
    writeFileSync(attemptsRoot, "owner source unavailable\n");
    const unavailableBytes = readFileSync(attemptsRoot);
    const unavailableResponse = await handler(
      new Request(`${origin}/api/snapshot`),
    );
    expect(unavailableResponse.status).toBe(200);
    const unavailableSnapshot = await unavailableResponse.json();
    const unavailableTask = unavailableSnapshot.workItems.items.find(
      (item: { id: string }) => item.id === `principal-task:${taskId}`,
    );
    expect(unavailableTask.taskDetail.attempts).toMatchObject({
      standing: "unavailable",
      sourceRef: "state/task-attempts",
      reason: expect.any(String),
    });
    expect(readFileSync(principalTasksPath(home))).toEqual(taskBytes);
    expect(readFileSync(attemptsRoot)).toEqual(unavailableBytes);
  });
});
