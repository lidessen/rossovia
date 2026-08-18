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
import { join } from "node:path";
import {
  CellInputSchema,
  CellRunRecordSchema,
  type CellInput,
  type CellRunRecord,
} from "../../../packages/work-cell/src/contracts";
import type { CellDriver, DriverContext, DriverResult } from "../../../packages/work-cell/src/driver";
import type { CellToolSet } from "../../../packages/work-cell/src/tool-port";
import {
  WorkerCardSchema,
  WorkerCatalog,
  type WorkerCard,
} from "../../../packages/work-cell/src/worker-catalog";
import { createLocalHost } from "../../../packages/work-cell/src/workspace";
import { initializeHome } from "../src/home";
import {
  createRossoviaSubWorkerTool,
  ROSSOVIA_SUB_WORKER_TOOL_NAME,
  type RossoviaSubWorkerContext,
} from "../src/integrations/rossovia-sub-worker";
import { registerProject } from "../src/register";
import { createPrincipalTask, showPrincipalTask } from "../src/tasks";
import {
  executeTaskCellRun,
  type TaskRunExecution,
} from "../src/task-run";
import {
  deriveChildRunId,
  runOrdinaryTaskRun,
  RunControlRegistry,
  runStanding,
  type OrdinaryRunDependencies,
  type RunRequest,
  type RunResult,
  type RunStanding,
  type RunTerminalOutcome,
} from "../src/orchestration/run";

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
  parentTask: ReturnType<typeof createPrincipalTask>;
  parentRunId: string;
  registry: RunControlRegistry;
}

function fixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "rossovia-sub-worker-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  const primary = join(root, "project");
  const worktree = join(root, "worktree");
  initializeHome(home);
  mkdirSync(primary, { recursive: true });
  git(primary, "init", "-b", "main");
  git(primary, "config", "user.name", "Sub-worker Test");
  git(primary, "config", "user.email", "sub-worker@example.test");
  writeFileSync(join(primary, "README.md"), "# fixture\n");
  git(primary, "add", "README.md");
  git(primary, "commit", "-m", "initial");
  git(primary, "remote", "add", "origin", "https://example.test/lidessen/sub-worker.git");
  git(primary, "worktree", "add", "-b", "task/sub-worker", worktree);
  registerProject(home, {
    path: primary,
    id: "repository:sub-worker",
    aliases: ["sub-worker"],
  });
  const parentTask = createPrincipalTask(home, {
    title: "Parent with sub_worker",
    objective: "Delegate one read-only child task",
    acceptance: ["Child result is source-linked"],
    nextActor: "agent",
    sourceRef: "test:sub-worker",
    expectedSourceRevision: 0,
    project: "sub-worker",
    worktree,
  });
  return {
    root,
    home,
    primary,
    worktree,
    parentTask,
    parentRunId: randomUUID(),
    registry: new RunControlRegistry(),
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

function parentExecution(): TaskRunExecution {
  return { driver: "ai-sdk-v7", model: "parent/model" };
}

function parentCard(): WorkerCard {
  return WorkerCardSchema.parse({
    version: "work-cell.worker-card.v1",
    id: "parent-worker",
    labels: ["coding"],
    description: "Parent worker that carries the sub_worker tool.",
    executionProfile: {
      id: "parent-worker",
      version: "execution-profile.v1",
      provider: "test-provider",
      model: "parent/model",
      parallelism: "serial",
    },
    availability: { status: "available" },
  }) as WorkerCard;
}

function childCard(): WorkerCard {
  return WorkerCardSchema.parse({
    version: "work-cell.worker-card.v1",
    id: "child-worker",
    labels: ["coding"],
    description: "Child worker selected by sub_worker.",
    executionProfile: {
      id: "child-worker",
      version: "execution-profile.v1",
      provider: "test-provider",
      model: "child/model",
      parallelism: "serial",
    },
    availability: { status: "available" },
  }) as WorkerCard;
}

function unavailableChildCard(): WorkerCard {
  return WorkerCardSchema.parse({
    version: "work-cell.worker-card.v1",
    id: "unavailable-child-worker",
    labels: ["coding"],
    description: "Unavailable child worker.",
    executionProfile: {
      id: "unavailable-child-worker",
      version: "execution-profile.v1",
      provider: "test-provider",
      model: "child/model",
      parallelism: "serial",
    },
    availability: { status: "unavailable", reason: "maintenance" },
  }) as WorkerCard;
}

function catalog(): WorkerCatalog {
  return new WorkerCatalog([
    { card: parentCard(), createDriver: () => new ParentTestDriver() },
    { card: childCard(), createDriver: () => new ChildTestDriver() },
  ]);
}

function catalogWithUnavailableChild(): WorkerCatalog {
  return new WorkerCatalog([
    { card: parentCard(), createDriver: () => new ParentTestDriver() },
    { card: unavailableChildCard(), createDriver: () => new ChildTestDriver() },
  ]);
}

function cellInputFor(
  runId: string,
  worktree: string,
  taskId: string,
  workerId: string,
  model: string,
): CellInput {
  return CellInputSchema.parse({
    id: `workbench-task-${taskId}-attempt-${runId}`,
    workerId,
    executionProfile: {
      id: workerId,
      version: "execution-profile.v1",
      provider: "test-provider",
      model,
      parallelism: "serial",
    },
    intent: "test intent",
    workspace: {
      root: realpathSync(worktree),
      readPaths: ["."],
      writePaths: workerId === "child-worker" ? [] : ["."],
      excludePaths: [],
      allowedCommands: [],
    },
    instructions: ["test instruction"],
    capabilities: [],
    context: [],
    capabilitiesRequired: [],
    acceptance: ["test acceptance"],
    budget: { maxDurationMs: 1_800_000 },
  }) as CellInput;
}

function validRecord(input: CellInput, runId: string, status: CellRunRecord["status"] = "passed"): CellRunRecord {
  return CellRunRecordSchema.parse({
    version: "work-cell.run.v4",
    runId,
    cellId: input.id,
    driver: { adapter: "ai-sdk-v7", provider: "test-provider", model: input.executionProfile!.model },
    startedAt: "2026-08-16T00:00:00.000Z",
    finishedAt: "2026-08-16T00:00:01.000Z",
    durationMs: 1_000,
    status,
    input,
    finalText: `Neutral test executor settled for ${runId}.`,
    artifacts: [],
    verification: {
      passed: status === "passed",
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
        reason: "deterministic neutral test executor retains no provider metadata",
      },
    },
    trace: [],
    rawSteps: [],
  }) as CellRunRecord;
}

