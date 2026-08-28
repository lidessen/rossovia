import {
  GRAPH_POLICY,
  UPSTREAM,
  parseRouteResponse,
  rankTextSearch,
  recallQuestions,
  recallSources,
  recallSvgRepresentation,
} from "./recall-fixture.js";

export const RECALL_V2_FIXTURE_ID = "shilu-associative-recall-v2";

function excerpt(sourceId, start, end = null) {
  const source = recallSources.find((candidate) => candidate.id === sourceId);
  if (!source) throw new Error(`Unknown source ${sourceId}.`);
  const from = start ? source.content.indexOf(start) : 0;
  const to = end ? source.content.indexOf(end) : source.content.length;
  if (from < 0 || to < 0 || to <= from) throw new Error(`Cannot slice ${sourceId} from ${start} to ${end}.`);
  return source.content.slice(from, to).trim();
}

const passageBlueprints = [
  ["SHILU-S01", [["an_51c0", null, null]]],
  ["SHILU-S02", [
    ["an_1d20", "### Source", "### Entry"],
    ["an_1d21", "### Entry", "### Entry Event"],
    ["an_1d22", "### Entry Event", null],
  ]],
  ["SHILU-S03", [
    ["an_0c40", "## Indexes", "### Graph Index"],
    ["an_0c4e", "### Graph Index", null],
  ]],
  ["SHILU-S04", [
    ["an_824e", "## Agent Interaction", "## Incremental Knowledge Workflow"],
    ["an_73cf", "## Incremental Knowledge Workflow", null],
  ]],
  ["SHILU-S05", [
    ["an_5a31", "### MCP Writes", "### Validation Rules"],
    ["an_773d", "### Validation Rules", null],
  ]],
  ["SHILU-S06", [["an_6c60", null, null]]],
  ["SHILU-S07", [
    ["an_7a10", "// Normalize", "// StoreRaw"],
    ["an_7a11", "// StoreRaw", null],
  ]],
  ["SHILU-S08", [["an_40c1", null, null]]],
  ["SHILU-S09", [["an_98b0", null, null]]],
  ["SHILU-S10", [
    ["an_596e", "// ftsQuery", "// OR-join tokens"],
    ["an_29ad", "// OR-join tokens", "// Rebuild"],
    ["an_aa10", "// Rebuild", null],
  ]],
  ["SHILU-S11", [
    ["an_5f10", "// DigestRequest", "// DigestResult"],
    ["an_6e2a", "// DigestResult", null],
  ]],
  ["SHILU-S12", [
    ["an_922b", "// CreateEntry", "if err := c.recordEvent"],
    ["an_d8e5", "if err := c.recordEvent", "// SupersedeEntry"],
    ["an_b531", "// SupersedeEntry", null],
  ]],
];

export const recallV2Sources = passageBlueprints.map(([sourceId, blueprints]) => {
  const source = recallSources.find((candidate) => candidate.id === sourceId);
  return {
    sourceId,
    locator: {
      repository: UPSTREAM.repository,
      commit: UPSTREAM.commit,
      path: source.path,
      lines: source.lines,
      blob: source.blob,
    },
    passages: blueprints.map(([anchorId, start, end]) => ({
      anchorId,
      content: excerpt(sourceId, start, end),
    })),
  };
});

const anchorBySource = new Map(recallV2Sources.flatMap((source) => (
  source.passages.map((passage) => [`${source.sourceId}:${passage.anchorId}`, { sourceId: source.sourceId, anchorId: passage.anchorId }])
)));

function cite(sourceId, anchorId) {
  const target = anchorBySource.get(`${sourceId}:${anchorId}`);
  if (!target) throw new Error(`Unknown v2 citation target ${sourceId}:${anchorId}.`);
  return target;
}

function claim(id, prompt, options, expectedKey, allowedSupportAnchors, requiredGroups = [allowedSupportAnchors]) {
  return {
    id,
    prompt,
    options,
    expectedKey,
    allowedSupportAnchors,
    requiredEvidenceGroups: requiredGroups.map((anyOf, index) => ({ groupId: `${id}-G${index + 1}`, anyOf })),
  };
}

