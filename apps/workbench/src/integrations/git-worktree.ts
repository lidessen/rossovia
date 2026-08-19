import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type { GitWorktreeMetadataPort } from "../orchestration/git-worktree-port";

/**
 * One raw `git -C <worktree> rev-parse --git-dir` invocation outcome,
 * exactly as the declared concrete adapter derives it from `spawnSync`.
 * The adapter owns the protocol's exit/signal/stderr refusal, output trim
 * and the non-empty requirement, path resolution, and realpath
 * normalization; exposing this raw outcome as an explicit call-bound
 * invocation seam lets a caller or test supply one exact outcome so those
 * policy branches are deterministically discriminated without intercepting
 * PATH.
 */
export interface GitRevParseInvocationOutcome {
  /**
   * The process exit status. It is non-null only when the process exited
   * normally; null covers both a signal-terminated process and a spawn
   * failure. A null status is never an implicit exit zero: a
   * signal-terminated git process can leave partial non-empty stdout
   * behind, and that partial output must never be accepted as a Git
   * metadata directory.
   */
  readonly status: number | null;
  /** The terminating signal when the process was killed by one. */
  readonly signal?: NodeJS.Signals | null;
  /** The spawn failure when the process could not be started. */
  readonly error?: Error;
  readonly stdout: string;
  readonly stderr: string;
}

/** One exact raw protocol invocation; the default is the declared spawnSync. */
export type GitRevParseInvocation = (worktree: string) => GitRevParseInvocationOutcome;

/** The declared concrete invocation: the exact protocol argv through spawnSync. */
export function gitRevParseInvocation(worktree: string): GitRevParseInvocationOutcome {
  const result = spawnSync("git", ["-C", worktree, "rev-parse", "--git-dir"], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return {
    status: result.status ?? null,
    ...(result.error == null ? {} : { error: result.error }),
    ...(result.signal == null ? {} : { signal: result.signal }),
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

/**
 * The declared concrete Git Integration adapter for O3 Worktree metadata
 * discovery (Decision 055, Stage 4). This module alone owns the
 * `git -C <worktree> rev-parse --git-dir` protocol: the exact argv, the
 * process exit/signal/stderr refusal, output trim and the non-empty
 * requirement, the relative/absolute git-dir resolution against the
 * Worktree, and the final realpath normalization. Orchestration consumes
 * the neutral `GitWorktreeMetadataPort`; it never constructs this
 * invocation itself. The raw invocation is an explicit call-bound seam:
 * production always uses the declared `spawnSync` invocation, and only an
 * explicit argument may substitute one exact outcome for this call.
 */
export function gitRevParseGitDirectory(
  worktree: string,
  invoke: GitRevParseInvocation = gitRevParseInvocation,
): string {
  const result = invoke(worktree);
  // Every non-zero status AND every null status is a failure, regardless of
  // error or stdout: a null status never means exit zero. A
  // signal-terminated git process can leave partial non-empty stdout
  // behind, and that partial output must never be accepted as a Git
  // metadata directory.
  if (result.status == null || result.status !== 0) {
    const detail =
      result.stderr.trim()
      || (result.signal
        ? `git -C ${worktree} rev-parse --git-dir terminated by signal ${result.signal}`
        : "")
      || result.error?.message
      || "";
    throw new Error(detail || `git -C ${worktree} rev-parse --git-dir failed`);
  }
  const raw = result.stdout.trim();
  if (raw === "") {
    throw new Error(`git -C ${worktree} rev-parse --git-dir produced no Git metadata directory`);
  }
  // A primary Worktree prints the relative `.git`; a linked Worktree prints
  // an absolute git-dir under the primary's `.git/worktrees/<name>`. Both
  // resolve against the Worktree and are normalized through realpath.
  return realpathSync(isAbsolute(raw) ? raw : resolve(worktree, raw));
}

/** One fresh concrete Git adapter instance implementing the neutral O3 metadata port. */
export function createGitWorktreeMetadataPort(): GitWorktreeMetadataPort {
  return { canonicalGitDirectory: gitRevParseGitDirectory };
}
