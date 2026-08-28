import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  PROJECT_LENS_LOCAL_EXCLUDE_PATHS,
  PROJECT_LENS_LOCAL_READ_PATHS,
  PROJECT_LENS_PROVIDER_READ_PATHS,
  PROJECT_LENS_EXECUTION_IDENTITY,
  createMissionRuntime,
  currentProjectLensRuntimeDigest,
  materializeProjectLensCandidate,
  missionRuntimeRecoveryCapabilities,
  projectLensAuthorizationContract,
  projectLensCall,
  projectLensCell,
  projectLensExecutionProposal,
  projectLensProviderWorkspace,
  materializeFinishedRun,
} from "../project-lens-runtime";
import {
  PROJECT_LENS_MATERIALIZER_REF,
  PROJECT_LENS_OUTPUT_PATH,
} from "../project-lens-effect-verifier";
import { FileMissionTimeline } from "../../../apps/autonomy/src/delegate-timeline";
import { FileEffectJournal } from "../../../apps/autonomy/src/effect-journal";
import { projectMissionActivity } from "../../../apps/autonomy/src/mission-activity";
import { missionRunnerDirectory } from "../../../apps/autonomy/src/mission-runner";
import { MISSION_TURN_VERSION } from "../../../apps/autonomy/src/mission-turn";
import {
  executionAuthorizationReceiptPath,
  type ExecutionAuthorizationReceipt,
} from "../../../apps/workbench/src/execution-authorization";
import { missionExecutionProposalDigest } from "../../../apps/workbench/src/mission-execution-proposal";
import { CurrentEffectProjectionSchema } from "../../../apps/workbench/src/ui/projection";
import {
  WORKBENCH_TASK_EXECUTION_CONTEXT_ENV,
  WorkbenchTaskExecutionContextSchema,
  workbenchTaskExecutionContextRef,
} from "../../../apps/workbench/src/task-execution-context";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the Mission contract separates complete local traversal from external provider input", () => {
  const contract = projectLensAuthorizationContract("repository:skills-test");
  const proposal = projectLensExecutionProposal();
  const provider = projectLensProviderWorkspace("/candidate");

  expect(missionRuntimeRecoveryCapabilities).toEqual({
    resume: false,
    replace: false,
  });
  expect(contract.runtimeDigest).toBe(currentProjectLensRuntimeDigest());
  expect(PROJECT_LENS_EXECUTION_IDENTITY).toEqual({
    proposalId: "project-lens-dogfood-v6",
    wholeRevision: "project-lens-dogfood-v6",
    referenceProfile: {
      id: "project-lens-focus-selector-v1",
      revision: "2026-08-12-project-lens-dogfood-v6",
    },
  });
  expect(contract.proposalId).toBe(PROJECT_LENS_EXECUTION_IDENTITY.proposalId);
  expect(contract.scope).toEqual({
    readPaths: [...PROJECT_LENS_LOCAL_READ_PATHS],
    excludePaths: [...PROJECT_LENS_LOCAL_EXCLUDE_PATHS],
    writePaths: [
      "experiments/human-agent-visualization/generated/project-evidence-bundle.json",
    ],
    commands: [],
  });
  expect(provider.readPaths).toEqual([...PROJECT_LENS_PROVIDER_READ_PATHS]);
  expect(provider.writePaths).toEqual([]);
  expect(provider.allowedCommands).toEqual([]);
  if (!("readPaths" in contract.scope)) {
    throw new Error("Project Lens requires a v2 execution scope");
  }
  expect(new Set(provider.readPaths)).not.toEqual(new Set(contract.scope.readPaths));
  expect(contract.externalDisclosure.dataCategories.join("\n"))
    .toContain(PROJECT_LENS_PROVIDER_READ_PATHS.join(", "));
  expect(proposal.pendingDecisions).toHaveLength(1);
  expect(contract.requiredChoices).toEqual([{
    decisionId: "external-disclosure",
    replyKey: "ALLOW",
  }]);
  const hold = proposal.pendingDecisions[0]!.options.find(
    (option) => option.replyKey === "HOLD",
  );
  expect(hold?.immediateResult).toContain("Do not disclose");
  expect(hold?.immediateResult).toContain("release budget or write authority");
  expect(hold?.immediateResult).toContain("start the runtime");
});

