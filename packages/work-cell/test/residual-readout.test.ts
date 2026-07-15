import { expect, test } from "bun:test";
import type { ActivationFieldRecord, FieldDriverResult } from "../src/research/activation-field";
import type { CellUsage } from "../src/contracts";
import {
  buildResidualField,
  runResidualReadout,
  type ResidualHeadDelta,
  type ResidualProjection,
  type ResidualReadoutDriver,
  type ResidualRoute,
} from "../src/research/residual-readout";

test("residual read heads route across layers and project only traceable proposals", async () => {
  const source = sourceRecord();
  const field = buildResidualField(source);
  expect(field).toHaveLength(7);
  expect(field.find((node) => node.id === "c-2-001")!.rootActivationIds).toEqual([
    "a-0001", "a-0002", "a-0003", "a-0004",
  ]);

  const record = await runResidualReadout(source, spec(), new DeterministicReadoutDriver());

  expect(record.status).toBe("completed");
  expect(record.field).toEqual({ nodes: 7, nodesByLayer: { "0": 4, "1": 2, "2": 1 } });
  expect(record.heads).toHaveLength(2);
  expect(record.heads.map((head) => head.routedLayers)).toEqual([[0, 2], [0, 1]]);
  expect(record.projection!.proposals.map((proposal) => proposal.label)).toEqual(["Fissure", "Return"]);
  expect(record.usage.totalTokens).toBe(15);
});

test("residual readout permits an early-layer skip route and records its actual layer", async () => {
  const record = await runResidualReadout(sourceRecord(), spec(), new SameLayerRouter());

  expect(record.status).toBe("completed");
  expect(record.heads.every((head) => head.routedLayers.length === 1 && head.routedLayers[0] === 0)).toBe(true);
});

class DeterministicReadoutDriver implements ResidualReadoutDriver {
  readonly descriptor = { provider: "test", model: "deterministic" };

  async route(request: Parameters<ResidualReadoutDriver["route"]>[0]): Promise<FieldDriverResult<ResidualRoute>> {
    const sourceNodeIds = request.head.id === "material" ? ["a-0001", "c-1-001"] : ["a-0003", "c-2-001"];
    return { value: { sourceNodeIds, routingReason: "cross-layer evidence", expectedContrast: "early and late" }, usage: usage() };
  }

  async read(request: Parameters<ResidualReadoutDriver["read"]>[0]): Promise<FieldDriverResult<ResidualHeadDelta>> {
    return {
      value: {
        sourceNodeIds: request.route.sourceNodeIds,
        delta: `${request.head.id} delta`,
        proposalSeeds: [{ label: request.head.id, explanation: "local seed" }],
        unresolvedTension: "preserve contrast",
        disconfirmingObservation: "the sources become interchangeable",
      },
      usage: usage(),
    };
  }

  async project(request: Parameters<ResidualReadoutDriver["project"]>[0]): Promise<FieldDriverResult<ResidualProjection>> {
    return {
      value: {
        response: "Two proposals preserve distinct residual paths.",
        proposals: [
          {
            label: "Fissure",
            explanation: "A discontinuity that remains actionable.",
            sourceHeadIds: request.heads.map((head) => head.id),
            sourceNodeIds: ["a-0001", "c-2-001"],
          },
          {
            label: "Return",
            explanation: "A capability re-enters common circulation.",
            sourceHeadIds: request.heads.map((head) => head.id),
            sourceNodeIds: ["c-1-001", "a-0003"],
          },
        ],
        unresolvedTensions: ["continuity versus change"],
      },
      usage: usage(),
    };
  }
}

class SameLayerRouter extends DeterministicReadoutDriver {
  override async route(): Promise<FieldDriverResult<ResidualRoute>> {
    return {
      value: {
        sourceNodeIds: ["a-0001", "a-0002"],
        routingReason: "invalid same-layer route",
        expectedContrast: "none",
      },
      usage: usage(),
    };
  }

  override async project(request: Parameters<ResidualReadoutDriver["project"]>[0]): Promise<FieldDriverResult<ResidualProjection>> {
    return {
      value: {
        response: "Early residual sources bypass later compression.",
        proposals: ["Fissure", "Return"].map((label) => ({
          label,
          explanation: "early-layer source",
          sourceHeadIds: request.heads.map((head) => head.id),
          sourceNodeIds: ["a-0001", "a-0002"],
        })),
        unresolvedTensions: [],
      },
      usage: usage(),
    };
  }
}

function spec() {
  return {
    id: "residual-readout-test",
    heads: [
      { id: "material", instructions: "Read material practice.", routeLimit: 4 },
      { id: "aesthetic", instructions: "Read distant images.", routeLimit: 4 },
    ],
    finalInstructions: "Return two traceable proposals.",
    minProposals: 2,
    maxProposals: 2,
    concurrency: 2,
    estimatedTokens: 15,
  };
}

function sourceRecord(): ActivationFieldRecord {
  return {
    version: "work-cell.activation-field.v1",
    runId: "source-run",
    startedAt: "2026-07-13T00:00:00.000Z",
    finishedAt: "2026-07-13T00:00:01.000Z",
    durationMs: 1_000,
    status: "completed",
    driver: { provider: "test", model: "source" },
    input: {
      id: "source",
      stimulus: "Find a project name.",
      snapshot: "immutable",
      receptors: [
        { id: "r1", instructions: "one", principlePids: [] },
        { id: "r2", instructions: "two", principlePids: [] },
      ],
      activationCount: 4,
      concurrency: 2,
      groupSize: 4,
      workingSetSize: 2,
      maxLayers: 2,
      layerWidths: [2, 2],
      propagateShapes: false,
    },
    activations: [1, 2, 3, 4].map((number) => ({
      id: `a-${String(number).padStart(4, "0")}`,
      receptorId: number % 2 ? "r1" : "r2",
      principlePids: [],
      sample: number,
      impulse: `impulse ${number}`,
      relation: `relation ${number}`,
      predictedConsequence: `consequence ${number}`,
      disconfirmingObservation: `disconfirm ${number}`,
    })),
    layers: [
      [
        { id: "c-1-001", layer: 1, group: 1, parentIds: ["a-0001", "a-0002"], newRelation: "first pair", tensions: [], predictedConsequence: "first" },
        { id: "c-1-002", layer: 1, group: 2, parentIds: ["a-0003", "a-0004"], newRelation: "second pair", tensions: [], predictedConsequence: "second" },
      ],
      [
        { id: "c-2-001", layer: 2, group: 1, parentIds: ["c-1-001", "c-1-002"], newRelation: "combined", tensions: [], predictedConsequence: "all" },
      ],
    ],
    workingSet: [{ id: "c-2-001", content: "combined", predictedConsequence: "all", rootActivationIds: ["a-0001", "a-0002", "a-0003", "a-0004"] }],
    expression: {
      response: "control",
      sourceNodeIds: ["c-2-001"],
      emergentRelations: [],
      unresolvedTensions: [],
    },
    failures: [],
    usage: usage(),
    usageByPhase: { activation: usage(), integration: usage(), expression: usage() },
    raw: { activations: [], integrations: [] },
  };
}

function usage(): CellUsage {
  return { inputTokens: 2, outputTokens: 1, totalTokens: 3, cachedInputTokens: 0 };
}
