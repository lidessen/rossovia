import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "bun:test";
import {
  applyAgentEraBlogLocalCorrection,
  BLOG_LOCAL_CORRECTION_LEASE_VERSION,
  BLOG_LOCAL_CORRECTION_VERIFIER_REF,
  localCorrectionReportDirectory,
  readBlogLocalCorrectionApplyManifests,
  verifyAgentEraBlogLocalCorrection,
} from "../src/local-correction";
import { FileMissionTimeline } from "../src/delegate-timeline";
import { FileEffectJournal } from "../src/effect-journal";
import { projectMissionActivity } from "../src/mission-activity";
import { missionRunnerDirectory } from "../src/mission-runner";

test("rejects a patch outside the retained correction scope before writing", async () => {
  const fixture = await correctionFixture("scope");
  try {
    const beforeSchema = await readFile(join(fixture.candidateRoot, "db/schema.ts"), "utf8");
    const beforeLock = await readFile(join(fixture.candidateRoot, "package-lock.json"), "utf8");

    await expect(applyAgentEraBlogLocalCorrection({
      home: fixture.home,
      missionId: fixture.missionId,
      inputId: fixture.inputId,
      executorRef: "agent:bounded-applier",
      patch: multiPathPatch(),
    })).rejects.toThrow("expected only db/schema.ts");

    expect(await readFile(join(fixture.candidateRoot, "db/schema.ts"), "utf8")).toBe(beforeSchema);
    expect(await readFile(join(fixture.candidateRoot, "package-lock.json"), "utf8")).toBe(beforeLock);
    expect(await readBlogLocalCorrectionApplyManifests(
      fixture.runnerRoot,
      fixture.inputEventId,
    )).toHaveLength(0);
  } finally {
    await fixture.dispose();
  }
});

test("rejects stale failed-subject bytes and a verifier acting as executor before writing", async () => {
  const fixture = await correctionFixture("authority");
  try {
    const schemaPath = join(fixture.candidateRoot, "db/schema.ts");
    const beforeSchema = await readFile(schemaPath, "utf8");
    await writeFile(
      join(fixture.candidateRoot, "app/blog/content.ts"),
      "export const seededPublishedRevision = { stale: true };\n",
    );

    await expect(applyAgentEraBlogLocalCorrection({
      home: fixture.home,
      missionId: fixture.missionId,
      inputId: fixture.inputId,
      executorRef: "agent:bounded-applier",
      patch: indexImportPatch(),
    })).rejects.toThrow("subject file hashes are stale");
    expect(await readFile(schemaPath, "utf8")).toBe(beforeSchema);

    await writeFile(
      join(fixture.candidateRoot, "app/blog/content.ts"),
      "export const seededPublishedRevision = {};\n",
    );
    await expect(applyAgentEraBlogLocalCorrection({
      home: fixture.home,
      missionId: fixture.missionId,
      inputId: fixture.inputId,
      executorRef: BLOG_LOCAL_CORRECTION_VERIFIER_REF,
      patch: indexImportPatch(),
    })).rejects.toThrow("executor cannot be its independent verifier");
    expect(await readFile(schemaPath, "utf8")).toBe(beforeSchema);
    expect(await readBlogLocalCorrectionApplyManifests(
      fixture.runnerRoot,
      fixture.inputEventId,
    )).toHaveLength(0);
  } finally {
    await fixture.dispose();
  }
});

test("refuses to verify a manual correction that bypassed the controlled apply entry", async () => {
  const fixture = await correctionFixture("manual-bypass");
  try {
    await writeFile(
      join(fixture.candidateRoot, "db/schema.ts"),
      'import { index, sqliteTable } from "drizzle-orm/sqlite-core";\nindex("imported");\n',
    );

    await expect(verifyAgentEraBlogLocalCorrection({
      home: fixture.home,
      missionId: fixture.missionId,
      inputId: fixture.inputId,
    })).rejects.toThrow("requires exactly one controlled apply manifest");
  } finally {
    await fixture.dispose();
  }
});

