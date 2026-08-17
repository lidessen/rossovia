import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CellInputSchema, type CellInput } from "../src/contracts";
import type { DriverContext } from "../src/driver";
import { Workspace, createLocalHost } from "../src/workspace";
import { TaskStore } from "../src/task-store";
import { runCell } from "../src/run-cell";
import {
  createHostTools,
  EXECUTION_TOOL_NAMES,
} from "../src/integrations/ai-sdk/host-tools";
import { createWorkspaceEditTool } from "../src/integrations/ai-sdk/workspace-edit";
import { HarnessAgent } from "@ai-sdk/harness/agent";
import { createPi, type PiHarnessSettings } from "@ai-sdk/harness-pi";
import {
  createPiInMemorySandbox,
  PI_HARNESS_DRIVER_ADAPTER,
  PiHarnessCellDriver,
} from "../src/integrations/ai-sdk/pi-harness-driver";
import type {
  HarnessV1,
  HarnessV1PromptControl,
  HarnessV1PromptTurnOptions,
  HarnessV1SandboxProvider,
} from "@ai-sdk/harness";
import type { LanguageModelV3GenerateResult } from "@ai-sdk/provider";
import { MockLanguageModelV3 } from "ai/test";
import type { ToolSet } from "ai";

const temporaryRoots: string[] = [];
const V4_USAGE = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};
const STOP_REASON = { unified: "stop" as const, raw: "stop" };

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

interface Fixture {
  root: string;
  workspace: Workspace;
  input: CellInput;
}

async function fixture(options: {
  readPaths?: string[];
  writePaths?: string[];
  allowedCommands?: string[];
} = {}): Promise<Fixture> {
  const root = mkdtempSync(join(tmpdir(), "work-cell-host-tools-"));
  temporaryRoots.push(root);
  const input = CellInputSchema.parse({
    id: "host-tools-fixture",
    intent: "Prove the host-executed tool surface.",
    workspace: {
      root,
      readPaths: options.readPaths ?? ["."],
      writePaths: options.writePaths ?? ["."],
      excludePaths: [],
      allowedCommands: options.allowedCommands ?? [],
    },
    instructions: ["Use only the granted tools."],
    capabilities: ["coding"],
    context: [],
    capabilitiesRequired: ["coding"],
    acceptance: ["The tool surface is exact."],
    budget: { maxSteps: 3, maxDurationMs: 30_000, maxCommandOutputBytes: 4_000 },
  });
  const workspace = await Workspace.create(input.workspace, input.budget);
  return { root, workspace, input };
}

function driverContext(workspace: Workspace, extra: Partial<DriverContext> = {}): DriverContext {
  return {
    workspace,
    signal: new AbortController().signal,
    liveObservation: false,
    observeUsage() {},
    emit() {},
    ...extra,
  };
}

function scriptedHarness(script: (input: {
  emit(event: unknown): void;
  abortSignal?: AbortSignal;
  waitForToolResult(count: number): Promise<void>;
}) => Promise<void>, toolResults: Array<{ toolCallId: string; output: unknown }> = [], options: {
  /** The harness-resolved model identity the session wrapper reports; the driver must match the requested profile exactly. */
  modelId?: string;
  /** Optional underlying Pi aggregate counters retained when a turn aborts before its final finish event. */
  sessionStats?: {
    tokens: { input: number; output: number; cacheRead: number; cacheWrite: number; total: number };
  };
} = {}): HarnessV1<ToolSet> {
  return {
    specificationVersion: "harness-v1",
    harnessId: "scripted-pi",
    builtinTools: {},
    supportsBuiltinToolFiltering: true,
    doStart: async (start) => ({
      sessionId: start.sessionId,
      isResume: false,
      modelId: options.modelId ?? "deepseek-v4-pro",
      ...(options.sessionStats ? { getSessionStats: () => options.sessionStats } : {}),
      doPromptTurn: (turn: HarnessV1PromptTurnOptions) => {
        const waiters: Array<() => void> = [];
        const waitForToolResult = async (count: number) => {
          if (toolResults.length >= count) return;
          await new Promise<void>((resolve) => waiters.push(resolve));
        };
        const done = script({
          emit: turn.emit as (event: unknown) => void,
          ...(turn.abortSignal ? { abortSignal: turn.abortSignal } : {}),
          waitForToolResult,
        });
        return {
          done,
          submitToolResult: async (
            result: Parameters<HarnessV1PromptControl["submitToolResult"]>[0],
          ) => {
            toolResults.push({ toolCallId: result.toolCallId, output: result.output });
            for (const resolve of waiters.splice(0)) resolve();
          },
        };
      },
      doDestroy: async () => {},
    } as never),
  } as HarnessV1<ToolSet>;
}

/** The Pi built-in tool names that must never be model-visible. */
const PI_BUILTIN_TOOL_NAMES = [
  "read",
  "write",
  "edit",
  "bash",
  "glob",
  "grep",
  "ls",
  "shell",
  "spawn",
  "updateMemory",
];

describe("host-executed tool surface", () => {
  test("the model-visible tool set is exactly the host-owned surface and excludes every Pi built-in", async () => {
    const { workspace, input } = await fixture({ allowedCommands: ["git"] });
    const context = driverContext(workspace);
    const tools = createHostTools({
      input,
      context,
      tasks: TaskStore.fromSeeds(input.tasks, input.id),
      taskToolSet: "manage",
      actionBlocked: () => undefined,
      fullWriteMode: "create-new-only",
    });
    const names = Object.keys(tools).sort();
    const allowed = new Set([...EXECUTION_TOOL_NAMES]);
    for (const name of names) {
      expect(allowed.has(name)).toBeTrue();
    }
    for (const builtin of PI_BUILTIN_TOOL_NAMES) {
      expect(names).not.toContain(builtin);
    }
    expect(names).toEqual([
      "edit_file",
      "list_files",
      "read_file",
      "run_command",
      "task_create",
      "task_get",
      "task_list",
      "task_update",
      "write_file",
    ]);
  });

  test("read-only task authority never exposes task mutation tools", async () => {
    const { workspace, input } = await fixture();
    const tools = createHostTools({
      input,
      context: driverContext(workspace),
      tasks: TaskStore.fromSeeds(input.tasks, input.id),
      taskToolSet: "read-only",
      actionBlocked: () => undefined,
      fullWriteMode: "create-new-only",
    });
    const names = Object.keys(tools);
    expect(names).toContain("task_list");
    expect(names).toContain("task_get");
    expect(names).not.toContain("task_create");
    expect(names).not.toContain("task_update");
  });
});

