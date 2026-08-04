import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "bun:test";
import { verifyAgentEraBlogEffect } from "../experiments/agent-era-blog-effect-verifier";
import {
  verifyAgentEraBlogCandidate,
} from "../experiments/verify-agent-era-blog-candidate";
import { FileEffectJournal } from "../src/effect-journal";
import { readGitStatus } from "../src/git-effect-observer";
import { missionRunnerDirectory } from "../src/mission-runner";

const BLOG_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../experiments/agent-era-blog",
);

describe("agent-era Blog candidate verification", () => {
  test("admits only a buildable candidate with revision-bound closed projections", async () => {
    const temporary = await mkdtemp(join(tmpdir(), "rosso-blog-verifier-test-"));
    const candidateRoot = join(temporary, "candidate");
    try {
      await cp(BLOG_ROOT, candidateRoot, {
        recursive: true,
        filter: (source) => {
          const path = relative(BLOG_ROOT, source);
          if (path.length === 0) return true;
          const first = path.split(/[\\/]/u)[0] ?? path;
          return ![".git", ".next", ".wrangler", "dist", "drizzle", "node_modules"].includes(first);
        },
      });
      git(candidateRoot, ["init", "--initial-branch=main"]);
      git(candidateRoot, ["config", "user.name", "Verifier Test"]);
      git(candidateRoot, ["config", "user.email", "verifier@example.test"]);
      git(candidateRoot, ["add", "."]);
      git(candidateRoot, ["-c", "commit.gpgsign=false", "commit", "-m", "baseline"]);

      await writeFile(join(candidateRoot, "db/schema.ts"), VALID_SCHEMA, "utf8");
      await mkdir(join(candidateRoot, "app/blog"), { recursive: true });
      await writeFile(join(candidateRoot, "app/blog/content.ts"), VALID_CONTENT, "utf8");

      const passed = await verifyAgentEraBlogCandidate({
        candidateRoot,
        dependencyRoot: BLOG_ROOT,
      });
      expect(passed.version).toBe("rosso.agent-era-blog-candidate-verification.v2");
      expect(passed.verifierRef).toBe("supervisor:agent-era-blog-content-contract-v2");
      expect(passed.verdict).toBe("passed");
      expect(passed.candidate.changedPaths).toEqual([
        "app/blog/content.ts",
        "db/schema.ts",
      ]);
      expect(passed.checks.every((check) => check.exitCode === 0)).toBeTrue();

      await writeFile(
        join(candidateRoot, "app/blog/content.ts"),
        VALID_CONTENT.replace(
          "sourceRevisionId: revision.revisionId",
          "sourceRevisionId: seededPublishedRevision.revisionId",
        ),
        "utf8",
      );
      const stale = await verifyAgentEraBlogCandidate({
        candidateRoot,
        dependencyRoot: BLOG_ROOT,
      });
      expect(stale.verdict).toBe("failed");
      expect(stale.checks.find((check) => check.id === "content-contract")).toMatchObject({
        exitCode: 1,
      });
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  }, 60_000);

  test("derives the verification target from one settled effect and rejects post-settlement drift", async () => {
    const temporary = await mkdtemp(join(tmpdir(), "rosso-blog-effect-verifier-test-"));
    const primaryRoot = join(temporary, "primary");
    const candidateRoot = join(temporary, "candidate");
    const home = join(temporary, "home");
    const missionId = "principal-workbench-dogfood";
    const effectId = "blog-effect-1";
    try {
      await cp(BLOG_ROOT, primaryRoot, {
        recursive: true,
        filter: (source) => {
          const path = relative(BLOG_ROOT, source);
          if (path.length === 0) return true;
          const first = path.split(/[\\/]/u)[0] ?? path;
          return ![".git", ".next", ".wrangler", "dist", "drizzle", "node_modules"].includes(first);
        },
      });
      git(primaryRoot, ["init", "--initial-branch=main"]);
      git(primaryRoot, ["config", "user.name", "Verifier Test"]);
      git(primaryRoot, ["config", "user.email", "verifier@example.test"]);
      git(primaryRoot, ["add", "."]);
      git(primaryRoot, ["-c", "commit.gpgsign=false", "commit", "-m", "baseline"]);
      await symlink(join(BLOG_ROOT, "node_modules"), join(primaryRoot, "node_modules"), "dir");
      git(primaryRoot, ["worktree", "add", "--detach", candidateRoot, "HEAD"]);

      await writeFile(join(candidateRoot, "db/schema.ts"), VALID_SCHEMA, "utf8");
      await mkdir(join(candidateRoot, "app/blog"), { recursive: true });
      await writeFile(join(candidateRoot, "app/blog/content.ts"), VALID_CONTENT, "utf8");

      const baseHead = gitOutput(candidateRoot, ["rev-parse", "HEAD"]).toString("utf8").trim();
      const status = await readGitStatus(candidateRoot);
      const changedPaths = [...new Set([
        ...status.added,
        ...status.changed,
        ...status.removed,
      ])].sort();
      const patch = buildPatch(candidateRoot, status.added);
      const patchDigest = digest(patch);
      const journalRoot = missionRunnerDirectory(home, missionId);
      const artifactRoot = join(journalRoot, "effect-artifacts", "blog-effect-test");
      const patchPath = join(artifactRoot, `${patchDigest}.patch`);
      const manifestPath = join(artifactRoot, `${patchDigest}.manifest.json`);
      await mkdir(artifactRoot, { recursive: true });
      await writeFile(patchPath, patch);
      const files = await Promise.all(changedPaths.map(async (path) => ({
        path,
        beforeSha256: gitBlobDigest(candidateRoot, baseHead, path),
        afterSha256: digest(await readFile(join(candidateRoot, path))),
      })));
      await writeFile(manifestPath, `${JSON.stringify({
        version: "rosso.isolated-git-effect-evidence.v1",
        effectId,
        missionId,
        turnId: "turn-1",
        cellId: "blog-content-model",
        runId: "run-1",
        root: candidateRoot,
        baseHead,
        baselineDigest: "a".repeat(64),
        writePaths: ["db/schema.ts", "app/blog"],
        allowedCommands: [],
        status,
        outsideScope: [],
        files,
        workCell: {
          status: "passed",
          verificationPassed: true,
          workspaceDiff: {
            added: status.added,
            changed: status.changed,
            removed: status.removed,
          },
        },
        authority: { commit: "withheld", merge: "withheld", publish: "withheld" },
      }, null, 2)}\n`);

      const journal = new FileEffectJournal(journalRoot);
      await journal.prepare(effectId, {
        missionId,
        turnId: "turn-1",
        cellId: "blog-content-model",
        worktree: {
          root: candidateRoot,
          baseHead,
          baselineDigest: "a".repeat(64),
        },
        writePaths: ["db/schema.ts", "app/blog"],
        allowedCommands: [],
        authority: "withheld",
      });
      await journal.start(effectId);
      await journal.observeRun(effectId, "run-1");
      await journal.quiesce(effectId, { reason: "completed", activeToolCalls: [] });
      await journal.settle(effectId, {
        patch: {
          ref: relative(journalRoot, patchPath),
          digest: patchDigest,
        },
        changedPaths,
        outsideScope: { verdict: "clear", paths: [] },
        acceptance: {
          mechanical: {
            verdict: "passed",
            evidenceRefs: [
              "cell-run:run-1",
              `file:${relative(journalRoot, manifestPath)}`,
            ],
          },
          independent: { verdict: "not-run", evidenceRefs: [] },
          principal: { verdict: "withheld", evidenceRefs: [] },
        },
      });

      await writeFile(
        join(candidateRoot, "app/blog/content.ts"),
        `${VALID_CONTENT}\n// post-settlement drift\n`,
        "utf8",
      );
      const drifted = await verifyAgentEraBlogEffect({ home, missionId, effectId });
      expect(drifted).toMatchObject({
        verdict: "unverifiable",
        reason: expect.stringContaining("retained evidence"),
      });
      expect((await journal.activity(effectId))?.independentVerification).toBeUndefined();

      await writeFile(join(candidateRoot, "app/blog/content.ts"), VALID_CONTENT, "utf8");
      const passed = await verifyAgentEraBlogEffect({ home, missionId, effectId });
      expect(passed).toMatchObject({
        verdict: "passed",
        admittedClaim: "content-model-ready-for-next-slice",
        reportRef: expect.stringMatching(/^file:/),
        journalEventId: expect.any(String),
      });
      expect((await journal.activity(effectId))?.independentVerification).toMatchObject({
        verdict: "passed",
        evidenceRefs: expect.arrayContaining([
          "claim:content-model-ready-for-next-slice",
        ]),
      });
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  }, 60_000);
});

function git(root: string, arguments_: readonly string[]): void {
  gitOutput(root, arguments_);
}

function gitOutput(root: string, arguments_: readonly string[], allowed = [0]): Buffer {
  const result = spawnSync("git", ["-C", root, ...arguments_], {
    encoding: null,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error !== undefined) throw result.error;
  if (!allowed.includes(result.status ?? -1)) {
    throw new Error(`git ${arguments_[0]} failed: ${result.stderr.toString("utf8")}`);
  }
  return result.stdout;
}

function buildPatch(root: string, added: readonly string[]): Buffer {
  const parts = [gitOutput(root, [
    "diff",
    "--binary",
    "--no-ext-diff",
    "--no-textconv",
    "--src-prefix=a/",
    "--dst-prefix=b/",
    "HEAD",
    "--",
  ])];
  for (const path of added) {
    parts.push(gitOutput(root, [
      "diff",
      "--no-index",
      "--binary",
      "--no-ext-diff",
      "--no-textconv",
      "--src-prefix=a/",
      "--dst-prefix=b/",
      "--",
      "/dev/null",
      path,
    ], [0, 1]));
  }
  return Buffer.concat(parts);
}

function gitBlobDigest(root: string, head: string, path: string): string | null {
  const result = spawnSync("git", ["-C", root, "show", `${head}:${path}`], {
    encoding: null,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error !== undefined) throw result.error;
  return result.status === 0 ? digest(result.stdout) : null;
}

function digest(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

const VALID_SCHEMA = `
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  author: text("author").notNull(),
});

export const publicationRevisions = sqliteTable("publication_revisions", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => posts.id),
  title: text("title").notNull(),
  thesis: text("thesis").notNull(),
  body: text("body").notNull(),
  publishedAt: integer("published_at", { mode: "timestamp" }).notNull(),
});

export const claims = sqliteTable("claims", {
  id: text("id").primaryKey(),
  revisionId: text("revision_id").notNull().references(() => publicationRevisions.id),
  statement: text("statement").notNull(),
});

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  revisionId: text("revision_id").notNull().references(() => publicationRevisions.id),
  title: text("title").notNull(),
  href: text("href").notNull(),
});

export const claimSources = sqliteTable("claim_sources", {
  claimId: text("claim_id").notNull().references(() => claims.id),
  sourceId: text("source_id").notNull().references(() => sources.id),
}, (table) => [primaryKey({ columns: [table.claimId, table.sourceId] })]);

export const projections = sqliteTable("projections", {
  id: text("id").primaryKey(),
  sourceRevisionId: text("source_revision_id").notNull().references(() => publicationRevisions.id),
  generatorKind: text("generator_kind").notNull(),
  kind: text("kind").notNull(),
  payload: text("payload").notNull(),
});
`;

const VALID_CONTENT = `
export interface PublishedRevision {
  revisionId: string;
  postId: string;
  title: string;
  thesis: string;
  body: string;
  claims: Array<{ id: string; statement: string }>;
  sources: Array<{ id: string; title: string; href: string }>;
  claimSources: Array<{ claimId: string; sourceId: string }>;
}

export interface DerivedStatement {
  id: string;
  text: string;
  claimIds: string[];
  sourceIds: string[];
}

export interface ReadingField {
  sourceRevisionId: string;
  generatorKind: "deterministic";
  brief: DerivedStatement[];
  sourceMap: DerivedStatement[];
}

export const seededPublishedRevision: PublishedRevision = {
  revisionId: "revision-1",
  postId: "post-1",
  title: "Writing with accountable projections",
  thesis: "Derived views should remain answerable to an accepted source.",
  body: "A canonical article and a reading field serve different authorities.",
  claims: [
    { id: "claim-1", statement: "The article remains canonical." },
    { id: "claim-2", statement: "Derived views remain rebuildable." },
  ],
  sources: [
    { id: "source-1", title: "Primary source", href: "https://example.com/primary" },
    { id: "source-2", title: "Supporting source", href: "https://example.com/support" },
  ],
  claimSources: [
    { claimId: "claim-1", sourceId: "source-1" },
    { claimId: "claim-2", sourceId: "source-2" },
  ],
};

export function buildReadingField(revision: PublishedRevision): ReadingField {
  return {
    sourceRevisionId: revision.revisionId,
    generatorKind: "deterministic",
    brief: revision.claims.map((claim, index) => ({
      id: "brief-" + claim.id,
      text: claim.statement,
      claimIds: [claim.id],
      sourceIds: [revision.claimSources[index]!.sourceId],
    })),
    sourceMap: revision.claimSources.map((relation) => ({
      id: "map-" + relation.claimId,
      text: revision.claims.find((claim) => claim.id === relation.claimId)!.statement,
      claimIds: [relation.claimId],
      sourceIds: [relation.sourceId],
    })),
  };
}
`;
