import { afterEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initializeHome } from "../src/home";
import type { StrictTaskAttemptEvidence } from "../src/task-attempts";
import {
  legacyDogfoodReviewLogPath,
  OBSERVER_CONTEXT_MAX_BYTES,
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
        { at: "2026-08-21T00:00:01.000Z", type: `${"trace-".repeat(60)}started`, data: { private: "trace data" } },
        { at: "2026-08-21T00:00:02.000Z", type: `${"trace-".repeat(60)}finished`, data: { private: "trace data" } },
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
      sessionId: { present: true },
      providerFingerprintStanding: { standing: "observed" },
    },
    trace: {
      eventCount: 2,
      typeCountsEncoding: "list-no-key-collision",
      typeKeyCollision: true,
      typeCountsTruncated: false,
      firstAt: "2026-08-21T00:00:01.000Z",
      lastAt: "2026-08-21T00:00:02.000Z",
    },
  });
  expect(context.final).not.toHaveProperty("finalText");
  expect(context.final).not.toHaveProperty("rawSteps");
  expect(context.final.trace).not.toHaveProperty("data");
  expect(context.final.trace.typeCounts).toHaveLength(2);
  expect(context.final.trace.typeCounts.every((entry: { truncated: boolean }) => entry.truncated)).toBe(true);
  expect(context.final.trace.typeCounts[0].typeIdentity)
    .not.toBe(context.final.trace.typeCounts[1].typeIdentity);
  expect(JSON.stringify(context)).not.toContain("private original");
  expect(JSON.stringify(context)).not.toContain('"private":"provider step"');
  expect(JSON.stringify(context)).not.toContain('"private":"trace data"');
  expect(context.limitation).toContain("original input/result payloads");
});

test("workflow observer exposes only metadata for an explicitly declared structured result", () => {
  const context = JSON.parse(workflowObserverContext({
    standing: "available",
    input: {
      intent: "private intent",
      instructions: ["private instruction"],
      acceptance: ["private acceptance"],
      capabilities: [],
      capabilitiesRequired: [],
      outputSchema: {
        type: "object",
        properties: {
          relation: { type: "string" },
          proposal: { type: "string" },
        },
      },
      workspace: {
        root: "/private/worktree",
        readPaths: [],
        writePaths: [],
        excludePaths: [],
        allowedCommands: [],
      },
    },
    finalRecord: {
      runId: "run-structured",
      finalText: "private raw final text",
      rawSteps: [{ secret: "private provider step" }],
      output: {
        relation: "counterexample",
        proposal: "Inspect the reconnect race before changing retry policy.",
        "secret-field-name": "structured-but-explicit-sentinel",
      },
      status: "passed",
      workspaceDiff: { added: [], changed: [], removed: [] },
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 },
      verification: { passed: true, terminal: { passed: true, required: [], called: [] } },
      executionObservation: {},
      trace: [],
    },
    refs: {
      inputRef: "state/input.json",
      attemptRef: "state/attempt.json",
      finalRecordRef: "state/final.json",
      settlementRef: "state/settlement.json",
    },
  } as unknown as StrictTaskAttemptEvidence));

  expect(context.final.structuredOutput).toMatchObject({
    declared: true,
    present: true,
    valid: false,
    visibility: "metadata-only",
    shape: { fieldCount: 3, fieldCountCapped: false, truncated: false },
  });
  expect(context.final).not.toHaveProperty("finalText");
  expect(context.final).not.toHaveProperty("rawSteps");
  expect(JSON.stringify(context)).not.toContain("private raw final text");
  expect(JSON.stringify(context)).not.toContain("private provider step");
  expect(JSON.stringify(context)).not.toContain("Inspect the reconnect race");
  expect(JSON.stringify(context)).not.toContain("structured-but-explicit-sentinel");
  expect(JSON.stringify(context)).not.toContain("secret-field-name");
  expect(context.limitation).toContain("Declared structured output exposes metadata only");
});

test("workflow observer bounds structured shape work and canonicalizes metadata digests", () => {
  const build = (output: Record<string, unknown>, schema: Record<string, unknown>) => JSON.parse(workflowObserverContext({
    standing: "available",
    input: {
      intent: "intent",
      instructions: ["instruction"],
      acceptance: ["acceptance"],
      capabilities: [],
      capabilitiesRequired: [],
      outputSchema: schema,
      workspace: { root: "/worktree", readPaths: [], writePaths: [], excludePaths: [], allowedCommands: [] },
    },
    finalRecord: {
      runId: "run-structured",
      finalText: "",
      rawSteps: [],
      output,
      status: "passed",
      workspaceDiff: { added: [], changed: [], removed: [] },
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 },
      verification: { passed: true, terminal: { passed: true, required: [], called: [] }, output: { passed: true, errors: [] } },
      executionObservation: {},
      trace: [],
    },
    refs: { inputRef: "i", attemptRef: "a", finalRecordRef: "f", settlementRef: "s" },
  } as unknown as StrictTaskAttemptEvidence));
  const left = build({ alpha: "a", beta: { nested: true } }, { type: "object", properties: { alpha: { type: "string" }, beta: { type: "object" } } });
  const right = build({ beta: { nested: true }, alpha: "a" }, { properties: { beta: { type: "object" }, alpha: { type: "string" } }, type: "object" });
  expect(left.final.structuredOutput.schemaDigest).toBe(right.final.structuredOutput.schemaDigest);
  expect(left.final.structuredOutput.valueDigest).toBe(right.final.structuredOutput.valueDigest);

  const manyFields = Object.fromEntries(Array.from({ length: 2_000 }, (_, index) => [`field-${index}`, index]));
  const bounded = build(manyFields, { type: "object" });
  expect(bounded.final.structuredOutput.shape.fieldCountCapped).toBe(true);
  expect(bounded.truncatedFields).toContain("final.structuredOutput.shape");

  const ascending = Object.fromEntries(Array.from({ length: 40 }, (_, index) => [`field-${String(index).padStart(2, "0")}`, index]));
  const descending = Object.fromEntries(Object.entries(ascending).reverse());
  expect(build(ascending, { type: "object" }).final.structuredOutput.valueDigest)
    .toBe(build(descending, { type: "object" }).final.structuredOutput.valueDigest);
});

