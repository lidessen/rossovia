#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  realpath,
  stat,
} from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  EffectVerifiedDataSchema,
  FileEffectJournal,
  type EffectActivity,
} from "../src/effect-journal";
import { readGitStatus } from "../src/git-effect-observer";
import { missionRunnerDirectory } from "../src/mission-runner";
import {
  verifyAgentEraBlogCandidate,
  type BlogCandidateVerificationReport,
} from "./verify-agent-era-blog-candidate";

const BLOG_MISSION_ID = "principal-workbench-dogfood";
const ADMITTED_CLAIM = "content-model-ready-for-next-slice" as const;
const VERIFIER_VERSION = "rosso.agent-era-blog-effect-verifier.v2" as const;
const DigestSchema = z.string().regex(/^[a-f0-9]{64}$/);

const EffectManifestSchema = z.object({
  version: z.literal("rosso.isolated-git-effect-evidence.v1"),
  effectId: z.string().min(1),
  missionId: z.string().min(1),
  root: z.string().min(1),
  baseHead: z.string().min(1),
  baselineDigest: DigestSchema,
  writePaths: z.array(z.string()),
  allowedCommands: z.tuple([]),
  status: z.object({
    added: z.array(z.string()),
    changed: z.array(z.string()),
    removed: z.array(z.string()),
  }),
  outsideScope: z.array(z.string()),
  files: z.array(z.object({
    path: z.string().min(1),
    beforeSha256: DigestSchema.nullable(),
    afterSha256: DigestSchema.nullable(),
  })),
  workCell: z.object({
    status: z.string(),
    verificationPassed: z.boolean(),
  }).passthrough(),
  authority: z.object({
    commit: z.literal("withheld"),
    merge: z.literal("withheld"),
    publish: z.literal("withheld"),
  }),
}).passthrough();

export interface AgentEraBlogEffectVerificationResult {
  readonly verdict: "passed" | "failed" | "unverifiable";
  readonly admittedClaim?: string;
  readonly reportRef?: string;
  readonly journalEventId?: string;
  readonly reason?: string;
}

export interface AgentEraBlogCandidateVerification {
  readonly verdict: "passed" | "failed" | "unverifiable";
  readonly reason?: string;
  readonly candidate: {
    readonly root: string;
    readonly head: string;
    readonly changedPaths: readonly string[];
  };
  readonly checks: readonly {
    readonly id: string;
    readonly command: string;
    readonly exitCode: number;
    readonly outputDigest: string;
    readonly diagnostic: string;
  }[];
}

export interface AgentEraBlogEffectVerifierProfile {
  readonly version: string;
  readonly admittedClaim: string;
  readonly verifierSources: readonly {
    readonly ref: string;
    readonly path: string;
  }[];
  readonly residualRisks: readonly string[];
  readonly verifyCandidate: (input: {
    readonly candidateRoot: string;
    readonly dependencyRoot: string;
  }) => Promise<AgentEraBlogCandidateVerification>;
}

export interface RetainedAgentEraBlogSettledEffect {
  readonly journalRoot: string;
  readonly activity: EffectActivity & {
    readonly settlement: NonNullable<EffectActivity["settlement"]>;
  };
  readonly candidateRoot: string;
  readonly candidate: {
    readonly head: string;
    readonly changedPaths: readonly string[];
    readonly files: readonly {
      readonly path: string;
      readonly digest: string | null;
    }[];
  };
}

export async function verifyAgentEraBlogEffect(input: {
  readonly home: string;
  readonly missionId: string;
  readonly effectId: string;
}): Promise<AgentEraBlogEffectVerificationResult> {
  return verifyAgentEraBlogEffectWithProfile(input, {
    version: VERIFIER_VERSION,
    admittedClaim: ADMITTED_CLAIM,
    verifierSources: [{
      ref: "source-project:apps/autonomy/experiments/agent-era-blog-effect-verifier.ts",
      path: fileURLToPath(import.meta.url),
    }, {
      ref: "source-project:apps/autonomy/experiments/verify-agent-era-blog-candidate.ts",
      path: fileURLToPath(new URL("./verify-agent-era-blog-candidate.ts", import.meta.url)),
    }],
    residualRisks: [
      "This verdict does not establish reader or studio UI behavior.",
      "This verdict does not establish D1 runtime behavior, authentication, publication, or product acceptance.",
      "This is time-point evidence; later candidate mutation requires fresh verification.",
    ],
    verifyCandidate: verifyAgentEraBlogCandidate,
  });
}

