import { join } from "node:path";
import { loadHome, saveJson, validateWorkspaces } from "./home";
import { registeredProjectByQuery } from "./projects";
import { gitRoot, normalizedRepository, repositoryLocator, requiredGit } from "./workspace";

export function attachWorkspace(homeArgument: string | undefined, query: string, path: string): {
  projectId: string;
  path: string;
} {
  const current = loadHome(homeArgument);
  const project = registeredProjectByQuery(current.projects, query);
  const root = gitRoot(path);
  const origin = repositoryLocator(requiredGit(["remote", "get-url", "origin"], root));
  if (normalizedRepository(origin) !== normalizedRepository(project.repository)) {
    throw new Error(`refusing to attach a different repository: expected ${project.repository}, observed ${origin}`);
  }
  const workspace = current.workspaces.workspaces.find((entry) => entry.projectId === project.id);
  if (workspace) workspace.path = root;
  else current.workspaces.workspaces.push({ projectId: project.id, path: root });
  validateWorkspaces(current.workspaces);
  saveJson(join(current.home, "state", "workspaces.json"), current.workspaces);
  return { projectId: project.id, path: root };
}
