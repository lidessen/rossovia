import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * The task-entry hierarchy correction (desktop and mobile share the same
 * asset path): the navigation entry and the task-view heading name the
 * all-work-item surface (全部工作事项) while the backlog triage panel names
 * the Principal-task subset (Principal 任务 · 待办分层) and carries its own
 * total. The two counts — all work items vs Principal tasks — are labeled
 * separately so one can never be mistaken for the other. These are copy and
 * asset assertions over the served ui/ sources; the embedded generated asset
 * must carry the identical bytes.
 */

const gatewayRoot = resolve(import.meta.dir, "..");
const indexHtml = readFileSync(join(gatewayRoot, "ui", "index.html"), "utf8");
const appJs = readFileSync(join(gatewayRoot, "ui", "app.js"), "utf8");
const generated = readFileSync(
  join(gatewayRoot, "src", "assets.generated.ts"),
  "utf8",
);

describe("task entry hierarchy copy", () => {
  test("the navigation and task-view heading name all work items, not tasks", () => {
    // Desktop rail entry keeps its all-work-items badge.
    expect(indexHtml).toContain(
      '<button class="view-button" type="button" data-view="tasks">\n'
        + "            <span>全部工作事项</span>\n"
        + '            <strong id="all-task-count">—</strong>\n'
        + "          </button>",
    );
    // Task-view heading kicker.
    expect(indexHtml).toContain(
      "<span>全部工作事项</span>\n"
        + '                <h3 id="task-view-heading">当前视图</h3>',
    );
    // Mobile tab entry (shared desktop/mobile asset path).
    expect(indexHtml).toContain(
      '<button class="mobile-tab" type="button" data-mobile-view="tasks">'
        + "全部工作事项</button>",
    );
    // The tasks view title and heading text come from the same copy.
    expect(appJs).toContain(
      'tasks: ["All work items", "全部工作事项",',
    );
    // The ambiguous plain "全部事项" labels must not survive.
    expect(indexHtml).not.toContain(
      'data-view="tasks">\n            <span>全部事项</span>',
    );
    expect(indexHtml).not.toContain('data-mobile-view="tasks">全部事项');
    expect(appJs).not.toContain('tasks: ["All work items", "全部事项",');
  });

  test("the triage panel names the Principal-task subset and carries its own total", () => {
    expect(indexHtml).toContain(
      '<h4 id="task-triage-heading">Principal 任务 · 待办分层</h4>',
    );
    expect(indexHtml).toContain(
      'id="task-triage-total" aria-label="Principal 任务总数"',
    );
    // The renderer fills the total from the existing four-layer projection
    // and fails closed to "—" when the task source is unavailable.
    expect(appJs).toContain('const total = $("#task-triage-total");');
    expect(appJs).toContain(
      "total.textContent = projection.total === null\n"
        + '        ? "—"\n'
        + "        : String(projection.total);",
    );
  });

  test("the generated asset embeds the corrected copy byte-identically", () => {
    expect(generated).toContain("全部工作事项");
    expect(generated).toContain(
      'id="task-triage-total" aria-label="Principal 任务总数"',
    );
    expect(generated).toContain('const total = $("#task-triage-total");');
    // The generated asset must not drift from the ui/ sources (the dedicated
    // ui-generated-assets test verifies byte parity; this keeps the hierarchy
    // copy visible even when only this focused file runs).
    expect(generated).toContain(
      'tasks: ["All work items", "全部工作事项",',
    );
  });
});
