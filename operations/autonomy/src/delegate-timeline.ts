import { randomUUID } from "node:crypto";
import { closeSync, fsyncSync, openSync, readFileSync } from "node:fs";
import { mkdir, open, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CellRunRecord } from "../../../packages/work-cell/src/contracts";
import {
  type DelegateBatchRun,
} from "./delegate-admission";
import {
  type CompactDelegateOutcome,
  type DelegateBatchCheckpoint,
  type DelegateResultProjection,
  type DelegateTimeline,
} from "./delegate-loop";
import {
  MissionInputDraftSchema,
  type MissionInputDraft,
  type MissionInputLog,
  type MissionInputReceipt,
} from "./mission-input";
import {
  assertReconciliationAcceptance,
  MissionReconciliationCommitSchema,
  type MissionReconciliationCommit,
  type MissionReconciliationLog,
} from "./mission-reconciliation-commit";
import {
  ActiveIntentAnchorSchema,
  MissionAnchorAdoptionSchema,
  MissionAnchorSeedSchema,
  digestAnchor,
  type ActiveIntentAnchor,
  type MissionAnchorAdoption,
  type MissionAnchorSeed,
} from "./mission-reconciliation";
import {
  MissionTurnRecoverySchema,
  MissionTurnSettlementSchema,
  MissionTurnStartSchema,
  type MissionTurnLog,
  type MissionTurnRecovery,
  type MissionTurnSettlement,
  type MissionTurnStart,
  type MissionTurnState,
  missionTurnNeedsRecovery,
} from "./mission-turn";
import {
  CompactOutcomeSchema,
  TIMELINE_EVENT_VERSION,
  TimelineEventSchema,
  type ChildSettledEvent,
  type DelegateChildReference,
  type ParentPreparedEvent,
  type TimelineEvent,
  type TimelineEventDraft,
} from "./delegate-timeline-events";
import {
  assertChildIdentity,
  assertSettlementIdentity,
  childReferences,
  compactOutcome,
  digest,
  evidenceFor,
  findPrepared,
  findSettlement,
  inputReceipt,
  isMissing,
  missionInputEvents,
  missionAnchorAdoptionEvent,
  missionAuthorizedAnchor,
  missionAnchorSeedEvent,
  missionReconciliationEvents,
  parseCheckpoint,
  requireDispatched,
  requireOpened,
  stableStringify,
} from "./mission-timeline-state";

export type { DelegateChildReference } from "./delegate-timeline-events";

export interface RecoveredDelegateBatch {
  readonly checkpoint: DelegateBatchCheckpoint;
  readonly children: readonly DelegateChildReference[];
  readonly outcomes?: readonly CompactDelegateOutcome[];
  readonly run?: DelegateBatchRun;
  readonly ready: boolean;
}

const MAX_DELEGATE_RESULT_PROJECTION_BYTES = 32 * 1024;

/**
 * Local foreground carrier for one parent timeline and independent child
 * timelines. It is process-serialized and fsyncs each event, but does not claim
 * cross-process writer coordination.
 */
export class FileMissionTimeline implements DelegateTimeline, MissionInputLog, MissionReconciliationLog, MissionTurnLog {
  private readonly locks = new Map<string, Promise<void>>();

  constructor(
    private readonly root: string,
    private readonly now: () => string = () => new Date().toISOString(),
    /**
     * The durability boundary the synchronous read path joins before
     * accepting any observed event: defaults to fsyncing the read file so a
     * terminal line counts only after the writer's durability barrier is
     * joined. A throwing seam fails the synchronous read visibly.
     */
    private readonly syncDurability: (path: string) => void = fsyncFileDurability,
  ) {}

  async appendInput(missionId: string, unparsedInput: MissionInputDraft): Promise<MissionInputReceipt> {
    const input = MissionInputDraftSchema.parse(unparsedInput);
    const payloadDigest = digest(input.payload);
    await this.mutateTimeline(missionId, (events) => {
      const inputs = missionInputEvents(events, missionId);
      const existing = inputs.find((event) => event.data.inputId === input.id);
      if (existing !== undefined) {
        if (
          existing.data.actorRef !== input.actorRef ||
          existing.data.sourceRef !== input.sourceRef ||
          existing.data.payloadDigest !== payloadDigest ||
          stableStringify(existing.data.payload) !== stableStringify(input.payload)
        ) throw new Error(`mission input ${input.id} conflicts with its recorded event`);
        return undefined;
      }
      return {
        type: "mission.input-received",
        data: {
          inputId: input.id,
          watermark: inputs.length + 1,
          actorRef: input.actorRef,
          sourceRef: input.sourceRef,
          payload: input.payload,
          payloadDigest,
        },
      };
    });
    const event = missionInputEvents(await this.readTimeline(missionId), missionId)
      .find((candidate) => candidate.data.inputId === input.id);
    if (event === undefined) throw new Error(`mission input ${input.id} was not retained`);
    return inputReceipt(event);
  }

  async currentInputWatermark(missionId: string): Promise<number> {
    return missionInputEvents(await this.readTimeline(missionId), missionId).length;
  }

