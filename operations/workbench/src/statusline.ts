import { existsSync, readFileSync, realpathSync } from "node:fs";
import { basename, resolve } from "node:path";
import { loadHome } from "./home";
import { gitRoot, normalizedRepository, observeWorkspace } from "./workspace";

interface HostStatusInput {
  readonly cwd?: unknown;
  readonly session_name?: unknown;
  readonly workspace?: {
    readonly current_dir?: unknown;
  };
}

export interface StatusLineHostContext {
  readonly cwd: string;
  readonly projectName: string | null;
}

export interface StatusLineProjection {
  readonly version: "rosso.status-line.v2";
  readonly project: string;
  readonly source: "session-name" | "registered-project" | "git-root" | "directory";
}

export function statusLineProjection(
  homeArgument: string | undefined,
  cwdArgument: string,
  projectName: string | null = null,
): StatusLineProjection {
  if (projectName !== null) {
    return { version: "rosso.status-line.v2", project: projectName, source: "session-name" };
  }

  const cwd = canonicalPath(cwdArgument);
  try {
    const workspace = observeWorkspace({ id: null, repository: null }, { path: gitRoot(cwd) });
    try {
      const home = loadHome(homeArgument);
      const projects = workspace.origin === null
        ? []
        : home.projects.projects.filter((project) =>
            normalizedRepository(project.repository) === normalizedRepository(workspace.origin!)
          );
      if (projects.length === 1) {
        return {
          version: "rosso.status-line.v2",
          project: projects[0]!.id,
          source: "registered-project",
        };
      }
    } catch {
      // Project registration is optional for this compact host projection.
    }
    return {
      version: "rosso.status-line.v2",
      project: basename(workspace.path) || workspace.path,
      source: "git-root",
    };
  } catch {
    return {
      version: "rosso.status-line.v2",
      project: basename(cwd) || cwd,
      source: "directory",
    };
  }
}

export function renderStatusLine(projection: StatusLineProjection): string {
  return projection.project;
}

export function statusLineHostContext(rawInput: string, explicit?: string): StatusLineHostContext {
  const fallback = explicit?.trim() || process.cwd();
  if (!rawInput.trim()) return { cwd: fallback, projectName: null };
  try {
    const input = JSON.parse(rawInput) as HostStatusInput;
    const projectName = compactLabel(input.session_name);
    if (typeof input.workspace?.current_dir === "string" && input.workspace.current_dir.trim()) {
      return { cwd: explicit?.trim() || input.workspace.current_dir, projectName };
    }
    if (typeof input.cwd === "string" && input.cwd.trim()) {
      return { cwd: explicit?.trim() || input.cwd, projectName };
    }
  } catch {
    // Fall back to the invocation directory rather than leaving the line blank.
  }
  return { cwd: fallback, projectName: null };
}

export function statusLineInput(stdinIsTty: boolean | undefined): string {
  return stdinIsTty ? "" : readFileSync(0, "utf8");
}

function canonicalPath(path: string): string {
  const resolved = resolve(path);
  return existsSync(resolved) ? realpathSync(resolved) : resolved;
}

function compactLabel(value: unknown, maximum = 48): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  const characters = Array.from(normalized);
  return characters.length <= maximum
    ? normalized
    : `${characters.slice(0, maximum - 1).join("")}…`;
}
