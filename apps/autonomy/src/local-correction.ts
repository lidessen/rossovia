import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  link,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { z } from "zod";
import {
  verifyAgentEraBlogCandidate,
} from "../experiments/verify-agent-era-blog-candidate";
import { stableStringify } from "./canonical-json";
import { FileMissionTimeline } from "./delegate-timeline";
import { FileEffectJournal, type EffectActivity } from "./effect-journal";
import { readGitStatus } from "./git-effect-observer";
import type { MissionInputReceipt } from "./mission-input";
import { missionRunnerDirectory } from "./mission-runner";

export const LOCAL_CORRECTION_REPORT_VERSION =
  "rosso.agent-era-blog-local-correction.v1" as const;

export const BLOG_LOCAL_CORRECTION_VERIFIER_REF =
  "supervisor:agent-era-blog-content-contract-v2" as const;

export const BLOG_LOCAL_CORRECTION_APPLY_MANIFEST_VERSION =
  "rosso.agent-era-blog-controlled-correction-apply.v1" as const;

export const BLOG_LOCAL_CORRECTION_APPLY_PREPARED_VERSION =
  "rosso.agent-era-blog-controlled-correction-apply-prepared.v1" as const;

export const BLOG_LOCAL_CORRECTION_LEASE_VERSION =
  "rosso.agent-era-blog-controlled-correction-lease.v1" as const;

const BLOG_LOCAL_CORRECTION_VERIFICATION_LEASE_VERSION =
  "rosso.agent-era-blog-controlled-correction-verification-lease.v1" as const;

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const GitHeadSchema = z.string().regex(/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/);
const RelativePathSchema = z.string().min(1);

const CorrectionFileSchema = z.object({
  path: RelativePathSchema,
  sha256: Sha256Schema,
}).strict();

const WithheldCorrectionAuthoritySchema = z.object({
  commit: z.literal("withheld"),
  merge: z.literal("withheld"),
  publish: z.literal("withheld"),
  productAcceptance: z.literal("withheld"),
}).strict();

const ControlledCorrectionBindingSchema = z.object({
  missionId: z.string().min(1),
  correctionId: z.string().min(1),
  inputId: z.string().min(1),
  inputEventId: z.string().min(1),
  inputWatermark: z.number().int().positive(),
  inputPayloadDigest: Sha256Schema,
  authorizerRef: z.string().min(1),
  sourceRef: z.string().min(1),
}).strict();

const ControlledCorrectionCauseSchema = z.object({
  effectId: z.string().min(1),
  failedReportRef: z.string().min(1),
  failedReportDigest: Sha256Schema,
}).strict();

const ControlledCorrectionCandidateSchema = z.object({
  root: z.string().min(1),
  gitHead: GitHeadSchema,
}).strict();

const ControlledCorrectionPatchSchema = z.object({
  executorRef: z.string().min(1),
  provider: z.null(),
  externalDisclosure: z.literal("none"),
  modelBudgetTokens: z.literal(0),
  writePaths: z.tuple([z.literal("db/schema.ts")]),
  patchRef: z.string().min(1),
  patchDigest: Sha256Schema,
}).strict();

const BlogLocalCorrectionLeaseSchema = z.object({
  effectId: z.string().min(1),
  root: z.string().min(1),
  version: z.literal(BLOG_LOCAL_CORRECTION_LEASE_VERSION),
  missionId: z.string().min(1),
  inputId: z.string().min(1),
  inputEventId: z.string().min(1),
  inputPayloadDigest: Sha256Schema,
  executorRef: z.string().min(1),
  patchDigest: Sha256Schema,
  pid: z.number().int().positive(),
}).strict();

const BlogLocalCorrectionVerificationLeaseSchema = z.object({
  effectId: z.string().min(1),
  root: z.string().min(1),
  version: z.literal(BLOG_LOCAL_CORRECTION_VERIFICATION_LEASE_VERSION),
  missionId: z.string().min(1),
  inputId: z.string().min(1),
  inputEventId: z.string().min(1),
  inputPayloadDigest: Sha256Schema,
  verifierRef: z.literal(BLOG_LOCAL_CORRECTION_VERIFIER_REF),
  applyManifestDigest: Sha256Schema,
  pid: z.number().int().positive(),
}).strict();

export const BlogLocalCorrectionApplyPreparedSchema = z.object({
  version: z.literal(BLOG_LOCAL_CORRECTION_APPLY_PREPARED_VERSION),
  correction: ControlledCorrectionBindingSchema,
  cause: ControlledCorrectionCauseSchema,
  candidate: ControlledCorrectionCandidateSchema,
  execution: ControlledCorrectionPatchSchema,
  subject: z.object({
    before: z.object({
      gitHead: GitHeadSchema,
      files: z.array(CorrectionFileSchema).min(1),
    }).strict(),
    after: z.object({
      gitHead: GitHeadSchema,
      files: z.array(CorrectionFileSchema).min(1),
    }).strict(),
    changedFromFailedSubject: z.tuple([z.literal("db/schema.ts")]),
  }).strict(),
  authority: WithheldCorrectionAuthoritySchema,
}).strict();

export type BlogLocalCorrectionApplyPrepared =
  z.infer<typeof BlogLocalCorrectionApplyPreparedSchema>;

export const BlogLocalCorrectionApplyManifestSchema = z.object({
  version: z.literal(BLOG_LOCAL_CORRECTION_APPLY_MANIFEST_VERSION),
  correction: ControlledCorrectionBindingSchema,
  cause: ControlledCorrectionCauseSchema,
  candidate: ControlledCorrectionCandidateSchema,
  execution: ControlledCorrectionPatchSchema.extend({
    preparedRef: z.string().min(1),
    preparedDigest: Sha256Schema,
  }).strict(),
  subject: z.object({
    before: z.object({
      gitHead: GitHeadSchema,
      files: z.array(CorrectionFileSchema).min(1),
    }).strict(),
    after: z.object({
      gitHead: GitHeadSchema,
      files: z.array(CorrectionFileSchema).min(1),
    }).strict(),
    changedFromFailedSubject: z.tuple([z.literal("db/schema.ts")]),
  }).strict(),
  authority: WithheldCorrectionAuthoritySchema,
}).strict();

export type BlogLocalCorrectionApplyManifest =
  z.infer<typeof BlogLocalCorrectionApplyManifestSchema>;