const developmentSupport = {
  "Q1-C1": [cite("SHILU-S01", "an_51c0"), cite("SHILU-S02", "an_1d20"), cite("SHILU-S02", "an_1d21"), cite("SHILU-S03", "an_0c40")],
  "Q1-C2": [cite("SHILU-S01", "an_51c0"), cite("SHILU-S02", "an_1d22"), cite("SHILU-S03", "an_0c40")],
  "Q2-C1": [cite("SHILU-S05", "an_773d"), cite("SHILU-S09", "an_98b0")],
  "Q2-C2": [cite("SHILU-S09", "an_98b0")],
  "Q3-C1": [cite("SHILU-S02", "an_1d20"), cite("SHILU-S06", "an_6c60"), cite("SHILU-S07", "an_7a10")],
  "Q3-C2": [cite("SHILU-S06", "an_6c60"), cite("SHILU-S07", "an_7a11")],
  "Q4-C1": [cite("SHILU-S12", "an_b531")],
  "Q4-C2": [cite("SHILU-S02", "an_1d22"), cite("SHILU-S08", "an_40c1"), cite("SHILU-S12", "an_b531")],
  "Q5-C1": [cite("SHILU-S11", "an_5f10")],
  "Q5-C2": [cite("SHILU-S01", "an_51c0"), cite("SHILU-S04", "an_824e"), cite("SHILU-S08", "an_40c1"), cite("SHILU-S11", "an_6e2a")],
  "Q6-C1": [cite("SHILU-S01", "an_51c0"), cite("SHILU-S02", "an_1d20"), cite("SHILU-S02", "an_1d21"), cite("SHILU-S02", "an_1d22"), cite("SHILU-S03", "an_0c40")],
  "Q6-C2": [cite("SHILU-S10", "an_aa10")],
};

const developmentRequiredGroups = {
  "Q1-C1": [
    [cite("SHILU-S01", "an_51c0"), cite("SHILU-S02", "an_1d21"), cite("SHILU-S03", "an_0c40")],
    [cite("SHILU-S01", "an_51c0"), cite("SHILU-S02", "an_1d20")],
  ],
  "Q6-C1": [
    [cite("SHILU-S01", "an_51c0"), cite("SHILU-S02", "an_1d20"), cite("SHILU-S03", "an_0c40")],
    [cite("SHILU-S01", "an_51c0"), cite("SHILU-S02", "an_1d21"), cite("SHILU-S03", "an_0c40")],
    [cite("SHILU-S02", "an_1d22"), cite("SHILU-S03", "an_0c40")],
  ],
};

export const recallV2DevelopmentQuestions = recallQuestions.map((question) => ({
  id: question.id,
  prompt: question.prompt,
  retrievalRelevantSourceIds: [...question.gold],
  claims: question.claims.map((original) => claim(
    original.id,
    original.prompt,
    [...original.options],
    original.expectedKey,
    developmentSupport[original.id],
    developmentRequiredGroups[original.id] ?? [developmentSupport[original.id]],
  )),
}));

