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
  type ChildSummary,
  type CompactProjection,
  type ConversationPolicy,
  type FullChildResult,
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
  /**
   * The compact current projection the coordinator reads against, built by
   * the runtime from the canonical Workbench sources immediately before
   * preparation. Omission composes a projection-less turn.
   */
  readonly projection?: CompactProjection;
  /**
   * Bounded summaries of this conversation's settled, still-current child
   * contributions. Full child evidence enters a turn only through the
   * `fullChildResults` of an explicit keyed result-read synthesis.
   */
  readonly children?: readonly ChildSummary[];
  /** Full bounded child result projections of one exact keyed result-read. */
  readonly fullChildResults?: readonly FullChildResult[];
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
 * DeepSeek Pro reasoning=max carrier plus the exact consequential operation
 * vocabulary. It is a requested fact recorded on `coordinator.turn-started`;
 * observed identity stays in the settlement. Available tools carry their
 * meaning; unavailable tools stay named so the coordinator reports them
 * instead of calling them. No operation executes here.
 */
export const COORDINATOR_CONVERSATION_POLICY: ConversationPolicy = {
  ...CURRENT_COORDINATOR_POLICY,
  disclosureEnvelope:
    "Sources are disclosed by ref and digest only; raw provider output is never retained in the conversation journal.",
  tools: [
    {
      name: "task_create",
      availability: "available",
      meaning:
        "Form one new local obligation from this message. Copy the exact registered project ID, expected current-primary head, exact observed Worktree path, and expected Worktree head from the current projection; never invent or guess them. The host re-reads and compares every selector immediately before the effect and refuses stale, discovered, unregistered, or guessed context, so an incomplete or ambiguous route is not usable.",
    },
    {
      name: "task_correct",
      availability: "available",
      meaning:
        "Change a constraint or expected outcome of the still-active Task shown in the current projection. Copy the exact current taskId, sourceRevision, and revision from the projection. Never call it for a missing or settled Task, and never adjust a revision by guessing.",
    },
    {
      name: "task_continue",
      availability: "available",
      meaning:
        "Request more work on the still-active Task shown in the current projection through one ordinary catalog carrier. Copy the exact current taskId, sourceRevision, revision, registered projectId, current primary head, bound Worktree path, and Worktree head from the projection, and select exactly one workerId copied from the projection's worker cards by judging its description; never invent, guess, or route a worker by phrase. The host re-reads the exact Task/source revisions, registered project identity, current primary observation, bound Worktree path and head, and the exact Worktree lease immediately before starting, and refuses stale or mismatched selectors with no effect.",
    },
    {
      name: "work_control",
      availability: "available",
      meaning:
        "Apply one explicit control to one exact retained carrier. Copy the exact carrierId from the current projection's carriers and choose the control that fits the message. An ordinary Task carrier owns only stop; pause/resume/recover are refused visibly. A carrier without a live retained handle reports liveness unknown and the control cannot be verified. Response interruption is a different control and never stops persistent work.",
    },
    {
      name: "contribution_spawn",
      availability: "available",
      meaning:
        "Form one bounded temporary catalog-backed evidence, execution, or review contribution only when it earns its coordination cost, then reconstruct one response yourself as the one synthesis owner; never vote or concatenate. Copy the exact current taskId, sourceRevision, revision, registered projectId, current primary head, bound Worktree path, and Worktree head from the projection, select exactly one workerId copied from the projection's worker cards by judging its description, and state the bounded semantic intent, one capabilityNeed taken from that worker's labels, and the exact effectKind (read-only for bounded-parallel evidence/review work, effectful when the child must write into the bound Worktree). The host derives every internal admission and evidence field from the current Task and runtime sources, refuses stale selectors, and permits at most one effectful writer per Task/Worktree. Never review your own streamed response; contribution evidence comes from the Task and its Worktree only. Never call it for a missing or settled Task.",
    },
    {
      name: "contribution_control",
      availability: "available",
      meaning:
        "Stop one exact retained temporary contribution. Copy the exact batchId and key from the current projection's contributions. A bounded contribution owns only stop; a contribution without a live retained handle reports liveness unknown and the control cannot be verified; replacement is a new contribution_spawn from the latest Task revision, never an automatic retry.",
    },
    {
      name: "child_result",
      availability: "available",
      meaning:
        "A request, not an operation: ask the host for the full bounded semantic result of one exact settled child contribution by its batchId and key, only when synthesis needs the full evidence. Settled child summaries are already present in the prompt. The host refuses unknown, unsettled, or stale post-correction results without guessing; at most one request or operation is allowed per Principal message.",
    },
  ],
  abstention:
    "At most one operation or request is allowed per Principal message; a second is a visible failure. On ambiguity, abstain: answer with what you know and ask for the missing judgment. Never route a message by keyword or fixed phrase, and never form a contribution unless it earns its cost.",
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
        ...(input.projection === undefined ? {} : { projection: input.projection }),
        ...(input.children === undefined || input.children.length === 0
          ? {}
          : { children: [...input.children] }),
        ...(input.fullChildResults === undefined || input.fullChildResults.length === 0
          ? {}
          : { fullChildResults: [...input.fullChildResults] }),
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
