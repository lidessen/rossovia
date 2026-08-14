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
import {
  carrierStandingWithoutHandle,
  createConversationExecutionCarrierRegistry,
  type ConversationExecutionCarrierRegistry,
} from "../src/conversation/execution-carrier";
import {
  ConversationOperationHostError,
  createConversationTaskOperationHost,
} from "../src/conversation/operations";
import { createConversationContextProvider } from "../src/conversation/context";
import { taskActionSourceRef } from "../src/conversation/contracts";
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

describe("conversation execution carrier start", () => {
  test("a catalog-backed task_continue starts at most one carrier with exact identity lineage", async () => {
    const current = fixture();
    const { registry, host, conversationId, turnId, actionId } = carrierParts(current);
    const receipt = host.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });

    expect(receipt.taskId).toBe(current.taskId);
    expect(receipt.sourceRevision).toBe(current.sourceRevision);
    expect(receipt.taskRevision).toBe(current.taskRevision);
    const carrier = registry.startedCarrier(conversationId, actionId);
    expect(carrier).toBeDefined();
    const carrierId = carrier!.identity.carrierId;
    expect(carrier!.identity).toMatchObject({
      carrierId,
      conversationId,
      turnId,
      actionId,
      taskId: current.taskId,
      attemptId: carrierId,
      workerId: FAKE_WORKER_ID,
      worktree: realpathSync(current.worktree),
    });

    const attempt = readJson(join(attemptDirectory(current, carrierId), "attempt.json")) as Record<string, unknown>;
    expect(attempt.correlation).toEqual({
      conversationId,
      turnId,
      actionId,
      sourceRef: taskActionSourceRef(conversationId, actionId),
    });
    expect(attempt.workerId).toBe(FAKE_WORKER_ID);
    expect(attempt.driver).toBe("ai-sdk-v7");
    expect(attempt.model).toBe(FAKE_MODEL);
    const input = readJson(join(attemptDirectory(current, carrierId), "cell-input.json")) as Record<string, unknown>;
    expect(input.workerId).toBe(FAKE_WORKER_ID);
    expect((input.executionProfile as Record<string, unknown>).id).toBe(FAKE_WORKER_ID);
    expect(receipt.evidenceRefs).toEqual([
      `state/task-attempts/${carrierId}/attempt.json`,
      `state/task-attempts/${carrierId}/cell-input.json`,
      `state/task-attempts/${carrierId}/cell-input.run.json`,
      `state/task-attempts/${carrierId}/settlement.json`,
    ]);

    await until(() => carrier!.liveness().state === "settled", "carrier terminal settlement");
    const settlement = carrier!.liveness();
    expect(settlement.state).toBe("settled");
    if (settlement.state !== "settled") throw new Error("expected settled");
    expect(settlement.settlement.status).toBe("recorded");
    expect(settlement.settlement.cellStatus).toBe("passed");
    expect(existsSync(leasePath(current))).toBe(false);
    const projections = showPrincipalTaskAttempts(current.home, current.taskId);
    expect(projections).toHaveLength(1);
    expect(projections[0]!.status).toBe("recorded");
    expect(projections[0]!.correlation).toEqual({
      conversationId,
      turnId,
      actionId,
      sourceRef: taskActionSourceRef(conversationId, actionId),
    });
  });

  test("duplicate delivery of the same committed action cannot spawn a second carrier", async () => {
    const current = fixture();
    const { registry, host, conversationId, turnId, actionId } = carrierParts(current);
    const operation = continueOperation(current);
    const receipt = host.executeOperation({ conversationId, turnId, actionId, operation });
    const carrierId = receipt.carrierId!;

    try {
      host.executeOperation({ conversationId, turnId, actionId, operation });
      throw new Error("expected the duplicate continue to be refused");
    } catch (error) {
      expect(error).toBeInstanceOf(ConversationOperationHostError);
      expect((error as ConversationOperationHostError).code).toBe("carrier-duplicate");
    }
    expect(readAttemptDirectories(current.home)).toHaveLength(1);
    await until(() =>
      registry.carrier(carrierId)!.liveness().state === "settled", "duplicate delivery settlement");
  });

  test("a second action for the same Task is refused by the exact Worktree lease while a carrier runs", async () => {
    const current = fixture();
    const { registry, host, conversationId, turnId, actionId } = carrierParts(current, slowDriver);
    const receipt = host.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });
    const carrierId = receipt.carrierId!;

    const second = { conversationId: randomUUID(), turnId: randomUUID(), actionId: randomUUID() };
    try {
      host.executeOperation({ ...second, operation: continueOperation(current) });
      throw new Error("expected the overlapping lease to be refused");
    } catch (error) {
      expect(error).toBeInstanceOf(ConversationOperationHostError);
      expect((error as ConversationOperationHostError).code).toBe("lease-conflict");
    }
    expect(readAttemptDirectories(current.home)).toEqual([carrierId]);
    registry.carrier(carrierId)!.stop({ conversationId, turnId, actionId });
    await until(() => registry.carrier(carrierId)!.liveness().state === "settled", "settlement");
  });

  test("stale Task/source/worker selectors fail visibly with no effect", () => {
    const current = fixture();
    const { host, conversationId, turnId, actionId } = carrierParts(current);
    for (const operation of [
      { ...continueOperation(current), expectedSourceRevision: current.sourceRevision + 1 },
      { ...continueOperation(current), expectedRevision: current.taskRevision + 1 },
      { ...continueOperation(current), taskId: randomUUID() },
      { ...continueOperation(current), workerId: "never-listed-worker" },
    ]) {
      try {
        host.executeOperation({ conversationId, turnId, actionId, operation });
        throw new Error(`expected ${JSON.stringify(operation)} to be refused`);
      } catch (error) {
        expect(error).toBeInstanceOf(ConversationOperationHostError);
      }
    }
    expect(readAttemptDirectories(current.home)).toHaveLength(0);
    expect(existsSync(leasePath(current))).toBe(false);
  });

  test("a dirty bound Worktree fails visibly with no effect", () => {
    const current = fixture();
    const { host, conversationId, turnId, actionId } = carrierParts(current);
    writeFileSync(join(current.worktree, "dirty.md"), "dirty\n");
    try {
      host.executeOperation({
        conversationId,
        turnId,
        actionId,
        operation: continueOperation(current),
      });
      throw new Error("expected the dirty worktree to be refused");
    } catch (error) {
      expect(error).toBeInstanceOf(ConversationOperationHostError);
      expect((error as ConversationOperationHostError).code).toBe("worktree-dirty");
    }
    expect(readAttemptDirectories(current.home)).toHaveLength(0);
    expect(existsSync(leasePath(current))).toBe(false);
  });

  test("a settled Task fails visibly with no effect", () => {
    const current = fixture();
    const { host, conversationId, turnId, actionId } = carrierParts(current);
    const settled = loadPrincipalTasks(current.home);
    settled.tasks = settled.tasks.map((task) => ({
      ...task,
      lifecycle: "settled" as const,
      nextActor: "none" as const,
      resultClaims: [{
        id: randomUUID(),
        submittedAt: new Date().toISOString(),
        summary: "fixture locally accepted result",
        evidenceRefs: ["state/tasks.json"],
        evidence: { kind: "agent-references-unverified" as const },
        sourceRef: "test:conversation-carrier",
        standing: "accepted" as const,
        reviews: [],
        resolution: {
          kind: "accepted" as const,
          at: new Date().toISOString(),
          sourceRef: "test:conversation-carrier",
          acceptanceBoundary: "workbench-local-task-only" as const,
          basis: "agent-claim" as const,
        },
      }],
    }));
    writeFileSync(join(current.home, "state", "tasks.json"), `${JSON.stringify(settled, null, 2)}\n`);
    try {
      host.executeOperation({
        conversationId,
        turnId,
        actionId,
        operation: continueOperation(current),
      });
      throw new Error("expected the settled task to be refused");
    } catch (error) {
      expect(error).toBeInstanceOf(ConversationOperationHostError);
      expect((error as ConversationOperationHostError).code).toBe("task-settled");
    }
    expect(readAttemptDirectories(current.home)).toHaveLength(0);
  });
});

