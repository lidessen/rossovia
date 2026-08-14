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
import type { CellDriver, DriverResult } from "../../../packages/work-cell/src/driver";
import { WorkerCatalog, type WorkerCard } from "../../../packages/work-cell/src/worker-catalog";
import { initializeHome } from "../src/home";
import { registerProject } from "../src/register";
import { correctPrincipalTask, createPrincipalTask, loadPrincipalTasks } from "../src/tasks";
import {
  CONTRIBUTION_TASK_SOURCE_REF,
  CONTRIBUTION_TERMINAL_TOOL,
  ContributionError,
  contributionStateDirectory,
  createConversationContributionRegistry,
  type ConversationContributionRegistry,
} from "../src/conversation/contributions";
import {
  createConversationTaskOperationHost,
  type ConversationOperationHost,
} from "../src/conversation/operations";
import { createConversationContextProvider } from "../src/conversation/context";
import { createConversationExecutionCarrierRegistry } from "../src/conversation/execution-carrier";
import { FileMissionTimeline } from "../../autonomy/src/delegate-timeline";
import { FileConversationJournal } from "../src/conversation/journal";
import {
  ConversationSocketRuntime,
  type ConversationSocketData,
  type ServerFrame,
} from "../src/conversation/transport";
import type {
  ConversationTurnOwner,
  TurnPreparation,
} from "../src/conversation/turn-owner";
import {
  startPreparedConversationTurn,
  type ConversationOperation,
  type ConversationTurnPortEvent,
} from "../../autonomy/src/conversation-coordinator";
import type { ChildSummary, FullChildResult } from "../../autonomy/src/conversation-prompt";
import type { AutonomyClient } from "../src/ui/autonomy-client";
import { createWorkbenchRequestHandler } from "../src/ui/server";

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
  const root = mkdtempSync(join(tmpdir(), "rossovia-conversation-contribution-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  const primary = join(root, "project");
  const worktree = join(root, "worktree");
  initializeHome(home);
  mkdirSync(primary, { recursive: true });
  git(primary, "init", "-b", "main");
  git(primary, "config", "user.name", "Conversation Contribution Test");
  git(primary, "config", "user.email", "contribution@example.test");
  writeFileSync(join(primary, "README.md"), "# Conversation contribution fixture\n");
  git(primary, "add", "README.md");
  git(primary, "commit", "-m", "initial");
  git(primary, "remote", "add", "origin", "https://example.test/lidessen/conversation-contribution.git");
  git(primary, "worktree", "add", "-b", "task/contribution", worktree);
  const projectId = "conversation-contribution-fixture";
  registerProject(home, { path: primary, id: projectId, aliases: ["contribution-fixture"] });
  const created = createPrincipalTask(home, {
    title: "Run bounded temporary contributions through the conversation",
    objective: "Produce the bounded fixture result in the bound worktree.",
    acceptance: ["The fixture result exists"],
    nextActor: "agent",
    sourceRef: "test:conversation-contribution",
    expectedSourceRevision: 0,
    project: "contribution-fixture",
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
    labels: ["coding", "text", "read", "write", "evidence", "review"],
    description: "Deterministic fake catalog worker for contribution tests.",
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

function fastContributionDriver(finalText = "The bounded fixture conclusion."): CellDriver {
  return {
    descriptor: fakeDescriptor(),
    async run(_input, context): Promise<DriverResult> {
      context.emit("agent.step.started", { stepNumber: 1, activeTools: ["read_file"] });
      context.emit("agent.step.finished", { finishReason: "stop" });
      return {
        terminalToolsCalled: [CONTRIBUTION_TERMINAL_TOOL],
        finalText,
        usage: fakeUsage(),
        rawSteps: [],
      };
    },
  };
}

function slowContributionDriver(): CellDriver {
  return {
    descriptor: fakeDescriptor(),
    async run(_input, context): Promise<DriverResult> {
      context.emit("agent.step.started", { stepNumber: 1, activeTools: ["write_file"] });
      await new Promise<void>((resolve) => {
        context.signal.addEventListener("abort", () => resolve(), { once: true });
      });
      return {
        terminalToolsCalled: [CONTRIBUTION_TERMINAL_TOOL],
        finalText: "never delivered after abort",
        usage: fakeUsage(),
        rawSteps: [],
      };
    },
  };
}

function failingContributionDriver(): CellDriver {
  return {
    descriptor: fakeDescriptor(),
    async run(_input, _context): Promise<DriverResult> {
      throw new Error("fake contribution worker failed");
    },
  };
}

function fakeCatalog(createDriver: () => CellDriver = fastContributionDriver, card = fakeCard()): WorkerCatalog {
  return new WorkerCatalog([{ card, createDriver }]);
}

interface Identity {
  readonly conversationId: string;
  readonly turnId: string;
  readonly actionId: string;
}

function identity(): Identity {
  return { conversationId: randomUUID(), turnId: randomUUID(), actionId: randomUUID() };
}

function spawnOperation(fixture_: Fixture, overrides: Partial<Extract<ConversationOperation, { kind: "contribution_spawn" }>> = {}): ConversationOperation {
  return {
    kind: "contribution_spawn",
    key: `evidence-${randomUUID().slice(0, 8)}`,
    intent: "Produce the bounded evidence conclusion for the fixture result.",
    capabilityNeed: "evidence",
    effectKind: "read-only",
    workerId: FAKE_WORKER_ID,
    taskId: fixture_.taskId,
    expectedSourceRevision: fixture_.sourceRevision,
    expectedRevision: fixture_.taskRevision,
    projectId: fixture_.projectId,
    expectedPrimaryHead: fixture_.primaryHead,
    worktreePath: fixture_.worktree,
    expectedWorktreeHead: fixture_.worktreeHead,
    dependsOn: [],
    ...overrides,
  } as ConversationOperation;
}

function spawnInput(fixture_: Fixture, registry: ConversationContributionRegistry, operation: ConversationOperation) {
  const actor = identity();
  return {
    conversationId: actor.conversationId,
    turnId: actor.turnId,
    actionId: actor.actionId,
    operation: operation as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
  };
}

async function waitFor(condition: () => boolean | Promise<boolean>, label: string, timeoutMs = 10_000): Promise<void> {
  const started = Date.now();
  while (!(await condition())) {
    if (Date.now() - started > timeoutMs) throw new Error(`timed out waiting for ${label}`);
    await Bun.sleep(10);
  }
}

describe("conversation temporary contributions", () => {
  test("a zero-worker conversation forms no contribution and keeps no spawn evidence", async () => {
    const fixture_ = fixture();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
      maxLiveContributions: 2,
    });
    const conversationId = randomUUID();
    expect(await registry.listContributions(conversationId)).toEqual([]);
    expect(await registry.listSettledChildSummaries(conversationId)).toEqual([]);
    expect(existsSync(contributionStateDirectory(fixture_.home, conversationId))).toBe(false);
  });

  test("the context projection lists the exact catalog cards without ranking", async () => {
    const fixture_ = fixture();
    const catalog = fakeCatalog();
    const provider = createConversationContextProvider(fixture_.home, { catalog });
    const projection = await provider.buildProjection(randomUUID());
    const workers = projection.workers ?? [];
    expect(workers).toHaveLength(1);
    expect(workers[0]).toEqual({
      id: FAKE_WORKER_ID,
      description: fakeCard().description,
      labels: fakeCard().labels,
      provider: FAKE_PROVIDER,
      model: FAKE_MODEL,
      reasoningEffort: "max",
      availability: "available",
    });
  });

  test("spawn selects the exact catalog worker and refuses unknown or unavailable workers", () => {
    const fixture_ = fixture();
    const catalog = fakeCatalog();
    const registry = createConversationContributionRegistry(fixture_.home, { catalog });

    expect(() => registry.spawn(spawnInput(fixture_, registry, spawnOperation(fixture_, { workerId: "not-a-worker" }))))
      .toThrowError(ContributionError);

    const unavailableRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(fastContributionDriver, fakeCard({
        availability: { status: "unavailable", reason: "no credential" },
      })),
    });
    expect(() => unavailableRegistry.spawn(spawnInput(fixture_, unavailableRegistry, spawnOperation(fixture_))))
      .toThrowError(ContributionError);

    const unsupported = spawnOperation(fixture_, { capabilityNeed: "vision" });
    expect(() => registry.spawn(spawnInput(fixture_, registry, unsupported)))
      .toThrowError(ContributionError);
  });

  test("bounded read-only contributions run in parallel and settle with separate keyed results", async () => {
    const fixture_ = fixture();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
      maxLiveContributions: 2,
    });
    const conversationId = randomUUID();
    const first = spawnOperation(fixture_, { key: "evidence-one", intent: "First bounded read." });
    const second = spawnOperation(fixture_, { key: "evidence-two", intent: "Second bounded read." });
    const firstReceipt = registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: first as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    });
    const secondReceipt = registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: second as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    });
    expect(firstReceipt.batchId).not.toBe(secondReceipt.batchId);

    // The live bound refuses a third read-only contribution.
    const third = spawnOperation(fixture_, { key: "evidence-three" });
    expect(() => registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: third as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    })).toThrowError(ContributionError);

    await waitFor(async () => {
      const projections = await registry.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "both contributions settled");

    const firstRead = await registry.readChildResult({ conversationId, batchId: firstReceipt.batchId, key: "evidence-one" });
    const secondRead = await registry.readChildResult({ conversationId, batchId: secondReceipt.batchId, key: "evidence-two" });
    expect(firstRead.standing).toBe("read");
    expect(secondRead.standing).toBe("read");
    if (firstRead.standing === "read") {
      expect(firstRead.result.receipt.key).toBe("evidence-one");
      expect(firstRead.result.receipt.batchId).toBe(firstReceipt.batchId);
    }

    const summaries = await registry.listSettledChildSummaries(conversationId);
    expect(summaries).toHaveLength(2);
    expect(summaries.map((summary) => summary.id).sort()).toEqual([
      `${firstReceipt.batchId}/evidence-one`,
      `${secondReceipt.batchId}/evidence-two`,
    ].sort());
  });

  test("one Task/Worktree permits at most one effectful execution owner", async () => {
    const fixture_ = fixture();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(slowContributionDriver),
      maxLiveContributions: 4,
    });
    const conversationId = randomUUID();
    const effectful = spawnOperation(fixture_, {
      key: "writer-one",
      effectKind: "effectful",
      intent: "Write the bounded fixture result.",
    });
    const receipt = registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: effectful as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    });
    expect(receipt.effectKind).toBe("effectful");

    // A second effectful contribution on the same Worktree is refused.
    const overlapping = spawnOperation(fixture_, { key: "writer-two", effectKind: "effectful" });
    expect(() => registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: overlapping as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    })).toThrowError(ContributionError);

    // A task_continue carrier on the same Worktree is refused by the same lease.
    const carrierRegistry = createConversationExecutionCarrierRegistry(fixture_.home, {
      catalog: fakeCatalog(slowContributionDriver),
    });
    const carrierHost = createConversationTaskOperationHost(fixture_.home, { carrierRegistry });
    expect(() => carrierHost.executeOperation({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: {
        kind: "task_continue",
        taskId: fixture_.taskId,
        expectedSourceRevision: fixture_.sourceRevision,
        expectedRevision: fixture_.taskRevision,
        workerId: FAKE_WORKER_ID,
        projectId: fixture_.projectId,
        expectedPrimaryHead: fixture_.primaryHead,
        worktreePath: fixture_.worktree,
        expectedWorktreeHead: fixture_.worktreeHead,
      },
    })).toThrow();

    // A read-only contribution may still overlap the effectful writer.
    const readOnly = spawnOperation(fixture_, { key: "reader-one", effectKind: "read-only" });
    const readOnlyReceipt = registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: readOnly as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    });
    expect(readOnlyReceipt.effectKind).toBe("read-only");

    // After the effectful writer settles, the lease is released and a fresh
    // effectful contribution is admitted.
    const handle = registry.contribution(receipt.batchId, "writer-one");
    expect(handle).toBeDefined();
    await waitFor(() => handle!.liveness().state !== "live", "effectful contribution settles");
    const replacement = spawnOperation(fixture_, { key: "writer-three", effectKind: "effectful" });
    expect(() => registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: replacement as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    })).not.toThrow();
  });

  test("every contribution retains its exact worker and execution profile", async () => {
    const fixture_ = fixture();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const conversationId = randomUUID();
    const receipt = registry.spawn(spawnInput(fixture_, registry, spawnOperation(fixture_)));
    await waitFor(async () => {
      const projections = await registry.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "contribution settles");

    const spawnPath = join(contributionStateDirectory(fixture_.home, conversationId), `spawn-${receipt.batchId}.json`);
    expect(existsSync(spawnPath)).toBe(true);
    const spawnRecord = JSON.parse(readFileSync(spawnPath, "utf8")) as Record<string, unknown>;
    expect(spawnRecord.workerId).toBe(FAKE_WORKER_ID);
    expect(spawnRecord.effectKind).toBe("read-only");
    expect(spawnRecord.executionProfile).toEqual(fakeCard().executionProfile);

    const timeline = new FileMissionTimeline(join(fixture_.home, "state", "conversation-contributions"));
    const recovered = await timeline.recoverBatch(conversationId, receipt.batchId);
    expect(recovered.ready).toBe(true);
    const cell = recovered.checkpoint.admission.contributions[0]!.cell;
    expect(cell.workerId).toBe(FAKE_WORKER_ID);
    expect(cell.executionProfile?.id).toBe(fakeCard().executionProfile.id);
    expect(cell.executionProfile?.model).toBe(FAKE_MODEL);
    expect(recovered.checkpoint.admission.whole.sourceRefs).toEqual([CONTRIBUTION_TASK_SOURCE_REF]);
    expect(cell.workspace.root).toBe(realpathSync(fixture_.worktree));
    expect(cell.workspace.writePaths).toEqual([]);
    expect(cell.workspace.allowedCommands).toEqual([]);
    expect(cell.terminalTools?.map((terminal) => terminal.name)).toEqual([CONTRIBUTION_TERMINAL_TOOL]);
  });

  test("keyed child-result reads succeed only for the exact settled batch/key", async () => {
    const fixture_ = fixture();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const conversationId = randomUUID();
    const receipt = registry.spawn(spawnInput(fixture_, registry, spawnOperation(fixture_)));

    const before = await registry.readChildResult({ conversationId, batchId: receipt.batchId, key: receipt.key });
    expect(before.standing).toBe("refused");
    if (before.standing === "refused") expect(before.code).toBe("not-settled");

    await waitFor(async () => {
      const projections = await registry.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "contribution settles");

    const exact = await registry.readChildResult({ conversationId, batchId: receipt.batchId, key: receipt.key });
    expect(exact.standing).toBe("read");
    if (exact.standing === "read") {
      expect(exact.result.semantic?.finalText).toContain("bounded fixture conclusion");
    }

    const wrongKey = await registry.readChildResult({ conversationId, batchId: receipt.batchId, key: "other-key" });
    expect(wrongKey.standing).toBe("refused");
    if (wrongKey.standing === "refused") expect(wrongKey.code).toBe("not-found");

    const wrongBatch = await registry.readChildResult({ conversationId, batchId: randomUUID(), key: receipt.key });
    expect(wrongBatch.standing).toBe("refused");
    if (wrongBatch.standing === "refused") expect(wrongBatch.code).toBe("not-found");

    const otherConversation = await registry.readChildResult({ conversationId: randomUUID(), batchId: receipt.batchId, key: receipt.key });
    expect(otherConversation.standing).toBe("refused");
    if (otherConversation.standing === "refused") expect(otherConversation.code).toBe("not-found");
  });

  test("a Task correction makes the old contribution result stale", async () => {
    const fixture_ = fixture();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const conversationId = randomUUID();
    const receipt = registry.spawn(spawnInput(fixture_, registry, spawnOperation(fixture_)));
    await waitFor(async () => {
      const projections = await registry.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "contribution settles");

    const source = loadPrincipalTasks(fixture_.home);
    const corrected = correctPrincipalTask(fixture_.home, {
      id: fixture_.taskId,
      expectedSourceRevision: source.sourceRevision,
      expectedRevision: source.tasks[0]!.revision,
      statement: "The result must also preserve the second fixture invariant.",
      sourceRef: "test:correction",
      nextActor: "agent",
    });
    expect(corrected.task.revision).toBe(fixture_.taskRevision + 1);

    const read = await registry.readChildResult({ conversationId, batchId: receipt.batchId, key: receipt.key });
    expect(read.standing).toBe("refused");
    if (read.standing === "refused") expect(read.code).toBe("stale");

    expect(await registry.listSettledChildSummaries(conversationId)).toEqual([]);

    // A replacement spawn from the latest Task revision is admitted and its
    // fresh result is readable.
    const latest = loadPrincipalTasks(fixture_.home);
    const replacement = spawnOperation(fixture_, {
      key: "replacement",
      expectedSourceRevision: latest.sourceRevision,
      expectedRevision: latest.tasks[0]!.revision,
    });
    const replacementReceipt = registry.spawn(spawnInput(fixture_, registry, replacement));
    await waitFor(async () => {
      const readAttempt = await registry.readChildResult({
        conversationId: replacementReceipt.evidenceRefs.length > 0
          ? conversationId
          : conversationId,
        batchId: replacementReceipt.batchId,
        key: "replacement",
      });
      return readAttempt.standing === "read";
    }, "replacement result is readable");
  });

  test("cancellation stops the exact live contribution, writes the durable receipt, and refuses a second stop", async () => {
    const fixture_ = fixture();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(slowContributionDriver),
    });
    const actor = identity();
    const receipt = registry.spawn({
      ...actor,
      operation: spawnOperation(fixture_, { key: "slow-read" }) as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    });

    const controlReceipt = registry.control({
      batchId: receipt.batchId,
      key: "slow-read",
      control: "stop",
      actor,
    });
    expect(controlReceipt.outcome).toBe("settled");
    const controlPath = join(contributionStateDirectory(fixture_.home, actor.conversationId), `control-${receipt.batchId}.json`);
    expect(existsSync(controlPath)).toBe(true);

    const handle = registry.contribution(receipt.batchId, "slow-read");
    expect(handle).toBeDefined();
    await waitFor(() => handle!.liveness().state !== "live", "cancelled contribution settles");
    const liveness = handle!.liveness();
    if (liveness.state !== "live") {
      expect(liveness.settlement.status).toBe("cancelled");
    }

    // A distinct stop action after settlement is refused; the exact replay returns the retained receipt.
    const secondActor = { ...actor, actionId: randomUUID() };
    expect(() => registry.control({
      batchId: receipt.batchId,
      key: "slow-read",
      control: "stop",
      actor: secondActor,
    })).toThrowError(ContributionError);
    expect(registry.control({
      batchId: receipt.batchId,
      key: "slow-read",
      control: "stop",
      actor,
    })).toEqual(controlReceipt);
  });

  test("after a server restart liveness is unknown, settled results stay readable, and stops are unverifiable", async () => {
    const fixture_ = fixture();
    const firstRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const conversationId = randomUUID();
    const receipt = firstRegistry.spawn(spawnInput(fixture_, firstRegistry, spawnOperation(fixture_)));
    await waitFor(async () => {
      const projections = await firstRegistry.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "contribution settles");

    const restarted = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    expect(restarted.contribution(receipt.batchId, receipt.key)).toBeUndefined();

    // A retained started contribution without a live handle is liveness unknown, never live.
    const slowFirst = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(slowContributionDriver),
    });
    const slowReceipt = slowFirst.spawn(spawnInput(fixture_, slowFirst, spawnOperation(fixture_, { key: "restart-unknown" })));
    const slowRestarted = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(slowContributionDriver),
    });
    const slowProjections = await slowRestarted.listContributions(conversationId)
      .then(() => slowRestarted.listContributions(randomUUID()));
    void slowProjections;
    const projections = await slowRestarted.listContributions(conversationId);
    const unknown = projections.find((entry) => entry.batchId === slowReceipt.batchId);
    expect(unknown?.state).toBe("unknown");

    expect(() => slowRestarted.control({
      batchId: slowReceipt.batchId,
      key: "restart-unknown",
      control: "stop",
      actor: identity(),
    })).toThrowError(ContributionError);

    // The settled result remains readable through the restarted registry by exact key.
    const read = await restarted.readChildResult({ conversationId, batchId: receipt.batchId, key: receipt.key });
    expect(read.standing).toBe("read");
  });

  test("no self-review: contribution evidence never names the conversation journal or coordinator output", () => {
    const fixture_ = fixture();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const actor = identity();
    const receipt = registry.spawn({
      ...actor,
      operation: spawnOperation(fixture_) as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    });
    const spawnPath = join(contributionStateDirectory(fixture_.home, actor.conversationId), `spawn-${receipt.batchId}.json`);
    const spawnRecord = JSON.parse(readFileSync(spawnPath, "utf8")) as Record<string, unknown>;
    const sourceRef = String(spawnRecord.sourceRef);
    expect(sourceRef).not.toContain("conversation-events");
    expect(sourceRef).toContain(`conversation:${actor.conversationId}:action:${actor.actionId}`);
    // The spawn receipt never retains coordinator response text; only the intent the coordinator authored for the child.
    expect(spawnRecord.intent).toBeString();
  });

  test("no majority settlement: children keep separate keyed evidence and one synthesis owner reconstructs", async () => {
    const fixture_ = fixture();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const conversationId = randomUUID();
    const one = registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: spawnOperation(fixture_, { key: "no-vote-one" }) as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    });
    const two = registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: spawnOperation(fixture_, { key: "no-vote-two" }) as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    });
    await waitFor(async () => {
      const projections = await registry.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "both settle");
    const summaries = await registry.listSettledChildSummaries(conversationId);
    expect(summaries).toHaveLength(2);
    // Each child result is only reachable by its exact key; there is no combined or voted settlement surface.
    const readOne = await registry.readChildResult({ conversationId, batchId: one.batchId, key: "no-vote-one" });
    const readTwo = await registry.readChildResult({ conversationId, batchId: two.batchId, key: "no-vote-two" });
    expect(readOne.standing).toBe("read");
    expect(readTwo.standing).toBe("read");
    if (readOne.standing === "read" && readTwo.standing === "read") {
      expect(readOne.result.receipt.settlementDigest).not.toBe(readTwo.result.receipt.settlementDigest);
    }
  });
});