  async readInputsAfter(missionId: string, watermark: number): Promise<readonly MissionInputReceipt[]> {
    if (!Number.isInteger(watermark) || watermark < 0) {
      throw new Error("mission input watermark must be a non-negative integer");
    }
    return missionInputEvents(await this.readTimeline(missionId), missionId)
      .filter((event) => event.data.watermark > watermark)
      .map(inputReceipt);
  }

  async seedAnchor(unparsedSeed: MissionAnchorSeed): Promise<void> {
    const seed = MissionAnchorSeedSchema.parse(unparsedSeed);
    const seedDigest = digest(seed);
    await this.mutateTimeline(seed.missionId, (events) => {
      if (missionAnchorAdoptionEvent(events, seed.missionId) !== undefined) {
        throw new Error(`Mission ${seed.missionId} already has an authorized legacy anchor adoption`);
      }
      const existing = missionAnchorSeedEvent(events, seed.missionId);
      if (existing !== undefined) {
        if (existing.data.seedDigest !== seedDigest || stableStringify(existing.data.seed) !== stableStringify(seed)) {
          throw new Error(`Mission ${seed.missionId} conflicts with its authorized initial anchor`);
        }
        return undefined;
      }
      if (events.length > 0) {
        throw new Error(`Mission ${seed.missionId} must authorize its initial anchor before other events`);
      }
      return { type: "mission.anchor-seeded", data: { seedDigest, seed } };
    });
  }

  async adoptLegacyAnchor(unparsedAdoption: MissionAnchorAdoption): Promise<void> {
    const adoption = MissionAnchorAdoptionSchema.parse(unparsedAdoption);
    const adoptionDigest = digest(adoption);
    await this.mutateTimeline(adoption.missionId, (events) => {
      if (missionAnchorSeedEvent(events, adoption.missionId) !== undefined) {
        throw new Error(`Mission ${adoption.missionId} already has an authorized initial anchor`);
      }
      const existing = missionAnchorAdoptionEvent(events, adoption.missionId);
      if (existing !== undefined) {
        if (
          existing.data.adoptionDigest !== adoptionDigest
          || stableStringify(existing.data.adoption) !== stableStringify(adoption)
        ) {
          throw new Error(`Mission ${adoption.missionId} conflicts with its authorized legacy anchor adoption`);
        }
        return undefined;
      }
      if (events.length === 0) {
        throw new Error(
          `Mission ${adoption.missionId} has no legacy events; use an initial anchor seed`,
        );
      }
      if (
        adoption.expectedPriorEventCount !== events.length
        || adoption.expectedPriorTimelineDigest !== digest(events)
      ) {
        throw new Error(
          `Mission ${adoption.missionId} legacy anchor adoption does not match its expected prior timeline`,
        );
      }
      if (events.some((event) => event.type === "mission.input-reconciled")) {
        throw new Error(`Mission ${adoption.missionId} cannot adopt an anchor after reconciliation`);
      }
      const activeTurn = missionTurns(events).find(missionTurnNeedsRecovery);
      if (activeTurn !== undefined) {
        throw new Error(
          `Mission ${adoption.missionId} cannot adopt an anchor while turn ${activeTurn.start.turnId} is unsettled`,
        );
      }
      const nonzeroTurn = events.find(
        (event) =>
          event.type === "mission.turn-started"
          && event.data.start.baselineWatermark !== 0,
      );
      if (nonzeroTurn?.type === "mission.turn-started") {
        throw new Error(
          `Mission ${adoption.missionId} cannot adopt an anchor after turn ${nonzeroTurn.data.start.turnId} started from nonzero baseline`,
        );
      }
      return {
        type: "mission.anchor-adopted",
        data: {
          adoptionDigest,
          priorEventCount: adoption.expectedPriorEventCount,
          priorTimelineDigest: adoption.expectedPriorTimelineDigest,
          adoption,
        },
      };
    });
  }

