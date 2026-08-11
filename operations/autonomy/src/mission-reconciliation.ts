import { z } from "zod";
import {
  ExecutionProfileSchema,
  type CellRunRecord,
  type ExecutionProfile,
} from "../../../packages/work-cell/src/contracts";
import type { CellDriver } from "../../../packages/work-cell/src/driver";
import { runCell } from "../../../packages/work-cell/src/run-cell";
import {
  MissionInputEventDataSchema,
  type MissionInputReceipt,
} from "./mission-input";
import { digest } from "./canonical-json";
import {
  ActiveIntentAnchorSchema,
  type ActiveIntentAnchor,
  type MissionAnchorSeed,
} from "./mission-anchor";

export {
  ActiveIntentAnchorSchema,
  MissionAnchorSeedEventDataSchema,
  MissionAnchorSeedSchema,
  MISSION_ANCHOR_SEED_VERSION,
  type ActiveIntentAnchor,
  type MissionAnchorSeed,
} from "./mission-anchor";

export const MISSION_RECONCILIATION_VERSION = "rosso.mission-reconciliation.v1" as const;
export const MISSION_ANCHOR_ADOPTION_VERSION = "rosso.mission-anchor-adoption.v1" as const;

export const MissionAnchorAdoptionSchema = z.object({
  version: z.literal(MISSION_ANCHOR_ADOPTION_VERSION),
  id: z.string().min(1),
  missionId: z.string().min(1),
  authorityRef: z.string().min(1),
  sourceRef: z.string().min(1),
  expectedPriorEventCount: z.number().int().positive(),
  expectedPriorTimelineDigest: z.string().regex(/^[a-f0-9]{64}$/),
  anchor: ActiveIntentAnchorSchema,
}).strict().superRefine((value, context) => {
  if (value.anchor.reconciledWatermark !== 0) {
    context.addIssue({
      code: "custom",
      path: ["anchor", "reconciledWatermark"],
      message: "a legacy Mission anchor adoption must start at watermark 0",
    });
  }
});

export const MissionAnchorAdoptionEventDataSchema = z.object({
  adoptionDigest: z.string().regex(/^[a-f0-9]{64}$/),
  priorEventCount: z.number().int().positive(),
  priorTimelineDigest: z.string().regex(/^[a-f0-9]{64}$/),
  adoption: MissionAnchorAdoptionSchema,
}).strict();

export const ReconciliationDecisionSchema = z.discriminatedUnion("disposition", [
  z.object({
    disposition: z.literal("continue"),
    inputEffect: z.string().min(1),
    responseObligations: z.array(z.string().min(1)),
  }).strict(),
  z.object({
    disposition: z.literal("correction"),
    rejectedAssumption: z.string().min(1),
    newInvariant: z.string().min(1),
    affectedSurfaces: z.array(z.string().min(1)).min(1),
    nextProbe: z.string().min(1),
  }).strict(),
  z.object({
    disposition: z.literal("decision-required"),
    question: z.string().min(1),
    reason: z.string().min(1),
    affectedSurfaces: z.array(z.string().min(1)).min(1),
  }).strict(),
]);

const ContinueSubmissionSchema = ReconciliationDecisionSchema.options[0].omit({ disposition: true });
const CorrectionSubmissionSchema = ReconciliationDecisionSchema.options[1].omit({ disposition: true });
const DecisionRequiredSubmissionSchema = ReconciliationDecisionSchema.options[2].omit({ disposition: true });

export const ReconciliationInputRefSchema = MissionInputEventDataSchema.pick({
  inputId: true,
  watermark: true,
  payloadDigest: true,
}).extend({
  eventId: z.string().min(1),
}).strict();

