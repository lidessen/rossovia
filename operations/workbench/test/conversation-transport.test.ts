import { afterEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CONVERSATION_SOCKET_MAX_MESSAGE_BYTES,
  ConversationSocketRuntime,
  ServerFrameSchema,
  type ConversationSocketData,
  type ServerFrame,
  type ServerJournalEventFrame,
  type ServerProtocolErrorFrame,
} from "../src/conversation/transport";
import type { MessageReceivedEvent } from "../src/conversation/contracts";
import { FileConversationJournal } from "../src/conversation/journal";
import type { AutonomyClient } from "../src/ui/autonomy-client";
import { createWorkbenchRequestHandler } from "../src/ui/server";
import {
  startPreparedConversationTurn,
  type ConversationTurnPortEvent,
} from "../../autonomy/src/conversation-coordinator";
import type {
  ConversationTurnOwner,
  TurnPreparation,
} from "../src/conversation/turn-owner";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "rossovia-conversation-transport-"));
  temporaryRoots.push(root);
  return root;
}

function socketPath(conversationId: string, query = ""): string {
  return `http://127.0.0.1:4317/api/conversations/${conversationId}/socket${query}`;
}

function stubServer(port = 4317, acceptUpgrade = true): {
  server: Bun.Server<ConversationSocketData>;
  upgrades: ConversationSocketData[];
} {
  const upgrades: ConversationSocketData[] = [];
  const server = {
    port,
    upgrade(request: Request, options: { data?: ConversationSocketData } = {}): boolean {
      if (options.data !== undefined) upgrades.push(options.data);
      return acceptUpgrade;
    },
  } as unknown as Bun.Server<ConversationSocketData>;
  return { server, upgrades };
}

const FAKE_PROMPT_DIGEST = "f".repeat(64);
const FAKE_REQUESTED_POLICY = {
  provider: "fake-coordinator",
  model: "fake.v1",
  thinking: "disabled",
  reasoningEffort: "none",
} as const;

function fakePreparation(): TurnPreparation {
  return {
    requestedPolicy: FAKE_REQUESTED_POLICY,
    prompt: { revision: "fake.prompt.v1", digest: FAKE_PROMPT_DIGEST },
    disclosedSources: [],
    sourceRevisionSelectors: [],
    prepared: {
      prompt: {
        revision: "fake.prompt.v1",
        prompt: "fake composed prompt",
        digest: FAKE_PROMPT_DIGEST,
        disclosedSources: [],
        sourceRevisionSelectors: [],
      },
      requested: {
        promptRevision: "fake.prompt.v1",
        promptDigest: FAKE_PROMPT_DIGEST,
        disclosedSources: [],
        sourceRevisionSelectors: [],
        ...FAKE_REQUESTED_POLICY,
      },
    },
  };
}

type PortScript = (signal: AbortSignal) => AsyncGenerator<ConversationTurnPortEvent>;

/**
 * A deterministic injected turn owner that runs the real coordinator kernel
 * over scripted port events, so the transport/bridge mapping is exercised
 * without any provider call.
 */
function scriptedOwner(scripts: readonly PortScript[]): ConversationTurnOwner {
  let index = 0;
  return {
    prepare: () => fakePreparation(),
    start(preparation, onDelta) {
      const script = scripts[Math.min(index, scripts.length - 1)]!;
      index += 1;
      return startPreparedConversationTurn(preparation.prepared, {
        port: { run: ({ signal }) => script(signal) },
        onEvent: (event) => {
          if (event.kind === "delta") onDelta(event.text);
        },
      });
    },
  };
}

const SETTLED_USAGE = { inputTokens: 3, outputTokens: 2, totalTokens: 5, cachedInputTokens: 0 };

function chunks(text: string, size: number): string[] {
  const result: string[] = [];
  for (let index = 0; index < text.length; index += size) result.push(text.slice(index, index + size));
  return result;
}

function settledScript(response: string): PortScript {
  return async function* () {
    for (const chunk of chunks(response, 4)) yield { kind: "delta", text: chunk };
    yield { kind: "finish", usage: SETTLED_USAGE };
  };
}

function observedScript(response: string): PortScript {
  return async function* () {
    yield { kind: "delta", text: response };
    yield {
      kind: "finish",
      provider: "fake-coordinator",
      model: "fake.v1",
      providerFingerprint: "fp-1",
      usage: { inputTokens: 7, outputTokens: 4, totalTokens: 11, cachedInputTokens: 0 },
    };
  };
}

function failingScript(reason: string, partial = "partial answer"): PortScript {
  return async function* () {
    yield { kind: "delta", text: partial };
    yield { kind: "error", message: reason };
  };
}

function slowSettledScript(response: string, stepMs = 40): PortScript {
  return async function* () {
    for (const chunk of chunks(response, 4)) {
      yield { kind: "delta", text: chunk };
      await Bun.sleep(stepMs);
    }
    yield { kind: "finish", usage: SETTLED_USAGE };
  };
}

class ManualGate {
  private releaseFn: (() => void) | null = null;
  private readonly released = new Promise<void>((resolve) => { this.releaseFn = resolve; });
  release(): void { this.releaseFn?.(); }
  /** Resolves when the test releases the gate or the turn signal aborts. */
  wait(signal: AbortSignal): Promise<void> {
    return Promise.race([
      this.released,
      new Promise<void>((resolve) => {
        signal.addEventListener("abort", () => resolve(), { once: true });
      }),
    ]);
  }
}

function gatedScript(gate: ManualGate, first: string, later: string): PortScript {
  return async function* (signal) {
    yield { kind: "delta", text: first };
    await gate.wait(signal);
    yield { kind: "delta", text: later };
    yield { kind: "finish", usage: SETTLED_USAGE };
  };
}

function routeFixture(): {
  runtime: ConversationSocketRuntime;
  handler: (request: Request, server?: Bun.Server<ConversationSocketData>) => Promise<Response>;
  server: Bun.Server<ConversationSocketData>;
  upgrades: ConversationSocketData[];
} {
  const runtime = new ConversationSocketRuntime(tempRoot(), {
    turnOwner: scriptedOwner([settledScript("fixture response")]),
  });
  const { server, upgrades } = stubServer();
  const handler = createWorkbenchRequestHandler(
    { port: 4317, roots: [] },
    {} as AutonomyClient,
    { conversationSocket: runtime },
  );
  return { runtime, handler, server, upgrades };
}

async function receiptedJournal(runtime: ConversationSocketRuntime, conversationId: string, count: number): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await runtime.journal.submitMessage(conversationId, {
      clientMessageId: randomUUID(),
      payload: `fixture message ${index}`,
    });
  }
}

async function startServer(root: string, owner: ConversationTurnOwner, replayDelayMs = 0): Promise<{
  runtime: ConversationSocketRuntime;
  server: Bun.Server<ConversationSocketData>;
  socketUrl: (conversationId: string, after: number) => string;
}> {
  const runtime = new ConversationSocketRuntime(root, { turnOwner: owner, replayDelayMs });
  const handler = createWorkbenchRequestHandler(
    { port: 0, roots: [] },
    {} as AutonomyClient,
    { conversationSocket: runtime },
  );
  const server: Bun.Server<ConversationSocketData> = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: (request, srv) => handler(request, srv),
    websocket: runtime.websocket,
  });
  return {
    runtime,
    server,
    socketUrl: (conversationId: string, after: number) =>
      `ws://127.0.0.1:${server.port}/api/conversations/${conversationId}/socket?after=${after}`,
  };
}

