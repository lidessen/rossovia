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
  type CellInput,
  type CellRunRecord,
} from "../../../packages/work-cell/src/contracts";
import { PI_HARNESS_DRIVER_ADAPTER } from "../../../packages/work-cell/src/integrations/ai-sdk";
import { STATE_FAILURE_EXIT_CODE } from "../src/cli-errors";
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
  acquireWorktreeLease,
  attemptLeaseStanding,
  ORDINARY_TASK_ALLOWED_COMMANDS,
  PI_HARNESS_TASK_RUN_ADAPTER,
  reconcilePrincipalTaskAttempt,
  releaseWorktreeLease,
  runPrincipalTask as runPrincipalTaskImpl,
  type TaskCellExecutor,
  type TaskCellExecutionInput,
  type TaskRunResult,
} from "../src/task-run";
import type { WorkerCard } from "../../../packages/work-cell/src/worker-catalog";
import { RunControlRegistry, stopRun } from "../src/orchestration/run";
import { worktreeWriterLeasePath } from "../src/orchestration/worktree-writer";
import { readStrictTaskAttemptEvidence, showPrincipalTaskAttempts } from "../src/task-attempts";

const temporaryRoots: string[] = [];
const repositoryRoot = resolve(import.meta.dir, "../../..");
const bunCli = join(repositoryRoot, "operations", "workbench", "src", "cli.ts");
type ParsedCellRunRecord = CellRunRecord;

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

interface TestRunArguments {
  id: string;
  provider: string;
  model: string;
  reasoningEffort?: string;
  expectedSourceRevision: number;
  expectedRevision: number;
}

function testCard(arguments_: TestRunArguments): WorkerCard {
  const workerId = "test-worker";
  return {
    version: "work-cell.worker-card.v1",
    id: workerId,
    labels: ["coding", "text", "write", "commands"],
    description: "Deterministic task-run test worker.",
    executionProfile: {
      id: workerId,
      version: "execution-profile.v1",
      provider: arguments_.provider,
      model: arguments_.model,
      ...(arguments_.reasoningEffort
        ? { reasoningEffort: arguments_.reasoningEffort }
        : {}),
      parallelism: "serial",
    },
    availability: { status: "available" },
  };
}

/**
 * Run one ordinary task attempt through the shared async catalog-backed path
 * with a deterministic fake Task Cell executor seam. `continueFromAttemptId`
 * selects an exact prior-attempt lineage instead of any session coupling.
 */
function runTestTask(
  home: string,
  arguments_: TestRunArguments & { continueFromAttemptId?: string },
  executor?: TaskCellExecutor,
  dependencies: Parameters<typeof runPrincipalTaskImpl>[2] = {},
): Promise<TaskRunResult> {
  return runPrincipalTaskImpl(
    home,
    {
      id: arguments_.id,
      workerId: "test-worker",
      ...(arguments_.continueFromAttemptId !== undefined
        ? { continueFromAttemptId: arguments_.continueFromAttemptId }
        : {}),
    },
    {
      ...dependencies,
      resolveWorkerCard: () => testCard(arguments_),
      executeTaskCell: executor ?? defaultCellExecutor(),
    },
  );
}

function defaultCellExecutor(): TaskCellExecutor {
  return async ({ cellInput }) => validWorkCellRecord(cellInput, {
    runId: "fake-run-default",
  });
}

class FakeCellExecutor {
  readonly requests: TaskCellExecutionInput[] = [];

  constructor(
    private readonly retain: (
      record: ParsedCellRunRecord,
      input: CellInput,
      requestIndex: number,
    ) => unknown = (record) => record,
    private readonly observedSessions: string[] = [],
  ) {}

  execute: TaskCellExecutor = async (input) => {
    this.requests.push(input);
    const requestIndex = this.requests.length;
    const observedSession = this.observedSessions[requestIndex - 1]
      ?? `fresh-session-${requestIndex}`;
    const record = validWorkCellRecord(input.cellInput, {
      runId: `fake-run-${requestIndex}`,
      sessionId: observedSession,
    });
    return this.retain(record, input.cellInput, requestIndex) as ParsedCellRunRecord;
  };
}

function validWorkCellRecord(
  input: CellInput,
  options: {
    runId: string;
    status?: CellRunRecord["status"];
    sessionId?: string;
    provider?: string;
    model?: string;
    adapter?: string;
  },
): ParsedCellRunRecord {
  const profile = input.executionProfile;
  const adapter = options.adapter
    ?? (profile?.provider === "deepseek" ? PI_HARNESS_DRIVER_ADAPTER : "ai-sdk-v7");
  const aiSdkFamily = adapter === "ai-sdk-v7" || adapter === PI_HARNESS_DRIVER_ADAPTER;
  return CellRunRecordSchema.parse({
    version: "work-cell.run.v4",
    runId: options.runId,
    cellId: input.id,
    driver: {
      adapter,
      provider: options.provider ?? profile?.provider ?? "test-provider",
      model: options.model ?? profile?.model ?? "test/model",
    },
    startedAt: "2026-08-12T00:00:00.000Z",
    finishedAt: "2026-08-12T00:00:01.000Z",
    durationMs: 1_000,
    status: options.status ?? "passed",
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
    executionObservation: {
      ...(options.sessionId !== undefined ? { sessionId: options.sessionId } : {}),
      ...(aiSdkFamily
        ? {
            providerFingerprintStanding: {
              standing: "unavailable",
              reason: "deterministic task-run test executor retains no provider metadata",
            },
          }
        : {}),
    },
    trace: [],
    rawSteps: [],
  }) as CellRunRecord;
}

