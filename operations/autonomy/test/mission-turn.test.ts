import { afterEach, expect, test } from "bun:test";
import { appendFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileMissionTimeline } from "../src/delegate-timeline";
import { digestAnchor, type ActiveIntentAnchor } from "../src/mission-reconciliation";
import {
  missionRunnerDirectory,
  missionRunnerRequest,
  requestMissionRunner,
  runMissionRunner,
} from "../src/mission-runner";
import {
  MISSION_TURN_RECOVERY_VERSION,
  MISSION_TURN_VERSION,
  type MissionTurnRecovery,
  type MissionTurnStart,
} from "../src/mission-turn";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("an open turn survives carrier replacement and cannot be replayed as fresh work", async () => {
  const root = await fixture();
  const missionId = "mission-recovery-1";
  const first = new FileMissionTimeline(root);
  const start: MissionTurnStart = {
    version: MISSION_TURN_VERSION,
    turnId: "turn-1",
    baselineWatermark: 0,
    sourceRefs: ["mission-envelope:r1"],
  };
  await first.startTurn(missionId, start);
  expect(await first.latestTurn(missionId)).toEqual({ start });
  await appendFile(first.timelinePath(missionId), '{"partial":"unacknowledged"', "utf8");

  const replacement = new FileMissionTimeline(root);
  await expect(replacement.startTurn(missionId, start)).rejects.toThrow(
    "interrupted turns require explicit recovery",
  );
  await expect(replacement.startTurn(missionId, { ...start, turnId: "turn-2" })).rejects.toThrow(
    "is still open and cannot be replayed automatically",
  );

  const recovery: MissionTurnRecovery = {
    version: MISSION_TURN_RECOVERY_VERSION,
    id: "recovery-abandon-1",
    actorRef: "principal:local",
    sourceRef: "terminal:primary",
    interruptedTurnId: start.turnId,
    action: { kind: "abandon" },
  };
  await replacement.recoverTurn(missionId, recovery);
  await replacement.recoverTurn(missionId, recovery);
  expect(await replacement.latestTurn(missionId)).toEqual({ start, recoveries: [recovery] });
  expect(await readFile(replacement.timelinePath(missionId), "utf8")).not.toContain("unacknowledged");
  await expect(replacement.settleTurn(missionId, start.turnId, {
    kind: "failed",
    error: "late provider result",
  })).rejects.toThrow("was replaced or abandoned and cannot settle");

  await replacement.startTurn(missionId, { ...start, turnId: "turn-2" });
  expect((await replacement.latestTurn(missionId))?.start.turnId).toBe("turn-2");
});

test("a seeded Mission rejects a turn that is not bound to its current intent anchor", async () => {
  const root = await fixture();
  const missionId = "mission-anchor-bound-turn";
  const timeline = new FileMissionTimeline(root);
  const anchor: ActiveIntentAnchor = {
    id: "anchor:mission-anchor-bound-turn",
    revision: "r1",
    statement: "Execute only the authorized read-only Mission.",
    sourceRefs: ["mission-envelope:r1"],
    reconciledWatermark: 0,
  };
  await timeline.seedAnchor({
    version: "atthis.mission-anchor-seed.v1",
    id: "seed:mission-anchor-bound-turn",
    missionId,
    authorityRef: "principal:test",
    sourceRef: "test:mission-authorization",
    anchor,
  });
  const start: MissionTurnStart = {
    version: MISSION_TURN_VERSION,
    turnId: "turn-anchor-bound",
    baselineWatermark: 0,
    sourceRefs: ["mission-envelope:r1"],
  };
  await expect(timeline.startTurn(missionId, start)).rejects.toThrow("does not bind the current intent anchor");
  await expect(timeline.startTurn(missionId, {
    ...start,
    anchorDigest: "0".repeat(64),
  })).rejects.toThrow("does not bind the current intent anchor");
  await timeline.startTurn(missionId, { ...start, anchorDigest: digestAnchor(anchor) });
  expect((await timeline.latestTurn(missionId))?.start.anchorDigest).toBe(digestAnchor(anchor));
});