async function connect(url: string): Promise<{ ws: WebSocket; messages: ServerFrame[] }> {
  const messages: ServerFrame[] = [];
  const ws = new WebSocket(url);
  ws.addEventListener("message", (event) => {
    messages.push(ServerFrameSchema.parse(JSON.parse(String(event.data))));
  });
  await new Promise<void>((resolve, reject) => {
    ws.addEventListener("open", () => resolve());
    ws.addEventListener("error", () => reject(new Error(`socket error for ${url}`)));
  });
  return { ws, messages };
}

async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  label: string,
  timeoutMs = 5000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await predicate()) return;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
    await Bun.sleep(10);
  }
}

function durableSequences(messages: readonly ServerFrame[]): number[] {
  return messages
    .filter((frame): frame is ServerJournalEventFrame => frame.type === "journal.event")
    .map((frame) => frame.event.sequence);
}

function submit(client: { ws: WebSocket }, clientMessageId: string, payload: string): void {
  client.ws.send(JSON.stringify({ type: "message.submit", clientMessageId, payload }));
}

function interrupt(client: { ws: WebSocket }, turnId: string): void {
  client.ws.send(JSON.stringify({ type: "response.interrupt", turnId }));
}

function receiptFrames(messages: readonly ServerFrame[], clientMessageId: string): MessageReceivedEvent[] {
  return messages.flatMap((frame) =>
    frame.type === "journal.event"
      && frame.event.type === "message.received"
      && frame.event.data.clientMessageId === clientMessageId
      ? [frame.event]
      : [],
  );
}

function deltaTexts(messages: readonly ServerFrame[], turnId: string): string[] {
  return messages.flatMap((frame) =>
    frame.type === "response.delta" && frame.turnId === turnId ? [frame.text] : [],
  );
}

async function turnIdAt(runtime: ConversationSocketRuntime, conversationId: string, sequence: number): Promise<string> {
  const events = await runtime.journal.readEvents(conversationId);
  const started = events.find((event) =>
    event.type === "coordinator.turn-started" && event.sequence === sequence);
  if (started === undefined || started.type !== "coordinator.turn-started") {
    throw new Error(`no started turn at sequence ${sequence}`);
  }
  return started.data.turnId;
}

describe("conversation socket route validation", () => {
  test("upgrades the exact socket route with a UUID conversationId and the after cursor", async () => {
    const { runtime, handler, server, upgrades } = routeFixture();
    const conversationId = randomUUID();
    await receiptedJournal(runtime, conversationId, 4);
    const outcome = await handler(new Request(socketPath(conversationId, "?after=3")), server);

    expect(outcome).toBeUndefined();
    expect(upgrades).toEqual([{ conversationId, cursor: 3 }]);
  });

  test("defaults the after cursor to -1 and accepts an explicit -1", async () => {
    const { handler, server, upgrades } = routeFixture();
    const conversationId = randomUUID();
    await handler(new Request(socketPath(conversationId)), server);
    await handler(new Request(socketPath(conversationId, "?after=-1")), server);

    expect(upgrades.map((upgrade) => upgrade.cursor)).toEqual([-1, -1]);
  });

  test("rejects a malformed after cursor without upgrading", async () => {
    const { handler, server, upgrades } = routeFixture();
    const conversationId = randomUUID();
    for (const query of ["?after=-2", "?after=abc", "?after=1.5", "?after=", "?after=+1", "?after=99999999999999999999"]) {
      const response = await handler(new Request(socketPath(conversationId, query)), server);
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: "invalid-cursor" });
    }
    expect(upgrades).toEqual([]);
  });

  test("rejects an after cursor beyond the conversation's current journal head", async () => {
    const { runtime, handler, server, upgrades } = routeFixture();
    const conversationId = randomUUID();
    await receiptedJournal(runtime, conversationId, 3);
    expect(await runtime.journal.lastCursor(conversationId)).toBe(2);

    const beyondHead = await handler(new Request(socketPath(conversationId, "?after=3")), server);
    expect(beyondHead.status).toBe(400);
    expect(await beyondHead.json()).toMatchObject({
      error: "cursor-beyond-head",
      head: 2,
    });

    const atHead = await handler(new Request(socketPath(conversationId, "?after=2")), server);
    const fullReplay = await handler(new Request(socketPath(conversationId, "?after=-1")), server);
    expect(atHead).toBeUndefined();
    expect(fullReplay).toBeUndefined();
    expect(upgrades.map((upgrade) => upgrade.cursor)).toEqual([2, -1]);
  });

  test("rejects a non-UUID conversationId", async () => {
    const { handler, server, upgrades } = routeFixture();
    const response = await handler(new Request(socketPath("not-a-uuid")), server);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalid-conversation-id" });
    expect(upgrades).toEqual([]);
  });

  test("rejects paths that are not the exact socket route", async () => {
    const { handler, server, upgrades } = routeFixture();
    const conversationId = randomUUID();
    for (const path of [
      `/api/conversations/${conversationId}`,
      `/api/conversations/${conversationId}/socket/extra`,
      `/api/conversations/${conversationId}/other`,
    ]) {
      const response = await handler(new Request(`http://127.0.0.1:4317${path}`), server);
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({ error: "not-a-conversation-socket" });
    }
    expect(upgrades).toEqual([]);
  });

  test("rejects a non-GET method on the socket route", async () => {
    const { handler, server, upgrades } = routeFixture();
    const response = await handler(new Request(socketPath(randomUUID()), {
      method: "POST",
    }), server);

    expect(response.status).toBe(405);
    expect(upgrades).toEqual([]);
  });

  test("rejects any origin outside the exact loopback origin", async () => {
    const { handler, server, upgrades } = routeFixture();
    const conversationId = randomUUID();
    const foreignOrigin = await handler(new Request(socketPath(conversationId), {
      headers: { Origin: "http://evil.example" },
    }), server);
    const foreignPort = await handler(new Request(socketPath(conversationId), {
      headers: { Origin: "http://127.0.0.1:9999" },
    }), server);
    const foreignHost = await handler(new Request(socketPath(conversationId).replace("127.0.0.1", "evil.example")), server);

    expect(foreignOrigin.status).toBe(403);
    expect(await foreignOrigin.json()).toMatchObject({ error: "origin-rejected" });
    expect(foreignPort.status).toBe(403);
    expect(foreignHost.status).toBe(403);
    expect(upgrades).toEqual([]);
  });

  test("accepts the exact loopback origin and a missing origin", async () => {
    const { handler, server, upgrades } = routeFixture();
    const conversationId = randomUUID();
    await handler(new Request(socketPath(conversationId), {
      headers: { Origin: "http://127.0.0.1:4317" },
    }), server);
    await handler(new Request(socketPath(conversationId)), server);

    expect(upgrades.map((upgrade) => upgrade.conversationId)).toEqual([conversationId, conversationId]);
  });

  test("returns 400 when the native server refuses the upgrade", async () => {
    const { server } = stubServer(4317, false);
    const runtime = new ConversationSocketRuntime(tempRoot(), {
      turnOwner: scriptedOwner([settledScript("fixture response")]),
    });
    const response = await runtime.upgrade(
      new Request(socketPath(randomUUID(), "?after=-1")),
      server,
      4317,
    );

    expect(response).not.toBeUndefined();
    expect((response as Response).status).toBe(400);
    expect(await (response as Response).json()).toMatchObject({ error: "upgrade-failed" });
  });

  test("returns 404 when no conversation runtime is installed", async () => {
    const handler = createWorkbenchRequestHandler({ port: 4317, roots: [] }, {} as AutonomyClient);
    const response = await handler(new Request(socketPath(randomUUID())));

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: "conversation-socket-unavailable" });
  });

  test("one runtime owns exactly one journal instance from its construction boundary", () => {
    const root = tempRoot();
    const owner = scriptedOwner([settledScript("fixture response")]);
    const runtime = new ConversationSocketRuntime(root, { turnOwner: owner });
    const other = new ConversationSocketRuntime(root, { turnOwner: owner });

    expect(runtime.journal).toBeInstanceOf(FileConversationJournal);
    expect(other.journal).toBeInstanceOf(FileConversationJournal);
    expect(runtime.journal).not.toBe(other.journal);
    expect(runtime.journal.conversationPath(randomUUID()))
      .toMatch(/state\/conversation-events\/[0-9a-f-]+\.jsonl$/u);
  });
});

