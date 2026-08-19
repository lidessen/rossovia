import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import {
  executionAuthorizationReceiptPath,
  ExecutionAuthorizationReceiptSchema,
  type ExecutionAuthorizationReceipt,
} from "../src/execution-authorization";
import {
  executionAuthorizationClaimPath,
  executionAuthorizationReceiptDigest,
  ExecutionAuthorizationClaimSchema,
  type ExecutionAuthorizationClaim,
} from "../src/execution-authorization-claim";
import { initializeHome } from "../src/home";
import { registerProject } from "../src/register";
import {
  workbenchTaskExecutionContextFor,
  workbenchTaskExecutionContextRef,
  type WorkbenchTaskExecutionContextRef,
} from "../src/task-execution-context";
import {
  acceptPrincipalTaskResult,
  correctPrincipalTask,
  createPrincipalTask,
  linkPrincipalTaskExecution,
  listPrincipalTasks,
  principalTasksPath,
  recordPrincipalTaskCorrectionDelivery,
  submitPrincipalTaskResult,
  type TaskRecordCorrectionDeliveryArguments,
} from "../src/tasks";

const temporaryRoots: string[] = [];
const repositoryRoot = resolve(import.meta.dir, "../../..");
const bunCli = join(repositoryRoot, "apps", "workbench", "src", "cli.ts");
const projectId = "repository:task-execution-link";
const missionId = "daily-task-loop";
const proposalId = "task-execution";
const authorizationId = "11111111-1111-4111-8111-111111111111";

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("Principal task execution links", () => {
  test("loads a legacy task without executionLinks as an empty append-only lineage", () => {
    const fixture = setup();
    const source = JSON.parse(readFileSync(principalTasksPath(fixture.home), "utf8"));
    delete source.tasks[0].executionLinks;
    writeJson(principalTasksPath(fixture.home), source);

    expect(listPrincipalTasks(fixture.home).tasks[0]?.executionLinks).toEqual([]);
  });

  test("links one exact consumed authorization without changing task work state", () => {
    const fixture = setup();
    const result = linkPrincipalTaskExecution(fixture.home, {
      id: fixture.taskId,
      authorizationId,
      sourceRef: "operator:test-link",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    });

    expect(result).toMatchObject({
      sourceRevision: 2,
      task: {
        lifecycle: "open",
        nextActor: "agent",
        revision: 2,
        executionLinks: [{
          authorizationId,
          proposalDigest: fixture.receipt.proposalDigest,
          claimSourceRef: relative(fixture.home, fixture.claimPath),
          taskContext: fixture.taskContext,
          sourceRef: "operator:test-link",
        }],
      },
    });
    expect(result.task.executionLinks[0]?.linkedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T/,
    );
    expect(result.task).not.toHaveProperty("runnerId");
    expect(JSON.stringify(result.task.executionLinks)).not.toContain("effect");
  });

  test("the CLI appends only the canonical execution claim reference", () => {
    const fixture = setup();
    const result = taskCli(
      fixture.home,
      "link-execution",
      fixture.taskId,
      "--authorization-id",
      authorizationId,
      "--source-ref",
      "operator:cli-link",
      "--expected-source-revision",
      "1",
      "--expected-revision",
      "1",
    );

    expect(result.exitCode, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      sourceRevision: 2,
      task: {
        lifecycle: "open",
        nextActor: "agent",
        executionLinks: [{
          authorizationId,
          proposalDigest: fixture.receipt.proposalDigest,
          claimSourceRef: relative(fixture.home, fixture.claimPath),
          taskContext: fixture.taskContext,
          sourceRef: "operator:cli-link",
        }],
      },
    });
  });

  test("rejects duplicate and stale link mutations without changing retained state", () => {
    const fixture = setup();
    linkPrincipalTaskExecution(fixture.home, {
      id: fixture.taskId,
      authorizationId,
      sourceRef: "operator:first-link",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    });
    expect(() => linkPrincipalTaskExecution(fixture.home, {
      id: fixture.taskId,
      authorizationId,
      sourceRef: "operator:duplicate-link",
      expectedSourceRevision: 2,
      expectedRevision: 2,
    })).toThrow("already links execution authorization");
    expect(() => linkPrincipalTaskExecution(fixture.home, {
      id: fixture.taskId,
      authorizationId: "22222222-2222-4222-8222-222222222222",
      sourceRef: "operator:stale-link",
      expectedSourceRevision: 1,
      expectedRevision: 2,
    })).toThrow("source revision is stale");
    expect(listPrincipalTasks(fixture.home)).toMatchObject({
      sourceRevision: 2,
      tasks: [{ revision: 2, executionLinks: [{ authorizationId }] }],
    });
  });

  test("rejects execution links while a task is verifying or settled", () => {
    const fixture = setup();
    const submitted = submitPrincipalTaskResult(fixture.home, {
      id: fixture.taskId,
      summary: "Awaiting local acceptance",
      evidenceRefs: ["test:result"],
      sourceRef: "agent:test",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    });
    expect(() => linkPrincipalTaskExecution(fixture.home, {
      id: fixture.taskId,
      authorizationId,
      sourceRef: "operator:verifying-link",
      expectedSourceRevision: 2,
      expectedRevision: submitted.task.revision,
    })).toThrow("execution may link only while work remains active");
    const accepted = acceptPrincipalTaskResult(fixture.home, {
      id: fixture.taskId,
      sourceRef: "principal:test-accept",
      expectedSourceRevision: 2,
      expectedRevision: submitted.task.revision,
    });
    expect(() => linkPrincipalTaskExecution(fixture.home, {
      id: fixture.taskId,
      authorizationId,
      sourceRef: "operator:settled-link",
      expectedSourceRevision: 3,
      expectedRevision: accepted.task.revision,
    })).toThrow("execution may link only while work remains active");
  });

  test("requires both registered project and Mission context", () => {
    const fixture = setup();
    const independent = createPrincipalTask(fixture.home, {
      title: "Independent task",
      objective: "Remain independent",
      acceptance: ["No execution is inferred"],
      nextActor: "agent",
      sourceRef: "principal:independent",
      expectedSourceRevision: 1,
    });
    const projectOnly = createPrincipalTask(fixture.home, {
      title: "Project-only task",
      objective: "Retain project context only",
      acceptance: ["No Mission execution is inferred"],
      nextActor: "agent",
      sourceRef: "principal:project-only",
      expectedSourceRevision: 2,
      project: "fixture",
    });
    for (const task of [independent.task, projectOnly.task]) {
      expect(() => linkPrincipalTaskExecution(fixture.home, {
        id: task.id,
        authorizationId,
        sourceRef: "operator:invalid-context-link",
        expectedSourceRevision: 3,
        expectedRevision: 1,
      })).toThrow("requires exact registered project and Mission context");
    }
  });

  test("rejects binding one same-Mission task's consumed authorization to another task", () => {
    const fixture = setup();
    const other = createPrincipalTask(fixture.home, {
      title: "Other task in the same Mission",
      objective: "Remain distinct from the execution launched for the first task",
      acceptance: ["Same-Mission context cannot substitute for exact task lineage"],
      nextActor: "agent",
      sourceRef: "principal:same-mission-other-task",
      expectedSourceRevision: 1,
      project: "fixture",
      mission: missionId,
    });

    expect(() => linkPrincipalTaskExecution(fixture.home, {
      id: other.task.id,
      authorizationId,
      sourceRef: "operator:wrong-task-link",
      expectedSourceRevision: 2,
      expectedRevision: 1,
    })).toThrow("was not consumed for the exact current context");
    const retained = listPrincipalTasks(fixture.home);
    expect(retained.sourceRevision).toBe(2);
    expect(retained.tasks.find((task) => task.id === fixture.taskId)).toMatchObject({
      revision: 1,
      executionLinks: [],
    });
    expect(retained.tasks.find((task) => task.id === other.task.id)).toMatchObject({
      revision: 1,
      executionLinks: [],
    });
  });

  test("rejects a legacy consumption claim without exact task context", () => {
    const fixture = setup();
    const { workbenchTaskContext: _taskContext, ...legacyClaim } = fixture.claim;
    writeJson(fixture.claimPath, legacyClaim);

    expect(() => linkPrincipalTaskExecution(fixture.home, {
      id: fixture.taskId,
      authorizationId,
      sourceRef: "operator:legacy-context-link",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    })).toThrow("was not consumed for the exact current context");
    expect(listPrincipalTasks(fixture.home)).toMatchObject({
      sourceRevision: 1,
      tasks: [{ revision: 1, executionLinks: [] }],
    });
  });

  test.each([
    "wrong-project",
    "wrong-mission",
    "wrong-digest",
    "wrong-receipt-ref",
    "malformed-claim",
    "malformed-receipt",
  ] as const)("rejects %s evidence without appending a task link", (condition) => {
    const fixture = setup();
    if (condition === "malformed-claim") {
      writeFileSync(fixture.claimPath, "{malformed claim\n");
    } else if (condition === "malformed-receipt") {
      writeFileSync(fixture.receiptPath, "{malformed receipt\n");
    } else if (condition === "wrong-receipt-ref") {
      const wrongReceiptPath = join(
        fixture.home,
        "receipts",
        "execution-authorizations",
        "wrong.json",
      );
      writeJson(wrongReceiptPath, fixture.receipt);
      writeClaim(fixture.claimPath, {
        ...fixture.claim,
        receipt: {
          ref: relative(fixture.home, wrongReceiptPath),
          digest: executionAuthorizationReceiptDigest(fixture.receipt),
        },
      });
    } else if (condition === "wrong-digest") {
      writeClaim(fixture.claimPath, {
        ...fixture.claim,
        proposalDigest: "f".repeat(64),
      });
    } else {
      const receipt = ExecutionAuthorizationReceiptSchema.parse({
        ...fixture.receipt,
        ...(condition === "wrong-project"
          ? { projectId: "repository:other-project" }
          : { missionId: "other-mission" }),
      });
      writeJson(fixture.receiptPath, receipt);
      writeClaim(fixture.claimPath, {
        ...fixture.claim,
        projectId: receipt.projectId,
        missionId: receipt.missionId,
        receipt: {
          ...fixture.claim.receipt,
          digest: executionAuthorizationReceiptDigest(receipt),
        },
      });
    }

    expect(() => linkPrincipalTaskExecution(fixture.home, {
      id: fixture.taskId,
      authorizationId,
      sourceRef: "operator:invalid-link",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    })).toThrow();
    expect(listPrincipalTasks(fixture.home)).toMatchObject({
      sourceRevision: 1,
      tasks: [{ revision: 1, executionLinks: [] }],
    });
  });
});

