import { afterEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { CellDriver, DriverResult } from "../../../packages/work-cell/src/driver";
import { WorkerCatalog, type WorkerCard } from "../../../packages/work-cell/src/worker-catalog";
import { initializeHome } from "../src/home";
import {
  LocalTaskControlError,
  type LocalTaskReadPort,
} from "../src/local-task-control-plane";
import { registerProject } from "../src/register";
import { correctPrincipalTask, createPrincipalTask, loadPrincipalTasks } from "../src/tasks";
import { PrincipalTasksSchema, type PrincipalTasks } from "../src/contracts";
import {
  acquireWorktreeWriterLease,
  releaseWorktreeWriterLease,
  worktreeWriterLeasePath,
} from "../src/orchestration/worktree-writer";
import {
  CONTRIBUTION_TASK_SOURCE_REF,
  CONTRIBUTION_TERMINAL_TOOL,
  ContributionError,
  contributionPreparedBatchId,
  contributionStateDirectory,
  createConversationContributionRegistry,
  readContributionSpawnReceipts,
  readContributionStartedReceipts,
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
import {
  taskReceiptEvidenceRef,
  type ConversationEvent,
} from "../src/conversation/contracts";
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

function taskReadSource(
  fixture_: Fixture,
  sourceRevision: number,
  taskRevision: number,
): PrincipalTasks {
  const disk = loadPrincipalTasks(fixture_.home);
  const task = disk.tasks.find((candidate) => candidate.id === fixture_.taskId);
  if (task === undefined) throw new Error(`fixture Task ${fixture_.taskId} is missing`);
  return PrincipalTasksSchema.parse({
    ...disk,
    sourceRevision,
    tasks: [{
      ...task,
      revision: taskRevision,
      acceptance: ["The port-owned Task acceptance is preserved"],
    }],
  });
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

/**
 * A contribution driver that stays unsettled until the test releases it, so
 * pre-settlement reads and controls are deterministic instead of racing a
 * fast driver.
 */
function gatedContributionDriver(): { driver: CellDriver; release: () => void } {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    release,
    driver: {
      descriptor: fakeDescriptor(),
      async run(_input, context): Promise<DriverResult> {
        context.emit("agent.step.started", { stepNumber: 1, activeTools: ["read_file"] });
        await Promise.race([
          gate,
          new Promise<void>((resolve) => {
            context.signal.addEventListener("abort", () => resolve(), { once: true });
          }),
        ]);
        context.emit("agent.step.finished", { finishReason: "stop" });
        return {
          terminalToolsCalled: [CONTRIBUTION_TERMINAL_TOOL],
          finalText: "The bounded fixture conclusion.",
          usage: fakeUsage(),
          rawSteps: [],
        };
      },
    },
  };
}

function fakeCatalog(createDriver: () => CellDriver = fastContributionDriver, card = fakeCard()): WorkerCatalog {
  return new WorkerCatalog([{ card, createDriver }]);
}

/** The Workbench CLI entry exercised by the production-reachable reconcile tests. */
function cliPath(): string {
  return join(import.meta.dir, "../src/cli.ts");
}

/** The exact durable lease binding retained by a settled effectful spawn reservation. */
interface ReconcileLeaseBinding {
  path: string;
  worktree: string;
  taskId: string;
  attemptId: string;
}

/** One settled effectful contribution plus its reservation-derived lease binding and one bounded CLI launcher. */
interface ReconcileCliScenario {
  readonly home: string;
  readonly conversationId: string;
  readonly batchId: string;
  readonly key: string;
  readonly binding: ReconcileLeaseBinding;
  readonly leasePath: string;
  reconcile(batchId: string, key: string): { exitCode: number; stdout: string };
  writeLease(record: Record<string, unknown>): void;
}

/** A crash-retained lease record with the given recorded owner pid. */
function crashRetainedLease(binding: ReconcileLeaseBinding, pid: number): Record<string, unknown> {
  return {
    version: "rosso.task-run-worktree-lease.v1",
    worktree: binding.worktree,
    taskId: binding.taskId,
    attemptId: binding.attemptId,
    pid,
    acquiredAt: new Date().toISOString(),
  };
}

/**
 * Each reconcile CLI story owns its fixture and launches the production
 * ordinary CLI exactly once, so no single test aggregates the launcher
 * startup cost into one default time budget.
 */
async function reconcileCliScenario(key: string): Promise<ReconcileCliScenario> {
  const fixture_ = fixture();
  const registry = createConversationContributionRegistry(fixture_.home, {
    catalog: fakeCatalog(),
  });
  const conversationId = randomUUID();
  await seedTaskAction(fixture_.home, conversationId, fixture_);
  const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
  const receipt = await registry.spawn(spawnInput(
    actor,
    spawnOperation({ key, effectKind: "effectful" }),
  ));
  await waitFor(async () => {
    const projections = await registry.listContributions(conversationId);
    return projections.every((entry) => entry.state === "settled");
  }, `${key} contribution settles`);
  const reservationPath = join(
    contributionStateDirectory(fixture_.home, conversationId),
    `spawn-${actor.actionId}.json`,
  );
  const spawnRecord = JSON.parse(readFileSync(reservationPath, "utf8")) as Record<string, unknown>;
  const binding = spawnRecord.lease as unknown as ReconcileLeaseBinding;
  return {
    home: fixture_.home,
    conversationId,
    batchId: receipt.batchId,
    key,
    binding,
    leasePath: binding.path,
    reconcile(batchId, keyToReconcile) {
      const result = Bun.spawnSync([
        process.execPath,
        cliPath(),
        "--home",
        fixture_.home,
        "contribution",
        "reconcile-lease",
        conversationId,
        batchId,
        keyToReconcile,
      ], { stdout: "pipe", stderr: "pipe" });
      return { exitCode: result.exitCode, stdout: result.stdout.toString() };
    },
    writeLease(record) {
      writeFileSync(binding.path, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    },
  };
}

/**
 * The bounded child script run by the truly concurrent two-process
 * effectful regression: it spawns the exact committed action against the
 * shared home with a deterministic local catalog and reports the receipt and
 * whether this process started the executor.
 */
function concurrentChildScript(): string {
  const repositoryRoot = join(import.meta.dir, "../../..");
  const contributionsSource = join(repositoryRoot, "operations/workbench/src/conversation/contributions.ts");
  const workerCatalogSource = join(repositoryRoot, "packages/work-cell/src/worker-catalog.ts");
  const driverSource = join(repositoryRoot, "packages/work-cell/src/driver.ts");
  return `import { appendFileSync } from "node:fs";
import { createConversationContributionRegistry } from ${JSON.stringify(contributionsSource)};
import { WorkerCatalog } from ${JSON.stringify(workerCatalogSource)};
import type { CellDriver } from ${JSON.stringify(driverSource)};

const [home, conversationId, turnId, actionId, key, counterPath] = process.argv.slice(2) as string[];

const catalog = new WorkerCatalog([{
  card: {
    version: "work-cell.worker-card.v1",
    id: "fake-worker",
    labels: ["coding", "text", "read", "write", "evidence", "review"],
    description: "Deterministic concurrent child catalog worker.",
    executionProfile: {
      id: "fake-worker",
      version: "execution-profile.v1",
      provider: "fake-provider",
      model: "fake-model",
      reasoningEffort: "max",
      parallelism: "serial",
    },
    availability: { status: "available" },
  },
  createDriver: (): CellDriver => ({
    descriptor: { adapter: "ai-sdk-v7", provider: "fake-provider", model: "fake-model" },
    async run(_input, context) {
      appendFileSync(counterPath, "start\\n", "utf8");
      context.emit("agent.step.started", { stepNumber: 1, activeTools: ["read_file"] });
      context.emit("agent.step.finished", { finishReason: "stop" });
      return {
        terminalToolsCalled: ["submit_contribution"],
        finalText: "The concurrent bounded conclusion.",
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 },
        rawSteps: [],
      };
    },
  }),
}]);

const registry = createConversationContributionRegistry(home, { catalog });
const receipt = await registry.spawn({
  conversationId,
  turnId,
  actionId,
  operation: {
    kind: "contribution_spawn",
    key,
    intent: "Produce the concurrent bounded evidence conclusion.",
    capabilityNeed: "evidence",
    effectKind: "effectful",
    workerId: "fake-worker",
    dependsOn: [],
  },
});
const started = registry.contribution(receipt.batchId, receipt.key) !== undefined;
if (started) {
  const handle = registry.contribution(receipt.batchId, receipt.key)!;
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    handle.settled,
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, 15_000);
    }),
  ]);
  clearTimeout(timer);
}
console.log(JSON.stringify({ ok: true, batchId: receipt.batchId, key: receipt.key, started }));
`;
}

interface Identity {
  readonly conversationId: string;
  readonly turnId: string;
  readonly actionId: string;
}

function identity(): Identity {
  return { conversationId: randomUUID(), turnId: randomUUID(), actionId: randomUUID() };
}

/**
 * Seed the conversation journal with one settled task_create action whose
 * receipt names the fixture Task. The contribution host derives the
 * conversation's current Task from exactly this evidence; the coordinator's
 * spawn shape never carries a Task identity. Returns the seeded actionId so
 * tests can tell the seed's settlement apart from later actions.
 */
async function seedTaskAction(home: string, conversationId: string, fixture_: Fixture): Promise<string> {
  const journal = new FileConversationJournal(home);
  const turnId = randomUUID();
  const actionId = randomUUID();
  const receipt = await journal.submitMessage(conversationId, {
    clientMessageId: randomUUID(),
    payload: "create the bounded fixture task",
  });
  const messageId = receipt.event.data.messageId;
  await journal.startTurn(conversationId, {
    turnId,
    messageId,
    requestedPolicy: FAKE_REQUESTED_POLICY,
  });
  await journal.requestAction(conversationId, {
    actionId,
    turnId,
    messageId,
    operation: {
      kind: "task_create",
      title: "Run bounded temporary contributions through the conversation",
      objective: "Produce the bounded fixture result in the bound worktree.",
      acceptance: ["The fixture result exists"],
      projectId: fixture_.projectId,
      expectedPrimaryHead: fixture_.primaryHead,
      worktreePath: fixture_.worktree,
      expectedWorktreeHead: fixture_.worktreeHead,
    },
  });
  await journal.settleAction(conversationId, {
    actionId,
    turnId,
    messageId,
    evidenceRefs: [taskReceiptEvidenceRef(fixture_.taskId, fixture_.sourceRevision)],
  });
  return actionId;
}

/** One seeded actor: the spawn host can derive the fixture Task for this conversation. */
async function seededActor(fixture_: Fixture): Promise<Identity> {
  const actor = identity();
  await seedTaskAction(fixture_.home, actor.conversationId, fixture_);
  return actor;
}

function spawnOperation(overrides: Partial<Extract<ConversationOperation, { kind: "contribution_spawn" }>> = {}): ConversationOperation {
  return {
    kind: "contribution_spawn",
    key: `evidence-${randomUUID().slice(0, 8)}`,
    intent: "Produce the bounded evidence conclusion for the fixture result.",
    capabilityNeed: "evidence",
    effectKind: "read-only",
    workerId: FAKE_WORKER_ID,
    dependsOn: [],
    ...overrides,
  } as ConversationOperation;
}

function spawnInput(actor: Identity, operation: ConversationOperation) {
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

/** Wait until one prepared delegate batch has a durable terminal settlement. */
async function waitForBatchSettled(
  timeline: FileMissionTimeline,
  conversationId: string,
  batchId: string,
): Promise<void> {
  await waitFor(async () => {
    try {
      return (await timeline.recoverBatch(conversationId, batchId)).ready;
    } catch {
      return false;
    }
  }, `delegate batch ${batchId} settles`);
}

/** The first prepared delegate batch id of one conversation, by journal order. */
async function firstPreparedBatchId(
  timeline: FileMissionTimeline,
  conversationId: string,
): Promise<string | undefined> {
  const events = await timeline.readEvents(conversationId);
  const prepared = events.find((event) => event.type === "delegate.batch-prepared");
  return prepared === undefined ? undefined : String(prepared.data.batchId);
}

const FAKE_REQUESTED_POLICY = {
  provider: "fake-coordinator",
  model: "fake.v1",
  thinking: "disabled",
  reasoningEffort: "none",
} as const;

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

  test("spawn derives the conversation's current Task from the journal and refuses without one", async () => {
    const fixture_ = fixture();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });

    // No settled task_create/task_correct action: the host cannot derive a
    // Task and refuses visibly instead of guessing one.
    const unseeded = identity();
    await expect(registry.spawn(spawnInput(unseeded, spawnOperation())))
      .rejects.toThrowError(ContributionError);

    // A conversation whose journal names a Task that no longer exists in the
    // canonical source is refused the same way.
    const staleJournalActor = identity();
    await seedTaskAction(fixture_.home, staleJournalActor.conversationId, {
      ...fixture_,
      taskId: "task-that-no-longer-exists",
    });
    await expect(registry.spawn(spawnInput(staleJournalActor, spawnOperation())))
      .rejects.toThrowError(ContributionError);

    // The seeded conversation derives the exact fixture Task; the receipt and
    // the durable spawn record carry the host-derived Task identity.
    const actor = await seededActor(fixture_);
    const receipt = await registry.spawn(spawnInput(actor, spawnOperation({ key: "derived-task" })));
    expect(receipt.taskId).toBe(fixture_.taskId);
    expect(receipt.taskRevision).toBe(fixture_.taskRevision);
    const spawnPath = join(contributionStateDirectory(fixture_.home, actor.conversationId), `spawn-${actor.actionId}.json`);
    const spawnRecord = JSON.parse(readFileSync(spawnPath, "utf8")) as Record<string, unknown>;
    expect(spawnRecord.taskId).toBe(fixture_.taskId);
    expect(spawnRecord.taskRevision).toBe(fixture_.taskRevision);
    await waitFor(async () => {
      const projections = await registry.listContributions(actor.conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "derived-task contribution settles");
  });

  test("derives spawn and settled-result currentness from one canonical-home Task read port", async () => {
    const fixture_ = fixture();
    let taskSource = taskReadSource(fixture_, 41, 7);
    let listCalls = 0;
    const factoryHomes: string[] = [];
    const taskReadPort: LocalTaskReadPort = {
      list() {
        listCalls += 1;
        return taskSource;
      },
      show() {
        throw new Error("Task show is outside the contribution read boundary");
      },
    };
    const registry = createConversationContributionRegistry(
      join(fixture_.home, "..", "home"),
      {
        catalog: fakeCatalog(),
        taskReadPortFactory(handlerHome) {
          factoryHomes.push(handlerHome);
          return taskReadPort;
        },
      },
    );
    const actor = await seededActor(fixture_);

    const receipt = await registry.spawn(spawnInput(
      actor,
      spawnOperation({ key: "port-derived-task" }),
    ));

    expect(listCalls).toBe(1);
    expect(factoryHomes).toEqual([realpathSync(fixture_.home)]);
    expect(receipt).toMatchObject({
      taskId: fixture_.taskId,
      sourceRevision: 41,
      taskRevision: 7,
    });
    const spawnRecord = readContributionSpawnReceipts(
      fixture_.home,
      actor.conversationId,
    )[0]!;
    expect(spawnRecord).toMatchObject({
      taskId: fixture_.taskId,
      sourceRevision: 41,
      taskRevision: 7,
    });
    await waitFor(async () => {
      const projections = await registry.listContributions(actor.conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "port-derived contribution settles");

    const currentRead = await registry.readChildResult({
      conversationId: actor.conversationId,
      batchId: receipt.batchId,
      key: receipt.key,
    });
    expect(currentRead.standing).toBe("read");
    expect(listCalls).toBe(2);
    const currentSummaries = await registry.listSettledChildSummaries(actor.conversationId);
    expect(currentSummaries).toHaveLength(1);
    expect(listCalls).toBe(3);

    taskSource = taskReadSource(fixture_, 42, 8);
    const staleRead = await registry.readChildResult({
      conversationId: actor.conversationId,
      batchId: receipt.batchId,
      key: receipt.key,
    });
    expect(staleRead).toMatchObject({ standing: "refused", code: "stale" });
    expect(listCalls).toBe(4);
    expect(await registry.listSettledChildSummaries(actor.conversationId)).toEqual([]);
    expect(listCalls).toBe(5);
    expect(factoryHomes).toEqual([realpathSync(fixture_.home)]);
  });

  test("fails spawn visibly and refuses settled results when the Task read port fails", async () => {
    const fixture_ = fixture();
    const taskSource = taskReadSource(fixture_, 51, 9);
    let failure: "none" | "typed" | "untyped" = "none";
    let failOnListCall: number | undefined;
    let listCalls = 0;
    const factoryHomes: string[] = [];
    const taskReadPort: LocalTaskReadPort = {
      list() {
        listCalls += 1;
        if (listCalls === failOnListCall) {
          throw new Error("dependency currentness Task read failure");
        }
        if (failure === "typed") {
          throw new LocalTaskControlError(
            "source-unavailable",
            "typed contribution Task read failure",
          );
        }
        if (failure === "untyped") {
          throw new Error("untyped contribution Task read failure");
        }
        return taskSource;
      },
      show() {
        throw new Error("Task show is outside the contribution read boundary");
      },
    };
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
      taskReadPortFactory(handlerHome) {
        factoryHomes.push(handlerHome);
        return taskReadPort;
      },
    });
    const actor = await seededActor(fixture_);
    const receipt = await registry.spawn(spawnInput(
      actor,
      spawnOperation({ key: "read-failure-currentness" }),
    ));
    await waitFor(async () => {
      const projections = await registry.listContributions(actor.conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "read-failure contribution settles");
    expect(listCalls).toBe(1);

    failure = "untyped";
    const unavailableRead = await registry.readChildResult({
      conversationId: actor.conversationId,
      batchId: receipt.batchId,
      key: receipt.key,
    });
    expect(unavailableRead).toMatchObject({
      standing: "refused",
      code: "source-unavailable",
      reason: expect.stringContaining("untyped contribution Task read failure"),
    });
    expect(listCalls).toBe(2);
    const unavailableSummaries = await registry
      .listSettledChildSummaries(actor.conversationId)
      .catch((error: unknown) => error);
    expect(unavailableSummaries).toBeInstanceOf(ContributionError);
    expect(unavailableSummaries).toMatchObject({
      code: "source-unavailable",
      message: expect.stringContaining("untyped contribution Task read failure"),
    });
    expect(listCalls).toBe(3);

    failure = "none";
    const recoveredRead = await registry.readChildResult({
      conversationId: actor.conversationId,
      batchId: receipt.batchId,
      key: receipt.key,
    });
    expect(recoveredRead.standing).toBe("read");
    expect(listCalls).toBe(4);
    expect(await registry.listSettledChildSummaries(actor.conversationId)).toHaveLength(1);
    expect(listCalls).toBe(5);

    failOnListCall = listCalls + 2;
    const dependencyFailure = await registry.spawn(spawnInput(
      {
        conversationId: actor.conversationId,
        turnId: randomUUID(),
        actionId: randomUUID(),
      },
      spawnOperation({
        key: "read-failure-dependency",
        dependsOn: [receipt.key],
      }),
    )).catch((error: unknown) => error);
    expect(dependencyFailure).toBeInstanceOf(ContributionError);
    expect(dependencyFailure).toMatchObject({
      code: "source-unavailable",
      message: expect.stringContaining("dependency currentness Task read failure"),
    });
    expect(listCalls).toBe(7);

    failOnListCall = undefined;
    failure = "typed";
    const spawnFailure = await registry.spawn(spawnInput(
      {
        conversationId: actor.conversationId,
        turnId: randomUUID(),
        actionId: randomUUID(),
      },
      spawnOperation({ key: "read-failure-spawn" }),
    )).catch((error: unknown) => error);
    expect(spawnFailure).toBeInstanceOf(ContributionError);
    expect(spawnFailure).toMatchObject({
      code: "source-unavailable",
      message: expect.stringContaining("typed contribution Task read failure"),
    });
    expect(listCalls).toBe(8);
    expect(readContributionSpawnReceipts(fixture_.home, actor.conversationId)).toHaveLength(1);
    expect(factoryHomes).toEqual([realpathSync(fixture_.home)]);
  });

  test("spawn selects the exact catalog worker and refuses unknown or unavailable workers", async () => {
    const fixture_ = fixture();
    const catalog = fakeCatalog();
    const registry = createConversationContributionRegistry(fixture_.home, { catalog });
    const actor = await seededActor(fixture_);

    await expect(registry.spawn(spawnInput(actor, spawnOperation({ workerId: "not-a-worker" }))))
      .rejects.toThrowError(ContributionError);

    const unavailableRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(fastContributionDriver, fakeCard({
        availability: { status: "unavailable", reason: "no credential" },
      })),
    });
    await expect(unavailableRegistry.spawn(spawnInput(actor, spawnOperation())))
      .rejects.toThrowError(ContributionError);

    const unsupported = spawnOperation({ capabilityNeed: "vision" });
    await expect(registry.spawn(spawnInput(actor, unsupported)))
      .rejects.toThrowError(ContributionError);
  });

  test("bounded read-only contributions run in parallel and settle with separate keyed results", async () => {
    const fixture_ = fixture();
    const gated = gatedContributionDriver();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(() => gated.driver),
      maxLiveContributions: 2,
    });
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const first = spawnOperation({ key: "evidence-one", intent: "First bounded read." });
    const second = spawnOperation({ key: "evidence-two", intent: "Second bounded read." });
    const firstReceipt = await registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: first as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    });
    const secondReceipt = await registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: second as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    });
    expect(firstReceipt.batchId).not.toBe(secondReceipt.batchId);

    // The live bound refuses a third read-only contribution while the first
    // two are still live behind the shared gate.
    const third = spawnOperation({ key: "evidence-three" });
    await expect(registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: third as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    })).rejects.toThrowError(ContributionError);
    gated.release();

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
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const effectful = spawnOperation({
      key: "writer-one",
      effectKind: "effectful",
      intent: "Write the bounded fixture result.",
    });
    const receipt = await registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: effectful as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    });
    expect(receipt.effectKind).toBe("effectful");

    // A second effectful contribution on the same Worktree is refused.
    const overlapping = spawnOperation({ key: "writer-two", effectKind: "effectful" });
    await expect(registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: overlapping as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    })).rejects.toThrowError(ContributionError);

    // A task_continue publishes its canonical Run request before O3. The
    // occupied shared claim then settles that Run runner-failed with zero
    // Cell invocation; the existing contribution remains the sole live
    // effectful owner and its lifecycle is unchanged.
    const carrierRegistry = createConversationExecutionCarrierRegistry(fixture_.home, {
      catalog: fakeCatalog(slowContributionDriver),
    });
    const carrierHost = createConversationTaskOperationHost(fixture_.home, { carrierRegistry });
    const carrierActionId = randomUUID();
    const carrierReceipt = await carrierHost.executeOperation({
      conversationId,
      turnId: randomUUID(),
      actionId: carrierActionId,
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
    });
    expect(carrierReceipt.carrierId).toBe(carrierActionId);
    const refusedCarrier = carrierRegistry.carrier(carrierActionId)!;
    await waitFor(() => refusedCarrier.liveness().state !== "live", "carrier O3 refusal settles");
    const refusedStanding = refusedCarrier.liveness();
    expect(refusedStanding.state).toBe("settled");
    if (refusedStanding.state !== "settled") throw new Error("expected settled Run refusal");
    expect(refusedStanding.settlement.status).toBe("runner-failed");
    expect(existsSync(join(
      fixture_.home,
      "state",
      "task-attempts",
      carrierActionId,
      "cell-input.json",
    ))).toBe(false);
    expect(registry.contribution(receipt.batchId, "writer-one")!.liveness().state).toBe("live");

    // A read-only contribution may still overlap the effectful writer.
    const readOnly = spawnOperation({ key: "reader-one", effectKind: "read-only" });
    const readOnlyReceipt = await registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: readOnly as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    });
    expect(readOnlyReceipt.effectKind).toBe("read-only");

    // Stop the exact effectful writer: its terminal settlement releases the
    // shared Worktree lease, and a fresh effectful contribution is admitted.
    const handle = registry.contribution(receipt.batchId, "writer-one");
    expect(handle).toBeDefined();
    registry.control({
      batchId: receipt.batchId,
      key: "writer-one",
      control: "stop",
      actor: { conversationId, turnId: randomUUID(), actionId: randomUUID() },
    });
    await waitFor(() => handle!.liveness().state !== "live", "effectful contribution settles");
    const replacement = spawnOperation({ key: "writer-three", effectKind: "effectful" });
    const replacementReceipt = await registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: replacement as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    });
    expect(replacementReceipt.effectKind).toBe("effectful");

    // Settle the replacement writer so its terminal work completes before
    // the fixture teardown.
    registry.control({
      batchId: replacementReceipt.batchId,
      key: "writer-three",
      control: "stop",
      actor: { conversationId, turnId: randomUUID(), actionId: randomUUID() },
    });
    await waitFor(async () => {
      const projections = await registry.listContributions(conversationId);
      return projections.find((entry) => entry.batchId === replacementReceipt.batchId)?.state !== "live";
    }, "the replacement writer settles");
  });

  test("a lease-refused effectful spawn retracts its reservation and leaves no claimed contribution", async () => {
    const fixture_ = fixture();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(slowContributionDriver),
    });
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);

    // The first effectful contribution holds the exact Worktree lease.
    const holder = await registry.spawn(spawnInput(
      { conversationId, turnId: randomUUID(), actionId: randomUUID() },
      spawnOperation({ key: "lease-holder", effectKind: "effectful" }),
    ));

    // A second effectful spawn on the same Task/Worktree publishes its
    // reservation, loses the lease, and must retract the reservation so the
    // refused action leaves no claimed contribution behind.
    const refusedActor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const refused = spawnOperation({ key: "refused-writer", effectKind: "effectful" });
    await expect(registry.spawn(spawnInput(refusedActor, refused)))
      .rejects.toThrowError(ContributionError);
    expect(readContributionSpawnReceipts(fixture_.home, conversationId))
      .toHaveLength(1);

    // Once the holder's exact stop releases the lease, the same refused
    // action is admitted, and its exact stop settles it.
    registry.control({
      batchId: holder.batchId,
      key: "lease-holder",
      control: "stop",
      actor: { conversationId, turnId: randomUUID(), actionId: randomUUID() },
    });
    await waitFor(async () => {
      const projections = await registry.listContributions(conversationId);
      return projections.find((entry) => entry.batchId === holder.batchId)?.state !== "live";
    }, "the lease holder settles");
    const admitted = await registry.spawn(spawnInput(refusedActor, refused));
    expect(admitted.effectKind).toBe("effectful");
    expect(readContributionSpawnReceipts(fixture_.home, conversationId)).toHaveLength(2);
    registry.control({
      batchId: admitted.batchId,
      key: "refused-writer",
      control: "stop",
      actor: refusedActor,
    });
    await waitFor(async () => {
      const projections = await registry.listContributions(conversationId);
      return projections.find((entry) => entry.batchId === admitted.batchId)?.state === "settled";
    }, "the admitted effectful contribution settles");
  });

  test("two registries converging on the same committed action share one strict receipt and start exactly one worker", async () => {
    const fixture_ = fixture();
    const actor = await seededActor(fixture_);
    let starts = 0;
    const countingDriver = (): CellDriver => ({
      descriptor: fakeDescriptor(),
      async run(input, context) {
        starts += 1;
        return await fastContributionDriver().run(input, context);
      },
    });
    const sharedCatalog = fakeCatalog(countingDriver);
    const first = createConversationContributionRegistry(fixture_.home, { catalog: sharedCatalog });
    const second = createConversationContributionRegistry(fixture_.home, { catalog: sharedCatalog });

    const operation = spawnOperation({ key: "shared-reservation" });
    const firstReceipt = await first.spawn(spawnInput(actor, operation));
    const secondReceipt = await second.spawn(spawnInput(actor, operation));

    // The loser converges on the winner's strict matching receipt and starts
    // no duplicate worker: exactly one durable reservation exists and only
    // the winner's registry retains the started contribution.
    expect(secondReceipt.batchId).toBe(firstReceipt.batchId);
    expect(secondReceipt.key).toBe(firstReceipt.key);
    expect(first.contribution(firstReceipt.batchId, firstReceipt.key)).toBeDefined();
    expect(second.contribution(firstReceipt.batchId, firstReceipt.key)).toBeUndefined();
    expect(readContributionSpawnReceipts(fixture_.home, actor.conversationId)).toHaveLength(1);

    await waitFor(async () => {
      const projections = await first.listContributions(actor.conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "the single winner contribution settles");
    expect(starts).toBe(1);
  });

  test("an existing lease forces the winner's acquire failure while a loser observes the reservation: no started marker, no handle, no success", async () => {
    const fixture_ = fixture();
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);

    // A live effectful contribution from another registry holds the exact
    // shared Worktree lease.
    const holderRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(slowContributionDriver),
    });
    const holder = await holderRegistry.spawn(spawnInput(
      { conversationId, turnId: randomUUID(), actionId: randomUUID() },
      spawnOperation({ key: "lease-holder", effectKind: "effectful" }),
    ));

    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const operation = spawnOperation({ key: "barrier-writer", effectKind: "effectful" });
    const loserRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    let loserSpawn: Promise<unknown> | undefined;
    const winnerRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
      onReservationPublished: () => {
        // The winner is paused between reservation publication and lease
        // acquisition: a concurrent loser observes reservation-only and can
        // yield only unknown, never a started receipt.
        loserSpawn = loserRegistry.spawn(spawnInput(actor, operation)).catch((value: unknown) => value);
      },
    });

    // The winner's lease acquisition then fails against the retained holder
    // lease; the reservation is retracted with no started marker.
    await expect(winnerRegistry.spawn(spawnInput(actor, operation)))
      .rejects.toThrowError(ContributionError);
    const loserError = await loserSpawn!;
    expect(loserError).toBeInstanceOf(ContributionError);
    if (loserError instanceof ContributionError) {
      expect(loserError.code).toBe("contribution-unknown");
    }
    expect(loserRegistry.startedContribution(conversationId, actor.actionId)).toBeUndefined();
    expect(winnerRegistry.startedContribution(conversationId, actor.actionId)).toBeUndefined();
    expect(readContributionStartedReceipts(fixture_.home, conversationId)
      .filter((receipt) => receipt.actionId === actor.actionId)).toHaveLength(0);
    expect(readContributionSpawnReceipts(fixture_.home, conversationId)
      .filter((receipt) => receipt.actionId === actor.actionId)).toHaveLength(0);

    // Reconciliation after the refused action finds no claim at all: the
    // effect is provably absent, never settled from a reservation.
    const reconcilingHost = createConversationTaskOperationHost(fixture_.home, {
      contributionRegistry: loserRegistry,
    });
    expect(reconcilingHost.findCanonicalReceipt({
      conversationId,
      actionId: actor.actionId,
      operation,
    }).standing).toBe("absent");

    // Cleanup: stop the holder and settle it so the fixture root stays
    // removable and its terminal work completes before teardown.
    holderRegistry.control({
      batchId: holder.batchId,
      key: "lease-holder",
      control: "stop",
      actor: { conversationId, turnId: randomUUID(), actionId: randomUUID() },
    });
    await waitFor(async () => {
      const projections = await holderRegistry.listContributions(conversationId);
      return projections.find((entry) => entry.batchId === holder.batchId)?.state !== "live";
    }, "the lease holder settles");
  });

  test("a winner crash before start leaves reservation-only evidence: no success, no handle, reconcile unknown", async () => {
    const fixture_ = fixture();
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const operation = spawnOperation({ key: "crashed-writer", effectKind: "effectful" });

    const crashedRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
      onReservationPublished: () => {
        throw new Error("simulated winner crash before start");
      },
    });
    await expect(crashedRegistry.spawn(spawnInput(actor, operation))).rejects.toThrow();

    // Only the reservation remains: no started marker, no handle, no
    // successful receipt.
    const directory = contributionStateDirectory(fixture_.home, conversationId);
    expect(existsSync(join(directory, `spawn-${actor.actionId}.json`))).toBe(true);
    expect(existsSync(join(directory, `started-${actor.actionId}.json`))).toBe(false);
    expect(crashedRegistry.startedContribution(conversationId, actor.actionId)).toBeUndefined();
    expect(readContributionStartedReceipts(fixture_.home, conversationId)).toHaveLength(0);

    // A fresh registry cannot claim success from reservation-only evidence.
    const restarted = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    let refused: ContributionError | undefined;
    try {
      await restarted.spawn(spawnInput(actor, operation));
    } catch (error) {
      refused = error instanceof ContributionError ? error : undefined;
    }
    expect(refused?.code).toBe("contribution-unknown");
    expect(restarted.startedContribution(conversationId, actor.actionId)).toBeUndefined();

    // Reconciliation yields uninspectable (uncertain), never settled.
    const reconcilingHost = createConversationTaskOperationHost(fixture_.home, {
      contributionRegistry: restarted,
    });
    const lookup = reconcilingHost.findCanonicalReceipt({
      conversationId,
      actionId: actor.actionId,
      operation,
    });
    expect(lookup.standing).toBe("uninspectable");
    if (lookup.standing === "uninspectable") {
      expect(lookup.reason).toContain("without a started marker");
    }

    // The durable projection shows unknown liveness, never live or settled.
    const projections = await restarted.listContributions(conversationId);
    expect(projections.find((entry) => entry.key === "crashed-writer")?.state).toBe("unknown");
  });

  test("a winner crash between handle registration and the durable delegate start leaves no started evidence", async () => {
    const fixture_ = fixture();
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const operation = spawnOperation({ key: "registered-crash", effectKind: "effectful" });

    const crashedRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
      onHandleRegistered: () => {
        throw new Error("simulated winner crash after handle registration");
      },
    });
    await expect(crashedRegistry.spawn(spawnInput(actor, operation))).rejects.toThrow();

    // The reservation and the acquired lease remain, but no started marker
    // and no committed success exist.
    const directory = contributionStateDirectory(fixture_.home, conversationId);
    expect(existsSync(join(directory, `spawn-${actor.actionId}.json`))).toBe(true);
    expect(existsSync(join(directory, `started-${actor.actionId}.json`))).toBe(false);
    expect(readContributionStartedReceipts(fixture_.home, conversationId)).toHaveLength(0);

    // A fresh registry has no handle and cannot claim success.
    const restarted = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    expect(restarted.startedContribution(conversationId, actor.actionId)).toBeUndefined();
    const error = await restarted.spawn(spawnInput(actor, operation)).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(ContributionError);
    if (error instanceof ContributionError) expect(error.code).toBe("contribution-unknown");

    const reconcilingHost = createConversationTaskOperationHost(fixture_.home, {
      contributionRegistry: restarted,
    });
    expect(reconcilingHost.findCanonicalReceipt({
      conversationId,
      actionId: actor.actionId,
      operation,
    }).standing).toBe("uninspectable");
  });

  test("a winner crash between the durable delegate start and the started marker still never settles without the marker", async () => {
    const fixture_ = fixture();
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const operation = spawnOperation({ key: "started-crash" });

    const crashedRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
      onDelegateStarted: () => {
        throw new Error("simulated winner crash after the durable delegate start");
      },
    });
    await expect(crashedRegistry.spawn(spawnInput(actor, operation))).rejects.toThrow();

    // The durable delegate start DID commit: the exact cross-link verifies.
    const timeline = new FileMissionTimeline(join(fixture_.home, "state", "conversation-contributions"));
    const reservation = JSON.parse(readFileSync(join(
      contributionStateDirectory(fixture_.home, conversationId),
      `spawn-${actor.actionId}.json`,
    ), "utf8")) as Record<string, unknown>;
    const batchId = String(reservation.batchId);
    const link = timeline.durableStartLinkSync(
      conversationId,
      contributionPreparedBatchId(conversationId, batchId),
    );
    expect(link?.checkpointDigest).toBeString();

    // ...but without a started marker, no reader may settle the action.
    expect(existsSync(join(
      contributionStateDirectory(fixture_.home, conversationId),
      `started-${actor.actionId}.json`,
    ))).toBe(false);
    const restarted = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const error = await restarted.spawn(spawnInput(actor, operation)).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(ContributionError);
    if (error instanceof ContributionError) expect(error.code).toBe("contribution-unknown");
    const reconcilingHost = createConversationTaskOperationHost(fixture_.home, {
      contributionRegistry: restarted,
    });
    expect(reconcilingHost.findCanonicalReceipt({
      conversationId,
      actionId: actor.actionId,
      operation,
    }).standing).toBe("uninspectable");

    // Let the crashed winner's already-started delegate reach its terminal
    // settlement before the fixture teardown.
    await waitForBatchSettled(
      timeline,
      conversationId,
      contributionPreparedBatchId(conversationId, batchId),
    );
  });

  test("a winner crash after the started marker publishes: reconnect settles from the committed record", async () => {
    const fixture_ = fixture();
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const operation = spawnOperation({ key: "marker-crash" });

    const crashedRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
      onStartedMarkerPublished: () => {
        throw new Error("simulated winner crash after the started marker");
      },
    });
    await expect(crashedRegistry.spawn(spawnInput(actor, operation))).rejects.toThrow();

    // The started marker with its verified cross-links is the committed
    // started record: a reconnect converges on the winner receipt and the
    // host settles, without starting a second worker.
    const restarted = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const converged = await restarted.spawn(spawnInput(actor, operation));
    expect(converged.key).toBe("marker-crash");
    expect(restarted.startedContribution(conversationId, actor.actionId)).toBeUndefined();
    const reconcilingHost = createConversationTaskOperationHost(fixture_.home, {
      contributionRegistry: restarted,
    });
    const lookup = reconcilingHost.findCanonicalReceipt({
      conversationId,
      actionId: actor.actionId,
      operation,
    });
    expect(lookup.standing).toBe("settled");
    if (lookup.standing === "settled") {
      expect(lookup.receipt.taskId).toBe(fixture_.taskId);
      expect(lookup.receipt.evidenceRefs[0]).toContain(`started-${actor.actionId}.json`);
    }

    // Let the crashed winner's delegate reach its terminal settlement
    // before the fixture teardown.
    const timeline = new FileMissionTimeline(join(fixture_.home, "state", "conversation-contributions"));
    const winnerBatchId = await firstPreparedBatchId(timeline, conversationId);
    expect(winnerBatchId).toBeString();
    if (winnerBatchId !== undefined) {
      await waitForBatchSettled(timeline, conversationId, winnerBatchId);
    }
  });

  test("a marker link visible while the directory fsync fails yields unknown to every reader and success to none", async () => {
    const fixture_ = fixture();
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const operation = spawnOperation({ key: "publish-race" });

    const loserRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    let loserSpawn: Promise<unknown> | undefined;
    let directorySyncs = 0;
    const failingRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
      atomicPublish: {
        syncDirectory: () => {
          directorySyncs += 1;
          if (directorySyncs === 2) {
            // The started marker is already hard-linked at this point: a
            // concurrent reader must observe the in-flight publication as
            // unknown (the unremoved temporary marks it uncommitted), never
            // success.
            loserSpawn = loserRegistry.spawn(spawnInput(actor, operation)).catch((value: unknown) => value);
            throw new Error("simulated directory fsync failure");
          }
        },
      },
    });

    // The winner's marker publication fails after the link; the loser
    // observes in-flight evidence and yields unknown.
    await expect(failingRegistry.spawn(spawnInput(actor, operation))).rejects.toThrow();
    const loserError = await loserSpawn!;
    expect(loserError).toBeInstanceOf(ContributionError);
    if (loserError instanceof ContributionError) {
      expect(loserError.code).toBe("contribution-unknown");
    }

    // Let the winner's canceled delegate reach its terminal settlement so
    // the two timeline writers cannot interleave before the re-claim.
    const timeline = new FileMissionTimeline(join(fixture_.home, "state", "conversation-contributions"));
    const winnerBatchId = await firstPreparedBatchId(timeline, conversationId);
    if (winnerBatchId !== undefined) {
      await waitForBatchSettled(timeline, conversationId, winnerBatchId);
    }

    // The winner retracted the marker and the reservation: no committed
    // started record remains and the action is unclaimed, never settled.
    const directory = contributionStateDirectory(fixture_.home, conversationId);
    expect(existsSync(join(directory, `started-${actor.actionId}.json`))).toBe(false);
    expect(existsSync(join(directory, `spawn-${actor.actionId}.json`))).toBe(false);
    const reconcilingHost = createConversationTaskOperationHost(fixture_.home, {
      contributionRegistry: loserRegistry,
    });
    expect(reconcilingHost.findCanonicalReceipt({
      conversationId,
      actionId: actor.actionId,
      operation,
    }).standing).toBe("absent");

    // With the claim retracted, a plain spawn succeeds normally.
    const receipt = await loserRegistry.spawn(spawnInput(actor, operation));
    expect(receipt.key).toBe("publish-race");
    await waitFor(async () => {
      const projections = await loserRegistry.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "the re-claimed contribution settles");
  });

  test("an unconfirmed publication cleanup keeps the started marker uncommitted for every reader", async () => {
    const fixture_ = fixture();
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const operation = spawnOperation({ key: "cleanup-pending" });
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const receipt = await registry.spawn(spawnInput(actor, operation));
    await waitFor(async () => {
      const projections = await registry.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "the contribution settles");

    // A leftover publication temporary (an unconfirmed cleanup) makes the
    // marker uncommitted for every reader: a fresh registry refuses success.
    const directory = contributionStateDirectory(fixture_.home, conversationId);
    writeFileSync(join(directory, `started-${actor.actionId}.json.tmp-leftover`), "partial", "utf8");
    const restarted = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const error = await restarted.spawn(spawnInput(actor, operation)).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(ContributionError);
    if (error instanceof ContributionError) expect(error.code).toBe("contribution-unknown");
    const reconcilingHost = createConversationTaskOperationHost(fixture_.home, {
      contributionRegistry: restarted,
    });
    expect(reconcilingHost.findCanonicalReceipt({
      conversationId,
      actionId: actor.actionId,
      operation,
    }).standing).toBe("uninspectable");
    expect(receipt.batchId).toBeString();
  });

  test("a started-marker publication whose temporary removal fails surfaces the cleanup failure and commits no success", async () => {
    const fixture_ = fixture();
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const operation = spawnOperation({ key: "unlink-failure" });

    const loserRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    let loserSpawn: Promise<unknown> | undefined;
    const failingRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
      atomicPublish: {
        removeTemporary: (path) => {
          if (!path.includes(`started-${actor.actionId}.json`)) return;
          // The started marker is already durably hard-linked and the
          // directory fsynced: a concurrent reader must observe the marker
          // with its unremoved temporary as an uncommitted publication —
          // unknown, never success.
          loserSpawn = loserRegistry.spawn(spawnInput(actor, operation)).catch((value: unknown) => value);
          throw new Error("simulated publication temporary removal failure");
        },
      },
    });

    // The winner's marker publication is durably committed but its cleanup
    // fails: the spawn must fail visibly with the cleanup error and return
    // no success, never swallow the unconfirmed cleanup.
    const winnerError = await failingRegistry.spawn(spawnInput(actor, operation))
      .catch((value: unknown) => value);
    expect(winnerError).toBeInstanceOf(ContributionError);
    if (winnerError instanceof ContributionError) {
      expect(winnerError.message).toContain("temporary");
      expect(winnerError.message).toContain("could not be removed");
    }

    // The loser observed the marker link with its unremoved temporary and
    // yielded unknown, never a started receipt.
    const loserError = await loserSpawn!;
    expect(loserError).toBeInstanceOf(ContributionError);
    if (loserError instanceof ContributionError) {
      expect(loserError.code).toBe("contribution-unknown");
    }

    // Let the winner's canceled delegate reach its terminal settlement so
    // the two timeline writers cannot interleave before the re-claim.
    const timeline = new FileMissionTimeline(join(fixture_.home, "state", "conversation-contributions"));
    const winnerBatchId = await firstPreparedBatchId(timeline, conversationId);
    if (winnerBatchId !== undefined) {
      await waitForBatchSettled(timeline, conversationId, winnerBatchId);
    }

    // The winner retracted the marker, the reservation, and every leftover
    // publication temporary: no committed started record and no unconfirmed
    // litter remain, and the action is unclaimed, never settled.
    const directory = contributionStateDirectory(fixture_.home, conversationId);
    expect(existsSync(join(directory, `started-${actor.actionId}.json`))).toBe(false);
    expect(existsSync(join(directory, `spawn-${actor.actionId}.json`))).toBe(false);
    expect(readdirSync(directory).filter((entry) => entry.includes(".tmp-"))).toHaveLength(0);
    const reconcilingHost = createConversationTaskOperationHost(fixture_.home, {
      contributionRegistry: loserRegistry,
    });
    expect(reconcilingHost.findCanonicalReceipt({
      conversationId,
      actionId: actor.actionId,
      operation,
    }).standing).toBe("absent");

    // The failed publication poisoned nothing: the same action re-claims,
    // starts, and settles normally.
    const receipt = await loserRegistry.spawn(spawnInput(actor, operation));
    expect(receipt.key).toBe("unlink-failure");
    await waitFor(async () => {
      const projections = await loserRegistry.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "the re-claimed contribution settles");
  });

  test("a linked marker whose directory fsync fails retains its temporary: readers before retraction never see success", async () => {
    const fixture_ = fixture();
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const operation = spawnOperation({ key: "retained-temp" });

    const readerRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    let readerSpawn: Promise<unknown> | undefined;
    let readerStanding: ReturnType<ReturnType<typeof createConversationTaskOperationHost>["findCanonicalReceipt"]> | undefined;
    let directorySyncs = 0;
    const failingRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
      atomicPublish: {
        syncDirectory: () => {
          directorySyncs += 1;
          if (directorySyncs === 2) {
            throw new Error("simulated directory fsync failure");
          }
        },
        onRetainedTemporary: () => {
          // The temp-removal boundary is reached: the link exists, its
          // directory-fsync durability boundary failed, and the temporary
          // is retained. A second registry with normal durability seams
          // reads now, before the caller-owned retraction.
          const reconcilingHost = createConversationTaskOperationHost(fixture_.home, {
            contributionRegistry: readerRegistry,
          });
          readerStanding = reconcilingHost.findCanonicalReceipt({
            conversationId,
            actionId: actor.actionId,
            operation,
          });
          readerSpawn = readerRegistry.spawn(spawnInput(actor, operation))
            .catch((value: unknown) => value);
        },
      },
    });

    // The winner's marker publication fails after the link with its
    // durability boundary unproven: the temporary must be retained so the
    // concurrent reader cannot mistake the linked marker for success.
    await expect(failingRegistry.spawn(spawnInput(actor, operation))).rejects.toThrow();
    expect(readerStanding?.standing).toBe("uninspectable");
    const readerError = await readerSpawn!;
    expect(readerError).toBeInstanceOf(ContributionError);
    if (readerError instanceof ContributionError) {
      expect(readerError.code).toBe("contribution-unknown");
    }

    // The winner retracted the exact claim, every matching temporary, and
    // the reservation: no committed started record remains.
    const directory = contributionStateDirectory(fixture_.home, conversationId);
    expect(existsSync(join(directory, `started-${actor.actionId}.json`))).toBe(false);
    expect(existsSync(join(directory, `spawn-${actor.actionId}.json`))).toBe(false);
    expect(readdirSync(directory).filter((entry) => entry.includes(".tmp-"))).toHaveLength(0);
    const reconcilingHost = createConversationTaskOperationHost(fixture_.home, {
      contributionRegistry: readerRegistry,
    });
    expect(reconcilingHost.findCanonicalReceipt({
      conversationId,
      actionId: actor.actionId,
      operation,
    }).standing).toBe("absent");

    // The retracted claim poisoned nothing: the same action re-claims,
    // starts, and settles normally.
    const receipt = await readerRegistry.spawn(spawnInput(actor, operation));
    expect(receipt.key).toBe("retained-temp");
    await waitFor(async () => {
      const projections = await readerRegistry.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "the re-claimed contribution settles");
  });

  test("a failed-start effectful spawn waits for the cancelled delegate's settlement before releasing its lease", async () => {
    const fixture_ = fixture();
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const operation = spawnOperation({ key: "slow-cancelled-writer", effectKind: "effectful" });
    const replacementActor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const replacementOperation = spawnOperation({ key: "replacement-writer", effectKind: "effectful" });

    const replacementRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const timeline = new FileMissionTimeline(join(fixture_.home, "state", "conversation-contributions"));
    let replacementAttempt: Promise<unknown> | undefined;
    let notSettledInsideBoundary: boolean | undefined;
    let reservationHeldInsideBoundary: boolean | undefined;
    let directorySyncs = 0;
    const failingRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(slowContributionDriver),
      atomicPublish: {
        syncDirectory: () => {
          directorySyncs += 1;
          if (directorySyncs === 2) {
            throw new Error("simulated directory fsync failure");
          }
        },
      },
      onDelegateCancelled: () => {
        // The boundary between cancel() and the awaited settlement: the
        // effectful lease must still be held and the old delegate must
        // still be unsettled, so a concurrent writer is refused.
        const reservation = JSON.parse(readFileSync(join(
          contributionStateDirectory(fixture_.home, conversationId),
          `spawn-${actor.actionId}.json`,
        ), "utf8")) as { batchId: string };
        notSettledInsideBoundary = !timeline.hasTerminalSettlementSync(
          conversationId,
          contributionPreparedBatchId(conversationId, reservation.batchId),
          "slow-cancelled-writer",
        );
        reservationHeldInsideBoundary = existsSync(join(
          contributionStateDirectory(fixture_.home, conversationId),
          `spawn-${actor.actionId}.json`,
        ));
        replacementAttempt = replacementRegistry.spawn(
          spawnInput(replacementActor, replacementOperation),
        ).catch((value: unknown) => value);
      },
    });

    await expect(failingRegistry.spawn(spawnInput(actor, operation))).rejects.toThrow();

    // Inside the boundary the old delegate had not settled and the
    // reservation was still durable: the concurrent effectful writer was
    // lease-refused instead of overlapping a possibly-active worker.
    expect(notSettledInsideBoundary).toBe(true);
    expect(reservationHeldInsideBoundary).toBe(true);
    const refused = await replacementAttempt!;
    expect(refused).toBeInstanceOf(ContributionError);
    if (refused instanceof ContributionError) {
      expect(refused.code).toBe("effect-conflict");
    }

    // The winner's cleanup ran only after the old delegate actually
    // settled: everything is retracted and the replacement may now claim.
    const directory = contributionStateDirectory(fixture_.home, conversationId);
    expect(existsSync(join(directory, `started-${actor.actionId}.json`))).toBe(false);
    expect(existsSync(join(directory, `spawn-${actor.actionId}.json`))).toBe(false);
    const receipt = await replacementRegistry.spawn(spawnInput(replacementActor, replacementOperation));
    expect(receipt.key).toBe("replacement-writer");
    await waitFor(async () => {
      const projections = await replacementRegistry.listContributions(conversationId);
      return projections.find((entry) => entry.batchId === receipt.batchId)?.state !== "live";
    }, "the replacement writer settles");
  });

  test("a failed-start delegate whose terminal settlement cannot be confirmed retains the lease and fails closed", async () => {
    const fixture_ = fixture();
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const operation = spawnOperation({ key: "unconfirmed-writer", effectKind: "effectful" });
    const otherActor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const otherOperation = spawnOperation({ key: "other-writer", effectKind: "effectful" });

    const timeline = new FileMissionTimeline(join(fixture_.home, "state", "conversation-contributions"));
    let childTimelineFile: string | undefined;
    let directorySyncs = 0;
    const failingRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(slowContributionDriver),
      atomicPublish: {
        syncDirectory: () => {
          directorySyncs += 1;
          if (directorySyncs === 2) {
            // The cancelled delegate's terminal settlement recording will
            // fail against the read-only child timeline file: the terminal
            // stop cannot be confirmed.
            const reservation = JSON.parse(readFileSync(join(
              contributionStateDirectory(fixture_.home, conversationId),
              `spawn-${actor.actionId}.json`,
            ), "utf8")) as { batchId: string };
            const link = timeline.durableStartLinkSync(
              conversationId,
              contributionPreparedBatchId(conversationId, reservation.batchId),
            );
            expect(link).toBeDefined();
            if (link !== undefined) {
              childTimelineFile = timeline.timelinePath(link.childTimelineId);
              chmodSync(childTimelineFile, 0o400);
            }
            throw new Error("simulated directory fsync failure");
          }
        },
      },
    });

    const winnerError = await failingRegistry.spawn(spawnInput(actor, operation))
      .catch((value: unknown) => value);
    expect(winnerError).toBeInstanceOf(ContributionError);
    if (winnerError instanceof ContributionError) {
      expect(winnerError.code).toBe("effect-conflict");
      expect(winnerError.message).toContain("never reached a durable terminal settlement");
      expect(winnerError.message).toContain("reconcileLease");
    }

    // Restore the child timeline file so later reads and the fixture
    // teardown can proceed; the settlement failure already happened.
    if (childTimelineFile !== undefined) chmodSync(childTimelineFile, 0o644);

    // The exact lease and the durable spawn reservation stay retained as
    // reconcile-required evidence: the writer block is provably still up.
    const directory = contributionStateDirectory(fixture_.home, conversationId);
    const reservationPath = join(directory, `spawn-${actor.actionId}.json`);
    expect(existsSync(reservationPath)).toBe(true);
    const reservation = JSON.parse(readFileSync(reservationPath, "utf8")) as { lease?: { path: string } };
    expect(reservation.lease?.path).toBeString();
    if (reservation.lease?.path !== undefined) {
      expect(existsSync(reservation.lease.path)).toBe(true);
    }
    const otherRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const refused = await otherRegistry.spawn(spawnInput(otherActor, otherOperation))
      .catch((value: unknown) => value);
    expect(refused).toBeInstanceOf(ContributionError);
    if (refused instanceof ContributionError) {
      expect(refused.code).toBe("effect-conflict");
    }
    const reconcilingHost = createConversationTaskOperationHost(fixture_.home, {
      contributionRegistry: otherRegistry,
    });
    expect(reconcilingHost.findCanonicalReceipt({
      conversationId,
      actionId: actor.actionId,
      operation,
    }).standing).toBe("uninspectable");
  });

  test("a lease-release failure after delegate settlement retains the exact reservation and recovers only through the contribution reconcile CLI", async () => {
    const fixture_ = fixture();
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const operation = spawnOperation({ key: "release-failure-writer", effectKind: "effectful" });

    // Force the started-marker publication failure AND corrupt the exact
    // retained lease so the later exact-byte release fails after the
    // cancelled delegate settles.
    let directorySyncs = 0;
    const failingRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(slowContributionDriver),
      atomicPublish: {
        syncDirectory: () => {
          directorySyncs += 1;
          if (directorySyncs === 2) {
            const reservation = JSON.parse(readFileSync(join(
              contributionStateDirectory(fixture_.home, conversationId),
              `spawn-${actor.actionId}.json`,
            ), "utf8")) as { lease?: { path: string; worktree: string; taskId: string; attemptId: string } };
            const binding = reservation.lease;
            expect(binding).toBeDefined();
            if (binding !== undefined) {
              writeFileSync(binding.path, `${JSON.stringify({
                version: "rosso.task-run-worktree-lease.v1",
                worktree: binding.worktree,
                taskId: binding.taskId,
                attemptId: binding.attemptId,
                pid: process.pid,
                acquiredAt: new Date().toISOString(),
              }, null, 2)}\n`, "utf8");
            }
            throw new Error("simulated started-marker publication failure");
          }
        },
      },
    });

    const winnerError = await failingRegistry.spawn(spawnInput(actor, operation))
      .catch((value: unknown) => value);
    expect(winnerError).toBeInstanceOf(ContributionError);
    if (winnerError instanceof ContributionError) {
      expect(winnerError.code).toBe("effect-conflict");
      expect(winnerError.message).toContain("reconcile-required");
      expect(winnerError.message).toContain("simulated started-marker publication failure");
      expect(winnerError.message).toContain("could not be released");
    }

    // The exact lease and the matching durable reservation remain: the
    // reservation is the exact recoverable lease binding and is deleted only
    // after a confirmed release. Only the uncommitted started marker (and
    // its temporaries) was retracted.
    const directory = contributionStateDirectory(fixture_.home, conversationId);
    const reservationPath = join(directory, `spawn-${actor.actionId}.json`);
    expect(existsSync(reservationPath)).toBe(true);
    expect(existsSync(join(directory, `started-${actor.actionId}.json`))).toBe(false);
    expect(readdirSync(directory).filter((entry) => entry.includes(".tmp-"))).toHaveLength(0);
    const reservation = JSON.parse(readFileSync(reservationPath, "utf8")) as {
      batchId: string;
      lease?: { path: string; worktree: string; taskId: string; attemptId: string };
    };
    const binding = reservation.lease;
    expect(binding).toBeDefined();
    if (binding === undefined) return;
    expect(existsSync(binding.path)).toBe(true);
    const leaseRecord = JSON.parse(readFileSync(binding.path, "utf8")) as Record<string, unknown>;
    expect(leaseRecord.worktree).toBe(binding.worktree);
    expect(leaseRecord.taskId).toBe(binding.taskId);
    expect(leaseRecord.attemptId).toBe(binding.attemptId);

    const reconcile = (batchId: string, key: string): { outcome: string; reason: string } => {
      const result = Bun.spawnSync([
        process.execPath,
        cliPath(),
        "--home",
        fixture_.home,
        "contribution",
        "reconcile-lease",
        conversationId,
        batchId,
        key,
      ], { stdout: "pipe", stderr: "pipe" });
      return JSON.parse(result.stdout.toString()) as { outcome: string; reason: string };
    };

    // Mismatched key and unknown batch fail closed through the real CLI.
    expect(reconcile(reservation.batchId, "wrong-key").outcome).toBe("refused");
    expect(reconcile(randomUUID(), "release-failure-writer").outcome).toBe("refused");

    // With the owner PID made provably absent, the real production CLI
    // releases the exact lease; nothing else was touched.
    writeFileSync(binding.path, `${JSON.stringify({
      version: "rosso.task-run-worktree-lease.v1",
      worktree: binding.worktree,
      taskId: binding.taskId,
      attemptId: binding.attemptId,
      pid: 999_999_999,
      acquiredAt: new Date().toISOString(),
    }, null, 2)}\n`, "utf8");
    const released = reconcile(reservation.batchId, "release-failure-writer");
    expect(released.outcome).toBe("released");
    expect(existsSync(binding.path)).toBe(false);
    expect(existsSync(reservationPath)).toBe(true);
  });

  test("a started marker with any mutated shared identity is unknown for convergence and uninspectable for canonical lookup", async () => {
    const mutations: ReadonlyArray<{
      readonly label: string;
      readonly mutate: (
        started: Record<string, unknown>,
        reservation: Record<string, unknown>,
        conversationId: string,
      ) => void;
    }> = [
      {
        label: "workerId",
        mutate: (started) => {
          started.workerId = randomUUID();
        },
      },
      {
        label: "taskRevision",
        mutate: (started) => {
          started.taskRevision = Number(started.taskRevision) + 1;
        },
      },
      {
        label: "sourceRef",
        mutate: (started) => {
          started.sourceRef = "mutated:source-ref";
        },
      },
      {
        label: "preparedBatchId",
        mutate: (started, _reservation, conversationId) => {
          const start = started.start as { preparedBatchId: string; checkpointDigest: string };
          start.preparedBatchId = contributionPreparedBatchId(conversationId, randomUUID());
        },
      },
      {
        label: "child cell identity",
        mutate: (started, reservation) => {
          const wrongCellId = randomUUID();
          started.cellId = wrongCellId;
          reservation.cellId = wrongCellId;
        },
      },
    ];
    for (const mutation of mutations) {
      const fixture_ = fixture();
      const conversationId = randomUUID();
      await seedTaskAction(fixture_.home, conversationId, fixture_);
      const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
      const operation = spawnOperation({ key: `mutation-${mutation.label}` });

      const registry = createConversationContributionRegistry(fixture_.home, {
        catalog: fakeCatalog(),
      });
      const receipt = await registry.spawn(spawnInput(actor, operation));
      await waitFor(async () => {
        const projections = await registry.listContributions(conversationId);
        return projections.every((entry) => entry.state === "settled");
      }, `the ${mutation.label} contribution settles`);

      // Mutate the durable started marker (and, for the child-identity
      // case, the matching reservation) in place.
      const directory = contributionStateDirectory(fixture_.home, conversationId);
      const markerPath = join(directory, `started-${actor.actionId}.json`);
      const reservationPath = join(directory, `spawn-${actor.actionId}.json`);
      const started = JSON.parse(readFileSync(markerPath, "utf8")) as Record<string, unknown>;
      const reservation = JSON.parse(readFileSync(reservationPath, "utf8")) as Record<string, unknown>;
      mutation.mutate(started, reservation, conversationId);
      writeFileSync(markerPath, JSON.stringify(started), "utf8");
      writeFileSync(reservationPath, JSON.stringify(reservation), "utf8");

      // Convergence never yields a started receipt for a mutated marker.
      const restarted = createConversationContributionRegistry(fixture_.home, {
        catalog: fakeCatalog(),
      });
      const error = await restarted.spawn(spawnInput(actor, operation))
        .catch((value: unknown) => value);
      expect(error).toBeInstanceOf(ContributionError);
      if (error instanceof ContributionError) {
        expect(error.code).toBe("contribution-unknown");
      }

      // Canonical lookup never settles a mutated marker.
      const reconcilingHost = createConversationTaskOperationHost(fixture_.home, {
        contributionRegistry: restarted,
      });
      expect(reconcilingHost.findCanonicalReceipt({
        conversationId,
        actionId: actor.actionId,
        operation,
      }).standing).toBe("uninspectable");
      expect(receipt.batchId).toBeString();
    }
  }, 60_000);

  test("a reservation durability failure publishes no claim and returns no success", async () => {
    const fixture_ = fixture();
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const operation = spawnOperation({ key: "durability-refused" });

    // The temp-file fsync seam fails: nothing is published and no success
    // is returned.
    const fileFailing = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
      atomicPublish: { syncFile: () => { throw new Error("fsync seam failed"); } },
    });
    await expect(fileFailing.spawn(spawnInput(actor, operation))).rejects.toThrow();
    const directory = contributionStateDirectory(fixture_.home, conversationId);
    expect(existsSync(join(directory, `spawn-${actor.actionId}.json`))).toBe(false);
    expect(existsSync(join(directory, `started-${actor.actionId}.json`))).toBe(false);
    expect(readContributionSpawnReceipts(fixture_.home, conversationId)).toHaveLength(0);

    // The parent-directory fsync seam fails after the link: the published
    // reservation is retracted and no success is returned.
    const dirFailing = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
      atomicPublish: { syncDirectory: () => { throw new Error("directory fsync seam failed"); } },
    });
    await expect(dirFailing.spawn(spawnInput(actor, operation))).rejects.toThrow();
    expect(existsSync(join(directory, `spawn-${actor.actionId}.json`))).toBe(false);
    expect(existsSync(join(directory, `started-${actor.actionId}.json`))).toBe(false);

    // The action is unclaimed: a plain registry spawns it successfully with
    // the ordered durability steps (file fsync, then directory fsync) for
    // both the reservation and the started marker.
    const ordered: Array<"file" | "directory"> = [];
    const orderedRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
      atomicPublish: {
        syncFile: (path) => {
          expect(path).toContain(".tmp-");
          ordered.push("file");
        },
        syncDirectory: () => ordered.push("directory"),
      },
    });
    const receipt = await orderedRegistry.spawn(spawnInput(actor, operation));
    expect(receipt.batchId).toBeString();
    expect(ordered).toEqual(["file", "directory", "file", "directory"]);
    await waitFor(async () => {
      const projections = await orderedRegistry.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "the ordered-durability contribution settles");
  });

  describe("the contribution reconcile-lease CLI command is the production recovery owner", () => {
    test("releases a crash-retained lease whose recorded owner is verifiably absent", async () => {
      const scenario = await reconcileCliScenario("cli-writer");
      scenario.writeLease(crashRetainedLease(scenario.binding, 999_999_999));
      const released = scenario.reconcile(scenario.batchId, scenario.key);
      expect(released.exitCode).toBe(0);
      expect(JSON.parse(released.stdout).outcome).toBe("released");
      expect(existsSync(scenario.leasePath)).toBe(false);
    });

    test("reports not-retained for an already-absent lease and never re-acquires", async () => {
      const scenario = await reconcileCliScenario("cli-writer");
      const absent = scenario.reconcile(scenario.batchId, scenario.key);
      expect(JSON.parse(absent.stdout).outcome).toBe("not-retained");
    });

    test("fails closed while the recorded owner process is still alive", async () => {
      const scenario = await reconcileCliScenario("cli-writer");
      scenario.writeLease(crashRetainedLease(scenario.binding, process.pid));
      const live = scenario.reconcile(scenario.batchId, scenario.key);
      expect(live.exitCode).toBe(0);
      expect(JSON.parse(live.stdout).outcome).toBe("refused");
    });

    test("fails closed on a mismatched owner identity", async () => {
      const scenario = await reconcileCliScenario("cli-writer");
      scenario.writeLease(crashRetainedLease({ ...scenario.binding, attemptId: "another-attempt" }, 999_999_999));
      const mismatch = scenario.reconcile(scenario.batchId, scenario.key);
      expect(JSON.parse(mismatch.stdout).outcome).toBe("refused");
    });

    test("fails closed on an unreadable lease without guessing", async () => {
      const scenario = await reconcileCliScenario("cli-writer");
      writeFileSync(scenario.leasePath, "not-json-bytes", "utf8");
      const unreadable = scenario.reconcile(scenario.batchId, scenario.key);
      expect(JSON.parse(unreadable.stdout).outcome).toBe("refused");
    });

    test("refuses an unknown batch/key through the real CLI", async () => {
      const scenario = await reconcileCliScenario("cli-writer");
      const unknown = scenario.reconcile(randomUUID(), "never-formed");
      expect(JSON.parse(unknown.stdout).outcome).toBe("refused");
    });

    test("the exact dead-owner release re-enables a fresh effectful contribution", async () => {
      const scenario = await reconcileCliScenario("cli-writer");
      scenario.writeLease(crashRetainedLease(scenario.binding, 999_999_999));
      const finalRelease = scenario.reconcile(scenario.batchId, scenario.key);
      expect(JSON.parse(finalRelease.stdout).outcome).toBe("released");
      expect(existsSync(scenario.leasePath)).toBe(false);

      const replacementRegistry = createConversationContributionRegistry(scenario.home, {
        catalog: fakeCatalog(),
      });
      const replacement = await replacementRegistry.spawn(spawnInput(
        { conversationId: scenario.conversationId, turnId: randomUUID(), actionId: randomUUID() },
        spawnOperation({ key: "cli-replacement", effectKind: "effectful" }),
      ));
      expect(replacement.effectKind).toBe("effectful");
      await waitFor(async () => {
        const projections = await replacementRegistry.listContributions(scenario.conversationId);
        return projections.find((entry) => entry.batchId === replacement.batchId)?.state === "settled";
      }, "the CLI-recovered contribution settles");
    });
  });

  test("dependsOn admits only durably settled dependencies at the current Task revision", async () => {
    const fixture_ = fixture();
    const gated = gatedContributionDriver();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(() => gated.driver),
    });
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);

    // A live (not terminally settled) dependency is refused.
    await registry.spawn(spawnInput(
      { conversationId, turnId: randomUUID(), actionId: randomUUID() },
      spawnOperation({ key: "dep-live" }),
    ));
    await expect(registry.spawn(spawnInput(
      { conversationId, turnId: randomUUID(), actionId: randomUUID() },
      spawnOperation({ key: "dep-on-live", dependsOn: ["dep-live"] }),
    ))).rejects.toThrowError(ContributionError);

    // An unknown dependency with no current contribution is refused.
    await expect(registry.spawn(spawnInput(
      { conversationId, turnId: randomUUID(), actionId: randomUUID() },
      spawnOperation({ key: "dep-on-unknown", dependsOn: ["never-formed"] }),
    ))).rejects.toThrowError(ContributionError);

    // Once the dependency terminally settles, a dependent contribution is
    // admitted with the exact settled key in its delegate admission evidence.
    gated.release();
    await waitFor(async () => {
      const projections = await registry.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "dependency settles");
    const dependentReceipt = await registry.spawn(spawnInput(
      { conversationId, turnId: randomUUID(), actionId: randomUUID() },
      spawnOperation({ key: "dep-on-settled", dependsOn: ["dep-live"] }),
    ));
    await waitFor(async () => {
      const projections = await registry.listContributions(conversationId);
      return projections.find((entry) => entry.batchId === dependentReceipt.batchId)?.state === "settled";
    }, "dependent settles");
    const timeline = new FileMissionTimeline(join(fixture_.home, "state", "conversation-contributions"));
    const recovered = await timeline.recoverBatch(
      conversationId,
      contributionPreparedBatchId(conversationId, dependentReceipt.batchId),
    );
    expect(recovered.ready).toBe(true);
    expect(recovered.checkpoint.admission.whole.settledContributionKeys).toEqual(["dep-live"]);

    // A Task correction moves the revision: the previously settled
    // dependency is stale and refused for the corrected Task.
    const source = loadPrincipalTasks(fixture_.home);
    const corrected = correctPrincipalTask(fixture_.home, {
      id: fixture_.taskId,
      expectedSourceRevision: source.sourceRevision,
      expectedRevision: source.tasks[0]!.revision,
      statement: "The corrected fixture objective.",
      sourceRef: "test:correction",
      nextActor: "agent",
    });
    expect(corrected.task.revision).toBe(fixture_.taskRevision + 1);
    await expect(registry.spawn(spawnInput(
      { conversationId, turnId: randomUUID(), actionId: randomUUID() },
      spawnOperation({ key: "dep-on-stale", dependsOn: ["dep-live"] }),
    ))).rejects.toThrowError(ContributionError);
  });

  test("a dependency terminal line counts only after the timeline durability barrier is joined", async () => {
    const fixture_ = fixture();
    const joinedPaths: string[] = [];
    let failBarrier = false;
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
      timelineSyncDurability: (path) => {
        if (failBarrier) throw new Error("durability barrier failed");
        joinedPaths.push(path);
      },
    });
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);

    // Settle one dependency, then admit a dependent: the synchronous
    // eligibility check must join the timeline writer durability boundary on
    // every timeline file it reads before accepting the terminal line.
    await registry.spawn(spawnInput(
      { conversationId, turnId: randomUUID(), actionId: randomUUID() },
      spawnOperation({ key: "barrier-dep" }),
    ));
    await waitFor(async () => {
      const projections = await registry.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "dependency settles");
    await registry.spawn(spawnInput(
      { conversationId, turnId: randomUUID(), actionId: randomUUID() },
      spawnOperation({ key: "barrier-dependent", dependsOn: ["barrier-dep"] }),
    ));
    const timeline = new FileMissionTimeline(join(fixture_.home, "state", "conversation-contributions"));
    const parentPath = realpathSync(timeline.timelinePath(conversationId));
    expect(joinedPaths).toContain(parentPath);
    expect(joinedPaths.some((path) => path !== parentPath && path.endsWith(".jsonl"))).toBe(true);

    // A barrier that cannot be joined (fsync-pending equivalent) refuses the
    // dependency fail-closed instead of accepting unverified settlement.
    failBarrier = true;
    await expect(registry.spawn(spawnInput(
      { conversationId, turnId: randomUUID(), actionId: randomUUID() },
      spawnOperation({ key: "barrier-refused", dependsOn: ["barrier-dep"] }),
    ))).rejects.toThrowError(ContributionError);
  });

  test("two concurrent processes converging on one effectful spawn share one worker, one lease owner, and one identical receipt", async () => {
    const fixture_ = fixture();
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const counterPath = join(fixture_.root, "worker-starts.txt");

    const scriptPath = join(fixture_.root, "concurrent-spawn-child.ts");
    writeFileSync(scriptPath, concurrentChildScript(), "utf8");

    const run = async (): Promise<{
      ok: boolean;
      batchId?: string;
      key?: string;
      started?: boolean;
      error?: string;
    }> => {
      const proc = Bun.spawn([
        process.execPath,
        scriptPath,
        fixture_.home,
        conversationId,
        actor.turnId,
        actor.actionId,
        "concurrent-effectful",
        counterPath,
      ], { stdout: "pipe", stderr: "pipe" });
      const code = await proc.exited;
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      if (code !== 0) throw new Error(`concurrent child failed (${code}): ${stderr}`);
      return JSON.parse(stdout.trim()) as {
        ok: boolean;
        batchId?: string;
        key?: string;
        started?: boolean;
        error?: string;
      };
    };

    const [first, second] = await Promise.all([run(), run()]);

    // Both processes converge on the exact winner receipt: identical
    // batch/key identity, exactly one started executor (one worker under the
    // one reserved lease owner), and one durable reservation.
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.batchId).toBe(first.batchId);
    expect(second.key).toBe(first.key);
    expect([first.started, second.started].filter((started) => started === true)).toHaveLength(1);
    expect(readContributionSpawnReceipts(fixture_.home, conversationId)).toHaveLength(1);
    expect(readFileSync(counterPath, "utf8").trim().split("\n").filter(Boolean)).toHaveLength(1);

    const spawnRecord = JSON.parse(readFileSync(join(
      contributionStateDirectory(fixture_.home, conversationId),
      `spawn-${actor.actionId}.json`,
    ), "utf8")) as Record<string, unknown>;
    const leaseRecord = spawnRecord.lease as Record<string, unknown>;
    expect(leaseRecord.attemptId).toBe(first.batchId);
    expect(spawnRecord.effectKind).toBe("effectful");
  }, 30_000);

  test.skipIf(typeof process.getuid === "function" && process.getuid() === 0)("a failed terminal lease release marks the contribution unresolved; reconcileLease is the exact recovery owner", async () => {
    const fixture_ = fixture();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(slowContributionDriver),
    });
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const receipt = await registry.spawn(spawnInput(
      actor,
      spawnOperation({ key: "stuck-writer", effectKind: "effectful" }),
    ));

    // The spawn reservation retains the exact lease binding published before
    // acquisition.
    const reservationPath = join(
      contributionStateDirectory(fixture_.home, conversationId),
      `spawn-${actor.actionId}.json`,
    );
    const spawnRecord = JSON.parse(readFileSync(reservationPath, "utf8")) as Record<string, unknown>;
    const leaseRecord = spawnRecord.lease as Record<string, unknown>;
    expect(leaseRecord.taskId).toBe(fixture_.taskId);
    expect(leaseRecord.attemptId).toBe(receipt.batchId);
    expect(leaseRecord.path).toBeString();

    // The exact release is made impossible without touching the lease
    // bytes: the Git metadata directory becomes read-only, so the exact
    // byte-match unlink fails and the terminal settlement fails closed
    // instead of hiding the retained lock.
    const gitDirectory = dirname(String(leaseRecord.path));
    chmodSync(gitDirectory, 0o555);
    try {
      const handle = registry.contribution(receipt.batchId, "stuck-writer");
      registry.control({ batchId: receipt.batchId, key: "stuck-writer", control: "stop", actor });
      await waitFor(() => handle!.liveness().state !== "live", "the stopped contribution reaches terminal liveness");
      const liveness = handle!.liveness();
      expect(liveness.state).toBe("unresolved");
      if (liveness.state === "unresolved") {
        expect(liveness.settlement.error).toContain("reconcile-required");
        expect(liveness.settlement.error).toContain(String(leaseRecord.path));
      }
      const projection = (await registry.listContributions(conversationId))
        .find((entry) => entry.batchId === receipt.batchId);
      expect(projection?.state).toBe("unresolved");
    } finally {
      chmodSync(gitDirectory, 0o755);
    }

    // The retained owner process is still alive: reconciliation fails closed.
    const liveRefusal = registry.reconcileLease({ conversationId, batchId: receipt.batchId, key: "stuck-writer" });
    expect(liveRefusal.outcome).toBe("refused");
    if (liveRefusal.outcome === "refused") expect(liveRefusal.reason).toContain("still alive");

    // Once the owner process is verifiably absent, the exact release
    // succeeds through the contribution-owned reconcile operation.
    const leasePath = String(leaseRecord.path);
    const retained = JSON.parse(readFileSync(leasePath, "utf8")) as Record<string, unknown>;
    writeFileSync(leasePath, `${JSON.stringify({ ...retained, pid: 999_999_999 }, null, 2)}\n`, "utf8");
    const recovery = registry.reconcileLease({ conversationId, batchId: receipt.batchId, key: "stuck-writer" });
    expect(recovery.outcome).toBe("released");
    if (recovery.outcome === "released") expect(recovery.leasePath).toBe(leasePath);
    expect(existsSync(leasePath)).toBe(false);

    // Recoverability: with the retained lease released, a fresh effectful
    // contribution on the same Task/Worktree is admitted again.
    const replacementRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const replacement = await replacementRegistry.spawn(spawnInput(
      { conversationId, turnId: randomUUID(), actionId: randomUUID() },
      spawnOperation({ key: "replacement-writer", effectKind: "effectful" }),
    ));
    expect(replacement.effectKind).toBe("effectful");
    await waitFor(async () => {
      const projections = await replacementRegistry.listContributions(conversationId);
      return projections.find((entry) => entry.batchId === replacement.batchId)?.state === "settled";
    }, "the replacement settles");
  });

  test("reconcileLease recovers a crash-retained lock and fails closed on mismatch, live, and absent owners", async () => {
    const fixture_ = fixture();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const receipt = await registry.spawn(spawnInput(
      actor,
      spawnOperation({ key: "crash-writer", effectKind: "effectful" }),
    ));
    await waitFor(async () => {
      const projections = await registry.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "contribution settles");

    // The exact lease path and owner identity come from the durable
    // reservation binding published before acquisition; the crash-retained
    // lease is simulated with a verifiably absent owner pid.
    const reservationPath = join(
      contributionStateDirectory(fixture_.home, conversationId),
      `spawn-${actor.actionId}.json`,
    );
    const spawnRecord = JSON.parse(readFileSync(reservationPath, "utf8")) as Record<string, unknown>;
    const binding = spawnRecord.lease as Record<string, unknown>;
    const leasePath = String(binding.path);
    expect(existsSync(leasePath)).toBe(false);
    writeFileSync(leasePath, `${JSON.stringify({
      version: "rosso.task-run-worktree-lease.v1",
      worktree: binding.worktree,
      taskId: binding.taskId,
      attemptId: binding.attemptId,
      pid: 999_999_999,
      acquiredAt: new Date().toISOString(),
    }, null, 2)}\n`, "utf8");

    // The reconcile owner releases the exact retained lease.
    const recovery = registry.reconcileLease({ conversationId, batchId: receipt.batchId, key: "crash-writer" });
    expect(recovery.outcome).toBe("released");
    expect(existsSync(leasePath)).toBe(false);

    // An already-absent lease is not-retained, never re-acquired.
    const absent = registry.reconcileLease({ conversationId, batchId: receipt.batchId, key: "crash-writer" });
    expect(absent.outcome).toBe("not-retained");

    // A mismatched owner identity is refused fail-closed.
    writeFileSync(leasePath, `${JSON.stringify({
      version: "rosso.task-run-worktree-lease.v1",
      worktree: binding.worktree,
      taskId: binding.taskId,
      attemptId: "another-attempt",
      pid: 999_999_999,
      acquiredAt: new Date().toISOString(),
    }, null, 2)}\n`, "utf8");
    const mismatch = registry.reconcileLease({ conversationId, batchId: receipt.batchId, key: "crash-writer" });
    expect(mismatch.outcome).toBe("refused");
    if (mismatch.outcome === "refused") expect(mismatch.reason).toContain("different owner");

    // A live owner is refused fail-closed.
    writeFileSync(leasePath, `${JSON.stringify({
      version: "rosso.task-run-worktree-lease.v1",
      worktree: binding.worktree,
      taskId: binding.taskId,
      attemptId: binding.attemptId,
      pid: process.pid,
      acquiredAt: new Date().toISOString(),
    }, null, 2)}\n`, "utf8");
    const live = registry.reconcileLease({ conversationId, batchId: receipt.batchId, key: "crash-writer" });
    expect(live.outcome).toBe("refused");
    if (live.outcome === "refused") expect(live.reason).toContain("still alive");

    // Unknown batch/key identities are refused without guessing.
    const unknown = registry.reconcileLease({ conversationId, batchId: randomUUID(), key: "never-formed" });
    expect(unknown.outcome).toBe("refused");
  });

  test("a restarted registry projects a timeline-settled contribution with a retained lease as unresolved reconcile-required", async () => {
    const fixture_ = fixture();
    const first = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const receipt = await first.spawn(spawnInput(
      actor,
      spawnOperation({ key: "crash-writer", effectKind: "effectful" }),
    ));
    await waitFor(async () => {
      const projections = await first.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "contribution settles");
    const reservationPath = join(
      contributionStateDirectory(fixture_.home, conversationId),
      `spawn-${actor.actionId}.json`,
    );
    const spawnRecord = JSON.parse(readFileSync(reservationPath, "utf8")) as Record<string, unknown>;
    const leaseRecord = spawnRecord.lease as Record<string, unknown>;

    // Simulate the crash-retained lease: the exact owner fields stay matched
    // while the recorded pid is verifiably absent.
    writeFileSync(String(leaseRecord.path), `${JSON.stringify({
      version: "rosso.task-run-worktree-lease.v1",
      worktree: leaseRecord.worktree,
      taskId: leaseRecord.taskId,
      attemptId: leaseRecord.attemptId,
      pid: 999_999_999,
      acquiredAt: new Date().toISOString(),
    }, null, 2)}\n`, "utf8");

    const restarted = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const projections = await restarted.listContributions(conversationId);
    const projection = projections.find((entry) => entry.batchId === receipt.batchId);
    expect(projection?.state).toBe("unresolved");
    expect(projection?.status).toContain("reconcile-required");
  });

  test("reconcileLease refuses and never deletes retained claims that violate the strict O3 schema", async () => {
    const fixture_ = fixture();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const receipt = await registry.spawn(spawnInput(
      actor,
      spawnOperation({ key: "schema-refused-writer", effectKind: "effectful" }),
    ));
    await waitFor(async () => {
      const projections = await registry.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "contribution settles");

    const reservationPath = join(
      contributionStateDirectory(fixture_.home, conversationId),
      `spawn-${actor.actionId}.json`,
    );
    const spawnRecord = JSON.parse(readFileSync(reservationPath, "utf8")) as Record<string, unknown>;
    const binding = spawnRecord.lease as Record<string, unknown>;
    const leasePath = String(binding.path);
    const claim = (record: Record<string, unknown>): string =>
      `${JSON.stringify(record, null, 2)}\n`;

    // A wrong-version claim with matching owner identity and a provably
    // absent pid is refused and never deleted.
    const wrongVersion = claim({
      version: "some-other.version",
      worktree: binding.worktree,
      taskId: binding.taskId,
      attemptId: binding.attemptId,
      pid: 999_999_999,
      acquiredAt: new Date().toISOString(),
    });
    writeFileSync(leasePath, wrongVersion, "utf8");
    const wrongVersionRecovery = registry.reconcileLease({
      conversationId,
      batchId: receipt.batchId,
      key: receipt.key,
    });
    expect(wrongVersionRecovery.outcome).toBe("refused");
    expect(existsSync(leasePath)).toBe(true);
    expect(readFileSync(leasePath, "utf8")).toBe(wrongVersion);

    // A missing-field claim (no acquiredAt) with matching owner identity
    // is refused and never deleted.
    const missingField = claim({
      version: "rosso.task-run-worktree-lease.v1",
      worktree: binding.worktree,
      taskId: binding.taskId,
      attemptId: binding.attemptId,
      pid: 999_999_999,
    });
    writeFileSync(leasePath, missingField, "utf8");
    const missingRecovery = registry.reconcileLease({
      conversationId,
      batchId: receipt.batchId,
      key: receipt.key,
    });
    expect(missingRecovery.outcome).toBe("refused");
    expect(existsSync(leasePath)).toBe(true);
    expect(readFileSync(leasePath, "utf8")).toBe(missingField);
  });

  test("reconcileLease never deletes a claim bound to a reservation-recorded noncanonical path and keeps it unreconciled", async () => {
    const fixture_ = fixture();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const receipt = await registry.spawn(spawnInput(
      actor,
      spawnOperation({ key: "noncanonical-writer", effectKind: "effectful" }),
    ));
    await waitFor(async () => {
      const projections = await registry.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "contribution settles");

    const directory = contributionStateDirectory(fixture_.home, conversationId);
    const reservationPath = join(directory, `spawn-${actor.actionId}.json`);
    const spawnRecord = JSON.parse(readFileSync(reservationPath, "utf8")) as Record<string, unknown>;
    const binding = spawnRecord.lease as Record<string, unknown>;
    const canonicalPath = worktreeWriterLeasePath(String(binding.worktree));
    expect(String(binding.path)).toBe(canonicalPath);

    // Corrupt the durable reservation's recorded claim path to a
    // noncanonical location and place a dead-owner claim there.
    const noncanonical = join(fixture_.root, "noncanonical.lock");
    writeFileSync(reservationPath, `${JSON.stringify({
      ...spawnRecord,
      lease: { ...binding, path: noncanonical },
    }, null, 2)}\n`, "utf8");
    const noncanonicalBytes = `${JSON.stringify({
      version: "rosso.task-run-worktree-lease.v1",
      worktree: binding.worktree,
      taskId: binding.taskId,
      attemptId: binding.attemptId,
      pid: 999_999_999,
      acquiredAt: new Date().toISOString(),
    }, null, 2)}\n`;
    writeFileSync(noncanonical, noncanonicalBytes, "utf8");

    // Recovery refuses the noncanonical binding and deletes nothing: the
    // claim at the noncanonical path remains byte-identical and the exact
    // canonical path stays absent.
    const recovery = registry.reconcileLease({
      conversationId,
      batchId: receipt.batchId,
      key: receipt.key,
    });
    expect(recovery.outcome).toBe("refused");
    if (recovery.outcome === "refused") expect(recovery.reason).toContain("canonical");
    expect(existsSync(noncanonical)).toBe(true);
    expect(readFileSync(noncanonical, "utf8")).toBe(noncanonicalBytes);
    expect(existsSync(canonicalPath)).toBe(false);

    // The no-handle standing projection fails closed the same way: the
    // noncanonical binding keeps the contribution unresolved, never
    // settled.
    const restarted = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const projections = await restarted.listContributions(conversationId);
    const projection = projections.find((entry) => entry.batchId === receipt.batchId);
    expect(projection?.state).toBe("unresolved");
    expect(projection?.status).toContain("reconcile-required");
  });

  test("a valid different successor owner does not make the prior contribution falsely unresolved", async () => {
    const fixture_ = fixture();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const receipt = await registry.spawn(spawnInput(
      actor,
      spawnOperation({ key: "successor-writer", effectKind: "effectful" }),
    ));
    await waitFor(async () => {
      const projections = await registry.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "contribution settles");

    // The exact prior claim was released at settlement: the canonical path
    // is free and a different valid owner acquires it.
    const worktree = realpathSync(fixture_.worktree);
    const canonicalPath = worktreeWriterLeasePath(worktree);
    expect(existsSync(canonicalPath)).toBe(false);
    const successor = acquireWorktreeWriterLease(worktree, {
      taskId: "successor-task",
      attemptId: randomUUID(),
    });

    // A restarted registry projects the settled prior contribution as
    // settled, not unresolved: the valid successor claim proves the prior
    // owner's claim was released rather than retained.
    const restarted = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const projections = await restarted.listContributions(conversationId);
    const projection = projections.find((entry) => entry.batchId === receipt.batchId);
    expect(projection?.state).toBe("settled");

    // Recovery refuses the successor's valid claim without deleting it.
    const recovery = restarted.reconcileLease({
      conversationId,
      batchId: receipt.batchId,
      key: receipt.key,
    });
    expect(recovery.outcome).toBe("refused");
    if (recovery.outcome === "refused") expect(recovery.reason).toContain("different owner");
    expect(readFileSync(canonicalPath, "utf8")).toBe(successor.content);
    releaseWorktreeWriterLease(successor);
  });

  test("a restarted registry keeps a schema-invalid retained claim unresolved and never deletes it", async () => {
    const fixture_ = fixture();
    const first = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const receipt = await first.spawn(spawnInput(
      actor,
      spawnOperation({ key: "invalid-schema-writer", effectKind: "effectful" }),
    ));
    await waitFor(async () => {
      const projections = await first.listContributions(conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "contribution settles");

    const reservationPath = join(
      contributionStateDirectory(fixture_.home, conversationId),
      `spawn-${actor.actionId}.json`,
    );
    const spawnRecord = JSON.parse(readFileSync(reservationPath, "utf8")) as Record<string, unknown>;
    const leaseRecord = spawnRecord.lease as Record<string, unknown>;
    const leasePath = String(leaseRecord.path);
    const claim = (record: Record<string, unknown>): string =>
      `${JSON.stringify(record, null, 2)}\n`;

    const restarted = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });

    // A wrong-version retained claim keeps the projection unresolved.
    writeFileSync(leasePath, claim({
      version: "some-other.version",
      worktree: leaseRecord.worktree,
      taskId: leaseRecord.taskId,
      attemptId: leaseRecord.attemptId,
      pid: 999_999_999,
      acquiredAt: new Date().toISOString(),
    }), "utf8");
    const wrongVersionProjection = (await restarted.listContributions(conversationId))
      .find((entry) => entry.batchId === receipt.batchId);
    expect(wrongVersionProjection?.state).toBe("unresolved");
    expect(wrongVersionProjection?.status).toContain("reconcile-required");
    expect(existsSync(leasePath)).toBe(true);

    // A missing-field retained claim keeps the projection unresolved too.
    writeFileSync(leasePath, claim({
      version: "rosso.task-run-worktree-lease.v1",
      worktree: leaseRecord.worktree,
      taskId: leaseRecord.taskId,
      attemptId: leaseRecord.attemptId,
      pid: 999_999_999,
    }), "utf8");
    const missingProjection = (await restarted.listContributions(conversationId))
      .find((entry) => entry.batchId === receipt.batchId);
    expect(missingProjection?.state).toBe("unresolved");
    expect(existsSync(leasePath)).toBe(true);

    // The canonical retained claim is never deleted by any read: recovery
    // refuses the schema-invalid shape and keeps the exact bytes.
    const recovery = restarted.reconcileLease({
      conversationId,
      batchId: receipt.batchId,
      key: receipt.key,
    });
    expect(recovery.outcome).toBe("refused");
    expect(existsSync(leasePath)).toBe(true);
  });

  test("every contribution retains its exact worker and execution profile", async () => {
    const fixture_ = fixture();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const actor = await seededActor(fixture_);
    const receipt = await registry.spawn(spawnInput(actor, spawnOperation()));
    await waitFor(async () => {
      const projections = await registry.listContributions(actor.conversationId);
      return projections.every((entry) => entry.state === "settled");
    }, "contribution settles");

    const spawnPath = join(contributionStateDirectory(fixture_.home, actor.conversationId), `spawn-${actor.actionId}.json`);
    expect(existsSync(spawnPath)).toBe(true);
    const spawnRecord = JSON.parse(readFileSync(spawnPath, "utf8")) as Record<string, unknown>;
    expect(spawnRecord.workerId).toBe(FAKE_WORKER_ID);
    expect(spawnRecord.effectKind).toBe("read-only");
    expect(spawnRecord.executionProfile).toEqual(fakeCard().executionProfile);

    const timeline = new FileMissionTimeline(join(fixture_.home, "state", "conversation-contributions"));
    const recovered = await timeline.recoverBatch(
      actor.conversationId,
      contributionPreparedBatchId(actor.conversationId, receipt.batchId),
    );
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
    const gated = gatedContributionDriver();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(() => gated.driver),
    });
    const actor = await seededActor(fixture_);
    const receipt = await registry.spawn(spawnInput(actor, spawnOperation()));
    const { conversationId } = actor;

    // The spawn receipt is durable immediately, but the delegate timeline
    // prepares asynchronously: wait for the prepared-but-unsettled standing,
    // then assert the exact refusal code deterministically.
    await waitFor(async () => {
      const attempt = await registry.readChildResult({ conversationId, batchId: receipt.batchId, key: receipt.key });
      return attempt.standing === "refused" && attempt.code === "not-settled";
    }, "the unsettled contribution refuses the keyed read");
    const before = await registry.readChildResult({ conversationId, batchId: receipt.batchId, key: receipt.key });
    expect(before.standing).toBe("refused");
    if (before.standing === "refused") expect(before.code).toBe("not-settled");

    gated.release();
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
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const receipt = await registry.spawn(spawnInput(
      { conversationId, turnId: randomUUID(), actionId: randomUUID() },
      spawnOperation(),
    ));
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
    // fresh result is readable; the host derives the corrected revision from
    // the canonical source without the coordinator supplying one.
    const replacement = spawnOperation({ key: "replacement" });
    const replacementReceipt = await registry.spawn(spawnInput(
      { conversationId, turnId: randomUUID(), actionId: randomUUID() },
      replacement,
    ));
    await waitFor(async () => {
      const readAttempt = await registry.readChildResult({
        conversationId,
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
    const actor = await seededActor(fixture_);
    const receipt = await registry.spawn({
      ...actor,
      operation: spawnOperation({ key: "slow-read" }) as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
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

  test("a failed worker run settles the contribution visibly without a guessed result", async () => {
    const fixture_ = fixture();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(failingContributionDriver),
    });
    const actor = await seededActor(fixture_);
    const receipt = await registry.spawn(spawnInput(actor, spawnOperation({ key: "failed-read" })));
    await waitFor(async () => {
      const projections = await registry.listContributions(actor.conversationId);
      return projections.every((entry) => entry.state !== "live");
    }, "failed contribution reaches terminal liveness");
    const projections = await registry.listContributions(actor.conversationId);
    const projection = projections.find((entry) => entry.batchId === receipt.batchId);
    expect(projection?.state).toBe("settled");
    expect(projection?.status).toBe("failed");
    const summaries = await registry.listSettledChildSummaries(actor.conversationId);
    expect(summaries.some((summary) => summary.id.startsWith(receipt.batchId))).toBe(false);
  });

  test("after a server restart liveness is unknown, settled results stay readable, and stops are unverifiable", async () => {
    const fixture_ = fixture();
    const firstRegistry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const conversationId = randomUUID();
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const receipt = await firstRegistry.spawn(spawnInput(
      { conversationId, turnId: randomUUID(), actionId: randomUUID() },
      spawnOperation(),
    ));
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
    const slowReceipt = await slowFirst.spawn(spawnInput(
      { conversationId, turnId: randomUUID(), actionId: randomUUID() },
      spawnOperation({ key: "restart-unknown" }),
    ));
    const slowRestarted = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(slowContributionDriver),
    });
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

  test("no self-review: contribution evidence never names the conversation journal or coordinator output", async () => {
    const fixture_ = fixture();
    const registry = createConversationContributionRegistry(fixture_.home, {
      catalog: fakeCatalog(),
    });
    const actor = await seededActor(fixture_);
    const receipt = await registry.spawn({
      ...actor,
      operation: spawnOperation() as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    });
    const spawnPath = join(contributionStateDirectory(fixture_.home, actor.conversationId), `spawn-${actor.actionId}.json`);
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
    await seedTaskAction(fixture_.home, conversationId, fixture_);
    const one = await registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: spawnOperation({ key: "no-vote-one" }) as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
    });
    const two = await registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: spawnOperation({ key: "no-vote-two" }) as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
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
  registry: ConversationContributionRegistry;
  socketUrl: (conversationId: string, after: number) => string;
  owner: ConversationTurnOwner;
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

/** The most recent durable journal event of an exact kind, narrowed to its typed data. */
function findJournalEvent<Kind extends ConversationEvent["type"]>(
  frames: readonly ServerFrame[],
  kind: Kind,
): Extract<ConversationEvent, { type: Kind }> | undefined {
  const matches = frames.filter((candidate): candidate is Extract<ServerFrame, { type: "journal.event" }> =>
    candidate.type === "journal.event" && candidate.event.type === kind);
  const frame = matches.at(-1);
  return frame === undefined
    ? undefined
    : frame.event as Extract<ConversationEvent, { type: Kind }>;
}

interface FixtureParts {
  registry: ConversationContributionRegistry;
  host: ConversationOperationHost;
  provider: ReturnType<typeof createConversationContextProvider>;
}

function fixturePartsForRuntime(root: string, catalog: WorkerCatalog = fakeCatalog()): FixtureParts {
  const registry = createConversationContributionRegistry(root, {
    catalog,
  });
  const host = createConversationTaskOperationHost(root, { contributionRegistry: registry });
  const provider = createConversationContextProvider(root, {
    contributionRegistry: registry,
    catalog,
  });
  return { registry, host, provider };
}

function runServer(
  root: string,
  owner: ConversationTurnOwner,
  fixtureParts: FixtureParts,
): { runtime: ConversationSocketRuntime; handler: RuntimeParts["handler"]; server: Bun.Server<ConversationSocketData> } {
  const runtime = new ConversationSocketRuntime(root, {
    turnOwner: owner,
    projectionProvider: fixtureParts.provider,
    operationHost: fixtureParts.host,
    contributionRegistry: fixtureParts.registry,
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
  return { runtime, handler, server };
}

function socketUrlFor(server: Bun.Server<ConversationSocketData>): (conversationId: string, after: number) => string {
  return (conversationId, after) =>
    `ws://127.0.0.1:${server.port}/api/conversations/${conversationId}/socket?after=${after}`;
}

describe("conversation runtime contribution wiring", () => {
  test("a zero-worker inquiry turn settles with no contribution formed", async () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-contribution-runtime-"));
    temporaryRoots.push(root);
    const owner = scriptedOwner([settledScript("just an answer")]);
    const fixtureParts = fixturePartsForRuntime(root);
    const { runtime, server } = runServer(root, owner, fixtureParts);
    const conversationId = randomUUID();
    const client = await connect(socketUrlFor(server)(conversationId, -1));
    submit(client, randomUUID(), "what does the fixture say?");
    await waitFor(() => client.messages.some((frame) =>
      frame.type === "journal.event" && frame.event.type === "coordinator.turn-settled"), "turn settles");
    const journalEvents = client.messages.filter((frame): frame is Extract<ServerFrame, { type: "journal.event" }> =>
      frame.type === "journal.event").map((frame) => frame.event);
    expect(journalEvents.some((event) => event.type === "action.requested")).toBe(false);
    expect(journalEvents.filter((event) => event.type === "coordinator.turn-settled")).toHaveLength(1);
    expect(await fixtureParts.registry.listContributions(conversationId)).toEqual([]);
    client.close();
    server.stop(true);
  });

  test("a contribution_spawn turn journals the minimal operation and streams attributed activity", async () => {
    const runtimeFixture = fixture();
    const conversationId = randomUUID();
    const seededActionId = await seedTaskAction(runtimeFixture.home, conversationId, runtimeFixture);
    const gated = gatedContributionDriver();
    const owner = scriptedOwner([operationScript(spawnOperation({ key: "socket-spawn" }))]);
    const fixtureParts = fixturePartsForRuntime(runtimeFixture.home, fakeCatalog(() => gated.driver));
    const { runtime, server } = runServer(runtimeFixture.home, owner, fixtureParts);
    const client = await connect(socketUrlFor(server)(conversationId, -1));
    submit(client, randomUUID(), "form one bounded evidence contribution");
    await waitFor(() => client.messages.some((frame) =>
      frame.type === "journal.event" && frame.event.type === "action.settled"
      && frame.event.data.actionId !== seededActionId), "spawn action settles");
    const requested = findJournalEvent(client.messages, "action.requested");
    expect(requested).toBeDefined();
    if (requested === undefined) throw new Error("expected the spawn action.requested event");
    expect(requested.data.kind).toBe("contribution_spawn");
    const operation = requested.data.operation;
    expect(operation).toMatchObject({
      kind: "contribution_spawn",
      key: "socket-spawn",
      effectKind: "read-only",
    });
    // The model-supplied spawn shape stays minimal: no Task identity or
    // execution selection is journaled from the coordinator.
    const operationRecord = operation as unknown as Record<string, unknown>;
    expect(operationRecord).not.toHaveProperty("taskId");
    expect(operationRecord).not.toHaveProperty("expectedSourceRevision");
    expect(operationRecord).not.toHaveProperty("expectedRevision");
    expect(operationRecord).not.toHaveProperty("projectId");
    expect(operationRecord).not.toHaveProperty("expectedPrimaryHead");
    expect(operationRecord).not.toHaveProperty("worktreePath");
    expect(operationRecord).not.toHaveProperty("expectedWorktreeHead");
    // Release the gated worker only after the settled action subscribed the
    // runtime to the contribution, so the attributed activity is observable.
    gated.release();
    await waitFor(() => client.messages.some((frame) => frame.type === "activity.delta"), "attributed activity streams");
    const activity = client.messages.filter((frame) => frame.type === "activity.delta");
    expect(activity.length).toBeGreaterThan(0);
    const firstActivity = activity[0] as Extract<ServerFrame, { type: "activity.delta" }>;
    expect(firstActivity.taskId).toBe(runtimeFixture.taskId);
    void runtime;
    client.close();
    server.stop(true);
  });

  test("a contribution_spawn turn without a current Task fails the action visibly", async () => {
    const runtimeFixture = fixture();
    const owner = scriptedOwner([operationScript(spawnOperation({ key: "no-task-spawn" }))]);
    const fixtureParts = fixturePartsForRuntime(runtimeFixture.home);
    const { server } = runServer(runtimeFixture.home, owner, fixtureParts);
    const conversationId = randomUUID();
    const client = await connect(socketUrlFor(server)(conversationId, -1));
    submit(client, randomUUID(), "form a contribution with no task");
    await waitFor(() => client.messages.some((frame) =>
      frame.type === "journal.event" && frame.event.type === "action.failed"), "spawn action fails");
    const failed = findJournalEvent(client.messages, "action.failed");
    expect(failed).toBeDefined();
    if (failed === undefined) throw new Error("expected the spawn action.failed event");
    expect(failed.data.reason).toContain("no current settled Task action");
    client.close();
    server.stop(true);
  });

  test("a keyed child-result request runs one synthesis turn with the full evidence and one reconstructed response", async () => {
    const runtimeFixture = fixture();
    const registry = createConversationContributionRegistry(runtimeFixture.home, {
      catalog: fakeCatalog(),
    });
    const conversationId = randomUUID();
    await seedTaskAction(runtimeFixture.home, conversationId, runtimeFixture);
    const receipt = await registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: spawnOperation({ key: "synthesis-source" }) as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
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
    const client = await connect(socketUrlFor(server)(conversationId, -1));
    submit(client, randomUUID(), "synthesize the child result");
    await waitFor(() => client.messages.filter((frame) =>
      frame.type === "journal.event" && frame.event.type === "coordinator.turn-settled").length >= 2, "request and synthesis turns settle");

    const settlements = client.messages.filter((frame): frame is Extract<ServerFrame, { type: "journal.event" }> =>
      frame.type === "journal.event" && frame.event.type === "coordinator.turn-settled")
      .map((frame) => frame.event as Extract<ConversationEvent, { type: "coordinator.turn-settled" }>);
    expect(settlements).toHaveLength(2);
    const settledEvent = settlements[1]!;
    expect(settledEvent.data.response).toBe("One reconstructed response.");

    expect(captured).toHaveLength(2);
    expect(captured[1]!.fullChildResults).toHaveLength(1);
    expect(captured[1]!.fullChildResults![0]!.batchId).toBe(receipt.batchId);
    expect(captured[1]!.fullChildResults![0]!.key).toBe("synthesis-source");
    expect(captured[1]!.fullChildResults![0]!.semantic?.finalText).toContain("bounded fixture conclusion");
    // Child summaries reach the requesting turn; full evidence only the synthesis.
    expect(captured[0]!.children?.map((child) => child.id)).toContain(`${receipt.batchId}/synthesis-source`);
    client.close();
    server.stop(true);
  });

  test("a keyed child-result request after a Task correction fails the turn visibly without a synthesis", async () => {
    const runtimeFixture = fixture();
    const registry = createConversationContributionRegistry(runtimeFixture.home, {
      catalog: fakeCatalog(),
    });
    const conversationId = randomUUID();
    await seedTaskAction(runtimeFixture.home, conversationId, runtimeFixture);
    const receipt = await registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: spawnOperation({ key: "stale-read" }) as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
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
    const client = await connect(socketUrlFor(server)(conversationId, -1));
    submit(client, randomUUID(), "read the old child result");
    await waitFor(() => client.messages.some((frame) =>
      frame.type === "journal.event" && frame.event.type === "coordinator.turn-failed"), "stale refusal fails the turn");
    const failed = findJournalEvent(client.messages, "coordinator.turn-failed");
    expect(failed).toBeDefined();
    if (failed === undefined) throw new Error("expected the stale coordinator.turn-failed event");
    expect(failed.data.reason).toContain("stale");
    expect(client.messages.filter((frame): frame is Extract<ServerFrame, { type: "journal.event" }> =>
      frame.type === "journal.event" && frame.event.type === "coordinator.turn-settled")).toHaveLength(0);
    client.close();
    server.stop(true);
  });

  test("an unsupported request kind fails the turn visibly", async () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-contribution-runtime-"));
    temporaryRoots.push(root);
    const owner = scriptedOwner([principalDecisionRequestScript()]);
    const fixtureParts = fixturePartsForRuntime(root);
    const { server } = runServer(root, owner, fixtureParts);
    const conversationId = randomUUID();
    const client = await connect(socketUrlFor(server)(conversationId, -1));
    submit(client, randomUUID(), "ask the principal");
    await waitFor(() => client.messages.some((frame) =>
      frame.type === "journal.event" && frame.event.type === "coordinator.turn-failed"), "unsupported request fails");
    const failed = findJournalEvent(client.messages, "coordinator.turn-failed");
    expect(failed).toBeDefined();
    if (failed === undefined) throw new Error("expected the unsupported coordinator.turn-failed event");
    expect(failed.data.reason).toContain("not supported");
    client.close();
    server.stop(true);
  });

  test("a nested child-result request in the synthesis turn fails visibly without a third model call", async () => {
    const runtimeFixture = fixture();
    const registry = createConversationContributionRegistry(runtimeFixture.home, {
      catalog: fakeCatalog(),
    });
    const conversationId = randomUUID();
    await seedTaskAction(runtimeFixture.home, conversationId, runtimeFixture);
    const receipt = await registry.spawn({
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      operation: spawnOperation({ key: "nested-source" }) as Extract<ConversationOperation, { kind: "contribution_spawn" }>,
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
    const client = await connect(socketUrlFor(server)(conversationId, -1));
    submit(client, randomUUID(), "read then read again");
    await waitFor(() => client.messages.filter((frame): frame is Extract<ServerFrame, { type: "journal.event" }> =>
      frame.type === "journal.event" && frame.event.type === "coordinator.turn-failed").length >= 1, "nested request fails");
    const failed = findJournalEvent(client.messages, "coordinator.turn-failed");
    expect(failed).toBeDefined();
    if (failed === undefined) throw new Error("expected the nested coordinator.turn-failed event");
    expect(failed.data.reason).toContain("second request");
    client.close();
    server.stop(true);
  });
});
