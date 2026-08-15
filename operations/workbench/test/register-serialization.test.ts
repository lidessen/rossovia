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
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { STATE_FAILURE_EXIT_CODE } from "../src/cli-errors";
import type { HomeSources } from "../src/home";
import { nodeRegistrationIo, transitionRegistration, type RegistrationIo } from "../src/registration";

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

  test("concurrent register and attach share one serialized owner and retain the merged pair", async () => {
    const { root, home } = fixture();
    const alpha = join(root, "projects", "alpha");
    const beta = join(root, "projects", "beta");
    createRepository(alpha, "https://example.com/p7-alpha.git");
    createRepository(beta, "https://example.com/p7-beta.git");
    const registered = cli(["--home", home, "register", alpha, "--id", "p7-register-alpha", "--alias", "alpha"]);
    expect(registered.exitCode, registered.stderr).toBe(0);

    const attached = join(root, "projects", "alpha-attached");
    git(alpha, "worktree", "add", "--detach", attached);

    const results = await concurrentCli([
      ["--home", home, "register", beta, "--id", "p7-register-beta", "--alias", "beta"],
      ["--home", home, "attach", "alpha", attached],
    ]);
    for (const result of results) expect(result.exitCode, result.stderr).toBe(0);

    expect(sortedProjectIds(home)).toEqual(["p7-register-alpha", "p7-register-beta"]);
    expect(sortedWorkspaces(home)).toEqual([
      { projectId: "p7-register-alpha", path: realpathSync(attached) },
      { projectId: "p7-register-beta", path: realpathSync(beta) },
    ]);
    const listing = JSON.parse(cli(["--home", home, "project", "list"]).stdout) as {
      complete: boolean;
      projects: Array<{ project: ProjectRecord; status: string }>;
    };
    expect(listing.complete).toBe(true);
    expect(listing.projects.every((entry) => entry.status === "available")).toBe(true);
    expect(transitionLeftovers(home)).toEqual([]);
  });

  test("two recoverers of one stale lock never rename a replacement live lock", async () => {
    const { root, home } = fixture();
    const alpha = join(root, "projects", "alpha");
    const beta = join(root, "projects", "beta");
    createRepository(alpha, "https://example.com/p7-alpha.git");
    createRepository(beta, "https://example.com/p7-beta.git");
    const holder = Bun.spawn([process.execPath, "-e", "process.exit(0)"]);
    writeLockOwner(home, holder.pid);
    await holder.exited;

    // Hold both recoverers at the same observation point: each publishes a
    // ready marker after reading the stale lock and before touching the path,
    // and the go marker releases both at once.
    const barrier = join(root, "barrier");
    mkdirSync(barrier, { recursive: true });
    const processes = [
      ["--home", home, "register", alpha, "--id", "p7-recovery-alpha", "--alias", "alpha"],
      ["--home", home, "register", beta, "--id", "p7-recovery-beta", "--alias", "beta"],
    ].map((args) => Bun.spawn([launcher, ...args], {
      cwd: repositoryRoot,
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, ROSSO_REGISTRATION_TEST_HOOK_DIR: barrier },
    }));
    const deadline = Date.now() + 5000;
    while (readdirSync(barrier).filter((name) => name.startsWith("ready-stale-recovery-")).length < 2) {
      if (Date.now() > deadline) break;
      await Bun.sleep(25);
    }
    expect(readdirSync(barrier).filter((name) => name.startsWith("ready-stale-recovery-")).length).toBe(2);
    writeFileSync(join(barrier, "go-stale-recovery"), "", "utf8");
    const results = await Promise.all(processes.map(async (process) => ({
      exitCode: await process.exited,
      stdout: await new Response(process.stdout).text(),
      stderr: await new Response(process.stderr).text(),
    })));
    for (const result of results) expect(result.exitCode, result.stderr).toBe(0);

    expect(sortedProjectIds(home)).toEqual(["p7-recovery-alpha", "p7-recovery-beta"]);
    expect(sortedWorkspaces(home)).toEqual([
      { projectId: "p7-recovery-alpha", path: realpathSync(alpha) },
      { projectId: "p7-recovery-beta", path: realpathSync(beta) },
    ]);
    expect(transitionLeftovers(home)).toEqual([]);
  });

  test("concurrent register and migrate share one serialized owner and retain the merged pair", async () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-register-migration-concurrent-"));
    temporaryRoots.push(root);
    const migrated = join(root, "migrated");
    const second = join(root, "second");
    createRepository(migrated, "https://example.com/lidessen/migration.git");
    createRepository(second, "https://example.com/lidessen/second.git");
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
      workspaces: [{ projectId: "repository:migration", path: migrated }],
    });
    writeJson(join(source, "state", "roots.json"), { version: "atthis.roots.v1", roots: [] });
    writeJson(join(source, "cache", "workspaces.json"), {
      version: "atthis.workspace-index.v1",
      generatedAt: "2026-07-18T00:00:00Z",
      entries: [],
    });

    // The barrier pauses the migration after it committed the target home but
    // while it still holds the registration lock, then releases it only after
    // the register transition is already contending for the same lock.
    const barrier = join(root, "barrier");
    mkdirSync(barrier, { recursive: true });
    const migration = Bun.spawn([launcher, "--home", target, "migrate", "--from-home", source], {
      cwd: repositoryRoot,
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, ROSSO_MIGRATION_TEST_HOOK_DIR: barrier },
    });
    const deadline = Date.now() + 5000;
    while (!existsSync(join(barrier, "ready-verify"))) {
      if (Date.now() > deadline) break;
      await Bun.sleep(25);
    }
    expect(existsSync(join(barrier, "ready-verify"))).toBe(true);

    const registration = Bun.spawn(
      [launcher, "--home", target, "register", second, "--id", "repository:second", "--alias", "second"],
      { cwd: repositoryRoot, stdout: "pipe", stderr: "pipe" },
    );
    writeFileSync(join(barrier, "go-verify"), "", "utf8");
    // A tuple-shaped collection proves the exact two-result cardinality for
    // Promise.all, so both results are defined for the assertions below even
    // under noUncheckedIndexedAccess.
    const collect = async (process: typeof migration): Promise<CommandResult> => ({
      exitCode: await process.exited,
      stdout: await new Response(process.stdout).text(),
      stderr: await new Response(process.stderr).text(),
    });
    const [migratedResult, registeredResult] = await Promise.all([
      collect(migration),
      collect(registration),
    ] as const);
    expect(migratedResult.exitCode, migratedResult.stderr).toBe(0);
    expect(registeredResult.exitCode, registeredResult.stderr).toBe(0);

    expect(sortedProjectIds(target)).toEqual(["repository:migration", "repository:second"]);
    expect(sortedWorkspaces(target)).toEqual([
      { projectId: "repository:migration", path: migrated },
      { projectId: "repository:second", path: realpathSync(second) },
    ]);
    expect(transitionLeftovers(target)).toEqual([]);
    const listing = JSON.parse(cli(["--home", target, "project", "list"]).stdout) as { complete: boolean };
    expect(listing.complete).toBe(true);
  });
});

