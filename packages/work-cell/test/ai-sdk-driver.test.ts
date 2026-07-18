import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { APICallError, type LanguageModelV3GenerateResult, type LanguageModelV4GenerateResult } from "@ai-sdk/provider";
import { MockLanguageModelV3, MockLanguageModelV4 } from "ai/test";
import { AiSdkActivationFieldDriver } from "../src/research/ai-sdk-activation-field";
import { AiSdkCandidateFieldDriver } from "../src/research/ai-sdk-candidate-field";
import { AiSdkValidationDriver } from "../src/ai-sdk-driver";
import { AiSdkValidationSequenceDriver } from "../src/adapters/sequence/ai-sdk-driver";
import { createRoutedLanguageModel } from "../src/model-route";
import type { SeedMaterialRetriever } from "../src/research/candidate-field";
import { runCell } from "../src/run-cell";
import { runSequenceCell } from "../src/adapters/sequence/runtime";

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
  expect(JSON.stringify(recoveryRequest)).toContain("## Gene-expression recovery");
  expect(calls).toBe(3);
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
  expect(record.trace.find((event) => event.type === "agent.step.finished")?.data).toMatchObject({
    performance: expect.objectContaining({ stepTimeMs: expect.any(Number) }),
  });
  expect(record.finalText).toContain("Terminal contract satisfied during recovery");
  expect(calls).toBe(3);
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
      if (calls === 4) return response([{
        type: "tool-call",
        toolCallId: "late-read",
        toolName: "read_file",
        input: JSON.stringify({ path: "principles/SEQUENCE.md" }),
      }], "tool-calls");
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
    budget: { maxSteps: 4, estimatedTokens: 1_000, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
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

  expect(record.status).toBe("failed");
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

test("stops the main loop after one structured output step following a terminal call", async () => {
  const root = await fixture();
  let calls = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async () => {
      calls += 1;
      if (calls === 1) {
        return response([{
          type: "tool-call",
          toolCallId: "terminal",
          toolName: "submit_review",
          input: "{}",
        }], "tool-calls");
      }
      if (calls === 2) {
        return response([{
          type: "text",
          text: JSON.stringify({ recommendation: "proceed" }),
        }], "stop");
      }
      throw new Error(`unexpected extra main-loop call ${calls}`);
    },
  });
  const driver = new AiSdkValidationDriver({ route: explicitDeepSeekRoute(), deepSeekApiKey: "not-used", model: "mock-main-output" });
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
    budget: { maxSteps: 6, estimatedTokens: 1_000, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  expect(record.status).toBe("passed");
  expect(record.output).toEqual({ recommendation: "proceed" });
  expect(record.trace.some((event) => event.type === "terminal.contract.recovery")).toBe(false);
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
    budget: { maxSteps: 3, estimatedTokens: 1_000, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
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
  const outputLimits: Array<number | undefined> = [];
  const model = new MockLanguageModelV3({
    doGenerate: async (options) => {
      calls += 1;
      outputLimits.push(options.maxOutputTokens);
      if (calls <= 4) return response([{
        type: "tool-call",
        toolCallId: `read-${calls}`,
        toolName: "read_file",
        input: JSON.stringify({ path: "principles/SEQUENCE.md" }),
      }], "tool-calls");
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
      if (calls === 7) return response([{ type: "text", text: JSON.stringify({ recommendation: "hold", reason: "One boundary remains unverified." }) }], "stop");
      throw new Error(`unexpected mock call ${calls}`);
    },
  });
  const driver = new AiSdkValidationDriver({ route: explicitDeepSeekRoute(), deepSeekApiKey: "not-used", model: "mock-structured-recovery" });
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
    budget: { maxSteps: 4, estimatedTokens: 1_000, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
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
