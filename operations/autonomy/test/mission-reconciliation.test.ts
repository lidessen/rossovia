import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
  expect(driver.input?.instructions).toContain(
    "Use continue when, after applying the input, the active Mission anchor remains truthful and sufficient verbatim and the retained authority boundary is unchanged. Describe candidate or effect changes in inputEffect and preserve each still-live consequence as a response obligation.",
  );
  expect(driver.input?.instructions).toContain(
    "Use correction only when the next active Mission anchor statement itself must change. A payload label, file-level implementation requirement, failed probe, completed local correction, or verification result is not by itself a Mission invariant.",
  );
  expect(driver.input?.terminalTools?.find((tool) =>
    tool.name === "submit_continue"
  )?.description).toContain("tactical implementation and verification constraints");
  expect(driver.input?.terminalTools?.find((tool) =>
    tool.name === "submit_correction"
  )?.description).toContain("Mission-level constraint encoded by the active anchor");
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
    version: "rosso.mission-anchor-seed.v1",
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

test("an authority-bound legacy anchor adoption appends to the exact settled watermark-zero history", async () => {
  const root = await fixture();
  const timeline = new FileMissionTimeline(join(root, ".mission"));
  const missionId = "mission-legacy";
  await timeline.startTurn(missionId, {
    version: "rosso.mission-turn.v1",
    turnId: "legacy-turn-1",
    baselineWatermark: 0,
    sourceRefs: ["legacy:mission-envelope"],
  });
  await timeline.settleTurn(missionId, "legacy-turn-1", {
    kind: "failed",
    error: "Retained legacy failure.",
  });
  const priorEvents = await timeline.readEvents(missionId);
  const adoption = legacyAdoption(missionId, priorEvents);
  const path = timeline.timelinePath(missionId);
  const priorBytes = await readFile(path, "utf8");

  await timeline.adoptLegacyAnchor(adoption);
  await timeline.adoptLegacyAnchor(adoption);

  const retained = await readFile(path, "utf8");
  expect(retained.startsWith(priorBytes)).toBe(true);
  expect(retained.match(/mission\.anchor-adopted/g)).toHaveLength(1);
  expect(await timeline.latestReconciledAnchor(missionId)).toEqual(adoption.anchor);
  const adopted = (await timeline.readEvents(missionId)).at(-1);
  expect(adopted).toMatchObject({
    type: "mission.anchor-adopted",
    data: {
      priorEventCount: priorEvents.length,
      priorTimelineDigest: digest(priorEvents),
      adoption: {
        missionId,
        authorityRef: "principal:test",
        sourceRef: "test:legacy-anchor-decision",
      },
    },
  });
  await expect(timeline.adoptLegacyAnchor({
    ...adoption,
    authorityRef: "principal:other",
  })).rejects.toThrow("conflicts with its authorized legacy anchor adoption");
});

