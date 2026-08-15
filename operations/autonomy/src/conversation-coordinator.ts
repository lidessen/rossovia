import { z } from "zod";
import {
  composeConversationPrompt,
  DisclosedSourceSchema,
  GitObjectSchema,
  SourceRevisionSelectorSchema,
  type ChildSummary,
  type CompactProjection,
  type ComposedConversationPrompt,
  type ConversationPolicy,
  type ConversationPromptInput,
  type FullChildResult,
  type PrincipalMessage,
  type ProjectOrientation,
} from "./conversation-prompt";

export const CONVERSATION_COORDINATOR_VERSION = "rosso.conversation-coordinator.v1" as const;

export const ProjectInstructionRequestSchema = z.object({
  kind: z.literal("project-instruction"),
  ref: z.string().min(1),
}).strict();

export const SkillContentRequestSchema = z.object({
  kind: z.literal("skill-content"),
  ref: z.string().min(1),
}).strict();

export const ChildResultRequestSchema = z.object({
  kind: z.literal("child-result"),
  batchId: z.string().min(1),
  key: z.string().min(1),
}).strict();

export const PrincipalDecisionRequestSchema = z.object({
  kind: z.literal("principal-decision"),
  question: z.string().min(1),
}).strict();

export const ConversationTurnRequestSchema = z.discriminatedUnion("kind", [
  ProjectInstructionRequestSchema,
  SkillContentRequestSchema,
  ChildResultRequestSchema,
  PrincipalDecisionRequestSchema,
]);
export type ConversationTurnRequest = z.infer<typeof ConversationTurnRequestSchema>;

/**
 * The strict typed consequential operation vocabulary. A turn may select at
 * most one operation per Principal message, enforced by the kernel; the host
 * re-validates every field against current sources immediately before any
 * effect. The schema is structure only: it never classifies prose by regex,
 * keyword, or fixed phrase. `task_continue` selects an exact catalog worker
 * identity; `work_control` targets one exact retained carrier identity. Both
 * are refused visibly when their owning execution-carrier runtime is absent.
 */
export const TaskCreateOperationSchema = z.object({
  kind: z.literal("task_create"),
  title: z.string().min(1).max(300),
  objective: z.string().min(1).max(4_000),
  acceptance: z.array(z.string().min(1).max(1_000)).min(1).max(20),
  todos: z.array(z.string().min(1).max(1_000)).max(50).optional(),
  /** Exact registered project ID the model must copy from the projection. */
  projectId: z.string().min(1),
  /** Expected current-primary head of that registered project, copied from the projection. */
  expectedPrimaryHead: GitObjectSchema,
  /**
   * Exact path of one clean linked Worktree the model must copy from the
   * projection. The host re-verifies the path/head immediately before the
   * effect and refuses the primary workspace, a dirty, stale, or unobserved
   * Worktree with zero Task mutation.
   */
  worktreePath: z.string().min(1),
  /** Expected head of that exact observed Worktree, copied from the projection. */
  expectedWorktreeHead: GitObjectSchema,
}).strict();
export type TaskCreateOperation = z.infer<typeof TaskCreateOperationSchema>;

export const TaskCorrectOperationSchema = z.object({
  kind: z.literal("task_correct"),
  taskId: z.string().min(1),
  expectedSourceRevision: z.number().int().nonnegative(),
  expectedRevision: z.number().int().positive(),
  statement: z.string().min(1).max(4_000),
}).strict();
export type TaskCorrectOperation = z.infer<typeof TaskCorrectOperationSchema>;

export const TaskContinueOperationSchema = z.object({
  kind: z.literal("task_continue"),
  taskId: z.string().min(1),
  expectedSourceRevision: z.number().int().nonnegative(),
  expectedRevision: z.number().int().positive(),
  /**
   * Exact catalog identity copied from the current projection's worker cards.
   * The coordinator chooses semantic suitability; the host validates the exact
   * card identity and never infers a worker from prose or role.
   */
  workerId: z.string().min(1),
  /**
   * The exact execution selection the coordinator observed in the projection:
   * the registered project identity, its expected current-primary head, the
   * exact bound Worktree path, and its expected head. The host re-reads and
   * compares every selector again after lease acquisition and immediately
   * before attempt creation; X→Y drift fails stale with no effect.
   */
  projectId: z.string().min(1),
  expectedPrimaryHead: GitObjectSchema,
  worktreePath: z.string().min(1),
  expectedWorktreeHead: GitObjectSchema,
}).strict();
export type TaskContinueOperation = z.infer<typeof TaskContinueOperationSchema>;

