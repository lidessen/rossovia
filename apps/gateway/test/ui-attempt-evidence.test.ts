import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AutonomyClient } from "../../workbench/src/ui/autonomy-client";
import { initializeHome } from "../../workbench/src/home";
import { readWorkflowReviews, workflowReviewLogPath } from "../../workbench/src/workflow-observer";
import { createWorkbenchRequestHandler } from "../src/ui-server";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const EVIDENCE_ATTEMPT_ID = "11111111-1111-4111-8111-111111111111" as const;

function sha256Hex(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "rossovia-attempt-evidence-endpoint-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  initializeHome(home);
  const origin = "http://127.0.0.1:4317";
  const handler = createWorkbenchRequestHandler({ home, port: 4317, roots: [] }, {} as AutonomyClient);
  return { root, home, origin, handler };
}

function evidenceRefs() {
  return {
    inputRef: `state/task-attempts/${EVIDENCE_ATTEMPT_ID}/cell-input.json`,
    attemptRef: `state/task-attempts/${EVIDENCE_ATTEMPT_ID}/attempt.json`,
    finalRecordRef: `state/task-attempts/${EVIDENCE_ATTEMPT_ID}/cell-input.run.json`,
    settlementRef: `state/task-attempts/${EVIDENCE_ATTEMPT_ID}/settlement.json`,
  };
}

/**
 * Schema-complete immutable CellInput the strict reader accepts: the
 * worker-bound `workerId` and execution profile both match the attempt
 * record's cross-links.
 */
function familyInput(intent: string): Record<string, unknown> {
  return {
    id: `workbench-task-task-1-attempt-${EVIDENCE_ATTEMPT_ID}`,
    intent,
    workspace: {
      root: "/wt",
      readPaths: ["."],
      writePaths: [],
      excludePaths: [],
      allowedCommands: [],
    },
    instructions: ["instr"],
    capabilities: [],
    context: [],
    capabilitiesRequired: [],
    acceptance: ["acc"],
    budget: { maxDurationMs: 300_000, maxCommandOutputBytes: 64_000 },
    workerId: "deepseek-flash",
    executionProfile: {
      id: "deepseek-flash",
      version: "execution-profile.v1",
      provider: "deepseek",
      model: "deepseek-v4-flash",
    },
  };
}

/** Schema-complete retained Work Cell final record fixture (ai-sdk-v7 driver). */
function familyFinalRecord(): Record<string, unknown> {
  return {
    version: "work-cell.run.v4",
    runId: "run-1",
    cellId: `workbench-task-task-1-attempt-${EVIDENCE_ATTEMPT_ID}`,
    driver: { adapter: "ai-sdk-v7", provider: "deepseek", model: "deepseek-v4-flash" },
    startedAt: "2026-08-21T00:00:00.000Z",
    finishedAt: "2026-08-21T00:01:00.000Z",
    durationMs: 60_000,
    status: "passed",
    input: familyInput("goal text"),
    finalText: "result text",
    artifacts: [],
    verification: { passed: true, terminal: { passed: true, required: [], called: [] } },
    workspaceDiff: { added: [], changed: [], removed: [] },
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
    usageByPhase: {
      preparation: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
      execution: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
    },
    executionObservation: {
      providerFingerprint: "fingerprint-1",
      providerFingerprintStanding: { standing: "observed" },
    },
    trace: [],
    rawSteps: [],
  };
}

/**
 * Write one complete strict-read-compatible evidence family for the endpoint
 * fixture. `settlementAsSymlink` writes a symlink to the valid settlement
 * bytes (the strict reader follows it and accepts the family, while the
 * pinned digest read refuses it); `omitSettlement` leaves the terminal
 * settlement absent.
 */
