import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CellRunRecord } from "../../../packages/work-cell/src/contracts";
import {
  admitPreparedDelegateBatch,
  type DelegateBatchRun,
  type PreparedDelegateBatch,
} from "../src/delegate-admission";
import type { DelegateBatchCheckpoint } from "../src/delegate-loop";
import { FileMissionTimeline } from "../src/delegate-timeline";
import { FileEffectJournal } from "../src/effect-journal";
import { IsolatedGitEffectObserver } from "../src/git-effect-observer";
import { projectMissionActivity } from "../src/mission-activity";
import { missionRunnerDirectory } from "../src/mission-runner";
import { MISSION_TURN_VERSION } from "../src/mission-turn";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("an isolated writer retains lease, tool, patch, hash manifest, and withheld authority evidence", async () => {
  const fixture = await gitWorktree();
  const home = join(fixture.root, "rosso-home");
  const runnerRoot = missionRunnerDirectory(home, "blog-mission");
  const observer = new IsolatedGitEffectObserver({
    missionId: "blog-mission",
    journalRoot: runnerRoot,
    leaseRoot: home,
  });
  const checkpoint = writableCheckpoint(fixture.worktree, "effect-1");

  const timeline = new FileMissionTimeline(runnerRoot);
  await timeline.startTurn("blog-mission", {
    version: MISSION_TURN_VERSION,
    turnId: checkpoint.parentLoopId,
    baselineWatermark: 0,
    sourceRefs: ["mission:test"],
  });
  await timeline.prepareBatch(checkpoint);
  await observer.prepare(checkpoint);
  await observer.start(checkpoint);
  observer.trace(checkpoint, {
    at: "2026-07-26T12:00:00.000Z",
    type: "cell.started",
    data: { runId: "run-1", cellId: "blog-writer" },
  });
  observer.trace(checkpoint, {
    at: "2026-07-26T12:00:01.000Z",
    type: "agent.tool.started",
    data: {
      id: "write-1",
      name: "write_file",
      target: { kind: "workspace-path", path: "src/article.ts" },
    },
  });
  await mkdir(join(fixture.worktree, "src"), { recursive: true });
  await writeFile(join(fixture.worktree, "src/article.ts"), "export const thesis = 'source first';\n", "utf8");
  observer.trace(checkpoint, {
    at: "2026-07-26T12:00:02.000Z",
    type: "agent.tool.finished",
    data: { id: "write-1", name: "write_file", outcome: "output" },
  });
  await observer.settle(checkpoint, directRun(checkpoint, {
    added: ["src/article.ts"],
    changed: [],
    removed: [],
  }));

  const activity = await observer.activity("effect-1");
  expect(activity).toMatchObject({
    state: "settled",
    runId: "run-1",
    prepared: {
      missionId: "blog-mission",
      cellId: "blog-writer",
      writePaths: ["src"],
      allowedCommands: [],
      authority: "withheld",
    },
    settlement: {
      changedPaths: ["src/article.ts"],
      outsideScope: { verdict: "clear", paths: [] },
      acceptance: {
        mechanical: { verdict: "passed" },
        independent: { verdict: "not-run" },
        principal: { verdict: "withheld" },
      },
    },
  });
  const patchRef = activity?.settlement?.patch.ref;
  expect(patchRef).toBeString();
  const patch = await readFile(join(runnerRoot, patchRef!), "utf8");
  expect(patch).toContain("source first");
  const manifestRef = activity?.settlement?.acceptance.mechanical.evidenceRefs
    .find((ref) => ref.startsWith("file:"))?.slice("file:".length);
  const manifest = JSON.parse(await readFile(join(runnerRoot, manifestRef!), "utf8")) as {
    files: Array<{ beforeSha256: string | null; afterSha256: string | null }>;
    authority: Record<string, string>;
  };
  expect(manifest.files[0]).toMatchObject({ beforeSha256: null });
  expect(manifest.files[0]?.afterSha256).toMatch(/^[a-f0-9]{64}$/);
  expect(manifest.authority).toEqual({
    commit: "withheld",
    merge: "withheld",
    publish: "withheld",
  });
  expect(await readdir(join(home, "effect-leases"))).toEqual([]);
  expect((await projectMissionActivity(home, "blog-mission")).currentEffect).toMatchObject({
    effectId: "effect-1",
    phase: "settled",
    writer: { cellId: "blog-writer", runId: "run-1" },
    scope: { writePaths: ["src"], allowedCommands: [] },
    diff: {
      added: ["src/article.ts"],
      outsideScope: [],
    },
    verification: {
      mechanical: { verdict: "passed" },
      independent: { verdict: "not-run" },
      principal: { verdict: "withheld" },
    },
    authority: { commit: "withheld", merge: "withheld", publish: "withheld" },
    stale: false,
    uncertain: false,
  });

  const journal = new FileEffectJournal(runnerRoot);
  await journal.verify("effect-1", {
    verifierRef: "supervisor:content-model-verifier",
    verdict: "passed",
    checks: [{
      command: "content contract",
      exitCode: 0,
      outputDigest: "b".repeat(64),
    }],
    evidenceRefs: ["claim:content-model-ready-for-next-slice"],
    subject: {
      gitHead: activity!.prepared.worktree.baseHead,
      files: [{
        path: "src/article.ts",
        sha256: manifest.files[0]!.afterSha256,
      }],
    },
  });
  expect((await projectMissionActivity(home, "blog-mission")).currentEffect).toMatchObject({
    verification: {
      independent: {
        verdict: "passed",
        evidenceRefs: ["claim:content-model-ready-for-next-slice"],
      },
    },
    stale: false,
  });

  await writeFile(
    join(fixture.worktree, "src/article.ts"),
    "export const thesis = 'changed after verification';\n",
    "utf8",
  );
  expect((await projectMissionActivity(home, "blog-mission")).currentEffect).toMatchObject({
    stale: true,
  });
});

