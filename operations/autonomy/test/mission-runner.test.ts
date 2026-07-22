import { afterEach, expect, test } from "bun:test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { digest } from "../src/canonical-json";
import { FileMissionTimeline } from "../src/delegate-timeline";
import type { MissionInputReceipt } from "../src/mission-input";
import {
  type MissionReconciliationCommit,
} from "../src/mission-reconciliation-commit";
import {
  digestAnchor,
  type ActiveIntentAnchor,
  type MissionReconciliationProposal,
} from "../src/mission-reconciliation";
import type { MissionReconciliationVerification } from "../src/mission-reconciliation-verification";
import { MISSION_TURN_RECOVERY_VERSION, MISSION_TURN_VERSION } from "../src/mission-turn";
import {
  missionRunnerDirectory,
  missionRunnerRequest,
  readMissionRunnerStatus,
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

test("a Mission runner durably accepts input, restarts from events, and keeps carrier shutdown distinct from Mission stop", async () => {
  const root = await fixture();
  const missionId = "mission-background-1";

  const first = startRunner(root, missionId);
  const initial = await waitForLiveStatus(root, missionId, first);
  expect(initial).toMatchObject({ state: "running", inputWatermark: 0, reconciledWatermark: 0 });

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

  const timeline = new FileMissionTimeline(missionRunnerDirectory(root, missionId));
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
    version: "atthis.mission-anchor-seed.v1",
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
      version: "atthis.mission-turn.v1",
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
  const child = startRunner(root, missionId, runtimeModule);
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
  const commit = reconciliationCommit(missionId, accepted.receipt, seededAnchor);

  const tooEarly = await requestMissionRunner(root, missionId, missionRunnerRequest({
    kind: "reconciliation-commit",
    commit,
  }));
  expect(tooEarly).toMatchObject({ ok: false });
  if (!tooEarly.ok) expect(tooEarly.error).toContain("turn is still live");

  const staleTurn = await waitForSettledTurn(timeline, missionId, child);
  expect(staleTurn).toMatchObject({
    start: { turnId: `continuing-${missionId}-0`, baselineWatermark: 0 },
    settlement: { kind: "input-pending", currentWatermark: 1 },
  });

  const commitPath = join(root, "reconciliation-commit.json");
  await writeFile(commitPath, `${JSON.stringify(commit)}\n`, "utf8");
  const committed = await runCli([
    "mission", "reconcile", missionId, commitPath, "--home", root,
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

  const replayed = requireSuccess(await requestMissionRunner(root, missionId, missionRunnerRequest({
    kind: "reconciliation-commit",
    commit,
  })));
  expect(replayed.status.reconciledWatermark).toBe(1);
  const parent = await Bun.file(timeline.timelinePath(missionId)).text();
  expect(parent.match(/mission\.input-reconciled/g)).toHaveLength(1);
  expect(parent.match(/mission\.turn-started/g)).toHaveLength(2);

  await requestMissionRunner(root, missionId, missionRunnerRequest({ kind: "runner-shutdown" }));
  await waitForExit(child);
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
  expect(await waitForLiveStatus(root, missionId, secondCarrier)).toMatchObject({
    state: "input-pending",
    inputWatermark: 2,
    reconciledWatermark: 0,
  });
  expect(await timeline.latestTurn(missionId)).toBeUndefined();

  const firstCommit = reconciliationCommit(missionId, firstInput, seededAnchor);
  const afterFirst = requireSuccess(await requestMissionRunner(root, missionId, missionRunnerRequest({
    kind: "reconciliation-commit",
    commit: firstCommit,
  })));
  expect(afterFirst.status).toMatchObject({ state: "input-pending", reconciledWatermark: 1 });
  expect(await timeline.latestTurn(missionId)).toBeUndefined();

  await requestMissionRunner(root, missionId, missionRunnerRequest({ kind: "runner-shutdown" }));
  await waitForExit(secondCarrier);
  const thirdCarrier = startRunner(root, missionId, runtimeModule);
  expect(await waitForLiveStatus(root, missionId, thirdCarrier)).toMatchObject({
    state: "input-pending",
    inputWatermark: 2,
    reconciledWatermark: 1,
  });
  expect(await timeline.latestTurn(missionId)).toBeUndefined();

  const secondCommit = reconciliationCommit(missionId, secondInput, firstCommit.acceptance.nextAnchor);
  const afterSecond = requireSuccess(await requestMissionRunner(root, missionId, missionRunnerRequest({
    kind: "reconciliation-commit",
    commit: secondCommit,
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
  await timeline.startTurn(missionId, {
    version: MISSION_TURN_VERSION,
    turnId: "turn-interrupted-resume",
    baselineWatermark: 0,
    sourceRefs: ["mission-envelope:r1"],
  });
  const runtimeModule = fileURLToPath(new URL("./fixtures/recovery-mission-runtime.ts", import.meta.url));
  const child = startRunner(root, missionId, runtimeModule);

  expect((await waitForLiveStatus(root, missionId, child)).state).toBe("interrupted");
  expect((await timeline.latestTurn(missionId))?.recoveries).toBeUndefined();
  const recovered = requireSuccess(await requestMissionRunner(root, missionId, missionRunnerRequest({
    kind: "recovery",
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
    recovery: {
      id: "recover-resume-1",
      actorRef: "principal:local",
      sourceRef: "terminal:primary",
      action: "resume",
    },
  })));
  expect(replayed.status.state).toBe("running");
  expect((await Bun.file(timeline.timelinePath(missionId)).text()).match(/recover-resume-1/g)?.length).toBe(1);
  const conflict = await requestMissionRunner(root, missionId, missionRunnerRequest({
    kind: "recovery",
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

test("replacement is atomic and abandon needs no runtime module", async () => {
  const root = await fixture();
  const runtimeModule = fileURLToPath(new URL("./fixtures/recovery-mission-runtime.ts", import.meta.url));
  const replaceMission = "mission-detached-replace";
  const replaceTimeline = new FileMissionTimeline(missionRunnerDirectory(root, replaceMission));
  await replaceTimeline.startTurn(replaceMission, {
    version: MISSION_TURN_VERSION,
    turnId: "turn-interrupted-replace",
    baselineWatermark: 0,
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
  await abandonTimeline.startTurn(abandonMission, {
    version: MISSION_TURN_VERSION,
    turnId: "turn-interrupted-abandon",
    baselineWatermark: 0,
    sourceRefs: ["mission-envelope:r1"],
  });
  const abandoning = startRunner(root, abandonMission);
  await waitForLiveStatus(root, abandonMission, abandoning);
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
  expect(abandoned.status.state).toBe("running");
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
  await timeline.startTurn(missionId, {
    version: MISSION_TURN_VERSION,
    turnId: "turn-before-second-crash",
    baselineWatermark: 0,
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

function startRunner(root: string, missionId: string, runtimeModule?: string, anchorFile?: string): ChildProcess {
  const script = fileURLToPath(new URL("../src/mission-runner-process.ts", import.meta.url));
  const args = [script, "--home", root, "--mission", missionId];
  if (runtimeModule !== undefined) args.push("--runtime-module", runtimeModule);
  if (anchorFile !== undefined) args.push("--anchor-file", anchorFile);
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

function reconciliationCommit(
  missionId: string,
  input: MissionInputReceipt,
  currentAnchor: ActiveIntentAnchor,
): MissionReconciliationCommit {
  const anchor = currentAnchor;
  const proposal: MissionReconciliationProposal = {
    version: "atthis.mission-reconciliation.v1",
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
    executionRef: { cellId: "reconcile-cell", runId: "proposal-run" },
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
    version: "atthis.mission-reconciliation-verification.v1",
    id: `verification:${input.inputId}`,
    missionId,
    proposalRef: {
      id: proposal.id,
      digest: digest(proposal),
      runId: proposal.executionRef.runId,
    },
    executionRef: { cellId: "verification-cell", runId: "verification-run" },
    decision: {
      verdict: "verified-transition",
      assessment: "The successor is gated by the accepted input watermark.",
      nextAnchorStatement: nextAnchor.statement,
      preservedConstraints: ["read-only test boundary"],
    },
  };
  return {
    proposal,
    acceptance: {
      authorityRef: "principal:test",
      verification,
      evidenceRefs: [
        `work-cell:${proposal.executionRef.runId}`,
        `work-cell:${verification.executionRef.runId}`,
      ],
      nextAnchor,
    },
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
    version: "atthis.mission-anchor-seed.v1",
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
