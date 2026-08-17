import { afterEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
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
import { isAbsolute, join } from "node:path";
import {
  CellInputSchema,
  CellRunRecordSchema,
  type CellInput,
  type CellRunRecord,
} from "../../../packages/work-cell/src/contracts";
import type { WorkerCard } from "../../../packages/work-cell/src/worker-catalog";
import { initializeHome } from "../src/home";
import { registerProject } from "../src/register";
import { createPrincipalTask, showPrincipalTask } from "../src/tasks";
import {
  acquireWorktreeLease,
  releaseWorktreeLease,
} from "../src/task-run";
import {
  createRunRequestRecord,
  ReconcileRunRefusal,
  reconcileRun,
  RunControlRegistry,
  RunRequestConflictError,
  runOrdinaryTaskRun,
  runRequestDigest,
  runStanding,
  RunStopRefusal,
  stopRun,
  type OrdinaryRunDependencies,
  type RunRequest,
  type RunResult,
  type RunStanding,
  type RunStopRequest,
  type RunTerminalOutcome,
} from "../src/orchestration/run";
import {
  worktreeWriterLeasePath,
} from "../src/orchestration/worktree-writer";
import {
  readStrictTaskAttemptEvidence,
} from "../src/task-attempts";

const temporaryRoots: string[] = [];

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
  const root = mkdtempSync(join(tmpdir(), "rossovia-o2-run-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  const primary = join(root, "project");
  const worktree = join(root, "worktree");
  initializeHome(home);
  mkdirSync(primary, { recursive: true });
  git(primary, "init", "-b", "main");
  git(primary, "config", "user.name", "O2 Run Test");
  git(primary, "config", "user.email", "o2-run@example.test");
  writeFileSync(join(primary, "README.md"), "# O2 Run fixture\n");
  git(primary, "add", "README.md");
  git(primary, "commit", "-m", "initial");
  git(primary, "remote", "add", "origin", "https://example.test/lidessen/o2-run.git");
  git(primary, "worktree", "add", "-b", "task/o2-run", worktree);
  registerProject(home, {
    path: primary,
    id: "repository:o2-run",
    aliases: ["o2-run"],
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
    title: "Run one O2 Run",
    objective: "Implement the exact bounded change",
    acceptance: ["The requested behavior is observable", "Named checks pass"],
    nextActor: "agent",
    sourceRef: "test:o2-run",
    expectedSourceRevision: 0,
    project: "o2-run",
    worktree: fixture_.worktree,
  });
}

/** Neutral test identities: no current provider policy enters the O2 owner. */
function testCard(): WorkerCard {
  return {
    version: "work-cell.worker-card.v1",
    id: "test-worker",
    labels: ["coding"],
    description: "Neutral O2 Run test worker.",
    executionProfile: {
      id: "test-worker",
      version: "execution-profile.v1",
      provider: "test-provider",
      model: "test/model",
      parallelism: "serial",
    },
    availability: { status: "available" },
  };
}

function cellInputFor(runId: string, worktree: string, taskId: string): CellInput {
  return CellInputSchema.parse({
    id: `workbench-task-${taskId}-attempt-${runId}`,
    workerId: "test-worker",
    executionProfile: {
      id: "test-worker",
      version: "execution-profile.v1",
      provider: "test-provider",
      model: "test/model",
      parallelism: "serial",
    },
    intent: "Implement the exact bounded change",
    workspace: {
      root: realpathSync(worktree),
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
  }) as CellInput;
}

function validRecord(
  input: CellInput,
  options: { runId: string; status?: CellRunRecord["status"] },
): CellRunRecord {
  return CellRunRecordSchema.parse({
    version: "work-cell.run.v4",
    runId: options.runId,
    cellId: input.id,
    driver: { adapter: "ai-sdk-v7", provider: "test-provider", model: "test/model" },
    startedAt: "2026-08-16T00:00:00.000Z",
    finishedAt: "2026-08-16T00:00:01.000Z",
    durationMs: 1_000,
    status: options.status ?? "passed",
    input,
    finalText: "Neutral O2 test executor settled.",
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
      providerFingerprintStanding: {
        standing: "unavailable",
        reason: "deterministic neutral O2 test executor retains no provider metadata",
      },
    },
    trace: [],
    rawSteps: [],
  }) as CellRunRecord;
}

class RecordingExecutor {
  readonly invocations: CellInput[] = [];

  constructor(
    private readonly retain: (input: CellInput) => CellRunRecord = (input) =>
      validRecord(input, { runId: "run-1" }),
  ) {}

  execute: NonNullable<OrdinaryRunDependencies["execute"]> = async (input) => {
    this.invocations.push(input);
    return this.retain(input);
  };
}

function makeRequest(fixture_: Fixture, taskId: string, overrides: Partial<RunRequest> = {}): RunRequest {
  return {
    requestId: overrides.requestId ?? randomUUID(),
    taskId,
    taskRevision: overrides.taskRevision ?? 1,
    sourceRevision: overrides.sourceRevision ?? 1,
    workerId: "test-worker",
    execution: { driver: "ai-sdk-v7", model: "test/model" },
    worktree: realpathSync(fixture_.worktree),
    ...overrides,
  };
}

/** The lower callback needs the requestId; bind it per request instead. */
function lowerFor(fixture_: Fixture, taskId: string, runId: string): () => CellInput {
  return () => cellInputFor(runId, fixture_.worktree, taskId);
}

function stopRequest(requestedBy: string): RunStopRequest {
  return { control: "stop", requestedBy, sourceRef: "test:stop" };
}

function terminalRun(run: RunResult): RunTerminalOutcome {
  if (run.standing !== "terminal") {
    throw new Error(`expected a terminal Run result, received ${run.standing}`);
  }
  return run.outcome;
}

function terminalStanding(standing: RunStanding): RunTerminalOutcome {
  if (standing.standing !== "terminal") {
    throw new Error(`expected a terminal Run standing, received ${standing.standing}`);
  }
  return standing.outcome;
}

function expectStopRefusal(invoke: () => unknown, code: RunStopRefusal["code"]): void {
  let caught: unknown;
  try {
    invoke();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(RunStopRefusal);
  expect((caught as RunStopRefusal).code).toBe(code);
}

function expectReconcileRefusal(invoke: () => unknown, code: ReconcileRunRefusal["code"]): void {
  let caught: unknown;
  try {
    invoke();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(ReconcileRunRefusal);
  expect((caught as ReconcileRunRefusal).code).toBe(code);
}

interface FabricatedRun {
  runId: string;
  directory: string;
  leasePath: string;
  leaseContent: string;
}

/** One crash-retained started Run: durable request, immutable input, exact dead-owner claim. */
function fabricatedStartedRun(
  fixture_: Fixture,
  taskId: string,
  pid: number,
  options: { finalRecord?: CellRunRecord } = {},
): FabricatedRun {
  const runId = randomUUID();
  const directory = join(fixture_.home, "state", "task-attempts", runId);
  mkdirSync(directory, { recursive: true });
  const inputRef = `state/task-attempts/${runId}/cell-input.json`;
  const finalRecordRef = `state/task-attempts/${runId}/cell-input.run.json`;
  writeFileSync(join(directory, "attempt.json"), `${JSON.stringify({
    version: "rosso.task-run-attempt.v1",
    taskId,
    taskRevision: 1,
    sourceRevision: 1,
    attemptId: runId,
    inputRef,
    finalRecordRef,
    workerId: "test-worker",
    driver: "ai-sdk-v7",
    model: "test/model",
    status: "started",
    startedAt: "2026-08-16T12:00:00.000Z",
  }, null, 2)}\n`);
  const input = cellInputFor(runId, fixture_.worktree, taskId);
  writeFileSync(join(directory, "cell-input.json"), `${JSON.stringify(input, null, 2)}\n`);
  if (options.finalRecord !== undefined) {
    writeFileSync(
      join(directory, "cell-input.run.json"),
      `${JSON.stringify(options.finalRecord, null, 2)}\n`,
    );
  }
  const gitDirectoryRaw = git(fixture_.worktree, "rev-parse", "--git-dir");
  const gitDirectory = realpathSync(
    isAbsolute(gitDirectoryRaw) ? gitDirectoryRaw : join(fixture_.worktree, gitDirectoryRaw),
  );
  const leasePath = join(gitDirectory, "rossovia-task-run.lock");
  const leaseContent = `${JSON.stringify({
    version: "rosso.task-run-worktree-lease.v1",
    worktree: realpathSync(fixture_.worktree),
    taskId,
    attemptId: runId,
    pid,
    acquiredAt: "2026-08-16T12:00:00.000Z",
  }, null, 2)}\n`;
  // Isolate the fabricated claim: one exact Worktree holds one exclusive
  // claim, so any earlier fabricated claim at the same canonical path is
  // removed first; the no-clobber write then still fails closed if a real
  // exact claim exists underneath.
  if (existsSync(leasePath)) rmSync(leasePath);
  writeFileSync(leasePath, leaseContent, { flag: "wx" });
  return { runId, directory, leasePath, leaseContent };
}

function deadPid(): number {
  const result = Bun.spawnSync(["sh", "-c", "exit 0"]);
  if (result.exitCode !== 0) throw new Error("dead pid fixture failed");
  return result.pid;
}

describe("O2 Run request identity", () => {
  test("one accepted request creates one durable Run identity before O3 acquisition and invokes at most one Cell", async () => {
    const current = fixture();
    const created = agentTask(current);
    const request = makeRequest(current, created.task.id);
    const executor = new RecordingExecutor();
    const leasePath = worktreeWriterLeasePath(realpathSync(current.worktree));
    const result = await runOrdinaryTaskRun(current.home, request, {
      beforeLeaseAcquire() {
        // The durable request record exists before the O3 claim is acquired.
        expect(existsSync(join(current.home, "state", "task-attempts", request.requestId, "attempt.json"))).toBeTrue();
        expect(existsSync(join(current.home, "state", "task-attempts", request.requestId, "cell-input.json"))).toBeFalse();
        expect(existsSync(leasePath)).toBeFalse();
      },
      card: testCard(),
      lowerCellInput: lowerFor(current, created.task.id, request.requestId),
      execute: executor.execute,
    });
    const outcome = terminalRun(result);
    expect(outcome).toMatchObject({
      runId: request.requestId,
      taskId: created.task.id,
      taskRevision: created.task.revision,
      status: "recorded",
      workCellRunId: "run-1",
      cellStatus: "passed",
      cleanup: "released",
    });
    expect(executor.invocations).toHaveLength(1);
    expect(existsSync(leasePath)).toBeFalse();
    const retained = JSON.parse(
      readFileSync(join(current.home, "state", "task-attempts", request.requestId, "attempt.json"), "utf8"),
    );
    expect(retained).toMatchObject({
      version: "rosso.task-run-attempt.v1",
      attemptId: request.requestId,
      requestDigest: runRequestDigest(request),
    });
    const standing = runStanding(current.home, request.requestId);
    expect(standing.standing).toBe("terminal");
    expect(terminalStanding(standing)).toMatchObject({ status: "recorded", cleanup: "released" });
  });

  test("identical replay converges with at most one Cell and a different body under the same identity conflicts", async () => {
    const current = fixture();
    const created = agentTask(current);
    const request = makeRequest(current, created.task.id);
    const executor = new RecordingExecutor();
    const dependencies: OrdinaryRunDependencies = {
      card: testCard(),
      lowerCellInput: lowerFor(current, created.task.id, request.requestId),
      execute: executor.execute,
    };

    const first = await runOrdinaryTaskRun(current.home, request, dependencies);
    expect(first.standing).toBe("terminal");
    expect(terminalRun(first).runId).toBe(request.requestId);
    const replayed = await runOrdinaryTaskRun(current.home, request, dependencies);
    expect(replayed.standing).toBe("terminal");
    expect(terminalRun(replayed)).toMatchObject({
      runId: request.requestId,
      status: "recorded",
      workCellRunId: "run-1",
    });
    // The identical replay converged on the retained Run: still one Cell.
    expect(executor.invocations).toHaveLength(1);

    await expect(runOrdinaryTaskRun(current.home, {
      ...request,
      taskRevision: request.taskRevision + 1,
    }, dependencies)).rejects.toBeInstanceOf(RunRequestConflictError);
    expect(executor.invocations).toHaveLength(1);

    await expect(runOrdinaryTaskRun(current.home, {
      ...request,
      execution: { driver: "ai-sdk-v7", model: "test/another" },
    }, dependencies)).rejects.toBeInstanceOf(RunRequestConflictError);
    expect(executor.invocations).toHaveLength(1);
  });

  test("an unreadable retained request record fails closed instead of converging", async () => {
    const current = fixture();
    const created = agentTask(current);
    const request = makeRequest(current, created.task.id);
    const directory = join(current.home, "state", "task-attempts", request.requestId);
    mkdirSync(directory, { recursive: true });

    await expect(runOrdinaryTaskRun(current.home, request, {
      card: testCard(),
      lowerCellInput: lowerFor(current, created.task.id, request.requestId),
      execute: new RecordingExecutor().execute,
    })).rejects.toThrow("retains no readable durable request record");

    const retained = fixture();
    const retainedTask = agentTask(retained);
    const retainedRequest = makeRequest(retained, retainedTask.task.id);
    const published = createRunRequestRecord(retained.home, retainedRequest);
    const publishedRecord = JSON.parse(readFileSync(published.refs.attemptPath, "utf8"));
    writeFileSync(published.refs.attemptPath, `${JSON.stringify({
      ...publishedRecord,
      model: "tampered/model",
    }, null, 2)}\n`);
    const executor = new RecordingExecutor();
    await expect(runOrdinaryTaskRun(retained.home, retainedRequest, {
      prePublished: true,
      card: testCard(),
      lowerCellInput: lowerFor(retained, retainedTask.task.id, retainedRequest.requestId),
      execute: executor.execute,
    })).rejects.toBeInstanceOf(RunRequestConflictError);
    expect(executor.invocations).toHaveLength(0);
    expect(existsSync(published.refs.inputPath)).toBeFalse();
  });
});

describe("O2 Run outcomes", () => {
  test("an O3 refusal settles a distinct pre-Cell terminal Run with zero Cells and no invented evidence", async () => {
    const current = fixture();
    const created = agentTask(current);
    const request = makeRequest(current, created.task.id);
    const executor = new RecordingExecutor();
    const foreign = acquireWorktreeLease(
      realpathSync(current.worktree),
      created.task.id,
      randomUUID(),
    );

    await expect(runOrdinaryTaskRun(current.home, request, {
      card: testCard(),
      lowerCellInput: lowerFor(current, created.task.id, request.requestId),
      execute: executor.execute,
    })).rejects.toThrow("active task-run lease");
    expect(executor.invocations).toHaveLength(0);
    releaseWorktreeLease(foreign);

    const standing = runStanding(current.home, request.requestId);
    expect(standing.standing).toBe("terminal");
    const outcome = terminalStanding(standing);
    expect(outcome).toMatchObject({ status: "runner-failed" });
    expect(outcome.error).toContain("active task-run lease");
    expect(outcome).not.toHaveProperty("workCellRunId");
    expect(outcome).not.toHaveProperty("cellStatus");
    expect(outcome).not.toHaveProperty("finalRecord");
    expect(existsSync(join(current.home, outcome.refs.finalRecordRef))).toBeFalse();

    // The refusal never blocked a later fresh Run: the fresh request lowers
    // a CellInput whose Run-derived id matches the fresh Run identity.
    const retryRunId = randomUUID();
    const retry = await runOrdinaryTaskRun(current.home, {
      ...request,
      requestId: retryRunId,
    }, {
      card: testCard(),
      lowerCellInput: lowerFor(current, created.task.id, retryRunId),
      execute: executor.execute,
    });
    expect(terminalRun(retry).status).toBe("recorded");
    expect(executor.invocations).toHaveLength(1);
  });

  test("a stale post-claim revalidation settles a distinct pre-Cell terminal Run and releases the exact claim", async () => {
    const current = fixture();
    const created = agentTask(current);
    const request = makeRequest(current, created.task.id);
    const executor = new RecordingExecutor();
    await expect(runOrdinaryTaskRun(current.home, request, {
      card: testCard(),
      lowerCellInput: lowerFor(current, created.task.id, request.requestId),
      execute: executor.execute,
      revalidate: () => {
        throw new Error(`task ${created.task.id} changed before attempt creation after the task-run lease was acquired`);
      },
    })).rejects.toThrow("changed before attempt creation");
    expect(executor.invocations).toHaveLength(0);

    const standing = runStanding(current.home, request.requestId);
    expect(standing.standing).toBe("terminal");
    const outcome = terminalStanding(standing);
    expect(outcome).toMatchObject({ status: "runner-failed", cleanup: "released" });
    expect(outcome.error).toContain("changed before attempt creation");
    expect(outcome).not.toHaveProperty("workCellRunId");
    expect(existsSync(worktreeWriterLeasePath(realpathSync(current.worktree)))).toBeFalse();
  });

  test("a no-final executor crash stays a distinct runner-failed outcome without invented claims", async () => {
    const current = fixture();
    const created = agentTask(current);
    const request = makeRequest(current, created.task.id);
    const result = await runOrdinaryTaskRun(current.home, request, {
      card: testCard(),
      lowerCellInput: lowerFor(current, created.task.id, request.requestId),
      execute: async () => {
        throw new Error("provider crashed mid-run");
      },
    });
    expect(result.standing).toBe("terminal");
    const outcome = terminalRun(result);
    expect(outcome).toMatchObject({ status: "runner-failed", cleanup: "released" });
    expect(outcome.error).toContain("provider crashed mid-run");
    expect(outcome).not.toHaveProperty("workCellRunId");
    expect(outcome).not.toHaveProperty("cellStatus");
    expect(outcome).not.toHaveProperty("finalRecord");
    expect(existsSync(join(current.home, outcome.refs.finalRecordRef))).toBeFalse();
    expect(runStanding(current.home, request.requestId).standing).toBe("terminal");
  });

  test("an invalid final is never retained and settles runner-failed without terminal claims", async () => {
    const current = fixture();
    const created = agentTask(current);
    const request = makeRequest(current, created.task.id);
    const result = await runOrdinaryTaskRun(current.home, request, {
      card: testCard(),
      lowerCellInput: lowerFor(current, created.task.id, request.requestId),
      execute: async (input) => ({
        ...validRecord(input, { runId: "tampered-run" }),
        driver: { adapter: "ai-sdk-v7", provider: "test-provider", model: "test/another" },
      }),
    });
    expect(result.standing).toBe("terminal");
    const outcome = terminalRun(result);
    expect(outcome).toMatchObject({ status: "runner-failed", cleanup: "released" });
    expect(outcome.error).toContain(
      "driver model test/another does not match the requested model test/model",
    );
    expect(outcome).not.toHaveProperty("workCellRunId");
    expect(outcome).not.toHaveProperty("finalRecord");
    expect(existsSync(join(current.home, outcome.refs.finalRecordRef))).toBeFalse();
  });

  test("a non-passed final keeps the exact retained claims and the retained record", async () => {
    const current = fixture();
    const created = agentTask(current);
    const request = makeRequest(current, created.task.id);
    const result = await runOrdinaryTaskRun(current.home, request, {
      card: testCard(),
      lowerCellInput: lowerFor(current, created.task.id, request.requestId),
      execute: async (input) => ({
        ...validRecord(input, { runId: "failed-run" }),
        status: "failed",
        error: "the final failed",
      }),
    });
    expect(result.standing).toBe("terminal");
    const outcome = terminalRun(result);
    expect(outcome).toMatchObject({
      status: "runner-failed",
      workCellRunId: "failed-run",
      cellStatus: "failed",
      error: "the final failed",
      cleanup: "released",
    });
    expect(outcome.finalRecord?.runId).toBe("failed-run");
    expect(existsSync(join(current.home, outcome.refs.finalRecordRef))).toBeTrue();
  });

  test("a lowered CellInput that does not bind the accepted request settles a truthful pre-Cell failure with zero Cells", async () => {
    const cases: Array<{
      lower: (current: Fixture, request: RunRequest) => CellInput;
      error: string;
    }> = [
      {
        // Wrong Run-derived Cell identity: lowered for another Run id.
        lower: (current, request) =>
          cellInputFor(randomUUID(), current.worktree, request.taskId),
        error: "does not bind the exact Run-derived Cell identity",
      },
      {
        // Wrong worker identity.
        lower: (current, request) => {
          const input = cellInputFor(request.requestId, current.worktree, request.taskId);
          return { ...input, workerId: "another-worker" } as CellInput;
        },
        error: "does not match the accepted Run request worker",
      },
      {
        // Wrong execution profile model.
        lower: (current, request) => {
          const input = cellInputFor(request.requestId, current.worktree, request.taskId);
          return {
            ...input,
            executionProfile: { ...input.executionProfile!, model: "test/another" },
          } as CellInput;
        },
        error: "does not match the accepted Run request model",
      },
      {
        // Wrong canonical workspace root.
        lower: (current, request) => {
          const input = cellInputFor(request.requestId, current.worktree, request.taskId);
          return {
            ...input,
            workspace: { ...input.workspace, root: realpathSync(current.primary) },
          } as CellInput;
        },
        error: "does not match the accepted Run request Worktree",
      },
    ];

    for (const candidate of cases) {
      const current = fixture();
      const created = agentTask(current);
      const request = makeRequest(current, created.task.id);
      const executor = new RecordingExecutor();
      await expect(runOrdinaryTaskRun(current.home, request, {
        card: testCard(),
        lowerCellInput: () => candidate.lower(current, request),
        execute: executor.execute,
      })).rejects.toThrow(candidate.error);
      expect(executor.invocations).toHaveLength(0);
      const standing = runStanding(current.home, request.requestId);
      expect(standing.standing).toBe("terminal");
      const outcome = terminalStanding(standing);
      expect(outcome).toMatchObject({ status: "runner-failed", cleanup: "released" });
      expect(outcome.error).toContain(candidate.error);
      expect(outcome).not.toHaveProperty("workCellRunId");
      expect(outcome).not.toHaveProperty("finalRecord");
      // The mismatched input was never persisted: the refusal is pre-Cell
      // and pre-preparation with no invented evidence.
      expect(existsSync(join(current.home, outcome.refs.inputRef))).toBeFalse();
      expect(existsSync(worktreeWriterLeasePath(realpathSync(current.worktree)))).toBeFalse();
    }
  });

  test("binds the request reasoning effort to the lowered execution profile before persistence or execution", async () => {
    const cases: Array<{
      request: (current: Fixture, taskId: string) => RunRequest;
      lower: (current: Fixture, request: RunRequest) => CellInput;
      error: string;
    }> = [
      {
        // The request asks for an effort the lowered profile omits.
        request: (current, taskId) => makeRequest(current, taskId, {
          execution: { driver: "ai-sdk-v7", model: "test/model", reasoningEffort: "high" },
        }),
        lower: (current, request) => cellInputFor(request.requestId, current.worktree, request.taskId),
        error: "reasoning effort unset does not match the accepted Run request reasoning effort high",
      },
      {
        // The request asks for an effort the lowered profile changes.
        request: (current, taskId) => makeRequest(current, taskId, {
          execution: { driver: "ai-sdk-v7", model: "test/model", reasoningEffort: "high" },
        }),
        lower: (current, request) => {
          const input = cellInputFor(request.requestId, current.worktree, request.taskId);
          return {
            ...input,
            executionProfile: { ...input.executionProfile!, reasoningEffort: "medium" },
          } as CellInput;
        },
        error: "reasoning effort medium does not match the accepted Run request reasoning effort high",
      },
      {
        // The lowered profile adds an effort the request never asked for.
        request: (current, taskId) => makeRequest(current, taskId),
        lower: (current, request) => {
          const input = cellInputFor(request.requestId, current.worktree, request.taskId);
          return {
            ...input,
            executionProfile: { ...input.executionProfile!, reasoningEffort: "high" },
          } as CellInput;
        },
        error: "reasoning effort high does not match the accepted Run request reasoning effort unset",
      },
    ];

    for (const candidate of cases) {
      const current = fixture();
      const created = agentTask(current);
      const request = candidate.request(current, created.task.id);
      const executor = new RecordingExecutor();
      await expect(runOrdinaryTaskRun(current.home, request, {
        card: testCard(),
        lowerCellInput: () => candidate.lower(current, request),
        execute: executor.execute,
      })).rejects.toThrow(candidate.error);
      expect(executor.invocations).toHaveLength(0);
      const standing = runStanding(current.home, request.requestId);
      expect(standing.standing).toBe("terminal");
      const outcome = terminalStanding(standing);
      expect(outcome).toMatchObject({ status: "runner-failed", cleanup: "released" });
      expect(outcome.error).toContain("reasoning effort");
      expect(outcome).not.toHaveProperty("workCellRunId");
      expect(outcome).not.toHaveProperty("finalRecord");
      // The mismatched input was never persisted: the refusal is pre-Cell
      // and pre-preparation with no invented evidence.
      expect(existsSync(join(current.home, outcome.refs.inputRef))).toBeFalse();
      expect(existsSync(worktreeWriterLeasePath(realpathSync(current.worktree)))).toBeFalse();
    }

    // Exact optional-value equality on both sides executes exactly one Cell
    // and records; the strict family retains the effort on both surfaces.
    const current = fixture();
    const created = agentTask(current);
    const request = makeRequest(current, created.task.id, {
      execution: { driver: "ai-sdk-v7", model: "test/model", reasoningEffort: "high" },
    });
    const executor = new RecordingExecutor();
    const result = await runOrdinaryTaskRun(current.home, request, {
      card: testCard(),
      lowerCellInput: () => {
        const input = cellInputFor(request.requestId, current.worktree, created.task.id);
        return {
          ...input,
          executionProfile: { ...input.executionProfile!, reasoningEffort: "high" },
        } as CellInput;
      },
      execute: executor.execute,
    });
    expect(terminalRun(result)).toMatchObject({ status: "recorded", cleanup: "released" });
    expect(executor.invocations).toHaveLength(1);
    const retained = readStrictTaskAttemptEvidence(current.home, request.requestId);
    expect(retained.standing).toBe("available");
    expect(retained.attempt?.reasoningEffort).toBe("high");
    expect(retained.input?.executionProfile?.reasoningEffort).toBe("high");
  });

  test("returned terminal results derive only from the strict post-finalization family read", async () => {
    const current = fixture();
    const created = agentTask(current);
    const request = makeRequest(current, created.task.id);
    const result = await runOrdinaryTaskRun(current.home, request, {
      card: testCard(),
      lowerCellInput: lowerFor(current, created.task.id, request.requestId),
      execute: async (input) => {
        const record = validRecord(input, { runId: "unfingerprinted-run" });
        // The executor returns a record that passes the shared finalization's
        // identity checks but is rejected by the strict attempt-family owner
        // (an AI SDK final without a truthful provider fingerprint standing).
        delete record.executionObservation.providerFingerprintStanding;
        return record;
      },
    });
    // The durable settlement exists on disk, but no projection is returned
    // that the strict owner later rejects: the standing is unresolved.
    expect(result.standing).toBe("unresolved");
    if (result.standing !== "unresolved") throw new Error("expected unresolved standing");
    expect(result.error).toContain("rejected by the strict attempt-family read");
    const settlementPath = join(current.home, "state", "task-attempts", request.requestId, "settlement.json");
    expect(existsSync(settlementPath)).toBeTrue();
    expect(existsSync(worktreeWriterLeasePath(realpathSync(current.worktree)))).toBeFalse();
    expect(runStanding(current.home, request.requestId).standing).toBe("invalid");
  });
});

describe("O2 exact live stop", () => {
  test("stop writes its causal receipt before control and settles control-stopped", async () => {
    const current = fixture();
    const created = agentTask(current);
    const request = makeRequest(current, created.task.id);
    const registry = new RunControlRegistry();
    let started!: () => void;
    const startedPromise = new Promise<void>((resolveStarted) => {
      started = resolveStarted;
    });
    const receiptPath = join(current.home, "state", "task-attempts", request.requestId, "control.json");
    const execute: NonNullable<OrdinaryRunDependencies["execute"]> = async (input, { signal }) => {
      started();
      return await new Promise<CellRunRecord>((resolvePromise) => {
        const onAbort = () => {
          // The durable receipt exists before any control is dispatched.
          expect(existsSync(receiptPath)).toBeTrue();
          resolvePromise({
            ...validRecord(input, { runId: "stopped-run" }),
            status: "cancelled",
          });
        };
        if (signal?.aborted) {
          onAbort();
          return;
        }
        signal?.addEventListener("abort", onAbort, { once: true });
      });
    };
    const runPromise = runOrdinaryTaskRun(current.home, request, {
      card: testCard(),
      lowerCellInput: lowerFor(current, created.task.id, request.requestId),
      execute,
      registry,
    });
    await startedPromise;

    const receipt = stopRun(
      current.home,
      request.requestId,
      stopRequest("actor-1"),
      registry,
    );
    expect(receipt).toMatchObject({ runId: request.requestId, control: "stop" });
    expect(receipt.receiptRef).toBe(`state/task-attempts/${request.requestId}/control.json`);
    const retainedReceipt = JSON.parse(readFileSync(join(current.home, receipt.receiptRef), "utf8"));
    expect(retainedReceipt).toMatchObject({
      version: "rosso.run-control-receipt.v1",
      control: "stop",
      runId: request.requestId,
      requestedBy: "actor-1",
      sourceRef: "test:stop",
    });

    const result = await runPromise;
    expect(result.standing).toBe("terminal");
    const outcome = terminalRun(result);
    expect(outcome).toMatchObject({
      status: "control-stopped",
      controlRef: receipt.receiptRef,
      workCellRunId: "stopped-run",
      cellStatus: "cancelled",
      cleanup: "released",
    });
    const settlement = JSON.parse(
      readFileSync(join(current.home, outcome.refs.settlementRef), "utf8"),
    );
    expect(settlement).toMatchObject({
      status: "control-stopped",
      controlRef: receipt.receiptRef,
      workCellRunId: "stopped-run",
      cellStatus: "cancelled",
    });
  });

  test("stop refuses unknown, settled, and non-live Runs", async () => {
    const current = fixture();
    const created = agentTask(current);
    const registry = new RunControlRegistry();
    expectStopRefusal(
      () => stopRun(current.home, randomUUID(), stopRequest("actor-1"), registry),
      "unknown",
    );

    // A settled Run refuses stop regardless of any runtime handle.
    const request = makeRequest(current, created.task.id);
    await runOrdinaryTaskRun(current.home, request, {
      card: testCard(),
      lowerCellInput: lowerFor(current, created.task.id, request.requestId),
      execute: new RecordingExecutor().execute,
    });
    expectStopRefusal(
      () => stopRun(current.home, request.requestId, stopRequest("actor-1"), registry),
      "settled",
    );

    // A crash-retained started Run has no live handle and no settlement:
    // liveness is unknown and the stop cannot be verified.
    const fabricated = fabricatedStartedRun(current, created.task.id, deadPid());
    expectStopRefusal(
      () => stopRun(current.home, fabricated.runId, stopRequest("actor-1"), registry),
      "not-live",
    );
  });

  test("stop conflicts for a distinct requester or source and reuses the exact receipt only for the identical requester and source", async () => {
    const current = fixture();
    const created = agentTask(current);
    const request = makeRequest(current, created.task.id);
    const registry = new RunControlRegistry();
    let started!: () => void;
    const startedPromise = new Promise<void>((resolveStarted) => {
      started = resolveStarted;
    });
    const execute: NonNullable<OrdinaryRunDependencies["execute"]> = async (input, { signal }) => {
      started();
      return await new Promise<CellRunRecord>((resolvePromise) => {
        const onAbort = () => resolvePromise({
          ...validRecord(input, { runId: "stopped-run" }),
          status: "cancelled",
        });
        if (signal?.aborted) {
          onAbort();
          return;
        }
        signal?.addEventListener("abort", onAbort, { once: true });
      });
    };
    const runPromise = runOrdinaryTaskRun(current.home, request, {
      card: testCard(),
      lowerCellInput: lowerFor(current, created.task.id, request.requestId),
      execute,
      registry,
    });
    await startedPromise;

    const receipt = stopRun(current.home, request.requestId, stopRequest("actor-1"), registry);
    expectStopRefusal(
      () => stopRun(current.home, request.requestId, stopRequest("actor-2"), registry),
      "different",
    );
    // The same actor with a different causal source conflicts: the full
    // causal request identity — runId, requestedBy, AND sourceRef — must
    // match before the retained receipt is replayed.
    expectStopRefusal(
      () => stopRun(current.home, request.requestId, {
        control: "stop",
        requestedBy: "actor-1",
        sourceRef: "test:another-stop",
      }, registry),
      "different",
    );
    // The conflicting stops never replaced the retained receipt.
    const retainedBytes = readFileSync(join(current.home, receipt.receiptRef), "utf8");
    expect(JSON.parse(retainedBytes)).toMatchObject({
      runId: request.requestId,
      requestedBy: "actor-1",
      sourceRef: "test:stop",
    });
    // Exact same actor and exact same source replays the retained receipt.
    const replayed = stopRun(current.home, request.requestId, stopRequest("actor-1"), registry);
    expect(replayed.receiptRef).toBe(receipt.receiptRef);
    expect(readFileSync(join(current.home, receipt.receiptRef), "utf8")).toBe(retainedBytes);
    const result = await runPromise;
    expect(terminalRun(result)).toMatchObject({ status: "control-stopped", controlRef: receipt.receiptRef });
  });
});

describe("O2 reconciliation and restart", () => {
  test("a crash-retained started Run is unresolved until reconcile settles no-final without replay or Task mutation", () => {
    const current = fixture();
    const created = agentTask(current);
    const fabricated = fabricatedStartedRun(current, created.task.id, deadPid());

    const before = runStanding(current.home, fabricated.runId);
    expect(before.standing).toBe("unresolved");
    if (before.standing !== "unresolved") throw new Error("expected unresolved standing");
    expect(before.cleanup).toBe("retained");
    expect(before).toMatchObject({ attempt: { taskId: created.task.id, attemptId: fabricated.runId } });

    const taskBefore = showPrincipalTask(current.home, created.task.id);
    const reconciled = reconcileRun(current.home, fabricated.runId);
    expect(reconciled.outcome).toMatchObject({
      runId: fabricated.runId,
      taskId: created.task.id,
      status: "runner-failed",
      cleanup: "released",
    });
    expect(reconciled.outcome.error).toContain("interrupted before a final Work Cell record");
    expect(reconciled.outcome).not.toHaveProperty("workCellRunId");
    expect(existsSync(fabricated.leasePath)).toBeFalse();
    expect(showPrincipalTask(current.home, created.task.id)).toEqual(taskBefore);

    const settlementRef = reconciled.outcome.refs.settlementRef;
    const settlementBytes = readFileSync(join(current.home, settlementRef), "utf8");

    // Idempotent convergence: a second reconciliation mutates nothing.
    const second = reconcileRun(current.home, fabricated.runId);
    expect(second.outcome).toMatchObject({
      status: "runner-failed",
      cleanup: "released",
      error: reconciled.outcome.error,
    });
    expect(readFileSync(join(current.home, settlementRef), "utf8")).toBe(settlementBytes);
    expect(runStanding(current.home, fabricated.runId).standing).toBe("terminal");
  });

  test("first-settlement reconcile derives the outcome only from the strict post-write family", () => {
    const current = fixture();
    const created = agentTask(current);
    const fabricated = fabricatedStartedRun(current, created.task.id, deadPid());
    const input = cellInputFor(fabricated.runId, current.worktree, created.task.id);
    writeFileSync(
      join(fabricated.directory, "cell-input.run.json"),
      `${JSON.stringify(validRecord(input, { runId: "post-write-recovered-run" }), null, 2)}\n`,
    );

    const reconciled = reconcileRun(current.home, fabricated.runId);
    // A stale pre-write snapshot carries no settlement and would project an
    // undefined terminal outcome; the outcome must be defined and exactly
    // match the strictly re-read retained family after the shared settlement
    // write.
    expect(reconciled.outcome).toBeDefined();
    expect(reconciled.outcome).toMatchObject({
      runId: fabricated.runId,
      taskId: created.task.id,
      status: "recorded",
      workCellRunId: "post-write-recovered-run",
      cellStatus: "passed",
      cleanup: "released",
    });
    const retained = readStrictTaskAttemptEvidence(current.home, fabricated.runId);
    expect(retained.standing).toBe("available");
    expect(retained.settlement?.status).toBe(reconciled.outcome.status);
    expect(retained.settlement?.workCellRunId).toBe(reconciled.outcome.workCellRunId);
    expect(retained.settlement?.settledAt).toBeDefined();
    expect(existsSync(fabricated.leasePath)).toBeFalse();
  });

  test("process loss after O3 acquisition before CellInput retention reconciles from the request-owned Worktree identity", () => {
    const current = fixture();
    const created = agentTask(current);
    const request = makeRequest(current, created.task.id);
    const createdRecord = createRunRequestRecord(current.home, request);
    expect(createdRecord.standing).toBe("created");
    // The durable request retains the exact canonical Worktree identity
    // before any O3 acquisition or mutable preparation.
    const retainedAttempt = JSON.parse(
      readFileSync(join(current.home, createdRecord.refs.attemptRef), "utf8"),
    ) as Record<string, unknown>;
    expect(retainedAttempt.worktree).toBe(realpathSync(current.worktree));
    expect(existsSync(join(current.home, createdRecord.refs.inputRef))).toBeFalse();

    // Fabricate the exact dead-owner claim exactly as O3 acquisition would
    // have written it: the process died after the claim but before the
    // CellInput was retained.
    const gitDirectoryRaw = git(current.worktree, "rev-parse", "--git-dir");
    const gitDirectory = realpathSync(
      isAbsolute(gitDirectoryRaw) ? gitDirectoryRaw : join(current.worktree, gitDirectoryRaw),
    );
    const leasePath = join(gitDirectory, "rossovia-task-run.lock");
    const leaseContent = `${JSON.stringify({
      version: "rosso.task-run-worktree-lease.v1",
      worktree: realpathSync(current.worktree),
      taskId: created.task.id,
      attemptId: request.requestId,
      pid: deadPid(),
      acquiredAt: "2026-08-16T12:00:00.000Z",
    }, null, 2)}\n`;
    writeFileSync(leasePath, leaseContent, { flag: "wx" });

    const before = runStanding(current.home, request.requestId);
    expect(before.standing).toBe("unresolved");
    if (before.standing !== "unresolved") throw new Error("expected unresolved standing");
    expect(before.cleanup).toBe("retained");

    // Reconciliation locates the exact dead-owner claim from the
    // request-owned identity alone (no CellInput exists) and settles the
    // truthful interrupted runner-failed outcome.
    const reconciled = reconcileRun(current.home, request.requestId);
    expect(reconciled.outcome).toMatchObject({
      runId: request.requestId,
      taskId: created.task.id,
      status: "runner-failed",
      cleanup: "released",
    });
    expect(reconciled.outcome.error).toContain("interrupted before a final Work Cell record");
    expect(existsSync(leasePath)).toBeFalse();
    expect(runStanding(current.home, request.requestId).standing).toBe("terminal");
  });

  test("the strict family reader requires exact optional reasoning-effort equality between the attempt record and its immutable input profile", () => {
    const current = fixture();
    const created = agentTask(current);
    const fabricated = fabricatedStartedRun(current, created.task.id, deadPid());
    const inputPath = join(fabricated.directory, "cell-input.json");
    const attemptPath = join(fabricated.directory, "attempt.json");

    // Baseline: both sides omit the effort, so exact optional equality holds.
    let evidence = readStrictTaskAttemptEvidence(current.home, fabricated.runId);
    expect(evidence.standing).toBe("available");

    // The attempt record claims an effort the immutable input profile omits.
    const attempt = JSON.parse(readFileSync(attemptPath, "utf8"));
    writeFileSync(attemptPath, `${JSON.stringify({ ...attempt, reasoningEffort: "high" }, null, 2)}\n`);
    evidence = readStrictTaskAttemptEvidence(current.home, fabricated.runId);
    expect(evidence.standing).toBe("invalid");
    expect(evidence.error).toContain("reasoning effort");
    expect(runStanding(current.home, fabricated.runId).standing).toBe("invalid");
    expectReconcileRefusal(() => reconcileRun(current.home, fabricated.runId), "invalid");
    // The failed-closed read never touches the exact claim.
    expect(readFileSync(fabricated.leasePath, "utf8")).toBe(fabricated.leaseContent);

    // The immutable input profile claims an effort the attempt record omits.
    const input = JSON.parse(readFileSync(inputPath, "utf8"));
    writeFileSync(attemptPath, `${JSON.stringify(attempt, null, 2)}\n`);
    writeFileSync(inputPath, `${JSON.stringify({
      ...input,
      executionProfile: { ...input.executionProfile, reasoningEffort: "high" },
    }, null, 2)}\n`);
    evidence = readStrictTaskAttemptEvidence(current.home, fabricated.runId);
    expect(evidence.standing).toBe("invalid");
    expect(evidence.error).toContain("reasoning effort");
    expect(runStanding(current.home, fabricated.runId).standing).toBe("invalid");

    // Exact optional equality on both sides restores the available family.
    writeFileSync(attemptPath, `${JSON.stringify({ ...attempt, reasoningEffort: "high" }, null, 2)}\n`);
    evidence = readStrictTaskAttemptEvidence(current.home, fabricated.runId);
    expect(evidence.standing).toBe("available");
    expect(evidence.attempt?.reasoningEffort).toBe("high");
    expect(evidence.input?.executionProfile?.reasoningEffort).toBe("high");
  });

  test("a durable stop receipt with a retained cancelled final reconciles control-stopped without redispatching control", () => {
    const current = fixture();
    const created = agentTask(current);
    const fabricated = fabricatedStartedRun(current, created.task.id, deadPid());
    const input = cellInputFor(fabricated.runId, current.worktree, created.task.id);
    writeFileSync(
      join(fabricated.directory, "cell-input.run.json"),
      `${JSON.stringify({
        ...validRecord(input, { runId: "stopped-run" }),
        status: "cancelled",
      }, null, 2)}\n`,
    );
    const controlRef = `state/task-attempts/${fabricated.runId}/control.json`;
    writeFileSync(join(fabricated.directory, "control.json"), `${JSON.stringify({
      version: "rosso.run-control-receipt.v1",
      control: "stop",
      runId: fabricated.runId,
      taskId: created.task.id,
      workerId: "test-worker",
      worktree: realpathSync(current.worktree),
      sourceRef: "test:stop-crash",
      requestedBy: "actor-1",
      requestedAt: "2026-08-16T12:00:00.000Z",
      attemptRef: `state/task-attempts/${fabricated.runId}/attempt.json`,
      settlementRef: `state/task-attempts/${fabricated.runId}/settlement.json`,
    }, null, 2)}\n`);

    // A durable stop receipt plus a retained cancelled final, no settlement:
    // liveness unknown but the causal stop is retained.
    const before = runStanding(current.home, fabricated.runId);
    expect(before.standing).toBe("unresolved");
    if (before.standing !== "unresolved") throw new Error("expected unresolved standing");
    expect(before.cleanup).toBe("retained");

    // Restart reconciliation derives control-stopped from the exact receipt
    // and final without redispatching any control and without replay.
    const reconciled = reconcileRun(current.home, fabricated.runId);
    expect(reconciled.outcome).toMatchObject({
      runId: fabricated.runId,
      taskId: created.task.id,
      status: "control-stopped",
      controlRef,
      workCellRunId: "stopped-run",
      cellStatus: "cancelled",
      cleanup: "released",
    });
    expect(existsSync(fabricated.leasePath)).toBeFalse();
    // The retained receipt and cancelled final are untouched by reconciliation.
    expect(readFileSync(join(fabricated.directory, "control.json"), "utf8")).toContain('"runId"');
    expect(existsSync(join(fabricated.directory, "cell-input.run.json"))).toBeTrue();
    const settlement = JSON.parse(
      readFileSync(join(fabricated.directory, "settlement.json"), "utf8"),
    );
    expect(settlement).toMatchObject({
      status: "control-stopped",
      controlRef,
      workCellRunId: "stopped-run",
      cellStatus: "cancelled",
    });
    const standing = runStanding(current.home, fabricated.runId);
    expect(standing.standing).toBe("terminal");
    expect(terminalStanding(standing)).toMatchObject({ status: "control-stopped", controlRef });
  });

  test("a control-stopped settlement without its exact receipt is invalid and fails closed", () => {
    const current = fixture();
    const created = agentTask(current);
    const fabricated = fabricatedStartedRun(current, created.task.id, deadPid());
    const input = cellInputFor(fabricated.runId, current.worktree, created.task.id);
    writeFileSync(
      join(fabricated.directory, "cell-input.run.json"),
      `${JSON.stringify({
        ...validRecord(input, { runId: "stopped-run" }),
        status: "cancelled",
      }, null, 2)}\n`,
    );
    // A control-stopped settlement that names a receipt that was never
    // retained is invalid evidence, never a terminal outcome.
    writeFileSync(join(fabricated.directory, "settlement.json"), `${JSON.stringify({
      version: "rosso.task-run-settlement.v1",
      taskId: created.task.id,
      taskRevision: 1,
      attemptId: fabricated.runId,
      inputRef: `state/task-attempts/${fabricated.runId}/cell-input.json`,
      finalRecordRef: `state/task-attempts/${fabricated.runId}/cell-input.run.json`,
      status: "control-stopped",
      controlRef: `state/task-attempts/${fabricated.runId}/control.json`,
      semanticAcceptance: "not-evaluated",
      settledAt: "2026-08-16T12:00:00.000Z",
    }, null, 2)}\n`);

    const evidence = readStrictTaskAttemptEvidence(current.home, fabricated.runId);
    expect(evidence.standing).toBe("invalid");
    expect(evidence.error).toContain("control");
    expect(runStanding(current.home, fabricated.runId).standing).toBe("invalid");
    expectReconcileRefusal(() => reconcileRun(current.home, fabricated.runId), "invalid");
    // The failed-closed reconciliation never touches the exact claim.
    expect(readFileSync(fabricated.leasePath, "utf8")).toBe(fabricated.leaseContent);
  });

  test("a tampered historical carrier control receipt fails closed and never reconciles control-stopped", () => {
    const current = fixture();
    const created = agentTask(current);
    const fabricated = fabricatedStartedRun(current, created.task.id, deadPid());
    const input = cellInputFor(fabricated.runId, current.worktree, created.task.id);
    writeFileSync(
      join(fabricated.directory, "cell-input.run.json"),
      `${JSON.stringify({
        ...validRecord(input, { runId: "stopped-run" }),
        status: "cancelled",
      }, null, 2)}\n`,
    );
    const controlPath = join(fabricated.directory, "control.json");
    const carrierReceipt = {
      version: "rosso.task-run-control-receipt.v1",
      control: "stop",
      carrierId: fabricated.runId,
      taskId: created.task.id,
      attemptId: fabricated.runId,
      workerId: "test-worker",
      worktree: realpathSync(current.worktree),
      sourceRef: "test:carrier-stop",
      requestedBy: {
        conversationId: randomUUID(),
        turnId: randomUUID(),
        actionId: randomUUID(),
      },
      requestedAt: "2026-08-16T12:00:00.000Z",
      attemptRef: `state/task-attempts/${fabricated.runId}/attempt.json`,
      settlementRef: `state/task-attempts/${fabricated.runId}/settlement.json`,
    };

    // Exact positive: the historical carrier shape with its explicit
    // attemptId reconciles control-stopped without redispatching control.
    writeFileSync(controlPath, `${JSON.stringify(carrierReceipt, null, 2)}\n`);
    const reconciled = reconcileRun(current.home, fabricated.runId);
    expect(reconciled.outcome).toMatchObject({
      runId: fabricated.runId,
      taskId: created.task.id,
      status: "control-stopped",
      controlRef: `state/task-attempts/${fabricated.runId}/control.json`,
      workCellRunId: "stopped-run",
      cellStatus: "cancelled",
      cleanup: "released",
    });
    expect(existsSync(fabricated.leasePath)).toBeFalse();

    // Counterexample: the explicit attemptId points at another evidence
    // directory while carrierId still matches — strict shared evidence fails
    // closed and the tampered receipt never reconciles control-stopped.
    writeFileSync(
      controlPath,
      `${JSON.stringify({ ...carrierReceipt, attemptId: randomUUID() }, null, 2)}\n`,
    );
    const evidence = readStrictTaskAttemptEvidence(current.home, fabricated.runId);
    expect(evidence.standing).toBe("invalid");
    expect(evidence.error).toContain("control receipt attempt id does not match");
    expect(runStanding(current.home, fabricated.runId).standing).toBe("invalid");
    expectReconcileRefusal(() => reconcileRun(current.home, fabricated.runId), "invalid");
  });

  test("malformed or mismatched control receipt evidence fails closed and is never settled", () => {
    const current = fixture();
    const created = agentTask(current);
    const fabricated = fabricatedStartedRun(current, created.task.id, deadPid());
    const input = cellInputFor(fabricated.runId, current.worktree, created.task.id);
    writeFileSync(
      join(fabricated.directory, "cell-input.run.json"),
      `${JSON.stringify({
        ...validRecord(input, { runId: "stopped-run" }),
        status: "cancelled",
      }, null, 2)}\n`,
    );
    const controlPath = join(fabricated.directory, "control.json");
    const receipt = {
      version: "rosso.run-control-receipt.v1",
      control: "stop",
      runId: fabricated.runId,
      taskId: created.task.id,
      workerId: "test-worker",
      worktree: realpathSync(current.worktree),
      sourceRef: "test:stop-crash",
      requestedBy: "actor-1",
      requestedAt: "2026-08-16T12:00:00.000Z",
      attemptRef: `state/task-attempts/${fabricated.runId}/attempt.json`,
      settlementRef: `state/task-attempts/${fabricated.runId}/settlement.json`,
    };
    writeFileSync(controlPath, `${JSON.stringify(receipt, null, 2)}\n`);
    const reconciled = reconcileRun(current.home, fabricated.runId);
    expect(reconciled.outcome.status).toBe("control-stopped");
    const original = JSON.parse(readFileSync(controlPath, "utf8"));

    // A mismatched Run identity fails closed.
    writeFileSync(controlPath, `${JSON.stringify({ ...original, runId: randomUUID() }, null, 2)}\n`);
    expect(runStanding(current.home, fabricated.runId).standing).toBe("invalid");
    expectReconcileRefusal(() => reconcileRun(current.home, fabricated.runId), "invalid");
    // Malformed bytes fail closed.
    writeFileSync(controlPath, "{not-json\n");
    expect(runStanding(current.home, fabricated.runId).standing).toBe("invalid");
    expectReconcileRefusal(() => reconcileRun(current.home, fabricated.runId), "invalid");

    // The exact receipt restores the terminal control-stopped standing.
    writeFileSync(controlPath, `${JSON.stringify(original, null, 2)}\n`);
    const standing = runStanding(current.home, fabricated.runId);
    expect(standing.standing).toBe("terminal");
    expect(terminalStanding(standing)).toMatchObject({
      status: "control-stopped",
      cleanup: "released",
      controlRef: `state/task-attempts/${fabricated.runId}/control.json`,
    });
  });

  test("reconcile derives the shared settlement from a retained owner final and refuses a live owner", () => {
    const current = fixture();
    const created = agentTask(current);
    const withFinal = fabricatedStartedRun(current, created.task.id, deadPid());
    // Retain the exact owner final for the exact immutable input.
    const input = cellInputFor(withFinal.runId, current.worktree, created.task.id);
    writeFileSync(
      join(withFinal.directory, "cell-input.run.json"),
      `${JSON.stringify(validRecord(input, { runId: "recovered-run" }), null, 2)}\n`,
    );

    const reconciled = reconcileRun(current.home, withFinal.runId);
    expect(reconciled.outcome).toMatchObject({
      status: "recorded",
      workCellRunId: "recovered-run",
      cellStatus: "passed",
      cleanup: "released",
    });
    expect(existsSync(withFinal.leasePath)).toBeFalse();

    // A live owner fails closed before any settlement write.
    const live = fabricatedStartedRun(current, created.task.id, process.pid);
    expectReconcileRefusal(() => reconcileRun(current.home, live.runId), "owner-live");
    expect(existsSync(join(live.directory, "settlement.json"))).toBeFalse();
    expect(readFileSync(live.leasePath, "utf8")).toBe(live.leaseContent);
  });

  test("reconcile retries only the exact O3 release after a release failure and keeps the outcome terminal", () => {
    const current = fixture();
    const created = agentTask(current);
    const fabricated = fabricatedStartedRun(current, created.task.id, deadPid());

    const first = reconcileRun(current.home, fabricated.runId, {
      beforeLeaseRelease() {
        // Deterministic release failure: re-serialize the exact claim so its
        // identity stays valid but its bytes change between inspection and
        // release, failing the byte-matched release.
        const parsed = JSON.parse(readFileSync(fabricated.leasePath, "utf8"));
        writeFileSync(fabricated.leasePath, `${JSON.stringify(parsed)}\n`);
      },
    });
    expect(first.outcome).toMatchObject({ status: "runner-failed", cleanup: "retained" });
    expect(first.outcome.cleanupError).toContain("ownership changed before release");
    expect(existsSync(fabricated.leasePath)).toBeTrue();
    // The terminal outcome remains independent from the reconcile-required
    // cleanup standing: the settlement is durable and unchanged.
    const settlementBytes = readFileSync(join(current.home, first.outcome.refs.settlementRef), "utf8");

    // The retry performs only the exact release and mutates nothing else.
    const retried = reconcileRun(current.home, fabricated.runId);
    expect(retried.outcome).toMatchObject({
      status: "runner-failed",
      cleanup: "released",
      error: first.outcome.error,
    });
    expect(retried.outcome).not.toHaveProperty("cleanupError");
    expect(existsSync(fabricated.leasePath)).toBeFalse();
    expect(readFileSync(join(current.home, first.outcome.refs.settlementRef), "utf8")).toBe(settlementBytes);
  });

  test("a run whose terminal settlement is durable but O3 release failed reports cleanup retained and reconciles the exact release", async () => {
    const current = fixture();
    const created = agentTask(current);
    const request = makeRequest(current, created.task.id);
    const leasePath = worktreeWriterLeasePath(realpathSync(current.worktree));
    const result = await runOrdinaryTaskRun(current.home, request, {
      card: testCard(),
      lowerCellInput: lowerFor(current, created.task.id, request.requestId),
      execute: async (input) => {
        // Deterministic O3 release failure: the exact claim bytes change while
        // the Cell runs, so the byte-matched release at finalization fails.
        const parsed = JSON.parse(readFileSync(leasePath, "utf8"));
        writeFileSync(leasePath, `${JSON.stringify(parsed)}\n`);
        return validRecord(input, { runId: "run-1" });
      },
    });
    expect(result.standing).toBe("terminal");
    const outcome = terminalRun(result);
    expect(outcome).toMatchObject({ status: "recorded", cleanup: "retained" });
    expect(outcome.cleanupError).toContain("ownership changed before release");
    expect(existsSync(leasePath)).toBeTrue();

    // The owner process is this test process; the deterministic owner-absence
    // seam proves the recorded owner absent so reconcile can retry the exact
    // release. No Cell starts, no effect replays, and no Task mutates.
    const beforeTask = showPrincipalTask(current.home, created.task.id);
    const retried = reconcileRun(current.home, request.requestId, { ownerAbsent: () => true });
    expect(retried.outcome).toMatchObject({ status: "recorded", cleanup: "released" });
    expect(retried.outcome.workCellRunId).toBe(outcome.workCellRunId);
    expect(showPrincipalTask(current.home, created.task.id)).toEqual(beforeTask);
    expect(existsSync(leasePath)).toBeFalse();
  });

  test("reconcile refuses unknown, invalid, unproven, and unreadable-input Runs", () => {
    const current = fixture();
    const created = agentTask(current);

    expectReconcileRefusal(() => reconcileRun(current.home, randomUUID()), "unknown");

    // Unproven owner: a started Run with no exact claim cannot prove absence.
    const noLease = fabricatedStartedRun(current, created.task.id, deadPid());
    rmSync(noLease.leasePath);
    expectReconcileRefusal(() => reconcileRun(current.home, noLease.runId), "unproven-owner");
    expect(existsSync(join(noLease.directory, "settlement.json"))).toBeFalse();

    // Invalid evidence fails closed without any settlement.
    const corrupted = fabricatedStartedRun(current, created.task.id, deadPid());
    writeFileSync(join(corrupted.directory, "cell-input.json"), "{not-json\n");
    expectReconcileRefusal(() => reconcileRun(current.home, corrupted.runId), "invalid");
    expect(existsSync(join(corrupted.directory, "settlement.json"))).toBeFalse();

    // Unreadable input: a valid record without an immutable CellInput.
    const inputless = fabricatedStartedRun(current, created.task.id, deadPid());
    rmSync(join(inputless.directory, "cell-input.json"));
    expectReconcileRefusal(() => reconcileRun(current.home, inputless.runId), "unreadable-input");
  });
});

describe("O2 live publication callback", () => {
  test("invokes onControlAvailable with the runId after registering and before executing the Cell", async () => {
    const current = fixture();
    const created = agentTask(current);
    const request = makeRequest(current, created.task.id);
    const registry = new RunControlRegistry();
    let callbackRunId: string | undefined;
    let executing = false;
    const executor = new RecordingExecutor();
    const result = await runOrdinaryTaskRun(current.home, request, {
      card: testCard(),
      lowerCellInput: lowerFor(current, created.task.id, request.requestId),
      execute: async (input, options) => {
        executing = true;
        return executor.execute(input, options);
      },
      registry,
      onControlAvailable: (runId) => {
        callbackRunId = runId;
        expect(executing).toBeFalse();
        expect(registry.has(runId)).toBeTrue();
      },
    });
    expect(callbackRunId).toBe(request.requestId);
    expect(executing).toBeTrue();
    expect(terminalRun(result).status).toBe("recorded");
  });

  test("unregisters the live handle after a terminal Run", async () => {
    const current = fixture();
    const created = agentTask(current);
    const request = makeRequest(current, created.task.id);
    const registry = new RunControlRegistry();
    const result = await runOrdinaryTaskRun(current.home, request, {
      card: testCard(),
      lowerCellInput: lowerFor(current, created.task.id, request.requestId),
      execute: new RecordingExecutor().execute,
      registry,
    });
    expect(result.standing).toBe("terminal");
    expect(registry.has(request.requestId)).toBeFalse();
  });
});
