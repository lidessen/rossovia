import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
// @ts-expect-error app.js is the browser entrypoint; this test imports its pure locator exports.
import * as taskLocator from "../../gateway/ui/app.js";

const {
  taskLocatorSearchText,
  workItemMatchesTaskLocator,
  taskLocatorOptions,
  taskLocatorSourceStanding,
  taskLocatorEmptySummary,
} = taskLocator;

const appSource = readFileSync(
  resolve(import.meta.dir, "../../gateway/ui/app.js"),
  "utf8",
);
const htmlSource = readFileSync(
  resolve(import.meta.dir, "../../gateway/ui/index.html"),
  "utf8",
);
// The served bundle embeds the same ui/ files; it must stay in sync so the
// browser receives the identical locator surface.
const assetBundle = readFileSync(
  resolve(import.meta.dir, "../../gateway/src/assets.generated.ts"),
  "utf8",
);

type Lifecycle =
  | "open"
  | "in-progress"
  | "waiting"
  | "paused"
  | "blocked"
  | "verifying"
  | "settled";

type FixtureWorkItem = {
  id: string;
  kind: "principal-task" | "observation" | "mission";
  lifecycle: Lifecycle;
  nextActor: string;
  title: string;
  summary: string;
  context: string;
  projectKey: string | null;
  missionId: string | null;
  taskDetail?: {
    task: {
      id: string;
      title: string;
      objective: string;
      acceptance: string[];
      todos: string[];
      corrections: Array<{ statement: string }>;
      resultClaims: Array<{ summary: string }>;
    };
  };
};

type WorkItemInput = {
  index: number;
  title: string;
  objective?: string;
  summary?: string;
  context?: string;
  projectKey: string | null;
  lifecycle: Lifecycle;
  corrections?: readonly string[];
  claims?: readonly string[];
};

type LocatorOption = { key: string; count: number };

type LocatorOptions = {
  projects: LocatorOption[];
  statuses: LocatorOption[];
};

function workItem({
  index,
  title,
  objective = "",
  summary = "",
  context = "",
  projectKey,
  lifecycle,
  corrections = [],
  claims = [],
}: WorkItemInput): FixtureWorkItem {
  return {
    id: "principal-task:" + index,
    kind: "principal-task",
    lifecycle,
    nextActor: "agent",
    title,
    summary,
    context,
    projectKey,
    missionId: projectKey === null ? null : "mission-" + index,
    taskDetail: {
      task: {
        id: "task-" + index,
        title,
        objective,
        acceptance: ["acceptance-" + index],
        todos: [],
        corrections: corrections.map((statement) => ({ statement })),
        resultClaims: claims.map((claimSummary) => ({ summary: claimSummary })),
      },
    },
  };
}

/**
 * A ~136-item scenario across three registered project keys and the existing
 * lifecycle vocabulary: 132 Workbench tasks, one independent task (no project
 * key), one runner observation, and two Mission items.
 */
function buildScenario(): FixtureWorkItem[] {
  const items: FixtureWorkItem[] = [];
  const projects = [
    "registered:skills",
    "registered:blog",
    "registered:appgprj_blog",
  ];
  const lifecycles: Lifecycle[] = [
    "open",
    "in-progress",
    "waiting",
    "paused",
    "blocked",
    "verifying",
    "settled",
  ];
  for (let index = 0; index < 132; index += 1) {
    items.push(workItem({
      index,
      title: "Task " + index,
      objective: index % 13 === 0
        ? "定位 reconciliation 证据链的关键任务 " + index
        : "普通目标 " + index,
      projectKey: projects[index % projects.length]!,
      lifecycle: lifecycles[index % lifecycles.length]!,
      ...(index % 5 === 0
        ? { corrections: ["修正说明：使用已接受的 source 而不是缓存投影"] }
        : {}),
    }));
  }
  items.push(workItem({
    index: 132,
    title: "独立核对",
    objective: "核对发布清单",
    projectKey: null,
    lifecycle: "open",
  }));
  items.push({
    id: "attention:runner:runner-1",
    kind: "observation",
    lifecycle: "blocked",
    nextActor: "system",
    title: "Runner 不可达",
    summary: "runner-1 不可达",
    context: "观察异常 · 未按 Mission ID 绑定",
    projectKey: "registered:skills",
    missionId: "mission-0",
  });
  items.push({
    id: "mission:registered:skills:mission-a",
    kind: "mission",
    lifecycle: "open",
    nextActor: "unknown",
    title: "Mission A",
    summary: "义务进行中",
    context: "skills · mission-a",
    projectKey: "registered:skills",
    missionId: "mission-a",
  });
  items.push({
    id: "mission:registered:blog:mission-b",
    kind: "mission",
    lifecycle: "settled",
    nextActor: "none",
    title: "Mission B",
    summary: "Mission 已结案",
    context: "blog · mission-b",
    projectKey: "registered:blog",
    missionId: "mission-b",
  });
  return items;
}

