import {
  WorkbenchTaskExecutionContextRefSchema,
  type WorkbenchTaskExecutionContextRef,
} from "../task-execution-context";
import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import type { Project } from "../contracts";
import {
  executionAuthorizationClaimPath,
  type ExecutionAuthorizationClaim,
  validateExecutionAuthorizationClaim,
} from "../execution-authorization-claim";
import {
  executionAuthorizationReceiptPath,
  ExecutionAuthorizationReceiptSchema,
  type ExecutionAuthorizationReceipt,
} from "../execution-authorization";
import { loadHome, resolveHome } from "../home";
import {
  missionExecutionProposalDigest,
  MissionExecutionProposalSchema,
  type MissionExecutionProposal,
  type MissionExecutionProposalProjection,
} from "../mission-execution-proposal";
import { expandPath } from "../paths";
import { runCommand } from "../process";
import {
  gitRoot,
  normalizedRepository,
  optionalGit,
  repositoryLocator,
} from "../workspace";

export interface WorkbenchSnapshotOptions {
  readonly home?: string;
  /**
   * Additional local repositories or worktrees the Principal explicitly chose
   * to include. Workbench registrations remain the authority for identity.
   */
  readonly localRepositoryRoots?: readonly string[];
  readonly now?: () => string;
}

export interface WorktreeProjection {
  readonly path: string;
  readonly head: string | null;
  readonly gitBranch: string | null;
  readonly dirty: boolean;
  readonly registeredPrimary: boolean;
  readonly locked: string | null;
  readonly prunable: string | null;
}

export interface MissionBranchProjection {
  readonly id: string;
  readonly parent: string;
  readonly kind: "implementation" | "investigation" | "review" | "correction";
  readonly purpose: string;
  readonly returnCondition: string;
  readonly status: "open" | "integrating" | "suspended" | "closed";
}

export type ExecutionAuthorizationProjection =
  | {
    readonly standing: "awaiting-principal-authorization";
  }
  | {
    readonly standing: "execution-source-not-authorizable";
    readonly reason: string;
    readonly remediation: string;
    readonly sourcePath: string;
  }
  | {
    readonly standing: "invalid-receipt-evidence";
    readonly reason: string;
    readonly remediation: string;
    readonly sourcePath: string;
  }
  | {
    readonly standing: "authorized-awaiting-execution";
    readonly authorizationId: string;
    readonly proposalDigest: string;
    readonly choices: ExecutionAuthorizationReceipt["choices"];
    readonly immediateAuthorizedResults: ExecutionAuthorizationReceipt["immediateAuthorizedResults"];
    readonly authorityBoundary: ExecutionAuthorizationReceipt["authorityBoundary"];
    readonly actorRef: string;
    readonly sourceRef: string;
    readonly attributionBoundary: ExecutionAuthorizationReceipt["attributionBoundary"];
    readonly principalAction: {
      readonly channel: "local-principal-workbench-ui";
      readonly acknowledgements: {
        readonly externalDisclosure: true;
        readonly forecastOnlyBudget: true;
        readonly oneUseLaunchAndIntegrationWithheld: true;
      };
      readonly identityAssurance: "unverified-local-interaction";
    } | null;
    readonly authorizedAt: string;
    readonly sourcePath: string;
  }
  | {
    readonly standing: "authorization-consumed";
    readonly authorizationId: string;
    readonly proposalDigest: string;
    readonly choices: ExecutionAuthorizationReceipt["choices"];
    readonly immediateAuthorizedResults: ExecutionAuthorizationReceipt["immediateAuthorizedResults"];
    readonly authorityBoundary: ExecutionAuthorizationReceipt["authorityBoundary"];
    readonly actorRef: string;
    readonly sourceRef: string;
    readonly attributionBoundary: ExecutionAuthorizationReceipt["attributionBoundary"];
    readonly principalAction: {
      readonly channel: "local-principal-workbench-ui";
      readonly acknowledgements: {
        readonly externalDisclosure: true;
        readonly forecastOnlyBudget: true;
        readonly oneUseLaunchAndIntegrationWithheld: true;
      };
      readonly identityAssurance: "unverified-local-interaction";
    } | null;
    readonly authorizedAt: string;
    readonly sourcePath: string;
    readonly consumption: {
      readonly claimedAt: string;
      readonly candidateWorktree: string;
      readonly candidateHead: string;
      readonly receiptRef: string;
      readonly receiptDigest: string;
      readonly claimSourcePath: string;
      readonly workbenchTaskContext: WorkbenchTaskExecutionContextRef | null;
      readonly evidenceBoundary:
        "proves-one-launch-authorization-consumed-only";
    };
  }
  | {
    readonly standing: "invalid-consumption-evidence";
    readonly reason: string;
    readonly remediation: string;
    readonly sourcePath: string;
  };

export interface MissionProjection {
  readonly id: string;
  readonly title: string;
  readonly sourcePath: string;
  readonly sourceRoot: string;
  readonly mainline: {
    readonly contradiction: string;
    readonly acceptance: readonly string[];
    readonly status: "active" | "settled";
  };
  readonly currentFocus: string;
  /**
   * Mission branches are semantic lines of work. They are deliberately not
   * presented as, or inferred to be, Git branches.
   */
  readonly semanticBranch:
    | { readonly kind: "mainline"; readonly id: "mainline" }
    | {
      readonly kind: "mission-branch";
      readonly id: string;
      readonly branchKind: MissionBranchProjection["kind"];
      readonly status: MissionBranchProjection["status"];
    };
  readonly branches: readonly MissionBranchProjection[];
  /**
   * Git context in which this record was read. This is observation context,
   * not a Mission-to-Git binding.
   */
  readonly observedGitContext: {
    readonly worktreePath: string;
    readonly gitBranch: string | null;
    readonly head: string | null;
    readonly binding: "observation-only";
  };
  /**
   * A project-local proposal is displayed as pending intent only. It does not
   * bind Git state or authorize an execution.
   */
  readonly executionProposal?: MissionExecutionProposalProjection;
  /**
   * Local receipt evidence is joined independently from proposal, runner, and
   * effect state. Authorized standing grants only the receipt's bounded launch.
   */
  readonly authorization?: ExecutionAuthorizationProjection;
}

export interface ProjectProjection {
  readonly projectKey: string;
  readonly registration: "registered" | "observed-unregistered";
  readonly identity: Project | {
    readonly id: null;
    readonly repository: string | null;
    readonly aliases: readonly string[];
  };
  readonly primaryWorkspace: string | null;
  readonly worktrees: readonly WorktreeProjection[];
  readonly missions: readonly MissionProjection[];
}

export type RunnerState =
  | "running"
  | "idle"
  | "anchor-pending"
  | "paused"
  | "input-pending"
  | "interrupted"
  | "mission-stopped"
  | "stopped";

