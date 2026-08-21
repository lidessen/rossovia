import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error The browser UI is intentionally JavaScript and embedded as a static asset.
import { conversationSocketCanReuse, observerConversationEvidenceLabels, observerReviewStatusProjection, observerReviewSubjectAcceptanceProjection, observerReviewSummary, observerReviewTaskLocator, observerReviewWorkerId } from "../ui/app.js";

const uiRoot = join(import.meta.dir, "../ui");

test("observer review projects the nested worker identity as a scalar", () => {
  expect(observerReviewWorkerId({ observer: { workerId: " deepseek-flash " } })).toBe("deepseek-flash");
  expect(observerReviewWorkerId({ observer: {} })).toBe("未知 worker");
  expect(observerReviewWorkerId({ observer: { workerId: { id: "deepseek-flash" } } })).toBe("未知 worker");
});

test("observer review keeps a readable summary before the full markdown body", () => {
  expect(observerReviewSummary("# Review\n\n**First finding**: the page is blocked.")).toBe(
    "Review First finding: the page is blocked.",
  );
  expect(observerReviewSummary("x".repeat(300), 20)).toBe(`${"x".repeat(40)}…`);
});

test("observer review keeps the record standing and the subject semantic acceptance apart", () => {
  // A recorded opinion whose subject semantics were not evaluated keeps the
  // truthful record badge (已记录); the unevaluated acceptance never borrows
  // the record's query-gap standing.
  expect(observerReviewStatusProjection({
    standing: "recorded",
    subjectOutcome: {
      settlementStatus: "recorded",
      cellStatus: "passed",
      semanticAcceptance: "not-evaluated",
    },
  })).toEqual({ standing: "recorded", label: "已记录" });
  expect(observerReviewStatusProjection({
    standing: "query-gap",
    subjectOutcome: {
      settlementStatus: "runner-failed",
      semanticAcceptance: "not-evaluated",
    },
  })).toEqual({ standing: "query-gap", label: "查询缺口" });
  expect(observerReviewStatusProjection({})).toEqual({ standing: "unknown", label: "状态未知" });
});

test("observer subject acceptance is a separate badge that never borrows the record standing", () => {
  expect(observerReviewSubjectAcceptanceProjection({
    standing: "recorded",
    subjectOutcome: {
      settlementStatus: "recorded",
      cellStatus: "passed",
      semanticAcceptance: "not-evaluated",
    },
  })).toEqual({ standing: "not-evaluated", label: "语义验收未评估" });
  expect(observerReviewSubjectAcceptanceProjection({
    standing: "recorded",
    subjectOutcome: {
      settlementStatus: "recorded",
      cellStatus: "passed",
      finalStatus: "passed",
      semanticAcceptance: "passed",
    },
  })).toEqual({ standing: "passed", label: "语义验收通过" });
  expect(observerReviewSubjectAcceptanceProjection({
    standing: "recorded",
    subjectOutcome: {
      settlementStatus: "runner-failed",
      semanticAcceptance: "not-evaluated",
    },
  })).toEqual({ standing: "failed", label: "被观察执行未通过" });
  expect(observerReviewSubjectAcceptanceProjection({
    standing: "recorded",
  })).toEqual({ standing: "absent", label: "未提供主体结算摘要" });
});

test("observer review locates only an existing task in the current projection", () => {
  const review = {
    standing: "recorded",
    subject: {
      taskId: "11111111-1111-4111-8111-111111111111",
      attemptId: "attempt-1",
    },
  };
  const workItems = [
    { id: "principal-task:11111111-1111-4111-8111-111111111111" },
    { id: "principal-task:22222222-2222-4222-8222-222222222222" },
  ];
  expect(observerReviewTaskLocator(review, workItems)).toEqual({
    standing: "locatable",
    taskId: "11111111-1111-4111-8111-111111111111",
    itemId: "principal-task:11111111-1111-4111-8111-111111111111",
  });
  // A declared task absent from the current snapshot is not a link target.
  expect(observerReviewTaskLocator({
    ...review,
    subject: {
      taskId: "99999999-9999-4999-8999-999999999999",
      attemptId: "attempt-2",
    },
  }, workItems)).toMatchObject({
    standing: "absent",
    taskId: "99999999-9999-4999-8999-999999999999",
    reason: expect.stringContaining("不在当前实时投影"),
  });
  // A review without a task id keeps the conversation-processing route only.
  expect(observerReviewTaskLocator({
    standing: "recorded",
    subject: { attemptId: "attempt-3" },
  }, workItems)).toEqual({
    standing: "no-task",
    taskId: null,
    reason: "observer 记录未声明关联 Task",
  });
  // The card renders the locating entry only for locatable reviews, keeps
  // the conversation entry, and never fabricates a task or conversation link.
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  expect(app).toContain("data-observer-task-locate");
  expect(app).toContain("observerReviewTaskLocator(review, currentWorkItems)");
  expect(app).toContain("不在当前投影（不伪造链接）");
  expect(app).toContain("observer-review-subject-standing");
  expect(app).toContain("语义验收未评估");
});

