import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
// @ts-expect-error app.js is the browser entrypoint; this test imports its pure conversation exports.
import * as conversation from "../ui/app.js";

const {
  buildConversationSocketUrl,
  classifyConversationEvent,
  conversationMessageSubmitFrame,
  conversationResponseInterruptFrame,
  conversationWorkControlFrame,
  CONVERSATION_TURN_TERMINAL_EVENTS,
  parseConversationServerFrame,
  reduceDurableEvents,
  taskEvidenceLinkTarget,
} = conversation;

const html = readFileSync(resolve(import.meta.dir, "../ui/index.html"), "utf8");
const app = readFileSync(resolve(import.meta.dir, "../ui/app.js"), "utf8");
const styles = readFileSync(resolve(import.meta.dir, "../ui/styles.css"), "utf8");

const conversationId = "11111111-1111-4111-8111-111111111111";
const turnId = "22222222-2222-4222-8222-222222222222";
const actionId = "33333333-3333-4333-8333-333333333333";

function journalEvent(sequence: number, type: string, data = {}) {
  return { sequence, type, data };
}

describe("conversation socket and cursor", () => {
  test("connects the exact frozen route with the client conversation id and after cursor", () => {
    expect(
      buildConversationSocketUrl("http://127.0.0.1:4317/", conversationId, -1),
    ).toBe(`ws://127.0.0.1:4317/api/conversations/${conversationId}/socket?after=-1`);
    expect(
      buildConversationSocketUrl(
        "http://127.0.0.1:4317/?view=conversation",
        conversationId,
        7,
      ),
    ).toBe(`ws://127.0.0.1:4317/api/conversations/${conversationId}/socket?after=7`);
    expect(
      buildConversationSocketUrl("https://workbench.local/", conversationId, 0),
    ).toBe(`wss://workbench.local/api/conversations/${conversationId}/socket?after=0`);
  });

  test("applies durable events strictly in order, deduplicates, and buffers gaps", () => {
    let state = reduceDurableEvents({ cursor: -1, buffered: [] }, journalEvent(0, "message.received"));
    expect(state.cursor).toBe(0);
    expect(state.applied).toHaveLength(1);
    expect(state.duplicates).toBe(0);

    state = reduceDurableEvents(state, journalEvent(2, "action.requested"));
    expect(state.cursor).toBe(0);
    expect(state.applied).toHaveLength(0);
    expect(state.buffered.map((event: { sequence: number }) => event.sequence)).toEqual([2]);

    state = reduceDurableEvents(state, journalEvent(1, "coordinator.turn-started"));
    expect(state.cursor).toBe(2);
    expect(state.applied.map((event: { sequence: number }) => event.sequence)).toEqual([1, 2]);
    expect(state.buffered).toHaveLength(0);

    state = reduceDurableEvents(state, journalEvent(1, "coordinator.turn-started"));
    expect(state.cursor).toBe(2);
    expect(state.applied).toHaveLength(0);
    expect(state.duplicates).toBe(1);
  });

  test("rejects a replayed event at or below the applied cursor without re-advancing", () => {
    const first = reduceDurableEvents({ cursor: 5, buffered: [] }, journalEvent(5, "coordinator.turn-settled"));
    expect(first.cursor).toBe(5);
    expect(first.applied).toHaveLength(0);
    expect(first.duplicates).toBe(1);
  });
});