export interface RunnerStatusProjection {
  readonly version: "rosso.mission-runner.v1";
  readonly runnerId: string;
  readonly missionId: string;
  readonly pid: number;
  readonly state: RunnerState;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly inputWatermark: number;
  readonly reconciledWatermark: number;
  readonly runtimeMode?: "none" | "configured" | undefined;
  readonly socketPath: string;
  readonly stopReason: "runner-shutdown" | "mission-stop" | null;
}

export interface RunnerProjection {
  readonly sourcePath: string;
  readonly status: RunnerStatusProjection;
  /**
   * Live servers may join Mission activity onto the cached runner projection.
   * The base snapshot remains valid without it.
   */
  readonly activity?: {
    readonly currentEffect?: CurrentEffectProjection | null;
    readonly [key: string]: unknown;
  };
  readonly freshness: {
    readonly kind: "cached";
    readonly sourceUpdatedAt: string;
    readonly ageMs: number | null;
  };
  readonly binding:
    | {
      readonly kind: "project-mission";
      readonly projectKey: string;
      readonly registeredProjectId: string | null;
      readonly missionId: string;
    }
    | {
      readonly kind: "unbound";
      readonly reason: "no-explicit-mission-id-match" | "ambiguous-mission-id";
    };
}

export interface ProjectionError {
  readonly scope: "home" | "project" | "git" | "mission" | "authorization" | "runner";
  readonly source: string;
  readonly message: string;
}

export interface AttentionItem {
  readonly priority: "principal-decision" | "warning" | "notice";
  readonly code:
    | "runner-interrupted"
    | "runner-input-pending"
    | "runner-anchor-pending"
    | "runner-anchor-migration-decision"
    | "runner-reconciliation-decision"
    | "runner-reconciliation-authorized"
    | "runner-reconciliation-attempt-consumed"
    | "runner-legacy-unanchored"
    | "runner-lineage-unavailable"
    | "runner-idle"
    | "runner-unreachable"
    | "runner-reachability-unverified"
    | "correction-awaiting-system-settlement"
    | "runner-paused"
    | "runner-unbound"
    | "mission-execution-awaiting-authorization"
    | "execution-authorization-invalid"
    | "source-error";
  readonly summary: string;
  readonly projectKey?: string;
  readonly missionId?: string;
  readonly source: string;
}

export interface ProjectionSourceBoundary {
  readonly kind:
    | "registered-project-identity"
    | "workspace-mapping"
    | "git-worktree-observation"
    | "mission-semantic-source"
    | "execution-authorization-receipt"
    | "execution-authorization-claim"
    | "runner-cache";
  readonly source: string;
  readonly authority:
    | "identity"
    | "location"
    | "git-observation"
    | "mission-semantics"
    | "bounded-launch-authorization"
    | "launch-authorization-consumption-evidence"
    | "cached-operation";
  readonly freshness: "configured" | "observed-at-build" | "cached";
}

export interface WorkbenchSnapshot {
  readonly version: "rosso.principal-workbench-snapshot.v1";
  readonly generatedAt: string;
  readonly complete: boolean;
  readonly supervision: {
    readonly mode: "supervised";
    readonly supervisor: "Codex";
    readonly subject: "Rossovia Workbench";
    readonly unsupervised: "unavailable";
  };
  readonly freshness: {
    readonly registration: "loaded-at-build";
    readonly git: "observed-at-build";
    readonly missions: "read-at-build";
    readonly runners: "cached-status-files";
    readonly runnerUpdatedAtRange: {
      readonly oldest: string;
      readonly newest: string;
    } | null;
  };
  readonly sourceBoundaries: readonly ProjectionSourceBoundary[];
  readonly projects: readonly ProjectProjection[];
  readonly runners: readonly RunnerProjection[];
  readonly attention: readonly AttentionItem[];
  readonly errors: readonly ProjectionError[];
}

const nonempty = z.string().min(1);

const MissionBranchSchema = z.object({
  id: nonempty,
  parent: nonempty.optional(),
  kind: z.enum(["implementation", "investigation", "review", "correction"]),
  purpose: nonempty,
  returnCondition: nonempty,
  sources: z.array(nonempty).min(1),
  status: z.enum(["open", "integrating", "suspended", "closed"]),
}).passthrough();

const MissionRecordSchema = z.object({
  version: z.literal("mission-record.v1"),
  id: nonempty,
  title: nonempty,
  sources: z.array(nonempty).min(1),
  createdAt: nonempty,
  updatedAt: nonempty,
  mainline: z.object({
    contradiction: nonempty,
    acceptance: z.array(nonempty).min(1),
    status: z.enum(["active", "settled"]),
  }).passthrough(),
  branches: z.array(MissionBranchSchema),
  currentFocus: nonempty,
  executionProposal: MissionExecutionProposalSchema.optional(),
}).passthrough().superRefine((record, context) => {
  if (record.mainline.status === "settled" && record.executionProposal !== undefined) {
    context.addIssue({
      code: "custom",
      path: ["executionProposal"],
      message: "a settled Mission may not retain a pending execution proposal",
    });
  }
});

const RunnerStatusSchema = z.object({
  version: z.literal("rosso.mission-runner.v1"),
  runnerId: nonempty,
  missionId: nonempty,
  pid: z.number().int().positive(),
  state: z.enum([
    "running",
    "idle",
    "anchor-pending",
    "paused",
    "input-pending",
    "interrupted",
    "mission-stopped",
    "stopped",
  ]),
  startedAt: nonempty,
  updatedAt: nonempty,
  inputWatermark: z.number().int().nonnegative(),
  reconciledWatermark: z.number().int().nonnegative(),
  runtimeMode: z.enum(["none", "configured"]).optional(),
  socketPath: nonempty,
  stopReason: z.enum(["runner-shutdown", "mission-stop"]).nullable(),
}).strict();

const CurrentEffectToolSchema = z.record(z.string(), z.unknown());
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const RelativeEvidenceRefSchema = nonempty.refine(
  (value) =>
    !isAbsolute(value)
    && value.split(/[\\/]/u).every((segment) =>
      segment.length > 0 && segment !== "." && segment !== ".."
    ),
  "must be a normalized relative evidence reference",
);
const LaunchAuthorizationRefProjectionSchema = z.object({
  authorizationId: z.string().uuid(),
  proposalDigest: Sha256Schema,
  claimSourceRef: RelativeEvidenceRefSchema,
}).strict();

export const CurrentVerifiedResultProjectionSchema = z.object({
  standing: z.literal("verified-current"),
  selector: z.object({
    kind: z.literal("autonomy-effect-verification.v1"),
    effectId: nonempty,
    verificationEventId: nonempty,
  }).strict(),
}).strict();

/**
 * A read-only projection of one in-flight or retained writable effect.
 * Tool and verification payloads stay open because their concrete protocol is
 * owned by the executing runtime; the authority boundary is fixed here.
 */