export const recallV2ConfirmationQuestions = [
  {
    id: "V2-Q1",
    prompt: "A transcript arrives while the optional model is unavailable. Which system boundary still applies, and what two actions begin the durable knowledge workflow before interpretation?",
    retrievalRelevantSourceIds: ["SHILU-S01", "SHILU-S04"],
    claims: [
      claim("V2-Q1-C1", "What remains true when the model is unavailable?", ["ai-optional-not-core-dependency", "capture-must-stop", "provider-becomes-authority", "unknown"], "ai-optional-not-core-dependency", [cite("SHILU-S01", "an_51c0")]),
      claim("V2-Q1-C2", "Which two actions begin the durable workflow?", ["register-source-then-enqueue-digest", "generate-index-then-delete-source", "commit-entry-then-capture", "unknown"], "register-source-then-enqueue-digest", [cite("SHILU-S04", "an_73cf")]),
    ],
  },
  {
    id: "V2-Q2",
    prompt: "Two stored entries are incompatible, but neither is established as the newer rule. Which relationship projection can represent that fact, and which decision branch remains available before commit?",
    retrievalRelevantSourceIds: ["SHILU-S03", "SHILU-S04"],
    claims: [
      claim("V2-Q2-C1", "Which relationship represents unresolved incompatibility?", ["contradicts-relation", "supersedes-relation", "same-as-relation", "delete-old-entry"], "contradicts-relation", [cite("SHILU-S03", "an_0c4e")]),
      claim("V2-Q2-C2", "Which branch remains available before commit?", ["review-before-commit-option", "forced-supersession", "index-only-resolution", "silent-overwrite"], "review-before-commit-option", [cite("SHILU-S04", "an_73cf")]),
    ],
  },
  {
    id: "V2-Q3",
    prompt: "For a multi-word search containing operator-looking text, the early prose says tokens are implicitly ANDed, while the return expression is built later. What behavior does the implementation actually produce, and how are special-looking tokens protected?",
    retrievalRelevantSourceIds: ["SHILU-S10"],
    claims: [
      claim("V2-Q3-C1", "How are multiple tokens combined by the implementation?", ["or-join-allows-partial-recall", "implicit-and-requires-all", "raw-query-forwarded", "unknown"], "or-join-allows-partial-recall", [cite("SHILU-S10", "an_29ad")]),
      claim("V2-Q3-C2", "How are operator-looking tokens protected?", ["quote-tokens-as-literals", "strip-all-punctuation", "execute-as-fts-operators", "unknown"], "quote-tokens-as-literals", [cite("SHILU-S10", "an_596e")]),
    ],
  },
  {
    id: "V2-Q4",
    prompt: "During entry creation, catalog indexing returns an error. According to the implementation's operation order, what has happened to the entry, and has its creation event been recorded before the error returns?",
    retrievalRelevantSourceIds: ["SHILU-S12"],
    claims: [
      claim("V2-Q4-C1", "What has happened to the entry?", ["entry-already-persisted", "entry-write-rolled-back", "entry-not-validated", "unknown"], "entry-already-persisted", [cite("SHILU-S12", "an_922b")]),
      claim(
        "V2-Q4-C2",
        "Has the creation event been recorded before the indexing error returns?",
        ["creation-event-not-recorded", "creation-event-recorded-first", "event-status-unknown", "no-event-design"],
        "creation-event-not-recorded",
        [cite("SHILU-S12", "an_922b"), cite("SHILU-S12", "an_d8e5")],
        [[cite("SHILU-S12", "an_922b")], [cite("SHILU-S12", "an_d8e5")]],
      ),
    ],
  },
];

export function publicRecallV2Questions(questions) {
  return questions.map(({ retrievalRelevantSourceIds: _retrieval, claims, ...question }) => ({
    ...question,
    claims: claims.map(({ expectedKey: _expected, allowedSupportAnchors: _allowed, requiredEvidenceGroups: _groups, ...publicClaim }) => publicClaim),
  }));
}

export function buildRecallV2Order(questions, repetitions) {
  const order = [];
  for (let repetition = 0; repetition < repetitions; repetition += 1) {
    const orderedQuestions = repetition % 2 ? [...questions].reverse() : questions;
    for (const question of orderedQuestions) {
      const originalIndex = questions.findIndex((candidate) => candidate.id === question.id);
      const imageFirst = (originalIndex + repetition) % 2 === 0;
      const conditions = imageFirst ? ["image", "search"] : ["search", "image"];
      for (const condition of conditions) order.push({ repetition: repetition + 1, questionId: question.id, condition });
    }
  }
  return order;
}

