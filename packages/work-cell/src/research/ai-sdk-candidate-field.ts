import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import { z } from "zod";
import type { FieldDriverResult } from "./activation-field";
import { ActivationFieldDriverError } from "./activation-field";
import {
  ArchiveSelectionSchema,
  CandidateDraftSchema,
  SeedActivationDraftSchema,
  SeedSelectionSchema,
  type ArchiveSelection,
  type CandidateDraft,
  type CandidateFieldDriver,
  type SeedActivationDraft,
  type SeedMaterialRetriever,
  type SeedSelection,
} from "./candidate-field";
import type { CellUsage } from "../contracts";
import { normalizeAiSdkUsage as normalizeUsage } from "../ai-sdk-usage";
import {
  createValidationModel,
  validationProviderName,
  type ValidationModelOptions,
} from "../validation-model";

export interface AiSdkCandidateFieldOptions extends ValidationModelOptions {
  seedRetriever?: SeedMaterialRetriever;
}

export class AiSdkCandidateFieldDriver implements CandidateFieldDriver {
  readonly descriptor;
  private readonly model;
  private readonly seedRetriever: SeedMaterialRetriever | undefined;

  constructor(options: AiSdkCandidateFieldOptions = {}) {
    const modelId = options.model ?? "deepseek-v4-flash";
    const selection = createValidationModel(options);
    this.model = selection.model;
    this.seedRetriever = options.seedRetriever;
    this.descriptor = { provider: validationProviderName(selection), model: modelId };
  }

