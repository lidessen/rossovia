import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CellInput, CellUsage } from "../src/contracts";
import type { CellDriver, DriverContext, DriverResult } from "../src/driver";
import {
  SWARM_INPUT_VERSION,
  SwarmIndexSchema,
  SwarmInputSchema,
  SwarmOutcomeRecordSchema,
  persistSwarmRecord,
  projectSwarm,
  runSwarm,
  startSwarm,
  startSwarmFromFile,
  type SwarmInput,
} from "../src/swarm";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("256 complete Cells cross the concurrent boundary exactly once while retaining manifest order", async () => {
  const root = await fixture();
  const ids = Array.from({ length: 256 }, (_, index) => `cell-${String(index + 1).padStart(3, "0")}`);
  const manifest = swarm(root, ids);
  manifest.concurrency = 256;
  const barrier = new SelectionBarrier(256);
  let drivers = 0;

  const record = await runSwarm(manifest, () => {
    drivers += 1;
    return new BarrierSwarmDriver(barrier);
  });

  expect(drivers).toBe(256);
  expect(barrier.peak).toBe(256);
  expect(record.outcomes.map((outcome) => outcome.cellId)).toEqual(ids);
  expect(record.outcomes.every((outcome) => outcome.kind === "settled" && outcome.record.status === "passed")).toBe(true);
  expect(projectSwarm(record).counts).toEqual({ passed: 256 });
});

test("input requires declared concurrency while run memory contains only execution facts", async () => {
  const root = await fixture();
  const manifest = swarm(root, ["only"]);
  expect(SwarmInputSchema.safeParse({ ...manifest, concurrency: undefined }).success).toBe(false);

  const run = await runSwarm(manifest, () => new SwarmDriver());
  expect(run.startedAt).toBeInstanceOf(Date);
  expect(run.finishedAt).toBeInstanceOf(Date);
  expect(run).not.toHaveProperty("version");
  expect(run).not.toHaveProperty("summary");
  expect(projectSwarm(run)).toMatchObject({ authority: "none", counts: { passed: 1 } });
});

test("startSwarm returns an asynchronous handle while admitted Cells remain active", async () => {
  const root = await fixture();
  const barrier = new ManualBarrier(2);
  const handle = await startSwarm(swarm(root, ["first", "second"]), () => new BarrierSwarmDriver(barrier));

  await barrier.waitUntilBlocked();
  let settled = false;
  void handle.settled.then(() => { settled = true; });
  await Promise.resolve();
  expect(handle.swarmId).toBe("test-swarm");
  expect(settled).toBe(false);

  handle.cancel("supervisor cancellation");
  const record = await handle.settled;
  barrier.release();
  expect(record.outcomes.map((outcome) => [
    outcome.cellId,
    outcome.kind === "settled" ? outcome.record.status : outcome.kind,
  ])).toEqual([
    ["first", "cancelled"],
    ["second", "cancelled"],
  ]);
});

test("file-backed Swarm returns stable status and result paths without retaining the manifest as tool input", async () => {
  const root = await fixture();
  const manifestPath = join(root, "swarm.json");
  const outputRoot = join(root, ".operations");
  await writeFile(manifestPath, `${JSON.stringify(swarm(root, ["original"]))}\n`, "utf8");
  const barrier = new ManualBarrier(1);

  const handle = await startSwarmFromFile(
    { inputFile: "swarm.json" },
    () => new BarrierSwarmDriver(barrier),
    { inputRoot: root, outputRoot },
  );
  await barrier.waitUntilBlocked();
  expect(JSON.parse(await readFile(handle.statusPath, "utf8"))).toMatchObject({
    operationId: handle.operationId,
    swarmId: "test-swarm",
    state: "running",
    resultPath: handle.resultPath,
  });
  await expect(readFile(handle.resultPath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });

  // Admission froze the parsed manifest; changing its carrier cannot change
  // the already running operation.
  await writeFile(manifestPath, `${JSON.stringify(swarm(root, ["replacement"]))}\n`, "utf8");
  barrier.release();
  const settlement = await handle.settled;
  expect(settlement.run.outcomes.map((outcome) => outcome.cellId)).toEqual(["original"]);
  expect(settlement.persisted.indexPath).toBe(handle.resultPath);
  expect(JSON.parse(await readFile(handle.statusPath, "utf8"))).toMatchObject({ state: "settled" });
  expect(JSON.parse(await readFile(handle.resultPath, "utf8"))).toMatchObject({
    entries: [{ cellId: "original", recordPath: "cells/0001-original.json" }],
  });
});

