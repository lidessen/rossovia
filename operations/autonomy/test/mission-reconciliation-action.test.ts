import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type {
  CellInput,
} from "../../../packages/work-cell/src/contracts";
import type {
  CellDriver,
  DriverContext,
  DriverResult,
} from "../../../packages/work-cell/src/driver";
import { digest } from "../src/canonical-json";
import { FileMissionTimeline } from "../src/delegate-timeline";
import type { TimelineEvent } from "../src/delegate-timeline-events";
import {
  LocalCorrectionReportSchema,
  localCorrectionReportDigest,
  localCorrectionReportRef,
  type LocalCorrectionReport,
} from "../src/local-correction";
import {
  MISSION_RECONCILIATION_ACTION_DECISION_VERSION,
  MISSION_RECONCILIATION_ACTION_OUTCOME_VERSION,
  MISSION_RECONCILIATION_ACTION_PROPOSAL_VERSION,
  MissionReconciliationActionProposalSchema,
  missionReconciliationActionDecisionDigest,
  missionReconciliationActionProposalDigest,
  readMissionReconciliationActionDecision,
  readMissionReconciliationActionOutcome,
  readMissionReconciliationActionProposal,
  projectMissionReconciliationAction,
  retainMissionReconciliationActionAttempt,
  retainMissionReconciliationActionDecision,
  retainMissionReconciliationActionOutcome,
  retainMissionReconciliationActionProposal,
  type MissionReconciliationActionDecision,
  type MissionReconciliationActionOutcome,
  type MissionReconciliationActionProposal,
} from "../src/mission-reconciliation-action";
import {
  executeMissionReconciliationAction,
} from "../src/mission-reconciliation-action-executor";
import {
  settleAgentEraBlogReconciliationAction,
} from "../experiments/agent-era-blog-reconciliation-action";
import type {
  VerifiedCodexAppServerCarrier,
} from "../experiments/codex-app-server-carrier-policy";
import type {
  MissionReconciliationCommit,
} from "../src/mission-reconciliation-commit";
import { missionRunnerDirectory } from "../src/mission-paths";
import { digestAnchor } from "../src/mission-reconciliation";

const homes: string[] = [];

afterEach(async () => {
  await Promise.all(homes.splice(0).map((home) =>
    rm(home, { recursive: true, force: true })
  ));
});

test("the action proposal schema binds one exact lineage, correction input, and byte-addressed report", () => {
  const proposal = proposalFixture();
  expect(MissionReconciliationActionProposalSchema.parse(proposal)).toEqual(proposal);

  expect(() => MissionReconciliationActionProposalSchema.parse({
    ...proposal,
    lineage: {
      ...proposal.lineage,
      anchorDigest: "0".repeat(64),
    },
  })).toThrow("anchor digest does not match the exact anchor");

  expect(() => MissionReconciliationActionProposalSchema.parse({
    ...proposal,
    target: {
      ...proposal.target,
      reconciledWatermark: 1,
    },
  })).toThrow("proposal must bind exactly the next unreconciled input");

  const wrongInputReport = LocalCorrectionReportSchema.parse({
    ...proposal.correctionEvidence.report,
    correction: {
      ...proposal.correctionEvidence.report.correction,
      inputId: "another-input",
    },
  });
  expect(() => MissionReconciliationActionProposalSchema.parse({
    ...proposal,
    correctionEvidence: correctionEvidence(proposal.input.eventId, wrongInputReport),
  })).toThrow("correction report does not bind the exact Mission input");

  expect(() => MissionReconciliationActionProposalSchema.parse({
    ...proposal,
    correctionEvidence: {
      ...proposal.correctionEvidence,
      reportRef: "file:correction-artifacts/wrong/report.json",
    },
  })).toThrow("correction evidence must be a digest-bound passed report");

  expect(() => MissionReconciliationActionProposalSchema.parse({
    ...proposal,
    input: {
      ...proposal.input,
      payload: {
        ...proposal.input.payload,
        instruction: "Tampered instruction.",
      },
    },
  })).toThrow("reconciliation action input must be an exact correction payload");
});

