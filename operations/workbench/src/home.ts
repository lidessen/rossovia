import { randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { z } from "zod";
import {
  ManifestSchema,
  PrincipalTasksSchema,
  PreferencesSchema,
  ProjectsSchema,
  RootsSchema,
  SetupSelectionSchema,
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
  writeAccess: "verified";
}

const homeDirectories = ["config", "state", "receipts", "cache"];

/**
 * The injectable initialization seam for home creation. The production
 * default is an exclusive no-clobber publication: the full payload is
 * staged, fsynced, and admitted with one atomic no-replace link, so a file
 * published by another transition (a migration winner or a serialized
 * registration) is never overwritten — the creation either publishes the
 * missing initial state atomically or fails with EEXIST and leaves the
 * existing bytes untouched, and no partial bytes are ever visible at the
 * canonical path. Tests inject a recording or barrier implementation at this
 * exact boundary; no production code reads test-only environment variables
 * and ordinary initializeHome behavior is unchanged.
 */
export interface HomeIo {
  createFileExclusive(path: string, data: string): void;
}

/**
 * The low-level operations behind one exclusive no-clobber publication. The
 * production default is the synchronous Node filesystem; tests inject a
 * fault-recording implementation to prove that a canonical file is never
 * admitted with partial bytes and that a winner already published at the
 * canonical path is never clobbered.
 */
export interface ExclusivePublishOps {
  writeFile(path: string, data: string): void;
  fsyncFile(path: string): void;
  link(source: string, destination: string): void;
  remove(path: string): void;
}

export const nodeExclusivePublishOps: ExclusivePublishOps = {
  writeFile: (path, data) => writeFileSync(path, data, "utf8"),
  fsyncFile: (path) => {
    const descriptor = openSync(path, "r+");
    try {
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
  },
  link: (source, destination) => linkSync(source, destination),
  remove: (path) => rmSync(path, { force: true }),
};

/**
 * Publish `data` at `path` only if `path` does not exist, without ever
 * exposing partial bytes there. The full payload is written to a unique stage
 * in the same directory, fsynced, and then admitted with one atomic
 * no-replace link; if another creator already owns the path, the link fails
 * with EEXIST and the existing bytes are left untouched. Cleanup removes only
 * this caller's own unique stage — never the final path or another owner's
 * file — so a failed publication leaves the canonical path exactly as it was
 * observed: absent, or holding the winner's complete bytes.
 */
export function exclusivePublish(
  path: string,
  data: string,
  ops: ExclusivePublishOps = nodeExclusivePublishOps,
): void {
  const stage = `${path}.${randomUUID()}.tmp`;
  try {
    ops.writeFile(stage, data);
    ops.fsyncFile(stage);
    ops.link(stage, path);
  } catch (error: unknown) {
    try {
      ops.remove(stage);
    } catch {
      // Preserve the publication failure. The stage name is unique and the
      // canonical path was never written directly.
    }
    throw error;
  }
  // The canonical path now has its own link; removing the stage cannot
  // affect the published entry.
  try {
    ops.remove(stage);
  } catch {
    // A leftover unique stage is inert; the published entry is complete.
  }
}

export const nodeHomeIo: HomeIo = {
  createFileExclusive: (path, data) => exclusivePublish(path, data),
};

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
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(temporary, serialized, "utf8");
    renameSync(temporary, path);
  } catch (error: unknown) {
    removeProbe(temporary);
    throw new Error(
      `cannot persist Rossovia state at ${path}: ${error instanceof Error ? error.message : String(error)}. `
      + "The current runtime must grant write access to this exact state location.",
    );
  }
}

function verifyDirectoryWrite(directory: string): void {
  const temporary = join(directory, `.rossovia-write-probe-${randomUUID()}.tmp`);
  const renamed = `${temporary}.renamed`;
  try {
    writeFileSync(temporary, "", { encoding: "utf8", flag: "wx" });
    renameSync(temporary, renamed);
    rmSync(renamed);
  } catch (error: unknown) {
    removeProbe(temporary);
    removeProbe(renamed);
    throw new Error(
      `Rossovia home is readable but a required write surface is not writable by the current runtime: ${directory}: `
      + `${error instanceof Error ? error.message : String(error)}. `
      + "Grant write access to the exact ROSSO_HOME and start a fresh agent session before retrying.",
    );
  }
}