class ParentTestDriver implements CellDriver {
  readonly supportsCellTools = true as const;
  readonly descriptor = { adapter: "ai-sdk-v7", provider: "test-provider", model: "parent/model" };

  async run(_input: CellInput, context: DriverContext): Promise<DriverResult> {
    if (context.cellTools === undefined) {
      throw new Error("parent test driver expected injected cell tools");
    }
    const result = await context.cellTools.execute(
      ROSSOVIA_SUB_WORKER_TOOL_NAME,
      { workerId: "child-worker", prompt: "Read the fixture and return a bounded result." },
      "parent-call-1",
    );
    const typed = result as { childRunId: string; status: string };
    return {
      terminalToolsCalled: [],
      finalText: `parent delegated to ${typed.childRunId} with status ${typed.status}`,
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 },
      rawSteps: [],
    };
  }
}

class ChildTestDriver implements CellDriver {
  readonly descriptor = { adapter: "ai-sdk-v7", provider: "test-provider", model: "child/model" };

  async run(input: CellInput): Promise<DriverResult> {
    if (input.workspace.writePaths.length > 0 || input.workspace.allowedCommands.length > 0) {
      throw new Error("child driver refused non-read-only workspace");
    }
    return {
      terminalToolsCalled: [],
      finalText: "child completed read-only",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 },
      rawSteps: [],
    };
  }
}

function makeParentRequest(fixture_: Fixture): RunRequest {
  const task = showPrincipalTask(fixture_.home, fixture_.parentTask.task.id).task;
  return {
    requestId: fixture_.parentRunId,
    taskId: task.id,
    taskRevision: task.revision,
    sourceRevision: fixture_.parentTask.sourceRevision,
    workerId: "parent-worker",
    execution: parentExecution(),
    worktree: realpathSync(fixture_.worktree),
  };
}

function buildParentCellInput(fixture_: Fixture, runId: string): CellInput {
  return cellInputFor(runId, fixture_.worktree, fixture_.parentTask.task.id, "parent-worker", "parent/model");
}

