import { afterEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CellRunRecordSchema,
  type CellInput,
  type CellRunRecord,
} from "../../../packages/work-cell/src/contracts";
import type { CellDriver, DriverResult } from "../../../packages/work-cell/src/driver";
import { WorkerCatalog, type WorkerCard } from "../../../packages/work-cell/src/worker-catalog";
import { initializeHome } from "../src/home";
import { registerProject } from "../src/register";
import { createPrincipalTask } from "../src/tasks";
import {
  acquireWorktreeWriterLease,
  canonicalGitDirectory,
  createWorktreeWriter,
  inspectRetainedWorktreeWriterLease,
  isProcessDefinitelyAbsent,
  readWorktreeWriterLease,
  recoverRetainedWorktreeWriterLease,
  releaseWorktreeWriterLease,
  worktreeWriterLeasePath,
  WORKTREE_WRITER_LEASE_FILENAME,
  WorktreeWriterLeaseSchema,
  type WorktreeWriterLease,
} from "../src/orchestration/worktree-writer";
import type { GitWorktreeMetadataPort } from "../src/orchestration/git-worktree-port";
import {
  runPrincipalTask,
  type TaskCellExecutor,
  type TaskRunResult,
} from "../src/task-run";
import {
  CONTRIBUTION_TERMINAL_TOOL,
  createConversationContributionRegistry,
  readContributionSpawnReceipts,
} from "../src/conversation/contributions";
import { FileConversationJournal } from "../src/conversation/journal";
import { taskReceiptEvidenceRef } from "../src/conversation/contracts";
import type { ConversationOperation } from "../../autonomy/src/conversation-coordinator";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function git(cwd: string, ...arguments_: string[]): string {
  const result = Bun.spawnSync(["git", ...arguments_], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}

interface Fixture {
  root: string;
  home: string;
  primary: string;
  worktree: string;
  primaryHead: string;
  worktreeHead: string;
}

function fixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "rossovia-o3-worktree-writer-"));
  temporaryRoots.push(root);
  const home = join(root, "home");
  const primary = join(root, "project");
  const worktree = join(root, "worktree");
  initializeHome(home);
  mkdirSync(primary, { recursive: true });
  git(primary, "init", "-b", "main");
  git(primary, "config", "user.name", "O3 Worktree Writer Test");
  git(primary, "config", "user.email", "o3-writer@example.test");
  writeFileSync(join(primary, "README.md"), "# O3 writer fixture\n");
  git(primary, "add", "README.md");
  git(primary, "commit", "-m", "initial");
  git(primary, "remote", "add", "origin", "https://example.test/lidessen/o3-worktree-writer.git");
  git(primary, "worktree", "add", "-b", "task/o3-writer", worktree);
  registerProject(home, {
    path: primary,
    id: "repository:o3-worktree-writer",
    aliases: ["o3-writer"],
  });
  return {
    root,
    home,
    primary,
    worktree,
    primaryHead: git(primary, "rev-parse", "HEAD"),
    worktreeHead: git(worktree, "rev-parse", "HEAD"),
  };
}

function agentTask(fixture_: Fixture) {
  return createPrincipalTask(fixture_.home, {
    title: "Run one O3 writer task",
    objective: "Exercise the exact shared-Worktree writer owner",
    acceptance: ["The writer exclusion is observable"],
    nextActor: "agent",
    sourceRef: "test:o3-worktree-writer",
    expectedSourceRevision: 0,
    project: "o3-writer",
    worktree: fixture_.worktree,
  });
}

function deadPid(): number {
  const result = Bun.spawnSync(["sh", "-c", "exit 0"]);
  if (result.exitCode !== 0) throw new Error("dead pid fixture failed");
  return result.pid;
}

function testCard(provider: string, model: string): WorkerCard {
  return {
    version: "work-cell.worker-card.v1",
    id: "test-worker",
    labels: ["coding", "text", "write", "commands"],
    description: "Deterministic O3 writer test worker.",
    executionProfile: {
      id: "test-worker",
      version: "execution-profile.v1",
      provider,
      model,
      parallelism: "serial",
    },
    availability: { status: "available" },
  };
}