describe("Principal task correction delivery evidence", () => {
  test("loads legacy corrections without deliveries as an empty append-only lineage", () => {
    const fixture = setup();
    const corrected = correctPrincipalTask(fixture.home, {
      id: fixture.taskId,
      statement: "Retain one bounded correction.",
      nextActor: "agent",
      sourceRef: "principal:legacy-correction",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    });
    const source = JSON.parse(readFileSync(principalTasksPath(fixture.home), "utf8"));
    delete source.tasks[0].corrections[0].deliveries;
    writeJson(principalTasksPath(fixture.home), source);

    expect(listPrincipalTasks(fixture.home).tasks[0]?.corrections).toEqual([
      expect.objectContaining({
        id: corrected.task.corrections[0]!.id,
        deliveries: [],
      }),
    ]);
  });

  test("records one exact receipt without changing task lifecycle or responsibility", () => {
    const prepared = prepareCorrectionDelivery();
    const result = recordPrincipalTaskCorrectionDelivery(
      prepared.fixture.home,
      prepared.delivery,
    );

    expect(result).toMatchObject({
      sourceRevision: 4,
      task: {
        lifecycle: "open",
        nextActor: "agent",
        revision: 4,
        corrections: [{
          id: prepared.delivery.correctionId,
          deliveries: [{
            authorizationId,
            proposalDigest: prepared.fixture.receipt.proposalDigest,
            claimSourceRef: relative(
              prepared.fixture.home,
              prepared.fixture.claimPath,
            ),
            missionId,
            inputId: prepared.delivery.inputId,
            inputEventId: prepared.delivery.inputEventId,
            inputWatermark: 1,
            payloadDigest: prepared.delivery.payloadDigest,
            recordedAt: prepared.delivery.recordedAt,
            sourceRef: prepared.delivery.sourceRef,
            deliveredViaRunnerId: prepared.delivery.deliveredViaRunnerId,
          }],
        }],
      },
    });
  });

  test("treats an exact input replay as an idempotent no-op but rejects conflicting replay", () => {
    const prepared = prepareCorrectionDelivery();
    const first = recordPrincipalTaskCorrectionDelivery(
      prepared.fixture.home,
      prepared.delivery,
    );
    const replay = recordPrincipalTaskCorrectionDelivery(
      prepared.fixture.home,
      prepared.delivery,
    );

    expect(replay).toEqual(first);
    expect(listPrincipalTasks(prepared.fixture.home)).toMatchObject({
      sourceRevision: 4,
      tasks: [{
        revision: 4,
        corrections: [{ deliveries: [{ inputId: prepared.delivery.inputId }] }],
      }],
    });

    expect(() => recordPrincipalTaskCorrectionDelivery(
      prepared.fixture.home,
      {
        ...prepared.delivery,
        payloadDigest: "e".repeat(64),
        expectedSourceRevision: 4,
        expectedRevision: 4,
      },
    )).toThrow("conflicts with its retained correction delivery");
    expect(listPrincipalTasks(prepared.fixture.home).sourceRevision).toBe(4);
  });

  test("retains exact post-send evidence despite later source or task revision drift", () => {
    const sourceDrift = prepareCorrectionDelivery();
    const sourceResult = recordPrincipalTaskCorrectionDelivery(
      sourceDrift.fixture.home,
      {
        ...sourceDrift.delivery,
        expectedSourceRevision: 2,
      },
    );
    expect(sourceResult).toMatchObject({
      sourceRevision: 4,
      task: {
        revision: 4,
        corrections: [{ deliveries: [{ inputId: sourceDrift.delivery.inputId }] }],
      },
    });

    const taskDrift = prepareCorrectionDelivery();
    const taskResult = recordPrincipalTaskCorrectionDelivery(
      taskDrift.fixture.home,
      {
        ...taskDrift.delivery,
        expectedRevision: 2,
      },
    );
    expect(taskResult).toMatchObject({
      sourceRevision: 4,
      task: {
        revision: 4,
        corrections: [{ deliveries: [{ inputId: taskDrift.delivery.inputId }] }],
      },
    });
  });

  test.each([
    {
      condition: "wrong Mission",
      change: { missionId: "other-mission" },
      message: "requires its exact registered project and Mission context",
    },
    {
      condition: "unknown authorization",
      change: { authorizationId: "22222222-2222-4222-8222-222222222222" },
      message: "has no execution link for correction delivery authorization",
    },
    {
      condition: "wrong proposal digest",
      change: { proposalDigest: "f".repeat(64) },
      message: "does not match its exact execution link selector",
    },
    {
      condition: "wrong claim source",
      change: {
        claimSourceRef:
          "receipts/execution-authorization-claims/other-claim.json",
      },
      message: "does not match its exact execution link selector",
    },
  ])("rejects $condition without retaining delivery evidence", ({ change, message }) => {
    const prepared = prepareCorrectionDelivery();

    expect(() => recordPrincipalTaskCorrectionDelivery(
      prepared.fixture.home,
      { ...prepared.delivery, ...change },
    )).toThrow(message);
    expect(listPrincipalTasks(prepared.fixture.home)).toMatchObject({
      sourceRevision: 3,
      tasks: [{ revision: 3, corrections: [{ deliveries: [] }] }],
    });
  });

  test("retains a receipt after the task enters verification without reopening it", () => {
    const prepared = prepareCorrectionDelivery();
    const submitted = submitPrincipalTaskResult(prepared.fixture.home, {
      id: prepared.fixture.taskId,
      summary: "Claimed complete before correction delivery",
      evidenceRefs: ["test:premature-result"],
      sourceRef: "agent:test",
      expectedSourceRevision: 3,
      expectedRevision: 3,
    });

    const retained = recordPrincipalTaskCorrectionDelivery(
      prepared.fixture.home,
      {
        ...prepared.delivery,
        expectedSourceRevision: 4,
        expectedRevision: submitted.task.revision,
      },
    );
    expect(retained.task).toMatchObject({
      lifecycle: "verifying",
      nextActor: "principal",
      corrections: [{
        deliveries: [{ inputId: prepared.delivery.inputId }],
      }],
    });
  });
});

