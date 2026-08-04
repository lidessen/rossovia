import { randomUUID } from "node:crypto";
import {
  link,
  mkdir,
  open,
  readFile,
  rename,
  unlink,
} from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { z } from "zod";
import { ExecutionProfileSchema } from "../../../packages/work-cell/src/contracts";
import { digest, stableStringify } from "./canonical-json";
import {
  LocalCorrectionReportSchema,
  localCorrectionReportDigest,
  localCorrectionReportRef,
} from "./local-correction";
import { FileMissionTimeline } from "./delegate-timeline";
import {
  readMissionReconciliationActionCellRecord,
  readMissionReconciliationCellRecord,
} from "./mission-reconciliation-evidence";
import { MissionInputReceiptSchema } from "./mission-input";
import { missionRunnerDirectory } from "./mission-paths";
import {
  ActiveIntentAnchorSchema,
  digestAnchor,
} from "./mission-reconciliation";

export const MISSION_RECONCILIATION_ACTION_PROPOSAL_VERSION =
  "rosso.mission-reconciliation-action-proposal.v1" as const;
export const MISSION_RECONCILIATION_ACTION_DECISION_VERSION =
  "rosso.mission-reconciliation-action-decision.v1" as const;
export const MISSION_RECONCILIATION_ACTION_OUTCOME_VERSION =
  "rosso.mission-reconciliation-action-outcome.v1" as const;
export const MISSION_RECONCILIATION_ACTION_ATTEMPT_VERSION =
  "rosso.mission-reconciliation-action-attempt.v1" as const;

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const GitHeadSchema = z.string().regex(/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/);
const NonemptySchema = z.string().min(1);

const WithheldAuthoritySchema = z.object({
  standing: z.literal("proposal-only"),
  modelExecution: z.literal("withheld"),
  externalDisclosure: z.literal("withheld"),
  reconciliation: z.literal("withheld"),
  candidateWrite: z.literal("withheld"),
  commit: z.literal("withheld"),
  merge: z.literal("withheld"),
  publish: z.literal("withheld"),
  productAcceptance: z.literal("withheld"),
}).strict();

const MissionSourceSchema = z.object({
  projectId: NonemptySchema,
  relativePath: NonemptySchema,
  gitHead: GitHeadSchema,
}).strict();

const DecisionOptionSchema = z.object({
  immediateResult: NonemptySchema,
  tradeoff: NonemptySchema,
}).strict();

