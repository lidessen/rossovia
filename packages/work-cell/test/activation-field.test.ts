import { expect, test } from "bun:test";
import type { CellUsage } from "../src/contracts";
import {
  runActivationField,
  inheritCognitiveShape,
  distributedGroups,
  type ActivationFieldDriver,
  type ActivationRequest,
  type CoalitionDraft,
  type ExpressionRequest,
  type FieldDriverResult,
  type FieldExpression,
  type IntegrationRequest,
  type ActivationDraft,
} from "../src/research/activation-field";

test("activation field excludes completion order from meaning while retaining local provenance", async () => {
  const slowFirst = await runActivationField(input(), new DeterministicFieldDriver(true));
  const fastFirst = await runActivationField(input(), new DeterministicFieldDriver(false));

  expect(slowFirst.status).toBe("completed");
  expect(fastFirst.status).toBe("completed");
  expect(slowFirst.activations).toEqual(fastFirst.activations);
  expect(slowFirst.layers).toEqual(fastFirst.layers);
  expect(slowFirst.workingSet).toEqual(fastFirst.workingSet);
  expect(slowFirst.expression).toEqual(fastFirst.expression);
  expect(slowFirst.activations.map((activation) => activation.id)).toEqual(
    Array.from({ length: 16 }, (_, index) => `a-${String(index + 1).padStart(4, "0")}`),
  );
  expect(slowFirst.workingSet.every((node) => node.rootActivationIds.length >= 2)).toBe(true);
});

test("activation field rejects a coalition that fabricates a parent outside its neighborhood", async () => {
  const record = await runActivationField(input(), new InvalidParentDriver());

  expect(record.status).toBe("failed");
  expect(record.expression).toBeUndefined();
  expect(record.failures).toHaveLength(4);
  expect(record.failures.every((failure) => failure.error.includes("outside its local group"))).toBe(true);
});

test("activation field preserves the requested working-set bandwidth instead of overshooting it", async () => {
  const record = await runActivationField({
    ...input(),
    activationCount: 64,
    concurrency: 16,
    workingSetSize: 8,
    estimatedTokens: 250,
  }, new DeterministicFieldDriver(false));

  expect(record.status).toBe("completed");
  expect(record.layers.map((layer) => layer.length)).toEqual([16, 8]);
  expect(record.workingSet).toHaveLength(8);
});

test("multi-layer nodes replay inherited shape crossover without averaging every dimension", async () => {
  const first = inheritCognitiveShape(shapedNodes(), "layer-1-node-1");
  const replay = inheritCognitiveShape(shapedNodes(), "layer-1-node-1");
  const neighbor = inheritCognitiveShape(shapedNodes(), "layer-1-node-2");

  expect(first).toEqual(replay);
  expect(first).not.toEqual(neighbor);
  expect(first!.traits).toHaveLength(1);
  expect(first!.facets).toHaveLength(1);
  expect(first!.components.length).toBeLessThanOrEqual(2);

  const record = await runActivationField({
    ...input(),
    receptors: input().receptors.map((receptor, index) => ({
      ...receptor,
      shape: shape(index),
    })),
    propagateShapes: true,
    maxLayers: 3,
    layerWidths: [16, 8, 4],
  }, new DeterministicFieldDriver(false));
  expect(record.layers.map((layer) => layer.length)).toEqual([16, 8, 4]);
  expect(record.layers.flat().every((node) => node.shape !== undefined)).toBe(true);
  expect(record.workingSet.every((node) => node.shape !== undefined)).toBe(true);
});

test("distributed layer neighborhoods realize an explicit width without duplicate inputs inside a node", () => {
  const nodes = Array.from({ length: 16 }, (_, index) => ({ id: `n-${String(index).padStart(2, "0")}` }));
  const groups = distributedGroups(nodes, 4, 16, "same-width-layer");

  expect(groups).toHaveLength(16);
  expect(groups.every((group) => group.length === 4)).toBe(true);
  expect(groups.every((group) => new Set(group.map((node) => node.id)).size === 4)).toBe(true);
  expect(distributedGroups(nodes, 4, 16, "same-width-layer")).toEqual(groups);
});