/** One legacy OpenCode compatibility final record used only by reconcile reads. */
function legacyWorkCellRecord(input: CellInput, options: { runId: string }): ParsedCellRunRecord {
  return validWorkCellRecord(input, {
    runId: options.runId,
    adapter: "opencode-cli.v1",
    provider: "opencode",
    model: "opencode/go",
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
    executionProfile: {
      id: "test-worker",
      version: "execution-profile.v1",
      provider: "opencode",
      model: "opencode/go",
      parallelism: "serial",
    },
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

/**
 * One retained legacy attempt family from the former BudgetSchema default:
 * the immutable raw CellInput omits maxSteps while the embedded final input
 * carries the injected maxSteps: 20, everything else identical. The attempt
 * record names the catalog AI SDK execution form so the same family can
 * exercise reconcile and continuation ownership.
 */
function legacyMaxSteps20Attempt(
  fixture_: Fixture,
  taskId: string,
  pid: number,
): InterruptedAttemptFixture {
  const attempt = interruptedAttempt(fixture_, taskId, pid);
  const attemptPath = join(attempt.directory, "attempt.json");
  const attemptRecord = JSON.parse(readFileSync(attemptPath, "utf8"));
  attemptRecord.driver = "ai-sdk-v7";
  attemptRecord.model = "opencode/go";
  writeFileSync(attemptPath, `${JSON.stringify(attemptRecord, null, 2)}\n`);
  const rawInput = JSON.parse(readFileSync(join(attempt.directory, "cell-input.json"), "utf8"));
  const legacyFinalInput = CellInputSchema.parse({
    ...rawInput,
    budget: { ...rawInput.budget, maxSteps: 20 },
  }) as CellInput;
  const finalRecord = validWorkCellRecord(legacyFinalInput, { runId: "legacy-default-maxsteps-run" });
  writeFileSync(
    join(attempt.directory, "cell-input.run.json"),
    `${JSON.stringify(finalRecord, null, 2)}\n`,
  );
  return attempt;
}

interface HistoricalV1ReasoningAttemptFixture {
  attemptId: string;
  directory: string;
  attemptBytes: string;
  inputBytes: string;
  leasePath: string;
  leaseContent: string;
}

/**
 * One retained historical v1 attempt family: the attempt record retains
 * attempt-level reasoning effort while its immutable CellInput carries no
 * workerId and no executionProfile (the pre-profile lowering shape). The
 * exact dead-owner O3 claim makes the family reconcileable.
 */
function historicalV1ReasoningAttempt(
  fixture_: Fixture,
  taskId: string,
  pid: number,
): HistoricalV1ReasoningAttemptFixture {
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
    driver: "opencode-cli",
    model: "opencode/go",
    reasoningEffort: "high",
    status: "started",
    startedAt: "2026-08-12T12:00:00.000Z",
  }, null, 2)}\n`;
  const inputBytes = `${JSON.stringify({
    id: `workbench-task-${taskId}-attempt-${attemptId}`,
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

describe("task attempt reconciliation", () => {
  test("reconciles an interrupted attempt with a dead owner, preserving evidence and enabling a fresh run", async () => {
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

    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      continueFromAttemptId: randomUUID(),
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeCellExecutor().execute)).rejects.toThrow("has no usable retained evidence");

    const executor = new FakeCellExecutor();
    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute)).resolves.toBeTruthy();
    expect(executor.requests).toHaveLength(1);
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
    })).toThrow(`belongs to task ${created.task.id}, not the requested task ${unbound.task.id}`);
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

  test("a second reconciliation after success converges idempotently without touching retained evidence", () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = interruptedAttempt(current, created.task.id, deadPid());
    const first = reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    });
    const settlementBytes = readFileSync(join(current.home, first.settlementRef), "utf8");

    // O2 reconciliation is idempotent owner maintenance: the exact release
    // already succeeded, so the retry converges on the retained outcome and
    // mutates nothing.
    const second = reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    });
    expect(second).toMatchObject({
      taskId: created.task.id,
      attemptId: attempt.attemptId,
      status: "runner-failed",
      error: expect.stringContaining("interrupted"),
    });
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

    // A schema-valid claim for a different owner proves the exact claim was
    // already released: O2 reconciliation converges on the retained outcome
    // and never touches the foreign claim.
    writeFileSync(attempt.leasePath, attempt.leaseContent, { flag: "wx" });
    const bytes = JSON.parse(readFileSync(attempt.leasePath, "utf8"));
    bytes.attemptId = randomUUID();
    writeFileSync(attempt.leasePath, `${JSON.stringify(bytes, null, 2)}\n`);
    const converged = reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    });
    expect(converged.status).toBe("runner-failed");
    expect(readFileSync(join(current.home, first.settlementRef), "utf8")).toBe(settlementBytes);
    // The different-owner claim is preserved exactly.
    expect(readFileSync(attempt.leasePath, "utf8")).toBe(`${JSON.stringify(bytes, null, 2)}\n`);
  });

  test("derives the shared normal settlement from a retained final record without a settlement", async () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = interruptedAttempt(current, created.task.id, deadPid());
    const input = JSON.parse(readFileSync(join(attempt.directory, "cell-input.json"), "utf8"));
    const finalRecord = legacyWorkCellRecord(input, { runId: "recovered-run" });
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

    // The recovered legacy OpenCode attempt cannot be continued by the
    // catalog AI SDK execution form: a different driver fails closed, while
    // a fresh run remains available.
    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      continueFromAttemptId: attempt.attemptId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeCellExecutor().execute)).rejects.toThrow("differs and cannot continue it");
    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeCellExecutor().execute)).resolves.toBeTruthy();
  });

  test("a failed final record without a settlement derives runner-failed with retained cell evidence", () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = interruptedAttempt(current, created.task.id, deadPid());
    const input = JSON.parse(readFileSync(join(attempt.directory, "cell-input.json"), "utf8"));
    const finalRecord = legacyWorkCellRecord(input, { runId: "failed-run" });
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
    const input = JSON.parse(readFileSync(join(attempt.directory, "cell-input.json"), "utf8"));
    const finalRecord = legacyWorkCellRecord(input, { runId: "tampered-run" });
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

  test("refuses to reconcile a Pi attempt whose retained final claims another adapter", () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = interruptedAttempt(current, created.task.id, deadPid());
    const attemptPath = join(attempt.directory, "attempt.json");
    const attemptRecord = JSON.parse(readFileSync(attemptPath, "utf8"));
    attemptRecord.workerId = "deepseek-pro";
    attemptRecord.driver = PI_HARNESS_TASK_RUN_ADAPTER;
    attemptRecord.model = "deepseek-v4-pro";
    writeFileSync(attemptPath, `${JSON.stringify(attemptRecord, null, 2)}\n`);

    const inputPath = join(attempt.directory, "cell-input.json");
    const input = JSON.parse(readFileSync(inputPath, "utf8"));
    input.workerId = "deepseek-pro";
    input.executionProfile = {
      id: "deepseek-pro",
      version: "execution-profile.v1",
      provider: "deepseek",
      model: "deepseek-v4-pro",
      reasoningEffort: "max",
      parallelism: "serial",
    };
    writeFileSync(inputPath, `${JSON.stringify(input, null, 2)}\n`);
    const finalRecord = validWorkCellRecord(CellInputSchema.parse(input), {
      runId: "wrong-pi-adapter-run",
      adapter: "ai-sdk-v7",
      provider: "deepseek",
      model: "deepseek-v4-pro",
    });
    writeFileSync(
      join(attempt.directory, "cell-input.run.json"),
      `${JSON.stringify(finalRecord, null, 2)}\n`,
    );

    expect(() => reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    })).toThrow("driver adapter does not match the attempt execution form");
    expect(existsSync(join(attempt.directory, "settlement.json"))).toBeFalse();
    expect(existsSync(attempt.leasePath)).toBeTrue();
  });

  test("a legal Task rebind neither hides nor redirects a retained attempt lease in the old Worktree", () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = interruptedAttempt(current, created.task.id, deadPid());

    const replacement = join(current.root, "replacement-worktree");
    git(current.primary, "worktree", "add", "-b", "task/replacement", replacement);
    rebindPrincipalTaskWorktree(current.home, {
      id: created.task.id,
      expectedWorktreePath: realpathSync(current.worktree),
      worktree: replacement,
      sourceRef: "test:rebind-after-retained-lease",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    });

    // Standing inspects the immutable CellInput workspace, never the rebound task path.
    expect(attemptLeaseStanding(current.home, created.task.id, attempt.attemptId)).toBe("retained");

    // Reconcile locates the exact lease in the old Worktree and releases it.
    const result = reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    });
    expect(result).toMatchObject({ taskId: created.task.id, status: "runner-failed" });
    expect(existsSync(attempt.leasePath)).toBeFalse();
    expect(attemptLeaseStanding(current.home, created.task.id, attempt.attemptId)).toBe("released");
  });

  test("rebind-after-release-failure keeps the settlement reconcile-releasable in the old Worktree", () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = interruptedAttempt(current, created.task.id, deadPid());
    reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    });
    // The crash-after-settlement-before-release shape: the exact settlement
    // exists and the still-exact dead-owner lease remains.
    writeFileSync(attempt.leasePath, attempt.leaseContent, { flag: "wx" });

    const replacement = join(current.root, "replacement-worktree");
    git(current.primary, "worktree", "add", "-b", "task/replacement-2", replacement);
    rebindPrincipalTaskWorktree(current.home, {
      id: created.task.id,
      expectedWorktreePath: realpathSync(current.worktree),
      worktree: replacement,
      sourceRef: "test:rebind-release-failure",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    });

    expect(attemptLeaseStanding(current.home, created.task.id, attempt.attemptId)).toBe("retained");
    const retried = reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    });
    expect(retried.status).toBe("runner-failed");
    expect(existsSync(attempt.leasePath)).toBeFalse();
    expect(attemptLeaseStanding(current.home, created.task.id, attempt.attemptId)).toBe("released");
  });

  test("a successor lease in the same Worktree leaves the earlier attempt released", () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = interruptedAttempt(current, created.task.id, deadPid());
    reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    });
    expect(attemptLeaseStanding(current.home, created.task.id, attempt.attemptId)).toBe("released");

    const successor = acquireWorktreeLease(
      realpathSync(current.worktree),
      created.task.id,
      randomUUID(),
    );
    expect(attemptLeaseStanding(current.home, created.task.id, attempt.attemptId)).toBe("released");
    releaseWorktreeLease(successor);
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

  test("the CLI reconciles through the O2 owner idempotently with the legacy result shape", () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = interruptedAttempt(current, created.task.id, deadPid());

    const first = taskCliWithOutput(
      current.home,
      "reconcile-attempt",
      created.task.id,
      "--attempt",
      attempt.attemptId,
    );
    expect(first.exitCode).toBe(0);
    const firstJson = JSON.parse(first.stdout);
    expect(firstJson).toMatchObject({
      version: "rosso.task-attempt-reconcile.v1",
      taskId: created.task.id,
      attemptId: attempt.attemptId,
      settlementRef: `state/task-attempts/${attempt.attemptId}/settlement.json`,
      status: "runner-failed",
      error: expect.stringContaining("interrupted"),
    });
    expect(existsSync(attempt.leasePath)).toBeFalse();
    const settlementBytes = readFileSync(join(current.home, firstJson.settlementRef), "utf8");

    // The identical CLI reconciliation converges idempotently: no throw, no
    // settlement mutation, and no retained evidence change.
    const second = taskCliWithOutput(
      current.home,
      "reconcile-attempt",
      created.task.id,
      "--attempt",
      attempt.attemptId,
    );
    expect(second.exitCode).toBe(0);
    expect(JSON.parse(second.stdout)).toMatchObject({
      taskId: created.task.id,
      attemptId: attempt.attemptId,
      status: "runner-failed",
    });
    expect(readFileSync(join(current.home, firstJson.settlementRef), "utf8")).toBe(settlementBytes);
    expect(readFileSync(join(attempt.directory, "attempt.json"), "utf8")).toBe(attempt.attemptBytes);
    expect(readFileSync(join(attempt.directory, "cell-input.json"), "utf8")).toBe(attempt.inputBytes);
  });
});

