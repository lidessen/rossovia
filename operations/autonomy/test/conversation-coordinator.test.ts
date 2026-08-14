import { expect, test } from "bun:test";
import {
  CONVERSATION_PROMPT_REVISION,
  CURRENT_COORDINATOR_POLICY,
  composeConversationPrompt,
  type ConversationPromptInput,
} from "../src/conversation-prompt";
import {
  ConversationTurnRequestSchema,
  ConversationTurnSafetyEventSchema,
  ConversationOperationSchema,
  prepareConversationTurn,
  startConversationTurn,
  startPreparedConversationTurn,
  type ConversationTurnOptions,
  type ConversationTurnPort,
  type ConversationTurnPortEvent,
  type ConversationTurnResult,
  type ConversationTurnSafetyEvent,
} from "../src/conversation-coordinator";

const TASK_DIGEST = "a".repeat(64);
const PROJECT_DIGEST = "b".repeat(64);
const SKILL_DIGEST = "c".repeat(64);

function fullOptions(): ConversationTurnOptions {
  return {
    projection: {
      task: {
        id: "task-1",
        sourceRevision: "rev-3",
        source: { ref: "workbench:state/tasks.json", digest: TASK_DIGEST },
        summary: "Publish the bounded fixture result in skills-dogfood.",
        status: "open",
      },
      projects: [
        {
          name: "skills-dogfood",
          id: "skills-dogfood",
          status: "registered",
          primaryHead: "1".repeat(40),
          source: { ref: "workbench:state/projects.json", digest: PROJECT_DIGEST },
        },
      ],
      carriers: [{ id: "attempt-1", state: "running", runId: "run-1" }],
    },
    message: {
      text: "Keep this same task, but the result must also preserve the second fixture invariant.",
      lineage: {
        messageId: "message-2",
        turnId: "turn-2",
        correctionId: "corr-1",
        priorMessageRefs: ["message-1"],
      },
    },
    policy: {
      ...CURRENT_COORDINATOR_POLICY,
      disclosureEnvelope: "Sources are disclosed by ref and digest only; raw provider output is never included.",
      tools: ["project.read", "task.read"],
      workspace: "Disposable test worktrees only.",
      budget: "One coordinator turn.",
      withheldEffects: ["commit", "merge", "publish", "task-acceptance"],
    },
    orientation: {
      basis: "verified-route",
      projectId: "skills-dogfood",
      sources: [
        {
          kind: "skill",
          ref: "skill:agent-delegation",
          digest: SKILL_DIGEST,
          content: "Bounded delegation exists; the coordinator remains the one synthesis owner.",
        },
      ],
    },
    children: [
      {
        id: "child-1",
        contribution: "evidence",
        conclusion: "The second fixture invariant is already preserved in the current source.",
        sourceScope: "operations/workbench/src",
        admissibleClaims: ["invariant preserved"],
        uncertainty: "None for the bounded read.",
        evidenceRefs: [{ batchId: "turn-result-read:batch:1", key: "evidence:child-1/result" }],
      },
    ],
    port: fakePort([]),
    onEvent: () => {},
  };
}

function fakePort(events: ConversationTurnPortEvent[]): ConversationTurnPort {
  return {
    async *run() {
      for (const event of events) yield event;
    },
  };
}

async function runTurn(
  options: ConversationTurnOptions,
  events: ConversationTurnPortEvent[],
  seen: ConversationTurnSafetyEvent[] = [],
): Promise<ConversationTurnResult> {
  return startConversationTurn({
    ...options,
    port: fakePort(events),
    onEvent: (event) => seen.push(event),
  }).result;
}

async function until(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("timed out waiting for condition");
}

function assertFinished(result: ConversationTurnResult): asserts result is Extract<ConversationTurnResult, { kind: "finished" }> {
  expect(result.kind).toBe("finished");
}

function assertFailed(result: ConversationTurnResult): asserts result is Extract<ConversationTurnResult, { kind: "failed" }> {
  expect(result.kind).toBe("failed");
}

