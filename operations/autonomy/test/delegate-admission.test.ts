import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DelegateAdmissionError,
  admitPreparedDelegateBatch,
  runPreparedDelegateBatch,
  type CapabilityDisposition,
  type CapabilityEvidenceStatus,
  type PreparedDelegateBatch,
  type PreparedDelegateContribution,
} from "../src/delegate-admission";
import type { CellInput, CellUsage } from "../../../packages/work-cell/src/contracts";
import type { CellDriver, DriverContext, DriverResult } from "../../../packages/work-cell/src/driver";

const roots: string[] = [];

type DeepMutable<T> = T extends readonly (infer Item)[]
  ? DeepMutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: DeepMutable<T[Key]> }
    : T;

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("a complete admitted step lowers independent contributions to a Swarm and preserves unassigned obligations", async () => {
  const root = await fixture();
  const input = batch(root, [
    contribution(root, "contract", "inspect-contract", "reliable-primitive", "admitted"),
    contribution(root, "callers", "inspect-callers", "guarded", "provisional-observed"),
  ]);
  let drivers = 0;

  const result = await runPreparedDelegateBatch(input, () => {
    drivers += 1;
    return new PassingDriver();
  }, { concurrency: 8 });

  expect(result.kind).toBe("swarm");
  expect(drivers).toBe(2);
  expect(result.admission.unassignedObligations).toEqual(["document-boundary"]);
  if (result.kind === "swarm") {
    expect(result.record.concurrency).toBe(2);
    expect(result.record.outcomes.every((outcome) =>
      outcome.kind === "settled" && outcome.record.status === "passed"
    )).toBe(true);
  }
});

test("one inadmissible contribution rejects the whole step before any driver is created", async () => {
  const root = await fixture();
  const unsupported = contribution(
    root,
    "senior-reviewer",
    "inspect-callers",
    "unsupported-escalate",
    "discovery-needed",
  );
  unsupported.label = "senior reviewer";
  const input = batch(root, [
    contribution(root, "contract", "inspect-contract", "reliable-primitive", "admitted"),
    unsupported,
  ]);
  let drivers = 0;

  await expect(runPreparedDelegateBatch(input, () => {
    drivers += 1;
    return new PassingDriver();
  }, { concurrency: 2 })).rejects.toThrow(DelegateAdmissionError);

  expect(drivers).toBe(0);
  try {
    admitPreparedDelegateBatch(input);
  } catch (error) {
    expect((error as DelegateAdmissionError).issues).toEqual(expect.arrayContaining([
      expect.stringContaining("discovery-needed evidence"),
      expect.stringContaining("unsupported-escalate cannot lower"),
    ]));
  }
});

test("admission rejects nominally valid Cells when Task Shape coverage, guards, or relations are not executable", async () => {
  const root = await fixture();
  const cases: Array<{
    name: string;
    mutate: (input: DeepMutable<PreparedDelegateBatch>) => void;
    issue: string;
  }> = [
    {
      name: "reliable without admitted evidence",
      mutate: (input) => { input.contributions[0]!.taskShape.evidence.status = "provisional-observed"; },
      issue: "reliable-primitive requires admitted evidence",
    },
    {
      name: "guarded without a guard",
      mutate: (input) => {
        input.contributions[0]!.taskShape.disposition = "guarded";
        input.contributions[0]!.taskShape.guardRefs = [];
      },
      issue: "requires at least one independently owned guard",
    },
    {
      name: "unfinished transformation",
      mutate: (input) => { input.contributions[0]!.taskShape.disposition = "transform"; },
      issue: "must finish transformation",
    },
    {
      name: "same-step dependency",
      mutate: (input) => { input.contributions[1]!.dependsOn = ["contract"]; },
      issue: "same-step dependency contract",
    },
    {
      name: "duplicate obligation ownership",
      mutate: (input) => { input.contributions[1]!.obligationRefs = ["inspect-contract"]; },
      issue: "duplicates ownership by contract",
    },
    {
      name: "undeclared source",
      mutate: (input) => { input.contributions[1]!.sourceRefs = ["source:outside-envelope"]; },
      issue: "contains undeclared source",
    },
    {
      name: "workspace scope expansion",
      mutate: (input) => { (input.contributions[1]!.cell as CellInput).workspace.readPaths = ["../outside"]; },
      issue: "read path is outside the frozen whole",
    },
  ];

  for (const scenario of cases) {
    const input = batch(root, [
      contribution(root, "contract", "inspect-contract", "reliable-primitive", "admitted"),
      contribution(root, "callers", "inspect-callers", "guarded", "provisional-observed"),
    ]);
    scenario.mutate(input);
    expect(() => admitPreparedDelegateBatch(input), scenario.name).toThrow(scenario.issue);
  }
});

