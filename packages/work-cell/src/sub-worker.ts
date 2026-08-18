import { createHash } from "node:crypto";
import {
  CellInputSchema,
  type Budget,
  type CellInput,
  type CellRunRecord,
  type WorkspacePolicy,
} from "./contracts";
import type { CellHost } from "./host-port";
import { runOneShotChildCell, type OneShotChildRunResult, type WorkItem } from "./orchestration";
import type { CellTool, CellToolExecutionContext } from "./tool-port";
import { WorkerCatalog } from "./worker-catalog";

export const SUB_WORKER_TOOL_NAME = "sub_worker" as const;

/**
 * Caller-owned context that identifies the parent Run and the Task it serves.
 * The sub_worker closure is bound to one parent execution; it does not invent
 * or mutate Task identity.
 */
export interface SubWorkerParentContext {
  /** The parent Run identity that will be combined with the exact toolCallId. */
  readonly parentRunId: string;
  /** The current Task identity the child Run continues to attribute. */
  readonly taskId: string;
  /** The current Task revision the child Run inherits. */
  readonly taskRevision: string;
  /** The source revision the child Run inherits. */
  readonly sourceRevision: string;
  /** The exact Worktree attribution the child Run shares (made read-only). */
  readonly workspace: WorkspacePolicy;
  /** The budget ceiling inherited from the parent Run. */
  readonly budget: Budget;
}

export interface SubWorkerToolOptions {
  readonly parent: SubWorkerParentContext;
  /** Host port for the child Run; usually the same host that serves the parent. */
  readonly host: CellHost;
  /** Worker catalog from which the model selects an available child worker. */
  readonly catalog: WorkerCatalog;
}

export interface SubWorkerInput {
  /** An available worker id from the WorkerCatalog. */
  workerId: string;
  /** The complete receiver-facing child-task prompt. */
  prompt: string;
  /** sha256 digest of `prompt`; the tool fails closed when it does not match. */
  requestDigest: string;
}

export interface SubWorkerResult {
  readonly childRunId: string;
  readonly kind: "settled" | "runner_error";
  readonly status: CellRunRecord["status"] | "runner_error";
  /** Bounded, source-linked evidence references; never raw provider steps. */
  readonly evidence: {
    readonly parentRunId: string;
    readonly taskId: string;
    readonly taskRevision: string;
    readonly sourceRevision: string;
    readonly workerId: string;
    readonly workspaceRoot: string;
    readonly requestDigest: string;
  };
  /** Bounded result surface; full records are retrieved through the Run owner. */
  readonly result: {
    readonly usage: CellRunRecord["usage"];
    readonly finalText: string;
    readonly terminalToolsCalled: readonly string[];
  } | {
    readonly error: string;
  };
}

/**
 * Create the caller-injected `sub_worker` CellTool. The tool is a closure owned
 * by the parent Run: it creates exactly one read-only child Run per invocation,
 * bound to the parent Run and the exact provider toolCallId. The child Run
 * reuses the current Task attribution and exact Worktree root but has no write
 * paths and no allowed commands, so it does not claim O3 writer ownership.
 *
 * First-slice restriction: the child Run receives no injected CellTools, so
 * it cannot create a second-layer sub_worker. The tool fails closed when no
 * worker is supplied, the worker is unknown or unavailable, the request digest
 * does not match the prompt, or the child requests write/command capability.
 */
export function createSubWorkerTool(options: SubWorkerToolOptions): CellTool {
  const { parent, host, catalog } = options;
  const seenDigests = new Map<string, string>();

  return {
    description:
      "Delegate one bounded read-only sub-task to a single available Work Cell worker. "
      + "Provide the exact workerId, the complete receiver-facing prompt, and the sha256 "
      + "digest of the prompt. The child Run is read-only: it cannot write files or run commands.",
    inputSchema: {
      type: "object",
      properties: {
        workerId: { type: "string", minLength: 1, description: "An available worker id from the WorkerCatalog." },
        prompt: { type: "string", minLength: 1, description: "The complete receiver-facing child-task prompt." },
        requestDigest: {
          type: "string",
          pattern: "^[a-f0-9]{64}$",
          description: "Hex sha256 digest of the exact prompt string.",
        },
      },
      required: ["workerId", "prompt", "requestDigest"],
      additionalProperties: false,
    },
    execute: async (input: unknown, context: CellToolExecutionContext): Promise<SubWorkerResult> => {
      const parsed = parseSubWorkerInput(input);
      const childRunId = deriveChildRunId(parent.parentRunId, context.toolCallId);

      // Reconstructability: the same parentRunId + toolCallId + digest converges;
      // a different prompt under the same identity fails closed.
      const expectedDigest = digestText(parsed.prompt);
      if (parsed.requestDigest !== expectedDigest) {
        throw new Error(
          `sub_worker request digest mismatch for child Run ${childRunId}: expected ${expectedDigest}, received ${parsed.requestDigest}`,
        );
      }
      const previousDigest = seenDigests.get(childRunId);
      if (previousDigest !== undefined && previousDigest !== parsed.requestDigest) {
        throw new Error(
          `sub_worker child Run ${childRunId} already bound to a different request digest`,
        );
      }
      seenDigests.set(childRunId, parsed.requestDigest);

      const card = catalog.card(parsed.workerId);
      if (card.availability.status !== "available") {
        throw new Error(`sub_worker worker ${parsed.workerId} is unavailable: ${card.availability.reason}`);
      }

      const childInput = buildChildCellInput(parent, parsed, childRunId, card.executionProfile);
      const item: WorkItem = {
        itemId: childRunId,
        sequence: 0,
        input: childInput,
      };

      const child = await runOneShotChildCell(
        item,
        (inputForDriver) => catalog.createDriver(inputForDriver),
        { host, runId: childRunId, signal: context.signal },
      );

      return projectSubWorkerResult(parent, parsed, childRunId, child);
    },
  };
}