test("a dirty baseline or an existing root lease prevents dispatch", async () => {
  const fixture = await gitWorktree();
  const observer = new IsolatedGitEffectObserver({
    missionId: "blog-mission",
    journalRoot: join(fixture.root, "runner-a"),
    leaseRoot: join(fixture.root, "home"),
  });
  await writeFile(join(fixture.worktree, "README.md"), "dirty\n", "utf8");
  await expect(observer.prepare(writableCheckpoint(fixture.worktree, "effect-dirty")))
    .rejects.toThrow("clean disposable worktree baseline");
  await runGit(fixture.worktree, ["restore", "README.md"]);

  await observer.prepare(writableCheckpoint(fixture.worktree, "effect-a"));
  const competing = new IsolatedGitEffectObserver({
    missionId: "other-mission",
    journalRoot: join(fixture.root, "runner-b"),
    leaseRoot: join(fixture.root, "home"),
  });
  await expect(competing.prepare(writableCheckpoint(fixture.worktree, "effect-b")))
    .rejects.toThrow("active or uncertain lease");
  await observer.rejectBeforeStart(
    writableCheckpoint(fixture.worktree, "effect-a"),
    new Error("timeline dispatch failed"),
  );
  await competing.prepare(writableCheckpoint(fixture.worktree, "effect-b"));
  expect((await observer.activity("effect-a"))?.state).toBe("uncertain");
});

