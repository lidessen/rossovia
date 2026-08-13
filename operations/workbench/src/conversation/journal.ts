import { randomUUID } from "node:crypto";
import { z } from "zod";
import { mkdir, open, readFile, rename, rmdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  CONVERSATION_EVENT_VERSION,
  ConversationConflictError,
  ConversationEventDraftSchema,
  ConversationEventSchema,
  ConversationIdSchema,
  ActionKindSchema,
  MessageReceivedDataSchema,
  MessageReceivedDraftSchema,
  TurnStartedDraftSchema,
  ActionRequestedDraftSchema,
  ActionSettledDraftSchema,
  ActionFailedDraftSchema,
  ActionUncertainDraftSchema,
  TurnSettledDraftSchema,
  TurnFailedDraftSchema,
  TurnInterruptedDraftSchema,
  type ActionFailedDraft,
  type ActionFailedEvent,
  type ActionRequestedDraft,
  type ActionRequestedEvent,
  type ActionSettledDraft,
  type ActionSettledEvent,
  type ActionUncertainDraft,
  type ActionUncertainEvent,
  type ConversationEvent,
  type MessageReceivedData,
  type MessageReceivedDraft,
  type MessageReceivedEvent,
  type MessageSubmitResult,
  type TurnFailedDraft,
  type TurnFailedEvent,
  type TurnInterruptedDraft,
  type TurnInterruptedEvent,
  type TurnSettledDraft,
  type TurnSettledEvent,
  type TurnStartedDraft,
  type TurnStartedEvent,
  digest,
} from "./contracts";

/**
 * Fsynced, append-only per-conversation interaction journal. One file per
 * conversation under `state/conversation-events/`; writes are
 * process-serialized per conversation across journal instances and every
 * record is synced before the next one starts. An atomic per-conversation
 * filesystem lease rejects a concurrent writer from another process instead
 * of allowing both to assign the same sequence. It retains only settled
 * events and the cursor; canonical Task/Mission/effect owners keep their own
 * state.
 */
export class FileConversationJournal {
  private readonly root: string;

