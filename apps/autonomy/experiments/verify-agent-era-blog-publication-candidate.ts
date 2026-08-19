#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cp,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  join,
  relative,
  resolve,
} from "node:path";
import { z } from "zod";
import type {
  AgentEraBlogCandidateVerification,
} from "./agent-era-blog-effect-verifier";

export const BLOG_PUBLICATION_CANDIDATE_VERIFICATION_VERSION =
  "rosso.agent-era-blog-publication-candidate-verification.v1" as const;

const REQUIRED_CHANGED_PATHS = [
  "db/schema.ts",
  "db/publications.ts",
  "app/blog/content.ts",
  "app/blog/[slug]/page.tsx",
  "app/studio/page.tsx",
  "app/studio/StudioComposer.tsx",
  "app/api/publications/route.ts",
  "app/page.tsx",
  "app/layout.tsx",
  "app/globals.css",
  "drizzle/0000_seeded_publication.sql",
  "drizzle/meta/_journal.json",
  "tests/rendered-html.test.mjs",
  "tests/author-reader-flow.test.mjs",
  "package.json",
] as const;

const WRITE_SCOPES = [
  "DESIGN.md",
  "db/schema.ts",
  "db/publications.ts",
  "app/blog",
  "app/studio",
  "app/api/publications",
  "app/page.tsx",
  "app/layout.tsx",
  "app/globals.css",
  "drizzle",
  "tests/rendered-html.test.mjs",
  "tests/author-reader-flow.test.mjs",
  "package.json",
] as const;

const DigestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const BrowserCheckIdSchema = z.enum([
  "anonymous-reader-desktop",
  "anonymous-reader-mobile",
  "protected-studio",
  "revision-view-continuity",
]);

const BrowserEvidenceSchema = z.object({
  version: z.literal("rosso.agent-era-blog-publication-browser-evidence.v1"),
  observedAt: z.string().datetime({ offset: true }),
  browser: z.object({
    name: z.string().min(1),
    version: z.string().min(1),
  }).strict(),
  subject: z.object({
    gitHead: z.string().regex(/^[a-f0-9]{40,64}$/),
    files: z.array(z.object({
      path: z.string().min(1),
      sha256: DigestSchema.nullable(),
    }).strict()).min(1),
  }).strict(),
  checks: z.array(z.object({
    id: BrowserCheckIdSchema,
    verdict: z.literal("passed"),
    evidenceRefs: z.array(z.string().min(1)).min(1),
  }).strict()).length(BrowserCheckIdSchema.options.length),
  verdict: z.literal("passed"),
}).strict().superRefine((value, context) => {
  const ids = value.checks.map((check) => check.id);
  if (new Set(ids).size !== BrowserCheckIdSchema.options.length) {
    context.addIssue({
      code: "custom",
      path: ["checks"],
      message: "browser evidence must contain each required check exactly once",
    });
  }
});

export interface BlogPublicationCandidateVerificationOptions {
  readonly candidateRoot: string;
  readonly dependencyRoot: string;
  readonly browserEvidencePath?: string;
}

export interface BlogPublicationCandidateVerification
  extends AgentEraBlogCandidateVerification {
  readonly version: typeof BLOG_PUBLICATION_CANDIDATE_VERIFICATION_VERSION;
  readonly verifierRef:
    "supervisor:agent-era-blog-publication-roundtrip-contract-v1";
}

