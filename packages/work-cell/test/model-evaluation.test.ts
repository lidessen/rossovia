import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CellInput, CellUsage, DriverDescriptor } from "../src/contracts";
import type { CellDriver, DriverContext, DriverResult } from "../src/driver";
import {
  ModelEvaluationSpecSchema,
  runModelEvaluation,
  type ModelEvaluationProfile,
  type ModelEvaluationSpec,
} from "../src/adapters/model-evaluation/runtime";
import type {
  ModelEvaluationJudge,
  ModelEvaluationJudgeRequest,
  ModelEvaluationJudgeResult,
} from "../src/adapters/model-evaluation/judge";
import { assertAcceptanceCoverage } from "../src/adapters/model-evaluation/judge";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

test("model evaluation keeps repeated profile evidence blind under a balanced isolated schedule", async () => {
  const root = await fixture();
  const spec = evaluationSpec();
  const observedRoots: string[] = [];
  const judge = new CapturingJudge();

  const record = await runModelEvaluation(
    spec,
    root,
    (profile) => new ProfileDriver(profile, observedRoots),
    judge,
    { startingProfileIndex: 0 },
  );

  expect(record.trials).toHaveLength(4);
  expect(record.trials.map(({ repetition, profileId, order }) => ({ repetition, profileId, order }))).toEqual([
    { repetition: 1, profileId: "profile-alpha-secret", order: 1 },
    { repetition: 1, profileId: "profile-beta-secret", order: 2 },
    { repetition: 2, profileId: "profile-beta-secret", order: 1 },
    { repetition: 2, profileId: "profile-alpha-secret", order: 2 },
  ]);
  expect(new Set(observedRoots).size).toBe(4);
  expect(record.trials.every((trial) => trial.record?.status === "passed")).toBe(true);
  expect(record.trials.map((trial) => trial.record?.input.executionProfile?.id)).toEqual([
    "profile-alpha-secret",
    "profile-beta-secret",
    "profile-beta-secret",
    "profile-alpha-secret",
  ]);
  expect(record.trials.every((trial) => (
    trial.record?.input.acceptance[0] === "Investigate the retained source before concluding"
  ))).toBe(true);
  expect(JSON.stringify(record.trials)).not.toContain("The conclusion is grounded in evidence.txt");
  expect(judge.calls).toBe(1);
  expect(judge.serializedRequest).not.toContain("profile-alpha-secret");
  expect(judge.serializedRequest).not.toContain("profile-beta-secret");
  expect(judge.serializedRequest).not.toContain("provider-alpha-secret");
  expect(judge.serializedRequest).not.toContain("provider-beta-secret");
  expect(judge.serializedRequest).not.toContain("model-alpha-secret");
  expect(judge.serializedRequest).not.toContain("model-beta-secret");
  expect(record.comparisons[0]?.result.judgement.preferred).not.toBe("inconclusive");
  expect(record.profileSummaries).toEqual([
    expect.objectContaining({
      profileId: "profile-alpha-secret",
      totalTrials: 2,
      observedRuns: 2,
      statusCounts: { passed: 2 },
      selectedRouteIdentities: ["scripted/served-alpha/actual-alpha"],
    }),
    expect.objectContaining({
      profileId: "profile-beta-secret",
      totalTrials: 2,
      observedRuns: 2,
      statusCounts: { passed: 2 },
      selectedRouteIdentities: ["scripted/served-beta/actual-beta"],
    }),
  ]);
  expect(JSON.parse(await readFile(record.recordPath, "utf8"))).toMatchObject({
    version: "work-cell.model-evaluation.run.v2",
    authority: "candidate evidence; human or designated host acceptance required",
    profiles: [
      expect.objectContaining({
        declaredInferencePolicy: "thinking=disabled; temperature=0; transport=generateText",
      }),
      expect.objectContaining({
        declaredInferencePolicy: "thinking=enabled; temperature=1; transport=generateText",
      }),
    ],
    cases: [expect.objectContaining({
      workerAcceptance: ["Investigate the retained source before concluding"],
      referenceCriteria: ["The conclusion is grounded in evidence.txt"],
    })],
  });
  expect(judge.serializedRequest).toContain("The conclusion is grounded in evidence.txt");
  expect(judge.serializedRequest).not.toContain("Investigate the retained source before concluding");
});

