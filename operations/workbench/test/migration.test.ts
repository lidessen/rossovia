import { afterEach, describe, expect, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { STATE_FAILURE_EXIT_CODE } from "../src/cli-errors";

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

function writeJson(path: string, value: unknown): void {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function createRepository(path: string, remote = "https://example.test/lidessen/migration.git"): void {
  mkdirSync(path, { recursive: true });
  git(path, "init");
  git(path, "config", "user.name", "Rossovia Test");
  git(path, "config", "user.email", "rossovia@example.test");
  writeFileSync(join(path, "README.md"), "# Fixture\n");
  git(path, "add", "README.md");
  git(path, "commit", "-m", "initial");
  git(path, "remote", "add", "origin", remote);
}

function createLegacyHome(home: string, repository: string, machinePreferences: unknown[] = []): void {
  writeJson(join(home, "manifest.json"), {
    version: "atthis.home.v1",
    namespace: "atthis",
    createdAt: "2026-07-18T00:00:00Z",
  });
  writeJson(join(home, "config", "projects.json"), {
    version: "atthis.projects.v1",
    projects: [{
      id: "repository:migration",
      repository: "https://example.test/lidessen/migration.git",
      aliases: ["migration"],
    }],
  });
  writeJson(join(home, "config", "preferences.json"), {
    version: "atthis.preferences.v1",
    preferences: [{
      id: "execution-carrier",
      statement: "Prefer Work Cell for bounded work.",
      source: "user-explicit",
      recordedAt: "2026-07-18T00:00:00Z",
      updatedAt: "2026-07-18T00:00:00Z",
    }],
  });
  writeJson(join(home, "state", "workspaces.json"), {
    version: "atthis.workspaces.v1",
    workspaces: [{ projectId: "repository:migration", path: repository }],
  });
  writeJson(join(home, "state", "roots.json"), { version: "atthis.roots.v1", roots: [] });
  writeJson(join(home, "state", "preferences.json"), {
    version: "atthis.preferences.v1",
    preferences: machinePreferences,
  });
  writeJson(join(home, "cache", "workspaces.json"), {
    version: "atthis.workspace-index.v1",
    generatedAt: "2026-07-18T00:00:00Z",
    entries: [],
  });
  writeJson(join(home, "cognition", "artifact.json"), {
    version: "atthis.cognitive-artifact.v1",
    metadata: { version: "atthis.user-content.v1" },
  });
  mkdirSync(join(home, "receipts"), { recursive: true });
  writeFileSync(join(home, "receipts", "preferences.jsonl"), `${JSON.stringify({
    version: "atthis.preference-receipt.v1",
    at: "2026-07-18T00:00:00Z",
    action: "set",
    scope: "user",
    id: "execution-carrier",
    projectId: null,
    recordDigest: "0".repeat(64),
  })}\n`, "utf8");
}

/**
 * A target that reproduces exactly what a crashed migration attempt leaves
 * after its durable canonical pair commit: the retained marker with the
 * recorded committed bytes, the initialized manifest and roots, and the
 * committed canonical pair. The recorded digests are computed over the exact
 * bytes on disk, which is the same evidence the production resume check uses.
 */
function writeExposedMigrationTarget(source: string, target: string, workspacePath: string): void {
  writeJson(join(target, "manifest.json"), {
    version: "rosso.home.v1",
    namespace: "rosso",
    createdAt: "2026-07-18T00:00:00Z",
  });
  writeJson(join(target, "state", "roots.json"), { version: "rosso.roots.v1", roots: [] });
  writeJson(join(target, "config", "projects.json"), {
    version: "rosso.projects.v1",
    projects: [{
      id: "repository:migration",
      repository: "https://example.test/lidessen/migration.git",
      aliases: ["migration"],
    }],
  });
  writeJson(join(target, "state", "workspaces.json"), {
    version: "rosso.workspaces.v1",
    workspaces: [{ projectId: "repository:migration", path: workspacePath }],
  });
  writeJson(join(target, ".rossovia-namespace-migration.json"), {
    version: "rosso.namespace-migration.v1",
    sourceHome: realpathSync(source),
    targetHome: realpathSync(target),
    committedProjectsDigest: createHash("sha256")
      .update(readFileSync(join(target, "config", "projects.json")))
      .digest("hex"),
    committedWorkspacesDigest: createHash("sha256")
      .update(readFileSync(join(target, "state", "workspaces.json")))
      .digest("hex"),
  });
}

/** A legacy source plus a target that already holds one live registration
 * owner token, so a reserved-path rejection can prove the live owner and the
 * whole target are untouched. */
function reservedNamespaceFixture(prefix: string): {
  root: string;
  source: string;
  target: string;
  liveLock: string;
} {
  const root = mkdtempSync(join(tmpdir(), prefix));
  temporaryRoots.push(root);
  const repository = join(root, "repository");
  const source = join(root, "legacy-atthis");
  const target = join(root, "rossovia");
  createRepository(repository);
  createLegacyHome(source, repository);
  mkdirSync(join(target, "state"), { recursive: true });
  const liveLock = `${JSON.stringify({
    version: "rosso.registration-lock.v1",
    pid: process.pid,
    owner: randomUUID(),
    acquiredAt: new Date().toISOString(),
  }, null, 2)}\n`;
  writeFileSync(join(target, "state", "registration.lock"), liveLock, "utf8");
  return { root, source, target, liveLock };
}

describe("legacy namespace migration", () => {
  test("moves the retained source into the portable Workbench contract", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-migration-"));
    temporaryRoots.push(root);
    const repository = join(root, "repository");
    const source = join(root, "legacy-atthis");
    const target = join(root, "rossovia");
    createRepository(repository);
    createLegacyHome(source, repository);
    const sourceManifest = readFileSync(join(source, "manifest.json"), "utf8");

    const migrated = workbench(target, "migrate", "--from-home", source);
    expect(migrated.exitCode).toBe(0);
    expect(JSON.parse(migrated.stdout)).toEqual(expect.objectContaining({
      migrated: true,
      sourceHome: realpathSync(source),
      targetHome: join(realpathSync(root), "rossovia"),
      verifiedProjectId: "repository:migration",
    }));
    expect(readFileSync(join(source, "manifest.json"), "utf8")).toBe(sourceManifest);
    expect(JSON.parse(readFileSync(join(target, "manifest.json"), "utf8"))).toEqual(expect.objectContaining({
      version: "rosso.home.v1",
      namespace: "rosso",
    }));
    expect(existsSync(join(target, "state", "preferences.json"))).toBe(false);
    const artifact = JSON.parse(readFileSync(join(target, "cognition", "artifact.json"), "utf8"));
    expect(artifact.version).toBe("rosso.cognitive-artifact.v1");
    expect(artifact.metadata.version).toBe("atthis.user-content.v1");
    expect(workbench(target, "resolve", "migration").exitCode).toBe(0);
    expect(existsSync(join(target, "receipts", "namespace-migrations.jsonl"))).toBe(true);
    expect(existsSync(join(target, ".rossovia-namespace-migration.json"))).toBe(false);
    expect(existsSync(`${target}.namespace-migration.tmp`)).toBe(false);
    const applicable = JSON.parse(workbench(target, "preference", "list").stdout);
    expect(applicable.preferences[0].statement).toBe("Prefer Work Cell for bounded work.");
    const preferenceReceipt = JSON.parse(readFileSync(join(target, "receipts", "preferences.jsonl"), "utf8").trim());
    expect(preferenceReceipt.version).toBe("rosso.preference-receipt.v2");
    expect(preferenceReceipt).not.toHaveProperty("scope");

    const rerun = workbench(target, "migrate", "--from-home", source);
    expect(rerun.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(rerun.stderr).toContain("rossovia: ");
    expect(rerun.stderr).toContain("target home already exists");
    expect(rerun.stderr).not.toContain("for usage");
  });

  test("restarts an interrupted migration inside the exact target home", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-interrupted-migration-"));
    temporaryRoots.push(root);
    const repository = join(root, "repository");
    const source = join(root, "legacy-atthis");
    const target = join(root, "rossovia");
    createRepository(repository);
    createLegacyHome(source, repository);
    mkdirSync(target);
    writeJson(join(target, ".rossovia-namespace-migration.json"), {
      version: "rosso.namespace-migration.v1",
      sourceHome: realpathSync(source),
      targetHome: realpathSync(target),
    });
    writeFileSync(join(target, "partial"), "incomplete");

    const migrated = workbench(target, "migrate", "--from-home", source);
    expect(migrated.exitCode).toBe(0);
    expect(existsSync(join(target, "partial"))).toBe(false);
    expect(existsSync(join(target, ".rossovia-namespace-migration.json"))).toBe(false);
    expect(existsSync(`${target}.namespace-migration.tmp`)).toBe(false);
    expect(workbench(target, "resolve", "migration").exitCode).toBe(0);
  });

  test("resumes an interrupted migration whose marker records the committed pair bytes", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-resume-recorded-pair-"));
    temporaryRoots.push(root);
    const repository = join(root, "repository");
    const source = join(root, "legacy-atthis");
    const target = join(root, "rossovia");
    createRepository(repository);
    createLegacyHome(source, repository);
    writeExposedMigrationTarget(source, target, repository);

    const migrated = workbench(target, "migrate", "--from-home", source);
    expect(migrated.exitCode).toBe(0);
    expect(existsSync(join(target, ".rossovia-namespace-migration.json"))).toBe(false);
    const projects = JSON.parse(readFileSync(join(target, "config", "projects.json"), "utf8")) as {
      projects: Array<{ id: string }>;
    };
    expect(projects.projects.map((project) => project.id)).toEqual(["repository:migration"]);
    expect(workbench(target, "resolve", "migration").exitCode).toBe(0);
  });

  test("rejects and preserves a registration that succeeded after the interrupted migration exposed the target", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-exposure-register-"));
    temporaryRoots.push(root);
    const repository = join(root, "repository");
    const second = join(root, "second");
    const source = join(root, "legacy-atthis");
    const target = join(root, "rossovia");
    createRepository(repository);
    createLegacyHome(source, repository);
    createRepository(second, "https://example.test/lidessen/second.git");
    // The exposure: a crashed migration attempt already committed the
    // migrated pair, recorded its committed bytes in the marker, and
    // initialized the home before it died.
    writeExposedMigrationTarget(source, target, repository);

    // The registration begins after the exposure and succeeds fully.
    const registered = workbench(target, "register", second, "--id", "repository:second", "--alias", "second");
    expect(registered.exitCode, registered.stderr).toBe(0);
    const projectsAfterRegister = readFileSync(join(target, "config", "projects.json"), "utf8");
    const workspacesAfterRegister = readFileSync(join(target, "state", "workspaces.json"), "utf8");

    // The resumed migration must fail visibly instead of clearing or
    // replacing the newer registration: no silent lost update.
    const migrated = workbench(target, "migrate", "--from-home", source);
    expect(migrated.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(migrated.stderr).toContain(
      "rossovia: a registration succeeded in the rossovia target after the interrupted migration exposed it",
    );
    expect(migrated.stderr).toContain("no successful registration is silently lost");
    expect(migrated.stderr).not.toContain("for usage");

    // The successful registration was neither cleared nor replaced, and the
    // target stays explicitly retryable through the retained marker.
    const projects = JSON.parse(readFileSync(join(target, "config", "projects.json"), "utf8")) as {
      projects: Array<{ id: string }>;
    };
    expect(projects.projects.map((project) => project.id)).toEqual(["repository:migration", "repository:second"]);
    const workspaces = JSON.parse(readFileSync(join(target, "state", "workspaces.json"), "utf8")) as {
      workspaces: Array<{ projectId: string }>;
    };
    expect(workspaces.workspaces.map((workspace) => workspace.projectId)).toEqual(
      ["repository:migration", "repository:second"],
    );
    expect(readFileSync(join(target, "config", "projects.json"), "utf8")).toBe(projectsAfterRegister);
    expect(readFileSync(join(target, "state", "workspaces.json"), "utf8")).toBe(workspacesAfterRegister);
    expect(existsSync(join(target, ".rossovia-namespace-migration.json"))).toBe(true);
    expect(workbench(target, "resolve", "second").exitCode).toBe(0);
  });

  test("rejects and preserves a registration that succeeded after the initial marker exposure", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-initial-exposure-register-"));
    temporaryRoots.push(root);
    const repository = join(root, "repository");
    const second = join(root, "second");
    const source = join(root, "legacy-atthis");
    const target = join(root, "rossovia");
    createRepository(repository);
    createLegacyHome(source, repository);
    createRepository(second, "https://example.test/lidessen/second.git");
    // The initial exposure: exactly what a starting migration publishes
    // before it takes the registration owner — the target directory plus the
    // migration marker, before any canonical state exists.
    mkdirSync(target, { recursive: true });
    writeJson(join(target, ".rossovia-namespace-migration.json"), {
      version: "rosso.namespace-migration.v1",
      sourceHome: realpathSync(source),
      targetHome: realpathSync(target),
    });

    // A concurrent initialization and registration win the exposure window
    // and publish the canonical pair before the migration proceeds.
    const initialized = workbench(target, "init");
    expect(initialized.exitCode, initialized.stderr).toBe(0);
    const registered = workbench(target, "register", second, "--id", "repository:second", "--alias", "second");
    expect(registered.exitCode, registered.stderr).toBe(0);
    const projectsAfterRegister = readFileSync(join(target, "config", "projects.json"), "utf8");

    const migrated = workbench(target, "migrate", "--from-home", source);
    expect(migrated.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(migrated.stderr).toContain(
      "rossovia: a registration succeeded in the rossovia target after the interrupted migration exposed it",
    );
    expect(migrated.stderr).not.toContain("for usage");

    const projects = JSON.parse(readFileSync(join(target, "config", "projects.json"), "utf8")) as {
      projects: Array<{ id: string }>;
    };
    expect(projects.projects.map((project) => project.id)).toEqual(["repository:second"]);
    expect(readFileSync(join(target, "config", "projects.json"), "utf8")).toBe(projectsAfterRegister);
    expect(existsSync(join(target, ".rossovia-namespace-migration.json"))).toBe(true);
    expect(workbench(target, "resolve", "second").exitCode).toBe(0);
  });

  test("recovers an empty target after marker publication was denied", () => {
    if (process.platform === "win32") return;
    const root = mkdtempSync(join(tmpdir(), "rossovia-marker-publication-"));
    temporaryRoots.push(root);
    const repository = join(root, "repository");
    const source = join(root, "legacy-atthis");
    const target = join(root, "rossovia");
    createRepository(repository);
    createLegacyHome(source, repository);
    mkdirSync(target);
    chmodSync(target, 0o555);
    try {
      const denied = workbench(target, "migrate", "--from-home", source);
      expect(denied.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
      expect(denied.stderr).toContain("rossovia: cannot persist Rossovia state");
      expect(denied.stderr).not.toContain("for usage");
      expect(existsSync(join(target, ".rossovia-namespace-migration.json"))).toBe(false);
    } finally {
      chmodSync(target, 0o755);
    }

    const retried = workbench(target, "migrate", "--from-home", source);
    expect(retried.exitCode).toBe(0);
    expect(existsSync(join(target, ".rossovia-namespace-migration.json"))).toBe(false);
    expect(workbench(target, "resolve", "migration").exitCode).toBe(0);
  });

  test("refuses to reinterpret nonempty machine preferences", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-machine-preference-rejection-"));
    temporaryRoots.push(root);
    const repository = join(root, "repository");
    const source = join(root, "legacy-atthis");
    const target = join(root, "rossovia");
    createRepository(repository);
    createLegacyHome(source, repository, [{
      id: "provider-order",
      statement: "Prefer a local provider.",
      source: "user-explicit",
      recordedAt: "2026-07-18T00:00:00Z",
      updatedAt: "2026-07-18T00:00:00Z",
    }]);
    const rejected = workbench(target, "migrate", "--from-home", source);
    expect(rejected.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(rejected.stderr).toContain("rossovia: legacy machine preferences require explicit environment reconciliation");
    expect(rejected.stderr).not.toContain("for usage");
    expect(existsSync(join(target, ".rossovia-namespace-migration.json"))).toBe(true);
    expect(existsSync(join(target, "manifest.json"))).toBe(false);
  });

  test("refuses to reinterpret machine-scoped receipt history", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-machine-receipt-rejection-"));
    temporaryRoots.push(root);
    const repository = join(root, "repository");
    const source = join(root, "legacy-atthis");
    const target = join(root, "rossovia");
    createRepository(repository);
    createLegacyHome(source, repository);
    const receiptPath = join(source, "receipts", "preferences.jsonl");
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
    receipt.scope = "machine";
    writeFileSync(receiptPath, `${JSON.stringify(receipt)}\n`, "utf8");
    const rejected = workbench(target, "migrate", "--from-home", source);
    expect(rejected.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(rejected.stderr).toContain("rossovia: legacy machine preference receipts require explicit environment reconciliation");
    expect(rejected.stderr).not.toContain("for usage");
    expect(existsSync(join(target, ".rossovia-namespace-migration.json"))).toBe(true);
    expect(existsSync(join(target, "manifest.json"))).toBe(false);
  });

  test("rejects a legacy source carrying a registration.lock file before any target mutation", () => {
    const { source, target, liveLock } = reservedNamespaceFixture("rossovia-reserved-lock-file-");
    writeFileSync(join(source, "state", "registration.lock"), "stale-lock-bytes", "utf8");

    const rejected = workbench(target, "migrate", "--from-home", source);
    expect(rejected.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(rejected.stderr).toContain("rossovia: legacy source contains a reserved Rossovia registration lock path");
    expect(rejected.stderr).toContain("registration.lock");
    expect(rejected.stderr).not.toContain("for usage");
    // The rejection happened before any target mutation: the live owner token
    // is untouched and no marker or copied manifest was written.
    expect(readFileSync(join(target, "state", "registration.lock"), "utf8")).toBe(liveLock);
    expect(existsSync(join(target, ".rossovia-namespace-migration.json"))).toBe(false);
    expect(existsSync(join(target, "manifest.json"))).toBe(false);
    expect(readFileSync(join(source, "state", "registration.lock"), "utf8")).toBe("stale-lock-bytes");
  });

  test("rejects a legacy source carrying a registration.lock.recovery file before any target mutation", () => {
    const { source, target, liveLock } = reservedNamespaceFixture("rossovia-reserved-lock-recovery-");
    writeFileSync(join(source, "state", "registration.lock.recovery"), "stale-recovery-bytes", "utf8");

    const rejected = workbench(target, "migrate", "--from-home", source);
    expect(rejected.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(rejected.stderr).toContain("rossovia: legacy source contains a reserved Rossovia registration lock path");
    expect(rejected.stderr).toContain("registration.lock.recovery");
    expect(rejected.stderr).not.toContain("for usage");
    expect(readFileSync(join(target, "state", "registration.lock"), "utf8")).toBe(liveLock);
    expect(existsSync(join(target, ".rossovia-namespace-migration.json"))).toBe(false);
    expect(existsSync(join(target, "manifest.json"))).toBe(false);
    expect(readFileSync(join(source, "state", "registration.lock.recovery"), "utf8")).toBe("stale-recovery-bytes");
  });

  test("rejects a legacy source carrying a registration.lock tombstone before any target mutation", () => {
    const { source, target, liveLock } = reservedNamespaceFixture("rossovia-reserved-lock-tombstone-");
    const tombstone = "registration.lock.stale-01234567-89ab-cdef-0123-456789abcdef";
    writeFileSync(join(source, "state", tombstone), "tombstone", "utf8");

    const rejected = workbench(target, "migrate", "--from-home", source);
    expect(rejected.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(rejected.stderr).toContain("rossovia: legacy source contains a reserved Rossovia registration lock path");
    expect(rejected.stderr).toContain(tombstone);
    expect(rejected.stderr).not.toContain("for usage");
    expect(readFileSync(join(target, "state", "registration.lock"), "utf8")).toBe(liveLock);
    expect(existsSync(join(target, ".rossovia-namespace-migration.json"))).toBe(false);
    expect(existsSync(join(target, "manifest.json"))).toBe(false);
    expect(readFileSync(join(source, "state", tombstone), "utf8")).toBe("tombstone");
  });

  test("rejects a legacy source with a reserved registration lock directory", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-reserved-lock-directory-"));
    temporaryRoots.push(root);
    const repository = join(root, "repository");
    const source = join(root, "legacy-atthis");
    const target = join(root, "rossovia");
    createRepository(repository);
    createLegacyHome(source, repository);
    mkdirSync(join(source, "state", "registration.lock"), { recursive: true });
    writeFileSync(join(source, "state", "registration.lock", "descendant"), "x", "utf8");

    const rejected = workbench(target, "migrate", "--from-home", source);
    expect(rejected.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(rejected.stderr).toContain("legacy source contains a reserved Rossovia registration lock path");
    expect(rejected.stderr).toContain("registration.lock");
    expect(existsSync(join(target, ".rossovia-namespace-migration.json"))).toBe(false);
  });

  test("rejects a legacy pair whose workspace references a project absent from the migrated projects state", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-ghost-workspace-"));
    temporaryRoots.push(root);
    const repository = join(root, "repository");
    const source = join(root, "legacy-atthis");
    const target = join(root, "rossovia");
    createRepository(repository);
    createLegacyHome(source, repository);
    writeJson(join(source, "state", "workspaces.json"), {
      version: "atthis.workspaces.v1",
      workspaces: [{ projectId: "repository:ghost", path: repository }],
    });

    const rejected = workbench(target, "migrate", "--from-home", source);
    expect(rejected.exitCode).toBe(STATE_FAILURE_EXIT_CODE);
    expect(rejected.stderr).toContain("registration pair is inconsistent");
    expect(rejected.stderr).toContain("references project repository:ghost");
    expect(rejected.stderr).not.toContain("for usage");
    // The migration failed after the target rewrite, so the marker is
    // retained and the failed migration stays explicitly retryable.
    expect(existsSync(join(target, ".rossovia-namespace-migration.json"))).toBe(true);
    expect(existsSync(join(target, "manifest.json"))).toBe(false);
  });
});
