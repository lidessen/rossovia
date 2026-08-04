import {
  ToolLoopAgent,
  isStepCount,
  tool,
  type JSONValue,
  type LanguageModel,
  type ModelMessage,
} from "ai";
import { z } from "zod";
import type {
  CellRunRecord,
  CellUsage,
  Task,
  TaskSeed,
  TraceEvent,
} from "../../../packages/work-cell/src/contracts";
import {
  JsonFileInputRefSchema,
  readJsonFileInput,
} from "../../../packages/work-cell/src/file-input";
import { normalizeAiSdkUsage } from "../../../packages/work-cell/src/ai-sdk-usage";
import type { CellDriver } from "../../../packages/work-cell/src/driver";
import type { SwarmCellOutcome } from "../../../packages/work-cell/src/swarm";
import { TaskStore } from "../../../packages/work-cell/src/task-store";
import { createTaskTools } from "../../../packages/work-cell/src/task-tools";
import {
  admitPreparedDelegateBatch,
  runAdmittedDelegateBatch,
  type AdmittedDelegateBatch,
  type DelegateBatchRun,
  type PreparedDelegateBatch,
  type PreparedDelegateContribution,
  type TaskShapeAdmission,
} from "./delegate-admission";

export const DelegateCallSchema = z.object({
  key: z.string().min(1),
  taskId: z.string().min(1),
  task: z.string().min(1),
  sourceRefs: z.array(z.string().min(1)).min(1),
  obligationRefs: z.array(z.string().min(1)).min(1),
  acceptance: z.array(z.string().min(1)).min(1),
  capabilityNeed: z.string().min(1),
}).strict();

export type DelegateCall = z.infer<typeof DelegateCallSchema>;

export const DelegateFileCallSchema = JsonFileInputRefSchema;
export type DelegateFileCall = z.infer<typeof DelegateFileCallSchema>;

const DelegateToolResultSchema = z.object({
  batchId: z.string(),
  key: z.string(),
  cellId: z.string(),
  status: z.string(),
  runId: z.string().optional(),
  artifactRefs: z.array(z.string()),
  resultFile: z.string().optional(),
  uncoveredObligationRefs: z.array(z.string()),
}).strict();

const ReadDelegateResultCallSchema = z.object({
  batchId: z.string().min(1),
  key: z.string().min(1),
}).strict();

export const DelegateResultReadReceiptSchema = z.object({
  batchId: z.string().min(1),
  key: z.string().min(1),
  cellId: z.string().min(1),
  status: z.string().min(1),
  settlementDigest: z.string().regex(/^[a-f0-9]{64}$/),
  semanticDigest: z.string().regex(/^[a-f0-9]{64}$/),
  semanticBytes: z.number().int().nonnegative(),
  projection: z.enum(["full", "metadata-only"]),
}).strict();

export type DelegateResultReadReceipt = z.infer<typeof DelegateResultReadReceiptSchema>;

export interface DelegateResultProjection {
  readonly receipt: DelegateResultReadReceipt;
  readonly semantic?: {
    readonly finalText: string;
    readonly output?: unknown;
    readonly artifacts: readonly unknown[];
    readonly verification: unknown;
  };
  readonly omission?: {
    readonly reason: "projection-too-large" | "runner-error";
    readonly maxBytes: number;
  };
}

/** Host-owned execution material. Model-authored semantic fields are merged separately. */
export interface PreparedDelegateExecution {
  readonly label?: string;
  readonly dependsOn: readonly string[];
  readonly taskShape: TaskShapeAdmission;
  readonly cell: unknown;
}

export interface DelegateLoopInput {
  readonly id: string;
  readonly instructions: string;
  readonly messages: readonly ModelMessage[];
  readonly tasks?: readonly TaskSeed[];
  readonly whole: PreparedDelegateBatch["whole"];
}