function validWorkCellRecord(input: CellInput, options: { runId: string }): CellRunRecord {
  return CellRunRecordSchema.parse({
    version: "work-cell.run.v4",
    runId: options.runId,
    cellId: input.id,
    driver: { adapter: "ai-sdk-v7", provider: "opencode", model: "opencode/go" },
    startedAt: "2026-08-16T00:00:00.000Z",
    finishedAt: "2026-08-16T00:00:01.000Z",
    durationMs: 1_000,
    status: "passed",
    input,
    finalText: "Fake Work Cell settled.",
    artifacts: [],
    verification: {
      passed: true,
      terminal: { passed: true, required: [], called: [] },
      artifacts: { passed: true, errors: [] },
    },
    workspaceDiff: { added: [], changed: [], removed: [] },
    usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 },
    usageByPhase: {
      preparation: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
      execution: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 },
    },
    executionObservation: {
      providerFingerprintStanding: {
        standing: "unavailable",
        reason: "deterministic O3 writer test executor retains no provider metadata",
      },
    },
    trace: [],
    rawSteps: [],
  }) as CellRunRecord;
}

function runTestTask(
  home: string,
  taskId: string,
  executor: TaskCellExecutor,
): Promise<TaskRunResult> {
  return runPrincipalTask(
    home,
    { id: taskId, workerId: "test-worker" },
    {
      resolveWorkerCard: () => testCard("opencode", "opencode/go"),
      executeTaskCell: executor,
    },
  );
}

class RecordingExecutor {
  readonly requests: TaskCellExecutor[] = [];
  execute: TaskCellExecutor = async ({ cellInput }) => {
    this.requests.push(this.execute);
    return validWorkCellRecord(cellInput, { runId: "fake-run-default" });
  };
}

