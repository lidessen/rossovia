import { z } from "zod";
import {
  ExecutionProfileSchema,
  type CellRunRecord,
  type ExecutionProfile,
} from "../../../packages/work-cell/src/contracts";
import type { CellDriver } from "../../../packages/work-cell/src/driver";
import { runCell } from "../../../packages/work-cell/src/run-cell";
import type { MissionInputReceipt } from "./mission-input";
import { digest, stableStringify } from "./canonical-json";
import {
  ActiveIntentAnchorSchema,
  MissionReconciliationProposalSchema,
  digestAnchor,
  type ActiveIntentAnchor,
  type MissionReconciliationProposal,
} from "./mission-reconciliation";

export const MISSION_RECONCILIATION_VERIFICATION_VERSION =
  "atthis.mission-reconciliation-verification.v1" as const;

const VerifiedContinueSubmissionSchema = z.object({
  assessment: z.string().min(1),
  preservedConstraints: z.array(z.string().min(1)).min(1),
}).strict();

const VerifiedCorrectionSubmissionSchema = z.object({
  assessment: z.string().min(1),
  nextAnchorStatement: z.string().min(1),
  preservedConstraints: z.array(z.string().min(1)).min(1),
}).strict();

const VerifiedDecisionRequiredSubmissionSchema = z.object({
  assessment: z.string().min(1),
  minimumQuestion: z.string().min(1),
}).strict();

const RejectedProposalSubmissionSchema = z.object({
  materialFindings: z.array(z.string().min(1)).min(1),
  nextProbe: z.string().min(1),
}).strict();

export const ReconciliationVerificationDecisionSchema = z.discriminatedUnion("verdict", [
  VerifiedCorrectionSubmissionSchema.extend({ verdict: z.literal("verified-transition") }).strict(),
  VerifiedDecisionRequiredSubmissionSchema.extend({ verdict: z.literal("verified-decision-required") }).strict(),
  RejectedProposalSubmissionSchema.extend({ verdict: z.literal("rejected") }).strict(),
]);

export const MissionReconciliationVerificationSchema = z.object({
  version: z.literal(MISSION_RECONCILIATION_VERIFICATION_VERSION),
  id: z.string().min(1),
  missionId: z.string().min(1),
  proposalRef: z.object({
    id: z.string().min(1),
    digest: z.string().regex(/^[a-f0-9]{64}$/),
    runId: z.string().min(1),
  }).strict(),
  executionRef: z.object({
    cellId: z.string().min(1),
    runId: z.string().min(1),
  }).strict(),
  decision: ReconciliationVerificationDecisionSchema,
}).strict();

export type ReconciliationVerificationDecision = z.infer<typeof ReconciliationVerificationDecisionSchema>;
export type MissionReconciliationVerification = z.infer<typeof MissionReconciliationVerificationSchema>;

export interface ReconciliationVerificationRequest {
  readonly id: string;
  readonly missionId: string;
  readonly anchor: ActiveIntentAnchor;
  readonly input: MissionInputReceipt;
  readonly proposal: MissionReconciliationProposal;
  readonly workspaceRoot: string;
  readonly executionProfile: ExecutionProfile;
}

export interface ReconciliationVerificationOptions {
  readonly driver: CellDriver;
  readonly maxSteps?: number;
  readonly maxDurationMs?: number;
  readonly signal?: AbortSignal;
}

export type ReconciliationVerificationResult =
  | {
      readonly kind: "verified";
      readonly verification: MissionReconciliationVerification;
      readonly record: CellRunRecord;
    }
  | { readonly kind: "unsettled"; readonly record: CellRunRecord; readonly reason: string };