test("strict request schemas accept exactly the four typed kinds and reject everything else", () => {
  expect(ConversationTurnRequestSchema.parse({ kind: "project-instruction", ref: "workbench:state/projects.json" }))
    .toEqual({ kind: "project-instruction", ref: "workbench:state/projects.json" });
  expect(ConversationTurnRequestSchema.parse({ kind: "skill-content", ref: "skill:agent-delegation" }))
    .toEqual({ kind: "skill-content", ref: "skill:agent-delegation" });
  expect(ConversationTurnRequestSchema.parse({
    kind: "child-result",
    batchId: "turn-result-read:batch:1",
    key: "evidence:child-1/result",
  })).toEqual({ kind: "child-result", batchId: "turn-result-read:batch:1", key: "evidence:child-1/result" });
  expect(ConversationTurnRequestSchema.parse({
    kind: "principal-decision",
    question: "Which project should receive the result?",
  })).toEqual({ kind: "principal-decision", question: "Which project should receive the result?" });

  expect(() => ConversationTurnRequestSchema.parse({ kind: "task_create" })).toThrow();
  expect(() => ConversationTurnRequestSchema.parse({ kind: "project-instruction" })).toThrow();
  expect(() => ConversationTurnRequestSchema.parse({ kind: "child-result" })).toThrow();
  expect(() => ConversationTurnRequestSchema.parse({
    kind: "child-result",
    key: "evidence:child-1/result",
  })).toThrow();
  expect(() => ConversationTurnRequestSchema.parse({
    kind: "child-result",
    batchId: "turn-result-read:batch:1",
  })).toThrow();
  expect(() => ConversationTurnRequestSchema.parse({
    kind: "skill-content",
    ref: "skill:agent-delegation",
    extra: 1,
  })).toThrow();
});

test("a keyed child-result request carries the delegate (batchId, key) result-read identity", () => {
  const parsed = ConversationTurnRequestSchema.parse({
    kind: "child-result",
    batchId: "turn-result-read:batch:1",
    key: "inspect-contract",
  });
  expect(parsed).toEqual({
    kind: "child-result",
    batchId: "turn-result-read:batch:1",
    key: "inspect-contract",
  });
});

test("the same key in different batches remains a distinct child-result identity", () => {
  const first = ConversationTurnRequestSchema.parse({
    kind: "child-result",
    batchId: "turn-result-read:batch:1",
    key: "inspect-contract",
  });
  const second = ConversationTurnRequestSchema.parse({
    kind: "child-result",
    batchId: "turn-result-read:batch:2",
    key: "inspect-contract",
  });
  expect(first).not.toEqual(second);
});

test("safety stream event schemas are strict for all forwarded kinds", () => {
  expect(ConversationTurnSafetyEventSchema.parse({ kind: "delta", text: "provisional" }))
    .toEqual({ kind: "delta", text: "provisional" });
  expect(ConversationTurnSafetyEventSchema.parse({
    kind: "request",
    request: { kind: "principal-decision", question: "Ask the Principal." },
  })).toEqual({ kind: "request", request: { kind: "principal-decision", question: "Ask the Principal." } });
  expect(ConversationTurnSafetyEventSchema.parse({
    kind: "finished",
    usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3, cachedInputTokens: 0 },
  })).toEqual({ kind: "finished", usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3, cachedInputTokens: 0 } });
  expect(ConversationTurnSafetyEventSchema.parse({ kind: "error", message: "provider unavailable" }))
    .toEqual({ kind: "error", message: "provider unavailable" });

  expect(() => ConversationTurnSafetyEventSchema.parse({ kind: "delta", text: "x", extra: true })).toThrow();
  expect(() => ConversationTurnSafetyEventSchema.parse({ kind: "unknown", text: "x" })).toThrow();
});

