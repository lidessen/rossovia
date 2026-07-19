import { z } from "zod";
import { proposeCognitiveArtifact } from "./store";
import type { FormationInput } from "./contracts";

export const CognitionFormationVersion = "atthis.cognition-formation.v1" as const;

export const CognitionFormationResultSchema = z.object({
  version: z.literal(CognitionFormationVersion),
  disposition: z.enum(["propose", "no-proposal"]),
  rationale: z.string().trim().min(1),
  proposals: z.array(z.object({
    title: z.string().trim().min(1),
    body: z.string().trim().min(1),
    limitations: z.array(z.string().trim().min(1)),
    tags: z.array(z.string().trim().min(1)),
    formationRationale: z.string().trim().min(1),
  }).strict()),
}).strict().superRefine((result, context) => {
  if (result.disposition === "no-proposal" && result.proposals.length !== 0) {
    context.addIssue({ code: "custom", path: ["proposals"], message: "no-proposal must not retain proposals" });
  }
  if (result.disposition === "propose" && result.proposals.length === 0) {
    context.addIssue({ code: "custom", path: ["proposals"], message: "propose requires at least one proposal" });
  }
});

export const CognitionFormationJsonSchema = z.toJSONSchema(CognitionFormationResultSchema);
export type CognitionFormationResult = z.infer<typeof CognitionFormationResultSchema>;

export async function retainFormationProposals(
  home: string,
  unparsedResult: unknown,
  formation: {
    scheme: { id: string; revision: string };
    moveId: string;
    inputs: FormationInput[];
    actor: string;
  },
) {
  const result = CognitionFormationResultSchema.parse(unparsedResult);
  if (result.disposition === "no-proposal") return [];
  const retained = [];
  for (const proposal of result.proposals) {
    retained.push(await proposeCognitiveArtifact(home, {
      scheme: formation.scheme,
      moveId: formation.moveId,
      inputs: formation.inputs,
      actor: formation.actor,
      title: proposal.title,
      body: proposal.body,
      limitations: proposal.limitations,
      tags: proposal.tags,
      rationale: proposal.formationRationale,
    }));
  }
  return retained;
}
