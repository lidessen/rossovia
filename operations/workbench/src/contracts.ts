import { z } from "zod";

const nonempty = z.string().refine((value) => value.trim().length > 0, "must be a non-empty string");

export const ManifestSchema = z.object({
  version: z.literal("rosso.home.v1"),
  namespace: z.literal("rosso"),
  createdAt: nonempty,
}).passthrough();

export const ProjectSchema = z.object({
  id: nonempty,
  repository: nonempty,
  aliases: z.array(nonempty).min(1),
}).passthrough();

export const ProjectsSchema = z.object({
  version: z.literal("rosso.projects.v1"),
  projects: z.array(ProjectSchema),
}).passthrough();

export const WorkspaceSchema = z.object({
  projectId: nonempty,
  path: nonempty,
}).passthrough();

export const WorkspacesSchema = z.object({
  version: z.literal("rosso.workspaces.v1"),
  workspaces: z.array(WorkspaceSchema),
}).passthrough();

export const RootsSchema = z.object({
  version: z.literal("rosso.roots.v1"),
  roots: z.array(nonempty),
}).passthrough();

export const WorkspaceIndexEntrySchema = z.object({
  path: nonempty,
  repository: nonempty.nullable(),
  aliases: z.array(nonempty).min(1),
}).passthrough();

export const WorkspaceIndexSchema = z.object({
  version: z.literal("rosso.workspace-index.v1"),
  generatedAt: nonempty,
  entries: z.array(WorkspaceIndexEntrySchema),
}).passthrough();

export const PreferenceSchema = z.object({
  id: nonempty,
  statement: nonempty,
  source: z.literal("user-explicit"),
  recordedAt: nonempty,
  updatedAt: nonempty,
  projectId: nonempty.optional(),
  reopenWhen: nonempty.optional(),
}).strict();

export const PreferencesSchema = z.object({
  version: z.literal("rosso.preferences.v1"),
  preferences: z.array(PreferenceSchema),
}).passthrough();

export const PreferenceReceiptSchema = z.object({
  version: z.literal("rosso.preference-receipt.v2"),
  at: nonempty,
  action: z.enum(["set", "retire"]),
  id: nonempty,
  projectId: nonempty.nullable(),
  recordDigest: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();

export type Project = z.infer<typeof ProjectSchema>;
export type Projects = z.infer<typeof ProjectsSchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;
export type Preference = z.infer<typeof PreferenceSchema>;
export type PreferenceReceipt = z.infer<typeof PreferenceReceiptSchema>;
export type Roots = z.infer<typeof RootsSchema>;
export type Workspace = z.infer<typeof WorkspaceSchema>;
export type Workspaces = z.infer<typeof WorkspacesSchema>;
export type WorkspaceIndex = z.infer<typeof WorkspaceIndexSchema>;

export interface WorkspaceObservation {
  path: string;
  origin: string | null;
  head: string | null;
  branch: string | null;
  dirty: boolean;
  status: string[];
  instructionFiles: string[];
  orientationFiles: string[];
}

export interface Resolution {
  version: "rosso.resolution.v1";
  query: string;
  registration: "registered" | "discovered";
  project: Project | { id: null; repository: string | null; aliases: string[] };
  workspace: WorkspaceObservation;
}

export interface ProjectListEntry {
  project: Project;
  status: "available" | "unverified";
  workspace: WorkspaceObservation | { path: string } | null;
  error?: string;
}

export interface ProjectList {
  version: "rosso.project-list.v1";
  complete: boolean;
  projects: ProjectListEntry[];
}
