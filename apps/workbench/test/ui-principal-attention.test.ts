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

  test("keeps cached-only runner decisions out of Needs You until live proof", () => {
    const cachedInterrupted = {
      id: "attention:runner:runner-a",
      kind: "decision",
      lifecycle: "waiting",
      nextActor: "principal",
      attention: "decision-required",
      runnerId: "runner-a",
      attentionCode: "runner-interrupted",
      evidence: {
        freshness: {
          kind: "cached",
          sourceUpdatedAt: "2026-08-21T10:00:00Z",
          ageMs: 3600000,
        },
      },
    };
    const unverifiedAnchorPending = {
      ...cachedInterrupted,
      id: "attention:runner:runner-b",
      attentionCode: "runner-anchor-pending",
      evidence: {
        freshness: {
          kind: "unverified",
          observedAt: "2026-08-21T10:00:00Z",
          reason: "runner reachability was not verified",
        },
      },
    };
    const liveMigrationDecision = {
      ...cachedInterrupted,
      id: "attention:runner-anchor-migration-decision:registered:p:mission-a",
      attentionCode: "runner-anchor-migration-decision",
      evidence: {
        freshness: { kind: "live", observedAt: "2026-08-21T10:00:00Z" },
      },
    };

    const result = classifyWorkbenchAttention([
      cachedInterrupted,
      unverifiedAnchorPending,
      liveMigrationDecision,
    ]);

    // Cached-only / unverified runner scenes are retained history pending
    // disposition, never a current Principal action; only the live-proven
    // runner decision enters Needs You.
    expect(result.principal).toEqual([liveMigrationDecision]);
  });

  test("keeps a genuine non-runner Principal decision without runner freshness", () => {
    const awaitingAuthorization = {
      id: "attention:mission-execution-awaiting-authorization:registered:p:mission-a",
      kind: "decision",
      lifecycle: "waiting",
      nextActor: "principal",
      attention: "decision-required",
      attentionCode: "mission-execution-awaiting-authorization",
      evidence: {
        freshness: { kind: "observed-at-build", observedAt: "2026-08-21T10:00:00Z" },
      },
    };

    expect(classifyWorkbenchAttention([awaitingAuthorization]).principal).toEqual([
      awaitingAuthorization,
    ]);
  });

  test("assigns paused responsibility strictly by the projected next actor", () => {
    const pausedBySystem = {
      id: "attention:runner:runner-paused",
      kind: "observation",
      lifecycle: "paused",
      nextActor: "system",
      attention: "exception",
      runnerId: "runner-paused",
      attentionCode: "runner-paused",
      evidence: {
        freshness: { kind: "live", observedAt: "2026-08-21T10:00:00Z" },
      },
    };
    const pausedByAgent = {
      ...pausedBySystem,
      id: "agent-paused",
      nextActor: "agent",
    };
    const pausedByPrincipal = {
      ...pausedBySystem,
      id: "principal-paused",
      nextActor: "principal",
      attention: "decision-required",
    };

    const result = classifyWorkbenchAttention([
      pausedBySystem,
      pausedByAgent,
      pausedByPrincipal,
    ]);

    // Paused responsibility stays on the projected next actor: only the
    // paused item whose next actor is Principal belongs to Needs You;
    // system / Agent responsibility never mixes in.
    expect(result.principal).toEqual([pausedByPrincipal]);
    expect(result.system).toEqual([pausedBySystem]);
  });

  test("never reports input-pending as a Principal decision or a system fault", () => {
    const inputPending = {
      id: "attention:runner:runner-input",
      kind: "decision",
      lifecycle: "waiting",
      nextActor: "principal",
      attention: "decision-required",
      runnerId: "runner-input",
      attentionCode: "runner-input-pending",
      evidence: {
        freshness: { kind: "live", observedAt: "2026-08-21T10:00:00Z" },
      },
    };

    const result = classifyWorkbenchAttention([inputPending]);

    // Input-pending is the Agent system's ongoing 待协调 work; it is
    // neither a Principal decision nor a system recovery exception.
    expect(result.principal).toEqual([]);
    expect(result.system).toEqual([]);
  });
});
