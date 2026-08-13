import { expect, test } from "bun:test";
import type {
  LanguageModelV4StreamPart,
} from "@ai-sdk/provider";
import { MockLanguageModelV4, simulateReadableStream } from "ai/test";
import {
  CURRENT_COORDINATOR_POLICY,
  composeConversationPrompt,
  type ConversationPromptInput,
} from "../src/conversation-prompt";
import {
  startConversationTurn,
  type ConversationTurnOptions,
  type ConversationTurnResult,
  type ConversationTurnSafetyEvent,
} from "../src/conversation-coordinator";
import {
  createDeepSeekTurnAdapter,
  DEEPSEEK_SDK_PROVIDER_ID,
  DEEPSEEK_TURN_MAX_OUTPUT_TOKENS,
  type DeepSeekTurnModelOptions,
} from "../src/deepseek-turn-adapter";

const V4_USAGE = {
  inputTokens: { total: 12, noCache: 12, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 8, text: 8, reasoning: 0 },
};

const STOP_FINISH: LanguageModelV4StreamPart = {
  type: "finish",
  finishReason: { unified: "stop", raw: "stop" },
  usage: V4_USAGE,
};

const ERROR_FINISH: LanguageModelV4StreamPart = {
  type: "finish",
  finishReason: { unified: "error", raw: "error" },
  usage: V4_USAGE,
};

const SANITIZED_USAGE = { inputTokens: 12, outputTokens: 8, totalTokens: 20, cachedInputTokens: 0 } as const;

const FLAT_USAGE_PASSTHROUGH = {
  inputTokens: 12,
  inputTokenDetails: { noCacheTokens: 12, cacheReadTokens: 0, cacheWriteTokens: 0 },
  outputTokens: 8,
  outputTokenDetails: { textTokens: 8, reasoningTokens: 0 },
  totalTokens: 20,
} as const;

function textParts(texts: string[]): LanguageModelV4StreamPart[] {
  const id = "tx-1";
  return [
    { type: "text-start", id },
    ...texts.map((delta): LanguageModelV4StreamPart => ({ type: "text-delta", id, delta })),
    { type: "text-end", id },
  ];
}

function mockModel(modelId: string, parts: LanguageModelV4StreamPart[]): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    provider: DEEPSEEK_SDK_PROVIDER_ID,
    modelId,
    doStream: async () => ({ stream: simulateReadableStream({ chunks: parts }) }),
  });
}

function adapterParts(): LanguageModelV4StreamPart[] {
  return [...textParts(["The current state is ", "settled."]), STOP_FINISH];
}

function composedPrompt(): Awaited<ReturnType<typeof composeConversationPrompt>> {
  const input: ConversationPromptInput = {
    message: { text: "Read-only bounded probe message.", lineage: { messageId: "message-1", turnId: "turn-1" } },
    policy: {
      ...CURRENT_COORDINATOR_POLICY,
      disclosureEnvelope: "Sources are disclosed by ref and digest only.",
    },
  };
  return composeConversationPrompt(input);
}

async function collect(iterable: AsyncIterable<unknown>): Promise<unknown[]> {
  const events: unknown[] = [];
  for await (const event of iterable) events.push(event);
  return events;
}

function turnOptions(
  events: ConversationTurnSafetyEvent[],
  port: ConversationTurnOptions["port"],
  policy: ConversationTurnOptions["policy"] = {
    ...CURRENT_COORDINATOR_POLICY,
    disclosureEnvelope: "Sources are disclosed by ref and digest only.",
  },
): ConversationTurnOptions {
  return {
    message: { text: "Read-only bounded probe message.", lineage: { messageId: "message-1", turnId: "turn-1" } },
    policy,
    port,
    onEvent: (event) => events.push(event),
  };
}

function assertFinished(result: ConversationTurnResult): asserts result is Extract<ConversationTurnResult, { kind: "finished" }> {
  expect(result.kind).toBe("finished");
}

function assertFailed(result: ConversationTurnResult): asserts result is Extract<ConversationTurnResult, { kind: "failed" }> {
  expect(result.kind).toBe("failed");
}

test("streams every text delta and does not infer observed effort from the requested adapter policy", async () => {
  const adapter = createDeepSeekTurnAdapter({
    apiKey: "test-key",
    provider: "deepseek",
    model: "deepseek-v4-pro",
    thinking: "enabled",
    reasoningEffort: "max",
    createModel: () => mockModel("deepseek-v4-pro", adapterParts()),
  });

  const events = await collect(adapter.run({ prompt: composedPrompt(), signal: new AbortController().signal }));

  expect(events).toEqual([
    { kind: "delta", text: "The current state is " },
    { kind: "delta", text: "settled." },
    {
      kind: "finish",
      usage: FLAT_USAGE_PASSTHROUGH,
    },
  ]);
});

