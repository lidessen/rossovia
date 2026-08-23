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

/**
 * One healthy boot startup gate shaped like the production entry serves on
 * every snapshot body (see SelfCheckStartupGate). Only this exact shape with
 * a clean mechanical source observation may open the no-agent standing.
 */
const healthyStartupGate = {
  version: "rossovia.self-check.v1",
  scope: "boot",
  mode: "normal",
  readiness: "boot-ready",
  projection: "not-checked",
  startupStatus: "healthy",
  mechanical: {
    status: "healthy",
    checks: [],
    source: {
      cwd: "/home/principal/rossovia",
      root: "/home/principal/rossovia",
      head: "1".repeat(40),
      dirty: false,
      changedAfterStart: false,
      freshness: "current",
      statusLines: [],
    },
  },
  checkedAt: "2026-08-21T12:00:00Z",
};

/** One live-probe-confirmed runner: a current controllable carrier. */
const liveRunner = {
  sourcePath: "/home/rossovia/missions/mission-a/runner-status.json",
  status: { runnerId: "runner-a", missionId: "mission-a", state: "running" },
  binding: {
    kind: "project-mission",
    projectKey: "registered:p",
    registeredProjectId: "p",
    missionId: "mission-a",
  },
  freshness: { kind: "live", observedAt: "2026-08-22T10:30:00Z" },
  live: true,
};

/** One retained cached record that is bound and deliberately stopped: history, not a carrier. */
const cachedStoppedRunner = {
  sourcePath: "/home/rossovia/missions/mission-a/runner-status.json",
  status: { runnerId: "runner-a", missionId: "mission-a", state: "stopped" },
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
};

/** One retained cached record that is unbound: a real incomplete-source fault. */
const cachedUnboundRunner = {
  sourcePath: "/home/rossovia/missions/mission-x/runner-status.json",
  status: { runnerId: "runner-7", missionId: "mission-x", state: "running" },
  binding: { kind: "unbound", reason: "no-explicit-mission-id-match" },
  freshness: {
    kind: "cached",
    sourceUpdatedAt: "2026-07-26T10:30:00Z",
    ageMs: 1_800_000,
  },
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

describe("healthy no-carrier, incomplete-source, and active-carrier standing (story 4)", () => {
  const noCarrierBase = {
    source: "live",
    snapshot: {
      complete: true,
      errors: [],
      freshness: { runners: "cached-status-files", runnerUpdatedAtRange: null },
      attention: [],
      runners: [],
      startup: healthyStartupGate,
    },
    conversationConnection: "live",
    conversationView: true,
  };

  test("startup healthy with a clean source and no live carrier states 当前无运行中的 Agent without any projection anomaly", () => {
    expect(projectionMastheadLabel(noCarrierBase)).toEqual({
      label: "当前无运行中的 Agent · 可正常浏览与创建任务",
      mark: "live",
    });
  });

  test("retained cached runner records do not turn the healthy no-carrier state into a projection anomaly", () => {
    // A bound, deliberately stopped cached record is history, not a current
    // fault and not a live carrier: the no-agent standing stays and the
    // anomaly copy never appears under it.
    expect(projectionMastheadLabel({
      ...noCarrierBase,
      snapshot: { ...noCarrierBase.snapshot, runners: [cachedStoppedRunner] },
    })).toEqual({
      label: "当前无运行中的 Agent · 可正常浏览与创建任务",
      mark: "live",
    });
  });

  test("an active control carrier keeps the running-carrier status and never reports no running Agent", () => {
    expect(projectionMastheadLabel({
      ...noCarrierBase,
      snapshot: { ...noCarrierBase.snapshot, runners: [liveRunner] },
    })).toEqual({ label: "运行投影实时 · 已连接", mark: "live" });
    expect(projectionMastheadLabel({
      ...noCarrierBase,
      snapshot: { ...noCarrierBase.snapshot, runners: [liveRunner] },
    }).label).not.toContain("无运行中的 Agent");
  });

  test("a real source error keeps 部分来源不可用 ahead of any no-agent claim", () => {
    expect(projectionMastheadLabel({
      ...noCarrierBase,
      snapshot: {
        ...noCarrierBase.snapshot,
        complete: false,
        errors: [{ summary: "runner status read failed" }],
      },
    })).toEqual({ label: "实时 · 部分来源不可用", mark: "warning" });
  });

  test("a source-incomplete projection keeps its anomaly copy even with cached runner records", () => {
    expect(projectionMastheadLabel({
      ...noCarrierBase,
      snapshot: {
        ...noCarrierBase.snapshot,
        complete: false,
        attention: [
          { code: "runner-unbound", runnerId: "runner-7", missionId: "mission-x" },
        ],
        runners: [cachedUnboundRunner],
      },
    })).toEqual({ label: "实时 · 当前无控制载体", mark: "warning" });
    expect(projectionMastheadLabel({
      ...noCarrierBase,
      snapshot: {
        ...noCarrierBase.snapshot,
        complete: false,
        attention: [
          { code: "runner-unbound", runnerId: "runner-7", missionId: "mission-x" },
        ],
        runners: [cachedUnboundRunner],
      },
    }).label).not.toContain("可正常浏览");
  });

  test("fails closed: absent, non-healthy, or dirty startup evidence never allows the no-agent copy", () => {
    // No startup gate in the snapshot: boot health is unknown, so the carrier
    // claim stays on the existing running label instead of being invented.
    const { startup: _startup, ...withoutStartup } = noCarrierBase.snapshot;
    expect(projectionMastheadLabel({
      ...noCarrierBase,
      snapshot: withoutStartup,
    })).toEqual({ label: "运行投影实时 · 已连接", mark: "live" });
    // A diagnostic startup gate fails closed the same way.
    expect(projectionMastheadLabel({
      ...noCarrierBase,
      snapshot: {
        ...noCarrierBase.snapshot,
        startup: {
          ...healthyStartupGate,
          mode: "safe-diagnostic",
          startupStatus: "attention",
        },
      },
    })).toEqual({ label: "运行投影实时 · 已连接", mark: "live" });
    // A healthy gate whose mechanical source observation is dirty is not
    // source clean; the no-agent claim stays withheld.
    expect(projectionMastheadLabel({
      ...noCarrierBase,
      snapshot: {
        ...noCarrierBase.snapshot,
        startup: {
          ...healthyStartupGate,
          mechanical: {
            ...healthyStartupGate.mechanical,
            source: { ...healthyStartupGate.mechanical.source, dirty: true },
          },
        },
      },
    })).toEqual({ label: "运行投影实时 · 已连接", mark: "live" });
    // An aggregate live claim without a live-proven runner is a contradiction:
    // the absence of an Agent is never claimed under it.
    expect(projectionMastheadLabel({
      ...noCarrierBase,
      snapshot: {
        ...noCarrierBase.snapshot,
        freshness: { runners: "live", runnerUpdatedAtRange: null },
      },
    })).toEqual({ label: "运行投影实时 · 已连接", mark: "live" });
  });
});