describe("conversation execution carrier activity and terminal settlement", () => {
  test("owner-backed trace activity is attributable to the exact Task, attempt, action, and carrier", async () => {
    const current = fixture();
    const { registry, host, conversationId, turnId, actionId } = carrierParts(current, () => fastDriver(20));
    const receipt = host.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });
    const carrierId = receipt.carrierId!;
    const carrier = registry.startedCarrier(conversationId, actionId)!;
    const activity: string[] = [];
    carrier.onActivity((event) => activity.push(event.text));

    await until(() => activity.length >= 1, "carrier activity", 5_000);
    expect(activity.some((text) => text.includes("step=1"))).toBe(true);
    await until(() => carrier.liveness().state === "settled", "terminal settlement");
    const finalRecord = readJson(join(attemptDirectory(current, carrierId), "cell-input.run.json")) as Record<string, unknown>;
    expect(finalRecord.status).toBe("passed");
    expect((finalRecord.driver as Record<string, unknown>).model).toBe(FAKE_MODEL);
  });

  test("a failing worker settles runner-failed with retained terminal evidence", async () => {
    const current = fixture();
    const { registry, host, conversationId, turnId, actionId } = carrierParts(current, () => failingDriver());
    const receipt = host.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });
    const carrierId = receipt.carrierId!;
    const carrier = registry.startedCarrier(conversationId, actionId)!;
    await until(() => carrier.liveness().state === "settled", "failed settlement");
    const liveness = carrier.liveness();
    expect(liveness.state).toBe("settled");
    if (liveness.state !== "settled") throw new Error("expected settled");
    expect(liveness.settlement.status).toBe("runner-failed");
    expect(liveness.settlement.error).toContain("fake worker failed");
    expect(liveness.settlement.cellStatus).toBe("failed");
    const settlement = readJson(join(attemptDirectory(current, carrierId), "settlement.json")) as Record<string, unknown>;
    expect(settlement.status).toBe("runner-failed");
    expect(existsSync(leasePath(current))).toBe(false);
    const projections = showPrincipalTaskAttempts(current.home, current.taskId);
    expect(projections[0]!.status).toBe("runner-failed");
    expect(projections[0]!.cellStatus).toBe("failed");
  });
});

