import { z } from "zod";
import {
  ActiveIntentAnchorSchema,
  MissionReconciliationProposalSchema,
  reconciliationDecisionFromRecord,
  type ActiveIntentAnchor,
  type MissionAnchorAdoption,
  type MissionAnchorSeed,
} from "./mission-reconciliation";
import {
  MissionReconciliationVerificationSchema,
  reconciliationVerificationDecisionFromRecord,
} from "./mission-reconciliation-verification";
import {
  ReconciliationCellRecordEvidenceSchema,
  type ReconciliationCellRecordEvidence,
  verifyMissionReconciliationCellRecord,
} from "./mission-reconciliation-evidence";
import type { MissionInputReceipt } from "./mission-input";
import { digest, stableStringify } from "./canonical-json";

export const ReconciliationAcceptanceSchema = z.object({
  authorityRef: z.string().min(1),
  verification: MissionReconciliationVerificationSchema,
  proposalEvidence: ReconciliationCellRecordEvidenceSchema,
  verificationEvidence: ReconciliationCellRecordEvidenceSchema,
  nextAnchor: ActiveIntentAnchorSchema,
}).strict();

export const MissionReconciliationCommitSchema = z.object({
  proposal: MissionReconciliationProposalSchema,
  acceptance: ReconciliationAcceptanceSchema,
}).strict();

export const MissionReconciliationEventDataSchema = z.object({
  proposalDigest: z.string().regex(/^[a-f0-9]{64}$/),
  nextAnchorDigest: z.string().regex(/^[a-f0-9]{64}$/),
  proposal: MissionReconciliationProposalSchema,
  acceptance: ReconciliationAcceptanceSchema,
}).strict();

export type ReconciliationAcceptance = z.infer<typeof ReconciliationAcceptanceSchema>;
export type MissionReconciliationCommit = z.infer<typeof MissionReconciliationCommitSchema>;

export interface MissionReconciliationLog {
  seedAnchor(input: MissionAnchorSeed): Promise<void>;
  adoptLegacyAnchor(input: MissionAnchorAdoption): Promise<void>;
  commitReconciliation(input: MissionReconciliationCommit): Promise<void>;
  latestReconciledAnchor(missionId: string): Promise<ActiveIntentAnchor | undefined>;
}

export interface VerifyRetainedReconciliationEvidenceOptions {
  readonly home: string;
  readonly missionId: string;
  readonly commit: MissionReconciliationCommit;
  readonly activeAnchor: ActiveIntentAnchor;
  readonly input: MissionInputReceipt;
}

export function assertReconciliationAcceptance(
  proposal: z.infer<typeof MissionReconciliationProposalSchema>,
  acceptance: ReconciliationAcceptance,
): void {
  if (proposal.decision.disposition === "decision-required") {
    throw new Error(`reconciliation proposal ${proposal.id} requires a Principal decision`);
  }
  const verification = acceptance.verification;
  if (verification.decision.verdict !== "verified-transition") {
    throw new Error(`reconciliation proposal ${proposal.id} has no verified transition`);
  }
  if (
    verification.missionId !== proposal.missionId
    || verification.proposalRef.id !== proposal.id
    || verification.proposalRef.digest !== digest(proposal)
    || verification.proposalRef.runId !== proposal.executionRef.runId
  ) throw new Error(`reconciliation acceptance ${proposal.id} is not linked to its verified proposal`);
  if (verification.executionRef.runId === proposal.executionRef.runId) {
    throw new Error(`reconciliation acceptance ${proposal.id} reuses the proposal run as its verifier`);
  }
  assertEvidenceIdentity(
    acceptance.proposalEvidence,
    "proposal",
    proposal.executionRef,
    proposal.id,
  );
  assertEvidenceIdentity(
    acceptance.verificationEvidence,
    "verification",
    verification.executionRef,
    proposal.id,
  );
  if (acceptance.proposalEvidence.digest === acceptance.verificationEvidence.digest) {
    throw new Error(`reconciliation acceptance ${proposal.id} reuses one retained Cell record`);
  }
  if (acceptance.nextAnchor.statement !== verification.decision.nextAnchorStatement) {
    throw new Error(`reconciliation acceptance ${proposal.id} changes the verified next-anchor statement`);
  }
  if (
    proposal.decision.disposition === "continue"
    && acceptance.nextAnchor.statement !== proposal.anchor.statement
  ) {
    throw new Error(`continue reconciliation ${proposal.id} cannot rewrite the active-anchor statement`);
  }
  if (acceptance.nextAnchor.reconciledWatermark !== proposal.inputRef.watermark) {
    throw new Error(`reconciliation acceptance ${proposal.id} does not advance to its input watermark`);
  }
}

