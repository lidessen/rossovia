import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AutonomyClient } from "../../workbench/src/ui/autonomy-client";
import { initializeHome } from "../../workbench/src/home";
import { createWorkbenchRequestHandler } from "../src/ui-server";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "rossovia-compact-snapshot-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  initializeHome(home);
  const origin = "http://127.0.0.1:4317";
  const handler = createWorkbenchRequestHandler({
    home,
    port: 4317,
    roots: [],
  }, {} as AutonomyClient);
  return { root, home, origin, handler };
}

function post(
  handler: ReturnType<typeof createWorkbenchRequestHandler>,
  origin: string,
  path: string,
  body: unknown,
) {
  return handler(new Request(`${origin}${path}`, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }));
}

async function createTask(
  handler: ReturnType<typeof createWorkbenchRequestHandler>,
  origin: string,
  sourceRevision: number,
): Promise<{ taskId: string; sourceRevision: number }> {
  const response = await post(handler, origin, "/api/tasks", {
    title: "Compact snapshot fixture task",
    objective: "Keep the list navigable while details load on demand",
    acceptance: ["The initial snapshot stays small"],
    nextActor: "agent",
    expectedSourceRevision: sourceRevision,
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  return {
    taskId: body.result.task.id as string,
    sourceRevision: body.result.sourceRevision as number,
  };
}

async function compactSnapshot(
  handler: ReturnType<typeof createWorkbenchRequestHandler>,
  origin: string,
): Promise<Record<string, any>> {
  const response = await handler(new Request(`${origin}/api/snapshot?compact=1`));
  expect(response.status).toBe(200);
  return await response.json() as Record<string, any>;
}

async function fullSnapshot(
  handler: ReturnType<typeof createWorkbenchRequestHandler>,
  origin: string,
): Promise<Record<string, any>> {
  const response = await handler(new Request(`${origin}/api/snapshot`));
  expect(response.status).toBe(200);
  return await response.json() as Record<string, any>;
}

describe("compact initial snapshot and on-demand task detail", () => {
  test("the compact initial snapshot drops every taskDetail while the full route keeps the baseline body", async () => {
    const { handler, origin } = fixture();
    const first = await createTask(handler, origin, 0);
    await createTask(handler, origin, first.sourceRevision);

    const full = await fullSnapshot(handler, origin);
    const fullItems = full.workItems.items.filter(
      (item: { kind: string }) => item.kind === "principal-task",
    );
    expect(fullItems).toHaveLength(2);
    expect(fullItems[0].taskDetail).toBeDefined();
    expect(fullItems[0].taskDetail.task.revision).toBe(1);
    expect(fullItems[0].taskDetail.sourceRevision).toBe(2);

    const compact = await compactSnapshot(handler, origin);
    const compactItems = compact.workItems.items.filter(
      (item: { kind: string }) => item.kind === "principal-task",
    );
    expect(compactItems).toHaveLength(2);
    // Navigation and search summaries stay complete; full detail is absent
    // and is never faked by the compact projection.
    expect(compactItems[0]).toMatchObject({
      id: fullItems[0].id,
      kind: "principal-task",
      lifecycle: "open",
      nextActor: "agent",
      title: "Compact snapshot fixture task",
      summary: "Keep the list navigable while details load on demand",
      context: "Workbench · 独立任务",
      runnerId: null,
      binding: {
        kind: "workbench-task",
        projectContext: null,
      },
      actionLabel: "查看任务",
      attentionCode: null,
    });
    expect(compactItems[0].taskDetail).toBeUndefined();
    expect(compactItems[1].taskDetail).toBeUndefined();
    // The compact shell mirrors the bounded search text so the locator keeps
    // deep keywords findable without the canonical Task payload; the full
    // route carries the identical field.
    expect(typeof compactItems[0].searchText).toBe("string");
    expect(compactItems[0].searchText).toContain("Keep the list navigable");
    expect(compactItems[0].searchText).toContain("The initial snapshot stays small");
    expect(compactItems[0].searchText).toBe(fullItems[0].searchText);
    expect(compactItems[0].searchText).not.toContain("sourceRef");
    // Counts, source revision, and observer locating inputs stay available.
    expect(compact.workItems.capabilities.independentTasks).toEqual({
      standing: "available",
      count: 2,
      sourceRevision: 2,
    });
    expect(compact.workItems.items.every(
      (item: { id: string }) => typeof item.id === "string" && item.id !== "",
    )).toBeTrue();
    expect(compact.workItems.items.every(
      (item: { title?: unknown }) => typeof item.title === "string",
    )).toBeTrue();
    expect(compact.workItems.items.every(
      (item: { lifecycle?: unknown }) => typeof item.lifecycle === "string",
    )).toBeTrue();
    expect(compact.workItems.items.every(
      (item: { summary?: unknown }) => typeof item.summary === "string",
    )).toBeTrue();

    // Baseline comparison: the initial body the browser receives is strictly
    // smaller than the previous full projection.
    const fullBytes = new TextEncoder().encode(JSON.stringify(full)).byteLength;
    const compactBytes = new TextEncoder().encode(JSON.stringify(compact)).byteLength;
    expect(compactBytes).toBeLessThan(fullBytes);
  });

  test("the selected Task detail route returns the full projection and its exact revisions keep every mutation working", async () => {
    const { handler, origin } = fixture();
    const created = await createTask(handler, origin, 0);
    const taskId = created.taskId;

    const detailResponse = await handler(
      new Request(`${origin}/api/tasks/${encodeURIComponent(taskId)}/detail`),
    );
    expect(detailResponse.status).toBe(200);
    const detailBody = await detailResponse.json();
    expect(detailBody.ok).toBeTrue();
    const item = detailBody.workItem;
    expect(item.id).toBe(`principal-task:${taskId}`);
    const detail = item.taskDetail;
    expect(detail).toBeDefined();
    expect(detail.sourceRevision).toBe(1);
    expect(detail.task.revision).toBe(1);
    expect(detail.ownership).toBe("workbench-local");
    expect(detail.executionContext).toBeDefined();
    // The full detail item mirrors the same bounded search text the compact
    // snapshot shell carries, so the locator surface stays identical.
    expect(typeof item.searchText).toBe("string");
    expect(item.searchText).toContain("Keep the list navigable");

    const corrected = await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "correct",
      statement: "Detail projection revisions must stay exact.",
      nextActor: "agent",
      expectedSourceRevision: detail.sourceRevision,
      expectedRevision: detail.task.revision,
    });
    expect(corrected.status).toBe(200);
    expect(await corrected.json()).toMatchObject({
      result: { sourceRevision: 2, task: { revision: 2 } },
    });

    const afterCorrection = await (
      await handler(new Request(`${origin}/api/tasks/${encodeURIComponent(taskId)}/detail`))
    ).json();
    const second = afterCorrection.workItem.taskDetail;
    expect(second.sourceRevision).toBe(2);
    expect(second.task.revision).toBe(2);

    const assigned = await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "assign",
      nextActor: "principal",
      expectedSourceRevision: second.sourceRevision,
      expectedRevision: second.task.revision,
    });
    expect(assigned.status).toBe(200);

    const afterAssign = await (
      await handler(new Request(`${origin}/api/tasks/${encodeURIComponent(taskId)}/detail`))
    ).json();
    const third = afterAssign.workItem.taskDetail;
    const submitted = await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "submit",
      summary: "The compact-first flow kept the exact revisions.",
      evidenceRefs: ["test:compact-snapshot"],
      expectedSourceRevision: third.sourceRevision,
      expectedRevision: third.task.revision,
    });
    expect(submitted.status).toBe(200);

    const afterSubmit = await (
      await handler(new Request(`${origin}/api/tasks/${encodeURIComponent(taskId)}/detail`))
    ).json();
    const fourth = afterSubmit.workItem.taskDetail;
    const accepted = await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "accept",
      expectedSourceRevision: fourth.sourceRevision,
      expectedRevision: fourth.task.revision,
    });
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toMatchObject({
      result: { task: { lifecycle: "settled" } },
    });

    const afterAccept = await (
      await handler(new Request(`${origin}/api/tasks/${encodeURIComponent(taskId)}/detail`))
    ).json();
    const fifth = afterAccept.workItem.taskDetail;
    const reopened = await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "reopen",
      statement: "Another pass is required.",
      nextActor: "agent",
      expectedSourceRevision: fifth.sourceRevision,
      expectedRevision: fifth.task.revision,
    });
    expect(reopened.status).toBe(200);
    expect(await reopened.json()).toMatchObject({
      result: { task: { lifecycle: "open", revision: 6 } },
    });

    // A mutation formed from the first fetched detail is now stale and must
    // fail closed instead of silently reusing an old revision.
    const stale = await post(handler, origin, `/api/tasks/${taskId}/actions`, {
      kind: "assign",
      nextActor: "principal",
      expectedSourceRevision: detail.sourceRevision,
      expectedRevision: detail.task.revision,
    });
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({ error: "task-drift" });

    // The compact snapshot still carries the settled summary without detail.
    const compact = await compactSnapshot(handler, origin);
    const itemInCompact = compact.workItems.items.find(
      (candidate: { id: string }) => candidate.id === `principal-task:${taskId}`,
    );
    expect(itemInCompact).toMatchObject({
      lifecycle: "open",
      nextActor: "agent",
      actionLabel: "查看任务",
    });
    expect(itemInCompact.taskDetail).toBeUndefined();
    expect(compact.workItems.capabilities.independentTasks).toMatchObject({
      standing: "available",
      sourceRevision: 6,
    });
  });

  test("the detail route answers 404 for an unknown task and keeps the compact snapshot readable", async () => {
    const { handler, origin } = fixture();
    await createTask(handler, origin, 0);

    const missing = await handler(new Request(
      `${origin}/api/tasks/99999999-9999-4999-8999-999999999999/detail`,
    ));
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({
      error: "task-not-found",
    });

    const malformed = await handler(new Request(`${origin}/api/tasks/not-a-uuid/detail`));
    expect(malformed.status).toBe(404);

    const compact = await compactSnapshot(handler, origin);
    expect(compact.complete).toBeTrue();
    expect(compact.workItems.items.some(
      (item: { kind: string }) => item.kind === "principal-task",
    )).toBeTrue();
  });

  test("compact and full snapshot routes keep separate in-flight bodies and identical shells", async () => {
    const { handler, origin } = fixture();
    await createTask(handler, origin, 0);
    const [compact, full] = await Promise.all([
      compactSnapshot(handler, origin),
      fullSnapshot(handler, origin),
    ]);
    const shellOf = (item: Record<string, unknown>) => {
      const { taskDetail: _taskDetail, ...shell } = JSON.parse(JSON.stringify(item));
      // Evidence freshness timestamps are per-build generatedAt values, so
      // the shell comparison ignores only that timestamp and keeps every
      // other field (sourceRefs, lifecycle, binding, summaries) exact.
      if (shell.evidence?.freshness && typeof shell.evidence.freshness === "object") {
        delete shell.evidence.freshness.observedAt;
      }
      return shell;
    };
    const compactShells = compact.workItems.items
      .filter((item: { kind: string }) => item.kind === "principal-task")
      .map(shellOf);
    const fullShells = full.workItems.items
      .filter((item: { kind: string }) => item.kind === "principal-task")
      .map(shellOf);
    expect(compactShells).toEqual(fullShells);
  });
});
