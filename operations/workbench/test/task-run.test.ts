import { afterEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import {
  CellInputSchema,
  CellRunRecordSchema,
} from "../../../packages/work-cell/src/contracts";
import { initializeHome } from "../src/home";
import { registerProject } from "../src/register";
import {
  acceptPrincipalTaskResult,
  correctPrincipalTask,
  createPrincipalTask,
  rebindPrincipalTaskWorktree,
  showPrincipalTask,
  submitPrincipalTaskResult,
} from "../src/tasks";
import {
  reconcilePrincipalTaskAttempt,
  runPrincipalTask as runPrincipalTaskImpl,
  type TaskRunResult,
  type TaskRunRequest,
  type TaskRunRunner,
} from "../src/task-run";
import type { WorkerCard } from "../../../packages/work-cell/src/worker-catalog";
import { showPrincipalTaskAttempts } from "../src/task-attempts";

const temporaryRoots: string[] = [];
const repositoryRoot = resolve(import.meta.dir, "../../..");
const bunCli = join(repositoryRoot, "operations", "workbench", "src", "cli.ts");
type ParsedCellRunRecord = ReturnType<typeof CellRunRecordSchema.parse>;

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

interface Fixture {
  root: string;
  home: string;
  primary: string;
  worktree: string;
}

function fixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "rossovia-task-run-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  const primary = join(root, "project");
  const worktree = join(root, "worktree");
  initializeHome(home);
  mkdirSync(primary, { recursive: true });
  git(primary, "init", "-b", "main");
  git(primary, "config", "user.name", "Task Run Test");
  git(primary, "config", "user.email", "task-run@example.test");
  writeFileSync(join(primary, "README.md"), "# Task run fixture\n");
  git(primary, "add", "README.md");
  git(primary, "commit", "-m", "initial");
  git(primary, "remote", "add", "origin", "https://example.test/lidessen/task-run.git");
  git(primary, "worktree", "add", "-b", "task/run", worktree);
  registerProject(home, {
    path: primary,
    id: "repository:task-run",
    aliases: ["task-run"],
  });
  return { root, home, primary, worktree };
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

function agentTask(fixture_: Fixture) {
  return createPrincipalTask(fixture_.home, {
    title: "Run one ordinary task",
    objective: "Implement the exact bounded change",
    acceptance: ["The requested behavior is observable", "Named checks pass"],
    nextActor: "agent",
    sourceRef: "test:task-run",
    expectedSourceRevision: 0,
    project: "task-run",
    worktree: fixture_.worktree,
  });
}

interface LegacyTestRunArguments {
  id: string;
  driver: "opencode-cli";
  model: string;
  reasoningEffort?: string;
  session?: string;
  expectedSourceRevision: number;
  expectedRevision: number;
}

function runTestTask(
  home: string,
  arguments_: LegacyTestRunArguments,
  runner?: TaskRunRunner,
  dependencies: Parameters<typeof runPrincipalTaskImpl>[3] = {},
): TaskRunResult {
  const workerId = "test-worker";
  const [provider] = arguments_.model.split("/", 1);
  const card: WorkerCard = {
    version: "work-cell.worker-card.v1",
    id: workerId,
    labels: ["coding", "text", "write", "commands"],
    description: "Deterministic task-run test worker.",
    executionProfile: {
      id: workerId,
      version: "execution-profile.v1",
      provider: provider!,
      model: arguments_.model,
      ...(arguments_.reasoningEffort
        ? { reasoningEffort: arguments_.reasoningEffort }
        : {}),
      parallelism: "serial",
    },
    availability: { status: "available" },
  };
  return runPrincipalTaskImpl(
    home,
    {
      id: arguments_.id,
      workerId,
      ...(arguments_.session ? { continueRun: true } : {}),
    },
    runner,
    {
      ...dependencies,
      resolveWorkerCard: () => card,
    },
  );
}

class FakeRunner implements TaskRunRunner {
  readonly requests: TaskRunRequest[] = [];

  constructor(
    private readonly retain: (
      record: ParsedCellRunRecord,
      request: TaskRunRequest,
    ) => unknown = (record) => record,
    private readonly observedSessions: string[] = [],
  ) {}

  run(request: TaskRunRequest) {
    this.requests.push(request);
    const result = {
      runId: `fake-run-${this.requests.length}`,
      status: "passed" as const,
    };
    const observedSession = this.observedSessions[this.requests.length - 1]
      ?? request.session
      ?? `fresh-session-${this.requests.length}`;
    const record = validWorkCellRecord(request, result, observedSession);
    writeFileSync(
      request.finalRecordPath,
      `${JSON.stringify(this.retain(record, request), null, 2)}\n`,
      { flag: "wx" },
    );
    return result;
  }
}

function validWorkCellRecord(
  request: TaskRunRequest,
  result: { runId: string; status: "passed" },
  sessionId = "session-1",
): ParsedCellRunRecord {
  const input = CellInputSchema.parse(JSON.parse(readFileSync(request.inputPath, "utf8")));
  return CellRunRecordSchema.parse({
    version: "work-cell.run.v4",
    runId: result.runId,
    cellId: input.id,
    driver: {
      adapter: "opencode-cli.v1",
      provider: request.model.split("/", 1)[0],
      model: request.model,
    },
    startedAt: "2026-08-12T00:00:00.000Z",
    finishedAt: "2026-08-12T00:00:01.000Z",
    durationMs: 1_000,
    status: result.status,
    input,
    finalText: "Fake Work Cell settled.",
    artifacts: [],
    verification: {
      passed: true,
      terminal: { passed: true, required: [], called: [] },
      artifacts: { passed: true, errors: [] },
    },
    workspaceDiff: { added: [], changed: [], removed: [] },
    usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 },
    usageByPhase: {
      preparation: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
      execution: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 },
    },
    executionObservation: { sessionId },
    trace: [],
    rawSteps: [],
  });
}

interface InterruptedAttemptFixture {
  attemptId: string;
  directory: string;
  attemptBytes: string;
  inputBytes: string;
  leasePath: string;
  leaseContent: string;
}

function interruptedAttempt(
  fixture_: Fixture,
  taskId: string,
  pid: number,
): InterruptedAttemptFixture {
  const attemptId = randomUUID();
  const directory = join(fixture_.home, "state", "task-attempts", attemptId);
  mkdirSync(directory, { recursive: true });
  const inputRef = `state/task-attempts/${attemptId}/cell-input.json`;
  const finalRecordRef = `state/task-attempts/${attemptId}/cell-input.run.json`;
  const attemptBytes = `${JSON.stringify({
    version: "rosso.task-run-attempt.v1",
    taskId,
    taskRevision: 1,
    sourceRevision: 1,
    attemptId,
    inputRef,
    finalRecordRef,
    workerId: "test-worker",
    driver: "opencode-cli",
    model: "opencode/go",
    status: "started",
    startedAt: "2026-08-12T12:00:00.000Z",
  }, null, 2)}\n`;
  const inputBytes = `${JSON.stringify({
    id: `workbench-task-${taskId}-attempt-${attemptId}`,
    workerId: "test-worker",
    intent: "Implement the exact bounded change",
    workspace: {
      root: realpathSync(fixture_.worktree),
      readPaths: ["."],
      writePaths: ["."],
      excludePaths: [],
      allowedCommands: [],
    },
    instructions: [
      "Complete the current Workbench Task in the bound worktree. Do not claim semantic acceptance.",
    ],
    capabilities: [],
    context: [],
    capabilitiesRequired: [],
    acceptance: ["The requested behavior is observable"],
    budget: { maxDurationMs: 1_800_000 },
  }, null, 2)}\n`;
  writeFileSync(join(directory, "attempt.json"), attemptBytes);
  writeFileSync(join(directory, "cell-input.json"), inputBytes);
  const gitDirectoryRaw = git(fixture_.worktree, "rev-parse", "--git-dir");
  const gitDirectory = realpathSync(
    isAbsolute(gitDirectoryRaw) ? gitDirectoryRaw : join(fixture_.worktree, gitDirectoryRaw),
  );
  const leasePath = join(gitDirectory, "rossovia-task-run.lock");
  const leaseContent = `${JSON.stringify({
    version: "rosso.task-run-worktree-lease.v1",
    worktree: realpathSync(fixture_.worktree),
    taskId,
    attemptId,
    pid,
    acquiredAt: "2026-08-12T12:00:00.000Z",
  }, null, 2)}\n`;
  writeFileSync(leasePath, leaseContent, { flag: "wx" });
  return { attemptId, directory, attemptBytes, inputBytes, leasePath, leaseContent };
}

