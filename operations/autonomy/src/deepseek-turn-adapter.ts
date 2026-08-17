import type { LanguageModelV4 } from "@ai-sdk/provider";
import { streamText, tool, type Tool } from "ai";
import {
  DEEPSEEK_PROVIDER_ID,
  DeepSeekInferencePolicySchema,
  createDeepSeekModel,
  type DeepSeekInferencePolicy,
} from "../../../packages/work-cell/src/integrations/ai-sdk/providers/deepseek";
import {
  ChildResultRequestSchema,
  ContributionControlOperationSchema,
  ContributionSpawnOperationSchema,
  TaskContinueOperationSchema,
  TaskCorrectOperationSchema,
  TaskCreateOperationSchema,
  WorkControlOperationSchema,
  type ConversationOperation,
  type ConversationTurnPort,
  type ConversationTurnPortEvent,
  type ConversationTurnRequest,
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
 * The strict typed operation tools exposed to the DeepSeek coordinator.
 * The tool name is the operation kind, so each input schema omits `kind`; the
 * adapter restores it when forwarding the tool call as a typed operation port
 * event. Tools carry structure and descriptions only: they never execute, and
 * they never classify Principal prose by phrase. The host validates every
 * field against current sources before any effect.
 */
export const CONVERSATION_OPERATION_TOOL_NAMES = [
  "task_create",
  "task_correct",
  "task_continue",
  "work_control",
  "contribution_spawn",
  "contribution_control",
] as const;

export const conversationOperationTools: Record<
  (typeof CONVERSATION_OPERATION_TOOL_NAMES)[number],
  Tool
> = {
  task_create: tool({
    description: [
      "Form one new local obligation. Copy the exact registered project ID and expected current-primary head from the current projection, and the exact path and head of one clean linked Worktree of that project; never invent or guess any of them, and never select the primary workspace or a dirty, stale, or unobserved Worktree.",
      "If the message names no project, or the projection shows no clean linked Worktree, do not call this tool; answer with what you know and ask for the missing judgment instead.",
    ].join(" "),
    inputSchema: TaskCreateOperationSchema.omit({ kind: true }),
  }),
  task_correct: tool({
    description: [
      "Change a constraint or expected outcome of the still-active Task shown in the current projection.",
      "Copy the exact current taskId, sourceRevision, and revision from the projection; do not call it for a missing or settled Task.",
    ].join(" "),
    inputSchema: TaskCorrectOperationSchema.omit({ kind: true }),
  }),
  task_continue: tool({
    description: [
      "Request more work on the still-active Task shown in the current projection through one ordinary catalog carrier.",
      "Copy the exact current taskId, sourceRevision, revision, registered projectId, current primary head, bound Worktree path, and Worktree head from the projection, and select exactly one workerId copied from the projection's worker cards by judging its description.",
      "Never invent, guess, or route a worker by phrase; the host refuses stale, unregistered, or mismatched selectors with no effect.",
    ].join(" "),
    inputSchema: TaskContinueOperationSchema.omit({ kind: true }),
  }),
  work_control: tool({
    description: [
      "Apply one explicit control to one exact retained carrier.",
      "Copy the exact carrierId from the current projection's carriers and choose the control that fits the message.",
      "An ordinary Task carrier owns only stop; pause/resume/recover are refused visibly.",
      "A carrier without a live retained handle reports liveness unknown and the control cannot be verified.",
      "Response interruption is a different control and never stops persistent work.",
    ].join(" "),
    inputSchema: WorkControlOperationSchema.omit({ kind: true }),
  }),
  contribution_spawn: tool({
    description: [
      "Form one bounded temporary contribution only when it earns its coordination cost: a bounded evidence, execution, or review child you then synthesize yourself; you remain the one synthesis owner and never vote or concatenate.",
      "Supply only the semantic intent, one capabilityNeed taken from the exact worker's labels, the exact effectKind (read-only for bounded-parallel evidence/review work, effectful when the child must write into the bound Worktree), optional settled-key dependencies, and optional workspace-relative image paths; select exactly one workerId copied from the projection's worker cards by judging its description.",
      "Never supply a Task ID or revision, project ID/head, Worktree path/head, source or obligation ref, acceptance, or execution profile: the host derives the conversation's current Task from the canonical sources and revalidates the exact execution selection immediately before the effect, refuses stale or unbound contexts and overlapping writers, and never spawns automatically or retries.",
      "Never review your own streamed response: contribution evidence comes from the Task and its Worktree only.",
    ].join(" "),
    inputSchema: ContributionSpawnOperationSchema.omit({ kind: true }),
  }),
  contribution_control: tool({
    description: [
      "Stop one exact retained temporary contribution.",
      "Copy the exact batchId and key from the current projection's contributions; a bounded contribution owns only stop.",
      "A contribution without a live retained handle reports liveness unknown and the control cannot be verified; replacement is a new spawn from the latest Task revision, never an automatic retry.",
    ].join(" "),
    inputSchema: ContributionControlOperationSchema.omit({ kind: true }),
  }),
};

/**
 * The keyed child-result read request tool: the model asks the host to load
 * the bounded full semantic projection of one exact settled child result
 * when synthesis needs it. Child summaries are already in the prompt; this
 * tool only names a batchId and key the host already exposed.
 */
export const childResultRequestTool: Tool = tool({
  description: [
    "Request the full bounded semantic result of one exact settled child contribution by its batchId and key, when synthesis needs the full evidence.",
    "Name only a batchId and key already returned for a settled contribution of this conversation; the host refuses unknown, unsettled, or stale (post-correction) results without guessing.",
  ].join(" "),
  inputSchema: ChildResultRequestSchema.omit({ kind: true }),
});

/**
 * A real DeepSeek turn adapter for the frozen P3b1 ConversationTurnPort
 * contract. It owns only the model call: prompt text, bounded output, the
 * requested DeepSeek inference policy, and the port event projection. Every
 * terminal finish event reports the adapter-confirmed observed provider
 * (the coordinator policy id `deepseek`; the constructed model was verified
 * as served by the DeepSeek SDK provider before the call) and the normalized
 * model identity the AI SDK stream returned for the turn. Observed reasoning
 * effort is never reported here: it stays unavailable in the coordinator
 * settlement unless independently returned. All usage, identity
 * verification, interruption, and evidence settlement stay with the
 * coordinator kernel.
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
        let observedModel: string | undefined;
        let providerFingerprint: string | undefined;
        let requestEmitted = false;
        let stashedUsage: unknown;
        const result = streamText({
          model,
          prompt: prompt.prompt,
          abortSignal: signal,
          maxOutputTokens: DEEPSEEK_TURN_MAX_OUTPUT_TOKENS,
          tools: {
            ...conversationOperationTools,
            child_result: childResultRequestTool,
          },
        });
        for await (const part of result.stream) {
          if (signal.aborted) return;
          if (part.type === "text-delta") {
            yield { kind: "delta", text: part.text };
            continue;
          }
          if (part.type === "tool-call") {
            if (part.toolName === "child_result") {
              const request = childResultRequest(part.input);
              if (request === undefined) {
                yield {
                  kind: "error",
                  message: `the model called child_result with an invalid keyed read selector; the turn is not interpreted`,
                };
                return;
              }
              requestEmitted = true;
              yield { kind: "request", request };
              continue;
            }
            const operation = operationFromToolCall(part.toolName, part.input);
            if (operation === undefined) {
              yield {
                kind: "error",
                message: `the model called unknown operation tool ${part.toolName}; the turn is not interpreted`,
              };
              return;
            }
            yield { kind: "operation", operation };
            continue;
          }
          if (part.type === "error") {
            yield { kind: "error", message: errorMessage(part.error) };
            return;
          }
          if (part.type === "finish-step") {
            // The finish step carries the turn's model identity as returned
            // through the AI SDK stream: provider-reported when the provider
            // supplies one, and the verified constructed DeepSeek model
            // otherwise. Normalize it (trim, non-empty) and retain exactly
            // that; never synthesize a model from the requested policy when
            // the stream reports none.
            const responseModel = part.response.modelId.trim();
            if (responseModel !== "") {
              observedModel = responseModel;
            }
            providerFingerprint ??= observedDeepSeekMetadata(part.providerMetadata).providerFingerprint;
            stashedUsage ??= part.usage;
            continue;
          }
          if (part.type === "finish") {
            if (part.finishReason === "error") {
              yield { kind: "error", message: "the model stream finished with an error reason" };
              return;
            }
            yield observedFinishEvent(observedModel, providerFingerprint, part.totalUsage);
            return;
          }
          if (part.type === "abort") return;
        }
        if (requestEmitted && !signal.aborted) {
          // The provider ends the stream after a request tool call; there is
          // no tool result to feed back. The request itself is the terminal
          // turn outcome, so the adapter emits the finish with the best
          // observed step usage rather than failing the turn.
          yield observedFinishEvent(
            observedModel,
            providerFingerprint,
            stashedUsage === undefined ? undefined : stashedUsage,
          );
          return;
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

function operationFromToolCall(
  toolName: string,
  input: unknown,
): ConversationOperation | undefined {
  switch (toolName) {
    case "task_create":
      return TaskCreateOperationSchema.parse({ kind: "task_create", ...asRecord(input) });
    case "task_correct":
      return TaskCorrectOperationSchema.parse({ kind: "task_correct", ...asRecord(input) });
    case "task_continue":
      return TaskContinueOperationSchema.parse({ kind: "task_continue", ...asRecord(input) });
    case "work_control":
      return WorkControlOperationSchema.parse({ kind: "work_control", ...asRecord(input) });
    case "contribution_spawn":
      return ContributionSpawnOperationSchema.parse({ kind: "contribution_spawn", ...asRecord(input) });
    case "contribution_control":
      return ContributionControlOperationSchema.parse({ kind: "contribution_control", ...asRecord(input) });
    default:
      return undefined;
  }
}

/** The strict keyed result-read request restored from one child_result tool call. */
function childResultRequest(input: unknown): ConversationTurnRequest | undefined {
  const record = asRecord(input);
  const parsed = ChildResultRequestSchema.safeParse({
    kind: "child-result",
    batchId: record.batchId,
    key: record.key,
  });
  return parsed.success ? parsed.data : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

/**
 * The terminal finish event of a DeepSeek turn: the adapter-confirmed
 * provider in coordinator policy vocabulary, the normalized stream-returned
 * model identity when the stream reported one, the provider fingerprint when
 * DeepSeek returned one, and the observed step usage. The adapter never
 * emits an observed reasoning effort and never copies the requested policy
 * into observation.
 */
function observedFinishEvent(
  observedModel: string | undefined,
  providerFingerprint: string | undefined,
  usage: unknown,
): ConversationTurnPortEvent {
  return {
    kind: "finish",
    provider: DEEPSEEK_PROVIDER_ID,
    ...(observedModel === undefined ? {} : { model: observedModel }),
    ...(providerFingerprint === undefined ? {} : { providerFingerprint }),
    ...(usage === undefined ? {} : { usage }),
  };
}

function observedDeepSeekMetadata(metadata: unknown): { readonly providerFingerprint?: string } {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) return {};
  const deepseek = (metadata as Record<string, unknown>)[DEEPSEEK_PROVIDER_ID];
  if (typeof deepseek !== "object" || deepseek === null || Array.isArray(deepseek)) return {};
  const record = deepseek as Record<string, unknown>;
  const fingerprint = typeof record.systemFingerprint === "string" && record.systemFingerprint.trim() !== ""
    ? record.systemFingerprint
    : undefined;
  return fingerprint === undefined ? {} : { providerFingerprint: fingerprint };
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
