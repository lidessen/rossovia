import {
  createMoonshotAI,
  type MoonshotAILanguageModelOptions,
  type MoonshotAIProviderSettings,
} from "@ai-sdk/moonshotai";
import {
  APICallError,
  type LanguageModelV4,
  type LanguageModelV4CallOptions,
  type LanguageModelV4Middleware,
} from "@ai-sdk/provider";
import { defaultSettingsMiddleware, wrapLanguageModel } from "ai";
import type { ModelRouteFailure } from "../model-route";

export const KIMI_CODING_PROVIDER_ID = "kimi-coding";
export const KIMI_CODING_BASE_URL = "https://api.kimi.com/coding/v1";
export const KIMI_CODING_DEFAULT_MODEL = "kimi-for-coding";

/** Mirrors the Moonshot provider's native response-format capability gate. */
export function kimiCodingSupportsNativeStructuredOutput(model: string): boolean {
  return model.startsWith("kimi-k");
}

const kimiCodingProviderOptions = {
  moonshotai: {
    thinking: { type: "enabled" },
    reasoningHistory: "interleaved",
  } satisfies MoonshotAILanguageModelOptions,
};

/**
 * Kimi's thinking models accept only automatic or disabled tool selection.
 * Work Cell still verifies its terminal contract after the model call, so this
 * compatibility translation cannot turn a missing terminal call into success.
 */
export function adaptKimiCodingToolChoice(
  params: LanguageModelV4CallOptions,
): LanguageModelV4CallOptions {
  if (params.toolChoice?.type !== "required" && params.toolChoice?.type !== "tool") {
    return params;
  }
  return { ...params, toolChoice: { type: "auto" } };
}

export function adaptKimiCodingRequest(
  params: LanguageModelV4CallOptions,
): LanguageModelV4CallOptions {
  const adapted = adaptKimiCodingToolChoice(params);
  // The Coding Plan endpoint currently rejects every other temperature for
  // both its stable aliases and explicitly selected models such as k3. Keep
  // this endpoint-owned transport constraint outside generic callers, many of
  // which deliberately request temperature 0 for validation work.
  return { ...adapted, temperature: 1 };
}

function kimiCodingRequestMiddleware(): LanguageModelV4Middleware {
  return {
    specificationVersion: "v4",
    transformParams: async ({ params }) => adaptKimiCodingRequest(params),
  };
}

export function createKimiCodingModel(options: {
  apiKey: string;
  model?: string;
  baseURL?: string;
  fetch?: MoonshotAIProviderSettings["fetch"];
}): LanguageModelV4 {
  const model = options.model ?? KIMI_CODING_DEFAULT_MODEL;
  const provider = createMoonshotAI({
    apiKey: options.apiKey,
    baseURL: options.baseURL ?? KIMI_CODING_BASE_URL,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });
  return wrapLanguageModel({
    model: provider(model),
    middleware: [
      defaultSettingsMiddleware({
        settings: { providerOptions: kimiCodingProviderOptions },
      }),
      kimiCodingRequestMiddleware(),
    ],
  });
}

export function classifyKimiCodingFailure(
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
  if (status === 401) return "authentication_or_plan_access";
  if (status === 402) return "membership_unavailable";
  if (status === 403 || status === 429) return "quota_or_rate_limit";
  if (status === 408) return "timeout";
  if (status !== undefined && status >= 500) return "provider_unavailable";
  return "transport_or_retryable_provider_error";
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