function deadPid(): number {
  const result = Bun.spawnSync(["sh", "-c", "exit 0"]);
  if (result.exitCode !== 0) throw new Error("dead pid fixture failed");
  return result.pid;
}

describe("task attempt reconciliation", () => {
  test("reconciles an interrupted attempt with a dead owner, preserving evidence and enabling a fresh run", () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = interruptedAttempt(current, created.task.id, deadPid());

    const result = reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    });
    expect(result).toMatchObject({
      version: "rosso.task-attempt-reconcile.v1",
      taskId: created.task.id,
      taskRevision: 1,
      attemptId: attempt.attemptId,
      settlementRef: `state/task-attempts/${attempt.attemptId}/settlement.json`,
      status: "runner-failed",
      error: expect.stringContaining("interrupted"),
    });

    const settlement = JSON.parse(
      readFileSync(join(current.home, result.settlementRef), "utf8"),
    );
    expect(settlement).toMatchObject({
      version: "rosso.task-run-settlement.v1",
      taskId: created.task.id,
      taskRevision: 1,
      attemptId: attempt.attemptId,
      inputRef: `state/task-attempts/${attempt.attemptId}/cell-input.json`,
      finalRecordRef: `state/task-attempts/${attempt.attemptId}/cell-input.run.json`,
      status: "runner-failed",
      semanticAcceptance: "not-evaluated",
      error: expect.stringContaining("interrupted before a final Work Cell record"),
    });
    expect(settlement).not.toHaveProperty("workCellRunId");
    expect(settlement).not.toHaveProperty("cellStatus");
    expect(settlement).not.toHaveProperty("sessionId");

    expect(existsSync(attempt.leasePath)).toBeFalse();
    expect(existsSync(join(attempt.directory, "cell-input.run.json"))).toBeFalse();
    expect(readFileSync(join(attempt.directory, "attempt.json"), "utf8")).toBe(attempt.attemptBytes);
    expect(readFileSync(join(attempt.directory, "cell-input.json"), "utf8")).toBe(attempt.inputBytes);

    const projections = showPrincipalTaskAttempts(current.home, created.task.id);
    expect(projections).toHaveLength(1);
    expect(projections[0]).toMatchObject({ attemptId: attempt.attemptId, status: "runner-failed" });
    expect(projections[0]).not.toHaveProperty("observedSession");
    expect(projections[0]).not.toHaveProperty("cellStatus");
    expect(projections[0]).not.toHaveProperty("usage");
    expect(projections[0]).not.toHaveProperty("workspaceDiff");
    expect(projections[0]).not.toHaveProperty("verification");

    expect(() => runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      session: "retained-session",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeRunner())).toThrow("has no usable recorded Work Cell attempt");

    const runner = new FakeRunner();
    expect(() => runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner)).not.toThrow();
    expect(runner.requests).toHaveLength(1);
  });

  test("refuses to reconcile while the recorded lease owner process is still alive", () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = interruptedAttempt(current, created.task.id, process.pid);

    expect(() => reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    })).toThrow(`still alive or owned elsewhere`);
    expect(existsSync(join(attempt.directory, "settlement.json"))).toBeFalse();
    expect(readFileSync(attempt.leasePath, "utf8")).toBe(attempt.leaseContent);
  });

  test("fails closed on mismatched attempt, task, and lease identities", () => {
    const cases: Array<{
      mutate: (value: InterruptedAttemptFixture) => void;
      error: RegExp;
    }> = [
      {
        mutate: (value) => {
          writeFileSync(join(value.directory, "attempt.json"), `${JSON.stringify({
            version: "rosso.task-run-attempt.v1",
            taskId: randomUUID(),
            taskRevision: 1,
            attemptId: value.attemptId,
            inputRef: `state/task-attempts/${value.attemptId}/cell-input.json`,
            finalRecordRef: `state/task-attempts/${value.attemptId}/cell-input.run.json`,
            status: "started",
          }, null, 2)}\n`);
        },
        error: /retains invalid evidence and cannot be reconciled/,
      },
      {
        mutate: (value) => {
          const record = JSON.parse(readFileSync(join(value.directory, "attempt.json"), "utf8"));
          record.attemptId = randomUUID();
          writeFileSync(join(value.directory, "attempt.json"), `${JSON.stringify(record, null, 2)}\n`);
        },
        error: /retains invalid evidence and cannot be reconciled/,
      },
      {
        mutate: (value) => {
          const bytes = JSON.parse(readFileSync(value.leasePath, "utf8"));
          bytes.attemptId = randomUUID();
          writeFileSync(value.leasePath, `${JSON.stringify(bytes, null, 2)}\n`);
        },
        error: /the retained task-run lease belongs to attempt .*, not the requested attempt/,
      },
      {
        mutate: (value) => {
          const bytes = JSON.parse(readFileSync(value.leasePath, "utf8"));
          bytes.taskId = randomUUID();
          writeFileSync(value.leasePath, `${JSON.stringify(bytes, null, 2)}\n`);
        },
        error: /the retained task-run lease belongs to task .*, not the requested task/,
      },
      {
        mutate: (value) => {
          const bytes = JSON.parse(readFileSync(value.leasePath, "utf8"));
          bytes.worktree = join(value.directory, "another-worktree");
          writeFileSync(value.leasePath, `${JSON.stringify(bytes, null, 2)}\n`);
        },
        error: /lease Worktree does not match the task's current bound Worktree/,
      },
      {
        mutate: (value) => {
          rmSync(value.leasePath);
        },
        error: /has no retained task-run lease/,
      },
    ];
    for (const candidate of cases) {
      const current = fixture();
      const created = agentTask(current);
      const attempt = interruptedAttempt(current, created.task.id, deadPid());
      candidate.mutate(attempt);
      expect(() => reconcilePrincipalTaskAttempt(current.home, {
        id: created.task.id,
        attemptId: attempt.attemptId,
      })).toThrow(candidate.error);
      expect(existsSync(join(attempt.directory, "settlement.json"))).toBeFalse();
    }
  });

  test("fails closed on unknown task, missing attempt evidence, invalid ids, and unbound tasks", () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = interruptedAttempt(current, created.task.id, deadPid());

    expect(() => reconcilePrincipalTaskAttempt(current.home, {
      id: "missing-task",
      attemptId: attempt.attemptId,
    })).toThrow("Principal task not found");
    expect(() => reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: randomUUID(),
    })).toThrow("has no retained attempt evidence");
    expect(() => reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: "../escape",
    })).toThrow("must be a valid attempt id");

    const unbound = createPrincipalTask(current.home, {
      title: "Unbound task",
      objective: "Remain unbound",
      acceptance: ["Reconciliation is refused"],
      nextActor: "agent",
      sourceRef: "test:unbound",
      expectedSourceRevision: 1,
    });
    expect(() => reconcilePrincipalTaskAttempt(current.home, {
      id: unbound.task.id,
      attemptId: attempt.attemptId,
    })).toThrow("must be bound to an existing project Worktree");
    expect(existsSync(join(attempt.directory, "settlement.json"))).toBeFalse();
  });

  test("fails closed on invalid terminal evidence and on a changed lease byte shape", () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = interruptedAttempt(current, created.task.id, deadPid());
    writeFileSync(join(attempt.directory, "cell-input.run.json"), "{}\n");

    expect(() => reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    })).toThrow("retains invalid evidence and cannot be reconciled");
    rmSync(join(attempt.directory, "cell-input.run.json"));

    writeFileSync(join(attempt.directory, "settlement.json"), "{}\n");
    expect(() => reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    })).toThrow("retains invalid evidence and cannot be reconciled");
    rmSync(join(attempt.directory, "settlement.json"));

    writeFileSync(attempt.leasePath, "not-json\n");
    expect(() => reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    })).toThrow("does not carry the exact expected identity bytes");
    expect(existsSync(join(attempt.directory, "settlement.json"))).toBeFalse();
  });

  test("a second reconciliation after success fails closed without touching retained evidence", () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = interruptedAttempt(current, created.task.id, deadPid());
    const first = reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    });
    const settlementBytes = readFileSync(join(current.home, first.settlementRef), "utf8");

    expect(() => reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    })).toThrow("has no retained task-run lease");
    expect(readFileSync(join(current.home, first.settlementRef), "utf8")).toBe(settlementBytes);
    expect(readFileSync(join(attempt.directory, "attempt.json"), "utf8")).toBe(attempt.attemptBytes);
    expect(readFileSync(join(attempt.directory, "cell-input.json"), "utf8")).toBe(attempt.inputBytes);
  });

  test("retries the exact lease finalization when the exact settlement exists and the dead-owner lease remains", () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = interruptedAttempt(current, created.task.id, deadPid());
    const first = reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    });
    const settlementBytes = readFileSync(join(current.home, first.settlementRef), "utf8");

    // The crash-after-settlement-before-release shape: the exact settlement
    // exists and the still-exact dead-owner lease remains.
    writeFileSync(attempt.leasePath, attempt.leaseContent, { flag: "wx" });
    const retried = reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    });
    expect(retried).toMatchObject({
      taskId: created.task.id,
      attemptId: attempt.attemptId,
      status: "runner-failed",
      error: expect.stringContaining("interrupted"),
    });
    expect(readFileSync(join(current.home, first.settlementRef), "utf8")).toBe(settlementBytes);
    expect(existsSync(attempt.leasePath)).toBeFalse();

    // The still-exact settlement with a changed lease identity fails closed.
    writeFileSync(attempt.leasePath, attempt.leaseContent, { flag: "wx" });
    const bytes = JSON.parse(readFileSync(attempt.leasePath, "utf8"));
    bytes.attemptId = randomUUID();
    writeFileSync(attempt.leasePath, `${JSON.stringify(bytes, null, 2)}\n`);
    expect(() => reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    })).toThrow("belongs to attempt");
    expect(readFileSync(join(current.home, first.settlementRef), "utf8")).toBe(settlementBytes);
    expect(existsSync(attempt.leasePath)).toBeTrue();
  });

  test("derives the shared normal settlement from a retained final record without a settlement", () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = interruptedAttempt(current, created.task.id, deadPid());
    const input = JSON.parse(readFileSync(join(attempt.directory, "cell-input.json"), "utf8"));
    const finalRecord = validWorkCellRecord({
      inputPath: join(attempt.directory, "cell-input.json"),
      finalRecordPath: join(attempt.directory, "cell-input.run.json"),
      driver: "opencode-cli",
      model: "opencode/go",
    }, { runId: "recovered-run", status: "passed" }, "recovered-session-1");
    writeFileSync(join(attempt.directory, "cell-input.run.json"), `${JSON.stringify(finalRecord, null, 2)}\n`);

    const result = reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    });
    expect(result).toMatchObject({
      taskId: created.task.id,
      attemptId: attempt.attemptId,
      status: "recorded",
      workCellRunId: "recovered-run",
      cellStatus: "passed",
    });
    expect(result).not.toHaveProperty("error");

    const settlement = JSON.parse(
      readFileSync(join(current.home, result.settlementRef), "utf8"),
    );
    expect(settlement).toMatchObject({
      status: "recorded",
      workCellRunId: "recovered-run",
      cellStatus: "passed",
      semanticAcceptance: "not-evaluated",
    });
    expect(settlement).not.toHaveProperty("error");
    expect(existsSync(attempt.leasePath)).toBeFalse();
    expect(readFileSync(join(attempt.directory, "attempt.json"), "utf8")).toBe(attempt.attemptBytes);
    expect(readFileSync(join(attempt.directory, "cell-input.json"), "utf8")).toBe(attempt.inputBytes);

    // The recovered owner-backed final record makes normal continuation
    // attributable again; a fresh run remains available too.
    expect(() => runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      session: "recovered-session-1",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeRunner())).not.toThrow();
  });

  test("a failed final record without a settlement derives runner-failed with retained cell evidence", () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = interruptedAttempt(current, created.task.id, deadPid());
    const finalRecord = validWorkCellRecord({
      inputPath: join(attempt.directory, "cell-input.json"),
      finalRecordPath: join(attempt.directory, "cell-input.run.json"),
      driver: "opencode-cli",
      model: "opencode/go",
    }, { runId: "failed-run", status: "passed" }, "session-failed");
    writeFileSync(
      join(attempt.directory, "cell-input.run.json"),
      `${JSON.stringify({ ...finalRecord, status: "failed", error: "the run failed" }, null, 2)}\n`,
    );

    const result = reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    });
    expect(result).toMatchObject({
      status: "runner-failed",
      workCellRunId: "failed-run",
      cellStatus: "failed",
      error: "the run failed",
    });
    expect(existsSync(attempt.leasePath)).toBeFalse();
  });

  test("refuses to derive a settlement from a final record that does not match its immutable input", () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = interruptedAttempt(current, created.task.id, deadPid());
    const finalRecord = validWorkCellRecord({
      inputPath: join(attempt.directory, "cell-input.json"),
      finalRecordPath: join(attempt.directory, "cell-input.run.json"),
      driver: "opencode-cli",
      model: "opencode/go",
    }, { runId: "tampered-run", status: "passed" }, "session-tampered");
    writeFileSync(
      join(attempt.directory, "cell-input.run.json"),
      `${JSON.stringify({ ...finalRecord, input: { ...finalRecord.input, intent: "forged" } }, null, 2)}\n`,
    );

    expect(() => reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    })).toThrow("does not match its immutable CellInput");
    expect(existsSync(join(attempt.directory, "settlement.json"))).toBeFalse();
    expect(existsSync(attempt.leasePath)).toBeTrue();
  });

  test("the CLI exposes task reconcile-attempt with the exact attempt selector", () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = interruptedAttempt(current, created.task.id, deadPid());

    const missing = taskCli(current.home, "reconcile-attempt", created.task.id);
    expect(missing.exitCode).toBe(2);
    expect(missing.stderr).toContain("task command requires --attempt <value>");

    const result = taskCliWithOutput(
      current.home,
      "reconcile-attempt",
      created.task.id,
      "--attempt",
      attempt.attemptId,
    );
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      taskId: created.task.id,
      attemptId: attempt.attemptId,
      status: "runner-failed",
    });
    expect(existsSync(attempt.leasePath)).toBeFalse();
  });
});