describe("conversation frame vocabulary", () => {
  test("builds message.submit with a client-generated UUID and non-empty payload", () => {
    const frame = conversationMessageSubmitFrame(conversationId, "fix the fixture");
    expect(frame).toEqual({
      type: "message.submit",
      clientMessageId: conversationId,
      payload: "fix the fixture",
    });
    expect(conversationMessageSubmitFrame(conversationId, "   ")).toBeNull();
    expect(conversationMessageSubmitFrame("not-a-uuid", "x")).toBeNull();
  });

  test("targets response.interrupt at the exact active turn only", () => {
    expect(conversationResponseInterruptFrame(turnId)).toEqual({
      type: "response.interrupt",
      turnId,
    });
    expect(conversationResponseInterruptFrame("")).toBeNull();
  });

  test("targets work.control stop at the exact turn, action, and carrier tuple", () => {
    expect(
      conversationWorkControlFrame({
        turnId,
        actionId,
        carrierId: "attempt-4",
      }),
    ).toEqual({
      type: "work.control",
      turnId,
      actionId,
      carrierId: "attempt-4",
      control: "stop",
    });
    expect(
      conversationWorkControlFrame({ turnId, actionId, carrierId: "" }),
    ).toBeNull();
    expect(
      conversationWorkControlFrame({ turnId, actionId, carrierId: "attempt-4" }, "pause"),
    ).toBeNull();
  });

  test("accepts durable and provisional server frames and rejects unknown shapes", () => {
    expect(
      parseConversationServerFrame(
        JSON.stringify({
          type: "journal.event",
          event: { sequence: 0, type: "message.received", data: {} },
        }),
      ),
    ).not.toBeNull();
    expect(
      parseConversationServerFrame(
        JSON.stringify({ type: "response.delta", turnId, messageId: turnId, text: "…" }),
      ),
    ).not.toBeNull();
    expect(
      parseConversationServerFrame(JSON.stringify({ type: "activity.delta" })),
    ).toBeNull();
    expect(
      parseConversationServerFrame(JSON.stringify({
        type: "carrier.terminal",
        turnId,
        messageId: turnId,
        actionId,
        carrierId: "attempt-4",
        status: "recorded",
        cellStatus: "passed",
        evidenceRefs: ["state/task-attempts/attempt-4/settlement.json"],
      })),
    ).not.toBeNull();
    expect(
      parseConversationServerFrame(JSON.stringify({
        type: "carrier.terminal",
        status: "recorded",
      })),
    ).toBeNull();
    expect(
      parseConversationServerFrame(JSON.stringify({
        type: "carrier.standing",
        standing: "live",
        turnId,
        messageId: turnId,
        actionId,
        carrierId: "attempt-4",
        taskId: "fixture-task",
        attemptId: "attempt-4",
      })),
    ).not.toBeNull();
    expect(
      parseConversationServerFrame(JSON.stringify({
        type: "carrier.standing",
        standing: "terminal",
        turnId,
        messageId: turnId,
        actionId,
        carrierId: "attempt-4",
        taskId: "fixture-task",
        attemptId: "attempt-4",
        status: "recorded",
        cellStatus: "passed",
        evidenceRefs: ["state/task-attempts/attempt-4/settlement.json"],
      })),
    ).not.toBeNull();
    expect(
      parseConversationServerFrame(JSON.stringify({
        type: "carrier.standing",
        standing: "unknown",
        turnId,
        messageId: turnId,
        actionId,
        carrierId: "attempt-4",
        taskId: "fixture-task",
        attemptId: "attempt-4",
        reason: "no terminal settlement",
      })),
    ).not.toBeNull();
    expect(
      parseConversationServerFrame(JSON.stringify({
        type: "carrier.standing",
        standing: "live",
      })),
    ).toBeNull();
    expect(
      parseConversationServerFrame(JSON.stringify({
        type: "carrier.standing",
        standing: "unknown",
        turnId,
        messageId: turnId,
        actionId,
        carrierId: "attempt-4",
        taskId: "fixture-task",
        attemptId: "attempt-4",
      })),
    ).toBeNull();
    expect(
      parseConversationServerFrame(JSON.stringify({
        type: "carrier.standing",
        standing: "started",
        turnId,
        messageId: turnId,
        actionId,
        carrierId: "attempt-4",
        taskId: "fixture-task",
        attemptId: "attempt-4",
      })),
    ).toBeNull();
    expect(parseConversationServerFrame("{broken")).toBeNull();
    expect(parseConversationServerFrame("42")).toBeNull();
  });
});

