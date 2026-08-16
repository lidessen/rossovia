import { afterEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initializeHome, loadJson, saveJson } from "../src/home";
import {
  LocalTaskControlError,
  type LocalTaskControlPlane,
} from "../src/local-task-control-plane";
import { registerProject } from "../src/register";
import { createPrincipalTask, correctPrincipalTask, loadPrincipalTasks, principalTasksPath, submitPrincipalTaskResult } from "../src/tasks";
import { PrincipalTasksSchema } from "../src/contracts";
import { createConversationContextProvider } from "../src/conversation/context";
import { createConversationTaskOperationHost } from "../src/conversation/operations";
import { taskActionSourceRef, taskReceiptEvidenceRef } from "../src/conversation/contracts";
import { FileConversationJournal } from "../src/conversation/journal";
import { composeConversationPrompt, CURRENT_COORDINATOR_POLICY } from "../../autonomy/src/conversation-prompt";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function git(cwd: string, ...arguments_: string[]): string {
  const result = Bun.spawnSync(["git", ...arguments_], { cwd, stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}

function fixture(): {
  home: string;
  provider: ReturnType<typeof createConversationContextProvider>;
  journal: FileConversationJournal;
  projectId: string;
  worktree: string;
  primary: string;
} {
  const root = mkdtempSync(join(tmpdir(), "rossovia-conversation-context-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  initializeHome(home);
  const primary = join(root, "project");
  mkdirSync(primary, { recursive: true });
  git(primary, "init", "-b", "main");
  git(primary, "config", "user.name", "Context Test");
  git(primary, "config", "user.email", "context@example.test");
  writeFileSync(join(primary, "README.md"), "# Context fixture\n");
  git(primary, "add", "README.md");
  git(primary, "commit", "-m", "initial");
  git(primary, "remote", "add", "origin", "https://example.test/lidessen/conversation-context.git");
  const worktree = join(root, "worktree");
  git(primary, "worktree", "add", worktree);
  const projectId = "conversation-context-fixture";
  registerProject(home, { path: primary, id: projectId, aliases: ["context-fixture"] });
  return {
    home,
    provider: createConversationContextProvider(home),
    journal: new FileConversationJournal(home),
    projectId,
    worktree,
    primary,
  };
}

/** Journal one settled task_create like the runtime does, so the provider can find it. */
async function journalSettledCreate(
  journal: FileConversationJournal,
  conversationId: string,
  taskId: string,
  sourceRevision: number,
) {
  const message = await journal.submitMessage(conversationId, { clientMessageId: randomUUID(), payload: "create fixture task" });
  const turn = await journal.startTurn(conversationId, {
    turnId: randomUUID(),
    messageId: message.event.data.messageId,
    requestedPolicy: { provider: "deepseek", model: "deepseek-v4-pro", thinking: "enabled", reasoningEffort: "max" },
  });
  const actionId = randomUUID();
  await journal.requestAction(conversationId, {
    actionId,
    turnId: turn.data.turnId,
    messageId: message.event.data.messageId,
    operation: {
      kind: "task_create",
      title: "fixture",
      objective: "fixture",
      acceptance: ["fixture"],
      projectId: "conversation-context-fixture",
      expectedPrimaryHead: "1".repeat(40),
      worktreePath: "unused",
      expectedWorktreeHead: "1".repeat(40),
    },
  });
  await journal.settleAction(conversationId, {
    actionId,
    turnId: turn.data.turnId,
    messageId: message.event.data.messageId,
    evidenceRefs: [taskReceiptEvidenceRef(taskId, sourceRevision)],
  });
  await journal.settleTurn(conversationId, {
    turnId: turn.data.turnId,
    messageId: message.event.data.messageId,
    response: "created",
  });
}

describe("ConversationContextProvider", () => {
  test("projects the registered project with its current primary head and exact observed Worktrees", async () => {
    const { provider, projectId, primary, worktree } = fixture();
    const projection = await provider.buildProjection(randomUUID());

    expect(projection.task).toBeUndefined();
    expect(projection.projects).toHaveLength(1);
    const project = projection.projects![0]!;
    expect(project.name).toBe("context-fixture");
    expect(project.id).toBe(projectId);
    expect(project.status).toBe("registered");
    expect(project.primaryHead).toBe(git(primary, "rev-parse", "HEAD"));
    const worktreeHeads = project.worktrees?.map((entry) => entry.path);
    expect(worktreeHeads).toContain(realpathSync(worktree));
    expect(worktreeHeads).toContain(realpathSync(primary));
    const byPath = new Map(project.worktrees?.map((entry) => [entry.path, entry]));
    expect(byPath.get(realpathSync(primary))).toMatchObject({ role: "primary", clean: true });
    expect(byPath.get(realpathSync(worktree))).toMatchObject({ role: "linked", clean: true });
  });

  test("projects each observed Worktree with its exact role and clean standing, dirty linked included", async () => {
    const { provider, primary, worktree } = fixture();
    const dirty = join(worktree, "..", "dirty-worktree");
    git(primary, "worktree", "add", dirty);
    writeFileSync(join(dirty, "uncommitted.md"), "dirty\n");

    const projection = await provider.buildProjection(randomUUID());

    const project = projection.projects![0]!;
    const byPath = new Map(project.worktrees?.map((entry) => [entry.path, entry]));
    expect(byPath.get(realpathSync(primary))).toMatchObject({ role: "primary", clean: true });
    expect(byPath.get(realpathSync(worktree))).toMatchObject({ role: "linked", clean: true });
    expect(byPath.get(realpathSync(dirty))).toMatchObject({ role: "linked", clean: false });
  });

  test("projects the conversation's current Task with exact numeric revisions from the canonical source", async () => {
    const { home, provider, journal } = fixture();
    const conversationId = randomUUID();
    const created = createPrincipalTask(home, {
      title: "Publish the fixture result",
      objective: "Produce the bounded fixture result.",
      acceptance: ["the fixture exists"],
      nextActor: "agent",
      sourceRef: "test:context-create",
      expectedSourceRevision: 0,
    });
    await journalSettledCreate(journal, conversationId, created.task.id, created.sourceRevision);

    const projection = await provider.buildProjection(conversationId);

    expect(projection.task).toBeDefined();
    expect(projection.task!.id).toBe(created.task.id);
    expect(projection.task!.sourceRevision).toBe(String(created.sourceRevision));
    expect(projection.task!.revision).toBe(1);
    expect(projection.task!.status).toBe("open");
  });

  test("binds one Task read port to the canonical home and shares its state across Task and carrier projections", async () => {
    const { home, journal, projectId, worktree } = fixture();
    const conversationId = randomUUID();
    const created = createPrincipalTask(home, {
      title: "Disk-owned title must not leak",
      objective: "Keep the disk fixture distinguishable from the injected read port.",
      acceptance: ["the read port controls the projection"],
      nextActor: "agent",
      sourceRef: "test:context-port-create",
      expectedSourceRevision: 0,
    });
    const portTasks = PrincipalTasksSchema.parse({
      version: "rosso.principal-tasks.v1",
      sourceRevision: 41,
      tasks: [{
        ...created.task,
        title: "Port-owned canonical title",
        binding: {
          kind: "project-context",
          projectId,
          worktreePath: realpathSync(worktree),
        },
      }],
    });
    await journalSettledCreate(journal, conversationId, created.task.id, 41);
    const attemptId = randomUUID();
    writeAttemptEvidence(home, attemptId, created.task.id, 41, {
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      sourceRef: "conversation:port-read:action:carrier",
    });
    const factoryHomes: string[] = [];
    let listCalls = 0;
    const taskControlPlane: LocalTaskControlPlane = {
      list() {
        listCalls += 1;
        return portTasks;
      },
      show() {
        throw new Error("Task show is outside the context read boundary");
      },
      execute() {
        throw new Error("Task mutation is outside the context read boundary");
      },
    };
    const provider = createConversationContextProvider(join(home, "..", "home"), {
      taskControlPlaneFactory(handlerHome) {
        factoryHomes.push(handlerHome);
        return taskControlPlane;
      },
    });

    const first = await provider.buildProjection(conversationId);

    expect(listCalls).toBe(1);
    expect(factoryHomes).toEqual([realpathSync(home)]);
    expect(first.task).toMatchObject({
      id: created.task.id,
      sourceRevision: "41",
      summary: expect.stringContaining("Port-owned canonical title"),
      projectId,
    });
    expect(first.taskCards).toEqual([
      expect.objectContaining({
        id: created.task.id,
        sourceRevision: "41",
        summary: expect.stringContaining("Port-owned canonical title"),
        projectId,
      }),
    ]);
    expect(first.carriers).toEqual([{
      id: attemptId,
      state: "unknown",
      taskId: created.task.id,
      projectId,
    }]);

    await provider.buildProjection(conversationId);

    expect(listCalls).toBe(2);
    expect(factoryHomes).toEqual([realpathSync(home)]);
  });

  test.each(["typed", "untyped"])(
    "projects a %s Task read failure as unavailable rather than Task absence",
    async (failureKind) => {
      const { home, journal } = fixture();
      const conversationId = randomUUID();
      await journalSettledCreate(journal, conversationId, "port-read-failure-task", 1);
      let listCalls = 0;
      const taskControlPlane: LocalTaskControlPlane = {
        list() {
          listCalls += 1;
          if (failureKind === "typed") {
            throw new LocalTaskControlError(
              "source-unavailable",
              "typed Task read failure",
            );
          }
          throw new Error("untyped Task read failure");
        },
        show() {
          throw new Error("Task show is outside the context read boundary");
        },
        execute() {
          throw new Error("Task mutation is outside the context read boundary");
        },
      };
      const provider = createConversationContextProvider(home, {
        taskControlPlaneFactory: () => taskControlPlane,
      });

      const projection = await provider.buildProjection(conversationId);

      expect(listCalls).toBe(1);
      expect(projection).not.toHaveProperty("task");
      expect(projection).not.toHaveProperty("taskCards");
      expect(projection.taskCardStanding).toMatchObject({
        state: "unavailable",
        known: 1,
      });
      expect(projection.taskCardStanding!.reason).toContain("cannot be read");
    },
  );

  test("exposes the exact execution selection of a bound Task for an exact task_continue", async () => {
    const { home, provider, journal, projectId, worktree, primary } = fixture();
    const conversationId = randomUUID();
    const created = createPrincipalTask(home, {
      title: "Continue the fixture task",
      objective: "Produce the bounded fixture result.",
      acceptance: ["the fixture exists"],
      nextActor: "agent",
      sourceRef: "test:context-create",
      expectedSourceRevision: 0,
      project: "context-fixture",
      worktree,
    });
    await journalSettledCreate(journal, conversationId, created.task.id, created.sourceRevision);

    const projection = await provider.buildProjection(conversationId);

    expect(projection.task).toMatchObject({
      id: created.task.id,
      projectId,
      primaryHead: git(primary, "rev-parse", "HEAD"),
      worktreePath: realpathSync(worktree),
      worktreeHead: git(worktree, "rev-parse", "HEAD"),
    });
  });

  test("reflects a correction on the same Task and the updated source revision", async () => {
    const { home, provider, journal } = fixture();
    const conversationId = randomUUID();
    const created = createPrincipalTask(home, {
      title: "Publish the fixture result",
      objective: "Produce the bounded fixture result.",
      acceptance: ["the fixture exists"],
      nextActor: "agent",
      sourceRef: "test:context-create",
      expectedSourceRevision: 0,
    });
    const corrected = correctPrincipalTask(home, {
      id: created.task.id,
      expectedSourceRevision: created.sourceRevision,
      expectedRevision: created.task.revision,
      statement: "preserve the second fixture invariant",
      sourceRef: "test:context-correct",
      nextActor: "agent",
    });
    await journalSettledCreate(journal, conversationId, created.task.id, corrected.sourceRevision);

    const projection = await provider.buildProjection(conversationId);

    expect(projection.task!.id).toBe(created.task.id);
    expect(projection.task!.sourceRevision).toBe(String(corrected.sourceRevision));
    expect(projection.task!.revision).toBe(corrected.task.revision);
    expect(projection.task!.corrections?.map((entry) => entry.summary)).toEqual(["preserve the second fixture invariant"]);
  });

  test("the composed prompt carries exact source revision selectors the host can verify", async () => {
    const { home, provider, journal, primary } = fixture();
    const conversationId = randomUUID();
    const created = createPrincipalTask(home, {
      title: "Publish the fixture result",
      objective: "Produce the bounded fixture result.",
      acceptance: ["the fixture exists"],
      nextActor: "agent",
      sourceRef: "test:context-create",
      expectedSourceRevision: 0,
    });
    await journalSettledCreate(journal, conversationId, created.task.id, created.sourceRevision);
    const projection = await provider.buildProjection(conversationId);

    const composed = composeConversationPrompt({
      projection,
      message: { text: "correct it", lineage: { messageId: "m", turnId: "t" } },
      policy: { ...CURRENT_COORDINATOR_POLICY, disclosureEnvelope: "test" },
    });

    expect(composed.sourceRevisionSelectors).toContainEqual({
      source: `task:${created.task.id}`,
      revision: String(created.sourceRevision),
    });
    expect(composed.sourceRevisionSelectors).toContainEqual({
      source: `project:conversation-context-fixture`,
      revision: git(primary, "rev-parse", "HEAD"),
    });
  });

  test("an empty conversation and an empty home project no task and no projects", async () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-conversation-context-empty-"));
    temporaryRoots.push(root);
    const home = join(root, "home");
    initializeHome(home);
    const provider = createConversationContextProvider(home);

    const projection = await provider.buildProjection(randomUUID());

    expect(projection).not.toHaveProperty("task");
    expect(projection).not.toHaveProperty("projects");
    expect(projection.workers?.length).toBeGreaterThan(0);
  });

  test("the causal task action source ref retains the conversation and action identity", () => {
    const conversationId = randomUUID();
    const actionId = randomUUID();
    expect(taskActionSourceRef(conversationId, actionId)).toBe(`conversation:${conversationId}:action:${actionId}`);
  });

  test("a settled receipt search reconciles through the same causal reference the host writes", async () => {
    const { home, journal } = fixture();
    const conversationId = randomUUID();
    const actionId = randomUUID();
    const host = createConversationTaskOperationHost(home);
    const tasks = loadPrincipalTasks(home);
    const created = createPrincipalTask(home, {
      title: "reconciled",
      objective: "reconciled",
      acceptance: ["reconciled"],
      nextActor: "agent",
      sourceRef: taskActionSourceRef(conversationId, actionId),
      expectedSourceRevision: tasks.sourceRevision,
    });

    const found = host.findCanonicalReceipt({
      conversationId,
      actionId,
      operation: {
        kind: "task_create",
        title: "reconciled",
        objective: "reconciled",
        acceptance: ["reconciled"],
        projectId: "x",
        expectedPrimaryHead: "1".repeat(40),
        worktreePath: "y",
        expectedWorktreeHead: "1".repeat(40),
      },
    });

    expect(found.standing).toBe("settled");
    if (found.standing !== "settled") throw new Error("expected settled");
    expect(found.receipt.taskId).toBe(created.task.id);
    expect(journal).toBeDefined();
  });
});

function twoProjectFixture(): {
  home: string;
  provider: ReturnType<typeof createConversationContextProvider>;
  journal: FileConversationJournal;
  firstProject: { id: string; worktree: string; primary: string };
  secondProject: { id: string; worktree: string; primary: string };
} {
  const root = mkdtempSync(join(tmpdir(), "rossovia-conversation-context-two-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  initializeHome(home);
  const projectRoot = (name: string, remote: string) => {
    const primary = join(root, name);
    mkdirSync(primary, { recursive: true });
    git(primary, "init", "-b", "main");
    git(primary, "config", "user.name", "Context Test");
    git(primary, "config", "user.email", "context@example.test");
    writeFileSync(join(primary, "README.md"), `# ${name} fixture\n`);
    git(primary, "add", "README.md");
    git(primary, "commit", "-m", "initial");
    git(primary, "remote", "add", "origin", remote);
    const worktree = join(root, `${name}-worktree`);
    git(primary, "worktree", "add", worktree);
    return { primary, worktree };
  };
  const firstPrimary = projectRoot("first", "https://example.test/lidessen/context-first.git");
  const secondPrimary = projectRoot("second", "https://example.test/lidessen/context-second.git");
  const firstId = "first-context-fixture";
  const secondId = "second-context-fixture";
  registerProject(home, { path: firstPrimary.primary, id: firstId, aliases: ["first-fixture"] });
  registerProject(home, { path: secondPrimary.primary, id: secondId, aliases: ["second-fixture"] });
  return {
    home,
    provider: createConversationContextProvider(home),
    journal: new FileConversationJournal(home),
    firstProject: { id: firstId, worktree: firstPrimary.worktree, primary: firstPrimary.primary },
    secondProject: { id: secondId, worktree: secondPrimary.worktree, primary: secondPrimary.primary },
  };
}

/** Journal one settled task_continue like the runtime does, so the provider can find it. */
async function journalSettledContinue(
  journal: FileConversationJournal,
  conversationId: string,
  actionId: string,
  taskId: string,
  evidenceRefs: string[],
) {
  const message = await journal.submitMessage(conversationId, { clientMessageId: randomUUID(), payload: "continue fixture task" });
  const turn = await journal.startTurn(conversationId, {
    turnId: randomUUID(),
    messageId: message.event.data.messageId,
    requestedPolicy: { provider: "deepseek", model: "deepseek-v4-pro", thinking: "enabled", reasoningEffort: "max" },
  });
  await journal.requestAction(conversationId, {
    actionId,
    turnId: turn.data.turnId,
    messageId: message.event.data.messageId,
    operation: {
      kind: "task_continue",
      taskId,
      expectedSourceRevision: 0,
      expectedRevision: 1,
      workerId: "fixture-worker",
      projectId: "fixture-project",
      expectedPrimaryHead: "1".repeat(40),
      worktreePath: "/fixture/worktree",
      expectedWorktreeHead: "1".repeat(40),
    },
  });
  await journal.settleAction(conversationId, {
    actionId,
    turnId: turn.data.turnId,
    messageId: message.event.data.messageId,
    evidenceRefs,
  });
  await journal.settleTurn(conversationId, {
    turnId: turn.data.turnId,
    messageId: message.event.data.messageId,
    response: "continued",
  });
}

function writeAttemptEvidence(
  home: string,
  attemptId: string,
  taskId: string,
  sourceRevision: number,
  correlation: { conversationId: string; turnId: string; actionId: string; sourceRef: string },
) {
  const directory = join(home, "state", "task-attempts", attemptId);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "attempt.json"), JSON.stringify({
    version: "rosso.task-run-attempt.v1",
    taskId,
    taskRevision: 1,
    sourceRevision,
    attemptId,
    inputRef: `state/task-attempts/${attemptId}/cell-input.json`,
    finalRecordRef: `state/task-attempts/${attemptId}/cell-input.run.json`,
    workerId: "fixture-worker",
    driver: "ai-sdk-v7",
    model: "fixture-model",
    status: "started",
    startedAt: "2026-08-14T00:00:00Z",
    correlation,
  }));
}

describe("ConversationContextProvider truthful Task cards", () => {
  test("retains every conversation-attributed current Task across projects after the latest action moved to another project", async () => {
    const { home, provider, journal, firstProject, secondProject } = twoProjectFixture();
    const conversationId = randomUUID();
    const firstTask = createPrincipalTask(home, {
      title: "Keep the first fixture invariant",
      objective: "Preserve the first project fixture obligation.",
      acceptance: ["first invariant"],
      nextActor: "agent",
      sourceRef: "test:context-create",
      expectedSourceRevision: 0,
      project: "first-fixture",
      worktree: firstProject.worktree,
    });
    const secondTask = createPrincipalTask(home, {
      title: "Keep the second fixture invariant",
      objective: "Preserve the second project fixture obligation.",
      acceptance: ["second invariant"],
      nextActor: "agent",
      sourceRef: "test:context-create",
      expectedSourceRevision: firstTask.sourceRevision,
      project: "first-fixture",
      worktree: firstProject.worktree,
    });
    const otherTask = createPrincipalTask(home, {
      title: "Build the second-project fixture",
      objective: "Produce the bounded second-project result.",
      acceptance: ["second-project result"],
      nextActor: "agent",
      sourceRef: "test:context-create",
      expectedSourceRevision: secondTask.sourceRevision,
      project: "second-fixture",
      worktree: secondProject.worktree,
    });
    await journalSettledCreate(journal, conversationId, firstTask.task.id, firstTask.sourceRevision);
    await journalSettledCreate(journal, conversationId, secondTask.task.id, secondTask.sourceRevision);
    await journalSettledCreate(journal, conversationId, otherTask.task.id, otherTask.sourceRevision);

    const projection = await provider.buildProjection(conversationId);

    // The singular current effect target stays the latest settled action's Task.
    expect(projection.task?.id).toBe(otherTask.task.id);
    // The bounded card set retains both earlier project Tasks plus the latest one.
    const cards = projection.taskCards;
    expect(cards).toHaveLength(3);
    const byId = new Map(cards!.map((card) => [card.id, card]));
    const current = loadPrincipalTasks(home);
    for (const task of [firstTask.task, secondTask.task, otherTask.task]) {
      const card = byId.get(task.id);
      expect(card, `card for ${task.id}`).toBeDefined();
      expect(card!.sourceRevision).toBe(String(current.sourceRevision));
      expect(card!.revision).toBe(task.revision);
      expect(card!.status).toBe("open");
    }
    expect(byId.get(firstTask.task.id)!.projectId).toBe(firstProject.id);
    expect(byId.get(secondTask.task.id)!.projectId).toBe(firstProject.id);
    expect(byId.get(otherTask.task.id)!.projectId).toBe(secondProject.id);
    expect(byId.get(otherTask.task.id)!.worktreePath).toBe(realpathSync(secondProject.worktree));
    expect(projection.taskCardStanding).toEqual({
      state: "complete",
      cap: 8,
      disclosed: 3,
      known: 3,
    });

    const composed = composeConversationPrompt({
      projection,
      message: { text: "where are my tasks?", lineage: { messageId: "m", turnId: "t" } },
      policy: { ...CURRENT_COORDINATOR_POLICY, disclosureEnvelope: "test" },
    });
    for (const task of [firstTask.task, secondTask.task, otherTask.task]) {
      expect(composed.prompt).toContain(task.id);
    }
    expect(composed.prompt).toContain("task card standing: state=complete cap=8 disclosed=3 known=3");
    expect(composed.sourceRevisionSelectors).toContainEqual({
      source: `task:${firstTask.task.id}`,
      revision: String(current.sourceRevision),
    });
    expect(composed.sourceRevisionSelectors).toContainEqual({
      source: `task:${otherTask.task.id}`,
      revision: String(current.sourceRevision),
    });
    expect(composed.prompt).not.toContain("has no Task");
  });

  test("cards and the singular current target copy the exact canonical lifecycle verbatim", async () => {
    const { home, provider, journal } = fixture();
    const conversationId = randomUUID();
    const verifying = createPrincipalTask(home, {
      title: "Verifying fixture",
      objective: "A Task whose result is under review.",
      acceptance: ["verifying"],
      nextActor: "agent",
      sourceRef: "test:context-create",
      expectedSourceRevision: 0,
    });
    const waiting = createPrincipalTask(home, {
      title: "Waiting fixture",
      objective: "A Task waiting for a dependency.",
      acceptance: ["waiting"],
      nextActor: "agent",
      sourceRef: "test:context-create",
      expectedSourceRevision: verifying.sourceRevision,
    });
    const active = createPrincipalTask(home, {
      title: "In-progress fixture",
      objective: "A Task whose execution is active.",
      acceptance: ["in-progress"],
      nextActor: "agent",
      sourceRef: "test:context-create",
      expectedSourceRevision: waiting.sourceRevision,
    });
    await journalSettledCreate(journal, conversationId, verifying.task.id, verifying.sourceRevision);
    await journalSettledCreate(journal, conversationId, waiting.task.id, waiting.sourceRevision);
    await journalSettledCreate(journal, conversationId, active.task.id, active.sourceRevision);

    // The verifying lifecycle enters through the canonical submit path.
    submitPrincipalTaskResult(home, {
      id: verifying.task.id,
      expectedSourceRevision: active.sourceRevision,
      expectedRevision: verifying.task.revision,
      summary: "the fixture result",
      evidenceRefs: ["test:context-evidence"],
      sourceRef: "test:context-submit",
    });

    // Set the exact remaining canonical lifecycles directly in the Task source.
    const source = loadJson(principalTasksPath(home), PrincipalTasksSchema);
    for (const [id, lifecycle] of [
      [waiting.task.id, "waiting"],
      [active.task.id, "in-progress"],
    ] as const) {
      const task = source.tasks.find((candidate) => candidate.id === id);
      expect(task, `fixture task ${id}`).toBeDefined();
      task!.lifecycle = lifecycle;
    }
    saveJson(principalTasksPath(home), source);

    const projection = await provider.buildProjection(conversationId);

    // The singular current effect target copies the latest action's lifecycle verbatim.
    expect(projection.task).toMatchObject({ id: active.task.id, status: "in-progress" });
    const statusById = new Map(projection.taskCards!.map((card) => [card.id, card.status]));
    expect(statusById.get(verifying.task.id)).toBe("verifying");
    expect(statusById.get(waiting.task.id)).toBe("waiting");
    expect(statusById.get(active.task.id)).toBe("in-progress");

    const composed = composeConversationPrompt({
      projection,
      message: { text: "show the exact standing", lineage: { messageId: "m", turnId: "t" } },
      policy: { ...CURRENT_COORDINATOR_POLICY, disclosureEnvelope: "test" },
    });
    expect(composed.prompt).toContain(`task ${active.task.id} [in-progress]`);
    expect(composed.prompt).toContain(`task card ${verifying.task.id} [verifying]`);
    expect(composed.prompt).toContain(`task card ${waiting.task.id} [waiting]`);
    expect(composed.prompt).toContain(`task card ${active.task.id} [in-progress]`);
  });

  test("a bounded card cap discloses a partial standing instead of silently dropping conversation Tasks", async () => {
    const { home, journal } = fixture();
    const conversationId = randomUUID();
    const first = createPrincipalTask(home, {
      title: "Capped fixture one",
      objective: "First bounded obligation.",
      acceptance: ["one"],
      nextActor: "agent",
      sourceRef: "test:context-create",
      expectedSourceRevision: 0,
    });
    const second = createPrincipalTask(home, {
      title: "Capped fixture two",
      objective: "Second bounded obligation.",
      acceptance: ["two"],
      nextActor: "agent",
      sourceRef: "test:context-create",
      expectedSourceRevision: first.sourceRevision,
    });
    await journalSettledCreate(journal, conversationId, first.task.id, first.sourceRevision);
    await journalSettledCreate(journal, conversationId, second.task.id, second.sourceRevision);

    const capped = createConversationContextProvider(home, { maxTaskCards: 1 });
    const projection = await capped.buildProjection(conversationId);

    expect(projection.taskCards).toHaveLength(1);
    expect(projection.taskCards![0]!.id).toBe(second.task.id);
    expect(projection.taskCardStanding).toMatchObject({
      state: "partial",
      cap: 1,
      disclosed: 1,
      known: 2,
      omitted: 1,
    });
    expect(projection.taskCardStanding!.reason).toContain("omits 1 further conversation-attributed Task");
  });

  test("an unreadable canonical Task source projects unavailable, never a Task-absence claim", async () => {
    const { home, provider, journal } = fixture();
    const conversationId = randomUUID();
    const created = createPrincipalTask(home, {
      title: "Unreadable fixture",
      objective: "A Task the projection cannot re-read.",
      acceptance: ["readable"],
      nextActor: "agent",
      sourceRef: "test:context-create",
      expectedSourceRevision: 0,
    });
    await journalSettledCreate(journal, conversationId, created.task.id, created.sourceRevision);
    writeFileSync(principalTasksPath(home), "{not-json\n");

    const projection = await provider.buildProjection(conversationId);

    expect(projection.task).toBeUndefined();
    expect(projection).not.toHaveProperty("taskCards");
    expect(projection.taskCardStanding).toMatchObject({ state: "unavailable", known: 1 });
    expect(projection.taskCardStanding!.reason).toContain("cannot be read");

    const composed = composeConversationPrompt({
      projection,
      message: { text: "does the project have a Task?", lineage: { messageId: "m", turnId: "t" } },
      policy: { ...CURRENT_COORDINATOR_POLICY, disclosureEnvelope: "test" },
    });
    expect(composed.prompt).toContain("state=unavailable");
    expect(composed.prompt).toContain("known=1");
    expect(composed.prompt).not.toContain("no Task exists");
  });

  test("a conversation without settled Task actions carries an explicit omitted standing", async () => {
    const { provider } = fixture();

    const projection = await provider.buildProjection(randomUUID());

    expect(projection.task).toBeUndefined();
    expect(projection).not.toHaveProperty("taskCards");
    expect(projection.taskCardStanding).toEqual({
      state: "omitted",
      reason: "the conversation has no settled Task action lineage",
      disclosed: 0,
    });
  });

  test("a settled task_continue receipt attributes its Task card through strict attempt evidence without moving the current effect target", async () => {
    const { home, provider, journal, projectId, worktree } = fixture();
    const conversationId = randomUUID();
    const created = createPrincipalTask(home, {
      title: "Continue fixture task",
      objective: "Produce the bounded fixture result.",
      acceptance: ["the fixture exists"],
      nextActor: "agent",
      sourceRef: "test:context-create",
      expectedSourceRevision: 0,
      project: "context-fixture",
      worktree,
    });
    const actionId = randomUUID();
    const attemptId = randomUUID();
    await journalSettledContinue(journal, conversationId, actionId, created.task.id, [
      `state/task-attempts/${attemptId}/attempt.json`,
    ]);
    writeAttemptEvidence(home, attemptId, created.task.id, created.sourceRevision, {
      conversationId,
      turnId: randomUUID(),
      actionId,
      sourceRef: taskActionSourceRef(conversationId, actionId),
    });

    const projection = await provider.buildProjection(conversationId);

    expect(projection.taskCards).toHaveLength(1);
    expect(projection.taskCards![0]).toMatchObject({ id: created.task.id, projectId });
    expect(projection.taskCardStanding).toEqual({ state: "complete", cap: 8, disclosed: 1, known: 1 });
    // A continue does not change the singular current effect target.
    expect(projection.task).toBeUndefined();
  });

  test("a settled task_continue with invalid attempt evidence stands partial, never a Task-absence claim", async () => {
    const { home, provider, journal } = fixture();
    const conversationId = randomUUID();
    const created = createPrincipalTask(home, {
      title: "Invalid evidence fixture",
      objective: "A Task whose continue evidence cannot be trusted.",
      acceptance: ["evidence"],
      nextActor: "agent",
      sourceRef: "test:context-create",
      expectedSourceRevision: 0,
    });
    const actionId = randomUUID();
    const attemptId = randomUUID();
    await journalSettledContinue(journal, conversationId, actionId, created.task.id, [
      `state/task-attempts/${attemptId}/attempt.json`,
    ]);
    writeAttemptEvidence(home, attemptId, created.task.id, created.sourceRevision, {
      conversationId,
      turnId: randomUUID(),
      actionId,
      sourceRef: taskActionSourceRef(conversationId, actionId),
    });
    writeFileSync(join(home, "state", "task-attempts", attemptId, "settlement.json"), "{not-json\n");

    const projection = await provider.buildProjection(conversationId);

    expect(projection).not.toHaveProperty("taskCards");
    expect(projection.taskCardStanding?.state).toBe("partial");
    expect(projection.taskCardStanding!.reason).toContain("no strict owner-backed Task identity");
  });

  test("carrier cards correlate Task and project identity only through strict attempt evidence", async () => {
    const { home, provider, projectId, worktree } = fixture();
    const conversationId = randomUUID();
    const created = createPrincipalTask(home, {
      title: "Carrier correlation fixture",
      objective: "A Task whose carrier identity must stay exact.",
      acceptance: ["correlation"],
      nextActor: "agent",
      sourceRef: "test:context-create",
      expectedSourceRevision: 0,
      project: "context-fixture",
      worktree,
    });
    const attemptId = randomUUID();
    writeAttemptEvidence(home, attemptId, created.task.id, created.sourceRevision, {
      conversationId,
      turnId: randomUUID(),
      actionId: randomUUID(),
      sourceRef: "conversation:unused:action:unused",
    });

    // A strict available attempt record supports the exact Task/project identity.
    const first = await provider.buildProjection(conversationId);
    expect(first.carriers).toEqual([{ id: attemptId, state: "unknown", taskId: created.task.id, projectId }]);

    // Invalid evidence projects unknown/uninspectable with no guessed identity.
    writeFileSync(join(home, "state", "task-attempts", attemptId, "settlement.json"), "{not-json\n");
    const second = await provider.buildProjection(conversationId);
    expect(second.carriers).toEqual([{ id: attemptId, state: "unknown" }]);
  });
});