class DeterministicFieldDriver implements ActivationFieldDriver {
  readonly descriptor = { provider: "test", model: "deterministic" };

  constructor(private readonly reverseCompletion: boolean) {}

  async activate(request: ActivationRequest): Promise<FieldDriverResult<ActivationDraft>> {
    const rank = receptorRank(request.receptor.id);
    const delay = this.reverseCompletion ? (5 - rank) * 2 : rank * 2;
    await Bun.sleep(delay);
    return {
      value: {
        impulse: `${request.receptor.id}-${request.sample}`,
        relation: `relation-${request.receptor.id}-${request.sample}`,
        predictedConsequence: `consequence-${request.receptor.id}-${request.sample}`,
        disconfirmingObservation: `disconfirm-${request.receptor.id}-${request.sample}`,
      },
      usage: usage(),
      raw: { receptor: request.receptor.id, sample: request.sample },
    };
  }

  async integrate(request: IntegrationRequest): Promise<FieldDriverResult<CoalitionDraft>> {
    const first = request.nodes[0]!;
    const last = request.nodes.at(-1)!;
    return {
      value: {
        parentIds: [first.id, last.id],
        newRelation: `${first.id}+${last.id}`,
        tensions: [],
        predictedConsequence: `combined-${first.id}-${last.id}`,
      },
      usage: usage(),
      raw: { layer: request.layer },
    };
  }

  async express(request: ExpressionRequest): Promise<FieldDriverResult<FieldExpression>> {
    return {
      value: {
        response: request.nodes.map((node) => node.content).join(" | "),
        sourceNodeIds: request.nodes.map((node) => node.id),
        emergentRelations: [{
          relation: "combined working set",
          sourceNodeIds: request.nodes.slice(0, 2).map((node) => node.id),
        }],
        unresolvedTensions: [],
      },
      usage: usage(),
    };
  }
}

class InvalidParentDriver extends DeterministicFieldDriver {
  constructor() {
    super(false);
  }

  override async integrate(request: IntegrationRequest): Promise<FieldDriverResult<CoalitionDraft>> {
    return {
      value: {
        parentIds: [request.nodes[0]!.id, "fabricated-node"],
        newRelation: "invalid",
        tensions: [],
        predictedConsequence: "invalid",
      },
      usage: usage(),
    };
  }
}

function input() {
  return {
    id: "order-independent-field",
    stimulus: "Find a relation that changes the decision.",
    snapshot: "One immutable snapshot.",
    receptors: [
      { id: "essence", instructions: "Attend to essence.", principlePids: ["P06"] },
      { id: "contradiction", instructions: "Attend to contradiction.", principlePids: ["P04"] },
      { id: "analogy", instructions: "Attend to distant analogies.", principlePids: [] },
      { id: "future", instructions: "Attend to future mutation.", principlePids: [] },
    ],
    activationCount: 16,
    concurrency: 4,
    groupSize: 8,
    workingSetSize: 4,
    maxLayers: 2,
    estimatedTokens: 50,
  };
}

function shapedNodes() {
  return [0, 1, 2, 3].map((index) => ({
    id: `node-${index}`,
    content: `content-${index}`,
    predictedConsequence: `consequence-${index}`,
    rootActivationIds: [`a-${index}`],
    shape: shape(index),
  }));
}

function shape(index: number) {
  return {
    components: [{ id: index % 2 === 0 ? "material" : "associative", weight: 1 }],
    principles: [{ pid: index % 2 === 0 ? "P02" : "P06", weight: 1 }],
    traits: [{
      id: "concrete-abstract",
      value: index / 3,
      low: "concrete practice",
      high: "abstract relation",
    }],
    facets: [{
      id: "domain",
      optionId: index % 2 === 0 ? "workshop" : "music",
      prompt: index % 2 === 0 ? "Attend through making." : "Attend through rhythm.",
    }],
  };
}

function receptorRank(id: string): number {
  return ["essence", "contradiction", "analogy", "future"].indexOf(id) + 1;
}

function usage(): CellUsage {
  return { inputTokens: 2, outputTokens: 1, totalTokens: 3, cachedInputTokens: 0 };
}
