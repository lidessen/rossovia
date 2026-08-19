import { isAbsolute } from "node:path";
import { z } from "zod";
import { WorkbenchTaskExecutionContextRefSchema } from "./task-execution-context";

const nonempty = z.string().refine((value) => value.trim().length > 0, "must be a non-empty string");
const sha256 = z.string().regex(/^[0-9a-f]{64}$/);
const relativeEvidenceRef = nonempty.refine(
  (value) =>
    !isAbsolute(value)
    && value.split(/[\\/]/u).every((segment) =>
      segment.length > 0 && segment !== "." && segment !== ".."
    ),
  "must be a normalized relative evidence reference",
);

export const ManifestSchema = z.object({
  version: z.literal("rosso.home.v1"),
  namespace: z.literal("rosso"),
  createdAt: nonempty,
}).passthrough();

export const ProjectSchema = z.object({
  id: nonempty,
  repository: nonempty,
  aliases: z.array(nonempty).min(1),
}).passthrough();

export const ProjectsSchema = z.object({
  version: z.literal("rosso.projects.v1"),
  projects: z.array(ProjectSchema),
}).passthrough();

export const WorkspaceSchema = z.object({
  projectId: nonempty,
  path: nonempty,
}).passthrough();

export const WorkspacesSchema = z.object({
  version: z.literal("rosso.workspaces.v1"),
  workspaces: z.array(WorkspaceSchema),
}).passthrough();

export const RootsSchema = z.object({
  version: z.literal("rosso.roots.v1"),
  roots: z.array(nonempty),
}).passthrough();

export const WorkspaceIndexEntrySchema = z.object({
  path: nonempty,
  repository: nonempty.nullable(),
  aliases: z.array(nonempty).min(1),
}).passthrough();

export const WorkspaceIndexSchema = z.object({
  version: z.literal("rosso.workspace-index.v1"),
  generatedAt: nonempty,
  entries: z.array(WorkspaceIndexEntrySchema),
}).passthrough();

export const PreferenceSchema = z.object({
  id: nonempty,
  statement: nonempty,
  source: z.literal("user-explicit"),
  recordedAt: nonempty,
  updatedAt: nonempty,
  projectId: nonempty.optional(),
  reopenWhen: nonempty.optional(),
}).strict();

export const PreferencesSchema = z.object({
  version: z.literal("rosso.preferences.v1"),
  preferences: z.array(PreferenceSchema),
}).passthrough();

export const PrincipalTaskBindingSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("independent"),
  }).strict(),
  z.object({
    kind: z.literal("project-context"),
    projectId: nonempty,
    worktreePath: nonempty.optional(),
    missionId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/).optional(),
  }).strict(),
]);

export const PrincipalTaskCorrectionDeliverySchema = z.object({
  authorizationId: z.string().uuid(),
  proposalDigest: sha256,
  claimSourceRef: relativeEvidenceRef,
  missionId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  inputId: nonempty,
  inputEventId: nonempty,
  inputWatermark: z.number().int().positive(),
  payloadDigest: sha256,
  recordedAt: z.string().datetime({ offset: true }),
  sourceRef: nonempty,
  deliveredViaRunnerId: nonempty,
}).strict();

export const PrincipalTaskCorrectionSchema = z.object({
  id: nonempty,
  at: nonempty,
  statement: nonempty,
  sourceRef: nonempty,
  deliveries: z.array(PrincipalTaskCorrectionDeliverySchema).default([]),
}).strict();

export const AutonomyEffectVerificationSelectorSchema = z.object({
  kind: z.literal("autonomy-effect-verification.v1"),
  effectId: nonempty,
  verificationEventId: nonempty,
}).strict();

/**
 * The one strict selector for an ordinary Task attempt result: the exact
 * canonical attempt id whose owner-backed attempt/final/settlement evidence
 * family the submission re-verifies. It carries no provider, effect, or
 * verification-event identity because those facts live in the retained
 * attempt evidence, never in a copied runtime claim.
 */
