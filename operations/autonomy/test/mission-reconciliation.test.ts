import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import type { CellInput, ExecutionProfile } from "../../../packages/work-cell/src/contracts";
import type { CellDriver, DriverContext, DriverResult } from "../../../packages/work-cell/src/driver";
import { digest } from "../src/canonical-json";
import { FileMissionTimeline } from "../src/delegate-timeline";
import {
  proposeMissionReconciliation,
  type ActiveIntentAnchor,
  type MissionReconciliationProposal,
  type ReconciliationDecision,
} from "../src/mission-reconciliation";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("reconciliation runs as one terminal-tool Work Cell with only the anchor and next input", async () => {
  const root = await fixture();
  const timeline = new FileMissionTimeline(join(root, ".mission"));
  const input = await timeline.appendInput("mission-1", contribution("input-1", "Do not change the public contract."));
  const driver = new ReconciliationDriver(correction());

  const result = await proposeMissionReconciliation({
    id: "reconciliation-1",
    missionId: "mission-1",
    anchor: anchor(0),
    input,
    workspaceRoot: root,
    executionProfile: profile(),
  }, { driver });

  expect(result.kind).toBe("proposed");
  if (result.kind !== "proposed") throw new Error("expected reconciliation proposal");
  expect(result.record.status).toBe("passed");
  expect(result.proposal.decision).toEqual(correction());
  expect(result.proposal.executionRef).toEqual({ cellId: result.record.cellId, runId: result.record.runId });
  expect(driver.input?.terminalTools?.map((tool) => tool.name)).toEqual([
    "submit_continue",
    "submit_correction",
    "request_decision",
  ]);
  const terminalSchema = driver.input?.terminalTools?.find((tool) => tool.name === "submit_correction")?.inputSchema;
  expect(terminalSchema).toBeDefined();
  const { disposition: _disposition, ...correctionInput } = correction();
  expect(z.fromJSONSchema(terminalSchema!).parse(correctionInput)).toEqual(correctionInput);
  expect(terminalSchema?.oneOf).toBeUndefined();
  expect(terminalSchema?.required).toEqual([
    "rejectedAssumption",
    "newInvariant",
    "affectedSurfaces",
    "nextProbe",
  ]);
  expect(driver.input?.workspace).toMatchObject({ readPaths: [], writePaths: [], allowedCommands: [] });
  expect(driver.input?.context.map((section) => section.id)).toEqual(["active-anchor", "mission-input"]);
  const delivered = JSON.stringify(driver.input?.context);
  expect(delivered).toContain("Do not change the public contract.");
  expect(delivered).not.toContain("delegate.child-settled");
  expect(delivered).not.toContain("Mission history");
});

test("only an independently accepted next anchor commits and advances reconciliation lineage", async () => {
  const root = await fixture();
  const timeline = new FileMissionTimeline(join(root, ".mission"));
  await seed(timeline, "mission-1", anchor(0));
  const input = await timeline.appendInput("mission-1", contribution("input-1", "Do not change the public contract."));
  const result = await proposeMissionReconciliation({
    id: "reconciliation-1",
    missionId: "mission-1",
    anchor: anchor(0),
    input,
    workspaceRoot: root,
    executionProfile: profile(),
  }, { driver: new ReconciliationDriver(correction()) });
  if (result.kind !== "proposed") throw new Error("expected reconciliation proposal");
  const acceptance = acceptanceFor(
    result.proposal,
    anchor(1, "Keep the public contract unchanged unless the Principal explicitly reauthorizes it.", "r2"),
  );

  await expect(timeline.commitReconciliation({
    proposal: result.proposal,
    acceptance: {
      ...acceptance,
      verification: {
        ...acceptance.verification,
        proposalRef: { ...acceptance.verification.proposalRef, digest: "0".repeat(64) },
      },
    },
  })).rejects.toThrow("not linked to its verified proposal");

  await timeline.commitReconciliation({ proposal: result.proposal, acceptance });
  await timeline.commitReconciliation({ proposal: result.proposal, acceptance });
  expect(await timeline.latestReconciledAnchor("mission-1")).toEqual(acceptance.nextAnchor);
  const parent = await readFile(timeline.timelinePath("mission-1"), "utf8");
  expect(parent.match(/mission\.input-reconciled/g)).toHaveLength(1);

  await expect(timeline.commitReconciliation({
    proposal: result.proposal,
    acceptance: { ...acceptance, authorityRef: "principal:conflicting" },
  })).rejects.toThrow("conflicts with its committed event");
});

