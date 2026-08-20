import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { UI_ASSETS } from "../src/assets.generated";

const gatewayRoot = resolve(import.meta.dir, "..");
const stylesCss = readFileSync(join(gatewayRoot, "ui", "styles.css"), "utf8");
const appJs = readFileSync(join(gatewayRoot, "ui", "app.js"), "utf8");

/**
 * Extract one full peek-context rule (selector + declaration block) from the
 * real stylesheet source. The selector never contains braces, and the rule
 * body contains none either, so a single non-greedy scan stays exact.
 */
function contextRule(
  css: string,
  context: "observation" | "workbench-task" | "task-create",
): string {
  const pattern = new RegExp(
    `body\\[data-peek-context="${context}"\\][^{]*\\{[^}]*\\}`,
    "u",
  );
  const match = pattern.exec(css);
  if (match === null) {
    throw new Error(`missing body[data-peek-context="${context}"] rule`);
  }
  return match[0];
}

/**
 * The classes a peek-context rule explicitly keeps visible through its
 * `:not(...)` list. Any other direct child of `.action-surface` is hidden.
 */
function excludedClasses(rule: string): string[] {
  return [...rule.matchAll(/:not\(\.([a-z0-9-]+)\)/gu)].map((entry) => entry[1]!);
}

describe("observation peek visibility for anomaly detail", () => {
  const observationRule = contextRule(stylesCss, "observation");
  const observationExclusions = excludedClasses(observationRule);
  const hiddenByObservationRule = (childClass: string) =>
    !observationExclusions.includes(childClass);

  test("observation context keeps the anomaly detail visible", () => {
    expect(observationRule).toContain(
      'body[data-peek-context="observation"] .action-surface >',
    );
    // The anomaly evidence section is a direct child of .action-surface and
    // must stay visible when the receiver opens an observation (runner-unbound,
    // runner-unreachable, raw git source errors).
    expect(observationRule).toContain(":not(.anomaly-detail)");
    expect(observationExclusions).toContain("anomaly-detail");
    expect(hiddenByObservationRule("anomaly-detail")).toBe(false);
    // The peek chrome stays visible exactly as before.
    expect(hiddenByObservationRule("peek-bar")).toBe(false);
    expect(hiddenByObservationRule("peek-summary")).toBe(false);
  });

  test("existing observation hiding rules still hide every other panel", () => {
    expect(observationRule).toContain("display: none !important");
    // Panels owned by other peek contexts and generic action chrome remain
    // hidden in observation context; the fix only un-hides anomaly evidence.
    expect(hiddenByObservationRule("local-task-detail")).toBe(true);
    expect(hiddenByObservationRule("task-create-panel")).toBe(true);
    expect(hiddenByObservationRule("action-header")).toBe(true);
    expect(hiddenByObservationRule("current-operation")).toBe(true);
  });

  test("workbench-task and task-create contexts keep their own panel exclusions", () => {
    const workbenchTaskRule = contextRule(stylesCss, "workbench-task");
    const taskCreateRule = contextRule(stylesCss, "task-create");
    expect(excludedClasses(workbenchTaskRule)).toContain("local-task-detail");
    expect(workbenchTaskRule).toContain("display: none !important");
    expect(excludedClasses(taskCreateRule)).toContain("task-create-panel");
    expect(taskCreateRule).toContain("display: none !important");
  });

  test("the generated embedded styles asset matches the edited source styles", () => {
    // The served UI (source checkout and single-file binary) reads the
    // embedded copy; it must be byte-identical to the edited source so the
    // fix is actually delivered to the receiver.
    const embeddedStylesCss = UI_ASSETS["styles.css"];
    if (embeddedStylesCss === undefined) {
      throw new Error("missing embedded styles.css asset");
    }
    expect(embeddedStylesCss).toBe(stylesCss);
    expect(contextRule(embeddedStylesCss, "observation")).toContain(
      ":not(.anomaly-detail)",
    );
  });

  test("scan surfaces keep summaries compact and preserve anomaly context", () => {
    expect(stylesCss).toContain(".task-view .work-item-body > span");
    expect(stylesCss).toContain(".conversation-context .context-section:first-child");
    expect(stylesCss).toContain(".conversation-empty-standing {\n  display: none !important;");
    expect(stylesCss).toContain(".conversation-boundary {\n    display: none !important;");
    expect(stylesCss).not.toContain(".conversation-empty-standing,\n.conversation-boundary");
    expect(appJs).toContain('data-work-item-kind="${escapeHtml(text(item.kind, "work"))}"');
    expect(appJs).toContain("renderAnomalyDetail(anomaly, item)");
    expect(appJs).toContain('class="project-group-disclosure"');
    expect(stylesCss).toContain(".project-group-disclosure");
    expect(UI_ASSETS["app.js"]).toBe(appJs);
  });

  test("loading keeps the conversation shell visible while snapshot surfaces wait", () => {
    expect(stylesCss).toContain('body[data-projection-state="loading"] .workbench-shell > .principal-rail');
    expect(stylesCss).toContain('body[data-projection-state="loading"] .workbench-shell > .project-surface');
    expect(stylesCss).toContain('body[data-projection-state="loading"] .workbench-shell > .conversation-surface');
    expect(stylesCss).toContain('grid-template-columns: minmax(0, 1fr);');
  });

  test("settled conversation replies use escaped, limited Markdown rendering", () => {
    expect(appJs).toContain("function renderConversationMarkdown(value)");
    expect(appJs).toContain("function renderConversationInlineMarkdown(value)");
    expect(appJs).toContain("escapeHtml(value)");
    expect(appJs).toContain("https?:\\/\\/");
    expect(appJs).toContain('rel="noreferrer"');
    expect(appJs).toContain("const heading = line.match(/^\\s*(#{1,3})\\s+(.+?)\\s*$/u);");
    expect(appJs).toContain("function isConversationMarkdownTableSeparator(value, columnCount)");
    expect(appJs).toContain("/^:?-{3,}:?$/u");
    expect(appJs).toContain('class=\"turn-table-wrap\"');
    expect(appJs).toContain("<thead>");
    expect(appJs).toContain("<tbody>");
    expect(stylesCss).toContain(".turn-table-wrap {");
    expect(stylesCss).toContain("overflow-x: auto;");
    expect(appJs).toContain('class="turn-response turn-response-markdown"');
    expect(appJs).toContain("renderConversationMarkdown(entry.response)");
  });

  test("source disclosure explains its purpose before preserving raw evidence", () => {
    expect(appJs).toContain("已向协调器披露 ${sourceCount} 项材料");
    expect(appJs).toContain("展开查看依据");
    expect(appJs).toContain("这里列出披露给协调器的材料和版本记录");
    expect(appJs).toContain("ref: ${escapeHtml");
    expect(appJs).toContain("digest: ${escapeHtml");
    expect(appJs).toContain("source: ${escapeHtml");
    expect(appJs).toContain("revision: ${escapeHtml");
    expect(appJs).toContain("协调器读取的来源版本");
  });

  test("mobile conversation header leaves the global connection status as the only status", () => {
    expect(stylesCss).toContain("grid-template-columns: minmax(0, 1fr);");
    expect(stylesCss).toContain(".conversation-standing {\n  display: none;\n}");
    expect(stylesCss).not.toContain(".conversation-standing strong");
    expect(stylesCss).not.toContain(".conversation-standing code");
    expect(appJs).toContain('$("#connection-label").textContent = "实时 · 已连接";');
  });
});