describe("conversation execution carrier stop", () => {
  test("work_control stop targets only the exact retained live carrier with a durable receipt and terminal settlement", async () => {
    const current = fixture();
    const { registry, host, conversationId, turnId, actionId } = carrierParts(current, slowDriver);
    const receipt = host.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });
    const carrierId = receipt.carrierId!;
    const carrier = registry.startedCarrier(conversationId, actionId)!;
    await until(() => carrier.liveness().state === "live", "live carrier");

    const control = {
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: { kind: "work_control" as const, carrierId: carrierId, control: "stop" as const },
    };
    const controlReceipt = host.executeOperation(control);
    expect(controlReceipt.taskId).toBe(current.taskId);
    expect(controlReceipt.evidenceRefs).toEqual([
      `state/task-attempts/${carrierId}/control.json`,
      `state/task-attempts/${carrierId}/settlement.json`,
    ]);

    await until(() => carrier.liveness().state === "settled", "control-stopped settlement");
    const liveness = carrier.liveness();
    expect(liveness.state).toBe("settled");
    if (liveness.state !== "settled") throw new Error("expected settled");
    expect(liveness.settlement.status).toBe("control-stopped");
    expect(liveness.settlement.cellStatus).toBe("cancelled");

    const controlFile = readJson(join(attemptDirectory(current, carrierId), "control.json")) as Record<string, unknown>;
    expect(controlFile.control).toBe("stop");
    expect(controlFile.carrierId).toBe(carrierId);
    expect(controlFile.sourceRef).toBe(taskActionSourceRef(control.conversationId, control.actionId));
    expect(controlFile.requestedBy).toEqual({
      conversationId: control.conversationId,
      turnId: control.turnId,
      actionId: control.actionId,
    });
    const settlement = readJson(join(attemptDirectory(current, carrierId), "settlement.json")) as Record<string, unknown>;
    expect(settlement.status).toBe("control-stopped");
    expect(settlement.controlRef).toBe(`state/task-attempts/${carrierId}/control.json`);
    const finalRecord = readJson(join(attemptDirectory(current, carrierId), "cell-input.run.json")) as Record<string, unknown>;
    expect(finalRecord.status).toBe("cancelled");
    expect(existsSync(leasePath(current))).toBe(false);

    const projections = showPrincipalTaskAttempts(current.home, current.taskId);
    expect(projections[0]!.status).toBe("control-stopped");
    expect(projections[0]!.cellStatus).toBe("cancelled");
  });

  test("pause, resume, and recover are not owned by an ordinary Task carrier", async () => {
    const current = fixture();
    const { registry, host, conversationId, turnId, actionId } = carrierParts(current, slowDriver);
    const receipt = host.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });
    const carrierId = receipt.carrierId!;
    for (const control of ["pause", "resume", "recover"] as const) {
      try {
        host.executeOperation({
          conversationId,
          turnId: randomUUID(),
          actionId: randomUUID(),
          operation: { kind: "work_control", carrierId: carrierId, control },
        });
        throw new Error(`expected ${control} to be unsupported`);
      } catch (error) {
        expect(error).toBeInstanceOf(ConversationOperationHostError);
        expect((error as ConversationOperationHostError).code).toBe("control-unsupported");
      }
    }
    registry.carrier(carrierId)!.stop({ conversationId, turnId, actionId });
    await until(() => registry.carrier(carrierId)!.liveness().state === "settled", "settlement");
  });

  test("stop of an already settled carrier is refused visibly", async () => {
    const current = fixture();
    const { registry, host, conversationId, turnId, actionId } = carrierParts(current, slowDriver);
    const receipt = host.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });
    const carrierId = receipt.carrierId!;
    const carrier = registry.startedCarrier(conversationId, actionId)!;
    host.executeOperation({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: { kind: "work_control", carrierId: carrierId, control: "stop" },
    });
    await until(() => carrier.liveness().state === "settled", "settlement after stop");
    try {
      host.executeOperation({
        conversationId,
        turnId: randomUUID(),
        actionId: randomUUID(),
        operation: { kind: "work_control", carrierId: carrierId, control: "stop" },
      });
      throw new Error("expected the second stop to be refused");
    } catch (error) {
      expect(error).toBeInstanceOf(ConversationOperationHostError);
      expect((error as ConversationOperationHostError).code).toBe("carrier-not-live");
    }
  });
});

