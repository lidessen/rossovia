import { describe, expect, test } from "bun:test";
import {
  GRAPH_POLICY,
  parseAnswerResponse,
  parseRouteResponse,
  recallQuestions,
  recallAssociations,
  recallConcepts,
  publicRecallQuestions,
  rankTextSearch,
  recallSearchRepresentation,
  recallSources,
  recallTextRepresentation,
  scoreRecallTrial,
  sourcePacket,
} from "../src/recall-fixture.js";

describe("associative recall fixture", () => {
  test("keeps gold answers out of public activation text", () => {
    const activation = recallTextRepresentation();
    for (const question of recallQuestions) {
      expect(activation).not.toContain(question.prompt);
      expect(question.gold.length).toBeGreaterThanOrEqual(2);
    }
    const publicPacket = JSON.stringify(publicRecallQuestions());
    expect(publicPacket).not.toContain('"gold"');
    expect(publicPacket).not.toContain('"support"');
    expect(publicPacket).not.toContain('"expectedKey"');
  });

  test("derives graph associations from corpus BM25 without evaluator gold", () => {
    for (const concept of recallConcepts) {
      const actual = recallAssociations.filter(([conceptId]) => conceptId === concept.id).map(([, sourceId]) => sourceId);
      const expected = rankTextSearch(concept.query, GRAPH_POLICY.sourcesPerConcept).map(({ id }) => id);
      expect(actual).toEqual(expected);
    }
  });

  test("source packets include only selected frozen sources", () => {
    const packet = sourcePacket(["SHILU-S01", "SHILU-S03"]);
    expect(packet).toContain("# SHILU-S01");
    expect(packet).toContain("# SHILU-S03");
    expect(packet).not.toContain("# SHILU-S02");
    expect(packet).toContain("1cac9bbf3e2e10bfdb3178838fefc406236b652e");
  });

  test("text baseline returns five ranked locators without source excerpts", () => {
    const output = recallSearchRepresentation(recallQuestions[0]);
    expect(output.match(/^RESULT/gm)).toHaveLength(5);
    expect(output).not.toContain("Entries are the source of truth");
    expect(output).not.toContain(recallQuestions[0].prompt);
  });

  test("rejects unknown or over-budget route candidates", () => {
    expect(() => parseRouteResponse('{"candidates":["NOPE"]}')).toThrow();
    expect(() => parseRouteResponse('{"candidates":["SHILU-S01","SHILU-S01"]}')).toThrow();
    expect(() => parseRouteResponse(JSON.stringify({ candidates: recallSources.slice(0, 6).map(({ id }) => id) }))).toThrow();
  });

  test("scores routing and source-grounded citations mechanically", () => {
    const question = recallQuestions[0];
    const route = parseRouteResponse('{"candidates":["SHILU-S03","SHILU-S01","SHILU-S02"]}');
    const answer = parseAnswerResponse('{"claims":[{"claimId":"Q1-C1","valueKey":"entries-and-raw-sources","citations":[{"sourceId":"SHILU-S01","anchor":"Principles"}]},{"claimId":"Q1-C2","valueKey":"indexes","citations":[{"sourceId":"SHILU-S03","anchor":"Indexes / Vector Index / Graph Index"}]}]}');
    expect(scoreRecallTrial(question, route, answer)).toMatchObject({
      hitAt1: true,
      recallAt3: 1,
      reciprocalRank: 1,
      answerAccuracy: 1,
      citationPrecision: 1,
      citationCoverage: 1,
      groundedSuccess: true,
    });
    const unsupported = parseAnswerResponse('{"claims":[{"claimId":"Q1-C1","valueKey":"entries-and-raw-sources","citations":[{"sourceId":"SHILU-S03","anchor":"Indexes / Vector Index / Graph Index"}]},{"claimId":"Q1-C2","valueKey":"indexes","citations":[{"sourceId":"SHILU-S03","anchor":"Indexes / Vector Index / Graph Index"}]}]}');
    expect(scoreRecallTrial(question, route, unsupported).groundedSuccess).toBe(false);
    const contradictedKeys = parseAnswerResponse('{"claims":[{"claimId":"Q1-C1","valueKey":"retrieval-index","citations":[{"sourceId":"SHILU-S01","anchor":"Principles"}]},{"claimId":"Q1-C2","valueKey":"nothing","citations":[{"sourceId":"SHILU-S03","anchor":"Indexes / Vector Index / Graph Index"}]}]}');
    expect(scoreRecallTrial(question, route, contradictedKeys)).toMatchObject({ answerAccuracy: 0, groundedSuccess: false });
    expect(() => parseAnswerResponse('{"claims":[{"claimId":"Q1-C1","valueKey":"entries-and-raw-sources","value":"Entries are not authoritative","citations":[]}]}')).toThrow();
  });
});
