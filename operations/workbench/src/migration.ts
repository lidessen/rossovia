import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { PreferenceReceiptSchema, PreferencesSchema } from "./contracts";
import { initializeHome, loadHome, saveJson, workspaceFor } from "./home";
import { expandPath } from "./paths";
import { acquireRegistrationLock, registrationLockName } from "./registration";
import { observeWorkspace } from "./workspace";

function digest(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function migrateRecord(value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return value;
  const record = { ...(value as Record<string, unknown>) };
  if (record.namespace === "atthis") record.namespace = "rosso";
  if (typeof record.version === "string" && record.version.startsWith("atthis.")) {
    record.version = `rosso.${record.version.slice("atthis.".length)}`;
  }
  return record;
}

function filesBelow(root: string): string[] {
  const files: string[] = [];
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop()!;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) pending.push(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  return files.sort();
}

function migrateNamespaceFiles(home: string): void {
  for (const path of filesBelow(home)) {
    if (path.endsWith(".json")) {
      const current = JSON.parse(readFileSync(path, "utf8"));
      const migrated = migrateRecord(current);
      if (JSON.stringify(migrated) !== JSON.stringify(current)) {
        writeFileSync(path, `${JSON.stringify(migrated, null, 2)}\n`, "utf8");
      }
    } else if (path.endsWith(".jsonl")) {
      const original = readFileSync(path, "utf8");
      let changed = false;
      const lines = original.split(/\r?\n/).map((line, index) => {
        if (!line.trim()) return line;
        let current: unknown;
        try {
          current = JSON.parse(line);
        } catch (error: unknown) {
          throw new Error(`invalid JSONL in ${path} at line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
        }
        const migrated = migrateRecord(current);
        if (JSON.stringify(migrated) !== JSON.stringify(current)) changed = true;
        return JSON.stringify(migrated);
      });
      if (changed) writeFileSync(path, lines.join("\n"), "utf8");
    }
  }
}

function readObject(path: string): Record<string, unknown> {
  const value = JSON.parse(readFileSync(path, "utf8"));
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`expected a JSON object in ${path}`);
  }
  return value as Record<string, unknown>;
}

function validateLegacySource(source: string): void {
  const manifest = readObject(join(source, "manifest.json"));
  if (manifest.version !== "atthis.home.v1") throw new Error("legacy manifest version must be atthis.home.v1");
  if (manifest.namespace !== "atthis") throw new Error("legacy manifest namespace must be atthis");
  const projects = readObject(join(source, "config", "projects.json"));
  if (projects.version !== "atthis.projects.v1") throw new Error("legacy projects version must be atthis.projects.v1");
}

function reconcileObsoleteMachinePreferences(home: string): void {
  const path = join(home, "state", "preferences.json");
  if (!existsSync(path)) return;
  const parsed = PreferencesSchema.parse(JSON.parse(readFileSync(path, "utf8")));
  if (parsed.preferences.length > 0) {
    throw new Error("legacy machine preferences require explicit environment reconciliation before migration");
  }
  rmSync(path);
}

function reconcileLegacyPreferenceReceipts(home: string): void {
  const path = join(home, "receipts", "preferences.jsonl");
  if (!existsSync(path)) return;
  const original = readFileSync(path, "utf8");
  let changed = false;
  const lines = original.split(/\r?\n/).map((line, index) => {
    if (!line.trim()) return line;
    let receipt: Record<string, unknown>;
    try {
      receipt = readRecord(line);
    } catch (error: unknown) {
      throw new Error(`invalid preference receipt at line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (receipt.version === "rosso.preference-receipt.v2") {
      PreferenceReceiptSchema.parse(receipt);
      return JSON.stringify(receipt);
    }
    if (receipt.version !== "rosso.preference-receipt.v1") {
      throw new Error(`preference receipt at line ${index + 1} has an unsupported version`);
    }
    const expectedFields = ["action", "at", "id", "projectId", "recordDigest", "scope", "version"];
    if (Object.keys(receipt).sort().join("\0") !== expectedFields.join("\0")) {
      throw new Error(`preference receipt at line ${index + 1} has invalid fields`);
    }
    if (receipt.scope === "machine") {
      throw new Error("legacy machine preference receipts require explicit environment reconciliation before migration");
    }
    if (receipt.scope !== "user") {
      throw new Error(`preference receipt at line ${index + 1} has an invalid scope`);
    }
    const migrated = PreferenceReceiptSchema.parse({
      version: "rosso.preference-receipt.v2",
      at: receipt.at,
      action: receipt.action,
      id: receipt.id,
      projectId: receipt.projectId,
      recordDigest: receipt.recordDigest,
    });
    changed = true;
    return JSON.stringify(migrated);
  });
  if (changed) writeFileSync(path, lines.join("\n"), "utf8");
}

function readRecord(value: string): Record<string, unknown> {
  const parsed = JSON.parse(value);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("expected a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function sortedJson(value: Record<string, unknown>): string {
  return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))));
}

const migrationMarkerName = ".rossovia-namespace-migration.json";
const MigrationMarkerSchema = z.object({
  version: z.literal("rosso.namespace-migration.v1"),
  sourceHome: z.string().min(1),
  targetHome: z.string().min(1),
}).strict();

function clearMigrationTarget(target: string): void {
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    if (entry.name === migrationMarkerName) continue;
    const path = join(target, entry.name);
    if (entry.name === "state") {
      // The caller holds the registration lock inside state/: preserve it so
      // the owner boundary stays continuous across the rewrite.
      if (entry.isDirectory()) {
        for (const child of readdirSync(path, { withFileTypes: true })) {
          if (child.name === registrationLockName) continue;
          rmSync(join(path, child.name), { recursive: true, force: true });
        }
      }
      continue;
    }
    rmSync(path, { recursive: true, force: true });
  }
}

function prepareMigrationTarget(source: string, target: string): { marker: string; release: () => void } {
  const marker = join(target, migrationMarkerName);
  const markerValue = {
    version: "rosso.namespace-migration.v1",
    sourceHome: source,
    targetHome: target,
  };
  if (existsSync(target)) {
    if (existsSync(marker)) {
      const interrupted = MigrationMarkerSchema.parse(JSON.parse(readFileSync(marker, "utf8")));
      if (interrupted.sourceHome !== source || interrupted.targetHome !== target) {
        throw new Error(`rossovia workbench target contains an unrelated migration transaction: ${target}`);
      }
      // Serialize the clear of the interrupted target under the registration
      // owner boundary, so no register transition can observe or write the
      // canonical pair while the migration rewrites it.
      const release = acquireRegistrationLock(target);
      try {
        clearMigrationTarget(target);
        saveJson(marker, markerValue);
      } catch (error: unknown) {
        release();
        throw error;
      }
      return { marker, release };
    } else if (readdirSync(target).length > 0) {
      throw new Error(`rossovia workbench target home already exists: ${target}`);
    }
  } else {
    mkdirSync(target, { recursive: true });
  }
  saveJson(marker, markerValue);
  const release = acquireRegistrationLock(target);
  return { marker, release };
}

function copyLegacyHome(source: string, target: string): void {
  if (existsSync(join(source, migrationMarkerName))) {
    throw new Error(`legacy source contains reserved migration marker: ${migrationMarkerName}`);
  }
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    cpSync(join(source, entry.name), join(target, entry.name), { recursive: true, dereference: false });
  }
}