test("emits the first delta before finish and settles a normal completed turn", async () => {
  const seen: ConversationTurnSafetyEvent[] = [];
  const result = await runTurn(fullOptions(), [
    { kind: "delta", text: "The current state is " },
    { kind: "delta", text: "settled." },
    {
      kind: "finish",
      provider: CURRENT_COORDINATOR_POLICY.provider,
      model: CURRENT_COORDINATOR_POLICY.model,
      observedReasoningEffort: CURRENT_COORDINATOR_POLICY.reasoningEffort,
      providerFingerprint: "fp-returned",
      usage: { inputTokens: 12, outputTokens: 8, totalTokens: 20, cachedInputTokens: 0 },
    },
  ], seen);

  expect(seen).toEqual([
    { kind: "delta", text: "The current state is " },
    { kind: "delta", text: "settled." },
    { kind: "finished", usage: { inputTokens: 12, outputTokens: 8, totalTokens: 20, cachedInputTokens: 0 } },
  ]);
  assertFinished(result);
  expect(result.text).toBe("The current state is settled.");
  expect(result.request).toBeUndefined();
  expect(result.usage).toEqual({ inputTokens: 12, outputTokens: 8, totalTokens: 20, cachedInputTokens: 0 });
  expect(result.observed).toEqual({
    outcome: "finished",
    provider: CURRENT_COORDINATOR_POLICY.provider,
    model: CURRENT_COORDINATOR_POLICY.model,
    reasoningEffort: CURRENT_COORDINATOR_POLICY.reasoningEffort,
    fingerprint: "fp-returned",
    usage: { inputTokens: 12, outputTokens: 8, totalTokens: 20, cachedInputTokens: 0 },
  });
});

test("forwards one optional typed request and returns it in the final result", async () => {
  const seen: ConversationTurnSafetyEvent[] = [];
  const request = { kind: "project-instruction" as const, ref: "workbench:state/projects.json" };
  const result = await runTurn(fullOptions(), [
    { kind: "delta", text: "Checking " },
    { kind: "request", request },
    { kind: "delta", text: "the registered project." },
    {
      kind: "finish",
      provider: CURRENT_COORDINATOR_POLICY.provider,
      model: CURRENT_COORDINATOR_POLICY.model,
      observedReasoningEffort: CURRENT_COORDINATOR_POLICY.reasoningEffort,
    },
  ], seen);

  expect(seen.some((event) => event.kind === "request" && event.request.kind === "project-instruction")).toBe(true);
  assertFinished(result);
  expect(result.request).toEqual(request);
  expect(result.observed.usage).toEqual({ inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 });
});

test("rejects a second request in the same message as a visible error", async () => {
  const seen: ConversationTurnSafetyEvent[] = [];
  const result = await runTurn(fullOptions(), [
    { kind: "request", request: { kind: "project-instruction", ref: "workbench:state/projects.json" } },
    { kind: "request", request: { kind: "principal-decision", question: "Which project?" } },
    {
      kind: "finish",
      provider: CURRENT_COORDINATOR_POLICY.provider,
      model: CURRENT_COORDINATOR_POLICY.model,
    },
  ], seen);

  assertFailed(result);
  expect(result.error).toContain("at most one request");
  expect(seen.some((event) => event.kind === "error")).toBe(true);
  expect(seen.some((event) => event.kind === "finished")).toBe(false);
});

test("settles a provider error as a visible failure and stops the turn", async () => {
  const seen: ConversationTurnSafetyEvent[] = [];
  const result = await runTurn(fullOptions(), [
    { kind: "delta", text: "Attempting provider call..." },
    { kind: "error", message: "provider unavailable: connection refused" },
    { kind: "finish", provider: CURRENT_COORDINATOR_POLICY.provider, model: CURRENT_COORDINATOR_POLICY.model },
  ], seen);

  assertFailed(result);
  expect(result.error).toBe("provider unavailable: connection refused");
  expect(result.text).toBe("Attempting provider call...");
  expect(result.observed.outcome).toBe("failed");
  expect(result.observed.error).toBe("provider unavailable: connection refused");
  expect(seen.some((event) => event.kind === "error" && event.message === "provider unavailable: connection refused"))
    .toBe(true);
  expect(seen.some((event) => event.kind === "finished")).toBe(false);
});

test("fails visibly when observed provider or model does not match the requested policy", async () => {
  const options = fullOptions();
  const providerMismatch = await runTurn(options, [
    {
      kind: "finish",
      provider: "anthropic",
      model: CURRENT_COORDINATOR_POLICY.model,
      observedReasoningEffort: CURRENT_COORDINATOR_POLICY.reasoningEffort,
    },
  ]);
  assertFailed(providerMismatch);
  expect(providerMismatch.error).toContain("observed provider");
  expect(providerMismatch.requested.provider).toBe(CURRENT_COORDINATOR_POLICY.provider);
  expect(providerMismatch.observed.provider).toBe("anthropic");

  const modelMismatch = await runTurn(options, [
    {
      kind: "finish",
      provider: CURRENT_COORDINATOR_POLICY.provider,
      model: "claude-3-5-sonnet",
      observedReasoningEffort: CURRENT_COORDINATOR_POLICY.reasoningEffort,
    },
  ]);
  assertFailed(modelMismatch);
  expect(modelMismatch.error).toContain("observed model");
  expect(modelMismatch.requested.model).toBe(CURRENT_COORDINATOR_POLICY.model);
  expect(modelMismatch.observed.model).toBe("claude-3-5-sonnet");
});

