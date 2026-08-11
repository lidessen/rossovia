import { afterEach, describe, expect, test } from "bun:test";
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
import { registerProject } from "../src/register";
import {
  acceptPrincipalTaskResult,
  assignPrincipalTask,
  correctPrincipalTask,
  createPrincipalTask,
  listPrincipalTasks,
  rebindPrincipalTaskWorktree,
  reopenPrincipalTask,
  submitPrincipalTaskResult,
} from "../src/tasks";

const temporaryRoots: string[] = [];
const repositoryRoot = resolve(import.meta.dir, "../../..");
const bunCli = join(repositoryRoot, "operations", "workbench", "src", "cli.ts");

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function home(): string {
  const root = mkdtempSync(join(tmpdir(), "rossovia-tasks-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  initializeHome(home);
  return home;
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

function repository(root: string): string {
  const path = join(root, "project");
  mkdirSync(path, { recursive: true });
  git(path, "init", "-b", "main");
  git(path, "config", "user.name", "Task Test");
  git(path, "config", "user.email", "task@example.test");
  writeFileSync(join(path, "README.md"), "# Task fixture\n");
  git(path, "add", "README.md");
  git(path, "commit", "-m", "initial");
  git(path, "remote", "add", "origin", "https://example.test/lidessen/task-fixture.git");
  return path;
}

function writeMission(
  repositoryPath: string,
  fileId: string,
  recordId = fileId,
  version = "mission-record.v1",
): void {
  const directory = join(repositoryPath, "operations", "missions");
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, `${fileId}.json`), `${JSON.stringify({
    version,
    id: recordId,
    title: `Mission ${recordId}`,
    sources: ["test:principal-task-mission-context"],
    createdAt: "2026-07-28T00:00:00Z",
    updatedAt: "2026-07-28T00:00:00Z",
    mainline: {
      contradiction: "Retain exact Mission context without claiming execution",
      acceptance: ["The local task stores only the Mission ID"],
      status: "active",
    },
    branches: [],
    currentFocus: "mainline",
  }, null, 2)}\n`);
}

function taskCli(taskHome: string, ...arguments_: string[]): {
  exitCode: number;
  stdout: string;
  stderr: string;
} {
  const result = Bun.spawnSync([
    process.execPath,
    bunCli,
    "--home",
    taskHome,
    "task",
    ...arguments_,
  ], {
    cwd: repositoryRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

describe("Principal-created local task source", () => {
  test("retains one task through assignment, correction, result claim, local acceptance, and reopen", () => {
    const taskHome = home();
    const created = createPrincipalTask(taskHome, {
      title: "Ship the Blog MVP",
      objective: "Produce a verified daily-use Blog slice",
      acceptance: ["The result is independently inspectable"],
      nextActor: "agent",
      sourceRef: "conversation:task-create",
      expectedSourceRevision: 0,
    });

    expect(created).toMatchObject({
      sourceRevision: 1,
      task: {
        binding: { kind: "independent" },
        lifecycle: "open",
        nextActor: "agent",
        revision: 1,
      },
    });
    expect(() => createPrincipalTask(taskHome, {
      title: "Stale create",
      objective: "Must not overwrite a newer source",
      acceptance: ["The stale create is rejected"],
      nextActor: "principal",
      sourceRef: "conversation:stale",
      expectedSourceRevision: 0,
    })).toThrow("source revision is stale");

    const assigned = assignPrincipalTask(taskHome, {
      id: created.task.id,
      nextActor: "principal",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    });
    expect(assigned).toMatchObject({
      sourceRevision: 2,
      task: { lifecycle: "open", nextActor: "principal", revision: 2 },
    });
    expect(() => assignPrincipalTask(taskHome, {
      id: created.task.id,
      nextActor: "agent",
      expectedSourceRevision: 2,
      expectedRevision: 1,
    })).toThrow("task revision is stale");

    const corrected = correctPrincipalTask(taskHome, {
      id: created.task.id,
      statement: "Keep the task-management loop primary; autonomy remains embedded.",
      sourceRef: "conversation:task-correction",
      nextActor: "agent",
      expectedSourceRevision: 2,
      expectedRevision: 2,
    });
    expect(corrected.task).toMatchObject({
      lifecycle: "open",
      nextActor: "agent",
      revision: 3,
      corrections: [{
        statement: "Keep the task-management loop primary; autonomy remains embedded.",
      }],
    });

    const submitted = submitPrincipalTaskResult(taskHome, {
      id: created.task.id,
      summary: "The backend task loop is implemented and tested.",
      evidenceRefs: ["test:tasks.test.ts"],
      sourceRef: "agent:backend-cell",
      expectedSourceRevision: 3,
      expectedRevision: 3,
    });
    expect(submitted.task).toMatchObject({
      lifecycle: "verifying",
      nextActor: "principal",
      revision: 4,
      resultClaims: [{
        standing: "submitted",
        resolution: null,
      }],
    });
    expect(() => assignPrincipalTask(taskHome, {
      id: created.task.id,
      nextActor: "principal",
      expectedSourceRevision: 4,
      expectedRevision: 4,
    })).toThrow("awaiting Principal acceptance");

    const accepted = acceptPrincipalTaskResult(taskHome, {
      id: created.task.id,
      sourceRef: "conversation:principal-accept",
      expectedSourceRevision: 4,
      expectedRevision: 4,
    });
    expect(accepted.task).toMatchObject({
      lifecycle: "settled",
      nextActor: "none",
      revision: 5,
      resultClaims: [{
        standing: "accepted",
        resolution: {
          kind: "accepted",
          acceptanceBoundary: "workbench-local-task-only",
        },
      }],
    });
    expect(() => correctPrincipalTask(taskHome, {
      id: created.task.id,
      statement: "A settled task must reopen before correction.",
      sourceRef: "conversation:late-correction",
      nextActor: "agent",
      expectedSourceRevision: 5,
      expectedRevision: 5,
    })).toThrow("reopen it first");

    const reopened = reopenPrincipalTask(taskHome, {
      id: created.task.id,
      statement: "Representative operation exposed another required pass.",
      sourceRef: "conversation:reopen",
      nextActor: "agent",
      expectedSourceRevision: 5,
      expectedRevision: 5,
    });
    expect(reopened.task).toMatchObject({
      lifecycle: "open",
      nextActor: "agent",
      revision: 6,
    });
    expect(reopened.task.resultClaims[0]).toMatchObject({
      standing: "accepted",
      resolution: {
        acceptanceBoundary: "workbench-local-task-only",
      },
    });
    expect(listPrincipalTasks(taskHome)).toEqual({
      version: "rosso.principal-tasks.v1",
      sourceRevision: 6,
      tasks: [reopened.task],
    });
  });

  test("preserves a rejected result claim when a correction returns the same task to work", () => {
    const taskHome = home();
    const created = createPrincipalTask(taskHome, {
      title: "Repair one failed result",
      objective: "Keep the correction on the same task",
      acceptance: ["The original claim remains traceable"],
      nextActor: "agent",
      sourceRef: "conversation:create",
      expectedSourceRevision: 0,
    });
    const submitted = submitPrincipalTaskResult(taskHome, {
      id: created.task.id,
      summary: "First claim",
      evidenceRefs: ["file:first-report.json"],
      sourceRef: "agent:first-attempt",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    });
    const corrected = correctPrincipalTask(taskHome, {
      id: created.task.id,
      statement: "The evidence does not cover mobile behavior.",
      sourceRef: "conversation:mobile-correction",
      nextActor: "agent",
      expectedSourceRevision: 2,
      expectedRevision: submitted.task.revision,
    });

    expect(corrected.task).toMatchObject({
      lifecycle: "open",
      nextActor: "agent",
      resultClaims: [{
        standing: "superseded",
        resolution: {
          kind: "superseded",
          reason: "correction",
        },
      }],
    });
  });

  test("stores only validated project, Worktree, and primary-workspace Mission context", () => {
    const taskHome = home();
    const root = join(taskHome, "..");
    const primary = repository(root);
    const linked = join(root, "linked");
    writeMission(primary, "daily-task-loop");
    writeMission(primary, "mismatched", "another-mission");
    writeMission(primary, "malformed", "malformed", "unsupported-version");
    git(primary, "worktree", "add", "-b", "task/context", linked);
    registerProject(taskHome, {
      path: primary,
      id: "repository:task-fixture",
      aliases: ["fixture"],
    });

    const created = createPrincipalTask(taskHome, {
      title: "Project-context task",
      objective: "Remember where the Principal intends to work",
      acceptance: ["The context does not grant project authority"],
      nextActor: "principal",
      sourceRef: "conversation:context",
      expectedSourceRevision: 0,
      project: "fixture",
      worktree: linked,
      mission: "daily-task-loop",
    });

    expect(created.task.binding).toEqual({
      kind: "project-context",
      projectId: "repository:task-fixture",
      worktreePath: realpathSync(linked),
      missionId: "daily-task-loop",
    });
    const cliCreated = taskCli(
      taskHome,
      "create",
      "--title",
      "CLI Mission context",
      "--objective",
      "Persist only a validated Mission reference",
      "--accept",
      "The binding names the Mission without execution authority",
      "--next-actor",
      "agent",
      "--source-ref",
      "test:cli-mission-context",
      "--expected-source-revision",
      "1",
      "--project",
      "fixture",
      "--mission",
      "daily-task-loop",
    );
    expect(cliCreated.exitCode, cliCreated.stderr).toBe(0);
    expect(JSON.parse(cliCreated.stdout)).toMatchObject({
      sourceRevision: 2,
      task: {
        binding: {
          kind: "project-context",
          projectId: "repository:task-fixture",
          missionId: "daily-task-loop",
        },
      },
    });
    expect(() => createPrincipalTask(taskHome, {
      title: "Unknown project",
      objective: "Must not create an inferred project binding",
      acceptance: ["The write is rejected"],
      nextActor: "principal",
      sourceRef: "conversation:unknown-project",
      expectedSourceRevision: 2,
      project: "unknown",
    })).toThrow("no project matches");
    expect(() => createPrincipalTask(taskHome, {
      title: "Mission without project",
      objective: "Must not make Mission context independent authority",
      acceptance: ["The write is rejected"],
      nextActor: "principal",
      sourceRef: "conversation:mission-without-project",
      expectedSourceRevision: 2,
      mission: "daily-task-loop",
    })).toThrow("Mission context requires a registered project");
    expect(() => createPrincipalTask(taskHome, {
      title: "Missing Mission",
      objective: "Must not retain an unobserved Mission ID",
      acceptance: ["The write is rejected"],
      nextActor: "principal",
      sourceRef: "conversation:missing-mission",
      expectedSourceRevision: 2,
      project: "fixture",
      mission: "not-present",
    })).toThrow("mission record not found");
    expect(() => createPrincipalTask(taskHome, {
      title: "Mismatched Mission",
      objective: "Must not retain a path whose record has another ID",
      acceptance: ["The write is rejected"],
      nextActor: "principal",
      sourceRef: "conversation:mismatched-mission",
      expectedSourceRevision: 2,
      project: "fixture",
      mission: "mismatched",
    })).toThrow("Mission context id mismatch");
    expect(() => createPrincipalTask(taskHome, {
      title: "Malformed Mission",
      objective: "Must not retain a Mission that fails its owning schema",
      acceptance: ["The write is rejected"],
      nextActor: "principal",
      sourceRef: "conversation:malformed-mission",
      expectedSourceRevision: 2,
      project: "fixture",
      mission: "malformed",
    })).toThrow("version must be mission-record.v1");
    expect(() => createPrincipalTask(taskHome, {
      title: "Unobserved worktree",
      objective: "Must not bind an arbitrary directory",
      acceptance: ["The write is rejected"],
      nextActor: "principal",
      sourceRef: "conversation:unobserved",
      expectedSourceRevision: 2,
      project: "fixture",
      worktree: taskHome,
    })).toThrow("not an observed worktree");
    expect(listPrincipalTasks(taskHome).sourceRevision).toBe(2);
  });

  test("rebinds only an unsettled task's Worktree within its existing project and Mission", () => {
    const taskHome = home();
    const root = join(taskHome, "..");
    const primary = repository(root);
    const oldWorktree = join(root, "old-worktree");
    const newWorktree = join(root, "new-worktree");
    writeMission(primary, "daily-task-loop");
    git(primary, "worktree", "add", "-b", "task/old", oldWorktree);
    git(primary, "worktree", "add", "-b", "task/new", newWorktree);
    registerProject(taskHome, {
      path: primary,
      id: "repository:task-fixture",
      aliases: ["fixture"],
    });

    const created = createPrincipalTask(taskHome, {
      title: "Move to a clean candidate",
      objective: "Continue the same Mission in another observed Worktree",
      acceptance: ["Project and Mission context remain unchanged"],
      nextActor: "agent",
      sourceRef: "conversation:worktree-rebind",
      expectedSourceRevision: 0,
      project: "fixture",
      worktree: oldWorktree,
      mission: "daily-task-loop",
    });
    const rebound = rebindPrincipalTaskWorktree(taskHome, {
      id: created.task.id,
      expectedWorktreePath: realpathSync(oldWorktree),
      worktree: newWorktree,
      sourceRef: "conversation:select-clean-candidate",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    });

    expect(rebound).toMatchObject({
      sourceRevision: 2,
      task: {
        revision: 2,
        binding: {
          kind: "project-context",
          projectId: "repository:task-fixture",
          missionId: "daily-task-loop",
          worktreePath: realpathSync(newWorktree),
        },
        worktreeRebindings: [{
          fromWorktreePath: realpathSync(oldWorktree),
          toWorktreePath: realpathSync(newWorktree),
          sourceRef: "conversation:select-clean-candidate",
        }],
      },
    });
    expect(() => rebindPrincipalTaskWorktree(taskHome, {
      id: created.task.id,
      expectedWorktreePath: realpathSync(oldWorktree),
      worktree: oldWorktree,
      sourceRef: "conversation:stale-rebind",
      expectedSourceRevision: 2,
      expectedRevision: 2,
    })).toThrow("task Worktree is stale");

    writeFileSync(join(oldWorktree, "README.md"), "# Dirty replacement\n");
    expect(() => rebindPrincipalTaskWorktree(taskHome, {
      id: created.task.id,
      expectedWorktreePath: realpathSync(newWorktree),
      worktree: oldWorktree,
      sourceRef: "conversation:dirty-rebind",
      expectedSourceRevision: 2,
      expectedRevision: 2,
    })).toThrow("replacement Worktree is not clean");
    git(oldWorktree, "add", "README.md");
    git(oldWorktree, "commit", "-m", "make replacement clean");

    const cliRebound = taskCli(
      taskHome,
      "rebind-worktree",
      created.task.id,
      "--expected-worktree",
      realpathSync(newWorktree),
      "--worktree",
      oldWorktree,
      "--source-ref",
      "test:cli-worktree-rebind",
      "--expected-source-revision",
      "2",
      "--expected-revision",
      "2",
    );
    expect(cliRebound.exitCode, cliRebound.stderr).toBe(0);
    expect(JSON.parse(cliRebound.stdout)).toMatchObject({
      sourceRevision: 3,
      task: {
        revision: 3,
        binding: {
          projectId: "repository:task-fixture",
          missionId: "daily-task-loop",
          worktreePath: realpathSync(oldWorktree),
        },
        worktreeRebindings: [
          {},
          {
            fromWorktreePath: realpathSync(newWorktree),
            toWorktreePath: realpathSync(oldWorktree),
          },
        ],
      },
    });

    const submitted = submitPrincipalTaskResult(taskHome, {
      id: created.task.id,
      summary: "Candidate result",
      evidenceRefs: ["test:worktree-rebind"],
      sourceRef: "agent:test",
      expectedSourceRevision: 3,
      expectedRevision: 3,
    });
    const accepted = acceptPrincipalTaskResult(taskHome, {
      id: created.task.id,
      sourceRef: "principal:test",
      expectedSourceRevision: 4,
      expectedRevision: submitted.task.revision,
    });
    expect(() => rebindPrincipalTaskWorktree(taskHome, {
      id: created.task.id,
      expectedWorktreePath: realpathSync(oldWorktree),
      worktree: newWorktree,
      sourceRef: "conversation:settled-rebind",
      expectedSourceRevision: 5,
      expectedRevision: accepted.task.revision,
    })).toThrow("reopen it first");
  });

  test("rebinds a project-context task without requiring optional Mission context", () => {
    const taskHome = home();
    const root = join(taskHome, "..");
    const primary = repository(root);
    const oldWorktree = join(root, "old-worktree");
    const newWorktree = join(root, "new-worktree");
    git(primary, "worktree", "add", "-b", "task/old", oldWorktree);
    git(primary, "worktree", "add", "-b", "task/new", newWorktree);
    registerProject(taskHome, {
      path: primary,
      id: "repository:task-fixture",
      aliases: ["fixture"],
    });

    const created = createPrincipalTask(taskHome, {
      title: "Move a daily task to its actual carrier",
      objective: "Keep Workbench context aligned with the isolated Worktree",
      acceptance: ["Mission-free context remains observation-only"],
      nextActor: "agent",
      sourceRef: "conversation:daily-task-worktree",
      expectedSourceRevision: 0,
      project: "fixture",
      worktree: oldWorktree,
    });
    const rebound = taskCli(
      taskHome,
      "rebind-worktree",
      created.task.id,
      "--expected-worktree",
      realpathSync(oldWorktree),
      "--worktree",
      newWorktree,
      "--source-ref",
      "test:mission-free-worktree-rebind",
      "--expected-source-revision",
      "1",
      "--expected-revision",
      "1",
    );

    expect(rebound.exitCode, rebound.stderr).toBe(0);
    expect(JSON.parse(rebound.stdout)).toMatchObject({
      sourceRevision: 2,
      task: {
        revision: 2,
        binding: {
          kind: "project-context",
          projectId: "repository:task-fixture",
          worktreePath: realpathSync(newWorktree),
        },
        worktreeRebindings: [{
          fromWorktreePath: realpathSync(oldWorktree),
          toWorktreePath: realpathSync(newWorktree),
          sourceRef: "test:mission-free-worktree-rebind",
        }],
      },
    });
    expect(JSON.parse(rebound.stdout).task.binding).not.toHaveProperty("missionId");
  });

  test("rejects malformed persisted task semantics instead of reporting a factual empty source", () => {
    const taskHome = home();
    const path = join(taskHome, "state", "tasks.json");
    const malformed = JSON.parse(readFileSync(path, "utf8"));
    malformed.tasks.push({
      id: "broken",
      title: "Broken task",
      objective: "Claim completion without a submitted result",
      acceptance: ["This must fail"],
      origin: { kind: "principal-explicit", sourceRef: "test:malformed" },
      binding: { kind: "independent" },
      lifecycle: "settled",
      nextActor: "none",
      revision: 1,
      corrections: [],
      resultClaims: [],
      createdAt: "2026-07-28T00:00:00Z",
      updatedAt: "2026-07-28T00:00:00Z",
    });
    writeFileSync(path, `${JSON.stringify(malformed, null, 2)}\n`);

    expect(() => listPrincipalTasks(taskHome)).toThrow(
      "a settled task requires its latest result claim to be locally accepted",
    );
  });

  test("exposes the complete local task lifecycle through the CLI without implying project settlement", () => {
    const taskHome = home();
    const createdResult = taskCli(
      taskHome,
      "create",
      "--title",
      "CLI lifecycle",
      "--objective",
      "Exercise every Principal task command",
      "--accept",
      "The persisted source survives every command",
      "--next-actor",
      "agent",
      "--source-ref",
      "test:cli-create",
      "--expected-source-revision",
      "0",
    );
    expect(createdResult.exitCode).toBe(0);
    const created = JSON.parse(createdResult.stdout);
    const taskId = created.task.id;

    const shown = taskCli(taskHome, "show", taskId);
    expect(shown.exitCode).toBe(0);
    expect(JSON.parse(shown.stdout)).toMatchObject({
      sourceRevision: 1,
      task: { id: taskId, revision: 1 },
    });

    const steps: string[][] = [
      [
        "assign",
        taskId,
        "--next-actor",
        "principal",
        "--expected-source-revision",
        "1",
        "--expected-revision",
        "1",
      ],
      [
        "correct",
        taskId,
        "--statement",
        "Return the corrected task to the Agent.",
        "--source-ref",
        "test:cli-correct",
        "--next-actor",
        "agent",
        "--expected-source-revision",
        "2",
        "--expected-revision",
        "2",
      ],
      [
        "submit",
        taskId,
        "--summary",
        "CLI lifecycle completed.",
        "--evidence-ref",
        "test:tasks.test.ts",
        "--source-ref",
        "agent:cli-test",
        "--expected-source-revision",
        "3",
        "--expected-revision",
        "3",
      ],
      [
        "accept",
        taskId,
        "--source-ref",
        "test:principal-local-accept",
        "--expected-source-revision",
        "4",
        "--expected-revision",
        "4",
      ],
      [
        "reopen",
        taskId,
        "--statement",
        "Reopen only the local Workbench task.",
        "--source-ref",
        "test:cli-reopen",
        "--next-actor",
        "principal",
        "--expected-source-revision",
        "5",
        "--expected-revision",
        "5",
      ],
    ];
    for (const step of steps) {
      const result = taskCli(taskHome, ...step);
      expect(result.exitCode, result.stderr).toBe(0);
    }

    const listed = taskCli(taskHome, "list");
    expect(listed.exitCode).toBe(0);
    expect(JSON.parse(listed.stdout)).toMatchObject({
      version: "rosso.principal-tasks.v1",
      sourceRevision: 6,
      tasks: [{
        id: taskId,
        lifecycle: "open",
        nextActor: "principal",
        revision: 6,
        resultClaims: [{
          standing: "accepted",
          resolution: {
            acceptanceBoundary: "workbench-local-task-only",
          },
        }],
      }],
    });
  });
});
