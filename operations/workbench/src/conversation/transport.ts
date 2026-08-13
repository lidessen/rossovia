import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  ConversationConflictError,
  ConversationEventSchema,
  ConversationIdSchema,
  type ActionRequestedEvent,
  type ConversationEvent,
} from "./contracts";
import { FileConversationJournal } from "./journal";
import type {
  ConversationTurnOwner,
  TurnPreparation,
} from "./turn-owner";
import type { ConversationTurnHandle, ConversationTurnResult } from "../../../autonomy/src/conversation-coordinator";
import type { ConversationOperation } from "../../../autonomy/src/conversation-coordinator";
import type { ConversationContextProvider } from "./context";
import {
  ConversationOperationHostError,
  type ConversationOperationHost,
} from "./operations";
import type { ConversationExecutionCarrierRegistry } from "./execution-carrier";

/**
 * Strict WebSocket frame vocabulary for one Workbench conversation socket.
 * The route is `/api/conversations/<conversationId>/socket?after=<cursor>`;
 * a client-generated UUID conversation identity and UUID `clientMessageId`
 * make reconnect independent of a particular socket. Only `journal.event`
 * carries a durable sequence and may advance the reconnect cursor; all other
 * server frames are provisional or diagnostic and are never replayed.
 */
export const ConversationSocketPathPrefix = "/api/conversations/" as const;
/** Matches the existing Workbench HTTP request-body limit. */
export const CONVERSATION_SOCKET_MAX_MESSAGE_BYTES = 64 * 1024;

export const ClientMessageSubmitFrameSchema = z.object({
  type: z.literal("message.submit"),
  clientMessageId: z.string().uuid(),
  payload: z.string().min(1),
}).strict();
export type ClientMessageSubmitFrame = z.infer<typeof ClientMessageSubmitFrameSchema>;

export const ClientResponseInterruptFrameSchema = z.object({
  type: z.literal("response.interrupt"),
  turnId: z.string().uuid(),
}).strict();
export type ClientResponseInterruptFrame = z.infer<typeof ClientResponseInterruptFrameSchema>;

export const ClientToolInterruptFrameSchema = z.object({
  type: z.literal("tool.interrupt"),
  actionId: z.string().uuid(),
}).strict();
export type ClientToolInterruptFrame = z.infer<typeof ClientToolInterruptFrameSchema>;

export const ClientWorkControlFrameSchema = z.object({
  type: z.literal("work.control"),
  turnId: z.string().uuid(),
  actionId: z.string().uuid(),
  control: z.enum(["pause", "resume", "stop", "recover"]),
}).strict();
export type ClientWorkControlFrame = z.infer<typeof ClientWorkControlFrameSchema>;

export const ClientFrameSchema = z.discriminatedUnion("type", [
  ClientMessageSubmitFrameSchema,
  ClientResponseInterruptFrameSchema,
  ClientToolInterruptFrameSchema,
  ClientWorkControlFrameSchema,
]);
export type ClientFrame = z.infer<typeof ClientFrameSchema>;

export const ServerJournalEventFrameSchema = z.object({
  type: z.literal("journal.event"),
  event: ConversationEventSchema,
}).strict();
export type ServerJournalEventFrame = z.infer<typeof ServerJournalEventFrameSchema>;

export const ServerResponseDeltaFrameSchema = z.object({
  type: z.literal("response.delta"),
  turnId: z.string().uuid(),
  messageId: z.string().uuid(),
  text: z.string().min(1),
}).strict();
export type ServerResponseDeltaFrame = z.infer<typeof ServerResponseDeltaFrameSchema>;

export const ServerActivityDeltaFrameSchema = z.object({
  type: z.literal("activity.delta"),
  turnId: z.string().uuid(),
  messageId: z.string().uuid(),
  /** Exact attribution: the starting turn/action, Task, attempt, and carrier of the reported progress. */
  taskId: z.string().min(1),
  attemptId: z.string().min(1),
  actionId: z.string().uuid(),
  carrierId: z.string().min(1),
  text: z.string().min(1),
}).strict();
export type ServerActivityDeltaFrame = z.infer<typeof ServerActivityDeltaFrameSchema>;

export const ServerProjectionChangedFrameSchema = z.object({
  type: z.literal("projection.changed"),
}).strict();
export type ServerProjectionChangedFrame = z.infer<typeof ServerProjectionChangedFrameSchema>;

