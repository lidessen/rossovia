import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const styles = readFileSync(
  resolve(import.meta.dir, "../ui/styles.css"),
  "utf8",
);
const html = readFileSync(resolve(import.meta.dir, "../ui/index.html"), "utf8");
const app = readFileSync(resolve(import.meta.dir, "../ui/app.js"), "utf8");

function mediaSection(start: string, end: string): string {
  const startIndex = styles.indexOf(start);
  const endIndex = styles.indexOf(end, startIndex);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return styles.slice(startIndex, endIndex);
}

describe("Workbench responsive layout", () => {
  test("makes the unified overview primary while retaining detail evidence on demand", () => {
    expect(html.indexOf('id="unified-surface"')).toBeLessThan(
      html.indexOf('id="project-detail"'),
    );
    expect(html).toContain('id="overview-attention-list"');
    expect(html).toContain('id="project-overview-list"');
    expect(html).toContain('id="work-item-peek"');
    expect(styles).toMatch(
      /\.target-strip,\s*\.principal-snapshot\s*\{[^}]*display:\s*none;/s,
    );
    expect(app).toContain("renderUnifiedSurface()");
    expect(app).toContain("renderPeek()");
  });

  test("uses a stable navigation rail and an on-demand fixed Peek on desktop", () => {
    expect(styles).toMatch(
      /\.workbench-shell\s*\{[^}]*grid-template-columns:\s*232px minmax\(0,\s*1fr\);/s,
    );
    expect(html).toContain('data-view="tasks"');
    expect(html).toContain('id="all-task-count"');
    expect(app).toContain('$("#all-task-count").textContent = String(counts.all)');
    expect(styles).toMatch(
      /\.action-surface\s*\{[^}]*height:\s*100dvh;[^}]*position:\s*fixed;[^}]*right:\s*0;[^}]*top:\s*0;[^}]*width:\s*min\(620px,\s*48vw\);/s,
    );
    expect(html).toContain('id="peek-close"');
  });

  test("exposes exactly three mobile primary destinations", () => {
    const mobileButtons = html.match(/data-mobile-view="[^"]+"/g) ?? [];
    expect(mobileButtons).toEqual([
      'data-mobile-view="overview"',
      'data-mobile-view="tasks"',
      'data-mobile-view="projects"',
    ]);
    const mobile = styles.slice(styles.lastIndexOf("@media (max-width: 700px)"));
    expect(mobile).toMatch(
      /\.mobile-tab-bar\s*\{[^}]*bottom:\s*0;[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(3,\s*1fr\);[^}]*position:\s*fixed;/s,
    );
    expect(mobile).toMatch(/\.principal-rail\s*\{[^}]*display:\s*none;/s);
  });

  test("makes consequential mobile details full-screen with sticky authorization actions", () => {
    const mobile = styles.slice(styles.lastIndexOf("@media (max-width: 700px)"));
    expect(mobile).toMatch(
      /\.action-surface\s*\{[^}]*display:\s*block;[^}]*height:\s*100dvh;[^}]*inset:\s*0;[^}]*width:\s*100%;/s,
    );
    expect(mobile).toMatch(
      /body\[data-peek-consequence="high"\] \.proposal-submit\s*\{[^}]*bottom:\s*0;[^}]*position:\s*sticky;/s,
    );
    expect(app).toContain("detailRevalidationPending");
    expect(app).toContain("正在重验当前目标");
  });

  test("keeps Workbench-owned task creation and lifecycle actions in the same Peek", () => {
    expect(html).toContain('id="create-task-button"');
    expect(html).toContain('id="task-create-panel"');
    expect(html).toContain('id="local-task-detail"');
    expect(html).toContain('id="task-assign-form"');
    expect(html).toContain('id="task-correct-form"');
    expect(html).toContain("<button type=\"submit\">记录纠正</button>");
    expect(html).toContain('id="task-result-form"');
    expect(html).toContain('id="task-accept-button"');
    expect(html).toContain('id="task-reopen-form"');
    expect(html).toContain('id="local-task-identity-assurance"');
    expect(html).toContain('id="task-create-mission"');
    expect(html).toContain('id="local-task-mission-context"');
    expect(html).toContain('id="local-task-execution-context"');
    expect(html).toContain('id="task-launch-readiness"');
    expect(html).toContain("下一次 Agent execution");
    expect(html).toContain('id="task-launch-execution-form"');
    expect(html).toContain("启动已授权 Agent");
    expect(html).toContain("消费当前已存在的一次性执行授权");
    expect(html).toContain("不会授予 commit、merge 或 publish 权限");
    expect(html).toContain('id="task-link-execution-form"');
    expect(html).toContain('id="task-correction-delivery-form"');
    expect(html).toContain("发送纠正到当前 Agent");
    expect(html).toContain('id="task-verified-result-candidate"');
    expect(html).toContain("Agent 提供的证据引用");
    expect(html).toContain("提交当前已验证执行结果");
    expect(html).toContain("Authorization consumption");
    expect(html).toContain("Current turn");
    expect(html).toContain("Current effect");
    expect(html).toContain("same-mission-current-carrier");
    expect(html).toContain("execution-unproven");
    expect(html).toContain("接受本地任务结果");
    expect(styles).toMatch(
      /body\[data-peek-context="workbench-task"\] \.action-surface > :not\(\.peek-bar\):not\(\.peek-summary\):not\(\.local-task-detail\)/,
    );
    expect(app).toContain('path: "/api/tasks"');
    expect(app).toContain("...(project && mission ? { mission } : {})");
    expect(app).toContain('sendTaskMutation("link-execution", { authorizationId })');
    expect(app).toContain('first(executionContext, ["launchCandidate"])');
    expect(app).toContain('first(executionContext, ["launchReadiness"])');
    expect(app).toContain('launchReadinessStanding === "not-applicable"');
    expect(app).toContain('launchReadinessStanding === "ready" ? "已就绪" : "需要准备"');
    expect(app).toContain('"clean-detached-worktree-required"');
    expect(app).toContain('sendTaskMutation("launch-authorized-execution"');
    expect(app).toContain(
      'authorizationId: first(candidate, ["authorizationId"])',
    );
    expect(app).toContain(
      'proposalDigest: first(candidate, ["proposalDigest"])',
    );
    expect(app).toContain('sendTaskMutation("deliver-correction"');
    expect(app).toContain('sendTaskMutation("submit-verified-execution"');
    expect(app).toContain("接受未验证的 Agent 声明");
    expect(app).toContain("接受已验证的本地结果");
    expect(app).toContain("纠正 · 仅保留在本地任务");
    expect(app).toContain("纠正 · 已送达 watermark");
    expect(app).toContain("authorization consumption verified");
    expect(app).toContain("legacy execution-unproven");
    expect(app).toContain("当前载体无法唯一确认");
    expect(app).toContain('`/api/tasks/${encodeURIComponent(task.id)}/actions`');
    expect(app).toContain('sendTaskMutation("rebind-worktree"');
    expect(html).toContain('id="task-rebind-worktree-form"');
    expect(html).toContain('id="task-rebind-worktree-submit"');
    expect(html).toContain('id="task-rebind-worktree-submit" type="submit" disabled');
    expect(app).toContain("选择新的 Worktree…");
    expect(app).toContain(
      'state.taskActionPending || $("#task-rebind-worktree").value.length === 0',
    );
    expect(app).toContain("detail.identityAssurance");
  });

  test("keeps the authorized Agent launch reachable on mobile without a second authorization form", () => {
    const mobile = styles.slice(styles.lastIndexOf("@media (max-width: 700px)"));

    expect(html.match(/id="task-launch-execution-form"/g)).toHaveLength(1);
    expect(html).not.toContain("task-launch-authorization-input");
    expect(mobile).toMatch(
      /\.task-launch-execution\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s,
    );
    expect(mobile).toMatch(
      /\.task-launch-readiness > header\s*\{[^}]*display:\s*grid;/s,
    );
    expect(mobile).toMatch(
      /\.task-launch-readiness li strong,\s*\.task-launch-readiness li small\s*\{[^}]*overflow-wrap:\s*anywhere;/s,
    );
    expect(mobile).toMatch(
      /\.task-launch-execution button\s*\{[^}]*min-height:\s*46px;[^}]*width:\s*100%;/s,
    );
  });

  test("separates pending Agent responsibility from exact live Agent work", () => {
    expect(html).toContain('data-task-filter="agent">Agent 工作</button>');
    expect(html).toContain('data-task-filter="agent-pending">待 Agent</button>');
    expect(app).toContain('state.taskFilter === "agent-pending"');
    expect(app).toContain(
      'item.nextActor === "agent" && !isExactLiveAgentWork(item)',
    );
    expect(app).toContain('item.kind === "agent-work"');
  });

  test("keeps full worktree identities inside the mobile viewport", () => {
    const mobile = mediaSection(
      "@media (max-width: 700px)",
      "@media (prefers-reduced-motion: no-preference)",
    );

    expect(mobile).toMatch(
      /\.worktree-button\s*\{[^}]*grid-template-columns:\s*8px minmax\(0,\s*1fr\);/s,
    );
    expect(mobile).toMatch(
      /\.worktree-meta\s*\{[^}]*grid-column:\s*2;[^}]*min-width:\s*0;[^}]*overflow-wrap:\s*anywhere;[^}]*text-align:\s*left;/s,
    );
  });

  test("stacks the correction causal chain on mobile", () => {
    const mobile = mediaSection(
      "@media (max-width: 700px)",
      "@media (prefers-reduced-motion: no-preference)",
    );

    expect(mobile).toMatch(
      /\.correction-chain\s*\{[^}]*grid-template-columns:\s*1fr;/s,
    );
    expect(html).toContain(
      "input actor / input source 未投影 · executor 未保留",
    );
    expect(app).toContain("验证已过期 · 需重验");
    expect(app).toContain("载体不可达 · 缓存");
  });

  test("keeps Principal decision evidence readable within a mobile viewport", () => {
    const mobile = mediaSection(
      "@media (max-width: 700px)",
      "@media (prefers-reduced-motion: no-preference)",
    );

    expect(mobile).toMatch(
      /\.proposal-facts,\s*\.proposal-authorization dl,\s*\.intent-lineage-gate dl,\s*\.anchor-migration-brief dl,\s*\.reconciliation-action-facts,\s*\.candidate-evidence dl\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s,
    );
    expect(mobile).toMatch(
      /\.candidate-evidence dl > div:nth-child\(even\)\s*\{[^}]*border-left:\s*0;[^}]*padding-left:\s*0;/s,
    );
    expect(styles).toMatch(
      /\.candidate-evidence dd\s*\{[^}]*overflow-wrap:\s*anywhere;[^}]*white-space:\s*pre-wrap;/s,
    );
    expect(styles).toMatch(
      /\.anchor-migration-options\s*\{[^}]*display:\s*grid;[^}]*gap:[^}]*list-style:\s*none;/s,
    );
    expect(styles).toMatch(
      /\.anchor-migration-options span,[^}]*\.anchor-migration-invalid\s*\{[^}]*font-size:\s*0\.68rem;[^}]*line-height:\s*1\.5;[^}]*overflow-wrap:\s*anywhere;/s,
    );
    expect(styles).toMatch(
      /\.anchor-migration-steps\s*\{[^}]*display:\s*grid;[^}]*list-style:\s*none;/s,
    );
    expect(styles).toMatch(
      /\.anchor-migration-steps code\s*\{[^}]*overflow-wrap:\s*anywhere;/s,
    );
    expect(styles).toMatch(
      /\.anchor-migration-risk\s*\{[^}]*line-height:\s*1\.5;[^}]*overflow-wrap:\s*anywhere;/s,
    );
    expect(mobile).toMatch(
      /\.proposal-decision > p,\s*\.proposal-option-result,\s*\.proposal-option-tradeoff,\s*\.proposal-acknowledgements label\s*\{[^}]*font-size:\s*0\.72rem;[^}]*line-height:\s*1\.5;/s,
    );
    expect(mobile).toMatch(
      /\.attention-item strong,[^}]*\.project-button span\s*\{[^}]*overflow-wrap:\s*anywhere;/s,
    );
    expect(styles).toMatch(
      /\.raw-evidence\s*\{[^}]*max-width:\s*100%;[^}]*overflow-wrap:\s*anywhere;[^}]*word-break:\s*break-word;/s,
    );
  });

  test("keeps local task primary actions reachable on mobile", () => {
    const mobile = styles.slice(styles.lastIndexOf("@media (max-width: 700px)"));
    expect(mobile).toMatch(
      /\.task-primary-actions\s*\{[^}]*bottom:\s*0;[^}]*position:\s*sticky;/s,
    );
    expect(mobile).toMatch(
      /\.task-form-grid,\s*\.local-task-facts\s*\{[^}]*grid-template-columns:\s*1fr;/s,
    );
    expect(mobile).toMatch(
      /\.local-task-mission-context\s*\{[^}]*grid-template-columns:\s*1fr;/s,
    );
    expect(mobile).toMatch(
      /\.local-task-carrier-context\s*\{[^}]*border-left:\s*0;[^}]*border-top:\s*1px solid var\(--line-light\);/s,
    );
    expect(mobile).toMatch(
      /\.local-task-execution-context > header\s*\{[^}]*display:\s*grid;/s,
    );
    expect(mobile).toMatch(
      /\.task-link-execution button\s*\{[^}]*min-height:\s*44px;[^}]*width:\s*100%;/s,
    );
    expect(mobile).toMatch(
      /\.task-primary-actions \.primary-action\s*\{[^}]*min-height:\s*46px;[^}]*width:\s*100%;/s,
    );
  });

  test("refreshes the factual snapshot after a task source failure", () => {
    expect(app).toContain('error?.code === "source-unavailable"');
    expect(app).toContain("await loadSnapshot({ manual: true, ensure: true })");
    expect(app).toContain("实时 · 部分来源不可用");
  });
});
