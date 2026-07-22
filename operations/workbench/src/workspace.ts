import { existsSync, realpathSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Project, Workspace, WorkspaceObservation } from "./contracts";
import { expandPath } from "./paths";

const decoder = new TextDecoder();

export function repositoryLocator(value: string): string {
  let normalized = value.trim().replace(/\/+$/, "");
  if (!normalized.includes("://") && normalized.includes("@") && normalized.includes(":")) {
    const separator = normalized.indexOf(":", normalized.indexOf("@"));
    const authority = normalized.slice(0, separator);
    normalized = `ssh://${authority.slice(authority.lastIndexOf("@") + 1)}/${normalized.slice(separator + 1)}`;
  }
  try {
    const parsed = new URL(normalized);
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return normalized;
  }
}

export function normalizedRepository(value: string): string {
  const locator = repositoryLocator(value);
  try {
    const parsed = new URL(locator);
    return `${parsed.hostname}/${parsed.pathname.replace(/^\/+/, "").replace(/\.git$/, "")}`.toLowerCase();
  } catch {
    return locator.replace(/\.git$/, "").toLowerCase();
  }
}

function runGit(arguments_: string[], cwd: string, optional = false): string | null {
  const result = Bun.spawnSync(["git", "-C", cwd, ...arguments_], { stdout: "pipe", stderr: "pipe" });
  const output = decoder.decode(result.stdout).trim();
  if (result.exitCode !== 0) {
    if (optional) return null;
    const error = decoder.decode(result.stderr).trim();
    throw new Error(error || `git ${arguments_.join(" ")} failed in ${cwd}`);
  }
  return output || null;
}

export function requiredGit(arguments_: string[], cwd: string): string {
  return runGit(arguments_, cwd)!;
}

export function optionalGit(arguments_: string[], cwd: string): string | null {
  return runGit(arguments_, cwd, true);
}

export function gitRoot(path: string): string {
  const configured = expandPath(path);
  if (!existsSync(configured)) throw new Error(`workspace path does not exist: ${configured}`);
  return realpathSync(runGit(["rev-parse", "--show-toplevel"], configured)!);
}

export function repositoryBasename(repository: string): string {
  const normalized = repositoryLocator(repository).replace(/\/+$/, "").replace(/\.git$/, "");
  return normalized.slice(Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf(":")) + 1);
}

export function observeWorkspace(
  project: Pick<Project, "id" | "repository"> | { id: null; repository: string | null },
  workspace: Pick<Workspace, "path">,
): WorkspaceObservation {
  const configuredPath = expandPath(workspace.path);
  if (!existsSync(configuredPath)) throw new Error(`workspace path does not exist: ${configuredPath}`);
  const resolvedPath = realpathSync(configuredPath);
  const root = gitRoot(resolvedPath);
  if (root !== resolvedPath) {
    throw new Error(`workspace mapping is not the Git root: configured ${resolvedPath}, observed ${root}`);
  }
  const rawOrigin = runGit(["remote", "get-url", "origin"], root, true);
  const origin = rawOrigin === null ? null : repositoryLocator(rawOrigin);
  if (project.repository && origin === null) {
    throw new Error(`workspace origin missing for ${project.id}: expected ${project.repository}`);
  }
  if (project.repository && origin && normalizedRepository(origin) !== normalizedRepository(project.repository)) {
    throw new Error(`workspace origin mismatch for ${project.id}: expected ${project.repository}, observed ${origin}`);
  }
  const rawStatus = runGit(["status", "--short", "--branch"], root) ?? "";
  const status = rawStatus ? rawStatus.split(/\r?\n/) : [];
  const branch = runGit(["branch", "--show-current"], root, true);
  const names = (candidates: string[]) => candidates.filter((name) => {
    const path = join(root, name);
    return existsSync(path) && statSync(path).isFile();
  });
  return {
    path: root,
    origin,
    head: runGit(["rev-parse", "HEAD"], root, true),
    branch,
    dirty: status.length > 1,
    status,
    instructionFiles: names(["AGENTS.md", "CLAUDE.md"]),
    orientationFiles: names(["DESIGN.md", "README.md"]),
  };
}
