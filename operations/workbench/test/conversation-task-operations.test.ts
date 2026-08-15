import { afterEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initializeHome } from "../src/home";
import { registerProject } from "../src/register";
import {
  acceptPrincipalTaskResult,
  createPrincipalTask,
  correctPrincipalTask,
  loadPrincipalTasks,
  submitPrincipalTaskResult,
} from "../src/tasks";
import { taskActionSourceRef as actionRef } from "../src/conversation/contracts";
import {
  ConversationOperationHostError,
  createConversationTaskOperationHost,
} from "../src/conversation/operations";
import { resolveBoundWorktree, verifyCleanStatus } from "../src/task-run";
import type { ConversationOperation } from "../../autonomy/src/conversation-coordinator";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(): {
  home: string;
  host: ReturnType<typeof createConversationTaskOperationHost>;
  projectId: string;
  worktree: string;
  primary: string;
  primaryHead: string;
  worktreeHead: string;
} {
  const root = mkdtempSync(join(tmpdir(), "rossovia-conversation-ops-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  initializeHome(home);
  const primary = join(root, "project");
  mkdirSync(primary, { recursive: true });
  git(primary, "init", "-b", "main");
  git(primary, "config", "user.name", "Conversation Ops Test");
  git(primary, "config", "user.email", "ops@example.test");
  writeFileSync(join(primary, "README.md"), "# Conversation ops fixture\n");
  git(primary, "add", "README.md");
  git(primary, "commit", "-m", "initial");
  git(primary, "remote", "add", "origin", "https://example.test/lidessen/conversation-ops.git");
  const worktree = join(root, "worktree");
  git(primary, "worktree", "add", worktree);
  const projectId = "conversation-ops-fixture";
  registerProject(home, { path: primary, id: projectId, aliases: ["ops-fixture"] });
  return {
    home,
    host: createConversationTaskOperationHost(home),
    projectId,
    worktree,
    primary,
    primaryHead: git(primary, "rev-parse", "HEAD"),
    worktreeHead: git(worktree, "rev-parse", "HEAD"),
  };
}

function git(cwd: string, ...arguments_: string[]): string {
  const result = Bun.spawnSync(["git", ...arguments_], { cwd, stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}

function createOperation(overrides: Partial<Extract<ConversationOperation, { kind: "task_create" }>> = {}) {
  return {
    kind: "task_create" as const,
    title: "Publish the bounded fixture result",
    objective: "Produce the bounded fixture result described by the project source.",
    acceptance: ["the fixture result exists"],
    projectId: "conversation-ops-fixture",
    expectedPrimaryHead: "0".repeat(40),
    worktreePath: "",
    expectedWorktreeHead: "0".repeat(40),
    ...overrides,
  };
}

/** A create operation carrying the exact selectors of the current fixture. */
function currentCreateOperation(parts: {
  worktree: string;
  primaryHead: string;
  worktreeHead: string;
}): ReturnType<typeof createOperation> {
  return createOperation({
    worktreePath: parts.worktree,
    expectedPrimaryHead: parts.primaryHead,
    expectedWorktreeHead: parts.worktreeHead,
  });
}

function input(host: ReturnType<typeof createConversationTaskOperationHost>, operation: ConversationOperation) {
  const conversationId = randomUUID();
  const turnId = randomUUID();
  const actionId = randomUUID();
  return { host, conversationId, turnId, actionId, operation };
}

describe("ConversationTaskOperationHost task_create", () => {
  test("creates one project-bound Task with the causal action source ref and a canonical receipt", async () => {
    const { host, worktree, primaryHead, worktreeHead } = fixture();
    const { conversationId, turnId, actionId, operation } = input(
      host,
      currentCreateOperation({ worktree, primaryHead, worktreeHead }),
    );

    const receipt = await host.executeOperation({ conversationId, turnId, actionId, operation });

    const tasks = loadPrincipalTasks(host.home);
    expect(tasks.tasks).toHaveLength(1);
    const task = tasks.tasks[0]!;
    expect(task.id).toBe(receipt.taskId);
    expect(task.origin.sourceRef).toBe(actionRef(conversationId, actionId));
    expect(task.binding).toMatchObject({
      kind: "project-context",
      projectId: "conversation-ops-fixture",
      worktreePath: realpathSync(worktree),
    });
    expect(task.corrections).toHaveLength(0);
    expect(receipt.evidenceRefs).toEqual([`workbench:state/tasks.json:task/${task.id}@${tasks.sourceRevision}`]);
  });

  test("fails visibly for a discovered or unregistered project without an unbound fallback", () => {
    const { host, worktree, primaryHead, worktreeHead } = fixture();
    const discovered = input(host, createOperation({
      projectId: "never-registered-project",
      worktreePath: worktree,
      expectedPrimaryHead: primaryHead,
      expectedWorktreeHead: worktreeHead,
    }));

    expect(() => host.executeOperation(discovered)).toThrow(ConversationOperationHostError);
    try {
      host.executeOperation(discovered);
    } catch (error) {
      expect(error).toBeInstanceOf(ConversationOperationHostError);
      expect((error as ConversationOperationHostError).code).toBe("project-unresolved");
    }
    expect(loadPrincipalTasks(host.home).tasks).toHaveLength(0);
  });

  test("fails visibly when the operation carries only an alias instead of the exact registered project ID", () => {
    const { host, worktree, primaryHead, worktreeHead } = fixture();
    const attempt = input(host, createOperation({
      projectId: "ops-fixture",
      worktreePath: worktree,
      expectedPrimaryHead: primaryHead,
      expectedWorktreeHead: worktreeHead,
    }));

    try {
      host.executeOperation(attempt);
      throw new Error("expected the alias-only project identity to be refused");
    } catch (error) {
      expect(error).toBeInstanceOf(ConversationOperationHostError);
      expect((error as ConversationOperationHostError).code).toBe("project-unresolved");
    }
    expect(loadPrincipalTasks(host.home).tasks).toHaveLength(0);
  });

  test("fails visibly when the registered project's current primary head has moved", () => {
    const { host, worktree, primary, primaryHead, worktreeHead } = fixture();
    writeFileSync(join(primary, "advance.md"), "advance\n");
    git(primary, "add", "advance.md");
    git(primary, "commit", "-m", "advance the primary head");

    const attempt = input(host, currentCreateOperation({ worktree, primaryHead, worktreeHead }));

    try {
      host.executeOperation(attempt);
      throw new Error("expected the stale primary head to be refused");
    } catch (error) {
      expect(error).toBeInstanceOf(ConversationOperationHostError);
      expect((error as ConversationOperationHostError).code).toBe("stale-context");
    }
    expect(loadPrincipalTasks(host.home).tasks).toHaveLength(0);
  });

  test("fails visibly when the observed Worktree's head has moved", () => {
    const { host, worktree, primaryHead, worktreeHead } = fixture();
    writeFileSync(join(worktree, "advance.md"), "advance\n");
    git(worktree, "add", "advance.md");
    git(worktree, "commit", "-m", "advance the worktree head");

    const attempt = input(host, currentCreateOperation({ worktree, primaryHead, worktreeHead }));

    try {
      host.executeOperation(attempt);
      throw new Error("expected the stale worktree head to be refused");
    } catch (error) {
      expect(error).toBeInstanceOf(ConversationOperationHostError);
      expect((error as ConversationOperationHostError).code).toBe("stale-context");
    }
    expect(loadPrincipalTasks(host.home).tasks).toHaveLength(0);
  });

  test("fails visibly for a guessed Worktree that is not an observed Worktree of the project", () => {
    const { host, primaryHead, worktreeHead } = fixture();
    const guessed = join(tmpdir(), `guessed-${randomUUID()}`);
    mkdirSync(guessed, { recursive: true });
    git(guessed, "init", "-b", "main");

    const attempt = input(host, createOperation({
      worktreePath: guessed,
      expectedPrimaryHead: primaryHead,
      expectedWorktreeHead: worktreeHead,
    }));

    try {
      host.executeOperation(attempt);
      throw new Error("expected the guessed worktree to be refused");
    } catch (error) {
      expect(error).toBeInstanceOf(ConversationOperationHostError);
      expect((error as ConversationOperationHostError).code).toBe("worktree-unobserved");
    }
    expect(loadPrincipalTasks(host.home).tasks).toHaveLength(0);
  });

  test("never creates an unbound Task when the project cannot be resolved", () => {
    const { host, worktree, primaryHead, worktreeHead } = fixture();
    const attempt = input(host, createOperation({
      projectId: "",
      worktreePath: worktree,
      expectedPrimaryHead: primaryHead,
      expectedWorktreeHead: worktreeHead,
    }));
    try {
      host.executeOperation(attempt);
    } catch (error) {
      expect((error as ConversationOperationHostError).code).toBe("project-unresolved");
    }
    const tasks = loadPrincipalTasks(host.home).tasks;
    expect(tasks).toHaveLength(0);
  });
});

describe("ConversationTaskOperationHost P7 F1 runnable create prevention", () => {
  test("a primary-workspace create fails as task-not-runnable with zero Task mutation", () => {
    const { host, primary, primaryHead } = fixture();
    const attempt = input(host, currentCreateOperation({
      worktree: primary,
      primaryHead,
      worktreeHead: primaryHead,
    }));

    try {
      host.executeOperation(attempt);
      throw new Error("expected the primary workspace create to be refused");
    } catch (error) {
      expect(error).toBeInstanceOf(ConversationOperationHostError);
      expect((error as ConversationOperationHostError).code).toBe("task-not-runnable");
    }
    expect(loadPrincipalTasks(host.home).tasks).toHaveLength(0);
  });

  test("a dirty linked-Worktree create fails as worktree-dirty with zero Task mutation", () => {
    const { host, primary, primaryHead } = fixture();
    const dirty = join(primary, "..", "dirty-worktree");
    git(primary, "worktree", "add", dirty);
    writeFileSync(join(dirty, "uncommitted.md"), "dirty\n");
    const attempt = input(host, currentCreateOperation({
      worktree: dirty,
      primaryHead,
      worktreeHead: git(dirty, "rev-parse", "HEAD"),
    }));

    try {
      host.executeOperation(attempt);
      throw new Error("expected the dirty worktree create to be refused");
    } catch (error) {
      expect(error).toBeInstanceOf(ConversationOperationHostError);
      expect((error as ConversationOperationHostError).code).toBe("worktree-dirty");
    }
    expect(loadPrincipalTasks(host.home).tasks).toHaveLength(0);
  });

  test("a clean linked-Worktree create settles with exact selectors that satisfy the existing continue preparation path", async () => {
    const { host, primary, projectId, worktree, primaryHead, worktreeHead } = fixture();
    const receipt = await host.executeOperation(input(
      host,
      currentCreateOperation({ worktree, primaryHead, worktreeHead }),
    ));

    const tasks = loadPrincipalTasks(host.home);
    expect(tasks.tasks).toHaveLength(1);
    const task = tasks.tasks[0]!;
    expect(task.id).toBe(receipt.taskId);
    expect(task.binding).toMatchObject({
      kind: "project-context",
      projectId,
      worktreePath: realpathSync(worktree),
    });
    if (task.binding.kind !== "project-context" || task.binding.worktreePath === undefined) {
      throw new Error("expected the created Task to be bound to a project Worktree");
    }
    expect(task.binding.worktreePath).not.toBe(realpathSync(primary));
    // The exact continue preparation path (canonical binding re-validation
    // plus the clean status check) accepts the created Task's selectors.
    const bound = resolveBoundWorktree(host.home, projectId, task.binding.worktreePath);
    expect(() => verifyCleanStatus(bound)).not.toThrow();
  });
});

describe("ConversationTaskOperationHost task_correct", () => {
  test("appends the correction to the same active Task ID with exact re-read revisions", async () => {
    const { host, worktree, primaryHead, worktreeHead } = fixture();
    const created = await host.executeOperation(input(host, currentCreateOperation({ worktree, primaryHead, worktreeHead })));
    const tasks = loadPrincipalTasks(host.home);
    const task = tasks.tasks[0]!;

    const correction = input(host, {
      kind: "task_correct",
      taskId: task.id,
      expectedSourceRevision: tasks.sourceRevision,
      expectedRevision: task.revision,
      statement: "The result must also preserve the second fixture invariant.",
    });
    const receipt = await host.executeOperation(correction);

    expect(receipt.taskId).toBe(created.taskId);
    const after = loadPrincipalTasks(host.home);
    expect(after.tasks).toHaveLength(1);
    expect(after.tasks[0]!.id).toBe(task.id);
    expect(after.tasks[0]!.revision).toBe(task.revision + 1);
    expect(after.tasks[0]!.corrections).toHaveLength(1);
    expect(after.tasks[0]!.corrections[0]!.sourceRef).toBe(actionRef(correction.conversationId, correction.actionId));
  });

  test("fails visibly on a stale task revision instead of correcting newer state", async () => {
    const { host, worktree, primaryHead, worktreeHead } = fixture();
    const created = await host.executeOperation(input(host, currentCreateOperation({ worktree, primaryHead, worktreeHead })));
    const tasks = loadPrincipalTasks(host.home);
    const task = tasks.tasks[0]!;
    correctPrincipalTask(host.home, {
      id: task.id,
      expectedSourceRevision: tasks.sourceRevision,
      expectedRevision: task.revision,
      statement: "an unrelated advance",
      sourceRef: "test:unrelated-advance",
      nextActor: "agent",
    });

    const stale = input(host, {
      kind: "task_correct",
      taskId: task.id,
      expectedSourceRevision: tasks.sourceRevision,
      expectedRevision: task.revision,
      statement: "a correction formed against the old revision",
    });
    try {
      host.executeOperation(stale);
      throw new Error("expected the stale revision to be refused");
    } catch (error) {
      expect(error).toBeInstanceOf(ConversationOperationHostError);
      expect((error as ConversationOperationHostError).code).toBe("stale-revision");
    }
    expect(loadPrincipalTasks(host.home).tasks[0]!.corrections).toHaveLength(1);
  });

  test("fails visibly on a stale source revision", async () => {
    const { host, worktree, primaryHead, worktreeHead } = fixture();
    const created = await host.executeOperation(input(host, currentCreateOperation({ worktree, primaryHead, worktreeHead })));
    const before = loadPrincipalTasks(host.home);
    createPrincipalTask(host.home, {
      title: "unrelated task",
      objective: "advance the source",
      acceptance: ["exists"],
      nextActor: "agent",
      sourceRef: "test:unrelated-create",
      expectedSourceRevision: before.sourceRevision,
    });

    const stale = input(host, {
      kind: "task_correct",
      taskId: created.taskId,
      expectedSourceRevision: before.sourceRevision,
      expectedRevision: before.tasks[0]!.revision,
      statement: "formed against the old source revision",
    });
    try {
      host.executeOperation(stale);
      throw new Error("expected the stale source revision to be refused");
    } catch (error) {
      expect((error as ConversationOperationHostError).code).toBe("stale-revision");
    }
  });

  test("fails visibly for a missing Task", () => {
    const { host } = fixture();
    const attempt = input(host, {
      kind: "task_correct",
      taskId: randomUUID(),
      expectedSourceRevision: 0,
      expectedRevision: 1,
      statement: "correct the missing task",
    });
    try {
      host.executeOperation(attempt);
      throw new Error("expected the missing task to be refused");
    } catch (error) {
      expect((error as ConversationOperationHostError).code).toBe("task-not-found");
    }
  });

  test("fails visibly for a settled Task without erasing history", async () => {
    const { host, worktree, primaryHead, worktreeHead } = fixture();
    const created = await host.executeOperation(input(host, currentCreateOperation({ worktree, primaryHead, worktreeHead })));
    const tasks = loadPrincipalTasks(host.home);
    const task = tasks.tasks[0]!;
    submitPrincipalTaskResult(host.home, {
      id: task.id,
      expectedSourceRevision: tasks.sourceRevision,
      expectedRevision: task.revision,
      summary: "done",
      evidenceRefs: ["test:evidence"],
      sourceRef: "test:submit",
    });
    const verifying = loadPrincipalTasks(host.home);
    acceptPrincipalTaskResult(host.home, {
      id: task.id,
      expectedSourceRevision: verifying.sourceRevision,
      expectedRevision: verifying.tasks[0]!.revision,
      sourceRef: "test:accept",
    });
    const settled = loadPrincipalTasks(host.home);

    const attempt = input(host, {
      kind: "task_correct",
      taskId: created.taskId,
      expectedSourceRevision: settled.sourceRevision,
      expectedRevision: settled.tasks[0]!.revision,
      statement: "correct the settled task",
    });
    try {
      host.executeOperation(attempt);
      throw new Error("expected the settled task to be refused");
    } catch (error) {
      expect((error as ConversationOperationHostError).code).toBe("task-settled");
    }
  });
});

describe("ConversationTaskOperationHost deferred operations", () => {
  test("task_continue and work_control stay strict typed but unavailable without an installed carrier runtime", () => {
    const { host } = fixture();
    for (const operation of [
      {
        kind: "task_continue" as const,
        taskId: "task-1",
        expectedSourceRevision: 0,
        expectedRevision: 1,
        workerId: "deepseek-flash",
        projectId: "repository:task-1",
        expectedPrimaryHead: "1".repeat(40),
        worktreePath: "/tmp/task-1-worktree",
        expectedWorktreeHead: "1".repeat(40),
      },
      { kind: "work_control" as const, carrierId: "carrier-1", control: "stop" as const },
    ]) {
      const attempt = input(host, operation);
      try {
        host.executeOperation(attempt);
        throw new Error(`expected ${operation.kind} to be unavailable`);
      } catch (error) {
        expect(error).toBeInstanceOf(ConversationOperationHostError);
        expect((error as ConversationOperationHostError).code).toBe("operation-unavailable");
      }
    }
    expect(loadPrincipalTasks(host.home).tasks).toHaveLength(0);
  });
});

describe("ConversationTaskOperationHost reconciliation", () => {
  test("finds the committed create by its causal source ref", async () => {
    const { host, worktree, primaryHead, worktreeHead } = fixture();
    const attempt = input(host, currentCreateOperation({ worktree, primaryHead, worktreeHead }));
    const receipt = await host.executeOperation(attempt);

    const found = host.findCanonicalReceipt(attempt);

    expect(found.standing).toBe("settled");
    if (found.standing !== "settled") throw new Error("expected settled");
    expect(found.receipt.taskId).toBe(receipt.taskId);
    expect(found.receipt.evidenceRefs).toEqual(receipt.evidenceRefs);
  });

  test("finds the committed correction by its causal source ref on the same Task", () => {
    const { host, worktree, primaryHead, worktreeHead } = fixture();
    host.executeOperation(input(host, currentCreateOperation({ worktree, primaryHead, worktreeHead })));
    const tasks = loadPrincipalTasks(host.home);
    const task = tasks.tasks[0]!;
    const correction = input(host, {
      kind: "task_correct",
      taskId: task.id,
      expectedSourceRevision: tasks.sourceRevision,
      expectedRevision: task.revision,
      statement: "keep the same task",
    });
    host.executeOperation(correction);

    const found = host.findCanonicalReceipt(correction);

    expect(found.standing).toBe("settled");
    if (found.standing !== "settled") throw new Error("expected settled");
    expect(found.receipt.taskId).toBe(task.id);
  });

  test("reports provable absence for an action that never committed", () => {
    const { host, worktree, primaryHead, worktreeHead } = fixture();
    const attempt = input(host, currentCreateOperation({ worktree, primaryHead, worktreeHead }));

    expect(host.findCanonicalReceipt(attempt)).toEqual({ standing: "absent" });
  });

  test("reports uninspectable when the canonical Task source cannot be read", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-conversation-ops-unreadable-"));
    temporaryRoots.push(root);
    const home = join(root, "home");
    initializeHome(home);
    rmSync(join(home, "state", "tasks.json"));
    const host = createConversationTaskOperationHost(home);
    const attempt = input(host, createOperation({
      projectId: "never-checked-project",
      worktreePath: "/tmp/never-checked",
      expectedPrimaryHead: "1".repeat(40),
      expectedWorktreeHead: "1".repeat(40),
    }));

    const found = host.findCanonicalReceipt(attempt);

    expect(found.standing).toBe("uninspectable");
    if (found.standing !== "uninspectable") throw new Error("expected uninspectable");
    expect(found.reason).toContain("cannot be read");
  });

  test("a committed create is found even when a later attempt would be refused", () => {
    const { host, worktree, primaryHead, worktreeHead } = fixture();
    const attempt = input(host, currentCreateOperation({ worktree, primaryHead, worktreeHead }));
    host.executeOperation(attempt);
    const retried = { ...attempt, operation: currentCreateOperation({ worktree, primaryHead, worktreeHead }) };

    const found = host.findCanonicalReceipt(retried);

    expect(found.standing).toBe("settled");
  });
});

describe("host classification boundary", () => {
  test("the host only accepts typed operations; prose is never an input", () => {
    const { host } = fixture();
    // A message-shaped payload is not part of the host contract at all.
    expect(typeof host.executeOperation).toBe("function");
    expect(typeof host.findCanonicalReceipt).toBe("function");
  });
});