describe("conversation execution carrier reconnect truthfulness", () => {
  test("a retained started attempt without a retained runtime handle projects liveness unknown, never live", async () => {
    const current = fixture();
    const first = carrierParts(current, slowDriver);
    const receipt = first.host.executeOperation({
      conversationId: first.conversationId,
      turnId: first.turnId,
      actionId: first.actionId,
      operation: continueOperation(current),
    });
    const carrierId = receipt.carrierId!;

    // A new registry instance models a server restart: no retained handle.
    const restarted = createConversationExecutionCarrierRegistry(current.home, {
      catalog: fakeCatalog(fakeCard(), slowDriver),
    });
    const projection = await createConversationContextProvider(current.home, {
      carrierRegistry: restarted,
    }).buildProjection(first.conversationId);
    expect(projection.carriers).toEqual([{ id: carrierId, state: "unknown" }]);

    // Without the exact retained handle, a stop cannot be verified.
    const hostAfterRestart = createConversationTaskOperationHost(current.home, { carrierRegistry: restarted });
    try {
      hostAfterRestart.executeOperation({
        conversationId: first.conversationId,
        turnId: randomUUID(),
        actionId: randomUUID(),
        operation: { kind: "work_control", carrierId: carrierId, control: "stop" },
      });
      throw new Error("expected the unretained carrier stop to be unverified");
    } catch (error) {
      expect(error).toBeInstanceOf(ConversationOperationHostError);
      expect((error as ConversationOperationHostError).code).toBe("carrier-unknown");
    }

    // The original runtime handle still claims live; attempt records alone never do.
    expect(first.registry.carrier(carrierId)!.liveness().state).toBe("live");

    // Once terminal evidence exists, a fresh registry projects that settlement.
    first.registry.carrier(carrierId)!.stop({
      conversationId: first.conversationId,
      turnId: first.turnId,
      actionId: first.actionId,
    });
    await until(() =>
      first.registry.carrier(carrierId)!.liveness().state === "settled", "settlement");
    const after = await createConversationContextProvider(current.home, {
      carrierRegistry: restarted,
    }).buildProjection(first.conversationId);
    expect(after.carriers).toEqual([{ id: carrierId, state: "control-stopped" }]);
  });
});

describe("conversation execution carrier reconciliation", () => {
  test("finds the committed continue by its causal source ref and never respawns it", async () => {
    const current = fixture();
    const { registry, host, conversationId, turnId, actionId } = carrierParts(current);
    const operation = continueOperation(current);
    const receipt = host.executeOperation({ conversationId, turnId, actionId, operation });
    const carrierId = receipt.carrierId!;

    const found = host.findCanonicalReceipt({ conversationId, actionId, operation });
    expect(found.standing).toBe("settled");
    if (found.standing !== "settled") throw new Error("expected settled");
    expect(found.receipt.taskId).toBe(current.taskId);
    expect(found.receipt.evidenceRefs).toEqual(receipt.evidenceRefs);
    expect(readAttemptDirectories(current.home)).toHaveLength(1);
    await until(() =>
      registry.carrier(carrierId)!.liveness().state === "settled", "continue receipt settlement");
  });

  test("reports provable absence for a continue action that never started", () => {
    const current = fixture();
    const { host, conversationId, actionId } = carrierParts(current);
    expect(host.findCanonicalReceipt({
      conversationId,
      actionId,
      operation: continueOperation(current),
    })).toEqual({ standing: "absent" });
  });

  test("finds the committed stop by its causal control receipt", async () => {
    const current = fixture();
    const { registry, host, conversationId, turnId, actionId } = carrierParts(current, slowDriver);
    const receipt = host.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });
    const carrierId = receipt.carrierId!;
    const control = {
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: { kind: "work_control" as const, carrierId: carrierId, control: "stop" as const },
    };
    host.executeOperation(control);
    await until(() =>
      registry.carrier(carrierId)!.liveness().state === "settled", "settlement");

    const found = host.findCanonicalReceipt({
      conversationId: control.conversationId,
      actionId: control.actionId,
      operation: control.operation,
    });
    expect(found.standing).toBe("settled");
    if (found.standing !== "settled") throw new Error("expected settled");
    expect(found.receipt.evidenceRefs).toEqual([
      `state/task-attempts/${carrierId}/control.json`,
      `state/task-attempts/${carrierId}/settlement.json`,
    ]);
  });

  test("reconciliation never respawns a carrier for an already committed action", async () => {
    const current = fixture();
    const { registry, host, conversationId, turnId, actionId } = carrierParts(current, slowDriver);
    const operation = continueOperation(current);
    const receipt = host.executeOperation({ conversationId, turnId, actionId, operation });
    const carrierId = receipt.carrierId!;

    // The transport-level reconcile path: settled receipt found, then a
    // guarded retry would still hit the exact (turnId, actionId) mapping.
    const found = host.findCanonicalReceipt({ conversationId, actionId, operation });
    expect(found.standing).toBe("settled");
    try {
      host.executeOperation({ conversationId, turnId, actionId, operation });
      throw new Error("expected the duplicate continue to be refused");
    } catch (error) {
      expect((error as ConversationOperationHostError).code).toBe("carrier-duplicate");
    }
    expect(readAttemptDirectories(current.home)).toHaveLength(1);
    registry.carrier(carrierId)!.stop({ conversationId, turnId, actionId });
    await until(() => registry.carrier(carrierId)!.liveness().state === "settled", "settlement");
  });
});

