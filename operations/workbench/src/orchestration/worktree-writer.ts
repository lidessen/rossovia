import { readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { z } from "zod";
import { requiredGit } from "../workspace";

/**
 * O3 — shared-Worktree writer ownership (Decision 055).
 *
 * One canonical Orchestration Runtime owner for the exclusive-writer
 * exclusion of one exact shared Git Worktree: atomic acquire, exact
 * ownership validation, byte-matched release, the canonical Git metadata
 * location, and owner-process absence observation. Ordinary Task runs,
 * conversation carriers, and temporary contribution writers pay this one
 * owner before any effectful shared-Worktree work; no caller gains a second
 * writer authority beside it.
 *
 * The mechanism is an owner-identified exclusive claim, not a heartbeat or
 * TTL lease: there is no expiry, renewal, or time-bounded release. A
 * retained claim keeps blocking other writers until the exact owner
 * releases it or a caller proves the recorded owner process absent before
 * an exact release. O3 owns only the writer exclusion; Run lifecycle,
 * settlement, semantic success, and acceptance stay with their own owners.
 *
 * The durable claim shape is compatibility-frozen: the on-disk filename
 * `rossovia-task-run.lock`, the byte schema version
 * `rosso.task-run-worktree-lease.v1`, every record field, and every
 * observable refusal/release message are retained byte-for-byte from the
 * former Workbench task-run implementation. Nothing here rewrites, renames,
 * or reinterprets existing claims.
 */

/** The durable lease record schema version, retained byte-for-byte. */
export const WORKTREE_WRITER_LEASE_VERSION = "rosso.task-run-worktree-lease.v1" as const;

/** The durable claim filename inside the exact Git metadata directory, retained byte-for-byte. */
export const WORKTREE_WRITER_LEASE_FILENAME = "rossovia-task-run.lock" as const;

export const WorktreeWriterLeaseSchema = z.object({
  version: z.literal(WORKTREE_WRITER_LEASE_VERSION),
  worktree: z.string().min(1),
  taskId: z.string().min(1),
  attemptId: z.string().min(1),
  pid: z.number().int().positive(),
  acquiredAt: z.string().min(1),
});

export type WorktreeWriterLeaseRecord = z.infer<typeof WorktreeWriterLeaseSchema>;

/** The exact owner identity one writer claim records and validates against. */
export interface WorktreeWriterOwnerIdentity {
  readonly taskId: string;
  readonly attemptId: string;
}

/** One acquired writer claim: the exact path and the exact bytes it was created with. */
export interface WorktreeWriterLease {
  readonly path: string;
  readonly content: string;
}

/** One retained claim read and validated against its exact expected owner. */
export interface RetainedWorktreeWriterLease {
  readonly pid: number;
  readonly raw: string;
}

/** The exact resolved Git metadata directory one Worktree writer claim binds to. */
export function canonicalGitDirectory(worktree: string): string {
  const raw = requiredGit(["rev-parse", "--git-dir"], worktree);
  return realpathSync(isAbsolute(raw) ? raw : resolve(worktree, raw));
}

/** The deterministic claim path for one exact Worktree, derived from its Git metadata. */
export function worktreeWriterLeasePath(worktree: string): string {
  return join(canonicalGitDirectory(worktree), WORKTREE_WRITER_LEASE_FILENAME);
}

/**
 * Atomically acquire sole writer ownership of one exact shared Worktree.
 * The claim is created with the no-clobber flag inside the Worktree's
 * canonical Git metadata directory; a second writer is refused with the
 * exact retained message and the first claim is never touched.
 */
export function acquireWorktreeWriterLease(
  worktree: string,
  owner: WorktreeWriterOwnerIdentity,
): WorktreeWriterLease {
  const path = worktreeWriterLeasePath(worktree);
  const content = `${JSON.stringify({
    version: WORKTREE_WRITER_LEASE_VERSION,
    worktree,
    taskId: owner.taskId,
    attemptId: owner.attemptId,
    pid: process.pid,
    acquiredAt: new Date().toISOString(),
  }, null, 2)}\n`;
  try {
    writeFileSync(path, content, { encoding: "utf8", flag: "wx" });
  } catch (error: unknown) {
    if (isAlreadyExists(error)) {
      throw new Error(
        `task Worktree already has an active task-run lease: ${worktree}; lease: ${path}`,
      );
    }
    throw error;
  }
  return { path, content };
}

/**
 * Release only the still-exact claim this caller acquired: the current file
 * bytes must equal the acquired bytes before removal, so one owner can
 * never release a claim whose identity changed underneath it. A changed or
 * missing claim throws and never deletes the other owner's file.
 */
export function releaseWorktreeWriterLease(lease: WorktreeWriterLease): void {
  if (readFileSync(lease.path, "utf8") !== lease.content) {
    throw new Error(`task-run lease ownership changed before release: ${lease.path}`);
  }
  rmSync(lease.path);
}

/**
 * Read one retained writer claim and validate its exact owner identity:
 * the record must parse as the exact durable schema and its task, attempt,
 * and resolved Worktree identity must match the expected exact owner.
 * The observable refusal messages are the compatibility-frozen surface of
 * the former task-run reconcile path.
 */
export function readWorktreeWriterLease(
  leasePath: string,
  expected: {
    readonly taskId: string;
    readonly attemptId: string;
    readonly worktree: string;
  },
): RetainedWorktreeWriterLease {
  let raw: string;
  try {
    raw = readFileSync(leasePath, "utf8");
  } catch {
    throw new Error(`attempt ${expected.attemptId} has no retained task-run lease in the bound Worktree: ${leasePath}`);
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error(
      `the retained task-run lease for attempt ${expected.attemptId} does not carry the exact expected identity bytes: ${leasePath}`,
    );
  }
  const parsed = WorktreeWriterLeaseSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(
      `the retained task-run lease for attempt ${expected.attemptId} does not carry the exact expected identity bytes: ${leasePath}`,
    );
  }
  const lease = parsed.data;
  if (lease.taskId !== expected.taskId) {
    throw new Error(`the retained task-run lease belongs to task ${lease.taskId}, not the requested task ${expected.taskId}`);
  }
  if (lease.attemptId !== expected.attemptId) {
    throw new Error(`the retained task-run lease belongs to attempt ${lease.attemptId}, not the requested attempt ${expected.attemptId}`);
  }
  let observedWorktree: string;
  try {
    observedWorktree = realpathSync(lease.worktree);
  } catch {
    throw new Error(`the retained task-run lease Worktree does not match the task's current bound Worktree: ${lease.worktree}`);
  }
  if (observedWorktree !== expected.worktree) {
    throw new Error(`the retained task-run lease Worktree does not match the task's current bound Worktree: ${lease.worktree}`);
  }
  return { pid: lease.pid, raw };
}

/** One lease owner process is provably absent only when its pid no longer resolves. */
export function isProcessDefinitelyAbsent(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return typeof error === "object" && error !== null && "code" in error
      && (error as { code?: unknown }).code === "ESRCH";
  }
}

function isAlreadyExists(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "EEXIST";
}
