import { afterEach, expect, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CellRunRecordSchema,
  type CellRunRecord,
} from "../../../packages/work-cell/src/contracts";
import {
  executionAuthorizationReceiptPath,
  type ExecutionAuthorizationReceipt,
} from "../../workbench/src/execution-authorization";
import {
  ExecutionAuthorizationClaimSchema,
} from "../../workbench/src/execution-authorization-claim";
import {
  missionExecutionProposalDigest,
  MissionExecutionProposalSchema,
  type MissionExecutionProposal,
} from "../../workbench/src/mission-execution-proposal";
import {
  WORKBENCH_TASK_EXECUTION_CONTEXT_ENV,
  WorkbenchTaskExecutionContextSchema,
  workbenchTaskCorrectionGuidanceRefs,
  workbenchTaskExecutionContextDigest,
  workbenchTaskExecutionContextRef,
  type WorkbenchTaskExecutionContextRef,
} from "../../workbench/src/task-execution-context";
import {
  blogPublicationCell,
  blogPublicationWorkspace,
  blogPublicationAuthorizationContract,
  blogPublicationExecutionProposal,
  createMissionRuntime,
  currentBlogPublicationRuntimeDigest,
  missionRuntimeRecoveryCapabilities,
  publicationCall,
} from "../experiments/agent-era-blog-publication-runtime";
import {
  claimProjectExecutionAuthorization,
  consumeProjectExecutionAuthorization,
  validateProjectExecutionAuthorization,
} from "../experiments/project-execution-authorization";
import { admitPreparedDelegateBatch } from "../src/delegate-admission";
import type { DelegateBatchCheckpoint } from "../src/delegate-loop";
import { FileMissionTimeline } from "../src/delegate-timeline";
import { IsolatedGitEffectObserver } from "../src/git-effect-observer";
import { missionRunnerDirectory } from "../src/mission-runner";
import { digestAnchor } from "../src/mission-reconciliation";
import { MISSION_TURN_VERSION } from "../src/mission-turn";

const roots: string[] = [];
const projectId = "repository:agent-era-blog-publication-test";

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the publication runtime declares one exact v3 read, exclusion, write, and empty command boundary", () => {
  const contract = blogPublicationAuthorizationContract(projectId);
  expect(missionRuntimeRecoveryCapabilities).toEqual({
    resume: true,
    replace: false,
  });
  expect(contract.proposalId).toBe(
    "agent-era-blog-personal-publication-roundtrip-v3",
  );
  expect(contract.projectId).toBe(projectId);
  expect(contract.proposalVersion).toBe("mission-execution-proposal.v2");
  expect(contract.runtimeDigest).toBe(currentBlogPublicationRuntimeDigest());
  expect(contract.scope).toEqual({
    readPaths: [
      "AGENTS.md",
      "DESIGN.md",
      "apps/missions/principal-workbench-dogfood.json",
      "package.json",
      "tsconfig.json",
      "drizzle.config.ts",
      "app/chatgpt-auth.ts",
      "app/page.tsx",
      "app/layout.tsx",
      "app/globals.css",
      "db/schema.ts",
      "drizzle/meta/_journal.json",
      "tests/rendered-html.test.mjs",
    ],
    excludePaths: [
      ".git",
      ".env",
      ".dev.vars",
      ".openai/hosting.json",
      ".wrangler",
      "node_modules",
      "dist",
      ".next",
    ],
    writePaths: [
      "DESIGN.md",
      "package.json",
      "app/page.tsx",
      "app/layout.tsx",
      "app/globals.css",
      "app/blog/SiteChrome.tsx",
      "app/blog/content.ts",
      "app/blog/reader.tsx",
      "app/blog/[slug]/page.tsx",
      "app/blog/[slug]/revision/[revisionId]/[view]/page.tsx",
      "app/studio/page.tsx",
      "app/studio/StudioComposer.tsx",
      "app/api/publications/route.ts",
      "db/schema.ts",
      "db/publications.ts",
      "drizzle/0000_seeded_publication.sql",
      "drizzle/meta/_journal.json",
      "tests/rendered-html.test.mjs",
      "tests/author-reader-flow.test.mjs",
    ],
    commands: [],
  });
  expect(contract.requiredChoices).toEqual([{
    decisionId: "external-disclosure",
    replyKey: "ALLOW",
  }]);
  if (!("readPaths" in contract.scope)) {
    throw new Error("publication contract must use proposal v2 scope");
  }
  const workspace = blogPublicationWorkspace("/candidate");
  expect(workspace.root).toBe("/candidate");
  expect(workspace.readPaths as readonly string[]).toEqual(
    contract.scope.readPaths,
  );
  expect(workspace.excludePaths as readonly string[]).toEqual(
    contract.scope.excludePaths,
  );
  expect(workspace.writePaths as readonly string[]).toEqual(
    contract.scope.writePaths,
  );
  expect(workspace.allowedCommands).toEqual([]);
});