export const CurrentEffectProjectionSchema = z.object({
  effectId: nonempty,
  launchAuthorizationRef: LaunchAuthorizationRefProjectionSchema.optional(),
  phase: nonempty,
  writer: z.union([
    z.object({
      cellId: nonempty,
      runId: nonempty.nullable(),
    }).strict(),
    z.object({ ref: nonempty }).strict(),
  ]),
  source: z.object({
    cellId: nonempty,
    runId: nonempty.nullable(),
  }).strict().optional(),
  workspace: z.object({
    root: nonempty,
    baseHead: nonempty.nullable(),
    baselineClean: z.boolean(),
  }).strict(),
  scope: z.object({
    writePaths: z.array(nonempty),
    allowedCommands: z.array(nonempty),
  }).strict(),
  currentTool: CurrentEffectToolSchema.nullable(),
  recentTools: z.array(CurrentEffectToolSchema),
  diff: z.object({
    changed: z.array(nonempty),
    added: z.array(nonempty),
    removed: z.array(nonempty),
    patchRef: nonempty.nullable(),
    patchDigest: nonempty.nullable(),
    outsideScope: z.array(nonempty),
  }).strict(),
  verification: z.object({
    mechanical: z.unknown(),
    independent: z.unknown(),
    principal: z.unknown(),
  }).strict(),
  authority: z.object({
    commit: z.literal("withheld"),
    merge: z.literal("withheld"),
    publish: z.literal("withheld"),
  }).strict(),
  stale: z.boolean(),
  uncertain: z.boolean(),
}).strict();

export type CurrentEffectProjection = z.infer<typeof CurrentEffectProjectionSchema>;

export const LocalCorrectionProjectionSchema = z.object({
  correctionId: nonempty,
  inputId: nonempty,
  inputEventId: nonempty,
  recordedAt: nonempty,
  actorRef: nonempty,
  sourceRef: nonempty,
  cause: z.object({
    effectId: nonempty,
    failedReportRef: nonempty,
    failedReportDigest: Sha256Schema,
  }).strict(),
  scope: z.object({
    writePaths: z.array(nonempty).min(1),
    externalDisclosure: z.literal("none"),
  }).strict(),
  state: z.enum([
    "recorded",
    "apply-interrupted",
    "apply-uncertain",
    "applied-unverified",
    "verification-passed",
    "verification-failed",
  ]),
  execution: z.object({
    executorRef: nonempty,
    patchRef: nonempty,
    patchDigest: Sha256Schema,
    manifestRef: nonempty,
    manifestDigest: Sha256Schema,
  }).strict().nullable(),
  verification: z.object({
    verifierRef: nonempty,
    verdict: z.enum(["pending", "passed", "failed"]),
    reportRef: nonempty.nullable(),
    reportDigest: Sha256Schema.nullable(),
  }).strict(),
  changedFromFailedSubject: z.array(nonempty),
  authority: z.object({
    commit: z.literal("withheld"),
    merge: z.literal("withheld"),
    publish: z.literal("withheld"),
    productAcceptance: z.literal("withheld"),
  }).strict(),
  stale: z.boolean(),
}).strict().superRefine((correction, context) => {
  const expectedVerdict = correction.state === "verification-passed"
      ? "passed"
      : correction.state === "verification-failed"
        ? "failed"
        : "pending";
  if (correction.verification.verdict !== expectedVerdict) {
    context.addIssue({
      code: "custom",
      path: ["verification", "verdict"],
      message: `state ${correction.state} requires verdict ${expectedVerdict}`,
    });
  }
  const hasReport = correction.verification.reportRef !== null
    && correction.verification.reportDigest !== null;
  if (
    correction.state !== "verification-passed"
    && correction.state !== "verification-failed"
    && (
      correction.verification.reportRef !== null
      || correction.verification.reportDigest !== null
    )
  ) {
    context.addIssue({
      code: "custom",
      path: ["verification"],
      message: "an unverified correction may not claim a verification report",
    });
  }
  if (
    (correction.state === "verification-passed"
      || correction.state === "verification-failed")
    && !hasReport
  ) {
    context.addIssue({
      code: "custom",
      path: ["verification"],
      message: "a verified correction requires a report reference and digest",
    });
  }
  if (correction.state === "recorded" && correction.execution !== null) {
    context.addIssue({
      code: "custom",
      path: ["execution"],
      message: "a recorded correction may not claim controlled execution evidence",
    });
  }
  if (
    ["apply-interrupted", "apply-uncertain", "applied-unverified"].includes(
      correction.state,
    )
    && correction.execution === null
  ) {
    context.addIssue({
      code: "custom",
      path: ["execution"],
      message: `${correction.state} requires controlled execution evidence`,
    });
  }
  if (correction.state === "apply-uncertain" && correction.stale !== true) {
    context.addIssue({
      code: "custom",
      path: ["stale"],
      message: "an uncertain correction must be marked stale",
    });
  }
});

export type LocalCorrectionProjection = z.infer<typeof LocalCorrectionProjectionSchema>;

export const MissionIntentLineageProjectionSchema = z.discriminatedUnion(
  "standing",
  [
    z.object({
      standing: z.literal("uninitialized"),
      activeAnchor: z.null(),
    }).strict(),
    z.object({
      standing: z.literal("legacy-unanchored"),
      activeAnchor: z.null(),
      priorEventCount: z.number().int().positive(),
      priorTimelineDigest: Sha256Schema,
    }).strict(),
    z.object({
      standing: z.enum(["seeded", "legacy-adopted"]),
      activeAnchor: z.object({
        id: z.string().min(1),
        revision: z.string().min(1),
        reconciledWatermark: z.number().int().nonnegative(),
      }).strict(),
    }).strict(),
    z.object({
      standing: z.literal("unavailable"),
      reason: z.string().min(1),
      activeAnchor: z.null(),
    }).strict(),
  ],
);

