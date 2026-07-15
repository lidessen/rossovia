import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CellInput, CellUsage } from "../src/contracts";
import {
  DELIBERATION_VERSION,
  persistDeliberationRecord,
  runDeliberation,
  type DeliberationManifest,
  type DeliberationPosition,
} from "../src/adapters/deliberation/runtime";
import type { CellDriver, DriverContext, DriverResult } from "../src/driver";
import type { GeneExpression, GeneSelectionResult, Genome, SequenceCellInput } from "../src/adapters/sequence/genome";
import type { SequenceSelector } from "../src/adapters/sequence/runtime";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("runs independent deliberation members and preserves a dissenting position", async () => {
  const root = await fixture();
  const manifest = docket(root);
  const stances: DeliberationPosition[] = [
    position("support", "Retains separate direction and execution seats"),
    position("support", "Makes the handoff reconstructible"),
    position("oppose", "The present evidence does not justify another standing seat"),
  ];
  let created = 0;

  const record = await runDeliberation(manifest, () => new DeliberationDriver(stances[created++]!));

  expect(record.members).toHaveLength(3);
  const runs = record.members.filter((member) => member.status === "run");
  expect(runs).toHaveLength(3);
  expect(runs.map((member) => member.record.input.instructions.join("\n"))).toEqual([
    expect.stringContaining("member contradiction"),
    expect.stringContaining("member evidence"),
    expect.stringContaining("member preservation"),
  ]);
  expect(record.summary).toMatchObject({
    kind: "projection",
    authority: "none",
    voteCounts: { support: 2, oppose: 1, reserve: 0, discover: 0 },
    budget: { maxAllocatedTokens: 30_000, declaredEstimatedTokens: 30_000, observedTokens: 90 },
  });
  expect(record.summary.dissent).toEqual([
    expect.objectContaining({ memberId: "preservation", stance: "oppose" }),
  ]);
  expect(record.summary.unsettledMembers).toEqual([]);
});

test("rejects a docket that silently omits a Sequence P-ID", async () => {
  const root = await fixture();
  const manifest = docket(root);
  manifest.sequenceCoverage.pop();

  await expect(runDeliberation(manifest, () => new DeliberationDriver(position("support", "Unused")))).rejects.toThrow(
    "sequence coverage must account for every P-ID",
  );
});

test("rejects a deliberation member that has write or command authority", async () => {
  const root = await fixture();
  const manifest = docket(root);
  manifest.members[0]!.input.workspace.writePaths = ["output"];

  await expect(runDeliberation(manifest, () => new DeliberationDriver(position("support", "Unused")))).rejects.toThrow(
    "must be read-only and command-free",
  );
});

  test("rejects a docket whose member estimates exceed its declared allocation envelope", async () => {
  const root = await fixture();
  const manifest = docket(root);
  manifest.budget.envelope.maxTotalTokens = 29_999;

  await expect(runDeliberation(manifest, () => new DeliberationDriver(position("support", "Unused")))).rejects.toThrow(
    "estimates exceed the deliberation allocation envelope",
  );
});