class RecordingIo implements RegistrationIo {
  readonly operations: string[] = [];
  readonly corruptReadPaths = new Set<string>();
  readonly failWrites: Array<{ when: (path: string) => boolean; code: string }> = [];

  mkdir(path: string): void {
    this.operations.push(`mkdir:${path}`);
    mkdirSync(path, { recursive: true });
  }

  writeFile(path: string, data: string): void {
    for (const failure of this.failWrites) {
      if (failure.when(path)) {
        const error = new Error("injected write failure") as Error & { code?: unknown };
        error.code = failure.code;
        throw error;
      }
    }
    this.operations.push(`write:${path}`);
    writeFileSync(path, data, "utf8");
  }

  createFileExclusive(path: string, data: string): void {
    this.operations.push(`create-exclusive:${path}`);
    writeFileSync(path, data, { encoding: "utf8", flag: "wx" });
  }

  readFile(path: string): string {
    this.operations.push(`read:${path}`);
    if (this.corruptReadPaths.has(path)) return "{ corrupted";
    return readFileSync(path, "utf8");
  }

  rename(source: string, destination: string): void {
    this.operations.push(`rename:${source}->${destination}`);
    renameSync(source, destination);
  }

  remove(path: string): void {
    this.operations.push(`remove:${path}`);
    rmSync(path, { force: true });
  }

