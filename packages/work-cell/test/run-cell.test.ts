import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CellInput } from "../src/contracts";
import type { CellDriver, DriverResult } from "../src/driver";
import { runCell } from "../src/run-cell";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

test("fails closed when supplied tasks are ignored by a driver", async () => {
  const root = await mkdtemp(join(tmpdir(), "work-cell-run-test-"));
  temporaryRoots.push(root);
  const input: CellInput = {
    id: "run-cell-fixture",
    intent: "Exercise the generic task completion invariant.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Return the fixture result."],
    capabilities: [],
    context: [],
    capabilitiesRequired: [],
    acceptance: ["Supplied tasks remain verifiable."],
    tasks: [{ subject: "Inspect the bounded source", description: "Read the bounded source." }],
    budget: { maxSteps: 1, maxDurationMs: 2_000, maxCommandOutputBytes: 4_000 },
  };

  const record = await runCell(input, new IgnoringTaskDriver());

  expect(record.status).toBe("verification_failed");
  expect(record.tasks).toBeUndefined();
  expect(record.verification.tasks).toEqual({
    passed: false,
    pending: 0,
    inProgress: 0,
    completed: 0,
    blocked: 0,
    errors: ["driver completed without the enabled task state"],
  });
  expect(record.error).toBe("driver completed without the enabled task state");
});

class IgnoringTaskDriver implements CellDriver {
  readonly descriptor = { adapter: "ignoring-task-fixture", provider: "deterministic", model: "fixture" };

  async run(): Promise<DriverResult> {
    return {
      terminalToolsCalled: [],
      finalText: "done",
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
      rawSteps: [],
    };
  }
}
