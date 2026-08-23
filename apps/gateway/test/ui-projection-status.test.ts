import { describe, expect, test } from "bun:test";
// @ts-expect-error app.js is the browser entrypoint; this test imports its pure projection copy.
import { backlogTriageProjection, incompleteProjectionCopy, orderWorkItemsForTaskEntry, parsePrincipalLocus, resolvePrincipalLocus, restoredPrincipalLocusState, taskEntryDefaultFilter, taskEntryLifecyclePriority, workItemUpdatedLabel } from "../ui/app.js";

describe("incomplete projection status copy", () => {
  test("explains an unbound cached runner and gives the recovery direction", () => {
    const copy = incompleteProjectionCopy({
      complete: false,
      errors: [],
      freshness: { runners: "cached-status-files" },
      attention: [
        { code: "runner-unbound" },
        { code: "runner-unreachable" },
      ],
    });

    expect(copy).toEqual({
      label: "运行投影可读 · Runner 未绑定",
      detail:
        "运行投影不完整 · Runner 未绑定，运行状态仅来自缓存；刷新投影，修正 Mission 绑定并恢复或处置 Runner 后再控制。",
    });
  });

  test("keeps a cached-only runner distinct from a source error", () => {
    const copy = incompleteProjectionCopy({
      complete: false,
      errors: [],
      freshness: { runners: "cached-status-files" },
      attention: [{ code: "runner-unreachable" }],
    });

    expect(copy.label).toBe("实时 · Runner 仅缓存");
    expect(copy.detail).toContain("先恢复或处置 Runner 后再控制");
    expect(copy.detail).not.toContain("来源错误");
  });

  test("keeps the existing source-risk label while surfacing its first error", () => {
    const copy = incompleteProjectionCopy({
      complete: false,
      errors: [{ summary: "runner status read failed" }],
      freshness: { runners: "cached-status-files" },
      attention: [],
    });

    expect(copy).toEqual({
      label: "实时 · 部分来源不可用",
      detail: "运行投影不完整 · runner status read failed；刷新投影并查看错误证据。",
    });
  });

  test("keeps the ambiguous-reason guidance off a historical cached unbound record", () => {
    const copy = incompleteProjectionCopy({
      complete: false,
      errors: [],
      freshness: { runners: "cached-status-files" },
      attention: [
        { code: "runner-unbound", runnerId: "runner-7", missionId: "mission-shared" },
      ],
      runners: [
        {
          status: { runnerId: "runner-7", missionId: "mission-shared" },
          binding: { kind: "unbound", reason: "ambiguous-mission-id" },
          freshness: {
            kind: "cached",
            sourceUpdatedAt: "2026-07-26T10:30:00Z",
            ageMs: 1_800_000,
          },
        },
      ],
    });

    // The record is cached-only (no live probe), so it is historical and
    // pending disposition; the ambiguous-reason guidance belongs to an
    // active unbound Runner and must not read as a current fault here.
    expect(copy.label).toBe("实时 · 当前无控制载体");
    expect(copy.detail).toContain("当前没有可控制的运行载体");
    expect(copy.detail).toContain("历史缓存待处置");
    expect(copy.detail).not.toContain("同时命中多个项目");
    expect(copy.detail).not.toContain("消除 Mission ID 歧义");
    expect(copy.detail).not.toContain("Runner 未绑定");
    expect(copy.detail).not.toContain("需核查");
  });

  test("states no controllable carrier when only a bound cached runner is retained", () => {
    const copy = incompleteProjectionCopy({
      complete: false,
      errors: [],
      freshness: { runners: "cached-status-files" },
      attention: [],
      runners: [
        {
          status: { runnerId: "runner-9", missionId: "mission-a" },
          binding: {
            kind: "project-mission",
            projectKey: "registered:p",
            registeredProjectId: "p",
            missionId: "mission-a",
          },
          freshness: {
            kind: "cached",
            sourceUpdatedAt: "2026-07-26T10:30:00Z",
            ageMs: 3_600_000,
          },
        },
      ],
    });

    // A bound record is still only cached status: without live-probe
    // evidence there is no controllable carrier right now, and the record is
    // historical pending disposition rather than a current fault.
    expect(copy.label).toBe("实时 · 当前无控制载体");
    expect(copy.detail).toContain("当前没有可控制的运行载体");
    expect(copy.detail).toContain("历史缓存待处置");
    expect(copy.detail).toContain("恢复或处置 Runner");
    expect(copy.detail).not.toContain("需核查");
  });

  test("keeps the source-error risk fact in front of runner binding copy", () => {
    const copy = incompleteProjectionCopy({
      complete: false,
      errors: [
        { scope: "runner", source: "runner-status.json", message: "runner status read failed" },
      ],
      freshness: { runners: "cached-status-files" },
      attention: [
        { code: "runner-unbound", runnerId: "runner-7", missionId: "mission-shared" },
      ],
      runners: [
        {
          status: { runnerId: "runner-7", missionId: "mission-shared" },
          binding: { kind: "unbound", reason: "ambiguous-mission-id" },
          freshness: {
            kind: "cached",
            sourceUpdatedAt: "2026-07-26T10:30:00Z",
            ageMs: 1_800_000,
          },
        },
      ],
    });

    expect(copy).toEqual({
      label: "实时 · 部分来源不可用",
      detail: "运行投影不完整 · runner status read failed；刷新投影并查看错误证据。",
    });
  });

  test("never infers a structured binding reason from free-text attention summaries", () => {
    const copy = incompleteProjectionCopy({
      complete: false,
      errors: [],
      freshness: { runners: "cached-status-files" },
      attention: [
        {
          code: "runner-unbound",
          summary:
            "Runner runner-7 cannot be bound by Mission ID 'mission-shared' (ambiguous-mission-id)",
        },
      ],
    });

    // Without a structured runners[].binding.reason the copy stays generic:
    // prose that happens to mention a reason code is not binding evidence.
    expect(copy.label).toBe("运行投影可读 · Runner 未绑定");
    expect(copy.detail).not.toContain("消除 Mission ID 歧义");
    expect(copy.detail).not.toContain("同时命中多个项目");
    expect(copy.detail).toContain("修正 Mission 绑定");
  });

  test("does not map a cached record's no-match reason onto current guidance", () => {
    const copy = incompleteProjectionCopy({
      complete: false,
      errors: [],
      freshness: { runners: "cached-status-files" },
      attention: [
        { code: "runner-unbound", runnerId: "runner-7", missionId: "mission-ghost" },
      ],
      runners: [
        {
          status: { runnerId: "runner-7", missionId: "mission-ghost" },
          binding: { kind: "unbound", reason: "no-explicit-mission-id-match" },
          freshness: {
            kind: "cached",
            sourceUpdatedAt: "2026-07-26T10:30:00Z",
            ageMs: 1_800_000,
          },
        },
      ],
    });

    expect(copy.label).toBe("实时 · 当前无控制载体");
    expect(copy.detail).not.toContain("未命中任何已观察 Mission 记录");
    expect(copy.detail).not.toContain("消除 Mission ID 歧义");
    expect(copy.detail).toContain("历史缓存待处置");
  });

  test("keeps the unknown-reason fallback only for an active unbound Runner", () => {
    const historical = incompleteProjectionCopy({
      complete: false,
      errors: [],
      freshness: { runners: "cached-status-files" },
      attention: [
        { code: "runner-unbound", runnerId: "runner-7", missionId: "mission-x" },
      ],
      runners: [
        {
          status: { runnerId: "runner-7", missionId: "mission-x" },
          binding: { kind: "unbound", reason: "binding-reason-v2-unrecognized" },
          freshness: {
            kind: "cached",
            sourceUpdatedAt: "2026-07-26T10:30:00Z",
            ageMs: 1_800_000,
          },
        },
      ],
    });

    expect(historical.label).toBe("实时 · 当前无控制载体");
    expect(historical.detail).not.toContain("绑定原因未被当前投影识别");
    expect(historical.detail).not.toContain("未命中任何已观察 Mission 记录");
    expect(historical.detail).not.toContain("Runner 未绑定");
  });

  test("labels the unbound standing 运行投影可读 without implying a live Runner", () => {
    const copy = incompleteProjectionCopy({
      complete: false,
      errors: [],
      freshness: { runners: "cached-status-files" },
      attention: [{ code: "runner-unbound" }],
    });

    // The HTTP projection is still readable; only the Runner attribution is
    // missing. The masthead must not use 实时 for a Runner-attribution
    // problem, and the detailed recovery guidance stays intact.
    expect(copy.label).toBe("运行投影可读 · Runner 未绑定");
    expect(copy.label).not.toContain("实时");
    expect(copy.detail).toContain("运行投影不完整 · Runner 未绑定");
    expect(copy.detail).toContain("刷新投影，修正 Mission 绑定");
    expect(copy.detail).toContain("恢复或处置 Runner 后再控制");
  });

  test("keeps 运行投影可读 scoped to the unbound standing and the 实时 labels of the other incomplete branches", () => {
    // Counter-examples: source errors and cached-only runners keep their
    // existing 实时 labels; the projection-readable prefix is not a blanket
    // replacement for every incomplete projection.
    const sourceError = incompleteProjectionCopy({
      complete: false,
      errors: [{ summary: "runner status read failed" }],
      attention: [],
    });
    expect(sourceError.label).toBe("实时 · 部分来源不可用");
    expect(sourceError.label).not.toContain("投影可读");

    const cachedOnly = incompleteProjectionCopy({
      complete: false,
      errors: [],
      freshness: { runners: "cached-status-files" },
      attention: [{ code: "runner-unreachable" }],
    });
    expect(cachedOnly.label).toBe("实时 · Runner 仅缓存");
    expect(cachedOnly.label).not.toContain("投影可读");
  });

  test("keeps 运行投影可读 · Runner 未绑定 for a live-proven unbound Runner with the ambiguous reason", () => {
    const copy = incompleteProjectionCopy({
      complete: false,
      errors: [],
      freshness: { runners: "live", runnerUpdatedAtRange: null },
      attention: [
        { code: "runner-unbound", runnerId: "runner-7", missionId: "mission-shared" },
      ],
      runners: [
        {
          status: { runnerId: "runner-7", missionId: "mission-shared", state: "running" },
          binding: { kind: "unbound", reason: "ambiguous-mission-id" },
          freshness: { kind: "live", observedAt: "2026-08-22T10:30:00Z" },
          live: true,
        },
      ],
    });

    expect(copy.label).toBe("运行投影可读 · Runner 未绑定");
    expect(copy.detail).toContain("同时命中多个项目");
    expect(copy.detail).toContain("消除 Mission ID 歧义");
    // The unbound Runner itself is live-proven, so the copy never reads as
    // 仅来自缓存 or as historical.
    expect(copy.detail).not.toContain("运行状态仅来自缓存");
    expect(copy.detail).not.toContain("历史");
  });

  test("keeps 运行投影可读 · Runner 未绑定 for a live-proven unbound Runner with the no-match reason", () => {
    const copy = incompleteProjectionCopy({
      complete: false,
      errors: [],
      freshness: { runners: "live" },
      attention: [
        { code: "runner-unbound", runnerId: "runner-7", missionId: "mission-ghost" },
      ],
      runners: [
        {
          status: { runnerId: "runner-7", missionId: "mission-ghost", state: "running" },
          binding: { kind: "unbound", reason: "no-explicit-mission-id-match" },
          freshness: { kind: "live", observedAt: "2026-08-22T10:30:00Z" },
          live: true,
        },
      ],
    });

    expect(copy.label).toBe("运行投影可读 · Runner 未绑定");
    expect(copy.detail).toContain("未命中任何已观察 Mission 记录");
    expect(copy.detail).not.toContain("消除 Mission ID 歧义");
  });

  test("keeps the explicit unknown-reason fallback for a live-proven unbound Runner", () => {
    const copy = incompleteProjectionCopy({
      complete: false,
      errors: [],
      freshness: { runners: "live" },
      attention: [
        { code: "runner-unbound", runnerId: "runner-7", missionId: "mission-x" },
      ],
      runners: [
        {
          status: { runnerId: "runner-7", missionId: "mission-x", state: "running" },
          binding: { kind: "unbound", reason: "binding-reason-v2-unrecognized" },
          freshness: { kind: "live", observedAt: "2026-08-22T10:30:00Z" },
          live: true,
        },
      ],
    });

    expect(copy.label).toBe("运行投影可读 · Runner 未绑定");
    expect(copy.detail).toContain("绑定原因未被当前投影识别");
    expect(copy.detail).toContain("核对 runner 归属与 Mission 绑定来源");
    expect(copy.detail).not.toContain("未命中任何已观察 Mission 记录");
    expect(copy.detail).not.toContain("消除 Mission ID 歧义");
  });

  test("accepts a live freshness projection as active-unbound evidence without a live field", () => {
    const copy = incompleteProjectionCopy({
      complete: false,
      errors: [],
      freshness: { runners: "live" },
      attention: [{ code: "runner-unbound" }],
      runners: [
        {
          status: { runnerId: "runner-7", missionId: "mission-ghost" },
          binding: { kind: "unbound" },
          freshness: { kind: "live", observedAt: "2026-08-22T10:30:00Z" },
        },
      ],
    });

    // freshness.kind === "live" is live-probe evidence even without the
    // mirrored live field; the unbound standing keeps its current warning.
    expect(copy.label).toBe("运行投影可读 · Runner 未绑定");
    expect(copy.detail).toContain("当前没有精确的 Mission 目标");
  });

  test("fails closed when a live aggregate has no live-proven runner", () => {
    const copy = incompleteProjectionCopy({
      complete: false,
      errors: [],
      freshness: { runners: "live", runnerUpdatedAtRange: null },
      attention: [
        { code: "runner-unbound", runnerId: "runner-7", missionId: "mission-x" },
      ],
      runners: [
        {
          status: { runnerId: "runner-7", missionId: "mission-x" },
          binding: { kind: "unbound", reason: "no-explicit-mission-id-match" },
          freshness: {
            kind: "cached",
            sourceUpdatedAt: "2026-07-26T10:30:00Z",
            ageMs: 1_800_000,
          },
        },
      ],
    });

    // The aggregate claims live but no runner carries live evidence: the
    // contradiction is explicit, so the copy must not claim either a current
    // carrier or its absence.
    expect(copy.label).toBe("实时 · 投影需核查");
    expect(copy.detail).not.toContain("Runner 未绑定");
    expect(copy.detail).not.toContain("当前无控制载体");
  });

  test("fails closed when a live carrier exists beside a cached unbound record", () => {
    const copy = incompleteProjectionCopy({
      complete: false,
      errors: [],
      freshness: { runners: "live", runnerUpdatedAtRange: null },
      attention: [
        { code: "runner-unbound", runnerId: "runner-7", missionId: "mission-ghost" },
      ],
      runners: [
        {
          status: { runnerId: "runner-1", missionId: "mission-a", state: "running" },
          binding: {
            kind: "project-mission",
            projectKey: "registered:p",
            registeredProjectId: "p",
            missionId: "mission-a",
          },
          freshness: { kind: "live", observedAt: "2026-08-22T10:30:00Z" },
          live: true,
        },
        {
          status: { runnerId: "runner-7", missionId: "mission-ghost" },
          binding: { kind: "unbound", reason: "no-explicit-mission-id-match" },
          freshness: {
            kind: "cached",
            sourceUpdatedAt: "2026-07-26T10:30:00Z",
            ageMs: 1_800_000,
          },
        },
      ],
    });

    // The unbound standing belongs to a non-live record while a current
    // carrier exists: no current Runner is proven unbound, so the copy stays
    // generic instead of blaming the current system.
    expect(copy.label).toBe("实时 · 投影需核查");
    expect(copy.detail).not.toContain("Runner 未绑定");
    expect(copy.detail).not.toContain("当前无控制载体");
    expect(copy.detail).not.toContain("仅缓存");
  });

  test("fails closed when a live carrier exists beside a cached unreachable record", () => {
    const copy = incompleteProjectionCopy({
      complete: false,
      errors: [],
      freshness: { runners: "live", runnerUpdatedAtRange: null },
      attention: [{ code: "runner-unreachable" }],
      runners: [
        {
          status: { runnerId: "runner-1", missionId: "mission-a", state: "running" },
          binding: {
            kind: "project-mission",
            projectKey: "registered:p",
            registeredProjectId: "p",
            missionId: "mission-a",
          },
          freshness: { kind: "live", observedAt: "2026-08-22T10:30:00Z" },
          live: true,
        },
        {
          status: { runnerId: "runner-9", missionId: "mission-b", state: "running" },
          binding: {
            kind: "project-mission",
            projectKey: "registered:p",
            registeredProjectId: "p",
            missionId: "mission-b",
          },
          freshness: {
            kind: "cached",
            sourceUpdatedAt: "2026-07-26T10:30:00Z",
            ageMs: 3_600_000,
          },
        },
      ],
    });

    expect(copy.label).toBe("实时 · 投影需核查");
    expect(copy.detail).not.toContain("仅缓存");
    expect(copy.detail).not.toContain("当前无控制载体");
  });

  test("keeps an awaiting-authorization Mission out of the runner fault copy", () => {
    const copy = incompleteProjectionCopy({
      complete: false,
      errors: [],
      freshness: { runners: "cached-status-files" },
      attention: [
        { code: "mission-execution-awaiting-authorization" },
        { code: "runner-unbound", runnerId: "runner-7", missionId: "mission-ghost" },
      ],
      runners: [
        {
          status: { runnerId: "runner-7", missionId: "mission-ghost" },
          binding: { kind: "unbound", reason: "no-explicit-mission-id-match" },
          freshness: {
            kind: "cached",
            sourceUpdatedAt: "2026-07-30T10:30:00Z",
            ageMs: 1_987_200_000,
          },
        },
      ],
    });

    // An awaiting-authorization Mission is a separate attention item and the
    // runner record is about 23 days of cached age: neither may read as a
    // current Runner fault or as current activity.
    expect(copy.label).toBe("实时 · 当前无控制载体");
    expect(copy.detail).toContain("历史缓存待处置");
    expect(copy.detail).not.toContain("Runner 未绑定");
    expect(copy.detail).not.toContain("等待授权");
  });

  test("splits the projection anomaly from the carrier state into two non-confusable segments", () => {
    const copy = incompleteProjectionCopy({
      complete: false,
      errors: [],
      freshness: { runners: "cached-status-files" },
      attention: [{ code: "runner-unreachable" }],
      runners: [
        {
          status: { runnerId: "runner-9", missionId: "mission-a", state: "running" },
          binding: {
            kind: "project-mission",
            projectKey: "registered:p",
            registeredProjectId: "p",
            missionId: "mission-a",
          },
          freshness: {
            kind: "cached",
            sourceUpdatedAt: "2026-07-26T10:30:00Z",
            ageMs: 3_600_000,
          },
        },
      ],
    });

    // 投影段 names the anomaly (incomplete projection / historical cache
    // pending disposition); 载体段 names the carrier absence. Neither segment
    // may read as the other, and the anomaly copy never borrows the healthy
    // no-agent standing.
    expect(copy.label).toBe("实时 · 当前无控制载体");
    expect(copy.detail).toContain("运行投影不完整 · 投影异常");
    expect(copy.detail).toContain("历史缓存待处置");
    expect(copy.detail).toContain("载体状态：当前没有可控制的运行载体");
    expect(copy.detail).toContain("不代表当前执行；载体状态：");
    expect(copy.detail).not.toContain("可正常浏览");
    expect(copy.detail).not.toContain("无运行中的 Agent");
  });
});

