import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error The browser UI is intentionally JavaScript and embedded as a static asset.
import { conversationSocketCanReuse, groupObserverReviews, observerConversationEvidenceLabels, observerReviewCorrelationProjection, observerReviewGroupKey, observerReviewGroupNextStep, observerReviewStatusProjection, observerReviewSubjectAcceptanceProjection, observerReviewSummary, observerReviewTaskLocator, observerReviewWorkerId } from "../ui/app.js";

const uiRoot = join(import.meta.dir, "../ui");

test("observer review projects the canonical attempt correlation with exact ids or explicit invisibility", () => {
  const conversationId = "11111111-1111-4111-8111-111111111111";
  const turnId = "22222222-2222-4222-8222-222222222222";
  const actionId = "33333333-3333-4333-8333-333333333333";
  const sourceRef = `conversation:${conversationId}:action:${actionId}`;
  // A review whose subject attempt retains the canonical correlation shows
  // the exact conversation/turn/action/sourceRef, still bound to the same
  // attempt evidence.
  expect(observerReviewCorrelationProjection({
    correlation: {
      standing: "available",
      attemptId: "attempt-1",
      correlation: { conversationId, turnId, actionId, sourceRef },
    },
  })).toEqual({
    standing: "available",
    attemptId: "attempt-1",
    conversationId,
    turnId,
    actionId,
    sourceRef,
    label: "canonical correlation 已记录",
  });
  // Missing correlation is explicitly invisible: the review never guesses
  // the nearest conversation.
  expect(observerReviewCorrelationProjection({ correlation: { standing: "missing" } })).toEqual({
    standing: "missing",
    label: "未记录 canonical correlation",
    detail: expect.stringContaining("不猜测最近对话"),
  });
  // Unreadable or invalid attempt evidence is explicitly invisible too.
  expect(observerReviewCorrelationProjection({ correlation: { standing: "unavailable" } })).toEqual({
    standing: "unavailable",
    label: "attempt evidence 不可读",
    detail: expect.stringContaining("不猜测来源"),
  });
  expect(observerReviewCorrelationProjection({ correlation: { standing: "invalid" } })).toEqual({
    standing: "invalid",
    label: "attempt evidence 无效",
    detail: expect.stringContaining("不猜测来源"),
  });
  expect(observerReviewCorrelationProjection({ correlation: { standing: "invalid-attempt-id" } })).toEqual({
    standing: "invalid-attempt-id",
    label: "attempt 标识非 canonical",
    detail: expect.stringContaining("不猜测来源"),
  });
  // A review without a server correlation projection stays explicitly absent.
  expect(observerReviewCorrelationProjection({})).toEqual({
    standing: "absent",
    label: "未提供 correlation 投影",
  });
  // The rendered surface carries the correlation facts and the explicit
  // invisible copy, and never fabricates a conversation link.
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  expect(app).toContain("observerReviewCorrelationProjection(review)");
  expect(app).toContain("被观察来源");
  expect(app).toContain("未记录 canonical correlation");
  expect(app).toContain("不猜测最近对话");
  expect(app).toContain("只准备对话草稿，不标记为已处理");
  expect(app).toContain("data-observer-process");
});

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

test("observer subject acceptance stays mechanical and never claims a semantic pass", () => {
  // The review schema records semanticAcceptance only as "not-evaluated", so
  // a mechanically passed cell keeps the unevaluated badge and is never
  // derived into a semantic acceptance claim.
  expect(observerReviewSubjectAcceptanceProjection({
    standing: "recorded",
    subjectOutcome: {
      settlementStatus: "recorded",
      cellStatus: "passed",
      finalStatus: "passed",
      semanticAcceptance: "not-evaluated",
    },
  })).toEqual({ standing: "not-evaluated", label: "语义验收未评估" });
  // A mechanical execution failure is still reported on the subject badge.
  expect(observerReviewSubjectAcceptanceProjection({
    standing: "recorded",
    subjectOutcome: {
      settlementStatus: "runner-failed",
      semanticAcceptance: "not-evaluated",
    },
  })).toEqual({ standing: "failed", label: "被观察执行未通过" });
  expect(observerReviewSubjectAcceptanceProjection({
    standing: "recorded",
    subjectOutcome: {
      settlementStatus: "recorded",
      cellStatus: "failed",
      semanticAcceptance: "not-evaluated",
    },
  })).toEqual({ standing: "failed", label: "被观察执行未通过" });
  expect(observerReviewSubjectAcceptanceProjection({
    standing: "recorded",
  })).toEqual({ standing: "absent", label: "未提供主体结算摘要" });
  // The unprovable semantic pass/fail implications are gone from the UI.
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  expect(app).not.toContain("语义验收通过");
  expect(app).not.toContain("语义验收未通过");
});

