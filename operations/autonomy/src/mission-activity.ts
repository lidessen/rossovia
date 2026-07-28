import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { FileMissionTimeline } from "./delegate-timeline";
import type { TimelineEvent } from "./delegate-timeline-events";
import {
  FileEffectJournal,
  type EffectActivity,
  type EffectToolActivity,
} from "./effect-journal";
import { readGitStatus } from "./git-effect-observer";
import {
  readBlogLocalCorrectionApplyPrepared,
  readBlogLocalCorrectionApplyManifests,
  readLocalCorrectionReports,
  type BlogLocalCorrectionApplyManifest,
  type BlogLocalCorrectionApplyPrepared,
  type LocalCorrectionReport,
} from "./local-correction";
import { missionRunnerDirectory } from "./mission-runner";
import {
  projectMissionIntentLineage,
  type MissionIntentLineageProjection,
} from "./mission-timeline-state";
import {
  projectMissionAnchorMigrationProposal,
  type MissionAnchorMigrationProposalProjection,
} from "./mission-anchor-migration-proposal";
import {
  projectMissionReconciliationAction,
  type MissionReconciliationActionProjection,
} from "./mission-reconciliation-action";

export interface MissionActivityEvent {
  readonly sequence: number;
  readonly at: string;
  readonly type: TimelineEvent["type"];
  readonly label: string;
  readonly summary: string;
  readonly evidenceKind:
    | "anchor"
    | "input"
    | "correction"
    | "reconciliation"
    | "turn"
    | "delegation";
}

export interface MissionActivityProjection {
  readonly source: "mission-timeline";
  readonly effectSource: "effect-journal";
  readonly observedAt: string;
  readonly eventCount: number;
  readonly intentLineage: MissionIntentLineageProjection;
  readonly anchorMigrationProposal: MissionAnchorMigrationProposalProjection;
  readonly reconciliationAction: MissionReconciliationActionProjection;
  readonly currentEffect: CurrentEffectProjection | null;
  readonly currentCorrection: LocalCorrectionActivityProjection | null;
  readonly recentCorrections: readonly LocalCorrectionActivityProjection[];
  readonly currentTurn: {
    readonly turnId: string;
    readonly startedAt: string;
    readonly baselineWatermark: number;
    readonly state: "open" | "settled";
    readonly settlementKind?: "finished" | "input-pending" | "failed";
    readonly runStatus?: string;
  } | null;
  readonly lastEvent: MissionActivityEvent | null;
  readonly recentEvents: readonly MissionActivityEvent[];
}

export interface LocalCorrectionActivityProjection {
  readonly correctionId: string;
  readonly inputId: string;
  readonly inputEventId: string;
  readonly recordedAt: string;
  readonly actorRef: string;
  readonly sourceRef: string;
  readonly cause: {
    readonly effectId: string;
    readonly failedReportRef: string;
    readonly failedReportDigest: string;
  };
  readonly scope: {
    readonly writePaths: readonly ["db/schema.ts"];
    readonly externalDisclosure: "none";
  };
  readonly state:
    | "recorded"
    | "apply-interrupted"
    | "apply-uncertain"
    | "applied-unverified"
    | "verification-passed"
    | "verification-failed";
  readonly execution: {
    readonly executorRef: string;
    readonly patchRef: string;
    readonly patchDigest: string;
    readonly manifestRef: string;
    readonly manifestDigest: string;
  } | null;
  readonly verification: {
    readonly verifierRef: string;
    readonly verdict: "pending" | "passed" | "failed";
    readonly reportRef: string | null;
    readonly reportDigest: string | null;
  };
  readonly changedFromFailedSubject: readonly string[];
  readonly authority: {
    readonly commit: "withheld";
    readonly merge: "withheld";
    readonly publish: "withheld";
    readonly productAcceptance: "withheld";
  };
  readonly stale: boolean;
}

export interface CurrentEffectProjection {
  readonly effectId: string;
  readonly phase: "prepared" | "executing" | "writing" | "quiesced" | "settled" | "uncertain";
  readonly writer: {
    readonly cellId: string;
    readonly runId: string | null;
  };
  readonly workspace: {
    readonly root: string;
    readonly baseHead: string;
    readonly baselineClean: true;
  };
  readonly scope: {
    readonly writePaths: readonly string[];
    readonly allowedCommands: readonly string[];
  };
  readonly currentTool: ProjectedEffectTool | null;
  readonly recentTools: readonly ProjectedEffectTool[];
  readonly diff: {
    readonly changed: readonly string[];
    readonly added: readonly string[];
    readonly removed: readonly string[];
    readonly patchRef: string | null;
    readonly patchDigest: string | null;
    readonly outsideScope: readonly string[];
  };
  readonly verification: {
    readonly mechanical: unknown;
    readonly independent: unknown;
    readonly principal: unknown;
  };
  readonly authority: {
    readonly commit: "withheld";
    readonly merge: "withheld";
    readonly publish: "withheld";
  };
  readonly stale: boolean;
  readonly uncertain: boolean;
}