const migrationTestHookDirectory = process.env.ROSSO_MIGRATION_TEST_HOOK_DIR;

/**
 * Test-only barrier instrumentation: when ROSSO_MIGRATION_TEST_HOOK_DIR is
 * set, a migration that has just committed the target home publishes a ready
 * marker and waits (bounded) for the matching go marker before continuing,
 * still holding the registration lock. This lets the concurrency regression
 * run a register transition against the same home while the migration is
 * mid-flight. Unset in production, this is a no-op.
 */
function migrationTestHook(phase: string): void {
  const directory = migrationTestHookDirectory;
  if (!directory) return;
  const ready = join(directory, `ready-${phase}`);
  const proceed = join(directory, `go-${phase}`);
  try {
    mkdirSync(directory, { recursive: true });
    writeFileSync(ready, "", "utf8");
  } catch {
    return;
  }
  for (let attempt = 0; attempt < 400; attempt += 1) {
    if (existsSync(proceed)) return;
    Bun.sleepSync(25);
  }
}

export function migrateLegacyHome(homeArgument?: string, fromHomeArgument?: string): {
  migrated: true;
  sourceHome: string;
  targetHome: string;
  verifiedProjectId: string | null;
  receipt: string;
} {
  const source = expandPath(fromHomeArgument ?? "~/.atthis");
  const target = expandPath(homeArgument ?? process.env.ROSSO_HOME ?? "~/.rosso");
  if (source === target) throw new Error("legacy source and rossovia workbench target home must differ");
  if (!existsSync(source) || !statSync(source).isDirectory()) {
    throw new Error(`legacy Atthis home does not exist: ${source}`);
  }
  const sourceManifest = join(source, "manifest.json");
  const sourceProjects = join(source, "config", "projects.json");
  for (const required of [sourceManifest, sourceProjects]) {
    if (!existsSync(required) || !statSync(required).isFile()) {
      throw new Error(`required legacy Atthis source not found: ${required}`);
    }
  }
  validateLegacySource(source);
  const sourceManifestDigest = digest(sourceManifest);
  const sourceProjectsDigest = digest(sourceProjects);
  let verifiedProjectId: string | null = null;
  const { marker, release } = prepareMigrationTarget(source, target);
  try {
    copyLegacyHome(source, target);
    migrateNamespaceFiles(target);
    reconcileLegacyPreferenceReceipts(target);
    reconcileObsoleteMachinePreferences(target);
    initializeHome(target);
    migrationTestHook("verify");
    const current = loadHome(target);
    const verificationErrors: string[] = [];
    for (const project of current.projects.projects) {
      try {
        observeWorkspace(project, workspaceFor(current.workspaces, project.id));
        verifiedProjectId = project.id;
        break;
      } catch (error: unknown) {
        verificationErrors.push(`${project.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (current.projects.projects.length > 0 && !verifiedProjectId) {
      throw new Error(`no migrated project could be verified: ${verificationErrors.join("; ")}`);
    }
    const receipt = {
      version: "rosso.namespace-migration-receipt.v1",
      at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      fromNamespace: "atthis",
      toNamespace: "rosso",
      sourceHome: source,
      targetHome: target,
      sourceManifestDigest,
      sourceProjectsDigest,
      verifiedProjectId,
    };
    writeFileSync(join(target, "receipts", "namespace-migrations.jsonl"), `${sortedJson(receipt)}\n`, "utf8");
    rmSync(marker);
  } catch (error: unknown) {
    try {
      clearMigrationTarget(target);
    } catch {
      // Preserve the migration failure. The marker keeps the target retryable.
    }
    throw error;
  } finally {
    release();
  }
  return {
    migrated: true,
    sourceHome: source,
    targetHome: target,
    verifiedProjectId,
    receipt: join(target, "receipts", "namespace-migrations.jsonl"),
  };
}
