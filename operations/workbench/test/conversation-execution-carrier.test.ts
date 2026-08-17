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
import { isAbsolute, join } from "node:path";
import type { CellDriver, DriverResult } from "../../../packages/work-cell/src/driver";
import { WorkerCatalog, type WorkerCard } from "../../../packages/work-cell/src/worker-catalog";
import { initializeHome } from "../src/home";
import { registerProject } from "../src/register";
import { createPrincipalTask, loadPrincipalTasks } from "../src/tasks";
import { showPrincipalTaskAttempts } from "../src/task-attempts";
import { reconcilePrincipalTaskAttempt } from "../src/task-run";
import { createRunRequestRecord, runStanding } from "../src/orchestration/run";
import {
  createConversationExecutionCarrierRegistry,
  runStopRequester,
  type ConversationExecutionCarrierRegistry,
} from "../src/conversation/execution-carrier";
import {
  ConversationOperationHostError,
  createConversationTaskOperationHost,
} from "../src/conversation/operations";
import { taskActionSourceRef } from "../src/conversation/contracts";
import {
  ConversationSocketRuntime,
  ServerFrameSchema,
  type ConversationSocketData,
  type ServerFrame,
} from "../src/conversation/transport";
import type { AutonomyClient } from "../src/ui/autonomy-client";
import { createWorkbenchRequestHandler } from "../src/ui/server";
import {
  startPreparedConversationTurn,
  type ConversationTurnPortEvent,
} from "../../autonomy/src/conversation-coordinator";
import type {
  ConversationTurnOwner,
  TurnPreparation,
} from "../src/conversation/turn-owner";
import type { ConversationOperation } from "../../autonomy/src/conversation-coordinator";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function git(cwd: string, ...arguments_: string[]): string {
  const result = Bun.spawnSync(["git", ...arguments_], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}

interface Fixture {
  root: string;
  home: string;
  primary: string;
  worktree: string;
  projectId: string;
  taskId: string;
  sourceRevision: number;
  taskRevision: number;
  primaryHead: string;
  worktreeHead: string;
}

function fixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "rossovia-conversation-carrier-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  const primary = join(root, "project");
  const worktree = join(root, "worktree");
  initializeHome(home);
  mkdirSync(primary, { recursive: true });
  git(primary, "init", "-b", "main");
  git(primary, "config", "user.name", "Conversation Carrier Test");
  git(primary, "config", "user.email", "carrier@example.test");
  writeFileSync(join(primary, "README.md"), "# Conversation carrier fixture\n");
  git(primary, "add", "README.md");
  git(primary, "commit", "-m", "initial");
  git(primary, "remote", "add", "origin", "https://example.test/lidessen/conversation-carrier.git");
  git(primary, "worktree", "add", "-b", "task/carrier", worktree);
  const projectId = "conversation-carrier-fixture";
  registerProject(home, { path: primary, id: projectId, aliases: ["carrier-fixture"] });
  const created = createPrincipalTask(home, {
    title: "Run one ordinary task through the conversation carrier",
    objective: "Produce the bounded fixture result in the bound worktree.",
    acceptance: ["The fixture result exists"],
    nextActor: "agent",
    sourceRef: "test:conversation-carrier",
    expectedSourceRevision: 0,
    project: "carrier-fixture",
    worktree,
  });
  const source = loadPrincipalTasks(home);
  return {
    root,
    home,
    primary,
    worktree,
    projectId,
    taskId: created.task.id,
    sourceRevision: source.sourceRevision,
    taskRevision: created.task.revision,
    primaryHead: git(primary, "rev-parse", "HEAD"),
    worktreeHead: git(worktree, "rev-parse", "HEAD"),
  };
}

const FAKE_WORKER_ID = "fake-worker";
const FAKE_PROVIDER = "fake-provider";
const FAKE_MODEL = "fake-model";

function fakeCard(overrides: Partial<WorkerCard> = {}): WorkerCard {
  return {
    version: "work-cell.worker-card.v1",
    id: FAKE_WORKER_ID,
    labels: ["coding", "text", "read", "write"],
    description: "Deterministic fake catalog worker for carrier tests.",
    executionProfile: {
      id: FAKE_WORKER_ID,
      version: "execution-profile.v1",
      provider: FAKE_PROVIDER,
      model: FAKE_MODEL,
      reasoningEffort: "max",
      parallelism: "serial" as const,
    },
    availability: { status: "available" },
    ...overrides,
  };
}