export const OrdinaryAttemptResultSelectorSchema = z.object({
  kind: z.literal("ordinary-attempt-result.v1"),
  attemptId: z.string().uuid(),
}).strict();

export const TaskResultVerificationSelectorSchema = z.discriminatedUnion("kind", [
  AutonomyEffectVerificationSelectorSchema,
  OrdinaryAttemptResultSelectorSchema,
]);

export const PrincipalTaskResultEvidenceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("agent-references-unverified"),
  }).strict(),
  z.object({
    kind: z.literal("runtime-verified-effect"),
    authorizationId: z.string().uuid(),
    selector: AutonomyEffectVerificationSelectorSchema,
  }).strict(),
  z.object({
    kind: z.literal("runtime-verified-attempt"),
    selector: OrdinaryAttemptResultSelectorSchema,
    /** The exact Task revision the attempt ran against and the submission re-verified. */
    taskRevision: z.number().int().positive(),
    /** The exact bound Worktree HEAD the submission verified against. */
    worktreeHead: z.string().regex(/^[0-9a-f]{40}$/),
  }).strict(),
]);

/**
 * The reviewer-supplied independence context for a result review. Workbench
 * never derives independence from a reviewer name, model/session identity, or
 * evidence references; it retains only this explicit declaration and its
 * source identity, and the projection labels a declared unproven review as
 * `independence-unproven`.
 */
export const PrincipalTaskResultReviewIndependenceSchema = z.object({
  basis: z.enum(["independent-review-context", "unproven"]),
  sourceRef: nonempty,
}).strict();

/**
 * A review candidate located by one full Git commit. The first version supports
 * only commit-locatable candidates; freshness compares the task's currently
 * bound observed Worktree HEAD against this commit.
 */
export const PrincipalTaskResultReviewCandidateSchema = z.object({
  kind: z.literal("git-commit"),
  commit: z.string().regex(/^[0-9a-f]{40}$/),
}).strict();

export const PrincipalTaskResultReviewSchema = z.object({
  id: nonempty,
  reviewedAt: nonempty,
  resultClaimId: nonempty,
  producerAttemptId: nonempty.optional(),
  reviewerRef: nonempty,
  independence: PrincipalTaskResultReviewIndependenceSchema,
  candidate: PrincipalTaskResultReviewCandidateSchema,
  verdict: z.enum(["passed", "failed"]),
  findings: z.array(nonempty).min(1),
  evidenceRefs: z.array(nonempty).min(1),
}).strict();

export const PrincipalTaskResultClaimSchema = z.object({
  id: nonempty,
  submittedAt: nonempty,
  summary: nonempty,
  evidenceRefs: z.array(nonempty).min(1),
  evidence: PrincipalTaskResultEvidenceSchema.default({
    kind: "agent-references-unverified",
  }),
  sourceRef: nonempty,
  standing: z.enum(["submitted", "accepted", "superseded"]),
  reviews: z.array(PrincipalTaskResultReviewSchema).default([]),
  resolution: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("accepted"),
      at: nonempty,
      sourceRef: nonempty,
      acceptanceBoundary: z.literal("workbench-local-task-only"),
      basis: z.enum([
        "agent-claim",
        "runtime-verified-effect",
        "runtime-verified-attempt",
      ]).default("agent-claim"),
    }).strict(),
    z.object({
      kind: z.literal("superseded"),
      at: nonempty,
      reason: z.enum(["correction", "reopen"]),
    }).strict(),
  ]).nullable(),
}).strict().superRefine((claim, context) => {
  const expectedResolution = claim.standing === "accepted"
    ? "accepted"
    : claim.standing === "superseded"
      ? "superseded"
      : null;
  const observedResolution = claim.resolution === null ? null : claim.resolution.kind;
  if (observedResolution !== expectedResolution) {
    context.addIssue({
      code: "custom",
      path: ["resolution"],
      message: `result claim standing ${claim.standing} requires ${expectedResolution ?? "no"} resolution`,
    });
  }
  const reviewIds = new Set<string>();
  for (const review of claim.reviews) {
    if (review.resultClaimId !== claim.id) {
      context.addIssue({
        code: "custom",
        path: ["reviews"],
        message: `result review ${review.id} binds claim ${review.resultClaimId}, not its owner claim ${claim.id}`,
      });
    }
    const reviewKey = review.id.toLowerCase();
    if (reviewIds.has(reviewKey)) {
      context.addIssue({
        code: "custom",
        path: ["reviews"],
        message: `duplicate result review id: ${review.id}`,
      });
    }
    reviewIds.add(reviewKey);
  }
});