describe("conversation socket live delivery", () => {
  test("two simultaneous sockets receive the same ordered live durable events", async () => {
    const root = tempRoot();
    const { server, socketUrl } = await startServer(root, scriptedOwner([
      settledScript("settled fixture response"),
      settledScript("later fixture response"),
    ]));
    const conversationId = randomUUID();
    const first = await connect(socketUrl(conversationId, -1));
    const second = await connect(socketUrl(conversationId, -1));
    try {
      submit(first, randomUUID(), "create the fixture task");
      await waitFor(
        () => durableSequences(second.messages).includes(2),
        "second socket receives the full first turn",
      );
      expect(durableSequences(first.messages)).toEqual([0, 1, 2]);
      expect(durableSequences(second.messages)).toEqual([0, 1, 2]);
      expect(second.messages.some((frame) => frame.type === "response.delta")).toBe(true);

      submit(second, randomUUID(), "a later message");
      await waitFor(
        () => durableSequences(first.messages).length === 6,
        "both sockets receive the second turn",
      );
      expect(durableSequences(first.messages)).toEqual([0, 1, 2, 3, 4, 5]);
      expect(durableSequences(second.messages)).toEqual([0, 1, 2, 3, 4, 5]);
      expect(first.messages.filter((frame) => frame.type === "journal.event").map((frame) => frame.event.eventId))
        .toEqual(second.messages.filter((frame) => frame.type === "journal.event").map((frame) => frame.event.eventId));
    } finally {
      first.ws.close();
      second.ws.close();
      server.stop(true);
    }
  });

  test("the durable turn start precedes the first delta and settlement follows streaming", async () => {
    const root = tempRoot();
    const gate = new ManualGate();
    const { runtime, server, socketUrl } = await startServer(root, scriptedOwner([
      gatedScript(gate, "first chunk", "second chunk"),
    ]));
    const conversationId = randomUUID();
    const client = await connect(socketUrl(conversationId, -1));
    try {
      submit(client, randomUUID(), "fixture intent");
      await waitFor(
        () => client.messages.some((frame) => frame.type === "response.delta"),
        "first provisional delta",
      );
      const startedIndex = client.messages.findIndex((frame) =>
        frame.type === "journal.event" && frame.event.type === "coordinator.turn-started");
      const firstDeltaIndex = client.messages.findIndex((frame) => frame.type === "response.delta");
      expect(startedIndex).toBeGreaterThanOrEqual(0);
      expect(firstDeltaIndex).toBeGreaterThan(startedIndex);
      expect(await runtime.journal.lastCursor(conversationId)).toBe(1);

      gate.release();
      await waitFor(() => durableSequences(client.messages).length === 3, "the turn settles");
      expect(durableSequences(client.messages)).toEqual([0, 1, 2]);
      const turnId = await turnIdAt(runtime, conversationId, 1);
      expect(deltaTexts(client.messages, turnId).join("")).toBe("first chunksecond chunk");
    } finally {
      client.ws.close();
      server.stop(true);
    }
  });

  test("a second submit while a turn is active is receipted once and starts only after the first settles", async () => {
    const root = tempRoot();
    const gate = new ManualGate();
    const { runtime, server, socketUrl } = await startServer(root, scriptedOwner([
      gatedScript(gate, "first chunk", "second chunk"),
      settledScript("second response"),
    ]));
    const conversationId = randomUUID();
    const client = await connect(socketUrl(conversationId, -1));
    try {
      submit(client, randomUUID(), "first intent");
      await waitFor(
        () => client.messages.some((frame) => frame.type === "response.delta"),
        "the first turn streams",
      );
      const firstTurnId = await turnIdAt(runtime, conversationId, 1);

      submit(client, randomUUID(), "second intent");
      await waitFor(
        () => client.messages.some((frame) =>
          frame.type === "journal.event" && frame.event.type === "message.received" && frame.event.sequence === 2),
        "the second message is receipted while the first turn is active",
      );
      await Bun.sleep(60);
      const started = await runtime.journal.readEvents(conversationId);
      expect(started.filter((event) => event.type === "coordinator.turn-started")).toHaveLength(1);
      expect(await runtime.journal.lastCursor(conversationId)).toBe(2);

      interrupt(client, randomUUID());
      await waitFor(
        () => client.messages.some((frame) => frame.type === "protocol.error" && frame.code === "conflict"),
        "an interrupt for a non-active turn is a visible conflict",
      );

      gate.release();
      await waitFor(() => durableSequences(client.messages).length === 6, "both turns settle in order");
      expect(durableSequences(client.messages)).toEqual([0, 1, 2, 3, 4, 5]);
      const secondTurnId = await turnIdAt(runtime, conversationId, 4);
      expect(secondTurnId).not.toBe(firstTurnId);
      expect(deltaTexts(client.messages, secondTurnId).join("")).toBe("second response");
      const journalFrames = client.messages.filter(
        (frame): frame is ServerJournalEventFrame => frame.type === "journal.event",
      );
      const indexOf = (sequence: number) =>
        journalFrames.findIndex((frame) => frame.event.sequence === sequence);
      expect(indexOf(2)).toBeLessThan(indexOf(4));
    } finally {
      client.ws.close();
      server.stop(true);
    }
  });

  test("a settled turn retains the scripted response with minimal observed evidence", async () => {
    const root = tempRoot();
    const { runtime, server, socketUrl } = await startServer(root, scriptedOwner([
      settledScript("complete response text"),
    ]));
    const conversationId = randomUUID();
    const client = await connect(socketUrl(conversationId, -1));
    try {
      submit(client, randomUUID(), "fixture intent");
      await waitFor(() => durableSequences(client.messages).length === 3, "the turn settles");

      const events = await runtime.journal.readEvents(conversationId);
      const started = events.find((event) => event.type === "coordinator.turn-started");
      const settled = events.find((event) => event.type === "coordinator.turn-settled");
      expect(started?.type === "coordinator.turn-started" ? started.data.requestedPolicy : undefined)
        .toEqual(FAKE_REQUESTED_POLICY);
      expect(started?.type === "coordinator.turn-started" ? started.data.prompt : undefined)
        .toEqual({ revision: "fake.prompt.v1", digest: FAKE_PROMPT_DIGEST });
      expect(started?.type === "coordinator.turn-started" ? started.data.disclosedSources : undefined).toEqual([]);
      expect(settled?.type === "coordinator.turn-settled" ? settled.data.response : undefined)
        .toBe("complete response text");
      expect(settled?.type === "coordinator.turn-settled" ? settled.data.observedEvidence : undefined)
        .toEqual({ usage: { inputTokens: 3, outputTokens: 2 } });
    } finally {
      client.ws.close();
      server.stop(true);
    }
  });

  test("observed provider, model, and fingerprint map onto the settlement only when reported", async () => {
    const root = tempRoot();
    const { runtime, server, socketUrl } = await startServer(root, scriptedOwner([
      observedScript("observed answer"),
    ]));
    const conversationId = randomUUID();
    const client = await connect(socketUrl(conversationId, -1));
    try {
      submit(client, randomUUID(), "fixture intent");
      await waitFor(() => durableSequences(client.messages).length === 3, "the turn settles");

      const events = await runtime.journal.readEvents(conversationId);
      const settled = events.find((event) => event.type === "coordinator.turn-settled");
      expect(settled?.type === "coordinator.turn-settled" ? settled.data.observedEvidence : undefined)
        .toEqual({
          provider: "fake-coordinator",
          model: "fake.v1",
          fingerprint: "fp-1",
          usage: { inputTokens: 7, outputTokens: 4 },
        });
    } finally {
      client.ws.close();
      server.stop(true);
    }
  });

  test("a provider failure settles as a durable coordinator.turn-failed with the port reason", async () => {
    const root = tempRoot();
    const { runtime, server, socketUrl } = await startServer(root, scriptedOwner([
      failingScript("fixture provider failure"),
    ]));
    const conversationId = randomUUID();
    const client = await connect(socketUrl(conversationId, -1));
    try {
      submit(client, randomUUID(), "fixture intent");
      await waitFor(() => durableSequences(client.messages).length === 3, "the turn fails durably");

      const events = await runtime.journal.readEvents(conversationId);
      expect(events.map((event) => event.type)).toEqual([
        "message.received",
        "coordinator.turn-started",
        "coordinator.turn-failed",
      ]);
      const failed = events.find((event) => event.type === "coordinator.turn-failed");
      expect(failed?.type === "coordinator.turn-failed" ? failed.data.reason : undefined)
        .toBe("fixture provider failure");
      const turnId = await turnIdAt(runtime, conversationId, 1);
      expect(deltaTexts(client.messages, turnId)).toEqual(["partial answer"]);
    } finally {
      client.ws.close();
      server.stop(true);
    }
  });

  test("response.interrupt aborts the exact active turn with no further delta and a durable interruption", async () => {
    const root = tempRoot();
    const gate = new ManualGate();
    const { runtime, server, socketUrl } = await startServer(root, scriptedOwner([
      gatedScript(gate, "first chunk", "late chunk"),
    ]));
    const conversationId = randomUUID();
    const client = await connect(socketUrl(conversationId, -1));
    try {
      submit(client, randomUUID(), "fixture intent");
      await waitFor(
        () => client.messages.some((frame) => frame.type === "response.delta"),
        "the turn starts streaming",
      );
      const turnId = await turnIdAt(runtime, conversationId, 1);

      interrupt(client, turnId);
      await waitFor(() => durableSequences(client.messages).length === 3, "the turn interrupts durably");

      const events = await runtime.journal.readEvents(conversationId);
      expect(events.map((event) => event.type)).toEqual([
        "message.received",
        "coordinator.turn-started",
        "coordinator.turn-interrupted",
      ]);
      expect(deltaTexts(client.messages, turnId)).toEqual(["first chunk"]);
      expect(client.messages.some((frame) => frame.type === "response.delta" && frame.text === "late chunk"))
        .toBe(false);
    } finally {
      client.ws.close();
      server.stop(true);
    }
  });

  test("an interrupt for an unknown or already ended turn is a visible conflict", async () => {
    const root = tempRoot();
    const { runtime, server, socketUrl } = await startServer(root, scriptedOwner([
      settledScript("settled answer"),
    ]));
    const conversationId = randomUUID();
    const client = await connect(socketUrl(conversationId, -1));
    try {
      submit(client, randomUUID(), "fixture intent");
      await waitFor(() => durableSequences(client.messages).length === 3, "the turn settles");
      const turnId = await turnIdAt(runtime, conversationId, 1);

      interrupt(client, turnId);
      await waitFor(
        () => client.messages.some((frame) => frame.type === "protocol.error" && frame.code === "conflict"),
        "the ended turn conflict",
      );
      interrupt(client, randomUUID());
      await waitFor(
        () => client.messages.filter((frame) => frame.type === "protocol.error" && frame.code === "conflict").length >= 2,
        "the unknown turn conflict",
      );
      expect(await runtime.journal.readEvents(conversationId)).toHaveLength(3);
    } finally {
      client.ws.close();
      server.stop(true);
    }
  });

  test("tool.interrupt and work.control frames remain explicitly unsupported", async () => {
    const root = tempRoot();
    const { runtime, server, socketUrl } = await startServer(root, scriptedOwner([
      settledScript("fixture response"),
    ]));
    const conversationId = randomUUID();
    const client = await connect(socketUrl(conversationId, -1));
    try {
      client.ws.send(JSON.stringify({ type: "tool.interrupt", actionId: randomUUID() }));
      client.ws.send(JSON.stringify({
        type: "work.control",
        turnId: randomUUID(),
        actionId: randomUUID(),
        control: "stop",
      }));
      await waitFor(
        () => client.messages.filter((frame) => frame.type === "protocol.error").length >= 2,
        "all unsupported frames are rejected",
      );
      const errors = client.messages.filter(
        (frame): frame is ServerProtocolErrorFrame => frame.type === "protocol.error",
      );
      expect(errors.every((frame) => frame.code === "unsupported-frame")).toBe(true);
      expect(await runtime.journal.readEvents(conversationId)).toEqual([]);
    } finally {
      client.ws.close();
      server.stop(true);
    }
  });

  test("the same clientMessageId and digest returns the retained receipt without a second receipt or turn", async () => {
    const root = tempRoot();
    const { runtime, server, socketUrl } = await startServer(root, scriptedOwner([
      settledScript("fixture response"),
    ]));
    const conversationId = randomUUID();
    const clientMessageId = randomUUID();
    const client = await connect(socketUrl(conversationId, -1));
    try {
      submit(client, clientMessageId, "publish the fixture task");
      await waitFor(() => durableSequences(client.messages).length === 3, "first turn settles");
      const firstReceipt = receiptFrames(client.messages, clientMessageId)[0];
      expect(firstReceipt).toBeDefined();

      submit(client, clientMessageId, "publish the fixture task");
      await waitFor(
        () => receiptFrames(client.messages, clientMessageId).length === 2,
        "retained receipt is returned for the duplicate submit",
      );
      const receipts = receiptFrames(client.messages, clientMessageId);
      expect(receipts[0]!.eventId).toBe(receipts[1]!.eventId);
      expect(receipts[1]!.sequence).toBe(0);

      const events = await runtime.journal.readEvents(conversationId);
      expect(events.filter((event) => event.type === "message.received")).toHaveLength(1);
      expect(events.filter((event) => event.type === "coordinator.turn-started")).toHaveLength(1);
      expect(events.map((event) => event.sequence)).toEqual([0, 1, 2]);
    } finally {
      client.ws.close();
      server.stop(true);
    }
  });

  test("the same clientMessageId with a different digest returns a typed protocol conflict", async () => {
    const root = tempRoot();
    const { runtime, server, socketUrl } = await startServer(root, scriptedOwner([
      settledScript("fixture response"),
    ]));
    const conversationId = randomUUID();
    const clientMessageId = randomUUID();
    const client = await connect(socketUrl(conversationId, -1));
    try {
      submit(client, clientMessageId, "original intent");
      await waitFor(() => durableSequences(client.messages).length === 3, "first turn settles");

      submit(client, clientMessageId, "revised intent");
      await waitFor(
        () => client.messages.some((frame) => frame.type === "protocol.error"),
        "conflict error frame",
      );
      const conflict = client.messages.find(
        (frame): frame is ServerProtocolErrorFrame => frame.type === "protocol.error",
      )!;
      expect(conflict.code).toBe("conflict");

      const events = await runtime.journal.readEvents(conversationId);
      expect(events.map((event) => event.sequence)).toEqual([0, 1, 2]);
      expect(events.filter((event) => event.type === "message.received")).toHaveLength(1);
    } finally {
      client.ws.close();
      server.stop(true);
    }
  });

  test("rejects malformed client frames with a typed protocol error and writes nothing", async () => {
    const root = tempRoot();
    const { runtime, server, socketUrl } = await startServer(root, scriptedOwner([
      settledScript("fixture response"),
    ]));
    const conversationId = randomUUID();
    const client = await connect(socketUrl(conversationId, -1));
    try {
      client.ws.send("not-json");
      client.ws.send(JSON.stringify({ type: "message.submit", clientMessageId: "not-a-uuid", payload: "text" }));
      client.ws.send(JSON.stringify({ type: "message.submit", clientMessageId: randomUUID(), payload: "" }));
      client.ws.send(JSON.stringify({ type: "unknown.type" }));
      await waitFor(
        () => client.messages.filter((frame) => frame.type === "protocol.error").length >= 4,
        "all malformed frames are rejected",
      );
      const errors = client.messages.filter(
        (frame): frame is ServerProtocolErrorFrame => frame.type === "protocol.error",
      );
      expect(errors.every((frame) => frame.code === "invalid-frame")).toBe(true);
      expect(await runtime.journal.readEvents(conversationId)).toEqual([]);
    } finally {
      client.ws.close();
      server.stop(true);
    }
  });

  test("rejects an oversized WebSocket message before receipt or turn start", async () => {
    const root = tempRoot();
    const { runtime, server, socketUrl } = await startServer(root, scriptedOwner([
      settledScript("fixture response"),
    ]));
    const conversationId = randomUUID();
    const client = await connect(socketUrl(conversationId, -1));
    try {
      client.ws.send(JSON.stringify({
        type: "message.submit",
        clientMessageId: randomUUID(),
        payload: "x".repeat(CONVERSATION_SOCKET_MAX_MESSAGE_BYTES),
      }));
      await waitFor(
        () => client.messages.some((frame) => frame.type === "protocol.error"),
        "oversized frame rejection",
      );
      const error = client.messages.find(
        (frame): frame is ServerProtocolErrorFrame => frame.type === "protocol.error",
      );
      expect(error?.code).toBe("frame-too-large");
      expect(await runtime.journal.readEvents(conversationId)).toEqual([]);
    } finally {
      client.ws.close();
      server.stop(true);
    }
  });

  test("a cursor at the journal head still receives later live durable events", async () => {
    const root = tempRoot();
    const { server, socketUrl } = await startServer(root, scriptedOwner([
      settledScript("first response"),
      settledScript("later response"),
    ]));
    const conversationId = randomUUID();
    const client = await connect(socketUrl(conversationId, -1));
    try {
      submit(client, randomUUID(), "first intent");
      await waitFor(() => durableSequences(client.messages).length === 3, "first turn settles");
      expect(durableSequences(client.messages)).toEqual([0, 1, 2]);
      client.ws.close();

      const atHead = await connect(socketUrl(conversationId, 2));
      try {
        await Bun.sleep(100);
        expect(atHead.messages).toEqual([]);
        submit(atHead, randomUUID(), "later intent");
        await waitFor(() => durableSequences(atHead.messages).length === 3, "later live events after the head cursor");
        expect(durableSequences(atHead.messages)).toEqual([3, 4, 5]);
      } finally {
        atHead.ws.close();
      }
    } finally {
      server.stop(true);
    }
  });

  test("rejects an upgrade with a cursor beyond the current journal head at the HTTP boundary", async () => {
    const root = tempRoot();
    const { runtime, server, socketUrl } = await startServer(root, scriptedOwner([
      settledScript("fixture response"),
    ]));
    const conversationId = randomUUID();
    const client = await connect(socketUrl(conversationId, -1));
    try {
      submit(client, randomUUID(), "settled turn");
      await waitFor(() => durableSequences(client.messages).length === 3, "turn settles");
      expect(await runtime.journal.lastCursor(conversationId)).toBe(2);

      const response = await fetch(
        `http://127.0.0.1:${server.port}/api/conversations/${conversationId}/socket?after=9`,
      );
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: "cursor-beyond-head", head: 2 });
    } finally {
      client.ws.close();
      server.stop(true);
    }
  });
});