test("continue reconciliation advances lineage without rewriting the active intent statement", async () => {
  const root = await fixture();
  const timeline = new FileMissionTimeline(join(root, ".mission"));
  const initial = anchor(0);
  await seed(timeline, "mission-1", initial);
  const input = await timeline.appendInput("mission-1", contribution("input-1", "Continue unchanged."));
  const result = await proposeMissionReconciliation({
    id: "reconciliation-continue",
    missionId: "mission-1",
    anchor: initial,
    input,
    workspaceRoot: root,
    executionProfile: profile(),
  }, { driver: new ReconciliationDriver({
    disposition: "continue",
    inputEffect: "The active constraints are unchanged.",
    responseObligations: [],
  }) });
  if (result.kind !== "proposed") throw new Error("expected reconciliation proposal");

  const drifted = {
    ...initial,
    revision: "r2",
    statement: `${initial.statement} Watermark 1 is complete.`,
    sourceRefs: [...initial.sourceRefs, input.sourceRef],
    reconciledWatermark: 1,
  };
  await expect(timeline.commitReconciliation({
    proposal: result.proposal,
    acceptance: acceptanceFor(result.proposal, drifted),
  })).rejects.toThrow("cannot rewrite the active-anchor statement");

  const next = { ...drifted, statement: initial.statement };
  await timeline.commitReconciliation({
    proposal: result.proposal,
    acceptance: acceptanceFor(result.proposal, next),
  });
  expect(await timeline.latestReconciledAnchor("mission-1")).toEqual(next);
});

test("an authorized initial anchor is idempotent, conflict-detecting, and precedes Mission work", async () => {
  const root = await fixture();
  const timeline = new FileMissionTimeline(join(root, ".mission"));
  const initial = anchor(0);
  await seed(timeline, "mission-1", initial);
  await seed(timeline, "mission-1", initial);
  expect(await timeline.latestReconciledAnchor("mission-1")).toEqual(initial);
  const content = await readFile(timeline.timelinePath("mission-1"), "utf8");
  expect(content.match(/mission\.anchor-seeded/g)).toHaveLength(1);

  await expect(timeline.seedAnchor({
    version: "atthis.mission-anchor-seed.v1",
    id: "seed:mission-1",
    missionId: "mission-1",
    authorityRef: "principal:test",
    sourceRef: "test:mission-authorization",
    anchor: { ...initial, statement: "Conflicting root." },
  })).rejects.toThrow("conflicts with its authorized initial anchor");

  const late = new FileMissionTimeline(join(root, ".late-mission"));
  await late.appendInput("mission-late", contribution("late-input", "Arrived before authorization."));
  await expect(seed(late, "mission-late", anchor(0))).rejects.toThrow(
    "must authorize its initial anchor before other events",
  );
});

test("ambiguous reconciliation cannot commit and an input watermark cannot be skipped", async () => {
  const root = await fixture();
  const timeline = new FileMissionTimeline(join(root, ".mission"));
  const first = await timeline.appendInput("mission-1", contribution("input-1", "Maybe alter the contract."));
  const second = await timeline.appendInput("mission-1", contribution("input-2", "Also update callers."));
  const decision: ReconciliationDecision = {
    disposition: "decision-required",
    question: "Does this authorize a public contract change?",
    reason: "The requested authority is ambiguous.",
    affectedSurfaces: ["public contract", "callers"],
  };
  const result = await proposeMissionReconciliation({
    id: "reconciliation-ambiguous",
    missionId: "mission-1",
    anchor: anchor(0),
    input: first,
    workspaceRoot: root,
    executionProfile: profile(),
  }, { driver: new ReconciliationDriver(decision) });
  if (result.kind !== "proposed") throw new Error("expected reconciliation proposal");

  await expect(timeline.commitReconciliation({
    proposal: result.proposal,
    acceptance: acceptanceFor(result.proposal, anchor(1)),
  })).rejects.toThrow("requires a Principal decision");
  await expect(proposeMissionReconciliation({
    id: "reconciliation-skip",
    missionId: "mission-1",
    anchor: anchor(0),
    input: second,
    workspaceRoot: root,
    executionProfile: profile(),
  }, { driver: new ReconciliationDriver({ disposition: "continue", inputEffect: "none", responseObligations: [] }) }))
    .rejects.toThrow("not the next unreconciled watermark");
});

