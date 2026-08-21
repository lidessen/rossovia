import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { z } from "zod";
import { UsageSchema, type CellInput } from "../../../packages/work-cell/src/contracts";
import { resolveHome } from "./home";
import {
  readStrictTaskAttemptEvidence,
  type StrictTaskAttemptEvidence,
} from "./task-attempts";
import {
  executeTaskCellRun,
  ordinaryOpenCodeExcludes,
} from "./task-run";

export const WORKFLOW_REVIEW_LOG_VERSION = "rossovia.workflow-review.v1" as const;
export const LEGACY_DOGFOOD_REVIEW_LOG_VERSION = "rosso.dogfood-review.v1" as const;
export const DEFAULT_WORKFLOW_OBSERVER_WORKER = "deepseek-flash" as const;
/** Hard upper bound for the context string sent to an observer worker. */
export const OBSERVER_CONTEXT_MAX_BYTES = 32 * 1024;

export interface WorkflowObserverArguments {
  readonly home?: string;
  readonly attemptId: string;
  readonly workerId: string;
}

export interface WorkflowObserverLaunchResult {
  readonly version: "rossovia.workflow-observer-launch.v1";
  readonly status: "started";
  readonly attemptId: string;
  readonly workerId: string;
}

export interface WorkflowObserverResult {
  readonly version: "rossovia.workflow-observer-result.v1";
  readonly reviewId: string;
  readonly attemptId: string;
  readonly taskId?: string;
  readonly workerId: string;
  readonly standing: "recorded" | "query-gap" | "runner-failed";
  readonly logRef: string;
  readonly finding: string;
}

const WorkflowReviewLogRecordSchema = z.object({
  version: z.literal(WORKFLOW_REVIEW_LOG_VERSION),
  reviewId: z.string().min(1),
  recordedAt: z.string().min(1),
  subject: z.object({
    type: z.literal("workflow-task-attempt"),
    taskId: z.string().min(1).optional(),
    attemptId: z.string().min(1),
  }).strict(),
  observer: z.object({
    kind: z.literal("agent"),
    workerId: z.string().min(1),
  }).strict(),
  subjectOutcome: z.object({
    settlementStatus: z.enum(["recorded", "runner-failed", "control-stopped"]),
    cellStatus: z.string().min(1).optional(),
    finalStatus: z.string().min(1).optional(),
    semanticAcceptance: z.literal("not-evaluated"),
  }).strict().optional(),
  standing: z.enum(["recorded", "query-gap", "runner-failed"]),
  evidenceRefs: z.array(z.string().min(1)),
  finding: z.string().min(1),
  reviewText: z.string().optional(),
  observerRun: z.object({
    runId: z.string().min(1),
    status: z.enum([
      "passed",
      "failed",
      "verification_failed",
      "protocol_error",
      "capability_mismatch",
      "cancelled",
    ]),
    usage: UsageSchema,
  }).strict().optional(),
}).strict();

const LegacyDogfoodReviewLogRecordSchema = z.object({
  version: z.literal(LEGACY_DOGFOOD_REVIEW_LOG_VERSION),
  reviewId: z.string().min(1),
  recordedAt: z.string().min(1),
  subject: z.object({
    type: z.literal("dogfood-task-attempt"),
    taskId: z.string().min(1).optional(),
    attemptId: z.string().min(1),
  }).strict(),
  observer: z.object({
    kind: z.literal("agent"),
    workerId: z.string().min(1),
  }).strict(),
  standing: z.enum(["recorded", "query-gap", "runner-failed"]),
  evidenceRefs: z.array(z.string().min(1)),
  finding: z.string().min(1),
  reviewText: z.string().optional(),
  observerRun: z.object({
    runId: z.string().min(1),
    status: z.enum([
      "passed",
      "failed",
      "verification_failed",
      "protocol_error",
      "capability_mismatch",
      "cancelled",
    ]),
    usage: UsageSchema,
  }).strict().optional(),
}).strict();
const StoredWorkflowReviewLogRecordSchema = z.union([
  WorkflowReviewLogRecordSchema,
  LegacyDogfoodReviewLogRecordSchema,
]);

export type WorkflowReviewLogRecord = z.infer<typeof WorkflowReviewLogRecordSchema>;