export interface DelegateLoopOptions {
  readonly model: LanguageModel;
  readonly prepareContribution: (call: DelegateCall) => Promise<PreparedDelegateExecution>;
  /** Enables `delegate_file`; the model can name files only inside this host-owned root. */
  readonly delegateInputRoot?: string;
  /**
   * Forces the first submission boundary through one delegate tool when the
   * caller already owns the delegation decision. The model supplies only that
   * tool's typed input; admission and dispatch remain host-owned.
   */
  readonly initialDelegateTool?: "delegate" | "delegate_file";
  /** Optional host-scoped writer. Supplying it enables an ordinary `write_file` preparation tool. */
  readonly delegateFileWriter?: DelegateFileWriter;
  readonly timeline: DelegateTimeline;
  readonly createDriver: () => CellDriver;
  readonly concurrency: number;
  readonly maxModelSteps: number;
  readonly maxDelegateBatches: number;
  readonly maxCallsPerStep: number;
  readonly maxOutputTokens?: number;
  /** Optional host-owned durable observation of one admitted execution. */
  readonly executionObserver?: DelegateExecutionObserver;
  readonly signal?: AbortSignal;
}

export interface DelegateExecutionObserver {
  prepare(checkpoint: DelegateBatchCheckpoint): Promise<void>;
  start(checkpoint: DelegateBatchCheckpoint): Promise<void>;
  rejectBeforeStart(checkpoint: DelegateBatchCheckpoint, error: unknown): Promise<void>;
  trace(checkpoint: DelegateBatchCheckpoint, event: TraceEvent): void;
  settle(checkpoint: DelegateBatchCheckpoint, run: DelegateBatchRun): Promise<void>;
  uncertain(checkpoint: DelegateBatchCheckpoint, error: unknown): Promise<void>;
}

export interface DelegateFileWriter {
  writeText(path: string, content: string): Promise<void>;
  describeArtifact(path: string): Promise<{ readonly path: string; readonly bytes: number; readonly sha256: string }>;
}

export interface CompactDelegateOutcome {
  readonly key: string;
  readonly cellId: string;
  readonly status: string;
  readonly runId?: string;
  readonly artifactRefs: readonly string[];
  readonly resultFile?: string;
}

export interface DelegateInvocation {
  readonly toolCallId: string;
  readonly toolName: "delegate" | "delegate_file";
  readonly call: DelegateCall;
  readonly input:
    | { readonly kind: "inline" }
    | {
      readonly kind: "file";
      readonly path: string;
      readonly sha256: string;
      readonly bytes: number;
    };
}

/** Recovery and audit boundary written after admission and before dispatch. */
export interface DelegateBatchCheckpoint {
  readonly id: string;
  readonly parentLoopId: string;
  readonly wholeRevision: string;
  /** Cumulative parent-model usage at the durable pre-dispatch safe point. */
  readonly parentUsage: CellUsage;
  readonly tasks: readonly Task[];
  readonly invocations: readonly DelegateInvocation[];
  readonly responseMessages: readonly ModelMessage[];
  readonly admission: AdmittedDelegateBatch;
}

/** Parent/child persistence boundary. Each child owns its execution timeline. */
export interface DelegateTimeline {
  prepareBatch(checkpoint: DelegateBatchCheckpoint): Promise<void>;
  markBatchDispatched(checkpoint: DelegateBatchCheckpoint): Promise<void>;
  recordBatchSettlements(input: {
    readonly checkpoint: DelegateBatchCheckpoint;
    readonly run: DelegateBatchRun;
    readonly outcomes: readonly CompactDelegateOutcome[];
  }): Promise<void>;
  resolveBatch(checkpoint: DelegateBatchCheckpoint): Promise<readonly CompactDelegateOutcome[] | undefined>;
  readResult(
    parentLoopId: string,
    batchId: string,
    key: string,
  ): Promise<DelegateResultProjection>;
}

export class DelegateBarrierPendingError extends Error {
  constructor(readonly batchId: string) {
    super(`delegate batch ${batchId} cannot resume before every child timeline settles`);
    this.name = "DelegateBarrierPendingError";
  }
}

export interface DelegateLoopBatch {
  readonly id: string;
  readonly invocations: readonly DelegateInvocation[];
  readonly outcomes: readonly CompactDelegateOutcome[];
  readonly run: DelegateBatchRun;
}