export const LocalCorrectionReportSchema = z.object({
  version: z.literal(LOCAL_CORRECTION_REPORT_VERSION),
  correction: z.object({
    missionId: z.string().min(1),
    correctionId: z.string().min(1),
    inputId: z.string().min(1),
    inputEventId: z.string().min(1),
    inputWatermark: z.number().int().positive(),
    inputPayloadDigest: Sha256Schema,
    actorRef: z.string().min(1),
    sourceRef: z.string().min(1),
  }).strict(),
  cause: z.object({
    effectId: z.string().min(1),
    failedReportRef: z.string().min(1),
    failedReportDigest: Sha256Schema,
  }).strict(),
  subject: z.object({
    before: z.object({
      gitHead: GitHeadSchema,
      files: z.array(CorrectionFileSchema).min(1),
    }).strict(),
    after: z.object({
      gitHead: GitHeadSchema,
      files: z.array(CorrectionFileSchema).min(1),
    }).strict(),
    changedFromFailedSubject: z.tuple([z.literal("db/schema.ts")]),
  }).strict(),
  execution: z.object({
    provider: z.null(),
    externalDisclosure: z.literal("none"),
    modelBudgetTokens: z.literal(0),
    writePaths: z.tuple([z.literal("db/schema.ts")]),
    controlledApply: z.object({
      executorRef: z.string().min(1),
      patchRef: z.string().min(1),
      patchDigest: Sha256Schema,
      manifestRef: z.string().min(1),
      manifestDigest: Sha256Schema,
    }).strict().optional(),
  }).strict(),
  verification: z.object({
    verifierRef: z.literal(BLOG_LOCAL_CORRECTION_VERIFIER_REF),
    verdict: z.enum(["passed", "failed"]),
    candidate: z.object({
      root: z.string().min(1),
      head: GitHeadSchema,
      changedPaths: z.array(RelativePathSchema),
    }).strict(),
    checks: z.array(z.object({
      id: z.string().min(1),
      command: z.string().min(1),
      exitCode: z.number().int(),
      outputDigest: Sha256Schema,
      diagnostic: z.string(),
    }).strict()).min(1),
  }).strict(),
  authority: WithheldCorrectionAuthoritySchema,
}).strict();

export type LocalCorrectionReport = z.infer<typeof LocalCorrectionReportSchema>;

export interface VerifyLocalCorrectionOptions {
  readonly home: string;
  readonly missionId: string;
  readonly inputId: string;
}

export interface LocalCorrectionVerificationResult {
  readonly verdict: "passed" | "failed";
  readonly reportRef: string;
  readonly reportDigest: string;
}

export interface ApplyAgentEraBlogLocalCorrectionOptions {
  readonly home: string;
  readonly missionId: string;
  readonly inputId: string;
  readonly executorRef: string;
  readonly patch: string | Buffer;
}

export interface BlogLocalCorrectionApplyResult {
  readonly executorRef: string;
  readonly patchRef: string;
  readonly patchDigest: string;
  readonly manifestRef: string;
  readonly manifestDigest: string;
  readonly changedPaths: readonly ["db/schema.ts"];
}

/**
 * The sole Blog-local correction write entry. It derives candidate, authority,
 * failed subject, and scope from retained evidence; callers provide only the
 * correction identity, executor attribution, and proposed patch bytes.
 */
