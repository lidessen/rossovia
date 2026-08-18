import { randomUUID } from "node:crypto";
import {
  closeSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import { ManifestSchema, type Projects, type Workspaces } from "./contracts";
import {
  loadHome,
  loadJson,
  resolveHome,
  validateProjects,
  validateWorkspaces,
  type HomeSources,
} from "./home";

/**
 * The single serialized owner boundary for the canonical registration pair.
 * Register, attach, and migration are the only transition owners of
 * config/projects.json plus state/workspaces.json, so one exclusive lock
 * inside the home serializes the whole read-merge-validate-commit sequence
 * for every one of them. No second registry, daemon, or authority is
 * introduced: read-only surfaces (project list, resolve, init) keep their
 * existing unlocked reads.
 *
 * The lock is a bounded-liveness file: a writer holds it only for one
 * in-memory transition (milliseconds). A lock whose recorded owner pid is
 * verifiably dead is recovered through a sidecar recovery primitive that
 * moves the stale lock only when the path still contains the exact observed
 * dead-owner bytes, and a successful transition releases the lock only when
 * the path still contains its own token — so recovery can never rename or
 * remove a replacement live lock. The recovery primitive itself is strictly
 * transient: it is created O_EXCL and removed only by the exact token owner.
 * A primitive retained by a crashed holder is never auto-removed (a second
 * observer could otherwise delete a replacement live primitive); it fails
 * closed with an explicit reconcile-required error. Release failures are
 * surfaced, so a success is never claimed while ownership cleanup is
 * indeterminate.
 *
 * A claimed success is crash-durable and subset-safe: the canonical
 * projects entry is staged, fsynced, renamed, and its config directory is
 * fsynced before the matching workspace entry is even staged; only then are
 * the workspaces renamed and the state directory fsynced, and the committed
 * bytes are verified before success is reported. A crash therefore never
 * leaves a workspace entry referencing a project whose durable publication
 * is unsynced. Failure paths restore the pair workspaces-before-projects,
 * which keeps the workspace→project invariant true at every intermediate
 * state.
 */

const registrationLockVersion = "rosso.registration-lock.v1";
export const registrationLockName = "registration.lock";
const registrationLockWaitAttempts = 80;
const registrationLockWaitMilliseconds = 25;

const RegistrationLockSchema = z.object({
  version: z.literal(registrationLockVersion),
  pid: z.number().int().positive(),
  owner: z.string().uuid(),
  acquiredAt: z.string().min(1),
}).strict();

interface RegistrationLockOwner {
  version: typeof registrationLockVersion;
  pid: number;
  owner: string;
  acquiredAt: string;
}

/**
 * The injectable filesystem seam for one registration transition. The
 * production default is the synchronous Node filesystem; tests inject a
 * recording implementation to prove operation order (stage, fsync, rename,
 * parent-directory sync) and to simulate verification, rollback, or
 * replacement-owner failures. No production code reads test-only
 * environment variables; every controllable boundary is this seam.
 */
export interface RegistrationIo {
  mkdir(path: string): void;
  writeFile(path: string, data: string): void;
  createFileExclusive(path: string, data: string): void;
  readFile(path: string): string;
  rename(source: string, destination: string): void;
  remove(path: string): void;
  fsyncFile(path: string): void;
  fsyncDirectory(path: string): void;
}

export const nodeRegistrationIo: RegistrationIo = {
  mkdir: (path) => mkdirSync(path, { recursive: true }),
  writeFile: (path, data) => writeFileSync(path, data, "utf8"),
  createFileExclusive: (path, data) => writeFileSync(path, data, { encoding: "utf8", flag: "wx" }),
  readFile: (path) => readFileSync(path, "utf8"),
  rename: (source, destination) => renameSync(source, destination),
  remove: (path) => rmSync(path, { force: true }),
  fsyncFile: (path) => {
    const descriptor = openSync(path, "r+");
    try {
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
  },
  fsyncDirectory: (path) => {
    // Windows offers no directory fsync; the staged-file fsync above still
    // covers the file contents themselves on that platform.
    if (process.platform === "win32") return;
    const descriptor = openSync(path, "r");
    try {
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
  },
};

function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function errorCode(error: unknown): string | undefined {
  if (error === null || typeof error !== "object") return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function removeProbe(path: string, io: RegistrationIo): void {
  try {
    io.remove(path);
  } catch {
    // Preserve the original failure. Stage and tombstone names are unique.
  }
}

function isLiveProcess(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: unknown) {
    // EPERM means the pid exists but is not signalable by this runtime:
    // treat it as live and fail closed rather than recovering someone
    // else's transition. Only ESRCH proves the owner is gone.
    return errorCode(error) !== "ESRCH";
  }
}

interface ContendedLockObservation {
  recovered: boolean;
  pid?: number;
}

/**
 * The recovery serialization primitive: a sidecar exclusive file that
 * serializes stale-lock recovery and lock release. Holders create it with
 * O_EXCL and remove only their own exact token, so two recoverers cannot
 * both move the same path, and a release cannot delete a lock that was
 * replaced after its own observation. The primitive is strictly transient:
 * a live holder is waited for, while a primitive retained by a verifiably
 * dead holder is never auto-removed (a second observer could otherwise
 * delete a replacement live primitive) — it fails closed with an explicit
 * reconcile-required error instead.
 */
function withRecoveryPrimitive(lockPath: string, io: RegistrationIo, fn: () => void): void {
  const recoveryPath = `${lockPath}.recovery`;
  const owner: RegistrationLockOwner = {
    version: registrationLockVersion,
    pid: process.pid,
    owner: randomUUID(),
    acquiredAt: new Date().toISOString(),
  };
  const serialized = serializeJson(owner);
  let acquired = false;
  for (let attempt = 0; attempt < registrationLockWaitAttempts; attempt += 1) {
    try {
      io.mkdir(dirname(recoveryPath));
      io.createFileExclusive(recoveryPath, serialized);
      acquired = true;
      break;
    } catch (error: unknown) {
      if (errorCode(error) !== "EEXIST") {
        throw new Error(
          `cannot serialize the Rossovia registration lock recovery at ${recoveryPath}: ${errorMessage(error)}`,
        );
      }
      let observed: string;
      try {
        observed = io.readFile(recoveryPath);
      } catch (readError: unknown) {
        if (errorCode(readError) === "ENOENT") continue;
        throw new Error(
          `cannot inspect the Rossovia registration recovery primitive at ${recoveryPath}: ${errorMessage(readError)}`,
        );
      }
      let holder: RegistrationLockOwner;
      try {
        holder = RegistrationLockSchema.parse(JSON.parse(observed)) as RegistrationLockOwner;
      } catch {
        // A partially published primitive may belong to a writer mid-write;
        // give that writer a bounded moment before retrying.
        Bun.sleepSync(registrationLockWaitMilliseconds);
        continue;
      }
      if (isLiveProcess(holder.pid)) {
        Bun.sleepSync(registrationLockWaitMilliseconds);
        continue;
      }
      // The holder is verifiably dead and the primitive is crash-retained:
      // fail closed instead of deleting a path this caller does not own.
      throw new Error(
        `registration recovery primitive at ${recoveryPath} is crash-retained (owner pid ${holder.pid} is dead). ` +
        "Reconcile it explicitly by removing that exact file before retrying registration.",
      );
    }
  }
  if (!acquired) {
    throw new Error(
      `cannot serialize the Rossovia registration lock recovery at ${recoveryPath}: ` +
      "another recoverer is in progress",
    );
  }
  try {
    fn();
  } catch (error: unknown) {
    // Preserve the wrapped failure; attempt cleanup but never mask it.
    try {
      if (io.readFile(recoveryPath) === serialized) io.remove(recoveryPath);
    } catch {
      // A retained primitive fails closed for the next holder.
    }
    throw error;
  }
  // Remove only this caller's exact token. A replaced, unreadable, or
  // unremovable primitive is an indeterminate cleanup: surface it instead of
  // claiming a success whose ownership cleanup cannot be confirmed.
  let current: string | undefined;
  let cleanupError: unknown;
  try {
    current = io.readFile(recoveryPath);
  } catch (error: unknown) {
    cleanupError = error;
  }
  if (current !== undefined && current !== serialized) {
    cleanupError = new Error(`the recovery primitive at ${recoveryPath} no longer holds this caller's token`);
  }
  if (current === serialized) {
    try {
      io.remove(recoveryPath);
    } catch (error: unknown) {
      cleanupError = error;
    }
  }
  if (cleanupError !== undefined) {
    throw new Error(
      `cannot release the Rossovia registration recovery primitive at ${recoveryPath}: ${errorMessage(cleanupError)}. ` +
      "Reconcile the retained file explicitly before retrying registration.",
    );
  }
}

/**
 * Remove the stale lock only when the path still contains the exact observed
 * dead-owner bytes, under the recovery primitive. A replacement live lock is
 * never renamed or removed: the observation reports "not removed" and the
 * acquire loop re-observes the replacement instead.
 */
function removeStaleRegistrationLock(lockPath: string, observed: string, io: RegistrationIo): boolean {
  let removed = false;
  withRecoveryPrimitive(lockPath, io, () => {
    let current: string;
    try {
      current = io.readFile(lockPath);
    } catch (error: unknown) {
      if (errorCode(error) === "ENOENT") {
        removed = true;
        return;
      }
      throw new Error(`cannot re-inspect the stale Rossovia registration lock at ${lockPath}: ${errorMessage(error)}`);
    }
    if (current !== observed) return;
    const tombstone = `${lockPath}.stale-${randomUUID()}`;
    try {
      io.rename(lockPath, tombstone);
    } catch (error: unknown) {
      if (errorCode(error) === "ENOENT") {
        removed = true;
        return;
      }
      throw new Error(`cannot recover the stale Rossovia registration lock at ${lockPath}: ${errorMessage(error)}`);
    }
    try {
      if (io.readFile(tombstone) === observed) {
        io.remove(tombstone);
        removed = true;
      } else {
        // Defensive: never delete bytes we did not observe as the dead owner.
        try {
          io.rename(tombstone, lockPath);
        } catch {
          // Leave the tombstone visible for explicit reconciliation.
        }
      }
    } catch {
      // Leave the tombstone visible for explicit reconciliation.
    }
  });
  return removed;
}

function observeContendedLock(lockPath: string, io: RegistrationIo): ContendedLockObservation {
  let owner: RegistrationLockOwner | undefined;
  let raw = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      raw = io.readFile(lockPath);
    } catch (error: unknown) {
      if (errorCode(error) === "ENOENT") return { recovered: true };
      throw new Error(`cannot inspect the Rossovia registration lock at ${lockPath}: ${errorMessage(error)}`);
    }
    try {
      owner = RegistrationLockSchema.parse(JSON.parse(raw)) as RegistrationLockOwner;
      break;
    } catch (error: unknown) {
      if (attempt === 1) {
        throw new Error(
          `registration lock is malformed at ${lockPath}: ${errorMessage(error)}. ` +
          "Remove or repair the lock file explicitly before retrying registration.",
        );
      }
      // The lock may have been observed mid-publication by its writer; give
      // that writer one bounded moment and re-read before failing closed.
      Bun.sleepSync(registrationLockWaitMilliseconds);
    }
  }
  const current = owner!;
  if (isLiveProcess(current.pid)) return { recovered: false, pid: current.pid };
  if (removeStaleRegistrationLock(lockPath, raw, io)) return { recovered: true };
  // The lock was replaced while this observation was pending: never rename
  // or remove a lock we did not observe. Report the replacement so the
  // acquire loop keeps waiting (or recovers it when it is dead).
  try {
    const replacement = RegistrationLockSchema.parse(JSON.parse(io.readFile(lockPath))) as RegistrationLockOwner;
    return { recovered: false, pid: replacement.pid };
  } catch {
    return { recovered: false };
  }
}

/**
 * Release the held lock only when the path still contains this caller's exact
 * token, under the recovery primitive. A lock already gone needs no release;
 * a replaced, unreadable, or unremovable lock is an indeterminate cleanup and
 * the failure is surfaced so a success is never claimed while the ownership
 * state of the lock is unknown.
 */
function releaseRegistrationLock(lockPath: string, owner: RegistrationLockOwner, io: RegistrationIo): void {
  const serialized = serializeJson(owner);
  let cleanupError: unknown;
  withRecoveryPrimitive(lockPath, io, () => {
    let current: string;
    try {
      current = io.readFile(lockPath);
    } catch (error: unknown) {
      if (errorCode(error) === "ENOENT") return; // Already released: nothing to remove.
      cleanupError = new Error(`cannot inspect the lock during release: ${errorMessage(error)}`);
      return;
    }
    if (current !== serialized) {
      cleanupError = new Error(`the lock no longer holds this transition's owner token`);
      return;
    }
    try {
      io.remove(lockPath);
    } catch (error: unknown) {
      cleanupError = new Error(`cannot remove the lock: ${errorMessage(error)}`);
    }
  });
  if (cleanupError !== undefined) {
    throw new Error(
      `Rossovia registration lock release is indeterminate at ${lockPath}: ${errorMessage(cleanupError)}. ` +
      "Reconcile the retained lock files explicitly before retrying registration.",
    );
  }
}

export function acquireRegistrationLock(home: string, io: RegistrationIo = nodeRegistrationIo): () => void {
  const lockPath = join(home, "state", registrationLockName);
  const owner: RegistrationLockOwner = {
    version: registrationLockVersion,
    pid: process.pid,
    owner: randomUUID(),
    acquiredAt: new Date().toISOString(),
  };
  let contendedPid: number | undefined;
  for (let attempt = 0; attempt < registrationLockWaitAttempts; attempt += 1) {
    try {
      io.mkdir(dirname(lockPath));
      io.createFileExclusive(lockPath, serializeJson(owner));
      return () => releaseRegistrationLock(lockPath, owner, io);
    } catch (error: unknown) {
      if (errorCode(error) !== "EEXIST") {
        throw new Error(
          `cannot acquire the Rossovia registration lock at ${lockPath}: ${errorMessage(error)}. ` +
          "The current runtime must grant write access to this exact state location.",
        );
      }
      const observation = observeContendedLock(lockPath, io);
      if (observation.recovered) continue;
      contendedPid = observation.pid;
      Bun.sleepSync(registrationLockWaitMilliseconds);
    }
  }
  throw new Error(
    `another registration is in progress for this Rossovia home (lock owner pid ${contendedPid ?? "unknown"}; ` +
    `${lockPath}). Retry after the current registration completes; a lock whose owner can be confirmed dead is ` +
    "recovered automatically.",
  );
}

/**
 * The pair invariant the transition owns: every workspace mapping must
 * reference a project in the same pair, so a claimed success never leaves one
 * canonical file describing a registration the other file does not know.
 * A project without a workspace mapping remains tolerated by the read-only
 * surfaces (project list marks it unverified), so a crash between the two
 * atomic renames leaves a pair the next transition can still re-read and heal.
 */
export function validateRegistrationPair(projects: Projects, workspaces: Workspaces): void {
  const projectIds = new Set(projects.projects.map((project) => project.id));
  for (const workspace of workspaces.workspaces) {
    if (!projectIds.has(workspace.projectId)) {
      throw new Error(
        `registration pair is inconsistent: workspace ${workspace.path} references project ${workspace.projectId}, ` +
        "which is absent from the canonical projects state; reconcile the Workbench home before retrying",
      );
    }
  }
}

function writeStaged(path: string, serialized: string, io: RegistrationIo): void {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    io.mkdir(dirname(path));
    io.writeFile(temporary, serialized);
    io.fsyncFile(temporary);
    io.rename(temporary, path);
    io.fsyncDirectory(dirname(path));
  } catch (error: unknown) {
    removeProbe(temporary, io);
    throw error;
  }
}