export interface DelegateBatchSettlement {
  readonly run: DelegateBatchRun;
  readonly outcomes: readonly CompactDelegateOutcome[];
}

/** Parent is parked after this handle is returned; settlement proceeds independently. */
export interface DelegateBatchHandle {
  readonly checkpoint: DelegateBatchCheckpoint;
  readonly settled: Promise<DelegateBatchSettlement>;
  cancel(reason?: unknown): void;
}

export interface DelegateLoopRun {
  /** A loop return is not Mission completion or semantic acceptance. */
  readonly status: "returned" | "step-limit" | "needs-attention";
  readonly text: string;
  readonly messages: readonly ModelMessage[];
  readonly batches: readonly DelegateLoopBatch[];
  readonly tasks: readonly Task[];
  /** Obligations not yet covered by a successfully settled contribution. */
  readonly uncoveredObligations: readonly string[];
  /** Host-verified semantic child-result reads performed during reconstruction. */
  readonly resultReads?: readonly DelegateResultReadReceipt[];
  readonly usage: CellUsage;
}

export type DelegateLoopTransition =
  | { readonly kind: "parked"; readonly checkpoint: DelegateBatchCheckpoint; readonly handle: DelegateBatchHandle }
  | { readonly kind: "ready" }
  | { readonly kind: "finished"; readonly run: DelegateLoopRun };

const delegateTool = tool({
  description:
    "Propose one already task-shaped, locally verifiable contribution. Several calls in one response form one atomic candidate batch and must be mutually independent.",
  inputSchema: DelegateCallSchema,
  outputSchema: DelegateToolResultSchema,
});

const delegateFileTool = tool({
  description:
    "Delegate one semantic contribution already written as a DelegateCall JSON file. The host reads, validates, and freezes it before admission; only the file reference enters the parent model context.",
  inputSchema: DelegateFileCallSchema,
  outputSchema: DelegateToolResultSchema,
});

function createWriteFileTool(writer: DelegateFileWriter) {
  return tool({
    description:
      "Write one complete UTF-8 file inside the host-declared delegate preparation scope. Use it for large DelegateCall JSON packets, then call delegate_file with the returned relative path and sha256 in a later step.",
    inputSchema: z.object({ path: z.string().min(1), content: z.string() }).strict(),
    execute: async ({ path, content }) => {
      await writer.writeText(path, content);
      return writer.describeArtifact(path);
    },
  });
}

export async function startDelegateBatch(
  checkpoint: DelegateBatchCheckpoint,
  options: Pick<
    DelegateLoopOptions,
    "timeline" | "createDriver" | "concurrency" | "executionObserver" | "signal"
  >,
): Promise<DelegateBatchHandle> {
  await options.timeline.prepareBatch(checkpoint);
  await options.executionObserver?.prepare(checkpoint);
  try {
    options.signal?.throwIfAborted();
    await options.timeline.markBatchDispatched(checkpoint);
    await options.executionObserver?.start(checkpoint);
  } catch (error) {
    await options.executionObserver?.rejectBeforeStart(checkpoint, error).catch(() => undefined);
    throw error;
  }
  const controller = new AbortController();
  const executionSignal = options.signal === undefined
    ? controller.signal
    : AbortSignal.any([options.signal, controller.signal]);
  const settled = runAdmittedDelegateBatch(checkpoint.admission, options.createDriver, {
    concurrency: options.concurrency,
    signal: executionSignal,
    ...(options.executionObserver === undefined
      ? {}
      : { onTrace: (event: TraceEvent) => options.executionObserver!.trace(checkpoint, event) }),
  }).then(async (run): Promise<DelegateBatchSettlement> => {
    try {
      await options.executionObserver?.settle(checkpoint, run);
      const outcomes = projectOutcomes(checkpoint.invocations.map((invocation) => invocation.call), run);
      await options.timeline.recordBatchSettlements({ checkpoint, run, outcomes });
      return { run, outcomes };
    } catch (error) {
      await retainUncertain(options.executionObserver, checkpoint, error);
      throw error;
    }
  }, async (error) => {
    await retainUncertain(options.executionObserver, checkpoint, error);
    throw error;
  });
  return {
    checkpoint,
    settled,
    cancel(reason?: unknown) {
      controller.abort(reason ?? new DOMException("Delegate batch cancelled", "AbortError"));
    },
  };
}

