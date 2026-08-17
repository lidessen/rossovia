import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  chmodSync,
  existsSync,
  linkSync,
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
import {
  exclusivePublish,
  initializeHome,
  type ExclusivePublishOps,
  type HomeIo,
  type HomeSources,
} from "../src/home";
import { migrateLegacyHome } from "../src/migration";
import { nodeRegistrationIo, transitionRegistration, type RegistrationIo } from "../src/registration";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const launcher = join(repositoryRoot, "operations", "workbench", "rossovia");
const initExclusiveCreateHolder = join(import.meta.dir, "init-exclusive-create-holder.ts");
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

/** A legacy Atthis home fixture plus a bulk of namespace files that keeps a
 * migration busy long enough for a concurrent launcher to be started while
 * the migration still holds the registration lock. */
function writeLegacySource(source: string, workspacePath: string): void {
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
    workspaces: [{ projectId: "repository:migration", path: workspacePath }],
  });
  writeJson(join(source, "state", "roots.json"), { version: "atthis.roots.v1", roots: [] });
  writeJson(join(source, "cache", "workspaces.json"), {
    version: "atthis.workspace-index.v1",
    generatedAt: "2026-07-18T00:00:00Z",
    entries: [],
  });
  for (let index = 0; index < 400; index += 1) {
    writeJson(join(source, "cache", "bulk", `entry-${index}.json`), {
      version: "atthis.cache-entry.v1",
      namespace: "atthis",
      index,
    });
  }
}

/** Wait until the migration has durably published the complete canonical
 * pair to the migrated namespace. The pair is published through the shared
 * durable commit under the registration owner before the manifest is
 * initialized, so observing the manifest plus the committed workspaces
 * proves the publication and initialization passes are finished: the
 * canonical pair reads are then stable even while the migration still holds
 * the registration lock during verification. */
async function waitForMigratedCanonicalPair(target: string): Promise<void> {
  const parsedVersion = (path: string): unknown => {
    try {
      return (JSON.parse(readFileSync(path, "utf8")) as { version?: unknown }).version;
    } catch {
      return undefined;
    }
  };
  const deadline = Date.now() + 5000;
  while (Date.now() <= deadline) {
    if (
      parsedVersion(join(target, "manifest.json")) === "rosso.home.v1"
      && parsedVersion(join(target, "state", "workspaces.json")) === "rosso.workspaces.v1"
    ) {
      return;
    }
    await Bun.sleep(10);
  }
  expect(parsedVersion(join(target, "manifest.json"))).toBe("rosso.home.v1");
  expect(parsedVersion(join(target, "state", "workspaces.json"))).toBe("rosso.workspaces.v1");
}

async function collectCommandResult(process: {
  exited: Promise<number>;
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
}): Promise<CommandResult> {
  return {
    exitCode: await process.exited,
    stdout: await new Response(process.stdout).text(),
    stderr: await new Response(process.stderr).text(),
  };
}

async function waitForPath(path: string): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() <= deadline) {
    if (existsSync(path)) return;
    await Bun.sleep(10);
  }
  expect(existsSync(path)).toBe(true);
}

function lockPath(home: string): string {
  return join(home, "state", lockName);
}

function recoveryPath(home: string): string {
  return `${lockPath(home)}.recovery`;
}

function lockOwnerBytes(pid: number): string {
  return `${JSON.stringify({
    version: "rosso.registration-lock.v1",
    pid,
    owner: randomUUID(),
    acquiredAt: new Date().toISOString(),
  }, null, 2)}\n`;
}

function writeLockOwner(home: string, pid: number): string {
  const serialized = lockOwnerBytes(pid);
  writeFileSync(lockPath(home), serialized, "utf8");
  return serialized;
}

function writeRecoveryOwner(home: string, pid: number): string {
  const serialized = lockOwnerBytes(pid);
  writeFileSync(recoveryPath(home), serialized, "utf8");
  return serialized;
}

