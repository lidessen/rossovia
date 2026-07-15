import { z } from "zod";
import { CellInputSchema, type CellUsage } from "../../contracts";
import type { Workspace } from "../../workspace";

export const DnaSchema = z.object({
  baseInstructions: z.string().min(1),
  capabilities: z.array(z.string().min(1)).default([]),
}).strict();

const PidSchema = z.string().regex(/^P\d{2,}$/, "expected a P-ID such as P04");

export const GenomeSchema = z.object({
  sequencePath: z.string().min(1),
  interpretationsDir: z.string().min(1),
  inheritedLineage: z.object({
    primary: PidSchema,
    supporting: z.array(PidSchema).max(3).default([]),
  }).strict().optional(),
}).strict();

export const GeneExpressionSchema = z.object({
  lead: PidSchema,
  supports: z.array(PidSchema).max(3).default([]),
  principalContradiction: z.string().min(1),
  contributions: z.array(z.object({
    pid: PidSchema,
    decision: z.string().min(1),
  }).strict()).min(1).max(4),
}).strict().superRefine((value, context) => {
  const selected = [value.lead, ...value.supports];
  if (new Set(selected).size !== selected.length) {
    context.addIssue({ code: "custom", path: ["supports"], message: "selected P-IDs must be unique" });
  }
  const contributed = new Set(value.contributions.map((item) => item.pid));
  for (const pid of selected) {
    if (!contributed.has(pid)) {
      context.addIssue({ code: "custom", path: ["contributions"], message: `missing decision contribution for ${pid}` });
    }
  }
  for (const pid of contributed) {
    if (!selected.includes(pid)) {
      context.addIssue({ code: "custom", path: ["contributions"], message: `contribution references unselected ${pid}` });
    }
  }
});

export const SequenceCellInputSchema = CellInputSchema.omit({
  instructions: true,
  capabilities: true,
  context: true,
}).extend({
  genome: GenomeSchema,
  dna: DnaSchema,
}).strict();

export type GeneExpression = z.infer<typeof GeneExpressionSchema>;
export type SequenceCellInput = z.infer<typeof SequenceCellInputSchema>;

export interface SequenceGene {
  pid: string;
  line: string;
}

export interface Genome {
  source: string;
  genes: SequenceGene[];
  inheritedLineage?: {
    primary: string;
    supporting: string[];
  };
}

export interface ExpressedGenome {
  expression: GeneExpression;
  interpretationPaths: string[];
  context: string;
}

export interface GeneSelectionResult {
  expression: GeneExpression;
  usage: CellUsage;
  rawSteps: unknown[];
  providerMetadata?: unknown;
}

export async function loadGenome(input: SequenceCellInput, workspace: Workspace): Promise<Genome> {
  const sequencePath = input.genome.sequencePath;
  const source = await workspace.readText(sequencePath);
  const genes = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^P\d{2,}｜/.test(line))
    .map((line) => ({ pid: line.slice(0, line.indexOf("｜")), line }));
  if (genes.length === 0) throw new Error(`no Sequence genes found in ${sequencePath}`);
  if (new Set(genes.map((gene) => gene.pid)).size !== genes.length) {
    throw new Error(`duplicate P-ID in ${sequencePath}`);
  }
  return {
    source: sequencePath,
    genes,
    ...(input.genome.inheritedLineage ? { inheritedLineage: input.genome.inheritedLineage } : {}),
  };
}

export async function expressGenome(
  input: SequenceCellInput,
  workspace: Workspace,
  genome: Genome,
  proposed: GeneExpression,
): Promise<ExpressedGenome> {
  const expression = GeneExpressionSchema.parse(proposed);
  const known = new Set(genome.genes.map((gene) => gene.pid));
  for (const pid of [expression.lead, ...expression.supports]) {
    if (!known.has(pid)) throw new Error(`gene expression selected unknown P-ID: ${pid}`);
  }

  const interpretationPaths = [expression.lead, ...expression.supports].map(
    (pid) => `${input.genome.interpretationsDir.replace(/\/$/, "")}/${pid}.md`,
  );
  const interpretations = await Promise.all(
    interpretationPaths.map(async (path) => ({ path, content: await workspace.readText(path) })),
  );
  return {
    expression,
    interpretationPaths,
    context: interpretations
      .map(({ path, content }) => `## ${path}\n\n${content.trim()}`)
      .join("\n\n"),
  };
}

export function renderGenomeForSelection(genome: Genome): string {
  const lineage = genome.inheritedLineage
    ? `\nInherited expression lineage (orientation, not a forced task lead): primary ${genome.inheritedLineage.primary}; supporting ${genome.inheritedLineage.supporting.join(", ") || "none"}.`
    : "";
  return `${genome.genes.map((gene) => gene.line).join("\n")}${lineage}`;
}