  constructor(
    root: string,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {
    this.root = resolve(root);
  }

  conversationPath(conversationId: string): string {
    const parsed = ConversationIdSchema.parse(conversationId);
    return join(this.root, "state", "conversation-events", `${parsed}.jsonl`);
  }

  /**
   * Durably receipt one Principal message. A repeated `clientMessageId` with
   * the same payload digest returns the retained receipt and never starts a
   * second record or turn; the same identity with a different digest is an
   * explicit protocol conflict and writes nothing.
   */
  async submitMessage(conversationId: string, unparsedDraft: MessageReceivedDraft): Promise<MessageSubmitResult> {
    const draft = MessageReceivedDraftSchema.parse(unparsedDraft);
    const payloadDigest = digest(draft.payload);
    let result!: MessageSubmitResult;
    await this.withLock(conversationId, async () => {
      await repairIncompleteTail(this.conversationPath(conversationId));
      const events = await this.read(conversationId);
      const existing = events.find((event): event is MessageReceivedEvent =>
        event.type === "message.received" && event.data.clientMessageId === draft.clientMessageId
      );
      if (existing !== undefined) {
        if (existing.data.payloadDigest !== payloadDigest) {
          throw new ConversationConflictError(
            conversationId,
            draft.clientMessageId,
            `clientMessageId ${draft.clientMessageId} conflicts with its retained message`,
          );
        }
        result = { event: existing, duplicate: true };
        return;
      }
      const event = await this.append(conversationId, {
        type: "message.received",
        data: {
          messageId: randomUUID(),
          clientMessageId: draft.clientMessageId,
          payload: draft.payload,
          payloadDigest,
        },
      });
      result = { event: event as MessageReceivedEvent, duplicate: false };
    });
    return result;
  }

  async startTurn(conversationId: string, unparsedDraft: TurnStartedDraft): Promise<TurnStartedEvent> {
    return await this.mutate(conversationId,
      { type: "coordinator.turn-started", data: TurnStartedDraftSchema.parse(unparsedDraft) }) as TurnStartedEvent;
  }

  /**
   * A typed action request is fsynced before its canonical owner is called.
   * The stored `kind` is derived from the exact operation, so a request can
   * never carry a kind that differs from its operation.
   */
  async requestAction(conversationId: string, unparsedDraft: ActionRequestedDraft): Promise<ActionRequestedEvent> {
    const draft = ActionRequestedDraftSchema.parse(unparsedDraft);
    return await this.mutate(conversationId, {
      type: "action.requested",
      data: { ...draft, kind: draft.operation.kind },
    }) as ActionRequestedEvent;
  }

  async settleAction(conversationId: string, unparsedDraft: ActionSettledDraft): Promise<ActionSettledEvent> {
    return await this.mutate(conversationId,
      { type: "action.settled", data: ActionSettledDraftSchema.parse(unparsedDraft) }) as ActionSettledEvent;
  }

  async failAction(conversationId: string, unparsedDraft: ActionFailedDraft): Promise<ActionFailedEvent> {
    return await this.mutate(conversationId,
      { type: "action.failed", data: ActionFailedDraftSchema.parse(unparsedDraft) }) as ActionFailedEvent;
  }

  async uncertainAction(conversationId: string, unparsedDraft: ActionUncertainDraft): Promise<ActionUncertainEvent> {
    return await this.mutate(conversationId,
      { type: "action.uncertain", data: ActionUncertainDraftSchema.parse(unparsedDraft) }) as ActionUncertainEvent;
  }

  async settleTurn(conversationId: string, unparsedDraft: TurnSettledDraft): Promise<TurnSettledEvent> {
    return await this.mutate(conversationId,
      { type: "coordinator.turn-settled", data: TurnSettledDraftSchema.parse(unparsedDraft) }) as TurnSettledEvent;
  }

  async failTurn(conversationId: string, unparsedDraft: TurnFailedDraft): Promise<TurnFailedEvent> {
    return await this.mutate(conversationId,
      { type: "coordinator.turn-failed", data: TurnFailedDraftSchema.parse(unparsedDraft) }) as TurnFailedEvent;
  }

  async interruptTurn(conversationId: string, unparsedDraft: TurnInterruptedDraft): Promise<TurnInterruptedEvent> {
    return await this.mutate(conversationId,
      { type: "coordinator.turn-interrupted", data: TurnInterruptedDraftSchema.parse(unparsedDraft) }) as TurnInterruptedEvent;
  }

  /** All validated settled events, in journal order. */
  async readEvents(conversationId: string): Promise<readonly ConversationEvent[]> {
    return await this.read(conversationId);
  }

  /**
   * Settled events after the given cursor, in journal order, without
   * duplicates. The cursor is the last applied durable sequence; `-1` replays
   * the whole conversation.
   */
  async readEventsAfter(conversationId: string, cursor: number): Promise<readonly ConversationEvent[]> {
    if (!Number.isInteger(cursor) || cursor < -1) {
      throw new Error("conversation cursor must be an integer of at least -1");
    }
    return (await this.read(conversationId)).filter((event) => event.sequence > cursor);
  }

  /** Last durable sequence, or -1 when the conversation has no events. */
  async lastCursor(conversationId: string): Promise<number> {
    const events = await this.read(conversationId);
    return events.length === 0 ? -1 : events.at(-1)!.sequence;
  }

  private async mutate(
    conversationId: string,
    draft: AppendEventDraft,
  ): Promise<ConversationEvent> {
    let event!: ConversationEvent;
    await this.withLock(conversationId, async () => {
      await repairIncompleteTail(this.conversationPath(conversationId));
      event = await this.append(conversationId, draft);
    });
    return event;
  }

  private async append(conversationId: string, unparsedDraft: AppendEventDraft): Promise<ConversationEvent> {
    const draft = AppendEventDraftSchema.parse(unparsedDraft);
    const events = await this.read(conversationId);
    const event = ConversationEventSchema.parse({
      version: CONVERSATION_EVENT_VERSION,
      eventId: randomUUID(),
      conversationId: ConversationIdSchema.parse(conversationId),
      sequence: events.length,
      at: this.now(),
      ...draft,
    });
    validateAppend(events, event);
    const path = this.conversationPath(conversationId);
    await mkdir(dirname(path), { recursive: true });
    const handle = await open(path, "a");
    try {
      await handle.appendFile(`${JSON.stringify(event)}\n`, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    return event;
  }

  private async read(conversationId: string): Promise<ConversationEvent[]> {
    const parsedId = ConversationIdSchema.parse(conversationId);
    let content: string;
    try {
      content = await readFile(this.conversationPath(parsedId), "utf8");
    } catch (error) {
      if (isMissing(error)) return [];
      throw error;
    }
    const completeContent = content.endsWith("\n")
      ? content
      : content.slice(0, content.lastIndexOf("\n") + 1);
    return completeContent.split("\n").filter((line) => line.trim().length > 0).map((line, index) => {
      let value: unknown;
      try {
        value = JSON.parse(line);
      } catch (error) {
        throw new Error(`conversation ${parsedId} contains invalid JSON at line ${index + 1}`, { cause: error });
      }
      const event = ConversationEventSchema.parse(value);
      if (event.conversationId !== parsedId) {
        throw new Error(`conversation ${parsedId} contains event for ${event.conversationId}`);
      }
      if (event.sequence !== index) {
        throw new Error(`conversation ${parsedId} has invalid sequence ${event.sequence} at line ${index + 1}`);
      }
      return event;
    });
  }

  private async withLock(conversationId: string, action: () => Promise<void>): Promise<void> {
    const journalPath = this.conversationPath(conversationId);
    const previous = writerQueues.get(journalPath) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolvePromise) => { release = resolvePromise; });
    const tail = previous.then(() => current);
    writerQueues.set(journalPath, tail);
    await previous;
    try {
      await withFilesystemWriterLease(journalPath, action);
    } finally {
      release();
      if (writerQueues.get(journalPath) === tail) writerQueues.delete(journalPath);
    }
  }
}

/**
 * Same-process journal instances share this queue by exact resolved journal
 * path. The filesystem lease below covers an independent Workbench process.
 */
const writerQueues = new Map<string, Promise<void>>();

export class ConversationJournalWriterConflictError extends Error {
  readonly lockPath: string;

