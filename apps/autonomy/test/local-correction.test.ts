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
import { join, relative } from "node:path";
import { expect, test } from "bun:test";
import {
  applyAgentEraBlogLocalCorrection,
  readBlogLocalCorrectionApplyManifests,
} from "../src/local-correction";
import { FileMissionTimeline } from "../src/delegate-timeline";
import { FileEffectJournal } from "../src/effect-journal";
import { projectMissionActivity } from "../src/mission-activity";
import { missionRunnerDirectory } from "../src/mission-runner";

test("joins one retained correction to its failed subject without rewriting the failed effect", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "rosso-local-correction-"));
  const home = join(temporary, "home");
  const candidateRoot = join(temporary, "candidate");
  const missionId = "principal-workbench-dogfood";
  const effectId = "failed-blog-effect";
  const runnerRoot = missionRunnerDirectory(home, missionId);
  try {
    await mkdir(join(candidateRoot, "db"), { recursive: true });
    await mkdir(join(candidateRoot, "app/blog"), { recursive: true });
    await writeFile(join(candidateRoot, "db/schema.ts"), "export const baseline = true;\n");
    await writeFile(join(candidateRoot, "package-lock.json"), "{}\n");
    git(candidateRoot, ["init", "--initial-branch=main"]);
    git(candidateRoot, ["config", "user.name", "Correction Test"]);
    git(candidateRoot, ["config", "user.email", "correction@example.test"]);
    git(candidateRoot, ["add", "."]);
    git(candidateRoot, ["-c", "commit.gpgsign=false", "commit", "-m", "baseline"]);
    const head = gitText(candidateRoot, ["rev-parse", "HEAD"]);

    await writeFile(
      join(candidateRoot, "db/schema.ts"),
      "import { sqliteTable } from \"drizzle-orm/sqlite-core\";\nindex(\"missing-import\");\n",
    );
    await writeFile(
      join(candidateRoot, "app/blog/content.ts"),
      "export const seededPublishedRevision = {};\n",
    );
    const failedSubject = [
      {
        path: "app/blog/content.ts",
        sha256: digest(await readFile(join(candidateRoot, "app/blog/content.ts"))),
      },
      {
        path: "db/schema.ts",
        sha256: digest(await readFile(join(candidateRoot, "db/schema.ts"))),
      },
    ];

    const failedReportPath = join(runnerRoot, "effect-artifacts/failure/failed.json");
    const failedReportSource = `${JSON.stringify({
      version: "rosso.agent-era-blog-effect-verifier.v1",
      effect: { missionId, effectId },
      verdict: "failed",
    })}\n`;
    await mkdir(join(runnerRoot, "effect-artifacts/failure"), { recursive: true });
    await writeFile(failedReportPath, failedReportSource);
    const failedReportDigest = digest(failedReportSource);
    const failedReportRef = `file:${relative(runnerRoot, failedReportPath)}`;

    const journal = new FileEffectJournal(runnerRoot);
    await journal.prepare(effectId, {
      missionId,
      turnId: "turn-1",
      cellId: "blog-content-model",
      worktree: {
        root: candidateRoot,
        baseHead: head,
        baselineDigest: "a".repeat(64),
      },
      writePaths: ["db/schema.ts", "app/blog"],
      allowedCommands: [],
      authority: "withheld",
    });
    await journal.start(effectId);
    await journal.quiesce(effectId, { reason: "completed", activeToolCalls: [] });
    await journal.settle(effectId, {
      patch: { ref: "effect-artifacts/failure/original.patch", digest: "b".repeat(64) },
      changedPaths: ["app/blog/content.ts", "db/schema.ts"],
      outsideScope: { verdict: "clear", paths: [] },
      acceptance: {
        mechanical: { verdict: "passed", evidenceRefs: ["cell-run:test"] },
        independent: { verdict: "not-run", evidenceRefs: [] },
        principal: { verdict: "withheld", evidenceRefs: [] },
      },
    });
    await journal.verify(effectId, {
      verifierRef: "supervisor:original-blog-verifier",
      verdict: "failed",
      checks: [{
        command: "bun content contract",
        exitCode: 1,
        outputDigest: "c".repeat(64),
      }],
      evidenceRefs: [failedReportRef, `sha256:${failedReportDigest}`],
      subject: { gitHead: head, files: failedSubject },
    });

    const timeline = new FileMissionTimeline(runnerRoot);
    const receipt = await timeline.appendInput(missionId, {
      id: "correction-input-1",
      actorRef: "local-supervisor",
      sourceRef: "principal-choice:A",
      payload: correctionPayload({
        correctionId: "add-missing-index-import",
        effectId,
        failedReportRef,
        failedReportDigest,
        gitHead: head,
        files: failedSubject,
      }),
    });
    const application = await applyAgentEraBlogLocalCorrection({
      home,
      missionId,
      inputId: receipt.inputId,
      executorRef: "agent:local-correction-applier",
      patch: indexImportPatch(),
    });
    expect(application.changedPaths).toEqual(["db/schema.ts"]);
    expect(await applyAgentEraBlogLocalCorrection({
      home,
      missionId,
      inputId: receipt.inputId,
      executorRef: "agent:local-correction-applier",
      patch: indexImportPatch(),
    })).toEqual(application);
    await expect(applyAgentEraBlogLocalCorrection({
      home,
      missionId,
      inputId: receipt.inputId,
      executorRef: "agent:different-applier",
      patch: indexImportPatch(),
    })).rejects.toThrow("conflicts with its retained apply");
    const retainedApplications = await readBlogLocalCorrectionApplyManifests(
      runnerRoot,
      receipt.eventId,
    );
    expect(retainedApplications).toHaveLength(1);
    expect(retainedApplications[0]).toMatchObject({
      ref: application.manifestRef,
      digest: application.manifestDigest,
      manifest: {
        correction: {
          inputId: receipt.inputId,
          inputEventId: receipt.eventId,
          inputPayloadDigest: receipt.payloadDigest,
        },
        execution: {
          executorRef: "agent:local-correction-applier",
          patchRef: application.patchRef,
          patchDigest: application.patchDigest,
          preparedRef: expect.stringMatching(/^file:correction-artifacts\//),
          preparedDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
        authority: {
          commit: "withheld",
          merge: "withheld",
          publish: "withheld",
          productAcceptance: "withheld",
        },
      },
    });
    expect((await projectMissionActivity(home, missionId)).currentCorrection).toMatchObject({
      state: "applied-unverified",
      execution: {
        executorRef: "agent:local-correction-applier",
        patchRef: application.patchRef,
        patchDigest: application.patchDigest,
        manifestRef: application.manifestRef,
        manifestDigest: application.manifestDigest,
      },
    });

    expect((await journal.activity(effectId))?.independentVerification?.verdict).toBe("failed");

    const activity = await projectMissionActivity(home, missionId);
    expect(activity.currentCorrection).toMatchObject({
      correctionId: "add-missing-index-import",
      cause: { effectId, failedReportDigest },
      state: "applied-unverified",
      verification: {
        verdict: "pending",
        reportDigest: null,
      },
      execution: {
        executorRef: "agent:local-correction-applier",
        patchRef: application.patchRef,
        patchDigest: application.patchDigest,
        manifestRef: application.manifestRef,
        manifestDigest: application.manifestDigest,
      },
      changedFromFailedSubject: [],
      stale: false,
    });
    expect(activity.lastEvent).toMatchObject({
      label: "Local correction recorded",
      evidenceKind: "correction",
    });

    expect((await projectMissionActivity(home, missionId)).recentCorrections).toHaveLength(1);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

function correctionPayload(input: {
  readonly correctionId: string;
  readonly effectId: string;
  readonly failedReportRef: string;
  readonly failedReportDigest: string;
  readonly gitHead: string;
  readonly files: readonly { readonly path: string; readonly sha256: string }[];
}) {
  return {
    kind: "correction" as const,
    correctionId: input.correctionId,
    instruction: "Add the missing index import and change no other failed-subject file.",
    cause: {
      effectId: input.effectId,
      failedReportRef: input.failedReportRef,
      failedReportDigest: input.failedReportDigest,
    },
    subject: { gitHead: input.gitHead, files: [...input.files] },
    scope: { writePaths: ["db/schema.ts"], externalDisclosure: "none" as const },
    plannedVerificationRef: `local-correction-report:${input.correctionId}`,
    authority: {
      commit: "withheld" as const,
      merge: "withheld" as const,
      publish: "withheld" as const,
      productAcceptance: "withheld" as const,
    },
  };
}

function indexImportPatch(): string {
  return [
    "diff --git a/db/schema.ts b/db/schema.ts",
    "--- a/db/schema.ts",
    "+++ b/db/schema.ts",
    "@@ -1,2 +1,2 @@",
    '-import { sqliteTable } from "drizzle-orm/sqlite-core";',
    '+import { index, sqliteTable } from "drizzle-orm/sqlite-core";',
    '-index("missing-import");',
    '+index("imported");',
    "",
  ].join("\n");
}

function git(root: string, arguments_: readonly string[]): void {
  gitText(root, arguments_);
}

function gitText(root: string, arguments_: readonly string[]): string {
  const result = spawnSync("git", ["-C", root, ...arguments_], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    throw new Error(`git ${arguments_[0]} failed: ${(result.stderr ?? "").trim()}`);
  }
  return (result.stdout ?? "").trim();
}

function digest(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
