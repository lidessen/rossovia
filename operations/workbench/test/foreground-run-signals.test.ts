import { describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import { createForegroundRunSignalAdapter } from "../src/integrations/foreground-run-signals";

class FakeProcess extends EventEmitter {
  exited?: number;

  exit(code?: number): void {
    if (code !== undefined) {
      this.exited = code;
    }
  }
}

function createFakeProcess(): NodeJS.Process {
  return new FakeProcess() as unknown as NodeJS.Process;
}

function fakeState(fake: NodeJS.Process): FakeProcess {
  return fake as unknown as FakeProcess;
}

describe("foreground run signal adapter", () => {
  test("applies a pending pre-live signal exactly once immediately after publication", () => {
    const fake = createFakeProcess();
    const stops: string[] = [];
    const adapter = createForegroundRunSignalAdapter({
      home: "/fake/home",
      stopRun_: (runId) => { stops.push(runId); },
      process_: fake,
    });

    fake.emit("SIGINT");
    fake.emit("SIGTERM");
    expect(stops).toEqual([]);

    adapter.controlBundle.onControlAvailable("run-1");
    expect(stops).toEqual(["run-1"]);

    // Subsequent signals are ignored: the stop was applied exactly once.
    fake.emit("SIGINT");
    fake.emit("SIGTERM");
    expect(stops).toEqual(["run-1"]);
    expect(fakeState(fake).exited).toBeUndefined();

    adapter.dispose();
  });

  test("calls stopRun exactly once for the first live signal and ignores later signals", () => {
    const fake = createFakeProcess();
    const stops: string[] = [];
    const adapter = createForegroundRunSignalAdapter({
      home: "/fake/home",
      stopRun_: (runId) => { stops.push(runId); },
      process_: fake,
    });

    adapter.controlBundle.onControlAvailable("run-2");
    expect(stops).toEqual([]);

    fake.emit("SIGINT");
    expect(stops).toEqual(["run-2"]);

    fake.emit("SIGTERM");
    fake.emit("SIGINT");
    expect(stops).toEqual(["run-2"]);
    expect(fakeState(fake).exited).toBeUndefined();

    adapter.dispose();
  });

  test("never aborts or exits when stopRun fails", () => {
    const fake = createFakeProcess();
    const adapter = createForegroundRunSignalAdapter({
      home: "/fake/home",
      stopRun_: () => {
        throw new Error("durable receipt failed");
      },
      process_: fake,
    });

    adapter.controlBundle.onControlAvailable("run-3");
    expect(() => fake.emit("SIGINT")).not.toThrow();
    expect(fakeState(fake).exited).toBeUndefined();
    // The adapter owns the registry but never directly aborts the controller.
    expect(adapter.controlBundle.registry.has("run-3")).toBeFalse();

    adapter.dispose();
  });

  test("removes both SIGINT and SIGTERM listeners on dispose", () => {
    const fake = createFakeProcess();
    const adapter = createForegroundRunSignalAdapter({
      home: "/fake/home",
      stopRun_: () => {},
      process_: fake,
    });

    expect(fake.listenerCount("SIGINT")).toBe(1);
    expect(fake.listenerCount("SIGTERM")).toBe(1);

    adapter.dispose();
    expect(fake.listenerCount("SIGINT")).toBe(0);
    expect(fake.listenerCount("SIGTERM")).toBe(0);
  });

  test("drops a pending pre-live signal on dispose without calling stopRun", () => {
    const fake = createFakeProcess();
    const stops: string[] = [];
    const adapter = createForegroundRunSignalAdapter({
      home: "/fake/home",
      stopRun_: (runId) => { stops.push(runId); },
      process_: fake,
    });

    fake.emit("SIGINT");
    adapter.dispose();
    adapter.controlBundle.onControlAvailable("run-4");

    expect(stops).toEqual([]);
    expect(fake.listenerCount("SIGINT")).toBe(0);
    expect(fake.listenerCount("SIGTERM")).toBe(0);
  });
});
