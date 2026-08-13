import type {
  ConversationTurnHandle,
  ConversationTurnPort,
  PreparedConversationTurn,
} from "../../../autonomy/src/conversation-coordinator";
import {
  prepareConversationTurn,
  startPreparedConversationTurn,
} from "../../../autonomy/src/conversation-coordinator";
import {
  CURRENT_COORDINATOR_POLICY,
  type ConversationPolicy,
} from "../../../autonomy/src/conversation-prompt";
import { createDeepSeekTurnAdapter } from "../../../autonomy/src/deepseek-turn-adapter";
import type {
  DisclosedSource,
  PromptEvidence,
  RequestedCoordinatorPolicy,
  SourceRevisionSelector,
} from "./contracts";

/**
 * The minimal injectable seam between the conversation socket runtime and one
 * real conversation turn. The runtime owns the durable journal and frame
 * delivery; the owner owns prompt composition, evidence, and the coordinator
 * execution. It knows nothing about sockets, journals, or Task/Mission state.
 *
 * `prepare` is pure and returns the requested policy plus the prompt,
 * disclosure, and source-selector evidence the runtime must durably journal
 * before the model call. `start` runs the same prepared turn and returns a
 * handle whose `result` promise settles with a terminal
 * `ConversationTurnResult`; the promise never rejects and terminal outcomes
 * are always `finished`, `failed`, or `interrupted`.
 */
export interface ConversationTurnOwner {
  prepare(input: TurnPrepareInput): TurnPreparation;
  start(preparation: TurnPreparation, onDelta: (text: string) => void): ConversationTurnHandle;
}

export interface TurnPrepareInput {
  readonly turnId: string;
  readonly messageId: string;
  readonly payload: string;
}

export interface TurnPreparation {
  readonly requestedPolicy: RequestedCoordinatorPolicy;
  readonly prompt: PromptEvidence;
  readonly disclosedSources: readonly DisclosedSource[];
  readonly sourceRevisionSelectors: readonly SourceRevisionSelector[];
  /** The composed coordinator turn the owner runs in `start`. Opaque to the runtime. */
  readonly prepared: PreparedConversationTurn;
}

/**
 * The production policy for every Workbench conversation turn: the accepted
 * DeepSeek Pro reasoning=max carrier. It is a requested fact recorded on
 * `coordinator.turn-started`; observed identity stays in the settlement.
 */
export const COORDINATOR_CONVERSATION_POLICY: ConversationPolicy = {
  ...CURRENT_COORDINATOR_POLICY,
  disclosureEnvelope:
    "Sources are disclosed by ref and digest only; raw provider output is never retained in the conversation journal.",
};

export interface CoordinatorTurnOwnerOptions {
  /** Credential source; defaults to the process environment. Never logged. */
  readonly environment?: NodeJS.ProcessEnv;
  /** Test seam for the DeepSeek turn port; the default builds the real adapter. */
  readonly port?: ConversationTurnPort;
}

/**
 * The production conversation turn owner: the frozen coordinator kernel on
 * the real DeepSeek Pro/max turn adapter using the existing DeepSeek
 * environment credentials. There is no echo or other fallback carrier; a
 * missing credential fails the turn visibly in the journal.
 */
export function createCoordinatorTurnOwner(
  options: CoordinatorTurnOwnerOptions = {},
): ConversationTurnOwner {
  const environment = options.environment ?? process.env;
  const port = options.port ?? deepSeekTurnPort(environment);
  return {
    prepare(input: TurnPrepareInput): TurnPreparation {
      const prepared = prepareConversationTurn({
        message: {
          text: input.payload,
          lineage: { messageId: input.messageId, turnId: input.turnId },
        },
        policy: COORDINATOR_CONVERSATION_POLICY,
      });
      return {
        requestedPolicy: {
          provider: prepared.requested.provider,
          model: prepared.requested.model,
          thinking: prepared.requested.thinking,
          reasoningEffort: prepared.requested.reasoningEffort,
        },
        prompt: {
          revision: prepared.requested.promptRevision,
          digest: prepared.requested.promptDigest,
        },
        disclosedSources: prepared.requested.disclosedSources,
        sourceRevisionSelectors: prepared.requested.sourceRevisionSelectors,
        prepared,
      };
    },
    start(preparation, onDelta) {
      return startPreparedConversationTurn(preparation.prepared, {
        port,
        onEvent: (event) => {
          if (event.kind === "delta") onDelta(event.text);
        },
      });
    },
  };
}

function deepSeekTurnPort(environment: NodeJS.ProcessEnv): ConversationTurnPort {
  const apiKey = environment.DEEPSEEK_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") {
    return {
      async *run() {
        yield {
          kind: "error",
          message:
            "DEEPSEEK_API_KEY is not configured for the conversation coordinator; "
            + "the turn is not routed to a fallback carrier",
        };
      },
    };
  }
  return createDeepSeekTurnAdapter({
    apiKey,
    ...(environment.DEEPSEEK_BASE_URL === undefined
      ? {}
      : { baseURL: environment.DEEPSEEK_BASE_URL }),
    provider: CURRENT_COORDINATOR_POLICY.provider,
    model: CURRENT_COORDINATOR_POLICY.model,
    thinking: CURRENT_COORDINATOR_POLICY.thinking,
    reasoningEffort: CURRENT_COORDINATOR_POLICY.reasoningEffort,
  });
}