test("the publication call carries the exact Workbench task and retained Principal corrections", () => {
  const context = taskExecutionContext(
    "22222222-2222-4222-8222-222222222222",
    "a".repeat(64),
  );
  const call = publicationCall(context);
  expect(call.task).toContain(context.objective);
  expect(call.task).toContain(context.corrections[0]!.id);
  expect(call.task).toContain(context.corrections[0]!.statement);
  expect(call.acceptance).toContain(context.acceptance[0]!);
  expect(call.sourceRefs).toContain(context.corrections[0]!.sourceRef);
  expect(call.sourceRefs).toContain(
    `workbench-task:${context.taskId}@${context.taskRevision}`,
  );
});

test("one exact v2 receipt is consumed once and records the clean detached candidate", () => {
  const fixture = authorizationFixture();
  const consumed = consume(fixture);
  const claim = ExecutionAuthorizationClaimSchema.parse(
    JSON.parse(readFileSync(consumed.claimPath, "utf8")),
  );
  expect(claim).toMatchObject({
    authorizationId: fixture.receipt.authorizationId,
    proposalId: fixture.proposal.proposalId,
    proposalDigest: fixture.receipt.proposalDigest,
    localEvidence: {
      worktree: fixture.worktree,
      gitHead: fixture.head,
    },
  });
  expect(() => consume(fixture)).toThrow("already consumed");
});

test("an invalid claim timestamp fails before the receipt is consumed", () => {
  const fixture = authorizationFixture();
  expect(() => consumeProjectExecutionAuthorization({
    home: fixture.home,
    missionId: "principal-workbench-dogfood",
    worktree: fixture.worktree,
    receiptPath: fixture.receiptPath,
    contract: blogPublicationAuthorizationContract(projectId),
    now: () => "not-a-timestamp",
  })).toThrow();
  expect(claimExists(
    fixture.home,
    fixture.receipt.authorizationId,
  )).toBe(false);
});

test("read-scope drift and HOLD fail before a one-use claim is created", () => {
  const widened = authorizationFixture((proposal) => ({
    ...proposal,
    scope: {
      ...proposal.scope,
      readPaths: [...proposal.scope.readPaths, "README.md"],
    },
  }));
  expect(() => consume(widened)).toThrow(
    "read, exclusion, write, or command boundary does not match",
  );
  expect(claimExists(
    widened.home,
    widened.receipt.authorizationId,
  )).toBe(false);

  const held = authorizationFixture();
  const holdResult = held.proposal.pendingDecisions[0]!.options
    .find((option) => option.replyKey === "HOLD")!.immediateResult;
  writeReceipt(held.receiptPath, {
    ...held.receipt,
    choices: [{ decisionId: "external-disclosure", replyKey: "HOLD" }],
    immediateAuthorizedResults: [{
      decisionId: "external-disclosure",
      result: holdResult,
    }],
  });
  expect(() => consume(held)).toThrow("external-disclosure=ALLOW");
  expect(claimExists(held.home, held.receipt.authorizationId)).toBe(false);
});

