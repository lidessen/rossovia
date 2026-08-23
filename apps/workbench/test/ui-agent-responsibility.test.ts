import { describe, expect, test } from "bun:test";
// @ts-expect-error app.js is the browser entrypoint; this test imports pure responsibility exports.
import * as agentResponsibility from "../../gateway/ui/app.js";

const {
  classifyAgentResponsibility,
  isAgentEligibleWorkItem,
  isExactLiveAgentWork,
  isOrphanedAgentWorkItem,
  isPendingAgentWork,
  parsePrincipalLocus,
  principalLocusHref,
} = agentResponsibility;

function eligibleTask(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    kind: "principal-task",
    lifecycle: "open",
    nextActor: "agent",
    agentEligibility: {
      standing: "eligible",
      worktreePath: "/workspace/skills-ui",
      sourceRefs: ["/home/state/tasks.json"],
    },
    ...extra,
  };
}

function orphanedTask(
  id: string,
  reason: string,
  worktreePath: string | null = null,
  extra: Record<string, unknown> = {},
) {
  return {
    id,
    kind: "principal-task",
    lifecycle: "open",
    nextActor: "agent",
    agentEligibility: {
      standing: "orphaned",
      reason,
      worktreePath,
      sourceRefs: ["/home/state/tasks.json"],
    },
    ...extra,
  };
}

describe("Workbench Agent responsibility", () => {
  test("preserves the observed snapshot relation: one eligible waiting for Agent and no live Agent", () => {
    const waitingTask = eligibleTask("principal-task:blog-follow-up");
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
    const eligible = eligibleTask("principal-task:eligible");

    expect(isExactLiveAgentWork(live)).toBeTrue();
    expect(isPendingAgentWork(live)).toBeFalse();
    expect(isAgentEligibleWorkItem(eligible)).toBeTrue();
    expect(isPendingAgentWork(eligible)).toBeTrue();
    // The eligible principal task is the only pending Agent responsibility:
    // cached/settled agent-work shapes and a principal-task without the
    // explainable eligibility projection are never pending.
    expect(classifyAgentResponsibility([live, cached, settled, wrongKind, eligible])).toEqual({
      live: [live],
      pending: [eligible],
    });
  });

  test("separates missing-worktree and no-binding Tasks as orphaned history instead of pending", () => {
    const missingWorktree = orphanedTask(
      "principal-task:missing-worktree",
      "missing-worktree",
      "/workspace/skills-gone",
    );
    const noWorktreeBinding = orphanedTask(
      "principal-task:no-worktree-binding",
      "no-worktree-binding",
    );
    const noProjectBinding = orphanedTask(
      "principal-task:no-project-binding",
      "no-project-binding",
    );

    for (const orphaned of [missingWorktree, noWorktreeBinding, noProjectBinding]) {
      expect(isAgentEligibleWorkItem(orphaned)).toBeFalse();
      expect(isPendingAgentWork(orphaned)).toBeFalse();
      expect(isOrphanedAgentWorkItem(orphaned)).toBeTrue();
    }
    expect(classifyAgentResponsibility([
      missingWorktree,
      noWorktreeBinding,
      noProjectBinding,
    ])).toEqual({
      live: [],
      pending: [],
    });
  });

  test("never includes verifying, principal-owned, or settled Tasks in either partition", () => {
    const verifying = eligibleTask("principal-task:verifying", {
      lifecycle: "verifying",
      nextActor: "principal",
    });
    const settled = eligibleTask("principal-task:settled", {
      lifecycle: "settled",
      nextActor: "none",
    });
    const principalOwned = eligibleTask("principal-task:principal", {
      nextActor: "principal",
    });

    for (const item of [verifying, settled, principalOwned]) {
      expect(isAgentEligibleWorkItem(item)).toBeFalse();
      expect(isOrphanedAgentWorkItem(item)).toBeFalse();
      expect(isPendingAgentWork(item)).toBeFalse();
    }
    expect(classifyAgentResponsibility([verifying, settled, principalOwned])).toEqual({
      live: [],
      pending: [],
    });
  });

  test("does not turn another actor's work into pending Agent responsibility", () => {
    expect(isPendingAgentWork({ nextActor: "principal" })).toBeFalse();
    expect(isPendingAgentWork({ nextActor: "system" })).toBeFalse();
    expect(isPendingAgentWork({ nextActor: "external" })).toBeFalse();
  });

  test("keeps the orphaned/history view-only URL filter-free and the tasks filter explicit", () => {
    // `/?view=agent-orphaned` is an explicit view: the URL carries no filter
    // parameter, so parsePrincipalLocus retains filter=null. The default
    // filter is applied only when the locus is resolved into UI state
    // (resolvePrincipalLocus: request.filter ?? "all"), never on the URL.
    const viewHref = principalLocusHref("http://127.0.0.1:4317/", {
      view: "agent-orphaned",
      filter: "all",
      projectId: null,
      workItemId: null,
    });
    expect(viewHref).toBe("/?view=agent-orphaned");
    expect(parsePrincipalLocus(`http://127.0.0.1:4317${viewHref}`)).toMatchObject({
      requested: true,
      invalidFields: [],
      view: "agent-orphaned",
      filter: null,
    });

    const filterHref = principalLocusHref("http://127.0.0.1:4317/", {
      view: "tasks",
      filter: "agent-orphaned",
      projectId: null,
      workItemId: null,
    });
    expect(filterHref).toBe("/?view=tasks&filter=agent-orphaned");
    expect(parsePrincipalLocus(`http://127.0.0.1:4317${filterHref}`)).toMatchObject({
      requested: true,
      invalidFields: [],
      view: "tasks",
      filter: "agent-orphaned",
    });
  });
});