  constructor(lockPath: string) {
    super(`conversation journal writer lease is already held: ${lockPath}`);
    this.name = "ConversationJournalWriterConflictError";
    this.lockPath = lockPath;
  }
}

async function withFilesystemWriterLease(journalPath: string, action: () => Promise<void>): Promise<void> {
  const lockPath = `${journalPath}.writer.lock`;
  await mkdir(dirname(journalPath), { recursive: true });
  const owner = WriterLeaseOwnerSchema.parse({
    version: WRITER_LEASE_VERSION,
    pid: process.pid,
    leaseId: randomUUID(),
  });
  const candidatePath = `${lockPath}.candidate-${owner.leaseId}`;
  await mkdir(candidatePath);
  try {
    await writeFile(join(candidatePath, WRITER_LEASE_OWNER_FILE), `${JSON.stringify(owner)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    await installWriterLease(candidatePath, lockPath);
    await action();
  } finally {
    await removeWriterLeaseDirectory(candidatePath);
    await releaseWriterLease(lockPath, owner.leaseId);
  }
}

const WRITER_LEASE_VERSION = "rosso.conversation-writer-lease.v1" as const;
const WRITER_LEASE_OWNER_FILE = "owner.json";
const WriterLeaseOwnerSchema = z.object({
  version: z.literal(WRITER_LEASE_VERSION),
  pid: z.number().int().positive(),
  leaseId: z.string().uuid(),
}).strict();
type WriterLeaseOwner = z.infer<typeof WriterLeaseOwnerSchema>;

async function installWriterLease(candidatePath: string, lockPath: string): Promise<void> {
  try {
    await rename(candidatePath, lockPath);
    return;
  } catch (error) {
    if (!isOccupiedLeasePath(error)) throw error;
  }

  const existing = await readWriterLeaseOwner(lockPath);
  if (existing === undefined || !isProcessDefinitelyAbsent(existing.pid)) {
    throw new ConversationJournalWriterConflictError(lockPath);
  }

  // All contenders for one stale lease use the same non-empty recovery
  // tombstone. It stays beside the journal: a contender delayed after reading
  // this stale owner can never rename a newly acquired live lease over it.
  const recoveryPath = `${lockPath}.recovered-${existing.leaseId}`;
  try {
    await rename(lockPath, recoveryPath);
  } catch (error) {
    if (isMissing(error) || isOccupiedLeasePath(error)) {
      throw new ConversationJournalWriterConflictError(lockPath);
    }
    throw error;
  }
  try {
    await rename(candidatePath, lockPath);
  } catch (error) {
    if (isOccupiedLeasePath(error)) throw new ConversationJournalWriterConflictError(lockPath);
    throw error;
  }
}

async function readWriterLeaseOwner(lockPath: string): Promise<WriterLeaseOwner | undefined> {
  try {
    return WriterLeaseOwnerSchema.parse(
      JSON.parse(await readFile(join(lockPath, WRITER_LEASE_OWNER_FILE), "utf8")),
    );
  } catch {
    return undefined;
  }
}

function isProcessDefinitelyAbsent(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return typeof error === "object" && error !== null && "code" in error &&
      (error as { code?: unknown }).code === "ESRCH";
  }
}

async function releaseWriterLease(lockPath: string, leaseId: string): Promise<void> {
  const owner = await readWriterLeaseOwner(lockPath);
  if (owner?.leaseId !== leaseId) return;
  const releasePath = `${lockPath}.releasing-${leaseId}`;
  try {
    await rename(lockPath, releasePath);
  } catch (error) {
    if (isMissing(error)) return;
    throw error;
  }
  await removeWriterLeaseDirectory(releasePath);
}

async function removeWriterLeaseDirectory(path: string): Promise<void> {
  try {
    await unlink(join(path, WRITER_LEASE_OWNER_FILE));
  } catch (error) {
    if (!isMissing(error) && !isNotDirectory(error)) throw error;
  }
  try {
    await rmdir(path);
  } catch (error) {
    if (!isMissing(error)) throw error;
  }
}

/**
 * Drafts accepted for storage: the public draft vocabulary, except that
 * `message.received` uses its stored data form because the journal itself
 * assigns the stable message identity and payload digest at receipt, and
 * `action.requested` carries its writer-derived kind. The durable
 * `ConversationEventSchema` still enforces the exact kind/operation pairing
 * on every appended and every read line.
 */
const AppendActionRequestedDataSchema = ActionRequestedDraftSchema.extend({
  kind: ActionKindSchema,
}).strict();

const AppendEventDraftSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("message.received"), data: MessageReceivedDataSchema }).strict(),
  z.object({ type: z.literal("coordinator.turn-started"), data: TurnStartedDraftSchema }).strict(),
  z.object({ type: z.literal("action.requested"), data: AppendActionRequestedDataSchema }).strict(),
  z.object({ type: z.literal("action.settled"), data: ActionSettledDraftSchema }).strict(),
  z.object({ type: z.literal("action.failed"), data: ActionFailedDraftSchema }).strict(),
  z.object({ type: z.literal("action.uncertain"), data: ActionUncertainDraftSchema }).strict(),
  z.object({ type: z.literal("coordinator.turn-settled"), data: TurnSettledDraftSchema }).strict(),
  z.object({ type: z.literal("coordinator.turn-failed"), data: TurnFailedDraftSchema }).strict(),
  z.object({ type: z.literal("coordinator.turn-interrupted"), data: TurnInterruptedDraftSchema }).strict(),
]);
type AppendEventDraft = z.infer<typeof AppendEventDraftSchema>;

function validateAppend(events: readonly ConversationEvent[], event: ConversationEvent): void {
  switch (event.type) {
    case "message.received": {
      const existing = events.find((candidate) =>
        candidate.type === "message.received" && candidate.data.clientMessageId === event.data.clientMessageId
      );
      if (existing !== undefined) {
        throw new ConversationConflictError(
          event.conversationId,
          event.data.clientMessageId,
          `clientMessageId ${event.data.clientMessageId} is already receipted for conversation ${event.conversationId}`,
        );
      }
      break;
    }
    case "coordinator.turn-started": {
      requireMessage(events, event.conversationId, event.data.messageId);
      if (events.some((candidate) =>
        candidate.type === "coordinator.turn-started" && candidate.data.turnId === event.data.turnId
      )) {
        throw new Error(`conversation ${event.conversationId} already started turn ${event.data.turnId}`);
      }
      break;
    }
    case "action.requested": {
      const turn = requireTurn(events, event.conversationId, event.data.turnId);
      requireSameMessage(event.conversationId, turn, event.data.messageId);
      if (events.some((candidate) =>
        candidate.type === "action.requested" && candidate.data.actionId === event.data.actionId
      )) {
        throw new Error(`conversation ${event.conversationId} already requested action ${event.data.actionId}`);
      }
      break;
    }
    case "action.settled":
    case "action.failed":
    case "action.uncertain": {
      const requested = events.find((candidate): candidate is ActionRequestedEvent =>
        candidate.type === "action.requested" && candidate.data.actionId === event.data.actionId
      );
      if (requested === undefined) {
        throw new Error(`conversation ${event.conversationId} has no requested action ${event.data.actionId}`);
      }
      if (requested.data.turnId !== event.data.turnId) {
        throw new Error(`action ${event.data.actionId} settlement does not match its requested turn`);
      }
      if (requested.data.messageId !== event.data.messageId) {
        throw new Error(`action ${event.data.actionId} settlement does not match its requested message`);
      }
      if (events.some((candidate) =>
        isActionTerminal(candidate) && candidate.data.actionId === event.data.actionId
      )) {
        throw new Error(`conversation ${event.conversationId} action ${event.data.actionId} is already settled`);
      }
      break;
    }
    case "coordinator.turn-settled":
    case "coordinator.turn-failed":
    case "coordinator.turn-interrupted": {
      const turn = requireTurn(events, event.conversationId, event.data.turnId);
      requireSameMessage(event.conversationId, turn, event.data.messageId);
      const terminal = events.find((candidate) => isTurnTerminal(candidate) && candidate.data.turnId === event.data.turnId);
      if (terminal !== undefined) {
        throw new Error(`conversation ${event.conversationId} turn ${event.data.turnId} already has a terminal event`);
      }
      break;
    }
  }
}

function isActionTerminal(event: ConversationEvent): event is ActionSettledEvent | ActionFailedEvent | ActionUncertainEvent {
  return event.type === "action.settled" || event.type === "action.failed" || event.type === "action.uncertain";
}

function isTurnTerminal(event: ConversationEvent): event is TurnSettledEvent | TurnFailedEvent | TurnInterruptedEvent {
  return event.type === "coordinator.turn-settled"
    || event.type === "coordinator.turn-failed"
    || event.type === "coordinator.turn-interrupted";
}

function requireMessage(events: readonly ConversationEvent[], conversationId: string, messageId: string): MessageReceivedEvent {
  const message = events.find((candidate): candidate is MessageReceivedEvent =>
    candidate.type === "message.received" && candidate.data.messageId === messageId
  );
  if (message === undefined) {
    throw new Error(`conversation ${conversationId} has no received message ${messageId}`);
  }
  return message;
}

function requireTurn(events: readonly ConversationEvent[], conversationId: string, turnId: string): TurnStartedEvent {
  const turn = events.find((candidate): candidate is TurnStartedEvent =>
    candidate.type === "coordinator.turn-started" && candidate.data.turnId === turnId
  );
  if (turn === undefined) {
    throw new Error(`conversation ${conversationId} has no started turn ${turnId}`);
  }
  return turn;
}

function requireSameMessage(conversationId: string, turn: TurnStartedEvent, messageId: string): void {
  if (turn.data.messageId !== messageId) {
    throw new Error(`conversation ${conversationId} event does not match message ${messageId} of turn ${turn.data.turnId}`);
  }
}

function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code?: unknown }).code === "ENOENT";
}

function isOccupiedLeasePath(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  return ["EEXIST", "ENOTEMPTY", "EISDIR", "ENOTDIR"].includes(
    String((error as { code?: unknown }).code),
  );
}

function isNotDirectory(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code?: unknown }).code === "ENOTDIR";
}

async function repairIncompleteTail(path: string): Promise<void> {
  let handle;
  try {
    handle = await open(path, "r+");
  } catch (error) {
    if (isMissing(error)) return;
    throw error;
  }
  try {
    const content = await handle.readFile("utf8");
    if (content.length === 0 || content.endsWith("\n")) return;
    const lastNewline = content.lastIndexOf("\n");
    await handle.truncate(lastNewline < 0 ? 0 : Buffer.byteLength(content.slice(0, lastNewline + 1), "utf8"));
    await handle.sync();
  } finally {
    await handle.close();
  }
}
