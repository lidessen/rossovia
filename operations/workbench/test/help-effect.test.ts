import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { EFFECT_CLASSES, HELP, familyEffect, familyVerbs, type FamilyHelp, type VerbHelp } from "../src/help";

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

function cli(args: string[], options: { cwd?: string; stdin?: string } = {}) {
  return command([launcher, ...args], options);
}

function temporary(): string {
  const root = mkdtempSync(join(tmpdir(), "rossovia-help-effect-"));
  temporaryRoots.push(root);
  return root;
}

const verbEntries = HELP.filter((entry): entry is VerbHelp => entry.kind === "verb");
const familyEntries = HELP.filter((entry): entry is FamilyHelp => entry.kind === "family");

describe("Rossovia CLI help effect contract", () => {
  test("every executable help path carries exactly one classification from the closed set", () => {
    expect(verbEntries.length).toBeGreaterThan(0);
    const seen = new Set<string>();
    for (const entry of verbEntries) {
      const path = entry.path.join(" ");
      expect(EFFECT_CLASSES, `verb ${path}`).toContain(entry.effect);
      expect(seen.has(path), `duplicate help path ${path}`).toBe(false);
      seen.add(path);
    }
    expect(seen.has("task run")).toBe(true);
    expect(seen.has("resolve")).toBe(true);
  });

  test("every executable path renders exactly one effect line with its registry label through the ordinary launcher", () => {
    for (const entry of verbEntries) {
      const path = entry.path.join(" ");
      const result = cli(["help", ...entry.path], { stdin: "" });
      expect(result.exitCode, `help ${path}`).toBe(0);
      expect(result.stderr, `help ${path}`).toBe("");
      const effectLines = result.stdout
        .split("\n")
        .filter((line) => line.startsWith("effect: "));
      expect(effectLines, `help ${path} effect line`).toEqual([`effect: ${entry.effect}`]);
      expect(result.stdout.split("\n")[0], `help ${path} usage line`).toMatch(/^usage: rossovia /);
    }
  }, { timeout: 60000 });

  test("family labels derive from subcommand verbs, and family help lists each subcommand with its label", () => {
    for (const entry of familyEntries) {
      const path = entry.path.join(" ");
      const verbs = familyVerbs(entry);
      expect(verbs.length, `family ${path}`).toBeGreaterThan(0);
      const labels = new Set(verbs.map((verb) => verb.effect));
      const expected = labels.size === 1 ? verbs[0]!.effect : "mixed";
      expect(familyEffect(entry), `family ${path}`).toBe(expected);

      const result = cli(["help", ...entry.path], { stdin: "" });
      expect(result.exitCode, `help ${path}`).toBe(0);
      expect(result.stderr, `help ${path}`).toBe("");
      for (const verb of verbs) {
        expect(result.stdout, `family ${path} subcommand ${verb.path.at(-1)!}`)
          .toContain(`${verb.path.at(-1)!} (${verb.effect})`);
      }
    }
  }, { timeout: 60000 });

  test("representative read-only verbs render read-only", () => {
    for (const path of [
      "resolve",
      "project list",
      "worker list",
      "task list",
      "task show",
      "task attempts",
      "statusline",
      "setup status",
      "execution inspect",
      "preference list",
      "intervention status",
      "root list",
      "mission list",
      "mission status",
      "mission check",
      "help",
    ]) {
      const result = cli(["help", ...path.split(" ")], { stdin: "" });
      expect(result.exitCode, path).toBe(0);
      expect(result.stdout, path).toContain("effect: read-only");
    }
  });

  test("representative effect-bearing verbs render writes-state, never read-only", () => {
    for (const path of [
      "init",
      "migrate",
      "register",
      "attach",
      "scan",
      "root add",
      "setup apply",
      "preference set",
      "preference retire",
      "execution authorize",
      "task create",
      "task assign",
      "task correct",
      "task link-execution",
      "task rebind-worktree",
      "task submit",
      "task append-review",
      "task accept",
      "task reopen",
      "task reconcile-attempt",
      "contribution reconcile-lease",
      "mission init",
      "mission add-branch",
      "mission focus",
      "mission suspend",
      "mission resume",
      "mission settle",
      "mission close",
      "mission prune",
      "intervention observe",
      "correct",
      "hook intervention",
    ]) {
      const result = cli(["help", ...path.split(" ")], { stdin: "" });
      expect(result.exitCode, path).toBe(0);
      expect(result.stdout, path).toContain("effect: writes-state");
      expect(result.stdout, path).not.toContain("effect: read-only");
    }
  });

  test("starts-work regressions: task run launches, hook artifact may continue an active run, ui serves the control plane", () => {
    expect(
      verbEntries.filter((entry) => entry.effect === "starts-work")
        .map((entry) => entry.path.join(" "))
        .sort(),
    ).toEqual(["hook artifact", "task run", "ui"]);

    const run = cli(["help", "task", "run"], { stdin: "" });
    expect(run.exitCode).toBe(0);
    expect(run.stdout).toContain("effect: starts-work");
    expect(run.stdout).not.toContain("effect: read-only");

    const artifact = cli(["help", "hook", "artifact"], { stdin: "" });
    expect(artifact.exitCode).toBe(0);
    expect(artifact.stdout).toContain("effect: starts-work");
    expect(artifact.stdout).not.toContain("effect: read-only");

    const ui = cli(["help", "ui"], { stdin: "" });
    expect(ui.exitCode).toBe(0);
    expect(ui.stdout).toContain("effect: starts-work");
    expect(ui.stdout).not.toContain("effect: read-only");
    expect(ui.stdout).toContain("Serve the Rossovia Principal Workbench web UI");

    const intervention = cli(["help", "hook", "intervention"], { stdin: "" });
    expect(intervention.exitCode).toBe(0);
    expect(intervention.stdout).toContain("effect: writes-state");

    const hook = cli(["help", "hook"], { stdin: "" });
    expect(hook.exitCode).toBe(0);
    expect(hook.stdout).toContain("effect: mixed");
    expect(hook.stdout).toContain("intervention (writes-state), artifact (starts-work)");
  });

  test("top-level help shows the legend, per-line labels, and mixed-family markers", () => {
    const top = cli(["--help"], { stdin: "" });
    expect(top.exitCode).toBe(0);
    expect(top.stderr).toBe("");
    expect(top.stdout).toContain("effect labels describe what a success path may do");
    expect(top.stdout).toContain("resolve <project> (read-only)");
    expect(top.stdout).toContain("init [--workspace-root PATH]... [--setup MODULE]... [--target-root PATH] (writes-state)");
    expect(top.stdout).toContain("task run <id> --worker <worker-id> [--continue <attempt-id>] (starts-work)");
    expect(top.stdout).toContain("mission [--root <path>] <init|add-branch|focus|suspend|resume|settle|check|status|list|close|prune> ... (mixed)");
    expect(top.stdout).toContain("hook <intervention|artifact> <codex|claude|cursor> [post-tool-use|after-file-edit|stop] (mixed)");
    expect(top.stdout).toContain("rossovia --version prints the @rosso/workbench package version (read-only)");
  });

  test("mixed family help lets an agent drill down to each verb's effect without guessing", () => {
    const task = cli(["help", "task"], { stdin: "" });
    expect(task.stdout).toContain("effect: mixed");
    expect(task.stdout).toContain("list (read-only)");
    expect(task.stdout).toContain("create (writes-state)");
    expect(task.stdout).toContain("run (starts-work)");

    const mission = cli(["help", "mission"], { stdin: "" });
    expect(mission.stdout).toContain("effect: mixed");
    expect(mission.stdout).toContain("list (read-only)");
    expect(mission.stdout).toContain("init (writes-state)");

    const preference = cli(["help", "preference"], { stdin: "" });
    expect(preference.stdout).toContain("set (writes-state)");
    expect(preference.stdout).toContain("list (read-only)");

    const hook = cli(["help", "hook"], { stdin: "" });
    expect(hook.stdout).toContain("effect: mixed");
    expect(hook.stdout).toContain("intervention (writes-state)");
    expect(hook.stdout).toContain("artifact (starts-work)");

    const project = cli(["help", "project"], { stdin: "" });
    expect(project.stdout).toContain("effect: read-only");
  });

  test("help/version/unknown/T3/T4 behavior does not regress", () => {
    const home = join(temporary(), "home");

    const help = cli(["--home", home, "task", "create", "--help"], { stdin: "" });
    expect(help.exitCode).toBe(0);
    expect(help.stderr).toBe("");
    expect(help.stdout).toContain("effect: writes-state");
    expect(existsSync(home)).toBe(false);

    const version = cli(["--home", home, "--version"]);
    expect(version.exitCode).toBe(0);
    expect(version.stderr).toBe("");
    expect(version.stdout.trim()).toBe(`${manifest.name} ${manifest.version}`);
    expect(existsSync(home)).toBe(false);

    const unknown = cli(["frobnicate"]);
    expect(unknown.exitCode).toBe(2);
    expect(unknown.stdout).toBe("");
    expect(unknown.stderr).toBe("rossovia: unknown command: frobnicate\nrun 'rossovia help' for usage\n");
    const unknownHelp = cli(["help", "bogus"]);
    expect(unknownHelp.exitCode).toBe(2);
    expect(unknownHelp.stderr).toBe("rossovia: unknown help path: bogus\nrun 'rossovia help' for usage\n");

    const show = cli(["task", "show"]);
    expect(show.exitCode).toBe(2);
    expect(show.stderr).toBe("rossovia: task show requires exactly one task id\nrun 'rossovia help task show' for usage\n");

    const missionRoot = temporary();
    mkdirSync(missionRoot, { recursive: true });
    const stateFailure = cli(["mission", "list"], { cwd: missionRoot });
    expect(stateFailure.exitCode).toBe(1);
    expect(stateFailure.stderr).toContain("rossovia: mission root not found");
    expect(stateFailure.stderr).not.toContain("for usage");

    const leading = cli(["mission", "--root", missionRoot, "list", "--help"], { stdin: "" });
    expect(leading.exitCode).toBe(0);
    expect(leading.stdout).toContain("effect: read-only");
    const trailing = cli(["mission", "list", "--root", missionRoot, "--help"], { stdin: "" });
    expect(trailing.exitCode).toBe(0);
    expect(trailing.stdout).toBe(leading.stdout);
  });
});
