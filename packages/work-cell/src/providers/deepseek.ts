import { createDeepSeek, type DeepSeekLanguageModelOptions } from "@ai-sdk/deepseek";
import {
  APICallError,
  type LanguageModelV4,
  type LanguageModelV4CallOptions,
  type LanguageModelV4GenerateResult,
  type LanguageModelV4Middleware,
  type LanguageModelV4StreamPart,
  type LanguageModelV4StreamResult,
} from "@ai-sdk/provider";
import { defaultSettingsMiddleware, wrapLanguageModel } from "ai";
import { z } from "zod";
import type { ModelRouteFailure } from "../model-route";

export const DEEPSEEK_PROVIDER_ID = "deepseek";

export const DeepSeekInferencePolicySchema = z.discriminatedUnion("thinking", [
  z.object({ thinking: z.literal("disabled") }).strict(),
  z.object({
    thinking: z.literal("enabled"),
    reasoningEffort: z.enum(["low", "high", "xhigh", "max"]),
  }).strict(),
]);

export type DeepSeekInferencePolicy = z.infer<typeof DeepSeekInferencePolicySchema>;

export function deepSeekProviderOptions(
  policy: DeepSeekInferencePolicy = { thinking: "disabled" },
): { deepseek: DeepSeekLanguageModelOptions } {
  return {
    deepseek: {
      thinking: { type: policy.thinking },
      ...(policy.thinking === "enabled" ? { reasoningEffort: policy.reasoningEffort } : {}),
    },
  };
}

/**
 * DeepSeek thinking mode supports tools but rejects forced tool selection.
 * Work Cell still verifies the terminal or structured-settlement contract, so
 * lowering a forced choice to auto changes transport compatibility, not
 * acceptance authority.
 */
export function adaptDeepSeekToolChoice(
  params: LanguageModelV4CallOptions,
  policy: DeepSeekInferencePolicy,
): LanguageModelV4CallOptions {
  if (
    policy.thinking !== "enabled"
    || (params.toolChoice?.type !== "required" && params.toolChoice?.type !== "tool")
  ) {
    return params;
  }
  return { ...params, toolChoice: { type: "auto" } };
}

export function deepSeekRequestMiddleware(
  policy: DeepSeekInferencePolicy,
): LanguageModelV4Middleware {
  return {
    specificationVersion: "v4",
    transformParams: async ({ type, params }) => ({
      ...adaptDeepSeekToolChoice(params, policy),
      ...(type === "stream" ? { includeRawChunks: true } : {}),
    }),
    wrapGenerate: async ({ doGenerate }) => retainGeneratedFingerprint(await doGenerate()),
    wrapStream: async ({ doStream }) => retainStreamedFingerprint(await doStream()),
  };
}

function retainGeneratedFingerprint(
  result: LanguageModelV4GenerateResult,
): LanguageModelV4GenerateResult {
  const fingerprint = readDeepSeekFingerprint(result.response?.body);
  return fingerprint
    ? { ...result, providerMetadata: withDeepSeekFingerprint(result.providerMetadata, fingerprint) }
    : result;
}

function retainStreamedFingerprint(
  result: LanguageModelV4StreamResult,
): LanguageModelV4StreamResult {
  let fingerprint: string | undefined;
  return {
    ...result,
    stream: result.stream.pipeThrough(new TransformStream<LanguageModelV4StreamPart, LanguageModelV4StreamPart>({
      transform(part, controller) {
        if (part.type === "raw") {
          fingerprint ??= readDeepSeekFingerprint(part.rawValue);
          return;
        }
        if (part.type === "finish" && fingerprint) {
          controller.enqueue({
            ...part,
            providerMetadata: withDeepSeekFingerprint(part.providerMetadata, fingerprint),
          });
          return;
        }
        controller.enqueue(part);
      },
    })),
  };
}

function readDeepSeekFingerprint(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const fingerprint = "system_fingerprint" in value ? value.system_fingerprint : undefined;
  return typeof fingerprint === "string" && fingerprint.trim() ? fingerprint : undefined;
}

function withDeepSeekFingerprint(
  metadata: LanguageModelV4GenerateResult["providerMetadata"],
  fingerprint: string,
): NonNullable<LanguageModelV4GenerateResult["providerMetadata"]> {
  return {
    ...metadata,
    [DEEPSEEK_PROVIDER_ID]: {
      ...metadata?.[DEEPSEEK_PROVIDER_ID],
      systemFingerprint: fingerprint,
    },
  };
}

export const deepSeekFlashPricing = {
  inputPerMillionUsd: 0.14,
  cachedInputPerMillionUsd: 0.0028,
  outputPerMillionUsd: 0.28,
  source: "https://api-docs.deepseek.com/quick_start/pricing",
  revision: "2026-07-31",
};

export function createDeepSeekModel(options: {
  apiKey: string;
  model: string;
  baseURL?: string;
  inferencePolicy?: DeepSeekInferencePolicy;
}): LanguageModelV4 {
  const inferencePolicy = options.inferencePolicy ?? { thinking: "disabled" };
  const provider = createDeepSeek({
    apiKey: options.apiKey,
    ...(options.baseURL ? { baseURL: options.baseURL } : {}),
  });
  return wrapLanguageModel({
    model: provider(options.model),
    middleware: [
      defaultSettingsMiddleware({
        settings: { providerOptions: deepSeekProviderOptions(inferencePolicy) },
      }),
      deepSeekRequestMiddleware(inferencePolicy),
    ],
  });
}

export function classifyDeepSeekFailure(
  error: unknown,
  context: { signal?: AbortSignal },
): ModelRouteFailure | undefined {
  if (context.signal?.aborted || isAbortError(error)) return undefined;
  if (!APICallError.isInstance(error)) return undefined;
  const status = error.statusCode;
  if (
    status === undefined
    || status === 401
    || status === 402
    || status === 403
    || status === 408
    || status === 429
    || (status !== undefined && status >= 500)
  ) {
    return { reason: classifyStatus(status) };
  }
  return undefined;
}

function classifyStatus(status: number | undefined): string {
  if (status === 401 || status === 403) return "authentication_or_permission";
  if (status === 402 || status === 429) return "quota_or_rate_limit";
  if (status === 408) return "timeout";
  if (status !== undefined && status >= 500) return "provider_unavailable";
  return "transport_or_retryable_provider_error";
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
