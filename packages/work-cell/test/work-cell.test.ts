import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CellInput, CellSubmission, CellUsage, GeneExpression } from "../src/contracts";
import type {
  CellDriver,
  DriverContext,
  DriverResult,
  GeneSelectionResult,
} from "../src/driver";
import { CellBudgetExceededError } from "../src/driver";
import type { ExpressedGenome, Genome } from "../src/genome";
import { runCell } from "../src/run-cell";
import { runCellTree } from "../src/run-tree";
import { Workspace } from "../src/workspace";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("Work Cell core", () => {
  test("expresses a task-specific P-ID team and loads only selected interpretations", async () => {
    const root = await fixture();
    const expression = geneExpression("P04", ["P15"]);
    const driver = new ScriptedDriver(expression, completedSubmission());

    const record = await runCell(input(root), driver);

    expect(record.status).toBe("passed");
    expect(record.geneExpression).toEqual(expression);
    expect(record.loadedInterpretations.map((path) => path.split("/").at(-1))).toEqual([
      "P04.md",
      "P15.md",
    ]);
    expect(record.loadedInterpretations).not.toContain(expect.stringContaining("P03.md"));
    expect(record.verification.passed).toBe(true);
    expect(record.trace.some((event) => event.type === "genes.expressed")).toBe(true);
  });

  test("rejects an expression that selects a P-ID outside the Sequence", async () => {
    const root = await fixture();
    const driver = new ScriptedDriver(geneExpression("P99", []), completedSubmission());

    const record = await runCell(input(root), driver);

    expect(record.status).toBe("failed");
    expect(record.error).toContain("unknown P-ID: P99");
    expect(record.loadedInterpretations).toEqual([]);
  });

  test("does not promote a completed submission when its check plan fails", async () => {
    const root = await fixture();
    const submission = completedSubmission();
    submission.checkPlan.steps[0] = {
      id: "false-check",
      argv: ["false"],
      cwd: ".",
      expectExit: 0,
      timeoutMs: 1_000,
    };
    const base = input(root);
    base.workspace.allowedCommands.push("false");

    const record = await runCell(base, new ScriptedDriver(geneExpression("P13", []), submission));

    expect(record.status).toBe("verification_failed");
    expect(record.verification.passed).toBe(false);
    expect(record.verification.results[0]?.exitCode).not.toBe(0);
  });

  test("retains a valid split as a terminal differentiated outcome", async () => {
    const root = await fixture();
    const submission: CellSubmission = {
      outcome: "split",
      artifact: { summary: "Split by independent evidence surface", files: [] },
      evidence: [{ claim: "Task exceeds one cell", source: "TASK.md:1" }],
      checkPlan: { steps: [] },
      children: [
        {
          id: "inspect-a",
          intent: "Inspect A",
          scope: ["a/"],
          capabilitiesRequired: ["read"],
          acceptance: ["Return cited findings"],
        },
      ],
      blockers: [],
    };

    const record = await runCell(input(root), new ScriptedDriver(geneExpression("P04", []), submission));

    expect(record.status).toBe("split");
    expect(record.submission?.children).toHaveLength(1);
  });

  test("records a hard token-budget failure from any driver adapter", async () => {
    const root = await fixture();
    const driver = new ScriptedDriver(geneExpression("P04", []), completedSubmission());
    driver.selectionError = new CellBudgetExceededError(101, 100);

    const record = await runCell(input(root), driver);

    expect(record.status).toBe("budget_exceeded");
    expect(record.error).toContain("token budget exceeded");
  });

  test("cancels a cell when its duration budget expires", async () => {
    const root = await fixture();
    const base = input(root);
    base.budget.maxDurationMs = 20;
    const driver = new ScriptedDriver(geneExpression("P04", []), completedSubmission());
    driver.selectionDelayMs = 200;

    const record = await runCell(base, driver);

    expect(record.status).toBe("cancelled");
    expect(record.durationMs).toBeLessThan(200);
  });

  test("retains work and execution references as an observation without treating them as a forecast", async () => {
    const root = await fixture();
    const base = input(root);
    base.workEstimate = {
      id: "estimate-1",
      version: "work-estimate.v1",
      decisionHorizon: "mission",
      targetState: "A verified artifact exists",
      sources: ["TASK.md:1"],
      nodes: [{ id: "change", requiredTransition: "Change the artifact", acceptance: "Check passes", dependsOn: [] }],
      discoveryBranches: [],
      reopeningObservation: "The check cannot run",
    };
    base.executionProfile = {
      id: "profile-1",
      version: "execution-profile.v1",
      provider: "deterministic",
      model: "fixture",
      parallelism: "serial",
      priceRevision: "fixture-price-v1",
    };

    const record = await runCell(base, new ScriptedDriver(geneExpression("P04", []), completedSubmission()));

    expect(record.executionObservation).toEqual({
      workEstimateId: "estimate-1",
      executionProfileId: "profile-1",
      priceRevision: "fixture-price-v1",
    });
  });
});

