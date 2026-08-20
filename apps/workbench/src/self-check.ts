import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadHome, resolveHome } from "./home";
import { setupStatus as readSetupStatus } from "./setup";
import { runCommand, type CommandResult } from "./process";
import {
  defaultSelfCheckTaskReadPort,
  sameSelfCheckTaskRevision,
  type SelfCheckTaskReadPort,
  type SelfCheckTaskSnapshot,
} from "./self-check-task";
export type { SelfCheckTaskReadPort, SelfCheckTaskSnapshot } from "./self-check-task";

export const SELF_CHECK_VERSION = "rossovia.self-check.v1" as const;

export type SelfCheckStatus = "healthy" | "attention" | "degraded";
export type MechanicalCheckStatus = "ok" | "attention" | "degraded";
export type SelfCheckItemState = "checking" | "healthy" | "attention" | "degraded";

export interface SelfCheckWorker {
  readonly id: string;
  readonly provider: string;
  readonly model: string;
  readonly availability:
    | { readonly status: "available" }
    | { readonly status: "unavailable"; readonly reason: string };
}

export interface SelfCheckCheck {
  readonly id: "home" | "source" | "worker-policy" | "setup" | "observer" | "task";
  readonly status: MechanicalCheckStatus;
  readonly detail: string;
  readonly evidenceRefs: readonly string[];
}

export interface SelfCheckMechanical {
  readonly status: SelfCheckStatus;
  readonly checks: readonly SelfCheckCheck[];
  readonly task?: {
    readonly snapshot: SelfCheckTaskSnapshot;
    readonly subscription: "unavailable";
    readonly standing: "available" | "stale" | "unavailable";
  };
  readonly source?: {
    readonly cwd: string;
    readonly root: string;
    readonly head: string;
    readonly dirty: boolean;
    readonly changedAfterStart: boolean;
    readonly baselineHead?: string;
    readonly freshness: "current" | "changed-after-start" | "stale" | "not-provided";
    readonly statusLines: readonly string[];
  };
}

export interface SelfCheckOpinionItem {
  readonly id: string;
  readonly state: Exclude<SelfCheckItemState, "checking">;
  readonly detail: string;
  readonly evidenceRefs: readonly string[];
}

export interface SelfCheckProgress {
  readonly version: typeof SELF_CHECK_VERSION;
  readonly phase: "checking" | "complete";
  readonly itemId: string;
  readonly state: SelfCheckItemState;
  readonly standing: "mechanical" | "opinion";
  readonly detail: string;
  readonly evidenceRefs: readonly string[];
}

export type SelfCheckOpinion =
  | {
      readonly requested: false;
      readonly standing: "not-requested";
      readonly items: readonly [];
      readonly evidenceRefs: readonly string[];
    }
  | {
      readonly requested: true;
      readonly workerId: string;
      readonly standing: "opinion" | "attention";
      readonly status: "recorded" | "unavailable" | "timeout" | "failed" | "stale" | "not-started" | "query-gap";
      readonly items: readonly SelfCheckOpinionItem[];
      readonly evidenceRefs: readonly string[];
      readonly verdict: "yes" | "no" | "uncertain";
      readonly summary: string;
    };

export interface SelfCheckResult {
  readonly version: typeof SELF_CHECK_VERSION;
  readonly trigger: "manual" | "startup" | "changed";
  readonly status: SelfCheckStatus;
  readonly mechanical: SelfCheckMechanical;
  readonly opinion: SelfCheckOpinion;
  readonly checkedAt: string;
}

export interface SelfCheckOptions {
  readonly home?: string;
  readonly cwd?: string;
  readonly taskId?: string;
  readonly baselineHead?: string;
  readonly trigger?: "manual" | "startup" | "changed";
  readonly opinion?: boolean;
  readonly workerId?: string;
  readonly opinionTimeoutMs?: number;
  readonly environment?: NodeJS.ProcessEnv;
  readonly dependencies?: SelfCheckDependencies;
  readonly onProgress?: (progress: SelfCheckProgress) => void;
}

export interface SelfCheckOpinionInput {
  readonly worker: SelfCheckWorker;
  readonly mechanical: SelfCheckMechanical;
  readonly evidenceRefs: readonly string[];
  readonly task?: SelfCheckTaskSnapshot;
  readonly signal: AbortSignal;
}

