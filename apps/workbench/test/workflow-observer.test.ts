import { afterEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initializeHome } from "../src/home";
import {
  legacyDogfoodReviewLogPath,
  readWorkflowReviews,
  runWorkflowObserver,
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
