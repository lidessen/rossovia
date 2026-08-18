import type { Budget, WorkspaceDiff, WorkspacePolicy } from "./contracts";

/**
 * The neutral workspace/host capability port (C2). The Work Cell core and
 * every driver depend only on this surface: file access, command execution,
 * workspace snapshots, and artifact description are performed exclusively
 * through the implementation injected by the caller. The core entry point
 * never constructs a concrete filesystem, reads the process environment, or
 * starts a process on its own; those concrete implementations live at the
 * adapter boundary.
 */

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

/** A content-addressable file-state projection: relative path to content digest. */
export type WorkspaceSnapshot = ReadonlyMap<string, string>;

/**
 * One host-opened, capability-scoped workspace handle for a single run. The
 * declared capability flags are the only authority for the model-visible
 * tool surface: read, write, and command tools exist only when the injected
 * port grants them. `CellInput.capabilities` and `capabilitiesRequired`
 * remain model/worker adapter descriptions and can never grant host effects
 * on their own.
 */
export interface HostWorkspace {
  /** Adapter-resolved workspace identity used by transport/edit adapters. */
  readonly root: string;
  /** Host-declared executable capabilities of this port instance. */
  readonly canRead: boolean;
  readonly canWrite: boolean;
  readonly canRunCommands: boolean;

  listFiles(path?: string, maxEntries?: number): Promise<string[]>;
  readText(path: string, startLine?: number, endLine?: number): Promise<string>;
  readBinary(path: string): Promise<Uint8Array>;
  writeText(path: string, content: string): Promise<void>;
  /** Exclusive-create write; refuses to overwrite an existing file. */
  createText(path: string, content: string): Promise<void>;
  /** Resolve one edit target through both read and write scope without loading content. */
  assertEditable(path: string): Promise<string>;
  /** Describe a declared output only when it is a regular file inside write scope. */
  describeArtifact(path: string): Promise<WorkspaceArtifact>;
  runCommand(
    argv: string[],
    cwd?: string,
    timeoutMs?: number,
    signal?: AbortSignal,
  ): Promise<CommandResult>;
  snapshot(): Promise<WorkspaceSnapshot>;
  diff(before: WorkspaceSnapshot, after: WorkspaceSnapshot): WorkspaceDiff;
}

/**
 * The one injected host port. The caller supplies the implementation that
 * opens the workspace capability surface for a run from the declared
 * `WorkspacePolicy` and `Budget`. The core never asks for adapter identity
 * evidence: capability follows the injected implementation alone.
 */
export interface CellHost {
  createWorkspace(policy: WorkspacePolicy, budget: Budget): Promise<HostWorkspace>;
}
