import { createHash } from "node:crypto";
import type { CellInput, CellRunRecord } from "../../../../packages/work-cell/src/contracts";
import type { CellHost } from "../../../../packages/work-cell/src/host-port";
import type { CellTool, CellToolExecutionContext } from "../../../../packages/work-cell/src/tool-port";
import type { WorkerCatalog } from "../../../../packages/work-cell/src/worker-catalog";
import {
  deriveChildRunId,
  runReadOnlyChildRun,
  stopRun,
  type ReadOnlyChildRunDependencies,
  type RunTerminalOutcome,
  RunControlRegistry,
} from "../orchestration/run";
import type { TaskRunExecution } from "../task-run";

export const ROSSOVIA_SUB_WORKER_TOOL_NAME = "sub_worker" as const;

/**
 * Caller-owned context that binds the sub_worker closure to one parent Run.
 * The tool does not invent or mutate Task identity; it reuses the current
 * Task attribution and exact Worktree root for the read-only child Run.
 */
export interface RossoviaSubWorkerContext {
  /** Rossovia home directory for durable Run evidence. */
  readonly home: string;
  /** The parent Run identity; combined with the exact toolCallId for the child Run. */
  readonly parentRunId: string;
  /** The current Task revision the child Run inherits. */
  readonly taskRevision: number;
  /** The source revision the child Run inherits. */
  readonly sourceRevision: number;
  /** The current Task identity the child Run continues to attribute. */
  readonly taskId: string;
  /** The exact resolved Worktree root the child Run reads. */
  readonly worktree: string;
  /** The requested execution identity inherited from the parent Run. */
  readonly execution: TaskRunExecution;
  /** Optional explicit per-child step cap. */
  readonly maxSteps?: number;
  /** Worker catalog from which the model selects an available child worker. */
  readonly catalog: WorkerCatalog;
  /** Host port for the child Run; usually the same host that serves the parent. */
  readonly host: CellHost;
  /**
   * The existing in-process Run control registry shared with the parent Run.
   * The child Run is registered here so parent cancellation reaches it through
   * the exact stop/control relationship.
   */
  readonly registry: RunControlRegistry;
  /**
   * Build the immutable CellInput for the read-only child Run. The returned
   * input must already have `workspace.writePaths = []` and
   * `workspace.allowedCommands = []`; the adapter does not mutate it further.
   */
  readonly buildChildCellInput: (childRunId: string, workerId: string, prompt: string) => CellInput;
}

/** Model-visible input for the sub_worker tool. */
export interface SubWorkerToolInput {
  /** An available worker id from the WorkerCatalog. */
  workerId: string;
  /** The complete receiver-facing child-task prompt. */
  prompt: string;
}

/**
 * Bounded, source-linked child Run result returned to the parent model. Full
 * records are retrievable through the Run owner; the tool produces no
 * semantic acceptance.
 */
export interface SubWorkerToolResult {
  readonly childRunId: string;
  readonly kind: "settled" | "runner_error";
  readonly status: CellRunRecord["status"] | "runner_error";
  readonly evidence: {
    readonly parentRunId: string;
    readonly taskId: string;
    readonly taskRevision: number;
    readonly sourceRevision: number;
    readonly workerId: string;
    readonly workspaceRoot: string;
    readonly requestDigest: string;
  };
  readonly result:
    | {
      readonly usage: CellRunRecord["usage"];
      readonly finalText: string;
      readonly terminalToolsCalled: readonly string[];
    }
    | { readonly error: string };
}

/**
 * Create the caller-injected `sub_worker` CellTool. The tool is a closure owned
 * by the parent Run: it creates exactly one read-only child Run per invocation,
 * bound to the parent Run and the exact provider toolCallId. The child Run
 * reuses the current Task attribution and exact Worktree root but has no write
 * paths and no allowed commands, so it does not claim O3 writer ownership.
 *
 * First-slice restriction: the child Run receives no injected CellTools, so it
 * cannot create a second-layer sub_worker. The tool fails closed when no
 * worker is supplied, the worker is unknown or unavailable, or the child
 * lowering produces write/command capability.
 */