describe("Task-page locator", () => {
  test("locates the target task by keyword across 136 items with a count identical to the filtered rows", () => {
    const items = buildScenario();
    expect(items).toHaveLength(136);

    const keywordMatches = items.filter((item) =>
      workItemMatchesTaskLocator(item, {
        keyword: "reconciliation",
        project: null,
        status: null,
      }));
    // One objective per 13 tasks mentions reconciliation (indices 0..130).
    expect(keywordMatches).toHaveLength(11);
    expect(keywordMatches.every((item) =>
      taskLocatorSearchText(item).includes("reconciliation"))).toBeTrue();
    // The list count a receiver sees equals the number of rendered rows.
    expect(keywordMatches.length).toBe(items.filter((item) =>
      workItemMatchesTaskLocator(item, {
        keyword: "reconciliation",
        project: null,
        status: null,
      })).length);

    // Keyword matching is trimmed and case-insensitive over projected text.
    expect(workItemMatchesTaskLocator(items[0], {
      keyword: "  RECONCILIATION ",
      project: null,
      status: null,
    })).toBeTrue();
    // Correction statements are searchable (indices 0..130 step 5 → 27).
    expect(items.filter((item) => workItemMatchesTaskLocator(item, {
      keyword: "缓存投影",
      project: null,
      status: null,
    }))).toHaveLength(27);
    // Independent tasks without a project key are locatable by objective.
    expect(workItemMatchesTaskLocator(items[132], {
      keyword: "发布清单",
      project: null,
      status: null,
    })).toBeTrue();
    // Non-task items (runner observations) stay searchable via their summary.
    expect(workItemMatchesTaskLocator(items[133], {
      keyword: "runner-1",
      project: null,
      status: null,
    })).toBeTrue();
  });

  test("narrows by existing project and lifecycle fields only, with options and counts derived from the items", () => {
    const items = buildScenario();
    const options = taskLocatorOptions(
      items,
      (key: string) => key.replace("registered:", ""),
    ) as LocatorOptions;

    expect(options.projects.map((entry) => entry.key)).toEqual([
      "registered:appgprj_blog",
      "registered:blog",
      "registered:skills",
    ]);
    const skills = options.projects.find(
      (entry) => entry.key === "registered:skills",
    );
    expect(skills).toMatchObject({ count: 46 }); // 44 tasks + 1 observation + 1 Mission
    // The independent task is not an invented project; it stays outside the
    // project options yet remains visible under "全部项目".
    expect(options.projects.reduce((sum, entry) => sum + entry.count, 0))
      .toBe(135);
    expect(options.statuses.reduce((sum, entry) => sum + entry.count, 0))
      .toBe(136);

    // Status options use only the existing lifecycle vocabulary.
    expect(options.statuses.map((entry) => entry.key)).toEqual([
      "open",
      "in-progress",
      "waiting",
      "paused",
      "blocked",
      "verifying",
      "settled",
    ]);

    const skillsOpen = items.filter((item) => workItemMatchesTaskLocator(item, {
      keyword: "",
      project: "registered:skills",
      status: "open",
    }));
    // indices ≡ 0 mod 3 and ≡ 0 mod 7 → 0..126 step 21 (7) + Mission A (1).
    expect(skillsOpen).toHaveLength(8);

    const blogVerifying = items.filter((item) =>
      workItemMatchesTaskLocator(item, {
        keyword: "",
        project: "registered:appgprj_blog",
        status: "verifying",
      }));
    // indices ≡ 2 mod 3 and ≡ 5 mod 7 → 5..131 step 21 (7).
    expect(blogVerifying).toHaveLength(7);
    expect(blogVerifying.every((item) =>
      item.projectKey === "registered:appgprj_blog"
      && item.lifecycle === "verifying")).toBeTrue();
  });

  test("separates a true no-match from an unavailable source and never reports unavailable sources as zero", () => {
    const items = buildScenario();
    const noMatch = taskLocatorEmptySummary(
      { keyword: "nonexistent-term", project: "registered:skills", status: "verifying" },
      {
        sourceStanding: "complete",
        projectLabel: (key: string) => key.replace("registered:", ""),
        statusLabel: (key: string) => key,
      },
    );
    expect(noMatch.standing).toBe("no-match");
    expect(noMatch.summary).toContain("nonexistent-term");
    expect(noMatch.summary).toContain("skills");
    expect(noMatch.summary).toContain("verifying");
    expect(noMatch.conditions).toHaveLength(3);
    expect(workItemMatchesTaskLocator(items[0], {
      keyword: "nonexistent-term",
      project: null,
      status: null,
    })).toBeFalse();

    // The same query under a partial source must not read as zero matches.
    const partial = taskLocatorEmptySummary(
      { keyword: "nonexistent-term", project: null, status: null },
      {
        sourceStanding: "partial",
        projectLabel: (key: string) => key,
        statusLabel: (key: string) => key,
      },
    );
    expect(partial.standing).toBe("source-unavailable");
    expect(partial.summary.startsWith("任务来源不可用或投影不完整")).toBeTrue();
    expect(partial.summary).toContain("无法确认");
    expect(partial.detail).toContain("零条");

    expect(taskLocatorSourceStanding({
      source: "live",
      complete: true,
      taskSourceStanding: "available",
    })).toBe("complete");
    expect(taskLocatorSourceStanding({
      source: "live",
      complete: true,
      taskSourceStanding: "unavailable",
    })).toBe("partial");
    expect(taskLocatorSourceStanding({
      source: "live",
      complete: false,
      taskSourceStanding: "available",
    })).toBe("partial");
    expect(taskLocatorSourceStanding({
      source: "stale",
      complete: true,
      taskSourceStanding: "available",
    })).toBe("partial");

    // A factual empty complete source without filters is not an error.
    const noItems = taskLocatorEmptySummary(
      { keyword: "", project: null, status: null },
      {
        sourceStanding: "complete",
        projectLabel: (key: string) => key,
        statusLabel: (key: string) => key,
      },
    );
    expect(noItems.standing).toBe("no-items");
    expect(noItems.summary).toContain("事实结果");

    // The tasks view actually wires the locator: markup, per-keystroke
    // filtering, source-unavailable note, and a clear recovery path.
    expect(htmlSource).toContain('id="task-locator-keyword"');
    expect(htmlSource).toContain('id="task-locator-project"');
    expect(htmlSource).toContain('id="task-locator-status"');
    expect(htmlSource).toContain('id="task-locator-clear"');
    expect(appSource).toContain(
      "workItemMatchesTaskLocator(item, state.taskLocator)",
    );
    expect(appSource).toContain("counts.all = items.filter(");
    expect(appSource).toContain("renderTaskLocatorControls(base)");
    expect(appSource).toContain("data-clear-task-locator");
    expect(appSource).toContain("清除过滤");
    expect(appSource).toContain("任务来源不可用或投影不完整");
    // The served embedded bundle carries the same surface.
    expect(assetBundle).toContain('id="task-locator-keyword"');
    expect(assetBundle).toContain("renderTaskLocatorControls(base)");
    expect(assetBundle).toContain("data-clear-task-locator");
  });
});
