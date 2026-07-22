import { expect, test } from "bun:test";
import type {
  DelegateBatchHandle,
  DelegateBatchSettlement,
  DelegateLoopRun,
} from "../src/delegate-loop";
import {
  startMissionExecution,
  type MissionExecutionController,
  type MissionExecutionHandle,
} from "../src/mission-execution-host";
import type { MissionInputReceipt } from "../src/mission-input";

test("a parked Mission execution resumes after its child barrier and advances the parent", async () => {
  const first = deferred<DelegateBatchSettlement>();
  const parked = handle("batch-1", first.promise);
  let advances = 0;
  let resumes = 0;
  const controller: MissionExecutionController = {
    async advance() {
      advances += 1;
      if (advances === 1) return {
        kind: "parked",
        turnWatermark: 0,
        checkpoint: parked.checkpoint,
        handle: parked,
      };
      return { kind: "finished", run: finishedRun() };
    },
    async resume() {
      resumes += 1;
      return { kind: "ready" };
    },
    observeInput() {},
    cancel() {},
  };

  const execution = startMissionExecution(controller);
  first.resolve({ run: { kind: "direct" } as DelegateBatchSettlement["run"], outcomes: [] });

  expect(await execution.settled).toMatchObject({ kind: "finished", run: { status: "returned" } });
  expect({ advances, resumes }).toEqual({ advances: 2, resumes: 1 });
});

test("an input signal between a ready barrier and the next park cannot be lost", async () => {
  const first = deferred<DelegateBatchSettlement>();
  const parkedOne = handle("batch-1", first.promise);
  const parkedTwo = handle("batch-2", new Promise(() => {}));
  let advances = 0;
  let resumes = 0;
  let execution!: MissionExecutionHandle;
  const controller: MissionExecutionController = {
    async advance() {
      advances += 1;
      if (advances === 1) return {
        kind: "parked",
        turnWatermark: 0,
        checkpoint: parkedOne.checkpoint,
        handle: parkedOne,
      };
      queueMicrotask(() => execution.observeInput(inputReceipt()));
      return {
        kind: "parked",
        turnWatermark: 0,
        checkpoint: parkedTwo.checkpoint,
        handle: parkedTwo,
      };
    },
    async resume() {
      resumes += 1;
      if (resumes === 1) return { kind: "ready" };
      return {
        kind: "input-pending",
        turnWatermark: 0,
        currentWatermark: 1,
        inputs: [inputReceipt()],
        activeBatch: { checkpoint: parkedTwo.checkpoint, handle: parkedTwo },
      };
    },
    observeInput() {},
    cancel() {},
  };

  execution = startMissionExecution(controller);
  first.resolve({ run: { kind: "direct" } as DelegateBatchSettlement["run"], outcomes: [] });

  expect(await execution.settled).toMatchObject({
    kind: "input-pending",
    transition: { currentWatermark: 1 },
  });
  expect({ advances, resumes }).toEqual({ advances: 2, resumes: 2 });
});

test("a durable pause cancels both the parked batch and its parent turn", async () => {
  let batchCancellations = 0;
  let parentCancellations = 0;
  const parked = {
    ...handle("batch-1", new Promise(() => {})),
    cancel() { batchCancellations += 1; },
  };
  const controller: MissionExecutionController = {
    async advance() {
      return { kind: "parked", turnWatermark: 0, checkpoint: parked.checkpoint, handle: parked };
    },
    async resume() { return { kind: "ready" }; },
    observeInput() {},
    cancel() { parentCancellations += 1; },
  };
  const execution = startMissionExecution(controller);
  await Promise.resolve();

  execution.observeInput(controlReceipt("pause"));

  expect(await execution.settled).toMatchObject({
    kind: "cancelled",
    reason: "Mission pause at input watermark 1",
  });
  expect({ batchCancellations, parentCancellations }).toEqual({
    batchCancellations: 1,
    parentCancellations: 1,
  });
});

function handle(id: string, settled: Promise<DelegateBatchSettlement>): DelegateBatchHandle {
  return {
    checkpoint: { id, parentLoopId: "mission-1" } as DelegateBatchHandle["checkpoint"],
    settled,
    cancel() {},
  };
}

function finishedRun(): DelegateLoopRun {
  return {
    status: "returned",
    text: "finished",
    messages: [],
    batches: [],
    tasks: [],
    uncoveredObligations: [],
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
  };
}

function inputReceipt(): MissionInputReceipt {
  return {
    inputId: "input-1",
    watermark: 1,
    actorRef: "principal:local",
    sourceRef: "terminal:primary",
    payload: { kind: "contribution", text: "Correct the active turn." },
    payloadDigest: "a".repeat(64),
    eventId: "event-1",
    at: "2026-07-21T00:00:00.000Z",
  };
}

function controlReceipt(command: "pause" | "stop"): MissionInputReceipt {
  return {
    ...inputReceipt(),
    payload: { kind: "control", command },
  };
}

function deferred<T>(): { readonly promise: Promise<T>; readonly resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => { resolve = settle; });
  return { promise, resolve };
}
