import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  buildRecallV2Order,
  parseAnswerResponseV2,
  publicRecallV2Questions,
  recallV2ConfirmationQuestions,
  recallV2DevelopmentQuestions,
  recallV2Sources,
  scoreRecallTrialV2,
  sourcePacketV2,
  validateRecallV2Contract,
} from "../src/recall-v2.js";
import { rankRecallConcepts, rankTextSearch, recallAssociations } from "../src/recall-fixture.js";

const root = resolve(import.meta.dir, "..");

async function digest(relativePath) {
  const bytes = await Bun.file(resolve(root, relativePath)).arrayBuffer();
  const value = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${[...new Uint8Array(value)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

describe("associative recall v2 contract", () => {
  test("preserves the exact retained v1 identities", async () => {
    expect(await digest("fixtures/recall-v1/manifest.json")).toBe("sha256:d9c91dd8b7a95524af83f23d9d22fb4672a9ee525395ec6489608ac2930062b8");
    expect(await digest("scripts/run-recall-probe.js")).toBe("sha256:f53971171d833116e4c2e3a244486b63994db907846caba6dfb260ee7911fc86");
    expect(await digest("src/recall-fixture.js")).toBe("sha256:753893780534564dddb1c7ba5c5858b4ccac3502964e5cac1c379e3cb650c081");
    expect(await digest("fixtures/recall-v1/worker-profile/opencode.json")).toBe("sha256:60040202dd0a84f495a6125d01c11213dfd71dce2615b01fa16b21536ce59fbe");
  });

  test("validates unique opaque anchors and evidence groups", () => {
    expect(validateRecallV2Contract([...recallV2DevelopmentQuestions, ...recallV2ConfirmationQuestions])).toBe(true);
    const anchorIds = recallV2Sources.flatMap((source) => source.passages.map((passage) => passage.anchorId));
    expect(new Set(anchorIds).size).toBe(anchorIds.length);
    expect(anchorIds.every((anchorId) => /^an_[a-z0-9]{4}$/.test(anchorId))).toBe(true);
  });

  test("keeps evaluator fields out of public questions", () => {
    const packet = JSON.stringify(publicRecallV2Questions(recallV2ConfirmationQuestions));
    for (const hidden of ["retrievalRelevantSourceIds", "expectedKey", "allowedSupportAnchors", "requiredEvidenceGroups", "anchorId", "sourceId"]) {
      expect(packet).not.toContain(hidden);
    }
  });

  test("keeps every confirmation case reachable in both frozen routing profiles", () => {
    for (const question of recallV2ConfirmationQuestions) {
      const searchIds = new Set(rankTextSearch(question.prompt).map((source) => source.id));
      const activeConceptIds = new Set(rankRecallConcepts(question.prompt).map((concept) => concept.id));
      const graphIds = new Set(recallAssociations.filter(([conceptId]) => activeConceptIds.has(conceptId)).map(([, sourceId]) => sourceId));
      for (const sourceId of question.retrievalRelevantSourceIds) {
        expect(searchIds.has(sourceId)).toBe(true);
        expect(graphIds.has(sourceId)).toBe(true);
      }
    }
  });

  test("balances and reverses the two confirmation repetitions", () => {
    expect(buildRecallV2Order(recallV2ConfirmationQuestions, 2)).toEqual([
      { repetition: 1, questionId: "V2-Q1", condition: "image" },
      { repetition: 1, questionId: "V2-Q1", condition: "search" },
      { repetition: 1, questionId: "V2-Q2", condition: "search" },
      { repetition: 1, questionId: "V2-Q2", condition: "image" },
      { repetition: 1, questionId: "V2-Q3", condition: "image" },
      { repetition: 1, questionId: "V2-Q3", condition: "search" },
      { repetition: 1, questionId: "V2-Q4", condition: "search" },
      { repetition: 1, questionId: "V2-Q4", condition: "image" },
      { repetition: 2, questionId: "V2-Q4", condition: "image" },
      { repetition: 2, questionId: "V2-Q4", condition: "search" },
      { repetition: 2, questionId: "V2-Q3", condition: "search" },
      { repetition: 2, questionId: "V2-Q3", condition: "image" },
      { repetition: 2, questionId: "V2-Q2", condition: "image" },
      { repetition: 2, questionId: "V2-Q2", condition: "search" },
      { repetition: 2, questionId: "V2-Q1", condition: "search" },
      { repetition: 2, questionId: "V2-Q1", condition: "image" },
    ]);
  });

  test("exposes only opaque citation coordinates in opened source packets", () => {
    const packet = sourcePacketV2(["SHILU-S10"]);
    expect(packet).toContain("AnchorId: an_596e");
    expect(packet).toContain("AnchorId: an_29ad");
    expect(packet).not.toContain("Location:");
    expect(packet).not.toContain("pkg/index/index.go");
    expect(packet).not.toContain("blob ");
  });

  test("accepts only the v2 answer shape", () => {
    expect(parseAnswerResponseV2('{"claims":[{"claimId":"V2-Q3-C1","valueKey":"or-join-allows-partial-recall","citations":[{"sourceId":"SHILU-S10","anchorId":"an_29ad"}]}]}').claims).toHaveLength(1);
    expect(() => parseAnswerResponseV2('{"claims":[{"claimId":"V2-Q3-C1","valueKey":"or-join-allows-partial-recall","citations":[{"sourceId":"SHILU-S10","anchor":"ftsQuery"}]}]}')).toThrow();
  });

  test("scores precise citations and required evidence groups independently", () => {
    const question = recallV2ConfirmationQuestions[3];
    const route = { candidates: ["SHILU-S12"] };
    const complete = parseAnswerResponseV2('{"claims":[{"claimId":"V2-Q4-C1","valueKey":"entry-already-persisted","citations":[{"sourceId":"SHILU-S12","anchorId":"an_922b"}]},{"claimId":"V2-Q4-C2","valueKey":"creation-event-not-recorded","citations":[{"sourceId":"SHILU-S12","anchorId":"an_922b"},{"sourceId":"SHILU-S12","anchorId":"an_d8e5"}]}]}');
    expect(scoreRecallTrialV2(question, route, complete)).toMatchObject({
      answerAccuracy: 1,
      citationPrecision: 1,
      citationCoverage: 1,
      submittedCitationCount: 3,
      correctCitationCount: 3,
      requiredEvidenceGroupCount: 3,
      coveredEvidenceGroupCount: 3,
      groundedSuccess: true,
    });
    const incomplete = parseAnswerResponseV2('{"claims":[{"claimId":"V2-Q4-C1","valueKey":"entry-already-persisted","citations":[{"sourceId":"SHILU-S12","anchorId":"an_922b"}]},{"claimId":"V2-Q4-C2","valueKey":"creation-event-not-recorded","citations":[{"sourceId":"SHILU-S12","anchorId":"an_922b"}]}]}');
    expect(scoreRecallTrialV2(question, route, incomplete)).toMatchObject({
      citationPrecision: 1,
      citationCoverage: 2 / 3,
      groundedSuccess: false,
    });
    const wrongAnswer = parseAnswerResponseV2('{"claims":[{"claimId":"V2-Q4-C1","valueKey":"entry-write-rolled-back","citations":[{"sourceId":"SHILU-S12","anchorId":"an_922b"}]},{"claimId":"V2-Q4-C2","valueKey":"creation-event-not-recorded","citations":[{"sourceId":"SHILU-S12","anchorId":"an_922b"},{"sourceId":"SHILU-S12","anchorId":"an_d8e5"}]}]}');
    expect(scoreRecallTrialV2(question, route, wrongAnswer)).toMatchObject({
      answerAccuracy: 0.5,
      citationPrecision: 1,
      citationCoverage: 1,
      groundedSuccess: false,
    });
  });

  test("penalizes unsupported extras without rejecting truthful redundancy", () => {
    const question = recallV2DevelopmentQuestions[0];
    const redundant = parseAnswerResponseV2('{"claims":[{"claimId":"Q1-C1","valueKey":"entries-and-raw-sources","citations":[{"sourceId":"SHILU-S01","anchorId":"an_51c0"},{"sourceId":"SHILU-S02","anchorId":"an_1d21"}]},{"claimId":"Q1-C2","valueKey":"indexes","citations":[{"sourceId":"SHILU-S03","anchorId":"an_0c40"}]}]}');
    expect(scoreRecallTrialV2(question, { candidates: ["SHILU-S01", "SHILU-S02", "SHILU-S03"] }, redundant)).toMatchObject({
      citationPrecision: 1,
      citationCoverage: 1,
      groundedSuccess: true,
    });
    const unsupported = parseAnswerResponseV2('{"claims":[{"claimId":"Q1-C1","valueKey":"entries-and-raw-sources","citations":[{"sourceId":"SHILU-S01","anchorId":"an_51c0"},{"sourceId":"SHILU-S05","anchorId":"an_5a31"}]},{"claimId":"Q1-C2","valueKey":"indexes","citations":[{"sourceId":"SHILU-S03","anchorId":"an_0c40"}]}]}');
    expect(scoreRecallTrialV2(question, { candidates: ["SHILU-S01", "SHILU-S03", "SHILU-S05"] }, unsupported)).toMatchObject({
      citationPrecision: 2 / 3,
      citationCoverage: 1,
      groundedSuccess: false,
    });
  });

  test("allows grounding from support outside the retrieval-relevance set", () => {
    const question = recallV2DevelopmentQuestions[0];
    const answer = parseAnswerResponseV2('{"claims":[{"claimId":"Q1-C1","valueKey":"entries-and-raw-sources","citations":[{"sourceId":"SHILU-S02","anchorId":"an_1d20"},{"sourceId":"SHILU-S02","anchorId":"an_1d21"}]},{"claimId":"Q1-C2","valueKey":"indexes","citations":[{"sourceId":"SHILU-S02","anchorId":"an_1d22"}]}]}');
    expect(scoreRecallTrialV2(question, { candidates: ["SHILU-S02"] }, answer)).toMatchObject({
      recallAt5: 0,
      citationPrecision: 1,
      citationCoverage: 1,
      groundedSuccess: true,
    });
  });

  test("requires every facet of compound development claims", () => {
    const q1 = recallV2DevelopmentQuestions[0];
    const incompleteQ1 = parseAnswerResponseV2('{"claims":[{"claimId":"Q1-C1","valueKey":"entries-and-raw-sources","citations":[{"sourceId":"SHILU-S02","anchorId":"an_1d20"}]},{"claimId":"Q1-C2","valueKey":"indexes","citations":[{"sourceId":"SHILU-S02","anchorId":"an_1d22"}]}]}');
    expect(scoreRecallTrialV2(q1, { candidates: ["SHILU-S02"] }, incompleteQ1)).toMatchObject({ citationPrecision: 1, citationCoverage: 2 / 3, groundedSuccess: false });
    const q6 = recallV2DevelopmentQuestions[5];
    expect(q6.claims[0].requiredEvidenceGroups).toHaveLength(3);
  });

  test("requires implementation evidence for the human provenance exemption", () => {
    const q2ImplementationClaim = recallV2DevelopmentQuestions[1].claims[1];
    expect(q2ImplementationClaim.allowedSupportAnchors).toEqual([{ sourceId: "SHILU-S09", anchorId: "an_98b0" }]);
    expect(q2ImplementationClaim.requiredEvidenceGroups[0].anyOf).toEqual([{ sourceId: "SHILU-S09", anchorId: "an_98b0" }]);
  });
});
