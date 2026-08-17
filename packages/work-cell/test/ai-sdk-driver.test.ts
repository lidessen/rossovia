import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  APICallError,
  type LanguageModelV3GenerateResult,
  type LanguageModelV3StreamPart,
  type LanguageModelV4GenerateResult,
} from "@ai-sdk/provider";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV3, MockLanguageModelV4 } from "ai/test";
import { AiSdkActivationFieldDriver } from "../src/research/ai-sdk-activation-field";
import { AiSdkCandidateFieldDriver } from "../src/research/ai-sdk-candidate-field";
import { AiSdkValidationDriver } from "../src/integrations/ai-sdk/ai-sdk-driver";
import { AiSdkValidationSequenceDriver } from "../src/adapters/sequence/ai-sdk-driver";
import { createRoutedLanguageModel } from "../src/integrations/ai-sdk/model-route";
import type { SeedMaterialRetriever } from "../src/research/candidate-field";
import { runCell as runCellCore } from "../src/run-cell";
import { runSequenceCell as runSequenceCellCore, type SequenceSelector } from "../src/adapters/sequence/runtime";
import { createLocalHost } from "../src/workspace";
import type { CellDriver } from "../src/driver";
import type { CellRunRecord } from "../src/contracts";

// Every test caller explicitly injects the real local filesystem/Bun adapter
// through the neutral host port; the wrapper keeps the injection visible in
// one place while the call sites below exercise the unchanged Cell contract.
const runCell = (
  input: unknown,
  driver: CellDriver,
  options: Omit<Parameters<typeof runCellCore>[2], "host"> = {},
): Promise<CellRunRecord> => runCellCore(input, driver, { host: createLocalHost(), ...options });

const runSequenceCell = (
  input: unknown,
  driver: CellDriver & SequenceSelector,
  signal?: AbortSignal,
): Promise<CellRunRecord> => runSequenceCellCore(input, driver, createLocalHost(), signal);

const roots: string[] = [];
const explicitDeepSeekRoute = () => [{
  provider: "deepseek" as const,
  credential: { source: "env" as const, name: "DEEPSEEK_TEST_KEY" },
}];
const explicitKimiRoute = () => [{
  provider: "kimi-coding" as const,
  credential: { source: "env" as const, name: "KIMI_TEST_KEY" },
  model: "k3",
}];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("recovers one gene-expression natural finish before executing the Cell", async () => {
  const root = await fixture();
  let calls = 0;
  let recoveryRequest: unknown;
  const model = new MockLanguageModelV3({
    doGenerate: async (options) => {
      calls += 1;
      if (calls === 1) return response([{ type: "text", text: "I should analyze this first." }], "stop");
      if (calls === 2) {
        recoveryRequest = options;
        return response([{
          type: "tool-call",
          toolCallId: "express-after-recovery",
          toolName: "express_genes",
          input: JSON.stringify({
            lead: "P04",
            supports: [],
            principalContradiction: "The required gene expression was not submitted.",
            contributions: [{ pid: "P04", decision: "Recover the required selection before execution." }],
          }),
        }], "tool-calls");
      }
      if (calls === 3) return response([{ type: "text", text: "Execution completed." }], "stop");
      throw new Error(`unexpected mock call ${calls}`);
    },
  });
  const driver = new AiSdkValidationSequenceDriver({
    route: explicitDeepSeekRoute(),
    deepSeekApiKey: "not-used",
    model: "mock-sequence-recovery",
  });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runSequenceCell(sequenceInput(root), driver);

  expect(record.status).toBe("passed");
  expect(record.preparation?.usage.totalTokens).toBe(4);
  expect(record.preparation?.rawSteps).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: "sequence.expression.recovery" }),
  ]));
  expect(JSON.stringify(recoveryRequest)).toContain(
    "The principal contradiction belongs to the concrete object, not to the Sequence.",
  );
  expect(JSON.stringify(recoveryRequest)).toContain(
    "Select a lead whose use changes the object's explanation or transformation.",
  );
  expect(JSON.stringify(recoveryRequest)).toContain(
    "do not fill the team only with downstream safeguards.",
  );
  expect(JSON.stringify(recoveryRequest)).toContain("## Gene-expression recovery");
  expect(calls).toBe(3);
});

test("sends workspace-scoped local images as AI SDK file parts without retaining their bytes", async () => {
  const root = await fixture();
  const image = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);
  await mkdir(join(root, "images"), { recursive: true });
  await writeFile(join(root, "images", "probe.png"), image);
  let request: unknown;
  const model = new MockLanguageModelV4({
    doGenerate: async (options) => {
      request = options;
      return responseV4([{ type: "text", text: "The image was inspected." }], "stop");
    },
  });
  const driver = new AiSdkValidationDriver({
    route: explicitKimiRoute(),
    kimiApiKey: "not-used",
    model: "mock-image-input",
  });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "image-input",
    intent: "Inspect the supplied image.",
    workspace: { root, readPaths: ["images"], writePaths: [], excludePaths: [], allowedCommands: [] },
    imagePaths: ["images/probe.png"],
    instructions: ["Use the supplied image as evidence."],
    capabilities: ["vision"],
    capabilitiesRequired: ["vision"],
    acceptance: ["Return one image-grounded observation."],
    budget: { maxSteps: 1, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  const prompt = (request as { prompt?: unknown }).prompt as Array<{
    role: string;
    content?: Array<{ type: string; mediaType?: string; data?: { type: string; data: Uint8Array } }>;
  }>;
  const user = prompt.find((message) => message.role === "user");
  const file = user?.content?.find((part) => part.type === "file");
  expect(file).toMatchObject({ type: "file", mediaType: "image/png", data: { type: "data" } });
  expect(Array.from(file?.data?.data ?? [])).toEqual(Array.from(image));
  expect(record.status).toBe("passed");
  expect(JSON.stringify(record.trace)).not.toContain("137,80,78,71");
  expect(JSON.stringify(record.rawSteps)).not.toContain("137,80,78,71");
});

test("reuses local image file parts when terminal recovery starts", async () => {
  const root = await fixture();
  await mkdir(join(root, "images"), { recursive: true });
  await writeFile(join(root, "images", "probe.png"), new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 9, 8, 7]));
  const requests: unknown[] = [];
  let calls = 0;
  const model = new MockLanguageModelV4({
    doGenerate: async (options) => {
      calls += 1;
      requests.push(options);
      if (calls === 1) return responseV4([{ type: "text", text: "The image is clear." }], "stop");
      return responseV4([{
        type: "tool-call",
        toolCallId: "finish-image-review",
        toolName: "finish_image_review",
        input: JSON.stringify({ verdict: "ready" }),
      }], "tool-calls");
    },
  });
  const driver = new AiSdkValidationDriver({
    route: explicitKimiRoute(),
    kimiApiKey: "not-used",
    model: "mock-image-recovery",
  });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "image-recovery",
    intent: "Inspect the supplied image and settle the review.",
    workspace: { root, readPaths: ["images"], writePaths: [], excludePaths: [], allowedCommands: [] },
    imagePaths: ["images/probe.png"],
    instructions: ["Use the image as evidence."],
    capabilities: ["vision"],
    capabilitiesRequired: ["vision"],
    acceptance: ["The terminal review is settled from the image."],
    terminalTools: [{
      name: "finish_image_review",
      description: "Submit the image review.",
      inputSchema: {
        type: "object",
        properties: { verdict: { type: "string", enum: ["ready"] } },
        required: ["verdict"],
        additionalProperties: false,
      },
    }],
    budget: { maxSteps: 3, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  const recoveryPrompt = (requests[1] as { prompt?: unknown }).prompt as Array<{
    role: string;
    content?: string | Array<{ type: string; mediaType?: string }>;
  }>;
  expect(recoveryPrompt.some((message) => message.role === "user"
    && Array.isArray(message.content)
    && message.content.some((part) => part.type === "file" && part.mediaType === "image/png"))).toBe(true);
  expect(record.status).toBe("passed");
  expect(record.trace.some((event) => event.type === "terminal.contract.recovery")).toBe(true);
  expect(JSON.stringify(record.trace)).not.toContain("137,80,78,71");
});

