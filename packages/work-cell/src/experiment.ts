import { randomInt } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { z } from "zod";
import {
  CellInputSchema,
  TreatmentSchema,
  WorkspacePolicySchema,
  type CellInput,
  type CellRunRecord,
} from "./contracts";
import type { CellDriver } from "./driver";
import type {
  BlindRunEvidence,
  ComparisonJudge,
  ComparisonJudgeResult,
  JudgeCandidate,
} from "./judge";
import { runCellTree, type CellTreeResult } from "./run-tree";

const WorkspaceTemplateSchema = WorkspacePolicySchema.omit({ root: true });
const CellTemplateSchema = CellInputSchema.omit({ workspace: true, treatment: true, lineage: true }).extend({
  workspace: WorkspaceTemplateSchema,
});

export const ExperimentSpecSchema = z.object({
  id: z.string().min(1),
  fixture: z.object({
    root: z.string().min(1),
    overlays: z
      .array(z.object({ source: z.string().min(1), destination: z.string().min(1) }))
      .default([]),
  }),
  outputDir: z.string().min(1).default(".work-cell/experiments"),
  task: CellTemplateSchema,
  variants: z
    .array(
      z.object({
        id: z.string().min(1),
        treatment: TreatmentSchema.optional(),
      }),
    )
    .length(2),
  repetitions: z.number().int().positive().max(10).default(1),
  tree: z.object({ maxDepth: z.number().int().nonnegative(), maxCells: z.number().int().positive() }),
  judge: z.object({ rubric: z.string().min(1) }),
});

export type ExperimentSpec = z.infer<typeof ExperimentSpecSchema>;

export type Attribution = "supported" | "overlap" | "failed" | "inconclusive";

export interface VariantRun {
  variantId: string;
  repetition: number;
  tree: CellTreeResult;
  diffs: Record<string, string>;
  directory: string;
}

export interface ExperimentRecord {
  version: "work-cell.experiment.v1";
  id: string;
  startedAt: string;
  finishedAt: string;
  fixtureSnapshot: string;
  runs: VariantRun[];
  comparisons: Array<{
    repetition: number;
    blindMap: Record<"A" | "B", string>;
    judge: ComparisonJudgeResult;
    attribution: Attribution;
  }>;
}

export async function runExperimentFromFile(
  specPath: string,
  createDriver: () => CellDriver,
  judge: ComparisonJudge,
  signal?: AbortSignal,
): Promise<ExperimentRecord> {
  const absoluteSpec = resolve(specPath);
  const spec = ExperimentSpecSchema.parse(JSON.parse(await readFile(absoluteSpec, "utf8")));
  return runExperiment(spec, dirname(absoluteSpec), createDriver, judge, signal);
}

export async function runExperiment(
  spec: ExperimentSpec,
  baseDir: string,
  createDriver: () => CellDriver,
  judge: ComparisonJudge,
  signal?: AbortSignal,
): Promise<ExperimentRecord> {
  const startedAt = new Date();
  const outputRoot = absolute(baseDir, spec.outputDir);
  await mkdir(outputRoot, { recursive: true });
  const experimentDir = await mkdtemp(join(outputRoot, `${safe(spec.id)}-`));
  const fixtureSnapshot = join(experimentDir, "fixture");
  await copyFixture(spec, baseDir, fixtureSnapshot);
  const runs: VariantRun[] = [];

  for (let repetition = 0; repetition < spec.repetitions; repetition += 1) {
    for (const variant of spec.variants) {
      const directory = join(experimentDir, `r${repetition + 1}-${safe(variant.id)}`);
      const workspaceRoot = join(directory, "workspace");
      await mkdir(directory, { recursive: true });
      await cp(fixtureSnapshot, workspaceRoot, { recursive: true, force: true });
      const input: CellInput = CellInputSchema.parse({
        ...spec.task,
        id: `${spec.task.id}-${variant.id}-r${repetition + 1}`,
        workspace: { ...spec.task.workspace, root: workspaceRoot },
        ...(variant.treatment ? { treatment: variant.treatment } : {}),
        lineage: { depth: 0 },
      });
      const tree = await runCellTree(input, {
        limits: spec.tree,
        createDriver,
        createChildWorkspace: async (parent, child, ordinal) => {
          const childRoot = join(directory, "children", `${safe(child.id)}-${ordinal}`);
          await mkdir(dirname(childRoot), { recursive: true });
          await cp(parent.input.workspace.root, childRoot, { recursive: true, force: true });
          return childRoot;
        },
      }, signal);
      const diffs: Record<string, string> = {};
      for (const record of tree.records) {
        const cellsDir = join(directory, "cells");
        await mkdir(cellsDir, { recursive: true });
        await writeJson(join(cellsDir, `${record.runId}.json`), record);
        diffs[record.runId] = await unifiedDiff(fixtureSnapshot, record.input.workspace.root);
        await writeFile(join(cellsDir, `${record.runId}.diff`), diffs[record.runId] ?? "", "utf8");
      }
      await writeJson(join(directory, "tree.json"), tree);
      runs.push({ variantId: variant.id, repetition, tree, diffs, directory });
    }
  }

  const comparisons: ExperimentRecord["comparisons"] = [];
  for (let repetition = 0; repetition < spec.repetitions; repetition += 1) {
    const pair = runs.filter((run) => run.repetition === repetition);
    if (pair.length !== 2 || !pair[0] || !pair[1]) throw new Error("comparison requires exactly two runs");
    const swapped = randomInt(2) === 1;
    const aRun = swapped ? pair[1] : pair[0];
    const bRun = swapped ? pair[0] : pair[1];
    const result = validForJudgement(aRun.tree) && validForJudgement(bRun.tree)
      ? await judge.judge({
          intent: spec.task.intent,
          acceptance: spec.task.acceptance,
          rubric: spec.judge.rubric,
          a: judgeCandidate("A", aRun),
          b: judgeCandidate("B", bRun),
          ...(signal ? { signal } : {}),
        })
      : invalidComparisonResult(aRun, bRun);
    const blindMap = { A: aRun.variantId, B: bRun.variantId } as const;
    const treatmentVariant = spec.variants.find((variant) => variant.treatment)?.id;
    const attribution = mapAttribution(result.judgement.preferred, blindMap, treatmentVariant);
    comparisons.push({ repetition, blindMap, judge: result, attribution });
  }

  const record: ExperimentRecord = {
    version: "work-cell.experiment.v1",
    id: spec.id,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    fixtureSnapshot,
    runs,
    comparisons,
  };
  await writeJson(join(experimentDir, "experiment.json"), record);
  return record;
}