describe("conversation execution carrier exact selector revalidation", () => {
  test("refuses X→Y selector drift between the coordinator observation and the start effect", () => {
    for (const drift of ["project", "primary-head", "worktree-path", "worktree-head"] as const) {
      const current = fixture();
      const { registry, host, conversationId, turnId, actionId } = carrierParts(current);
      let operation = continueOperation(current);
      if (drift === "project") {
        operation = { ...operation, projectId: "other-registered-project" };
      } else if (drift === "primary-head") {
        writeFileSync(join(current.primary, "README.md"), "# drifted\n");
        git(current.primary, "add", "README.md");
        git(current.primary, "commit", "-m", "primary drift");
      } else if (drift === "worktree-path") {
        operation = { ...operation, worktreePath: join(current.root, "guessed-worktree") };
      } else {
        writeFileSync(join(current.worktree, "drift.md"), "drift\n");
        git(current.worktree, "add", "drift.md");
        git(current.worktree, "commit", "-m", "worktree drift");
      }
      try {
        host.executeOperation({ conversationId, turnId, actionId, operation });
        throw new Error(`expected ${drift} drift to be refused`);
      } catch (error) {
        expect(error).toBeInstanceOf(ConversationOperationHostError);
        expect((error as ConversationOperationHostError).code).toMatch(
          /stale-context|project-unresolved|worktree-unobserved/,
        );
      }
      expect(readAttemptDirectories(current.home)).toHaveLength(0);
      expect(registry.carriers()).toHaveLength(0);
      expect(existsSync(leasePath(current))).toBe(false);
    }
  });
});

describe("conversation execution carrier unresolved terminal evidence", () => {
  test("a settlement-write failure leaves the carrier unresolved without an invented receipt", async () => {
    const current = fixture();
    const { registry, host, conversationId, turnId, actionId } = carrierParts(
      current,
      () => spoilingSettlementDriver(current.home),
    );
    const receipt = host.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });
    const carrierId = receipt.carrierId!;
    const carrier = registry.startedCarrier(conversationId, actionId)!;
    await until(() => carrier.liveness().state !== "live", "unresolved terminal");

    const liveness = carrier.liveness();
    expect(liveness.state).toBe("unresolved");
    if (liveness.state !== "unresolved") throw new Error("expected unresolved");
    expect(liveness.settlement.status).toBe("unresolved");
    expect(liveness.settlement.error).toContain("terminal evidence retention failed");
    // No invented durable receipt and no lease release without a settlement.
    expect(readFileSync(join(attemptDirectory(current, carrierId), "settlement.json"), "utf8")).toBe("{}\n");
    expect(existsSync(leasePath(current))).toBe(true);
    expect(() => registry.controlCarrier({
      carrierId,
      control: "stop",
      actor: { conversationId, turnId, actionId },
    })).toThrow("is not live; stop has no effect");
  });

  test("a lease release failure keeps the carrier unresolved with the durable settlement retained", async () => {
    const current = fixture();
    const { registry, host, conversationId, turnId, actionId } = carrierParts(
      current,
      () => leaseSpoilingDriver(current),
    );
    const receipt = host.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });
    const carrierId = receipt.carrierId!;
    const carrier = registry.startedCarrier(conversationId, actionId)!;
    await until(() => carrier.liveness().state !== "live", "unresolved release");

    const liveness = carrier.liveness();
    expect(liveness.state).toBe("unresolved");
    if (liveness.state !== "unresolved") throw new Error("expected unresolved");
    expect(liveness.settlement.error).toContain("lease could not be released");
    const settlement = readJson(join(attemptDirectory(current, carrierId), "settlement.json")) as Record<string, unknown>;
    expect(settlement.status).toBe("recorded");
    expect(existsSync(leasePath(current))).toBe(true);
  });
});