test("retains a provider fingerprint only when DeepSeek returns it in provider metadata", async () => {
  const fingerprintFinish: LanguageModelV4StreamPart = {
    ...STOP_FINISH,
    providerMetadata: { deepseek: { systemFingerprint: "fp-returned" } },
  };
  const adapter = createDeepSeekTurnAdapter({
    apiKey: "test-key",
    provider: "deepseek",
    model: "deepseek-v4-pro",
    thinking: "enabled",
    reasoningEffort: "max",
    createModel: () => mockModel("deepseek-v4-pro", [...textParts(["settled"]), fingerprintFinish]),
  });

  const events = await collect(adapter.run({ prompt: composedPrompt(), signal: new AbortController().signal }));

  expect(events.at(-1)).toEqual({
    kind: "finish",
    providerFingerprint: "fp-returned",
    usage: FLAT_USAGE_PASSTHROUGH,
  });
});

test("wires the adapter-configured model with an explicit DeepSeek inference policy", async () => {
  const seen: DeepSeekTurnModelOptions[] = [];
  const adapter = createDeepSeekTurnAdapter({
    apiKey: "test-key",
    provider: "deepseek",
    model: "deepseek-v4-pro",
    thinking: "enabled",
    reasoningEffort: "max",
    createModel: (options) => {
      seen.push(options);
      return mockModel("deepseek-v4-pro", adapterParts());
    },
  });

  await collect(adapter.run({ prompt: composedPrompt(), signal: new AbortController().signal }));

  expect(seen).toHaveLength(1);
  expect(seen[0]).toEqual({
    apiKey: "test-key",
    model: "deepseek-v4-pro",
    inferencePolicy: { thinking: "enabled", reasoningEffort: "max" },
  });
});

test("settles a provider error part as a visible error event with no finish", async () => {
  const adapter = createDeepSeekTurnAdapter({
    apiKey: "test-key",
    provider: "deepseek",
    model: "deepseek-v4-pro",
    thinking: "enabled",
    reasoningEffort: "max",
    createModel: () => mockModel("deepseek-v4-pro", [
      ...textParts(["Attempting provider call..."]),
      { type: "error", error: new Error("provider unavailable: connection refused") },
    ]),
  });

  const events = await collect(adapter.run({ prompt: composedPrompt(), signal: new AbortController().signal }));

  expect(events).toEqual([
    { kind: "delta", text: "Attempting provider call..." },
    { kind: "error", message: "provider unavailable: connection refused" },
  ]);
});

test("settles a finish with an error reason as a visible error instead of a finished turn", async () => {
  const adapter = createDeepSeekTurnAdapter({
    apiKey: "test-key",
    provider: "deepseek",
    model: "deepseek-v4-pro",
    thinking: "enabled",
    reasoningEffort: "max",
    createModel: () => mockModel("deepseek-v4-pro", [...textParts(["Partial answer"]), ERROR_FINISH]),
  });

  const events = await collect(adapter.run({ prompt: composedPrompt(), signal: new AbortController().signal }));

  expect(events).toEqual([
    { kind: "delta", text: "Partial answer" },
    { kind: "error", message: "the model stream finished with an error reason" },
  ]);
});

test("threads the abort signal through the model call and emits no content after interruption", async () => {
  const controller = new AbortController();
  let capturedAbortSignal: AbortSignal | undefined;
  let receivedMaxOutputTokens: number | undefined;
  const model = new MockLanguageModelV4({
    provider: DEEPSEEK_SDK_PROVIDER_ID,
    modelId: "deepseek-v4-pro",
    doStream: async (options) => {
      capturedAbortSignal = options.abortSignal;
      receivedMaxOutputTokens = options.maxOutputTokens;
      return {
        stream: simulateReadableStream({
          chunks: [...textParts(["part one ", "part two"]), STOP_FINISH],
          chunkDelayInMs: 40,
        }),
      };
    },
  });
  const adapter = createDeepSeekTurnAdapter({
    apiKey: "test-key",
    provider: "deepseek",
    model: "deepseek-v4-pro",
    thinking: "enabled",
    reasoningEffort: "max",
    createModel: () => model,
  });

  const events: unknown[] = [];
  const iterator = adapter.run({ prompt: composedPrompt(), signal: controller.signal })[Symbol.asyncIterator]();
  const first = await iterator.next();
  events.push(first.value);
  controller.abort();
  for (;;) {
    const next = await iterator.next();
    if (next.done) break;
    events.push(next.value);
  }

  expect(capturedAbortSignal).toBe(controller.signal);
  expect(receivedMaxOutputTokens).toBe(DEEPSEEK_TURN_MAX_OUTPUT_TOKENS);
  expect(events).toEqual([{ kind: "delta", text: "part one " }]);
});

