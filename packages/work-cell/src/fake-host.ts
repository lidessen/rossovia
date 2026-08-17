import { createHash } from "node:crypto";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type { Budget, WorkspaceDiff, WorkspacePolicy } from "./contracts";
import type {
  CellHost,
  CommandResult,
  HostWorkspace,
  WorkspaceArtifact,
  WorkspaceSnapshot,
} from "./host-port";

/**
 * A deterministic in-memory host for tests and substitution probes. It runs
 * the same neutral port contract as the local filesystem adapter without
 * touching a real filesystem, process environment, or child process: files
 * live in a root-scoped content-addressed map, allowed commands resolve to
 * registered deterministic results, and snapshots/diffs use the same
 * relative-path content-digest semantics. Scope, exclude, absolute-path, and
 * allow-list checks mirror the local adapter; symlinks cannot exist in the
 * fake and are therefore never traversed.
 */
export class FakeHost implements CellHost {
  private readonly files = new Map<string, Uint8Array>();
  private readonly commandResults = new Map<string, CommandResult>();

  constructor(private readonly seedRoot = "/fake-work-cell") {
    if (!isAbsolute(seedRoot)) throw new Error("fake host seed root must be absolute");
  }

  /** Host-side fixture setup; never part of the model-visible tool surface. */
  seed(path: string, content: string): void {
    const relativePath = toRelative(this.seedRoot, resolveLexical(this.seedRoot, path));
    this.files.set(key(this.seedRoot, relativePath), Buffer.from(content, "utf8"));
  }

  /**
   * Host-side deterministic command registry, keyed by the canonical JSON
   * encoding of the exact argv array. A space-joined display string would
   * conflate distinct argv arrays such as `["git", "show a"]` and
   * `["git", "show", "a"]`; registration and lookup always use the same
   * collision-free array identity.
   */
  registerCommand(argv: string[], result: Partial<CommandResult> & { exitCode: number }): void {
    this.commandResults.set(commandKey(argv), {
      stdout: "",
      stderr: "",
      durationMs: 0,
      ...result,
    });
  }

