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
  expect(html).toContain('<details class="mobile-system-menu">');
  expect(html).toContain('<summary aria-label="打开系统工具">系统</summary>');
  expect(html).toContain('data-view="observer"');
  expect(html).toContain('data-view="settings"');
  expect((html.match(/data-mobile-view=/gu) ?? []).length).toBe(4);
  expect(html).toContain('aria-label="移动端主导航"');
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
