import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { z } from "zod";
import {
  CellInputSchema,
  CellRunRecordSchema,
  UsageSchema,
  type CellInput,
  type CellRunRecord,
  type CellUsage,
} from "./contracts";
import type { CellDriver } from "./driver";
import { readJsonFileInput, type JsonFileInputRef } from "./file-input";
import { assertMultiCellWorkspaceBoundary } from "./multi-cell-workspace";
import { InMemoryCellQueue, runOrchestration } from "./orchestration";

export const SWARM_INPUT_VERSION = "work-cell.swarm-input.v1" as const;
export const SWARM_OUTCOME_VERSION = "work-cell.swarm-outcome.v1" as const;
export const SWARM_INDEX_VERSION = "work-cell.swarm-index.v1" as const;
export const SWARM_FILE_OPERATION_VERSION = "work-cell.swarm-file-operation.v1" as const;

export const SwarmInputSchema = z.object({
  version: z.literal(SWARM_INPUT_VERSION),
  id: z.string().min(1),
  concurrency: z.number().int().min(1).max(256),
  cells: z.array(CellInputSchema).min(1).max(256),
}).strict().superRefine((value, context) => {
  const ids = value.cells.map((cell) => cell.id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", path: ["cells"], message: "Swarm cell IDs must be unique" });
  }
});

export type SwarmInput = z.infer<typeof SwarmInputSchema>;

export interface SettledSwarmCell {
  index: number;
  cellId: string;
  kind: "settled";
  record: CellRunRecord;
}

export interface SwarmCellRunnerError {
  index: number;
  cellId: string;
  kind: "runner_error";
  input: CellInput;
  startedAt: Date;
  finishedAt: Date;
  error: string;
}

export type SwarmCellOutcome = SettledSwarmCell | SwarmCellRunnerError;

export const SwarmSummarySchema = z.object({
  authority: z.literal("none"),
  counts: z.record(z.string(), z.number().int().nonnegative()),
  usage: UsageSchema,
  estimateAudit: z.object({
    estimatedCells: z.number().int().nonnegative(),
    totalCells: z.number().int().nonnegative(),
    estimatedTokens: z.number().int().nonnegative(),
    actualTokens: z.number().int().nonnegative(),
    relativeError: z.number().nonnegative().optional(),
  }).strict(),
}).strict();

export type SwarmSummary = z.infer<typeof SwarmSummarySchema>;

export interface SwarmRun {
  runId: string;
  swarmId: string;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  concurrency: number;
  outcomes: SwarmCellOutcome[];
}

/** In-process asynchronous carrier. `runSwarm` remains its blocking convenience projection. */
export interface SwarmHandle {
  readonly swarmId: string;
  readonly settled: Promise<SwarmRun>;
  cancel(reason?: unknown): void;
}

export const SwarmFileOperationStatusSchema = z.object({
  version: z.literal(SWARM_FILE_OPERATION_VERSION),
  operationId: z.string().min(1),
  swarmId: z.string().min(1),
  state: z.enum(["running", "settled", "failed"]),
  input: z.object({
    path: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    bytes: z.number().int().nonnegative(),
  }).strict(),
  statusPath: z.string().min(1),
  resultPath: z.string().min(1),
  error: z.string().min(1).optional(),
}).strict();

export type SwarmFileOperationStatus = z.infer<typeof SwarmFileOperationStatusSchema>;

export interface FileBackedSwarmSettlement {
  readonly run: SwarmRun;
  readonly persisted: Awaited<ReturnType<typeof persistSwarmRecordAt>>;
}

/** File-backed transport around the ordinary in-memory Swarm contract. */
export interface FileBackedSwarmHandle {
  readonly operationId: string;
  readonly swarmId: string;
  readonly input: { readonly path: string; readonly sha256: string; readonly bytes: number };
  readonly statusPath: string;
  readonly resultPath: string;
  readonly settled: Promise<FileBackedSwarmSettlement>;
  cancel(reason?: unknown): void;
}

export interface StartSwarmFromFileOptions {
  /** Host-owned boundary within which `inputFile` is resolved. */
  readonly inputRoot: string;
  /** Host-owned directory for operation status, index, and Cell records. */
  readonly outputRoot: string;
  readonly signal?: AbortSignal;
}

const SwarmStatusSchema = z.enum([
  "passed",
  "failed",
  "verification_failed",
  "protocol_error",
  "capability_mismatch",
  "cancelled",
  "runner_error",
]);

export const SwarmOutcomeRecordSchema = z.discriminatedUnion("kind", [
  z.object({
    version: z.literal(SWARM_OUTCOME_VERSION),
    index: z.number().int().nonnegative(),
    cellId: z.string().min(1),
    kind: z.literal("settled"),
    record: CellRunRecordSchema,
  }).strict(),
  z.object({
    version: z.literal(SWARM_OUTCOME_VERSION),
    index: z.number().int().nonnegative(),
    cellId: z.string().min(1),
    kind: z.literal("runner_error"),
    input: CellInputSchema,
    startedAt: z.string().min(1),
    finishedAt: z.string().min(1),
    error: z.string().min(1),
  }).strict(),
]);