function fakeDescriptor() {
  return { adapter: "ai-sdk-v7", provider: FAKE_PROVIDER, model: FAKE_MODEL };
}

function fakeUsage() {
  return { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 };
}

function fastDriver(emitAfterMs = 0): CellDriver {
  return {
    descriptor: fakeDescriptor(),
    async run(_input, context): Promise<DriverResult> {
      context.emit("agent.step.started", { stepNumber: 1, activeTools: ["read_file"] });
      if (emitAfterMs > 0) await Bun.sleep(emitAfterMs);
      context.emit("agent.step.finished", { finishReason: "stop" });
      return {
        terminalToolsCalled: [],
        finalText: "fake settled",
        usage: fakeUsage(),
        rawSteps: [],
      };
    },
  };
}

function slowDriver(): CellDriver {
  return {
    descriptor: fakeDescriptor(),
    async run(_input, context): Promise<DriverResult> {
      context.emit("agent.step.started", { stepNumber: 1, activeTools: ["write_file"] });
      await new Promise<void>((resolve) => {
        context.signal.addEventListener("abort", () => resolve(), { once: true });
      });
      context.emit("agent.tool.started", { name: "write_file" });
      return {
        terminalToolsCalled: [],
        finalText: "never delivered after abort",
        usage: fakeUsage(),
        rawSteps: [],
      };
    },
  };
}

function failingDriver(message = "fake worker failed"): CellDriver {
  return {
    descriptor: fakeDescriptor(),
    async run(_input, context): Promise<DriverResult> {
      context.emit("agent.step.started", { stepNumber: 1, activeTools: [] });
      throw new Error(message);
    },
  };
}

function fakeCatalog(card = fakeCard(), createDriver: () => CellDriver = fastDriver): WorkerCatalog {
  return new WorkerCatalog([{ card, createDriver }]);
}

interface CarrierParts {
  registry: ConversationExecutionCarrierRegistry;
  host: ReturnType<typeof createConversationTaskOperationHost>;
  conversationId: string;
  turnId: string;
  actionId: string;
}

function carrierParts(fixture_: Fixture, createDriver: () => CellDriver = fastDriver): CarrierParts {
  const registry = createConversationExecutionCarrierRegistry(fixture_.home, {
    catalog: fakeCatalog(fakeCard(), createDriver),
  });
  const host = createConversationTaskOperationHost(fixture_.home, { carrierRegistry: registry });
  return {
    registry,
    host,
    conversationId: randomUUID(),
    turnId: randomUUID(),
    actionId: randomUUID(),
  };
}

function continueOperation(fixture_: Fixture, workerId = FAKE_WORKER_ID): Extract<ConversationOperation, { kind: "task_continue" }> {
  return {
    kind: "task_continue",
    taskId: fixture_.taskId,
    expectedSourceRevision: fixture_.sourceRevision,
    expectedRevision: fixture_.taskRevision,
    workerId,
    projectId: fixture_.projectId,
    expectedPrimaryHead: fixture_.primaryHead,
    worktreePath: realpathSync(fixture_.worktree),
    expectedWorktreeHead: fixture_.worktreeHead,
  };
}

async function until(predicate: () => boolean, label = "condition", timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
    await Bun.sleep(5);
  }
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function attemptDirectory(fixture_: Fixture, attemptId: string): string {
  return join(fixture_.home, "state", "task-attempts", attemptId);
}

function leasePath(fixture_: Fixture): string {
  const raw = git(fixture_.worktree, "rev-parse", "--git-dir");
  return join(
    realpathSync(isAbsolute(raw) ? raw : join(fixture_.worktree, raw)),
    "rossovia-task-run.lock",
  );
}

