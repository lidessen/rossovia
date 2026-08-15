import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { STATE_FAILURE_EXIT_CODE } from "../src/cli-errors";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const launcher = join(repositoryRoot, "operations", "workbench", "rossovia");
const lockName = "registration.lock";
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function command(argv: string[], cwd = repositoryRoot): CommandResult {
  const result = spawnSync(argv[0]!, argv.slice(1), { cwd, encoding: "utf8" });
  return { exitCode: result.status ?? -1, stdout: result.stdout, stderr: result.stderr };
}

function cli(args: string[]): CommandResult {
  return command([launcher, ...args]);
}

async function concurrentCli(calls: string[][]): Promise<CommandResult[]> {
  const processes = calls.map((args) => Bun.spawn([launcher, ...args], {
    cwd: repositoryRoot,
    stdout: "pipe",
    stderr: "pipe",
  }));
  return Promise.all(processes.map(async (process) => ({
    exitCode: await process.exited,
    stdout: await new Response(process.stdout).text(),
    stderr: await new Response(process.stderr).text(),
  })));
}

function git(cwd: string, ...args: string[]): string {
  const result = command(["git", ...args], cwd);
  if (result.exitCode !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}

function createRepository(path: string, remote: string): void {
  mkdirSync(path, { recursive: true });
  git(path, "init");
  git(path, "config", "user.name", "Rossovia Register Test");
  git(path, "config", "user.email", "register@example.test");
  writeFileSync(join(path, "README.md"), "# Fixture\n");
  git(path, "add", "README.md");
  git(path, "commit", "-m", "initial");
  git(path, "remote", "add", "origin", remote);
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function fixture(): { root: string; home: string } {
  const root = mkdtempSync(join(tmpdir(), "rossovia-register-serialization-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  const initialized = cli(["--home", home, "init"]);
  expect(initialized.exitCode, initialized.stderr).toBe(0);
  return { root, home };
}

function lockPath(home: string): string {
  return join(home, "state", lockName);
}

function writeLockOwner(home: string, pid: number): void {
  writeFileSync(lockPath(home), `${JSON.stringify({
    version: "rosso.registration-lock.v1",
    pid,
    owner: randomUUID(),
    acquiredAt: new Date().toISOString(),
  }, null, 2)}\n`, "utf8");
}

interface ProjectRecord {
  id: string;
  repository: string;
  aliases: string[];
}

interface WorkspaceRecord {
  projectId: string;
  path: string;
}

function projects(home: string): { projects: ProjectRecord[] } {
  return JSON.parse(readFileSync(join(home, "config", "projects.json"), "utf8"));
}

function workspaces(home: string): { workspaces: WorkspaceRecord[] } {
  return JSON.parse(readFileSync(join(home, "state", "workspaces.json"), "utf8"));
}

function sortedProjectIds(home: string): string[] {
  return projects(home).projects.map((project) => project.id).sort();
}

function sortedWorkspaces(home: string): WorkspaceRecord[] {
  return [...workspaces(home).workspaces].sort((left, right) => left.projectId.localeCompare(right.projectId));
}

function assertStateFailure(result: CommandResult): void {
  expect(result.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
  expect(result.stderr).toMatch(/^rossovia: /);
  expect(result.stderr).not.toContain("for usage");
}

function transitionLeftovers(home: string): string[] {
  return [...readdirSync(join(home, "state")), ...readdirSync(join(home, "config"))]
    .filter((name) => name.includes(lockName) || name.endsWith(".tmp"));
}

describe("Rossovia register serialization through the ordinary launcher", () => {
  test("two truly concurrent registrations both succeed and retain the full pair", async () => {
    const { root, home } = fixture();
    const alpha = join(root, "projects", "alpha");
    const beta = join(root, "projects", "beta");
    createRepository(alpha, "https://example.com/p7-alpha.git");
    createRepository(beta, "https://example.com/p7-beta.git");

    const results = await concurrentCli([
      ["--home", home, "register", alpha, "--id", "p7-register-alpha", "--alias", "alpha"],
      ["--home", home, "register", beta, "--id", "p7-register-beta", "--alias", "beta"],
    ]);
    for (const result of results) expect(result.exitCode, result.stderr).toBe(0);

    const byId = new Map<string, CommandResult>();
    for (const result of results) {
      byId.set((JSON.parse(result.stdout) as { project: ProjectRecord }).project.id, result);
    }
    const alphaResult = byId.get("p7-register-alpha")!;
    const betaResult = byId.get("p7-register-beta")!;
    expect(JSON.parse(alphaResult.stdout)).toEqual({
      project: {
        id: "p7-register-alpha",
        repository: "https://example.com/p7-alpha.git",
        aliases: ["alpha", "p7-alpha"],
      },
      workspace: { projectId: "p7-register-alpha", path: realpathSync(alpha) },
    });
    expect(JSON.parse(betaResult.stdout)).toEqual({
      project: {
        id: "p7-register-beta",
        repository: "https://example.com/p7-beta.git",
        aliases: ["beta", "p7-beta"],
      },
      workspace: { projectId: "p7-register-beta", path: realpathSync(beta) },
    });

    expect(sortedProjectIds(home)).toEqual(["p7-register-alpha", "p7-register-beta"]);
    expect(sortedWorkspaces(home)).toEqual([
      { projectId: "p7-register-alpha", path: realpathSync(alpha) },
      { projectId: "p7-register-beta", path: realpathSync(beta) },
    ]);

    const listing = JSON.parse(cli(["--home", home, "project", "list"]).stdout) as {
      complete: boolean;
      projects: Array<{ project: ProjectRecord; status: string }>;
    };
    expect(listing.complete).toBe(true);
    expect(listing.projects.map((entry) => entry.project.id)).toEqual(["p7-register-alpha", "p7-register-beta"]);
    expect(listing.projects.every((entry) => entry.status === "available")).toBe(true);

    const alphaResolution = JSON.parse(cli(["--home", home, "resolve", "alpha"]).stdout);
    expect(alphaResolution).toEqual(expect.objectContaining({
      registration: "registered",
      project: expect.objectContaining({ id: "p7-register-alpha" }),
      workspace: expect.objectContaining({ path: realpathSync(alpha) }),
    }));
    const betaResolution = JSON.parse(cli(["--home", home, "resolve", "p7-register-beta"]).stdout);
    expect(betaResolution).toEqual(expect.objectContaining({
      registration: "registered",
      project: expect.objectContaining({ id: "p7-register-beta" }),
      workspace: expect.objectContaining({ path: realpathSync(beta) }),
    }));

    expect(transitionLeftovers(home)).toEqual([]);
  });

  test("recovers a lock whose recorded owner is verifiably dead", async () => {
    const { root, home } = fixture();
    const repository = join(root, "repository");
    createRepository(repository, "https://example.com/register-recovery.git");
    const holder = Bun.spawn([process.execPath, "-e", "process.exit(0)"]);
    writeLockOwner(home, holder.pid);
    await holder.exited;

    const registered = cli(["--home", home, "register", repository, "--id", "repository:recovered", "--alias", "recovered"]);
    expect(registered.exitCode, registered.stderr).toBe(0);
    expect(sortedProjectIds(home)).toEqual(["repository:recovered"]);
    expect(sortedWorkspaces(home)).toEqual([
      { projectId: "repository:recovered", path: realpathSync(repository) },
    ]);
    expect(transitionLeftovers(home)).toEqual([]);
  });

  test("fails closed on a malformed lock and leaves it for explicit reconciliation", () => {
    const { root, home } = fixture();
    const repository = join(root, "repository");
    createRepository(repository, "https://example.com/register-malformed.git");
    writeFileSync(lockPath(home), "not json", "utf8");

    const registered = cli(["--home", home, "register", repository, "--id", "repository:blocked", "--alias", "blocked"]);
    assertStateFailure(registered);
    expect(registered.stderr).toContain("registration lock is malformed");
    expect(registered.stderr).toContain("Remove or repair the lock file explicitly");
    expect(registered.stdout).toBe("");
    expect(sortedProjectIds(home)).toEqual([]);
    expect(workspaces(home).workspaces).toEqual([]);
    expect(readFileSync(lockPath(home), "utf8")).toBe("not json");
  });

  test("waits for a live owner, then reports contention without touching either state file", () => {
    const { root, home } = fixture();
    const repository = join(root, "repository");
    createRepository(repository, "https://example.com/register-contended.git");
    writeLockOwner(home, process.pid);
    const held = readFileSync(lockPath(home), "utf8");

    const registered = cli(["--home", home, "register", repository, "--id", "repository:contended", "--alias", "contended"]);
    assertStateFailure(registered);
    expect(registered.stderr).toContain("another registration is in progress");
    expect(registered.stderr).toContain(`owner pid ${process.pid}`);
    expect(registered.stdout).toBe("");
    expect(sortedProjectIds(home)).toEqual([]);
    expect(workspaces(home).workspaces).toEqual([]);
    expect(readFileSync(lockPath(home), "utf8")).toBe(held);
  });

  test("a denied write surface fails visibly, changes neither canonical file, and releases the lock", () => {
    if (process.platform === "win32") return;
    const { root, home } = fixture();
    const repository = join(root, "repository");
    createRepository(repository, "https://example.com/register-denied.git");
    const projectsBefore = readFileSync(join(home, "config", "projects.json"), "utf8");
    const workspacesBefore = readFileSync(join(home, "state", "workspaces.json"), "utf8");
    chmodSync(join(home, "config"), 0o555);
    try {
      const registered = cli(["--home", home, "register", repository, "--id", "repository:denied", "--alias", "denied"]);
      assertStateFailure(registered);
      expect(registered.stderr).toContain("cannot persist the Rossovia registration pair");
      expect(registered.stdout).toBe("");
      expect(readFileSync(join(home, "config", "projects.json"), "utf8")).toBe(projectsBefore);
      expect(readFileSync(join(home, "state", "workspaces.json"), "utf8")).toBe(workspacesBefore);
      expect(existsSync(lockPath(home))).toBe(false);
    } finally {
      chmodSync(join(home, "config"), 0o755);
    }

    const retried = cli(["--home", home, "register", repository, "--id", "repository:denied", "--alias", "denied"]);
    expect(retried.exitCode, retried.stderr).toBe(0);
    expect(sortedProjectIds(home)).toEqual(["repository:denied"]);
    expect(sortedWorkspaces(home)).toEqual([
      { projectId: "repository:denied", path: realpathSync(repository) },
    ]);
    expect(transitionLeftovers(home)).toEqual([]);
  });

  test("rejects an inconsistent projects/workspaces pair without writing either file", () => {
    const { root, home } = fixture();
    const repository = join(root, "repository");
    createRepository(repository, "https://example.com/register-inconsistent.git");
    const projectsBefore = readFileSync(join(home, "config", "projects.json"), "utf8");
    writeJson(join(home, "state", "workspaces.json"), {
      version: "rosso.workspaces.v1",
      workspaces: [{ projectId: "repository:orphan", path: repository }],
    });

    const registered = cli(["--home", home, "register", repository, "--id", "repository:consistent", "--alias", "consistent"]);
    assertStateFailure(registered);
    expect(registered.stderr).toContain("registration pair is inconsistent");
    expect(registered.stderr).toContain("references project repository:orphan");
    expect(registered.stdout).toBe("");
    expect(readFileSync(join(home, "config", "projects.json"), "utf8")).toBe(projectsBefore);
    expect(workspaces(home).workspaces).toEqual([{ projectId: "repository:orphan", path: repository }]);
    expect(transitionLeftovers(home)).toEqual([]);
  });

  test("sequential registration, stable-id re-registration, and rebind refusal keep one merged pair", () => {
    const { root, home } = fixture();
    const first = join(root, "first");
    const second = join(root, "second");
    createRepository(first, "https://example.com/lidessen/registered.git");
    createRepository(second, "https://example.com/lidessen/second.git");

    const registered = cli(["--home", home, "register", first, "--id", "repository:registered", "--alias", "daily"]);
    expect(registered.exitCode, registered.stderr).toBe(0);
    expect(JSON.parse(registered.stdout)).toEqual({
      project: {
        id: "repository:registered",
        repository: "https://example.com/lidessen/registered.git",
        aliases: ["daily", "first", "registered"],
      },
      workspace: { projectId: "repository:registered", path: realpathSync(first) },
    });

    const reregistered = cli(["--home", home, "register", first, "--id", "repository:registered", "--alias", "daily"]);
    expect(reregistered.exitCode, reregistered.stderr).toBe(0);
    expect(projects(home).projects).toEqual([{
      id: "repository:registered",
      repository: "https://example.com/lidessen/registered.git",
      aliases: ["daily", "first", "registered"],
    }]);
    expect(workspaces(home).workspaces).toEqual([
      { projectId: "repository:registered", path: realpathSync(first) },
    ]);

    const secondRegistered = cli(["--home", home, "register", second, "--id", "repository:second", "--alias", "bee"]);
    expect(secondRegistered.exitCode, secondRegistered.stderr).toBe(0);
    expect(sortedProjectIds(home)).toEqual(["repository:registered", "repository:second"]);
    const listing = JSON.parse(cli(["--home", home, "project", "list"]).stdout) as {
      complete: boolean;
      projects: Array<{ project: ProjectRecord }>;
    };
    expect(listing.complete).toBe(true);
    expect(listing.projects.map((entry) => entry.project.id)).toEqual(["repository:registered", "repository:second"]);

    const conflicting = join(root, "conflicting");
    createRepository(conflicting, "https://example.com/lidessen/different.git");
    const projectsBefore = readFileSync(join(home, "config", "projects.json"), "utf8");
    const workspacesBefore = readFileSync(join(home, "state", "workspaces.json"), "utf8");
    const rejected = cli(["--home", home, "register", conflicting, "--id", "repository:registered"]);
    assertStateFailure(rejected);
    expect(rejected.stderr).toContain("refusing to rebind stable project id");
    expect(readFileSync(join(home, "config", "projects.json"), "utf8")).toBe(projectsBefore);
    expect(readFileSync(join(home, "state", "workspaces.json"), "utf8")).toBe(workspacesBefore);
    expect(transitionLeftovers(home)).toEqual([]);
  });

  test("re-registering a stable id from a matching worktree updates the observed path", () => {
    const { root, home } = fixture();
    const primary = join(root, "primary");
    createRepository(primary, "https://example.com/lidessen/worktree.git");
    const registered = cli(["--home", home, "register", primary, "--id", "repository:worktree", "--alias", "primary"]);
    expect(registered.exitCode, registered.stderr).toBe(0);

    const attached = join(root, "attached");
    git(primary, "worktree", "add", "--detach", attached);
    const rebound = cli(["--home", home, "register", attached, "--id", "repository:worktree"]);
    expect(rebound.exitCode, rebound.stderr).toBe(0);
    expect(JSON.parse(rebound.stdout)).toEqual({
      project: {
        id: "repository:worktree",
        repository: "https://example.com/lidessen/worktree.git",
        aliases: ["attached", "primary", "worktree"],
      },
      workspace: { projectId: "repository:worktree", path: realpathSync(attached) },
    });

    const resolution = JSON.parse(cli(["--home", home, "resolve", "primary"]).stdout);
    expect(resolution).toEqual(expect.objectContaining({
      registration: "registered",
      workspace: expect.objectContaining({ path: realpathSync(attached) }),
    }));
  });

  test("register after legacy migration commits the merged pair", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-register-migration-"));
    temporaryRoots.push(root);
    const repository = join(root, "repository");
    createRepository(repository, "https://example.com/lidessen/migration.git");
    const source = join(root, "legacy-atthis");
    const target = join(root, "rossovia");
    writeJson(join(source, "manifest.json"), {
      version: "atthis.home.v1",
      namespace: "atthis",
      createdAt: "2026-07-18T00:00:00Z",
    });
    writeJson(join(source, "config", "projects.json"), {
      version: "atthis.projects.v1",
      projects: [{
        id: "repository:migration",
        repository: "https://example.com/lidessen/migration.git",
        aliases: ["migration"],
      }],
    });
    writeJson(join(source, "state", "workspaces.json"), {
      version: "atthis.workspaces.v1",
      workspaces: [{ projectId: "repository:migration", path: repository }],
    });
    writeJson(join(source, "state", "roots.json"), { version: "atthis.roots.v1", roots: [] });
    writeJson(join(source, "cache", "workspaces.json"), {
      version: "atthis.workspace-index.v1",
      generatedAt: "2026-07-18T00:00:00Z",
      entries: [],
    });

    const migrated = cli(["--home", target, "migrate", "--from-home", source]);
    expect(migrated.exitCode, migrated.stderr).toBe(0);

    const second = join(root, "second");
    createRepository(second, "https://example.com/lidessen/second.git");
    const registered = cli(["--home", target, "register", second, "--id", "repository:second", "--alias", "second"]);
    expect(registered.exitCode, registered.stderr).toBe(0);

    expect(sortedProjectIds(target)).toEqual(["repository:migration", "repository:second"]);
    expect(sortedWorkspaces(target)).toEqual([
      { projectId: "repository:migration", path: repository },
      { projectId: "repository:second", path: realpathSync(second) },
    ]);
    const listing = JSON.parse(cli(["--home", target, "project", "list"]).stdout) as { complete: boolean };
    expect(listing.complete).toBe(true);
  });
});