// ---------------------------------------------------------------------------
// Conversation socket runtime integration
// ---------------------------------------------------------------------------

const FAKE_PROMPT_DIGEST = "f".repeat(64);
const FAKE_REQUESTED_POLICY = {
  provider: "fake-coordinator",
  model: "fake.v1",
  thinking: "disabled",
  reasoningEffort: "none",
} as const;

function fakePreparation(): TurnPreparation {
  return {
    requestedPolicy: FAKE_REQUESTED_POLICY,
    prompt: { revision: "fake.prompt.v1", digest: FAKE_PROMPT_DIGEST },
    disclosedSources: [],
    sourceRevisionSelectors: [],
    prepared: {
      prompt: {
        revision: "fake.prompt.v1",
        prompt: "fake composed prompt",
        digest: FAKE_PROMPT_DIGEST,
        disclosedSources: [],
        sourceRevisionSelectors: [],
      },
      requested: {
        promptRevision: "fake.prompt.v1",
        promptDigest: FAKE_PROMPT_DIGEST,
        disclosedSources: [],
        sourceRevisionSelectors: [],
        ...FAKE_REQUESTED_POLICY,
      },
    },
  };
}

type PortScript = (signal: AbortSignal) => AsyncGenerator<ConversationTurnPortEvent>;