function readAttemptDirectories(home: string): string[] {
  const root = join(home, "state", "task-attempts");
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

const FAKE_WORKER_ID_2 = "fake-worker-2";
const FAKE_MODEL_2 = "fake-model-2";

function secondCard(): WorkerCard {
  return fakeCard({
    id: FAKE_WORKER_ID_2,
    executionProfile: {
      id: FAKE_WORKER_ID_2,
      version: "execution-profile.v1",
      provider: FAKE_PROVIDER,
      model: FAKE_MODEL_2,
      reasoningEffort: "max",
      parallelism: "serial",
    },
  });
}

function countingCatalog(createDriver: () => CellDriver): {
  catalog: WorkerCatalog;
  invocations: () => number;
} {
  let count = 0;
  const catalog = new WorkerCatalog([{
    card: fakeCard(),
    createDriver: () => {
      count += 1;
      return createDriver();
    },
  }]);
  return { catalog, invocations: () => count };
}

async function waitFor(predicate: () => boolean, label: string, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (predicate()) return;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
    await Bun.sleep(10);
  }
}

function deadPid(): number {
  const result = Bun.spawnSync(["sh", "-c", "exit 0"]);
  if (result.exitCode !== 0) throw new Error("dead pid fixture failed");
  return result.pid;
}

/** Write exact lease bytes for one attempt, as the acquire owner would. */
function writeExactLeaseBytes(fixture_: Fixture, taskId: string, attemptId: string, pid: number): void {
  const content = `${JSON.stringify({
    version: "rosso.task-run-worktree-lease.v1",
    worktree: realpathSync(fixture_.worktree),
    taskId,
    attemptId,
    pid,
    acquiredAt: new Date().toISOString(),
  }, null, 2)}\n`;
  writeFileSync(leasePath(fixture_), content);
}

const FAKE_REQUESTED_POLICY = {
  provider: "fake-coordinator",
  model: "fake.v1",
  thinking: "disabled",
  reasoningEffort: "none",
} as const;

function fakePreparation(): TurnPreparation {
  return {
    requestedPolicy: FAKE_REQUESTED_POLICY,
    prompt: { revision: "fake.prompt.v1", digest: "f".repeat(64) },
    disclosedSources: [],
    sourceRevisionSelectors: [],
    prepared: {
      prompt: {
        revision: "fake.prompt.v1",
        prompt: "fake composed prompt",
        digest: "f".repeat(64),
        disclosedSources: [],
        sourceRevisionSelectors: [],
      },
      requested: {
        promptRevision: "fake.prompt.v1",
        promptDigest: "f".repeat(64),
        disclosedSources: [],
        sourceRevisionSelectors: [],
        ...FAKE_REQUESTED_POLICY,
      },
    },
  };
}

function scriptedOwner(): ConversationTurnOwner {
  return {
    prepare: () => fakePreparation(),
    start(preparation, onDelta) {
      const script: () => AsyncGenerator<ConversationTurnPortEvent> = async function* () {
        yield {
          kind: "finish",
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 },
        };
      };
      return startPreparedConversationTurn(preparation.prepared, {
        port: { run: ({ signal }) => script() },
        onEvent: (event) => {
          if (event.kind === "delta") onDelta(event.text);
        },
      });
    },
  };
}

const CONTINUE_OPERATION_SHAPE: ConversationOperation = {
  kind: "task_continue",
  taskId: "fixture-task",
  expectedSourceRevision: 0,
  expectedRevision: 1,
  workerId: "fixture-worker",
  projectId: "fixture-project",
  expectedPrimaryHead: "1".repeat(40),
  worktreePath: "/tmp/fixture-worktree",
  expectedWorktreeHead: "1".repeat(40),
};