test("rejects a constructed model identity that does not match the requested DeepSeek model", async () => {
  let constructed = 0;
  const adapter = createDeepSeekTurnAdapter({
    apiKey: "test-key",
    provider: "deepseek",
    model: "deepseek-v4-pro",
    thinking: "enabled",
    reasoningEffort: "max",
    createModel: () => {
      constructed += 1;
      return mockModel("deepseek-v4-flash", adapterParts());
    },
  });

  const events = await collect(adapter.run({ prompt: composedPrompt(), signal: new AbortController().signal }));

  expect(constructed).toBe(1);
  expect(events).toEqual([{
    kind: "error",
    message:
      "constructed model identity deepseek.chat/deepseek-v4-flash "
      + "does not match the requested DeepSeek model deepseek.chat/deepseek-v4-pro; "
      + "the turn is not redirected",
  }]);
});

test("rejects a constructed model served by another SDK provider", async () => {
  const adapter = createDeepSeekTurnAdapter({
    apiKey: "test-key",
    provider: "deepseek",
    model: "deepseek-v4-pro",
    thinking: "enabled",
    reasoningEffort: "max",
    createModel: () => new MockLanguageModelV4({
      provider: "anthropic",
      modelId: "deepseek-v4-pro",
      doStream: async () => ({ stream: simulateReadableStream({ chunks: adapterParts() }) }),
    }),
  });

  const events = await collect(adapter.run({ prompt: composedPrompt(), signal: new AbortController().signal }));

  expect(events).toEqual([{
    kind: "error",
    message:
      "constructed model identity anthropic/deepseek-v4-pro "
      + "does not match the requested DeepSeek model deepseek.chat/deepseek-v4-pro; "
      + "the turn is not redirected",
  }]);
});

test("rejects a non-DeepSeek policy provider without constructing a model", async () => {
  let constructed = 0;
  const adapter = createDeepSeekTurnAdapter({
    apiKey: "test-key",
    provider: "anthropic",
    model: "deepseek-v4-pro",
    thinking: "enabled",
    reasoningEffort: "max",
    createModel: () => {
      constructed += 1;
      return mockModel("deepseek-v4-pro", adapterParts());
    },
  });

  const events = await collect(adapter.run({ prompt: composedPrompt(), signal: new AbortController().signal }));

  expect(constructed).toBe(0);
  expect(events).toEqual([{
    kind: "error",
    message:
      "the DeepSeek turn adapter can only serve provider deepseek, not anthropic; the turn is not redirected",
  }]);
});

test("rejects an unsupported reasoning effort without downgrading or calling the model", async () => {
  let constructed = 0;
  const adapter = createDeepSeekTurnAdapter({
    apiKey: "test-key",
    provider: "deepseek",
    model: "deepseek-v4-pro",
    thinking: "enabled",
    reasoningEffort: "medium",
    createModel: () => {
      constructed += 1;
      return mockModel("deepseek-v4-pro", adapterParts());
    },
  });

  const events = await collect(adapter.run({ prompt: composedPrompt(), signal: new AbortController().signal }));

  expect(constructed).toBe(0);
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({ kind: "error" });
  const message = (events[0] as { message: string }).message;
  expect(message).toContain("unsupported DeepSeek reasoning effort");
  expect(message).toContain("not downgraded");
});

test("omits observed reasoning effort and disables thinking when the policy is disabled", async () => {
  const seen: DeepSeekTurnModelOptions[] = [];
  const adapter = createDeepSeekTurnAdapter({
    apiKey: "test-key",
    provider: "deepseek",
    model: "deepseek-v4-pro",
    thinking: "disabled",
    reasoningEffort: "max",
    createModel: (options) => {
      seen.push(options);
      return mockModel("deepseek-v4-pro", [...textParts(["settled"]), STOP_FINISH]);
    },
  });

  const events = await collect(adapter.run({ prompt: composedPrompt(), signal: new AbortController().signal }));

  expect(seen[0]?.inferencePolicy).toEqual({ thinking: "disabled" });
  expect(events).toEqual([
    { kind: "delta", text: "settled" },
    { kind: "finish", usage: FLAT_USAGE_PASSTHROUGH },
  ]);
});