describe("O3 Worktree writer mechanism", () => {
  test("acquires the exact durable claim bytes at the canonical Git metadata location", () => {
    const current = fixture();
    const worktree = realpathSync(current.worktree);
    const owner = { taskId: "task-owner", attemptId: randomUUID() };

    const lease = acquireWorktreeWriterLease(worktree, owner);

    expect(lease.path).toBe(join(canonicalGitDirectory(worktree), WORKTREE_WRITER_LEASE_FILENAME));
    expect(lease.content.endsWith("\n")).toBeTrue();
    const record = WorktreeWriterLeaseSchema.parse(JSON.parse(lease.content));
    expect(record).toEqual({
      version: "rosso.task-run-worktree-lease.v1",
      worktree,
      taskId: owner.taskId,
      attemptId: owner.attemptId,
      pid: process.pid,
      acquiredAt: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(record.acquiredAt))).toBeFalse();
    expect(readFileSync(lease.path, "utf8")).toBe(lease.content);
    expect(WorktreeWriterLeaseSchema.safeParse(JSON.parse(readFileSync(lease.path, "utf8"))).success).toBeTrue();
    releaseWorktreeWriterLease(lease);
  });

  test("refuses a second writer on the same Worktree and never touches the first claim", () => {
    const current = fixture();
    const worktree = realpathSync(current.worktree);
    const first = acquireWorktreeWriterLease(worktree, { taskId: "task-first", attemptId: randomUUID() });

    expect(() => acquireWorktreeWriterLease(worktree, {
      taskId: "task-second",
      attemptId: randomUUID(),
    })).toThrow(
      `task Worktree already has an active task-run lease: ${worktree}; lease: ${first.path}`,
    );
    expect(readFileSync(first.path, "utf8")).toBe(first.content);

    releaseWorktreeWriterLease(first);
    expect(existsSync(first.path)).toBeFalse();
  });

  test("an exact release removes the claim and permits exact Worktree reuse by a different owner", () => {
    const current = fixture();
    const worktree = realpathSync(current.worktree);
    const first = acquireWorktreeWriterLease(worktree, { taskId: "task-first", attemptId: randomUUID() });

    releaseWorktreeWriterLease(first);
    expect(existsSync(first.path)).toBeFalse();

    const secondOwner = { taskId: "task-second", attemptId: randomUUID() };
    const second = acquireWorktreeWriterLease(worktree, secondOwner);
    const record = WorktreeWriterLeaseSchema.parse(JSON.parse(second.content));
    expect(record.taskId).toBe(secondOwner.taskId);
    expect(record.attemptId).toBe(secondOwner.attemptId);
    expect(readFileSync(second.path, "utf8")).toBe(second.content);
    releaseWorktreeWriterLease(second);
  });

  test("a changed-owner release fails closed and retains the changed bytes", () => {
    const current = fixture();
    const worktree = realpathSync(current.worktree);
    const lease = acquireWorktreeWriterLease(worktree, { taskId: "task-owner", attemptId: randomUUID() });
    const record = WorktreeWriterLeaseSchema.parse(JSON.parse(lease.content));
    const changed = `${JSON.stringify({
      ...record,
      attemptId: randomUUID(),
    }, null, 2)}\n`;
    writeFileSync(lease.path, changed);

    expect(() => releaseWorktreeWriterLease(lease)).toThrow(
      `task-run lease ownership changed before release: ${lease.path}`,
    );
    expect(readFileSync(lease.path, "utf8")).toBe(changed);
    rmSync(lease.path);
  });

  test("a release whose claim file already disappeared fails visibly without deleting anything", () => {
    const current = fixture();
    const worktree = realpathSync(current.worktree);
    const lease = acquireWorktreeWriterLease(worktree, { taskId: "task-owner", attemptId: randomUUID() });
    rmSync(lease.path);

    expect(() => releaseWorktreeWriterLease(lease)).toThrow();
    expect(existsSync(lease.path)).toBeFalse();
  });

  test("observes owner-process absence exactly", () => {
    expect(isProcessDefinitelyAbsent(process.pid)).toBeFalse();
    expect(isProcessDefinitelyAbsent(deadPid())).toBeTrue();
  });

  test("locates the exact canonical Git metadata directory for the primary and a linked Worktree", () => {
    const current = fixture();
    const primaryGitDir = realpathSync(join(current.primary, ".git"));
    expect(canonicalGitDirectory(current.primary)).toBe(primaryGitDir);
    const worktreeGitDir = realpathSync(git(current.worktree, "rev-parse", "--git-dir"));
    expect(canonicalGitDirectory(current.worktree)).toBe(worktreeGitDir);
    expect(worktreeWriterLeasePath(current.worktree)).toBe(
      join(worktreeGitDir, WORKTREE_WRITER_LEASE_FILENAME),
    );
  });

  test("validates the exact retained owner identity with the frozen refusal messages", () => {
    const current = fixture();
    const worktree = realpathSync(current.worktree);
    const owner = { taskId: "task-owner", attemptId: randomUUID() };
    const leasePath = worktreeWriterLeasePath(worktree);
    const expected = { ...owner, worktree };

    expect(() => readWorktreeWriterLease(leasePath, expected)).toThrow(
      `attempt ${owner.attemptId} has no retained task-run lease in the bound Worktree: ${leasePath}`,
    );

    writeFileSync(leasePath, "not-json\n");
    expect(() => readWorktreeWriterLease(leasePath, expected)).toThrow(
      "does not carry the exact expected identity bytes",
    );

    const claim = (record: Record<string, unknown>): string =>
      `${JSON.stringify(record, null, 2)}\n`;
    writeFileSync(leasePath, claim({
      version: "rosso.task-run-worktree-lease.v1",
      worktree,
      taskId: "another-task",
      attemptId: owner.attemptId,
      pid: process.pid,
      acquiredAt: new Date().toISOString(),
    }));
    expect(() => readWorktreeWriterLease(leasePath, expected)).toThrow(
      `the retained task-run lease belongs to task another-task, not the requested task ${owner.taskId}`,
    );

    writeFileSync(leasePath, claim({
      version: "rosso.task-run-worktree-lease.v1",
      worktree,
      taskId: owner.taskId,
      attemptId: randomUUID(),
      pid: process.pid,
      acquiredAt: new Date().toISOString(),
    }));
    expect(() => readWorktreeWriterLease(leasePath, expected)).toThrow(
      "belongs to attempt",
    );

    writeFileSync(leasePath, claim({
      version: "rosso.task-run-worktree-lease.v1",
      worktree: realpathSync(current.primary),
      taskId: owner.taskId,
      attemptId: owner.attemptId,
      pid: process.pid,
      acquiredAt: new Date().toISOString(),
    }));
    expect(() => readWorktreeWriterLease(leasePath, expected)).toThrow(
      "the retained task-run lease Worktree does not match the task's current bound Worktree",
    );

    // Every refusal assertion above ran against deliberately written claims.
    // Remove the last mismatched claim so the final successful acquire
    // exercises the exact retained-owner read over a genuinely acquired
    // claim instead of being refused by the retained mismatched bytes.
    rmSync(leasePath);

    const lease = acquireWorktreeWriterLease(worktree, owner);
    const retained = readWorktreeWriterLease(leasePath, expected);
    expect(retained.pid).toBe(process.pid);
    expect(retained.raw).toBe(lease.content);
    releaseWorktreeWriterLease(lease);
  });
});

