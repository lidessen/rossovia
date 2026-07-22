import type { ModelMessage } from "ai";
import { z } from "zod";
import { TaskSchema, UsageSchema } from "../../../packages/work-cell/src/contracts";
import { TaskStore } from "../../../packages/work-cell/src/task-store";
import {
  SWARM_OUTCOME_VERSION,
  SwarmOutcomeRecordSchema,
  type SwarmCellOutcome,
} from "../../../packages/work-cell/src/swarm";
import {
  admitPreparedDelegateBatch,
  type AdmittedDelegateBatch,
  type DelegateBatchRun,
} from "./delegate-admission";
import {
  DelegateCallSchema,
  type CompactDelegateOutcome,
  type DelegateBatchCheckpoint,
} from "./delegate-loop";
import type { MissionInputReceipt } from "./mission-input";
import { digestAnchor, type ActiveIntentAnchor } from "./mission-reconciliation";
import type {
  ChildSettledEvent,
  DelegateChildEvidence,
  DelegateChildReference,
  MissionInputReceivedEvent,
  MissionInputReconciledEvent,
  MissionAnchorSeededEvent,
  ParentPreparedEvent,
  StoredCompactOutcome,
  TimelineEvent,
} from "./delegate-timeline-events";
import { digest, stableStringify } from "./canonical-json";
import { assertReconciliationAcceptance } from "./mission-reconciliation-commit";

export { digest, stableStringify } from "./canonical-json";

const CheckpointShellSchema = z.object({
  id: z.string().min(1),
  parentLoopId: z.string().min(1),
  wholeRevision: z.string().min(1),
  parentUsage: UsageSchema,
  tasks: z.array(TaskSchema),
  invocations: z.array(z.object({
    toolCallId: z.string().min(1),
    toolName: z.enum(["delegate", "delegate_file"]),
    call: DelegateCallSchema,
    input: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("inline") }).strict(),
      z.object({
        kind: z.literal("file"),
        path: z.string().min(1),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
        bytes: z.number().int().nonnegative(),
      }).strict(),
    ]),
  }).strict()).min(1),
  responseMessages: z.array(z.unknown()),
  admission: z.unknown(),
}).strict();

export function findPrepared(events: readonly TimelineEvent[], batchId: string): ParentPreparedEvent | undefined {
  const matches = events.filter((event): event is ParentPreparedEvent =>
    event.type === "delegate.batch-prepared" && event.data.batchId === batchId
  );
  if (matches.length > 1) throw new Error(`delegate batch ${batchId} has duplicate prepared events`);
  return matches[0];
}

export function missionInputEvents(
  events: readonly TimelineEvent[],
  missionId: string,
): MissionInputReceivedEvent[] {
  const inputs = events.filter((event): event is MissionInputReceivedEvent => event.type === "mission.input-received");
  const seenIds = new Set<string>();
  for (const [index, event] of inputs.entries()) {
    if (event.timelineId !== missionId) throw new Error(`mission input event belongs to ${event.timelineId}, not ${missionId}`);
    if (event.data.watermark !== index + 1) throw new Error(`mission ${missionId} has a discontinuous input watermark`);
    if (seenIds.has(event.data.inputId)) throw new Error(`mission ${missionId} has duplicate input ${event.data.inputId}`);
    if (event.data.payloadDigest !== digest(event.data.payload)) {
      throw new Error(`mission input ${event.data.inputId} has a damaged payload digest`);
    }
    seenIds.add(event.data.inputId);
  }
  return inputs;
}

export function inputReceipt(event: MissionInputReceivedEvent): MissionInputReceipt {
  return { ...event.data, eventId: event.eventId, at: event.at };
}

export function missionAnchorSeedEvent(
  events: readonly TimelineEvent[],
  missionId: string,
): MissionAnchorSeededEvent | undefined {
  const seeds = events.filter((event): event is MissionAnchorSeededEvent =>
    event.type === "mission.anchor-seeded"
  );
  if (seeds.length > 1) throw new Error(`Mission ${missionId} has duplicate initial anchors`);
  const seed = seeds[0];
  if (seed === undefined) return undefined;
  if (seed.timelineId !== missionId || seed.data.seed.missionId !== missionId) {
    throw new Error(`Mission anchor seed does not belong to ${missionId}`);
  }
  if (seed.data.seedDigest !== digest(seed.data.seed)) {
    throw new Error(`Mission ${missionId} has a damaged initial anchor seed`);
  }
  return seed;
}

