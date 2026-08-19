import { afterEach, expect, test } from "bun:test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { createConnection, createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CellRunRecord } from "../../../packages/work-cell/src/contracts";
import { digest } from "../src/canonical-json";
import { FileMissionTimeline } from "../src/delegate-timeline";
import {
  MISSION_ANCHOR_MIGRATION_ATTEMPT_VERSION,
  MISSION_ANCHOR_MIGRATION_DECISION_VERSION,
  MISSION_ANCHOR_MIGRATION_PROPOSAL_VERSION,
  MissionAnchorMigrationAttemptSchema,
  MissionAnchorMigrationDecisionSchema,
  MissionAnchorMigrationProposalSchema,
  missionAnchorMigrationAttemptDigest,
  missionAnchorMigrationDecisionDigest,
  missionAnchorMigrationProposalDigest,
  readMissionAnchorMigrationAttempt,
  readMissionAnchorMigrationInvalidation,
  readMissionAnchorMigrationRetirement,
  retainMissionAnchorMigrationAttempt,
  retainMissionAnchorMigrationProposal,
} from "../src/mission-anchor-migration-proposal";
import type { MissionInputReceipt } from "../src/mission-input";
import {
  type MissionReconciliationCommit,
} from "../src/mission-reconciliation-commit";
import { retainMissionReconciliationCellRecord } from "../src/mission-reconciliation-evidence";
import {
  digestAnchor,
  type ActiveIntentAnchor,
  type MissionReconciliationProposal,
} from "../src/mission-reconciliation";
import type { MissionReconciliationVerification } from "../src/mission-reconciliation-verification";
import { MISSION_TURN_RECOVERY_VERSION, MISSION_TURN_VERSION } from "../src/mission-turn";
import {
  classifyMissionRunnerReachabilityFailure,
  classifyMissionRunnerReachabilityFailureAtSocket,
  missionRunnerDirectory,
  missionRunnerRequest,
  missionRunnerSocketPath,
  readMissionRunnerStatus,
  readVerifiedMissionRunnerIfReachable,
  removeStaleMissionRunnerSocket,
  requestMissionRunner,
  type MissionRunnerResponse,
} from "../src/mission-runner";

const roots: string[] = [];
const children: ChildProcess[] = [];
const childErrors = new WeakMap<ChildProcess, string>();

afterEach(async () => {
  for (const child of children.splice(0)) {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  }
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("runner reachability distinguishes definitive absence from observer uncertainty", () => {
  expect(classifyMissionRunnerReachabilityFailure(
    Object.assign(new Error("socket missing"), { code: "ENOENT" }),
  )).toEqual({
    standing: "unreachable",
    code: "ENOENT",
    message: "socket missing",
  });
  expect(classifyMissionRunnerReachabilityFailure(
    Object.assign(new Error("operation not permitted"), { code: "EPERM" }),
  )).toEqual({
    standing: "unknown",
    code: "EPERM",
    message: "operation not permitted",
  });
  expect(classifyMissionRunnerReachabilityFailure(
    new Error("Mission runner request timed out"),
  )).toEqual({
    standing: "unknown",
    code: null,
    message: "Mission runner request timed out",
  });
});

test("a masked ENOENT cannot prove the carrier absent while the exact socket path still exists", async () => {
  const root = await fixture();
  const presentSocketPath = join(root, "masked.sock");
  await writeFile(presentSocketPath, "");
  const masked = Object.assign(new Error("connect ENOENT"), { code: "ENOENT" });

  await expect(classifyMissionRunnerReachabilityFailureAtSocket(
    masked,
    presentSocketPath,
  )).resolves.toEqual({
    standing: "unknown",
    code: "ENOENT",
    message: "connect ENOENT",
    socketPathStanding: "present",
  });
  await expect(classifyMissionRunnerReachabilityFailureAtSocket(
    masked,
    join(root, "absent.sock"),
  )).resolves.toEqual({
    standing: "unreachable",
    code: "ENOENT",
    message: "connect ENOENT",
    socketPathStanding: "absent",
  });
});

test("stale-socket cleanup retains a present path when the probe reports masked ENOENT", async () => {
  const root = await fixture();
  const socketPath = join(root, "masked-cleanup.sock");
  await writeFile(socketPath, "");
  const masked = Object.assign(new Error("connect ENOENT"), { code: "ENOENT" });

  await expect(removeStaleMissionRunnerSocket(
    socketPath,
    async () => {
      throw masked;
    },
  )).rejects.toThrow(
    "reachability could not be verified before stale-socket cleanup",
  );
  expect((await stat(socketPath)).isFile()).toBe(true);
});

test("a mutation observer distinguishes an absent runner from an invalid live response", async () => {
  const root = await fixture();
  const missionId = "mission-observer-uncertainty";
  await expect(readVerifiedMissionRunnerIfReachable(
    root,
    missionId,
  )).resolves.toBeUndefined();

  const socketPath = missionRunnerSocketPath(root, missionId);
  await mkdir(dirname(socketPath), { recursive: true });
  const server = createServer((socket) => {
    socket.end("{invalid-response}\n");
  });
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(socketPath, resolveListen);
  });
  try {
    await expect(readVerifiedMissionRunnerIfReachable(
      root,
      missionId,
    )).rejects.toThrow(
      `Mission ${missionId} runner reachability could not be verified`,
    );
    expect((await stat(socketPath)).isSocket()).toBe(true);
  } finally {
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
  }
});

test("a Mission runner durably accepts input, restarts from events, and keeps carrier shutdown distinct from Mission stop", async () => {
  const root = await fixture();
  const missionId = "mission-background-1";
  const timeline = new FileMissionTimeline(missionRunnerDirectory(root, missionId));
  await seedTimeline(timeline, missionId);

  const first = startRunner(root, missionId);
  const initial = await waitForLiveStatus(root, missionId, first);
  expect(initial).toMatchObject({ state: "idle", inputWatermark: 0, reconciledWatermark: 0 });

  const contributionRequest = missionRunnerRequest({
    kind: "input",
    input: {
      id: "input-1",
      actorRef: "principal:local",
      sourceRef: "terminal:primary",
      payload: { kind: "contribution", text: "Keep the Mission alive across runner restarts." },
    },
  });
  const accepted = requireSuccess(await requestMissionRunner(root, missionId, contributionRequest));
  expect(accepted.receipt).toMatchObject({ inputId: "input-1", watermark: 1 });
  expect(accepted.status.state).toBe("input-pending");

  const replayed = requireSuccess(await requestMissionRunner(root, missionId, missionRunnerRequest({
    kind: "input",
    input: contributionRequest.kind === "input" ? contributionRequest.input : never(),
  })));
  expect(replayed.receipt?.eventId).toBe(accepted.receipt?.eventId);
  expect(replayed.status.inputWatermark).toBe(1);

  first.kill("SIGTERM");
  await waitForExit(first);
  expect(await readMissionRunnerStatus(root, missionId)).toMatchObject({
    state: "stopped",
    stopReason: "runner-shutdown",
  });

  expect(await timeline.currentInputWatermark(missionId)).toBe(1);
  expect((await timeline.readInputsAfter(missionId, 0)).map((input) => input.payload)).toEqual([
    { kind: "contribution", text: "Keep the Mission alive across runner restarts." },
  ]);

  const second = startRunner(root, missionId);
  const rebuilt = await waitForLiveStatus(root, missionId, second);
  expect(rebuilt.runnerId).not.toBe(initial.runnerId);
  expect(rebuilt).toMatchObject({ state: "input-pending", inputWatermark: 1 });

  const paused = await sendControl(root, missionId, "input-2", "pause");
  expect(paused.status.state).toBe("paused");
  await requestMissionRunner(root, missionId, missionRunnerRequest({ kind: "runner-shutdown" }));
  await waitForExit(second);

  const third = startRunner(root, missionId);
  expect((await waitForLiveStatus(root, missionId, third)).state).toBe("paused");
  const stopped = await sendControl(root, missionId, "input-3", "stop");
  expect(stopped.status).toMatchObject({ state: "mission-stopped", stopReason: "mission-stop" });
  await waitForExit(third);

  const fourth = startRunner(root, missionId);
  await waitForExit(fourth);
  const terminalProjection = await readMissionRunnerStatus(root, missionId);
  expect(terminalProjection).toMatchObject({
    pid: fourth.pid,
    state: "mission-stopped",
    stopReason: "mission-stop",
    inputWatermark: 3,
  });
}, 15_000);

test("a guarded action rejects a replacement runner atomically and resume remains input-pending", async () => {
  const root = await fixture();
  const missionId = "mission-guarded-action";
  const timeline = new FileMissionTimeline(missionRunnerDirectory(root, missionId));
  await seedTimeline(timeline, missionId);
  const first = startRunner(root, missionId);
  const firstStatus = await waitForLiveStatus(root, missionId, first);
  await requestMissionRunner(root, missionId, missionRunnerRequest({ kind: "runner-shutdown" }));
  await waitForExit(first);

  const replacement = startRunner(root, missionId);
  const replacementStatus = await waitForLiveStatus(root, missionId, replacement);
  expect(replacementStatus.runnerId).not.toBe(firstStatus.runnerId);

  const stale = await requestMissionRunner(root, missionId, missionRunnerRequest({
    kind: "input",
    expectedRunnerId: firstStatus.runnerId,
    expectedState: "idle",
    input: {
      id: "stale-pause",
      actorRef: "principal",
      sourceRef: "workbench-ui",
      payload: { kind: "control", command: "pause" },
    },
  }));
  expect(stale).toMatchObject({
    ok: false,
    error: expect.stringContaining(`runner changed from ${firstStatus.runnerId} to ${replacementStatus.runnerId}`),
  });

  expect(await timeline.currentInputWatermark(missionId)).toBe(0);

  const paused = requireSuccess(await requestMissionRunner(root, missionId, missionRunnerRequest({
    kind: "input",
    expectedRunnerId: replacementStatus.runnerId,
    expectedState: "idle",
    input: {
      id: "current-pause",
      actorRef: "principal",
      sourceRef: "workbench-ui",
      payload: { kind: "control", command: "pause" },
    },
  })));
  expect(paused.status.state).toBe("paused");

  const resumed = requireSuccess(await requestMissionRunner(root, missionId, missionRunnerRequest({
    kind: "input",
    expectedRunnerId: replacementStatus.runnerId,
    expectedState: "paused",
    input: {
      id: "current-resume",
      actorRef: "principal",
      sourceRef: "workbench-ui",
      payload: { kind: "control", command: "resume" },
    },
  })));
  expect(resumed.status).toMatchObject({
    state: "input-pending",
    inputWatermark: 2,
    reconciledWatermark: 0,
  });

  await requestMissionRunner(root, missionId, missionRunnerRequest({ kind: "runner-shutdown" }));
  await waitForExit(replacement);
}, 10_000);