test("one admitted contribution uses direct Cell execution rather than manufacturing a Swarm", async () => {
  const root = await fixture();
  const input = batch(root, [
    contribution(root, "contract", "inspect-contract", "reliable-primitive", "admitted"),
  ]);

  const result = await runPreparedDelegateBatch(input, () => new PassingDriver(), { concurrency: 4 });

  expect(result.kind).toBe("direct");
  if (result.kind === "direct") expect(result.record.status).toBe("passed");
  expect(result.admission.unassignedObligations).toEqual(["inspect-callers", "document-boundary"]);
});

test("an explicit isolated effect policy admits exactly one guarded writer inside the frozen whole", async () => {
  const root = await fixture();
  const input = batch(root, [
    contribution(root, "contract", "inspect-contract", "guarded", "provisional-observed"),
    contribution(root, "callers", "inspect-callers", "guarded", "provisional-observed"),
  ]);
  configureWritableTrial(input, root, "contract", "candidate/contract.md");

  const admitted = admitPreparedDelegateBatch(input);

  expect(admitted.whole.effectPolicy).toEqual({
    kind: "isolated-writable-trial",
    root,
  });
  expect(admitted.whole.workspace.allowedCommands).toEqual([]);
  expect(admitted.contributions.filter((item) => item.cell.workspace.writePaths.length > 0))
    .toHaveLength(1);
  expect(admitted.contributions[0]!.cell.workspace.writePaths).toEqual(["candidate/contract.md"]);
});

test("writable admission rejects missing policy, commands, widened scope, root drift, multiple writers, and unguarded work", async () => {
  const root = await fixture();
  const cases: Array<{
    name: string;
    mutate: (input: DeepMutable<PreparedDelegateBatch>) => void;
    issue: string;
  }> = [
    {
      name: "missing effect policy",
      mutate: (input) => { delete input.whole.effectPolicy; },
      issue: "requires an explicit isolated writable trial effect policy",
    },
    {
      name: "whole command authority",
      mutate: (input) => { input.whole.workspace.allowedCommands = ["git"]; },
      issue: "does not permit command execution",
    },
    {
      name: "cell command authority",
      mutate: (input) => {
        (input.contributions[0]!.cell as CellInput).workspace.allowedCommands = ["git"];
      },
      issue: "cell is not permitted to execute commands",
    },
    {
      name: "effect root drift",
      mutate: (input) => { input.whole.effectPolicy!.root = join(root, "other"); },
      issue: "whole workspace root does not match",
    },
    {
      name: "cell root drift",
      mutate: (input) => {
        (input.contributions[0]!.cell as CellInput).workspace.root = join(root, "other");
      },
      issue: "cell workspace root does not match the isolated writable trial effect root",
    },
    {
      name: "whole escapes effect root",
      mutate: (input) => { input.whole.workspace.writePaths = ["../outside"]; },
      issue: "outside the isolated writable trial root",
    },
    {
      name: "cell exceeds whole maximum",
      mutate: (input) => {
        (input.contributions[0]!.cell as CellInput).workspace.writePaths = ["outside/result.md"];
      },
      issue: "cell write path is outside the frozen whole",
    },
    {
      name: "two writable contributions",
      mutate: (input) => {
        configureWritableContribution(input, "callers", "candidate/callers.md");
      },
      issue: "requires exactly one writable contribution; received 2",
    },
    {
      name: "unguarded writable contribution",
      mutate: (input) => {
        input.contributions[0]!.taskShape.disposition = "reliable-primitive";
        input.contributions[0]!.taskShape.guardRefs = [];
      },
      issue: "writable cell requires a guarded Task Shape",
    },
  ];

  for (const scenario of cases) {
    const input = batch(root, [
      contribution(root, "contract", "inspect-contract", "guarded", "provisional-observed"),
      contribution(root, "callers", "inspect-callers", "guarded", "provisional-observed"),
    ]);
    configureWritableTrial(input, root, "contract", "candidate/contract.md");
    scenario.mutate(input);
    expect(() => admitPreparedDelegateBatch(input), scenario.name).toThrow(scenario.issue);
  }
});

test("admission does not accept task process evidence as the sole delegate proof", async () => {
  const root = await fixture();
  const taskOnly = batch(root, [
    contribution(root, "contract", "inspect-contract", "reliable-primitive", "admitted"),
  ]);
  const taskCell = taskOnly.contributions[0]!.cell as DeepMutable<CellInput>;
  delete taskCell.outputSchema;
  taskCell.tasks = [{ subject: "Inspect the bounded source", description: "Inspect only the bounded source." }];

  expect(() => admitPreparedDelegateBatch(taskOnly)).toThrow(
    "requires at least one flat work-proof condition",
  );

  taskCell.outputSchema = {
    type: "object",
    properties: { status: { type: "string" } },
    required: ["status"],
    additionalProperties: false,
  };
  expect(admitPreparedDelegateBatch(taskOnly).contributions[0]!.cell.tasks).toEqual([{
    subject: "Inspect the bounded source",
    description: "Inspect only the bounded source.",
  }]);
});