export const MissionReconciliationProposalSchema = z.object({
  version: z.literal(MISSION_RECONCILIATION_VERSION),
  id: z.string().min(1),
  missionId: z.string().min(1),
  anchor: ActiveIntentAnchorSchema,
  anchorDigest: z.string().regex(/^[a-f0-9]{64}$/),
  inputRef: ReconciliationInputRefSchema,
  executionRef: z.object({
    cellId: z.string().min(1),
    runId: z.string().min(1),
  }).strict(),
  decision: ReconciliationDecisionSchema,
}).strict().superRefine((value, context) => {
  if (value.inputRef.watermark !== value.anchor.reconciledWatermark + 1) {
    context.addIssue({
      code: "custom",
      path: ["inputRef", "watermark"],
      message: "reconciliation must process exactly the next input watermark",
    });
  }
});

export type ReconciliationDecision = z.infer<typeof ReconciliationDecisionSchema>;
export type MissionReconciliationProposal = z.infer<typeof MissionReconciliationProposalSchema>;
export type MissionAnchorAdoption = z.infer<typeof MissionAnchorAdoptionSchema>;

export interface ReconciliationProposalRequest {
  readonly id: string;
  readonly missionId: string;
  readonly anchor: ActiveIntentAnchor;
  readonly input: MissionInputReceipt;
  readonly workspaceRoot: string;
  readonly executionProfile: ExecutionProfile;
}

export interface ReconciliationProposalOptions {
  readonly driver: CellDriver;
  readonly maxSteps?: number;
  readonly maxDurationMs?: number;
  readonly signal?: AbortSignal;
}

export type ReconciliationProposalResult =
  | { readonly kind: "proposed"; readonly proposal: MissionReconciliationProposal; readonly record: CellRunRecord }
  | { readonly kind: "unsettled"; readonly record: CellRunRecord; readonly reason: string };