test("the Mission proposal is semantically bound to the loaded runtime bytes", () => {
  const mission = JSON.parse(readFileSync(join(
    import.meta.dir,
    "../../../apps/missions/project-lens-dogfood.json",
  ), "utf8"));
  expect(mission.executionProposal).toEqual(projectLensExecutionProposal());
  expect(mission.executionProposal.proposalId).toBe("project-lens-dogfood-v6");
  expect(mission.executionProposal.runtimeDigest)
    .toBe(currentProjectLensRuntimeDigest());
  expect(missionExecutionProposalDigest(mission.executionProposal))
    .toBe("6fd4e91a9e7b79f69c696978779c1ee47cfc4d29fd2f1876657767a8e0d598bc");
});

test("the provider call consumes the exact task objective, correction, and acceptance", () => {
  const context = WorkbenchTaskExecutionContextSchema.parse({
    version: "rosso.workbench-task-execution-context.v1",
    taskId: "11111111-1111-4111-8111-111111111111",
    taskRevision: 11,
    objective: "Run one truthful Project Lens dogfood candidate.",
    acceptance: ["The output stays an unaccepted local projection."],
    corrections: [{
      id: "22222222-2222-4222-8222-222222222222",
      statement: "focusSources is explanation order, not read authorization.",
      sourceRef: "workbench-task:correction:test",
    }],
    binding: {
      projectId: "repository:skills-test",
      missionId: "project-lens-dogfood",
    },
    execution: {
      authorizationId: "33333333-3333-4333-8333-333333333333",
      proposalDigest: "a".repeat(64),
    },
  });
  const call = projectLensCall(context);

  expect(call.task).toContain(context.objective);
  expect(call.task).toContain(context.corrections[0]!.id);
  expect(call.task).toContain(context.corrections[0]!.statement);
  expect(call.acceptance).toContain(context.acceptance[0]!);
  expect(call.sourceRefs).toContain(context.corrections[0]!.sourceRef);
  expect(call.sourceRefs).toContain(
    `workbench-task:${context.taskId}@${context.taskRevision}`,
  );
});

test("the prepared Project Lens Cell uses the accepted execution reference profile", () => {
  const context = taskContext(
    "33333333-3333-4333-8333-333333333333",
    "a".repeat(64),
  );
  const cell = projectLensCell("/candidate", projectLensCall(context));

  expect(cell.executionProfile.id)
    .toBe(PROJECT_LENS_EXECUTION_IDENTITY.referenceProfile.id);
});

test("the runtime waits for a reconciled anchor and then consumes the task-bound authorization once", async () => {
  const fixture = authorizationFixture();
  const previous = {
    root: process.env.ROSSO_PROJECT_LENS_EFFECT_ROOT,
    receipt: process.env.ROSSO_PROJECT_LENS_AUTHORIZATION_RECEIPT,
    task: process.env[WORKBENCH_TASK_EXECUTION_CONTEXT_ENV],
    key: process.env.DEEPSEEK_API_KEY,
  };
  process.env.ROSSO_PROJECT_LENS_EFFECT_ROOT = fixture.worktree;
  process.env.ROSSO_PROJECT_LENS_AUTHORIZATION_RECEIPT = fixture.receiptPath;
  process.env[WORKBENCH_TASK_EXECUTION_CONTEXT_ENV] = JSON.stringify(
    taskContext(fixture.receipt.authorizationId, fixture.receipt.proposalDigest),
  );
  process.env.DEEPSEEK_API_KEY = "test-only-not-sent";
  try {
    await expect(createMissionRuntime({
      root: fixture.home,
      missionId: "project-lens-dogfood",
      timeline: { latestReconciledAnchor: async () => undefined },
    } as unknown as Parameters<typeof createMissionRuntime>[0])).rejects.toThrow(
      "requires the fresh reconciled Mission anchor",
    );
    expect(claimExists(fixture)).toBe(false);

    const prepared = await createMissionRuntime({
      root: fixture.home,
      missionId: "project-lens-dogfood",
      timeline: {
        latestReconciledAnchor: async () => ({
          id: "intent:project-lens-dogfood",
          revision: "r1",
          statement: "Run one supervised Project Lens dogfood candidate.",
          sourceRefs: ["principal:test"],
          reconciledWatermark: 0,
        }),
      },
    } as unknown as Parameters<typeof createMissionRuntime>[0]);
    expect(prepared.turn.workbenchTaskContext?.taskId)
      .toBe("11111111-1111-4111-8111-111111111111");
    expect(claimExists(fixture)).toBe(true);
    prepared.controller.cancel("test complete");
  } finally {
    restoreEnvironment("ROSSO_PROJECT_LENS_EFFECT_ROOT", previous.root);
    restoreEnvironment("ROSSO_PROJECT_LENS_AUTHORIZATION_RECEIPT", previous.receipt);
    restoreEnvironment(WORKBENCH_TASK_EXECUTION_CONTEXT_ENV, previous.task);
    restoreEnvironment("DEEPSEEK_API_KEY", previous.key);
  }
});

