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
  correctPrincipalTask,
  createPrincipalTask,
  showPrincipalTask,
  submitPrincipalTaskResult,
} from "../src/tasks";
import {
  runPrincipalTask,
  type TaskRunRequest,
  type TaskRunRunner,
} from "../src/task-run";

const temporaryRoots: string[] = [];
const repositoryRoot = resolve(import.meta.dir, "../../..");
const bunCli = join(repositoryRoot, "operations", "workbench", "src", "cli.ts");

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
}

function fixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "rossovia-task-run-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  const primary = join(root, "project");
  const worktree = join(root, "worktree");
  initializeHome(home);
  mkdirSync(primary, { recursive: true });
  git(primary, "init", "-b", "main");
  git(primary, "config", "user.name", "Task Run Test");
  git(primary, "config", "user.email", "task-run@example.test");
  writeFileSync(join(primary, "README.md"), "# Task run fixture\n");
  git(primary, "add", "README.md");
  git(primary, "commit", "-m", "initial");
  git(primary, "remote", "add", "origin", "https://example.test/lidessen/task-run.git");
  git(primary, "worktree", "add", "-b", "task/run", worktree);
  registerProject(home, {
    path: primary,
    id: "repository:task-run",
    aliases: ["task-run"],
  });
  return { root, home, primary, worktree };
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

function agentTask(fixture_: Fixture) {
  return createPrincipalTask(fixture_.home, {
    title: "Run one ordinary task",
    objective: "Implement the exact bounded change",
    acceptance: ["The requested behavior is observable", "Named checks pass"],
    nextActor: "agent",
    sourceRef: "test:task-run",
    expectedSourceRevision: 0,
    project: "task-run",
    worktree: fixture_.worktree,
  });
}

class FakeRunner implements TaskRunRunner {
  readonly requests: TaskRunRequest[] = [];

  run(request: TaskRunRequest) {
    this.requests.push(request);
    writeFileSync(request.finalRecordPath, `${JSON.stringify({
      version: "work-cell.run.v4",
      runId: `fake-run-${this.requests.length}`,
      status: "passed",
    })}\n`, { flag: "wx" });
    return { runId: `fake-run-${this.requests.length}`, status: "passed" as const };
  }
}