export interface SelfCheckDependencies {
  readonly git?: (arguments_: readonly string[], cwd: string) => CommandResult;
  readonly workerCards?: (environment: NodeJS.ProcessEnv) => readonly SelfCheckWorker[];
  readonly setup?: (home: string) => ReturnType<typeof readSetupStatus>;
  readonly opinionRunner?: (input: SelfCheckOpinionInput) => Promise<SelfCheckOpinion>;
  readonly taskRead?: SelfCheckTaskReadPort;
}

export type SelfCheckStartupMode = "normal" | "safe-diagnostic";

export interface SelfCheckStartupGate {
  readonly version: typeof SELF_CHECK_VERSION;
  readonly mode: SelfCheckStartupMode;
  readonly startupStatus: SelfCheckStatus;
  readonly mechanical: SelfCheckMechanical;
  readonly checkedAt: string;
}

const DEFAULT_OPINION_TIMEOUT_MS = 1_500;

/**
 * Run the startup mechanical gate once. A healthy projection opens the
 * normal UI/write surface; every other standing keeps the server in a
 * read-only diagnostic mode. This never invokes the optional worker opinion.
 */
export function runSelfCheckStartupGate(options: SelfCheckOptions = {}): SelfCheckStartupGate {
  const mechanical = runMechanicalSelfCheck(options);
  const startupStatus = aggregateStatus(
    mechanical.checks.filter((check) => check.id !== "worker-policy"),
  );
  return {
    version: SELF_CHECK_VERSION,
    mode: startupStatus === "healthy" ? "normal" : "safe-diagnostic",
    startupStatus,
    mechanical,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Run the fast, read-only health projection. Mechanical checks remain the
 * source of health facts; an optional Worker Cell can only add an opinion.
 * Nothing is persisted and no startup path calls this function implicitly.
 * The checklist is a read-only projection of an explicitly selected existing
 * Task/Todo snapshot when `taskId` is supplied. Principal Tasks/Todos are
 * durable lifecycle state, so self-check does not create a synthetic Task or
 * subscribe to a second task stream merely to display transient progress.
 */
export async function runSelfCheck(options: SelfCheckOptions = {}): Promise<SelfCheckResult> {
  const checkedAt = new Date().toISOString();
  emitProgress(options, {
    phase: "checking",
    itemId: "mechanical-preflight",
    state: "checking",
    standing: "mechanical",
    detail: "mechanical preflight is running",
    evidenceRefs: [],
  });
  const mechanicalPreflight = runMechanicalSelfCheck(options);
  const baseEvidence = mechanicalPreflight.checks.flatMap((check) => check.evidenceRefs);
  for (const check of mechanicalPreflight.checks) {
    emitProgress(options, {
      phase: "checking",
      itemId: check.id,
      state: check.status === "ok" ? "healthy" : check.status,
      standing: "mechanical",
      detail: check.detail,
      evidenceRefs: [...check.evidenceRefs],
    });
  }
  const opinion = options.opinion === true
    ? await runOpinion(options, mechanicalPreflight, baseEvidence, () => {
        emitProgress(options, {
          phase: "checking",
          itemId: "worker-opinion",
          state: "checking",
          standing: "opinion",
          detail: "optional worker opinion is running after mechanical preflight",
          evidenceRefs: baseEvidence,
        });
      })
    : {
        requested: false as const,
        standing: "not-requested" as const,
        items: [] as const,
        evidenceRefs: baseEvidence,
      };
  if (opinion.requested) {
    for (const item of opinion.items) {
      emitProgress(options, {
        phase: "checking",
        itemId: `opinion.${item.id}`,
        state: item.state,
        standing: "opinion",
        detail: item.detail,
        evidenceRefs: [...item.evidenceRefs],
      });
    }
  }
  const taskRevalidation = revalidateTask(options, mechanicalPreflight);
  const mechanical = taskRevalidation.mechanical;
  const finalOpinion = taskRevalidation.stale
    ? staleOpinion(opinion, mechanical.task?.snapshot, baseEvidence)
    : opinion;
  if (taskRevalidation.stale && finalOpinion.requested) {
    for (const item of finalOpinion.items.slice(-1)) {
      emitProgress(options, {
        phase: "checking",
        itemId: `opinion.${item.id}`,
        state: item.state,
        standing: "opinion",
        detail: item.detail,
        evidenceRefs: [...item.evidenceRefs],
      });
    }
  }
  const status = finalOpinion.requested && finalOpinion.standing === "attention"
    ? promoteAttention(mechanical.status)
    : mechanical.status;
  emitProgress(options, {
    phase: "complete",
    itemId: "self-check",
    state: status,
    standing: "mechanical",
    detail: `self-check completed with ${status} standing`,
    evidenceRefs: baseEvidence,
  });
  return {
    version: SELF_CHECK_VERSION,
    trigger: options.trigger ?? "manual",
    status,
    mechanical,
    opinion: finalOpinion,
    checkedAt,
  };
}

export function runMechanicalSelfCheck(options: SelfCheckOptions = {}): SelfCheckMechanical {
  const home = resolveHome(options.home);
  const cwd = resolve(options.cwd ?? process.cwd());
  const dependencies = options.dependencies ?? {};
  const checks: SelfCheckCheck[] = [];

  try {
    loadHome(home);
    checks.push({
      id: "home",
      status: "ok",
      detail: "Workbench home sources are readable and schema-valid.",
      evidenceRefs: [
        `${home}/manifest.json`,
        `${home}/config/projects.json`,
        `${home}/state/roots.json`,
        `${home}/state/workspaces.json`,
      ],
    });
  } catch (error: unknown) {
    checks.push({
      id: "home",
      status: "degraded",
      detail: message(error),
      evidenceRefs: [`home:${home}`],
    });
  }

  let source: SelfCheckMechanical["source"];
  try {
    const git = dependencies.git ?? ((arguments_: readonly string[], directory: string) =>
      runCommand("git", ["-C", directory, ...arguments_]));
    const rootResult = git(["rev-parse", "--show-toplevel"], cwd);
    if (rootResult.exitCode !== 0 || !rootResult.stdout.trim()) {
      throw new Error(rootResult.stderr.trim() || `git root is unavailable for ${cwd}`);
    }
    const root = resolve(rootResult.stdout.trim());
    const headResult = git(["rev-parse", "HEAD"], root);
    if (headResult.exitCode !== 0 || !headResult.stdout.trim()) {
      throw new Error(headResult.stderr.trim() || `git HEAD is unavailable for ${root}`);
    }
    const statusResult = git(["status", "--short", "--branch"], root);
    if (statusResult.exitCode !== 0) {
      throw new Error(statusResult.stderr.trim() || `git status is unavailable for ${root}`);
    }
    const statusLines = statusResult.stdout.split(/\r?\n/).filter((line) => line.length > 0);
    const changed = statusLines.some((line) => !line.startsWith("##"));
    const currentHead = headResult.stdout.trim();
    const baseline = options.baselineHead?.trim();
    const stale = baseline !== undefined && baseline !== currentHead;
    const freshness = stale
      ? "stale"
      : changed
        ? "changed-after-start"
        : baseline === undefined
          ? "not-provided"
          : "current";
    source = {
      cwd,
      root,
      head: currentHead,
      dirty: changed,
      changedAfterStart: changed || stale,
      ...(baseline === undefined ? {} : { baselineHead: baseline }),
      freshness,
      statusLines,
    };
    checks.push({
      id: "source",
      status: changed || stale ? "attention" : "ok",
      detail: stale
        ? `Git HEAD changed from baseline ${baseline} to ${currentHead}.`
        : changed
          ? "Git worktree has changes since the caller's start snapshot."
          : "Git repository is readable and clean at this observation.",
      evidenceRefs: [`git:${root}@${currentHead}`, `git:${root}:status`],
    });
  } catch (error: unknown) {
    checks.push({
      id: "source",
      status: "degraded",
      detail: message(error),
      evidenceRefs: [`git:${cwd}`],
    });
  }

  let taskSnapshot: SelfCheckTaskSnapshot | undefined;
  if (options.taskId !== undefined) {
    try {
      const reader = dependencies.taskRead ?? defaultSelfCheckTaskReadPort;
      taskSnapshot = reader.read(home, options.taskId);
      const settled = taskSnapshot.lifecycle === "settled";
      checks.push({
        id: "task",
        status: settled ? "attention" : "ok",
        detail: settled
          ? "The selected Principal Task is settled; its Todo snapshot is stale for a new opinion."
          : "The selected Principal Task and its Todo snapshot are readable.",
        evidenceRefs: [...taskSnapshot.evidenceRefs],
      });
    } catch (error: unknown) {
      checks.push({
        id: "task",
        status: "degraded",
        detail: message(error),
        evidenceRefs: ["workbench:state/tasks.json"],
      });
    }
  }

  let workers: readonly SelfCheckWorker[] = [];
  try {
    workers = dependencies.workerCards
      ? dependencies.workerCards(options.environment ?? process.env)
      : defaultWorkerCards(options.environment ?? process.env);
    const available = workers.filter((worker) => worker.availability.status === "available");
    checks.push({
      id: "worker-policy",
      status: available.length === 0 ? "attention" : available.length < workers.length ? "attention" : "ok",
      detail: available.length === 0
        ? "Host worker policy is present but no provider is currently available; optional worker opinion is unavailable."
        : `${available.length} of ${workers.length} configured workers are available.`,
      evidenceRefs: ["worker-policy:apps/autonomy/src/worker-policy.ts"],
    });
  } catch (error: unknown) {
    checks.push({
      id: "worker-policy",
      status: "attention",
      detail: message(error),
      evidenceRefs: ["worker-policy:apps/autonomy/src/worker-policy.ts"],
    });
  }

  try {
    const setup = (dependencies.setup ?? ((homePath: string) => readSetupStatus(homePath)))(home);
    const statuses = setup.modules.map((module) => module.status);
    const bad = statuses.filter((status) => status !== "current");
    checks.push({
      id: "setup",
      status: bad.some((status) => status === "conflict" || status === "baseline-unavailable")
        ? "degraded"
        : bad.length > 0 ? "attention" : "ok",
      detail: bad.length === 0
        ? "Selected setup projections are current."
        : `Setup projection standing: ${bad.join(", ")}.`,
      evidenceRefs: setup.modules.length === 0
        ? [`${home}/config/setup.json`]
        : setup.modules.map((module) => module.projectionPath),
    });
  } catch (error: unknown) {
    checks.push({
      id: "setup",
      status: "attention",
      detail: message(error),
      evidenceRefs: [`${home}/config/setup.json`],
    });
  }

  const observerPaths = [
    `${home}/state/workflow-reviews.jsonl`,
    `${home}/state/dogfood-reviews.jsonl`,
  ].filter((path) => existsSync(path));
  checks.push({
    id: "observer",
    status: "ok",
    detail: observerPaths.length === 0
      ? "No observer review log is present; observer remains optional and independent."
      : `Observer review log paths are present (${observerPaths.length}); full observer remains independent.`,
    evidenceRefs: observerPaths.length === 0 ? [`${home}/state`] : observerPaths,
  });

  return {
    status: aggregateStatus(checks),
    checks,
    ...(taskSnapshot === undefined ? {} : {
      task: {
        snapshot: taskSnapshot,
        subscription: "unavailable" as const,
        standing: taskSnapshot.lifecycle === "settled" ? "stale" as const : "available" as const,
      },
    }),
    ...(source === undefined ? {} : { source }),
  };
}

function revalidateTask(
  options: SelfCheckOptions,
  mechanical: SelfCheckMechanical,
): { mechanical: SelfCheckMechanical; stale: boolean } {
  if (options.taskId === undefined || mechanical.task === undefined) {
    return { mechanical, stale: false };
  }
  try {
    const reader = options.dependencies?.taskRead ?? defaultSelfCheckTaskReadPort;
    const after = reader.read(resolveHome(options.home), options.taskId);
    if (sameSelfCheckTaskRevision(mechanical.task.snapshot, after)) {
      return { mechanical, stale: false };
    }
    const detail = `Task ${options.taskId} changed from source ${mechanical.task.snapshot.sourceRevision}/task ${mechanical.task.snapshot.taskRevision} to source ${after.sourceRevision}/task ${after.taskRevision} during self-check.`;
    return {
      stale: true,
      mechanical: {
        ...mechanical,
        status: promoteAttention(mechanical.status),
        task: { ...mechanical.task, snapshot: after, standing: "stale" },
        checks: [
          ...mechanical.checks,
          { id: "task", status: "attention", detail, evidenceRefs: [...after.evidenceRefs] },
        ],
      },
    };
  } catch (error: unknown) {
    const detail = `Task re-read after worker opinion failed: ${message(error)}`;
    return {
      stale: false,
      mechanical: {
        ...mechanical,
        status: "degraded",
        task: { ...mechanical.task, standing: "unavailable" },
        checks: [
          ...mechanical.checks,
          { id: "task", status: "degraded", detail, evidenceRefs: ["workbench:state/tasks.json"] },
        ],
      },
    };
  }
}

function staleOpinion(
  opinion: SelfCheckOpinion,
  task: SelfCheckTaskSnapshot | undefined,
  evidenceRefs: readonly string[],
): SelfCheckOpinion {
  if (!opinion.requested) return opinion;
  const detail = task === undefined
    ? "Task evidence became unavailable after the worker opinion."
    : `Task ${task.taskId} changed while the worker opinion was running; the opinion is stale.`;
  return {
    ...opinion,
    standing: "attention",
    status: "stale",
    items: [...opinion.items, opinionItem("task", "attention", detail, task?.evidenceRefs ?? evidenceRefs)],
    evidenceRefs: [...new Set([...opinion.evidenceRefs, ...evidenceRefs, ...(task?.evidenceRefs ?? [])])],
    summary: `${opinion.summary}; ${detail}`,
  };
}

async function runOpinion(
  options: SelfCheckOptions,
  mechanical: SelfCheckMechanical,
  evidenceRefs: readonly string[],
  onRunnerStart: () => void,
): Promise<SelfCheckOpinion> {
  const workerId = options.workerId ?? "deepseek-flash";
  if (mechanical.status === "degraded") {
    return {
      requested: true,
      workerId,
      standing: "attention",
      status: "not-started",
      verdict: "uncertain",
      items: [opinionItem("preflight", "degraded", "mechanical preflight is degraded; worker opinion was not started", evidenceRefs)],
      evidenceRefs,
      summary: "mechanical preflight is degraded; worker opinion was not started",
    };
  }
  if (options.taskId === undefined) {
    return taskOpinionGap(
      workerId,
      evidenceRefs,
      "no existing Principal Task/Todo was selected; the host has no transient Task subscription API",
    );
  }
  if (mechanical.task === undefined || mechanical.task.standing !== "available") {
    return taskOpinionGap(
      workerId,
      evidenceRefs,
      "the selected Principal Task/Todo snapshot is unavailable or settled; worker opinion was not started",
    );
  }
  let workers: readonly SelfCheckWorker[];
  try {
    workers = options.dependencies?.workerCards
      ? options.dependencies.workerCards(options.environment ?? process.env)
      : defaultWorkerCards(options.environment ?? process.env);
  } catch (error: unknown) {
    return {
      requested: true,
      workerId,
      standing: "attention",
      status: "failed",
      verdict: "uncertain",
      items: [opinionItem("worker-policy", "attention", "worker policy could not be loaded; worker opinion was not started", evidenceRefs)],
      evidenceRefs,
      summary: `worker policy unavailable; worker opinion was not started: ${message(error)}`,
    };
  }
  const worker = workers.find((candidate) => candidate.id === workerId);
  if (worker === undefined) {
    return unavailableOpinion(workerId, evidenceRefs, `worker ${workerId} is not present in host policy`);
  }
  if (worker.availability.status === "unavailable") {
    return unavailableOpinion(workerId, evidenceRefs, worker.availability.reason);
  }
  const timeoutMs = options.opinionTimeoutMs ?? DEFAULT_OPINION_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    return unavailableOpinion(workerId, evidenceRefs, "opinion timeout must be a positive integer");
  }
  const runner = options.dependencies?.opinionRunner ?? runDefaultOpinion;
  const signal = AbortSignal.timeout(timeoutMs);
  const timedOut: Promise<SelfCheckOpinion> = new Promise((resolve) => {
    signal.addEventListener("abort", () => resolve({
      requested: true,
      workerId,
      standing: "attention",
      status: "timeout",
      verdict: "uncertain",
      items: [opinionItem("worker-opinion", "attention", `worker opinion exceeded ${timeoutMs}ms`, evidenceRefs)],
      evidenceRefs,
      summary: `worker opinion exceeded ${timeoutMs}ms; mechanical result remains authoritative`,
    }), { once: true });
  });
  try {
    onRunnerStart();
    const result = await Promise.race([
      runner({ worker, mechanical, task: mechanical.task.snapshot, evidenceRefs, signal }),
      timedOut,
    ]);
    return signal.aborted && result.requested && "status" in result && result.status === "recorded"
      ? {
          requested: true,
          workerId,
          standing: "attention",
          status: "timeout",
          verdict: "uncertain",
          items: [opinionItem("worker-opinion", "attention", `worker opinion exceeded ${timeoutMs}ms`, evidenceRefs)],
          evidenceRefs,
          summary: `worker opinion exceeded ${timeoutMs}ms; mechanical result remains authoritative`,
        }
      : result;
  } catch (error: unknown) {
    return {
      requested: true,
      workerId,
      standing: "attention",
      status: "failed",
      verdict: "uncertain",
      items: [opinionItem("worker-opinion", "attention", `worker opinion failed: ${message(error)}`, evidenceRefs)],
      evidenceRefs,
      summary: `worker opinion failed: ${message(error)}`,
    };
  }
}

async function runDefaultOpinion(input: SelfCheckOpinionInput): Promise<SelfCheckOpinion> {
  try {
    const policy = require("../../autonomy/src/worker-policy") as typeof import("../../autonomy/src/worker-policy");
    const { executeTaskCellRun } = require("./task-run") as typeof import("./task-run");
    const { createLocalHost } = require("../../../packages/work-cell/src/workspace") as typeof import("../../../packages/work-cell/src/workspace");
    const catalog = policy.createCurrentWorkerCatalog();
    const cellInput = {
      id: `self-check-opinion-${Date.now()}`,
      workerId: input.worker.id,
      executionProfile: {
        ...policy.currentWorkerCards().find((worker) => worker.id === input.worker.id)!.executionProfile,
      },
      intent: "Interpret the supplied mechanical self-check evidence; do not claim or change system health.",
      workspace: {
        root: input.mechanical.source?.root ?? process.cwd(),
        readPaths: [],
        writePaths: [],
        excludePaths: [],
        allowedCommands: [],
      },
      instructions: [
        "Return JSON only: {summary, verdict: yes|no|uncertain, items:[{id,state: healthy|attention|degraded, detail, evidenceRefs}]}.",
        "Include one item for each supplied checklist item and cite only supplied evidenceRefs.",
        "Separate observed evidence from interpretation and uncertainty.",
        "Do not edit, run commands, persist state, accept work, or call this self-check again.",
      ],
      capabilities: [],
      context: [{
        id: "self-check-mechanical-evidence",
        title: "Mechanical self-check evidence",
        content: JSON.stringify({ mechanical: input.mechanical, task: input.task }),
        sources: [...input.evidenceRefs],
      }],
      capabilitiesRequired: [],
      acceptance: ["Return one concise opinion with a tri-state verdict and attention items."],
      budget: { maxDurationMs: 1_200, maxCommandOutputBytes: 16_000 },
    };
    const result = await executeTaskCellRun(catalog, cellInput, {
      host: createLocalHost(),
      signal: input.signal,
    });
    if (result.status === "failed") {
      return {
        requested: true,
        workerId: input.worker.id,
        standing: "attention",
        status: "failed",
        verdict: "uncertain",
        items: [opinionItem("worker-opinion", "attention", result.error, input.evidenceRefs)],
        evidenceRefs: input.evidenceRefs,
        summary: result.error,
      };
    }
    if (result.record.status === "cancelled") {
      return {
        requested: true,
        workerId: input.worker.id,
        standing: "attention",
        status: "timeout",
        verdict: "uncertain",
        items: [opinionItem("worker-opinion", "attention", "worker opinion was cancelled at the bounded timeout", input.evidenceRefs)],
        evidenceRefs: input.evidenceRefs,
        summary: "worker opinion was cancelled at the bounded timeout; mechanical result remains authoritative",
      };
    }
    const summary = result.record.finalText.trim().slice(0, 2_000) || "worker returned no opinion text";
    const parsed = parseSelfCheckOpinionPayload(result.record.finalText, input.evidenceRefs);
    return {
      requested: true,
      workerId: input.worker.id,
      standing: "opinion",
      status: "recorded",
      verdict: parsed?.verdict ?? "uncertain",
      evidenceRefs: input.evidenceRefs,
      items: parsed?.items ?? [opinionItem("worker-opinion", "attention", "worker returned unstructured opinion text", input.evidenceRefs)],
      summary: parsed?.summary ?? summary,
    };
  } catch (error: unknown) {
    return {
      requested: true,
      workerId: input.worker.id,
      standing: "attention",
      status: "failed",
      verdict: "uncertain",
      items: [opinionItem("worker-opinion", "attention", message(error), input.evidenceRefs)],
      evidenceRefs: input.evidenceRefs,
      summary: message(error),
    };
  }
}

function defaultWorkerCards(environment: NodeJS.ProcessEnv): readonly SelfCheckWorker[] {
  const policy = require("../../autonomy/src/worker-policy") as typeof import("../../autonomy/src/worker-policy");
  return policy.currentWorkerCards(environment).map((worker) => ({
    id: worker.id,
    provider: worker.executionProfile.provider,
    model: worker.executionProfile.model,
    availability: worker.availability,
  }));
}

function unavailableOpinion(workerId: string, evidenceRefs: readonly string[], summary: string): SelfCheckOpinion {
  return {
    requested: true,
    workerId,
    standing: "attention",
    status: "unavailable",
    verdict: "uncertain",
    items: [opinionItem("worker-opinion", "attention", `worker unavailable: ${summary}`, evidenceRefs)],
    evidenceRefs,
    summary: `worker unavailable: ${summary}; mechanical result remains authoritative`,
  };
}

function taskOpinionGap(
  workerId: string,
  evidenceRefs: readonly string[],
  summary: string,
): SelfCheckOpinion {
  const detail = `Task/Todo query-gap: ${summary}`;
  return {
    requested: true,
    workerId,
    standing: "attention",
    status: "query-gap",
    verdict: "uncertain",
    items: [opinionItem("task-query-gap", "attention", detail, evidenceRefs)],
    evidenceRefs,
    summary: `${detail}; worker opinion was not started`,
  };
}

function aggregateStatus(checks: readonly SelfCheckCheck[]): SelfCheckStatus {
  if (checks.some((check) => check.status === "degraded")) return "degraded";
  if (checks.some((check) => check.status === "attention")) return "attention";
  return "healthy";
}

function promoteAttention(status: SelfCheckStatus): SelfCheckStatus {
  return status === "degraded" ? "degraded" : "attention";
}

function opinionItem(
  id: string,
  state: Exclude<SelfCheckItemState, "checking">,
  detail: string,
  evidenceRefs: readonly string[],
): SelfCheckOpinionItem {
  return { id, state, detail, evidenceRefs: [...evidenceRefs] };
}

export function parseSelfCheckOpinionPayload(
  text: string,
  fallbackEvidenceRefs: readonly string[],
): { summary: string; verdict: "yes" | "no" | "uncertain"; items: SelfCheckOpinionItem[] } | undefined {
  try {
    const value = JSON.parse(text) as {
      summary?: unknown;
      verdict?: unknown;
      items?: unknown;
    };
    if (
      typeof value.summary !== "string"
      || (value.verdict !== "yes" && value.verdict !== "no" && value.verdict !== "uncertain")
      || !Array.isArray(value.items)
      || value.items.length === 0
    ) return undefined;
    const items: SelfCheckOpinionItem[] = [];
    for (const candidate of value.items) {
      if (candidate === null || typeof candidate !== "object") return undefined;
      const item = candidate as { id?: unknown; state?: unknown; detail?: unknown; evidenceRefs?: unknown };
      if (
        typeof item.id !== "string"
        || (item.state !== "healthy" && item.state !== "attention" && item.state !== "degraded")
        || typeof item.detail !== "string"
        || !Array.isArray(item.evidenceRefs)
        || item.evidenceRefs.length === 0
        || item.evidenceRefs.some((ref) => typeof ref !== "string" || ref.length === 0)
        || !item.evidenceRefs.every((ref) => fallbackEvidenceRefs.includes(ref))
      ) return undefined;
      items.push({
        id: item.id,
        state: item.state,
        detail: item.detail,
        evidenceRefs: item.evidenceRefs,
      });
    }
    return { summary: value.summary, verdict: value.verdict, items };
  } catch {
    // The worker is allowed to return ordinary prose, but prose is not a
    // per-item checklist result and therefore remains an attention opinion.
    return undefined;
  }
}

function emitProgress(options: SelfCheckOptions, progress: Omit<SelfCheckProgress, "version">): void {
  options.onProgress?.({ version: SELF_CHECK_VERSION, ...progress });
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