describe("conversation socket reconnect replay", () => {
  test("reconnect replays only later durable events from the last durable cursor and never provisional deltas", async () => {
    const root = tempRoot();
    const { runtime, server, socketUrl } = await startServer(root, scriptedOwner([
      slowSettledScript("hello world"),
    ]));
    const conversationId = randomUUID();
    const client = await connect(socketUrl(conversationId, -1));
    try {
      submit(client, randomUUID(), "hello world");
      await waitFor(() => durableSequences(client.messages).includes(1), "turn starts durably");
      await waitFor(
        () => client.messages.some((frame) => frame.type === "response.delta"),
        "provisional deltas flow",
      );
      client.ws.close();

      await waitFor(
        async () => (await runtime.journal.lastCursor(conversationId)) === 2,
        "the turn settles durably after the submitting socket disconnects",
      );

      const reconnected = await connect(socketUrl(conversationId, 1));
      try {
        await waitFor(() => durableSequences(reconnected.messages).length === 1, "replay after cursor");
        expect(durableSequences(reconnected.messages)).toEqual([2]);
        expect(reconnected.messages.filter((frame) => frame.type === "response.delta")).toEqual([]);
        expect(reconnected.messages.filter((frame) => frame.type === "activity.delta")).toEqual([]);
        const settlement = reconnected.messages.find((frame) =>
          frame.type === "journal.event" && frame.event.type === "coordinator.turn-settled");
        expect(settlement?.type === "journal.event"
          && settlement.event.type === "coordinator.turn-settled"
          ? settlement.event.data.response
          : undefined).toBe("hello world");

        const fullReplay = await connect(socketUrl(conversationId, -1));
        try {
          await waitFor(() => durableSequences(fullReplay.messages).length === 3, "full ordered replay");
          expect(durableSequences(fullReplay.messages)).toEqual([0, 1, 2]);
          expect(fullReplay.messages.filter((frame) => frame.type === "response.delta")).toEqual([]);
        } finally {
          fullReplay.ws.close();
        }
      } finally {
        reconnected.ws.close();
      }
    } finally {
      server.stop(true);
    }
  });

  test("a duplicate submit during replay is buffered, ordered, and deduplicated", async () => {
    const root = tempRoot();
    const { runtime, server, socketUrl } = await startServer(root, scriptedOwner([
      settledScript("first response"),
      settledScript("second response"),
    ]), 150);
    const conversationId = randomUUID();
    const firstClientMessageId = randomUUID();
    const first = await connect(socketUrl(conversationId, -1));
    try {
      submit(first, firstClientMessageId, "first intent");
      await waitFor(() => durableSequences(first.messages).length === 3, "first turn settles");
      submit(first, randomUUID(), "second intent");
      await waitFor(() => durableSequences(first.messages).length === 6, "second turn settles");
      first.ws.close();

      const reconnected = await connect(socketUrl(conversationId, 1));
      submit(reconnected, firstClientMessageId, "first intent");
      try {
        await waitFor(
          () => durableSequences(reconnected.messages).length === 4,
          "replay completes with the buffered duplicate receipt deduplicated",
        );
        expect(durableSequences(reconnected.messages)).toEqual([2, 3, 4, 5]);
        expect(reconnected.messages.some((frame) =>
          frame.type === "journal.event" && frame.event.sequence <= 1)).toBe(false);
        expect(reconnected.messages.filter((frame) => frame.type === "response.delta")).toEqual([]);

        const events = await runtime.journal.readEvents(conversationId);
        expect(events.map((event) => event.sequence)).toEqual([0, 1, 2, 3, 4, 5]);
        expect(events.filter((event) => event.type === "message.received")).toHaveLength(2);
        expect(events.filter((event) => event.type === "coordinator.turn-started")).toHaveLength(2);
      } finally {
        reconnected.ws.close();
      }
    } finally {
      server.stop(true);
    }
  });

  test("a non-browser protocol client observes submit, durable receipt, provisional deltas, settlement, disconnect, and ordered replay", async () => {
    const root = tempRoot();
    const { server, socketUrl } = await startServer(root, scriptedOwner([
      settledScript("hello protocol world"),
    ]));
    const conversationId = randomUUID();
    const client = await connect(socketUrl(conversationId, -1));
    try {
      submit(client, randomUUID(), "say hello");
      await waitFor(() => durableSequences(client.messages).length === 3, "the full settled turn");
      expect(durableSequences(client.messages)).toEqual([0, 1, 2]);
      const turnId = await turnIdAtFromFrames(client.messages, 1);
      expect(deltaTexts(client.messages, turnId).join("")).toBe("hello protocol world");
      const receipt = client.messages.find(
        (frame): frame is ServerJournalEventFrame => frame.type === "journal.event" && frame.event.sequence === 0,
      )!;
      expect(client.messages.filter((frame) => frame.type === "response.delta")
        .every((frame) => frame.messageId === receipt.event.data.messageId)).toBe(true);
      client.ws.close();

      const reconnected = await connect(socketUrl(conversationId, 1));
      try {
        await waitFor(() => durableSequences(reconnected.messages).length === 1, "ordered replay after disconnect");
        expect(durableSequences(reconnected.messages)).toEqual([2]);
        expect(reconnected.messages.filter((frame) => frame.type === "response.delta")).toEqual([]);
        expect(reconnected.messages.filter((frame) => frame.type === "activity.delta")).toEqual([]);
        const settlement = reconnected.messages.find((frame) =>
          frame.type === "journal.event" && frame.event.type === "coordinator.turn-settled");
        expect(settlement?.type === "journal.event"
          && settlement.event.type === "coordinator.turn-settled"
          ? settlement.event.data.response
          : undefined).toBe("hello protocol world");
      } finally {
        reconnected.ws.close();
      }
    } finally {
      server.stop(true);
    }
  });
});