export async function applyAgentEraBlogLocalCorrection(
  options: ApplyAgentEraBlogLocalCorrectionOptions,
): Promise<BlogLocalCorrectionApplyResult> {
  const executorRef = options.executorRef.trim();
  if (executorRef.length === 0) throw new Error("controlled correction executorRef is required");
  if (executorRef === BLOG_LOCAL_CORRECTION_VERIFIER_REF) {
    throw new Error("controlled correction executor cannot be its independent verifier");
  }
  const patch = Buffer.isBuffer(options.patch)
    ? Buffer.from(options.patch)
    : Buffer.from(options.patch, "utf8");
  if (patch.byteLength === 0) throw new Error("controlled correction patch must not be empty");

  const runnerRoot = missionRunnerDirectory(options.home, options.missionId);
  const receipt = await readCorrectionInput(runnerRoot, options.missionId, options.inputId);
  const payload = correctionPayload(receipt, options.inputId);
  assertBlogLocalCorrectionEnvelope(payload);

  const journal = new FileEffectJournal(runnerRoot);
  const effect = await journal.activity(payload.cause.effectId);
  assertFailedEffect(effect, payload.cause.effectId);
  assertCorrectionSubject(payload.subject, effect.independentVerification.subject);
  await verifyFailedReportBinding(runnerRoot, payload, effect);

  const candidateRoot = await realpath(effect.prepared.worktree.root);
  const artifactDirectory = localCorrectionApplyDirectory(runnerRoot, receipt.eventId);
  await mkdir(artifactDirectory, { recursive: true });
  const patchDigest = sha256(patch);
  const observedPrepared = await readBlogLocalCorrectionApplyPrepared(
    runnerRoot,
    receipt.eventId,
  );
  if (observedPrepared.length > 1) {
    throw new Error(`controlled correction ${payload.correctionId} has conflicting prepared manifests`);
  }
  if (observedPrepared[0] !== undefined) {
    assertPreparedBindsInput(observedPrepared[0].prepared, options.missionId, receipt);
  }
  const lease = await acquireCandidateCorrectionLease(
    options.home,
    candidateRoot,
    options.missionId,
    receipt,
    executorRef,
    patchDigest,
    observedPrepared[0],
  );

  try {
    const existing = await readBlogLocalCorrectionApplyManifests(runnerRoot, receipt.eventId);
    if (existing.length > 1) {
      throw new Error(`controlled correction ${payload.correctionId} has conflicting apply manifests`);
    }
    if (existing[0] !== undefined) {
      assertApplyManifestBindsInput(existing[0].manifest, options.missionId, receipt);
      if (
        existing[0].manifest.execution.executorRef !== executorRef
        || existing[0].manifest.execution.patchDigest !== patchDigest
      ) {
        throw new Error(`controlled correction ${payload.correctionId} conflicts with its retained apply`);
      }
      await assertCandidateMatchesSubject(
        candidateRoot,
        existing[0].manifest.subject.after,
        "retained controlled correction",
      );
      await assertCandidateStatusMatchesEffect(candidateRoot, effect);
      return applyResult(existing[0]);
    }

    const changedPaths = inspectPatchPaths(candidateRoot, patch);
    if (!sameStrings(changedPaths, payload.scope.writePaths)) {
      throw new Error(
        `controlled correction patch changes ${changedPaths.join(", ") || "no paths"}; expected only db/schema.ts`,
      );
    }

    const patchPath = join(artifactDirectory, `${patchDigest}.patch`);
    const patchRef = `file:${relative(runnerRoot, patchPath)}`;
    const preparedRecords = await readBlogLocalCorrectionApplyPrepared(
      runnerRoot,
      receipt.eventId,
    );
    if (preparedRecords.length > 1) {
      throw new Error(`controlled correction ${payload.correctionId} has conflicting prepared manifests`);
    }
    let preparedRecord = preparedRecords[0];
    if (preparedRecord === undefined) {
      await assertCandidateMatchesFailedEffect(candidateRoot, payload.subject, effect);
      checkPatchApplies(candidateRoot, patch);
      const expectedAfterFiles = await predictPatchSubject(
        candidateRoot,
        payload.subject,
        patch,
      );
      const expectedChangedPaths = changedSubjectPaths(
        payload.subject.files,
        expectedAfterFiles,
      );
      if (!sameStrings(expectedChangedPaths, payload.scope.writePaths)) {
        throw new Error(
          `controlled correction patch predicts ${expectedChangedPaths.join(", ") || "no failed-subject files"}; expected only db/schema.ts`,
        );
      }
      await durableCreateExact(patchPath, patch);
      const prepared = BlogLocalCorrectionApplyPreparedSchema.parse({
        version: BLOG_LOCAL_CORRECTION_APPLY_PREPARED_VERSION,
        correction: correctionBinding(options.missionId, payload, receipt),
        cause: payload.cause,
        candidate: {
          root: candidateRoot,
          gitHead: payload.subject.gitHead,
        },
        execution: {
          executorRef,
          provider: null,
          externalDisclosure: "none",
          modelBudgetTokens: 0,
          writePaths: ["db/schema.ts"],
          patchRef,
          patchDigest,
        },
        subject: {
          before: payload.subject,
          after: {
            gitHead: payload.subject.gitHead,
            files: expectedAfterFiles,
          },
          changedFromFailedSubject: ["db/schema.ts"],
        },
        authority: payload.authority,
      });
      const preparedSource = Buffer.from(`${stableStringify(prepared)}\n`, "utf8");
      const preparedDigest = sha256(preparedSource);
      const preparedPath = join(artifactDirectory, `${preparedDigest}.prepared.json`);
      await durableCreateExact(preparedPath, preparedSource);
      preparedRecord = {
        prepared,
        ref: `file:${relative(runnerRoot, preparedPath)}`,
        digest: preparedDigest,
      };
    } else {
      assertPreparedBindsInput(preparedRecord.prepared, options.missionId, receipt);
      if (
        preparedRecord.prepared.execution.executorRef !== executorRef
        || preparedRecord.prepared.execution.patchDigest !== patchDigest
      ) {
        throw new Error(`controlled correction ${payload.correctionId} conflicts with its prepared apply`);
      }
    }

    let alreadyApplied = false;
    try {
      await assertCandidateMatchesFailedEffect(candidateRoot, payload.subject, effect);
    } catch (beforeError) {
      try {
        await assertCandidateMatchesSubject(
          candidateRoot,
          preparedRecord.prepared.subject.after,
          "prepared controlled correction expected after",
        );
        await assertCandidateStatusMatchesEffect(candidateRoot, effect);
      } catch (afterError) {
        throw new Error(
          `prepared controlled correction ${payload.correctionId} has unrecognized candidate state`,
          { cause: new AggregateError([beforeError, afterError]) },
        );
      }
      alreadyApplied = true;
    }
    if (!alreadyApplied) {
      checkPatchApplies(candidateRoot, patch);
      applyPatch(candidateRoot, patch);
    }

    const afterHead = gitText(candidateRoot, ["rev-parse", "--verify", "HEAD"]);
    if (afterHead !== payload.subject.gitHead) {
      throw new Error(`controlled correction ${payload.correctionId} changed Git HEAD`);
    }
    const afterFiles = await subjectFileDigests(candidateRoot, payload.subject.files);
    const changedFromFailedSubject = changedSubjectPaths(payload.subject.files, afterFiles);
    if (!sameStrings(changedFromFailedSubject, payload.scope.writePaths)) {
      throw new Error(
        `controlled correction changed ${changedFromFailedSubject.join(", ") || "no failed-subject files"}; expected only db/schema.ts`,
      );
    }
    await assertCandidateStatusMatchesEffect(candidateRoot, effect);
    if (
      afterHead !== preparedRecord.prepared.subject.after.gitHead
      || stableStringify(afterFiles) !== stableStringify(preparedRecord.prepared.subject.after.files)
    ) {
      throw new Error(`controlled correction ${payload.correctionId} does not match its prepared expected after`);
    }

    const manifest = BlogLocalCorrectionApplyManifestSchema.parse({
      version: BLOG_LOCAL_CORRECTION_APPLY_MANIFEST_VERSION,
      correction: correctionBinding(options.missionId, payload, receipt),
      cause: payload.cause,
      candidate: {
        root: candidateRoot,
        gitHead: afterHead,
      },
      execution: {
        executorRef,
        provider: null,
        externalDisclosure: "none",
        modelBudgetTokens: 0,
        writePaths: ["db/schema.ts"],
        patchRef,
        patchDigest,
        preparedRef: preparedRecord.ref,
        preparedDigest: preparedRecord.digest,
      },
      subject: {
        before: preparedRecord.prepared.subject.before,
        after: preparedRecord.prepared.subject.after,
        changedFromFailedSubject: ["db/schema.ts"],
      },
      authority: payload.authority,
    });
    const manifestSource = Buffer.from(`${stableStringify(manifest)}\n`, "utf8");
    const manifestDigest = sha256(manifestSource);
    const manifestPath = join(artifactDirectory, `${manifestDigest}.manifest.json`);
    await durableCreateExact(manifestPath, manifestSource);
    return {
      executorRef,
      patchRef,
      patchDigest,
      manifestRef: `file:${relative(runnerRoot, manifestPath)}`,
      manifestDigest,
      changedPaths: ["db/schema.ts"],
    };
  } finally {
    await releaseCandidateLease(lease);
  }
}

/**
 * Verifies one retained Blog-local correction. Candidate location, failed
 * subject, cause report, scope, and authority all come from retained Mission
 * and effect evidence; callers may select only the Mission input identity.
 */