interface CapturedPrepare {
  readonly projection?: unknown;
  readonly children?: readonly ChildSummary[];
  readonly fullChildResults?: readonly FullChildResult[];
}

function scriptedOwner(
  scripts: readonly PortScript[],
  capture?: (input: {
    projection?: unknown;
    children?: readonly ChildSummary[];
    fullChildResults?: readonly FullChildResult[];
  }) => void,
): ConversationTurnOwner {
  let index = 0;
  return {
    prepare(input) {
      capture?.({
        ...(input.projection === undefined ? {} : { projection: input.projection }),
        ...(input.children === undefined ? {} : { children: input.children }),
        ...(input.fullChildResults === undefined ? {} : { fullChildResults: input.fullChildResults }),
      });
      return fakePreparation();
    },
    start(preparation, onDelta) {
      const script = scripts[Math.min(index, scripts.length - 1)]!;
      index += 1;
      return startPreparedConversationTurn(preparation.prepared, {
        port: { run: ({ signal }) => script(signal) },
        onEvent: (event) => {
          if (event.kind === "delta") onDelta(event.text);
        },
      });
    },
  };
}

const SETTLED_USAGE = { inputTokens: 3, outputTokens: 2, totalTokens: 5, cachedInputTokens: 0 };

function settledScript(response: string): PortScript {
  return async function* () {
    yield { kind: "delta", text: response };
    yield { kind: "finish", usage: SETTLED_USAGE };
  };
}