test("offers one thin Blog-specific CLI over the controlled apply API", async () => {
  const fixture = await correctionFixture("cli");
  try {
    const patchPath = join(fixture.home, "controlled-correction.patch");
    await writeFile(patchPath, indexImportPatch());
    const script = fileURLToPath(new URL(
      "../experiments/apply-agent-era-blog-local-correction.ts",
      import.meta.url,
    ));
    const result = Bun.spawnSync([
      process.execPath,
      script,
      fixture.missionId,
      fixture.inputId,
      patchPath,
      "--executor",
      "agent:cli-applier",
      "--home",
      fixture.home,
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr.toString()).toBe("");
    expect(JSON.parse(result.stdout.toString())).toMatchObject({
      executorRef: "agent:cli-applier",
      changedPaths: ["db/schema.ts"],
    });
    expect(await readBlogLocalCorrectionApplyManifests(
      fixture.runnerRoot,
      fixture.inputEventId,
    )).toHaveLength(1);
  } finally {
    await fixture.dispose();
  }
});

test("rejects candidate drift after controlled apply before independent verification", async () => {
  const fixture = await correctionFixture("post-apply-drift");
  try {
    await applyAgentEraBlogLocalCorrection({
      home: fixture.home,
      missionId: fixture.missionId,
      inputId: fixture.inputId,
      executorRef: "agent:bounded-applier",
      patch: indexImportPatch(),
    });
    await writeFile(
      join(fixture.candidateRoot, "db/schema.ts"),
      'import { index, sqliteTable } from "drizzle-orm/sqlite-core";\nindex("drifted");\n',
    );

    await expect(verifyAgentEraBlogLocalCorrection({
      home: fixture.home,
      missionId: fixture.missionId,
      inputId: fixture.inputId,
    })).rejects.toThrow("drifted after its controlled apply");
    expect((await projectMissionActivity(
      fixture.home,
      fixture.missionId,
    )).currentCorrection).toMatchObject({
      state: "applied-unverified",
      stale: true,
    });
  } finally {
    await fixture.dispose();
  }
});

test("projects a legacy joined-correction report with no invented controlled execution", async () => {
  const fixture = await correctionFixture("legacy-projection");
  try {
    await writeFile(
      join(fixture.candidateRoot, "db/schema.ts"),
      'import { index, sqliteTable } from "drizzle-orm/sqlite-core";\nindex("imported");\n',
    );
    const afterFiles = await Promise.all(fixture.failedSubject.map(async (file) => ({
      path: file.path,
      sha256: digest(await readFile(join(fixture.candidateRoot, file.path))),
    })));
    const report = {
      version: "rosso.agent-era-blog-local-correction.v1",
      correction: {
        missionId: fixture.missionId,
        correctionId: fixture.inputId,
        inputId: fixture.inputId,
        inputEventId: fixture.inputEventId,
        inputWatermark: fixture.inputWatermark,
        inputPayloadDigest: fixture.inputPayloadDigest,
        actorRef: "principal:test",
        sourceRef: "decision:051-treatment-b-prototype",
      },
      cause: fixture.cause,
      subject: {
        before: { gitHead: fixture.head, files: fixture.failedSubject },
        after: { gitHead: fixture.head, files: afterFiles },
        changedFromFailedSubject: ["db/schema.ts"],
      },
      execution: {
        provider: null,
        externalDisclosure: "none",
        modelBudgetTokens: 0,
        writePaths: ["db/schema.ts"],
      },
      verification: {
        verifierRef: BLOG_LOCAL_CORRECTION_VERIFIER_REF,
        verdict: "passed",
        candidate: {
          root: fixture.candidateRoot,
          head: fixture.head,
          changedPaths: ["app/blog/content.ts", "db/schema.ts"],
        },
        checks: [{
          id: "content-contract",
          command: "fixture legacy report",
          exitCode: 0,
          outputDigest: "d".repeat(64),
          diagnostic: "",
        }],
      },
      authority: {
        commit: "withheld",
        merge: "withheld",
        publish: "withheld",
        productAcceptance: "withheld",
      },
    };
    const source = `${JSON.stringify(report)}\n`;
    const directory = localCorrectionReportDirectory(
      fixture.runnerRoot,
      fixture.inputEventId,
    );
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, `${digest(source)}.json`), source);

    expect((await projectMissionActivity(
      fixture.home,
      fixture.missionId,
    )).currentCorrection).toMatchObject({
      state: "verification-passed",
      execution: null,
    });
  } finally {
    await fixture.dispose();
  }
});

