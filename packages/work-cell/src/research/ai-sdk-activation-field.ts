import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import { z } from "zod";
import type { CellUsage } from "../contracts";
import { normalizeAiSdkUsage as normalizeUsage } from "../ai-sdk-usage";
import {
  createValidationModel,
  validationModelName,
  validationProviderName,
  type ValidationModelOptions,
} from "../validation-model";
import {
  ActivationDraftSchema,
  ActivationFieldDriverError,
  CoalitionDraftSchema,
  FieldExpressionSchema,
  type ActivationFieldDriver,
  type ActivationRequest,
  type ExpressionRequest,
  type FieldDriverResult,
  type FieldExpression,
  type IntegrationRequest,
  type ActivationDraft,
  type CoalitionDraft,
  renderCognitiveShape,
} from "./activation-field";

export interface AiSdkActivationFieldOptions extends ValidationModelOptions {}

const DirectBaselineSchema = z.object({ response: z.string().min(1) });

export class AiSdkActivationFieldDriver implements ActivationFieldDriver {
  readonly descriptor;
  private readonly model;

  constructor(options: AiSdkActivationFieldOptions = {}) {
    const selection = createValidationModel(options);
    this.model = selection.model;
    this.descriptor = {
      provider: validationProviderName(selection),
      model: validationModelName(selection),
    };
  }

  async activate(
    request: ActivationRequest,
    signal?: AbortSignal,
  ): Promise<FieldDriverResult<ActivationDraft>> {
    return runStructured(() => generateText({
      model: this.model,
      instructions: [
        "You are one brief activation in a larger cognitive field, not an agent, reviewer, or final answer writer.",
        "Return one local impulse that this receptor genuinely detects. Do not summarize the task, recommend a complete solution, rank alternatives, or infer consensus.",
        "Do not coin or propose a project name. Describe the local image or relation in ordinary language so that any eventual name must arise later from interaction.",
        "Make the relation concrete enough that a later process can combine or disconfirm it.",
        "## Local cognitive role prompt",
        request.receptor.instructions,
        "This is a deliberately partial attention shape. Do not compensate for its omissions or turn it into a balanced complete persona.",
      ].join("\n"),
      prompt: [
        "## Immutable shared snapshot",
        request.snapshot,
        "## Stimulus",
        request.stimulus,
        "## Local receptor",
        `ID: ${request.receptor.id}`,
        `Principle loci: ${request.receptor.principlePids.join(", ") || "none"}`,
        `Independent sample: ${request.sample}`,
        "Produce only this receptor's local activation.",
      ].join("\n\n"),
      output: Output.object({ schema: ActivationDraftSchema }),
      maxOutputTokens: 500,
      temperature: request.receptor.temperature ?? 1.15,
      topP: 0.95,
      ...(signal ? { abortSignal: signal } : {}),
    }));
  }

  async integrate(
    request: IntegrationRequest,
    signal?: AbortSignal,
  ): Promise<FieldDriverResult<CoalitionDraft>> {
    return runStructured(() => generateText({
      model: this.model,
      instructions: [
        "You form one temporary local coalition from a sparse neighborhood of field nodes.",
        "Select at least two listed node IDs whose interaction yields a relation not fully stated by either node alone.",
        "Preserve a real tension when present. Do not coin a candidate name or slogan, vote, choose a winner, write the final answer, or cite an ID outside this neighborhood.",
        ...(request.shape ? [
          "## Local inherited cognitive shape",
          renderCognitiveShape(request.shape),
          "Let this partial shape determine what the coalition notices. It is selective attention, not a conclusion; do not repair it into a balanced full-agent view.",
        ] : []),
      ].join("\n"),
      prompt: [
        "## Immutable task snapshot",
        request.snapshot,
        "## Stimulus",
        request.stimulus,
        `## Layer ${request.layer} local neighborhood`,
        JSON.stringify(request.nodes.map((node) => ({
          id: node.id,
          content: node.content,
          predictedConsequence: node.predictedConsequence,
        }))),
        "Form one traceable coalition. Parent IDs must come from the supplied neighborhood.",
      ].join("\n\n"),
      output: Output.object({ schema: CoalitionDraftSchema }),
      maxOutputTokens: 700,
      temperature: 0.7,
      topP: 0.9,
      ...(signal ? { abortSignal: signal } : {}),
    }));
  }