test("legacy anchor adoption rejects stale history, unsettled turns, nonzero baselines, and fresh timelines", async () => {
  const root = await fixture();
  const stale = new FileMissionTimeline(join(root, ".stale"));
  const missionId = "mission-stale";
  await stale.appendInput(missionId, contribution("input-1", "Retained legacy input."));
  const staleAdoption = legacyAdoption(missionId, await stale.readEvents(missionId));
  await stale.appendInput(missionId, contribution("input-2", "Concurrent later input."));
  await expect(stale.adoptLegacyAnchor(staleAdoption)).rejects.toThrow(
    "does not match its expected prior timeline",
  );

  const unsettled = new FileMissionTimeline(join(root, ".unsettled"));
  await unsettled.startTurn("mission-unsettled", {
    version: "rosso.mission-turn.v1",
    turnId: "legacy-open-turn",
    baselineWatermark: 0,
    sourceRefs: ["legacy:mission-envelope"],
  });
  await expect(unsettled.adoptLegacyAnchor(legacyAdoption(
    "mission-unsettled",
    await unsettled.readEvents("mission-unsettled"),
  ))).rejects.toThrow("legacy-open-turn is unsettled");

  const nonzero = new FileMissionTimeline(join(root, ".nonzero"));
  const nonzeroMission = "mission-nonzero";
  const start = {
    version: "rosso.mission-turn.v1" as const,
    turnId: "legacy-nonzero-turn",
    baselineWatermark: 1,
    sourceRefs: ["legacy:mission-envelope"],
  };
  const settlement = {
    kind: "failed" as const,
    error: "Retained nonzero-baseline legacy failure.",
  };
  await mkdir(join(root, ".nonzero", "timelines"), { recursive: true });
  await writeFile(nonzero.timelinePath(nonzeroMission), [
    {
      version: "rosso.delegate-timeline-event.v1",
      eventId: "legacy-event-1",
      timelineId: nonzeroMission,
      sequence: 0,
      at: "2026-07-27T00:00:00Z",
      type: "mission.turn-started",
      data: {
        startDigest: digest(start),
        start,
      },
    },
    {
      version: "rosso.delegate-timeline-event.v1",
      eventId: "legacy-event-2",
      timelineId: nonzeroMission,
      sequence: 1,
      at: "2026-07-27T00:01:00Z",
      type: "mission.turn-settled",
      data: {
        turnId: start.turnId,
        startDigest: digest(start),
        settlementDigest: digest(settlement),
        settlement,
      },
    },
  ].map((event) => JSON.stringify(event)).join("\n") + "\n", "utf8");
  await expect(nonzero.adoptLegacyAnchor(legacyAdoption(
    nonzeroMission,
    await nonzero.readEvents(nonzeroMission),
  ))).rejects.toThrow("started from nonzero baseline");

  const fresh = new FileMissionTimeline(join(root, ".fresh"));
  await expect(fresh.adoptLegacyAnchor({
    version: "rosso.mission-anchor-adoption.v1",
    id: "adopt:fresh",
    missionId: "mission-fresh",
    authorityRef: "principal:test",
    sourceRef: "test:legacy-anchor-decision",
    expectedPriorEventCount: 1,
    expectedPriorTimelineDigest: "a".repeat(64),
    anchor: anchor(0),
  })).rejects.toThrow("has no legacy events");

  const seeded = new FileMissionTimeline(join(root, ".seeded"));
  await seed(seeded, "mission-seeded", anchor(0));
  await expect(seeded.adoptLegacyAnchor(legacyAdoption(
    "mission-seeded",
    await seeded.readEvents("mission-seeded"),
  ))).rejects.toThrow("already has an authorized initial anchor");

  await expect(stale.adoptLegacyAnchor({
    ...legacyAdoption(missionId, await stale.readEvents(missionId)),
    anchor: anchor(1),
  })).rejects.toThrow("must start at watermark 0");
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

test("mechanical control remains outside semantic reconciliation", async () => {
  const root = await fixture();
  const timeline = new FileMissionTimeline(join(root, ".mission"));
  const input = await timeline.appendInput("mission-1", {
    id: "control-1",
    actorRef: "principal:local",
    sourceRef: "terminal:primary",
    payload: { kind: "control", command: "pause" },
  });
  const driver = new ReconciliationDriver(correction());

  await expect(proposeMissionReconciliation({
    id: "reconciliation-control",
    missionId: "mission-1",
    anchor: anchor(0),
    input,
    workspaceRoot: root,
    executionProfile: profile(),
  }, { driver })).rejects.toThrow(
    "mechanical control and cannot enter semantic reconciliation",
  );
  expect(driver.calls).toBe(0);
});

class ReconciliationDriver implements CellDriver {
  readonly descriptor = { adapter: "reconciliation-test", provider: "fixture", model: "flash-fixture" };
  input?: CellInput;
  calls = 0;

  constructor(private readonly decision: ReconciliationDecision) {}

  async run(input: CellInput, context: DriverContext): Promise<DriverResult> {
    this.calls += 1;
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

function legacyAdoption(
  missionId: string,
  priorEvents: readonly unknown[],
) {
  return {
    version: "rosso.mission-anchor-adoption.v1" as const,
    id: `adopt:${missionId}`,
    missionId,
    authorityRef: "principal:test",
    sourceRef: "test:legacy-anchor-decision",
    expectedPriorEventCount: priorEvents.length,
    expectedPriorTimelineDigest: digest(priorEvents),
    anchor: {
      id: `anchor:${missionId}`,
      revision: "legacy-adoption-r1",
      statement: "Preserve the exact legacy history while reconciling future semantic input.",
      sourceRefs: ["test:legacy-anchor-decision"],
      reconciledWatermark: 0,
    },
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
  const proposalEvidenceDigest = digest({
    role: "proposal",
    runId: proposal.executionRef.runId,
    cellId: proposal.executionRef.cellId,
  });
  const verificationCellId = `verify:${proposal.id}`;
  const verificationEvidenceDigest = digest({
    role: "verification",
    runId: verifierRunId,
    cellId: verificationCellId,
  });
  return {
    authorityRef: "principal:test",
    verification: {
      version: "rosso.mission-reconciliation-verification.v1" as const,
      id: `verification:${proposal.id}`,
      missionId: proposal.missionId,
      proposalRef: {
        id: proposal.id,
        digest: digest(proposal),
        runId: proposal.executionRef.runId,
      },
      executionRef: { cellId: verificationCellId, runId: verifierRunId },
      decision: {
        verdict: "verified-transition" as const,
        assessment: "The proposal preserves the supplied source constraints.",
        nextAnchorStatement: nextAnchor.statement,
        preservedConstraints: ["Preserve the supplied source constraints."],
      },
    },
    proposalEvidence: {
      role: "proposal" as const,
      runId: proposal.executionRef.runId,
      cellId: proposal.executionRef.cellId,
      ref: `file:reconciliation-cell-records/${proposalEvidenceDigest}.json`,
      digest: proposalEvidenceDigest,
    },
    verificationEvidence: {
      role: "verification" as const,
      runId: verifierRunId,
      cellId: verificationCellId,
      ref: `file:reconciliation-cell-records/${verificationEvidenceDigest}.json`,
      digest: verificationEvidenceDigest,
    },
    nextAnchor,
  };
}

async function seed(
  timeline: FileMissionTimeline,
  missionId: string,
  initial: ActiveIntentAnchor,
): Promise<void> {
  await timeline.seedAnchor({
    version: "rosso.mission-anchor-seed.v1",
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
