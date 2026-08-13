import { createHash } from "node:crypto";
import { z } from "zod";

/**
 * Strict interaction vocabulary for one Workbench conversation. The journal
 * owns only settled communication events and the reconnect cursor: message
 * receipt, coordinator turn settlement, and typed action settlement with
 * causal references. It carries no Task/Mission/effect lifecycle, liveness,
 * acceptance, transport frame, or raw provider content.
 */
export const CONVERSATION_EVENT_VERSION = "rosso.conversation-event.v1" as const;

export const ConversationIdSchema = z.string().uuid();
export const ClientMessageIdSchema = z.string().uuid();
export const MessageIdSchema = z.string().uuid();
export const TurnIdSchema = z.string().uuid();
export const ActionIdSchema = z.string().uuid();
export const EventIdSchema = z.string().min(1);
export const DigestSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const PayloadDigestSchema = DigestSchema;
export const EvidenceRefSchema = z.string().min(1);

export const ActionKindSchema = z.enum([
  "task_create",
  "task_correct",
  "task_continue",
  "work_control",
]);
export type ActionKind = z.infer<typeof ActionKindSchema>;

export const ActionUncertainReasonSchema = z.string().min(1);
export type ActionUncertainReason = z.infer<typeof ActionUncertainReasonSchema>;

/**
 * The coordinator policy that was requested for a turn. It is a requested
 * fact, never an observed one; observed provider identity stays in the turn
 * settlement's `observedEvidence` and remains unavailable when not reported.
 */
export const RequestedCoordinatorPolicySchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  thinking: z.enum(["enabled", "disabled"]),
  reasoningEffort: z.string().min(1),
}).strict();
export type RequestedCoordinatorPolicy = z.infer<typeof RequestedCoordinatorPolicySchema>;

/**
 * The versioned prompt actually used for a turn, when the caller can name it.
 * `revision` is the prompt builder's stable version and `digest` the exact
 * composed prompt digest; the prompt text itself is never retained.
 */
export const PromptEvidenceSchema = z.object({
  revision: z.string().min(1),
  digest: DigestSchema,
}).strict();
export type PromptEvidence = z.infer<typeof PromptEvidenceSchema>;

/** One canonical source disclosed to the coordinator, by ref and content digest. */
export const DisclosedSourceSchema = z.object({
  ref: EvidenceRefSchema,
  digest: DigestSchema,
}).strict();
export type DisclosedSource = z.infer<typeof DisclosedSourceSchema>;

/**
 * One exact current source revision the coordinator reads against, for
 * example the Task source revision or the observed primary head.
 */
export const SourceRevisionSelectorSchema = z.object({
  source: z.string().min(1),
  revision: z.string().min(1),
}).strict();
export type SourceRevisionSelector = z.infer<typeof SourceRevisionSelectorSchema>;

/**
 * Optional metadata the provider actually reported for a settled turn.
 * Evidence only: identity and fingerprint, plus sanitized numeric usage. No
 * raw provider text, reasoning, content, or trace is retained here.
 */
export const ObservedProviderEvidenceSchema = z.object({
  provider: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  fingerprint: z.string().min(1).optional(),
  usage: z.object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
  }).strict().optional(),
}).strict();
export type ObservedProviderEvidence = z.infer<typeof ObservedProviderEvidenceSchema>;

export const MessageReceivedDraftSchema = z.object({
  clientMessageId: ClientMessageIdSchema,
  payload: z.string().min(1),
}).strict();
export type MessageReceivedDraft = z.infer<typeof MessageReceivedDraftSchema>;

export const TurnStartedDraftSchema = z.object({
  turnId: TurnIdSchema,
  messageId: MessageIdSchema,
  requestedPolicy: RequestedCoordinatorPolicySchema,
  prompt: PromptEvidenceSchema.optional(),
  disclosedSources: z.array(DisclosedSourceSchema).optional(),
  sourceRevisionSelectors: z.array(SourceRevisionSelectorSchema).optional(),
}).strict();
export type TurnStartedDraft = z.infer<typeof TurnStartedDraftSchema>;

export const ActionRequestedDraftSchema = z.object({
  actionId: ActionIdSchema,
  turnId: TurnIdSchema,
  messageId: MessageIdSchema,
  kind: ActionKindSchema,
}).strict();
export type ActionRequestedDraft = z.infer<typeof ActionRequestedDraftSchema>;