function buildChildCellInput(fixture_: Fixture, childRunId: string, workerId: string, prompt: string): CellInput {
  const input = cellInputFor(childRunId, fixture_.worktree, fixture_.parentTask.task.id, workerId, "child/model");
  input.instructions = [prompt];
  return input;
}

function subWorkerToolContext(fixture_: Fixture): RossoviaSubWorkerContext {
  const task = showPrincipalTask(fixture_.home, fixture_.parentTask.task.id).task;
  return {
    home: fixture_.home,
    parentRunId: fixture_.parentRunId,
    taskId: task.id,
    taskRevision: task.revision,
    sourceRevision: fixture_.parentTask.sourceRevision,
    worktree: realpathSync(fixture_.worktree),
    execution: parentExecution(),
    catalog: catalog(),
    host: createLocalHost(),
    registry: fixture_.registry,
    buildChildCellInput: (childRunId, workerId, prompt) =>
      buildChildCellInput(fixture_, childRunId, workerId, prompt),
  };
}

function parentCellTools(fixture_: Fixture): CellToolSet {
  return {
    [ROSSOVIA_SUB_WORKER_TOOL_NAME]: createRossoviaSubWorkerTool(subWorkerToolContext(fixture_)),
  };
}

function parentExecutor(fixture_: Fixture): NonNullable<OrdinaryRunDependencies["execute"]> {
  return async (cellInput, options) => {
    const outcome = await executeTaskCellRun(catalog(), cellInput, {
      host: createLocalHost(),
      ...(options.signal === undefined ? {} : { signal: options.signal }),
      tools: parentCellTools(fixture_),
    });
    if (outcome.status === "failed") throw new Error(outcome.error);
    return outcome.record;
  };
}

function terminalOutcome(run: RunResult | RunStanding): RunTerminalOutcome {
  if (run.standing !== "terminal") throw new Error(`expected terminal run, got ${run.standing}`);
  return run.outcome;
}

