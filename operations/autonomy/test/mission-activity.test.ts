import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { digest } from "../src/canonical-json";
import { FileMissionTimeline } from "../src/delegate-timeline";
import { projectMissionActivity } from "../src/mission-activity";
import { missionRunnerDirectory } from "../src/mission-runner";
import { MISSION_TURN_VERSION } from "../src/mission-turn";

test("projects bounded Mission activity without exposing contribution or result text", async () => {
  const home = await mkdtemp(join(tmpdir(), "rosso-mission-activity-"));
  const missionId = "activity-projection";
  try {
    const timeline = new FileMissionTimeline(missionRunnerDirectory(home, missionId));
    await timeline.startTurn(missionId, {
      version: MISSION_TURN_VERSION,
      turnId: "turn-1",
      baselineWatermark: 0,
      sourceRefs: ["mission:test"],
      launchAuthorizationRef: {
        authorizationId: "11111111-1111-4111-8111-111111111111",
        proposalDigest: "a".repeat(64),
        claimSourceRef:
          "state/execution-authorization-claims/11111111-1111-4111-8111-111111111111.json",
      },
    });
    await timeline.appendInput(missionId, {
      id: "input-1",
      actorRef: "principal",
      sourceRef: "workbench-ui",
      payload: {
        kind: "contribution",
        text: "This private contribution must not enter the activity projection.",
      },
    });
    await timeline.settleTurn(missionId, "turn-1", {
      kind: "finished",
      runStatus: "returned",
      text: "This result text must remain outside the activity projection.",
      tasks: [],
      uncoveredObligationRefs: [],
      resultReads: [],
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cachedInputTokens: 0,
      },
    });

    const activity = await projectMissionActivity(home, missionId, {
      observedAt: "2026-07-27T00:00:00Z",
      limit: 2,
    });
    const missionEvents = await timeline.readEvents(missionId);

    expect(activity).toMatchObject({
      source: "mission-timeline",
      observedAt: "2026-07-27T00:00:00Z",
      eventCount: 3,
      intentLineage: {
        standing: "legacy-unanchored",
        activeAnchor: null,
        priorEventCount: 3,
        priorTimelineDigest: digest(missionEvents),
      },
      currentTurn: {
        turnId: "turn-1",
        state: "settled",
        settlementKind: "finished",
        runStatus: "returned",
        launchAuthorizationRef: {
          authorizationId: "11111111-1111-4111-8111-111111111111",
          proposalDigest: "a".repeat(64),
          claimSourceRef:
            "state/execution-authorization-claims/11111111-1111-4111-8111-111111111111.json",
        },
      },
      currentVerifiedResult: null,
    });
    expect(activity.recentEvents).toHaveLength(2);
    expect(activity.lastEvent?.type).toBe("mission.turn-settled");
    expect(activity.currentTurn).not.toHaveProperty("guidanceRefs");
    expect(JSON.stringify(activity)).not.toContain("private contribution");
    expect(JSON.stringify(activity)).not.toContain("result text");
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

test("projects authorized anchor identity without exposing its statement or sources", async () => {
  const home = await mkdtemp(join(tmpdir(), "rosso-mission-lineage-"));
  const missionId = "seeded-activity";
  try {
    const timeline = new FileMissionTimeline(missionRunnerDirectory(home, missionId));
    await timeline.seedAnchor({
      version: "rosso.mission-anchor-seed.v1",
      id: "seed:seeded-activity",
      missionId,
      authorityRef: "principal:test",
      sourceRef: "test:seeded-activity",
      anchor: {
        id: "anchor:seeded-activity",
        revision: "r1",
        statement: "This private anchor statement stays outside activity.",
        sourceRefs: ["private:source-ref"],
        reconciledWatermark: 0,
      },
    });

    const activity = await projectMissionActivity(home, missionId, {
      observedAt: "2026-07-27T00:00:00Z",
    });

    expect(activity.intentLineage).toEqual({
      standing: "seeded",
      activeAnchor: {
        id: "anchor:seeded-activity",
        revision: "r1",
        reconciledWatermark: 0,
      },
    });
    expect(JSON.stringify(activity.intentLineage)).not.toContain("private");
    expect(JSON.stringify(activity.intentLineage)).not.toContain("source-ref");
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});
