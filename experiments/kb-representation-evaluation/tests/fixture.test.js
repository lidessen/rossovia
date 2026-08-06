import { describe, expect, test } from "bun:test";
import { edges, nodes, publicQuestions, scoreAnswers, svgRepresentation, textRepresentation } from "../src/fixture.js";
import { diagnosticArtifacts, diagnosticQuestions, imageDiagnosticVariants, scoreDiagnosticAnswers } from "../src/image-diagnostic.js";
import { summarizeEvidence } from "../src/evidence-summary.js";
import { answerTextFromEvents, parseAnswerArray, parseOpenCodeJsonl, usageFromEvents } from "../src/opencode-probe.js";

describe("matched KB representations", () => {
  test("text and SVG contain every node and directed typed edge", () => {
    const text = textRepresentation();
    const svg = svgRepresentation();
    for (const node of nodes) {
      expect(text).toContain(`NODE\t${node.id}\t${node.label}`);
      expect(svg).toContain(node.id);
      expect(svg).toContain(node.label);
    }
    for (const edge of edges) {
      expect(text).toContain(`EDGE\t${edge.from}\t${edge.relation}\t${edge.to}`);
      expect(svg).toContain(edge.relation);
    }
  });

  test("worker-visible questions do not disclose answer keys", () => {
    expect(publicQuestions()).toHaveLength(7);
    expect(publicQuestions().every((question) => !("answer" in question))).toBe(true);
  });

  test("mechanical scoring separates exact answers by task family", () => {
    const result = scoreAnswers([
      { id: "local-1", answer: " N05 " },
      { id: "local-2", answer: "checks" },
      { id: "multihop-1", answer: "wrong" },
    ]);
    expect(result.passed).toBe(2);
    expect(result.byFamily.local).toEqual({ passed: 2, total: 2 });
    expect(result.byFamily.multihop).toEqual({ passed: 0, total: 2 });
    expect(result.byFamily.global).toEqual({ passed: 0, total: 3 });
  });
});

describe("OpenCode probe evidence parsing", () => {
  test("retains structured answers and provider usage from JSONL events", () => {
    const output = [
      JSON.stringify({ type: "text", part: { text: '[{"id":"edge-positive","answer":"yes"}]' } }),
      JSON.stringify({ type: "step_finish", part: { reason: "stop", tokens: { total: 10, input: 4, output: 6 }, cost: 0.01 } }),
    ].join("\n");
    const events = parseOpenCodeJsonl(output);
    expect(parseAnswerArray(answerTextFromEvents(events))).toEqual([{ id: "edge-positive", answer: "yes" }]);
    expect(usageFromEvents(events)).toEqual({ tokens: { total: 10, input: 4, output: 6 }, cost: 0.01, reason: "stop" });
  });
});

describe("retained evidence summary", () => {
  test("derives accuracy, failures, resource observations, and input sizes from trials", () => {
    const summary = summarizeEvidence([
      {
        tier: "dense",
        durationMs: 20,
        input: { bytes: 100 },
        score: { passed: 1, total: 2, results: [{ id: "edge", pass: true }, { id: "indegree", pass: false }] },
        usage: { cost: 0.02, tokens: { total: 12, input: 2, output: 10, reasoning: 0, cache: { write: 5, read: 0 } } },
      },
      {
        tier: "dense",
        durationMs: 30,
        input: { bytes: 100 },
        score: { passed: 2, total: 2, results: [{ id: "edge", pass: true }, { id: "indegree", pass: true }] },
        usage: { cost: 0.03, tokens: { total: 15, input: 2, output: 13, reasoning: 0, cache: { write: 0, read: 5 } } },
      },
    ]);
    expect(summary).toMatchObject({
      trials: 2,
      passed: 3,
      questions: 4,
      accuracy: 0.75,
      failures: { indegree: 1 },
      latencyMs: { mean: 25, min: 20, max: 30 },
      observedCost: { total: 0.05, mean: 0.025, min: 0.02, max: 0.03 },
      tokens: { total: 27, input: 4, output: 23, reasoning: 0, cacheWrite: 5, cacheRead: 5 },
      inputBytes: { dense: 100 },
    });
  });
});

describe("image edge-comprehension gate", () => {
  test("holds node count fixed while edge density increases", () => {
    expect(imageDiagnosticVariants.map((variant) => variant.nodes.length)).toEqual([15, 15, 15]);
    expect(imageDiagnosticVariants.map((variant) => variant.edges.length)).toEqual([13, 22, 34]);
  });

  test("every tier keeps answer keys out of the worker packet", () => {
    for (const variant of imageDiagnosticVariants) {
      const artifacts = diagnosticArtifacts(variant);
      expect(artifacts.svg).toContain(variant.id);
      expect(JSON.parse(artifacts.questions).every((question) => !("answer" in question))).toBe(true);
    }
  });

  test("diagnostic scoring retains edge, direction, negative, chain, and incident failures", () => {
    const dense = imageDiagnosticVariants.find((variant) => variant.tier === "dense");
    const answers = diagnosticQuestions(dense).map((question) => ({ id: question.id, answer: question.answer }));
    answers.find((answer) => answer.id === "edge-direction").answer = "yes";
    const result = scoreDiagnosticAnswers(dense, answers);
    expect(result).toMatchObject({ passed: 7, total: 8 });
    expect(result.results.find((entry) => entry.id === "edge-direction").pass).toBe(false);
  });
});
