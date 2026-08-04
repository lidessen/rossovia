export interface CorrectionPresentation {
  readonly standing: "invalid" | "stale" | "passed" | "failed" | "pending";
  readonly verdict: string;
  readonly causeVerdict: string | null;
  readonly attribution: string;
  readonly executionEvidence: string;
  readonly boundary: string;
}

export function isIndependentWorkbenchTask(item: unknown): boolean;

export function correctionPresentation(
  correction: unknown,
  currentEffect: unknown,
): CorrectionPresentation;

export type CandidateEvidencePresentation =
  | {
    readonly standing: "absent";
  }
  | {
    readonly standing: "unavailable";
    readonly reason: string;
  }
  | {
    readonly standing: "verified-correction";
    readonly headline: string;
    readonly conclusion: string;
    readonly candidate: {
      readonly path: string;
      readonly branch: string;
      readonly head: string;
      readonly dirty: boolean | null;
    };
    readonly changedPaths: readonly string[];
    readonly recordedAt: string;
    readonly observedAt: string | null;
    readonly reportRef: string;
    readonly reportDigest: string;
    readonly boundary: string;
  };

export function candidateEvidencePresentation(
  worktrees: unknown,
  activity: unknown,
  observedAt: unknown,
): CandidateEvidencePresentation;

export function runnerPresentation(runner: unknown): {
  readonly mode: string;
  readonly cachedMode: string;
  readonly live: boolean | null;
  readonly intentLineage?: string;
};

export interface IntentLineagePresentation {
  readonly standing:
    | "seeded"
    | "legacy-adopted"
    | "legacy-unanchored"
    | "uninitialized"
    | "unavailable";
  readonly blocksSemanticWork: boolean;
  readonly mode: "anchor-pending" | "lineage-unverified" | null;
}

export function intentLineagePresentation(
  activity: unknown,
): IntentLineagePresentation;

export type AnchorMigrationDecisionBriefPresentation =
  | {
    readonly standing: "absent" | "stale" | "unavailable";
    readonly decisionable: false;
    readonly reason?: string;
  }
  | {
    readonly standing: "awaiting-principal-decision";
    readonly decisionable: true;
    readonly proposalId: string;
    readonly proposalDigest: string;
    readonly migrationPath: "atomic-append-retire" | "legacy-compatibility-saga";
    readonly atomicAvailability: string;
    readonly target: string;
    readonly history: string;
    readonly steps: readonly string[];
    readonly effects: readonly string[];
    readonly residualRisk: string;
    readonly anchor: {
      readonly id: string;
      readonly revision: string;
      readonly statement: string;
      readonly sourceRefs: readonly string[];
    };
    readonly source: string;
    readonly recommendation: "AUTHORIZE MIGRATION";
    readonly replyKey: "AUTHORIZE MIGRATION|HOLD";
    readonly options: {
      readonly AUTHORIZE_MIGRATION: {
        readonly immediateResult: string;
        readonly tradeoff: string;
      };
      readonly HOLD: { readonly immediateResult: string; readonly tradeoff: string };
    };
    readonly normalizedProtocolChoice: "ADOPT";
    readonly boundary: string;
  };

export function anchorMigrationDecisionBriefPresentation(
  activity: unknown,
  runner: unknown,
  sourceContext: unknown,
): AnchorMigrationDecisionBriefPresentation;

export type ReconciliationActionDecisionBriefPresentation =
  | {
    readonly standing: string;
    readonly decisionable: false;
    readonly reason?: string;
  }
  | {
    readonly standing: "awaiting-principal-decision";
    readonly decisionable: true;
    readonly proposalId: string;
    readonly proposalDigest: string;
    readonly target: string;
    readonly lineage: string;
    readonly input: string;
    readonly report: string;
    readonly execution: string;
    readonly disclosure: string;
    readonly condition: string;
    readonly recommendation: "SETTLE_CONTINUE";
    readonly replyKey: "SETTLE_CONTINUE|RECLASSIFY_CORRECTION|HOLD";
    readonly options: {
      readonly SETTLE_CONTINUE: {
        readonly immediateResult: string;
        readonly tradeoff: string;
      };
      readonly RECLASSIFY_CORRECTION: {
        readonly immediateResult: string;
        readonly tradeoff: string;
      };
      readonly HOLD: {
        readonly immediateResult: string;
        readonly tradeoff: string;
      };
    };
    readonly source: string;
    readonly boundary: string;
  };

export function reconciliationActionDecisionBriefPresentation(
  activity: unknown,
  runner: unknown,
  sourceContext: unknown,
): ReconciliationActionDecisionBriefPresentation;

export function verifiedCorrectionAwaitsSystemSettlement(runner: unknown): boolean;
