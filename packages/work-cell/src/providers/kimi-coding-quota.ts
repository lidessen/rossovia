import { z } from "zod";
import {
  ProviderObservationSchema,
  renderProviderObservation,
  type ProviderObservation,
  type QuotaWindow,
} from "../provider-observation";
import { KIMI_CODING_BASE_URL, KIMI_CODING_PROVIDER_ID } from "./kimi-coding";

const NumericFieldSchema = z.union([z.number(), z.string()]).transform((value, context) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    context.addIssue({ code: "custom", message: "expected a finite percentage value" });
    return z.NEVER;
  }
  return parsed;
});

const UsageDetailSchema = z.object({
  limit: NumericFieldSchema,
  used: NumericFieldSchema.optional(),
  remaining: NumericFieldSchema,
  resetTime: z.string().optional(),
}).loose();

const UsagePayloadSchema = z.object({
  usage: UsageDetailSchema,
  limits: z.array(z.object({
    window: z.object({
      duration: NumericFieldSchema,
      timeUnit: z.string(),
    }).loose(),
    detail: UsageDetailSchema,
  }).loose()).default([]),
  parallel: z.object({ limit: NumericFieldSchema }).loose().optional(),
}).loose();

export interface QueryKimiCodingQuotaOptions {
  apiKey?: string;
  baseURL?: string;
  fetch?: typeof globalThis.fetch;
  now?: () => Date;
  timeoutMs?: number;
}

export async function queryKimiCodingQuota(
  options: QueryKimiCodingQuotaOptions = {},
): Promise<ProviderObservation> {
  const apiKey = options.apiKey ?? process.env.KIMI_CODE_API_KEY;
  if (!apiKey) throw new Error("KIMI_CODE_API_KEY is required for Kimi Coding quota status");

  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const baseURL = (options.baseURL ?? KIMI_CODING_BASE_URL).replace(/\/$/, "");
  const response = await fetchImplementation(`${baseURL}/usages`, {
    signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "work-cell/0.1",
    },
  });
  if (!response.ok) {
    throw new Error(`Kimi Coding quota endpoint returned HTTP ${response.status}`);
  }

  const parsed = UsagePayloadSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error(`Kimi Coding quota endpoint returned an unsupported response: ${z.prettifyError(parsed.error)}`);
  }

  const windows: QuotaWindow[] = [
    quotaWindow("weekly", "Weekly", parsed.data.usage),
    ...parsed.data.limits.map(({ window, detail }) => {
      const durationMinutes = durationInMinutes(window.duration, window.timeUnit);
      return {
        ...quotaWindow("rolling", durationLabel(durationMinutes), detail),
        ...(durationMinutes === undefined ? {} : { durationMinutes }),
      };
    }),
  ];

  return ProviderObservationSchema.parse({
    version: "work-cell.provider-observation.v1",
    provider: KIMI_CODING_PROVIDER_ID,
    observedAt: (options.now ?? (() => new Date()))().toISOString(),
    availability: { status: "available" },
    quota: {
      freshness: "current",
      windows,
      ...(parsed.data.parallel ? { concurrencyLimit: parsed.data.parallel.limit } : {}),
    },
    evidence: [{
      kind: "quota-and-auth",
      source: "experimental Kimi Coding Plan usage endpoint",
      authority: "provider",
    }],
  });
}

export function renderKimiCodingQuota(status: ProviderObservation): string {
  return renderProviderObservation(status);
}

function quotaWindow(
  id: "weekly" | "rolling",
  label: string,
  detail: z.infer<typeof UsageDetailSchema>,
): QuotaWindow {
  const remainingPercent = detail.limit > 0
    ? Math.round(Math.max(0, Math.min(100, detail.remaining / detail.limit * 100)) * 10) / 10
    : 0;
  return {
    id,
    label,
    remainingPercent,
    ...(detail.resetTime ? { resetAt: normalizedDate(detail.resetTime) } : {}),
  };
}

function durationInMinutes(duration: number, unit: string): number | undefined {
  if (unit.includes("MINUTE")) return duration;
  if (unit.includes("HOUR")) return duration * 60;
  if (unit.includes("DAY")) return duration * 24 * 60;
  if (unit.includes("SECOND")) return duration / 60;
  return undefined;
}

function durationLabel(durationMinutes: number | undefined): string {
  if (durationMinutes === undefined) return "Rolling";
  if (durationMinutes % (24 * 60) === 0) return `${durationMinutes / (24 * 60)}d`;
  if (durationMinutes % 60 === 0) return `${durationMinutes / 60}h`;
  return `${durationMinutes}m`;
}

function normalizedDate(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : value;
}