test("proposal retention is idempotent and replacement requires the exact current digest", async () => {
  const home = await fixture();
  const proposal = proposalFixture();
  const first = await retainMissionReconciliationActionProposal(home, proposal);
  const repeated = await retainMissionReconciliationActionProposal(home, proposal);
  expect(repeated).toEqual(first);

  const replacement = MissionReconciliationActionProposalSchema.parse({
    ...proposal,
    proposalId: "reconciliation-action-proposal-2",
    preparedAt: "2026-07-27T13:01:00.000Z",
  });
  await expect(retainMissionReconciliationActionProposal(
    home,
    replacement,
  )).rejects.toThrow("exact replacement authority is required");
  await expect(retainMissionReconciliationActionProposal(
    home,
    replacement,
    { expectedCurrentDigest: "f".repeat(64) },
  )).rejects.toThrow(`changed from ${first.digest}`);

  const replaced = await retainMissionReconciliationActionProposal(
    home,
    replacement,
    { expectedCurrentDigest: first.digest },
  );
  expect(await readMissionReconciliationActionProposal(home, proposal.missionId))
    .toEqual(replaced);
});

test("a decision binds the exact current proposal and one proposal retains only one decision", async () => {
  const home = await fixture();
  const first = await retainMissionReconciliationActionProposal(
    home,
    proposalFixture(),
  );
  const replacementProposal = MissionReconciliationActionProposalSchema.parse({
    ...first.proposal,
    proposalId: "reconciliation-action-proposal-current",
    preparedAt: "2026-07-27T13:02:00.000Z",
  });
  const current = await retainMissionReconciliationActionProposal(
    home,
    replacementProposal,
    { expectedCurrentDigest: first.digest },
  );

  await expect(retainMissionReconciliationActionDecision(
    home,
    decisionFixture(first.proposal, first.digest),
  )).rejects.toThrow("does not bind the current exact proposal");

  const decision = decisionFixture(current.proposal, current.digest);
  const retained = await retainMissionReconciliationActionDecision(home, decision);
  expect(await retainMissionReconciliationActionDecision(home, decision)).toEqual(retained);
  expect(await readMissionReconciliationActionDecision(
    home,
    current.proposal.missionId,
    current.digest,
  )).toEqual(retained);

  await expect(retainMissionReconciliationActionDecision(home, {
    ...decision,
    decisionId: "another-decision",
    choice: "HOLD",
  })).rejects.toThrow("already has another decision");
  expect(await readMissionReconciliationActionDecision(
    home,
    current.proposal.missionId,
    current.digest,
  )).toEqual(retained);
});

test("a consumed one-use attempt is projected as consumed, never awaiting execution", async () => {
  const home = await fixture();
  const proposal = await retainMissionReconciliationActionProposal(
    home,
    proposalFixture(),
  );
  const decision = await retainMissionReconciliationActionDecision(
    home,
    decisionFixture(proposal.proposal, proposal.digest),
  );
  await retainMissionReconciliationActionAttempt(home, {
    version: "rosso.mission-reconciliation-action-attempt.v1",
    missionId: proposal.proposal.missionId,
    proposalId: proposal.proposal.proposalId,
    proposalDigest: proposal.digest,
    decisionDigest: decision.digest,
    target: {
      runnerId: proposal.proposal.target.runnerId,
      state: "input-pending",
    },
    standing: "one-use-execution-started",
    startedAt: "2026-07-27T13:02:30.000Z",
  });

  expect(
    (await projectMissionReconciliationAction(
      home,
      proposal.proposal.missionId,
    ))?.standing,
  ).toBe("execution-attempt-consumed");
});

test("an action outcome is idempotent and the same proposal digest cannot acquire a conflicting outcome", async () => {
  const home = await fixture();
  const retainedProposal = await retainMissionReconciliationActionProposal(
    home,
    proposalFixture(),
  );
  const proposal = retainedProposal.proposal;
  const proposalDigest = retainedProposal.digest;
  const decision = {
    ...decisionFixture(proposal, proposalDigest),
    choice: "HOLD" as const,
  };
  const retainedDecision = await retainMissionReconciliationActionDecision(
    home,
    decision,
  );
  const outcome: MissionReconciliationActionOutcome = {
    version: MISSION_RECONCILIATION_ACTION_OUTCOME_VERSION,
    missionId: proposal.missionId,
    proposalId: proposal.proposalId,
    proposalDigest,
    decisionDigest: retainedDecision.digest,
    standing: "held",
    detail: "The Principal retained the proposal without reconciliation.",
    attemptDigest: null,
    proposalCellRecordDigest: null,
    verificationCellRecordDigest: null,
    proposalEvidenceDigest: null,
    verificationEvidenceDigest: null,
    reconciliationEventDigest: null,
    recordedAt: "2026-07-27T13:03:00.000Z",
  };

  expect(await retainMissionReconciliationActionOutcome(home, outcome)).toEqual(outcome);
  expect(await retainMissionReconciliationActionOutcome(home, outcome)).toEqual(outcome);
  expect(await readMissionReconciliationActionOutcome(
    home,
    proposal.missionId,
    proposalDigest,
  )).toEqual(outcome);

  await expect(retainMissionReconciliationActionOutcome(home, {
    ...outcome,
    detail: "Conflicting terminal result.",
  })).rejects.toThrow("already has another outcome");
  expect(await readMissionReconciliationActionOutcome(
    home,
    proposal.missionId,
    proposalDigest,
  )).toEqual(outcome);

  await expect(retainMissionReconciliationActionOutcome(home, {
    ...outcome,
    standing: "reconciled",
  })).rejects.toThrow(
    "a reconciled outcome requires proposal, verification, and reconciliation event evidence",
  );
});

