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
      label: "实时 · Runner 未绑定",
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

  test("names the ambiguous Mission binding reason instead of a generic need-to-check", () => {
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

    expect(copy.label).toBe("实时 · Runner 未绑定");
    expect(copy.detail).toContain("同时命中多个项目");
    // The visible guidance names the exact disambiguation target; the bare
    // phrase would silently diverge from the served copy.
    expect(copy.detail).toContain("消除 Mission ID 歧义");
    expect(copy.detail).toContain("运行状态仅来自缓存");
    expect(copy.detail).not.toContain("需核查");
  });

  test("states the cached-only source freshness when no binding is missing", () => {
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

    expect(copy.label).toBe("实时 · Runner 仅缓存");
    expect(copy.detail).toContain("来源新鲜度不足以证明当前执行");
    expect(copy.detail).toContain("恢复或处置 Runner");
    expect(copy.detail).not.toContain("需核查");
    expect(copy.detail).not.toContain("不可达");
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
    expect(copy.label).toBe("实时 · Runner 未绑定");
    expect(copy.detail).not.toContain("消除 Mission ID 歧义");
    expect(copy.detail).not.toContain("同时命中多个项目");
    expect(copy.detail).toContain("修正 Mission 绑定");
  });

  test("maps the known no-explicit-mission-id-match structured reason to its guidance", () => {
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

    expect(copy.label).toBe("实时 · Runner 未绑定");
    expect(copy.detail).toContain("未命中任何已观察 Mission 记录");
    expect(copy.detail).toContain("运行状态仅来自缓存");
    expect(copy.detail).not.toContain("消除 Mission ID 歧义");
  });

  test("renders an explicit unknown-reason fallback for an unrecognized structured binding reason", () => {
    const copy = incompleteProjectionCopy({
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

    expect(copy.label).toBe("实时 · Runner 未绑定");
    // An unrecognized reason must not be mapped onto the no-match guidance.
    expect(copy.detail).toContain("绑定原因未被当前投影识别");
    expect(copy.detail).toContain("核对 runner 归属与 Mission 绑定来源");
    expect(copy.detail).not.toContain("未命中任何已观察 Mission 记录");
    expect(copy.detail).not.toContain("消除 Mission ID 歧义");
  });
});
