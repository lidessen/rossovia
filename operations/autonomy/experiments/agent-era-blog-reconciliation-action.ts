import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import {
  CodexAppServerDriver,
  type CodexAppServerProcessAdapter,
} from "../../../packages/work-cell/src/codex-app-server-driver";
import {
  loadHome,
  workspaceFor,
} from "../../workbench/src/home";
import { digest, stableStringify } from "../src/canonical-json";
import { FileMissionTimeline } from "../src/delegate-timeline";
import {
  localCorrectionReportDigest,
  readLocalCorrectionReports,
} from "../src/local-correction";
import { projectMissionActivity } from "../src/mission-activity";
import {
  readMissionReconciliationActionDecision,
  readMissionReconciliationActionOutcome,
  readMissionReconciliationActionProposal,
  retainMissionReconciliationActionDecision,
  type MissionReconciliationActionDecision,
  type MissionReconciliationActionOutcome,
  type MissionReconciliationActionProposal,
} from "../src/mission-reconciliation-action";
import {
  executeMissionReconciliationAction,
  type MissionReconciliationActionCell,
  type MissionReconciliationActionCommitResult,
  type MissionReconciliationActionObservation,
} from "../src/mission-reconciliation-action-executor";
import type { MissionReconciliationCommit } from "../src/mission-reconciliation-commit";
import { missionRunnerDirectory } from "../src/mission-paths";
import {
  missionRunnerRequest,
  requestMissionRunner,
  type MissionRunnerRequest,
  type MissionRunnerResponse,
} from "../src/mission-runner";
import {
  AUTHORIZED_CODEX_AUTH_FILE,
  verifyAuthorizedCodexCarrier,
  type VerifiedCodexAppServerCarrier,
} from "./codex-app-server-carrier-policy";

export type AgentEraBlogReconciliationChoice =
  | "SETTLE_CONTINUE"
  | "RECLASSIFY_CORRECTION"
  | "HOLD";

export interface AgentEraBlogReconciliationActionOptions {
  readonly home: string;
  readonly missionId: string;
  readonly missionSourceRoot: string;
  readonly projectId: string;
  readonly proposalDigest: string;
  readonly choice: AgentEraBlogReconciliationChoice;
  readonly authorityRef: string;
  readonly sourceRef: string;
  readonly now?: () => string;
  readonly processAdapter?: CodexAppServerProcessAdapter;
}

export interface AgentEraBlogReconciliationActionDependencies {
  readonly runnerRequest?: (
    home: string,
    missionId: string,
    request: MissionRunnerRequest,
  ) => Promise<MissionRunnerResponse>;
  readonly git?: (root: string, ...args: string[]) => string;
  readonly carrier?: () => Promise<VerifiedCodexAppServerCarrier>;
}

/**
 * Translate one exact Principal reply into one retained decision, then execute
 * only that decision. HOLD and RECLASSIFY_CORRECTION never construct a Cell.
 */