test("HOLD records a terminal outcome without creating a Cell or committing", async () => {
  const home = await fixture();
  const proposal = await retainMissionReconciliationActionProposal(
    home,
    proposalFixture(),
  );
  await retainMissionReconciliationActionDecision(home, {
    ...decisionFixture(proposal.proposal, proposal.digest),
    choice: "HOLD",
  });
  let cellCalls = 0;
  let commitCalls = 0;
  const outcome = await executeMissionReconciliationAction({
    home,
    missionId: proposal.proposal.missionId,
    proposalDigest: proposal.digest,
    observeCurrent: async () => {
      throw new Error("HOLD must not observe or disclose execution inputs");
    },
    createCell: async () => {
      cellCalls += 1;
      throw new Error("HOLD must not create a Cell");
    },
    commit: async () => {
      commitCalls += 1;
      throw new Error("HOLD must not commit");
    },
    now: () => "2026-07-27T13:06:00.000Z",
  });
  expect(outcome.standing).toBe("held");
  expect(cellCalls).toBe(0);
  expect(commitCalls).toBe(0);
});

test("the Blog adapter turns an exact HOLD reply into one idempotent retained decision without observation", async () => {
  const home = await fixture();
  const proposal = await retainMissionReconciliationActionProposal(
    home,
    proposalFixture(),
  );
  let runnerCalls = 0;
  let gitCalls = 0;
  const options = {
    home,
    missionId: proposal.proposal.missionId,
    missionSourceRoot: "/must-not-be-observed",
    projectId: proposal.proposal.missionSource.projectId,
    proposalDigest: proposal.digest,
    choice: "HOLD" as const,
    authorityRef: "principal:lidessen",
    sourceRef: "conversation:hold-exact-proposal",
    now: () => "2026-07-27T13:06:30.000Z",
  };
  const dependencies = {
    runnerRequest: async () => {
      runnerCalls += 1;
      throw new Error("HOLD must not contact the Mission runner");
    },
    git: () => {
      gitCalls += 1;
      throw new Error("HOLD must not inspect the Mission source");
    },
  };

  const first = await settleAgentEraBlogReconciliationAction(
    options,
    dependencies,
  );
  const replay = await settleAgentEraBlogReconciliationAction(
    options,
    dependencies,
  );

  expect(first.outcome.standing).toBe("held");
  expect(first.decision.decision.choice).toBe("HOLD");
  expect(replay).toEqual(first);
  expect(runnerCalls).toBe(0);
  expect(gitCalls).toBe(0);
  await expect(settleAgentEraBlogReconciliationAction({
    ...options,
    choice: "RECLASSIFY_CORRECTION",
  }, dependencies)).rejects.toThrow(
    "already has a different retained decision",
  );
});

test("the Blog adapter refuses a drifted Mission source before retaining SETTLE_CONTINUE", async () => {
  const home = await fixture();
  const sourceRoot = await fixture();
  const proposal = await retainMissionReconciliationActionProposal(
    home,
    proposalFixture(),
  );
  await writeWorkbenchPrimary(
    home,
    proposal.proposal.missionSource.projectId,
    sourceRoot,
  );
  let runnerCalls = 0;

  await expect(settleAgentEraBlogReconciliationAction({
    home,
    missionId: proposal.proposal.missionId,
    missionSourceRoot: sourceRoot,
    projectId: proposal.proposal.missionSource.projectId,
    proposalDigest: proposal.digest,
    choice: "SETTLE_CONTINUE",
    authorityRef: "principal:lidessen",
    sourceRef: "conversation:settle-exact-proposal",
  }, {
    carrier: async () => (
      proposal.proposal.execution.carrier as VerifiedCodexAppServerCarrier
    ),
    git: (root, ...args) =>
      args[0] === "rev-parse" && args[1] === "--show-toplevel"
        ? root
        : args[0] === "rev-parse"
          ? "6".repeat(40)
          : "",
    runnerRequest: async () => {
      runnerCalls += 1;
      throw new Error("source drift must stop before runner observation");
    },
  })).rejects.toThrow("Mission source HEAD drifted");

  expect(runnerCalls).toBe(0);
  expect(await readMissionReconciliationActionDecision(
    home,
    proposal.proposal.missionId,
    proposal.digest,
  )).toBeUndefined();
});