class PassingDriver implements CellDriver {
  readonly descriptor = { adapter: "autonomy-admission-test", provider: "deterministic", model: "fixture" };

  async run(_input: CellInput, _context: DriverContext): Promise<DriverResult> {
    return {
      finalText: "bounded contribution completed",
      output: { status: "completed", summary: "bounded contribution completed" },
      terminalToolsCalled: [],
      usage: usage(10),
      rawSteps: [],
    };
  }
}

function batch(
  root: string,
  contributions: DeepMutable<PreparedDelegateContribution>[],
): DeepMutable<PreparedDelegateBatch> {
  return {
    id: "formation-turn-1",
    whole: {
      revision: "whole-revision-1",
      sourceRefs: ["source:contract", "source:callers"],
      obligations: ["inspect-contract", "inspect-callers", "document-boundary"],
      settledContributionKeys: ["prior-settled"],
      guardRefs: ["guard:independent-claim-check"],
      capabilityNeeds: ["read"],
      reconstructionOwner: "mission:turn-1-reconstruction",
      workspace: {
        root,
        readPaths: ["."],
        writePaths: [],
        excludePaths: [".git"],
        allowedCommands: [],
      },
    },
    contributions,
  };
}

function contribution(
  root: string,
  key: string,
  obligation: string,
  disposition: CapabilityDisposition,
  evidenceStatus: CapabilityEvidenceStatus,
): DeepMutable<PreparedDelegateContribution> {
  return {
    key,
    taskId: `task-${key}`,
    task: `Complete bounded contribution ${key}`,
    sourceRefs: [obligation === "inspect-contract" ? "source:contract" : "source:callers"],
    obligationRefs: [obligation],
    acceptance: ["Return the locally supported result and any missing evidence"],
    capabilityNeed: "read",
    dependsOn: [],
    taskShape: {
      referenceProfile: { id: "flash-main", revision: "profile-revision-1" },
      evidence: {
        status: evidenceStatus,
        revision: "evidence-revision-1",
        refs: ["evidence:matched-probe"],
      },
      disposition,
      principalInstability: "bounded completeness risk",
      guardRefs: disposition === "guarded" ? ["guard:independent-claim-check"] : [],
      reconstructionOwner: "mission:turn-1-reconstruction",
      overloadDisposition: "repartition",
    },
    cell: cell(root, key),
  };
}

function configureWritableTrial(
  input: DeepMutable<PreparedDelegateBatch>,
  root: string,
  contributionKey: string,
  writePath: string,
): void {
  input.whole.effectPolicy = {
    kind: "isolated-writable-trial",
    root,
  };
  input.whole.workspace.writePaths = ["candidate"];
  if (!input.whole.capabilityNeeds.includes("write")) input.whole.capabilityNeeds.push("write");
  configureWritableContribution(input, contributionKey, writePath);
}

function configureWritableContribution(
  input: DeepMutable<PreparedDelegateBatch>,
  contributionKey: string,
  writePath: string,
): void {
  const selected = input.contributions.find((item) => item.key === contributionKey);
  if (selected === undefined) throw new Error(`missing contribution ${contributionKey}`);
  selected.capabilityNeed = "write";
  selected.taskShape.disposition = "guarded";
  selected.taskShape.guardRefs = ["guard:independent-claim-check"];
  const selectedCell = selected.cell as DeepMutable<CellInput>;
  selectedCell.workspace.writePaths = [writePath];
  selectedCell.capabilities = ["read", "write"];
  selectedCell.capabilitiesRequired = ["write"];
}

function cell(root: string, id: string): CellInput {
  return {
    id,
    intent: `Complete bounded contribution ${id}`,
    workspace: { root, readPaths: ["."], writePaths: [], excludePaths: [".git"], allowedCommands: [] },
    instructions: ["Use only the supplied bounded evidence."],
    capabilities: ["read"],
    context: [],
    capabilitiesRequired: ["read"],
    acceptance: ["Return the locally supported result and any missing evidence"],
    budget: { maxSteps: 4, maxDurationMs: 10_000, maxCommandOutputBytes: 4_000 },
    executionProfile: {
      id: "flash-main",
      version: "execution-profile.v1",
      provider: "deepseek",
      model: "deepseek-v4-flash",
      parallelism: "serial",
    },
    outputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["completed", "needs_repartition", "unverifiable"] },
        summary: { type: "string" },
      },
      required: ["status", "summary"],
      additionalProperties: false,
    },
  };
}

function usage(totalTokens: number): CellUsage {
  return {
    inputTokens: totalTokens,
    outputTokens: 0,
    totalTokens,
    cachedInputTokens: 0,
  };
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "autonomy-delegate-admission-"));
  roots.push(root);
  return root;
}
