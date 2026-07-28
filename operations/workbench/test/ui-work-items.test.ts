import { describe, expect, test } from "bun:test";
import { buildWorkItemProjection } from "../src/ui/work-items";

const snapshot = {
  generatedAt: "2026-07-27T10:00:00Z",
  complete: false,
  projects: [{
    projectKey: "registered:skills",
    identity: { id: "skills", aliases: ["skills"] },
    worktrees: [{ path: "/workspace/skills" }, { path: "/workspace/skills-ui" }],
    missions: [{
      id: "ui-redesign",
      title: "重做工作台 UI",
      currentFocus: "统一任务与项目视图",
      mainline: { status: "active" },
      sourcePath: "/workspace/skills/MISSION.json",
      observedGitContext: {
        worktreePath: "/workspace/skills-ui",
        binding: "observation-only",
      },
    }, {
      id: "agent-run",
      title: "运行验证",
      currentFocus: "执行真实探针",
      mainline: { status: "active" },
      sourcePath: "/workspace/skills/RUN.json",
      observedGitContext: {
        worktreePath: "/workspace/skills",
        binding: "observation-only",
      },
    }],
  }],
  runners: [{
    live: true,
    sourcePath: "/home/runner.json",
    freshness: { kind: "live", observedAt: "2026-07-27T10:00:00Z" },
    status: {
      runnerId: "runner-a",
      missionId: "agent-run",
      state: "running",
      updatedAt: "2026-07-27T09:59:00Z",
    },
    binding: {
      kind: "project-mission",
      projectKey: "registered:skills",
      missionId: "agent-run",
    },
  }, {
    live: null,
    sourcePath: "/home/unbound-runner.json",
    freshness: { kind: "cached", sourceUpdatedAt: "2026-07-27T09:50:00Z" },
    status: {
      runnerId: "runner-unbound",
      missionId: "unknown-mission",
      state: "running",
      updatedAt: "2026-07-27T09:50:00Z",
    },
    binding: {
      kind: "unbound",
      reason: "ambiguous-mission-id",
    },
  }],
  attention: [{
    priority: "principal-decision",
    code: "mission-execution-awaiting-authorization",
    summary: "执行提案等待 Principal 决策",
    projectKey: "registered:skills",
    missionId: "ui-redesign",
    source: "/workspace/skills/MISSION.json",
  }],
};

describe("Workbench work-item shell projection", () => {
  test("keeps human decisions, live Agent work, and observation anomalies distinct", () => {
    const items = buildWorkItemProjection(snapshot as never).items;

    expect(items).toContainEqual(expect.objectContaining({
      kind: "decision",
      lifecycle: "waiting",
      nextActor: "principal",
      attention: "decision-required",
      projectKey: "registered:skills",
      missionId: "ui-redesign",
      actionLabel: "查看并决策",
    }));
    expect(items).toContainEqual(expect.objectContaining({
      kind: "agent-work",
      lifecycle: "in-progress",
      nextActor: "agent",
      runnerId: "runner-a",
      evidence: expect.objectContaining({
        freshness: expect.objectContaining({
          kind: "live",
        }),
      }),
    }));
    expect(items).toContainEqual(expect.objectContaining({
      kind: "observation",
      binding: expect.objectContaining({
        kind: "ambiguous",
      }),
      projectKey: null,
      runnerId: "runner-unbound",
    }));
    expect(items.some((item) =>
      item.kind === "independent" && item.runnerId === "runner-unbound"
    )).toBeFalse();
  });

  test("does not present a cached running record as Agent work", () => {
    const cached = {
      ...snapshot,
      attention: [],
      runners: [{
        ...snapshot.runners[0],
        live: false,
        freshness: {
          kind: "cached",
          sourceUpdatedAt: "2026-07-27T09:59:00Z",
        },
      }],
    };

    const items = buildWorkItemProjection(cached as never).items;
    expect(items.some((item) => item.kind === "agent-work")).toBeFalse();
    expect(items).toContainEqual(expect.objectContaining({
      kind: "mission",
      missionId: "agent-run",
      nextActor: "unknown",
    }));
  });

  test("reports that independent tasks have no source instead of claiming zero", () => {
    const projection = buildWorkItemProjection(snapshot as never);

    expect(projection.capabilities.independentTasks).toEqual({
      standing: "unsupported",
      count: null,
      reason: "No explicit independent-task source is declared by Workbench.",
    });
    expect(projection.items.some((item) => item.kind === "independent")).toBeFalse();
  });

  test("keeps system settlement as system work and Mission worktree context observational", () => {
    const projection = buildWorkItemProjection({
      ...snapshot,
      runners: [],
      attention: [{
        priority: "notice",
        code: "correction-awaiting-system-settlement",
        summary: "修正已验证，等待系统收束",
        projectKey: "registered:skills",
        missionId: "ui-redesign",
        source: "/workspace/skills/MISSION.json",
      }],
    } as never);

    expect(projection.items).toContainEqual(expect.objectContaining({
      kind: "system-work",
      nextActor: "system",
      lifecycle: "waiting",
    }));
    expect(projection.items).toContainEqual(expect.objectContaining({
      kind: "mission",
      missionId: "agent-run",
      binding: {
        kind: "project-mission",
        projectKey: "registered:skills",
        missionId: "agent-run",
      },
      worktreeContext: {
        path: "/workspace/skills",
        relation: "mission-observed-here",
        authority: "observation-only",
      },
    }));
  });
});
