import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { digest } from "../src/canonical-json";
import { FileMissionTimeline } from "../src/delegate-timeline";
import {
  MISSION_ANCHOR_MIGRATION_ATTEMPT_VERSION,
  MISSION_ANCHOR_MIGRATION_DECISION_VERSION,
  MISSION_ANCHOR_MIGRATION_INVALIDATION_VERSION,
  MISSION_ANCHOR_MIGRATION_PROPOSAL_VERSION,
  MissionAnchorMigrationAttemptSchema,
  MissionAnchorMigrationDecisionSchema,
  MissionAnchorMigrationProposalSchema,
  missionAnchorMigrationAttemptDigest,
  missionAnchorMigrationDecisionDigest,
  missionAnchorMigrationProposalPath,
  missionAnchorMigrationProposalDigest,
  projectMissionAnchorMigrationProposal,
  readMissionAnchorMigrationAttempt,
  retainMissionAnchorMigrationAttempt,
  retainMissionAnchorMigrationDecision,
  retainMissionAnchorMigrationInvalidation,
  retainMissionAnchorMigrationProposal,
  verifyMissionAnchorMigrationSource,
} from "../src/mission-anchor-migration-proposal";
import {
  missionRunnerDirectory,
  missionRunnerStatusPath,
  type MissionRunnerStatus,
} from "../src/mission-runner";
import { projectMissionIntentLineage } from "../src/mission-timeline-state";

const homes: string[] = [];

afterEach(async () => {
  await Promise.all(homes.splice(0).map((home) =>
    rm(home, { recursive: true, force: true })
  ));
});

