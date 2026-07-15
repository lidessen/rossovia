import { expect, test } from "bun:test";
import type { CandidateArtifact } from "../src/research/candidate-field";
import { selectProjectionMaterial } from "../src/research/naming-expression-probe";
import { renderHumanSurfacePacket } from "../src/research/naming-surface-gate-probe";

test("projection material preserves every available operator instead of inheriting archive selection bias", () => {
  const artifacts = [
    ...artifactsFor("plain", 4),
    ...artifactsFor("remote", 4),
    ...artifactsFor("weathering", 4),
  ];

  const first = selectProjectionMaterial(artifacts, 2, "stable-seed");
  const replay = selectProjectionMaterial(artifacts.toReversed(), 2, "stable-seed");

  expect(first.map((artifact) => artifact.id)).toEqual(replay.map((artifact) => artifact.id));
  expect(Object.fromEntries(["plain", "remote", "weathering"].map((operatorId) => [
    operatorId,
    first.filter((artifact) => artifact.operatorId === operatorId).length,
  ]))).toEqual({ plain: 2, remote: 2, weathering: 2 });
});

test("human review sees only surfaces that survived the independent rejection gate", () => {
  const packet = renderHumanSurfacePacket([
    { name: "Plain Name", spokenForm: "plain name", surfaced: true },
    { name: "Explanation Rescue", spokenForm: "explanation rescue", surfaced: false },
  ]);

  expect(packet).toContain("Plain Name");
  expect(packet).not.toContain("Explanation Rescue");
  expect(packet).toContain("before requesting any formation story or explanation");
  expect(packet).toContain("You may reject every item");
});

test("human review records an all-reject outcome instead of forcing a candidate", () => {
  const packet = renderHumanSurfacePacket([
    { name: "Rejected", spokenForm: "rejected", surfaced: false },
  ]);

  expect(packet).toContain("No candidate survived the surface gate");
  expect(packet).not.toContain("- Rejected");
});

function artifactsFor(operatorId: string, count: number): CandidateArtifact[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${operatorId}-${index + 1}`,
    content: `${operatorId} material ${index + 1}`,
    phase: operatorId === "weathering" ? "mutate" : "emit",
    operatorId,
    sourceNodeIds: [],
    parentCandidateIds: [],
    seedTitleIds: [],
    participationTitleIds: [],
    seedActivations: [],
  }));
}