function writeEvidenceFamily(
  home: string,
  options: { settlementAsSymlink?: boolean; omitSettlement?: boolean } = {},
): void {
  const directory = join(home, "state", "task-attempts", EVIDENCE_ATTEMPT_ID);
  mkdirSync(directory, { recursive: true });
  const refs = evidenceRefs();
  writeFileSync(join(home, refs.inputRef), JSON.stringify(familyInput("goal text")));
  writeFileSync(join(home, refs.finalRecordRef), JSON.stringify(familyFinalRecord()));
  writeFileSync(join(home, refs.attemptRef), JSON.stringify({
    version: "rosso.task-run-attempt.v1",
    taskId: "task-1",
    taskRevision: 1,
    sourceRevision: 0,
    attemptId: EVIDENCE_ATTEMPT_ID,
    inputRef: refs.inputRef,
    finalRecordRef: refs.finalRecordRef,
    workerId: "deepseek-flash",
    driver: "ai-sdk-v7",
    model: "deepseek-v4-flash",
    status: "started",
    startedAt: "2026-08-21T00:00:00.000Z",
  }));
  const settlement = JSON.stringify({
    version: "rosso.task-run-settlement.v1",
    taskId: "task-1",
    taskRevision: 1,
    attemptId: EVIDENCE_ATTEMPT_ID,
    inputRef: refs.inputRef,
    finalRecordRef: refs.finalRecordRef,
    status: "recorded",
    semanticAcceptance: "not-evaluated",
    settledAt: "2026-08-21T00:02:00.000Z",
    workCellRunId: "run-1",
    cellStatus: "passed",
  });
  if (options.settlementAsSymlink === true) {
    const target = join(home, "state", "valid-settlement.json");
    writeFileSync(target, settlement);
    symlinkSync(target, join(home, refs.settlementRef));
  } else if (options.omitSettlement !== true) {
    writeFileSync(join(home, refs.settlementRef), settlement);
  }
}

test("GET attempt evidence returns the bounded read-only projection by attempt id", async () => {
  const { home, origin, handler } = fixture();
  writeEvidenceFamily(home);

  const response = await handler(new Request(`${origin}/api/attempts/${EVIDENCE_ATTEMPT_ID}/evidence`));
  expect(response.status).toBe(200);
  const body = await response.json() as Record<string, unknown>;
  expect(body.version).toBe("rossovia.observer-evidence-projection.v1");
  expect(body.standing).toBe("available");
  expect(body.attemptId).toBe(EVIDENCE_ATTEMPT_ID);
  const projection = body.projection as Record<string, any>;
  // The reviewer replays exactly the bounded projection the observer cell
  // sees, including the constant review-only framing.
  expect(projection.reviewProtocol).toMatchObject({
    role: "read-only observer",
    standing: "review-only",
  });
  expect(projection.input).toMatchObject({
    intentPresent: true,
    goal: {
      present: true,
      text: "goal text",
      truncated: false,
      characterCount: 9,
      digest: sha256Hex("goal text"),
    },
    instructionCount: 1,
    instructions: { values: ["instr"], truncated: false },
    acceptanceCount: 1,
    acceptance: { values: ["acc"], truncated: false },
  });
  expect(projection.final).toMatchObject({
    runId: "run-1",
    status: "passed",
    result: {
      present: true,
      text: "result text",
      truncated: false,
      characterCount: 11,
      lineCount: 1,
      digest: sha256Hex("result text"),
    },
    workspaceDiff: {
      added: { values: [], truncated: false },
      changed: { values: [], truncated: false },
      removed: { values: [], truncated: false },
    },
    trace: { eventCount: 0, typeCounts: {}, typeCountsTruncated: false },
    rawStepCount: 0,
    errorPresent: false,
  });
  expect(projection.evidence).toMatchObject({
    inputRef: `state/task-attempts/${EVIDENCE_ATTEMPT_ID}/cell-input.json`,
    attemptRef: `state/task-attempts/${EVIDENCE_ATTEMPT_ID}/attempt.json`,
    finalRecordRef: `state/task-attempts/${EVIDENCE_ATTEMPT_ID}/cell-input.run.json`,
    settlementRef: `state/task-attempts/${EVIDENCE_ATTEMPT_ID}/settlement.json`,
    digestAlgorithm: "sha256",
    textSnippetLimit: 2048,
  });
  // The file-byte digest binds the exact retained source bytes on disk.
  const inputBytes = readFileSync(join(home, `state/task-attempts/${EVIDENCE_ATTEMPT_ID}/cell-input.json`));
  expect(projection.evidence.inputFileDigest).toBe(sha256Hex(inputBytes));
  // Raw provider steps, trace payloads, and untruncated payloads never
  // appear in the response.
  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain('"rawSteps"');
  expect(serialized).not.toContain('"finalText"');
  expect(serialized).not.toContain('"private"');
});

