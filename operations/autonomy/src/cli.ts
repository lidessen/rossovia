import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MissionCorrectionPayloadSchema,
  type MissionInputDraft,
} from "./mission-input";
import {
  EffectVerifiedDataSchema,
  FileEffectJournal,
} from "./effect-journal";
import { projectMissionActivity } from "./mission-activity";
import {
  MissionAnchorMigrationDecisionSchema,
  MISSION_ANCHOR_MIGRATION_ATTEMPT_VERSION,
  MISSION_ANCHOR_MIGRATION_INVALIDATION_VERSION,
  MISSION_ANCHOR_MIGRATION_RETIREMENT_VERSION,
  missionAnchorMigrationAttemptDigest,
  missionAnchorMigrationDecisionDigest,
  missionAnchorMigrationProposalDigest,
  readMissionAnchorMigrationAttempt,
  readMissionAnchorMigrationProposal,
  readMissionAnchorMigrationInvalidation,
  readMissionAnchorMigrationRetirement,
  retainMissionAnchorMigrationAttempt,
  retainMissionAnchorMigrationProposal,
  retainMissionAnchorMigrationDecision,
  retainMissionAnchorMigrationInvalidation,
  retainMissionAnchorMigrationRetirement,
  verifyMissionAnchorMigrationSource,
  type MissionAnchorMigrationProposal,
} from "./mission-anchor-migration-proposal";
import { FileMissionTimeline } from "./delegate-timeline";
import { MissionReconciliationCommitSchema } from "./mission-reconciliation-commit";
import { MissionAnchorAdoptionSchema } from "./mission-reconciliation";
import { digest, stableStringify } from "./canonical-json";
import {
  classifyMissionRunnerReachabilityFailureAtSocket,
  missionRunnerRequest,
  missionRunnerDirectory,
  missionRunnerSocketPath,
  readMissionRunnerStatus,
  readVerifiedMissionRunnerIfReachable,
  requestMissionRunner,
  type MissionRunnerExpectedTarget,
  type MissionRunnerResponse,
  type MissionRunnerState,
  type MissionRunnerStatus,
} from "./mission-runner";

type AnchorMigrationInvalidationCode =
  | "target-or-protocol-uncertain"
  | "shutdown-response-uncertain"
  | "socket-release-uncertain"
  | "timeline-drift"
  | "replacement-uncertain"
  | "adoption-outcome-uncertain";

class AnchorMigrationAttemptFailure extends Error {
  constructor(
    readonly code: AnchorMigrationInvalidationCode,
    cause: unknown,
  ) {
    super(
      cause instanceof Error ? cause.message : String(cause),
      { cause },
    );
  }
}

const parsed = parseArguments(process.argv.slice(2));

