import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { z } from "zod";
import {
  ManifestSchema,
  PreferencesSchema,
  ProjectsSchema,
  RootsSchema,
  WorkspaceIndexSchema,
  WorkspacesSchema,
  type Projects,
  type Preferences,
  type Roots,
  type Workspace,
  type WorkspaceIndex,
  type Workspaces,
} from "./contracts";
import { expandPath } from "./paths";
import { repositoryLocator } from "./workspace";

export interface HomeSources {
  home: string;
  projects: Projects;
  roots: Roots;
  workspaces: Workspaces;
}

export interface InitializedHome {
  home: string;
  roots: Roots;
  index: WorkspaceIndex;
}

const homeDirectories = ["config", "state", "receipts", "cache"];

export function resolveHome(homeArgument?: string): string {
  return expandPath(homeArgument ?? process.env.ROSSO_HOME ?? "~/.rosso");
}

function fold(value: string): string {
  return value.toLowerCase();
}

export function loadJson<Schema extends z.ZodType>(path: string, schema: Schema): z.infer<Schema> {
  if (!existsSync(path)) throw new Error(`required rossovia workbench source not found: ${path}`);
  return schema.parse(JSON.parse(readFileSync(path, "utf8")));
}

export function saveJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

export function validateProjects(projects: Projects): Projects {
  const ids = new Set<string>();
  const lookup = new Map<string, string>();
  for (const project of projects.projects) {
    const foldedId = fold(project.id);
    if (ids.has(foldedId)) throw new Error(`duplicate project id: ${project.id}`);
    ids.add(foldedId);
    const existingId = lookup.get(foldedId);
    if (existingId && existingId !== project.id) {
      throw new Error(`project lookup key '${project.id}' belongs to both ${existingId} and ${project.id}`);
    }
    lookup.set(foldedId, project.id);
    if (repositoryLocator(project.repository) !== project.repository) {
      throw new Error(`project ${project.id}.repository must be a credential-free canonical locator`);
    }
    const aliases = project.aliases.map(fold);
    if (new Set(aliases).size !== aliases.length) throw new Error(`project ${project.id} aliases must be unique`);
    for (const alias of aliases) {
      const owner = lookup.get(alias);
      if (owner && owner !== project.id) {
        throw new Error(`project lookup key '${alias}' belongs to both ${owner} and ${project.id}`);
      }
      lookup.set(alias, project.id);
    }
  }
  return projects;
}

export function validateWorkspaces(workspaces: Workspaces): Workspaces {
  const ids = new Set<string>();
  for (const workspace of workspaces.workspaces) {
    if (ids.has(workspace.projectId)) throw new Error(`duplicate workspace mapping: ${workspace.projectId}`);
    ids.add(workspace.projectId);
  }
  return workspaces;
}

export function validateRoots(roots: Roots): Roots {
  if (new Set(roots.roots).size !== roots.roots.length) {
    throw new Error("workspace roots must be unique");
  }
  return roots;
}

export function validateIndex(index: WorkspaceIndex): WorkspaceIndex {
  const paths = new Set<string>();
  for (const entry of index.entries) {
    if (paths.has(entry.path)) throw new Error(`duplicate indexed workspace path: ${entry.path}`);
    paths.add(entry.path);
    if (entry.repository !== null && repositoryLocator(entry.repository) !== entry.repository) {
      throw new Error(`indexed workspace ${entry.path}.repository must be a credential-free canonical locator`);
    }
  }
  return index;
}

export function validatePreferences(preferences: Preferences, label: string): Preferences {
  const identities = new Set<string>();
  for (const preference of preferences.preferences) {
    const identity = `${fold(preference.id)}\0${preference.projectId ? fold(preference.projectId) : ""}`;
    if (identities.has(identity)) {
      throw new Error(`duplicate ${label} preference: ${preference.id} for ${preference.projectId ?? "all projects"}`);
    }
    identities.add(identity);
  }
  return preferences;
}

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function ensureJson<Schema extends z.ZodType>(
  path: string,
  schema: Schema,
  initial: z.input<Schema>,
  validate: (value: z.infer<Schema>) => z.infer<Schema> = (value) => value,
): z.infer<Schema> {
  if (!existsSync(path)) saveJson(path, initial);
  return validate(loadJson(path, schema));
}

export function initializeHome(homeArgument?: string): InitializedHome {
  const home = resolveHome(homeArgument);
  for (const directory of homeDirectories) mkdirSync(join(home, directory), { recursive: true });
  ensureJson(join(home, "manifest.json"), ManifestSchema, {
    version: "rosso.home.v1",
    namespace: "rosso",
    createdAt: now(),
  });
  ensureJson(join(home, "config", "projects.json"), ProjectsSchema, {
    version: "rosso.projects.v1",
    projects: [],
  }, validateProjects);
  ensureJson(join(home, "state", "workspaces.json"), WorkspacesSchema, {
    version: "rosso.workspaces.v1",
    workspaces: [],
  }, validateWorkspaces);
  const roots = ensureJson(join(home, "state", "roots.json"), RootsSchema, {
    version: "rosso.roots.v1",
    roots: [],
  }, validateRoots);
  ensureJson(join(home, "config", "preferences.json"), PreferencesSchema, {
    version: "rosso.preferences.v1",
    preferences: [],
  }, (value) => validatePreferences(value, "user preferences"));
  const index = ensureJson(join(home, "cache", "workspaces.json"), WorkspaceIndexSchema, {
    version: "rosso.workspace-index.v1",
    generatedAt: now(),
    entries: [],
  }, validateIndex);
  return { home, roots, index };
}

export function loadHome(homeArgument?: string): HomeSources {
  const home = resolveHome(homeArgument);
  loadJson(join(home, "manifest.json"), ManifestSchema);
  const projects = validateProjects(loadJson(join(home, "config", "projects.json"), ProjectsSchema));
  const workspaces = validateWorkspaces(loadJson(join(home, "state", "workspaces.json"), WorkspacesSchema));
  const roots = validateRoots(loadJson(join(home, "state", "roots.json"), RootsSchema));
  return { home, projects, roots, workspaces };
}

export function loadWorkspaceIndex(home: string): WorkspaceIndex {
  return validateIndex(loadJson(join(home, "cache", "workspaces.json"), WorkspaceIndexSchema));
}

export function workspaceFor(workspaces: Workspaces, projectId: string): Workspace {
  const matches = workspaces.workspaces.filter((workspace) => workspace.projectId === projectId);
  if (matches.length === 0) throw new Error(`no local workspace is attached for ${projectId}`);
  return matches[0]!;
}
