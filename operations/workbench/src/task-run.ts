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
import { loadHome, resolveHome, workspaceFor } from "./home";
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

const requireFromHere = createRequire(import.meta.url);

const WorkCellCliResultSchema = z.object({
  output: z.string().min(1),
  runId: z.string().min(1),
  status: z.string().min(1),
}).passthrough();

export interface TaskRunArguments {
  id: string;
  expectedSourceRevision: number;
  expectedRevision: number;
  driver: "opencode-cli";
  model: string;
  variant?: string;
  /** OpenCode session id retained by a previous attempt of the same active task. */
  session?: string;
}

export interface TaskRunRequest {
  inputPath: string;
  finalRecordPath: string;
  driver: "opencode-cli";
  model: string;
  variant?: string;
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
      ...(request.variant ? ["--variant", request.variant] : []),
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
  const observed = showPrincipalTask(home, arguments_.id);
  if (observed.sourceRevision !== arguments_.expectedSourceRevision) {
    throw new Error(
      `Principal task source revision is stale: expected ${arguments_.expectedSourceRevision}, current ${observed.sourceRevision}`,
    );
  }
  if (observed.task.revision !== arguments_.expectedRevision) {
    throw new Error(
      `task revision is stale for ${observed.task.id}: expected ${arguments_.expectedRevision}, current ${observed.task.revision}`,
    );
  }
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
    verifyCurrentBinding(home, task.binding.projectId, worktree);
    if (arguments_.session) {
      const retained = validateRetainedTaskSession(home, task.id, worktree, arguments_.session);
      verifyContinuationDiff(worktree, retained.workspaceDiff);
    } else {
      verifyCleanStatus(worktree);
    }
    const attempt = createAttempt(
      home,
      task,
      observed.sourceRevision,
      attemptId,
      worktree,
      arguments_,
    );
    const runnerResult = runner.run({
      inputPath: attempt.inputPath,
      finalRecordPath: attempt.finalRecordPath,
      driver: arguments_.driver,
      model: arguments_.model,
      ...(arguments_.variant ? { variant: arguments_.variant } : {}),
      ...(arguments_.session ? { session: arguments_.session } : {}),
    });
    const finalRecord = validateFinalRecord(
      attempt.finalRecordPath,
      attempt.expectedCellInput,
      runnerResult,
      arguments_.model,
      arguments_.session,
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

function validateRetainedTaskSession(
  home: string,
  taskId: string,
  worktree: string,
  requestedSession: string,
): Pick<CellRunRecord, "workspaceDiff"> {
  const attempts = showPrincipalTaskAttempts(home, taskId);
  let latest: { session: string; workspaceDiff: CellRunRecord["workspaceDiff"] } | undefined;
  for (let index = attempts.length - 1; index >= 0; index -= 1) {
    const attempt = attempts[index]!;
    if (
      attempt.status !== "recorded"
      || attempt.observedSession === undefined
      || attempt.workspaceDiff === undefined
      || Object.values(attempt.evidence).some((source) => source.standing !== "available")
    ) continue;
    try {
      const record = workCellContracts().CellRunRecordSchema.parse(
        JSON.parse(readFileSync(join(home, attempt.finalRecordRef), "utf8")),
      ) as CellRunRecord;
      if (realpathSync(record.input.workspace.root) !== worktree) continue;
      latest = { session: attempt.observedSession, workspaceDiff: attempt.workspaceDiff };
      break;
    } catch {
      // Only a valid recorded attempt and owner-backed final record can admit continuation.
    }
  }
  if (latest === undefined) {
    throw new Error(`task ${taskId} has no usable recorded Work Cell attempt in the current Worktree`);
  }
  if (latest.session !== requestedSession) {
    throw new Error(
      `task ${taskId} latest usable OpenCode session in the current Worktree is ${latest.session}, not ${requestedSession}`,
    );
  }
  return { workspaceDiff: latest.workspaceDiff };
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
  const currentPaths = new Set([
    ...nulSeparatedPaths(requiredGit(["diff", "--name-only", "--no-renames", "-z", "--"], worktree)),
    ...nulSeparatedPaths(requiredGit(["diff", "--cached", "--name-only", "--no-renames", "-z", "--"], worktree)),
    ...nulSeparatedPaths(requiredGit(["ls-files", "--others", "--exclude-standard", "-z"], worktree)),
  ]);
  const extraPaths = [...currentPaths].filter((path) => !retainedPaths.has(path)).sort();
  if (extraPaths.length > 0) {
    throw new Error(
      `task Worktree has Git-visible paths outside the latest retained workspace diff: ${extraPaths.join(", ")}`,
    );
  }
}

function nulSeparatedPaths(output: string | null): string[] {
  return (output ?? "").split("\0").filter(Boolean);
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
  arguments_: TaskRunArguments,
): AttemptEvidence & { expectedCellInput: CellInput } {
  const attempt = attemptEvidence(home, attemptId);
  const cellInput = {
    id: `workbench-task-${task.id}-attempt-${attemptId}`,
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
    driver: arguments_.driver,
    model: arguments_.model,
    ...(arguments_.variant ? { variant: arguments_.variant } : {}),
    ...(arguments_.session ? { session: arguments_.session } : {}),
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

function isAlreadyExists(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "EEXIST";
}

function validatePolicy(arguments_: TaskRunArguments): void {
  if (arguments_.driver !== "opencode-cli") {
    throw new Error("task run requires --driver opencode-cli");
  }
  if (!/^[^/\s]+\/[^/\s]+$/u.test(arguments_.model)) {
    throw new Error("task run requires --model PROVIDER/MODEL");
  }
  if (arguments_.variant !== undefined && !arguments_.variant.trim()) {
    throw new Error("task run --variant must be a non-empty string");
  }
  if (arguments_.session !== undefined && !arguments_.session.trim()) {
    throw new Error("task run --session must be a non-empty string");
  }
  if (!Number.isSafeInteger(arguments_.expectedSourceRevision) || arguments_.expectedSourceRevision < 0) {
    throw new Error("--expected-source-revision must be a non-negative integer");
  }
  if (!Number.isSafeInteger(arguments_.expectedRevision) || arguments_.expectedRevision < 1) {
    throw new Error("--expected-revision must be a positive integer");
  }
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
