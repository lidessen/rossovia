import { createHash, randomUUID } from "node:crypto";
import { mkdir, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { z } from "zod";
import { mapConcurrent } from "./concurrency";
import {
  CellInputSchema,
  CellRunRecordSchema,
  UsageSchema,
  type CellInput,
  type CellRunRecord,
  type CellUsage,
} from "./contracts";
import type { CellDriver } from "./driver";
import { runCell } from "./run-cell";

export const SWARM_INPUT_VERSION = "work-cell.swarm-input.v1" as const;
export const SWARM_OUTCOME_VERSION = "work-cell.swarm-outcome.v1" as const;
export const SWARM_INDEX_VERSION = "work-cell.swarm-index.v1" as const;

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
  const manifest = SwarmInputSchema.parse(unparsedManifest);
  await assertSwarmWorkspaceBoundary(manifest.cells);
  const runId = randomUUID();
  const startedAt = new Date();
  const outcomes = await mapConcurrent(manifest.cells, manifest.concurrency, async (input, index): Promise<SwarmCellOutcome> => {
    const cellStartedAt = new Date();
    try {
      const record = await runCell(input, createDriver(), signal ? { signal } : undefined);
      return { index, cellId: input.id, kind: "settled", record };
    } catch (error) {
      return {
        index,
        cellId: input.id,
        kind: "runner_error",
        input,
        startedAt: cellStartedAt,
        finishedAt: new Date(),
        error: message(error),
      };
    }
  });
  const finishedAt = new Date();
  return {
    runId,
    swarmId: manifest.id,
    startedAt,
    finishedAt,
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    concurrency: manifest.concurrency,
    outcomes,
  };
}

export async function assertSwarmWorkspaceBoundary(cells: CellInput[]): Promise<void> {
  const roots = await Promise.all(cells.map(async (cell) => ({
    cell,
    root: await realpath(cell.workspace.root),
  })));
  const grouped = new Map<string, CellInput[]>();
  for (const entry of roots) {
    const group = grouped.get(entry.root) ?? [];
    group.push(entry.cell);
    grouped.set(entry.root, group);
  }
  for (const [root, group] of grouped) {
    if (group.length < 2 || group.every(isReadOnlyCell)) continue;
    throw new Error(
      `Swarm cells sharing workspace ${root} must all be read-only and command-free; conflicting cells: ${group.map((cell) => cell.id).join(", ")}`,
    );
  }
}

export async function persistSwarmRecord(
  manifestPath: string,
  record: SwarmRun,
): Promise<{ directory: string; indexPath: string; cellRecordPaths: string[]; index: SwarmIndex }> {
  const absoluteManifest = resolve(manifestPath);
  const stem = basename(absoluteManifest).replace(/\.json$/, "");
  const directory = join(dirname(absoluteManifest), `${safe(stem)}.${record.runId}.swarm`);
  const cellsDirectory = join(directory, "cells");
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
  const indexPath = join(directory, "index.json");
  await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  return { directory, indexPath, cellRecordPaths, index };
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

function isReadOnlyCell(cell: CellInput): boolean {
  return cell.workspace.writePaths.length === 0 && cell.workspace.allowedCommands.length === 0;
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

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
