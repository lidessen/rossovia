import { resolve } from "node:path";
import { recallQuestions } from "../src/recall-fixture.js";

const root = resolve(import.meta.dir, "..");
const evidenceId = Bun.argv[2] ?? "2026-08-06-qwen37-associative-recall-v1";
const evidenceRoot = resolve(root, "evidence", evidenceId);
const trialNames = [...new Bun.Glob("trial-*.json").scanSync({ cwd: evidenceRoot })].sort();
if (!trialNames.length) throw new Error(`No trial records in ${evidenceRoot}`);
const trials = await Promise.all(trialNames.map((name) => Bun.file(resolve(evidenceRoot, name)).json()));

function sum(rows, value) {
  return rows.reduce((total, row) => total + value(row), 0);
}

function sourceOnly(condition) {
  const rows = trials.filter((trial) => trial.condition === condition);
  let submitted = 0;
  let correct = 0;
  let covered = 0;
  let claims = 0;
  let strictGrounded = 0;
  for (const row of rows) {
    const question = recallQuestions.find(({ id }) => id === row.question.id);
    let rowGrounded = Boolean(row.answer);
    for (const expected of question.claims) {
      claims += 1;
      const actual = row.answer?.claims?.find(({ claimId }) => claimId === expected.id);
      const answerCorrect = actual?.valueKey === expected.expectedKey;
      const citations = actual?.citations ?? [];
      const supported = citations.filter((citation) => (
        row.route.candidates.includes(citation.sourceId) && expected.support.includes(citation.sourceId)
      ));
      submitted += citations.length;
      if (answerCorrect) correct += supported.length;
      if (answerCorrect && supported.length) covered += 1;
      if (!answerCorrect || !supported.length || supported.length !== citations.length) rowGrounded = false;
    }
    if (rowGrounded) strictGrounded += 1;
  }
  return {
    method: "Post-hoc diagnostic: ignore anchor spelling; require opened source membership in the pre-registered claim support allowlist. The allowlist is not exhaustive semantic judgment.",
    submittedCitations: submitted,
    allowlistedCitations: correct,
    citationPrecision: correct / submitted,
    citationCoverage: covered / claims,
    strictGroundedTrials: strictGrounded,
    trials: rows.length,
  };
}

function resources(condition) {
  const rows = trials.filter((trial) => trial.condition === condition);
  const stage = (key) => ({
    calls: rows.filter((row) => row[key]).length,
    durationMs: sum(rows, (row) => row[key]?.durationMs ?? 0),
    observedCost: sum(rows, (row) => row[key]?.usage?.cost ?? 0),
  });
  return {
    route: stage("routeRun"),
    answer: stage("answerRun"),
    totalDurationMs: sum(rows, (row) => (row.routeRun?.durationMs ?? 0) + (row.answerRun?.durationMs ?? 0)),
    totalObservedCost: sum(rows, (row) => (row.routeRun?.usage?.cost ?? 0) + (row.answerRun?.usage?.cost ?? 0)),
    meanActivationBytes: sum(rows, (row) => row.activation.bytes) / rows.length,
    meanSelectedSourceBytes: sum(rows, (row) => row.sourcePacket?.bytes ?? 0) / rows.length,
  };
}

const analysis = {
  evidenceId,
  status: "post-hoc-diagnostic",
  rawSummaryUnchanged: "summary.json",
  byCondition: Object.fromEntries(["image", "search"].map((condition) => [condition, {
    sourceOnly: sourceOnly(condition),
    resources: resources(condition),
  }])),
};
await Bun.write(resolve(evidenceRoot, "posthoc-analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify(analysis, null, 2));