test("settles an already-applied prepared correction after an interrupted final-manifest write", async () => {
  const fixture = await correctionFixture("prepared-recovery");
  try {
    const first = await applyAgentEraBlogLocalCorrection({
      home: fixture.home,
      missionId: fixture.missionId,
      inputId: fixture.inputId,
      executorRef: "agent:recoverable-applier",
      patch: indexImportPatch(),
    });
    await rm(join(fixture.runnerRoot, first.manifestRef.slice("file:".length)));
    expect(await readBlogLocalCorrectionApplyManifests(
      fixture.runnerRoot,
      fixture.inputEventId,
    )).toHaveLength(0);
    expect((await projectMissionActivity(
      fixture.home,
      fixture.missionId,
    )).currentCorrection).toMatchObject({
      state: "apply-interrupted",
      stale: false,
      execution: {
        executorRef: "agent:recoverable-applier",
        patchDigest: first.patchDigest,
      },
      changedFromFailedSubject: ["db/schema.ts"],
    });

    const candidateRoot = await realpath(fixture.candidateRoot);
    const staleLeaseSource = `${JSON.stringify({
      effectId: `correction:${fixture.inputId}`,
      root: candidateRoot,
      version: BLOG_LOCAL_CORRECTION_LEASE_VERSION,
      missionId: fixture.missionId,
      inputId: fixture.inputId,
      inputEventId: fixture.inputEventId,
      inputPayloadDigest: fixture.inputPayloadDigest,
      executorRef: "agent:recoverable-applier",
      patchDigest: first.patchDigest,
      pid: deadProcessId(),
    })}\n`;
    const leaseDirectory = join(fixture.home, "effect-leases");
    await mkdir(leaseDirectory, { recursive: true });
    await writeFile(
      join(leaseDirectory, `${digest(candidateRoot)}.json`),
      staleLeaseSource,
    );

    const recovered = await applyAgentEraBlogLocalCorrection({
      home: fixture.home,
      missionId: fixture.missionId,
      inputId: fixture.inputId,
      executorRef: "agent:recoverable-applier",
      patch: indexImportPatch(),
    });
    expect(recovered).toEqual(first);
    expect(await readBlogLocalCorrectionApplyManifests(
      fixture.runnerRoot,
      fixture.inputEventId,
    )).toHaveLength(1);
    const replacements = await readdir(join(leaseDirectory, "replacements"));
    expect(replacements.filter((name) => name.endsWith(".lease.json"))).toHaveLength(1);
    expect(replacements.filter((name) => name.endsWith(".recovery.json"))).toHaveLength(1);
    const retiredLeaseName = replacements.find((name) => name.endsWith(".lease.json"));
    if (retiredLeaseName === undefined) throw new Error("missing retired lease evidence");
    expect(await readFile(
      join(leaseDirectory, "replacements", retiredLeaseName),
      "utf8",
    )).toBe(staleLeaseSource);
  } finally {
    await fixture.dispose();
  }
});

test("projects prepared correction drift as uncertain instead of recorded", async () => {
  const fixture = await correctionFixture("prepared-uncertain");
  try {
    const applied = await applyAgentEraBlogLocalCorrection({
      home: fixture.home,
      missionId: fixture.missionId,
      inputId: fixture.inputId,
      executorRef: "agent:interrupted-applier",
      patch: indexImportPatch(),
    });
    await rm(join(fixture.runnerRoot, applied.manifestRef.slice("file:".length)));
    await writeFile(
      join(fixture.candidateRoot, "db/schema.ts"),
      'import { index, sqliteTable } from "drizzle-orm/sqlite-core";\nindex("unknown-drift");\n',
    );

    expect((await projectMissionActivity(
      fixture.home,
      fixture.missionId,
    )).currentCorrection).toMatchObject({
      state: "apply-uncertain",
      stale: true,
      execution: {
        executorRef: "agent:interrupted-applier",
        patchDigest: applied.patchDigest,
      },
    });
  } finally {
    await fixture.dispose();
  }
});

test("independent verification shares the candidate-wide effect lease", async () => {
  const fixture = await correctionFixture("verification-lease");
  try {
    await applyAgentEraBlogLocalCorrection({
      home: fixture.home,
      missionId: fixture.missionId,
      inputId: fixture.inputId,
      executorRef: "agent:bounded-applier",
      patch: indexImportPatch(),
    });
    const leaseDirectory = join(fixture.home, "effect-leases");
    await mkdir(leaseDirectory, { recursive: true });
    await writeFile(
      join(leaseDirectory, `${digest(await realpath(fixture.candidateRoot))}.json`),
      `${JSON.stringify({
        effectId: "another-effect",
        root: await realpath(fixture.candidateRoot),
      })}\n`,
    );

    await expect(verifyAgentEraBlogLocalCorrection({
      home: fixture.home,
      missionId: fixture.missionId,
      inputId: fixture.inputId,
    })).rejects.toThrow("candidate already has an active effect or correction");
  } finally {
    await fixture.dispose();
  }
});

