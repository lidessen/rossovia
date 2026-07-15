import { expect, test } from "bun:test";
import {
  renderIdeaComparisonPacket,
  resolveEllipsizedQuote,
  shouldJudgeFinals,
  validateEvidenceChallenge,
  validateReferenceIds,
} from "../src/research/idea-development-probe";

test("idea lineage rejects fabricated source references before synthesis", () => {
  expect(() => validateReferenceIds(["evidence-1"], new Set(["evidence-1"]), "idea")).not.toThrow();
  expect(() => validateReferenceIds(["evidence-2"], new Set(["evidence-1"]), "idea"))
    .toThrow("idea cited unavailable IDs: evidence-2");
});

test("comparison spends no judge budget when both evidence gates reject", () => {
  const rejected = {
    disposition: "all-rejected" as const,
    idea: null,
    lineageIds: [],
    synthesisObservation: "rejected",
  };

  expect(shouldJudgeFinals(rejected, rejected)).toBe(false);
  expect(shouldJudgeFinals(final("survivor"), rejected)).toBe(true);
});

test("ellipsized evidence is reduced to an exact source segment only when its parts occur in order", () => {
  const source = "The treatment changed title participation. Archive niches then selected disjoint pools.";

  expect(resolveEllipsizedQuote("The treatment changed title participation. … selected disjoint pools.", source))
    .toBe("The treatment changed title participation.");
  expect(resolveEllipsizedQuote("selected disjoint pools. … The treatment changed", source)).toBeUndefined();
});

test("claim evidence requires a verbatim source relation instead of a plausible citation ID", () => {
  const evidence = new Map([["evidence-1", {
    id: "evidence-1",
    path: "runtime.ts",
    startLine: 1,
    endLine: 2,
    content: "The runtime selects parent IDs and asks the driver to form a new relation.",
  }]]);
  const challenge = {
    coreStatus: "mixed" as const,
    findings: [
      { evidenceRef: "evidence-1", quote: "selects parent IDs", relation: "supports" as const, explanation: "selection exists" },
      { evidenceRef: "evidence-1", quote: "averages semantic vectors", relation: "limits" as const, explanation: "invented mechanism" },
    ],
    unsupportedAssumption: "averaging",
    requiredRevision: "describe model integration instead",
  };

  expect(() => validateEvidenceChallenge(challenge, evidence, "claim"))
    .toThrow("claim supplied a non-verbatim quote for evidence-1: averages semantic vectors");
});

test("blind idea packet exposes actionable comparison without treatment identity", () => {
  const packet = renderIdeaComparisonPacket(
    final("A thesis"),
    final("B thesis"),
    [{ id: "evidence-1", path: "evidence.md", startLine: 10, endLine: 20, content: "private source" }],
  );

  expect(packet).toContain("A thesis");
  expect(packet).toContain("B thesis");
  expect(packet).toContain("evidence.md:10-20");
  expect(packet).not.toContain("baseline");
  expect(packet).not.toContain("developed");
  expect(packet).not.toContain("private source");
});

function final(thesis: string) {
  return {
    disposition: "idea" as const,
    idea: {
      thesis,
      governingRelation: "relation",
      evidenceRefs: ["evidence-1", "evidence-2"],
      prediction: "prediction",
      nextProbe: "probe",
      decisionDelta: "decision",
      strongestAlternative: "alternative",
      failureCondition: "failure",
      uncertainty: "uncertainty",
    },
    lineageIds: ["lineage-1"],
    synthesisObservation: "observation",
  };
}