describe("O3 retained-claim inspection and recovery boundary", () => {
  test("classifies the retained claim as exact, absent, different-valid-owner, or invalid conservatively", () => {
    const current = fixture();
    const worktree = realpathSync(current.worktree);
    const leasePath = worktreeWriterLeasePath(worktree);
    const expected = { worktree, taskId: "task-owner", attemptId: randomUUID() };

    // Absent before any claim exists at the canonical path.
    expect(inspectRetainedWorktreeWriterLease(expected))
      .toEqual({ standing: "absent", leasePath });

    // Exact after an acquire for the same owner identity.
    const lease = acquireWorktreeWriterLease(worktree, {
      taskId: expected.taskId,
      attemptId: expected.attemptId,
    });
    const exact = inspectRetainedWorktreeWriterLease(expected);
    expect(exact.standing).toBe("exact");
    if (exact.standing === "exact") {
      expect(exact.leasePath).toBe(leasePath);
      expect(exact.pid).toBe(process.pid);
      expect(exact.raw).toBe(lease.content);
    }

    // A different but schema-valid owner is classified different-owner,
    // never exact.
    expect(inspectRetainedWorktreeWriterLease({ ...expected, attemptId: randomUUID() }))
      .toEqual({ standing: "different-owner", leasePath });
    releaseWorktreeWriterLease(lease);

    const base = {
      version: "rosso.task-run-worktree-lease.v1",
      worktree,
      taskId: expected.taskId,
      attemptId: expected.attemptId,
      pid: process.pid,
      acquiredAt: new Date().toISOString(),
    };
    const claim = (record: Record<string, unknown>): string =>
      `${JSON.stringify(record, null, 2)}\n`;

    // A wrong version, a missing field, a foreign Worktree, and
    // unparseable bytes are all invalid — never exact, never
    // different-owner, never absent.
    writeFileSync(leasePath, claim({ ...base, version: "some-other.version" }));
    expect(inspectRetainedWorktreeWriterLease(expected).standing).toBe("invalid");

    writeFileSync(leasePath, claim({
      version: "rosso.task-run-worktree-lease.v1",
      worktree,
      taskId: expected.taskId,
      attemptId: expected.attemptId,
      pid: process.pid,
    }));
    expect(inspectRetainedWorktreeWriterLease(expected).standing).toBe("invalid");

    writeFileSync(leasePath, claim({ ...base, worktree: realpathSync(current.primary) }));
    expect(inspectRetainedWorktreeWriterLease(expected).standing).toBe("invalid");

    writeFileSync(leasePath, "not-json\n");
    expect(inspectRetainedWorktreeWriterLease(expected).standing).toBe("invalid");

    // A recorded noncanonical path fails the canonical derivation check
    // even while an exact claim still occupies the canonical path.
    writeFileSync(leasePath, claim(base));
    const noncanonical = join(worktree, "somewhere-else.lock");
    expect(inspectRetainedWorktreeWriterLease({ ...expected, recordedLeasePath: noncanonical }).standing)
      .toBe("invalid");
    rmSync(leasePath);
  });

  test("recovers only an exact dead-owner claim by byte-matched release and never deletes anything else", () => {
    const current = fixture();
    const worktree = realpathSync(current.worktree);
    const leasePath = worktreeWriterLeasePath(worktree);
    const expected = { worktree, taskId: "task-owner", attemptId: randomUUID() };
    const claim = (record: Record<string, unknown>): string =>
      `${JSON.stringify(record, null, 2)}\n`;
    const base = {
      version: "rosso.task-run-worktree-lease.v1",
      worktree,
      taskId: expected.taskId,
      attemptId: expected.attemptId,
      acquiredAt: new Date().toISOString(),
    };

    // Absent is reported absent and never re-acquired.
    const absent = recoverRetainedWorktreeWriterLease(expected);
    expect(absent.outcome).toBe("absent");
    expect(existsSync(leasePath)).toBeFalse();

    // An exact claim with a live owner is refused with the claim retained.
    const liveBytes = claim({ ...base, pid: process.pid });
    writeFileSync(leasePath, liveBytes);
    const live = recoverRetainedWorktreeWriterLease(expected);
    expect(live.outcome).toBe("refused");
    if (live.outcome === "refused") expect(live.reason).toContain("still alive");
    expect(readFileSync(leasePath, "utf8")).toBe(liveBytes);

    // An exact claim with a provably absent owner is released.
    const deadBytes = claim({ ...base, pid: deadPid() });
    writeFileSync(leasePath, deadBytes);
    const released = recoverRetainedWorktreeWriterLease(expected);
    expect(released.outcome).toBe("released");
    expect(existsSync(leasePath)).toBeFalse();

    // A wrong-version claim with matching identity is refused and never
    // deleted.
    const wrongVersion = claim({ ...base, version: "some-other.version", pid: deadPid() });
    writeFileSync(leasePath, wrongVersion);
    const wrongVersionRecovery = recoverRetainedWorktreeWriterLease(expected);
    expect(wrongVersionRecovery.outcome).toBe("refused");
    expect(readFileSync(leasePath, "utf8")).toBe(wrongVersion);

    // A missing-field claim with matching identity is refused and never
    // deleted.
    const missingBytes = claim({
      version: "rosso.task-run-worktree-lease.v1",
      worktree,
      taskId: expected.taskId,
      attemptId: expected.attemptId,
      pid: deadPid(),
    });
    writeFileSync(leasePath, missingBytes);
    const missingRecovery = recoverRetainedWorktreeWriterLease(expected);
    expect(missingRecovery.outcome).toBe("refused");
    expect(readFileSync(leasePath, "utf8")).toBe(missingBytes);

    // A different valid owner's claim is reported and never deleted.
    const differentBytes = claim({
      ...base,
      attemptId: randomUUID(),
      pid: deadPid(),
    });
    writeFileSync(leasePath, differentBytes);
    const different = recoverRetainedWorktreeWriterLease(expected);
    expect(different.outcome).toBe("different-owner");
    expect(readFileSync(leasePath, "utf8")).toBe(differentBytes);

    // A claim bound to a recorded noncanonical path is refused and the
    // file at that path is never deleted.
    const noncanonical = join(worktree, "noncanonical.lock");
    const noncanonicalBytes = claim({ ...base, pid: deadPid() });
    writeFileSync(noncanonical, noncanonicalBytes);
    const noncanonicalRecovery = recoverRetainedWorktreeWriterLease({
      ...expected,
      recordedLeasePath: noncanonical,
    });
    expect(noncanonicalRecovery.outcome).toBe("refused");
    expect(existsSync(noncanonical)).toBeTrue();
    expect(readFileSync(noncanonical, "utf8")).toBe(noncanonicalBytes);
    rmSync(noncanonical);
    rmSync(leasePath);
  });
});