describe("conversation execution carrier bounded runtime retention", () => {
  test("repeated terminal settles stay bounded: listeners cleared and payloads dropped", async () => {
    const current = fixture();
    const { registry, host, conversationId, turnId } = carrierParts(current);
    const started: Array<{ carrierId: string; actionId: string }> = [];
    for (let index = 0; index < 3; index += 1) {
      const actionId = randomUUID();
      const receipt = host.executeOperation({
        conversationId,
        turnId,
        actionId,
        operation: continueOperation(current),
      });
      started.push({ carrierId: receipt.carrierId!, actionId });
      await until(() =>
        registry.carrier(receipt.carrierId!)!.liveness().state === "settled", `settlement ${index}`);
    }
    expect(registry.carriers()).toHaveLength(3);
    for (const { carrierId, actionId } of started) {
      const carrier = registry.carrier(carrierId)!;
      expect(carrier.retention()).toEqual({
        activityListeners: 0,
        settledListeners: 0,
        retainedPayloads: 0,
      });
      // Post-terminal subscriptions are never retained.
      carrier.onActivity(() => {});
      const disposeSettled = carrier.onSettled(() => {});
      disposeSettled();
      expect(carrier.retention()).toEqual({
        activityListeners: 0,
        settledListeners: 0,
        retainedPayloads: 0,
      });
      // The minimal action→carrier index still resolves the exact handle.
      expect(registry.startedCarrier(conversationId, actionId)!.identity.carrierId).toBe(carrierId);
      expect(registry.startedCarrier(conversationId, actionId)!.liveness().state).toBe("settled");
    }
  });
});

