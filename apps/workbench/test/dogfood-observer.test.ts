import { afterEach, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initializeHome } from "../src/home";
import { dogfoodReviewLogPath, readDogfoodReviews, runDogfoodObserver } from "../src/dogfood-observer";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test("observer records a standard-API query gap without starting a worker", async () => {
  const root = mkdtempSync(join(tmpdir(), "rossovia-dogfood-observer-"));
  temporaryRoots.push(root);
  initializeHome(root);

  const result = await runDogfoodObserver({
    home: root,
    attemptId: "00000000-0000-0000-0000-000000000000",
    workerId: "deepseek-flash",
  });

  expect(result.standing).toBe("query-gap");
  expect(result.logRef).toBe("state/dogfood-reviews.jsonl");
  const logPath = dogfoodReviewLogPath(root);
  expect(existsSync(logPath)).toBe(true);
  const record = JSON.parse(readFileSync(logPath, "utf8").trim()) as {
    standing: string;
    finding: string;
    observer: { workerId: string };
  };
  expect(record.standing).toBe("query-gap");
  expect(record.finding).toContain("standard attempt API");
  expect(record.observer.workerId).toBe("deepseek-flash");
  expect(readDogfoodReviews(root)).toHaveLength(1);
});

test("observer records a malformed attempt reference as a query gap", async () => {
  const root = mkdtempSync(join(tmpdir(), "rossovia-dogfood-observer-invalid-"));
  temporaryRoots.push(root);
  initializeHome(root);

  const result = await runDogfoodObserver({
    home: root,
    attemptId: "../../../outside-home",
    workerId: "deepseek-flash",
  });

  expect(result.standing).toBe("query-gap");
  expect(readFileSync(dogfoodReviewLogPath(root), "utf8")).toContain("task attempt path escapes Rossovia home");
});
