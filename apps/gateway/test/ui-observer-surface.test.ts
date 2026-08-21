import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error The browser UI is intentionally JavaScript and embedded as a static asset.
import { conversationSocketCanReuse, observerConversationEvidenceLabels, observerReviewStatusProjection, observerReviewSummary, observerReviewWorkerId } from "../ui/app.js";

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

test("observer review distinguishes recorded evidence from unevaluated semantics", () => {
  expect(observerReviewStatusProjection({
    standing: "recorded",
    subjectOutcome: {
      settlementStatus: "recorded",
      cellStatus: "passed",
      semanticAcceptance: "not-evaluated",
    },
  })).toEqual({ standing: "query-gap", label: "待语义复核" });
  expect(observerReviewStatusProjection({
    standing: "recorded",
    subjectOutcome: {
      settlementStatus: "recorded",
      cellStatus: "passed",
      finalStatus: "passed",
      semanticAcceptance: "passed",
    },
  })).toEqual({ standing: "recorded", label: "已记录" });
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
