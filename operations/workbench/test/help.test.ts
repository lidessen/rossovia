import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { STATE_FAILURE_EXIT_CODE } from "../src/cli-errors";
import { HELP } from "../src/help";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const launcher = join(repositoryRoot, "operations", "workbench", "rossovia");
const manifest = JSON.parse(
  await Bun.file(join(repositoryRoot, "operations", "workbench", "package.json")).text(),
) as { name: string; version: string };
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

function cliRun(args: string[], options: { cwd?: string; stdin?: string } = {}) {
  return command([launcher, ...args], options);
}

function temporary(): string {
  const root = mkdtempSync(join(tmpdir(), "rossovia-help-"));
  temporaryRoots.push(root);
  return root;
}

const commandPaths = HELP.map((entry) => entry.path.join(" "));

describe("Rossovia CLI help contract", () => {
  test("every command family and nested verb prints usage for --help, -h, and help <path> with exit 0 and empty stderr", () => {
    for (const path of commandPaths) {
      const flags = cliRun([...path.split(" "), "--help"], { stdin: "" });
      expect(flags.exitCode, `${path} --help`).toBe(0);
      expect(flags.stderr, `${path} --help stderr`).toBe("");

      const short = cliRun([...path.split(" "), "-h"], { stdin: "" });
      expect(short.exitCode, `${path} -h`).toBe(0);
      expect(short.stderr, `${path} -h stderr`).toBe("");

      const spelled = cliRun(["help", ...path.split(" ")], { stdin: "" });
      expect(spelled.exitCode, `help ${path}`).toBe(0);
      expect(spelled.stderr, `help ${path} stderr`).toBe("");

      if (path === "help") {
        const topLevel = cliRun(["--help"]).stdout;
        expect(flags.stdout, "help --help resolves to the whole-CLI usage").toBe(topLevel);
        expect(short.stdout, "help -h resolves to the whole-CLI usage").toBe(topLevel);
        expect(spelled.stdout, "help help resolves to the help command's own usage")
          .toContain("usage: rossovia help [<command-path>...]");
        continue;
      }
      const usageLine = flags.stdout.split("\n")[0] ?? "";
      expect(usageLine, `${path} --help usage`).toMatch(/^usage: rossovia /);
      expect(usageLine, `${path} --help usage line`).toContain(path.split(" ").at(-1)!);
      expect(short.stdout, `${path} -h output`).toBe(flags.stdout);
      expect(spelled.stdout, `help ${path} output`).toBe(flags.stdout);
    }
  }, { timeout: 60000 });

  test("family help lists its subcommands and points at per-subcommand help", () => {
    const task = cliRun(["task", "--help"]);
    expect(task.exitCode).toBe(0);
    expect(task.stdout).toContain("usage: rossovia task <subcommand> [arguments]");
    expect(task.stdout).toContain("effect: mixed — each subcommand's effect is shown below");
    expect(task.stdout).toContain("task subcommands:");
    expect(task.stdout).toContain("create (writes-state), list (read-only)");
    expect(task.stdout).toContain("run 'rossovia help task <subcommand>' for the full usage of one subcommand");

    const mission = cliRun(["help", "mission"]);
    expect(mission.exitCode).toBe(0);
    expect(mission.stdout).toContain("mission subcommands:");
    expect(mission.stdout).toContain("init (writes-state), list (read-only)");
  });

  test("top-level help keeps every command line and adds the help and version pointers", () => {
    const help = cliRun(["--help"]);
    expect(help.exitCode).toBe(0);
    expect(help.stderr).toBe("");
    expect(help.stdout).toContain("usage: rossovia [--home PATH] <command>");
    expect(help.stdout).toContain("task run <id> --worker <worker-id> [--continue <attempt-id>]");
    expect(help.stdout).toContain("mission [--root <path>] <init|add-branch|focus|suspend|resume|settle|check|status|list|close|prune> ...");
    expect(help.stdout).toContain("hook <intervention|artifact> <codex|claude|cursor> [post-tool-use|after-file-edit|stop]");
    expect(help.stdout).toContain("run 'rossovia help <command>' for per-command usage");
    expect(help.stdout).toContain("rossovia --version prints the @rosso/workbench package version");
    expect(cliRun(["-h"]).stdout).toBe(help.stdout);
    expect(cliRun(["help"]).stdout).toBe(help.stdout);
    expect(cliRun(["help", "--help"]).stdout).toBe(help.stdout);
  });

  test("--version prints the @rosso/workbench package version without touching any home", () => {
    const home = join(temporary(), "home");
    const version = cliRun(["--home", home, "--version"]);
    expect(version.exitCode).toBe(0);
    expect(version.stderr).toBe("");
    expect(version.stdout.trim()).toBe(`${manifest.name} ${manifest.version}`);
    expect(existsSync(home)).toBe(false);
  });

  test("help short-circuits before any command effect and writes no state", () => {
    const home = join(temporary(), "home");
    const root = join(temporary(), "elsewhere");
    mkdirSync(root, { recursive: true });
    for (const args of [
      ["--home", home, "task", "create", "--help"],
      ["--home", home, "task", "--help"],
      ["--home", home, "init", "--help"],
      ["--home", home, "hook", "artifact", "--help"],
      ["--home", home, "intervention", "observe", "--help"],
      ["--home", home, "--version"],
    ]) {
      const result = cliRun(args, { stdin: "" });
      expect(result.exitCode, args.join(" ")).toBe(0);
      expect(result.stderr, args.join(" ")).toBe("");
    }
    const mission = cliRun(["mission", "list", "--help"], { cwd: root });
    expect(mission.exitCode).toBe(0);
    expect(mission.stderr).toBe("");
    expect(mission.stdout).toContain("usage: rossovia mission [--root <path>] list");
    const failing = cliRun(["mission", "list"], { cwd: root });
    expect(failing.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(failing.stderr).toContain("rossovia: mission root not found");
    expect(failing.stderr).not.toContain("for usage");
    expect(existsSync(home)).toBe(false);
  });

  test("an unknown help path exits 2 with a usage pointer at the nearest known help path", () => {
    const result = cliRun(["help", "bogus"]);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("rossovia: unknown help path: bogus\nrun 'rossovia help' for usage\n");
    expect(cliRun(["help", "task", "bogus"]).stderr)
      .toBe("rossovia: unknown help path: task bogus\nrun 'rossovia help task' for usage\n");
    expect(cliRun(["help", "mission", "list", "bogus"]).stderr)
      .toBe("rossovia: unknown help path: mission list bogus\nrun 'rossovia help mission list' for usage\n");
  });

  test("previously invalid non-help calls keep their errors and gain the nearest help pointer", () => {
    const show = cliRun(["task", "show"]);
    expect(show.exitCode).toBe(2);
    expect(show.stderr).toBe("rossovia: task show requires exactly one task id\nrun 'rossovia help task show' for usage\n");
    const init = cliRun(["init", "--bad", "x"]);
    expect(init.exitCode).toBe(2);
    expect(init.stderr).toBe("rossovia: invalid init option sequence: --bad x\nrun 'rossovia help init' for usage\n");
    const bogus = cliRun(["task", "bogus", "--help"]);
    expect(bogus.exitCode).toBe(2);
    expect(bogus.stderr).toBe("rossovia: unknown task command: bogus\nrun 'rossovia help task' for usage\n");
    const unknown = cliRun(["frobnicate"]);
    expect(unknown.exitCode).toBe(2);
    expect(unknown.stderr).toBe("rossovia: unknown command: frobnicate\nrun 'rossovia help' for usage\n");
  });

  test("task run help documents the optional --max-steps flag without changing its usage line", () => {
    const run = cliRun(["help", "task", "run"], { stdin: "" });
    expect(run.exitCode).toBe(0);
    expect(run.stderr).toBe("");
    expect(run.stdout).toContain("usage: rossovia task run <id> --worker <worker-id> [--continue <attempt-id>]");
    expect(run.stdout).toContain("--max-steps <positive-integer>");
    expect(run.stdout).toContain("30-minute emergency timeout");
  });

  test("help resolution does not change a valid non-help invocation", () => {
    const root = temporary();
    const home = join(root, "home");
    const initialized = cliRun(["--home", home, "init"]);
    expect(initialized.exitCode).toBe(0);
    expect(initialized.stderr).toBe("");
    expect(JSON.parse(initialized.stdout)).toEqual(expect.objectContaining({
      initialized: true,
      writeAccess: "verified",
    }));
    const created = cliRun([
      "--home", home, "task", "create",
      "--title", "Help test task",
      "--objective", "Prove dispatch still runs",
      "--accept", "The task is created",
      "--next-actor", "agent",
      "--source-ref", "test:help",
      "--expected-source-revision", "0",
    ]);
    expect(created.exitCode).toBe(0);
    expect(created.stderr).toBe("");
    expect(JSON.parse(created.stdout)).toMatchObject({ sourceRevision: 1 });
  });
});