  async commitReconciliation(unparsedCommit: MissionReconciliationCommit): Promise<void> {
    const commit = MissionReconciliationCommitSchema.parse(unparsedCommit);
    const missionId = commit.proposal.missionId;
    assertReconciliationAcceptance(commit.proposal, commit.acceptance);
    await this.mutateTimeline(missionId, (events) => {
      const inputs = missionInputEvents(events, missionId);
      const reconciliations = missionReconciliationEvents(events, missionId, inputs);
      const previousAnchor = reconciliations.at(-1)?.data.acceptance.nextAnchor
        ?? missionAuthorizedAnchor(events, missionId);
      if (previousAnchor === undefined) {
        throw new Error(`Mission ${missionId} has no authorized initial anchor`);
      }
      const proposal = commit.proposal;
      const input = inputs.find((event) => event.data.inputId === proposal.inputRef.inputId);
      if (
        input === undefined ||
        input.eventId !== proposal.inputRef.eventId ||
        input.data.watermark !== proposal.inputRef.watermark ||
        input.data.payloadDigest !== proposal.inputRef.payloadDigest
      ) throw new Error(`reconciliation proposal ${proposal.id} does not match its Mission input`);
      const proposalDigest = digest(proposal);
      const nextAnchor = ActiveIntentAnchorSchema.parse(commit.acceptance.nextAnchor);
      const nextAnchorDigest = digestAnchor(nextAnchor);
      const existing = reconciliations.find((event) => event.data.proposal.id === proposal.id);
      if (existing !== undefined) {
        if (
          existing.data.proposalDigest !== proposalDigest ||
          existing.data.nextAnchorDigest !== nextAnchorDigest ||
          stableStringify(existing.data.acceptance) !== stableStringify(commit.acceptance)
        ) throw new Error(`reconciliation proposal ${proposal.id} conflicts with its committed event`);
        return undefined;
      }
      const expectedWatermark = previousAnchor?.reconciledWatermark ?? 0;
      if (proposal.anchor.reconciledWatermark !== expectedWatermark) {
        throw new Error(`reconciliation proposal ${proposal.id} does not start at the current reconciled watermark`);
      }
      if (stableStringify(previousAnchor) !== stableStringify(proposal.anchor)) {
        throw new Error(`reconciliation proposal ${proposal.id} does not use the current active anchor`);
      }
      if (proposal.anchorDigest !== digestAnchor(proposal.anchor)) {
        throw new Error(`reconciliation proposal ${proposal.id} has a damaged anchor digest`);
      }
      if (proposal.inputRef.watermark !== expectedWatermark + 1) {
        throw new Error(`reconciliation proposal ${proposal.id} skips an input watermark`);
      }
      return {
        type: "mission.input-reconciled",
        data: { proposalDigest, nextAnchorDigest, proposal, acceptance: commit.acceptance },
      };
    });
  }

  async latestReconciledAnchor(missionId: string): Promise<ActiveIntentAnchor | undefined> {
    const events = await this.readTimeline(missionId);
    const inputs = missionInputEvents(events, missionId);
    return missionReconciliationEvents(events, missionId, inputs).at(-1)?.data.acceptance.nextAnchor
      ?? missionAuthorizedAnchor(events, missionId);
  }

  async startTurn(missionId: string, unparsedStart: MissionTurnStart): Promise<void> {
    const start = MissionTurnStartSchema.parse(unparsedStart);
    const startDigest = digest(start);
    await this.mutateTimeline(missionId, (events) => {
      const turns = missionTurns(events);
      if (turns.some((turn) => turn.start.turnId === start.turnId)) {
        throw new Error(`mission turn ${start.turnId} already exists; interrupted turns require explicit recovery`);
      }
      const open = turns.find(missionTurnNeedsRecovery);
      if (open !== undefined) {
        throw new Error(`mission turn ${open.start.turnId} is still open and cannot be replayed automatically`);
      }
      const inputs = missionInputEvents(events, missionId);
      const reconciledWatermark = missionReconciliationEvents(events, missionId, inputs)
        .at(-1)?.data.acceptance.nextAnchor.reconciledWatermark
        ?? missionAuthorizedAnchor(events, missionId)?.reconciledWatermark
        ?? 0;
      if (start.baselineWatermark !== reconciledWatermark) {
        throw new Error(
          `mission turn ${start.turnId} baseline ${start.baselineWatermark} does not match reconciled watermark ${reconciledWatermark}`,
        );
      }
      const activeAnchor = missionReconciliationEvents(events, missionId, inputs)
        .at(-1)?.data.acceptance.nextAnchor
        ?? missionAuthorizedAnchor(events, missionId);
      if (activeAnchor === undefined && start.anchorDigest !== undefined) {
        throw new Error(`mission turn ${start.turnId} names an anchor but the Mission has none`);
      }
      if (activeAnchor !== undefined && start.anchorDigest !== digestAnchor(activeAnchor)) {
        throw new Error(`mission turn ${start.turnId} does not bind the current intent anchor`);
      }
      return {
        type: "mission.turn-started",
        data: { startDigest, start },
      };
    });
  }