interface ProjectedEffectTool {
  readonly toolCallId: string;
  readonly name: "write_file";
  readonly path: string;
  readonly status: "started" | "finished";
  readonly outcome?: "written" | "failed" | "cancelled";
  readonly startedAt: string;
  readonly finishedAt?: string;
}

export async function projectMissionActivity(
  home: string,
  missionId: string,
  options: {
    readonly limit?: number;
    readonly observedAt?: string;
  } = {},
): Promise<MissionActivityProjection> {
  const timeline = new FileMissionTimeline(missionRunnerDirectory(home, missionId));
  const missionEvents = await timeline.readEvents(missionId);
  const limit = Math.max(1, Math.min(options.limit ?? 12, 100));
  const latestStart = [...missionEvents]
    .reverse()
    .find((event): event is Extract<TimelineEvent, { type: "mission.turn-started" }> =>
      event.type === "mission.turn-started"
    );
  const settlement = latestStart === undefined
    ? undefined
    : missionEvents.find((event): event is Extract<TimelineEvent, { type: "mission.turn-settled" }> =>
      event.type === "mission.turn-settled"
      && event.data.turnId === latestStart.data.start.turnId
    );
  const turnEvents = latestStart === undefined
    ? []
    : await timeline.readEvents(latestStart.data.start.turnId);
  const events = [...missionEvents, ...turnEvents].sort((left, right) =>
    left.at.localeCompare(right.at)
      || activityTieRank(left) - activityTieRank(right)
      || left.sequence - right.sequence
  );
  const recentEvents = events
    .map((event, sequence) => projectEvent(event, sequence))
    .slice(-limit);
  const intentLineage = projectMissionIntentLineage(missionEvents, missionId);
  const anchorMigrationProposal = await projectMissionAnchorMigrationProposal(
    home,
    missionId,
    intentLineage,
  );
  const currentTurn = latestStart === undefined
    ? null
    : {
      turnId: latestStart.data.start.turnId,
      startedAt: latestStart.at,
      baselineWatermark: latestStart.data.start.baselineWatermark,
      state: settlement === undefined ? "open" as const : "settled" as const,
      ...(settlement === undefined
        ? {}
        : {
          settlementKind: settlement.data.settlement.kind,
          ...(settlement.data.settlement.kind === "finished"
            ? { runStatus: settlement.data.settlement.runStatus }
            : {}),
        }),
    };
  const currentEffect = await projectCurrentEffect(
    missionRunnerDirectory(home, missionId),
    events,
  );
  const recentCorrections = await projectLocalCorrections(
    missionRunnerDirectory(home, missionId),
    missionEvents,
  );
  const reconciliationAction = await projectMissionReconciliationAction(
    home,
    missionId,
  );
  return {
    source: "mission-timeline",
    effectSource: "effect-journal",
    observedAt: options.observedAt ?? new Date().toISOString(),
    eventCount: events.length,
    intentLineage,
    anchorMigrationProposal,
    reconciliationAction,
    currentEffect,
    currentCorrection: recentCorrections.at(-1) ?? null,
    recentCorrections: recentCorrections.slice(-4),
    currentTurn,
    lastEvent: recentEvents.at(-1) ?? null,
    recentEvents,
  };
}

