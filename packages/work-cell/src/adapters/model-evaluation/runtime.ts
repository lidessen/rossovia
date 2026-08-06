import { createHash, randomInt } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, readdir, readlink, stat, writeFile } from "node:fs/promises";
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
import { DeepSeekInferencePolicySchema } from "../../providers/deepseek";
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
  instructionCarrier: z.object({
    id: z.string().min(1),
    instructions: z.array(z.string().min(1)).min(1),
  }).strict().optional(),
  adapterPolicy: z.object({
    deepseek: DeepSeekInferencePolicySchema,
  }).strict().optional(),
  priceRevision: z.string().min(1).optional(),
}).strict().superRefine((value, context) => {
  if (
    value.adapterPolicy?.deepseek
    && value.route.some((target) => target.provider !== "deepseek")
  ) {
    context.addIssue({
      code: "custom",
      path: ["adapterPolicy", "deepseek"],
      message: "DeepSeek inference policy requires an all-DeepSeek route",
    });
  }
});

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

const ModelEvaluationComparisonSchema = z.discriminatedUnion("axis", [
  z.object({ axis: z.literal("execution-profile") }).strict(),
  z.object({
    axis: z.literal("instruction-carrier"),
    executionProfileId: z.string().min(1),
    semanticAtomSetId: z.string().min(1),
    semanticAuditSha256: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict(),
]);

const ModelEvaluationV3SpecSchema = z.object({
  version: z.literal("work-cell.model-evaluation.v3"),
  id: z.string().min(1),
  evidenceRole: z.enum(["development", "confirmation"]).default("development"),
  comparison: ModelEvaluationComparisonSchema.default({ axis: "execution-profile" }),
  fixture: z.object({
    root: z.string().min(1),
    expectedSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
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
  if (value.comparison.axis === "execution-profile") {
    for (const [index, profile] of value.profiles.entries()) {
      if (profile.instructionCarrier !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["profiles", index, "instructionCarrier"],
          message: "instructionCarrier requires comparison.axis=instruction-carrier",
        });
      }
    }
    return;
  }

  for (const [index, profile] of value.profiles.entries()) {
    if (profile.instructionCarrier === undefined) {
      context.addIssue({
        code: "custom",
        path: ["profiles", index, "instructionCarrier"],
        message: "instruction-carrier comparison requires one explicit carrier per profile",
      });
    }
  }
  if (value.fixture.expectedSha256 === undefined) {
    context.addIssue({
      code: "custom",
      path: ["fixture", "expectedSha256"],
      message: "instruction-carrier comparison requires a pinned fixture digest",
    });
  }
  const [left, right] = value.profiles;
  if (left && right && executionMemberIdentity(left) !== executionMemberIdentity(right)) {
    context.addIssue({
      code: "custom",
      path: ["profiles"],
      message: "instruction-carrier comparison requires identical execution members",
    });
  }
  if (left?.instructionCarrier?.id === right?.instructionCarrier?.id) {
    context.addIssue({
      code: "custom",
      path: ["profiles"],
      message: "instruction-carrier comparison requires distinct carrier ids",
    });
  }
  if (
    left?.instructionCarrier
    && right?.instructionCarrier
    && instructionCarrierSha256(left.instructionCarrier.instructions)
      === instructionCarrierSha256(right.instructionCarrier.instructions)
  ) {
    context.addIssue({
      code: "custom",
      path: ["profiles"],
      message: "instruction-carrier comparison requires distinct carriers",
    });
  }
  for (const [profileIndex, profile] of value.profiles.entries()) {
    for (const [instructionIndex, instruction] of (profile.instructionCarrier?.instructions ?? []).entries()) {
      const normalizedInstruction = normalizeCriterion(instruction);
      for (const evaluationCase of value.cases) {
        if (evaluationCase.referenceCriteria.some(
          (criterion) => normalizeCriterion(criterion) === normalizedInstruction,
        )) {
          context.addIssue({
            code: "custom",
            path: ["profiles", profileIndex, "instructionCarrier", "instructions", instructionIndex],
            message: "reference criteria must remain evaluator-only; do not duplicate them in a carrier",
          });
        }
      }
    }
  }
});

export const ModelEvaluationSpecSchema = z.preprocess(
  migrateLegacyModelEvaluationSpec,
  ModelEvaluationV3SpecSchema,
);

export type ModelEvaluationSpec = z.infer<typeof ModelEvaluationSpecSchema>;

export interface ModelEvaluationTrial {
  caseId: string;
  profileId: string;
  repetition: number;
  order: number;
  directory: string;
  fixtureSha256?: string;
  record?: CellRunRecord;
  runnerError?: string;
}

export interface ModelEvaluationProfileSummary {
  profileId: string;
  totalTrials: number;
  observedRuns: number;
  statusCounts: Record<string, number>;
  selectedRouteIdentities: string[];
  backendFingerprints: string[];
  durationMs: { min: number; mean: number; max: number } | null;
  usage: { total: CellUsage; meanPerObservedRun: CellUsage };
  estimatedCostUsd: { knownRuns: number; total: number };
}

export interface ModelEvaluationComparison {
  caseId: string;
  blindMap: Record<"A" | "B", string>;
  executionIdentity: {
    status: "matched" | "unavailable" | "mismatch";
    observations: string[];
  };
  result: ModelEvaluationJudgeResult;
}

export interface ModelEvaluationRecord {
  version: "work-cell.model-evaluation.run.v3";
  id: string;
  sourceSha256?: string;
  evidenceRole: "development" | "confirmation";
  startedAt: string;
  finishedAt: string;
  directory: string;
  fixtureSnapshot: string;
  fixtureSha256: string;
  expectedFixtureSha256?: string;
  comparison:
    | { axis: "execution-profile" }
    | {
        axis: "instruction-carrier";
        executionProfileId: string;
        semanticAtomSetId: string;
        semanticAuditSha256: string;
      };
  profiles: Array<{
    id: string;
    declaredRoute: Array<{ provider: string; model?: string; baseURL?: string }>;
    contextPolicy: string;
    toolSurface: string;
    declaredInferencePolicy: string;
    instructionCarrier?: {
      id: string;
      instructionsSha256: string;
      instructionCount: number;
    };
    adapterPolicy?: { deepseek: z.infer<typeof DeepSeekInferencePolicySchema> };
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
  const fixtureSha256 = await modelEvaluationFixtureSha256(fixtureSnapshot);
  if (spec.fixture.expectedSha256 && fixtureSha256 !== spec.fixture.expectedSha256) {
    throw new Error(
      `fixture digest mismatch: expected ${spec.fixture.expectedSha256}, observed ${fixtureSha256}`,
    );
  }
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
          trial.fixtureSha256 = await modelEvaluationFixtureSha256(workspaceRoot);
          if (trial.fixtureSha256 !== fixtureSha256) {
            throw new Error("trial fixture differs from the frozen evaluation snapshot");
          }
          const driver = createDriver(driverProfile(profile, spec.comparison));
          const input = materializeInput(
            evaluationCase,
            profile,
            spec.comparison,
            driver.descriptor,
            workspaceRoot,
            repetition,
          );
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
    const executionIdentity = compareExecutionIdentity(spec.comparison, a.trials, b.trials);
    const valid = [...a.trials, ...b.trials].every(
      (trial) => trial.record?.status === "passed",
    ) && executionIdentity.status !== "mismatch";
    let result: ModelEvaluationJudgeResult;
    if (!valid) {
      result = skippedJudgeResult(
        judge.descriptor,
        evaluationCase,
        a.trials,
        b.trials,
        executionIdentity.status === "mismatch" ? executionIdentity.observations : undefined,
      );
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
    comparisons.push({ caseId: evaluationCase.id, blindMap, executionIdentity, result });
  }

  const recordPath = join(directory, "evaluation.json");
  const record: ModelEvaluationRecord = {
    version: "work-cell.model-evaluation.run.v3",
    id: spec.id,
    ...(options.sourceSha256 ? { sourceSha256: options.sourceSha256 } : {}),
    evidenceRole: spec.evidenceRole,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    directory,
    fixtureSnapshot,
    fixtureSha256,
    ...(spec.fixture.expectedSha256
      ? { expectedFixtureSha256: spec.fixture.expectedSha256 }
      : {}),
    comparison: spec.comparison,
    profiles: spec.profiles.map((profile) => ({
      id: profile.id,
      declaredRoute: profile.route.map(sanitizeRouteTarget),
      contextPolicy: profile.contextPolicy,
      toolSurface: profile.toolSurface,
      declaredInferencePolicy: profile.declaredInferencePolicy,
      ...(profile.instructionCarrier ? {
        instructionCarrier: {
          id: profile.instructionCarrier.id,
          instructionsSha256: instructionCarrierSha256(profile.instructionCarrier.instructions),
          instructionCount: profile.instructionCarrier.instructions.length,
        },
      } : {}),
      ...(profile.adapterPolicy ? { adapterPolicy: profile.adapterPolicy } : {}),
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
  comparison: z.infer<typeof ModelEvaluationComparisonSchema>,
  descriptor: DriverDescriptor,
  workspaceRoot: string,
  repetition: number,
): CellInput {
  return CellInputSchema.parse({
    ...evaluationCase.task,
    id: comparison.axis === "instruction-carrier"
      ? `${evaluationCase.id}-r${repetition + 1}`
      : `${evaluationCase.id}-${profile.id}-r${repetition + 1}`,
    workspace: { ...evaluationCase.task.workspace, root: workspaceRoot },
    instructions: comparison.axis === "instruction-carrier"
      ? [
          ...(profile.instructionCarrier?.instructions ?? []),
          ...evaluationCase.task.instructions,
        ]
      : evaluationCase.task.instructions,
    executionProfile: {
      id: comparison.axis === "instruction-carrier"
        ? comparison.executionProfileId
        : profile.id,
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

function executionMemberIdentity(profile: ModelEvaluationProfile): string {
  return JSON.stringify({
    route: profile.route,
    contextPolicy: profile.contextPolicy,
    toolSurface: profile.toolSurface,
    declaredInferencePolicy: profile.declaredInferencePolicy,
    adapterPolicy: profile.adapterPolicy,
    priceRevision: profile.priceRevision,
  });
}

function driverProfile(
  profile: ModelEvaluationProfile,
  comparison: z.infer<typeof ModelEvaluationComparisonSchema>,
): ModelEvaluationProfile {
  if (comparison.axis === "execution-profile") return profile;
  const { instructionCarrier: _instructionCarrier, ...executionMember } = profile;
  return {
    ...executionMember,
    id: comparison.executionProfileId,
  };
}

function instructionCarrierSha256(instructions: string[]): string {
  return createHash("sha256").update(JSON.stringify(instructions)).digest("hex");
}

function compareExecutionIdentity(
  comparison: z.infer<typeof ModelEvaluationComparisonSchema>,
  left: ModelEvaluationTrial[],
  right: ModelEvaluationTrial[],
): ModelEvaluationComparison["executionIdentity"] {
  if (comparison.axis === "execution-profile") {
    return {
      status: "unavailable",
      observations: ["execution-profile comparison intentionally permits different execution identities"],
    };
  }

  const observations: string[] = [];
  let observedBackendIdentity = false;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const leftRecord = left[index]?.record;
    const rightRecord = right[index]?.record;
    if (!leftRecord || !rightRecord) continue;
    if (JSON.stringify(leftRecord.driver) !== JSON.stringify(rightRecord.driver)) {
      observations.push(`repetition ${index + 1}: driver descriptor mismatch`);
    }
    compareObservedSet(
      "selected route",
      observedSelectedRouteIdentities(leftRecord),
      observedSelectedRouteIdentities(rightRecord),
      index + 1,
    );
    compareObservedSet(
      "backend fingerprint",
      observedBackendFingerprints(leftRecord),
      observedBackendFingerprints(rightRecord),
      index + 1,
    );
  }
  if (observations.length > 0) return { status: "mismatch", observations };
  return observedBackendIdentity
    ? { status: "matched", observations: ["all exposed execution identities matched within each repetition"] }
    : {
        status: "unavailable",
        observations: ["driver descriptors matched; provider-returned route and backend identity were unavailable"],
      };

  function compareObservedSet(
    label: string,
    leftValues: string[],
    rightValues: string[],
    repetition: number,
  ): void {
    const normalizedLeft = [...new Set(leftValues)].sort();
    const normalizedRight = [...new Set(rightValues)].sort();
    if (normalizedLeft.length > 0 || normalizedRight.length > 0) observedBackendIdentity = true;
    if (JSON.stringify(normalizedLeft) !== JSON.stringify(normalizedRight)) {
      observations.push(`repetition ${repetition}: ${label} mismatch`);
    }
  }
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
  invalidReasons?: string[],
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
      invalidReasons?.length
        ? `comparison skipped because matched execution identity failed: ${invalidReasons.join("; ")}`
        : `comparison skipped because one or more trials were unsettled; A=${trialStates(a).join(",")}; B=${trialStates(b).join(",")}`,
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
    backendFingerprints: [...new Set(records.flatMap(observedBackendFingerprints))],
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

function observedBackendFingerprints(record: CellRunRecord): string[] {
  const observed: string[] = [];
  for (const event of record.trace) {
    const data = event.data;
    if (!data || typeof data !== "object") continue;
    const providerMetadata = "providerMetadata" in data
      ? data.providerMetadata
      : undefined;
    if (!providerMetadata || typeof providerMetadata !== "object") continue;
    const deepseek = "deepseek" in providerMetadata
      ? providerMetadata.deepseek
      : undefined;
    if (!deepseek || typeof deepseek !== "object") continue;
    const fingerprint = "systemFingerprint" in deepseek
      ? deepseek.systemFingerprint
      : undefined;
    if (typeof fingerprint === "string" && fingerprint.trim()) {
      observed.push(fingerprint);
    }
  }
  return observed;
}

function normalizeCriterion(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function migrateLegacyModelEvaluationSpec(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== "work-cell.model-evaluation.v2") return value;
  if ("comparison" in candidate) return value;
  return {
    ...candidate,
    version: "work-cell.model-evaluation.v3",
    comparison: { axis: "execution-profile" },
  };
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

export async function modelEvaluationFixtureSha256(root: string): Promise<string> {
  const hash = createHash("sha256");
  await visit(root, "");
  return hash.digest("hex");

  async function visit(directory: string, relativeDirectory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relativePath = relativeDirectory ? join(relativeDirectory, entry.name) : entry.name;
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        hash.update(`directory\0${relativePath}\0`);
        await visit(absolutePath, relativePath);
      } else if (entry.isSymbolicLink()) {
        hash.update(`symlink\0${relativePath}\0${await readlink(absolutePath)}\0`);
      } else if (entry.isFile()) {
        hash.update(`file\0${relativePath}\0`);
        hash.update(await readFile(absolutePath));
        hash.update("\0");
      } else {
        hash.update(`other\0${relativePath}\0`);
      }
    }
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