interface Fixture {
  home: string;
  taskId: string;
  receiptPath: string;
  receipt: ExecutionAuthorizationReceipt;
  claimPath: string;
  claim: ExecutionAuthorizationClaim;
  taskContext: WorkbenchTaskExecutionContextRef;
}

function prepareCorrectionDelivery(): {
  fixture: Fixture;
  delivery: TaskRecordCorrectionDeliveryArguments;
} {
  const fixture = setup();
  const linked = linkPrincipalTaskExecution(fixture.home, {
    id: fixture.taskId,
    authorizationId,
    sourceRef: "operator:test-link",
    expectedSourceRevision: 1,
    expectedRevision: 1,
  });
  const corrected = correctPrincipalTask(fixture.home, {
    id: fixture.taskId,
    statement: "Apply the bounded correction to the failed effect.",
    nextActor: "agent",
    sourceRef: "principal:test-correction",
    expectedSourceRevision: 2,
    expectedRevision: linked.task.revision,
  });
  const correctionId = corrected.task.corrections.at(-1)!.id;
  return {
    fixture,
    delivery: {
      id: fixture.taskId,
      correctionId,
      authorizationId,
      proposalDigest: fixture.receipt.proposalDigest,
      claimSourceRef: relative(fixture.home, fixture.claimPath),
      missionId,
      inputId: `workbench-task-${fixture.taskId}-correction-${correctionId}`,
      inputEventId: "mission-input-event-1",
      inputWatermark: 1,
      payloadDigest: "d".repeat(64),
      recordedAt: "2026-07-28T12:30:00Z",
      sourceRef: `workbench-task:${fixture.taskId}/correction:${correctionId}`,
      deliveredViaRunnerId: "runner-live-1",
      expectedSourceRevision: 3,
      expectedRevision: corrected.task.revision,
    },
  };
}