  async recoverTurn(missionId: string, unparsedRecovery: MissionTurnRecovery): Promise<void> {
    const recovery = MissionTurnRecoverySchema.parse(unparsedRecovery);
    const recoveryDigest = digest(recovery);
    await this.mutateTimeline(missionId, (events) => {
      const turns = missionTurns(events);
      const existing = turns
        .flatMap((turn) => turn.recoveries ?? [])
        .find((candidate) => candidate.id === recovery.id);
      if (existing !== undefined) {
        if (digest(existing) !== recoveryDigest) {
          throw new Error(`mission turn recovery ${recovery.id} conflicts with its recorded event`);
        }
        return undefined;
      }
      const interrupted = turns.at(-1);
      if (interrupted === undefined || interrupted.start.turnId !== recovery.interruptedTurnId) {
        throw new Error(`mission turn ${recovery.interruptedTurnId} is not the latest interrupted turn`);
      }
      if (!missionTurnNeedsRecovery(interrupted)) {
        throw new Error(`mission turn ${recovery.interruptedTurnId} is not recoverable`);
      }
      const inputs = missionInputEvents(events, missionId);
      const activeAnchor = missionReconciliationEvents(events, missionId, inputs)
        .at(-1)?.data.acceptance.nextAnchor
        ?? missionAuthorizedAnchor(events, missionId);
      const reconciledWatermark = activeAnchor?.reconciledWatermark ?? 0;
      if (inputs.length !== reconciledWatermark) {
        throw new Error(`mission ${missionId} has unreconciled input and cannot recover a turn`);
      }
      if (recovery.action.kind === "resume") {
        if (interrupted.start.baselineWatermark !== reconciledWatermark) {
          throw new Error(`mission turn ${recovery.interruptedTurnId} has a stale recovery baseline`);
        }
        if (interrupted.start.anchorDigest !== (activeAnchor === undefined ? undefined : digestAnchor(activeAnchor))) {
          throw new Error(`mission turn ${recovery.interruptedTurnId} has a stale recovery anchor`);
        }
      }
      if (recovery.action.kind === "replace") {
        const replacement = recovery.action.replacement;
        if (replacement.turnId === interrupted.start.turnId) {
          throw new Error(`replacement turn must not reuse interrupted turn ${interrupted.start.turnId}`);
        }
        if (turns.some((turn) => turn.start.turnId === replacement.turnId)) {
          throw new Error(`replacement turn ${replacement.turnId} already exists`);
        }
        if (replacement.baselineWatermark !== reconciledWatermark) {
          throw new Error(
            `replacement turn ${replacement.turnId} baseline ${replacement.baselineWatermark} does not match reconciled watermark ${reconciledWatermark}`,
          );
        }
        if (replacement.anchorDigest !== (activeAnchor === undefined ? undefined : digestAnchor(activeAnchor))) {
          throw new Error(`replacement turn ${replacement.turnId} does not bind the current intent anchor`);
        }
      }
      return {
        type: "mission.turn-recovered",
        data: {
          interruptedStartDigest: digest(interrupted.start),
          recoveryDigest,
          recovery,
        },
      };
    });
  }

  async findTurnRecovery(missionId: string, recoveryId: string): Promise<MissionTurnRecovery | undefined> {
    return missionTurns(await this.readTimeline(missionId))
      .flatMap((turn) => turn.recoveries ?? [])
      .find((recovery) => recovery.id === recoveryId);
  }

  async settleTurn(
    missionId: string,
    turnId: string,
    unparsedSettlement: MissionTurnSettlement,
  ): Promise<void> {
    const settlement = MissionTurnSettlementSchema.parse(unparsedSettlement);
    const settlementDigest = digest(settlement);
    await this.mutateTimeline(missionId, (events) => {
      const turn = missionTurns(events).find((candidate) => candidate.start.turnId === turnId);
      if (turn === undefined) throw new Error(`mission turn ${turnId} was not started`);
      if (!missionTurnNeedsRecovery(turn) && turn.settlement === undefined) {
        throw new Error(`mission turn ${turnId} was replaced or abandoned and cannot settle`);
      }
      if (turn.settlement !== undefined) {
        if (digest(turn.settlement) !== settlementDigest) {
          throw new Error(`mission turn ${turnId} has a conflicting settlement`);
        }
        return undefined;
      }
      return {
        type: "mission.turn-settled",
        data: {
          turnId,
          startDigest: digest(turn.start),
          settlementDigest,
          settlement,
        },
      };
    });
  }

  async latestTurn(missionId: string): Promise<MissionTurnState | undefined> {
    return missionTurns(await this.readTimeline(missionId)).at(-1);
  }

  async prepareBatch(checkpoint: DelegateBatchCheckpoint): Promise<void> {
    const parsed = parseCheckpoint(checkpoint);
    const checkpointDigest = digest(parsed);
    const children = childReferences(parsed);
    await this.mutateTimeline(parsed.parentLoopId, (events) => {
      const existing = findPrepared(events, parsed.id);
      if (existing !== undefined) {
        if (existing.data.checkpointDigest !== checkpointDigest) {
          throw new Error(`delegate batch ${parsed.id} conflicts with its prepared parent event`);
        }
        return undefined;
      }
      return {
        type: "delegate.batch-prepared",
        data: { batchId: parsed.id, checkpointDigest, checkpoint: parsed, children },
      };
    });

    // Parent intent is recorded first. Missing child-open events can then be
    // repaired idempotently before execution, without merging child history
    // into the parent timeline.
    for (const child of children) {
      await this.mutateTimeline(child.timelineId, (events) => {
        const openings = events.filter((event) => event.type === "delegate.child-opened");
        if (openings.length > 1) throw new Error(`child timeline ${child.timelineId} has duplicate opening events`);
        const opened = openings[0];
        if (opened !== undefined) {
          assertChildIdentity(opened, parsed, child, checkpointDigest);
          return undefined;
        }
        if (events.length > 0) throw new Error(`child timeline ${child.timelineId} has no opening event`);
        return {
          type: "delegate.child-opened",
          data: {
            parentTimelineId: parsed.parentLoopId,
            batchId: parsed.id,
            checkpointDigest,
            callId: child.callId,
            key: child.key,
          },
        };
      });
    }
  }