test("every adapter boundary drift fails before a one-use claim is created", () => {
  const cases: readonly [
    string,
    (
      proposal: Extract<
        MissionExecutionProposal,
        { version: "mission-execution-proposal.v2" }
      >,
    ) => Extract<
      MissionExecutionProposal,
      { version: "mission-execution-proposal.v2" }
    >,
  ][] = [
    ["exclude scope", (proposal) => ({
      ...proposal,
      scope: {
        ...proposal.scope,
        excludePaths: [...proposal.scope.excludePaths, "private"],
      },
    })],
    ["write scope", (proposal) => ({
      ...proposal,
      scope: {
        ...proposal.scope,
        writePaths: [...proposal.scope.writePaths, "README.md"],
      },
    })],
    ["runtime digest", (proposal) => ({
      ...proposal,
      runtimeDigest: "0".repeat(64),
    })],
    ["external disclosure", (proposal) => ({
      ...proposal,
      externalDisclosure: {
        dataCategories: [
          ...proposal.externalDisclosure.dataCategories,
          "undeclared source",
        ],
      },
    })],
    ["budget", (proposal) => ({
      ...proposal,
      budget: {
        ...proposal.budget,
        estimatedTokens: proposal.budget.estimatedTokens + 1,
      },
    })],
  ];

  for (const [label, mutate] of cases) {
    const fixture = authorizationFixture(mutate);
    expect(() => consume(fixture), label).toThrow();
    expect(
      claimExists(fixture.home, fixture.receipt.authorizationId),
      label,
    ).toBe(false);
  }
});

test("dirty, attached, and stale-head candidates fail before claim", () => {
  const dirty = authorizationFixture();
  writeFileSync(join(dirty.worktree, "dirty.txt"), "dirty\n");
  expect(() => consume(dirty)).toThrow("must be clean");
  expect(claimExists(dirty.home, dirty.receipt.authorizationId)).toBe(false);

  const attached = authorizationFixture();
  expect(() => consumeProjectExecutionAuthorization({
    home: attached.home,
    missionId: "principal-workbench-dogfood",
    worktree: attached.repository,
    receiptPath: attached.receiptPath,
    contract: blogPublicationAuthorizationContract(projectId),
  })).toThrow("linked Git worktree");
  expect(claimExists(
    attached.home,
    attached.receipt.authorizationId,
  )).toBe(false);

  const stale = authorizationFixture();
  writeFileSync(join(stale.worktree, "new.txt"), "new head\n");
  git(stale.worktree, "add", "new.txt");
  git(stale.worktree, "commit", "-m", "advance detached candidate");
  expect(() => consume(stale)).toThrow("Git head mismatch");
  expect(claimExists(stale.home, stale.receipt.authorizationId)).toBe(false);
});

test("a missing reconciled anchor does not consume the runtime authorization", async () => {
  const fixture = authorizationFixture();
  const priorRoot = process.env.ROSSO_BLOG_EFFECT_ROOT;
  const priorReceipt = process.env.ROSSO_BLOG_AUTHORIZATION_RECEIPT;
  const priorTaskContext =
    process.env[WORKBENCH_TASK_EXECUTION_CONTEXT_ENV];
  process.env.ROSSO_BLOG_EFFECT_ROOT = fixture.worktree;
  process.env.ROSSO_BLOG_AUTHORIZATION_RECEIPT = fixture.receiptPath;
  process.env[WORKBENCH_TASK_EXECUTION_CONTEXT_ENV] = JSON.stringify(
    taskExecutionContext(
      fixture.receipt.authorizationId,
      fixture.receipt.proposalDigest,
    ),
  );
  try {
    await expect(createMissionRuntime({
      root: fixture.home,
      missionId: "principal-workbench-dogfood",
      timeline: {
        latestReconciledAnchor: async () => undefined,
      },
      recovery: undefined,
    } as unknown as Parameters<typeof createMissionRuntime>[0])).rejects.toThrow(
      "requires an authorized and reconciled Mission anchor",
    );
    expect(claimExists(
      fixture.home,
      fixture.receipt.authorizationId,
    )).toBe(false);
  } finally {
    restoreEnvironment("ROSSO_BLOG_EFFECT_ROOT", priorRoot);
    restoreEnvironment("ROSSO_BLOG_AUTHORIZATION_RECEIPT", priorReceipt);
    restoreEnvironment(
      WORKBENCH_TASK_EXECUTION_CONTEXT_ENV,
      priorTaskContext,
    );
  }
});

