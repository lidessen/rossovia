import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { STATE_FAILURE_EXIT_CODE, USAGE_EXIT_CODE } from "../src/cli-errors";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const launcher = join(repositoryRoot, "operations", "workbench", "rossovia");
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function command(
  argv: string[],
  options: { cwd?: string; stdin?: string; env?: Record<string, string> } = {},
): CommandResult {
  const result = spawnSync(argv[0]!, argv.slice(1), {
    cwd: options.cwd ?? repositoryRoot,
    encoding: "utf8",
    ...(options.stdin === undefined ? {} : { input: options.stdin }),
    ...(options.env === undefined ? {} : { env: { ...process.env, ...options.env } }),
  });
  return {
    exitCode: result.status ?? -1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function cli(args: string[], options: { cwd?: string; stdin?: string } = {}): CommandResult {
  return command([launcher, ...args], options);
}

function git(cwd: string, ...args: string[]): string {
  const result = command(["git", ...args], { cwd });
  if (result.exitCode !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}

function createRepository(path: string, remote = "https://example.test/lidessen/taxonomy.git"): void {
  mkdirSync(path, { recursive: true });
  git(path, "init");
  git(path, "config", "user.name", "Rossovia Error Taxonomy Test");
  git(path, "config", "user.email", "taxonomy@example.test");
  writeFileSync(join(path, "README.md"), "# Fixture\n");
  git(path, "add", "README.md");
  git(path, "commit", "-m", "initial");
  git(path, "remote", "add", "origin", remote);
}

function helpPointer(helpPath: string[]): string {
  return `run 'rossovia help${helpPath.length === 0 ? "" : ` ${helpPath.join(" ")}`}' for usage`;
}

function usageCases(): Array<{ args: string[]; helpPath: string[] }> {
  return [
    { args: [], helpPath: [] },
    { args: ["frobnicate"], helpPath: [] },
    { args: ["--frobnicate"], helpPath: [] },
    { args: ["--home"], helpPath: [] },
    { args: ["--version", "extra"], helpPath: [] },
    { args: ["help", "bogus"], helpPath: [] },
    { args: ["help", "task", "bogus"], helpPath: ["task"] },
    { args: ["resolve"], helpPath: ["resolve"] },
    { args: ["resolve", "a", "b"], helpPath: ["resolve"] },
    { args: ["init", "--bad", "x"], helpPath: ["init"] },
    { args: ["project"], helpPath: ["project"] },
    { args: ["project", "bogus"], helpPath: ["project"] },
    { args: ["project", "list", "extra"], helpPath: ["project", "list"] },
    { args: ["worker"], helpPath: ["worker"] },
    { args: ["worker", "bogus"], helpPath: ["worker"] },
    { args: ["worker", "list", "extra"], helpPath: ["worker", "list"] },
    { args: ["setup"], helpPath: ["setup"] },
    { args: ["setup", "bogus"], helpPath: ["setup"] },
    { args: ["setup", "status", "--bad", "x"], helpPath: ["setup", "status"] },
    { args: ["setup", "apply", "--bad", "x"], helpPath: ["setup", "apply"] },
    { args: ["migrate", "--bad", "x"], helpPath: ["migrate"] },
    { args: ["root"], helpPath: ["root"] },
    { args: ["root", "bogus"], helpPath: ["root"] },
    { args: ["root", "list", "extra"], helpPath: ["root", "list"] },
    { args: ["root", "add"], helpPath: ["root", "add"] },
    { args: ["scan", "extra"], helpPath: ["scan"] },
    { args: ["register"], helpPath: ["register"] },
    { args: ["register", "--id"], helpPath: ["register"] },
    { args: ["attach"], helpPath: ["attach"] },
    { args: ["attach", "a"], helpPath: ["attach"] },
    { args: ["preference"], helpPath: ["preference"] },
    { args: ["preference", "bogus"], helpPath: ["preference"] },
    { args: ["preference", "set", "--bad", "x"], helpPath: ["preference", "set"] },
    { args: ["preference", "set", "--statement"], helpPath: ["preference", "set"] },
    { args: ["preference", "list", "--bad", "x"], helpPath: ["preference", "list"] },
    { args: ["preference", "retire", "--bad", "x"], helpPath: ["preference", "retire"] },
    { args: ["execution"], helpPath: ["execution"] },
    { args: ["execution", "bogus"], helpPath: ["execution"] },
    { args: ["execution", "inspect"], helpPath: ["execution", "inspect"] },
    { args: ["execution", "inspect", "a", "b", "c"], helpPath: ["execution", "inspect"] },
    { args: ["execution", "authorize", "a"], helpPath: ["execution", "authorize"] },
    { args: ["execution", "authorize", "a", "b", "--choice"], helpPath: ["execution", "authorize"] },
    { args: ["contribution"], helpPath: ["contribution"] },
    { args: ["contribution", "bogus"], helpPath: ["contribution"] },
    { args: ["contribution", "reconcile-lease", "a", "b"], helpPath: ["contribution", "reconcile-lease"] },
    { args: ["task"], helpPath: ["task"] },
    { args: ["task", "bogus"], helpPath: ["task"] },
    { args: ["task", "show"], helpPath: ["task", "show"] },
    { args: ["task", "list", "extra"], helpPath: ["task", "list"] },
    { args: ["task", "attempts"], helpPath: ["task", "attempts"] },
    { args: ["task", "create", "--title"], helpPath: ["task", "create"] },
    { args: ["task", "reconcile-attempt", "id"], helpPath: ["task", "reconcile-attempt"] },
    { args: ["task", "run", "id", "--worker", "w", "--expected-revision", "1"], helpPath: ["task", "run"] },
    { args: ["task", "assign", "id", "--next-actor", "agent"], helpPath: ["task", "assign"] },
    { args: ["task", "correct", "id", "--statement", "s", "--source-ref", "r", "--next-actor", "agent"], helpPath: ["task", "correct"] },
    { args: ["task", "link-execution", "id"], helpPath: ["task", "link-execution"] },
    { args: ["task", "rebind-worktree", "id"], helpPath: ["task", "rebind-worktree"] },
    { args: ["task", "submit", "id"], helpPath: ["task", "submit"] },
    { args: ["task", "append-review", "id", "--assessment-id", "a"], helpPath: ["task", "append-review"] },
    { args: ["task", "accept", "id"], helpPath: ["task", "accept"] },
    { args: ["task", "reopen", "id"], helpPath: ["task", "reopen"] },
    { args: ["mission"], helpPath: ["mission"] },
    { args: ["mission", "bogus"], helpPath: ["mission"] },
    { args: ["mission", "--root"], helpPath: ["mission"] },
    { args: ["mission", "init"], helpPath: ["mission", "init"] },
    { args: ["mission", "list", "--bad", "x"], helpPath: ["mission", "list"] },
    { args: ["mission", "status"], helpPath: ["mission", "status"] },
    { args: ["mission", "check", "m", "--git", "--bad"], helpPath: ["mission", "check"] },
    { args: ["intervention"], helpPath: ["intervention"] },
    { args: ["intervention", "bogus"], helpPath: ["intervention"] },
    { args: ["intervention", "observe", "--bad", "x"], helpPath: ["intervention", "observe"] },
    { args: ["intervention", "status", "--state-root", "/tmp"], helpPath: ["intervention", "status"] },
    { args: ["correct"], helpPath: ["correct"] },
    { args: ["correct", "--bad", "x"], helpPath: ["correct"] },
    { args: ["statusline", "--bad", "x"], helpPath: ["statusline"] },
  ];
}

describe("Rossovia CLI error taxonomy through the ordinary launcher", () => {
  test("every parser owner's usage failure exits 2 with empty stdout and the exact nearest-help pointer", () => {
    for (const { args, helpPath } of usageCases()) {
      const result = cli(args);
      const lines = result.stderr.trim().split("\n");
      expect(result.exitCode, args.join(" ") || "(no command)").toBe(USAGE_EXIT_CODE);
      expect(result.stdout, args.join(" ")).toBe("");
      expect(lines, args.join(" ")).toHaveLength(2);
      expect(lines[0], args.join(" ")).toMatch(/^rossovia: /);
      expect(lines[1], args.join(" ")).toBe(helpPointer(helpPath));
      expect(result.stderr, args.join(" ")).not.toMatch(/rosso:/);
    }
  });

  test("usage classification tracks the command location, not the message wording", () => {
    const unknownTop = cli(["frobnicate"]);
    expect(unknownTop.stderr).toContain("unknown command: frobnicate");
    expect(unknownTop.stderr).toContain(helpPointer([]));
    const unknownTask = cli(["task", "frobnicate"]);
    expect(unknownTask.stderr).toContain("unknown task command: frobnicate");
    expect(unknownTask.stderr).toContain(helpPointer(["task"]));
    const bogusOption = cli(["init", "--bad", "x"]);
    expect(bogusOption.stderr).toContain("invalid init option sequence: --bad x");
    expect(bogusOption.stderr).toContain(helpPointer(["init"]));
  });

  test("state failures exit with the stable non-usage code, one specific stderr line, and no help pointer", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-taxonomy-state-"));
    temporaryRoots.push(root);
    const home = join(root, "home");
    const registered = join(root, "survey");
    const conflicting = join(root, "conflicting");
    createRepository(registered);
    createRepository(conflicting, "https://example.test/lidessen/different.git");
    expect(cli(["--home", home, "init"]).exitCode).toBe(0);
    expect(cli(["--home", home, "register", registered, "--id", "repository:1304098496", "--alias", "survey"]).exitCode).toBe(0);
    const created = cli([
      "--home", home, "task", "create",
      "--title", "Taxonomy task",
      "--objective", "Prove state failures keep one stable exit code",
      "--accept", "One machine-readable failure",
      "--next-actor", "agent",
      "--source-ref", "test:error-taxonomy",
      "--expected-source-revision", "0",
    ]);
    expect(created.exitCode, created.stderr).toBe(0);
    const taskId = (JSON.parse(created.stdout) as { task: { id: string } }).task.id;

    const stateCases: Array<{
      name: string;
      args: string[];
      options?: { cwd?: string };
      contains: string;
      stdout: "empty" | ((stdout: string) => void);
    }> = [
      {
        name: "resolve unknown project",
        args: ["--home", home, "resolve", "nope"],
        contains: "no registered or indexed project matches 'nope'",
        stdout: "empty",
      },
      {
        name: "resolve moved workspace",
        args: ["--home", home, "resolve", "survey"],
        contains: "workspace path does not exist",
        stdout: "empty",
      },
      {
        name: "incomplete project list keeps its machine projection",
        args: ["--home", home, "project", "list"],
        contains: "project list is incomplete",
        stdout: (stdout) => {
          const projection = JSON.parse(stdout) as { complete: boolean };
          expect(projection.complete).toBe(false);
        },
      },
      {
        name: "register refuses to rebind a stable id",
        args: ["--home", home, "register", conflicting, "--id", "repository:1304098496"],
        contains: "refusing to rebind stable project id",
        stdout: "empty",
      },
      {
        name: "task show unknown id",
        args: ["--home", home, "task", "show", "missing"],
        contains: "Principal task not found: missing",
        stdout: "empty",
      },
      {
        name: "stale revision keeps the full recovery payload",
        args: [
          "--home", home, "task", "assign", taskId,
          "--next-actor", "agent",
          "--expected-source-revision", "0",
          "--expected-revision", "1",
        ],
        contains: "source revision is stale",
        stdout: (stdout) => {
          const recovery = JSON.parse(stdout) as { kind: string; id: string };
          expect(recovery).toEqual(expect.objectContaining({
            kind: "stale-task-revision",
            id: taskId,
            expectedSourceRevision: 0,
            currentSourceRevision: 1,
          }));
        },
      },
      {
        name: "preference set against an unknown project",
        args: ["--home", home, "preference", "set", "p", "--statement", "s", "--project", "missing"],
        contains: "no project matches",
        stdout: "empty",
      },
      {
        name: "attach against an unknown project",
        args: ["--home", home, "attach", "nope", registered],
        contains: "no project matches",
        stdout: "empty",
      },
      {
        name: "execution inspect against an unknown project",
        args: ["--home", home, "execution", "inspect", "nope", "m"],
        contains: "no project matches 'nope'",
        stdout: "empty",
      },
      {
        name: "mission list without a mission root",
        args: ["mission", "list"],
        options: { cwd: join(root, "empty-cwd") },
        contains: "mission root not found",
        stdout: "empty",
      },
      {
        name: "mission init over an existing record",
        args: [
          "mission", "--root", join(root, "missions"),
          "init", "taken",
          "--title", "taken",
          "--mainline", "contradiction",
          "--accept", "a",
          "--source", "s",
        ],
        contains: "mission record already exists",
        stdout: "empty",
      },      {
        name: "intervention status without an observed session",
        args: ["--home", home, "intervention", "status", "--state-root", join(root, "no-sessions"), "--session-id", "s"],
        contains: "no observed intervention session",
        stdout: "empty",
      },
      {
        name: "correct against a missing state file",
        args: [
          "correct", "--state-file", join(root, "missing.json"),
          "--rejected-assumption", "a",
          "--new-invariant", "i",
          "--affected-surface", "s",
          "--next-probe", "p",
        ],
        contains: "intervention state not found",
        stdout: "empty",
      },
    ];

    mkdirSync(join(root, "empty-cwd"), { recursive: true });
    expect(cli([
      "mission", "--root", join(root, "missions"),
      "init", "taken",
      "--title", "taken",
      "--mainline", "contradiction",
      "--accept", "a",
      "--source", "s",
    ]).exitCode).toBe(0);
    renameSync(registered, `${registered}-moved`);
    for (const candidate of stateCases) {
      const result = cli(candidate.args, candidate.options);
      expect(result.exitCode, candidate.name).toBe(STATE_FAILURE_EXIT_CODE);
      expect(result.stderr.trim().split("\n"), candidate.name).toHaveLength(1);
      expect(result.stderr, candidate.name).toMatch(/^rossovia: /);
      expect(result.stderr, candidate.name).toContain(candidate.contains);
      expect(result.stderr, candidate.name).not.toContain("for usage");
      expect(result.stderr, candidate.name).not.toMatch(/rosso:/);
      if (candidate.stdout === "empty") {
        expect(result.stdout, candidate.name).toBe("");
      } else {
        candidate.stdout(result.stdout);
      }
    }
  });

  test("the same message words classify as usage in a parser and as state in a domain owner", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-taxonomy-mirror-"));
    temporaryRoots.push(root);
    const home = join(root, "home");
    expect(cli(["--home", home, "init"]).exitCode).toBe(0);
    expect(cli([
      "--home", home, "preference", "set", "carrier",
      "--statement", "Prefer Work Cell for bounded work.",
    ]).exitCode).toBe(0);
    writeFileSync(join(home, "receipts", "preferences.jsonl"), "not-json\n", "utf8");

    const usageSide = cli(["init", "--bad", "x"]);
    expect(usageSide.exitCode).toBe(USAGE_EXIT_CODE);
    expect(usageSide.stderr).toContain("invalid init option sequence");
    expect(usageSide.stderr).toContain("for usage");

    const stateSide = cli(["--home", home, "preference", "set", "carrier", "--statement", "Again."]);
    expect(stateSide.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(stateSide.stderr).toContain("invalid preference receipt");
    expect(stateSide.stderr).not.toContain("for usage");

    const usageTask = cli(["task", "run", "id", "--worker", "w", "--expected-revision", "1"]);
    expect(usageTask.exitCode).toBe(USAGE_EXIT_CODE);
    expect(usageTask.stderr).toContain("invalid task option sequence");
    expect(usageTask.stderr).toContain(helpPointer(["task", "run"]));
  });

  test("hook platform fallback keeps its JSON/systemMessage exit-0 convention", () => {
    const intervention = cli(["hook", "intervention", "codex"], { stdin: "not-json" });
    expect(intervention.exitCode).toBe(0);
    expect(JSON.parse(intervention.stdout)).toEqual(expect.objectContaining({
      systemMessage: expect.stringContaining("Rossovia intervention unavailable"),
    }));
    const artifact = cli(["hook", "artifact", "cursor", "post-tool-use"], { stdin: "not-json" });
    expect(artifact.exitCode).toBe(0);
    expect(JSON.parse(artifact.stdout)).toEqual({});
    expect(artifact.stderr).toContain("Rossovia artifact unavailable");
  });

  test("the launcher keeps exit 127 with a clear message when Bun is absent", () => {
    const temporary = mkdtempSync(join(tmpdir(), "rossovia-taxonomy-no-bun-"));
    temporaryRoots.push(temporary);
    const result = cli(["--help"], { });
    expect(result.exitCode).toBe(0);
    const withoutBun = command([launcher, "--help"], { env: { PATH: temporary } });
    expect(withoutBun.exitCode).toBe(127);
    expect(withoutBun.stdout).toBe("");
    expect(withoutBun.stderr).toBe(
      "rossovia: Bun is required to run the Workbench from this source checkout\n",
    );
  });

  test("help, version, and successful calls keep their output and exit codes", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-taxonomy-success-"));
    temporaryRoots.push(root);
    const home = join(root, "home");
    const help = cli(["--help"]);
    expect(help.exitCode).toBe(0);
    expect(help.stderr).toBe("");
    expect(help.stdout).toContain("usage: rossovia [--home PATH] <command>");
    const version = cli(["--version"]);
    expect(version.exitCode).toBe(0);
    expect(version.stderr).toBe("");
    expect(version.stdout).toMatch(/^@rosso\/workbench \d+\.\d+\.\d+\n$/);
    const initialized = cli(["--home", home, "init"]);
    expect(initialized.exitCode).toBe(0);
    expect(initialized.stderr).toBe("");
    expect(JSON.parse(initialized.stdout)).toEqual(expect.objectContaining({
      initialized: true,
      writeAccess: "verified",
    }));
    expect(existsSync(join(root, "unexpected"))).toBe(false);
  });
});
