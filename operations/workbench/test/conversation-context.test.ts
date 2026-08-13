import { afterEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initializeHome } from "../src/home";
import { registerProject } from "../src/register";
import { createPrincipalTask, correctPrincipalTask, loadPrincipalTasks } from "../src/tasks";
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

    expect(projection).toEqual({});
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