export const MissionReconciliationActionProposalSchema = z.object({
  version: z.literal(MISSION_RECONCILIATION_ACTION_PROPOSAL_VERSION),
  proposalId: NonemptySchema,
  missionId: NonemptySchema,
  preparedAt: NonemptySchema,
  preparedBy: z.literal("supervisor:Codex"),
  missionSource: MissionSourceSchema,
  target: z.object({
    runnerId: NonemptySchema,
    pid: z.number().int().positive(),
    startedAt: NonemptySchema,
    socketPath: NonemptySchema,
    state: z.literal("input-pending"),
    live: z.literal(true),
    runtimeMode: z.literal("none"),
    inputWatermark: z.number().int().positive(),
    reconciledWatermark: z.number().int().nonnegative(),
  }).strict(),
  lineage: z.object({
    anchor: ActiveIntentAnchorSchema,
    anchorDigest: Sha256Schema,
  }).strict(),
  input: MissionInputReceiptSchema,
  correctionEvidence: z.object({
    reportRef: NonemptySchema,
    reportDigest: Sha256Schema,
    report: LocalCorrectionReportSchema,
    stale: z.literal(false),
  }).strict(),
  execution: z.object({
    adapter: z.literal("codex-app-server.v1"),
    carrier: z.object({
      canonicalExecutable: NonemptySchema.refine(isAbsolute, {
        message: "carrier executable must be an absolute path",
      }),
      version: NonemptySchema,
      toolPolicy: z.literal(
        "app-server-no-environment-structured-output-plan-only-v1",
      ),
    }).strict(),
    profile: ExecutionProfileSchema,
    invocations: z.literal(2),
    isolation: z.literal("fresh-disposable-no-environment"),
    maxDurationMsPerCell: z.number().int().positive(),
    externalDisclosure: z.object({
      provider: z.literal("openai"),
      data: z.tuple([
        z.literal("active-intent-anchor"),
        z.literal("watermark-1-correction-input"),
        z.literal("reconciliation-proposal-to-independent-verifier"),
        z.literal("bounded-work-cell-envelope-without-workspace-or-host-budget"),
        z.literal("pinned-codex-system-developer-and-output-schema-context"),
      ]),
      repositoryFiles: z.literal("none"),
      candidateFiles: z.literal("none"),
    }).strict(),
  }).strict(),
  conditionalSettlement: z.object({
    proposalDisposition: z.literal("continue"),
    verificationVerdict: z.literal("verified-transition"),
    nextAnchor: ActiveIntentAnchorSchema,
    otherwise: z.literal("return-to-principal-without-commit"),
  }).strict(),
  decision: z.object({
    recommendation: z.literal("SETTLE_CONTINUE"),
    replyKey: z.literal("SETTLE_CONTINUE|RECLASSIFY_CORRECTION|HOLD"),
    options: z.object({
      SETTLE_CONTINUE: DecisionOptionSchema,
      RECLASSIFY_CORRECTION: DecisionOptionSchema,
      HOLD: DecisionOptionSchema,
    }).strict(),
  }).strict(),
  authorityBoundary: WithheldAuthoritySchema,
}).strict().superRefine((proposal, context) => {
  if (proposal.target.inputWatermark !== proposal.input.watermark) {
    context.addIssue({
      code: "custom",
      path: ["target", "inputWatermark"],
      message: "runner input watermark must match the proposed source input",
    });
  }
  if (
    proposal.target.reconciledWatermark !== proposal.lineage.anchor.reconciledWatermark
    || proposal.input.watermark !== proposal.lineage.anchor.reconciledWatermark + 1
  ) {
    context.addIssue({
      code: "custom",
      path: ["lineage"],
      message: "proposal must bind exactly the next unreconciled input",
    });
  }
  if (proposal.lineage.anchorDigest !== digestAnchor(proposal.lineage.anchor)) {
    context.addIssue({
      code: "custom",
      path: ["lineage", "anchorDigest"],
      message: "anchor digest does not match the exact anchor",
    });
  }
  if (
    proposal.correctionEvidence.report.correction.missionId !== proposal.missionId
    || proposal.correctionEvidence.report.correction.inputId !== proposal.input.inputId
    || proposal.correctionEvidence.report.correction.inputEventId !== proposal.input.eventId
    || proposal.correctionEvidence.report.correction.inputWatermark !== proposal.input.watermark
    || proposal.correctionEvidence.report.correction.inputPayloadDigest
      !== proposal.input.payloadDigest
  ) {
    context.addIssue({
      code: "custom",
      path: ["correctionEvidence"],
      message: "correction report does not bind the exact Mission input",
    });
  }
  if (
    proposal.correctionEvidence.report.verification.verdict !== "passed"
    || localCorrectionReportDigest(proposal.correctionEvidence.report)
      !== proposal.correctionEvidence.reportDigest
    || localCorrectionReportRef(
      proposal.input.eventId,
      proposal.correctionEvidence.reportDigest,
    ) !== proposal.correctionEvidence.reportRef
  ) {
    context.addIssue({
      code: "custom",
      path: ["correctionEvidence"],
      message: "correction evidence must be a digest-bound passed report",
    });
  }
  const payload = proposal.input.payload;
  const report = proposal.correctionEvidence.report;
  if (
    proposal.input.payloadDigest !== digest(payload)
    || payload.kind !== "correction"
  ) {
    context.addIssue({
      code: "custom",
      path: ["input"],
      message: "reconciliation action input must be an exact correction payload",
    });
  } else if (
    payload.correctionId !== report.correction.correctionId
    || payload.cause.effectId !== report.cause.effectId
    || payload.cause.failedReportRef !== report.cause.failedReportRef
    || payload.cause.failedReportDigest !== report.cause.failedReportDigest
    || payload.subject.gitHead !== report.subject.before.gitHead
    || stableStringify(payload.subject.files)
      !== stableStringify(report.subject.before.files)
    || stableStringify(payload.authority) !== stableStringify(report.authority)
    || report.correction.actorRef !== proposal.input.actorRef
    || report.correction.sourceRef !== proposal.input.sourceRef
  ) {
    context.addIssue({
      code: "custom",
      path: ["correctionEvidence"],
      message: "correction report does not match the exact correction payload",
    });
  }
  const next = proposal.conditionalSettlement.nextAnchor;
  if (
    next.id !== proposal.lineage.anchor.id
    || next.statement !== proposal.lineage.anchor.statement
    || next.reconciledWatermark !== proposal.input.watermark
  ) {
    context.addIssue({
      code: "custom",
      path: ["conditionalSettlement", "nextAnchor"],
      message: "continue settlement must preserve identity and statement while advancing one watermark",
    });
  }
});