export function recallV2SearchRepresentation(question) {
  return `${[
    `# ${RECALL_V2_FIXTURE_ID} deterministic BM25 search`,
    "# Ranked locator-only candidates. Titles are index metadata, not evidence.",
    ...rankTextSearch(question.prompt).map((result, index) => `RESULT\t${index + 1}\t${result.id}\t${result.title}\t${result.score.toFixed(6)}`),
  ].join("\n")}\n`;
}

export function recallV2SvgRepresentation(question) {
  return recallSvgRepresentation(question)
    .replace("Shilu associative recall ·", "Shilu associative recall v2 ·")
    .replace("Corpus-derived lossy routing projection", "V2 corpus-derived lossy routing projection");
}

export function sourcePacketV2(sourceIds) {
  const byId = new Map(recallV2Sources.map((source) => [source.sourceId, source]));
  return sourceIds.map((sourceId) => {
    const source = byId.get(sourceId);
    if (!source) throw new Error(`Unknown source ${sourceId}.`);
    return [
      `# ${sourceId}`,
      ...source.passages.flatMap((passage) => ["", `AnchorId: ${passage.anchorId}`, passage.content]),
    ].join("\n");
  }).join("\n\n---\n\n");
}

function stripFence(text) {
  const lines = text.trim().split("\n");
  if (lines[0]?.startsWith("```")) lines.shift();
  if (lines.at(-1)?.trim() === "```") lines.pop();
  return lines.join("\n").trim();
}

export function parseAnswerResponseV2(text) {
  const parsed = JSON.parse(stripFence(text));
  if (Object.keys(parsed ?? {}).length !== 1 || !Array.isArray(parsed?.claims) || parsed.claims.length === 0) {
    throw new TypeError("Answer output must contain a non-empty claims array.");
  }
  for (const submitted of parsed.claims) {
    if (Object.keys(submitted ?? {}).sort().join(",") !== "citations,claimId,valueKey"
      || typeof submitted.claimId !== "string" || typeof submitted.valueKey !== "string" || !Array.isArray(submitted.citations)) {
      throw new TypeError("Each claim must contain claimId, valueKey, and citations.");
    }
    if (submitted.citations.some((citation) => Object.keys(citation ?? {}).sort().join(",") !== "anchorId,sourceId"
      || typeof citation.sourceId !== "string" || typeof citation.anchorId !== "string")) {
      throw new TypeError("Each citation must contain sourceId and anchorId strings.");
    }
  }
  return parsed;
}

function sameTarget(left, right) {
  return left.sourceId === right.sourceId && left.anchorId === right.anchorId;
}

