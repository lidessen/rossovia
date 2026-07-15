import { expect, test } from "bun:test";
import type { ActivationFieldRecord, FieldDriverResult } from "../src/research/activation-field";
import type { CellUsage } from "../src/contracts";
import {
  assignVisibleFields,
  runLatentRouting,
  type LatentRoutingDriver,
} from "../src/research/latent-routing";
import { buildResidualField, type ResidualRoute } from "../src/research/residual-readout";

test("route-only heads expose selection overlap and basin survival before synthesis", async () => {
  const record = await runLatentRouting(sourceRecord(), spec(), new RoutingDriver());

  expect(record.status).toBe("completed");
  expect(record.heads.map((head) => head.route.sourceNodeIds)).toEqual([
    ["a-0001", "a-0002"],
    ["a-0002", "a-0003"],
  ]);
  expect(record.metrics).toMatchObject({
    totalSelections: 4,
    uniqueSelectedNodes: 3,
    fieldCoverage: 0.75,
    meanRouteSize: 2,
    meanPairwiseJaccard: 0.333333,
    sourceDomains: {
      field: { ecology: 2, workshop: 2 },
      selectedOccurrences: { ecology: 3, workshop: 1 },
      selectedUnique: { ecology: 2, workshop: 1 },
    },
    lexicalBasins: [{
      id: "craft",
      field: { hits: 2, total: 4, share: 0.5 },
      selectedOccurrences: { hits: 1, total: 4, share: 0.25 },
      selectedUnique: { hits: 1, total: 3, share: 0.333333 },
      sourceIntegrationLayers: [{ layer: 1, hits: 1, total: 2, share: 0.5 }],
    }],
  });
  expect(record.usage.totalTokens).toBe(6);
});

test("sparse visibility assigns every source to the declared number of heads without semantic rewriting", () => {
  const source = sourceRecord();
  const field = buildResidualField(source).filter((node) => node.layer === 0);
  const heads = spec().heads;
  const visible = assignVisibleFields(field, heads, { copiesPerNode: 1, seed: "stable" });
  const assignments = [...visible.values()].flatMap((nodes) => nodes.map((node) => node.id));

  expect(assignments.sort()).toEqual(field.map((node) => node.id).sort());
  expect(new Set(visible.get("material")!.map((node) => node.id)))
    .not.toEqual(new Set(visible.get("weak-signal")!.map((node) => node.id)));
  expect(assignVisibleFields(field, heads, { copiesPerNode: 1, seed: "stable" }))
    .toEqual(visible);
});

test("route-only heads reject unavailable source IDs without hiding successful siblings", async () => {
  const record = await runLatentRouting(sourceRecord(), spec(), new FabricatingRouter());

  expect(record.status).toBe("partial");
  expect(record.heads.map((head) => head.id)).toEqual(["material"]);
  expect(record.failures).toEqual([{ headId: "weak-signal", error: "weak-signal route references unavailable nodes: a-9999" }]);
  expect(record.metrics.totalSelections).toBe(2);
});

class RoutingDriver implements LatentRoutingDriver {
  readonly descriptor = { provider: "test", model: "router" };

  async route(request: Parameters<LatentRoutingDriver["route"]>[0]): Promise<FieldDriverResult<ResidualRoute>> {
    return {
      value: request.head.id === "material"
        ? route(["a-0001", "a-0002"])
        : route(["a-0002", "a-0003"]),
      usage: usage(),
    };
  }
}

class FabricatingRouter extends RoutingDriver {
  override async route(request: Parameters<LatentRoutingDriver["route"]>[0]): Promise<FieldDriverResult<ResidualRoute>> {
    return {
      value: request.head.id === "material" ? route(["a-0001", "a-0002"]) : route(["a-0003", "a-9999"]),
      usage: usage(),
    };
  }
}

function route(sourceNodeIds: string[]): ResidualRoute {
  return { sourceNodeIds, routingReason: "contrasting sources", expectedContrast: "different field relations" };
}

function spec() {
  return {
    id: "latent-routing-test",
    heads: [
      { id: "material", instructions: "Read material conditions.", routeLimit: 2 },
      { id: "weak-signal", instructions: "Read weak signals.", routeLimit: 2 },
    ],
    fieldLayers: [0],
    lexicalBasins: [{ id: "craft", terms: ["forge", "workshop"] }],
    concurrency: 2,
    estimatedTokens: 6,
  };
}

function sourceRecord(): ActivationFieldRecord {
  const domains = ["workshop", "ecology", "ecology", "workshop"];
  return {
    version: "work-cell.activation-field.v1",
    runId: "source-run",
    startedAt: "2026-07-14T00:00:00.000Z",
    finishedAt: "2026-07-14T00:00:01.000Z",
    durationMs: 1_000,
    status: "completed",
    driver: { provider: "test", model: "source" },
    input: {
      id: "source",
      stimulus: "Find the governing relation.",
      snapshot: "immutable",
      receptors: domains.map((domain, index) => ({
        id: `r${index + 1}`,
        instructions: domain,
        principlePids: [],
        shape: {
          components: [{ id: "test", weight: 1 }],
          principles: [],
          traits: [],
          facets: [{ id: "source-domain", optionId: domain, prompt: domain }],
        },
      })),
      activationCount: 4,
      concurrency: 2,
      groupSize: 4,
      workingSetSize: 2,
      maxLayers: 1,
      layerWidths: [2],
      propagateShapes: false,
    },
    activations: domains.map((domain, index) => ({
      id: `a-${String(index + 1).padStart(4, "0")}`,
      receptorId: `r${index + 1}`,
      principlePids: [],
      sample: 1,
      impulse: index === 0 || index === 3 ? `${domain} forge` : `${domain} seed`,
      relation: `relation ${index + 1}`,
      predictedConsequence: `consequence ${index + 1}`,
      disconfirmingObservation: `disconfirm ${index + 1}`,
    })),
    layers: [[
      { id: "c-1-001", layer: 1, group: 1, parentIds: ["a-0001", "a-0002"], newRelation: "shared forge", tensions: [], predictedConsequence: "one" },
      { id: "c-1-002", layer: 1, group: 2, parentIds: ["a-0003", "a-0004"], newRelation: "living seed", tensions: [], predictedConsequence: "two" },
    ]],
    workingSet: [],
    failures: [],
    usage: usage(),
    usageByPhase: { activation: usage(), integration: usage(), expression: usage() },
    raw: { activations: [], integrations: [] },
  };
}

function usage(): CellUsage {
  return { inputTokens: 2, outputTokens: 1, totalTokens: 3, cachedInputTokens: 0 };
}