/** A pid that is guaranteed to be verifiably dead before the caller proceeds. */
function deadPid(): number {
  return Bun.spawnSync([process.execPath, "-e", "process.exit(0)"]).pid;
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

  test("two truly concurrent recoverers of one stale lock both succeed and retain the merged pair", async () => {
    const { root, home } = fixture();
    const alpha = join(root, "projects", "alpha");
    const beta = join(root, "projects", "beta");
    createRepository(alpha, "https://example.com/p7-alpha.git");
    createRepository(beta, "https://example.com/p7-beta.git");
    writeLockOwner(home, deadPid());

    const results = await concurrentCli([
      ["--home", home, "register", alpha, "--id", "p7-recovery-alpha", "--alias", "alpha"],
      ["--home", home, "register", beta, "--id", "p7-recovery-beta", "--alias", "beta"],
    ]);
    for (const result of results) expect(result.exitCode, result.stderr).toBe(0);

    expect(sortedProjectIds(home)).toEqual(["p7-recovery-alpha", "p7-recovery-beta"]);
    expect(sortedWorkspaces(home)).toEqual([
      { projectId: "p7-recovery-alpha", path: realpathSync(alpha) },
      { projectId: "p7-recovery-beta", path: realpathSync(beta) },
    ]);
    expect(transitionLeftovers(home)).toEqual([]);
  });

  test("recoverers never rename or remove a replacement live lock", async () => {
    const { root, home } = fixture();
    const alpha = join(root, "projects", "alpha");
    const beta = join(root, "projects", "beta");
    createRepository(alpha, "https://example.com/p7-alpha.git");
    createRepository(beta, "https://example.com/p7-beta.git");
    writeLockOwner(home, deadPid());

    // The test process holds the recovery primitive as a live owner, so both
    // recoverers are parked at the primitive right after observing the stale
    // lock and before either can touch the lock path. This is a real process
    // boundary: no production code reads a test barrier.
    writeRecoveryOwner(home, process.pid);
    const alphaProcess = Bun.spawn(
      [launcher, "--home", home, "register", alpha, "--id", "p7-replacement-alpha", "--alias", "alpha"],
      { cwd: repositoryRoot, stdout: "pipe", stderr: "pipe" },
    );
    const betaProcess = Bun.spawn(
      [launcher, "--home", home, "register", beta, "--id", "p7-replacement-beta", "--alias", "beta"],
      { cwd: repositoryRoot, stdout: "pipe", stderr: "pipe" },
    );
    await Bun.sleep(300);
    // While both recoverers hold the stale observation, replace the lock with
    // a live owner and release the primitive barrier.
    const replacement = writeLockOwner(home, process.pid);
    rmSync(recoveryPath(home), { force: true });

    const collect = async (process: typeof alphaProcess): Promise<CommandResult> => ({
      exitCode: await process.exited,
      stdout: await new Response(process.stdout).text(),
      stderr: await new Response(process.stderr).text(),
    });
    // A tuple-shaped collection proves the exact two-result cardinality for
    // Promise.all, so both results are defined without index assertions.
    const [alphaResult, betaResult] = await Promise.all([
      collect(alphaProcess),
      collect(betaProcess),
    ] as const);
    for (const result of [alphaResult, betaResult]) {
      assertStateFailure(result);
      expect(result.stderr).toMatch(/another (registration|recoverer) is in progress/);
      expect(result.stderr).toContain(`owner pid ${process.pid}`);
    }

    // The replacement live lock was never renamed, tombstoned, or removed,
    // and no registration was written over it.
    expect(readFileSync(lockPath(home), "utf8")).toBe(replacement);
    expect(sortedProjectIds(home)).toEqual([]);
    expect(workspaces(home).workspaces).toEqual([]);
    const leftovers = transitionLeftovers(home).filter((name) => name !== lockName);
    expect(leftovers).toEqual([]);
  });

  test("a crash-retained recovery primitive fails closed with reconcile-required and is never auto-removed", () => {
    const { root, home } = fixture();
    const repository = join(root, "repository");
    createRepository(repository, "https://example.com/register-retained.git");
    writeLockOwner(home, deadPid());
    writeRecoveryOwner(home, deadPid());
    const primitiveBefore = readFileSync(recoveryPath(home), "utf8");
    const lockBefore = readFileSync(lockPath(home), "utf8");

    const registered = cli(["--home", home, "register", repository, "--id", "repository:retained", "--alias", "retained"]);
    assertStateFailure(registered);
    expect(registered.stderr).toContain("registration recovery primitive");
    expect(registered.stderr).toContain("is crash-retained");
    expect(registered.stderr).toContain("Reconcile it explicitly");
    expect(registered.stdout).toBe("");
    // Neither the retained primitive nor the stale lock was touched.
    expect(readFileSync(recoveryPath(home), "utf8")).toBe(primitiveBefore);
    expect(readFileSync(lockPath(home), "utf8")).toBe(lockBefore);
    expect(sortedProjectIds(home)).toEqual([]);

    // Explicit reconciliation unblocks the stale-lock recovery on the next
    // invocation, and that registration then succeeds and releases cleanly.
    rmSync(recoveryPath(home), { force: true });
    const recovered = cli(["--home", home, "register", repository, "--id", "repository:retained", "--alias", "retained"]);
    expect(recovered.exitCode, recovered.stderr).toBe(0);
    expect(sortedProjectIds(home)).toEqual(["repository:retained"]);
    expect(sortedWorkspaces(home)).toEqual([
      { projectId: "repository:retained", path: realpathSync(repository) },
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
    writeLegacySource(source, migrated);

    // Start the migration first and observe it through real process
    // boundaries only: once the migration has durably rewritten the canonical
    // pair (after which the target pair reads are stable) it may still hold
    // the registration lock, so the register transition launched now contends
    // for the same owner instead of reading a partial home.
    const migration = Bun.spawn([launcher, "--home", target, "migrate", "--from-home", source], {
      cwd: repositoryRoot,
      stdout: "pipe",
      stderr: "pipe",
    });
    await waitForMigratedCanonicalPair(target);

    const registration = Bun.spawn(
      [launcher, "--home", target, "register", second, "--id", "repository:second", "--alias", "second"],
      { cwd: repositoryRoot, stdout: "pipe", stderr: "pipe" },
    );
    const collect = async (process: typeof migration): Promise<CommandResult> => ({
      exitCode: await process.exited,
      stdout: await new Response(process.stdout).text(),
      stderr: await new Response(process.stderr).text(),
    });
    // A tuple-shaped collection proves the exact two-result cardinality for
    // Promise.all, so both results are defined for the assertions below even
    // under noUncheckedIndexedAccess.
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

  test("init held at an exclusive creation cannot overwrite the migration winner's canonical pair", async () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-init-migration-race-"));
    temporaryRoots.push(root);
    const migrated = join(root, "migrated");
    createRepository(migrated, "https://example.com/lidessen/migration.git");
    const source = join(root, "legacy-atthis");
    const target = join(root, "rossovia");
    writeLegacySource(source, migrated);
    // The target carries a matching migration marker, so the migration takes
    // its serialized retry path and clears the partial target that init
    // published before the race, instead of refusing the existing home.
    mkdirSync(target, { recursive: true });
    writeJson(join(target, ".rossovia-namespace-migration.json"), {
      version: "rosso.namespace-migration.v1",
      sourceHome: realpathSync(source),
      targetHome: realpathSync(target),
    });

    const barrier = join(root, "init-observed");
    const release = join(root, "init-release");
    // The holder compares the seam path literally, so it must match the
    // realpath form initializeHome resolves through expandPath.
    const projectsPath = join(realpathSync(target), "config", "projects.json");
    const holder = Bun.spawn(
      [process.execPath, initExclusiveCreateHolder, target, projectsPath, barrier, release],
      { cwd: repositoryRoot, stdout: "pipe", stderr: "pipe" },
    );
    let heldResult: CommandResult | undefined;
    try {
      // Deterministic barrier: the holder writes the barrier only after the
      // exclusive creation of the canonical projects file has been reached
      // and the path has been observed absent — before the creation attempt.
      // An existsSync-then-save initialization would act on this stale
      // observation and overwrite the winner published below; the exclusive
      // creation cannot.
      await waitForPath(barrier);
      expect(readFileSync(barrier, "utf8")).toBe("absent");
      const migration = cli(["--home", target, "migrate", "--from-home", source]);
      expect(migration.exitCode, migration.stderr).toBe(0);
      writeFileSync(release, "released", "utf8");
      heldResult = await collectCommandResult(holder);
      expect(heldResult.exitCode, heldResult.stderr).toBe(0);
    } finally {
      // Never leave the holder parked behind the barrier on a failed
      // assertion: release it and drain its output before rethrowing.
      if (heldResult === undefined) {
        writeFileSync(release, "released", "utf8");
        await collectCommandResult(holder);
      }
    }

    // The migration winner's canonical pair survived the stale-observation
    // exclusive creation: the empty init pair was never written over it.
    expect(sortedProjectIds(target)).toEqual(["repository:migration"]);
    expect(sortedWorkspaces(target)).toEqual([
      { projectId: "repository:migration", path: migrated },
    ]);
    expect((JSON.parse(readFileSync(join(target, "manifest.json"), "utf8")) as { version: string }).version)
      .toBe("rosso.home.v1");
    const listing = JSON.parse(cli(["--home", target, "project", "list"]).stdout) as { complete: boolean };
    expect(listing.complete).toBe(true);
    expect(transitionLeftovers(target)).toEqual([]);
  });
});

class RecordingIo implements RegistrationIo {
  readonly operations: string[] = [];
  readonly corruptReadPaths = new Set<string>();
  readonly failWrites: Array<{ when: (path: string) => boolean; code: string }> = [];
  readonly readOverrides: Array<{ when: (path: string, call: number) => boolean; content: string }> = [];
  private readonly readCounts = new Map<string, number>();

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
    const call = this.readCounts.get(path) ?? 0;
    this.readCounts.set(path, call + 1);
    if (this.corruptReadPaths.has(path)) return "{ corrupted";
    for (const override of this.readOverrides) {
      if (override.when(path, call)) return override.content;
    }
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

  test("publishes the durably synced projects entry before staging the workspace entry", () => {
    const { home } = fixture();
    const resolvedHome = realpathSync(home);
    const io = new RecordingIo();
    const result = inProcessRegister(home, "repository:order", "https://example.com/order.git", io);
    expect(result.project.id).toBe("repository:order");

    const projectsPath = join(resolvedHome, "config", "projects.json");
    const workspacesPath = join(resolvedHome, "state", "workspaces.json");
    const configDirectory = dirname(projectsPath);
    const stateDirectory = dirname(workspacesPath);
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

    // The exact observable durable subset order: the projects stage is
    // written, fsynced, renamed, and the config directory fsynced before the
    // workspaces stage is even written; then the workspaces stage is fsynced,
    // renamed, and the state directory fsynced before the committed bytes are
    // verified. (The old both-renames-before-directory-sync order would fail
    // the fsync-dir:config before rename:workspaces assertion below.)
    expect(operationIndex(`write:${projectsStage}`)).toBeLessThan(operationIndex(`fsync-file:${projectsStage}`));
    expect(operationIndex(`fsync-file:${projectsStage}`)).toBeLessThan(operationIndex(`rename:${projectsStage}->${projectsPath}`));
    expect(operationIndex(`rename:${projectsStage}->${projectsPath}`)).toBeLessThan(operationIndex(`fsync-dir:${configDirectory}`));
    expect(operationIndex(`fsync-dir:${configDirectory}`)).toBeLessThan(operationIndex(`write:${workspacesStage}`));
    expect(operationIndex(`write:${workspacesStage}`)).toBeLessThan(operationIndex(`fsync-file:${workspacesStage}`));
    expect(operationIndex(`fsync-file:${workspacesStage}`)).toBeLessThan(operationIndex(`rename:${workspacesStage}->${workspacesPath}`));
    expect(operationIndex(`rename:${workspacesStage}->${workspacesPath}`)).toBeLessThan(operationIndex(`fsync-dir:${stateDirectory}`));
    expect(operationIndex(`fsync-dir:${stateDirectory}`)).toBeLessThan(operationIndex(`read:${projectsPath}`));
    expect(operationIndex(`read:${projectsPath}`)).toBeLessThan(operationIndex(`read:${workspacesPath}`));

    expect(projects(home).projects.map((entry) => entry.id)).toEqual(["repository:order"]);
    expect(existsSync(join(resolvedHome, "state", "registration.lock"))).toBe(false);
    expect(transitionLeftovers(home)).toEqual([]);
  });

  test("migration publishes its validated canonical pair through the shared durable commit under the held owner", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-migration-seam-"));
    temporaryRoots.push(root);
    const migrated = join(root, "migrated");
    createRepository(migrated, "https://example.com/lidessen/migration.git");
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

    const io = new RecordingIo();
    const result = migrateLegacyHome(target, source, io);
    expect(result.migrated).toBe(true);
    expect(result.verifiedProjectId).toBe("repository:migration");

    const resolvedTarget = realpathSync(target);
    const projectsPath = join(resolvedTarget, "config", "projects.json");
    const workspacesPath = join(resolvedTarget, "state", "workspaces.json");
    const configDirectory = dirname(projectsPath);
    const stateDirectory = dirname(workspacesPath);
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

    // The registration owner was acquired through the seam, and the exact
    // shared durable subset order admits the migrated pair: projects staged,
    // fsynced, renamed, and the config directory fsynced before the
    // workspaces stage is even written; then the workspaces staged, fsynced,
    // renamed, and the state directory fsynced before the committed bytes
    // are verified. The lock is released through the seam afterwards.
    expect(operations.some((operation) =>
      operation.startsWith("create-exclusive:") && operation.endsWith(join("state", lockName)))).toBe(true);
    const lockAcquisition = operations.findIndex((operation) =>
      operation.startsWith("create-exclusive:") && operation.endsWith(join("state", lockName)));
    expect(lockAcquisition).toBeGreaterThanOrEqual(0);
    expect(lockAcquisition).toBeLessThan(operationIndex(`write:${projectsStage}`));
    expect(operationIndex(`write:${projectsStage}`)).toBeLessThan(operationIndex(`fsync-file:${projectsStage}`));
    expect(operationIndex(`fsync-file:${projectsStage}`)).toBeLessThan(operationIndex(`rename:${projectsStage}->${projectsPath}`));
    expect(operationIndex(`rename:${projectsStage}->${projectsPath}`)).toBeLessThan(operationIndex(`fsync-dir:${configDirectory}`));
    expect(operationIndex(`fsync-dir:${configDirectory}`)).toBeLessThan(operationIndex(`write:${workspacesStage}`));
    expect(operationIndex(`write:${workspacesStage}`)).toBeLessThan(operationIndex(`fsync-file:${workspacesStage}`));
    expect(operationIndex(`fsync-file:${workspacesStage}`)).toBeLessThan(operationIndex(`rename:${workspacesStage}->${workspacesPath}`));
    expect(operationIndex(`rename:${workspacesStage}->${workspacesPath}`)).toBeLessThan(operationIndex(`fsync-dir:${stateDirectory}`));
    expect(operationIndex(`fsync-dir:${stateDirectory}`)).toBeLessThan(operationIndex(`read:${projectsPath}`));
    expect(operationIndex(`read:${projectsPath}`)).toBeLessThan(operationIndex(`read:${workspacesPath}`));
    expect(operations.some((operation) =>
      operation.startsWith("remove:") && operation.endsWith(join("state", lockName)))).toBe(true);

    expect(sortedProjectIds(target)).toEqual(["repository:migration"]);
    expect(sortedWorkspaces(target)).toEqual([
      { projectId: "repository:migration", path: migrated },
    ]);
    expect(existsSync(join(resolvedTarget, "state", lockName))).toBe(false);
    expect(transitionLeftovers(target)).toEqual([]);
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

  test("a replacement live owner observed between the stale read and recovery is never renamed or removed", () => {
    const { home } = fixture();
    const resolvedHome = realpathSync(home);
    const lock = join(resolvedHome, "state", "registration.lock");
    writeLockOwner(home, deadPid());
    const replacement = lockOwnerBytes(process.pid);

    // The seam injects a replacement live owner at the exact read-then-act
    // window: after the transition has observed the dead-owner bytes but
    // before the serialized recovery re-inspects the lock path.
    const io = new RecordingIo();
    let injected = false;
    io.readOverrides.push({
      when: (path, call) => {
        if (path !== lock || call < 1) return false;
        if (!injected) {
          writeFileSync(lock, replacement, "utf8");
          injected = true;
        }
        return true;
      },
      content: replacement,
    });
    const failure = transitionError(() => {
      inProcessRegister(home, "repository:contended-replacement", "https://example.com/contended.git", io);
    });
    expect(failure.message).toContain("another registration is in progress");
    expect(failure.message).toContain(`owner pid ${process.pid}`);

    // The replacement lock was never renamed, tombstoned, or removed, and the
    // recovery primitive was released without touching the lock path.
    expect(io.operations.some((operation) =>
      operation.startsWith(`rename:${lock}`) || operation === `remove:${lock}`)).toBe(false);
    expect(readFileSync(lock, "utf8")).toBe(replacement);
    expect(existsSync(`${lock}.recovery`)).toBe(false);
  });

  test("a release blocked by a crash-retained primitive never claims success", () => {
    const { home } = fixture();
    const resolvedHome = realpathSync(home);
    const lock = join(resolvedHome, "state", "registration.lock");
    writeRecoveryOwner(home, deadPid());
    const primitiveBefore = readFileSync(`${lock}.recovery`, "utf8");

    const failure = transitionError(() => {
      inProcessRegister(home, "repository:retained-release", "https://example.com/retained-release.git");
    });
    expect(failure.message).toContain("registration recovery primitive");
    expect(failure.message).toContain("is crash-retained");
    expect(failure.message).toContain("Reconcile it explicitly");
    // The committed pair reached the canonical surfaces, but no success was
    // claimed while the lock cleanup is indeterminate, and the retained
    // primitive was never auto-removed.
    expect(projects(home).projects.map((entry) => entry.id)).toEqual(["repository:retained-release"]);
    expect(readFileSync(`${lock}.recovery`, "utf8")).toBe(primitiveBefore);
    expect(existsSync(lock)).toBe(true);
  });
});

describe("exclusive canonical publication never admits partial JSON", () => {
  test("a failure after the stage claim leaves the canonical path untouched, a retry publishes the complete file, and a winner is never clobbered", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-exclusive-publication-"));
    temporaryRoots.push(root);
    // mkdtemp may return an alias path (for example /var, whose canonical
    // realpath is /private/var on macOS). initializeHome resolves the home
    // through expandPath, which realpaths the nearest existing ancestor, so
    // the injected seam observes stage paths under the canonical form.
    // Derive the home from the canonical root so projectsPath matches the
    // exact unique stage path the seam sees, never the aliased form.
    const home = join(realpathSync(root), "home");
    const projectsPath = join(home, "config", "projects.json");
    const operations: string[] = [];
    let injection: "write" | "link" | undefined = "write";
    // exclusivePublish never writes the final canonical path directly: it
    // claims a unique sibling stage `${path}.${uuid}.tmp` first. The injected
    // write failure must therefore match the exact unique projects stage
    // path, never the final projectsPath.
    const isProjectsStage = (path: string): boolean =>
      path !== projectsPath && path.startsWith(`${projectsPath}.`) && path.endsWith(".tmp");
    const ops: ExclusivePublishOps = {
      writeFile(path, data) {
        operations.push(`write:${path}`);
        if (isProjectsStage(path) && injection === "write") {
          injection = "link";
          // Simulate an EIO after a partial stage write: only the stage can
          // ever carry partial bytes, never the canonical path.
          writeFileSync(path, data.slice(0, Math.floor(data.length / 2)), "utf8");
          throw new Error("injected partial stage write failure");
        }
        writeFileSync(path, data, "utf8");
      },
      fsyncFile(path) {
        operations.push(`fsync:${path}`);
      },
      link(source, destination) {
        operations.push(`link:${source}->${destination}`);
        if (destination === projectsPath && injection === "link") {
          injection = undefined;
          // The stage is fully written and fsynced; the atomic no-replace
          // publication fails after the claim.
          throw new Error("injected publication failure");
        }
        linkSync(source, destination);
      },
      remove(path) {
        operations.push(`remove:${path}`);
        rmSync(path, { force: true });
      },
    };
    const io: HomeIo = {
      createFileExclusive: (path, data) => exclusivePublish(path, data, ops),
    };
    const capture = (callback: () => void): Error => {
      let thrown: unknown;
      try {
        callback();
      } catch (error: unknown) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(Error);
      return thrown as Error;
    };

    // The exact unique stage path of the failed first claim, observed through
    // the seam's write operations (the claim throws before it can return it).
    const failedStage = (): string => {
      const operation = operations.find((entry) =>
        entry.startsWith(`write:${projectsPath}.`) && entry.endsWith(".tmp"));
      expect(operation).toBeDefined();
      return operation!.slice("write:".length);
    };
    const stageLeftovers = (): string[] =>
      readdirSync(dirname(projectsPath)).filter((name) => name.endsWith(".tmp"));

    // First claim: the stage write fails mid-write. The canonical projects
    // path never appears and only this caller's own unique stage is removed,
    // so no partial bytes are ever visible at the canonical path.
    let failure = capture(() => initializeHome(home, io));
    expect(failure.message).toContain("cannot persist Rossovia state");
    expect(existsSync(projectsPath)).toBe(false);
    expect(stageLeftovers()).toEqual([]);
    const firstStage = failedStage();
    expect(operations).toContain(`remove:${firstStage}`);

    // Second claim: the stage is fully written and fsynced, then the atomic
    // no-replace publication fails after the claim. The canonical path is
    // still absent and this caller's second unique stage is likewise
    // removed, so no partial JSON was ever admitted.
    failure = capture(() => initializeHome(home, io));
    expect(failure.message).toContain("cannot persist Rossovia state");
    expect(existsSync(projectsPath)).toBe(false);
    expect(stageLeftovers()).toEqual([]);

    // The retry publishes the complete canonical file through the same seam.
    const initialized = initializeHome(home, io);
    expect(initialized.writeAccess).toBe("verified");
    expect(JSON.parse(readFileSync(projectsPath, "utf8"))).toEqual({
      version: "rosso.projects.v1",
      projects: [],
    });

    // The successful publication observed the exact stage order: the full
    // write, then the fsync, then the atomic no-replace link, and only then
    // the removal of the caller's own stage. Two link attempts were made:
    // the injected failed one (recorded before its throw, never published)
    // and the later successful one, so the last attempted link is the
    // publication that must satisfy the order.
    const published = operations.filter((operation) =>
      operation.startsWith("link:") && operation.endsWith(`->${projectsPath}`));
    expect(published.length).toBe(2);
    const failedLink = published[0] ?? "";
    const successfulLink = published[1] ?? "";
    expect(failedLink).not.toBe(successfulLink);
    // The failed link's own unique stage was removed by the publication's
    // cleanup, and that attempt never published the canonical path.
    const failedStagePath = failedLink.slice("link:".length, failedLink.indexOf("->"));
    expect(operations).toContain(`remove:${failedStagePath}`);
    const stage = successfulLink.slice("link:".length, successfulLink.indexOf("->"));
    const stageWrite = operations.indexOf(`write:${stage}`);
    const stageFsync = operations.indexOf(`fsync:${stage}`);
    const stageLink = operations.indexOf(`link:${stage}->${projectsPath}`);
    const stageRemove = operations.indexOf(`remove:${stage}`);
    expect(stageWrite).toBeGreaterThanOrEqual(0);
    expect(stageFsync).toBeGreaterThan(stageWrite);
    expect(stageLink).toBeGreaterThan(stageFsync);
    expect(stageRemove).toBeGreaterThan(stageLink);
    // Cleanup only ever removed unique stages, never the canonical paths.
    for (const operation of operations.filter((entry) => entry.startsWith("remove:"))) {
      expect(operation.endsWith(".tmp")).toBe(true);
    }

    // A winner already holding the canonical path is never clobbered: the
    // atomic no-replace publication fails with EEXIST and the existing
    // complete bytes are preserved untouched.
    const winner = {
      version: "rosso.projects.v1",
      projects: [{ id: "repository:winner", repository: "https://example.com/winner.git", aliases: ["winner"] }],
    };
    writeFileSync(projectsPath, `${JSON.stringify(winner, null, 2)}\n`, "utf8");
    const winnerBytes = readFileSync(projectsPath, "utf8");
    const rerun = initializeHome(home, io);
    expect(rerun.writeAccess).toBe("verified");
    expect(readFileSync(projectsPath, "utf8")).toBe(winnerBytes);
    expect(JSON.parse(readFileSync(projectsPath, "utf8"))).toEqual(winner);
    expect(readdirSync(join(home, "config")).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });
});
