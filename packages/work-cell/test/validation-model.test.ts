import { expect, test } from "bun:test";
import { APICallError, type LanguageModelV4GenerateResult } from "@ai-sdk/provider";
import { generateText } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { createRoutedLanguageModel } from "../src/model-route";
import { normalizeAiSdkUsage } from "../src/ai-sdk-usage";
import {
  adaptOpenCodeGoRequestBody,
  classifyOpenCodeGoFailure,
} from "../src/providers/opencode-go";
import { createValidationModel } from "../src/validation-model";

test("the validation policy declares only routes backed by configured credentials", () => {
  expect(() => createValidationModel({
    opencodeApiKey: "",
    deepSeekApiKey: "",
  })).toThrow("OPENCODE_API_KEY or DEEPSEEK_API_KEY is required for validation");

  expect(createValidationModel({
    opencodeApiKey: "go-key",
    deepSeekApiKey: "",
  }).route).toEqual(["opencode-go"]);

  expect(createValidationModel({
    opencodeApiKey: "",
    deepSeekApiKey: "deepseek-key",
  }).route).toEqual(["deepseek"]);

  expect(createValidationModel({
    opencodeApiKey: "go-key",
    deepSeekApiKey: "deepseek-key",
  }).route).toEqual(["opencode-go", "deepseek"]);
});

test("the OpenCode adapter lowers JSON Schema without losing the schema instruction", () => {
  const adapted = adaptOpenCodeGoRequestBody({
    model: "deepseek-v4-flash",
    messages: [{ role: "user", content: "Return status ok." }],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "response",
        schema: {
          type: "object",
          properties: { status: { type: "string", enum: ["ok"] } },
          required: ["status"],
          additionalProperties: false,
        },
      },
    },
  });

  expect(adapted.response_format).toEqual({ type: "json_object" });
  expect(adapted.thinking).toEqual({ type: "disabled" });
  expect(adapted.messages).toEqual([
    expect.objectContaining({
      role: "system",
      content: expect.stringContaining('"required":["status"]'),
    }),
    { role: "user", content: "Return status ok." },
  ]);
});

test("a generic route does not touch its reserve target when the preferred target succeeds", async () => {
  let reserveCalls = 0;
  const result = await generateText({
    model: createRoutedLanguageModel({
      id: "test-route",
      targets: [
        {
          id: "preferred",
          model: new MockLanguageModelV4({ doGenerate: async () => response("primary") }),
          fallbackOn: () => ({ reason: "unavailable" }),
        },
        {
          id: "reserve",
          model: new MockLanguageModelV4({
            doGenerate: async () => {
              reserveCalls += 1;
              return response("fallback");
            },
          }),
        },
      ],
    }),
    prompt: "route once",
    maxRetries: 0,
  });

  expect(result.text).toBe("primary");
  expect(reserveCalls).toBe(0);
  expect(result.providerMetadata).toMatchObject({
    workCellRoute: {
      routeId: "test-route",
      servedBy: "preferred",
      mode: "preferred",
      attempts: [],
    },
  });
});

test("a target-owned failure policy advances one call and retains the failed attempt", async () => {
  let reserveCalls = 0;
  const result = await generateText({
    model: createRoutedLanguageModel({
      id: "test-route",
      targets: [
        {
          id: "preferred",
          model: new MockLanguageModelV4({
            doGenerate: async () => {
              throw new Error("capacity unavailable");
            },
          }),
          fallbackOn: () => ({ reason: "capacity_unavailable" }),
        },
        {
          id: "reserve",
          model: new MockLanguageModelV4({
            doGenerate: async () => {
              reserveCalls += 1;
              return response("fallback");
            },
          }),
        },
      ],
    }),
    prompt: "route once",
    maxRetries: 0,
  });

  expect(result.text).toBe("fallback");
  expect(reserveCalls).toBe(1);
  expect(result.providerMetadata).toMatchObject({
    workCellRoute: {
      routeId: "test-route",
      servedBy: "reserve",
      mode: "fallback",
      attempts: [{ target: "preferred", reason: "capacity_unavailable" }],
    },
  });
});

test("the generic route never turns cancellation into a reserve call", async () => {
  let reserveCalls = 0;
  const cancelled = new MockLanguageModelV4({
    doGenerate: async () => {
      const error = new Error("cancelled");
      error.name = "AbortError";
      throw error;
    },
  });
  const reserve = new MockLanguageModelV4({
    doGenerate: async () => {
      reserveCalls += 1;
      return response("fallback");
    },
  });

  await expect(generateText({
    model: createRoutedLanguageModel({
      id: "test-route",
      targets: [
        { id: "preferred", model: cancelled, fallbackOn: () => ({ reason: "unavailable" }) },
        { id: "reserve", model: reserve },
      ],
    }),
    prompt: "cancel",
    maxRetries: 0,
  })).rejects.toThrow("cancelled");
  expect(reserveCalls).toBe(0);
});

test("the OpenCode adapter permits quota fallback but keeps an invalid request visible", async () => {
  expect(classifyOpenCodeGoFailure(apiError(429), {})).toEqual({
    reason: "quota_or_rate_limit",
  });
  expect(classifyOpenCodeGoFailure(apiError(400), {})).toBeUndefined();
  expect(classifyOpenCodeGoFailure(apiError(409), {})).toBeUndefined();

  let fallbackCalls = 0;
  const primary = new MockLanguageModelV4({
    doGenerate: async () => {
      throw apiError(400);
    },
  });
  const fallback = new MockLanguageModelV4({
    doGenerate: async () => {
      fallbackCalls += 1;
      return response("fallback");
    },
  });

  await expect(generateText({
    model: createRoutedLanguageModel({
      id: "validation-test",
      targets: [
        { id: "opencode-go", model: primary, fallbackOn: classifyOpenCodeGoFailure },
        { id: "deepseek", model: fallback },
      ],
    }),
    prompt: "invalid request",
    maxRetries: 0,
  })).rejects.toThrow("allowance unavailable");
  expect(fallbackCalls).toBe(0);
});

test("usage normalization reads standard cache details before provider-neutral metadata fallback", () => {
  expect(normalizeAiSdkUsage({
    inputTokens: 100,
    outputTokens: 10,
    totalTokens: 110,
    inputTokenDetails: { cacheReadTokens: 64 },
  }, {
    arbitraryProvider: { promptCacheHitTokens: 32 },
  }).cachedInputTokens).toBe(64);

  expect(normalizeAiSdkUsage({
    promptTokens: 100,
    completionTokens: 10,
  }, {
    arbitraryProvider: { promptCacheHitTokens: 32 },
    workCellRoute: { servedBy: "arbitraryProvider" },
  })).toEqual({
    inputTokens: 100,
    outputTokens: 10,
    totalTokens: 110,
    cachedInputTokens: 32,
  });
});

function apiError(statusCode: number): APICallError {
  return new APICallError({
    message: "allowance unavailable",
    url: "https://opencode.ai/zen/go/v1/chat/completions",
    requestBodyValues: {},
    statusCode,
    isRetryable: statusCode === 429 || statusCode >= 500,
  });
}

function response(text: string): LanguageModelV4GenerateResult {
  return {
    content: [{ type: "text", text }],
    finishReason: { unified: "stop", raw: "stop" },
    usage: {
      inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 1, text: 1, reasoning: 0 },
    },
    warnings: [],
  };
}
