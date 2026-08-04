import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const cli = join(repositoryRoot, "operations", "workbench", "dist", "rossovia.mjs");
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function command(
  argv: string[],
  options: { cwd?: string; stdin?: string } = {},
): { exitCode: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync(argv, {
    cwd: options.cwd ?? repositoryRoot,
    ...(options.stdin === undefined ? {} : { stdin: Buffer.from(options.stdin) }),
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

function git(cwd: string, ...args: string[]): string {
  const result = command(["git", ...args], { cwd });
  if (result.exitCode !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}

function workbench(home: string, ...args: string[]) {
  return command([process.execPath, cli, "--home", home, ...args]);
}

function createTask(
  home: string,
  sourceRevision: number,
  title: string,
  actor: "principal" | "agent" | "external",
  context: string[] = [],
) {
  return workbench(
    home,
    "task",
    "create",
    "--title",
    title,
    "--objective",
    title,
    "--accept",
    `${title} is visible in the correct queue`,
    "--next-actor",
    actor,
    "--source-ref",
    "principal:test",
    "--expected-source-revision",
    String(sourceRevision),
    ...context,
  );
}

describe("Rossovia status-line projection", () => {
  test("shows the verified Git locus and only current-worktree task queues without mutating their source", () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-statusline-"));
    temporaryRoots.push(temporary);
    const home = join(temporary, "home");
    const repository = join(temporary, "alpha");
    const nested = join(repository, "nested");
    mkdirSync(nested, { recursive: true });
    git(repository, "init");
    git(repository, "config", "user.name", "Rossovia Test");
    git(repository, "config", "user.email", "rossovia@example.test");
    git(repository, "remote", "add", "origin", "https://example.test/team/alpha.git");
    writeFileSync(join(repository, "README.md"), "# Alpha\n", "utf8");
    git(repository, "add", "README.md");
    git(repository, "commit", "-m", "initial");

    expect(workbench(home, "init").exitCode).toBe(0);
    expect(workbench(home, "register", repository, "--id", "repo:alpha", "--alias", "alpha").exitCode).toBe(0);
    const context = ["--project", "repo:alpha", "--worktree", repository];
    expect(createTask(home, 0, "Principal decision", "principal", context).exitCode).toBe(0);
    expect(createTask(home, 1, "Agent implementation", "agent", context).exitCode).toBe(0);
    expect(createTask(home, 2, "Unbound external task", "external").exitCode).toBe(0);
    writeFileSync(join(repository, "change.txt"), "dirty\n", "utf8");

    const taskSource = join(home, "state", "tasks.json");
    const before = readFileSync(taskSource, "utf8");
    const result = command(
      [process.execPath, cli, "--home", home, "statusline", "claude"],
      { stdin: JSON.stringify({ cwd: "/wrong", workspace: { current_dir: nested } }) },
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(
      `Rossovia · repo:alpha · ${realpathSync(repository)} · ${git(repository, "branch", "--show-current")} * · 待我 1 · 待 Agent 1`,
    );
    expect(readFileSync(taskSource, "utf8")).toBe(before);
  });

  test("degrades visibly when task state or host input is unavailable", () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-statusline-degraded-"));
    temporaryRoots.push(temporary);
    const repository = join(temporary, "repo");
    mkdirSync(repository, { recursive: true });
    git(repository, "init");

    const missingHome = command([
      process.execPath,
      cli,
      "--home",
      join(temporary, "missing-home"),
      "statusline",
      "--cwd",
      repository,
    ]);
    expect(missingHome.exitCode).toBe(0);
    expect(missingHome.stdout).toContain("任务源不可用");

    const malformed = command(
      [process.execPath, cli, "--home", join(temporary, "missing-home"), "statusline", "claude"],
      { cwd: repository, stdin: "not-json" },
    );
    expect(malformed.exitCode).toBe(0);
    expect(malformed.stdout).toContain(`${repository} ·`);
  });

  test("labels aggregate queues as global when the current Git locus is not registered", () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-statusline-global-"));
    temporaryRoots.push(temporary);
    const home = join(temporary, "home");
    const repository = join(temporary, "unregistered");
    mkdirSync(repository, { recursive: true });
    git(repository, "init");
    expect(workbench(home, "init").exitCode).toBe(0);
    expect(createTask(home, 0, "Global principal task", "principal").exitCode).toBe(0);
    expect(createTask(home, 1, "Global agent task", "agent").exitCode).toBe(0);

    const result = command([
      process.execPath,
      cli,
      "--home",
      home,
      "statusline",
      "--cwd",
      repository,
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("· 全局 · 待我 1 · 待 Agent 1");
  });

  test("uses the supported host-specific configuration surfaces", () => {
    const claude = JSON.parse(readFileSync(join(repositoryRoot, ".claude", "settings.json"), "utf8"));
    expect(claude.statusLine).toEqual({
      type: "command",
      command: "\"$(git rev-parse --show-toplevel)/operations/workbench/rossovia\" statusline claude",
    });

    const codex = Bun.TOML.parse(
      readFileSync(join(repositoryRoot, ".codex", "config.toml"), "utf8"),
    ) as { tui: { status_line: string[] } };
    expect(codex.tui).toEqual({
      status_line: ["project-name", "current-dir", "git-branch", "task-progress"],
    });
  });
});