function writableCheckpoint(root: string, id: string): DelegateBatchCheckpoint {
  const task = "Implement the bounded Blog source and projection slice.";
  const acceptance = ["Write only the declared Blog candidate source."];
  const batch: PreparedDelegateBatch = {
    id,
    whole: {
      revision: "blog-effect-v1",
      sourceRefs: ["file:DESIGN.md"],
      obligations: ["implement-blog-slice"],
      settledContributionKeys: [],
      guardRefs: ["guard:independent-blog-verification"],
      capabilityNeeds: ["write"],
      reconstructionOwner: "principal:blog-supervisor",
      workspace: {
        root,
        readPaths: ["."],
        writePaths: ["src"],
        excludePaths: [".git", ".env"],
        allowedCommands: [],
      },
      effectPolicy: { kind: "isolated-writable-trial", root },
    },
    contributions: [{
      key: "blog-writer",
      taskId: "task-1",
      task,
      sourceRefs: ["file:DESIGN.md"],
      obligationRefs: ["implement-blog-slice"],
      acceptance,
      capabilityNeed: "write",
      dependsOn: [],
      taskShape: {
        referenceProfile: { id: "blog-writer-v1", revision: "trial-1" },
        evidence: {
          status: "provisional-observed",
          revision: "trial-1",
          refs: ["evidence:first-isolated-write-trial"],
        },
        disposition: "guarded",
        principalInstability: "semantic and visual quality still require independent review",
        guardRefs: ["guard:independent-blog-verification"],
        reconstructionOwner: "principal:blog-supervisor",
        overloadDisposition: "escalate",
      },
      cell: {
        id: "blog-writer",
        intent: task,
        workspace: {
          root,
          readPaths: ["."],
          writePaths: ["src"],
          excludePaths: [".git", ".env"],
          allowedCommands: [],
        },
        instructions: ["Write complete candidate files; do not publish or alter Git refs."],
        capabilities: ["read", "write"],
        context: [],
        capabilitiesRequired: ["write"],
        acceptance,
        budget: { maxSteps: 8, maxDurationMs: 60_000, maxCommandOutputBytes: 4_000 },
        executionProfile: {
          id: "blog-writer-v1",
          version: "execution-profile.v1",
          provider: "test",
          model: "fixture",
          parallelism: "serial",
        },
        artifacts: [{ path: "src/article.ts", instructions: "Bounded Blog candidate source." }],
      },
    }],
  };
  return {
    id,
    parentLoopId: "blog-turn-1",
    wholeRevision: batch.whole.revision,
    parentUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
    tasks: [{
      id: "task-1",
      subject: "Implement Blog slice",
      description: task,
      status: "in_progress",
      owner: "delegate:blog-writer",
      blockedBy: [],
    }],
    invocations: [{
      toolCallId: "delegate-1",
      toolName: "delegate",
      call: {
        key: "blog-writer",
        taskId: "task-1",
        task,
        sourceRefs: ["file:DESIGN.md"],
        obligationRefs: ["implement-blog-slice"],
        acceptance,
        capabilityNeed: "write",
      },
      input: { kind: "inline" },
    }],
    responseMessages: [],
    admission: admitPreparedDelegateBatch(batch),
  };
}

function directRun(
  checkpoint: DelegateBatchCheckpoint,
  workspaceDiff: CellRunRecord["workspaceDiff"],
): DelegateBatchRun {
  const input = checkpoint.admission.contributions[0]!.cell;
  const record = {
    version: "work-cell.run.v4",
    runId: "run-1",
    cellId: input.id,
    status: "passed",
    input,
    verification: { passed: true, terminal: { passed: true, required: [], called: [] } },
    workspaceDiff,
  } as unknown as CellRunRecord;
  return { kind: "direct", admission: checkpoint.admission, record };
}

async function gitWorktree(): Promise<{
  readonly root: string;
  readonly repository: string;
  readonly worktree: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "git-effect-observer-"));
  roots.push(root);
  const repository = join(root, "repository");
  const worktree = join(root, "candidate");
  await mkdir(repository);
  await runGit(repository, ["init", "-b", "main"]);
  await runGit(repository, ["config", "user.email", "test@example.invalid"]);
  await runGit(repository, ["config", "user.name", "Effect Test"]);
  await writeFile(join(repository, "README.md"), "base\n", "utf8");
  await runGit(repository, ["add", "README.md"]);
  await runGit(repository, ["commit", "-m", "base"]);
  await runGit(repository, ["worktree", "add", "--detach", worktree, "HEAD"]);
  return { root, repository, worktree };
}

async function runGit(root: string, args: readonly string[]): Promise<void> {
  const child = Bun.spawn(["git", "-C", root, ...args], {
    stdin: "ignore",
    stdout: "ignore",
    stderr: "pipe",
    env: { PATH: process.env.PATH ?? "" },
  });
  const [stderr, exitCode] = await Promise.all([
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0) throw new Error(`git ${args[0]} failed: ${stderr}`);
}