/**
 * Restore the previous pair workspaces-first: with the previous workspaces in
 * place, every workspace still references a project present in the committed
 * projects state (transitions only add projects or rebind workspace paths),
 * so the workspace→project invariant holds even when the projects
 * restoration fails afterwards and that failure is reported instead of a
 * corrupted success.
 */
function restoreRegistrationPair(
  projectsPath: string,
  workspacesPath: string,
  previousProjects: string,
  previousWorkspaces: string,
  io: RegistrationIo,
): string {
  try {
    writeStaged(workspacesPath, previousWorkspaces, io);
  } catch (error: unknown) {
    // Both canonical files keep the validated new bytes: the pair stays
    // consistent and the failure stays visible.
    return `restoring the previous workspaces state also failed: ${errorMessage(error)}`;
  }
  try {
    writeStaged(projectsPath, previousProjects, io);
  } catch (error: unknown) {
    return `restoring the previous projects state also failed: ${errorMessage(error)}`;
  }
  return "; the previous pair was restored";
}

/**
 * Commit the validated pair through staged atomic renames with a durable
 * subset order: the canonical projects entry is staged and fsynced, renamed,
 * and its config directory entry fsynced before the matching workspace entry
 * is even staged; only then is the workspaces stage fsynced, renamed, and the
 * state directory fsynced. A crash at any point therefore never leaves a
 * workspace entry referencing a project whose durable publication is unsynced.
 * The committed bytes are verified before any success is claimed, and every
 * failure path restores the pair workspaces-before-projects, which keeps the
 * workspace→project invariant true at every intermediate state.
 *
 * This is the one durable canonical-pair admission shared by every transition
 * owner. Register and attach call it inside {@link transitionRegistration};
 * migration calls it directly while it already holds the registration owner,
 * so no caller ever acquires a second lock and the same
 * projects-rename → config-fsync → workspaces-rename → state-fsync order
 * admits every claimed success.
 */
