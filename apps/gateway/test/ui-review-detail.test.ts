import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AutonomyClient } from "../../workbench/src/ui/autonomy-client";
import { initializeHome } from "../../workbench/src/home";
import {
  appendWorkflowReview,
  readWorkflowReviews,
  workflowReviewLogPath,
} from "../../workbench/src/workflow-observer";
import { createWorkbenchRequestHandler } from "../src/ui-server";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "rossovia-review-detail-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  initializeHome(home);
  const origin = "http://127.0.0.1:4317";
  const handler = createWorkbenchRequestHandler({ home, port: 4317, roots: [] }, {} as AutonomyClient);
  return { root, home, origin, handler };
}

// Realistic recorded-opinion shapes: the full markdown review (~4KB+) and a
// long finding that must never reach the compact first screen in full.
const LONG_REVIEW_TEXT =
  "# Review\n\n**首要结论**: " + "evidence narrative ".repeat(400)
  + "\n\n## Evidence\n" + "observed detail ".repeat(200)
  + "\n\n## 限制\n尾部全文不应在首屏出现。";
const LONG_FINDING = "FINDING-HEAD " + "detail ".repeat(300) + " FINDING-TAIL";

function appendRecord(home: string, index: number): void {
  appendWorkflowReview(home, {
    version: "rossovia.workflow-review.v1",
    reviewId: `review-${index}`,
    recordedAt: `2026-08-22T00:${String(index).padStart(2, "0")}:00.000Z`,
    subject: {
      type: "workflow-task-attempt",
      taskId: `task-${index}`,
      attemptId: `attempt-${index}`,
    },
    observer: { kind: "agent", workerId: "deepseek-flash" },
    subjectOutcome: {
      settlementStatus: "recorded",
      cellStatus: "passed",
      finalStatus: "passed",
      semanticAcceptance: "not-evaluated",
    },
    standing: "recorded",
    evidenceRefs: [`state/task-attempts/attempt-${index}/settlement.json`],
    finding: LONG_FINDING,
    reviewText: LONG_REVIEW_TEXT,
  });
}

test("compact snapshot defers every reviewText while the detail route re-reads the exact stored full text", async () => {
  const { home, origin, handler } = fixture();
  for (let index = 0; index < 3; index += 1) appendRecord(home, index);

  const compactResponse = await handler(new Request(`${origin}/api/snapshot?compact=1`));
  expect(compactResponse.status).toBe(200);
  const compact = await compactResponse.json() as Record<string, any>;
  const compactReviews = compact.observerReviews.reviews as Array<Record<string, any>>;
  expect(compactReviews).toHaveLength(3);
  // The compact observer projection never serializes the full reviewText nor
  // the untruncated finding; the first screen keeps every grouping/locating/
  // processing fact plus the bounded summary.
  const compactObserverSerialized = JSON.stringify(compact.observerReviews);
  expect(compactObserverSerialized).not.toContain("reviewText");
  expect(compactObserverSerialized).not.toContain("evidence narrative");
  expect(compactObserverSerialized).not.toContain("FINDING-TAIL");
  for (const review of compactReviews) {
    expect(review.reviewText).toBeUndefined();
    expect(review.reviewId).toBeDefined();
    expect(review.subject.taskId).toBeDefined();
    expect(review.subject.attemptId).toBeDefined();
    expect(review.standing).toBe("recorded");
    expect(review.evidenceRefs).toHaveLength(1);
    expect(review.subjectOutcome.semanticAcceptance).toBe("not-evaluated");
    expect(review.correlation.standing).toBe("invalid-attempt-id");
    // Honest markers: the full text still exists at the detail route, and the
    // bounded summary never pretends to be the full review.
    expect(review.fullTextAvailable).toBeTrue();
    expect(review.findingTruncated).toBeTrue();
    expect(review.finding).toContain("FINDING-HEAD");
    expect(review.finding).not.toContain("FINDING-TAIL");
  }

  // Full authority unchanged: the full snapshot still serializes the exact
  // reviewText of every record.
  const fullResponse = await handler(new Request(`${origin}/api/snapshot`));
  expect(fullResponse.status).toBe(200);
  const full = await fullResponse.json() as Record<string, any>;
  const fullReviews = full.observerReviews.reviews as Array<Record<string, any>>;
  // The full route always returns every stored review in this fixture; the
  // non-null narrowing keeps the index access typecheck-clean under
  // noUncheckedIndexedAccess without changing what is asserted.
  expect(fullReviews[0]!.reviewText).toBe(LONG_REVIEW_TEXT);
  expect(fullReviews[2]!.finding).toBe(LONG_FINDING);
  expect(fullReviews[0]!.fullTextAvailable).toBeUndefined();

  // The detail route re-reads the same append-only source and returns the
  // exact stored record — full text included, never a truncation.
  const detailResponse = await handler(
    new Request(`${origin}/api/reviews/${encodeURIComponent("review-1")}`),
  );
  expect(detailResponse.status).toBe(200);
  const detail = await detailResponse.json() as Record<string, any>;
  expect(detail.version).toBe("rossovia.observer-review-detail-projection.v1");
  expect(detail.standing).toBe("available");
  expect(detail.reviewId).toBe("review-1");
  expect(detail.review.reviewId).toBe("review-1");
  expect(detail.review.reviewText).toBe(LONG_REVIEW_TEXT);
  expect(detail.review.finding).toBe(LONG_FINDING);
  expect(detail.review.subjectOutcome.semanticAcceptance).toBe("not-evaluated");

  // Read-only: the append-only source keeps exactly the three records.
  expect(readWorkflowReviews(home)).toHaveLength(3);
});