describe("Mission anchor migration proposal", () => {
  test("retains a proposal-only brief bound to exact legacy history and runner state", async () => {
    const context = await fixture();
    const retained = await retainMissionAnchorMigrationProposal(
      context.home,
      context.missionId,
      context.proposal,
      { status: context.status, live: true },
    );
    await writeStatus(context.home, context.missionId, context.status);

    const events = await context.timeline.readEvents(context.missionId);
    const projection = await projectMissionAnchorMigrationProposal(
      context.home,
      context.missionId,
      projectMissionIntentLineage(events, context.missionId),
    );

    expect(retained.proposalDigest).toBe(
      missionAnchorMigrationProposalDigest(context.proposal),
    );
    expect(projection).toMatchObject({
      standing: "awaiting-principal-decision",
      proposalDigest: retained.proposalDigest,
      proposal: {
        decision: {
          recommendation: "ADOPT",
          replyKey: "ADOPT|HOLD",
        },
        authorityBoundary: {
          standing: "proposal-only",
          carrierReplacement: "withheld",
          adoption: "withheld",
          reconciliation: "withheld",
          externalDisclosure: "none",
          candidateWrite: "withheld",
          commit: "withheld",
          merge: "withheld",
          publish: "withheld",
          productAcceptance: "withheld",
        },
      },
    });
    expect(JSON.stringify(retained.proposal)).not.toContain("authorityRef");
  });

  test("fails closed on history drift and projects retained target drift as stale", async () => {
    const context = await fixture();
    await expect(retainMissionAnchorMigrationProposal(
      context.home,
      context.missionId,
      {
        ...context.proposal,
        retainedHistory: {
          ...context.proposal.retainedHistory,
          eventCount: context.proposal.retainedHistory.eventCount + 1,
        },
      },
      { status: context.status, live: true },
    )).rejects.toThrow("exact Mission history");

    await retainMissionAnchorMigrationProposal(
      context.home,
      context.missionId,
      context.proposal,
      { status: context.status, live: true },
    );
    await writeStatus(context.home, context.missionId, {
      ...context.status,
      runnerId: "replacement-runner",
    });
    const events = await context.timeline.readEvents(context.missionId);
    await expect(projectMissionAnchorMigrationProposal(
      context.home,
      context.missionId,
      projectMissionIntentLineage(events, context.missionId),
    )).resolves.toMatchObject({
      standing: "stale",
      reason: "the exact runner target changed",
    });
  });

  test("rejects an authority-bearing or nonzero-watermark lookalike", async () => {
    const context = await fixture();
    expect(MissionAnchorMigrationProposalSchema.safeParse({
      ...context.proposal,
      authorityRef: "principal:forged",
    }).success).toBe(false);
    expect(MissionAnchorMigrationProposalSchema.safeParse({
      ...context.proposal,
      proposedAdoption: {
        ...context.proposal.proposedAdoption,
        anchor: {
          ...context.proposal.proposedAdoption.anchor,
          reconciledWatermark: 1,
        },
      },
    }).success).toBe(false);
  });

  test("does not replace a different retained proposal", async () => {
    const context = await fixture();
    await retainMissionAnchorMigrationProposal(
      context.home,
      context.missionId,
      context.proposal,
      { status: context.status, live: true },
    );
    await expect(retainMissionAnchorMigrationProposal(
      context.home,
      context.missionId,
      {
        ...context.proposal,
        proposalId: "different-proposal",
      },
      { status: context.status, live: true },
    )).rejects.toThrow("already retains a different");

    const replacement = {
      ...context.proposal,
      proposalId: "different-proposal",
    };
    const superseded = await retainMissionAnchorMigrationProposal(
      context.home,
      context.missionId,
      replacement,
      { status: context.status, live: true },
      {
        expectedPreviousProposalDigest:
          missionAnchorMigrationProposalDigest(context.proposal),
      },
    );
    expect(superseded.proposal.proposalId).toBe("different-proposal");
  });

  test("upgrades an incompatible proposal-only schema only with its exact prior digest", async () => {
    const context = await fixture();
    const incompatible = {
      ...context.proposal,
      target: {
        runnerId: context.status.runnerId,
        state: context.status.state,
        live: true,
      },
      executionSequence: [
        "append-anchor-and-retire-exact-carrier",
        "start-no-runtime-carrier",
      ],
    };
    delete (incompatible as { residualRisk?: unknown }).residualRisk;
    await writeFile(
      missionAnchorMigrationProposalPath(context.home, context.missionId),
      `${JSON.stringify(incompatible, null, 2)}\n`,
      "utf8",
    );

    await expect(retainMissionAnchorMigrationProposal(
      context.home,
      context.missionId,
      context.proposal,
      { status: context.status, live: true },
    )).rejects.toThrow("exact prior digest required");

    await expect(retainMissionAnchorMigrationProposal(
      context.home,
      context.missionId,
      context.proposal,
      { status: context.status, live: true },
      { expectedPreviousProposalDigest: digest(incompatible) },
    )).resolves.toMatchObject({
      proposal: {
        proposalId: context.proposal.proposalId,
        residualRisk: { kind: "none" },
      },
    });
  });

  test("retains one immutable ADOPT decision per proposal under replay and concurrency", async () => {
    const context = await fixture();
    const proposalDigest = missionAnchorMigrationProposalDigest(context.proposal);
    const decision = MissionAnchorMigrationDecisionSchema.parse({
      version: MISSION_ANCHOR_MIGRATION_DECISION_VERSION,
      decisionId: "legacy-mission-anchor-decision-v1",
      proposalId: context.proposal.proposalId,
      proposalDigest,
      missionId: context.missionId,
      missionSource: context.proposal.missionSource,
      choice: "ADOPT",
      authorityRef: "principal:test",
      sourceRef: "conversation:test-adopt",
      decidedAt: "2026-07-27T00:03:00Z",
    });

    const first = await retainMissionAnchorMigrationDecision(context.home, decision);
    const replay = await retainMissionAnchorMigrationDecision(context.home, decision);
    expect(replay).toEqual(first);
    expect(first.decisionDigest).toBe(missionAnchorMigrationDecisionDigest(decision));

    const conflicting = MissionAnchorMigrationDecisionSchema.parse({
      ...decision,
      decisionId: "legacy-mission-anchor-decision-v2",
      decidedAt: "2026-07-27T00:04:00Z",
    });
    await expect(retainMissionAnchorMigrationDecision(
      context.home,
      conflicting,
    )).rejects.toThrow("already has a different decision");

    const concurrent = await fixture();
    const concurrentDigest = missionAnchorMigrationProposalDigest(concurrent.proposal);
    const choices = ["a", "b"].map((suffix, index) =>
      MissionAnchorMigrationDecisionSchema.parse({
        version: MISSION_ANCHOR_MIGRATION_DECISION_VERSION,
        decisionId: `legacy-mission-anchor-decision-${suffix}`,
        proposalId: concurrent.proposal.proposalId,
        proposalDigest: concurrentDigest,
        missionId: concurrent.missionId,
        missionSource: concurrent.proposal.missionSource,
        choice: "ADOPT",
        authorityRef: `principal:${suffix}`,
        sourceRef: `conversation:${suffix}`,
        decidedAt: `2026-07-27T00:0${index + 5}:00Z`,
      })
    );
    const raced = await Promise.allSettled(choices.map((choice) =>
      retainMissionAnchorMigrationDecision(concurrent.home, choice)
    ));
    expect(raced.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(raced.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  test("retains one immutable pre-effect compatibility attempt", async () => {
    const context = await fixture();
    const proposal = MissionAnchorMigrationProposalSchema.parse({
      ...context.proposal,
      target: {
        ...context.proposal.target,
        protocolCapability: "legacy-response-verified-shutdown-v1",
      },
      executionSequence: [
        "request-unguarded-shutdown",
        "verify-exact-shutdown-response",
        "wait-exact-socket-release",
        "start-no-runtime-carrier",
        "append-exact-legacy-anchor",
      ],
      residualRisk: {
        kind: "post-effect-carrier-identity-verification",
        consequence: "reversible-carrier-stop",
        reopenOn: "missing-or-mismatched-shutdown-response-or-identity-drift",
      },
    });
    const proposalDigest = missionAnchorMigrationProposalDigest(proposal);
    const attempt = MissionAnchorMigrationAttemptSchema.parse({
      version: MISSION_ANCHOR_MIGRATION_ATTEMPT_VERSION,
      missionId: context.missionId,
      proposalId: proposal.proposalId,
      proposalDigest,
      decisionDigest: "b".repeat(64),
      protocolCapability: "legacy-response-verified-shutdown-v1",
      target: {
        runnerId: proposal.target.runnerId,
        pid: proposal.target.pid,
        startedAt: proposal.target.startedAt,
        socketPath: proposal.target.socketPath,
        state: proposal.target.state,
      },
      standing: "one-use-shutdown-attempt-started",
    });

    const first = await retainMissionAnchorMigrationAttempt(context.home, attempt);
    const replay = await retainMissionAnchorMigrationAttempt(context.home, attempt);
    expect(first.created).toBe(true);
    expect(replay.created).toBe(false);
    expect(await readMissionAnchorMigrationAttempt(
      context.home,
      context.missionId,
      proposalDigest,
    )).toEqual(attempt);
    expect(missionAnchorMigrationAttemptDigest(attempt)).toMatch(/^[a-f0-9]{64}$/);

    await expect(retainMissionAnchorMigrationAttempt(context.home, {
      ...attempt,
      decisionDigest: "c".repeat(64),
    })).rejects.toThrow("conflicts with retained evidence");
  });

  test("projects an invalidated compatibility attempt as stale", async () => {
    const context = await fixture();
    const retained = await retainMissionAnchorMigrationProposal(
      context.home,
      context.missionId,
      context.proposal,
      { status: context.status, live: true },
    );
    await writeStatus(context.home, context.missionId, context.status);
    await retainMissionAnchorMigrationInvalidation(context.home, {
      version: MISSION_ANCHOR_MIGRATION_INVALIDATION_VERSION,
      missionId: context.missionId,
      proposalId: context.proposal.proposalId,
      proposalDigest: retained.proposalDigest,
      decisionDigest: "d".repeat(64),
      code: "shutdown-response-uncertain",
      detailDigest: "e".repeat(64),
      recordedAt: "2026-07-27T00:05:00Z",
      standing: "requires-new-proposal-and-adopt",
    });

    const events = await context.timeline.readEvents(context.missionId);
    await expect(projectMissionAnchorMigrationProposal(
      context.home,
      context.missionId,
      projectMissionIntentLineage(events, context.missionId),
    )).resolves.toMatchObject({
      standing: "stale",
      reason: "proposal attempt was invalidated: shutdown-response-uncertain",
    });
  });

  test("verifies the exact committed Mission source and rejects file or HEAD drift", async () => {
    const context = await fixture();
    const sourceRoot = join(context.home, "source");
    const relativePath = "apps/missions/legacy-mission.json";
    await mkdir(join(sourceRoot, "apps", "missions"), { recursive: true });
    git(sourceRoot, "init");
    git(sourceRoot, "config", "user.name", "Migration Test");
    git(sourceRoot, "config", "user.email", "migration@example.test");
    await writeFile(
      join(sourceRoot, relativePath),
      `${JSON.stringify({ id: context.missionId })}\n`,
      "utf8",
    );
    git(sourceRoot, "add", relativePath);
    git(sourceRoot, "commit", "-m", "test: retain Mission source");
    const proposal = MissionAnchorMigrationProposalSchema.parse({
      ...context.proposal,
      missionSource: {
        ...context.proposal.missionSource,
        relativePath,
        gitHead: git(sourceRoot, "rev-parse", "HEAD"),
      },
    });

    expect(() => verifyMissionAnchorMigrationSource(proposal, sourceRoot)).not.toThrow();
    await writeFile(
      join(sourceRoot, relativePath),
      `${JSON.stringify({ id: context.missionId, drift: true })}\n`,
      "utf8",
    );
    expect(() => verifyMissionAnchorMigrationSource(proposal, sourceRoot)).toThrow(
      "differs from committed HEAD",
    );

    git(sourceRoot, "add", relativePath);
    git(sourceRoot, "commit", "-m", "test: move Mission source HEAD");
    expect(() => verifyMissionAnchorMigrationSource(proposal, sourceRoot)).toThrow(
      "HEAD drifted",
    );
  });
});

async function fixture() {
  const home = await mkdtemp(join(tmpdir(), "rosso-anchor-proposal-"));
  homes.push(home);
  const missionId = "legacy-mission";
  const timeline = new FileMissionTimeline(missionRunnerDirectory(home, missionId));
  await timeline.appendInput(missionId, {
    id: "input-1",
    actorRef: "principal",
    sourceRef: "conversation:test",
    payload: { kind: "contribution", text: "retained legacy work" },
  });
  const events = await timeline.readEvents(missionId);
  const status: MissionRunnerStatus = {
    version: "rosso.mission-runner.v1",
    runnerId: "legacy-runner",
    missionId,
    pid: 123,
    state: "input-pending",
    startedAt: "2026-07-27T00:00:00Z",
    updatedAt: "2026-07-27T00:01:00Z",
    inputWatermark: 1,
    reconciledWatermark: 0,
    runtimeMode: "none",
    socketPath: "/tmp/legacy-runner.sock",
    stopReason: null,
  };
  const proposal = MissionAnchorMigrationProposalSchema.parse({
    version: MISSION_ANCHOR_MIGRATION_PROPOSAL_VERSION,
    proposalId: "legacy-mission-anchor-migration-v1",
    missionId,
    preparedAt: "2026-07-27T00:02:00Z",
    preparedBy: "supervisor:Codex",
    missionSource: {
      projectId: "project-1",
      relativePath: "apps/missions/legacy-mission.json",
      gitHead: "a".repeat(64),
    },
    target: {
      runnerId: status.runnerId,
      pid: status.pid,
      startedAt: status.startedAt,
      socketPath: status.socketPath,
      state: status.state,
      live: true,
      protocolCapability: "atomic-adopt-retire-v1",
    },
    retainedHistory: {
      eventCount: events.length,
      timelineDigest: digest(events),
    },
    proposedAdoption: {
      adoptionId: "legacy-mission-anchor-adoption-v1",
      semanticSourceRef: "mission:legacy-mission",
      anchor: {
        id: "anchor:legacy-mission",
        revision: "legacy-adoption-r1",
        statement: "Continue this exact Mission under live intent lineage.",
        sourceRefs: ["mission:legacy-mission"],
        reconciledWatermark: 0,
      },
    },
    executionSequence: [
      "append-anchor-and-retire-exact-carrier",
      "start-no-runtime-carrier",
    ],
    residualRisk: {
      kind: "none",
      consequence: "none",
      reopenOn: "target-source-or-history-drift",
    },
    decision: {
      recommendation: "ADOPT",
      replyKey: "ADOPT|HOLD",
      options: {
        ADOPT: {
          immediateResult: "Replace the exact carrier and append the exact anchor.",
          tradeoff: "The append is permanent and correction reconciliation stays blocked.",
        },
        HOLD: {
          immediateResult: "Perform no mutation.",
          tradeoff: "Semantic work remains blocked.",
        },
      },
    },
    authorityBoundary: {
      standing: "proposal-only",
      carrierReplacement: "withheld",
      adoption: "withheld",
      reconciliation: "withheld",
      externalDisclosure: "none",
      candidateWrite: "withheld",
      commit: "withheld",
      merge: "withheld",
      publish: "withheld",
      productAcceptance: "withheld",
    },
  });
  return { home, missionId, timeline, status, proposal };
}

async function writeStatus(
  home: string,
  missionId: string,
  status: MissionRunnerStatus,
): Promise<void> {
  const path = missionRunnerStatusPath(home, missionId);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(status, null, 2)}\n`);
}

function git(root: string, ...args: string[]): string {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }
  return result.stdout.trim();
}