export const WorkControlOperationSchema = z.object({
  kind: z.literal("work_control"),
  carrierId: z.string().min(1),
  control: z.enum(["pause", "resume", "stop", "recover"]),
}).strict();
export type WorkControlOperation = z.infer<typeof WorkControlOperationSchema>;

/** A stable per-conversation contribution key: an identifier, never routed prose. */
export const ContributionKeySchema = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);

/**
 * The caller-facing spawn shape: the semantic contribution intent plus only
 * the non-derivable constraints — the exact catalog worker choice, the
 * capability the work needs, the coordinator's effect-boundary judgment,
 * optional settled-key dependencies, and optional workspace-relative images
 * for a vision worker. The model supplies no Task ID or revision, project
 * ID/primary head, Worktree path/head, source ref, obligation ref,
 * acceptance, execution profile, or withheld authority: the host derives the
 * conversation's current Task from the canonical Task/journal sources and
 * revalidates the exact execution selection from current project/Worktree
 * observations immediately before the effect, so the coordinator can never
 * restate or invent the internal DelegateCall envelope.
 */
export const ContributionSpawnOperationSchema = z.object({
  kind: z.literal("contribution_spawn"),
  key: ContributionKeySchema,
  /** The bounded semantic contribution; host-owned evidence fields are never restated here. */
  intent: z.string().min(1).max(4_000),
  /** One bounded capability the contribution needs; validated against the exact worker's hard labels. */
  capabilityNeed: z.string().regex(/^[a-z][a-z0-9-]*$/),
  /**
   * The coordinator's semantic judgment of the effect boundary. The host
   * enforces the exact boundary: read-only contributions may run bounded in
   * parallel, while one Task/Worktree permits at most one effectful
   * execution owner and overlapping writers are refused.
   */
  effectKind: z.enum(["read-only", "effectful"]),
  /** Exact catalog identity copied from the current projection's worker cards. */
  workerId: z.string().min(1),
  /** Keys of already settled contributions this one depends on. */
  dependsOn: z.array(ContributionKeySchema).default([]),
  /** Workspace-relative local images supplied to a vision-capable worker. */
  imagePaths: z.array(z.string().min(1)).min(1).optional(),
}).strict();
export type ContributionSpawnOperation = z.infer<typeof ContributionSpawnOperationSchema>;

export const ContributionControlOperationSchema = z.object({
  kind: z.literal("contribution_control"),
  batchId: z.string().min(1),
  key: ContributionKeySchema,
  /** A bounded contribution owns only stop; replacement is a new spawn from the latest Task revision. */
  control: z.literal("stop"),
}).strict();
export type ContributionControlOperation = z.infer<typeof ContributionControlOperationSchema>;

export const ConversationOperationSchema = z.discriminatedUnion("kind", [
  TaskCreateOperationSchema,
  TaskCorrectOperationSchema,
  TaskContinueOperationSchema,
  WorkControlOperationSchema,
  ContributionSpawnOperationSchema,
  ContributionControlOperationSchema,
]);
export type ConversationOperation = z.infer<typeof ConversationOperationSchema>;

export const SanitizedUsageSchema = z.object({
  inputTokens: z.number().nonnegative().default(0),
  outputTokens: z.number().nonnegative().default(0),
  totalTokens: z.number().nonnegative().default(0),
  cachedInputTokens: z.number().nonnegative().default(0),
}).strict();
export type SanitizedUsage = z.infer<typeof SanitizedUsageSchema>;

export const ConversationTurnPortEventSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("delta"), text: z.string() }).strict(),
  z.object({ kind: z.literal("request"), request: ConversationTurnRequestSchema }).strict(),
  z.object({ kind: z.literal("operation"), operation: ConversationOperationSchema }).strict(),
  z.object({
    kind: z.literal("finish"),
    provider: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    observedReasoningEffort: z.string().min(1).optional(),
    providerFingerprint: z.string().min(1).optional(),
    usage: z.unknown().optional(),
  }).strict(),
  z.object({ kind: z.literal("error"), message: z.string().min(1) }).strict(),
]);
export type ConversationTurnPortEvent = z.infer<typeof ConversationTurnPortEventSchema>;

export const ConversationTurnSafetyEventSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("delta"), text: z.string() }).strict(),
  z.object({ kind: z.literal("request"), request: ConversationTurnRequestSchema }).strict(),
  z.object({ kind: z.literal("operation"), operation: ConversationOperationSchema }).strict(),
  z.object({ kind: z.literal("finished"), usage: SanitizedUsageSchema }).strict(),
  z.object({ kind: z.literal("error"), message: z.string().min(1) }).strict(),
]);
export type ConversationTurnSafetyEvent = z.infer<typeof ConversationTurnSafetyEventSchema>;

export const RequestedTurnEvidenceSchema = z.object({
  promptRevision: z.string().min(1),
  promptDigest: z.string().regex(/^[a-f0-9]{64}$/),
  disclosedSources: z.array(DisclosedSourceSchema),
  sourceRevisionSelectors: z.array(SourceRevisionSelectorSchema),
  provider: z.string().min(1),
  model: z.string().min(1),
  thinking: z.enum(["enabled", "disabled"]),
  reasoningEffort: z.string().min(1),
}).strict();
export type RequestedTurnEvidence = z.infer<typeof RequestedTurnEvidenceSchema>;

export const ObservedTurnEvidenceSchema = z.object({
  outcome: z.enum(["finished", "failed", "interrupted"]),
  provider: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  reasoningEffort: z.string().min(1).optional(),
  fingerprint: z.string().min(1).optional(),
  usage: SanitizedUsageSchema.optional(),
  error: z.string().min(1).optional(),
}).strict();
export type ObservedTurnEvidence = z.infer<typeof ObservedTurnEvidenceSchema>;

export const ConversationTurnResultSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("finished"),
    text: z.string(),
    request: ConversationTurnRequestSchema.optional(),
    operation: ConversationOperationSchema.optional(),
    usage: SanitizedUsageSchema,
    requested: RequestedTurnEvidenceSchema,
    observed: ObservedTurnEvidenceSchema,
  }).strict(),
  z.object({
    kind: z.literal("failed"),
    text: z.string(),
    error: z.string().min(1),
    requested: RequestedTurnEvidenceSchema,
    observed: ObservedTurnEvidenceSchema,
  }).strict(),
  z.object({
    kind: z.literal("interrupted"),
    text: z.string(),
    requested: RequestedTurnEvidenceSchema,
    observed: ObservedTurnEvidenceSchema,
  }).strict(),
]);
export type ConversationTurnResult = z.infer<typeof ConversationTurnResultSchema>;

export interface ConversationTurnPort {
  run(options: { readonly prompt: ComposedConversationPrompt; readonly signal: AbortSignal }): AsyncIterable<ConversationTurnPortEvent>;
}

export interface ConversationTurnOptions {
  readonly message: PrincipalMessage;
  readonly policy: ConversationPolicy;
  readonly projection?: CompactProjection;
  readonly orientation?: ProjectOrientation;
  readonly children?: readonly ChildSummary[];
  readonly fullChildResults?: readonly FullChildResult[];
  readonly port: ConversationTurnPort;
  readonly onEvent: (event: ConversationTurnSafetyEvent) => void;
}

export interface ConversationTurnHandle {
  readonly result: Promise<ConversationTurnResult>;
  interrupt(): void;
}

/**
 * The subset of a turn the prompt composition actually reads. A caller that
 * must journal the requested evidence before the model call prepares with
 * this input alone; `port` and `onEvent` are run-time concerns only.
 */
export interface ConversationTurnPrepareInput {
  readonly message: PrincipalMessage;
  readonly policy: ConversationPolicy;
  readonly projection?: CompactProjection;
  readonly orientation?: ProjectOrientation;
  readonly children?: readonly ChildSummary[];
  readonly fullChildResults?: readonly FullChildResult[];
}

/**
 * A composed but not yet running turn: the exact prompt handed to the port
 * plus the requested evidence derived from the same composition. Pure and
 * side-effect free, so the caller can durably record `coordinator.turn-started`
 * before any port event is observed.
 */
