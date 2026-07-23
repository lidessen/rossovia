import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
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

function writeJson(path: string, value: unknown): void {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function createRepository(path: string): void {
  mkdirSync(path, { recursive: true });
  git(path, "init");
  git(path, "config", "user.name", "Rossovia Test");
  git(path, "config", "user.email", "rossovia@example.test");
  writeFileSync(join(path, "README.md"), "# Fixture\n");
  git(path, "add", "README.md");
  git(path, "commit", "-m", "initial");
  git(path, "remote", "add", "origin", "https://example.test/lidessen/migration.git");
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

describe("legacy namespace migration", () => {
  test("moves the retained source into the corrected Bun workbench contract", () => {
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
    expect(rerun.exitCode).toBe(2);
    expect(rerun.stderr).toContain("target home already exists");
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
      expect(denied.exitCode).toBe(2);
      expect(denied.stderr).toContain("cannot persist Rossovia state");
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
    expect(rejected.exitCode).toBe(2);
    expect(rejected.stderr).toContain("require explicit environment reconciliation");
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
    expect(rejected.exitCode).toBe(2);
    expect(rejected.stderr).toContain("machine preference receipts require explicit environment reconciliation");
    expect(existsSync(join(target, ".rossovia-namespace-migration.json"))).toBe(true);
    expect(existsSync(join(target, "manifest.json"))).toBe(false);
  });
});
