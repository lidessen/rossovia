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
import { dirname, join } from "node:path";
import { PreferenceReceiptSchema, PreferencesSchema } from "./contracts";
import { initializeHome, loadHome, workspaceFor } from "./home";
import { expandPath } from "./paths";
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
  if (existsSync(target)) throw new Error(`rossovia workbench target home already exists: ${target}`);
  const sourceManifest = join(source, "manifest.json");
  const sourceProjects = join(source, "config", "projects.json");
  for (const required of [sourceManifest, sourceProjects]) {
    if (!existsSync(required) || !statSync(required).isFile()) {
      throw new Error(`required legacy Atthis source not found: ${required}`);
    }
  }
  validateLegacySource(source);
  mkdirSync(dirname(target), { recursive: true });
  const temporary = `${target}.namespace-migration.tmp`;
  if (existsSync(temporary)) throw new Error(`stale namespace migration workspace exists: ${temporary}`);
  const sourceManifestDigest = digest(sourceManifest);
  const sourceProjectsDigest = digest(sourceProjects);
  let verifiedProjectId: string | null = null;
  try {
    cpSync(source, temporary, { recursive: true, dereference: false });
    migrateNamespaceFiles(temporary);
    reconcileLegacyPreferenceReceipts(temporary);
    reconcileObsoleteMachinePreferences(temporary);
    initializeHome(temporary);
    const current = loadHome(temporary);
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
    writeFileSync(join(temporary, "receipts", "namespace-migrations.jsonl"), `${sortedJson(receipt)}\n`, "utf8");
    renameSync(temporary, target);
  } catch (error: unknown) {
    rmSync(temporary, { recursive: true, force: true });
    throw error;
  }
  return {
    migrated: true,
    sourceHome: source,
    targetHome: target,
    verifiedProjectId,
    receipt: join(target, "receipts", "namespace-migrations.jsonl"),
  };
}