test("fails visibly when documented provider metadata reports an effort that contradicts the request", async () => {
  const result = await runTurn(fullOptions(), [
    {
      kind: "finish",
      provider: CURRENT_COORDINATOR_POLICY.provider,
      model: CURRENT_COORDINATOR_POLICY.model,
      observedReasoningEffort: "medium",
    },
  ]);
  assertFailed(result);
  expect(result.error).toContain("reasoning effort");
  expect(result.requested.reasoningEffort).toBe(CURRENT_COORDINATOR_POLICY.reasoningEffort);
  expect(result.observed.reasoningEffort).toBe("medium");
});

test("records missing observed effort as unavailable without failing the turn", async () => {
  const result = await runTurn(fullOptions(), [
    {
      kind: "finish",
      provider: CURRENT_COORDINATOR_POLICY.provider,
      model: CURRENT_COORDINATOR_POLICY.model,
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 },
    },
  ]);
  assertFinished(result);
  expect(result.observed.reasoningEffort).toBe("unavailable");
  expect(result.requested.reasoningEffort).toBe(CURRENT_COORDINATOR_POLICY.reasoningEffort);
});

test("sanitizes observed usage to non-negative numbers and drops unknown fields", async () => {
  const result = await runTurn(fullOptions(), [
    {
      kind: "finish",
      provider: CURRENT_COORDINATOR_POLICY.provider,
      model: CURRENT_COORDINATOR_POLICY.model,
      usage: {
        inputTokens: -4,
        outputTokens: 12.5,
        totalTokens: 7,
        cachedInputTokens: 9,
        sneakyField: "not retained",
      },
    },
  ]);
  assertFinished(result);
  expect(result.observed.usage).toEqual({ inputTokens: 0, outputTokens: 12.5, totalTokens: 7, cachedInputTokens: 9 });
  expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 12.5, totalTokens: 7, cachedInputTokens: 9 });
});

test("retains stable prompt evidence from composeConversationPrompt for identical input", async () => {
  const options = fullOptions();
  const input: ConversationPromptInput = {
    projection: options.projection,
    message: options.message,
    policy: options.policy,
    orientation: options.orientation,
    children: options.children === undefined ? undefined : [...options.children],
  };
  const composed = composeConversationPrompt(input);

  const first = await runTurn(options, [
    {
      kind: "finish",
      provider: CURRENT_COORDINATOR_POLICY.provider,
      model: CURRENT_COORDINATOR_POLICY.model,
    },
  ]);
  const second = await runTurn(options, [
    {
      kind: "finish",
      provider: CURRENT_COORDINATOR_POLICY.provider,
      model: CURRENT_COORDINATOR_POLICY.model,
    },
  ]);

  assertFinished(first);
  assertFinished(second);
  expect(first.requested).toEqual(second.requested);
  expect(first.requested.promptRevision).toBe(CONVERSATION_PROMPT_REVISION);
  expect(first.requested.promptDigest).toBe(composed.digest);
  expect(first.requested.disclosedSources).toEqual(composed.disclosedSources);
  expect(first.requested.sourceRevisionSelectors).toEqual(composed.sourceRevisionSelectors);
  expect(first.requested.provider).toBe(options.policy.provider);
  expect(first.requested.model).toBe(options.policy.model);
  expect(first.requested.thinking).toBe(options.policy.thinking);
  expect(first.requested.reasoningEffort).toBe(options.policy.reasoningEffort);
});

test("keeps requested and observed evidence separate on failure", async () => {
  const result = await runTurn(fullOptions(), [
    { kind: "error", message: "provider unavailable" },
  ]);
  assertFailed(result);
  expect(result.requested.provider).toBe(CURRENT_COORDINATOR_POLICY.provider);
  expect(result.requested.model).toBe(CURRENT_COORDINATOR_POLICY.model);
  expect(result.observed.outcome).toBe("failed");
  expect(result.observed.error).toBe("provider unavailable");
  expect(result.observed.provider).toBeUndefined();
});