function setup(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "rossovia-task-execution-link-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  initializeHome(home);
  const repository = join(root, "project");
  mkdirSync(join(repository, "apps", "missions"), { recursive: true });
  git(repository, "init", "-b", "main");
  git(repository, "config", "user.name", "Task Execution Link Test");
  git(repository, "config", "user.email", "task-execution-link@example.test");
  writeFileSync(join(repository, "README.md"), "# Task execution link fixture\n");
  writeJson(join(repository, "apps", "missions", `${missionId}.json`), {
    version: "mission-record.v1",
    id: missionId,
    title: "Daily task loop",
    sources: ["test:task-execution-link"],
    createdAt: "2026-07-28T00:00:00Z",
    updatedAt: "2026-07-28T00:00:00Z",
    mainline: {
      contradiction: "Bind a local task to one exact authorized execution",
      acceptance: ["The link remains evidence-only"],
      status: "active",
    },
    branches: [],
    currentFocus: "mainline",
  });
  git(repository, "add", ".");
  git(repository, "commit", "-m", "fixture");
  git(
    repository,
    "remote",
    "add",
    "origin",
    "https://example.test/lidessen/task-execution-link.git",
  );
  registerProject(home, {
    path: repository,
    id: projectId,
    aliases: ["fixture"],
  });
  const task = createPrincipalTask(home, {
    title: "Run the exact Mission execution",
    objective: "Retain one exact execution reference without importing runtime state",
    acceptance: ["The task links only validated authorization evidence"],
    nextActor: "agent",
    sourceRef: "principal:test-create",
    expectedSourceRevision: 0,
    project: "fixture",
    mission: missionId,
  });

  const receipt = receiptFixture(repository);
  const receiptPath = executionAuthorizationReceiptPath(
    home,
    projectId,
    missionId,
    proposalId,
  );
  writeJson(receiptPath, receipt);
  const claimPath = executionAuthorizationClaimPath(home, authorizationId);
  const taskContext = workbenchTaskExecutionContextRef(
    workbenchTaskExecutionContextFor(task.task, {
      authorizationId,
      proposalDigest: receipt.proposalDigest,
    }),
  );
  const claim = ExecutionAuthorizationClaimSchema.parse({
    version: "rosso.execution-authorization-claim.v1",
    authorizationId,
    projectId,
    missionId,
    proposalId,
    proposalDigest: receipt.proposalDigest,
    receipt: {
      ref: relative(home, receiptPath),
      digest: executionAuthorizationReceiptDigest(receipt),
    },
    localEvidence: {
      worktree: repository,
      gitHead: git(repository, "rev-parse", "HEAD"),
    },
    workbenchTaskContext: taskContext,
    claimedAt: "2026-07-28T12:00:00Z",
  });
  writeClaim(claimPath, claim);
  return {
    home,
    taskId: task.task.id,
    receiptPath,
    receipt,
    claimPath,
    claim,
    taskContext,
  };
}

