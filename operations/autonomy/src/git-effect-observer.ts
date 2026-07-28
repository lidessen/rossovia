import { createHash } from "node:crypto";
import { lstat, mkdir, open, readFile, realpath, unlink } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import type { TraceEvent } from "../../../packages/work-cell/src/contracts";
import type { DelegateBatchRun } from "./delegate-admission";
import type {
  DelegateBatchCheckpoint,
  DelegateExecutionObserver,
} from "./delegate-loop";
import {
  FileEffectJournal,
  type EffectActivity,
  type EffectToolFinishedData,
} from "./effect-journal";

interface GitEffectObserverOptions {
  readonly missionId: string;
  /** Mission-local evidence directory; journal and patch artifacts live here. */
  readonly journalRoot: string;
  /** Workbench-home-wide lease directory; two Missions cannot lease one root. */
  readonly leaseRoot: string;
}

interface GitStatusProjection {
  readonly added: readonly string[];
  readonly changed: readonly string[];
  readonly removed: readonly string[];
}

interface EffectState {
  readonly effectId: string;
  readonly root: string;
  readonly baseHead: string;
  readonly baselineDigest: string;
  readonly writePaths: readonly string[];
  readonly leasePath: string;
  queue: Promise<void>;
  observationIncomplete: boolean;
  readonly activeTools: Map<string, { readonly path: string }>;
}

/**
 * Durable observation and lease boundary for the one admitted writable trial.
 *
 * The writer receives only Work Cell's scope-bound write_file tool. This host
 * adapter performs local Git reads after quiescence; it grants no command,
 * commit, integration, or publication capability to the model.
 */
export class IsolatedGitEffectObserver implements DelegateExecutionObserver {
  private readonly journal: FileEffectJournal;
  private readonly states = new Map<string, EffectState>();
  private readonly journalRoot: string;
  private readonly leaseRoot: string;

  constructor(private readonly options: GitEffectObserverOptions) {
    this.journalRoot = resolve(options.journalRoot);
    this.leaseRoot = resolve(options.leaseRoot);
    this.journal = new FileEffectJournal(this.journalRoot);
  }