/** In-process parent loop whose model context exists only while advancing. */
export class DelegateLoopSession {
  private readonly messages: ModelMessage[];
  private readonly batches: DelegateLoopBatch[] = [];
  private readonly settledContributionKeys: Set<string>;
  private readonly seenContributionKeys: Set<string>;
  private readonly coveredObligations = new Set<string>();
  private readonly resultReads: DelegateResultReadReceipt[] = [];
  private readonly tasks: TaskStore;
  private usage = emptyUsage();
  private lastText = "";
  private modelSteps = 0;
  private finished?: DelegateLoopRun;
  private pending: {
    readonly checkpoint: DelegateBatchCheckpoint;
    readonly invocations: readonly DelegateInvocation[];
    readonly handle: DelegateBatchHandle;
  } | undefined;

  constructor(
    private readonly input: DelegateLoopInput,
    private readonly options: DelegateLoopOptions,
  ) {
    validateLoopOptions(options);
    this.messages = [...input.messages];
    this.tasks = TaskStore.fromSeeds(input.tasks);
    this.settledContributionKeys = new Set(input.whole.settledContributionKeys);
    this.seenContributionKeys = new Set(input.whole.settledContributionKeys);
  }

  async advance(): Promise<DelegateLoopTransition> {
    if (this.finished !== undefined) return { kind: "finished", run: this.finished };
    if (this.pending !== undefined) {
      throw new Error(`delegate batch ${this.pending.checkpoint.id} is parked and must resume before another model step`);
    }
    if (this.modelSteps >= this.options.maxModelSteps) {
      return this.finish("step-limit");
    }

    const delegationOpen = this.batches.length < this.options.maxDelegateBatches;
    const remainingModelSteps = this.options.maxModelSteps - this.modelSteps;
    const remainingDelegateBatches = this.options.maxDelegateBatches - this.batches.length;
    const readableResults = new Map<string, CompactDelegateOutcome>();
    for (const batch of this.batches) {
      for (const outcome of batch.outcomes) {
        readableResults.set(resultKey(batch.id, outcome.key), outcome);
      }
    }
    const tools = {
      ...(delegationOpen ? { delegate: delegateTool } : {}),
      ...(delegationOpen && this.options.delegateInputRoot !== undefined ? { delegate_file: delegateFileTool } : {}),
      ...(!delegationOpen || this.options.delegateFileWriter === undefined
        ? {}
        : { write_file: createWriteFileTool(this.options.delegateFileWriter) }),
      ...(readableResults.size === 0
        ? {}
        : {
          read_delegate_result: tool({
            description:
              "Read the bounded semantic projection of one settled child result from this parent loop. Name only a batchId and contribution key already returned by delegate; arbitrary file paths are not accepted.",
            inputSchema: ReadDelegateResultCallSchema,
            execute: async ({ batchId, key }) => {
              const expected = readableResults.get(resultKey(batchId, key));
              if (expected === undefined) {
                throw new Error(`delegate result ${batchId}/${key} is not settled in parent loop ${this.input.id}`);
              }
              const projection = await this.options.timeline.readResult(this.input.id, batchId, key);
              if (
                projection.receipt.batchId !== batchId ||
                projection.receipt.key !== key ||
                projection.receipt.cellId !== expected.cellId ||
                projection.receipt.status !== expected.status
              ) {
                throw new Error(`delegate result ${batchId}/${key} conflicts with its settled outcome`);
              }
              this.resultReads.push(DelegateResultReadReceiptSchema.parse(projection.receipt));
              return projection;
            },
          }),
        }),
      ...createTaskTools(this.tasks, {
        projection: { read: "all", create: true, update: "all", assignOwner: true },
      }),
    };
    const agent = new ToolLoopAgent({
      model: this.options.model,
      instructions: renderDelegateInstructions(this.input, {
        delegationOpen,
        remainingModelSteps,
        remainingDelegateBatches,
        settledContributionKeys: [...this.settledContributionKeys],
        uncoveredObligations: uncovered(this.input.whole.obligations, this.coveredObligations),
        tasks: this.tasks.snapshot(),
      }),
      tools,
      toolChoice: this.options.initialDelegateTool === undefined
        ? "auto"
        : { type: "tool", toolName: this.options.initialDelegateTool },
      stopWhen: isStepCount(remainingModelSteps),
      prepareStep: ({ messages, stepNumber }) => ({
        instructions: renderDelegateInstructions(this.input, {
          delegationOpen,
          remainingModelSteps: remainingModelSteps - stepNumber,
          remainingDelegateBatches,
          settledContributionKeys: [...this.settledContributionKeys],
          uncoveredObligations: uncovered(this.input.whole.obligations, this.coveredObligations),
          tasks: this.tasks.snapshot(),
        }),
        messages: compactWriteFileMessages(messages),
      }),
      maxRetries: 0,
      maxOutputTokens: this.options.maxOutputTokens ?? 4_000,
    });
    const result = await agent.generate({
      messages: this.messages,
      ...(this.options.signal === undefined ? {} : { abortSignal: this.options.signal }),
    });
    this.modelSteps += result.steps.length;
    this.usage = addUsage(this.usage, normalizeAiSdkUsage(result.usage, result.providerMetadata));
    this.lastText = result.text;
    const responseMessages = compactWriteFileMessages(result.responseMessages);
    this.messages.push(...responseMessages);

    const finalToolCalls = result.finalStep.toolCalls;
    const finalDelegateCalls = finalToolCalls.filter((toolCall) =>
      toolCall !== undefined && (toolCall.toolName === "delegate" || toolCall.toolName === "delegate_file")
    );
    if (finalDelegateCalls.length === 0) {
      return this.finish(this.modelSteps >= this.options.maxModelSteps ? "step-limit" : "returned");
    }
    if (finalDelegateCalls.length !== finalToolCalls.length) {
      throw new Error("a delegate submission step cannot mix preparation tools with delegate calls");
    }
    if (!delegationOpen) throw new Error("delegate calls were returned after the batch limit closed delegation");
    if (finalDelegateCalls.length > this.options.maxCallsPerStep) {
      throw new Error(`delegate step emitted ${finalDelegateCalls.length} calls; maximum is ${this.options.maxCallsPerStep}`);
    }

    const callIds = new Set<string>();
    const invocations = await Promise.all(finalDelegateCalls.map(async (toolCall, index): Promise<DelegateInvocation> => {
      if (toolCall === undefined) throw new Error(`delegate tool call ${index} is missing`);
      if ((toolCall.toolName !== "delegate" && toolCall.toolName !== "delegate_file") || toolCall.providerExecuted) {
        throw new Error(`tool call ${index} is not a host-executed delegate call`);
      }
      if (toolCall.toolName === "delegate_file" && this.options.delegateInputRoot === undefined) {
        throw new Error("delegate_file is unavailable without a host-owned delegateInputRoot");
      }
      if (callIds.has(toolCall.toolCallId)) throw new Error(`duplicate delegate tool call id ${toolCall.toolCallId}`);
      callIds.add(toolCall.toolCallId);
      const frozen = toolCall.toolName === "delegate_file"
        ? await readJsonFileInput(toolCall.input, this.options.delegateInputRoot!, DelegateCallSchema)
        : undefined;
      const call = frozen?.value ?? DelegateCallSchema.parse(toolCall.input);
      if (this.seenContributionKeys.has(call.key)) throw new Error(`duplicate delegate contribution key ${call.key}`);
      const task = this.tasks.get(call.taskId);
      if (this.tasks.isBlocked(task)) throw new Error(`delegate contribution ${call.key} names blocked task ${call.taskId}`);
      if (task.status === "completed") throw new Error(`delegate contribution ${call.key} names completed task ${call.taskId}`);
      if (task.owner !== undefined && task.owner !== `delegate:${call.key}`) {
        throw new Error(`delegate contribution ${call.key} names task ${call.taskId} owned by ${task.owner}`);
      }
      return {
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        call,
        input: frozen === undefined
          ? { kind: "inline" }
          : { kind: "file", path: frozen.path, sha256: frozen.sha256, bytes: frozen.bytes },
      };
    }));
    const calls = invocations.map((invocation) => invocation.call);

    // Preparation may inspect host evidence but cannot execute Cells. All
    // prepared contributions are admitted together before checkpoint or dispatch.
    const execution = await Promise.all(calls.map((call) => this.options.prepareContribution(call)));
    const currentUncovered = uncovered(this.input.whole.obligations, this.coveredObligations);
    const batchInput: PreparedDelegateBatch = {
      id: `${this.input.id}:batch:${this.batches.length + 1}`,
      whole: {
        ...this.input.whole,
        obligations: currentUncovered,
        settledContributionKeys: [...this.settledContributionKeys],
      },
      contributions: calls.map((call, index): PreparedDelegateContribution => ({
        ...call,
        ...execution[index]!,
      })),
    };
    const admission = admitPreparedDelegateBatch(batchInput);
    for (const call of calls) {
      this.tasks.update(call.taskId, { owner: `delegate:${call.key}`, status: "in_progress" });
    }
    const checkpoint: DelegateBatchCheckpoint = {
      id: batchInput.id,
      parentLoopId: this.input.id,
      wholeRevision: this.input.whole.revision,
      parentUsage: { ...this.usage },
      tasks: this.tasks.snapshot(),
      invocations,
      responseMessages,
      admission,
    };
    const handle = await startDelegateBatch(checkpoint, {
      timeline: this.options.timeline,
      createDriver: this.options.createDriver,
      concurrency: this.options.concurrency,
      ...(this.options.executionObserver === undefined
        ? {}
        : { executionObserver: this.options.executionObserver }),
      ...(this.options.signal === undefined ? {} : { signal: this.options.signal }),
    });
    this.pending = { checkpoint, invocations, handle };
    return { kind: "parked", checkpoint, handle };
  }

