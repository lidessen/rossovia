import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runnerPresentation } from "../ui/operational-semantics.js";

const uiRoot = join(import.meta.dir, "../ui");
const app = readFileSync(join(uiRoot, "app.js"), "utf8");

/** One cached runner record with a cached `running` state and a probe result. */
function cachedRunner(live: boolean | null) {
  return {
    sourcePath: "/home/runner-status.json",
    status: {
      version: "rosso.mission-runner.v1" as const,
      runnerId: "runner-a",
      missionId: "mission-a",
      pid: 123,
      state: "running" as const,
      startedAt: "2026-07-26T08:00:00Z",
      updatedAt: "2026-07-26T08:01:00Z",
      inputWatermark: 1,
      reconciledWatermark: 0,
      socketPath: "/tmp/runner.sock",
      stopReason: null,
    },
    binding: {
      kind: "project-mission" as const,
      projectKey: "registered:project-a",
      registeredProjectId: "project-a",
      missionId: "mission-a",
    },
    live,
    activity: {
      intentLineage: {
        standing: "seeded" as const,
        activeAnchor: {
          id: "anchor:mission-a",
          revision: "r1",
          reconciledWatermark: 0,
        },
      },
    },
  };
}

test("the Mission badge claims execution only for a live-proven runner", () => {
  // A live probe may promote the cached state to the current mode; 执行中 is
  // the modeCopy label of that promoted running mode.
  expect(runnerPresentation(cachedRunner(true))).toEqual({
    mode: "running",
    cachedMode: "running",
    live: true,
  });
  expect(app).toContain('running: {');
  expect(app).toContain('label: "执行中"');
  // The Mission list badge renders the promoted mode through data-mode.
  expect(app).toContain('<span class="mission-state" data-mode="${escapeHtml(mode)}">');
});

test("unreachable and unverified Missions keep the cached state as secondary evidence", () => {
  // live=false is a dead carrier, never 执行中.
  expect(runnerPresentation(cachedRunner(false))).toEqual({
    mode: "carrier-unreachable",
    cachedMode: "running",
    live: false,
  });
  // live=null is an unverified probe, never 执行中.
  expect(runnerPresentation(cachedRunner(null))).toEqual({
    mode: "carrier-unverified",
    cachedMode: "running",
    live: null,
  });
  // The card labels the two truthful non-live standings explicitly and only
  // then keeps the cached state in a secondary line.
  expect(app).toContain('"carrier-unreachable"');
  expect(app).toContain('"carrier-unverified"');
  expect(app).toContain('label: "载体不可达"');
  expect(app).toContain('label: "可达性未验证"');
  expect(app).toContain("runnerView.live !== true && runnerView.cachedMode");
  expect(app).toContain("mission-state-secondary");
  expect(app).toContain("缓存");
});
