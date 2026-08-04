import { existsSync, readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { loadHome } from "./home";
import { gitRoot, normalizedRepository, observeWorkspace } from "./workspace";
import { listPrincipalTasks } from "./tasks";

interface HostStatusInput {
  readonly cwd?: unknown;
  readonly workspace?: {
    readonly current_dir?: unknown;
  };
}

export interface StatusLineProjection {
  readonly version: "rosso.status-line.v1";
  readonly path: string;
  readonly git: {
    readonly available: boolean;
    readonly branch: string | null;
    readonly dirty: boolean;
  };
  readonly projectId: string | null;
  readonly tasks: {
    readonly standing: "current-worktree" | "global" | "unregistered" | "source-unavailable";
    readonly principal: number;
    readonly agent: number;
    readonly external: number;
  };
}

export function statusLineProjection(
  homeArgument: string | undefined,
  cwdArgument: string,
): StatusLineProjection {
  const cwd = canonicalPath(cwdArgument);
  let workspace: ReturnType<typeof observeWorkspace>;
  try {
    workspace = observeWorkspace({ id: null, repository: null }, { path: gitRoot(cwd) });
  } catch {
    return unavailableGitProjection(cwd);
  }

  const branch = workspace.branch ?? workspace.head?.slice(0, 8) ?? null;
  const base = {
    version: "rosso.status-line.v1" as const,
    path: workspace.path,
    git: {
      available: true,
      branch,
      dirty: workspace.dirty,
    },
  };

  try {
    const home = loadHome(homeArgument);
    const projects = workspace.origin === null
      ? []
      : home.projects.projects.filter((project) =>
          normalizedRepository(project.repository) === normalizedRepository(workspace.origin!)
        );
    const unsettled = listPrincipalTasks(home.home).tasks.filter((task) => task.lifecycle !== "settled");
    if (projects.length !== 1) {
      return {
        ...base,
        projectId: null,
        tasks: taskCounts("global", unsettled),
      };
    }

    const project = projects[0]!;
    const tasks = unsettled.filter((task) =>
      task.binding.kind === "project-context"
      && task.binding.projectId === project.id
      && (task.binding.worktreePath === undefined
        || canonicalPath(task.binding.worktreePath) === workspace.path)
    );
    return {
      ...base,
      projectId: project.id,
      tasks: taskCounts("current-worktree", tasks),
    };
  } catch {
    return {
      ...base,
      projectId: null,
      tasks: emptyTasks("source-unavailable"),
    };
  }
}

export function renderStatusLine(projection: StatusLineProjection): string {
  const locus = projection.git.available
    ? `${projection.path} · ${projection.git.branch ?? "unborn"}${projection.git.dirty ? " *" : ""}`
    : `${projection.path} · no Git`;
  const project = projection.projectId === null ? "" : ` · ${projection.projectId}`;
  if (projection.tasks.standing === "unregistered") {
    return `Rossovia${project} · ${locus} · 未登记`;
  }
  if (projection.tasks.standing === "source-unavailable") {
    return `Rossovia${project} · ${locus} · 任务源不可用`;
  }
  const scope = projection.tasks.standing === "global" ? " · 全局" : "";
  const external = projection.tasks.external > 0 ? ` · 待外部 ${projection.tasks.external}` : "";
  return `Rossovia${project} · ${locus}${scope} · 待我 ${projection.tasks.principal} · 待 Agent ${projection.tasks.agent}${external}`;
}

export function cwdFromStatusInput(rawInput: string, explicit?: string): string {
  if (explicit?.trim()) return explicit;
  if (!rawInput.trim()) return process.cwd();
  try {
    const input = JSON.parse(rawInput) as HostStatusInput;
    if (typeof input.workspace?.current_dir === "string" && input.workspace.current_dir.trim()) {
      return input.workspace.current_dir;
    }
    if (typeof input.cwd === "string" && input.cwd.trim()) return input.cwd;
  } catch {
    // A host status line must degrade visibly instead of leaving an empty UI.
  }
  return process.cwd();
}

export function statusLineInput(stdinIsTty: boolean | undefined): string {
  return stdinIsTty ? "" : readFileSync(0, "utf8");
}

function canonicalPath(path: string): string {
  const resolved = resolve(path);
  return existsSync(resolved) ? realpathSync(resolved) : resolved;
}

function emptyTasks(standing: StatusLineProjection["tasks"]["standing"]): StatusLineProjection["tasks"] {
  return { standing, principal: 0, agent: 0, external: 0 };
}

function taskCounts(
  standing: StatusLineProjection["tasks"]["standing"],
  tasks: ReturnType<typeof listPrincipalTasks>["tasks"],
): StatusLineProjection["tasks"] {
  return {
    standing,
    principal: tasks.filter((task) => task.nextActor === "principal").length,
    agent: tasks.filter((task) => task.nextActor === "agent").length,
    external: tasks.filter((task) => task.nextActor === "external").length,
  };
}

function unavailableGitProjection(path: string): StatusLineProjection {
  return {
    version: "rosso.status-line.v1",
    path,
    git: { available: false, branch: null, dirty: false },
    projectId: null,
    tasks: emptyTasks("unregistered"),
  };
}