/** Independent source comparison. It produces evidence and cannot commit Mission state. */
export async function verifyMissionReconciliation(
  request: ReconciliationVerificationRequest,
  options: ReconciliationVerificationOptions,
): Promise<ReconciliationVerificationResult> {
  const anchor = ActiveIntentAnchorSchema.parse(request.anchor);
  const proposal = MissionReconciliationProposalSchema.parse(request.proposal);
  assertSourceLinkage(request, anchor, proposal);
  const executionProfile = ExecutionProfileSchema.parse(request.executionProfile);
  if (
    options.driver.descriptor.provider !== executionProfile.provider
    || options.driver.descriptor.model !== executionProfile.model
  ) throw new Error(`reconciliation verifier driver does not match execution profile ${executionProfile.id}`);

  const record = await runCell({
    id: `verify-reconciliation:${request.missionId}:${proposal.id}`,
    intent: "Independently compare one reconciliation proposal with its supplied anchor and input, then submit one bounded verification candidate.",
    workspace: {
      root: request.workspaceRoot,
      readPaths: [],
      writePaths: [],
      excludePaths: [],
      allowedCommands: [],
    },
    instructions: [
      "Use only the supplied anchor, input, and proposal. Do not inspect other history or repeat the proposer's reasoning.",
      "Check whether the selected disposition follows from the sources and whether every material changed or preserved constraint is represented.",
      "For continue, verify the branch fields and preserved constraints; the host retains the exact active-anchor statement because continue changes no active constraint.",
      "For correction, submit a next-anchor statement that applies the supported change and preserves every unaffected hard constraint.",
      "For decision-required, verify that a real authority, meaning, or scope ambiguity remains and reduce it to the minimum question needed.",
      "Reject material contradiction, omission, fabricated detail, or a branch that resolves ambiguity without authority.",
      "Do not redesign the Mission, claim acceptance, advance a watermark, or invent source references.",
      "Finish by calling exactly one verification tool. Tool choice is the verdict; provide only that tool's fields.",
    ],
    context: [
      {
        id: "active-anchor",
        title: "Active intent anchor",
        content: JSON.stringify(anchor, null, 2),
        sources: anchor.sourceRefs,
      },
      {
        id: "mission-input",
        title: "Mission input under review",
        content: JSON.stringify({
          inputId: request.input.inputId,
          watermark: request.input.watermark,
          actorRef: request.input.actorRef,
          sourceRef: request.input.sourceRef,
          payload: request.input.payload,
        }, null, 2),
        sources: [request.input.sourceRef],
      },
      {
        id: "reconciliation-proposal",
        title: "Proposal under verification",
        content: JSON.stringify(proposal, null, 2),
        sources: [`work-cell:${proposal.executionRef.runId}`],
      },
    ],
    acceptance: [
      "The verdict is traceable to exactly the supplied anchor, input, and proposal.",
      "A verified transition preserves unaffected constraints and does not silently resolve ambiguity.",
      "The verifier performs no mutation and does not accept or advance Mission state.",
    ],
    terminalTools: [
      {
        name: "verify_continue",
        description: "Verify a continue proposal without rewriting its active-anchor statement. This is evidence, not acceptance.",
        inputSchema: jsonSchema(VerifiedContinueSubmissionSchema),
      },
      {
        name: "verify_correction",
        description: "Verify a correction proposal and submit its next-anchor statement. This is evidence, not acceptance.",
        inputSchema: jsonSchema(VerifiedCorrectionSubmissionSchema),
      },
      {
        name: "verify_decision_required",
        description: "Verify that the proposal correctly preserves a real unresolved decision. This is evidence, not acceptance.",
        inputSchema: jsonSchema(VerifiedDecisionRequiredSubmissionSchema),
      },
      {
        name: "reject_proposal",
        description: "Reject a materially unsupported, contradictory, or incomplete proposal.",
        inputSchema: jsonSchema(RejectedProposalSubmissionSchema),
      },
    ],
    budget: {
      maxSteps: options.maxSteps ?? 3,
      maxDurationMs: options.maxDurationMs ?? 120_000,
      maxCommandOutputBytes: 16_000,
    },
    executionProfile,
  }, options.driver, {
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  });
  if (record.status !== "passed") {
    return { kind: "unsettled", record, reason: record.error ?? `reconciliation verifier Cell ${record.status}` };
  }
  const decision = submittedVerification(record, proposal);
  if (decision === undefined) {
    return { kind: "unsettled", record, reason: "reconciliation verifier retained no valid terminal payload" };
  }
  const verification = MissionReconciliationVerificationSchema.parse({
    version: MISSION_RECONCILIATION_VERIFICATION_VERSION,
    id: request.id,
    missionId: request.missionId,
    proposalRef: {
      id: proposal.id,
      digest: digest(proposal),
      runId: proposal.executionRef.runId,
    },
    executionRef: { cellId: record.cellId, runId: record.runId },
    decision,
  });
  return { kind: "verified", verification, record };
}

function assertSourceLinkage(
  request: ReconciliationVerificationRequest,
  anchor: ActiveIntentAnchor,
  proposal: MissionReconciliationProposal,
): void {
  if (request.input.payload.kind !== "contribution") {
    throw new Error(`mission input ${request.input.inputId} is not a semantic contribution`);
  }
  if (proposal.missionId !== request.missionId) throw new Error(`proposal ${proposal.id} belongs to another Mission`);
  if (proposal.anchorDigest !== digestAnchor(anchor) || stableStringify(proposal.anchor) !== stableStringify(anchor)) {
    throw new Error(`proposal ${proposal.id} does not match the supplied active anchor`);
  }
  if (
    proposal.inputRef.inputId !== request.input.inputId
    || proposal.inputRef.eventId !== request.input.eventId
    || proposal.inputRef.watermark !== request.input.watermark
    || proposal.inputRef.payloadDigest !== request.input.payloadDigest
  ) throw new Error(`proposal ${proposal.id} does not match the supplied Mission input`);
}

function submittedVerification(
  record: CellRunRecord,
  proposal: MissionReconciliationProposal,
): ReconciliationVerificationDecision | undefined {
  const submissions = record.trace.filter((event) => event.type === "terminal.tool.called");
  if (submissions.length !== 1) return undefined;
  const data = asRecord(submissions[0]!.data);
  if (data.name === "verify_continue") {
    if (proposal.decision.disposition !== "continue") return undefined;
    const parsed = VerifiedContinueSubmissionSchema.safeParse(data.input);
    return parsed.success
      ? {
          verdict: "verified-transition",
          ...parsed.data,
          nextAnchorStatement: proposal.anchor.statement,
        }
      : undefined;
  }
  if (data.name === "verify_correction") {
    if (proposal.decision.disposition !== "correction") return undefined;
    const parsed = VerifiedCorrectionSubmissionSchema.safeParse(data.input);
    return parsed.success ? { verdict: "verified-transition", ...parsed.data } : undefined;
  }
  if (data.name === "verify_decision_required") {
    if (proposal.decision.disposition !== "decision-required") return undefined;
    const parsed = VerifiedDecisionRequiredSubmissionSchema.safeParse(data.input);
    return parsed.success ? { verdict: "verified-decision-required", ...parsed.data } : undefined;
  }
  if (data.name === "reject_proposal") {
    const parsed = RejectedProposalSubmissionSchema.safeParse(data.input);
    return parsed.success ? { verdict: "rejected", ...parsed.data } : undefined;
  }
  return undefined;
}

function jsonSchema(schema: z.ZodType): Record<string, unknown> {
  const generated = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  const { $schema: _dialect, ...portable } = generated;
  return { ...portable, type: "object" };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}
