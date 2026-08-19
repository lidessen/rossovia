import { z } from "zod";

export const MISSION_ANCHOR_SEED_VERSION =
  "rosso.mission-anchor-seed.v1" as const;

export const ActiveIntentAnchorSchema = z.object({
  id: z.string().min(1),
  revision: z.string().min(1),
  statement: z.string().min(1),
  sourceRefs: z.array(z.string().min(1)).min(1),
  reconciledWatermark: z.number().int().nonnegative(),
}).strict();

export const MissionAnchorSeedSchema = z.object({
  version: z.literal(MISSION_ANCHOR_SEED_VERSION),
  id: z.string().min(1),
  missionId: z.string().min(1),
  authorityRef: z.string().min(1),
  sourceRef: z.string().min(1),
  anchor: ActiveIntentAnchorSchema,
}).strict().superRefine((value, context) => {
  if (value.anchor.reconciledWatermark !== 0) {
    context.addIssue({
      code: "custom",
      path: ["anchor", "reconciledWatermark"],
      message: "an initial Mission anchor must start at watermark 0",
    });
  }
});

export const MissionAnchorSeedEventDataSchema = z.object({
  seedDigest: z.string().regex(/^[a-f0-9]{64}$/),
  seed: MissionAnchorSeedSchema,
}).strict();

export type ActiveIntentAnchor = z.infer<typeof ActiveIntentAnchorSchema>;
export type MissionAnchorSeed = z.infer<typeof MissionAnchorSeedSchema>;
