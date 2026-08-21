import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { RunnerStatusProof } from "../../workbench/src/ui/actions";
import type { AutonomyClient } from "../../workbench/src/ui/autonomy-client";
import { initializeHome } from "../../workbench/src/home";
import { createWorkbenchRequestHandler } from "../src/ui-server";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/**
 * A probe-only fake client: the snapshot path needs `status` for every cached
 * runner and `activity` for the parallel Mission probe; both are consumed by
 * the live runner fold of buildLiveSnapshot. The remaining action surface is
 * never reached by the snapshot request.
 */
function liveProbeClient(live: boolean | null): AutonomyClient {
  return {
    status: async (missionId: string): Promise<RunnerStatusProof> => ({
      live,
      missionId,
      runnerId: "runner-a",
      state: "running",
    }),
    activity: async () => {
      throw new Error("activity is not needed for runner freshness assertions");
    },
    contribute: async () => undefined,
    control: async () => undefined,
    recover: async () => undefined,
  };
}

async function liveSnapshot(live: boolean | null): Promise<Record<string, any>> {
  const root = mkdtempSync(join(tmpdir(), "rossovia-live-freshness-"));
  temporaryRoots.push(root);
  initializeHome(root);
  const runnerDirectory = join(root, "missions", "runner-cache");
  mkdirSync(runnerDirectory, { recursive: true });
  writeFileSync(join(runnerDirectory, "runner-status.json"), `${JSON.stringify({
    version: "rosso.mission-runner.v1",
    runnerId: "runner-a",
    missionId: "mission-a",
    pid: 1234,
    state: "running",
    startedAt: "2026-07-26T10:00:00Z",
    updatedAt: "2026-07-26T10:30:00Z",
    inputWatermark: 2,
    reconciledWatermark: 1,
    socketPath: "/tmp/mission-a.sock",
    stopReason: null,
  }, null, 2)}\n`);
  const handler = createWorkbenchRequestHandler({
    home: root,
    port: 4317,
    roots: [],
  }, liveProbeClient(live));
  const response = await handler(new Request("http://127.0.0.1:4317/api/snapshot"));
  expect(response.status).toBe(200);
  return await response.json() as Record<string, any>;
}

test("keeps the cached-status-files runner freshness aggregate while no runner is live", async () => {
  const snapshot = await liveSnapshot(false);
  expect(snapshot.runners).toHaveLength(1);
  expect(snapshot.runners[0].live).toBe(false);
  expect(snapshot.runners[0].freshness.kind).toBe("cached");
  expect(snapshot.freshness.runners).toBe("cached-status-files");
  expect(snapshot.freshness.runnerUpdatedAtRange).toEqual({
    oldest: "2026-07-26T10:30:00Z",
    newest: "2026-07-26T10:30:00Z",
  });
});

test("an unverified probe never promotes the cached aggregate runner freshness", async () => {
  const snapshot = await liveSnapshot(null);
  expect(snapshot.runners[0].live).toBeNull();
  expect(snapshot.runners[0].freshness.kind).toBe("cached");
  expect(snapshot.freshness.runners).toBe("cached-status-files");
  expect(snapshot.freshness.runnerUpdatedAtRange).not.toBeNull();
});

test("a live runner replaces the cached-only aggregate freshness claim", async () => {
  const snapshot = await liveSnapshot(true);
  expect(snapshot.runners[0].live).toBe(true);
  expect(snapshot.runners[0].freshness.kind).toBe("live");
  // The served snapshot no longer reads runners only from cached status files:
  // the aggregate must not keep claiming cached-status-files, and the cached
  // update range no longer describes the full runner set.
  expect(snapshot.freshness.runners).toBe("live");
  expect(snapshot.freshness.runnerUpdatedAtRange).toBeNull();
});
