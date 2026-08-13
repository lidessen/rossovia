import type { LanguageModelV4 } from "@ai-sdk/provider";
import { streamText } from "ai";
import {
  DEEPSEEK_PROVIDER_ID,
  DeepSeekInferencePolicySchema,
  createDeepSeekModel,
  type DeepSeekInferencePolicy,
} from "../../../packages/work-cell/src/providers/deepseek";
import type {
  ConversationTurnPort,
  ConversationTurnPortEvent,
} from "./conversation-coordinator";

export const DEEPSEEK_TURN_MAX_OUTPUT_TOKENS = 16_000;

/**
 * The DeepSeek AI SDK model provider registry id. `createDeepSeek` in
 * `@ai-sdk/deepseek` 3.x names its models `deepseek.chat`, while the
 * coordinator policy vocabulary identifies the provider as `deepseek`
 * (DEEPSEEK_PROVIDER_ID). The adapter verifies the constructed model against
 * the SDK id and reports the policy id.
 */
export const DEEPSEEK_SDK_PROVIDER_ID = "deepseek.chat";

export interface DeepSeekTurnModelOptions {
  readonly apiKey: string;
  readonly baseURL?: string;
  readonly model: string;
  readonly inferencePolicy?: DeepSeekInferencePolicy;
}

export interface DeepSeekTurnAdapterOptions {
  readonly apiKey: string;
  readonly baseURL?: string;
  readonly provider: string;
  readonly model: string;
  readonly thinking: "enabled" | "disabled";
  readonly reasoningEffort: string;
  readonly createModel?: (options: DeepSeekTurnModelOptions) => LanguageModelV4;
}

type InferencePolicyDecision =
  | { ok: true; policy: DeepSeekInferencePolicy }
  | { ok: false; reason: string };

/**
 * A real DeepSeek turn adapter for the frozen P3b1 ConversationTurnPort
 * contract. It owns only the model call: prompt text, bounded output, the
 * requested DeepSeek inference policy, and the port event projection. All
 * usage, identity verification, interruption, and evidence settlement stay
 * with the coordinator kernel.
 */
export function createDeepSeekTurnAdapter(options: DeepSeekTurnAdapterOptions): ConversationTurnPort {
  const createModel = options.createModel ?? createDeepSeekModel;
  const inference = inferencePolicyFor(options);
  return {
    async *run({ prompt, signal }): AsyncIterable<ConversationTurnPortEvent> {
      if (!inference.ok) {
        yield { kind: "error", message: inference.reason };
        return;
      }
      if (options.provider !== DEEPSEEK_PROVIDER_ID) {
        yield {
          kind: "error",
          message:
            `the DeepSeek turn adapter can only serve provider ${DEEPSEEK_PROVIDER_ID}, `
            + `not ${options.provider}; the turn is not redirected`,
        };
        return;
      }

      let model: LanguageModelV4;
      try {
        model = createModel({
          apiKey: options.apiKey,
          model: options.model,
          ...(options.baseURL === undefined ? {} : { baseURL: options.baseURL }),
          inferencePolicy: inference.policy,
        });
      } catch (error) {
        yield { kind: "error", message: `model construction failed: ${errorMessage(error)}` };
        return;
      }

      if (model.provider !== DEEPSEEK_SDK_PROVIDER_ID || model.modelId !== options.model) {
        yield {
          kind: "error",
          message:
            `constructed model identity ${model.provider}/${model.modelId} `
            + `does not match the requested DeepSeek model ${DEEPSEEK_SDK_PROVIDER_ID}/${options.model}; `
            + "the turn is not redirected",
        };
        return;
      }

      try {
        const result = streamText({
          model,
          prompt: prompt.prompt,
          abortSignal: signal,
          maxOutputTokens: DEEPSEEK_TURN_MAX_OUTPUT_TOKENS,
        });
        for await (const part of result.stream) {
          if (signal.aborted) return;
          if (part.type === "text-delta") {
            yield { kind: "delta", text: part.text };
            continue;
          }
          if (part.type === "error") {
            yield { kind: "error", message: errorMessage(part.error) };
            return;
          }
          if (part.type === "finish") {
            if (part.finishReason === "error") {
              yield { kind: "error", message: "the model stream finished with an error reason" };
              return;
            }
            yield {
              kind: "finish",
              provider: DEEPSEEK_PROVIDER_ID,
              model: model.modelId,
              ...(options.thinking === "enabled" ? { reasoningEffort: options.reasoningEffort } : {}),
              usage: part.totalUsage,
            };
            return;
          }
          if (part.type === "abort") return;
        }
      } catch (error) {
        if (signal.aborted) return;
        yield { kind: "error", message: `model stream failed: ${errorMessage(error)}` };
        return;
      }

      if (!signal.aborted) {
        yield { kind: "error", message: "the model stream ended without a terminal event" };
      }
    },
  };
}

function inferencePolicyFor(options: DeepSeekTurnAdapterOptions): InferencePolicyDecision {
  if (options.thinking === "disabled") return { ok: true, policy: { thinking: "disabled" } };
  const parsed = DeepSeekInferencePolicySchema.safeParse({
    thinking: "enabled",
    reasoningEffort: options.reasoningEffort,
  });
  if (!parsed.success) {
    return {
      ok: false,
      reason:
        `unsupported DeepSeek reasoning effort ${JSON.stringify(options.reasoningEffort)} `
        + "for a thinking-enabled turn; the turn is not downgraded",
    };
  }
  return { ok: true, policy: parsed.data };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "") return error.message;
  const text = String(error).trim();
  return text === "" ? "unknown model error" : text;
}