async function projectLocalCorrections(
  runnerRoot: string,
  missionEvents: readonly TimelineEvent[],
): Promise<LocalCorrectionActivityProjection[]> {
  const corrections = missionEvents.filter(
    (event): event is Extract<TimelineEvent, { type: "mission.input-received" }> =>
      event.type === "mission.input-received" && event.data.payload.kind === "correction",
  );
  return await Promise.all(corrections.map(async (event) => {
    const payload = event.data.payload;
    if (payload.kind !== "correction") throw new Error("correction event lost its discriminant");
    const reports = await readLocalCorrectionReports(runnerRoot, event.eventId);
    if (reports.length > 1) {
      throw new Error(`correction ${payload.correctionId} has conflicting verification reports`);
    }
    const retained = reports[0];
    if (retained !== undefined) {
      assertCorrectionReportBinding(retained.report, event);
    }
    const report = retained?.report;
    const applications = await readBlogLocalCorrectionApplyManifests(runnerRoot, event.eventId);
    if (applications.length > 1) {
      throw new Error(`correction ${payload.correctionId} has conflicting controlled apply manifests`);
    }
    const application = applications[0];
    if (application !== undefined) {
      assertCorrectionApplyBinding(application.manifest, event);
    }
    const preparedRecords = await readBlogLocalCorrectionApplyPrepared(
      runnerRoot,
      event.eventId,
    );
    if (preparedRecords.length > 1) {
      throw new Error(`correction ${payload.correctionId} has conflicting prepared apply manifests`);
    }
    const prepared = preparedRecords[0];
    if (prepared !== undefined) {
      assertCorrectionPreparedBinding(prepared.prepared, event);
    }
    const interruptedState = application === undefined && prepared !== undefined
      ? await inspectPreparedCorrectionState(runnerRoot, prepared.prepared)
      : null;
    if (
      report?.execution.controlledApply !== undefined
      && (
        application === undefined
        || report.execution.controlledApply.executorRef
          !== application.manifest.execution.executorRef
        || report.execution.controlledApply.patchDigest
          !== application.manifest.execution.patchDigest
        || report.execution.controlledApply.manifestDigest !== application.digest
      )
    ) {
      throw new Error("local correction report does not bind its controlled apply evidence");
    }
    return {
      correctionId: payload.correctionId,
      inputId: event.data.inputId,
      inputEventId: event.eventId,
      recordedAt: event.at,
      actorRef: event.data.actorRef,
      sourceRef: event.data.sourceRef,
      cause: payload.cause,
      scope: {
        writePaths: ["db/schema.ts"] as const,
        externalDisclosure: "none" as const,
      },
      state: report === undefined
        ? application === undefined
          ? prepared === undefined
            ? "recorded" as const
            : interruptedState === "uncertain"
              ? "apply-uncertain" as const
              : "apply-interrupted" as const
          : "applied-unverified" as const
        : report.verification.verdict === "passed"
          ? "verification-passed" as const
          : "verification-failed" as const,
      verification: {
        verifierRef: report?.verification.verifierRef ?? payload.plannedVerificationRef,
        verdict: report?.verification.verdict ?? "pending",
        reportRef: retained?.ref ?? null,
        reportDigest: retained?.digest ?? null,
      },
      execution: application === undefined
        ? prepared === undefined
          ? null
          : {
            executorRef: prepared.prepared.execution.executorRef,
            patchRef: prepared.prepared.execution.patchRef,
            patchDigest: prepared.prepared.execution.patchDigest,
            manifestRef: prepared.ref,
            manifestDigest: prepared.digest,
          }
        : {
          executorRef: application.manifest.execution.executorRef,
          patchRef: application.manifest.execution.patchRef,
          patchDigest: application.manifest.execution.patchDigest,
          manifestRef: application.ref,
          manifestDigest: application.digest,
        },
      changedFromFailedSubject: report?.subject.changedFromFailedSubject
        ?? (interruptedState === "after"
          ? prepared?.prepared.subject.changedFromFailedSubject ?? []
          : []),
      authority: payload.authority,
      stale: report !== undefined
        ? await isCorrectionReportStale(report)
        : application !== undefined
          ? await isCorrectionApplyManifestStale(application.manifest)
          : interruptedState === "uncertain",
    };
  }));
}

function assertCorrectionPreparedBinding(
  prepared: BlogLocalCorrectionApplyPrepared,
  event: Extract<TimelineEvent, { type: "mission.input-received" }>,
): void {
  const payload = event.data.payload;
  if (
    payload.kind !== "correction"
    || prepared.correction.correctionId !== payload.correctionId
    || prepared.correction.inputId !== event.data.inputId
    || prepared.correction.inputEventId !== event.eventId
    || prepared.correction.inputPayloadDigest !== event.data.payloadDigest
    || prepared.cause.effectId !== payload.cause.effectId
    || prepared.cause.failedReportDigest !== payload.cause.failedReportDigest
  ) {
    throw new Error("controlled correction prepared manifest does not bind its immutable input");
  }
}