describe("conversation event classification", () => {
  test("covers received, turn-started, action, settled, failed, interrupted, and uncertain", () => {
    expect(classifyConversationEvent(journalEvent(0, "message.received"))).toBe("received");
    expect(classifyConversationEvent(journalEvent(0, "coordinator.turn-started"))).toBe("turn-started");
    expect(classifyConversationEvent(journalEvent(0, "action.requested"))).toBe("action-requested");
    expect(classifyConversationEvent(journalEvent(0, "action.settled"))).toBe("action-settled");
    expect(classifyConversationEvent(journalEvent(0, "action.failed"))).toBe("action-failed");
    expect(classifyConversationEvent(journalEvent(0, "action.uncertain"))).toBe("action-uncertain");
    expect(classifyConversationEvent(journalEvent(0, "coordinator.turn-settled"))).toBe("settled");
    expect(classifyConversationEvent(journalEvent(0, "coordinator.turn-failed"))).toBe("failed");
    expect(classifyConversationEvent(journalEvent(0, "coordinator.turn-interrupted"))).toBe("interrupted");
    expect(classifyConversationEvent(journalEvent(0, "response.delta"))).toBe("unknown");
    expect(CONVERSATION_TURN_TERMINAL_EVENTS.has("coordinator.turn-settled")).toBeTrue();
  });
});

describe("conversation evidence links", () => {
  test("links a task receipt ref only when the task is present in the current snapshot", () => {
    const workItems = [
      { id: `principal-task:${turnId}` },
      { id: "principal-task:44444444-4444-4444-8444-444444444444" },
    ];
    expect(
      taskEvidenceLinkTarget(
        `workbench:state/tasks.json:task/${turnId}@12`,
        workItems,
      ),
    ).toBe(`principal-task:${turnId}`);
    expect(
      taskEvidenceLinkTarget(
        "workbench:state/tasks.json:task/99999999-9999-4999-8999-999999999999@1",
        workItems,
      ),
    ).toBeNull();
    expect(taskEvidenceLinkTarget("state/task-attempts", workItems)).toBeNull();
    expect(taskEvidenceLinkTarget(42, workItems)).toBeNull();
  });
});

