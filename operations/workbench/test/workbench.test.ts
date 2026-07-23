import { afterEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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

function git(cwd: string, ...args: string[]): string {
  const result = command(["git", ...args], cwd);
  if (result.exitCode !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}

function createRepository(path: string, remote: string): void {
  mkdirSync(path, { recursive: true });
  git(path, "init");
  git(path, "config", "user.name", "Rossovia Test");
  git(path, "config", "user.email", "rossovia@example.test");
  writeFileSync(join(path, "README.md"), "# Fixture\n");
  git(path, "add", "README.md");
  git(path, "commit", "-m", "initial");
  git(path, "remote", "add", "origin", remote);
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "rossovia-workbench-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  const pool = join(root, "pool");
  const registered = join(root, "survey");
  const discovered = join(pool, "unregistered");
  createRepository(registered, "https://example.test/lidessen/meowask.git");
  createRepository(discovered, "https://example.test/lidessen/discovered.git");
  expect(workbench(home, "init", "--workspace-root", pool).exitCode).toBe(0);
  expect(workbench(home, "register", registered, "--id", "repository:1304098496", "--alias", "survey").exitCode).toBe(0);
  return { home, registered, discovered };
}

describe("Rossovia workbench", () => {
  test("initializes only the declared home contracts and scans bounded roots", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-workbench-init-"));
    temporaryRoots.push(root);
    const pool = join(root, "pool");
    const repository = join(pool, "fixture");
    createRepository(repository, "https://example.test/lidessen/fixture.git");
    const home = join(root, "home");
    const initialized = workbench(home, "init", "--workspace-root", pool);
    expect(initialized.exitCode).toBe(0);
    expect(JSON.parse(initialized.stdout)).toEqual({
      home: realpathSync(home),
      initialized: true,
      writeAccess: "verified",
      workspaceRoots: [realpathSync(pool)],
      indexedWorkspaces: 1,
    });
    expect(JSON.parse(readFileSync(join(home, "manifest.json"), "utf8"))).toEqual(expect.objectContaining({
      version: "rosso.home.v1",
      namespace: "rosso",
    }));
    expect(JSON.parse(readFileSync(join(home, "cache", "workspaces.json"), "utf8")).entries[0]).toEqual({
      path: realpathSync(repository),
      repository: "https://example.test/lidessen/fixture.git",
      aliases: ["fixture"],
    });
    expect(existsSync(join(home, "state", "preferences.json"))).toBe(false);
    expect(existsSync(join(home, "missions"))).toBe(false);
    expect(existsSync(join(home, "memory"))).toBe(false);
    expect(existsSync(join(home, "cognition"))).toBe(false);
    expect(readdirSync(join(home, "state")).some((entry) => entry.startsWith(".rossovia-write-probe-"))).toBe(false);
  });

  test("rejects an existing readable home when the current runtime cannot update its state", () => {
    if (process.platform === "win32") return;
    const root = mkdtempSync(join(tmpdir(), "rossovia-workbench-read-only-"));
    temporaryRoots.push(root);
    const home = join(root, "home");
    expect(workbench(home, "init").exitCode).toBe(0);
    const state = join(home, "state");
    chmodSync(state, 0o555);
    try {
      const result = workbench(home, "init");
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Rossovia home is readable but not writable by the current runtime");
      expect(result.stderr).toContain("Grant write access to the exact ROSSO_HOME");
      expect(result.stderr).not.toContain("initialized\": true");
    } finally {
      chmodSync(state, 0o755);
    }
  });

  test("reports the required capability when a new home cannot be created", () => {
    if (process.platform === "win32") return;
    const root = mkdtempSync(join(tmpdir(), "rossovia-workbench-denied-parent-"));
    temporaryRoots.push(root);
    const home = join(root, "home");
    chmodSync(root, 0o555);
    try {
      const result = workbench(home, "init");
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Rossovia home cannot be prepared by the current runtime");
      expect(result.stderr).toContain("Grant write access to the exact ROSSO_HOME");
      expect(existsSync(home)).toBe(false);
    } finally {
      chmodSync(root, 0o755);
    }
  });

  test("adds, lists, and rescans workspace roots without registering discoveries", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-workbench-roots-"));
    temporaryRoots.push(root);
    const first = join(root, "first-pool");
    const second = join(root, "second-pool");
    createRepository(join(first, "one"), "https://example.test/lidessen/one.git");
    createRepository(join(second, "two"), "https://example.test/lidessen/two.git");
    const home = join(root, "home");
    expect(workbench(home, "init", "--workspace-root", first).exitCode).toBe(0);
    expect(JSON.parse(workbench(home, "root", "list").stdout)).toEqual({
      version: "rosso.roots.v1",
      roots: [realpathSync(first)],
    });
    expect(JSON.parse(workbench(home, "root", "add", second).stdout)).toEqual({
      workspaceRoots: [realpathSync(first), realpathSync(second)],
      indexedWorkspaces: 2,
    });
    const rescanned = JSON.parse(workbench(home, "scan").stdout);
    expect(rescanned.indexedWorkspaces).toBe(2);
    expect(JSON.parse(readFileSync(join(home, "config", "projects.json"), "utf8")).projects).toEqual([]);
  });

  test("registers stable identity, attaches matching worktrees, and rejects rebinding", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-workbench-register-"));
    temporaryRoots.push(root);
    const repository = join(root, "checkout");
    createRepository(repository, "git@example.test:lidessen/registered.git");
    const home = join(root, "home");
    expect(workbench(home, "init").exitCode).toBe(0);
    const registered = workbench(home, "register", repository, "--id", "repository:registered", "--alias", "daily");
    expect(registered.exitCode).toBe(0);
    expect(JSON.parse(registered.stdout)).toEqual({
      project: {
        id: "repository:registered",
        repository: "ssh://example.test/lidessen/registered.git",
        aliases: ["checkout", "daily", "registered"],
      },
      workspace: { projectId: "repository:registered", path: realpathSync(repository) },
    });

    const attached = join(root, "attached-worktree");
    git(repository, "worktree", "add", "--detach", attached);
    expect(JSON.parse(workbench(home, "attach", "daily", attached).stdout)).toEqual({
      projectId: "repository:registered",
      path: realpathSync(attached),
    });

    const conflicting = join(root, "conflicting-checkout");
    createRepository(conflicting, "https://example.test/lidessen/different.git");
    const rejected = workbench(home, "register", conflicting, "--id", "repository:registered");
    expect(rejected.exitCode).toBe(2);
    expect(rejected.stderr).toContain("refusing to rebind stable project id");
  });

  test("resolves registered and discovered projects and fails closed on stale mappings", () => {
    const { home, registered, discovered } = fixture();
    const resolution = JSON.parse(workbench(home, "resolve", "survey").stdout);
    expect(resolution).toEqual(expect.objectContaining({
      version: "rosso.resolution.v1",
      query: "survey",
      registration: "registered",
      project: expect.objectContaining({ id: "repository:1304098496" }),
      workspace: expect.objectContaining({ path: realpathSync(registered), dirty: false, orientationFiles: ["README.md"] }),
    }));
    const listing = JSON.parse(workbench(home, "project", "list").stdout);
    expect(listing.complete).toBe(true);
    expect(listing.projects[0]).toEqual(expect.objectContaining({ status: "available" }));

    const discoveredResolution = JSON.parse(workbench(home, "resolve", "unregistered").stdout);
    expect(discoveredResolution).toEqual(expect.objectContaining({
      registration: "discovered",
      project: expect.objectContaining({ id: null }),
      workspace: expect.objectContaining({ path: realpathSync(discovered) }),
    }));

    renameSync(registered, `${registered}-moved`);
    const partial = workbench(home, "project", "list");
    expect(partial.exitCode).toBe(2);
    expect(JSON.parse(partial.stdout)).toEqual(expect.objectContaining({
      complete: false,
      projects: [expect.objectContaining({ status: "unverified" })],
    }));
    const stale = workbench(home, "resolve", "survey");
    expect(stale.exitCode).toBe(2);
    expect(stale.stderr).toContain("workspace path does not exist");
  });
});
