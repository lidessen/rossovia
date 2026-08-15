import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
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
 * Register is the only transition owner of config/projects.json plus
 * state/workspaces.json, so one exclusive lock inside the home serializes the
 * whole read-merge-validate-commit sequence. No second registry, daemon, or
 * authority is introduced: read-only surfaces (project list, resolve, init)
 * keep their existing unlocked reads.
 *
 * The lock is a bounded-liveness file: a writer holds it only for one
 * in-memory transition (milliseconds). A lock whose recorded owner pid is
 * verifiably dead is recovered automatically; a live or unknown owner fails
 * closed after a bounded wait, so contention, a crashed transition, or a
 * malformed lock is always visible — never a silent lost update.
 */

const registrationLockVersion = "rosso.registration-lock.v1";
const registrationLockName = "registration.lock";
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

function removeProbe(path: string): void {
  try {
    rmSync(path, { force: true });
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

function observeContendedLock(lockPath: string): ContendedLockObservation {
  let owner: RegistrationLockOwner | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let raw: string;
    try {
      raw = readFileSync(lockPath, "utf8");
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
  const tombstone = `${lockPath}.stale-${randomUUID()}`;
  try {
    renameSync(lockPath, tombstone);
    removeProbe(tombstone);
  } catch (error: unknown) {
    if (errorCode(error) === "ENOENT") return { recovered: true };
    throw new Error(`cannot recover the stale Rossovia registration lock at ${lockPath}: ${errorMessage(error)}`);
  }
  return { recovered: true };
}

function acquireRegistrationLock(home: string): () => void {
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
      mkdirSync(dirname(lockPath), { recursive: true });
      writeFileSync(lockPath, serializeJson(owner), { encoding: "utf8", flag: "wx" });
      return () => {
        try {
          rmSync(lockPath, { force: true });
        } catch {
          // Preserve the registration outcome; a stale lock is recovered
          // by the next transition once this owner is verifiably dead.
        }
      };
    } catch (error: unknown) {
      if (errorCode(error) !== "EEXIST") {
        throw new Error(
          `cannot acquire the Rossovia registration lock at ${lockPath}: ${errorMessage(error)}. ` +
          "The current runtime must grant write access to this exact state location.",
        );
      }
      const observation = observeContendedLock(lockPath);
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

function writeStaged(path: string, serialized: string): void {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(temporary, serialized, "utf8");
    renameSync(temporary, path);
  } catch (error: unknown) {
    removeProbe(temporary);
    throw error;
  }
}

function commitRegistrationPair(
  home: string,
  projects: Projects,
  workspaces: Workspaces,
  previousProjects: string,
  previousWorkspaces: string,
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
  try {
    mkdirSync(dirname(projectsPath), { recursive: true });
    writeFileSync(projectsStage, projectsSerialized, "utf8");
    mkdirSync(dirname(workspacesPath), { recursive: true });
    writeFileSync(workspacesStage, workspacesSerialized, "utf8");
    renameSync(projectsStage, projectsPath);
    projectsReplaced = true;
    renameSync(workspacesStage, workspacesPath);
  } catch (error: unknown) {
    removeProbe(projectsStage);
    removeProbe(workspacesStage);
    let restoration = "";
    if (projectsReplaced) {
      try {
        writeStaged(projectsPath, previousProjects);
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
    try {
      const observed = readFileSync(path, "utf8");
      if (observed !== serialized) throw new Error("on-disk content differs from the validated pair");
    } catch (error: unknown) {
      let restoration = "";
      try {
        writeStaged(projectsPath, previousProjects);
        writeStaged(workspacesPath, previousWorkspaces);
        restoration = "; the previous pair was restored";
      } catch (rollback: unknown) {
        restoration = `; restoring the previous pair also failed: ${errorMessage(rollback)}`;
      }
      throw new Error(
        `Rossovia registration could not verify the committed pair at ${path}: ${errorMessage(error)}${restoration}. ` +
        "No registration success was claimed.",
      );
    }
  }
}

/**
 * Run one register mutation as a single serialized transition. The fresh
 * home read happens strictly under the lock, so two concurrent transitions
 * merge instead of overwriting one another. The validated pair is committed
 * through staged atomic renames and verified byte-for-byte before the
 * transition returns, and the lock is released on every path.
 */
export function transitionRegistration<T>(
  homeArgument: string | undefined,
  mutate: (current: HomeSources) => T,
): T {
  const home = resolveHome(homeArgument);
  // The canonical uninitialized-home failure stays ahead of any lock or state write.
  loadJson(join(home, "manifest.json"), ManifestSchema);
  const release = acquireRegistrationLock(home);
  try {
    const current = loadHome(home);
    const previousProjects = serializeJson(current.projects);
    const previousWorkspaces = serializeJson(current.workspaces);
    const result = mutate(current);
    validateProjects(current.projects);
    validateWorkspaces(current.workspaces);
    validateRegistrationPair(current.projects, current.workspaces);
    commitRegistrationPair(home, current.projects, current.workspaces, previousProjects, previousWorkspaces);
    return result;
  } finally {
    release();
  }
}