describe("Workspace containment", () => {
  test("rejects traversal, out-of-scope writes, and non-allow-listed commands", async () => {
    const root = await fixture();
    const parsed = input(root);
    const workspace = await Workspace.create(parsed.workspace, parsed.budget);

    await expect(workspace.readText("../outside.txt")).rejects.toThrow("path escapes workspace");
    await expect(workspace.writeText("principles/SEQUENCE.md", "bad")).rejects.toThrow(
      "outside declared scope",
    );
    await expect(workspace.runCommand(["rm", "-rf", "."])).rejects.toThrow("command not allowed");
  });
});

describe("Differentiation tree", () => {
  test("materializes split children as fresh bounded cells", async () => {
    const root = await fixture();
    await mkdir(join(root, "a"), { recursive: true });
    const split: CellSubmission = {
      outcome: "split",
      artifact: { summary: "Split", files: [] },
      evidence: [{ claim: "Independent scope", source: "TASK.md:1" }],
      checkPlan: { steps: [] },
      children: [
        {
          id: "child-a",
          intent: "Inspect A",
          scope: ["a"],
          capabilitiesRequired: ["read"],
          acceptance: ["Return evidence"],
        },
      ],
      blockers: [],
    };
    const rootInput = input(root);
    rootInput.workspace.writePaths = ["."];
    let calls = 0;

    const tree = await runCellTree(rootInput, {
      limits: { maxDepth: 1, maxCells: 3 },
      createDriver: () =>
        new ScriptedDriver(
          geneExpression(calls++ === 0 ? "P04" : "P13", []),
          calls === 1 ? split : completedSubmission(),
        ),
    });

    expect(tree.records).toHaveLength(2);
    expect(tree.records[1]?.parentRunId).toBe(tree.records[0]?.runId);
    expect(tree.records[1]?.depth).toBe(1);
    expect(tree.unresolvedChildren).toEqual([]);
  });

  test("retains unresolved child evidence when a split exceeds depth", async () => {
    const root = await fixture();
    const split: CellSubmission = {
      outcome: "split",
      artifact: { summary: "Split", files: [] },
      evidence: [],
      checkPlan: { steps: [] },
      children: [
        {
          id: "child",
          intent: "Child",
          scope: ["output"],
          capabilitiesRequired: [],
          acceptance: ["Done"],
        },
      ],
      blockers: [],
    };
    const tree = await runCellTree(input(root), {
      limits: { maxDepth: 0, maxCells: 2 },
      createDriver: () => new ScriptedDriver(geneExpression("P04", []), split),
    });

    expect(tree.records).toHaveLength(1);
    expect(tree.unresolvedChildren[0]?.reason).toBe("max_depth");
  });

  test("debits a parent token envelope before each child and settles the tree as partial", async () => {
    const root = await fixture();
    await mkdir(join(root, "a"), { recursive: true });
    await mkdir(join(root, "b"), { recursive: true });
    const split: CellSubmission = {
      outcome: "split",
      artifact: { summary: "Split", files: [] },
      evidence: [{ claim: "Independent scopes", source: "TASK.md:1" }],
      checkPlan: { steps: [] },
      children: [
        { id: "child-a", intent: "Inspect A", scope: ["a"], capabilitiesRequired: ["read"], acceptance: ["Return A"] },
        { id: "child-b", intent: "Inspect B", scope: ["b"], capabilitiesRequired: ["read"], acceptance: ["Return B"] },
      ],
      blockers: [],
    };
    const rootInput = input(root);
    rootInput.workspace.writePaths = ["."];
    rootInput.budget.maxTokens = 100;
    rootInput.budgetEnvelope = {
      id: "tree-budget",
      version: "budget-envelope.v1",
      maxTotalTokens: 20,
      onExhaustion: "partial",
    };
    let calls = 0;

    const tree = await runCellTree(rootInput, {
      limits: { maxDepth: 1, maxCells: 4 },
      createDriver: () => {
        calls += 1;
        return new ScriptedDriver(
          geneExpression("P04", []),
          calls === 1 ? split : completedSubmission(),
          { selection: usage(3, 2), run: usage(3, 2) },
        );
      },
    });

    expect(tree.records).toHaveLength(2);
    expect(tree.records[0]?.input.budget.maxTokens).toBe(20);
    expect(tree.records[1]?.input.budget.maxTokens).toBe(10);
    expect(tree.status).toBe("partial");
    expect(tree.budget).toMatchObject({ consumedTokens: 20, remainingTokens: 0, overrunTokens: 0, status: "partial" });
    expect(tree.budget?.allocations).toHaveLength(2);
    expect(tree.unresolvedChildren).toEqual([
      expect.objectContaining({ child: expect.objectContaining({ id: "child-b" }), reason: "budget_envelope" }),
    ]);
  });
});