export async function verifyAgentEraBlogLocalCorrection(
  options: VerifyLocalCorrectionOptions,
): Promise<LocalCorrectionVerificationResult> {
  const runnerRoot = missionRunnerDirectory(options.home, options.missionId);
  const receipt = await readCorrectionInput(runnerRoot, options.missionId, options.inputId);
  const payload = correctionPayload(receipt, options.inputId);
  assertBlogLocalCorrectionEnvelope(payload);
  if (receipt.actorRef === BLOG_LOCAL_CORRECTION_VERIFIER_REF) {
    throw new Error(`correction ${payload.correctionId} cannot designate its actor as verifier`);
  }

  const existing = await readLocalCorrectionReports(runnerRoot, receipt.eventId);
  if (existing.length > 1) {
    throw new Error(`correction ${payload.correctionId} has conflicting verification reports`);
  }
  if (existing[0] !== undefined) {
    assertReportBindsInput(existing[0].report, options.missionId, receipt);
    return {
      verdict: existing[0].report.verification.verdict,
      reportRef: existing[0].ref,
      reportDigest: existing[0].digest,
    };
  }

  const journal = new FileEffectJournal(runnerRoot);
  const effect = await journal.activity(payload.cause.effectId);
  assertFailedEffect(effect, payload.cause.effectId);
  assertCorrectionSubject(payload.subject, effect.independentVerification.subject);
  await verifyFailedReportBinding(runnerRoot, payload, effect);

  const candidateRoot = await realpath(effect.prepared.worktree.root);
  const applications = await readBlogLocalCorrectionApplyManifests(runnerRoot, receipt.eventId);
  if (applications.length !== 1) {
    throw new Error(
      `correction ${payload.correctionId} requires exactly one controlled apply manifest; observed ${applications.length}`,
    );
  }
  const application = applications[0]!;
  assertApplyManifestBindsInput(application.manifest, options.missionId, receipt);
  if (application.manifest.execution.executorRef === BLOG_LOCAL_CORRECTION_VERIFIER_REF) {
    throw new Error(`correction ${payload.correctionId} executor cannot verify its own work`);
  }
  if (application.manifest.candidate.root !== candidateRoot) {
    throw new Error(`correction ${payload.correctionId} apply manifest targets another candidate`);
  }
  const verificationLease = await acquireCandidateCorrectionVerificationLease(
    options.home,
    candidateRoot,
    options.missionId,
    receipt,
    application,
  );
  try {
    const before = payload.subject;
    const afterHead = gitText(candidateRoot, ["rev-parse", "--verify", "HEAD"]);
    if (afterHead !== before.gitHead) {
      throw new Error(`correction ${payload.correctionId} changed Git HEAD`);
    }
    const afterFiles = await Promise.all(before.files.map(async (file) => ({
      path: file.path,
      sha256: await requiredFileDigest(candidateRoot, file.path),
    })));
    const changedFromFailedSubject = afterFiles
      .filter((file, index) => file.sha256 !== before.files[index]!.sha256)
      .map((file) => file.path);
    if (
      changedFromFailedSubject.length !== 1
      || changedFromFailedSubject[0] !== "db/schema.ts"
    ) {
      throw new Error(
        `correction ${payload.correctionId} changed ${changedFromFailedSubject.join(", ") || "no failed-subject files"}; expected only db/schema.ts`,
      );
    }
    if (
      afterHead !== application.manifest.subject.after.gitHead
      || stableStringify(afterFiles) !== stableStringify(application.manifest.subject.after.files)
    ) {
      throw new Error(`correction ${payload.correctionId} drifted after its controlled apply`);
    }

    const dependencyRoot = await discoverDependencyRoot(candidateRoot, before.gitHead);
    const candidateReport = await verifyAgentEraBlogCandidate({ candidateRoot, dependencyRoot });
    if (
      candidateReport.version !== "rosso.agent-era-blog-candidate-verification.v2"
      || candidateReport.verifierRef !== BLOG_LOCAL_CORRECTION_VERIFIER_REF
      || candidateReport.candidate.root !== candidateRoot
      || candidateReport.candidate.head !== before.gitHead
    ) {
      throw new Error("Blog verifier result does not bind the corrected candidate");
    }
    await assertCandidateMatchesSubject(
      candidateRoot,
      application.manifest.subject.after,
      "post-verification controlled correction",
    );
    await assertCandidateStatusMatchesEffect(candidateRoot, effect);

    const report = LocalCorrectionReportSchema.parse({
      version: LOCAL_CORRECTION_REPORT_VERSION,
      correction: {
        missionId: options.missionId,
        correctionId: payload.correctionId,
        inputId: receipt.inputId,
        inputEventId: receipt.eventId,
        inputWatermark: receipt.watermark,
        inputPayloadDigest: receipt.payloadDigest,
        actorRef: receipt.actorRef,
        sourceRef: receipt.sourceRef,
      },
      cause: payload.cause,
      subject: {
        before,
        after: {
          gitHead: afterHead,
          files: afterFiles,
        },
        changedFromFailedSubject: ["db/schema.ts"],
      },
      execution: {
        provider: null,
        externalDisclosure: "none",
        modelBudgetTokens: 0,
        writePaths: ["db/schema.ts"],
        controlledApply: {
          executorRef: application.manifest.execution.executorRef,
          patchRef: application.manifest.execution.patchRef,
          patchDigest: application.manifest.execution.patchDigest,
          manifestRef: application.ref,
          manifestDigest: application.digest,
        },
      },
      verification: {
        verifierRef: candidateReport.verifierRef,
        verdict: candidateReport.verdict,
        candidate: candidateReport.candidate,
        checks: candidateReport.checks,
      },
      authority: payload.authority,
    });
    const source = localCorrectionReportSource(report);
    const reportDigest = localCorrectionReportDigest(report);
    const reportPath = join(
      localCorrectionReportDirectory(runnerRoot, receipt.eventId),
      `${reportDigest}.json`,
    );
    await durableCreate(reportPath, source);
    return {
      verdict: report.verification.verdict,
      reportRef: localCorrectionReportRef(receipt.eventId, reportDigest),
      reportDigest,
    };
  } finally {
    await releaseCandidateLease(verificationLease);
  }
}

export interface StoredBlogLocalCorrectionApplyManifest {
  readonly manifest: BlogLocalCorrectionApplyManifest;
  readonly ref: string;
  readonly digest: string;
}

export interface StoredBlogLocalCorrectionApplyPrepared {
  readonly prepared: BlogLocalCorrectionApplyPrepared;
  readonly ref: string;
  readonly digest: string;
}

export async function readBlogLocalCorrectionApplyPrepared(
  runnerRoot: string,
  inputEventId: string,
): Promise<readonly StoredBlogLocalCorrectionApplyPrepared[]> {
  const directory = localCorrectionApplyDirectory(runnerRoot, inputEventId);
  let names: string[];
  try {
    names = await readdir(directory);
  } catch (error) {
    if (isMissing(error)) return [];
    throw error;
  }
  const preparedRecords: StoredBlogLocalCorrectionApplyPrepared[] = [];
  for (const name of names.sort()) {
    const match = /^([a-f0-9]{64})\.prepared\.json$/u.exec(name);
    if (match === null) continue;
    const path = join(directory, name);
    const source = await readFile(path);
    const digest = sha256(source);
    if (digest !== match[1]) {
      throw new Error(`controlled correction prepared manifest ${name} is not content-addressed`);
    }
    const prepared = BlogLocalCorrectionApplyPreparedSchema.parse(
      JSON.parse(source.toString("utf8")),
    );
    const patchPath = resolveEvidenceRef(runnerRoot, prepared.execution.patchRef);
    if (sha256(await readFile(patchPath)) !== prepared.execution.patchDigest) {
      throw new Error(`controlled correction prepared patch does not match ${name}`);
    }
    preparedRecords.push({
      prepared,
      ref: `file:${relative(runnerRoot, path)}`,
      digest,
    });
  }
  return preparedRecords;
}