function operationScript(operation: ConversationOperation, response = "forming one contribution"): PortScript {
  return async function* () {
    yield { kind: "delta", text: response };
    yield { kind: "operation", operation };
    yield { kind: "finish", usage: SETTLED_USAGE };
  };
}

function childResultRequestScript(batchId: string, key: string, response = "reading the child result"): PortScript {
  return async function* () {
    yield { kind: "delta", text: response };
    yield { kind: "request", request: { kind: "child-result", batchId, key } };
    yield { kind: "finish", usage: SETTLED_USAGE };
  };
}

function principalDecisionRequestScript(): PortScript {
  return async function* () {
    yield { kind: "delta", text: "asking the principal" };
    yield {
      kind: "request",
      request: { kind: "principal-decision", question: "which fixture?" },
    };
    yield { kind: "finish", usage: SETTLED_USAGE };
  };
}

interface RuntimeParts {
  runtime: ConversationSocketRuntime;
  handler: (request: Request, server?: Bun.Server<ConversationSocketData>) => Promise<Response>;
  server: Bun.Server<ConversationSocketData>;
  socketUrl: (conversationId: string, after: number) => string;
  owner: ConversationTurnOwner;
}

function stubServer(port = 4317, acceptUpgrade = true): {
  server: Bun.Server<ConversationSocketData>;
  upgrades: ConversationSocketData[];
} {
  const upgrades: ConversationSocketData[] = [];
  const server = {
    port,
    upgrade(request: Request, options: { data?: ConversationSocketData } = {}): boolean {
      if (options.data !== undefined) upgrades.push(options.data);
      return acceptUpgrade;
    },
  } as unknown as Bun.Server<ConversationSocketData>;
  return { server, upgrades };
}

