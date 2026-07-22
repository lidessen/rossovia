import { z } from "zod";
import { TaskSchema, UsageSchema } from "../../../packages/work-cell/src/contracts";
import type { MissionExecutionOutcome } from "./mission-execution-host";

export const MISSION_TURN_VERSION = "atthis.mission-turn.v1" as const;
export const MISSION_TURN_RECOVERY_VERSION = "atthis.mission-turn-recovery.v1" as const;

export const MissionTurnStartSchema = z.object({
  version: z.literal(MISSION_TURN_VERSION),
  turnId: z.string().min(1),
  baselineWatermark: z.number().int().nonnegative(),
  anchorDigest: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  sourceRefs: z.array(z.string().min(1)).min(1),
}).strict();

const InputReferenceSchema = z.object({
  inputId: z.string().min(1),
  eventId: z.string().min(1),
  watermark: z.number().int().positive(),
  payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

export const MissionTurnSettlementSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("finished"),
    runStatus: z.enum(["returned", "step-limit", "needs-attention"]),
    text: z.string(),
    tasks: z.array(TaskSchema),
    uncoveredObligationRefs: z.array(z.string().min(1)),
    usage: UsageSchema,
  }).strict(),
  z.object({
    kind: z.literal("input-pending"),
    turnWatermark: z.number().int().nonnegative(),
    currentWatermark: z.number().int().positive(),
    inputRefs: z.array(InputReferenceSchema).min(1),
    activeBatchId: z.string().min(1).optional(),
  }).strict(),
  z.object({
    kind: z.literal("failed"),
    error: z.string().min(1),
  }).strict(),
]);

export const MissionTurnStartedEventDataSchema = z.object({
  startDigest: z.string().regex(/^[a-f0-9]{64}$/),
  start: MissionTurnStartSchema,
}).strict();

export const MissionTurnSettledEventDataSchema = z.object({
  turnId: z.string().min(1),
  startDigest: z.string().regex(/^[a-f0-9]{64}$/),
  settlementDigest: z.string().regex(/^[a-f0-9]{64}$/),
  settlement: MissionTurnSettlementSchema,
}).strict();

export const MissionTurnRecoveryCommandSchema = z.object({
  id: z.string().min(1),
  actorRef: z.string().min(1),
  sourceRef: z.string().min(1),
  action: z.enum(["resume", "replace", "abandon"]),
}).strict();

export const MissionTurnRecoverySchema = z.object({
  version: z.literal(MISSION_TURN_RECOVERY_VERSION),
  id: z.string().min(1),
  actorRef: z.string().min(1),
  sourceRef: z.string().min(1),
  interruptedTurnId: z.string().min(1),
  action: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("resume") }).strict(),
    z.object({
      kind: z.literal("replace"),
      replacement: MissionTurnStartSchema,
    }).strict(),
    z.object({ kind: z.literal("abandon") }).strict(),
  ]),
}).strict();

export const MissionTurnRecoveredEventDataSchema = z.object({
  interruptedStartDigest: z.string().regex(/^[a-f0-9]{64}$/),
  recoveryDigest: z.string().regex(/^[a-f0-9]{64}$/),
  recovery: MissionTurnRecoverySchema,
}).strict();

export type MissionTurnStart = z.infer<typeof MissionTurnStartSchema>;
export type MissionTurnSettlement = z.infer<typeof MissionTurnSettlementSchema>;
export type MissionTurnRecoveryCommand = z.infer<typeof MissionTurnRecoveryCommandSchema>;
export type MissionTurnRecovery = z.infer<typeof MissionTurnRecoverySchema>;

export interface MissionTurnState {
  readonly start: MissionTurnStart;
  readonly recoveries?: readonly MissionTurnRecovery[];
  readonly settlement?: MissionTurnSettlement;
}

export interface MissionTurnLog {
  startTurn(missionId: string, start: MissionTurnStart): Promise<void>;
  recoverTurn(missionId: string, recovery: MissionTurnRecovery): Promise<void>;
  findTurnRecovery(missionId: string, recoveryId: string): Promise<MissionTurnRecovery | undefined>;
  settleTurn(missionId: string, turnId: string, settlement: MissionTurnSettlement): Promise<void>;
  latestTurn(missionId: string): Promise<MissionTurnState | undefined>;
}

export function missionTurnNeedsRecovery(turn: MissionTurnState): boolean {
  if (turn.settlement !== undefined) return false;
  const terminal = turn.recoveries?.find((recovery) =>
    recovery.action.kind === "replace" || recovery.action.kind === "abandon"
  );
  return terminal === undefined;
}

export function settlementFromExecution(
  outcome: MissionExecutionOutcome,
): MissionTurnSettlement | undefined {
  if (outcome.kind === "cancelled") return undefined;
  if (outcome.kind === "failed") return { kind: "failed", error: outcome.error };
  if (outcome.kind === "finished") {
    return MissionTurnSettlementSchema.parse({
      kind: "finished",
      runStatus: outcome.run.status,
      text: outcome.run.text,
      tasks: outcome.run.tasks,
      uncoveredObligationRefs: outcome.run.uncoveredObligations,
      usage: outcome.run.usage,
    });
  }
  return MissionTurnSettlementSchema.parse({
    kind: "input-pending",
    turnWatermark: outcome.transition.turnWatermark,
    currentWatermark: outcome.transition.currentWatermark,
    inputRefs: outcome.transition.inputs.map((input) => ({
      inputId: input.inputId,
      eventId: input.eventId,
      watermark: input.watermark,
      payloadDigest: input.payloadDigest,
    })),
    ...(outcome.transition.activeBatch === undefined
      ? {}
      : { activeBatchId: outcome.transition.activeBatch.checkpoint.id }),
  });
}