test("the real builder reads an allowed counterexample and excludes a nested build counterexample", async () => {
  const root = mkdtempSync(join(tmpdir(), "project-lens-runtime-"));
  roots.push(root);
  mkdirSync(join(root, "src", "build"), { recursive: true });
  writeFileSync(join(root, "README.md"), "# Fixture\n\nA fixture repository for Project Lens.\n");
  writeFileSync(join(root, "AGENTS.md"), "# Instructions\n");
  writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { test: "bun test" } }));
  writeFileSync(join(root, "src", "visible.txt"), "visible-v1\n");
  writeFileSync(join(root, "src", "build", "hidden.txt"), "hidden-v1\n");
  git(root, ["init"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Project Lens Test"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "fixture"]);

  const first = await materializeProjectLensCandidate(root, ["README.md"]);
  const bundle = JSON.parse(readFileSync(first.outputPath, "utf8"));
  expect(first.outputPath).toBe(join(
    root,
    "experiments/human-agent-visualization/generated/project-evidence-bundle.json",
  ));
  expect(bundle.subject.focusSources).toEqual(["README.md"]);
  expect(bundle.projection.observedFiles).toBe(4);

  writeFileSync(join(root, "src", "build", "hidden.txt"), "hidden-v2\n");
  const hiddenChanged = await materializeProjectLensCandidate(root, ["README.md"]);
  expect(hiddenChanged.subjectRevision).toBe(first.subjectRevision);

  writeFileSync(join(root, "src", "visible.txt"), "visible-v2\n");
  const visibleChanged = await materializeProjectLensCandidate(root, ["README.md"]);
  expect(visibleChanged.subjectRevision).not.toBe(first.subjectRevision);
});

test("the Project Lens effect projects the host materializer as writer and the Cell as source lineage before settlement", async () => {
  const fixture = projectLensEffectFixture();
  const effectId = "project-lens-turn-prepared:batch:1";
  const runId = "project-lens-focus-run-prepared";
  const cellId = "project-lens-focus-selection";
  const task = taskContext(
    "33333333-3333-4333-8333-333333333333",
    "a".repeat(64),
  );
  const turn = projectLensTurn("project-lens-turn-prepared", task);
  const runnerRoot = missionRunnerDirectory(fixture.home, "project-lens-dogfood");
  const timeline = new FileMissionTimeline(runnerRoot);
  await timeline.startTurn("project-lens-dogfood", turn);
  writeFileSync(timeline.timelinePath(turn.turnId), `${JSON.stringify({
    version: "rosso.delegate-timeline-event.v1",
    eventId: randomUUID(),
    timelineId: turn.turnId,
    sequence: 0,
    at: "2026-08-12T10:00:00Z",
    type: "delegate.batch-prepared",
    data: {
      batchId: effectId,
      checkpointDigest: "f".repeat(64),
      checkpoint: {},
      children: [{ callId: "call-1", key: "focus", timelineId: "child-1" }],
    },
  })}\n`, { flag: "a" });
  const journal = new FileEffectJournal(runnerRoot);
  await journal.prepare(effectId, {
    missionId: "project-lens-dogfood",
    turnId: turn.turnId,
    cellId,
    writerRef: PROJECT_LENS_MATERIALIZER_REF,
    worktree: {
      root: fixture.worktree,
      baseHead: fixture.head,
      baselineDigest: "f".repeat(64),
    },
    writePaths: [PROJECT_LENS_OUTPUT_PATH],
    allowedCommands: [],
    authority: "withheld",
    launchAuthorizationRef: turn.launchAuthorizationRef,
    workbenchTaskContext: turn.workbenchTaskContext,
  });

  const prepared = await projectMissionActivity(
    fixture.home,
    "project-lens-dogfood",
  );
  expect(prepared.currentEffect).toMatchObject({
    phase: "prepared",
    writer: { ref: PROJECT_LENS_MATERIALIZER_REF },
    source: { cellId, runId: null },
  });

  await journal.start(effectId);
  await journal.observeRun(effectId, runId);
  const executing = await projectMissionActivity(
    fixture.home,
    "project-lens-dogfood",
  );
  expect(executing.currentEffect).toMatchObject({
    phase: "executing",
    writer: { ref: PROJECT_LENS_MATERIALIZER_REF },
    source: { cellId, runId },
  });

  await journal.uncertain(effectId, {
    reason: "effect-observation-incomplete",
    evidenceRefs: ["test:pre-settlement-failure"],
  });
  const uncertain = await projectMissionActivity(
    fixture.home,
    "project-lens-dogfood",
  );
  expect(uncertain.currentEffect).toMatchObject({
    phase: "uncertain",
    writer: { ref: PROJECT_LENS_MATERIALIZER_REF },
    source: { cellId, runId },
    uncertain: true,
  });
});