export function commitCanonicalPair(
  home: string,
  projects: Projects,
  workspaces: Workspaces,
  previousProjects: string,
  previousWorkspaces: string,
  io: RegistrationIo,
): void {
  const projectsPath = join(home, "config", "projects.json");
  const workspacesPath = join(home, "state", "workspaces.json");
  const projectsSerialized = serializeJson(projects);
  const workspacesSerialized = serializeJson(workspaces);
  const projectsStage = `${projectsPath}.${randomUUID()}.tmp`;
  const workspacesStage = `${workspacesPath}.${randomUUID()}.tmp`;
  let projectsReplaced = false;
  let workspacesReplaced = false;
  try {
    io.mkdir(dirname(projectsPath));
    io.writeFile(projectsStage, projectsSerialized);
    io.fsyncFile(projectsStage);
    io.rename(projectsStage, projectsPath);
    projectsReplaced = true;
    // Publish and durably sync the canonical projects entry before the
    // matching workspace entry can be observed: a crash after this point can
    // only expose projects, never a workspace referencing unsynced projects.
    io.fsyncDirectory(dirname(projectsPath));
    io.mkdir(dirname(workspacesPath));
    io.writeFile(workspacesStage, workspacesSerialized);
    io.fsyncFile(workspacesStage);
    io.rename(workspacesStage, workspacesPath);
    workspacesReplaced = true;
    // Sync the state directory entry so a crash cannot lose the workspaces
    // rename that a reported success depends on.
    io.fsyncDirectory(dirname(workspacesPath));
  } catch (error: unknown) {
    removeProbe(projectsStage, io);
    removeProbe(workspacesStage, io);
    let restoration = "";
    if (workspacesReplaced) {
      restoration = restoreRegistrationPair(projectsPath, workspacesPath, previousProjects, previousWorkspaces, io);
    } else if (projectsReplaced) {
      // Workspaces are still the previous bytes: restore projects only, so
      // the intermediate pair stays consistent.
      try {
        writeStaged(projectsPath, previousProjects, io);
        restoration = "; the previous projects state was restored";
      } catch (rollback: unknown) {
        restoration = `; restoring the previous projects state also failed: ${errorMessage(rollback)}`;
      }
    }
    throw new Error(
      `cannot persist the Rossovia registration pair at ${projectsPath} and ${workspacesPath}: ` +
      `${errorMessage(error)}${restoration}. ` +
      "The current runtime must grant write access to this exact state location.",
    );
  }
  // Still under the lock, verify both surfaces retain the exact committed
  // bytes before any success is claimed.
  for (const [path, serialized] of [[projectsPath, projectsSerialized], [workspacesPath, workspacesSerialized]] as const) {
    let verificationError: unknown;
    let observed = "";
    try {
      observed = io.readFile(path);
    } catch (error: unknown) {
      verificationError = error;
    }
    if (verificationError !== undefined || observed !== serialized) {
      const restoration = restoreRegistrationPair(projectsPath, workspacesPath, previousProjects, previousWorkspaces, io);
      throw new Error(
        `Rossovia registration could not verify the committed pair at ${path}: ` +
        `${verificationError === undefined ? "on-disk content differs from the validated pair" : errorMessage(verificationError)}` +
        `${restoration}. ` +
        "No registration success was claimed.",
      );
    }
  }
}

