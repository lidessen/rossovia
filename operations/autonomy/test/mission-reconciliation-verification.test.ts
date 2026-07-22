import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CellInput, ExecutionProfile } from "../../../packages/work-cell/src/contracts";
import type { CellDriver, DriverContext, DriverResult } from "../../../packages/work-cell/src/driver";
import { FileMissionTimeline } from "../src/delegate-timeline";
import {
  verifyMissionReconciliation,
  type ReconciliationVerificationDecision,
} from "../src/mission-reconciliation-verification";
import {
  proposeMissionReconciliation,
  type ActiveIntentAnchor,
  type ReconciliationDecision,
} from "../src/mission-reconciliation";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test("a verifier receives only source material and submits evidence without advancing Mission state", async () => {
  const root = await fixture();
  const timeline = new FileMissionTimeline(join(root, ".mission"));
  await timeline.seedAnchor({
    version: "atthis.mission-anchor-seed.v1",
    id: "seed:mission-1",
    missionId: "mission-1",
    authorityRef: "principal:test",
    sourceRef: "test:mission-authorization",
    anchor: anchor(),
  });
  const input = await timeline.appendInput("mission-1", contribution("input-1", "Continue and retain the evidence."));
  const proposal = await proposed(root, input, {
    disposition: "continue",
    inputEffect: "The direction is unchanged.",
    responseObligations: ["Retain the evidence."],
  });
  const driver = new VerificationDriver({
    verdict: "verified-transition",
    assessment: "The proposal preserves the anchor and retains the added evidence obligation.",
    nextAnchorStatement: "Preserve the public contract, continue the work, and retain its evidence.",
    preservedConstraints: ["Preserve the public contract."],
  });

  const result = await verifyMissionReconciliation({
    id: "verification-1",
    missionId: "mission-1",
    anchor: anchor(),
    input,
    proposal,
    workspaceRoot: root,
    executionProfile: profile("verifier-v1"),
  }, { driver });

  expect(result.kind).toBe("verified");
  if (result.kind !== "verified") throw new Error("expected verified reconciliation");
  expect(result.verification.decision.verdict).toBe("verified-transition");
  expect(result.verification.decision).toMatchObject({
    nextAnchorStatement: anchor().statement,
  });
  expect(result.verification.proposalRef).toMatchObject({ id: proposal.id, runId: proposal.executionRef.runId });
  expect(result.verification.executionRef).toEqual({ cellId: result.record.cellId, runId: result.record.runId });
  expect(driver.input?.context.map((section) => section.id)).toEqual([
    "active-anchor",
    "mission-input",
    "reconciliation-proposal",
  ]);
  expect(driver.input?.workspace).toMatchObject({ readPaths: [], writePaths: [], allowedCommands: [] });
  expect(driver.input?.terminalTools?.map((tool) => tool.name)).toEqual([
    "verify_continue",
    "verify_correction",
    "verify_decision_required",
    "reject_proposal",
  ]);
  expect(await timeline.latestReconciledAnchor("mission-1")).toEqual(anchor());

  const nextAnchor = {
    id: "anchor-r2",
    revision: "r2",
    statement: result.verification.decision.verdict === "verified-transition"
      ? result.verification.decision.nextAnchorStatement
      : "unreachable",
    sourceRefs: ["source:mission-envelope:r1", input.sourceRef],
    reconciledWatermark: input.watermark,
  };
  await timeline.commitReconciliation({
    proposal,
    acceptance: {
      authorityRef: "principal:test",
      verification: result.verification,
      evidenceRefs: [
        `work-cell:${proposal.executionRef.runId}`,
        `work-cell:${result.verification.executionRef.runId}`,
      ],
      nextAnchor,
    },
  });
  expect(await timeline.latestReconciledAnchor("mission-1")).toEqual(nextAnchor);
});

test("a verifier cannot verify the wrong proposal branch or inspect mismatched source input", async () => {
  const root = await fixture();
  const timeline = new FileMissionTimeline(join(root, ".mission"));
  const input = await timeline.appendInput("mission-1", contribution("input-1", "Continue."));
  const other = await timeline.appendInput("mission-1", contribution("input-2", "Another input."));
  const proposal = await proposed(root, input, {
    disposition: "continue",
    inputEffect: "The direction is unchanged.",
    responseObligations: [],
  });
  const wrongBranch = new VerificationDriver({
    verdict: "verified-decision-required",
    assessment: "Claimed an ambiguity that the proposal did not contain.",
    minimumQuestion: "What should happen?",
  });
  const request = {
    id: "verification-wrong-branch",
    missionId: "mission-1",
    anchor: anchor(),
    input,
    proposal,
    workspaceRoot: root,
    executionProfile: profile("verifier-v1"),
  };

  const result = await verifyMissionReconciliation(request, { driver: wrongBranch });
  expect(result.kind).toBe("unsettled");
  if (result.kind !== "unsettled") throw new Error("expected unsettled verification");
  expect(result.reason).toContain("no valid terminal payload");

  const unused = new VerificationDriver({
    verdict: "rejected",
    materialFindings: ["The proposal is linked to another input."],
    nextProbe: "Supply the matching input.",
  });
  await expect(verifyMissionReconciliation({ ...request, input: other }, { driver: unused }))
    .rejects.toThrow("does not match the supplied Mission input");
  expect(unused.calls).toBe(0);
});

