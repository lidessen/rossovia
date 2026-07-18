import { createHash, randomInt } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { z } from "zod";
import {
  CellInputSchema,
  UsageSchema,
  WorkspacePolicySchema,
  type CellInput,
  type CellRunRecord,
  type CellUsage,
  type DriverDescriptor,
} from "../../contracts";
import type { CellDriver } from "../../driver";
import { runCell } from "../../run-cell";
import { ValidationRouteSchema, type ProviderRouteTarget } from "../../provider-profile";
import {
  type BlindModelRunEvidence,
  type ModelEvaluationJudge,
  type ModelEvaluationJudgeResult,
  type ModelEvaluationJudgement,
} from "./judge";

const WorkspaceTemplateSchema = WorkspacePolicySchema.omit({ root: true });
const CellTemplateSchema = CellInputSchema.omit({
  id: true,
  workspace: true,
  executionProfile: true,
}).extend({ workspace: WorkspaceTemplateSchema });

export const ModelEvaluationProfileSchema = z.object({
  id: z.string().min(1),
  route: ValidationRouteSchema,
  contextPolicy: z.string().min(1),
  toolSurface: z.string().min(1),
  declaredInferencePolicy: z.string().min(1),
  priceRevision: z.string().min(1).optional(),
}).strict();

export type ModelEvaluationProfile = z.infer<typeof ModelEvaluationProfileSchema>;

export const ModelEvaluationCaseSchema = z.object({
  id: z.string().min(1),
  dimension: z.string().min(1),
  task: CellTemplateSchema,
  referenceCriteria: z.array(z.string().min(1)).min(1),
  rubric: z.string().min(1),
  failureClasses: z.array(z.object({
    id: z.string().min(1),
    description: z.string().min(1),
  }).strict()).min(1),
}).strict().superRefine((value, context) => {
  addDuplicateIssues(value.failureClasses.map(({ id }) => id), context, ["failureClasses"]);
  addDuplicateValueIssues(
    value.referenceCriteria.map(normalizeCriterion),
    context,
    ["referenceCriteria"],
    "criterion",
  );
  const visible = new Set(value.task.acceptance.map(normalizeCriterion));
  for (const [index, criterion] of value.referenceCriteria.entries()) {
    if (visible.has(normalizeCriterion(criterion))) {
      context.addIssue({
        code: "custom",
        message: "reference criteria must remain evaluator-only; do not duplicate worker-visible acceptance",
        path: ["referenceCriteria", index],
      });
    }
  }
});

export type ModelEvaluationCase = z.infer<typeof ModelEvaluationCaseSchema>;

export const ModelEvaluationSpecSchema = z.object({
  version: z.literal("work-cell.model-evaluation.v2"),
  id: z.string().min(1),
  fixture: z.object({
    root: z.string().min(1),
    overlays: z.array(z.object({
      source: z.string().min(1),
      destination: z.string().min(1),
    }).strict()).default([]),
  }).strict(),
  outputDir: z.string().min(1).default(".work-cell/model-evaluations"),
  profiles: z.array(ModelEvaluationProfileSchema).length(2),
  repetitions: z.number().int().min(2).max(5),
  cases: z.array(ModelEvaluationCaseSchema).min(1).max(12),
  judge: z.object({ route: ValidationRouteSchema }).strict(),
}).strict().superRefine((value, context) => {
  addDuplicateIssues(value.profiles.map(({ id }) => id), context, ["profiles"]);
  addDuplicateIssues(value.cases.map(({ id }) => id), context, ["cases"]);
});

export type ModelEvaluationSpec = z.infer<typeof ModelEvaluationSpecSchema>;

export interface ModelEvaluationTrial {
  caseId: string;
  profileId: string;
  repetition: number;
  order: number;
  directory: string;
  record?: CellRunRecord;
  runnerError?: string;
}