test("resume preserves turn identity while replacement atomically opens a new turn", async () => {
  const root = await fixture();
  const missionId = "mission-recovery-dispositions";
  const timeline = new FileMissionTimeline(root);
  const start: MissionTurnStart = {
    version: MISSION_TURN_VERSION,
    turnId: "turn-resumable",
    baselineWatermark: 0,
    sourceRefs: ["mission-envelope:r1"],
  };
  await timeline.startTurn(missionId, start);
  const resume: MissionTurnRecovery = {
    version: MISSION_TURN_RECOVERY_VERSION,
    id: "recovery-resume-1",
    actorRef: "principal:local",
    sourceRef: "terminal:primary",
    interruptedTurnId: start.turnId,
    action: { kind: "resume" },
  };
  await timeline.recoverTurn(missionId, resume);
  expect(await timeline.latestTurn(missionId)).toEqual({ start, recoveries: [resume] });

  const replacementStart: MissionTurnStart = { ...start, turnId: "turn-replacement" };
  const replace: MissionTurnRecovery = {
    version: MISSION_TURN_RECOVERY_VERSION,
    id: "recovery-replace-1",
    actorRef: "principal:local",
    sourceRef: "terminal:primary",
    interruptedTurnId: start.turnId,
    action: { kind: "replace", replacement: replacementStart },
  };
  await timeline.recoverTurn(missionId, replace);
  expect(await timeline.latestTurn(missionId)).toEqual({ start: replacementStart });
  await expect(timeline.settleTurn(missionId, start.turnId, {
    kind: "failed",
    error: "stale resumed attempt",
  })).rejects.toThrow("was replaced or abandoned and cannot settle");
  await expect(timeline.startTurn(missionId, { ...start, turnId: "turn-uncontrolled" }))
    .rejects.toThrow("is still open and cannot be replayed automatically");
});

test("unreconciled input prevents every interrupted-turn recovery disposition", async () => {
  const root = await fixture();
  const missionId = "mission-stale-recovery";
  const timeline = new FileMissionTimeline(root);
  await timeline.startTurn(missionId, {
    version: MISSION_TURN_VERSION,
    turnId: "turn-stale",
    baselineWatermark: 0,
    sourceRefs: ["mission-envelope:r1"],
  });
  await timeline.appendInput(missionId, {
    id: "input-after-interruption",
    actorRef: "principal:local",
    sourceRef: "terminal:primary",
    payload: { kind: "contribution", text: "The target changed after interruption." },
  });
  const actions: MissionTurnRecovery["action"][] = [
    { kind: "resume" },
    { kind: "replace", replacement: {
      version: MISSION_TURN_VERSION,
      turnId: "turn-after-stale-input",
      baselineWatermark: 0,
      sourceRefs: ["mission-envelope:r1"],
    } },
    { kind: "abandon" },
  ];
  for (const [index, action] of actions.entries()) {
    await expect(timeline.recoverTurn(missionId, {
      version: MISSION_TURN_RECOVERY_VERSION,
      id: `recovery-stale-${index + 1}`,
      actorRef: "principal:local",
      sourceRef: "terminal:primary",
      interruptedTurnId: "turn-stale",
      action,
    })).rejects.toThrow("has unreconciled input and cannot recover a turn");
  }
});

test("a replacement carrier projects an unsettled turn as interrupted", async () => {
  const home = await fixture();
  const missionId = "mission-interrupted-1";
  const timeline = new FileMissionTimeline(missionRunnerDirectory(home, missionId));
  await timeline.startTurn(missionId, {
    version: MISSION_TURN_VERSION,
    turnId: "turn-open",
    baselineWatermark: 0,
    sourceRefs: ["mission-envelope:r1"],
  });

  const runner = runMissionRunner({ root: home, missionId });
  const status = await waitForStatus(home, missionId);
  expect(status.state).toBe("interrupted");
  await requestMissionRunner(home, missionId, missionRunnerRequest({ kind: "runner-shutdown" }));
  await runner;
});

async function waitForStatus(root: string, missionId: string) {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    try {
      const response = await requestMissionRunner(
        root,
        missionId,
        missionRunnerRequest({ kind: "status" }),
        200,
      );
      if (!response.ok) throw new Error(response.error);
      return response.status;
    } catch {
      await Bun.sleep(10);
    }
  }
  throw new Error(`Mission runner for ${missionId} did not expose status`);
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "mission-turn-"));
  roots.push(root);
  return root;
}