  async markBatchDispatched(checkpoint: DelegateBatchCheckpoint): Promise<void> {
    const prepared = await this.requirePrepared(checkpoint);
    for (const child of prepared.data.children) {
      await this.mutateTimeline(child.timelineId, (events) => {
        requireOpened(events, checkpoint, child, prepared.data.checkpointDigest);
        const dispatched = events.filter((event) => event.type === "delegate.child-dispatched");
        if (dispatched.length > 1) throw new Error(`child timeline ${child.timelineId} has duplicate dispatch events`);
        const existing = dispatched[0];
        if (existing !== undefined) {
          if (
            existing.data.batchId !== checkpoint.id ||
            existing.data.callId !== child.callId ||
            existing.data.checkpointDigest !== prepared.data.checkpointDigest
          ) throw new Error(`child timeline ${child.timelineId} has a conflicting dispatch event`);
          return undefined;
        }
        return {
          type: "delegate.child-dispatched",
          data: {
            batchId: checkpoint.id,
            checkpointDigest: prepared.data.checkpointDigest,
            callId: child.callId,
          },
        };
      });
    }
  }

  async recordBatchSettlements(input: {
    readonly checkpoint: DelegateBatchCheckpoint;
    readonly run: DelegateBatchRun;
    readonly outcomes: readonly CompactDelegateOutcome[];
  }): Promise<void> {
    const prepared = await this.requirePrepared(input.checkpoint);
    if (input.outcomes.length !== prepared.data.children.length) {
      throw new Error(`delegate batch ${input.checkpoint.id} returned an incomplete settlement set`);
    }
    const outcomesByKey = new Map(input.outcomes.map((outcome) => [outcome.key, outcome]));
    if (outcomesByKey.size !== input.outcomes.length) {
      throw new Error(`delegate batch ${input.checkpoint.id} returned duplicate settlement keys`);
    }

    for (const [index, child] of prepared.data.children.entries()) {
      const outcome = outcomesByKey.get(child.key);
      if (outcome === undefined) throw new Error(`delegate batch ${input.checkpoint.id} omitted settlement ${child.key}`);
      const storedOutcome = CompactOutcomeSchema.parse({
        ...outcome,
        artifactRefs: [...outcome.artifactRefs],
      });
      const evidence = evidenceFor(input.run, index);
      const persistedSettlement = JSON.parse(JSON.stringify({
        outcome: storedOutcome,
        evidence,
      })) as { outcome: typeof storedOutcome; evidence: typeof evidence };
      const settlementDigest = digest(persistedSettlement);
      await this.mutateTimeline(child.timelineId, (events) => {
        requireOpened(events, input.checkpoint, child, prepared.data.checkpointDigest);
        requireDispatched(events, input.checkpoint, child, prepared.data.checkpointDigest);
        const existing = events.find((event): event is ChildSettledEvent => event.type === "delegate.child-settled");
        if (existing !== undefined) {
          assertSettlementIdentity(existing, input.checkpoint, child, prepared.data.checkpointDigest);
          if (existing.data.settlementDigest !== settlementDigest) {
            throw new Error(`child timeline ${child.timelineId} has a conflicting settlement`);
          }
          return undefined;
        }
        return {
          type: "delegate.child-settled",
          data: {
            batchId: input.checkpoint.id,
            checkpointDigest: prepared.data.checkpointDigest,
            callId: child.callId,
            settlementDigest,
            outcome: persistedSettlement.outcome,
            evidence: persistedSettlement.evidence,
          },
        };
      });
    }
  }

  async resolveBatch(checkpoint: DelegateBatchCheckpoint): Promise<readonly CompactDelegateOutcome[] | undefined> {
    const prepared = await this.requirePrepared(checkpoint);
    const settled: ChildSettledEvent[] = [];
    for (const child of prepared.data.children) {
      const events = await this.readTimeline(child.timelineId);
      requireOpened(events, checkpoint, child, prepared.data.checkpointDigest);
      const settlement = findSettlement(events, checkpoint, child, prepared.data.checkpointDigest);
      if (settlement === undefined) return undefined;
      settled.push(settlement);
    }

    await this.mutateTimeline(checkpoint.parentLoopId, (events) => {
      const existing = events.find((event): event is Extract<TimelineEvent, { type: "delegate.batch-ready" }> =>
        event.type === "delegate.batch-ready" && event.data.batchId === checkpoint.id
      );
      const children = settled.map((event, index) => ({
        callId: prepared.data.children[index]!.callId,
        timelineId: prepared.data.children[index]!.timelineId,
        settlementDigest: event.data.settlementDigest,
      }));
      if (existing !== undefined) {
        if (
          existing.data.checkpointDigest !== prepared.data.checkpointDigest ||
          digest(existing.data.children) !== digest(children)
        ) {
          throw new Error(`delegate batch ${checkpoint.id} has a conflicting ready barrier`);
        }
        return undefined;
      }
      return {
        type: "delegate.batch-ready",
        data: {
          batchId: checkpoint.id,
          checkpointDigest: prepared.data.checkpointDigest,
          children,
        },
      };
    });
    return settled.map((event, index) => ({
      ...compactOutcome(event.data.outcome),
      resultFile: this.timelinePath(prepared.data.children[index]!.timelineId),
    }));
  }