test("settles with requested identity separate from unavailable observed provider, model, and effort", async () => {
  const seen: ConversationTurnSafetyEvent[] = [];
  const adapter = createDeepSeekTurnAdapter({
    apiKey: "test-key",
    provider: "deepseek",
    model: "deepseek-v4-pro",
    thinking: "enabled",
    reasoningEffort: "max",
    createModel: () => mockModel("deepseek-v4-pro", adapterParts()),
  });
  const result = await startConversationTurn(turnOptions(seen, adapter)).result;

  assertFinished(result);
  expect(result.text).toBe("The current state is settled.");
  expect(result.usage).toEqual(SANITIZED_USAGE);
  expect(result.requested.provider).toBe("deepseek");
  expect(result.requested.model).toBe("deepseek-v4-pro");
  expect(result.requested.thinking).toBe("enabled");
  expect(result.requested.reasoningEffort).toBe("max");
  expect(result.observed).toEqual({
    outcome: "finished",
    reasoningEffort: "unavailable",
    usage: SANITIZED_USAGE,
  });
  expect(seen).toEqual([
    { kind: "delta", text: "The current state is " },
    { kind: "delta", text: "settled." },
    { kind: "finished", usage: SANITIZED_USAGE },
  ]);
});

test("a provider-returned flash model mismatches requested and constructed pro with no fallback", async () => {
  const seen: ConversationTurnSafetyEvent[] = [];
  let constructed = 0;
  const adapter = createDeepSeekTurnAdapter({
    apiKey: "test-key",
    provider: "deepseek",
    model: "deepseek-v4-pro",
    thinking: "enabled",
    reasoningEffort: "max",
    createModel: () => {
      constructed += 1;
      return mockModel("deepseek-v4-pro", [
        { type: "response-metadata", modelId: "deepseek-v4-flash" },
        ...adapterParts(),
      ]);
    },
  });
  const result = await startConversationTurn(turnOptions(seen, adapter)).result;

  assertFailed(result);
  expect(constructed).toBe(1);
  expect(result.error).toContain("observed model deepseek-v4-flash does not match requested model deepseek-v4-pro");
  expect(result.requested.model).toBe("deepseek-v4-pro");
  expect(result.observed.model).toBe("deepseek-v4-flash");
  expect(seen.some((event) => event.kind === "error")).toBe(true);
  expect(seen.some((event) => event.kind === "finished")).toBe(false);
});

test("a provider error through the injected real adapter settles as a visible kernel failure", async () => {
  const seen: ConversationTurnSafetyEvent[] = [];
  const adapter = createDeepSeekTurnAdapter({
    apiKey: "test-key",
    provider: "deepseek",
    model: "deepseek-v4-pro",
    thinking: "enabled",
    reasoningEffort: "max",
    createModel: () => mockModel("deepseek-v4-pro", [
      { type: "error", error: new Error("provider unavailable") },
    ]),
  });
  const result = await startConversationTurn(turnOptions(seen, adapter)).result;

  assertFailed(result);
  expect(result.error).toBe("provider unavailable");
  expect(result.observed.outcome).toBe("failed");
  expect(result.observed.error).toBe("provider unavailable");
  expect(seen.some((event) => event.kind === "error" && event.message === "provider unavailable")).toBe(true);
  expect(seen.some((event) => event.kind === "finished")).toBe(false);
});

test("an interrupt through the injected real adapter settles as interrupted with no later content", async () => {
  const seen: ConversationTurnSafetyEvent[] = [];
  const model = new MockLanguageModelV4({
    provider: DEEPSEEK_SDK_PROVIDER_ID,
    modelId: "deepseek-v4-pro",
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [...textParts(["started", "later"]), STOP_FINISH],
        chunkDelayInMs: 40,
      }),
    }),
  });
  const adapter = createDeepSeekTurnAdapter({
    apiKey: "test-key",
    provider: "deepseek",
    model: "deepseek-v4-pro",
    thinking: "enabled",
    reasoningEffort: "max",
    createModel: () => model,
  });
  const handle = startConversationTurn(turnOptions(seen, adapter));

  for (let attempt = 0; attempt < 1000 && !seen.some((event) => event.kind === "delta"); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  handle.interrupt();
  const result = await handle.result;

  expect(result.kind).toBe("interrupted");
  expect(result.text).toBe("started");
  expect(result.observed.outcome).toBe("interrupted");
  expect(seen).toEqual([{ kind: "delta", text: "started" }]);
});