export const ProtocolErrorCodeSchema = z.enum([
  "invalid-frame",
  "frame-too-large",
  "conflict",
  "unsupported-frame",
  "journal-error",
]);
export type ProtocolErrorCode = z.infer<typeof ProtocolErrorCodeSchema>;

export const ServerProtocolErrorFrameSchema = z.object({
  type: z.literal("protocol.error"),
  code: ProtocolErrorCodeSchema,
  message: z.string().min(1),
}).strict();
export type ServerProtocolErrorFrame = z.infer<typeof ServerProtocolErrorFrameSchema>;

export const ServerFrameSchema = z.discriminatedUnion("type", [
  ServerJournalEventFrameSchema,
  ServerResponseDeltaFrameSchema,
  ServerActivityDeltaFrameSchema,
  ServerProjectionChangedFrameSchema,
  ServerProtocolErrorFrameSchema,
]);
export type ServerFrame = z.infer<typeof ServerFrameSchema>;

/**
 * Data attached at WebSocket upgrade: the validated UUID conversation
 * identity and the replay cursor (last durable sequence already applied by
 * the client, or `-1` for a full replay).
 */
export interface ConversationSocketData {
  readonly conversationId: string;
  readonly cursor: number;
}

export interface ConversationSocketRuntimeOptions {
  /**
   * The injected conversation turn owner: prepares the requested-policy and
   * prompt evidence the runtime journals durably before the first delta, then
   * runs one coordinator turn. The production server injects the real
   * DeepSeek Pro/max owner; tests inject a deterministic scripted owner.
   */
  readonly turnOwner: ConversationTurnOwner;
  /**
   * Builds the compact current projection handed to the turn owner before
   * each turn. Absent when the caller wires no projection source; the
   * production server always provides it.
   */
  readonly projectionProvider?: ConversationContextProvider;
  /**
   * Executes one typed coordinator operation against the canonical owners.
   * The runtime journals `action.requested` with the exact operation before
   * calling the host, so a crash can never repeat a committed mutation
   * without the journal retaining the intended effect. Absent when no
   * operation execution is installed; such a turn fails its action visibly.
   */
  readonly operationHost?: ConversationOperationHost;
  /**
   * The exact retained ordinary Task carrier runtime. When present, a settled
   * task_continue action subscribes to its started carrier: owner-backed
   * trace activity becomes attributable `activity.delta` frames and terminal
   * settlement broadcasts `projection.changed`. Absent, carrier operations
   * fail visibly in the operation host.
   */
  readonly carrierRegistry?: ConversationExecutionCarrierRegistry;
  /** Delay before the replay read, to make replay-phase behavior deterministic in tests. */
  readonly replayDelayMs?: number;
  /** Clock seam for the owned journal; defaults to ISO now. */
  readonly now?: () => string;
}

/**
 * One Workbench conversation socket runtime. It owns exactly one
 * `FileConversationJournal` instance from its construction boundary, keeps
 * the current Workbench server the sole journal writer, and delivers durable
 * journal events plus provisional deltas to every socket of a conversation.
 * On upgrade it replays durable events after the cursor, then subscribes the
 * socket to live events; events appended during replay are buffered and
 * flushed without duplication. Only `journal.event` advances the cursor.
 *
 * Each accepted Principal message is receipted exactly once, then run through
 * the injected turn owner: the durable `coordinator.turn-started` (with the
 * turn's requested policy and prompt/disclosure/source-selector evidence) is
 * fsynced before the model call, provisional `response.delta` frames stream
 * from real coordinator deltas, and the terminal result is journaled as a
 * durable settled, failed, or interrupted turn. At most one turn is active
 * per conversation; later submits are receipted immediately and their turns
 * run in receipt order. `response.interrupt` aborts only the exact active
 * turn of the same conversation. The runtime owns no Task/Mission/project
 * canonical state and classifies no prose.
 *
 * A finished turn that carried at most one typed coordinator operation runs
 * through the injected operation host: `action.requested` with the exact
 * operation is fsynced before the effect, then the host's canonical receipt,
 * visible failure, or uncertainty is journaled as the action terminal event.
 * If the `action.requested` append itself fails, the turn fails visibly and
 * the host is never called. A failure to append the action's terminal event
 * leaves the action unresolved: it is reconciled (canonical receipt search,
 * single guarded retry, or uncertainty) before the next turn and on
 * reconnect, so a crash after the effect can never repeat a committed
 * mutation and a committed effect is never mislabeled as failed.
 */
