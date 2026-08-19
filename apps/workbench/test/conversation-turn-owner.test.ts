import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
  CONVERSATION_PROMPT_REVISION,
  composeConversationPrompt,
  type ComposedConversationPrompt,
} from "../../autonomy/src/conversation-prompt";
import type {
  ConversationTurnPort,
} from "../../autonomy/src/conversation-coordinator";
import {
  COORDINATOR_CONVERSATION_POLICY,
  createCoordinatorTurnOwner,
} from "../src/conversation/turn-owner";

const SETTLED_USAGE = { inputTokens: 1, outputTokens: 2, totalTokens: 3, cachedInputTokens: 0 };

function preparationFor(owner: ReturnType<typeof createCoordinatorTurnOwner>) {
  return owner.prepare({
    turnId: randomUUID(),
    messageId: randomUUID(),
    payload: "fixture principal intent",
  });
}

async function until(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("timed out waiting for condition");
}

test("prepare returns the exact current coordinator policy with the composed prompt evidence", () => {
  const owner = createCoordinatorTurnOwner({ environment: { DEEPSEEK_API_KEY: "test-key" } });
  const turnId = randomUUID();
  const messageId = randomUUID();
  const payload = "fixture principal intent";
  const preparation = owner.prepare({ turnId, messageId, payload });

  expect(preparation.requestedPolicy).toEqual({
    provider: "deepseek",
    model: "deepseek-v4-pro",
    thinking: "enabled",
    reasoningEffort: "max",
  });
  const composed = composeConversationPrompt({
    message: { text: payload, lineage: { messageId, turnId } },
    policy: COORDINATOR_CONVERSATION_POLICY,
  });
  expect(preparation.prompt).toEqual({
    revision: CONVERSATION_PROMPT_REVISION,
    digest: composed.digest,
  });
  expect(preparation.prepared.prompt.digest).toBe(composed.digest);
  expect(preparation.prepared.requested.promptDigest).toBe(composed.digest);
  expect(preparation.disclosedSources).toEqual([]);
  expect(preparation.sourceRevisionSelectors).toEqual([]);
});

test("start streams delta callbacks in order and settles the coordinator result", async () => {
  const scriptedPort: ConversationTurnPort = {
    async *run() {
      yield { kind: "delta", text: "one " };
      yield { kind: "delta", text: "two" };
      yield { kind: "finish", usage: SETTLED_USAGE };
    },
  };
  const owner = createCoordinatorTurnOwner({
    environment: { DEEPSEEK_API_KEY: "test-key" },
    port: scriptedPort,
  });
  const preparation = preparationFor(owner);
  const deltas: string[] = [];
  const result = await owner.start(preparation, (text) => deltas.push(text)).result;

  expect(deltas).toEqual(["one ", "two"]);
  expect(result.kind).toBe("finished");
  expect(result.text).toBe("one two");
  expect(result.requested.model).toBe("deepseek-v4-pro");
  expect(result.observed.outcome).toBe("finished");
});

test("the composed prompt handed to the port carries the same digest as the journaled evidence", async () => {
  let seenPrompt: ComposedConversationPrompt | undefined;
  const scriptedPort: ConversationTurnPort = {
    async *run({ prompt }) {
      seenPrompt = prompt;
      yield { kind: "finish", usage: SETTLED_USAGE };
    },
  };
  const owner = createCoordinatorTurnOwner({
    environment: { DEEPSEEK_API_KEY: "test-key" },
    port: scriptedPort,
  });
  const preparation = preparationFor(owner);
  const result = await owner.start(preparation, () => {}).result;

  expect(result.kind).toBe("finished");
  expect(seenPrompt?.digest).toBe(preparation.prompt.digest);
  expect(seenPrompt?.digest).toBe(preparation.prepared.prompt.digest);
});

test("interrupt aborts the running prepared turn into an interrupted result", async () => {
  const scriptedPort: ConversationTurnPort = {
    async *run({ signal }) {
      yield { kind: "delta", text: "first" };
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 30_000);
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          resolve();
        }, { once: true });
      });
      yield { kind: "delta", text: "never delivered" };
      yield { kind: "finish", usage: SETTLED_USAGE };
    },
  };
  const owner = createCoordinatorTurnOwner({
    environment: { DEEPSEEK_API_KEY: "test-key" },
    port: scriptedPort,
  });
  const preparation = preparationFor(owner);
  const deltas: string[] = [];
  const handle = owner.start(preparation, (text) => deltas.push(text));
  await until(() => deltas.length === 1);
  handle.interrupt();
  const result = await handle.result;

  expect(result.kind).toBe("interrupted");
  expect(result.observed.outcome).toBe("interrupted");
  expect(deltas).toEqual(["first"]);
});

test("a missing DEEPSEEK_API_KEY fails the turn visibly instead of falling back to another carrier", async () => {
  const owner = createCoordinatorTurnOwner({ environment: {} });
  const preparation = preparationFor(owner);
  const deltas: string[] = [];
  const result = await owner.start(preparation, (text) => deltas.push(text)).result;

  expect(result.kind).toBe("failed");
  if (result.kind !== "failed") throw new Error("expected a failed turn");
  expect(result.error).toContain("DEEPSEEK_API_KEY");
  expect(result.error).toContain("not routed to a fallback carrier");
  expect(deltas).toEqual([]);
});