test("observer reviews group by subject.taskId first and fall back to attemptId", () => {
  expect(observerReviewGroupKey({
    subject: { taskId: " 11111111-1111-4111-8111-111111111111 ", attemptId: "attempt-1" },
  })).toEqual({
    kind: "task",
    key: "task:11111111-1111-4111-8111-111111111111",
    taskId: "11111111-1111-4111-8111-111111111111",
  });
  expect(observerReviewGroupKey({
    subject: { attemptId: "attempt-2" },
  })).toEqual({ kind: "attempt", key: "attempt:attempt-2", attemptId: "attempt-2" });
  expect(observerReviewGroupKey({})).toEqual({ kind: "unkeyed", key: "unkeyed" });
});

test("observer review groups keep counts, order, and the latest recorded opinion", () => {
  const grouped = groupObserverReviews([
    { reviewId: "r1", standing: "recorded", recordedAt: "2026-08-01T00:00:00.000Z", subject: { taskId: "task-a", attemptId: "attempt-1" } },
    { reviewId: "r2", standing: "query-gap", recordedAt: "2026-08-02T00:00:00.000Z", subject: { taskId: "task-a", attemptId: "attempt-1" } },
    { reviewId: "r3", standing: "recorded", recordedAt: "2026-08-03T00:00:00.000Z", subject: { attemptId: "attempt-2" } },
    { reviewId: "r4", standing: "recorded", recordedAt: "2026-08-05T00:00:00.000Z", subject: { taskId: "task-a", attemptId: "attempt-1" } },
  ]);
  expect(grouped.topicCount).toBe(2);
  expect(grouped.recordCount).toBe(4);
  // Groups order by their newest record, newest subject first.
  expect(grouped.groups.map((group: { key: string }) => group.key)).toEqual(["task:task-a", "attempt:attempt-2"]);
  const taskGroup = grouped.groups[0];
  expect(taskGroup.reviews.map((review: { reviewId: string }) => review.reviewId)).toEqual(["r1", "r2", "r4"]);
  // The newest recorded opinion of the group is highlighted, not the newest
  // raw record (which may be a query gap).
  expect(taskGroup.latestRecorded.reviewId).toBe("r4");
  expect(grouped.groups[1].latestRecorded.reviewId).toBe("r3");
});

test("a group without any recorded opinion has no latest recorded review", () => {
  const grouped = groupObserverReviews([
    { reviewId: "g1", standing: "query-gap", recordedAt: "2026-08-01T00:00:00.000Z", subject: { taskId: "task-b", attemptId: "attempt-9" } },
    { reviewId: "g2", standing: "runner-failed", recordedAt: "2026-08-02T00:00:00.000Z", subject: { taskId: "task-b", attemptId: "attempt-9" } },
  ]);
  expect(grouped.topicCount).toBe(1);
  expect(grouped.recordCount).toBe(2);
  expect(grouped.groups[0].latestRecorded).toBeNull();
});

