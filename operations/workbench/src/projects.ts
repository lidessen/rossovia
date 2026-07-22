import type { Project, ProjectList, ProjectListEntry, Projects } from "./contracts";
import { loadHome, workspaceFor } from "./home";
import { observeWorkspace } from "./workspace";

export function registeredProjectByQuery(projects: Projects, queryArgument: string): Project {
  const query = queryArgument.trim();
  if (!query) throw new Error("query must be a non-empty string");
  const folded = query.toLowerCase();
  const matches = projects.projects.filter((project) =>
    project.id.toLowerCase() === folded || project.aliases.some((alias) => alias.toLowerCase() === folded));
  if (matches.length === 0) throw new Error(`no project matches '${query}'`);
  if (matches.length > 1) throw new Error(`project query is ambiguous: '${query}'`);
  return matches[0]!;
}

export function listProjects(homeArgument?: string): ProjectList {
  const { projects, workspaces } = loadHome(homeArgument);
  const entries: ProjectListEntry[] = [];
  let complete = true;

  for (const project of [...projects.projects].sort((left, right) => {
    const leftId = left.id.toLowerCase();
    const rightId = right.id.toLowerCase();
    return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
  })) {
    try {
      const workspace = workspaceFor(workspaces, project.id);
      entries.push({ project, status: "available", workspace: observeWorkspace(project, workspace) });
    } catch (error: unknown) {
      complete = false;
      const configured = workspaces.workspaces.find((workspace) => workspace.projectId === project.id);
      entries.push({
        project,
        status: "unverified",
        workspace: configured ? { path: configured.path } : null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { version: "rosso.project-list.v1", complete, projects: entries };
}
