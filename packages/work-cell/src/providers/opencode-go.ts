import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { APICallError, type LanguageModelV4 } from "@ai-sdk/provider";
import type { ModelRouteFailure } from "../model-route";

export const OPENCODE_GO_PROVIDER_ID = "opencode-go";
export const OPENCODE_GO_BASE_URL = "https://opencode.ai/zen/go/v1";

export const openCodeGoFlashPricing = {
  inputPerMillionUsd: 0.14,
  cachedInputPerMillionUsd: 0.0028,
  outputPerMillionUsd: 0.28,
  source: "https://opencode.ai/docs/go/",
  revision: "2026-07-16",
};

export function createOpenCodeGoModel(options: {
  apiKey: string;
  model: string;
  baseURL?: string;
}): LanguageModelV4 {
  const provider = createOpenAICompatible({
    name: OPENCODE_GO_PROVIDER_ID,
    apiKey: options.apiKey,
    baseURL: options.baseURL ?? OPENCODE_GO_BASE_URL,
    includeUsage: true,
    supportsStructuredOutputs: true,
    transformRequestBody: adaptOpenCodeGoRequestBody,
  });
  return provider(options.model);
}

export function adaptOpenCodeGoRequestBody(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const responseFormat = asRecord(body.response_format);
  const jsonSchema = asRecord(responseFormat.json_schema).schema;
  if (responseFormat.type !== "json_schema" || jsonSchema === undefined) {
    return { ...body, thinking: { type: "disabled" } };
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  return {
    ...body,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "Return exactly one valid JSON object matching the following JSON Schema.",
          "Do not wrap it in Markdown or add prose outside the object.",
          JSON.stringify(jsonSchema),
        ].join("\n"),
      },
      ...messages,
    ],
    thinking: { type: "disabled" },
  };
}

export function classifyOpenCodeGoFailure(
  error: unknown,
  context: { signal?: AbortSignal },
): ModelRouteFailure | undefined {
  if (context.signal?.aborted || isAbortError(error)) return undefined;
  if (!APICallError.isInstance(error)) return undefined;
  const status = error.statusCode;
  if (
    status === undefined
    || error.isRetryable
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
