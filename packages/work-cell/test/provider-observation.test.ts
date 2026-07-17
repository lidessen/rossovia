import { expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { captureClaudeStatusline, observeClaude } from "../src/providers/claude-observer";
import { observeCodex } from "../src/providers/codex-observer";
import { discoverProviderCredentials } from "../src/provider-profile";

test("provider discovery exposes credential references without selecting or revealing values", () => {
  const candidates = discoverProviderCredentials({
    OPENCODE_API_KEY: "secret-go",
    KIMI_CODE_API_KEY: "secret-kimi",
  });

  expect(candidates).toEqual([
    {
      provider: "opencode-go",
      label: "OpenCode Go",
      credential: { source: "env", name: "OPENCODE_API_KEY" },
      present: true,
    },
    {
      provider: "kimi-coding",
      label: "Kimi Coding Plan",
      credential: { source: "env", name: "KIMI_CODE_API_KEY" },
      present: true,
    },
    {
      provider: "deepseek",
      label: "DeepSeek API",
      credential: { source: "env", name: "DEEPSEEK_API_KEY" },
      present: false,
    },
  ]);
  expect(JSON.stringify(candidates)).not.toContain("secret-go");
  expect(JSON.stringify(candidates)).not.toContain("secret-kimi");
});

test("Codex and Claude normalize token-free local quota observations without claiming the cache is live auth", async () => {
  const codex = await observeCodex({
    now: () => new Date("2026-07-16T12:00:00Z"),
    exchange: async () => ({
      rateLimits: {
        primary: { usedPercent: 81, windowDurationMins: 10_080, resetsAt: 1_784_780_221 },
        secondary: null,
      },
    }),
  });
  expect(codex).toMatchObject({
    provider: "codex",
    availability: { status: "available" },
    quota: {
      freshness: "current",
      windows: [{ id: "primary", label: "1w", usedPercent: 81, remainingPercent: 19 }],
    },
    evidence: [{ source: "Codex app-server account/rateLimits/read", authority: "local-runtime" }],
  });

  const claude = await observeClaude({
    now: () => new Date("2026-07-16T12:00:00Z"),
    authStatus: async () => ({ loggedIn: true, subscriptionType: "pro" }),
    rateLimitsPath: "/projected/claude-rate-limits.json",
    readRateLimits: async () => ({
      version: "work-cell.claude-rate-limits-cache.v1",
      capturedAt: "2026-07-16T11:58:00.000Z",
      rateLimits: {
        five_hour: { used_percentage: 60, resets_at: 1_780_678_200 },
        seven_day: { used_percentage: 52, resets_at: 1_780_804_800 },
      },
    }),
  });
  expect(claude).toMatchObject({
    provider: "claude",
    availability: { status: "available" },
    quota: {
      freshness: "stale",
      observedAt: "2026-07-16T11:58:00.000Z",
      windows: [
        { id: "five-hour", label: "5h", usedPercent: 60, remainingPercent: 40 },
        { id: "seven-day", label: "7d", usedPercent: 52, remainingPercent: 48 },
      ],
    },
    evidence: [
      { kind: "auth", authority: "local-runtime" },
      { kind: "quota", authority: "local-cache", observedAt: "2026-07-16T11:58:00.000Z" },
    ],
  });
});

test("Claude statusline capture writes only the normalized rate-limit projection", async () => {
  let written: unknown;
  const path = `/tmp/work-cell-claude-capture-${crypto.randomUUID()}.json`;
  try {
    const empty = await captureClaudeStatusline({ rate_limits: {} }, { path });
    expect(empty.captured).toBe(false);
    expect(await Bun.file(path).exists()).toBe(false);

    const result = await captureClaudeStatusline({
      model: { display_name: "Claude" },
      transcript_path: "/private/session.jsonl",
      rate_limits: {
        five_hour: { used_percentage: 20, resets_at: "2026-07-16T15:00:00Z" },
      },
    }, { path, now: () => new Date("2026-07-16T12:00:00Z") });
    written = await Bun.file(path).json();
    expect(result.captured).toBe(true);
    expect(written).toEqual({
      version: "work-cell.claude-rate-limits-cache.v1",
      capturedAt: "2026-07-16T12:00:00.000Z",
      rateLimits: {
        five_hour: { used_percentage: 20, resets_at: "2026-07-16T15:00:00Z" },
      },
    });
    expect(JSON.stringify(written)).not.toContain("transcript_path");
  } finally {
    await rm(path, { force: true });
  }
});
