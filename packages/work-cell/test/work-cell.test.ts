import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CellInputSchema, type CellInput, type CellUsage } from "../src/contracts";
import type {
  CellDriver,
  DriverContext,
  DriverResult,
} from "../src/driver";
import { CellExecutionError } from "../src/driver";
import type { GeneExpression, GeneSelectionResult, Genome, SequenceCellInput } from "../src/adapters/sequence/genome";
import { runCell } from "../src/run-cell";
import { runSequenceCell, sequencePreparation, type SequenceSelector } from "../src/adapters/sequence/runtime";
import { Workspace } from "../src/workspace";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("Sequence adapter", () => {
  test("expresses a task-specific P-ID team and loads only selected interpretations", async () => {
    const root = await fixture();
    const expression = geneExpression("P04", ["P15"]);
    const driver = new ScriptedDriver(expression);

    const record = await runSequenceCell(sequenceInput(root), driver);
    const preparation = sequencePreparation(record);

    expect(record.status).toBe("passed");
    expect(preparation?.geneExpression).toEqual(expression);
    expect(preparation?.loadedInterpretations.map((path) => path.split("/").at(-1))).toEqual([
      "P04.md",
      "P15.md",
    ]);
    expect(preparation?.loadedInterpretations).not.toContain(expect.stringContaining("P03.md"));
    expect(record.verification.passed).toBe(true);
    expect(record.preparation?.adapter).toBe("sequence.v1");
  });

  test("rejects an expression that selects a P-ID outside the Sequence", async () => {
    const root = await fixture();
    const driver = new ScriptedDriver(geneExpression("P99", []));

    const record = await runSequenceCell(sequenceInput(root), driver);

    expect(record.status).toBe("failed");
    expect(record.error).toContain("unknown P-ID: P99");
    expect(sequencePreparation(record)).toBeUndefined();
  });
});

