import { createHash, randomUUID } from "node:crypto";
import { cp, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { z } from "zod";
import { BudgetEnvelopeSchema, DELIBERATION_VERSION, DeliberationManifestSchema, type DeliberationManifest } from "./runtime";
import { discoverSequenceProject, type SequenceProject } from "../sequence/project";

const SeatSchema = z.object({
  pid: z.string().regex(/^P\d{2,}$/, "expected a P-ID such as P04"),
  role: z.string().min(1),
});

export const ProjectDeliberationRequestSchema = z.object({
  id: z.string().min(1).optional(),
  question: z.string().min(1),
  options: z.array(z.object({ id: z.string().min(1), summary: z.string().min(1) })).min(2).max(4),
  sources: z.array(z.string().min(1)).min(1).max(8),
  seats: z.array(SeatSchema).min(3).max(5),
  budget: z.object({
    envelope: BudgetEnvelopeSchema,
    source: z.string().min(1),
    memberEstimatedTokens: z.number().int().positive(),
    plannedTotalTokens: z.number().int().positive().optional(),
    maxRecoveryAttempts: z.literal(1).optional(),
  }),
  maxSourceChars: z.number().int().positive().max(12_000).default(6_000),
  maxPacketChars: z.number().int().positive().max(36_000).default(18_000),
  startDir: z.string().min(1).optional(),
});

export type ProjectDeliberationRequest = z.infer<typeof ProjectDeliberationRequestSchema>;

export interface PreparedProjectDeliberation {
  directory: string;
  manifestPath: string;
  evidencePath: string;
  manifest: DeliberationManifest;
}

/**
 * Lowers a concise project-facing request into the exact deliberation contract.
 * Every member receives an isolated, compact evidence packet instead of the
 * whole project tree. The packet is ignored raw runtime evidence; its source
 * locators and digests remain in the generated docket text. It deliberately
 * contains excerpts, not an assertion that every source was fully loaded.
 */
export async function prepareProjectDeliberation(unparsed: unknown): Promise<PreparedProjectDeliberation> {
  const request = ProjectDeliberationRequestSchema.parse(unparsed);
  const project = await discoverSequenceProject(request.startDir);
  const sequence = await readSequence(project);
  assertSeats(request, sequence.pids);
  const id = request.id ?? slug(request.question);
  const directory = join(project.root, ".work-cell", "deliberations", `${stamp()}-${slug(id)}-${randomUUID()}`);
  const packetRoot = join(directory, "packet");
  const evidencePath = join(packetRoot, "docket", "evidence.md");
  await mkdir(join(packetRoot, "docket"), { recursive: true });
  await mkdir(join(packetRoot, "principles"), { recursive: true });
  await writeFile(join(packetRoot, "principles", "SEQUENCE.md"), sequence.source, "utf8");
  await cp(project.interpretationsDir, join(packetRoot, "principles", "interpretations"), { recursive: true });

  const evidence = await buildEvidencePacket(project, request);
  await writeFile(evidencePath, evidence, "utf8");
  const manifest = DeliberationManifestSchema.parse({
    version: DELIBERATION_VERSION,
    id,
    question: request.question,
    sources: request.sources,
    options: request.options,
    budget: { envelope: request.budget.envelope, source: request.budget.source, ...(request.budget.plannedTotalTokens ? { plannedTotalTokens: request.budget.plannedTotalTokens } : {}), ...(request.budget.maxRecoveryAttempts ? { recovery: { maxAttemptsPerMember: 2 } } : {}) },
    sequenceCoverage: sequence.pids.map((pid) => ({
      pid,
      status: request.seats.some((seat) => seat.pid === pid) ? "seat" : "guardrail",
      rationale: request.seats.some((seat) => seat.pid === pid)
        ? `Selected deliberation seat: ${request.seats.find((seat) => seat.pid === pid)?.role}`
        : "Not selected as a seat; retain as an explicit constraint on the decision.",
    })),
    members: request.seats.map((seat) => ({
      id: slug(seat.role),
      role: `${seat.pid} — ${seat.role}`,
      input: {
        id: `${slug(id)}-${seat.pid.toLowerCase()}`,
        intent: `Independently assess the docket from the ${seat.pid} perspective. Read the compact evidence packet before judging the options; do not search for evidence outside the packet.`,
        workspace: {
          root: packetRoot,
          readPaths: ["docket", "principles"],
          writePaths: [],
          excludePaths: [],
          allowedCommands: [],
        },
        genome: {
          sequencePath: "principles/SEQUENCE.md",
          interpretationsDir: "principles/interpretations",
          inheritedLineage: { primary: seat.pid, supporting: [] },
        },
          dna: {
            baseInstructions: [
              `You are the ${seat.pid} seat: ${seat.role}.`,
            "Reason only from the bounded evidence packet. Its source excerpts may be incomplete; state a material omission rather than filling it from other project paths.",
            "Do not list or search other project paths.",
            "Return a source-bound position, its strongest counterargument, and the unchanged alternative. You do not own consensus, acceptance, budget expansion, or merge authority.",
          ].join(" "),
          capabilities: ["read compact docket evidence", "analyze selected Sequence interpretation", "return independent position"],
        },
        capabilitiesRequired: ["read compact docket evidence", "analyze selected Sequence interpretation"],
        terminalTools: [{
          name: "finish_position",
          description: "Signal that the independent deliberation position is complete.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
        }],
        acceptance: [
          "Read docket/evidence.md and return a position grounded in its source snippets.",
          "Return the structured deliberation position without requesting wider repository access.",
        ],
        budget: {
          maxSteps: 10,
          estimatedTokens: request.budget.memberEstimatedTokens,
          maxDurationMs: 180_000,
          maxCommandOutputBytes: 24_000,
        },
      },
    })),
  });
  const manifestPath = join(directory, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { directory, manifestPath, evidencePath, manifest };
}

async function buildEvidencePacket(project: SequenceProject, request: ProjectDeliberationRequest): Promise<string> {
  let remaining = request.maxPacketChars;
  const sections = [
    "# Compact deliberation evidence packet",
    `Question: ${request.question}`,
    `Options:\n${request.options.map((option) => `- ${option.id}: ${option.summary}`).join("\n")}`,
    `Source policy: at most ${request.maxSourceChars} characters per source and ${request.maxPacketChars} characters across snippets.`,
    "Evidence boundary: this packet contains bounded excerpts, not complete source text. A source locator and digest identify the full source; a member must report a material omission instead of searching outside this packet.",
  ];
  for (const locator of request.sources) {
    const path = await resolveProjectSource(project.root, locator);
    const source = await readFile(path, "utf8");
    const included = source.slice(0, Math.min(request.maxSourceChars, remaining));
    remaining -= included.length;
    const digest = createHash("sha256").update(source).digest("hex");
    sections.push(
      [
        `## Source: ${locator}`,
        `SHA-256: ${digest}`,
        source.length > included.length ? `Excerpt: first ${included.length} of ${source.length} characters.` : "Excerpt: complete source.",
        included,
      ].join("\n\n"),
    );
    if (remaining === 0) break;
  }
  return `${sections.join("\n\n")}\n`;
}

async function readSequence(project: SequenceProject): Promise<{ source: string; pids: string[] }> {
  const source = await readFile(project.sequencePath, "utf8");
  const pids = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^P\d{2,}｜/.test(line))
    .map((line) => line.slice(0, line.indexOf("｜")));
  if (pids.length === 0) throw new Error(`no Sequence P-IDs found in ${project.sequencePath}`);
  return { source, pids };
}

function assertSeats(request: ProjectDeliberationRequest, pids: string[]): void {
  const ids = request.seats.map((seat) => seat.pid);
  if (new Set(ids).size !== ids.length) throw new Error("deliberation seat P-IDs must be unique");
  for (const pid of ids) {
    if (!pids.includes(pid)) throw new Error(`deliberation seat selects unknown P-ID: ${pid}`);
  }
  const roles = request.seats.map((seat) => slug(seat.role));
  if (new Set(roles).size !== roles.length) throw new Error("deliberation seat roles must yield unique member IDs");
  if (request.seats.length * request.budget.memberEstimatedTokens > request.budget.envelope.maxTotalTokens) {
    throw new Error("deliberation seat token estimates exceed the allocation envelope");
  }
}

async function resolveProjectSource(root: string, locator: string): Promise<string> {
  if (isAbsolute(locator)) throw new Error(`deliberation source must be project-relative: ${locator}`);
  const actualRoot = await realpath(root);
  const path = await realpath(resolve(actualRoot, locator));
  const offset = relative(actualRoot, path);
  if (offset === ".." || offset.startsWith(`..${sep}`) || isAbsolute(offset)) {
    throw new Error(`deliberation source escapes project root: ${locator}`);
  }
  return path;
}

function stamp(): string {
  return new Date().toISOString().replaceAll(/[:.]/g, "-");
}

function slug(value: string): string {
  const normalized = value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
  return normalized.slice(0, 48) || basename("deliberation");
}