export async function readBlogLocalCorrectionApplyManifests(
  runnerRoot: string,
  inputEventId: string,
): Promise<readonly StoredBlogLocalCorrectionApplyManifest[]> {
  const directory = localCorrectionApplyDirectory(runnerRoot, inputEventId);
  let names: string[];
  try {
    names = await readdir(directory);
  } catch (error) {
    if (isMissing(error)) return [];
    throw error;
  }
  const manifests: StoredBlogLocalCorrectionApplyManifest[] = [];
  for (const name of names.sort()) {
    const match = /^([a-f0-9]{64})\.manifest\.json$/u.exec(name);
    if (match === null) continue;
    const path = join(directory, name);
    const source = await readFile(path);
    const digest = sha256(source);
    if (digest !== match[1]) {
      throw new Error(`controlled correction apply manifest ${name} is not content-addressed`);
    }
    const manifest = BlogLocalCorrectionApplyManifestSchema.parse(
      JSON.parse(source.toString("utf8")),
    );
    const patchPath = resolveEvidenceRef(runnerRoot, manifest.execution.patchRef);
    if (sha256(await readFile(patchPath)) !== manifest.execution.patchDigest) {
      throw new Error(`controlled correction patch does not match ${name}`);
    }
    const preparedPath = resolveEvidenceRef(runnerRoot, manifest.execution.preparedRef);
    const preparedSource = await readFile(preparedPath);
    if (sha256(preparedSource) !== manifest.execution.preparedDigest) {
      throw new Error(`controlled correction prepared manifest does not match ${name}`);
    }
    const prepared = BlogLocalCorrectionApplyPreparedSchema.parse(
      JSON.parse(preparedSource.toString("utf8")),
    );
    if (
      stableStringify(prepared.correction) !== stableStringify(manifest.correction)
      || stableStringify(prepared.cause) !== stableStringify(manifest.cause)
      || stableStringify(prepared.candidate) !== stableStringify(manifest.candidate)
      || prepared.execution.executorRef !== manifest.execution.executorRef
      || prepared.execution.patchRef !== manifest.execution.patchRef
      || prepared.execution.patchDigest !== manifest.execution.patchDigest
      || stableStringify(prepared.subject) !== stableStringify(manifest.subject)
      || stableStringify(prepared.authority) !== stableStringify(manifest.authority)
    ) {
      throw new Error(`controlled correction final manifest does not bind its prepared manifest`);
    }
    manifests.push({
      manifest,
      ref: `file:${relative(runnerRoot, path)}`,
      digest,
    });
  }
  return manifests;
}

export interface StoredLocalCorrectionReport {
  readonly report: LocalCorrectionReport;
  readonly ref: string;
  readonly digest: string;
}

export async function readLocalCorrectionReports(
  runnerRoot: string,
  inputEventId: string,
): Promise<readonly StoredLocalCorrectionReport[]> {
  const directory = localCorrectionReportDirectory(runnerRoot, inputEventId);
  let names: string[];
  try {
    names = await readdir(directory);
  } catch (error) {
    if (isMissing(error)) return [];
    throw error;
  }
  const reports: StoredLocalCorrectionReport[] = [];
  for (const name of names.sort()) {
    if (!/^[a-f0-9]{64}\.json$/u.test(name)) continue;
    const path = join(directory, name);
    const source = await readFile(path, "utf8");
    const digest = sha256(source);
    if (`${digest}.json` !== name) {
      throw new Error(`local correction report ${name} is not content-addressed`);
    }
    reports.push({
      report: LocalCorrectionReportSchema.parse(JSON.parse(source)),
      ref: localCorrectionReportRef(inputEventId, digest),
      digest,
    });
  }
  return reports;
}

export function localCorrectionReportDigest(
  report: LocalCorrectionReport,
): string {
  return sha256(localCorrectionReportSource(
    LocalCorrectionReportSchema.parse(report),
  ));
}

export function localCorrectionReportRef(
  inputEventId: string,
  reportDigest: string,
): string {
  if (!/^[a-f0-9]{64}$/u.test(reportDigest)) {
    throw new Error("local correction report digest must be SHA-256");
  }
  return `file:correction-artifacts/${sha256(inputEventId)}/independent/${reportDigest}.json`;
}

export function localCorrectionReportDirectory(
  runnerRoot: string,
  inputEventId: string,
): string {
  return join(runnerRoot, "correction-artifacts", sha256(inputEventId), "independent");
}

function localCorrectionReportSource(report: LocalCorrectionReport): string {
  return `${stableStringify(report)}\n`;
}

export function localCorrectionApplyDirectory(
  runnerRoot: string,
  inputEventId: string,
): string {
  return join(runnerRoot, "correction-artifacts", sha256(inputEventId), "apply");
}

async function readCorrectionInput(
  runnerRoot: string,
  missionId: string,
  inputId: string,
): Promise<MissionInputReceipt> {
  const timeline = new FileMissionTimeline(runnerRoot);
  const inputs = await timeline.readInputsAfter(missionId, 0);
  const matches = inputs.filter((input) => input.inputId === inputId);
  if (matches.length !== 1) {
    throw new Error(`expected one retained Mission input ${inputId}, observed ${matches.length}`);
  }
  return matches[0]!;
}

function correctionPayload(
  receipt: MissionInputReceipt,
  inputId: string,
): Extract<MissionInputReceipt["payload"], { kind: "correction" }> {
  if (receipt.payload.kind !== "correction") {
    throw new Error(`Mission input ${inputId} is not a correction`);
  }
  return receipt.payload;
}

function assertBlogLocalCorrectionEnvelope(
  payload: Extract<MissionInputReceipt["payload"], { kind: "correction" }>,
): void {
  if (payload.scope.externalDisclosure !== "none") {
    throw new Error(`correction ${payload.correctionId} declares external disclosure`);
  }
  if (
    payload.scope.writePaths.length !== 1
    || payload.scope.writePaths[0] !== "db/schema.ts"
  ) {
    throw new Error(`correction ${payload.correctionId} must be scoped only to db/schema.ts`);
  }
  if (
    payload.plannedVerificationRef
    !== `local-correction-report:${payload.correctionId}`
  ) {
    throw new Error(
      `correction ${payload.correctionId} does not bind its planned report carrier`,
    );
  }
}