export function scoreRecallTrialV2(question, route, answer) {
  const ranks = question.retrievalRelevantSourceIds.map((id) => route.candidates.indexOf(id) + 1).filter(Boolean);
  const firstRank = ranks.length ? Math.min(...ranks) : null;
  const recallAt = (k) => question.retrievalRelevantSourceIds.filter((id) => route.candidates.slice(0, k).includes(id)).length / question.retrievalRelevantSourceIds.length;
  const knownTargets = new Set(anchorBySource.keys());
  const submittedClaims = new Map((answer?.claims ?? []).map((submitted) => [submitted.claimId, submitted]));
  const duplicateClaimIds = (answer?.claims ?? []).length !== submittedClaims.size;
  const claimResults = question.claims.map((expected) => {
    const submitted = submittedClaims.get(expected.id);
    const answerCorrect = Boolean(submitted) && submitted.valueKey === expected.expectedKey;
    const citations = (submitted?.citations ?? []).map((citation) => {
      const locatable = knownTargets.has(`${citation.sourceId}:${citation.anchorId}`);
      const opened = route.candidates.includes(citation.sourceId);
      const allowed = expected.allowedSupportAnchors.some((target) => sameTarget(target, citation));
      return { ...citation, locatable, opened, allowed, correct: locatable && opened && allowed };
    });
    const evidenceGroups = expected.requiredEvidenceGroups.map((group) => ({
      groupId: group.groupId,
      covered: citations.some((citation) => citation.correct && group.anyOf.some((target) => sameTarget(target, citation))),
    }));
    return {
      claimId: expected.id,
      expectedKey: expected.expectedKey,
      actualKey: submitted?.valueKey ?? null,
      answerCorrect,
      citations,
      evidenceGroups,
      fullyGrounded: answerCorrect && evidenceGroups.every((group) => group.covered),
    };
  });
  const submittedCitationCount = claimResults.reduce((sum, result) => sum + result.citations.length, 0);
  const correctCitationCount = claimResults.reduce((sum, result) => sum + result.citations.filter((citation) => citation.correct).length, 0);
  const requiredEvidenceGroupCount = claimResults.reduce((sum, result) => sum + result.evidenceGroups.length, 0);
  const coveredEvidenceGroupCount = claimResults.reduce((sum, result) => sum + result.evidenceGroups.filter((group) => group.covered).length, 0);
  const answerAccuracy = claimResults.filter((result) => result.answerCorrect).length / claimResults.length;
  const citationPrecision = submittedCitationCount ? correctCitationCount / submittedCitationCount : 0;
  const citationCoverage = requiredEvidenceGroupCount ? coveredEvidenceGroupCount / requiredEvidenceGroupCount : 0;
  const protocolValid = Boolean(answer) && !duplicateClaimIds && submittedClaims.size === question.claims.length
    && question.claims.every((expected) => submittedClaims.has(expected.id));
  const groundedSuccess = protocolValid && answerAccuracy === 1 && citationPrecision === 1 && citationCoverage === 1;
  return {
    retrievalRelevantSourceIds: question.retrievalRelevantSourceIds,
    candidates: route.candidates,
    hitAt1: recallAt(1) > 0,
    hitAt3: recallAt(3) > 0,
    hitAt5: recallAt(5) > 0,
    recallAt1: recallAt(1),
    recallAt3: recallAt(3),
    recallAt5: recallAt(5),
    allRelevantHitAt3: recallAt(3) === 1,
    allRelevantHitAt5: recallAt(5) === 1,
    reciprocalRank: firstRank ? 1 / firstRank : 0,
    openedSources: route.candidates.length,
    answerAccuracy,
    claimCount: claimResults.length,
    correctAnswerCount: claimResults.filter((result) => result.answerCorrect).length,
    citationPrecision,
    citationCoverage,
    submittedCitationCount,
    correctCitationCount,
    requiredEvidenceGroupCount,
    coveredEvidenceGroupCount,
    protocolValid,
    groundedSuccess,
    claimResults,
  };
}

export function validateRecallV2Contract(questions) {
  const anchorIds = recallV2Sources.flatMap((source) => source.passages.map((passage) => passage.anchorId));
  if (new Set(anchorIds).size !== anchorIds.length) throw new Error("V2 anchorId values must be globally unique.");
  const knownSourceIds = new Set(recallV2Sources.map((source) => source.sourceId));
  const knownTargets = new Set(anchorBySource.keys());
  for (const question of questions) {
    if (!question.retrievalRelevantSourceIds.length || question.retrievalRelevantSourceIds.some((id) => !knownSourceIds.has(id))) {
      throw new Error(`${question.id} has invalid retrieval relevance.`);
    }
    for (const expected of question.claims) {
      if (!expected.requiredEvidenceGroups.length || expected.requiredEvidenceGroups.some((group) => !group.anyOf.length)) {
        throw new Error(`${expected.id} must have non-empty evidence groups.`);
      }
      const allowed = new Set(expected.allowedSupportAnchors.map((target) => `${target.sourceId}:${target.anchorId}`));
      if (!allowed.size || [...allowed].some((target) => !knownTargets.has(target))) throw new Error(`${expected.id} has an invalid allowed target.`);
      for (const group of expected.requiredEvidenceGroups) {
        if (group.anyOf.some((target) => !allowed.has(`${target.sourceId}:${target.anchorId}`))) {
          throw new Error(`${expected.id} evidence group escapes its allowed support set.`);
        }
      }
    }
  }
  return true;
}

export { GRAPH_POLICY, UPSTREAM, parseRouteResponse };
