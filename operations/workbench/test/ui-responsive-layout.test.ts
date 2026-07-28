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
});
