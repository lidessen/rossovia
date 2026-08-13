import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CellInput, CellRunRecord, CellUsage, TraceEvent } from "../src/contracts";
import { CellExecutionError, type DriverContext } from "../src/driver";
import { createLiveTraceFile } from "../src/live-trace-file";
import { runCell } from "../src/run-cell";
import {
  BunOpenCodeCliProcessAdapter,
  OpenCodeCliDriver,
  type OpenCodeCliProcessAdapter,
  type OpenCodeCliProcessRequest,
  type OpenCodeCliProcessResult,
} from "../src/opencode-cli-driver";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("OpenCode CLI driver", () => {
  test("uses exact fresh argv, canonical root, current environment, and bounded prompt", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    let request: OpenCodeCliProcessRequest | undefined;
    const driver = openCodeDriver(root, fixtureProcess(async (candidate) => {
      request = candidate;
      return success();
    }), { reasoningEffort: "high" });
    const observation = context(canonicalRoot);

    await driver.run(cellInput(root), observation.value);

    const prompt = request!.argv[1]!;
    expect(request!.executable).toBe("/fixture/bin/opencode");
    expect(request!.cwd).toBe(canonicalRoot);
    expect(request!.stdin).toBe("");
    expect(request!.environment.PATH).toBe(process.env.PATH);
    expect(request!.argv).toEqual([
      "run", prompt, "--pure", "--auto", "--format", "json", "--model", "anthropic/fixture",
      "--variant", "high", "--dir", canonicalRoot,
    ]);
    for (const text of [
      "Review the implementation.", "Follow the fixture instructions.", "Fixture evidence",
      "Return a concise result.", "Workspace policy", "Read repository guidance",
      "disposable worktree", "make only the requested changes", "Run the named checks",
      "changed files, checks, and remaining uncertainty",
    ]) expect(prompt).toContain(text);
    expect(driver.descriptor).toEqual({
      adapter: "opencode-cli.v1", provider: "anthropic", model: "anthropic/fixture",
    });
  });

  test("puts resume session before dir", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    let request!: OpenCodeCliProcessRequest;
    const driver = openCodeDriver(root, fixtureProcess(async (candidate) => {
      request = candidate;
      return success();
    }), { sessionId: "resume-123" });

    await driver.run(cellInput(root), context(canonicalRoot).value);

    expect(request.argv.slice(-4)).toEqual(["--session", "resume-123", "--dir", canonicalRoot]);
  });

  test("retains events, session, stopped-step text, usage, cache, cost, stderr, and raw evidence", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const driver = openCodeDriver(root, fixtureProcess(async () => ({
      exitCode: 0,
      stdout: jsonLines(
        event("step_start", {}),
        event("text", { text: "First " }),
        event("text", { text: "result." }),
        event("step_finish", {
          reason: "stop", cost: 0.012,
          tokens: { input: 20, output: 7, total: 27, cache: { read: 9 } },
        }),
      ),
      stderr: "fixture warning",
      durationMs: 17,
    })));
    const observation = context(canonicalRoot);

    const result = await driver.run(cellInput(root), observation.value);

    expect(result.finalText).toBe("First result.");
    expect(result.terminalToolsCalled).toEqual([]);
    expect(result.usage).toEqual({ inputTokens: 20, outputTokens: 7, totalTokens: 27, cachedInputTokens: 9 });
    expect(observation.usages).toEqual([result.usage]);
    expect(result.providerMetadata).toEqual({
      adapter: "opencode-cli.v1", sessionId: "session-1", exitCode: 0, durationMs: 17,
      observedCost: 0.012,
    });
    expect(observation.emitted.filter(({ type }) => type === "opencode.cli.event")).toHaveLength(4);
    expect(observation.emitted).toContainEqual({ type: "opencode.cli.stderr", data: { text: "fixture warning" } });
    expect(result.rawSteps).toContainEqual({
      type: "opencode.cli.process", exitCode: 0, durationMs: 17, stderr: "fixture warning",
    });
  });

  test("retains malformed stdout and fails without stopped-step text", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const driver = openCodeDriver(root, fixtureProcess(async () => ({
      exitCode: 0,
      stdout: `malformed\n${jsonLines(event("step_start", {}), event("text", { text: "unfinished" }))}`,
      stderr: "",
      durationMs: 2,
    })));
    const observation = context(canonicalRoot);

    await expect(driver.run(cellInput(root), observation.value)).rejects.toMatchObject({
      message: "OpenCode CLI completed without final stopped-step text",
    });
    expect(observation.emitted).toContainEqual({
      type: "opencode.cli.stdout.unparsed",
      data: { type: "opencode.cli.stdout.unparsed", line: "malformed" },
    });
    expect(observation.usages).toHaveLength(1);
  });

  test("rejects empty stopped-step text", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const driver = openCodeDriver(root, fixtureProcess(async () => ({
      ...success(),
      stdout: jsonLines(
        event("step_start", {}),
        event("text", { text: " \n\t" }),
        event("step_finish", { reason: "stop", tokens: {} }),
      ),
    })));

    await expect(driver.run(cellInput(root), context(canonicalRoot).value)).rejects.toMatchObject({
      message: "OpenCode CLI completed without final stopped-step text",
    });
  });

  test("rejects conflicting sessions", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const driver = openCodeDriver(root, fixtureProcess(async () => ({
      ...success(),
      stdout: jsonLines(
        event("step_start", {}, "one"),
        event("text", { text: "done" }, "two"),
        event("step_finish", { reason: "stop", tokens: {} }, "two"),
      ),
    })));

    await expect(driver.run(cellInput(root), context(canonicalRoot).value)).rejects.toMatchObject({
      message: "OpenCode CLI returned conflicting session ids: one, two",
    });
  });

  test("nonzero exit retains observed usage", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    const driver = openCodeDriver(root, fixtureProcess(async () => ({
      exitCode: 19,
      stdout: jsonLines(event("step_finish", {
        reason: "error", cost: 0.2,
        tokens: { input: 13, output: 2, total: 15, cache: { read: 3 } },
      })),
      stderr: "provider rejected request",
      durationMs: 4,
    })));

    try {
      await driver.run(cellInput(root), context(canonicalRoot).value);
      throw new Error("expected driver failure");
    } catch (error) {
      expect(error).toBeInstanceOf(CellExecutionError);
      expect((error as CellExecutionError).message).toBe("OpenCode CLI exited with code 19: provider rejected request");
      expect((error as CellExecutionError).usage).toEqual({
        inputTokens: 13, outputTokens: 2, totalTokens: 15, cachedInputTokens: 3,
      });
    }
  });

  test("propagates cancellation and enforces timeout", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    let started!: () => void;
    const processStarted = new Promise<void>((resolve) => { started = resolve; });
    const blocking = fixtureProcess(async (request) => {
      started();
      return await new Promise<OpenCodeCliProcessResult>((_resolve, reject) => {
        request.signal.addEventListener("abort", () => reject(request.signal.reason), { once: true });
      });
    });
    const controller = new AbortController();
    const cancelled = openCodeDriver(root, blocking).run(cellInput(root), context(canonicalRoot, controller.signal).value);
    await processStarted;
    controller.abort(new Error("fixture cancellation"));
    await expect(cancelled).rejects.toMatchObject({ message: "fixture cancellation" });

    const timedOut = openCodeDriver(root, blocking, { timeoutMs: 5 }).run(
      cellInput(root), context(canonicalRoot).value,
    );
    await expect(timedOut).rejects.toMatchObject({ message: "OpenCode CLI execution timed out after 5ms" });
  });

  test("rejects unsupported contracts before process launch", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    for (const field of ["terminalTools", "outputSchema", "tasks"] as const) {
      let runs = 0;
      const driver = openCodeDriver(root, fixtureProcess(async () => { runs += 1; return success(); }));
      const input = { ...cellInput(root), [field]: field === "terminalTools" ? [] : {} } as CellInput;
      await expect(driver.run(input, context(canonicalRoot).value)).rejects.toMatchObject({
        message: `OpenCode CLI driver does not support ${field}`,
      });
      expect(runs).toBe(0);
    }
  });

  test("requires full-worktree change capture before process launch", async () => {
    const root = await fixture();
    const canonicalRoot = await realpath(root);
    let runs = 0;
    const driver = openCodeDriver(root, fixtureProcess(async () => { runs += 1; return success(); }));
    const narrowInput = cellInput(root);
    narrowInput.workspace.writePaths = ["src"];

    await expect(driver.run(narrowInput, context(canonicalRoot).value)).rejects.toMatchObject({
      message: 'OpenCode CLI driver requires workspace.writePaths to include "." for full-worktree change capture',
    });
    expect(runs).toBe(0);

    await driver.run(cellInput(root), context(canonicalRoot).value);
    expect(runs).toBe(1);
  });

  test("delivers structured live progress to the trace JSONL before the child exits", async () => {
    const root = await fixture();
    const executable = await fixtureExecutable(root, [
      `printf '%s\\n' '{"type":"step_start","sessionID":"slow-1","part":{}}'`,
      "sleep 1",
      `printf '%s\\n' '{"type":"text","sessionID":"slow-1","part":{"text":"Complete."}}'`,
      "sleep 1",
      `printf '%s\\n' '{"type":"step_finish","sessionID":"slow-1","part":{"reason":"stop","cost":0.01,"tokens":{"input":5,"output":3,"total":8,"cache":{"read":0}}}}'`,
    ]);
    const input = cellInput(root);
    input.budget.maxDurationMs = 15_000;
    const observed: TraceEvent[] = [];
    const liveTrace = createLiveTraceFile(join(root, "cell-input.json"), () => {});
    const startedAt = performance.now();
    const run = runCell(input, realDriver(root, executable), {
      onTrace(event) {
        observed.push(event);
        liveTrace.observe(event);
      },
    });

    const first = await waitFor(
      () => observed.find((event) => event.type === "opencode.cli.progress"),
      2_000,
    );
    const elapsedBeforeFirstProgress = performance.now() - startedAt;
    expect(elapsedBeforeFirstProgress).toBeLessThan(1_500);
    expect(first!.data).toEqual({ type: "step_start", sessionID: "slow-1" });
    expect(JSON.stringify(first!.data)).not.toContain("text");

    const record = await run;
    expect(record.status).toBe("passed");
    expect(record.finalText).toBe("Complete.");
    expect(record.executionObservation.sessionId).toBe("slow-1");
    expect(record.usage).toEqual({ inputTokens: 5, outputTokens: 3, totalTokens: 8, cachedInputTokens: 0 });
    expect(observed.filter((event) => event.type === "opencode.cli.progress")).toHaveLength(3);
    expect(observed.filter((event) => event.type === "opencode.cli.event")).toHaveLength(3);
    expect(executionRawSteps(record).filter((step) => rawStepText(step) === "Complete.")).toHaveLength(1);

    const jsonlPath = liveTrace.availablePath();
    expect(jsonlPath).toBeDefined();
    const jsonl = await readFile(jsonlPath!, "utf8");
    const progressLines = jsonl.split("\n").filter((line) => line.includes('"opencode.cli.progress"'));
    expect(progressLines.length).toBeGreaterThanOrEqual(1);
    for (const line of progressLines) {
      const event = JSON.parse(line) as TraceEvent;
      const keys = Object.keys(event.data as Record<string, unknown>);
      expect(keys.every((key) => ["type", "sessionID", "stepId", "tool"].includes(key))).toBe(true);
      expect(keys).not.toContain("part");
      expect(keys).not.toContain("text");
      expect(keys).not.toContain("reasoning");
      expect(keys).not.toContain("input");
      expect(keys).not.toContain("output");
    }
  });

  test("buffers stdout lines spanning chunk boundaries and parses each line exactly once", async () => {
    const root = await fixture();
    const executable = await fixtureExecutable(root, [
      `printf '%s' '{"type":"step_start","sessionID":"chunked-1","part":{"note":"ignored"'`,
      "sleep 0.3",
      `printf '%s\\n' '}}'`,
      `printf '%s\\n' '{"type":"text","sessionID":"chunked-1","part":{"text":"Chunked."}}'`,
      `printf '%s' '{"type":"step_finish","sessionID":"chunked-1","part":{"reason":"stop","cost":0.02,"tokens":{"input":2,"output":4,"total":6,"cache":{"read":1}}}}'`,
    ]);
    const observed: TraceEvent[] = [];
    const record = await runCell(cellInput(root), realDriver(root, executable), {
      onTrace: (event) => observed.push(event),
    });

    expect(record.status).toBe("passed");
    expect(record.finalText).toBe("Chunked.");
    expect(record.usage).toEqual({ inputTokens: 2, outputTokens: 4, totalTokens: 6, cachedInputTokens: 1 });
    expect(observed.find((event) => event.type === "opencode.cli.progress")?.data).toEqual({
      type: "step_start",
      sessionID: "chunked-1",
    });
    expect(observed.filter((event) => event.type === "opencode.cli.progress")).toHaveLength(3);
    expect(observed.filter((event) => event.type === "opencode.cli.event")).toHaveLength(3);
    expect(executionRawSteps(record).filter((step) => rawStepText(step) === "Chunked.")).toHaveLength(1);
  });

  test("retains bounded unparsed evidence and usage when a live child emits malformed lines", async () => {
    const root = await fixture();
    const executable = await fixtureExecutable(root, [
      `printf '%s\\n' '{"type":"step_start","sessionID":"u-1","part":{}}'`,
      `printf '%s\\n' '[1,2,3]'`,
      `printf '%s\\n' 'abcdefghij'`,
      `printf '%s\\n' '{"type":"step_finish","sessionID":"u-1","part":{"reason":"error","tokens":{"input":1,"output":1,"total":2,"cache":{"read":0}}}}'`,
    ]);
    const input = cellInput(root);
    input.budget.maxCommandOutputBytes = 8;
    const observed: TraceEvent[] = [];
    const record = await runCell(input, realDriver(root, executable), {
      onTrace: (event) => observed.push(event),
    });

    expect(record.status).toBe("failed");
    expect(record.error).toBe("OpenCode CLI completed without final stopped-step text");
    expect(record.usage).toEqual({ inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 });
    const unparsedData = observed
      .filter((event) => event.type === "opencode.cli.stdout.unparsed")
      .map((event) => event.data);
    expect(unparsedData).toContainEqual({ type: "opencode.cli.stdout.unparsed", line: "[1,2,3]" });
    expect(unparsedData).toContainEqual({ type: "opencode.cli.stdout.unparsed", line: "a" });
    expect(observed.filter((event) => event.type === "opencode.cli.progress")).toHaveLength(2);
  });

  test("nonzero exit of a live child retains observed usage", async () => {
    const root = await fixture();
    const executable = await fixtureExecutable(root, [
      `printf '%s\\n' '{"type":"step_finish","sessionID":"nz-1","part":{"reason":"error","cost":0.2,"tokens":{"input":13,"output":2,"total":15,"cache":{"read":3}}}}'`,
      `printf '%s' 'provider rejected request' >&2`,
    ], 19);
    const observed: TraceEvent[] = [];
    const record = await runCell(cellInput(root), realDriver(root, executable), {
      onTrace: (event) => observed.push(event),
    });

    expect(record.status).toBe("failed");
    expect(record.error).toBe("OpenCode CLI exited with code 19: provider rejected request");
    expect(record.usage).toEqual({ inputTokens: 13, outputTokens: 2, totalTokens: 15, cachedInputTokens: 3 });
    expect(observed.filter((event) => event.type === "opencode.cli.progress")).toHaveLength(1);
  });
});