export interface PreparedConversationTurn {
  readonly prompt: ComposedConversationPrompt;
  readonly requested: RequestedTurnEvidence;
}

export function prepareConversationTurn(input: ConversationTurnPrepareInput): PreparedConversationTurn {
  const composed = composeConversationPrompt(promptInput(input));
  const requested = RequestedTurnEvidenceSchema.parse({
    promptRevision: composed.revision,
    promptDigest: composed.digest,
    disclosedSources: composed.disclosedSources,
    sourceRevisionSelectors: composed.sourceRevisionSelectors,
    provider: input.policy.provider,
    model: input.policy.model,
    thinking: input.policy.thinking,
    reasoningEffort: input.policy.reasoningEffort,
  });
  return { prompt: composed, requested };
}

/**
 * Run an already prepared turn. The caller owns when this begins relative to
 * any durable journal record; the kernel itself composes nothing and emits
 * nothing before the port's first event.
 */
export function startPreparedConversationTurn(
  prepared: PreparedConversationTurn,
  options: {
    readonly port: ConversationTurnPort;
    readonly onEvent: (event: ConversationTurnSafetyEvent) => void;
  },
): ConversationTurnHandle {
  const controller = new AbortController();
  return {
    interrupt: () => controller.abort(),
    result: executeTurn(prepared, options.port, options.onEvent, controller.signal),
  };
}

interface ObservedFacts {
  readonly provider?: string;
  readonly model?: string;
  readonly reasoningEffort?: string;
  readonly fingerprint?: string;
}

const USAGE_FIELDS = ["inputTokens", "outputTokens", "totalTokens", "cachedInputTokens"] as const;

export function sanitizeUsage(raw: unknown): SanitizedUsage {
  const usage: Record<string, number> = {};
  if (typeof raw === "object" && raw !== null) {
    for (const field of USAGE_FIELDS) {
      const value = (raw as Record<string, unknown>)[field];
      const numeric = typeof value === "number" && Number.isFinite(value) ? value : 0;
      usage[field] = numeric >= 0 ? numeric : 0;
    }
  }
  return SanitizedUsageSchema.parse(usage);
}

export function startConversationTurn(options: ConversationTurnOptions): ConversationTurnHandle {
  return startPreparedConversationTurn(
    prepareConversationTurn(options),
    { port: options.port, onEvent: options.onEvent },
  );
}

async function executeTurn(
  prepared: PreparedConversationTurn,
  port: ConversationTurnPort,
  onEvent: (event: ConversationTurnSafetyEvent) => void,
  signal: AbortSignal,
): Promise<ConversationTurnResult> {
  const requested = prepared.requested;

  let text = "";
  let request: ConversationTurnRequest | undefined;
  let operation: ConversationOperation | undefined;
  let sawRequest = false;
  let sawOperation = false;
  let facts: ObservedFacts = {};

  const emit = (event: ConversationTurnSafetyEvent): void => {
    if (signal.aborted) return;
    onEvent(ConversationTurnSafetyEventSchema.parse(event));
  };
  const failed = (error: string): ConversationTurnResult => ConversationTurnResultSchema.parse({
    kind: "failed",
    text,
    error,
    requested,
    observed: buildObserved("failed", facts, { error }),
  });
  const interrupted = (): ConversationTurnResult => ConversationTurnResultSchema.parse({
    kind: "interrupted",
    text,
    requested,
    observed: buildObserved("interrupted", facts, {}),
  });

  try {
    for await (const rawEvent of port.run({ prompt: prepared.prompt, signal })) {
      if (signal.aborted) break;
      let event: ConversationTurnPortEvent;
      try {
        event = ConversationTurnPortEventSchema.parse(rawEvent);
      } catch {
        emit({ kind: "error", message: "malformed turn port event; the turn cannot be interpreted" });
        return failed("malformed turn port event");
      }
      switch (event.kind) {
        case "delta": {
          emit({ kind: "delta", text: event.text });
          text += event.text;
          break;
        }
        case "request": {
          if (sawRequest || sawOperation) {
            emit({
              kind: "error",
              message: `duplicate ${event.request.kind} request; at most one request or operation per Principal message`,
            });
            return failed(`duplicate ${event.request.kind} request; at most one request or operation per Principal message`);
          }
          sawRequest = true;
          request = event.request;
          emit({ kind: "request", request: event.request });
          break;
        }
        case "operation": {
          if (sawRequest || sawOperation) {
            emit({
              kind: "error",
              message: `duplicate ${event.operation.kind} operation; at most one consequential operation per Principal message`,
            });
            return failed(`duplicate ${event.operation.kind} operation; at most one consequential operation per Principal message`);
          }
          sawOperation = true;
          operation = event.operation;
          emit({ kind: "operation", operation: event.operation });
          break;
        }
        case "finish": {
          facts = observedFacts(event);
          const mismatch = verifyObservedFacts(facts, requested);
          if (mismatch !== undefined) {
            emit({ kind: "error", message: mismatch });
            return failed(mismatch);
          }
          const usage = sanitizeUsage(event.usage);
          emit({ kind: "finished", usage });
          return ConversationTurnResultSchema.parse({
            kind: "finished",
            text,
            ...(request === undefined ? {} : { request }),
            ...(operation === undefined ? {} : { operation }),
            usage,
            requested,
            observed: buildObserved("finished", facts, { usage }),
          });
        }
        case "error": {
          emit({ kind: "error", message: event.message });
          return failed(event.message);
        }
      }
    }
  } catch (error) {
    if (signal.aborted) return interrupted();
    const message = error instanceof Error ? error.message : String(error);
    emit({ kind: "error", message: `turn port failed: ${message}` });
    return failed(`turn port failed: ${message}`);
  }

  if (signal.aborted) return interrupted();
  emit({ kind: "error", message: "turn port ended without finish, error, or interruption" });
  return failed("turn port ended without finish, error, or interruption");
}

