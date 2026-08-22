import { afterEach, expect, test } from "bun:test";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initializeHome } from "../src/home";
import { createPrincipalTask } from "../src/tasks";
import {
  showPrincipalTaskAttempts,
  showPrincipalTaskAttemptsForTasks,
} from "../src/task-attempts";
import {
  appendWorkflowReview,
  legacyDogfoodReviewLogPath,
  readWorkflowReviews,
  workflowReviewLogPath,
} from "../src/workflow-observer";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

/** One independent Principal task fixture (no git or Worktree required). */
function taskFixture(): { root: string; home: string; taskId: string } {
  const root = mkdtempSync(join(tmpdir(), "rossovia-attempts-query-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  initializeHome(home);
  const created = createPrincipalTask(home, {
    title: "Attempt query fixture",
    objective: "Exercise the read-only attempt projection",
    acceptance: ["The projection stays source-attributable"],
    nextActor: "principal",
    sourceRef: "test:attempts-query",
    expectedSourceRevision: 0,
  });
  return { root, home, taskId: created.task.id };
}

/** Schema-complete immutable CellInput the attempt projection accepts. */
function familyInput(
  taskId: string,
  attemptId: string,
  options: { readonly writePaths?: string[] } = {},
): Record<string, unknown> {
  return {
    id: `workbench-task-${taskId}-attempt-${attemptId}`,
    intent: "goal text",
    workspace: {
      root: "/wt",
      readPaths: ["."],
      writePaths: options.writePaths ?? ["."],
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

/** Schema-complete retained Work Cell final record (ai-sdk-v7 driver). */
function familyFinalRecord(
  taskId: string,
  attemptId: string,
  runId: string,
  input: Record<string, unknown>,
): Record<string, unknown> {
  return {
    version: "work-cell.run.v4",
    runId,
    cellId: `workbench-task-${taskId}-attempt-${attemptId}`,
    driver: { adapter: "ai-sdk-v7", provider: "deepseek", model: "deepseek-v4-flash" },
    startedAt: "2026-08-21T00:00:00.000Z",
    finishedAt: "2026-08-21T00:01:00.000Z",
    durationMs: 60_000,
    status: "passed",
    input,
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

function familySettlement(
  taskId: string,
  attemptId: string,
  options: {
    readonly status?: "recorded" | "runner-failed" | "control-stopped";
    readonly workCellRunId?: string;
    readonly cellStatus?: string;
    readonly error?: string;
  } = {},
): Record<string, unknown> {
  const refs = familyRefs(attemptId);
  return {
    version: "rosso.task-run-settlement.v1",
    taskId,
    taskRevision: 1,
    attemptId,
    inputRef: refs.inputRef,
    finalRecordRef: refs.finalRecordRef,
    status: options.status ?? "recorded",
    semanticAcceptance: "not-evaluated",
    settledAt: "2026-08-21T00:02:00.000Z",
    ...(options.workCellRunId === undefined ? {} : { workCellRunId: options.workCellRunId }),
    ...(options.cellStatus === undefined ? {} : { cellStatus: options.cellStatus }),
    ...(options.error === undefined ? {} : { error: options.error }),
  };
}

function familyRefs(attemptId: string) {
  return {
    inputRef: `state/task-attempts/${attemptId}/cell-input.json`,
    attemptRef: `state/task-attempts/${attemptId}/attempt.json`,
    finalRecordRef: `state/task-attempts/${attemptId}/cell-input.run.json`,
    settlementRef: `state/task-attempts/${attemptId}/settlement.json`,
  };
}

function writeFamily(
  home: string,
  options: {
    readonly taskId: string;
    readonly attemptId: string;
    readonly startedAt?: string;
    readonly parentTool?: {
      name: string;
      parentRunId: string;
      toolCallId: string;
      promptDigest: string;
    };
    readonly readOnly?: boolean;
    readonly writePaths?: string[];
    readonly settlement?: {
      readonly status?: "recorded" | "runner-failed" | "control-stopped";
      readonly workCellRunId?: string;
      readonly cellStatus?: string;
      readonly error?: string;
    } | "none";
    readonly omitFinalRecord?: boolean;
  },
): void {
  const directory = join(home, "state", "task-attempts", options.attemptId);
  mkdirSync(directory, { recursive: true });
  const refs = familyRefs(options.attemptId);
  const input = familyInput(options.taskId, options.attemptId, {
    writePaths: options.writePaths ?? (options.readOnly === true ? [] : ["."]),
  });
  writeFileSync(join(home, refs.inputRef), JSON.stringify(input));
  if (options.omitFinalRecord !== true) {
    writeFileSync(
      join(home, refs.finalRecordRef),
      JSON.stringify(familyFinalRecord(options.taskId, options.attemptId, `run-${options.attemptId}`, input)),
    );
  }
  writeFileSync(join(home, refs.attemptRef), JSON.stringify({
    version: "rosso.task-run-attempt.v1",
    taskId: options.taskId,
    taskRevision: 1,
    sourceRevision: 0,
    attemptId: options.attemptId,
    inputRef: refs.inputRef,
    finalRecordRef: refs.finalRecordRef,
    workerId: "deepseek-flash",
    driver: "ai-sdk-v7",
    model: "deepseek-v4-flash",
    ...(options.parentTool === undefined ? {} : { parentTool: options.parentTool }),
    ...(options.readOnly === true ? { access: "read-only" } : {}),
    status: "started",
    startedAt: options.startedAt ?? "2026-08-21T00:00:00.000Z",
  }));
  if (options.settlement === undefined) {
    writeFileSync(
      join(home, refs.settlementRef),
      JSON.stringify(familySettlement(options.taskId, options.attemptId, {
        workCellRunId: `run-${options.attemptId}`,
        cellStatus: "passed",
      })),
    );
  } else if (options.settlement !== "none") {
    writeFileSync(
      join(home, refs.settlementRef),
      JSON.stringify(familySettlement(options.taskId, options.attemptId, options.settlement)),
    );
  }
}

const promptDigest = "a".repeat(64);

test("reconstructs the same-Task parent attempt and its sub_worker children with explicit relations and refs", () => {
  const { home, taskId } = taskFixture();
  const parent = "11111111-1111-4111-8111-111111111111";
  const childA = "22222222-2222-4222-8222-222222222222";
  const childB = "33333333-3333-4333-8333-333333333333";
  const foreignParent = "44444444-4444-4444-8444-444444444444";
  const childOfForeignParent = "55555555-5555-4555-8555-555555555555";
  writeFamily(home, {
    taskId,
    attemptId: parent,
    startedAt: "2026-08-21T00:00:00.000Z",
  });
  writeFamily(home, {
    taskId,
    attemptId: childA,
    startedAt: "2026-08-21T00:05:00.000Z",
    readOnly: true,
    parentTool: { name: "sub_worker", parentRunId: parent, toolCallId: "call-a", promptDigest },
  });
  writeFamily(home, {
    taskId,
    attemptId: childB,
    startedAt: "2026-08-21T00:06:00.000Z",
    readOnly: true,
    parentTool: { name: "sub_worker", parentRunId: parent, toolCallId: "call-b", promptDigest },
  });
  // A child whose parent Run is not retained for this Task: the child still
  // projects its exact parent identity, but no attempt of this Task may
  // claim it as a retained child.
  writeFamily(home, {
    taskId,
    attemptId: childOfForeignParent,
    startedAt: "2026-08-21T00:07:00.000Z",
    readOnly: true,
    parentTool: {
      name: "sub_worker",
      parentRunId: foreignParent,
      toolCallId: "call-x",
      promptDigest,
    },
  });

  for (const projections of [
    showPrincipalTaskAttempts(home, taskId),
    showPrincipalTaskAttemptsForTasks(home, [taskId])[taskId]!,
  ]) {
    expect(projections.map((projection) => projection.attemptId)).toEqual([
      parent,
      childA,
      childB,
      childOfForeignParent,
    ]);
    const byId = new Map(projections.map((projection) => [projection.attemptId, projection]));
    // The parent carries its retained same-Task children explicitly.
    expect(byId.get(parent)?.childAttemptIds).toEqual([childA, childB]);
    // Each child carries the explicit parent identity and the stable
    // evidence ref of the parent attempt record.
    for (const child of [childA, childB]) {
      expect(byId.get(child)).toMatchObject({
        parentTool: { name: "sub_worker", parentRunId: parent },
        parentAttemptId: parent,
        parentAttemptRef: `state/task-attempts/${parent}/attempt.json`,
      });
      expect(byId.get(child)?.childAttemptIds).toBeUndefined();
    }
    // A child bound to a parent outside this Task keeps its exact parent
    // identity without any attempt of this Task claiming it as a child.
    expect(byId.get(childOfForeignParent)?.parentAttemptId).toBe(foreignParent);
    expect(projections.some(
      (projection) => projection.childAttemptIds?.includes(childOfForeignParent),
    )).toBeFalse();
    // Every projection carries the attempt refs of its own evidence family.
    for (const projection of projections) {
      expect(projection).toMatchObject({
        inputRef: `state/task-attempts/${projection.attemptId}/cell-input.json`,
        attemptRef: `state/task-attempts/${projection.attemptId}/attempt.json`,
        finalRecordRef: `state/task-attempts/${projection.attemptId}/cell-input.run.json`,
        settlementRef: `state/task-attempts/${projection.attemptId}/settlement.json`,
      });
    }
  }

  // The queries are read-only: they create no review log and change no
  // attempt evidence.
  expect(existsSync(workflowReviewLogPath(home))).toBeFalse();
  expect(readWorkflowReviews(home)).toEqual([]);
});

test("expresses settlement status, cell status, and semanticAcceptance=not-evaluated together without implying acceptance", () => {
  const { home, taskId } = taskFixture();
  const recorded = "11111111-1111-4111-8111-111111111111";
  const failed = "22222222-2222-4222-8222-222222222222";
  const started = "33333333-3333-4333-8333-333333333333";
  writeFamily(home, { taskId, attemptId: recorded });
  writeFamily(home, {
    taskId,
    attemptId: failed,
    omitFinalRecord: true,
    settlement: {
      status: "runner-failed",
      error: "interrupted before a final Work Cell record was retained",
    },
  });
  writeFamily(home, { taskId, attemptId: started, settlement: "none" });

  const projections = showPrincipalTaskAttempts(home, taskId);
  const byId = new Map(projections.map((projection) => [projection.attemptId, projection]));

  // A settled recorded attempt expresses settlement status, cell status, and
  // the settlement's exact semanticAcceptance together.
  expect(byId.get(recorded)).toMatchObject({
    status: "recorded",
    cellStatus: "passed",
    semanticAcceptance: "not-evaluated",
    settledAt: "2026-08-21T00:02:00.000Z",
  });
  // A runner-failed attempt keeps its settlement status and the unevaluated
  // semantic acceptance with no invented cell status.
  expect(byId.get(failed)).toMatchObject({
    status: "runner-failed",
    semanticAcceptance: "not-evaluated",
  });
  expect(byId.get(failed)).not.toHaveProperty("cellStatus");
  // A started attempt has no settlement: no semanticAcceptance is claimed.
  expect(byId.get(started)).toMatchObject({ status: "started" });
  expect(byId.get(started)).not.toHaveProperty("semanticAcceptance");
  expect(byId.get(started)).not.toHaveProperty("settledAt");
});

test("joins the existing observer review log per attempt and states explicit absence without fabricating", () => {
  const { home, taskId } = taskFixture();
  const reviewed = "11111111-1111-4111-8111-111111111111";
  const legacyReviewed = "22222222-2222-4222-8222-222222222222";
  const unreviewed = "33333333-3333-4333-8333-333333333333";
  writeFamily(home, { taskId, attemptId: reviewed });
  writeFamily(home, { taskId, attemptId: legacyReviewed });
  writeFamily(home, { taskId, attemptId: unreviewed });

  appendWorkflowReview(home, {
    version: "rossovia.workflow-review.v1",
    reviewId: "review-recorded",
    recordedAt: "2026-08-21T00:03:00.000Z",
    subject: { type: "workflow-task-attempt", taskId, attemptId: reviewed },
    observer: { kind: "agent", workerId: "deepseek-flash" },
    standing: "recorded",
    evidenceRefs: [`state/task-attempts/${reviewed}/attempt.json`],
    finding: "finding",
    subjectOutcome: {
      settlementStatus: "recorded",
      cellStatus: "passed",
      finalStatus: "passed",
      semanticAcceptance: "not-evaluated",
    },
  });
  appendWorkflowReview(home, {
    version: "rossovia.workflow-review.v1",
    reviewId: "review-gap",
    recordedAt: "2026-08-21T00:04:00.000Z",
    subject: { type: "workflow-task-attempt", taskId, attemptId: reviewed },
    observer: { kind: "agent", workerId: "deepseek-flash" },
    standing: "query-gap",
    evidenceRefs: [],
    finding: "query gap",
  });

  for (const projections of [
    showPrincipalTaskAttempts(home, taskId),
    showPrincipalTaskAttemptsForTasks(home, [taskId])[taskId]!,
  ]) {
    const byId = new Map(projections.map((projection) => [projection.attemptId, projection]));
    // The reviewed attempt carries every existing record's reviewId/standing
    // and the record's own subjectOutcome summary.
    expect(byId.get(reviewed)?.observerReview).toEqual({
      standing: "available",
      logRef: workflowReviewLogPath(home),
      reviews: [
        {
          reviewId: "review-recorded",
          standing: "recorded",
          recordedAt: "2026-08-21T00:03:00.000Z",
          subjectOutcome: {
            settlementStatus: "recorded",
            cellStatus: "passed",
            finalStatus: "passed",
            semanticAcceptance: "not-evaluated",
          },
        },
        {
          reviewId: "review-gap",
          standing: "query-gap",
          recordedAt: "2026-08-21T00:04:00.000Z",
        },
      ],
    });
    // No review record for this attempt yet: the explicit absence is stated.
    expect(byId.get(legacyReviewed)?.observerReview).toEqual({ standing: "none" });
    expect(byId.get(unreviewed)?.observerReview).toEqual({ standing: "none" });
  }

  // A legacy dogfood review record joins through the existing reader's
  // normalization, without any fabricated subjectOutcome (the legacy record
  // retains none). The logRef names every retained review-log source.
  writeFileSync(
    legacyDogfoodReviewLogPath(home),
    `${JSON.stringify({
      version: "rosso.dogfood-review.v1",
      reviewId: "review-legacy",
      recordedAt: "2026-08-21T00:05:00.000Z",
      subject: { type: "dogfood-task-attempt", taskId, attemptId: legacyReviewed },
      observer: { kind: "agent", workerId: "deepseek-flash" },
      standing: "recorded",
      evidenceRefs: [],
      finding: "legacy finding",
    })}\n`,
  );
  const joinedLogRef = [
    workflowReviewLogPath(home),
    legacyDogfoodReviewLogPath(home),
  ].join(",");
  for (const projections of [
    showPrincipalTaskAttempts(home, taskId),
    showPrincipalTaskAttemptsForTasks(home, [taskId])[taskId]!,
  ]) {
    const byId = new Map(projections.map((projection) => [projection.attemptId, projection]));
    expect(byId.get(legacyReviewed)?.observerReview).toEqual({
      standing: "available",
      logRef: joinedLogRef,
      reviews: [{
        reviewId: "review-legacy",
        standing: "recorded",
        recordedAt: "2026-08-21T00:05:00.000Z",
      }],
    });
    expect(byId.get(unreviewed)?.observerReview).toEqual({ standing: "none" });
  }

  // A malformed review-log record fails the join closed: every attempt
  // projects invalid-log and no review is claimed.
  appendFileSync(workflowReviewLogPath(home), "not-json\n", "utf8");
  for (const projection of showPrincipalTaskAttempts(home, taskId)) {
    expect(projection.observerReview.standing).toBe("invalid-log");
    if (projection.observerReview.standing === "invalid-log") {
      expect(projection.observerReview.reason).toContain("invalid");
    }
  }
});