export function missionReconciliationEvents(
  events: readonly TimelineEvent[],
  missionId: string,
  inputs: readonly MissionInputReceivedEvent[],
): MissionInputReconciledEvent[] {
  const reconciliations = events.filter((event): event is MissionInputReconciledEvent =>
    event.type === "mission.input-reconciled"
  );
  const seed = missionAnchorSeedEvent(events, missionId);
  if (reconciliations.length > 0 && seed === undefined) {
    throw new Error(`Mission ${missionId} has reconciliation without an authorized initial anchor`);
  }
  let watermark = seed?.data.seed.anchor.reconciledWatermark ?? 0;
  let anchor: ActiveIntentAnchor | undefined = seed?.data.seed.anchor;
  const proposalIds = new Set<string>();
  const inputsById = new Map(inputs.map((event) => [event.data.inputId, event]));
  for (const event of reconciliations) {
    const { proposal, proposalDigest, acceptance, nextAnchorDigest } = event.data;
    if (event.timelineId !== missionId || proposal.missionId !== missionId) {
      throw new Error(`Mission reconciliation event does not belong to ${missionId}`);
    }
    if (proposalIds.has(proposal.id)) throw new Error(`Mission ${missionId} has duplicate reconciliation ${proposal.id}`);
    const input = inputsById.get(proposal.inputRef.inputId);
    if (
      input === undefined ||
      input.eventId !== proposal.inputRef.eventId ||
      input.data.watermark !== proposal.inputRef.watermark ||
      input.data.payloadDigest !== proposal.inputRef.payloadDigest
    ) throw new Error(`Mission reconciliation ${proposal.id} has damaged input evidence`);
    if (proposalDigest !== digest(proposal) || proposal.anchorDigest !== digestAnchor(proposal.anchor)) {
      throw new Error(`Mission reconciliation ${proposal.id} has damaged proposal evidence`);
    }
    assertReconciliationAcceptance(proposal, acceptance);
    if (proposal.anchor.reconciledWatermark !== watermark || proposal.inputRef.watermark !== watermark + 1) {
      throw new Error(`Mission reconciliation ${proposal.id} has discontinuous input lineage`);
    }
    if (anchor === undefined || stableStringify(anchor) !== stableStringify(proposal.anchor)) {
      throw new Error(`Mission reconciliation ${proposal.id} does not continue the active anchor`);
    }
    if (
      acceptance.nextAnchor.reconciledWatermark !== proposal.inputRef.watermark ||
      nextAnchorDigest !== digestAnchor(acceptance.nextAnchor)
    ) throw new Error(`Mission reconciliation ${proposal.id} has damaged next-anchor evidence`);
    watermark = acceptance.nextAnchor.reconciledWatermark;
    anchor = acceptance.nextAnchor;
    proposalIds.add(proposal.id);
  }
  return reconciliations;
}

export function childReferences(checkpoint: DelegateBatchCheckpoint): DelegateChildReference[] {
  return checkpoint.invocations.map((invocation) => ({
    callId: invocation.toolCallId,
    key: invocation.call.key,
    timelineId: `${checkpoint.parentLoopId}:child:${checkpoint.id}:${invocation.toolCallId}`,
  }));
}

export function requireOpened(
  events: readonly TimelineEvent[],
  checkpoint: DelegateBatchCheckpoint,
  child: DelegateChildReference,
  checkpointDigest: string,
): void {
  const openings = events.filter((event) => event.type === "delegate.child-opened");
  if (openings.length > 1) throw new Error(`child timeline ${child.timelineId} has duplicate opening events`);
  const opened = openings[0];
  if (opened === undefined) throw new Error(`child timeline ${child.timelineId} has no opening event`);
  assertChildIdentity(opened, checkpoint, child, checkpointDigest);
}

export function assertChildIdentity(
  opened: Extract<TimelineEvent, { type: "delegate.child-opened" }>,
  checkpoint: DelegateBatchCheckpoint,
  child: DelegateChildReference,
  checkpointDigest: string,
): void {
  if (
    opened.timelineId !== child.timelineId ||
    opened.data.parentTimelineId !== checkpoint.parentLoopId ||
    opened.data.batchId !== checkpoint.id ||
    opened.data.callId !== child.callId ||
    opened.data.key !== child.key ||
    opened.data.checkpointDigest !== checkpointDigest
  ) throw new Error(`child timeline ${child.timelineId} conflicts with its parent reference`);
}

