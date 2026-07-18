import { expect, test } from "bun:test";
import {
  APICallError,
  type LanguageModelV4CallOptions,
  type LanguageModelV4GenerateResult,
} from "@ai-sdk/provider";
import { generateText, tool } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { z } from "zod";
import { createRoutedLanguageModel } from "../src/model-route";
import { normalizeAiSdkUsage } from "../src/ai-sdk-usage";
import {
  adaptOpenCodeGoRequestBody,
  classifyOpenCodeGoFailure,
} from "../src/providers/opencode-go";
import {
  adaptKimiCodingToolChoice,
  adaptKimiCodingRequest,
  classifyKimiCodingFailure,
  createKimiCodingModel,
} from "../src/providers/kimi-coding";
import { classifyDeepSeekFailure } from "../src/providers/deepseek";
import {
  createValidationModel,
  validationModelName,
} from "../src/validation-model";
import {
  ProviderProfileSchema,
  type ValidationProviderId,
} from "../src/provider-profile";

const routeTarget = (provider: ValidationProviderId) => ({
  provider,
  credential: { source: "env" as const, name: `${provider.toUpperCase().replaceAll("-", "_")}_TEST_KEY` },
});

test("global credentials do not authorize a route when the provider profile is absent", () => {
  expect(() => createValidationModel({
    providerProfilePath: `/tmp/missing-provider-profile-${crypto.randomUUID()}.json`,
    environment: {
      OPENCODE_API_KEY: "globally-present-but-not-authorized",
      KIMI_CODE_API_KEY: "globally-present-but-not-authorized",
      DEEPSEEK_API_KEY: "globally-present-but-not-authorized",
    },
  })).toThrow("provider profile not found");
});

test("provider profiles reject misspelled execution settings instead of silently using defaults", () => {
  expect(() => ProviderProfileSchema.parse({
    version: "work-cell.provider-profile.v1",
    routes: {
      validation: [{
        provider: "deepseek",
        credential: { source: "env", name: "DEEPSEEK_API_KEY" },
        modle: "deepseek-reasoner",
      }],
    },
  })).toThrow("Unrecognized key");
});

test("the validation policy requires an explicit route backed by its referenced credentials", () => {
  expect(() => createValidationModel({
    route: [routeTarget("opencode-go")],
    opencodeApiKey: "",
  })).toThrow("selected provider opencode-go requires credential");

  const openCodeOnly = createValidationModel({
    route: [routeTarget("opencode-go")],
    opencodeApiKey: "go-key",
  });
  expect(openCodeOnly.route).toEqual(["opencode-go"]);
  expect(openCodeOnly.structuredOutputMode).toBe("inline");
  expect(openCodeOnly.pricing).toBeUndefined();

  const deepSeekOnly = createValidationModel({
    route: [routeTarget("deepseek")],
    deepSeekApiKey: "deepseek-key",
  });
  expect(deepSeekOnly.structuredOutputMode).toBe("inline");
  expect(deepSeekOnly.pricing).toEqual(expect.objectContaining({
    inputPerMillionUsd: 0.14,
    outputPerMillionUsd: 0.28,
  }));

  expect(createValidationModel({
    route: [routeTarget("opencode-go"), routeTarget("deepseek")],
    opencodeApiKey: "go-key",
    deepSeekApiKey: "deepseek-key",
  }).route).toEqual(["opencode-go", "deepseek"]);

  const kimiOnly = createValidationModel({
    route: [routeTarget("kimi-coding")],
    kimiApiKey: "kimi-key",
  });
  expect(kimiOnly.route).toEqual(["kimi-coding"]);
  expect(kimiOnly.models).toEqual(["kimi-for-coding"]);
  expect(validationModelName(kimiOnly)).toBe("kimi-for-coding");
  expect(kimiOnly.structuredOutputMode).toBe("tool-settlement");
  expect(kimiOnly.pricing).toBeUndefined();

  const fullRoute = createValidationModel({
    route: [routeTarget("opencode-go"), routeTarget("kimi-coding"), routeTarget("deepseek")],
    opencodeApiKey: "go-key",
    kimiApiKey: "kimi-key",
    deepSeekApiKey: "deepseek-key",
  });
  expect(fullRoute.route).toEqual(["opencode-go", "kimi-coding", "deepseek"]);
  expect(fullRoute.structuredOutputMode).toBe("tool-settlement");
  expect(validationModelName(fullRoute)).toBe(
    "opencode-go/deepseek-v4-flash->kimi-coding/kimi-for-coding->deepseek/deepseek-v4-flash",
  );
  expect(fullRoute.pricing).toBeUndefined();
});

test("an unpriced model cannot inherit the default model's dollar estimate", () => {
  const selection = createValidationModel({
    route: [{ ...routeTarget("deepseek"), model: "unpriced-model" }],
    deepSeekApiKey: "deepseek-key",
  });

  expect(selection.models).toEqual(["unpriced-model"]);
  expect(selection.pricing).toBeUndefined();
});

