import { describe, expect, test } from "bun:test";
import { buildWorkItemProjection } from "../src/ui/work-items";

const snapshot = {
  generatedAt: "2026-08-21T10:00:00Z",
  complete: true,
  projects: [],
  runners: [],
  attention: [],
  errors: [],
};

function taskSource(tasks: unknown[]) {
  return {
    standing: "available" as const,
    sourceRef: "/home/state/tasks.json",
    source: {
      version: "rosso.principal-tasks.v1" as const,
      sourceRevision: 3,
      tasks,
    },
  };
}

function compactTask(id: string) {
  return {
    id,
    title: `Compact task ${id}`,
    objective: "Keep the navigation summary complete without the full detail",
    acceptance: ["The shell stays searchable and attributable"],
    todos: [],
    origin: {
      kind: "principal-explicit" as const,
      sourceRef: `conversation:${id}`,
    },
    binding: { kind: "independent" as const },
    lifecycle: "open" as const,
    nextActor: "agent" as const,
    revision: 2,
    corrections: [{
      id: "correction-compact",
      at: "2026-08-21T09:00:00Z",
      statement: "Keep the exact revision guard.",
      sourceRef: `workbench-task:${id}/correction:correction-compact`,
      deliveries: [],
    }],
    executionLinks: [],
    resultClaims: [],
    createdAt: "2026-08-21T08:00:00Z",
    updatedAt: "2026-08-21T09:00:00Z",
  };
}