function validForJudgement(tree: CellTreeResult): boolean {
  return (
    tree.records.length > 0 &&
    tree.unresolvedChildren.length === 0 &&
    tree.records.every((record) => record.status === "passed" || record.status === "split")
  );
}

function invalidComparisonResult(a: VariantRun, b: VariantRun): ComparisonJudgeResult {
  return {
    judgement: {
      preferred: "inconclusive",
      acceptance: [],
      findings: ["Comparison was not judged because one or both variants lacked a fully settled cell tree."],
      evidence: [
        `A statuses: ${a.tree.records.map((record) => record.status).join(", ") || "none"}`,
        `B statuses: ${b.tree.records.map((record) => record.status).join(", ") || "none"}`,
      ],
    },
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
    raw: { skipped: true },
  };
}

async function copyFixture(spec: ExperimentSpec, baseDir: string, destination: string): Promise<void> {
  await cp(absolute(baseDir, spec.fixture.root), destination, { recursive: true, force: true });
  for (const overlay of spec.fixture.overlays) {
    const source = absolute(baseDir, overlay.source);
    const target = join(destination, overlay.destination);
    await mkdir(dirname(target), { recursive: true });
    const sourceInfo = await stat(source);
    if (sourceInfo.isDirectory()) await cp(source, target, { recursive: true, force: true });
    else await cp(source, target, { force: true });
  }
}

function judgeCandidate(label: "A" | "B", run: VariantRun): JudgeCandidate {
  return { label, records: run.tree.records.map(blindEvidence), diffs: run.diffs };
}

function blindEvidence(record: CellRunRecord): BlindRunEvidence {
  return {
    runId: record.runId,
    cellId: record.cellId,
    ...(record.parentRunId ? { parentRunId: record.parentRunId } : {}),
    depth: record.depth,
    status: record.status,
    ...(record.geneExpression ? { geneExpression: record.geneExpression } : {}),
    loadedInterpretations: record.loadedInterpretations,
    ...(record.submission ? { submission: record.submission } : {}),
    verification: record.verification,
    workspaceDiff: record.workspaceDiff,
    usage: record.usage,
    trace: record.trace,
    ...(record.error ? { error: record.error } : {}),
  };
}

function mapAttribution(
  preferred: "A" | "B" | "tie" | "inconclusive",
  blindMap: Record<"A" | "B", string>,
  treatmentVariant: string | undefined,
): Attribution {
  if (!treatmentVariant || preferred === "inconclusive") return "inconclusive";
  if (preferred === "tie") return "overlap";
  return blindMap[preferred] === treatmentVariant ? "supported" : "failed";
}

async function unifiedDiff(before: string, after: string): Promise<string> {
  const child = Bun.spawn(["git", "diff", "--no-index", "--text", "--", before, after], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0 && exitCode !== 1) throw new Error(`git diff failed (${exitCode}): ${stderr}`);
  return stdout;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function absolute(baseDir: string, path: string): string {
  return isAbsolute(path) ? path : resolve(baseDir, path);
}

function safe(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}
