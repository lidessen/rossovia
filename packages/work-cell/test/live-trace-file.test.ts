import { describe, expect, test } from "bun:test";
import { createLiveTraceFile } from "../src/live-trace-file";

const started = {
  at: "2026-07-22T00:00:00.000Z",
  type: "cell.started",
  data: { runId: "run-1" },
};

describe("live trace file", () => {
  test("announces and exposes the path only after the first durable event", () => {
    const announcements: string[] = [];
    const writes: string[] = [];
    const trace = createLiveTraceFile(
      "/tmp/cell.json",
      (message) => announcements.push(message),
      (path, content) => writes.push(`${path}:${content}`),
    );

    trace.observe(started);

    expect(trace.availablePath()).toBe("/tmp/cell.run-1.events.jsonl");
    expect(announcements).toEqual(["[work-cell] events: /tmp/cell.run-1.events.jsonl"]);
    expect(writes[0]).toContain('"type":"cell.started"');
  });

  test("does not claim a trace file when the sink fails", () => {
    const announcements: string[] = [];
    let calls = 0;
    const trace = createLiveTraceFile(
      "/tmp/cell.json",
      (message) => announcements.push(message),
      () => {
        calls += 1;
        if (calls === 2) throw new Error("disk unavailable");
      },
    );

    trace.observe(started);
    expect(() => trace.observe({ ...started, type: "agent.step.started" })).toThrow("disk unavailable");

    expect(trace.availablePath()).toBeUndefined();
    expect(announcements).toHaveLength(1);
  });
});
