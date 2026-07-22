import { z } from "zod";

export const MissionInputPayloadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("contribution"),
    text: z.string().min(1),
  }).strict(),
  z.object({
    kind: z.literal("control"),
    command: z.enum(["pause", "resume", "stop", "approve-effect"]),
  }).strict(),
]);

export const MissionInputDraftSchema = z.object({
  id: z.string().min(1),
  actorRef: z.string().min(1),
  sourceRef: z.string().min(1),
  payload: MissionInputPayloadSchema,
}).strict();

export const MissionInputEventDataSchema = z.object({
  inputId: z.string().min(1),
  watermark: z.number().int().positive(),
  actorRef: z.string().min(1),
  sourceRef: z.string().min(1),
  payload: MissionInputPayloadSchema,
  payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

export const MissionInputReceiptSchema = MissionInputEventDataSchema.extend({
  eventId: z.string().min(1),
  at: z.string().min(1),
}).strict();

export type MissionInputPayload = z.infer<typeof MissionInputPayloadSchema>;
export type MissionInputDraft = z.infer<typeof MissionInputDraftSchema>;
export type MissionInputEventData = z.infer<typeof MissionInputEventDataSchema>;
export type MissionInputReceipt = z.infer<typeof MissionInputReceiptSchema>;

/** Source boundary for ordered Mission input. Appending does not itself prove actor authority. */
export interface MissionInputLog {
  appendInput(missionId: string, input: MissionInputDraft): Promise<MissionInputReceipt>;
  currentInputWatermark(missionId: string): Promise<number>;
  readInputsAfter(missionId: string, watermark: number): Promise<readonly MissionInputReceipt[]>;
}
