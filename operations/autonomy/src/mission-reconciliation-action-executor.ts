import { randomUUID } from "node:crypto";
import { realpath } from "node:fs/promises";
import type { CellDriver } from "../../../packages/work-cell/src/driver";
import type { CellHost } from "../../../packages/work-cell/src/host-port";
import { digest, stableStringify } from "./canonical-json";
import {
  TimelineEventSchema,
  type TimelineEvent,
} from "./delegate-timeline-events";
import {
  readMissionReconciliationActionDecision,
  readMissionReconciliationActionOutcome,
  readMissionReconciliationActionProposal,
  retainMissionReconciliationActionAttempt,
  retainMissionReconciliationActionOutcome,
  type MissionReconciliationActionOutcome,
  type MissionReconciliationActionProposal,
} from "./mission-reconciliation-action";
import {
  retainMissionReconciliationActionCellRecord,
  retainMissionReconciliationCellRecord,
} from "./mission-reconciliation-evidence";
import type { MissionInputReceipt } from "./mission-input";
import {
  proposeMissionReconciliation,
  type ActiveIntentAnchor,
} from "./mission-reconciliation";
import type { MissionReconciliationCommit } from "./mission-reconciliation-commit";
import {
  verifyMissionReconciliation,
} from "./mission-reconciliation-verification";

export interface MissionReconciliationActionObservation {
  readonly missionSource: MissionReconciliationActionProposal["missionSource"];
  readonly target: MissionReconciliationActionProposal["target"];
  readonly anchor: ActiveIntentAnchor;
  readonly input: MissionInputReceipt;
  readonly correctionEvidence: MissionReconciliationActionProposal["correctionEvidence"];
}

export interface MissionReconciliationActionCell {
  readonly workspaceRoot: string;
  readonly driver: CellDriver;
  /** The caller-injected host port used to execute this disposable Cell. */
  readonly host: CellHost;
  readonly isolation:
    | "fresh-disposable-read-only"
    | "fresh-disposable-no-environment";
  dispose(): Promise<void>;
}

export interface MissionReconciliationActionCommitResult {
  readonly reconciliationEvent: TimelineEvent;
  readonly reconciledWatermark: number;
}

export interface ExecuteMissionReconciliationActionOptions {
  readonly home: string;
  readonly missionId: string;
  readonly proposalDigest: string;
  observeCurrent(): Promise<MissionReconciliationActionObservation>;
  createCell(role: "proposal" | "verification"): Promise<MissionReconciliationActionCell>;
  commit(
    commit: MissionReconciliationCommit,
    target: { readonly expectedRunnerId: string; readonly expectedState: "input-pending" },
  ): Promise<MissionReconciliationActionCommitResult>;
  readonly now?: () => string;
}

/**
 * Execute one retained Principal decision.
 *
 * The attempt is one-use. A pre-commit failure is settled without replay; an
 * uncertain commit response is surfaced as uncertainty rather than guessed.
 */