describe("task run public boundary", () => {
  test("retains the exact HarnessAgent plus Pi mechanism for a DeepSeek worker", async () => {
    expect(PI_HARNESS_TASK_RUN_ADAPTER).toBe(PI_HARNESS_DRIVER_ADAPTER);
    const current = fixture();
    const created = agentTask(current);
    const executor = new FakeCellExecutor();
    const originalKey = process.env.DEEPSEEK_API_KEY;
    process.env.DEEPSEEK_API_KEY = "configured-for-test";
    try {
      const result = await runPrincipalTaskImpl(current.home, {
        id: created.task.id,
        workerId: "deepseek-pro",
      }, { executeTaskCell: executor.execute });
      const attempt = JSON.parse(readFileSync(join(current.home, result.attemptRef), "utf8"));
      const finalRecord = JSON.parse(
        readFileSync(join(current.home, result.finalRecordRef), "utf8"),
      );
      expect(attempt).toMatchObject({
        workerId: "deepseek-pro",
        driver: PI_HARNESS_DRIVER_ADAPTER,
        model: "deepseek-v4-pro",
        reasoningEffort: "max",
      });
      expect(finalRecord.driver).toMatchObject({
        adapter: PI_HARNESS_DRIVER_ADAPTER,
        provider: "deepseek",
        model: "deepseek-v4-pro",
      });
      expect(finalRecord.input.workspace.allowedCommands)
        .toEqual([...ORDINARY_TASK_ALLOWED_COMMANDS]);
    } finally {
      restoreEnvironment("DEEPSEEK_API_KEY", originalKey);
    }
  });

  test("selects the available Kimi worker and lowers its exact AI SDK execution identity", async () => {
    const current = fixture();
    const created = agentTask(current);
    const executor = new FakeCellExecutor();
    const originalOpenCodeKey = process.env.OPENCODE_API_KEY;
    const originalKimiKey = process.env.KIMI_CODE_API_KEY;
    process.env.OPENCODE_API_KEY = "configured-for-test";
    delete process.env.KIMI_CODE_API_KEY;

    try {
      const result = await runPrincipalTaskImpl(current.home, {
        id: created.task.id,
        workerId: "kimi-coding",
      }, {
        executeTaskCell: executor.execute,
      });
      const input = JSON.parse(readFileSync(join(current.home, result.inputRef), "utf8"));
      expect(input.executionProfile).toMatchObject({
        provider: "opencode-go",
        model: "kimi-k2.7-code",
      });
      const attemptRecord = JSON.parse(readFileSync(join(current.home, result.attemptRef), "utf8"));
      expect(attemptRecord).toMatchObject({
        workerId: "kimi-coding",
        driver: "ai-sdk-v7",
        model: "kimi-k2.7-code",
      });
      expect(attemptRecord).not.toHaveProperty("session");
      const finalRecord = JSON.parse(readFileSync(join(current.home, result.finalRecordRef), "utf8"));
      expect(finalRecord.driver).toMatchObject({
        adapter: "ai-sdk-v7",
        provider: "opencode-go",
        model: "kimi-k2.7-code",
      });
    } finally {
      restoreEnvironment("OPENCODE_API_KEY", originalOpenCodeKey);
      restoreEnvironment("KIMI_CODE_API_KEY", originalKimiKey);
    }
  });

  test("rejects the Kimi worker when only its obsolete provider credential is configured", async () => {
    const current = fixture();
    const created = agentTask(current);
    const executor = new FakeCellExecutor();
    const originalOpenCodeKey = process.env.OPENCODE_API_KEY;
    const originalKimiKey = process.env.KIMI_CODE_API_KEY;
    delete process.env.OPENCODE_API_KEY;
    process.env.KIMI_CODE_API_KEY = "configured-for-test";

    try {
      await expect(runPrincipalTaskImpl(current.home, {
        id: created.task.id,
        workerId: "kimi-coding",
      }, {
        executeTaskCell: executor.execute,
      })).rejects.toThrow("worker kimi-coding is unavailable: OPENCODE_API_KEY is not configured");
      expect(executor.requests).toHaveLength(0);
    } finally {
      restoreEnvironment("OPENCODE_API_KEY", originalOpenCodeKey);
      restoreEnvironment("KIMI_CODE_API_KEY", originalKimiKey);
    }
  });

  test("lowers exact current task guidance without Mission and appends immutable attempts", async () => {
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
    const executor = new FakeCellExecutor();
    const run = () => runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      reasoningEffort: "high",
      expectedSourceRevision: 3,
      expectedRevision: corrected.task.revision,
    }, executor.execute);

    const first = await run();
    const second = await run();
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
        allowedCommands: [...ORDINARY_TASK_ALLOWED_COMMANDS],
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
    // The ordinary immutable CellInput records only the duration envelope:
    // an omitted maxSteps must never reappear as a hidden step-count limit,
    // and no budget approval boundary is installed for an ordinary run.
    expect(input.budget).not.toHaveProperty("maxSteps");
    expect(corrected.task.binding).not.toHaveProperty("missionId");
    expect(first.attemptId).not.toBe(second.attemptId);
    expect(first.inputRef).not.toBe(second.inputRef);
    expect(first.finalRecordRef).not.toBe(second.finalRecordRef);
    expect(executor.requests).toHaveLength(2);

    const attemptRecord = JSON.parse(
      readFileSync(join(current.home, first.attemptRef), "utf8"),
    );
    expect(attemptRecord).toMatchObject({ reasoningEffort: "high" });
    expect(attemptRecord).not.toHaveProperty("variant");
    expect(attemptRecord).not.toHaveProperty("session");

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

  test("lowers ordinary todos into the immutable CellInput.tasks seeds only when non-empty", async () => {
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
    const executor = new FakeCellExecutor();
    const withTodos = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);
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
    const withoutTodos = await runTestTask(current.home, {
      id: plain.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 2,
      expectedRevision: 1,
    }, executor.execute);
    const plainInput = JSON.parse(
      readFileSync(join(current.home, withoutTodos.inputRef), "utf8"),
    );
    expect(plainInput).not.toHaveProperty("tasks");
    expect(plainInput).toMatchObject({
      intent: "Implement the exact bounded change",
      acceptance: ["The requested behavior is observable"],
    });
  });

  test("a stateless continuation retains the exact prior-attempt lineage without requiring any session id", async () => {
    const current = fixture();
    const created = agentTask(current);
    const executor = new FakeCellExecutor();
    const fresh = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);

    const continued = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      continueFromAttemptId: fresh.attemptId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);
    expect(executor.requests).toHaveLength(2);
    const attemptRecord = JSON.parse(
      readFileSync(join(current.home, continued.attemptRef), "utf8"),
    );
    expect(attemptRecord).toMatchObject({
      driver: "ai-sdk-v7",
      model: "opencode/go",
      continuation: {
        continuedFromAttemptId: fresh.attemptId,
        workspaceDiff: { added: [], changed: [], removed: [] },
      },
    });
    expect(attemptRecord).not.toHaveProperty("session");
    // The stateless continuation carries its own fresh observation; it never
    // reuses the anchor attempt's session as continuation authority.
    expect(continued.sessionId).not.toBe(fresh.sessionId);
  });

  test("a continuation never requires or fabricates a harness session id", async () => {
    const current = fixture();
    const created = agentTask(current);
    const sessionless: TaskCellExecutor = async ({ cellInput }) =>
      validWorkCellRecord(cellInput, { runId: "sessionless-run" });
    const fresh = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, sessionless);
    expect(fresh.sessionId).toBeUndefined();
    const continued = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      continueFromAttemptId: fresh.attemptId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, sessionless);
    expect(continued.sessionId).toBeUndefined();
  });

  test("a lineage continuation accepts Git-visible dirty paths owned by the cumulative union and rejects extras", async () => {
    const current = fixture();
    const created = agentTask(current);
    const retainedPath = "app/blog/content.ts";
    const executor = new FakeCellExecutor((record, _input, requestIndex) => {
      if (requestIndex === 1) {
        mkdirSync(join(current.worktree, "app", "blog"), { recursive: true });
        writeFileSync(join(current.worktree, retainedPath), "export const draft = true;\n");
        return {
          ...record,
          workspaceDiff: { added: [retainedPath], changed: [], removed: [] },
        };
      }
      return record;
    });
    const first = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);

    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      continueFromAttemptId: first.attemptId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute)).resolves.toBeTruthy();
    expect(executor.requests).toHaveLength(2);

    writeFileSync(join(current.worktree, "notes-unowned.md"), "unowned\n");
    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      continueFromAttemptId: first.attemptId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute)).rejects.toThrow(
      `task Worktree has Git-visible paths outside the retained continuation workspace diff union: notes-unowned.md`,
    );
  });

  test("retains cumulative added, removed, and renamed paths across an exact lineage chain", async () => {
    const current = fixture();
    const firstPath = "app/blog/content.ts";
    const untouchedPath = "app/blog/metadata.ts";
    const removedPath = "legacy.txt";
    const renamedPath = "docs/README.md";
    writeFileSync(join(current.worktree, removedPath), "legacy\n");
    git(current.worktree, "add", removedPath);
    git(current.worktree, "commit", "-m", "add legacy fixture");
    const created = agentTask(current);
    const executor = new FakeCellExecutor((record, _input, requestIndex) => {
      mkdirSync(join(current.worktree, "app", "blog"), { recursive: true });
      if (requestIndex === 1) {
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
      if (requestIndex === 2) {
        writeFileSync(join(current.worktree, firstPath), "export const content = 2;\n");
        return {
          ...record,
          workspaceDiff: { added: [], changed: [firstPath], removed: [] },
        };
      }
      return record;
    });
    const first = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);
    const second = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      continueFromAttemptId: first.attemptId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);

    const third = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      continueFromAttemptId: second.attemptId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);
    expect(executor.requests).toHaveLength(3);
    const attemptRecord = JSON.parse(
      readFileSync(join(current.home, third.attemptRef), "utf8"),
    );
    expect(attemptRecord.continuation).toEqual({
      continuedFromAttemptId: second.attemptId,
      workspaceDiff: {
        added: [firstPath, untouchedPath, renamedPath],
        changed: [firstPath],
        removed: ["README.md", removedPath],
      },
    });
  });

  test("preserves leading whitespace and embedded newlines in raw Git-visible paths", async () => {
    for (const retainedPath of [" leading-space.ts", "line\nbreak.ts"]) {
      const current = fixture();
      const created = agentTask(current);
      const executor = new FakeCellExecutor((record, _input, requestIndex) => {
        if (requestIndex === 1) {
          writeFileSync(join(current.worktree, retainedPath), "export const draft = true;\n");
          return {
            ...record,
            workspaceDiff: { added: [retainedPath], changed: [], removed: [] },
          };
        }
        return record;
      });
      const first = await runTestTask(current.home, {
        id: created.task.id,
        provider: "opencode",
        model: "opencode/go",
        expectedSourceRevision: 1,
        expectedRevision: 1,
      }, executor.execute);

      await expect(runTestTask(current.home, {
        id: created.task.id,
        provider: "opencode",
        model: "opencode/go",
        continueFromAttemptId: first.attemptId,
        expectedSourceRevision: 1,
        expectedRevision: 1,
      }, executor.execute)).resolves.toBeTruthy();
      expect(executor.requests).toHaveLength(2);
    }
  });

  test("does not inherit path ownership across an unrelated attempt", async () => {
    const current = fixture();
    const created = agentTask(current);
    const priorPath = "prior-attempt.ts";
    const currentPath = "current-attempt.ts";
    const executor = new FakeCellExecutor((record, _input, requestIndex) => {
      if (requestIndex === 1) {
        writeFileSync(join(current.worktree, priorPath), "export const prior = true;\n");
        return {
          ...record,
          workspaceDiff: { added: [priorPath], changed: [], removed: [] },
        };
      }
      if (requestIndex === 2) {
        writeFileSync(join(current.worktree, currentPath), "export const current = true;\n");
        return {
          ...record,
          workspaceDiff: { added: [currentPath], changed: [], removed: [] },
        };
      }
      return record;
    });
    await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);
    rmSync(join(current.worktree, priorPath));
    const currentAttempt = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);
    writeFileSync(join(current.worktree, priorPath), "unowned in current lineage\n");

    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      continueFromAttemptId: currentAttempt.attemptId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute)).rejects.toThrow(
      `task Worktree has Git-visible paths outside the retained continuation workspace diff union: ${priorPath}`,
    );
    expect(executor.requests).toHaveLength(2);
  });

  test("rejects extra tracked or untracked paths outside the retained lineage union", async () => {
    for (const extra of ["README.md", "notes/unowned.md"]) {
      const current = fixture();
      const created = agentTask(current);
      const retainedPath = "app/blog/content.ts";
      const executor = new FakeCellExecutor((record) => {
        mkdirSync(join(current.worktree, "app", "blog"), { recursive: true });
        writeFileSync(join(current.worktree, retainedPath), "export const draft = true;\n");
        return {
          ...record,
          workspaceDiff: { added: [retainedPath], changed: [], removed: [] },
        };
      });
      const first = await runTestTask(current.home, {
        id: created.task.id,
        provider: "opencode",
        model: "opencode/go",
        expectedSourceRevision: 1,
        expectedRevision: 1,
      }, executor.execute);
      mkdirSync(join(current.worktree, "notes"), { recursive: true });
      writeFileSync(join(current.worktree, extra), "unowned\n");

      await expect(runTestTask(current.home, {
        id: created.task.id,
        provider: "opencode",
        model: "opencode/go",
        continueFromAttemptId: first.attemptId,
        expectedSourceRevision: 1,
        expectedRevision: 1,
      }, executor.execute)).rejects.toThrow(
        `task Worktree has Git-visible paths outside the retained continuation workspace diff union: ${extra}`,
      );
      expect(executor.requests).toHaveLength(1);
    }
  });

  test("does not let ignored artifacts block an exact lineage continuation", async () => {
    const current = fixture();
    writeFileSync(join(current.worktree, ".gitignore"), "build/\n");
    git(current.worktree, "add", ".gitignore");
    git(current.worktree, "commit", "-m", "ignore build artifacts");
    const created = agentTask(current);
    const executor = new FakeCellExecutor();
    const first = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);
    mkdirSync(join(current.worktree, "build"), { recursive: true });
    writeFileSync(join(current.worktree, "build", "artifact.js"), "generated\n");

    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      continueFromAttemptId: first.attemptId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute)).resolves.toBeTruthy();
    expect(executor.requests).toHaveLength(2);
  });

  test("fails closed on a missing, unknown, or malformed continueFromAttemptId", async () => {
    const current = fixture();
    const created = agentTask(current);
    const executor = new FakeCellExecutor();
    await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);

    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      continueFromAttemptId: randomUUID(),
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute)).rejects.toThrow("has no usable retained evidence");
    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      continueFromAttemptId: "../escape",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute)).rejects.toThrow("task run --continue must be a valid attempt id");
    expect(executor.requests).toHaveLength(1);
  });

  test("fails closed on a lineage executed by a different driver or model", async () => {
    const current = fixture();
    const created = agentTask(current);
    const executor = new FakeCellExecutor();
    const first = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);

    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "another-provider",
      model: "another/model",
      continueFromAttemptId: first.attemptId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute)).rejects.toThrow("differs and cannot continue it");
    expect(executor.requests).toHaveLength(1);
  });

  test("rejects a Pi continuation whose retained final claims the generic AI SDK adapter", async () => {
    const current = fixture();
    const created = agentTask(current);
    const executor = new FakeCellExecutor();
    const first = await runTestTask(current.home, {
      id: created.task.id,
      provider: "deepseek",
      model: "deepseek-v4-pro",
      reasoningEffort: "max",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);
    const finalPath = join(current.home, first.finalRecordRef);
    const finalRecord = JSON.parse(readFileSync(finalPath, "utf8"));
    finalRecord.driver.adapter = "ai-sdk-v7";
    writeFileSync(finalPath, `${JSON.stringify(finalRecord, null, 2)}\n`);

    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "deepseek",
      model: "deepseek-v4-pro",
      reasoningEffort: "max",
      continueFromAttemptId: first.attemptId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute)).rejects.toThrow(
      "driver adapter does not match the attempt execution form",
    );
    expect(executor.requests).toHaveLength(1);
  });

  test("fails closed on a lineage anchor without an owner-backed passed final", async () => {
    const current = fixture();
    const created = agentTask(current);
    const failing: TaskCellExecutor = async () => {
      throw new Error("provider crashed");
    };
    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, failing)).rejects.toThrow("the attempt settlement is runner-failed");
    const failed = showPrincipalTaskAttempts(current.home, created.task.id)[0]!;

    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      continueFromAttemptId: failed.attemptId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeCellExecutor().execute)).rejects.toThrow("has no owner-backed passed final");
  });

  test("fails closed on an unavailable or invalid lineage predecessor", async () => {
    const current = fixture();
    const created = agentTask(current);
    const executor = new FakeCellExecutor();
    const first = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);
    const second = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      continueFromAttemptId: first.attemptId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);

    // Break the chain behind the anchor: the anchor itself is fine, but its
    // exact predecessor evidence is now invalid.
    writeFileSync(join(current.home, first.finalRecordRef), "{not-json\n");
    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      continueFromAttemptId: second.attemptId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute)).rejects.toThrow(`has no usable retained evidence at attempt ${first.attemptId}`);
  });

  test("rejects a path-like persisted predecessor before any evidence-path resolution", async () => {
    const current = fixture();
    const created = agentTask(current);
    const executor = new FakeCellExecutor();
    const first = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);
    const second = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      continueFromAttemptId: first.attemptId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);
    const attemptPath = join(current.home, second.attemptRef);
    const attemptRecord = JSON.parse(readFileSync(attemptPath, "utf8"));
    attemptRecord.continuation.continuedFromAttemptId = "../../tasks";
    writeFileSync(attemptPath, `${JSON.stringify(attemptRecord, null, 2)}\n`);

    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      continueFromAttemptId: second.attemptId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute)).rejects.toThrow("Invalid UUID");
    expect(executor.requests).toHaveLength(2);
  });

  test("rejects a lineage anchor from the task's previous Worktree", async () => {
    const current = fixture();
    const created = agentTask(current);
    const executor = new FakeCellExecutor();
    const first = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);
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

    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      continueFromAttemptId: first.attemptId,
      expectedSourceRevision: rebound.sourceRevision,
      expectedRevision: rebound.task.revision,
    }, executor.execute)).rejects.toThrow(
      `continuation lineage attempt ${first.attemptId} belongs to Worktree`,
    );
    expect(executor.requests).toHaveLength(1);
  });

  test("rejects malformed or mismatched Work Cell final records and releases the lease", async () => {
    const current = fixture();
    const created = agentTask(current);
    const cases: Array<{
      retain: ConstructorParameters<typeof FakeCellExecutor>[0];
      error: string;
    }> = [
      {
        retain: () => ({ version: "work-cell.run.v4", runId: "fake-run-1", status: "passed" }),
        error: "cell id does not match immutable input",
      },
      {
        retain: (record) => ({ ...record, cellId: "another-cell" }),
        error: "cell id does not match immutable input",
      },
      {
        retain: (record) => ({
          ...record,
          driver: { ...record.driver, adapter: "opencode-cli.v1" },
        }),
        error: "driver adapter opencode-cli.v1 does not match the requested execution driver ai-sdk-v7",
      },
      {
        retain: (record) => ({
          ...record,
          driver: { ...record.driver, provider: "another-provider" },
        }),
        error: "provider another-provider does not match worker test-worker execution profile provider opencode",
      },
      {
        retain: (record) => ({
          ...record,
          driver: { ...record.driver, model: "opencode/another" },
        }),
        error: "driver model opencode/another does not match the requested model opencode/go",
      },
    ];

    for (const candidate of cases) {
      await expect(runTestTask(current.home, {
        id: created.task.id,
        provider: "opencode",
        model: "opencode/go",
        expectedSourceRevision: 1,
        expectedRevision: 1,
      }, new FakeCellExecutor(candidate.retain).execute)).rejects.toThrow(candidate.error);
    }

    // A mismatched final settles runner-failed without terminal claims, never
    // retains the invalid record as evidence, and releases the lease so a
    // later run works.
    const projections = showPrincipalTaskAttempts(current.home, created.task.id);
    expect(projections).toHaveLength(cases.length);
    expect(projections.every((projection) => projection.status === "runner-failed")).toBeTrue();
    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeCellExecutor().execute)).resolves.toBeTruthy();
  });

  test("rejects cross-home overlap on the same Worktree and permits a later run after release", async () => {
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
      acceptance: ["The inner executor is never reached"],
      nextActor: "agent",
      sourceRef: "test:cross-home",
      expectedSourceRevision: 0,
      project: "task-run",
      worktree: current.worktree,
    });
    const arguments_ = {
      id: created.task.id,
      provider: "opencode" as const,
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    };
    const inner = new FakeCellExecutor();
    const overlapping = new FakeCellExecutor(async (record) => {
      await expect(runTestTask(
        otherHome,
        { ...arguments_, id: otherTask.task.id },
        inner.execute,
      )).rejects.toThrow("active task-run lease");
      return record;
    });

    await expect(runTestTask(current.home, arguments_, overlapping.execute)).resolves.toBeTruthy();
    expect(inner.requests).toHaveLength(0);
    // The refused inner Run keeps one durable pre-Cell terminal outcome in its
    // own home; the outer writer's claim is never touched.
    const innerProjections = showPrincipalTaskAttempts(otherHome, otherTask.task.id);
    expect(innerProjections).toHaveLength(1);
    expect(innerProjections[0]).toMatchObject({ status: "runner-failed" });
    expect(innerProjections[0]).not.toHaveProperty("cellStatus");
    await expect(runTestTask(current.home, arguments_, new FakeCellExecutor().execute)).resolves.toBeTruthy();
  });

  test("retains the durable Run request before O3 and settles a truthful pre-Cell refusal on dirty recheck", async () => {
    const current = fixture();
    const created = agentTask(current);
    const executor = new FakeCellExecutor();
    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute, {
      beforeLeaseAcquire() {
        writeFileSync(join(current.worktree, "became-dirty.txt"), "dirty while waiting\n");
      },
    })).rejects.toThrow("task Worktree is not clean");
    expect(executor.requests).toHaveLength(0);
    // The accepted request's durable Run record exists before O3 acquisition;
    // the refusal settles a truthful runner-failed terminal outcome with zero
    // Cell invocations and the exact claim released.
    const projections = showPrincipalTaskAttempts(current.home, created.task.id);
    expect(projections).toHaveLength(1);
    expect(projections[0]).toMatchObject({ status: "runner-failed" });
    expect(projections[0]).not.toHaveProperty("cellStatus");
    expect(projections[0]).not.toHaveProperty("observedSession");
    expect(attemptLeaseStanding(current.home, created.task.id, projections[0]!.attemptId)).toBe("released");

    rmSync(join(current.worktree, "became-dirty.txt"));
    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeCellExecutor().execute)).resolves.toBeTruthy();
  });

  test("rechecks correction, Worktree binding, and settlement after lease acquisition", async () => {
    for (const drift of ["correction", "rebind", "settle"] as const) {
      const current = fixture();
      const created = agentTask(current);
      const replacement = join(current.root, "replacement-worktree");
      if (drift === "rebind") {
        git(current.primary, "worktree", "add", "-b", "task/replacement", replacement);
      }
      const executor = new FakeCellExecutor();

      await expect(runTestTask(current.home, {
        id: created.task.id,
        provider: "opencode",
        model: "opencode/go",
        expectedSourceRevision: 1,
        expectedRevision: 1,
      }, executor.execute, {
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
      })).rejects.toThrow(
        `task ${created.task.id} changed before attempt creation after the task-run lease was acquired`,
      );
      expect(executor.requests).toHaveLength(0);
      // The accepted request retains one durable Run with a truthful pre-Cell
      // terminal outcome; the exact claim is released and no Cell was invoked.
      const projections = showPrincipalTaskAttempts(current.home, created.task.id);
      expect(projections).toHaveLength(1);
      expect(projections[0]).toMatchObject({ status: "runner-failed" });
      expect(projections[0]).not.toHaveProperty("cellStatus");
      expect(attemptLeaseStanding(current.home, created.task.id, projections[0]!.attemptId)).toBe("released");
    }
  });

  test("keeps tracked generated-name paths observable in Work Cell evidence", async () => {
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
    const executor = new FakeCellExecutor((record, input) => {
      writeFileSync(join(current.worktree, buildPath), "export const value = 2;\n");
      writeFileSync(join(current.worktree, outputPath), "two\n");
      return {
        ...record,
        workspaceDiff: {
          ...record.workspaceDiff,
          changed: [buildPath, outputPath],
        },
        input: CellInputSchema.parse(input),
      };
    });

    const result = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);
    const input = JSON.parse(readFileSync(join(current.home, result.inputRef), "utf8"));
    const record = JSON.parse(readFileSync(join(current.home, result.finalRecordRef), "utf8"));
    expect(input.workspace.excludePaths).not.toContain("build");
    expect(input.workspace.excludePaths).not.toContain("outputs");
    expect(record.workspaceDiff.changed).toEqual([buildPath, outputPath]);
  });

  test("a valid non-passed owner final settles runner-failed and the run fails after settlement", async () => {
    for (const terminal of ["failed", "cancelled"] as const) {
      const perCase = fixture();
      const task = agentTask(perCase);
      const executor: TaskCellExecutor = async ({ cellInput }) => ({
        ...validWorkCellRecord(cellInput, {
          runId: `terminal-${terminal}`,
          sessionId: `session-terminal-${terminal}`,
        }),
        status: terminal,
        ...(terminal === "failed" ? { error: "the final failed" } : {}),
      });

      await expect(runTestTask(perCase.home, {
        id: task.task.id,
        provider: "opencode",
        model: "opencode/go",
        expectedSourceRevision: 1,
        expectedRevision: 1,
      }, executor)).rejects.toThrow(`settled with status ${terminal}`);

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
      await expect(runTestTask(perCase.home, {
        id: task.task.id,
        provider: "opencode",
        model: "opencode/go",
        expectedSourceRevision: 1,
        expectedRevision: 1,
      }, new FakeCellExecutor().execute)).resolves.toBeTruthy();
    }
  });

  test("a provider crash settles runner-failed with the visible error and releases the lease", async () => {
    const current = fixture();
    const created = agentTask(current);
    const crashing: TaskCellExecutor = async () => {
      throw new Error("provider crashed mid-run");
    };
    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, crashing)).rejects.toThrow("provider crashed mid-run");

    const projections = showPrincipalTaskAttempts(current.home, created.task.id);
    expect(projections).toHaveLength(1);
    expect(projections[0]).toMatchObject({ status: "runner-failed" });
    expect(projections[0]).not.toHaveProperty("cellStatus");
    const settlement = JSON.parse(readFileSync(join(current.home, projections[0]!.settlementRef), "utf8"));
    expect(settlement).toMatchObject({
      status: "runner-failed",
      error: "provider crashed mid-run",
    });
    expect(settlement).not.toHaveProperty("workCellRunId");
    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeCellExecutor().execute)).resolves.toBeTruthy();
  });

  test("a passed owner final keeps the recorded settlement and the successful result", async () => {
    const current = fixture();
    const created = agentTask(current);
    const executor = new FakeCellExecutor();
    const result = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);
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

  test("lists worker policy and accepts only worker selection plus exact continuation at the CLI boundary", async () => {
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

    const continued = taskCli(current.home, "run", "unused", "--worker", "deepseek-flash", "--continue", randomUUID());
    expect(continued.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(continued.stderr).toContain("rossovia: Principal task not found");
    expect(continued.stderr).not.toContain("for usage");
  });

  test("rejects dirty, nonexistent, unbound, and completed tasks before the executor", async () => {
    const dirty = fixture();
    const dirtyTask = agentTask(dirty);
    writeFileSync(join(dirty.worktree, "dirty.txt"), "dirty\n");
    const executor = new FakeCellExecutor();
    await expect(runTestTask(dirty.home, {
      id: dirtyTask.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute)).rejects.toThrow("task Worktree is not clean");

    const nonexistent = fixture();
    const nonexistentTask = agentTask(nonexistent);
    rmSync(nonexistent.worktree, { recursive: true, force: true });
    await expect(runTestTask(nonexistent.home, {
      id: nonexistentTask.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute)).rejects.toThrow("task Worktree does not exist");

    const unbound = fixture();
    const unboundTask = createPrincipalTask(unbound.home, {
      title: "Unbound task",
      objective: "Remain unbound",
      acceptance: ["Executor is not called"],
      nextActor: "agent",
      sourceRef: "test:unbound",
      expectedSourceRevision: 0,
    });
    await expect(runTestTask(unbound.home, {
      id: unboundTask.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute)).rejects.toThrow("must be bound to an existing project Worktree");

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
    await expect(runTestTask(completed.home, {
      id: completedTask.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 3,
      expectedRevision: accepted.task.revision,
    }, executor.execute)).rejects.toThrow("completed tasks are viewable history");
    expect(executor.requests).toHaveLength(0);
  });
});

describe("task attempts projection", () => {
  test("returns an empty list when the task has no recorded attempts", () => {
    const current = fixture();
    const created = agentTask(current);
    expect(showPrincipalTaskAttempts(current.home, created.task.id)).toEqual([]);
  });

  test("projects recorded attempts sorted by startedAt with observed facts and stable refs", async () => {
    const current = fixture();
    const created = agentTask(current);
    const executor = new FakeCellExecutor(undefined, ["session-a"]);
    const first = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      reasoningEffort: "high",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);
    const second = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      continueFromAttemptId: first.attemptId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);

    const projections = showPrincipalTaskAttempts(current.home, created.task.id);
    expect(projections).toHaveLength(2);
    const [firstProjection, secondProjection] = projections;
    expect(firstProjection).toMatchObject({
      attemptId: first.attemptId,
      taskRevision: 1,
      sourceRevision: 1,
      workerId: "test-worker",
      driver: "ai-sdk-v7",
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
    expect(firstProjection!.continuedFromAttemptId).toBeUndefined();
    expect(firstProjection!.startedAt).toBeDefined();
    expect(firstProjection!.settledAt).toBeDefined();
    expect(secondProjection).toMatchObject({
      attemptId: second.attemptId,
      continuedFromAttemptId: first.attemptId,
      observedSession: "fresh-session-2",
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

  test("includes runner-failed attempts with settlement status and retained final record facts", async () => {
    const current = fixture();
    const created = agentTask(current);
    const passing = new FakeCellExecutor();
    const first = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, passing.execute);
    const failing = new FakeCellExecutor((record) => ({
      ...record,
      driver: { ...record.driver, model: "opencode/another" },
    }));
    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, failing.execute)).rejects.toThrow(
      "driver model opencode/another does not match the requested model opencode/go",
    );

    const projections = showPrincipalTaskAttempts(current.home, created.task.id);
    expect(projections).toHaveLength(2);
    const failedProjection = projections[1]!;
    expect(failedProjection).toMatchObject({
      status: "runner-failed",
    });
    // A mismatched final is never retained as terminal evidence: the
    // failed attempt carries no invented run/cell claims.
    expect(failedProjection).not.toHaveProperty("cellStatus");
    expect(failedProjection).not.toHaveProperty("observedSession");
    expect(failedProjection).not.toHaveProperty("usage");
    expect(failedProjection.settledAt).toBeDefined();
    expect(first.sessionId).toBeDefined();
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

  test("keeps attributable malformed evidence visible without projecting unowned facts", async () => {
    const current = fixture();
    const created = agentTask(current);
    const valid = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeCellExecutor().execute);
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

  test("gives the attempt task claim exclusive ownership when settlement conflicts", async () => {
    const current = fixture();
    const created = agentTask(current);
    const run = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeCellExecutor().execute);
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

  test("projects only the requested task's attempts and rejects unknown tasks", async () => {
    const current = fixture();
    const created = agentTask(current);
    const executor = new FakeCellExecutor();
    await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute);
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

  test("the CLI exposes task attempts as a read-only projection", async () => {
    const current = fixture();
    const created = agentTask(current);
    const run = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeCellExecutor().execute);

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
    expect(unknown.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(unknown.stderr).toContain("rossovia: Principal task not found");
    expect(unknown.stderr).not.toContain("for usage");
  });
});

describe("strict attempt-family reading", () => {
  test("reads a complete recorded family with every member parsed and exact refs", async () => {
    const current = fixture();
    const created = agentTask(current);
    const run = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeCellExecutor().execute);

    const evidence = readStrictTaskAttemptEvidence(current.home, run.attemptId);

    expect(evidence.standing).toBe("available");
    expect(evidence.attempt?.attemptId).toBe(run.attemptId);
    expect(evidence.attempt?.taskId).toBe(created.task.id);
    expect(evidence.input?.id).toBe(`workbench-task-${created.task.id}-attempt-${run.attemptId}`);
    expect(evidence.finalRecord?.runId).toBe("fake-run-1");
    expect(evidence.finalRecord?.status).toBe("passed");
    expect(evidence.settlement?.status).toBe("recorded");
    expect(evidence.settlement?.workCellRunId).toBe("fake-run-1");
    expect(evidence.refs).toEqual({
      inputRef: run.inputRef,
      attemptRef: run.attemptRef,
      finalRecordRef: run.finalRecordRef,
      settlementRef: run.settlementRef,
    });
  });

  test("fails closed as invalid when the retained final embeds a different input", async () => {
    const current = fixture();
    const created = agentTask(current);
    const run = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeCellExecutor().execute);
    const finalPath = join(current.home, run.finalRecordRef);
    const finalRecord = JSON.parse(readFileSync(finalPath, "utf8"));
    finalRecord.input.intent = "forged intent";
    writeFileSync(finalPath, `${JSON.stringify(finalRecord, null, 2)}\n`);

    const evidence = readStrictTaskAttemptEvidence(current.home, run.attemptId);

    expect(evidence.standing).toBe("invalid");
    expect(evidence.error).toContain("embedded input does not match its immutable CellInput");
    expect(evidence.finalRecord).toBeUndefined();
    // The valid attempt record stays attributable even when its family is invalid.
    expect(evidence.attempt?.attemptId).toBe(run.attemptId);
  });

  test("fails closed on a current AI SDK final record without a provider fingerprint standing", async () => {
    const current = fixture();
    const created = agentTask(current);
    const run = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeCellExecutor().execute);
    const finalPath = join(current.home, run.finalRecordRef);
    const finalRecord = JSON.parse(readFileSync(finalPath, "utf8"));
    const {
      providerFingerprintStanding: _omitted,
      ...observationWithoutStanding
    } = finalRecord.executionObservation;
    finalRecord.executionObservation = observationWithoutStanding;
    writeFileSync(finalPath, `${JSON.stringify(finalRecord, null, 2)}\n`);

    const evidence = readStrictTaskAttemptEvidence(current.home, run.attemptId);

    expect(evidence.standing).toBe("invalid");
    expect(evidence.error).toContain("must carry a truthful provider fingerprint standing");
    expect(evidence.finalRecord).toBeUndefined();
    // The valid attempt record stays attributable even when its family is invalid.
    expect(evidence.attempt?.attemptId).toBe(run.attemptId);
  });

  test("fails closed on a current Pi final record with a contradictory fingerprint standing", async () => {
    const current = fixture();
    const created = agentTask(current);
    const run = await runTestTask(current.home, {
      id: created.task.id,
      provider: "deepseek",
      model: "deepseek-v4-pro",
      reasoningEffort: "max",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeCellExecutor().execute);
    const finalPath = join(current.home, run.finalRecordRef);
    const finalRecord = JSON.parse(readFileSync(finalPath, "utf8"));
    // Observed without a retained fingerprint value: contradictory evidence
    // rejected structurally by the Work Cell final record schema.
    finalRecord.executionObservation.providerFingerprintStanding = { standing: "observed" };
    writeFileSync(finalPath, `${JSON.stringify(finalRecord, null, 2)}\n`);

    const evidence = readStrictTaskAttemptEvidence(current.home, run.attemptId);

    expect(evidence.standing).toBe("invalid");
    expect(evidence.error).toContain(
      "observed provider fingerprint standing requires the retained fingerprint value",
    );
    expect(evidence.finalRecord).toBeUndefined();
  });

  test("keeps a current Pi family with a valid unavailable-with-reason standing available", async () => {
    const current = fixture();
    const created = agentTask(current);
    const run = await runTestTask(current.home, {
      id: created.task.id,
      provider: "deepseek",
      model: "deepseek-v4-pro",
      reasoningEffort: "max",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeCellExecutor().execute);

    const evidence = readStrictTaskAttemptEvidence(current.home, run.attemptId);

    expect(evidence.standing).toBe("available");
    expect(evidence.finalRecord?.driver.adapter).toBe(PI_HARNESS_DRIVER_ADAPTER);
    expect(evidence.finalRecord?.executionObservation.providerFingerprintStanding).toEqual({
      standing: "unavailable",
      reason: "deterministic task-run test executor retains no provider metadata",
    });
  });

  test("reports unavailable when the attempt record itself is missing", () => {
    const current = fixture();

    const evidence = readStrictTaskAttemptEvidence(current.home, randomUUID());

    expect(evidence.standing).toBe("unavailable");
    expect(evidence.attempt).toBeUndefined();
    expect(evidence.refs.inputRef).toContain("state/task-attempts/");
  });
});

describe("legacy default maxSteps attempt evidence", () => {
  test("keeps the exact legacy raw-omitted/final-20 family available and restores reconcile ownership", () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = legacyMaxSteps20Attempt(current, created.task.id, deadPid());

    // The narrow version-aware compatibility keeps the historical pair
    // available: the raw CellInput retains its omitted maxSteps and the
    // embedded final keeps the formerly injected maxSteps: 20.
    const evidence = readStrictTaskAttemptEvidence(current.home, attempt.attemptId);
    expect(evidence.standing).toBe("available");
    expect(evidence.input?.budget.maxSteps).toBeUndefined();
    expect(evidence.input?.budget).not.toHaveProperty("maxSteps");
    expect(evidence.finalRecord?.input.budget.maxSteps).toBe(20);
    expect(readFileSync(join(attempt.directory, "cell-input.json"), "utf8")).toBe(attempt.inputBytes);

    const result = reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    });
    expect(result).toMatchObject({
      taskId: created.task.id,
      attemptId: attempt.attemptId,
      status: "recorded",
      workCellRunId: "legacy-default-maxsteps-run",
      cellStatus: "passed",
    });
    expect(existsSync(attempt.leasePath)).toBeFalse();
    const settlement = JSON.parse(
      readFileSync(join(current.home, result.settlementRef), "utf8"),
    );
    expect(settlement).toMatchObject({
      status: "recorded",
      workCellRunId: "legacy-default-maxsteps-run",
      cellStatus: "passed",
    });
    // The historical bytes are never rewritten by the compatibility read.
    expect(readFileSync(join(attempt.directory, "cell-input.json"), "utf8")).toBe(attempt.inputBytes);
    expect(JSON.parse(
      readFileSync(join(attempt.directory, "cell-input.run.json"), "utf8"),
    ).input.budget.maxSteps).toBe(20);
  });

  test("the reconciled legacy family restores exact continuation ownership", async () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = legacyMaxSteps20Attempt(current, created.task.id, deadPid());
    reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    });

    const executor = new FakeCellExecutor();
    await expect(runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      continueFromAttemptId: attempt.attemptId,
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor.execute)).resolves.toBeTruthy();
    expect(executor.requests).toHaveLength(1);
  });

  test("rejects 19, 21, raw-owned maxSteps, and added fields as invalid evidence", () => {
    const cases: Array<{
      mutateInput?: (input: Record<string, unknown>) => void;
      mutateFinal: (finalInput: CellInput) => CellInput;
    }> = [
      { mutateFinal: (value) => ({ ...value, budget: { ...value.budget, maxSteps: 19 } }) },
      { mutateFinal: (value) => ({ ...value, budget: { ...value.budget, maxSteps: 21 } }) },
      {
        mutateFinal: (value) => ({
          ...value,
          intent: "forged intent",
          budget: { ...value.budget, maxSteps: 20 },
        }),
      },
      {
        mutateFinal: (value) => ({
          ...value,
          budget: { ...value.budget, maxSteps: 20, estimatedTokens: 999 },
        }),
      },
      {
        mutateInput: (value) => {
          (value.budget as Record<string, unknown>).maxSteps = 5;
        },
        mutateFinal: (value) => ({ ...value, budget: { ...value.budget, maxSteps: 20 } }),
      },
    ];
    for (const candidate of cases) {
      const current = fixture();
      const created = agentTask(current);
      const attempt = legacyMaxSteps20Attempt(current, created.task.id, deadPid());
      if (candidate.mutateInput) {
        const inputPath = join(attempt.directory, "cell-input.json");
        const input = JSON.parse(readFileSync(inputPath, "utf8"));
        candidate.mutateInput(input);
        writeFileSync(inputPath, `${JSON.stringify(input, null, 2)}\n`);
      }
      const rawInput = CellInputSchema.parse(JSON.parse(
        readFileSync(join(attempt.directory, "cell-input.json"), "utf8"),
      )) as CellInput;
      const finalRecord = validWorkCellRecord(candidate.mutateFinal(rawInput), {
        runId: "mismatched-legacy-run",
      });
      writeFileSync(
        join(attempt.directory, "cell-input.run.json"),
        `${JSON.stringify(finalRecord, null, 2)}\n`,
      );

      const evidence = readStrictTaskAttemptEvidence(current.home, attempt.attemptId);
      expect(evidence.standing).toBe("invalid");
      expect(evidence.error).toContain("embedded input does not match its immutable CellInput");
      expect(() => reconcilePrincipalTaskAttempt(current.home, {
        id: created.task.id,
        attemptId: attempt.attemptId,
      })).toThrow("retains invalid evidence and cannot be reconciled");
    }
  });

  test("newly written no-maxSteps attempt families remain exact with no injected maxSteps", async () => {
    const current = fixture();
    const created = agentTask(current);
    const run = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeCellExecutor().execute);

    const evidence = readStrictTaskAttemptEvidence(current.home, run.attemptId);
    expect(evidence.standing).toBe("available");
    expect(evidence.input?.budget.maxSteps).toBeUndefined();
    expect(evidence.input?.budget).not.toHaveProperty("maxSteps");
    expect(evidence.finalRecord?.input.budget.maxSteps).toBeUndefined();
    expect(evidence.finalRecord?.input.budget).not.toHaveProperty("maxSteps");
    expect(evidence.finalRecord?.input).toEqual(evidence.input);
  });

  test("a deterministic ordinary task run crosses 20 completed steps with no maxSteps and records a normal terminal", async () => {
    const current = fixture();
    const created = agentTask(current);
    const completedSteps: number[] = [];
    const executor: TaskCellExecutor = async ({ cellInput }) => {
      expect(cellInput.budget.maxSteps).toBeUndefined();
      expect(cellInput.budget).not.toHaveProperty("maxSteps");
      expect(cellInput.budget.maxDurationMs).toBe(1_800_000);
      for (let step = 0; step < 25; step += 1) completedSteps.push(step);
      return validWorkCellRecord(cellInput, { runId: "fake-run-25-steps" });
    };

    const result = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, executor);

    expect(completedSteps).toHaveLength(25);
    expect(result.cellStatus).toBe("passed");
    const settlement = JSON.parse(readFileSync(join(current.home, result.settlementRef), "utf8"));
    expect(settlement).toMatchObject({
      status: "recorded",
      workCellRunId: "fake-run-25-steps",
      cellStatus: "passed",
      semanticAcceptance: "not-evaluated",
    });
    const evidence = readStrictTaskAttemptEvidence(current.home, result.attemptId);
    expect(evidence.standing).toBe("available");
    expect(evidence.input?.budget.maxSteps).toBeUndefined();
    expect(evidence.finalRecord?.input.budget.maxSteps).toBeUndefined();
  });
});

