import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AutonomyClient } from "../../workbench/src/ui/autonomy-client";
import type { RunnerStatusProof } from "../../workbench/src/ui/actions";
import { initializeHome } from "../../workbench/src/home";
import {
  buildWorktreeStatusSnapshot,
  createWorkbenchRequestHandler,
} from "../src/ui-server";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

interface ReducedReadFixture {
  handler: ReturnType<typeof createWorkbenchRequestHandler>;
  home: string;
  origin: string;
  repository: string;
  linked: string;
  projectKey: string;
  openTaskId: string;
  client: AutonomyClient;
}

/**
 * One registered Git project with a committed Mission record, a dirty
 * primary worktree, a clean linked worktree, one open and one verifying
 * principal Task bound to the primary worktree, a retained started attempt
 * for the open Task (full-detail-only evidence this route never reads), one
 * cached runner for the Mission with a live probe whose current effect
 * workspace is the linked worktree, and — with errorProbeRunner — a second
 * committed Mission whose live runner's activity probe is unavailable.
 */
function reducedReadFixture(
  options: { errorProbeRunner?: boolean } = {},
): ReducedReadFixture {
  const root = mkdtempSync(join(tmpdir(), "rossovia-worktree-reduced-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  initializeHome(home);
  const repository = join(root, "repository");
  const repositoryRemote = "https://example.test/lidessen/worktree-reduced.git";
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
  gitRun(repository, "config", "user.name", "Reduced Read Test");
  gitRun(repository, "config", "user.email", "reduced-read@example.test");
  gitRun(repository, "remote", "add", "origin", repositoryRemote);
  writeFileSync(join(repository, "README.md"), "# Fixture\n");
  mkdirSync(join(repository, "apps", "missions"), { recursive: true });
  const missionPath = join(repository, "apps", "missions", "reduced-mission.json");
  writeFileSync(missionPath, `${JSON.stringify({
    version: "mission-record.v1",
    id: "reduced-mission",
    title: "Reduced read mission",
    sources: ["apps/missions/reduced-mission.json"],
    createdAt: "2026-08-23T00:00:00Z",
    updatedAt: "2026-08-23T00:00:00Z",
    mainline: {
      contradiction: "The Worktree route must read only its projection's sources",
      acceptance: ["The route stops rebuilding the full live snapshot"],
      status: "active",
    },
    branches: [],
    currentFocus: "mainline",
  }, null, 2)}\n`);
  gitRun(repository, "add", "README.md", "apps/missions/reduced-mission.json");
  gitRun(repository, "commit", "-m", "initial with mission");
  // The primary worktree carries real uncommitted dirt so the on-demand
  // route's dirty observation has an exact dirty/clean pair to serve.
  writeFileSync(join(repository, "UNCOMMITTED.md"), "visible dirt\n");
  const linked = join(root, "linked-worktree");
  gitRun(repository, "worktree", "add", "-b", "linked", linked);
  if (options.errorProbeRunner === true) {
    writeFileSync(join(repository, "apps", "missions", "reduced-mission-error.json"), `${JSON.stringify({
      version: "mission-record.v1",
      id: "reduced-mission-error",
      title: "Reduced error-probe mission",
      sources: ["apps/missions/reduced-mission-error.json"],
      createdAt: "2026-08-23T00:00:00Z",
      updatedAt: "2026-08-23T00:00:00Z",
      mainline: {
        contradiction: "Unavailable activity probes must fail closed to unknown live markers",
        acceptance: ["The live marker stays unknown on an errored probe"],
        status: "active",
      },
      branches: [],
      currentFocus: "mainline",
    }, null, 2)}\n`);
    gitRun(repository, "add", "apps/missions/reduced-mission-error.json");
    gitRun(repository, "commit", "-m", "add error-probe mission");
    const errorRunnerDirectory = join(home, "missions", "runner-reduced-error");
    mkdirSync(errorRunnerDirectory, { recursive: true });
    writeFileSync(join(errorRunnerDirectory, "runner-status.json"), `${JSON.stringify({
      version: "rosso.mission-runner.v1",
      runnerId: "runner-reduced-error",
      missionId: "reduced-mission-error",
      pid: 4243,
      state: "running",
      startedAt: "2026-08-23T00:00:00Z",
      updatedAt: "2026-08-23T00:00:00Z",
      inputWatermark: 0,
      reconciledWatermark: 0,
      socketPath: "/tmp/reduced-error.sock",
      stopReason: null,
    }, null, 2)}\n`);
  }
  const openTaskId = "11111111-1111-4111-8111-111111111111";
  const verifyingTaskId = "22222222-2222-4222-8222-222222222222";
  const attemptId = "33333333-3333-4333-8333-333333333333";
  mkdirSync(join(home, "config"), { recursive: true });
  mkdirSync(join(home, "state"), { recursive: true });
  writeFileSync(join(home, "config", "projects.json"), JSON.stringify({
    version: "rosso.projects.v1",
    projects: [{
      id: "repository:worktree-reduced",
      repository: repositoryRemote,
      aliases: ["worktree-reduced"],
    }],
  }));
  writeFileSync(join(home, "state", "workspaces.json"), JSON.stringify({
    version: "rosso.workspaces.v1",
    workspaces: [{
      projectId: "repository:worktree-reduced",
      path: repository,
    }],
  }));
  const primaryPath = realpathSync(repository);
  writeFileSync(join(home, "state", "tasks.json"), JSON.stringify({
    version: "rosso.principal-tasks.v1",
    sourceRevision: 2,
    tasks: [
      {
        id: openTaskId,
        title: "Open reduced task",
        objective: "Bound open task objective",
        acceptance: ["Acceptance done"],
        todos: [],
        capabilitiesRequired: [],
        origin: { kind: "principal-explicit", sourceRef: "test:reduced-open" },
        binding: {
          kind: "project-context",
          projectId: "repository:worktree-reduced",
          worktreePath: primaryPath,
          missionId: "reduced-mission",
        },
        lifecycle: "open",
        nextActor: "agent",
        revision: 1,
        corrections: [],
        resultClaims: [],
        executionLinks: [],
        worktreeRebindings: [],
        createdAt: "2026-08-23T00:00:00Z",
        updatedAt: "2026-08-23T00:00:00Z",
      },
      {
        id: verifyingTaskId,
        title: "Verifying reduced task",
        objective: "Bound verifying task objective",
        acceptance: ["Acceptance done"],
        todos: [],
        capabilitiesRequired: [],
        origin: { kind: "principal-explicit", sourceRef: "test:reduced-verifying" },
        binding: {
          kind: "project-context",
          projectId: "repository:worktree-reduced",
          worktreePath: primaryPath,
          missionId: "reduced-mission",
        },
        lifecycle: "verifying",
        nextActor: "principal",
        revision: 1,
        corrections: [],
        resultClaims: [{
          id: "claim-reduced-1",
          submittedAt: "2026-08-23T00:01:00Z",
          summary: "Verifying task result",
          evidenceRefs: ["test:reduced-evidence"],
          evidence: { kind: "agent-references-unverified" },
          sourceRef: "test:reduced-claim",
          standing: "submitted",
          reviews: [],
          resolution: null,
        }],
        executionLinks: [],
        worktreeRebindings: [],
        createdAt: "2026-08-23T00:00:00Z",
        updatedAt: "2026-08-23T00:01:00Z",
      },
    ],
  }, null, 2));
  // Full-detail-only evidence the Worktree route must never read: a retained
  // started attempt for the open Task (immutable attempt record, no
  // settlement/final yet). The full snapshot and task-detail routes read it;
  // the reduced Worktree build serves its shells from the task source alone.
  const attemptDirectory = join(home, "state", "task-attempts", attemptId);
  mkdirSync(attemptDirectory, { recursive: true });
  writeFileSync(join(attemptDirectory, "attempt.json"), `${JSON.stringify({
    version: "rosso.task-run-attempt.v1",
    taskId: openTaskId,
    taskRevision: 1,
    sourceRevision: 2,
    attemptId,
    inputRef: `state/task-attempts/${attemptId}/cell-input.json`,
    finalRecordRef: `state/task-attempts/${attemptId}/cell-input.run.json`,
    driver: "opencode-cli",
    model: "opencode-go/kimi-k2.7-code",
    status: "started",
    startedAt: "2026-08-23T00:00:00Z",
  }, null, 2)}\n`);
  const runnerDirectory = join(home, "missions", "runner-reduced");
  mkdirSync(runnerDirectory, { recursive: true });
  writeFileSync(join(runnerDirectory, "runner-status.json"), `${JSON.stringify({
    version: "rosso.mission-runner.v1",
    runnerId: "runner-reduced",
    missionId: "reduced-mission",
    pid: 4242,
    state: "running",
    startedAt: "2026-08-23T00:00:00Z",
    updatedAt: "2026-08-23T00:00:00Z",
    inputWatermark: 0,
    reconciledWatermark: 0,
    socketPath: "/tmp/reduced.sock",
    stopReason: null,
  }, null, 2)}\n`);
  const client = {
    status: async (missionId: string): Promise<RunnerStatusProof> => ({
      live: true,
      missionId,
      runnerId: missionId === "reduced-mission-error"
        ? "runner-reduced-error"
        : "runner-reduced",
      state: "running",
    }),
    activity: async (missionId: string): Promise<unknown> => {
      if (options.errorProbeRunner === true && missionId === "reduced-mission-error") {
        // The unavailable activity fallback: the live status probe answers
        // (live === true) but the activity probe reports an error with no
        // current effect, so the retention marker must stay unknown.
        return {
          source: "mission-timeline",
          observedAt: "2026-08-23T00:00:00.000Z",
          eventCount: 0,
          intentLineage: {
            standing: "unavailable",
            reason: "activity read failed",
            activeAnchor: null,
          },
          anchorMigrationProposal: null,
          reconciliationAction: null,
          currentEffect: null,
          currentCorrection: null,
          recentCorrections: [],
          currentTurn: null,
          lastEvent: null,
          recentEvents: [],
          error: "activity read failed",
        };
      }
      return {
        source: "mission-timeline",
        observedAt: "2026-08-23T00:00:00.000Z",
        eventCount: 0,
        intentLineage: { standing: "uninitialized", activeAnchor: null },
        anchorMigrationProposal: null,
        reconciliationAction: null,
        currentEffect: {
          effectId: "effect-reduced",
          phase: "writing",
          writer: { cellId: "cell-reduced", runId: "run-reduced" },
          workspace: {
            root: realpathSync(linked),
            baseHead: gitRun(repository, "rev-parse", "HEAD"),
            baselineClean: false,
          },
          scope: { writePaths: ["README.md"], allowedCommands: ["edit_file"] },
          currentTool: null,
          recentTools: [],
          diff: {
            changed: [],
            added: [],
            removed: [],
            patchRef: null,
            patchDigest: null,
            outsideScope: [],
          },
          verification: { mechanical: null, independent: null, principal: null },
          authority: { commit: "withheld", merge: "withheld", publish: "withheld" },
          stale: false,
          uncertain: false,
        },
        currentCorrection: null,
        recentCorrections: [],
        currentTurn: null,
        lastEvent: null,
        recentEvents: [],
      };
    },
  } as unknown as AutonomyClient;
  const handler = createWorkbenchRequestHandler({
    home,
    port: 4317,
    roots: [repository],
  }, client);
  return {
    handler,
    home,
    origin: "http://127.0.0.1:4317",
    repository,
    linked,
    projectKey: "registered:repository:worktree-reduced",
    openTaskId,
    client,
  };
}

async function onDemandWorktrees(
  fixture: ReducedReadFixture,
): Promise<Record<string, any>> {
  const response = await fixture.handler(new Request(
    `${fixture.origin}/api/projects/${encodeURIComponent(fixture.projectKey)}/worktrees`,
  ));
  expect(response.status).toBe(200);
  return await response.json() as Record<string, any>;
}

async function compactSnapshot(
  fixture: ReducedReadFixture,
): Promise<Record<string, any>> {
  const response = await fixture.handler(new Request(`${fixture.origin}/api/snapshot?compact=1`));
  expect(response.status).toBe(200);
  return await response.json() as Record<string, any>;
}

async function fullSnapshot(
  fixture: ReducedReadFixture,
): Promise<Record<string, any>> {
  const response = await fixture.handler(new Request(`${fixture.origin}/api/snapshot`));
  expect(response.status).toBe(200);
  return await response.json() as Record<string, any>;
}

describe("the on-demand Worktree route reads only its projection's sources", () => {
  test("duplicate requests share one reduced observation and the build never carries full-detail-only sources", async () => {
    const fixture = reducedReadFixture();
    // The fixture retains a started attempt for the open Task and a live
    // probe client: the full-detail path would read the attempt evidence
    // and the full snapshot reads it; the reduced Worktree build must not.
    const snapshot = await buildWorktreeStatusSnapshot({
      home: fixture.home,
      port: 4317,
      roots: [fixture.repository],
    }, fixture.client);
    // The full-detail-only sources are absent from the route's build: no
    // observer review projection, no settings, no per-task attempt
    // projections, and no taskDetail payloads on the principal-task shells.
    expect(Object.prototype.hasOwnProperty.call(snapshot, "observerReviews")).toBeFalse();
    expect(Object.prototype.hasOwnProperty.call(snapshot, "settings")).toBeFalse();
    const taskItems = snapshot.workItems.items.filter(
      (item: { kind: string }) => item.kind === "principal-task",
    );
    expect(taskItems).toHaveLength(2);
    for (const item of taskItems) {
      expect(item.taskDetail).toBeUndefined();
    }
    expect(snapshot.workItems.capabilities.independentTasks).toMatchObject({
      standing: "available",
    });

    // Duplicate concurrent requests share the one serialized reduced build:
    // both responses describe the exact same single observation.
    const [first, second] = await Promise.all([
      onDemandWorktrees(fixture),
      onDemandWorktrees(fixture),
    ]);
    expect(first.standing).toBe("available");
    expect(first.observedAt).toBe(second.observedAt);
    expect(first.worktrees).toEqual(second.worktrees);
    expect(first.summary).toEqual(second.summary);
    expect(first.errors).toEqual(second.errors);

    // The projection the route serves is exactly the canonical full-snapshot
    // projection of the same sources: same worktree records with the real
    // dirty/clean standing, same summary, same retention hints.
    const full = await fullSnapshot(fixture);
    const fullProject = full.projects.find(
      (project: { projectKey: string }) => project.projectKey === fixture.projectKey,
    );
    const canonicalWorktrees = fullProject.worktrees.map((worktree: Record<string, any>) => ({
      path: worktree.path,
      head: worktree.head,
      gitBranch: worktree.gitBranch,
      registeredPrimary: worktree.registeredPrimary,
      locked: worktree.locked,
      prunable: worktree.prunable,
      ...(Object.prototype.hasOwnProperty.call(worktree, "dirty")
        ? { dirty: worktree.dirty }
        : {}),
      ...(worktree.dirtyReason === undefined ? {} : { dirtyReason: worktree.dirtyReason }),
    }));
    const observedWorktrees = first.worktrees.map((worktree: Record<string, any>) => {
      const { retention: _retention, ...rest } = worktree;
      return rest;
    });
    expect(observedWorktrees).toEqual(canonicalWorktrees);
    expect(first.summary).toEqual({ total: 2, dirty: 1, clean: 1, unknown: 0 });
    expect(first.errors).toEqual([]);
    const primary = first.worktrees.find(
      (worktree: { path: string }) => worktree.path === realpathSync(fixture.repository),
    );
    const linked = first.worktrees.find(
      (worktree: { path: string }) => worktree.path === realpathSync(fixture.linked),
    );
    expect(primary.retention).toEqual({
      taskBindings: { standing: "observed", open: 1, verifying: 1 },
      missionObservationOnly: true,
      liveEffectRunner: false,
    });
    expect(linked.retention).toEqual({
      taskBindings: { standing: "observed", open: 0, verifying: 0 },
      missionObservationOnly: false,
      liveEffectRunner: true,
    });
  });

  test("unavailable task source, an errored activity probe, and corrupt attempt evidence fail closed with exact retention standing and one shared observation", async () => {
    const fixture = reducedReadFixture({ errorProbeRunner: true });
    // Full-detail-only sources fail: the task source is removed, the
    // retained attempt evidence is corrupted, and the second live runner's
    // activity probe is unavailable. The route never reads those sources,
    // so its fail-closed standing and retention hints stay exact.
    rmSync(join(fixture.home, "state", "tasks.json"));
    const attemptDirectory = join(
      fixture.home,
      "state",
      "task-attempts",
      "33333333-3333-4333-8333-333333333333",
    );
    writeFileSync(join(attemptDirectory, "attempt.json"), "{ not json\n");

    const body = await onDemandWorktrees(fixture);
    expect(body.standing).toBe("available");
    expect(body.summary).toEqual({ total: 2, dirty: 1, clean: 1, unknown: 0 });
    // The unavailable task source fails closed to unknown binding counts
    // with no count declaration; the Mission observation-only marker (its
    // source is still readable) stays projected.
    for (const worktree of body.worktrees) {
      expect(worktree.retention.taskBindings).toEqual({ standing: "unknown" });
      expect(Object.prototype.hasOwnProperty.call(
        worktree.retention.taskBindings,
        "open",
      )).toBeFalse();
    }
    const primary = body.worktrees.find(
      (worktree: { path: string }) => worktree.path === realpathSync(fixture.repository),
    );
    const linked = body.worktrees.find(
      (worktree: { path: string }) => worktree.path === realpathSync(fixture.linked),
    );
    expect(primary.retention.missionObservationOnly).toBeTrue();
    // A second live-proven runner's activity probe is unavailable: the live
    // effect runner marker fails closed to unknown for every worktree — a
    // missing probe never reads as "no live effect".
    expect(primary.retention.liveEffectRunner).toBeNull();
    expect(linked.retention.liveEffectRunner).toBeNull();

    // The reduced build behind the failed sources still carries no
    // full-detail-only projection, and concurrent duplicate requests share
    // the same failed-source observation.
    const snapshot = await buildWorktreeStatusSnapshot({
      home: fixture.home,
      port: 4317,
      roots: [fixture.repository],
    }, fixture.client);
    expect(Object.prototype.hasOwnProperty.call(snapshot, "observerReviews")).toBeFalse();
    expect(Object.prototype.hasOwnProperty.call(snapshot, "settings")).toBeFalse();
    expect(snapshot.workItems.items.some(
      (item: { kind: string }) => item.kind === "principal-task",
    )).toBeFalse();
    expect(snapshot.workItems.capabilities.independentTasks.standing).toBe("unavailable");
    const [first, second] = await Promise.all([
      onDemandWorktrees(fixture),
      onDemandWorktrees(fixture),
    ]);
    expect(first.observedAt).toBe(second.observedAt);
    expect(first.worktrees).toEqual(second.worktrees);
    expect(first.summary).toEqual(second.summary);
    expect(first.errors).toEqual(second.errors);
  });

  test("the compact first paint stays dirty-free and shell-identical across a Worktree route request", async () => {
    const fixture = reducedReadFixture();
    const before = await compactSnapshot(fixture);
    for (const project of before.projects) {
      for (const worktree of project.worktrees) {
        expect(Object.prototype.hasOwnProperty.call(worktree, "dirty")).toBeFalse();
        expect(Object.prototype.hasOwnProperty.call(worktree, "dirtyReason")).toBeFalse();
      }
    }
    const beforeProject = before.projects.find(
      (project: { projectKey: string }) => project.projectKey === fixture.projectKey,
    );

    // The on-demand route reads the real dirty/clean the compact defers.
    const onDemand = await onDemandWorktrees(fixture);
    expect(onDemand.summary).toEqual({ total: 2, dirty: 1, clean: 1, unknown: 0 });
    const primary = onDemand.worktrees.find(
      (worktree: { path: string }) => worktree.path === realpathSync(fixture.repository),
    );
    const linked = onDemand.worktrees.find(
      (worktree: { path: string }) => worktree.path === realpathSync(fixture.linked),
    );
    expect(primary.dirty).toBeTrue();
    expect(linked.dirty).toBeFalse();

    // A second compact first paint after the route request is unchanged:
    // still no dirty claim anywhere, identical worktree identity, and
    // identical principal-task shells (modulo the per-build observedAt).
    const after = await compactSnapshot(fixture);
    expect(after.complete).toBeTrue();
    expect(after.errors).toEqual([]);
    const afterProject = after.projects.find(
      (project: { projectKey: string }) => project.projectKey === fixture.projectKey,
    );
    expect(afterProject.worktrees).toEqual(beforeProject.worktrees);
    for (const project of after.projects) {
      for (const worktree of project.worktrees) {
        expect(Object.prototype.hasOwnProperty.call(worktree, "dirty")).toBeFalse();
        expect(Object.prototype.hasOwnProperty.call(worktree, "dirtyReason")).toBeFalse();
      }
    }
    const shellOf = (item: Record<string, unknown>) => {
      const { taskDetail: _taskDetail, ...shell } = JSON.parse(JSON.stringify(item));
      if (shell.evidence?.freshness && typeof shell.evidence.freshness === "object") {
        delete (shell.evidence.freshness as Record<string, unknown>).observedAt;
      }
      return shell;
    };
    const shellsOf = (snapshot: Record<string, any>) => snapshot.workItems.items
      .filter((item: { kind: string }) => item.kind === "principal-task")
      .map(shellOf);
    expect(shellsOf(after)).toEqual(shellsOf(before));
    expect(after.workItems.capabilities.independentTasks).toEqual(
      before.workItems.capabilities.independentTasks,
    );
  });
});