  async readResult(
    parentLoopId: string,
    batchId: string,
    key: string,
  ): Promise<DelegateResultProjection> {
    const parent = await this.readTimeline(parentLoopId);
    const prepared = findPrepared(parent, batchId);
    if (prepared === undefined) {
      throw new Error(`delegate batch ${batchId} is not present in parent timeline ${parentLoopId}`);
    }
    const checkpoint = parseCheckpoint(prepared.data.checkpoint);
    const child = prepared.data.children.find((candidate) => candidate.key === key);
    if (child === undefined) {
      throw new Error(`delegate batch ${batchId} has no child result for ${key}`);
    }
    const events = await this.readTimeline(child.timelineId);
    requireOpened(events, checkpoint, child, prepared.data.checkpointDigest);
    const settlement = findSettlement(events, checkpoint, child, prepared.data.checkpointDigest);
    if (settlement === undefined) {
      throw new Error(`delegate child ${batchId}/${key} has not settled`);
    }

    const evidence = settlement.data.evidence;
    if (evidence.kind === "runner-error") {
      const serialized = stableStringify(evidence.record);
      return {
        receipt: {
          batchId,
          key,
          cellId: settlement.data.outcome.cellId,
          status: settlement.data.outcome.status,
          settlementDigest: settlement.data.settlementDigest,
          semanticDigest: digest(evidence.record),
          semanticBytes: Buffer.byteLength(serialized, "utf8"),
          projection: "metadata-only",
        },
        omission: {
          reason: "runner-error",
          maxBytes: MAX_DELEGATE_RESULT_PROJECTION_BYTES,
        },
      };
    }

    const semantic = {
      finalText: evidence.record.finalText,
      ...(evidence.record.output === undefined ? {} : { output: evidence.record.output }),
      artifacts: evidence.record.artifacts,
      verification: evidence.record.verification,
    };
    const serialized = stableStringify(semantic);
    const semanticBytes = Buffer.byteLength(serialized, "utf8");
    const receipt = {
      batchId,
      key,
      cellId: settlement.data.outcome.cellId,
      status: settlement.data.outcome.status,
      settlementDigest: settlement.data.settlementDigest,
      semanticDigest: digest(semantic),
      semanticBytes,
      projection: semanticBytes <= MAX_DELEGATE_RESULT_PROJECTION_BYTES
        ? "full" as const
        : "metadata-only" as const,
    };
    if (semanticBytes > MAX_DELEGATE_RESULT_PROJECTION_BYTES) {
      return {
        receipt,
        omission: {
          reason: "projection-too-large",
          maxBytes: MAX_DELEGATE_RESULT_PROJECTION_BYTES,
        },
      };
    }
    return { receipt, semantic };
  }

  async recoverBatch(parentTimelineId: string, batchId: string): Promise<RecoveredDelegateBatch> {
    const parent = await this.readTimeline(parentTimelineId);
    const prepared = findPrepared(parent, batchId);
    if (prepared === undefined) throw new Error(`delegate batch ${batchId} is not present in parent timeline ${parentTimelineId}`);
    const checkpoint = parseCheckpoint(prepared.data.checkpoint);
    const outcomes: CompactDelegateOutcome[] = [];
    const settlements: ChildSettledEvent[] = [];
    for (const child of prepared.data.children) {
      const events = await this.readTimeline(child.timelineId);
      requireOpened(events, checkpoint, child, prepared.data.checkpointDigest);
      const settlement = findSettlement(events, checkpoint, child, prepared.data.checkpointDigest);
      if (settlement === undefined) {
        return { checkpoint, children: prepared.data.children, ready: false };
      }
      settlements.push(settlement);
      outcomes.push({
        ...compactOutcome(settlement.data.outcome),
        resultFile: this.timelinePath(child.timelineId),
      });
    }
    const onlySettlement = settlements[0];
    const run =
      settlements.length === 1
      && checkpoint.admission.contributions.length === 1
      && onlySettlement?.data.evidence.kind === "cell-run"
        ? {
          kind: "direct" as const,
          admission: checkpoint.admission,
          record: onlySettlement.data.evidence.record as CellRunRecord,
        }
        : undefined;
    return {
      checkpoint,
      children: prepared.data.children,
      outcomes,
      ...(run === undefined ? {} : { run }),
      ready: true,
    };
  }

  timelinePath(timelineId: string): string {
    return join(this.root, "timelines", `${digest(timelineId)}.jsonl`);
  }

  /**
   * The exact durable start cross-link of one prepared AND dispatched batch,
   * joined to the durability boundary: the prepared checkpoint digest and
   * the child timeline identity, or undefined when the batch was never
   * prepared. A prepared batch without an exact dispatched event throws, so
   * a caller can never treat a merely reserved batch as started.
   */
  durableStartLinkSync(
    parentTimelineId: string,
    batchId: string,
  ): { checkpointDigest: string; childTimelineId: string } | undefined {
    const parent = this.readTimelineSync(parentTimelineId);
    const prepared = findPrepared(parent, batchId);
    if (prepared === undefined) return undefined;
    const checkpoint = parseCheckpoint(prepared.data.checkpoint);
    const child = prepared.data.children[0];
    if (child === undefined) {
      throw new Error(`delegate batch ${batchId} has no child references`);
    }
    const events = this.readTimelineSync(child.timelineId);
    requireOpened(events, checkpoint, child, prepared.data.checkpointDigest);
    requireDispatched(events, checkpoint, child, prepared.data.checkpointDigest);
    return {
      checkpointDigest: prepared.data.checkpointDigest,
      childTimelineId: child.timelineId,
    };
  }