describe("story one: the committed action UUID is the only canonical Run identity", () => {
  test("one task_continue commits actionId as runId and carrierId, publishes the immutable Run request before writer acquisition, and invokes at most one Cell", async () => {
    const current = fixture();
    const published: Array<{
      runId: string;
      attemptExists: boolean;
      leaseExists: boolean;
      inputExists: boolean;
    }> = [];
    const { catalog, invocations } = countingCatalog(fastDriver);
    const registry = createConversationExecutionCarrierRegistry(current.home, {
      catalog,
      onRunRequestPublished: (runId) => {
        published.push({
          runId,
          attemptExists: existsSync(join(attemptDirectory(current, runId), "attempt.json")),
          leaseExists: existsSync(leasePath(current)),
          inputExists: existsSync(join(attemptDirectory(current, runId), "cell-input.json")),
        });
      },
    });
    const host = createConversationTaskOperationHost(current.home, { carrierRegistry: registry });
    const conversationId = randomUUID();
    const turnId = randomUUID();
    const actionId = randomUUID();
    const receipt = await host.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });

    // The committed action UUID is the only canonical Run identity and the
    // returned carrierId equals it.
    expect(receipt.carrierId).toBe(actionId);
    // The immutable Run request was published before writer acquisition and
    // before mutable preparation.
    expect(published).toHaveLength(1);
    expect(published[0]!.runId).toBe(actionId);
    expect(published[0]!.attemptExists).toBe(true);
    expect(published[0]!.leaseExists).toBe(false);
    expect(published[0]!.inputExists).toBe(false);

    const attempt = readJson(join(attemptDirectory(current, actionId), "attempt.json")) as Record<string, unknown>;
    expect(attempt.attemptId).toBe(actionId);
    expect(typeof attempt.requestDigest).toBe("string");
    expect(attempt.correlation).toEqual({
      conversationId,
      turnId,
      actionId,
      sourceRef: taskActionSourceRef(conversationId, actionId),
    });
    // The retained request record is the O2 Run record, never the legacy
    // carrier shape.
    expect("carrierId" in attempt).toBe(false);

    const carrier = registry.startedCarrier(conversationId, actionId)!;
    expect(carrier.identity).toMatchObject({
      carrierId: actionId,
      conversationId,
      turnId,
      actionId,
      taskId: current.taskId,
      attemptId: actionId,
      workerId: FAKE_WORKER_ID,
      worktree: realpathSync(current.worktree),
    });
    expect(receipt.evidenceRefs).toEqual([
      `state/task-attempts/${actionId}/attempt.json`,
      `state/task-attempts/${actionId}/cell-input.json`,
      `state/task-attempts/${actionId}/cell-input.run.json`,
      `state/task-attempts/${actionId}/settlement.json`,
    ]);

    await until(() => carrier.liveness().state === "settled", "run terminal settlement");
    const liveness = carrier.liveness();
    expect(liveness.state).toBe("settled");
    if (liveness.state !== "settled") throw new Error("expected settled");
    expect(liveness.settlement.status).toBe("recorded");
    expect(existsSync(leasePath(current))).toBe(false);
    expect(invocations()).toBe(1);
    const projections = showPrincipalTaskAttempts(current.home, current.taskId);
    expect(projections).toHaveLength(1);
    expect(projections[0]!.attemptId).toBe(actionId);
    expect(projections[0]!.status).toBe("recorded");
  });

  test("identical replay converges on the retained Run without a second Cell and a changed request digest conflicts", async () => {
    const current = fixture();
    const { catalog, invocations } = countingCatalog(fastDriver);
    const first = createConversationExecutionCarrierRegistry(current.home, { catalog });
    const host = createConversationTaskOperationHost(current.home, { carrierRegistry: first });
    const conversationId = randomUUID();
    const turnId = randomUUID();
    const actionId = randomUUID();
    const operation = continueOperation(current);
    const receipt = await host.executeOperation({ conversationId, turnId, actionId, operation });
    expect(receipt.carrierId).toBe(actionId);
    await until(() => first.carrier(actionId)!.liveness().state === "settled", "first run terminal");

    // A fresh registry models a process boundary: the same committed action
    // with the identical request body converges on the retained Run.
    const replayed = createConversationExecutionCarrierRegistry(current.home, { catalog });
    const replayedHost = createConversationTaskOperationHost(current.home, { carrierRegistry: replayed });
    const converged = await replayedHost.executeOperation({ conversationId, turnId, actionId, operation });
    expect(converged.carrierId).toBe(actionId);
    expect(converged.taskId).toBe(current.taskId);
    expect(invocations()).toBe(1);
    expect(readAttemptDirectories(current.home)).toEqual([actionId]);

    // The same Run identity with a different request body conflicts: never a
    // second Cell, never a second Run record.
    const changedCatalog = new WorkerCatalog([
      { card: fakeCard(), createDriver: () => fastDriver() },
      { card: secondCard(), createDriver: () => fastDriver() },
    ]);
    const conflicting = createConversationExecutionCarrierRegistry(current.home, { catalog: changedCatalog });
    const conflictingHost = createConversationTaskOperationHost(current.home, { carrierRegistry: conflicting });
    const changed = { ...operation, workerId: FAKE_WORKER_ID_2 };
    try {
      conflictingHost.executeOperation({ conversationId, turnId, actionId, operation: changed });
      throw new Error("expected the changed request body to conflict");
    } catch (error) {
      expect(error).toBeInstanceOf(ConversationOperationHostError);
      expect((error as ConversationOperationHostError).code).toBe("carrier-duplicate");
      expect((error as ConversationOperationHostError).message).toContain("different Run request");
    }
    expect(invocations()).toBe(1);
    expect(readAttemptDirectories(current.home)).toEqual([actionId]);
  });
});

