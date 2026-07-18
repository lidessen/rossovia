import type { LanguageModelV4 } from "@ai-sdk/provider";
import { ToolLoopAgent, hasToolCall, tool } from "ai";
import type { CellUsage } from "./contracts";
import type { DriverContext } from "./driver";
import { normalizeAiSdkUsage as normalizeUsage } from "./ai-sdk-usage";
import type { CompiledOutputSchema } from "./output-schema";

export interface StructuredSettlementResult {
  output?: unknown;
  usage: CellUsage;
  rawSteps: unknown[];
  error?: string;
}

export async function settleStructuredOutput(options: {
  model: LanguageModelV4;
  schema: CompiledOutputSchema;
  intent: string;
  acceptance: string[];
  retainedEvidence: string;
  context: DriverContext;
  maxDurationMs: number;
  maxOutputTokens: number;
}): Promise<StructuredSettlementResult> {
  let output: unknown;
  let usage = emptyUsage();
  const rawSteps: unknown[] = [];
  let lastError: string | undefined;
  const prompt = [
    `Intent:\n${options.intent}`,
    `Acceptance:\n${options.acceptance.map((item) => `- ${item}`).join("\n")}`,
    `Retained investigation evidence:\n${options.retainedEvidence}`,
  ].join("\n\n");

  for (let attempt = 1; attempt <= 2 && output === undefined; attempt += 1) {
    const agent = new ToolLoopAgent({
      model: options.model,
      instructions: [
        "You are the structured settlement phase after a completed investigation.",
        "Do not investigate, add facts, or return prose. Project only the retained evidence into the caller's output contract.",
        "Finish only by calling emit_structured_output exactly once.",
        ...(attempt === 2
          ? ["The prior settlement attempt did not produce an accepted payload. Call emit_structured_output now with the smallest schema-valid projection."]
          : []),
      ].join("\n"),
      tools: {
        emit_structured_output: tool({
          description: "Emit the already-investigated result under the caller's structured output contract.",
          inputSchema: options.schema.forAiSdk(),
          execute: async (value) => {
            const validation = options.schema.validate(value);
            if (!validation.passed) throw new Error(validation.errors.join("; "));
            output = value;
            return { accepted: true };
          },
        }),
      },
      toolChoice: { type: "tool", toolName: "emit_structured_output" },
      stopWhen: hasToolCall("emit_structured_output"),
      maxOutputTokens: options.maxOutputTokens,
      temperature: 0,
    });
    try {
      const result = await agent.generate({
        prompt,
        abortSignal: options.context.signal,
        timeout: { totalMs: options.maxDurationMs },
        onStepEnd: ({ usage: stepUsage, finishReason, performance, providerMetadata, toolCalls, toolResults }) => {
          const observed = normalizeUsage(stepUsage, providerMetadata);
          usage = addUsage(usage, observed);
          options.context.observeUsage(observed);
          options.context.emit("structured.settlement.step.finished", {
            attempt,
            finishReason,
            performance: sanitize(performance),
            providerMetadata: sanitize(providerMetadata),
            usage: stepUsage,
            cumulativeUsage: usage,
            toolCalls: sanitize(toolCalls),
            toolResults: sanitize(toolResults),
          });
        },
      });
      rawSteps.push(...sanitizeSteps(result.steps));
      if (output === undefined) {
        lastError = "emit_structured_output was not accepted";
        options.context.emit("structured.settlement.attempt.failed", { attempt, error: lastError });
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      options.context.emit("structured.settlement.attempt.failed", { attempt, error: lastError });
    }
  }

  return {
    ...(output === undefined ? {} : { output }),
    usage,
    rawSteps,
    ...(output === undefined ? { error: lastError ?? "structured settlement produced no output" } : {}),
  };
}

function emptyUsage(): CellUsage {
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 };
}

function addUsage(left: CellUsage, right: CellUsage): CellUsage {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    totalTokens: left.totalTokens + right.totalTokens,
    cachedInputTokens: left.cachedInputTokens + right.cachedInputTokens,
  };
}

function sanitizeSteps(steps: unknown[]): unknown[] {
  return sanitize(steps) as unknown[];
}

function sanitize(value: unknown): unknown {
  const serialized = JSON.stringify(value, (_key, item) => {
    if (typeof item === "bigint") return item.toString();
    if (item instanceof Error) return { name: item.name, message: item.message };
    return item;
  });
  return serialized === undefined ? undefined : JSON.parse(serialized);
}