export async function verifyAgentEraBlogEffectWithProfile(
  input: {
    readonly home: string;
    readonly missionId: string;
    readonly effectId: string;
  },
  profile: AgentEraBlogEffectVerifierProfile,
): Promise<AgentEraBlogEffectVerificationResult> {
  try {
    return await verifySettledEffect(input, profile);
  } catch (error) {
    return {
      verdict: "unverifiable",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function verifySettledEffect(input: {
  readonly home: string;
  readonly missionId: string;
  readonly effectId: string;
}, profile: AgentEraBlogEffectVerifierProfile): Promise<AgentEraBlogEffectVerificationResult> {
  const retained = await validateAgentEraBlogSettledEffectEvidence(input);
  const { journalRoot, activity, candidateRoot, candidate: initial } = retained;
  assertVerifiableActivity(activity, input.effectId);
  const settlement = activity.settlement;
  const manifestRef = settlement.acceptance.mechanical.evidenceRefs.find(
    (ref) => ref.startsWith("file:") && ref.endsWith(".manifest.json"),
  )!;

  const dependencyRoot = await discoverDependencyRoot(
    candidateRoot,
    activity.prepared.worktree.baseHead,
  );
  const candidateReport = await profile.verifyCandidate({
    candidateRoot,
    dependencyRoot,
  });

  const final = await observeCandidate(candidateRoot);
  if (JSON.stringify(final) !== JSON.stringify(initial)) {
    throw new Error("candidate changed while independent verification was running");
  }
  if (candidateReport.verdict === "unverifiable") {
    return {
      verdict: "unverifiable",
      reason: candidateReport.reason ?? "candidate verification could not reach a verdict",
    };
  }

  const verifierSources = await verifierSourceDigests(profile.verifierSources);
  const report = {
    version: profile.version,
    admittedClaim: candidateReport.verdict === "passed" ? profile.admittedClaim : null,
    effect: {
      missionId: input.missionId,
      effectId: input.effectId,
      runId: activity.runId,
      baseHead: activity.prepared.worktree.baseHead,
      patch: settlement.patch,
      manifestRef,
    },
    verifierSources,
    candidate: candidateReport.candidate,
    checks: candidateReport.checks,
    verdict: candidateReport.verdict,
    residualRisks: profile.residualRisks,
  };
  const reportSource = `${JSON.stringify(report, null, 2)}\n`;
  const reportDigest = sha256(reportSource);
  const reportDirectory = join(
    dirname(resolveEvidencePath(journalRoot, settlement.patch.ref)),
    "independent",
  );
  const reportPath = join(reportDirectory, `${reportDigest}.json`);
  await durableCreate(reportPath, reportSource);

  const verification = EffectVerifiedDataSchema.parse({
    verifierRef: `${verifierSources[0]!.ref}@sha256:${verifierSources[0]!.digest}`,
    verdict: candidateReport.verdict,
    checks: candidateReport.checks.map(({ command, exitCode, outputDigest }) => ({
      command,
      exitCode,
      outputDigest,
    })),
    evidenceRefs: [
      `file:${relative(journalRoot, reportPath)}`,
      `sha256:${reportDigest}`,
      `git-head:${candidateReport.candidate.head}`,
      ...(candidateReport.verdict === "passed" ? [`claim:${profile.admittedClaim}`] : []),
    ],
    subject: {
      gitHead: initial.head,
      files: initial.files.map((file) => ({
        path: file.path,
        sha256: file.digest,
      })),
    },
  });
  const journal = new FileEffectJournal(journalRoot);
  const event = await journal.verify(input.effectId, verification);
  return {
    verdict: candidateReport.verdict,
    ...(candidateReport.verdict === "passed"
      ? { admittedClaim: profile.admittedClaim }
      : {}),
    reportRef: `file:${relative(journalRoot, reportPath)}`,
    journalEventId: event.eventId,
  };
}

/**
 * Rechecks the retained and live Git evidence for one settled Blog effect
 * without running product verification or appending a verification event.
 */
export async function validateAgentEraBlogSettledEffectEvidence(input: {
  readonly home: string;
  readonly missionId: string;
  readonly effectId: string;
}): Promise<RetainedAgentEraBlogSettledEffect> {
  if (input.missionId !== BLOG_MISSION_ID) {
    throw new Error(`Blog verifier only accepts Mission ${BLOG_MISSION_ID}`);
  }
  const journalRoot = missionRunnerDirectory(resolve(input.home), input.missionId);
  const journal = new FileEffectJournal(journalRoot);
  const activity = await journal.activity(input.effectId);
  assertSettledEffectActivity(activity, input.effectId);
  const settlement = activity.settlement;
  const candidateRoot = await realpath(activity.prepared.worktree.root);
  const candidate = await observeCandidate(candidateRoot);
  if (candidate.head !== activity.prepared.worktree.baseHead) {
    throw new Error("candidate HEAD no longer matches the effect base HEAD");
  }
  if (!sameStrings(candidate.changedPaths, settlement.changedPaths)) {
    throw new Error("candidate changed paths no longer match the settled effect");
  }
  const manifestRef = settlement.acceptance.mechanical.evidenceRefs.find(
    (ref) => ref.startsWith("file:") && ref.endsWith(".manifest.json"),
  );
  if (manifestRef === undefined) {
    throw new Error("settled effect has no retained manifest evidence");
  }
  const manifestPath = resolveEvidencePath(
    journalRoot,
    manifestRef.slice("file:".length),
  );
  const manifest = EffectManifestSchema.parse(
    JSON.parse(await readFile(manifestPath, "utf8")),
  );
  await verifyRetainedEffectEvidence({
    journalRoot,
    activity,
    manifest,
    candidateRoot,
  });
  return { journalRoot, activity, candidateRoot, candidate };
}

function assertVerifiableActivity(
  activity: EffectActivity | undefined,
  effectId: string,
): asserts activity is EffectActivity & { readonly settlement: NonNullable<EffectActivity["settlement"]> } {
  assertSettledEffectActivity(activity, effectId);
  if (activity.independentVerification !== undefined) {
    throw new Error(`effect ${effectId} already has independent verification`);
  }
}

function assertSettledEffectActivity(
  activity: EffectActivity | undefined,
  effectId: string,
): asserts activity is EffectActivity & {
  readonly settlement: NonNullable<EffectActivity["settlement"]>;
} {
  if (activity === undefined) throw new Error(`effect ${effectId} does not exist`);
  if (activity.state !== "settled" || activity.settlement === undefined) {
    throw new Error(`effect ${effectId} is ${activity.state}, not settled`);
  }
  if (activity.settlement.acceptance.mechanical.verdict !== "passed") {
    throw new Error(`effect ${effectId} did not pass mechanical acceptance`);
  }
  if (activity.settlement.outsideScope.verdict !== "clear") {
    throw new Error(`effect ${effectId} has outside-scope changes`);
  }
}

async function verifyRetainedEffectEvidence(input: {
  readonly journalRoot: string;
  readonly activity: EffectActivity & { readonly settlement: NonNullable<EffectActivity["settlement"]> };
  readonly manifest: z.infer<typeof EffectManifestSchema>;
  readonly candidateRoot: string;
}): Promise<void> {
  const { activity, manifest, candidateRoot, journalRoot } = input;
  const settlement = activity.settlement;
  if (
    manifest.effectId !== activity.effectId
    || manifest.missionId !== activity.prepared.missionId
    || await realpath(manifest.root) !== candidateRoot
    || manifest.baseHead !== activity.prepared.worktree.baseHead
    || manifest.baselineDigest !== activity.prepared.worktree.baselineDigest
    || !sameStrings(manifest.writePaths, activity.prepared.writePaths)
    || manifest.outsideScope.length !== 0
  ) {
    throw new Error("retained effect manifest does not match the journal binding");
  }
  const manifestPaths = manifest.files.map((file) => file.path);
  if (!sameStrings(manifestPaths, settlement.changedPaths)) {
    throw new Error("retained effect manifest files do not match settled changed paths");
  }
  for (const file of manifest.files) {
    const before = await gitBlobDigest(
      candidateRoot,
      activity.prepared.worktree.baseHead,
      file.path,
    );
    const after = await worktreeFileDigest(candidateRoot, file.path);
    if (before !== file.beforeSha256 || after !== file.afterSha256) {
      throw new Error(`candidate file hash no longer matches retained evidence: ${file.path}`);
    }
  }

  const patchPath = resolveEvidencePath(journalRoot, settlement.patch.ref);
  if (sha256(await readFile(patchPath)) !== settlement.patch.digest) {
    throw new Error("retained effect patch digest does not match its journal reference");
  }
  const status = await readGitStatus(candidateRoot);
  const reconstructed = await buildPatch(candidateRoot, status.added);
  if (sha256(reconstructed) !== settlement.patch.digest) {
    throw new Error("current candidate diff does not reconstruct the settled effect patch");
  }
}

async function discoverDependencyRoot(
  candidateRoot: string,
  baseHead: string,
): Promise<string> {
  const baseLock = gitBytes(candidateRoot, ["show", `${baseHead}:package-lock.json`]);
  const currentLock = await readFile(join(candidateRoot, "package-lock.json"));
  if (sha256(baseLock) !== sha256(currentLock)) {
    throw new Error("candidate package-lock.json differs from the effect base");
  }

  const worktrees = gitText(candidateRoot, ["worktree", "list", "--porcelain", "-z"])
    .split("\0")
    .filter((field) => field.startsWith("worktree "))
    .map((field) => field.slice("worktree ".length));
  const matches: string[] = [];
  for (const path of worktrees) {
    let root: string;
    try {
      root = await realpath(path);
      if (root === candidateRoot) continue;
      if (!(await stat(join(root, "node_modules"))).isDirectory()) continue;
      if (sha256(await readFile(join(root, "package-lock.json"))) !== sha256(baseLock)) continue;
    } catch {
      continue;
    }
    matches.push(root);
  }
  if (matches.length !== 1) {
    throw new Error(
      `expected one installed sibling worktree with the base package lock, observed ${matches.length}`,
    );
  }
  return matches[0]!;
}

async function observeCandidate(root: string) {
  const status = await readGitStatus(root);
  const changedPaths = [...new Set([
    ...status.added,
    ...status.changed,
    ...status.removed,
  ])].sort();
  const files = await Promise.all(changedPaths.map(async (path) => ({
    path,
    digest: await worktreeFileDigest(root, path),
  })));
  return {
    head: gitText(root, ["rev-parse", "HEAD"]),
    changedPaths,
    files,
  };
}

async function verifierSourceDigests(
  sources: AgentEraBlogEffectVerifierProfile["verifierSources"],
) {
  return await Promise.all(sources.map(async (source) => ({
    ref: source.ref,
    digest: sha256(await readFile(source.path)),
  })));
}

function resolveEvidencePath(root: string, ref: string): string {
  const resolvedRoot = resolve(root);
  const path = resolve(resolvedRoot, ref);
  if (path !== resolvedRoot && !path.startsWith(`${resolvedRoot}${sep}`)) {
    throw new Error(`effect evidence path escapes its journal root: ${ref}`);
  }
  return path;
}

async function buildPatch(root: string, added: readonly string[]): Promise<Buffer> {
  const parts = [
    gitBytes(root, [
      "diff",
      "--binary",
      "--no-ext-diff",
      "--no-textconv",
      "--src-prefix=a/",
      "--dst-prefix=b/",
      "HEAD",
      "--",
    ]),
  ];
  for (const path of added) {
    parts.push(gitBytes(root, [
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

async function gitBlobDigest(
  root: string,
  head: string,
  path: string,
): Promise<string | null> {
  const result = gitResult(root, ["show", `${head}:${path}`]);
  return result.status === 0 ? sha256(result.stdout) : null;
}

async function worktreeFileDigest(root: string, path: string): Promise<string | null> {
  try {
    return sha256(await readFile(join(root, path)));
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error
      && (error as { code?: unknown }).code === "ENOENT") return null;
    throw error;
  }
}

function gitText(root: string, arguments_: readonly string[]): string {
  return gitBytes(root, arguments_).toString("utf8").trim();
}

function gitBytes(
  root: string,
  arguments_: readonly string[],
  allowedStatuses: readonly number[] = [0],
): Buffer {
  const result = gitResult(root, arguments_);
  if (!allowedStatuses.includes(result.status ?? -1)) {
    throw new Error(
      `git ${arguments_[0] ?? "command"} failed: ${result.stderr.toString("utf8").trim()}`,
    );
  }
  return result.stdout;
}

function gitResult(root: string, arguments_: readonly string[]) {
  const result = spawnSync("git", ["-C", root, ...arguments_], {
    encoding: null,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error !== undefined) throw result.error;
  return {
    status: result.status,
    stdout: result.stdout ?? Buffer.alloc(0),
    stderr: result.stderr ?? Buffer.alloc(0),
  };
}

async function durableCreate(path: string, source: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const handle = await open(path, "wx");
  try {
    await handle.writeFile(source, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function parseCli(arguments_: readonly string[]) {
  const [missionId, effectId, ...rest] = arguments_;
  if (missionId === undefined || effectId === undefined) {
    throw new Error(
      "usage: agent-era-blog-effect-verifier.ts <mission-id> <effect-id> --home <ROSSO_HOME>",
    );
  }
  if (rest.length !== 2 || rest[0] !== "--home" || rest[1] === undefined) {
    throw new Error("--home <ROSSO_HOME> is required");
  }
  return { missionId, effectId, home: rest[1] };
}

if (import.meta.main) {
  try {
    const result = await verifyAgentEraBlogEffect(parseCli(process.argv.slice(2)));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.verdict === "passed"
      ? 0
      : result.verdict === "failed"
        ? 1
        : 2;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
