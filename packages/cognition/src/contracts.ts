import { z } from "zod";

export const ManifestVersion = "atthis.cognition-home.v1" as const;
export const SourceVersion = "atthis.cognition-source.v1" as const;
export const SchemeVersion = "atthis.cognition-scheme.v1" as const;
export const ArtifactVersion = "atthis.cognitive-artifact.v1" as const;
export const CatalogVersion = "atthis.cognition-catalog.v1" as const;

const Nonempty = z.string().trim().min(1);
const Sha256 = z.string().regex(/^[a-f0-9]{64}$/, "expected a lowercase SHA-256 digest");

export const CognitionManifestSchema = z.object({
  version: z.literal(ManifestVersion),
  createdAt: z.string().datetime({ offset: true }),
});

export const SourceRecordSchema = z.object({
  version: z.literal(SourceVersion),
  id: Nonempty,
  kind: Nonempty,
  locator: Nonempty,
  capturedAt: z.string().datetime({ offset: true }),
  contentPath: Nonempty,
  contentSha256: Sha256,
  predecessorId: Nonempty.optional(),
  metadata: z.record(z.string(), z.unknown()),
});

export const SourceIngressSchema = z.object({
  kind: Nonempty,
  locator: Nonempty,
  content: z.string(),
  predecessorId: Nonempty.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  actor: Nonempty,
}).strict();

export const FormationStageSchema = z.object({
  id: Nonempty,
  purpose: Nonempty,
}).strict();

export const FormationInputSlotSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("source"), role: Nonempty }).strict(),
  z.object({ type: z.literal("artifact"), role: Nonempty, stage: Nonempty }).strict(),
]);

export const FormationMoveSchema = z.object({
  id: Nonempty,
  purpose: Nonempty,
  inputs: z.array(FormationInputSlotSchema).min(1),
  outputStage: Nonempty,
}).strict();

export const FormationSchemeDefinitionSchema = z.object({
  id: Nonempty,
  revision: Nonempty,
  title: Nonempty,
  stages: z.array(FormationStageSchema).min(1),
  moves: z.array(FormationMoveSchema).min(1),
}).strict().superRefine((scheme, context) => {
  const stageIds = new Set<string>();
  for (const [index, stage] of scheme.stages.entries()) {
    if (stageIds.has(stage.id)) context.addIssue({ code: "custom", path: ["stages", index, "id"], message: "duplicate stage id" });
    stageIds.add(stage.id);
  }
  const moveIds = new Set<string>();
  for (const [index, move] of scheme.moves.entries()) {
    if (moveIds.has(move.id)) context.addIssue({ code: "custom", path: ["moves", index, "id"], message: "duplicate move id" });
    moveIds.add(move.id);
    if (!stageIds.has(move.outputStage)) {
      context.addIssue({ code: "custom", path: ["moves", index, "outputStage"], message: "unknown output stage" });
    }
    for (const [inputIndex, input] of move.inputs.entries()) {
      if (input.type === "artifact" && !stageIds.has(input.stage)) {
        context.addIssue({ code: "custom", path: ["moves", index, "inputs", inputIndex, "stage"], message: "unknown artifact input stage" });
      }
    }
  }
});

export const FormationSchemeSchema = z.object({
  version: z.literal(SchemeVersion),
  definition: FormationSchemeDefinitionSchema,
  registeredAt: z.string().datetime({ offset: true }),
  registration: z.object({ actor: Nonempty, basis: Nonempty }).strict(),
}).strict();

export const FormationInputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("source"), id: Nonempty, locator: Nonempty.optional() }).strict(),
  z.object({ type: z.literal("artifact"), id: Nonempty }).strict(),
]);

export const CognitiveArtifactSchema = z.object({
  version: z.literal(ArtifactVersion),
  id: Nonempty,
  scheme: z.object({ id: Nonempty, revision: Nonempty }).strict(),
  stage: Nonempty,
  title: Nonempty,
  body: Nonempty,
  limitations: z.array(Nonempty),
  tags: z.array(Nonempty),
  status: z.enum(["proposed", "active", "superseded"]),
  formation: z.object({
    moveId: Nonempty,
    rationale: Nonempty,
    inputs: z.array(FormationInputSchema).min(1),
  }).strict(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  admission: z.object({
    actor: Nonempty,
    admittedAt: z.string().datetime({ offset: true }),
    basis: Nonempty,
  }).strict().optional(),
  supersession: z.object({
    replacementId: Nonempty,
    actor: Nonempty,
    at: z.string().datetime({ offset: true }),
    basis: Nonempty,
  }).strict().optional(),
}).strict().superRefine((artifact, context) => {
  if (artifact.status === "active" && !artifact.admission) {
    context.addIssue({ code: "custom", path: ["admission"], message: "active cognition requires an admission record" });
  }
  if (artifact.status === "proposed" && artifact.admission) {
    context.addIssue({ code: "custom", path: ["admission"], message: "proposed cognition cannot already be admitted" });
  }
  if (artifact.status === "proposed" && artifact.supersession) {
    context.addIssue({ code: "custom", path: ["supersession"], message: "proposed cognition cannot be superseded" });
  }
  if (artifact.status === "superseded" && (!artifact.admission || !artifact.supersession)) {
    context.addIssue({ code: "custom", path: ["supersession"], message: "superseded cognition requires its admission and replacement record" });
  }
});

export const CatalogEntrySchema = z.object({
  id: Nonempty,
  schemeId: Nonempty,
  schemeRevision: Nonempty,
  stage: Nonempty,
  title: Nonempty,
  body: Nonempty,
  tags: z.array(Nonempty),
  status: z.enum(["proposed", "active", "superseded"]),
  updatedAt: z.string().datetime({ offset: true }),
});

export const CatalogSchema = z.object({
  version: z.literal(CatalogVersion),
  generatedAt: z.string().datetime({ offset: true }),
  entries: z.array(CatalogEntrySchema),
});

export const CognitionEventSchema = z.object({
  version: z.literal("atthis.cognition-event.v1"),
  id: Nonempty,
  at: z.string().datetime({ offset: true }),
  actor: Nonempty,
  type: z.enum(["scheme.registered", "source.captured", "artifact.proposed", "artifact.admitted", "artifact.used", "artifact.superseded"]),
  targetId: Nonempty,
  data: z.record(z.string(), z.unknown()),
});

export type FormationSchemeDefinition = z.infer<typeof FormationSchemeDefinitionSchema>;
export type FormationScheme = z.infer<typeof FormationSchemeSchema>;
export type FormationInput = z.infer<typeof FormationInputSchema>;
export type CognitiveArtifact = z.infer<typeof CognitiveArtifactSchema>;
export type CatalogEntry = z.infer<typeof CatalogEntrySchema>;
export type Catalog = z.infer<typeof CatalogSchema>;
export type SourceRecord = z.infer<typeof SourceRecordSchema>;

export type SourceInput = {
  kind: string;
  locator: string;
  content: Uint8Array;
  metadata?: Record<string, unknown>;
  predecessorId?: string;
  actor: string;
};

export type ArtifactProposal = {
  scheme: { id: string; revision: string };
  moveId: string;
  title: string;
  body: string;
  limitations?: string[];
  tags?: string[];
  rationale: string;
  inputs: FormationInput[];
  actor: string;
};