describe("scope-bound exact batch edit", () => {
  test("applies unique exact replacements atomically in one call", async () => {
    const { root, workspace } = await fixture();
    writeFileSync(join(root, "app.md"), "alpha\nbeta\n");
    const editTool = createWorkspaceEditTool(workspace);
    const result = await editTool.execute(
      "tool-call-1",
      {
        path: "app.md",
        edits: [
          { oldText: "alpha", newText: "first" },
          { oldText: "beta", newText: "second" },
        ],
      },
      new AbortController().signal,
      () => {},
    );
    expect(result).toMatchObject({ details: { firstChangedLine: 1 } });
    expect(readFileSync(join(root, "app.md"), "utf8")).toBe("first\nsecond\n");
  });

  test("an absent exact match fails the whole call with zero mutation", async () => {
    const { root, workspace } = await fixture();
    const original = "alpha\nbeta\n";
    writeFileSync(join(root, "app.md"), original);
    const editTool = createWorkspaceEditTool(workspace);
    await expect(editTool.execute(
      "tool-call-2",
      { path: "app.md", edits: [{ oldText: "missing", newText: "replaced" }] },
      new AbortController().signal,
      () => {},
    )).rejects.toThrow(/exact text/);
    expect(readFileSync(join(root, "app.md"), "utf8")).toBe(original);
  });

  test("a duplicated exact match fails the whole call with zero mutation", async () => {
    const { root, workspace } = await fixture();
    const original = "beta\nbeta\n";
    writeFileSync(join(root, "app.md"), original);
    const editTool = createWorkspaceEditTool(workspace);
    await expect(editTool.execute(
      "tool-call-3",
      { path: "app.md", edits: [{ oldText: "beta", newText: "once" }] },
      new AbortController().signal,
      () => {},
    )).rejects.toThrow(/unique/i);
    expect(readFileSync(join(root, "app.md"), "utf8")).toBe(original);
  });

  test("overlapping matches fail the whole call with zero mutation", async () => {
    const { root, workspace } = await fixture();
    const original = "alpha\nbeta\n";
    writeFileSync(join(root, "app.md"), original);
    const editTool = createWorkspaceEditTool(workspace);
    await expect(editTool.execute(
      "tool-call-4",
      {
        path: "app.md",
        edits: [
          { oldText: "alpha\nbeta", newText: "both" },
          { oldText: "beta", newText: "inside" },
        ],
      },
      new AbortController().signal,
      () => {},
    )).rejects.toThrow(/overlap/i);
    expect(readFileSync(join(root, "app.md"), "utf8")).toBe(original);
  });

  test("a batch with one bad edit is atomic: no sibling edit is written", async () => {
    const { root, workspace } = await fixture();
    const original = "alpha\nbeta\n";
    writeFileSync(join(root, "app.md"), original);
    const editTool = createWorkspaceEditTool(workspace);
    await expect(editTool.execute(
      "tool-call-5",
      {
        path: "app.md",
        edits: [
          { oldText: "alpha", newText: "should-not-land" },
          { oldText: "absent", newText: "poison" },
        ],
      },
      new AbortController().signal,
      () => {},
    )).rejects.toThrow();
    expect(readFileSync(join(root, "app.md"), "utf8")).toBe(original);
  });

  test("an edit target outside the declared write scope is refused without touching the file", async () => {
    const root = mkdtempSync(join(tmpdir(), "work-cell-host-edit-scope-"));
    temporaryRoots.push(root);
    const input = CellInputSchema.parse({
      id: "edit-scope-fixture",
      intent: "Prove the edit boundary.",
      workspace: {
        root,
        readPaths: ["."],
        writePaths: ["docs"],
        excludePaths: [],
        allowedCommands: [],
      },
      instructions: ["Prove the edit boundary."],
      capabilities: [],
      context: [],
      capabilitiesRequired: [],
      acceptance: ["The boundary is exact."],
      budget: { maxSteps: 1, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
    });
    const workspace = await Workspace.create(input.workspace, input.budget);
    writeFileSync(join(root, "outside.md"), "keep me\n");
    const editTool = createWorkspaceEditTool(workspace);
    await expect(editTool.execute(
      "tool-call-6",
      { path: "outside.md", edits: [{ oldText: "keep me", newText: "changed" }] },
      new AbortController().signal,
      () => {},
    )).rejects.toThrow(/outside declared scope/);
    expect(readFileSync(join(root, "outside.md"), "utf8")).toBe("keep me\n");
  });

  test("an edit path escaping the workspace root is refused", async () => {
    const { workspace } = await fixture();
    const editTool = createWorkspaceEditTool(workspace);
    await expect(editTool.execute(
      "tool-call-7",
      { path: "../escape.md", edits: [{ oldText: "x", newText: "y" }] },
      new AbortController().signal,
      () => {},
    )).rejects.toThrow(/escapes workspace/);
  });
});

describe("create-new-only full write", () => {
  test("write_file refuses to overwrite an existing file and leaves its bytes intact", async () => {
    const { root, workspace, input } = await fixture();
    writeFileSync(join(root, "existing.md"), "original\n");
    const tools = createHostTools({
      input,
      context: driverContext(workspace),
      tasks: TaskStore.fromSeeds(input.tasks, input.id),
      taskToolSet: "manage",
      actionBlocked: () => undefined,
      fullWriteMode: "create-new-only",
    });
    await expect(tools.write_file!.execute!(
      { path: "existing.md", content: "replaced\n" },
      { toolCallId: "write-1", messages: [], abortSignal: new AbortController().signal } as never,
    )).rejects.toThrow(/already exists|EEXIST/i);
    expect(readFileSync(join(root, "existing.md"), "utf8")).toBe("original\n");
  });
  test("write_file creates a genuinely new file inside the write scope", async () => {
    const { root, workspace, input } = await fixture();
    const tools = createHostTools({
      input,
      context: driverContext(workspace),
      tasks: TaskStore.fromSeeds(input.tasks, input.id),
      taskToolSet: "manage",
      actionBlocked: () => undefined,
      fullWriteMode: "create-new-only",
    });
    const result = await tools.write_file!.execute!(
      { path: "new.md", content: "fresh\n" },
      { toolCallId: "write-2", messages: [], abortSignal: new AbortController().signal } as never,
    );
    expect(result).toMatchObject({ path: "new.md", characters: 6 });
    expect(readFileSync(join(root, "new.md"), "utf8")).toBe("fresh\n");
  });

  test("the host edit tool is refused when the workspace cannot write", async () => {
    const { workspace, input } = await fixture({ writePaths: [] });
    const tools = createHostTools({
      input,
      context: driverContext(workspace),
      tasks: TaskStore.fromSeeds(input.tasks, input.id),
      taskToolSet: "manage",
      actionBlocked: () => undefined,
      fullWriteMode: "create-new-only",
    });
    expect(Object.keys(tools)).not.toContain("edit_file");
    expect(Object.keys(tools)).not.toContain("write_file");
  });
});

describe("Pi harness driver fail-closed mapping", () => {
  const fakeHarness = { harnessId: "fake-harness" } as unknown as HarnessV1<ToolSet>;
  const fakeSandbox = {} as HarnessV1SandboxProvider;

  test("maps an exact DeepSeek route into the pinned Pi adapter identity", () => {
    const driver = new PiHarnessCellDriver({
      route: [{
        provider: "deepseek",
        credential: { source: "env", name: "DEEPSEEK_API_KEY" },
        model: "deepseek-v4-pro",
      }],
      environment: { DEEPSEEK_API_KEY: "configured" } as NodeJS.ProcessEnv,
      harness: fakeHarness,
      sandbox: fakeSandbox,
    });
    expect(driver.descriptor).toMatchObject({
      adapter: PI_HARNESS_DRIVER_ADAPTER,
      provider: "deepseek",
      model: "deepseek-v4-pro",
    });
  });

  test("maps the selected max reasoning policy to Pi xhigh at construction", () => {
    let settings: PiHarnessSettings | undefined;
    new PiHarnessCellDriver({
      route: [{
        provider: "deepseek",
        credential: { source: "env", name: "DEEPSEEK_API_KEY" },
        model: "deepseek-v4-pro",
      }],
      environment: { DEEPSEEK_API_KEY: "configured" } as NodeJS.ProcessEnv,
      deepSeekInferencePolicy: { thinking: "enabled", reasoningEffort: "max" },
      piHarnessFactory: (observed) => {
        settings = observed;
        return fakeHarness;
      },
      sandbox: fakeSandbox,
    });
    expect(settings?.thinkingLevel).toBe("xhigh");
  });

  test("the real pinned Pi adapter creates and destroys a session in the empty sandbox", async () => {
    const prepared = await createPiInMemorySandbox();
    const agent = new HarnessAgent({
      harness: createPi({
        auth: { customEnv: { DEEPSEEK_API_KEY: "not-used" } },
        model: "deepseek-v4-pro",
        thinkingLevel: "xhigh",
      }),
      sandbox: prepared.sandbox,
      sandboxConfig: prepared.sandboxConfig,
      tools: {},
      activeTools: [] as never[],
      permissionMode: "allow-all",
    });
    const session = await agent.createSession();
    expect(session.sessionId).toBeTruthy();
    expect((session as unknown as { underlyingSession: { modelId?: string } })
      .underlyingSession.modelId).toBe("deepseek-v4-pro");
    await session.destroy();
  });

  test("freezes maxSteps exhaustion before Pi's abort tail and retains aggregate session usage", async () => {
    let emittedAbortTail = false;
    const toolResults: Array<{ toolCallId: string; output: unknown }> = [];
    const harness = scriptedHarness(async ({ emit, abortSignal, waitForToolResult }) => {
      emit({ type: "stream-start", warnings: [] });
      for (let index = 0; index < 2; index += 1) {
        emit({
          type: "tool-call",
          toolCallId: `read-${index}`,
          toolName: "read_file",
          input: JSON.stringify({ path: "notes.md" }),
          providerExecuted: false,
        });
        await waitForToolResult(index + 1);
        // Pi labels tool-continuing inferred steps stop and reports zero
        // per-step usage, so only the activity proves another step would begin.
        emit({
          type: "finish-step",
          finishReason: STOP_REASON,
          usage: {
            inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 0, text: 0, reasoning: 0 },
          },
        });
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      // The pinned Pi adapter emits this inferred finish while abort settles.
      // It is not another accepted provider step and must not enter the trace.
      emittedAbortTail = true;
      emit({
        type: "finish-step",
        finishReason: STOP_REASON,
        usage: {
          inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 0, text: 0, reasoning: 0 },
        },
      });
      if (!abortSignal?.aborted) {
        emit({
          type: "tool-call",
          toolCallId: "read-third",
          toolName: "read_file",
          input: JSON.stringify({ path: "notes.md" }),
          providerExecuted: false,
        });
        await waitForToolResult(3);
      }
    }, toolResults, {
      sessionStats: {
        tokens: { input: 11, output: 5, cacheRead: 3, cacheWrite: 1, total: 20 },
      },
    });
    const { root, workspace, input } = await fixture();
    writeFileSync(join(root, "notes.md"), "note\n");
    input.budget.maxSteps = 2;
    const completedSteps: unknown[] = [];
    const driver = new PiHarnessCellDriver({
      route: [{
        provider: "deepseek",
        credential: { source: "env", name: "DEEPSEEK_API_KEY" },
        model: "deepseek-v4-pro",
      }],
      environment: { DEEPSEEK_API_KEY: "configured" } as NodeJS.ProcessEnv,
      harness,
    });
    await expect(driver.run(input, driverContext(workspace, {
      emit(type, data) {
        if (type === "agent.step.finished") completedSteps.push(data);
      },
    }))).rejects.toMatchObject({
      message: "Work Cell step budget exhausted after 2 steps; no provider step remains",
      usage: { inputTokens: 11, outputTokens: 5, totalTokens: 16, cachedInputTokens: 3 },
    });
    expect(emittedAbortTail).toBeTrue();
    expect(completedSteps).toHaveLength(2);
    expect(toolResults.map((result) => result.toolCallId)).toEqual(["read-0", "read-1"]);
  });

  test("permits a natural terminal response on the final allowed step", async () => {
    const toolResults: Array<{ toolCallId: string; output: unknown }> = [];
    const harness = scriptedHarness(async ({ emit, waitForToolResult }) => {
      emit({ type: "stream-start", warnings: [] });
      for (const [index, toolCallId] of ["read-first", "read-second"].entries()) {
        emit({
          type: "tool-call",
          toolCallId,
          toolName: "read_file",
          input: JSON.stringify({ path: "notes.md" }),
          providerExecuted: false,
        });
        await waitForToolResult(index + 1);
        emit({ type: "finish-step", finishReason: STOP_REASON, usage: V4_USAGE });
      }
      // The final allowed step carries no tool activity: a natural terminal
      // response completes instead of being cut off by the step budget.
      emit({ type: "finish-step", finishReason: STOP_REASON, usage: V4_USAGE });
      emit({
        type: "finish",
        finishReason: STOP_REASON,
        totalUsage: {
          inputTokens: { total: 3, noCache: 3, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 3, text: 3, reasoning: 0 },
        },
      });
    }, toolResults);
    const { root, workspace, input } = await fixture();
    writeFileSync(join(root, "notes.md"), "note\n");
    input.budget.maxSteps = 3;
    const driver = new PiHarnessCellDriver({
      route: [{
        provider: "deepseek",
        credential: { source: "env", name: "DEEPSEEK_API_KEY" },
        model: "deepseek-v4-pro",
      }],
      environment: { DEEPSEEK_API_KEY: "configured" } as NodeJS.ProcessEnv,
      harness,
    });
    const result = await driver.run(input, driverContext(workspace));
    expect(result.usage).toMatchObject({ inputTokens: 3, outputTokens: 3, totalTokens: 6 });
  });

  test("retains an accepted terminal action on the final allowed step without starting another provider call", async () => {
    const toolResults: Array<{ toolCallId: string; output: unknown }> = [];
    let secondStepEmitted = false;
    const harness = scriptedHarness(async ({ emit, abortSignal, waitForToolResult }) => {
      emit({ type: "stream-start", warnings: [] });
      emit({
        type: "tool-call",
        toolCallId: "terminal-final-step",
        toolName: "finish_work",
        input: "{}",
        providerExecuted: false,
      });
      await waitForToolResult(1);
      emit({ type: "finish-step", finishReason: STOP_REASON, usage: V4_USAGE });
      // The accepted terminal action sat on the single final allowed step;
      // the step budget must freeze the turn before any further model step
      // (such as a final text response) can begin. The turn abort signal is
      // the exact consumer-owned acknowledgment: it turns aborted only after
      // the async stream consumer processed the finish-step chunk above and
      // onStepFinished consumed the final allowance unit, so awaiting it is
      // an observable barrier instead of an immediate timing assumption. A
      // bounded deadline only guards against a production regression that
      // never aborts; it then still attempts the forbidden second step so
      // secondStepEmitted fails visibly rather than hanging the suite.
      const stepProcessedByConsumer = await new Promise<boolean>((resolve) => {
        if (abortSignal?.aborted) {
          resolve(true);
          return;
        }
        abortSignal?.addEventListener("abort", () => resolve(true), { once: true });
        const deadline = setTimeout(() => resolve(false), 1_000);
        abortSignal?.addEventListener("abort", () => clearTimeout(deadline), { once: true });
      });
      if (!stepProcessedByConsumer) {
        secondStepEmitted = true;
        emit({ type: "finish-step", finishReason: STOP_REASON, usage: V4_USAGE });
        emit({
          type: "finish",
          finishReason: STOP_REASON,
          totalUsage: {
            inputTokens: { total: 2, noCache: 2, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 2, text: 2, reasoning: 0 },
          },
        });
      }
    }, toolResults);
    const { input } = await fixture();
    input.terminalTools = [{
      name: "finish_work",
      description: "Finish the bounded work.",
      inputSchema: { type: "object", additionalProperties: false },
    }];
    input.budget.maxSteps = 1;
    const driver = new PiHarnessCellDriver({
      route: [{
        provider: "deepseek",
        credential: { source: "env", name: "DEEPSEEK_API_KEY" },
        model: "deepseek-v4-pro",
      }],
      environment: { DEEPSEEK_API_KEY: "configured" } as NodeJS.ProcessEnv,
      harness,
    });

    // The full runCell path: maxSteps=1 is the exact bound for a terminal-only
    // Cell. The single allowed step performs the accepted terminal action, the
    // turn freezes there, and the Cell passes without a separate final-output
    // step or any additional provider call.
    const record = await runCell(input, driver, { host: createLocalHost() });
    // Exactly one accepted terminal call and one finished provider step; the
    // forbidden second provider/model step was never even attempted, and the
    // Cell still passes with the exact observed usage of the single step.
    expect(secondStepEmitted).toBe(false);
    expect(record.status).toBe("passed");
    expect(record.verification.terminal).toEqual({
      passed: true,
      required: ["finish_work"],
      called: ["finish_work"],
    });
    expect(record.trace.filter((event) => event.type === "terminal.tool.called")).toHaveLength(1);
    expect(record.finalText).toContain("Terminal contract satisfied during execution through finish_work");
    expect(record.trace.filter((event) => event.type === "agent.step.finished")).toHaveLength(1);
    expect(record.usage).toEqual({ inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 });
    expect(record.error).toBeUndefined();
  });

  test("a stream without a maxSteps policy crosses twenty tool steps and completes normally", async () => {
    const toolStepCount = 22;
    const toolResults: Array<{ toolCallId: string; output: unknown }> = [];
    const harness = scriptedHarness(async ({ emit, waitForToolResult }) => {
      emit({ type: "stream-start", warnings: [] });
      for (let index = 0; index < toolStepCount; index += 1) {
        emit({
          type: "tool-call",
          toolCallId: `read-${index}`,
          toolName: "read_file",
          input: JSON.stringify({ path: "notes.md" }),
          providerExecuted: false,
        });
        await waitForToolResult(index + 1);
        emit({ type: "finish-step", finishReason: STOP_REASON, usage: V4_USAGE });
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      // A tool-free terminal step completes naturally: no step-count policy
      // exists to freeze or abort it, and no budget decision point occurs.
      emit({ type: "finish-step", finishReason: STOP_REASON, usage: V4_USAGE });
      emit({
        type: "finish",
        finishReason: STOP_REASON,
        totalUsage: {
          inputTokens: { total: toolStepCount + 1, noCache: toolStepCount + 1, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: toolStepCount + 1, text: toolStepCount + 1, reasoning: 0 },
        },
      });
    }, toolResults);
    const { root, input } = await fixture();
    writeFileSync(join(root, "notes.md"), "note\n");
    // An omitted maxSteps means no step-count stop condition at all; the
    // production driver must not substitute a hidden 20-step default.
    delete input.budget.maxSteps;
    const driver = new PiHarnessCellDriver({
      route: [{
        provider: "deepseek",
        credential: { source: "env", name: "DEEPSEEK_API_KEY" },
        model: "deepseek-v4-pro",
      }],
      environment: { DEEPSEEK_API_KEY: "configured" } as NodeJS.ProcessEnv,
      harness,
    });

    // The full runCell path: the recorded terminal is normal (passed), the
    // immutable input retains no maxSteps, and every tool step completes.
    const record = await runCell(input, driver, { host: createLocalHost() });
    expect(record.status).toBe("passed");
    expect(record.input.budget.maxSteps).toBeUndefined();
    expect(record.trace.filter((event) => event.type === "agent.step.finished"))
      .toHaveLength(toolStepCount + 1);
    expect(record.usage).toMatchObject({
      inputTokens: toolStepCount + 1,
      outputTokens: toolStepCount + 1,
      totalTokens: 2 * (toolStepCount + 1),
    });
    expect(toolResults.map((entry) => entry.toolCallId)).toHaveLength(toolStepCount);
  });

  test("a terminal tool closes the action phase before a later edit call", async () => {
    const toolResults: Array<{ toolCallId: string; output: unknown }> = [];
    const harness = scriptedHarness(async ({ emit, waitForToolResult }) => {
      emit({ type: "stream-start", warnings: [] });
      emit({
        type: "tool-call",
        toolCallId: "terminal-call",
        toolName: "finish_work",
        input: "{}",
        providerExecuted: false,
      });
      await waitForToolResult(1);
      emit({ type: "finish-step", finishReason: STOP_REASON, usage: V4_USAGE });
      emit({
        type: "tool-call",
        toolCallId: "edit-after-terminal",
        toolName: "edit_file",
        input: JSON.stringify({
          edits: [{ path: "kept.txt", oldText: "kept", newText: "changed" }],
        }),
        providerExecuted: false,
      });
      await waitForToolResult(2);
      emit({ type: "finish-step", finishReason: STOP_REASON, usage: V4_USAGE });
      emit({
        type: "finish",
        finishReason: STOP_REASON,
        totalUsage: {
          inputTokens: { total: 2, noCache: 2, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 2, text: 2, reasoning: 0 },
        },
      });
    }, toolResults);
    const { root, workspace, input } = await fixture();
    writeFileSync(join(root, "kept.txt"), "kept");
    input.terminalTools = [{
      name: "finish_work",
      description: "Finish the bounded work.",
      inputSchema: { type: "object", additionalProperties: false },
    }];
    const driver = new PiHarnessCellDriver({
      route: [{
        provider: "deepseek",
        credential: { source: "env", name: "DEEPSEEK_API_KEY" },
        model: "deepseek-v4-pro",
      }],
      environment: { DEEPSEEK_API_KEY: "configured" } as NodeJS.ProcessEnv,
      harness,
    });
    const result = await driver.run(input, driverContext(workspace));
    expect(result.terminalToolsCalled).toEqual(["finish_work"]);
    expect(readFileSync(join(root, "kept.txt"), "utf8")).toBe("kept");
    expect(toolResults[1]?.output).toMatchObject({ accepted: false });
  });

  test("a post-stream terminal failure retains aggregate usage without double counting steps", async () => {
    const toolResults: Array<{ toolCallId: string; output: unknown }> = [];
    const harness = scriptedHarness(async ({ emit, waitForToolResult }) => {
      emit({ type: "stream-start", warnings: [] });
      for (const [index, toolCallId] of ["terminal-one", "terminal-two"].entries()) {
        emit({
          type: "tool-call",
          toolCallId,
          toolName: "finish_work",
          input: "{}",
          providerExecuted: false,
        });
        await waitForToolResult(index + 1);
        emit({ type: "finish-step", finishReason: STOP_REASON, usage: V4_USAGE });
      }
      emit({
        type: "finish",
        finishReason: STOP_REASON,
        totalUsage: {
          inputTokens: { total: 2, noCache: 2, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 2, text: 2, reasoning: 0 },
        },
      });
    }, toolResults);
    const { workspace, input } = await fixture();
    input.terminalTools = [{
      name: "finish_work",
      description: "Finish the bounded work.",
      inputSchema: { type: "object", additionalProperties: false },
    }];
    const driver = new PiHarnessCellDriver({
      route: [{
        provider: "deepseek",
        credential: { source: "env", name: "DEEPSEEK_API_KEY" },
        model: "deepseek-v4-pro",
      }],
      environment: { DEEPSEEK_API_KEY: "configured" } as NodeJS.ProcessEnv,
      harness,
    });
    await expect(driver.run(input, driverContext(workspace))).rejects.toMatchObject({
      message: "expected exactly one terminal tool call; received finish_work, finish_work",
      usage: { inputTokens: 2, outputTokens: 2, totalTokens: 4, cachedInputTokens: 0 },
    });
  });

  test("refuses a non-DeepSeek provider instead of accepting an adapter default", () => {
    expect(() => new PiHarnessCellDriver({
      route: [{
        provider: "kimi-coding",
        credential: { source: "env", name: "KIMI_API_KEY" },
        model: "kimi-k2.7-code",
      }],
      environment: { KIMI_API_KEY: "configured" } as NodeJS.ProcessEnv,
      harness: fakeHarness,
      sandbox: fakeSandbox,
    })).toThrow("cannot serve provider kimi-coding");
  });

  test("refuses a multi-provider route instead of silently selecting one", () => {
    expect(() => new PiHarnessCellDriver({
      route: [
        {
          provider: "deepseek",
          credential: { source: "env", name: "DEEPSEEK_API_KEY" },
          model: "deepseek-v4-flash",
        },
        {
          provider: "opencode-go",
          credential: { source: "env", name: "OPENCODE_API_KEY" },
          model: "kimi-k2.7-code",
        },
      ],
      environment: {
        DEEPSEEK_API_KEY: "configured",
        OPENCODE_API_KEY: "configured",
      } as NodeJS.ProcessEnv,
      harness: fakeHarness,
      sandbox: fakeSandbox,
    })).toThrow("serves exactly one provider/model per run");
  });

  test("a missing DeepSeek credential fails closed at driver construction", () => {
    expect(() => new PiHarnessCellDriver({
      route: [{
        provider: "deepseek",
        credential: { source: "env", name: "DEEPSEEK_API_KEY" },
        model: "deepseek-v4-flash",
      }],
      environment: {} as NodeJS.ProcessEnv,
      harness: fakeHarness,
      sandbox: fakeSandbox,
    })).toThrow(/DEEPSEEK_API_KEY/);
  });

  test("refuses a run whose harness-resolved model differs from the requested execution profile", async () => {
    const harness = scriptedHarness(async ({ emit }) => {
      emit({ type: "stream-start", warnings: [] });
    }, [], { modelId: "deepseek-v4-flash" });
    const { workspace, input } = await fixture();
    const driver = new PiHarnessCellDriver({
      route: [{
        provider: "deepseek",
        credential: { source: "env", name: "DEEPSEEK_API_KEY" },
        model: "deepseek-v4-pro",
      }],
      environment: { DEEPSEEK_API_KEY: "configured" } as NodeJS.ProcessEnv,
      harness,
    });

    await expect(driver.run(input, driverContext(workspace))).rejects.toThrow(
      "the Pi harness resolved model deepseek-v4-flash but the worker execution "
      + "profile requires deepseek-v4-pro; refusing the mismatched adapter default",
    );
  });
});

describe("Pi harness structured settlement shares the explicit step allowance", () => {
  const settlementFixture = async () => {
    const { workspace, input } = await fixture();
    input.outputSchema = {
      type: "object",
      properties: { decision: { type: "string", enum: ["P04"] } },
      required: ["decision"],
      additionalProperties: false,
    };
    input.budget.maxSteps = 2;
    return { workspace, input };
  };

  const oneStepHarness = () => scriptedHarness(async ({ emit }) => {
    emit({ type: "stream-start", warnings: [] });
    emit({ type: "finish-step", finishReason: STOP_REASON, usage: V4_USAGE });
    emit({
      type: "finish",
      finishReason: STOP_REASON,
      totalUsage: {
        inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 1, text: 1, reasoning: 0 },
      },
    });
  }, []);

  const deepSeekPiDriver = (harness: HarnessV1<ToolSet>) => new PiHarnessCellDriver({
    route: [{
      provider: "deepseek",
      credential: { source: "env", name: "DEEPSEEK_API_KEY" },
      model: "deepseek-v4-pro",
    }],
    environment: { DEEPSEEK_API_KEY: "configured" } as NodeJS.ProcessEnv,
    harness,
  });

  test("one remaining step permits at most one settlement attempt and total steps never exceed maxSteps", async () => {
    let settlementCalls = 0;
    const settlementModel = new MockLanguageModelV3({
      doGenerate: async () => {
        settlementCalls += 1;
        return {
          content: [{ type: "text", text: "Not a settlement tool call." }],
          finishReason: { unified: "stop", raw: "stop" },
          usage: V4_USAGE,
          warnings: [],
        };
      },
    });
    const { workspace, input } = await settlementFixture();
    const driver = deepSeekPiDriver(oneStepHarness());
    Object.defineProperty(driver, "model", { value: settlementModel });

    await expect(driver.run(input, driverContext(workspace))).rejects.toMatchObject({
      message: expect.stringContaining("Work Cell step budget exhausted"),
    });
    // The main harness turn consumed one step; the single remaining step
    // allowed exactly one settlement attempt, never a second one.
    expect(settlementCalls).toBe(1);
  });

  test("structured settlement completes inside the shared maxSteps allowance", async () => {
    let settlementCalls = 0;
    const settlementModel = new MockLanguageModelV3({
      doGenerate: async () => {
        settlementCalls += 1;
        return {
          content: [{
            type: "tool-call",
            toolCallId: "settle-pi-output",
            toolName: "emit_structured_output",
            input: JSON.stringify({ decision: "P04" }),
          }],
          finishReason: { unified: "tool-calls", raw: "tool-calls" },
          usage: V4_USAGE,
          warnings: [],
        };
      },
    });
    const { workspace, input } = await settlementFixture();
    const driver = deepSeekPiDriver(oneStepHarness());
    Object.defineProperty(driver, "model", { value: settlementModel });

    const result = await driver.run(input, driverContext(workspace));
    expect(result.output).toEqual({ decision: "P04" });
    expect(settlementCalls).toBe(1);
  });

  test("an accepted structured output arriving after caller cancellation never emits settlement completion after the Cell final", async () => {
    let settlementCalls = 0;
    const controller = new AbortController();
    const settlementModel = new MockLanguageModelV3({
      doGenerate: async () => {
        settlementCalls += 1;
        // The settlement provider call stays in flight; the caller aborts
        // and the provider still completes the step with a valid
        // emit_structured_output tool call. The tool execute assigns the
        // accepted output, so the shared helper resolves through every
        // output-undefined and catch guard; the Pi driver must not emit
        // structured.settlement.finished after runCell already emitted the
        // immutable Cell final with the original caller reason. The
        // cancellation is queued as a macrotask only after the settlement
        // step is really in flight, never fired synchronously inside the
        // provider callback.
        return new Promise<LanguageModelV3GenerateResult>((resolve) => {
          setImmediate(() => {
            controller.abort(new Error("caller cancelled the in-flight settlement"));
            resolve({
              content: [{
                type: "tool-call",
                toolCallId: "settle-pi-after-abort",
                toolName: "emit_structured_output",
                input: JSON.stringify({ decision: "P04" }),
              }],
              finishReason: { unified: "tool-calls", raw: "tool-calls" },
              usage: V4_USAGE,
              warnings: [],
            });
          });
        });
      },
    });
    const { input } = await settlementFixture();
    const driver = deepSeekPiDriver(oneStepHarness());
    Object.defineProperty(driver, "model", { value: settlementModel });
    const observed: Array<{ type: string; data: unknown }> = [];

    const record = await runCell(input, driver, {
      host: createLocalHost(),
      // The caller cancellation is part of the Cell envelope under test: the
      // same controller.signal aborts runWithSignal, so the accepted-output
      // completion is observed as a post-abort provider completion instead
      // of an ordinary successful settlement.
      signal: controller.signal,
      onTrace: (event) => observed.push({ type: event.type, data: event.data }),
    });

    expect(record.status).toBe("cancelled");
    expect(record.error).toBe("caller cancelled the in-flight settlement");
    expect(record.error).not.toContain("step budget exhausted");
    // Exactly one main harness step and one settlement provider call ran; no
    // further settlement attempt ever starts.
    expect(settlementCalls).toBe(1);
    // The accepted output existed, but the already-finalized Cell standing
    // never emits a settlement completion: only the started event appears.
    expect(record.trace.filter((event) => event.type.startsWith("structured.settlement"))
      .map((event) => event.type)).toEqual(["structured.settlement.started"]);
    // Both the retained trace and the live-observed sequence end at the
    // immutable Cell final and nothing follows it.
    expect(record.trace.at(-1)?.type).toBe("cell.finished");
    expect(observed.at(-1)?.type).toBe("cell.finished");
    const finishedIndex = record.trace.findIndex((event) => event.type === "cell.finished");
    expect(record.trace.slice(finishedIndex + 1)).toEqual([]);
    const observedFinishedIndex = observed.findIndex((event) => event.type === "cell.finished");
    expect(observed.slice(observedFinishedIndex + 1)).toEqual([]);
    // Deterministic macrotask barriers for the suspended settlement
    // continuation (accepted output -> Pi driver completion emission) to
    // settle: the returned and observed bytes stay byte-identical and the
    // caller reason stays causal.
    const traceBytesAtReturn = JSON.stringify(record.trace);
    const observedBytesAtReturn = JSON.stringify(observed);
    await new Promise<void>((resolve) => setImmediate(resolve));
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(JSON.stringify(record.trace)).toBe(traceBytesAtReturn);
    expect(JSON.stringify(observed)).toBe(observedBytesAtReturn);
    expect(record.error).toBe("caller cancelled the in-flight settlement");
    expect(settlementCalls).toBe(1);
  });
});

