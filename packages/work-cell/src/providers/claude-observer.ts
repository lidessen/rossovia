import { execFile } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import {
  ProviderObservationSchema,
  type ProviderObservation,
  type QuotaWindow,
} from "../provider-observation";

const execFileAsync = promisify(execFile);

const AuthStatusSchema = z.object({
  loggedIn: z.boolean(),
}).loose();

const CachedWindowSchema = z.object({
  used_percentage: z.number().min(0).max(100),
  resets_at: z.union([z.number(), z.string()]),
}).loose();

const RateLimitsSchema = z.object({
  five_hour: CachedWindowSchema.optional(),
  seven_day: CachedWindowSchema.optional(),
}).loose();

const NonEmptyRateLimitsSchema = RateLimitsSchema.refine(
  (limits) => limits.five_hour !== undefined || limits.seven_day !== undefined,
  { message: "at least one Claude rate-limit window is required" },
);

const ClaudeRateLimitsCacheSchema = z.object({
  version: z.literal("work-cell.claude-rate-limits-cache.v1"),
  capturedAt: z.iso.datetime(),
  rateLimits: NonEmptyRateLimitsSchema,
});

const ClaudeStatuslineInputSchema = z.object({
  rate_limits: RateLimitsSchema.optional(),
}).loose();

export interface ObserveClaudeOptions {
  authStatus?: () => Promise<unknown>;
  rateLimitsPath?: string;
  readRateLimits?: (path: string) => Promise<unknown | undefined>;
  now?: () => Date;
  command?: string;
  timeoutMs?: number;
}

export async function observeClaude(
  options: ObserveClaudeOptions = {},
): Promise<ProviderObservation> {
  const observedAt = (options.now ?? (() => new Date()))().toISOString();
  const authStatus = AuthStatusSchema.parse(await (
    options.authStatus ?? (() => readClaudeAuthStatus(options.command ?? "claude", options.timeoutMs ?? 10_000))
  )());
  const evidence: ProviderObservation["evidence"] = [{
    kind: "auth",
    source: "Claude Code auth status",
    authority: "local-runtime",
  }];
  let quota: ProviderObservation["quota"];
  const rateLimitsPath = options.rateLimitsPath ?? defaultClaudeRateLimitsPath();
  {
    const read = options.readRateLimits ?? readRateLimitsFile;
    const rawCache = await read(rateLimitsPath);
    const cached = rawCache === undefined ? undefined : ClaudeRateLimitsCacheSchema.parse(rawCache);
    if (cached) {
      const capturedAt = new Date(cached.capturedAt);
      const parsed = cached.rateLimits;
      const windows = [
        cachedWindow("five-hour", "5h", 300, parsed.five_hour),
        cachedWindow("seven-day", "7d", 10_080, parsed.seven_day),
      ].filter((window): window is QuotaWindow => window !== undefined);
      quota = {
        freshness: cacheFreshness(capturedAt, windows, new Date(observedAt)),
        observedAt: capturedAt.toISOString(),
        windows,
      };
      evidence.push({
        kind: "quota",
        source: rateLimitsPath,
        authority: "local-cache",
        observedAt: capturedAt.toISOString(),
      });
    }
  }
  return ProviderObservationSchema.parse({
    version: "work-cell.provider-observation.v1",
    provider: "claude",
    observedAt,
    availability: authStatus.loggedIn
      ? { status: "available" }
      : { status: "unavailable", reason: "Claude Code is not authenticated" },
    ...(quota ? { quota } : {}),
    evidence,
  });
}

function cacheFreshness(
  modifiedAt: Date,
  windows: QuotaWindow[],
  now: Date,
): "cached" | "stale" {
  const shortestWindowMinutes = Math.min(...windows.map((window) => window.durationMinutes ?? Number.POSITIVE_INFINITY));
  const olderThanShortestWindow = Number.isFinite(shortestWindowMinutes)
    && now.getTime() - modifiedAt.getTime() > shortestWindowMinutes * 60_000;
  const everyResetPassed = windows.length > 0
    && windows.every((window) => window.resetAt && Date.parse(window.resetAt) <= now.getTime());
  return olderThanShortestWindow || everyResetPassed ? "stale" : "cached";
}

async function readClaudeAuthStatus(command: string, timeoutMs: number): Promise<unknown> {
  const { stdout } = await execFileAsync(command, ["auth", "status", "--json"], {
    timeout: timeoutMs,
    maxBuffer: 64 * 1024,
  });
  return JSON.parse(stdout);
}

async function readRateLimitsFile(path: string): Promise<unknown | undefined> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
    if (code === "ENOENT") return undefined;
    throw error;
  }
}

export function defaultClaudeRateLimitsPath(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const cacheHome = environment.XDG_CACHE_HOME?.trim() || resolve(homedir(), ".cache");
  return resolve(cacheHome, "work-cell", "claude-rate-limits.json");
}

export async function captureClaudeStatusline(
  input: unknown,
  options: { path?: string; now?: () => Date } = {},
): Promise<{ captured: boolean; path: string }> {
  const parsed = ClaudeStatuslineInputSchema.parse(input);
  const path = options.path ?? defaultClaudeRateLimitsPath();
  if (
    !parsed.rate_limits
    || (parsed.rate_limits.five_hour === undefined && parsed.rate_limits.seven_day === undefined)
  ) {
    return { captured: false, path };
  }
  const cache = ClaudeRateLimitsCacheSchema.parse({
    version: "work-cell.claude-rate-limits-cache.v1",
    capturedAt: (options.now ?? (() => new Date()))().toISOString(),
    rateLimits: parsed.rate_limits,
  });
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(cache, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
  return { captured: true, path };
}

function cachedWindow(
  id: string,
  label: string,
  durationMinutes: number,
  window: z.infer<typeof CachedWindowSchema> | undefined,
): QuotaWindow | undefined {
  if (!window) return undefined;
  const resetAt = typeof window.resets_at === "number"
    ? new Date(window.resets_at * 1_000).toISOString()
    : new Date(window.resets_at).toISOString();
  return {
    id,
    label,
    durationMinutes,
    usedPercent: window.used_percentage,
    remainingPercent: Math.max(0, 100 - window.used_percentage),
    resetAt,
  };
}