const MissionAnchorMigrationProposalSchema = z.object({
  version: z.literal("rosso.mission-anchor-migration-proposal.v1"),
  proposalId: nonempty,
  missionId: nonempty,
  preparedAt: nonempty,
  preparedBy: z.literal("supervisor:Codex"),
  missionSource: z.object({
    projectId: nonempty,
    relativePath: nonempty,
    gitHead: z.string().regex(/^[a-f0-9]{40,64}$/),
  }).strict(),
  target: z.object({
    runnerId: nonempty,
    pid: z.number().int().positive(),
    startedAt: nonempty,
    socketPath: nonempty,
    state: z.enum(["input-pending", "anchor-pending"]),
    live: z.literal(true),
    protocolCapability: z.enum([
      "atomic-adopt-retire-v1",
      "legacy-response-verified-shutdown-v1",
    ]),
  }).strict(),
  retainedHistory: z.object({
    eventCount: z.number().int().positive(),
    timelineDigest: Sha256Schema,
  }).strict(),
  proposedAdoption: z.object({
    adoptionId: nonempty,
    semanticSourceRef: nonempty,
    anchor: z.object({
      id: nonempty,
      revision: nonempty,
      statement: nonempty,
      sourceRefs: z.array(nonempty).min(1),
      reconciledWatermark: z.literal(0),
    }).strict(),
  }).strict(),
  executionSequence: z.union([
    z.tuple([
      z.literal("append-anchor-and-retire-exact-carrier"),
      z.literal("start-no-runtime-carrier"),
    ]),
    z.tuple([
      z.literal("request-unguarded-shutdown"),
      z.literal("verify-exact-shutdown-response"),
      z.literal("wait-exact-socket-release"),
      z.literal("start-no-runtime-carrier"),
      z.literal("append-exact-legacy-anchor"),
    ]),
  ]),
  residualRisk: z.union([
    z.object({
      kind: z.literal("none"),
      consequence: z.literal("none"),
      reopenOn: z.literal("target-source-or-history-drift"),
    }).strict(),
    z.object({
      kind: z.literal("post-effect-carrier-identity-verification"),
      consequence: z.literal("reversible-carrier-stop"),
      reopenOn: z.enum([
        "missing-or-mismatched-shutdown-response-or-identity-drift",
        "attempt-response-socket-target-or-history-uncertainty",
      ]),
    }).strict(),
  ]),
  decision: z.object({
    recommendation: z.literal("ADOPT"),
    replyKey: z.literal("ADOPT|HOLD"),
    options: z.object({
      ADOPT: z.object({
        immediateResult: nonempty,
        tradeoff: nonempty,
      }).strict(),
      HOLD: z.object({
        immediateResult: nonempty,
        tradeoff: nonempty,
      }).strict(),
    }).strict(),
  }).strict(),
  authorityBoundary: z.object({
    standing: z.literal("proposal-only"),
    carrierReplacement: z.literal("withheld"),
    adoption: z.literal("withheld"),
    reconciliation: z.literal("withheld"),
    externalDisclosure: z.literal("none"),
    candidateWrite: z.literal("withheld"),
    commit: z.literal("withheld"),
    merge: z.literal("withheld"),
    publish: z.literal("withheld"),
    productAcceptance: z.literal("withheld"),
  }).strict(),
}).strict().superRefine((proposal, context) => {
  const atomic = proposal.target.protocolCapability === "atomic-adopt-retire-v1";
  const expectedFirstStep = atomic
    ? "append-anchor-and-retire-exact-carrier"
    : "request-unguarded-shutdown";
  if (proposal.executionSequence[0] !== expectedFirstStep) {
    context.addIssue({
      code: "custom",
      path: ["executionSequence"],
      message: "execution sequence does not match target protocol capability",
    });
  }
  const expectedRisk = atomic
    ? "none"
    : "post-effect-carrier-identity-verification";
  if (proposal.residualRisk.kind !== expectedRisk) {
    context.addIssue({
      code: "custom",
      path: ["residualRisk"],
      message: "residual risk does not match target protocol capability",
    });
  }
});

const MissionAnchorMigrationProposalProjectionSchema = z.discriminatedUnion(
  "standing",
  [
    z.object({
      standing: z.literal("awaiting-principal-decision"),
      proposalDigest: Sha256Schema,
      proposal: MissionAnchorMigrationProposalSchema,
    }).strict(),
    z.object({
      standing: z.literal("stale"),
      proposalId: nonempty,
      proposalDigest: Sha256Schema,
      reason: nonempty,
    }).strict(),
  ],
).nullable();

const MissionReconciliationActionProjectionSchema = z.object({
  standing: z.enum([
    "awaiting-principal-decision",
    "authorized-awaiting-execution",
    "execution-attempt-consumed",
    "held",
    "reclassification-requested",
    "reconciled",
    "returned-to-principal",
    "failed-before-commit",
    "commit-outcome-uncertain",
  ]),
  proposalDigest: Sha256Schema,
  proposal: z.object({
    version: z.literal("rosso.mission-reconciliation-action-proposal.v1"),
    proposalId: nonempty,
    missionId: nonempty,
  }).passthrough(),
  decision: z.unknown().nullable(),
  outcome: z.unknown().nullable(),
}).strict().nullable();

export const WorkbenchRunnerActivityProjectionSchema = z.object({
  intentLineage: MissionIntentLineageProjectionSchema,
  anchorMigrationProposal: MissionAnchorMigrationProposalProjectionSchema.optional(),
  reconciliationAction: MissionReconciliationActionProjectionSchema.optional(),
  currentVerifiedResult: CurrentVerifiedResultProjectionSchema.nullable().optional(),
  currentEffect: CurrentEffectProjectionSchema.nullable().optional(),
  currentTurn: z.object({
    turnId: nonempty,
    turnStartEventId: nonempty.optional(),
    startDigest: Sha256Schema.optional(),
    startedAt: nonempty,
    baselineWatermark: z.number().int().nonnegative(),
    state: z.enum(["open", "settled"]),
    settlementKind: z.enum(["finished", "input-pending", "failed"]).optional(),
    runStatus: nonempty.optional(),
    launchAuthorizationRef: LaunchAuthorizationRefProjectionSchema.optional(),
    workbenchTaskContext: WorkbenchTaskExecutionContextRefSchema.optional(),
    guidanceRefs: z.array(z.object({
      version: z.literal("rosso.turn-guidance-ref.v1"),
      kind: z.literal("workbench-task-correction"),
      guidanceId: nonempty,
      taskId: nonempty,
      correctionId: nonempty,
      sourceRef: nonempty,
      payloadDigest: Sha256Schema,
      taskContextDigest: Sha256Schema,
    }).strict()).optional(),
  }).strict().nullable().optional(),
  currentCorrection: LocalCorrectionProjectionSchema.nullable().optional(),
  recentCorrections: z.array(LocalCorrectionProjectionSchema).optional(),
}).passthrough();

export type WorkbenchRunnerActivityProjection = z.infer<
  typeof WorkbenchRunnerActivityProjectionSchema
>;

interface MutableProject {
  projectKey: string;
  registration: ProjectProjection["registration"];
  identity: ProjectProjection["identity"];
  primaryWorkspace: string | null;
  worktrees: Map<string, WorktreeProjection>;
  missions: MissionProjection[];
  inspectedMissionRoots: Set<string>;
}