describe("historical v1 reasoning-effort attempt evidence", () => {
  test("keeps a historical v1 attempt with attempt-level reasoning effort and no input execution profile available and reconcileable", () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = historicalV1ReasoningAttempt(current, created.task.id, deadPid());

    // The old record must remain available: the attempt retains its
    // attempt-level reasoning effort while the immutable CellInput carries
    // no worker-bound execution profile to relate it to.
    const evidence = readStrictTaskAttemptEvidence(current.home, attempt.attemptId);
    expect(evidence.standing).toBe("available");
    expect(evidence.attempt?.reasoningEffort).toBe("high");
    expect(evidence.attempt?.workerId).toBeUndefined();
    expect(evidence.input?.workerId).toBeUndefined();
    expect(evidence.input?.executionProfile).toBeUndefined();

    // Reconcile compatibility: the exact dead-owner claim is reconciled to
    // the truthful interrupted runner-failed outcome and released.
    const result = reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    });
    expect(result).toMatchObject({
      taskId: created.task.id,
      attemptId: attempt.attemptId,
      status: "runner-failed",
      error: expect.stringContaining("interrupted"),
    });
    expect(existsSync(attempt.leasePath)).toBeFalse();
    // The historical bytes are never rewritten by the compatibility read.
    expect(readFileSync(join(attempt.directory, "attempt.json"), "utf8")).toBe(attempt.attemptBytes);
    expect(readFileSync(join(attempt.directory, "cell-input.json"), "utf8")).toBe(attempt.inputBytes);
  });

  test("a contradictory profile-bearing current record fails closed while exact profile-bearing equality restores the family", () => {
    const current = fixture();
    const created = agentTask(current);
    const attempt = historicalV1ReasoningAttempt(current, created.task.id, deadPid());
    const inputPath = join(attempt.directory, "cell-input.json");
    const input = JSON.parse(readFileSync(inputPath, "utf8"));

    // A contradictory profile-bearing current record: the immutable input
    // gains a worker-bound execution profile whose reasoning effort differs
    // from the retained attempt-level effort — strict evidence fails closed
    // and never reconciles.
    writeFileSync(inputPath, `${JSON.stringify({
      ...input,
      workerId: "test-worker",
      executionProfile: {
        id: "test-worker",
        version: "execution-profile.v1",
        provider: "opencode",
        model: "opencode/go",
        reasoningEffort: "medium",
        parallelism: "serial",
      },
    }, null, 2)}\n`);
    let evidence = readStrictTaskAttemptEvidence(current.home, attempt.attemptId);
    expect(evidence.standing).toBe("invalid");
    expect(evidence.error).toContain("reasoning effort");
    expect(() => reconcilePrincipalTaskAttempt(current.home, {
      id: created.task.id,
      attemptId: attempt.attemptId,
    })).toThrow("retains invalid evidence and cannot be reconciled");
    expect(existsSync(join(attempt.directory, "settlement.json"))).toBeFalse();
    // The failed-closed read never touches the exact claim.
    expect(readFileSync(attempt.leasePath, "utf8")).toBe(attempt.leaseContent);

    // Exact optional-value equality on a profile-bearing current record
    // restores the available family: the O2 relation is unchanged whenever
    // the immutable input carries a worker-bound execution profile.
    writeFileSync(inputPath, `${JSON.stringify({
      ...input,
      workerId: "test-worker",
      executionProfile: {
        id: "test-worker",
        version: "execution-profile.v1",
        provider: "opencode",
        model: "opencode/go",
        reasoningEffort: "high",
        parallelism: "serial",
      },
    }, null, 2)}\n`);
    evidence = readStrictTaskAttemptEvidence(current.home, attempt.attemptId);
    expect(evidence.standing).toBe("available");
    expect(evidence.input?.workerId).toBe("test-worker");
    expect(evidence.input?.executionProfile?.reasoningEffort).toBe("high");
    expect(evidence.attempt?.reasoningEffort).toBe("high");
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

describe("foreground control bundle for ordinary task run", () => {
  test("an ordinary task run with a control bundle but no signal records normally and releases the lease", async () => {
    const current = fixture();
    const created = agentTask(current);
    const registry = new RunControlRegistry();
    let publishedRunId: string | undefined;
    const result = await runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, new FakeCellExecutor().execute, {
      controlBundle: {
        registry,
        onControlAvailable: (runId) => { publishedRunId = runId; },
      },
    });
    expect(publishedRunId).toBeDefined();
    expect(registry.has(publishedRunId!)).toBeFalse();
    expect(result.cellStatus).toBe("passed");
    expect(attemptLeaseStanding(current.home, created.task.id, publishedRunId!)).toBe("released");
    const evidence = readStrictTaskAttemptEvidence(current.home, publishedRunId!);
    expect(evidence.settlement?.status).toBe("recorded");
    expect(showPrincipalTask(current.home, created.task.id).task.lifecycle).toBe("open");
  });

  test("a foreground signal drains the admitted effect before control-stopped finalization and O3 release, leaving the task open", async () => {
    const current = fixture();
    const created = agentTask(current);
    const registry = new RunControlRegistry();
    let publishedRunId: string | undefined;
    let resolveStarted!: () => void;
    const startedPromise = new Promise<void>((resolve) => { resolveStarted = resolve; });
    let resolveEffectDrained!: () => void;
    const effectDrainedPromise = new Promise<void>((resolve) => { resolveEffectDrained = resolve; });
    const effectMarker = join(current.worktree, "admitted-effect.marker");
    let receiptBeforeAbortHandling = false;
    let effectIncompleteWhenAborted = false;
    let settlementAbsentWhenAborted = false;
    let leaseHeldWhenAborted = false;

    const execute: TaskCellExecutor = async (input) => {
      resolveStarted();
      const { cellInput, signal } = input;
      writeFileSync(effectMarker, "incomplete\n");
      return new Promise((resolve) => {
        const onAbort = () => {
          const receiptPath = join(current.home, "state", "task-attempts", publishedRunId!, "control.json");
          receiptBeforeAbortHandling = existsSync(receiptPath);
          effectIncompleteWhenAborted = existsSync(effectMarker);
          settlementAbsentWhenAborted = !existsSync(
            join(current.home, "state", "task-attempts", publishedRunId!, "settlement.json"),
          );
          leaseHeldWhenAborted = existsSync(worktreeWriterLeasePath(realpathSync(current.worktree)));
          effectDrainedPromise.then(() => {
            rmSync(effectMarker);
            resolve(validWorkCellRecord(cellInput, { runId: "stopped-run", status: "cancelled" }));
          });
        };
        if (signal?.aborted) {
          onAbort();
          return;
        }
        signal?.addEventListener("abort", onAbort, { once: true });
      });
    };
    const runPromise = runTestTask(current.home, {
      id: created.task.id,
      provider: "opencode",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, execute, {
      controlBundle: {
        registry,
        onControlAvailable: (runId) => { publishedRunId = runId; },
      },
    });
    await startedPromise;
    expect(publishedRunId).toBeDefined();

    const receipt = stopRun(
      current.home,
      publishedRunId!,
      { control: "stop", requestedBy: "test", sourceRef: "test:signal" },
      registry,
    );
    resolveEffectDrained();

    await expect(runPromise).rejects.toThrow("settled with status cancelled");
    expect(receiptBeforeAbortHandling).toBeTrue();
    expect(effectIncompleteWhenAborted).toBeTrue();
    expect(settlementAbsentWhenAborted).toBeTrue();
    expect(leaseHeldWhenAborted).toBeTrue();
    expect(existsSync(effectMarker)).toBeFalse();

    const evidence = readStrictTaskAttemptEvidence(current.home, publishedRunId!);
    expect(evidence.finalRecord).toBeDefined();
    expect(evidence.finalRecord?.status).toBe("cancelled");
    expect(evidence.settlement?.status).toBe("control-stopped");
    expect(evidence.settlement?.controlRef).toBe(receipt.receiptRef);
    expect(attemptLeaseStanding(current.home, created.task.id, publishedRunId!)).toBe("released");
    const task = showPrincipalTask(current.home, created.task.id);
    expect(task.task.lifecycle).toBe("open");
  });
});
