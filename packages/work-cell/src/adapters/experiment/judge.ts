import { generateText, Output } from "ai";
import { z } from "zod";
import type { CellUsage } from "../../contracts";
import { normalizeAiSdkUsage as normalizeUsage } from "../../ai-sdk-usage";
import { createValidationModel, type ValidationModelOptions } from "../../validation-model";

export const BlindJudgementSchema = z.object({
  preferred: z.enum(["A", "B", "tie", "inconclusive"]),
  acceptance: z.array(
    z.object({
      condition: z.string(),
      a: z.enum(["pass", "fail", "unknown"]),
      b: z.enum(["pass", "fail", "unknown"]),
      evidence: z.array(z.string()),
    }),
  ),
  findings: z.array(z.string()),
  evidence: z.array(z.string()),
});

export type BlindJudgement = z.infer<typeof BlindJudgementSchema>;

export interface JudgeCandidate {
  label: "A" | "B";
  records: BlindRunEvidence[];
  diffs: Record<string, string>;
}

export interface BlindRunEvidence {
  runId: string;
  cellId: string;
  status: string;
  preparation?: unknown;
  finalText: string;
  output?: unknown;
  artifacts: unknown[];
  verification: unknown;
  workspaceDiff: unknown;
  usage: CellUsage;
  trace: unknown[];
  error?: string;
}

export interface ComparisonJudgeRequest {
  intent: string;
  acceptance: string[];
  rubric: string;
  a: JudgeCandidate;
  b: JudgeCandidate;
  signal?: AbortSignal;
}

export interface ComparisonJudgeResult {
  judgement: BlindJudgement;
  usage: CellUsage;
  raw: unknown;
}

export interface ComparisonJudge {
  judge(request: ComparisonJudgeRequest): Promise<ComparisonJudgeResult>;
}

export class AiSdkValidationJudge implements ComparisonJudge {
  private readonly model;

  constructor(options: ValidationModelOptions = {}) {
    this.model = createValidationModel(options).model;
  }

  async judge(request: ComparisonJudgeRequest): Promise<ComparisonJudgeResult> {
    const result = await generateText({
      model: this.model,
      output: Output.object({ schema: BlindJudgementSchema }),
      instructions: [
        "You are an independent blind evaluator of two Work Cell executions.",
        "You do not know which candidate is baseline or treatment. Judge only retained evidence against the same acceptance conditions.",
        "Prefer a candidate only for a material decision or artifact improvement. If both make the same material decision, return tie. If evidence is insufficient, return inconclusive.",
        "Do not reward verbosity, mention of principles, or a plausible summary without file and check evidence.",
      ].join("\n"),
      prompt: JSON.stringify(
        {
          intent: request.intent,
          acceptance: request.acceptance,
          rubric: request.rubric,
          candidateA: request.a,
          candidateB: request.b,
        },
        null,
        2,
      ),
      temperature: 0,
      maxOutputTokens: 4_000,
      ...(request.signal ? { abortSignal: request.signal } : {}),
    });
    if (!result.output) throw new Error("judge returned no structured output");
    return {
      judgement: BlindJudgementSchema.parse(result.output),
      usage: normalizeUsage(result.totalUsage, result.providerMetadata),
      raw: {
        text: result.text,
        providerMetadata: result.providerMetadata,
        reasoning: result.reasoningText,
      },
    };
  }
}