function turnIdAtFromFrames(messages: readonly ServerFrame[], sequence: number): string {
  const frame = messages.find((candidate): candidate is ServerJournalEventFrame =>
    candidate.type === "journal.event"
      && candidate.event.type === "coordinator.turn-started"
      && candidate.event.sequence === sequence);
  if (frame === undefined || frame.event.type !== "coordinator.turn-started") {
    throw new Error(`no started turn at sequence ${sequence}`);
  }
  return frame.event.data.turnId;
}

import type {
  ConversationOperation,
} from "../../autonomy/src/conversation-coordinator";
import type { CompactProjection } from "../../autonomy/src/conversation-prompt";
import { taskActionSourceRef } from "../src/conversation/contracts";
import {
  ConversationOperationHostError,
  type ConversationOperationHost,
} from "../src/conversation/operations";
import type { ConversationContextProvider } from "../src/conversation/context";

const CREATE_OPERATION: ConversationOperation = {
  kind: "task_create",
  title: "Publish the bounded fixture result",
  objective: "Produce the bounded fixture result.",
  acceptance: ["the fixture result exists"],
  projectId: "fixture-project",
  expectedPrimaryHead: "1".repeat(40),
  worktreePath: "/tmp/fixture-worktree",
  expectedWorktreeHead: "1".repeat(40),
};

