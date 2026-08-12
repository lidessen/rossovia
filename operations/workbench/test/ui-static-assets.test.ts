import { describe, expect, test } from "bun:test";
import type { AutonomyClient } from "../src/ui/autonomy-client";
import { createWorkbenchRequestHandler } from "../src/ui/server";

const unusedClient = {} as AutonomyClient;
const handler = createWorkbenchRequestHandler({
  port: 4317,
  roots: [],
}, unusedClient);

describe("Principal Workbench static asset contract", () => {
  test.each([
    ["/", "text/html; charset=utf-8"],
    ["/styles.css", "text/css; charset=utf-8"],
    ["/app.js", "text/javascript; charset=utf-8"],
    ["/execution-proposal.js", "text/javascript; charset=utf-8"],
    ["/operational-semantics.js", "text/javascript; charset=utf-8"],
  ])("serves the declared browser entry dependency %s", async (pathname, contentType) => {
    const response = await handler(new Request(`http://127.0.0.1:4317${pathname}`));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(contentType);
    expect(await response.text()).not.toHaveLength(0);
  });

  test("continues to reject undeclared public paths", async () => {
    const response = await handler(
      new Request("http://127.0.0.1:4317/private-source.ts"),
    );

    expect(response.status).toBe(404);
  });

  test("keeps ordinary Task attempts read-only and distinct from result acceptance", async () => {
    const html = await (
      await handler(new Request("http://127.0.0.1:4317/"))
    ).text();
    const app = await (
      await handler(new Request("http://127.0.0.1:4317/app.js"))
    ).text();
    const attemptRenderer = app.slice(
      app.indexOf("function renderTaskAttempts"),
      app.indexOf("function renderTaskCreateWorktrees"),
    );

    expect(html).toContain('id="local-task-attempts"');
    expect(html).toContain("Read-only run history");
    expect(html).toContain("不显示原始 Work Cell trace");
    expect(html).toContain("不代表\n              独立 review、自动提交或语义接受");
    expect(attemptRenderer).toContain("尚无运行尝试");
    expect(attemptRenderer).toContain("运行尝试来源不可用");
    expect(attemptRenderer).toContain("Work Cell 验证（机械）");
    expect(attemptRenderer).toContain("started · 未见 settlement");
    expect(attemptRenderer).not.toContain("started · 运行中");
    expect(attemptRenderer).toContain("Stable source refs");
    expect(attemptRenderer).not.toContain('first(attempt, ["trace"]');
    expect(attemptRenderer).not.toContain("resultClaims");
  });

  test("separates producer claim, mechanical evidence, and independent review", async () => {
    const html = await (
      await handler(new Request("http://127.0.0.1:4317/"))
    ).text();
    const app = await (
      await handler(new Request("http://127.0.0.1:4317/app.js"))
    ).text();
    const renderer = app.slice(
      app.indexOf("function renderTaskResultEvaluation"),
      app.indexOf("function renderTaskAttempts"),
    );

    expect(html).toContain('id="task-result-producer"');
    expect(html).toContain('id="task-result-review"');
    expect(html).toContain("Producer 声明、Work Cell 机械证据与独立审查是不同证据层");
    expect(renderer).toContain("Producer result claim");
    expect(renderer).toContain("Independent review");
    expect(renderer).toContain("Reviewer");
    expect(renderer).toContain("Candidate · git-commit");
    expect(renderer).toContain("Independence");
    expect(renderer).toContain("Freshness");
    expect(renderer).toContain("Findings");
    expect(renderer).toContain("Review evidence refs");
  });
});