test("interrupt aborts immediately and suppresses subsequent deltas and requests", async () => {
  const seen: ConversationTurnSafetyEvent[] = [];
  let observedAbort = false;
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });

  const port: ConversationTurnPort = {
    async *run({ signal }) {
      yield { kind: "delta", text: "part one " };
      await gate;
      observedAbort = signal.aborted;
      yield { kind: "request", request: { kind: "child-result", batchId: "turn-result-read:batch:1", key: "inspect-contract" } };
      yield { kind: "delta", text: "part two" };
      yield { kind: "finish", provider: CURRENT_COORDINATOR_POLICY.provider, model: CURRENT_COORDINATOR_POLICY.model };
    },
  };

  const handle = startConversationTurn({
    ...fullOptions(),
    port,
    onEvent: (event) => seen.push(event),
  });

  await until(() => seen.some((event) => event.kind === "delta"));
  handle.interrupt();
  release();
  const result = await handle.result;

  expect(observedAbort).toBe(true);
  expect(result.kind).toBe("interrupted");
  expect(result.text).toBe("part one ");
  expect(result.observed.outcome).toBe("interrupted");
  expect(seen).toEqual([{ kind: "delta", text: "part one " }]);
});

test("a port that honors the abort signal settles as interrupted without an error event", async () => {
  const seen: ConversationTurnSafetyEvent[] = [];
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const handle = startConversationTurn({
    ...fullOptions(),
    port: {
      async *run({ signal }) {
        yield { kind: "delta", text: "started" };
        await gate;
        if (signal.aborted) return;
        yield { kind: "finish", provider: CURRENT_COORDINATOR_POLICY.provider, model: CURRENT_COORDINATOR_POLICY.model };
      },
    },
    onEvent: (event) => seen.push(event),
  });

  await until(() => seen.some((event) => event.kind === "delta"));
  handle.interrupt();
  release();
  const result = await handle.result;

  expect(result.kind).toBe("interrupted");
  expect(result.text).toBe("started");
  expect(seen).toEqual([{ kind: "delta", text: "started" }]);
  expect(seen.some((event) => event.kind === "finished")).toBe(false);
});

test("a port that throws because of the abort settles as interrupted, not failed", async () => {
  const seen: ConversationTurnSafetyEvent[] = [];
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const handle = startConversationTurn({
    ...fullOptions(),
    port: {
      async *run({ signal }) {
        yield { kind: "delta", text: "started" };
        await gate;
        if (signal.aborted) throw new DOMException("aborted", "AbortError");
        yield { kind: "finish", provider: CURRENT_COORDINATOR_POLICY.provider, model: CURRENT_COORDINATOR_POLICY.model };
      },
    },
    onEvent: (event) => seen.push(event),
  });

  await until(() => seen.some((event) => event.kind === "delta"));
  handle.interrupt();
  release();
  const result = await handle.result;

  expect(result.kind).toBe("interrupted");
  expect(result.text).toBe("started");
  expect(result.observed.outcome).toBe("interrupted");
  expect(seen).toEqual([{ kind: "delta", text: "started" }]);
  expect(seen.some((event) => event.kind === "error")).toBe(false);
});

test("an immediate interrupt settles before any event is emitted", async () => {
  const seen: ConversationTurnSafetyEvent[] = [];
  const handle = startConversationTurn({
    ...fullOptions(),
    port: {
      async *run({ signal }) {
        for (let index = 0; index < 100 && !signal.aborted; index += 1) {
          yield { kind: "delta", text: `chunk-${index}` };
        }
        yield { kind: "finish", provider: CURRENT_COORDINATOR_POLICY.provider, model: CURRENT_COORDINATOR_POLICY.model };
      },
    },
    onEvent: (event) => seen.push(event),
  });

  handle.interrupt();
  const result = await handle.result;

  expect(result.kind).toBe("interrupted");
  expect(result.text).toBe("");
  expect(result.observed.outcome).toBe("interrupted");
  expect(seen).toEqual([]);
});

