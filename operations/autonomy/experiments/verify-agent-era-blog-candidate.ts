#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  mkdtemp,
  realpath,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  join,
  relative,
  resolve,
} from "node:path";

export const BLOG_CANDIDATE_VERIFICATION_VERSION =
  "rosso.agent-era-blog-candidate-verification.v2" as const;

const REQUIRED_CHANGED_PATHS = [
  "db/schema.ts",
  "app/blog/content.ts",
] as const;

export interface BlogCandidateVerificationOptions {
  readonly candidateRoot: string;
  readonly dependencyRoot: string;
}

export interface BlogCandidateVerificationCheck {
  readonly id: string;
  readonly command: string;
  readonly exitCode: number;
  readonly outputDigest: string;
  readonly diagnostic: string;
}

export interface BlogCandidateVerificationReport {
  readonly version: typeof BLOG_CANDIDATE_VERIFICATION_VERSION;
  readonly verifierRef: "supervisor:agent-era-blog-content-contract-v2";
  readonly verdict: "passed" | "failed";
  readonly candidate: {
    readonly root: string;
    readonly head: string;
    readonly changedPaths: readonly string[];
  };
  readonly checks: readonly BlogCandidateVerificationCheck[];
}

export async function verifyAgentEraBlogCandidate(
  options: BlogCandidateVerificationOptions,
): Promise<BlogCandidateVerificationReport> {
  const candidateRoot = await canonicalDirectory(options.candidateRoot, "candidate root");
  const dependencyRoot = await canonicalDirectory(options.dependencyRoot, "dependency root");
  await canonicalDirectory(join(dependencyRoot, "node_modules"), "dependency node_modules");

  const head = gitText(candidateRoot, ["rev-parse", "HEAD"]);
  const changedPaths = candidateChangedPaths(candidateRoot);
  const scope = verifyCandidateScope(changedPaths);
  const scratch = await mkdtemp(join(tmpdir(), "rosso-blog-verification-"));
  const snapshot = join(scratch, "candidate");

  try {
    await cp(candidateRoot, snapshot, {
      recursive: true,
      filter: (source) => {
        const path = relative(candidateRoot, source);
        if (path.length === 0) return true;
        const first = path.split(/[\\/]/u)[0] ?? path;
        return ![".git", ".next", ".wrangler", "dist", "drizzle", "node_modules"].includes(first);
      },
    });
    await symlink(join(dependencyRoot, "node_modules"), join(snapshot, "node_modules"), "dir");
    await writeFile(
      join(snapshot, ".rosso-blog-contract-probe.mjs"),
      BLOG_CONTRACT_PROBE,
      "utf8",
    );

    const checks = [
      scope,
      runCheck(
        "build",
        "npm run build (temporary candidate snapshot)",
        "npm",
        ["run", "build"],
        snapshot,
      ),
      runCheck(
        "migration",
        "npm run db:generate (temporary candidate snapshot)",
        "npm",
        ["run", "db:generate"],
        snapshot,
      ),
      runCheck(
        "content-contract",
        "bun .rosso-blog-contract-probe.mjs (temporary candidate snapshot)",
        "bun",
        [".rosso-blog-contract-probe.mjs"],
        snapshot,
      ),
    ];

    return {
      version: BLOG_CANDIDATE_VERIFICATION_VERSION,
      verifierRef: "supervisor:agent-era-blog-content-contract-v2",
      verdict: checks.every((check) => check.exitCode === 0) ? "passed" : "failed",
      candidate: { root: candidateRoot, head, changedPaths },
      checks,
    };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

function verifyCandidateScope(
  changedPaths: readonly string[],
): BlogCandidateVerificationCheck {
  const missing = REQUIRED_CHANGED_PATHS.filter((path) => !changedPaths.includes(path));
  const outside = changedPaths.filter(
    (path) => path !== "db/schema.ts" && !path.startsWith("app/blog/"),
  );
  const diagnostic = [
    ...(missing.length === 0 ? [] : [`missing required changes: ${missing.join(", ")}`]),
    ...(outside.length === 0 ? [] : [`outside declared scope: ${outside.join(", ")}`]),
  ].join("; ");
  return {
    id: "candidate-scope",
    command: "git changed-path scope (candidate worktree)",
    exitCode: diagnostic.length === 0 ? 0 : 1,
    outputDigest: sha256(JSON.stringify({ changedPaths, missing, outside })),
    diagnostic,
  };
}

function runCheck(
  id: string,
  command: string,
  executable: string,
  arguments_: readonly string[],
  cwd: string,
): BlogCandidateVerificationCheck {
  const result = spawnSync(executable, [...arguments_], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, CI: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const error = result.error === undefined ? "" : String(result.error);
  const exitCode = result.status ?? (result.error === undefined ? 1 : 126);
  return {
    id,
    command,
    exitCode,
    outputDigest: sha256(`${output}\n${error}`),
    diagnostic: exitCode === 0 ? "" : tail(`${output}\n${error}`, 4_000),
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

function gitText(root: string, arguments_: readonly string[]): string {
  const result = spawnSync("git", ["-C", root, ...arguments_], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `git ${arguments_[0] ?? "command"} failed: ${(result.stderr ?? "").trim()}`,
    );
  }
  return (result.stdout ?? "").trim();
}

async function canonicalDirectory(path: string, label: string): Promise<string> {
  const resolved = await realpath(resolve(path));
  if (!(await stat(resolved)).isDirectory()) throw new Error(`${label} must be a directory`);
  return resolved;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function tail(value: string, limit: number): string {
  const normalized = value.trim();
  return normalized.length <= limit ? normalized : normalized.slice(-limit);
}

const BLOG_CONTRACT_PROBE = String.raw`
import assert from "node:assert/strict";
import { getTableColumns, getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import * as schema from "./db/schema.ts";
import {
  buildReadingField,
  seededPublishedRevision,
} from "./app/blog/content.ts";

const requiredColumns = {
  posts: ["id", "slug", "author"],
  publicationRevisions: ["id", "postId", "title", "thesis", "body", "publishedAt"],
  claims: ["id", "revisionId", "statement"],
  sources: ["id", "revisionId", "title", "href"],
  claimSources: ["claimId", "sourceId"],
  projections: ["id", "sourceRevisionId", "generatorKind", "kind", "payload"],
};

for (const [name, columns] of Object.entries(requiredColumns)) {
  const table = schema[name];
  assert.ok(table, "missing Drizzle table export " + name);
  const observed = getTableColumns(table);
  for (const column of columns) {
    assert.ok(column in observed, name + " is missing column " + column);
  }
}

function referencedTables(table) {
  return getTableConfig(table).foreignKeys.map((foreignKey) =>
    getTableName(foreignKey.reference().foreignTable)
  );
}

function requireReference(source, target) {
  const targetName = getTableName(schema[target]);
  assert.ok(
    referencedTables(schema[source]).includes(targetName),
    source + " must reference " + target,
  );
}

requireReference("publicationRevisions", "posts");
requireReference("claims", "publicationRevisions");
requireReference("sources", "publicationRevisions");
requireReference("claimSources", "claims");
requireReference("claimSources", "sources");
requireReference("projections", "publicationRevisions");

const projectionTableName = getTableName(schema.projections);
for (const canonical of ["posts", "publicationRevisions", "claims", "sources", "claimSources"]) {
  assert.ok(
    !referencedTables(schema[canonical]).includes(projectionTableName),
    canonical + " must not depend on projections",
  );
}

assert.equal(typeof buildReadingField, "function");
const seed = structuredClone(seededPublishedRevision);
assert.equal(typeof seed.revisionId, "string");
assert.ok(seed.revisionId.length > 0);
assert.equal(typeof seed.postId, "string");
assert.ok(seed.postId.length > 0);
for (const field of ["title", "thesis", "body"]) {
  assert.equal(typeof seed[field], "string");
  assert.ok(seed[field].length > 0, field + " must not be empty");
}
assert.ok(Array.isArray(seed.claims) && seed.claims.length >= 2);
assert.ok(Array.isArray(seed.sources) && seed.sources.length >= 2);
assert.ok(Array.isArray(seed.claimSources) && seed.claimSources.length >= 1);

const claimIds = new Set(seed.claims.map((claim) => {
  assert.equal(typeof claim.id, "string");
  assert.ok(claim.id.length > 0);
  assert.equal(typeof claim.statement, "string");
  assert.ok(claim.statement.length > 0);
  return claim.id;
}));
const sourceIds = new Set(seed.sources.map((source) => {
  assert.equal(typeof source.id, "string");
  assert.ok(source.id.length > 0);
  assert.equal(typeof source.title, "string");
  assert.ok(source.title.length > 0);
  assert.equal(typeof source.href, "string");
  assert.ok(URL.canParse(source.href), "source href must be an absolute URL");
  return source.id;
}));
assert.equal(claimIds.size, seed.claims.length, "claim ids must be unique");
assert.equal(sourceIds.size, seed.sources.length, "source ids must be unique");

const relations = new Set(seed.claimSources.map((relation) => {
  assert.ok(claimIds.has(relation.claimId), "claimSources has an unknown claim");
  assert.ok(sourceIds.has(relation.sourceId), "claimSources has an unknown source");
  return relation.claimId + "\u0000" + relation.sourceId;
}));

function verifyReadingField(field, revision) {
  assert.equal(field.sourceRevisionId, revision.revisionId);
  assert.equal(field.generatorKind, "deterministic");
  for (const view of ["brief", "sourceMap"]) {
    assert.ok(Array.isArray(field[view]) && field[view].length > 0, view + " must not be empty");
    for (const statement of field[view]) {
      assert.equal(typeof statement.id, "string");
      assert.ok(statement.id.length > 0);
      assert.equal(typeof statement.text, "string");
      assert.ok(statement.text.length > 0);
      assert.ok(Array.isArray(statement.claimIds) && statement.claimIds.length > 0);
      assert.ok(Array.isArray(statement.sourceIds) && statement.sourceIds.length > 0);
      for (const claimId of statement.claimIds) {
        assert.ok(claimIds.has(claimId), view + " has an unknown claim reference");
        assert.ok(
          statement.sourceIds.some((sourceId) => relations.has(claimId + "\u0000" + sourceId)),
          view + " claim reference lacks a cited linked source",
        );
      }
      for (const sourceId of statement.sourceIds) {
        assert.ok(sourceIds.has(sourceId), view + " has an unknown source reference");
        assert.ok(
          statement.claimIds.some((claimId) => relations.has(claimId + "\u0000" + sourceId)),
          view + " source reference lacks a linked claim",
        );
      }
    }
  }
}

const sourceBefore = JSON.stringify(seed);
const first = buildReadingField(seed);
const second = buildReadingField(structuredClone(seed));
assert.deepEqual(first, second, "projection must be deterministic");
assert.equal(JSON.stringify(seed), sourceBefore, "projection must not mutate its input");
verifyReadingField(first, seed);

const mutated = buildReadingField(structuredClone(seed));
mutated.brief[0].text = "mutated verifier copy";
assert.notEqual(
  buildReadingField(structuredClone(seed)).brief[0].text,
  "mutated verifier copy",
  "projection calls must not share mutable output",
);

const later = structuredClone(seed);
later.revisionId = seed.revisionId + "-later";
const laterField = buildReadingField(later);
assert.equal(laterField.sourceRevisionId, later.revisionId);
assert.notEqual(laterField.sourceRevisionId, first.sourceRevisionId);
verifyReadingField(laterField, later);

console.log("agent-era-blog-content-contract: passed");
`;
