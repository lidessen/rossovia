import { describe, expect, test } from "bun:test";
// @ts-expect-error app.js is the browser entrypoint; this test imports its pure attention export.
import { classifyWorkbenchAttention } from "../../gateway/ui/app.js";

describe("Workbench Principal attention", () => {
  test("separates Principal decisions from system recovery by next-actor truth", () => {
    const meowAskDecision = {
      id: "principal-task:meowask",
      title: "Decide the MeowAsk result",
      nextActor: "principal",
      attention: "decision-required",
    };
    const staleRunnerRecovery = {
      id: "attention:runner-unreachable:skills:runner-old",
      title: "Old runner is unreachable",
      nextActor: "system",
      attention: "exception",
    };
    const activeAgentWork = {
      id: "runner:current",
      title: "Agent is implementing",
      nextActor: "agent",
      attention: "normal",
    };

    const result = classifyWorkbenchAttention([
      staleRunnerRecovery,
      activeAgentWork,
      meowAskDecision,
    ]);

    expect(result.principal).toEqual([meowAskDecision]);
    expect(result.system).toEqual([staleRunnerRecovery]);
  });

  test("does not promote an exception when the next actor is not Principal", () => {
    const result = classifyWorkbenchAttention([
      { id: "system", nextActor: "system", attention: "exception" },
      { id: "external", nextActor: "external", attention: "exception" },
    ]);

    expect(result.principal).toEqual([]);
    expect(result.system).toEqual([
      { id: "system", nextActor: "system", attention: "exception" },
    ]);
  });
});
