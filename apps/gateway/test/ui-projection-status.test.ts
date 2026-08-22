import { describe, expect, test } from "bun:test";
// @ts-expect-error app.js is the browser entrypoint; this test imports its pure projection copy.
import { incompleteProjectionCopy } from "../ui/app.js";

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
});
