import { randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";
import type { CellInput, CellRunRecord } from "../../../packages/work-cell/src/contracts";
import { resolveHome } from "./home";
import {
  readStrictTaskAttemptEvidence,
  type StrictTaskAttemptEvidence,
} from "./task-attempts";
import {
  executeTaskCellRun,
  ordinaryOpenCodeExcludes,
} from "./task-run";

export const DOGFOOD_REVIEW_LOG_VERSION = "rosso.dogfood-review.v1" as const;

export interface DogfoodObserverArguments {
  readonly home?: string;
  readonly attemptId: string;
  readonly workerId: string;
}

export interface DogfoodObserverLaunchResult {
  readonly version: "rosso.dogfood-observer-launch.v1";
  readonly status: "started";
  readonly attemptId: string;
  readonly workerId: string;
}

export interface DogfoodObserverResult {
  readonly version: "rosso.dogfood-observer-result.v1";
  readonly reviewId: string;
  readonly attemptId: string;
  readonly taskId?: string;
  readonly workerId: string;
  readonly standing: "recorded" | "query-gap" | "runner-failed";
  readonly logRef: string;
  readonly finding: string;
}

interface DogfoodReviewLogRecord {
  readonly version: typeof DOGFOOD_REVIEW_LOG_VERSION;
  readonly reviewId: string;
  readonly recordedAt: string;
  readonly subject: {
    readonly type: "dogfood-task-attempt";
    readonly taskId?: string;
    readonly attemptId: string;
  };
  readonly observer: {
    readonly kind: "agent";
    readonly workerId: string;
  };
  readonly standing: "recorded" | "query-gap" | "runner-failed";
  readonly evidenceRefs: readonly string[];
  readonly finding: string;
  readonly reviewText?: string;
  readonly observerRun?: {
    readonly runId: string;
    readonly status: CellRunRecord["status"];
    readonly usage: CellRunRecord["usage"];
  };
}

export function dogfoodReviewLogPath(homeArgument?: string): string {
  return join(resolveHome(homeArgument), "state", "dogfood-reviews.jsonl");
}

/**
 * Append one review opinion without creating an inbox, queue, or mutable
 * review state. The source task and attempt remain authoritative; this file is
 * only a local, append-only observation projection.
 */
export function appendDogfoodReview(
  homeArgument: string | undefined,
  record: DogfoodReviewLogRecord,
): string {
  const path = dogfoodReviewLogPath(homeArgument);
  mkdirSync(join(resolveHome(homeArgument), "state"), { recursive: true });
  appendFileSync(path, `${JSON.stringify(record)}\n`, "utf8");
  return path;
}

/**
 * Run one optional read-only review against the strict attempt evidence. No
 * Task lifecycle or writer lease is created for the observer itself.
 */
export async function runDogfoodObserver(
  arguments_: DogfoodObserverArguments,
): Promise<DogfoodObserverResult> {
  const home = resolveHome(arguments_.home);
  const reviewId = `review-${arguments_.attemptId}-${randomUUID()}`;
  const evidence = readStrictTaskAttemptEvidence(home, arguments_.attemptId);
  const taskId = evidence.attempt?.taskId;
  const base = {
    version: DOGFOOD_REVIEW_LOG_VERSION,
    reviewId,
    recordedAt: new Date().toISOString(),
    subject: {
      type: "dogfood-task-attempt" as const,
      ...(taskId === undefined ? {} : { taskId }),
      attemptId: arguments_.attemptId,
    },
    observer: { kind: "agent" as const, workerId: arguments_.workerId },
    evidenceRefs: [
      evidence.refs.attemptRef,
      evidence.refs.inputRef,
      evidence.refs.finalRecordRef,
      evidence.refs.settlementRef,
    ],
  };

  if (
    evidence.standing !== "available"
    || evidence.input === undefined
    || evidence.finalRecord === undefined
    || evidence.settlement === undefined
  ) {
    const finding = evidence.error
      ?? "standard attempt API did not expose a complete terminal evidence family";
    const path = appendDogfoodReview(home, {
      ...base,
      standing: "query-gap",
      finding,
    });
    return {
      version: "rosso.dogfood-observer-result.v1",
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
    const policy = require("../../autonomy/src/worker-policy") as typeof import("../../autonomy/src/worker-policy");
    const catalog = policy.createCurrentWorkerCatalog();
    const worker = catalog.card(arguments_.workerId);
    const worktree = evidence.input.workspace.root;
    const context = observerContext(evidence);
    const input: CellInput = {
      id: `dogfood-observer-${reviewId}`,
      workerId: worker.id,
      executionProfile: worker.executionProfile,
      intent:
        "Review one settled Rossovia dogfood task. Return only evidence-backed findings and visibility gaps; do not edit or accept work.",
      workspace: {
        root: worktree,
        readPaths: ["."],
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
        id: "dogfood-attempt-evidence",
        title: "Settled dogfood task evidence",
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
      const path = appendDogfoodReview(home, {
        ...base,
        standing: "runner-failed",
        finding: execution.error,
      });
      return {
        version: "rosso.dogfood-observer-result.v1",
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
    const path = appendDogfoodReview(home, {
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
      version: "rosso.dogfood-observer-result.v1",
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
    const path = appendDogfoodReview(home, {
      ...base,
      standing: "runner-failed",
      finding,
    });
    return {
      version: "rosso.dogfood-observer-result.v1",
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

function observerContext(evidence: StrictTaskAttemptEvidence): string {
  const finalRecord = evidence.finalRecord!;
  return JSON.stringify({
    taskId: evidence.attempt?.taskId,
    taskRevision: evidence.attempt?.taskRevision,
    sourceRevision: evidence.attempt?.sourceRevision,
    attempt: {
      workerId: evidence.attempt?.workerId,
      driver: evidence.attempt?.driver,
      model: evidence.attempt?.model,
      startedAt: evidence.attempt?.startedAt,
      settlement: evidence.settlement,
    },
    input: {
      intent: evidence.input?.intent,
      instructions: evidence.input?.instructions,
      acceptance: evidence.input?.acceptance,
      workspaceRoot: evidence.input?.workspace.root,
    },
    final: {
      runId: finalRecord.runId,
      status: finalRecord.status,
      finalText: finalRecord.finalText,
      workspaceDiff: finalRecord.workspaceDiff,
      usage: finalRecord.usage,
      traceTypes: finalRecord.trace.map((event) => event.type),
      rawStepCount: finalRecord.rawSteps.length,
      error: finalRecord.error,
    },
    refs: evidence.refs,
    limitation: "Raw provider steps and full trace payload are not copied into the observer context; report this as a visibility gap when review needs them.",
  }, null, 2).slice(0, 30_000);
}

function safeExcludes(worktree: string): string[] {
  try {
    return ordinaryOpenCodeExcludes(worktree);
  } catch {
    return [];
  }
}
