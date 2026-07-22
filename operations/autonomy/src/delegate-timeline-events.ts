import { z } from "zod";
import { CellRunRecordSchema } from "../../../packages/work-cell/src/contracts";
import { SwarmOutcomeRecordSchema } from "../../../packages/work-cell/src/swarm";
import { MissionInputEventDataSchema } from "./mission-input";
import { MissionReconciliationEventDataSchema } from "./mission-reconciliation-commit";
import { MissionAnchorSeedEventDataSchema } from "./mission-reconciliation";
import {
  MissionTurnRecoveredEventDataSchema,
  MissionTurnSettledEventDataSchema,
  MissionTurnStartedEventDataSchema,
} from "./mission-turn";

export const TIMELINE_EVENT_VERSION = "atthis.delegate-timeline-event.v1" as const;

export const CompactOutcomeSchema = z.object({
  key: z.string().min(1),
  cellId: z.string().min(1),
  status: z.string().min(1),
  runId: z.string().min(1).optional(),
  artifactRefs: z.array(z.string()),
}).strict();

export type StoredCompactOutcome = z.infer<typeof CompactOutcomeSchema>;

export const ChildReferenceSchema = z.object({
  callId: z.string().min(1),
  key: z.string().min(1),
  timelineId: z.string().min(1),
}).strict();

export type DelegateChildReference = z.infer<typeof ChildReferenceSchema>;

export const EvidenceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("cell-run"), record: CellRunRecordSchema }).strict(),
  z.object({ kind: z.literal("runner-error"), record: SwarmOutcomeRecordSchema }).strict(),
]);

export type DelegateChildEvidence = z.infer<typeof EvidenceSchema>;

export const TimelineEventSchema = z.discriminatedUnion("type", [
  z.object({
    version: z.literal(TIMELINE_EVENT_VERSION),
    eventId: z.string().min(1),
    timelineId: z.string().min(1),
    sequence: z.number().int().nonnegative(),
    at: z.string().min(1),
    type: z.literal("mission.anchor-seeded"),
    data: MissionAnchorSeedEventDataSchema,
  }).strict(),
  z.object({
    version: z.literal(TIMELINE_EVENT_VERSION),
    eventId: z.string().min(1),
    timelineId: z.string().min(1),
    sequence: z.number().int().nonnegative(),
    at: z.string().min(1),
    type: z.literal("mission.input-received"),
    data: MissionInputEventDataSchema,
  }).strict(),
  z.object({
    version: z.literal(TIMELINE_EVENT_VERSION),
    eventId: z.string().min(1),
    timelineId: z.string().min(1),
    sequence: z.number().int().nonnegative(),
    at: z.string().min(1),
    type: z.literal("mission.input-reconciled"),
    data: MissionReconciliationEventDataSchema,
  }).strict(),
  z.object({
    version: z.literal(TIMELINE_EVENT_VERSION),
    eventId: z.string().min(1),
    timelineId: z.string().min(1),
    sequence: z.number().int().nonnegative(),
    at: z.string().min(1),
    type: z.literal("mission.turn-started"),
    data: MissionTurnStartedEventDataSchema,
  }).strict(),
  z.object({
    version: z.literal(TIMELINE_EVENT_VERSION),
    eventId: z.string().min(1),
    timelineId: z.string().min(1),
    sequence: z.number().int().nonnegative(),
    at: z.string().min(1),
    type: z.literal("mission.turn-settled"),
    data: MissionTurnSettledEventDataSchema,
  }).strict(),
  z.object({
    version: z.literal(TIMELINE_EVENT_VERSION),
    eventId: z.string().min(1),
    timelineId: z.string().min(1),
    sequence: z.number().int().nonnegative(),
    at: z.string().min(1),
    type: z.literal("mission.turn-recovered"),
    data: MissionTurnRecoveredEventDataSchema,
  }).strict(),
  z.object({
    version: z.literal(TIMELINE_EVENT_VERSION),
    eventId: z.string().min(1),
    timelineId: z.string().min(1),
    sequence: z.number().int().nonnegative(),
    at: z.string().min(1),
    type: z.literal("delegate.batch-prepared"),
    data: z.object({
      batchId: z.string().min(1),
      checkpointDigest: z.string().regex(/^[a-f0-9]{64}$/),
      checkpoint: z.unknown(),
      children: z.array(ChildReferenceSchema).min(1),
    }).strict(),
  }).strict(),
  z.object({
    version: z.literal(TIMELINE_EVENT_VERSION),
    eventId: z.string().min(1),
    timelineId: z.string().min(1),
    sequence: z.number().int().nonnegative(),
    at: z.string().min(1),
    type: z.literal("delegate.batch-ready"),
    data: z.object({
      batchId: z.string().min(1),
      checkpointDigest: z.string().regex(/^[a-f0-9]{64}$/),
      children: z.array(z.object({
        callId: z.string().min(1),
        timelineId: z.string().min(1),
        settlementDigest: z.string().regex(/^[a-f0-9]{64}$/),
      }).strict()).min(1),
    }).strict(),
  }).strict(),
  z.object({
    version: z.literal(TIMELINE_EVENT_VERSION),
    eventId: z.string().min(1),
    timelineId: z.string().min(1),
    sequence: z.number().int().nonnegative(),
    at: z.string().min(1),
    type: z.literal("delegate.child-opened"),
    data: z.object({
      parentTimelineId: z.string().min(1),
      batchId: z.string().min(1),
      checkpointDigest: z.string().regex(/^[a-f0-9]{64}$/),
      callId: z.string().min(1),
      key: z.string().min(1),
    }).strict(),
  }).strict(),
  z.object({
    version: z.literal(TIMELINE_EVENT_VERSION),
    eventId: z.string().min(1),
    timelineId: z.string().min(1),
    sequence: z.number().int().nonnegative(),
    at: z.string().min(1),
    type: z.literal("delegate.child-dispatched"),
    data: z.object({
      batchId: z.string().min(1),
      checkpointDigest: z.string().regex(/^[a-f0-9]{64}$/),
      callId: z.string().min(1),
    }).strict(),
  }).strict(),
  z.object({
    version: z.literal(TIMELINE_EVENT_VERSION),
    eventId: z.string().min(1),
    timelineId: z.string().min(1),
    sequence: z.number().int().nonnegative(),
    at: z.string().min(1),
    type: z.literal("delegate.child-settled"),
    data: z.object({
      batchId: z.string().min(1),
      checkpointDigest: z.string().regex(/^[a-f0-9]{64}$/),
      callId: z.string().min(1),
      settlementDigest: z.string().regex(/^[a-f0-9]{64}$/),
      outcome: CompactOutcomeSchema,
      evidence: EvidenceSchema,
    }).strict(),
  }).strict(),
]);

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type TimelineEventDraft = TimelineEvent extends infer Event
  ? Event extends TimelineEvent
    ? Pick<Event, "type" | "data">
    : never
  : never;
export type ParentPreparedEvent = Extract<TimelineEvent, { type: "delegate.batch-prepared" }>;
export type ChildSettledEvent = Extract<TimelineEvent, { type: "delegate.child-settled" }>;
export type MissionInputReceivedEvent = Extract<TimelineEvent, { type: "mission.input-received" }>;
export type MissionAnchorSeededEvent = Extract<TimelineEvent, { type: "mission.anchor-seeded" }>;
export type MissionInputReconciledEvent = Extract<TimelineEvent, { type: "mission.input-reconciled" }>;
