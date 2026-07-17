import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import type { CellUsage } from "../contracts";
import { normalizeAiSdkUsage as normalizeUsage } from "../ai-sdk-usage";
import {
  createValidationModel,
  validationModelName,
  validationProviderName,
  type ValidationModelOptions,
} from "../validation-model";
import { ActivationFieldDriverError, type FieldDriverResult } from "./activation-field";
import {
  ResidualHeadDeltaSchema,
  ResidualProjectionSchema,
  ResidualRouteSchema,
  type ResidualHeadDelta,
  type ResidualNode,
  type ResidualProjection,
  type ResidualReadoutDriver,
  type ResidualRoute,
} from "./residual-readout";

export interface AiSdkResidualReadoutOptions extends ValidationModelOptions {}

export class AiSdkResidualReadoutDriver implements ResidualReadoutDriver {
  readonly descriptor;
  private readonly model;

  constructor(options: AiSdkResidualReadoutOptions = {}) {
    const selection = createValidationModel(options);
    this.model = selection.model;
    this.descriptor = {
      provider: validationProviderName(selection),
      model: validationModelName(selection),
    };
  }

  async route(
    request: Parameters<ResidualReadoutDriver["route"]>[0],
    signal?: AbortSignal,
  ): Promise<FieldDriverResult<ResidualRoute>> {
    return runStructured(() => generateText({
      model: this.model,
      instructions: [
        "You are one query-key routing head over an append-only residual field.",
        "Select sources only; do not synthesize an answer, choose a winner, or rewrite their content.",
        "Prefer a small set whose interaction fits this head and contains a real contrast. You may read any layer; selecting an early source directly is a valid skip path around later compression.",
        "Do not select a source merely because its metaphor is frequent. A rare source may be important when it changes the relation.",
        "## Head projection",
        request.head.instructions,
      ].join("\n"),
      prompt: [
        "## Task stimulus",
        request.stimulus,
        `## Residual field index (${request.field.length} nodes; select at most ${request.head.routeLimit})`,
        JSON.stringify(request.field.map(compactNode)),
        "Return only the routed node IDs and why their contrast matters to this head.",
      ].join("\n\n"),
      output: Output.object({ schema: ResidualRouteSchema }),
      maxOutputTokens: 800,
      temperature: 0.45,
      topP: 0.9,
      ...(signal ? { abortSignal: signal } : {}),
    }));
  }

  async read(
    request: Parameters<ResidualReadoutDriver["read"]>[0],
    signal?: AbortSignal,
  ): Promise<FieldDriverResult<ResidualHeadDelta>> {
    return runStructured(() => generateText({
      model: this.model,
      instructions: [
        "You are one output-value read head. The router has already selected what you may read.",
        "Write one new delta into the residual field: preserve source differences, expose a relation not stated by one source alone, and do not summarize the whole project.",
        "Proposal seeds are local possibilities, not a vote or final selection. Cite only routed node IDs.",
        "## Head projection",
        request.head.instructions,
      ].join("\n"),
      prompt: [
        "## Task stimulus",
        request.stimulus,
        "## Router expectation",
        JSON.stringify(request.route),
        "## Full selected residual nodes",
        JSON.stringify(request.nodes),
        "Produce this head's delta, local proposal seeds, unresolved tension, and a disconfirming observation.",
      ].join("\n\n"),
      output: Output.object({ schema: ResidualHeadDeltaSchema }),
      maxOutputTokens: 1_800,
      temperature: 0.9,
      topP: 0.95,
      ...(signal ? { abortSignal: signal } : {}),
    }));
  }

  async project(
    request: Parameters<ResidualReadoutDriver["project"]>[0],
    signal?: AbortSignal,
  ): Promise<FieldDriverResult<ResidualProjection>> {
    return runStructured(() => generateText({
      model: this.model,
      instructions: [
        "You are a task-conditioned output head, not another consensus layer.",
        "Fulfill the caller's explicit output contract. Preserve materially distinct read-head basins and provenance; recurrence is not a vote.",
        "Every proposal must cite the read heads and original residual nodes that support it. Do not invent an unavailable source.",
        `Return between ${request.minProposals} and ${request.maxProposals} genuinely distinct proposals.`,
        "## Output contract",
        request.finalInstructions,
      ].join("\n"),
      prompt: [
        "## Task stimulus",
        request.stimulus,
        "## Independent read-head deltas",
        JSON.stringify(request.heads),
        "Produce the requested public response, proposals, and unresolved tensions.",
      ].join("\n\n"),
      output: Output.object({ schema: ResidualProjectionSchema }),
      maxOutputTokens: 3_500,
      temperature: 0.75,
      topP: 0.92,
      ...(signal ? { abortSignal: signal } : {}),
    }));
  }
}

function compactNode(node: ResidualNode) {
  return {
    id: node.id,
    layer: node.layer,
    content: truncate(node.content, 700),
    predictedConsequence: truncate(node.predictedConsequence, 260),
    shape: node.shape ? {
      components: node.shape.components.map((entry) => entry.id),
      principles: node.shape.principles.map((entry) => entry.pid),
      facets: node.shape.facets.map((facet) => `${facet.id}/${facet.optionId}`),
    } : undefined,
  };
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
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
