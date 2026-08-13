import { afterEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { appendFileSync, closeSync, mkdtempSync, openSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CONVERSATION_EVENT_VERSION,
  ConversationConflictError,
  digest,
  type ConversationEvent,
  type RequestedCoordinatorPolicy,
} from "../src/conversation/contracts";
import {
  ConversationJournalWriterConflictError,
  FileConversationJournal,
} from "../src/conversation/journal";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function createJournal(): FileConversationJournal {
  const root = mkdtempSync(join(tmpdir(), "rossovia-conversation-journal-"));
  temporaryRoots.push(root);
  return new FileConversationJournal(root);
}

function conversationId(): string {
  return randomUUID();
}

const policy: RequestedCoordinatorPolicy = {
  provider: "deepseek",
  model: "deepseek-v4-pro",
  thinking: "enabled",
  reasoningEffort: "max",
};

async function receiptedMessage(
  journal: FileConversationJournal,
  conversationId: string,
  payload = "create the fixture task",
): Promise<Awaited<ReturnType<FileConversationJournal["submitMessage"]>>> {
  return await journal.submitMessage(conversationId, { clientMessageId: randomUUID(), payload });
}

async function startedTurn(
  journal: FileConversationJournal,
  conversationId: string,
): Promise<{ message: Awaited<ReturnType<FileConversationJournal["submitMessage"]>>; turn: Awaited<ReturnType<FileConversationJournal["startTurn"]>> }> {
  const message = await receiptedMessage(journal, conversationId);
  const turn = await journal.startTurn(conversationId, {
    turnId: randomUUID(),
    messageId: message.event.data.messageId,
    requestedPolicy: policy,
  });
  return { message, turn };
}

describe("FileConversationJournal strict schema", () => {
  test("rejects an unknown major version and preserves the file", async () => {
    const journal = createJournal();
    const conversation = conversationId();
    const message = await receiptedMessage(journal, conversation);
    const path = journal.conversationPath(conversation);
    appendFileSync(path, `${JSON.stringify({
      version: "rosso.conversation-event.v2",
      eventId: "foreign-v2-event",
      conversationId: conversation,
      sequence: 1,
      at: "2026-08-13T09:00:00.000Z",
      type: "message.received",
      data: { ...message.event.data, messageId: randomUUID() },
    })}\n`, "utf8");

    expect(() => journal.readEvents(conversation)).toThrow(/v1|v2|Invalid|literal/);
    expect(readFileSync(path, "utf8").split("\n").filter(Boolean)).toHaveLength(2);
  });

  test("rejects invalid events on read: unknown type, invalid JSON, bad sequence, foreign conversation", async () => {
    const journal = createJournal();
    const conversation = conversationId();
    const message = await receiptedMessage(journal, conversation);
    const path = journal.conversationPath(conversation);

    appendFileSync(path, `${JSON.stringify({
      version: CONVERSATION_EVENT_VERSION,
      eventId: "unknown-type-event",
      conversationId: conversation,
      sequence: 1,
      at: "2026-08-13T09:00:00.000Z",
      type: "response.delta",
      data: {},
    })}\n`, "utf8");
    expect(() => journal.readEvents(conversation)).toThrow(/Invalid|Unrecognized|discriminator/);

    const second = conversationId();
    const secondPath = journal.conversationPath(second);
    await receiptedMessage(journal, second);
    appendFileSync(secondPath, "not-json\n", "utf8");
    expect(() => journal.readEvents(second)).toThrow(/invalid JSON/);

    const third = conversationId();
    const thirdPath = journal.conversationPath(third);
    const thirdMessage = await receiptedMessage(journal, third);
    appendFileSync(thirdPath, `${JSON.stringify({
      version: CONVERSATION_EVENT_VERSION,
      eventId: "bad-sequence-event",
      conversationId: third,
      sequence: 42,
      at: "2026-08-13T09:00:00.000Z",
      type: "message.received",
      data: { ...thirdMessage.event.data, messageId: randomUUID() },
    })}\n`, "utf8");
    expect(() => journal.readEvents(third)).toThrow(/invalid sequence/);

    const fourth = conversationId();
    const fourthPath = journal.conversationPath(fourth);
    const fourthMessage = await receiptedMessage(journal, fourth);
    appendFileSync(fourthPath, `${JSON.stringify({
      version: CONVERSATION_EVENT_VERSION,
      eventId: "foreign-conversation-event",
      conversationId: conversationId(),
      sequence: 1,
      at: "2026-08-13T09:00:00.000Z",
      type: "message.received",
      data: { ...fourthMessage.event.data, messageId: randomUUID() },
    })}\n`, "utf8");
    expect(() => journal.readEvents(fourth)).toThrow(/contains event for/);
  });

  test("rejects invalid drafts without writing anything", async () => {
    const journal = createJournal();
    const conversation = conversationId();
    await expect(journal.submitMessage(conversation, {
      clientMessageId: "not-a-uuid",
      payload: "text",
    })).rejects.toThrow();
    await expect(journal.submitMessage(conversation, {
      clientMessageId: randomUUID(),
      payload: "",
    })).rejects.toThrow();
    await expect(journal.submitMessage("not-a-uuid", {
      clientMessageId: randomUUID(),
      payload: "text",
    })).rejects.toThrow();
    expect(await journal.readEvents(conversation)).toEqual([]);
  });
});

describe("FileConversationJournal sequence and replay", () => {
  test("assigns monotonic sequences from zero and replays after a cursor without duplicates", async () => {
    const journal = createJournal();
    const conversation = conversationId();
    const message = await receiptedMessage(journal, conversation);
    const turn = await journal.startTurn(conversation, {
      turnId: randomUUID(),
      messageId: message.event.data.messageId,
      requestedPolicy: policy,
    });
    const action = await journal.requestAction(conversation, {
      actionId: randomUUID(),
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      kind: "task_create",
    });
    const settled = await journal.settleAction(conversation, {
      actionId: action.data.actionId,
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      evidenceRefs: ["task-source:v1:task-1"],
    });
    const turnSettled = await journal.settleTurn(conversation, {
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      response: "The fixture task is settled.",
    });

    expect([message.event.sequence, turn.sequence, action.sequence, settled.sequence, turnSettled.sequence])
      .toEqual([0, 1, 2, 3, 4]);
    expect(await journal.lastCursor(conversation)).toBe(4);

    const afterOne = await journal.readEventsAfter(conversation, 1);
    expect(afterOne.map((event) => event.sequence)).toEqual([2, 3, 4]);
    expect(afterOne.map((event) => event.eventId))
      .toEqual([action.eventId, settled.eventId, turnSettled.eventId]);

    expect(await journal.readEventsAfter(conversation, 4)).toEqual([]);
    const full = await journal.readEventsAfter(conversation, -1);
    expect(full.map((event) => event.sequence)).toEqual([0, 1, 2, 3, 4]);
    expect(full.map((event) => event.eventId)).toEqual(
      [message.event.eventId, turn.eventId, action.eventId, settled.eventId, turnSettled.eventId],
    );
    await expect(journal.readEventsAfter(conversation, -2)).rejects.toThrow(/cursor/);
    await expect(journal.readEventsAfter(conversation, 1.5)).rejects.toThrow(/cursor/);
  });

  test("keeps every conversation's sequence and file independent", async () => {
    const journal = createJournal();
    const first = conversationId();
    const second = conversationId();
    await receiptedMessage(journal, first);
    await receiptedMessage(journal, first);
    await receiptedMessage(journal, second);
    expect(await journal.lastCursor(first)).toBe(1);
    expect(await journal.lastCursor(second)).toBe(0);
    expect(journal.conversationPath(first)).toBe(join(
      journal.conversationPath(first).split("/state/")[0]!,
      "state", "conversation-events", `${first}.jsonl`,
    ));
    expect(journal.conversationPath(first)).not.toBe(journal.conversationPath(second));
    expect(await journal.readEventsAfter(second, -1).then((events) => events.map((event) => event.sequence)))
      .toEqual([0]);
  });

  test("serializes concurrent appends into contiguous non-duplicate sequences", async () => {
    const journal = createJournal();
    const conversation = conversationId();
    const results = await Promise.all(Array.from({ length: 8 }, () =>
      receiptedMessage(journal, conversation, `message-${randomUUID()}`)
    ));
    expect(results.every((result) => !result.duplicate)).toBe(true);
    const events = await journal.readEvents(conversation);
    expect(events.map((event) => event.sequence)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(new Set(events.map((event) => event.eventId)).size).toBe(8);
    expect(await journal.lastCursor(conversation)).toBe(7);
  });

  test("serializes two same-home journal instances and visibly rejects an independently held writer lease", async () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-conversation-journal-"));
    temporaryRoots.push(root);
    const first = new FileConversationJournal(root);
    const second = new FileConversationJournal(root);
    const conversation = conversationId();

    await Promise.all(Array.from({ length: 12 }, (_, index) =>
      receiptedMessage(index % 2 === 0 ? first : second, conversation, `two-instance-${index}`)
    ));
    const events = await first.readEvents(conversation);
    expect(events.map((event) => event.sequence)).toEqual(Array.from({ length: 12 }, (_, index) => index));
    expect(new Set(events.map((event) => event.eventId)).size).toBe(12);

    const lockPath = `${first.conversationPath(conversation)}.writer.lock`;
    closeSync(openSync(lockPath, "wx"));
    try {
      await expect(receiptedMessage(second, conversation, "held by another process"))
        .rejects.toBeInstanceOf(ConversationJournalWriterConflictError);
      expect(await first.lastCursor(conversation)).toBe(11);
    } finally {
      unlinkSync(lockPath);
    }
  });
});

describe("FileConversationJournal fsync seam and tail repair", () => {
  test("reads ignore an incomplete tail and the next append truncates it without losing fsynced events", async () => {
    const journal = createJournal();
    const conversation = conversationId();
    const { message, turn } = await startedTurn(journal, conversation);
    const action = await journal.requestAction(conversation, {
      actionId: randomUUID(),
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      kind: "work_control",
    });
    const path = journal.conversationPath(conversation);
    const retained = await journal.readEvents(conversation);
    expect(retained.map((event) => event.sequence)).toEqual([0, 1, 2]);

    appendFileSync(path, `${JSON.stringify({ sequence: 3, partial: true }).slice(0, 20)}`, "utf8");
    expect((await journal.readEvents(conversation)).map((event) => event.sequence)).toEqual([0, 1, 2]);

    const later = await receiptedMessage(journal, conversation, "after the crash tail");
    expect(later.event.sequence).toBe(3);
    const repaired = await journal.readEvents(conversation);
    expect(repaired.map((event) => event.sequence)).toEqual([0, 1, 2, 3]);
    expect(repaired[0]?.eventId).toBe(message.event.eventId);
    expect(repaired[1]?.eventId).toBe(turn.eventId);
    expect(repaired[2]?.eventId).toBe(action.eventId);
    const fileContent = readFileSync(path, "utf8");
    expect(fileContent.endsWith("\n")).toBe(true);
    expect(fileContent.split("\n").filter((line) => line.trim().length > 0)).toHaveLength(4);
    expect(fileContent).not.toContain("partial");
  });
});

describe("FileConversationJournal duplicate reconciliation", () => {
  test("returns the retained receipt for the same clientMessageId and digest and never starts a second turn", async () => {
    const journal = createJournal();
    const conversation = conversationId();
    const clientMessageId = randomUUID();
    const payload = "publish the fixture task";
    const first = await journal.submitMessage(conversation, { clientMessageId, payload });
    expect(first.duplicate).toBe(false);

    const second = await journal.submitMessage(conversation, { clientMessageId, payload });
    expect(second.duplicate).toBe(true);
    expect(second.event.eventId).toBe(first.event.eventId);
    expect(second.event.sequence).toBe(first.event.sequence);
    expect(second.event.data.messageId).toBe(first.event.data.messageId);
    expect(second.event.data.payloadDigest).toBe(first.event.data.payloadDigest);

    const events = await journal.readEvents(conversation);
    expect(events.filter((event) => event.type === "message.received")).toHaveLength(1);
    expect(events.filter((event) => event.type === "coordinator.turn-started")).toHaveLength(0);
    expect(await journal.lastCursor(conversation)).toBe(0);
  });

  test("treats the same clientMessageId with a different payload digest as an explicit conflict", async () => {
    const journal = createJournal();
    const conversation = conversationId();
    const clientMessageId = randomUUID();
    await journal.submitMessage(conversation, { clientMessageId, payload: "original intent" });

    await expect(journal.submitMessage(conversation, { clientMessageId, payload: "revised intent" }))
      .rejects.toBeInstanceOf(ConversationConflictError);
    const events = await journal.readEvents(conversation);
    expect(events.filter((event) => event.type === "message.received")).toHaveLength(1);
    expect(await journal.lastCursor(conversation)).toBe(0);
  });

  test("accepts a different clientMessageId with the same payload as a new message", async () => {
    const journal = createJournal();
    const conversation = conversationId();
    const first = await journal.submitMessage(conversation, { clientMessageId: randomUUID(), payload: "same words" });
    const second = await journal.submitMessage(conversation, { clientMessageId: randomUUID(), payload: "same words" });
    expect(second.duplicate).toBe(false);
    expect(second.event.sequence).toBe(first.event.sequence + 1);
  });
});

describe("FileConversationJournal causal integrity", () => {
  test("rejects events that reference missing or mismatched causal identity", async () => {
    const journal = createJournal();
    const conversation = conversationId();

    await expect(journal.startTurn(conversation, {
      turnId: randomUUID(),
      messageId: randomUUID(),
      requestedPolicy: policy,
    })).rejects.toThrow(/no received message/);

    const message = await receiptedMessage(journal, conversation);
    const turn = await journal.startTurn(conversation, {
      turnId: randomUUID(),
      messageId: message.event.data.messageId,
      requestedPolicy: policy,
    });

    await expect(journal.requestAction(conversation, {
      actionId: randomUUID(),
      turnId: randomUUID(),
      messageId: message.event.data.messageId,
      kind: "task_create",
    })).rejects.toThrow(/no started turn/);

    await expect(journal.requestAction(conversation, {
      actionId: randomUUID(),
      turnId: turn.data.turnId,
      messageId: randomUUID(),
      kind: "task_create",
    })).rejects.toThrow(/does not match message/);

    await expect(journal.settleAction(conversation, {
      actionId: randomUUID(),
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      evidenceRefs: ["receipt:1"],
    })).rejects.toThrow(/no requested action/);

    await expect(journal.settleTurn(conversation, {
      turnId: randomUUID(),
      messageId: message.event.data.messageId,
      response: "missing turn",
    })).rejects.toThrow(/no started turn/);

    await expect(journal.settleTurn(conversation, {
      turnId: turn.data.turnId,
      messageId: randomUUID(),
      response: "mismatched message",
    })).rejects.toThrow(/does not match message/);
  });

  test("rejects duplicate identity and double settlement", async () => {
    const journal = createJournal();
    const conversation = conversationId();
    const message = await receiptedMessage(journal, conversation);
    const turnId = randomUUID();
    const turn = await journal.startTurn(conversation, {
      turnId,
      messageId: message.event.data.messageId,
      requestedPolicy: policy,
    });
    await expect(journal.startTurn(conversation, {
      turnId,
      messageId: message.event.data.messageId,
      requestedPolicy: policy,
    })).rejects.toThrow(/already started turn/);

    const actionId = randomUUID();
    const action = await journal.requestAction(conversation, {
      actionId,
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      kind: "task_correct",
    });
    await expect(journal.requestAction(conversation, {
      actionId,
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      kind: "task_correct",
    })).rejects.toThrow(/already requested action/);

    await journal.settleAction(conversation, {
      actionId: action.data.actionId,
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      evidenceRefs: ["task-receipt:1"],
    });
    await expect(journal.settleAction(conversation, {
      actionId: action.data.actionId,
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      evidenceRefs: ["task-receipt:1"],
    })).rejects.toThrow(/already settled/);

    await journal.settleTurn(conversation, {
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      response: "settled",
    });
    await expect(journal.interruptTurn(conversation, {
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
    })).rejects.toThrow(/already has a terminal event/);
  });

  test("allows an in-flight action to settle after its turn already terminated", async () => {
    const journal = createJournal();
    const conversation = conversationId();
    const message = await receiptedMessage(journal, conversation);
    const turn = await journal.startTurn(conversation, {
      turnId: randomUUID(),
      messageId: message.event.data.messageId,
      requestedPolicy: policy,
    });
    const action = await journal.requestAction(conversation, {
      actionId: randomUUID(),
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      kind: "work_control",
    });
    await journal.interruptTurn(conversation, {
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
    });
    const settled = await journal.settleAction(conversation, {
      actionId: action.data.actionId,
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      evidenceRefs: ["attempt:started:1"],
    });
    expect(settled.sequence).toBe(4);
  });
});

describe("FileConversationJournal durable vocabulary boundary", () => {
  test("keeps provisional frames and raw provider evidence out while retaining the complete settled response", async () => {
    const journal = createJournal();
    const conversation = conversationId();
    const message = await receiptedMessage(journal, conversation);
    const turn = await journal.startTurn(conversation, {
      turnId: randomUUID(),
      messageId: message.event.data.messageId,
      requestedPolicy: policy,
    });
    const action = await journal.requestAction(conversation, {
      actionId: randomUUID(),
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      kind: "task_continue",
    });
    const settledAction = await journal.settleAction(conversation, {
      actionId: action.data.actionId,
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      evidenceRefs: ["attempt-settlement:1"],
    });
    const settledTurn = await journal.settleTurn(conversation, {
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      response: "The complete settled response.",
      observedEvidence: { provider: "deepseek", model: "deepseek-v4-pro", fingerprint: "fp-1" },
    });

    await expect(journal.startTurn(conversation, {
      turnId: randomUUID(),
      messageId: message.event.data.messageId,
      requestedPolicy: { ...policy, extra: "unknown" } as unknown as RequestedCoordinatorPolicy,
    })).rejects.toThrow(/Unrecognized|Invalid/);

    const all = await journal.readEvents(conversation);
    expect(all.map((event) => event.type)).toEqual([
      "message.received",
      "coordinator.turn-started",
      "action.requested",
      "action.settled",
      "coordinator.turn-settled",
    ]);
    expect(Object.keys(message.event.data).sort()).toEqual(
      ["clientMessageId", "messageId", "payload", "payloadDigest"].sort(),
    );
    expect(Object.keys(settledAction.data).sort()).toEqual(
      ["actionId", "evidenceRefs", "messageId", "turnId"].sort(),
    );
    expect(Object.keys(settledTurn.data).sort()).toEqual(
      ["messageId", "observedEvidence", "response", "turnId"].sort(),
    );
    expect(settledTurn.data.response).toBe("The complete settled response.");
    expect(settledTurn.data.observedEvidence).toEqual({ provider: "deepseek", model: "deepseek-v4-pro", fingerprint: "fp-1" });
    expect(Object.keys(settledTurn.data.observedEvidence ?? {}).some((key) => /text|content|trace|usage/i.test(key)))
      .toBe(false);
    expect(all.every((event) => !JSON.stringify(event).includes("response.delta"))).toBe(true);
  });

  test("rejects raw provider content smuggled into observed evidence", async () => {
    const journal = createJournal();
    const conversation = conversationId();
    const message = await receiptedMessage(journal, conversation);
    const turn = await journal.startTurn(conversation, {
      turnId: randomUUID(),
      messageId: message.event.data.messageId,
      requestedPolicy: policy,
    });
    await expect(journal.settleTurn(conversation, {
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      response: "provider response",
      observedEvidence: {
        provider: "deepseek",
        rawResponse: "full provider text",
      } as never,
    })).rejects.toThrow();
    expect((await journal.readEvents(conversation)).some((event) => event.type === "coordinator.turn-settled"))
      .toBe(false);
  });
});

describe("FileConversationJournal review corrections M1-M3", () => {
  test("writes and replays legal prompt/source evidence and sanitized usage", async () => {
    const journal = createJournal();
    const conversation = conversationId();
    const message = await receiptedMessage(journal, conversation);
    const promptDigest = digest("composed prompt v3");
    const sourceDigest = digest("task source payload");
    const turn = await journal.startTurn(conversation, {
      turnId: randomUUID(),
      messageId: message.event.data.messageId,
      requestedPolicy: policy,
      prompt: { revision: "prompt-v3", digest: promptDigest },
      disclosedSources: [{ ref: "task-source:v1:task-1", digest: sourceDigest }],
      sourceRevisionSelectors: [{ source: "state/tasks.json", revision: "42" }],
    });
    const action = await journal.requestAction(conversation, {
      actionId: randomUUID(),
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      kind: "task_create",
    });
    const settled = await journal.settleAction(conversation, {
      actionId: action.data.actionId,
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      evidenceRefs: [],
    });
    const settledTurn = await journal.settleTurn(conversation, {
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      response: "The fixture action is settled.",
      observedEvidence: {
        provider: "deepseek",
        model: "deepseek-v4-pro",
        fingerprint: "fp-1",
        usage: { inputTokens: 1234, outputTokens: 56 },
      },
    });

    expect(turn.data.prompt).toEqual({ revision: "prompt-v3", digest: promptDigest });
    expect(turn.data.disclosedSources).toEqual([{ ref: "task-source:v1:task-1", digest: sourceDigest }]);
    expect(turn.data.sourceRevisionSelectors).toEqual([{ source: "state/tasks.json", revision: "42" }]);
    expect(settled.data.evidenceRefs).toEqual([]);
    expect(settledTurn.data.observedEvidence).toEqual({
      provider: "deepseek",
      model: "deepseek-v4-pro",
      fingerprint: "fp-1",
      usage: { inputTokens: 1234, outputTokens: 56 },
    });
    expect(settledTurn.data.response).toBe("The fixture action is settled.");

    const replay = await journal.readEventsAfter(conversation, -1);
    expect(replay[1]?.data).toEqual(turn.data);
    expect(replay[3]?.data).toEqual(settled.data);
    expect(replay[4]?.data).toEqual(settledTurn.data);
  });

  test("still strict-rejects raw content and malformed evidence in the new fields", async () => {
    const journal = createJournal();
    const conversation = conversationId();
    const message = await receiptedMessage(journal, conversation);
    const turnId = randomUUID();
    await journal.startTurn(conversation, {
      turnId,
      messageId: message.event.data.messageId,
      requestedPolicy: policy,
    });

    await expect(journal.startTurn(conversation, {
      turnId: randomUUID(),
      messageId: message.event.data.messageId,
      requestedPolicy: policy,
      prompt: { revision: "prompt-v3", digest: "the full prompt text" },
    })).rejects.toThrow();

    await expect(journal.startTurn(conversation, {
      turnId: randomUUID(),
      messageId: message.event.data.messageId,
      requestedPolicy: policy,
      prompt: { revision: "prompt-v3" } as never,
    })).rejects.toThrow();

    await expect(journal.startTurn(conversation, {
      turnId: randomUUID(),
      messageId: message.event.data.messageId,
      requestedPolicy: policy,
      disclosedSources: [{ ref: "task-source:v1:task-1", digest: "raw source content" }],
    })).rejects.toThrow();

    await expect(journal.startTurn(conversation, {
      turnId: randomUUID(),
      messageId: message.event.data.messageId,
      requestedPolicy: policy,
      disclosedSources: [{ ref: "task-source:v1:task-1", digest: digest("ok"), smuggledText: "raw" }] as never,
    })).rejects.toThrow();

    await expect(journal.settleTurn(conversation, {
      turnId,
      messageId: message.event.data.messageId,
      response: "invalid usage",
      observedEvidence: { usage: { inputTokens: -1, outputTokens: 0 } },
    })).rejects.toThrow();

    await expect(journal.settleTurn(conversation, {
      turnId,
      messageId: message.event.data.messageId,
      response: "invalid usage",
      observedEvidence: { usage: { inputTokens: 1.5, outputTokens: 0 } },
    })).rejects.toThrow();

    expect((await journal.readEvents(conversation)).length).toBe(2);
  });

  test("action.uncertain accepts any non-empty reason the producer supplies", async () => {
    const journal = createJournal();
    const conversation = conversationId();
    const message = await receiptedMessage(journal, conversation);
    const turn = await journal.startTurn(conversation, {
      turnId: randomUUID(),
      messageId: message.event.data.messageId,
      requestedPolicy: policy,
    });
    const action = await journal.requestAction(conversation, {
      actionId: randomUUID(),
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      kind: "task_create",
    });
    const reason = "provider disconnected mid-flight with an uninspectable write";
    const uncertain = await journal.uncertainAction(conversation, {
      actionId: action.data.actionId,
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      reason,
    });
    expect(uncertain.data.reason).toBe(reason);

    await expect(journal.uncertainAction(conversation, {
      actionId: randomUUID(),
      turnId: turn.data.turnId,
      messageId: message.event.data.messageId,
      reason: "",
    })).rejects.toThrow();
  });
});