export const MissionReconciliationActionDecisionSchema = z.object({
  version: z.literal(MISSION_RECONCILIATION_ACTION_DECISION_VERSION),
  decisionId: NonemptySchema,
  proposalId: NonemptySchema,
  proposalDigest: Sha256Schema,
  missionId: NonemptySchema,
  missionSource: MissionSourceSchema,
  choice: z.enum(["SETTLE_CONTINUE", "RECLASSIFY_CORRECTION", "HOLD"]),
  authorityRef: NonemptySchema,
  sourceRef: NonemptySchema,
  decidedAt: NonemptySchema,
}).strict();

export const MissionReconciliationActionOutcomeSchema = z.object({
  version: z.literal(MISSION_RECONCILIATION_ACTION_OUTCOME_VERSION),
  missionId: NonemptySchema,
  proposalId: NonemptySchema,
  proposalDigest: Sha256Schema,
  decisionDigest: Sha256Schema,
  standing: z.enum([
    "reconciled",
    "returned-to-principal",
    "held",
    "failed-before-commit",
    "commit-outcome-uncertain",
  ]),
  detail: NonemptySchema,
  attemptDigest: Sha256Schema.nullable(),
  proposalCellRecordDigest: Sha256Schema.nullable(),
  verificationCellRecordDigest: Sha256Schema.nullable(),
  proposalEvidenceDigest: Sha256Schema.nullable(),
  verificationEvidenceDigest: Sha256Schema.nullable(),
  reconciliationEventDigest: Sha256Schema.nullable(),
  recordedAt: NonemptySchema,
}).strict().superRefine((outcome, context) => {
  const hasProposalEvidence = outcome.proposalEvidenceDigest !== null;
  const hasVerificationEvidence = outcome.verificationEvidenceDigest !== null;
  const hasReconciliationEvent = outcome.reconciliationEventDigest !== null;
  if (
    outcome.standing === "reconciled"
    && (
      outcome.attemptDigest === null
      || outcome.proposalCellRecordDigest === null
      || outcome.verificationCellRecordDigest === null
      || !hasProposalEvidence
      || !hasVerificationEvidence
      || !hasReconciliationEvent
    )
  ) {
    context.addIssue({
      code: "custom",
      message: "a reconciled outcome requires proposal, verification, and reconciliation event evidence",
    });
  }
  if (outcome.standing !== "reconciled" && hasReconciliationEvent) {
    context.addIssue({
      code: "custom",
      path: ["reconciliationEventDigest"],
      message: "only a reconciled outcome may reference a reconciliation event",
    });
  }
});

export const MissionReconciliationActionAttemptSchema = z.object({
  version: z.literal(MISSION_RECONCILIATION_ACTION_ATTEMPT_VERSION),
  missionId: NonemptySchema,
  proposalId: NonemptySchema,
  proposalDigest: Sha256Schema,
  decisionDigest: Sha256Schema,
  target: z.object({
    runnerId: NonemptySchema,
    state: z.literal("input-pending"),
  }).strict(),
  standing: z.literal("one-use-execution-started"),
  startedAt: NonemptySchema,
}).strict();

export type MissionReconciliationActionProposal =
  z.infer<typeof MissionReconciliationActionProposalSchema>;
export type MissionReconciliationActionDecision =
  z.infer<typeof MissionReconciliationActionDecisionSchema>;
export type MissionReconciliationActionOutcome =
  z.infer<typeof MissionReconciliationActionOutcomeSchema>;
export type MissionReconciliationActionAttempt =
  z.infer<typeof MissionReconciliationActionAttemptSchema>;

