import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  DelegateBatchCheckpoint,
  DelegateBatchHandle,
  DelegateLoopTransition,
} from "../src/delegate-loop";
import { FileMissionTimeline } from "../src/delegate-timeline";
import {
  MissionSupervisorSession,
  type DelegateLoopController,
} from "../src/mission-supervisor";

test("Mission inputs retain exact source identity and advance one idempotent watermark", async () => {
  const timeline = new FileMissionTimeline(join(await fixture(), ".mission"));
  const first = await timeline.appendInput("mission-1", contribution("input-1", "Correct the active scope."));
  const replay = await timeline.appendInput("mission-1", contribution("input-1", "Correct the active scope."));
  const second = await timeline.appendInput("mission-1", {
    id: "input-2",
    actorRef: "principal:local",
    sourceRef: "terminal:secondary",
    payload: { kind: "control", command: "pause" },
  });

  expect(first).toMatchObject({ inputId: "input-1", watermark: 1, actorRef: "principal:local" });
  expect(replay.eventId).toBe(first.eventId);
  expect(second.watermark).toBe(2);
  expect(await timeline.currentInputWatermark("mission-1")).toBe(2);
  expect((await timeline.readInputsAfter("mission-1", 1)).map((input) => input.inputId)).toEqual(["input-2"]);

  await expect(timeline.appendInput("mission-1", contribution("input-1", "Conflicting replay.")))
    .rejects.toThrow("conflicts with its recorded event");
});

test("new input withholds a parked child result from the parent and pause or stop cancels active work", async () => {
  const timeline = new FileMissionTimeline(join(await fixture(), ".mission"));
  const controller = new StubDelegateController();
  const supervisor = new MissionSupervisorSession("mission-1", controller, timeline, 0);

  const parked = await supervisor.advance();
  expect(parked.kind).toBe("parked");
  await supervisor.receive(contribution("input-1", "Use the corrected contract instead."));

  const withheld = await supervisor.resume();
  expect(withheld.kind).toBe("input-pending");
  if (withheld.kind !== "input-pending") throw new Error("expected stale continuation to be withheld");
  expect(withheld.inputs.map((input) => input.inputId)).toEqual(["input-1"]);
  expect(controller.resumeCalls).toBe(0);
  expect(controller.cancelCalls).toBe(0);

  await timeline.appendInput("mission-1", {
    id: "input-2",
    actorRef: "principal:local",
    sourceRef: "terminal:secondary",
    payload: { kind: "control", command: "stop" },
  });
  expect(controller.cancelCalls).toBe(0);
  const updated = await supervisor.resume();
  expect(controller.cancelCalls).toBe(1);
  await supervisor.receive({
    id: "input-2",
    actorRef: "principal:local",
    sourceRef: "terminal:secondary",
    payload: { kind: "control", command: "stop" },
  });
  expect(controller.cancelCalls).toBe(1);
  expect(updated.kind).toBe("input-pending");
  if (updated.kind !== "input-pending") throw new Error("expected input-pending transition");
  expect(updated.currentWatermark).toBe(2);
  expect(updated.inputs.map((input) => input.inputId)).toEqual(["input-1", "input-2"]);
  expect(controller.resumeCalls).toBe(0);
});

test("an unchanged input watermark lets a settled delegate barrier resume normally", async () => {
  const timeline = new FileMissionTimeline(join(await fixture(), ".mission"));
  const controller = new StubDelegateController();
  const supervisor = new MissionSupervisorSession("mission-1", controller, timeline, 0);

  expect((await supervisor.advance()).kind).toBe("parked");
  expect((await supervisor.resume()).kind).toBe("ready");
  expect(controller.resumeCalls).toBe(1);
});

test("received but unreconciled input cannot become a turn baseline implicitly", async () => {
  const timeline = new FileMissionTimeline(join(await fixture(), ".mission"));
  await timeline.appendInput("mission-1", contribution("input-1", "Change the active requirement."));
  const controller = new StubDelegateController();
  const supervisor = new MissionSupervisorSession("mission-1", controller, timeline, 0);

  const transition = await supervisor.advance();
  expect(transition.kind).toBe("input-pending");
  expect(controller.advanceCalls).toBe(0);
});

class StubDelegateController implements DelegateLoopController {
  readonly handle: DelegateBatchHandle;
  resumeCalls = 0;
  advanceCalls = 0;
  cancelCalls = 0;

  constructor() {
    const checkpoint = { id: "batch-1", parentLoopId: "mission-1" } as DelegateBatchCheckpoint;
    this.handle = {
      checkpoint,
      settled: new Promise(() => {}),
      cancel: () => { this.cancelCalls += 1; },
    };
  }

  async advance(): Promise<DelegateLoopTransition> {
    this.advanceCalls += 1;
    return { kind: "parked", checkpoint: this.handle.checkpoint, handle: this.handle };
  }

  async resume(): Promise<DelegateLoopTransition> {
    this.resumeCalls += 1;
    return { kind: "ready" };
  }
}

function contribution(id: string, text: string) {
  return {
    id,
    actorRef: "principal:local",
    sourceRef: "terminal:primary",
    payload: { kind: "contribution" as const, text },
  };
}

async function fixture(): Promise<string> {
  return mkdtemp(join(tmpdir(), "mission-supervisor-"));
}