test("a finished Project Lens run settles and independently verifies exactly one host-owned ignored artifact", async () => {
  const fixture = projectLensEffectFixture();
  const effectId = "project-lens-turn-test:batch:1";
  const runId = "project-lens-focus-run-test";
  const cellId = "project-lens-focus-selection";
  const task = taskContext(
    "33333333-3333-4333-8333-333333333333",
    "a".repeat(64),
  );
  const turn = projectLensTurn("project-lens-turn-test", task);
  const timeline = new FileMissionTimeline(
    missionRunnerDirectory(fixture.home, "project-lens-dogfood"),
  );
  await timeline.startTurn("project-lens-dogfood", turn);
  writeFileSync(timeline.timelinePath(turn.turnId), `${JSON.stringify({
    version: "rosso.delegate-timeline-event.v1",
    eventId: randomUUID(),
    timelineId: turn.turnId,
    sequence: 0,
    at: "2026-08-12T11:00:00Z",
    type: "delegate.batch-prepared",
    data: {
      batchId: effectId,
      checkpointDigest: "f".repeat(64),
      checkpoint: {},
      children: [{ callId: "call-1", key: "focus", timelineId: "child-1" }],
    },
  })}\n`, { flag: "a" });
  const resultTimeline = {
    readResult: async () => ({
      receipt: { projection: "full" },
      semantic: { output: {
        status: "completed",
        focusSources: ["README.md"],
        rationale: "Begin with the declared purpose.",
        remainingUncertainty: "Architecture remains source-bound.",
      } },
    }),
  } as unknown as FileMissionTimeline;
  const run = {
    batches: [{
      id: effectId,
      outcomes: [{
        key: "project-lens-focus-selection",
        cellId,
        status: "completed",
        runId,
      }],
    }],
  } as never;

  await materializeFinishedRun(
    resultTimeline,
    fixture.home,
    "project-lens-dogfood",
    turn,
    task,
    run,
    fixture.worktree,
  );
  await timeline.settleTurn("project-lens-dogfood", turn.turnId, {
    kind: "finished",
    runStatus: "returned",
    text: "Project Lens candidate returned.",
    tasks: [],
    uncoveredObligationRefs: [],
    resultReads: [],
    usage: zeroUsage(),
  });

  const journal = new FileEffectJournal(
    missionRunnerDirectory(fixture.home, "project-lens-dogfood"),
  );
  const effect = await journal.activity(effectId);
  expect(effect).toMatchObject({
    state: "settled",
    runId,
    prepared: {
      missionId: "project-lens-dogfood",
      turnId: turn.turnId,
      cellId,
      writerRef: PROJECT_LENS_MATERIALIZER_REF,
      launchAuthorizationRef: turn.launchAuthorizationRef,
      workbenchTaskContext: turn.workbenchTaskContext,
      writePaths: [PROJECT_LENS_OUTPUT_PATH],
      allowedCommands: [],
      authority: "withheld",
    },
    settlement: {
      changedPaths: [PROJECT_LENS_OUTPUT_PATH],
      outsideScope: { verdict: "clear", paths: [] },
      acceptance: {
        mechanical: { verdict: "passed" },
        independent: { verdict: "not-run" },
        principal: { verdict: "withheld" },
      },
      materializedBundle: {
        path: PROJECT_LENS_OUTPUT_PATH,
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        tracking: "ignored",
      },
    },
    independentVerification: {
      verdict: "passed",
      subject: {
        gitHead: fixture.head,
        files: [{
          path: PROJECT_LENS_OUTPUT_PATH,
          sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        }],
      },
    },
  });
  expect(effect?.tools).toEqual([]);

  const activity = await projectMissionActivity(
    fixture.home,
    "project-lens-dogfood",
  );
  expect(activity.currentTurn).toMatchObject({
    state: "settled",
    settlementKind: "finished",
    runStatus: "returned",
  });
  expect(activity.currentEffect).toMatchObject({
    effectId,
    phase: "settled",
    writer: {
      ref: PROJECT_LENS_MATERIALIZER_REF,
    },
    source: {
      cellId,
      runId,
    },
    diff: {
      added: [],
      outsideScope: [],
    },
    verification: { independent: { verdict: "passed" } },
    stale: false,
    uncertain: false,
  });
  expect(CurrentEffectProjectionSchema.parse(activity.currentEffect))
    .toEqual(activity.currentEffect);
  expect(activity.currentVerifiedResult).toEqual({
    standing: "verified-current",
    selector: {
      kind: "autonomy-effect-verification.v1",
      effectId,
      verificationEventId: effect!.independentVerificationEventId,
    },
  });

  writeFileSync(
    join(fixture.worktree, PROJECT_LENS_OUTPUT_PATH),
    "{\"drifted\":true}\n",
  );
  const driftedActivity = await projectMissionActivity(
    fixture.home,
    "project-lens-dogfood",
  );
  expect(driftedActivity.currentEffect?.stale).toBe(true);
  expect(driftedActivity.currentVerifiedResult).toBeNull();
});