test("observer group next step stays mechanical and never claims processing", () => {
  const recorded = observerReviewGroupNextStep({
    key: "task:task-a",
    reviews: [{ reviewId: "r1", standing: "recorded", recordedAt: "2026-08-01T00:00:00.000Z" }],
    latestRecorded: { reviewId: "r1", standing: "recorded", recordedAt: "2026-08-01T00:00:00.000Z" },
  });
  expect(recorded.standing).toBe("recorded");
  expect(recorded.label).toBe("意见已记录");
  expect(recorded.nextStep).toContain("未记录 canonical handling evidence");
  expect(recorded.nextStep).toContain("不构成处理事实");
  const gap = observerReviewGroupNextStep({
    key: "task:task-b",
    reviews: [{ reviewId: "g1", standing: "query-gap", recordedAt: "2026-08-01T00:00:00.000Z" }],
    latestRecorded: null,
  });
  expect(gap.standing).toBe("query-gap");
  expect(gap.nextStep).toContain("未记录 canonical handling evidence");
  expect(gap.nextStep).toContain("不可推断");
  const failed = observerReviewGroupNextStep({
    key: "task:task-c",
    reviews: [{ reviewId: "f1", standing: "runner-failed", recordedAt: "2026-08-01T00:00:00.000Z" }],
    latestRecorded: null,
  });
  expect(failed.standing).toBe("runner-failed");
  expect(failed.nextStep).toContain("未记录 canonical handling evidence");
  expect(failed.nextStep).toContain("不可推断");
});

test("observer surface renders grouped themes with raw counts and no static processed claim", () => {
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  const css = readFileSync(join(uiRoot, "styles.css"), "utf8");
  expect(app).toContain("groupObserverReviews(reviews)");
  expect(app).toContain("observerGroupCardHtml(group, currentWorkItems)");
  expect(app).toContain("个主题 · ");
  expect(app).toContain("条原始记录");
  expect(app).toContain("最新已记录意见");
  expect(app).toContain("全部原始记录 · ");
  expect(app).toContain("未记录 canonical handling evidence");
  expect(app).toContain("不构成处理事实");
  expect(app).toContain("机械下一步");
  // The static "尚未处理" claim is gone; every raw record stays expandable.
  expect(app).not.toContain("尚未处理；通过普通对话 Task");
  expect(app).toContain("展开完整 review");
  expect(css).toContain(".observer-group-card");
  expect(css).toContain(".observer-group-latest");
  expect(css).toContain(".observer-group-records");
  expect(css).toContain(".observer-group-facts");
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
  expect(app).toContain('运行投影已连接 · 对话已断开');
  expect(app).toContain('connecting: "运行投影已连接 · 对话连接中"');
  expect(app).toContain('实时 · 部分来源不可用');
  expect(app).toContain('renderConnection();\n    renderConversationConnection();');
  expect(app).toContain('conversationState.connection = "unavailable";\n      renderConversationSurface();\n      // Some browsers delay the following close event.');
  expect(css).toContain('.connection-mark.is-warning');
});

test("the live masthead claims partial sources only when snapshot errors are present", () => {
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  const labelProjection = app.slice(
    app.indexOf("export function projectionMastheadLabel"),
    app.indexOf("export function isExactLiveAgentWork"),
  );
  // Only a non-empty snapshot.errors list keeps the 部分来源不可用 risk copy
  // on a live connection; the errors gate precedes the incompleteness branch.
  expect(labelProjection).toContain("snapshotSourceErrors.length > 0");
  expect(labelProjection.indexOf("实时 · 部分来源不可用")).toBeLessThan(
    labelProjection.indexOf("incompleteProjectionCopy(snapshot)"),
  );
  // errors=[] + complete=false delegates to the incomplete-projection copy
  // (运行投影可读 / 需核查 branches) instead of claiming unavailable sources,
  // and 运行投影实时 · 已连接 stays the no-warning label of the healthy branch.
  expect(labelProjection).toContain("incompleteProjectionCopy(snapshot).label");
  expect(labelProjection).toContain('label: "运行投影实时 · 已连接"');
});