describe("task run public boundary", () => {
  test("lowers exact current task guidance without Mission and appends immutable attempts", () => {
    const current = fixture();
    const created = agentTask(current);
    const firstCorrection = correctPrincipalTask(current.home, {
      id: created.task.id,
      statement: "Preserve the public contract.",
      sourceRef: "test:first-correction",
      nextActor: "agent",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    });
    const corrected = correctPrincipalTask(current.home, {
      id: created.task.id,
      statement: "Do not add a post-completion mechanism.",
      sourceRef: "test:second-correction",
      nextActor: "agent",
      expectedSourceRevision: 2,
      expectedRevision: firstCorrection.task.revision,
    });
    const runner = new FakeRunner();
    const run = () => runPrincipalTask(current.home, {
      id: created.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      variant: "high",
      expectedSourceRevision: 3,
      expectedRevision: corrected.task.revision,
    }, runner);

    const first = run();
    const second = run();
    const input = JSON.parse(readFileSync(join(current.home, first.inputRef), "utf8"));
    expect(input).toMatchObject({
      intent: "Implement the exact bounded change",
      acceptance: ["The requested behavior is observable", "Named checks pass"],
      instructions: [
        "Complete the current Workbench Task in the bound worktree. Do not claim semantic acceptance.",
        "Preserve the public contract.",
        "Do not add a post-completion mechanism.",
      ],
      workspace: {
        root: realpathSync(current.worktree),
        writePaths: ["."],
      },
    });
    expect(corrected.task.binding).not.toHaveProperty("missionId");
    expect(first.attemptId).not.toBe(second.attemptId);
    expect(first.inputRef).not.toBe(second.inputRef);
    expect(first.finalRecordRef).not.toBe(second.finalRecordRef);
    expect(runner.requests).toEqual([
      expect.objectContaining({ driver: "opencode-cli", model: "opencode/go", variant: "high" }),
      expect.objectContaining({ driver: "opencode-cli", model: "opencode/go", variant: "high" }),
    ]);

    const settlement = JSON.parse(readFileSync(join(current.home, first.settlementRef), "utf8"));
    expect(settlement).toMatchObject({
      taskRevision: corrected.task.revision,
      attemptId: first.attemptId,
      inputRef: first.inputRef,
      finalRecordRef: first.finalRecordRef,
      status: "recorded",
      cellStatus: "passed",
      semanticAcceptance: "not-evaluated",
    });
    expect(showPrincipalTask(current.home, created.task.id)).toEqual({
      sourceRevision: 3,
      task: corrected.task,
    });
  });

  test("requires explicit OpenCode driver and model at the CLI boundary", () => {
    const current = fixture();
    const missingDriver = taskCli(current.home, "run", "unused", "--model", "opencode/go", "--expected-source-revision", "0", "--expected-revision", "1");
    expect(missingDriver.exitCode).toBe(2);
    expect(missingDriver.stderr).toContain("task command requires --driver <value>");

    const missingModel = taskCli(current.home, "run", "unused", "--driver", "opencode-cli", "--expected-source-revision", "0", "--expected-revision", "1");
    expect(missingModel.exitCode).toBe(2);
    expect(missingModel.stderr).toContain("task command requires --model <value>");
  });

  test("rejects dirty, nonexistent, unbound, and completed tasks before the runner", () => {
    const dirty = fixture();
    const dirtyTask = agentTask(dirty);
    writeFileSync(join(dirty.worktree, "dirty.txt"), "dirty\n");
    const runner = new FakeRunner();
    expect(() => runPrincipalTask(dirty.home, {
      id: dirtyTask.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner)).toThrow("task Worktree is not clean");

    const nonexistent = fixture();
    const nonexistentTask = agentTask(nonexistent);
    rmSync(nonexistent.worktree, { recursive: true, force: true });
    expect(() => runPrincipalTask(nonexistent.home, {
      id: nonexistentTask.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner)).toThrow("task Worktree does not exist");

    const unbound = fixture();
    const unboundTask = createPrincipalTask(unbound.home, {
      title: "Unbound task",
      objective: "Remain unbound",
      acceptance: ["Runner is not called"],
      nextActor: "agent",
      sourceRef: "test:unbound",
      expectedSourceRevision: 0,
    });
    expect(() => runPrincipalTask(unbound.home, {
      id: unboundTask.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    }, runner)).toThrow("must be bound to an existing project Worktree");

    const completed = fixture();
    const completedTask = agentTask(completed);
    const submitted = submitPrincipalTaskResult(completed.home, {
      id: completedTask.task.id,
      summary: "Claim",
      evidenceRefs: ["test:claim"],
      sourceRef: "test:submit",
      expectedSourceRevision: 1,
      expectedRevision: 1,
    });
    const accepted = acceptPrincipalTaskResult(completed.home, {
      id: completedTask.task.id,
      sourceRef: "test:accept",
      expectedSourceRevision: 2,
      expectedRevision: submitted.task.revision,
    });
    expect(() => runPrincipalTask(completed.home, {
      id: completedTask.task.id,
      driver: "opencode-cli",
      model: "opencode/go",
      expectedSourceRevision: 3,
      expectedRevision: accepted.task.revision,
    }, runner)).toThrow("completed tasks are viewable history");
    expect(runner.requests).toHaveLength(0);
  });
});

function taskCli(home: string, ...arguments_: string[]): {
  exitCode: number;
  stderr: string;
} {
  const result = Bun.spawnSync([
    process.execPath,
    bunCli,
    "--home",
    home,
    "task",
    ...arguments_,
  ], {
    cwd: repositoryRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  return { exitCode: result.exitCode, stderr: result.stderr.toString() };
}