function assertCorrectionApplyBinding(
  manifest: BlogLocalCorrectionApplyManifest,
  event: Extract<TimelineEvent, { type: "mission.input-received" }>,
): void {
  const payload = event.data.payload;
  if (
    payload.kind !== "correction"
    || manifest.correction.correctionId !== payload.correctionId
    || manifest.correction.inputId !== event.data.inputId
    || manifest.correction.inputEventId !== event.eventId
    || manifest.correction.inputPayloadDigest !== event.data.payloadDigest
    || manifest.cause.effectId !== payload.cause.effectId
    || manifest.cause.failedReportDigest !== payload.cause.failedReportDigest
  ) {
    throw new Error("controlled correction apply manifest does not bind its immutable input");
  }
}

function assertCorrectionReportBinding(
  report: LocalCorrectionReport,
  event: Extract<TimelineEvent, { type: "mission.input-received" }>,
): void {
  const payload = event.data.payload;
  if (
    payload.kind !== "correction"
    || report.correction.correctionId !== payload.correctionId
    || report.correction.inputId !== event.data.inputId
    || report.correction.inputEventId !== event.eventId
    || report.correction.inputPayloadDigest !== event.data.payloadDigest
    || report.cause.effectId !== payload.cause.effectId
    || report.cause.failedReportDigest !== payload.cause.failedReportDigest
  ) {
    throw new Error("local correction report does not bind its immutable input");
  }
}