export const PrincipalTaskExecutionLinkSchema = z.object({
  authorizationId: z.string().uuid(),
  proposalDigest: sha256,
  claimSourceRef: relativeEvidenceRef,
  taskContext: WorkbenchTaskExecutionContextRefSchema.optional(),
  linkedAt: z.string().datetime({ offset: true }),
  sourceRef: nonempty,
}).strict();

export const PrincipalTaskWorktreeRebindingSchema = z.object({
  fromWorktreePath: nonempty,
  toWorktreePath: nonempty,
  reboundAt: z.string().datetime({ offset: true }),
  sourceRef: nonempty,
}).strict();

export const PrincipalTaskSchema = z.object({
  id: nonempty,
  title: nonempty,
  objective: nonempty,
  acceptance: z.array(nonempty).min(1),
  /** Ordinary work todos supplied by the Principal at creation; older tasks default to an empty list. */
  todos: z.array(nonempty).default([]),
  origin: z.object({
    kind: z.literal("principal-explicit"),
    sourceRef: nonempty,
  }).strict(),
  binding: PrincipalTaskBindingSchema,
  lifecycle: z.enum(["open", "in-progress", "waiting", "verifying", "settled"]),
  nextActor: z.enum(["principal", "agent", "external", "none"]),
  revision: z.number().int().positive(),
  corrections: z.array(PrincipalTaskCorrectionSchema),
  resultClaims: z.array(PrincipalTaskResultClaimSchema),
  executionLinks: z.array(PrincipalTaskExecutionLinkSchema).default([]),
  worktreeRebindings: z.array(PrincipalTaskWorktreeRebindingSchema).optional(),
  createdAt: nonempty,
  updatedAt: nonempty,
}).strict().superRefine((task, context) => {
  const submitted = task.resultClaims.filter((claim) => claim.standing === "submitted");
  if (submitted.length > 1) {
    context.addIssue({
      code: "custom",
      path: ["resultClaims"],
      message: "a task may retain at most one submitted result claim",
    });
  }
  if (task.lifecycle === "verifying") {
    if (task.nextActor !== "principal") {
      context.addIssue({
        code: "custom",
        path: ["nextActor"],
        message: "a verifying task must return to the Principal",
      });
    }
    if (submitted.length !== 1) {
      context.addIssue({
        code: "custom",
        path: ["resultClaims"],
        message: "a verifying task requires one submitted result claim",
      });
    }
  } else if (submitted.length !== 0) {
    context.addIssue({
      code: "custom",
      path: ["resultClaims"],
      message: "a submitted result claim requires verifying lifecycle",
    });
  }
  if (task.lifecycle === "settled") {
    if (task.nextActor !== "none") {
      context.addIssue({
        code: "custom",
        path: ["nextActor"],
        message: "a settled task has no next actor",
      });
    }
    if (task.resultClaims.at(-1)?.standing !== "accepted") {
      context.addIssue({
        code: "custom",
        path: ["resultClaims"],
        message: "a settled task requires its latest result claim to be locally accepted",
      });
    }
  } else if (task.nextActor === "none") {
    context.addIssue({
      code: "custom",
      path: ["nextActor"],
      message: "an unsettled task requires a next actor",
    });
  }
});

export const PrincipalTasksSchema = z.object({
  version: z.literal("rosso.principal-tasks.v1"),
  sourceRevision: z.number().int().nonnegative(),
  tasks: z.array(PrincipalTaskSchema),
}).strict();