  async retrieve(
    request: Parameters<CandidateFieldDriver["retrieve"]>[0],
    signal?: AbortSignal,
  ): Promise<FieldDriverResult<SeedSelection>> {
    const activation = await runStructured<SeedActivationDraft>(() => generateText({
      model: this.model,
      instructions: [
        "You activate remembered source material for one activation in an open association field.",
        `Select exactly ${request.selectCount} book titles from the supplied random shelf. Do not generate an artifact, summarize the catalog, or invent an entry ID.`,
        "Recall fallibly and paraphrase rather than fabricate an exact quotation. The runtime, not you, records whether external evidence is later retrieved.",
        "Look for a live resonance, productive mismatch, rhythm, image, operation, or contradiction. Literal topical similarity is neither required nor preferred.",
        request.requiredTitleIds.length > 0
          ? `A balanced participation seat requires these title IDs to be included: ${request.requiredTitleIds.join(", ")}. This guarantees contact, not relevance, quality, agreement, or output form.`
          : "No title has a reserved participation seat in this activation.",
        "## Local operator",
        request.operator.instructions,
      ].join("\n"),
      prompt: [
        "## Task stimulus",
        request.stimulus,
        `## Independent retrieval ${request.sample}`,
        "## Random title shelf",
        JSON.stringify(request.shelf),
        `## Allowed title IDs\n${request.shelf.map((entry) => entry.id).join("\n")}`,
        `## Required participation title IDs\n${request.requiredTitleIds.length > 0 ? request.requiredTitleIds.join("\n") : "none"}`,
        "## Local residual material",
        JSON.stringify(request.nodes.map((node) => ({
          layer: node.layer,
          content: truncate(node.content, 420),
          consequence: truncate(node.predictedConsequence, 160),
        }))),
        "Return titleIds copied only from the allowed title IDs, including every required participation title ID, and the remembered resonance. The residual material has no selectable IDs.",
      ].join("\n\n"),
      output: Output.object({ schema: SeedActivationDraftSchema }),
      maxOutputTokens: 500,
      temperature: 0.8,
      topP: 0.95,
      ...(signal ? { abortSignal: signal } : {}),
    }));
    if (!this.seedRetriever) {
      return {
        value: SeedSelectionSchema.parse({ ...activation.value, basis: "memory", evidence: [] }),
        usage: activation.usage,
        raw: { activation: activation.raw },
      };
    }

    const shelf = new Map(request.shelf.map((entry) => [entry.id, entry]));
    const evidenceOutcomes = await Promise.all(activation.value.titleIds.map(async (titleId) => {
      const entry = shelf.get(titleId);
      if (!entry) return { titleId, error: `selected title is outside the supplied shelf: ${titleId}` };
      try {
        const evidence = await this.seedRetriever!.retrieve({ entry, randomSeed: `${request.randomSeed}:${titleId}` }, signal);
        return { titleId, evidence };
      } catch (error) {
        return { titleId, error: message(error) };
      }
    }));
    const evidence = evidenceOutcomes.flatMap((outcome) => "evidence" in outcome && outcome.evidence ? [outcome.evidence] : []);
    if (evidence.length === 0) {
      return {
        value: SeedSelectionSchema.parse({ ...activation.value, basis: "memory", evidence: [] }),
        usage: activation.usage,
        raw: { activation: activation.raw, retrieval: { provider: this.seedRetriever.descriptor.provider, outcomes: evidenceOutcomes } },
      };
    }

    const grounded = await runStructured<{ resonance: string }>(() => generateText({
      model: this.model,
      instructions: [
        "You form one source-grounded resonance for an open association field.",
        "Use only the supplied runtime evidence. Do not quote beyond it, repair its wording from memory, generate an artifact, or rank the books.",
        "State the live image, operation, rhythm, contradiction, or productive mismatch that the evidence introduces into the local material.",
        "## Local operator",
        request.operator.instructions,
      ].join("\n"),
      prompt: [
        "## Task stimulus",
        request.stimulus,
        "## Runtime retrieval evidence",
        JSON.stringify(evidence),
        "## Local residual material",
        JSON.stringify(request.nodes.map((node) => ({
          layer: node.layer,
          content: truncate(node.content, 420),
          consequence: truncate(node.predictedConsequence, 160),
        }))),
        "Return the grounded resonance only.",
      ].join("\n\n"),
      output: Output.object({ schema: z.object({ resonance: z.string().min(1) }) }),
      maxOutputTokens: 500,
      temperature: 0.75,
      topP: 0.95,
      ...(signal ? { abortSignal: signal } : {}),
    }));
    const basis = evidence.length === activation.value.titleIds.length ? "retrieval" : "mixed";
    return {
      value: SeedSelectionSchema.parse({
        titleIds: activation.value.titleIds,
        basis,
        resonance: grounded.value.resonance,
        evidence,
      }),
      usage: addUsage(activation.usage, grounded.usage),
      raw: {
        activation: activation.raw,
        retrieval: { provider: this.seedRetriever.descriptor.provider, outcomes: evidenceOutcomes },
        grounding: grounded.raw,
      },
    };
  }

  async emit(
    request: Parameters<CandidateFieldDriver["emit"]>[0],
    signal?: AbortSignal,
  ): Promise<FieldDriverResult<CandidateDraft>> {
    return runStructured(() => generateText({
      model: this.model,
      instructions: [
        "You emit one object into an open association field. You are not a critic, explainer, naming agent, or final-answer writer.",
        "Do not decide or label what kind of object it is. Any expressive form and any length that fits the output field are allowed; do not assume it must be a name, word, phrase, or candidate.",
        "Let the activated memories disturb the local project material. Return the resulting object itself, without justification, classification, ranking, or summary.",
        "## Generative operator",
        request.operator.instructions,
        "## Saturated basins to inhibit",
        request.inhibitions.length > 0 ? request.inhibitions.join("\n") : "none observed",
      ].join("\n"),
      prompt: [
        "## Task stimulus",
        request.stimulus,
        `## Independent sample ${request.sample}`,
        "## Activated book titles",
        JSON.stringify(request.seeds),
        "## Recall or retrieval note",
        JSON.stringify(request.activation),
        "## Local residual material",
        JSON.stringify(request.nodes.map((node) => ({
          id: node.id,
          layer: node.layer,
          content: truncate(node.content, 520),
          consequence: truncate(node.predictedConsequence, 180),
        }))),
        "Emit one unclassified associative object. Do not include source IDs in its content.",
      ].join("\n\n"),
      output: Output.object({ schema: CandidateDraftSchema }),
      maxOutputTokens: 120,
      temperature: 1.25,
      topP: 0.98,
      ...(signal ? { abortSignal: signal } : {}),
    }));
  }