async function inspectPreparedCorrectionState(
  runnerRoot: string,
  prepared: BlogLocalCorrectionApplyPrepared,
): Promise<"before" | "after" | "uncertain"> {
  try {
    const result = spawnSync(
      "git",
      ["-C", prepared.candidate.root, "rev-parse", "--verify", "HEAD"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    if (
      result.error !== undefined
      || result.status !== 0
      || (result.stdout ?? "").trim() !== prepared.candidate.gitHead
    ) {
      return "uncertain";
    }
    const effect = await new FileEffectJournal(runnerRoot).activity(prepared.cause.effectId);
    if (effect?.settlement === undefined) return "uncertain";
    const status = await readGitStatus(prepared.candidate.root);
    if (
      !sameStrings(
        [...status.added, ...status.changed, ...status.removed],
        effect.settlement.changedPaths,
      )
    ) {
      return "uncertain";
    }
    const current = await Promise.all(prepared.subject.before.files.map(async (file) => ({
      path: file.path,
      sha256: createHash("sha256")
        .update(await readFile(join(prepared.candidate.root, file.path)))
        .digest("hex"),
    })));
    if (stableFiles(current, prepared.subject.before.files)) return "before";
    if (stableFiles(current, prepared.subject.after.files)) return "after";
    return "uncertain";
  } catch {
    return "uncertain";
  }
}

function stableFiles(
  left: readonly { readonly path: string; readonly sha256: string }[],
  right: readonly { readonly path: string; readonly sha256: string }[],
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function isCorrectionReportStale(report: LocalCorrectionReport): Promise<boolean> {
  try {
    const result = spawnSync(
      "git",
      ["-C", report.verification.candidate.root, "rev-parse", "--verify", "HEAD"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    if (result.error !== undefined || result.status !== 0) return true;
    if ((result.stdout ?? "").trim() !== report.subject.after.gitHead) return true;
    for (const file of report.subject.after.files) {
      const digest = createHash("sha256")
        .update(await readFile(join(report.verification.candidate.root, file.path)))
        .digest("hex");
      if (digest !== file.sha256) return true;
    }
    return false;
  } catch {
    return true;
  }
}

async function isCorrectionApplyManifestStale(
  manifest: BlogLocalCorrectionApplyManifest,
): Promise<boolean> {
  try {
    const result = spawnSync(
      "git",
      ["-C", manifest.candidate.root, "rev-parse", "--verify", "HEAD"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    if (result.error !== undefined || result.status !== 0) return true;
    if ((result.stdout ?? "").trim() !== manifest.subject.after.gitHead) return true;
    for (const file of manifest.subject.after.files) {
      const digest = createHash("sha256")
        .update(await readFile(join(manifest.candidate.root, file.path)))
        .digest("hex");
      if (digest !== file.sha256) return true;
    }
    return false;
  } catch {
    return true;
  }
}

async function projectCurrentEffect(
  runnerRoot: string,
  events: readonly TimelineEvent[],
): Promise<CurrentEffectProjection | null> {
  const journal = new FileEffectJournal(runnerRoot);
  const batchIds = [...events]
    .reverse()
    .filter((event): event is Extract<TimelineEvent, { type: "delegate.batch-prepared" }> =>
      event.type === "delegate.batch-prepared"
    )
    .map((event) => event.data.batchId);
  let effect: EffectActivity | undefined;
  for (const batchId of batchIds) {
    effect = await journal.activity(batchId);
    if (effect !== undefined) break;
  }
  if (effect === undefined) return null;

  let gitStatus: Awaited<ReturnType<typeof readGitStatus>> = {
    added: [],
    changed: [],
    removed: [],
  };
  let observationFailed = false;
  try {
    gitStatus = await readGitStatus(effect.prepared.worktree.root);
  } catch {
    observationFailed = true;
  }
  const changedPaths = unique([
    ...gitStatus.added,
    ...gitStatus.changed,
    ...gitStatus.removed,
  ]);
  const outsideScope = changedPaths.filter((path) =>
    !effect.prepared.writePaths.some((scope) =>
      scope === "." || path === scope || path.startsWith(`${scope}/`)
    )
  );
  const currentTool = [...effect.tools].reverse().find((tool) => tool.status === "started");
  const settlement = effect.settlement;
  const retainedChangedPaths = settlement?.changedPaths ?? [];
  const verificationSubjectStale = await isVerificationSubjectStale(effect);
  const stale = observationFailed || (
    settlement !== undefined && !sameStrings(changedPaths, retainedChangedPaths)
  ) || verificationSubjectStale;
  return {
    effectId: effect.effectId,
    phase: phaseFor(effect, currentTool),
    writer: {
      cellId: effect.prepared.cellId,
      runId: effect.runId ?? null,
    },
    workspace: {
      root: effect.prepared.worktree.root,
      baseHead: effect.prepared.worktree.baseHead,
      baselineClean: true,
    },
    scope: {
      writePaths: effect.prepared.writePaths,
      allowedCommands: effect.prepared.allowedCommands,
    },
    currentTool: currentTool === undefined ? null : projectTool(currentTool),
    recentTools: effect.tools.slice(-6).map(projectTool),
    diff: {
      changed: gitStatus.changed,
      added: gitStatus.added,
      removed: gitStatus.removed,
      patchRef: settlement?.patch.ref ?? null,
      patchDigest: settlement?.patch.digest ?? null,
      outsideScope: settlement?.outsideScope.paths ?? outsideScope,
    },
    verification: {
      mechanical: settlement?.acceptance.mechanical ?? { verdict: "pending" },
      independent: effect.independentVerification ?? settlement?.acceptance.independent ?? { verdict: "not-run" },
      principal: settlement?.acceptance.principal ?? { verdict: "withheld" },
    },
    authority: {
      commit: "withheld",
      merge: "withheld",
      publish: "withheld",
    },
    stale,
    uncertain: effect.state === "uncertain" || observationFailed,
  };
}

async function isVerificationSubjectStale(effect: EffectActivity): Promise<boolean> {
  const subject = effect.independentVerification?.subject;
  if (subject === undefined) return false;
  try {
    const result = spawnSync(
      "git",
      ["-C", effect.prepared.worktree.root, "rev-parse", "--verify", "HEAD"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    if (result.error !== undefined || result.status !== 0) return true;
    if ((result.stdout ?? "").trim() !== subject.gitHead) return true;
    for (const file of subject.files) {
      let digest: string | null;
      try {
        digest = createHash("sha256")
          .update(await readFile(join(effect.prepared.worktree.root, file.path)))
          .digest("hex");
      } catch (error) {
        if (
          typeof error === "object"
          && error !== null
          && "code" in error
          && (error as { code?: unknown }).code === "ENOENT"
        ) digest = null;
        else return true;
      }
      if (digest !== file.sha256) return true;
    }
    return false;
  } catch {
    return true;
  }
}

function phaseFor(
  effect: EffectActivity,
  currentTool: EffectToolActivity | undefined,
): CurrentEffectProjection["phase"] {
  if (effect.state === "uncertain") return "uncertain";
  if (effect.state === "settled") return "settled";
  if (effect.state === "quiesced") return "quiesced";
  if (effect.state === "prepared") return "prepared";
  return currentTool === undefined ? "executing" : "writing";
}

function projectTool(tool: EffectToolActivity): ProjectedEffectTool {
  return {
    toolCallId: tool.toolCallId,
    name: tool.tool,
    path: tool.path,
    status: tool.status,
    ...(tool.outcome === undefined ? {} : { outcome: tool.outcome }),
    startedAt: tool.startedAt,
    ...(tool.finishedAt === undefined ? {} : { finishedAt: tool.finishedAt }),
  };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  const a = unique(left);
  const b = unique(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function activityTieRank(event: TimelineEvent): number {
  if (event.type === "mission.turn-started") return 0;
  if (event.type.startsWith("delegate.")) return 2;
  if (event.type === "mission.turn-settled") return 3;
  return 1;
}

function projectEvent(event: TimelineEvent, sequence = event.sequence): MissionActivityEvent {
  const base = {
    sequence,
    at: event.at,
    type: event.type,
  };
  if (event.type === "mission.anchor-seeded") {
    return {
      ...base,
      label: "Intent anchor",
      summary: `Authorized anchor recorded at input watermark ${event.data.seed.anchor.reconciledWatermark}.`,
      evidenceKind: "anchor",
    };
  }
  if (event.type === "mission.anchor-adopted") {
    return {
      ...base,
      label: "Legacy intent anchor adopted",
      summary:
        `Authorized anchor adopted over ${event.data.priorEventCount} retained legacy event(s) at input watermark 0.`,
      evidenceKind: "anchor",
    };
  }
  if (event.type === "mission.input-received") {
    const payload = event.data.payload;
    if (payload.kind === "correction") {
      return {
        ...base,
        label: "Local correction recorded",
        summary: `${payload.correctionId} recorded against failed effect ${payload.cause.effectId}.`,
        evidenceKind: "correction",
      };
    }
    return {
      ...base,
      label: payload.kind === "control" ? "Principal control" : "Principal contribution",
      summary: payload.kind === "control"
        ? `${payload.command} recorded as input ${event.data.watermark} from ${event.data.actorRef}.`
        : `Contribution recorded as input ${event.data.watermark} from ${event.data.actorRef}.`,
      evidenceKind: "input",
    };
  }
  if (event.type === "mission.input-reconciled") {
    return {
      ...base,
      label: "Input reconciled",
      summary: `Input ${event.data.proposal.inputRef.watermark} accepted into the active anchor.`,
      evidenceKind: "reconciliation",
    };
  }
  if (event.type === "mission.turn-started") {
    return {
      ...base,
      label: "Turn started",
      summary: `${event.data.start.turnId} started from reconciled watermark ${event.data.start.baselineWatermark}.`,
      evidenceKind: "turn",
    };
  }
  if (event.type === "mission.turn-settled") {
    const settlement = event.data.settlement;
    const outcome = settlement.kind === "finished"
      ? settlement.runStatus
      : settlement.kind === "input-pending"
        ? `input ${settlement.currentWatermark} pending`
        : "failed";
    return {
      ...base,
      label: "Turn settled",
      summary: `${event.data.turnId} settled as ${settlement.kind}: ${outcome}.`,
      evidenceKind: "turn",
    };
  }
  if (event.type === "mission.turn-recovered") {
    return {
      ...base,
      label: "Turn recovery",
      summary: `${event.data.recovery.interruptedTurnId} recovery recorded as ${event.data.recovery.action.kind}.`,
      evidenceKind: "turn",
    };
  }
  if (event.type === "delegate.batch-prepared") {
    return {
      ...base,
      label: "Delegate batch prepared",
      summary: `${event.data.batchId} prepared with ${event.data.children.length} contribution(s).`,
      evidenceKind: "delegation",
    };
  }
  if (event.type === "delegate.batch-ready") {
    return {
      ...base,
      label: "Delegate batch ready",
      summary: `${event.data.batchId} reached the ${event.data.children.length}-contribution settlement barrier.`,
      evidenceKind: "delegation",
    };
  }
  if (event.type === "delegate.child-opened") {
    return {
      ...base,
      label: "Delegate opened",
      summary: `${event.data.key} opened in batch ${event.data.batchId}.`,
      evidenceKind: "delegation",
    };
  }
  if (event.type === "delegate.child-dispatched") {
    return {
      ...base,
      label: "Delegate dispatched",
      summary: `Call ${event.data.callId} dispatched for batch ${event.data.batchId}.`,
      evidenceKind: "delegation",
    };
  }
  return {
    ...base,
    label: "Delegate settled",
    summary: `${event.data.outcome.key} settled as ${event.data.outcome.status}; ${event.data.outcome.artifactRefs.length} artifact reference(s).`,
    evidenceKind: "delegation",
  };
}
