import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CellRunRecord } from "../src/contracts";
import {
  discoverSequenceProject,
  latestProjectRun,
  lowerProjectProbe,
  persistProjectRun,
} from "../src/adapters/sequence/project";
import { renderRunSummary } from "../src/adapters/sequence/presentation";
import { Workspace } from "../src/workspace";
import { prepareProjectDeliberation } from "../src/adapters/deliberation/project";

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
    expect(input.terminalTools).toEqual([expect.objectContaining({ name: "finish_probe" })]);
  });

  test("persists records below the project and finds the latest one", async () => {
    const root = await projectFixture();
    const record = recordFixture(root);
    const output = await persistProjectRun(record, root);

    expect(output).toContain(`${root}/.work-cell/runs/`);
    expect(await latestProjectRun(root)).toBe(output);
  });

  test("lowers a concise docket into compact packet workspaces instead of broad project scopes", async () => {
    const root = await projectFixture();
    await mkdir(join(root, "design"), { recursive: true });
    await writeFile(join(root, "design", "source.md"), `${"evidence ".repeat(2_000)}TAIL-MUST-NOT-REACH-CELL\n`);

    const prepared = await prepareProjectDeliberation({
      startDir: root,
      id: "priority",
      question: "Which bounded option should proceed?",
      options: [{ id: "A", summary: "Proceed" }, { id: "B", summary: "Hold" }],
      sources: ["design/source.md"],
      seats: [
        { pid: "P04", role: "contradiction" },
        { pid: "P11", role: "authority" },
        { pid: "P15", role: "preservation" },
      ],
      budget: {
        envelope: { id: "priority-allocation", version: "budget-envelope.v1", maxTotalTokens: 30_000, onExhaustion: "partial" },
        source: "test human approval",
        memberEstimatedTokens: 10_000,
      },
      maxSourceChars: 500,
      maxPacketChars: 1_000,
    });

    expect(prepared.directory).toContain(`${root}/.work-cell/deliberations/`);
    expect(prepared.manifest.members).toHaveLength(3);
    expect(prepared.manifest.members.every((member) => member.input.workspace.readPaths.join(",") === "docket,principles")).toBe(true);
    expect(prepared.manifest.members.every((member) => member.input.workspace.root !== root)).toBe(true);
    expect(prepared.manifest.members.map((member) => member.input.budget.estimatedTokens)).toEqual([10_000, 10_000, 10_000]);
    const evidence = await readFile(prepared.evidencePath, "utf8");
    expect(evidence).toContain("Excerpt: first 500");
    expect(evidence).toContain("Evidence boundary: this packet contains bounded excerpts");
    expect(evidence).not.toContain("TAIL-MUST-NOT-REACH-CELL");
    expect(prepared.manifest.members[0]!.input.dna.baseInstructions).toContain("may be incomplete");

    const second = await prepareProjectDeliberation({
      startDir: root,
      id: "priority",
      question: "Which bounded option should proceed?",
      options: [{ id: "A", summary: "Proceed" }, { id: "B", summary: "Hold" }],
      sources: ["design/source.md"],
      seats: [
        { pid: "P04", role: "contradiction" },
        { pid: "P11", role: "authority" },
        { pid: "P15", role: "preservation" },
      ],
      budget: {
        envelope: { id: "priority-allocation", version: "budget-envelope.v1", maxTotalTokens: 30_000, onExhaustion: "partial" },
        source: "test human approval",
        memberEstimatedTokens: 10_000,
      },
    });
    expect(second.directory).not.toBe(prepared.directory);
  });
});

describe("Workspace exclusions and summaries", () => {

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
      { maxSteps: 4, maxDurationMs: 1_000, maxCommandOutputBytes: 1_000 },
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
      { maxSteps: 4, maxDurationMs: 1_000, maxCommandOutputBytes: 1_000 },
    );
    expect((await commandWorkspace.snapshot()).has("src/visible.ts")).toBe(true);
  });

  test("renders a final output and a token-estimate audit", async () => {
    const summary = renderRunSummary(recordFixture("/project"));

    expect(summary).toContain("Expression: P16 + P15");
    expect(summary).toContain("Rationale: The form prevents action");
    expect(summary).toContain("Decision P15: Keep the change small");
    expect(summary).toContain("Output: {\"recommendation\":\"Inspect the interaction gap\"}");
    expect(summary).toContain("Token estimate: 250,000; actual 251,000; variance +1,000 (+0.4%)");
    expect(summary).toContain("Estimate review: required — outside declared ±0.2% tolerance");
  });
});

async function projectFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "work-cell-project-"));
  temporaryRoots.push(root);
  await mkdir(join(root, "principles", "interpretations"), { recursive: true });
  await writeFile(join(root, "principles", "SEQUENCE.md"), "P04｜Principal contradiction｜source\nP11｜Separate decision and execution｜source\nP15｜Minimum valid transition｜source\nP16｜Form enables action｜source\n");
  for (const pid of ["P04", "P11", "P15", "P16"]) {
    await writeFile(join(root, "principles", "interpretations", `${pid}.md`), `# ${pid}\n`);
  }
  return root;
}

function recordFixture(root: string, status: CellRunRecord["status"] = "passed"): CellRunRecord {
  return {
    version: "work-cell.run.v4",
    runId: "run-1",
    cellId: "probe-interaction",
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
      instructions: ["Read only"],
      capabilities: ["read repository files", "analyze project evidence"],
      context: [{
        id: "sequence-expression",
        title: "Selected Sequence interpretations",
        content: "P16 and P15",
        sources: ["principles/interpretations/P16.md", "principles/interpretations/P15.md"],
      }],
      capabilitiesRequired: ["read repository files", "analyze project evidence"],
      acceptance: ["Return evidence"],
      budget: {
        maxSteps: 16,
        estimatedTokens: 250_000,
        estimatedTokensTolerance: 0.002,
        maxDurationMs: 300_000,
        maxCommandOutputBytes: 64_000,
      },
    },
    preparation: {
      adapter: "sequence.v1",
      usage: { inputTokens: 5_000, outputTokens: 100, totalTokens: 5_100, cachedInputTokens: 0 },
      rawSteps: [],
      evidence: {
        sequencePath: "principles/SEQUENCE.md",
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
      },
    },
    finalText: "Found the interaction gap",
    output: { recommendation: "Inspect the interaction gap" },
    artifacts: [],
    verification: { passed: false, terminal: { passed: true, required: [], called: [] } },
    workspaceDiff: { added: [], changed: [], removed: [] },
    usage: { inputTokens: 250_000, outputTokens: 1_000, totalTokens: 251_000, cachedInputTokens: 200_000 },
    usageByPhase: {
      preparation: { inputTokens: 5_000, outputTokens: 100, totalTokens: 5_100, cachedInputTokens: 0 },
      execution: { inputTokens: 245_000, outputTokens: 900, totalTokens: 245_900, cachedInputTokens: 200_000 },
    },
    executionObservation: {},
    trace: [
      { at: "2026-07-10T10:00:20.000Z", type: "tool.read_file", data: { characters: 120 } },
    ],
    rawSteps: [],
  };
}
