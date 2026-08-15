import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
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
  options: { cwd?: string } = {},
): CommandResult {
  const result = spawnSync(argv[0]!, argv.slice(1), {
    cwd: options.cwd ?? repositoryRoot,
    encoding: "utf8",
  });
  return {
    exitCode: result.status ?? -1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function cli(args: string[], options: { cwd?: string } = {}): CommandResult {
  return command([launcher, ...args], options);
}

function git(cwd: string, ...args: string[]): void {
  const result = command(["git", ...args], { cwd });
  if (result.exitCode !== 0) throw new Error(result.stderr);
}

function missionRepository(): string {
  const repository = mkdtempSync(join(tmpdir(), "rossovia-mission-cli-"));
  temporaryRoots.push(repository);
  git(repository, "init");
  git(repository, "config", "user.name", "Mission CLI Contract Test");
  git(repository, "config", "user.email", "mission-cli@example.test");
  mkdirSync(join(repository, "operations", "missions"), { recursive: true });
  return repository;
}

function initArgs(id: string): string[] {
  return [
    "init", id,
    "--title", `${id} title`,
    "--mainline", "Return every branch to one reviewable baseline",
    "--accept", "Every branch has a return record",
    "--source", "test:mission-cli-contract",
  ];
}

function assertJsonReceipt(result: CommandResult, action: string, mission: string): {
  root: string;
  path: string;
} {
  expect(result.exitCode, result.stderr).toBe(0);
  expect(result.stderr).toBe("");
  const receipt = JSON.parse(result.stdout) as Record<string, unknown>;
  expect(receipt.action).toBe(action);
  expect(receipt.mission).toBe(mission);
  expect(typeof receipt.root).toBe("string");
  expect(typeof receipt.path).toBe("string");
  expect(receipt.status).toBeTruthy();
  return { root: receipt.root as string, path: receipt.path as string };
}

describe("mission CLI contract through the ordinary launcher", () => {
  test("--root works before and after the subcommand with one identical JSON receipt shape", () => {
    const repository = missionRepository();
    const root = join(repository, "operations", "missions");

    const before = cli(["mission", "--root", root, ...initArgs("before")], { cwd: repository });
    const beforeReceipt = assertJsonReceipt(before, "init", "before");
    expect(beforeReceipt.root).toBe(root);
    expect(beforeReceipt.path).toBe(join(root, "before.json"));
    expect(existsSync(beforeReceipt.path)).toBe(true);

    const after = cli(["mission", ...initArgs("after"), "--root", root], { cwd: repository });
    const afterReceipt = assertJsonReceipt(after, "init", "after");
    expect(afterReceipt.root).toBe(root);
    expect(afterReceipt.path).toBe(join(root, "after.json"));

    const status = cli(["mission", "--root", root, "status", "before"], { cwd: repository });
    expect(status.exitCode).toBe(0);
    expect(status.stderr).toBe("");
    expect(JSON.parse(status.stdout)).toEqual(expect.objectContaining({
      id: "before",
      mainline: "active",
      currentFocus: "mainline",
    }));
  });

  test("resolves the default mission root from the invocation cwd, never from --home", () => {
    const repository = missionRepository();
    const defaultRoot = realpathSync(join(repository, "operations", "missions"));

    const created = cli(["mission", ...initArgs("defaulted")], { cwd: repository });
    const receipt = assertJsonReceipt(created, "init", "defaulted");
    expect(receipt.root).toBe(defaultRoot);
    expect(receipt.path).toBe(join(defaultRoot, "defaulted.json"));

    const listing = cli(["mission", "list"], { cwd: repository });
    expect(listing.exitCode).toBe(0);
    expect(listing.stderr).toBe("");
    const active = (JSON.parse(listing.stdout) as { activeMissions: Array<{ id: string }> }).activeMissions;
    expect(active.map((entry) => entry.id)).toEqual(["defaulted"]);

    const homeMoved = cli(["--home", join(repository, ".rosso-home"), "mission", "list"], { cwd: repository });
    expect(homeMoved.exitCode, homeMoved.stderr).toBe(0);
    expect(homeMoved.stderr).toBe("");
    expect((JSON.parse(homeMoved.stdout) as { activeMissions: Array<{ id: string }> }).activeMissions)
      .toEqual(active);
    expect(existsSync(join(repository, ".rosso-home"))).toBe(false);

    const emptyCwd = join(repository, "no-mission-root-here");
    mkdirSync(emptyCwd, { recursive: true });
    const missing = cli(["mission", "list"], { cwd: emptyCwd });
    expect(missing.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(missing.stdout).toBe("");
    expect(missing.stderr.trim().split("\n")).toHaveLength(1);
    expect(missing.stderr).toContain("rossovia: mission root not found");
    expect(missing.stderr).not.toContain("for usage");
  });

  test("every previously path or silent verb prints a JSON receipt with empty stderr", () => {
    const repository = missionRepository();
    const root = join(repository, "operations", "missions");
    const recordPath = join(root, "founding.json");

    assertJsonReceipt(cli(["mission", "--root", root, ...initArgs("founding")], { cwd: repository }), "init", "founding");

    const added = assertJsonReceipt(cli([
      "mission", "add-branch", "founding", "research",
      "--kind", "investigation",
      "--purpose", "Inspect the missing continuity carrier",
      "--return-condition", "State whether a Git-tracked source is needed",
      "--source", "test:mission-cli-contract",
      "--root", root,
    ], { cwd: repository }), "add-branch", "founding");
    expect(added.path).toBe(recordPath);

    const focusedResult = cli([
      "mission", "focus", "founding", "mainline", "--root", root,
    ], { cwd: repository });
    const focused = assertJsonReceipt(focusedResult, "focus", "founding");
    expect(focused.path).toBe(recordPath);
    const focusedReceipt = JSON.parse(focusedResult.stdout) as { status: { currentFocus: string } };
    expect(focusedReceipt.status.currentFocus).toBe("mainline");

    const suspended = cli([
      "mission", "--root", root, "suspend", "founding", "research",
      "--reactivation-signal", "A material mission starts",
    ], { cwd: repository });
    const suspendedReceipt = JSON.parse(suspended.stdout) as {
      action: string;
      status: { openBranches: Array<{ id: string; status: string }> };
    };
    expect(suspended.exitCode).toBe(0);
    expect(suspended.stderr).toBe("");
    expect(suspendedReceipt.action).toBe("suspend");
    expect(suspendedReceipt.status.openBranches).toContainEqual(
      expect.objectContaining({ id: "research", status: "suspended" }),
    );

    const resumed = JSON.parse(cli([
      "mission", "resume", "founding", "research", "--root", root,
    ], { cwd: repository }).stdout) as {
      action: string;
      status: { currentFocus: string; openBranches: Array<{ id: string; status: string }> };
    };
    expect(resumed.action).toBe("resume");
    expect(resumed.status.currentFocus).toBe("research");
    expect(resumed.status.openBranches).toContainEqual(
      expect.objectContaining({ id: "research", status: "open" }),
    );

    const settled = JSON.parse(cli([
      "mission", "--root", root, "settle", "founding", "research",
      "--disposition", "no-change",
      "--mainline-delta", "The mission record is the required carrier",
    ], { cwd: repository }).stdout) as { action: string; status: { openBranches: unknown[] } };
    expect(settled.action).toBe("settle");
    expect(settled.status.openBranches).toEqual([]);

    const closed = JSON.parse(cli([
      "mission", "close", "founding", "--closure-source", "test:mission-cli-contract",
      "--root", root,
    ], { cwd: repository }).stdout) as { action: string; status: { mainline: string } };
    expect(closed.action).toBe("close");
    expect(closed.status.mainline).toBe("settled");

    git(repository, "add", "operations/missions/founding.json");
    git(repository, "commit", "-m", "ops: settle founding mission");

    const checked = cli(["mission", "check", "founding", "--git", "--require-committed", "--root", root], {
      cwd: repository,
    });
    expect(checked.exitCode).toBe(0);
    expect(checked.stderr).toBe("");
    expect(JSON.parse(checked.stdout)).toEqual(expect.objectContaining({ id: "founding", valid: true }));

    const pruned = cli(["mission", "--root", root, "prune", "founding"], { cwd: repository });
    expect(pruned.exitCode).toBe(0);
    expect(pruned.stderr).toBe("");
    expect(JSON.parse(pruned.stdout)).toEqual({
      action: "prune",
      mission: "founding",
      root,
      path: recordPath,
      removed: true,
    });
    expect(existsSync(recordPath)).toBe(false);
  });

  test("help documents the composable root grammar, the default root, and --home non-ownership", () => {
    const family = cli(["mission", "--help"]);
    expect(family.exitCode).toBe(0);
    expect(family.stderr).toBe("");
    expect(family.stdout).toContain("Default mission root: <cwd>/operations/missions");
    expect(family.stdout).toContain("--root <path>");
    expect(family.stdout).toContain("--home never relocates");

    for (const args of [
      ["mission", "list", "--help"],
      ["mission", "init", "--help"],
      ["mission", "--root", "/tmp/anywhere", "list", "--help"],
      ["mission", "list", "--root", "/tmp/anywhere", "--help"],
      ["help", "mission", "--root", "/tmp/anywhere", "list"],
      ["help", "mission", "list", "--root", "/tmp/anywhere"],
    ]) {
      const result = cli(args, { cwd: repositoryRoot });
      expect(result.exitCode, args.join(" ")).toBe(0);
      expect(result.stderr, args.join(" ")).toBe("");
      expect(result.stdout, args.join(" ")).toContain("Default mission root: <cwd>/operations/missions");
    }

    const verb = cli(["mission", "list", "--help"]);
    expect(verb.stdout).toContain("usage: rossovia mission [--root <path>] list");
  });

  test("invalid root grammar and arity use typed usage errors with the nearest mission help", () => {
    const cases: Array<{ args: string[]; message: string; pointer: string }> = [
      {
        args: ["mission", "--root", "/tmp/a", "--root", "/tmp/b", "list"],
        message: "rossovia: duplicate option: --root",
        pointer: "run 'rossovia help mission' for usage",
      },
      {
        args: ["mission", "--root", "/tmp/a", "list", "--root", "/tmp/b"],
        message: "rossovia: duplicate option: --root",
        pointer: "run 'rossovia help mission list' for usage",
      },
      {
        args: ["mission", "list", "--root", "/tmp/a", "--root", "/tmp/b"],
        message: "rossovia: invalid option: --root",
        pointer: "run 'rossovia help mission list' for usage",
      },
      {
        args: ["mission", "--root"],
        message: "rossovia: --root requires a path",
        pointer: "run 'rossovia help mission' for usage",
      },
      {
        args: ["mission", "list", "--root"],
        message: "rossovia: invalid option: --root",
        pointer: "run 'rossovia help mission list' for usage",
      },
      {
        args: ["mission", "init", "x", "--root"],
        message: "rossovia: invalid option: --root",
        pointer: "run 'rossovia help mission init' for usage",
      },
      {
        args: ["mission", "bogus"],
        message: "rossovia: unknown mission command: bogus",
        pointer: "run 'rossovia help mission' for usage",
      },
      {
        args: ["mission", "status"],
        message: "rossovia: missing required mission command argument",
        pointer: "run 'rossovia help mission status' for usage",
      },
    ];
    for (const { args, message, pointer } of cases) {
      const result = cli(args);
      expect(result.exitCode, args.join(" ")).toBe(USAGE_EXIT_CODE);
      expect(result.stdout, args.join(" ")).toBe("");
      expect(result.stderr.trim().split("\n"), args.join(" ")).toEqual([message, pointer]);
      expect(result.stderr, args.join(" ")).not.toMatch(/rosso:/);
    }
  });

  test("keeps a literal --root that is a verb option value out of the family root slots", () => {
    const repository = missionRepository();
    const root = join(repository, "operations", "missions");
    const result = cli([
      "mission", "--root", root,
      "init", "root-as-title",
      "--title", "--root",
      "--mainline", "contradiction",
      "--accept", "accepted",
      "--source", "test:root-value",
    ], { cwd: repository });
    const receipt = assertJsonReceipt(result, "init", "root-as-title");
    expect(receipt.root).toBe(root);
    expect(receipt.path).toBe(join(root, "root-as-title.json"));
    const record = JSON.parse(readFileSync(receipt.path, "utf8")) as { title: string };
    expect(record.title).toBe("--root");
  });

  test("a state failure keeps exit 1, empty stdout, and one stderr line", () => {
    const repository = missionRepository();
    const root = join(repository, "operations", "missions");
    assertJsonReceipt(cli(["mission", "--root", root, ...initArgs("taken")], { cwd: repository }), "init", "taken");
    const duplicate = cli(["mission", "--root", root, ...initArgs("taken")], { cwd: repository });
    expect(duplicate.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(duplicate.stdout).toBe("");
    expect(duplicate.stderr.trim().split("\n")).toHaveLength(1);
    expect(duplicate.stderr).toContain("rossovia: mission record already exists");
    expect(duplicate.stderr).not.toContain("for usage");
  });
});
