import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { isAbsolute, join, relative, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import type {
  CellInput,
  CellRunRecord,
} from "../../../packages/work-cell/src/contracts";
import type { WorkerCard } from "../../../packages/work-cell/src/worker-catalog";
import { loadHome, resolveHome, workspaceFor } from "./home";
import { runCommand } from "./process";
import { showPrincipalTaskAttempts } from "./task-attempts";
import { showPrincipalTask } from "./tasks";
import { requiredGit } from "./workspace";

const ORDINARY_OPENCODE_EXCLUDES = [
  ".git",
  "node_modules",
  "dist",
  "build",
  "target",
  "coverage",
  ".next",
  "outputs",
  ".work-cell",
  ".reasonix",
] as const;

// Ordinary project work must not inherit Work Cell's five-minute probe default.
// OpenCode has no completed-step budget-control adapter yet, so this is a broad
// emergency ceiling rather than a user-facing approval mechanism.
const ORDINARY_TASK_MAX_DURATION_MS = 30 * 60 * 1_000;

const requireFromHere = createRequire(import.meta.url);

const WorkCellCliResultSchema = z.object({
  output: z.string().min(1),
  runId: z.string().min(1),
  status: z.string().min(1),
}).passthrough();

export interface TaskRunArguments {
  id: string;
  /** Worker selected from the current worker policy catalog. */
  workerId: string;
  /** Continue the latest retained same-session branch instead of starting fresh. */
  continueRun?: boolean;
}

export interface TaskRunRequest {
  inputPath: string;
  finalRecordPath: string;
  driver: "opencode-cli";
  model: string;
  reasoningEffort?: string;
  session?: string;
}

export interface TaskRunRunnerResult {
  runId: string;
  status: string;
}

export interface TaskRunRunner {
  run(request: TaskRunRequest): TaskRunRunnerResult;
}

interface TaskRunDependencies {
  /** Test seam for reproducing drift after initial binding resolution. */
  beforeLeaseAcquire?(): void;
  /** Test seam for worker card resolution; the default reads the current worker policy catalog. */
  resolveWorkerCard?(workerId: string): WorkerCard;
}

export interface TaskRunResult {
  version: "rosso.task-run-result.v1";
  taskId: string;
  taskRevision: number;
  sourceRevision: number;
  attemptId: string;
  inputRef: string;
  finalRecordRef: string;
  attemptRef: string;
  settlementRef: string;
  workCellRunId: string;
  cellStatus: CellRunRecord["status"];
  /** Actual OpenCode session id observed in the Work Cell final record. */
  sessionId: string;
  semanticAcceptance: "not-evaluated";
}

export interface TaskWorkerListResult {
  version: "rosso.task-worker-list.v1";
  workers: Array<{
    id: string;
    labels: string[];
    description: string;
    provider: string;
    model: string;
    reasoningEffort: string;
    availability: WorkerCard["availability"];
  }>;
}

export function listPrincipalTaskWorkers(
  environment: NodeJS.ProcessEnv = process.env,
): TaskWorkerListResult {
  return {
    version: "rosso.task-worker-list.v1",
    workers: currentWorkerPolicy().currentWorkerCards(environment).map((card) => ({
      id: card.id,
      labels: [...card.labels],
      description: card.description,
      provider: card.executionProfile.provider,
      model: card.executionProfile.model,
      reasoningEffort: card.executionProfile.reasoningEffort ?? "provider-default",
      availability: structuredClone(card.availability),
    })),
  };
}

export class WorkCellCliRunner implements TaskRunRunner {
  run(request: TaskRunRequest): TaskRunRunnerResult {
    const repositoryRoot = resolve(import.meta.dir, "../../..");
    const result = Bun.spawnSync([
      process.execPath,
      join(repositoryRoot, "packages", "work-cell", "src", "cli.ts"),
      "run",
      request.inputPath,
      "--driver",
      request.driver,
      "--model",
      request.model,
      ...(request.reasoningEffort
        ? ["--reasoning-effort", request.reasoningEffort]
        : []),
      ...(request.session ? ["--session", request.session] : []),
    ], {
      cwd: repositoryRoot,
      stdout: "pipe",
      stderr: "inherit",
    });
    if (result.exitCode !== 0) {
      throw new Error(`Work Cell CLI exited with code ${result.exitCode}`);
    }
    const parsed = WorkCellCliResultSchema.parse(JSON.parse(result.stdout.toString()));
    if (realpathSync(parsed.output) !== realpathSync(request.finalRecordPath)) {
      throw new Error(
        `Work Cell retained an unexpected final record: expected ${request.finalRecordPath}, observed ${parsed.output}`,
      );
    }
    return { runId: parsed.runId, status: parsed.status };
  }
}

export function runPrincipalTask(
  homeArgument: string | undefined,
  arguments_: TaskRunArguments,
  runner: TaskRunRunner = new WorkCellCliRunner(),
  dependencies: TaskRunDependencies = {},
): TaskRunResult {
  validatePolicy(arguments_);
  const home = resolveHome(homeArgument);
  const card = resolveWorkerCard(arguments_.workerId, dependencies);
  const execution = deriveExecutionRequest(card);
  const observed = showPrincipalTask(home, arguments_.id);
  const task = observed.task;
  if (task.lifecycle === "settled") {
    throw new Error(`cannot run settled task ${task.id}; completed tasks are viewable history`);
  }
  if (task.lifecycle !== "open" || task.nextActor !== "agent") {
    throw new Error(`task ${task.id} must be open and assigned to the Agent before it can run`);
  }
  if (task.binding.kind !== "project-context" || task.binding.worktreePath === undefined) {
    throw new Error(`task ${task.id} must be bound to an existing project Worktree before it can run`);
  }

  const worktree = resolveBoundWorktree(
    home,
    task.binding.projectId,
    task.binding.worktreePath,
  );
  const attemptId = randomUUID();

  dependencies.beforeLeaseAcquire?.();
  const lease = acquireWorktreeLease(worktree, task.id, attemptId);
  try {
    verifyTaskSnapshotAfterLease(home, observed);
    verifyCurrentBinding(home, task.binding.projectId, worktree);
    const continuation = arguments_.continueRun
      ? continuationEvidence(home, task.id, worktree)
      : undefined;
    if (continuation !== undefined) {
      verifyContinuationDiff(worktree, continuation.workspaceDiff);
    } else {
      verifyCleanStatus(worktree);
    }
    const attempt = createAttempt(
      home,
      task,
      observed.sourceRevision,
      attemptId,
      worktree,
      arguments_.workerId,
      card,
      execution,
      continuation,
    );
    const runnerResult = runner.run({
      inputPath: attempt.inputPath,
      finalRecordPath: attempt.finalRecordPath,
      driver: execution.driver,
      model: execution.model,
      ...(execution.reasoningEffort
        ? { reasoningEffort: execution.reasoningEffort }
        : {}),
      ...(continuation ? { session: continuation.session } : {}),
    });
    const finalRecord = validateFinalRecord(
      attempt.finalRecordPath,
      attempt.expectedCellInput,
      runnerResult,
      execution.model,
      continuation?.session,
    );
    writeImmutableJson(attempt.settlementPath, {
      version: "rosso.task-run-settlement.v1",
      taskId: task.id,
      taskRevision: task.revision,
      attemptId,
      inputRef: attempt.inputRef,
      finalRecordRef: attempt.finalRecordRef,
      status: "recorded",
      workCellRunId: finalRecord.runId,
      cellStatus: finalRecord.status,
      semanticAcceptance: "not-evaluated",
      settledAt: new Date().toISOString(),
    });
    return {
      version: "rosso.task-run-result.v1",
      taskId: task.id,
      taskRevision: task.revision,
      sourceRevision: observed.sourceRevision,
      attemptId,
      inputRef: attempt.inputRef,
      finalRecordRef: attempt.finalRecordRef,
      attemptRef: attempt.attemptRef,
      settlementRef: attempt.settlementRef,
      workCellRunId: finalRecord.runId,
      cellStatus: finalRecord.status,
      sessionId: finalRecord.executionObservation.sessionId!,
      semanticAcceptance: "not-evaluated",
    };
  } catch (error: unknown) {
    const attempt = attemptEvidence(home, attemptId);
    if (existsSync(attempt.attemptPath) && !existsSync(attempt.settlementPath)) {
      writeImmutableJson(attempt.settlementPath, {
        version: "rosso.task-run-settlement.v1",
        taskId: task.id,
        taskRevision: task.revision,
        attemptId,
        inputRef: attempt.inputRef,
        finalRecordRef: attempt.finalRecordRef,
        status: "runner-failed",
        semanticAcceptance: "not-evaluated",
        error: error instanceof Error ? error.message : String(error),
        settledAt: new Date().toISOString(),
      });
    }
    throw error;
  } finally {
    releaseWorktreeLease(lease);
  }
}

function continuationEvidence(
  home: string,
  taskId: string,
  worktree: string,
): { session: string; workspaceDiff: CellRunRecord["workspaceDiff"] } {
  const observed = observedRetainedSessions(home, taskId, worktree);
  const latest = observed.at(-1);
  if (latest === undefined) {
    throw new Error(`task ${taskId} has no usable recorded Work Cell attempt in the current Worktree`);
  }
  const cumulative = {
    added: new Set<string>(),
    changed: new Set<string>(),
    removed: new Set<string>(),
  };
  let hasPathAnchor = false;
  for (let index = observed.length - 1; index >= 0; index -= 1) {
    const attempt = observed[index]!;
    if (attempt.session !== latest.session) break;
    if (attempt.workspaceDiff !== undefined) {
      hasPathAnchor = true;
      for (const kind of ["added", "changed", "removed"] as const) {
        for (const path of attempt.workspaceDiff[kind]) cumulative[kind].add(path);
      }
    }
    if (attempt.requestedSession === undefined) break;
    if (attempt.requestedSession !== latest.session) break;
  }
  if (!hasPathAnchor) {
    throw new Error(
      `task ${taskId} has no usable recorded Work Cell attempt in the current Worktree session branch`,
    );
  }
  return {
    session: latest.session,
    workspaceDiff: {
      added: [...cumulative.added].sort(),
      changed: [...cumulative.changed].sort(),
      removed: [...cumulative.removed].sort(),
    },
  };
}

function observedRetainedSessions(
  home: string,
  taskId: string,
  worktree: string,
): Array<{
  session: string;
  requestedSession?: string;
  workspaceDiff?: CellRunRecord["workspaceDiff"];
}> {
  const attempts = showPrincipalTaskAttempts(home, taskId);
  const observed: Array<{
    session: string;
    requestedSession?: string;
    workspaceDiff?: CellRunRecord["workspaceDiff"];
  }> = [];
  for (const attempt of attempts) {
    if (
      attempt.observedSession === undefined
      || attempt.evidence.finalRecord.standing !== "available"
    ) continue;
    try {
      const record = workCellContracts().CellRunRecordSchema.parse(
        JSON.parse(readFileSync(join(home, attempt.finalRecordRef), "utf8")),
      ) as CellRunRecord;
      if (realpathSync(record.input.workspace.root) !== worktree) continue;
      const pathAnchor = attempt.status === "recorded"
        && attempt.cellStatus === "passed"
        && attempt.workspaceDiff !== undefined
        && Object.values(attempt.evidence).every((source) => source.standing === "available");
      observed.push({
        session: attempt.observedSession,
        ...(attempt.requestedSession !== undefined
          ? { requestedSession: attempt.requestedSession }
          : {}),
        ...(pathAnchor ? { workspaceDiff: attempt.workspaceDiff } : {}),
      });
    } catch {
      // Only an attributable final record in the exact Worktree can affect session continuity.
    }
  }
  return observed;
}

function verifyContinuationDiff(
  worktree: string,
  retained: CellRunRecord["workspaceDiff"],
): void {
  const retainedPaths = new Set([
    ...retained.added,
    ...retained.changed,
    ...retained.removed,
  ]);
  const currentPaths = gitVisiblePaths(worktree);
  const extraPaths = [...currentPaths].filter((path) => !retainedPaths.has(path)).sort();
  if (extraPaths.length > 0) {
    throw new Error(
      `task Worktree has Git-visible paths outside the retained same-session workspace diff history: ${extraPaths.join(", ")}`,
    );
  }
}

function gitVisiblePaths(worktree: string): Set<string> {
  const result = runCommand(
    "git",
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    { cwd: worktree },
  );
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || `git status failed in ${worktree}`);
  }
  if (!result.stdout) return new Set();
  const fields = result.stdout.split("\0");
  if (fields.pop() !== "") throw new Error("Git porcelain v1 -z output was not NUL-terminated");
  const paths = new Set<string>();
  for (let index = 0; index < fields.length; index += 1) {
    const entry = fields[index]!;
    if (entry.length < 4 || entry[2] !== " ") {
      throw new Error("Git porcelain v1 -z output contained an invalid status entry");
    }
    const status = entry.slice(0, 2);
    paths.add(entry.slice(3));
    if (status.includes("R") || status.includes("C")) {
      const source = fields[index + 1];
      if (!source) throw new Error("Git porcelain v1 -z rename entry lacked its source path");
      paths.add(source);
      index += 1;
    }
  }
  return paths;
}

