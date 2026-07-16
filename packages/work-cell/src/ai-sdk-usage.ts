import type { CellUsage } from "./contracts";

export function normalizeAiSdkUsage(
  usage: unknown,
  providerMetadata?: unknown,
): CellUsage {
  const record = asRecord(usage);
  const inputTokens = numberValue(record.inputTokens) || numberValue(record.promptTokens);
  const outputTokens = numberValue(record.outputTokens) || numberValue(record.completionTokens);
  return {
    inputTokens,
    outputTokens,
    totalTokens: numberValue(record.totalTokens) || inputTokens + outputTokens,
    cachedInputTokens:
      numberValue((record.inputTokenDetails as { cacheReadTokens?: unknown } | null | undefined)?.cacheReadTokens)
      || providerCacheReadTokens(providerMetadata),
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

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