export const ActionSettledDraftSchema = z.object({
  actionId: ActionIdSchema,
  turnId: TurnIdSchema,
  messageId: MessageIdSchema,
  evidenceRefs: z.array(EvidenceRefSchema),
}).strict();
export type ActionSettledDraft = z.infer<typeof ActionSettledDraftSchema>;

export const ActionFailedDraftSchema = z.object({
  actionId: ActionIdSchema,
  turnId: TurnIdSchema,
  messageId: MessageIdSchema,
  reason: z.string().min(1),
}).strict();
export type ActionFailedDraft = z.infer<typeof ActionFailedDraftSchema>;

export const ActionUncertainDraftSchema = z.object({
  actionId: ActionIdSchema,
  turnId: TurnIdSchema,
  messageId: MessageIdSchema,
  reason: ActionUncertainReasonSchema,
}).strict();
export type ActionUncertainDraft = z.infer<typeof ActionUncertainDraftSchema>;

export const TurnSettledDraftSchema = z.object({
  turnId: TurnIdSchema,
  messageId: MessageIdSchema,
  observedEvidence: ObservedProviderEvidenceSchema.optional(),
}).strict();
export type TurnSettledDraft = z.infer<typeof TurnSettledDraftSchema>;

export const TurnFailedDraftSchema = z.object({
  turnId: TurnIdSchema,
  messageId: MessageIdSchema,
  reason: z.string().min(1),
}).strict();
export type TurnFailedDraft = z.infer<typeof TurnFailedDraftSchema>;

export const TurnInterruptedDraftSchema = z.object({
  turnId: TurnIdSchema,
  messageId: MessageIdSchema,
}).strict();
export type TurnInterruptedDraft = z.infer<typeof TurnInterruptedDraftSchema>;

export const ConversationEventDraftSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("message.received"), data: MessageReceivedDraftSchema }).strict(),
  z.object({ type: z.literal("coordinator.turn-started"), data: TurnStartedDraftSchema }).strict(),
  z.object({ type: z.literal("action.requested"), data: ActionRequestedDraftSchema }).strict(),
  z.object({ type: z.literal("action.settled"), data: ActionSettledDraftSchema }).strict(),
  z.object({ type: z.literal("action.failed"), data: ActionFailedDraftSchema }).strict(),
  z.object({ type: z.literal("action.uncertain"), data: ActionUncertainDraftSchema }).strict(),
  z.object({ type: z.literal("coordinator.turn-settled"), data: TurnSettledDraftSchema }).strict(),
  z.object({ type: z.literal("coordinator.turn-failed"), data: TurnFailedDraftSchema }).strict(),
  z.object({ type: z.literal("coordinator.turn-interrupted"), data: TurnInterruptedDraftSchema }).strict(),
]);
export type ConversationEventDraft = z.infer<typeof ConversationEventDraftSchema>;

/**
 * Stored message receipt: the server-assigned stable identity, the client
 * deduplication key, the retained payload, and the payload digest that makes
 * duplicate reconciliation exact.
 */
export const MessageReceivedDataSchema = z.object({
  messageId: MessageIdSchema,
  clientMessageId: ClientMessageIdSchema,
  payload: z.string().min(1),
  payloadDigest: PayloadDigestSchema,
}).strict();
export type MessageReceivedData = z.infer<typeof MessageReceivedDataSchema>;