  async resume(): Promise<DelegateLoopTransition> {
    if (this.finished !== undefined) return { kind: "finished", run: this.finished };
    const pending = this.pending;
    if (pending === undefined) throw new Error("delegate loop has no parked batch to resume");
    const outcomes = await this.options.timeline.resolveBatch(pending.checkpoint);
    if (outcomes === undefined) {
      return { kind: "parked", checkpoint: pending.checkpoint, handle: pending.handle };
    }
    const { run } = await pending.handle.settled;
    const invocations = pending.invocations;
    const calls = invocations.map((invocation) => invocation.call);
    const batchInput = pending.checkpoint.admission;
    const batch: DelegateLoopBatch = { id: batchInput.id, invocations, outcomes, run };
    this.batches.push(batch);
    for (const call of calls) this.seenContributionKeys.add(call.key);
    for (const [index, outcome] of outcomes.entries()) {
      const call = calls[index]!;
      if (outcome.status === "completed") {
        this.tasks.update(call.taskId, { status: "completed" });
        this.settledContributionKeys.add(outcome.key);
        for (const obligation of call.obligationRefs) this.coveredObligations.add(obligation);
      } else {
        this.tasks.update(call.taskId, { status: "pending", owner: null });
      }
    }

    this.messages.push({
      role: "tool",
      content: invocations.map((invocation, index) => ({
        type: "tool-result" as const,
        toolCallId: invocation.toolCallId,
        toolName: invocation.toolName,
        output: {
          type: "json" as const,
          value: compactToolResult(
            batch,
            outcomes[index]!,
            uncovered(this.input.whole.obligations, this.coveredObligations),
          ),
        },
      })),
    });
    this.pending = undefined;

    if (outcomes.some((outcome) => outcome.status !== "completed")) {
      return this.finish("needs-attention");
    }
    return { kind: "ready" };
  }

