import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import {
  createGitWorktreeMetadataPort,
  gitRevParseGitDirectory,
  type GitRevParseInvocation,
  type GitRevParseInvocationOutcome,
} from "../src/integrations/git-worktree";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function git(cwd: string, ...arguments_: string[]): string {
  const result = Bun.spawnSync(["git", ...arguments_], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}

interface Fixture {
  root: string;
  primary: string;
  worktree: string;
}

function fixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "rossovia-git-worktree-integration-"));
  temporaryRoots.push(root);
  const primary = join(root, "project");
  const worktree = join(root, "worktree");
  mkdirSync(primary, { recursive: true });
  git(primary, "init", "-b", "main");
  git(primary, "config", "user.name", "Git Worktree Integration Test");
  git(primary, "config", "user.email", "git-worktree@example.test");
  writeFileSync(join(primary, "README.md"), "# integration fixture\n");
  git(primary, "add", "README.md");
  git(primary, "commit", "-m", "initial");
  git(primary, "worktree", "add", "-b", "task/integration", worktree);
  return { root, primary, worktree };
}

/** One fixed outcome supplied through the adapter's exact call-bound invocation seam. */
function invoked(outcome: GitRevParseInvocationOutcome): GitRevParseInvocation {
  return () => outcome;
}

describe("GitWorktreeMetadataPort integration adapter", () => {
  test("resolves the primary Worktree's relative git-dir output to its exact canonical metadata directory", () => {
    const current = fixture();
    const primaryGitDir = realpathSync(join(current.primary, ".git"));
    // A primary Worktree prints the relative `.git`; the adapter resolves it
    // against the Worktree and normalizes it through realpath.
    expect(git(current.primary, "rev-parse", "--git-dir")).toBe(".git");
    expect(gitRevParseGitDirectory(current.primary)).toBe(primaryGitDir);
    expect(createGitWorktreeMetadataPort().canonicalGitDirectory(current.primary))
      .toBe(primaryGitDir);
  });

  test("resolves a linked Worktree's absolute git-dir output to its distinct canonical metadata directory", () => {
    const current = fixture();
    const primaryGitDir = realpathSync(join(current.primary, ".git"));
    const linkedGitDir = realpathSync(
      join(primaryGitDir, "worktrees", basename(current.worktree)),
    );
    // A linked Worktree prints an absolute git-dir; the adapter still
    // normalizes it through realpath and never confuses the two Worktrees.
    expect(git(current.worktree, "rev-parse", "--git-dir").startsWith("/")).toBeTrue();
    expect(gitRevParseGitDirectory(current.worktree)).toBe(linkedGitDir);
    // Discriminating: the primary and the linked Worktree never share one
    // metadata directory, so their writer claims are distinct.
    expect(gitRevParseGitDirectory(current.worktree))
      .not.toBe(gitRevParseGitDirectory(current.primary));
  });

  test("normalizes a symlinked Worktree path through realpath to the exact target metadata directory", () => {
    const current = fixture();
    const primaryGitDir = realpathSync(join(current.primary, ".git"));
    const alias = join(current.root, "primary-alias");
    symlinkSync(current.primary, alias);
    try {
      // Without realpath, resolving `.git` against the alias would yield the
      // symlinked path; the adapter returns the exact resolved target.
      expect(gitRevParseGitDirectory(alias)).toBe(primaryGitDir);
    } finally {
      rmSync(alias);
    }
  });

  test("refuses a non-repository directory with the Git stderr failure", () => {
    const current = fixture();
    const plain = join(current.root, "plain-directory");
    mkdirSync(plain);
    expect(existsSync(join(plain, ".git"))).toBeFalse();
    expect(() => gitRevParseGitDirectory(plain)).toThrow(/not a git repository/);
  });

  test("deterministically discriminates exit/stderr refusal and trim/non-empty refusal through the exact invocation seam", () => {
    const worktree = "/fake/subject";

    // Non-zero exit: the adapter surfaces the exact trimmed stderr bytes.
    expect(() => gitRevParseGitDirectory(worktree, invoked({
      status: 1,
      stdout: "",
      stderr: "  custom git failure\n",
    }))).toThrow("custom git failure");

    // Non-zero exit without stderr: the generic refusal names the exact protocol.
    expect(() => gitRevParseGitDirectory(worktree, invoked({
      status: 128,
      stdout: "",
      stderr: "",
    }))).toThrow(`git -C ${worktree} rev-parse --git-dir failed`);

    // A spawn failure without a status is refused like a non-zero exit.
    expect(() => gitRevParseGitDirectory(worktree, invoked({
      status: null,
      error: new Error("spawn git ENOENT"),
      stdout: "",
      stderr: "",
    }))).toThrow("spawn git ENOENT");

    // Exit zero with blank output: trim/non-empty refuses instead of
    // returning an unusable empty directory.
    expect(() => gitRevParseGitDirectory(worktree, invoked({
      status: 0,
      stdout: "  \n\t",
      stderr: "",
    }))).toThrow("produced no Git metadata directory");

    // Exit zero with a non-empty git-dir output resolves through the same
    // exact policy (resolution against the Worktree plus realpath), without
    // any process or PATH interception.
    const root = mkdtempSync(join(tmpdir(), "rossovia-git-worktree-invoked-"));
    temporaryRoots.push(root);
    const subject = join(root, "subject");
    const gitDir = join(subject, ".git");
    mkdirSync(gitDir, { recursive: true });
    expect(gitRevParseGitDirectory(subject, invoked({
      status: 0,
      stdout: ".git\n",
      stderr: "",
    }))).toBe(realpathSync(gitDir));
  });

  test("refuses a signal-terminated invocation with partial non-empty stdout instead of accepting it as a valid git-dir", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-git-worktree-signal-"));
    temporaryRoots.push(root);
    const subject = join(root, "subject");
    const gitDir = join(subject, ".git");
    mkdirSync(gitDir, { recursive: true });

    // A signal-terminated git process has status null and no spawn error,
    // but can leave partial non-empty stdout behind. A null status is never
    // an implicit exit zero: the adapter must refuse with truthful signal
    // detail before the partial output could resolve. The real `.git`
    // directory exists, so accepting the partial stdout would have returned
    // the exact resolved path instead of rejecting it.
    expect(() => gitRevParseGitDirectory(subject, invoked({
      status: null,
      signal: "SIGTERM",
      stdout: ".git\n",
      stderr: "",
    }))).toThrow(/terminated by signal SIGTERM/);
  });
});
