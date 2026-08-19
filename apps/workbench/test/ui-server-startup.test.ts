import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { CellInputSchema, CellRunRecordSchema, type CellRunRecord } from "../../../packages/work-cell/src/contracts";
import { PI_HARNESS_DRIVER_ADAPTER } from "../../../packages/work-cell/src/integrations/ai-sdk";
import { initializeHome } from "../src/home";
import { registerProject } from "../src/register";
import { createPrincipalTask, principalTasksPath } from "../src/tasks";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** One OS-assigned loopback port reserved by a momentary listener. */
function disposablePort(): number {
  const probe = Bun.listen({ hostname: "127.0.0.1", port: 0, socket: { data() {} } });
  const port = probe.port;
  probe.stop();
  return port;
}

/** Bind the exact loopback port; returns the probe, or null when the port is taken. */
function tryBindPort(port: number): { readonly probe: { stop(): void } } | null {
  try {
    return { probe: Bun.listen({ hostname: "127.0.0.1", port, socket: { data() {} } }) };
  } catch {
    return null;
  }
}

interface SpawnedChild {
  readonly exited: Promise<number | null>;
  readonly stderr: ReadableStream<Uint8Array>;
  readonly killed: boolean;
  kill(): void;
}

async function childStderr(child: SpawnedChild): Promise<string> {
  return await new Response(child.stderr).text();
}

/**
 * Poll one spawned child until it serves /api/snapshot on the loopback port.
 * Every non-success path kills and reaps the child first and only then reads
 * or formats its complete stderr, so a failed startup never leaks the process
 * or retains the disposable port.
 */
async function awaitSnapshotOrFail(
  child: SpawnedChild,
  port: number,
  deadlineMs: number,
  label: string,
): Promise<void> {
  const deadline = Date.now() + deadlineMs;
  for (;;) {
    if ((await Promise.race([child.exited.then(() => true), Bun.sleep(50).then(() => false)])) === true) {
      child.kill();
      const exitCode = await child.exited;
      const stderr = await childStderr(child);
      throw new Error(`${label} exited before serving /api/snapshot (exit ${exitCode}):\n${stderr}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/snapshot`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (response.status === 200) return;
    } catch {
      // The process is still booting or refuses the connection; retry until the deadline.
    }
    if (Date.now() > deadline) {
      child.kill();
      await child.exited;
      const stderr = await childStderr(child);
      throw new Error(`${label} did not serve /api/snapshot within the deadline:\n${stderr}`);
    }
  }
}

/**
 * The production UI entry, started exactly as the `ui` script does, against a
 * disposable port and an initialized home. The production execution-carrier
 * registry loads its default current worker policy catalog during this boot:
 * before the fix the process exits immediately with a module resolution
 * failure and this helper reports that stderr instead of timing out.
 */
async function startProductionUi(
  home: string,
  port: number,
): Promise<{ child: { readonly exited: Promise<number>; kill(): void } }> {
  const workbenchRoot = join(import.meta.dir, "..");
  const child = Bun.spawn({
    cmd: [process.execPath, "../gateway/src/ui-server.ts", "--port", String(port), "--home", home],
    cwd: workbenchRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  await awaitSnapshotOrFail(child, port, 10_000, "production UI");
  return { child };
}

test("production UI boots with the current worker policy catalog, serves /api/snapshot, and stops cleanly", async () => {
  const root = mkdtempSync(join(tmpdir(), "rossovia-ui-startup-"));
  temporaryRoots.push(root);
  initializeHome(root);
  const port = disposablePort();

  const { child } = await startProductionUi(root, port);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/snapshot`);
    expect(response.status).toBe(200);
    const snapshot = await response.json() as {
      readonly version: unknown;
      readonly complete: unknown;
      readonly errors: unknown;
      readonly workItems: unknown;
    };
    expect(snapshot.version).toBe("rosso.principal-workbench-snapshot.v1");
    expect(snapshot.complete).toBe(true);
    expect(snapshot.errors).toEqual([]);
    expect(snapshot.workItems).toBeDefined();
  } finally {
    child.kill();
    // The signal-driven stop is the production clean-stop surface: the
    // process terminates and the loopback port is released.
    const exitCode = await child.exited;
    expect([0, 143]).toContain(exitCode);
    let released = false;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        await fetch(`http://127.0.0.1:${port}/api/snapshot`, {
          signal: AbortSignal.timeout(200),
        });
      } catch {
        released = true;
        break;
      }
      await Bun.sleep(20);
    }
    expect(released).toBe(true);
  }
}, 20_000);