describe("O3 integration regressions", () => {
  test("an O3-held claim refuses an ordinary Task run and its exact release admits a fresh run", async () => {
    const current = fixture();
    const created = agentTask(current);
    const worktree = realpathSync(current.worktree);
    const held: WorktreeWriterLease = acquireWorktreeWriterLease(worktree, {
      taskId: created.task.id,
      attemptId: randomUUID(),
    });
    const executor = new RecordingExecutor();

    await expect(runTestTask(current.home, created.task.id, executor.execute))
      .rejects.toThrow("active task-run lease");
    expect(executor.requests).toHaveLength(0);

    // O2 acceptance: the durable Run request record exists before O3
    // acquisition, so the claim refusal leaves exactly one attributable
    // pre-Cell terminal Run/attempt family — with no invented Cell final —
    // and never touches the held foreign claim.
    const attemptsRoot = join(current.home, "state", "task-attempts");
    expect(existsSync(attemptsRoot)).toBeTrue();
    const retainedDirs = readdirSync(attemptsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    expect(retainedDirs).toHaveLength(1);
    const attemptId = retainedDirs[0]!;
    const retainedAttempt = JSON.parse(
      readFileSync(join(attemptsRoot, attemptId, "attempt.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(retainedAttempt).toMatchObject({
      version: "rosso.task-run-attempt.v1",
      taskId: created.task.id,
      attemptId,
      status: "started",
    });
    expect(typeof retainedAttempt.requestDigest).toBe("string");
    const retainedSettlement = JSON.parse(
      readFileSync(join(attemptsRoot, attemptId, "settlement.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(retainedSettlement).toMatchObject({
      version: "rosso.task-run-settlement.v1",
      taskId: created.task.id,
      attemptId,
      status: "runner-failed",
      error: expect.stringContaining("active task-run lease"),
    });
    // The claim was refused before any mutable preparation: no CellInput was
    // lowered and no Cell final was invented.
    expect(existsSync(join(attemptsRoot, attemptId, "cell-input.json"))).toBeFalse();
    expect(existsSync(join(attemptsRoot, attemptId, "cell-input.run.json"))).toBeFalse();
    // The held O3 claim bytes are preserved exactly by the refusal path.
    expect(readFileSync(held.path, "utf8")).toBe(held.content);

    releaseWorktreeWriterLease(held);
    await expect(runTestTask(current.home, created.task.id, executor.execute))
      .resolves.toBeTruthy();
    expect(executor.requests).toHaveLength(1);
  });

  test("an ordinary Task run holds the exact O3 claim during execution and releases it for reuse at settlement", async () => {
    const current = fixture();
    const created = agentTask(current);
    const worktree = realpathSync(current.worktree);
    let overlapError: string | undefined;
    const executor: TaskCellExecutor = async ({ cellInput }) => {
      try {
        acquireWorktreeWriterLease(worktree, {
          taskId: "another-task",
          attemptId: randomUUID(),
        });
      } catch (error) {
        overlapError = error instanceof Error ? error.message : String(error);
      }
      return validWorkCellRecord(cellInput, { runId: "fake-run-overlap" });
    };

    await expect(runTestTask(current.home, created.task.id, executor)).resolves.toBeTruthy();
    expect(overlapError).toContain("active task-run lease");

    // The settled ordinary run released the exact claim: the Worktree is
    // immediately reusable by a different writer identity.
    const successor = acquireWorktreeWriterLease(worktree, {
      taskId: "successor-task",
      attemptId: randomUUID(),
    });
    releaseWorktreeWriterLease(successor);
  });

  test("a temporary effectful contribution writer and an ordinary Task run pay the same O3 claim", async () => {
    const current = fixture();
    const created = agentTask(current);
    const worktree = realpathSync(current.worktree);
    const gated = gatedContributionDriver();
    const registry = createConversationContributionRegistry(current.home, {
      catalog: fakeCatalog(() => gated.driver),
    });
    const conversationId = randomUUID();
    await seedTaskAction(current.home, conversationId, current, {
      taskId: created.task.id,
      sourceRevision: 1,
    });
    const actor = { conversationId, turnId: randomUUID(), actionId: randomUUID() };
    const key = `evidence-${randomUUID().slice(0, 8)}`;

    const receipt = await registry.spawn({
      conversationId,
      turnId: actor.turnId,
      actionId: actor.actionId,
      operation: contributionOperation({ key, effectKind: "effectful" }),
    });
    expect(receipt.effectKind).toBe("effectful");

    // The contribution's durable reservation binding names the exact O3
    // claim path for the shared Worktree.
    const spawnRecord = readContributionSpawnReceipts(current.home, conversationId)[0]!;
    expect(spawnRecord.lease?.path).toBe(worktreeWriterLeasePath(worktree));

    // The contribution's O3 claim refuses the ordinary Task run on the same
    // Worktree before any executor effect.
    const executor = new RecordingExecutor();
    await expect(runTestTask(current.home, created.task.id, executor.execute))
      .rejects.toThrow("active task-run lease");
    expect(executor.requests).toHaveLength(0);

    // The contribution's exact terminal settlement releases the claim and
    // the Worktree is immediately reusable by an ordinary Task run.
    const handle = registry.contribution(receipt.batchId, receipt.key);
    expect(handle).toBeDefined();
    registry.control({
      batchId: receipt.batchId,
      key: receipt.key,
      control: "stop",
      actor: { conversationId, turnId: randomUUID(), actionId: randomUUID() },
    });
    await waitFor(
      () => registry.contribution(receipt.batchId, receipt.key)!.liveness().state !== "live",
      "the effectful contribution settles and releases the O3 claim",
    );

    await expect(runTestTask(current.home, created.task.id, executor.execute))
      .resolves.toBeTruthy();
    expect(executor.requests).toHaveLength(1);
  });
});

describe("O3 GitWorktreeMetadataPort without any Git repository", () => {
  test("two independent writer instances complete the exact acquire/inspect/release surface without cross-talk", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-o3-fake-port-"));
    temporaryRoots.push(root);
    const rawWorktree = join(root, "plain-directory");
    const rawMetadata = join(root, "fake-git-metadata");
    const rawOtherMetadata = join(root, "other-fake-git-metadata");
    mkdirSync(rawWorktree, { recursive: true });
    mkdirSync(rawMetadata, { recursive: true });
    mkdirSync(rawOtherMetadata, { recursive: true });
    const worktree = realpathSync(rawWorktree);
    const metadata = realpathSync(rawMetadata);
    const otherMetadata = realpathSync(rawOtherMetadata);
    // The fixture directory is intentionally not a Git repository.
    expect(existsSync(join(worktree, ".git"))).toBeFalse();

    // One instance/factory boundary per immutable port: two distinct ports
    // execute through independent writer instances with no cross-talk.
    const port: GitWorktreeMetadataPort = { canonicalGitDirectory: () => metadata };
    const otherPort: GitWorktreeMetadataPort = { canonicalGitDirectory: () => otherMetadata };
    const writer = createWorktreeWriter(port);
    const otherWriter = createWorktreeWriter(otherPort);

    // The exported free functions remain the one immutable production
    // default over the declared concrete Git adapter: deriving the claim
    // path without a Git repository still fails visibly.
    expect(() => worktreeWriterLeasePath(worktree)).toThrow(/not a git repository/);

    // Interleaved calls through the two instances never change one another.
    expect(writer.canonicalGitDirectory(worktree)).toBe(metadata);
    expect(otherWriter.canonicalGitDirectory(worktree)).toBe(otherMetadata);
    expect(writer.canonicalGitDirectory(worktree)).toBe(metadata);
    const leasePath = writer.worktreeWriterLeasePath(worktree);
    expect(leasePath).toBe(join(metadata, WORKTREE_WRITER_LEASE_FILENAME));
    const otherLeasePath = otherWriter.worktreeWriterLeasePath(worktree);
    expect(otherLeasePath).toBe(join(otherMetadata, WORKTREE_WRITER_LEASE_FILENAME));
    expect(writer.worktreeWriterLeasePath(worktree)).toBe(leasePath);

    const owner = { taskId: "fake-port-task", attemptId: randomUUID() };
    const lease = writer.acquireWorktreeWriterLease(worktree, owner);
    expect(WorktreeWriterLeaseSchema.parse(JSON.parse(lease.content))).toEqual({
      version: "rosso.task-run-worktree-lease.v1",
      worktree,
      taskId: owner.taskId,
      attemptId: owner.attemptId,
      pid: process.pid,
      acquiredAt: expect.any(String),
    });
    expect(readFileSync(lease.path, "utf8")).toBe(lease.content);

    // No-clobber and byte-match behavior keep the frozen O3 surface even
    // when the metadata directory is not a Git metadata directory at all.
    expect(() => writer.acquireWorktreeWriterLease(worktree, {
      taskId: "second-owner",
      attemptId: randomUUID(),
    })).toThrow(
      `task Worktree already has an active task-run lease: ${worktree}; lease: ${lease.path}`,
    );
    // The other instance's port is fully independent: its own acquire
    // succeeds concurrently in its own metadata directory while the first
    // instance's claim is still held.
    const otherOwner = { taskId: "other-port-task", attemptId: randomUUID() };
    const otherLease = otherWriter.acquireWorktreeWriterLease(worktree, otherOwner);
    expect(otherLease.path).toBe(otherLeasePath);
    expect(readFileSync(otherLease.path, "utf8")).toBe(otherLease.content);

    const expected = { ...owner, worktree };
    expect(writer.readWorktreeWriterLease(lease.path, expected).raw).toBe(lease.content);
    expect(writer.inspectRetainedWorktreeWriterLease(expected).standing).toBe("exact");
    expect(writer.inspectRetainedWorktreeWriterLease({ ...expected, attemptId: randomUUID() }).standing)
      .toBe("different-owner");

    // The byte-matched release of one instance never touches the other
    // instance's claim.
    writer.releaseWorktreeWriterLease(lease);
    expect(writer.inspectRetainedWorktreeWriterLease(expected))
      .toEqual({ standing: "absent", leasePath });
    expect(readFileSync(otherLease.path, "utf8")).toBe(otherLease.content);
    otherWriter.releaseWorktreeWriterLease(otherLease);
    expect(existsSync(otherLease.path)).toBeFalse();
  });

  test("completes the exact recovery surface through an independent writer instance", () => {
    const root = mkdtempSync(join(tmpdir(), "rossovia-o3-fake-port-"));
    temporaryRoots.push(root);
    const rawWorktree = join(root, "plain-directory");
    const rawMetadata = join(root, "fake-git-metadata");
    mkdirSync(rawWorktree, { recursive: true });
    mkdirSync(rawMetadata, { recursive: true });
    const worktree = realpathSync(rawWorktree);
    const metadata = realpathSync(rawMetadata);
    expect(existsSync(join(worktree, ".git"))).toBeFalse();
    const port: GitWorktreeMetadataPort = { canonicalGitDirectory: () => metadata };
    const writer = createWorktreeWriter(port);
    const leasePath = writer.worktreeWriterLeasePath(worktree);
    const expected = { worktree, taskId: "fake-port-task", attemptId: randomUUID() };
    const claim = (record: Record<string, unknown>): string =>
      `${JSON.stringify(record, null, 2)}\n`;
    const base = {
      version: "rosso.task-run-worktree-lease.v1",
      worktree,
      taskId: expected.taskId,
      attemptId: expected.attemptId,
      acquiredAt: new Date().toISOString(),
    };

    // Absent is reported absent and never re-acquired.
    expect(writer.recoverRetainedWorktreeWriterLease(expected).outcome).toBe("absent");
    expect(existsSync(leasePath)).toBeFalse();

    // An exact claim with a live owner is refused with the bytes retained.
    const liveBytes = claim({ ...base, pid: process.pid });
    writeFileSync(leasePath, liveBytes);
    const live = writer.recoverRetainedWorktreeWriterLease(expected);
    expect(live.outcome).toBe("refused");
    expect(readFileSync(leasePath, "utf8")).toBe(liveBytes);

    // An exact claim with a provably absent owner is released.
    const deadBytes = claim({ ...base, pid: deadPid() });
    writeFileSync(leasePath, deadBytes);
    const released = writer.recoverRetainedWorktreeWriterLease(expected);
    expect(released.outcome).toBe("released");
    expect(existsSync(leasePath)).toBeFalse();

    // A different valid owner's claim is reported and never deleted.
    const otherBytes = claim({ ...base, attemptId: randomUUID(), pid: deadPid() });
    writeFileSync(leasePath, otherBytes);
    const different = writer.recoverRetainedWorktreeWriterLease(expected);
    expect(different.outcome).toBe("different-owner");
    expect(readFileSync(leasePath, "utf8")).toBe(otherBytes);
    rmSync(leasePath);
  });
});

const FAKE_WORKER_ID = "fake-worker";
const FAKE_PROVIDER = "fake-provider";
const FAKE_MODEL = "fake-model";

function fakeCard(): WorkerCard {
  return {
    version: "work-cell.worker-card.v1",
    id: FAKE_WORKER_ID,
    labels: ["coding", "text", "read", "write", "evidence", "review"],
    description: "Deterministic fake catalog worker for O3 writer tests.",
    executionProfile: {
      id: FAKE_WORKER_ID,
      version: "execution-profile.v1",
      provider: FAKE_PROVIDER,
      model: FAKE_MODEL,
      reasoningEffort: "max",
      parallelism: "serial",
    },
    availability: { status: "available" },
  };
}

function fakeCatalog(createDriver: () => CellDriver): WorkerCatalog {
  return new WorkerCatalog([{ card: fakeCard(), createDriver }]);
}

function gatedContributionDriver(): { driver: CellDriver; release: () => void } {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    release,
    driver: {
      descriptor: { adapter: "ai-sdk-v7", provider: FAKE_PROVIDER, model: FAKE_MODEL },
      async run(_input, context): Promise<DriverResult> {
        context.emit("agent.step.started", { stepNumber: 1, activeTools: ["read_file"] });
        await Promise.race([
          gate,
          new Promise<void>((resolve) => {
            context.signal.addEventListener("abort", () => resolve(), { once: true });
          }),
        ]);
        context.emit("agent.step.finished", { finishReason: "stop" });
        return {
          terminalToolsCalled: [CONTRIBUTION_TERMINAL_TOOL],
          finalText: "The bounded O3 writer fixture conclusion.",
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 },
          rawSteps: [],
        };
      },
    },
  };
}