test("a runtime-bearing fresh runner fails closed without an authorized anchor", async () => {
  const root = await fixture();
  const missionId = "mission-no-anchor-runtime";
  const runtimeModule = fileURLToPath(new URL("./fixtures/continuing-mission-runtime.ts", import.meta.url));
  const child = startRunner(root, missionId, runtimeModule);

  await waitForExit(child);
  expect(child.exitCode).toBe(1);
  expect(childErrors.get(child)).toContain(
    `Mission ${missionId} has no authorized intent anchor and cannot execute semantic work`,
  );
  const timeline = new FileMissionTimeline(missionRunnerDirectory(root, missionId));
  expect(await timeline.latestTurn(missionId)).toBeUndefined();
});

test("a schema-invalid request retains its supplied request ID and diagnostic", async () => {
  const root = await fixture();
  const missionId = "mission-invalid-request-diagnostic";
  const timeline = new FileMissionTimeline(missionRunnerDirectory(root, missionId));
  await seedTimeline(timeline, missionId);
  const child = startRunner(root, missionId);
  const status = await waitForLiveStatus(root, missionId, child);

  const response = await rawRunnerRequest(status.socketPath, {
    version: "rosso.mission-runner.v1",
    requestId: "invalid-request-diagnostic",
    kind: "status",
    unsupportedField: true,
  });

  expect(response).toMatchObject({
    requestId: "invalid-request-diagnostic",
    ok: false,
  });
  expect(response.error).toContain("unsupportedField");
});

test("the operator CLI adopts an exact legacy anchor only through the serialized no-runtime runner", async () => {
  const root = await fixture();
  const missionId = "mission-cli-anchor-adoption";
  const timeline = new FileMissionTimeline(missionRunnerDirectory(root, missionId));
  await timeline.startTurn(missionId, {
    version: MISSION_TURN_VERSION,
    turnId: "legacy-settled-turn",
    baselineWatermark: 0,
    sourceRefs: ["legacy:mission-envelope"],
  });
  await timeline.settleTurn(missionId, "legacy-settled-turn", {
    kind: "failed",
    error: "Retained legacy failure.",
  });
  const retainedInput = await timeline.appendInput(missionId, {
    id: "legacy-retained-input",
    actorRef: "principal:test",
    sourceRef: "test:legacy-correction",
    payload: {
      kind: "contribution",
      text: "Retain this semantic input without restarting the legacy runtime.",
    },
  });
  const priorEvents = await timeline.readEvents(missionId);
  const adoption = {
    version: "rosso.mission-anchor-adoption.v1",
    id: `adopt:${missionId}`,
    missionId,
    authorityRef: "principal:test",
    sourceRef: "test:legacy-anchor-decision",
    expectedPriorEventCount: priorEvents.length,
    expectedPriorTimelineDigest: digest(priorEvents),
    anchor: {
      id: `anchor:${missionId}`,
      revision: "legacy-adoption-r1",
      statement: "Preserve the legacy history and reconcile future semantic input.",
      sourceRefs: ["test:legacy-anchor-decision"],
      reconciledWatermark: 0,
    },
  };
  const adoptionPath = join(root, "legacy-anchor-adoption.json");
  await writeFile(adoptionPath, `${JSON.stringify(adoption)}\n`, "utf8");
  const child = startRunner(root, missionId);
  const status = await waitForLiveStatus(root, missionId, child);
  expect(status.state).toBe("anchor-pending");

  const missingGuard = await runCli([
    "mission", "adopt-anchor", missionId, adoptionPath,
    "--home", root,
  ]);
  expect(missingGuard.exitCode).toBe(1);
  expect(missingGuard.stderr).toContain(
    "legacy anchor adoption requires --expected-runner and --expected-state",
  );
  expect((await timeline.readEvents(missionId)).some(
    (event) => event.type === "mission.anchor-adopted",
  )).toBe(false);

  const staleTarget = await runCli([
    "mission", "adopt-anchor", missionId, adoptionPath,
    "--home", root,
    "--expected-runner", "replaced-runner",
    "--expected-state", status.state,
  ]);
  expect(staleTarget.exitCode).toBe(1);
  expect(staleTarget.stderr).toContain("runner changed from replaced-runner");
  expect((await timeline.readEvents(missionId)).some(
    (event) => event.type === "mission.anchor-adopted",
  )).toBe(false);

  const adopted = await runCli([
    "mission", "adopt-anchor", missionId, adoptionPath,
    "--home", root,
    "--expected-runner", status.runnerId,
    "--expected-state", status.state,
  ]);
  expect(adopted.exitCode).toBe(0);
  expect(JSON.parse(adopted.stdout)).toMatchObject({
    status: {
      runnerId: status.runnerId,
      state: "input-pending",
      reconciledWatermark: 0,
    },
    adoption: {
      id: adoption.id,
      missionId,
      authorityRef: adoption.authorityRef,
      sourceRef: adoption.sourceRef,
      expectedPriorEventCount: priorEvents.length,
      expectedPriorTimelineDigest: adoption.expectedPriorTimelineDigest,
    },
  });
  expect((await timeline.readEvents(missionId)).filter(
    (event) => event.type === "mission.anchor-adopted",
  )).toHaveLength(1);
  expect(await timeline.latestReconciledAnchor(missionId)).toEqual(adoption.anchor);

  const reconciled = requireSuccess(await requestMissionRunner(
    root,
    missionId,
    missionRunnerRequest({
      kind: "reconciliation-commit",
      commit: await reconciliationCommit(root, missionId, retainedInput, adoption.anchor),
      expectedRunnerId: status.runnerId,
      expectedState: "input-pending",
    }),
  ));
  expect(reconciled.status).toMatchObject({
    state: "idle",
    inputWatermark: 1,
    reconciledWatermark: 1,
  });
  expect((await timeline.latestTurn(missionId))?.start.turnId).toBe("legacy-settled-turn");

  await requestMissionRunner(root, missionId, missionRunnerRequest({ kind: "runner-shutdown" }));
  await waitForExit(child);
}, 10_000);