function git(cwd: string, ...arguments_: string[]): string {
  const result = Bun.spawnSync(["git", ...arguments_], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Write one exact attempt evidence family by hand with the canonical byte
 * shapes the strict attempt evidence reader validates: a recorded, passed
 * ordinary attempt bound to the Task's Worktree. The far-future startedAt
 * keeps it the latest attempt for its Task.
 */
function writeManualTaskAttempt(
  home: string,
  input: {
    taskId: string;
    taskRevision: number;
    sourceRevision: number;
    attemptId: string;
    worktree: string;
    workerId: string;
    model: string;
  },
): void {
  const directory = join(home, "state", "task-attempts", input.attemptId);
  const inputRef = `state/task-attempts/${input.attemptId}/cell-input.json`;
  const attemptRef = `state/task-attempts/${input.attemptId}/attempt.json`;
  const finalRecordRef = `state/task-attempts/${input.attemptId}/cell-input.run.json`;
  const settlementRef = `state/task-attempts/${input.attemptId}/settlement.json`;
  const cellId = `workbench-task-${input.taskId}-attempt-${input.attemptId}`;
  const startedAt = "2099-01-01T00:00:00.000Z";
  const cellInput = CellInputSchema.parse({
    id: cellId,
    workerId: input.workerId,
    intent: "Manual default-home attempt fixture.",
    workspace: {
      root: realpathSync(input.worktree),
      readPaths: ["."],
      writePaths: ["."],
      excludePaths: [],
      allowedCommands: [],
    },
    instructions: ["Produce the manual default-home fixture result."],
    acceptance: ["The manual default-home fixture result exists"],
    executionProfile: {
      id: input.workerId,
      version: "execution-profile.v1",
      provider: "deepseek",
      model: input.model,
      parallelism: "serial",
    },
    budget: { maxDurationMs: 60_000 },
  });
  writeJson(join(directory, "cell-input.json"), cellInput);
  writeJson(join(directory, "attempt.json"), {
    version: "rosso.task-run-attempt.v1",
    taskId: input.taskId,
    taskRevision: input.taskRevision,
    sourceRevision: input.sourceRevision,
    attemptId: input.attemptId,
    inputRef,
    finalRecordRef,
    workerId: input.workerId,
    driver: PI_HARNESS_DRIVER_ADAPTER,
    model: input.model,
    status: "started",
    startedAt,
  });
  writeJson(join(directory, "cell-input.run.json"), CellRunRecordSchema.parse({
    version: "work-cell.run.v4",
    runId: `run-${input.attemptId}`,
    cellId,
    driver: {
      adapter: PI_HARNESS_DRIVER_ADAPTER,
      provider: "deepseek",
      model: input.model,
    },
    startedAt,
    finishedAt: "2099-01-01T00:01:00.000Z",
    durationMs: 60_000,
    status: "passed",
    input: cellInput,
    finalText: "Manual default-home attempt fixture final text.",
    artifacts: [],
    verification: {
      passed: true,
      terminal: { passed: true, required: [], called: [] },
      artifacts: { passed: true, errors: [] },
    },
    workspaceDiff: {
      added: ["manual-added.txt"],
      changed: [],
      removed: [],
    },
    usage: {
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      cachedInputTokens: 0,
    },
    usageByPhase: {
      preparation: {
        inputTokens: 5,
        outputTokens: 0,
        totalTokens: 5,
        cachedInputTokens: 0,
      },
      execution: {
        inputTokens: 5,
        outputTokens: 5,
        totalTokens: 10,
        cachedInputTokens: 0,
      },
    },
    executionObservation: {
      providerFingerprintStanding: { standing: "unavailable", reason: "manual default-home fixture" },
    },
    trace: [],
    rawSteps: [],
  }) as unknown as CellRunRecord);
  writeJson(join(directory, "settlement.json"), {
    version: "rosso.task-run-settlement.v1",
    taskId: input.taskId,
    taskRevision: input.taskRevision,
    attemptId: input.attemptId,
    inputRef,
    finalRecordRef,
    status: "recorded",
    workCellRunId: `run-${input.attemptId}`,
    cellStatus: "passed",
    semanticAcceptance: "not-evaluated",
    settledAt: "2099-01-01T00:02:00.000Z",
  });
}

test("production default home exposes one valid ordinary-attempt candidate and reaches the exact verified-result submit authority without --home", async () => {
  const root = mkdtempSync(join(tmpdir(), "rossovia-ui-default-home-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  initializeHome(home);
  const project = join(root, "project");
  mkdirSync(join(project, "apps", "missions"), { recursive: true });
  git(project, "init", "-b", "main");
  git(project, "config", "user.name", "Default Home UI Test");
  git(project, "config", "user.email", "default-home@example.test");
  writeFileSync(join(project, "README.md"), "# Default home fixture\n");
  writeFileSync(
    join(project, "apps", "missions", "default-home-mission.json"),
    `${JSON.stringify({
      version: "mission-record.v1",
      id: "default-home-mission",
      title: "Default home fixture mission",
      sources: ["test:ui-default-home"],
      createdAt: "2026-08-17T00:00:00Z",
      updatedAt: "2026-08-17T00:00:00Z",
      mainline: {
        contradiction: "Keep the default home production entry fully functional",
        acceptance: ["The candidate and submit authority work without --home"],
        status: "active",
      },
      branches: [],
      currentFocus: "mainline",
    }, null, 2)}\n`,
  );
  git(project, "add", "README.md", "apps/missions/default-home-mission.json");
  git(project, "commit", "-m", "fixture");
  git(project, "remote", "add", "origin", "https://example.test/lidessen/default-home-fixture.git");
  const worktree = join(root, "worktree");
  git(project, "worktree", "add", "--detach", worktree);
  registerProject(home, {
    path: project,
    id: "repository:default-home-fixture",
    aliases: ["default-home"],
  });
  const created = createPrincipalTask(home, {
    title: "Return the default-home ordinary attempt result",
    objective: "Keep the candidate and submission reachable through the default home",
    acceptance: ["The candidate is visible and the submit authority is reachable without --home"],
    nextActor: "agent",
    sourceRef: "test:default-home",
    expectedSourceRevision: 0,
    project: "default-home",
    worktree,
  });
  const attemptId = randomUUID();
  writeManualTaskAttempt(home, {
    taskId: created.task.id,
    taskRevision: 1,
    sourceRevision: 1,
    attemptId,
    worktree,
    workerId: "deepseek-flash-test",
    model: "deepseek/deepseek-v4-flash",
  });
  const head = git(worktree, "rev-parse", "HEAD");

  // The exact production entry, started without --home: the default Rossovia
  // home is resolved from ROSSO_HOME and normalized into the request-handler
  // options so every snapshot/attempt/result owner reads the same home.
  const port = disposablePort();
  const workbenchRoot = join(import.meta.dir, "..");
  const child = Bun.spawn({
    cmd: [process.execPath, "../gateway/src/ui-server.ts", "--port", String(port)],
    cwd: workbenchRoot,
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter((entry): entry is [string, string] =>
          entry[1] !== undefined
        ),
      ),
      ROSSO_HOME: home,
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  await awaitSnapshotOrFail(child, port, 10_000, "production default-home UI");
  try {
    const origin = `http://127.0.0.1:${port}`;
    const snapshotResponse = await fetch(`${origin}/api/snapshot`);
    expect(snapshotResponse.status).toBe(200);
    const snapshot = await snapshotResponse.json() as {
      readonly workItems: {
        readonly items: Array<{
          readonly id: string;
          readonly taskDetail: {
            readonly executionContext: {
              readonly attemptResultCandidate: null | {
                readonly attemptId: string;
                readonly taskRevision: number;
                readonly worktree: { readonly path: string; readonly head: string };
              };
            };
          };
        }>;
      };
    };
    const item = snapshot.workItems.items.find(
      (candidate) => candidate.id === `principal-task:${created.task.id}`,
    );
    expect(item).toBeDefined();
    const candidate = item!.taskDetail.executionContext.attemptResultCandidate;
    expect(candidate).not.toBeNull();
    expect(candidate!.attemptId).toBe(attemptId);
    expect(candidate!.taskRevision).toBe(1);
    expect(candidate!.worktree.head).toBe(head);
    expect(candidate!.worktree.path).toBe(realpathSync(worktree));

    // The exact existing verified-result submission authority is reachable
    // through the same default home.
    const request = {
      kind: "submit-verified-execution",
      summary: "The default-home ordinary attempt passed its checks.",
      selector: {
        kind: "ordinary-attempt-result.v1",
        attemptId,
        expectedWorktreeHead: head,
      },
      expectedSourceRevision: 1,
      expectedRevision: 1,
    };
    const submit = await fetch(`${origin}/api/tasks/${created.task.id}/actions`, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    expect(submit.status).toBe(200);
    expect((await submit.json()).result.task).toMatchObject({
      lifecycle: "verifying",
      nextActor: "principal",
      revision: 2,
      resultClaims: [{
        standing: "submitted",
        evidence: {
          kind: "runtime-verified-attempt",
          selector: { kind: "ordinary-attempt-result.v1", attemptId },
        },
        resolution: null,
      }],
    });

    // Replay and stale selectors fail closed with no additional claim.
    const replay = await fetch(`${origin}/api/tasks/${created.task.id}/actions`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ ...request, expectedSourceRevision: 2, expectedRevision: 2 }),
    });
    expect(replay.status).toBe(409);
    expect(await replay.json()).toMatchObject({ error: "task-drift" });
    const tasks = JSON.parse(readFileSync(principalTasksPath(home), "utf8"));
    expect(tasks.tasks.find((task: { id: string }) => task.id === created.task.id).resultClaims)
      .toHaveLength(1);
  } finally {
    child.kill();
    await child.exited;
  }
}, 20_000);

test("a live non-serving child is killed and reaped before stderr is read; the same port can be rebound", async () => {
  const port = disposablePort();

  // A live child that binds the loopback port but never serves HTTP.
  const child = Bun.spawn({
    cmd: [process.execPath, "-e", [
      `const port = ${port};`,
      'console.error("rossovia-ui-startup-stub-bound");',
      'Bun.listen({ hostname: "127.0.0.1", port, socket: { data() {} } });',
    ].join("\n")],
    stdout: "pipe",
    stderr: "pipe",
  });
  try {
    // The stub must be live and hold the port: while it runs, rebinding fails.
    let blocked = false;
    const blockDeadline = Date.now() + 5_000;
    while (Date.now() < blockDeadline) {
      const held = tryBindPort(port);
      if (held === null) {
        blocked = true;
        break;
      }
      held.probe.stop();
      await Bun.sleep(50);
    }
    expect(blocked).toBe(true);

    // The failure path must kill and reap the live child first and only then
    // report its complete stderr: the previous read-before-kill order would
    // hang forever on this live child and leak both it and the port.
    let failure: unknown;
    try {
      await awaitSnapshotOrFail(child, port, 750, "live non-serving child");
    } catch (error: unknown) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toContain("did not serve /api/snapshot within the deadline");
    expect((failure as Error).message).toContain("rossovia-ui-startup-stub-bound");
    expect(child.killed).toBe(true);

    // After the reap the same disposable port can be rebound.
    const rebound = tryBindPort(port);
    expect(rebound).not.toBeNull();
    rebound!.probe.stop();
  } finally {
    child.kill();
    await child.exited;
  }
}, 10_000);