function git(root: string, args: readonly string[]): void {
  const result = Bun.spawnSync(["git", "-C", root, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.toString() || `git ${args.join(" ")} failed`);
  }
}

function projectLensEffectFixture() {
  const root = mkdtempSync(join(tmpdir(), "project-lens-effect-"));
  roots.push(root);
  const worktree = join(root, "candidate");
  const home = join(root, "rosso-home");
  mkdirSync(worktree, { recursive: true });
  mkdirSync(home, { recursive: true });
  mkdirSync(join(worktree, "experiments/human-agent-visualization"), {
    recursive: true,
  });
  writeFileSync(join(worktree, "README.md"), "# Project Lens effect fixture\n");
  writeFileSync(join(worktree, "AGENTS.md"), "# Fixture instructions\n");
  writeFileSync(
    join(worktree, "experiments/human-agent-visualization/.gitignore"),
    "generated/\n",
  );
  writeFileSync(
    join(worktree, "package.json"),
    JSON.stringify({ scripts: { test: "bun test" } }),
  );
  git(worktree, ["init", "-b", "main"]);
  git(worktree, ["config", "user.email", "project-lens@example.test"]);
  git(worktree, ["config", "user.name", "Project Lens Test"]);
  git(worktree, ["add", "."]);
  git(worktree, ["commit", "-m", "seed effect fixture"]);
  return {
    home: realpathSync(home),
    worktree: realpathSync(worktree),
    head: gitText(worktree, ["rev-parse", "HEAD"]),
  };
}

function projectLensTurn(
  turnId: string,
  context: ReturnType<typeof taskContext>,
  launch: {
    readonly authorizationId: string;
    readonly proposalDigest: string;
  } = {
    authorizationId: "33333333-3333-4333-8333-333333333333",
    proposalDigest: "a".repeat(64),
  },
) {
  return {
    version: MISSION_TURN_VERSION,
    turnId,
    baselineWatermark: 0,
    sourceRefs: ["mission:test"],
    launchAuthorizationRef: {
      ...launch,
      claimSourceRef: `state/execution-authorization-claims/${launch.authorizationId}.json`,
    },
    workbenchTaskContext: workbenchTaskExecutionContextRef(context),
  } as const;
}

