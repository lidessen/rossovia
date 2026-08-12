import { createHash, randomUUID } from "node:crypto";
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
}

export interface TaskRunRequest {
  inputPath: string;
  finalRecordPath: string;
  driver: "opencode-cli";
  model: string;
  variant?: string;
}

export interface TaskRunRunnerResult {
  runId: string;
  status: string;
}

export interface TaskRunRunner {
  run(request: TaskRunRequest): TaskRunRunnerResult;
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

  const worktree = verifyCurrentCleanWorktree(
    home,
    task.binding.projectId,
    task.binding.worktreePath,
  );
  const attemptId = randomUUID();
  const attemptDirectory = join(home, "state", "task-attempts", attemptId);
  const inputPath = join(attemptDirectory, "cell-input.json");
  const finalRecordPath = join(attemptDirectory, "cell-input.run.json");
  const attemptPath = join(attemptDirectory, "attempt.json");
  const settlementPath = join(attemptDirectory, "settlement.json");
  const inputRef = evidenceRef(home, inputPath);
  const finalRecordRef = evidenceRef(home, finalRecordPath);
  const attemptRef = evidenceRef(home, attemptPath);
  const settlementRef = evidenceRef(home, settlementPath);
  const startedAt = new Date().toISOString();
  const cellInput = {
    id: `workbench-task-${task.id}-attempt-${attemptId}`,
    intent: task.objective,
    workspace: {
      root: worktree,
      readPaths: ["."],
      writePaths: ["."],
      excludePaths: [...ORDINARY_OPENCODE_EXCLUDES],
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
  mkdirSync(attemptDirectory, { recursive: false });
  writeImmutableJson(inputPath, cellInput);
  writeImmutableJson(attemptPath, {
    version: "rosso.task-run-attempt.v1",
    taskId: task.id,
    taskRevision: task.revision,
    sourceRevision: observed.sourceRevision,
    attemptId,
    inputRef,
    finalRecordRef,
    driver: arguments_.driver,
    model: arguments_.model,
    ...(arguments_.variant ? { variant: arguments_.variant } : {}),
    status: "started",
    startedAt,
  });

  let runnerResult: TaskRunRunnerResult;
  let lease: TaskRunLease | undefined;
  let finalRecord: CellRunRecord | undefined;
  try {
    lease = acquireWorktreeLease(home, worktree, task.id, attemptId);
    runnerResult = runner.run({
      inputPath,
      finalRecordPath,
      driver: arguments_.driver,
      model: arguments_.model,
      ...(arguments_.variant ? { variant: arguments_.variant } : {}),
    });
    finalRecord = validateFinalRecord(
      finalRecordPath,
      expectedCellInput,
      runnerResult,
      arguments_.model,
    );
    writeImmutableJson(settlementPath, {
      version: "rosso.task-run-settlement.v1",
      taskId: task.id,
      taskRevision: task.revision,
      attemptId,
      inputRef,
      finalRecordRef,
      status: "recorded",
      workCellRunId: finalRecord.runId,
      cellStatus: finalRecord.status,
      semanticAcceptance: "not-evaluated",
      settledAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    writeImmutableJson(settlementPath, {
      version: "rosso.task-run-settlement.v1",
      taskId: task.id,
      taskRevision: task.revision,
      attemptId,
      inputRef,
      finalRecordRef,
      status: "runner-failed",
      semanticAcceptance: "not-evaluated",
      error: error instanceof Error ? error.message : String(error),
      settledAt: new Date().toISOString(),
    });
    throw error;
  } finally {
    if (lease !== undefined) releaseWorktreeLease(lease);
  }

  return {
    version: "rosso.task-run-result.v1",
    taskId: task.id,
    taskRevision: task.revision,
    sourceRevision: observed.sourceRevision,
    attemptId,
    inputRef,
    finalRecordRef,
    attemptRef,
    settlementRef,
    workCellRunId: finalRecord.runId,
    cellStatus: finalRecord.status,
    semanticAcceptance: "not-evaluated",
  };
}

interface TaskRunLease {
  path: string;
  content: string;
}

function acquireWorktreeLease(
  home: string,
  worktree: string,
  taskId: string,
  attemptId: string,
): TaskRunLease {
  const identity = createHash("sha256").update(worktree).digest("hex");
  const directory = join(home, "state", "task-run-leases");
  const path = join(directory, `${identity}.json`);
  const content = `${JSON.stringify({
    version: "rosso.task-run-worktree-lease.v1",
    worktree,
    taskId,
    attemptId,
    pid: process.pid,
    acquiredAt: new Date().toISOString(),
  }, null, 2)}\n`;
  mkdirSync(directory, { recursive: true });
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
  if (!Number.isSafeInteger(arguments_.expectedSourceRevision) || arguments_.expectedSourceRevision < 0) {
    throw new Error("--expected-source-revision must be a non-negative integer");
  }
  if (!Number.isSafeInteger(arguments_.expectedRevision) || arguments_.expectedRevision < 1) {
    throw new Error("--expected-revision must be a positive integer");
  }
}

function verifyCurrentCleanWorktree(
  home: string,
  projectId: string,
  configuredWorktree: string,
): string {
  if (!existsSync(configuredWorktree)) {
    throw new Error(`task Worktree does not exist: ${configuredWorktree}`);
  }
  const worktree = realpathSync(configuredWorktree);
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
  const status = requiredGit(["status", "--porcelain"], worktree) ?? "";
  if (status.trim()) throw new Error(`task Worktree is not clean: ${worktree}`);
  return worktree;
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
