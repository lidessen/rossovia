import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LanguageModelV3GenerateResult } from "@ai-sdk/provider";
import { MockLanguageModelV3 } from "ai/test";
import { AiSdkDeepSeekDriver } from "../src/ai-sdk-driver";
import { runCell } from "../src/run-cell";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("recovers a natural finish without a terminal tool when provider metadata is absent", async () => {
  const root = await fixture();
  let calls = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async () => {
      calls += 1;
      if (calls === 1) {
        return response([{
          type: "tool-call",
          toolCallId: "genes",
          toolName: "express_genes",
          input: JSON.stringify({
            lead: "P04",
            supports: [],
            principalContradiction: "Recover a missing terminal signal.",
            contributions: [{ pid: "P04", decision: "Exercise recovery." }],
          }),
        }], "tool-calls");
      }
      if (calls === 2) return response([{ type: "text", text: "Main response stopped before terminal." }], "stop");
      if (calls === 3) return response([{ type: "tool-call", toolCallId: "terminal", toolName: "finish_review", input: "{}" }], "tool-calls");
      if (calls === 4) return response([], "stop");
      throw new Error(`unexpected mock call ${calls}`);
    },
  });
  const driver = new AiSdkDeepSeekDriver({ apiKey: "not-used", model: "mock-recovery" });
  // The adapter owns the model handle; the mock replaces only the provider edge.
  Object.defineProperty(driver, "model", { value: model });

  const record = await runCell({
    id: "recovery-rehearsal",
    intent: "Exercise the terminal recovery path.",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    genome: { sequencePath: "principles/SEQUENCE.md", interpretationsDir: "principles/interpretations" },
    dna: { baseInstructions: "Return a concise report.", capabilities: ["read"] },
    capabilitiesRequired: ["read"],
    acceptance: ["A missing terminal signal is recovered before settlement."],
    terminalTools: [{
      name: "finish_review",
      description: "Signal review completion.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    }],
    budget: { maxSteps: 4, maxTokens: 1_000, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  }, driver);

  expect(record.status).toBe("passed");
  expect(record.verification.terminal).toMatchObject({ passed: true, called: ["finish_review"] });
  expect(record.trace.some((event) => event.type === "terminal.contract.recovery")).toBe(true);
  expect(record.finalText).toContain("Terminal contract satisfied during recovery");
  expect(calls).toBe(4);
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

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "work-cell-ai-sdk-driver-"));
  roots.push(root);
  await mkdir(join(root, "principles", "interpretations"), { recursive: true });
  await writeFile(join(root, "principles", "SEQUENCE.md"), "P04｜主要矛盾｜矛盾论\n");
  await writeFile(join(root, "principles", "interpretations", "P04.md"), "# P04\n");
  return root;
}