function assertFailedEffect(
  effect: EffectActivity | undefined,
  effectId: string,
): asserts effect is EffectActivity & {
  readonly independentVerification: NonNullable<EffectActivity["independentVerification"]> & {
    readonly subject: NonNullable<NonNullable<EffectActivity["independentVerification"]>["subject"]>;
  };
} {
  if (effect === undefined) throw new Error(`failed effect ${effectId} does not exist`);
  if (effect.state !== "settled") throw new Error(`failed effect ${effectId} is not settled`);
  if (effect.independentVerification?.verdict !== "failed") {
    throw new Error(`effect ${effectId} does not retain a failed independent verdict`);
  }
  if (effect.independentVerification.subject === undefined) {
    throw new Error(`failed effect ${effectId} has no retained verification subject`);
  }
}

function assertCorrectionSubject(
  input: {
    readonly gitHead: string;
    readonly files: readonly { readonly path: string; readonly sha256: string }[];
  },
  retained: {
    readonly gitHead: string;
    readonly files: readonly { readonly path: string; readonly sha256: string | null }[];
  },
): void {
  const retainedFiles = [...retained.files]
    .map((file) => ({ path: file.path, sha256: file.sha256 }))
    .sort(compareFilePath);
  const inputFiles = [...input.files].sort(compareFilePath);
  if (
    input.gitHead !== retained.gitHead
    || retainedFiles.some((file) => file.sha256 === null)
    || stableStringify(inputFiles) !== stableStringify(retainedFiles)
  ) {
    throw new Error("correction input does not bind the failed effect subject");
  }
}

async function verifyFailedReportBinding(
  runnerRoot: string,
  payload: Extract<MissionInputReceipt["payload"], { kind: "correction" }>,
  effect: EffectActivity & {
    readonly independentVerification: NonNullable<EffectActivity["independentVerification"]>;
  },
): Promise<void> {
  const cause = payload.cause;
  const failedPath = resolveEvidenceRef(runnerRoot, cause.failedReportRef);
  const source = await readFile(failedPath);
  if (sha256(source) !== cause.failedReportDigest) {
    throw new Error(`correction ${payload.correctionId} failed-report digest does not match`);
  }
  if (
    !effect.independentVerification.evidenceRefs.includes(cause.failedReportRef)
    || !effect.independentVerification.evidenceRefs.includes(`sha256:${cause.failedReportDigest}`)
  ) {
    throw new Error("correction cause is not retained by the failed effect verification");
  }
  const report = z.object({
    version: z.literal("rosso.agent-era-blog-effect-verifier.v1"),
    effect: z.object({
      missionId: z.string().min(1),
      effectId: z.string().min(1),
    }).passthrough(),
    verdict: z.literal("failed"),
  }).passthrough().parse(JSON.parse(source.toString("utf8")));
  if (
    report.effect.missionId !== effect.prepared.missionId
    || report.effect.effectId !== effect.effectId
  ) {
    throw new Error("failed report does not describe the correction cause effect");
  }
}

function assertReportBindsInput(
  report: LocalCorrectionReport,
  missionId: string,
  receipt: MissionInputReceipt,
): void {
  if (
    report.correction.missionId !== missionId
    || report.correction.inputId !== receipt.inputId
    || report.correction.inputEventId !== receipt.eventId
    || report.correction.inputPayloadDigest !== receipt.payloadDigest
  ) {
    throw new Error("retained local correction report does not bind its Mission input");
  }
}

async function assertCandidateMatchesFailedEffect(
  candidateRoot: string,
  subject: {
    readonly gitHead: string;
    readonly files: readonly { readonly path: string; readonly sha256: string }[];
  },
  effect: EffectActivity,
): Promise<void> {
  await assertCandidateMatchesSubject(candidateRoot, subject, "failed effect");
  await assertCandidateStatusMatchesEffect(candidateRoot, effect);
}

async function assertCandidateMatchesSubject(
  candidateRoot: string,
  subject: {
    readonly gitHead: string;
    readonly files: readonly { readonly path: string; readonly sha256: string }[];
  },
  label: string,
): Promise<void> {
  const head = gitText(candidateRoot, ["rev-parse", "--verify", "HEAD"]);
  if (head !== subject.gitHead) {
    throw new Error(`${label} subject HEAD is stale`);
  }
  const current = await subjectFileDigests(candidateRoot, subject.files);
  if (stableStringify(current) !== stableStringify(subject.files)) {
    throw new Error(`${label} subject file hashes are stale`);
  }
}

async function assertCandidateStatusMatchesEffect(
  candidateRoot: string,
  effect: EffectActivity,
): Promise<void> {
  if (effect.settlement === undefined) {
    throw new Error(`failed effect ${effect.effectId} has no retained settlement`);
  }
  const status = await readGitStatus(candidateRoot);
  const paths = [...status.added, ...status.changed, ...status.removed].sort();
  if (!sameStrings(paths, effect.settlement.changedPaths)) {
    throw new Error(
      `candidate paths ${paths.join(", ") || "none"} do not match the failed effect subject paths`,
    );
  }
}

async function subjectFileDigests(
  candidateRoot: string,
  files: readonly { readonly path: string }[],
): Promise<Array<{ path: string; sha256: string }>> {
  return await Promise.all(files.map(async (file) => ({
    path: file.path,
    sha256: await requiredFileDigest(candidateRoot, file.path),
  })));
}

function changedSubjectPaths(
  before: readonly { readonly path: string; readonly sha256: string }[],
  after: readonly { readonly path: string; readonly sha256: string }[],
): string[] {
  return after
    .filter((file, index) => file.sha256 !== before[index]?.sha256)
    .map((file) => file.path)
    .sort();
}

function inspectPatchPaths(candidateRoot: string, patch: Buffer): string[] {
  const result = gitWithInput(
    candidateRoot,
    ["apply", "--numstat", "-z", "--"],
    patch,
  );
  const paths = result.toString("utf8").split("\0").filter(Boolean).map((entry) => {
    const firstTab = entry.indexOf("\t");
    const secondTab = entry.indexOf("\t", firstTab + 1);
    if (firstTab <= 0 || secondTab <= firstTab + 1) {
      throw new Error("controlled correction patch has invalid numstat output");
    }
    const path = entry.slice(secondTab + 1);
    if (
      path.length === 0
      || isAbsolute(path)
      || path.includes("\\")
      || path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
    ) {
      throw new Error(`controlled correction patch has unsafe path: ${path}`);
    }
    return path;
  });
  return [...new Set(paths)].sort();
}