  private finish(status: DelegateLoopRun["status"]): Extract<DelegateLoopTransition, { kind: "finished" }> {
    this.finished = finish(
      status,
      this.lastText,
      this.messages,
      this.batches,
      this.tasks.snapshot(),
      this.input.whole.obligations,
      this.coveredObligations,
      this.resultReads,
      this.usage,
    );
    return { kind: "finished", run: this.finished };
  }
}

async function retainUncertain(
  observer: DelegateExecutionObserver | undefined,
  checkpoint: DelegateBatchCheckpoint,
  error: unknown,
): Promise<void> {
  if (observer === undefined) return;
  try {
    await observer.uncertain(checkpoint, error);
  } catch {
    // Preserve the execution failure. The observer owns its own durable error
    // surface and must not replace the causal failure returned to the runner.
  }
}

/** Blocking convenience over the park/resume state machine. */
export async function runDelegateLoop(
  input: DelegateLoopInput,
  options: DelegateLoopOptions,
): Promise<DelegateLoopRun> {
  const session = new DelegateLoopSession(input, options);
  while (true) {
    const transition = await session.advance();
    if (transition.kind === "finished") return transition.run;
    if (transition.kind !== "parked") continue;
    await transition.handle.settled;
    const resumed = await session.resume();
    if (resumed.kind === "finished") return resumed.run;
    if (resumed.kind === "parked") throw new DelegateBarrierPendingError(resumed.checkpoint.id);
  }
}