export interface ModelEvaluationProfileSummary {
  profileId: string;
  totalTrials: number;
  observedRuns: number;
  statusCounts: Record<string, number>;
  selectedRouteIdentities: string[];
  durationMs: { min: number; mean: number; max: number } | null;
  usage: { total: CellUsage; meanPerObservedRun: CellUsage };
  estimatedCostUsd: { knownRuns: number; total: number };
}

export interface ModelEvaluationComparison {
  caseId: string;
  blindMap: Record<"A" | "B", string>;
  result: ModelEvaluationJudgeResult;
}

export interface ModelEvaluationRecord {
  version: "work-cell.model-evaluation.run.v2";
  id: string;
  sourceSha256?: string;
  startedAt: string;
  finishedAt: string;
  directory: string;
  fixtureSnapshot: string;
  profiles: Array<{
    id: string;
    declaredRoute: Array<{ provider: string; model?: string; baseURL?: string }>;
    contextPolicy: string;
    toolSurface: string;
    declaredInferencePolicy: string;
    priceRevision?: string;
  }>;
  cases: Array<{
    id: string;
    dimension: string;
    workerAcceptance: string[];
    referenceCriteria: string[];
    rubric: string;
    failureClasses: Array<{ id: string; description: string }>;
  }>;
  repetitions: number;
  trials: ModelEvaluationTrial[];
  comparisons: ModelEvaluationComparison[];
  profileSummaries: ModelEvaluationProfileSummary[];
  authority: "candidate evidence; human or designated host acceptance required";
  recordPath: string;
}

export type ModelEvaluationDriverFactory = (profile: ModelEvaluationProfile) => CellDriver;

export interface ModelEvaluationRunOptions {
  startingProfileIndex?: 0 | 1;
  signal?: AbortSignal;
  sourceSha256?: string;
}

export async function runModelEvaluationFromFile(
  specPath: string,
  createDriver: ModelEvaluationDriverFactory,
  judge: ModelEvaluationJudge,
  signal?: AbortSignal,
): Promise<ModelEvaluationRecord> {
  const absoluteSpec = resolve(specPath);
  const source = await readFile(absoluteSpec, "utf8");
  const spec = ModelEvaluationSpecSchema.parse(JSON.parse(source));
  return runModelEvaluation(spec, dirname(absoluteSpec), createDriver, judge, {
    ...(signal ? { signal } : {}),
    sourceSha256: createHash("sha256").update(source).digest("hex"),
  });
}

