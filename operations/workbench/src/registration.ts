import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
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
 * remove a replacement live lock. A live or unknown owner fails closed after
 * a bounded wait, so contention, a crashed transition, or a malformed lock is
 * always visible — never a silent lost update.
 *
 * A claimed success is crash-durable: both canonical files are staged,
 * fsynced, renamed atomically, and their parent directory entries are synced
 * before the committed bytes are verified and success is reported. Failure
 * paths restore the pair workspaces-before-projects, which keeps the
 * workspace→project invariant true at every intermediate state.
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
 * parent-directory sync) and to simulate verification or rollback failures.
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

const registrationTestHookDirectory = process.env.ROSSO_REGISTRATION_TEST_HOOK_DIR;

/**
 * Test-only barrier instrumentation: when ROSSO_REGISTRATION_TEST_HOOK_DIR is
 * set, a transition that has just observed a verifiably dead lock publishes a
 * unique ready marker and waits (bounded) for the matching go marker before
 * touching the lock path. This lets a regression hold two recoverers at the
 * same observation point. Unset in production, this is a no-op.
 */
function registrationTestHook(phase: string): void {
  const directory = registrationTestHookDirectory;
  if (!directory) return;
  const ready = join(directory, `ready-${phase}-${randomUUID()}`);
  const proceed = join(directory, `go-${phase}`);
  try {
    mkdirSync(directory, { recursive: true });
    writeFileSync(ready, "", "utf8");
  } catch {
    return;
  }
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (existsSync(proceed)) return;
    Bun.sleepSync(registrationLockWaitMilliseconds);
  }
}

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
 * O_EXCL and remove only their own token, so two recoverers cannot both move
 * the same path, and a release cannot delete a lock that was replaced after
 * its own observation. A verifiably dead holder's primitive is removed only
 * when its exact observed bytes are still present.
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
      // The holder is verifiably dead: remove only the exact observed bytes.
      try {
        if (io.readFile(recoveryPath) === observed) {
          io.remove(recoveryPath);
          continue;
        }
      } catch (readError: unknown) {
        if (errorCode(readError) === "ENOENT") continue;
        throw new Error(
          `cannot re-inspect the Rossovia registration recovery primitive at ${recoveryPath}: ${errorMessage(readError)}`,
        );
      }
      Bun.sleepSync(registrationLockWaitMilliseconds);
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
  } finally {
    try {
      if (io.readFile(recoveryPath) === serialized) io.remove(recoveryPath);
    } catch {
      // Preserve the wrapped outcome; a stale primitive is recovered by the
      // next holder once this owner is verifiably dead.
    }
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
  registrationTestHook("stale-recovery");
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

function releaseRegistrationLock(lockPath: string, owner: RegistrationLockOwner, io: RegistrationIo): void {
  try {
    withRecoveryPrimitive(lockPath, io, () => {
      try {
        // Release only when the path still contains this caller's token: a
        // lock recovered or replaced after our observation is never removed.
        if (io.readFile(lockPath) === serializeJson(owner)) io.remove(lockPath);
      } catch {
        // The lock is already gone or unreadable: nothing to release.
      }
    });
  } catch {
    // Preserve the registration outcome; a stale lock is recovered by the
    // next transition once this owner is verifiably dead.
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
 * Commit the validated pair through staged atomic renames. Both stages are
 * written and fsynced before the first rename, both canonical parent
 * directories are fsynced after the renames, and the committed bytes are
 * verified under the lock before any success is claimed. Every failure path
 * restores the pair workspaces-before-projects, which keeps the
 * workspace→project invariant true at every intermediate state.
 */
function commitRegistrationPair(
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
  // Stage both canonical files before the first atomic rename, so any staging
  // write failure leaves the committed pair untouched.
  const projectsStage = `${projectsPath}.${randomUUID()}.tmp`;
  const workspacesStage = `${workspacesPath}.${randomUUID()}.tmp`;
  let projectsReplaced = false;
  let workspacesReplaced = false;
  try {
    io.mkdir(dirname(projectsPath));
    io.writeFile(projectsStage, projectsSerialized);
    io.fsyncFile(projectsStage);
    io.mkdir(dirname(workspacesPath));
    io.writeFile(workspacesStage, workspacesSerialized);
    io.fsyncFile(workspacesStage);
    io.rename(projectsStage, projectsPath);
    projectsReplaced = true;
    io.rename(workspacesStage, workspacesPath);
    workspacesReplaced = true;
    // Sync the parent directory entries so a crash cannot lose the renames
    // that a reported success depends on.
    io.fsyncDirectory(dirname(projectsPath));
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
 * the transition returns, and the lock is released on every path.
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
    commitRegistrationPair(home, current.projects, current.workspaces, previousProjects, previousWorkspaces, io);
    return result;
  } finally {
    release();
  }
}