function renderDelegateInstructions(
  input: DelegateLoopInput,
  state: {
    readonly delegationOpen: boolean;
    readonly remainingModelSteps: number;
    readonly remainingDelegateBatches: number;
    readonly settledContributionKeys: readonly string[];
    readonly uncoveredObligations: readonly string[];
    readonly tasks: readonly Task[];
  },
): string {
  return `${input.instructions}

## Delegate boundary

Use \`delegate\` only for a contribution that has already been shaped against the declared execution profile and can be accepted from bounded evidence. When \`delegate_file\` is available, use it for the same semantic call already present as a JSON file so a large task description does not enter later parent model steps. Do not copy the file content into the delegate_file call. When \`write_file\` is available, write a complete DelegateCall JSON packet first, retain its returned digest, and call delegate_file in a later step. Never mix write_file and delegate calls in one submission step. A role label, confident wording, schema validity, or protocol completion is not capability evidence. If the work is still \`transform\` or \`unsupported-escalate\`, do not delegate it as an ordinary Cell.

Use task_create/task_update/task_list/task_get as the shared coordination memory. Create a task before delegating it, then pass that task's host-assigned ID as taskId. The host binds an admitted delegate to that task, and child settlement advances its process status. Task completion is coordination evidence, never semantic correctness. Do not delegate a blocked or completed task.

After a child settles, use \`read_delegate_result\` with its returned batchId and key when the child's semantic result is needed for reconstruction. This tool can read only settled children from this parent loop; it does not accept filesystem paths. A metadata-only projection means the bounded semantic payload was unavailable and must not be guessed.

Each call carries only the semantic contribution: stable key, taskId, task, declared source and obligation references, local acceptance, and bounded capability need. Do not provide workspace paths, work-proof declarations, concurrency, provider choice, budgets, Task Shape internals, or nested delegation. The host supplies those after admission. The prepared Cell declares its mechanical completion needs directly through terminal tools, output schema, or artifacts. Do not add an opaque result-contract label.

Several calls in one response are one candidate batch. Emit several only when they are independent in this step; the host validates the complete batch before starting any Cell. A returned tool result is execution evidence, not semantic acceptance or Mission completion.

## Current iteration orientation

This read-only projection is rebuilt from host-owned state before each parent advance. Re-ground the next action in it rather than carrying a prior conclusion forward unexamined. It is coordination state, not proof of correctness or Mission acceptance.

Delegation open: ${state.delegationOpen ? "yes" : "no"}
Remaining parent model steps: ${state.remainingModelSteps}
Remaining delegate batches: ${state.remainingDelegateBatches}
Whole revision: ${input.whole.revision}
Declared sources: ${input.whole.sourceRefs.join(", ")}
Guard references: ${input.whole.guardRefs.join(", ") || "none"}
Reconstruction owner: ${input.whole.reconstructionOwner}
Uncovered contribution obligations: ${state.uncoveredObligations.join(", ") || "none"}
Settled contribution keys: ${state.settledContributionKeys.join(", ") || "none"}
Current tasks: ${JSON.stringify(state.tasks)}
Allowed capability needs: ${input.whole.capabilityNeeds.join(", ")}`;
}

