import { afterEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
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

function routeFixture(): {
  handler: (request: Request, server?: Bun.Server<ConversationSocketData>) => Promise<Response>;
  server: Bun.Server<ConversationSocketData>;
  upgrades: ConversationSocketData[];
} {
  const { server, upgrades } = stubServer();
  const handler = createWorkbenchRequestHandler(
    { port: 4317, roots: [] },
    {} as AutonomyClient,
    { conversationSocket: new ConversationSocketRuntime(tempRoot()) },
  );
  return { handler, server, upgrades };
}

async function startServer(root: string, deltaDelayMs = 12): Promise<{
  runtime: ConversationSocketRuntime;
  server: Bun.Server<ConversationSocketData>;
  socketUrl: (conversationId: string, after: number) => string;
}> {
  const runtime = new ConversationSocketRuntime(root, { deltaDelayMs });
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

function receiptFrames(messages: readonly ServerFrame[], clientMessageId: string): MessageReceivedEvent[] {
  return messages.flatMap((frame) =>
    frame.type === "journal.event"
      && frame.event.type === "message.received"
      && frame.event.data.clientMessageId === clientMessageId
      ? [frame.event]
      : [],
  );
}

describe("conversation socket route validation", () => {
  test("upgrades the exact socket route with a UUID conversationId and the after cursor", async () => {
    const { handler, server, upgrades } = routeFixture();
    const conversationId = randomUUID();
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
    const runtime = new ConversationSocketRuntime(tempRoot());
    const response = runtime.upgrade(
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
    const runtime = new ConversationSocketRuntime(root);
    const other = new ConversationSocketRuntime(root);

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
    const { server, socketUrl } = await startServer(root);
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

  test("a connection can inbound submit a second message while the first echo is still streaming", async () => {
    const root = tempRoot();
    const { server, socketUrl } = await startServer(root, 25);
    const conversationId = randomUUID();
    const client = await connect(socketUrl(conversationId, -1));
    try {
      const longPayload = "a".repeat(64);
      submit(client, randomUUID(), longPayload);
      await waitFor(
        () => client.messages.some((frame) => frame.type === "response.delta"),
        "first provisional delta",
      );
      const deltasBefore = client.messages.filter((frame) => frame.type === "response.delta").length;
      expect(deltasBefore).toBeGreaterThan(0);

      submit(client, randomUUID(), "second while streaming");
      await waitFor(
        () => client.messages.filter((frame) => frame.type === "response.delta").length > deltasBefore,
        "the second turn's provisional deltas arrive",
      );
      await waitFor(
        () => durableSequences(client.messages).length === 6,
        "both turns settle",
      );
      const journalFrames = client.messages.filter(
        (frame): frame is ServerJournalEventFrame => frame.type === "journal.event",
      );
      const indexOf = (sequence: number) =>
        journalFrames.findIndex((frame) => frame.event.sequence === sequence);
      expect(durableSequences(client.messages)).toEqual([0, 1, 2, 3, 4, 5]);
      expect(indexOf(2)).toBeGreaterThan(indexOf(1));
      expect(indexOf(2)).toBeLessThan(indexOf(5));
      expect(indexOf(3)).toBeLessThan(indexOf(5));
      expect(indexOf(4)).toBeLessThan(indexOf(5));
      const deltas = client.messages.filter((frame) => frame.type === "response.delta");
      const echoByTurn = new Map<string, string>();
      for (const delta of deltas) {
        echoByTurn.set(delta.turnId, (echoByTurn.get(delta.turnId) ?? "") + delta.text);
      }
      const turnIdAt = (sequence: number) => {
        const frame = journalFrames.find((candidate) =>
          candidate.event.type === "coordinator.turn-started" && candidate.event.sequence === sequence);
        if (frame === undefined || frame.event.type !== "coordinator.turn-started") {
          throw new Error(`no started turn at sequence ${sequence}`);
        }
        return frame.event.data.turnId;
      };
      expect(echoByTurn.get(turnIdAt(1))).toBe(longPayload);
      expect(echoByTurn.get(turnIdAt(3))).toBe("second while streaming");
    } finally {
      client.ws.close();
      server.stop(true);
    }
  });

  test("the same clientMessageId and digest returns the retained receipt without a second receipt or turn", async () => {
    const root = tempRoot();
    const { runtime, server, socketUrl } = await startServer(root);
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
    const { runtime, server, socketUrl } = await startServer(root);
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
    const { runtime, server, socketUrl } = await startServer(root);
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

  test("rejects interrupt and control frames the echo runtime does not own", async () => {
    const root = tempRoot();
    const { runtime, server, socketUrl } = await startServer(root);
    const conversationId = randomUUID();
    const client = await connect(socketUrl(conversationId, -1));
    try {
      client.ws.send(JSON.stringify({ type: "response.interrupt", turnId: randomUUID() }));
      client.ws.send(JSON.stringify({ type: "tool.interrupt", actionId: randomUUID() }));
      client.ws.send(JSON.stringify({
        type: "work.control",
        turnId: randomUUID(),
        actionId: randomUUID(),
        control: "stop",
      }));
      await waitFor(
        () => client.messages.filter((frame) => frame.type === "protocol.error").length >= 3,
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
});

describe("conversation socket reconnect replay", () => {
  test("reconnect replays only later durable events from the last durable cursor and never provisional deltas", async () => {
    const root = tempRoot();
    const { runtime, server, socketUrl } = await startServer(root, 20);
    const conversationId = randomUUID();
    const client = await connect(socketUrl(conversationId, -1));
    try {
      submit(client, randomUUID(), "hello world");
      await waitFor(() => durableSequences(client.messages).includes(1), "turn starts durably");
      await waitFor(
        () => client.messages.some((frame) => frame.type === "response.delta"),
        "provisional echo flows",
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

  test("a non-browser protocol client observes submit, durable receipt, provisional echo, settlement, disconnect, and ordered replay", async () => {
    const root = tempRoot();
    const { server, socketUrl } = await startServer(root, 12);
    const conversationId = randomUUID();
    const payload = "hello protocol world";
    const client = await connect(socketUrl(conversationId, -1));
    try {
      submit(client, randomUUID(), payload);
      await waitFor(() => durableSequences(client.messages).length === 3, "the full settled turn");
      expect(durableSequences(client.messages)).toEqual([0, 1, 2]);
      const deltas = client.messages.filter((frame) => frame.type === "response.delta");
      expect(deltas.map((frame) => frame.text).join("")).toBe(payload);
      const receipt = client.messages.find(
        (frame): frame is ServerJournalEventFrame => frame.type === "journal.event" && frame.event.sequence === 0,
      )!;
      expect(deltas.every((frame) => frame.messageId === receipt.event.data.messageId)).toBe(true);
      client.ws.close();

      const reconnected = await connect(socketUrl(conversationId, 1));
      try {
        await waitFor(() => durableSequences(reconnected.messages).length === 1, "ordered replay after disconnect");
        expect(durableSequences(reconnected.messages)).toEqual([2]);
        expect(reconnected.messages.filter((frame) => frame.type === "response.delta")).toEqual([]);
        expect(reconnected.messages.filter((frame) => frame.type === "activity.delta")).toEqual([]);
      } finally {
        reconnected.ws.close();
      }
    } finally {
      server.stop(true);
    }
  });
});