/**
 * Run one register or attach mutation as a single serialized transition. The
 * fresh home read happens strictly under the lock, so two concurrent
 * transitions merge instead of overwriting one another. The validated pair is
 * committed through staged atomic renames and verified byte-for-byte before
 * the transition returns. The lock release runs on every path, and an
 * indeterminate release (a replaced, unreadable, or crash-retained ownership
 * surface) surfaces as a failure instead of a claimed success.
 */
export function transitionRegistration<T>(
  homeArgument: string | undefined,
  mutate: (current: HomeSources) => T,
  io: RegistrationIo = nodeRegistrationIo,
): T {
  const home = resolveHome(homeArgument);
  // The canonical uninitialized-home failure stays ahead of any lock or state write.
  loadJson(join(home, "manifest.json"), ManifestSchema);
  const release = acquireRegistrationLock(home, io);
  try {
    const current = loadHome(home);
    const previousProjects = serializeJson(current.projects);
    const previousWorkspaces = serializeJson(current.workspaces);
    const result = mutate(current);
    validateProjects(current.projects);
    validateWorkspaces(current.workspaces);
    validateRegistrationPair(current.projects, current.workspaces);
    commitCanonicalPair(home, current.projects, current.workspaces, previousProjects, previousWorkspaces, io);
    return result;
  } finally {
    release();
  }
}