export async function verifyRetainedReconciliationEvidence(
  options: VerifyRetainedReconciliationEvidenceOptions,
): Promise<void> {
  const commit = MissionReconciliationCommitSchema.parse(options.commit);
  const proposal = commit.proposal;
  const verification = commit.acceptance.verification;
  if (proposal.missionId !== options.missionId) {
    throw new Error(`reconciliation proposal ${proposal.id} belongs to another Mission`);
  }
  assertReconciliationAcceptance(proposal, commit.acceptance);

  const [proposalRecord, verificationRecord] = await Promise.all([
    verifyMissionReconciliationCellRecord({
      home: options.home,
      missionId: options.missionId,
      evidence: commit.acceptance.proposalEvidence,
    }),
    verifyMissionReconciliationCellRecord({
      home: options.home,
      missionId: options.missionId,
      evidence: commit.acceptance.verificationEvidence,
    }),
  ]);

  const retainedDecision = reconciliationDecisionFromRecord(proposalRecord.record);
  if (
    retainedDecision === undefined
    || stableStringify(retainedDecision) !== stableStringify(proposal.decision)
  ) {
    throw new Error(
      `reconciliation proposal ${proposal.id} does not match its retained Cell decision`,
    );
  }
  const retainedVerification = reconciliationVerificationDecisionFromRecord(
    verificationRecord.record,
    proposal,
  );
  if (
    retainedVerification === undefined
    || stableStringify(retainedVerification) !== stableStringify(verification.decision)
  ) {
    throw new Error(
      `reconciliation verification ${verification.id} does not match its retained Cell verdict`,
    );
  }

  assertRecordContext(
    proposalRecord.record.input.context,
    "active-anchor",
    options.activeAnchor,
    "proposal",
  );
  assertRecordContext(
    proposalRecord.record.input.context,
    "mission-input",
    inputContext(options.input),
    "proposal",
  );
  assertRecordContext(
    verificationRecord.record.input.context,
    "active-anchor",
    options.activeAnchor,
    "verification",
  );
  assertRecordContext(
    verificationRecord.record.input.context,
    "mission-input",
    inputContext(options.input),
    "verification",
  );
  assertRecordContext(
    verificationRecord.record.input.context,
    "reconciliation-proposal",
    proposal,
    "verification",
  );
}

function assertEvidenceIdentity(
  evidence: ReconciliationCellRecordEvidence,
  role: "proposal" | "verification",
  executionRef: { readonly cellId: string; readonly runId: string },
  proposalId: string,
): void {
  if (
    evidence.role !== role
    || evidence.runId !== executionRef.runId
    || evidence.cellId !== executionRef.cellId
  ) {
    throw new Error(
      `reconciliation acceptance ${proposalId} has mismatched ${role} Cell evidence`,
    );
  }
}

function inputContext(input: MissionInputReceipt): Record<string, unknown> {
  return {
    inputId: input.inputId,
    watermark: input.watermark,
    actorRef: input.actorRef,
    sourceRef: input.sourceRef,
    payload: input.payload,
  };
}

function assertRecordContext(
  contexts: readonly {
    readonly id: string;
    readonly content: string;
  }[],
  contextId: string,
  expected: unknown,
  role: "proposal" | "verification",
): void {
  const matches = contexts.filter((context) => context.id === contextId);
  if (matches.length !== 1) {
    throw new Error(
      `retained reconciliation ${role} Cell has ${matches.length} ${contextId} contexts`,
    );
  }
  let actual: unknown;
  try {
    actual = JSON.parse(matches[0]!.content);
  } catch {
    throw new Error(
      `retained reconciliation ${role} Cell has invalid ${contextId} context JSON`,
    );
  }
  if (stableStringify(actual) !== stableStringify(expected)) {
    throw new Error(
      `retained reconciliation ${role} Cell ${contextId} context does not match its source`,
    );
  }
}