export async function settleAgentEraBlogReconciliationAction(
  options: AgentEraBlogReconciliationActionOptions,
  dependencies: AgentEraBlogReconciliationActionDependencies = {},
): Promise<{
  readonly decision: {
    readonly digest: string;
    readonly decision: MissionReconciliationActionDecision;
  };
  readonly outcome: MissionReconciliationActionOutcome;
}> {
  const now = options.now ?? (() => new Date().toISOString());
  const retained = await requireCurrentProposal(
    options.home,
    options.missionId,
    options.proposalDigest,
  );
  const existingDecision = await readMissionReconciliationActionDecision(
    options.home,
    options.missionId,
    retained.digest,
  );
  const existingOutcome = await readMissionReconciliationActionOutcome(
    options.home,
    options.missionId,
    retained.digest,
  );
  if (existingOutcome !== undefined) {
    const decision = await retainExactDecision(options, retained, now);
    return { decision, outcome: existingOutcome };
  }
  const runnerRequest = dependencies.runnerRequest ?? requestMissionRunner;
  const git = dependencies.git ?? gitCommand;
  const verifyCarrier = dependencies.carrier ?? verifyAuthorizedCodexCarrier;
  let codexCarrier: VerifiedCodexAppServerCarrier | undefined;
  if (options.choice === "SETTLE_CONTINUE") {
    codexCarrier = await verifyCarrier();
    assertCarrier(retained.proposal, codexCarrier);
  }
  if (
    existingDecision === undefined
    && options.choice === "SETTLE_CONTINUE"
  ) {
    await observeAgentEraBlogReconciliationAction(
      options,
      retained.proposal,
      { runnerRequest, git },
    );
  }
  const decision = await retainExactDecision(options, retained, now);
  const outcome = await executeMissionReconciliationAction({
    home: options.home,
    missionId: options.missionId,
    proposalDigest: retained.digest,
    observeCurrent: async () => await observeAgentEraBlogReconciliationAction(
      options,
      retained.proposal,
      { runnerRequest, git },
    ),
    createCell: async (role) => {
      if (codexCarrier === undefined) {
        throw new Error("non-settlement decisions cannot construct a Cell");
      }
      const currentCarrier = await verifyCarrier();
      assertCarrier(retained.proposal, currentCarrier);
      return await createCodexReconciliationCell(
        retained.proposal,
        currentCarrier.canonicalExecutable,
        options.processAdapter,
        role,
      );
    },
    commit: async (commit, target) => await commitExactReconciliation(
      options.home,
      options.missionId,
      commit,
      target,
      runnerRequest,
    ),
    now,
  });
  return { decision, outcome };
}

export async function observeAgentEraBlogReconciliationAction(
  options: Pick<
    AgentEraBlogReconciliationActionOptions,
    "home" | "missionId" | "missionSourceRoot" | "projectId"
  >,
  proposal: MissionReconciliationActionProposal,
  dependencies: {
    readonly runnerRequest: NonNullable<
      AgentEraBlogReconciliationActionDependencies["runnerRequest"]
    >;
    readonly git: NonNullable<
      AgentEraBlogReconciliationActionDependencies["git"]
    >;
  },
): Promise<MissionReconciliationActionObservation> {
  const missionSource = await verifyCommittedMissionSource(
    options,
    proposal,
    dependencies.git,
  );
  const runner = requireSuccess(await dependencies.runnerRequest(
    options.home,
    options.missionId,
    missionRunnerRequest({ kind: "status" }),
  )).status;
  if (
    runner.state !== "input-pending"
    || runner.runtimeMode !== "none"
  ) {
    throw new Error(
      `reconciliation target is ${runner.state}/${runner.runtimeMode ?? "unknown"}, not input-pending/none`,
    );
  }
  const target = {
    runnerId: runner.runnerId,
    pid: runner.pid,
    startedAt: runner.startedAt,
    socketPath: runner.socketPath,
    state: runner.state,
    live: true as const,
    runtimeMode: runner.runtimeMode,
    inputWatermark: runner.inputWatermark,
    reconciledWatermark: runner.reconciledWatermark,
  };

  const runnerRoot = missionRunnerDirectory(options.home, options.missionId);
  const timeline = new FileMissionTimeline(runnerRoot);
  const anchor = await timeline.latestReconciledAnchor(options.missionId);
  if (anchor === undefined) {
    throw new Error("Mission has no current authorized intent anchor");
  }
  const inputs = await timeline.readInputsAfter(
    options.missionId,
    anchor.reconciledWatermark,
  );
  if (inputs.length !== 1) {
    throw new Error(
      `expected one next unreconciled input, observed ${inputs.length}`,
    );
  }
  const input = inputs[0]!;
  const activity = await projectMissionActivity(options.home, options.missionId);
  const correction = activity.currentCorrection;
  if (
    correction === null
    || correction.inputId !== input.inputId
    || correction.inputEventId !== input.eventId
    || correction.state !== "verification-passed"
    || correction.stale
    || correction.verification.verdict !== "passed"
    || correction.verification.reportRef === null
    || correction.verification.reportDigest === null
  ) {
    throw new Error("current correction is not a current exact passed report");
  }
  const reports = await readLocalCorrectionReports(runnerRoot, input.eventId);
  if (reports.length !== 1) {
    throw new Error(
      `expected one retained correction report, observed ${reports.length}`,
    );
  }
  const retainedReport = reports[0]!;
  if (
    retainedReport.ref !== correction.verification.reportRef
    || retainedReport.digest !== correction.verification.reportDigest
    || retainedReport.digest
      !== localCorrectionReportDigest(retainedReport.report)
  ) {
    throw new Error("retained correction report failed exact digest binding");
  }
  return {
    missionSource,
    target,
    anchor,
    input,
    correctionEvidence: {
      reportRef: retainedReport.ref,
      reportDigest: retainedReport.digest,
      report: retainedReport.report,
      stale: false,
    },
  };
}