function zeroUsage() {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cachedInputTokens: 0,
  };
}

function authorizationFixture() {
  const root = mkdtempSync(join(tmpdir(), "project-lens-authorization-"));
  roots.push(root);
  const repository = join(root, "repository");
  const candidate = join(root, "candidate");
  const home = join(root, "rosso-home");
  mkdirSync(repository, { recursive: true });
  mkdirSync(home, { recursive: true });
  git(repository, ["init", "-b", "main"]);
  git(repository, ["config", "user.email", "project-lens@example.test"]);
  git(repository, ["config", "user.name", "Project Lens Test"]);
  const proposal = projectLensExecutionProposal();
  const missionPath = join(
    repository,
    "apps/missions/project-lens-dogfood.json",
  );
  mkdirSync(join(missionPath, ".."), { recursive: true });
  writeFileSync(missionPath, `${JSON.stringify({
    version: "mission-record.v1",
    id: "project-lens-dogfood",
    title: "Project Lens test Mission",
    sources: ["principal:test"],
    createdAt: "2026-08-11T18:00:00Z",
    updatedAt: "2026-08-11T18:00:00Z",
    mainline: {
      contradiction: "Exercise one task-bound Project Lens runtime.",
      acceptance: ["One claim is consumed."],
      status: "active",
    },
    branches: [],
    currentFocus: "mainline",
    executionProposal: proposal,
  }, null, 2)}\n`);
  writeFileSync(join(repository, "README.md"), "# Project Lens fixture\n");
  git(repository, ["add", "."]);
  git(repository, ["commit", "-m", "seed Project Lens proposal"]);
  git(repository, ["worktree", "add", "--detach", candidate, "HEAD"]);
  const worktree = realpathSync(candidate);
  const head = gitText(worktree, ["rev-parse", "HEAD"]);
  const choices = [{ decisionId: "external-disclosure", replyKey: "ALLOW" }];
  const receipt: ExecutionAuthorizationReceipt = {
    version: "rosso.execution-authorization-receipt.v1",
    authorizationId: randomUUID(),
    projectId: "repository:skills-test",
    missionId: "project-lens-dogfood",
    missionSource: {
      path: "apps/missions/project-lens-dogfood.json",
      gitHead: head,
    },
    proposalId: proposal.proposalId,
    proposalDigest: missionExecutionProposalDigest(proposal),
    choices,
    immediateAuthorizedResults: proposal.pendingDecisions.map((decision) => ({
      decisionId: decision.id,
      result: decision.options.find(
        (option) => option.replyKey === choices[0]!.replyKey,
      )!.immediateResult,
    })),
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
    sourceRef: "conversation:test",
    attributionBoundary: "references-are-attribution-not-authentication",
    authorizedAt: "2026-08-11T18:30:00Z",
  };
  const receiptPath = executionAuthorizationReceiptPath(
    home,
    receipt.projectId,
    receipt.missionId,
    receipt.proposalId,
  );
  mkdirSync(join(receiptPath, ".."), { recursive: true });
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  return {
    home: realpathSync(home),
    worktree,
    receiptPath: realpathSync(receiptPath),
    receipt,
  };
}

function taskContext(authorizationId: string, proposalDigest: string) {
  return WorkbenchTaskExecutionContextSchema.parse({
    version: "rosso.workbench-task-execution-context.v1",
    taskId: "11111111-1111-4111-8111-111111111111",
    taskRevision: 11,
    objective: "Run one truthful Project Lens dogfood candidate.",
    acceptance: ["Retain the output as an unaccepted local projection."],
    corrections: [],
    binding: {
      projectId: "repository:skills-test",
      missionId: "project-lens-dogfood",
    },
    execution: { authorizationId, proposalDigest },
  });
}

function claimExists(fixture: ReturnType<typeof authorizationFixture>): boolean {
  return existsSync(join(
    fixture.home,
    "state/execution-authorization-claims",
    `${fixture.receipt.authorizationId}.json`,
  ));
}

function gitText(root: string, args: readonly string[]): string {
  const result = Bun.spawnSync(["git", "-C", root, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