describe("Work Cell core", () => {
  test("rejects Sequence and experiment vocabulary at the generic input boundary", async () => {
    const root = await fixture();
    const base = input(root);

    expect(() => CellInputSchema.parse({
      ...base,
      genome: { sequencePath: "principles/SEQUENCE.md", interpretationsDir: "principles/interpretations" },
    })).toThrow("genome");
    expect(() => CellInputSchema.parse({
      ...base,
      treatment: { id: "candidate", instructions: "Change the decision" },
    })).toThrow("treatment");
  });

  test("rejects duplicate terminal tool names at the generic input boundary", async () => {
    const root = await fixture();
    const base = input(root);
    const terminal = {
      name: "finish_report",
      description: "Signal completion.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    };

    expect(() => CellInputSchema.parse({
      ...base,
      terminalTools: [terminal, terminal],
    })).toThrow("duplicate terminal tool name: finish_report");
  });

  test("settles an independent output and artifact after a caller-defined terminal tool", async () => {
    const root = await fixture();
    const base = input(root);
    base.outputSchema = {
      type: "object",
      properties: { status: { type: "string" } },
      required: ["status"],
      additionalProperties: false,
    };
    base.artifacts = [{ path: "output/report.md", instructions: "Write the bounded report." }];
    base.terminalTools = [{
      name: "finish_report",
      description: "Signal that the report and structured output are complete.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    }];

    const record = await runCell(base, new ContractDriver(true));

    expect(record.status).toBe("passed");
    expect(record.output).toEqual({ status: "ready" });
    expect(record.artifacts).toEqual([expect.objectContaining({ path: "output/report.md", bytes: expect.any(Number) })]);
    expect(record.verification).toMatchObject({ output: { passed: true }, artifacts: { passed: true } });
  });

  test("does not accept an unchanged declared artifact", async () => {
    const root = await fixture();
    const base = input(root);
    base.artifacts = [{ path: "output/report.md", instructions: "Write the bounded report." }];

    const record = await runCell(base, new ContractDriver(false));

    expect(record.status).toBe("verification_failed");
    expect(record.verification.artifacts).toMatchObject({ passed: false });
  });

  test("records output and artifact verification even when its terminal condition is unmet", async () => {
    const root = await fixture();
    const base = input(root);
    base.outputSchema = {
      type: "object",
      properties: { status: { type: "string" } },
      required: ["status"],
      additionalProperties: false,
    };
    base.artifacts = [{ path: "output/report.md", instructions: "Write the bounded report." }];
    base.terminalTools = [{
      name: "finish_report",
      description: "Signal that the report and structured output are complete.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    }];

    const record = await runCell(base, new ContractDriver(true, false));

    expect(record.status).toBe("protocol_error");
    expect(record.output).toEqual({ status: "ready" });
    expect(record.artifacts).toHaveLength(1);
    expect(record.verification).toMatchObject({ output: { passed: true }, artifacts: { passed: true } });
  });

  test("rejects multiple terminal calls returned by a generic driver", async () => {
    const root = await fixture();
    const base = input(root);
    base.terminalTools = [
      {
        name: "approve",
        description: "Approve the result.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
      {
        name: "reject",
        description: "Reject the result.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
    ];

    const record = await runCell(base, new ContractDriver(false));

    expect(record.status).toBe("protocol_error");
    expect(record.error).toContain("expected exactly one declared terminal tool call; received 2");
    expect(record.verification.terminal).toEqual({
      passed: false,
      required: ["approve", "reject"],
      called: ["approve", "reject"],
    });
    expect(record.trace.some((event) => event.type === "terminal.contract.violation")).toBe(true);
  });

  test("rejects a terminal contract that leaves no final-output step", async () => {
    const root = await fixture();
    const base = input(root);
    base.budget.maxSteps = 1;
    base.terminalTools = [{
      name: "finish_report",
      description: "Signal completion.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    }];

    await expect(runCell(base, new ScriptedDriver(geneExpression("P04", [])))).rejects.toThrow(
      "terminal tools require at least two steps",
    );
  });

  test("retains a token estimate for post-run audit without interrupting the cell", async () => {
    const root = await fixture();
    const base = input(root);
    base.budget.estimatedTokens = 50;
    const driver = new ScriptedDriver(geneExpression("P04", []), {
      selection: usage(30, 10),
      run: usage(40, 20),
    });

    const record = await runSequenceCell(sequenceInput(root, base), driver);

    expect(record.status).toBe("passed");
    expect(record.usage.totalTokens).toBe(100);
    expect(record.usageByPhase).toEqual({ preparation: usage(30, 10), execution: usage(40, 20) });
  });

  test("rejects the retired maxTokens field instead of silently dropping it", async () => {
    const root = await fixture();
    const base = input(root);

    expect(() => CellInputSchema.parse({
      ...base,
      budget: { ...base.budget, maxTokens: 10_000 },
    })).toThrow("maxTokens");
  });

  test("retains observed usage when a driver fails after starting execution", async () => {
    const root = await fixture();
    const driver = new ScriptedDriver(geneExpression("P04", []));
    driver.runError = new CellExecutionError("provider ended without a final output", usage(100, 40));

    const record = await runSequenceCell(sequenceInput(root), driver);

    expect(record.status).toBe("failed");
    expect(record.error).toContain("provider ended without a final output");
    expect(record.usage).toEqual({ inputTokens: 120, outputTokens: 50, totalTokens: 170, cachedInputTokens: 0 });
  });

  test("cancels a cell when its duration budget expires", async () => {
    const root = await fixture();
    const base = input(root);
    base.budget.maxDurationMs = 20;
    const driver = new ScriptedDriver(geneExpression("P04", []));
    driver.runDelayMs = 200;

    const record = await runCell(base, driver);

    expect(record.status).toBe("cancelled");
    expect(record.durationMs).toBeLessThan(200);
  });

  test("settles cancellation even when a driver ignores the abort signal", async () => {
    const root = await fixture();
    const uncooperative: CellDriver = {
      descriptor: { adapter: "uncooperative-test", provider: "deterministic", model: "fixture" },
      async run() {
        return new Promise<DriverResult>(() => {});
      },
    };
    const base = input(root);
    base.budget.maxDurationMs = 20;

    const record = await runCell(base, uncooperative);

    expect(record.status).toBe("cancelled");
    expect(record.durationMs).toBeLessThan(200);
    expect(record.error?.toLowerCase()).toContain("timed out");
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

    const record = await runCell(base, new ScriptedDriver(geneExpression("P04", [])));

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

  test("rejects path-qualified argv[0] even when its basename is allow-listed", async () => {
    const root = await fixture();
    const parsed = input(root);
    // allowedCommands contains "true" — the basename of "./true"
    const workspace = await Workspace.create(parsed.workspace, parsed.budget);

    // POSIX-style path separator
    await expect(workspace.runCommand(["./true"])).rejects.toThrow(
      "command argv[0] must not contain a path separator",
    );
    // Windows-style path separator
    await expect(workspace.runCommand([".\\true"])).rejects.toThrow(
      "command argv[0] must not contain a path separator",
    );
    // Multi-component path
    await expect(workspace.runCommand(["subdir/true"])).rejects.toThrow(
      "command argv[0] must not contain a path separator",
    );
    // Plain basename still works
    await expect(workspace.runCommand(["true"])).resolves.toMatchObject({ exitCode: 0 });
  });
});

class ScriptedDriver implements CellDriver, SequenceSelector {
  readonly descriptor = {
    adapter: "scripted-test",
    provider: "deterministic",
    model: "fixture",
  };
  selectionError?: Error;
  runError?: Error;
  runDelayMs = 0;

  constructor(
    private readonly expression: GeneExpression,
    private readonly usages: { selection: CellUsage; run: CellUsage } = {
      selection: usage(20, 10),
      run: usage(30, 15),
    },
  ) {}

  async selectSequenceGenes(
    _input: SequenceCellInput,
    _genome: Genome,
    _context: DriverContext,
  ): Promise<GeneSelectionResult> {
    if (this.selectionError) throw this.selectionError;
    return {
      expression: this.expression,
      usage: this.usages.selection,
      rawSteps: [{ selected: this.expression }],
    };
  }

  async run(
    _input: CellInput,
    context: DriverContext,
  ): Promise<DriverResult> {
    if (this.runDelayMs > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, this.runDelayMs);
        context.signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );
      });
    }
    if (this.runError) throw this.runError;
    return {
      terminalToolsCalled: [],
      finalText: "completed",
      usage: this.usages.run,
      rawSteps: [],
    };
  }
}

class ContractDriver implements CellDriver {
  readonly descriptor = { adapter: "scripted-contract", provider: "deterministic", model: "fixture" };

  constructor(
    private readonly writeArtifact: boolean,
    private readonly signalTerminal = true,
  ) {}

  async run(input: CellInput, context: DriverContext): Promise<DriverResult> {
    if (this.writeArtifact) await context.workspace.writeText("output/report.md", "# Report\n");
    return {
      terminalToolsCalled: this.signalTerminal ? input.terminalTools?.map((terminal) => terminal.name) ?? [] : [],
      finalText: "completed through caller-defined terminal tool",
      output: input.outputSchema ? { status: "ready" } : undefined,
      usage: usage(1, 1),
      rawSteps: [],
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
    instructions: ["Ground decisions in the fixture."],
    capabilities: ["read", "write"],
    context: [],
    capabilitiesRequired: ["read"],
    acceptance: ["Return an evidence-backed result"],
    budget: {
      maxSteps: 8,
      estimatedTokens: 10_000,
      maxDurationMs: 10_000,
      maxCommandOutputBytes: 4_000,
    },
  };
}

function sequenceInput(root: string, base = input(root)): SequenceCellInput {
  const { instructions: _instructions, capabilities: _capabilities, context: _context, ...common } = base;
  return {
    ...common,
    genome: {
      sequencePath: "principles/SEQUENCE.md",
      interpretationsDir: "principles/interpretations",
    },
    dna: {
      baseInstructions: base.instructions.join("\n\n"),
      capabilities: base.capabilities,
    },
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