test("a correction verifier may propose a changed statement while a continue verifier cannot", async () => {
  const root = await fixture();
  const timeline = new FileMissionTimeline(join(root, ".mission"));
  const input = await timeline.appendInput("mission-1", contribution("input-1", "Preserve a newly corrected boundary."));
  const proposal = await proposed(root, input, {
    disposition: "correction",
    rejectedAssumption: "The old boundary is sufficient.",
    newInvariant: "The corrected boundary must be preserved.",
    affectedSurfaces: ["active intent"],
    nextProbe: "Check the next turn against the corrected boundary.",
  });
  const nextStatement = "Preserve the public contract and the corrected boundary.";
  const driver = new VerificationDriver({
    verdict: "verified-transition",
    assessment: "The correction is directly supported by the supplied input.",
    nextAnchorStatement: nextStatement,
    preservedConstraints: ["Preserve the public contract."],
  }, "verify_correction");

  const result = await verifyMissionReconciliation({
    id: "verification-correction",
    missionId: "mission-1",
    anchor: anchor(),
    input,
    proposal,
    workspaceRoot: root,
    executionProfile: profile("verifier-v1"),
  }, { driver });

  expect(result.kind).toBe("verified");
  if (result.kind !== "verified") throw new Error("expected verified correction");
  expect(result.verification.decision).toMatchObject({ nextAnchorStatement: nextStatement });
});

class ProposalDriver implements CellDriver {
  readonly descriptor = { adapter: "proposal-test", provider: "fixture", model: "flash-fixture" };

  constructor(private readonly decision: ReconciliationDecision) {}

  async run(_input: CellInput, context: DriverContext): Promise<DriverResult> {
    const { disposition, ...terminalInput } = this.decision;
    const name = disposition === "continue"
      ? "submit_continue"
      : disposition === "correction"
        ? "submit_correction"
        : "request_decision";
    context.emit("terminal.tool.called", { name, input: terminalInput });
    return result(name);
  }
}

class VerificationDriver implements CellDriver {
  readonly descriptor = { adapter: "verification-test", provider: "fixture", model: "flash-fixture" };
  input?: CellInput;
  calls = 0;

  constructor(
    private readonly decision: ReconciliationVerificationDecision,
    private readonly transitionTool: "verify_continue" | "verify_correction" = "verify_continue",
  ) {}

  async run(input: CellInput, context: DriverContext): Promise<DriverResult> {
    this.calls += 1;
    this.input = input;
    const { verdict, ...terminalInput } = this.decision;
    const name = verdict === "verified-transition"
      ? this.transitionTool
      : verdict === "verified-decision-required"
        ? "verify_decision_required"
        : "reject_proposal";
    let terminalPayload: Record<string, unknown> = terminalInput;
    if (name === "verify_continue" && "nextAnchorStatement" in terminalInput) {
      const { nextAnchorStatement: _statement, ...rest } = terminalInput;
      terminalPayload = rest;
    }
    context.emit("terminal.tool.called", { name, input: terminalPayload });
    return result(name);
  }
}

function result(name: string): DriverResult {
  return {
    finalText: "Submitted one bounded result.",
    terminalToolsCalled: [name],
    usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30, cachedInputTokens: 0 },
    rawSteps: [],
  };
}

async function proposed(
  root: string,
  input: Awaited<ReturnType<FileMissionTimeline["appendInput"]>>,
  decision: ReconciliationDecision,
) {
  const result = await proposeMissionReconciliation({
    id: "proposal-1",
    missionId: "mission-1",
    anchor: anchor(),
    input,
    workspaceRoot: root,
    executionProfile: profile("proposer-v1"),
  }, { driver: new ProposalDriver(decision) });
  if (result.kind !== "proposed") throw new Error("expected reconciliation proposal");
  return result.proposal;
}

function anchor(): ActiveIntentAnchor {
  return {
    id: "anchor-r1",
    revision: "r1",
    statement: "Preserve the public contract while continuing bounded internal work.",
    sourceRefs: ["source:mission-envelope:r1"],
    reconciledWatermark: 0,
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

function profile(id: string): ExecutionProfile {
  return {
    id,
    version: "execution-profile.v1",
    provider: "fixture",
    model: "flash-fixture",
    parallelism: "serial",
  };
}

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "mission-verification-"));
  roots.push(root);
  return root;
}