try {
  const result = await execute(parsed);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

interface CliArguments {
  readonly positionals: readonly string[];
  readonly home: string;
  readonly id: string;
  readonly actorRef: string;
  readonly sourceRef: string;
  readonly expectedRunnerId?: string;
  readonly expectedState?: MissionRunnerState;
  readonly runtimeModule?: string;
  readonly anchorFile?: string;
  readonly expectedProposalDigest?: string;
  readonly missionSourceRoot?: string;
}

async function execute(args: CliArguments): Promise<unknown> {
  const [area, action, missionId, ...rest] = args.positionals;
  if (
    area === "effect"
    && action === "verify"
    && missionId !== undefined
    && rest.length === 2
    && args.runtimeModule === undefined
    && args.anchorFile === undefined
  ) {
    const [effectId, verificationFile] = rest as [string, string];
    const verification = EffectVerifiedDataSchema.parse(
      JSON.parse(await readFile(resolve(verificationFile), "utf8")),
    );
    const journal = new FileEffectJournal(missionRunnerDirectory(args.home, missionId));
    await journal.verify(effectId, verification);
    return await journal.activity(effectId);
  }
  if (area === "runner" && action === "start" && missionId !== undefined && rest.length === 0) {
    return await startRunner(args.home, missionId, args.runtimeModule, args.anchorFile);
  }
  if (
    area === "runner"
    && action === "status"
    && missionId !== undefined
    && rest.length === 0
    && args.runtimeModule === undefined
    && args.anchorFile === undefined
  ) {
    try {
      const response = requireSuccess(await requestMissionRunner(
        args.home,
        missionId,
        missionRunnerRequest({ kind: "status" }),
      ));
      return {
        live: true,
        ...response.status,
        recoveryCapabilities: response.recoveryCapabilities ?? {
          abandon: false,
          resume: false,
          replace: false,
        },
      };
    } catch (error) {
      const status = await readMissionRunnerStatus(args.home, missionId);
      const reachability = await classifyMissionRunnerReachabilityFailureAtSocket(
        error,
        missionRunnerSocketPath(args.home, missionId),
      );
      if (reachability.standing === "unknown") {
        return status === undefined
          ? {
              live: null,
              missionId,
              status: "not-observed",
              reachability,
            }
          : { live: null, ...status, reachability };
      }
      return status === undefined
        ? {
            live: false,
            missionId,
            status: "not-found",
            reachability,
          }
        : { live: false, ...status, reachability };
    }
  }
  if (
    area === "runner"
    && action === "shutdown"
    && missionId !== undefined
    && rest.length === 0
    && args.runtimeModule === undefined
    && args.anchorFile === undefined
  ) {
    return (await requireSuccess(await requestMissionRunner(
      args.home,
      missionId,
      missionRunnerRequest({ kind: "runner-shutdown" }),
    ))).status;
  }
  if (
    area === "runner"
    && action === "activity"
    && missionId !== undefined
    && rest.length === 0
    && args.runtimeModule === undefined
    && args.anchorFile === undefined
  ) {
    return await projectMissionActivity(args.home, missionId);
  }
  if (
    area === "mission"
    && action === "settle-anchor-migration"
    && missionId !== undefined
    && rest.length === 1
    && args.runtimeModule === undefined
    && args.anchorFile === undefined
  ) {
    if (args.missionSourceRoot === undefined) {
      throw new Error("anchor migration settlement requires --mission-source-root");
    }
    return await settleAnchorMigration(
      args.home,
      missionId,
      resolve(rest[0]!),
      resolve(args.missionSourceRoot),
    );
  }
  if (
    area === "mission"
    && action === "prepare-anchor-migration"
    && missionId !== undefined
    && rest.length === 1
    && args.runtimeModule === undefined
    && args.anchorFile === undefined
  ) {
    const proposalPath = resolve(rest[0]!);
    const target = requiredExpectedTarget(args, "anchor migration proposal");
    let observedLive = true;
    let observedStatus: MissionRunnerStatus | undefined;
    try {
      observedStatus = requireSuccess(await requestMissionRunner(
        args.home,
        missionId,
        missionRunnerRequest({ kind: "status" }),
      )).status;
    } catch (error) {
      const reachability = await classifyMissionRunnerReachabilityFailureAtSocket(
        error,
        missionRunnerSocketPath(args.home, missionId),
      );
      if (reachability.standing === "unknown") {
        throw new Error(
          `Mission ${missionId} runner reachability could not be verified: ${reachability.message}`,
          { cause: error },
        );
      }
      observedLive = false;
      observedStatus = await readMissionRunnerStatus(args.home, missionId);
    }
    if (observedStatus === undefined) {
      throw new Error(`Mission ${missionId} has no exact live or cached runner target`);
    }
    if (
      observedStatus.runnerId !== target.expectedRunnerId
      || observedStatus.state !== target.expectedState
    ) {
      throw new Error(
        `anchor migration proposal target drifted: expected ${target.expectedRunnerId}/${target.expectedState}, observed ${observedStatus.runnerId}/${observedStatus.state}`,
      );
    }
    return await retainMissionAnchorMigrationProposal(
      args.home,
      missionId,
      JSON.parse(await readFile(proposalPath, "utf8")),
      { status: observedStatus, live: observedLive },
      {
        ...(args.expectedProposalDigest === undefined
          ? {}
          : { expectedPreviousProposalDigest: args.expectedProposalDigest }),
      },
    );
  }
  if (
    area === "mission"
    && action === "adopt-anchor"
    && missionId !== undefined
    && rest.length === 1
    && args.runtimeModule === undefined
    && args.anchorFile === undefined
  ) {
    const adoptionPath = resolve(rest[0]!);
    const adoption = MissionAnchorAdoptionSchema.parse(
      JSON.parse(await readFile(adoptionPath, "utf8")),
    );
    const target = requiredExpectedTarget(args, "legacy anchor adoption");
    const response = requireSuccess(await requestMissionRunner(
      args.home,
      missionId,
      missionRunnerRequest({
        kind: "anchor-adoption",
        adoption,
        ...target,
      }),
    ));
    return {
      status: response.status,
      adoption: {
        id: adoption.id,
        missionId: adoption.missionId,
        authorityRef: adoption.authorityRef,
        sourceRef: adoption.sourceRef,
        expectedPriorEventCount: adoption.expectedPriorEventCount,
        expectedPriorTimelineDigest: adoption.expectedPriorTimelineDigest,
      },
    };
  }
  if (
    area === "mission"
    && action === "reconcile"
    && missionId !== undefined
    && rest.length === 1
    && args.runtimeModule === undefined
    && args.anchorFile === undefined
  ) {
    const target = requiredExpectedTarget(args, "Mission reconciliation");
    const commitPath = resolve(rest[0]!);
    const commit = MissionReconciliationCommitSchema.parse(JSON.parse(await readFile(commitPath, "utf8")));
    const response = requireSuccess(await requestMissionRunner(
      args.home,
      missionId,
      missionRunnerRequest({
        kind: "reconciliation-commit",
        commit,
        ...target,
      }),
    ));
    return {
      status: response.status,
      reconciliation: {
        proposalId: commit.proposal.id,
        inputWatermark: commit.proposal.inputRef.watermark,
        authorityRef: commit.acceptance.authorityRef,
      },
    };
  }
  if (
    area === "mission"
    && action === "correction"
    && missionId !== undefined
    && rest.length === 1
    && args.runtimeModule === undefined
    && args.anchorFile === undefined
  ) {
    const requestPath = resolve(rest[0]!);
    const payload = MissionCorrectionPayloadSchema.parse(
      JSON.parse(await readFile(requestPath, "utf8")),
    );
    return await sendInput(args.home, missionId, {
      id: args.id,
      actorRef: args.actorRef,
      sourceRef: args.sourceRef,
      payload,
    }, expectedTarget(args));
  }
  if (
    area === "mission"
    && action === "input"
    && missionId !== undefined
    && rest.length > 0
    && args.runtimeModule === undefined
    && args.anchorFile === undefined
  ) {
    return await sendInput(args.home, missionId, {
      id: args.id,
      actorRef: args.actorRef,
      sourceRef: args.sourceRef,
      payload: { kind: "contribution", text: rest.join(" ") },
    }, expectedTarget(args));
  }
  if (
    area === "mission" &&
    action === "recover" &&
    missionId !== undefined &&
    rest.length === 1 &&
    args.runtimeModule === undefined &&
    args.anchorFile === undefined &&
    ["resume", "replace", "abandon"].includes(rest[0] ?? "")
  ) {
    return await recoverTurn(args.home, missionId, {
      id: args.id,
      actorRef: args.actorRef,
      sourceRef: args.sourceRef,
      action: rest[0] as "resume" | "replace" | "abandon",
    }, expectedTarget(args));
  }
  if (
    area === "mission" &&
    action === "control" &&
    missionId !== undefined &&
    rest.length === 1 &&
    args.runtimeModule === undefined &&
    args.anchorFile === undefined &&
    ["pause", "resume", "stop", "approve-effect"].includes(rest[0] ?? "")
  ) {
    return await sendInput(args.home, missionId, {
      id: args.id,
      actorRef: args.actorRef,
      sourceRef: args.sourceRef,
      payload: {
        kind: "control",
        command: rest[0] as "pause" | "resume" | "stop" | "approve-effect",
      },
    }, expectedTarget(args));
  }
  throw new Error(usage());
}

async function startRunner(
  home: string,
  missionId: string,
  runtimeModule?: string,
  anchorFile?: string,
): Promise<MissionRunnerStatus & { readonly live: boolean }> {
  let existing: Extract<MissionRunnerResponse, { ok: true }> | undefined;
  try {
    existing = requireSuccess(await requestMissionRunner(
      home,
      missionId,
      missionRunnerRequest({ kind: "status" }),
      500,
    ));
  } catch (error) {
    const reachability = await classifyMissionRunnerReachabilityFailureAtSocket(
      error,
      missionRunnerSocketPath(home, missionId),
    );
    if (reachability.standing === "unknown") {
      throw new Error(
        `Mission ${missionId} runner reachability could not be verified before start: ${reachability.message}`,
        { cause: error },
      );
    }
    // A missing or refusing socket is expected when starting or restarting a carrier.
  }
  if (existing !== undefined) {
    if (runtimeModule !== undefined || anchorFile !== undefined) {
      throw new Error(`Mission ${missionId} already has a live runner; runtime and initial anchor can only be selected at carrier start`);
    }
    return { live: true, ...existing.status };
  }

  const script = fileURLToPath(new URL("./mission-runner-process.ts", import.meta.url));
  const childArgs = [script, "--home", resolve(home), "--mission", missionId];
  if (runtimeModule !== undefined) childArgs.push("--runtime-module", resolve(runtimeModule));
  if (anchorFile !== undefined) childArgs.push("--anchor-file", resolve(anchorFile));
  const child = spawn(process.execPath, childArgs, {
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  child.unref();
  if (child.pid === undefined) throw new Error(`could not start Mission runner for ${missionId}`);

  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      const response = requireSuccess(await requestMissionRunner(
        home,
        missionId,
        missionRunnerRequest({ kind: "status" }),
        300,
      ));
      if (response.status.pid === child.pid) return { live: true, ...response.status };
    } catch (error) {
      const reachability = await classifyMissionRunnerReachabilityFailureAtSocket(
        error,
        missionRunnerSocketPath(home, missionId),
      );
      if (reachability.standing === "unknown") {
        throw new Error(
          `Mission ${missionId} replacement reachability could not be verified: ${reachability.message}`,
          { cause: error },
        );
      }
      const status = await readMissionRunnerStatus(home, missionId);
      if (status?.pid === child.pid && status.state === "mission-stopped") {
        return { live: false, ...status };
      }
    }
    await Bun.sleep(25);
  }
  throw new Error(`Mission runner for ${missionId} did not become ready`);
}

async function settleAnchorMigration(
  home: string,
  missionId: string,
  decisionPath: string,
  missionSourceRoot: string,
): Promise<unknown> {
  const proposal = await readMissionAnchorMigrationProposal(home, missionId);
  const proposalDigest = missionAnchorMigrationProposalDigest(proposal);
  const decision = MissionAnchorMigrationDecisionSchema.parse(
    JSON.parse(await readFile(decisionPath, "utf8")),
  );
  if (
    decision.missionId !== missionId
    || decision.proposalId !== proposal.proposalId
    || decision.proposalDigest !== proposalDigest
    || stableStringify(decision.missionSource)
      !== stableStringify(proposal.missionSource)
  ) {
    throw new Error("anchor migration decision does not bind the retained proposal");
  }
  verifyMissionAnchorMigrationSource(proposal, missionSourceRoot);
  const priorInvalidation = await readMissionAnchorMigrationInvalidation(
    home,
    missionId,
    proposalDigest,
  );
  if (priorInvalidation !== undefined) {
    throw new Error(
      `anchor migration proposal ${proposal.proposalId} was invalidated by ${priorInvalidation.code}; a new proposal and ADOPT are required`,
    );
  }
  const releaseSettlement = await acquireAnchorMigrationSettlementLease(
    home,
    missionId,
    proposalDigest,
  );
  try {
  const decisionReceipt = await retainMissionAnchorMigrationDecision(home, decision);
  const decisionDigest = missionAnchorMigrationDecisionDigest(decision);
  if (decisionReceipt.decisionDigest !== decisionDigest) {
    throw new Error("retained anchor migration decision digest changed");
  }
  const adoption = MissionAnchorAdoptionSchema.parse({
    version: "rosso.mission-anchor-adoption.v1",
    id: proposal.proposedAdoption.adoptionId,
    missionId,
    authorityRef: `anchor-migration-decision:sha256:${decisionDigest}`,
    sourceRef: `anchor-migration-proposal:sha256:${proposalDigest}`,
    expectedPriorEventCount: proposal.retainedHistory.eventCount,
    expectedPriorTimelineDigest: proposal.retainedHistory.timelineDigest,
    anchor: proposal.proposedAdoption.anchor,
  });
  const timeline = new FileMissionTimeline(missionRunnerDirectory(home, missionId));
  const events = await timeline.readEvents(missionId);
  const existing = events.find((event) => event.type === "mission.anchor-adopted");
  let replacement: MissionRunnerStatus & { readonly live?: boolean };
  if (existing !== undefined) {
    if (stableStringify(existing.data.adoption) !== stableStringify(adoption)) {
      throw new Error(`Mission ${missionId} retains a different anchor adoption`);
    }
    replacement = await recoverAdoptedMigrationReplacement(
      home,
      missionId,
      proposal,
      proposalDigest,
      adoption,
    );
  } else if (proposal.target.protocolCapability === "atomic-adopt-retire-v1") {
    replacement = await settleAtomicAnchorMigration(
      home,
      missionId,
      proposal,
      proposalDigest,
      adoption,
    );
  } else {
    try {
      replacement = await settleLegacyCompatibilityAnchorMigration(
        home,
        missionId,
        proposal,
        proposalDigest,
        decisionDigest,
        adoption,
      );
    } catch (error) {
      const currentEvents = await new FileMissionTimeline(
        missionRunnerDirectory(home, missionId),
      ).readEvents(missionId);
      const adopted = currentEvents.find(
        (event) => event.type === "mission.anchor-adopted",
      );
      if (
        adopted !== undefined
        && stableStringify(adopted.data.adoption) === stableStringify(adoption)
      ) {
        replacement = await recoverAdoptedMigrationReplacement(
          home,
          missionId,
          proposal,
          proposalDigest,
          adoption,
        );
      } else {
        const failure = error instanceof AnchorMigrationAttemptFailure
          ? error
          : new AnchorMigrationAttemptFailure(
            "target-or-protocol-uncertain",
            error,
          );
        await retainMissionAnchorMigrationInvalidation(home, {
          version: MISSION_ANCHOR_MIGRATION_INVALIDATION_VERSION,
          missionId,
          proposalId: proposal.proposalId,
          proposalDigest,
          decisionDigest,
          code: failure.code,
          detailDigest: digest(failure.message),
          recordedAt: new Date().toISOString(),
          standing: "requires-new-proposal-and-adopt",
        });
        throw new Error(
          `${failure.message}; proposal invalidated and a new proposal plus ADOPT are required`,
        );
      }
    }
  }

  if (replacement.runnerId === proposal.target.runnerId) {
    throw new Error("anchor migration did not replace the retired carrier");
  }
  if (replacement.runtimeMode !== "none") {
    throw new Error(
      `anchor migration replacement ${replacement.runnerId} is not a verified no-runtime carrier`,
    );
  }
  return {
    standing: "settled",
    proposalId: proposal.proposalId,
    proposalDigest,
    migrationPath: proposal.target.protocolCapability,
    decisionReceipt,
    adoptionId: adoption.id,
    replacementRuntime: "none",
    replacement,
    authority: {
      reconciliation: "withheld",
      externalDisclosure: "none",
      candidateWrite: "withheld",
      commit: "withheld",
      merge: "withheld",
      publish: "withheld",
      productAcceptance: "withheld",
    },
  };
  } finally {
    await releaseSettlement();
  }
}

async function settleAtomicAnchorMigration(
  home: string,
  missionId: string,
  proposal: MissionAnchorMigrationProposal,
  proposalDigest: string,
  adoption: ReturnType<typeof MissionAnchorAdoptionSchema.parse>,
): Promise<MissionRunnerStatus & { readonly live?: boolean }> {
  const live = requireSuccess(await requestMissionRunner(
    home,
    missionId,
    missionRunnerRequest({ kind: "status" }),
  )).status;
  assertExactMigrationTarget(proposal, live);
  requireSuccess(await requestMissionRunner(
    home,
    missionId,
    missionRunnerRequest({
      kind: "anchor-migration-adoption",
      proposalDigest,
      adoption,
      retireCarrier: true,
      expectedRunnerId: proposal.target.runnerId,
      expectedState: proposal.target.state,
    }),
  ));
  await waitForRetiredRunner(home, missionId, proposal.target.socketPath);
  return await startRunner(home, missionId);
}

async function settleLegacyCompatibilityAnchorMigration(
  home: string,
  missionId: string,
  proposal: MissionAnchorMigrationProposal,
  proposalDigest: string,
  decisionDigest: string,
  adoption: ReturnType<typeof MissionAnchorAdoptionSchema.parse>,
): Promise<MissionRunnerStatus & { readonly live?: boolean }> {
  let failureCode: AnchorMigrationInvalidationCode =
    "target-or-protocol-uncertain";
  try {
    let retirement = await readMissionAnchorMigrationRetirement(
      home,
      missionId,
      proposalDigest,
    );
    const retainedAttempt = await readMissionAnchorMigrationAttempt(
      home,
      missionId,
      proposalDigest,
    );
    const attempt = {
      version: MISSION_ANCHOR_MIGRATION_ATTEMPT_VERSION,
      missionId,
      proposalId: proposal.proposalId,
      proposalDigest,
      decisionDigest,
      protocolCapability: "legacy-response-verified-shutdown-v1" as const,
      target: migrationRetirementTarget(proposal),
      standing: "one-use-shutdown-attempt-started" as const,
    };
    const attemptDigest = missionAnchorMigrationAttemptDigest(attempt);
    let replacement:
      | (MissionRunnerStatus & { readonly live?: boolean })
      | undefined;

    if (retainedAttempt !== undefined) {
      if (
        stableStringify(retainedAttempt) !== stableStringify(attempt)
        || !retirementMatches(
          retirement,
          proposal,
          proposalDigest,
          decisionDigest,
          attemptDigest,
        )
      ) {
        throw new AnchorMigrationAttemptFailure(
          "shutdown-response-uncertain",
          "legacy anchor migration retains an unresolved one-use shutdown attempt; the same proposal and decision cannot be retried",
        );
      }
      const observed = await readVerifiedMissionRunnerIfReachable(
        home,
        missionId,
      );
      if (observed?.runnerId === proposal.target.runnerId) {
        throw new Error(
          "legacy anchor migration retirement evidence conflicts with a live original carrier",
        );
      }
      if (observed !== undefined) replacement = observed;
    } else {
      if (retirement !== undefined) {
        throw new AnchorMigrationAttemptFailure(
          "shutdown-response-uncertain",
          "legacy anchor migration retirement has no bound one-use attempt",
        );
      }
      const retained = await retainMissionAnchorMigrationAttempt(home, attempt);
      if (!retained.created) {
        throw new AnchorMigrationAttemptFailure(
          "shutdown-response-uncertain",
          "legacy anchor migration one-use attempt already exists",
        );
      }
      const observed = await readVerifiedMissionRunnerIfReachable(
        home,
        missionId,
      );
      if (observed === undefined) {
        throw new Error(
          "legacy anchor migration cannot reach the exact live carrier after retaining its one-use attempt",
        );
      }
      assertExactMigrationTarget(proposal, observed);
      failureCode = "shutdown-response-uncertain";
      const shutdown = requireSuccess(await requestMissionRunner(
        home,
        missionId,
        missionRunnerRequest({ kind: "runner-shutdown" }),
      ));
      assertExactMigrationTarget(proposal, shutdown.status, {
        expectedState: "stopped",
        expectedStopReason: "runner-shutdown",
      });
      failureCode = "socket-release-uncertain";
      await waitForRetiredRunner(home, missionId, proposal.target.socketPath);
      await retainMissionAnchorMigrationRetirement(home, {
        version: MISSION_ANCHOR_MIGRATION_RETIREMENT_VERSION,
        missionId,
        proposalId: proposal.proposalId,
        proposalDigest,
        decisionDigest,
        attemptDigest,
        protocolCapability: "legacy-response-verified-shutdown-v1",
        target: migrationRetirementTarget(proposal),
        standing: "exact-stopped-status-and-socket-release-observed",
      });
      retirement = await readMissionAnchorMigrationRetirement(
        home,
        missionId,
        proposalDigest,
      );
    }

    if (!retirementMatches(
      retirement,
      proposal,
      proposalDigest,
      decisionDigest,
      attemptDigest,
    )) {
      throw new Error(
        "legacy anchor migration has no exact retained carrier-retirement evidence",
      );
    }
    failureCode = "timeline-drift";
    const currentEvents = await new FileMissionTimeline(
      missionRunnerDirectory(home, missionId),
    ).readEvents(missionId);
    if (
      currentEvents.length !== proposal.retainedHistory.eventCount
      || digest(currentEvents) !== proposal.retainedHistory.timelineDigest
    ) {
      const observationCarrier = replacement ?? await startRunner(home, missionId);
      if (observationCarrier.runtimeMode !== "none") {
        throw new Error(
          "legacy anchor migration timeline drifted and the observation replacement is not no-runtime",
        );
      }
      throw new Error(
        `legacy anchor migration timeline drifted after carrier retirement; observation carrier ${observationCarrier.runnerId} requires a new proposal and ADOPT`,
      );
    }
    failureCode = "replacement-uncertain";
    if (replacement === undefined) {
      replacement = await startRunner(home, missionId);
    }
    if (
      replacement.runnerId === proposal.target.runnerId
      || replacement.runtimeMode !== "none"
      || replacement.state !== "anchor-pending"
    ) {
      throw new Error(
        `legacy anchor migration replacement ${replacement.runnerId} is not a new no-runtime anchor-pending carrier`,
      );
    }
    failureCode = "adoption-outcome-uncertain";
    const adopted = requireSuccess(await requestMissionRunner(
      home,
      missionId,
      missionRunnerRequest({
        kind: "anchor-adoption",
        adoption,
        expectedRunnerId: replacement.runnerId,
        expectedState: replacement.state,
      }),
    ));
    return adopted.status;
  } catch (error) {
    if (error instanceof AnchorMigrationAttemptFailure) throw error;
    throw new AnchorMigrationAttemptFailure(failureCode, error);
  }
}

function migrationRetirementTarget(
  proposal: MissionAnchorMigrationProposal,
): {
  readonly runnerId: string;
  readonly pid: number;
  readonly startedAt: string;
  readonly socketPath: string;
  readonly state: "input-pending" | "anchor-pending";
} {
  return {
    runnerId: proposal.target.runnerId,
    pid: proposal.target.pid,
    startedAt: proposal.target.startedAt,
    socketPath: proposal.target.socketPath,
    state: proposal.target.state,
  };
}

function retirementMatches(
  retirement: Awaited<ReturnType<typeof readMissionAnchorMigrationRetirement>>,
  proposal: MissionAnchorMigrationProposal,
  proposalDigest: string,
  decisionDigest: string,
  attemptDigest: string,
): boolean {
  return retirement !== undefined
    && retirement.proposalId === proposal.proposalId
    && retirement.proposalDigest === proposalDigest
    && retirement.decisionDigest === decisionDigest
    && retirement.attemptDigest === attemptDigest
    && stableStringify(retirement.target)
      === stableStringify(migrationRetirementTarget(proposal));
}

async function recoverAdoptedMigrationReplacement(
  home: string,
  missionId: string,
  proposal: MissionAnchorMigrationProposal,
  proposalDigest: string,
  adoption: ReturnType<typeof MissionAnchorAdoptionSchema.parse>,
): Promise<MissionRunnerStatus & { readonly live?: boolean }> {
  const observed = await readVerifiedMissionRunnerIfReachable(
    home,
    missionId,
  );
  if (observed?.runnerId === proposal.target.runnerId) {
    if (proposal.target.protocolCapability !== "atomic-adopt-retire-v1") {
      throw new Error(
        "legacy compatibility adoption exists while its original carrier is still live",
      );
    }
    assertExactMigrationTarget(proposal, observed);
    requireSuccess(await requestMissionRunner(
      home,
      missionId,
      missionRunnerRequest({
        kind: "anchor-migration-adoption",
        proposalDigest,
        adoption,
        retireCarrier: true,
        expectedRunnerId: proposal.target.runnerId,
        expectedState: proposal.target.state,
      }),
    ));
    await waitForRetiredRunner(home, missionId, proposal.target.socketPath);
    return await startRunner(home, missionId);
  }
  if (observed !== undefined) {
    if (observed.runtimeMode !== "none") {
      throw new Error(
        `Mission ${missionId} has an unverified replacement carrier ${observed.runnerId}`,
      );
    }
    return observed;
  }
  if (proposal.target.protocolCapability === "atomic-adopt-retire-v1") {
    await waitForRetiredRunner(home, missionId, proposal.target.socketPath);
  }
  return await startRunner(home, missionId);
}

function assertExactMigrationTarget(
  proposal: MissionAnchorMigrationProposal,
  status: MissionRunnerStatus,
  override: {
    readonly expectedState?: MissionRunnerState;
    readonly expectedStopReason?: "runner-shutdown";
  } = {},
): void {
  const expectedState = override.expectedState ?? proposal.target.state;
  if (
    status.runnerId !== proposal.target.runnerId
    || status.pid !== proposal.target.pid
    || status.startedAt !== proposal.target.startedAt
    || status.socketPath !== proposal.target.socketPath
    || status.state !== expectedState
    || (
      override.expectedStopReason !== undefined
      && status.stopReason !== override.expectedStopReason
    )
  ) {
    throw new Error(
      `anchor migration target drifted from ${proposal.target.runnerId}/${proposal.target.pid}/${proposal.target.startedAt}/${expectedState}`,
    );
  }
  const observedCapability = status.runtimeMode === undefined
    ? "legacy-response-verified-shutdown-v1"
    : "atomic-adopt-retire-v1";
  if (
    status.state !== "stopped"
    && observedCapability !== proposal.target.protocolCapability
  ) {
    throw new Error(
      `anchor migration target protocol drifted from ${proposal.target.protocolCapability} to ${observedCapability}`,
    );
  }
}

async function acquireAnchorMigrationSettlementLease(
  home: string,
  missionId: string,
  proposalDigest: string,
): Promise<() => Promise<void>> {
  const root = missionRunnerDirectory(home, missionId);
  const path = join(root, "anchor-migration-settlement.lock");
  const nonce = randomUUID();
  const owner = {
    pid: process.pid,
    proposalDigest,
    nonce,
    acquiredAt: new Date().toISOString(),
  };
  await mkdir(root, { recursive: true, mode: 0o700 });
  for (;;) {
    try {
      const handle = await open(path, "wx", 0o600);
      try {
        await handle.writeFile(`${JSON.stringify(owner)}\n`, "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }
      return async () => {
        try {
          const retained = JSON.parse(await readFile(path, "utf8")) as {
            readonly nonce?: unknown;
          };
          if (retained.nonce === nonce) await unlink(path);
        } catch (error) {
          if (!isMissingFile(error)) throw error;
        }
      };
    } catch (error) {
      if (!hasErrorCode(error, "EEXIST")) throw error;
    }
    let retained: { readonly pid?: unknown };
    try {
      retained = JSON.parse(await readFile(path, "utf8")) as {
        readonly pid?: unknown;
      };
    } catch (error) {
      if (isMissingFile(error)) continue;
      throw new Error("anchor migration settlement lease is unreadable");
    }
    if (
      typeof retained.pid !== "number"
      || !Number.isInteger(retained.pid)
      || retained.pid <= 0
    ) {
      throw new Error("anchor migration settlement lease has invalid owner evidence");
    }
    if (processIsAlive(retained.pid)) {
      throw new Error(
        `anchor migration settlement is already running in process ${retained.pid}`,
      );
    }
    const stale = `${path}.stale.${nonce}`;
    try {
      await rename(path, stale);
      await unlink(stale).catch(() => undefined);
    } catch (error) {
      if (isMissingFile(error)) continue;
      throw error;
    }
  }
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (hasErrorCode(error, "ESRCH")) return false;
    return true;
  }
}

function isMissingFile(error: unknown): boolean {
  return hasErrorCode(error, "ENOENT");
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error !== null
    && typeof error === "object"
    && "code" in error
    && error.code === code;
}

async function waitForRetiredRunner(
  home: string,
  missionId: string,
  expectedSocketPath = missionRunnerSocketPath(home, missionId),
  timeoutMs = 5_000,
): Promise<void> {
  if (expectedSocketPath !== missionRunnerSocketPath(home, missionId)) {
    throw new Error(`retired Mission runner socket does not match the Mission binding`);
  }
  const socketPath = expectedSocketPath;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let live = false;
    try {
      const response = await requestMissionRunner(
        home,
        missionId,
        missionRunnerRequest({ kind: "status" }),
        100,
      );
      live = response.ok;
    } catch (error) {
      const reachability = await classifyMissionRunnerReachabilityFailureAtSocket(
        error,
        socketPath,
      );
      if (reachability.standing === "unknown") {
        throw new Error(
          `retired Mission runner reachability could not be verified: ${reachability.message}`,
          { cause: error },
        );
      }
      // A missing or refusing socket is expected after retirement.
    }
    let socketExists = true;
    try {
      await stat(socketPath);
    } catch (error) {
      if (
        error !== null
        && typeof error === "object"
        && "code" in error
        && error.code === "ENOENT"
      ) socketExists = false;
      else throw error;
    }
    if (!live && !socketExists) return;
    await Bun.sleep(25);
  }
  throw new Error(`retired Mission runner for ${missionId} did not release its socket`);
}

async function sendInput(
  home: string,
  missionId: string,
  input: MissionInputDraft,
  target: MissionRunnerExpectedTarget,
): Promise<unknown> {
  const response = requireSuccess(await requestMissionRunner(
    home,
    missionId,
    missionRunnerRequest({ kind: "input", input, ...target }),
  ));
  return { status: response.status, receipt: response.receipt };
}

async function recoverTurn(
  home: string,
  missionId: string,
  recovery: {
    readonly id: string;
    readonly actorRef: string;
    readonly sourceRef: string;
    readonly action: "resume" | "replace" | "abandon";
  },
  target: MissionRunnerExpectedTarget,
): Promise<unknown> {
  const response = requireSuccess(await requestMissionRunner(
    home,
    missionId,
    missionRunnerRequest({ kind: "recovery", recovery, ...target }),
  ));
  return { status: response.status, recovery };
}

function requireSuccess(response: MissionRunnerResponse): Extract<MissionRunnerResponse, { ok: true }> {
  if (!response.ok) throw new Error(response.error);
  return response;
}

function parseArguments(args: readonly string[]): CliArguments {
  const positionals: string[] = [];
  let home = process.env.ROSSO_HOME ?? join(homedir(), ".rosso");
  let id: string = randomUUID();
  let actorRef = "operator";
  let sourceRef = "cli";
  let expectedRunnerId: string | undefined;
  let expectedState: MissionRunnerState | undefined;
  let runtimeModule: string | undefined;
  let anchorFile: string | undefined;
  let expectedProposalDigest: string | undefined;
  let missionSourceRoot: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    const value = args[index + 1];
    if ([
      "--home",
      "--id",
      "--actor",
      "--source",
      "--expected-runner",
      "--expected-state",
      "--runtime",
      "--anchor",
      "--expected-proposal-digest",
      "--mission-source-root",
    ].includes(argument)) {
      if (value === undefined) throw new Error(`missing value for ${argument}`);
      if (argument === "--home") home = value;
      if (argument === "--id") id = value;
      if (argument === "--actor") actorRef = value;
      if (argument === "--source") sourceRef = value;
      if (argument === "--expected-runner") expectedRunnerId = value;
      if (argument === "--expected-state") {
        if (![
          "running",
          "idle",
          "anchor-pending",
          "paused",
          "input-pending",
          "interrupted",
          "mission-stopped",
          "stopped",
        ].includes(value)) {
          throw new Error(`invalid expected runner state: ${value}`);
        }
        expectedState = value as MissionRunnerState;
      }
      if (argument === "--runtime") runtimeModule = value;
      if (argument === "--anchor") anchorFile = value;
      if (argument === "--expected-proposal-digest") {
        if (!/^[a-f0-9]{64}$/.test(value)) {
          throw new Error("--expected-proposal-digest must be a sha256 digest");
        }
        expectedProposalDigest = value;
      }
      if (argument === "--mission-source-root") missionSourceRoot = value;
      index += 1;
      continue;
    }
    if (argument.startsWith("--")) throw new Error(`unknown option ${argument}`);
    positionals.push(argument);
  }
  if ((expectedRunnerId === undefined) !== (expectedState === undefined)) {
    throw new Error("--expected-runner and --expected-state must be supplied together");
  }
  return {
    positionals,
    home,
    id,
    actorRef,
    sourceRef,
    ...(expectedRunnerId === undefined ? {} : { expectedRunnerId }),
    ...(expectedState === undefined ? {} : { expectedState }),
    ...(runtimeModule === undefined ? {} : { runtimeModule }),
    ...(anchorFile === undefined ? {} : { anchorFile }),
    ...(expectedProposalDigest === undefined
      ? {}
      : { expectedProposalDigest }),
    ...(missionSourceRoot === undefined ? {} : { missionSourceRoot }),
  };
}