test("events yielded after finish are drained and never forwarded", async () => {
  const seen: ConversationTurnSafetyEvent[] = [];
  const result = await runTurn(fullOptions(), [
    { kind: "delta", text: "settled" },
    {
      kind: "finish",
      provider: CURRENT_COORDINATOR_POLICY.provider,
      model: CURRENT_COORDINATOR_POLICY.model,
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 },
    },
    { kind: "request", request: { kind: "child-result", batchId: "turn-result-read:batch:1", key: "inspect-contract" } },
    { kind: "delta", text: "late" },
  ], seen);

  assertFinished(result);
  expect(result.text).toBe("settled");
  expect(result.request).toBeUndefined();
  expect(seen).toEqual([
    { kind: "delta", text: "settled" },
    { kind: "finished", usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 } },
  ]);
});

test("a malformed port event is a visible error, not a guessed turn", async () => {
  const seen: ConversationTurnSafetyEvent[] = [];
  const result = await runTurn(fullOptions(), [
    { kind: "delta", text: "streaming" },
    {
      kind: "request",
      request: { kind: "skill-content", ref: "skill:agent-delegation", extra: true },
    } as unknown as ConversationTurnPortEvent,
  ], seen);

  assertFailed(result);
  expect(result.error).toContain("malformed");
  expect(seen.some((event) => event.kind === "error")).toBe(true);
  expect(seen.some((event) => event.kind === "request")).toBe(false);
});

test("a port that ends without a terminal event is a visible failure", async () => {
  const seen: ConversationTurnSafetyEvent[] = [];
  const result = await runTurn(fullOptions(), [
    { kind: "delta", text: "only this" },
  ], seen);

  assertFailed(result);
  expect(result.error).toContain("without finish");
  expect(seen.some((event) => event.kind === "error")).toBe(true);
});

test("prepareConversationTurn composes deterministically with no side effects and no port", () => {
  const options = fullOptions();
  const prepared = prepareConversationTurn(options);
  const composedInput: ConversationPromptInput = {
    message: options.message,
    policy: options.policy,
    ...(options.projection === undefined ? {} : { projection: options.projection }),
    ...(options.orientation === undefined ? {} : { orientation: options.orientation }),
    ...(options.children === undefined ? {} : { children: [...options.children] }),
  };

  expect(prepared.prompt.revision).toBe(CONVERSATION_PROMPT_REVISION);
  expect(prepared.prompt.digest).toBe(composeConversationPrompt(composedInput).digest);
  expect(prepared.requested.promptRevision).toBe(CONVERSATION_PROMPT_REVISION);
  expect(prepared.requested.promptDigest).toBe(prepared.prompt.digest);
  expect(prepared.requested.provider).toBe(CURRENT_COORDINATOR_POLICY.provider);
  expect(prepared.requested.model).toBe(CURRENT_COORDINATOR_POLICY.model);
  expect(prepared.requested.thinking).toBe(CURRENT_COORDINATOR_POLICY.thinking);
  expect(prepared.requested.reasoningEffort).toBe(CURRENT_COORDINATOR_POLICY.reasoningEffort);
  expect(prepared.requested.disclosedSources.length).toBeGreaterThan(0);
  expect(prepared.requested.sourceRevisionSelectors.length).toBeGreaterThan(0);
});

test("preparing the same input twice yields the exact same prompt digest and evidence", () => {
  const options = fullOptions();
  const first = prepareConversationTurn(options);
  const second = prepareConversationTurn(options);

  expect(second).toEqual(first);
});

test("startPreparedConversationTurn runs the prepared prompt through the port without recomposing", () => {
  let seenPrompt: unknown;
  const seen: ConversationTurnSafetyEvent[] = [];
  const prepared = prepareConversationTurn(fullOptions());
  const handle = startPreparedConversationTurn(prepared, {
    port: {
      async *run({ prompt }) {
        seenPrompt = prompt;
        yield { kind: "delta", text: "prepared " };
        yield { kind: "finish", provider: CURRENT_COORDINATOR_POLICY.provider, model: CURRENT_COORDINATOR_POLICY.model };
      },
    },
    onEvent: (event) => seen.push(event),
  });

  return handle.result.then((result) => {
    expect(seenPrompt).toEqual(prepared.prompt);
    assertFinished(result);
    expect(result.text).toBe("prepared ");
    expect(result.requested).toEqual(prepared.requested);
    expect(seen.some((event) => event.kind === "delta")).toBe(true);
  });
});

