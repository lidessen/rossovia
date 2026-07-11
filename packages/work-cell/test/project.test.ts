import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CellRunRecord } from "../src/contracts";
import {
  discoverSequenceProject,
  latestProjectRun,
  lowerProjectProbe,
  persistProjectRun,
} from "../src/project";
import { renderRunSummary } from "../src/presentation";
import { Workspace } from "../src/workspace";
import { submissionToolSchema } from "../src/ai-sdk-driver";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("Project interaction", () => {
  test("discovers a Sequence project and lowers a concise read-only probe", async () => {
    const root = await projectFixture();
    const nested = join(root, "packages", "feature");
    await mkdir(nested, { recursive: true });

    const project = await discoverSequenceProject(nested);
    const input = await lowerProjectProbe({
      startDir: nested,
      intent: "Inspect the project interaction",
      acceptance: ["Return traceable evidence"],
      scopes: ["packages/feature"],
    });

    expect(project.root).toBe(root);
    expect(input.workspace.root).toBe(root);
    expect(input.workspace.writePaths).toEqual([]);
    expect(input.workspace.allowedCommands).toEqual([]);
    expect(input.workspace.excludePaths).toEqual([".git", ".work-cell", "node_modules"]);
    expect(input.workspace.readPaths).toEqual([
      "packages/feature",
      "principles/SEQUENCE.md",
      "principles/interpretations",
    ]);
    expect(input.genome).toEqual({
      sequencePath: "principles/SEQUENCE.md",
      interpretationsDir: "principles/interpretations",
    });
  });

  test("persists records below the project and finds the latest one", async () => {
    const root = await projectFixture();
    const record = recordFixture(root);
    const output = await persistProjectRun(record, root);

    expect(output).toContain(`${root}/.work-cell/runs/`);
    expect(await latestProjectRun(root)).toBe(output);
  });
});

describe("Workspace exclusions and summaries", () => {
  test("makes check steps structurally unavailable without command authority", () => {
    const base = {
      outcome: "completed",
      artifactSummary: "Finished",
      artifactFiles: [],
      evidence: [],
      children: [],
      blockers: [],
    };

    expect(() => submissionToolSchema(false).parse({
      ...base,
      checkSteps: [{ id: "unauthorized", argv: ["true"] }],
    })).toThrow("checkSteps must be empty");
    expect(submissionToolSchema(false).parse({ ...base, checkSteps: [] }).checkSteps).toEqual([]);
    expect(submissionToolSchema(true).parse({
      ...base,
      checkSteps: [{ id: "allowed-shape", argv: ["true"] }],
    }).checkSteps).toHaveLength(1);
  });

  test("excludes generated paths from listing, direct reads, and read-only snapshots", async () => {
    const root = await projectFixture();
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(join(root, "node_modules", "pkg"), { recursive: true });
    await mkdir(join(root, ".work-cell", "runs"), { recursive: true });
    await writeFile(join(root, "src", "visible.ts"), "export {};\n");
    await writeFile(join(root, "node_modules", "pkg", "hidden.js"), "hidden\n");
    await writeFile(join(root, ".work-cell", "runs", "hidden.json"), "{}\n");
    const workspace = await Workspace.create(
      {
        root,
        readPaths: ["."],
        writePaths: [],
        excludePaths: ["node_modules", ".work-cell"],
        allowedCommands: [],
      },
      { maxSteps: 4, maxTokens: 1_000, maxDurationMs: 1_000, maxCommandOutputBytes: 1_000 },
    );

    const files = await workspace.listFiles(".");
    expect(files).toContain("src/visible.ts");
    expect(files).not.toContain("node_modules/pkg/hidden.js");
    expect(files).not.toContain(".work-cell/runs/hidden.json");
    await expect(workspace.readText("node_modules/pkg/hidden.js")).rejects.toThrow("excluded");
    expect((await workspace.snapshot()).size).toBe(0);

    const commandWorkspace = await Workspace.create(
      {
        root,
        readPaths: ["."],
        writePaths: [],
        excludePaths: ["node_modules", ".work-cell"],
        allowedCommands: ["true"],
      },
      { maxSteps: 4, maxTokens: 1_000, maxDurationMs: 1_000, maxCommandOutputBytes: 1_000 },
    );
    expect((await commandWorkspace.snapshot()).has("src/visible.ts")).toBe(true);
  });

  test("renders a provisional terminal submission and a budget diagnosis", async () => {
    const summary = renderRunSummary(recordFixture("/project", "budget_exceeded"));

    expect(summary).toContain("Expression: P16 + P15");
    expect(summary).toContain("Rationale: The form prevents action");
    expect(summary).toContain("Decision P15: Keep the change small");
    expect(summary).toContain("Provisional submission: Found the interaction gap");
    expect(summary).toContain("Budget: observed 251,000 of 250,000 tokens after 1 reads");
  });
});