export async function executeMissionReconciliationAction(
  options: ExecuteMissionReconciliationActionOptions,
): Promise<MissionReconciliationActionOutcome> {
  const now = options.now ?? (() => new Date().toISOString());
  const retained = await readMissionReconciliationActionProposal(
    options.home,
    options.missionId,
  );
  if (retained === undefined || retained.digest !== options.proposalDigest) {
    throw new Error("reconciliation action executor does not bind the current exact proposal");
  }
  const proposal = retained.proposal;
  const retainedDecision = await readMissionReconciliationActionDecision(
    options.home,
    options.missionId,
    retained.digest,
  );
  if (retainedDecision === undefined) {
    throw new Error("reconciliation action executor has no retained Principal decision");
  }
  const existingOutcome = await readMissionReconciliationActionOutcome(
    options.home,
    options.missionId,
    retained.digest,
  );
  if (existingOutcome !== undefined) return existingOutcome;

  if (retainedDecision.decision.choice !== "SETTLE_CONTINUE") {
    return await recordOutcome(options.home, {
      missionId: options.missionId,
      proposalId: proposal.proposalId,
      proposalDigest: retained.digest,
      decisionDigest: retainedDecision.digest,
      standing: retainedDecision.decision.choice === "HOLD"
        ? "held"
        : "returned-to-principal",
      detail: retainedDecision.decision.choice === "HOLD"
        ? "Principal held the exact reconciliation action; no Cell ran and no data was disclosed."
        : "Principal requested correction reclassification; no Cell ran and no reconciliation was committed.",
      attemptDigest: null,
      proposalCellRecordDigest: null,
      verificationCellRecordDigest: null,
      proposalEvidenceDigest: null,
      verificationEvidenceDigest: null,
      reconciliationEventDigest: null,
      recordedAt: now(),
    });
  }

  const observation = await options.observeCurrent();
  assertCurrentObservation(proposal, observation);
  const attempt = await retainMissionReconciliationActionAttempt(options.home, {
    version: "rosso.mission-reconciliation-action-attempt.v1",
    missionId: options.missionId,
    proposalId: proposal.proposalId,
    proposalDigest: retained.digest,
    decisionDigest: retainedDecision.digest,
    target: {
      runnerId: proposal.target.runnerId,
      state: proposal.target.state,
    },
    standing: "one-use-execution-started",
    startedAt: now(),
  });
  if (!attempt.created) {
    throw new Error(
      `reconciliation action ${proposal.proposalId} already consumed its one-use execution attempt`,
    );
  }
  let proposalEvidenceDigest: string | null = null;
  let verificationEvidenceDigest: string | null = null;
  let proposalCellRecordDigest: string | null = null;
  let verificationCellRecordDigest: string | null = null;
  let commitAttempted = false;
  try {
    assertCurrentObservation(proposal, await options.observeCurrent());
    const proposerCell = await options.createCell("proposal");
    const proposerRoot = await assertCellAuthority(
      proposerCell,
      proposal,
      "proposal",
    );
    let proposed: Awaited<ReturnType<typeof proposeMissionReconciliation>>;
    try {
      proposed = await proposeMissionReconciliation({
        id: `${proposal.proposalId}:proposal:${randomUUID()}`,
        missionId: options.missionId,
        anchor: observation.anchor,
        input: observation.input,
        workspaceRoot: proposerCell.workspaceRoot,
        executionProfile: proposal.execution.profile,
      }, {
        driver: proposerCell.driver,
        host: proposerCell.host,
        maxDurationMs: proposal.execution.maxDurationMsPerCell,
      });
      proposalCellRecordDigest = (
        await retainMissionReconciliationActionCellRecord({
          home: options.home,
          missionId: options.missionId,
          role: "proposal",
          record: proposed.record,
        })
      ).digest;
    } finally {
      await proposerCell.dispose();
    }
    if (proposed.kind !== "proposed") {
      return await recordFailure(
        options,
        proposal,
        retained.digest,
        retainedDecision.digest,
        `Proposal Cell did not settle: ${proposed.reason}`,
        attempt.digest,
        proposalCellRecordDigest,
        verificationCellRecordDigest,
        proposalEvidenceDigest,
        verificationEvidenceDigest,
        now,
      );
    }
    const proposalEvidence = await retainMissionReconciliationCellRecord({
      home: options.home,
      missionId: options.missionId,
      role: "proposal",
      record: proposed.record,
    });
    proposalEvidenceDigest = proposalEvidence.digest;
    if (proposed.proposal.decision.disposition !== proposal.conditionalSettlement.proposalDisposition) {
      return await recordOutcome(options.home, {
        missionId: options.missionId,
        proposalId: proposal.proposalId,
        proposalDigest: retained.digest,
        decisionDigest: retainedDecision.digest,
        standing: "returned-to-principal",
        detail:
          `Proposal Cell selected ${proposed.proposal.decision.disposition}; conditional settlement requires continue.`,
        attemptDigest: attempt.digest,
        proposalCellRecordDigest,
        verificationCellRecordDigest,
        proposalEvidenceDigest,
        verificationEvidenceDigest: null,
        reconciliationEventDigest: null,
        recordedAt: now(),
      });
    }

    assertCurrentObservation(proposal, await options.observeCurrent());
    const verifierCell = await options.createCell("verification");
    const verifierRoot = await assertCellAuthority(
      verifierCell,
      proposal,
      "verification",
    );
    if (verifierRoot === proposerRoot) {
      await verifierCell.dispose();
      return await recordFailure(
        options,
        proposal,
        retained.digest,
        retainedDecision.digest,
        "Verifier Cell reused the proposal workspace.",
        attempt.digest,
        proposalCellRecordDigest,
        verificationCellRecordDigest,
        proposalEvidenceDigest,
        verificationEvidenceDigest,
        now,
      );
    }
    let verified: Awaited<ReturnType<typeof verifyMissionReconciliation>>;
    try {
      verified = await verifyMissionReconciliation({
        id: `${proposal.proposalId}:verification:${randomUUID()}`,
        missionId: options.missionId,
        anchor: observation.anchor,
        input: observation.input,
        proposal: proposed.proposal,
        workspaceRoot: verifierCell.workspaceRoot,
        executionProfile: proposal.execution.profile,
      }, {
        driver: verifierCell.driver,
        host: verifierCell.host,
        maxDurationMs: proposal.execution.maxDurationMsPerCell,
      });
      verificationCellRecordDigest = (
        await retainMissionReconciliationActionCellRecord({
          home: options.home,
          missionId: options.missionId,
          role: "verification",
          record: verified.record,
        })
      ).digest;
    } finally {
      await verifierCell.dispose();
    }
    if (verified.kind !== "verified") {
      return await recordFailure(
        options,
        proposal,
        retained.digest,
        retainedDecision.digest,
        `Verification Cell did not settle: ${verified.reason}`,
        attempt.digest,
        proposalCellRecordDigest,
        verificationCellRecordDigest,
        proposalEvidenceDigest,
        verificationEvidenceDigest,
        now,
      );
    }
    const verificationEvidence = await retainMissionReconciliationCellRecord({
      home: options.home,
      missionId: options.missionId,
      role: "verification",
      record: verified.record,
    });
    verificationEvidenceDigest = verificationEvidence.digest;
    if (
      verified.verification.decision.verdict
      !== proposal.conditionalSettlement.verificationVerdict
    ) {
      return await recordOutcome(options.home, {
        missionId: options.missionId,
        proposalId: proposal.proposalId,
        proposalDigest: retained.digest,
        decisionDigest: retainedDecision.digest,
        standing: "returned-to-principal",
        detail:
          `Verification Cell selected ${verified.verification.decision.verdict}; no reconciliation was committed.`,
        attemptDigest: attempt.digest,
        proposalCellRecordDigest,
        verificationCellRecordDigest,
        proposalEvidenceDigest,
        verificationEvidenceDigest,
        reconciliationEventDigest: null,
        recordedAt: now(),
      });
    }

    const commit: MissionReconciliationCommit = {
      proposal: proposed.proposal,
      acceptance: {
        authorityRef:
          `reconciliation-action-decision:sha256:${retainedDecision.digest}`,
        verification: verified.verification,
        proposalEvidence,
        verificationEvidence,
        nextAnchor: proposal.conditionalSettlement.nextAnchor,
      },
    };
    assertCurrentObservation(proposal, await options.observeCurrent());
    let committed: MissionReconciliationActionCommitResult;
    try {
      commitAttempted = true;
      committed = await options.commit(commit, {
        expectedRunnerId: proposal.target.runnerId,
        expectedState: proposal.target.state,
      });
    } catch (error) {
      return await recordOutcome(options.home, {
        missionId: options.missionId,
        proposalId: proposal.proposalId,
        proposalDigest: retained.digest,
        decisionDigest: retainedDecision.digest,
        standing: "commit-outcome-uncertain",
        detail: error instanceof Error ? error.message : String(error),
        attemptDigest: attempt.digest,
        proposalCellRecordDigest,
        verificationCellRecordDigest,
        proposalEvidenceDigest,
        verificationEvidenceDigest,
        reconciliationEventDigest: null,
        recordedAt: now(),
      });
    }
    const reconciliationEvent = TimelineEventSchema.parse(
      committed.reconciliationEvent,
    );
    if (
      committed.reconciledWatermark !== observation.input.watermark
      || !committedEventMatches(reconciliationEvent, commit)
    ) {
      return await recordOutcome(options.home, {
        missionId: options.missionId,
        proposalId: proposal.proposalId,
        proposalDigest: retained.digest,
        decisionDigest: retainedDecision.digest,
        standing: "commit-outcome-uncertain",
        detail:
          "Commit response did not prove the exact reconciliation event and watermark.",
        attemptDigest: attempt.digest,
        proposalCellRecordDigest,
        verificationCellRecordDigest,
        proposalEvidenceDigest,
        verificationEvidenceDigest,
        reconciliationEventDigest: null,
        recordedAt: now(),
      });
    }
    return await recordOutcome(options.home, {
      missionId: options.missionId,
      proposalId: proposal.proposalId,
      proposalDigest: retained.digest,
      decisionDigest: retainedDecision.digest,
      standing: "reconciled",
      detail:
        `Two independent Cells selected continue and verified-transition; watermark ${observation.input.watermark} was committed.`,
      attemptDigest: attempt.digest,
      proposalCellRecordDigest,
      verificationCellRecordDigest,
      proposalEvidenceDigest,
      verificationEvidenceDigest,
      reconciliationEventDigest: digest(reconciliationEvent),
      recordedAt: now(),
    });
  } catch (error) {
    if (commitAttempted) {
      return await recordOutcome(options.home, {
        missionId: options.missionId,
        proposalId: proposal.proposalId,
        proposalDigest: retained.digest,
        decisionDigest: retainedDecision.digest,
        standing: "commit-outcome-uncertain",
        detail:
          `Commit was attempted but its terminal outcome could not be retained: ${
            error instanceof Error ? error.message : String(error)
          }`,
        attemptDigest: attempt.digest,
        proposalCellRecordDigest,
        verificationCellRecordDigest,
        proposalEvidenceDigest,
        verificationEvidenceDigest,
        reconciliationEventDigest: null,
        recordedAt: now(),
      });
    }
    return await recordFailure(
      options,
      proposal,
      retained.digest,
      retainedDecision.digest,
      error instanceof Error ? error.message : String(error),
      attempt.digest,
      proposalCellRecordDigest,
      verificationCellRecordDigest,
      proposalEvidenceDigest,
      verificationEvidenceDigest,
      now,
    );
  }
}

