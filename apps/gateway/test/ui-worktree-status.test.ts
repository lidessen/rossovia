import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AutonomyClient } from "../../workbench/src/ui/autonomy-client";
import { initializeHome } from "../../workbench/src/home";
import { createWorkbenchRequestHandler } from "../src/ui-server";
// @ts-expect-error app.js is the browser entrypoint; this test imports its pure projection copy.
import { projectWorktreeSummary, worktreeCreateOptionLabel, worktreeDirtyStanding } from "../ui/app.js";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

interface WorktreeStatusFixture {
  handler: ReturnType<typeof createWorkbenchRequestHandler>;
  home: string;
  origin: string;
  repository: string;
  linked: string;
  projectKey: string;
}

/**
 * One registered Git project with a dirty primary worktree and a clean
 * linked worktree exercises exactly the per-worktree `git status` scans the
 * compact first paint defers and the on-demand project route re-reads.
 */
function worktreeStatusFixture(): WorktreeStatusFixture {
  const root = mkdtempSync(join(tmpdir(), "rossovia-worktree-status-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  initializeHome(home);
  const repository = join(root, "repository");
  const repositoryRemote = "https://example.test/lidessen/worktree-status.git";
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
  gitRun(repository, "config", "user.name", "Worktree Status Test");
  gitRun(repository, "config", "user.email", "worktree-status@example.test");
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
      id: "repository:worktree-status",
      repository: repositoryRemote,
      aliases: ["worktree-status"],
    }],
  }));
  writeFileSync(join(home, "state", "workspaces.json"), JSON.stringify({
    version: "rosso.workspaces.v1",
    workspaces: [{ projectId: "repository:worktree-status", path: repository }],
  }));
  const handler = createWorkbenchRequestHandler({
    home,
    port: 4317,
    roots: [repository],
  }, {} as AutonomyClient);
  return {
    handler,
    home,
    origin: "http://127.0.0.1:4317",
    repository,
    linked,
    projectKey: "registered:repository:worktree-status",
  };
}

async function onDemandWorktrees(
  fixture: WorktreeStatusFixture,
): Promise<Record<string, any>> {
  const response = await fixture.handler(new Request(
    `${fixture.origin}/api/projects/${encodeURIComponent(fixture.projectKey)}/worktrees`,
  ));
  expect(response.status).toBe(200);
  return await response.json() as Record<string, any>;
}

async function compactSnapshot(
  fixture: WorktreeStatusFixture,
): Promise<Record<string, any>> {
  const response = await fixture.handler(new Request(`${fixture.origin}/api/snapshot?compact=1`));
  expect(response.status).toBe(200);
  return await response.json() as Record<string, any>;
}

async function fullSnapshot(
  fixture: WorktreeStatusFixture,
): Promise<Record<string, any>> {
  const response = await fixture.handler(new Request(`${fixture.origin}/api/snapshot`));
  expect(response.status).toBe(200);
  return await response.json() as Record<string, any>;
}

