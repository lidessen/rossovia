import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initializeHome } from "../src/home";
import {
  runSelfCheck,
  type SelfCheckOpinion,
  type SelfCheckOpinionInput,
  type SelfCheckProgress,
  type SelfCheckTaskReadPort,
  type SelfCheckTaskSnapshot,
  type SelfCheckWorker,
} from "../src/self-check";
import { defaultSelfCheckTaskReadPort } from "../src/self-check-task";
import { runCommand } from "../src/process";
import { parseTaskReceiptEvidenceRef, taskReceiptEvidenceRef } from "../src/conversation/contracts";
import { createPrincipalTask } from "../src/tasks";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const setup = {
  version: "rosso.setup-status.v1" as const,
  sourceRevision: "test-source",
  modules: [],
};

const taskSnapshot: SelfCheckTaskSnapshot = {
  taskId: "task-self-check",
  sourceRevision: 4,
  taskRevision: 2,
  title: "Existing bounded Task",
  objective: "Inspect the current system evidence.",
  acceptance: ["Return evidence-backed attention items."],
  todos: ["Read the mechanical checklist", "Report stale evidence"],
  lifecycle: "open",
  evidenceRefs: [taskReceiptEvidenceRef("task-self-check", 4)],
};

function worker(id: string, status: "available" | "unavailable"): SelfCheckWorker {
  return {
    id,
    provider: "test-provider",
    model: "test-model",
    availability: status === "available"
      ? { status }
      : { status, reason: "test provider is unavailable" },
  };
}

