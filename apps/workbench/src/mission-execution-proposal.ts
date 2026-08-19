import { createHash } from "node:crypto";
import { z } from "zod";

const nonempty = z.string().min(1);
const missionId = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const digest = z.string().regex(/^[0-9a-f]{64}$/);
const replyKey = z.string()
  .min(1)
  .max(24)
  .regex(/^[A-Z0-9][A-Z0-9_-]*$/, "reply key must use uppercase letters, digits, underscores, or hyphens");
const relativeWriteScope = nonempty.refine(
  (value) => value === "." || isSafeRelativePath(value),
  "write path must be relative and cannot traverse to a parent",
);
const relativeReadScope = nonempty.refine(
  (value) => isSafeRelativePath(value),
  "read path must be a specific relative path and cannot traverse to a parent",
);
const relativeExcludeScope = nonempty.refine(
  (value) => isSafeRelativePath(value),
  "excluded path must be relative and cannot traverse to a parent",
);

const uniqueNonemptyList = z.array(nonempty).min(1).superRefine((values, context) => {
  if (new Set(values).size !== values.length) {
    context.addIssue({ code: "custom", message: "values must be unique" });
  }
});

const uniqueReadPaths = z.array(relativeReadScope).min(1).superRefine((values, context) => {
  if (new Set(values).size !== values.length) {
    context.addIssue({ code: "custom", message: "read paths must be unique" });
  }
});
const uniqueExcludePaths = z.array(relativeExcludeScope).min(1).superRefine((values, context) => {
  if (new Set(values).size !== values.length) {
    context.addIssue({ code: "custom", message: "excluded paths must be unique" });
  }
});
const uniqueWritePaths = z.array(relativeWriteScope).min(1).superRefine((values, context) => {
  if (new Set(values).size !== values.length) {
    context.addIssue({ code: "custom", message: "write paths must be unique" });
  }
});
const positiveInteger = z.number().int().positive();

const PendingDecisionSchema = z.object({
  id: missionId,
  label: nonempty,
  proposal: nonempty,
  status: z.literal("pending"),
  options: z.array(z.object({
    replyKey,
    label: nonempty,
    immediateResult: nonempty,
    tradeoff: nonempty,
  }).strict()).min(2).max(4).superRefine((options, context) => {
    const keys = options.map((option) => option.replyKey);
    if (new Set(keys).size !== keys.length) {
      context.addIssue({ code: "custom", message: "decision option reply keys must be unique" });
    }
    const labels = options.map((option) => option.label);
    if (new Set(labels).size !== labels.length) {
      context.addIssue({ code: "custom", message: "decision option labels must be unique" });
    }
  }),
  compactReplyKey: replyKey,
}).strict().superRefine((decision, context) => {
  if (!decision.options.some((option) => option.replyKey === decision.compactReplyKey)) {
    context.addIssue({
      code: "custom",
      path: ["compactReplyKey"],
      message: "compact reply key must name one declared decision option",
    });
  }
});

const CandidateWorktreeSchema = z.object({
  rootRef: nonempty.regex(
    /^environment:[A-Z][A-Z0-9_]*$/,
    "candidate worktree rootRef must name an environment-owned variable",
  ),
  binding: z.literal("operator-selected-at-launch"),
}).strict();

const ExternalProviderSchema = z.object({
  name: nonempty,
  boundary: z.literal("external"),
}).strict();

const ExternalDisclosureSchema = z.object({
  dataCategories: uniqueNonemptyList,
}).strict();

const MissionExecutionScopeV1Schema = z.object({
  writePaths: uniqueWritePaths,
  commands: z.tuple([]),
}).strict();

const MissionExecutionScopeV2Schema = z.object({
  readPaths: uniqueReadPaths,
  excludePaths: uniqueExcludePaths,
  writePaths: uniqueWritePaths,
  commands: z.tuple([]),
}).strict();

const MissionExecutionBudgetSchema = z.object({
  parent: z.object({
    maxModelSteps: positiveInteger,
    maxOutputTokensPerStep: positiveInteger,
  }).strict(),
  delegatedCell: z.object({
    maxSteps: positiveInteger,
    maxOutputTokensPerStep: positiveInteger,
    maxDurationMs: positiveInteger,
  }).strict(),
  estimatedTokens: positiveInteger,
  estimatedTokensSemantics: z.literal("forecast-only-not-stop-condition"),
}).strict();

const MissionExecutionAuthoritySchema = z.object({
  externalDisclosure: z.literal("withheld"),
  budgetRelease: z.literal("withheld"),
  write: z.literal("withheld"),
  execute: z.literal("withheld"),
  commit: z.literal("withheld"),
  merge: z.literal("withheld"),
  publish: z.literal("withheld"),
}).strict();

const MissionExecutionProposalCommonShape = {
  proposalId: missionId,
  mode: z.literal("supervised"),
  status: z.literal("awaiting-principal-authorization"),
  runtimeRef: nonempty,
  runtimeDigest: digest,
  externalProvider: ExternalProviderSchema,
  externalDisclosure: ExternalDisclosureSchema,
  candidateWorktree: CandidateWorktreeSchema,
  budget: MissionExecutionBudgetSchema,
  authority: MissionExecutionAuthoritySchema,
  pendingDecisions: z.array(PendingDecisionSchema).min(1).superRefine((decisions, context) => {
    const ids = decisions.map((decision) => decision.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", message: "pending decision IDs must be unique" });
    }
  }),
} as const;

/**
 * A project-local declaration of a possible Mission execution. It remains a
 * proposal until a Principal authorizes it through an authority-bearing
 * protocol; presence in a Mission Record never authorizes execution.
 */
export const MissionExecutionProposalSchema = z.discriminatedUnion("version", [
  z.object({
    version: z.literal("mission-execution-proposal.v1"),
    ...MissionExecutionProposalCommonShape,
    scope: MissionExecutionScopeV1Schema,
  }).strict(),
  z.object({
    version: z.literal("mission-execution-proposal.v2"),
    ...MissionExecutionProposalCommonShape,
    scope: MissionExecutionScopeV2Schema,
  }).strict(),
]);

export type MissionExecutionProposal = z.infer<typeof MissionExecutionProposalSchema>;

export type MissionExecutionProposalProjection = MissionExecutionProposal & {
  readonly proposalDigest: string;
};

export const MissionExecutionBoundarySchema = z.object({
  runtimeRef: nonempty,
  runtimeDigest: digest,
  externalProvider: ExternalProviderSchema,
  externalDisclosure: ExternalDisclosureSchema,
  candidateWorktree: CandidateWorktreeSchema,
  scope: z.union([
    MissionExecutionScopeV1Schema,
    MissionExecutionScopeV2Schema,
  ]),
  budget: MissionExecutionBudgetSchema,
}).strict();

/**
 * Bind later authorization to the complete proposal rather than to a display
 * label or mutable Mission file. Object key order is non-semantic, while array
 * order remains part of the declared proposal.
 */
export function missionExecutionProposalDigest(proposal: MissionExecutionProposal): string {
  const validated = MissionExecutionProposalSchema.parse(proposal);
  return createHash("sha256")
    .update(JSON.stringify(canonical(validated)))
    .digest("hex");
}

function isSafeRelativePath(value: string): boolean {
  if (value.startsWith("/") || value.includes("\\") || value.includes("\0")) return false;
  return value.split("/").every((part) => part.length > 0 && part !== "." && part !== "..");
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonical(entry)]),
    );
  }
  return value;
}