describe("task entry first-screen projection", () => {
  test("sorts open/waiting above verifying while every item stays in the list", () => {
    const verifying = { id: "verify-1", lifecycle: "verifying" };
    const open = { id: "open-1", lifecycle: "open" };
    const waiting = { id: "wait-1", lifecycle: "waiting" };
    const settled = { id: "done-1", lifecycle: "settled" };
    const ordered = orderWorkItemsForTaskEntry([verifying, settled, open, waiting]);
    expect(ordered.map((item: { id: string }) => item.id)).toEqual(["open-1", "wait-1", "done-1", "verify-1"]);
    // 排序只改变呈现顺序：成员完整保留（verifying 后置但不丢失）。
    expect(ordered).toHaveLength(4);
    expect(ordered).toContain(verifying);
  });

  test("keeps the received order inside the same lifecycle priority (stable)", () => {
    const first = { id: "verify-a", lifecycle: "verifying", updatedAt: "2026-08-22T09:00:00Z" };
    const second = { id: "verify-b", lifecycle: "verifying", updatedAt: "2026-08-22T10:00:00Z" };
    const open = { id: "open-a", lifecycle: "open" };
    expect(orderWorkItemsForTaskEntry([first, second, open]).map((item: { id: string }) => item.id))
      .toEqual(["open-a", "verify-a", "verify-b"]);
  });

  test("lifecycle priorities keep every non-open/waiting lifecycle between the two entry buckets", () => {
    expect(taskEntryLifecyclePriority({ lifecycle: "open" })).toBe(0);
    expect(taskEntryLifecyclePriority({ lifecycle: "waiting" })).toBe(0);
    expect(taskEntryLifecyclePriority({ lifecycle: "in-progress" })).toBe(1);
    expect(taskEntryLifecyclePriority({ lifecycle: "paused" })).toBe(1);
    expect(taskEntryLifecyclePriority({ lifecycle: "blocked" })).toBe(1);
    expect(taskEntryLifecyclePriority({ lifecycle: "settled" })).toBe(1);
    expect(taskEntryLifecyclePriority({ lifecycle: "invalidated" })).toBe(1);
    expect(taskEntryLifecyclePriority({ lifecycle: "verifying" })).toBe(2);
    // 缺失或未识别生命周期落在中间桶，绝不会排到 open/waiting 之前或 verifying 之后。
    expect(taskEntryLifecyclePriority({})).toBe(1);
    expect(taskEntryLifecyclePriority(null)).toBe(1);
  });

  test("projects a short updatedAt label only from a real timestamp and fails closed otherwise", () => {
    const source = "2026-08-22T14:05:00.000Z";
    const date = new Date(source);
    const pad = (value: number) => String(value).padStart(2, "0");
    const expected =
      pad(date.getMonth() + 1) + "-" + pad(date.getDate())
      + " " + pad(date.getHours()) + ":" + pad(date.getMinutes());
    expect(workItemUpdatedLabel({ updatedAt: source })).toBe(expected);
    // 来源缺失、为空或不可解析：fail-closed，绝不猜测时间。
    expect(workItemUpdatedLabel({})).toBeNull();
    expect(workItemUpdatedLabel(null)).toBeNull();
    expect(workItemUpdatedLabel({ updatedAt: "" })).toBeNull();
    expect(workItemUpdatedLabel({ updatedAt: "not-a-time" })).toBeNull();
    expect(workItemUpdatedLabel({ updatedAt: 42 })).toBeNull();
  });

  test("task entry defaults to the existing principal filter unless the user already chose another", () => {
    // 首次进入 tasks（没有 URL/locus 显式 filter，也没有点过筛选按钮）：
    // 入口默认落到已有 principal filter（待我行动视图）。
    expect(taskEntryDefaultFilter({ filterExplicit: false })).toBe("principal");
    expect(taskEntryDefaultFilter({})).toBe("principal");
    expect(taskEntryDefaultFilter(null)).toBe("principal");
    // URL/locus 的显式 filter 或用户已明确选择的其他 filter：入口不覆盖。
    expect(taskEntryDefaultFilter({ filterExplicit: true })).toBeNull();
  });

  test("direct ?view=tasks initialization applies the same principal default as the task entry", () => {
    // 直接打开/刷新 ?view=tasks：URL 没有显式 filter。locus 投影先恢复出
    // 缺省 all，初始化随即应用与桌面/移动入口相同的 principal 默认（待我），
    // 而不是停留在全部视图。
    const request = parsePrincipalLocus("http://rossovia.local/?view=tasks");
    expect(request.view).toBe("tasks");
    expect(request.filter).toBeNull();
    expect(request.invalidFields).toEqual([]);
    const restored = restoredPrincipalLocusState(
      resolvePrincipalLocus(request, { projects: [], workItems: [] }),
    );
    expect(restored.activeView).toBe("tasks");
    expect(restored.taskFilter).toBe("all");
    // 初始化应用入口默认投影：只有显式 filter 才放行恢复值。
    const entryDefault = taskEntryDefaultFilter({
      filterExplicit: request.filter !== null,
    });
    expect(entryDefault).toBe("principal");
    const appliedFilter = entryDefault !== null ? entryDefault : restored.taskFilter;
    expect(appliedFilter).toBe("principal");
    // 与点击任务入口（桌面/移动共用同一路径）的投影完全一致。
    expect(entryDefault).toBe(taskEntryDefaultFilter({ filterExplicit: false }));
  });

  test("explicit filters, including 全部 (all), survive direct-URL initialization untouched", () => {
    // 缺失 filter 与显式 filter 的边界：只要 URL 显式携带 filter（包括
    // filter=all），直接打开/刷新 ?view=tasks 就必须保留它，绝不落回
    // principal 默认。
    for (const filter of [
      "all",
      "principal",
      "agent",
      "agent-pending",
      "independent",
      "verification",
      "completed",
    ]) {
      const request = parsePrincipalLocus(
        `http://rossovia.local/?view=tasks&filter=${filter}`,
      );
      expect(request.filter).toBe(filter);
      const restored = restoredPrincipalLocusState(
        resolvePrincipalLocus(request, { projects: [], workItems: [] }),
      );
      expect(restored.taskFilter).toBe(filter);
      // 显式 filter 已明确：初始化/入口的默认投影必须放行。
      expect(taskEntryDefaultFilter({ filterExplicit: true })).toBeNull();
    }
  });
});

