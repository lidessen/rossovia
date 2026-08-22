import { describe, expect, test } from "bun:test";
// @ts-expect-error app.js is the browser entrypoint; this test imports its pure attention export.
import {
  classifyWorkbenchAttention,
  isPrincipalNeedsYouWorkItem,
} from "../../gateway/ui/app.js";

/**
 * Fixtures shared by the navigation-surface consistency tests. The rail
 * classifies with classifyWorkbenchAttention; the navigation count
 * (#principal-task-count) and the principal view/filter count with the
 * shared isPrincipalNeedsYouWorkItem predicate. Every item must agree on
 * both surfaces.
 */
const cachedOnlyRunnerItem = {
  id: "attention:runner:runner-cached",
  kind: "decision",
  lifecycle: "waiting",
  nextActor: "principal",
  attention: "decision-required",
  runnerId: "runner-cached",
  attentionCode: "runner-interrupted",
  evidence: {
    freshness: {
      kind: "cached",
      sourceUpdatedAt: "2026-08-21T10:00:00Z",
      ageMs: 3600000,
    },
  },
};

const inputPendingItem = {
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

const pausedBySystemItem = {
  id: "attention:runner:runner-paused-system",
  kind: "observation",
  lifecycle: "paused",
  nextActor: "system",
  attention: "exception",
  runnerId: "runner-paused-system",
  attentionCode: "runner-paused",
  evidence: {
    freshness: { kind: "live", observedAt: "2026-08-21T10:00:00Z" },
  },
};

const pausedByAgentItem = {
  ...pausedBySystemItem,
  id: "paused-by-agent",
  nextActor: "agent",
};

const pausedByPrincipalItem = {
  ...pausedBySystemItem,
  id: "paused-by-principal",
  nextActor: "principal",
  attention: "decision-required",
};

const genuinePrincipalDecisionItem = {
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

const liveRunnerDecisionItem = {
  ...cachedOnlyRunnerItem,
  id: "attention:runner-anchor-migration-decision:registered:p:mission-a",
  attentionCode: "runner-anchor-migration-decision",
  evidence: {
    freshness: { kind: "live", observedAt: "2026-08-21T10:00:00Z" },
  },
};

/**
 * The navigation/filter surfaces count and match items one at a time with
 * isPrincipalNeedsYouWorkItem; the rail classifies the whole list with
 * classifyWorkbenchAttention. Assert per-item agreement so a cached-only /
 * input-pending / paused-by-another-actor item can never appear in one
 * Principal surface and not another.
 */
function expectNavigationSurfaceConsistent(items: any[]): void {
  const principalIds = new Set(
    classifyWorkbenchAttention(items).principal.map((item) => item.id),
  );
  for (const item of items) {
    expect(
      isPrincipalNeedsYouWorkItem(item),
      `navigation predicate for ${item.id}`,
    ).toBe(principalIds.has(item.id));
  }
}

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

  test("navigation count and principal filter share the rail classification predicate", () => {
    const items = [
      cachedOnlyRunnerItem,
      inputPendingItem,
      pausedBySystemItem,
      pausedByAgentItem,
      pausedByPrincipalItem,
      genuinePrincipalDecisionItem,
      liveRunnerDecisionItem,
    ];

    // The rail, the navigation count (#principal-task-count), and the
    // principal view/filter all agree on the same mixed set.
    expectNavigationSurfaceConsistent(items);
    expect(classifyWorkbenchAttention(items).principal).toEqual([
      pausedByPrincipalItem,
      genuinePrincipalDecisionItem,
      liveRunnerDecisionItem,
    ]);
  });

  test("a cached-only runner item never enters the principal navigation surface", () => {
    expect(isPrincipalNeedsYouWorkItem(cachedOnlyRunnerItem)).toBeFalse();
    expectNavigationSurfaceConsistent([cachedOnlyRunnerItem, liveRunnerDecisionItem]);
  });

  test("an input-pending item never enters the principal navigation surface", () => {
    expect(isPrincipalNeedsYouWorkItem(inputPendingItem)).toBeFalse();
    expectNavigationSurfaceConsistent([inputPendingItem, genuinePrincipalDecisionItem]);
  });

  test("paused responsibility follows the projected next actor on the navigation surface", () => {
    expect(isPrincipalNeedsYouWorkItem(pausedBySystemItem)).toBeFalse();
    expect(isPrincipalNeedsYouWorkItem(pausedByAgentItem)).toBeFalse();
    expect(isPrincipalNeedsYouWorkItem(pausedByPrincipalItem)).toBeTrue();
    expectNavigationSurfaceConsistent([
      pausedBySystemItem,
      pausedByAgentItem,
      pausedByPrincipalItem,
    ]);
  });

  test("a genuine non-runner Principal decision stays on the navigation surface", () => {
    expect(isPrincipalNeedsYouWorkItem(genuinePrincipalDecisionItem)).toBeTrue();
    expect(isPrincipalNeedsYouWorkItem({
      ...genuinePrincipalDecisionItem,
      nextActor: "agent",
    })).toBeFalse();
    expectNavigationSurfaceConsistent([
      genuinePrincipalDecisionItem,
      pausedByAgentItem,
    ]);
  });
});