describe("conversation execution carrier strict evidence standing", () => {
  test("invalid settlement evidence projects unknown and uninspectable, never settled", async () => {
    const current = fixture();
    const { registry, host, conversationId, turnId, actionId } = carrierParts(current);
    const operation = continueOperation(current);
    const receipt = host.executeOperation({ conversationId, turnId, actionId, operation });
    const carrierId = receipt.carrierId!;
    await until(() =>
      registry.carrier(carrierId)!.liveness().state === "settled", "settlement");
    writeFileSync(join(attemptDirectory(current, carrierId), "settlement.json"), "{not-json\n");

    expect(carrierStandingWithoutHandle(current.home, carrierId)).toEqual({ kind: "unknown" });
    const restarted = createConversationExecutionCarrierRegistry(current.home, {
      catalog: fakeCatalog(),
    });
    const projection = await createConversationContextProvider(current.home, {
      carrierRegistry: restarted,
    }).buildProjection(conversationId);
    expect(projection.carriers).toEqual([{ id: carrierId, state: "unknown" }]);

    const found = host.findCanonicalReceipt({ conversationId, actionId, operation });
    expect(found.standing).toBe("uninspectable");
  });

  test("a restart after a failed lease release keeps a valid settlement reconcile-required until exact release", async () => {
    const current = fixture();
    const { registry, host, conversationId, turnId, actionId } = carrierParts(
      current,
      () => leaseSpoilingDriver(current),
    );
    const receipt = host.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });
    const carrierId = receipt.carrierId!;
    await until(() => registry.carrier(carrierId)!.liveness().state !== "live", "release failure");

    // The valid settlement exists but the still-present exact lease means the
    // restart can never claim terminal standing.
    expect(readJson(join(attemptDirectory(current, carrierId), "settlement.json")))
      .toMatchObject({ status: "recorded" });
    const restarted = createConversationExecutionCarrierRegistry(current.home, {
      catalog: fakeCatalog(),
    });
    expect(carrierStandingWithoutHandle(current.home, carrierId)).toEqual({ kind: "unknown" });
    const projection = await createConversationContextProvider(current.home, {
      carrierRegistry: restarted,
    }).buildProjection(conversationId);
    expect(projection.carriers).toEqual([{ id: carrierId, state: "unknown" }]);

    const hostAfterRestart = createConversationTaskOperationHost(current.home, { carrierRegistry: restarted });
    try {
      hostAfterRestart.executeOperation({
        conversationId,
        turnId: randomUUID(),
        actionId: randomUUID(),
        operation: { kind: "work_control", carrierId, control: "stop" },
      });
      throw new Error("expected the unretained reconcile-required carrier to be unknown");
    } catch (error) {
      expect((error as ConversationOperationHostError).code).toBe("carrier-unknown");
    }

    // Once the exact dead-owner lease is reconciled, the same restart
    // projects the terminal settlement.
    writeExactLeaseBytes(current, current.taskId, carrierId, deadPid());
    const reconciled = reconcilePrincipalTaskAttempt(current.home, {
      id: current.taskId,
      attemptId: carrierId,
    });
    expect(reconciled.status).toBe("recorded");
    expect(carrierStandingWithoutHandle(current.home, carrierId)).toEqual({
      kind: "settled",
      status: "recorded",
    });
    const after = await createConversationContextProvider(current.home, {
      carrierRegistry: restarted,
    }).buildProjection(conversationId);
    expect(after.carriers).toEqual([{ id: carrierId, state: "recorded" }]);
  });

  test("a control receipt that fails a cross-link against its owning attempt is uninspectable, never settled", async () => {
    const current = fixture();
    const { registry, host, conversationId, turnId, actionId } = carrierParts(current, slowDriver);
    const receipt = host.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });
    const carrierId = receipt.carrierId!;
    const control = {
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: { kind: "work_control" as const, carrierId, control: "stop" as const },
    };
    host.executeOperation(control);
    await until(() => registry.carrier(carrierId)!.liveness().state === "settled", "settlement");

    const controlPath = join(attemptDirectory(current, carrierId), "control.json");
    const original = JSON.parse(readFileSync(controlPath, "utf8"));
    for (const tamper of [
      { workerId: "another-worker" },
      { taskId: randomUUID() },
      { carrierId: randomUUID() },
      { attemptRef: "state/task-attempts/another/attempt.json" },
      { settlementRef: "state/task-attempts/another/settlement.json" },
      { worktree: join(current.root, "another-worktree") },
      { requestedBy: { conversationId: randomUUID(), turnId: control.turnId, actionId: control.actionId } },
    ]) {
      writeFileSync(controlPath, `${JSON.stringify({ ...original, ...tamper }, null, 2)}\n`);
      const found = host.findCanonicalReceipt({
        conversationId: control.conversationId,
        actionId: control.actionId,
        operation: control.operation,
      });
      expect(found.standing).toBe("uninspectable");
    }
    writeFileSync(controlPath, `${JSON.stringify(original, null, 2)}\n`);
    const found = host.findCanonicalReceipt({
      conversationId: control.conversationId,
      actionId: control.actionId,
      operation: control.operation,
    });
    expect(found.standing).toBe("settled");
  });

  test("control reconciliation distinguishes provable absence from uninspectable evidence", async () => {
    const current = fixture();
    const { registry, host, conversationId, turnId, actionId } = carrierParts(current, slowDriver);
    const receipt = host.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });
    const carrierId = receipt.carrierId!;
    const control = {
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: { kind: "work_control" as const, carrierId, control: "stop" as const },
    };
    host.executeOperation(control);
    await until(() => registry.carrier(carrierId)!.liveness().state === "settled", "settlement");

    // No control record at all: provable absence, retryable.
    const otherCarrierId = randomUUID();
    const missing = host.findCanonicalReceipt({
      conversationId,
      actionId: randomUUID(),
      operation: { kind: "work_control", carrierId: otherCarrierId, control: "stop" },
    });
    expect(missing.standing).toBe("absent");

    // A different committed action's receipt: provable absence for this one.
    const controlPath = join(attemptDirectory(current, carrierId), "control.json");
    const original = JSON.parse(readFileSync(controlPath, "utf8"));
    const otherSourceRef = taskActionSourceRef(conversationId, randomUUID());
    writeFileSync(
      controlPath,
      `${JSON.stringify({
        ...original,
        sourceRef: otherSourceRef,
        requestedBy: { ...original.requestedBy, actionId: randomUUID() },
      }, null, 2)}\n`,
    );
    const differentAction = host.findCanonicalReceipt({
      conversationId: control.conversationId,
      actionId: control.actionId,
      operation: control.operation,
    });
    expect(differentAction.standing).toBe("absent");
    writeFileSync(controlPath, `${JSON.stringify(original, null, 2)}\n`);

    // Matching sourceRef but unreadable record: uninspectable, not retryable.
    writeFileSync(controlPath, "{not-json\n");
    const garbage = host.findCanonicalReceipt({
      conversationId: control.conversationId,
      actionId: control.actionId,
      operation: control.operation,
    });
    expect(garbage.standing).toBe("uninspectable");
    writeFileSync(controlPath, `${JSON.stringify(original, null, 2)}\n`);

    // Matching sourceRef with invalid owning-attempt evidence: uninspectable.
    writeFileSync(join(attemptDirectory(current, carrierId), "settlement.json"), "{not-json\n");
    const invalidEvidence = host.findCanonicalReceipt({
      conversationId: control.conversationId,
      actionId: control.actionId,
      operation: control.operation,
    });
    expect(invalidEvidence.standing).toBe("uninspectable");
  });

  test("a final record whose embedded input differs from the immutable CellInput makes standing unknown, never settled", async () => {
    const current = fixture();
    const { registry, host, conversationId, turnId, actionId } = carrierParts(current);
    const receipt = host.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });
    const carrierId = receipt.carrierId!;
    await until(() => registry.carrier(carrierId)!.liveness().state === "settled", "settlement");

    const finalPath = join(attemptDirectory(current, carrierId), "cell-input.run.json");
    const record = JSON.parse(readFileSync(finalPath, "utf8"));
    writeFileSync(
      finalPath,
      `${JSON.stringify({ ...record, input: { ...record.input, intent: "forged" } }, null, 2)}\n`,
    );

    expect(carrierStandingWithoutHandle(current.home, carrierId)).toEqual({ kind: "unknown" });
    const restarted = createConversationExecutionCarrierRegistry(current.home, {
      catalog: fakeCatalog(),
    });
    const projection = await createConversationContextProvider(current.home, {
      carrierRegistry: restarted,
    }).buildProjection(conversationId);
    expect(projection.carriers).toEqual([{ id: carrierId, state: "unknown" }]);
  });

  test("a final record whose driver adapter differs from the attempt execution form is invalid", async () => {
    const current = fixture();
    const { registry, host, conversationId, turnId, actionId } = carrierParts(current);
    const receipt = host.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });
    const carrierId = receipt.carrierId!;
    await until(() => registry.carrier(carrierId)!.liveness().state === "settled", "settlement");

    const finalPath = join(attemptDirectory(current, carrierId), "cell-input.run.json");
    const record = JSON.parse(readFileSync(finalPath, "utf8"));
    writeFileSync(
      finalPath,
      `${JSON.stringify({ ...record, driver: { ...record.driver, adapter: "opencode-cli.v1" } }, null, 2)}\n`,
    );

    expect(carrierStandingWithoutHandle(current.home, carrierId)).toEqual({ kind: "unknown" });
    const restarted = createConversationExecutionCarrierRegistry(current.home, {
      catalog: fakeCatalog(),
    });
    const projection = await createConversationContextProvider(current.home, {
      carrierRegistry: restarted,
    }).buildProjection(conversationId);
    expect(projection.carriers).toEqual([{ id: carrierId, state: "unknown" }]);
  });
});