function operationScript(response: string, operation: ConversationOperation): PortScript {
  return async function* () {
    yield { kind: "delta", text: response };
    yield { kind: "operation", operation };
    yield { kind: "finish", usage: SETTLED_USAGE };
  };
}

type FakeHostReceipt = {
  taskId: string;
  sourceRevision: number;
  taskRevision: number;
  evidenceRefs: readonly string[];
};

function scriptedOperationHost(
  options: { failWith?: string } = {},
): ConversationOperationHost & {
  executed: Array<{ conversationId: string; actionId: string; operation: ConversationOperation }>;
  canonical: Map<string, FakeHostReceipt>;
} {
  const canonical = new Map<string, FakeHostReceipt>();
  const executed: Array<{ conversationId: string; actionId: string; operation: ConversationOperation }> = [];
  return {
    home: "/tmp/fake-operation-host",
    executed,
    canonical,
    executeOperation(input) {
      if (options.failWith !== undefined) {
        throw new ConversationOperationHostError("project-unresolved", options.failWith);
      }
      executed.push(input);
      const receipt: FakeHostReceipt = {
        taskId: randomUUID(),
        sourceRevision: 1,
        taskRevision: 1,
        evidenceRefs: [`workbench:state/tasks.json:task/${randomUUID()}@1`],
      };
      canonical.set(taskActionSourceRef(input.conversationId, input.actionId), receipt);
      return receipt;
    },
    findCanonicalReceipt(input) {
      const receipt = canonical.get(taskActionSourceRef(input.conversationId, input.actionId));
      return receipt === undefined
        ? { standing: "absent" as const }
        : { standing: "settled" as const, receipt };
    },
  };
}

async function startOperationServer(
  root: string,
  owner: ConversationTurnOwner,
  operationHost?: ConversationOperationHost,
  projectionProvider?: ConversationContextProvider,
): Promise<{
  runtime: ConversationSocketRuntime;
  server: Bun.Server<ConversationSocketData>;
  socketUrl: (conversationId: string, after: number) => string;
}> {
  const runtime = new ConversationSocketRuntime(root, {
    turnOwner: owner,
    ...(operationHost === undefined ? {} : { operationHost }),
    ...(projectionProvider === undefined ? {} : { projectionProvider }),
  });
  const handler = createWorkbenchRequestHandler(
    { port: 0, roots: [] },
    {} as AutonomyClient,
    { conversationSocket: runtime },
  );
  const server: Bun.Server<ConversationSocketData> = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: (request, srv) => handler(request, srv),
    websocket: runtime.websocket,
  });
  return {
    runtime,
    server,
    socketUrl: (conversationId: string, after: number) =>
      `ws://127.0.0.1:${server.port}/api/conversations/${conversationId}/socket?after=${after}`,
  };
}

test("a finished turn with one typed operation journals action.requested before the effect and settles the canonical receipt", async () => {
  const root = tempRoot();
  const host = scriptedOperationHost();
  const { runtime, server, socketUrl } = await startOperationServer(
    root,
    scriptedOwner([operationScript("Creating one task.", CREATE_OPERATION)]),
    host,
  );
  const conversationId = randomUUID();
  const client = await connect(socketUrl(conversationId, -1));
  submit(client, randomUUID(), "create the fixture task");

  await waitFor(() => client.messages.some((frame) =>
    frame.type === "journal.event" && frame.event.type === "coordinator.turn-settled"), "settled turn");

  const events = await runtime.journal.readEvents(conversationId);
  const sequences = events.map((event) => `${event.sequence}:${event.type}`);
  expect(sequences).toEqual([
    "0:message.received",
    "1:coordinator.turn-started",
    "2:action.requested",
    "3:action.settled",
    "4:coordinator.turn-settled",
  ]);
  const requested = events[2]!;
  if (requested.type !== "action.requested") throw new Error("expected action.requested");
  expect(requested.data.kind).toBe("task_create");
  expect(requested.data.operation).toEqual(CREATE_OPERATION);
  const settled = events[3]!;
  if (settled.type !== "action.settled") throw new Error("expected action.settled");
  expect(host.executed).toHaveLength(1);
  expect(host.executed[0]).toMatchObject({
    conversationId,
    operation: CREATE_OPERATION,
  });
  expect(settled.data.actionId).toBe(host.executed[0]!.actionId);
  expect([...settled.data.evidenceRefs]).toEqual(
    Array.from(host.canonical.values())[0]!.evidenceRefs.map((ref) => ref),
  );
  expect(client.messages.some((frame) => frame.type === "projection.changed")).toBe(true);
  server.stop(true);
});