describe("story two: canonical Run control owner and Run-owned reconnect standing", () => {
  test("an exact live stop routes through the canonical Run control owner and writes only the canonical Run receipt shape", async () => {
    const current = fixture();
    const { catalog } = countingCatalog(slowDriver);
    const registry = createConversationExecutionCarrierRegistry(current.home, { catalog });
    const host = createConversationTaskOperationHost(current.home, { carrierRegistry: registry });
    const conversationId = randomUUID();
    const turnId = randomUUID();
    const actionId = randomUUID();
    const receipt = await host.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });
    const carrierId = receipt.carrierId!;
    expect(carrierId).toBe(actionId);
    const carrier = registry.startedCarrier(conversationId, actionId)!;
    await until(() => carrier.liveness().state === "live", "live Run");

    const control = {
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: { kind: "work_control" as const, carrierId, control: "stop" as const },
    };
    const controlReceipt = await host.executeOperation(control);
    expect(controlReceipt.taskId).toBe(current.taskId);
    expect(controlReceipt.evidenceRefs).toEqual([
      `state/task-attempts/${carrierId}/control.json`,
      `state/task-attempts/${carrierId}/settlement.json`,
    ]);

    // The canonical Run control receipt shape, never the legacy carrier shape.
    const controlFile = readJson(join(attemptDirectory(current, carrierId), "control.json")) as Record<string, unknown>;
    expect(controlFile.version).toBe("rosso.run-control-receipt.v1");
    expect(controlFile.runId).toBe(carrierId);
    expect(controlFile.requestedBy).toBe(runStopRequester({
      conversationId: control.conversationId,
      turnId: control.turnId,
      actionId: control.actionId,
    }));
    expect(controlFile.sourceRef).toBe(taskActionSourceRef(control.conversationId, control.actionId));
    expect("carrierId" in controlFile).toBe(false);
    expect(typeof controlFile.requestedBy).toBe("string");

    await until(() => carrier.liveness().state === "settled", "control-stopped settlement");
    const liveness = carrier.liveness();
    expect(liveness.state).toBe("settled");
    if (liveness.state !== "settled") throw new Error("expected settled");
    expect(liveness.settlement.status).toBe("control-stopped");
    const settlement = readJson(join(attemptDirectory(current, carrierId), "settlement.json")) as Record<string, unknown>;
    expect(settlement.status).toBe("control-stopped");
    expect(settlement.controlRef).toBe(`state/task-attempts/${carrierId}/control.json`);
    expect(existsSync(leasePath(current))).toBe(false);
  });

  test("wrong causal tuple, unknown Run, and terminal Run have zero effect; exact replay reuses the one durable receipt", async () => {
    const current = fixture();
    const { catalog } = countingCatalog(slowDriver);
    const registry = createConversationExecutionCarrierRegistry(current.home, { catalog });
    const host = createConversationTaskOperationHost(current.home, { carrierRegistry: registry });
    const conversationId = randomUUID();
    const turnId = randomUUID();
    const actionId = randomUUID();
    const receipt = await host.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });
    const carrierId = receipt.carrierId!;
    await until(() => registry.carrier(carrierId)!.liveness().state === "live", "live Run");

    // An unknown Run has zero effect.
    try {
      host.executeOperation({
        conversationId,
        turnId: randomUUID(),
        actionId: randomUUID(),
        operation: { kind: "work_control", carrierId: randomUUID(), control: "stop" },
      });
      throw new Error("expected the unknown Run stop to be refused");
    } catch (error) {
      expect(error).toBeInstanceOf(ConversationOperationHostError);
      expect((error as ConversationOperationHostError).code).toBe("carrier-not-found");
    }
    expect(readAttemptDirectories(current.home)).toEqual([carrierId]);

    // The exact causal tuple applies one durable stop. Every call here is
    // synchronous so the abort cascade cannot race the replay/conflict reads.
    const stop = {
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: { kind: "work_control" as const, carrierId, control: "stop" as const },
    };
    const first = host.executeOperation(stop) as {
      taskId: string;
      evidenceRefs: readonly string[];
    };
    // Exact replay of the same causal tuple reuses the one durable receipt.
    const replayed = host.executeOperation(stop) as {
      taskId: string;
      evidenceRefs: readonly string[];
    };
    expect(replayed.evidenceRefs).toEqual(first.evidenceRefs);
    // A distinct causal tuple conflicts and never adopts the first receipt.
    try {
      host.executeOperation({
        conversationId,
        turnId: randomUUID(),
        actionId: randomUUID(),
        operation: { kind: "work_control", carrierId, control: "stop" },
      });
      throw new Error("expected the distinct stop tuple to conflict");
    } catch (error) {
      expect(error).toBeInstanceOf(ConversationOperationHostError);
      expect((error as ConversationOperationHostError).code).toBe("control-conflict");
    }
    const controlFiles = readdirSync(attemptDirectory(current, carrierId))
      .filter((name) => name === "control.json");
    expect(controlFiles).toHaveLength(1);

    await until(() => registry.carrier(carrierId)!.liveness().state === "settled", "terminal after stop");
    // A terminal Run has zero effect: refused, nothing written.
    try {
      host.executeOperation({
        conversationId,
        turnId: randomUUID(),
        actionId: randomUUID(),
        operation: { kind: "work_control", carrierId, control: "stop" },
      });
      throw new Error("expected the terminal Run stop to be refused");
    } catch (error) {
      expect(error).toBeInstanceOf(ConversationOperationHostError);
      expect((error as ConversationOperationHostError).code).toBe("carrier-not-live");
      expect((error as ConversationOperationHostError).message).toContain("already settled");
    }
  });

  test("reconnect derives live, terminal, and truthful unknown only from Run-owned standing and hides stop when terminal", async () => {
    const current = fixture();
    const { catalog } = countingCatalog(slowDriver);
    const registry = createConversationExecutionCarrierRegistry(current.home, { catalog });
    const host = createConversationTaskOperationHost(current.home, { carrierRegistry: registry });
    const conversationId = randomUUID();
    const turnId = randomUUID();
    const actionId = randomUUID();
    const receipt = await host.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });
    const carrierId = receipt.carrierId!;
    await until(() => registry.carrier(carrierId)!.liveness().state === "live", "live Run");
    const exact = { conversationId, turnId, actionId, sourceRef: taskActionSourceRef(conversationId, actionId) };

    // The retained presentation handle projects live through the exact
    // correlation only.
    expect(registry.hydrateCarrier(exact)).toMatchObject({ standing: "live", identity: { carrierId } });
    expect(registry.hydrateCarrier({ ...exact, sourceRef: "conversation:foreign:action:foreign" }))
      .toBeUndefined();

    // A server reload with no handle derives standing only from the
    // canonical Run-owned standing: no settlement yet, never live.
    const restarted = createConversationExecutionCarrierRegistry(current.home, { catalog });
    const unknownHydration = restarted.hydrateCarrier(exact);
    expect(unknownHydration).toBeDefined();
    if (unknownHydration === undefined) throw new Error("expected hydration");
    expect(unknownHydration.standing).toBe("unknown");
    expect(unknownHydration.identity.carrierId).toBe(carrierId);
    expect(runStanding(current.home, carrierId).standing).toBe("unresolved");

    // A stop without the retained handle is liveness unknown, never verified.
    const restartedHost = createConversationTaskOperationHost(current.home, { carrierRegistry: restarted });
    try {
      restartedHost.executeOperation({
        conversationId,
        turnId: randomUUID(),
        actionId: randomUUID(),
        operation: { kind: "work_control", carrierId, control: "stop" },
      });
      throw new Error("expected the unretained Run stop to be unverified");
    } catch (error) {
      expect((error as ConversationOperationHostError).code).toBe("carrier-unknown");
    }

    // The exact stop through the retained owner, then terminal rehydration.
    host.executeOperation({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: { kind: "work_control", carrierId, control: "stop" },
    });
    await until(() => registry.carrier(carrierId)!.liveness().state === "settled", "terminal after stop");
    expect(registry.hydrateCarrier(exact)).toMatchObject({
      standing: "terminal",
      identity: { carrierId },
      settlement: { status: "control-stopped" },
    });
    expect(restarted.hydrateCarrier(exact)).toMatchObject({
      standing: "terminal",
      identity: { carrierId },
      settlement: { status: "control-stopped" },
    });

    // Terminal presentation hides stop: the canonical owner refuses the
    // terminal Run with zero effect and no new receipt.
    try {
      restartedHost.executeOperation({
        conversationId,
        turnId: randomUUID(),
        actionId: randomUUID(),
        operation: { kind: "work_control", carrierId, control: "stop" },
      });
      throw new Error("expected the terminal Run stop to be refused");
    } catch (error) {
      expect((error as ConversationOperationHostError).code).toBe("carrier-not-live");
    }
  });

  test("a recorded Run settles without any automatic Task submission or Principal acceptance", async () => {
    const current = fixture();
    const { catalog } = countingCatalog(fastDriver);
    const registry = createConversationExecutionCarrierRegistry(current.home, { catalog });
    const host = createConversationTaskOperationHost(current.home, { carrierRegistry: registry });
    const conversationId = randomUUID();
    const turnId = randomUUID();
    const actionId = randomUUID();
    const receipt = await host.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });
    await until(() => registry.carrier(receipt.carrierId!)!.liveness().state === "settled", "terminal");

    const settlement = readJson(join(attemptDirectory(current, actionId), "settlement.json")) as Record<string, unknown>;
    expect(settlement.semanticAcceptance).toBe("not-evaluated");
    const tasks = loadPrincipalTasks(current.home);
    const task = tasks.tasks.find((candidate) => candidate.id === current.taskId)!;
    // The recorded Run never moves Task lifecycle and never forms a result
    // claim: explicit result claiming stays the only claiming path.
    expect(task.lifecycle).toBe("open");
    expect(task.nextActor).toBe("agent");
    expect(task.resultClaims).toHaveLength(0);
  });
});