describe("compact principal-task work-item projection", () => {
  test("an empty taskDetailIds set keeps only the navigation summary and never fakes detail", () => {
    const task = compactTask("task-compact");
    const projection = buildWorkItemProjection(
      snapshot as never,
      taskSource([task]) as never,
      undefined,
      undefined,
      { taskDetailIds: new Set<string>() },
    );
    const item = projection.items.find(
      (candidate) => candidate.id === "principal-task:task-compact",
    );

    expect(item).toBeDefined();
    expect(item?.taskDetail).toBeUndefined();
    expect(item).toMatchObject({
      id: "principal-task:task-compact",
      kind: "principal-task",
      lifecycle: "open",
      nextActor: "agent",
      attention: "normal",
      title: "Compact task task-compact",
      summary: "Keep the navigation summary complete without the full detail",
      context: "Workbench · 独立任务",
      projectKey: null,
      missionId: null,
      runnerId: null,
      binding: {
        kind: "workbench-task",
        sourceId: "task-compact",
        projectContext: null,
      },
      updatedAt: "2026-08-21T09:00:00Z",
      actionLabel: "查看任务",
      consequence: "normal",
      attentionCode: null,
    });
    // The compact item never carries the canonical Task record, corrections,
    // execution links, or claim history.
    expect(item).not.toHaveProperty("task");
    expect(item).not.toHaveProperty("corrections");
    // The compact item mirrors only the bounded search text: the deep
    // keyword text the shell locator already searches (objective, acceptance,
    // correction statements, result summaries), never any canonical payload.
    expect(item?.searchText).toBe(
      "Keep the navigation summary complete without the full detail "
      + "The shell stays searchable and attributable "
      + "Keep the exact revision guard.",
    );
    expect(item?.searchText).not.toContain("sourceRef");
    expect(item?.searchText).not.toContain("conversation:");
    expect(item?.searchText).not.toMatch(/workbench-task:/u);
    expect(item?.searchText).not.toMatch(/\{/u);
    // Evidence source refs stay attributable to the canonical Task source.
    expect(item?.evidence).toMatchObject({
      sourceRefs: expect.arrayContaining([
        "/home/state/tasks.json",
        `workbench-task:task-compact/correction:correction-compact`,
      ]),
    });
    // Capabilities and counts remain available for the list and observer.
    expect(projection.capabilities.independentTasks).toEqual({
      standing: "available",
      count: 1,
      sourceRevision: 3,
    });
  });

  test("the default projection keeps the full detail exactly as before", () => {
    const task = compactTask("task-compact");
    const projection = buildWorkItemProjection(
      snapshot as never,
      taskSource([task]) as never,
    );
    const item = projection.items.find(
      (candidate) => candidate.id === "principal-task:task-compact",
    );

    expect(item?.taskDetail).toBeDefined();
    expect(item?.taskDetail?.task).toBe(task);
    expect(item?.taskDetail?.sourceRevision).toBe(3);
    expect(item?.taskDetail?.task.corrections).toHaveLength(1);
    expect(item?.taskDetail?.executionContext).toMatchObject({
      latestLink: null,
      // An open Agent-owned independent task can never satisfy the
      // registered project + Mission + Worktree context a launch requires,
      // so its standing is preparation-required with the exact-context
      // blocker; not-applicable belongs only to tasks whose lifecycle or
      // owner already excludes launching.
      launchReadiness: {
        standing: "preparation-required",
        blockers: [{
          code: "exact-context-required",
          message: expect.stringContaining("registered project"),
        }],
      },
    });
  });

  test("a task id set projects full detail only for exactly those tasks", () => {
    const first = compactTask("task-first");
    const second = compactTask("task-second");
    const projection = buildWorkItemProjection(
      snapshot as never,
      taskSource([first, second]) as never,
      undefined,
      undefined,
      { taskDetailIds: new Set(["task-first"]) },
    );
    const firstItem = projection.items.find(
      (candidate) => candidate.id === "principal-task:task-first",
    );
    const secondItem = projection.items.find(
      (candidate) => candidate.id === "principal-task:task-second",
    );

    expect(firstItem?.taskDetail).toBeDefined();
    expect(secondItem?.taskDetail).toBeUndefined();
    // Identity fields are task-specific: each item keeps its own id and
    // binding.sourceId, and its title and evidence refs are derived from the
    // task id. The compact/full contract covers only the shared shell, so
    // the comparison normalizes exactly those id-derived strings while every
    // other shell field stays exact.
    const normalizeTaskIdentity = (value: unknown): unknown => {
      if (typeof value === "string") {
        return value.replace(/task-(first|second)/gu, "TASK");
      }
      if (Array.isArray(value)) return value.map(normalizeTaskIdentity);
      if (value !== null && typeof value === "object") {
        return Object.fromEntries(
          Object.entries(value).map(
            ([key, entry]): [string, unknown] => [key, normalizeTaskIdentity(entry)],
          ),
        );
      }
      return value;
    };
    expect(firstItem?.id).toBe("principal-task:task-first");
    expect(secondItem?.id).toBe("principal-task:task-second");
    const { taskDetail: _firstDetail, ...firstShell } = firstItem!;
    const { taskDetail: _secondDetail, ...secondShell } = secondItem!;
    expect(normalizeTaskIdentity(firstShell)).toEqual(
      normalizeTaskIdentity(secondShell),
    );
  });

  test("compact and full items mirror the same bounded search text without canonical payloads", () => {
    const task = compactTask("task-search");
    const source = taskSource([task]);
    const compact = buildWorkItemProjection(
      snapshot as never,
      source as never,
      undefined,
      undefined,
      { taskDetailIds: new Set<string>() },
    );
    const full = buildWorkItemProjection(
      snapshot as never,
      source as never,
    );
    const compactItem = compact.items.find(
      (candidate) => candidate.id === "principal-task:task-search",
    );
    const fullItem = full.items.find(
      (candidate) => candidate.id === "principal-task:task-search",
    );

    expect(compactItem?.taskDetail).toBeUndefined();
    expect(fullItem?.taskDetail).toBeDefined();
    // The bounded field is identical on both projections: only the deep
    // keyword text the shell locator already searches is mirrored, never the
    // canonical Task record or its evidence payloads.
    expect(compactItem?.searchText).toBe(fullItem?.searchText);
    expect(compactItem?.searchText).toContain("Keep the exact revision guard.");
    expect(compactItem?.searchText).not.toContain("sourceRef");
    expect(compactItem?.searchText).not.toMatch(/workbench-task:/u);
    expect(compactItem?.searchText).not.toMatch(/\{/u);
  });
});