export type SwarmOutcomeRecord = z.infer<typeof SwarmOutcomeRecordSchema>;

export const SwarmIndexSchema = z.object({
  version: z.literal(SWARM_INDEX_VERSION),
  runId: z.string().min(1),
  swarmId: z.string().min(1),
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1),
  durationMs: z.number().nonnegative(),
  concurrency: z.number().int().min(1).max(256),
  entries: z.array(z.object({
    index: z.number().int().nonnegative(),
    cellId: z.string().min(1),
    status: SwarmStatusSchema,
    recordPath: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    cellRunId: z.string().min(1).optional(),
    usage: UsageSchema,
  }).strict()),
  summary: SwarmSummarySchema,
}).strict();

export type SwarmIndex = z.infer<typeof SwarmIndexSchema>;

export async function runSwarm(
  unparsedManifest: unknown,
  createDriver: () => CellDriver,
  signal?: AbortSignal,
): Promise<SwarmRun> {
  const handle = await startSwarm(unparsedManifest, createDriver, signal);
  return handle.settled;
}

export async function startSwarm(
  unparsedManifest: unknown,
  createDriver: () => CellDriver,
  signal?: AbortSignal,
): Promise<SwarmHandle> {
  const manifest = SwarmInputSchema.parse(unparsedManifest);
  await assertSwarmWorkspaceBoundary(manifest.cells);
  const controller = new AbortController();
  const executionSignal = signal === undefined
    ? controller.signal
    : AbortSignal.any([signal, controller.signal]);
  const settled = runAdmittedSwarm(manifest, createDriver, executionSignal);
  return {
    swarmId: manifest.id,
    settled,
    cancel(reason?: unknown) {
      controller.abort(reason ?? new DOMException("Swarm cancelled", "AbortError"));
    },
  };
}

/**
 * Admit a Swarm from a small file reference and return stable output paths
 * before its Cells settle. The parsed manifest is frozen in memory; later file
 * edits cannot change the admitted run.
 */
