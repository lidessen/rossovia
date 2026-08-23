import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AutonomyClient } from "../../workbench/src/ui/autonomy-client";
import { initializeHome } from "../../workbench/src/home";
import {
  PRINCIPAL_TASK_SEARCH_TEXT_FIELD_BYTE_CAP,
  PRINCIPAL_TASK_SEARCH_TEXT_MAX_BYTES,
} from "../../workbench/src/ui/work-items";
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

async function mutateTask(
  handler: ReturnType<typeof createWorkbenchRequestHandler>,
  origin: string,
  taskId: string,
  body: Record<string, unknown>,
): Promise<Record<string, any>> {
  const response = await post(
    handler,
    origin,
    `/api/tasks/${encodeURIComponent(taskId)}/actions`,
    body,
  );
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
    // The open Agent-owned Tasks created above are independent (no project
    // binding), so the explainable agent-eligible partition counts them all
    // as orphaned history — none awaits Agent takeover, and the counts are
    // served on both the compact and full routes with their source ref.
    expect(compact.workItems.capabilities.agentEligibility).toMatchObject({
      standing: "available",
      eligibleCount: 0,
      orphanedCount: 2,
    });
    expect(typeof compact.workItems.capabilities.agentEligibility.sourceRef)
      .toBe("string");
    expect(full.workItems.capabilities.agentEligibility).toEqual(
      compact.workItems.capabilities.agentEligibility,
    );
    // Every principal-task shell carries the explainable triage (orphaned
    // with its reason) while remaining locatable by id.
    expect(compactItems.every((item: any) =>
      item.agentEligibility?.standing === "orphaned"
      && item.agentEligibility?.reason === "no-project-binding"
      && typeof item.id === "string"
    )).toBeTrue();
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

  test("the compact search text bounds to the current correction and result claim while the detail route re-reads the full history", async () => {
    const { handler, origin } = fixture();
    const created = await createTask(handler, origin, 0);
    const taskId = created.taskId;
    const historicalCorrection =
      "HISTORICAL-CORRECTION: superseded guidance that must never enter the first screen";
    const historicalClaim =
      "HISTORICAL-CLAIM: superseded result summary that must never enter the first screen";
    const currentCorrection =
      "CURRENT-CORRECTION: the only guidance the first screen needs";
    const currentClaim =
      "CURRENT-CLAIM: the only result the first screen needs";

    let sourceRevision = 1;
    let taskRevision = 1;
    const correct = async (statement: string) => {
      const body = await mutateTask(handler, origin, taskId, {
        kind: "correct",
        statement,
        nextActor: "agent",
        expectedSourceRevision: sourceRevision,
        expectedRevision: taskRevision,
      });
      sourceRevision = body.result.sourceRevision as number;
      taskRevision = body.result.task.revision as number;
    };
    const submit = async (summary: string) => {
      const body = await mutateTask(handler, origin, taskId, {
        kind: "submit",
        summary,
        evidenceRefs: ["test:compact-history"],
        expectedSourceRevision: sourceRevision,
        expectedRevision: taskRevision,
      });
      sourceRevision = body.result.sourceRevision as number;
      taskRevision = body.result.task.revision as number;
    };
    const accept = async () => {
      const body = await mutateTask(handler, origin, taskId, {
        kind: "accept",
        expectedSourceRevision: sourceRevision,
        expectedRevision: taskRevision,
      });
      sourceRevision = body.result.sourceRevision as number;
      taskRevision = body.result.task.revision as number;
    };
    const reopen = async (statement: string) => {
      const body = await mutateTask(handler, origin, taskId, {
        kind: "reopen",
        statement,
        nextActor: "agent",
        expectedSourceRevision: sourceRevision,
        expectedRevision: taskRevision,
      });
      sourceRevision = body.result.sourceRevision as number;
      taskRevision = body.result.task.revision as number;
    };

    // One full history cycle: a superseded correction and claim, then the
    // current correction and claim that the first screen must still see.
    await correct(historicalCorrection);
    await submit(historicalClaim);
    await accept();
    await reopen(currentCorrection);
    await submit(currentClaim);

    const compact = await compactSnapshot(handler, origin);
    const full = await fullSnapshot(handler, origin);
    const compactItem = compact.workItems.items.find(
      (candidate: { id: string }) => candidate.id === `principal-task:${taskId}`,
    );
    const fullItem = full.workItems.items.find(
      (candidate: { id: string }) => candidate.id === `principal-task:${taskId}`,
    );
    expect(compactItem.taskDetail).toBeUndefined();
    // The compact mirror keeps only the decision-relevant current text; the
    // historical correction/claim text never enters the first screen.
    expect(compactItem.searchText).toContain(currentCorrection);
    expect(compactItem.searchText).toContain(currentClaim);
    expect(compactItem.searchText).not.toContain(historicalCorrection);
    expect(compactItem.searchText).not.toContain(historicalClaim);
    // The bounded field stays identical on both routes, so the locator
    // surface is exactly the same whether the item came from the compact
    // snapshot or from the on-demand detail body.
    expect(compactItem.searchText).toBe(fullItem.searchText);

    // The selected-item detail route still re-reads the complete canonical
    // history: every retained correction and result claim is returned in
    // full, and its own shell mirrors the identical bounded search text.
    const detailBody = await (
      await handler(new Request(`${origin}/api/tasks/${encodeURIComponent(taskId)}/detail`))
    ).json();
    const detail = detailBody.workItem.taskDetail;
    expect(detail.task.corrections.map(
      (correction: { statement: string }) => correction.statement,
    )).toEqual([historicalCorrection, currentCorrection]);
    expect(detail.task.resultClaims.map(
      (claim: { summary: string }) => claim.summary,
    )).toEqual([historicalClaim, currentClaim]);
    expect(detailBody.workItem.searchText).toBe(compactItem.searchText);
    // The compact mirror is strictly smaller than the complete-history text
    // the detail source retains, so the first screen stops carrying what the
    // selection flow can re-read on demand.
    const historicalMirror = [
      detail.task.objective,
      ...detail.task.acceptance,
      ...detail.task.todos,
      ...detail.task.corrections.map((correction: { statement: string }) => correction.statement),
      ...detail.task.resultClaims.map((claim: { summary: string }) => claim.summary),
    ].filter((value: string) => value !== "").join(" ");
    expect(historicalMirror.length).toBeGreaterThan(compactItem.searchText.length);
  });

  test("a very long current correction and claim stay inside the provable search mirror bound while the detail route returns them verbatim", async () => {
    const { handler, origin } = fixture();
    const acceptance = Array.from({ length: 8 }, (_, index) =>
      `CRITERION-${index}-` + "acceptance detail ".repeat(30),
    );
    const createResponse = await post(handler, origin, "/api/tasks", {
      title: "Bounded search mirror fixture task",
      objective: "OBJ-HEAD " + "objective ".repeat(120) + " OBJ-TAIL",
      acceptance,
      nextActor: "agent",
      expectedSourceRevision: 0,
    });
    expect(createResponse.status).toBe(200);
    const taskId = ((await createResponse.json() as {
      result: { task: { id: string } };
    }).result.task.id);

    const currentCorrection =
      "CORR-HEAD " + "long guidance text ".repeat(2000) + " CORR-TAIL";
    const currentClaim =
      "CLAIM-HEAD " + "long claim text ".repeat(2000) + " CLAIM-TAIL";

    let sourceRevision = 1;
    let taskRevision = 1;
    const correct = async (statement: string) => {
      const body = await mutateTask(handler, origin, taskId, {
        kind: "correct",
        statement,
        nextActor: "agent",
        expectedSourceRevision: sourceRevision,
        expectedRevision: taskRevision,
      });
      sourceRevision = body.result.sourceRevision as number;
      taskRevision = body.result.task.revision as number;
    };
    const submit = async (summary: string) => {
      const body = await mutateTask(handler, origin, taskId, {
        kind: "submit",
        summary,
        evidenceRefs: ["test:compact-long"],
        expectedSourceRevision: sourceRevision,
        expectedRevision: taskRevision,
      });
      sourceRevision = body.result.sourceRevision as number;
      taskRevision = body.result.task.revision as number;
    };
    await correct(currentCorrection);
    await submit(currentClaim);

    const compact = await compactSnapshot(handler, origin);
    const full = await fullSnapshot(handler, origin);
    const compactItem = compact.workItems.items.find(
      (candidate: { id: string }) => candidate.id === `principal-task:${taskId}`,
    );
    const fullItem = full.workItems.items.find(
      (candidate: { id: string }) => candidate.id === `principal-task:${taskId}`,
    );
    expect(compactItem.taskDetail).toBeUndefined();
    const searchText = compactItem.searchText as string;
    const searchTextBytes = new TextEncoder().encode(searchText).byteLength;
    // The provable finite upper bound holds for the real served compact item.
    expect(searchTextBytes).toBeLessThanOrEqual(PRINCIPAL_TASK_SEARCH_TEXT_MAX_BYTES);
    // The first screen keeps the decision-relevant heads and the first three
    // acceptance criteria; the long tails and later criteria never enter it.
    expect(searchText).toContain("OBJ-HEAD");
    expect(searchText).not.toContain("OBJ-TAIL");
    expect(searchText).toContain("CRITERION-0-");
    expect(searchText).toContain("CRITERION-2-");
    expect(searchText).not.toContain("CRITERION-3-");
    expect(searchText).toContain("CORR-HEAD");
    expect(searchText).not.toContain("CORR-TAIL");
    expect(searchText).toContain("CLAIM-HEAD");
    expect(searchText).not.toContain("CLAIM-TAIL");
    // The bounded field stays identical on the compact and full routes.
    expect(fullItem.searchText).toBe(searchText);
    // The compact shell summary previews the current submitted claim (the
    // task is verifying) with the same finite UTF-8 budget, so the claim tail
    // never reaches the first screen through the summary field either; the
    // full route keeps the canonical claim verbatim in the shell summary.
    const compactSummary = compactItem.summary as string;
    expect(compactSummary).toContain("CLAIM-HEAD");
    expect(compactSummary).not.toContain("CLAIM-TAIL");
    expect(new TextEncoder().encode(compactSummary).byteLength)
      .toBeLessThanOrEqual(PRINCIPAL_TASK_SEARCH_TEXT_FIELD_BYTE_CAP);
    expect(fullItem.summary).toBe(currentClaim);

    // The selected-item detail route re-reads the complete current correction
    // and claim verbatim, with the full canonical acceptance list.
    const detailBody = await (
      await handler(new Request(`${origin}/api/tasks/${encodeURIComponent(taskId)}/detail`))
    ).json();
    const detail = detailBody.workItem.taskDetail;
    expect(detail.task.corrections.at(-1).statement).toBe(currentCorrection);
    expect(detail.task.resultClaims.at(-1).summary).toBe(currentClaim);
    expect(detail.task.acceptance).toHaveLength(acceptance.length);
    expect(detail.task.objective).toBe("OBJ-HEAD " + "objective ".repeat(120) + " OBJ-TAIL");
    // The compact body stays strictly smaller than the full body that also
    // carries the canonical Task payload, and the retained canonical texts
    // alone exceed the entire first-screen mirror bound.
    const compactBytes = new TextEncoder().encode(JSON.stringify(compact)).byteLength;
    const fullBytes = new TextEncoder().encode(JSON.stringify(full)).byteLength;
    expect(compactBytes).toBeLessThan(fullBytes);
    expect(new TextEncoder().encode(currentCorrection).byteLength)
      .toBeGreaterThan(PRINCIPAL_TASK_SEARCH_TEXT_MAX_BYTES);
    expect(new TextEncoder().encode(currentClaim).byteLength)
      .toBeGreaterThan(PRINCIPAL_TASK_SEARCH_TEXT_MAX_BYTES);
  });

  test("an unavailable task source fails closed: the compact snapshot stays readable and the detail route answers 404", async () => {
    const { home, origin, handler } = fixture();
    const created = await createTask(handler, origin, 0);
    rmSync(join(home, "state", "tasks.json"));

    const compact = await compactSnapshot(handler, origin);
    expect(compact.complete).toBeFalse();
    expect(compact.workItems.capabilities.independentTasks).toMatchObject({
      standing: "unavailable",
      count: null,
      sourceRevision: null,
    });
    expect(compact.workItems.capabilities.independentTasks.reason)
      .toContain("tasks.json");
    expect(compact.workItems.items.some(
      (item: { kind: string }) => item.kind === "principal-task",
    )).toBeFalse();
    expect(compact.attention.some(
      (item: { code: string }) => item.code === "source-error",
    )).toBeTrue();
    expect(compact.errors.some(
      (error: { scope: string }) => error.scope === "home",
    )).toBeTrue();

    // The canonical task still exists as an id only; without a readable
    // source the detail route must fail closed instead of faking a record.
    const missing = await handler(new Request(
      `${origin}/api/tasks/${encodeURIComponent(created.taskId)}/detail`,
    ));
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ error: "task-not-found" });
  });

  test("the compact snapshot defers the per-worktree dirty observation while the full route keeps it", async () => {
    const { root, home, origin } = fixture();
    // A registered Git project with one dirty primary worktree and one clean
    // linked worktree exercises exactly the per-worktree `git status` scans
    // the compact first paint must not pay for.
    const repository = join(root, "repository");
    const repositoryRemote = "https://example.test/lidessen/compact.git";
    mkdirSync(repository, { recursive: true });
    const gitRun = (cwd: string, ...arguments_: string[]): string => {
      const result = Bun.spawnSync(["git", ...arguments_], {
        cwd,
        stdout: "pipe",
        stderr: "pipe",
      });
      if (result.exitCode !== 0) throw new Error(result.stderr.toString());
      return result.stdout.toString().trim();
    };
    gitRun(repository, "init", "-b", "main");
    gitRun(repository, "config", "user.name", "Compact Snapshot Test");
    gitRun(repository, "config", "user.email", "compact-snapshot@example.test");
    gitRun(repository, "remote", "add", "origin", repositoryRemote);
    writeFileSync(join(repository, "README.md"), "# Fixture\n");
    gitRun(repository, "add", "README.md");
    gitRun(repository, "commit", "-m", "initial");
    writeFileSync(join(repository, "UNCOMMITTED.md"), "visible dirt\n");
    const linked = join(root, "linked-worktree");
    gitRun(repository, "worktree", "add", "-b", "linked", linked);
    mkdirSync(join(home, "config"), { recursive: true });
    mkdirSync(join(home, "state"), { recursive: true });
    writeFileSync(join(home, "config", "projects.json"), JSON.stringify({
      version: "rosso.projects.v1",
      projects: [{
        id: "repository:compact",
        repository: repositoryRemote,
        aliases: ["compact"],
      }],
    }));
    writeFileSync(join(home, "state", "workspaces.json"), JSON.stringify({
      version: "rosso.workspaces.v1",
      workspaces: [{ projectId: "repository:compact", path: repository }],
    }));
    const handler = createWorkbenchRequestHandler({
      home,
      port: 4317,
      roots: [repository],
    }, {} as AutonomyClient);

    const compact = await compactSnapshot(handler, origin);
    expect(compact.complete).toBeTrue();
    const compactProject = compact.projects.find(
      (project: { projectKey: string }) =>
        project.projectKey === "registered:repository:compact",
    );
    expect(compactProject).toBeDefined();
    expect(compactProject.worktrees).toHaveLength(2);
    for (const worktree of compactProject.worktrees) {
      // The compact first paint never claims a dirty standing; every other
      // `git worktree list` fact (path/HEAD/branch/registeredPrimary) stays.
      expect(Object.prototype.hasOwnProperty.call(worktree, "dirty")).toBeFalse();
      expect(typeof worktree.path).toBe("string");
      expect(worktree.head).toMatch(/^[0-9a-f]{40}$/u);
      expect(["main", "linked"]).toContain(worktree.gitBranch);
    }

    const full = await fullSnapshot(handler, origin);
    expect(full.complete).toBeTrue();
    const fullProject = full.projects.find(
      (project: { projectKey: string }) =>
        project.projectKey === "registered:repository:compact",
    );
    expect(fullProject.worktrees).toHaveLength(2);
    const fullPrimary = fullProject.worktrees.find(
      (worktree: { path: string }) => worktree.path === realpathSync(repository),
    );
    const fullLinked = fullProject.worktrees.find(
      (worktree: { path: string }) => worktree.path === realpathSync(linked),
    );
    // The full snapshot keeps the exact dirty facts the compact body
    // deferred: primary dirty, linked clean, primary registration exact.
    expect(fullPrimary.dirty).toBeTrue();
    expect(fullLinked.dirty).toBeFalse();
    expect(fullPrimary.registeredPrimary).toBeTrue();
    expect(fullLinked.registeredPrimary).toBeFalse();
  });
});