test("the Blog adapter refuses an unverified Codex carrier before retaining SETTLE_CONTINUE", async () => {
  const home = await fixture();
  const proposal = await retainMissionReconciliationActionProposal(
    home,
    proposalFixture(),
  );

  await expect(settleAgentEraBlogReconciliationAction({
    home,
    missionId: proposal.proposal.missionId,
    missionSourceRoot: await fixture(),
    projectId: proposal.proposal.missionSource.projectId,
    proposalDigest: proposal.digest,
    choice: "SETTLE_CONTINUE",
    authorityRef: "principal:lidessen",
    sourceRef: "conversation:settle-exact-proposal",
  }, {
    carrier: async () => {
      throw new Error("carrier identity unavailable");
    },
  })).rejects.toThrow("carrier identity unavailable");

  expect(await readMissionReconciliationActionDecision(
    home,
    proposal.proposal.missionId,
    proposal.digest,
  )).toBeUndefined();
});

test("the proposal schema rejects the retired CLI carrier boundary", () => {
  const current = proposalFixture();
  expect(() => MissionReconciliationActionProposalSchema.parse({
    ...current,
    execution: {
      ...current.execution,
      adapter: "codex-cli.v1",
      carrier: {
        canonicalExecutable: "/fixture/bin/codex",
        executableSha256: "8".repeat(64),
        version: "codex-cli fixture",
        codeSignature: {
          identifier: "codex",
          teamIdentifier: "fixture-team",
        },
        toolPolicy: "terminal-output-only-v1",
      },
      isolation: "fresh-disposable-read-only",
      externalDisclosure: {
        provider: "openai",
        data: [
          "active-intent-anchor",
          "watermark-1-correction-input",
          "reconciliation-proposal-to-independent-verifier",
        ],
        repositoryFiles: "none",
        candidateFiles: "none",
      },
    },
  })).toThrow();
});

test("the Blog adapter returns an exact retained SETTLE_CONTINUE outcome after carrier removal", async () => {
  const home = await fixture();
  const proposal = await retainMissionReconciliationActionProposal(
    home,
    proposalFixture(),
  );
  const decision = await retainMissionReconciliationActionDecision(
    home,
    decisionFixture(proposal.proposal, proposal.digest),
  );
  const attempt = await retainMissionReconciliationActionAttempt(home, {
    version: "rosso.mission-reconciliation-action-attempt.v1",
    missionId: proposal.proposal.missionId,
    proposalId: proposal.proposal.proposalId,
    proposalDigest: proposal.digest,
    decisionDigest: decision.digest,
    target: {
      runnerId: proposal.proposal.target.runnerId,
      state: "input-pending",
    },
    standing: "one-use-execution-started",
    startedAt: "2026-07-27T13:07:00.000Z",
  });
  const outcome = await retainMissionReconciliationActionOutcome(home, {
    version: MISSION_RECONCILIATION_ACTION_OUTCOME_VERSION,
    missionId: proposal.proposal.missionId,
    proposalId: proposal.proposal.proposalId,
    proposalDigest: proposal.digest,
    decisionDigest: decision.digest,
    standing: "returned-to-principal",
    detail: "The exact one-use action already returned to the Principal.",
    attemptDigest: attempt.digest,
    proposalCellRecordDigest: null,
    verificationCellRecordDigest: null,
    proposalEvidenceDigest: null,
    verificationEvidenceDigest: null,
    reconciliationEventDigest: null,
    recordedAt: "2026-07-27T13:08:00.000Z",
  });

  const replay = await settleAgentEraBlogReconciliationAction({
    home,
    missionId: proposal.proposal.missionId,
    missionSourceRoot: "/carrier-is-no-longer-needed",
    projectId: proposal.proposal.missionSource.projectId,
    proposalDigest: proposal.digest,
    choice: "SETTLE_CONTINUE",
    authorityRef: "principal:lidessen",
    sourceRef: "conversation:settle-continue",
  }, {
    carrier: async () => {
      throw new Error("settled replay must not require the carrier");
    },
  });

  expect(replay.outcome).toEqual(outcome);
  expect(replay.decision).toEqual(decision);
});