export function createRossoviaSubWorkerTool(context: RossoviaSubWorkerContext): CellTool {
  return {
    description:
      "Delegate one bounded read-only sub-task to a single available Work Cell worker. "
      + "Provide the exact workerId and the complete receiver-facing prompt. "
      + "The child Run is read-only: it cannot write files or run commands.",
    inputSchema: {
      type: "object",
      properties: {
        workerId: { type: "string", minLength: 1, description: "An available worker id from the WorkerCatalog." },
        prompt: { type: "string", minLength: 1, description: "The complete receiver-facing child-task prompt." },
      },
      required: ["workerId", "prompt"],
      additionalProperties: false,
    },
    execute: async (input: unknown, toolContext: CellToolExecutionContext): Promise<SubWorkerToolResult> => {
      const parsed = parseSubWorkerInput(input);
      const requestDigest = digestText(parsed.prompt);
      const childRunId = deriveChildRunId(context.parentRunId, toolContext.toolCallId);

      const card = context.catalog.card(parsed.workerId);
      if (card.availability.status !== "available") {
        throw new Error(`sub_worker worker ${parsed.workerId} is unavailable: ${card.availability.reason}`);
      }

      const childCellInput = context.buildChildCellInput(childRunId, parsed.workerId, parsed.prompt);
      enforceReadOnlyWorkspace(childCellInput);

      const childDependencies: ReadOnlyChildRunDependencies = {
        lowerCellInput: () => childCellInput,
        execute: async (cellInput, options) => {
          const { executeTaskCellRun } = await import("../task-run");
          const outcome = await executeTaskCellRun(context.catalog, cellInput, {
            host: context.host,
            signal: options.signal,
          });
          if (outcome.status === "failed") throw new Error(outcome.error);
          return outcome.record;
        },
        card,
        registry: context.registry,
        onControlAvailable: () => {
          // No extra action needed: registration itself makes stopRun reachable.
        },
      };

      const parentSignal = toolContext.signal;
      let childTerminal: RunTerminalOutcome | undefined;
      let childError: string | undefined;
      const childRunPromise = runReadOnlyChildRun(context.home, {
        parentRunId: context.parentRunId,
        toolCallId: toolContext.toolCallId,
        taskId: context.taskId,
        taskRevision: context.taskRevision,
        sourceRevision: context.sourceRevision,
        worktree: context.worktree,
        workerId: parsed.workerId,
        prompt: parsed.prompt,
        promptDigest: requestDigest,
        execution: context.execution,
        ...(context.maxSteps === undefined ? {} : { maxSteps: context.maxSteps }),
      }, childDependencies).then(
        (result) => { childTerminal = result.outcome; },
        (error) => { childError = error instanceof Error ? error.message : String(error); },
      );

      if (parentSignal.aborted) {
        requestChildStop(childRunId);
      } else {
        parentSignal.addEventListener("abort", () => requestChildStop(childRunId), { once: true });
      }

      await childRunPromise;

      const evidence = {
        parentRunId: context.parentRunId,
        taskId: context.taskId,
        taskRevision: context.taskRevision,
        sourceRevision: context.sourceRevision,
        workerId: parsed.workerId,
        workspaceRoot: context.worktree,
        requestDigest,
      };

      if (childTerminal === undefined) {
        return {
          childRunId,
          kind: "runner_error",
          status: "runner_error",
          evidence,
          result: { error: childError ?? "child Run terminated without a terminal outcome" },
        };
      }

      return {
        childRunId,
        kind: "settled",
        status: childTerminal.cellStatus ?? childTerminal.status,
        evidence,
        result: childTerminal.finalRecord === undefined
          ? { error: childTerminal.error ?? "child Run produced no final record" }
          : {
              usage: childTerminal.finalRecord.usage,
              finalText: childTerminal.finalRecord.finalText,
              terminalToolsCalled: childTerminal.finalRecord.verification.terminal.called,
            },
      };
    },
  };

  function requestChildStop(childRunId: string): void {
    try {
      stopRun(context.home, childRunId, {
        control: "stop",
        requestedBy: context.parentRunId,
        sourceRef: `sub_worker:${context.parentRunId}:${childRunId}`,
      }, context.registry);
    } catch {
      // A failed stop request is already truthful: the child may already be
      // settled, or the stop will race with normal terminal. The execute
      // promise continues to await the canonical child terminal.
    }
  }
}

function parseSubWorkerInput(input: unknown): SubWorkerToolInput {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("sub_worker input must be an object");
  }
  const record = input as Record<string, unknown>;
  const workerId = record.workerId;
  const prompt = record.prompt;
  if (typeof workerId !== "string" || workerId.length === 0) {
    throw new Error("sub_worker requires a nonempty workerId");
  }
  if (typeof prompt !== "string" || prompt.length === 0) {
    throw new Error("sub_worker requires a nonempty prompt");
  }
  return { workerId, prompt };
}

function digestText(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function enforceReadOnlyWorkspace(input: CellInput): void {
  if (input.workspace.writePaths.length > 0) {
    throw new Error("sub_worker child Run must have no write paths");
  }
  if (input.workspace.allowedCommands.length > 0) {
    throw new Error("sub_worker child Run must have no allowed commands");
  }
}