describe("backlog triage layered entry", () => {
  const principalPending = {
    id: "principal-task:11111111-1111-4111-8111-111111111111",
    kind: "principal-task",
    lifecycle: "open",
    nextActor: "principal",
    updatedAt: "2026-08-22T08:00:00Z",
  };
  const verifyingPrincipal = {
    id: "principal-task:22222222-2222-4222-8222-222222222222",
    kind: "principal-task",
    lifecycle: "verifying",
    nextActor: "principal",
    updatedAt: "2026-08-22T08:01:00Z",
  };
  const agentEligible = {
    id: "principal-task:33333333-3333-4333-8333-333333333333",
    kind: "principal-task",
    lifecycle: "open",
    nextActor: "agent",
    agentEligibility: {
      standing: "eligible",
      worktreePath: "/workspace/skills-wt",
      sourceRefs: [],
    },
    updatedAt: "2026-08-22T08:02:00Z",
  };
  const orphanedMissing = {
    id: "principal-task:44444444-4444-4444-8444-444444444444",
    kind: "principal-task",
    lifecycle: "open",
    nextActor: "agent",
    agentEligibility: {
      standing: "orphaned",
      reason: "missing-worktree",
      worktreePath: "/workspace/gone-wt",
      sourceRefs: [],
    },
    updatedAt: "2026-08-22T08:03:00Z",
  };
  const orphanedNoProject = {
    id: "principal-task:55555555-5555-4555-8555-555555555555",
    kind: "principal-task",
    lifecycle: "open",
    nextActor: "agent",
    agentEligibility: {
      standing: "orphaned",
      reason: "no-project-binding",
      worktreePath: null,
      sourceRefs: [],
    },
    updatedAt: "2026-08-22T08:04:00Z",
  };
  const completed = {
    id: "principal-task:66666666-6666-4666-8666-666666666666",
    kind: "principal-task",
    lifecycle: "settled",
    nextActor: "none",
    updatedAt: "2026-08-22T08:05:00Z",
  };
  const settledMission = {
    id: "mission:registered:p:m-settled:/workspace/m.json",
    kind: "mission",
    lifecycle: "settled",
    nextActor: "none",
    updatedAt: "2026-08-22T08:06:00Z",
  };
  const runnerDecision = {
    id: "attention:runner-interrupted:registered:p:mission-a",
    kind: "decision",
    lifecycle: "blocked",
    nextActor: "principal",
    runnerId: "runner-a",
    attentionCode: "runner-interrupted",
    evidence: { freshness: { kind: "live", observedAt: "2026-08-22T08:07:00Z" } },
    updatedAt: "2026-08-22T08:07:00Z",
  };
  const liveAgentWork = {
    id: "runner:runner-b",
    kind: "agent-work",
    lifecycle: "in-progress",
    nextActor: "agent",
    evidence: { freshness: { kind: "live", observedAt: "2026-08-22T08:08:00Z" } },
    updatedAt: "2026-08-22T08:08:00Z",
  };

  test("healthy backlog: four layers show counts, next steps, and the available standing", () => {
    const projection = backlogTriageProjection({
      items: [
        principalPending,
        verifyingPrincipal,
        agentEligible,
        orphanedMissing,
        orphanedNoProject,
        completed,
        settledMission,
        runnerDecision,
        liveAgentWork,
      ],
      sourceStanding: "complete",
    });
    expect(projection.standing).toBe("available");
    expect(projection.sourceStanding).toBe("complete");
    expect(projection.total).toBe(6);
    expect(projection.layers.principalPending.count).toBe(2);
    expect(projection.layers.agentTakeover.count).toBe(1);
    expect(projection.layers.orphanedHistory.count).toBe(2);
    expect(projection.layers.completed.count).toBe(1);
    // 每层下一步复用既有视图入口，不建立第二套状态。
    expect(projection.layers.principalPending.nextStep).toEqual({
      label: "下一步：打开「待我处理」处理下一项",
      view: "principal",
    });
    expect(projection.layers.agentTakeover.nextStep.view).toBe("agent-pending");
    expect(projection.layers.orphanedHistory.nextStep.view).toBe("agent-orphaned");
    expect(projection.layers.completed.nextStep.view).toBe("completed");
    expect(projection.note).toContain("不提供删除任务操作");
  });

  test("zero-safe-cleanup: every layer reports 0 reclaim candidates with a traceable reason", () => {
    const projection = backlogTriageProjection({
      items: [principalPending, verifyingPrincipal, agentEligible, orphanedMissing, completed],
      sourceStanding: "complete",
    });
    for (const key of ["principalPending", "agentTakeover", "orphanedHistory", "completed"]) {
      const cleanup = projection.layers[key].cleanup;
      expect(cleanup.candidates).toBe(0);
      expect(cleanup.reason).toContain("0 个可安全清理候选");
      expect(cleanup.reason).toContain("Workbench 不提供删除任务操作");
    }
    // 可行动分层：不可安全清理；失联/历史与已完成：无法确证安全清理，绝不表达可直接删除。
    expect(projection.layers.principalPending.cleanup.standing).toBe("no");
    expect(projection.layers.principalPending.cleanup.label).toBe("不可安全清理");
    expect(projection.layers.agentTakeover.cleanup.standing).toBe("no");
    expect(projection.layers.orphanedHistory.cleanup.standing).toBe("uncertain");
    expect(projection.layers.orphanedHistory.cleanup.label).toBe("无法确证安全清理");
    expect(projection.layers.completed.cleanup.standing).toBe("uncertain");
    // 零候选的原因可追溯：来自 agentEligibility.reason（worktree 投影）而非猜测。
    expect(projection.layers.orphanedHistory.cleanup.reason).toContain("missing-worktree");
    expect(projection.layers.orphanedHistory.cleanup.reason).toContain("绑定 Worktree 已不在当前投影");
    expect(projection.layers.orphanedHistory.cleanup.reason).not.toContain("可直接删除");
  });

  test("mixed responsibility: every item lands in exactly one layer with no leakage", () => {
    const projection = backlogTriageProjection({
      items: [
        principalPending,
        agentEligible,
        orphanedNoProject,
        completed,
        settledMission,
        runnerDecision,
        liveAgentWork,
      ],
      sourceStanding: "complete",
    });
    expect(projection.total).toBe(4);
    const layerCounts = [
      projection.layers.principalPending.count,
      projection.layers.agentTakeover.count,
      projection.layers.orphanedHistory.count,
      projection.layers.completed.count,
    ];
    expect(layerCounts.reduce((sum: number, count: number) => sum + count, 0)).toBe(projection.total);
    expect(projection.layers.principalPending.count).toBe(1);
    expect(projection.layers.agentTakeover.count).toBe(1);
    expect(projection.layers.orphanedHistory.count).toBe(1);
    expect(projection.layers.completed.count).toBe(1);
    // 已结算 Mission、runner 决策与 live agent-work 都不进入分层（分层只覆盖 principal-task 待办）。
    expect(projection.layers.completed.count).toBe(1);
  });

  test("fail-closed unknown: an unavailable task source never reads as a factual zero", () => {
    const projection = backlogTriageProjection({
      items: [principalPending, agentEligible],
      sourceStanding: "partial",
    });
    expect(projection.standing).toBe("unavailable");
    expect(projection.total).toBeNull();
    expect(projection.layers.principalPending.count).toBeNull();
    expect(projection.layers.agentTakeover.cleanup.candidates).toBeNull();
    expect(projection.layers.agentTakeover.cleanup.standing).toBe("unavailable");
    expect(projection.note).toContain("不冒充零");
  });
});