  async prepare(checkpoint: DelegateBatchCheckpoint): Promise<void> {
    const policy = checkpoint.admission.whole.effectPolicy;
    if (policy === undefined) return;
    if (this.states.has(checkpoint.id)) {
      throw new Error(`effect ${checkpoint.id} is already prepared in this observer`);
    }
    const writers = checkpoint.admission.contributions.filter(
      (contribution) => contribution.cell.workspace.writePaths.length > 0,
    );
    if (writers.length !== 1) {
      throw new Error(`effect ${checkpoint.id} requires exactly one admitted writer`);
    }
    const writer = writers[0]!;
    const root = await realpath(policy.root);
    if (root !== await realpath(writer.cell.workspace.root)) {
      throw new Error(`effect ${checkpoint.id} writer root drifted after admission`);
    }
    await assertDisposableLinkedWorktree(root);
    const status = await gitBytes(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
    if (status.byteLength !== 0) {
      throw new Error(`effect ${checkpoint.id} requires a clean disposable worktree baseline`);
    }
    const baseHead = (await gitText(root, ["rev-parse", "--verify", "HEAD"])).trim();
    const tracked = await gitBytes(root, ["ls-files", "-s", "-z"]);
    const baselineDigest = digest(Buffer.concat([
      Buffer.from(`${baseHead}\0`, "utf8"),
      status,
      tracked,
    ]));
    const leasePath = await acquireLease(this.leaseRoot, root, checkpoint.id);
    const state: EffectState = {
      effectId: checkpoint.id,
      root,
      baseHead,
      baselineDigest,
      writePaths: [...writer.cell.workspace.writePaths],
      leasePath,
      queue: Promise.resolve(),
      observationIncomplete: false,
      activeTools: new Map(),
    };
    this.states.set(checkpoint.id, state);
    try {
      await this.journal.prepare(checkpoint.id, {
        missionId: this.options.missionId,
        turnId: checkpoint.parentLoopId,
        cellId: writer.cell.id,
        worktree: { root, baseHead, baselineDigest },
        writePaths: [...state.writePaths],
        allowedCommands: [],
        authority: "withheld",
      });
    } catch (error) {
      this.states.delete(checkpoint.id);
      await unlink(leasePath).catch(() => undefined);
      throw error;
    }
  }

  async start(checkpoint: DelegateBatchCheckpoint): Promise<void> {
    const state = this.states.get(checkpoint.id);
    if (state === undefined) return;
    await this.journal.start(state.effectId);
  }

  async rejectBeforeStart(checkpoint: DelegateBatchCheckpoint, error: unknown): Promise<void> {
    const state = this.states.get(checkpoint.id);
    if (state === undefined) return;
    const activity = await this.journal.activity(state.effectId).catch(() => undefined);
    if (activity !== undefined && activity.state !== "settled" && activity.state !== "uncertain") {
      await this.journal.uncertain(state.effectId, {
        reason: "effect-observation-incomplete",
        evidenceRefs: [`prestart-error:${digest(Buffer.from(errorMessage(error), "utf8"))}`],
      }).catch(() => undefined);
    }
    await unlink(state.leasePath).catch(() => undefined);
    this.states.delete(checkpoint.id);
  }

  trace(checkpoint: DelegateBatchCheckpoint, event: TraceEvent): void {
    const state = this.states.get(checkpoint.id);
    if (state === undefined) return;
    state.queue = state.queue.then(async () => {
      const data = asRecord(event.data);
      if (event.type === "cell.started") {
        if (typeof data.runId !== "string" || data.runId.length === 0) {
          state.observationIncomplete = true;
          return;
        }
        await this.journal.observeRun(state.effectId, data.runId);
        return;
      }
      if (event.type === "agent.tool.started" && data.name === "write_file") {
        const target = asRecord(data.target);
        if (
          typeof data.id !== "string"
          || typeof target.path !== "string"
          || target.kind !== "workspace-path"
        ) {
          state.observationIncomplete = true;
          return;
        }
        state.activeTools.set(data.id, { path: target.path });
        await this.journal.toolStarted(state.effectId, {
          toolCallId: data.id,
          tool: "write_file",
          path: target.path,
        });
        return;
      }
      if (event.type === "agent.tool.finished" && data.name === "write_file") {
        if (typeof data.id !== "string") {
          state.observationIncomplete = true;
          return;
        }
        const active = state.activeTools.get(data.id);
        if (active === undefined) {
          state.observationIncomplete = true;
          return;
        }
        const outcome = typeof data.outcome === "string" && /error|fail/i.test(data.outcome)
          ? "failed"
          : "written";
        await this.finishTool(state, data.id, active.path, outcome);
      }
    }).catch(() => {
      state.observationIncomplete = true;
    });
  }

  async settle(checkpoint: DelegateBatchCheckpoint, run: DelegateBatchRun): Promise<void> {
    const state = this.states.get(checkpoint.id);
    if (state === undefined) return;
    await state.queue;
    for (const [toolCallId, tool] of state.activeTools) {
      await this.finishTool(state, toolCallId, tool.path, "cancelled");
    }
    if (run.kind !== "direct") {
      throw new Error(`effect ${state.effectId} cannot settle from a Swarm run`);
    }
    const record = run.record;
    const reason = record.status === "passed"
      ? "completed"
      : record.status === "cancelled"
        ? "cancelled"
        : "failed";
    await this.journal.quiesce(state.effectId, { reason, activeToolCalls: [] });

    const currentHead = (await gitText(state.root, ["rev-parse", "--verify", "HEAD"])).trim();
    if (currentHead !== state.baseHead) {
      throw new Error(`effect ${state.effectId} changed Git HEAD despite withheld commit authority`);
    }
    const status = await readGitStatus(state.root);
    const changedPaths = unique([
      ...status.added,
      ...status.changed,
      ...status.removed,
    ]);
    const outsideScope = changedPaths.filter((path) => !withinScopes(path, state.writePaths));
    const patch = await buildPatch(state.root, status.added);
    const patchDigest = digest(patch);
    const artifactDirectory = join(
      this.journalRoot,
      "effect-artifacts",
      digest(Buffer.from(state.effectId)).slice(0, 16),
    );
    const patchPath = join(artifactDirectory, `${patchDigest}.patch`);
    const manifestPath = join(artifactDirectory, `${patchDigest}.manifest.json`);
    const fileEvidence = await Promise.all(changedPaths.map(async (path) => ({
      path,
      beforeSha256: await gitBlobDigest(state.root, state.baseHead, path),
      afterSha256: await worktreeFileDigest(state.root, path),
    })));
    const manifest = {
      version: "rosso.isolated-git-effect-evidence.v1",
      effectId: state.effectId,
      missionId: this.options.missionId,
      turnId: checkpoint.parentLoopId,
      cellId: record.cellId,
      runId: record.runId,
      root: state.root,
      baseHead: state.baseHead,
      baselineDigest: state.baselineDigest,
      writePaths: state.writePaths,
      allowedCommands: [],
      status,
      outsideScope,
      files: fileEvidence,
      workCell: {
        status: record.status,
        verificationPassed: record.verification.passed,
        workspaceDiff: record.workspaceDiff,
      },
      authority: { commit: "withheld", merge: "withheld", publish: "withheld" },
    };
    await durableWrite(patchPath, patch);
    await durableWrite(manifestPath, Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"));

    const workCellPaths = unique([
      ...record.workspaceDiff.added,
      ...record.workspaceDiff.changed,
      ...record.workspaceDiff.removed,
    ]);
    const scopedStatusPaths = changedPaths.filter((path) => withinScopes(path, state.writePaths));
    const mechanicalPassed = record.status === "passed"
      && record.verification.passed
      && outsideScope.length === 0
      && !state.observationIncomplete
      && sameStrings(workCellPaths, scopedStatusPaths);
    await this.journal.settle(state.effectId, {
      patch: {
        ref: relative(this.journalRoot, patchPath),
        digest: patchDigest,
      },
      changedPaths,
      outsideScope: {
        verdict: outsideScope.length === 0 ? "clear" : "violated",
        paths: outsideScope,
      },
      acceptance: {
        mechanical: {
          verdict: mechanicalPassed ? "passed" : "failed",
          evidenceRefs: [
            `cell-run:${record.runId}`,
            `file:${relative(this.journalRoot, manifestPath)}`,
          ],
        },
        independent: { verdict: "not-run", evidenceRefs: [] },
        principal: { verdict: "withheld", evidenceRefs: [] },
      },
    });
    await unlink(state.leasePath);
    this.states.delete(checkpoint.id);
  }

  async uncertain(checkpoint: DelegateBatchCheckpoint, error: unknown): Promise<void> {
    const state = this.states.get(checkpoint.id);
    if (state === undefined) return;
    await state.queue.catch(() => undefined);
    const activity = await this.journal.activity(state.effectId);
    if (activity?.state === "settled" || activity?.state === "uncertain") return;
    await this.journal.uncertain(state.effectId, {
      reason: "effect-observation-incomplete",
      evidenceRefs: [`error:${digest(Buffer.from(errorMessage(error), "utf8"))}`],
    });
    // Preserve the lease. An uncertain effect requires explicit inspection or
    // disposal of its entire worktree; it must not be replayed automatically.
  }

  async activity(effectId: string): Promise<EffectActivity | undefined> {
    return await this.journal.activity(effectId);
  }

  private async finishTool(
    state: EffectState,
    toolCallId: string,
    path: string,
    outcome: EffectToolFinishedData["outcome"],
  ): Promise<void> {
    await this.journal.toolFinished(state.effectId, {
      toolCallId,
      tool: "write_file",
      path,
      outcome,
    });
    state.activeTools.delete(toolCallId);
  }
}

export async function readGitStatus(root: string): Promise<GitStatusProjection> {
  const raw = await gitBytes(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  const tokens = raw.toString("utf8").split("\0").filter(Boolean);
  const added: string[] = [];
  const changed: string[] = [];
  const removed: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.length < 4) throw new Error("git status returned an invalid porcelain entry");
    const code = token.slice(0, 2);
    const path = token.slice(3);
    assertSafeGitPath(path);
    if (code.includes("R") || code.includes("C")) index += 1;
    if (code === "??" || code.includes("A")) added.push(path);
    else if (code.includes("D")) removed.push(path);
    else changed.push(path);
  }
  return {
    added: unique(added),
    changed: unique(changed),
    removed: unique(removed),
  };
}

async function assertDisposableLinkedWorktree(root: string): Promise<void> {
  const top = await realpath((await gitText(root, ["rev-parse", "--show-toplevel"])).trim());
  if (top !== root) throw new Error(`effect workspace is not its Git worktree root: ${root}`);
  const dotGit = await lstat(join(root, ".git"));
  if (!dotGit.isFile()) {
    throw new Error(`effect workspace must be a disposable linked Git worktree: ${root}`);
  }
}

async function acquireLease(leaseRoot: string, root: string, effectId: string): Promise<string> {
  const directory = join(leaseRoot, "effect-leases");
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${digest(Buffer.from(root, "utf8"))}.json`);
  let handle;
  try {
    handle = await open(path, "wx");
  } catch (error) {
    if (isCode(error, "EEXIST")) {
      throw new Error(`effect workspace already has an active or uncertain lease: ${root}`);
    }
    throw error;
  }
  try {
    await handle.writeFile(`${JSON.stringify({ effectId, root })}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  return path;
}

async function buildPatch(root: string, added: readonly string[]): Promise<Buffer> {
  const parts = [
    await gitBytes(root, [
      "diff",
      "--binary",
      "--no-ext-diff",
      "--no-textconv",
      "--src-prefix=a/",
      "--dst-prefix=b/",
      "HEAD",
      "--",
    ]),
  ];
  for (const path of added) {
    parts.push(await gitBytes(root, [
      "diff",
      "--no-index",
      "--binary",
      "--no-ext-diff",
      "--no-textconv",
      "--src-prefix=a/",
      "--dst-prefix=b/",
      "--",
      "/dev/null",
      path,
    ], [0, 1]));
  }
  return Buffer.concat(parts);
}

async function gitBlobDigest(root: string, head: string, path: string): Promise<string | null> {
  const result = await gitResult(root, ["show", `${head}:${path}`]);
  if (result.exitCode !== 0) return null;
  return digest(result.stdout);
}

async function worktreeFileDigest(root: string, path: string): Promise<string | null> {
  try {
    return digest(await readFile(join(root, path)));
  } catch (error) {
    if (isCode(error, "ENOENT")) return null;
    throw error;
  }
}

async function durableWrite(path: string, content: Buffer): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const handle = await open(path, "w");
  try {
    await handle.writeFile(content);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function gitText(root: string, args: readonly string[]): Promise<string> {
  return (await gitBytes(root, args)).toString("utf8");
}

async function gitBytes(
  root: string,
  args: readonly string[],
  allowedExitCodes: readonly number[] = [0],
): Promise<Buffer> {
  const result = await gitResult(root, args);
  if (!allowedExitCodes.includes(result.exitCode)) {
    throw new Error(`git ${args[0] ?? "command"} failed (${result.exitCode}): ${result.stderr.toString("utf8").trim()}`);
  }
  return result.stdout;
}

async function gitResult(
  root: string,
  args: readonly string[],
): Promise<{ readonly exitCode: number; readonly stdout: Buffer; readonly stderr: Buffer }> {
  const child = Bun.spawn(["git", "-C", root, ...args], {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    env: { PATH: process.env.PATH ?? "" },
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).arrayBuffer(),
    new Response(child.stderr).arrayBuffer(),
    child.exited,
  ]);
  return {
    exitCode,
    stdout: Buffer.from(stdout),
    stderr: Buffer.from(stderr),
  };
}

function withinScopes(path: string, scopes: readonly string[]): boolean {
  return scopes.some((scope) => scope === "." || path === scope || path.startsWith(`${scope}/`));
}

function assertSafeGitPath(path: string): void {
  if (
    path.length === 0
    || path.includes("\0")
    || path.includes("\\")
    || path.split("/").some((part) => part === "" || part === "." || part === "..")
  ) throw new Error(`git returned an unsafe candidate path: ${JSON.stringify(path)}`);
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  const a = unique(left);
  const b = unique(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function digest(content: Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error
    && (error as { code?: unknown }).code === code;
}
