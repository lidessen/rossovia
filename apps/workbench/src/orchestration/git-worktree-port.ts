/**
 * The neutral O3 Git Worktree metadata port (Decision 055).
 *
 * O3's writer-claim location depends on one Git fact — the exact canonical
 * Git metadata directory of a bound Worktree — but Orchestration owns no Git
 * protocol, executable invocation, or path resolution. This port is the
 * entire surface: the declared Integration adapter implements it, and any
 * injected implementation returns one exact absolute directory string for
 * one Worktree path. O3 itself only joins its lease filename inside the
 * returned directory.
 */
export interface GitWorktreeMetadataPort {
  /**
   * The exact canonical Git metadata directory of one Worktree. The
   * implementation owns the discovery protocol, its exit/stderr failure,
   * output trim and the non-empty requirement, the relative/absolute
   * git-dir resolution against the Worktree, and the final realpath
   * normalization.
   */
  canonicalGitDirectory(worktree: string): string;
}