/** Guarded one-input/one-anchor Work Cell. The Agent loop produces no state transition. */
export async function proposeMissionReconciliation(
  unparsedRequest: ReconciliationProposalRequest,
  options: ReconciliationProposalOptions,
): Promise<ReconciliationProposalResult> {
  const anchor = ActiveIntentAnchorSchema.parse(unparsedRequest.anchor);
  const input = unparsedRequest.input;
  assertSemanticMissionInput(input);
  if (input.watermark !== anchor.reconciledWatermark + 1) {
    throw new Error(`mission input ${input.inputId} is not the next unreconciled watermark`);
  }
  const executionProfile = ExecutionProfileSchema.parse(unparsedRequest.executionProfile);
  if (
    options.driver.descriptor.provider !== executionProfile.provider ||
    options.driver.descriptor.model !== executionProfile.model
  ) throw new Error(`reconciliation driver does not match execution profile ${executionProfile.id}`);
  const record = await runCell({
    id: `reconcile:${unparsedRequest.missionId}:${input.inputId}`,
    intent: "Compare one new semantic Mission input with the active intent anchor and submit one bounded reconciliation candidate.",
    workspace: {
      root: unparsedRequest.workspaceRoot,
      readPaths: [],
      writePaths: [],
      excludePaths: [],
      allowedCommands: [],
    },
    instructions: [
      "Compare only the supplied active anchor and semantic Mission input. Do not inspect the repository or other Mission history.",
      "A structured correction is semantic input, but its label does not pre-accept its requested transition or expand its retained authority boundary. Its implementation instruction, bounded write scope, and verification requirement are response obligations unless they revise the active Mission anchor or retained authority boundary.",
      "On continue, preserve every decision-relevant field present in a structured input as an explicit response obligation: the implementation instruction, cause and provenance, pinned subject identity including Git head and file digests, full scope including external-disclosure prohibitions, planned verification reference, and withheld authorities. Do not summarize away identifiers, exact bounds, or prohibitions.",
      "Use continue when, after applying the input, the active Mission anchor remains truthful and sufficient verbatim and the retained authority boundary is unchanged. Describe candidate or effect changes in inputEffect and preserve each still-live consequence as a response obligation.",
      "Use correction only when the next active Mission anchor statement itself must change. A payload label, file-level implementation requirement, failed probe, completed local correction, or verification result is not by itself a Mission invariant.",
      "Use decision-required when authority, meaning, or scope is ambiguous. Do not resolve ambiguity yourself.",
      "Recency is not authority. Do not rewrite the whole Mission or claim acceptance.",
      "Finish by calling exactly one disposition tool. Tool choice is the decision; provide only that tool's fields.",
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
        title: "Next Mission input",
        content: JSON.stringify({
          inputId: input.inputId,
          watermark: input.watermark,
          actorRef: input.actorRef,
          sourceRef: input.sourceRef,
          payload: input.payload,
        }, null, 2),
        sources: [input.sourceRef],
      },
    ],
    acceptance: [
      "The submitted decision compares exactly the supplied input and active anchor.",
      "Ambiguous authority, meaning, or scope is returned as decision-required.",
      "The Cell performs no mutation and does not accept or advance Mission state.",
    ],
    terminalTools: [
      {
        name: "submit_continue",
        description: "Submit when the input preserves the active Mission anchor and authority boundary; retain every structured input constraint, tactical implementation requirement, and verification requirement as explicit response obligations. This records a proposal, not acceptance.",
        inputSchema: jsonSchema(ContinueSubmissionSchema),
      },
      {
        name: "submit_correction",
        description: "Submit only when the input changes a Mission-level constraint encoded by the active anchor. This records a proposal, not acceptance.",
        inputSchema: jsonSchema(CorrectionSubmissionSchema),
      },
      {
        name: "request_decision",
        description: "Submit when authority, meaning, or scope remains ambiguous. This records a proposal, not acceptance.",
        inputSchema: jsonSchema(DecisionRequiredSubmissionSchema),
      },
    ],
    budget: {
      maxSteps: options.maxSteps ?? 4,
      maxDurationMs: options.maxDurationMs ?? 120_000,
      maxCommandOutputBytes: 16_000,
    },
    executionProfile,
  }, options.driver, {
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  });
  if (record.status !== "passed") {
    return { kind: "unsettled", record, reason: record.error ?? `reconciliation Cell ${record.status}` };
  }
  const decision = reconciliationDecisionFromRecord(record);
  if (decision === undefined) {
    return { kind: "unsettled", record, reason: "reconciliation Cell retained no valid terminal payload" };
  }
  const proposal = MissionReconciliationProposalSchema.parse({
    version: MISSION_RECONCILIATION_VERSION,
    id: unparsedRequest.id,
    missionId: unparsedRequest.missionId,
    anchor,
    anchorDigest: digestAnchor(anchor),
    inputRef: {
      inputId: input.inputId,
      watermark: input.watermark,
      eventId: input.eventId,
      payloadDigest: input.payloadDigest,
    },
    executionRef: { cellId: record.cellId, runId: record.runId },
    decision,
  });
  return { kind: "proposed", proposal, record };
}

export function digestAnchor(anchor: ActiveIntentAnchor): string {
  return digest(anchor);
}

export function assertSemanticMissionInput(input: MissionInputReceipt): void {
  if (input.payload.kind === "control") {
    throw new Error(
      `mission input ${input.inputId} is mechanical control and cannot enter semantic reconciliation`,
    );
  }
}

export function reconciliationDecisionFromRecord(
  record: CellRunRecord,
): ReconciliationDecision | undefined {
  const submissions = record.trace.filter((event) => event.type === "terminal.tool.called");
  if (submissions.length !== 1) return undefined;
  const data = asRecord(submissions[0]!.data);
  const disposition = data.name === "submit_continue"
    ? "continue"
    : data.name === "submit_correction"
      ? "correction"
      : data.name === "request_decision"
        ? "decision-required"
        : undefined;
  if (disposition === undefined) return undefined;
  const parsed = ReconciliationDecisionSchema.safeParse({ disposition, ...asRecord(data.input) });
  return parsed.success ? parsed.data : undefined;
}

function jsonSchema(schema: z.ZodType): Record<string, unknown> {
  const generated = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  const { $schema: _dialect, ...portable } = generated;
  return { ...portable, type: "object" };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}