describe("project Worktree on-demand status read", () => {
  test("the compact first paint makes no dirty claim while the on-demand route re-reads the real dirty/clean", async () => {
    const fixture = worktreeStatusFixture();

    const compact = await compactSnapshot(fixture);
    expect(compact.complete).toBeTrue();
    expect(compact.errors).toEqual([]);
    const compactProject = compact.projects.find(
      (project: { projectKey: string }) => project.projectKey === fixture.projectKey,
    );
    expect(compactProject).toBeDefined();
    expect(compactProject.worktrees).toHaveLength(2);
    for (const worktree of compactProject.worktrees) {
      // The compact first paint never claims a dirty standing and never
      // carries a failed-read reason either: the scan simply did not run.
      expect(Object.prototype.hasOwnProperty.call(worktree, "dirty")).toBeFalse();
      expect(Object.prototype.hasOwnProperty.call(worktree, "dirtyReason")).toBeFalse();
      expect(typeof worktree.path).toBe("string");
      expect(worktree.head).toMatch(/^[0-9a-f]{40}$/u);
    }

    const onDemand = await onDemandWorktrees(fixture);
    expect(onDemand.standing).toBe("available");
    expect(onDemand.projectKey).toBe(fixture.projectKey);
    expect(onDemand.version).toBe("rosso.project-worktree-status.v1");
    expect(typeof onDemand.observedAt).toBe("string");
    expect(onDemand.errors).toEqual([]);
    expect(onDemand.worktrees).toHaveLength(2);
    expect(onDemand.summary).toEqual({ total: 2, dirty: 1, clean: 1, unknown: 0 });
    const primary = onDemand.worktrees.find(
      (worktree: { path: string }) => worktree.path === realpathSync(fixture.repository),
    );
    const linked = onDemand.worktrees.find(
      (worktree: { path: string }) => worktree.path === realpathSync(fixture.linked),
    );
    // The on-demand read re-reads the canonical full snapshot: real
    // dirty/clean, exact branch, HEAD, and the mainline (registeredPrimary)
    // marker.
    expect(primary).toMatchObject({
      gitBranch: "main",
      dirty: true,
      registeredPrimary: true,
    });
    expect(linked).toMatchObject({
      gitBranch: "linked",
      dirty: false,
      registeredPrimary: false,
    });
    expect(primary.head).toMatch(/^[0-9a-f]{40}$/u);
    expect(linked.head).toMatch(/^[0-9a-f]{40}$/u);
    expect(Object.prototype.hasOwnProperty.call(primary, "dirtyReason")).toBeFalse();
    expect(Object.prototype.hasOwnProperty.call(linked, "dirtyReason")).toBeFalse();
    // The route is minimal: the git observation source boundaries identify
    // where the facts were read.
    expect(onDemand.sourceRefs.some(
      (source: string) => source === realpathSync(fixture.repository),
    )).toBeTrue();
  });

  test("a failed dirty scan keeps the worktree observable as unknown and never infers clean", async () => {
    const fixture = worktreeStatusFixture();
    // Delete the linked worktree directory: `git status --porcelain` in it
    // now fails, which is exactly the per-worktree read failure the route
    // must fail closed on.
    rmSync(fixture.linked, { recursive: true, force: true });

    // The compact first paint still does not run the scan: it stays
    // complete and error-free even though the linked site is missing.
    const compact = await compactSnapshot(fixture);
    expect(compact.complete).toBeTrue();
    expect(compact.errors).toEqual([]);
    const compactProject = compact.projects.find(
      (project: { projectKey: string }) => project.projectKey === fixture.projectKey,
    );
    expect(compactProject.worktrees).toHaveLength(2);
    for (const worktree of compactProject.worktrees) {
      expect(Object.prototype.hasOwnProperty.call(worktree, "dirty")).toBeFalse();
      expect(Object.prototype.hasOwnProperty.call(worktree, "dirtyReason")).toBeFalse();
    }

    const onDemand = await onDemandWorktrees(fixture);
    expect(onDemand.standing).toBe("available");
    expect(onDemand.worktrees).toHaveLength(2);
    expect(onDemand.summary).toEqual({ total: 2, dirty: 1, clean: 0, unknown: 1 });
    const primary = onDemand.worktrees.find(
      (worktree: { path: string }) => worktree.path === realpathSync(fixture.repository),
    );
    const linked = onDemand.worktrees.find(
      (worktree: { gitBranch: string }) => worktree.gitBranch === "linked",
    );
    expect(primary.dirty).toBeTrue();
    // The failed scan is explicit unknown: dirty stays absent, dirtyReason
    // carries the attributable reason, and clean is never inferred.
    expect(linked).toBeDefined();
    expect(Object.prototype.hasOwnProperty.call(linked, "dirty")).toBeFalse();
    expect(typeof linked.dirtyReason).toBe("string");
    expect(linked.dirtyReason).toMatch(/not a git repository|No such file|cannot change|does not exist|failed/iu);
    expect(linked.gitBranch).toBe("linked");
    expect(linked.registeredPrimary).toBeFalse();
    expect(onDemand.errors.some(
      (error: { scope: string }) => error.scope === "git",
    )).toBeTrue();

    // The canonical full snapshot route has the same fail-closed semantics:
    // the failed worktree stays observable with its explicit unknown
    // standing instead of disappearing from the inventory.
    const full = await fullSnapshot(fixture);
    const fullProject = full.projects.find(
      (project: { projectKey: string }) => project.projectKey === fixture.projectKey,
    );
    expect(fullProject.worktrees).toHaveLength(2);
    const fullLinked = fullProject.worktrees.find(
      (worktree: { gitBranch: string }) => worktree.gitBranch === "linked",
    );
    expect(Object.prototype.hasOwnProperty.call(fullLinked, "dirty")).toBeFalse();
    expect(typeof fullLinked.dirtyReason).toBe("string");
    expect(full.complete).toBeFalse();
  });

  test("an unobserved project key fails closed without fabricating a project", async () => {
    const fixture = worktreeStatusFixture();
    const missing = await fixture.handler(new Request(
      `${fixture.origin}/api/projects/${encodeURIComponent("registered:missing")}/worktrees`,
    ));
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ error: "project-not-found" });
    const malformed = await fixture.handler(new Request(
      `${fixture.origin}/api/projects/${encodeURIComponent("")}/worktrees`,
    ));
    expect(malformed.status).toBe(404);
  });
});