async function projectFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "work-cell-project-"));
  temporaryRoots.push(root);
  await mkdir(join(root, "principles", "interpretations"), { recursive: true });
  await writeFile(join(root, "principles", "SEQUENCE.md"), "P15｜Minimum valid transition｜source\nP16｜Form enables action｜source\n");
  await writeFile(join(root, "principles", "interpretations", "P15.md"), "# P15\n");
  await writeFile(join(root, "principles", "interpretations", "P16.md"), "# P16\n");
  return root;
}

function recordFixture(root: string, status: CellRunRecord["status"] = "passed"): CellRunRecord {
  return {
    version: "work-cell.run.v1",
    runId: "run-1",
    cellId: "probe-interaction",
    depth: 0,
    driver: { adapter: "test", provider: "test", model: "test" },
    startedAt: "2026-07-10T10:00:00.000Z",
    finishedAt: "2026-07-10T10:01:00.000Z",
    durationMs: 60_000,
    status,
    input: {
      id: "probe-interaction",
      intent: "Inspect interaction",
      workspace: {
        root,
        readPaths: ["."],
        writePaths: [],
        excludePaths: [],
        allowedCommands: [],
      },
      genome: { sequencePath: "principles/SEQUENCE.md", interpretationsDir: "principles/interpretations" },
      dna: { baseInstructions: "Read only", capabilities: ["read repository files", "analyze project evidence"] },
      capabilitiesRequired: ["read repository files", "analyze project evidence"],
      acceptance: ["Return evidence"],
      budget: { maxSteps: 16, maxTokens: 250_000, maxDurationMs: 300_000, maxCommandOutputBytes: 64_000 },
      lineage: { depth: 0 },
    },
    geneExpression: {
      lead: "P16",
      supports: ["P15"],
      principalContradiction: "The form prevents action",
      contributions: [
        { pid: "P16", decision: "Make the interaction actionable" },
        { pid: "P15", decision: "Keep the change small" },
      ],
    },
    loadedInterpretations: ["principles/interpretations/P16.md", "principles/interpretations/P15.md"],
    verification: { passed: false, results: [] },
    workspaceDiff: { added: [], changed: [], removed: [] },
    usage: { inputTokens: 250_000, outputTokens: 1_000, totalTokens: 251_000, cachedInputTokens: 200_000 },
    executionObservation: {},
    trace: [
      { at: "2026-07-10T10:00:20.000Z", type: "tool.read_file", data: { characters: 120 } },
      {
        at: "2026-07-10T10:00:50.000Z",
        type: "cell.submitted",
        data: {
          outcome: "completed",
          artifact: { summary: "Found the interaction gap", files: [] },
          evidence: [{ claim: "CLI is contract-first", source: "src/cli.ts:1" }],
          checkPlan: { steps: [] },
          children: [],
          blockers: [],
        },
      },
    ],
    rawSteps: [],
    ...(status === "budget_exceeded" ? { error: "token budget exceeded" } : {}),
  };
}