function contributionOperation(overrides: {
  key: string;
  effectKind: "read-only" | "effectful";
}): Extract<ConversationOperation, { kind: "contribution_spawn" }> {
  return {
    kind: "contribution_spawn",
    key: overrides.key,
    intent: "Produce the bounded O3 writer evidence conclusion.",
    capabilityNeed: "evidence",
    effectKind: overrides.effectKind,
    workerId: FAKE_WORKER_ID,
    dependsOn: [],
  } as Extract<ConversationOperation, { kind: "contribution_spawn" }>;
}

const FAKE_REQUESTED_POLICY = {
  provider: "fake-coordinator",
  model: "fake.v1",
  thinking: "disabled",
  reasoningEffort: "none",
} as const;

async function seedTaskAction(
  home: string,
  conversationId: string,
  fixture_: Fixture,
  task: { taskId: string; sourceRevision: number },
): Promise<void> {
  const journal = new FileConversationJournal(home);
  const turnId = randomUUID();
  const actionId = randomUUID();
  const receipt = await journal.submitMessage(conversationId, {
    clientMessageId: randomUUID(),
    payload: "create the bounded O3 writer fixture task",
  });
  const messageId = receipt.event.data.messageId;
  await journal.startTurn(conversationId, {
    turnId,
    messageId,
    requestedPolicy: FAKE_REQUESTED_POLICY,
  });
  await journal.requestAction(conversationId, {
    actionId,
    turnId,
    messageId,
    operation: {
      kind: "task_create",
      title: "Run one O3 writer task",
      objective: "Exercise the exact shared-Worktree writer owner",
      acceptance: ["The writer exclusion is observable"],
      projectId: "repository:o3-worktree-writer",
      expectedPrimaryHead: fixture_.primaryHead,
      worktreePath: fixture_.worktree,
      expectedWorktreeHead: fixture_.worktreeHead,
    } as ConversationOperation,
  });
  await journal.settleAction(conversationId, {
    actionId,
    turnId,
    messageId,
    evidenceRefs: [taskReceiptEvidenceRef(task.taskId, task.sourceRevision)],
  });
}

async function waitFor(
  condition: () => boolean | Promise<boolean>,
  label: string,
  timeoutMs = 10_000,
): Promise<void> {
  const started = Date.now();
  while (!(await condition())) {
    if (Date.now() - started > timeoutMs) throw new Error(`timed out waiting for ${label}`);
    await Bun.sleep(10);
  }
}