describe("conversation projection DOM contract", () => {
  test("provides a stable conversation destination in desktop and mobile navigation", () => {
    expect(html).toContain('data-view="conversation"');
    expect(html).toContain('data-mobile-view="conversation"');
    expect(html).toContain('id="conversation-surface"');
    expect(html).toContain('<h2 id="conversation-heading">对话</h2>');
    expect(app).toContain('"conversation"');
    expect(app).toContain('activeView: "conversation"');
  });

  test("keeps multiline composer semantics: Enter submits, Shift+Enter breaks, empty input never submits", () => {
    expect(app).toContain('event.key === "Enter" && !event.shiftKey');
    expect(app).toContain("event.preventDefault();");
    expect(app).toContain('payload.trim() === ""');
    expect(app).toContain("空消息不会发送");
    expect(html).toContain("Enter 发送，Shift+Enter 换行");
    expect(html).toContain('id="conversation-composer-text"');
  });

  test("retains the draft locally and shows pending and failed message standing", () => {
    expect(app).toContain("conversationDraftStorageKey");
    expect(app).toContain("persistConversationDraft()");
    expect(app).toContain('status: "pending"');
    expect(app).toContain('entry.status = "failed"');
    expect(app).toContain("送达未确认");
    expect(app).toContain("pending · 发送中");
    expect(app).toContain("failed · 送达未确认");
  });

  test("never resends a message or work control automatically", () => {
    expect(app).toContain("不会自动重发");
    expect(app).toContain("不会产生重复效果");
    expect(app).toContain("重试复用同一消息标识");
    expect(app).toContain('type: "work.control"');
    expect(app).not.toContain("setInterval");
  });

  test("reconnects with the last applied cursor and drops provisional deltas", () => {
    expect(app).toContain("conversationState.cursor");
    expect(app).toContain("clearConversationProvisional()");
    expect(app).toContain("Provisional deltas are never replayed");
    expect(app).toContain('entry.status = "pending"');
    expect(app).toContain('conversationState.connection = "disconnected"');
    expect(app).toContain("正在重连");
    expect(html).toContain('id="conversation-reconnect"');
    expect(app).toContain("只恢复已结算事件");
  });

  test("renders provisional deltas as provisional and settled replies as durable", () => {
    expect(app).toContain('data-provisional="true"');
    expect(app).toContain("临时流式内容");
    expect(app).toContain("不会伪装成 durable");
    expect(app).toContain("coordinator.turn-settled");
    expect(app).toContain("turn-response");
    expect(app).toContain("settled · 已结算");
  });

  test("shows requested vs observed provider/model with unknown for an unobserved started turn", () => {
    expect(app).toContain("请求 provider/model");
    expect(app).toContain("实际 provider/model");
    expect(app).toContain("requestedPolicyLabel");
    expect(app).toContain("unknown · 尚未报告");
    expect(app).toContain("未报告 · unknown");
    expect(app).toContain('first(raw, ["provider"], "unknown")');
    expect(app).toContain('first(raw, ["model"], "unknown")');
    expect(app).toContain(
      'raw = policy !== null && typeof policy === "object" ? policy : {}',
    );
    expect(app).toContain(
      'raw = evidence !== null && typeof evidence === "object" ? evidence : {}',
    );
    expect(app).not.toContain("first(policy, [], {})");
    expect(app).not.toContain("first(evidence, [], {})");
    expect(app).not.toContain("first(entry.requestedPolicy, [], {})");
  });

  test("renders the observed line from observed evidence only and never falls back to the requested policy", () => {
    expect(app).toContain("requestedPolicyLabel(policy)");
    expect(app).toContain("observedEvidenceLabel(entry.observedEvidence)");
    expect(app).toContain("请求 provider/model");
    expect(app).toContain("实际 provider/model");
    expect(app).not.toContain("observedEvidenceLabel(policy)");
    expect(app).not.toContain("observedEvidenceLabel(entry.requestedPolicy)");
    expect(app).not.toContain("requestedPolicyLabel(entry.observedEvidence)");
    // A same-as-requested reported identity renders verbatim from the
    // observed evidence object; an unreported field stays unknown because
    // the unknown fallback is applied by text() to first(raw, [field]).
    expect(app).toContain('text(first(raw, ["provider"]), "unknown")');
    expect(app).toContain('text(first(raw, ["model"]), "unknown")');
    expect(app).toContain("未报告 · unknown");
  });

  test("renders task, project, activity, and result evidence references", () => {
    expect(app).toContain("canonical 证据引用");
    expect(app).toContain("renderConversationEvidenceRefs");
    expect(app).toContain("查看任务");
    expect(app).toContain("task_create");
    expect(app).toContain("task_correct");
    expect(app).toContain("task_continue");
    expect(app).toContain("work_control");
    expect(app).toContain("carrier-identity");
    expect(app).toContain("carrier-activity");
  });

  test("keeps tool interrupt truthfully unavailable and separates work stop from response interrupt", () => {
    expect(html).toContain("工具中断 · 运行时不支持");
    expect(html).toMatch(
      /id="conversation-tool-interrupt"\s+type="button"\s+disabled/s,
    );
    expect(app).not.toContain('type: "tool.interrupt"');
    expect(app).toContain("中断这条回复");
    expect(app).toContain("停止该工作");
    expect(app).toContain('control !== "stop"');
    expect(app).toContain("此回复已按请求中断；工作控制不受其影响");
    expect(app).toContain("只发送精确 turn/action/carrier 目标");
  });

  test("derives the stop affordance from owner-backed terminal standing and keeps terminal history visible", () => {
    expect(app).toContain('frame.type === "carrier.terminal"');
    expect(app).toContain('case "carrier.terminal"');
    expect(app).toContain("carrier.terminal = {");
    expect(app).toContain("已终止 · 活动历史保留");
    expect(app).toContain("停止控制已移除");
    expect(app).toContain("conversationCarrierTerminalCopy");
    expect(app).toContain('data-carrier-terminal');
    expect(app).toContain("该载体已终止；停止未发送");
    expect(app).toContain('if (carrier.terminal !== undefined)');
    // A terminal carrier never renders a stop button; only the live branch does.
    const carrierBlock = app.slice(
      app.indexOf("function renderConversationCarrier"),
      app.indexOf("function renderConversationAction"),
    );
    expect(carrierBlock).toContain('class="carrier-terminal"');
    expect(carrierBlock).toContain("terminal !== undefined");
    expect(carrierBlock).toContain("停止该工作");
    expect(carrierBlock.indexOf("data-conversation-work-stop"))
      .toBeGreaterThan(carrierBlock.indexOf('class="carrier-terminal"'));
  });

  test("rehydrates exact owner-backed carrier standing after replay and keeps terminal and unknown carriers non-stoppable", () => {
    expect(app).toContain('case "carrier.standing"');
    expect(app).toContain('frame.standing === "terminal"');
    expect(app).toContain('frame.standing === "unknown"');
    expect(app).toContain('carrier.standing = "live"');
    expect(app).toContain('carrier.standing === "unknown"');
    expect(app).toContain("状态未知 · 停止不可用");
    expect(app).toContain("状态未知 · 无停止控制");
    expect(app).toContain("重连水合无法证明该载体当前 live");
    expect(app).toContain("该载体当前没有可验证的 live 运行；停止未发送，状态与历史保留。");
    expect(app).toContain("carrier.standingReason");
    // Hydration is applied through the same validated frame vocabulary and
    // never resends stale client memory; the local carrier memory is still
    // cleared on disconnect and rebuilt only from server hydration.
    expect(app).toContain("重连水合");
    expect(app).toContain("不会保留或重发旧状态");
    const carrierBlock = app.slice(
      app.indexOf("function renderConversationCarrier"),
      app.indexOf("function renderConversationAction"),
    );
    expect(carrierBlock).toContain('class="carrier-terminal"');
    expect(carrierBlock.indexOf("data-conversation-work-stop"))
      .toBeGreaterThan(carrierBlock.indexOf('class="carrier-terminal"'));
  });

  test("exposes one explicit ordinary-attempt result submission without auto-submit or auto-accept", () => {
    expect(html).toContain('id="task-attempt-result-candidate"');
    expect(html).toContain('id="task-submit-attempt-result"');
    expect(html).toContain("提交当前已验证运行尝试结果");
    expect(html).toContain("不会自动提交或验收");
    expect(app).toContain('["attemptResultCandidate"]');
    expect(app).toContain('kind: "ordinary-attempt-result.v1"');
    expect(app).toContain("expectedWorktreeHead");
    expect(app).toContain('$("#task-submit-attempt-result")');
    expect(app).toContain("task-attempt-result-effect");
    expect(app).not.toContain('kind: "submit-verified-execution", // auto');
  });

  test("preserves Principal task acceptance as a separate explicit control", () => {
    expect(html).toContain('id="task-accept-button"');
    expect(app).toContain("本地验收只在任务详情中显式执行，conversation 不代替 Principal 验收");
    const conversationBlock = app.slice(
      app.indexOf("function renderConversationSurface"),
      app.indexOf("function bindConversationEvents"),
    );
    expect(conversationBlock).not.toContain("task-accept-button");
    expect(conversationBlock).not.toContain('"accept"');
  });

  test("refreshes canonical projection without replaying effects", () => {
    expect(app).toContain('case "projection.changed"');
    expect(app).toContain("loadSnapshot({ manual: true, ensure: true })");
    expect(app).toContain("conversationState.protocolNotices");
  });

  test("keeps the composer focused and the feed scroll as presentation focus", () => {
    expect(app).toContain('$("#conversation-composer-text").focus({ preventScroll: true })');
    expect(app).toContain("conversationState.stickToBottom");
    expect(app).toContain('feed.scrollTop = feed.scrollHeight');
  });

  test("keeps pending animation behind reduced motion and narrow layout overflow-safe", () => {
    const motionBlock = styles.slice(styles.lastIndexOf("@media (prefers-reduced-motion: no-preference)"));
    expect(motionBlock).toContain("conversation-pending");
    expect(styles).toMatch(/\.message-text\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
    expect(styles).toMatch(/\.turn-response\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
    expect(styles).toMatch(/\.carrier-identity\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
  });
});