export const ConversationEventSchema = z.discriminatedUnion("type", [
  z.object({
    version: z.literal(CONVERSATION_EVENT_VERSION),
    eventId: EventIdSchema,
    conversationId: ConversationIdSchema,
    sequence: z.number().int().nonnegative(),
    at: z.string().datetime({ offset: true }),
    type: z.literal("message.received"),
    data: MessageReceivedDataSchema,
  }).strict(),
  z.object({
    version: z.literal(CONVERSATION_EVENT_VERSION),
    eventId: EventIdSchema,
    conversationId: ConversationIdSchema,
    sequence: z.number().int().nonnegative(),
    at: z.string().datetime({ offset: true }),
    type: z.literal("coordinator.turn-started"),
    data: TurnStartedDraftSchema,
  }).strict(),
  z.object({
    version: z.literal(CONVERSATION_EVENT_VERSION),
    eventId: EventIdSchema,
    conversationId: ConversationIdSchema,
    sequence: z.number().int().nonnegative(),
    at: z.string().datetime({ offset: true }),
    type: z.literal("action.requested"),
    data: ActionRequestedDraftSchema,
  }).strict(),
  z.object({
    version: z.literal(CONVERSATION_EVENT_VERSION),
    eventId: EventIdSchema,
    conversationId: ConversationIdSchema,
    sequence: z.number().int().nonnegative(),
    at: z.string().datetime({ offset: true }),
    type: z.literal("action.settled"),
    data: ActionSettledDraftSchema,
  }).strict(),
  z.object({
    version: z.literal(CONVERSATION_EVENT_VERSION),
    eventId: EventIdSchema,
    conversationId: ConversationIdSchema,
    sequence: z.number().int().nonnegative(),
    at: z.string().datetime({ offset: true }),
    type: z.literal("action.failed"),
    data: ActionFailedDraftSchema,
  }).strict(),
  z.object({
    version: z.literal(CONVERSATION_EVENT_VERSION),
    eventId: EventIdSchema,
    conversationId: ConversationIdSchema,
    sequence: z.number().int().nonnegative(),
    at: z.string().datetime({ offset: true }),
    type: z.literal("action.uncertain"),
    data: ActionUncertainDraftSchema,
  }).strict(),
  z.object({
    version: z.literal(CONVERSATION_EVENT_VERSION),
    eventId: EventIdSchema,
    conversationId: ConversationIdSchema,
    sequence: z.number().int().nonnegative(),
    at: z.string().datetime({ offset: true }),
    type: z.literal("coordinator.turn-settled"),
    data: TurnSettledDraftSchema,
  }).strict(),
  z.object({
    version: z.literal(CONVERSATION_EVENT_VERSION),
    eventId: EventIdSchema,
    conversationId: ConversationIdSchema,
    sequence: z.number().int().nonnegative(),
    at: z.string().datetime({ offset: true }),
    type: z.literal("coordinator.turn-failed"),
    data: TurnFailedDraftSchema,
  }).strict(),
  z.object({
    version: z.literal(CONVERSATION_EVENT_VERSION),
    eventId: EventIdSchema,
    conversationId: ConversationIdSchema,
    sequence: z.number().int().nonnegative(),
    at: z.string().datetime({ offset: true }),
    type: z.literal("coordinator.turn-interrupted"),
    data: TurnInterruptedDraftSchema,
  }).strict(),
]);

export type ConversationEvent = z.infer<typeof ConversationEventSchema>;
export type MessageReceivedEvent = Extract<ConversationEvent, { type: "message.received" }>;
export type TurnStartedEvent = Extract<ConversationEvent, { type: "coordinator.turn-started" }>;
export type ActionRequestedEvent = Extract<ConversationEvent, { type: "action.requested" }>;
export type ActionSettledEvent = Extract<ConversationEvent, { type: "action.settled" }>;
export type ActionFailedEvent = Extract<ConversationEvent, { type: "action.failed" }>;
export type ActionUncertainEvent = Extract<ConversationEvent, { type: "action.uncertain" }>;
export type TurnSettledEvent = Extract<ConversationEvent, { type: "coordinator.turn-settled" }>;
export type TurnFailedEvent = Extract<ConversationEvent, { type: "coordinator.turn-failed" }>;
export type TurnInterruptedEvent = Extract<ConversationEvent, { type: "coordinator.turn-interrupted" }>;

export interface MessageSubmitResult {
  readonly event: MessageReceivedEvent;
  /** True when the retained receipt was returned without appending a second record. */
  readonly duplicate: boolean;
}

/**
 * Explicit protocol conflict: an identity that was already durably recorded
 * was resubmitted with different content. The journal never rewrites the
 * retained record.
 */
export class ConversationConflictError extends Error {
  readonly conversationId: string;
  readonly clientMessageId: string;

  constructor(conversationId: string, clientMessageId: string, message: string) {
    super(message);
    this.name = "ConversationConflictError";
    this.conversationId = conversationId;
    this.clientMessageId = clientMessageId;
  }
}

export function digest(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(",")}}`;
}
