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
});
