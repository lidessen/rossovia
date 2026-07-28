import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "bun:test";
import {
  verifyAgentEraBlogPublicationBrowserEvidence,
  verifyAgentEraBlogPublicationCandidate,
} from "../experiments/verify-agent-era-blog-publication-candidate";
import {
  verifyAgentEraBlogPublicationEffect,
} from "../experiments/agent-era-blog-publication-effect-verifier";

const DEPENDENCY_ROOT = resolve(dirname(import.meta.dir));

describe("agent-era Blog publication verification", () => {
  test("the effect wrapper fails closed outside the Blog Mission", async () => {
    const result = await verifyAgentEraBlogPublicationEffect({
      home: "/does/not/matter",
      missionId: "another-mission",
      effectId: "effect-1",
    });
    expect(result).toMatchObject({
      verdict: "unverifiable",
      reason: expect.stringContaining(
        "Blog verifier only accepts Mission principal-workbench-dogfood",
      ),
    });
  });

  test("passes the exact publication candidate only with current browser evidence", async () => {
    const temporary = await mkdtemp(join(tmpdir(), "rosso-blog-publication-pass-"));
    const candidateRoot = join(temporary, "candidate");
    const browserEvidencePath = join(temporary, "browser-evidence.json");
    try {
      await createPublicationCandidate(candidateRoot);
      await writeBrowserEvidence(candidateRoot, browserEvidencePath);
      const commandCalls: {
        readonly id: string;
        readonly executable: string;
        readonly arguments: readonly string[];
      }[] = [];

      const result = await verifyAgentEraBlogPublicationCandidate({
        candidateRoot,
        dependencyRoot: DEPENDENCY_ROOT,
        browserEvidencePath,
        commandCheck: (input) => {
          commandCalls.push({
            id: input.id,
            executable: input.executable,
            arguments: input.arguments,
          });
          return {
            id: input.id,
            command: input.command,
            exitCode: 0,
            outputDigest: digest(
              JSON.stringify({
                executable: input.executable,
                arguments: input.arguments,
              }),
            ),
            diagnostic: "",
          };
        },
      });

      expect(result).toMatchObject({
        version: "rosso.agent-era-blog-publication-candidate-verification.v1",
        verifierRef:
          "supervisor:agent-era-blog-publication-roundtrip-contract-v1",
        verdict: "passed",
      });
      expect(result.checks.map((check) => check.id)).toEqual([
        "publication-candidate-scope",
        "build",
        "test",
        "migration",
        "author-reader-contract",
        "browser-inspection",
      ]);
      expect(result.checks.every((check) => check.exitCode === 0)).toBeTrue();
      expect(commandCalls).toEqual([
        { id: "build", executable: "npm", arguments: ["run", "build"] },
        { id: "test", executable: "npm", arguments: ["test"] },
        {
          id: "migration",
          executable: "npm",
          arguments: ["run", "db:generate"],
        },
        {
          id: "author-reader-contract",
          executable: "node",
          arguments: ["--test", "tests/author-reader-flow.test.mjs"],
        },
      ]);

      const unavailable = await verifyAgentEraBlogPublicationCandidate({
        candidateRoot,
        dependencyRoot: DEPENDENCY_ROOT,
        commandCheck: (input) => ({
          id: input.id,
          command: input.command,
          exitCode: 0,
          outputDigest: digest(input.id),
          diagnostic: "",
        }),
      });
      expect(unavailable).toMatchObject({
        verdict: "unverifiable",
        reason: expect.stringContaining("browser evidence is unavailable"),
      });
      expect(
        unavailable.checks.find((check) => check.id === "browser-inspection"),
      ).toMatchObject({
        exitCode: 125,
      });
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  }, 120_000);

  test("keeps stale browser evidence unverifiable", async () => {
    const temporary = await mkdtemp(join(tmpdir(), "rosso-blog-browser-stale-"));
    const candidateRoot = join(temporary, "candidate");
    const browserEvidencePath = join(temporary, "browser-evidence.json");
    try {
      await mkdir(candidateRoot, { recursive: true });
      await writeFile(join(candidateRoot, "subject.txt"), "baseline\n");
      initializeRepository(candidateRoot);
      await writeFile(join(candidateRoot, "subject.txt"), "candidate\n");
      await writeBrowserEvidence(candidateRoot, browserEvidencePath);
      await writeFile(join(candidateRoot, "subject.txt"), "later bytes\n");

      const result = await verifyAgentEraBlogPublicationBrowserEvidence({
        path: browserEvidencePath,
        candidateRoot,
        head: gitText(candidateRoot, ["rev-parse", "HEAD"]),
        changedPaths: ["subject.txt"],
      });

      expect(result).toMatchObject({
        verdict: "unverifiable",
        reason: expect.stringContaining("stale"),
        check: {
          id: "browser-inspection",
          exitCode: 125,
        },
      });
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });

  test("rejects any path outside the exact publication v2 write scope", async () => {
    const temporary = await mkdtemp(join(tmpdir(), "rosso-blog-publication-scope-"));
    const candidateRoot = join(temporary, "candidate");
    try {
      await mkdir(candidateRoot, { recursive: true });
      await writeFile(join(candidateRoot, "README.md"), "baseline\n");
      initializeRepository(candidateRoot);
      await writeFile(join(candidateRoot, "README.md"), "outside scope\n");

      const result = await verifyAgentEraBlogPublicationCandidate({
        candidateRoot,
        dependencyRoot: DEPENDENCY_ROOT,
      });

      expect(result).toMatchObject({
        verdict: "failed",
        checks: [{
          id: "publication-candidate-scope",
          exitCode: 1,
          diagnostic: expect.stringContaining(
            "outside publication v2 write scope: README.md",
          ),
        }],
      });
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });
});

async function createPublicationCandidate(root: string): Promise<void> {
  await mkdir(root, { recursive: true });
  await writeFile(join(root, "baseline.txt"), "baseline\n");
  initializeRepository(root);

  await mkdir(join(root, "db"), { recursive: true });
  await writeFile(join(root, "db/schema.ts"), PUBLICATION_SCHEMA);
  await writeFile(join(root, "db/publications.ts"), PUBLICATION_ADAPTER);
  await mkdir(join(root, "app/blog/[slug]"), { recursive: true });
  await writeFile(join(root, "app/blog/content.ts"), PUBLICATION_CONTENT);
  await writeFile(join(root, "app/blog/[slug]/page.tsx"), READER_PAGE);
  await mkdir(join(root, "app/studio"), { recursive: true });
  await writeFile(join(root, "app/studio/page.tsx"), STUDIO_PAGE);
  await writeFile(join(root, "app/studio/StudioComposer.tsx"), STUDIO_COMPOSER);
  await mkdir(join(root, "app/api/publications"), { recursive: true });
  await writeFile(join(root, "app/api/publications/route.ts"), PUBLICATION_ROUTE);
  await writeFile(join(root, "app/page.tsx"), HOME_PAGE);
  await writeFile(join(root, "app/layout.tsx"), LAYOUT);
  await writeFile(join(root, "app/globals.css"), ".reading-field { display: grid; }\n");
  await mkdir(join(root, "tests"), { recursive: true });
  await writeFile(join(root, "tests/rendered-html.test.mjs"), PASSING_RENDERED_TEST);
  await writeFile(join(root, "tests/author-reader-flow.test.mjs"), PASSING_FLOW_TEST);
  await writeFile(
    join(root, "package.json"),
    `${JSON.stringify({
      scripts: {
        test:
          "npm run build && node --test tests/rendered-html.test.mjs tests/author-reader-flow.test.mjs",
      },
    }, null, 2)}\n`,
  );
  await mkdir(join(root, "drizzle/meta"), { recursive: true });
  await writeFile(
    join(root, "drizzle/0000_seeded_publication.sql"),
    "CREATE TABLE posts (id text PRIMARY KEY);\n",
  );
  await writeFile(
    join(root, "drizzle/meta/_journal.json"),
    `${JSON.stringify({ version: "7", dialect: "sqlite", entries: [] }, null, 2)}\n`,
  );
}

function initializeRepository(root: string): void {
  run(root, "git", ["init", "--initial-branch=main"]);
  run(root, "git", ["config", "user.name", "Verifier Test"]);
  run(root, "git", ["config", "user.email", "verifier@example.test"]);
  run(root, "git", ["add", "."]);
  run(root, "git", ["-c", "commit.gpgsign=false", "commit", "-m", "baseline"]);
}

async function writeBrowserEvidence(
  candidateRoot: string,
  path: string,
): Promise<void> {
  const changedPaths = candidateChangedPaths(candidateRoot);
  const files = await Promise.all(changedPaths.map(async (changedPath) => ({
    path: changedPath,
    sha256: await fileDigest(join(candidateRoot, changedPath)),
  })));
  await writeFile(path, `${JSON.stringify({
    version: "rosso.agent-era-blog-publication-browser-evidence.v1",
    observedAt: "2026-07-28T12:00:00.000Z",
    browser: {
      name: "fixture-browser",
      version: "1",
    },
    subject: {
      gitHead: gitText(candidateRoot, ["rev-parse", "HEAD"]),
      files,
    },
    checks: [
      browserCheck("anonymous-reader-desktop"),
      browserCheck("anonymous-reader-mobile"),
      browserCheck("protected-studio"),
      browserCheck("revision-view-continuity"),
    ],
    verdict: "passed",
  }, null, 2)}\n`);
}

function browserCheck(id: string) {
  return {
    id,
    verdict: "passed",
    evidenceRefs: [`fixture:${id}`],
  };
}

function candidateChangedPaths(root: string): string[] {
  const tracked = gitText(root, ["diff", "--name-only", "HEAD"])
    .split("\n")
    .filter(Boolean);
  const untracked = gitText(root, ["ls-files", "--others", "--exclude-standard"])
    .split("\n")
    .filter(Boolean);
  return [...new Set([...tracked, ...untracked])].sort();
}

async function fileDigest(path: string): Promise<string | null> {
  try {
    return digest(await readFile(path));
  } catch (error) {
    if (
      typeof error === "object"
      && error !== null
      && "code" in error
      && (error as { code?: unknown }).code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

function run(root: string, executable: string, arguments_: readonly string[]): void {
  const result = spawnSync(executable, [...arguments_], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, CI: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${executable} ${arguments_[0] ?? ""} failed:\n${result.stdout ?? ""}\n${result.stderr ?? ""}`,
    );
  }
}

function gitText(root: string, arguments_: readonly string[]): string {
  const result = spawnSync("git", ["-C", root, ...arguments_], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    throw new Error(`git ${arguments_[0]} failed: ${result.stderr ?? ""}`);
  }
  return (result.stdout ?? "").trim();
}

function digest(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

const PUBLICATION_SCHEMA = `
import { integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  author: text("author").notNull(),
}, (table) => [uniqueIndex("posts_author_slug").on(table.author, table.slug)]);
export const publicationRevisions = sqliteTable("publication_revisions", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => posts.id),
  title: text("title").notNull(),
  thesis: text("thesis").notNull(),
  body: text("body").notNull(),
  publishedAt: integer("published_at").notNull(),
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

const PUBLICATION_CONTENT = `
export const seededPublishedRevision = {
  revisionId: "revision-1",
  postId: "post-1",
  title: "Seeded publication",
  thesis: "Canonical writing remains distinct from derived views.",
  body: "One immutable revision supports several source-bound views.",
  claims: [{ id: "claim-1", statement: "The revision is canonical." }],
  sources: [{ id: "source-1", title: "Source", href: "https://example.com/source" }],
  claimSources: [{ claimId: "claim-1", sourceId: "source-1" }],
};
export function buildReadingField(revision) {
  return {
    sourceRevisionId: revision.revisionId,
    generatorKind: "deterministic",
    brief: [],
    sourceMap: [],
  };
}
`;

const PUBLICATION_ADAPTER = `
export async function publishSeededRevision(database: { batch(statements: unknown[]): Promise<unknown> }) {
  await database.batch([]);
  return { revisionUrl: "/blog/seeded?revision=revision-1" };
}
`;

const READER_PAGE = `
export default async function Reader({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ revision?: string }>;
}) {
  const { slug } = await params;
  const { revision } = await searchParams;
  return <main><h1>{slug}</h1><p>{revision}</p></main>;
}
`;

const STUDIO_PAGE = `
import StudioComposer from "./StudioComposer";
export default function Studio() { return <StudioComposer />; }
`;

const STUDIO_COMPOSER = `
"use client";
export default function StudioComposer() {
  return <main><h1>Seeded studio</h1><button type="button">Publish</button></main>;
}
`;

const PUBLICATION_ROUTE = `
export async function POST() {
  return Response.json({ revisionUrl: "/blog/seeded?revision=revision-1" });
}
`;

const HOME_PAGE = `
export default function Home() {
  return <main className="reading-field"><h1>Reading Field</h1></main>;
}
`;

const LAYOUT = `
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Reading Field",
  description: "Canonical writing with source-bound derived views.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
`;

const PASSING_RENDERED_TEST = `
import test from "node:test";
import assert from "node:assert/strict";
test("rendered contract", () => assert.equal("Reading Field", "Reading Field"));
`;

const PASSING_FLOW_TEST = `
import test from "node:test";
import assert from "node:assert/strict";
test("author-reader contract", () => {
  assert.equal("/blog/seeded?revision=revision-1".includes("revision="), true);
});
`;
