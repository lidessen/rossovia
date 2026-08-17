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
import { CellInputSchema, type CellInput, type CellRunRecord } from "../src/contracts";
import type { CellDriver, DriverContext } from "../src/driver";
import { Workspace, createLocalHost } from "../src/workspace";
import { TaskStore } from "../src/task-store";
import { runCell } from "../src/run-cell";
import type { CellTool, CellToolExecutionContext, CellToolInputSchema, CellToolSet } from "../src/tool-port";
import {
  createHostTools,
  EXECUTION_TOOL_NAMES,
} from "../src/integrations/ai-sdk/host-tools";
import { AiSdkValidationDriver } from "../src/integrations/ai-sdk/ai-sdk-driver";
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

describe("caller-injected cell tool translation", () => {
  function cellToolCell(root: string, extra: Partial<CellInput> = {}): CellInput {
    return CellInputSchema.parse({
      id: "cell-tool-translation-fixture",
      intent: "Prove the caller-injected cell tool port.",
      workspace: { root, readPaths: [], writePaths: [], excludePaths: [], allowedCommands: [] },
      instructions: ["Use only the injected tool."],
      capabilities: [],
      context: [],
      capabilitiesRequired: [],
      acceptance: ["The injected tool surface behaves exactly."],
      budget: { maxSteps: 4, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
      ...extra,
    });
  }

  function modelResponse(
    content: LanguageModelV3GenerateResult["content"],
    finish: "stop" | "tool-calls",
  ): LanguageModelV3GenerateResult {
    return {
      content,
      finishReason: { unified: finish, raw: finish },
      usage: {
        inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 1, text: 1, reasoning: 0 },
      },
      warnings: [],
    };
  }

  /** The one neutral fixture shared by both adapter halves. */
  function neutralFixtureTool(
    log: Array<{ input: unknown; context: CellToolExecutionContext }>,
  ): CellTool {
    return {
      description: "Return the supplied text reversed.",
      inputSchema: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
        additionalProperties: false,
      },
      async execute(input: unknown, context: CellToolExecutionContext) {
        log.push({ input, context });
        const text = (input as { text?: unknown }).text;
        return { inverted: typeof text === "string" ? [...text].reverse().join("") : "" };
      },
    };
  }

  /**
   * The whole allowed retained surface for a Cell with injected tools: an
   * injected tool name may be retained only in the sorted
   * cell.tools.projected list and as data.name of a cell.tool.settled
   * triplet; an exact injected toolCallId may be retained only as
   * data.toolCallId of a cell.tool.settled triplet; injected input/result
   * values never enter any trace/raw/provider surface. The mechanical check
   * is recursive exact scalar and object-key equality — never substring or
   * regex phrase guessing — so an unrelated trace string (for example a
   * retained runId UUID) can never trip it. The allowed events are first
   * asserted by exact structure, so no sentinel can hide in an unexpected
   * position inside them.
   */
  function expectBoundedInjectedRetention(
    record: CellRunRecord,
    injectedNames: string[],
    injectedCallIds: string[],
    injectedPayloads: string[],
  ): void {
    const coreOwnedTraceTypes = new Set([
      "cell.started",
      "cell.observer.failed",
      "cell.capability_mismatch",
      "cell.prepared",
      "cell.tools.projected",
      "cell.tool.settled",
      "terminal.contract.violation",
      "cell.error",
      "cell.finished",
    ]);
    const nameSet = new Set(injectedNames);
    const callIdSet = new Set(injectedCallIds);
    const payloadSet = new Set(injectedPayloads);
    const fail = (context: string, detail: string): never => {
      throw new Error(`bounded injected retention violated at ${context}: ${detail}`);
    };
    const walk = (value: unknown, context: string): void => {
      if (typeof value === "string") {
        if (payloadSet.has(value)) fail(context, `injected payload retained as an exact scalar: ${value}`);
        if (nameSet.has(value)) {
          fail(context, `injected tool name retained outside cell.tools.projected/cell.tool.settled: ${value}`);
        }
        if (callIdSet.has(value)) {
          fail(context, `injected toolCallId retained outside cell.tool.settled: ${value}`);
        }
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((entry, index) => walk(entry, `${context}[${index}]`));
        return;
      }
      if (value !== null && typeof value === "object") {
        for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
          if (payloadSet.has(key)) fail(context, `injected payload retained as an exact object key: ${key}`);
          if (nameSet.has(key)) fail(context, `injected tool name retained as an exact object key: ${key}`);
          if (callIdSet.has(key)) fail(context, `injected toolCallId retained as an exact object key: ${key}`);
          walk(child, `${context}.${key}`);
        }
      }
    };

    const settledOutcomes = new Set(["fulfilled", "rejected", "refused"]);
    let projectedEvents = 0;
    for (const event of record.trace) {
      // The retained trace boundary is structural, not payload-sensitive:
      // no Integration-originated event may cross it even when a particular
      // fixture happens not to echo an injected sentinel.
      expect(coreOwnedTraceTypes.has(event.type)).toBeTrue();
      if (event.type === "cell.tools.projected") {
        projectedEvents += 1;
        // Exact structure: the retained projection is exactly the sorted
        // granted names and nothing else.
        expect(event.data).toEqual({ tools: [...injectedNames].sort() });
        continue;
      }
      if (event.type === "cell.tool.settled") {
        // Exact structure: per invocation only name, exact toolCallId, and
        // settled outcome — never input, result, or an extra key.
        const data = event.data as Record<string, unknown>;
        expect(Object.keys(data).sort()).toEqual(["name", "outcome", "toolCallId"]);
        expect(nameSet.has(data.name as string)).toBeTrue();
        expect(callIdSet.has(data.toolCallId as string)).toBeTrue();
        expect(settledOutcomes.has(data.outcome as string)).toBeTrue();
        continue;
      }
      walk(event, `trace event ${event.type}`);
    }
    // Exactly one projection per injected-tool run: the bounded names are
    // retained there and nowhere else.
    expect(projectedEvents).toBe(1);

    // The raw/provider surfaces are walked in full: an injected-tool run
    // omits raw provider steps and provider metadata, so no injected name,
    // exact call id, input, or result can cross through them.
    walk(record.rawSteps, "rawSteps");
    walk(record.error, "error");
    expect(record.executionObservation.sessionId).toBeUndefined();
    expect(record.executionObservation.providerFingerprint).toBeUndefined();
    expect(record.executionObservation.providerFingerprintStanding).toEqual({
      standing: "unavailable",
      reason: "an injected-tool run retains no provider metadata; no provider fingerprint could be observed",
    });
    if (record.preparation !== undefined) {
      walk(record.preparation.rawSteps, "preparation.rawSteps");
      walk(record.preparation.evidence, "preparation.evidence");
    }
  }

  /** Exact scalar presence — value equality only, never substring matching. */
  function containsExactScalar(value: unknown, target: string): boolean {
    if (typeof value === "string") return value === target;
    if (Array.isArray(value)) return value.some((entry) => containsExactScalar(entry, target));
    if (value !== null && typeof value === "object") {
      return Object.values(value as Record<string, unknown>)
        .some((entry) => containsExactScalar(entry, target));
    }
    return false;
  }

  const aiSdkDriver = (model: unknown, modelName: string) => {
    const driver = new AiSdkValidationDriver({
      route: [{
        provider: "deepseek" as const,
        credential: { source: "env" as const, name: "DEEPSEEK_TEST_KEY" },
      }],
      deepSeekApiKey: "not-used",
      model: modelName,
    });
    Object.defineProperty(driver, "model", { value: model });
    return driver;
  };

  const deepSeekPiCellToolDriver = (
    harness: HarnessV1<ToolSet>,
    extra: { toolEffectHandoff?: () => Promise<void> } = {},
  ) => new PiHarnessCellDriver({
    route: [{
      provider: "deepseek" as const,
      credential: { source: "env" as const, name: "DEEPSEEK_API_KEY" },
      model: "deepseek-v4-pro",
    }],
    environment: { DEEPSEEK_API_KEY: "configured" } as NodeJS.ProcessEnv,
    harness,
    ...(extra.toolEffectHandoff ? { toolEffectHandoff: extra.toolEffectHandoff } : {}),
  });

  test("one neutral fixture keeps its name, schema, input, exact toolCallId, result, and caller execute through the AI SDK and Pi drivers — with the Pi effect handoff, action closure, and the core-owned retained-evidence projection over settlement and provider-failure sentinels", async () => {
    const { root } = await fixture();
    const input = cellToolCell(root);
    // Long unique explicit input/result/call-id sentinels: every absence
    // check below compares exact values, and short probe strings once
    // produced a stochastic false positive when a retained runId UUID
    // happened to contain "cba" as a substring.
    const INPUT_SENTINEL = "injected-input-never-retained-x7k2m9q4v1b8n3z5c6";
    const RESULT_SENTINEL = [...INPUT_SENTINEL].reverse().join("");
    const AI_SDK_CALL_ID = "injected-tool-call-ai-sdk-a1s2d3f4g5h6j7k8";
    const AI_SDK_WRITE_CALL_ID = "injected-tool-call-ai-sdk-write-q2w3e4r5t6y7u8";
    const PI_CALL_ID = "injected-tool-call-pi-z9x8c7v6b5n4m3a2";
    const PI_LATE_CALL_ID = "injected-tool-call-pi-late-p0o9i8u7y6t5r4e3";

    // AI SDK half: the same fixture translates through the ToolLoopAgent path.
    const aiSdkLog: Array<{ input: unknown; context: CellToolExecutionContext }> = [];
    const writeFileLog: Array<{ input: unknown; context: CellToolExecutionContext }> = [];
    let calls = 0;
    let translatedTools: unknown;
    let finalRequest: unknown;
    const model = new MockLanguageModelV3({
      doGenerate: async (options) => {
        calls += 1;
        if (calls === 1) {
          translatedTools = options.tools;
          return modelResponse([{
            type: "tool-call",
            toolCallId: AI_SDK_CALL_ID,
            toolName: "invert_fixture",
            input: JSON.stringify({ text: INPUT_SENTINEL }),
          }], "tool-calls");
        }
        if (calls === 2) {
          // An injected tool borrowing an inactive built-in name: write_file
          // is a valid name here because the Cell has no write surface, but
          // its arbitrary input must never be interpreted as a host payload.
          return modelResponse([{
            type: "tool-call",
            toolCallId: AI_SDK_WRITE_CALL_ID,
            toolName: "write_file",
            input: JSON.stringify({ path: "docs/leak.md", content: "INJECTED_INPUT_SECRET" }),
          }], "tool-calls");
        }
        finalRequest = options;
        return modelResponse([{ type: "text", text: "The inversion was delivered." }], "stop");
      },
    });
    const aiSdkRecord = await runCell(input, aiSdkDriver(model, "mock-cell-tool-parity"), {
      host: createLocalHost(),
      tools: {
        invert_fixture: neutralFixtureTool(aiSdkLog),
        // An inactive built-in name carried by an injected tool: the Cell has
        // no write surface, so the name is valid, yet the generic
        // agent.tool.* events must never treat its input as a host payload.
        write_file: {
          description: "An injected tool that borrows an inactive built-in name.",
          inputSchema: {
            type: "object",
            properties: { path: { type: "string" }, content: { type: "string" } },
            required: ["path", "content"],
            additionalProperties: false,
          },
          execute: async (writeInput: unknown, context: CellToolExecutionContext) => {
            writeFileLog.push({ input: writeInput, context });
            return { handled: true };
          },
        },
        // Declared and never called; proves the sorted-name projection.
        alpha_marker: {
          description: "Never called; proves the sorted projection.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
          execute: async () => ({ value: "unused" }),
        },
      },
    });

    expect(aiSdkRecord.status).toBe("passed");
    // Sorted authorized names, projected before dispatch.
    expect(aiSdkRecord.trace).toContainEqual(expect.objectContaining({
      type: "cell.tools.projected",
      data: { tools: ["alpha_marker", "invert_fixture", "write_file"] },
    }));
    // The translated model-facing schema is the neutral fixture schema.
    const translated = (translatedTools as Array<{ name: string; inputSchema?: unknown }> | undefined)
      ?.find((candidate) => candidate.name === "invert_fixture");
    expect(translated?.inputSchema).toMatchObject({
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    });
    // Exact input, exact provider toolCallId, and the settled result crossed
    // back into the next provider step verbatim.
    expect(aiSdkLog).toHaveLength(1);
    expect(aiSdkLog[0]?.input).toEqual({ text: INPUT_SENTINEL });
    expect(aiSdkLog[0]?.context).toMatchObject({ toolCallId: AI_SDK_CALL_ID });
    expect(aiSdkLog[0]?.context.signal.aborted).toBe(false);
    // The inverted result crossed back into the next provider step as an
    // exact scalar — value equality only, never substring matching.
    expect(containsExactScalar(finalRequest, RESULT_SENTINEL)).toBe(true);
    // The inactive built-in-name injected tool ran as the injected port: the
    // exact arbitrary input and exact toolCallId crossed to the caller
    // implementation, and its settled bounded evidence is retained.
    expect(writeFileLog).toHaveLength(1);
    expect(writeFileLog[0]?.input).toEqual({ path: "docs/leak.md", content: "INJECTED_INPUT_SECRET" });
    expect(writeFileLog[0]?.context).toMatchObject({ toolCallId: AI_SDK_WRITE_CALL_ID });
    expect(aiSdkRecord.trace).toContainEqual(expect.objectContaining({
      type: "cell.tool.settled",
      data: { name: "invert_fixture", toolCallId: AI_SDK_CALL_ID, outcome: "fulfilled" },
    }));
    expect(aiSdkRecord.trace).toContainEqual(expect.objectContaining({
      type: "cell.tool.settled",
      data: { name: "write_file", toolCallId: AI_SDK_WRITE_CALL_ID, outcome: "fulfilled" },
    }));
    // Injected invocations carry no generic agent.tool.started/finished
    // events: the core-owned projection drops every Integration-originated
    // trace event for an injected-tool run, so the injected write_file's
    // arbitrary input is never interpreted as a host payload target and no
    // callId/duration/outcome duplicate appears. cell.tool.settled stays the
    // sole retained per-invocation evidence.
    expect(aiSdkRecord.trace.filter((event) =>
      event.type === "agent.tool.started" || event.type === "agent.tool.finished")).toEqual([]);
    // The core-owned projection retains no driver step events at all:
    // agent.step.started/finished — including the SDK performance object and
    // its toolExecutionMs map keyed by the exact injected call id — never
    // reach the trace for an injected-tool run.
    expect(aiSdkRecord.trace.some((event) => event.type.startsWith("agent."))).toBe(false);
    // Total retained-evidence redaction: an injected-tool run omits the raw
    // provider steps entirely (they can echo injected inputs or results)
    // while normalized usage and the bounded events remain. The exact
    // scalar/key absence of every injected input/result is asserted by the
    // bounded retention helper below, never by substring matching.
    expect(aiSdkRecord.rawSteps).toEqual([]);
    expect(aiSdkRecord.usage.totalTokens).toBe(6);
    expect(calls).toBe(3);
    // toolExecutionMs travels in the payload sentinels below, so the
    // bounded retention helper also proves that exact key never reaches any
    // trace/raw/provider surface.
    // The whole allowed retained surface, asserted mechanically: no injected
    // name outside cell.tools.projected/cell.tool.settled, no exact injected
    // call id outside cell.tool.settled, and no injected input/result in any
    // trace/raw/provider surface.
    expectBoundedInjectedRetention(
      aiSdkRecord,
      ["alpha_marker", "invert_fixture", "write_file"],
      [AI_SDK_CALL_ID, AI_SDK_WRITE_CALL_ID],
      ["INJECTED_INPUT_SECRET", "docs/leak.md", "handled", "toolExecutionMs", INPUT_SENTINEL, RESULT_SENTINEL],
    );

    // AI SDK outputSchema settlement: the shared settlement helper emits its
    // step evidence through the driver context and echoes the injected
    // sentinels exactly like the counterexample probes (settlement tool-call
    // evidence and provider metadata). The core-owned projection must retain
    // none of it while the semantic structured output and normalized usage
    // stay.
    const SETTLE_OUTPUT_SENTINEL = "settlement-output-sentinel-w5e6r7t8y9u0i1o2p3";
    const SETTLE_CALL_ID = "settlement-tool-call-a1z2x3c4v5b6n7m8";
    let settlementCalls = 0;
    const settlementModel = new MockLanguageModelV3({
      doGenerate: async (options) => {
        settlementCalls += 1;
        if (settlementCalls === 1) {
          return modelResponse([{
            type: "tool-call",
            toolCallId: AI_SDK_CALL_ID,
            toolName: "invert_fixture",
            input: JSON.stringify({ text: INPUT_SENTINEL }),
          }], "tool-calls");
        }
        if (settlementCalls === 2) {
          return modelResponse([{ type: "text", text: "Investigation settled." }], "stop");
        }
        expect((options.tools as Array<{ name: string }> | undefined)
          ?.map((candidate) => candidate.name)).toEqual(["emit_structured_output"]);
        return {
          ...modelResponse([{
            type: "tool-call",
            toolCallId: SETTLE_CALL_ID,
            toolName: "emit_structured_output",
            input: JSON.stringify({ decision: SETTLE_OUTPUT_SENTINEL }),
          }], "tool-calls"),
          providerMetadata: {
            mock: {
              echoedInput: INPUT_SENTINEL,
              echoedResult: RESULT_SENTINEL,
              echoedCallId: SETTLE_CALL_ID,
            },
          },
        };
      },
    });
    const settlementLog: Array<{ input: unknown; context: CellToolExecutionContext }> = [];
    const settlementRecord = await runCell(cellToolCell(root, {
      outputSchema: {
        type: "object",
        properties: { decision: { type: "string" } },
        required: ["decision"],
        additionalProperties: false,
      },
    }), aiSdkDriver(settlementModel, "mock-cell-tool-settlement"), {
      host: createLocalHost(),
      tools: { invert_fixture: neutralFixtureTool(settlementLog) },
    });
    expect(settlementRecord.status).toBe("passed");
    // The semantic structured output survives the projection verbatim; the
    // normalized usage survives too, split across execution and settlement.
    expect(settlementRecord.output).toEqual({ decision: SETTLE_OUTPUT_SENTINEL });
    expect(settlementRecord.usage).toEqual({
      inputTokens: 3,
      outputTokens: 3,
      totalTokens: 6,
      cachedInputTokens: 0,
    });
    expect(settlementRecord.usageByPhase.settlement).toEqual({
      inputTokens: 1,
      outputTokens: 1,
      totalTokens: 2,
      cachedInputTokens: 0,
    });
    // No settlement event (its step evidence carries the echoed sentinels),
    // no agent event, and no raw provider step is retained; the projection
    // then still keeps the bounded settled triplet and the projected names.
    expect(settlementRecord.trace.some((event) => event.type.startsWith("structured.settlement"))).toBe(false);
    expect(settlementRecord.trace.some((event) => event.type.startsWith("agent."))).toBe(false);
    expect(settlementRecord.rawSteps).toEqual([]);
    expect(settlementLog).toHaveLength(1);
    expect(settlementCalls).toBe(3);
    expectBoundedInjectedRetention(
      settlementRecord,
      ["invert_fixture"],
      [AI_SDK_CALL_ID, SETTLE_CALL_ID],
      [INPUT_SENTINEL, RESULT_SENTINEL, SETTLE_OUTPUT_SENTINEL, "echoedInput", "echoedResult", "echoedCallId"],
    );

    // Provider-error sentinel: a provider failure whose message carries the
    // exact injected input sentinel must never retain raw provider text; the
    // Cell projects the caught failure to one stable status-based category
    // while normalized usage and the bounded settled evidence stay.
    let errorCalls = 0;
    const failingModel = new MockLanguageModelV3({
      doGenerate: async () => {
        errorCalls += 1;
        if (errorCalls === 1) {
          return modelResponse([{
            type: "tool-call",
            toolCallId: AI_SDK_CALL_ID,
            toolName: "invert_fixture",
            input: JSON.stringify({ text: INPUT_SENTINEL }),
          }], "tool-calls");
        }
        throw new Error(`provider failure while serving the injected input: ${INPUT_SENTINEL}`);
      },
    });
    const errorLog: Array<{ input: unknown; context: CellToolExecutionContext }> = [];
    const errorRecord = await runCell(cellToolCell(root), aiSdkDriver(failingModel, "mock-cell-tool-provider-error"), {
      host: createLocalHost(),
      tools: { invert_fixture: neutralFixtureTool(errorLog) },
    });
    expect(errorRecord.status).toBe("failed");
    expect(errorRecord.error).toBe("the provider or driver failed during this run");
    expect(errorCalls).toBe(2);
    expect(errorRecord.usage.totalTokens).toBe(2);
    expect(errorRecord.rawSteps).toEqual([]);
    expect(errorRecord.trace.some((event) => event.type.startsWith("agent."))).toBe(false);
    // The fulfilled invocation evidence precedes the projected cell.error
    // and the immutable final; nothing follows the final.
    expect(errorRecord.trace).toContainEqual(expect.objectContaining({
      type: "cell.tool.settled",
      data: { name: "invert_fixture", toolCallId: AI_SDK_CALL_ID, outcome: "fulfilled" },
    }));
    expect(errorRecord.trace).toContainEqual(expect.objectContaining({
      type: "cell.error",
      data: { status: "failed", error: "the provider or driver failed during this run" },
    }));
    const errorFinishedIndex = errorRecord.trace.findIndex((event) => event.type === "cell.finished");
    expect(errorFinishedIndex).toBe(errorRecord.trace.length - 1);
    expectBoundedInjectedRetention(
      errorRecord,
      ["invert_fixture"],
      [AI_SDK_CALL_ID],
      [INPUT_SENTINEL, RESULT_SENTINEL],
    );

    // Pi half: the same neutral fixture through the harness driver, with the
    // causal tool-effect handoff and the post-terminal action closure in one
    // run. The successful call proves exact forward substitution; the declared
    // terminal action then closes the phase, and the late injected call is
    // refused before the caller implementation can run.
    const piLog: Array<{ input: unknown; context: CellToolExecutionContext }> = [];
    const toolResults: Array<{ toolCallId: string; output: unknown }> = [];
    const harness = scriptedHarness(async ({ emit, waitForToolResult }) => {
      emit({ type: "stream-start", warnings: [] });
      emit({
        type: "tool-call",
        toolCallId: PI_CALL_ID,
        toolName: "invert_fixture",
        input: JSON.stringify({ text: INPUT_SENTINEL }),
        providerExecuted: false,
      });
      await waitForToolResult(1);
      emit({ type: "finish-step", finishReason: STOP_REASON, usage: V4_USAGE });
      emit({
        type: "tool-call",
        toolCallId: "terminal-pi",
        toolName: "finish_work",
        input: "{}",
        providerExecuted: false,
      });
      await waitForToolResult(2);
      emit({ type: "finish-step", finishReason: STOP_REASON, usage: V4_USAGE });
      emit({
        type: "tool-call",
        toolCallId: PI_LATE_CALL_ID,
        toolName: "invert_fixture",
        input: JSON.stringify({ text: INPUT_SENTINEL }),
        providerExecuted: false,
      });
      await waitForToolResult(3);
      emit({ type: "finish-step", finishReason: STOP_REASON, usage: V4_USAGE });
      emit({
        type: "finish",
        finishReason: STOP_REASON,
        totalUsage: {
          inputTokens: { total: 3, noCache: 3, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 3, text: 3, reasoning: 0 },
        },
        // A provider-shaped echo of the injected call's input and result:
        // the injected-aware retained-evidence projection must never retain
        // it in the trace or the final rawSteps.
        providerMetadata: { injectedEcho: { input: INPUT_SENTINEL, result: RESULT_SENTINEL } },
      });
    }, toolResults);
    const piInput = cellToolCell(root, {
      terminalTools: [{
        name: "finish_work",
        description: "Finish the bounded work.",
        inputSchema: { type: "object", additionalProperties: false },
      }],
    });
    let handoffCalls = 0;
    const piRecord = await runCell(piInput, deepSeekPiCellToolDriver(harness, {
      toolEffectHandoff: async () => {
        handoffCalls += 1;
      },
    }), {
      host: createLocalHost(),
      tools: { invert_fixture: neutralFixtureTool(piLog) },
    });

    expect(piRecord.status).toBe("passed");
    expect(piRecord.verification.terminal.called).toEqual(["finish_work"]);
    // Exact forward substitution: the same fixture keeps its input and exact
    // toolCallId, and its result crossed the harness tool boundary verbatim.
    expect(piLog).toHaveLength(1);
    expect(piLog[0]?.input).toEqual({ text: INPUT_SENTINEL });
    expect(piLog[0]?.context).toMatchObject({ toolCallId: PI_CALL_ID });
    expect(toolResults).toHaveLength(3);
    expect(toolResults[0]).toEqual({ toolCallId: PI_CALL_ID, output: { inverted: RESULT_SENTINEL } });
    // The injected tool crossed the causal event-loop handoff like every host tool.
    expect(handoffCalls).toBeGreaterThanOrEqual(1);
    expect(piRecord.trace).toContainEqual(expect.objectContaining({
      type: "cell.tool.settled",
      data: { name: "invert_fixture", toolCallId: PI_CALL_ID, outcome: "fulfilled" },
    }));
    expect(piRecord.trace).toContainEqual(expect.objectContaining({
      type: "cell.tools.projected",
      data: { tools: ["invert_fixture"] },
    }));
    // The action closure refused the late post-terminal call before the
    // caller implementation could run: an invocation refused is retained as
    // exact bounded evidence — { name, toolCallId, outcome: "refused" } —
    // never as an absent event, and the model still received the ordinary
    // blocked observation.
    expect(piLog).toHaveLength(1);
    expect(toolResults[2]?.output).toMatchObject({ accepted: false });
    expect(piRecord.trace).toContainEqual(expect.objectContaining({
      type: "cell.tool.settled",
      data: { name: "invert_fixture", toolCallId: PI_LATE_CALL_ID, outcome: "refused" },
    }));
    // Total retained-evidence redaction: the core-owned projection drops
    // every Integration-originated trace event for the injected-tool run —
    // the generic started/finished events (including the post-closure
    // refused call and the declared terminal tool), the step events, and the
    // harness tool-surface projection alike — while normalized usage and the
    // bounded events remain. The exact scalar/key absence of the injected
    // input/result and the echoed provider metadata is asserted by the
    // bounded retention helper below, never by substring matching.
    const piGenericToolNames = piRecord.trace
      .filter((event) => event.type === "agent.tool.started" || event.type === "agent.tool.finished")
      .map((event) => (event.data as { name?: unknown }).name);
    expect(piGenericToolNames).toEqual([]);
    expect(piRecord.trace.some((event) => event.type.startsWith("agent."))).toBe(false);
    expect(piRecord.trace.some((event) => event.type.startsWith("harness."))).toBe(false);
    expect(piRecord.trace.some((event) => event.type === "terminal.tool.called")).toBe(false);
    expect(piRecord.rawSteps).toEqual([]);
    expect(piRecord.usage).toMatchObject({ inputTokens: 3, outputTokens: 3, totalTokens: 6 });

    // Pi outputSchema settlement: the shared settlement helper emits its
    // step evidence through the driver context, and both the harness finish
    // and the settlement provider metadata echo the injected sentinels. The
    // core-owned projection drops every Integration-originated event while
    // the semantic structured output and normalized usage stay.
    const piSettlementResults: Array<{ toolCallId: string; output: unknown }> = [];
    const piSettlementHarness = scriptedHarness(async ({ emit, waitForToolResult }) => {
      emit({ type: "stream-start", warnings: [] });
      emit({
        type: "tool-call",
        toolCallId: PI_CALL_ID,
        toolName: "invert_fixture",
        input: JSON.stringify({ text: INPUT_SENTINEL }),
        providerExecuted: false,
      });
      await waitForToolResult(1);
      emit({ type: "finish-step", finishReason: STOP_REASON, usage: V4_USAGE });
      emit({
        type: "finish",
        finishReason: STOP_REASON,
        totalUsage: {
          inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 1, text: 1, reasoning: 0 },
        },
        providerMetadata: {
          mock: { echoedInput: INPUT_SENTINEL, echoedResult: RESULT_SENTINEL, echoedCallId: PI_CALL_ID },
        },
      });
    }, piSettlementResults);
    let piSettlementCalls = 0;
    const piSettlementModel = new MockLanguageModelV3({
      doGenerate: async () => {
        piSettlementCalls += 1;
        return {
          ...modelResponse([{
            type: "tool-call",
            toolCallId: SETTLE_CALL_ID,
            toolName: "emit_structured_output",
            input: JSON.stringify({ decision: SETTLE_OUTPUT_SENTINEL }),
          }], "tool-calls"),
          providerMetadata: {
            mock: { echoedInput: INPUT_SENTINEL, echoedResult: RESULT_SENTINEL, echoedCallId: SETTLE_CALL_ID },
          },
        };
      },
    });
    const piSettlementDriver = deepSeekPiCellToolDriver(piSettlementHarness);
    Object.defineProperty(piSettlementDriver, "model", { value: piSettlementModel });
    const piSettlementLog: Array<{ input: unknown; context: CellToolExecutionContext }> = [];
    const piSettlementInput = cellToolCell(root, {
      outputSchema: {
        type: "object",
        properties: { decision: { type: "string" } },
        required: ["decision"],
        additionalProperties: false,
      },
    });
    const piSettlementRecord = await runCell(piSettlementInput, piSettlementDriver, {
      host: createLocalHost(),
      tools: { invert_fixture: neutralFixtureTool(piSettlementLog) },
    });
    expect(piSettlementRecord.status).toBe("passed");
    // The semantic structured output and normalized usage survive verbatim.
    expect(piSettlementRecord.output).toEqual({ decision: SETTLE_OUTPUT_SENTINEL });
    expect(piSettlementRecord.usage.totalTokens).toBe(4);
    // No settlement, agent, or harness event and no raw provider step is
    // retained: the settlement step evidence carried the echoed sentinels.
    expect(piSettlementRecord.trace.some((event) => event.type.startsWith("structured.settlement"))).toBe(false);
    expect(piSettlementRecord.trace.some((event) => event.type.startsWith("agent."))).toBe(false);
    expect(piSettlementRecord.trace.some((event) => event.type.startsWith("harness."))).toBe(false);
    expect(piSettlementRecord.rawSteps).toEqual([]);
    expect(piSettlementLog).toHaveLength(1);
    expect(piSettlementCalls).toBe(1);
    expectBoundedInjectedRetention(
      piSettlementRecord,
      ["invert_fixture"],
      [PI_CALL_ID, SETTLE_CALL_ID],
      [INPUT_SENTINEL, RESULT_SENTINEL, SETTLE_OUTPUT_SENTINEL, "echoedInput", "echoedResult", "echoedCallId"],
    );

    // The whole allowed retained surface, asserted mechanically: no injected
    // name outside cell.tools.projected/cell.tool.settled, no exact injected
    // call id outside cell.tool.settled, and no injected input/result or
    // provider-metadata echo in any trace/raw/provider surface.
    expectBoundedInjectedRetention(
      piRecord,
      ["invert_fixture"],
      [PI_CALL_ID, PI_LATE_CALL_ID],
      [INPUT_SENTINEL, RESULT_SENTINEL, "injectedEcho"],
    );
  });

  test("omitting tools leaves the old surface and final unchanged, and every nonempty injection outside the declared support boundary fails closed before provider dispatch", async () => {
    const { root } = await fixture();

    // Baseline: the exact old runCell call with no tools. The model-facing
    // surface is the old host/task/terminal surface, the final is unchanged,
    // and no cell-tool event appears.
    let toolNames: string[] = [];
    const baselineModel = new MockLanguageModelV3({
      doGenerate: async (options) => {
        toolNames = options.tools?.map((candidate) => candidate.name) ?? [];
        return modelResponse([{
          type: "tool-call",
          toolCallId: "terminal-plain",
          toolName: "finish_work",
          input: "{}",
        }], "tool-calls");
      },
    });
    const terminalInput = cellToolCell(root, {
      terminalTools: [{
        name: "finish_work",
        description: "Finish the bounded work.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      }],
    });
    const baseline = await runCell(terminalInput, aiSdkDriver(baselineModel, "mock-unchanged-surface"), {
      host: createLocalHost(),
    });
    expect(baseline.status).toBe("passed");
    expect(baseline.verification.terminal.called).toEqual(["finish_work"]);
    expect(toolNames).toEqual(["task_list", "task_get", "task_create", "task_update", "finish_work"]);
    expect(baseline.finalText).toContain("Terminal contract satisfied during execution through finish_work");
    expect(baseline.trace.some((event) => event.type.startsWith("cell.tools"))).toBe(false);
    expect(baseline.trace.some((event) => event.type === "cell.tool.settled")).toBe(false);

    // A nonempty set with a driver that does not declare supportsCellTools
    // fails closed as capability_mismatch before dispatch.
    let dispatched = false;
    const plainDriver: CellDriver = {
      descriptor: { adapter: "no-cell-tools", provider: "deterministic", model: "fixture" },
      async run() {
        dispatched = true;
        throw new Error("driver must not start");
      },
    };
    const unsupportedTools: CellToolSet = {
      plain_probe: {
        description: "Refused by the unsupported driver.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        execute: async () => ({ value: "never" }),
      },
    };
    const unsupported = await runCell(cellToolCell(root), plainDriver, {
      host: createLocalHost(),
      tools: unsupportedTools,
    });
    expect(unsupported.status).toBe("capability_mismatch");
    expect(unsupported.error).toContain("does not declare supportsCellTools");
    expect(unsupported.error).toContain("plain_probe");
    expect(dispatched).toBe(false);

    // The per-execution tool snapshot is bound synchronously before runCell's
    // first await: mutating the caller's set after the run began — adding a
    // name, replacing execute, rewriting the schema — can never change the
    // model-visible surface or executable authority of the running Cell.
    interface MutableCellToolDefinition {
      description: string;
      inputSchema: CellToolInputSchema;
      execute: CellTool["execute"];
    }
    const boundExecuteLog: unknown[] = [];
    const mutableDefinition: MutableCellToolDefinition = {
      description: "The original bound definition.",
      inputSchema: {
        type: "object",
        properties: { text: { type: "string" } },
        additionalProperties: false,
      },
      execute: async (probeInput: unknown) => {
        boundExecuteLog.push(probeInput);
        return { from: "original" };
      },
    };
    const callerOwned = { mutable_probe: mutableDefinition } as unknown as CellToolSet;
    let poisonedCalls = 0;
    let translatedMutableSchema: unknown;
    let mutableSecondRequest: unknown;
    let mutableCalls = 0;
    const mutableModel = new MockLanguageModelV3({
      doGenerate: async (options) => {
        mutableCalls += 1;
        if (mutableCalls === 1) {
          translatedMutableSchema = (
            options.tools as Array<{ name: string; inputSchema?: unknown }> | undefined
          )?.find((candidate) => candidate.name === "mutable_probe")?.inputSchema;
          return modelResponse([{
            type: "tool-call",
            toolCallId: "mutable-call",
            toolName: "mutable_probe",
            input: JSON.stringify({ text: "abc" }),
          }], "tool-calls");
        }
        mutableSecondRequest = options;
        return modelResponse([{ type: "text", text: "The bound snapshot held." }], "stop");
      },
    });
    const mutableRunning = runCell(cellToolCell(root), aiSdkDriver(mutableModel, "mock-bound-snapshot"), {
      host: createLocalHost(),
      tools: callerOwned,
    });
    // runCell's synchronous prefix has already bound the snapshot when this
    // line runs; every mutation below lands after the binding.
    (callerOwned as unknown as Record<string, MutableCellToolDefinition>)["added_later"] = {
      description: "Added after the snapshot was bound.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: async () => ({ from: "later" }),
    };
    mutableDefinition.execute = async () => {
      poisonedCalls += 1;
      return { from: "poisoned" };
    };
    mutableDefinition.inputSchema = {
      type: "object",
      properties: { text: { type: "number" } },
      additionalProperties: false,
    };
    const mutableRecord = await mutableRunning;

    expect(mutableRecord.status).toBe("passed");
    // The projection is exactly the bound snapshot's granted names: the name
    // added after the run began never reached the driver.
    expect(mutableRecord.trace).toContainEqual(expect.objectContaining({
      type: "cell.tools.projected",
      data: { tools: ["mutable_probe"] },
    }));
    // The model-visible schema is the frozen bound copy: the caller's later
    // schema rewrite never reached the translation.
    expect(translatedMutableSchema).toMatchObject({
      type: "object",
      properties: { text: { type: "string" } },
    });
    // The executable authority is the bound execute reference: the original
    // implementation ran with the exact input and its result crossed back to
    // the next provider step; the replacement was never invoked.
    expect(boundExecuteLog).toEqual([{ text: "abc" }]);
    expect(poisonedCalls).toBe(0);
    expect(JSON.stringify(mutableSecondRequest)).toContain("original");
    expect(JSON.stringify(mutableSecondRequest)).not.toContain("poisoned");
    expect(mutableRecord.trace).toContainEqual(expect.objectContaining({
      type: "cell.tool.settled",
      data: { name: "mutable_probe", toolCallId: "mutable-call", outcome: "fulfilled" },
    }));

    // Invalid names and non-object-root schemas are rejected by the neutral
    // contract before any provider dispatch.
    let invalidDispatchCalls = 0;
    const invalidModel = new MockLanguageModelV3({
      doGenerate: async () => {
        invalidDispatchCalls += 1;
        throw new Error("model dispatch should not occur");
      },
    });
    const invalidTools = {
      "Bad-Name": {
        description: "Invalid name shape.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        execute: async () => ({ value: "never" }),
      },
      bad_schema: {
        description: "Non-object-root schema.",
        inputSchema: { type: "string" },
        execute: async () => ({ value: "never" }),
      },
    } as unknown as CellToolSet;
    const invalid = await runCell(cellToolCell(root), aiSdkDriver(invalidModel, "mock-invalid-cell-tool"), {
      host: createLocalHost(),
      tools: invalidTools,
    });
    expect(invalid.status).toBe("failed");
    expect(invalid.error).toContain("cell tool names use lowercase snake_case: Bad-Name");
    expect(invalid.error).toContain("cell tool bad_schema requires an object-root input schema");
    expect(invalidDispatchCalls).toBe(0);

    // Active host, task, and declared terminal name collisions fail closed
    // before provider dispatch: read_file is active under the read scope,
    // task_create under the default manage Task authority, and finish_work is
    // the declared terminal tool.
    for (const name of ["read_file", "task_create", "finish_work"] as const) {
      let dispatchCalls = 0;
      const collisionModel = new MockLanguageModelV3({
        doGenerate: async () => {
          dispatchCalls += 1;
          throw new Error("model dispatch should not occur");
        },
      });
      const collisionTools: CellToolSet = {
        [name]: {
          description: "Ambiguous execution surface collision.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
          execute: async () => ({ value: "never" }),
        },
      };
      const collisionRecord = await runCell(cellToolCell(root, {
        // A read scope makes read_file part of the active host surface;
        // task_create is active under the default manage Task authority.
        workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
        terminalTools: [{
          name: "finish_work",
          description: "Finish the bounded work.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        }],
      }), aiSdkDriver(collisionModel, `mock-cell-conflict-${name}`), {
        host: createLocalHost(),
        tools: collisionTools,
      });

      expect(collisionRecord.status).toBe("failed");
      if (name === "finish_work") {
        expect(collisionRecord.error).toContain(
          "cell tool name conflicts with a declared terminal tool: finish_work",
        );
      } else {
        expect(collisionRecord.error).toContain(
          `cell tool names conflict with the active execution tool surface: ${name}`,
        );
      }
      expect(dispatchCalls).toBe(0);
    }
  });
});