test("the migration settlement CLI atomically adopts, retires, and replaces the exact carrier", async () => {
  const root = await fixture();
  const missionId = "mission-anchor-migration-settlement";
  const sourceRoot = join(root, "source");
  await mkdir(join(sourceRoot, "apps", "missions"), { recursive: true });
  git(sourceRoot, "init");
  git(sourceRoot, "config", "user.name", "Migration Test");
  git(sourceRoot, "config", "user.email", "migration@example.test");
  const missionRelativePath = `apps/missions/${missionId}.json`;
  await writeFile(
    join(sourceRoot, missionRelativePath),
    `${JSON.stringify({ id: missionId, title: "Migration source" })}\n`,
    "utf8",
  );
  git(sourceRoot, "add", missionRelativePath);
  git(sourceRoot, "commit", "-m", "test: retain migration source");
  const gitHead = git(sourceRoot, "rev-parse", "HEAD");

  const timeline = new FileMissionTimeline(missionRunnerDirectory(root, missionId));
  await timeline.startTurn(missionId, {
    version: MISSION_TURN_VERSION,
    turnId: "legacy-settled-turn",
    baselineWatermark: 0,
    sourceRefs: ["legacy:mission-envelope"],
  });
  await timeline.settleTurn(missionId, "legacy-settled-turn", {
    kind: "failed",
    error: "Retained legacy failure.",
  });
  await timeline.appendInput(missionId, {
    id: "retained-input",
    actorRef: "principal:test",
    sourceRef: "conversation:test",
    payload: { kind: "contribution", text: "Retain this input for later reconciliation." },
  });
  const priorEvents = await timeline.readEvents(missionId);
  const oldCarrier = startRunner(root, missionId);
  const oldStatus = await waitForLiveStatus(root, missionId, oldCarrier);
  expect(oldStatus.state).toBe("anchor-pending");

  const proposal = MissionAnchorMigrationProposalSchema.parse({
    version: MISSION_ANCHOR_MIGRATION_PROPOSAL_VERSION,
    proposalId: "mission-anchor-migration-settlement-v1",
    missionId,
    preparedAt: "2026-07-27T11:00:00Z",
    preparedBy: "supervisor:Codex",
    missionSource: {
      projectId: "project:test",
      relativePath: missionRelativePath,
      gitHead,
    },
    target: {
      runnerId: oldStatus.runnerId,
      pid: oldStatus.pid,
      startedAt: oldStatus.startedAt,
      socketPath: oldStatus.socketPath,
      state: oldStatus.state,
      live: true,
      protocolCapability: "atomic-adopt-retire-v1",
    },
    retainedHistory: {
      eventCount: priorEvents.length,
      timelineDigest: digest(priorEvents),
    },
    proposedAdoption: {
      adoptionId: "mission-anchor-migration-settlement-adoption-v1",
      semanticSourceRef: `mission-record:${missionRelativePath}@${gitHead}`,
      anchor: {
        id: `intent:${missionId}`,
        revision: "legacy-adoption-r1",
        statement: "Continue only after exact lineage adoption and later reconciliation.",
        sourceRefs: [`mission-record:${missionRelativePath}@${gitHead}`],
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
          immediateResult: "Adopt, retire, and start one no-runtime replacement.",
          tradeoff: "The adoption is append-only.",
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
  const retained = await retainMissionAnchorMigrationProposal(
    root,
    missionId,
    proposal,
    { status: oldStatus, live: true },
  );
  const decision = MissionAnchorMigrationDecisionSchema.parse({
    version: MISSION_ANCHOR_MIGRATION_DECISION_VERSION,
    decisionId: "mission-anchor-migration-settlement-decision-v1",
    proposalId: proposal.proposalId,
    proposalDigest: retained.proposalDigest,
    missionId,
    missionSource: proposal.missionSource,
    choice: "ADOPT",
    authorityRef: "principal:test",
    sourceRef: "conversation:test-adopt",
    decidedAt: "2026-07-27T11:01:00Z",
  });
  const decisionPath = join(root, "migration-decision.json");
  await writeFile(decisionPath, `${JSON.stringify(decision, null, 2)}\n`);

  try {
    const settled = await runCli([
      "mission",
      "settle-anchor-migration",
      missionId,
      decisionPath,
      "--mission-source-root",
      sourceRoot,
      "--home",
      root,
    ]);
    expect(settled.exitCode).toBe(0);
    const result = JSON.parse(settled.stdout);
    expect(result).toMatchObject({
      standing: "settled",
      proposalId: proposal.proposalId,
      proposalDigest: missionAnchorMigrationProposalDigest(proposal),
      adoptionId: proposal.proposedAdoption.adoptionId,
      replacementRuntime: "none",
      replacement: {
        runtimeMode: "none",
        state: "input-pending",
        inputWatermark: 1,
        reconciledWatermark: 0,
      },
      authority: {
        reconciliation: "withheld",
        externalDisclosure: "none",
        candidateWrite: "withheld",
        commit: "withheld",
        merge: "withheld",
        publish: "withheld",
        productAcceptance: "withheld",
      },
    });
    expect(result.replacement.runnerId).not.toBe(oldStatus.runnerId);
    await waitForExit(oldCarrier);

    const adoptedEvents = (await timeline.readEvents(missionId)).filter(
      (event) => event.type === "mission.anchor-adopted",
    );
    expect(adoptedEvents).toHaveLength(1);
    expect(adoptedEvents[0]?.data.adoption).toMatchObject({
      authorityRef:
        `anchor-migration-decision:sha256:${missionAnchorMigrationDecisionDigest(decision)}`,
      sourceRef:
        `anchor-migration-proposal:sha256:${missionAnchorMigrationProposalDigest(proposal)}`,
    });

    const replay = await runCli([
      "mission",
      "settle-anchor-migration",
      missionId,
      decisionPath,
      "--mission-source-root",
      sourceRoot,
      "--home",
      root,
    ]);
    expect(replay.exitCode).toBe(0);
    expect(JSON.parse(replay.stdout).replacement.runnerId).toBe(
      result.replacement.runnerId,
    );
    expect((await timeline.readEvents(missionId)).filter(
      (event) => event.type === "mission.anchor-adopted",
    )).toHaveLength(1);
  } finally {
    await requestMissionRunner(
      root,
      missionId,
      missionRunnerRequest({ kind: "runner-shutdown" }),
    ).catch(() => undefined);
  }
}, 15_000);

test("the migration settlement CLI uses a response-verified compatibility saga for a pre-upgrade carrier", async () => {
  const root = await fixture();
  const missionId = "mission-legacy-anchor-migration-settlement";
  const sourceRoot = join(root, "source");
  await mkdir(join(sourceRoot, "apps", "missions"), { recursive: true });
  git(sourceRoot, "init");
  git(sourceRoot, "config", "user.name", "Migration Test");
  git(sourceRoot, "config", "user.email", "migration@example.test");
  const missionRelativePath = `apps/missions/${missionId}.json`;
  await writeFile(
    join(sourceRoot, missionRelativePath),
    `${JSON.stringify({ id: missionId, title: "Legacy migration source" })}\n`,
    "utf8",
  );
  git(sourceRoot, "add", missionRelativePath);
  git(sourceRoot, "commit", "-m", "test: retain legacy migration source");
  const gitHead = git(sourceRoot, "rev-parse", "HEAD");

  const timeline = new FileMissionTimeline(missionRunnerDirectory(root, missionId));
  await timeline.startTurn(missionId, {
    version: MISSION_TURN_VERSION,
    turnId: "legacy-settled-turn",
    baselineWatermark: 0,
    sourceRefs: ["legacy:mission-envelope"],
  });
  await timeline.settleTurn(missionId, "legacy-settled-turn", {
    kind: "failed",
    error: "Retained legacy failure.",
  });
  await timeline.appendInput(missionId, {
    id: "retained-input",
    actorRef: "principal:test",
    sourceRef: "conversation:test",
    payload: { kind: "contribution", text: "Retain this input for reconciliation." },
  });
  const priorEvents = await timeline.readEvents(missionId);
  const oldCarrier = startLegacyRunner(root, missionId);
  const oldStatus = await waitForLiveStatus(root, missionId, oldCarrier);
  expect(oldStatus.state).toBe("input-pending");
  expect(oldStatus.runtimeMode).toBeUndefined();

  const proposal = MissionAnchorMigrationProposalSchema.parse({
    version: MISSION_ANCHOR_MIGRATION_PROPOSAL_VERSION,
    proposalId: "mission-legacy-anchor-migration-settlement-v1",
    missionId,
    preparedAt: "2026-07-27T11:10:00Z",
    preparedBy: "supervisor:Codex",
    missionSource: {
      projectId: "project:test",
      relativePath: missionRelativePath,
      gitHead,
    },
    target: {
      runnerId: oldStatus.runnerId,
      pid: oldStatus.pid,
      startedAt: oldStatus.startedAt,
      socketPath: oldStatus.socketPath,
      state: oldStatus.state,
      live: true,
      protocolCapability: "legacy-response-verified-shutdown-v1",
    },
    retainedHistory: {
      eventCount: priorEvents.length,
      timelineDigest: digest(priorEvents),
    },
    proposedAdoption: {
      adoptionId: "mission-legacy-anchor-migration-adoption-v1",
      semanticSourceRef: `mission-record:${missionRelativePath}@${gitHead}`,
      anchor: {
        id: `intent:${missionId}`,
        revision: "legacy-adoption-r1",
        statement: "Continue only after the legacy compatibility saga.",
        sourceRefs: [`mission-record:${missionRelativePath}@${gitHead}`],
        reconciledWatermark: 0,
      },
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
    decision: {
      recommendation: "ADOPT",
      replyKey: "ADOPT|HOLD",
      options: {
        ADOPT: {
          immediateResult: "Attempt one response-verified five-step compatibility migration.",
          tradeoff: "Carrier identity is verified after the shutdown effect.",
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
  const retained = await retainMissionAnchorMigrationProposal(
    root,
    missionId,
    proposal,
    { status: oldStatus, live: true },
  );
  const decision = MissionAnchorMigrationDecisionSchema.parse({
    version: MISSION_ANCHOR_MIGRATION_DECISION_VERSION,
    decisionId: "mission-legacy-anchor-migration-decision-v1",
    proposalId: proposal.proposalId,
    proposalDigest: retained.proposalDigest,
    missionId,
    missionSource: proposal.missionSource,
    choice: "ADOPT",
    authorityRef: "principal:test",
    sourceRef: "conversation:test-adopt",
    decidedAt: "2026-07-27T11:11:00Z",
  });
  const decisionPath = join(root, "legacy-migration-decision.json");
  await writeFile(decisionPath, `${JSON.stringify(decision, null, 2)}\n`);

  try {
    const settlementArgs = [
      "mission",
      "settle-anchor-migration",
      missionId,
      decisionPath,
      "--mission-source-root",
      sourceRoot,
      "--home",
      root,
    ] as const;
    const attempts = await Promise.all([
      runCli(settlementArgs),
      runCli(settlementArgs),
    ]);
    const succeeded = attempts.filter((attempt) => attempt.exitCode === 0);
    const failed = attempts.filter((attempt) => attempt.exitCode !== 0);
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.stderr).toMatch(
      /^anchor migration settlement (?:is already running in process \d+|lease is unreadable)\n$/,
    );
    const settled = succeeded[0]!;
    expect(settled.exitCode).toBe(0);
    const result = JSON.parse(settled.stdout);
    expect(result).toMatchObject({
      standing: "settled",
      migrationPath: "legacy-response-verified-shutdown-v1",
      replacementRuntime: "none",
      replacement: {
        state: "input-pending",
        runtimeMode: "none",
      },
    });
    expect(result.replacement.runnerId).not.toBe(oldStatus.runnerId);
    await waitForExit(oldCarrier);
    const retainedAttempt = await readMissionAnchorMigrationAttempt(
      root,
      missionId,
      retained.proposalDigest,
    );
    expect(retainedAttempt).toBeDefined();
    const retirement = await readMissionAnchorMigrationRetirement(
      root,
      missionId,
      retained.proposalDigest,
    );
    expect(retirement).toMatchObject({
      proposalId: proposal.proposalId,
      decisionDigest: missionAnchorMigrationDecisionDigest(decision),
      attemptDigest: missionAnchorMigrationAttemptDigest(retainedAttempt!),
      target: {
        runnerId: oldStatus.runnerId,
        pid: oldStatus.pid,
        startedAt: oldStatus.startedAt,
        socketPath: oldStatus.socketPath,
      },
      standing: "exact-stopped-status-and-socket-release-observed",
    });
    expect((await timeline.readEvents(missionId)).filter(
      (event) => event.type === "mission.anchor-adopted",
    )).toHaveLength(1);

    const replay = await runCli(settlementArgs);
    expect(replay.exitCode).toBe(0);
    expect(JSON.parse(replay.stdout).replacement.runnerId).toBe(
      result.replacement.runnerId,
    );
  } finally {
    await requestMissionRunner(
      root,
      missionId,
      missionRunnerRequest({ kind: "runner-shutdown" }),
    ).catch(() => undefined);
  }
}, 15_000);

test("a mismatched legacy shutdown response permanently invalidates that proposal and ADOPT", async () => {
  const root = await fixture();
  const missionId = "mission-legacy-anchor-migration-invalidated";
  const sourceRoot = join(root, "source");
  await mkdir(join(sourceRoot, "apps", "missions"), { recursive: true });
  git(sourceRoot, "init");
  git(sourceRoot, "config", "user.name", "Migration Test");
  git(sourceRoot, "config", "user.email", "migration@example.test");
  const missionRelativePath = `apps/missions/${missionId}.json`;
  await writeFile(
    join(sourceRoot, missionRelativePath),
    `${JSON.stringify({ id: missionId, title: "Invalidated migration source" })}\n`,
    "utf8",
  );
  git(sourceRoot, "add", missionRelativePath);
  git(sourceRoot, "commit", "-m", "test: retain invalidated migration source");
  const gitHead = git(sourceRoot, "rev-parse", "HEAD");

  const timeline = new FileMissionTimeline(missionRunnerDirectory(root, missionId));
  await timeline.appendInput(missionId, {
    id: "retained-input",
    actorRef: "principal:test",
    sourceRef: "conversation:test",
    payload: { kind: "contribution", text: "Retain this input." },
  });
  const priorEvents = await timeline.readEvents(missionId);
  const oldCarrier = startLegacyRunner(root, missionId, {
    mismatchShutdownResponse: true,
  });
  const oldStatus = await waitForLiveStatus(root, missionId, oldCarrier);
  const proposal = MissionAnchorMigrationProposalSchema.parse({
    version: MISSION_ANCHOR_MIGRATION_PROPOSAL_VERSION,
    proposalId: "mission-legacy-anchor-migration-invalidated-v1",
    missionId,
    preparedAt: "2026-07-27T11:20:00Z",
    preparedBy: "supervisor:Codex",
    missionSource: {
      projectId: "project:test",
      relativePath: missionRelativePath,
      gitHead,
    },
    target: {
      runnerId: oldStatus.runnerId,
      pid: oldStatus.pid,
      startedAt: oldStatus.startedAt,
      socketPath: oldStatus.socketPath,
      state: oldStatus.state,
      live: true,
      protocolCapability: "legacy-response-verified-shutdown-v1",
    },
    retainedHistory: {
      eventCount: priorEvents.length,
      timelineDigest: digest(priorEvents),
    },
    proposedAdoption: {
      adoptionId: "mission-legacy-anchor-migration-invalidated-adoption-v1",
      semanticSourceRef: `mission-record:${missionRelativePath}@${gitHead}`,
      anchor: {
        id: `intent:${missionId}`,
        revision: "legacy-adoption-r1",
        statement: "Continue only after a newly authorized migration.",
        sourceRefs: [`mission-record:${missionRelativePath}@${gitHead}`],
        reconciledWatermark: 0,
      },
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
    decision: {
      recommendation: "ADOPT",
      replyKey: "ADOPT|HOLD",
      options: {
        ADOPT: {
          immediateResult: "Attempt one response-verified migration.",
          tradeoff: "A mismatch permanently consumes this attempt.",
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
  const retained = await retainMissionAnchorMigrationProposal(
    root,
    missionId,
    proposal,
    { status: oldStatus, live: true },
  );
  const decision = MissionAnchorMigrationDecisionSchema.parse({
    version: MISSION_ANCHOR_MIGRATION_DECISION_VERSION,
    decisionId: "mission-legacy-anchor-migration-invalidated-decision-v1",
    proposalId: proposal.proposalId,
    proposalDigest: retained.proposalDigest,
    missionId,
    missionSource: proposal.missionSource,
    choice: "ADOPT",
    authorityRef: "principal:test",
    sourceRef: "conversation:test-adopt",
    decidedAt: "2026-07-27T11:21:00Z",
  });
  const decisionPath = join(root, "legacy-invalidated-decision.json");
  await writeFile(decisionPath, `${JSON.stringify(decision, null, 2)}\n`);
  const settlementArgs = [
    "mission",
    "settle-anchor-migration",
    missionId,
    decisionPath,
    "--mission-source-root",
    sourceRoot,
    "--home",
    root,
  ] as const;

  const failed = await runCli(settlementArgs);
  expect(failed.exitCode).toBe(1);
  expect(failed.stderr).toContain(
    "proposal invalidated and a new proposal plus ADOPT are required",
  );
  await waitForExit(oldCarrier);
  expect(await readMissionAnchorMigrationInvalidation(
    root,
    missionId,
    retained.proposalDigest,
  )).toMatchObject({
    proposalId: proposal.proposalId,
    decisionDigest: missionAnchorMigrationDecisionDigest(decision),
    code: "shutdown-response-uncertain",
    standing: "requires-new-proposal-and-adopt",
  });
  expect(await readMissionAnchorMigrationRetirement(
    root,
    missionId,
    retained.proposalDigest,
  )).toBeUndefined();
  expect((await timeline.readEvents(missionId)).filter(
    (event) => event.type === "mission.anchor-adopted",
  )).toHaveLength(0);

  const recoveredEnvironment = startLegacyRunner(root, missionId);
  const recoveredStatus = await waitForLiveStatus(
    root,
    missionId,
    recoveredEnvironment,
  );
  const replay = await runCli(settlementArgs);
  expect(replay.exitCode).toBe(1);
  expect(replay.stderr).toContain(
    "was invalidated by shutdown-response-uncertain",
  );
  expect(requireSuccess(await requestMissionRunner(
    root,
    missionId,
    missionRunnerRequest({ kind: "status" }),
  )).status.runnerId).toBe(recoveredStatus.runnerId);
  await requestMissionRunner(
    root,
    missionId,
    missionRunnerRequest({ kind: "runner-shutdown" }),
  );
  await waitForExit(recoveredEnvironment);
}, 15_000);

test("an orphaned pre-effect attempt is invalidated before any replayed runner request", async () => {
  const root = await fixture();
  const missionId = "mission-legacy-anchor-migration-orphan-attempt";
  const sourceRoot = join(root, "source");
  await mkdir(join(sourceRoot, "apps", "missions"), { recursive: true });
  git(sourceRoot, "init");
  git(sourceRoot, "config", "user.name", "Migration Test");
  git(sourceRoot, "config", "user.email", "migration@example.test");
  const missionRelativePath = `apps/missions/${missionId}.json`;
  await writeFile(
    join(sourceRoot, missionRelativePath),
    `${JSON.stringify({ id: missionId, title: "Orphan attempt source" })}\n`,
    "utf8",
  );
  git(sourceRoot, "add", missionRelativePath);
  git(sourceRoot, "commit", "-m", "test: retain orphan attempt source");
  const gitHead = git(sourceRoot, "rev-parse", "HEAD");
  const timeline = new FileMissionTimeline(missionRunnerDirectory(root, missionId));
  await timeline.appendInput(missionId, {
    id: "retained-input",
    actorRef: "principal:test",
    sourceRef: "conversation:test",
    payload: { kind: "contribution", text: "Retain this input." },
  });
  const priorEvents = await timeline.readEvents(missionId);
  const carrier = startLegacyRunner(root, missionId);
  const status = await waitForLiveStatus(root, missionId, carrier);
  const proposal = MissionAnchorMigrationProposalSchema.parse({
    version: MISSION_ANCHOR_MIGRATION_PROPOSAL_VERSION,
    proposalId: "mission-legacy-anchor-migration-orphan-attempt-v1",
    missionId,
    preparedAt: "2026-07-27T11:30:00Z",
    preparedBy: "supervisor:Codex",
    missionSource: {
      projectId: "project:test",
      relativePath: missionRelativePath,
      gitHead,
    },
    target: {
      runnerId: status.runnerId,
      pid: status.pid,
      startedAt: status.startedAt,
      socketPath: status.socketPath,
      state: status.state,
      live: true,
      protocolCapability: "legacy-response-verified-shutdown-v1",
    },
    retainedHistory: {
      eventCount: priorEvents.length,
      timelineDigest: digest(priorEvents),
    },
    proposedAdoption: {
      adoptionId: "mission-legacy-anchor-migration-orphan-adoption-v1",
      semanticSourceRef: `mission-record:${missionRelativePath}@${gitHead}`,
      anchor: {
        id: `intent:${missionId}`,
        revision: "legacy-adoption-r1",
        statement: "Do not reuse an uncertain shutdown attempt.",
        sourceRefs: [`mission-record:${missionRelativePath}@${gitHead}`],
        reconciledWatermark: 0,
      },
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
    decision: {
      recommendation: "ADOPT",
      replyKey: "ADOPT|HOLD",
      options: {
        ADOPT: {
          immediateResult: "Attempt one response-verified migration.",
          tradeoff: "An orphan attempt cannot be retried.",
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
  const retained = await retainMissionAnchorMigrationProposal(
    root,
    missionId,
    proposal,
    { status, live: true },
  );
  const decision = MissionAnchorMigrationDecisionSchema.parse({
    version: MISSION_ANCHOR_MIGRATION_DECISION_VERSION,
    decisionId: "mission-legacy-anchor-migration-orphan-decision-v1",
    proposalId: proposal.proposalId,
    proposalDigest: retained.proposalDigest,
    missionId,
    missionSource: proposal.missionSource,
    choice: "ADOPT",
    authorityRef: "principal:test",
    sourceRef: "conversation:test-adopt",
    decidedAt: "2026-07-27T11:31:00Z",
  });
  const decisionDigest = missionAnchorMigrationDecisionDigest(decision);
  await retainMissionAnchorMigrationAttempt(
    root,
    MissionAnchorMigrationAttemptSchema.parse({
      version: MISSION_ANCHOR_MIGRATION_ATTEMPT_VERSION,
      missionId,
      proposalId: proposal.proposalId,
      proposalDigest: retained.proposalDigest,
      decisionDigest,
      protocolCapability: "legacy-response-verified-shutdown-v1",
      target: {
        runnerId: status.runnerId,
        pid: status.pid,
        startedAt: status.startedAt,
        socketPath: status.socketPath,
        state: status.state,
      },
      standing: "one-use-shutdown-attempt-started",
    }),
  );
  const decisionPath = join(root, "legacy-orphan-attempt-decision.json");
  await writeFile(decisionPath, `${JSON.stringify(decision, null, 2)}\n`);

  const failed = await runCli([
    "mission",
    "settle-anchor-migration",
    missionId,
    decisionPath,
    "--mission-source-root",
    sourceRoot,
    "--home",
    root,
  ]);
  expect(failed.exitCode).toBe(1);
  expect(failed.stderr).toContain(
    "unresolved one-use shutdown attempt",
  );
  expect(await readMissionAnchorMigrationInvalidation(
    root,
    missionId,
    retained.proposalDigest,
  )).toMatchObject({
    proposalId: proposal.proposalId,
    decisionDigest,
    code: "shutdown-response-uncertain",
  });
  expect(requireSuccess(await requestMissionRunner(
    root,
    missionId,
    missionRunnerRequest({ kind: "status" }),
  )).status).toMatchObject({
    runnerId: status.runnerId,
    state: status.state,
    stopReason: null,
  });
  expect(await readMissionAnchorMigrationRetirement(
    root,
    missionId,
    retained.proposalDigest,
  )).toBeUndefined();
  await requestMissionRunner(
    root,
    missionId,
    missionRunnerRequest({ kind: "runner-shutdown" }),
  );
  await waitForExit(carrier);
}, 15_000);

test("a detached runner loads a trusted runtime module and durably settles its turn", async () => {
  const root = await fixture();
  const missionId = "mission-detached-runtime";
  const anchor = {
    id: "anchor:mission-detached-runtime",
    revision: "r1",
    statement: "Run the deterministic detached runtime fixture.",
    sourceRefs: ["test:mission-envelope"],
    reconciledWatermark: 0,
  };
  const seedPath = join(root, "anchor-seed.json");
  await writeFile(seedPath, `${JSON.stringify({
    version: "rosso.mission-anchor-seed.v1",
    id: "seed:mission-detached-runtime",
    missionId,
    authorityRef: "principal:test",
    sourceRef: "test:mission-authorization",
    anchor,
  })}\n`, "utf8");
  const runtimeModule = fileURLToPath(new URL("./fixtures/finished-mission-runtime.ts", import.meta.url));
  const child = startRunner(root, missionId, runtimeModule, seedPath);

  await waitForLiveStatus(root, missionId, child);
  const timeline = new FileMissionTimeline(missionRunnerDirectory(root, missionId));
  const turn = await waitForSettledTurn(timeline, missionId, child);

  expect(turn).toEqual({
    start: {
      version: "rosso.mission-turn.v1",
      turnId: `deterministic-${missionId}`,
      baselineWatermark: 0,
      anchorDigest: digestAnchor(anchor),
      sourceRefs: ["test:detached-runtime-module"],
    },
    settlement: {
      kind: "finished",
      runStatus: "returned",
      text: "detached runtime completed",
      tasks: [],
      uncoveredObligationRefs: [],
      resultReads: [],
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cachedInputTokens: 0,
      },
    },
  });

  await requestMissionRunner(root, missionId, missionRunnerRequest({ kind: "runner-shutdown" }));
  await waitForExit(child);
}, 10_000);

test("a verified reconciliation commits through the live runner before a successor turn starts", async () => {
  const root = await fixture();
  const missionId = "mission-reconciled-continuation";
  const timeline = new FileMissionTimeline(missionRunnerDirectory(root, missionId));
  const seededAnchor = await seedTimeline(timeline, missionId);
  const runtimeModule = fileURLToPath(new URL("./fixtures/continuing-mission-runtime.ts", import.meta.url));
  const releasePath = join(root, "continuing-runtime.release");
  const child = startRunner(root, missionId, runtimeModule, undefined, {
    ROSSOVIA_CONTINUING_MISSION_RELEASE_PATH: releasePath,
  });
  try {
    await waitForLiveStatus(root, missionId, child);

    const accepted = requireSuccess(await requestMissionRunner(root, missionId, missionRunnerRequest({
      kind: "input",
      input: {
        id: "continue-input-1",
        actorRef: "principal:test",
        sourceRef: "test:principal-input",
        payload: { kind: "contribution", text: "Continue only after this input is reconciled." },
      },
    })));
    if (accepted.receipt === undefined) throw new Error("expected a retained Mission input receipt");
    const commit = await reconciliationCommit(root, missionId, accepted.receipt, seededAnchor);

    try {
      const tooEarly = await requestMissionRunner(root, missionId, missionRunnerRequest({
        kind: "reconciliation-commit",
        commit,
        expectedRunnerId: accepted.status.runnerId,
        expectedState: accepted.status.state,
      }));
      expect(tooEarly).toMatchObject({ ok: false });
      if (!tooEarly.ok) expect(tooEarly.error).toContain("turn is still live");
    } finally {
      await writeFile(releasePath, "released\n", "utf8");
    }

    const staleTurn = await waitForSettledTurn(timeline, missionId, child);
    expect(staleTurn).toMatchObject({
      start: { turnId: `continuing-${missionId}-0`, baselineWatermark: 0 },
      settlement: { kind: "input-pending", currentWatermark: 1 },
    });

    const commitPath = join(root, "reconciliation-commit.json");
    await writeFile(commitPath, `${JSON.stringify(commit)}\n`, "utf8");
    const pendingStatus = (await waitForLiveStatus(root, missionId, child));
    const staleTarget = await requestMissionRunner(root, missionId, missionRunnerRequest({
      kind: "reconciliation-commit",
      commit,
      expectedRunnerId: "replacement-runner",
      expectedState: pendingStatus.state,
    }));
    expect(staleTarget).toMatchObject({ ok: false });
    if (!staleTarget.ok) expect(staleTarget.error).toContain("runner changed");
    const committed = await runCli([
      "mission", "reconcile", missionId, commitPath, "--home", root,
      "--expected-runner", pendingStatus.runnerId,
      "--expected-state", pendingStatus.state,
    ]);
    expect(committed.exitCode).toBe(0);
    expect(JSON.parse(committed.stdout)).toMatchObject({ status: {
      state: "running",
      inputWatermark: 1,
      reconciledWatermark: 1,
    } });
    const successor = await waitForSettledTurn(timeline, missionId, child);
    expect(successor).toMatchObject({
      start: { turnId: `continuing-${missionId}-1`, baselineWatermark: 1 },
      settlement: { kind: "finished", text: "continued at watermark 1" },
    });

    const replayTarget = await waitForLiveStatus(root, missionId, child);
    const replayed = requireSuccess(await requestMissionRunner(root, missionId, missionRunnerRequest({
      kind: "reconciliation-commit",
      commit,
      expectedRunnerId: replayTarget.runnerId,
      expectedState: replayTarget.state,
    })));
    expect(replayed.status.reconciledWatermark).toBe(1);
    const parent = await Bun.file(timeline.timelinePath(missionId)).text();
    expect(parent.match(/mission\.input-reconciled/g)).toHaveLength(1);
    expect(parent.match(/mission\.turn-started/g)).toHaveLength(2);
  } finally {
    try {
      await writeFile(releasePath, "released\n", "utf8");
    } finally {
      await requestMissionRunner(
        root,
        missionId,
        missionRunnerRequest({ kind: "runner-shutdown" }),
      ).catch(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      });
      await waitForExit(child);
    }
  }
}, 10_000);

test("runtime restarts preserve a partially reconciled backlog and start only after its final watermark", async () => {
  const root = await fixture();
  const missionId = "mission-reconciliation-backlog";
  const timeline = new FileMissionTimeline(missionRunnerDirectory(root, missionId));
  const seededAnchor = await seedTimeline(timeline, missionId);
  const firstInput = await timeline.appendInput(missionId, {
    id: "backlog-input-1",
    actorRef: "principal:test",
    sourceRef: "test:backlog-1",
    payload: { kind: "contribution", text: "First accepted contribution." },
  });
  const secondInput = await timeline.appendInput(missionId, {
    id: "backlog-input-2",
    actorRef: "principal:test",
    sourceRef: "test:backlog-2",
    payload: { kind: "contribution", text: "Second accepted contribution." },
  });
  const runtimeModule = fileURLToPath(new URL("./fixtures/continuing-mission-runtime.ts", import.meta.url));
  const firstCarrier = startRunner(root, missionId, runtimeModule);
  expect(await waitForLiveStatus(root, missionId, firstCarrier)).toMatchObject({
    state: "input-pending",
    inputWatermark: 2,
    reconciledWatermark: 0,
  });
  expect(await timeline.latestTurn(missionId)).toBeUndefined();

  await requestMissionRunner(root, missionId, missionRunnerRequest({ kind: "runner-shutdown" }));
  await waitForExit(firstCarrier);
  const secondCarrier = startRunner(root, missionId, runtimeModule);
  const secondStatus = await waitForLiveStatus(root, missionId, secondCarrier);
  expect(secondStatus).toMatchObject({
    state: "input-pending",
    inputWatermark: 2,
    reconciledWatermark: 0,
  });
  expect(await timeline.latestTurn(missionId)).toBeUndefined();

  const firstCommit = await reconciliationCommit(root, missionId, firstInput, seededAnchor);
  const afterFirst = requireSuccess(await requestMissionRunner(root, missionId, missionRunnerRequest({
    kind: "reconciliation-commit",
    commit: firstCommit,
    expectedRunnerId: secondStatus.runnerId,
    expectedState: secondStatus.state,
  })));
  expect(afterFirst.status).toMatchObject({ state: "input-pending", reconciledWatermark: 1 });
  expect(await timeline.latestTurn(missionId)).toBeUndefined();

  await requestMissionRunner(root, missionId, missionRunnerRequest({ kind: "runner-shutdown" }));
  await waitForExit(secondCarrier);
  const thirdCarrier = startRunner(root, missionId, runtimeModule);
  const thirdStatus = await waitForLiveStatus(root, missionId, thirdCarrier);
  expect(thirdStatus).toMatchObject({
    state: "input-pending",
    inputWatermark: 2,
    reconciledWatermark: 1,
  });
  expect(await timeline.latestTurn(missionId)).toBeUndefined();

  const secondCommit = await reconciliationCommit(
    root,
    missionId,
    secondInput,
    firstCommit.acceptance.nextAnchor,
  );
  const afterSecond = requireSuccess(await requestMissionRunner(root, missionId, missionRunnerRequest({
    kind: "reconciliation-commit",
    commit: secondCommit,
    expectedRunnerId: thirdStatus.runnerId,
    expectedState: thirdStatus.state,
  })));
  expect(afterSecond.status).toMatchObject({ state: "running", reconciledWatermark: 2 });
  expect(await waitForSettledTurn(timeline, missionId, thirdCarrier)).toMatchObject({
    start: { turnId: `continuing-${missionId}-2`, baselineWatermark: 2 },
    settlement: { kind: "finished", text: "continued at watermark 2" },
  });

  await requestMissionRunner(root, missionId, missionRunnerRequest({ kind: "runner-shutdown" }));
  await waitForExit(thirdCarrier);
}, 10_000);

test("a detached runner resumes an interrupted turn only after an explicit recovery command", async () => {
  const root = await fixture();
  const missionId = "mission-detached-resume";
  const timeline = new FileMissionTimeline(missionRunnerDirectory(root, missionId));
  const anchor = await seedTimeline(timeline, missionId);
  await timeline.startTurn(missionId, {
    version: MISSION_TURN_VERSION,
    turnId: "turn-interrupted-resume",
    baselineWatermark: 0,
    anchorDigest: digestAnchor(anchor),
    sourceRefs: ["mission-envelope:r1"],
  });
  const runtimeModule = fileURLToPath(new URL("./fixtures/recovery-mission-runtime.ts", import.meta.url));
  const child = startRunner(root, missionId, runtimeModule);

  const interruptedStatus = await waitForLiveStatus(root, missionId, child);
  expect(interruptedStatus.state).toBe("interrupted");
  expect(requireSuccess(await requestMissionRunner(
    root,
    missionId,
    missionRunnerRequest({ kind: "status" }),
  )).recoveryCapabilities).toEqual({
    abandon: true,
    resume: true,
    replace: true,
  });
  expect((await timeline.latestTurn(missionId))?.recoveries).toBeUndefined();
  const recovered = requireSuccess(await requestMissionRunner(root, missionId, missionRunnerRequest({
    kind: "recovery",
    expectedRunnerId: interruptedStatus.runnerId,
    expectedState: "interrupted",
    recovery: {
      id: "recover-resume-1",
      actorRef: "principal:local",
      sourceRef: "terminal:primary",
      action: "resume",
    },
  })));
  expect(recovered.status.state).toBe("running");
  const turn = await waitForSettledTurn(timeline, missionId, child);
  expect(turn).toMatchObject({
    start: { turnId: "turn-interrupted-resume" },
    recoveries: [{
      id: "recover-resume-1",
      actorRef: "principal:local",
      sourceRef: "terminal:primary",
      interruptedTurnId: "turn-interrupted-resume",
      action: { kind: "resume" },
    }],
    settlement: { kind: "finished", text: "resume runtime completed" },
  });
  const replayed = requireSuccess(await requestMissionRunner(root, missionId, missionRunnerRequest({
    kind: "recovery",
    expectedRunnerId: interruptedStatus.runnerId,
    expectedState: "interrupted",
    recovery: {
      id: "recover-resume-1",
      actorRef: "principal:local",
      sourceRef: "terminal:primary",
      action: "resume",
    },
  })));
  expect(replayed.status.state).toBe("running");
  expect((await Bun.file(timeline.timelinePath(missionId)).text()).match(/recover-resume-1/g)?.length).toBe(1);
  const halfGuard = await requestMissionRunner(root, missionId, missionRunnerRequest({
    kind: "recovery",
    expectedRunnerId: interruptedStatus.runnerId,
    recovery: {
      id: "recover-resume-1",
      actorRef: "principal:local",
      sourceRef: "terminal:primary",
      action: "resume",
    },
  }));
  expect(halfGuard).toMatchObject({
    ok: false,
    error: expect.stringContaining("requires both expectedRunnerId and expectedState"),
  });
  const runnerDrift = await requestMissionRunner(root, missionId, missionRunnerRequest({
    kind: "recovery",
    expectedRunnerId: "replacement-runner",
    expectedState: "interrupted",
    recovery: {
      id: "recover-resume-1",
      actorRef: "principal:local",
      sourceRef: "terminal:primary",
      action: "resume",
    },
  }));
  expect(runnerDrift).toMatchObject({
    ok: false,
    error: expect.stringContaining("runner changed from replacement-runner"),
  });
  const conflict = await requestMissionRunner(root, missionId, missionRunnerRequest({
    kind: "recovery",
    expectedRunnerId: interruptedStatus.runnerId,
    expectedState: "interrupted",
    recovery: {
      id: "recover-resume-1",
      actorRef: "different-actor",
      sourceRef: "terminal:primary",
      action: "resume",
    },
  }));
  expect(conflict).toMatchObject({ ok: false });

  await requestMissionRunner(root, missionId, missionRunnerRequest({ kind: "runner-shutdown" }));
  await waitForExit(child);
}, 10_000);

test("an interrupted runner reports only the recovery actions declared by its runtime", async () => {
  const root = await fixture();
  const missionId = "mission-runtime-without-recovery";
  const timeline = new FileMissionTimeline(missionRunnerDirectory(root, missionId));
  const anchor = await seedTimeline(timeline, missionId);
  await timeline.startTurn(missionId, {
    version: MISSION_TURN_VERSION,
    turnId: "turn-runtime-without-recovery",
    baselineWatermark: 0,
    anchorDigest: digestAnchor(anchor),
    sourceRefs: ["mission-envelope:r1"],
  });
  const runtimeModule = fileURLToPath(
    new URL("./fixtures/finished-mission-runtime.ts", import.meta.url),
  );
  const child = startRunner(root, missionId, runtimeModule);

  expect((await waitForLiveStatus(root, missionId, child)).state).toBe("interrupted");
  expect(requireSuccess(await requestMissionRunner(
    root,
    missionId,
    missionRunnerRequest({ kind: "status" }),
  )).recoveryCapabilities).toEqual({
    abandon: true,
    resume: false,
    replace: false,
  });

  await requestMissionRunner(root, missionId, missionRunnerRequest({ kind: "runner-shutdown" }));
  await waitForExit(child);
}, 10_000);

test("an interrupted runner rejects undeclared recovery without invoking its runtime", async () => {
  const root = await fixture();
  const missionId = "mission-runtime-recovery-withheld";
  const timeline = new FileMissionTimeline(missionRunnerDirectory(root, missionId));
  const anchor = await seedTimeline(timeline, missionId);
  await timeline.startTurn(missionId, {
    version: MISSION_TURN_VERSION,
    turnId: "turn-runtime-recovery-withheld",
    baselineWatermark: 0,
    anchorDigest: digestAnchor(anchor),
    sourceRefs: ["mission-envelope:r1"],
  });
  const runtimeInvocationPath = join(root, "runtime-recovery-invoked.json");
  const runtimeModule = join(root, "runtime-with-recovery-withheld.ts");
  await writeFile(runtimeModule, `
import { writeFile } from "node:fs/promises";

export const missionRuntimeRecoveryCapabilities = {
  resume: false,
  replace: false,
};

export async function createMissionRuntime(context) {
  await writeFile(${JSON.stringify(runtimeInvocationPath)}, JSON.stringify(context.recovery));
  const interrupted = context.recovery?.interruptedTurn;
  if (interrupted === undefined) throw new Error("expected recovery context");
  const turn = context.recovery.action === "resume"
    ? interrupted
    : { ...interrupted, turnId: \`\${interrupted.turnId}-replacement\` };
  return {
    turn,
    controller: {
      async advance() {
        return {
          kind: "failed",
          error: "runtime recovery should not have been invoked",
        };
      },
      async resume() {
        throw new Error("runtime recovery should not have been invoked");
      },
      observeInput() {},
      cancel() {},
    },
  };
}
`, "utf8");
  const child = startRunner(root, missionId, runtimeModule);
  const interrupted = await waitForLiveStatus(root, missionId, child);
  expect(interrupted.state).toBe("interrupted");
  const historyBefore = await timeline.readEvents(missionId);

  for (const action of ["resume", "replace"] as const) {
    const response = await requestMissionRunner(root, missionId, missionRunnerRequest({
      kind: "recovery",
      expectedRunnerId: interrupted.runnerId,
      expectedState: "interrupted",
      recovery: {
        id: `recover-unsupported-${action}`,
        actorRef: "principal:local",
        sourceRef: "terminal:primary",
        action,
      },
    }));
    expect(response).toMatchObject({
      ok: false,
      error: expect.stringContaining(`runtime does not support ${action} recovery`),
    });
  }

  expect(requireSuccess(await requestMissionRunner(
    root,
    missionId,
    missionRunnerRequest({ kind: "status" }),
  )).status.state).toBe("interrupted");
  expect(await timeline.readEvents(missionId)).toEqual(historyBefore);
  expect(historyBefore.filter((event) => event.type === "mission.turn-started")).toHaveLength(1);
  expect(historyBefore.filter((event) => event.type === "mission.turn-recovered")).toHaveLength(0);
  await expect(stat(runtimeInvocationPath)).rejects.toMatchObject({ code: "ENOENT" });

  await requestMissionRunner(root, missionId, missionRunnerRequest({ kind: "runner-shutdown" }));
  await waitForExit(child);
}, 10_000);

test("replacement is atomic and abandon needs no runtime module", async () => {
  const root = await fixture();
  const runtimeModule = fileURLToPath(new URL("./fixtures/recovery-mission-runtime.ts", import.meta.url));
  const replaceMission = "mission-detached-replace";
  const replaceTimeline = new FileMissionTimeline(missionRunnerDirectory(root, replaceMission));
  const replaceAnchor = await seedTimeline(replaceTimeline, replaceMission);
  await replaceTimeline.startTurn(replaceMission, {
    version: MISSION_TURN_VERSION,
    turnId: "turn-interrupted-replace",
    baselineWatermark: 0,
    anchorDigest: digestAnchor(replaceAnchor),
    sourceRefs: ["mission-envelope:r1"],
  });
  const replacing = startRunner(root, replaceMission, runtimeModule);
  await waitForLiveStatus(root, replaceMission, replacing);
  requireSuccess(await requestMissionRunner(root, replaceMission, missionRunnerRequest({
    kind: "recovery",
    recovery: {
      id: "recover-replace-1",
      actorRef: "principal:local",
      sourceRef: "terminal:primary",
      action: "replace",
    },
  })));
  expect(await waitForSettledTurn(replaceTimeline, replaceMission, replacing)).toMatchObject({
    start: { turnId: "turn-interrupted-replace-replacement" },
    settlement: { kind: "finished", text: "replace runtime completed" },
  });
  expect(await Bun.file(replaceTimeline.timelinePath(replaceMission)).text()).toContain('"type":"mission.turn-recovered"');
  await requestMissionRunner(root, replaceMission, missionRunnerRequest({ kind: "runner-shutdown" }));
  await waitForExit(replacing);

  const abandonMission = "mission-detached-abandon";
  const abandonTimeline = new FileMissionTimeline(missionRunnerDirectory(root, abandonMission));
  const abandonAnchor = await seedTimeline(abandonTimeline, abandonMission);
  await abandonTimeline.startTurn(abandonMission, {
    version: MISSION_TURN_VERSION,
    turnId: "turn-interrupted-abandon",
    baselineWatermark: 0,
    anchorDigest: digestAnchor(abandonAnchor),
    sourceRefs: ["mission-envelope:r1"],
  });
  const abandoning = startRunner(root, abandonMission);
  await waitForLiveStatus(root, abandonMission, abandoning);
  expect(requireSuccess(await requestMissionRunner(
    root,
    abandonMission,
    missionRunnerRequest({ kind: "status" }),
  )).recoveryCapabilities).toEqual({
    abandon: true,
    resume: false,
    replace: false,
  });
  const unavailable = await requestMissionRunner(root, abandonMission, missionRunnerRequest({
    kind: "recovery",
    recovery: {
      id: "recover-without-runtime",
      actorRef: "principal:local",
      sourceRef: "terminal:primary",
      action: "resume",
    },
  }));
  expect(unavailable).toMatchObject({ ok: false });
  const abandoned = requireSuccess(await requestMissionRunner(root, abandonMission, missionRunnerRequest({
    kind: "recovery",
    recovery: {
      id: "recover-abandon-1",
      actorRef: "principal:local",
      sourceRef: "terminal:primary",
      action: "abandon",
    },
  })));
  expect(abandoned.status.state).toBe("idle");
  expect(await abandonTimeline.latestTurn(abandonMission)).toMatchObject({
    start: { turnId: "turn-interrupted-abandon" },
    recoveries: [{ id: "recover-abandon-1", action: { kind: "abandon" } }],
  });
  await requestMissionRunner(root, abandonMission, missionRunnerRequest({ kind: "runner-shutdown" }));
  await waitForExit(abandoning);
}, 15_000);

test("a recorded replacement survives another crash without replay and can be resumed explicitly", async () => {
  const root = await fixture();
  const missionId = "mission-recovery-second-crash";
  const timeline = new FileMissionTimeline(missionRunnerDirectory(root, missionId));
  const anchor = await seedTimeline(timeline, missionId);
  await timeline.startTurn(missionId, {
    version: MISSION_TURN_VERSION,
    turnId: "turn-before-second-crash",
    baselineWatermark: 0,
    anchorDigest: digestAnchor(anchor),
    sourceRefs: ["mission-envelope:r1"],
  });
  await timeline.recoverTurn(missionId, {
    version: MISSION_TURN_RECOVERY_VERSION,
    id: "recover-replace-before-crash",
    actorRef: "principal:local",
    sourceRef: "terminal:primary",
    interruptedTurnId: "turn-before-second-crash",
    action: {
      kind: "replace",
      replacement: {
        version: MISSION_TURN_VERSION,
        turnId: "turn-after-second-crash",
        baselineWatermark: 0,
        anchorDigest: digestAnchor(anchor),
        sourceRefs: ["test:replacement-runtime"],
      },
    },
  });

  const runtimeModule = fileURLToPath(new URL("./fixtures/recovery-mission-runtime.ts", import.meta.url));
  const child = startRunner(root, missionId, runtimeModule);
  expect((await waitForLiveStatus(root, missionId, child)).state).toBe("interrupted");
  const replayed = requireSuccess(await requestMissionRunner(root, missionId, missionRunnerRequest({
    kind: "recovery",
    recovery: {
      id: "recover-replace-before-crash",
      actorRef: "principal:local",
      sourceRef: "terminal:primary",
      action: "replace",
    },
  })));
  expect(replayed.status.state).toBe("interrupted");
  expect((await timeline.latestTurn(missionId))?.settlement).toBeUndefined();

  requireSuccess(await requestMissionRunner(root, missionId, missionRunnerRequest({
    kind: "recovery",
    recovery: {
      id: "recover-resume-after-crash",
      actorRef: "principal:local",
      sourceRef: "terminal:primary",
      action: "resume",
    },
  })));
  expect(await waitForSettledTurn(timeline, missionId, child)).toMatchObject({
    start: { turnId: "turn-after-second-crash" },
    recoveries: [{ id: "recover-resume-after-crash", action: { kind: "resume" } }],
    settlement: { kind: "finished", text: "resume runtime completed" },
  });
  await requestMissionRunner(root, missionId, missionRunnerRequest({ kind: "runner-shutdown" }));
  await waitForExit(child);
}, 10_000);

async function sendControl(
  root: string,
  missionId: string,
  id: string,
  command: "pause" | "resume" | "stop" | "approve-effect",
): Promise<Extract<MissionRunnerResponse, { ok: true }>> {
  return requireSuccess(await requestMissionRunner(root, missionId, missionRunnerRequest({
    kind: "input",
    input: {
      id,
      actorRef: "principal:local",
      sourceRef: "terminal:primary",
      payload: { kind: "control", command },
    },
  })));
}

function startRunner(
  root: string,
  missionId: string,
  runtimeModule?: string,
  anchorFile?: string,
  environment: NodeJS.ProcessEnv = {},
): ChildProcess {
  const script = fileURLToPath(new URL("../src/mission-runner-process.ts", import.meta.url));
  const args = [script, "--home", root, "--mission", missionId];
  if (runtimeModule !== undefined) args.push("--runtime-module", runtimeModule);
  if (anchorFile !== undefined) args.push("--anchor-file", anchorFile);
  const child = spawn(process.execPath, args, {
    env: { ...process.env, ...environment },
    stdio: ["ignore", "ignore", "pipe"],
  });
  childErrors.set(child, "");
  child.stderr?.on("data", (chunk) => {
    childErrors.set(child, `${childErrors.get(child) ?? ""}${String(chunk)}`);
  });
  children.push(child);
  return child;
}

function startLegacyRunner(
  root: string,
  missionId: string,
  options: { readonly mismatchShutdownResponse?: boolean } = {},
): ChildProcess {
  const script = fileURLToPath(
    new URL("./fixtures/legacy-mission-runner-process.ts", import.meta.url),
  );
  const args = [
    script,
    "--home",
    root,
    "--mission",
    missionId,
  ];
  if (options.mismatchShutdownResponse === true) {
    args.push("--mismatch-shutdown-response");
  }
  const child = spawn(process.execPath, args, {
    stdio: ["ignore", "ignore", "pipe"],
  });
  childErrors.set(child, "");
  child.stderr?.on("data", (chunk) => {
    childErrors.set(child, `${childErrors.get(child) ?? ""}${String(chunk)}`);
  });
  children.push(child);
  return child;
}

async function waitForSettledTurn(
  timeline: FileMissionTimeline,
  missionId: string,
  child: ChildProcess,
): Promise<NonNullable<Awaited<ReturnType<FileMissionTimeline["latestTurn"]>>>> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Mission runner exited with ${child.exitCode}: ${childErrors.get(child) ?? ""}`);
    }
    const turn = await timeline.latestTurn(missionId);
    if (turn?.settlement !== undefined) return turn;
    await Bun.sleep(20);
  }
  throw new Error("Mission turn did not settle");
}

async function waitForLiveStatus(
  root: string,
  missionId: string,
  child: ChildProcess,
): Promise<Extract<MissionRunnerResponse, { ok: true }>["status"]> {
  const deadline = Date.now() + 5_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Mission runner exited with ${child.exitCode}: ${childErrors.get(child) ?? ""}`);
    try {
      const response = requireSuccess(await requestMissionRunner(
        root,
        missionId,
        missionRunnerRequest({ kind: "status" }),
        200,
      ));
      if (response.status.pid === child.pid) return response.status;
    } catch (error) {
      lastError = error;
    }
    await Bun.sleep(20);
  }
  throw new Error(`Mission runner did not become ready: ${String(lastError)}`);
}

async function rawRunnerRequest(
  socketPath: string,
  request: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return await new Promise((resolveResponse, rejectResponse) => {
    const socket = createConnection(socketPath);
    let content = "";
    socket.setEncoding("utf8");
    socket.setTimeout(5_000);
    socket.on("connect", () => socket.write(`${JSON.stringify(request)}\n`));
    socket.on("data", (chunk) => {
      content += chunk;
      const newline = content.indexOf("\n");
      if (newline < 0) return;
      socket.destroy();
      try {
        resolveResponse(JSON.parse(content.slice(0, newline)));
      } catch (error) {
        rejectResponse(error);
      }
    });
    socket.on("error", rejectResponse);
    socket.on("timeout", () => rejectResponse(new Error("raw runner request timed out")));
  });
}

async function waitForExit(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolveExit, rejectExit) => {
    const timeout = setTimeout(() => rejectExit(new Error("Mission runner did not exit")), 5_000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolveExit();
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      rejectExit(error);
    });
  });
}

async function runCli(args: readonly string[]): Promise<{
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}> {
  const script = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
  const child = Bun.spawn([process.execPath, script, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { exitCode, stdout, stderr };
}

function requireSuccess(response: MissionRunnerResponse): Extract<MissionRunnerResponse, { ok: true }> {
  if (!response.ok) throw new Error(response.error);
  return response;
}

function never(): never {
  throw new Error("unreachable request shape");
}

async function reconciliationCommit(
  root: string,
  missionId: string,
  input: MissionInputReceipt,
  currentAnchor: ActiveIntentAnchor,
): Promise<MissionReconciliationCommit> {
  const anchor = currentAnchor;
  const proposal: MissionReconciliationProposal = {
    version: "rosso.mission-reconciliation.v1",
    id: `proposal:${input.inputId}`,
    missionId,
    anchor,
    anchorDigest: digestAnchor(anchor),
    inputRef: {
      inputId: input.inputId,
      eventId: input.eventId,
      watermark: input.watermark,
      payloadDigest: input.payloadDigest,
    },
    executionRef: {
      cellId: `reconcile:${input.inputId}`,
      runId: `proposal-run:${input.inputId}`,
    },
    decision: {
      disposition: "continue",
      inputEffect: "The input authorizes the next turn after reconciliation.",
      responseObligations: [`Start the successor from watermark ${input.watermark}.`],
    },
  };
  const nextAnchor: ActiveIntentAnchor = {
    ...anchor,
    revision: `r${input.watermark + 1}`,
    statement: anchor.statement,
    sourceRefs: [...anchor.sourceRefs, input.sourceRef],
    reconciledWatermark: input.watermark,
  };
  const verification: MissionReconciliationVerification = {
    version: "rosso.mission-reconciliation-verification.v1",
    id: `verification:${input.inputId}`,
    missionId,
    proposalRef: {
      id: proposal.id,
      digest: digest(proposal),
      runId: proposal.executionRef.runId,
    },
    executionRef: {
      cellId: `verify:${input.inputId}`,
      runId: `verification-run:${input.inputId}`,
    },
    decision: {
      verdict: "verified-transition",
      assessment: "The successor is gated by the accepted input watermark.",
      nextAnchorStatement: nextAnchor.statement,
      preservedConstraints: ["read-only test boundary"],
    },
  };
  if (verification.decision.verdict !== "verified-transition") {
    throw new Error("fixture reconciliation must verify a transition");
  }
  const proposalEvidence = await retainMissionReconciliationCellRecord({
    home: root,
    missionId,
    role: "proposal",
    record: reconciliationCellRecord({
      root,
      runId: proposal.executionRef.runId,
      cellId: proposal.executionRef.cellId,
      anchor,
      input,
      terminalName: "submit_continue",
      terminalInput: proposal.decision,
    }),
  });
  const verificationEvidence = await retainMissionReconciliationCellRecord({
    home: root,
    missionId,
    role: "verification",
    record: reconciliationCellRecord({
      root,
      runId: verification.executionRef.runId,
      cellId: verification.executionRef.cellId,
      anchor,
      input,
      proposal,
      terminalName: "verify_continue",
      terminalInput: {
        assessment: verification.decision.assessment,
        preservedConstraints: verification.decision.preservedConstraints,
      },
    }),
  });
  return {
    proposal,
    acceptance: {
      authorityRef: "principal:test",
      verification,
      proposalEvidence,
      verificationEvidence,
      nextAnchor,
    },
  };
}

function reconciliationCellRecord(options: {
  readonly root: string;
  readonly runId: string;
  readonly cellId: string;
  readonly anchor: ActiveIntentAnchor;
  readonly input: MissionInputReceipt;
  readonly proposal?: MissionReconciliationProposal;
  readonly terminalName: "submit_continue" | "verify_continue";
  readonly terminalInput: Record<string, unknown>;
}): CellRunRecord {
  const zeroUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cachedInputTokens: 0,
  };
  const contexts = [
    {
      id: "active-anchor",
      title: "Active intent anchor",
      content: JSON.stringify(options.anchor, null, 2),
      sources: options.anchor.sourceRefs,
    },
    {
      id: "mission-input",
      title: "Mission input",
      content: JSON.stringify({
        inputId: options.input.inputId,
        watermark: options.input.watermark,
        actorRef: options.input.actorRef,
        sourceRef: options.input.sourceRef,
        payload: options.input.payload,
      }, null, 2),
      sources: [options.input.sourceRef],
    },
    ...(options.proposal === undefined
      ? []
      : [{
          id: "reconciliation-proposal",
          title: "Proposal under verification",
          content: JSON.stringify(options.proposal, null, 2),
          sources: [`work-cell:${options.proposal.executionRef.runId}`],
        }]),
  ];
  return {
    version: "work-cell.run.v4",
    runId: options.runId,
    cellId: options.cellId,
    driver: { adapter: "fixture", provider: "fixture", model: "fixture" },
    startedAt: "2026-07-27T12:00:00.000Z",
    finishedAt: "2026-07-27T12:00:01.000Z",
    durationMs: 1_000,
    status: "passed",
    input: {
      id: options.cellId,
      intent: "Retain one test reconciliation decision.",
      workspace: {
        root: options.root,
        readPaths: [],
        writePaths: [],
        excludePaths: [],
        allowedCommands: [],
      },
      instructions: ["Use only the supplied source material."],
      capabilities: [],
      context: contexts,
      capabilitiesRequired: [],
      acceptance: ["Submit one bounded result."],
      budget: {
        maxSteps: 3,
        maxDurationMs: 1_000,
        maxCommandOutputBytes: 1_000,
      },
    },
    finalText: "Submitted one bounded result.",
    artifacts: [],
    verification: {
      passed: true,
      terminal: {
        passed: true,
        required: [options.terminalName],
        called: [options.terminalName],
      },
    },
    workspaceDiff: { added: [], changed: [], removed: [] },
    usage: zeroUsage,
    usageByPhase: {
      preparation: zeroUsage,
      execution: zeroUsage,
    },
    executionObservation: {},
    trace: [{
      at: "2026-07-27T12:00:00.500Z",
      type: "terminal.tool.called",
      data: {
        name: options.terminalName,
        input: options.terminalInput,
      },
    }],
    rawSteps: [],
  };
}

async function seedTimeline(
  timeline: FileMissionTimeline,
  missionId: string,
): Promise<ActiveIntentAnchor> {
  const anchor: ActiveIntentAnchor = {
    id: `anchor:${missionId}`,
    revision: "r1",
    statement: "Run only from reconciled Mission input and preserve the read-only test boundary.",
    sourceRefs: ["test:mission-envelope"],
    reconciledWatermark: 0,
  };
  await timeline.seedAnchor({
    version: "rosso.mission-anchor-seed.v1",
    id: `seed:${missionId}`,
    missionId,
    authorityRef: "principal:test",
    sourceRef: "test:mission-authorization",
    anchor,
  });
  return anchor;
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "mission-runner-"));
  roots.push(root);
  return root;
}

function git(cwd: string, ...args: string[]): string {
  const result = Bun.spawnSync(["git", ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.toString());
  }
  return result.stdout.toString().trim();
}