  /**
   * Synchronously verify one exact child's durable terminal settlement, for
   * an effect that must derive a canonical fact from the timeline immediately
   * before acting. Reads take no writer lock and drop an incomplete tail
   * exactly like the async read. An absent batch or child, an opening that
   * fails exact validation, or an unreadable timeline throws; a child that
   * has not settled returns false. This is evidence read, never settlement
   * fabrication.
   */
  hasTerminalSettlementSync(parentTimelineId: string, batchId: string, key: string): boolean {
    const parent = this.readTimelineSync(parentTimelineId);
    const prepared = findPrepared(parent, batchId);
    if (prepared === undefined) {
      throw new Error(`delegate batch ${batchId} is not present in parent timeline ${parentTimelineId}`);
    }
    const checkpoint = parseCheckpoint(prepared.data.checkpoint);
    const child = prepared.data.children.find((candidate) => candidate.key === key);
    if (child === undefined) {
      throw new Error(`delegate batch ${batchId} has no child result for ${key}`);
    }
    const events = this.readTimelineSync(child.timelineId);
    requireOpened(events, checkpoint, child, prepared.data.checkpointDigest);
    return findSettlement(events, checkpoint, child, prepared.data.checkpointDigest) !== undefined;
  }

  /** Read the validated append-only source for a bounded external projection. */
  async readEvents(timelineId: string): Promise<readonly TimelineEvent[]> {
    return await this.readTimeline(timelineId);
  }

  private async requirePrepared(checkpoint: DelegateBatchCheckpoint): Promise<ParentPreparedEvent> {
    const parsed = parseCheckpoint(checkpoint);
    const events = await this.readTimeline(parsed.parentLoopId);
    const prepared = findPrepared(events, parsed.id);
    if (prepared === undefined) throw new Error(`delegate batch ${parsed.id} was not prepared on its parent timeline`);
    if (prepared.data.checkpointDigest !== digest(parsed)) {
      throw new Error(`delegate batch ${parsed.id} does not match its prepared checkpoint`);
    }
    if (stableStringify(prepared.data.children) !== stableStringify(childReferences(parsed))) {
      throw new Error(`delegate batch ${parsed.id} has conflicting child references`);
    }
    return prepared;
  }

