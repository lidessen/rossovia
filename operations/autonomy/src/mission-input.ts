import { z } from "zod";

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const GitHeadSchema = z.string().regex(/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/);

const RelativeWritePathSchema = z.string().min(1).superRefine((path, context) => {
  const segments = path.split("/");
  if (
    path.includes("\\")
    || path.startsWith("/")
    || /^[A-Za-z]:/u.test(path)
    || segments.some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    context.addIssue({
      code: "custom",
      message: "write path must be a normalized project-relative POSIX path",
    });
  }
});

function requireUniquePaths(
  values: readonly { readonly path: string }[],
  context: z.RefinementCtx,
): void {
  const seen = new Set<string>();
  for (const [index, value] of values.entries()) {
    if (seen.has(value.path)) {
      context.addIssue({
        code: "custom",
        path: [index, "path"],
        message: `duplicate file path: ${value.path}`,
      });
    }
    seen.add(value.path);
  }
}

function requireUniqueStrings(
  values: readonly string[],
  context: z.RefinementCtx,
): void {
  const seen = new Set<string>();
  for (const [index, value] of values.entries()) {
    if (seen.has(value)) {
      context.addIssue({
        code: "custom",
        path: [index],
        message: `duplicate write path: ${value}`,
      });
    }
    seen.add(value);
  }
}

export const MissionCorrectionPayloadSchema = z.object({
  kind: z.literal("correction"),
  correctionId: z.string().min(1),
  instruction: z.string().min(1),
  cause: z.object({
    effectId: z.string().min(1),
    failedReportRef: z.string().min(1),
    failedReportDigest: Sha256Schema,
  }).strict(),
  subject: z.object({
    gitHead: GitHeadSchema,
    files: z.array(z.object({
      path: RelativeWritePathSchema,
      sha256: Sha256Schema,
    }).strict()).min(1).superRefine(requireUniquePaths),
  }).strict(),
  scope: z.object({
    writePaths: z.array(RelativeWritePathSchema).min(1).superRefine(requireUniqueStrings),
    externalDisclosure: z.literal("none"),
  }).strict(),
  plannedVerificationRef: z.string().min(1),
  authority: z.object({
    commit: z.literal("withheld"),
    merge: z.literal("withheld"),
    publish: z.literal("withheld"),
    productAcceptance: z.literal("withheld"),
  }).strict(),
}).strict();

export const MissionInputPayloadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("contribution"),
    text: z.string().min(1),
  }).strict(),
  z.object({
    kind: z.literal("control"),
    command: z.enum(["pause", "resume", "stop", "approve-effect"]),
  }).strict(),
  MissionCorrectionPayloadSchema,
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
export type MissionCorrectionPayload = z.infer<typeof MissionCorrectionPayloadSchema>;
export type MissionInputDraft = z.infer<typeof MissionInputDraftSchema>;
export type MissionInputEventData = z.infer<typeof MissionInputEventDataSchema>;
export type MissionInputReceipt = z.infer<typeof MissionInputReceiptSchema>;

/** Source boundary for ordered Mission input. Appending does not itself prove actor authority. */
export interface MissionInputLog {
  appendInput(missionId: string, input: MissionInputDraft): Promise<MissionInputReceipt>;
  currentInputWatermark(missionId: string): Promise<number>;
  readInputsAfter(missionId: string, watermark: number): Promise<readonly MissionInputReceipt[]>;
}
