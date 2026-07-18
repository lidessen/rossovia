import { generateText, Output } from "ai";
import { z } from "zod";
import type { CellUsage, DriverDescriptor } from "../../contracts";
import { normalizeAiSdkUsage as normalizeUsage } from "../../ai-sdk-usage";
import {
  createValidationModel,
  validationModelName,
  validationProviderName,
  type ValidationModelOptions,
} from "../../validation-model";

export const ModelEvaluationJudgementSchema = z.object({
  preferred: z.enum(["A", "B", "tie", "inconclusive"]),
  acceptance: z.array(z.object({
    condition: z.string().min(1),
    a: z.enum(["pass", "fail", "unknown"]),
    b: z.enum(["pass", "fail", "unknown"]),
    evidence: z.array(z.string()),
  }).strict()),
  findings: z.array(z.string()),
  evidence: z.array(z.string()),
}).strict();

export type ModelEvaluationJudgement = z.infer<typeof ModelEvaluationJudgementSchema>;

export interface BlindModelRunEvidence {
  runId: string;
  repetition: number;
  status: string;
  finalText: string;
  output?: unknown;
  artifacts: unknown[];
  verification: unknown;
  workspaceDiff: unknown;
}

export interface BlindModelCandidate {
  label: "A" | "B";
  records: BlindModelRunEvidence[];
}

export interface ModelEvaluationJudgeRequest {
  intent: string;
  referenceCriteria: string[];
  rubric: string;
  failureClasses: Array<{ id: string; description: string }>;
  a: BlindModelCandidate;
  b: BlindModelCandidate;
  signal?: AbortSignal;
}

export interface ModelEvaluationJudgeResult {
  descriptor: DriverDescriptor;
  judgement: ModelEvaluationJudgement;
  usage: CellUsage;
  raw: unknown;
}

export interface ModelEvaluationJudge {
  readonly descriptor: DriverDescriptor;
  judge(request: ModelEvaluationJudgeRequest): Promise<ModelEvaluationJudgeResult>;
}

export class AiSdkModelEvaluationJudge implements ModelEvaluationJudge {
  readonly descriptor: DriverDescriptor;
  private readonly model;

  constructor(options: ValidationModelOptions = {}) {
    const selection = createValidationModel(options);
    this.model = selection.model;
    this.descriptor = {
      adapter: "ai-sdk-v7",
      provider: validationProviderName(selection),
      model: validationModelName(selection),
      ...(selection.pricing ? { pricing: selection.pricing } : {}),
    };
  }

  async judge(request: ModelEvaluationJudgeRequest): Promise<ModelEvaluationJudgeResult> {
    const result = await generateText({
      model: this.model,
      output: Output.object({ schema: ModelEvaluationJudgementSchema }),
      instructions: [
        "You are an independent blind evaluator of two execution profiles across repeated runs of the same real task.",
        "Candidate identity, provider, model, and schedule are hidden. Judge only the retained task evidence against the evaluator-only reference criteria and failure classes.",
        "Prefer a candidate only for a material and repeated difference. Treat within-candidate inconsistency as evidence against a confident preference.",
        "Do not reward verbosity, style, principle vocabulary, or low usage by itself. Return tie when the material result is the same and inconclusive when the evidence cannot support a comparison.",
        "Report every acceptance condition exactly once. Treat the named failure classes only as diagnostic questions; do not classify or count them. Their admission belongs to later evidence review.",
        "Do not broaden a named failure to absorb another defect. A placeholder, refusal, missing answer, or schema-valid non-answer proves only the missing acceptance conditions unless the retained evidence establishes more.",
        "Findings must point to a concrete retained result, artifact, verification observation, or cross-run pattern.",
      ].join("\n"),
      prompt: JSON.stringify({
        intent: request.intent,
        referenceCriteria: request.referenceCriteria,
        rubric: request.rubric,
        failureClasses: request.failureClasses,
        candidateA: request.a,
        candidateB: request.b,
      }, null, 2),
      temperature: 0,
      maxOutputTokens: 4_000,
      ...(request.signal ? { abortSignal: request.signal } : {}),
    });
    if (!result.output) throw new Error("model-evaluation judge returned no structured output");
    const judgement = ModelEvaluationJudgementSchema.parse(result.output);
    assertAcceptanceCoverage(judgement, request.referenceCriteria);
    return {
      descriptor: this.descriptor,
      judgement,
      usage: normalizeUsage(result.totalUsage, result.providerMetadata),
      raw: {
        text: result.text,
        providerMetadata: result.providerMetadata,
        reasoning: result.reasoningText,
      },
    };
  }
}

export function assertAcceptanceCoverage(
  judgement: ModelEvaluationJudgement,
  expected: string[],
): void {
  const actual = judgement.acceptance.map(({ condition }) => condition);
  const normalizedActual = actual.map(normalizeCondition);
  const normalizedExpected = expected.map(normalizeCondition);
  if (new Set(normalizedActual).size !== normalizedActual.length) {
    throw new Error("model-evaluation judge repeated an acceptance condition");
  }
  const missing = expected.filter((condition) => !normalizedActual.includes(normalizeCondition(condition)));
  const unknown = actual.filter((condition) => !normalizedExpected.includes(normalizeCondition(condition)));
  if (missing.length > 0 || unknown.length > 0) {
    throw new Error(
      `model-evaluation judge acceptance mismatch; missing=${missing.join(" | ") || "none"}; unknown=${unknown.join(" | ") || "none"}`,
    );
  }
}

function normalizeCondition(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