test("the Blog adapter rejects a same-HEAD non-primary worktree before retaining SETTLE_CONTINUE", async () => {
  const home = await fixture();
  const primaryRoot = await fixture();
  const alternateRoot = await fixture();
  const proposal = await retainMissionReconciliationActionProposal(
    home,
    proposalFixture(),
  );
  await writeWorkbenchPrimary(
    home,
    proposal.proposal.missionSource.projectId,
    primaryRoot,
  );
  let gitCalls = 0;

  await expect(settleAgentEraBlogReconciliationAction({
    home,
    missionId: proposal.proposal.missionId,
    missionSourceRoot: alternateRoot,
    projectId: proposal.proposal.missionSource.projectId,
    proposalDigest: proposal.digest,
    choice: "SETTLE_CONTINUE",
    authorityRef: "principal:lidessen",
    sourceRef: "conversation:settle-exact-proposal",
  }, {
    carrier: async () => (
      proposal.proposal.execution.carrier as VerifiedCodexAppServerCarrier
    ),
    git: () => {
      gitCalls += 1;
      return proposal.proposal.missionSource.gitHead;
    },
    runnerRequest: async () => {
      throw new Error("non-primary source must stop before runner observation");
    },
  })).rejects.toThrow("not the Workbench registered primary workspace");

  expect(gitCalls).toBe(0);
  expect(await readMissionReconciliationActionDecision(
    home,
    proposal.proposal.missionId,
    proposal.digest,
  )).toBeUndefined();
});

test("SETTLE_CONTINUE uses fresh independent Cells and binds commit authority to the retained decision", async () => {
  const home = await fixture();
  const retained = await retainMissionReconciliationActionProposal(
    home,
    proposalFixture(),
  );
  const decision = await retainMissionReconciliationActionDecision(
    home,
    decisionFixture(retained.proposal, retained.digest),
  );
  const workspaces: string[] = [];
  let commitAuthority = "";
  let observations = 0;
  const outcome = await executeMissionReconciliationAction({
    home,
    missionId: retained.proposal.missionId,
    proposalDigest: retained.digest,
    observeCurrent: async () => {
      observations += 1;
      return {
        missionSource: retained.proposal.missionSource,
        target: retained.proposal.target,
        anchor: retained.proposal.lineage.anchor,
        input: retained.proposal.input,
        correctionEvidence: retained.proposal.correctionEvidence,
      };
    },
    createCell: async (role) => {
      const workspaceRoot = await fixture();
      workspaces.push(workspaceRoot);
      return {
        workspaceRoot,
        driver: new ActionDriver(role),
        isolation: "fresh-disposable-no-environment",
        dispose: async () => {},
      };
    },
    commit: async (commit, target) => {
      expect(target).toEqual({
        expectedRunnerId: retained.proposal.target.runnerId,
        expectedState: "input-pending",
      });
      commitAuthority = commit.acceptance.authorityRef;
      expect(commit.acceptance.nextAnchor).toEqual(
        retained.proposal.conditionalSettlement.nextAnchor,
      );
      const reconciliationEvent = reconciliationEventFor(commit);
      await retainTimelineEvent(home, reconciliationEvent);
      return {
        reconciliationEvent,
        reconciledWatermark: 1,
      };
    },
    now: () => "2026-07-27T13:07:00.000Z",
  });

  expect(outcome.standing).toBe("reconciled");
  expect(outcome.proposalEvidenceDigest).toMatch(/^[a-f0-9]{64}$/);
  expect(outcome.verificationEvidenceDigest).toMatch(/^[a-f0-9]{64}$/);
  expect(outcome.reconciliationEventDigest).toMatch(/^[a-f0-9]{64}$/);
  expect(workspaces).toHaveLength(2);
  expect(new Set(workspaces).size).toBe(2);
  expect(observations).toBe(4);
  expect(commitAuthority).toBe(
    `reconciliation-action-decision:sha256:${decision.digest}`,
  );

  const replay = await executeMissionReconciliationAction({
    home,
    missionId: retained.proposal.missionId,
    proposalDigest: retained.digest,
    observeCurrent: async () => {
      throw new Error("terminal outcome replay must not observe current state");
    },
    createCell: async () => {
      throw new Error("terminal outcome replay must not create a Cell");
    },
    commit: async () => {
      throw new Error("terminal outcome replay must not commit");
    },
  });
  expect(replay).toEqual(outcome);
});