/** A driver that spoils the settlement path so the carrier's settlement write fails. */
function spoilingSettlementDriver(home: string, createDriver: () => CellDriver = fastDriver): CellDriver {
  return {
    descriptor: fakeDescriptor(),
    async run(input, context) {
      const result = await createDriver().run(input, context);
      const marker = "-attempt-";
      const attemptId = input.id.slice(input.id.lastIndexOf(marker) + marker.length);
      writeFileSync(join(home, "state", "task-attempts", attemptId, "settlement.json"), "{}\n");
      return result;
    },
  };
}

/** A driver that changes the exact lease bytes before the carrier releases them. */
function leaseSpoilingDriver(fixture_: Fixture, createDriver: () => CellDriver = fastDriver): CellDriver {
  return {
    descriptor: fakeDescriptor(),
    async run(input, context) {
      const result = await createDriver().run(input, context);
      const lease = leasePath(fixture_);
      const bytes = JSON.parse(readFileSync(lease, "utf8"));
      writeFileSync(lease, `${JSON.stringify({ ...bytes, changed: true }, null, 2)}\n`);
      return result;
    },
  };
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

describe("conversation context projection", () => {
  test("projects bounded worker catalog cards with exact identities", async () => {
    const current = fixture();
    const provider = createConversationContextProvider(current.home, {});
    const projection = await provider.buildProjection(randomUUID());
    const workers = projection.workers ?? [];
    expect(workers.length).toBeGreaterThan(0);
    const deepseek = workers.find((worker) => worker.id === "deepseek-flash");
    expect(deepseek).toBeDefined();
    expect(deepseek!.model).toBe("deepseek-v4-flash");
    expect(deepseek!.provider).toBe("deepseek");
    expect(["available", "unavailable"]).toContain(deepseek!.availability);
  });

  test("projects live, unknown, and terminal carrier states from the exact retained runtime and durable evidence", async () => {
    const current = fixture();
    const { registry, conversationId, turnId, actionId } = carrierParts(current, slowDriver);
    const host = createConversationTaskOperationHost(current.home, { carrierRegistry: registry });
    const receipt = host.executeOperation({
      conversationId,
      turnId,
      actionId,
      operation: continueOperation(current),
    });
    const carrierId = receipt.carrierId!;

    const provider = createConversationContextProvider(current.home, { carrierRegistry: registry });
    const live = await provider.buildProjection(conversationId);
    expect(live.carriers).toEqual([
      { id: carrierId, state: "live", runId: expect.any(String) },
    ]);
    // A different conversation never sees this carrier.
    expect(await provider.buildProjection(randomUUID())).not.toHaveProperty("carriers");

    registry.carrier(carrierId)!.stop({ conversationId, turnId, actionId });
    await until(() => registry.carrier(carrierId)!.liveness().state === "settled", "settlement");
    const terminal = await provider.buildProjection(conversationId);
    expect(terminal.carriers).toEqual([{ id: carrierId, state: "control-stopped" }]);
  });
});