describe("Worktree status presentation projection", () => {
  test("worktreeDirtyStanding reads only the projected fields and never turns unknown into clean", () => {
    expect(worktreeDirtyStanding({ dirty: true })).toEqual({
      code: "dirty",
      label: "dirty",
      detail: "有未提交改动",
    });
    expect(worktreeDirtyStanding({ dirty: false })).toEqual({
      code: "clean",
      label: "clean",
      detail: "工作区干净",
    });
    // Compact first paint: no scan ran, no dirty claim, no reason.
    expect(worktreeDirtyStanding({ path: "/sites/a" })).toEqual({
      code: "unknown",
      label: "unknown",
      detail: "状态未观察",
    });
    // Failed on-demand read: explicit unknown with the attributable reason.
    expect(worktreeDirtyStanding({ path: "/sites/a", dirtyReason: "git status failed" })).toEqual({
      code: "unknown",
      label: "unknown",
      detail: "读取失败 · 不推断 clean",
      reason: "git status failed",
    });
    expect(worktreeDirtyStanding(null)).toEqual({
      code: "unknown",
      label: "unknown",
      detail: "状态未观察",
    });
  });

  test("projectWorktreeSummary counts dirty/clean/unknown and never counts unknown as clean", () => {
    expect(projectWorktreeSummary([])).toEqual({ total: 0, dirty: 0, clean: 0, unknown: 0 });
    expect(projectWorktreeSummary([
      { dirty: true },
      { dirty: false },
      { dirty: false },
      { path: "/sites/a" },
      { dirtyReason: "read failed" },
    ])).toEqual({ total: 5, dirty: 1, clean: 2, unknown: 2 });
    expect(projectWorktreeSummary(null)).toEqual({ total: 0, dirty: 0, clean: 0, unknown: 0 });
  });

  test("worktreeCreateOptionLabel shows branch, HEAD, status, and the mainline marker; unknown never reads as clean", () => {
    expect(worktreeCreateOptionLabel({
      path: "/sites/a",
      gitBranch: "main",
      head: "0".repeat(40),
      dirty: false,
      registeredPrimary: true,
    })).toBe(`main @ ${"0".repeat(40)} · clean · 主线 · /sites/a`);
    expect(worktreeCreateOptionLabel({
      path: "/sites/b",
      gitBranch: "feature/x",
      head: "1".repeat(40),
      dirty: true,
      registeredPrimary: false,
    })).toBe(`feature/x @ ${"1".repeat(40)} · dirty · /sites/b`);
    const unknown = worktreeCreateOptionLabel({
      path: "/sites/c",
      gitBranch: "feature/y",
      head: "2".repeat(40),
      registeredPrimary: false,
    });
    expect(unknown).toBe(`feature/y @ ${"2".repeat(40)} · unknown · /sites/c`);
    expect(unknown).not.toContain("clean");
  });
});