test("an inquiry turn with no operation performs no action and no mutation", async () => {
  const root = tempRoot();
  const host = scriptedOperationHost();
  const { runtime, server, socketUrl } = await startOperationServer(
    root,
    scriptedOwner([settledScript("The current state is settled; no action.")]),
    host,
  );
  const conversationId = randomUUID();
  const client = await connect(socketUrl(conversationId, -1));
  submit(client, randomUUID(), "what is the current state");

  await waitFor(() => client.messages.some((frame) =>
    frame.type === "journal.event" && frame.event.type === "coordinator.turn-settled"), "settled turn");

  const events = await runtime.journal.readEvents(conversationId);
  expect(events.some((event) => event.type === "action.requested")).toBe(false);
  expect(host.executed).toHaveLength(0);
  server.stop(true);
});

test("a duplicate client message never repeats the committed mutation", async () => {
  const root = tempRoot();
  const host = scriptedOperationHost();
  const { runtime, server, socketUrl } = await startOperationServer(
    root,
    scriptedOwner([operationScript("Creating one task.", CREATE_OPERATION)]),
    host,
  );
  const conversationId = randomUUID();
  const client = await connect(socketUrl(conversationId, -1));
  const clientMessageId = randomUUID();
  submit(client, clientMessageId, "create the fixture task");
  submit(client, clientMessageId, "create the fixture task");

  await waitFor(() => client.messages.some((frame) =>
    frame.type === "journal.event" && frame.event.type === "coordinator.turn-settled"), "settled turn");
  await waitFor(() => receiptFrames(client.messages, clientMessageId).length >= 1, "receipt delivery");
  await Bun.sleep(50);

  const events = await runtime.journal.readEvents(conversationId);
  expect(events.filter((event) => event.type === "action.requested")).toHaveLength(1);
  expect(events.filter((event) => event.type === "action.settled")).toHaveLength(1);
  expect(host.executed).toHaveLength(1);
  server.stop(true);
});

test("a reconnect replays each durable action event exactly once without re-execution", async () => {
  const root = tempRoot();
  const host = scriptedOperationHost();
  const { runtime, server, socketUrl } = await startOperationServer(
    root,
    scriptedOwner([operationScript("Creating one task.", CREATE_OPERATION)]),
    host,
  );
  const conversationId = randomUUID();
  const first = await connect(socketUrl(conversationId, -1));
  submit(first, randomUUID(), "create the fixture task");
  await waitFor(() => first.messages.some((frame) =>
    frame.type === "journal.event" && frame.event.type === "coordinator.turn-settled"), "settled turn");
  first.ws.close();

  const second = await connect(socketUrl(conversationId, -1));
  await waitFor(() => second.messages.some((frame) =>
    frame.type === "journal.event" && frame.event.type === "coordinator.turn-settled"), "replayed turn");
  await Bun.sleep(50);

  const replayed = second.messages.filter((frame) => frame.type === "journal.event");
  expect(replayed.filter((frame) => frame.event.type === "action.requested")).toHaveLength(1);
  expect(replayed.filter((frame) => frame.event.type === "action.settled")).toHaveLength(1);
  expect(host.executed).toHaveLength(1);
  const events = await runtime.journal.readEvents(conversationId);
  expect(events.filter((event) => event.type === "action.requested")).toHaveLength(1);
  server.stop(true);
});

test("a refused operation journals a visible action.failed with no effect and settles the turn", async () => {
  const root = tempRoot();
  const host = scriptedOperationHost({ failWith: "project is not registered" });
  const { runtime, server, socketUrl } = await startOperationServer(
    root,
    scriptedOwner([operationScript("Attempting a create.", CREATE_OPERATION)]),
    host,
  );
  const conversationId = randomUUID();
  const client = await connect(socketUrl(conversationId, -1));
  submit(client, randomUUID(), "create the fixture task");

  await waitFor(() => client.messages.some((frame) =>
    frame.type === "journal.event" && frame.event.type === "coordinator.turn-settled"), "settled turn");

  const events = await runtime.journal.readEvents(conversationId);
  const failed = events.find((event) => event.type === "action.failed");
  expect(failed).toBeDefined();
  if (failed?.type !== "action.failed") throw new Error("expected action.failed");
  expect(failed.data.reason).toBe("project is not registered");
  expect(host.canonical.size).toBe(0);
  expect(events.some((event) => event.type === "action.settled")).toBe(false);
  server.stop(true);
});

test("a runtime without an operation host fails the action visibly instead of dropping it", async () => {
  const root = tempRoot();
  const { runtime, server, socketUrl } = await startOperationServer(
    root,
    scriptedOwner([operationScript("Attempting a create.", CREATE_OPERATION)]),
  );
  const conversationId = randomUUID();
  const client = await connect(socketUrl(conversationId, -1));
  submit(client, randomUUID(), "create the fixture task");

  await waitFor(() => client.messages.some((frame) =>
    frame.type === "journal.event" && frame.event.type === "coordinator.turn-settled"), "settled turn");

  const events = await runtime.journal.readEvents(conversationId);
  const failed = events.find((event) => event.type === "action.failed");
  expect(failed).toBeDefined();
  if (failed?.type !== "action.failed") throw new Error("expected action.failed");
  expect(failed.data.reason).toContain("not installed");
  server.stop(true);
});

test("after a crash between effect and journal settlement, reconnect reconciles the canonical receipt without re-mutation", async () => {
  const root = tempRoot();
  const conversationId = randomUUID();
  const host = scriptedOperationHost();
  // Stage the crash: a durably journaled action.requested whose effect already
  // committed in the canonical owner but whose terminal event was never
  // journaled because the server died between the two.
  const staging = new ConversationSocketRuntime(root, {
    turnOwner: scriptedOwner([operationScript("Creating one task.", CREATE_OPERATION)]),
  });
  const message = await staging.journal.submitMessage(conversationId, {
    clientMessageId: randomUUID(),
    payload: "create the fixture task",
  });
  const turn = await staging.journal.startTurn(conversationId, {
    turnId: randomUUID(),
    messageId: message.event.data.messageId,
    requestedPolicy: FAKE_REQUESTED_POLICY,
  });
  const actionId = randomUUID();
  const committed: FakeHostReceipt = {
    taskId: randomUUID(),
    sourceRevision: 1,
    taskRevision: 1,
    evidenceRefs: [`workbench:state/tasks.json:task/${randomUUID()}@1`],
  };
  host.canonical.set(taskActionSourceRef(conversationId, actionId), committed);
  await staging.journal.requestAction(conversationId, {
    actionId,
    turnId: turn.data.turnId,
    messageId: message.event.data.messageId,
    operation: CREATE_OPERATION,
  });
  await staging.journal.settleTurn(conversationId, {
    turnId: turn.data.turnId,
    messageId: message.event.data.messageId,
    response: "created",
  });

  // The server restarts with the same canonical owner and a fresh runtime;
  // the reconnect triggers reconciliation before replay.
  const { runtime, server, socketUrl } = await startOperationServer(
    root,
    scriptedOwner([settledScript("fixture response")]),
    host,
  );
  const client = await connect(socketUrl(conversationId, -1));
  await waitFor(() => client.messages.some((frame) =>
    frame.type === "journal.event" && frame.event.type === "action.settled"), "reconciled settlement");

  expect(host.executed).toHaveLength(0);
  const events = await runtime.journal.readEvents(conversationId);
  const settled = events.find((event) => event.type === "action.settled");
  expect(settled).toBeDefined();
  if (settled?.type !== "action.settled") throw new Error("expected action.settled");
  expect(settled.data.actionId).toBe(actionId);
  expect([...settled.data.evidenceRefs]).toEqual([...committed.evidenceRefs]);
  server.stop(true);
});