interface TaskRunLease {
  path: string;
  content: string;
}

function acquireWorktreeLease(
  worktree: string,
  taskId: string,
  attemptId: string,
): TaskRunLease {
  const gitDirectory = canonicalGitDirectory(worktree);
  const path = join(gitDirectory, "rossovia-task-run.lock");
  const content = `${JSON.stringify({
    version: "rosso.task-run-worktree-lease.v1",
    worktree,
    taskId,
    attemptId,
    pid: process.pid,
    acquiredAt: new Date().toISOString(),
  }, null, 2)}\n`;
  try {
    writeFileSync(path, content, { encoding: "utf8", flag: "wx" });
  } catch (error: unknown) {
    if (isAlreadyExists(error)) {
      throw new Error(
        `task Worktree already has an active task-run lease: ${worktree}; lease: ${path}`,
      );
    }
    throw error;
  }
  return { path, content };
}

interface AttemptEvidence {
  inputPath: string;
  finalRecordPath: string;
  attemptPath: string;
  settlementPath: string;
  inputRef: string;
  finalRecordRef: string;
  attemptRef: string;
  settlementRef: string;
}

function createAttempt(
  home: string,
  task: ReturnType<typeof showPrincipalTask>["task"],
  sourceRevision: number,
  attemptId: string,
  worktree: string,
  workerId: string,
  worker: WorkerCard,
  execution: TaskRunExecution,
  continuation?: { session: string; workspaceDiff: CellRunRecord["workspaceDiff"] },
): AttemptEvidence & { expectedCellInput: CellInput } {
  const attempt = attemptEvidence(home, attemptId);
  const cellInput = {
    id: `workbench-task-${task.id}-attempt-${attemptId}`,
    workerId,
    executionProfile: worker.executionProfile,
    intent: task.objective,
    workspace: {
      root: worktree,
      readPaths: ["."],
      writePaths: ["."],
      excludePaths: ordinaryOpenCodeExcludes(worktree),
      allowedCommands: [],
    },
    instructions: [
      "Complete the current Workbench Task in the bound worktree. Do not claim semantic acceptance.",
      ...task.corrections.map((correction) => correction.statement),
    ],
    capabilities: [],
    context: [],
    capabilitiesRequired: [],
    acceptance: task.acceptance,
    budget: { maxDurationMs: ORDINARY_TASK_MAX_DURATION_MS },
  };
  const expectedCellInput = workCellContracts().CellInputSchema.parse(cellInput) as CellInput;
  mkdirSync(join(home, "state", "task-attempts"), { recursive: true });
  mkdirSync(join(home, "state", "task-attempts", attemptId), { recursive: false });
  writeImmutableJson(attempt.inputPath, cellInput);
  writeImmutableJson(attempt.attemptPath, {
    version: "rosso.task-run-attempt.v1",
    taskId: task.id,
    taskRevision: task.revision,
    sourceRevision,
    attemptId,
    inputRef: attempt.inputRef,
    finalRecordRef: attempt.finalRecordRef,
    workerId,
    driver: execution.driver,
    model: execution.model,
    ...(execution.reasoningEffort
      ? { reasoningEffort: execution.reasoningEffort }
      : {}),
    ...(continuation ? { session: continuation.session } : {}),
    status: "started",
    startedAt: new Date().toISOString(),
  });
  return { ...attempt, expectedCellInput };
}