interface ParsedWorktree {
  path: string;
  head: string | null;
  gitBranch: string | null;
  locked: string | null;
  prunable: string | null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function executionBoundaryFor(proposal: MissionExecutionProposal) {
  return {
    runtimeRef: proposal.runtimeRef,
    runtimeDigest: proposal.runtimeDigest,
    externalProvider: proposal.externalProvider,
    externalDisclosure: proposal.externalDisclosure,
    candidateWorktree: proposal.candidateWorktree,
    scope: proposal.scope,
    budget: proposal.budget,
  };
}

function projectExecutionAuthorization(
  receipt: ExecutionAuthorizationReceipt,
  sourcePath: string,
  projectId: string,
  missionId: string,
  missionSourcePath: string,
  missionSourceGitHead: string,
  proposal: MissionExecutionProposal,
  proposalDigest: string,
): Extract<ExecutionAuthorizationProjection, { standing: "authorized-awaiting-execution" }> {
  if (receipt.projectId !== projectId) {
    throw new Error(`execution authorization project mismatch: expected ${projectId}, observed ${receipt.projectId}`);
  }
  if (receipt.missionId !== missionId) {
    throw new Error(`execution authorization Mission mismatch: expected ${missionId}, observed ${receipt.missionId}`);
  }
  if (receipt.missionSource.path !== missionSourcePath) {
    throw new Error(
      `execution authorization Mission source mismatch: expected ${missionSourcePath}, observed ${receipt.missionSource.path}`,
    );
  }
  if (receipt.missionSource.gitHead !== missionSourceGitHead) {
    throw new Error(
      `execution authorization Mission source HEAD mismatch: expected ${missionSourceGitHead}, observed ${receipt.missionSource.gitHead}`,
    );
  }
  if (receipt.proposalId !== proposal.proposalId) {
    throw new Error(
      `execution authorization proposal mismatch: expected ${proposal.proposalId}, observed ${receipt.proposalId}`,
    );
  }
  if (receipt.proposalDigest !== proposalDigest) {
    throw new Error(
      `execution authorization proposal digest is stale: expected ${proposalDigest}, observed ${receipt.proposalDigest}`,
    );
  }
  if (!isDeepStrictEqual(receipt.executionBoundary, executionBoundaryFor(proposal))) {
    throw new Error("execution authorization boundary does not match the current proposal");
  }

  const selected = new Map<string, string>();
  for (const choice of receipt.choices) {
    if (selected.has(choice.decisionId)) {
      throw new Error(`execution authorization repeats decision ${choice.decisionId}`);
    }
    selected.set(choice.decisionId, choice.replyKey);
  }
  const expectedChoices: ExecutionAuthorizationReceipt["choices"][number][] = [];
  const expectedResults: ExecutionAuthorizationReceipt["immediateAuthorizedResults"][number][] = [];
  for (const decision of proposal.pendingDecisions) {
    const replyKey = selected.get(decision.id);
    if (replyKey === undefined) {
      throw new Error(`execution authorization omits decision ${decision.id}`);
    }
    const option = decision.options.find((candidate) => candidate.replyKey === replyKey);
    if (option === undefined) {
      throw new Error(`execution authorization uses an undeclared reply key for ${decision.id}`);
    }
    expectedChoices.push({ decisionId: decision.id, replyKey });
    expectedResults.push({ decisionId: decision.id, result: option.immediateResult });
  }
  if (!isDeepStrictEqual(receipt.choices, expectedChoices)) {
    throw new Error("execution authorization choices do not exactly match the current proposal");
  }
  if (!isDeepStrictEqual(receipt.immediateAuthorizedResults, expectedResults)) {
    throw new Error("execution authorization immediate results do not exactly match the current proposal");
  }
  if (selected.get("external-disclosure") !== "ALLOW") {
    throw new Error("execution authorization does not authorize the declared external disclosure");
  }

  return {
    standing: "authorized-awaiting-execution",
    authorizationId: receipt.authorizationId,
    proposalDigest: receipt.proposalDigest,
    choices: receipt.choices,
    immediateAuthorizedResults: receipt.immediateAuthorizedResults,
    authorityBoundary: receipt.authorityBoundary,
    actorRef: receipt.actorRef,
    sourceRef: receipt.sourceRef,
    attributionBoundary: receipt.attributionBoundary,
    principalAction: receipt.version === "rosso.execution-authorization-receipt.v2"
      ? {
        channel: receipt.principalAction.channel,
        acknowledgements: receipt.principalAction.acknowledgements,
        identityAssurance: receipt.principalAction.identityAssurance,
      }
      : null,
    authorizedAt: receipt.authorizedAt,
    sourcePath,
  };
}

function projectConsumedExecutionAuthorization(
  authorization: Extract<
    ExecutionAuthorizationProjection,
    { standing: "authorized-awaiting-execution" }
  >,
  claim: ExecutionAuthorizationClaim,
  claimPath: string,
): Extract<
  ExecutionAuthorizationProjection,
  { standing: "authorization-consumed" }
> {
  return {
    ...authorization,
    standing: "authorization-consumed",
    consumption: {
      claimedAt: claim.claimedAt,
      candidateWorktree: claim.localEvidence.worktree,
      candidateHead: claim.localEvidence.gitHead,
      receiptRef: claim.receipt.ref,
      receiptDigest: claim.receipt.digest,
      claimSourcePath: claimPath,
      workbenchTaskContext: claim.workbenchTaskContext ?? null,
      evidenceBoundary: "proves-one-launch-authorization-consumed-only",
    },
  };
}

function canonicalExistingPath(path: string): string {
  const expanded = expandPath(path);
  return existsSync(expanded) ? realpathSync(expanded) : resolve(expanded);
}

function runGit(cwd: string, arguments_: string[]): string {
  const result = runCommand("git", ["-C", cwd, ...arguments_]);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || `git ${arguments_.join(" ")} failed in ${cwd}`);
  }
  return result.stdout;
}

function committedMissionAtHead(
  root: string,
  head: string,
  sourceRelativePath: string,
): z.infer<typeof MissionRecordSchema> {
  const result = runCommand("git", [
    "-C",
    root,
    "show",
    `${head}:${sourceRelativePath}`,
  ]);
  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr.trim()
      || `Mission source is not available at ${head}:${sourceRelativePath}`,
    );
  }
  try {
    return MissionRecordSchema.parse(JSON.parse(result.stdout));
  } catch (error: unknown) {
    throw new Error(
      `Committed Mission source is invalid at ${head}:${sourceRelativePath}: ${errorMessage(error)}`,
    );
  }
}

export function missionSourceMatchesHead(
  root: string,
  head: string,
  sourceRelativePath: string,
): boolean {
  const result = runCommand("git", [
    "-C",
    root,
    "diff",
    "--quiet",
    head,
    "--",
    sourceRelativePath,
  ]);
  if (result.exitCode === 0) return true;
  if (result.exitCode === 1) return false;
  throw new Error(
    result.stderr.trim()
    || `Cannot compare Mission source with HEAD: ${sourceRelativePath}`,
  );
}

