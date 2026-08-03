import { readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { FileMissionTimeline } from "../src/delegate-timeline";
import {
  localCorrectionReportDigest,
  readLocalCorrectionReports,
} from "../src/local-correction";
import { projectMissionActivity } from "../src/mission-activity";
import {
  MissionReconciliationActionProposalSchema,
  retainMissionReconciliationActionProposal,
} from "../src/mission-reconciliation-action";
import { missionRunnerDirectory } from "../src/mission-paths";
import {
  missionRunnerRequest,
  requestMissionRunner,
  type MissionRunnerResponse,
} from "../src/mission-runner";
import { digestAnchor } from "../src/mission-reconciliation";
import { verifyAuthorizedCodexCarrier } from "./codex-app-server-carrier-policy";

const arguments_ = parseArguments(process.argv.slice(2));
const codexCarrier = await verifyAuthorizedCodexCarrier();
const missionRelativePath =
  `operations/missions/${arguments_.missionId}.json`;
const missionSourcePath = join(
  arguments_.missionSourceRoot,
  missionRelativePath,
);
const missionSource = await readFile(missionSourcePath, "utf8");
const gitHead = git(arguments_.missionSourceRoot, "rev-parse", "HEAD");
const committedMissionSource = git(
  arguments_.missionSourceRoot,
  "show",
  `HEAD:${missionRelativePath}`,
);
if (missionSource.trimEnd() !== committedMissionSource.trimEnd()) {
  throw new Error("Mission source differs from its committed Git HEAD");
}
if (
  git(arguments_.missionSourceRoot, "status", "--porcelain", "--", missionRelativePath)
) {
  throw new Error("Mission source has uncommitted changes");
}

const live = requireSuccess(await requestMissionRunner(
  arguments_.home,
  arguments_.missionId,
  missionRunnerRequest({ kind: "status" }),
));
const status = live.status;
if (
  status.runnerId !== arguments_.expectedRunnerId
  || status.state !== "input-pending"
  || status.runtimeMode !== "none"
  || status.inputWatermark !== 1
  || status.reconciledWatermark !== 0
) {
  throw new Error(
    `reconciliation target drifted: observed ${status.runnerId}/${status.state}/${status.runtimeMode ?? "unknown"}/${status.inputWatermark}/${status.reconciledWatermark}`,
  );
}

const runnerRoot = missionRunnerDirectory(
  arguments_.home,
  arguments_.missionId,
);
const timeline = new FileMissionTimeline(runnerRoot);
const anchor = await timeline.latestReconciledAnchor(arguments_.missionId);
if (anchor === undefined || anchor.reconciledWatermark !== 0) {
  throw new Error("Mission has no exact watermark-zero active anchor");
}
const pendingInputs = await timeline.readInputsAfter(
  arguments_.missionId,
  anchor.reconciledWatermark,
);
if (pendingInputs.length !== 1) {
  throw new Error(`expected one unreconciled input, observed ${pendingInputs.length}`);
}
const input = pendingInputs[0]!;
if (input.payload.kind !== "correction") {
  throw new Error("next unreconciled Mission input is not a correction");
}

const activity = await projectMissionActivity(
  arguments_.home,
  arguments_.missionId,
);
const correction = activity.currentCorrection;
if (
  correction === null
  || correction.inputId !== input.inputId
  || correction.inputEventId !== input.eventId
  || correction.state !== "verification-passed"
  || correction.verification.verdict !== "passed"
  || correction.verification.reportRef === null
  || correction.verification.reportDigest === null
  || correction.stale
) {
  throw new Error("current correction is not a current, passed, exact report");
}
const reports = await readLocalCorrectionReports(runnerRoot, input.eventId);
if (reports.length !== 1) {
  throw new Error(`expected one correction report, observed ${reports.length}`);
}
const retainedReport = reports[0]!;
if (
  retainedReport.ref !== correction.verification.reportRef
  || retainedReport.digest !== correction.verification.reportDigest
  || retainedReport.digest !== localCorrectionReportDigest(retainedReport.report)
) {
  throw new Error("current correction report ref or digest drifted");
}

const nextAnchor = {
  id: anchor.id,
  revision: `${anchor.revision}+wm${input.watermark}`,
  statement: anchor.statement,
  sourceRefs: [...new Set([
    ...anchor.sourceRefs,
    input.sourceRef,
    retainedReport.ref,
    `sha256:${retainedReport.digest}`,
  ])],
  reconciledWatermark: input.watermark,
};
const proposal = MissionReconciliationActionProposalSchema.parse({
  version: "rosso.mission-reconciliation-action-proposal.v1",
  proposalId: `${arguments_.missionId}-reconciliation-wm${input.watermark}-v1`,
  missionId: arguments_.missionId,
  preparedAt: new Date().toISOString(),
  preparedBy: "supervisor:Codex",
  missionSource: {
    projectId: arguments_.projectId,
    relativePath: relative(arguments_.missionSourceRoot, missionSourcePath),
    gitHead,
  },
  target: {
    runnerId: status.runnerId,
    pid: status.pid,
    startedAt: status.startedAt,
    socketPath: status.socketPath,
    state: status.state,
    live: true,
    runtimeMode: status.runtimeMode,
    inputWatermark: status.inputWatermark,
    reconciledWatermark: status.reconciledWatermark,
  },
  lineage: {
    anchor,
    anchorDigest: digestAnchor(anchor),
  },
  input,
  correctionEvidence: {
    reportRef: retainedReport.ref,
    reportDigest: retainedReport.digest,
    report: retainedReport.report,
    stale: false,
  },
  execution: {
    adapter: "codex-app-server.v1",
    carrier: codexCarrier,
    profile: {
      id: `codex-app-server-${arguments_.model}-reconciliation-v2`,
      version: "execution-profile.v1",
      provider: "openai",
      model: arguments_.model,
      contextPolicy:
        "exact active anchor and watermark-1 structured correction; proposer must enumerate every decision-relevant input field, and verifier additionally receives the bounded proposal",
      toolSurface:
        "one schema-constrained terminal decision per fresh no-environment Codex app-server process; only the non-I/O plan tool remains built in",
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
    nextAnchor,
    otherwise: "return-to-principal-without-commit",
  },
  decision: {
    recommendation: "SETTLE_CONTINUE",
    replyKey: "SETTLE_CONTINUE|RECLASSIFY_CORRECTION|HOLD",
    options: {
      SETTLE_CONTINUE: {
        immediateResult:
          "Authorize two fresh no-environment Codex app-server Work Cells and commit watermark 1 only if both independently select the continue transition.",
        tradeoff:
          "The exact anchor, correction input, and bounded proposal are disclosed to OpenAI; any correction, ambiguity, rejection, timeout, or drift returns to the Principal without a reconciliation commit.",
      },
      RECLASSIFY_CORRECTION: {
        immediateResult:
          "Run no model and commit no reconciliation; reopen the input as a proposed change to the Mission invariant.",
        tradeoff:
          "A new anchor statement and a new Decision Brief are required before semantic work can resume.",
      },
      HOLD: {
        immediateResult:
          "Run no model, disclose no data, and keep watermark 1 unreconciled.",
        tradeoff:
          "The Mission remains input-pending and the next Blog product slice cannot start.",
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
const retained = await retainMissionReconciliationActionProposal(
  arguments_.home,
  proposal,
  arguments_.expectedProposalDigest === undefined
    ? undefined
    : { expectedCurrentDigest: arguments_.expectedProposalDigest },
);
process.stdout.write(`${JSON.stringify({
  proposalId: retained.proposal.proposalId,
  proposalDigest: retained.digest,
  missionId: retained.proposal.missionId,
  runnerId: retained.proposal.target.runnerId,
  replyKey: retained.proposal.decision.replyKey,
})}\n`);

interface Arguments {
  readonly home: string;
  readonly missionId: string;
  readonly missionSourceRoot: string;
  readonly projectId: string;
  readonly expectedRunnerId: string;
  readonly expectedProposalDigest?: string;
  readonly model: string;
}

function parseArguments(values: readonly string[]): Arguments {
  const parsed = new Map<string, string>();
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (
      key === undefined
      || value === undefined
      || !key.startsWith("--")
    ) {
      throw new Error("prepare reconciliation action requires flag/value pairs");
    }
    parsed.set(key, value);
  }
  const required = (key: string): string => {
    const value = parsed.get(key);
    if (!value) throw new Error(`${key} is required`);
    return value;
  };
  return {
    home: resolve(required("--home")),
    missionId: required("--mission"),
    missionSourceRoot: resolve(required("--mission-source-root")),
    projectId: required("--project-id"),
    expectedRunnerId: required("--expected-runner"),
    ...(parsed.has("--expected-proposal-digest")
      ? {
        expectedProposalDigest: required("--expected-proposal-digest"),
      }
      : {}),
    model: parsed.get("--model") ?? "gpt-5.6-sol",
  };
}

function git(cwd: string, ...args: string[]): string {
  const result = Bun.spawnSync(["git", ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.toString());
  }
  return result.stdout.toString().trimEnd();
}

function requireSuccess(
  response: MissionRunnerResponse,
): Extract<MissionRunnerResponse, { ok: true }> {
  if (!response.ok) throw new Error(response.error);
  return response;
}
