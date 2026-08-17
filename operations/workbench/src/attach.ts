import { join } from "node:path";
import { ManifestSchema } from "./contracts";
import { loadJson, resolveHome } from "./home";
import { registeredProjectByQuery } from "./projects";
import { transitionRegistration } from "./registration";
import { gitRoot, normalizedRepository, repositoryLocator, requiredGit } from "./workspace";

export function attachWorkspace(homeArgument: string | undefined, query: string, path: string): {
  projectId: string;
  path: string;
} {
  // Preserve the historical failure precedence: an uninitialized or unreadable
  // home is reported before workspace path errors. This is a validation read
  // only; the mutation re-reads the pair under the serialized transition lock.
  loadJson(join(resolveHome(homeArgument), "manifest.json"), ManifestSchema);
  return transitionRegistration(homeArgument, (current) => {
    const project = registeredProjectByQuery(current.projects, query);
    const root = gitRoot(path);
    const origin = repositoryLocator(requiredGit(["remote", "get-url", "origin"], root));
    if (normalizedRepository(origin) !== normalizedRepository(project.repository)) {
      throw new Error(`refusing to attach a different repository: expected ${project.repository}, observed ${origin}`);
    }
    const workspace = current.workspaces.workspaces.find((entry) => entry.projectId === project.id);
    if (workspace) workspace.path = root;
    else current.workspaces.workspaces.push({ projectId: project.id, path: root });
    return { projectId: project.id, path: root };
  });
}