function openCodeDriver(
  root: string,
  processAdapter: OpenCodeCliProcessAdapter,
  options: { reasoningEffort?: string; sessionId?: string; timeoutMs?: number } = {},
): OpenCodeCliDriver {
  return new OpenCodeCliDriver({
    executable: "/fixture/bin/opencode", model: "anthropic/fixture",
    workspacePolicy: { select: () => root }, processAdapter, ...options,
  });
}

function fixtureProcess(
  handler: (request: OpenCodeCliProcessRequest) => Promise<OpenCodeCliProcessResult>,
): OpenCodeCliProcessAdapter {
  return { run: handler };
}

function cellInput(root: string): CellInput {
  return {
    id: "opencode-fixture", intent: "Review the implementation.",
    workspace: { root, readPaths: ["."], writePaths: ["."], excludePaths: [], allowedCommands: ["bun test"] },
    instructions: ["Follow the fixture instructions."], capabilities: [], context: [{
      id: "evidence", title: "Fixture evidence", content: "The event stream is authoritative.", sources: [],
    }], capabilitiesRequired: [], acceptance: ["Return a concise result."],
    budget: { maxSteps: 3, maxDurationMs: 2_000, maxCommandOutputBytes: 4_000 },
  };
}

function context(root: string, signal = new AbortController().signal): {
  value: DriverContext;
  usages: CellUsage[];
  emitted: Array<{ type: string; data: unknown }>;
} {
  const usages: CellUsage[] = [];
  const emitted: Array<{ type: string; data: unknown }> = [];
  return {
    value: {
      workspace: { root } as DriverContext["workspace"], signal, liveObservation: true,
      observeUsage: (usage) => usages.push(usage), emit: (type, data) => emitted.push({ type, data }),
    },
    usages,
    emitted,
  };
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "work-cell-opencode-driver-test-"));
  temporaryRoots.push(root);
  return root;
}

