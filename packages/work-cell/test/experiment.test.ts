import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CellInput, CellUsage } from "../src/contracts";
import type {
  CellDriver,
  DriverContext,
  DriverResult,
} from "../src/driver";
import { ExperimentSpecSchema, runExperiment } from "../src/adapters/experiment/runtime";
import type { GeneSelectionResult, Genome, SequenceCellInput } from "../src/adapters/sequence/genome";
import type { SequenceSelector } from "../src/adapters/sequence/runtime";
import type {
  ComparisonJudge,
  ComparisonJudgeRequest,
  ComparisonJudgeResult,
} from "../src/adapters/experiment/judge";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

test("experiment keeps variants blind and attributes a treatment-only decision", async () => {
  const root = await fixture();
  const spec = ExperimentSpecSchema.parse({
    id: "blind-attribution",
    fixture: { root: "fixture", overlays: [] },
    outputDir: "results",
    task: {
      id: "rewrite",
      intent: "Rewrite SKILL.md",
      workspace: { readPaths: ["."], writePaths: ["SKILL.md"], allowedCommands: [] },
      genome: {
        sequencePath: "principles/SEQUENCE.md",
        interpretationsDir: "principles/interpretations",
      },
      dna: { baseInstructions: "Rewrite", capabilities: ["read", "write"] },
      capabilitiesRequired: ["read", "write"],
      acceptance: ["Keep boundaries"],
      budget: {
        maxSteps: 4,
        estimatedTokens: 1_000,
        maxDurationMs: 5_000,
        maxCommandOutputBytes: 2_000,
      },
    },
    variants: [
      { id: "baseline" },
      { id: "treatment", treatment: { id: "candidate", instructions: "Protect process space" } },
    ],
    repetitions: 1,
    judge: { rubric: "Prefer the artifact that protects bounded autonomy" },
  });
  const judge = new DiffJudge();

  const record = await runExperiment(spec, root, () => new VariantDriver(), judge);

  expect(record.runs).toHaveLength(2);
  expect(record.comparisons[0]?.attribution).toBe("supported");
  expect(judge.sawTreatmentMetadata).toBe(false);
  const treatment = record.runs.find((run) => run.variantId === "treatment");
  expect(treatment?.record.workspaceDiff.changed).toContain("SKILL.md");
  expect(await readFile(join(treatment!.directory, "record.json"), "utf8")).toContain("work-cell.run.v4");
});

test("experiment skips its judge when either Work Cell is unsettled", async () => {
  const root = await fixture();
  const spec = ExperimentSpecSchema.parse({
    id: "invalid-pair",
    fixture: { root: "fixture", overlays: [] },
    outputDir: "results",
    task: {
      id: "rewrite",
      intent: "Rewrite SKILL.md",
      workspace: { readPaths: ["."], writePaths: ["SKILL.md"], allowedCommands: [] },
      genome: {
        sequencePath: "principles/SEQUENCE.md",
        interpretationsDir: "principles/interpretations",
      },
      dna: { baseInstructions: "Rewrite", capabilities: ["read"] },
      capabilitiesRequired: ["read", "write"],
      acceptance: ["Keep boundaries"],
      budget: {
        maxSteps: 4,
        estimatedTokens: 1_000,
        maxDurationMs: 5_000,
        maxCommandOutputBytes: 2_000,
      },
    },
    variants: [
      { id: "baseline" },
      { id: "treatment", treatment: { id: "candidate", instructions: "Hypothesis" } },
    ],
    repetitions: 1,
    judge: { rubric: "Do not run" },
  });
  const judge = new CountingJudge();

  const record = await runExperiment(spec, root, () => new VariantDriver(), judge);

  expect(judge.calls).toBe(0);
  expect(record.comparisons[0]?.attribution).toBe("inconclusive");
  expect(record.comparisons[0]?.judge.raw).toEqual({ skipped: true });
});

class VariantDriver implements CellDriver, SequenceSelector {
  readonly descriptor = { adapter: "scripted", provider: "test", model: "deterministic" };

  async selectSequenceGenes(
    _input: SequenceCellInput,
    _genome: Genome,
    _context: DriverContext,
  ): Promise<GeneSelectionResult> {
    return {
      expression: {
        lead: "P04",
        supports: [],
        principalContradiction: "Artifact form",
        contributions: [{ pid: "P04", decision: "Select the leading gap" }],
      },
      usage: usage(),
      rawSteps: [],
    };
  }

  async run(input: CellInput, context: DriverContext): Promise<DriverResult> {
    const content = input.instructions.some((instruction) => instruction.includes("Protect process space"))
      ? "# Skill\n\nKeep outcome boundaries; leave the bounded process autonomous.\n"
      : "# Skill\n\nFollow the required process.\n";
    await context.workspace.writeText("SKILL.md", content);
    return {
      finalText: "done",
      terminalToolsCalled: [],
      usage: usage(),
      rawSteps: [],
    };
  }
}

class DiffJudge implements ComparisonJudge {
  sawTreatmentMetadata = false;

  async judge(request: ComparisonJudgeRequest): Promise<ComparisonJudgeResult> {
    const serialized = JSON.stringify(request);
    this.sawTreatmentMetadata = serialized.includes('"treatment"') || serialized.includes('"candidate"');
    const aHasAutonomy = Object.values(request.a.diffs).some((diff) => diff.includes("bounded process autonomous"));
    const bHasAutonomy = Object.values(request.b.diffs).some((diff) => diff.includes("bounded process autonomous"));
    const preferred = aHasAutonomy ? "A" : bHasAutonomy ? "B" : "inconclusive";
    return {
      judgement: {
        preferred,
        acceptance: [],
        findings: [],
        evidence: [],
      },
      usage: usage(),
      raw: {},
    };
  }
}

class CountingJudge implements ComparisonJudge {
  calls = 0;
  async judge(): Promise<ComparisonJudgeResult> {
    this.calls += 1;
    throw new Error("judge should have been skipped");
  }
}

function usage(): CellUsage {
  return { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 };
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "work-cell-experiment-test-"));
  roots.push(root);
  const fixtureRoot = join(root, "fixture");
  await mkdir(join(fixtureRoot, "principles", "interpretations"), { recursive: true });
  await writeFile(join(fixtureRoot, "SKILL.md"), "# Old skill\n");
  await writeFile(
    join(fixtureRoot, "principles", "SEQUENCE.md"),
    "# Principle Sequence\nP04｜主要矛盾｜矛盾论\n",
  );
  await writeFile(
    join(fixtureRoot, "principles", "interpretations", "P04.md"),
    "# P04\n\nFind the leading contradiction.\n",
  );
  return root;
}