function promptInput(input: ConversationTurnPrepareInput): ConversationPromptInput {
  return {
    message: input.message,
    policy: input.policy,
    ...(input.projection === undefined ? {} : { projection: input.projection }),
    ...(input.orientation === undefined ? {} : { orientation: input.orientation }),
    ...(input.children === undefined || input.children.length === 0 ? {} : { children: [...input.children] }),
    ...(input.fullChildResults === undefined || input.fullChildResults.length === 0
      ? {}
      : { fullChildResults: [...input.fullChildResults] }),
  };
}

function observedFacts(event: Extract<ConversationTurnPortEvent, { kind: "finish" }>): ObservedFacts {
  return {
    ...(event.provider === undefined ? {} : { provider: event.provider }),
    ...(event.model === undefined ? {} : { model: event.model }),
    ...(event.observedReasoningEffort === undefined
      ? {}
      : { reasoningEffort: event.observedReasoningEffort }),
    ...(event.providerFingerprint === undefined
      ? {}
      : { fingerprint: event.providerFingerprint }),
  };
}

function verifyObservedFacts(facts: ObservedFacts, requested: RequestedTurnEvidence): string | undefined {
  if (facts.provider !== undefined && facts.provider !== requested.provider) {
    return `observed provider ${facts.provider} does not match requested provider ${requested.provider}`;
  }
  if (facts.model !== undefined && facts.model !== requested.model) {
    return `observed model ${facts.model} does not match requested model ${requested.model}`;
  }
  if (
    facts.reasoningEffort !== undefined
    && facts.reasoningEffort !== "unavailable"
    && facts.reasoningEffort !== requested.reasoningEffort
  ) {
    return `observed reasoning effort ${facts.reasoningEffort} does not match requested reasoning effort ${requested.reasoningEffort}`;
  }
  return undefined;
}

function buildObserved(
  outcome: ObservedTurnEvidence["outcome"],
  facts: ObservedFacts,
  extra: { error?: string; usage?: SanitizedUsage },
): ObservedTurnEvidence {
  return ObservedTurnEvidenceSchema.parse({
    outcome,
    ...(facts.provider === undefined ? {} : { provider: facts.provider }),
    ...(facts.model === undefined ? {} : { model: facts.model }),
    ...(facts.reasoningEffort === undefined ? { reasoningEffort: "unavailable" } : { reasoningEffort: facts.reasoningEffort }),
    ...(facts.fingerprint === undefined ? {} : { fingerprint: facts.fingerprint }),
    ...(extra.error === undefined ? {} : { error: extra.error }),
    ...(extra.usage === undefined ? {} : { usage: extra.usage }),
  });
}