export type MissionReconciliationActionProjection =
  | null
  | {
    readonly standing:
      | "awaiting-principal-decision"
      | "authorized-awaiting-execution"
      | "execution-attempt-consumed"
      | "held"
      | "reclassification-requested"
      | MissionReconciliationActionOutcome["standing"];
    readonly proposalDigest: string;
    readonly proposal: MissionReconciliationActionProposal;
    readonly decision: {
      readonly digest: string;
      readonly value: MissionReconciliationActionDecision;
    } | null;
    readonly outcome: MissionReconciliationActionOutcome | null;
  };

export function missionReconciliationActionProposalDigest(
  proposal: MissionReconciliationActionProposal,
): string {
  return digest(MissionReconciliationActionProposalSchema.parse(proposal));
}

export function missionReconciliationActionDecisionDigest(
  decision: MissionReconciliationActionDecision,
): string {
  return digest(MissionReconciliationActionDecisionSchema.parse(decision));
}

export async function retainMissionReconciliationActionProposal(
  home: string,
  unparsedProposal: unknown,
  options: { readonly expectedCurrentDigest?: string } = {},
): Promise<{ readonly proposal: MissionReconciliationActionProposal; readonly digest: string }> {
  const proposal = MissionReconciliationActionProposalSchema.parse(unparsedProposal);
  const proposalDigest = missionReconciliationActionProposalDigest(proposal);
  const path = missionReconciliationActionProposalPath(home, proposal.missionId);
  const existing = await readOptional(path);
  if (existing !== undefined) {
    const current = MissionReconciliationActionProposalSchema.parse(JSON.parse(existing));
    const currentDigest = missionReconciliationActionProposalDigest(current);
    if (currentDigest === proposalDigest) return { proposal: current, digest: currentDigest };
    if (options.expectedCurrentDigest !== currentDigest) {
      throw new Error(
        `reconciliation action proposal changed from ${currentDigest}; exact replacement authority is required`,
      );
    }
  } else if (options.expectedCurrentDigest !== undefined) {
    throw new Error("reconciliation action proposal baseline is unavailable");
  }
  await replaceExact(path, canonicalBytes(proposal));
  return { proposal, digest: proposalDigest };
}

export async function readMissionReconciliationActionProposal(
  home: string,
  missionId: string,
): Promise<{ readonly proposal: MissionReconciliationActionProposal; readonly digest: string } | undefined> {
  const source = await readOptional(missionReconciliationActionProposalPath(home, missionId));
  if (source === undefined) return undefined;
  const proposal = MissionReconciliationActionProposalSchema.parse(JSON.parse(source));
  return {
    proposal,
    digest: missionReconciliationActionProposalDigest(proposal),
  };
}

export async function retainMissionReconciliationActionDecision(
  home: string,
  unparsedDecision: unknown,
): Promise<{ readonly decision: MissionReconciliationActionDecision; readonly digest: string }> {
  const decision = MissionReconciliationActionDecisionSchema.parse(unparsedDecision);
  const retainedProposal = await readMissionReconciliationActionProposal(
    home,
    decision.missionId,
  );
  if (
    retainedProposal === undefined
    || retainedProposal.digest !== decision.proposalDigest
    || retainedProposal.proposal.proposalId !== decision.proposalId
    || stableStringify(retainedProposal.proposal.missionSource)
      !== stableStringify(decision.missionSource)
  ) {
    throw new Error("reconciliation action decision does not bind the current exact proposal");
  }
  const decisionDigest = missionReconciliationActionDecisionDigest(decision);
  const root = missionReconciliationActionDecisionDirectory(home, decision.missionId);
  await retainExact(
    join(root, `${decisionDigest}.json`),
    canonicalBytes(decision),
    "reconciliation action decision digest conflicts with retained bytes",
  );
  await retainExact(
    join(root, "by-proposal", `${decision.proposalDigest}.json`),
    canonicalBytes({
      decisionDigest,
      decisionId: decision.decisionId,
      proposalDigest: decision.proposalDigest,
    }),
    `reconciliation action proposal ${decision.proposalDigest} already has another decision`,
  );
  return { decision, digest: decisionDigest };
}