test("workflow observer does not invent a structured result surface without outputSchema", () => {
  const context = JSON.parse(workflowObserverContext({
    standing: "available",
    input: {
      intent: "intent",
      instructions: ["instruction"],
      acceptance: ["acceptance"],
      capabilities: [],
      capabilitiesRequired: [],
      workspace: { root: "/worktree", readPaths: [], writePaths: [], excludePaths: [], allowedCommands: [] },
    },
    finalRecord: {
      runId: "run-plain",
      finalText: "plain result",
      rawSteps: [],
      output: { should: "remain hidden" },
      status: "passed",
      workspaceDiff: { added: [], changed: [], removed: [] },
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 },
      verification: { passed: true, terminal: { passed: true, required: [], called: [] } },
      executionObservation: {},
      trace: [],
    },
    refs: { inputRef: "i", attemptRef: "a", finalRecordRef: "f", settlementRef: "s" },
  } as unknown as StrictTaskAttemptEvidence));

  expect(context.final).not.toHaveProperty("structuredOutput");
  expect(JSON.stringify(context)).not.toContain("should");
});

test("workflow observer context makes execution observations explicit and visibly bounds identities", () => {
  const longValue = `provider-${"x".repeat(400)}`;
  const context = JSON.parse(workflowObserverContext({
    standing: "available",
    finalRecord: {
      runId: "run-1",
      finalText: "",
      rawSteps: [],
      status: "passed",
      workspaceDiff: { added: [], changed: [], removed: [] },
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 },
      verification: { passed: true, terminal: { passed: true, required: [], called: [] } },
      executionObservation: {
        sessionId: longValue,
        providerFingerprint: longValue,
        providerFingerprintStanding: { standing: "observed" },
        workEstimateId: longValue,
        executionProfileId: longValue,
        priceRevision: longValue,
      },
      trace: [],
    },
    refs: {
      inputRef: "state/input.json",
      attemptRef: "state/attempt.json",
      finalRecordRef: "state/final.json",
      settlementRef: "state/settlement.json",
    },
  } as unknown as StrictTaskAttemptEvidence));

  const observation = context.final.executionObservation;
  expect(observation).toMatchObject({
    sessionId: { present: true, truncated: true, characterCount: longValue.length },
    providerFingerprint: { present: true, truncated: true, characterCount: longValue.length },
    providerFingerprintStanding: { present: true, standing: "observed" },
    workEstimateId: { present: true, truncated: true, characterCount: longValue.length },
    executionProfileId: { present: true, truncated: true, characterCount: longValue.length },
    priceRevision: { present: true, truncated: true, characterCount: longValue.length },
  });
  expect(observation.sessionId.value).toHaveLength(256);
  expect(observation.sessionId.identity).toStartWith("sha256:");
  expect(JSON.stringify(context)).not.toContain(longValue);
});

test("workflow observer context exposes truncation and enforces a total byte bound", () => {
  const longValue = `private-${"x".repeat(10_000)}`;
  const manyPaths = Array.from({ length: 128 }, (_, index) => `${index}-${longValue}`);
  const context = JSON.parse(workflowObserverContext({
    standing: "available",
    attempt: {
      taskId: longValue,
      taskRevision: 1,
      sourceRevision: 1,
      workerId: longValue,
      driver: longValue,
      model: longValue,
      startedAt: longValue,
    },
    input: {
      intent: longValue,
      instructions: [longValue],
      acceptance: [longValue],
      capabilities: manyPaths,
      capabilitiesRequired: manyPaths,
      workspace: {
        root: longValue,
        readPaths: manyPaths,
        writePaths: manyPaths,
        excludePaths: [],
        allowedCommands: manyPaths,
      },
    },
    settlement: {
      status: "recorded",
      semanticAcceptance: "not-evaluated",
      cellStatus: longValue,
      workCellRunId: longValue,
      error: longValue,
    },
    finalRecord: {
      runId: longValue,
      finalText: longValue,
      rawSteps: [longValue],
      status: "passed",
      workspaceDiff: { added: manyPaths, changed: manyPaths, removed: manyPaths },
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 },
      verification: {
        passed: true,
        terminal: { passed: true, required: manyPaths, called: manyPaths },
      },
      executionObservation: {
        sessionId: longValue,
        providerFingerprint: longValue,
        providerFingerprintStanding: { standing: "observed" },
        workEstimateId: longValue,
        executionProfileId: longValue,
        priceRevision: longValue,
      },
      trace: [
        { at: longValue, type: `${"t".repeat(300)}-a`, data: longValue },
        { at: longValue, type: `${"t".repeat(300)}-b`, data: longValue },
      ],
    },
    refs: {
      inputRef: longValue,
      attemptRef: longValue,
      finalRecordRef: longValue,
      settlementRef: longValue,
    },
    controlRef: longValue,
  } as unknown as StrictTaskAttemptEvidence));

  const serialized = JSON.stringify(context);
  expect(Buffer.byteLength(serialized, "utf8")).toBeLessThanOrEqual(OBSERVER_CONTEXT_MAX_BYTES);
  expect(context.contextTruncated).toBe(true);
  expect(serialized).not.toContain(longValue);
});