export async function runModelEvaluation(
  spec: ModelEvaluationSpec,
  baseDir: string,
  createDriver: ModelEvaluationDriverFactory,
  judge: ModelEvaluationJudge,
  options: ModelEvaluationRunOptions = {},
): Promise<ModelEvaluationRecord> {
  const startedAt = new Date();
  const outputRoot = absolute(baseDir, spec.outputDir);
  await mkdir(outputRoot, { recursive: true });
  const directory = await mkdtemp(join(outputRoot, `${safe(spec.id)}-`));
  const fixtureSnapshot = join(directory, "fixture");
  await copyFixture(spec, baseDir, fixtureSnapshot);
  const start = options.startingProfileIndex ?? randomInt(2) as 0 | 1;
  const trials: ModelEvaluationTrial[] = [];

  for (let repetition = 0; repetition < spec.repetitions; repetition += 1) {
    const profileOrder = (start + repetition) % 2 === 0
      ? spec.profiles
      : [spec.profiles[1]!, spec.profiles[0]!];
    for (const evaluationCase of spec.cases) {
      for (const [orderIndex, profile] of profileOrder.entries()) {
        const trialDirectory = join(
          directory,
          `r${repetition + 1}-${safe(evaluationCase.id)}-${safe(profile.id)}`,
        );
        const workspaceRoot = join(trialDirectory, "workspace");
        const trial: ModelEvaluationTrial = {
          caseId: evaluationCase.id,
          profileId: profile.id,
          repetition: repetition + 1,
          order: orderIndex + 1,
          directory: trialDirectory,
        };
        try {
          await mkdir(trialDirectory, { recursive: true });
          await cp(fixtureSnapshot, workspaceRoot, { recursive: true, force: true });
          const driver = createDriver(profile);
          const input = materializeInput(evaluationCase, profile, driver.descriptor, workspaceRoot, repetition);
          trial.record = await runCell(
            input,
            driver,
            options.signal ? { signal: options.signal } : undefined,
          );
          await writeJson(join(trialDirectory, "record.json"), trial.record);
        } catch (error) {
          trial.runnerError = error instanceof Error ? error.message : String(error);
          delete trial.record;
          try {
            await mkdir(trialDirectory, { recursive: true });
            await writeJson(join(trialDirectory, "runner-error.json"), {
              caseId: trial.caseId,
              profileId: trial.profileId,
              repetition: trial.repetition,
              error: trial.runnerError,
            });
          } catch (persistenceError) {
            const message = persistenceError instanceof Error
              ? persistenceError.message
              : String(persistenceError);
            trial.runnerError = `${trial.runnerError}; runner-error persistence failed: ${message}`;
          }
        }
        trials.push(trial);
      }
    }
  }

  const comparisons: ModelEvaluationComparison[] = [];
  for (const evaluationCase of spec.cases) {
    const profileRuns = spec.profiles.map((profile) => ({
      profile,
      trials: trials
        .filter((trial) => trial.caseId === evaluationCase.id && trial.profileId === profile.id)
        .sort((left, right) => left.repetition - right.repetition),
    }));
    const swapped = randomInt(2) === 1;
    const a = swapped ? profileRuns[1]! : profileRuns[0]!;
    const b = swapped ? profileRuns[0]! : profileRuns[1]!;
    const blindMap = { A: a.profile.id, B: b.profile.id } as const;
    const valid = [...a.trials, ...b.trials].every(
      (trial) => trial.record?.status === "passed",
    );
    let result: ModelEvaluationJudgeResult;
    if (!valid) {
      result = skippedJudgeResult(judge.descriptor, evaluationCase, a.trials, b.trials);
    } else {
      try {
        result = await judge.judge({
          intent: evaluationCase.task.intent,
          referenceCriteria: evaluationCase.referenceCriteria,
          rubric: evaluationCase.rubric,
          failureClasses: evaluationCase.failureClasses,
          a: { label: "A", records: a.trials.map(blindRunEvidence) },
          b: { label: "B", records: b.trials.map(blindRunEvidence) },
          ...(options.signal ? { signal: options.signal } : {}),
        });
      } catch (error) {
        result = failedJudgeResult(judge.descriptor, evaluationCase, error);
      }
    }
    comparisons.push({ caseId: evaluationCase.id, blindMap, result });
  }

  const recordPath = join(directory, "evaluation.json");
  const record: ModelEvaluationRecord = {
    version: "work-cell.model-evaluation.run.v2",
    id: spec.id,
    ...(options.sourceSha256 ? { sourceSha256: options.sourceSha256 } : {}),
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    directory,
    fixtureSnapshot,
    profiles: spec.profiles.map((profile) => ({
      id: profile.id,
      declaredRoute: profile.route.map(sanitizeRouteTarget),
      contextPolicy: profile.contextPolicy,
      toolSurface: profile.toolSurface,
      declaredInferencePolicy: profile.declaredInferencePolicy,
      ...(profile.priceRevision ? { priceRevision: profile.priceRevision } : {}),
    })),
    cases: spec.cases.map((evaluationCase) => ({
      id: evaluationCase.id,
      dimension: evaluationCase.dimension,
      workerAcceptance: evaluationCase.task.acceptance,
      referenceCriteria: evaluationCase.referenceCriteria,
      rubric: evaluationCase.rubric,
      failureClasses: evaluationCase.failureClasses,
    })),
    repetitions: spec.repetitions,
    trials,
    comparisons,
    profileSummaries: spec.profiles.map((profile) => summarizeProfile(profile.id, trials)),
    authority: "candidate evidence; human or designated host acceptance required",
    recordPath,
  };
  await writeJson(recordPath, record);
  return record;
}