export async function readMissionReconciliationActionDecision(
  home: string,
  missionId: string,
  proposalDigest: string,
): Promise<{ readonly decision: MissionReconciliationActionDecision; readonly digest: string } | undefined> {
  Sha256Schema.parse(proposalDigest);
  const root = missionReconciliationActionDecisionDirectory(home, missionId);
  const indexSource = await readOptional(
    join(root, "by-proposal", `${proposalDigest}.json`),
  );
  if (indexSource === undefined) return undefined;
  const index = z.object({
    decisionDigest: Sha256Schema,
    decisionId: NonemptySchema,
    proposalDigest: Sha256Schema,
  }).strict().parse(JSON.parse(indexSource));
  if (index.proposalDigest !== proposalDigest) {
    throw new Error("reconciliation action decision index has the wrong proposal digest");
  }
  const source = await readOptional(join(root, `${index.decisionDigest}.json`));
  if (source === undefined) {
    throw new Error("reconciliation action decision index points to missing evidence");
  }
  const decision = MissionReconciliationActionDecisionSchema.parse(JSON.parse(source));
  if (
    missionReconciliationActionDecisionDigest(decision) !== index.decisionDigest
    || decision.decisionId !== index.decisionId
    || decision.proposalDigest !== proposalDigest
  ) {
    throw new Error("reconciliation action decision evidence is damaged");
  }
  return { decision, digest: index.decisionDigest };
}

export async function retainMissionReconciliationActionOutcome(
  home: string,
  unparsedOutcome: unknown,
): Promise<MissionReconciliationActionOutcome> {
  const outcome = MissionReconciliationActionOutcomeSchema.parse(unparsedOutcome);
  const retainedProposal = await readMissionReconciliationActionProposal(
    home,
    outcome.missionId,
  );
  if (
    retainedProposal === undefined
    || retainedProposal.digest !== outcome.proposalDigest
    || retainedProposal.proposal.proposalId !== outcome.proposalId
  ) {
    throw new Error("reconciliation action outcome does not bind the current exact proposal");
  }
  const retainedDecision = await readMissionReconciliationActionDecision(
    home,
    outcome.missionId,
    outcome.proposalDigest,
  );
  if (
    retainedDecision === undefined
    || retainedDecision.digest !== outcome.decisionDigest
  ) {
    throw new Error("reconciliation action outcome does not bind the retained exact decision");
  }
  const retainedAttempt = await readMissionReconciliationActionAttempt(
    home,
    outcome.missionId,
    outcome.proposalDigest,
  );
  assertOutcomeAuthority(outcome, retainedDecision.decision.choice, retainedAttempt);
  await assertOutcomeCellEvidence(home, outcome);
  if (outcome.reconciliationEventDigest !== null) {
    const timeline = new FileMissionTimeline(
      missionRunnerDirectory(home, outcome.missionId),
    );
    const event = (await timeline.readEvents(outcome.missionId))
      .find((candidate) => digest(candidate) === outcome.reconciliationEventDigest);
    if (
      event === undefined
      || event.type !== "mission.input-reconciled"
      || event.data.proposal.missionId !== outcome.missionId
      || stableStringify(event.data.proposal.anchor)
        !== stableStringify(retainedProposal.proposal.lineage.anchor)
      || event.data.proposal.inputRef.inputId
        !== retainedProposal.proposal.input.inputId
      || event.data.proposal.inputRef.eventId
        !== retainedProposal.proposal.input.eventId
      || event.data.proposal.inputRef.watermark
        !== retainedProposal.proposal.input.watermark
      || event.data.proposal.inputRef.payloadDigest
        !== retainedProposal.proposal.input.payloadDigest
      || event.data.proposal.decision.disposition !== "continue"
      || event.data.acceptance.authorityRef
        !== `reconciliation-action-decision:sha256:${outcome.decisionDigest}`
      || stableStringify(event.data.acceptance.nextAnchor)
        !== stableStringify(
          retainedProposal.proposal.conditionalSettlement.nextAnchor,
        )
      || event.data.acceptance.proposalEvidence.digest
        !== outcome.proposalEvidenceDigest
      || event.data.acceptance.verificationEvidence.digest
        !== outcome.verificationEvidenceDigest
    ) {
      throw new Error(
        "reconciliation action outcome does not bind an exact retained reconciliation event",
      );
    }
  }
  const path = join(
    missionRunnerDirectory(home, outcome.missionId),
    "reconciliation-action-outcomes",
    `${outcome.proposalDigest}.json`,
  );
  await retainExact(
    path,
    canonicalBytes(outcome),
    `reconciliation action proposal ${outcome.proposalDigest} already has another outcome`,
  );
  return outcome;
}