async function assertCellAuthority(
  cell: MissionReconciliationActionCell,
  proposal: MissionReconciliationActionProposal,
  role: "proposal" | "verification",
): Promise<string> {
  if (
    cell.isolation !== proposal.execution.isolation
    || cell.driver.descriptor.adapter !== proposal.execution.adapter
    || cell.driver.descriptor.provider !== proposal.execution.profile.provider
    || cell.driver.descriptor.model !== proposal.execution.profile.model
  ) {
    throw new Error(
      `${role} Cell does not match the authorized carrier, model, or isolation`,
    );
  }
  return await realpath(cell.workspaceRoot);
}

function committedEventMatches(
  event: TimelineEvent,
  commit: MissionReconciliationCommit,
): boolean {
  return event.type === "mission.input-reconciled"
    && event.timelineId === commit.proposal.missionId
    && event.data.proposalDigest === digest(commit.proposal)
    && event.data.nextAnchorDigest === digest(commit.acceptance.nextAnchor)
    && stableStringify(event.data.proposal) === stableStringify(commit.proposal)
    && stableStringify(event.data.acceptance)
      === stableStringify(commit.acceptance);
}

function assertCurrentObservation(
  proposal: MissionReconciliationActionProposal,
  observation: MissionReconciliationActionObservation,
): void {
  const exact: Array<[string, unknown, unknown]> = [
    ["Mission source", observation.missionSource, proposal.missionSource],
    ["live target", observation.target, proposal.target],
    ["active anchor", observation.anchor, proposal.lineage.anchor],
    ["Mission input", observation.input, proposal.input],
    ["correction evidence", observation.correctionEvidence, proposal.correctionEvidence],
  ];
  for (const [label, actual, expected] of exact) {
    if (stableStringify(actual) !== stableStringify(expected)) {
      throw new Error(`${label} drifted from the exact reconciliation action proposal`);
    }
  }
}

async function recordFailure(
  options: ExecuteMissionReconciliationActionOptions,
  proposal: MissionReconciliationActionProposal,
  proposalDigest: string,
  decisionDigest: string,
  detail: string,
  attemptDigest: string,
  proposalCellRecordDigest: string | null,
  verificationCellRecordDigest: string | null,
  proposalEvidenceDigest: string | null,
  verificationEvidenceDigest: string | null,
  now: () => string,
): Promise<MissionReconciliationActionOutcome> {
  return await recordOutcome(options.home, {
    missionId: options.missionId,
    proposalId: proposal.proposalId,
    proposalDigest,
    decisionDigest,
    standing: "failed-before-commit",
    detail,
    attemptDigest,
    proposalCellRecordDigest,
    verificationCellRecordDigest,
    proposalEvidenceDigest,
    verificationEvidenceDigest,
    reconciliationEventDigest: null,
    recordedAt: now(),
  });
}

async function recordOutcome(
  home: string,
  outcome: Omit<MissionReconciliationActionOutcome, "version">,
): Promise<MissionReconciliationActionOutcome> {
  return await retainMissionReconciliationActionOutcome(home, {
    version: "rosso.mission-reconciliation-action-outcome.v1",
    ...outcome,
  });
}
