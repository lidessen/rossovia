import { createHash } from "node:crypto";
import { lstat, mkdir, readdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import type { Budget, WorkspaceDiff, WorkspacePolicy } from "./contracts";

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface WorkspaceArtifact {
  path: string;
  bytes: number;
  sha256: string;
}

type Snapshot = Map<string, string>;

export class Workspace {
  readonly root: string;
  readonly canRead: boolean;
  readonly canWrite: boolean;
  readonly canRunCommands: boolean;

  private constructor(
    root: string,
    private readonly policy: WorkspacePolicy,
    private readonly budget: Budget,
  ) {
    this.root = root;
    this.canRead = policy.readPaths.length > 0;
    this.canWrite = policy.writePaths.length > 0;
    this.canRunCommands = policy.allowedCommands.length > 0;
  }

  static async create(policy: WorkspacePolicy, budget: Budget): Promise<Workspace> {
    if (!isAbsolute(policy.root)) {
      throw new Error("workspace.root must be absolute");
    }
    const root = await realpath(policy.root);
    return new Workspace(root, policy, budget);
  }

  async listFiles(path = ".", maxEntries = 500): Promise<string[]> {
    const start = await this.resolveReadable(path);
    const info = await stat(start);
    if (!info.isDirectory()) {
      return [this.toRelative(start)];
    }

    const files: string[] = [];
    const visit = async (directory: string): Promise<void> => {
      const entries = await readdir(directory, { withFileTypes: true });
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (files.length >= maxEntries) return;
        const absolute = resolve(directory, entry.name);
        if (entry.isSymbolicLink()) continue;
        if (this.isExcluded(absolute)) continue;
        if (entry.isDirectory()) {
          await visit(absolute);
        } else if (entry.isFile()) {
          files.push(this.toRelative(absolute));
        }
      }
    };
    await visit(start);
    return files;
  }

  async readText(path: string, startLine = 1, endLine?: number): Promise<string> {
    const absolute = await this.resolveReadable(path);
    const content = await readFile(absolute, "utf8");
    if (startLine === 1 && endLine === undefined) return content;
    const lines = content.split("\n");
    return lines.slice(Math.max(0, startLine - 1), endLine).join("\n");
  }

  async writeText(path: string, content: string): Promise<void> {
    const absolute = await this.resolveWritable(path);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, content, "utf8");
  }

  /** Read a declared output only when it is a regular file inside write scope. */
  async describeArtifact(path: string): Promise<WorkspaceArtifact> {
    const absolute = await this.resolveWritable(path);
    const info = await lstat(absolute);
    if (!info.isFile()) throw new Error(`artifact is not a regular file: ${path}`);
    const content = await readFile(absolute);
    return {
      path: this.toRelative(absolute),
      bytes: content.byteLength,
      sha256: createHash("sha256").update(content).digest("hex"),
    };
  }

  async runCommand(
    argv: string[],
    cwd = ".",
    timeoutMs = 60_000,
    signal?: AbortSignal,
  ): Promise<CommandResult> {
    if (argv.length === 0 || !argv[0]) throw new Error("argv must not be empty");
    // Reject argv[0] containing a path separator: the allow-list is based on
    // the bare command name, so a path-qualified executable would bypass it.
    if (argv[0].includes("/") || argv[0].includes("\\")) {
      throw new Error(`command argv[0] must not contain a path separator: ${argv[0]}`);
    }
    const executable = basename(argv[0]);
    if (!this.policy.allowedCommands.includes(executable)) {
      throw new Error(`command not allowed: ${executable}`);
    }
    const commandCwd = await this.resolveReadable(cwd);
    if (!(await stat(commandCwd)).isDirectory()) throw new Error(`cwd is not a directory: ${cwd}`);

    const started = performance.now();
    const timeoutSignal = AbortSignal.timeout(Math.min(timeoutMs, this.budget.maxDurationMs));
    const combined = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
    const child = Bun.spawn(argv, {
      cwd: commandCwd,
      stdout: "pipe",
      stderr: "pipe",
      env: { PATH: process.env.PATH ?? "" },
      signal: combined,
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    return {
      exitCode,
      stdout: truncateBytes(stdout, this.budget.maxCommandOutputBytes),
      stderr: truncateBytes(stderr, this.budget.maxCommandOutputBytes),
      durationMs: Math.round(performance.now() - started),
    };
  }

  async snapshot(): Promise<Snapshot> {
    const snapshot: Snapshot = new Map();
    if (!this.canWrite && !this.canRunCommands) return snapshot;
    const visit = async (directory: string): Promise<void> => {
      const entries = await readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue;
        const absolute = resolve(directory, entry.name);
        if (this.isExcluded(absolute)) continue;
        if (entry.isDirectory()) await visit(absolute);
        else if (entry.isFile()) {
          const content = await readFile(absolute);
          snapshot.set(this.toRelative(absolute), createHash("sha256").update(content).digest("hex"));
        }
      }
    };
    // write_file is scope-bound, but any allowed command can have filesystem
    // side effects. Preserve a full diff surface whenever command authority exists.
    const snapshotScopes = this.canRunCommands ? ["."] : this.policy.writePaths;
    for (const scope of uniqueScopes(snapshotScopes)) {
      const start = this.resolveLexical(scope);
      if (this.isExcluded(start)) continue;
      try {
        const info = await lstat(start);
        if (info.isSymbolicLink()) continue;
        if (info.isDirectory()) await visit(start);
        else if (info.isFile()) {
          const content = await readFile(start);
          snapshot.set(this.toRelative(start), createHash("sha256").update(content).digest("hex"));
        }
      } catch (error) {
        if (!isMissing(error)) throw error;
      }
    }
    return snapshot;
  }

  diff(before: Snapshot, after: Snapshot): WorkspaceDiff {
    const added: string[] = [];
    const changed: string[] = [];
    const removed: string[] = [];
    for (const [path, digest] of after) {
      if (!before.has(path)) added.push(path);
      else if (before.get(path) !== digest) changed.push(path);
    }
    for (const path of before.keys()) {
      if (!after.has(path)) removed.push(path);
    }
    return { added: added.sort(), changed: changed.sort(), removed: removed.sort() };
  }

  private async resolveReadable(path: string): Promise<string> {
    const candidate = this.resolveLexical(path);
    this.assertNotExcluded(candidate, "read");
    this.assertScope(candidate, this.policy.readPaths, "read");
    const actual = await realpath(candidate);
    this.assertInsideRoot(actual);
    this.assertNotExcluded(actual, "read");
    this.assertScope(actual, this.policy.readPaths, "read");
    return actual;
  }

  private async resolveWritable(path: string): Promise<string> {
    const candidate = this.resolveLexical(path);
    this.assertNotExcluded(candidate, "write");
    this.assertScope(candidate, this.policy.writePaths, "write");
    let ancestor = dirname(candidate);
    while (ancestor !== this.root) {
      try {
        const info = await lstat(ancestor);
        if (info.isSymbolicLink()) throw new Error(`symlinked write ancestor is not allowed: ${path}`);
        const actual = await realpath(ancestor);
        this.assertInsideRoot(actual);
        break;
      } catch (error) {
        if (isMissing(error)) {
          ancestor = dirname(ancestor);
          continue;
        }
        throw error;
      }
    }
    try {
      const info = await lstat(candidate);
      if (info.isSymbolicLink()) throw new Error(`symlinked write target is not allowed: ${path}`);
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
    return candidate;
  }

  private resolveLexical(path: string): string {
    if (isAbsolute(path)) throw new Error(`absolute workspace path is not allowed: ${path}`);
    const candidate = resolve(this.root, path);
    this.assertInsideRoot(candidate);
    return candidate;
  }

  private assertInsideRoot(path: string): void {
    const offset = relative(this.root, path);
    if (offset === "" || offset === ".") return;
    if (offset === ".." || offset.startsWith(`..${sep}`) || isAbsolute(offset)) {
      throw new Error(`path escapes workspace: ${path}`);
    }
  }

  private assertScope(path: string, scopes: string[], operation: string): void {
    const relativePath = this.toRelative(path);
    const allowed = scopes.some((scope) => {
      const normalized = normalizeScope(scope);
      return normalized === "." || relativePath === normalized || relativePath.startsWith(`${normalized}/`);
    });
    if (!allowed) throw new Error(`${operation} path is outside declared scope: ${relativePath}`);
  }

  private assertNotExcluded(path: string, operation: string): void {
    if (this.isExcluded(path)) {
      throw new Error(`${operation} path is excluded by workspace policy: ${this.toRelative(path)}`);
    }
  }

  private isExcluded(path: string): boolean {
    const relativePath = this.toRelative(path);
    return this.policy.excludePaths.some((exclude) => excludes(relativePath, exclude));
  }

  private toRelative(path: string): string {
    const value = relative(this.root, path).split(sep).join("/");
    return value === "" ? "." : value;
  }
}

function normalizeScope(scope: string): string {
  const normalized = scope.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
  return normalized === "" ? "." : normalized;
}

function uniqueScopes(scopes: string[]): string[] {
  return [...new Set(scopes.map(normalizeScope))];
}

function excludes(path: string, exclusion: string): boolean {
  const normalized = normalizeScope(exclusion);
  if (normalized === ".") return true;
  if (normalized.includes("/")) {
    return path === normalized || path.startsWith(`${normalized}/`);
  }
  return path.split("/").includes(normalized);
}

function truncateBytes(value: string, maxBytes: number): string {
  const bytes = Buffer.from(value);
  if (bytes.byteLength <= maxBytes) return value;
  return `${bytes.subarray(0, maxBytes).toString("utf8")}\n[truncated]`;
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
