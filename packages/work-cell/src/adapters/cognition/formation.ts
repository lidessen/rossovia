import { z } from "zod";
import { CognitionFormationJsonSchema } from "@atthis/cognition";
import { CellInputSchema, type CellInput } from "../../contracts";

const SlotSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("source"), role: z.string().min(1) }).strict(),
  z.object({ type: z.literal("artifact"), role: z.string().min(1), stage: z.string().min(1) }).strict(),
]);

const InputSchema = z.object({
  type: z.enum(["source", "artifact"]),
  id: z.string().min(1),
  title: z.string().min(1),
  locator: z.string().min(1),
  content: z.string().min(1),
  authority: z.string().min(1),
  status: z.string().min(1),
}).strict();

export const CognitionFormationRequestSchema = z.object({
  id: z.string().min(1),
  workspaceRoot: z.string().min(1),
  scheme: z.object({ id: z.string().min(1), revision: z.string().min(1), title: z.string().min(1) }).strict(),
  move: z.object({
    id: z.string().min(1),
    purpose: z.string().min(1),
    outputStage: z.string().min(1),
    inputs: z.array(SlotSchema).min(1),
  }).strict(),
  inputs: z.array(InputSchema).min(1),
  budget: z.object({
    maxSteps: z.number().int().positive().default(3),
    estimatedTokens: z.number().int().positive().optional(),
    maxDurationMs: z.number().int().positive().default(120_000),
    maxCommandOutputBytes: z.number().int().positive().default(16_000),
  }).strict().optional(),
}).strict().superRefine((request, context) => {
  if (request.move.inputs.length !== request.inputs.length) {
    context.addIssue({ code: "custom", path: ["inputs"], message: "inputs must match the formation move slots" });
    return;
  }
  for (const [index, slot] of request.move.inputs.entries()) {
    if (slot.type !== request.inputs[index]?.type) {
      context.addIssue({ code: "custom", path: ["inputs", index, "type"], message: `expected ${slot.type}` });
    }
  }
});

export type CognitionFormationRequest = z.infer<typeof CognitionFormationRequestSchema>;

export function prepareCognitionFormation(unparsed: unknown): CellInput {
  const request = CognitionFormationRequestSchema.parse(unparsed);
  const slotSummary = request.move.inputs.map((slot, index) => {
    const stage = slot.type === "artifact" ? ` at stage ${slot.stage}` : "";
    return `${index + 1}. ${slot.type}${stage}, role: ${slot.role}`;
  }).join("\n");
  return CellInputSchema.parse({
    id: request.id,
    intent: `Attempt formation move ${request.move.id} into stage ${request.move.outputStage}.`,
    workspace: { root: request.workspaceRoot, readPaths: [], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: [
      `Work only within formation scheme ${request.scheme.id}@${request.scheme.revision} (${request.scheme.title}).`,
      `The move purpose is: ${request.move.purpose}`,
      `Interpret the supplied inputs by their declared roles:\n${slotSummary}`,
      "Form the target cognition from the inputs together. Preserve disagreements, uncertainty, source authority, and limits instead of flattening them.",
      "A justified no-proposal is correct when the move cannot be completed from these inputs. Do not invent missing material or silently perform another move.",
      "Return only candidate content for this move. You cannot choose the scheme, change stages, admit an artifact, or execute the resulting guidance.",
    ],
    context: request.inputs.map((input, index) => ({
      id: input.id,
      title: `${index + 1}. ${input.title}`,
      content: `Type: ${input.type}\nAuthority: ${input.authority}\nStatus: ${input.status}\n\n${input.content}`,
      sources: [input.locator],
    })),
    acceptance: [
      `Every proposal is a ${request.move.outputStage} result of move ${request.move.id}, not an arbitrary summary.`,
      "Every proposal uses all declared input roles or explains why formation is not possible.",
      "Limitations expose missing evidence, unresolved conflict, and conditions that could revise the result.",
      "No proposal claims admission, execution, or authority beyond its inputs.",
    ],
    outputSchema: CognitionFormationJsonSchema,
    budget: request.budget ?? { maxSteps: 3, maxDurationMs: 120_000, maxCommandOutputBytes: 16_000 },
  });
}
