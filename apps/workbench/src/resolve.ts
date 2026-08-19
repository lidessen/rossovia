import type { Resolution, Workspace } from "./contracts";
import { loadHome, loadWorkspaceIndex, workspaceFor } from "./home";
import { observeWorkspace } from "./workspace";

function nonempty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must be a non-empty string`);
  return normalized;
}

function fold(value: string): string {
  return value.toLowerCase();
}

export function resolveProject(homeArgument: string | undefined, queryArgument: string): Resolution {
  const { home, projects, workspaces } = loadHome(homeArgument);
  const query = nonempty(queryArgument, "query");
  const folded = fold(query);
  const matches = projects.projects.filter((project) =>
    fold(project.id) === folded || project.aliases.some((alias) => fold(alias) === folded));
  if (matches.length > 1) throw new Error(`project query is ambiguous: '${query}'`);

  let project: Resolution["project"];
  let workspace: Pick<Workspace, "path">;
  let registration: Resolution["registration"];
  if (matches.length === 1) {
    project = matches[0]!;
    workspace = workspaceFor(workspaces, project.id!);
    registration = "registered";
  } else {
    const index = loadWorkspaceIndex(home);
    const candidates = index.entries.filter((entry) => entry.aliases.some((alias) => fold(alias) === folded));
    if (candidates.length === 0) {
      throw new Error(`no registered or indexed project matches '${query}'; add a workspace root or refresh the index`);
    }
    if (candidates.length > 1) {
      throw new Error(`indexed project query is ambiguous: '${query}' matches ${candidates.map((entry) => entry.path).join(", ")}`);
    }
    const candidate = candidates[0]!;
    project = { id: null, repository: candidate.repository, aliases: candidate.aliases };
    workspace = { path: candidate.path };
    registration = "discovered";
  }

  return {
    version: "rosso.resolution.v1",
    query,
    registration,
    project,
    workspace: observeWorkspace(project, workspace),
  };
}