test("the Kimi Coding adapter keeps its real provider identity and required reasoning settings", async () => {
  const requests: Array<{ url: string; headers: Headers; body: Record<string, unknown> }> = [];
  const model = createKimiCodingModel({
    apiKey: "kimi-key",
    fetch: (async (input, init) => {
      requests.push({
        url: String(input),
        headers: new Headers(init?.headers),
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      });
      return jsonResponse({
        id: "response-1",
        object: "chat.completion",
        created: 1,
        model: "kimi-for-coding",
        choices: [{
          index: 0,
          message: { role: "assistant", content: "ok", reasoning_content: "checked" },
          finish_reason: "stop",
        }],
        usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 },
      });
    }) as typeof fetch,
  });

  const result = await generateText({
    model,
    prompt: "Finish the check.",
    tools: {
      finish_check: tool({
        description: "Finish the deterministic provider check.",
        inputSchema: z.object({}),
      }),
    },
    toolChoice: { type: "tool", toolName: "finish_check" },
    maxRetries: 0,
  });

  expect(result.text).toBe("ok");
  expect(requests).toHaveLength(1);
  expect(requests[0]?.url).toBe("https://api.kimi.com/coding/v1/chat/completions");
  expect(requests[0]?.headers.get("authorization")).toBe("Bearer kimi-key");
  expect(requests[0]?.headers.get("user-agent")).toContain("ai/7.");
  expect(requests[0]?.body.temperature).toBe(1);
  expect(requests[0]?.headers.get("user-agent")).toContain("runtime/bun/");
  expect(requests[0]?.body).toMatchObject({
    model: "kimi-for-coding",
    thinking: { type: "enabled" },
    reasoning_history: "interleaved",
    tool_choice: "auto",
  });
});

test("the Kimi Coding adapter lowers unsupported forced tool choice without weakening terminal verification", () => {
  const named = adaptKimiCodingToolChoice({
    toolChoice: { type: "tool", toolName: "finish_review" },
  } as LanguageModelV4CallOptions);
  const required = adaptKimiCodingToolChoice({
    toolChoice: { type: "required" },
  } as LanguageModelV4CallOptions);
  const automatic = { toolChoice: { type: "auto" } } as LanguageModelV4CallOptions;

  expect(named.toolChoice).toEqual({ type: "auto" });
  expect(required.toolChoice).toEqual({ type: "auto" });
  expect(adaptKimiCodingToolChoice(automatic)).toBe(automatic);
});

test("the Kimi Coding endpoint owns its fixed temperature compatibility", () => {
  expect(adaptKimiCodingRequest({ temperature: 0 } as LanguageModelV4CallOptions).temperature).toBe(1);
  expect(adaptKimiCodingRequest({ temperature: 0.4 } as LanguageModelV4CallOptions).temperature).toBe(1);
});

test("Kimi plan exhaustion can fall through but request-shape defects remain visible", () => {
  expect(classifyKimiCodingFailure(apiError(402), {})).toEqual({
    reason: "membership_unavailable",
  });
  expect(classifyKimiCodingFailure(apiError(403), {})).toEqual({
    reason: "quota_or_rate_limit",
  });
  expect(classifyKimiCodingFailure(apiError(429), {})).toEqual({
    reason: "quota_or_rate_limit",
  });
  expect(classifyKimiCodingFailure(apiError(400, true), {})).toBeUndefined();
  expect(classifyKimiCodingFailure(apiError(404), {})).toBeUndefined();
});

test("Kimi quota exhaustion advances one model call and retains the provider-specific model", async () => {
  let reserveCalls = 0;
  const result = await generateText({
    model: createRoutedLanguageModel({
      id: "validation-test",
      targets: [
        {
          id: "kimi-coding",
          model: new MockLanguageModelV4({
            modelId: "kimi-for-coding",
            doGenerate: async () => {
              throw apiError(429);
            },
          }),
          fallbackOn: classifyKimiCodingFailure,
        },
        {
          id: "deepseek",
          model: new MockLanguageModelV4({
            modelId: "deepseek-v4-flash",
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
      servedBy: "deepseek",
      model: "deepseek-v4-flash",
      attempts: [{ target: "kimi-coding", reason: "quota_or_rate_limit" }],
    },
  });
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
      model: "mock-model-id",
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
  expect(classifyOpenCodeGoFailure(apiError(400, true), {})).toBeUndefined();
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

test("DeepSeek can occupy a preferred route position without hiding request defects", () => {
  expect(classifyDeepSeekFailure(apiError(429), {})).toEqual({
    reason: "quota_or_rate_limit",
  });
  expect(classifyDeepSeekFailure(apiError(500), {})).toEqual({
    reason: "provider_unavailable",
  });
  expect(classifyDeepSeekFailure(apiError(400, true), {})).toBeUndefined();
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

function apiError(
  statusCode: number,
  isRetryable = statusCode === 429 || statusCode >= 500,
): APICallError {
  return new APICallError({
    message: "allowance unavailable",
    url: "https://opencode.ai/zen/go/v1/chat/completions",
    requestBodyValues: {},
    statusCode,
    isRetryable,
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

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
  });
}
