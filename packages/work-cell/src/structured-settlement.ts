import type { LanguageModelV4 } from "@ai-sdk/provider";
import { ToolLoopAgent, hasToolCall, tool } from "ai";
import type { CellUsage } from "./contracts";
import type { DriverContext, StepAllowance } from "./driver";
import { stepBudgetExhaustedMessage } from "./driver";
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
  maxOutputTokens: number;
  /**
   * The shared monotonic step allowance of the enclosing Cell. Every
   * settlement provider step consumes one unit and the settlement never
   * starts an attempt when no step remains; settlement usage is attribution
   * only and never extends the allowance. An omitted maxSteps installs no
   * step-count ceiling and no settlement-attempt ceiling either: attempts
   * continue until the output is accepted, constrained only by
   * maxDurationMs, caller cancellation, and provider outcome.
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

  // No undeclared attempt ceiling exists: with maxSteps omitted the
  // settlement retries until the output is accepted or a provider/adapter
  // failure ends it with its causal error; maxDurationMs and the caller's
  // abort signal remain the only outer bounds. With an explicit maxSteps,
  // every attempt consumes the same shared, monotonic, non-extendable
  // allowance at step start, so the number of attempts can never exceed the
  // caller-selected remaining steps.
  for (let attempt = 1; output === undefined; attempt += 1) {
    // The explicit maxSteps allowance is shared, monotonic, and
    // non-extendable: a settlement attempt never starts when no provider
    // step remains, so one remaining step permits at most one attempt. An
    // omitted maxSteps leaves `remaining` undefined and this precheck never
    // fires.
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
        ...(attempt > 1
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
          // A step that completes only after caller cancellation must not
          // emit a step-finished event: the enclosing runCell already emitted
          // the immutable Cell final, and an emit here would mutate the
          // returned trace and notify live observers after cell.finished.
          // Usage attribution stays; only the post-final event is suppressed.
          if (options.context.signal.aborted) return;
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
        // A normally completed unsatisfied attempt with an exhausted explicit
        // allowance has no next provider call to protect: it reports the
        // canonical step-budget exhaustion immediately and keeps its existing
        // trace, so a short maxDurationMs can never race a checkpoint yield
        // and relabel the exact finite-bound outcome as cancellation.
        if (options.stepAllowance.exhausted) {
          // The final allowed step completed only after the caller cancelled
          // while it was still in flight: the Cell final is already emitted,
          // so the original abort reason stays causal and no attempt-failed
          // event is emitted after cell.finished.
          if (options.context.signal.aborted) {
            lastError = abortReasonMessage(options.context.signal);
            break;
          }
          lastError = stepBudgetExhaustedMessage(options.stepAllowance.consumed, "the structured output contract was not satisfied");
          options.context.emit("structured.settlement.attempt.failed", { attempt, error: lastError });
          continue;
        }
        // Only when another settlement provider step can actually start —
        // maxSteps omitted or explicit allowance still remaining — one
        // macrotask yield keeps the event-loop timer that owns maxDurationMs
        // and caller cancellation observable before the next provider call:
        // an immediately-resolving noncompliant provider would otherwise
        // starve the timer phase with an uninterrupted Promise chain.
        await yieldEventLoopCheckpoint();
        if (options.context.signal.aborted) {
          // The run ends with the original abort reason instead of starting
          // another provider call or inventing step-budget exhaustion. The
          // enclosing runCell rejected through runWithSignal at the abort and
          // already emitted cell.error and cell.finished with this same causal
          // reason, so this branch keeps the reason only: emitting an
          // attempt-failed event here would mutate the returned trace and
          // notify live observers after the immutable Cell final.
          lastError = abortReasonMessage(options.context.signal);
          break;
        }
        lastError = "emit_structured_output was not accepted";
        options.context.emit("structured.settlement.attempt.failed", { attempt, error: lastError });
      }
    } catch (error) {
      if (options.context.signal.aborted) {
        // Caller cancellation while this settlement step was still in
        // flight: runWithSignal already finalized runCell first (cell.error
        // then cell.finished). Emitting an attempt-failed event here would
        // mutate the returned trace and notify live observers after the
        // immutable Cell final, so the original caller reason is retained
        // instead and no settlement event is emitted.
        lastError = abortReasonMessage(options.context.signal);
        break;
      }
      // A thrown agent failure without cancellation is a provider or adapter
      // outcome (network, API, or malformed response), never the normally
      // completed no-output case handled above: it ends settlement with its
      // real causal error instead of being retried into invisibility,
      // whether or not the shared allowance is now exhausted. The throw is
      // never relabeled as step-budget exhaustion merely because its
      // onStepStart consumed the final allowed step; only a normally
      // completed attempt with no accepted output may report the canonical
      // exhaustion wording. Ending here also keeps the next precheck from
      // overwriting the causal error.
      lastError = error instanceof Error ? error.message : String(error);
      options.context.emit("structured.settlement.attempt.failed", { attempt, error: lastError });
      break;
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

/**
 * One macrotask yield so event-loop timers — the maxDurationMs timeout and
 * caller cancellation scheduled on the timer phase — stay observable between
 * settlement attempts even when the provider resolves immediately. It is only
 * awaited when another settlement provider step can actually start: an
 * exhausted explicit allowance needs no checkpoint because no next provider
 * call exists to protect. This is the smallest checkpoint that opens the
 * timer phase; it adds no attempt policy, retry, or cancellation controller
 * of its own.
 */
function yieldEventLoopCheckpoint(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof setImmediate === "function") setImmediate(resolve);
    else setTimeout(resolve, 0);
  });
}

/**
 * The original abort reason, retained as the causal settlement outcome when
 * cancellation becomes observable between attempts. It is never rewritten
 * into step-budget exhaustion wording.
 */
function abortReasonMessage(signal: AbortSignal): string {
  const reason = signal.reason;
  return reason instanceof Error ? reason.message : String(reason ?? "Cell execution cancelled");
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
