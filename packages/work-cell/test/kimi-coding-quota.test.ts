import { expect, test } from "bun:test";
import {
  queryKimiCodingQuota,
  renderKimiCodingQuota,
} from "../src/providers/kimi-coding-quota";

test("Kimi Coding quota normalizes weekly and rolling percentage windows", async () => {
  const requests: Array<{ url: string; authorization: string | null; userAgent: string | null }> = [];
  const status = await queryKimiCodingQuota({
    apiKey: "kimi-key",
    now: () => new Date("2026-07-16T10:00:00Z"),
    fetch: (async (input, init) => {
      const headers = new Headers(init?.headers);
      requests.push({
        url: String(input),
        authorization: headers.get("authorization"),
        userAgent: headers.get("user-agent"),
      });
      return Response.json({
        usage: {
          limit: "100",
          used: "45",
          remaining: "55",
          resetTime: "2026-07-23T10:00:00Z",
        },
        limits: [{
          window: { duration: 300, timeUnit: "TIME_UNIT_MINUTE" },
          detail: {
            limit: "100",
            remaining: "78",
            resetTime: "2026-07-16T15:00:00Z",
          },
        }],
        parallel: { limit: "20" },
      });
    }) as typeof fetch,
  });

  expect(requests).toEqual([{
    url: "https://api.kimi.com/coding/v1/usages",
    authorization: "Bearer kimi-key",
    userAgent: "work-cell/0.1",
  }]);
  expect(status).toEqual({
    version: "work-cell.provider-observation.v1",
    provider: "kimi-coding",
    observedAt: "2026-07-16T10:00:00.000Z",
    availability: { status: "available" },
    quota: {
      freshness: "current",
      windows: [
        {
          id: "weekly",
          label: "Weekly",
          remainingPercent: 55,
          resetAt: "2026-07-23T10:00:00.000Z",
        },
        {
          id: "rolling",
          label: "5h",
          remainingPercent: 78,
          resetAt: "2026-07-16T15:00:00.000Z",
          durationMinutes: 300,
        },
      ],
      concurrencyLimit: 20,
    },
    evidence: [{
      kind: "quota-and-auth",
      source: "experimental Kimi Coding Plan usage endpoint",
      authority: "provider",
    }],
  });
  expect(renderKimiCodingQuota(status)).toContain("Weekly: 55% remaining");
  expect(renderKimiCodingQuota(status)).toContain("5h: 78% remaining");
});

test("Kimi Coding quota fails visibly when its experimental response changes", async () => {
  await expect(queryKimiCodingQuota({
    apiKey: "kimi-key",
    fetch: (async () => Response.json({ message: "changed" })) as unknown as typeof fetch,
  })).rejects.toThrow("unsupported response");
});

test("Kimi Coding quota requires the Coding Plan credential", async () => {
  await expect(queryKimiCodingQuota({ apiKey: "" })).rejects.toThrow("KIMI_CODE_API_KEY");
});
