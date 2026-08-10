import { generateText, Output, tool } from "ai";
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
  private readonly structuredOutputMode: "inline" | "tool-settlement";

  constructor(options: ValidationModelOptions = {}) {
    const selection = createValidationModel(options);
    this.model = selection.model;
    this.structuredOutputMode = selection.structuredOutputMode;
    this.descriptor = {
      adapter: "ai-sdk-v7",
      provider: validationProviderName(selection),
      model: validationModelName(selection),
      ...(selection.pricing ? { pricing: selection.pricing } : {}),
    };
  }

  async judge(request: ModelEvaluationJudgeRequest): Promise<ModelEvaluationJudgeResult> {
    if (this.structuredOutputMode === "tool-settlement") {
      return this.judgeWithSettlementTool(request);
    }
    const result = await generateText({
      model: this.model,
      output: Output.object({ schema: ModelEvaluationJudgementSchema }),
      instructions: judgeInstructions("inline"),
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

  private async judgeWithSettlementTool(
    request: ModelEvaluationJudgeRequest,
  ): Promise<ModelEvaluationJudgeResult> {
    let judgement: ModelEvaluationJudgement | undefined;
    let usage = emptyUsage();
    const attempts: unknown[] = [];
    const prompt = JSON.stringify({
      intent: request.intent,
      referenceCriteria: request.referenceCriteria,
      rubric: request.rubric,
      failureClasses: request.failureClasses,
      candidateA: request.a,
      candidateB: request.b,
    }, null, 2);

    for (let attempt = 1; attempt <= 2 && !judgement; attempt += 1) {
      const result = await generateText({
        model: this.model,
        tools: {
          submit_judgement: tool({
            description: "Submit the complete blind comparison exactly once.",
            inputSchema: ModelEvaluationJudgementSchema,
            execute: async (value) => {
              judgement = ModelEvaluationJudgementSchema.parse(value);
              return { accepted: true };
            },
          }),
        },
        toolChoice: { type: "tool", toolName: "submit_judgement" },
        instructions: judgeInstructions("tool-settlement", attempt === 2),
        prompt,
        temperature: 0,
        maxOutputTokens: 4_000,
        ...(request.signal ? { abortSignal: request.signal } : {}),
      });
      usage = addUsage(usage, normalizeUsage(result.totalUsage, result.providerMetadata));
      attempts.push({
        attempt,
        text: result.text,
        reasoning: result.reasoningText,
        providerMetadata: result.providerMetadata,
        toolCalls: result.toolCalls.map(({ toolCallId, toolName, input }) => ({
          toolCallId,
          toolName,
          input,
        })),
      });
    }

    if (!judgement) {
      const judgeError = "model-evaluation judge did not call submit_judgement after one recovery";
      return {
        descriptor: this.descriptor,
        judgement: {
          preferred: "inconclusive",
          acceptance: request.referenceCriteria.map((condition) => ({
            condition,
            a: "unknown",
            b: "unknown",
            evidence: [],
          })),
          findings: [`comparison judge failed: ${judgeError}`],
          evidence: [],
        },
        usage,
        raw: { judgeError, attempts },
      };
    }
    assertAcceptanceCoverage(judgement, request.referenceCriteria);
    return {
      descriptor: this.descriptor,
      judgement,
      usage,
      raw: { attempts },
    };
  }
}

function judgeInstructions(
  mode: "inline" | "tool-settlement",
  recovering = false,
): string {
  return [
    "You are an independent blind evaluator of two candidates across repeated runs of the same real task.",
    "Candidate identity, provider, model, and schedule are hidden. Judge only the retained task evidence against the evaluator-only reference criteria and failure classes.",
    "Prefer a candidate only for a material and repeated difference. Treat within-candidate inconsistency as evidence against a confident preference.",
    "Do not reward verbosity, style, principle vocabulary, or low usage by itself. Return tie when the material result is the same and inconclusive when the evidence cannot support a comparison.",
    "Report every acceptance condition exactly once. Treat the named failure classes only as diagnostic questions; do not classify or count them. Their admission belongs to later evidence review.",
    "Do not broaden a named failure to absorb another defect. A placeholder, refusal, missing answer, or schema-valid non-answer proves only the missing acceptance conditions unless the retained evidence establishes more.",
    "Findings must point to a concrete retained result, artifact, verification observation, or cross-run pattern.",
    ...(mode === "tool-settlement" ? [
      "Finish only by calling submit_judgement with the complete comparison. Do not return prose outside the tool call.",
    ] : []),
    ...(mode === "tool-settlement" && recovering ? [
      "A prior attempt ended without a valid settlement call. Call submit_judgement exactly once now; do not continue analysis or return prose.",
    ] : []),
  ].join("\n");
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
