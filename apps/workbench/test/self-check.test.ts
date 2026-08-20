import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initializeHome } from "../src/home";
import {
  runSelfCheck,
  type SelfCheckOpinion,
  type SelfCheckOpinionInput,
  type SelfCheckWorker,
} from "../src/self-check";
import { runCommand } from "../src/process";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const setup = {
  version: "rosso.setup-status.v1" as const,
  sourceRevision: "test-source",
  modules: [],
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
) {
  // The explicit object keeps policy and setup injectable without changing
  // the production owner or loading the provider runtime in mechanical tests.
  return {
    workerCards: () => workers,
    setup: () => setup,
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
    workerId: "test-worker",
    dependencies: dependencies([worker("test-worker", "available")], async ({ evidenceRefs }) => ({
      requested: true,
      workerId: "test-worker",
      standing: "opinion",
      status: "recorded",
      confidence: "medium",
      items: [{
        id: "source",
        state: "healthy",
        detail: "worker sees no semantic anomaly in the supplied source evidence",
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
    status: "failed",
  }));
  expect(started).toBe(false);
});