describe("task run public boundary", () => {
  test("selects the available Kimi worker and lowers its exact OpenCode carrier identity", () => {
    const current = fixture();
    const created = agentTask(current);
    const runner = new FakeRunner();
    const originalOpenCodeKey = process.env.OPENCODE_API_KEY;
    const originalKimiKey = process.env.KIMI_CODE_API_KEY;
    process.env.OPENCODE_API_KEY = "configured-for-test";
    delete process.env.KIMI_CODE_API_KEY;

    try {
      const result = runPrincipalTaskImpl(current.home, {
        id: created.task.id,
        workerId: "kimi-coding",
      }, runner);
      const input = JSON.parse(readFileSync(join(current.home, result.inputRef), "utf8"));
      expect(input.executionProfile).toMatchObject({
        provider: "opencode-go",
        model: "kimi-k2.7-code",
      });
      expect(runner.requests).toEqual([
        expect.objectContaining({
          driver: "opencode-cli",
          model: "opencode-go/kimi-k2.7-code",
        }),
      ]);
    } finally {
      restoreEnvironment("OPENCODE_API_KEY", originalOpenCodeKey);
      restoreEnvironment("KIMI_CODE_API_KEY", originalKimiKey);
    }
  });

  test("rejects the Kimi worker when only its obsolete provider credential is configured", () => {
    const current = fixture();
    const created = agentTask(current);
    const runner = new FakeRunner();
    const originalOpenCodeKey = process.env.OPENCODE_API_KEY;
    const originalKimiKey = process.env.KIMI_CODE_API_KEY;
    delete process.env.OPENCODE_API_KEY;
    process.env.KIMI_CODE_API_KEY = "configured-for-test";

    try {
      expect(() => runPrincipalTaskImpl(current.home, {
        id: created.task.id,
        workerId: "kimi-coding",
      }, runner)).toThrow("worker kimi-coding is unavailable: OPENCODE_API_KEY is not configured");
      expect(runner.requests).toHaveLength(0);
    } finally {
      restoreEnvironment("OPENCODE_API_KEY", originalOpenCodeKey);
      restoreEnvironment("KIMI_CODE_API_KEY", originalKimiKey);
    }
  });

  test("lowers exact current task guidance without Mission and appends immutable attempts", () => {
    const current = fixture();
    const created = agentTask(current);
    const firstCorrection = correctPrincipalTask(current.home, {
      id: created.task.id,
      statement: "Preserve the public contract.",
      sourceRef: "test:first-correction",
      nextActor: "agent",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    });
    const corrected = correctPrincipalTask(current.home, {
      id: created.task.id,
      statement: "Do not add a post-completion mechanism.",
      sourceRef: "test:second-correction",
      nextActor: "agent",
      expectedSourceRevision: 2,
      expectedRevision: firstCorrection.task.revision,
    });
    const runner = new FakeRunner();
    const run = () => runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      reasoningEffort: "high",
      expectedSourceRevision: 3,
      expectedRevision: corrected.task.revision,
    }, runner);

    const first = run();
    const second = run();
    const input = JSON.parse(readFileSync(join(current.home, first.inputRef), "utf8"));
    expect(input).toMatchObject({
      intent: "Implement the exact bounded change",
      acceptance: ["The requested behavior is observable", "Named checks pass"],
      instructions: [
        "Complete the current Workbench Task in the bound worktree. Do not claim semantic acceptance.",
        "Preserve the public contract.",
        "Do not add a post-completion mechanism.",
      ],
      workspace: {
        root: realpathSync(current.worktree),
        writePaths: ["."],
        excludePaths: [
          ".git",
          "node_modules",
          "dist",
          "build",
          "target",
          "coverage",
          ".next",
          "outputs",
          ".work-cell",
          ".reasonix",
        ],
      },
    });
    expect(input).toMatchObject({
      workerId: "test-worker",
      executionProfile: {
        provider: "opencode",
        model: "opencode/go",
        reasoningEffort: "high",
      },
      budget: { maxDurationMs: 1_800_000 },
    });
    expect(corrected.task.binding).not.toHaveProperty("missionId");
    expect(first.attemptId).not.toBe(second.attemptId);
    expect(first.inputRef).not.toBe(second.inputRef);
    expect(first.finalRecordRef).not.toBe(second.finalRecordRef);
    expect(runner.requests).toEqual([
      expect.objectContaining({
        driver: "opencode-cli",
        model: "opencode/go",
        reasoningEffort: "high",
      }),
      expect.objectContaining({
        driver: "opencode-cli",
        model: "opencode/go",
        reasoningEffort: "high",
      }),
    ]);

    const attemptRecord = JSON.parse(
      readFileSync(join(current.home, first.attemptRef), "utf8"),
    );
    expect(attemptRecord).toMatchObject({ reasoningEffort: "high" });
    expect(attemptRecord).not.toHaveProperty("variant");

    const settlement = JSON.parse(readFileSync(join(current.home, first.settlementRef), "utf8"));
    expect(settlement).toMatchObject({
      taskRevision: corrected.task.revision,
      attemptId: first.attemptId,
      inputRef: first.inputRef,
      finalRecordRef: first.finalRecordRef,
      status: "recorded",
      cellStatus: "passed",
      semanticAcceptance: "not-evaluated",
    });
    expect(showPrincipalTask(current.home, created.task.id)).toEqual({
      sourceRevision: 3,
      task: corrected.task,
    });
  });

  test("lowers ordinary todos into the immutable CellInput.tasks seeds only when non-empty", () => {
    const current = fixture();
    const created = createPrincipalTask(current.home, {
      title: "Run one todo-backed task",
      objective: "Implement the exact bounded change",
      acceptance: ["The requested behavior is observable"],
      todos: ["Implement the backend task loop", "Run the named checks"],
      nextActor: "agent",
      sourceRef: "test:task-run-todos",
      expectedSourceRevision: 0,
      project: "task-run",
      worktree: current.worktree,
    });
    const runner = new FakeRunner();
    const withTodos = runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner);
    const seededInput = JSON.parse(
      readFileSync(join(current.home, withTodos.inputRef), "utf8"),
    );
    expect(seededInput.tasks).toEqual([
      { subject: "Implement the backend task loop", description: "Implement the backend task loop" },
      { subject: "Run the named checks", description: "Run the named checks" },
    ]);

    const plain = createPrincipalTask(current.home, {
      title: "Run one todo-less task",
      objective: "Implement the exact bounded change",
      acceptance: ["The requested behavior is observable"],
      nextActor: "agent",
      sourceRef: "test:task-run-without-todos",
      expectedSourceRevision: 1,
      project: "task-run",
      worktree: current.worktree,
    });
    const withoutTodos = runTestTask(current.home, {
      id: plain.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 2,
      expectedRevision: 1,
    }, runner);
    const plainInput = JSON.parse(
      readFileSync(join(current.home, withoutTodos.inputRef), "utf8"),
    );
    expect(plainInput).not.toHaveProperty("tasks");
    expect(plainInput).toMatchObject({
      intent: "Implement the exact bounded change",
      acceptance: ["The requested behavior is observable"],
    });
  });

  test("returns the observed OpenCode session and continues the same active task by session", () => {
    const current = fixture();
    const created = agentTask(current);
    const runner = new FakeRunner();

    const fresh = runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner);
    expect(fresh.sessionId).toBe("fresh-session-1");

    const resumed = runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      session: fresh.sessionId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner);
    expect(resumed.sessionId).toBe(fresh.sessionId);
    expect(runner.requests[1]).toMatchObject({
      driver: "opencode-cli",
      model: "opencode/go",
      session: fresh.sessionId,
    });
  });

  test("continues the latest retained session when its Git-visible dirty paths remain owned", () => {
    const current = fixture();
    const created = agentTask(current);
    const retainedPath = "app/blog/content.ts";
    const runner = new FakeRunner((record, request) => {
      if (request.session === undefined) {
        mkdirSync(join(current.worktree, "app", "blog"), { recursive: true });
        writeFileSync(join(current.worktree, retainedPath), "export const draft = true;\n");
        return {
          ...record,
          workspaceDiff: { added: [retainedPath], changed: [], removed: [] },
        };
      }
      return record;
    });
    const first = runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner);

    expect(() => runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      session: first.sessionId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner)).not.toThrow();
    expect(runner.requests).toHaveLength(2);
  });

  test("retains cumulative added, removed, and renamed paths across a later subset attempt", () => {
    const current = fixture();
    const firstPath = "app/blog/content.ts";
    const untouchedPath = "app/blog/metadata.ts";
    const removedPath = "legacy.txt";
    const renamedPath = "docs/README.md";
    writeFileSync(join(current.worktree, removedPath), "legacy\n");
    git(current.worktree, "add", removedPath);
    git(current.worktree, "commit", "-m", "add legacy fixture");
    const created = agentTask(current);
    const runner = new FakeRunner((record) => {
      mkdirSync(join(current.worktree, "app", "blog"), { recursive: true });
      if (runner.requests.length === 1) {
        writeFileSync(join(current.worktree, firstPath), "export const content = 1;\n");
        writeFileSync(join(current.worktree, untouchedPath), "export const metadata = 1;\n");
        mkdirSync(join(current.worktree, "docs"), { recursive: true });
        git(current.worktree, "mv", "README.md", renamedPath);
        rmSync(join(current.worktree, removedPath));
        return {
          ...record,
          workspaceDiff: {
            added: [firstPath, untouchedPath, renamedPath],
            changed: [],
            removed: ["README.md", removedPath],
          },
        };
      }
      if (runner.requests.length === 2) {
        writeFileSync(join(current.worktree, firstPath), "export const content = 2;\n");
        return {
          ...record,
          workspaceDiff: { added: [], changed: [firstPath], removed: [] },
        };
      }
      return record;
    });
    const first = runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner);
    runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      session: first.sessionId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner);

    expect(() => runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      session: first.sessionId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner)).not.toThrow();
    expect(runner.requests).toHaveLength(3);
  });

  test("preserves leading whitespace and embedded newlines in raw Git-visible paths", () => {
    for (const retainedPath of [" leading-space.ts", "line\nbreak.ts"]) {
      const current = fixture();
      const created = agentTask(current);
      const runner = new FakeRunner((record, request) => {
        if (request.session === undefined) {
          writeFileSync(join(current.worktree, retainedPath), "export const draft = true;\n");
          return {
            ...record,
            workspaceDiff: { added: [retainedPath], changed: [], removed: [] },
          };
        }
        return record;
      });
      const first = runTestTask(current.home, {
        id: created.task.id,
        driver: "opencode-cli",
        model: "opencode/go",
        expectedSourceRevision: 1,
        expectedRevision: 1,
      }, runner);

      expect(() => runTestTask(current.home, {
        id: created.task.id,
        driver: "opencode-cli",
        model: "opencode/go",
        session: first.sessionId,
        expectedSourceRevision: 1,
        expectedRevision: 1,
      }, runner)).not.toThrow();
      expect(runner.requests).toHaveLength(2);
    }
  });

  test("does not inherit path ownership across a fresh-session discontinuity", () => {
    const current = fixture();
    const created = agentTask(current);
    const priorPath = "prior-session.ts";
    const currentPath = "current-session.ts";
    const runner = new FakeRunner((record) => {
      if (runner.requests.length === 1) {
        writeFileSync(join(current.worktree, priorPath), "export const prior = true;\n");
        return {
          ...record,
          workspaceDiff: { added: [priorPath], changed: [], removed: [] },
        };
      }
      if (runner.requests.length === 2) {
        writeFileSync(join(current.worktree, currentPath), "export const current = true;\n");
        return {
          ...record,
          workspaceDiff: { added: [currentPath], changed: [], removed: [] },
        };
      }
      return record;
    }, ["session-prior", "session-current"]);
    runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner);
    rmSync(join(current.worktree, priorPath));
    const currentSession = runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner);
    writeFileSync(join(current.worktree, priorPath), "unowned in current session\n");

    expect(() => runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      session: currentSession.sessionId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner)).toThrow(
      `task Worktree has Git-visible paths outside the retained same-session workspace diff history: ${priorPath}`,
    );
    expect(runner.requests).toHaveLength(2);
  });

  test("rejects extra tracked or untracked paths outside retained same-session history", () => {
    for (const extra of ["README.md", "notes/unowned.md"]) {
      const current = fixture();
      const created = agentTask(current);
      const retainedPath = "app/blog/content.ts";
      const runner = new FakeRunner((record) => {
        mkdirSync(join(current.worktree, "app", "blog"), { recursive: true });
        writeFileSync(join(current.worktree, retainedPath), "export const draft = true;\n");
        return {
          ...record,
          workspaceDiff: { added: [retainedPath], changed: [], removed: [] },
        };
      });
      const first = runTestTask(current.home, {
        id: created.task.id,
        driver: "opencode-cli",
        model: "opencode/go",
        expectedSourceRevision: 1,
        expectedRevision: 1,
      }, runner);
      mkdirSync(join(current.worktree, "notes"), { recursive: true });
      writeFileSync(join(current.worktree, extra), "unowned\n");

      expect(() => runTestTask(current.home, {
        id: created.task.id,
        driver: "opencode-cli",
        model: "opencode/go",
        session: first.sessionId,
        expectedSourceRevision: 1,
        expectedRevision: 1,
      }, runner)).toThrow(
        `task Worktree has Git-visible paths outside the retained same-session workspace diff history: ${extra}`,
      );
      expect(runner.requests).toHaveLength(1);
    }
  });

  test("does not let ignored artifacts block an explicit session continuation", () => {
    const current = fixture();
    writeFileSync(join(current.worktree, ".gitignore"), "build/\n");
    git(current.worktree, "add", ".gitignore");
    git(current.worktree, "commit", "-m", "ignore build artifacts");
    const created = agentTask(current);
    const runner = new FakeRunner();
    const first = runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner);
    mkdirSync(join(current.worktree, "build"), { recursive: true });
    writeFileSync(join(current.worktree, "build", "artifact.js"), "generated\n");

    expect(() => runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      session: first.sessionId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner)).not.toThrow();
    expect(runner.requests).toHaveLength(2);
  });

  test("continues the latest retained session without a caller-supplied session id", () => {
    const current = fixture();
    const created = agentTask(current);
    const runner = new FakeRunner(undefined, ["session-old", "session-latest"]);
    const first = runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner);
    runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner);

    const continued = runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      session: first.sessionId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner);
    expect(continued.sessionId).toBe("session-latest");
    expect(runner.requests[2]).toMatchObject({ session: "session-latest" });
  });

  test("a failed mismatched observation terminates the previously passed session branch", () => {
    const current = fixture();
    const created = agentTask(current);
    const runner = new FakeRunner(undefined, ["requested-session-1", "observed-session-9"]);
    const first = runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner);
    expect(first.sessionId).toBe("requested-session-1");
    expect(() => runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      session: "requested-session-1",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner)).toThrow(
      "requested OpenCode session does not match the observed session: requested requested-session-1, observed observed-session-9",
    );
    const attemptDirectory = join(current.home, "state", "task-attempts");
    const attempts = readdirSync(attemptDirectory);
    const statuses = attempts.map((attempt) => JSON.parse(
      readFileSync(join(attemptDirectory, attempt, "settlement.json"), "utf8"),
    ).status);
    expect(statuses).toContain("runner-failed");
    expect(() => runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      session: first.sessionId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner)).toThrow("has no usable recorded Work Cell attempt in the current Worktree session branch");
    expect(runner.requests).toHaveLength(2);
  });

  test("rejects a session that was not observed in a prior attempt of the same active task", () => {
    const current = fixture();
    const created = agentTask(current);
    const runner = new FakeRunner();
    expect(() => runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      session: "external-session",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner)).toThrow(
      `task ${created.task.id} has no usable recorded Work Cell attempt in the current Worktree`,
    );
    expect(runner.requests).toHaveLength(0);
  });

  test("rejects a retained session from the same active task's previous Worktree", () => {
    const current = fixture();
    const created = agentTask(current);
    const runner = new FakeRunner();
    const first = runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner);
    const replacement = join(current.root, "replacement-worktree");
    git(current.primary, "worktree", "add", "-b", "task/replacement", replacement);
    const rebound = rebindPrincipalTaskWorktree(current.home, {
      id: created.task.id,
      expectedWorktreePath: realpathSync(current.worktree),
      worktree: replacement,
      sourceRef: "test:replace-task-run-worktree",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    });

    expect(() => runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      session: first.sessionId,
      expectedSourceRevision: rebound.sourceRevision,
      expectedRevision: rebound.task.revision,
    }, runner)).toThrow(
      `task ${created.task.id} has no usable recorded Work Cell attempt in the current Worktree`,
    );
    expect(runner.requests).toHaveLength(1);
  });

  test("rejects malformed or inconsistent Work Cell final records and releases the lease", () => {
    const current = fixture();
    const created = agentTask(current);
    const cases: Array<{
      retain: ConstructorParameters<typeof FakeRunner>[0];
      error: string;
    }> = [
      {
        retain: () => ({ version: "work-cell.run.v4", runId: "fake-run-1", status: "passed" }),
        error: "invalid Work Cell final record",
      },
      {
        retain: (record) => ({ ...record, cellId: "another-cell" }),
        error: "cell id does not match immutable input",
      },
      {
        retain: (record) => ({ ...record, runId: "another-run" }),
        error: "run id/status does not match runner settlement",
      },
      {
        retain: (record) => ({ ...record, status: "failed" }),
        error: "run id/status does not match runner settlement",
      },
      {
        retain: (record) => ({
          ...record,
          driver: { ...record.driver, adapter: "another-adapter" },
        }),
        error: "driver does not match requested OpenCode model",
      },
      {
        retain: (record) => ({
          ...record,
          driver: { ...record.driver, model: "opencode/another" },
        }),
        error: "driver does not match requested OpenCode model",
      },
      {
        retain: (record) => ({ ...record, executionObservation: {} }),
        error: "did not retain the observed OpenCode session id",
      },
    ];

    for (const candidate of cases) {
      expect(() => runTestTask(current.home, {
        id: created.task.id,
        driver: "opencode-cli",
        model: "opencode/go",
        expectedSourceRevision: 1,
        expectedRevision: 1,
      }, new FakeRunner(candidate.retain))).toThrow(candidate.error);
    }
    expect(() => runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeRunner())).not.toThrow();
  });

  test("rejects cross-home overlap on the same Worktree and permits a later run after release", () => {
    const current = fixture();
    const created = agentTask(current);
    const otherHome = join(current.root, "other-home");
    initializeHome(otherHome);
    registerProject(otherHome, {
      path: current.primary,
      id: "repository:task-run",
      aliases: ["task-run"],
    });
    const otherTask = createPrincipalTask(otherHome, {
      title: "Same Worktree through another home",
      objective: "Do not overlap the first writer",
      acceptance: ["The inner runner is never reached"],
      nextActor: "agent",
      sourceRef: "test:cross-home",
      expectedSourceRevision: 0,
      project: "task-run",
      worktree: current.worktree,
    });
    const arguments_ = {
      id: created.task.id,
      driver: "opencode-cli" as const,
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    };
    const inner = new FakeRunner();
    const overlapping = new FakeRunner((record) => {
      expect(() => runTestTask(
        otherHome,
        { ...arguments_, id: otherTask.task.id },
        inner,
      )).toThrow("active task-run lease");
      return record;
    });

    expect(() => runTestTask(current.home, arguments_, overlapping)).not.toThrow();
    expect(inner.requests).toHaveLength(0);
    expect(existsSync(join(otherHome, "state", "task-attempts"))).toBeFalse();
    expect(() => runTestTask(current.home, arguments_, new FakeRunner())).not.toThrow();
  });

  test("rechecks cleanliness after lease acquisition before creating attempt evidence", () => {
    const current = fixture();
    const created = agentTask(current);
    const runner = new FakeRunner();
    expect(() => runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner, {
      beforeLeaseAcquire() {
        writeFileSync(join(current.worktree, "became-dirty.txt"), "dirty while waiting\n");
      },
    })).toThrow("task Worktree is not clean");
    expect(runner.requests).toHaveLength(0);
    expect(existsSync(join(current.home, "state", "task-attempts"))).toBeFalse();

    rmSync(join(current.worktree, "became-dirty.txt"));
    expect(() => runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeRunner())).not.toThrow();
  });

  test("rechecks correction, Worktree binding, and settlement after lease acquisition", () => {
    for (const drift of ["correction", "rebind", "settle"] as const) {
      const current = fixture();
      const created = agentTask(current);
      const replacement = join(current.root, "replacement-worktree");
      if (drift === "rebind") {
        git(current.primary, "worktree", "add", "-b", "task/replacement", replacement);
      }
      const runner = new FakeRunner();

      expect(() => runTestTask(current.home, {
        id: created.task.id,
        driver: "opencode-cli",
        model: "opencode/go",
        expectedSourceRevision: 1,
        expectedRevision: 1,
      }, runner, {
        beforeLeaseAcquire() {
          if (drift === "correction") {
            correctPrincipalTask(current.home, {
              id: created.task.id,
              statement: "Use the corrected boundary.",
              sourceRef: "test:drift-correction",
              nextActor: "agent",
              expectedSourceRevision: 1,
              expectedRevision: 1,
            });
          } else if (drift === "rebind") {
            rebindPrincipalTaskWorktree(current.home, {
              id: created.task.id,
              expectedWorktreePath: realpathSync(current.worktree),
              worktree: replacement,
              sourceRef: "test:drift-rebind",
              expectedSourceRevision: 1,
              expectedRevision: 1,
            });
          } else {
            const submitted = submitPrincipalTaskResult(current.home, {
              id: created.task.id,
              summary: "Drifted result claim",
              evidenceRefs: ["test:drift-claim"],
              sourceRef: "test:drift-submit",
              expectedSourceRevision: 1,
              expectedRevision: 1,
            });
            acceptPrincipalTaskResult(current.home, {
              id: created.task.id,
              sourceRef: "test:drift-accept",
              expectedSourceRevision: submitted.sourceRevision,
              expectedRevision: submitted.task.revision,
            });
          }
        },
      })).toThrow(
        `task ${created.task.id} changed before attempt creation after the task-run lease was acquired`,
      );
      expect(runner.requests).toHaveLength(0);
      expect(existsSync(join(current.home, "state", "task-attempts"))).toBeFalse();
    }
  });

  test("keeps tracked generated-name paths observable in Work Cell evidence", () => {
    const current = fixture();
    mkdirSync(join(current.worktree, "experiments", "example", "build"), { recursive: true });
    mkdirSync(join(current.worktree, "experiments", "example", "scoring", "outputs"), { recursive: true });
    const buildPath = "experiments/example/build/tracked.ts";
    const outputPath = "experiments/example/scoring/outputs/tracked.out";
    writeFileSync(join(current.worktree, buildPath), "export const value = 1;\n");
    writeFileSync(join(current.worktree, outputPath), "one\n");
    git(current.worktree, "add", buildPath, outputPath);
    git(current.worktree, "commit", "-m", "track generated-name paths");
    const created = agentTask(current);
    const runner = new FakeRunner((record, request) => {
      writeFileSync(join(current.worktree, buildPath), "export const value = 2;\n");
      writeFileSync(join(current.worktree, outputPath), "two\n");
      return {
        ...record,
        workspaceDiff: {
          ...record.workspaceDiff,
          changed: [buildPath, outputPath],
        },
        input: CellInputSchema.parse(JSON.parse(readFileSync(request.inputPath, "utf8"))),
      };
    });

    const result = runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner);
    const input = JSON.parse(readFileSync(join(current.home, result.inputRef), "utf8"));
    const record = JSON.parse(readFileSync(join(current.home, result.finalRecordRef), "utf8"));
    expect(input.workspace.excludePaths).not.toContain("build");
    expect(input.workspace.excludePaths).not.toContain("outputs");
    expect(record.workspaceDiff.changed).toEqual([buildPath, outputPath]);
  });

  test("a valid non-passed owner final settles runner-failed and the run fails after settlement", () => {
    for (const terminal of ["failed", "cancelled"] as const) {
      const perCase = fixture();
      const task = agentTask(perCase);
      class TerminalRunner implements TaskRunRunner {
        run(request: TaskRunRequest) {
          const result = { runId: `terminal-${terminal}`, status: terminal };
          const record = validWorkCellRecord(
            request,
            { runId: result.runId, status: "passed" },
            `session-terminal-${terminal}`,
          );
          writeFileSync(
            request.finalRecordPath,
            `${JSON.stringify({
              ...record,
              status: terminal,
              ...(terminal === "failed" ? { error: "the final failed" } : {}),
            }, null, 2)}\n`,
            { flag: "wx" },
          );
          return result;
        }
      }

      expect(() => runTestTask(perCase.home, {
        id: task.task.id,
        driver: "opencode-cli",
        model: "opencode/go",
        expectedSourceRevision: 1,
        expectedRevision: 1,
      }, new TerminalRunner())).toThrow(`settled with status ${terminal}`);

      const projections = showPrincipalTaskAttempts(perCase.home, task.task.id);
      expect(projections).toHaveLength(1);
      expect(projections[0]).toMatchObject({
        status: "runner-failed",
        cellStatus: terminal,
        observedSession: `session-terminal-${terminal}`,
      });
      const settlement = JSON.parse(readFileSync(join(perCase.home, projections[0]!.settlementRef), "utf8"));
      expect(settlement).toMatchObject({
        status: "runner-failed",
        workCellRunId: `terminal-${terminal}`,
        cellStatus: terminal,
        semanticAcceptance: "not-evaluated",
        ...(terminal === "failed" ? { error: "the final failed" } : {}),
      });
      expect(settlement).not.toHaveProperty("sessionId");

      // The durable settlement exists; the lease released; a later run works.
      expect(() => runTestTask(perCase.home, {
        id: task.task.id,
        driver: "opencode-cli",
        model: "opencode/go",
        expectedSourceRevision: 1,
        expectedRevision: 1,
      }, new FakeRunner())).not.toThrow();
    }
  });

  test("a passed owner final keeps the recorded settlement and the successful result", () => {
    const current = fixture();
    const created = agentTask(current);
    const runner = new FakeRunner();
    const result = runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner);
    expect(result.cellStatus).toBe("passed");
    const settlement = JSON.parse(readFileSync(join(current.home, result.settlementRef), "utf8"));
    expect(settlement).toMatchObject({
      status: "recorded",
      workCellRunId: "fake-run-1",
      cellStatus: "passed",
      semanticAcceptance: "not-evaluated",
    });
    expect(settlement).not.toHaveProperty("error");
  });

  test("lists worker policy and accepts only worker selection plus continuation at the CLI boundary", () => {
    const current = fixture();
    const listed = workbenchCli(current.home, "worker", "list");
    expect(listed.exitCode).toBe(0);
    const workers = JSON.parse(listed.stdout).workers;
    expect(workers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "deepseek-flash",
        provider: "deepseek",
        model: "deepseek-v4-flash",
        reasoningEffort: "max",
      }),
      expect.objectContaining({
        id: "deepseek-pro",
        provider: "deepseek",
        model: "deepseek-v4-pro",
        reasoningEffort: "max",
      }),
      expect.objectContaining({
        id: "kimi-coding",
        provider: "opencode-go",
        model: "kimi-k2.7-code",
        reasoningEffort: "provider-default",
        availability: { status: "available" },
      }),
    ]));

    const missingWorker = taskCli(current.home, "run", "unused");
    expect(missingWorker.exitCode).toBe(2);
    expect(missingWorker.stderr).toContain("task command requires --worker <value>");

    for (const legacy of ["--driver", "--model", "--reasoning-effort", "--session", "--expected-revision"]) {
      const result = taskCli(current.home, "run", "unused", "--worker", "deepseek-flash", legacy, "legacy");
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("invalid task option sequence");
    }

    const continued = taskCli(current.home, "run", "unused", "--worker", "deepseek-flash", "--continue");
    expect(continued.exitCode).toBe(2);
    expect(continued.stderr).toContain("Principal task not found");
  });

  test("rejects dirty, nonexistent, unbound, and completed tasks before the runner", () => {
    const dirty = fixture();
    const dirtyTask = agentTask(dirty);
    writeFileSync(join(dirty.worktree, "dirty.txt"), "dirty\n");
    const runner = new FakeRunner();
    expect(() => runTestTask(dirty.home, {
      id: dirtyTask.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner)).toThrow("task Worktree is not clean");

    const nonexistent = fixture();
    const nonexistentTask = agentTask(nonexistent);
    rmSync(nonexistent.worktree, { recursive: true, force: true });
    expect(() => runTestTask(nonexistent.home, {
      id: nonexistentTask.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner)).toThrow("task Worktree does not exist");

    const unbound = fixture();
    const unboundTask = createPrincipalTask(unbound.home, {
      title: "Unbound task",
      objective: "Remain unbound",
      acceptance: ["Runner is not called"],
      nextActor: "agent",
      sourceRef: "test:unbound",
      expectedSourceRevision: 0,
    });
    expect(() => runTestTask(unbound.home, {
      id: unboundTask.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner)).toThrow("must be bound to an existing project Worktree");

    const completed = fixture();
    const completedTask = agentTask(completed);
    const submitted = submitPrincipalTaskResult(completed.home, {
      id: completedTask.task.id,
      summary: "Claim",
      evidenceRefs: ["test:claim"],
      sourceRef: "test:submit",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    });
    const accepted = acceptPrincipalTaskResult(completed.home, {
      id: completedTask.task.id,
      sourceRef: "test:accept",
      expectedSourceRevision: 2,
      expectedRevision: submitted.task.revision,
    });
    expect(() => runTestTask(completed.home, {
      id: completedTask.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 3,
      expectedRevision: accepted.task.revision,
    }, runner)).toThrow("completed tasks are viewable history");
    expect(runner.requests).toHaveLength(0);
  });
});

describe("task attempts projection", () => {
  test("returns an empty list when the task has no recorded attempts", () => {
    const current = fixture();
    const created = agentTask(current);
    expect(showPrincipalTaskAttempts(current.home, created.task.id)).toEqual([]);
  });

  test("projects recorded attempts sorted by startedAt with observed facts and stable refs", () => {
    const current = fixture();
    const created = agentTask(current);
    const runner = new FakeRunner(undefined, ["session-a"]);
    const first = runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      reasoningEffort: "high",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner);
    const second = runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      session: first.sessionId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner);

    const projections = showPrincipalTaskAttempts(current.home, created.task.id);
    expect(projections).toHaveLength(2);
    const [firstProjection, secondProjection] = projections;
    expect(firstProjection).toMatchObject({
      attemptId: first.attemptId,
      taskRevision: 1,
      sourceRevision: 1,
      workerId: "test-worker",
      driver: "opencode-cli",
      model: "opencode/go",
      reasoningEffort: "high",
      observedSession: "session-a",
      cellStatus: "passed",
      status: "recorded",
      inputRef: first.inputRef,
      finalRecordRef: first.finalRecordRef,
      attemptRef: first.attemptRef,
      settlementRef: first.settlementRef,
    });
    expect(firstProjection!.requestedSession).toBeUndefined();
    expect(firstProjection!.startedAt).toBeDefined();
    expect(firstProjection!.settledAt).toBeDefined();
    expect(secondProjection).toMatchObject({
      attemptId: second.attemptId,
      requestedSession: first.sessionId,
      observedSession: first.sessionId,
      status: "recorded",
    });
    expect(firstProjection!.startedAt! <= secondProjection!.startedAt!).toBeTrue();
    expect(firstProjection!.startedAt).not.toBe(secondProjection!.startedAt);

    const finalRecord = JSON.parse(
      readFileSync(join(current.home, second.finalRecordRef), "utf8"),
    );
    expect(secondProjection!.usage).toEqual(finalRecord.usage);
    expect(secondProjection!.workspaceDiff).toEqual(finalRecord.workspaceDiff);
    expect(secondProjection!.verification).toEqual(finalRecord.verification);
    expect(secondProjection!.observedSession).toBe(
      finalRecord.executionObservation.sessionId,
    );
  });

  test("includes runner-failed attempts with settlement status and retained final record facts", () => {
    const current = fixture();
    const created = agentTask(current);
    const runner = new FakeRunner(undefined, ["requested-1", "observed-9"]);
    const first = runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner);
    expect(() => runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      session: first.sessionId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner)).toThrow("requested OpenCode session does not match the observed session");

    const projections = showPrincipalTaskAttempts(current.home, created.task.id);
    expect(projections).toHaveLength(2);
    const failedProjection = projections[1]!;
    expect(failedProjection).toMatchObject({
      requestedSession: first.sessionId,
      observedSession: "observed-9",
      cellStatus: "passed",
      status: "runner-failed",
    });
    expect(failedProjection.settledAt).toBeDefined();
  });

  test("projects a crash-retained in-flight attempt without settlement facts", () => {
    const current = fixture();
    const created = agentTask(current);
    const attemptId = randomUUID();
    const directory = join(current.home, "state", "task-attempts", attemptId);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, "attempt.json"), `${JSON.stringify({
      version: "rosso.task-run-attempt.v1",
      taskId: created.task.id,
      taskRevision: 1,
      sourceRevision: 1,
      attemptId,
      inputRef: `state/task-attempts/${attemptId}/cell-input.json`,
      finalRecordRef: `state/task-attempts/${attemptId}/cell-input.run.json`,
      driver: "opencode-cli",
      model: "opencode/go",
      status: "started",
      startedAt: "2026-08-12T12:00:00.000Z",
    }, null, 2)}\n`);

    const projections = showPrincipalTaskAttempts(current.home, created.task.id);
    expect(projections).toHaveLength(1);
    const inFlightProjection = projections[0]!;
    expect(inFlightProjection).toMatchObject({
      attemptId,
      driver: "opencode-cli",
      model: "opencode/go",
      status: "started",
      startedAt: "2026-08-12T12:00:00.000Z",
    });
    expect(inFlightProjection.requestedSession).toBeUndefined();
    expect(inFlightProjection.observedSession).toBeUndefined();
    expect(inFlightProjection.cellStatus).toBeUndefined();
    expect(inFlightProjection.settledAt).toBeUndefined();
    expect(inFlightProjection.evidence).toEqual({
      attempt: { standing: "available" },
      finalRecord: { standing: "unavailable" },
      settlement: { standing: "unavailable" },
    });
  });

  test("keeps attributable malformed evidence visible without projecting unowned facts", () => {
    const current = fixture();
    const created = agentTask(current);
    const valid = runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeRunner());
    writeFileSync(join(current.home, valid.finalRecordRef), "{}\n");

    const malformedAttemptId = randomUUID();
    const malformedDirectory = join(current.home, "state", "task-attempts", malformedAttemptId);
    mkdirSync(malformedDirectory, { recursive: true });
    writeFileSync(join(malformedDirectory, "attempt.json"), `${JSON.stringify({
      version: "rosso.task-run-attempt.v1",
      taskId: created.task.id,
      attemptId: malformedAttemptId,
      model: 42,
    }, null, 2)}\n`);

    const invalidSettlementId = randomUUID();
    const invalidSettlementDirectory = join(
      current.home,
      "state",
      "task-attempts",
      invalidSettlementId,
    );
    mkdirSync(invalidSettlementDirectory, { recursive: true });
    writeFileSync(join(invalidSettlementDirectory, "attempt.json"), `${JSON.stringify({
      version: "rosso.task-run-attempt.v1",
      taskId: created.task.id,
      taskRevision: 1,
      sourceRevision: 1,
      attemptId: invalidSettlementId,
      inputRef: `state/task-attempts/${invalidSettlementId}/cell-input.json`,
      finalRecordRef: `state/task-attempts/${invalidSettlementId}/cell-input.run.json`,
      driver: "opencode-cli",
      model: "opencode/go",
      status: "started",
      startedAt: "2026-08-12T13:00:00.000Z",
    }, null, 2)}\n`);
    writeFileSync(join(invalidSettlementDirectory, "settlement.json"), "{not-json\n");

    const projections = showPrincipalTaskAttempts(current.home, created.task.id);
    expect(projections).toHaveLength(3);

    const invalidFinal = projections.find((projection) => projection.attemptId === valid.attemptId)!;
    expect(invalidFinal.status).toBe("recorded");
    expect(invalidFinal.evidence.finalRecord.standing).toBe("invalid");
    expect(invalidFinal.evidence.settlement).toEqual({ standing: "available" });
    expect(invalidFinal).not.toHaveProperty("observedSession");
    expect(invalidFinal).not.toHaveProperty("cellStatus");
    expect(invalidFinal).not.toHaveProperty("usage");
    expect(invalidFinal).not.toHaveProperty("workspaceDiff");
    expect(invalidFinal).not.toHaveProperty("verification");

    const invalidAttempt = projections.find(
      (projection) => projection.attemptId === malformedAttemptId,
    )!;
    expect(invalidAttempt.status).toBe("invalid");
    expect(invalidAttempt.evidence).toMatchObject({
      attempt: { standing: "invalid" },
      finalRecord: { standing: "unavailable" },
      settlement: { standing: "unavailable" },
    });
    expect(invalidAttempt.inputRef).toBe(
      `state/task-attempts/${malformedAttemptId}/cell-input.json`,
    );
    expect(invalidAttempt).not.toHaveProperty("model");

    const invalidSettlement = projections.find(
      (projection) => projection.attemptId === invalidSettlementId,
    )!;
    expect(invalidSettlement.status).toBe("invalid");
    expect(invalidSettlement.evidence.settlement.standing).toBe("invalid");
    expect(invalidSettlement.evidence.finalRecord).toEqual({ standing: "unavailable" });
  });

  test("does not leak an unrelated task's malformed attempt into the requested projection", () => {
    const current = fixture();
    const created = agentTask(current);
    const unrelatedAttemptId = randomUUID();
    const directory = join(current.home, "state", "task-attempts", unrelatedAttemptId);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, "attempt.json"), `${JSON.stringify({
      taskId: "unrelated-task",
      attemptId: unrelatedAttemptId,
      model: 42,
    }, null, 2)}\n`);

    expect(showPrincipalTaskAttempts(current.home, created.task.id)).toEqual([]);
  });

  test("gives the attempt task claim exclusive ownership when settlement conflicts", () => {
    const current = fixture();
    const created = agentTask(current);
    const run = runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeRunner());
    const other = createPrincipalTask(current.home, {
      title: "Settlement claim target",
      objective: "Must not gain another task's attempt",
      acceptance: ["Conflicting evidence remains scoped to its attempt owner"],
      nextActor: "agent",
      sourceRef: "test:conflicting-settlement-owner",
      expectedSourceRevision: 1,
    });
    const settlementPath = join(current.home, run.settlementRef);
    const settlement = JSON.parse(readFileSync(settlementPath, "utf8"));
    writeFileSync(settlementPath, `${JSON.stringify({
      ...settlement,
      taskId: other.task.id,
    }, null, 2)}\n`);

    const ownerProjection = showPrincipalTaskAttempts(current.home, created.task.id);
    expect(ownerProjection).toHaveLength(1);
    expect(ownerProjection[0]).toMatchObject({
      attemptId: run.attemptId,
      status: "invalid",
      evidence: { settlement: { standing: "invalid" } },
    });
    expect(ownerProjection[0]!.settledAt).toBeUndefined();
    expect(showPrincipalTaskAttempts(current.home, other.task.id)).toEqual([]);
  });

  test("projects only the requested task's attempts and rejects unknown tasks", () => {
    const current = fixture();
    const created = agentTask(current);
    const runner = new FakeRunner();
    runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner);
    const other = createPrincipalTask(current.home, {
      title: "Unrelated task",
      objective: "Keep its attempts separate",
      acceptance: ["The projection stays scoped"],
      nextActor: "agent",
      sourceRef: "test:unrelated-attempts",
      expectedSourceRevision: 1,
    });
    expect(showPrincipalTaskAttempts(current.home, created.task.id)).toHaveLength(1);
    expect(showPrincipalTaskAttempts(current.home, other.task.id)).toEqual([]);
    expect(() => showPrincipalTaskAttempts(current.home, "missing-task"))
      .toThrow("Principal task not found");
  });

  test("the CLI exposes task attempts as a read-only projection", () => {
    const current = fixture();
    const created = agentTask(current);
    const run = runTestTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeRunner());

    const result = taskCliWithOutput(current.home, "attempts", created.task.id);
    expect(result.exitCode).toBe(0);
    const projections = JSON.parse(result.stdout);
    expect(projections).toHaveLength(1);
    expect(projections[0].attemptId).toBe(run.attemptId);
    expect(projections[0].settlementRef).toBe(run.settlementRef);
    expect(projections[0]).not.toHaveProperty("trace");

    const missing = taskCli(current.home, "attempts");
    expect(missing.exitCode).toBe(2);
    expect(missing.stderr).toContain("task attempts requires exactly one task id");

    const unknown = taskCli(current.home, "attempts", "missing-task");
    expect(unknown.exitCode).toBe(2);
    expect(unknown.stderr).toContain("Principal task not found");
  });
});

function taskCli(home: string, ...arguments_: string[]): {
  exitCode: number;
  stderr: string;
} {
  const result = Bun.spawnSync([
    process.execPath,
    bunCli,
    "--home",
    home,
    "task",
    ...arguments_,
  ], {
    cwd: repositoryRoot,
    env: { ...process.env, DEEPSEEK_API_KEY: "configured-for-test" },
    stdout: "pipe",
    stderr: "pipe",
  });
  return { exitCode: result.exitCode, stderr: result.stderr.toString() };
}

function workbenchCli(home: string, ...arguments_: string[]): {
  exitCode: number;
  stdout: string;
  stderr: string;
} {
  const result = Bun.spawnSync([
    process.execPath,
    bunCli,
    "--home",
    home,
    ...arguments_,
  ], {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      DEEPSEEK_API_KEY: "configured-for-test",
      OPENCODE_API_KEY: "configured-for-test",
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function taskCliWithOutput(home: string, ...arguments_: string[]): {
  exitCode: number;
  stdout: string;
} {
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
  return { exitCode: result.exitCode, stdout: result.stdout.toString() };
}