describe("story three: journal-only actions never execute and published Runs without finals move only through Run reconciliation", () => {
  test("a journaled task_continue with no published Run never starts work during reconnect", async () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-conversation-run-journal-"));
    temporaryRoots.push(root);
    const home = join(root, "home");
    initializeHome(home);
    const { catalog, invocations } = countingCatalog(fastDriver);
    const carrierRegistry = createConversationExecutionCarrierRegistry(home, { catalog });
    const operationHost = createConversationTaskOperationHost(home, { carrierRegistry });
    const runtime = new ConversationSocketRuntime(root, {
      turnOwner: scriptedOwner(),
      operationHost,
      carrierRegistry,
    });
    const conversationId = randomUUID();
    const message = await runtime.journal.submitMessage(conversationId, {
      clientMessageId: randomUUID(),
      payload: "continue the fixture task",
    });
    const turnId = randomUUID();
    await runtime.journal.startTurn(conversationId, {
      turnId,
      messageId: message.event.data.messageId,
      requestedPolicy: FAKE_REQUESTED_POLICY,
    });
    const actionId = randomUUID();
    await runtime.journal.requestAction(conversationId, {
      actionId,
      turnId,
      messageId: message.event.data.messageId,
      operation: CONTINUE_OPERATION_SHAPE,
    });

    const handler = createWorkbenchRequestHandler(
      { port: 0, roots: [] },
      {} as AutonomyClient,
      { conversationSocket: runtime },
    );
    const server: Bun.Server<ConversationSocketData> = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch: (request, srv) => handler(request, srv),
      websocket: runtime.websocket,
    });
    try {
      const messages: ServerFrame[] = [];
      const ws = new WebSocket(
        `ws://127.0.0.1:${server.port}/api/conversations/${conversationId}/socket?after=-1`,
      );
      ws.addEventListener("message", (event) => {
        messages.push(ServerFrameSchema.parse(JSON.parse(String(event.data))));
      });
      await new Promise<void>((resolve, reject) => {
        ws.addEventListener("open", () => resolve());
        ws.addEventListener("error", () => reject(new Error("socket error")));
      });
      await waitFor(() => messages.some((frame) =>
        frame.type === "journal.event"
          && frame.event.type === "action.failed"
          && frame.event.data.actionId === actionId), "the journal-only continue fails visibly");

      const events = await runtime.journal.readEvents(conversationId);
      const failed = events.find((event) =>
        event.type === "action.failed" && event.data.actionId === actionId);
      if (failed === undefined || failed.type !== "action.failed") {
        throw new Error("expected action.failed");
      }
      expect(failed.data.reason).toContain("no canonical published Run");
      // No Run record, no writer claim, no Cell: the journal-only action
      // never started work.
      expect(invocations()).toBe(0);
      expect(readAttemptDirectories(home)).toHaveLength(0);
      ws.close();
    } finally {
      server.stop(true);
    }
  });

  test("a published Run with no final is never restarted or replayed and moves only through canonical Run reconciliation", async () => {
    const current = fixture();
    const conversationId = randomUUID();
    const turnId = randomUUID();
    const actionId = randomUUID();
    // A crash boundary: the immutable Run request was published before any
    // writer acquisition and the exact writer claim was then retained with a
    // dead owner — no final record, no settlement.
    const published = createRunRequestRecord(current.home, {
      requestId: actionId,
      taskId: current.taskId,
      taskRevision: current.taskRevision,
      sourceRevision: current.sourceRevision,
      workerId: FAKE_WORKER_ID,
      execution: { driver: "ai-sdk-v7", model: FAKE_MODEL, reasoningEffort: "max" },
      worktree: realpathSync(current.worktree),
    }, {
      conversationId,
      turnId,
      actionId,
      sourceRef: taskActionSourceRef(conversationId, actionId),
    });
    expect(published.standing).toBe("created");
    writeExactLeaseBytes(current, current.taskId, actionId, deadPid());

    const { catalog, invocations } = countingCatalog(fastDriver);
    const restarted = createConversationExecutionCarrierRegistry(current.home, { catalog });
    const restartedHost = createConversationTaskOperationHost(current.home, { carrierRegistry: restarted });
    const exact = { conversationId, turnId, actionId, sourceRef: taskActionSourceRef(conversationId, actionId) };

    // Reconnect standing: truthful unknown from the Run-owned standing only,
    // never live and never a new effect.
    const hydration = restarted.hydrateCarrier(exact);
    expect(hydration).toBeDefined();
    if (hydration === undefined) throw new Error("expected hydration");
    expect(hydration.standing).toBe("unknown");
    expect(hydration.identity.carrierId).toBe(actionId);
    expect(runStanding(current.home, actionId).standing).toBe("unresolved");

    // Conversation never restarts it: the identical replay converges on the
    // retained Run without a second Cell.
    const converged = await restartedHost.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });
    expect(converged.carrierId).toBe(actionId);
    expect(invocations()).toBe(0);

    // The committed continue reconciles as settled from the retained Run.
    const found = restartedHost.findCanonicalReceipt({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });
    expect(found.standing).toBe("settled");

    // Only the canonical Run reconciliation moves the published Run.
    const reconciled = reconcilePrincipalTaskAttempt(current.home, {
      id: current.taskId,
      attemptId: actionId,
    });
    expect(reconciled.status).toBe("runner-failed");
    expect(reconciled.error).toContain("interrupted before a final Work Cell record was retained");

    // The reconciled terminal standing is the truthful Run-owned standing.
    expect(runStanding(current.home, actionId).standing).toBe("terminal");
    expect(restarted.hydrateCarrier(exact)).toMatchObject({
      standing: "terminal",
      identity: { carrierId: actionId },
      settlement: { status: "runner-failed" },
    });
    expect(invocations()).toBe(0);
    expect(readAttemptDirectories(current.home)).toEqual([actionId]);
  });
});










