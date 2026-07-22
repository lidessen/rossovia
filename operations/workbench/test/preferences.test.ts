import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const bunCli = join(repositoryRoot, "operations", "workbench", "src", "cli.ts");
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function command(argv: string[], cwd = repositoryRoot): { exitCode: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync(argv, { cwd, stdout: "pipe", stderr: "pipe" });
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

function workbench(home: string, ...args: string[]) {
  return command([process.execPath, bunCli, "--home", home, ...args]);
}

function git(cwd: string, ...args: string[]): void {
  const result = command(["git", ...args], cwd);
  if (result.exitCode !== 0) throw new Error(result.stderr);
}

function createRepository(path: string): void {
  mkdirSync(path, { recursive: true });
  git(path, "init");
  git(path, "config", "user.name", "Rossovia Test");
  git(path, "config", "user.email", "rossovia@example.test");
  writeFileSync(join(path, "README.md"), "# Fixture\n");
  git(path, "add", "README.md");
  git(path, "commit", "-m", "initial");
  git(path, "remote", "add", "origin", "https://example.test/lidessen/survey.git");
}

describe("user and project preference boundary", () => {
  test("keeps one user source, deterministic project precedence, and digest-only receipts", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-preferences-"));
    temporaryRoots.push(root);
    const home = join(root, "home");
    const repository = join(root, "survey");
    createRepository(repository);
    expect(workbench(home, "init").exitCode).toBe(0);
    expect(workbench(home, "register", repository, "--id", "repository:survey", "--alias", "survey").exitCode).toBe(0);

    const globalSet = workbench(
      home,
      "preference",
      "set",
      "execution-carrier",
      "--statement",
      "Prefer Work Cell for stable bounded work.",
      "--reopen-when",
      "A required capability is unavailable.",
    );
    expect(globalSet.exitCode).toBe(0);
    expect(JSON.parse(globalSet.stdout).scope).toBe("user");
    const receiptPath = join(home, "receipts", "preferences.jsonl");
    const firstReceipts = readFileSync(receiptPath, "utf8");
    expect(firstReceipts).not.toContain("Prefer Work Cell");
    expect(JSON.parse(firstReceipts.trim())).toEqual(expect.objectContaining({
      version: "rosso.preference-receipt.v2",
      action: "set",
      id: "execution-carrier",
      projectId: null,
    }));
    expect(JSON.parse(firstReceipts.trim())).not.toHaveProperty("scope");

    const unchanged = workbench(
      home,
      "preference",
      "set",
      "execution-carrier",
      "--statement",
      "Prefer Work Cell for stable bounded work.",
      "--reopen-when",
      "A required capability is unavailable.",
    );
    expect(JSON.parse(unchanged.stdout).changed).toBe(false);
    expect(readFileSync(receiptPath, "utf8")).toBe(firstReceipts);

    const projectSet = workbench(
      home,
      "preference",
      "set",
      "execution-carrier",
      "--statement",
      "For survey, prefer a native sub-agent.",
      "--project",
      "survey",
    );
    expect(projectSet.exitCode).toBe(0);
    expect(JSON.parse(projectSet.stdout).scope).toBe("project");

    const globalList = JSON.parse(workbench(home, "preference", "list").stdout);
    expect(globalList.version).toBe("rosso.preference-projection.v2");
    expect(globalList.preferences[0]).toEqual(expect.objectContaining({
      scope: "user",
      statement: "Prefer Work Cell for stable bounded work.",
    }));
    const projectList = JSON.parse(workbench(home, "preference", "list", "--project", "survey").stdout);
    expect(projectList.preferences[0]).toEqual(expect.objectContaining({
      scope: "project",
      projectId: "repository:survey",
      statement: "For survey, prefer a native sub-agent.",
    }));

    const retired = workbench(home, "preference", "retire", "execution-carrier", "--project", "survey");
    expect(retired.exitCode).toBe(0);
    expect(JSON.parse(retired.stdout).scope).toBe("project");
    const fallback = JSON.parse(workbench(home, "preference", "list", "--project", "survey").stdout);
    expect(fallback.preferences[0].scope).toBe("user");

    const unknownProject = workbench(
      home,
      "preference",
      "set",
      "unknown",
      "--statement",
      "Must fail.",
      "--project",
      "missing",
    );
    expect(unknownProject.exitCode).toBe(2);
    expect(unknownProject.stderr).toContain("no project matches");

    const sourcePath = join(home, "config", "preferences.json");
    const sourceBefore = readFileSync(sourcePath, "utf8");
    writeFileSync(receiptPath, "not-json\n", "utf8");
    const rejected = workbench(home, "preference", "set", "receipt-preflight", "--statement", "Must not commit.");
    expect(rejected.exitCode).toBe(2);
    expect(rejected.stderr).toContain("invalid preference receipt");
    expect(readFileSync(sourcePath, "utf8")).toBe(sourceBefore);
  });
});
