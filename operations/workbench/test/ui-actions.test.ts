import { describe, expect, test } from "bun:test";
import {
  executeWorkbenchAction,
  WorkbenchActionError,
  type MissionRunnerActionClient,
  type RunnerStatusProof,
} from "../src/ui/actions";

function client(status: RunnerStatusProof) {
  const calls: string[] = [];
  const value: MissionRunnerActionClient = {
    async status() {
      calls.push("status");
      return status;
    },
    async activity() {
      calls.push("activity");
      return {
        intentLineage: {
          standing: "seeded",
          activeAnchor: {
            id: "anchor:mission-a",
            revision: "r1",
            reconciledWatermark: 0,
          },
        },
      };
    },
    async contribute(target, text) {
      calls.push(`target:${target.runnerId}:${target.expectedState}`);
      calls.push(`contribute:${text}`);
      return { accepted: true };
    },
    async control(target, command) {
      calls.push(`target:${target.runnerId}:${target.expectedState}`);
      calls.push(`control:${command}`);
      return command === "resume"
        ? { status: { state: "input-pending" } }
        : { status: { state: "paused" } };
    },
    async recover(target, command) {
      calls.push(`target:${target.runnerId}:${target.expectedState}`);
      calls.push(`recover:${command}`);
      return { accepted: true };
    },
  };
  return { value, calls };
}