  async express(
    request: ExpressionRequest,
    signal?: AbortSignal,
  ): Promise<FieldDriverResult<FieldExpression>> {
    return runStructured(() => generateText({
      model: this.model,
      instructions: [
        "You are the language projection of a completed activation field.",
        "Compose one useful response from the supplied working-set nodes. You may order and articulate them, but may not claim an unsupported source or hide an unresolved tension.",
        "An emergent relation must cite at least two supplied node IDs and must not be a mere restatement of one node.",
      ].join("\n"),
      prompt: [
        "## Immutable task snapshot",
        request.snapshot,
        "## Stimulus",
        request.stimulus,
        "## Final working set",
        JSON.stringify(request.nodes.map((node) => ({
          id: node.id,
          content: node.content,
          predictedConsequence: node.predictedConsequence,
          rootActivationIds: node.rootActivationIds,
        }))),
        "Produce the ordered public expression and retain provenance.",
      ].join("\n\n"),
      output: Output.object({ schema: FieldExpressionSchema }),
      maxOutputTokens: 2_500,
      temperature: 0.75,
      topP: 0.9,
      ...(signal ? { abortSignal: signal } : {}),
    }));
  }

  async baseline(
    request: { stimulus: string; snapshot: string },
    signal?: AbortSignal,
  ): Promise<FieldDriverResult<{ response: string }>> {
    return runStructured(() => generateText({
      model: this.model,
      instructions: [
        "You are the direct single-loop baseline for an experiment.",
        "Use the supplied evidence to answer the stimulus fully. Do not assume or imitate an activation-field process.",
      ].join("\n"),
      prompt: [
        "## Project snapshot",
        request.snapshot,
        "## Stimulus",
        request.stimulus,
      ].join("\n\n"),
      output: Output.object({ schema: DirectBaselineSchema }),
      maxOutputTokens: 2_500,
      temperature: 0.75,
      topP: 0.9,
      ...(signal ? { abortSignal: signal } : {}),
    }));
  }
}

interface StructuredResult<T> {
  output: T;
  totalUsage: unknown;
  providerMetadata: unknown;
  finishReason: unknown;
}

async function runStructured<T>(call: () => Promise<StructuredResult<T>>): Promise<FieldDriverResult<T>> {
  let recoveredUsage = emptyUsage();
  let recovery: unknown;
  try {
    const result = await call();
    return fieldResult(result, recoveredUsage, recovery);
  } catch (error) {
    if (!recoverable(error)) throw error;
    recoveredUsage = NoObjectGeneratedError.isInstance(error)
      ? normalizeUsage(error.usage, undefined)
      : emptyUsage();
    recovery = {
      error: error.message,
      ...(NoObjectGeneratedError.isInstance(error) ? {
        finishReason: error.finishReason,
        generatedText: error.text,
        usage: error.usage,
      } : {}),
    };
  }
  try {
    const result = await call();
    return fieldResult(result, recoveredUsage, recovery);
  } catch (error) {
    if (!recoverable(error)) throw error;
    const usage = NoObjectGeneratedError.isInstance(error)
      ? addUsage(recoveredUsage, normalizeUsage(error.usage, undefined))
      : recoveredUsage;
    throw new ActivationFieldDriverError(error.message, usage, {
      recovery,
      finalFailure: {
        ...(NoObjectGeneratedError.isInstance(error) ? {
          finishReason: error.finishReason,
          generatedText: error.text,
          usage: error.usage,
        } : {}),
      },
    });
  }
}

function recoverable(error: unknown): error is Error {
  return NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error);
}

function fieldResult<T>(
  result: StructuredResult<T>,
  recoveredUsage: CellUsage,
  recovery: unknown,
): FieldDriverResult<T> {
  return {
    value: result.output,
    usage: addUsage(recoveredUsage, normalizeUsage(result.totalUsage, result.providerMetadata)),
    raw: {
      ...(recovery === undefined ? {} : { recovery }),
      finishReason: result.finishReason,
      providerMetadata: result.providerMetadata,
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