function attemptEvidence(home: string, attemptId: string): AttemptEvidence {
  const directory = join(home, "state", "task-attempts", attemptId);
  const inputPath = join(directory, "cell-input.json");
  const finalRecordPath = join(directory, "cell-input.run.json");
  const attemptPath = join(directory, "attempt.json");
  const settlementPath = join(directory, "settlement.json");
  return {
    inputPath,
    finalRecordPath,
    attemptPath,
    settlementPath,
    inputRef: evidenceRef(home, inputPath),
    finalRecordRef: evidenceRef(home, finalRecordPath),
    attemptRef: evidenceRef(home, attemptPath),
    settlementRef: evidenceRef(home, settlementPath),
  };
}

function canonicalGitDirectory(worktree: string): string {
  const raw = requiredGit(["rev-parse", "--git-dir"], worktree);
  return realpathSync(isAbsolute(raw) ? raw : resolve(worktree, raw));
}

function ordinaryOpenCodeExcludes(worktree: string): string[] {
  const tracked = (requiredGit(["ls-files", "-z"], worktree) ?? "")
    .split("\0")
    .filter(Boolean);
  return ORDINARY_OPENCODE_EXCLUDES.filter((candidate) =>
    !tracked.some((path) => path.split("/").includes(candidate))
  );
}