function checkPatchApplies(candidateRoot: string, patch: Buffer): void {
  gitWithInput(
    candidateRoot,
    ["apply", "--check", "--whitespace=error-all", "--"],
    patch,
  );
}

function applyPatch(candidateRoot: string, patch: Buffer): void {
  gitWithInput(
    candidateRoot,
    ["apply", "--whitespace=error-all", "--"],
    patch,
  );
}

async function predictPatchSubject(
  candidateRoot: string,
  subject: {
    readonly gitHead: string;
    readonly files: readonly { readonly path: string; readonly sha256: string }[];
  },
  patch: Buffer,
): Promise<Array<{ path: string; sha256: string }>> {
  const scratch = await mkdtemp(join(tmpdir(), "rosso-blog-controlled-correction-"));
  try {
    for (const file of subject.files) {
      const destination = join(scratch, file.path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, await readFile(join(candidateRoot, file.path)));
    }
    applyPatch(scratch, patch);
    return await subjectFileDigests(scratch, subject.files);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

function gitWithInput(
  root: string,
  arguments_: readonly string[],
  input: Buffer,
): Buffer {
  const result = spawnSync("git", ["-C", root, ...arguments_], {
    encoding: null,
    input,
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `git ${arguments_[0] ?? "command"} failed: ${(result.stderr ?? Buffer.alloc(0)).toString("utf8").trim()}`,
    );
  }
  return result.stdout ?? Buffer.alloc(0);
}

function assertApplyManifestBindsInput(
  manifest: BlogLocalCorrectionApplyManifest,
  missionId: string,
  receipt: MissionInputReceipt,
): void {
  const payload = correctionPayload(receipt, receipt.inputId);
  if (
    manifest.correction.missionId !== missionId
    || manifest.correction.correctionId !== payload.correctionId
    || manifest.correction.inputId !== receipt.inputId
    || manifest.correction.inputEventId !== receipt.eventId
    || manifest.correction.inputPayloadDigest !== receipt.payloadDigest
    || manifest.cause.effectId !== payload.cause.effectId
    || manifest.cause.failedReportDigest !== payload.cause.failedReportDigest
    || stableStringify(manifest.authority) !== stableStringify(payload.authority)
  ) {
    throw new Error("controlled correction apply manifest does not bind its Mission input");
  }
}

function assertPreparedBindsInput(
  prepared: BlogLocalCorrectionApplyPrepared,
  missionId: string,
  receipt: MissionInputReceipt,
): void {
  const payload = correctionPayload(receipt, receipt.inputId);
  if (
    prepared.correction.missionId !== missionId
    || prepared.correction.correctionId !== payload.correctionId
    || prepared.correction.inputId !== receipt.inputId
    || prepared.correction.inputEventId !== receipt.eventId
    || prepared.correction.inputPayloadDigest !== receipt.payloadDigest
    || prepared.cause.effectId !== payload.cause.effectId
    || prepared.cause.failedReportDigest !== payload.cause.failedReportDigest
    || stableStringify(prepared.subject.before) !== stableStringify(payload.subject)
    || stableStringify(prepared.authority) !== stableStringify(payload.authority)
  ) {
    throw new Error("controlled correction prepared manifest does not bind its Mission input");
  }
}

function correctionBinding(
  missionId: string,
  payload: Extract<MissionInputReceipt["payload"], { kind: "correction" }>,
  receipt: MissionInputReceipt,
): z.infer<typeof ControlledCorrectionBindingSchema> {
  return {
    missionId,
    correctionId: payload.correctionId,
    inputId: receipt.inputId,
    inputEventId: receipt.eventId,
    inputWatermark: receipt.watermark,
    inputPayloadDigest: receipt.payloadDigest,
    authorizerRef: receipt.actorRef,
    sourceRef: receipt.sourceRef,
  };
}

function applyResult(
  stored: StoredBlogLocalCorrectionApplyManifest,
): BlogLocalCorrectionApplyResult {
  return {
    executorRef: stored.manifest.execution.executorRef,
    patchRef: stored.manifest.execution.patchRef,
    patchDigest: stored.manifest.execution.patchDigest,
    manifestRef: stored.ref,
    manifestDigest: stored.digest,
    changedPaths: ["db/schema.ts"],
  };
}

async function discoverDependencyRoot(candidateRoot: string, baseHead: string): Promise<string> {
  const baseLock = gitBytes(candidateRoot, ["show", `${baseHead}:package-lock.json`]);
  const currentLock = await readFile(join(candidateRoot, "package-lock.json"));
  if (sha256(baseLock) !== sha256(currentLock)) {
    throw new Error("candidate package-lock.json differs from the correction base");
  }
  const worktrees = gitText(candidateRoot, ["worktree", "list", "--porcelain", "-z"])
    .split("\0")
    .filter((field) => field.startsWith("worktree "))
    .map((field) => field.slice("worktree ".length));
  const matches: string[] = [];
  for (const path of worktrees) {
    try {
      const root = await realpath(path);
      if (root === candidateRoot) continue;
      if (!(await stat(join(root, "node_modules"))).isDirectory()) continue;
      if (sha256(await readFile(join(root, "package-lock.json"))) !== sha256(baseLock)) continue;
      matches.push(root);
    } catch {
      continue;
    }
  }
  if (matches.length !== 1) {
    throw new Error(
      `expected one installed sibling worktree with the base package lock, observed ${matches.length}`,
    );
  }
  return matches[0]!;
}

async function requiredFileDigest(root: string, path: string): Promise<string> {
  return sha256(await readFile(join(root, path)));
}

async function canonicalDirectory(path: string, label: string): Promise<string> {
  const canonical = await realpath(resolve(path));
  if (!(await stat(canonical)).isDirectory()) throw new Error(`${label} must be a directory`);
  return canonical;
}

function resolveEvidenceRef(root: string, ref: string): string {
  const source = ref.startsWith("file:") ? ref.slice("file:".length) : ref;
  if (isAbsolute(source)) throw new Error(`evidence ref must be relative to the Mission: ${ref}`);
  const resolvedRoot = resolve(root);
  const path = resolve(resolvedRoot, source);
  if (path !== resolvedRoot && !path.startsWith(`${resolvedRoot}${sep}`)) {
    throw new Error(`evidence ref escapes the Mission directory: ${ref}`);
  }
  return path;
}

function gitText(root: string, arguments_: readonly string[]): string {
  return gitBytes(root, arguments_).toString("utf8").trim();
}

function gitBytes(root: string, arguments_: readonly string[]): Buffer {
  const result = spawnSync("git", ["-C", root, ...arguments_], {
    encoding: null,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `git ${arguments_[0] ?? "command"} failed: ${(result.stderr ?? Buffer.alloc(0)).toString("utf8").trim()}`,
    );
  }
  return result.stdout ?? Buffer.alloc(0);
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

async function durableCreateExact(path: string, source: Buffer): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  let handle;
  try {
    handle = await open(path, "wx");
  } catch (error) {
    if (isCode(error, "EEXIST")) {
      const retained = await readFile(path);
      if (!retained.equals(source)) {
        throw new Error(`content-addressed artifact conflicts at ${path}`);
      }
      return;
    }
    throw error;
  }
  try {
    await handle.writeFile(source);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

interface HeldCandidateLease {
  readonly path: string;
  readonly source: Buffer;
}

async function acquireCandidateCorrectionVerificationLease(
  home: string,
  candidateRoot: string,
  missionId: string,
  receipt: MissionInputReceipt,
  application: StoredBlogLocalCorrectionApplyManifest,
): Promise<HeldCandidateLease> {
  const directory = join(resolve(home), "effect-leases");
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${sha256(candidateRoot)}.json`);
  const lease = BlogLocalCorrectionVerificationLeaseSchema.parse({
    effectId: `correction-verification:${receipt.inputId}`,
    root: candidateRoot,
    version: BLOG_LOCAL_CORRECTION_VERIFICATION_LEASE_VERSION,
    missionId,
    inputId: receipt.inputId,
    inputEventId: receipt.eventId,
    inputPayloadDigest: receipt.payloadDigest,
    verifierRef: BLOG_LOCAL_CORRECTION_VERIFIER_REF,
    applyManifestDigest: application.digest,
    pid: process.pid,
  });
  const source = Buffer.from(`${stableStringify(lease)}\n`, "utf8");
  try {
    await createExclusiveLease(path, source);
  } catch (error) {
    if (isCode(error, "EEXIST")) {
      throw new Error(`candidate already has an active effect or correction: ${candidateRoot}`);
    }
    throw error;
  }
  return { path, source };
}

async function acquireCandidateCorrectionLease(
  home: string,
  candidateRoot: string,
  missionId: string,
  receipt: MissionInputReceipt,
  executorRef: string,
  patchDigest: string,
  prepared: StoredBlogLocalCorrectionApplyPrepared | undefined,
): Promise<HeldCandidateLease> {
  const directory = join(resolve(home), "effect-leases");
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${sha256(candidateRoot)}.json`);
  const lease = BlogLocalCorrectionLeaseSchema.parse({
    effectId: `correction:${receipt.inputId}`,
    root: candidateRoot,
    version: BLOG_LOCAL_CORRECTION_LEASE_VERSION,
    missionId,
    inputId: receipt.inputId,
    inputEventId: receipt.eventId,
    inputPayloadDigest: receipt.payloadDigest,
    executorRef,
    patchDigest,
    pid: process.pid,
  });
  const source = Buffer.from(`${stableStringify(lease)}\n`, "utf8");
  try {
    await createExclusiveLease(path, source);
    return { path, source };
  } catch (error) {
    if (!isCode(error, "EEXIST")) throw error;
  }

  const retainedSource = await readFile(path);
  let retainedValue: unknown;
  try {
    retainedValue = JSON.parse(retainedSource.toString("utf8"));
  } catch {
    throw new Error(`candidate already has an active controlled correction apply: ${candidateRoot}`);
  }
  const retainedLease = BlogLocalCorrectionLeaseSchema.safeParse(
    retainedValue,
  );
  const samePreparedExecution = prepared !== undefined
    && prepared.prepared.execution.executorRef === executorRef
    && prepared.prepared.execution.patchDigest === patchDigest;
  if (
    !retainedLease.success
    || retainedLease.data.root !== candidateRoot
    || retainedLease.data.missionId !== missionId
    || retainedLease.data.inputId !== receipt.inputId
    || retainedLease.data.inputEventId !== receipt.eventId
    || retainedLease.data.inputPayloadDigest !== receipt.payloadDigest
    || retainedLease.data.executorRef !== executorRef
    || retainedLease.data.patchDigest !== patchDigest
    || !samePreparedExecution
    || isProcessAlive(retainedLease.data.pid)
  ) {
    throw new Error(`candidate already has an active controlled correction apply: ${candidateRoot}`);
  }

  const replacements = join(directory, "replacements");
  await mkdir(replacements, { recursive: true });
  const replacementPath = join(
    replacements,
    `${sha256(retainedSource)}.lease.json`,
  );
  try {
    await link(path, replacementPath);
  } catch (error) {
    if (
      !isCode(error, "EEXIST")
      || !(await readFile(replacementPath)).equals(retainedSource)
    ) {
      throw error;
    }
  }
  if (!(await readFile(path)).equals(retainedSource)) {
    throw new Error(`candidate correction lease changed during stale recovery: ${candidateRoot}`);
  }
  await unlink(path);
  try {
    await createExclusiveLease(path, source);
  } catch (error) {
    if (isCode(error, "EEXIST")) {
      throw new Error(`candidate already has an active controlled correction apply: ${candidateRoot}`);
    }
    throw error;
  }
  const held = { path, source };
  try {
    const recoveryReceipt = Buffer.from(`${stableStringify({
      version: "rosso.agent-era-blog-controlled-correction-lease-recovery.v1",
      root: candidateRoot,
      missionId,
      inputId: receipt.inputId,
      inputEventId: receipt.eventId,
      inputPayloadDigest: receipt.payloadDigest,
      executorRef,
      patchDigest,
      retiredLeaseRef: `effect-leases/replacements/${sha256(retainedSource)}.lease.json`,
      retiredLeaseDigest: sha256(retainedSource),
      replacementLeaseDigest: sha256(source),
    })}\n`, "utf8");
    await durableCreateExact(
      join(replacements, `${sha256(recoveryReceipt)}.recovery.json`),
      recoveryReceipt,
    );
  } catch (error) {
    await releaseCandidateLease(held);
    throw error;
  }
  return held;
}

async function createExclusiveLease(path: string, source: Buffer): Promise<void> {
  const handle = await open(path, "wx");
  try {
    await handle.writeFile(source);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function releaseCandidateLease(lease: HeldCandidateLease): Promise<void> {
  try {
    if ((await readFile(lease.path)).equals(lease.source)) {
      await unlink(lease.path);
    }
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !isCode(error, "ESRCH");
  }
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return stableStringify([...left].sort()) === stableStringify([...right].sort());
}

function compareFilePath(
  left: { readonly path: string },
  right: { readonly path: string },
): number {
  return left.path.localeCompare(right.path);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function isMissing(error: unknown): boolean {
  return isCode(error, "ENOENT");
}

function isCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error
    && (error as { code?: unknown }).code === code;
}