function verifyHomeWrite(home: string): void {
  for (const directory of [home, ...homeDirectories.map((entry) => join(home, entry))]) {
    verifyDirectoryWrite(directory);
  }
}

function prepareHomeDirectories(home: string): void {
  try {
    for (const directory of homeDirectories) mkdirSync(join(home, directory), { recursive: true });
  } catch (error: unknown) {
    throw new Error(
      `Rossovia home cannot be prepared by the current runtime: ${home}: `
      + `${error instanceof Error ? error.message : String(error)}. `
      + "Grant write access to the exact ROSSO_HOME and start a fresh agent session before retrying.",
    );
  }
}

function removeProbe(path: string): void {
  try {
    rmSync(path, { force: true });
  } catch {
    // Preserve the original write failure. A later init probe uses a unique name.
  }
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

function errorCode(error: unknown): string | undefined {
  if (error === null || typeof error !== "object") return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function ensureJson<Schema extends z.ZodType>(
  path: string,
  schema: Schema,
  initial: z.input<Schema>,
  validate: (value: z.infer<Schema>) => z.infer<Schema> = (value) => value,
  io: HomeIo = nodeHomeIo,
): z.infer<Schema> {
  // No-clobber exclusive creation: initialization can never overwrite a file
  // another transition (for example a migration winner or a serialized
  // registration) has already published. O_EXCL either creates the missing
  // initial state atomically or fails with EEXIST and leaves the existing
  // bytes untouched, so a concurrent creator simply wins and this caller
  // loads and validates the winner's content.
  const serialized = `${JSON.stringify(initial, null, 2)}\n`;
  try {
    mkdirSync(dirname(path), { recursive: true });
    io.createFileExclusive(path, serialized);
  } catch (error: unknown) {
    if (errorCode(error) !== "EEXIST") {
      throw new Error(
        `cannot persist Rossovia state at ${path}: ${error instanceof Error ? error.message : String(error)}. `
        + "The current runtime must grant write access to this exact state location.",
      );
    }
  }
  return validate(loadJson(path, schema));
}

export function initializeHome(homeArgument?: string, io: HomeIo = nodeHomeIo): InitializedHome {
  const home = resolveHome(homeArgument);
  prepareHomeDirectories(home);
  verifyHomeWrite(home);
  ensureJson(join(home, "manifest.json"), ManifestSchema, {
    version: "rosso.home.v1",
    namespace: "rosso",
    createdAt: now(),
  }, (value) => value, io);
  ensureJson(join(home, "config", "projects.json"), ProjectsSchema, {
    version: "rosso.projects.v1",
    projects: [],
  }, validateProjects, io);
  ensureJson(join(home, "state", "workspaces.json"), WorkspacesSchema, {
    version: "rosso.workspaces.v1",
    workspaces: [],
  }, validateWorkspaces, io);
  const roots = ensureJson(join(home, "state", "roots.json"), RootsSchema, {
    version: "rosso.roots.v1",
    roots: [],
  }, validateRoots, io);
  ensureJson(join(home, "config", "preferences.json"), PreferencesSchema, {
    version: "rosso.preferences.v1",
    preferences: [],
  }, (value) => validatePreferences(value, "user preferences"), io);
  ensureJson(join(home, "state", "tasks.json"), PrincipalTasksSchema, {
    version: "rosso.principal-tasks.v1",
    sourceRevision: 0,
    tasks: [],
  }, (value) => value, io);
  ensureJson(join(home, "config", "setup.json"), SetupSelectionSchema, {
    version: "rosso.setup-selection.v1",
    selections: [],
  }, (value) => value, io);
  const index = ensureJson(join(home, "cache", "workspaces.json"), WorkspaceIndexSchema, {
    version: "rosso.workspace-index.v1",
    generatedAt: now(),
    entries: [],
  }, validateIndex, io);
  return { home, roots, index, writeAccess: "verified" };
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