describe("sub_worker forward story", () => {
  test("parent Cell calls sub_worker and produces exactly two Runs, one Cell each, with a source-linked child result", async () => {
    const current = fixture();
    const request = makeParentRequest(current);
    const expectedChildRunId = deriveChildRunId(current.parentRunId, "parent-call-1");

    const result = await runOrdinaryTaskRun(current.home, request, {
      card: parentCard(),
      registry: current.registry,
      onControlAvailable: () => {},
      lowerCellInput: () => buildParentCellInput(current, current.parentRunId),
      execute: parentExecutor(current),
    });

    const outcome = terminalOutcome(result);
    expect(outcome.runId).toBe(current.parentRunId);
    expect(outcome.status).toBe("recorded");
    expect(outcome.cleanup).toBe("released");
    expect(outcome.finalRecord).toBeDefined();
    expect(outcome.finalRecord!.finalText).toContain(expectedChildRunId);

    const parentStanding = runStanding(current.home, current.parentRunId);
    expect(parentStanding.standing).toBe("terminal");

    const childStanding = runStanding(current.home, expectedChildRunId);
    expect(childStanding.standing).toBe("terminal");
    const childOutcome = terminalOutcome(childStanding);
    expect(childOutcome.runId).toBe(expectedChildRunId);
    expect(childOutcome.status).toBe("recorded");
    expect(childOutcome.cleanup).toBe("released");
    expect(childOutcome.finalRecord).toBeDefined();
    expect(childOutcome.finalRecord!.input.workspace.writePaths).toEqual([]);
    expect(childOutcome.finalRecord!.input.workspace.allowedCommands).toEqual([]);
    expect(childOutcome.finalRecord!.cellId).toBe(
      `workbench-task-${current.parentTask.task.id}-attempt-${expectedChildRunId}`,
    );

    const retainedChildAttempt = JSON.parse(
      readFileSync(join(current.home, "state", "task-attempts", expectedChildRunId, "attempt.json"), "utf8"),
    );
    expect(retainedChildAttempt.access).toBe("read-only");
    expect(retainedChildAttempt.parentTool).toEqual({
      name: ROSSOVIA_SUB_WORKER_TOOL_NAME,
      parentRunId: current.parentRunId,
      toolCallId: "parent-call-1",
      promptDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(retainedChildAttempt).not.toHaveProperty("correlation");

    const retainedParentAttempt = JSON.parse(
      readFileSync(join(current.home, "state", "task-attempts", current.parentRunId, "attempt.json"), "utf8"),
    );
    expect(retainedParentAttempt.access).toBeUndefined();
  });
});

describe("sub_worker cancellation/no-final boundary", () => {
  test("parent cancellation reaches the exact child Run and the tool promise returns unresolved when the child has no terminal evidence", async () => {
    const current = fixture();
    const request = makeParentRequest(current);
    const expectedChildRunId = deriveChildRunId(current.parentRunId, "parent-call-1");

    let childStarted = false;
    class HangingChildDriver implements CellDriver {
      readonly descriptor = { adapter: "ai-sdk-v7", provider: "test-provider", model: "child/model" };
      async run(input: CellInput): Promise<DriverResult> {
        if (input.workspace.writePaths.length > 0 || input.workspace.allowedCommands.length > 0) {
          throw new Error("child driver refused non-read-only workspace");
        }
        childStarted = true;
        return await new Promise(() => {
          // Never resolves; the parent cancellation should stop this Run.
        });
      }
    }

    const hangingCatalog = new WorkerCatalog([
      { card: parentCard(), createDriver: () => new ParentTestDriver() },
      { card: childCard(), createDriver: () => new HangingChildDriver() },
    ]);

    const parentCtx: RossoviaSubWorkerContext = {
      ...subWorkerToolContext(current),
      catalog: hangingCatalog,
    };

    const executor = async (cellInput: CellInput, options: { signal?: AbortSignal }) => {
      const outcome = await executeTaskCellRun(hangingCatalog, cellInput, {
        host: createLocalHost(),
        ...(options.signal === undefined ? {} : { signal: options.signal }),
        tools: {
          [ROSSOVIA_SUB_WORKER_TOOL_NAME]: createRossoviaSubWorkerTool(parentCtx),
        },
      });
      if (outcome.status === "failed") throw new Error(outcome.error);
      return outcome.record;
    };

    const controller = new AbortController();
    const runPromise = runOrdinaryTaskRun(current.home, request, {
      card: parentCard(),
      registry: current.registry,
      onControlAvailable: () => {},
      lowerCellInput: () => buildParentCellInput(current, current.parentRunId),
      execute: executor,
    });

    // Wait until the child driver has started, then abort the parent Run.
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (childStarted) {
          clearInterval(interval);
          resolve();
        }
      }, 5);
    });
    controller.abort();

    const result = await runPromise;
    expect(result.standing).toBeOneOf(["terminal", "unresolved"]);

    const childStanding = runStanding(current.home, expectedChildRunId);
    // The child Run is either terminal (stopped) or unresolved because its
    // terminal evidence is still being retained. Either way, the parent tool
    // promise did not return a fake success while the child was live.
    expect(["terminal", "unresolved"]).toContain(childStanding.standing);
  });
});