function projectOutcomes(calls: readonly DelegateCall[], run: DelegateBatchRun): CompactDelegateOutcome[] {
  if (run.kind === "direct") return [projectCell(calls[0]!.key, run.record)];
  return run.record.outcomes.map((outcome, index) => projectSwarmCell(calls[index]!.key, outcome));
}

function projectSwarmCell(key: string, outcome: SwarmCellOutcome): CompactDelegateOutcome {
  if (outcome.kind === "runner_error") {
    return { key, cellId: outcome.cellId, status: "runner_error", artifactRefs: [] };
  }
  return projectCell(key, outcome.record);
}

function projectCell(
  key: string,
  record: CellRunRecord,
): CompactDelegateOutcome {
  const structuredStatus = asRecord(record.output).status;
  const status = record.status !== "passed"
    ? record.status
    : structuredStatus === "completed" || structuredStatus === "needs_repartition" || structuredStatus === "unverifiable"
      ? structuredStatus
      : "unverifiable";
  return {
    key,
    cellId: record.cellId,
    status,
    runId: record.runId,
    artifactRefs: record.artifacts.map((artifact) => artifact.path),
  };
}

function compactToolResult(
  batch: DelegateLoopBatch,
  outcome: CompactDelegateOutcome,
  uncoveredObligations: readonly string[],
): JSONValue {
  return {
    batchId: batch.id,
    key: outcome.key,
    cellId: outcome.cellId,
    status: outcome.status,
    ...(outcome.runId === undefined ? {} : { runId: outcome.runId }),
    artifactRefs: [...outcome.artifactRefs],
    ...(outcome.resultFile === undefined ? {} : { resultFile: outcome.resultFile }),
    uncoveredObligationRefs: [...uncoveredObligations],
  };
}

function validateLoopOptions(options: DelegateLoopOptions): void {
  if (options.delegateFileWriter !== undefined && options.delegateInputRoot === undefined) {
    throw new Error("delegateFileWriter requires delegateInputRoot so written packets can be resolved");
  }
  if (options.initialDelegateTool === "delegate_file" && options.delegateInputRoot === undefined) {
    throw new Error("initialDelegateTool delegate_file requires delegateInputRoot");
  }
  for (const [name, value] of [
    ["maxModelSteps", options.maxModelSteps],
    ["maxDelegateBatches", options.maxDelegateBatches],
    ["maxCallsPerStep", options.maxCallsPerStep],
  ] as const) {
    if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  }
}

function compactWriteFileMessages(messages: readonly ModelMessage[]): ModelMessage[] {
  return messages.map((message): ModelMessage => {
    if (message.role !== "assistant" || typeof message.content === "string") return message;
    return {
      ...message,
      content: message.content.map((part) => {
        if (part.type !== "tool-call" || part.toolName !== "write_file") return part;
        const input = asRecord(part.input);
        const content = typeof input.content === "string" ? input.content : "";
        return {
          ...part,
          input: {
            path: typeof input.path === "string" ? input.path : "unknown",
            content: `[persisted ${content.length} characters; use the matching tool result for path, bytes, and sha256]`,
          },
        };
      }),
    };
  });
}

function finish(
  status: DelegateLoopRun["status"],
  text: string,
  messages: readonly ModelMessage[],
  batches: readonly DelegateLoopBatch[],
  tasks: readonly Task[],
  obligations: readonly string[],
  covered: ReadonlySet<string>,
  resultReads: readonly DelegateResultReadReceipt[],
  usage: CellUsage,
): DelegateLoopRun {
  return {
    status,
    text,
    messages,
    batches,
    tasks,
    uncoveredObligations: uncovered(obligations, covered),
    resultReads: [...resultReads],
    usage,
  };
}

function resultKey(batchId: string, key: string): string {
  return `${batchId}\u0000${key}`;
}

function uncovered(obligations: readonly string[], covered: ReadonlySet<string>): string[] {
  return obligations.filter((obligation) => !covered.has(obligation));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
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
