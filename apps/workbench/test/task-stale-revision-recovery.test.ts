import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { initializeHome } from "../src/home";
import { STATE_FAILURE_EXIT_CODE } from "../src/cli-errors";
import {
  createLocalTaskControlPlane,
  LocalTaskControlError,
} from "../src/local-task-control-plane";
import { registerProject } from "../src/register";
import type { PrincipalTask } from "../src/contracts";
import {
  assignPrincipalTask,
  createPrincipalTask,
  PrincipalTaskError,
  rebindPrincipalTaskWorktree,
  showPrincipalTask,
  StaleTaskRevisionError,
  type StaleTaskRevisionRecovery,
} from "../src/tasks";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const launcher = join(repositoryRoot, "apps", "gateway", "rossovia");
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function home(): string {
  const root = mkdtempSync(join(tmpdir(), "rossovia-stale-recovery-"));
  temporaryRoots.push(root);
  const taskHome = join(root, "home");
  initializeHome(taskHome);
  return taskHome;
}

function launcherTask(taskHome: string, ...arguments_: string[]): {
  exitCode: number;
  stdout: string;
  stderr: string;
} {
  const result = spawnSync(launcher, ["--home", taskHome, "task", ...arguments_], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  return {
    exitCode: result.status ?? -1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function taskSourceBytes(taskHome: string): string {
  return readFileSync(join(taskHome, "state", "tasks.json"), "utf8");
}

function createTask(taskHome: string) {
  return createPrincipalTask(taskHome, {
    title: "Stale recovery task",
    objective: "Prove one stale failure returns the full recovery context",
    acceptance: ["No effect and both guard pairs with the fresh snapshot"],
    nextActor: "agent",
    sourceRef: "test:stale-recovery",
    expectedSourceRevision: 0,
  });
}

function git(cwd: string, ...arguments_: string[]): string {
  const result = spawnSync("git", arguments_, { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}

function repository(root: string): string {
  const path = join(root, "project");
  mkdirSync(path, { recursive: true });
  git(path, "init", "-b", "main");
  git(path, "config", "user.name", "Stale Recovery Test");
  git(path, "config", "user.email", "stale-recovery@example.test");
  writeFileSync(join(path, "README.md"), "# Stale recovery fixture\n");
  git(path, "add", "README.md");
  git(path, "commit", "-m", "initial");
  git(path, "remote", "add", "origin", "https://example.test/lidessen/stale-recovery-fixture.git");
  return path;
}

describe("Stale revision recovery contract", () => {
  test("one stale failure returns both guard pairs and the same fresh snapshot for source-only, task-only, and both drift", () => {
    const taskHome = home();
    const created = createTask(taskHome);
    assignPrincipalTask(taskHome, {
      id: created.task.id,
      nextActor: "principal",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    });
    const fresh = showPrincipalTask(taskHome, created.task.id).task;
    const cases: {
      name: string;
      arguments: { expectedSourceRevision: number; expectedRevision: number };
      expected: {
        expectedSourceRevision: number;
        currentSourceRevision: number;
        expectedRevision: number;
        currentRevision: number;
      };
      message: string;
    }[] = [
      {
        name: "source-only drift",
        arguments: { expectedSourceRevision: 1, expectedRevision: 2 },
        expected: {
          expectedSourceRevision: 1,
          currentSourceRevision: 2,
          expectedRevision: 2,
          currentRevision: 2,
        },
        message: "source revision is stale",
      },
      {
        name: "task-only drift",
        arguments: { expectedSourceRevision: 2, expectedRevision: 1 },
        expected: {
          expectedSourceRevision: 2,
          currentSourceRevision: 2,
          expectedRevision: 1,
          currentRevision: 2,
        },
        message: "task revision is stale",
      },
      {
        name: "both drift",
        arguments: { expectedSourceRevision: 1, expectedRevision: 1 },
        expected: {
          expectedSourceRevision: 1,
          currentSourceRevision: 2,
          expectedRevision: 1,
          currentRevision: 2,
        },
        message: "source revision is stale",
      },
    ];
    for (const candidate of cases) {
      const before = taskSourceBytes(taskHome);
      let error: unknown;
      try {
        assignPrincipalTask(taskHome, {
          id: created.task.id,
          nextActor: "agent",
          ...candidate.arguments,
        });
      } catch (caught: unknown) {
        error = caught;
      }
      expect(error, candidate.name).toBeInstanceOf(StaleTaskRevisionError);
      const recovery = (error as StaleTaskRevisionError).recovery;
      expect(recovery, candidate.name).toEqual({
        kind: "stale-task-revision",
        id: created.task.id,
        ...candidate.expected,
        task: fresh,
      });
      expect((error as Error).message, candidate.name).toContain(candidate.message);
      expect(taskSourceBytes(taskHome), `${candidate.name} must not persist`).toBe(before);
      expect(recovery.task, `${candidate.name} must carry the same fresh snapshot`).toEqual(fresh);
    }
  });

  test("recovery fields alone form the next exact call that succeeds", () => {
    const taskHome = home();
    const created = createTask(taskHome);
    assignPrincipalTask(taskHome, {
      id: created.task.id,
      nextActor: "principal",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    });
    let recovery: StaleTaskRevisionRecovery;
    try {
      assignPrincipalTask(taskHome, {
        id: created.task.id,
        nextActor: "agent",
        expectedSourceRevision: 1,
        expectedRevision: 1,
      });
      throw new Error("expected a stale failure");
    } catch (error: unknown) {
      if (!(error instanceof StaleTaskRevisionError)) throw error;
      recovery = error.recovery;
    }
    const retried = assignPrincipalTask(taskHome, {
      id: recovery.id,
      nextActor: "agent",
      expectedSourceRevision: recovery.currentSourceRevision,
      expectedRevision: recovery.currentRevision,
    });
    expect(retried).toMatchObject({
      sourceRevision: 3,
      task: { revision: 3, nextActor: "agent" },
    });
  });

  test("the control plane preserves the typed recovery on the projected error", () => {
    const taskHome = home();
    const created = createTask(taskHome);
    const controlPlane = createLocalTaskControlPlane(taskHome);

    let error: unknown;
    try {
      controlPlane.execute({
        kind: "assign",
        arguments: {
          id: created.task.id,
          nextActor: "principal",
          expectedSourceRevision: 1,
          expectedRevision: 2,
        },
      });
    } catch (caught: unknown) {
      error = caught;
    }

    expect(error).toBeInstanceOf(LocalTaskControlError);
    expect((error as LocalTaskControlError).code).toBe("task-drift");
    expect((error as LocalTaskControlError).recovery).toEqual({
      kind: "stale-task-revision",
      id: created.task.id,
      expectedSourceRevision: 1,
      currentSourceRevision: 1,
      expectedRevision: 2,
      currentRevision: 1,
      task: showPrincipalTask(taskHome, created.task.id).task,
    });
  });

  test("unknown tasks and non-revision failures are not classified as stale-revision recovery", () => {
    const taskHome = home();
    createTask(taskHome);

    let notFound: unknown;
    try {
      assignPrincipalTask(taskHome, {
        id: "not-a-task",
        nextActor: "principal",
        expectedSourceRevision: 1,
        expectedRevision: 1,
      });
    } catch (caught: unknown) {
      notFound = caught;
    }
    expect(notFound).toBeInstanceOf(PrincipalTaskError);
    expect(notFound).not.toBeInstanceOf(StaleTaskRevisionError);
    expect((notFound as PrincipalTaskError).code).toBe("task-not-found");

    let staleUnknown: unknown;
    try {
      assignPrincipalTask(taskHome, {
        id: "not-a-task",
        nextActor: "principal",
        expectedSourceRevision: 0,
        expectedRevision: 1,
      });
    } catch (caught: unknown) {
      staleUnknown = caught;
    }
    expect(staleUnknown).toBeInstanceOf(PrincipalTaskError);
    expect(staleUnknown).not.toBeInstanceOf(StaleTaskRevisionError);
    expect((staleUnknown as PrincipalTaskError).code).toBe("task-drift");

    let staleCreate: unknown;
    try {
      createPrincipalTask(taskHome, {
        title: "Stale create",
        objective: "Must not gain a task snapshot",
        acceptance: ["The stale create stays plain"],
        nextActor: "agent",
        sourceRef: "test:stale-create",
        expectedSourceRevision: 0,
      });
    } catch (caught: unknown) {
      staleCreate = caught;
    }
    expect(staleCreate).toBeInstanceOf(PrincipalTaskError);
    expect(staleCreate).not.toBeInstanceOf(StaleTaskRevisionError);

    const root = join(taskHome, "..");
    const primary = repository(root);
    const oldWorktree = join(root, "old-worktree");
    const newWorktree = join(root, "new-worktree");
    git(primary, "worktree", "add", "-b", "task/old", oldWorktree);
    git(primary, "worktree", "add", "-b", "task/new", newWorktree);
    registerProject(taskHome, {
      path: primary,
      id: "repository:stale-recovery-fixture",
      aliases: ["stale-fixture"],
    });
    const bound = createPrincipalTask(taskHome, {
      title: "Worktree drift task",
      objective: "Keep worktree drift unclassified",
      acceptance: ["Worktree drift is not revision recovery"],
      nextActor: "agent",
      sourceRef: "test:worktree-drift",
      expectedSourceRevision: 1,
      project: "stale-fixture",
      worktree: oldWorktree,
    });
    let worktreeDrift: unknown;
    try {
      rebindPrincipalTaskWorktree(taskHome, {
        id: bound.task.id,
        expectedWorktreePath: realpathSync(newWorktree),
        worktree: oldWorktree,
        sourceRef: "test:worktree-drift",
        expectedSourceRevision: 2,
        expectedRevision: 1,
      });
    } catch (caught: unknown) {
      worktreeDrift = caught;
    }
    expect(worktreeDrift).toBeInstanceOf(PrincipalTaskError);
    expect(worktreeDrift).not.toBeInstanceOf(StaleTaskRevisionError);
    expect((worktreeDrift as Error).message).toContain("task Worktree is stale");
  });
});

describe("Launcher projection of stale-revision recovery", () => {
  function createdTask(taskHome: string): string {
    const created = launcherTask(
      taskHome,
      "create",
      "--title",
      "Launcher stale recovery",
      "--objective",
      "Prove the payload reaches the agent through the launcher",
      "--accept",
      "One failure carries the full recovery",
      "--next-actor",
      "agent",
      "--source-ref",
      "test:launcher-stale",
      "--expected-source-revision",
      "0",
    );
    expect(created.exitCode, created.stderr).toBe(0);
    return (JSON.parse(created.stdout) as { task: { id: string } }).task.id;
  }

  test("the launcher returns one machine-readable payload with the stable stderr/exit contract and no effect", () => {
    const taskHome = home();
    const taskId = createdTask(taskHome);
    const assigned = launcherTask(
      taskHome,
      "assign",
      taskId,
      "--next-actor",
      "principal",
      "--expected-source-revision",
      "1",
      "--expected-revision",
      "1",
    );
    expect(assigned.exitCode, assigned.stderr).toBe(0);
    const before = taskSourceBytes(taskHome);

    const stale = launcherTask(
      taskHome,
      "assign",
      taskId,
      "--next-actor",
      "agent",
      "--expected-source-revision",
      "1",
      "--expected-revision",
      "1",
    );
    expect(stale.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(stale.stderr).toContain("rossovia:");
    expect(stale.stderr).toContain("source revision is stale");
    expect(stale.stderr).not.toContain("for usage");
    const payload = JSON.parse(stale.stdout) as StaleTaskRevisionRecovery & {
      task: PrincipalTask;
    };
    expect(payload).toEqual({
      kind: "stale-task-revision",
      id: taskId,
      expectedSourceRevision: 1,
      currentSourceRevision: 2,
      expectedRevision: 1,
      currentRevision: 2,
      task: expect.objectContaining({ id: taskId, revision: 2 }),
    });
    const shown = JSON.parse(launcherTask(taskHome, "show", taskId).stdout) as {
      task: PrincipalTask;
    };
    expect(payload.task).toEqual(shown.task);
    expect(taskSourceBytes(taskHome)).toBe(before);
  });

  test("the payload alone forms the exact retry without task show or a second stale failure", () => {
    const taskHome = home();
    const taskId = createdTask(taskHome);
    expect(launcherTask(
      taskHome,
      "assign",
      taskId,
      "--next-actor",
      "principal",
      "--expected-source-revision",
      "1",
      "--expected-revision",
      "1",
    ).exitCode).toBe(0);
    const stale = launcherTask(
      taskHome,
      "assign",
      taskId,
      "--next-actor",
      "agent",
      "--expected-source-revision",
      "1",
      "--expected-revision",
      "1",
    );
    expect(stale.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    const payload = JSON.parse(stale.stdout) as StaleTaskRevisionRecovery;

    const retry = launcherTask(
      taskHome,
      "assign",
      payload.id,
      "--next-actor",
      "agent",
      "--expected-source-revision",
      String(payload.currentSourceRevision),
      "--expected-revision",
      String(payload.currentRevision),
    );
    expect(retry.exitCode, retry.stderr).toBe(0);
    expect(JSON.parse(retry.stdout)).toMatchObject({
      sourceRevision: 3,
      task: { nextActor: "agent", revision: 3 },
    });
  });

  test("task create stale failures keep the plain message-only contract", () => {
    const taskHome = home();
    createdTask(taskHome);
    const stale = launcherTask(
      taskHome,
      "create",
      "--title",
      "Stale create",
      "--objective",
      "Must not gain a recovery payload",
      "--accept",
      "The stale create stays plain",
      "--next-actor",
      "agent",
      "--source-ref",
      "test:launcher-stale-create",
      "--expected-source-revision",
      "0",
    );
    expect(stale.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(stale.stdout).toBe("");
    expect(stale.stderr).toContain("rossovia: Principal task source revision is stale");
    expect(stale.stderr).not.toContain("for usage");
  });

  test("task run and reconcile-attempt reject revision guards instead of faking them", () => {
    const taskHome = home();
    const taskId = createdTask(taskHome);
    const run = launcherTask(
      taskHome,
      "run",
      taskId,
      "--worker",
      "any",
      "--expected-revision",
      "1",
    );
    expect(run.exitCode).toBe(2);
    expect(run.stdout).toBe("");
    expect(run.stderr).toContain("invalid task option sequence");
    const reconcile = launcherTask(
      taskHome,
      "reconcile-attempt",
      taskId,
      "--attempt",
      "attempt-a",
      "--expected-source-revision",
      "1",
    );
    expect(reconcile.exitCode).toBe(2);
    expect(reconcile.stdout).toBe("");
    expect(reconcile.stderr).toContain("invalid task option sequence");
  });
});
