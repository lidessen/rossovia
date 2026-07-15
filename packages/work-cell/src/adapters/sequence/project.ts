import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { z } from "zod";
import { BudgetSchema, type CellRunRecord } from "../../contracts";
import { SequenceCellInputSchema, type SequenceCellInput } from "./genome";

export const DEFAULT_PROJECT_EXCLUDES = [".git", ".work-cell", "node_modules"] as const;

export const ProjectProbeRequestSchema = z.object({
  intent: z.string().min(1),
  acceptance: z.array(z.string().min(1)).min(1),
  scopes: z.array(z.string().min(1)).default(["."]),
  id: z.string().min(1).optional(),
  budget: BudgetSchema.partial().optional(),
  startDir: z.string().min(1).optional(),
});

export type ProjectProbeRequest = z.infer<typeof ProjectProbeRequestSchema>;

export interface SequenceProject {
  root: string;
  sequencePath: string;
  interpretationsDir: string;
}

export async function discoverSequenceProject(startDir = process.cwd()): Promise<SequenceProject> {
  let directory = resolve(startDir);
  while (true) {
    const sequencePath = join(directory, "principles", "SEQUENCE.md");
    const interpretationsDir = join(directory, "principles", "interpretations");
    if ((await isFile(sequencePath)) && (await isDirectory(interpretationsDir))) {
      return { root: directory, sequencePath, interpretationsDir };
    }
    const parent = dirname(directory);
    if (parent === directory) {
      throw new Error(
        `no Sequence-bearing project found above ${resolve(startDir)}; expected principles/SEQUENCE.md and principles/interpretations/`,
      );
    }
    directory = parent;
  }
}

export async function lowerProjectProbe(unparsed: unknown): Promise<SequenceCellInput> {
  const request = ProjectProbeRequestSchema.parse(unparsed);
  const project = await discoverSequenceProject(request.startDir);
  const scopes = unique(request.scopes);
  const readPaths = unique([
    ...scopes,
    relativeTo(project.root, project.sequencePath),
    relativeTo(project.root, project.interpretationsDir),
  ]);
  const budget = {
    maxSteps: 16,
    maxDurationMs: 300_000,
    maxCommandOutputBytes: 64_000,
    ...request.budget,
  };

  return SequenceCellInputSchema.parse({
    id: request.id ?? `probe-${slug(request.intent)}`,
    intent: request.intent,
    workspace: {
      root: project.root,
      readPaths,
      writePaths: [],
      excludePaths: [...DEFAULT_PROJECT_EXCLUDES],
      allowedCommands: [],
    },
    genome: {
      sequencePath: relativeTo(project.root, project.sequencePath),
      interpretationsDir: relativeTo(project.root, project.interpretationsDir),
    },
    dna: {
      baseInstructions: [
        "This is a read-only project probe.",
        "Ground every material claim in readable project files and return traceable evidence.",
        "Do not request or imply write authority, command authority, candidate adoption, or semantic acceptance.",
      ].join(" "),
      capabilities: ["read repository files", "analyze project evidence", "return evidence-backed findings"],
    },
    capabilitiesRequired: ["read repository files", "analyze project evidence"],
    terminalTools: [{
      name: "finish_probe",
      description: "Signal that the evidence-backed project probe is complete.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    }],
    acceptance: request.acceptance,
    budget,
  });
}

export async function persistProjectRun(record: CellRunRecord, projectRoot: string): Promise<string> {
  const runs = join(projectRoot, ".work-cell", "runs");
  await mkdir(runs, { recursive: true });
  const stamp = record.startedAt.replaceAll(/[:.]/g, "-");
  const path = join(runs, `${stamp}-${slug(record.cellId)}-${record.runId}.json`);
  await writeFile(path, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return path;
}

export async function latestProjectRun(startDir = process.cwd()): Promise<string> {
  const project = await discoverSequenceProject(startDir);
  const runs = join(project.root, ".work-cell", "runs");
  const entries = await readdir(runs, { withFileTypes: true }).catch((error: unknown) => {
    if (isMissing(error)) return [];
    throw error;
  });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => join(runs, entry.name))
    .sort();
  const latest = files.at(-1);
  if (!latest) throw new Error(`no retained Work Cell records under ${runs}`);
  return latest;
}

function relativeTo(root: string, path: string): string {
  const value = relative(root, path).replaceAll("\\", "/");
  if (!value || value.startsWith("../") || isAbsolute(value)) throw new Error(`path is outside project root: ${path}`);
  return value;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map(normalizeScope))];
}

function normalizeScope(value: string): string {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
  return normalized || ".";
}

function slug(value: string): string {
  const normalized = value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
  return normalized.slice(0, 48) || basename("probe");
}

async function isFile(path: string): Promise<boolean> {
  return (await stat(path).catch(() => undefined))?.isFile() ?? false;
}

async function isDirectory(path: string): Promise<boolean> {
  return (await stat(path).catch(() => undefined))?.isDirectory() ?? false;
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