test("a commit-attempt result that cannot prove its event is retained as uncertain, never failed-before-commit", async () => {
  const home = await fixture();
  const retained = await retainMissionReconciliationActionProposal(
    home,
    proposalFixture(),
  );
  await retainMissionReconciliationActionDecision(
    home,
    decisionFixture(retained.proposal, retained.digest),
  );
  const observation = {
    missionSource: retained.proposal.missionSource,
    target: retained.proposal.target,
    anchor: retained.proposal.lineage.anchor,
    input: retained.proposal.input,
    correctionEvidence: retained.proposal.correctionEvidence,
  };
  const outcome = await executeMissionReconciliationAction({
    home,
    missionId: retained.proposal.missionId,
    proposalDigest: retained.digest,
    observeCurrent: async () => observation,
    createCell: async (role) => ({
      workspaceRoot: await fixture(),
      driver: new ActionDriver(role),
      isolation: "fresh-disposable-no-environment",
      dispose: async () => {},
    }),
    commit: async (commit) => ({
      reconciliationEvent: reconciliationEventFor(commit),
      reconciledWatermark: 1,
    }),
    now: () => "2026-07-27T13:08:00.000Z",
  });

  expect(outcome.standing).toBe("commit-outcome-uncertain");
  expect(outcome.reconciliationEventDigest).toBeNull();
  expect(outcome.proposalEvidenceDigest).toMatch(/^[a-f0-9]{64}$/);
  expect(outcome.verificationEvidenceDigest).toMatch(/^[a-f0-9]{64}$/);
});

test("the executor rejects a Cell carrier outside the exact authorized adapter", async () => {
  const home = await fixture();
  const retained = await retainMissionReconciliationActionProposal(
    home,
    proposalFixture(),
  );
  await retainMissionReconciliationActionDecision(
    home,
    decisionFixture(retained.proposal, retained.digest),
  );
  const outcome = await executeMissionReconciliationAction({
    home,
    missionId: retained.proposal.missionId,
    proposalDigest: retained.digest,
    observeCurrent: async () => ({
      missionSource: retained.proposal.missionSource,
      target: retained.proposal.target,
      anchor: retained.proposal.lineage.anchor,
      input: retained.proposal.input,
      correctionEvidence: retained.proposal.correctionEvidence,
    }),
    createCell: async (role) => ({
      workspaceRoot: await fixture(),
      driver: new ActionDriver(role, "another-adapter"),
      isolation: "fresh-disposable-no-environment",
      dispose: async () => {},
    }),
    commit: async () => {
      throw new Error("unauthorized carrier must not reach commit");
    },
  });
  expect(outcome.standing).toBe("failed-before-commit");
  expect(outcome.detail).toContain("does not match the authorized carrier");
  expect(outcome.proposalCellRecordDigest).toBeNull();
});

async function fixture(): Promise<string> {
  const home = await mkdtemp(join(tmpdir(), "reconciliation-action-"));
  homes.push(home);
  return home;
}

async function writeWorkbenchPrimary(
  home: string,
  projectId: string,
  path: string,
): Promise<void> {
  await mkdir(join(home, "config"), { recursive: true });
  await mkdir(join(home, "state"), { recursive: true });
  await writeFile(join(home, "manifest.json"), `${JSON.stringify({
    version: "rosso.home.v1",
    namespace: "rosso",
    createdAt: "2026-07-27T00:00:00Z",
  })}\n`, "utf8");
  await writeFile(join(home, "config", "projects.json"), `${JSON.stringify({
    version: "rosso.projects.v1",
    projects: [{
      id: projectId,
      repository: "https://example.test/agent-era-blog.git",
      aliases: ["agent-era-blog"],
    }],
  })}\n`, "utf8");
  await writeFile(join(home, "state", "workspaces.json"), `${JSON.stringify({
    version: "rosso.workspaces.v1",
    workspaces: [{ projectId, path }],
  })}\n`, "utf8");
  await writeFile(join(home, "state", "roots.json"), `${JSON.stringify({
    version: "rosso.roots.v1",
    roots: [],
  })}\n`, "utf8");
}