describe("Principal Workbench actions", () => {
  test("sends a contribution only after the live runner identity and state still match", async () => {
    const harness = client({
      live: true,
      missionId: "mission-a",
      runnerId: "runner-a",
      state: "running",
    });

    await expect(executeWorkbenchAction({
      kind: "contribution",
      target: {
        missionId: "mission-a",
        runnerId: "runner-a",
        expectedState: "running",
        projectKey: "project-a",
      },
      text: "Use the accepted source rather than the cached projection.",
    }, harness.value)).resolves.toEqual({ accepted: true });

    expect(harness.calls).toEqual([
      "status",
      "activity",
      "target:runner-a:running",
      "contribute:Use the accepted source rather than the cached projection.",
    ]);
  });

  test("rejects a stale visual target before it can affect a replacement runner", async () => {
    const harness = client({
      live: true,
      missionId: "mission-a",
      runnerId: "runner-b",
      state: "running",
    });

    const result = executeWorkbenchAction({
      kind: "control",
      target: {
        missionId: "mission-a",
        runnerId: "runner-a",
        expectedState: "running",
      },
      command: "pause",
    }, harness.value);

    await expect(result).rejects.toBeInstanceOf(WorkbenchActionError);
    await expect(result).rejects.toMatchObject({ status: 409, code: "target-drift" });
    expect(harness.calls).toEqual(["status"]);
  });

  test("withholds mutation when the observer cannot verify runner reachability", async () => {
    const harness = client({
      live: null,
      missionId: "mission-a",
      runnerId: "runner-a",
      state: "running",
    });

    await expect(executeWorkbenchAction({
      kind: "control",
      target: {
        missionId: "mission-a",
        runnerId: "runner-a",
        expectedState: "running",
      },
      command: "pause",
    }, harness.value)).rejects.toMatchObject({
      status: 409,
      code: "target-drift",
      message: expect.stringContaining("reachability is unverified"),
    });
    expect(harness.calls).toEqual(["status"]);
  });

  test("keeps pause-resume and interrupted-turn recovery as different actions without claiming resume restored production", async () => {
    const paused = client({
      live: true,
      missionId: "mission-a",
      runnerId: "runner-a",
      state: "paused",
    });
    await expect(executeWorkbenchAction({
      kind: "control",
      target: {
        missionId: "mission-a",
        runnerId: "runner-a",
        expectedState: "paused",
      },
      command: "resume",
    }, paused.value)).resolves.toEqual({ status: { state: "input-pending" } });
    expect(paused.calls).toEqual([
      "status",
      "activity",
      "target:runner-a:paused",
      "control:resume",
    ]);

    const interrupted = client({
      live: true,
      missionId: "mission-a",
      runnerId: "runner-a",
      state: "interrupted",
      recoveryCapabilities: {
        abandon: true,
        resume: true,
        replace: true,
      },
    });
    await executeWorkbenchAction({
      kind: "recovery",
      target: {
        missionId: "mission-a",
        runnerId: "runner-a",
        expectedState: "interrupted",
      },
      command: "replace",
    }, interrupted.value);
    expect(interrupted.calls).toEqual([
      "status",
      "activity",
      "target:runner-a:interrupted",
      "recover:replace",
    ]);
  });

  test("rejects pause outside running and recovery not supported by the current carrier", async () => {
    const pending = client({
      live: true,
      missionId: "mission-a",
      runnerId: "runner-a",
      state: "input-pending",
    });
    await expect(executeWorkbenchAction({
      kind: "control",
      target: {
        missionId: "mission-a",
        runnerId: "runner-a",
        expectedState: "input-pending",
      },
      command: "pause",
    }, pending.value)).rejects.toMatchObject({
      status: 409,
      code: "unsupported-action",
    });
    expect(pending.calls).toEqual(["status", "activity"]);

    const interrupted = client({
      live: true,
      missionId: "mission-a",
      runnerId: "runner-a",
      state: "interrupted",
      recoveryCapabilities: {
        abandon: true,
        resume: false,
        replace: false,
      },
    });
    await expect(executeWorkbenchAction({
      kind: "recovery",
      target: {
        missionId: "mission-a",
        runnerId: "runner-a",
        expectedState: "interrupted",
      },
      command: "resume",
    }, interrupted.value)).rejects.toMatchObject({
      status: 409,
      code: "unsupported-action",
    });
    expect(interrupted.calls).toEqual(["status", "activity"]);
  });

  test("accepts the new carrier states but blocks ordinary actions before anchor adoption", async () => {
    const anchorPending = client({
      live: true,
      missionId: "mission-a",
      runnerId: "runner-a",
      state: "anchor-pending",
    });
    await expect(executeWorkbenchAction({
      kind: "contribution",
      target: {
        missionId: "mission-a",
        runnerId: "runner-a",
        expectedState: "anchor-pending",
      },
      text: "Do not treat migration history as an authorized intent anchor.",
    }, anchorPending.value)).rejects.toMatchObject({
      status: 409,
      code: "unsupported-action",
      message: expect.stringContaining("guarded anchor adoption or migration"),
    });
    expect(anchorPending.calls).toEqual(["status", "activity"]);

    const idle = client({
      live: true,
      missionId: "mission-b",
      runnerId: "runner-b",
      state: "idle",
    });
    await expect(executeWorkbenchAction({
      kind: "contribution",
      target: {
        missionId: "mission-b",
        runnerId: "runner-b",
        expectedState: "idle",
      },
      text: "Retain this input without implying that a runtime is producing.",
    }, idle.value)).resolves.toEqual({ accepted: true });
    expect(idle.calls).toEqual([
      "status",
      "activity",
      "target:runner-b:idle",
      "contribute:Retain this input without implying that a runtime is producing.",
    ]);
  });

  test("blocks an old live carrier when the full Mission timeline is legacy-unanchored", async () => {
    const harness = client({
      live: true,
      missionId: "mission-a",
      runnerId: "legacy-runner",
      state: "input-pending",
    });
    harness.value.activity = async () => {
      harness.calls.push("activity");
      return {
        intentLineage: {
          standing: "legacy-unanchored",
          activeAnchor: null,
          priorEventCount: 5,
          priorTimelineDigest: "a".repeat(64),
        },
      };
    };

    await expect(executeWorkbenchAction({
      kind: "contribution",
      target: {
        missionId: "mission-a",
        runnerId: "legacy-runner",
        expectedState: "input-pending",
      },
      text: "This must not enter an unanchored legacy timeline.",
    }, harness.value)).rejects.toMatchObject({
      status: 409,
      code: "unsupported-action",
      message: expect.stringContaining("legacy history"),
    });
    expect(harness.calls).toEqual(["status", "activity"]);
  });
});
