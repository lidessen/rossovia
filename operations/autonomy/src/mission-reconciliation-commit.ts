import { z } from "zod";
import {
  ActiveIntentAnchorSchema,
  MissionReconciliationProposalSchema,
  type ActiveIntentAnchor,
  type MissionAnchorSeed,
} from "./mission-reconciliation";
import { MissionReconciliationVerificationSchema } from "./mission-reconciliation-verification";
import { digest } from "./canonical-json";

export const ReconciliationAcceptanceSchema = z.object({
  authorityRef: z.string().min(1),
  verification: MissionReconciliationVerificationSchema,
  evidenceRefs: z.array(z.string().min(1)).min(1),
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
  commitReconciliation(input: MissionReconciliationCommit): Promise<void>;
  latestReconciledAnchor(missionId: string): Promise<ActiveIntentAnchor | undefined>;
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
  const requiredEvidence = [
    `work-cell:${proposal.executionRef.runId}`,
    `work-cell:${verification.executionRef.runId}`,
  ];
  if (requiredEvidence.some((reference) => !acceptance.evidenceRefs.includes(reference))) {
    throw new Error(`reconciliation acceptance ${proposal.id} omits proposal or verifier evidence`);
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