function materializeInput(
  evaluationCase: ModelEvaluationCase,
  profile: ModelEvaluationProfile,
  descriptor: DriverDescriptor,
  workspaceRoot: string,
  repetition: number,
): CellInput {
  return CellInputSchema.parse({
    ...evaluationCase.task,
    id: `${evaluationCase.id}-${profile.id}-r${repetition + 1}`,
    workspace: { ...evaluationCase.task.workspace, root: workspaceRoot },
    executionProfile: {
      id: profile.id,
      version: "execution-profile.v1",
      provider: descriptor.provider,
      model: descriptor.model,
      contextPolicy: profile.contextPolicy,
      toolSurface: profile.toolSurface,
      parallelism: "serial",
      ...(profile.priceRevision ? { priceRevision: profile.priceRevision } : {}),
    },
  });
}

function blindRunEvidence(trial: ModelEvaluationTrial): BlindModelRunEvidence {
  const record = trial.record;
  if (!record) throw new Error("cannot blind a model-evaluation trial without a Cell record");
  return {
    runId: record.runId,
    repetition: trial.repetition,
    status: record.status,
    finalText: record.finalText,
    ...(record.output === undefined ? {} : { output: record.output }),
    artifacts: record.artifacts,
    verification: record.verification,
    workspaceDiff: record.workspaceDiff,
  };
}

function skippedJudgeResult(
  descriptor: DriverDescriptor,
  evaluationCase: ModelEvaluationCase,
  a: ModelEvaluationTrial[],
  b: ModelEvaluationTrial[],
): ModelEvaluationJudgeResult {
  const judgement: ModelEvaluationJudgement = {
    preferred: "inconclusive",
    acceptance: evaluationCase.referenceCriteria.map((condition) => ({
      condition,
      a: "unknown",
      b: "unknown",
      evidence: [],
    })),
    findings: [
      `comparison skipped because one or more trials were unsettled; A=${trialStates(a).join(",")}; B=${trialStates(b).join(",")}`,
    ],
    evidence: [],
  };
  return {
    descriptor,
    judgement,
    usage: emptyUsage(),
    raw: { skipped: true },
  };
}

function failedJudgeResult(
  descriptor: DriverDescriptor,
  evaluationCase: ModelEvaluationCase,
  error: unknown,
): ModelEvaluationJudgeResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    descriptor,
    judgement: {
      preferred: "inconclusive",
      acceptance: evaluationCase.referenceCriteria.map((condition) => ({
        condition,
        a: "unknown",
        b: "unknown",
        evidence: [],
      })),
      findings: [`comparison judge failed: ${message}`],
      evidence: [],
    },
    usage: emptyUsage(),
    raw: { judgeError: message },
  };
}

function summarizeProfile(profileId: string, trials: ModelEvaluationTrial[]): ModelEvaluationProfileSummary {
  const selected = trials.filter((trial) => trial.profileId === profileId);
  const records = selected.flatMap((trial) => trial.record ? [trial.record] : []);
  const statusCounts: Record<string, number> = {};
  for (const trial of selected) {
    const status = trial.record?.status ?? "runner_error";
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  }
  const durations = records.map(({ durationMs }) => durationMs);
  const totalUsage = records.reduce((sum, record) => addUsage(sum, record.usage), emptyUsage());
  const knownCosts = records.flatMap((record) => record.estimatedCostUsd === undefined ? [] : [record.estimatedCostUsd]);
  return {
    profileId,
    totalTrials: selected.length,
    observedRuns: records.length,
    statusCounts,
    selectedRouteIdentities: [...new Set(records.flatMap(observedSelectedRouteIdentities))],
    durationMs: durations.length === 0 ? null : {
      min: Math.min(...durations),
      mean: mean(durations),
      max: Math.max(...durations),
    },
    usage: {
      total: totalUsage,
      meanPerObservedRun: divideUsage(totalUsage, records.length),
    },
    estimatedCostUsd: {
      knownRuns: knownCosts.length,
      total: knownCosts.reduce((sum, value) => sum + value, 0),
    },
  };
}

