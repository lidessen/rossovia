import type { CellInput, GeneExpression } from "./contracts";
import { GeneExpressionSchema } from "./contracts";
import type { Workspace } from "./workspace";

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

export async function loadGenome(input: CellInput, workspace: Workspace): Promise<Genome> {
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
  input: CellInput,
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