test("retains gene-expression usage when the bounded recovery is exhausted", async () => {
  const root = await fixture();
  let calls = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async () => {
      calls += 1;
      return response([{ type: "text", text: "No tool call." }], "stop");
    },
  });
  const driver = new AiSdkValidationSequenceDriver({
    route: explicitDeepSeekRoute(),
    deepSeekApiKey: "not-used",
    model: "mock-sequence-recovery-exhausted",
  });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runSequenceCell(sequenceInput(root), driver);

  expect(record.status).toBe("failed");
  expect(record.error).toContain("after one recovery");
  expect(record.preparation?.usage.totalTokens).toBe(4);
  expect(record.preparation?.rawSteps.length).toBe(2);
  expect(calls).toBe(2);
});

test("retries an invalid terminal payload during recovery before settlement", async () => {
  const root = await fixture();
  let calls = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async () => {
      calls += 1;
      if (calls === 1) return response([{ type: "text", text: "Main response stopped before terminal." }], "stop");
      if (calls === 2) return response([{
        type: "tool-call",
        toolCallId: "invalid-terminal",
        toolName: "finish_review",
        input: JSON.stringify({ verdict: "maybe" }),
      }], "tool-calls");
      if (calls === 3) return response([{
        type: "tool-call",
        toolCallId: "valid-terminal",
        toolName: "finish_review",
        input: JSON.stringify({ verdict: "ready" }),
      }], "tool-calls");
      throw new Error(`unexpected mock call ${calls}`);
    },
  });
  const driver = new AiSdkValidationDriver({ route: explicitDeepSeekRoute(), deepSeekApiKey: "not-used", model: "mock-recovery" });
  // The adapter owns the model handle; the mock replaces only the provider edge.
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "recovery-rehearsal",
    intent: "Exercise the terminal recovery path.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Return a concise report."],
    capabilities: ["read"],
    capabilitiesRequired: ["read"],
    acceptance: ["A missing terminal signal is recovered before settlement."],
    terminalTools: [{
      name: "finish_review",
      description: "Signal review completion.",
      inputSchema: {
        type: "object",
        properties: { verdict: { type: "string", enum: ["ready"] } },
        required: ["verdict"],
        additionalProperties: false,
      },
    }],
    budget: { maxSteps: 4, estimatedTokens: 1_000, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  expect(record.status).toBe("passed");
  expect(record.verification.terminal).toMatchObject({ passed: true, called: ["finish_review"] });
  expect(record.trace.some((event) => event.type === "terminal.contract.recovery")).toBe(true);
  expect(record.trace.find((event) => event.type === "agent.step.started")?.data).toMatchObject({
    provider: "mock-provider",
    model: "mock-model-id",
    stepNumber: 0,
  });
  expect(record.trace.find((event) => event.type === "agent.step.finished")?.data).toMatchObject({
    performance: expect.objectContaining({ stepTimeMs: expect.any(Number) }),
  });
  expect(record.finalText).toContain("Terminal contract satisfied during recovery");
  expect(calls).toBe(3);
});

test("streams bounded reasoning activity when a live observer is attached", async () => {
  const root = await fixture();
  const firstStep: LanguageModelV3StreamPart[] = [
    { type: "stream-start", warnings: [] },
    { type: "reasoning-start", id: "reasoning-1" },
    { type: "reasoning-delta", id: "reasoning-1", delta: "a".repeat(600) },
    { type: "reasoning-delta", id: "reasoning-1", delta: "b".repeat(600) },
    { type: "reasoning-end", id: "reasoning-1" },
    {
      type: "tool-call",
      toolCallId: "read-1",
      toolName: "read_file",
      input: JSON.stringify({ path: "principles/SEQUENCE.md" }),
    },
    {
      type: "finish",
      finishReason: { unified: "tool-calls", raw: "tool-calls" },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 5, text: 1, reasoning: 4 },
      },
    },
  ];
  const secondStep: LanguageModelV3StreamPart[] = [
    { type: "stream-start", warnings: [] },
    { type: "text-start", id: "response-1" },
    { type: "text-delta", id: "response-1", delta: "completed" },
    { type: "text-end", id: "response-1" },
    {
      type: "finish",
      finishReason: { unified: "stop", raw: "stop" },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 5, text: 1, reasoning: 4 },
      },
    },
  ];
  let calls = 0;
  const model = new MockLanguageModelV3({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: calls++ === 0 ? firstStep : secondStep,
        chunkDelayInMs: null,
      }),
    }),
  });
  const driver = new AiSdkValidationDriver({
    route: explicitDeepSeekRoute(),
    deepSeekApiKey: "not-used",
    model: "mock-stream-observation",
  });
  Object.defineProperty(driver, "model", { value: model });
  const observed: string[] = [];

  const record = await runCell({
    id: "stream-observation",
    intent: "Expose bounded live execution activity.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Return a concise result."],
    capabilities: ["read"],
    capabilitiesRequired: ["read"],
    acceptance: ["The live observer sees reasoning progress without raw reasoning text."],
    budget: { maxSteps: 2, estimatedTokens: 100, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver, {
    onTrace(event) {
      observed.push(event.type);
    },
  });

  expect(record.status).toBe("passed");
  expect(observed).toEqual(expect.arrayContaining([
    "agent.reasoning.started",
    "agent.reasoning.progress",
    "agent.reasoning.finished",
    "agent.tool.started",
    "agent.tool.finished",
    "agent.response.started",
    "agent.response.finished",
  ]));
  expect(record.trace.find((event) => event.type === "agent.reasoning.progress")?.data).toEqual({
    phase: "execution",
    id: "reasoning-1",
    characters: 1_200,
  });
  expect(record.trace.find((event) => event.type === "agent.tool.started")?.data).toMatchObject({
    name: "read_file",
    target: { kind: "workspace-path", path: "principles/SEQUENCE.md" },
  });
  expect(JSON.stringify(record.trace)).not.toContain("a".repeat(100));
  expect(record.trace.some((event) => event.type === "tool.read_file")).toBe(true);
  expect(record.usage.totalTokens).toBe(30);
});