test("the runtime claims only after all local launch preconditions succeed", async () => {
  const fixture = authorizationFixture();
  const priorRoot = process.env.ROSSO_BLOG_EFFECT_ROOT;
  const priorReceipt = process.env.ROSSO_BLOG_AUTHORIZATION_RECEIPT;
  const priorTaskContext =
    process.env[WORKBENCH_TASK_EXECUTION_CONTEXT_ENV];
  const priorKey = process.env.DEEPSEEK_API_KEY;
  process.env.ROSSO_BLOG_EFFECT_ROOT = fixture.worktree;
  process.env.ROSSO_BLOG_AUTHORIZATION_RECEIPT = fixture.receiptPath;
  const taskContext = taskExecutionContext(
    fixture.receipt.authorizationId,
    fixture.receipt.proposalDigest,
  );
  process.env[WORKBENCH_TASK_EXECUTION_CONTEXT_ENV] =
    JSON.stringify(taskContext);
  process.env.DEEPSEEK_API_KEY = "test-only-not-sent";
  try {
    const prepared = await createMissionRuntime({
      root: fixture.home,
      missionId: "principal-workbench-dogfood",
      timeline: {
        latestReconciledAnchor: async () => ({
          id: "intent:principal-workbench-dogfood",
          revision: "r1",
          statement: "Complete the supervised Blog roundtrip.",
          sourceRefs: ["principal:test"],
          reconciledWatermark: 0,
        }),
      },
      recovery: undefined,
    } as unknown as Parameters<typeof createMissionRuntime>[0]);
    expect(prepared.turn.anchorDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(prepared.turn.launchAuthorizationRef).toEqual({
      authorizationId: fixture.receipt.authorizationId,
      proposalDigest: fixture.receipt.proposalDigest,
      claimSourceRef: join(
        "state",
        "execution-authorization-claims",
        `${fixture.receipt.authorizationId}.json`,
      ),
    });
    const expectedTaskContextRef = workbenchTaskExecutionContextRef(taskContext);
    expect(prepared.turn.workbenchTaskContext).toEqual(expectedTaskContextRef);
    const claim = ExecutionAuthorizationClaimSchema.parse(
      JSON.parse(readFileSync(
        join(
          fixture.home,
          prepared.turn.launchAuthorizationRef!.claimSourceRef,
        ),
        "utf8",
      )),
    );
    expect(claim.workbenchTaskContext).toEqual(
      prepared.turn.workbenchTaskContext,
    );
    expect(prepared.turn.sourceRefs).toContain(
      `workbench-task:${taskContext.taskId}@${taskContext.taskRevision}`,
    );
    expect(prepared.turn.sourceRefs).toContain(
      taskContext.corrections[0]!.sourceRef,
    );
    expect(claimExists(
      fixture.home,
      fixture.receipt.authorizationId,
    )).toBe(true);
    prepared.controller.cancel("test complete");
  } finally {
    restoreEnvironment("ROSSO_BLOG_EFFECT_ROOT", priorRoot);
    restoreEnvironment("ROSSO_BLOG_AUTHORIZATION_RECEIPT", priorReceipt);
    restoreEnvironment(
      WORKBENCH_TASK_EXECUTION_CONTEXT_ENV,
      priorTaskContext,
    );
    restoreEnvironment("DEEPSEEK_API_KEY", priorKey);
  }
});

test("recovery settles one retained child and Git effect without replaying a model or writer", async () => {
  const fixture = authorizationFixture();
  const missionId = "principal-workbench-dogfood";
  const timeline = new FileMissionTimeline(
    missionRunnerDirectory(fixture.home, missionId),
  );
  const anchor = {
    id: "intent:principal-workbench-dogfood",
    revision: "r1",
    statement: "Complete the supervised Blog roundtrip.",
    sourceRefs: ["principal:test"],
    reconciledWatermark: 0,
  };
  await timeline.seedAnchor({
    version: "rosso.mission-anchor-seed.v1",
    id: "seed:principal-workbench-dogfood",
    missionId,
    authorityRef: "principal:test",
    sourceRef: "test:publication-recovery",
    anchor,
  });
  const taskContext = taskExecutionContext(
    fixture.receipt.authorizationId,
    fixture.receipt.proposalDigest,
  );
  const taskContextRef = workbenchTaskExecutionContextRef(taskContext);
  const consumed = consume(fixture, taskContextRef);
  const call = publicationCall(taskContext);
  const turnId = "agent-era-blog-publication-recovery-test";
  const launchAuthorizationRef = {
    authorizationId: fixture.receipt.authorizationId,
    proposalDigest: fixture.receipt.proposalDigest,
    claimSourceRef: join(
      "state",
      "execution-authorization-claims",
      `${fixture.receipt.authorizationId}.json`,
    ),
  };
  const turn = {
    version: MISSION_TURN_VERSION,
    turnId,
    baselineWatermark: 0,
    anchorDigest: digestAnchor(anchor),
    sourceRefs: [
      ...call.sourceRefs,
      `workbench-task-context:sha256:${
        workbenchTaskExecutionContextDigest(taskContext)
      }`,
    ],
    launchAuthorizationRef,
    workbenchTaskContext: taskContextRef,
    guidanceRefs: workbenchTaskCorrectionGuidanceRefs(taskContext),
  };
  await timeline.startTurn(missionId, turn);

  const batchId = `${turnId}:batch:1`;
  const cell = blogPublicationCell(fixture.worktree, call);
  const admission = admitPreparedDelegateBatch({
    id: batchId,
    whole: {
      revision: "agent-era-blog-personal-publication-roundtrip-v3",
      sourceRefs: [...call.sourceRefs],
      obligations: [...call.obligationRefs],
      settledContributionKeys: [],
      guardRefs: [
        "guard:isolated-worktree-publication-contract-and-browser-verification",
      ],
      capabilityNeeds: [call.capabilityNeed],
      reconstructionOwner: "principal:agent-era-blog-supervisor",
      workspace: blogPublicationWorkspace(fixture.worktree),
      effectPolicy: {
        kind: "isolated-writable-trial",
        root: fixture.worktree,
      },
    },
    contributions: [{
      ...call,
      dependsOn: [],
      taskShape: {
        referenceProfile: {
          id: "agent-era-blog-publication-writer-v1",
          revision: "2026-07-29-personal-blog-correction-roundtrip",
        },
        evidence: {
          status: "provisional-observed",
          revision: "2026-07-29-personal-blog-correction-roundtrip",
          refs: ["evidence:test-retained-recovery"],
        },
        disposition: "guarded",
        principalInstability: "cross-layer publication change",
        guardRefs: [
          "guard:isolated-worktree-publication-contract-and-browser-verification",
        ],
        reconstructionOwner: "principal:agent-era-blog-supervisor",
        overloadDisposition: "repartition",
      },
      cell,
    }],
  });
  const checkpoint: DelegateBatchCheckpoint = {
    id: batchId,
    parentLoopId: turnId,
    wholeRevision: admission.whole.revision,
    parentUsage: zeroUsage(),
    tasks: [{
      id: call.taskId,
      subject: "Implement the corrected Blog roundtrip",
      description: call.task,
      status: "in_progress",
      owner: `delegate:${call.key}`,
      blockedBy: [],
    }],
    invocations: [{
      toolCallId: "tool-recovery-test",
      toolName: "delegate",
      call,
      input: { kind: "inline" },
    }],
    responseMessages: [],
    admission,
  };
  const observer = new IsolatedGitEffectObserver({
    missionId,
    journalRoot: missionRunnerDirectory(fixture.home, missionId),
    leaseRoot: fixture.home,
    launchAuthorizationRef,
  });
  await timeline.prepareBatch(checkpoint);
  await observer.prepare(checkpoint);
  await timeline.markBatchDispatched(checkpoint);
  await observer.start(checkpoint);

  const designPath = join(fixture.worktree, "DESIGN.md");
  const designSource = `${readFileSync(designPath, "utf8")}\nRecovered candidate.\n`;
  writeFileSync(designPath, designSource);
  const runId = "run-publication-recovery-test";
  observer.trace(checkpoint, {
    at: "2026-07-29T12:00:00Z",
    type: "cell.started",
    data: { runId },
  });
  const record = CellRunRecordSchema.parse({
    version: "work-cell.run.v4",
    runId,
    cellId: cell.id,
    driver: {
      adapter: "test-no-replay",
      provider: "test",
      model: "retained-record",
    },
    startedAt: "2026-07-29T12:00:00Z",
    finishedAt: "2026-07-29T12:00:01Z",
    durationMs: 1_000,
    status: "passed",
    input: cell,
    finalText: "The retained writer completed.",
    output: {
      status: "completed",
      summary: "retained settlement",
      files: ["DESIGN.md"],
      remainingRisk: "independent verification pending",
    },
    artifacts: [{
      path: "DESIGN.md",
      bytes: Buffer.byteLength(designSource),
      sha256: createHash("sha256").update(designSource).digest("hex"),
    }],
    verification: {
      passed: true,
      terminal: {
        passed: true,
        required: [],
        called: [],
      },
      artifacts: { passed: true, errors: [] },
    },
    workspaceDiff: {
      added: [],
      changed: ["DESIGN.md"],
      removed: [],
    },
    usage: zeroUsage(),
    usageByPhase: {
      preparation: zeroUsage(),
      execution: zeroUsage(),
    },
    executionObservation: {
      executionProfileId: "agent-era-blog-publication-writer-v1",
    },
    trace: [],
    rawSteps: [],
  });
  const run = {
    kind: "direct" as const,
    admission,
    record: record as CellRunRecord,
  };
  await observer.settle(checkpoint, run);
  await timeline.recordBatchSettlements({
    checkpoint,
    run,
    outcomes: [{
      key: call.key,
      cellId: cell.id,
      status: "completed",
      runId,
      artifactRefs: ["DESIGN.md"],
    }],
  });

  const priorRoot = process.env.ROSSO_BLOG_EFFECT_ROOT;
  const priorReceipt = process.env.ROSSO_BLOG_AUTHORIZATION_RECEIPT;
  const priorTaskContext =
    process.env[WORKBENCH_TASK_EXECUTION_CONTEXT_ENV];
  const priorKey = process.env.DEEPSEEK_API_KEY;
  process.env.ROSSO_BLOG_EFFECT_ROOT = fixture.worktree;
  process.env.ROSSO_BLOG_AUTHORIZATION_RECEIPT = fixture.receiptPath;
  process.env[WORKBENCH_TASK_EXECUTION_CONTEXT_ENV] =
    JSON.stringify(taskContext);
  delete process.env.DEEPSEEK_API_KEY;
  try {
    const prepared = await createMissionRuntime({
      root: fixture.home,
      missionId,
      timeline,
      recovery: {
        action: "resume",
        interruptedTurn: turn,
      },
    });
    const transition = await prepared.controller.advance();
    expect(transition).toMatchObject({
      kind: "finished",
      run: {
        status: "needs-attention",
        text: expect.stringContaining("without replaying"),
        uncoveredObligations: [],
        tasks: [{
          id: call.taskId,
          status: "completed",
        }],
      },
    });
    expect(readFileSync(consumed.claimPath, "utf8")).toContain(
      fixture.receipt.authorizationId,
    );
  } finally {
    restoreEnvironment("ROSSO_BLOG_EFFECT_ROOT", priorRoot);
    restoreEnvironment("ROSSO_BLOG_AUTHORIZATION_RECEIPT", priorReceipt);
    restoreEnvironment(
      WORKBENCH_TASK_EXECUTION_CONTEXT_ENV,
      priorTaskContext,
    );
    restoreEnvironment("DEEPSEEK_API_KEY", priorKey);
  }
});

test("recovery fails closed when the consumed claim or Mission turn lacks the exact Workbench task context", async () => {
  const cases: readonly {
    readonly label: string;
    readonly claimContext: "exact" | "missing" | "wrong";
    readonly turnContext: "exact" | "missing" | "wrong";
  }[] = [
    {
      label: "claim context missing",
      claimContext: "missing",
      turnContext: "exact",
    },
    {
      label: "claim context wrong",
      claimContext: "wrong",
      turnContext: "exact",
    },
    {
      label: "Mission turn context missing",
      claimContext: "exact",
      turnContext: "missing",
    },
    {
      label: "Mission turn context wrong",
      claimContext: "exact",
      turnContext: "wrong",
    },
  ];

  for (const scenario of cases) {
    const fixture = authorizationFixture();
    const taskContext = taskExecutionContext(
      fixture.receipt.authorizationId,
      fixture.receipt.proposalDigest,
    );
    const exactRef = workbenchTaskExecutionContextRef(taskContext);
    const wrongRef = {
      ...exactRef,
      contextDigest: "0".repeat(64),
    };
    consume(
      fixture,
      scenario.claimContext === "missing"
        ? undefined
        : scenario.claimContext === "exact"
        ? exactRef
        : wrongRef,
    );
    const launchAuthorizationRef = {
      authorizationId: fixture.receipt.authorizationId,
      proposalDigest: fixture.receipt.proposalDigest,
      claimSourceRef: join(
        "state",
        "execution-authorization-claims",
        `${fixture.receipt.authorizationId}.json`,
      ),
    };
    const turn = {
      version: MISSION_TURN_VERSION,
      turnId: `publication-recovery-${scenario.label.replaceAll(" ", "-")}`,
      baselineWatermark: 0,
      sourceRefs: [
        `workbench-task-context:sha256:${
          workbenchTaskExecutionContextDigest(taskContext)
        }`,
      ],
      launchAuthorizationRef,
      ...(scenario.turnContext === "missing"
        ? {}
        : {
          workbenchTaskContext:
            scenario.turnContext === "exact" ? exactRef : wrongRef,
        }),
      guidanceRefs: workbenchTaskCorrectionGuidanceRefs(taskContext),
    };
    let retainedRecoveryRead = false;
    const priorRoot = process.env.ROSSO_BLOG_EFFECT_ROOT;
    const priorReceipt = process.env.ROSSO_BLOG_AUTHORIZATION_RECEIPT;
    const priorTaskContext =
      process.env[WORKBENCH_TASK_EXECUTION_CONTEXT_ENV];
    process.env.ROSSO_BLOG_EFFECT_ROOT = fixture.worktree;
    process.env.ROSSO_BLOG_AUTHORIZATION_RECEIPT = fixture.receiptPath;
    process.env[WORKBENCH_TASK_EXECUTION_CONTEXT_ENV] =
      JSON.stringify(taskContext);
    try {
      await expect(createMissionRuntime({
        root: fixture.home,
        missionId: "principal-workbench-dogfood",
        timeline: {
          recoverBatch: async () => {
            retainedRecoveryRead = true;
            throw new Error("invalid context must fail before retained recovery");
          },
        },
        recovery: {
          action: "resume",
          interruptedTurn: turn,
        },
      } as unknown as Parameters<typeof createMissionRuntime>[0]), scenario.label)
        .rejects.toThrow(
          "interrupted Blog turn does not match its consumed authorization and Workbench task guidance",
        );
      expect(retainedRecoveryRead, scenario.label).toBe(false);
    } finally {
      restoreEnvironment("ROSSO_BLOG_EFFECT_ROOT", priorRoot);
      restoreEnvironment("ROSSO_BLOG_AUTHORIZATION_RECEIPT", priorReceipt);
      restoreEnvironment(
        WORKBENCH_TASK_EXECUTION_CONTEXT_ENV,
        priorTaskContext,
      );
    }
  }
});

test("claim revalidation rejects candidate drift after side-effect-free preflight", () => {
  const fixture = authorizationFixture();
  const validated = validateProjectExecutionAuthorization({
    home: fixture.home,
    missionId: "principal-workbench-dogfood",
    worktree: fixture.worktree,
    receiptPath: fixture.receiptPath,
    contract: blogPublicationAuthorizationContract(projectId),
  });
  writeFileSync(join(fixture.worktree, "late-drift.txt"), "late drift\n");
  expect(() => claimProjectExecutionAuthorization(validated)).toThrow(
    "must be clean",
  );
  expect(claimExists(
    fixture.home,
    fixture.receipt.authorizationId,
  )).toBe(false);
});

interface Fixture {
  readonly home: string;
  readonly repository: string;
  readonly worktree: string;
  readonly head: string;
  readonly proposal: Extract<
    MissionExecutionProposal,
    { version: "mission-execution-proposal.v2" }
  >;
  readonly receiptPath: string;
  readonly receipt: ExecutionAuthorizationReceipt;
}

function authorizationFixture(
  mutate: (
    proposal: Extract<
      MissionExecutionProposal,
      { version: "mission-execution-proposal.v2" }
    >,
  ) => Extract<
    MissionExecutionProposal,
    { version: "mission-execution-proposal.v2" }
  > = (proposal) => proposal,
): Fixture {
  const root = mkdtempSync(join(tmpdir(), "blog-publication-authorization-"));
  roots.push(root);
  const repository = join(root, "repository");
  const candidatePath = join(root, "candidate");
  const home = join(root, "rosso-home");
  mkdirSync(repository, { recursive: true });
  git(repository, "init", "-b", "main");
  git(repository, "config", "user.name", "Blog Publication Test");
  git(repository, "config", "user.email", "blog-publication@example.test");

  const proposal = mutate(publicationProposal());
  const missionPath = join(
    repository,
    "apps",
    "missions",
    "principal-workbench-dogfood.json",
  );
  mkdirSync(join(missionPath, ".."), { recursive: true });
  writeFileSync(
    missionPath,
    `${JSON.stringify(missionRecord(proposal), null, 2)}\n`,
  );
  writeFileSync(join(repository, "AGENTS.md"), "# Test project\n");
  writeFileSync(join(repository, "DESIGN.md"), "# Test design\n");
  git(repository, "add", ".");
  git(repository, "commit", "-m", "seed publication proposal");
  git(repository, "worktree", "add", "--detach", candidatePath, "HEAD");
  const worktree = realpathSync(candidatePath);
  const head = git(worktree, "rev-parse", "HEAD");
  const receipt = authorizationReceipt(proposal, head);
  const receiptPath = executionAuthorizationReceiptPath(
    home,
    receipt.projectId,
    receipt.missionId,
    receipt.proposalId,
  );
  writeReceipt(receiptPath, receipt);
  return {
    home: realpathSync(home),
    repository: realpathSync(repository),
    worktree,
    head,
    proposal,
    receiptPath: realpathSync(receiptPath),
    receipt,
  };
}

function publicationProposal(): Extract<
  MissionExecutionProposal,
  { version: "mission-execution-proposal.v2" }
> {
  return blogPublicationExecutionProposal();
}

function missionRecord(proposal: MissionExecutionProposal) {
  return {
    version: "mission-record.v1",
    id: "principal-workbench-dogfood",
    title: "Blog publication trial",
    sources: ["principal:test"],
    createdAt: "2026-07-27T12:00:00Z",
    updatedAt: "2026-07-27T12:00:00Z",
    mainline: {
      contradiction: "Prove the supervised publication roundtrip",
      acceptance: ["Invalid authorization fails closed"],
      status: "active",
    },
    branches: [],
    currentFocus: "mainline",
    executionProposal: proposal,
  };
}

function authorizationReceipt(
  proposal: MissionExecutionProposal,
  head: string,
): ExecutionAuthorizationReceipt {
  const choices = [{
    decisionId: "external-disclosure",
    replyKey: "ALLOW",
  }];
  return {
    version: "rosso.execution-authorization-receipt.v1",
    authorizationId: randomUUID(),
    projectId,
    missionId: "principal-workbench-dogfood",
    missionSource: {
      path: "apps/missions/principal-workbench-dogfood.json",
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
    sourceRef: "conversation:test/turn",
    attributionBoundary: "references-are-attribution-not-authentication",
    authorizedAt: "2026-07-27T12:30:00Z",
  };
}

function taskExecutionContext(
  authorizationId: string,
  proposalDigest: string,
) {
  return WorkbenchTaskExecutionContextSchema.parse({
    version: "rosso.workbench-task-execution-context.v1",
    taskId: "11111111-1111-4111-8111-111111111111",
    taskRevision: 7,
    objective:
      "Make the personal Blog the primary reader experience while preserving inspectable projections.",
    acceptance: [
      "Desktop and mobile both lead with Lidessen, sustained prose, and editorial hierarchy.",
    ],
    corrections: [{
      id: "33333333-3333-4333-8333-333333333333",
      statement:
        "This is a personal Blog; keep Reading Field visibly secondary.",
      sourceRef: "conversation:test/personal-blog-correction",
    }],
    binding: {
      projectId,
      missionId: "principal-workbench-dogfood",
    },
    execution: {
      authorizationId,
      proposalDigest,
    },
  });
}

function consume(
  fixture: Fixture,
  workbenchTaskContext?: WorkbenchTaskExecutionContextRef,
) {
  if (workbenchTaskContext !== undefined) {
    return claimProjectExecutionAuthorization(
      validateProjectExecutionAuthorization({
        home: fixture.home,
        missionId: "principal-workbench-dogfood",
        worktree: fixture.worktree,
        receiptPath: fixture.receiptPath,
        contract: blogPublicationAuthorizationContract(projectId),
      }),
      { binding: { workbenchTaskContext } },
    );
  }
  return consumeProjectExecutionAuthorization({
    home: fixture.home,
    missionId: "principal-workbench-dogfood",
    worktree: fixture.worktree,
    receiptPath: fixture.receiptPath,
    contract: blogPublicationAuthorizationContract(projectId),
  });
}

function writeReceipt(
  path: string,
  receipt: ExecutionAuthorizationReceipt,
): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(receipt, null, 2)}\n`);
}

function claimExists(home: string, authorizationId: string): boolean {
  return existsSync(join(
    home,
    "state",
    "execution-authorization-claims",
    `${authorizationId}.json`,
  ));
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

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function zeroUsage() {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cachedInputTokens: 0,
  };
}