  fsyncFile(path: string): void {
    this.operations.push(`fsync-file:${path}`);
  }

  fsyncDirectory(path: string): void {
    this.operations.push(`fsync-dir:${path}`);
  }
}

function inProcessRegister(
  home: string,
  id: string,
  repository: string,
  io: RegistrationIo = nodeRegistrationIo,
): { project: ProjectRecord; workspace: WorkspaceRecord } {
  return transitionRegistration(home, (current: HomeSources) => {
    let project = current.projects.projects.find((entry) => entry.id === id);
    if (!project) {
      project = { id, repository, aliases: [id.includes(":") ? id.slice(id.indexOf(":") + 1) : id] };
      current.projects.projects.push(project);
    }
    let workspace = current.workspaces.workspaces.find((entry) => entry.projectId === id);
    if (!workspace) {
      workspace = { projectId: id, path: join(home, "workspaces", id) };
      current.workspaces.workspaces.push(workspace);
    }
    return { project, workspace };
  }, io);
}

describe("registration transition durability and rollback seam", () => {
  function transitionError(callback: () => void): Error {
    let thrown: unknown;
    try {
      callback();
    } catch (error: unknown) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    return thrown as Error;
  }

  test("stages and fsyncs both files before rename and syncs parent directories after", () => {
    const { home } = fixture();
    const resolvedHome = realpathSync(home);
    const io = new RecordingIo();
    const result = inProcessRegister(home, "repository:order", "https://example.com/order.git", io);
    expect(result.project.id).toBe("repository:order");

    const projectsPath = join(resolvedHome, "config", "projects.json");
    const workspacesPath = join(resolvedHome, "state", "workspaces.json");
    const operations = io.operations;
    const operationIndex = (operation: string): number => {
      const index = operations.indexOf(operation);
      expect(index).toBeGreaterThanOrEqual(0);
      return index;
    };
    const stageOf = (path: string): string => {
      const operation = operations.find((entry) =>
        entry.startsWith("write:") && entry.includes(`${path}.`) && entry.endsWith(".tmp"));
      expect(operation).toBeDefined();
      return operation!.slice("write:".length);
    };
    const projectsStage = stageOf(projectsPath);
    const workspacesStage = stageOf(workspacesPath);

    expect(operationIndex(`write:${projectsStage}`)).toBeLessThan(operationIndex(`fsync-file:${projectsStage}`));
    expect(operationIndex(`write:${workspacesStage}`)).toBeLessThan(operationIndex(`fsync-file:${workspacesStage}`));
    expect(operationIndex(`fsync-file:${projectsStage}`)).toBeLessThan(operationIndex(`rename:${projectsStage}->${projectsPath}`));
    expect(operationIndex(`fsync-file:${workspacesStage}`)).toBeLessThan(operationIndex(`rename:${workspacesStage}->${workspacesPath}`));
    expect(operationIndex(`rename:${projectsStage}->${projectsPath}`)).toBeLessThan(operationIndex(`rename:${workspacesStage}->${workspacesPath}`));
    expect(operationIndex(`rename:${workspacesStage}->${workspacesPath}`)).toBeLessThan(operationIndex(`fsync-dir:${dirname(projectsPath)}`));
    expect(operationIndex(`rename:${workspacesStage}->${workspacesPath}`)).toBeLessThan(operationIndex(`fsync-dir:${dirname(workspacesPath)}`));
    expect(operationIndex(`fsync-dir:${dirname(workspacesPath)}`)).toBeLessThan(operationIndex(`read:${projectsPath}`));
    expect(operationIndex(`read:${projectsPath}`)).toBeLessThan(operationIndex(`read:${workspacesPath}`));

    expect(projects(home).projects.map((entry) => entry.id)).toEqual(["repository:order"]);
    expect(existsSync(join(resolvedHome, "state", "registration.lock"))).toBe(false);
    expect(transitionLeftovers(home)).toEqual([]);
  });

  test("post-rename verification failure restores workspaces before projects and leaves the previous pair", () => {
    const { home } = fixture();
    const resolvedHome = realpathSync(home);
    const seeded = inProcessRegister(home, "repository:seeded", "https://example.com/seeded.git");
    expect(seeded.project.id).toBe("repository:seeded");
    const projectsPath = join(resolvedHome, "config", "projects.json");
    const workspacesPath = join(resolvedHome, "state", "workspaces.json");
    const projectsBefore = readFileSync(projectsPath, "utf8");
    const workspacesBefore = readFileSync(workspacesPath, "utf8");

    const io = new RecordingIo();
    io.corruptReadPaths.add(workspacesPath);
    const failure = transitionError(() => {
      inProcessRegister(home, "repository:added", "https://example.com/added.git", io);
    });
    expect(failure.message).toContain("Rossovia registration could not verify the committed pair");
    expect(failure.message).toContain("on-disk content differs from the validated pair");
    expect(failure.message).toContain("; the previous pair was restored");
    expect(failure.message).toContain("No registration success was claimed");

    expect(readFileSync(projectsPath, "utf8")).toBe(projectsBefore);
    expect(readFileSync(workspacesPath, "utf8")).toBe(workspacesBefore);
    expect(existsSync(join(resolvedHome, "state", "registration.lock"))).toBe(false);
    expect(transitionLeftovers(home)).toEqual([]);

    // The second rename targeting each canonical path is the restoration:
    // workspaces must be restored before projects.
    const restoreRename = (path: string): number => {
      const renames = io.operations
        .map((operation, index) => ({ operation, index }))
        .filter(({ operation }) => operation.startsWith("rename:") && operation.endsWith(`->${path}`));
      expect(renames.length).toBe(2);
      return renames[1]!.index;
    };
    expect(restoreRename(workspacesPath)).toBeLessThan(restoreRename(projectsPath));
  });

  test("a failed projects restoration leaves a pair-consistent surface and reports the failure", () => {
    const { home } = fixture();
    const resolvedHome = realpathSync(home);
    const seeded = inProcessRegister(home, "repository:seeded", "https://example.com/seeded.git");
    expect(seeded.project.id).toBe("repository:seeded");
    const projectsPath = join(resolvedHome, "config", "projects.json");
    const workspacesPath = join(resolvedHome, "state", "workspaces.json");

    const io = new RecordingIo();
    io.corruptReadPaths.add(workspacesPath);
    let projectsStageWrites = 0;
    io.failWrites.push({
      when: (path) => path.startsWith(`${projectsPath}.`) && path.endsWith(".tmp") && ++projectsStageWrites === 2,
      code: "EIO",
    });
    const failure = transitionError(() => {
      inProcessRegister(home, "repository:added", "https://example.com/added.git", io);
    });
    expect(failure.message).toContain("Rossovia registration could not verify the committed pair");
    expect(failure.message).toContain("restoring the previous projects state also failed");
    expect(failure.message).toContain("injected write failure");
    expect(failure.message).toContain("No registration success was claimed");

    // On disk: the committed (new) projects plus the restored (previous)
    // workspaces. The pair invariant still holds because every previous
    // workspace references a project present in the committed projects.
    const onDiskProjects = projects(home).projects.map((entry) => entry.id);
    expect(onDiskProjects).toEqual(["repository:seeded", "repository:added"]);
    const onDiskWorkspaceIds = workspaces(home).workspaces.map((entry) => entry.projectId);
    expect(onDiskWorkspaceIds).toEqual(["repository:seeded"]);
    for (const projectId of onDiskWorkspaceIds) expect(onDiskProjects).toContain(projectId);

    expect(existsSync(join(resolvedHome, "state", "registration.lock"))).toBe(false);
    expect(transitionLeftovers(home)).toEqual([]);
  });
});
