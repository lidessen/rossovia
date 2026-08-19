import { describe, expect, test } from "bun:test";
import { refineLiveRunnerAttention } from "../../gateway/src/ui-server";

/**
 * The live attention refinement is the place where reachability items are
 * appended per runner. Those items must carry the runner cache identity so the
 * work-item projection can fold every fact about one runner scene into one
 * overview item instead of a row of duplicates.
 */
describe("live runner attention refinement", () => {
  test("attaches the runner cache identity to an appended unreachable item", () => {
    const refined = refineLiveRunnerAttention([], [{
      sourcePath: "/home/rossovia/missions/legacy/runner-status.json",
      status: {
        runnerId: "8fa671f0",
        missionId: "legacy-mission",
        state: "interrupted",
      },
      binding: { kind: "unbound" },
      live: false,
      activity: null,
    }]);

    expect(refined).toHaveLength(1);
    expect(refined[0]).toMatchObject({
      priority: "warning",
      code: "runner-unreachable",
      runnerId: "8fa671f0",
      missionId: "legacy-mission",
      source: "/home/rossovia/missions/legacy/runner-status.json",
    });
  });

  test("attaches the runner cache identity to an appended reachability-unverified item", () => {
    const refined = refineLiveRunnerAttention([], [{
      sourcePath: "/home/rossovia/missions/legacy/runner-status.json",
      status: {
        runnerId: "8fa671f0",
        missionId: "legacy-mission",
        state: "interrupted",
      },
      binding: { kind: "unbound" },
      live: null,
      activity: null,
    }]);

    expect(refined).toHaveLength(1);
    expect(refined[0]).toMatchObject({
      code: "runner-reachability-unverified",
      runnerId: "8fa671f0",
    });
  });

  test("keeps the runner identity when refining an existing runner attention item", () => {
    const refined = refineLiveRunnerAttention([{
      priority: "principal-decision",
      code: "runner-input-pending",
      summary: "Mission legacy-mission has unreconciled Principal input",
      runnerId: "8fa671f0",
      missionId: "legacy-mission",
      source: "/home/rossovia/missions/legacy/runner-status.json",
    }], [{
      sourcePath: "/home/rossovia/missions/legacy/runner-status.json",
      status: {
        runnerId: "8fa671f0",
        missionId: "legacy-mission",
        state: "input-pending",
      },
      binding: { kind: "unbound" },
      live: true,
      activity: {
        intentLineage: {
          standing: "seeded",
          activeAnchor: {
            id: "anchor-1",
            revision: "rev-1",
            reconciledWatermark: 0,
          },
        },
      },
    }]);

    expect(refined).toHaveLength(1);
    expect(refined[0]).toMatchObject({
      code: "runner-input-pending",
      runnerId: "8fa671f0",
      missionId: "legacy-mission",
    });
  });

  test("does not append reachability items for live or deliberately stopped runners", () => {
    const refined = refineLiveRunnerAttention([], [
      {
        sourcePath: "/home/rossovia/missions/live/runner-status.json",
        status: { runnerId: "live-runner", missionId: "m-live", state: "running" },
        binding: { kind: "project-mission", projectKey: "registered:skills" },
        live: true,
        activity: null,
      },
      {
        sourcePath: "/home/rossovia/missions/stopped/runner-status.json",
        status: { runnerId: "stopped-runner", missionId: "m-stopped", state: "stopped" },
        binding: { kind: "unbound" },
        live: false,
        activity: null,
      },
    ]);

    expect(refined).toEqual([]);
  });
});