export function workflowReviewLogPath(homeArgument?: string): string {
  return join(resolveHome(homeArgument), "state", "workflow-reviews.jsonl");
}

/** Read-only compatibility location for records written by the old dogfood-only observer. */
export function legacyDogfoodReviewLogPath(homeArgument?: string): string {
  return join(resolveHome(homeArgument), "state", "dogfood-reviews.jsonl");
}

/** Return the exact append-only files participating in a workflow review read. */
export function workflowReviewReadPaths(homeArgument?: string): string[] {
  return [workflowReviewLogPath(homeArgument), legacyDogfoodReviewLogPath(homeArgument)]
    .filter((path, index, all) => all.indexOf(path) === index && existsSync(path));
}

/**
 * Append one review opinion without creating an inbox, queue, or mutable
 * review state. The source task and attempt remain authoritative; this file is
 * only a local, append-only observation projection.
 */
export function appendWorkflowReview(
  homeArgument: string | undefined,
  record: WorkflowReviewLogRecord,
): string {
  const validated = WorkflowReviewLogRecordSchema.parse(record);
  const path = workflowReviewLogPath(homeArgument);
  mkdirSync(join(resolveHome(homeArgument), "state"), { recursive: true });
  appendFileSync(path, `${JSON.stringify(validated)}\n`, "utf8");
  return path;
}