test("one Cell runner error cannot erase passing siblings or reorder their records", async () => {
  const root = await fixture();
  const manifest = swarm(root, ["first", "broken", "third"]);
  manifest.cells[1]!.budget.maxSteps = 1;
  manifest.cells[1]!.terminalTools = [{
    name: "finish_test",
    description: "Finish the test.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  }];
  let drivers = 0;

  const record = await runSwarm(manifest, () => {
    drivers += 1;
    return new SwarmDriver();
  });

  expect(drivers).toBe(3);
  expect(record.outcomes.map((outcome) => [outcome.cellId, outcome.kind])).toEqual([
    ["first", "settled"],
    ["broken", "runner_error"],
    ["third", "settled"],
  ]);
  expect(projectSwarm(record)).toMatchObject({
    authority: "none",
    counts: { passed: 2, runner_error: 1 },
    usage: { totalTokens: 30 },
  });

  const manifestPath = join(root, "runner-error-swarm.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`, "utf8");
  const persisted = await persistSwarmRecord(manifestPath, record);
  const runnerError = JSON.parse(await readFile(persisted.cellRecordPaths[1]!, "utf8"));
  expect(runnerError).toMatchObject({
    version: "work-cell.swarm-outcome.v1",
    cellId: "broken",
    kind: "runner_error",
    startedAt: expect.any(String),
    finishedAt: expect.any(String),
  });
});

test("cancellation retains one manifest-order outcome for every undispatched Cell", async () => {
  const root = await fixture();
  const manifest = swarm(root, ["first", "second", "third"]);
  const controller = new AbortController();
  controller.abort(new Error("cancel before release"));

  const record = await runSwarm(manifest, () => new SwarmDriver(), controller.signal);

  expect(record.outcomes.map((outcome) => outcome.cellId)).toEqual(["first", "second", "third"]);
  expect(record.outcomes.every((outcome) =>
    outcome.kind === "runner_error" && outcome.error.includes("cancelled before")
  )).toBe(true);
});

test("shared roots allow read-only Cells but reject write or command authority before execution", async () => {
  const root = await fixture();
  const readOnly = swarm(root, ["reader-a", "reader-b"]);
  let drivers = 0;
  const record = await runSwarm(readOnly, () => {
    drivers += 1;
    return new SwarmDriver();
  });
  expect(projectSwarm(record).counts).toEqual({ passed: 2 });
  expect(drivers).toBe(2);

  const writable = swarm(root, ["reader", "writer"]);
  writable.cells[1]!.workspace.writePaths = ["output"];
  await expect(runSwarm(writable, () => {
    drivers += 1;
    return new SwarmDriver();
  })).rejects.toThrow("must all be read-only and command-free");
  expect(drivers).toBe(2);

  const commandCapable = swarm(root, ["reader", "commander"]);
  commandCapable.cells[1]!.workspace.allowedCommands = ["true"];
  await expect(runSwarm(commandCapable, () => new SwarmDriver())).rejects.toThrow(
    "must all be read-only and command-free",
  );
});

test("persistence writes independent Cell evidence and a compact rebuildable Swarm index", async () => {
  const root = await fixture();
  const manifest = swarm(root, ["alpha", "beta"]);
  const manifestPath = join(root, "swarm.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`, "utf8");
  const record = await runSwarm(manifest, () => new SwarmDriver());

  const persisted = await persistSwarmRecord(manifestPath, record);
  const indexText = await readFile(persisted.indexPath, "utf8");
  const index = JSON.parse(indexText);

  expect(persisted.cellRecordPaths).toHaveLength(2);
  expect(index).toMatchObject({
    version: "work-cell.swarm-index.v1",
    entries: [
      { index: 0, cellId: "alpha", status: "passed" },
      { index: 1, cellId: "beta", status: "passed" },
    ],
    summary: { authority: "none", counts: { passed: 2 } },
  });
  expect(index.entries.map((entry: { recordPath: string }) => entry.recordPath)).toEqual([
    "cells/0001-alpha.json",
    "cells/0002-beta.json",
  ]);
  expect(index).not.toHaveProperty("cellCount");
  expect(index.summary).not.toHaveProperty("kind");
  expect(() => SwarmIndexSchema.parse(index)).not.toThrow();
  expect(() => SwarmIndexSchema.parse({ ...index, cellCount: 2 })).toThrow();
  expect(indexText).not.toContain("finalText");
  for (const [position, path] of persisted.cellRecordPaths.entries()) {
    const content = await readFile(path, "utf8");
    expect(content).toContain('"finalText": "cell completed"');
    const outcome = JSON.parse(content);
    expect(SwarmOutcomeRecordSchema.parse(outcome)).toMatchObject({
      version: "work-cell.swarm-outcome.v1",
      index: position,
    });
    if (position === 0) {
      expect(() => SwarmOutcomeRecordSchema.parse({ ...outcome, unexpected: true })).toThrow();
    }
    expect(index.entries[position].sha256).toBe(createHash("sha256").update(content).digest("hex"));
  }
});

class SwarmDriver implements CellDriver {
  readonly descriptor = { adapter: "swarm-test", provider: "deterministic", model: "fixture" };

  async run(_input: CellInput, _context: DriverContext): Promise<DriverResult> {
    return {
      finalText: "cell completed",
      terminalToolsCalled: [],
      usage: usage(15),
      rawSteps: [],
    };
  }
}

class BarrierSwarmDriver extends SwarmDriver {
  constructor(private readonly barrier: { enter(): Promise<void> }) {
    super();
  }

  override async run(input: CellInput, context: DriverContext): Promise<DriverResult> {
    await this.barrier.enter();
    return super.run(input, context);
  }
}

class ManualBarrier {
  private arrived = 0;
  private readonly blocked: Promise<void>;
  private resolveBlocked!: () => void;
  private readonly released: Promise<void>;
  private resolveReleased!: () => void;

  constructor(private readonly expected: number) {
    this.blocked = new Promise<void>((resolve) => { this.resolveBlocked = resolve; });
    this.released = new Promise<void>((resolve) => { this.resolveReleased = resolve; });
  }

  async enter(): Promise<void> {
    this.arrived += 1;
    if (this.arrived === this.expected) this.resolveBlocked();
    await this.released;
  }

  waitUntilBlocked(): Promise<void> { return this.blocked; }
  release(): void { this.resolveReleased(); }
}

class SelectionBarrier {
  private active = 0;
  private arrived = 0;
  private release!: () => void;
  private readonly released = new Promise<void>((resolve) => { this.release = resolve; });
  peak = 0;

  constructor(private readonly expected: number) {}

  async enter(): Promise<void> {
    this.active += 1;
    this.arrived += 1;
    this.peak = Math.max(this.peak, this.active);
    if (this.arrived === this.expected) this.release();
    await this.released;
    this.active -= 1;
  }
}

function swarm(root: string, ids: string[]): SwarmInput {
  return {
    version: SWARM_INPUT_VERSION,
    id: "test-swarm",
    concurrency: 3,
    cells: ids.map((id) => input(root, id)),
  };
}

function input(root: string, id: string): CellInput {
  return {
    id,
    intent: `Run independent Cell ${id}`,
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Complete the bounded test Cell."],
    capabilities: ["read"],
    context: [],
    capabilitiesRequired: ["read"],
    acceptance: ["The Cell retains an independent record"],
    budget: { maxSteps: 4, estimatedTokens: 15, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  };
}

function usage(totalTokens: number): CellUsage {
  return { inputTokens: totalTokens, outputTokens: 0, totalTokens, cachedInputTokens: 0 };
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "work-cell-swarm-"));
  roots.push(root);
  await mkdir(join(root, "principles", "interpretations"), { recursive: true });
  await writeFile(join(root, "principles", "SEQUENCE.md"), "P04｜主要矛盾｜矛盾论\n");
  await writeFile(join(root, "principles", "interpretations", "P04.md"), "# P04\n");
  return root;
}