async function retainExactDecision(
  options: AgentEraBlogReconciliationActionOptions,
  retained: {
    readonly proposal: MissionReconciliationActionProposal;
    readonly digest: string;
  },
  now: () => string,
): Promise<{
  readonly decision: MissionReconciliationActionDecision;
  readonly digest: string;
}> {
  const existing = await readMissionReconciliationActionDecision(
    options.home,
    options.missionId,
    retained.digest,
  );
  if (existing !== undefined) {
    const expected = {
      choice: options.choice,
      authorityRef: options.authorityRef,
      sourceRef: options.sourceRef,
    };
    const actual = {
      choice: existing.decision.choice,
      authorityRef: existing.decision.authorityRef,
      sourceRef: existing.decision.sourceRef,
    };
    if (stableStringify(actual) !== stableStringify(expected)) {
      throw new Error(
        "current reconciliation proposal already has a different retained decision",
      );
    }
    return existing;
  }
  return await retainMissionReconciliationActionDecision(options.home, {
    version: "rosso.mission-reconciliation-action-decision.v1",
    decisionId: `decision:${retained.proposal.proposalId}:${options.choice}`,
    proposalId: retained.proposal.proposalId,
    proposalDigest: retained.digest,
    missionId: options.missionId,
    missionSource: retained.proposal.missionSource,
    choice: options.choice,
    authorityRef: options.authorityRef,
    sourceRef: options.sourceRef,
    decidedAt: now(),
  });
}

async function createCodexReconciliationCell(
  proposal: MissionReconciliationActionProposal,
  executable: string,
  processAdapter: CodexAppServerProcessAdapter | undefined,
  role: "proposal" | "verification",
): Promise<MissionReconciliationActionCell> {
  if (!isAbsolute(executable)) {
    throw new Error("Codex executable must be an explicit absolute path");
  }
  const workspaceRoot = await realpath(await mkdtemp(join(
    tmpdir(),
    `rosso-reconciliation-${role}-`,
  )));
  const driver = new CodexAppServerDriver({
    executable,
    authFile: AUTHORIZED_CODEX_AUTH_FILE,
    model: proposal.execution.profile.model,
    workspacePolicy: {
      select: async () => workspaceRoot,
    },
    timeoutMs: proposal.execution.maxDurationMsPerCell,
    ...(processAdapter === undefined ? {} : { processAdapter }),
  });
  return {
    workspaceRoot,
    driver,
    isolation: "fresh-disposable-no-environment",
    dispose: async () => {
      await rm(workspaceRoot, { recursive: true, force: true });
    },
  };
}

async function commitExactReconciliation(
  home: string,
  missionId: string,
  commit: MissionReconciliationCommit,
  target: {
    readonly expectedRunnerId: string;
    readonly expectedState: "input-pending";
  },
  runnerRequest: NonNullable<
    AgentEraBlogReconciliationActionDependencies["runnerRequest"]
  >,
): Promise<MissionReconciliationActionCommitResult> {
  const response = requireSuccess(await runnerRequest(
    home,
    missionId,
    missionRunnerRequest({
      kind: "reconciliation-commit",
      commit,
      ...target,
    }),
  ));
  const timeline = new FileMissionTimeline(
    missionRunnerDirectory(home, missionId),
  );
  const matches = (await timeline.readEvents(missionId)).filter((event) =>
    event.type === "mission.input-reconciled"
    && event.data.proposalDigest === digest(commit.proposal)
    && stableStringify(event.data.proposal)
      === stableStringify(commit.proposal)
    && stableStringify(event.data.acceptance)
      === stableStringify(commit.acceptance)
  );
  if (matches.length !== 1) {
    throw new Error(
      `guarded commit returned but exact reconciliation event count is ${matches.length}`,
    );
  }
  return {
    reconciliationEvent: matches[0]!,
    reconciledWatermark: response.status.reconciledWatermark,
  };
}

