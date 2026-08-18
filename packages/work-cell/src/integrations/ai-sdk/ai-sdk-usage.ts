import type { CellUsage } from "../../contracts";

export function normalizeAiSdkUsage(
  usage: unknown,
  providerMetadata?: unknown,
): CellUsage {
  const record = asRecord(usage);
  const totalInputTokens = numberValue(record.inputTokens) || numberValue(record.promptTokens);
  const outputTokens = numberValue(record.outputTokens) || numberValue(record.completionTokens);
  const details = asRecord(record.inputTokenDetails);
  const cacheReadTokens = numberValue(details.cacheReadTokens);
  const providerCacheHits = providerCacheReadTokens(providerMetadata);
  const cachedInputTokens = cacheReadTokens || providerCacheHits;

  // AI SDK v7 reports `inputTokens` as the *total* input. The non-cache
  // portion is either explicit (`noCacheTokens`) or must be derived from the
  // total when cache-read tokens are reported separately. Pi/harness paths that
  // already emit separated input/cacheRead categories pass through unchanged
  // because they do not provide cache evidence here.
  const explicitNoCache = optionalNumber(details.noCacheTokens);
  let inputTokens: number;
  if (explicitNoCache !== undefined) {
    inputTokens = explicitNoCache;
  } else if (cachedInputTokens > 0) {
    inputTokens = Math.max(0, totalInputTokens - cachedInputTokens);
  } else {
    inputTokens = totalInputTokens;
  }

  const providerTotal = optionalNumber(record.totalTokens);
  const totalTokens = providerTotal !== undefined && providerTotal > 0
    ? providerTotal
    : inputTokens + outputTokens + cachedInputTokens;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    cachedInputTokens,
  };
}

function providerCacheReadTokens(metadata: unknown): number {
  for (const value of Object.values(asRecord(metadata))) {
    const count = numberValue(asRecord(value).promptCacheHitTokens);
    if (count > 0) return count;
  }
  return 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function numberValue(value: unknown): number {
  return optionalNumber(value) ?? 0;
}