describe("Pi harness immediate parallel host tools (pinned adapter registration race)", () => {
  interface RaceObserver {
    droppedToolCallIds: string[];
    submittedToolCallIds: string[];
  }

  /**
   * A deterministic model of the pinned harness-pi race: the tool-call events
   * reach the agent before the next-turn registration barrier installs the
   * pending tool-result registration. Submissions arriving before the barrier
   * (armed synchronously with the emitted tool calls) are dropped, exactly
   * like the old adapter; when any result was dropped the turn then fails
   * boundedly instead of hanging forever.
   */
  function racyRegistrationHarness(options: {
    toolCalls: Array<{ toolCallId: string; toolName: string; input: unknown }>;
    observer: RaceObserver;
  }): HarnessV1<ToolSet> {
    return {
      specificationVersion: "harness-v1",
      harnessId: "racy-pi",
      builtinTools: {},
      supportsBuiltinToolFiltering: true,
      doStart: async (start) => ({
        sessionId: start.sessionId,
        isResume: false,
        modelId: "deepseek-v4-pro",
        doPromptTurn: (turn: HarnessV1PromptTurnOptions) => {
          let registered = false;
          let resolveAllResults: (() => void) | undefined;
          let rejectAllResults: ((error: Error) => void) | undefined;
          const allResults = new Promise<void>((resolve, reject) => {
            resolveAllResults = resolve;
            rejectAllResults = reject;
          });
          const done = (async () => {
            turn.emit({ type: "stream-start", warnings: [] });
            for (const call of options.toolCalls) {
              turn.emit({
                type: "tool-call",
                toolCallId: call.toolCallId,
                toolName: call.toolName,
                input: typeof call.input === "string" ? call.input : JSON.stringify(call.input),
                providerExecuted: false,
              });
            }
            // The next-turn registration barrier: pendingToolResults is
            // installed only after this macrotask, as in the pinned adapter.
            await new Promise<void>((resolve) => setImmediate(resolve));
            registered = true;
            if (options.observer.droppedToolCallIds.length > 0) {
              rejectAllResults?.(new Error(
                `pinned adapter race: ${options.observer.droppedToolCallIds.length} tool result(s) `
                + "dropped before the next-turn registration barrier",
              ));
            }
            await allResults;
            turn.emit({ type: "finish-step", finishReason: STOP_REASON, usage: V4_USAGE });
            turn.emit({
              type: "finish",
              finishReason: STOP_REASON,
              totalUsage: {
                inputTokens: { total: 4, noCache: 4, cacheRead: 0, cacheWrite: 0 },
                outputTokens: { total: 4, text: 4, reasoning: 0 },
              },
            });
          })();
          // The turn control is consumed by HarnessAgent; keep the bounded
          // drop rejection from surfacing as an unhandled rejection when the
          // agent instead hangs on the missing tool result.
          void done.catch(() => {});
          return {
            done,
            submitToolResult: async (
              result: Parameters<HarnessV1PromptControl["submitToolResult"]>[0],
            ) => {
              if (!registered) {
                // Old pinned adapter behavior: an early result has no pending
                // registration and is dropped.
                options.observer.droppedToolCallIds.push(result.toolCallId);
                return;
              }
              options.observer.submittedToolCallIds.push(result.toolCallId);
              if (options.observer.submittedToolCallIds.length === options.toolCalls.length) {
                resolveAllResults!();
              }
            },
          };
        },
        doDestroy: async () => {},
      } as never),
    } as HarnessV1<ToolSet>;
  }

  const parallelUpdates = () => (["t00", "t01", "t02", "t03"] as const).map((toolCallId, index) => ({
    toolCallId,
    toolName: "task_update",
    input: { taskId: `task-${index + 1}`, status: "completed" },
  }));

  const fourTaskSeeds = () => [
    { subject: "First", description: "First seed" },
    { subject: "Second", description: "Second seed" },
    { subject: "Third", description: "Third seed" },
    { subject: "Fourth", description: "Fourth seed" },
  ];

  test("control: without the handoff, immediately resolving parallel tool results are dropped before the registration barrier and the run hangs or fails boundedly", async () => {
    const observer: RaceObserver = { droppedToolCallIds: [], submittedToolCallIds: [] };
    const harness = racyRegistrationHarness({
      toolCalls: parallelUpdates(),
      observer,
    });
    const { workspace, input } = await fixture();
    input.tasks = fourTaskSeeds();
    const controller = new AbortController();
    const driver = new PiHarnessCellDriver({
      route: [{
        provider: "deepseek",
        credential: { source: "env", name: "DEEPSEEK_API_KEY" },
        model: "deepseek-v4-pro",
      }],
      environment: { DEEPSEEK_API_KEY: "configured" } as NodeJS.ProcessEnv,
      harness,
      // Control: the old adapter boundary without the causal handoff.
      toolEffectHandoff: async () => {},
    });
    const runPromise = driver.run(input, driverContext(workspace, { signal: controller.signal }));
    const outcome = await Promise.race([
      runPromise.then(() => "completed" as const, () => "rejected" as const),
      new Promise<"pending">((resolve) => setTimeout(() => resolve("pending"), 250)),
    ]);
    // The old boundary never completes a run whose tool results were dropped:
    // it either surfaces the drop rejection or hangs on the missing result.
    expect(outcome).not.toBe("completed");
    expect([...observer.droppedToolCallIds].sort()).toEqual(["t00", "t01", "t02", "t03"]);
    expect(observer.submittedToolCallIds).toEqual([]);
    if (outcome === "pending") {
      controller.abort(new Error("control regression bound reached"));
      await expect(runPromise).rejects.toThrow();
    } else {
      await expect(runPromise).rejects.toThrow(/dropped before the next-turn registration barrier/);
    }
  });

  test("the production handoff returns every immediately resolving parallel host tool result exactly once", async () => {
    const observer: RaceObserver = { droppedToolCallIds: [], submittedToolCallIds: [] };
    const harness = racyRegistrationHarness({
      toolCalls: parallelUpdates(),
      observer,
    });
    const { workspace, input } = await fixture();
    input.tasks = fourTaskSeeds();
    // Default production boundary: one causal event-loop handoff before every
    // host tool effect, so no result can outrun the registration barrier.
    const driver = new PiHarnessCellDriver({
      route: [{
        provider: "deepseek",
        credential: { source: "env", name: "DEEPSEEK_API_KEY" },
        model: "deepseek-v4-pro",
      }],
      environment: { DEEPSEEK_API_KEY: "configured" } as NodeJS.ProcessEnv,
      harness,
    });
    const result = await driver.run(input, driverContext(workspace));
    expect(observer.droppedToolCallIds).toEqual([]);
    expect([...observer.submittedToolCallIds].sort()).toEqual(["t00", "t01", "t02", "t03"]);
    for (const toolCallId of ["t00", "t01", "t02", "t03"]) {
      expect(observer.submittedToolCallIds.filter((id) => id === toolCallId)).toHaveLength(1);
    }
    expect(result.tasks).toHaveLength(4);
    for (const task of result.tasks ?? []) {
      expect(task.status).toBe("completed");
    }
  });
});

describe("workspace create/new-file evidence", () => {
  test("createText makes a new file and snapshot diff reports it as added", async () => {
    const { workspace } = await fixture();
    const before = await workspace.snapshot();
    await workspace.createText("brand-new.md", "content\n");
    const after = await workspace.snapshot();
    expect(workspace.diff(before, after).added).toEqual(["brand-new.md"]);
  });

  test("createText refuses to replace an existing file", async () => {
    const { root, workspace } = await fixture();
    writeFileSync(join(root, "kept.md"), "original\n");
    await expect(workspace.createText("kept.md", "replaced\n")).rejects.toThrow();
    expect(readFileSync(join(root, "kept.md"), "utf8")).toBe("original\n");
  });
});