export async function retainMissionReconciliationActionAttempt(
  home: string,
  unparsedAttempt: unknown,
): Promise<{
  readonly attempt: MissionReconciliationActionAttempt;
  readonly digest: string;
  readonly created: boolean;
}> {
  const attempt = MissionReconciliationActionAttemptSchema.parse(unparsedAttempt);
  const retainedProposal = await readMissionReconciliationActionProposal(
    home,
    attempt.missionId,
  );
  const retainedDecision = await readMissionReconciliationActionDecision(
    home,
    attempt.missionId,
    attempt.proposalDigest,
  );
  if (
    retainedProposal === undefined
    || retainedProposal.digest !== attempt.proposalDigest
    || retainedProposal.proposal.proposalId !== attempt.proposalId
    || retainedDecision === undefined
    || retainedDecision.digest !== attempt.decisionDigest
    || retainedDecision.decision.choice !== "SETTLE_CONTINUE"
    || retainedProposal.proposal.target.runnerId !== attempt.target.runnerId
    || retainedProposal.proposal.target.state !== attempt.target.state
  ) {
    throw new Error(
      "reconciliation action attempt does not bind the current SETTLE_CONTINUE authority",
    );
  }
  const attemptDigest = digest(attempt);
  const path = join(
    missionRunnerDirectory(home, attempt.missionId),
    "reconciliation-action-attempts",
    `${attempt.proposalDigest}.json`,
  );
  const source = canonicalBytes(attempt);
  const existing = await readOptional(path);
  if (existing !== undefined) {
    const retained = MissionReconciliationActionAttemptSchema.parse(JSON.parse(existing));
    return {
      attempt: retained,
      digest: digest(retained),
      created: false,
    };
  }
  const created = await retainExact(
    path,
    source,
    `reconciliation action proposal ${attempt.proposalDigest} already has another attempt`,
  );
  return { attempt, digest: attemptDigest, created };
}

export async function readMissionReconciliationActionAttempt(
  home: string,
  missionId: string,
  proposalDigest: string,
): Promise<{
  readonly attempt: MissionReconciliationActionAttempt;
  readonly digest: string;
} | undefined> {
  Sha256Schema.parse(proposalDigest);
  const source = await readOptional(join(
    missionRunnerDirectory(home, missionId),
    "reconciliation-action-attempts",
    `${proposalDigest}.json`,
  ));
  if (source === undefined) return undefined;
  const attempt = MissionReconciliationActionAttemptSchema.parse(JSON.parse(source));
  if (attempt.missionId !== missionId || attempt.proposalDigest !== proposalDigest) {
    throw new Error("reconciliation action attempt does not match its storage identity");
  }
  return { attempt, digest: digest(attempt) };
}

export async function readMissionReconciliationActionOutcome(
  home: string,
  missionId: string,
  proposalDigest: string,
): Promise<MissionReconciliationActionOutcome | undefined> {
  Sha256Schema.parse(proposalDigest);
  const source = await readOptional(join(
    missionRunnerDirectory(home, missionId),
    "reconciliation-action-outcomes",
    `${proposalDigest}.json`,
  ));
  return source === undefined
    ? undefined
    : MissionReconciliationActionOutcomeSchema.parse(JSON.parse(source));
}

export async function projectMissionReconciliationAction(
  home: string,
  missionId: string,
): Promise<MissionReconciliationActionProjection> {
  const retained = await readMissionReconciliationActionProposal(home, missionId);
  if (retained === undefined) return null;
  const decision = await readMissionReconciliationActionDecision(
    home,
    missionId,
    retained.digest,
  );
  const outcome = await readMissionReconciliationActionOutcome(
    home,
    missionId,
    retained.digest,
  );
  const attempt = await readMissionReconciliationActionAttempt(
    home,
    missionId,
    retained.digest,
  );
  const standing = outcome?.standing
    ?? (decision === undefined
      ? "awaiting-principal-decision"
      : decision.decision.choice === "SETTLE_CONTINUE"
        ? attempt === undefined
          ? "authorized-awaiting-execution"
          : "execution-attempt-consumed"
        : decision.decision.choice === "RECLASSIFY_CORRECTION"
          ? "reclassification-requested"
          : "held");
  return {
    standing,
    proposalDigest: retained.digest,
    proposal: retained.proposal,
    decision: decision === undefined
      ? null
      : { digest: decision.digest, value: decision.decision },
    outcome: outcome ?? null,
  };
}

