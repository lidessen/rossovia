import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error The browser UI is intentionally JavaScript and embedded as a static asset.
import { observerConversationEvidenceLabels, observerReviewWorkerId } from "../ui/app.js";

const uiRoot = join(import.meta.dir, "../ui");

test("observer review projects the nested worker identity as a scalar", () => {
  expect(observerReviewWorkerId({ observer: { workerId: " deepseek-flash " } })).toBe("deepseek-flash");
  expect(observerReviewWorkerId({ observer: {} })).toBe("未知 worker");
  expect(observerReviewWorkerId({ observer: { workerId: { id: "deepseek-flash" } } })).toBe("未知 worker");
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
});

test("conversation disconnect makes the masthead distinguish projection from socket state", () => {
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  const css = readFileSync(join(uiRoot, "styles.css"), "utf8");
  expect(app).toContain('投影已连接 · 对话已断开');
  expect(app).toContain('connecting: "投影已连接 · 对话连接中"');
  expect(app).toContain('renderConnection();\n    renderConversationConnection();');
  expect(css).toContain('.connection-mark.is-warning');
});

test("slow projection loading explains what is and is not available", () => {
  const html = readFileSync(join(uiRoot, "index.html"), "utf8");
  const app = readFileSync(join(uiRoot, "app.js"), "utf8");
  expect(html).toContain('id="projection-loading" role="status"');
  expect(app).toContain('loading.dataset.phase = "slow"');
  expect(app).toContain('对话入口仍可用；任务、项目与执行证据尚未接收');
  expect(app).toContain('不要把等待误判为“零项目”');
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