function releaseWorktreeLease(lease: TaskRunLease): void {
  if (readFileSync(lease.path, "utf8") !== lease.content) {
    throw new Error(`task-run lease ownership changed before release: ${lease.path}`);
  }
  rmSync(lease.path);
}

function validateFinalRecord(
  path: string,
  expectedInput: CellInput,
  runnerResult: TaskRunRunnerResult,
  model: string,
  requestedSession?: string,
): CellRunRecord {
  let record: CellRunRecord;
  try {
    record = workCellContracts().CellRunRecordSchema.parse(
      JSON.parse(readFileSync(path, "utf8")),
    ) as CellRunRecord;
  } catch (error: unknown) {
    throw new Error(
      `invalid Work Cell final record at ${path}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
  if (record.cellId !== expectedInput.id) {
    throw new Error(`Work Cell final record cell id does not match immutable input: ${record.cellId}`);
  }
  if (!isDeepStrictEqual(record.input, expectedInput)) {
    throw new Error("Work Cell final record input does not match immutable CellInput");
  }
  if (record.runId !== runnerResult.runId || record.status !== runnerResult.status) {
    throw new Error("Work Cell final record run id/status does not match runner settlement");
  }
  if (
    record.driver.adapter !== "opencode-cli.v1"
    || record.driver.provider !== model.split("/", 1)[0]
    || record.driver.model !== model
  ) {
    throw new Error(`Work Cell final record driver does not match requested OpenCode model: ${model}`);
  }
  const observedSession = record.executionObservation.sessionId;
  if (!observedSession) {
    throw new Error("Work Cell final record did not retain the observed OpenCode session id");
  }
  if (requestedSession !== undefined && requestedSession !== observedSession) {
    throw new Error(
      `requested OpenCode session does not match the observed session: requested ${requestedSession}, observed ${observedSession}`,
    );
  }
  return record;
}

function workCellContracts(): typeof import("../../../packages/work-cell/src/contracts") {
  return requireFromHere("../../../packages/work-cell/src/contracts");
}

// The sibling worker policy is loaded only when worker list/task run actually
// need it, so a minimal Workbench-only CLI fixture (without Autonomy) can still
// load for setup and other local task commands. currentWorkerCards remains the
// single worker policy source; there is no fallback or copied default here.
function currentWorkerPolicy(): typeof import("../../autonomy/src/worker-policy") {
  return requireFromHere("../../autonomy/src/worker-policy");
}

function isAlreadyExists(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "EEXIST";
}

function validatePolicy(arguments_: TaskRunArguments): void {
  if (!arguments_.workerId.trim()) throw new Error("task run --worker must be a non-empty worker id");
}

interface TaskRunExecution {
  driver: "opencode-cli";
  model: string;
  reasoningEffort?: string;
}

function resolveWorkerCard(
  workerId: string,
  dependencies: TaskRunDependencies,
): WorkerCard {
  if (dependencies.resolveWorkerCard) return dependencies.resolveWorkerCard(workerId);
  const card = currentWorkerPolicy().currentWorkerCards().find((candidate) => candidate.id === workerId);
  if (card === undefined) throw new Error(`unknown worker ${workerId}; run 'rossovia worker list'`);
  if (card.availability.status === "unavailable") {
    throw new Error(`worker ${workerId} is unavailable: ${card.availability.reason}`);
  }
  return card;
}

function deriveExecutionRequest(card: WorkerCard): TaskRunExecution {
  const { provider, model, reasoningEffort } = card.executionProfile;
  return {
    driver: "opencode-cli",
    model: model.includes("/") ? model : `${provider}/${model}`,
    ...(reasoningEffort ? { reasoningEffort } : {}),
  };
}

function resolveBoundWorktree(
  home: string,
  projectId: string,
  configuredWorktree: string,
): string {
  if (!existsSync(configuredWorktree)) {
    throw new Error(`task Worktree does not exist: ${configuredWorktree}`);
  }
  const worktree = realpathSync(configuredWorktree);
  verifyCurrentBinding(home, projectId, worktree);
  return worktree;
}

function verifyTaskSnapshotAfterLease(
  home: string,
  expected: ReturnType<typeof showPrincipalTask>,
): void {
  const current = showPrincipalTask(home, expected.task.id);
  if (
    current.sourceRevision !== expected.sourceRevision
    || current.task.revision !== expected.task.revision
    || current.task.lifecycle !== expected.task.lifecycle
    || current.task.nextActor !== expected.task.nextActor
    || !isDeepStrictEqual(current.task.binding, expected.task.binding)
  ) {
    throw new Error(
      `task ${expected.task.id} changed before attempt creation after the task-run lease was acquired`,
    );
  }
}

function verifyCleanStatus(worktree: string): void {
  const status = requiredGit(["status", "--porcelain"], worktree) ?? "";
  if (status.trim()) throw new Error(`task Worktree is not clean: ${worktree}`);
}

function verifyCurrentBinding(home: string, projectId: string, worktree: string): void {
  const current = loadHome(home);
  const primary = realpathSync(workspaceFor(current.workspaces, projectId).path);
  if (worktree === primary) {
    throw new Error(`task ${projectId} must use an isolated Worktree rather than the primary workspace`);
  }
  const observed = requiredGit(["worktree", "list", "--porcelain"], primary)
    .split(/\r?\n/u)
    .filter((line) => line.startsWith("worktree "))
    .map((line) => realpathSync(line.slice("worktree ".length)));
  if (!observed.includes(worktree)) {
    throw new Error(`task Worktree is not currently bound to registered project ${projectId}: ${worktree}`);
  }
}

function evidenceRef(home: string, path: string): string {
  const ref = relative(home, path);
  if (!ref || isAbsolute(ref) || ref.split(/[\\/]/u).includes("..")) {
    throw new Error(`task attempt path escapes Rossovia home: ${path}`);
  }
  return ref;
}

function writeImmutableJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
}