function assertOutcomeAuthority(
  outcome: MissionReconciliationActionOutcome,
  choice: MissionReconciliationActionDecision["choice"],
  attempt: Awaited<ReturnType<typeof readMissionReconciliationActionAttempt>>,
): void {
  const hasCellEvidence =
    outcome.proposalCellRecordDigest !== null
    || outcome.verificationCellRecordDigest !== null
    ||
    outcome.proposalEvidenceDigest !== null
    || outcome.verificationEvidenceDigest !== null;
  if (choice === "HOLD") {
    if (
      outcome.standing !== "held"
      || attempt !== undefined
      || outcome.attemptDigest !== null
      || hasCellEvidence
    ) {
      throw new Error("HOLD outcome conflicts with its retained authority");
    }
    return;
  }
  if (choice === "RECLASSIFY_CORRECTION") {
    if (
      outcome.standing !== "returned-to-principal"
      || attempt !== undefined
      || outcome.attemptDigest !== null
      || hasCellEvidence
    ) {
      throw new Error("RECLASSIFY_CORRECTION outcome conflicts with its retained authority");
    }
    return;
  }
  if (
    attempt === undefined
    || attempt.attempt.decisionDigest !== outcome.decisionDigest
    || attempt.digest !== outcome.attemptDigest
    || ["held"].includes(outcome.standing)
  ) {
    throw new Error("SETTLE_CONTINUE outcome has no exact one-use attempt");
  }
}

async function assertOutcomeCellEvidence(
  home: string,
  outcome: MissionReconciliationActionOutcome,
): Promise<void> {
  for (const [role, recordDigest] of [
    ["proposal", outcome.proposalCellRecordDigest],
    ["verification", outcome.verificationCellRecordDigest],
  ] as const) {
    if (recordDigest === null) continue;
    const retained = await readMissionReconciliationActionCellRecord({
      home,
      missionId: outcome.missionId,
      digest: recordDigest,
    });
    if (retained.evidence.role !== role) {
      throw new Error(
        `reconciliation action outcome has mismatched ${role} attempt record`,
      );
    }
  }
  for (const [role, recordDigest] of [
    ["proposal", outcome.proposalEvidenceDigest],
    ["verification", outcome.verificationEvidenceDigest],
  ] as const) {
    if (recordDigest === null) continue;
    const retained = await readMissionReconciliationCellRecord({
      home,
      missionId: outcome.missionId,
      digest: recordDigest,
    });
    if (retained.evidence.role !== role) {
      throw new Error(`reconciliation action outcome has mismatched ${role} evidence`);
    }
  }
}

export function missionReconciliationActionProposalPath(
  home: string,
  missionId: string,
): string {
  return join(
    missionRunnerDirectory(home, missionId),
    "reconciliation-action-proposal.json",
  );
}

function missionReconciliationActionDecisionDirectory(
  home: string,
  missionId: string,
): string {
  return join(
    missionRunnerDirectory(home, missionId),
    "reconciliation-action-decisions",
  );
}

function canonicalBytes(value: unknown): Buffer {
  return Buffer.from(stableStringify(value), "utf8");
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (isCode(error, "ENOENT")) return undefined;
    throw error;
  }
}

async function replaceExact(path: string, source: Buffer): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(source);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, path);
  await syncDirectory(dirname(path));
}

async function retainExact(
  path: string,
  source: Buffer,
  conflictMessage: string,
): Promise<boolean> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(source);
    await handle.sync();
  } finally {
    await handle.close();
  }
  let created = false;
  try {
    await link(temporary, path);
    created = true;
  } catch (error) {
    if (!isCode(error, "EEXIST")) throw error;
    const retained = await readFile(path);
    if (!retained.equals(source)) throw new Error(conflictMessage);
  } finally {
    await unlink(temporary).catch((error: unknown) => {
      if (!isCode(error, "ENOENT")) throw error;
    });
  }
  if (created) await syncDirectory(dirname(path));
  return created;
}

async function syncDirectory(path: string): Promise<void> {
  const handle = await open(path, "r");
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function isCode(error: unknown, code: string): boolean {
  return error instanceof Error
    && "code" in error
    && (error as NodeJS.ErrnoException).code === code;
}
