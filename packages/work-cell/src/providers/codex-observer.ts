import { spawn } from "node:child_process";
import { z } from "zod";
import {
  ProviderObservationSchema,
  type ProviderObservation,
  type QuotaWindow,
} from "../provider-observation";

const RateLimitWindowSchema = z.object({
  usedPercent: z.number().min(0).max(100),
  windowDurationMins: z.number().positive(),
  resetsAt: z.number().nonnegative(),
});

const RateLimitsResultSchema = z.object({
  rateLimits: z.object({
    primary: RateLimitWindowSchema.nullable(),
    secondary: RateLimitWindowSchema.nullable(),
  }).loose(),
}).loose();

export interface ObserveCodexOptions {
  exchange?: () => Promise<unknown>;
  now?: () => Date;
  command?: string;
  timeoutMs?: number;
}

export async function observeCodex(
  options: ObserveCodexOptions = {},
): Promise<ProviderObservation> {
  const observedAt = (options.now ?? (() => new Date()))().toISOString();
  const exchange = options.exchange ?? (() => exchangeWithCodexAppServer(
    options.command ?? "codex",
    options.timeoutMs ?? 10_000,
  ));
  const result = RateLimitsResultSchema.parse(await exchange());
  const windows = [
    quotaWindow("primary", result.rateLimits.primary),
    quotaWindow("secondary", result.rateLimits.secondary),
  ].filter((window): window is QuotaWindow => window !== undefined);
  return ProviderObservationSchema.parse({
    version: "work-cell.provider-observation.v1",
    provider: "codex",
    observedAt,
    availability: { status: "available" },
    quota: { freshness: "current", windows },
    evidence: [{
      kind: "quota-and-auth",
      source: "Codex app-server account/rateLimits/read",
      authority: "local-runtime",
    }],
  });
}

function quotaWindow(
  id: "primary" | "secondary",
  window: z.infer<typeof RateLimitWindowSchema> | null,
): QuotaWindow | undefined {
  if (!window) return undefined;
  return {
    id,
    label: durationLabel(window.windowDurationMins),
    durationMinutes: window.windowDurationMins,
    usedPercent: window.usedPercent,
    remainingPercent: Math.max(0, 100 - window.usedPercent),
    resetAt: new Date(window.resetsAt * 1_000).toISOString(),
  };
}

function durationLabel(minutes: number): string {
  if (minutes % (7 * 24 * 60) === 0) return `${minutes / (7 * 24 * 60)}w`;
  if (minutes % (24 * 60) === 0) return `${minutes / (24 * 60)}d`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}m`;
}

async function exchangeWithCodexAppServer(command: string, timeoutMs: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, ["app-server"], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => finish(new Error(`Codex app-server quota probe timed out after ${timeoutMs}ms`)), timeoutMs);

    const finish = (error?: Error, value?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      if (error) reject(error);
      else resolve(value);
    };

    child.on("error", (error) => finish(error));
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
      const lines = stdout.split("\n");
      stdout = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        let message: unknown;
        try { message = JSON.parse(line); } catch { continue; }
        if (!message || typeof message !== "object" || !("id" in message) || message.id !== 2) continue;
        if ("error" in message && message.error) {
          finish(new Error(`Codex app-server quota probe failed: ${JSON.stringify(message.error)}`));
          return;
        }
        finish(undefined, "result" in message ? message.result : undefined);
        return;
      }
    });
    child.on("exit", (code) => {
      if (!settled) finish(new Error(`Codex app-server exited with ${code}: ${stderr.trim() || "no response"}`));
    });

    const messages = [
      {
        method: "initialize",
        id: 1,
        params: {
          clientInfo: {
            name: "work_cell_provider_observer",
            title: "Work Cell Provider Observer",
            version: "0.1.0",
          },
        },
      },
      { method: "initialized" },
      { method: "account/rateLimits/read", id: 2, params: {} },
    ];
    child.stdin.write(`${messages.map((message) => JSON.stringify(message)).join("\n")}\n`);
  });
}