test("a driver name claim without the terminal payload cannot create a reconciliation proposal", async () => {
  const root = await fixture();
  const timeline = new FileMissionTimeline(join(root, ".mission"));
  const input = await timeline.appendInput("mission-1", contribution("input-1", "Keep the contract stable."));
  const result = await proposeMissionReconciliation({
    id: "reconciliation-no-payload",
    missionId: "mission-1",
    anchor: anchor(0),
    input,
    workspaceRoot: root,
    executionProfile: profile(),
  }, { driver: new NameOnlyDriver() });

  expect(result.kind).toBe("unsettled");
  if (result.kind !== "unsettled") throw new Error("expected unsettled reconciliation");
  expect(result.reason).toContain("no valid terminal payload");
});

class ReconciliationDriver implements CellDriver {
  readonly descriptor = { adapter: "reconciliation-test", provider: "fixture", model: "flash-fixture" };
  input?: CellInput;

  constructor(private readonly decision: ReconciliationDecision) {}

  async run(input: CellInput, context: DriverContext): Promise<DriverResult> {
    this.input = input;
    const { disposition, ...terminalInput } = this.decision;
    const name = disposition === "continue"
      ? "submit_continue"
      : disposition === "correction"
        ? "submit_correction"
        : "request_decision";
    context.emit("terminal.tool.called", { name, input: terminalInput });
    return {
      finalText: "Submitted one bounded reconciliation candidate.",
      terminalToolsCalled: [name],
      usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30, cachedInputTokens: 0 },
      rawSteps: [],
    };
  }
}

class NameOnlyDriver implements CellDriver {
  readonly descriptor = { adapter: "reconciliation-test", provider: "fixture", model: "flash-fixture" };

  async run(): Promise<DriverResult> {
    return {
      finalText: "Claimed terminal completion without retained input evidence.",
      terminalToolsCalled: ["submit_continue"],
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, cachedInputTokens: 0 },
      rawSteps: [],
    };
  }
}

function anchor(
  reconciledWatermark: number,
  statement = "Preserve the current public contract while improving internal execution.",
  revision = "r1",
): ActiveIntentAnchor {
  return {
    id: `anchor-${revision}`,
    revision,
    statement,
    sourceRefs: [`source:mission-envelope:${revision}`],
    reconciledWatermark,
  };
}

function correction(): ReconciliationDecision {
  return {
    disposition: "correction",
    rejectedAssumption: "Internal cleanup may alter the public contract.",
    newInvariant: "The public contract must remain unchanged.",
    affectedSurfaces: ["public contract", "tests"],
    nextProbe: "Compare the candidate diff with the retained public contract.",
  };
}

function contribution(id: string, text: string) {
  return {
    id,
    actorRef: "principal:local",
    sourceRef: "terminal:primary",
    payload: { kind: "contribution" as const, text },
  };
}

function profile(): ExecutionProfile {
  return {
    id: "flash-fixture-v1",
    version: "execution-profile.v1",
    provider: "fixture",
    model: "flash-fixture",
    parallelism: "serial",
  };
}

function acceptanceFor(proposal: MissionReconciliationProposal, nextAnchor: ActiveIntentAnchor) {
  const verifierRunId = `verifier-run:${proposal.id}`;
  return {
    authorityRef: "principal:test",
    verification: {
      version: "atthis.mission-reconciliation-verification.v1" as const,
      id: `verification:${proposal.id}`,
      missionId: proposal.missionId,
      proposalRef: {
        id: proposal.id,
        digest: digest(proposal),
        runId: proposal.executionRef.runId,
      },
      executionRef: { cellId: `verify:${proposal.id}`, runId: verifierRunId },
      decision: {
        verdict: "verified-transition" as const,
        assessment: "The proposal preserves the supplied source constraints.",
        nextAnchorStatement: nextAnchor.statement,
        preservedConstraints: ["Preserve the supplied source constraints."],
      },
    },
    evidenceRefs: [`work-cell:${proposal.executionRef.runId}`, `work-cell:${verifierRunId}`],
    nextAnchor,
  };
}

async function seed(
  timeline: FileMissionTimeline,
  missionId: string,
  initial: ActiveIntentAnchor,
): Promise<void> {
  await timeline.seedAnchor({
    version: "atthis.mission-anchor-seed.v1",
    id: `seed:${missionId}`,
    missionId,
    authorityRef: "principal:test",
    sourceRef: "test:mission-authorization",
    anchor: initial,
  });
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "mission-reconciliation-"));
  roots.push(root);
  return root;
}
