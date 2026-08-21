import { afterEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initializeHome } from "../src/home";
import type { StrictTaskAttemptEvidence } from "../src/task-attempts";
import {
  legacyDogfoodReviewLogPath,
  readWorkflowReviews,
  runWorkflowObserver,
  workflowObserverContext,
  workflowReviewLogPath,
  workflowReviewReadPaths,
} from "../src/workflow-observer";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test("workflow observer records a standard-API query gap without starting a worker", async () => {
  const root = mkdtempSync(join(tmpdir(), "rossovia-workflow-observer-"));
  temporaryRoots.push(root);
  initializeHome(root);

  const result = await runWorkflowObserver({
    home: root,
    attemptId: "00000000-0000-0000-0000-000000000000",
    workerId: "deepseek-flash",
  });

  expect(result.standing).toBe("query-gap");
  expect(result.logRef).toBe("state/workflow-reviews.jsonl");
  const logPath = workflowReviewLogPath(root);
  expect(existsSync(logPath)).toBe(true);
  const record = JSON.parse(readFileSync(logPath, "utf8").trim()) as {
    standing: string;
    finding: string;
    observer: { workerId: string };
  };
  expect(record.standing).toBe("query-gap");
  expect(record.finding).toContain("standard attempt API");
  expect(record.observer.workerId).toBe("deepseek-flash");
  expect(readWorkflowReviews(root)).toHaveLength(1);
});

test("workflow observer records a malformed attempt reference as a query gap", async () => {
  const root = mkdtempSync(join(tmpdir(), "rossovia-workflow-observer-invalid-"));
  temporaryRoots.push(root);
  initializeHome(root);

  const result = await runWorkflowObserver({
    home: root,
    attemptId: "../../../outside-home",
    workerId: "deepseek-flash",
  });

  expect(result.standing).toBe("query-gap");
  expect(readFileSync(workflowReviewLogPath(root), "utf8")).toContain("task attempt path escapes Rossovia home");
});

test("workflow observer reads the legacy dogfood log without writing it", () => {
  const root = mkdtempSync(join(tmpdir(), "rossovia-workflow-observer-legacy-"));
  temporaryRoots.push(root);
  mkdirSync(join(root, "state"), { recursive: true });
  writeFileSync(legacyDogfoodReviewLogPath(root), `${JSON.stringify({
    version: "rosso.dogfood-review.v1",
    reviewId: "legacy-review",
    recordedAt: new Date().toISOString(),
    subject: { type: "dogfood-task-attempt", attemptId: "legacy-attempt" },
    observer: { kind: "agent", workerId: "deepseek-flash" },
    standing: "recorded",
    evidenceRefs: ["legacy-ref"],
    finding: "legacy finding",
  })}\n`);

  expect(readWorkflowReviews(root)).toEqual([
    expect.objectContaining({
      version: "rossovia.workflow-review.v1",
      reviewId: "legacy-review",
      finding: "legacy finding",
      subject: { type: "workflow-task-attempt", attemptId: "legacy-attempt" },
    }),
  ]);
  expect(workflowReviewReadPaths(root)).toEqual([legacyDogfoodReviewLogPath(root)]);
  expect(existsSync(workflowReviewLogPath(root))).toBe(false);
});

test("workflow observer context exposes bounded terminal evidence without raw payloads", () => {
  const context = JSON.parse(workflowObserverContext({
    standing: "available",
    attempt: {
      taskId: "task-1",
      taskRevision: 3,
      sourceRevision: 2,
      workerId: "deepseek-flash",
      driver: "ai-sdk-v7",
      model: "deepseek-v4-flash",
      startedAt: "2026-08-21T00:00:00.000Z",
    },
    input: {
      intent: "private original intent",
      instructions: ["private original instruction"],
      acceptance: ["private original acceptance"],
      capabilities: ["browser"],
      capabilitiesRequired: ["browser"],
      workspace: {
        root: "/private/worktree",
        readPaths: ["src"],
        writePaths: ["src"],
        excludePaths: [],
        allowedCommands: ["bun"],
      },
    },
    settlement: {
      status: "recorded",
      semanticAcceptance: "not-evaluated",
      cellStatus: "passed",
      workCellRunId: "run-1",
      error: "private settlement error",
    },
    finalRecord: {
      runId: "run-1",
      finalText: "private original result",
      rawSteps: [{ private: "provider step" }],
      status: "passed",
      workspaceDiff: { added: ["new.ts"], changed: ["changed.ts"], removed: [] },
      usage: { inputTokens: 10, outputTokens: 4, totalTokens: 14, cachedInputTokens: 0 },
      verification: {
        passed: true,
        terminal: { passed: true, required: ["bun"], called: ["bun"] },
        output: { passed: false, errors: ["private output error"] },
        tasks: {
          passed: true,
          pending: 0,
          inProgress: 0,
          completed: 1,
          blocked: 0,
          errors: [],
        },
      },
      executionObservation: {
        sessionId: "session-1",
        providerFingerprint: "fingerprint-1",
        providerFingerprintStanding: { standing: "observed" },
        executionProfileId: "deepseek-flash",
      },
      trace: [
        { at: "2026-08-21T00:00:01.000Z", type: "cell.started", data: { private: "trace data" } },
        { at: "2026-08-21T00:00:02.000Z", type: "cell.finished", data: { private: "trace data" } },
      ],
    },
    refs: {
      inputRef: "state/input.json",
      attemptRef: "state/attempt.json",
      finalRecordRef: "state/final.json",
      settlementRef: "state/settlement.json",
    },
    controlRef: "state/control.json",
  } as unknown as StrictTaskAttemptEvidence));

  expect(context.input).toMatchObject({
    intentPresent: true,
    instructionCount: 1,
    acceptanceCount: 1,
    capabilities: { values: ["browser"], truncated: false },
  });
  expect(context.input).not.toHaveProperty("intent");
  expect(context.input).not.toHaveProperty("instructions");
  expect(context.input).not.toHaveProperty("acceptance");
  expect(context.final).toMatchObject({
    result: { present: true, characterCount: 23, lineCount: 1 },
    verification: {
      passed: true,
      terminal: { passed: true, required: { values: ["bun"] }, called: { values: ["bun"] } },
      output: { passed: false, errorCount: 1 },
      tasks: { passed: true, completed: 1, errorCount: 0 },
    },
    executionObservation: {
      sessionId: "session-1",
      providerFingerprintStanding: { standing: "observed" },
    },
    trace: {
      eventCount: 2,
      typeCounts: { "cell.finished": 1, "cell.started": 1 },
      firstAt: "2026-08-21T00:00:01.000Z",
      lastAt: "2026-08-21T00:00:02.000Z",
    },
  });
  expect(context.final).not.toHaveProperty("finalText");
  expect(context.final).not.toHaveProperty("rawSteps");
  expect(context.final.trace).not.toHaveProperty("data");
  expect(JSON.stringify(context)).not.toContain("private original");
  expect(JSON.stringify(context)).not.toContain('"private":"provider step"');
  expect(JSON.stringify(context)).not.toContain('"private":"trace data"');
  expect(context.limitation).toContain("original input/result payloads");
});