test("review detail fails closed and the real payload sizes and timings are recorded", async () => {
  const { home, origin, handler } = fixture();
  for (let index = 0; index < 25; index += 1) appendRecord(home, index);

  const now = () => performance.now();
  const timed = async (path: string) => {
    const start = now();
    const response = await handler(new Request(`${origin}${path}`));
    const body = await response.text();
    return {
      response,
      body,
      ms: now() - start,
      bytes: new TextEncoder().encode(body).byteLength,
    };
  };
  const compact = await timed("/api/snapshot?compact=1");
  const full = await timed("/api/snapshot");
  const detail = await timed("/api/reviews/review-24");
  expect(compact.response.status).toBe(200);
  expect(full.response.status).toBe(200);
  expect(detail.response.status).toBe(200);

  const compactObserverBytes = new TextEncoder().encode(
    JSON.stringify((JSON.parse(compact.body) as Record<string, any>).observerReviews),
  ).byteLength;
  const fullObserverBytes = new TextEncoder().encode(
    JSON.stringify((JSON.parse(full.body) as Record<string, any>).observerReviews),
  ).byteLength;
  // compact 首屏不再携带 25 条全量 reviewText：observer 投影与总 payload 均
  // 严格小于 full；detail 单条响应携带精确全文。
  expect(compactObserverBytes).toBeLessThan(fullObserverBytes);
  expect(compact.bytes).toBeLessThan(full.bytes);
  // The detail body carries the exact stored full text (parsed, so JSON
  // escaping of the stored text is compared on the decoded value).
  const detailBody = JSON.parse(detail.body) as Record<string, any>;
  expect(detailBody.standing).toBe("available");
  expect(detailBody.review.reviewText).toBe(LONG_REVIEW_TEXT);

  // 真实 payload 与 timing 记录（before：compact/full 均携带 25 条 reviewText
  // 约 101KB、总 payload 约 1.10MB；after：compact 按需分离，detail 只读一条）。
  console.log(
    "[payload-record] ",
    JSON.stringify({
      compactTotalBytes: compact.bytes,
      fullTotalBytes: full.bytes,
      detailBytes: detail.bytes,
      compactObserverReviewsBytes: compactObserverBytes,
      fullObserverReviewsBytes: fullObserverBytes,
      reviewCount: 25,
    }),
  );
  console.log(
    "[timing-record] ",
    JSON.stringify({
      compactMs: Number(compact.ms.toFixed(1)),
      fullMs: Number(full.ms.toFixed(1)),
      detailMs: Number(detail.ms.toFixed(1)),
    }),
  );
  for (const record of [compact, full, detail]) {
    expect(Number.isFinite(record.ms)).toBeTrue();
    expect(record.ms).toBeGreaterThanOrEqual(0);
  }

  // Fail-closed standings: malformed id (400, never echoed), unknown id
  // including path-traversal shapes (404, no raw id echo), unreadable store
  // (503, fixed reason only).
  const malformed = await handler(new Request(`${origin}/api/reviews/%zz`));
  expect(malformed.status).toBe(400);
  expect(await malformed.json()).toMatchObject({
    version: "rossovia.observer-review-detail-projection.v1",
    standing: "invalid-review-id",
    review: null,
  });
  const missing = await handler(new Request(`${origin}/api/reviews/not-a-review`));
  expect(missing.status).toBe(404);
  expect(await missing.json()).toMatchObject({ standing: "not-found" });
  const traversal = await handler(new Request(`${origin}/api/reviews/..%2F..%2Foutside-home`));
  expect(traversal.status).toBe(404);
  // Parse the response body exactly once, then assert on the parsed value:
  // a second json() read would consume the already-read body stream.
  const traversalBody = JSON.stringify(await traversal.json());
  expect(traversalBody).not.toContain("outside-home");
  expect(traversalBody).not.toContain("..");

  writeFileSync(workflowReviewLogPath(home), "not a review json line\n", { flag: "a" });
  const unreadable = await handler(new Request(`${origin}/api/reviews/review-1`));
  expect(unreadable.status).toBe(503);
  const unreadableBody = await unreadable.json() as Record<string, any>;
  expect(unreadableBody).toMatchObject({ standing: "unavailable", review: null });
  expect(JSON.stringify(unreadableBody)).not.toContain("not a review json line");

  // Only the GET surface exists: write methods fail closed at 405 and the
  // append-only source is never rewritten by any read (the garbage line and
  // the 25 valid records are still byte-for-byte in place).
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const response = await handler(new Request(
      `${origin}/api/reviews/review-1`,
      { method },
    ));
    expect(response.status).toBe(405);
  }
  expect(readFileSync(workflowReviewLogPath(home), "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")).toHaveLength(26);
  expect(readFileSync(workflowReviewLogPath(home), "utf8")).toContain("not a review json line");
});