  async createWorkspace(policy: WorkspacePolicy, budget: Budget): Promise<HostWorkspace> {
    const root = policy.root;
    // Same refusal as the local adapter: a workspace root must be absolute.
    if (!isAbsolute(root)) {
      throw new Error("workspace.root must be absolute");
    }
    const files = this.files;
    const commandResults = this.commandResults;
    const keyFor = (relativePath: string): string => key(root, relativePath);
    const resolveReadable = (path: string): string => {
      const candidate = resolveLexical(root, path);
      assertNotExcluded(candidate, "read", root, policy);
      assertScope(candidate, policy.readPaths, "read", root);
      return candidate;
    };
    const resolveWritable = (path: string): string => {
      const candidate = resolveLexical(root, path);
      assertNotExcluded(candidate, "write", root, policy);
      assertScope(candidate, policy.writePaths, "write", root);
      return candidate;
    };
    const readReadable = (path: string): Uint8Array => {
      // resolveReadable validates and returns the absolute candidate; the
      // root-scoped map is keyed by workspace-relative identity, so the
      // validated value is normalized back before every map access.
      const relativePath = toRelative(root, resolveReadable(path));
      const content = files.get(keyFor(relativePath));
      if (content === undefined) throw new Error(`file does not exist: ${relativePath}`);
      return content;
    };

    return {
      root,
      canRead: policy.readPaths.length > 0,
      canWrite: policy.writePaths.length > 0,
      canRunCommands: policy.allowedCommands.length > 0,
      async listFiles(path = ".", maxEntries = 500) {
        const start = resolveLexical(root, path);
        assertNotExcluded(start, "read", root, policy);
        assertScope(start, policy.readPaths, "read", root);
        const scope = toRelative(root, start);
        const prefix = key(root, "");
        const listed = [...files.keys()]
          .filter((stored) => stored.startsWith(prefix))
          .map((stored) => stored.slice(prefix.length))
          .filter((file) => inScope(file, scope) && !isExcluded(file, policy))
          .sort((left, right) => left.localeCompare(right));
        return listed.slice(0, maxEntries);
      },
      async readText(path, startLine = 1, endLine) {
        const text = Buffer.from(readReadable(path)).toString("utf8");
        if (startLine === 1 && endLine === undefined) return text;
        const lines = text.split("\n");
        return lines.slice(Math.max(0, startLine - 1), endLine).join("\n");
      },
      async readBinary(path) {
        return new Uint8Array(readReadable(path));
      },
      async writeText(path, content) {
        const relativePath = toRelative(root, resolveWritable(path));
        files.set(keyFor(relativePath), Buffer.from(content, "utf8"));
      },
      async createText(path, content) {
        const relativePath = toRelative(root, resolveWritable(path));
        if (files.has(keyFor(relativePath))) {
          throw new Error(`file already exists: ${relativePath}`);
        }
        files.set(keyFor(relativePath), Buffer.from(content, "utf8"));
      },
      async assertEditable(path) {
        // The edit-tool port contract returns the validated host path; the
        // absolute candidate is the host-resolved identity here, matching
        // the local adapter.
        const readable = resolveReadable(path);
        const writable = resolveWritable(path);
        if (readable !== writable) {
          throw new Error(`edit target resolves to different read and write paths: ${path}`);
        }
        return writable;
      },
      async describeArtifact(path) {
        const relativePath = toRelative(root, resolveWritable(path));
        const content = files.get(keyFor(relativePath));
        if (content === undefined) {
          throw new Error(`artifact does not exist: ${relativePath}`);
        }
        return {
          path: relativePath,
          bytes: content.byteLength,
          sha256: createHash("sha256").update(content).digest("hex"),
        } satisfies WorkspaceArtifact;
      },
      async runCommand(argv, cwd = ".", timeoutMs = 60_000, signal) {
        if (argv.length === 0 || !argv[0]) throw new Error("argv must not be empty");
        if (argv[0].includes("/") || argv[0].includes("\\")) {
          throw new Error(`command argv[0] must not contain a path separator: ${argv[0]}`);
        }
        if (!policy.allowedCommands.some((allowed) => commandPolicyMatches(allowed, argv))) {
          throw new Error(`command not allowed: ${argv.join(" ")}`);
        }
        resolveReadable(cwd);
        const timeoutSignal = AbortSignal.timeout(Math.min(timeoutMs, budget.maxDurationMs));
        const combined = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
        if (combined.aborted) throw combined.reason ?? new DOMException("Aborted", "AbortError");
        const registered = commandResults.get(commandKey(argv));
        if (registered === undefined) {
          // An allowed command must never invent success: without a registered
          // deterministic result there is no truthful outcome to report.
          throw new Error(
            `command is allowed but has no registered deterministic result: ${argv.join(" ")}`,
          );
        }
        return {
          ...registered,
          stdout: truncateBytes(registered.stdout, budget.maxCommandOutputBytes),
          stderr: truncateBytes(registered.stderr, budget.maxCommandOutputBytes),
        };
      },
      async snapshot() {
        const snapshot: Map<string, string> = new Map();
        if (!policy.writePaths.length && !policy.allowedCommands.length) return snapshot;
        const prefix = key(root, "");
        for (const [stored, content] of files) {
          if (!stored.startsWith(prefix)) continue;
          snapshot.set(
            stored.slice(prefix.length),
            createHash("sha256").update(content).digest("hex"),
          );
        }
        return snapshot;
      },
      diff(before: WorkspaceSnapshot, after: WorkspaceSnapshot): WorkspaceDiff {
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
      },
    };
  }
}

/**
 * Capability-filter wrapper: delegates every neutral port operation while
 * overriding the declared executable capability flags. Proves that the
 * model-visible read/write/command surface follows the injected port alone —
 * self-declared CellInput capabilities can never re-open a denied surface.
 *
 * Every port method is delegated explicitly with its receiver bound to the
 * delegate workspace, so prototype methods of a class-based adapter (the
 * local filesystem Workspace) survive the wrapper; a shallow spread would
 * lose them.
 */
