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
 * O3 also owns the one canonical retained-claim inspection/recovery
 * boundary: the claim path is derived (never trusted) from the exact
 * expected Worktree, the strict frozen schema plus the exact
 * task/attempt/worktree identity are validated, and a retained claim is
 * classified conservatively as exact, absent, a different valid owner, or
 * invalid. Only an exact claim whose recorded owner process is provably
 * absent is ever released, and the release is byte-matched. No caller is
 * allowed to re-derive a weaker identity check beside this boundary.
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

/**
 * The conservative standing of one retained writer claim at its canonical
 * O3 location, classified against one exact expected owner. `exact` means
 * the claim satisfies the strict frozen schema and carries the exact
 * expected task/attempt/worktree identity; `absent` means no claim exists
 * at the canonical path; `different-owner` means a schema-valid claim for
 * the same Worktree but another task/attempt identity occupies the
 * canonical path (proving the expected owner's claim was released and the
 * Worktree re-acquired); `invalid` means the canonical path or identity
 * cannot be trusted — an unreadable, unparsable, schema-violating,
 * worktree-mismatched, or noncanonical recorded path — and no inspection
 * may proceed past it.
 */
export type RetainedWorktreeWriterLeaseStanding =
  | { readonly standing: "exact"; readonly leasePath: string; readonly raw: string; readonly pid: number }
  | { readonly standing: "absent"; readonly leasePath: string }
  | { readonly standing: "different-owner"; readonly leasePath: string }
  | { readonly standing: "invalid"; readonly leasePath: string | undefined; readonly reason: string };

/** The exact expected owner and location evidence one retained-claim inspection binds to. */
export interface RetainedWorktreeWriterLeaseExpectation {
  readonly worktree: string;
  readonly taskId: string;
  readonly attemptId: string;
  /**
   * The claim path a durable reservation recorded, when one exists. It is
   * verified against the canonical path derived from the expected
   * Worktree: a recorded path that is not the exact derived path makes the
   * inspection invalid and is never used for any read or release.
   */
  readonly recordedLeasePath?: string;
}

/**
 * The canonical O3 retained-claim inspection boundary. The claim path is
 * always DERIVED from the exact expected Worktree's Git metadata — never
 * trusted from the recorded evidence — and a recorded path is only VERIFIED
 * against that derived path. The claim must then parse as the strict frozen
 * schema and carry the exact expected task/attempt/worktree identity.
 * Everything else fails closed as `invalid`; nothing here ever deletes,
 * renames, or rewrites a claim.
 */
