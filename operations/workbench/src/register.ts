import { basename, join } from "node:path";
import type { Project, Workspace } from "./contracts";
import { loadHome, saveJson, validateProjects, validateWorkspaces } from "./home";
import {
  gitRoot,
  normalizedRepository,
  repositoryBasename,
  repositoryLocator,
  requiredGit,
} from "./workspace";

export interface RegisterArguments {
  path: string;
  id: string;
  aliases: string[];
}

function nonempty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must be a non-empty string`);
  return normalized;
}

function foldedCompare(left: string, right: string): number {
  const leftFolded = left.toLowerCase();
  const rightFolded = right.toLowerCase();
  return leftFolded < rightFolded ? -1 : leftFolded > rightFolded ? 1 : 0;
}

export function registerProject(homeArgument: string | undefined, arguments_: RegisterArguments): {
  project: Project;
  workspace: Workspace;
} {
  const current = loadHome(homeArgument);
  const root = gitRoot(arguments_.path);
  const repository = repositoryLocator(requiredGit(["remote", "get-url", "origin"], root));
  const additions = [basename(root), repositoryBasename(repository), ...arguments_.aliases]
    .map((alias) => nonempty(alias, "alias"));
  const projectId = nonempty(arguments_.id, "project id");
  let project = current.projects.projects.find((entry) => entry.id === projectId);
  if (!project) {
    project = { id: projectId, repository, aliases: [] };
    current.projects.projects.push(project);
  } else if (normalizedRepository(project.repository) !== normalizedRepository(repository)) {
    throw new Error(`refusing to rebind stable project id ${projectId}: expected ${project.repository}, observed ${repository}`);
  }
  project.repository = repository;
  project.aliases = [...new Set([...project.aliases, ...additions])].sort(foldedCompare);

  let workspace = current.workspaces.workspaces.find((entry) => entry.projectId === projectId);
  if (!workspace) {
    workspace = { projectId, path: root };
    current.workspaces.workspaces.push(workspace);
  } else {
    workspace.path = root;
  }
  validateProjects(current.projects);
  validateWorkspaces(current.workspaces);
  saveJson(join(current.home, "config", "projects.json"), current.projects);
  saveJson(join(current.home, "state", "workspaces.json"), current.workspaces);
  return { project, workspace };
}
