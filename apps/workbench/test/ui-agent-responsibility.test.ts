import { describe, expect, test } from "bun:test";
// @ts-expect-error app.js is the browser entrypoint; this test imports pure responsibility exports.
import * as agentResponsibility from "../ui/app.js";

const {
  classifyAgentResponsibility,
  isExactLiveAgentWork,
  isPendingAgentWork,
} = agentResponsibility;

describe("Workbench Agent responsibility", () => {
  test("preserves the observed snapshot relation: one waiting for Agent and no live Agent", () => {
    const waitingTask = {
      id: "principal-task:blog-follow-up",
      kind: "principal-task",
      lifecycle: "open",
      nextActor: "agent",
      evidence: { freshness: { kind: "current" } },
    };
    const principalDecision = {
      id: "principal-task:meowask-decision",
      kind: "principal-task",
      lifecycle: "open",
      nextActor: "principal",
    };

    const result = classifyAgentResponsibility([
      principalDecision,
      waitingTask,
    ]);

    expect(result.live).toEqual([]);
    expect(result.pending).toEqual([waitingTask]);
  });

  test("admits only exact live Agent work and keeps the two lists disjoint", () => {
    const live = {
      id: "agent-work:live",
      kind: "agent-work",
      lifecycle: "in-progress",
      nextActor: "agent",
      evidence: { freshness: { kind: "live" } },
    };
    const cached = {
      ...live,
      id: "agent-work:cached",
      evidence: { freshness: { kind: "cached" } },
    };
    const settled = {
      ...live,
      id: "agent-work:settled",
      lifecycle: "settled",
    };
    const wrongKind = {
      ...live,
      id: "principal-task:looks-live",
      kind: "principal-task",
    };

    expect(isExactLiveAgentWork(live)).toBeTrue();
    expect(isPendingAgentWork(live)).toBeFalse();
    expect(classifyAgentResponsibility([live, cached, settled, wrongKind])).toEqual({
      live: [live],
      pending: [cached, settled, wrongKind],
    });
  });

  test("does not turn another actor's work into pending Agent responsibility", () => {
    expect(isPendingAgentWork({ nextActor: "principal" })).toBeFalse();
    expect(isPendingAgentWork({ nextActor: "system" })).toBeFalse();
    expect(isPendingAgentWork({ nextActor: "external" })).toBeFalse();
  });
});