test("model evaluation rejects reference criteria leaked into worker-visible acceptance", () => {
  const base = evaluationSpec();
  expect(() => ModelEvaluationSpecSchema.parse({
    ...base,
    cases: [{
      ...base.cases[0],
      task: {
        ...base.cases[0]!.task,
        acceptance: ["  THE conclusion is grounded in evidence.txt  "],
      },
    }],
  })).toThrow("reference criteria must remain evaluator-only");
});

test("model evaluation judge tolerates formatting variation but rejects semantic criterion drift", () => {
  const judgement = {
    preferred: "tie" as const,
    acceptance: [{
      condition: "  THE conclusion   is grounded in EVIDENCE.txt  ",
      a: "pass" as const,
      b: "pass" as const,
      evidence: [],
    }],
    findings: [],
    evidence: [],
  };

  expect(() => assertAcceptanceCoverage(
    judgement,
    ["The conclusion is grounded in evidence.txt"],
  )).not.toThrow();
  expect(() => assertAcceptanceCoverage(
    judgement,
    ["The conclusion contradicts evidence.txt"],
  )).toThrow("acceptance mismatch");
});

test("model evaluation does not project a driver declaration as selected route evidence", async () => {
  const root = await fixture();
  const record = await runModelEvaluation(
    evaluationSpec(),
    root,
    (profile) => new ProfileDriver(profile, [], false),
    new CapturingJudge(),
    { startingProfileIndex: 0 },
  );

  expect(record.profileSummaries.map(({ selectedRouteIdentities }) => selectedRouteIdentities)).toEqual([
    [],
    [],
  ]);
});

test("model evaluation retains runner failures and skips semantic comparison", async () => {
  const root = await fixture();
  const spec = evaluationSpec();
  const judge = new CapturingJudge();

  const record = await runModelEvaluation(
    spec,
    root,
    (profile) => {
      if (profile.id === "profile-beta-secret") throw new Error("profile unavailable before execution");
      return new ProfileDriver(profile, []);
    },
    judge,
    { startingProfileIndex: 0 },
  );

  expect(judge.calls).toBe(0);
  expect(record.trials.filter(({ runnerError }) => runnerError)).toHaveLength(2);
  expect(record.profileSummaries[1]).toMatchObject({
    profileId: "profile-beta-secret",
    statusCounts: { runner_error: 2 },
    observedRuns: 0,
  });
  expect(record.comparisons[0]?.result).toMatchObject({
    judgement: { preferred: "inconclusive" },
    raw: { skipped: true },
  });
});

test("model evaluation retains judge failure after all trials settle", async () => {
  const root = await fixture();
  const spec = evaluationSpec();
  const judge: ModelEvaluationJudge = {
    descriptor: { adapter: "scripted-judge", provider: "judge", model: "failing" },
    async judge() {
      throw new Error("judge route unavailable");
    },
  };

  const record = await runModelEvaluation(
    spec,
    root,
    (profile) => new ProfileDriver(profile, []),
    judge,
    { startingProfileIndex: 0 },
  );

  expect(record.trials.every((trial) => trial.record?.status === "passed")).toBe(true);
  expect(record.comparisons[0]?.result).toMatchObject({
    judgement: { preferred: "inconclusive" },
    raw: { judgeError: "judge route unavailable" },
  });
  expect(JSON.parse(await readFile(record.recordPath, "utf8"))).toMatchObject({
    comparisons: [{ result: { raw: { judgeError: "judge route unavailable" } } }],
  });
});

test("model evaluation rejects fixture overlays that escape the frozen snapshot", async () => {
  const root = await fixture();
  const spec = ModelEvaluationSpecSchema.parse({
    ...evaluationSpec(),
    fixture: {
      root: "fixture",
      overlays: [{ source: "fixture/evidence.txt", destination: "../escaped.txt" }],
    },
  });

  await expect(runModelEvaluation(
    spec,
    root,
    (profile) => new ProfileDriver(profile, []),
    new CapturingJudge(),
    { startingProfileIndex: 0 },
  )).rejects.toThrow("fixture overlay destination escapes its root");
});

class ProfileDriver implements CellDriver {
  readonly descriptor: DriverDescriptor;

  constructor(
    private readonly profile: ModelEvaluationProfile,
    private readonly observedRoots: string[],
    private readonly emitRouteEvidence = true,
  ) {
    const suffix = profile.id.includes("alpha") ? "alpha-secret" : "beta-secret";
    this.descriptor = {
      adapter: "scripted",
      provider: `provider-${suffix}`,
      model: `model-${suffix}`,
    };
  }