  async mutate(
    request: Parameters<CandidateFieldDriver["mutate"]>[0],
    signal?: AbortSignal,
  ): Promise<FieldDriverResult<CandidateDraft>> {
    return runStructured(() => generateText({
      model: this.model,
      instructions: [
        "You perform one mutation in an open association field. You are not a critic, naming agent, or explainer.",
        "Transform the supplied objects into one materially new object. Do not merely concatenate them, choose one, classify the result, or write an explanation.",
        "No output form, language, length, or artifact category is preferred. Preserve whichever relation becomes active and discard the parents' literal form when useful.",
        "## Mutation operator",
        request.operator.instructions,
        "## Saturated basins to inhibit",
        request.inhibitions.length > 0 ? request.inhibitions.join("\n") : "none observed",
      ].join("\n"),
      prompt: [
        "## Task stimulus",
        request.stimulus,
        `## Independent mutation ${request.sample}`,
        "## Parent artifacts",
        JSON.stringify(request.parents.map(({ id, content }) => ({ id, content }))),
        "Emit one transformed, unclassified object only.",
      ].join("\n\n"),
      output: Output.object({ schema: CandidateDraftSchema }),
      maxOutputTokens: 120,
      temperature: 1.3,
      topP: 0.98,
      ...(signal ? { abortSignal: signal } : {}),
    }));
  }

  async select(
    request: Parameters<CandidateFieldDriver["select"]>[0],
    signal?: AbortSignal,
  ): Promise<FieldDriverResult<ArchiveSelection>> {
    return runStructured(() => generateText({
      model: this.model,
      instructions: [
        "You maintain one independent niche in an association archive. You do not generate, rewrite, merge, classify, or globally rank artifacts.",
        `Select exactly ${request.archive.capacity} supplied artifact IDs that are strongest and materially different within this niche.`,
        "Provenance and generating operator are hidden. Judge the object itself against the concrete project and this niche; frequency and resemblance to a conventional name are not evidence.",
        "## Archive niche",
        request.archive.instructions,
        "## Saturated basins to reject",
        request.inhibitions.length > 0 ? request.inhibitions.join("\n") : "none observed",
      ].join("\n"),
      prompt: [
        "## Concrete project source",
        request.snapshot,
        "## Task stimulus",
        request.stimulus,
        "## Blind associative objects",
        JSON.stringify(request.candidates),
        "Return artifact IDs, the contrast preserved by this niche, and an observation that would make these selections poor.",
      ].join("\n\n"),
      output: Output.object({ schema: ArchiveSelectionSchema }),
      maxOutputTokens: 900,
      temperature: 0.35,
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
    recoveredUsage = NoObjectGeneratedError.isInstance(error) ? normalizeUsage(error.usage, undefined) : emptyUsage();
    recovery = { error: error.message };
  }
  try {
    const result = await call();
    return fieldResult(result, recoveredUsage, recovery);
  } catch (error) {
    if (!recoverable(error)) throw error;
    const usage = NoObjectGeneratedError.isInstance(error)
      ? addUsage(recoveredUsage, normalizeUsage(error.usage, undefined))
      : recoveredUsage;
    throw new ActivationFieldDriverError(error.message, usage, { recovery });
  }
}

function recoverable(error: unknown): error is Error {
  return NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error);
}

function fieldResult<T>(result: StructuredResult<T>, recoveredUsage: CellUsage, recovery: unknown): FieldDriverResult<T> {
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

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
