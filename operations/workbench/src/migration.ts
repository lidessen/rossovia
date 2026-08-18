import { createHash, randomUUID } from "node:crypto";
import {
  cpSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import {
  PreferenceReceiptSchema,
  PreferencesSchema,
  ProjectsSchema,
  WorkspacesSchema,
  type Projects,
  type Workspaces,
} from "./contracts";
import { initializeHome, loadHome, validateProjects, validateWorkspaces, workspaceFor } from "./home";
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

function ioErrorCode(error: unknown): string | undefined {
  if (error === null || typeof error !== "object") return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
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
 * The reserved registration and marker namespaces the migration must never
 * import from a legacy source: the live registration lock, its recovery
 * primitive, and any reserved descendant, tombstone, or stage under the same
 * names, plus the exact migration marker name and every marker-stage
 * descendant or tombstone form. Copying any of these could replace the
 * target's live owner boundary or publish a foreign transaction marker
 * mid-transition, so both namespaces are rejected before the target is
 * mutated at all, and the live owner token in the target is provably left
 * untouched.
 */
function assertLegacySourceReservedClear(source: string): void {
  const reserved = (name: string): boolean =>
    name === registrationLockName
    || name.startsWith(`${registrationLockName}.`)
    || name === migrationMarkerName
    || name.startsWith(`${migrationMarkerName}.`);
  const reservedLabel = (name: string): string =>
    name === registrationLockName || name.startsWith(`${registrationLockName}.`)
      ? "registration lock"
      : "migration marker";
  const pending = [source];
  while (pending.length > 0) {
    const current = pending.pop()!;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (reserved(entry.name)) {
        throw new Error(
          `legacy source contains a reserved Rossovia ${reservedLabel(entry.name)} path: ${join(current, entry.name)}. ` +
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

/**
 * The reserved stage namespace for migration marker publications. Every
 * marker payload is written to a unique stage name inside this one
 * transaction-identifiable namespace, so a publication terminated after the
 * stage write and fsync but before the marker rename leaves a recognizable
 * artifact: the complete stage bytes themselves carry the strict sourceHome
 * and targetHome of the transaction that wrote them. The exact marker name
 * and every name below this namespace are reserved everywhere — the legacy
 * source rejects them before any target mutation, and the target recognizes
 * them before the generic nonempty-target refusal.
 */
const migrationMarkerStagePrefix = `${migrationMarkerName}.stage-`;

function isMigrationMarkerStageName(name: string): boolean {
  return name.startsWith(migrationMarkerStagePrefix);
}

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

/**
 * Under the held registration owner, verify and remove only the exact
 * admitted marker-stage snapshot. Every stage currently present in the
 * reserved namespace must still hold the admitted name and exact bytes; a
 * stage that was added or replaced after the admission is never touched and
 * fails closed, so no read-then-delete can ever remove a replacement
 * owner's stage. Missing admitted stages are already gone and need no
 * removal. This runs inside the ordinary target clearing and inside the
 * completion cleanup — never as a standalone recovery.
 */
function removeAdmittedMigrationStages(
  target: string,
  admittedStages: ReadonlyMap<string, string>,
  io: RegistrationIo,
): void {
  // Verify the complete exact stage namespace before removing anything, so a
  // failure leaves every stage and all other target content untouched.
  const present = readdirSync(target).filter(isMigrationMarkerStageName);
  for (const name of present) {
    const path = join(target, name);
    const admittedBytes = admittedStages.get(name);
    if (admittedBytes === undefined) {
      throw new Error(
        `a migration marker stage appeared at ${path} after this transaction admitted the target. ` +
        "It is never deleted or replaced automatically; reconcile the target explicitly before retrying migration.",
      );
    }
    if (io.readFile(path) !== admittedBytes) {
      throw new Error(
        `the migration marker stage at ${path} was replaced since this transaction admitted the target. ` +
        "It is never deleted or replaced automatically; reconcile the target explicitly before retrying migration.",
      );
    }
  }
  // The verified stages belong to this exact transaction; remove them while
  // the owner is held.
  for (const name of present) io.remove(join(target, name));
}

function clearMigrationTarget(
  target: string,
  admittedStages: ReadonlyMap<string, string>,
  io: RegistrationIo,
): void {
  // Runs only under the held registration owner. The admitted marker stages
  // are verified and removed first; a stage added or replaced since the
  // admission fails the whole clear untouched — never a read-then-delete.
  removeAdmittedMigrationStages(target, admittedStages, io);
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    if (entry.name === migrationMarkerName || isMigrationMarkerStageName(entry.name)) continue;
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

/**
 * True when the directory holds only the reserved registration lock
 * namespace (the live lock plus any descendant or tombstone form). Right
 * after the owner acquisition this is exactly what the target's state/
 * contains before the first admission, so it is the only tolerated
 * pre-admission content in the marker-absent path.
 */
function isOnlyLockNamespaceDirectory(path: string): boolean {
  try {
    const entries = readdirSync(path, { withFileTypes: true });
    return entries.every((entry) =>
      entry.name === registrationLockName || entry.name.startsWith(`${registrationLockName}.`));
  } catch (error: unknown) {
    throw new Error(
      `cannot inspect the Rossovia target directory at ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
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
 * the interrupted target is cleared or re-committed. The only states the
 * migration's own interrupted attempt can have left are admitted: no
 * canonical admission yet, the empty pair a concurrent initialization
 * published during the exposure, the projects-only subset of the recorded
 * durable commit (a crash between the two renames), the recorded committed
 * projects with byte-exact canonical empty workspaces (a crash between the
 * two renames followed by an unlocked no-clobber init), or the exact
 * recorded committed pair. The initial phase admits only the first two and
 * is then cleared; the digest phase admits all of them and keeps the
 * digest-bearing marker byte-exact while the identical digest marker is
 * re-published before the canonical commit. Anything else proves a register
 * or attach succeeded after the exposure — the migration fails closed
 * instead of clearing or replacing that successful registration with the
 * fabricated empty previous bytes of its durable commit.
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
  // A crash between the two durable renames plus an unlocked no-clobber
  // initialization can leave this migration's own committed projects with
  // byte-exact canonical empty workspaces: the init preserved the already
  // durable projects and published only the missing empty workspaces. Under
  // the retained matching marker that subset is still owned by this
  // migration's recorded commit, so it is admitted and re-committed; every
  // nonempty or otherwise mismatched workspace remains a later-registration
  // conflict and fails closed below.
  if (marker.committedProjectsDigest !== undefined
    && digest(projectsPath) === marker.committedProjectsDigest
    && workspacesBytes === emptyCanonicalWorkspacesBytes()) return;
  if (marker.committedProjectsDigest === undefined || marker.committedWorkspacesDigest === undefined) {
    // A non-empty pair without recorded committed bytes can only have been
    // published by a registration after the exposure.
    throw registrationExposedError(target);
  }
  if (digest(projectsPath) === marker.committedProjectsDigest
    && digest(workspacesPath) === marker.committedWorkspacesDigest) return;
  throw registrationExposedError(target);
}

/**
 * Publish one load-bearing migration marker publication durably through the
 * injected registration I/O seam: the complete payload is written to a
 * unique same-directory stage, the stage file is fsynced, the marker path
 * is re-verified against the exact expected generation (absent for the
 * initial admission), the stage is atomically renamed onto the marker path,
 * and the marker's parent directory entry is fsynced before the call
 * returns. Every caller holds the one registration owner, so the expected
 * generation can only have been changed by a foreign writer; a marker that
 * appeared, changed, or regressed fails closed and is never renamed over.
 * The digest marker recording the committed canonical-pair bytes must be
 * durable before the canonical projects rename can become observable:
 * otherwise a power loss could retain the durably synced canonical pair
 * while losing or reverting the digest marker, and a resumed migration
 * would misclassify its own committed pair as a later successful
 * registration and refuse to complete the retryable transaction. The
 * initial admission and the digest phase change both go through this one
 * helper; unrelated JSON writes keep their existing non-durable
 * publication path. Each stage lives in the reserved migration marker stage
 * namespace (migrationMarkerStagePrefix), so a publication terminated after
 * the stage write and fsync but before the rename leaves an artifact the
 * resumed transaction can attribute by the strict sourceHome and targetHome
 * recorded in its complete bytes. Returns the exact serialized bytes
 * published so the caller can re-verify the generation before advancing or
 * completing the transaction.
 */
function publishMigrationMarker(
  marker: string,
  value: unknown,
  io: RegistrationIo,
  expectedCurrent: string | undefined,
): string {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  const stage = `${marker}.stage-${randomUUID()}`;
  let noClobberError: Error | undefined;
  try {
    io.mkdir(dirname(marker));
    io.writeFile(stage, serialized);
    io.fsyncFile(stage);
    // The no-clobber phase guard immediately before the rename: the marker
    // path must still hold exactly the expected generation. The initial
    // admission expects absence; a phase change expects the exact admitted
    // bytes. Anything else fails closed without renaming over another
    // publisher's marker.
    let current: string | undefined;
    try {
      current = io.readFile(marker);
    } catch (error: unknown) {
      if (ioErrorCode(error) !== "ENOENT") throw error;
    }
    if (current !== expectedCurrent) {
      noClobberError = new Error(
        expectedCurrent === undefined
          ? `the migration marker appeared at ${marker} while this transaction was admitting the target; another publisher owns it. ` +
          "Reconcile the target explicitly before retrying migration."
          : `the migration marker at ${marker} changed or regressed since this transaction admitted it. ` +
          "Reconcile the target explicitly before retrying migration.",
      );
      throw noClobberError;
    }
    io.rename(stage, marker);
    io.fsyncDirectory(dirname(marker));
    return serialized;
  } catch (error: unknown) {
    try {
      io.remove(stage);
    } catch {
      // Preserve the publication failure. The stage name is unique and the
      // marker path was never written directly.
    }
    if (error === noClobberError) throw error;
    throw new Error(
      `cannot persist Rossovia state at ${marker}: ${error instanceof Error ? error.message : String(error)}. `
      + "The current runtime must grant write access to this exact state location.",
    );
  }
}

function prepareMigrationTarget(
  source: string,
  target: string,
  io: RegistrationIo,
): {
  marker: string;
  markerValue: { version: string; sourceHome: string; targetHome: string };
  admittedStages: ReadonlyMap<string, string>;
  admittedMarkerBytes: string;
  release: () => void;
} {
  const marker = join(target, migrationMarkerName);
  const markerValue = {
    version: "rosso.namespace-migration.v1",
    sourceHome: source,
    targetHome: target,
  };
  // The one registration owner is acquired before any marker stage,
  // admission, phase change, or publication: no publisher can remain live
  // outside the owner, so a delayed caller can never overwrite a later
  // durable digest marker with its digest-less initial marker or recreate a
  // marker after another migration completed and reported success. The lock
  // acquisition itself creates state/ under the target, so the target is
  // exposed only while the owner is already held.
  const release = acquireRegistrationLock(target, io);
  try {
    // The full exact marker and marker-stage namespace is re-enumerated and
    // strictly parsed under the held owner — there is no pre-lock
    // observation left to go stale.
    const entries = readdirSync(target);
    const admittedStages = new Map<string, string>();
    let matchingStages = 0;
    for (const name of entries.filter(isMigrationMarkerStageName).sort()) {
      const stagePath = join(target, name);
      let bytes: string;
      let retained: { sourceHome: string; targetHome: string };
      try {
        bytes = io.readFile(stagePath);
        retained = MigrationMarkerSchema.parse(JSON.parse(bytes));
      } catch (error: unknown) {
        throw new Error(
          `rossovia workbench target contains a malformed or incomplete migration marker stage at ${stagePath}: ` +
          `${error instanceof Error ? error.message : String(error)}. Reconcile it explicitly before retrying migration; ` +
          "a stage that cannot be proven to belong to this exact transaction is never deleted or replaced automatically.",
        );
      }
      if (retained.sourceHome !== source || retained.targetHome !== target) {
        throw new Error(
          `rossovia workbench target contains an unrelated migration transaction stage at ${stagePath}. ` +
          "Reconcile it explicitly before retrying migration; a stage that cannot be proven to belong to this exact " +
          "transaction is never deleted or replaced automatically.",
        );
      }
      matchingStages += 1;
      admittedStages.set(name, bytes);
    }
    if (matchingStages > 1) {
      throw new Error(
        `rossovia workbench target contains multiple migration marker stages: ${target}. ` +
        "Reconcile them explicitly before retrying migration; ambiguous stages are never deleted or replaced automatically.",
      );
    }
    if (entries.includes(migrationMarkerName)) {
      let admittedMarkerBytes: string;
      try {
        admittedMarkerBytes = io.readFile(marker);
      } catch (error: unknown) {
        throw new Error(
          `cannot read the migration marker at ${marker}: ${error instanceof Error ? error.message : String(error)}. ` +
          "Reconcile the target explicitly before retrying migration.",
        );
      }
      const retained = MigrationMarkerSchema.parse(JSON.parse(admittedMarkerBytes));
      if (retained.sourceHome !== source || retained.targetHome !== target) {
        throw new Error(`rossovia workbench target contains an unrelated migration transaction: ${target}`);
      }
      // The authoritative decision is made on the exact canonical state
      // under the held owner, immediately before any clear or commit.
      verifyTargetCanonicalPairBeforeClear(target, retained);
      if (retained.committedProjectsDigest !== undefined || retained.committedWorkspacesDigest !== undefined) {
        // Digest phase: the recorded commit belongs to this transaction and
        // the canonical state was just verified as its own. The
        // digest-bearing marker is kept byte-exact — it can never regress to
        // the initial phase — and the main flow re-publishes the identical
        // digest marker before the canonical commit.
        return { marker, markerValue, admittedStages, admittedMarkerBytes, release };
      }
      // Initial phase: the marker bears no recorded commit. Re-read the
      // exact current marker generation immediately before the clear and
      // require the exact admitted bytes; a changed transaction or regressed
      // phase fails closed with nothing cleared or replaced.
      let currentMarker: string;
      try {
        currentMarker = io.readFile(marker);
      } catch (error: unknown) {
        throw new Error(
          `cannot re-verify the migration marker at ${marker} immediately before the target clear: ` +
          `${error instanceof Error ? error.message : String(error)}`,
        );
      }
      if (currentMarker !== admittedMarkerBytes) {
        throw new Error(
          `the migration marker at ${marker} changed while this transaction was admitting the target; ` +
          "nothing was cleared or replaced. Reconcile the target explicitly before retrying migration.",
        );
      }
      clearMigrationTarget(target, admittedStages, io);
      // The clear preserves the retained initial-phase marker itself, so the
      // phase is unchanged and no re-publication is needed.
      return { marker, markerValue, admittedStages, admittedMarkerBytes, release };
    }
    // No marker: a publication terminated before its rename can only have
    // left stages (verified above as this exact transaction). Any other
    // content is a completed or foreign home and must not be admitted over.
    if (existsSync(join(target, "manifest.json"))) {
      throw new Error(`rossovia workbench target home already exists: ${target}`);
    }
    if (existsSync(canonicalProjectsPath(target)) || existsSync(canonicalWorkspacesPath(target))) {
      throw new Error(
        `the rossovia target received canonical registration state while the migration prepared it: ${target}. ` +
        "Reconcile the target explicitly before retrying migration, so no successful registration is silently replaced.",
      );
    }
    for (const name of entries) {
      if (name === migrationMarkerName || isMigrationMarkerStageName(name)) continue;
      if (name !== "state" || !isOnlyLockNamespaceDirectory(join(target, name))) {
        throw new Error(`rossovia workbench target home already exists: ${target}`);
      }
    }
    // Fresh initial admission under the held owner. The publication is
    // no-clobber, so a marker that appeared since the enumeration fails
    // closed instead of being overwritten.
    const admittedMarkerBytes = publishMigrationMarker(marker, markerValue, io, undefined);
    return { marker, markerValue, admittedStages, admittedMarkerBytes, release };
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
  const { marker, markerValue, admittedStages, admittedMarkerBytes, release } = prepareMigrationTarget(source, target, io);
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
    // Re-read the exact current marker generation immediately before the
    // canonical commit and fail closed on any changed transaction or
    // regressed phase: the marker must still hold the exact bytes this
    // migration admitted — its own initial marker, or the recorded digest
    // marker of the same transaction.
    let currentMarker: string;
    try {
      currentMarker = io.readFile(marker);
    } catch (error: unknown) {
      throw new Error(
        `cannot re-verify the migration marker at ${marker} before the canonical commit: ` +
        `${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (currentMarker !== admittedMarkerBytes) {
      throw new Error(
        `the migration marker at ${marker} changed or regressed since this transaction admitted it; ` +
        "no canonical state was replaced. Reconcile the target explicitly before retrying migration.",
      );
    }
    // Record the exact committed bytes in the retained marker through the
    // durable marker publication before the durable canonical pair commit:
    // the digest marker is fully written, fsynced, renamed (no-clobber
    // against the exact admitted generation), and its home directory entry
    // fsynced before any canonical projects rename becomes observable, so a
    // resumed migration can always prove which canonical state its own
    // interrupted attempt committed and reject any state a register or
    // attach published after the exposure, instead of clearing or replacing
    // it with the fabricated empty previous bytes.
    const digestMarkerBytes = publishMigrationMarker(marker, {
      ...markerValue,
      committedProjectsDigest: digestBytes(serializeState(pair.projects)),
      committedWorkspacesDigest: digestBytes(serializeState(pair.workspaces)),
    }, io, currentMarker);
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
    // Completion under the held registration owner: the exact admitted stage
    // snapshot is verified and removed first (a stage added or replaced
    // since the admission fails closed untouched), then the completion
    // marker is re-read and removed only while it still holds this
    // transaction's published digest bytes. A changed marker is never
    // removed on behalf of another transaction.
    removeAdmittedMigrationStages(target, admittedStages, io);
    let finalMarker: string;
    try {
      finalMarker = io.readFile(marker);
    } catch (error: unknown) {
      throw new Error(
        `cannot re-verify the migration marker at ${marker} before completion: ` +
        `${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (finalMarker !== digestMarkerBytes) {
      throw new Error(
        `the migration marker at ${marker} changed since this transaction's canonical commit; ` +
        "it is never removed on behalf of another transaction. Reconcile the target explicitly before retrying migration.",
      );
    }
    io.remove(marker);
  } catch (error: unknown) {
    try {
      clearMigrationTarget(target, admittedStages, io);
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