test("observer page expands the full review on demand from the same append-only source and never fakes truncation", async () => {
  const app = readFileSync(join(import.meta.dir, "../ui/app.js"), "utf8");
  const generated = readFileSync(join(import.meta.dir, "../src/assets.generated.ts"), "utf8");
  // One builder decides the expansion body: a local reviewText renders
  // inline (full snapshot), compact reviews with honest markers fetch the
  // exact record on demand, everything else keeps the finding fallback.
  expect(app).toContain("function observerReviewFullBodyHtml(review, storedFullText, fullTextDeferred)");
  expect(app).toContain("data-review-full=\"");
  expect(app).toContain("展开完整 review · 按需读取记录源");
  expect(app).toContain("observerReviewFullCache");
  // The on-demand read targets the read-only review detail route and only
  // accepts the exact stored full text; failure renders a fail-closed reason
  // and never presents the summary/truncation as the full review.
  expect(app).toContain("\"/api/reviews/\" + encodeURIComponent(reviewId)");
  expect(app).toContain("记录源未返回完整 review 文本");
  expect(app).toContain("完整 review 读取失败（fail-closed）");
  expect(app).toContain("摘要与截断不冒充全文");
  // The full-snapshot inline expansion and the summary surface stay intact.
  expect(app).toContain("<summary>展开完整 review</summary>");
  expect(app).toContain("observerReviewSummary(reviewText)");
  // The generated asset is byte-current with the ui/ source (spot check for
  // the new on-demand surface; the dedicated generated-assets test compares
  // the whole module byte-for-byte). The generator escapes only backslash,
  // backtick, and ${, so the double quote of the attribute stays unescaped
  // in the embedded template literal — the spot check matches those bytes.
  expect(generated).toContain("data-review-full=\"");
  expect(generated).toContain("observerReviewFullCache");
});