function proposalFixture(): MissionReconciliationActionProposal {
  const missionId = "principal-workbench-dogfood";
  const eventId = "input-event-1";
  const payload = {
    kind: "correction" as const,
    correctionId: "blog-index-import-v1",
    instruction: "Import index without changing any other candidate file.",
    cause: {
      effectId: "blog-effect-1",
      failedReportRef: "file:effect-artifacts/failed.json",
      failedReportDigest: "1".repeat(64),
    },
    subject: {
      gitHead: "2".repeat(40),
      files: [
        { path: "app/blog/content.ts", sha256: "3".repeat(64) },
        { path: "db/schema.ts", sha256: "4".repeat(64) },
      ],
    },
    scope: {
      writePaths: ["db/schema.ts"],
      externalDisclosure: "none" as const,
    },
    plannedVerificationRef: "local-correction-report:blog-index-import-v1",
    authority: withheldCorrectionAuthority(),
  };
  const input = {
    inputId: payload.correctionId,
    watermark: 1,
    actorRef: "principal:lidessen",
    sourceRef: "conversation:option-a",
    payload,
    payloadDigest: digest(payload),
    eventId,
    at: "2026-07-27T12:00:00.000Z",
  };
  const report = reportFixture(missionId, input);
  const anchor = {
    id: `intent:${missionId}`,
    revision: "legacy-adoption-r1",
    statement: "Build the Blog while preserving evidence and withheld integration authority.",
    sourceRefs: ["mission-record:principal-workbench-dogfood"],
    reconciledWatermark: 0,
  };
  return MissionReconciliationActionProposalSchema.parse({
    version: MISSION_RECONCILIATION_ACTION_PROPOSAL_VERSION,
    proposalId: "reconciliation-action-proposal-1",
    missionId,
    preparedAt: "2026-07-27T13:00:00.000Z",
    preparedBy: "supervisor:Codex",
    missionSource: {
      projectId: "project:agent-era-blog",
      relativePath: "operations/missions/principal-workbench-dogfood.json",
      gitHead: "5".repeat(40),
    },
    target: {
      runnerId: "runner-1",
      pid: 1234,
      startedAt: "2026-07-27T12:45:17.073Z",
      socketPath: "/tmp/runner.sock",
      state: "input-pending",
      live: true,
      runtimeMode: "none",
      inputWatermark: 1,
      reconciledWatermark: 0,
    },
    lineage: {
      anchor,
      anchorDigest: digestAnchor(anchor),
    },
    input,
    correctionEvidence: correctionEvidence(eventId, report),
    execution: {
      adapter: "codex-app-server.v1",
      carrier: {
        canonicalExecutable: "/fixture/bin/codex",
        version: "codex-cli fixture",
        toolPolicy:
          "app-server-no-environment-structured-output-plan-only-v1",
      },
      profile: {
        id: "codex-app-server-reconciliation-v1",
        version: "execution-profile.v1",
        provider: "openai",
        model: "gpt-5",
        parallelism: "serial",
      },
      invocations: 2,
      isolation: "fresh-disposable-no-environment",
      maxDurationMsPerCell: 120_000,
      externalDisclosure: {
        provider: "openai",
        data: [
          "active-intent-anchor",
          "watermark-1-correction-input",
          "reconciliation-proposal-to-independent-verifier",
          "bounded-work-cell-envelope-without-workspace-or-host-budget",
          "pinned-codex-system-developer-and-output-schema-context",
        ],
        repositoryFiles: "none",
        candidateFiles: "none",
      },
    },
    conditionalSettlement: {
      proposalDisposition: "continue",
      verificationVerdict: "verified-transition",
      nextAnchor: {
        ...anchor,
        revision: "reconciliation-w1",
        sourceRefs: [...anchor.sourceRefs, input.sourceRef],
        reconciledWatermark: 1,
      },
      otherwise: "return-to-principal-without-commit",
    },
    decision: {
      recommendation: "SETTLE_CONTINUE",
      replyKey: "SETTLE_CONTINUE|RECLASSIFY_CORRECTION|HOLD",
      options: {
        SETTLE_CONTINUE: {
          immediateResult: "Settle only this semantic input as continue.",
          tradeoff: "The runner becomes idle without granting integration authority.",
        },
        RECLASSIFY_CORRECTION: {
          immediateResult: "Return for a new Mission-level correction proposal.",
          tradeoff: "The current watermark remains unreconciled.",
        },
        HOLD: {
          immediateResult: "Retain the proposal without mutation.",
          tradeoff: "Semantic production remains blocked.",
        },
      },
    },
    authorityBoundary: {
      standing: "proposal-only",
      modelExecution: "withheld",
      externalDisclosure: "withheld",
      reconciliation: "withheld",
      candidateWrite: "withheld",
      commit: "withheld",
      merge: "withheld",
      publish: "withheld",
      productAcceptance: "withheld",
    },
  });
}