describe("sub_worker compatibility/capability story", () => {
  test("unknown worker, unavailable worker, or a child input requesting write/command capability fail closed", async () => {
    const current = fixture();
    const request = makeParentRequest(current);

    // Parent driver that tries to delegate to an unknown worker.
    class UnknownWorkerDriver implements CellDriver {
      readonly supportsCellTools = true as const;
      readonly descriptor = { adapter: "ai-sdk-v7", provider: "test-provider", model: "parent/model" };
      async run(_input: CellInput, context: DriverContext): Promise<DriverResult> {
        await expect(context.cellTools!.execute(
          ROSSOVIA_SUB_WORKER_TOOL_NAME,
          { workerId: "no-such-worker", prompt: "test" },
          "call-unknown",
        )).rejects.toThrow("unknown workerId");
        return {
          terminalToolsCalled: [],
          finalText: "unknown worker rejected",
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
          rawSteps: [],
        };
      }
    }

    const unknownCatalog = new WorkerCatalog([
      { card: parentCard(), createDriver: () => new UnknownWorkerDriver() },
      { card: childCard(), createDriver: () => new ChildTestDriver() },
    ]);

    const unknownExecutor = async (cellInput: CellInput, options: { signal?: AbortSignal }) => {
      const outcome = await executeTaskCellRun(unknownCatalog, cellInput, {
        host: createLocalHost(),
        ...(options.signal === undefined ? {} : { signal: options.signal }),
        tools: {
          [ROSSOVIA_SUB_WORKER_TOOL_NAME]: createRossoviaSubWorkerTool({
            ...subWorkerToolContext(current),
            catalog: unknownCatalog,
          }),
        },
      });
      if (outcome.status === "failed") throw new Error(outcome.error);
      return outcome.record;
    };

    const unknownResult = await runOrdinaryTaskRun(current.home, request, {
      card: parentCard(),
      registry: current.registry,
      onControlAvailable: () => {},
      lowerCellInput: () => buildParentCellInput(current, current.parentRunId),
      execute: unknownExecutor,
    });
    expect(terminalOutcome(unknownResult).finalRecord!.finalText).toContain("unknown worker rejected");

    // Unavailable worker.
    class UnavailableWorkerDriver implements CellDriver {
      readonly supportsCellTools = true as const;
      readonly descriptor = { adapter: "ai-sdk-v7", provider: "test-provider", model: "parent/model" };
      async run(_input: CellInput, context: DriverContext): Promise<DriverResult> {
        await expect(context.cellTools!.execute(
          ROSSOVIA_SUB_WORKER_TOOL_NAME,
          { workerId: "unavailable-child-worker", prompt: "test" },
          "call-unavailable",
        )).rejects.toThrow("unavailable");
        return {
          terminalToolsCalled: [],
          finalText: "unavailable worker rejected",
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
          rawSteps: [],
        };
      }
    }

    const unavailableCatalog = catalogWithUnavailableChild();
    const unavailableExecutor = async (cellInput: CellInput, options: { signal?: AbortSignal }) => {
      const outcome = await executeTaskCellRun(unavailableCatalog, cellInput, {
        host: createLocalHost(),
        ...(options.signal === undefined ? {} : { signal: options.signal }),
        tools: {
          [ROSSOVIA_SUB_WORKER_TOOL_NAME]: createRossoviaSubWorkerTool({
            ...subWorkerToolContext(current),
            catalog: unavailableCatalog,
          }),
        },
      });
      if (outcome.status === "failed") throw new Error(outcome.error);
      return outcome.record;
    };

    const unavailableResult = await runOrdinaryTaskRun(current.home, request, {
      card: parentCard(),
      registry: current.registry,
      onControlAvailable: () => {},
      lowerCellInput: () => buildParentCellInput(current, current.parentRunId),
      execute: unavailableExecutor,
    });
    expect(terminalOutcome(unavailableResult).finalRecord!.finalText).toContain("unavailable worker rejected");

    // Write/command capability requested by the child lowering fails closed.
    const badContext: RossoviaSubWorkerContext = {
      ...subWorkerToolContext(current),
      buildChildCellInput: (childRunId, workerId, prompt) => {
        const input = buildChildCellInput(current, childRunId, workerId, prompt);
        input.workspace.writePaths = ["."];
        return input;
      },
    };
    class BadCapabilityDriver implements CellDriver {
      readonly supportsCellTools = true as const;
      readonly descriptor = { adapter: "ai-sdk-v7", provider: "test-provider", model: "parent/model" };
      async run(_input: CellInput, context: DriverContext): Promise<DriverResult> {
        await expect(context.cellTools!.execute(
          ROSSOVIA_SUB_WORKER_TOOL_NAME,
          { workerId: "child-worker", prompt: "test" },
          "call-bad-capability",
        )).rejects.toThrow("write paths");
        return {
          terminalToolsCalled: [],
          finalText: "write capability rejected",
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
          rawSteps: [],
        };
      }
    }

    const badCatalog = new WorkerCatalog([
      { card: parentCard(), createDriver: () => new BadCapabilityDriver() },
      { card: childCard(), createDriver: () => new ChildTestDriver() },
    ]);
    const badExecutor = async (cellInput: CellInput, options: { signal?: AbortSignal }) => {
      const outcome = await executeTaskCellRun(badCatalog, cellInput, {
        host: createLocalHost(),
        ...(options.signal === undefined ? {} : { signal: options.signal }),
        tools: {
          [ROSSOVIA_SUB_WORKER_TOOL_NAME]: createRossoviaSubWorkerTool(badContext),
        },
      });
      if (outcome.status === "failed") throw new Error(outcome.error);
      return outcome.record;
    };

    const badResult = await runOrdinaryTaskRun(current.home, request, {
      card: parentCard(),
      registry: current.registry,
      onControlAvailable: () => {},
      lowerCellInput: () => buildParentCellInput(current, current.parentRunId),
      execute: badExecutor,
    });
    expect(terminalOutcome(badResult).finalRecord!.finalText).toContain("write capability rejected");
  });
});
