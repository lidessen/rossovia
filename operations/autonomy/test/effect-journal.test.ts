import { afterEach, expect, test } from "bun:test";
import { appendFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  FileEffectJournal,
  projectEffectActivity,
  type EffectJournalEventDraft,
  type EffectPreparedData,
  type EffectSettledData,
} from "../src/effect-journal";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("the journal persists one effect lifecycle and reconstructs its safe activity projection", async () => {
  const root = await fixture();
  const journal = new FileEffectJournal(join(root, "journal"), () => "2026-07-26T12:00:00.000Z");

  await journal.prepare("effect-1", prepared());
  await journal.start("effect-1");
  await journal.observeRun("effect-1", "run-1");
  await journal.toolStarted("effect-1", {
    toolCallId: "write-1",
    tool: "write_file",
    path: "src/feature.ts",
  });
  await expect(journal.quiesce("effect-1", {
    reason: "completed",
    activeToolCalls: [],
  })).rejects.toThrow("active tool calls");
  await journal.toolFinished("effect-1", {
    toolCallId: "write-1",
    tool: "write_file",
    path: "src/feature.ts",
    outcome: "written",
  });
  await journal.quiesce("effect-1", {
    reason: "completed",
    activeToolCalls: [],
  });
  await journal.settle("effect-1", settled());
  const verificationEvent = await journal.verify("effect-1", {
    verifierRef: "supervisor:codex",
    verdict: "passed",
    checks: [{
      command: "npm test",
      exitCode: 0,
      outputDigest: "d".repeat(64),
    }],
    evidenceRefs: ["log:effect-1/npm-test"],
  });

  const events = await journal.read("effect-1");
  expect(events.map((event) => [event.sequence, event.type])).toEqual([
    [0, "effect-prepared"],
    [1, "effect-started"],
    [2, "effect-run-observed"],
    [3, "tool-started"],
    [4, "tool-finished"],
    [5, "effect-quiesced"],
    [6, "effect-settled"],
    [7, "effect-verified"],
  ]);

  const activity = projectEffectActivity(events);
  expect(activity).toEqual(expect.objectContaining({
    effectId: "effect-1",
    state: "settled",
    runId: "run-1",
    prepared: expect.objectContaining({
      missionId: "mission-1",
      turnId: "turn-1",
      cellId: "cell-1",
      launchAuthorizationRef: {
        authorizationId: "11111111-1111-4111-8111-111111111111",
        proposalDigest: "e".repeat(64),
        claimSourceRef:
          "state/execution-authorization-claims/11111111-1111-4111-8111-111111111111.json",
      },
      allowedCommands: [],
      authority: "withheld",
    }),
    tools: [{
      toolCallId: "write-1",
      tool: "write_file",
      path: "src/feature.ts",
      status: "finished",
      startedAt: "2026-07-26T12:00:00.000Z",
      finishedAt: "2026-07-26T12:00:00.000Z",
      outcome: "written",
    }],
    settlement: expect.objectContaining({
      patch: {
        ref: "patches/effect-1.diff",
        digest: "c".repeat(64),
      },
      changedPaths: ["src/feature.ts"],
      outsideScope: { verdict: "clear", paths: [] },
      acceptance: expect.objectContaining({
        principal: { verdict: "withheld", evidenceRefs: [] },
      }),
    }),
    independentVerification: {
      verifierRef: "supervisor:codex",
      verdict: "passed",
      checks: [{
        command: "npm test",
        exitCode: 0,
        outputDigest: "d".repeat(64),
      }],
      evidenceRefs: ["log:effect-1/npm-test"],
    },
    independentVerificationEventId: verificationEvent.eventId,
  }));

  const raw = await readFile(journal.effectPath("effect-1"), "utf8");
  expect(raw).toContain("write_file");
  expect(raw).toContain("src/feature.ts");
  expect(raw).not.toContain("file contents");
  expect(raw).not.toContain("hidden reasoning");
});

