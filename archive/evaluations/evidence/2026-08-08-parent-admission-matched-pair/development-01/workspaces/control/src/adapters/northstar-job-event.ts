import type { JobTransition } from "../domain/job-transition";

export interface NorthstarFinishedEvent {
  type: "job.finished";
  job_id: string;
  occurred_at: string;
  result: {
    outcome: "succeeded" | "failed" | "cancelled";
    retryable?: boolean;
  };
}

export function normalizeFinishedEvent(event: NorthstarFinishedEvent): JobTransition {
  const retryable = event.result.retryable === true;
  return {
    jobId: event.job_id,
    kind: retryable ? "failed" : "succeeded",
    retry: retryable ? "eligible" : "none",
    occurredAt: event.occurred_at,
  };
}