  private async mutateTimeline(
    timelineId: string,
    decide: (events: readonly TimelineEvent[]) => TimelineEventDraft | undefined,
  ): Promise<void> {
    await this.withLock(timelineId, async () => {
      await repairIncompleteTail(this.timelinePath(timelineId));
      const events = await this.readTimeline(timelineId);
      const next = decide(events);
      if (next === undefined) return;
      const event = TimelineEventSchema.parse({
        version: TIMELINE_EVENT_VERSION,
        eventId: randomUUID(),
        timelineId,
        sequence: events.length,
        at: this.now(),
        ...next,
      });
      const path = this.timelinePath(timelineId);
      await mkdir(dirname(path), { recursive: true });
      const handle = await open(path, "a");
      try {
        await handle.appendFile(`${JSON.stringify(event)}\n`, "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }
    });
  }

  private async readTimeline(timelineId: string): Promise<TimelineEvent[]> {
    let content: string;
    try {
      content = await readFile(this.timelinePath(timelineId), "utf8");
    } catch (error) {
      if (isMissing(error)) return [];
      throw error;
    }
    return parseTimelineContent(timelineId, content);
  }

  /** The synchronous dual of `readTimeline`, for immediate-before-effect checks. */
  private readTimelineSync(timelineId: string): TimelineEvent[] {
    const path = this.timelinePath(timelineId);
    let content: string;
    try {
      content = readFileSync(path, "utf8");
    } catch (error) {
      if (isMissing(error)) return [];
      throw error;
    }
    // Durability barrier: every event this read observed — including a
    // writer-appended terminal line that may still be fsync-pending — is
    // joined to the device before the caller may accept it. A failing
    // barrier fails the read visibly rather than accepting unverified
    // settlement.
    this.syncDurability(path);
    return parseTimelineContent(timelineId, content);
  }

  private async withLock(timelineId: string, action: () => Promise<void>): Promise<void> {
    const previous = this.locks.get(timelineId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    const tail = previous.then(() => current);
    this.locks.set(timelineId, tail);
    await previous;
    try {
      await action();
    } finally {
      release();
      if (this.locks.get(timelineId) === tail) this.locks.delete(timelineId);
    }
  }
}

/** The exact durability join: fsync the read file so observed appends are device-durable. */
function fsyncFileDurability(path: string): void {
  const handle = openSync(path, "r");
  try {
    fsyncSync(handle);
  } finally {
    closeSync(handle);
  }
}

/** Shared strict parse of one timeline file used by both read paths. */
function parseTimelineContent(timelineId: string, content: string): TimelineEvent[] {
  const completeContent = content.endsWith("\n")
    ? content
    : content.slice(0, content.lastIndexOf("\n") + 1);
  return completeContent.split("\n").filter((line) => line.trim().length > 0).map((line, index) => {
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch (error) {
      throw new Error(`timeline ${timelineId} contains invalid JSON at line ${index + 1}`, { cause: error });
    }
    const event = TimelineEventSchema.parse(value);
    if (event.timelineId !== timelineId) throw new Error(`timeline ${timelineId} contains event for ${event.timelineId}`);
    if (event.sequence !== index) throw new Error(`timeline ${timelineId} has invalid sequence ${event.sequence} at line ${index + 1}`);
    return event;
  });
}

async function repairIncompleteTail(path: string): Promise<void> {
  let handle;
  try {
    handle = await open(path, "r+");
  } catch (error) {
    if (isMissing(error)) return;
    throw error;
  }
  try {
    const content = await handle.readFile("utf8");
    if (content.length === 0 || content.endsWith("\n")) return;
    const lastNewline = content.lastIndexOf("\n");
    await handle.truncate(lastNewline < 0 ? 0 : Buffer.byteLength(content.slice(0, lastNewline + 1), "utf8"));
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function missionTurns(events: readonly TimelineEvent[]): MissionTurnState[] {
  const recoveries = events.filter((event) => event.type === "mission.turn-recovered");
  const starts = [
    ...events.filter((event) => event.type === "mission.turn-started").map((event) => ({
      sequence: event.sequence,
      start: event.data.start,
      startDigest: event.data.startDigest,
    })),
    ...recoveries.flatMap((event) => event.data.recovery.action.kind === "replace" ? [{
      sequence: event.sequence,
      start: event.data.recovery.action.replacement,
      startDigest: digest(event.data.recovery.action.replacement),
    }] : []),
  ].sort((left, right) => left.sequence - right.sequence);
  const settlements = events.filter((event) => event.type === "mission.turn-settled");
  const seen = new Set<string>();
  const states = starts.map((entry): {
    readonly start: MissionTurnStart;
    readonly startSequence: number;
    recoveries?: MissionTurnRecovery[];
  } => {
    const { start, startDigest } = entry;
    if (seen.has(start.turnId)) throw new Error(`mission turn ${start.turnId} has duplicate start events`);
    if (startDigest !== digest(start)) throw new Error(`mission turn ${start.turnId} has a damaged start digest`);
    seen.add(start.turnId);
    return { start, startSequence: entry.sequence };
  });
  const seenRecoveries = new Set<string>();
  for (const event of recoveries) {
    const { recovery, recoveryDigest, interruptedStartDigest } = event.data;
    if (seenRecoveries.has(recovery.id)) throw new Error(`mission turn recovery ${recovery.id} has duplicate events`);
    if (recoveryDigest !== digest(recovery)) throw new Error(`mission turn recovery ${recovery.id} has a damaged digest`);
    const state = states.find((candidate) => candidate.start.turnId === recovery.interruptedTurnId);
    if (state === undefined) throw new Error(`mission turn recovery ${recovery.id} has no interrupted turn`);
    if (event.sequence <= state.startSequence) throw new Error(`mission turn recovery ${recovery.id} precedes its turn`);
    if (interruptedStartDigest !== digest(state.start)) {
      throw new Error(`mission turn recovery ${recovery.id} has a damaged interrupted-turn link`);
    }
    const settledBeforeRecovery = settlements.find((settlement) =>
      settlement.data.turnId === recovery.interruptedTurnId && settlement.sequence < event.sequence
    );
    if (settledBeforeRecovery !== undefined) {
      throw new Error(`mission turn recovery ${recovery.id} follows a settled turn`);
    }
    if (state.recoveries?.some((candidate) =>
      candidate.action.kind === "replace" || candidate.action.kind === "abandon"
    )) throw new Error(`mission turn ${recovery.interruptedTurnId} has recovery after a terminal disposition`);
    state.recoveries = [...(state.recoveries ?? []), recovery];
    seenRecoveries.add(recovery.id);
  }
  const projected = states.map((state): MissionTurnState => {
    const { start, startSequence, recoveries: turnRecoveries } = state;
    const matches = settlements.filter((settlement) => settlement.data.turnId === start.turnId);
    if (matches.length > 1) throw new Error(`mission turn ${start.turnId} has duplicate settlement events`);
    const settled = matches[0];
    if (settled === undefined) return { start, ...(turnRecoveries === undefined ? {} : { recoveries: turnRecoveries }) };
    if (settled.sequence <= startSequence) {
      throw new Error(`mission turn ${start.turnId} settles before it starts`);
    }
    if (turnRecoveries?.some((recovery) =>
      recovery.action.kind === "replace" || recovery.action.kind === "abandon"
    )) throw new Error(`mission turn ${start.turnId} settled after a terminal recovery disposition`);
    if (
      settled.data.startDigest !== digest(start)
      || settled.data.settlementDigest !== digest(settled.data.settlement)
    ) throw new Error(`mission turn ${start.turnId} has a damaged settlement link`);
    return {
      start,
      ...(turnRecoveries === undefined ? {} : { recoveries: turnRecoveries }),
      settlement: settled.data.settlement,
    };
  });
  const orphan = settlements.find((settlement) => !seen.has(settlement.data.turnId));
  if (orphan !== undefined) throw new Error(`mission turn ${orphan.data.turnId} has a settlement without a start`);
  return projected;
}
