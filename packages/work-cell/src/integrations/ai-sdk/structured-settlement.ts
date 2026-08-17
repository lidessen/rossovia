import type { LanguageModelV4 } from "@ai-sdk/provider";
import { ToolLoopAgent, hasToolCall, tool } from "ai";
import type { CellUsage } from "../../contracts";
import type { DriverContext, StepAllowance } from "../../driver";
import { stepBudgetExhaustedMessage } from "../../driver";
import { normalizeAiSdkUsage as normalizeUsage } from "./ai-sdk-usage";
import type { CompiledAiSdkOutputSchema } from "./output-schema";

export interface StructuredSettlementResult {
  output?: unknown;
  usage: CellUsage;
  rawSteps: unknown[];
  error?: string;
}

export async function settleStructuredOutput(options: {
  model: LanguageModelV4;
  schema: CompiledAiSdkOutputSchema;
  intent: string;
  acceptance: string[];
  retainedEvidence: string;
  context: DriverContext;
  maxOutputTokens: number;
  /**
   * The shared monotonic step allowance of the enclosing Cell. Every
   * settlement provider step consumes one unit and the settlement never
   * starts an attempt when no step remains; settlement usage is attribution
   * only and never extends the allowance.
   */
  stepAllowance: StepAllowance;
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
    // The explicit maxSteps allowance is shared, monotonic, and
    // non-extendable: a settlement attempt never starts when no provider
    // step remains, so one remaining step permits at most one attempt.
    if (options.stepAllowance.remaining === 0) {
      lastError = stepBudgetExhaustedMessage(options.stepAllowance.consumed, "the structured output contract cannot be settled");
      options.context.emit("structured.settlement.attempt.failed", { attempt, error: lastError });
      break;
    }
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
      stopWhen: [hasToolCall("emit_structured_output"), () => options.stepAllowance.exhausted],
      maxOutputTokens: options.maxOutputTokens,
      temperature: 0,
    });
    try {
      const result = await agent.generate({
        prompt,
        abortSignal: options.context.signal,
        onStepStart: () => {
          // Consumed at step start so a step that fails under the forced
          // tool choice still counts against the shared allowance.
          options.stepAllowance.consume();
        },
        onStepEnd: ({ usage: stepUsage, finishReason, performance, providerMetadata, toolCalls, toolResults }) => {
          const observed = normalizeUsage(stepUsage, providerMetadata);
          usage = addUsage(usage, observed);
          options.context.observeUsage(observed, "settlement");
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
        lastError = options.stepAllowance.exhausted
          ? stepBudgetExhaustedMessage(options.stepAllowance.consumed, "the structured output contract was not satisfied")
          : "emit_structured_output was not accepted";
        options.context.emit("structured.settlement.attempt.failed", { attempt, error: lastError });
      }
    } catch (error) {
      // An actual provider or adapter failure keeps its real causal error even
      // when its onStepStart consumed the final allowed step: the throw is
      // never relabeled as step-budget exhaustion merely because the shared
      // allowance is now exhausted. Only a normally completed attempt with no
      // accepted output may report the canonical exhaustion wording. When no
      // step remains no further attempt could start anyway, so the loop ends
      // here and retains the causal error instead of letting the next
      // precheck overwrite it.
      lastError = error instanceof Error ? error.message : String(error);
      options.context.emit("structured.settlement.attempt.failed", { attempt, error: lastError });
      if (options.stepAllowance.exhausted) break;
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