test("retains both repeated direct-manifest invocations instead of overwriting the earlier record", async () => {
  const root = await fixture();
  const manifest = docket(root);
  const first = await runDeliberation(manifest, () => new DeliberationDriver(position("support", "First retained run")));
  const second = await runDeliberation(manifest, () => new DeliberationDriver(position("support", "Second retained run")));
  const manifestPath = join(root, "docket.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
  const firstPath = await persistDeliberationRecord(manifestPath, first);
  const secondPath = await persistDeliberationRecord(manifestPath, second);

  expect(firstPath).not.toBe(secondPath);
  expect(JSON.parse(await readFile(firstPath, "utf8")).runId).toBe(first.runId);
  expect(JSON.parse(await readFile(secondPath, "utf8")).runId).toBe(second.runId);
});

test("stops later members when observed usage leaves no complete allocation", async () => {
  const root = await fixture();
  const manifest = docket(root);
  for (const member of manifest.members) member.input.budget.estimatedTokens = 20;
  manifest.budget.envelope.maxTotalTokens = 60;
  let created = 0;

  const record = await runDeliberation(manifest, () => new DeliberationDriver(position("support", `Run ${++created}`)));

  expect(created).toBe(2);
  expect(record.members[2]).toMatchObject({
    memberId: "preservation",
    status: "not_run_budget_envelope",
    declaredEstimatedTokens: 20,
    remainingAllocationTokens: 0,
  });
  expect(record.summary).toMatchObject({
    unsettledMembers: ["preservation"],
    budget: { startedEstimatedTokens: 40, observedTokens: 60, remainingAllocationTokens: 0, allocationOverrunTokens: 0 },
  });
});

test("uses the shared remaining envelope to recover only an unsettled seat", async () => {
  const root = await fixture();
  const manifest = docket(root);
  manifest.budget.envelope.maxTotalTokens = 256_000;
  manifest.budget.recovery = { maxAttemptsPerMember: 2 };
  for (const member of manifest.members) member.input.budget.estimatedTokens = 48_000;
  let created = 0;

  const record = await runDeliberation(manifest, () => new RecoveryDriver(created++ === 0));

  expect(record.members.filter((member) => member.memberId === "contradiction")).toHaveLength(2);
  expect(record.members.filter((member) => member.memberId === "evidence")).toHaveLength(1);
  expect(record.summary).toMatchObject({ voteCounts: { support: 3 }, unsettledMembers: [] });
});

class DeliberationDriver implements CellDriver, SequenceSelector {
  readonly descriptor = { adapter: "scripted-test", provider: "deterministic", model: "fixture" };

  constructor(private readonly position: DeliberationPosition) {}

  async selectSequenceGenes(input: SequenceCellInput, _genome: Genome, _context: DriverContext): Promise<GeneSelectionResult> {
    expect(input.dna.baseInstructions).toContain("Independent deliberation member");
    return { expression, usage: usage(), rawSteps: [] };
  }

  async run(input: CellInput, _context: DriverContext): Promise<DriverResult> {
    expect(input.intent).toContain("formal operating organization");
    return {
      finalText: "position submitted",
      output: this.position,
      terminalToolsCalled: [],
      usage: usage(),
      rawSteps: [],
    };
  }
}

class RecoveryDriver extends DeliberationDriver {
  constructor(private readonly failExpression: boolean) {
    super(position("support", "Recovered position"));
  }

  override async selectSequenceGenes(input: SequenceCellInput, genome: Genome, context: DriverContext): Promise<GeneSelectionResult> {
    if (this.failExpression) throw new Error("transient provider failure");
    return super.selectSequenceGenes(input, genome, context);
  }
}

const expression: GeneExpression = {
  lead: "P04",
  supports: ["P11"],
  principalContradiction: "Separate project direction from operating execution",
  contributions: [
    { pid: "P04", decision: "Identify the principal organization contradiction" },
    { pid: "P11", decision: "Keep decision and execution authority separate" },
  ],
};

function position(stance: DeliberationPosition["stance"], delta: string): DeliberationPosition {
  return {
    stance,
    decisionDelta: delta,
    strongestCounterargument: "A heavier formation may exceed the decision's risk.",
    unchangedAlternative: "Keep the current operating protocol without a new standing body.",
  };
}

function docket(root: string): DeliberationManifest {
  return {
    version: DELIBERATION_VERSION,
    id: "formal-operations-proposal",
    question: "Should the project establish a formal operating organization?",
    sources: ["design/decisions/015-human-initiated-formal-operations.md"],
    options: [
      { id: "A", summary: "Adopt a bounded operating organization" },
      { id: "B", summary: "Retain the current temporary formation" },
    ],
    budget: {
      envelope: { id: "formal-operations-allocation", version: "budget-envelope.v1", maxTotalTokens: 30_000, onExhaustion: "partial" },
      source: "test Principal Decision Brief",
    },
    sequenceCoverage: [
      { pid: "P04", status: "seat", rationale: "Names the principal contradiction" },
      { pid: "P11", status: "seat", rationale: "Tests authority separation" },
      { pid: "P13", status: "guardrail", rationale: "Requires evidence before acceptance" },
      { pid: "P15", status: "seat", rationale: "Preserves the smallest valid transition" },
    ],
    members: [
      { id: "contradiction", role: "principal-contradiction seat", input: input(root, "contradiction-cell") },
      { id: "evidence", role: "evidence seat", input: input(root, "evidence-cell") },
      { id: "preservation", role: "unchanged alternative seat", input: input(root, "preservation-cell") },
    ],
  };
}

function input(root: string, id: string): SequenceCellInput {
  return {
    id,
    intent: "Independently assess the formal operating organization proposal",
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [], allowedCommands: [] },
    genome: { sequencePath: "principles/SEQUENCE.md", interpretationsDir: "principles/interpretations" },
    dna: { baseInstructions: "Ground the position in the fixture.", capabilities: ["read"] },
    capabilitiesRequired: ["read"],
    acceptance: ["Return an independent evidence-backed position"],
    budget: { maxSteps: 8, estimatedTokens: 10_000, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
  };
}

function usage(): CellUsage {
  return { inputTokens: 10, outputTokens: 5, totalTokens: 15, cachedInputTokens: 0 };
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "work-cell-deliberation-"));
  roots.push(root);
  await mkdir(join(root, "principles", "interpretations"), { recursive: true });
  await writeFile(
    join(root, "principles", "SEQUENCE.md"),
    ["# Principle Sequence", "P04｜主要矛盾｜矛盾论", "P11｜决策权与执行权分离｜组织设计", "P13｜主张不等于事实｜实践论", "P15｜最小有效跃迁｜控制论"].join("\n"),
  );
  for (const pid of ["P04", "P11", "P13", "P15"]) {
    await writeFile(join(root, "principles", "interpretations", `${pid}.md`), `# ${pid}\n`);
  }
  return root;
}