test("attempt evidence endpoint fails closed for missing and non-canonical attempt ids without leaking paths", async () => {
  const { home, origin, handler } = fixture();
  const missing = await handler(new Request(`${origin}/api/attempts/00000000-0000-4000-8000-000000000000/evidence`));
  expect(missing.status).toBe(404);
  expect(await missing.json()).toMatchObject({
    version: "rossovia.observer-evidence-projection.v1",
    standing: "unavailable",
    projection: null,
    reason: expect.stringContaining("no attempt evidence"),
  });

  // Non-canonical ids — including a percent-encoded path-traversal shape and
  // a malformed percent-encoding — fail closed at the boundary before any
  // reader or filesystem access, and the raw id is never echoed back.
  for (const encodedAttemptId of ["not-a-uuid", "..%2F..%2Foutside-home", "%zz"]) {
    const response = await handler(new Request(`${origin}/api/attempts/${encodedAttemptId}/evidence`));
    expect(response.status).toBe(400);
    const body = await response.json() as Record<string, unknown>;
    expect(body).toMatchObject({
      version: "rossovia.observer-evidence-projection.v1",
      standing: "invalid-attempt-id",
      projection: null,
      reason: expect.stringContaining("canonical UUID"),
    });
    expect(JSON.stringify(body)).not.toContain("outside-home");
    expect(JSON.stringify(body)).not.toContain("..");
  }
});

test("attempt evidence endpoint fails closed for invalid, incomplete, and unverifiable evidence", async () => {
  const invalid = fixture();
  writeEvidenceFamily(invalid.home);
  writeFileSync(
    join(invalid.home, "state", "task-attempts", EVIDENCE_ATTEMPT_ID, "settlement.json"),
    "not json",
  );
  const invalidResponse = await invalid.handler(new Request(
    `${invalid.origin}/api/attempts/${EVIDENCE_ATTEMPT_ID}/evidence`,
  ));
  expect(invalidResponse.status).toBe(422);
  expect(await invalidResponse.json()).toMatchObject({ standing: "invalid" });

  const incomplete = fixture();
  writeEvidenceFamily(incomplete.home, { omitSettlement: true });
  const incompleteResponse = await incomplete.handler(new Request(
    `${incomplete.origin}/api/attempts/${EVIDENCE_ATTEMPT_ID}/evidence`,
  ));
  expect(incompleteResponse.status).toBe(422);
  expect(await incompleteResponse.json()).toMatchObject({ standing: "incomplete" });

  const unverifiable = fixture();
  writeEvidenceFamily(unverifiable.home, { settlementAsSymlink: true });
  const unverifiableResponse = await unverifiable.handler(new Request(
    `${unverifiable.origin}/api/attempts/${EVIDENCE_ATTEMPT_ID}/evidence`,
  ));
  expect(unverifiableResponse.status).toBe(422);
  expect(await unverifiableResponse.json()).toMatchObject({ standing: "unverifiable" });
});

test("attempt evidence endpoint never mutates review state or retained evidence and accepts no write methods", async () => {
  const { home, origin, handler } = fixture();
  writeEvidenceFamily(home);
  const attemptDirectory = join(home, "state", "task-attempts", EVIDENCE_ATTEMPT_ID);
  const expectedEntries = ["attempt.json", "cell-input.json", "cell-input.run.json", "settlement.json"];

  await handler(new Request(`${origin}/api/attempts/${EVIDENCE_ATTEMPT_ID}/evidence`));
  await handler(new Request(`${origin}/api/attempts/00000000-0000-4000-8000-000000000000/evidence`));
  await handler(new Request(`${origin}/api/attempts/not-a-uuid/evidence`));

  // Read-only queries create no review state and change no review log.
  expect(existsSync(workflowReviewLogPath(home))).toBe(false);
  expect(readWorkflowReviews(home)).toEqual([]);
  // The retained evidence directory keeps exactly the family files the
  // fixture wrote.
  expect(readdirSync(attemptDirectory).sort()).toEqual(expectedEntries);

  // Only the standard GET surface exists: write methods fail closed at 405.
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const response = await handler(new Request(
      `${origin}/api/attempts/${EVIDENCE_ATTEMPT_ID}/evidence`,
      { method },
    ));
    expect(response.status).toBe(405);
  }
  // Write attempts leave the retained evidence family untouched.
  expect(readdirSync(attemptDirectory).sort()).toEqual(expectedEntries);
});