test("the overview observation badge applies the same errors gate and keeps completeness exact", () => {
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  // The overview badge mirrors the masthead: 部分来源不可用 requires errors,
  // while an incomplete-but-error-free projection becomes 实时 · 投影需核查.
  expect(app).toContain("const liveSourceErrors = list(first(state.snapshot, [\"errors\"], []));");
  expect(app).toContain("liveSourceErrors.length > 0");
  expect(app).toContain('"实时 · 投影需核查"');
  // The projection completeness row stays precise: complete=false still reads
  // 运行投影不完整 and complete=true reads 运行投影完整.
  expect(app).toContain('? "运行投影完整"\n        : complete === false\n          ? "运行投影不完整"');
  expect(app).toContain('"#projection-completeness"');
});

test("disconnected, demo, and task-source risk copy stay untouched by the errors gate", () => {
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  const css = readFileSync(join(uiRoot, "styles.css"), "utf8");
  // Live-connection loss keeps its existing risk surfaces: the stale banner
  // and the demo label, with the warning mark styling unchanged.
  expect(app).toContain('label: "上次实时 · 已过期"');
  expect(app).toContain('"实时刷新失败 · 操作已禁用"');
  expect(app).toContain('label: "演示 · 非实时"');
  expect(css).toContain(".connection-mark.is-warning");
  // The task-source unavailable risk copy is a separate gate and remains.
  expect(app).toContain("任务来源不可用或投影不完整：当前计数只覆盖可读来源，不代表完整集合。");
  expect(app).toContain("任务来源不可用或投影不完整：无法确认是否真的没有匹配项。");
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

test("observer trigger copy names the conversation-run default and the explicit entries", () => {
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  const html = readFileSync(join(uiRoot, "index.html"), "utf8");
  const server = readFileSync(join(import.meta.dir, "../src/ui-server.ts"), "utf8");
  const help = readFileSync(join(import.meta.dir, "../src/help.ts"), "utf8");
  const generated = readFileSync(join(import.meta.dir, "../src/assets.generated.ts"), "utf8");
  const workbenchReadme = readFileSync(join(import.meta.dir, "../../workbench/README.md"), "utf8");
  const dogfoodProfile = readFileSync(join(import.meta.dir, "../../../design/operations/ROSSOVIA-DOGFOOD-DEVELOPMENT.md"), "utf8");
  // The local UI default is the conversation carrier's settled Run; the
  // trigger kind and the visible label must say so without claiming every
  // Task/Run terminal.
  expect(server).toContain('kind: "conversation-run-settled"');
  expect(server).toContain('label: "对话 Run 结算后触发"');
  expect(server).not.toContain('label: "Task/Run 终态结算后触发"');
  // The empty-state copy on the observer card keeps the same default scope
  // and names the explicit observer entries instead of making the
  // conversation Run the only trigger path.
  expect(app).toContain("本地 UI 默认由对话 Run 触发；显式 observer 入口可观察其他已结算 Task/Run");
  expect(app).toContain("完成一次可观察的对话 Run");
  expect(app).not.toContain("Task/Run 终态");
  // The permanent usage copy in the served page and in the CLI ui help says
  // the same: the conversation Run is the local default trigger, never every
  // Task/Run terminal.
  expect(html).toContain("本地 UI 默认由对话 Run 触发");
  expect(html).toContain("显式 observer 入口可观察其他已结算 Task/Run");
  expect(html).not.toContain("Task/Run 终态");
  expect(help).toContain("per settled conversation Run");
  expect(help).not.toContain("per settled observable Task/Run");
  // The workbench README and dogfood profile no longer claim one observer
  // per every settled observable Task/Run.
  expect(workbenchReadme).toContain("per settled conversation Run");
  expect(workbenchReadme).not.toContain("each settled observable Task/Run");
  expect(dogfoodProfile).toContain("per settled conversation Run by default");
  expect(dogfoodProfile).not.toContain("for each settled observable Task/Run");
  // The embedded bundle mirrors the ui/ source: the served single-file
  // surface cannot keep serving the old unqualified claim.
  expect(generated).toContain("本地 UI 默认由对话 Run 触发");
  expect(generated).not.toContain("Task/Run 终态");
});