test("refuses another correction while the candidate-wide apply lease is held", async () => {
  const fixture = await correctionFixture("candidate-lease");
  try {
    const leaseDirectory = join(
      fixture.home,
      "effect-leases",
    );
    await mkdir(leaseDirectory, { recursive: true });
    await writeFile(
      join(leaseDirectory, `${digest(await realpath(fixture.candidateRoot))}.json`),
      '{"held":true}\n',
    );
    const beforeSchema = await readFile(
      join(fixture.candidateRoot, "db/schema.ts"),
      "utf8",
    );

    await expect(applyAgentEraBlogLocalCorrection({
      home: fixture.home,
      missionId: fixture.missionId,
      inputId: fixture.inputId,
      executorRef: "agent:blocked-applier",
      patch: indexImportPatch(),
    })).rejects.toThrow("candidate already has an active controlled correction apply");
    expect(await readFile(
      join(fixture.candidateRoot, "db/schema.ts"),
      "utf8",
    )).toBe(beforeSchema);
  } finally {
    await fixture.dispose();
  }
});

async function correctionFixture(label: string): Promise<{
  readonly home: string;
  readonly missionId: string;
  readonly inputId: string;
  readonly inputEventId: string;
  readonly runnerRoot: string;
  readonly candidateRoot: string;
  readonly head: string;
  readonly failedSubject: readonly { readonly path: string; readonly sha256: string }[];
  readonly cause: {
    readonly effectId: string;
    readonly failedReportRef: string;
    readonly failedReportDigest: string;
  };
  readonly inputWatermark: number;
  readonly inputPayloadDigest: string;
  readonly dispose: () => Promise<void>;
}> {
  const temporary = await mkdtemp(join(tmpdir(), `rosso-controlled-correction-${label}-`));
  const home = join(temporary, "home");
  const candidateRoot = join(temporary, "candidate");
  const missionId = `controlled-correction-${label}`;
  const effectId = `failed-effect-${label}`;
  const inputId = `correction-${label}`;
  const runnerRoot = missionRunnerDirectory(home, missionId);
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
    'import { sqliteTable } from "drizzle-orm/sqlite-core";\nindex("missing-import");\n',
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
    id: inputId,
    actorRef: "principal:test",
    sourceRef: "decision:051-treatment-b-prototype",
    payload: {
      kind: "correction",
      correctionId: inputId,
      instruction: "Import index without changing any other candidate path.",
      cause: { effectId, failedReportRef, failedReportDigest },
      subject: { gitHead: head, files: failedSubject },
      scope: { writePaths: ["db/schema.ts"], externalDisclosure: "none" },
      plannedVerificationRef: `local-correction-report:${inputId}`,
      authority: {
        commit: "withheld",
        merge: "withheld",
        publish: "withheld",
        productAcceptance: "withheld",
      },
    },
  });

  return {
    home,
    missionId,
    inputId,
    inputEventId: receipt.eventId,
    runnerRoot,
    candidateRoot,
    head,
    failedSubject,
    cause: { effectId, failedReportRef, failedReportDigest },
    inputWatermark: receipt.watermark,
    inputPayloadDigest: receipt.payloadDigest,
    dispose: async () => await rm(temporary, { recursive: true, force: true }),
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

function multiPathPatch(): string {
  return [
    indexImportPatch().trimEnd(),
    "diff --git a/package-lock.json b/package-lock.json",
    "--- a/package-lock.json",
    "+++ b/package-lock.json",
    "@@ -1 +1 @@",
    "-{}",
    '+{"changed":true}',
    "",
  ].join("\n");
}

function git(root: string, arguments_: readonly string[]): void {
  const result = Bun.spawnSync(["git", "-C", root, ...arguments_]);
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
}

function gitText(root: string, arguments_: readonly string[]): string {
  const result = Bun.spawnSync(["git", "-C", root, ...arguments_]);
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}

function digest(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function deadProcessId(): number {
  for (const candidate of [999_999, 888_888, 777_777]) {
    try {
      process.kill(candidate, 0);
    } catch (error) {
      if (
        typeof error === "object"
        && error !== null
        && "code" in error
        && (error as { code?: unknown }).code === "ESRCH"
      ) {
        return candidate;
      }
    }
  }
  throw new Error("test requires one unused process id");
}