function expectedTarget(args: CliArguments): MissionRunnerExpectedTarget {
  return args.expectedRunnerId === undefined || args.expectedState === undefined
    ? {}
    : {
      expectedRunnerId: args.expectedRunnerId,
      expectedState: args.expectedState,
    };
}

function requiredExpectedTarget(
  args: CliArguments,
  action: string,
): Required<MissionRunnerExpectedTarget> {
  if (args.expectedRunnerId === undefined || args.expectedState === undefined) {
    throw new Error(
      `${action} requires --expected-runner and --expected-state`,
    );
  }
  return {
    expectedRunnerId: args.expectedRunnerId,
    expectedState: args.expectedState,
  };
}

function usage(): string {
  return [
    "Usage:",
    "  autonomy runner start <mission-id> [--runtime <module-path>] [--anchor <seed.json>] [--home <path>]",
    "  autonomy runner status <mission-id> [--home <path>]",
    "  autonomy runner activity <mission-id> [--home <path>]",
    "  autonomy runner shutdown <mission-id> [--home <path>]",
    "  autonomy effect verify <mission-id> <effect-id> <verification.json> [--home <path>]",
    "  autonomy mission input <mission-id> <text> [--id <id>] [--actor <ref>] [--source <ref>] [guard options]",
    "  autonomy mission correction <mission-id> <request.json> [--id <id>] [--actor <ref>] [--source <ref>] [guard options]",
    "  autonomy mission prepare-anchor-migration <mission-id> <proposal.json> [guard options] [--expected-proposal-digest <sha256>]",
    "  autonomy mission settle-anchor-migration <mission-id> <decision.json> --mission-source-root <git-root> [--home <path>]",
    "  autonomy mission adopt-anchor <mission-id> <adoption.json> [guard options]",
    "  autonomy mission reconcile <mission-id> <commit.json> [guard options] [--home <path>]",
    "  autonomy mission control <mission-id> <pause|resume|stop|approve-effect> [input options] [guard options]",
    "  autonomy mission recover <mission-id> <resume|replace|abandon> [--id <id>] [--actor <ref>] [--source <ref>] [guard options]",
    "  guard options: --expected-runner <runner-id> --expected-state <runner-state> (must be paired)",
  ].join("\n");
}