async function verifyCommittedMissionSource(
  options: Pick<
    AgentEraBlogReconciliationActionOptions,
    "home" | "missionId" | "missionSourceRoot" | "projectId"
  >,
  proposal: MissionReconciliationActionProposal,
  git: (root: string, ...args: string[]) => string,
): Promise<MissionReconciliationActionProposal["missionSource"]> {
  const root = await realpath(resolve(options.missionSourceRoot));
  if (
    proposal.missionId !== options.missionId
    || proposal.missionSource.projectId !== options.projectId
  ) {
    throw new Error("reconciliation proposal belongs to another Mission source");
  }
  const primaryRoot = await registeredPrimaryWorkspace(
    options.home,
    options.projectId,
  );
  if (root !== primaryRoot) {
    throw new Error(
      "Mission source root is not the Workbench registered primary workspace",
    );
  }
  if (git(root, "rev-parse", "--show-toplevel") !== root) {
    throw new Error("Mission source root is not the selected Git worktree root");
  }
  const relativePath = proposal.missionSource.relativePath;
  if (isAbsolute(relativePath)) {
    throw new Error("Mission source path must be repository-relative");
  }
  const sourcePath = resolve(root, relativePath);
  const relativeSourcePath = relative(root, sourcePath);
  if (
    relativeSourcePath === ".."
    || relativeSourcePath.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)
    || isAbsolute(relativeSourcePath)
  ) {
    throw new Error("Mission source path escapes the selected repository");
  }
  const head = git(root, "rev-parse", "HEAD");
  if (head !== proposal.missionSource.gitHead) {
    throw new Error(
      `Mission source HEAD drifted from ${proposal.missionSource.gitHead} to ${head}`,
    );
  }
  if (git(root, "status", "--porcelain", "--", relativePath)) {
    throw new Error("Mission source has uncommitted changes");
  }
  const current = await readFile(sourcePath, "utf8");
  const committed = git(root, "show", `HEAD:${relativePath}`);
  if (current.trimEnd() !== committed.trimEnd()) {
    throw new Error("Mission source differs from its committed Git HEAD");
  }
  return proposal.missionSource;
}

async function registeredPrimaryWorkspace(
  home: string,
  projectId: string,
): Promise<string> {
  const workbench = loadHome(home);
  if (!workbench.projects.projects.some((project) => project.id === projectId)) {
    throw new Error("project is not registered in the selected Workbench home");
  }
  return await realpath(workspaceFor(workbench.workspaces, projectId).path);
}

function assertCarrier(
  proposal: MissionReconciliationActionProposal,
  carrier: VerifiedCodexAppServerCarrier,
): void {
  if (
    proposal.execution.adapter !== "codex-app-server.v1"
    || proposal.execution.carrier.toolPolicy
      !== "app-server-no-environment-structured-output-plan-only-v1"
  ) {
    throw new Error(
      "SETTLE_CONTINUE requires a proposal bound to the current Codex app-server carrier",
    );
  }
  if (
    stableStringify(proposal.execution.carrier)
      !== stableStringify(carrier)
  ) {
    throw new Error(
      "verified Codex carrier does not match the proposal-bound identity",
    );
  }
}

function gitCommand(root: string, ...args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${(result.stderr ?? "").trim()}`,
    );
  }
  return (result.stdout ?? "").trim();
}

async function requireCurrentProposal(
  home: string,
  missionId: string,
  expectedDigest: string,
): Promise<{
  readonly proposal: MissionReconciliationActionProposal;
  readonly digest: string;
}> {
  const retained = await readMissionReconciliationActionProposal(
    home,
    missionId,
  );
  if (retained === undefined || retained.digest !== expectedDigest) {
    throw new Error("expected reconciliation action proposal is not current");
  }
  return retained;
}

function requireSuccess(
  response: MissionRunnerResponse,
): Extract<MissionRunnerResponse, { readonly ok: true }> {
  if (!response.ok) throw new Error(response.error);
  return response;
}