function parseWorktreeList(output: string): ParsedWorktree[] {
  const records: ParsedWorktree[] = [];
  for (const block of output.trim().split(/\r?\n\r?\n/)) {
    if (!block.trim()) continue;
    let path: string | undefined;
    let head: string | null = null;
    let gitBranch: string | null = null;
    let locked: string | null = null;
    let prunable: string | null = null;
    for (const line of block.split(/\r?\n/)) {
      const separator = line.indexOf(" ");
      const key = separator === -1 ? line : line.slice(0, separator);
      const value = separator === -1 ? "" : line.slice(separator + 1);
      if (key === "worktree") path = canonicalExistingPath(value);
      if (key === "HEAD") head = value || null;
      if (key === "branch") gitBranch = value.replace(/^refs\/heads\//, "") || null;
      if (key === "locked") locked = value || "locked";
      if (key === "prunable") prunable = value || "prunable";
    }
    if (path !== undefined) records.push({ path, head, gitBranch, locked, prunable });
  }
  return records;
}

function observeDirty(path: string): boolean {
  return runGit(path, ["status", "--porcelain"]).trim().length > 0;
}

function projectSort(left: MutableProject, right: MutableProject): number {
  if (left.registration !== right.registration) return left.registration === "registered" ? -1 : 1;
  return left.projectKey.localeCompare(right.projectKey);
}

export function buildWorkbenchSnapshot(options: WorkbenchSnapshotOptions = {}): WorkbenchSnapshot {
  const generatedAt = options.now?.() ?? new Date().toISOString();
  const generatedAtMs = Date.parse(generatedAt);
  const home = resolveHome(options.home);
  const projectsByKey = new Map<string, MutableProject>();
  const registeredById = new Map<string, MutableProject>();
  const errors: ProjectionError[] = [];
  const sourceBoundaries: ProjectionSourceBoundary[] = [];
  const attention: AttentionItem[] = [];
  let complete = true;

  const recordError = (
    scope: ProjectionError["scope"],
    source: string,
    error: unknown,
    projectKey?: string,
  ): void => {
    complete = false;
    const message = errorMessage(error);
    errors.push({ scope, source, message });
    attention.push({
      priority: "warning",
      code: "source-error",
      summary: message,
      ...(projectKey === undefined ? {} : { projectKey }),
      source,
    });
  };
  const recordAuthorizationError = (
    source: string,
    error: unknown,
    projectKey: string,
    missionId: string,
  ): void => {
    complete = false;
    const message = errorMessage(error);
    errors.push({ scope: "authorization", source, message });
    attention.push({
      priority: "warning",
      code: "execution-authorization-invalid",
      summary: message,
      projectKey,
      missionId,
      source,
    });
  };

  let homeSources: ReturnType<typeof loadHome> | undefined;
  try {
    homeSources = loadHome(options.home);
    sourceBoundaries.push(
      {
        kind: "registered-project-identity",
        source: join(home, "config", "projects.json"),
        authority: "identity",
        freshness: "configured",
      },
      {
        kind: "workspace-mapping",
        source: join(home, "state", "workspaces.json"),
        authority: "location",
        freshness: "configured",
      },
    );
    for (const project of homeSources.projects.projects) {
      const mutable: MutableProject = {
        projectKey: `registered:${project.id}`,
        registration: "registered",
        identity: project,
        primaryWorkspace: null,
        worktrees: new Map(),
        missions: [],
        inspectedMissionRoots: new Set(),
      };
      projectsByKey.set(mutable.projectKey, mutable);
      registeredById.set(project.id, mutable);
    }
  } catch (error: unknown) {
    recordError("home", home, error);
  }

  const registeredMatchesForOrigin = (origin: string | null): MutableProject[] => {
    if (origin === null) return [];
    const normalized = normalizedRepository(origin);
    return [...registeredById.values()].filter((candidate) =>
      candidate.identity.repository !== null
      && normalizedRepository(candidate.identity.repository) === normalized);
  };

  const unregisteredProject = (root: string, origin: string | null): MutableProject => {
    const key = `unregistered:${origin === null ? root : normalizedRepository(origin)}`;
    const existing = projectsByKey.get(key);
    if (existing !== undefined) return existing;
    const mutable: MutableProject = {
      projectKey: key,
      registration: "observed-unregistered",
      identity: {
        id: null,
        repository: origin,
        aliases: [root.split("/").at(-1) ?? root],
      },
      primaryWorkspace: null,
      worktrees: new Map(),
      missions: [],
      inspectedMissionRoots: new Set(),
    };
    projectsByKey.set(key, mutable);
    return mutable;
  };

  const scanMissions = (project: MutableProject, root: string): void => {
    if (project.inspectedMissionRoots.has(root)) return;
    project.inspectedMissionRoots.add(root);
    const missionRoot = join(root, "operations", "missions");
    sourceBoundaries.push({
      kind: "mission-semantic-source",
      source: missionRoot,
      authority: "mission-semantics",
      freshness: "observed-at-build",
    });
    if (!existsSync(missionRoot)) return;
    let entries: string[];
    try {
      entries = readdirSync(missionRoot)
        .filter((entry) => entry.endsWith(".json"))
        .sort();
    } catch (error: unknown) {
      recordError("mission", missionRoot, error, project.projectKey);
      return;
    }
    const context = project.worktrees.get(root) ?? {
      path: root,
      head: optionalGit(["rev-parse", "HEAD"], root),
      gitBranch: optionalGit(["branch", "--show-current"], root),
      dirty: false,
      registeredPrimary: false,
      locked: null,
      prunable: null,
    };
    for (const entry of entries) {
      const path = join(missionRoot, entry);
      try {
        const record = MissionRecordSchema.parse(JSON.parse(readFileSync(path, "utf8")));
        // Only the registered workspace mapping is an authority-bearing Mission
        // source. Other worktrees remain observable, but an identical proposal
        // there must not become a second authorization surface.
        const authoritativeExecutionSource = project.registration === "registered"
          && context.registeredPrimary
          && context.head !== null;
        const sourceRelativePath = relative(root, path);
        let executionProposal: MissionExecutionProposal | undefined;
        let sourceAuthorizationBlock:
          | {
            readonly standing: "execution-source-not-authorizable";
            readonly reason: string;
            readonly remediation: string;
            readonly sourcePath: string;
          }
          | undefined;
        if (authoritativeExecutionSource && context.head !== null) {
          try {
            const committedRecord = committedMissionAtHead(
              root,
              context.head,
              sourceRelativePath,
            );
            if (committedRecord.id !== record.id) {
              throw new Error(
                `Committed Mission source ID mismatch: expected ${record.id}, observed ${committedRecord.id}`,
              );
            }
            executionProposal = committedRecord.executionProposal;
            if (!missionSourceMatchesHead(root, context.head, sourceRelativePath)) {
              const reason =
                `Mission source ${sourceRelativePath} differs from committed HEAD ${context.head}; `
                + "an uncommitted execution proposal cannot be authorized.";
              sourceAuthorizationBlock = {
                standing: "execution-source-not-authorizable",
                reason,
                remediation:
                  "Reconcile this Mission source with a committed HEAD through the project workflow, then refresh Workbench.",
                sourcePath: path,
              };
              recordAuthorizationError(
                path,
                new Error(reason),
                project.projectKey,
                record.id,
              );
            }
          } catch (error: unknown) {
            recordAuthorizationError(path, error, project.projectKey, record.id);
          }
        }
        const proposalDigest = executionProposal === undefined
          ? undefined
          : missionExecutionProposalDigest(executionProposal);
        let authorization: ExecutionAuthorizationProjection | undefined =
          sourceAuthorizationBlock;
        let authorizationInvalid = false;
        if (
          executionProposal !== undefined
          && proposalDigest !== undefined
          && sourceAuthorizationBlock === undefined
        ) {
          authorization = { standing: "awaiting-principal-authorization" };
          const projectId = project.identity.id;
          if (typeof projectId === "string" && context.head !== null) {
            const receiptPath = executionAuthorizationReceiptPath(
              home,
              projectId,
              record.id,
              executionProposal.proposalId,
            );
            if (existsSync(receiptPath)) {
              try {
                const receipt = ExecutionAuthorizationReceiptSchema.parse(
                  JSON.parse(readFileSync(receiptPath, "utf8")),
                );
                authorization = projectExecutionAuthorization(
                  receipt,
                  receiptPath,
                  projectId,
                  record.id,
                  relative(root, path),
                  context.head,
                  executionProposal,
                  proposalDigest,
                );
                const claimPath = executionAuthorizationClaimPath(
                  home,
                  receipt.authorizationId,
                );
                if (existsSync(claimPath)) {
                  try {
                    const claim = validateExecutionAuthorizationClaim(
                      JSON.parse(readFileSync(claimPath, "utf8")),
                      {
                        home,
                        claimPath,
                        receiptPath,
                        receipt,
                        projectId,
                        missionId: record.id,
                        proposalId: executionProposal.proposalId,
                        proposalDigest,
                      },
                    );
                    authorization = projectConsumedExecutionAuthorization(
                      authorization,
                      claim,
                      claimPath,
                    );
                    sourceBoundaries.push({
                      kind: "execution-authorization-claim",
                      source: claimPath,
                      authority: "launch-authorization-consumption-evidence",
                      freshness: "observed-at-build",
                    });
                  } catch (error: unknown) {
                    authorizationInvalid = true;
                    authorization = {
                      standing: "invalid-consumption-evidence",
                      reason: errorMessage(error),
                      remediation:
                        "Inspect and reconcile the local consumption claim; Workbench will not infer reusable launch authority, runner start, or effect success from invalid evidence.",
                      sourcePath: claimPath,
                    };
                    recordAuthorizationError(
                      claimPath,
                      error,
                      project.projectKey,
                      record.id,
                    );
                  }
                }
                sourceBoundaries.push({
                  kind: "execution-authorization-receipt",
                  source: receiptPath,
                  authority: "bounded-launch-authorization",
                  freshness: "observed-at-build",
                });
              } catch (error: unknown) {
                authorizationInvalid = true;
                authorization = {
                  standing: "invalid-receipt-evidence",
                  reason: errorMessage(error),
                  remediation:
                    "Inspect and reconcile the local receipt evidence; Workbench will not overwrite invalid or stale authority.",
                  sourcePath: receiptPath,
                };
                recordAuthorizationError(receiptPath, error, project.projectKey, record.id);
              }
            }
          }
        }
        const focus = record.currentFocus === "mainline"
          ? { kind: "mainline" as const, id: "mainline" as const }
          : (() => {
            const branch = record.branches.find((candidate) => candidate.id === record.currentFocus);
            if (branch === undefined) {
              throw new Error(`currentFocus '${record.currentFocus}' does not name a Mission branch`);
            }
            return {
              kind: "mission-branch" as const,
              id: branch.id,
              branchKind: branch.kind,
              status: branch.status,
            };
          })();
        project.missions.push({
          id: record.id,
          title: record.title,
          sourcePath: path,
          sourceRoot: root,
          mainline: {
            contradiction: record.mainline.contradiction,
            acceptance: record.mainline.acceptance,
            status: record.mainline.status,
          },
          currentFocus: record.currentFocus,
          semanticBranch: focus,
          branches: record.branches.map((branch) => ({
            id: branch.id,
            parent: branch.parent ?? "mainline",
            kind: branch.kind,
            purpose: branch.purpose,
            returnCondition: branch.returnCondition,
            status: branch.status,
          })),
          observedGitContext: {
            worktreePath: root,
            gitBranch: context.gitBranch,
            head: context.head,
            binding: "observation-only",
          },
          ...(executionProposal === undefined
            ? {}
            : {
              executionProposal: {
                ...executionProposal,
                proposalDigest: proposalDigest!,
              },
            }),
          ...(authorization === undefined ? {} : { authorization }),
        });
        if (
          executionProposal !== undefined
          && authorization?.standing === "awaiting-principal-authorization"
          && !authorizationInvalid
        ) {
          attention.push({
            priority: "principal-decision",
            code: "mission-execution-awaiting-authorization",
            summary: `Mission ${record.id} has a supervised execution proposal awaiting Principal authorization`,
            projectKey: project.projectKey,
            missionId: record.id,
            source: path,
          });
        }
      } catch (error: unknown) {
        recordError("mission", path, error, project.projectKey);
      }
    }
  };

  const inspectRoot = (
    rootArgument: string,
    assignedProject: MutableProject | undefined,
    registeredPrimary: boolean,
  ): void => {
    let root: string;
    try {
      root = gitRoot(rootArgument);
    } catch (error: unknown) {
      recordError("git", canonicalExistingPath(rootArgument), error, assignedProject?.projectKey);
      return;
    }
    let origin: string | null = null;
    try {
      const rawOrigin = optionalGit(["remote", "get-url", "origin"], root);
      origin = rawOrigin === null ? null : repositoryLocator(rawOrigin);
    } catch (error: unknown) {
      recordError("git", root, error, assignedProject?.projectKey);
    }
    let project = assignedProject;
    if (project === undefined) {
      const matches = registeredMatchesForOrigin(origin);
      if (matches.length === 1) project = matches[0]!;
      else {
        project = unregisteredProject(root, origin);
        if (matches.length > 1) {
          recordError(
            "project",
            root,
            `repository observation matches multiple registered project identities: ${matches
              .map((candidate) => candidate.identity.id)
              .join(", ")}`,
            project.projectKey,
          );
        }
      }
    }
    if (project === undefined) {
      throw new Error(`internal projection error: no project selected for ${root}`);
    }
    try {
      const records = parseWorktreeList(runGit(root, ["worktree", "list", "--porcelain"]));
      sourceBoundaries.push({
        kind: "git-worktree-observation",
        source: root,
        authority: "git-observation",
        freshness: "observed-at-build",
      });
      for (const record of records) {
        try {
          const isPrimary = registeredPrimary && record.path === root;
          const prior = project.worktrees.get(record.path);
          project.worktrees.set(record.path, {
            ...record,
            dirty: observeDirty(record.path),
            registeredPrimary: isPrimary || prior?.registeredPrimary === true,
          });
        } catch (error: unknown) {
          recordError("git", record.path, error, project.projectKey);
        }
      }
    } catch (error: unknown) {
      recordError("git", root, error, project.projectKey);
    }
    scanMissions(project, root);
  };

  if (homeSources !== undefined) {
    for (const project of homeSources.projects.projects) {
      const mutable = registeredById.get(project.id)!;
      const mappings = homeSources.workspaces.workspaces.filter((workspace) => workspace.projectId === project.id);
      if (mappings.length !== 1) {
        recordError(
          "project",
          join(home, "state", "workspaces.json"),
          mappings.length === 0
            ? `no local workspace is attached for ${project.id}`
            : `multiple local workspaces are attached for ${project.id}`,
          mutable.projectKey,
        );
        continue;
      }
      mutable.primaryWorkspace = canonicalExistingPath(mappings[0]!.path);
      inspectRoot(mappings[0]!.path, mutable, true);
    }
  }

  const inspectedAdditionalRoots = new Set<string>();
  for (const root of options.localRepositoryRoots ?? []) {
    const key = canonicalExistingPath(root);
    if (inspectedAdditionalRoots.has(key)) continue;
    inspectedAdditionalRoots.add(key);
    inspectRoot(root, undefined, false);
  }

  const runners: RunnerProjection[] = [];
  const runnerRoot = join(home, "missions");
  sourceBoundaries.push({
    kind: "runner-cache",
    source: runnerRoot,
    authority: "cached-operation",
    freshness: "cached",
  });
  if (existsSync(runnerRoot)) {
    let directories: string[] = [];
    try {
      directories = readdirSync(runnerRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
    } catch (error: unknown) {
      recordError("runner", runnerRoot, error);
    }
    for (const directory of directories) {
      const path = join(runnerRoot, directory, "runner-status.json");
      if (!existsSync(path)) continue;
      try {
        const status = RunnerStatusSchema.parse(JSON.parse(readFileSync(path, "utf8")));
        const matchingProjects = [...projectsByKey.values()].filter((project) =>
          project.missions.some((mission) => mission.id === status.missionId));
        const distinctMatches = [...new Map(matchingProjects.map((project) => [project.projectKey, project])).values()];
        const binding: RunnerProjection["binding"] = distinctMatches.length === 1
          ? {
            kind: "project-mission",
            projectKey: distinctMatches[0]!.projectKey,
            registeredProjectId: distinctMatches[0]!.identity.id,
            missionId: status.missionId,
          }
          : {
            kind: "unbound",
            reason: distinctMatches.length === 0
              ? "no-explicit-mission-id-match"
              : "ambiguous-mission-id",
          };
        const updatedAtMs = Date.parse(status.updatedAt);
        runners.push({
          sourcePath: path,
          status,
          freshness: {
            kind: "cached",
            sourceUpdatedAt: status.updatedAt,
            ageMs: Number.isFinite(generatedAtMs) && Number.isFinite(updatedAtMs)
              ? generatedAtMs - updatedAtMs
              : null,
          },
          binding,
        });
        if (binding.kind === "unbound") {
          complete = false;
          attention.push({
            priority: "warning",
            code: "runner-unbound",
            summary: `Runner ${status.runnerId} cannot be bound by Mission ID '${status.missionId}' (${binding.reason})`,
            missionId: status.missionId,
            source: path,
          });
        }
        if (status.state === "anchor-pending") {
          attention.push({
            priority: "principal-decision",
            code: "runner-anchor-pending",
            summary:
              `Mission ${status.missionId} has no authorized intent anchor; guarded adoption or migration is required before semantic work`,
            ...(binding.kind === "project-mission" ? { projectKey: binding.projectKey } : {}),
            missionId: status.missionId,
            source: path,
          });
        } else if (status.state === "idle") {
          attention.push({
            priority: "notice",
            code: "runner-idle",
            summary:
              `Mission ${status.missionId} has an authorized anchor but no runtime or current executor`,
            ...(binding.kind === "project-mission" ? { projectKey: binding.projectKey } : {}),
            missionId: status.missionId,
            source: path,
          });
        } else if (status.state === "interrupted") {
          attention.push({
            priority: "principal-decision",
            code: "runner-interrupted",
            summary: `Mission ${status.missionId} requires a recovery decision`,
            ...(binding.kind === "project-mission" ? { projectKey: binding.projectKey } : {}),
            missionId: status.missionId,
            source: path,
          });
        } else if (status.state === "input-pending") {
          attention.push({
            priority: "principal-decision",
            code: "runner-input-pending",
            summary: `Mission ${status.missionId} has unreconciled Principal input`,
            ...(binding.kind === "project-mission" ? { projectKey: binding.projectKey } : {}),
            missionId: status.missionId,
            source: path,
          });
        } else if (status.state === "paused") {
          attention.push({
            priority: "notice",
            code: "runner-paused",
            summary: `Mission ${status.missionId} is paused`,
            ...(binding.kind === "project-mission" ? { projectKey: binding.projectKey } : {}),
            missionId: status.missionId,
            source: path,
          });
        }
      } catch (error: unknown) {
        recordError("runner", path, error);
      }
    }
  }

  const runnerTimes = runners
    .map((runner) => runner.status.updatedAt)
    .filter((value) => Number.isFinite(Date.parse(value)))
    .sort((left, right) => Date.parse(left) - Date.parse(right));
  const priorityOrder: Record<AttentionItem["priority"], number> = {
    "principal-decision": 0,
    warning: 1,
    notice: 2,
  };

  return {
    version: "rosso.principal-workbench-snapshot.v1",
    generatedAt,
    complete,
    supervision: {
      mode: "supervised",
      supervisor: "Codex",
      subject: "Rossovia Workbench",
      unsupervised: "unavailable",
    },
    freshness: {
      registration: "loaded-at-build",
      git: "observed-at-build",
      missions: "read-at-build",
      runners: "cached-status-files",
      runnerUpdatedAtRange: runnerTimes.length === 0
        ? null
        : { oldest: runnerTimes[0]!, newest: runnerTimes.at(-1)! },
    },
    sourceBoundaries,
    projects: [...projectsByKey.values()]
      .sort(projectSort)
      .map((project) => ({
        projectKey: project.projectKey,
        registration: project.registration,
        identity: project.identity,
        primaryWorkspace: project.primaryWorkspace,
        worktrees: [...project.worktrees.values()].sort((left, right) => left.path.localeCompare(right.path)),
        missions: [...project.missions].sort((left, right) =>
          left.id.localeCompare(right.id) || left.sourcePath.localeCompare(right.sourcePath)),
      })),
    runners: runners.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath)),
    attention: attention.sort((left, right) =>
      priorityOrder[left.priority] - priorityOrder[right.priority]
      || left.source.localeCompare(right.source)),
    errors,
  };
}
