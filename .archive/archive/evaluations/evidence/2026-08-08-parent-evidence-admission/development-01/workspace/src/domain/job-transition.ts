export interface JobTransition {
  jobId: string;
  kind: "succeeded" | "failed" | "cancelled";
  retry: "none" | "eligible";
  occurredAt: string;
}