function receiptFixture(repository: string): ExecutionAuthorizationReceipt {
  return ExecutionAuthorizationReceiptSchema.parse({
    version: "rosso.execution-authorization-receipt.v1",
    authorizationId,
    projectId,
    missionId,
    missionSource: {
      path: `apps/missions/${missionId}.json`,
      gitHead: git(repository, "rev-parse", "HEAD"),
    },
    proposalId,
    proposalDigest: "a".repeat(64),
    choices: [{ decisionId: "external-disclosure", replyKey: "ALLOW" }],
    immediateAuthorizedResults: [{
      decisionId: "external-disclosure",
      result: "Permit the declared request",
    }],
    executionBoundary: {
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
    sourceRef: "conversation:test/task-execution-link",
    attributionBoundary: "references-are-attribution-not-authentication",
    authorizedAt: "2026-07-28T11:59:00Z",
  });
}

function writeClaim(path: string, claim: ExecutionAuthorizationClaim): void {
  writeJson(path, ExecutionAuthorizationClaimSchema.parse(claim));
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
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

function taskCli(home: string, ...arguments_: string[]) {
  const result = Bun.spawnSync([
    process.execPath,
    bunCli,
    "--home",
    home,
    "task",
    ...arguments_,
  ], {
    cwd: repositoryRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}