export class ConversationSocketRuntime {
  readonly journal: FileConversationJournal;
  private readonly turnOwner: ConversationTurnOwner;
  private readonly projectionProvider: ConversationContextProvider | undefined;
  private readonly operationHost: ConversationOperationHost | undefined;
  private readonly carrierRegistry: ConversationExecutionCarrierRegistry | undefined;
  private readonly replayDelayMs: number;
  private readonly sockets = new Map<Bun.ServerWebSocket<ConversationSocketData>, SocketEntry>();
  private readonly subscribers = new Map<string, Set<SocketEntry>>();
  /** The exact currently running turn per conversation; undefined when none. */
  private readonly activeTurns = new Map<string, ActiveTurn>();
  /** Per-conversation FIFO chain so only one turn runs at a time. */
  private readonly turnChains = new Map<string, Promise<void>>();

  constructor(root: string, options: ConversationSocketRuntimeOptions) {
    this.journal = new FileConversationJournal(root, options.now);
    this.turnOwner = options.turnOwner;
    this.projectionProvider = options.projectionProvider;
    this.operationHost = options.operationHost;
    this.carrierRegistry = options.carrierRegistry;
    this.replayDelayMs = options.replayDelayMs ?? 0;
  }

  /**
   * Validate one upgrade request for the exact socket route, loopback
   * origin, UUID conversation identity, and `after` cursor, then upgrade it.
   * A cursor above the conversation's current journal head is rejected
   * rather than accepted, so the socket can never skip live events. Returns
   * a rejection response, or `undefined` when the socket was upgraded (Bun
   * ignores the fetch return after a successful upgrade).
   */
  async upgrade(
    request: Request,
    server: Bun.Server<ConversationSocketData>,
    port: number,
  ): Promise<Response | undefined> {
    const url = new URL(request.url);
    const candidate = conversationSocketId(url.pathname);
    if (candidate === null) {
      return jsonError(404, "not-a-conversation-socket", "the path is not a conversation socket route");
    }
    if (!exactLoopbackUpgradeOrigin(request, port)) {
      return jsonError(403, "origin-rejected", "conversation sockets accept only the exact loopback Workbench origin");
    }
    const parsedId = ConversationIdSchema.safeParse(candidate);
    if (!parsedId.success) {
      return jsonError(400, "invalid-conversation-id", "conversationId must be a UUID");
    }
    const cursor = parseAfterCursor(url.searchParams.get("after"));
    if (cursor === null) {
      return jsonError(400, "invalid-cursor", "after must be an integer of at least -1");
    }
    let head: number;
    try {
      head = await this.journal.lastCursor(parsedId.data);
    } catch (error: unknown) {
      return jsonError(500, "journal-error",
        `conversation journal read failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (cursor > head) {
      return jsonError(400, "cursor-beyond-head",
        `after ${cursor} exceeds the conversation journal head ${head}`, { head });
    }
    if (!server.upgrade(request, {
      data: { conversationId: parsedId.data, cursor },
    })) {
      return jsonError(400, "upgrade-failed", "the conversation socket upgrade failed");
    }
    return undefined;
  }

  /** The native Bun WebSocket handler bound to this runtime. */
  readonly websocket: Bun.WebSocketHandler<ConversationSocketData> = {
    open: (ws) => this.openSocket(ws),
    message: (ws, message) => this.onMessage(ws, message),
    close: (ws) => this.closeSocket(ws),
  };

  private openSocket(ws: Bun.ServerWebSocket<ConversationSocketData>): void {
    const entry: SocketEntry = {
      ws,
      conversationId: ws.data.conversationId,
      phase: "replaying",
      replayedUpTo: ws.data.cursor,
      buffer: [],
      closed: false,
    };
    this.sockets.set(ws, entry);
    let subscribers = this.subscribers.get(entry.conversationId);
    if (subscribers === undefined) {
      subscribers = new Set();
      this.subscribers.set(entry.conversationId, subscribers);
    }
    subscribers.add(entry);
    // Reconnect reconciliation runs in the same serialized chain as turns:
    // any unsettled action is settled against the canonical owner before
    // replay or a new turn observes it, and it can never interleave with an
    // active turn's action execution.
    this.runExclusive(entry.conversationId, () =>
      this.reconcileConversation(entry.conversationId));
    void this.replay(entry);
  }

  private async replay(entry: SocketEntry): Promise<void> {
    try {
      if (this.replayDelayMs > 0) await Bun.sleep(this.replayDelayMs);
      const events = await this.journal.readEventsAfter(entry.conversationId, entry.replayedUpTo);
      for (const event of events) {
        if (entry.closed) return;
        entry.ws.send(JSON.stringify(journalEventFrame(event)));
        entry.replayedUpTo = event.sequence;
      }
      for (const frame of entry.buffer) {
        if (entry.closed) return;
        if (frame.type === "journal.event" && frame.event.sequence <= entry.replayedUpTo) continue;
        entry.ws.send(JSON.stringify(frame));
      }
      entry.buffer = [];
      entry.phase = "live";
    } catch (error: unknown) {
      if (entry.closed) return;
      entry.ws.send(JSON.stringify(protocolErrorFrame(
        "journal-error",
        error instanceof Error ? error.message : String(error),
      )));
      entry.ws.close(1011, "conversation journal read failed");
    }
  }

  private onMessage(ws: Bun.ServerWebSocket<ConversationSocketData>, message: string | Buffer<ArrayBuffer>): void {
    const entry = this.sockets.get(ws);
    if (entry === undefined) return;
    const messageBytes = typeof message === "string"
      ? Buffer.byteLength(message, "utf8")
      : message.byteLength;
    if (messageBytes > CONVERSATION_SOCKET_MAX_MESSAGE_BYTES) {
      this.send(entry, protocolErrorFrame(
        "frame-too-large",
        `client frame exceeds the ${CONVERSATION_SOCKET_MAX_MESSAGE_BYTES} byte limit`,
      ));
      return;
    }
    let frame: ClientFrame;
    try {
      const parsed: unknown = typeof message === "string" ? JSON.parse(message) : null;
      frame = ClientFrameSchema.parse(parsed);
    } catch {
      this.send(entry, protocolErrorFrame("invalid-frame", "client frame rejected"));
      return;
    }
    switch (frame.type) {
      case "message.submit":
        void this.submitMessage(entry, frame);
        break;
      case "response.interrupt":
        this.interruptTurn(entry, frame);
        break;
      case "tool.interrupt":
      case "work.control":
        this.send(entry, protocolErrorFrame(
          "unsupported-frame",
          `${frame.type} is not owned by the conversation runtime`,
        ));
        break;
    }
  }

  private async submitMessage(entry: SocketEntry, frame: ClientMessageSubmitFrame): Promise<void> {
    try {
      const result = await this.journal.submitMessage(entry.conversationId, {
        clientMessageId: frame.clientMessageId,
        payload: frame.payload,
      });
      // The retained receipt is a journal.event like any other: it goes
      // through the replay buffer/dedup path so a replay-phase duplicate
      // can never be delivered out of journal order.
      this.broadcast(entry.conversationId, journalEventFrame(result.event));
      if (result.duplicate) return;
      const turnId = randomUUID();
      const messageId = result.event.data.messageId;
      this.runExclusive(entry.conversationId, async () => {
        await this.reconcileConversation(entry.conversationId);
        await this.runTurn(entry, { turnId, messageId, payload: frame.payload });
      });
    } catch (error: unknown) {
      if (error instanceof ConversationConflictError) {
        this.send(entry, protocolErrorFrame("conflict", error.message));
        return;
      }
      this.send(entry, protocolErrorFrame(
        "journal-error",
        error instanceof Error ? error.message : String(error),
      ));
    }
  }

  /**
   * Run one prepared coordinator turn after its durable start is journaled:
   * `coordinator.turn-started` (with requested policy and prompt evidence)
   * is fsynced before the owner starts, so no delta can precede the durable
   * record. The compact current projection is rebuilt from the canonical
   * sources immediately before preparation. Deltas become provisional
   * `response.delta` frames; a finished turn's at most one typed operation
   * runs through the injected host with its `action.requested` fsynced
   * before the effect; the terminal result becomes one durable
   * settled/failed/interrupted journal event.
   */
  private async runTurn(
    entry: SocketEntry,
    input: { readonly turnId: string; readonly messageId: string; readonly payload: string },
  ): Promise<void> {
    const { conversationId } = entry;
    let preparation: TurnPreparation;
    try {
      const projection = this.projectionProvider === undefined
        ? undefined
        : await this.projectionProvider.buildProjection(conversationId);
      preparation = this.turnOwner.prepare({
        ...input,
        ...(projection === undefined ? {} : { projection }),
      });
    } catch (error: unknown) {
      this.send(entry, protocolErrorFrame(
        "journal-error",
        `conversation turn preparation failed: ${errorMessage(error)}`,
      ));
      return;
    }
    try {
      const started = await this.journal.startTurn(conversationId, {
        turnId: input.turnId,
        messageId: input.messageId,
        requestedPolicy: preparation.requestedPolicy,
        prompt: preparation.prompt,
        disclosedSources: [...preparation.disclosedSources],
        sourceRevisionSelectors: [...preparation.sourceRevisionSelectors],
      });
      this.broadcast(conversationId, journalEventFrame(started));
    } catch (error: unknown) {
      this.send(entry, protocolErrorFrame(
        "journal-error",
        error instanceof Error ? error.message : String(error),
      ));
      return;
    }

    const active: ActiveTurn = {
      turnId: input.turnId,
      messageId: input.messageId,
      interrupting: false,
      interruptRequested: false,
      handle: null,
    };
    this.activeTurns.set(conversationId, active);
    try {
      let terminal: ConversationTurnResult;
      try {
        const handle = this.turnOwner.start(preparation, (text) => {
          if (active.interrupting) return;
          this.broadcast(conversationId, responseDeltaFrame({
            turnId: input.turnId,
            messageId: input.messageId,
            text,
          }));
        });
        active.handle = handle;
        if (active.interruptRequested) {
          active.interrupting = true;
          handle.interrupt();
        }
        terminal = await handle.result;
      } catch (error: unknown) {
        const reason = `conversation turn owner failed: ${errorMessage(error)}`;
        try {
          const event = await this.journal.failTurn(conversationId, {
            turnId: input.turnId,
            messageId: input.messageId,
            reason,
          });
          this.broadcast(conversationId, journalEventFrame(event));
        } catch (journalError: unknown) {
          this.send(entry, protocolErrorFrame("journal-error", errorMessage(journalError)));
        }
        return;
      }
      if (terminal.kind === "finished" && terminal.operation !== undefined) {
        try {
          await this.runAction(conversationId, input, terminal.operation);
        } catch (error: unknown) {
          if (!(error instanceof ActionRequestJournalError)) throw error;
          // The intended effect was never journaled durably, so no effect is
          // applied; the turn fails visibly instead of settling normally.
          try {
            const event = await this.journal.failTurn(conversationId, {
              turnId: input.turnId,
              messageId: input.messageId,
              reason: error.message,
            });
            this.broadcast(conversationId, journalEventFrame(event));
          } catch (journalError: unknown) {
            this.send(entry, protocolErrorFrame("journal-error", errorMessage(journalError)));
          }
          return;
        }
      }
      try {
        const event = await this.settleTurnTerminal(conversationId, input, terminal);
        this.broadcast(conversationId, journalEventFrame(event));
      } catch (error: unknown) {
        this.send(entry, protocolErrorFrame(
          "journal-error",
          error instanceof Error ? error.message : String(error),
        ));
      }
    } finally {
      this.activeTurns.delete(conversationId);
    }
  }

  /** Map a terminal coordinator result onto the journal's minimal settlement schemas. */
  private async settleTurnTerminal(
    conversationId: string,
    input: { readonly turnId: string; readonly messageId: string },
    terminal: ConversationTurnResult,
  ): Promise<ConversationEvent> {
    switch (terminal.kind) {
      case "finished":
        return await this.journal.settleTurn(conversationId, {
          turnId: input.turnId,
          messageId: input.messageId,
          response: terminal.text,
          observedEvidence: {
            ...(terminal.observed.provider === undefined
              ? {}
              : { provider: terminal.observed.provider }),
            ...(terminal.observed.model === undefined
              ? {}
              : { model: terminal.observed.model }),
            ...(terminal.observed.fingerprint === undefined
              ? {}
              : { fingerprint: terminal.observed.fingerprint }),
            usage: {
              inputTokens: terminal.usage.inputTokens,
              outputTokens: terminal.usage.outputTokens,
            },
          },
        });
      case "failed":
        return await this.journal.failTurn(conversationId, {
          turnId: input.turnId,
          messageId: input.messageId,
          reason: terminal.error,
        });
      case "interrupted":
        return await this.journal.interruptTurn(conversationId, {
          turnId: input.turnId,
          messageId: input.messageId,
        });
      default: {
        const unreachable: never = terminal;
        throw new Error(`unexpected terminal conversation turn outcome: ${String(unreachable)}`);
      }
    }
  }

  /**
   * Execute one typed coordinator operation through the injected host. The
   * durable `action.requested` record — carrying the exact operation — is
   * fsynced before the effect; only then is the host called. If that durable
   * request append fails, `ActionRequestJournalError` is thrown so the
   * calling turn fails visibly instead of settling, and the host is never
   * called. The host's canonical receipt becomes `action.settled`, a visible
   * refusal or failure becomes `action.failed`, and an uninspectable effect
   * becomes `action.uncertain`.
   */
  private async runAction(
    conversationId: string,
    input: { readonly turnId: string; readonly messageId: string },
    operation: ConversationOperation,
  ): Promise<void> {
    const actionId = randomUUID();
    let requested: ActionRequestedEvent;
    try {
      requested = await this.journal.requestAction(conversationId, {
        actionId,
        turnId: input.turnId,
        messageId: input.messageId,
        operation,
      });
    } catch (error: unknown) {
      throw new ActionRequestJournalError(
        `action.requested could not be journaled before the effect: ${errorMessage(error)}`,
      );
    }
    this.broadcast(conversationId, journalEventFrame(requested));
    await this.settleActionEffect(conversationId, requested, operation);
    this.attachCarrier(conversationId, requested);
  }

  /**
   * After a task_continue action settles, subscribe the runtime to the exact
   * carrier the action started: owner-backed trace activity becomes
   * attributable `activity.delta` frames and the terminal settlement
   * broadcasts `projection.changed`. The subscription is runtime-only; the
   * durable Task/attempt/settlement evidence stays in its canonical owners.
   */
  private attachCarrier(conversationId: string, requested: ActionRequestedEvent): void {
    if (this.carrierRegistry === undefined) return;
    if (requested.data.kind !== "task_continue") return;
    const carrier = this.carrierRegistry.startedCarrier(conversationId, requested.data.actionId);
    if (carrier === undefined) return;
    const { turnId, messageId, actionId } = requested.data;
    const { taskId, attemptId, carrierId } = carrier.identity;
    carrier.onActivity((activity) => {
      this.broadcast(conversationId, activityDeltaFrame({
        turnId,
        messageId,
        taskId,
        attemptId,
        actionId,
        carrierId,
        text: activity.text,
      }));
    });
    carrier.onSettled(() => {
      this.broadcast(conversationId, { type: "projection.changed" });
    });
  }

  /** Reconcile every unsettled `action.requested` of one conversation. */
  private async reconcileConversation(conversationId: string): Promise<void> {
    let events: readonly ConversationEvent[];
    try {
      events = await this.journal.readEvents(conversationId);
    } catch (error: unknown) {
      return;
    }
    for (const event of events) {
      if (event.type !== "action.requested") continue;
      if (events.some((candidate) =>
        isActionTerminalEvent(candidate) && candidate.data.actionId === event.data.actionId)) continue;
      await this.reconcileAction(conversationId, event);
    }
  }

  /**
   * Reconcile one unsettled action after a crash between the durable request
   * and its journal terminal. The canonical owner is searched for the
   * action's causal reference: an exact match settles the retained receipt;
   * an uninspectable owner is `action.uncertain`; a provable absence under
   * the current source is retried exactly once through the same guarded
   * effect, so a committed mutation is never repeated and an absent one is
   * never claimed.
   */
  private async reconcileAction(
    conversationId: string,
    requested: ActionRequestedEvent,
  ): Promise<void> {
    if (this.operationHost === undefined) {
      await this.journalActionTerminal(conversationId, requested, {
        kind: "failed",
        reason: "operation execution is not installed for this conversation runtime",
      });
      return;
    }
    const lookup = this.operationHost.findCanonicalReceipt({
      conversationId,
      actionId: requested.data.actionId,
      operation: requested.data.operation,
    });
    if (lookup.standing === "settled") {
      await this.journalActionTerminal(conversationId, requested, {
        kind: "settled",
        evidenceRefs: [...lookup.receipt.evidenceRefs],
      });
      return;
    }
    if (lookup.standing === "uninspectable") {
      await this.journalActionTerminal(conversationId, requested, {
        kind: "uncertain",
        reason: lookup.reason,
      });
      return;
    }
    await this.settleActionEffect(conversationId, requested, requested.data.operation);
  }

  /**
   * Run one requested action's effect, then journal its terminal event.
   * The canonical effect and the terminal journal write are kept separate: a
   * canonical failure becomes `action.failed` (or `action.uncertain` when the
   * owner is uninspectable), while a failure to append the terminal event
   * leaves the action unresolved in the journal. Reconciliation on the next
   * turn or reconnect then searches the canonical owner for the causal
   * reference: a committed effect is settled without repeating the mutation,
   * and a provably absent one is retried through the same guarded effect. A
   * committed effect is never converted into `action.failed` by a journal
   * write failure.
   */
  private async settleActionEffect(
    conversationId: string,
    requested: ActionRequestedEvent,
    operation: ConversationOperation,
  ): Promise<void> {
    const { actionId } = requested.data;
    let terminal:
      | { readonly kind: "settled"; readonly evidenceRefs: readonly string[] }
      | { readonly kind: "failed" | "uncertain"; readonly reason: string };
    if (this.operationHost === undefined) {
      terminal = {
        kind: "failed",
        reason: "operation execution is not installed for this conversation runtime",
      };
    } else {
      try {
        const receipt = await this.operationHost.executeOperation({
          conversationId,
          turnId: requested.data.turnId,
          actionId,
          operation,
        });
        terminal = { kind: "settled", evidenceRefs: [...receipt.evidenceRefs] };
      } catch (error: unknown) {
        if (
          error instanceof ConversationOperationHostError
          && (error.code === "source-unavailable" || error.code === "carrier-unknown")
        ) {
          terminal = {
            kind: "uncertain",
            reason: `the canonical effect cannot be reconciled: ${error.message}`,
          };
        } else {
          terminal = { kind: "failed", reason: errorMessage(error) };
        }
      }
    }
    try {
      await this.journalActionTerminal(conversationId, requested, terminal);
    } catch {
      // The action stays unresolved in the journal and remains reconcilable;
      // the canonical owner keeps the only record of what really happened.
      return;
    }
    this.broadcast(conversationId, { type: "projection.changed" });
  }

  /** Journal one terminal event for a requested action and deliver it. */
  private async journalActionTerminal(
    conversationId: string,
    requested: ActionRequestedEvent,
    terminal: {
      readonly kind: "settled";
      readonly evidenceRefs: readonly string[];
    } | {
      readonly kind: "failed" | "uncertain";
      readonly reason: string;
    },
  ): Promise<void> {
    const { actionId, turnId, messageId } = requested.data;
    const event = terminal.kind === "settled"
      ? await this.journal.settleAction(conversationId, {
        actionId,
        turnId,
        messageId,
        evidenceRefs: [...terminal.evidenceRefs],
      })
      : terminal.kind === "failed"
        ? await this.journal.failAction(conversationId, {
          actionId,
          turnId,
          messageId,
          reason: terminal.reason,
        })
        : await this.journal.uncertainAction(conversationId, {
          actionId,
          turnId,
          messageId,
          reason: terminal.reason,
        });
    this.broadcast(conversationId, journalEventFrame(event));
  }

  /**
   * Abort only the exact active turn of the socket's conversation. An unknown
   * or already ended turn is a visible protocol conflict; an interrupt that
   * arrives between the durable turn start and handle creation is applied the
   * moment the handle exists. Once an interrupt is requested no further
   * delta of that turn is delivered, and the turn settles as durable
   * `coordinator.turn-interrupted`.
   */
  private interruptTurn(entry: SocketEntry, frame: ClientResponseInterruptFrame): void {
    const active = this.activeTurns.get(entry.conversationId);
    if (active === undefined || active.turnId !== frame.turnId) {
      this.send(entry, protocolErrorFrame(
        "conflict",
        `response.interrupt targets turn ${frame.turnId}, which is not the active turn `
        + `of conversation ${entry.conversationId}`,
      ));
      return;
    }
    if (active.handle === null) {
      active.interruptRequested = true;
      return;
    }
    active.interrupting = true;
    active.handle.interrupt();
  }

  /** Queue one task per conversation so at most one runs at a time. */
  private runExclusive(conversationId: string, run: () => Promise<void>): void {
    const previous = this.turnChains.get(conversationId) ?? Promise.resolve();
    const current = previous.then(run, run);
    const tail = current.catch(() => {});
    this.turnChains.set(conversationId, tail);
    void tail.then(() => {
      if (this.turnChains.get(conversationId) === tail) {
        this.turnChains.delete(conversationId);
      }
    });
  }

  private closeSocket(ws: Bun.ServerWebSocket<ConversationSocketData>): void {
    const entry = this.sockets.get(ws);
    if (entry === undefined) return;
    entry.closed = true;
    this.sockets.delete(ws);
    const subscribers = this.subscribers.get(entry.conversationId);
    subscribers?.delete(entry);
    if (subscribers !== undefined && subscribers.size === 0) {
      this.subscribers.delete(entry.conversationId);
    }
  }

  private broadcast(conversationId: string, frame: ServerFrame): void {
    const subscribers = this.subscribers.get(conversationId);
    if (subscribers === undefined) return;
    for (const entry of subscribers) {
      if (entry.closed) continue;
      if (entry.phase === "live") {
        if (frame.type === "journal.event" && frame.event.sequence <= entry.replayedUpTo) continue;
        entry.ws.send(JSON.stringify(frame));
      } else {
        entry.buffer.push(frame);
      }
    }
  }

  private send(entry: SocketEntry, frame: ServerFrame): void {
    if (entry.closed) return;
    entry.ws.send(JSON.stringify(frame));
  }
}

interface SocketEntry {
  readonly ws: Bun.ServerWebSocket<ConversationSocketData>;
  readonly conversationId: string;
  phase: "replaying" | "live";
  replayedUpTo: number;
  buffer: ServerFrame[];
  closed: boolean;
}

interface ActiveTurn {
  readonly turnId: string;
  readonly messageId: string;
  interrupting: boolean;
  interruptRequested: boolean;
  handle: ConversationTurnHandle | null;
}

function conversationSocketId(pathname: string): string | null {
  const match = /^\/api\/conversations\/([^/]+)\/socket$/u.exec(pathname);
  if (match === null) return null;
  try {
    return decodeURIComponent(match[1]!);
  } catch {
    return "";
  }
}

function exactLoopbackUpgradeOrigin(request: Request, port: number): boolean {
  const expected = `http://127.0.0.1:${port}`;
  if (new URL(request.url).origin !== expected) return false;
  const origin = request.headers.get("origin");
  return origin === null || origin === expected;
}

function parseAfterCursor(value: string | null): number | null {
  if (value === null) return -1;
  if (!/^-?\d+$/u.test(value)) return null;
  const cursor = Number(value);
  if (!Number.isSafeInteger(cursor) || cursor < -1) return null;
  return cursor;
}

/**
 * Raised when the durable `action.requested` append fails before any effect.
 * The calling turn must fail visibly instead of settling normally, because
 * the intended operation can no longer be reconciled from the journal and
 * therefore must not run.
 */
export class ActionRequestJournalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionRequestJournalError";
  }
}

function isActionTerminalEvent(
  event: ConversationEvent,
): event is Extract<ConversationEvent, { type: "action.settled" | "action.failed" | "action.uncertain" }> {
  return event.type === "action.settled" || event.type === "action.failed" || event.type === "action.uncertain";
}

function journalEventFrame(event: ConversationEvent): ServerJournalEventFrame {
  return { type: "journal.event", event };
}

function responseDeltaFrame(data: {
  readonly turnId: string;
  readonly messageId: string;
  readonly text: string;
}): ServerResponseDeltaFrame {
  return { type: "response.delta", ...data };
}

function activityDeltaFrame(data: {
  readonly turnId: string;
  readonly messageId: string;
  readonly taskId: string;
  readonly attemptId: string;
  readonly actionId: string;
  readonly carrierId: string;
  readonly text: string;
}): ServerActivityDeltaFrame {
  return { type: "activity.delta", ...data };
}

function protocolErrorFrame(code: ProtocolErrorCode, message: string): ServerProtocolErrorFrame {
  return { type: "protocol.error", code, message };
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== "" ? error.message : String(error);
}

function jsonError(
  status: number,
  error: string,
  message: string,
  extra: Record<string, unknown> = {},
): Response {
  return Response.json({ error, message, ...extra }, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