function event(type: string, part: Record<string, unknown>, sessionID = "session-1"): unknown {
  return { type, sessionID, part };
}

function success(): OpenCodeCliProcessResult {
  return {
    exitCode: 0,
    stdout: jsonLines(
      event("step_start", {}), event("text", { text: "Complete." }),
      event("step_finish", { reason: "stop", cost: 0, tokens: { input: 1, output: 1, total: 2, cache: { read: 0 } } }),
    ),
    stderr: "", durationMs: 3,
  };
}

function jsonLines(...events: unknown[]): string {
  return `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
}

function realDriver(root: string, executable: string): OpenCodeCliDriver {
  return new OpenCodeCliDriver({
    executable,
    model: "anthropic/fixture",
    workspacePolicy: { select: () => root },
    processAdapter: new BunOpenCodeCliProcessAdapter(),
  });
}

async function fixtureExecutable(root: string, scriptLines: string[], exitCode = 0): Promise<string> {
  const executable = join(root, "fixture-opencode");
  await writeFile(executable, `${["#!/bin/sh", ...scriptLines, `exit ${exitCode}`].join("\n")}\n`, {
    mode: 0o755,
  });
  return executable;
}

async function waitFor<T>(probe: () => T | undefined, timeoutMs: number): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const found = probe();
    if (found !== undefined) return found;
    if (Date.now() > deadline) throw new Error(`waitFor timed out after ${timeoutMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function rawStepText(step: unknown): string | undefined {
  if (!step || typeof step !== "object") return undefined;
  const record = step as Record<string, unknown>;
  const part = record.part;
  return part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string"
    ? (part as Record<string, unknown>).text as string
    : undefined;
}

function executionRawSteps(record: CellRunRecord): unknown[] {
  const phase = record.rawSteps.find((entry) => (entry as Record<string, unknown>).phase === "execution");
  const steps = phase && typeof phase === "object"
    ? (phase as Record<string, unknown>).steps
    : undefined;
  return Array.isArray(steps) ? steps as unknown[] : [];
}