function parseSubWorkerInput(input: unknown): SubWorkerInput {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("sub_worker input must be an object");
  }
  const record = input as Record<string, unknown>;
  const workerId = record.workerId;
  const prompt = record.prompt;
  const requestDigest = record.requestDigest;
  if (typeof workerId !== "string" || workerId.length === 0) {
    throw new Error("sub_worker requires a nonempty workerId");
  }
  if (typeof prompt !== "string" || prompt.length === 0) {
    throw new Error("sub_worker requires a nonempty prompt");
  }
  if (typeof requestDigest !== "string" || !/^[a-f0-9]{64}$/.test(requestDigest)) {
    throw new Error("sub_worker requires a 64-character hex sha256 requestDigest");
  }
  return { workerId, prompt, requestDigest };
}

function digestText(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function deriveChildRunId(parentRunId: string, toolCallId: string): string {
  return createHash("sha256")
    .update(`rossovia:sub-worker:${parentRunId}:${toolCallId}`, "utf8")
    .digest("hex");
}

function buildChildCellInput(
  parent: SubWorkerParentContext,
  parsed: SubWorkerInput,
  childRunId: string,
  executionProfile: CellInput["executionProfile"],
): CellInput {
  const workspace: WorkspacePolicy = {
    root: parent.workspace.root,
    readPaths: parent.workspace.readPaths.length > 0 ? parent.workspace.readPaths : ["."],
    writePaths: [],
    excludePaths: parent.workspace.excludePaths,
    allowedCommands: [],
  };
  const input: CellInput = {
    id: childRunId,
    workerId: parsed.workerId,
    intent: "Read-only sub-task delegated from parent Run.",
    workspace,
    instructions: [parsed.prompt],
    capabilities: [],
    context: [
      {
        id: parent.taskId,
        title: "Parent task attribution",
        content: JSON.stringify({
          taskRevision: parent.taskRevision,
          sourceRevision: parent.sourceRevision,
          childRunId,
        }),
        sources: [parent.parentRunId],
      },
    ],
    capabilitiesRequired: [],
    acceptance: ["Return a bounded, source-linked result without claiming write or command authority."],
    budget: {
      maxDurationMs: parent.budget.maxDurationMs,
      maxCommandOutputBytes: parent.budget.maxCommandOutputBytes,
    },
    ...(executionProfile ? { executionProfile } : {}),
  };
  return CellInputSchema.parse(input);
}

function projectSubWorkerResult(
  parent: SubWorkerParentContext,
  parsed: SubWorkerInput,
  childRunId: string,
  child: OneShotChildRunResult,
): SubWorkerResult {
  const evidence = {
    parentRunId: parent.parentRunId,
    taskId: parent.taskId,
    taskRevision: parent.taskRevision,
    sourceRevision: parent.sourceRevision,
    workerId: parsed.workerId,
    workspaceRoot: parent.workspace.root,
    requestDigest: parsed.requestDigest,
  };
  if (child.settlement.kind === "runner_error") {
    return {
      childRunId,
      kind: "runner_error",
      status: "runner_error",
      evidence,
      result: { error: child.settlement.error },
    };
  }
  const record = child.settlement.record;
  return {
    childRunId,
    kind: "settled",
    status: record.status,
    evidence,
    result: {
      usage: record.usage,
      finalText: record.finalText,
      terminalToolsCalled: record.verification.terminal.called,
    },
  };
}
