import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AutonomyClient } from "../../workbench/src/ui/autonomy-client";
import type { RunnerStatusProof } from "../../workbench/src/ui/actions";
import { initializeHome } from "../../workbench/src/home";
import { createWorkbenchRequestHandler } from "../src/ui-server";
// @ts-expect-error app.js is the browser entrypoint; this test imports its pure projection copy.
import { worktreeRetentionBoundaryNote, worktreeRetentionHint, worktreeRetentionHintCopy } from "../ui/app.js";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

interface RetentionFixture {
  handler: ReturnType<typeof createWorkbenchRequestHandler>;
  home: string;
  origin: string;
  repository: string;
  linked: string;
  head: string;
  projectKey: string;
}

/**
 * One registered Git project with a committed Mission record, a linked
 * worktree, one open and one verifying principal Task bound to the primary
 * worktree, one cached runner for the Mission, and a live-probe client whose
 * current effect workspace is the linked worktree. This exercises exactly
 * the bounded retention sources the on-demand route projects from.
 */
function retentionFixture(): RetentionFixture {
  const root = mkdtempSync(join(tmpdir(), "rossovia-worktree-retention-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  initializeHome(home);
  const repository = join(root, "repository");
  const repositoryRemote = "https://example.test/lidessen/worktree-retention.git";
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
  gitRun(repository, "config", "user.name", "Worktree Retention Test");
  gitRun(repository, "config", "user.email", "worktree-retention@example.test");
  gitRun(repository, "remote", "add", "origin", repositoryRemote);
  writeFileSync(join(repository, "README.md"), "# Fixture\n");
  mkdirSync(join(repository, "apps", "missions"), { recursive: true });
  const missionPath = join(repository, "apps", "missions", "retention-mission.json");
  writeFileSync(missionPath, `${JSON.stringify({
    version: "mission-record.v1",
    id: "retention-mission",
    title: "Retention mission",
    sources: ["apps/missions/retention-mission.json"],
    createdAt: "2026-08-23T00:00:00Z",
    updatedAt: "2026-08-23T00:00:00Z",
    mainline: {
      contradiction: "Worktree retention hints must be bounded and fail closed",
      acceptance: ["Retention hints display without implying delete"],
      status: "active",
    },
    branches: [],
    currentFocus: "mainline",
  }, null, 2)}\n`);
  gitRun(repository, "add", "README.md", "apps/missions/retention-mission.json");
  gitRun(repository, "commit", "-m", "initial with mission");
  const head = gitRun(repository, "rev-parse", "HEAD");
  const linked = join(root, "linked-worktree");
  gitRun(repository, "worktree", "add", "-b", "linked", linked);
  const primaryPath = realpathSync(repository);
  mkdirSync(join(home, "config"), { recursive: true });
  mkdirSync(join(home, "state"), { recursive: true });
  writeFileSync(join(home, "config", "projects.json"), JSON.stringify({
    version: "rosso.projects.v1",
    projects: [{
      id: "repository:worktree-retention",
      repository: repositoryRemote,
      aliases: ["worktree-retention"],
    }],
  }));
  writeFileSync(join(home, "state", "workspaces.json"), JSON.stringify({
    version: "rosso.workspaces.v1",
    workspaces: [{
      projectId: "repository:worktree-retention",
      path: repository,
    }],
  }));
  writeFileSync(join(home, "state", "tasks.json"), JSON.stringify({
    version: "rosso.principal-tasks.v1",
    sourceRevision: 2,
    tasks: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Open retention task",
        objective: "Bound open task objective",
        acceptance: ["Acceptance done"],
        todos: [],
        capabilitiesRequired: [],
        origin: { kind: "principal-explicit", sourceRef: "test:retention-open" },
        binding: {
          kind: "project-context",
          projectId: "repository:worktree-retention",
          worktreePath: primaryPath,
          missionId: "retention-mission",
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
        id: "22222222-2222-4222-8222-222222222222",
        title: "Verifying retention task",
        objective: "Bound verifying task objective",
        acceptance: ["Acceptance done"],
        todos: [],
        capabilitiesRequired: [],
        origin: { kind: "principal-explicit", sourceRef: "test:retention-verifying" },
        binding: {
          kind: "project-context",
          projectId: "repository:worktree-retention",
          worktreePath: primaryPath,
          missionId: "retention-mission",
        },
        lifecycle: "verifying",
        nextActor: "principal",
        revision: 1,
        corrections: [],
        resultClaims: [{
          id: "claim-retention-1",
          submittedAt: "2026-08-23T00:01:00Z",
          summary: "Verifying task result",
          evidenceRefs: ["test:retention-evidence"],
          evidence: { kind: "agent-references-unverified" },
          sourceRef: "test:retention-claim",
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
  const runnerDirectory = join(home, "missions", "runner-retention");
  mkdirSync(runnerDirectory, { recursive: true });
  writeFileSync(join(runnerDirectory, "runner-status.json"), `${JSON.stringify({
    version: "rosso.mission-runner.v1",
    runnerId: "runner-retention",
    missionId: "retention-mission",
    pid: 4242,
    state: "running",
    startedAt: "2026-08-23T00:00:00Z",
    updatedAt: "2026-08-23T00:00:00Z",
    inputWatermark: 0,
    reconciledWatermark: 0,
    socketPath: "/tmp/retention.sock",
    stopReason: null,
  }, null, 2)}\n`);
  const client = {
    status: async (missionId: string): Promise<RunnerStatusProof> => ({
      live: true,
      missionId,
      runnerId: "runner-retention",
      state: "running",
    }),
    activity: async (): Promise<unknown> => ({
      source: "mission-timeline",
      observedAt: "2026-08-23T00:00:00.000Z",
      eventCount: 0,
      intentLineage: { standing: "uninitialized", activeAnchor: null },
      anchorMigrationProposal: null,
      reconciliationAction: null,
      currentEffect: {
        effectId: "effect-retention",
        phase: "writing",
        writer: { cellId: "cell-retention", runId: "run-retention" },
        workspace: {
          root: realpathSync(linked),
          baseHead: head,
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
    }),
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
    head,
    projectKey: "registered:repository:worktree-retention",
  };
}

async function onDemandWorktrees(
  fixture: RetentionFixture,
): Promise<Record<string, any>> {
  const response = await fixture.handler(new Request(
    `${fixture.origin}/api/projects/${encodeURIComponent(fixture.projectKey)}/worktrees`,
  ));
  expect(response.status).toBe(200);
  return await response.json() as Record<string, any>;
}

describe("Worktree retention hint projection", () => {
  test("projects open/verifying Task binding counts, Mission observation-only, and the live effect runner marker per worktree", async () => {
    const fixture = retentionFixture();
    const body = await onDemandWorktrees(fixture);
    expect(body.standing).toBe("available");
    expect(body.worktrees).toHaveLength(2);
    const primary = body.worktrees.find(
      (worktree: { path: string }) => worktree.path === realpathSync(fixture.repository),
    );
    const linked = body.worktrees.find(
      (worktree: { path: string }) => worktree.path === realpathSync(fixture.linked),
    );
    expect(primary).toBeDefined();
    expect(linked).toBeDefined();
    // The primary worktree retains one open and one verifying bound Task
    // (from the available task source), observes the committed Mission only
    // (observation-only, never an execution binding), and has no live effect
    // runner — the live effect workspace is the linked worktree.
    expect(primary.retention).toEqual({
      taskBindings: { standing: "observed", open: 1, verifying: 1 },
      missionObservationOnly: true,
      liveEffectRunner: false,
    });
    // The linked worktree carries no bound open/verifying Task, no Mission
    // observation context, and the live-proven runner's current effect
    // workspace marker.
    expect(linked.retention).toEqual({
      taskBindings: { standing: "observed", open: 0, verifying: 0 },
      missionObservationOnly: false,
      liveEffectRunner: true,
    });
    // locked/prunable stay plain Git management marker pass-throughs: they
    // are never promoted to merged, deletable, or a delete action, and the
    // projection carries no delete surface at all.
    expect(primary.locked).toBeNull();
    expect(primary.prunable).toBeNull();
    for (const worktree of body.worktrees) {
      expect(Object.prototype.hasOwnProperty.call(worktree, "delete")).toBeFalse();
      expect(Object.prototype.hasOwnProperty.call(worktree, "deletable")).toBeFalse();
      expect(worktree.retention).toBeDefined();
    }
  });

  test("an unavailable task source fails closed to unknown bindings and the UI never pushes clean as deletable", async () => {
    const fixture = retentionFixture();
    rmSync(join(fixture.home, "state", "tasks.json"));

    const body = await onDemandWorktrees(fixture);
    expect(body.standing).toBe("available");
    // The task source cannot be read: every worktree's binding counts are
    // unknown with no count declaration, while the Mission observation-only
    // marker and the live effect runner marker (their own sources are still
    // readable) stay projected.
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
    expect(linked.retention.liveEffectRunner).toBeTrue();

    // The browser-side projection has the same fail-closed standing: an
    // unavailable task source declares no counts, and a clean worktree's
    // chips never read as deletable.
    const unavailable = worktreeRetentionHint(
      { path: "/sites/a", dirty: false },
      {
        workItems: [],
        taskSourceStanding: "unavailable",
        missions: [],
        errors: [],
        missionRoots: [],
        runners: [],
        projectKey: "registered:p",
      },
    );
    expect(unavailable.taskBindings).toEqual({ standing: "unknown" });
    expect(unavailable.missionObservationOnly).toBeFalse();
    expect(unavailable.liveEffectRunner).toBeNull();
    const chips = worktreeRetentionHintCopy(unavailable, { path: "/sites/a", dirty: false });
    expect(chips).toContain("任务绑定数未知");
    for (const chip of chips) {
      expect(chip).not.toContain("可删除");
      expect(chip).not.toContain("delete");
    }
    // The inventory-level boundary note states the marker semantics: locked/
    // prunable are Git management markers only and clean never implies
    // deletable.
    const note = worktreeRetentionBoundaryNote();
    expect(note).toContain("Git 管理标记");
    expect(note).toContain("不代表已合入、可删除或 delete action");
    expect(note).toContain("clean 不代表可安全删除");
  });

  test("the browser retention hint resolves bound counts, Mission observation-only, and live effect markers with unknown boundaries", () => {
    const workItems = [
      {
        kind: "principal-task",
        lifecycle: "open",
        worktreeContext: { path: "/sites/a", standing: "observed" },
      },
      {
        kind: "principal-task",
        lifecycle: "verifying",
        worktreeContext: { path: "/sites/a", standing: "observed" },
      },
      {
        kind: "principal-task",
        lifecycle: "open",
        worktreeContext: { path: "/sites/b", standing: "observed" },
      },
      {
        kind: "principal-task",
        lifecycle: "settled",
        worktreeContext: { path: "/sites/a", standing: "observed" },
      },
      {
        kind: "mission",
        lifecycle: "open",
        worktreeContext: { path: "/sites/a", relation: "mission-observed-here" },
      },
    ];
    const baseInput = {
      workItems,
      taskSourceStanding: "available",
      missions: [{
        observedGitContext: {
          worktreePath: "/sites/a",
          binding: "observation-only",
        },
      }],
      errors: [],
      missionRoots: ["/sites/a/apps/missions", "/sites/b/apps/missions"],
      runners: [],
      projectKey: "registered:p",
    };
    // Bound counts cover only open/verifying principal tasks of this exact
    // worktree; settled tasks, other worktrees, and non-task items never
    // count, so the task list number definitions stay untouched.
    const hint = worktreeRetentionHint({ path: "/sites/a" }, baseInput);
    expect(hint.taskBindings).toEqual({
      standing: "observed",
      open: 1,
      verifying: 1,
    });
    expect(hint.missionObservationOnly).toBeTrue();
    // A different worktree counts only its own bound open task and has no
    // Mission observation.
    const other = worktreeRetentionHint({ path: "/sites/b" }, baseInput);
    expect(other.taskBindings).toEqual({
      standing: "observed",
      open: 1,
      verifying: 0,
    });
    expect(other.missionObservationOnly).toBeFalse();
    // A failed Mission read (attributable mission-scope error under the
    // project's Mission root) declares no observation-only standing.
    const failedMission = worktreeRetentionHint({ path: "/sites/a" }, {
      ...baseInput,
      missions: [],
      errors: [{
        scope: "mission",
        source: "/sites/a/apps/missions/retention-mission.json",
        message: "read failed",
      }],
    });
    expect(failedMission.missionObservationOnly).toBeNull();

    // Live effect runner markers: true only for the exact live effect
    // workspace; false when a definitive live runner has no effect here; and
    // unknown when the probe could not verify reachability, when the record
    // carries no live standing, or when no project runner record exists.
    const liveRunner = {
      binding: { kind: "project-mission", projectKey: "registered:p", missionId: "m-1" },
      live: true,
      activity: {
        currentEffect: { workspace: { root: "/sites/a" } },
      },
    };
    const liveElsewhere = {
      binding: { kind: "project-mission", projectKey: "registered:p", missionId: "m-2" },
      live: true,
      activity: {
        currentEffect: { workspace: { root: "/sites/elsewhere" } },
      },
    };
    const unverifiedProbe = {
      binding: { kind: "project-mission", projectKey: "registered:p", missionId: "m-3" },
      live: null,
      activity: { currentEffect: { workspace: { root: "/sites/a" } } },
    };
    expect(worktreeRetentionHint({ path: "/sites/a" }, {
      ...baseInput,
      runners: [liveRunner],
    }).liveEffectRunner).toBeTrue();
    expect(worktreeRetentionHint({ path: "/sites/a" }, {
      ...baseInput,
      runners: [liveElsewhere],
    }).liveEffectRunner).toBeFalse();
    expect(worktreeRetentionHint({ path: "/sites/a" }, {
      ...baseInput,
      runners: [unverifiedProbe],
    }).liveEffectRunner).toBeNull();
    expect(worktreeRetentionHint({ path: "/sites/a" }, {
      ...baseInput,
      runners: [{ ...liveRunner, live: undefined }],
    }).liveEffectRunner).toBeNull();
    expect(worktreeRetentionHint({ path: "/sites/a" }, baseInput).liveEffectRunner)
      .toBeNull();

    // The chips are fixed labels only: the observed counts and the live
    // marker render; an unknown live standing and locked/prunable markers
    // render as management markers without a delete claim.
    const chips = worktreeRetentionHintCopy(hint, {
      path: "/sites/a",
      locked: "by test",
    });
    expect(chips).toContain("locked · Git 管理标记 · 不代表可删除");
    expect(chips).toContain("任务绑定 open 1 · verifying 1");
    expect(chips).toContain("Mission 仅观察");
    expect(chips).toContain("live effect runner 未知");
    expect(chips).not.toContain("prunable");
    const prunableChips = worktreeRetentionHintCopy(other, {
      path: "/sites/b",
      prunable: "prunable",
    });
    expect(prunableChips).toContain("prunable · Git 管理标记 · 不代表可删除");
    expect(prunableChips).toContain("任务绑定 open 1 · verifying 0");
  });
});
