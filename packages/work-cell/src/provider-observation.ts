import { z } from "zod";

export const QuotaWindowSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  durationMinutes: z.number().positive().optional(),
  usedPercent: z.number().min(0).max(100).optional(),
  remainingPercent: z.number().min(0).max(100).optional(),
  resetAt: z.iso.datetime().optional(),
}).refine(
  (window) => window.usedPercent !== undefined || window.remainingPercent !== undefined,
  { message: "a quota window must report usedPercent or remainingPercent" },
);

export const ProviderObservationSchema = z.object({
  version: z.literal("work-cell.provider-observation.v1"),
  provider: z.string().min(1),
  observedAt: z.iso.datetime(),
  availability: z.object({
    status: z.enum(["available", "unavailable", "unknown"]),
    reason: z.string().min(1).optional(),
  }),
  quota: z.object({
    freshness: z.enum(["current", "cached", "stale"]),
    observedAt: z.iso.datetime().optional(),
    windows: z.array(QuotaWindowSchema),
    concurrencyLimit: z.number().nonnegative().optional(),
  }).optional(),
  evidence: z.array(z.object({
    kind: z.string().min(1),
    source: z.string().min(1),
    authority: z.enum(["provider", "local-runtime", "local-cache"]),
    observedAt: z.iso.datetime().optional(),
  })).min(1),
});

export type ProviderObservation = z.infer<typeof ProviderObservationSchema>;
export type QuotaWindow = z.infer<typeof QuotaWindowSchema>;

export function renderProviderObservation(observation: ProviderObservation): string {
  const lines = [
    `${observation.provider}: ${observation.availability.status}`,
  ];
  if (observation.availability.reason) {
    lines.push(`Reason: ${observation.availability.reason}`);
  }
  for (const window of observation.quota?.windows ?? []) {
    const percentage = window.remainingPercent !== undefined
      ? `${formatPercent(window.remainingPercent)} remaining`
      : `${formatPercent(window.usedPercent ?? 0)} used`;
    const reset = window.resetAt ? ` · resets ${window.resetAt}` : "";
    lines.push(`${window.label}: ${percentage}${reset}`);
  }
  if (observation.quota) {
    const asOf = observation.quota.observedAt ? ` as of ${observation.quota.observedAt}` : "";
    lines.push(`Quota evidence: ${observation.quota.freshness}${asOf}`);
  }
  if (observation.quota?.concurrencyLimit !== undefined) {
    lines.push(`Concurrency: ${observation.quota.concurrencyLimit}`);
  }
  lines.push(`Observed: ${observation.observedAt}`);
  return lines.join("\n");
}

function formatPercent(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}