test("an unsettled action whose effect is provably absent is retried exactly once and settled", async () => {
  const root = tempRoot();
  const conversationId = randomUUID();
  const host = scriptedOperationHost();
  const staging = new ConversationSocketRuntime(root, {
    turnOwner: scriptedOwner([operationScript("Creating one task.", CREATE_OPERATION)]),
  });
  const message = await staging.journal.submitMessage(conversationId, {
    clientMessageId: randomUUID(),
    payload: "create the fixture task",
  });
  const turn = await staging.journal.startTurn(conversationId, {
    turnId: randomUUID(),
    messageId: message.event.data.messageId,
    requestedPolicy: FAKE_REQUESTED_POLICY,
  });
  await staging.journal.requestAction(conversationId, {
    actionId: randomUUID(),
    turnId: turn.data.turnId,
    messageId: message.event.data.messageId,
    operation: CREATE_OPERATION,
  });

  const { runtime, server, socketUrl } = await startOperationServer(
    root,
    scriptedOwner([settledScript("fixture response")]),
    host,
  );
  const client = await connect(socketUrl(conversationId, -1));
  await waitFor(() => client.messages.some((frame) =>
    frame.type === "journal.event" && frame.event.type === "action.settled"), "retried settlement");

  expect(host.executed).toHaveLength(1);
  expect(host.executed[0]).toMatchObject({ conversationId, operation: CREATE_OPERATION });
  const events = await runtime.journal.readEvents(conversationId);
  expect(events.filter((event) => event.type === "action.settled")).toHaveLength(1);
  server.stop(true);
});

test("a failed action.requested journal append fails the turn visibly and never calls the operation host", async () => {
  const root = tempRoot();
  const host = scriptedOperationHost();
  const { runtime, server, socketUrl } = await startOperationServer(
    root,
    scriptedOwner([operationScript("Attempting a create.", CREATE_OPERATION)]),
    host,
  );
  const originalRequestAction = runtime.journal.requestAction.bind(runtime.journal);
  runtime.journal.requestAction = () => Promise.reject(new Error("journal append failed"));
  try {
    const conversationId = randomUUID();
    const client = await connect(socketUrl(conversationId, -1));
    submit(client, randomUUID(), "create the fixture task");

    await waitFor(() => client.messages.some((frame) =>
      frame.type === "journal.event" && frame.event.type === "coordinator.turn-failed"), "failed turn");

    const events = await runtime.journal.readEvents(conversationId);
    expect(events.some((event) => event.type === "action.requested")).toBe(false);
    expect(events.some((event) => event.type === "coordinator.turn-settled")).toBe(false);
    const failed = events.find((event) => event.type === "coordinator.turn-failed");
    if (failed?.type !== "coordinator.turn-failed") throw new Error("expected coordinator.turn-failed");
    expect(failed.data.reason).toContain("could not be journaled before the effect");
    expect(host.executed).toHaveLength(0);
    expect(host.canonical.size).toBe(0);
  } finally {
    runtime.journal.requestAction = originalRequestAction;
    server.stop(true);
  }
});

test("a failed action.settled append leaves the action reconcilable: reconnect settles the committed receipt without re-execution", async () => {
  const root = tempRoot();
  const conversationId = randomUUID();
  const host = scriptedOperationHost();
  const { runtime, server, socketUrl } = await startOperationServer(
    root,
    scriptedOwner([operationScript("Creating one task.", CREATE_OPERATION)]),
    host,
  );
  const originalSettleAction = runtime.journal.settleAction.bind(runtime.journal);
  let failNextSettle = true;
  runtime.journal.settleAction = (id: string, draft: Parameters<FileConversationJournal["settleAction"]>[1]) => {
    if (failNextSettle) {
      failNextSettle = false;
      return Promise.reject(new Error("append after the effect failed"));
    }
    return originalSettleAction(id, draft);
  };
  try {
    const first = await connect(socketUrl(conversationId, -1));
    submit(first, randomUUID(), "create the fixture task");
    await waitFor(() => first.messages.some((frame) =>
      frame.type === "journal.event" && frame.event.type === "coordinator.turn-settled"), "settled turn");
    first.ws.close();

    let events = await runtime.journal.readEvents(conversationId);
    expect(events.filter((event) => event.type === "action.requested")).toHaveLength(1);
    expect(events.some((event) => event.type === "action.settled")).toBe(false);
    expect(events.some((event) => event.type === "action.failed")).toBe(false);
    expect(host.executed).toHaveLength(1);

    // Reconnect: reconciliation finds the canonical receipt and appends the
    // settlement without calling the host again.
    const second = await connect(socketUrl(conversationId, -1));
    await waitFor(() => second.messages.some((frame) =>
      frame.type === "journal.event" && frame.event.type === "action.settled"), "reconciled settlement");

    events = await runtime.journal.readEvents(conversationId);
    const settled = events.find((event) => event.type === "action.settled");
    if (settled?.type !== "action.settled") throw new Error("expected action.settled");
    expect([...settled.data.evidenceRefs]).toEqual(
      Array.from(host.canonical.values())[0]!.evidenceRefs.map((ref) => ref),
    );
    expect(host.executed).toHaveLength(1);
    expect(events.filter((event) => event.type === "action.failed")).toHaveLength(0);
    second.ws.close();
  } finally {
    runtime.journal.settleAction = originalSettleAction;
    server.stop(true);
  }
});

test("the projection provider result flows into the turn owner preparation", async () => {
  const root = tempRoot();
  const captured: Array<CompactProjection | undefined> = [];
  let base = scriptedOwner([settledScript("fixture response")]);
  const owner: ConversationTurnOwner = {
    prepare: (input) => {
      captured.push(input.projection);
      return base.prepare(input);
    },
    start: (preparation, onDelta) => base.start(preparation, onDelta),
  };
  const provider: ConversationContextProvider = {
    buildProjection: async () => ({
      projects: [{
        name: "fixture-project",
        id: "fixture-project",
        status: "registered",
        primaryHead: "1".repeat(40),
        worktrees: [{ path: "/tmp/fixture-worktree", head: "1".repeat(40) }],
      }],
    }),
  };
  const { runtime, server, socketUrl } = await startOperationServer(root, owner, undefined, provider);
  const conversationId = randomUUID();
  const client = await connect(socketUrl(conversationId, -1));
  submit(client, randomUUID(), "show the projection");

  await waitFor(() => client.messages.some((frame) =>
    frame.type === "journal.event" && frame.event.type === "coordinator.turn-settled"), "settled turn");
  await waitFor(() => captured.length === 1, "prepared turn");

  expect(captured[0]?.projects).toHaveLength(1);
  expect(captured[0]?.projects?.[0]?.id).toBe("fixture-project");
  expect(captured[0]?.projects?.[0]?.worktrees?.[0]?.head).toBe("1".repeat(40));
  server.stop(true);
});
