import { describe, expect, test } from "bun:test";
// @ts-expect-error The browser UI is intentionally JavaScript and embedded as a static asset.
import { conversationConnectionLabel, incompleteProjectionCopy, projectionMastheadLabel } from "../ui/app.js";

/**
 * The session-page two-layer copy boundary. The running-projection layer
 * (masthead) and the conversation connection layer (socket standing) are two
 * independent facts with the same visible vocabulary, so the copy must keep
 * them distinguishable without inventing a new status source: the snapshot
 * attention/errors/freshness and conversationState.connection stay the only
 * inputs. Three stories: the projection layer copy, the conversation layer
 * independence, and the live/healthy + unbound vs. disconnected comparison
 * surface.
 */

const unboundSnapshot = {
  complete: false,
  errors: [],
  freshness: { runners: "cached-status-files" },
  attention: [{ code: "runner-unbound" }],
};

const healthySnapshot = {
  complete: true,
  errors: [],
  freshness: { runners: "live" },
  attention: [],
};

describe("running-projection layer copy (story 1)", () => {
  test("the unbound standing labels the masthead 运行投影可读 and keeps the incomplete facts, reason, and recovery direction", () => {
    const copy = incompleteProjectionCopy(unboundSnapshot);
    expect(copy.label).toBe("运行投影可读 · Runner 未绑定");
    expect(copy.detail).toContain("运行投影不完整 · Runner 未绑定");
    expect(copy.detail).toContain("刷新投影，修正 Mission 绑定");
    expect(copy.detail).toContain("恢复或处置 Runner 后再控制");
    // The label never borrows the conversation vocabulary: it must not read
    // as a broken conversation connection.
    expect(copy.label).not.toContain("断开");
    expect(copy.label).not.toContain("对话");
  });

  test("the healthy live masthead names the 运行投影 layer instead of the bare 实时 · 已连接", () => {
    expect(projectionMastheadLabel({
      source: "live",
      snapshot: healthySnapshot,
      conversationConnection: "live",
      conversationView: true,
    })).toEqual({ label: "运行投影实时 · 已连接", mark: "live" });
  });
});

describe("conversation connection layer stays independent (story 2)", () => {
  test("the conversation standing renders from the socket state alone under every projection", () => {
    expect(conversationConnectionLabel("live")).toBe("已连接 · 实时");
    expect(conversationConnectionLabel("connecting")).toBe("正在连接");
    expect(conversationConnectionLabel("disconnected")).toBe("已断开 · 正在重连");
    expect(conversationConnectionLabel("unavailable")).toBe("不可用");
    // An unbound/incomplete projection cannot change the conversation label:
    // both layers are rendered from their own single source.
    expect(projectionMastheadLabel({
      source: "live",
      snapshot: unboundSnapshot,
      conversationConnection: "live",
      conversationView: true,
    }).label).toBe("运行投影可读 · Runner 未绑定");
    expect(conversationConnectionLabel("live")).toBe("已连接 · 实时");
  });

  test("a disconnected conversation is reported on its own layer while the projection stays healthy", () => {
    expect(projectionMastheadLabel({
      source: "live",
      snapshot: healthySnapshot,
      conversationConnection: "disconnected",
      conversationView: true,
    })).toEqual({ label: "运行投影已连接 · 对话已断开", mark: "warning" });
    expect(conversationConnectionLabel("disconnected")).toBe("已断开 · 正在重连");
  });

  test("the conversation issue never borrows the projection's unbound copy and vice versa", () => {
    const withConversationIssue = projectionMastheadLabel({
      source: "live",
      snapshot: unboundSnapshot,
      conversationConnection: "unavailable",
      conversationView: true,
    });
    expect(withConversationIssue.label).toBe("运行投影已连接 · 对话不可用");
    expect(withConversationIssue.label).not.toContain("Runner");
    expect(withConversationIssue.label).not.toContain("未绑定");
    // Outside the conversation view the same inputs keep the projection copy.
    expect(projectionMastheadLabel({
      source: "live",
      snapshot: unboundSnapshot,
      conversationConnection: "unavailable",
      conversationView: false,
    }).label).toBe("运行投影可读 · Runner 未绑定");
  });
});

describe("live/healthy, unbound, and disconnected comparison surface (story 3)", () => {
  test("live/healthy projection plus live conversation renders two distinct labels", () => {
    const projection = projectionMastheadLabel({
      source: "live",
      snapshot: healthySnapshot,
      conversationConnection: "live",
      conversationView: true,
    });
    const conversation = conversationConnectionLabel("live");
    expect(projection.label).toContain("运行投影");
    expect(conversation).toBe("已连接 · 实时");
    expect(projection.label).not.toBe(conversation);
    expect(projection.label).not.toContain("对话");
  });

  test("unbound projection plus live conversation keeps Runner facts on the projection layer only", () => {
    const projection = projectionMastheadLabel({
      source: "live",
      snapshot: unboundSnapshot,
      conversationConnection: "live",
      conversationView: true,
    });
    expect(projection.label).toBe("运行投影可读 · Runner 未绑定");
    expect(projection.label).not.toContain("对话");
    expect(projection.label).not.toContain("断开");
    expect(conversationConnectionLabel("live")).toBe("已连接 · 实时");
  });

  test("healthy projection plus disconnected conversation keeps the disconnection on the conversation layer only", () => {
    const projection = projectionMastheadLabel({
      source: "live",
      snapshot: healthySnapshot,
      conversationConnection: "disconnected",
      conversationView: true,
    });
    expect(projection.label).toBe("运行投影已连接 · 对话已断开");
    expect(projection.label).not.toContain("Runner");
    expect(conversationConnectionLabel("disconnected")).toBe("已断开 · 正在重连");
    expect(conversationConnectionLabel("disconnected")).not.toContain("运行投影");
  });
});