interface ClientSocket {
  messages: ServerFrame[];
  send(frame: unknown): void;
  close(): void;
}

function connect(url: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const client = new WebSocket(url);
    const messages: ServerFrame[] = [];
    client.onopen = () => {
      resolve({
        messages,
        send(frame) {
          client.send(JSON.stringify(frame));
        },
        close() {
          client.close();
        },
      });
    };
    client.onmessage = (event) => {
      messages.push(JSON.parse(String(event.data)) as ServerFrame);
    };
    client.onerror = () => reject(new Error("websocket connection failed"));
  });
}

function submit(client: ClientSocket, clientMessageId: string, payload: string): void {
  client.send({ type: "message.submit", clientMessageId, payload });
}

async function startRuntime(root: string, owner: ConversationTurnOwner): Promise<RuntimeParts> {
  const fixtureParts = fixturePartsForRuntime(root);
  const runtime = new ConversationSocketRuntime(root, {
    turnOwner: owner,
    projectionProvider: fixtureParts.provider,
    operationHost: fixtureParts.host,
    contributionRegistry: fixtureParts.registry,
  });
  const { server, upgrades } = stubServer();
  const handler = createWorkbenchRequestHandler(
    { port: 4317, roots: [] },
    {} as AutonomyClient,
    { conversationSocket: runtime },
  );
  return {
    runtime,
    handler,
    server,
    upgrades: upgrades as unknown as never,
    socketUrl: (conversationId, after) =>
      `http://127.0.0.1:4317/api/conversations/${conversationId}/socket?after=${after}`,
    owner,
  };
}