export async function startSwarmFromFile(
  unparsedRef: JsonFileInputRef,
  createDriver: () => CellDriver,
  options: StartSwarmFromFileOptions,
): Promise<FileBackedSwarmHandle> {
  const frozen = await readJsonFileInput(unparsedRef, options.inputRoot, SwarmInputSchema);
  const manifest = resolveRelativeWorkspaceRoots(frozen.value, dirname(frozen.path));
  const operationId = randomUUID();
  const directory = join(resolve(options.outputRoot), operationId);
  const statusPath = join(directory, "status.json");
  const resultPath = join(directory, "index.json");
  await mkdir(directory, { recursive: true });

  const handle = await startSwarm(manifest, createDriver, options.signal);
  const base = {
    version: SWARM_FILE_OPERATION_VERSION,
    operationId,
    swarmId: handle.swarmId,
    input: { path: frozen.path, sha256: frozen.sha256, bytes: frozen.bytes },
    statusPath,
    resultPath,
  } as const;
  await writeOperationStatus(statusPath, { ...base, state: "running" });
  const settled = (async (): Promise<FileBackedSwarmSettlement> => {
    try {
      const run = await handle.settled;
      const persisted = await persistSwarmRecordAt(directory, run);
      await writeOperationStatus(statusPath, { ...base, state: "settled" });
      return { run, persisted };
    } catch (error) {
      await writeOperationStatus(statusPath, {
        ...base,
        state: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  })();
  return {
    operationId,
    swarmId: handle.swarmId,
    input: base.input,
    statusPath,
    resultPath,
    settled,
    cancel: (reason?: unknown) => handle.cancel(reason),
  };
}

async function runAdmittedSwarm(
  manifest: SwarmInput,
  createDriver: () => CellDriver,
  signal: AbortSignal,
): Promise<SwarmRun> {
  const source = new InMemoryCellQueue("Swarm cells");
  for (const input of manifest.cells) await source.submit(input, input.id);
  source.close();
  const orchestration = await runOrchestration(source, createDriver, {
    concurrency: manifest.concurrency,
    signal,
  });
  const outcomes: SwarmCellOutcome[] = source.settlements().map((settlement): SwarmCellOutcome => {
    const { input, sequence } = settlement.lease.item;
    if (settlement.kind === "settled") {
      return { index: sequence, cellId: input.id, kind: "settled", record: settlement.record };
    }
    return {
      index: sequence,
      cellId: input.id,
      kind: "runner_error",
      input,
      startedAt: settlement.startedAt,
      finishedAt: settlement.finishedAt,
      error: settlement.error,
    };
  });
  for (const item of source.pendingItems()) {
    outcomes.push({
      index: item.sequence,
      cellId: item.input.id,
      kind: "runner_error",
      input: item.input,
      startedAt: orchestration.finishedAt,
      finishedAt: orchestration.finishedAt,
      error: "Swarm cancelled before this Cell was dispatched",
    });
  }
  outcomes.sort((left, right) => left.index - right.index);
  return {
    runId: orchestration.runId,
    swarmId: manifest.id,
    startedAt: orchestration.startedAt,
    finishedAt: orchestration.finishedAt,
    durationMs: orchestration.durationMs,
    concurrency: manifest.concurrency,
    outcomes,
  };
}

export async function assertSwarmWorkspaceBoundary(cells: CellInput[]): Promise<void> {
  await assertMultiCellWorkspaceBoundary(cells, "Swarm cells");
}

export async function persistSwarmRecord(
  manifestPath: string,
  record: SwarmRun,
): Promise<{ directory: string; indexPath: string; cellRecordPaths: string[]; index: SwarmIndex }> {
  const absoluteManifest = resolve(manifestPath);
  const stem = basename(absoluteManifest).replace(/\.json$/, "");
  const directory = join(dirname(absoluteManifest), `${safe(stem)}.${record.runId}.swarm`);
  return persistSwarmRecordAt(directory, record);
}

export async function persistSwarmRecordAt(
  directory: string,
  record: SwarmRun,
): Promise<{ directory: string; indexPath: string; cellRecordPaths: string[]; index: SwarmIndex }> {
  const absoluteDirectory = resolve(directory);
  const cellsDirectory = join(absoluteDirectory, "cells");
  await mkdir(cellsDirectory, { recursive: true });
  const entries: SwarmIndex["entries"] = [];
  const cellRecordPaths: string[] = [];
  for (const outcome of record.outcomes) {
    const filename = `${String(outcome.index + 1).padStart(4, "0")}-${safe(outcome.cellId)}.json`;
    const path = join(cellsDirectory, filename);
    const persistedOutcome = SwarmOutcomeRecordSchema.parse({
      ...outcome,
      version: SWARM_OUTCOME_VERSION,
      ...(outcome.kind === "runner_error" ? {
        startedAt: outcome.startedAt.toISOString(),
        finishedAt: outcome.finishedAt.toISOString(),
      } : {}),
    });
    const content = `${JSON.stringify(persistedOutcome, null, 2)}\n`;
    await writeFile(path, content, "utf8");
    const settled = outcome.kind === "settled" ? outcome.record : undefined;
    entries.push({
      index: outcome.index,
      cellId: outcome.cellId,
      status: settled?.status ?? "runner_error",
      recordPath: `cells/${filename}`,
      sha256: createHash("sha256").update(content).digest("hex"),
      ...(settled ? { cellRunId: settled.runId } : {}),
      usage: settled?.usage ?? emptyUsage(),
    });
    cellRecordPaths.push(path);
  }
  const index = SwarmIndexSchema.parse({
    version: SWARM_INDEX_VERSION,
    runId: record.runId,
    swarmId: record.swarmId,
    startedAt: record.startedAt.toISOString(),
    finishedAt: record.finishedAt.toISOString(),
    durationMs: record.durationMs,
    concurrency: record.concurrency,
    entries,
    summary: projectSwarm(record),
  });
  const indexPath = join(absoluteDirectory, "index.json");
  await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  return { directory: absoluteDirectory, indexPath, cellRecordPaths, index };
}

export function projectSwarm(record: SwarmRun): SwarmSummary {
  const { outcomes } = record;
  const counts: Record<string, number> = {};
  let usage = emptyUsage();
  for (const outcome of outcomes) {
    const status = outcome.kind === "settled" ? outcome.record.status : "runner_error";
    counts[status] = (counts[status] ?? 0) + 1;
    if (outcome.kind === "settled") usage = addUsage(usage, outcome.record.usage);
  }
  const inputs = outcomes.map((outcome) => outcome.kind === "settled" ? outcome.record.input : outcome.input);
  const estimates = inputs.flatMap((input) => input.budget.estimatedTokens === undefined ? [] : [input.budget.estimatedTokens]);
  const estimatedTokens = estimates.reduce((sum, value) => sum + value, 0);
  return {
    authority: "none",
    counts,
    usage,
    estimateAudit: {
      estimatedCells: estimates.length,
      totalCells: inputs.length,
      estimatedTokens,
      actualTokens: usage.totalTokens,
      ...(estimates.length === inputs.length && estimatedTokens > 0 ? {
        relativeError: Math.abs(usage.totalTokens - estimatedTokens) / estimatedTokens,
      } : {}),
    },
  };
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

function safe(value: string): string {
  const normalized = value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "cell";
}

function resolveRelativeWorkspaceRoots(manifest: SwarmInput, base: string): SwarmInput {
  return SwarmInputSchema.parse({
    ...manifest,
    cells: manifest.cells.map((cell) => ({
      ...cell,
      workspace: {
        ...cell.workspace,
        root: isAbsolute(cell.workspace.root) ? cell.workspace.root : resolve(base, cell.workspace.root),
      },
    })),
  });
}

async function writeOperationStatus(path: string, status: SwarmFileOperationStatus): Promise<void> {
  const parsed = SwarmFileOperationStatusSchema.parse(status);
  await writeFile(path, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
}