function git(cwd: string, ...arguments_: string[]): string {
  const result = runCommand("git", arguments_, { cwd });
  if (result.exitCode !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}

function repository(root: string): string {
  const path = join(root, "repository");
  mkdirSync(path, { recursive: true });
  git(path, "init");
  git(path, "config", "user.name", "Self Check Test");
  git(path, "config", "user.email", "self-check@example.test");
  writeFileSync(join(path, "README.md"), "# self-check\n", "utf8");
  git(path, "add", "README.md");
  git(path, "commit", "-m", "initial");
  return path;
}

function dependencies(
  workers: readonly SelfCheckWorker[],
  opinionRunner?: (input: SelfCheckOpinionInput) => Promise<SelfCheckOpinion>,
  taskRead: SelfCheckTaskReadPort = { read: () => taskSnapshot },
) {
  // The explicit object keeps policy and setup injectable without changing
  // the production owner or loading the provider runtime in mechanical tests.
  return {
    workerCards: () => workers,
    setup: () => setup,
    taskRead,
    ...(opinionRunner === undefined ? {} : { opinionRunner }),
  };
}

test("forward: clean home and source return healthy mechanical evidence", async () => {
  const root = mkdtempSync(join(tmpdir(), "rossovia-self-check-forward-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  const repo = repository(root);
  initializeHome(home);
  const head = git(repo, "rev-parse", "HEAD");
  const progress: string[] = [];

  const result = await runSelfCheck({
    home,
    cwd: repo,
    baselineHead: head,
    dependencies: dependencies([worker("test-worker", "available")]),
    onProgress: (event) => progress.push(`${event.phase}:${event.itemId}:${event.state}`),
  });

  expect(result.status).toBe("healthy");
  expect(result.mechanical.status).toBe("healthy");
  expect(result.mechanical.checks.map((check) => check.status)).toEqual(["ok", "ok", "ok", "ok", "ok"]);
  expect(result.mechanical.source?.freshness).toBe("current");
  expect(result.opinion.standing).toBe("not-requested");
  expect(progress[0]).toBe("checking:mechanical-preflight:checking");
  expect(progress).toContain("checking:home:healthy");
  expect(progress.at(-1)).toBe("complete:self-check:healthy");
  expect(result.mechanical.checks.flatMap((check) => check.evidenceRefs))
    .toContain(`git:${result.mechanical.source?.root}@${head}`);
});

test("the existing Task snapshot uses the canonical parseable receipt evidence ref", () => {
  const root = mkdtempSync(join(tmpdir(), "rossovia-self-check-task-evidence-"));
  temporaryRoots.push(root);
  initializeHome(root);
  const created = createPrincipalTask(root, {
    title: "Canonical Task source",
    objective: "Read the existing Task without creating a second source.",
    acceptance: ["The receipt reference is parseable."],
    nextActor: "agent",
    sourceRef: "test:self-check-task-evidence",
    expectedSourceRevision: 0,
  });
  const snapshot = defaultSelfCheckTaskReadPort.read(root, created.task.id);
  expect(parseTaskReceiptEvidenceRef(snapshot.evidenceRefs[0]!)).toEqual({
    taskId: created.task.id,
    sourceRevision: created.sourceRevision,
  });
});

test("changed-after-start and stale baseline are explicit rather than healthy claims", async () => {
  const root = mkdtempSync(join(tmpdir(), "rossovia-self-check-stale-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  const repo = repository(root);
  initializeHome(home);
  const baseline = git(repo, "rev-parse", "HEAD");
  writeFileSync(join(repo, "README.md"), "# changed\n", "utf8");

  const changed = await runSelfCheck({
    home,
    cwd: repo,
    baselineHead: baseline,
    dependencies: dependencies([worker("test-worker", "available")]),
  });
  expect(changed.status).toBe("attention");
  expect(changed.mechanical.source?.freshness).toBe("changed-after-start");
  expect(changed.mechanical.source?.changedAfterStart).toBe(true);

  git(repo, "add", "README.md");
  git(repo, "commit", "-m", "changed after start");
  const stale = await runSelfCheck({
    home,
    cwd: repo,
    baselineHead: baseline,
    dependencies: dependencies([worker("test-worker", "available")]),
  });
  expect(stale.mechanical.source?.freshness).toBe("stale");
  expect(stale.mechanical.source?.dirty).toBe(false);
  expect(stale.status).toBe("attention");
});

test("provider unavailable is an opinion attention, never a mechanical health fact", async () => {
  const root = mkdtempSync(join(tmpdir(), "rossovia-self-check-provider-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  const repo = repository(root);
  initializeHome(home);
  const result = await runSelfCheck({
    home,
    cwd: repo,
    baselineHead: git(repo, "rev-parse", "HEAD"),
    opinion: true,
    taskId: "task-self-check",
    workerId: "unavailable-worker",
    dependencies: dependencies([
      worker("available-worker", "available"),
      worker("unavailable-worker", "unavailable"),
    ]),
  });

  expect(result.mechanical.status).toBe("attention");
  expect(result.opinion).toEqual(expect.objectContaining({
    standing: "attention",
    status: "unavailable",
  }));
  expect(result.status).toBe("attention");
});

test("without an existing Task/Todo, the missing transient subscription is an explicit query-gap", async () => {
  let started = false;
  const progress: SelfCheckProgress[] = [];
  const root = mkdtempSync(join(tmpdir(), "rossovia-self-check-task-gap-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  const repo = repository(root);
  initializeHome(home);
  const result = await runSelfCheck({
    home,
    cwd: repo,
    baselineHead: git(repo, "rev-parse", "HEAD"),
    opinion: true,
    workerId: "test-worker",
    onProgress: (entry) => progress.push(entry),
    dependencies: dependencies([worker("test-worker", "available")], async () => {
      started = true;
      throw new Error("worker must not start without Task/Todo source");
    }),
  });

  expect(result.mechanical.status).toBe("healthy");
  expect(result.opinion).toEqual(expect.objectContaining({
    standing: "attention",
    status: "query-gap",
  }));
  if (result.opinion.requested) {
    expect(result.opinion.summary).toContain("no transient Task subscription API");
    expect(result.opinion.summary).not.toContain("worker unavailable");
    expect(result.opinion.items[0]?.detail).not.toContain("worker unavailable");
  }
  expect(progress.some((entry) => entry.itemId === "worker-opinion" && entry.state === "checking")).toBe(false);
  expect(progress.some((entry) => entry.detail.includes("Task/Todo query-gap"))).toBe(true);
  expect(started).toBe(false);
});

test("recorded worker output remains an opinion projection separate from healthy facts", async () => {
  const root = mkdtempSync(join(tmpdir(), "rossovia-self-check-opinion-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  const repo = repository(root);
  initializeHome(home);
  const result = await runSelfCheck({
    home,
    cwd: repo,
    baselineHead: git(repo, "rev-parse", "HEAD"),
    opinion: true,
    taskId: "task-self-check",
    workerId: "test-worker",
    dependencies: dependencies([worker("test-worker", "available")], async ({ evidenceRefs, task }) => ({
      requested: true,
      workerId: "test-worker",
      standing: "opinion",
      status: "recorded",
      confidence: "medium",
      items: [{
        id: "task",
        state: "healthy",
        detail: `worker consumed ${task?.todos.join(", ")}`,
        evidenceRefs: [...evidenceRefs],
      }],
      evidenceRefs: [...evidenceRefs],
      summary: "opinion only",
    })),
  });

  expect(result.mechanical.status).toBe("healthy");
  expect(result.opinion.requested).toBe(true);
  expect(result.opinion.standing).toBe("opinion");
  if (result.opinion.requested) expect(result.opinion.confidence).toBe("medium");
  if (result.opinion.requested) expect(result.opinion.items[0]?.detail).toContain("Read the mechanical checklist");
  expect(result.status).toBe("healthy");
});

test("worker opinion timeout is bounded and labeled attention", async () => {
  const root = mkdtempSync(join(tmpdir(), "rossovia-self-check-timeout-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  const repo = repository(root);
  initializeHome(home);
  const result = await runSelfCheck({
    home,
    cwd: repo,
    baselineHead: git(repo, "rev-parse", "HEAD"),
    opinion: true,
    taskId: "task-self-check",
    workerId: "test-worker",
    opinionTimeoutMs: 10,
    dependencies: dependencies([worker("test-worker", "available")], async () => new Promise(() => {})),
  });

  expect(result.mechanical.status).toBe("healthy");
  expect(result.opinion).toEqual(expect.objectContaining({
    standing: "attention",
    status: "timeout",
  }));
  expect(result.status).toBe("attention");
});

test("Task revision change after the opinion is reported stale without a subscription claim", async () => {
  const root = mkdtempSync(join(tmpdir(), "rossovia-self-check-task-stale-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  const repo = repository(root);
  initializeHome(home);
  let reads = 0;
  const changedTask: SelfCheckTaskSnapshot = {
    ...taskSnapshot,
    sourceRevision: 5,
    taskRevision: 3,
    evidenceRefs: [taskReceiptEvidenceRef("task-self-check", 5)],
  };
  const taskRead: SelfCheckTaskReadPort = {
    read: () => {
      reads += 1;
      return reads === 1 ? taskSnapshot : changedTask;
    },
  };
  const result = await runSelfCheck({
    home,
    cwd: repo,
    baselineHead: git(repo, "rev-parse", "HEAD"),
    opinion: true,
    taskId: "task-self-check",
    workerId: "test-worker",
    dependencies: dependencies([worker("test-worker", "available")], async ({ evidenceRefs }) => ({
      requested: true,
      workerId: "test-worker",
      standing: "opinion",
      status: "recorded",
      confidence: "low",
      items: [{ id: "task", state: "healthy", detail: "snapshot read", evidenceRefs: [...evidenceRefs] }],
      evidenceRefs: [...evidenceRefs],
      summary: "snapshot opinion",
    }), taskRead),
  });

  expect(result.mechanical.task?.subscription).toBe("unavailable");
  expect(result.mechanical.task?.standing).toBe("stale");
  expect(result.opinion).toEqual(expect.objectContaining({ standing: "attention", status: "stale" }));
  expect(result.status).toBe("attention");
});

test("Task re-read failure is degraded evidence, not an invented stale change", async () => {
  const root = mkdtempSync(join(tmpdir(), "rossovia-self-check-task-reread-failure-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  const repo = repository(root);
  initializeHome(home);
  let reads = 0;
  const taskRead: SelfCheckTaskReadPort = {
    read: () => {
      reads += 1;
      if (reads > 1) throw new Error("task source disappeared during re-read");
      return taskSnapshot;
    },
  };
  const result = await runSelfCheck({
    home,
    cwd: repo,
    baselineHead: git(repo, "rev-parse", "HEAD"),
    opinion: true,
    taskId: "task-self-check",
    workerId: "test-worker",
    dependencies: dependencies([worker("test-worker", "available")], async ({ evidenceRefs }) => ({
      requested: true,
      workerId: "test-worker",
      standing: "opinion",
      status: "recorded",
      confidence: "low",
      items: [{ id: "task", state: "healthy", detail: "snapshot read", evidenceRefs: [...evidenceRefs] }],
      evidenceRefs: [...evidenceRefs],
      summary: "snapshot opinion",
    }), taskRead),
  });

  expect(result.mechanical.status).toBe("degraded");
  expect(result.mechanical.task?.standing).toBe("unavailable");
  expect(result.opinion).toEqual(expect.objectContaining({ standing: "opinion", status: "recorded" }));
  if (result.opinion.requested) {
    expect(result.opinion.summary).not.toContain("changed");
    expect(result.opinion.summary).not.toContain("stale");
  }
});

test("degraded mechanical preflight does not start the worker", async () => {
  let started = false;
  const root = mkdtempSync(join(tmpdir(), "rossovia-self-check-preflight-"));
  temporaryRoots.push(root);
  const repo = repository(root);
  const result = await runSelfCheck({
    home: join(root, "missing-home"),
    cwd: repo,
    opinion: true,
    dependencies: dependencies([worker("test-worker", "available")], async () => {
      started = true;
      return {
        requested: true,
        workerId: "test-worker",
        standing: "opinion",
        status: "recorded",
        confidence: "low",
        items: [],
        evidenceRefs: [],
        summary: "should not run",
      };
    }),
  });

  expect(result.mechanical.status).toBe("degraded");
  expect(result.opinion).toEqual(expect.objectContaining({
    standing: "attention",
    status: "not-started",
  }));
  expect(started).toBe(false);
});