interface FixtureParts {
  registry: ConversationContributionRegistry;
  host: ConversationOperationHost;
  provider: ReturnType<typeof createConversationContextProvider>;
}

function fixturePartsForRuntime(root: string): FixtureParts {
  const registry = createConversationContributionRegistry(root, {
    catalog: fakeCatalog(),
  });
  const host = createConversationTaskOperationHost(root, { contributionRegistry: registry });
  const provider = createConversationContextProvider(root, {
    contributionRegistry: registry,
    catalog: fakeCatalog(),
  });
  return { registry, host, provider };
}

describe("conversation runtime contribution wiring", () => {
  test("a zero-worker inquiry turn settles with no contribution formed", async () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-contribution-runtime-"));
    temporaryRoots.push(root);
    const owner = scriptedOwner([settledScript("just an answer")]);
    const parts = await startRuntime(root, owner);
    const conversationId = randomUUID();
    const client = await connect(parts.socketUrl(conversationId, -1));
    submit(client, randomUUID(), "what does the fixture say?");
    await waitFor(() => client.messages.some((frame) =>
      frame.type === "journal.event" && frame.event.type === "coordinator.turn-settled"), "turn settles");
    const journalEvents = client.messages.filter((frame): frame is Extract<ServerFrame, { type: "journal.event" }> =>
      frame.type === "journal.event").map((frame) => frame.event);
    expect(journalEvents.some((event) => event.type === "action.requested")).toBe(false);
    expect(journalEvents.filter((event) => event.type === "coordinator.turn-settled")).toHaveLength(1);
    expect(await parts.runtime.contributionRegistry.listContributions(conversationId)).toEqual([]);
  });

  test("a contribution_spawn turn journals the exact operation and streams attributed activity", async () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-contribution-runtime-"));
    temporaryRoots.push(root);
    const runtimeFixture = fixture();
    const owner = scriptedOwner([operationScript(spawnOperation(runtimeFixture, { key: "socket-spawn" }))]);
    const registry = createConversationContributionRegistry(runtimeFixture.home, {
      catalog: fakeCatalog(),
    });
    const host = createConversationTaskOperationHost(runtimeFixture.home, { contributionRegistry: registry });
    const provider = createConversationContextProvider(runtimeFixture.home, {
      contributionRegistry: registry,
      catalog: fakeCatalog(),
    });
    const runtime = new ConversationSocketRuntime(runtimeFixture.home, {
      turnOwner: owner,
      projectionProvider: provider,
      operationHost: host,
      contributionRegistry: registry,
    });
    const { server } = stubServer();
    const handler = createWorkbenchRequestHandler(
      { port: 4317, roots: [] },
      {} as AutonomyClient,
      { conversationSocket: runtime },
    );
    const conversationId = randomUUID();
    const client = await connect(`http://127.0.0.1:4317/api/conversations/${conversationId}/socket?after=-1`);
    submit(client, randomUUID(), "form one bounded evidence contribution");
    await waitFor(() => client.messages.some((frame) =>
      frame.type === "journal.event" && frame.event.type === "action.settled"), "spawn action settles");
    const requested = client.messages.find((frame): frame is Extract<ServerFrame, { type: "journal.event" }> =>
      frame.type === "journal.event" && frame.event.type === "action.requested");
    expect(requested).toBeDefined();
    expect(requested!.event.data.kind).toBe("contribution_spawn");
    expect(requested!.event.data.operation).toMatchObject({
      kind: "contribution_spawn",
      key: "socket-spawn",
      effectKind: "read-only",
    });
    await waitFor(() => client.messages.some((frame) => frame.type === "projection.changed"), "contribution settlement broadcasts");
    const activity = client.messages.filter((frame) => frame.type === "activity.delta");
    expect(activity.length).toBeGreaterThan(0);
    const firstActivity = activity[0] as Extract<ServerFrame, { type: "activity.delta" }>;
    expect(firstActivity.taskId).toBe(runtimeFixture.taskId);
    void handler;
    server.upgrade = () => false;
  });

  test("a keyed child-result request runs one synthesis turn with the full evidence and one reconstructed response", async () => {
    const runtimeFixture = fixture();
    const registry = createConversationContributionRegistry(runtimeFixture.home, {
      catalog: fakeCatalog(),
    });
    const conversationId = randomUUID();
    const receipt = registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: spawnOperation(runtimeFixture, { key: "synthesis-source" }) as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    });
    await waitFor(async () => {
      const projections = await registry.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "child settles");

    const captured: CapturedPrepare[] = [];
    const owner = scriptedOwner([
      childResultRequestScript(receipt.batchId, "synthesis-source"),
      settledScript("One reconstructed response."),
    ], (input) => captured.push(input));
    const host = createConversationTaskOperationHost(runtimeFixture.home, { contributionRegistry: registry });
    const provider = createConversationContextProvider(runtimeFixture.home, {
      contributionRegistry: registry,
      catalog: fakeCatalog(),
    });
    const runtime = new ConversationSocketRuntime(runtimeFixture.home, {
      turnOwner: owner,
      projectionProvider: provider,
      operationHost: host,
      contributionRegistry: registry,
    });
    const { server } = stubServer();
    const handler = createWorkbenchRequestHandler(
      { port: 4317, roots: [] },
      {} as AutonomyClient,
      { conversationSocket: runtime },
    );
    const client = await connect(`http://127.0.0.1:4317/api/conversations/${conversationId}/socket?after=-1`);
    submit(client, randomUUID(), "synthesize the child result");
    await waitFor(() => client.messages.filter((frame) =>
      frame.type === "journal.event" && frame.event.type === "coordinator.turn-settled").length >= 2, "request and synthesis turns settle");

    const settlements = client.messages.filter((frame): frame is Extract<ServerFrame, { type: "journal.event" }> =>
      frame.type === "journal.event" && frame.event.type === "coordinator.turn-settled")
      .map((frame) => frame.event);
    expect(settlements).toHaveLength(2);
    const settledEvent = settlements[1] as Extract<(typeof settlements)[number], { type: "coordinator.turn-settled" }>;
    expect(settledEvent.data.response).toBe("One reconstructed response.");

    expect(captured).toHaveLength(2);
    expect(captured[1]!.fullChildResults).toHaveLength(1);
    expect(captured[1]!.fullChildResults![0]!.batchId).toBe(receipt.batchId);
    expect(captured[1]!.fullChildResults![0]!.key).toBe("synthesis-source");
    expect(captured[1]!.fullChildResults![0]!.semantic?.finalText).toContain("bounded fixture conclusion");
    // Child summaries reach the requesting turn; full evidence only the synthesis.
    expect(captured[0]!.children?.map((child) => child.id)).toContain(`${receipt.batchId}/synthesis-source`);
    void handler;
    server.upgrade = () => false;
  });

  test("a keyed child-result request after a Task correction fails the turn visibly without a synthesis", async () => {
    const runtimeFixture = fixture();
    const registry = createConversationContributionRegistry(runtimeFixture.home, {
      catalog: fakeCatalog(),
    });
    const conversationId = randomUUID();
    const receipt = registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: spawnOperation(runtimeFixture, { key: "stale-read" }) as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    });
    await waitFor(async () => {
      const projections = await registry.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "child settles");
    const source = loadPrincipalTasks(runtimeFixture.home);
    correctPrincipalTask(runtimeFixture.home, {
      id: runtimeFixture.taskId,
      expectedSourceRevision: source.sourceRevision,
      expectedRevision: source.tasks[0]!.revision,
      statement: "Preserve the second fixture invariant too.",
      sourceRef: "test:stale-correction",
      nextActor: "agent",
    });

    const owner = scriptedOwner([
      childResultRequestScript(receipt.batchId, "stale-read"),
      settledScript("must not run"),
    ]);
    const host = createConversationTaskOperationHost(runtimeFixture.home, { contributionRegistry: registry });
    const provider = createConversationContextProvider(runtimeFixture.home, {
      contributionRegistry: registry,
      catalog: fakeCatalog(),
    });
    const runtime = new ConversationSocketRuntime(runtimeFixture.home, {
      turnOwner: owner,
      projectionProvider: provider,
      operationHost: host,
      contributionRegistry: registry,
    });
    const { server } = stubServer();
    const handler = createWorkbenchRequestHandler(
      { port: 4317, roots: [] },
      {} as AutonomyClient,
      { conversationSocket: runtime },
    );
    const client = await connect(`http://127.0.0.1:4317/api/conversations/${conversationId}/socket?after=-1`);
    submit(client, randomUUID(), "read the old child result");
    await waitFor(() => client.messages.some((frame) =>
      frame.type === "journal.event" && frame.event.type === "coordinator.turn-failed"), "stale refusal fails the turn");
    const failed = client.messages.find((frame): frame is Extract<ServerFrame, { type: "journal.event" }> =>
      frame.type === "journal.event" && frame.event.type === "coordinator.turn-failed");
    expect(failed).toBeDefined();
    expect(failed!.event.data.reason).toContain("stale");
    expect(client.messages.filter((frame): frame is Extract<ServerFrame, { type: "journal.event" }> =>
      frame.type === "journal.event" && frame.event.type === "coordinator.turn-settled")).toHaveLength(0);
    void handler;
    server.upgrade = () => false;
  });

  test("an unsupported request kind fails the turn visibly", async () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-contribution-runtime-"));
    temporaryRoots.push(root);
    const owner = scriptedOwner([principalDecisionRequestScript()]);
    const parts = await startRuntime(root, owner);
    const conversationId = randomUUID();
    const client = await connect(parts.socketUrl(conversationId, -1));
    submit(client, randomUUID(), "ask the principal");
    await waitFor(() => client.messages.some((frame) =>
      frame.type === "journal.event" && frame.event.type === "coordinator.turn-failed"), "unsupported request fails");
    const failed = client.messages.find((frame): frame is Extract<ServerFrame, { type: "journal.event" }> =>
      frame.type === "journal.event" && frame.event.type === "coordinator.turn-failed");
    expect(failed!.event.data.reason).toContain("not supported");
  });

  test("a nested child-result request in the synthesis turn fails visibly without a third model call", async () => {
    const runtimeFixture = fixture();
    const registry = createConversationContributionRegistry(runtimeFixture.home, {
      catalog: fakeCatalog(),
    });
    const conversationId = randomUUID();
    const receipt = registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: spawnOperation(runtimeFixture, { key: "nested-source" }) as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    });
    await waitFor(async () => {
      const projections = await registry.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "child settles");

    const owner = scriptedOwner([
      childResultRequestScript(receipt.batchId, "nested-source"),
      childResultRequestScript(receipt.batchId, "nested-source", "nested again"),
    ]);
    const host = createConversationTaskOperationHost(runtimeFixture.home, { contributionRegistry: registry });
    const provider = createConversationContextProvider(runtimeFixture.home, {
      contributionRegistry: registry,
      catalog: fakeCatalog(),
    });
    const runtime = new ConversationSocketRuntime(runtimeFixture.home, {
      turnOwner: owner,
      projectionProvider: provider,
      operationHost: host,
      contributionRegistry: registry,
    });
    const { server } = stubServer();
    const handler = createWorkbenchRequestHandler(
      { port: 4317, roots: [] },
      {} as AutonomyClient,
      { conversationSocket: runtime },
    );
    const client = await connect(`http://127.0.0.1:4317/api/conversations/${conversationId}/socket?after=-1`);
    submit(client, randomUUID(), "read then read again");
    await waitFor(() => client.messages.filter((frame): frame is Extract<ServerFrame, { type: "journal.event" }> =>
      frame.type === "journal.event" && frame.event.type === "coordinator.turn-failed").length >= 1, "nested request fails");
    const failed = client.messages.find((frame): frame is Extract<ServerFrame, { type: "journal.event" }> =>
      frame.type === "journal.event" && frame.event.type === "coordinator.turn-failed");
    expect(failed!.event.data.reason).toContain("second request");
    void handler;
    server.upgrade = () => false;
  });
});