class ScriptedDriver implements CellDriver {
  readonly descriptor = {
    adapter: "scripted-test",
    provider: "deterministic",
    model: "fixture",
  };
  selectionError?: Error;
  selectionDelayMs = 0;

  constructor(
    private readonly expression: GeneExpression,
    private readonly submission: CellSubmission,
    private readonly usages: { selection: CellUsage; run: CellUsage } = {
      selection: usage(20, 10),
      run: usage(30, 15),
    },
  ) {}

  async selectGenes(
    _input: CellInput,
    _genome: Genome,
    _context: DriverContext,
  ): Promise<GeneSelectionResult> {
    if (this.selectionError) throw this.selectionError;
    if (this.selectionDelayMs > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, this.selectionDelayMs);
        _context.signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );
      });
    }
    return {
      expression: this.expression,
      usage: this.usages.selection,
      rawSteps: [{ selected: this.expression }],
    };
  }

  async run(
    _input: CellInput,
    expressed: ExpressedGenome,
    _context: DriverContext,
  ): Promise<DriverResult> {
    expect(expressed.expression).toEqual(this.expression);
    return {
      submission: this.submission,
      finalText: "submitted",
      usage: this.usages.run,
      rawSteps: [{ submitted: true }],
    };
  }
}

function input(root: string): CellInput {
  return {
    id: "test-cell",
    intent: "Improve the task artifact without weakening its boundaries",
    workspace: {
      root,
      readPaths: ["."],
      writePaths: ["output"],
      excludePaths: [],
      allowedCommands: ["true"],
    },
    genome: {
      sequencePath: "principles/SEQUENCE.md",
      interpretationsDir: "principles/interpretations",
    },
    dna: {
      baseInstructions: "Ground decisions in the fixture.",
      capabilities: ["read", "write"],
    },
    capabilitiesRequired: ["read"],
    acceptance: ["Return an evidence-backed result"],
    budget: {
      maxSteps: 8,
      maxTokens: 10_000,
      maxDurationMs: 10_000,
      maxCommandOutputBytes: 4_000,
    },
    lineage: { depth: 0 },
  };
}

function completedSubmission(): CellSubmission {
  return {
    outcome: "completed",
    artifact: { summary: "Completed", files: [] },
    evidence: [{ claim: "Fixture inspected", source: "TASK.md:1" }],
    checkPlan: {
      steps: [
        {
          id: "true-check",
          argv: ["true"],
          cwd: ".",
          expectExit: 0,
          timeoutMs: 1_000,
        },
      ],
    },
    children: [],
    blockers: [],
  };
}

function geneExpression(lead: string, supports: string[]): GeneExpression {
  return {
    lead,
    supports,
    principalContradiction: "Choose the decision that changes downstream work",
    contributions: [lead, ...supports].map((pid) => ({ pid, decision: `${pid} changes one decision` })),
  };
}

function usage(inputTokens: number, outputTokens: number): CellUsage {
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    cachedInputTokens: 0,
  };
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "work-cell-test-"));
  temporaryRoots.push(root);
  await mkdir(join(root, "principles", "interpretations"), { recursive: true });
  await mkdir(join(root, "output"), { recursive: true });
  await writeFile(
    join(root, "principles", "SEQUENCE.md"),
    [
      "# Principle Sequence",
      "P03｜实践—认识—再实践｜实践论",
      "P04｜主要矛盾｜矛盾论",
      "P13｜主张不等于事实；事实须经可追溯的验证提交｜实践论 / 控制论",
      "P15｜只选择化解当前矛盾且保留硬约束的最小有效跃迁｜控制论 / 动态规划",
    ].join("\n"),
  );
  for (const pid of ["P03", "P04", "P13", "P15"]) {
    await writeFile(join(root, "principles", "interpretations", `${pid}.md`), `# ${pid}\n\n${pid} interpretation`);
  }
  await writeFile(join(root, "TASK.md"), "# Task\n");
  return root;
}
