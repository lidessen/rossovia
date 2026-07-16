import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CellInputSchema, type CellInput } from "../src/contracts";
import type { CellDriver, DriverContext, DriverResult } from "../src/driver";
import {
  InMemoryCellQueue,
  OrchestrationRunError,
  runOrchestration,
  type WorkLease,
  type WorkSettlement,
  type WorkSource,
} from "../src/orchestration";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("an open queue accepts work after execution starts and closes with bounded retained settlements", async () => {
  const root = await fixture();
  const queue = new InMemoryCellQueue();
  const tracker = new ExecutionTracker(2);
  let drivers = 0;
  const running = runOrchestration(queue, () => {
    drivers += 1;
    return new QueueDriver(tracker);
  }, { concurrency: 2 });

  await queue.submit(input(root, "first"));
  await queue.submit(input(root, "second"));
  await tracker.waitUntilBlocked();
  await queue.submit(input(root, "third"));
  queue.close();
  tracker.release();

  const record = await running;
  expect(record.status).toBe("completed");
  expect(drivers).toBe(3);
  expect(tracker.peak).toBe(2);
  expect(queue.settlements().map((settlement) => settlement.lease.item.itemId)).toEqual([
    "first",
    "second",
    "third",
  ]);
  expect(queue.settlements().every((settlement) =>
    settlement.kind === "settled" && settlement.record.status === "passed"
  )).toBe(true);
  expect(record.events.filter((event) => event.type === "attempt.started")).toHaveLength(3);
  expect(record.events.filter((event) => event.type === "attempt.settled")).toHaveLength(3);
  await expect(queue.submit(input(root, "late"))).rejects.toThrow("closed Work Cell queue");
});

test("queue admission preserves the shared-workspace boundary and CellInput rejects scheduling vocabulary", async () => {
  const root = await fixture();
  const queue = new InMemoryCellQueue();
  await queue.submit(input(root, "reader"));
  const writer = input(root, "writer");
  writer.workspace.writePaths = ["output"];
  await expect(queue.submit(writer)).rejects.toThrow("must all be read-only and command-free");

  const cell = input(root, "plain-cell");
  expect(CellInputSchema.safeParse({ ...cell, priority: 10 }).success).toBe(false);
  expect(CellInputSchema.safeParse({ ...cell, dependsOn: ["reader"] }).success).toBe(false);
});

test("cancelling an empty open queue removes its waiter and preserves later submissions as pending", async () => {
  const root = await fixture();
  const queue = new InMemoryCellQueue();
  const controller = new AbortController();
  const running = runOrchestration(queue, () => new QueueDriver(new ExecutionTracker(1)), {
    concurrency: 1,
    signal: controller.signal,
  });

  await Promise.resolve();
  controller.abort("reviewed cancellation");
  const record = await running;
  await queue.submit(input(root, "retained-after-cancel"));
  queue.close();

  expect(record.status).toBe("cancelled");
  expect(record.settlements).toHaveLength(0);
  expect(queue.pendingItems().map((item) => item.itemId)).toEqual(["retained-after-cancel"]);
});

test("a fatal WorkSource protocol violation retains sibling settlements and failure events", async () => {
  const root = await fixture();
  const item = { itemId: "duplicate", sequence: 0, input: input(root, "duplicate") };
  const lease: WorkLease = { leaseId: "same-lease", item };
  let releases = 0;
  const observed: WorkSettlement[] = [];
  const source: WorkSource = {
    async next() {
      releases += 1;
      return releases <= 2 ? lease : null;
    },
    async settle(settlement) {
      observed.push(settlement);
    },
  };
  const driver: CellDriver = {
    descriptor: { adapter: "abort-aware", provider: "deterministic", model: "fixture" },
    async run(_input, context) {
      context.signal.throwIfAborted();
      await new Promise<void>((_resolve, reject) => {
        context.signal.addEventListener("abort", () => reject(context.signal.reason), { once: true });
      });
      throw new Error("unreachable");
    },
  };

  let caught: unknown;
  try {
    await runOrchestration(source, () => driver, { concurrency: 2 });
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(OrchestrationRunError);
  const failure = caught as OrchestrationRunError;
  expect(failure.message).toContain("duplicate lease same-lease");
  expect(failure.settlements).toHaveLength(1);
  expect(failure.settlements[0]?.kind).toBe("settled");
  expect(observed).toHaveLength(1);
  expect(failure.events.some((event) => event.type === "orchestration.failed")).toBe(true);
});

class QueueDriver implements CellDriver {
  readonly descriptor = { adapter: "queue-test", provider: "deterministic", model: "fixture" };

  constructor(private readonly tracker: ExecutionTracker) {}

  async run(_input: CellInput, _context: DriverContext): Promise<DriverResult> {
    await this.tracker.enter();
    return {
      finalText: "cell completed",
      terminalToolsCalled: [],
      usage: { inputTokens: 10, outputTokens: 0, totalTokens: 10, cachedInputTokens: 0 },
      rawSteps: [],
    };
  }
}

class ExecutionTracker {
  private active = 0;
  private started = 0;
  private readonly blocked: Promise<void>;
  private resolveBlocked!: () => void;
  private readonly released: Promise<void>;
  private resolveReleased!: () => void;
  peak = 0;

  constructor(private readonly blockAt: number) {
    this.blocked = new Promise<void>((resolve) => { this.resolveBlocked = resolve; });
    this.released = new Promise<void>((resolve) => { this.resolveReleased = resolve; });
  }

  async enter(): Promise<void> {
    this.active += 1;
    this.started += 1;
    this.peak = Math.max(this.peak, this.active);
    if (this.started === this.blockAt) this.resolveBlocked();
    await this.released;
    this.active -= 1;
  }

  waitUntilBlocked(): Promise<void> {
    return this.blocked;
  }

  release(): void {
    this.resolveReleased();
  }
}

function input(root: string, id: string): CellInput {
  return {
    id,
    intent: `Run queued Cell ${id}`,
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Complete the bounded queued Cell."],
    capabilities: ["read"],
    context: [],
    capabilitiesRequired: ["read"],
    acceptance: ["The Cell retains an independent settlement"],
    budget: { maxSteps: 4, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  };
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "work-cell-orchestration-"));
  roots.push(root);
  await mkdir(join(root, "output"), { recursive: true });
  return root;
}