export class FilteredHost implements CellHost {
  constructor(
    private readonly delegate: CellHost,
    private readonly capabilities: Partial<Pick<HostWorkspace, "canRead" | "canWrite" | "canRunCommands">>,
  ) {}

  async createWorkspace(policy: WorkspacePolicy, budget: Budget): Promise<HostWorkspace> {
    const workspace = await this.delegate.createWorkspace(policy, budget);
    return {
      root: workspace.root,
      canRead: this.capabilities.canRead ?? workspace.canRead,
      canWrite: this.capabilities.canWrite ?? workspace.canWrite,
      canRunCommands: this.capabilities.canRunCommands ?? workspace.canRunCommands,
      listFiles: (path, maxEntries) => workspace.listFiles(path, maxEntries),
      readText: (path, startLine, endLine) => workspace.readText(path, startLine, endLine),
      readBinary: (path) => workspace.readBinary(path),
      writeText: (path, content) => workspace.writeText(path, content),
      createText: (path, content) => workspace.createText(path, content),
      assertEditable: (path) => workspace.assertEditable(path),
      describeArtifact: (path) => workspace.describeArtifact(path),
      runCommand: (argv, cwd, timeoutMs, signal) => workspace.runCommand(argv, cwd, timeoutMs, signal),
      snapshot: () => workspace.snapshot(),
      diff: (before, after) => workspace.diff(before, after),
    };
  }
}

function key(root: string, relativePath: string): string {
  return `${root}\u0000${relativePath}`;
}

/**
 * One collision-free exact argv identity: the canonical JSON encoding of the
 * argument array, used identically at command registration and lookup. Two
 * arrays that merely join to the same display string — for example
 * `["git", "show a"]` and `["git", "show", "a"]` — encode to different
 * keys, so a registered command can never authorize or answer a different
 * argv array.
 */
function commandKey(argv: readonly string[]): string {
  return JSON.stringify(argv);
}

function resolveLexical(root: string, path: string): string {
  if (isAbsolute(path)) throw new Error(`absolute workspace path is not allowed: ${path}`);
  const candidate = resolve(root, path);
  const offset = relative(root, candidate);
  if (offset === ".." || offset.startsWith(`..${sep}`) || isAbsolute(offset)) {
    throw new Error(`path escapes workspace: ${path}`);
  }
  return candidate;
}

function toRelative(root: string, path: string): string {
  const value = relative(root, path).split(sep).join("/");
  return value === "" ? "." : value;
}

function assertScope(
  path: string,
  scopes: string[],
  operation: string,
  root: string,
): void {
  const relativePath = toRelative(root, path);
  const allowed = scopes.some((scope) => {
    const normalized = normalizeScope(scope);
    return normalized === "." || relativePath === normalized || relativePath.startsWith(`${normalized}/`);
  });
  if (!allowed) throw new Error(`${operation} path is outside declared scope: ${relativePath}`);
}

function assertNotExcluded(path: string, operation: string, root: string, policy: WorkspacePolicy): void {
  if (isExcluded(toRelative(root, path), policy)) {
    throw new Error(`${operation} path is excluded by workspace policy: ${toRelative(root, path)}`);
  }
}

function isExcluded(relativePath: string, policy: WorkspacePolicy): boolean {
  return policy.excludePaths.some((exclude) => excludes(relativePath, exclude));
}

function inScope(path: string, scope: string): boolean {
  return scope === "." || path === scope || path.startsWith(`${scope}/`);
}

function normalizeScope(scope: string): string {
  const normalized = scope.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
  return normalized === "" ? "." : normalized;
}

function commandPolicyMatches(policy: string, argv: readonly string[]): boolean {
  const tokens = policy.split(" ").filter(Boolean);
  if (tokens.length === 1) return tokens[0] === argv[0];
  return tokens.length === argv.length && tokens.every((token, index) => token === argv[index]);
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
