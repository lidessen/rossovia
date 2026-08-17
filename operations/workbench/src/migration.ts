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
import {
  PreferenceReceiptSchema,
  PreferencesSchema,
  ProjectsSchema,
  WorkspacesSchema,
  type Projects,
  type Workspaces,
} from "./contracts";
import { initializeHome, loadHome, saveJson, validateProjects, validateWorkspaces, workspaceFor } from "./home";
import { expandPath } from "./paths";
import {
  acquireRegistrationLock,
  commitCanonicalPair,
  nodeRegistrationIo,
  registrationLockName,
  validateRegistrationPair,
  type RegistrationIo,
} from "./registration";
import { observeWorkspace } from "./workspace";

function digest(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function digestBytes(value: string): string {
  return createHash("sha256").update(value).digest("hex");
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

/** The exact canonical pair paths, relative to one home root. */
function canonicalProjectsPath(home: string): string {
  return join(home, "config", "projects.json");
}

function canonicalWorkspacesPath(home: string): string {
  return join(home, "state", "workspaces.json");
}

function isCanonicalPairPath(home: string, path: string): boolean {
  return path === canonicalProjectsPath(home) || path === canonicalWorkspacesPath(home);
}

function migrateNamespaceFiles(home: string): void {
  for (const path of filesBelow(home)) {
    // The canonical pair is never namespace-rewritten in place: it is
    // migrated, parsed, and validated as one in-memory pair and then
    // published through the shared durable commit under the held owner.
    if (isCanonicalPairPath(home, path)) continue;
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

/**
 * The reserved registration namespace the migration must never import from a
 * legacy source: the live registration lock, its recovery primitive, and any
 * reserved descendant, tombstone, or stage under the same names. Copying any
 * of these could replace the target's live owner boundary mid-transition, so
 * the whole namespace is rejected before the target is mutated at all, and
 * the live owner token in the target is provably left untouched.
 */
function assertLegacySourceReservedClear(source: string): void {
  const reserved = (name: string): boolean =>
    name === registrationLockName || name.startsWith(`${registrationLockName}.`);
  const pending = [source];
  while (pending.length > 0) {
    const current = pending.pop()!;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (reserved(entry.name)) {
        throw new Error(
          `legacy source contains a reserved Rossovia registration lock path: ${join(current, entry.name)}. ` +
          "Remove it from the legacy source explicitly before migration.",
        );
      }
      if (entry.isDirectory() && !entry.isSymbolicLink()) pending.push(join(current, entry.name));
    }
  }
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
  // Recorded by the migration immediately before its durable canonical pair
  // commit: the sha256 of the exact projects and workspaces bytes about to
  // be published. A resumed migration uses them to prove which canonical
  // state its own interrupted attempt committed and which states a register
  // or attach published after the target was exposed.
  committedProjectsDigest: z.string().length(64).optional(),
  committedWorkspacesDigest: z.string().length(64).optional(),
}).strict();

function clearMigrationTarget(target: string): void {
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    if (entry.name === migrationMarkerName) continue;
    const path = join(target, entry.name);
    if (entry.name === "state") {
      // The caller holds the registration lock inside state/: preserve the
      // whole reserved lock/recovery/tombstone namespace so the owner
      // boundary stays continuous across the rewrite and a crash-retained
      // recovery primitive is never silently deleted by the migration.
      if (entry.isDirectory()) {
        for (const child of readdirSync(path, { withFileTypes: true })) {
          if (child.name === registrationLockName || child.name.startsWith(`${registrationLockName}.`)) continue;
          rmSync(join(path, child.name), { recursive: true, force: true });
        }
      }
      continue;
    }
    rmSync(path, { recursive: true, force: true });
  }
}

function registrationExposedError(target: string): Error {
  return new Error(
    `a registration succeeded in the rossovia target after the interrupted migration exposed it: ${target}. ` +
    "The migration refuses to clear or replace that canonical registration state. " +
    "Finish or revert the newer registration explicitly before retrying migration, so no successful " +
    "registration is silently lost.",
  );
}

/**
 * Under the held registration owner, verify the exact canonical pair before
 * the interrupted target is cleared. The only states the migration's own
 * interrupted attempt can have left are admitted: no canonical admission yet,
 * the empty pair a concurrent initialization published during the exposure,
 * the projects-only subset of the recorded durable commit (a crash between
 * the two renames), or the exact recorded committed pair. Anything else
 * proves a register or attach succeeded after the exposure — the migration
 * fails closed instead of clearing or replacing that successful registration
 * with the fabricated empty previous bytes of its durable commit.
 */
function verifyTargetCanonicalPairBeforeClear(
  target: string,
  // MigrationMarkerSchema.parse produces optional digest fields whose present
  // type includes undefined; under exactOptionalPropertyTypes the helper's
  // boundary must accept that exact view. The logic below deliberately treats
  // an absent and an explicitly undefined digest identically.
  marker: { committedProjectsDigest?: string | undefined; committedWorkspacesDigest?: string | undefined },
): void {
  const projectsPath = canonicalProjectsPath(target);
  const workspacesPath = canonicalWorkspacesPath(target);
  const projectsPresent = existsSync(projectsPath);
  const workspacesPresent = existsSync(workspacesPath);
  if (!projectsPresent && !workspacesPresent) return;
  if (!projectsPresent || !workspacesPresent) {
    // Partial admission. Only this migration's own durable commit can leave
    // projects without workspaces (register and attach require both files),
    // and a concurrent initialization can leave the empty projects subset.
    const admittedSubset = projectsPresent && !workspacesPresent
      && (readFileSync(projectsPath, "utf8") === emptyCanonicalProjectsBytes()
        || (marker.committedProjectsDigest !== undefined
          && digest(projectsPath) === marker.committedProjectsDigest));
    if (admittedSubset) return;
    throw registrationExposedError(target);
  }
  const projectsBytes = readFileSync(projectsPath, "utf8");
  const workspacesBytes = readFileSync(workspacesPath, "utf8");
  // The empty pair a concurrent init published carries no registration, so
  // the migration may replace it.
  if (projectsBytes === emptyCanonicalProjectsBytes() && workspacesBytes === emptyCanonicalWorkspacesBytes()) return;
  if (marker.committedProjectsDigest === undefined || marker.committedWorkspacesDigest === undefined) {
    // A non-empty pair without recorded committed bytes can only have been
    // published by a registration after the exposure.
    throw registrationExposedError(target);
  }
  if (digest(projectsPath) === marker.committedProjectsDigest
    && digest(workspacesPath) === marker.committedWorkspacesDigest) return;
  throw registrationExposedError(target);
}

function prepareMigrationTarget(
  source: string,
  target: string,
  io: RegistrationIo,
): { marker: string; markerValue: { version: string; sourceHome: string; targetHome: string }; release: () => void } {
  const marker = join(target, migrationMarkerName);
  const markerValue = {
    version: "rosso.namespace-migration.v1",
    sourceHome: source,
    targetHome: target,
  };
  if (existsSync(target)) {
    if (existsSync(marker)) {
      // The first read only decides whether the retained marker belongs to
      // this transaction; the authoritative decision happens under the lock.
      const retained = MigrationMarkerSchema.parse(JSON.parse(readFileSync(marker, "utf8")));
      if (retained.sourceHome !== source || retained.targetHome !== target) {
        throw new Error(`rossovia workbench target contains an unrelated migration transaction: ${target}`);
      }
    } else if (readdirSync(target).length > 0) {
      throw new Error(`rossovia workbench target home already exists: ${target}`);
    }
  } else {
    mkdirSync(target, { recursive: true });
  }
  // Publish the marker before taking the lock so a later migration can
  // recognize the interrupted transaction. The canonical pair is never
  // touched here, and the exposure race is re-checked under the lock below.
  if (!existsSync(marker)) saveJson(marker, markerValue);
  const release = acquireRegistrationLock(target, io);
  try {
    // Re-make the decision on the authoritative state under the registration
    // owner. A register that succeeded while the target was exposed has
    // already committed its pair; the migration must never clear or replace
    // it, so the exact canonical state is verified immediately before the
    // clear and the durable pair commit that follows under the same owner.
    if (existsSync(marker)) {
      const current = MigrationMarkerSchema.parse(JSON.parse(readFileSync(marker, "utf8")));
      if (current.sourceHome !== source || current.targetHome !== target) {
        throw new Error(`rossovia workbench target contains an unrelated migration transaction: ${target}`);
      }
      verifyTargetCanonicalPairBeforeClear(target, current);
      clearMigrationTarget(target);
      saveJson(marker, markerValue);
    } else {
      // The marker published above is gone: another migration completed the
      // target while this one waited, or the marker was removed manually.
      if (existsSync(join(target, "manifest.json"))) {
        throw new Error(`rossovia workbench target home already exists: ${target}`);
      }
      if (existsSync(canonicalProjectsPath(target)) || existsSync(canonicalWorkspacesPath(target))) {
        throw new Error(
          `the rossovia target received canonical registration state while the migration prepared it: ${target}. ` +
          "Reconcile the target explicitly before retrying migration, so no successful registration is silently replaced.",
        );
      }
      saveJson(marker, markerValue);
    }
    return { marker, markerValue, release };
  } catch (error: unknown) {
    release();
    throw error;
  }
}

function migrateCanonicalPair(source: string): { projects: Projects; workspaces: Workspaces } {
  const projectsEnvelope = migrateRecord(readObject(canonicalProjectsPath(source))) as Record<string, unknown>;
  const projectsValue = ProjectsSchema.parse({
    ...projectsEnvelope,
    projects: Array.isArray(projectsEnvelope.projects)
      ? (projectsEnvelope.projects as unknown[]).map((entry) => migrateRecord(entry))
      : projectsEnvelope.projects,
  });
  // A legacy source without a workspaces file carries no workspace mappings;
  // the pair then behaves exactly like an empty legacy pair and the later
  // verification reports the missing workspace instead of inventing one.
  const workspacesEnvelope: Record<string, unknown> = existsSync(canonicalWorkspacesPath(source))
    ? (migrateRecord(readObject(canonicalWorkspacesPath(source))) as Record<string, unknown>)
    : { version: "rosso.workspaces.v1", workspaces: [] as unknown[] };
  const workspacesValue = WorkspacesSchema.parse({
    ...workspacesEnvelope,
    workspaces: Array.isArray(workspacesEnvelope.workspaces)
      ? (workspacesEnvelope.workspaces as unknown[]).map((entry) => migrateRecord(entry))
      : workspacesEnvelope.workspaces,
  });
  const projects = validateProjects(projectsValue);
  const workspaces = validateWorkspaces(workspacesValue);
  // The complete canonical pair is validated as one pair before anything is
  // published: a legacy workspace referencing a project absent from the
  // migrated projects state fails the migration instead of surviving as a
  // ghost workspace in a claimed success.
  validateRegistrationPair(projects, workspaces);
  return { projects, workspaces };
}

function serializeState(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function emptyCanonicalProjectsBytes(): string {
  return serializeState({ version: "rosso.projects.v1", projects: [] });
}

function emptyCanonicalWorkspacesBytes(): string {
  return serializeState({ version: "rosso.workspaces.v1", workspaces: [] });
}

function copyLegacyHome(source: string, target: string): void {
  if (existsSync(join(source, migrationMarkerName))) {
    throw new Error(`legacy source contains reserved migration marker: ${migrationMarkerName}`);
  }
  // The canonical pair is excluded from the recursive publication entirely:
  // it is migrated, parsed, and validated as one in-memory pair and then
  // published under the held registration owner through the shared durable
  // commit, so no recursive copy or in-place rewrite can ever bypass the
  // canonical-pair admission used by register and attach.
  const excluded = new Set([canonicalProjectsPath(source), canonicalWorkspacesPath(source)]);
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    cpSync(join(source, entry.name), join(target, entry.name), {
      recursive: true,
      dereference: false,
      filter: (path) => !excluded.has(path),
    });
  }
}

export function migrateLegacyHome(
  homeArgument?: string,
  fromHomeArgument?: string,
  io: RegistrationIo = nodeRegistrationIo,
): {
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
  // Reject the reserved registration lock/recovery/tombstone namespace in the
  // legacy source before any target mutation, so the live owner token held by
  // a concurrent or resumed migration can never be overwritten by the copy.
  assertLegacySourceReservedClear(source);
  const sourceManifestDigest = digest(sourceManifest);
  const sourceProjectsDigest = digest(sourceProjects);
  let verifiedProjectId: string | null = null;
  const { marker, markerValue, release } = prepareMigrationTarget(source, target, io);
  try {
    copyLegacyHome(source, target);
    migrateNamespaceFiles(target);
    reconcileLegacyPreferenceReceipts(target);
    reconcileObsoleteMachinePreferences(target);
    // Migrate, parse, and validate the complete canonical pair as one
    // in-memory pair, then publish it under the registration owner already
    // held by this migration through the exact shared durable commit
    // mechanism (projects-rename → config-fsync → workspaces-rename →
    // state-fsync plus byte verification). No second lock is acquired, and a
    // claimed migration success receives the same canonical-pair admission
    // as register and attach.
    const pair = migrateCanonicalPair(source);
    // Record the exact committed bytes in the retained marker before the
    // durable publication: a resumed migration can then prove which
    // canonical state its own interrupted attempt committed and reject any
    // state a register or attach published after the exposure, instead of
    // clearing or replacing it with the fabricated empty previous bytes.
    saveJson(marker, {
      ...markerValue,
      committedProjectsDigest: digestBytes(serializeState(pair.projects)),
      committedWorkspacesDigest: digestBytes(serializeState(pair.workspaces)),
    });
    commitCanonicalPair(
      target,
      pair.projects,
      pair.workspaces,
      emptyCanonicalProjectsBytes(),
      emptyCanonicalWorkspacesBytes(),
      io,
    );
    initializeHome(target);
    const current = loadHome(target);
    // The committed pair is re-checked under the held owner before success.
    validateRegistrationPair(current.projects, current.workspaces);
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