  async run(_input: CellInput, context: DriverContext): Promise<DriverResult> {
    this.observedRoots.push(context.workspace.root);
    const evidence = await context.workspace.readText("evidence.txt");
    const stronger = this.profile.id.includes("alpha");
    if (this.emitRouteEvidence) {
      context.emit("agent.step.finished", {
        providerMetadata: {
          workCellRoute: {
            servedBy: stronger ? "served-alpha" : "served-beta",
            model: stronger ? "actual-alpha" : "actual-beta",
          },
        },
      });
    }
    return {
      terminalToolsCalled: [],
      finalText: stronger
        ? `The retained source supports the bounded conclusion: ${evidence.trim()}`
        : "A plausible conclusion without source support.",
      usage: stronger ? usage(12, 4) : usage(10, 3),
      rawSteps: [],
    };
  }
}

class CapturingJudge implements ModelEvaluationJudge {
  readonly descriptor = { adapter: "scripted-judge", provider: "judge", model: "deterministic" };
  calls = 0;
  serializedRequest = "";

  async judge(request: ModelEvaluationJudgeRequest): Promise<ModelEvaluationJudgeResult> {
    this.calls += 1;
    this.serializedRequest = JSON.stringify(request);
    const aGrounded = request.a.records.every(({ finalText }) => finalText.includes("retained source"));
    const preferred = aGrounded ? "A" : "B";
    return {
      descriptor: this.descriptor,
      judgement: {
        preferred,
      acceptance: request.referenceCriteria.map((condition) => ({
          condition,
          a: aGrounded ? "pass" : "fail",
          b: aGrounded ? "fail" : "pass",
          evidence: ["Only one candidate cites the retained source across both repetitions."],
        })),
        findings: ["The material difference repeats."],
        evidence: ["Two matched repetitions per candidate."],
      },
      usage: usage(5, 2),
      raw: {},
    };
  }
}

function evaluationSpec(): ModelEvaluationSpec {
  return ModelEvaluationSpecSchema.parse({
    version: "work-cell.model-evaluation.v2",
    id: "capability-seed",
    fixture: { root: "fixture", overlays: [] },
    outputDir: "results",
    profiles: [
      {
        id: "profile-alpha-secret",
        route: [{
          provider: "opencode-go",
          credential: { source: "env", name: "ALPHA_KEY" },
          model: "alpha",
        }],
        contextPolicy: "fixture-only-v1",
        toolSurface: "read-only-v1",
        declaredInferencePolicy: "thinking=disabled; temperature=0; transport=generateText",
      },
      {
        id: "profile-beta-secret",
        route: [{
          provider: "kimi-coding",
          credential: { source: "env", name: "BETA_KEY" },
          model: "beta",
        }],
        contextPolicy: "fixture-only-v1",
        toolSurface: "read-only-v1",
        declaredInferencePolicy: "thinking=enabled; temperature=1; transport=generateText",
      },
    ],
    repetitions: 2,
    cases: [{
      id: "source-boundary",
      dimension: "evidence-grounded repository reasoning",
      task: {
        intent: "Decide what the retained source supports.",
        workspace: { readPaths: ["evidence.txt"], writePaths: [], excludePaths: [], allowedCommands: [] },
        instructions: ["Read the supplied evidence and return the smallest supported conclusion."],
        capabilities: ["read"],
        context: [],
        capabilitiesRequired: ["read"],
        acceptance: ["Investigate the retained source before concluding"],
        budget: {
          maxSteps: 2,
          estimatedTokens: 500,
          estimatedTokensTolerance: 1,
          maxDurationMs: 5_000,
          maxCommandOutputBytes: 2_000,
        },
      },
      referenceCriteria: ["The conclusion is grounded in evidence.txt"],
      rubric: "Prefer repeated source-grounded judgment over a plausible unsupported conclusion.",
      failureClasses: [{
        id: "unsupported-conclusion",
        description: "Returns a material conclusion without using the retained source.",
      }],
    }],
    judge: {
      route: [{
        provider: "deepseek",
        credential: { source: "env", name: "JUDGE_KEY" },
        model: "judge",
      }],
    },
  });
}

function usage(inputTokens: number, outputTokens: number): CellUsage {
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    cachedInputTokens: 0,
  };
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "model-evaluation-test-"));
  roots.push(root);
  await mkdir(join(root, "fixture"), { recursive: true });
  await writeFile(join(root, "fixture", "evidence.txt"), "The accepted boundary is source-linked evidence.\n");
  return root;
}