/** Read and validate the source-native review store for a later ordinary Task. */
export function readWorkflowReviews(homeArgument?: string): WorkflowReviewLogRecord[] {
  return workflowReviewReadPaths(homeArgument).flatMap((path) => readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      try {
        const parsed = StoredWorkflowReviewLogRecordSchema.parse(JSON.parse(line));
        return {
          ...parsed,
          version: WORKFLOW_REVIEW_LOG_VERSION,
          subject: { ...parsed.subject, type: "workflow-task-attempt" as const },
        };
      } catch (error) {
        throw new Error(
          `workflow review store record ${index + 1} is invalid: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    })).sort((left, right) => left.recordedAt.localeCompare(right.recordedAt));
}

/** Record a launch failure without allowing the detached child error to crash the Task CLI. */
export function recordWorkflowObserverLaunchFailure(
  arguments_: WorkflowObserverArguments,
  finding: string,
): WorkflowObserverResult {
  const home = resolveHome(arguments_.home);
  const reviewId = `review-${arguments_.attemptId}-${randomUUID()}`;
  const path = appendWorkflowReview(home, {
    version: WORKFLOW_REVIEW_LOG_VERSION,
    reviewId,
    recordedAt: new Date().toISOString(),
    subject: { type: "workflow-task-attempt", attemptId: arguments_.attemptId },
    observer: { kind: "agent", workerId: arguments_.workerId },
    standing: "runner-failed",
    evidenceRefs: [],
    finding,
  });
  return {
    version: "rossovia.workflow-observer-result.v1",
    reviewId,
    attemptId: arguments_.attemptId,
    workerId: arguments_.workerId,
    standing: "runner-failed",
    logRef: relative(home, path),
    finding,
  };
}

/**
 * Run one optional read-only review against the strict attempt evidence. No
 * Task lifecycle or writer lease is created for the observer itself.
 */
export async function runWorkflowObserver(
  arguments_: WorkflowObserverArguments,
): Promise<WorkflowObserverResult> {
  const home = resolveHome(arguments_.home);
  const reviewId = `review-${arguments_.attemptId}-${randomUUID()}`;
  let evidence: StrictTaskAttemptEvidence | undefined;
  let evidenceError: string | undefined;
  try {
    evidence = readStrictTaskAttemptEvidence(home, arguments_.attemptId);
  } catch (error: unknown) {
    evidenceError = error instanceof Error ? error.message : String(error);
  }
  const taskId = evidence?.attempt?.taskId;
  const subjectOutcome = evidence?.settlement === undefined
    ? undefined
    : {
      settlementStatus: evidence.settlement.status,
      ...(evidence.settlement.cellStatus === undefined ? {} : { cellStatus: evidence.settlement.cellStatus }),
      ...(evidence.finalRecord === undefined ? {} : { finalStatus: evidence.finalRecord.status }),
      semanticAcceptance: evidence.settlement.semanticAcceptance,
    };
  const base = {
    version: WORKFLOW_REVIEW_LOG_VERSION,
    reviewId,
    recordedAt: new Date().toISOString(),
    subject: {
      type: "workflow-task-attempt" as const,
      ...(taskId === undefined ? {} : { taskId }),
      attemptId: arguments_.attemptId,
    },
    observer: { kind: "agent" as const, workerId: arguments_.workerId },
    ...(subjectOutcome === undefined ? {} : { subjectOutcome }),
    evidenceRefs: evidence === undefined ? [] : [
      evidence.refs.attemptRef,
      evidence.refs.inputRef,
      evidence.refs.finalRecordRef,
      evidence.refs.settlementRef,
    ],
  };

  if (
    evidenceError !== undefined
    || evidence === undefined
    || evidence.standing !== "available"
    || evidence.input === undefined
    || evidence.finalRecord === undefined
    || evidence.settlement === undefined
  ) {
    const finding = evidenceError
      ?? evidence?.error
      ?? "standard attempt API did not expose a complete terminal evidence family";
    const path = appendWorkflowReview(home, {
      ...base,
      standing: "query-gap",
      finding,
    });
    return {
      version: "rossovia.workflow-observer-result.v1",
      reviewId,
      attemptId: arguments_.attemptId,
      ...(taskId === undefined ? {} : { taskId }),
      workerId: arguments_.workerId,
      standing: "query-gap",
      logRef: relative(home, path),
      finding,
    };
  }

  try {
    const availableEvidence = evidence;
    const policy = require("../../autonomy/src/worker-policy") as typeof import("../../autonomy/src/worker-policy");
    const catalog = policy.createCurrentWorkerCatalog();
    const worker = catalog.card(arguments_.workerId);
    const worktree = availableEvidence.input!.workspace.root;
    const context = workflowObserverContext(availableEvidence);
    const input: CellInput = {
      id: `workflow-observer-${reviewId}`,
      workerId: worker.id,
      executionProfile: worker.executionProfile,
      intent:
        "Review one settled project task or conversation Run. Return only evidence-backed findings and visibility gaps; do not edit or accept work.",
      workspace: {
        root: worktree,
        readPaths: [],
        writePaths: [],
        excludePaths: safeExcludes(worktree),
        allowedCommands: [],
      },
      instructions: [
        "Use only the supplied standard API evidence context.",
        "Separate observed facts, interpretation, and uncertainty.",
        "Report only defects, regressions, friction, or observability gaps that could change the next practice.",
        "Do not edit files, retry the task, accept or merge anything, roll back the runtime, or create another task.",
      ],
      capabilities: [],
      context: [{
        id: "workflow-attempt-evidence",
        title: "Settled project task evidence",
        content: context,
        sources: base.evidenceRefs,
      }],
      capabilitiesRequired: [],
      acceptance: ["Return a concise review with evidence references and explicit limitations."],
      budget: { maxDurationMs: 300_000, maxCommandOutputBytes: 64_000 },
    };
    const execution = await executeTaskCellRun(catalog, input, {
      host: require("../../../packages/work-cell/src/workspace").createLocalHost(),
    });
    if (execution.status === "failed") {
      const path = appendWorkflowReview(home, {
        ...base,
        standing: "runner-failed",
        finding: execution.error,
      });
      return {
        version: "rossovia.workflow-observer-result.v1",
        reviewId,
        attemptId: arguments_.attemptId,
        ...(taskId === undefined ? {} : { taskId }),
        workerId: arguments_.workerId,
        standing: "runner-failed",
        logRef: relative(home, path),
        finding: execution.error,
      };
    }
    const finding = execution.record.finalText.trim() || "observer returned no review text";
    const path = appendWorkflowReview(home, {
      ...base,
      standing: "recorded",
      finding,
      reviewText: execution.record.finalText,
      observerRun: {
        runId: execution.record.runId,
        status: execution.record.status,
        usage: execution.record.usage,
      },
    });
    return {
      version: "rossovia.workflow-observer-result.v1",
      reviewId,
      attemptId: arguments_.attemptId,
      ...(taskId === undefined ? {} : { taskId }),
      workerId: arguments_.workerId,
      standing: "recorded",
      logRef: relative(home, path),
      finding,
    };
  } catch (error: unknown) {
    const finding = error instanceof Error ? error.message : String(error);
    const path = appendWorkflowReview(home, {
      ...base,
      standing: "runner-failed",
      finding,
    });
    return {
      version: "rossovia.workflow-observer-result.v1",
      reviewId,
      attemptId: arguments_.attemptId,
      ...(taskId === undefined ? {} : { taskId }),
      workerId: arguments_.workerId,
      standing: "runner-failed",
      logRef: relative(home, path),
      finding,
    };
  }
}

/**
 * Build the bounded, standard-API context supplied to a read-only observer.
 *
 * The observer needs enough retained evidence to compare terminal relations,
 * but it must not receive provider steps, the original input/result payloads,
 * or trace event data. Keep this projection deliberately structural: the
 * source refs remain the route for a later ordinary Task to inspect evidence.
 */
export function workflowObserverContext(evidence: StrictTaskAttemptEvidence): string {
  const projectionState: ProjectionState = { truncatedFields: [] };
  const finalRecord = evidence.finalRecord!;
  const context = {
    contextVersion: "rossovia.workflow-observer-context.v2",
    taskId: boundedOptionalString(evidence.attempt?.taskId, "taskId", projectionState),
    taskRevision: evidence.attempt?.taskRevision,
    sourceRevision: evidence.attempt?.sourceRevision,
    attempt: {
      workerId: boundedOptionalString(evidence.attempt?.workerId, "attempt.workerId", projectionState),
      driver: boundedOptionalString(evidence.attempt?.driver, "attempt.driver", projectionState),
      model: boundedOptionalString(evidence.attempt?.model, "attempt.model", projectionState),
      startedAt: boundedOptionalString(evidence.attempt?.startedAt, "attempt.startedAt", projectionState),
      settlement: settlementSummary(evidence.settlement, projectionState),
    },
    input: {
      intentPresent: evidence.input?.intent !== undefined,
      instructionCount: evidence.input?.instructions.length ?? 0,
      acceptanceCount: evidence.input?.acceptance.length ?? 0,
      capabilities: boundedStrings(evidence.input?.capabilities ?? [], "input.capabilities", projectionState),
      capabilitiesRequired: boundedStrings(
        evidence.input?.capabilitiesRequired ?? [],
        "input.capabilitiesRequired",
        projectionState,
      ),
      workspace: evidence.input === undefined ? undefined : {
        rootPresent: evidence.input.workspace.root.length > 0,
        readPathCount: evidence.input.workspace.readPaths.length,
        writePathCount: evidence.input.workspace.writePaths.length,
        allowedCommandCount: evidence.input.workspace.allowedCommands.length,
        allowedCommands: boundedStrings(
          evidence.input.workspace.allowedCommands,
          "input.workspace.allowedCommands",
          projectionState,
        ),
      },
    },
    final: {
      runId: boundedString(finalRecord.runId, "final.runId", projectionState),
      status: boundedString(finalRecord.status, "final.status", projectionState),
      result: {
        present: finalRecord.finalText.length > 0,
        characterCount: finalRecord.finalText.length,
        lineCount: finalRecord.finalText.length === 0 ? 0 : finalRecord.finalText.split("\n").length,
      },
      ...(evidence.input?.outputSchema === undefined ? {} : {
        // A caller-declared structured output is still an opaque payload.
        // Expose only metadata until a separate caller-owned visibility
        // projection explicitly grants selected fields to an observer.
        structuredOutput: structuredOutputMetadata(evidence, projectionState),
      }),
      workspaceDiff: workspaceDiffSummary(finalRecord.workspaceDiff, projectionState),
      usage: finalRecord.usage,
      verification: verificationSummary(finalRecord.verification, projectionState),
      executionObservation: executionObservationSummary(finalRecord.executionObservation, projectionState),
      trace: traceSummary(finalRecord.trace, projectionState),
      rawStepCount: finalRecord.rawSteps.length,
      errorPresent: finalRecord.error !== undefined,
    },
    refs: {
      inputRef: boundedString(evidence.refs.inputRef, "refs.inputRef", projectionState),
      attemptRef: boundedString(evidence.refs.attemptRef, "refs.attemptRef", projectionState),
      finalRecordRef: boundedString(evidence.refs.finalRecordRef, "refs.finalRecordRef", projectionState),
      settlementRef: boundedString(evidence.refs.settlementRef, "refs.settlementRef", projectionState),
    },
    truncatedFields: projectionState.truncatedFields,
    limitation: "Raw provider steps, original input/result payloads, trace event data, and structured output values are not copied into the observer context. Declared structured output exposes metadata only; report a query gap when semantic review needs an explicitly permitted field projection.",
  };
  return serializeObserverContext(context);
}

const OBSERVER_CONTEXT_LIST_LIMIT = 64;
const OBSERVER_CONTEXT_STRING_LIMIT = 256;
const OBSERVER_CONTEXT_TRUNCATION_FIELD_LIMIT = 128;

interface ProjectionState {
  readonly truncatedFields: string[];
}

function boundedString(value: string, field: string, state: ProjectionState): string {
  if (value.length <= OBSERVER_CONTEXT_STRING_LIMIT) return value;
  if (state.truncatedFields.length < OBSERVER_CONTEXT_TRUNCATION_FIELD_LIMIT
    && !state.truncatedFields.includes(field)) {
    state.truncatedFields.push(field);
  }
  return value.slice(0, OBSERVER_CONTEXT_STRING_LIMIT);
}

function boundedOptionalString(
  value: string | undefined,
  field: string,
  state: ProjectionState,
): string | undefined {
  return value === undefined ? undefined : boundedString(value, field, state);
}

function boundedStrings(
  values: readonly string[],
  field: string,
  state: ProjectionState,
): { values: string[]; truncated: boolean; valueTruncated: boolean } {
  let valueTruncated = false;
  const valuesWithinLimit = values.slice(0, OBSERVER_CONTEXT_LIST_LIMIT).map((value, index) => {
    const bounded = boundedString(value, `${field}[${index}]`, state);
    if (bounded.length !== value.length) valueTruncated = true;
    return bounded;
  });
  if (values.length > valuesWithinLimit.length
    && state.truncatedFields.length < OBSERVER_CONTEXT_TRUNCATION_FIELD_LIMIT
    && !state.truncatedFields.includes(field)) {
    state.truncatedFields.push(field);
  }
  return {
    values: valuesWithinLimit,
    truncated: values.length > valuesWithinLimit.length,
    valueTruncated,
  };
}

function workspaceDiffSummary(diff: {
  added: readonly string[];
  changed: readonly string[];
  removed: readonly string[];
}, state: ProjectionState): Record<string, unknown> {
  return {
    added: boundedStrings(diff.added, "final.workspaceDiff.added", state),
    changed: boundedStrings(diff.changed, "final.workspaceDiff.changed", state),
    removed: boundedStrings(diff.removed, "final.workspaceDiff.removed", state),
  };
}

function verificationSummary(verification: {
  passed: boolean;
  terminal: { passed: boolean; required: readonly string[]; called: readonly string[] };
  output?: { passed: boolean; errors: readonly string[] };
  artifacts?: { passed: boolean; errors: readonly string[] };
  tasks?: {
    passed: boolean;
    pending: number;
    inProgress: number;
    completed: number;
    blocked: number;
    errors: readonly string[];
  };
}, state: ProjectionState): Record<string, unknown> {
  return {
    passed: verification.passed,
    terminal: {
      passed: verification.terminal.passed,
      required: boundedStrings(verification.terminal.required, "final.verification.terminal.required", state),
      called: boundedStrings(verification.terminal.called, "final.verification.terminal.called", state),
    },
    ...(verification.output === undefined ? {} : {
      output: {
        passed: verification.output.passed,
        errorCount: verification.output.errors.length,
      },
    }),
    ...(verification.artifacts === undefined ? {} : {
      artifacts: {
        passed: verification.artifacts.passed,
        errorCount: verification.artifacts.errors.length,
      },
    }),
    ...(verification.tasks === undefined ? {} : {
      tasks: {
        passed: verification.tasks.passed,
        pending: verification.tasks.pending,
        inProgress: verification.tasks.inProgress,
        completed: verification.tasks.completed,
        blocked: verification.tasks.blocked,
        errorCount: verification.tasks.errors.length,
      },
    }),
  };
}

function executionObservationSummary(
  observation: NonNullable<StrictTaskAttemptEvidence["finalRecord"]>["executionObservation"],
  state: ProjectionState,
): Record<string, unknown> {
  return {
    sessionId: visibleIdentitySummary(observation.sessionId, "final.executionObservation.sessionId", state),
    providerFingerprint: visibleIdentitySummary(
      observation.providerFingerprint,
      "final.executionObservation.providerFingerprint",
      state,
    ),
    providerFingerprintStanding: observation.providerFingerprintStanding === undefined
      ? { present: false }
      : {
        present: true,
        standing: boundedString(
          observation.providerFingerprintStanding.standing,
          "final.executionObservation.providerFingerprintStanding",
          state,
        ),
      },
    workEstimateId: visibleIdentitySummary(
      observation.workEstimateId,
      "final.executionObservation.workEstimateId",
      state,
    ),
    executionProfileId: visibleIdentitySummary(
      observation.executionProfileId,
      "final.executionObservation.executionProfileId",
      state,
    ),
    priceRevision: visibleIdentitySummary(
      observation.priceRevision,
      "final.executionObservation.priceRevision",
      state,
    ),
  };
}

function visibleIdentitySummary(
  value: string | undefined,
  field: string,
  state: ProjectionState,
): Record<string, unknown> {
  if (value === undefined) return { present: false };
  const visibleValue = boundedString(value, field, state);
  return {
    present: true,
    value: visibleValue,
    truncated: visibleValue.length !== value.length,
    characterCount: value.length,
    // Retain a stable comparison token when a long value is clipped. The
    // displayed prefix alone must not make two distinct provider/session
    // identities look identical to the observer.
    identity: `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`,
  };
}

function settlementSummary(
  settlement: StrictTaskAttemptEvidence["settlement"],
  state: ProjectionState,
): Record<string, unknown> | undefined {
  if (settlement === undefined) return undefined;
  return {
    status: boundedString(settlement.status, "attempt.settlement.status", state),
    semanticAcceptance: boundedString(settlement.semanticAcceptance, "attempt.settlement.semanticAcceptance", state),
    ...(settlement.cellStatus === undefined ? {} : {
      cellStatus: boundedString(settlement.cellStatus, "attempt.settlement.cellStatus", state),
    }),
    workCellRunIdPresent: settlement.workCellRunId !== undefined,
    errorPresent: settlement.error !== undefined,
  };
}

const OBSERVER_STRUCTURED_OUTPUT_DEPTH_LIMIT = 4;
const OBSERVER_STRUCTURED_OUTPUT_COLLECTION_LIMIT = 32;

function structuredOutputMetadata(
  evidence: StrictTaskAttemptEvidence,
  state: ProjectionState,
): Record<string, unknown> {
  const output = evidence.finalRecord?.output;
  const schema = evidence.input?.outputSchema;
  return {
    declared: true,
    present: output !== undefined,
    valid: evidence.finalRecord?.verification.output?.passed === true,
    visibility: "metadata-only",
    schemaDigest: digestJson(schema),
    ...(output === undefined ? {} : { valueDigest: digestJson(output) }),
    shape: structuredShapeSummary(output, "final.structuredOutput.shape", state, 0),
  };
}

/**
 * Describe only the shape of a caller-declared JSON result. The observer
 * never receives values here: OutputSchema is a validation contract, not a
 * visibility grant. A future explicit caller-owned projection may add
 * selected fields without changing this metadata boundary.
 */
function structuredShapeSummary(
  value: unknown,
  field: string,
  state: ProjectionState,
  depth: number,
): unknown {
  if (value === undefined) return { present: false };
  if (value === null) return { type: "null" };
  if (typeof value === "boolean") return { type: "boolean" };
  if (typeof value === "string") return { type: "string", characterCount: value.length };
  if (typeof value === "number") return { type: Number.isFinite(value) ? "number" : "non-finite-number" };
  if (depth >= OBSERVER_STRUCTURED_OUTPUT_DEPTH_LIMIT) {
    recordTruncation(state, field);
    return { type: "truncated", reason: "depth" };
  }
  if (Array.isArray(value)) {
    const visible = value.slice(0, OBSERVER_STRUCTURED_OUTPUT_COLLECTION_LIMIT)
      .map((entry, index) => structuredShapeSummary(entry, `${field}[${index}]`, state, depth + 1));
    if (value.length > visible.length) recordTruncation(state, field);
    return {
      itemShapes: visible,
      itemCount: value.length,
      truncated: value.length > visible.length,
    };
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
    const visible = entries.slice(0, OBSERVER_STRUCTURED_OUTPUT_COLLECTION_LIMIT).map(([key, entry]) => ({
      key: boundedString(key, `${field}.key`, state),
      shape: structuredShapeSummary(entry, `${field}.${key}`, state, depth + 1),
    }));
    if (entries.length > visible.length) recordTruncation(state, field);
    return {
      fields: visible,
      fieldCount: entries.length,
      truncated: entries.length > visible.length,
    };
  }
  return { type: typeof value };
}

function digestJson(value: unknown): string {
  if (value === undefined) return "sha256:absent";
  try {
    return `sha256:${createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex")}`;
  } catch {
    return "sha256:unavailable";
  }
}

function recordTruncation(state: ProjectionState, field: string): void {
  if (state.truncatedFields.length < OBSERVER_CONTEXT_TRUNCATION_FIELD_LIMIT
    && !state.truncatedFields.includes(field)) {
    state.truncatedFields.push(field);
  }
}

function traceSummary(trace: readonly { at: string; type: string }[], state: ProjectionState): Record<string, unknown> {
  const typeCounts = new Map<string, number>();
  for (const event of trace) typeCounts.set(event.type, (typeCounts.get(event.type) ?? 0) + 1);
  const typeEntries = [...typeCounts.entries()].sort(([left], [right]) => left.localeCompare(right));
  const boundedTypeEntries = typeEntries.slice(0, OBSERVER_CONTEXT_LIST_LIMIT).map(([type, count], index) => ({
    type: boundedString(type, `final.trace.typeCounts[${index}].type`, state),
    count,
    truncated: type.length > OBSERVER_CONTEXT_STRING_LIMIT,
    // Keep an unambiguous identity for a clipped label. The list shape avoids
    // object-key overwrite, while this digest prevents equal prefixes from
    // becoming indistinguishable in the observer's evidence.
    typeIdentity: `sha256:${createHash("sha256").update(type, "utf8").digest("hex")}`,
  }));
  const visibleTypeCounts = new Map<string, number>();
  for (const entry of boundedTypeEntries) visibleTypeCounts.set(entry.type, (visibleTypeCounts.get(entry.type) ?? 0) + 1);
  return {
    eventCount: trace.length,
    // An array is intentional: clipped type labels can share a prefix without
    // silently overwriting one another as object keys.
    typeCounts: boundedTypeEntries,
    typeCountsEncoding: "list-no-key-collision",
    typeKeyCollision: [...visibleTypeCounts.values()].some((count) => count > 1),
    typeCountsTruncated: typeEntries.length > boundedTypeEntries.length,
    firstAt: boundedOptionalString(trace[0]?.at, "final.trace.firstAt", state),
    lastAt: boundedOptionalString(trace.at(-1)?.at, "final.trace.lastAt", state),
  };
}

function serializeObserverContext(context: Record<string, unknown>): string {
  const serialized = JSON.stringify(context, null, 2);
  if (Buffer.byteLength(serialized, "utf8") <= OBSERVER_CONTEXT_MAX_BYTES) return serialized;

  const fallback = JSON.stringify({
    contextVersion: "rossovia.workflow-observer-context.v2",
    contextTruncated: true,
    originalByteLength: Buffer.byteLength(serialized, "utf8"),
    refs: context.refs,
    truncatedFields: ["<context>"],
    limitation: "Observer context exceeded its byte bound; use evidence refs for a later ordinary Task query.",
  });
  if (Buffer.byteLength(fallback, "utf8") <= OBSERVER_CONTEXT_MAX_BYTES) return fallback;
  return JSON.stringify({ contextTruncated: true });
}

function safeExcludes(worktree: string): string[] {
  try {
    return ordinaryOpenCodeExcludes(worktree);
  } catch {
    return [];
  }
}
