import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { AutonomyClient } from "../src/ui/autonomy-client";
import { initializeHome } from "../src/home";
import { createWorkbenchRequestHandler } from "../../gateway/src/ui-server";

const roots: string[] = [];
const unusedClient = {} as AutonomyClient;

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test("snapshot exposes observer reviews and safe settings projections", async () => {
  const root = mkdtempSync(join(tmpdir(), "rossovia-ui-projection-"));
  roots.push(root);
  initializeHome(root);
  const handler = createWorkbenchRequestHandler({
    home: root,
    port: 4317,
    roots: [],
    observerWorkerId: "deepseek-flash",
  }, unusedClient);

  const response = await handler(new Request("http://127.0.0.1:4317/api/snapshot"));
  expect(response.status).toBe(200);
  const snapshot = await response.json() as Record<string, any>;
  expect(snapshot.observerReviews.version).toBe("rossovia.workflow-review-projection.v1");
  expect(snapshot.observerReviews.standing).toBe("available");
  expect(snapshot.observerReviews.reviews).toEqual([]);
  expect(snapshot.settings.version).toBe("rosso.settings-projection.v1");
  expect(snapshot.settings.standing).toBe("available");
  expect(snapshot.settings.observer.enabled).toBe(true);
  expect(snapshot.settings.workers.length).toBeGreaterThan(0);
  expect(snapshot.settings.providers.length).toBeGreaterThan(0);
  expect(snapshot.settings.skillSources.version).toBe("rosso.skill-source-projection.v1");
  expect(snapshot.settings.skillSources.audiences).toHaveLength(2);
  expect(snapshot.settings.skillSources.audiences[0].sources.map((source: any) => source.kind)).toEqual([
    "picked",
    "builtin",
    "user-custom",
  ]);
  expect(snapshot.settings.skillSources.audiences[1].sources[2].standing).toBe("not-granted");
  expect(snapshot.settings.skillSources.audiences[0].sources[0].ownership).toBe("host-package");
  expect(snapshot.settings.skillSources.audiences[0].sources[2].ownership).toBe("user");
  expect(snapshot.settings.directories.currentDefault).toBe("~/.rosso");
  expect(snapshot.settings.directories.targetDefault).toBe("~/.rossovia");
  expect(snapshot.settings.directories.skillCustom).toBe("~/.rossovia/skills/custom");
  expect(snapshot.settings.directories.skillPackages).toContain("{picked,builtin}");
  expect(JSON.stringify(snapshot.settings)).not.toContain("API_KEY=");
});

test("system surfaces remain secondary to conversation", async () => {
  const handler = createWorkbenchRequestHandler({ port: 4317, roots: [] }, unusedClient);
  const html = await (await handler(new Request("http://127.0.0.1:4317/"))).text();
  const app = await (await handler(new Request("http://127.0.0.1:4317/app.js"))).text();
  expect(html).toContain('data-view="observer"');
  expect(html).toContain('data-view="settings"');
  expect(html).toContain('id="observer-surface"');
  expect(html).toContain('id="settings-surface"');
  expect(html).toContain('id="settings-skill-source-list"');
  expect(html).toContain('id="settings-directory-list"');
  expect(app).toContain("在对话中处理这条意见");
  expect(app).toContain("未记录直接对话关联");
  expect(app).toContain("function renderSettingsSurface");
  expect(app).toContain("settings-skill-source-count");
  expect(app).toContain("安装包内置技能");
  expect(app).toContain("function renderObserverSurface");
});