export const PreferenceReceiptSchema = z.object({
  version: z.literal("rosso.preference-receipt.v2"),
  at: nonempty,
  action: z.enum(["set", "retire"]),
  id: nonempty,
  projectId: nonempty.nullable(),
  recordDigest: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();

export const SetupSelectionEntrySchema = z.object({
  module: z.literal("multi-agent-delegation"),
  harness: z.literal("codex"),
}).strict();

export const SetupSelectionSchema = z.object({
  version: z.literal("rosso.setup-selection.v1"),
  selections: z.array(SetupSelectionEntrySchema),
}).strict();

export const SetupReceiptSchema = z.object({
  version: z.literal("rosso.setup-receipt.v1"),
  module: z.literal("multi-agent-delegation"),
  harness: z.literal("codex"),
  sourceRevision: nonempty,
  sourceRoot: nonempty,
  projectionPath: nonempty,
  projectionDigest: z.string().regex(/^[0-9a-f]{64}$/),
  appliedAt: nonempty,
  rollbackPath: nonempty.nullable(),
}).strict();

export type Project = z.infer<typeof ProjectSchema>;
export type Projects = z.infer<typeof ProjectsSchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;
export type Preference = z.infer<typeof PreferenceSchema>;
export type PrincipalTask = z.infer<typeof PrincipalTaskSchema>;
export type PrincipalTaskBinding = z.infer<typeof PrincipalTaskBindingSchema>;
export type PrincipalTaskCorrection = z.infer<typeof PrincipalTaskCorrectionSchema>;
export type PrincipalTaskCorrectionDelivery = z.infer<
  typeof PrincipalTaskCorrectionDeliverySchema
>;
export type AutonomyEffectVerificationSelector = z.infer<
  typeof AutonomyEffectVerificationSelectorSchema
>;
export type OrdinaryAttemptResultSelector = z.infer<
  typeof OrdinaryAttemptResultSelectorSchema
>;
export type TaskResultVerificationSelector = z.infer<
  typeof TaskResultVerificationSelectorSchema
>;
export type PrincipalTaskResultEvidence = z.infer<
  typeof PrincipalTaskResultEvidenceSchema
>;
export type PrincipalTaskResultReview = z.infer<
  typeof PrincipalTaskResultReviewSchema
>;
export type PrincipalTaskResultClaim = z.infer<typeof PrincipalTaskResultClaimSchema>;
export type PrincipalTaskExecutionLink = z.infer<typeof PrincipalTaskExecutionLinkSchema>;
export type PrincipalTaskWorktreeRebinding = z.infer<
  typeof PrincipalTaskWorktreeRebindingSchema
>;
export type PrincipalTasks = z.infer<typeof PrincipalTasksSchema>;
export type PreferenceReceipt = z.infer<typeof PreferenceReceiptSchema>;
export type SetupSelection = z.infer<typeof SetupSelectionSchema>;
export type SetupSelectionEntry = z.infer<typeof SetupSelectionEntrySchema>;
export type SetupReceipt = z.infer<typeof SetupReceiptSchema>;
export type Roots = z.infer<typeof RootsSchema>;
export type Workspace = z.infer<typeof WorkspaceSchema>;
export type Workspaces = z.infer<typeof WorkspacesSchema>;
export type WorkspaceIndex = z.infer<typeof WorkspaceIndexSchema>;

export interface WorkspaceObservation {
  path: string;
  origin: string | null;
  head: string | null;
  branch: string | null;
  dirty: boolean;
  status: string[];
  instructionFiles: string[];
  orientationFiles: string[];
}

export interface Resolution {
  version: "rosso.resolution.v1";
  query: string;
  registration: "registered" | "discovered";
  project: Project | { id: null; repository: string | null; aliases: string[] };
  workspace: WorkspaceObservation;
}

export interface ProjectListEntry {
  project: Project;
  status: "available" | "unverified";
  workspace: WorkspaceObservation | { path: string } | null;
  error?: string;
}

export interface ProjectList {
  version: "rosso.project-list.v1";
  complete: boolean;
  projects: ProjectListEntry[];
}