test("tool observations reject content, unsafe paths, and mismatched safe projections", async () => {
  const root = await fixture();
  const journal = new FileEffectJournal(join(root, "journal"));
  await journal.prepare("effect-safe", prepared());
  await journal.start("effect-safe");
  await journal.observeRun("effect-safe", "run-safe");

  await expect(journal.append({
    effectId: "effect-safe",
    type: "tool-started",
    data: {
      toolCallId: "write-secret",
      tool: "write_file",
      path: "src/secret.ts",
      content: "file contents and hidden reasoning",
    },
  } as unknown as EffectJournalEventDraft)).rejects.toThrow();
  await expect(journal.toolStarted("effect-safe", {
    toolCallId: "write-escape",
    tool: "write_file",
    path: "../outside.ts",
  })).rejects.toThrow("relative path");

  await journal.toolStarted("effect-safe", {
    toolCallId: "write-1",
    tool: "write_file",
    path: "src/feature.ts",
  });
  await expect(journal.toolFinished("effect-safe", {
    toolCallId: "write-1",
    tool: "write_file",
    path: "src/other.ts",
    outcome: "written",
  })).rejects.toThrow("changed its safe projection");

  const raw = await readFile(journal.effectPath("effect-safe"), "utf8");
  expect(raw).not.toContain("file contents");
  expect(raw).not.toContain("hidden reasoning");
  expect(raw).not.toContain("../outside.ts");
});

test("settlement proves its outside-scope verdict and preserves layered acceptance", async () => {
  const root = await fixture();
  const journal = new FileEffectJournal(join(root, "journal"));
  await journal.prepare("effect-scope", prepared());
  await journal.start("effect-scope");
  await journal.observeRun("effect-scope", "run-scope");
  await journal.quiesce("effect-scope", { reason: "completed", activeToolCalls: [] });

  await expect(journal.settle("effect-scope", {
    ...settled(),
    changedPaths: ["src/feature.ts", "README.md"],
    outsideScope: { verdict: "clear", paths: [] },
  })).rejects.toThrow("outside-scope verdict");

  await journal.settle("effect-scope", {
    ...settled(),
    changedPaths: ["src/feature.ts", "README.md"],
    outsideScope: { verdict: "violated", paths: ["README.md"] },
  });
  const activity = await journal.activity("effect-scope");
  expect(activity?.settlement?.acceptance).toEqual({
    mechanical: { verdict: "passed", evidenceRefs: ["test:bun"] },
    independent: { verdict: "not-run", evidenceRefs: [] },
    principal: { verdict: "withheld", evidenceRefs: [] },
  });
});

test("append repairs an incomplete tail and uncertainty leaves unresolved tools visible", async () => {
  const root = await fixture();
  const journal = new FileEffectJournal(join(root, "journal"));
  await journal.prepare("effect-repair", prepared());
  await appendFile(journal.effectPath("effect-repair"), "{\"partial\"", "utf8");
  await journal.start("effect-repair");
  await journal.observeRun("effect-repair", "run-repair");
  expect((await journal.read("effect-repair")).map((event) => event.type)).toEqual([
    "effect-prepared",
    "effect-started",
    "effect-run-observed",
  ]);

  await journal.toolStarted("effect-repair", {
    toolCallId: "write-unknown",
    tool: "write_file",
    path: "src/unknown.ts",
  });
  await journal.uncertain("effect-repair", {
    reason: "process-crash",
    evidenceRefs: ["runtime:disconnect"],
  });
  const activity = await journal.activity("effect-repair");
  expect(activity?.state).toBe("uncertain");
  expect(activity?.tools).toEqual([{
    toolCallId: "write-unknown",
    tool: "write_file",
    path: "src/unknown.ts",
    status: "started",
    startedAt: expect.any(String),
  }]);
  await expect(journal.toolFinished("effect-repair", {
    toolCallId: "write-unknown",
    tool: "write_file",
    path: "src/unknown.ts",
    outcome: "written",
  })).rejects.toThrow("after uncertain");
});

function prepared(): EffectPreparedData {
  return {
    missionId: "mission-1",
    turnId: "turn-1",
    cellId: "cell-1",
    worktree: {
      root: "/workspace/project",
      baseHead: "a".repeat(40),
      baselineDigest: "b".repeat(64),
    },
    writePaths: ["src"],
    allowedCommands: [],
    authority: "withheld",
    launchAuthorizationRef: {
      authorizationId: "11111111-1111-4111-8111-111111111111",
      proposalDigest: "e".repeat(64),
      claimSourceRef:
        "state/execution-authorization-claims/11111111-1111-4111-8111-111111111111.json",
    },
  };
}

function settled(): EffectSettledData {
  return {
    patch: {
      ref: "patches/effect-1.diff",
      digest: "c".repeat(64),
    },
    changedPaths: ["src/feature.ts"],
    outsideScope: { verdict: "clear", paths: [] },
    acceptance: {
      mechanical: { verdict: "passed", evidenceRefs: ["test:bun"] },
      independent: { verdict: "not-run", evidenceRefs: [] },
      principal: { verdict: "withheld", evidenceRefs: [] },
    },
  };
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "effect-journal-"));
  roots.push(root);
  return root;
}