test("does not expose read tools when the Cell has no read scope", async () => {
  const root = await fixture();
  let toolNames: string[] = [];
  const model = new MockLanguageModelV3({
    doGenerate: async (options) => {
      toolNames = options.tools?.map((candidate) => candidate.name) ?? [];
      return response([{
        type: "tool-call",
        toolCallId: "terminal-without-read",
        toolName: "finish_without_read",
        input: JSON.stringify({ verdict: "ready" }),
      }], "tool-calls");
    },
  });
  const driver = new AiSdkValidationDriver({
    route: explicitDeepSeekRoute(),
    deepSeekApiKey: "not-used",
    model: "mock-no-read-surface",
  });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "no-read-tool-surface",
    intent: "Finish from supplied context without repository access.",
    workspace: { root, readPaths: [], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Use only the declared terminal tool."],
    acceptance: ["Unavailable read tools are absent from the model-facing surface."],
    terminalTools: [{
      name: "finish_without_read",
      description: "Finish the context-only judgment.",
      inputSchema: {
        type: "object",
        properties: { verdict: { type: "string", enum: ["ready"] } },
        required: ["verdict"],
        additionalProperties: false,
      },
    }],
    budget: { maxSteps: 2, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  expect(record.status).toBe("passed");
  expect(toolNames).toEqual(["task_list", "task_get", "task_create", "task_update", "finish_without_read"]);
});

test("projects read-update Task authority without exposing creation or structural mutation", async () => {
  const root = await fixture();
  let calls = 0;
  let firstTools: unknown;
  const model = new MockLanguageModelV3({
    doGenerate: async (options) => {
      calls += 1;
      firstTools ??= options.tools;
      if (calls === 1) {
        return response([{
          type: "tool-call",
          toolCallId: "complete-assigned-task",
          toolName: "task_update",
          input: JSON.stringify({ taskId: "task-1", status: "completed" }),
        }], "tool-calls");
      }
      return response([{
        type: "tool-call",
        toolCallId: "finish-assigned-work",
        toolName: "finish_assigned_work",
        input: JSON.stringify({ status: "done" }),
      }], "tool-calls");
    },
  });
  const driver = new AiSdkValidationDriver({
    route: explicitDeepSeekRoute(),
    deepSeekApiKey: "not-used",
    model: "mock-read-update-task-tools",
    taskToolSet: "read-update",
  });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "assigned-worker",
    intent: "Complete the assigned task without changing its structure.",
    workspace: { root, readPaths: [], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Use only the assigned task."],
    acceptance: ["The assigned task is settled."],
    tasks: [{ subject: "Assigned work", description: "Complete the bounded assigned work." }],
    terminalTools: [{
      name: "finish_assigned_work",
      description: "Finish the assigned bounded work.",
      inputSchema: {
        type: "object",
        properties: { status: { type: "string", enum: ["done"] } },
        required: ["status"],
        additionalProperties: false,
      },
    }],
    budget: { maxSteps: 3, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  const encoded = JSON.stringify(firstTools);
  expect(encoded).toContain("task_list");
  expect(encoded).toContain("task_get");
  expect(encoded).toContain("task_update");
  expect(encoded).not.toContain("task_create");
  const update = (firstTools as Array<{ name: string; inputSchema: unknown }>).find((candidate) => candidate.name === "task_update");
  expect(JSON.stringify(update?.inputSchema)).not.toContain("subject");
  expect(JSON.stringify(update?.inputSchema)).not.toContain("owner");
  expect(record.status).toBe("passed");
  expect(record.tasks?.[0]?.status).toBe("completed");
  expect(record.trace).toContainEqual(expect.objectContaining({
    type: "task.tools.projected",
    data: { taskToolSet: "read-update", tools: ["task_list", "task_get", "task_update"] },
  }));
});

test("projects read-only Task authority without exposing create or update tools", async () => {
  const root = await fixture();
  let request: unknown;
  const model = new MockLanguageModelV3({
    doGenerate: async (options) => {
      request = options;
      return response([{
        type: "tool-call",
        toolCallId: "finish-read-only-review",
        toolName: "finish_read_only_review",
        input: JSON.stringify({ verdict: "reviewed" }),
      }], "tool-calls");
    },
  });
  const driver = new AiSdkValidationDriver({
    route: explicitDeepSeekRoute(),
    deepSeekApiKey: "not-used",
    model: "mock-read-only-task-tools",
    taskToolSet: "read-only",
  });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "read-only-reviewer",
    intent: "Review supplied evidence without mutating task state.",
    workspace: { root, readPaths: [], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Use only the supplied evidence."],
    acceptance: ["The reviewer has no task mutation authority."],
    terminalTools: [{
      name: "finish_read_only_review",
      description: "Submit the bounded review.",
      inputSchema: {
        type: "object",
        properties: { verdict: { type: "string", enum: ["reviewed"] } },
        required: ["verdict"],
        additionalProperties: false,
      },
    }],
    budget: { maxSteps: 2, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  const encoded = JSON.stringify(request);
  expect(encoded).toContain("task_list");
  expect(encoded).toContain("task_get");
  expect(encoded).not.toContain("task_create");
  expect(encoded).not.toContain("task_update");
  expect(encoded).toContain("Task access is read-only");
  expect(record.status).toBe("passed");
  expect(record.trace).toContainEqual(expect.objectContaining({
    type: "task.tools.projected",
    data: { taskToolSet: "read-only", tools: ["task_list", "task_get"] },
  }));
});

test("injects a task seed and records its settled cycle as process proof", async () => {
  const root = await fixture();
  let calls = 0;
  let firstRequest: unknown;
  const model = new MockLanguageModelV3({
    doGenerate: async (options) => {
      calls += 1;
      if (calls === 1) {
        firstRequest = options;
        return response([{
          type: "tool-call",
          toolCallId: "complete-first-task",
          toolName: "task_update",
          input: JSON.stringify({ taskId: "task-1", status: "completed" }),
        }], "tool-calls");
      }
      if (calls === 2) return response([{ type: "text", text: "Bounded work completed." }], "stop");
      throw new Error(`unexpected mock call ${calls}`);
    },
  });
  const driver = new AiSdkValidationDriver({
    route: explicitDeepSeekRoute(),
    deepSeekApiKey: "not-used",
    model: "mock-task-proof",
  });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "task-proof",
    intent: "Exercise the economical task completion surface.",
    workspace: { root, readPaths: [], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Do only the declared bounded work."],
    capabilities: [],
    capabilitiesRequired: [],
    acceptance: ["The task state is retained as non-authoritative process evidence."],
    tasks: [{ subject: "Return the bounded result", description: "Return only the bounded result." }],
    budget: { maxSteps: 3, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  expect(record.status).toBe("passed");
  expect(record.tasks).toEqual([expect.objectContaining({ id: "task-1", subject: "Return the bounded result", status: "completed" })]);
  expect(record.verification.tasks).toMatchObject({ passed: true, completed: 1 });
  expect(JSON.stringify(firstRequest)).toContain("Return the bounded result");
  expect(record.trace).toContainEqual(expect.objectContaining({ type: "task.updated" }));
});

test("lets an unseeded Cell create and settle a task cycle when complexity emerges", async () => {
  const root = await fixture();
  let calls = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async () => {
      calls += 1;
      if (calls === 1) {
        return response([{
          type: "tool-call",
          toolCallId: "create-inspection-task",
          toolName: "task_create",
          input: JSON.stringify({
            subject: "Inspect the supplied context",
            description: "Inspect only the supplied context.",
            blockedBy: [],
          }),
        }, {
          type: "tool-call",
          toolCallId: "create-result-task",
          toolName: "task_create",
          input: JSON.stringify({
            subject: "Return the bounded result",
            description: "Return the bounded result after inspection.",
            blockedBy: ["task-1"],
          }),
        }], "tool-calls");
      }
      if (calls === 2) {
        return response([{
          type: "tool-call",
          toolCallId: "complete-inspection-task",
          toolName: "task_update",
          input: JSON.stringify({ taskId: "task-1", status: "completed" }),
        }, {
          type: "tool-call",
          toolCallId: "complete-result-task",
          toolName: "task_update",
          input: JSON.stringify({ taskId: "task-2", status: "completed" }),
        }], "tool-calls");
      }
      return response([{ type: "text", text: "Bounded work completed." }], "stop");
    },
  });
  const driver = new AiSdkValidationDriver({
    route: explicitDeepSeekRoute(),
    deepSeekApiKey: "not-used",
    model: "mock-dynamic-task",
  });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "dynamic-task",
    intent: "Track discovered multi-step work without a caller seed.",
    workspace: { root, readPaths: [], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Use tasks only if they improve execution."],
    acceptance: ["The dynamic task cycle settles before completion."],
    budget: { maxSteps: 4, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  expect(record.status).toBe("passed");
  expect(record.tasks).toHaveLength(2);
  expect(record.verification.tasks).toMatchObject({ passed: true, completed: 2 });
  expect(record.trace.filter((event) => event.type === "task.created")).toHaveLength(2);
  expect(record.trace.filter((event) => event.type === "task.updated")).toHaveLength(2);
});

test("forces the sole terminal tool before the step limit and blocks late ordinary actions", async () => {
  const root = await fixture();
  let calls = 0;
  const observedToolChoices: unknown[] = [];
  const model = new MockLanguageModelV3({
    doGenerate: async (options) => {
      calls += 1;
      observedToolChoices.push(options.toolChoice);
      if (calls <= 3) {
        return response([{
          type: "tool-call",
          toolCallId: `read-${calls}`,
          toolName: "read_file",
          input: JSON.stringify({ path: "principles/SEQUENCE.md" }),
        }], "tool-calls");
      }
      if (calls === 4) {
        return response([{
          type: "tool-call",
          toolCallId: "terminal",
          toolName: "submit_review",
          input: JSON.stringify({ verdict: "ready" }),
        }], "tool-calls");
      }
      throw new Error(`unexpected mock call ${calls}`);
    },
  });
  const driver = new AiSdkValidationDriver({ route: explicitDeepSeekRoute(), deepSeekApiKey: "not-used", model: "mock-terminal-action" });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "terminal-action-rehearsal",
    intent: "Exercise the bounded terminal action phase.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Submit the review after investigating."],
    capabilities: ["read"],
    capabilitiesRequired: ["read"],
    acceptance: ["Late ordinary actions are rejected and one terminal tool ends the loop."],
    terminalTools: [{
      name: "submit_review",
      description: "Submit the review verdict.",
      inputSchema: {
        type: "object",
        properties: { verdict: { type: "string", enum: ["ready", "hold"] } },
        required: ["verdict"],
        additionalProperties: false,
      },
    }],
    budget: { maxSteps: 4, estimatedTokens: 1_000, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  expect(record.status).toBe("passed");
  expect(record.verification.terminal).toMatchObject({ passed: true, called: ["submit_review"] });
  expect(record.trace.some((event) => event.type === "terminal.contract.recovery")).toBe(false);
  expect(record.trace.filter((event) => event.type === "tool.read_file")).toHaveLength(3);
  expect(observedToolChoices.slice(3)).toEqual([
    { type: "tool", toolName: "submit_review" },
  ]);
  expect(record.finalText).toContain("Terminal contract satisfied during execution");
  expect(calls).toBe(4);
});

test("falls back inside one agent loop without replaying an earlier tool action", async () => {
  const root = await fixture();
  let primaryCalls = 0;
  let fallbackCalls = 0;
  const primary = new MockLanguageModelV4({
    provider: "opencode-go",
    doGenerate: async () => {
      primaryCalls += 1;
      if (primaryCalls === 1) return responseV4([{
        type: "tool-call",
        toolCallId: "read-once",
        toolName: "read_file",
        input: JSON.stringify({ path: "principles/SEQUENCE.md" }),
      }], "tool-calls");
      throw new APICallError({
        message: "allowance unavailable",
        url: "https://opencode.ai/zen/go/v1/chat/completions",
        requestBodyValues: {},
        statusCode: 429,
        isRetryable: true,
      });
    },
  });
  const fallback = new MockLanguageModelV4({
    provider: "deepseek",
    doGenerate: async () => {
      fallbackCalls += 1;
      return responseV4([{
        type: "tool-call",
        toolCallId: "terminal",
        toolName: "submit_review",
        input: JSON.stringify({ verdict: "ready" }),
      }], "tool-calls");
    },
  });
  const driver = new AiSdkValidationDriver({
    route: explicitDeepSeekRoute(),
    deepSeekApiKey: "not-used",
    opencodeApiKey: "not-used",
    model: "mock-failover",
  });
  Object.defineProperty(driver, "model", {
    value: createRoutedLanguageModel({
      id: "driver-test",
      targets: [
        { id: "preferred-test", model: primary, fallbackOn: () => ({ reason: "capacity_unavailable" }) },
        { id: "fallback-test", model: fallback },
      ],
    }),
  });

  const record = await runCell({
    id: "provider-failover-rehearsal",
    intent: "Read once, then submit the review without replaying work.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Read the Sequence and submit the review."],
    capabilities: ["read"],
    capabilitiesRequired: ["read"],
    acceptance: ["One provider failure does not replay an earlier tool action."],
    terminalTools: [{
      name: "submit_review",
      description: "Submit the review verdict.",
      inputSchema: {
        type: "object",
        properties: { verdict: { type: "string", enum: ["ready"] } },
        required: ["verdict"],
        additionalProperties: false,
      },
    }],
    budget: { maxSteps: 3, estimatedTokens: 1_000, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  expect(record.status).toBe("passed");
  expect(record.trace.filter((event) => event.type === "tool.read_file")).toHaveLength(1);
  expect(record.trace.find((event) => event.type === "agent.step.finished")?.data).toMatchObject({
    providerMetadata: {
      workCellRoute: { routeId: "driver-test", servedBy: "preferred-test", mode: "preferred" },
    },
  });
  expect(record.trace.filter((event) => event.type === "agent.step.finished")[1]?.data).toMatchObject({
    providerMetadata: {
      workCellRoute: { routeId: "driver-test", servedBy: "fallback-test", mode: "fallback" },
    },
  });
  expect(primaryCalls).toBe(2);
  expect(fallbackCalls).toBe(1);
});

test("retains provider-metadata cache usage when a later model step fails", async () => {
  const root = await fixture();
  let calls = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async () => {
      calls += 1;
      if (calls === 1) {
        return {
          ...response([{
            type: "tool-call",
            toolCallId: "read-before-failure",
            toolName: "read_file",
            input: JSON.stringify({ path: "principles/SEQUENCE.md" }),
          }], "tool-calls"),
          providerMetadata: {
            arbitraryProvider: { promptCacheHitTokens: 1 },
          },
        };
      }
      throw new Error("provider failed after the retained step");
    },
  });
  const driver = new AiSdkValidationDriver({
    route: explicitDeepSeekRoute(),
    deepSeekApiKey: "not-used",
    model: "mock-provider-metadata-usage",
  });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "provider-metadata-usage-on-error",
    intent: "Retain observed cache usage if a later model step fails.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Read once, then continue."],
    capabilities: ["read"],
    capabilitiesRequired: ["read"],
    acceptance: ["The failed Cell retains usage from its completed model step."],
    budget: { maxSteps: 3, estimatedTokens: 1_000, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  expect(record.status).toBe("failed");
  expect(record.usage).toMatchObject({
    inputTokens: 1,
    outputTokens: 1,
    totalTokens: 2,
    cachedInputTokens: 1,
  });
});

test("terminal recovery preserves successful evidence after a provider repeats an ordinary tool", async () => {
  const root = await fixture();
  let calls = 0;
  let recoveryRequest: unknown;
  const model = new MockLanguageModelV3({
    doGenerate: async (options) => {
      calls += 1;
      if (calls <= 3) return response([{
        type: "tool-call",
        toolCallId: `read-${calls}`,
        toolName: "read_file",
        input: JSON.stringify({ path: "principles/SEQUENCE.md" }),
      }], "tool-calls");
      // The main loop ends naturally on the fourth step; the shared explicit
      // maxSteps allowance keeps exactly one step for terminal recovery.
      if (calls === 4) return response([{ type: "text", text: "Main investigation stopped before the terminal tool." }], "stop");
      if (calls === 5) {
        recoveryRequest = options;
        return response([{
          type: "tool-call",
          toolCallId: "terminal",
          toolName: "submit_review",
          input: JSON.stringify({ verdict: "bounded" }),
        }], "tool-calls");
      }
      throw new Error(`unexpected mock call ${calls}`);
    },
  });
  const driver = new AiSdkValidationDriver({ route: explicitDeepSeekRoute(), deepSeekApiKey: "not-used", model: "mock-late-action-recovery" });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "late-action-recovery",
    intent: "Retain evidence when the provider ignores the terminal-only tool surface.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Read, then submit the bounded result."],
    capabilities: ["read"],
    capabilitiesRequired: ["read"],
    acceptance: ["Earlier successful reads remain available during terminal recovery."],
    terminalTools: [{
      name: "submit_review",
      description: "Submit the review verdict.",
      inputSchema: {
        type: "object",
        properties: { verdict: { type: "string", enum: ["bounded"] } },
        required: ["verdict"],
        additionalProperties: false,
      },
    }],
    budget: { maxSteps: 5, estimatedTokens: 1_000, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  expect(record.status).toBe("passed");
  expect(record.trace.filter((event) => event.type === "tool.read_file")).toHaveLength(3);
  expect(record.trace.some((event) => event.type === "terminal.contract.recovery")).toBe(true);
  const serializedRecoveryRequest = JSON.stringify(recoveryRequest);
  expect(serializedRecoveryRequest).toContain("compact projection of successful tool results");
  expect(serializedRecoveryRequest).toContain("prior assistant reasoning");
  expect(serializedRecoveryRequest).not.toContain("complete prior transcript");
  expect(serializedRecoveryRequest).toContain("Read, then submit the bounded result");
  expect(serializedRecoveryRequest).toContain("P04｜主要矛盾｜矛盾论");
  expect(serializedRecoveryRequest.split("P04｜主要矛盾｜矛盾论")).toHaveLength(2);
  expect(calls).toBe(5);
});

test("rejects more than one terminal tool call", async () => {
  const root = await fixture();
  const model = new MockLanguageModelV3({
    doGenerate: async () => response([
      { type: "tool-call", toolCallId: "first", toolName: "approve", input: "{}" },
      { type: "tool-call", toolCallId: "second", toolName: "reject", input: "{}" },
    ], "tool-calls"),
  });
  const driver = new AiSdkValidationDriver({ route: explicitDeepSeekRoute(), deepSeekApiKey: "not-used", model: "mock-terminal-one-of" });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "terminal-one-of-rehearsal",
    intent: "Exercise exactly-one terminal semantics.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Choose one terminal disposition."],
    capabilities: ["read"],
    capabilitiesRequired: ["read"],
    acceptance: ["Calling two terminal tools is a protocol failure."],
    terminalTools: [
      { name: "approve", description: "Approve.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
      { name: "reject", description: "Reject.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
    ],
    budget: { maxSteps: 2, estimatedTokens: 1_000, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  expect(record.status).toBe("protocol_error");
  expect(record.error).toContain("expected exactly one terminal tool call");
  expect(record.trace.some((event) => event.type === "terminal.contract.violation")).toBe(true);
});

test("rejects terminal tools that collide with AI SDK execution tools before model dispatch", async () => {
  const root = await fixture();
  let calls = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async () => {
      calls += 1;
      throw new Error("model dispatch should not occur");
    },
  });
  const driver = new AiSdkValidationDriver({ route: explicitDeepSeekRoute(), deepSeekApiKey: "not-used", model: "mock-terminal-collision" });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "terminal-tool-collision",
    intent: "Reject an ambiguous execution and terminal tool surface.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Do not dispatch the model."],
    capabilities: ["read"],
    capabilitiesRequired: ["read"],
    acceptance: ["Tool-name collisions fail before model dispatch."],
    terminalTools: [{
      name: "read_file",
      description: "Ambiguous terminal action.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    }],
    budget: { maxSteps: 2, estimatedTokens: 1_000, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  expect(record.status).toBe("failed");
  expect(record.error).toContain("terminal tool names conflict with AI SDK execution tools: read_file");
  expect(calls).toBe(0);
});

test("allows settle_now and request_budget as caller-owned terminal names", async () => {
  const root = await fixture();
  for (const name of ["settle_now", "request_budget"] as const) {
    let calls = 0;
    const model = new MockLanguageModelV3({
      doGenerate: async () => {
        calls += 1;
        return response([{
          type: "tool-call",
          toolCallId: `caller-${name}`,
          toolName: name,
          input: "{}",
        }], "tool-calls");
      },
    });
    const driver = new AiSdkValidationDriver({ route: explicitDeepSeekRoute(), deepSeekApiKey: "not-used", model: `mock-caller-${name}` });
    Object.defineProperty(driver, "model", { value: model });

    const record = await runCell({
      id: `caller-terminal-${name}`,
      intent: "Preserve caller ownership of a terminal name.",
      workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
      instructions: ["Invoke the caller-owned terminal."],
      capabilities: ["read"],
      capabilitiesRequired: ["read"],
      acceptance: ["The terminal remains callable."],
      terminalTools: [{
        name,
        description: "Caller-owned terminal action.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      }],
      budget: { maxSteps: 2, estimatedTokens: 1_000, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
    }, driver);

    expect(record.status).toBe("passed");
    expect(record.verification.terminal.called).toEqual([name]);
    expect(calls).toBe(1);
  }
});

test("a no-maxSteps Cell completes more than 20 tool steps with no step-count stop condition", async () => {
  const root = await fixture();
  let calls = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async () => {
      calls += 1;
      if (calls <= 25) {
        return response([{
          type: "tool-call",
          toolCallId: `read-${calls}`,
          toolName: "read_file",
          input: JSON.stringify({ path: "principles/SEQUENCE.md" }),
        }], "tool-calls");
      }
      return response([{ type: "text", text: "Investigation completed." }], "stop");
    },
  });
  const driver = new AiSdkValidationDriver({
    route: explicitDeepSeekRoute(),
    deepSeekApiKey: "not-used",
    model: "mock-no-maxsteps-long",
  });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "no-maxsteps-long-run",
    intent: "Continue for as many tool steps as the work needs.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Read repeatedly, then finish with one final report."],
    capabilities: ["read"],
    capabilitiesRequired: ["read"],
    acceptance: ["More than twenty tool steps complete with a normal terminal."],
    budget: { maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  expect(record.status).toBe("passed");
  expect(record.trace.filter((event) => event.type === "tool.read_file")).toHaveLength(25);
  expect(record.trace.filter((event) => event.type === "agent.step.finished")).toHaveLength(26);
  expect(record.input.budget.maxSteps).toBeUndefined();
  expect(calls).toBe(26);
});

test("an explicit maxSteps stops the loop exactly at the declared step count", async () => {
  const root = await fixture();
  let calls = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async () => {
      calls += 1;
      return response([{
        type: "tool-call",
        toolCallId: `read-${calls}`,
        toolName: "read_file",
        input: JSON.stringify({ path: "principles/SEQUENCE.md" }),
      }], "tool-calls");
    },
  });
  const driver = new AiSdkValidationDriver({
    route: explicitDeepSeekRoute(),
    deepSeekApiKey: "not-used",
    model: "mock-explicit-maxsteps-stop",
  });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "explicit-maxsteps-stop",
    intent: "Stop exactly at the explicit finite step policy.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Read until the declared step count ends the loop."],
    capabilities: ["read"],
    capabilitiesRequired: ["read"],
    acceptance: ["The loop stops exactly at the explicit maxSteps."],
    budget: { maxSteps: 3, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  expect(record.status).toBe("passed");
  expect(record.trace.filter((event) => event.type === "tool.read_file")).toHaveLength(3);
  expect(calls).toBe(3);
});

test("a no-terminal Cell preserves the actual provider error when the explicit maxSteps allowance is exhausted", async () => {
  const root = await fixture();
  let calls = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async () => {
      calls += 1;
      // The first allowed step performs an ordinary non-terminal tool call so
      // the loop really continues toward the second provider call; a tool-free
      // stop on step one would end the agent before the throw and make the
      // regression false coverage.
      if (calls === 1) {
        return response([{
          type: "tool-call",
          toolCallId: "read-before-exhaustion",
          toolName: "read_file",
          input: JSON.stringify({ path: "principles/SEQUENCE.md" }),
        }], "tool-calls");
      }
      // The second and final allowed provider step throws: the allowance is
      // exhausted, but a Cell without declared terminal tools must preserve
      // the actual provider error instead of reporting terminal-tool failure.
      throw new Error("provider connection reset after the allowance was consumed");
    },
  });
  const driver = new AiSdkValidationDriver({
    route: explicitDeepSeekRoute(),
    deepSeekApiKey: "not-used",
    model: "mock-no-terminal-exhausted-error",
  });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "no-terminal-exhausted-provider-error",
    intent: "Prove a no-terminal Cell keeps the provider error at exhaustion.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Return a concise report."],
    capabilities: ["read"],
    capabilitiesRequired: ["read"],
    acceptance: ["The actual provider error is retained when the allowance runs out."],
    budget: { maxSteps: 2, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  expect(record.status).toBe("failed");
  expect(record.error).toContain("provider connection reset after the allowance was consumed");
  expect(record.error).not.toContain("terminal-tool contract");
  // Both allowed steps really executed: the ordinary tool call on step one and
  // the throwing provider call on the final allowed step.
  expect(record.trace.filter((event) => event.type === "tool.read_file")).toHaveLength(1);
  expect(record.trace.filter((event) => event.type === "agent.step.finished")).toHaveLength(1);
  expect(calls).toBe(2);
});

test("a declared-terminal provider error at the final allowed step retains its real causal error", async () => {
  const root = await fixture();
  let calls = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async () => {
      calls += 1;
      if (calls === 1) {
        return response([{
          type: "tool-call",
          toolCallId: "read-before-bound",
          toolName: "read_file",
          input: JSON.stringify({ path: "principles/SEQUENCE.md" }),
        }], "tool-calls");
      }
      // The second and final allowed provider step throws while the declared
      // terminal contract is still open. This is an arbitrary provider throw,
      // not a normally completed or explicitly step-stopped unsatisfied loop:
      // the real causal error must be retained instead of being relabeled as
      // terminal-contract exhaustion.
      throw new Error("provider transport failed at the final allowed step");
    },
  });
  const driver = new AiSdkValidationDriver({
    route: explicitDeepSeekRoute(),
    deepSeekApiKey: "not-used",
    model: "mock-declared-terminal-bound-error",
  });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "declared-terminal-bound-error",
    intent: "Prove a real provider error at the allowance bound keeps its causal message.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Read, then finish."],
    capabilities: ["read"],
    capabilitiesRequired: ["read"],
    acceptance: ["The provider error is retained even though the terminal contract is still open."],
    terminalTools: [{
      name: "submit_review",
      description: "Signal review completion.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    }],
    budget: { maxSteps: 2, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  expect(record.status).toBe("failed");
  expect(record.error).toContain("provider transport failed at the final allowed step");
  expect(record.error).not.toContain("terminal-tool contract");
  expect(record.error).not.toContain("step budget exhausted");
  expect(record.trace.filter((event) => event.type === "tool.read_file")).toHaveLength(1);
  // Both allowed steps were attempted: the ordinary read and the throwing
  // final provider call; no terminal recovery phase starts after the throw.
  expect(record.trace.filter((event) => event.type === "agent.step.started")).toHaveLength(2);
  expect(record.trace.some((event) => event.type === "terminal.contract.recovery")).toBe(false);
  expect(calls).toBe(2);
});

test("retains an accepted terminal action on the single final allowed step of a terminal-only Cell", async () => {
  const root = await fixture();
  let calls = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async () => {
      calls += 1;
      return response([{
        type: "tool-call",
        toolCallId: "terminal-only-step",
        toolName: "finish_work",
        input: "{}",
      }], "tool-calls");
    },
  });
  const driver = new AiSdkValidationDriver({
    route: explicitDeepSeekRoute(),
    deepSeekApiKey: "not-used",
    model: "mock-terminal-only-one-step",
  });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "terminal-only-one-step",
    intent: "Prove a terminal-only Cell completes on its single allowed step.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Invoke the declared terminal tool."],
    capabilities: ["read"],
    capabilitiesRequired: ["read"],
    acceptance: ["The accepted terminal action is retained on the final allowed step."],
    terminalTools: [{
      name: "finish_work",
      description: "Finish the bounded work.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    }],
    budget: { maxSteps: 1, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  // maxSteps=1 is the exact bound: the single allowed step performs the
  // accepted terminal action, the loop stops right after it, and no second
  // provider call ever starts.
  expect(record.status).toBe("passed");
  expect(record.verification.terminal).toEqual({
    passed: true,
    required: ["finish_work"],
    called: ["finish_work"],
  });
  expect(record.finalText).toContain("Terminal contract satisfied during execution through finish_work");
  expect(record.trace.some((event) => event.type === "terminal.contract.recovery")).toBe(false);
  expect(record.trace.filter((event) => event.type === "agent.step.finished")).toHaveLength(1);
  expect(record.error).toBeUndefined();
  expect(calls).toBe(1);
});

test("terminal recovery consumes the shared maxSteps allowance and fails truthfully when no step remains", async () => {
  const root = await fixture();
  let calls = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async () => {
      calls += 1;
      if (calls === 1) return response([{ type: "text", text: "Main loop finished without the terminal tool." }], "stop");
      return response([{ type: "text", text: "Recovery must not start another provider step." }], "stop");
    },
  });
  const driver = new AiSdkValidationDriver({
    route: explicitDeepSeekRoute(),
    deepSeekApiKey: "not-used",
    model: "mock-shared-step-allowance",
  });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "shared-step-allowance-recovery",
    intent: "Prove terminal recovery consumes the same explicit maxSteps allowance.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Return a concise report."],
    capabilities: ["read"],
    capabilitiesRequired: ["read"],
    acceptance: ["Total model calls never exceed the explicit maxSteps."],
    terminalTools: [{
      name: "submit_review",
      description: "Signal review completion.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    }],
    budget: { maxSteps: 2, estimatedTokens: 1_000, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  // An unsatisfied declared terminal contract keeps the canonical protocol
  // standing even when the shared explicit step allowance caused it.
  expect(record.status).toBe("protocol_error");
  expect(record.error).toContain("Work Cell step budget exhausted after 2 steps");
  expect(record.error).toContain("the terminal-tool contract was not satisfied");
  expect(record.trace.some((event) => event.type === "terminal.contract.recovery")).toBe(true);
  expect(calls).toBe(2);
});

test("one remaining step permits at most one structured settlement attempt", async () => {
  const root = await fixture();
  let calls = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async () => {
      calls += 1;
      return response([{ type: "text", text: "Not a settlement tool call." }], "stop");
    },
  });
  const driver = new AiSdkValidationDriver({
    route: explicitKimiRoute(),
    kimiApiKey: "not-used",
    model: "k3",
  });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "one-step-one-settlement-attempt",
    intent: "Prove a single remaining step permits at most one settlement attempt.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Return the structured result."],
    capabilities: ["read"],
    capabilitiesRequired: ["read"],
    acceptance: ["The settlement never exceeds the shared maxSteps allowance."],
    outputSchema: {
      type: "object",
      properties: { decision: { type: "string", enum: ["P04"] } },
      required: ["decision"],
      additionalProperties: false,
    },
    budget: { maxSteps: 2, estimatedTokens: 1_000, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  expect(record.status).toBe("failed");
  expect(record.error).toContain("Work Cell step budget exhausted");
  expect(calls).toBe(2);
  const failedAttempts = record.trace.filter((event) => event.type === "structured.settlement.attempt.failed");
  expect(failedAttempts).toHaveLength(2);
  expect(failedAttempts[1]?.data).toMatchObject({
    attempt: 2,
    error: "Work Cell step budget exhausted after 2 steps; the structured output contract cannot be settled",
  });
});

test("a settlement provider throw after the final allowed step keeps its real causal error", async () => {
  const root = await fixture();
  let calls = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async () => {
      calls += 1;
      // Main execution ends naturally on the first allowed step, consuming
      // one of the two explicit steps.
      if (calls === 1) {
        return response([{ type: "text", text: "Main investigation completed." }], "stop");
      }
      // The second and final allowed step is the settlement provider call:
      // it throws after its onStepStart consumed the shared allowance. The
      // actual thrown error must be retained; it is never relabeled as
      // step-budget exhaustion merely because the allowance is now exhausted.
      throw new Error("provider transport failed");
    },
  });
  const driver = new AiSdkValidationDriver({
    route: explicitKimiRoute(),
    kimiApiKey: "not-used",
    model: "k3",
  });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "settlement-provider-error-at-bound",
    intent: "Prove a settlement provider throw keeps its causal error at the allowance bound.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Return the structured result."],
    capabilities: ["read"],
    capabilitiesRequired: ["read"],
    acceptance: ["The settlement provider error is retained."],
    outputSchema: {
      type: "object",
      properties: { decision: { type: "string", enum: ["P04"] } },
      required: ["decision"],
      additionalProperties: false,
    },
    budget: { maxSteps: 2, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  // Main execution consumed one of the two allowed steps; settlement started
  // and consumed the second, then its provider call threw. The final Cell
  // failure retains that exact causal error and does not report step-budget
  // exhaustion, and no third provider call ever starts.
  expect(record.status).toBe("failed");
  expect(record.error).toBe("provider transport failed");
  expect(record.error).not.toContain("step budget exhausted");
  expect(calls).toBe(2);
  expect(record.usage.totalTokens).toBe(2);
  expect(record.trace.some((event) => event.type === "structured.settlement.started")).toBe(true);
  expect(record.trace.some((event) => event.type === "structured.settlement.finished")).toBe(false);
  // Exactly one settlement attempt ran: the throw happened after the final
  // allowed step was consumed, so the loop ended there instead of starting a
  // second attempt that could not run anyway.
  const failedAttempts = record.trace.filter((event) => event.type === "structured.settlement.attempt.failed");
  expect(failedAttempts).toHaveLength(1);
  expect(failedAttempts[0]?.data).toEqual({
    attempt: 1,
    error: "provider transport failed",
  });
});

test("stops the main loop after one structured output step following a terminal call", async () => {
  const root = await fixture();
  let calls = 0;
  let mainRequest: unknown;
  let outputRequest: unknown;
  const model = new MockLanguageModelV3({
    doGenerate: async (options) => {
      calls += 1;
      if (calls === 1) {
        mainRequest = options;
        return response([{
          type: "tool-call",
          toolCallId: "terminal",
          toolName: "submit_review",
          input: "{}",
        }], "tool-calls");
      }
      if (calls === 2) {
        outputRequest = options;
        return response([{
          type: "text",
          text: JSON.stringify({ recommendation: "proceed" }),
        }], "stop");
      }
      throw new Error(`unexpected extra main-loop call ${calls}`);
    },
  });
  const driver = new AiSdkValidationDriver({
    route: explicitDeepSeekRoute(),
    deepSeekApiKey: "not-used",
    deepSeekStructuredOutputMode: "inline",
    model: "mock-main-output",
  });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "main-terminal-output-rehearsal",
    intent: "Exercise simultaneous terminal and structured-output contracts.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Submit, then return the independent recommendation."],
    capabilities: ["read"],
    capabilitiesRequired: ["read"],
    acceptance: ["One terminal action is followed by exactly one output step."],
    terminalTools: [{
      name: "submit_review",
      description: "Submit the completed review.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    }],
    outputSchema: {
      type: "object",
      properties: { recommendation: { type: "string", enum: ["proceed", "hold"] } },
      required: ["recommendation"],
      additionalProperties: false,
    },
    budget: { maxSteps: 2, estimatedTokens: 1_000, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  // The explicit maxSteps equals the actual total provider steps: the main
  // loop stops right after the accepted terminal tool and the closure phase
  // performs exactly one tool-free structured-output step. The Cell passes
  // and never starts an extra provider step.
  expect(record.status).toBe("passed");
  expect(record.output).toEqual({ recommendation: "proceed" });
  expect(record.trace.some((event) => event.type === "terminal.contract.recovery")).toBe(false);
  // The main loop emitted its own step-finished event for the terminal action;
  // the output-only closure step carries the distinct structured-output event
  // and is never mislabeled as terminal recovery.
  expect(record.trace.filter((event) => event.type === "terminal.recovery.step.finished")).toHaveLength(0);
  expect(record.trace.filter((event) => event.type === "structured.output.step.finished")).toHaveLength(1);
  expect(record.trace.filter((event) => event.type === "agent.step.finished"
    || event.type === "terminal.recovery.step.finished"
    || event.type === "structured.output.step.finished")).toHaveLength(2);
  // Prompt truth: the main phase defers the final structured output to the
  // existing closure and never tells the main model to return it, while the
  // output-only closure states the terminal is already satisfied, exposes no
  // tools, and requests only the final structured output without asking for
  // another terminal invocation.
  const serializedMainRequest = JSON.stringify(mainRequest);
  expect(serializedMainRequest).toContain("A separate closure phase will collect the final structured output");
  expect(serializedMainRequest).not.toContain("Return a final structured output");
  const serializedOutputRequest = JSON.stringify(outputRequest);
  expect(serializedOutputRequest).toContain("The declared terminal tool was already accepted");
  expect(serializedOutputRequest).toContain("Return the final structured output now");
  expect(serializedOutputRequest).not.toContain("Finish by invoking exactly one declared terminal tool");
  expect(record.error).toBeUndefined();
  expect(calls).toBe(2);
});

test("defers unsupported structured output until after tool-grounded investigation", async () => {
  const root = await fixture();
  let calls = 0;
  const responseFormats: unknown[] = [];
  const model = new MockLanguageModelV3({
    doGenerate: async (options) => {
      calls += 1;
      responseFormats.push(options.responseFormat);
      if (calls === 1) return response([{
        type: "tool-call",
        toolCallId: "read-evidence",
        toolName: "read_file",
        input: JSON.stringify({ path: "principles/SEQUENCE.md" }),
      }], "tool-calls");
      if (calls === 2) return response([{
        type: "tool-call",
        toolCallId: "submit-investigation",
        toolName: "submit_review",
        input: "{}",
      }], "tool-calls");
      if (calls === 3) return response([{
        type: "text",
        text: "I should format this before calling the settlement tool.",
      }], "stop");
      if (calls === 4) return response([{
        type: "tool-call",
        toolCallId: "settle-output",
        toolName: "emit_structured_output",
        input: JSON.stringify({ decision: "P04", evidence: "principles/SEQUENCE.md" }),
      }], "tool-calls");
      throw new Error(`unexpected mock call ${calls}`);
    },
  });
  const driver = new AiSdkValidationDriver({
    route: explicitKimiRoute(),
    kimiApiKey: "not-used",
    model: "k3",
  });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "deferred-structured-output",
    intent: "Investigate before structured settlement.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Read the source before deciding."],
    capabilities: ["read"],
    capabilitiesRequired: ["read"],
    acceptance: ["The output is grounded in the retained source."],
    terminalTools: [{
      name: "submit_review",
      description: "Signal that source investigation is complete.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    }],
    outputSchema: {
      type: "object",
      properties: {
        decision: { type: "string", enum: ["P04"] },
        evidence: { type: "string" },
      },
      required: ["decision", "evidence"],
      additionalProperties: false,
    },
    budget: { maxSteps: 4, estimatedTokens: 1_000, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  expect(record.status).toBe("passed");
  expect(record.output).toEqual({ decision: "P04", evidence: "principles/SEQUENCE.md" });
  expect(record.verification.terminal).toMatchObject({ passed: true, called: ["submit_review"] });
  expect(record.trace.filter((event) => event.type === "tool.read_file")).toHaveLength(1);
  expect(record.trace.some((event) => event.type === "structured.settlement.started")).toBe(true);
  expect(record.trace.some((event) => event.type === "structured.settlement.attempt.failed")).toBe(true);
  expect(record.trace.some((event) => event.type === "structured.settlement.finished")).toBe(true);
  expect(responseFormats).toEqual([undefined, undefined, undefined, undefined]);
  expect(calls).toBe(4);
});

test("recovers structured output after a terminal tool and retains all usage", async () => {
  const root = await fixture();
  let calls = 0;
  let recoveryPrompt: unknown;
  let firstRequest: unknown;
  let finalOutputRequest: unknown;
  const outputLimits: Array<number | undefined> = [];
  const model = new MockLanguageModelV3({
    doGenerate: async (options) => {
      calls += 1;
      outputLimits.push(options.maxOutputTokens);
      if (calls === 1) firstRequest = options;
      if (calls <= 3) return response([{
        type: "tool-call",
        toolCallId: `read-${calls}`,
        toolName: "read_file",
        input: JSON.stringify({ path: "principles/SEQUENCE.md" }),
      }], "tool-calls");
      // The main loop ends naturally on the fourth step; the shared explicit
      // maxSteps allowance keeps three steps for terminal recovery (invalid
      // payload, accepted terminal, final output).
      if (calls === 4) return response([{ type: "text", text: "Main investigation stopped before the terminal tool." }], "stop");
      if (calls === 5) {
        recoveryPrompt = options.prompt;
        return response([{
          type: "tool-call",
          toolCallId: "invalid-terminal",
          toolName: "submit_review",
          input: JSON.stringify({ unexpected: true }),
        }], "tool-calls");
      }
      if (calls === 6) return response([{
        type: "tool-call",
        toolCallId: "valid-terminal",
        toolName: "submit_review",
        input: "{}",
      }], "tool-calls");
      if (calls === 7) {
        finalOutputRequest = options;
        return response([{ type: "text", text: JSON.stringify({ recommendation: "hold", reason: "One boundary remains unverified." }) }], "stop");
      }
      throw new Error(`unexpected mock call ${calls}`);
    },
  });
  const driver = new AiSdkValidationDriver({
    route: explicitDeepSeekRoute(),
    deepSeekApiKey: "not-used",
    deepSeekStructuredOutputMode: "inline",
    model: "mock-structured-recovery",
  });
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "structured-recovery-rehearsal",
    intent: "Exercise structured output after terminal recovery.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    instructions: ["Return the review decision."],
    capabilities: ["read"],
    capabilitiesRequired: ["read"],
    acceptance: ["The recovered result satisfies both contracts."],
    terminalTools: [{
      name: "submit_review",
      description: "Signal review completion.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    }],
    outputSchema: {
      type: "object",
      properties: {
        recommendation: { type: "string", enum: ["proceed", "hold"] },
        reason: { type: "string" },
      },
      required: ["recommendation", "reason"],
      additionalProperties: false,
    },
    budget: { maxSteps: 7, estimatedTokens: 1_000, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  expect(record.status).toBe("passed");
  expect(record.output).toEqual({ recommendation: "hold", reason: "One boundary remains unverified." });
  expect(record.verification).toMatchObject({
    passed: true,
    terminal: { passed: true, called: ["submit_review"] },
    output: { passed: true },
  });
  expect(record.usage).toEqual({ inputTokens: 7, outputTokens: 7, totalTokens: 14, cachedInputTokens: 0 });
  expect(JSON.stringify(recoveryPrompt)).toContain("read_file");
  expect(JSON.stringify(recoveryPrompt)).toContain("principles/SEQUENCE.md");
  expect(outputLimits).toEqual(Array(7).fill(16_000));
  expect(calls).toBe(7);
  // Discriminating step boundary: exactly the seven provider steps ran and
  // finished — the main loop ended at its fourth step, recovery and the final
  // allowed step completed with the output, and no eighth step ever started.
  // The completed final allowed step is retained as the Cell result, never
  // discarded or relabeled by the exhausted allowance.
  expect(record.trace.filter((event) => event.type === "agent.step.started")).toHaveLength(4);
  // Only the two steps that began with the terminal contract still open are
  // actual terminal recovery; the final allowed step began with the terminal
  // already accepted and carries the distinct output-only structured-output
  // event, never a recovery label.
  expect(record.trace.filter((event) => event.type === "terminal.recovery.step.finished")).toHaveLength(2);
  expect(record.trace.filter((event) => event.type === "structured.output.step.finished")).toHaveLength(1);
  expect(record.trace.filter((event) => event.type === "agent.step.finished"
    || event.type === "terminal.recovery.step.finished"
    || event.type === "structured.output.step.finished")).toHaveLength(7);
  // Prompt truth: the main phase defers the final structured output to the
  // existing closure and never tells the main model to return it, and the
  // output-only final allowed step states the terminal is already satisfied
  // without asking for another terminal invocation.
  const serializedFirstRequest = JSON.stringify(firstRequest);
  expect(serializedFirstRequest).toContain("A separate closure phase will collect the final structured output");
  expect(serializedFirstRequest).not.toContain("Return a final structured output");
  const serializedFinalOutputRequest = JSON.stringify(finalOutputRequest);
  expect(serializedFinalOutputRequest).toContain("The declared terminal tool was already accepted");
  expect(serializedFinalOutputRequest).not.toContain("Finish by invoking exactly one declared terminal tool");
  expect(record.error).toBeUndefined();
});

test("activation adapter retries one malformed structured impulse and retains its usage", async () => {
  let calls = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async () => {
      calls += 1;
      if (calls === 1) return response([{ type: "text", text: "not-json" }], "stop");
      if (calls === 2) return response([{ type: "text", text: JSON.stringify({
        impulse: "shared current",
        relation: "capacity moves through a common channel",
        predictedConsequence: "a later coalition can connect flow with repair",
        disconfirmingObservation: "the relation disappears outside the channel metaphor",
      }) }], "stop");
      throw new Error(`unexpected mock call ${calls}`);
    },
  });
  const driver = new AiSdkActivationFieldDriver({ route: explicitDeepSeekRoute(), deepSeekApiKey: "not-used", model: "mock-activation-recovery" });
  Object.defineProperty(driver, "model", { value: model });

  const result = await driver.activate({
    stimulus: "Find one local relation.",
    snapshot: "Immutable evidence.",
    receptor: { id: "flow", instructions: "Attend to flow.", principlePids: [] },
    sample: 1,
  });

  expect(calls).toBe(2);
  expect(result.value.impulse).toBe("shared current");
  expect(result.usage.totalTokens).toBe(4);
  expect(result.raw).toMatchObject({ recovery: { error: expect.stringContaining("No object generated") } });
});

test("candidate adapter recovers one malformed artifact without losing observed usage", async () => {
  let calls = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async () => {
      calls += 1;
      if (calls === 1) return response([{ type: "text", text: "an explained paragraph rather than an artifact" }], "stop");
      if (calls === 2) return response([{ type: "text", text: JSON.stringify({ content: "风从没有门的地方经过，留下一个尚未分类的动作。" }) }], "stop");
      throw new Error(`unexpected mock call ${calls}`);
    },
  });
  const driver = new AiSdkCandidateFieldDriver({ route: explicitDeepSeekRoute(), deepSeekApiKey: "not-used", model: "mock-candidate-recovery" });
  Object.defineProperty(driver, "model", { value: model });

  const result = await driver.emit({
    stimulus: "Find one project name.",
    operator: { id: "sound", instructions: "Begin with sound.", count: 1 },
    sample: 1,
    nodes: [{ id: "a-0001", layer: 0, content: "spark at a common well", predictedConsequence: "a shared source", rootActivationIds: ["a-0001"] }],
    seeds: [{ id: "seed-1", title: "庄子" }],
    activation: { titleIds: ["seed-1"], basis: "memory", resonance: "记得其中有关空隙与游刃的意象，但不声称精确引文。", evidence: [] },
    inhibitions: ["literal forge imagery"],
  });

  expect(calls).toBe(2);
  expect(result.value).toEqual({ content: "风从没有门的地方经过，留下一个尚未分类的动作。" });
  expect(result.usage.totalTokens).toBe(4);
});

test("candidate adapter grounds a selected title in injected runtime evidence", async () => {
  let calls = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async () => {
      calls += 1;
      if (calls === 1) return response([{ type: "text", text: JSON.stringify({
        titleIds: ["seed-1"],
        resonance: "a fallible remembered relation",
      }) }], "stop");
      if (calls === 2) return response([{ type: "text", text: JSON.stringify({
        resonance: "the retrieved passage turns a fixed boundary into a traversable interval",
      }) }], "stop");
      throw new Error(`unexpected mock call ${calls}`);
    },
  });
  const seedRetriever: SeedMaterialRetriever = {
    descriptor: { provider: "test-retriever" },
    async retrieve(request) {
      return {
        titleId: request.entry.id,
        provider: "test-retriever",
        locator: "庄子/养生主",
        sourceUrl: "https://example.com/zhuangzi/yangshengzhu",
        excerpt: "A retrieved source excerpt.",
        sha256: "a".repeat(64),
      };
    },
  };
  const driver = new AiSdkCandidateFieldDriver({ route: explicitDeepSeekRoute(), deepSeekApiKey: "not-used", model: "mock-retrieval", seedRetriever });
  Object.defineProperty(driver, "model", { value: model });

  const result = await driver.retrieve({
    stimulus: "Open one association.",
    operator: { id: "remote", instructions: "Transfer a relation.", count: 1 },
    sample: 1,
    nodes: [{ id: "a-0001", layer: 0, content: "a shared source", predictedConsequence: "a relation moves", rootActivationIds: ["a-0001"] }],
    shelf: [{ id: "seed-1", title: "《庄子》" }, { id: "seed-2", title: "《史记》" }, { id: "seed-3", title: "《野草》" }, { id: "seed-4", title: "《周易》" }],
    selectCount: 1,
    requiredTitleIds: [],
    randomSeed: "retrieval-test",
  });

  expect(calls).toBe(2);
  expect(result.value).toMatchObject({
    titleIds: ["seed-1"],
    basis: "retrieval",
    resonance: "the retrieved passage turns a fixed boundary into a traversable interval",
  });
  expect(result.value.evidence).toEqual([expect.objectContaining({ titleId: "seed-1", provider: "test-retriever" })]);
  expect(result.usage.totalTokens).toBe(4);
});

function response(
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

function responseV4(
  content: LanguageModelV4GenerateResult["content"],
  finish: "stop" | "tool-calls",
): LanguageModelV4GenerateResult {
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

function sequenceInput(root: string) {
  return {
    id: "sequence-expression-recovery",
    intent: "Select the smallest principle expression, then complete the bounded task.",
    workspace: {
      root,
      readPaths: ["."],
      writePaths: [],
      excludePaths: [],
      allowedCommands: [],
    },
    genome: {
      sequencePath: "principles/SEQUENCE.md",
      interpretationsDir: "principles/interpretations",
    },
    dna: {
      baseInstructions: "Complete the task without changing files.",
      capabilities: ["read"],
    },
    capabilitiesRequired: ["read"],
    acceptance: ["The task completes after a valid principle expression."],
    budget: {
      maxSteps: 3,
      estimatedTokens: 1_000,
      maxDurationMs: 10_000,
      maxCommandOutputBytes: 4_000,
    },
  };
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "work-cell-ai-sdk-driver-"));
  roots.push(root);
  await mkdir(join(root, "principles", "interpretations"), { recursive: true });
  await writeFile(join(root, "principles", "SEQUENCE.md"), "P04｜主要矛盾｜矛盾论\n");
  await writeFile(join(root, "principles", "interpretations", "P04.md"), "# P04\n");
  return root;
}
