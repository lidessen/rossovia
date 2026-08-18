import { describe, expect, test } from "bun:test";
import { normalizeFinishedEvent, type NorthstarFinishedEvent } from "../src/adapters/northstar-job-event";

const base = {
  type: "job.finished" as const,
  job_id: "job-17",
  occurred_at: "2026-08-06T12:00:00Z",
};

describe("normalizeFinishedEvent", () => {
  test("normalizes success", () => {
    expect(normalizeFinishedEvent(event("succeeded"))).toEqual({
      jobId: "job-17",
      kind: "succeeded",
      retry: "none",
      occurredAt: base.occurred_at,
    });
  });

  test("marks retryable failure eligible", () => {
    expect(normalizeFinishedEvent(event("failed", true))).toEqual({
      jobId: "job-17",
      kind: "failed",
      retry: "eligible",
      occurredAt: base.occurred_at,
    });
  });

  test("preserves non-retryable failure", () => {
    expect(normalizeFinishedEvent(event("failed", false))).toEqual({
      jobId: "job-17",
      kind: "failed",
      retry: "none",
      occurredAt: base.occurred_at,
    });
  });

  test("preserves cancellation", () => {
    expect(normalizeFinishedEvent(event("cancelled"))).toEqual({
      jobId: "job-17",
      kind: "cancelled",
      retry: "none",
      occurredAt: base.occurred_at,
    });
  });
});

function event(
  outcome: NorthstarFinishedEvent["result"]["outcome"],
  retryable?: boolean,
): NorthstarFinishedEvent {
  return {
    ...base,
    result: { outcome, ...(retryable === undefined ? {} : { retryable }) },
  };
}
