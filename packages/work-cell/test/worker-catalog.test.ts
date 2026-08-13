import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CellInput, CellUsage } from "../src/contracts";
import type { CellDriver, DriverContext, DriverResult } from "../src/driver";
import { runSwarm, SWARM_INPUT_VERSION } from "../src/swarm";
import { WORKER_CARD_VERSION, WorkerCatalog, type WorkerCard } from "../src/worker-catalog";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("hard required labels filter runnable cards while descriptions retain semantic selection meaning", () => {
  const catalog = catalogWith([
    card(
      "deepseek-flash",
      "deepseek",
      "deepseek-v4-flash",
      ["coding", "text", "thinking", "tools", "read"],
      "Handles repository analysis, coding, debugging, and review. Recommended for high-value text/code engineering without visual input.",
    ),
    card(
      "visual-worker",
      "visual-provider",
      "visual-model",
      ["coding", "vision", "video", "thinking", "tools", "read"],
      "Combines code with screenshots, UI, diagrams, and video. Recommended for visual-plus-code diagnosis and implementation.",
    ),
  ]);

  const result = catalog.list(["vision"]);

  expect(result.map((candidate) => candidate.id)).toEqual(["visual-worker"]);
  expect(result[0]?.description).toContain("screenshots");
  expect(result[0]?.description).toContain("visual-plus-code");
  expect(result[0]?.description).toContain("Recommended");
});

test("each mixed-worker Cell resolves its selected driver and keeps executionProfile as evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "work-cell-workers-"));
  roots.push(root);
  const catalog = catalogWith([
    card("worker-a", "provider-a", "model-a", ["coding", "read"], "Worker A handles code analysis. Recommended for bounded code inspection."),
    card("worker-b", "provider-b", "model-b", ["coding", "read"], "Worker B handles code analysis. Recommended for bounded code inspection."),
  ]);
  const inputs = [cell(root, "cell-a", "worker-a", "provider-a", "model-a"), cell(root, "cell-b", "worker-b", "provider-b", "model-b")];

  const run = await runSwarm({
    version: SWARM_INPUT_VERSION,
    id: "mixed-workers",
    concurrency: 2,
    cells: inputs,
  }, (input) => catalog.createDriver(input));

  expect(run.outcomes.map((outcome) => outcome.kind === "settled"
    ? [outcome.record.input.workerId, outcome.record.driver.provider, outcome.record.driver.model, outcome.record.input.executionProfile?.id]
    : [outcome.kind],
  )).toEqual([
    ["worker-a", "provider-a", "model-a", "worker-a"],
    ["worker-b", "provider-b", "model-b", "worker-b"],
  ]);
});

test("driver resolution rejects a selected worker missing a Cell required label", () => {
  const catalog = catalogWith([
    card("text-worker", "provider-a", "model-a", ["coding", "text"], "Handles text/code work. Recommended for non-visual engineering."),
  ]);
  const input = cell("/tmp", "vision-cell", "text-worker", "provider-a", "model-a", ["vision"]);

  expect(() => catalog.createDriver(input)).toThrow("missing required labels: vision");
});

test("local image input requires a vision worker even when the Cell omits a vision label", () => {
  const catalog = catalogWith([
    card("deepseek-flash", "deepseek", "deepseek-v4-flash", ["coding", "text"], "Handles text/code work. Recommended for non-visual engineering."),
  ]);
  const input = cell("/tmp", "image-cell", "deepseek-flash", "deepseek", "deepseek-v4-flash", ["coding"]);
  input.imagePaths = ["images/probe.png"];

  expect(() => catalog.createDriver(input)).toThrow("missing required labels: vision");
});

function catalogWith(cards: readonly WorkerCard[]): WorkerCatalog {
  return new WorkerCatalog(cards.map((worker) => ({
    card: worker,
    createDriver: () => new IdentityDriver(worker.executionProfile.provider, worker.executionProfile.model),
  })));
}

function card(
  id: string,
  provider: string,
  model: string,
  labels: string[],
  description: string,
): WorkerCard {
  return {
    version: WORKER_CARD_VERSION,
    id,
    labels,
    description,
    executionProfile: {
      id,
      version: "execution-profile.v1",
      provider,
      model,
      parallelism: "serial",
    },
    availability: { status: "available" },
  };
}

function cell(
  root: string,
  id: string,
  workerId: string,
  provider: string,
  model: string,
  capabilitiesRequired = ["coding"],
): CellInput {
  return {
    id,
    workerId,
    intent: `Run ${id}`,
    workspace: { root, readPaths: [], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Return the bounded result."],
    capabilities: [...capabilitiesRequired],
    context: [],
    capabilitiesRequired,
    acceptance: ["The selected worker executes the Cell."],
    budget: { maxSteps: 1, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
    executionProfile: {
      id: workerId,
      version: "execution-profile.v1",
      provider,
      model,
      parallelism: "serial",
    },
  };
}

class IdentityDriver implements CellDriver {
  readonly descriptor;

  constructor(provider: string, model: string) {
    this.descriptor = { adapter: "test", provider, model };
  }

  async run(_input: CellInput, _context: DriverContext): Promise<DriverResult> {
    const usage: CellUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 };
    return { terminalToolsCalled: [], finalText: "completed", usage, rawSteps: [] };
  }
}