function sanitizeRouteTarget(target: ProviderRouteTarget): {
  provider: string;
  model?: string;
  baseURL?: string;
} {
  return {
    provider: target.provider,
    ...(target.model ? { model: target.model } : {}),
    ...(target.baseURL ? { baseURL: target.baseURL } : {}),
  };
}

function observedSelectedRouteIdentities(record: CellRunRecord): string[] {
  const observed: string[] = [];
  for (const event of record.trace) {
    if (!event.data || typeof event.data !== "object") continue;
    const providerMetadata = "providerMetadata" in event.data
      ? event.data.providerMetadata
      : undefined;
    if (!providerMetadata || typeof providerMetadata !== "object") continue;
    const route = "workCellRoute" in providerMetadata
      ? providerMetadata.workCellRoute
      : undefined;
    if (!route || typeof route !== "object") continue;
    const servedBy = "servedBy" in route ? route.servedBy : undefined;
    const model = "model" in route ? route.model : undefined;
    if (typeof servedBy === "string" && typeof model === "string") {
      observed.push(`${record.driver.adapter}/${servedBy}/${model}`);
    }
  }
  return observed;
}

function normalizeCriterion(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function trialStates(trials: ModelEvaluationTrial[]): string[] {
  return trials.map((trial) => trial.record?.status ?? "runner_error");
}

async function copyFixture(
  spec: ModelEvaluationSpec,
  baseDir: string,
  destination: string,
): Promise<void> {
  await cp(absolute(baseDir, spec.fixture.root), destination, { recursive: true, force: true });
  for (const overlay of spec.fixture.overlays) {
    const source = absolute(baseDir, overlay.source);
    const target = absolute(destination, overlay.destination);
    assertContained(destination, target, "fixture overlay destination");
    await mkdir(dirname(target), { recursive: true });
    const sourceInfo = await stat(source);
    if (sourceInfo.isDirectory()) await cp(source, target, { recursive: true, force: true });
    else await cp(source, target, { force: true });
  }
}

function assertContained(base: string, candidate: string, label: string): void {
  const path = relative(resolve(base), resolve(candidate));
  if (path === "" || (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path))) return;
  throw new Error(`${label} escapes its root: ${candidate}`);
}

function absolute(base: string, path: string): string {
  return isAbsolute(path) ? path : resolve(base, path);
}

function safe(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-");
}

function emptyUsage(): CellUsage {
  return UsageSchema.parse({});
}

function addUsage(left: CellUsage, right: CellUsage): CellUsage {
  return {
    inputTokens: left.inputTokens + right.inputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    totalTokens: left.totalTokens + right.totalTokens,
    cachedInputTokens: left.cachedInputTokens + right.cachedInputTokens,
  };
}

function divideUsage(usage: CellUsage, divisor: number): CellUsage {
  if (divisor === 0) return emptyUsage();
  return {
    inputTokens: usage.inputTokens / divisor,
    outputTokens: usage.outputTokens / divisor,
    totalTokens: usage.totalTokens / divisor,
    cachedInputTokens: usage.cachedInputTokens / divisor,
  };
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function addDuplicateIssues(
  ids: string[],
  context: z.RefinementCtx,
  path: Array<string | number>,
): void {
  const seen = new Set<string>();
  for (const [index, id] of ids.entries()) {
    if (seen.has(id)) {
      context.addIssue({ code: "custom", path: [...path, index, "id"], message: `duplicate id: ${id}` });
    }
    seen.add(id);
  }
}

function addDuplicateValueIssues(
  values: string[],
  context: z.RefinementCtx,
  path: Array<string | number>,
  label: string,
): void {
  const seen = new Set<string>();
  for (const [index, value] of values.entries()) {
    if (seen.has(value)) {
      context.addIssue({
        code: "custom",
        path: [...path, index],
        message: `duplicate ${label}: ${value}`,
      });
    }
    seen.add(value);
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