export function requireDispatched(
  events: readonly TimelineEvent[],
  checkpoint: DelegateBatchCheckpoint,
  child: DelegateChildReference,
  checkpointDigest: string,
): void {
  const dispatched = events.filter((event) => event.type === "delegate.child-dispatched");
  if (dispatched.length === 0) throw new Error(`child timeline ${child.timelineId} settled without dispatch`);
  if (dispatched.length > 1) throw new Error(`child timeline ${child.timelineId} has duplicate dispatch events`);
  const event = dispatched[0]!;
  if (
    event.data.batchId !== checkpoint.id ||
    event.data.callId !== child.callId ||
    event.data.checkpointDigest !== checkpointDigest
  ) throw new Error(`child timeline ${child.timelineId} has a conflicting dispatch event`);
}

export function findSettlement(
  events: readonly TimelineEvent[],
  checkpoint: DelegateBatchCheckpoint,
  child: DelegateChildReference,
  checkpointDigest: string,
): ChildSettledEvent | undefined {
  const settled = events.filter((event): event is ChildSettledEvent => event.type === "delegate.child-settled");
  if (settled.length > 1) throw new Error(`child timeline ${child.timelineId} has duplicate settlement events`);
  const result = settled[0];
  if (result !== undefined) assertSettlementIdentity(result, checkpoint, child, checkpointDigest);
  return result;
}

export function assertSettlementIdentity(
  result: ChildSettledEvent,
  checkpoint: DelegateBatchCheckpoint,
  child: DelegateChildReference,
  checkpointDigest: string,
): void {
  if (
    result.data.batchId !== checkpoint.id ||
    result.data.callId !== child.callId ||
    result.data.checkpointDigest !== checkpointDigest ||
    result.data.outcome.key !== child.key
  ) throw new Error(`child timeline ${child.timelineId} has a conflicting settlement identity`);
}

export function evidenceFor(run: DelegateBatchRun, index: number): DelegateChildEvidence {
  if (run.kind === "direct") {
    if (index !== 0) throw new Error("direct delegate execution produced more than one settlement");
    return { kind: "cell-run", record: run.record };
  }
  const outcome = run.record.outcomes[index];
  if (outcome === undefined) throw new Error(`Swarm delegate execution omitted settlement index ${index}`);
  if (outcome.kind === "settled") return { kind: "cell-run", record: outcome.record };
  return { kind: "runner-error", record: persistedRunnerError(outcome) };
}

export function compactOutcome(value: StoredCompactOutcome): CompactDelegateOutcome {
  return {
    key: value.key,
    cellId: value.cellId,
    status: value.status,
    artifactRefs: value.artifactRefs,
    ...(value.runId === undefined ? {} : { runId: value.runId }),
  };
}

export function parseCheckpoint(value: unknown): DelegateBatchCheckpoint {
  const shell = CheckpointShellSchema.parse(value);
  if (typeof shell.admission !== "object" || shell.admission === null) {
    throw new Error(`delegate checkpoint ${shell.id} has no admitted batch`);
  }
  const raw = shell.admission as Partial<AdmittedDelegateBatch>;
  const admission = admitPreparedDelegateBatch({
    id: raw.id as string,
    whole: raw.whole as AdmittedDelegateBatch["whole"],
    contributions: raw.contributions as AdmittedDelegateBatch["contributions"],
  });
  if (stableStringify(admission) !== stableStringify(shell.admission)) {
    throw new Error(`delegate checkpoint ${shell.id} admission cannot be reconstructed exactly`);
  }
  if (shell.id !== admission.id || shell.wholeRevision !== admission.whole.revision) {
    throw new Error(`delegate checkpoint ${shell.id} does not match its admitted batch`);
  }
  const admittedKeys = admission.contributions.map((contribution) => contribution.key);
  const invocationKeys = shell.invocations.map((invocation) => invocation.call.key);
  if (stableStringify(admittedKeys) !== stableStringify(invocationKeys)) {
    throw new Error(`delegate checkpoint ${shell.id} invocation order does not match admission`);
  }
  const tasks = new TaskStore(shell.tasks);
  for (const invocation of shell.invocations) {
    const task = tasks.get(invocation.call.taskId);
    if (task.status !== "in_progress" || task.owner !== `delegate:${invocation.call.key}`) {
      throw new Error(
        `delegate checkpoint ${shell.id} does not bind task ${task.id} to ${invocation.call.key}`,
      );
    }
  }
  return { ...shell, responseMessages: shell.responseMessages as ModelMessage[], admission };
}

export function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function persistedRunnerError(outcome: Extract<SwarmCellOutcome, { kind: "runner_error" }>) {
  return SwarmOutcomeRecordSchema.parse({
    ...outcome,
    version: SWARM_OUTCOME_VERSION,
    startedAt: outcome.startedAt.toISOString(),
    finishedAt: outcome.finishedAt.toISOString(),
  });
}
