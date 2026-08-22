import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error The browser UI is intentionally JavaScript and embedded as a static asset.
import { conversationSocketCanReuse, groupObserverReviews, observerConversationEvidenceLabels, observerLatestRecorded, observerReviewCorrelationProjection, observerReviewDraft, observerReviewGroupKey, observerReviewGroupNextStep, observerReviewPartitions, observerReviewStatusProjection, observerReviewSubjectAcceptanceProjection, observerReviewSummary, observerReviewTaskLocator, observerReviewWorkerId, taskAttemptObserverReviewProjection, taskAttemptRelationProjection, taskAttemptSemanticAcceptanceProjection } from "../ui/app.js";

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

test("conversation carrier recorded copy does not imply semantic acceptance", () => {
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  expect(app).toContain('recorded: "recorded · 已记录（机械结算）"');
  expect(app).not.toContain('recorded: "recorded · 已记录（passed）"');
  expect(app).toContain("语义验收未评估");
});

test("observer correlation projection fails closed when an available standing carries a malformed nested correlation", () => {
  // A server projection that claims available must still carry the complete
  // canonical correlation: a missing or malformed nested payload never
  // renders partial or fabricated ids and never throws.
  const invalidProjection = {
    standing: "invalid",
    label: "attempt evidence 无效",
    detail: expect.stringContaining("不猜测来源"),
  };
  // The nested correlation object is missing entirely.
  expect(observerReviewCorrelationProjection({
    correlation: { standing: "available", attemptId: "attempt-1" },
  })).toEqual(invalidProjection);
  // The nested correlation is present but its fields are not non-empty
  // strings (non-string and empty-string variants).
  expect(observerReviewCorrelationProjection({
    correlation: {
      standing: "available",
      attemptId: "attempt-1",
      correlation: { conversationId: 123, turnId: "turn", actionId: "action", sourceRef: "ref" },
    },
  })).toEqual(invalidProjection);
  expect(observerReviewCorrelationProjection({
    correlation: {
      standing: "available",
      attemptId: "attempt-1",
      correlation: {
        conversationId: "11111111-1111-4111-8111-111111111111",
        turnId: "   ",
        actionId: "action",
        sourceRef: "ref",
      },
    },
  })).toEqual(invalidProjection);
  expect(observerReviewCorrelationProjection({
    correlation: {
      standing: "available",
      attemptId: "attempt-1",
      correlation: { conversationId: "conv", turnId: "turn", actionId: "action", sourceRef: null },
    },
  })).toEqual(invalidProjection);
  // A well-formed nested correlation still projects the exact ids.
  expect(observerReviewCorrelationProjection({
    correlation: {
      standing: "available",
      attemptId: "attempt-1",
      correlation: {
        conversationId: "11111111-1111-4111-8111-111111111111",
        turnId: "22222222-2222-4222-8222-222222222222",
        actionId: "33333333-3333-4333-8333-333333333333",
        sourceRef: "conversation:11111111-1111-4111-8111-111111111111:action:33333333-3333-4333-8333-333333333333",
      },
    },
  })).toEqual({
    standing: "available",
    attemptId: "attempt-1",
    conversationId: "11111111-1111-4111-8111-111111111111",
    turnId: "22222222-2222-4222-8222-222222222222",
    actionId: "33333333-3333-4333-8333-333333333333",
    sourceRef: "conversation:11111111-1111-4111-8111-111111111111:action:33333333-3333-4333-8333-333333333333",
    label: "canonical correlation 已记录",
  });
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

test("observer first-screen partitions keep actionable groups apart from observe-only groups and fail closed", () => {
  const grouped = groupObserverReviews([
    { reviewId: "r1", standing: "recorded", recordedAt: "2026-08-03T00:00:00.000Z", subject: { taskId: "task-a", attemptId: "attempt-1" } },
    { reviewId: "g1", standing: "query-gap", recordedAt: "2026-08-02T00:00:00.000Z", subject: { taskId: "task-b", attemptId: "attempt-2" } },
    { reviewId: "f1", standing: "runner-failed", recordedAt: "2026-08-01T00:00:00.000Z", subject: { taskId: "task-b", attemptId: "attempt-2" } },
  ]);
  const partitions = observerReviewPartitions(grouped.groups);
  expect(partitions.actionable.map((group: { key: string }) => group.key)).toEqual(["task:task-a"]);
  expect(partitions.observeOnly.map((group: { key: string }) => group.key)).toEqual(["task:task-b"]);
  // A group without a latest recorded opinion can never become actionable:
  // missing/null latestRecorded and non-array input all land in observe-only
  // (fail-closed), so a partition never invents a processing entry.
  expect(observerReviewPartitions([{ key: "x", latestRecorded: null }]).actionable).toEqual([]);
  expect(observerReviewPartitions([{ key: "x", latestRecorded: undefined }]).observeOnly).toHaveLength(1);
  expect(observerReviewPartitions(null).actionable).toEqual([]);
  expect(observerReviewPartitions(null).observeOnly).toEqual([]);
});

test("observer latest record is the newest recorded opinion and never a query gap", () => {
  const grouped = groupObserverReviews([
    { reviewId: "g1", standing: "query-gap", recordedAt: "2026-08-05T00:00:00.000Z", subject: { taskId: "task-a", attemptId: "attempt-1" } },
    { reviewId: "r1", standing: "recorded", recordedAt: "2026-08-03T00:00:00.000Z", subject: { taskId: "task-a", attemptId: "attempt-1" } },
    { reviewId: "r2", standing: "recorded", recordedAt: "2026-08-04T00:00:00.000Z", subject: { attemptId: "attempt-2" } },
  ]);
  // The newest raw record is a query gap on 08-05; the banner must pick the
  // newest recorded opinion (r2, 08-04) instead of presenting the gap as one.
  expect(observerLatestRecorded(grouped.groups)?.reviewId).toBe("r2");
  const onlyGaps = groupObserverReviews([
    { reviewId: "g1", standing: "query-gap", recordedAt: "2026-08-05T00:00:00.000Z", subject: { taskId: "task-b" } },
  ]);
  expect(observerLatestRecorded(onlyGaps.groups)).toBeNull();
  expect(observerLatestRecorded(null)).toBeNull();
});

test("observer cards stay bounded with a meta line and compact unknown correlation", () => {
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  const css = readFileSync(join(uiRoot, "styles.css"), "utf8");
  // 默认卡片是有界摘要 + 一条事实行（task/attempt/worker/standing/主体结果/
  // 更新时间），完整原文只在 details 中按需展开。
  expect(app).toContain("observer-review-meta");
  expect(app).toContain("更新 ");
  // 首屏 attention 路径渲染：总数 → 最近记录横幅 → 可处理/仅观察分区。
  expect(app).toContain("observerReviewPartitions(grouped.groups)");
  expect(app).toContain("observerLatestRecorded(grouped.groups)");
  expect(app).toContain("observer-latest-banner");
  expect(app).toContain("observer-partition");
  expect(app).toContain("可处理");
  expect(app).toContain("仅观察");
  // 缺失 correlation 是紧凑「未知」chip：长说明不再逐卡重复堆叠。
  const correlationHtml = app.slice(
    app.indexOf("function observerReviewCorrelationHtml"),
    app.indexOf("function observerReviewCardHtml"),
  );
  expect(correlationHtml).toContain("observer-correlation-unknown");
  expect(correlationHtml).toContain("未知 · ");
  expect(correlationHtml).not.toContain("correlation.detail");
  // 仅观察分区没有处理按钮；可处理分区保留“只准备草稿”的入口。
  expect(app).toContain("不提供处理入口");
  expect(app).toContain("只准备对话草稿，不标记为已处理");
  expect(css).toContain(".observer-latest-banner");
  expect(css).toContain(".observer-partition-heading");
  expect(css).toContain(".observer-review-meta");
  expect(css).toContain(".observer-correlation-unknown");
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

test("observer trigger copy names the Task-attempt boundary and plain-conversation gap", () => {
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  const html = readFileSync(join(uiRoot, "index.html"), "utf8");
  const server = readFileSync(join(import.meta.dir, "../src/ui-server.ts"), "utf8");
  const help = readFileSync(join(import.meta.dir, "../src/help.ts"), "utf8");
  const generated = readFileSync(join(import.meta.dir, "../src/assets.generated.ts"), "utf8");
  const workbenchReadme = readFileSync(join(import.meta.dir, "../../workbench/README.md"), "utf8");
  const dogfoodProfile = readFileSync(join(import.meta.dir, "../../../design/operations/ROSSOVIA-DOGFOOD-DEVELOPMENT.md"), "utf8");
  // The observer trigger is the existing canonical Task-attempt path. A
  // plain conversation Run settles only its journal/turn evidence and must
  // not be presented as an observer subject.
  expect(server).toContain('kind: "task-attempt-settled"');
  expect(server).toContain('label: "Task attempt 结算后触发"');
  expect(server).not.toContain('kind: "conversation-run-settled"');
  expect(server).not.toContain('label: "对话 Run 结算后触发"');
  expect(app).toContain("普通对话 Run 不触发 observer");
  expect(app).toContain("只观察已结算的 canonical Task attempt");
  expect(html).toContain("普通对话 Run 只结算 journal/turn，不产生 Task attempt 证据，因此不会触发 observer（当前 query gap）");
  expect(html).toContain("本地 UI 默认观察已结算 Task attempt");
  expect(help).toContain("per settled Task attempt");
  expect(help).toContain("A plain conversation Run settles no Task attempt and is not observed (query gap)");
  expect(workbenchReadme).toContain("per settled Task attempt");
  expect(workbenchReadme).toContain("it never triggers the observer (current query gap)");
  expect(dogfoodProfile).toContain("per settled Task attempt by default");
  expect(dogfoodProfile).toContain("it does not trigger the observer (current query gap)");
  expect(generated).toContain("普通对话 Run 不触发 observer");
  expect(generated).not.toContain("本地 UI 默认由对话 Run 触发");
});

test("observer review correlation is memoized per snapshot invocation for duplicate subject attempts", () => {
  const server = readFileSync(join(import.meta.dir, "../src/ui-server.ts"), "utf8");
  // Duplicate subject attemptIds (retry records, launch failures before a
  // later retry, merged workflow and legacy logs) must trigger exactly one
  // strict canonical correlation read per readObserverReviews invocation.
  // The memo map is declared inside the function (invocation-local only —
  // never hoisted to handler or module scope) and the strict reader is
  // called only on a memo miss.
  expect(server).toContain("const correlationByAttemptId = new Map<string, ObserverAttemptCorrelationProjection>();");
  expect(server).toContain("const memoized = correlationByAttemptId.get(attemptId);");
  expect(server).toContain("if (memoized !== undefined) return memoized;");
  expect(server).toContain("correlation: correlationForAttempt(review.subject.attemptId),");
  expect((server.match(/observerAttemptCorrelationProjection\(home, attemptId\)/gu) ?? [])).toHaveLength(1);
  // The map is scoped to the invocation: its single declaration site sits
  // inside readObserverReviews and no module-level correlation cache exists.
  expect((server.match(/const correlationByAttemptId/gu) ?? [])).toHaveLength(1);
  expect(server.indexOf("const correlationByAttemptId")).toBeGreaterThan(
    server.indexOf("export function readObserverReviews"),
  );
});

test("attempt cards project the Principal acceptance boundary from the retained settlement", () => {
  // Every ordinary settlement retains semanticAcceptance=not-evaluated: the
  // card must name the Principal as the acceptance owner and never claim a
  // semantic pass or fail.
  expect(taskAttemptSemanticAcceptanceProjection({
    semanticAcceptance: "not-evaluated",
  })).toEqual({
    standing: "not-evaluated",
    label: "语义验收：待 Principal",
    detail: expect.stringContaining("语义验收由 Principal 显式完成"),
  });
  // Without a settlement the boundary stays explicitly absent.
  expect(taskAttemptSemanticAcceptanceProjection({})).toEqual({
    standing: "absent",
    label: "语义验收未结算",
  });
  // The rendered attempt card keeps the boundary row inside the card facts
  // and never derives a semantic pass/fail.
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  expect(app).toContain("taskAttemptSemanticAcceptanceProjection(attempt)");
  expect(app).toContain("语义验收：待 Principal");
  expect(app).toContain("taskAttemptSemanticAcceptanceRow(semanticProjection)");
  expect(app).not.toContain("语义验收通过");
  expect(app).not.toContain("语义验收未通过");
});

test("attempt cards render one flat parent/child level that can never recurse", () => {
  const parent = "11111111-1111-4111-8111-111111111111";
  const childA = "22222222-2222-4222-8222-222222222222";
  const childB = "33333333-3333-4333-8333-333333333333";
  const parentRef = `state/task-attempts/${parent}/attempt.json`;
  expect(taskAttemptRelationProjection({
    parentAttemptId: parent,
    parentAttemptRef: parentRef,
    childAttemptIds: [childA, childB],
  })).toEqual({
    parentAttemptId: parent,
    parentAttemptRef: parentRef,
    childAttemptIds: [childA, childB],
    childCount: 2,
  });
  // Empty ids never project as relations.
  expect(taskAttemptRelationProjection({
    parentAttemptId: "",
    childAttemptIds: ["", childA],
  })).toEqual({
    parentAttemptId: null,
    parentAttemptRef: null,
    childAttemptIds: [childA],
    childCount: 1,
  });
  expect(taskAttemptRelationProjection({})).toEqual({
    parentAttemptId: null,
    parentAttemptRef: null,
    childAttemptIds: [],
    childCount: 0,
  });
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  // The child list is a bounded flat reference inside the parent card; a
  // child card never nests inside it, so the expansion depth is always one.
  expect(app).toContain("TASK_ATTEMPT_CHILDREN_PREVIEW_LIMIT");
  expect(app).toContain("不递归展开");
  expect(app).toContain("renderTaskAttemptChildren(relation)");
  expect(app).toContain("taskAttemptParentRow(relation)");
});

test("attempt cards read the observer review association none/available/invalid-log", () => {
  // The explicit absence is readable: the review log was read and retains
  // no record for this attempt.
  expect(taskAttemptObserverReviewProjection({ standing: "none" })).toEqual({
    standing: "none",
    label: "无 observer 记录",
    detail: expect.stringContaining("没有记录评审此 attempt"),
  });
  // An untrusted review log never claims a review.
  expect(taskAttemptObserverReviewProjection({
    standing: "invalid-log",
    reason: "review log unreadable",
  })).toEqual({
    standing: "invalid-log",
    label: "review 记录不可信",
    reason: "review log unreadable",
    detail: expect.stringContaining("不声明任何 review"),
  });
  // Available rebuilds every review onto the strict field whitelist: only
  // reviewId/standing/recordedAt/subjectOutcome survive, and subjectOutcome
  // keeps exactly settlementStatus/cellStatus/finalStatus/
  // semanticAcceptance. Raw record fields (opinion text, observer identity,
  // evidence refs) never leak into the attempt card.
  const projection = taskAttemptObserverReviewProjection({
    standing: "available",
    logRef: "state/workflow/reviews.json",
    reviews: [
      {
        reviewId: "review-1",
        standing: "recorded",
        recordedAt: "2026-08-21T00:03:00.000Z",
        subjectOutcome: {
          settlementStatus: "recorded",
          cellStatus: "passed",
          finalStatus: "passed",
          semanticAcceptance: "not-evaluated",
          rawExtra: "must not survive",
        },
        finding: "raw opinion text must not leak",
        observer: { kind: "agent", workerId: "deepseek-flash" },
        evidenceRefs: ["state/task-attempts/raw.json"],
      },
      {
        reviewId: "review-2",
        standing: "query-gap",
        recordedAt: "2026-08-21T00:04:00.000Z",
      },
    ],
  });
  expect(projection.standing).toBe("available");
  expect(projection.label).toBe("有 observer 记录");
  expect(projection.logRef).toBe("state/workflow/reviews.json");
  expect(projection.reviews).toEqual([
    {
      reviewId: "review-1",
      standing: "recorded",
      recordedAt: "2026-08-21T00:03:00.000Z",
      subjectOutcome: {
        settlementStatus: "recorded",
        cellStatus: "passed",
        finalStatus: "passed",
        semanticAcceptance: "not-evaluated",
      },
    },
    {
      reviewId: "review-2",
      standing: "query-gap",
      recordedAt: "2026-08-21T00:04:00.000Z",
    },
  ]);
  // An available standing that carries no review records is a contradiction:
  // it fails closed as unknown and never claims 有 observer 记录.
  expect(taskAttemptObserverReviewProjection({
    standing: "available",
    logRef: "state/workflow/reviews.json",
    reviews: [],
  })).toEqual({ standing: "unknown", label: "review 状态未知" });
  expect(taskAttemptObserverReviewProjection({
    standing: "available",
    logRef: "state/workflow/reviews.json",
  })).toEqual({ standing: "unknown", label: "review 状态未知" });
  expect(taskAttemptObserverReviewProjection({
    standing: "available",
    reviews: [null, "not-an-object"],
  })).toEqual({ standing: "unknown", label: "review 状态未知" });
  // A malformed or missing standing never claims a review.
  expect(taskAttemptObserverReviewProjection({})).toEqual({
    standing: "unknown",
    label: "review 状态未知",
  });
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  // The card renders every standing and, when available, carries
  // reviewId/standing/subject outcome plus the review-log ref.
  expect(app).toContain("无 observer 记录");
  expect(app).toContain("review 记录不可信");
  expect(app).toContain("有 observer 记录");
  expect(app).toContain("task-attempt-review-log");
  expect(app).toContain("renderTaskAttemptObserverReview(observerReviewProjection)");
  expect(app).toContain("observerSubjectOutcomeCopy(review.subjectOutcome)");
  // The projection rebuilds the strict whitelist and fails closed when an
  // available standing carries no review records.
  expect(app).toContain("rawReviews.length === 0");
  expect(app).toContain("subjectOutcome.semanticAcceptance === undefined");
  expect(app).toContain('reviewId: typeof review.reviewId === "string" ? review.reviewId : ""');
});

test("observer draft handoff is short, structured, bounded, and fail-closed", () => {
  // A realistic long opinion: markdown, evidence narrative, a limitations
  // section, and a code fence. Only the bounded facts may reach the draft;
  // the tail marker and the limitations block must never be copied.
  const longFinding = [
    "# Review",
    "**首要结论**: the page is blocked.",
    "",
    "## Evidence",
    "尝试了 A、B、C 三条路径，全部被 403 拦截；随后又尝试了 D、E、F 与 G 共四条后备路径，仍然没有一条能够越过权限边界，耗时约四十分钟，期间收集了三份独立运行日志与两份网络抓包作为旁证。",
    "补充：第一条路径在授权边界内返回 200 但内容为空，第二条在重试三次后仍返回 403，第三条在等待 120 秒后超时，随后四条后备路径全部被同一权限策略拒绝。",
    "## 限制",
    "TRAIL_ONLY_MARKER_本段位于摘要上限之后，绝不能被复制进草稿。",
    "```",
    "evidence 原文不应整段进入草稿",
    "```",
  ].join("\n");
  const draft = observerReviewDraft({
    reviewId: "review-4317",
    standing: "recorded",
    recordedAt: "2026-08-21T00:03:00.000Z",
    subject: { taskId: "11111111-1111-4111-8111-111111111111", attemptId: "attempt-4317" },
    reviewText: longFinding,
    evidenceRefs: [
      "state/task-attempts/11111111-1111-4111-8111-111111111111/attempt.json",
      "state/workflow/reviews.json",
      "state/task-attempts/evidence-2.json",
      "state/task-attempts/evidence-3.json",
    ],
    subjectOutcome: {
      settlementStatus: "recorded",
      cellStatus: "passed",
      finalStatus: "passed",
      semanticAcceptance: "not-evaluated",
    },
    correlation: {
      standing: "available",
      attemptId: "attempt-4317",
      correlation: {
        conversationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        turnId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        actionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        sourceRef: "conversation:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:action:cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      },
    },
  });
  const blocks = draft.split("\n");
  // 阅读顺序固定：reviewId → Task/attempt → standing → subject outcome →
  // 摘要 → 下一步 → 证据 → correlation → 完整 review 引用 → 判断提示。
  expect(blocks[0]).toBe("处理 observer review review-4317");
  expect(blocks[1]).toBe("Task/attempt: task 11111111-1111-4111-8111-111111111111 · attempt attempt-4317");
  expect(blocks[2]).toBe("standing: 已记录");
  expect(blocks[3]).toBe("subject outcome: recorded · 机械执行 passed · 语义验收未评估");
  expect(blocks[4]).toContain("摘要: Review 首要结论: the page is blocked. Evidence 尝试了 A、B、C");
  // 摘要行被 160 字符上限截断：不超过前缀 + 上限 + 省略号。
  expect(blocks[4].length).toBeLessThanOrEqual(166);
  expect(blocks[4]).not.toContain("限制");
  expect(blocks[5]).toContain("下一步: 已记录意见");
  expect(blocks[5]).toContain("不构成处理事实");
  // canonical evidence refs 有界：前 3 条精确引用，其余只计数。
  expect(blocks[6]).toContain("证据: state/task-attempts/11111111-1111-4111-8111-111111111111/attempt.json");
  expect(blocks[6]).toContain("另有 1 项");
  expect(blocks[6]).not.toContain("evidence-3.json");
  // available correlation 逐字带出 conversation/turn/action/sourceRef。
  expect(blocks[7]).toContain("correlation: conversation aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  expect(blocks[7]).toContain("sourceRef conversation:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:action:cccccccc-cccc-4ccc-8ccc-cccccccccccc");
  // 完整 review markdown / 限制长文 / 代码块绝不进入草稿；只保留按需引用。
  expect(draft).not.toContain("TRAIL_ONLY_MARKER");
  expect(draft).not.toContain("## 限制");
  expect(draft).not.toContain("evidence 原文不应整段进入草稿");
  expect(draft).toContain("完整 review 未复制");
  expect(draft).toContain("展开完整 review");
  expect(draft).toContain("请判断：已阅、评论、转成普通改进任务，或暂缓，并说明理由。");
  // 缺失来源 fail-closed：无 correlation、无意见文本、无 Task 均明确未知。
  const gapDraft = observerReviewDraft({
    reviewId: "review-gap",
    standing: "query-gap",
    subject: { attemptId: "attempt-gap" },
  });
  expect(gapDraft).toContain("standing: 查询缺口");
  expect(gapDraft).toContain("未返回 review 文本");
  expect(gapDraft).toContain("correlation: 未知 · 未提供 correlation 投影（不猜测来源）");
  expect(gapDraft).toContain("未声明 Task");
  expect(gapDraft).toContain("attempt attempt-gap");
  expect(gapDraft).toContain("证据: 未提供证据引用");
  expect(observerReviewDraft(null)).toContain("未识别 review");
});

test("observer draft handoff keeps one desktop/mobile path and stays draft-only", () => {
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  // 唯一的草稿构建路径：处理按钮调用同一个导出 builder，桌面与移动没有
  // 分支；完整 review 只按需引用（卡片「展开完整 review」）。
  expect((app.match(/= observerReviewDraft\(review\)/gu) ?? [])).toHaveLength(1);
  const handler = app.slice(
    app.indexOf('listRoot.querySelectorAll("[data-observer-process]")'),
    app.indexOf('persistConversationDraft();\n        state.activeView = "conversation";'),
  );
  expect(handler).toContain("observerReviewDraft(review)");
  expect(handler).not.toContain("matchMedia");
  expect(handler).not.toContain("submitConversationMessage");
  expect(handler).not.toContain("意见：${opinion}");
  // 处理入口仍是 draft-only：只准备草稿并聚焦输入框，不自动发送、不标记
  // 处理、不制造 canonical handling evidence。
  expect(app).toContain("只准备对话草稿，不标记为已处理");
  expect(app).toContain("不自动发送、不标记处理");
  expect(app).toContain("完整 review 未复制");
  expect(app).toContain("data-observer-process");
});

test("the short draft is one ordered text rendered readably on desktop and mobile", () => {
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  const css = readFileSync(join(uiRoot, "styles.css"), "utf8");
  // 单一导出 builder（桌面/移动共用同一有序文本），有界常量驱动摘要与
  // canonical evidence refs 的上限。
  expect(app).toContain("export function observerReviewDraft(review)");
  expect(app).toContain("const OBSERVER_DRAFT_SUMMARY_LIMIT = 160;");
  expect(app).toContain("const OBSERVER_DRAFT_EVIDENCE_REF_LIMIT = 3;");
  expect(app).toContain("observerReviewDraftCorrelationLine(correlation)");
  expect(app).toContain('blocks.join("\\n")');
  // 旧的全量复制模板（意见原文整段进草稿）已移除。
  expect(app).not.toContain("意见：${opinion}");
  expect(app).not.toContain("观察 attempt: ${attemptId}");
  // 移动端 composer 仍按多行草稿渲染，不折叠、不截断；桌面/移动阅读顺序
  // 由同一份有序文本保证。
  expect(css).toContain(".conversation-composer textarea");
  expect(css).toMatch(
    /@media \(max-width: 700px\)[\s\S]*?\.conversation-composer textarea \{\s*min-height: 56px;/s,
  );
});