function reportFixture(
  missionId: string,
  input: {
    readonly inputId: string;
    readonly eventId: string;
    readonly watermark: number;
    readonly payloadDigest: string;
    readonly actorRef: string;
    readonly sourceRef: string;
    readonly payload: Extract<
      MissionReconciliationActionProposal["input"]["payload"],
      { kind: "correction" }
    >;
  },
): LocalCorrectionReport {
  return LocalCorrectionReportSchema.parse({
    version: "rosso.agent-era-blog-local-correction.v1",
    correction: {
      missionId,
      correctionId: input.payload.correctionId,
      inputId: input.inputId,
      inputEventId: input.eventId,
      inputWatermark: input.watermark,
      inputPayloadDigest: input.payloadDigest,
      actorRef: input.actorRef,
      sourceRef: input.sourceRef,
    },
    cause: input.payload.cause,
    subject: {
      before: input.payload.subject,
      after: {
        gitHead: input.payload.subject.gitHead,
        files: [
          input.payload.subject.files[0],
          { path: "db/schema.ts", sha256: "6".repeat(64) },
        ],
      },
      changedFromFailedSubject: ["db/schema.ts"],
    },
    execution: {
      provider: null,
      externalDisclosure: "none",
      modelBudgetTokens: 0,
      writePaths: ["db/schema.ts"],
    },
    verification: {
      verifierRef: "supervisor:agent-era-blog-content-contract-v2",
      verdict: "passed",
      candidate: {
        root: "/tmp/candidate",
        head: input.payload.subject.gitHead,
        changedPaths: ["app/blog/content.ts", "db/schema.ts"],
      },
      checks: [{
        id: "content-contract",
        command: "bun content-contract",
        exitCode: 0,
        outputDigest: "7".repeat(64),
        diagnostic: "",
      }],
    },
    authority: input.payload.authority,
  });
}

function correctionEvidence(
  inputEventId: string,
  report: LocalCorrectionReport,
) {
  const reportDigest = localCorrectionReportDigest(report);
  return {
    reportRef: localCorrectionReportRef(inputEventId, reportDigest),
    reportDigest,
    report,
    stale: false as const,
  };
}

function decisionFixture(
  proposal: MissionReconciliationActionProposal,
  proposalDigest: string,
): MissionReconciliationActionDecision {
  return {
    version: MISSION_RECONCILIATION_ACTION_DECISION_VERSION,
    decisionId: `decision:${proposal.proposalId}`,
    proposalId: proposal.proposalId,
    proposalDigest,
    missionId: proposal.missionId,
    missionSource: proposal.missionSource,
    choice: "SETTLE_CONTINUE",
    authorityRef: "principal:lidessen",
    sourceRef: "conversation:settle-continue",
    decidedAt: "2026-07-27T13:05:00.000Z",
  };
}

function withheldCorrectionAuthority() {
  return {
    commit: "withheld" as const,
    merge: "withheld" as const,
    publish: "withheld" as const,
    productAcceptance: "withheld" as const,
  };
}

class ActionDriver implements CellDriver {
  readonly descriptor;

  constructor(
    private readonly role: "proposal" | "verification",
    adapter = "codex-app-server.v1",
  ) {
    this.descriptor = {
      adapter,
      provider: "openai",
      model: "gpt-5",
    };
  }

  async run(_input: CellInput, context: DriverContext): Promise<DriverResult> {
    if (this.role === "proposal") {
      context.emit("terminal.tool.called", {
        name: "submit_continue",
        input: {
          inputEffect: "The correction changes candidate evidence, not the active Mission constraint.",
          responseObligations: [],
        },
      });
    } else {
      context.emit("terminal.tool.called", {
        name: "verify_continue",
        input: {
          assessment: "The exact sources preserve the active anchor.",
          preservedConstraints: [
            "Build the Blog while preserving evidence and withheld integration authority.",
          ],
        },
      });
    }
    return {
      finalText: "Submitted one bounded decision.",
      terminalToolsCalled: [
        this.role === "proposal" ? "submit_continue" : "verify_continue",
      ],
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        cachedInputTokens: 0,
      },
      rawSteps: [],
    };
  }
}

function reconciliationEventFor(
  commit: MissionReconciliationCommit,
): TimelineEvent {
  return {
    version: "rosso.delegate-timeline-event.v1",
    eventId: "reconciliation-event-1",
    timelineId: commit.proposal.missionId,
    sequence: 0,
    at: "2026-07-27T13:07:00.000Z",
    type: "mission.input-reconciled",
    data: {
      proposalDigest: digest(commit.proposal),
      nextAnchorDigest: digest(commit.acceptance.nextAnchor),
      proposal: commit.proposal,
      acceptance: commit.acceptance,
    },
  };
}

async function retainTimelineEvent(
  home: string,
  event: TimelineEvent,
): Promise<void> {
  const timeline = new FileMissionTimeline(
    missionRunnerDirectory(home, event.timelineId),
  );
  const path = timeline.timelinePath(event.timelineId);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(event)}\n`, "utf8");
}