test("startPreparedConversationTurn interrupts the same way as the one-shot entry", async () => {
  const seen: ConversationTurnSafetyEvent[] = [];
  const prepared = prepareConversationTurn(fullOptions());
  const handle = startPreparedConversationTurn(prepared, {
    port: {
      async *run({ signal }) {
        yield { kind: "delta", text: "started" };
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 30_000);
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            resolve();
          }, { once: true });
        });
        yield { kind: "delta", text: "late" };
        yield { kind: "finish", provider: CURRENT_COORDINATOR_POLICY.provider, model: CURRENT_COORDINATOR_POLICY.model };
      },
    },
    onEvent: (event) => seen.push(event),
  });

  await until(() => seen.some((event) => event.kind === "delta"));
  handle.interrupt();
  const result = await handle.result;

  expect(result.kind).toBe("interrupted");
  expect(result.text).toBe("started");
  expect(seen).toEqual([{ kind: "delta", text: "started" }]);
});

test("strict operation schemas accept exactly the four typed kinds and reject everything else", () => {
  const primaryHead = "1".repeat(40);
  const worktreeHead = "2".repeat(40);
  expect(ConversationOperationSchema.parse({
    kind: "task_create",
    title: "Add the fixture result",
    objective: "Produce the bounded fixture result.",
    acceptance: ["the fixture exists"],
    projectId: "skills-dogfood",
    expectedPrimaryHead: primaryHead,
    worktreePath: "/tmp/skills-dogfood",
    expectedWorktreeHead: worktreeHead,
  })).toEqual({
    kind: "task_create",
    title: "Add the fixture result",
    objective: "Produce the bounded fixture result.",
    acceptance: ["the fixture exists"],
    projectId: "skills-dogfood",
    expectedPrimaryHead: primaryHead,
    worktreePath: "/tmp/skills-dogfood",
    expectedWorktreeHead: worktreeHead,
  });
  expect(ConversationOperationSchema.parse({
    kind: "task_correct",
    taskId: "task-1",
    expectedSourceRevision: 3,
    expectedRevision: 2,
    statement: "The result must also preserve the second fixture invariant.",
  })).toEqual({
    kind: "task_correct",
    taskId: "task-1",
    expectedSourceRevision: 3,
    expectedRevision: 2,
    statement: "The result must also preserve the second fixture invariant.",
  });
  expect(ConversationOperationSchema.parse({
    kind: "task_continue",
    taskId: "task-1",
    expectedSourceRevision: 3,
    expectedRevision: 2,
    workerId: "deepseek-flash",
    projectId: "repository:task-1",
    expectedPrimaryHead: primaryHead,
    worktreePath: "/path/to/task-1-worktree",
    expectedWorktreeHead: worktreeHead,
  })).toEqual({
    kind: "task_continue",
    taskId: "task-1",
    expectedSourceRevision: 3,
    expectedRevision: 2,
    workerId: "deepseek-flash",
    projectId: "repository:task-1",
    expectedPrimaryHead: primaryHead,
    worktreePath: "/path/to/task-1-worktree",
    expectedWorktreeHead: worktreeHead,
  });
  expect(ConversationOperationSchema.parse({
    kind: "work_control",
    carrierId: "attempt-1",
    control: "stop",
  })).toEqual({ kind: "work_control", carrierId: "attempt-1", control: "stop" });

  expect(() => ConversationOperationSchema.parse({ kind: "task_create" })).toThrow();
  expect(() => ConversationOperationSchema.parse({
    kind: "task_create",
    title: "t",
    objective: "o",
    acceptance: ["a"],
    projectId: "p",
    expectedPrimaryHead: primaryHead,
    worktreePath: "w",
    expectedWorktreeHead: worktreeHead,
    extra: 1,
  })).toThrow();
  expect(() => ConversationOperationSchema.parse({
    kind: "task_create",
    title: "t",
    objective: "o",
    acceptance: ["a"],
    projectId: "p",
    expectedPrimaryHead: "not-a-git-object",
    worktreePath: "w",
    expectedWorktreeHead: worktreeHead,
  })).toThrow();
  expect(() => ConversationOperationSchema.parse({
    kind: "task_correct",
    taskId: "task-1",
    expectedSourceRevision: 3,
    expectedRevision: 2,
  })).toThrow();
  expect(() => ConversationOperationSchema.parse({ kind: "other" })).toThrow();
  expect(() => ConversationOperationSchema.parse({
    kind: "task_continue",
    taskId: "task-1",
    expectedSourceRevision: 3,
    expectedRevision: 2,
    workerId: "deepseek-flash",
    projectId: "p",
    expectedPrimaryHead: primaryHead,
    worktreePath: "w",
    expectedWorktreeHead: worktreeHead,
    statement: "not part of this kind",
  })).toThrow();
  expect(() => ConversationOperationSchema.parse({
    kind: "task_continue",
    taskId: "task-1",
    expectedSourceRevision: 3,
    expectedRevision: 2,
  })).toThrow();
});