export function inspectRetainedWorktreeWriterLease(
  expected: RetainedWorktreeWriterLeaseExpectation,
): RetainedWorktreeWriterLeaseStanding {
  let leasePath: string;
  try {
    leasePath = worktreeWriterLeasePath(expected.worktree);
  } catch (error) {
    return {
      standing: "invalid",
      leasePath: undefined,
      reason:
        `the canonical task-run lease path cannot be derived for the expected bound Worktree `
        + `${expected.worktree}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  if (expected.recordedLeasePath !== undefined && expected.recordedLeasePath !== leasePath) {
    return {
      standing: "invalid",
      leasePath,
      reason:
        `the recorded task-run lease path ${expected.recordedLeasePath} is not the exact canonical `
        + `claim path ${leasePath} derived from the expected bound Worktree; the inspection fails closed`,
    };
  }
  let raw: string;
  try {
    raw = readFileSync(leasePath, "utf8");
  } catch (error) {
    if (isMissing(error)) return { standing: "absent", leasePath };
    return {
      standing: "invalid",
      leasePath,
      reason:
        `the retained task-run lease ${leasePath} cannot be read: `
        + `${error instanceof Error ? error.message : String(error)}`,
    };
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return {
      standing: "invalid",
      leasePath,
      reason: `the retained task-run lease ${leasePath} does not carry the exact expected identity bytes`,
    };
  }
  const parsed = WorktreeWriterLeaseSchema.safeParse(value);
  if (!parsed.success) {
    return {
      standing: "invalid",
      leasePath,
      reason: `the retained task-run lease ${leasePath} does not satisfy the frozen task-run lease schema`,
    };
  }
  const record = parsed.data;
  let observedWorktree: string;
  try {
    observedWorktree = realpathSync(record.worktree);
  } catch {
    return {
      standing: "invalid",
      leasePath,
      reason: `the retained task-run lease Worktree cannot be resolved: ${record.worktree}`,
    };
  }
  let expectedWorktree: string;
  try {
    expectedWorktree = realpathSync(expected.worktree);
  } catch {
    return {
      standing: "invalid",
      leasePath,
      reason: `the expected bound Worktree cannot be resolved: ${expected.worktree}`,
    };
  }
  if (observedWorktree !== expectedWorktree) {
    return {
      standing: "invalid",
      leasePath,
      reason: `the retained task-run lease Worktree does not match the expected bound Worktree: ${record.worktree}`,
    };
  }
  if (record.taskId !== expected.taskId || record.attemptId !== expected.attemptId) {
    return { standing: "different-owner", leasePath };
  }
  return { standing: "exact", leasePath, raw, pid: record.pid };
}

/** The conservative outcome of one retained-claim recovery through the exact O3 boundary. */
export type RetainedWorktreeWriterLeaseRecovery =
  | { readonly outcome: "released"; readonly leasePath: string }
  | { readonly outcome: "absent"; readonly leasePath: string; readonly reason: string }
  | { readonly outcome: "different-owner"; readonly leasePath: string; readonly reason: string }
  | { readonly outcome: "refused"; readonly leasePath: string | undefined; readonly reason: string };

/**
 * The canonical O3 retained-claim recovery boundary. Recovery inspects
 * through `inspectRetainedWorktreeWriterLease` and performs a byte-matched
 * release ONLY for an exact claim whose recorded owner process is provably
 * absent. An absent claim is reported absent (never re-acquired); a
 * different valid owner's claim is reported and never touched; every
 * invalid or unproven standing is refused with the exact claim retained.
 */
export function recoverRetainedWorktreeWriterLease(
  expected: RetainedWorktreeWriterLeaseExpectation,
): RetainedWorktreeWriterLeaseRecovery {
  const inspected = inspectRetainedWorktreeWriterLease(expected);
  if (inspected.standing === "absent") {
    return {
      outcome: "absent",
      leasePath: inspected.leasePath,
      reason: `the exact lease ${inspected.leasePath} is already absent; the release already succeeded`,
    };
  }
  if (inspected.standing === "different-owner") {
    return {
      outcome: "different-owner",
      leasePath: inspected.leasePath,
      reason:
        `the retained task-run lease ${inspected.leasePath} belongs to a different valid writer owner `
        + "than the requested task/attempt; recovery never deletes another writer's claim",
    };
  }
  if (inspected.standing === "invalid") {
    return { outcome: "refused", leasePath: inspected.leasePath, reason: inspected.reason };
  }
  if (!isProcessDefinitelyAbsent(inspected.pid)) {
    return {
      outcome: "refused",
      leasePath: inspected.leasePath,
      reason:
        `the retained task-run lease owner process ${inspected.pid} is still alive or cannot be `
        + "proven absent; recovery fails closed",
    };
  }
  try {
    releaseWorktreeWriterLease({ path: inspected.leasePath, content: inspected.raw });
  } catch (error) {
    return {
      outcome: "refused",
      leasePath: inspected.leasePath,
      reason:
        `the exact task-run lease release for ${inspected.leasePath} failed: `
        + `${error instanceof Error ? error.message : String(error)}`,
    };
  }
  return { outcome: "released", leasePath: inspected.leasePath };
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

function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code?: unknown }).code === "ENOENT";
}