export async function verifyAgentEraBlogPublicationCandidate(
  options: BlogPublicationCandidateVerificationOptions,
): Promise<BlogPublicationCandidateVerification> {
  const candidateRoot = await canonicalDirectory(options.candidateRoot, "candidate root");
  const dependencyRoot = await canonicalDirectory(options.dependencyRoot, "dependency root");
  await canonicalDirectory(join(dependencyRoot, "node_modules"), "dependency node_modules");

  const head = gitText(candidateRoot, ["rev-parse", "HEAD"]);
  const changedPaths = candidateChangedPaths(candidateRoot);
  const candidate = { root: candidateRoot, head, changedPaths };
  const scope = verifyCandidateScope(changedPaths);
  if (scope.exitCode !== 0) {
    return report("failed", candidate, [scope]);
  }

  const scratch = await mkdtemp(join(tmpdir(), "rosso-blog-publication-verification-"));
  const snapshot = join(scratch, "candidate");
  try {
    await cp(candidateRoot, snapshot, {
      recursive: true,
      filter: (source) => {
        const path = relative(candidateRoot, source);
        if (path.length === 0) return true;
        const first = path.split(/[\\/]/u)[0] ?? path;
        return ![".git", ".next", ".wrangler", "dist", "node_modules"].includes(first);
      },
    });
    await symlink(join(dependencyRoot, "node_modules"), join(snapshot, "node_modules"), "dir");

    const checks = [
      scope,
      runCheck(
        "build",
        "npm run build (temporary publication candidate snapshot)",
        "npm",
        ["run", "build"],
        snapshot,
      ),
      runCheck(
        "test",
        "npm test (temporary publication candidate snapshot)",
        "npm",
        ["test"],
        snapshot,
      ),
      runCheck(
        "migration",
        "npm run db:generate (temporary publication candidate snapshot)",
        "npm",
        ["run", "db:generate"],
        snapshot,
      ),
      runCheck(
        "author-reader-contract",
        "node --test tests/author-reader-flow.test.mjs (temporary publication candidate snapshot)",
        "node",
        ["--test", "tests/author-reader-flow.test.mjs"],
        snapshot,
      ),
    ];
    if (checks.some((check) => check.exitCode !== 0)) {
      return report("failed", candidate, checks);
    }

    const browser = await verifyAgentEraBlogPublicationBrowserEvidence({
      candidateRoot,
      head,
      changedPaths,
      ...(options.browserEvidencePath === undefined
        ? {}
        : { path: options.browserEvidencePath }),
    });
    const allChecks = [...checks, browser.check];
    if (browser.verdict === "unverifiable") {
      return report("unverifiable", candidate, allChecks, browser.reason);
    }
    return report("passed", candidate, allChecks);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

function report(
  verdict: "passed" | "failed" | "unverifiable",
  candidate: BlogPublicationCandidateVerification["candidate"],
  checks: BlogPublicationCandidateVerification["checks"],
  reason?: string,
): BlogPublicationCandidateVerification {
  return {
    version: BLOG_PUBLICATION_CANDIDATE_VERIFICATION_VERSION,
    verifierRef: "supervisor:agent-era-blog-publication-roundtrip-contract-v1",
    verdict,
    ...(reason === undefined ? {} : { reason }),
    candidate,
    checks,
  };
}

function verifyCandidateScope(
  changedPaths: readonly string[],
): AgentEraBlogCandidateVerification["checks"][number] {
  const missing = REQUIRED_CHANGED_PATHS.filter((path) => !changedPaths.includes(path));
  const outside = changedPaths.filter(
    (path) => !WRITE_SCOPES.some((scope) => path === scope || path.startsWith(`${scope}/`)),
  );
  const diagnostic = [
    ...(missing.length === 0 ? [] : [`missing required changes: ${missing.join(", ")}`]),
    ...(outside.length === 0 ? [] : [`outside publication v2 write scope: ${outside.join(", ")}`]),
  ].join("; ");
  return {
    id: "publication-candidate-scope",
    command: "git changed-path scope (publication candidate worktree)",
    exitCode: diagnostic.length === 0 ? 0 : 1,
    outputDigest: sha256(JSON.stringify({ changedPaths, missing, outside })),
    diagnostic,
  };
}

export async function verifyAgentEraBlogPublicationBrowserEvidence(input: {
  readonly path?: string;
  readonly candidateRoot: string;
  readonly head: string;
  readonly changedPaths: readonly string[];
}): Promise<{
  readonly verdict: "passed" | "unverifiable";
  readonly reason?: string;
  readonly check: AgentEraBlogCandidateVerification["checks"][number];
}> {
  if (input.path === undefined) {
    const reason =
      "browser evidence is unavailable; publication readiness remains unverified";
    return {
      verdict: "unverifiable",
      reason,
      check: unavailableBrowserCheck(reason),
    };
  }

  let source: Buffer;
  try {
    source = await readFile(resolve(input.path));
  } catch (error) {
    const reason = `browser evidence is unavailable: ${
      error instanceof Error ? error.message : String(error)
    }`;
    return {
      verdict: "unverifiable",
      reason,
      check: unavailableBrowserCheck(reason),
    };
  }

  try {
    const evidence = BrowserEvidenceSchema.parse(JSON.parse(source.toString("utf8")));
    const currentFiles = await Promise.all(input.changedPaths.map(async (path) => ({
      path,
      sha256: await worktreeFileDigest(input.candidateRoot, path),
    })));
    if (
      evidence.subject.gitHead !== input.head
      || !sameFiles(evidence.subject.files, currentFiles)
    ) {
      throw new Error("browser evidence subject is stale for the current candidate bytes");
    }
    return {
      verdict: "passed",
      check: {
        id: "browser-inspection",
        command:
          "independent browser inspection at desktop and mobile viewports with protected-studio and exact-revision continuity probes",
        exitCode: 0,
        outputDigest: sha256(source),
        diagnostic: "",
      },
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      verdict: "unverifiable",
      reason,
      check: unavailableBrowserCheck(reason, sha256(source)),
    };
  }
}

function unavailableBrowserCheck(
  reason: string,
  outputDigest = sha256(reason),
): AgentEraBlogCandidateVerification["checks"][number] {
  return {
    id: "browser-inspection",
    command:
      "independent browser inspection at desktop and mobile viewports with protected-studio and exact-revision continuity probes",
    exitCode: 125,
    outputDigest,
    diagnostic: reason,
  };
}

function runCheck(
  id: string,
  command: string,
  executable: string,
  arguments_: readonly string[],
  cwd: string,
): AgentEraBlogCandidateVerification["checks"][number] {
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

async function worktreeFileDigest(
  root: string,
  path: string,
): Promise<string | null> {
  try {
    return sha256(await readFile(join(root, path)));
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

async function canonicalDirectory(path: string, label: string): Promise<string> {
  const resolved = await realpath(resolve(path));
  if (!(await stat(resolved)).isDirectory()) {
    throw new Error(`${label} must be a directory`);
  }
  return resolved;
}

function sameFiles(
  left: readonly { readonly path: string; readonly sha256: string | null }[],
  right: readonly { readonly path: string; readonly sha256: string | null }[],
): boolean {
  const normalize = (
    files: readonly { readonly path: string; readonly sha256: string | null }[],
  ) => [...files].sort((a, b) => a.path.localeCompare(b.path));
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function tail(value: string, limit: number): string {
  const normalized = value.trim();
  return normalized.length <= limit ? normalized : normalized.slice(-limit);
}