test("mobile system tools stay secondary while remaining keyboard-discoverable", () => {
  const html = readFileSync(join(uiRoot, "index.html"), "utf8");
  const css = readFileSync(join(uiRoot, "styles.css"), "utf8");
  expect(html).toContain('<details class="mobile-system-menu">');
  expect(html).toContain('<summary aria-label="打开更多工作台工具">更多</summary>');
  expect(html).toContain('<p class="mobile-system-menu-title">工作台工具</p>');
  expect(html).toContain('data-view="observer"');
  expect(html).toContain('data-view="settings"');
  expect((html.match(/data-mobile-view=/gu) ?? []).length).toBe(4);
  expect(html).toContain('aria-label="移动端主导航"');
  expect(css).toMatch(
    /@media \(max-width: 700px\)[\s\S]*?\.masthead\s*\{[\s\S]*?position: sticky;[\s\S]*?top: 0;[\s\S]*?z-index: 50;/s,
  );
  expect(css).toContain('grid-template-areas:\n      "identity tools"\n      "runtime runtime";');
  expect(css).toContain('--mobile-masthead-height: 94px;');
  expect(css).toContain('top: var(--mobile-masthead-height);');
  expect(css).toContain('.identity h1 {\n    white-space: nowrap;');
  expect(css).toContain('.runtime-brief strong {\n    font-size: 0.66rem;\n    white-space: nowrap;');
});

test("observer surface explains its record state instead of presenting one generic empty state", () => {
  const html = readFileSync(join(uiRoot, "index.html"), "utf8");
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  const css = readFileSync(join(uiRoot, "styles.css"), "utf8");
  expect(html).toContain('id="observer-record-state"');
  expect(html).toContain('id="observer-worker-state"');
  expect(html).toContain('id="observer-last-recorded"');
  expect(app).toContain("function observerRecordStateCopy");
  expect(app).toContain("等待首次触发");
  expect(app).toContain("展开完整 review");
  expect(app).toContain("被观察执行");
  expect(app).toContain("记录源已连接，但目前为空");
  expect(css).toContain(".observer-overview");
  expect(css).toContain('.observer-empty[data-state="waiting"]');
});

test("settings keeps its decision summary and stays independent of an invalid project locus", () => {
  const html = readFileSync(join(uiRoot, "index.html"), "utf8");
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  expect(html).toContain('class="settings-overview"');
  expect(html).toContain('id="settings-worker-count"');
  expect(html).toContain('id="settings-provider-summary"');
  expect(html).toContain('class="settings-card settings-collapsible settings-skill-card"');
  expect(html).toContain('class="settings-card settings-collapsible settings-directory-card"');
  expect(app).toContain('if (!isSystemSurface && (state.locusRestorePending || state.unavailableLocus !== null))');
  expect(app).toContain('$("#settings-overview-copy").textContent');
  expect(app).toContain('state.locusRestorePending = false;\n        state.activeView = button.dataset.view;');
  expect(app).toContain('state.locusRestorePending = false;\n        if (button.dataset.mobileView === "conversation")');
});

test("conversation disconnect makes the masthead distinguish projection from socket state", () => {
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  const css = readFileSync(join(uiRoot, "styles.css"), "utf8");
  expect(app).toContain('投影已连接 · 对话已断开');
  expect(app).toContain('connecting: "投影已连接 · 对话连接中"');
  expect(app).toContain('实时 · 部分来源不可用');
  expect(app).toContain('renderConnection();\n    renderConversationConnection();');
  expect(app).toContain('conversationState.connection = "unavailable";\n      renderConversationSurface();\n      // Some browsers delay the following close event.');
  expect(css).toContain('.connection-mark.is-warning');
});

test("a faulted open conversation socket is replaced by the reconnect path", () => {
  expect(conversationSocketCanReuse(0, false)).toBe(true);
  expect(conversationSocketCanReuse(1, false)).toBe(true);
  expect(conversationSocketCanReuse(1, true)).toBe(false);
  expect(conversationSocketCanReuse(3, false)).toBe(false);
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  expect(app).toContain("conversationSocketCanReuse(current.readyState, conversationState.socketFaulted)");
  expect(app).toContain("conversationState.socket = null;\n      conversationState.socketFaulted = false;");
});

test("slow projection loading explains what is and is not available", () => {
  const html = readFileSync(join(uiRoot, "index.html"), "utf8");
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  const css = readFileSync(join(uiRoot, "styles.css"), "utf8");
  expect(html).toContain('id="projection-loading" role="status"');
  expect(app).toContain('loading.dataset.phase = "slow"');
  expect(app).toContain('对话入口仍可用；任务、项目与执行证据尚未接收');
  expect(app).toContain('不要把等待误判为“零项目”');
  expect(css).toContain('--mobile-loading-height: 68px;');
  expect(css).toContain('body[data-projection-state="loading"] .projection-loading');
  expect(css).toContain('top: calc(var(--mobile-masthead-height) + var(--mobile-loading-height));');
});

test("live runner probes share missions and read activity/status concurrently", () => {
  const server = readFileSync(join(import.meta.dir, "../src/ui-server.ts"), "utf8");
  expect(server).toContain("const missionProbes = new Map<string, Promise<{");
  expect(server).toContain("Promise.allSettled([\n      activityPromise,\n      client.status(missionId),\n    ])");
  expect(server).toContain("missionProbes.set(missionId, probe);");
});

test("snapshot requests share one in-flight serialized projection", () => {
  const server = readFileSync(join(import.meta.dir, "../src/ui-server.ts"), "utf8");
  expect(server).toContain("let liveSnapshotBodyInFlight: Promise<string> | undefined;");
  expect(server).toContain("if (liveSnapshotBodyInFlight !== undefined) return liveSnapshotBodyInFlight;");
  expect(server).toContain("return jsonText(await readLiveSnapshotBody(), 200);");
  expect(server).toContain("showPrincipalTaskAttemptsForTasks(home, taskIds);");
  expect(server).toContain("let attemptsByTask: ReturnType<typeof showPrincipalTaskAttemptsForTasks>;");
});

test("conversation evidence is labeled without inventing a read-only href", () => {
  const evidence = observerConversationEvidenceLabels({
    relatedConversationRefs: ["conversation:abc123", "  conversation:def456  "],
  });
  expect(evidence).toEqual([
    {
      ref: "conversation:abc123",
      id: "abc123",
      label: "关联对话证据：abc123",
      href: null,
    },
    {
      ref: "conversation:def456",
      id: "def456",
      label: "关联对话证据：def456",
      href: null,
    },
  ]);
  expect(observerConversationEvidenceLabels({ relatedConversationRefs: ["<script>alert(1)</script>"] })[0].href).toBeNull();
});

test("observer trigger copy names the conversation-carrier settled run, not every Task/Run terminal", () => {
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  const html = readFileSync(join(uiRoot, "index.html"), "utf8");
  const server = readFileSync(join(import.meta.dir, "../src/ui-server.ts"), "utf8");
  const help = readFileSync(join(import.meta.dir, "../src/help.ts"), "utf8");
  const generated = readFileSync(join(import.meta.dir, "../src/assets.generated.ts"), "utf8");
  // The observer is currently launched only by a conversation carrier's
  // settled Run; the trigger kind and the visible label must say so.
  expect(server).toContain('kind: "conversation-run-settled"');
  expect(server).toContain('label: "对话 Run 结算后触发"');
  expect(server).not.toContain('label: "Task/Run 终态结算后触发"');
  // The empty-state copy on the observer card uses the same scoped claim.
  expect(app).toContain("observer 已启用，但还没有完成可观察的对话 Run");
  expect(app).toContain("它只在对话 carrier 的 Run 结算后读取完整证据并追加记录");
  expect(app).toContain("完成一次可观察的对话 Run 后");
  expect(app).not.toContain("Task/Run 终态");
  // The permanent usage copy in the served page and in the CLI ui help says
  // the same: the trigger is the conversation carrier's settled Run, never
  // every Task/Run terminal.
  expect(html).toContain("对话 Run 结算后触发");
  expect(html).not.toContain("Task/Run");
  expect(help).toContain("per settled conversation Run");
  expect(help).not.toContain("per settled observable Task/Run");
  // The embedded bundle mirrors the ui/ source: the served single-file
  // surface cannot keep serving the old unqualified claim.
  expect(generated).toContain("对话 Run 结算后触发");
  expect(generated).not.toContain("Task/Run 终态");
});