test("forwards exactly one typed operation into the finished turn result", async () => {
  const seen: ConversationTurnSafetyEvent[] = [];
  const operation = {
    kind: "task_create" as const,
    title: "Add the fixture result",
    objective: "Produce the bounded fixture result.",
    acceptance: ["the fixture exists"],
    projectId: "skills-dogfood",
    expectedPrimaryHead: "1".repeat(40),
    worktreePath: "/tmp/skills-dogfood",
    expectedWorktreeHead: "1".repeat(40),
  };
  const result = await runTurn(fullOptions(), [
    { kind: "delta", text: "Creating one task." },
    { kind: "operation", operation },
    {
      kind: "finish",
      provider: CURRENT_COORDINATOR_POLICY.provider,
      model: CURRENT_COORDINATOR_POLICY.model,
    },
  ], seen);

  expect(seen.some((event) => event.kind === "operation" && event.operation.kind === "task_create")).toBe(true);
  assertFinished(result);
  expect(result.operation).toEqual(operation);
});

test("an inquiry with no operation settles with no operation and no mutation intent", async () => {
  const seen: ConversationTurnSafetyEvent[] = [];
  const result = await runTurn(fullOptions(), [
    { kind: "delta", text: "The current state is settled; I took no action." },
    { kind: "finish", provider: CURRENT_COORDINATOR_POLICY.provider, model: CURRENT_COORDINATOR_POLICY.model },
  ], seen);

  assertFinished(result);
  expect(result.operation).toBeUndefined();
  expect(result.request).toBeUndefined();
  expect(seen.some((event) => event.kind === "operation")).toBe(false);
});

test("rejects a second consequential operation in the same message as a visible error", async () => {
  const seen: ConversationTurnSafetyEvent[] = [];
  const create = {
    kind: "task_create" as const,
    title: "t",
    objective: "o",
    acceptance: ["a"],
    projectId: "p",
    expectedPrimaryHead: "1".repeat(40),
    worktreePath: "w",
    expectedWorktreeHead: "1".repeat(40),
  };
  const correct = {
    kind: "task_correct" as const,
    taskId: "task-1",
    expectedSourceRevision: 1,
    expectedRevision: 1,
    statement: "s",
  };
  const result = await runTurn(fullOptions(), [
    { kind: "operation", operation: create },
    { kind: "operation", operation: correct },
    { kind: "finish", provider: CURRENT_COORDINATOR_POLICY.provider, model: CURRENT_COORDINATOR_POLICY.model },
  ], seen);

  assertFailed(result);
  expect(result.error).toContain("at most one consequential operation");
  expect(seen.some((event) => event.kind === "error")).toBe(true);
});

test("rejects a typed request and a consequential operation in the same message", async () => {
  const seen: ConversationTurnSafetyEvent[] = [];
  const result = await runTurn(fullOptions(), [
    { kind: "request", request: { kind: "project-instruction", ref: "workbench:state/projects.json" } },
    {
      kind: "operation",
      operation: {
        kind: "task_correct",
        taskId: "task-1",
        expectedSourceRevision: 1,
        expectedRevision: 1,
        statement: "s",
      },
    },
    { kind: "finish", provider: CURRENT_COORDINATOR_POLICY.provider, model: CURRENT_COORDINATOR_POLICY.model },
  ], seen);

  assertFailed(result);
  expect(result.error).toContain("at most one");
  expect(seen.some((event) => event.kind === "error")).toBe(true);
});
