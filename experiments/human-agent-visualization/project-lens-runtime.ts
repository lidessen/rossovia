import { createHash, randomUUID } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CellInput } from "../../packages/work-cell/src/contracts";
import {
  AiSdkValidationDriver,
  createValidationModel,
} from "../../packages/work-cell/src/integrations/ai-sdk";
import { executionAuthorizationClaimPath } from "../../operations/workbench/src/execution-authorization-claim";
import {
  MissionExecutionProposalSchema,
  type MissionExecutionProposal,
} from "../../operations/workbench/src/mission-execution-proposal";
import {
  WORKBENCH_TASK_EXECUTION_CONTEXT_ENV,
  WorkbenchTaskExecutionContextSchema,
  workbenchTaskCorrectionGuidanceRefs,
  workbenchTaskExecutionContextDigest,
  workbenchTaskExecutionContextRef,
  sameWorkbenchTaskExecutionContextRef,
  type WorkbenchTaskExecutionContext,
} from "../../operations/workbench/src/task-execution-context";
import {
  DelegateLoopSession,
  type DelegateCall,
  type DelegateLoopRun,
} from "../../operations/autonomy/src/delegate-loop";
import type { FileMissionTimeline } from "../../operations/autonomy/src/delegate-timeline";
import { FileEffectJournal } from "../../operations/autonomy/src/effect-journal";
import { stableStringify } from "../../operations/autonomy/src/canonical-json";
import type { MissionExecutionController } from "../../operations/autonomy/src/mission-execution-host";
import { missionRunnerDirectory } from "../../operations/autonomy/src/mission-runner";
import type {
  MissionRuntimeFactory,
  MissionRuntimeRecoveryCapabilities,
  PreparedMissionExecution,
} from "../../operations/autonomy/src/mission-runtime";
import { digestAnchor } from "../../operations/autonomy/src/mission-reconciliation";
import {
  MissionSupervisorSession,
  type MissionSupervisorTransition,
} from "../../operations/autonomy/src/mission-supervisor";
import {
  MISSION_TURN_VERSION,
  type MissionTurnStart,
} from "../../operations/autonomy/src/mission-turn";
import {
  claimProjectExecutionAuthorization,
  type ProjectExecutionAuthorizationContract,
  validateProjectExecutionAuthorization,
} from "../../operations/autonomy/experiments/project-execution-authorization";
import { validateProjectBundle } from "./lib/project-evidence-bundle.js";
import {
  PROJECT_LENS_MATERIALIZER_REF,
  PROJECT_LENS_OUTPUT_PATH,
  verifyProjectLensEffect,
} from "./project-lens-effect-verifier";
import { buildProjectLensBundle } from "./scripts/project-lens-builder.js";

const WORKTREE_ENV = "ROSSO_PROJECT_LENS_EFFECT_ROOT";
const AUTHORIZATION_RECEIPT_ENV = "ROSSO_PROJECT_LENS_AUTHORIZATION_RECEIPT";
const MISSION_ID = "project-lens-dogfood";
const MISSION_SOURCE = "operations/missions/project-lens-dogfood.json";
const RUNTIME_REF = PROJECT_LENS_MATERIALIZER_REF;
const RUNTIME_SOURCE_PATH = fileURLToPath(import.meta.url);
const OBLIGATION = "select-and-materialize-one-project-lens-arrival-path";

export const PROJECT_LENS_EXECUTION_IDENTITY = {
  proposalId: "project-lens-dogfood-v6",
  wholeRevision: "project-lens-dogfood-v6",
  referenceProfile: {
    id: "project-lens-focus-selector-v1",
    revision: "2026-08-12-project-lens-dogfood-v6",
  },
} as const;

// The builder recursively traverses every file below these repository roots.
// This list is local authorization, not the provider workspace below.
export const PROJECT_LENS_LOCAL_READ_PATHS = [
  ".agent",
  ".agents",
  ".claude",
  ".codex",
  ".cursor",
  ".gitattributes",
  ".github",
  ".gitignore",
  "AGENTS.md",
  "CHANGELOG.md",
  "CLAUDE.md",
  "LICENSE",
  "README.md",
  "README.zh-CN.md",
  "archive",
  "chronicle",
  "design",
  "evaluations",
  "experiments",
  "operations",
  "packages",
  "principles",
  "scripts",
  "site",
  "skills",
  "vercel.json",
] as const;

// These are the builder's fixed top-level exclusions plus the matching nested
// directories present in this repository and the output directory it creates.
export const PROJECT_LENS_LOCAL_EXCLUDE_PATHS = [
  ".git",
  ".work-cell",
  ".reasonix",
  "node_modules",
  "dist",
  "build",
  "target",
  "coverage",
  "generated",
  "outputs",
  ".next",
  "experiments/agent-era-blog/build",
  "experiments/human-agent-visualization/generated",
  "evaluations/evidence/2026-08-04-prompt-composition-round2/baseline/scoring/outputs",
] as const;

// Only these contents may enter the external provider. focusSources selected
// from this set order the explanation; they do not authorize the local scan.
export const PROJECT_LENS_PROVIDER_READ_PATHS = [
  "AGENTS.md",
  "README.md",
  "principles/SEQUENCE.md",
  "skills/visualization/SKILL.md",
  "experiments/human-agent-visualization/PRD.md",
  "experiments/human-agent-visualization/DESIGN.md",
  "experiments/human-agent-visualization/README.md",
  "experiments/human-agent-visualization/scripts/project-lens-builder.js",
  "experiments/human-agent-visualization/tests/project-lens.test.js",
  "operations/workbench/AGENTS.md",
  "operations/workbench/README.md",
  MISSION_SOURCE,
] as const;

const QUESTION =
  "How does this repository separate Project Lens source evidence, deterministic projection, and Agent-selected explanation order, and where should a contributor inspect first?";
const AUDIENCE = "Principal evaluating Project Lens as Rossovia dogfood";

const EXPECTED_SCOPE = {
  readPaths: [...PROJECT_LENS_LOCAL_READ_PATHS],
  excludePaths: [...PROJECT_LENS_LOCAL_EXCLUDE_PATHS],
  writePaths: [PROJECT_LENS_OUTPUT_PATH],
  commands: [],
} as const satisfies Extract<
  MissionExecutionProposal,
  { version: "mission-execution-proposal.v2" }
>["scope"];

const EXPECTED_BUDGET = {
  parent: { maxModelSteps: 3, maxOutputTokensPerStep: 2_000 },
  delegatedCell: {
    maxSteps: 8,
    maxOutputTokensPerStep: 8_000,
    maxDurationMs: 180_000,
  },
  estimatedTokens: 24_000,
  estimatedTokensSemantics: "forecast-only-not-stop-condition",
} as const;

const EXTERNAL_PROVIDER = { name: "DeepSeek", boundary: "external" } as const;
const EXTERNAL_DISCLOSURE = {
  dataCategories: [
    "Server-formed Workbench task objective, acceptance conditions, and retained Principal correction statements",
    `Contents of only these repository paths: ${PROJECT_LENS_PROVIDER_READ_PATHS.join(", ")}`,
    "Project Lens focus-selection instructions, question, audience, and local artifact acceptance criteria",
    "No other repository files, Git metadata, secrets, environment values, authorization receipts, Mission timeline, or generated bundle",
  ],
} as const;

const SOURCE_REFS = [
  "file:AGENTS.md",
  "file:skills/visualization/SKILL.md",
  "file:experiments/human-agent-visualization/PRD.md",
  "file:experiments/human-agent-visualization/DESIGN.md#project-lens",
  `file:${MISSION_SOURCE}`,
] as const;

const route = [{
  provider: "deepseek" as const,
  credential: { source: "env" as const, name: "DEEPSEEK_API_KEY" },
  model: "deepseek-v4-flash",
}];

export interface ProjectLensFocusSelection {
  readonly status: "completed";
  readonly focusSources: ReadonlyArray<
    typeof PROJECT_LENS_PROVIDER_READ_PATHS[number]
  >;
  readonly rationale: string;
  readonly remainingUncertainty: string;
}

export const missionRuntimeRecoveryCapabilities = {
  resume: false,
  replace: false,
} as const satisfies MissionRuntimeRecoveryCapabilities;

export function currentProjectLensRuntimeDigest(): string {
  return createHash("sha256")
    .update(readFileSync(RUNTIME_SOURCE_PATH))
    .digest("hex");
}

export function projectLensAuthorizationContract(
  projectId: string,
): ProjectExecutionAuthorizationContract {
  return {
    projectId: requiredNonempty(projectId, "registered Project Lens project ID"),
    missionId: MISSION_ID,
    proposalId: PROJECT_LENS_EXECUTION_IDENTITY.proposalId,
    missionSource: MISSION_SOURCE,
    runtimeRef: RUNTIME_REF,
    runtimeDigest: currentProjectLensRuntimeDigest(),
    proposalVersion: "mission-execution-proposal.v2",
    externalProvider: { ...EXTERNAL_PROVIDER },
    externalDisclosure: {
      dataCategories: [...EXTERNAL_DISCLOSURE.dataCategories],
    },
    candidateRootRef: `environment:${WORKTREE_ENV}`,
    scope: {
      readPaths: [...EXPECTED_SCOPE.readPaths],
      excludePaths: [...EXPECTED_SCOPE.excludePaths],
      writePaths: [...EXPECTED_SCOPE.writePaths],
      commands: [],
    },
    budget: {
      parent: { ...EXPECTED_BUDGET.parent },
      delegatedCell: { ...EXPECTED_BUDGET.delegatedCell },
      estimatedTokens: EXPECTED_BUDGET.estimatedTokens,
      estimatedTokensSemantics: EXPECTED_BUDGET.estimatedTokensSemantics,
    },
    requiredChoices: [{
      decisionId: "external-disclosure",
      replyKey: "ALLOW",
    }],
  };
}

export function projectLensExecutionProposal(): Extract<
  MissionExecutionProposal,
  { version: "mission-execution-proposal.v2" }
> {
  const contract = projectLensAuthorizationContract("proposal-unbound");
  return MissionExecutionProposalSchema.parse({
    version: contract.proposalVersion,
    proposalId: contract.proposalId,
    mode: "supervised",
    status: "awaiting-principal-authorization",
    runtimeRef: contract.runtimeRef,
    runtimeDigest: contract.runtimeDigest,
    externalProvider: contract.externalProvider,
    externalDisclosure: contract.externalDisclosure,
    candidateWorktree: {
      rootRef: contract.candidateRootRef,
      binding: "operator-selected-at-launch",
    },
    scope: contract.scope,
    budget: contract.budget,
    authority: {
      externalDisclosure: "withheld",
      budgetRelease: "withheld",
      write: "withheld",
      execute: "withheld",
      commit: "withheld",
      merge: "withheld",
      publish: "withheld",
    },
    pendingDecisions: [{
      id: "external-disclosure",
      label: "Authorize one declared DeepSeek Project Lens disclosure",
      proposal: "ALLOW",
      status: "pending",
      options: [{
        replyKey: "ALLOW",
        label: "Run one candidate",
        immediateResult:
          "Disclose only the declared provider-input paths and task context, release the declared budget, and write one generated bundle in the isolated candidate.",
        tradeoff:
          "The declared task and repository excerpts leave the local boundary and may incur model cost; the output remains an unaccepted local projection.",
      }, {
        replyKey: "HOLD",
        label: "Keep blocked",
        immediateResult:
          "Do not disclose repository content, release budget or write authority, start the runtime, or generate a candidate bundle.",
        tradeoff: "No live Project Lens dogfood evidence is produced.",
      }],
      compactReplyKey: "ALLOW",
    }],
  }) as Extract<
    MissionExecutionProposal,
    { version: "mission-execution-proposal.v2" }
  >;
}

export function projectLensProviderWorkspace(worktree: string) {
  return {
    root: worktree,
    readPaths: [...PROJECT_LENS_PROVIDER_READ_PATHS],
    writePaths: [],
    excludePaths: [...PROJECT_LENS_LOCAL_EXCLUDE_PATHS],
    allowedCommands: [],
  };
}

export function projectLensCall(
  taskContext: WorkbenchTaskExecutionContext,
): DelegateCall {
  const checked = WorkbenchTaskExecutionContextSchema.parse(taskContext);
  const corrections = checked.corrections.length === 0
    ? ["No retained Principal correction accompanies this task revision."]
    : checked.corrections.map(
      (correction, index) =>
        `Retained Principal correction ${index + 1} (${correction.id}): ${correction.statement}`,
    );
  return {
    key: "project-lens-focus-selection",
    taskId: "task-1",
    task: [
      "Select the smallest truthful source arrival order for one current-state Project Lens introduction.",
      `Question: ${QUESTION}`,
      `Audience: ${AUDIENCE}.`,
      "Read only the exact provider workspace. Return focusSources as explanation order, never as a claim about local read authorization.",
      `Workbench task objective: ${checked.objective}`,
      ...corrections,
    ].join(" "),
    sourceRefs: unique([
      ...SOURCE_REFS,
      ...checked.corrections.map((correction) => correction.sourceRef),
      `workbench-task:${checked.taskId}@${checked.taskRevision}`,
      `workbench-task-context:sha256:${workbenchTaskExecutionContextDigest(checked)}`,
    ]),
    obligationRefs: [OBLIGATION],
    acceptance: [
      "focusSources contains only unique paths from the exact provider workspace and orders a useful source-first arrival path.",
      "The rationale distinguishes repository sources, deterministic Project Lens projection, and Agent-selected explanation.",
      "No output claims acceptance, integration, publication, or authority beyond one local candidate.",
      ...checked.acceptance,
    ],
    capabilityNeed: "read",
  };
}

export function projectLensCell(
  worktree: string,
  call: DelegateCall,
): CellInput {
  return {
    id: call.key,
    intent: call.task,
    workspace: projectLensProviderWorkspace(worktree),
    instructions: [
      "Use the visualization Skill contract: preserve source, deterministic projection, and explanation as separate layers.",
      "Read only the exact workspace paths. Missing paths are unavailable evidence, not permission to widen scope.",
      "Choose focusSources only to order the explanation. The host-owned builder separately performs its complete locally authorized traversal.",
      "Do not write files, run commands, inspect Git metadata, read environment values, or claim product acceptance.",
    ],
    capabilities: ["read"],
    context: [],
    capabilitiesRequired: [call.capabilityNeed],
    acceptance: [...call.acceptance],
    budget: {
      maxSteps: EXPECTED_BUDGET.delegatedCell.maxSteps,
      estimatedTokens: EXPECTED_BUDGET.estimatedTokens,
      estimatedTokensTolerance: 1,
      maxDurationMs: EXPECTED_BUDGET.delegatedCell.maxDurationMs,
      maxCommandOutputBytes: 8_000,
    },
    executionProfile: {
      id: PROJECT_LENS_EXECUTION_IDENTITY.referenceProfile.id,
      version: "execution-profile.v1",
      provider: "deepseek",
      model: "deepseek-v4-flash",
      contextPolicy: "exact Project Lens provider read paths; no local traversal beyond them",
      toolSurface: "list_files and read_file; no writes or commands",
      parallelism: "serial",
    },
    outputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["completed"] },
        focusSources: {
          type: "array",
          items: { type: "string", enum: [...PROJECT_LENS_PROVIDER_READ_PATHS] },
          minItems: 1,
          maxItems: PROJECT_LENS_PROVIDER_READ_PATHS.length,
          uniqueItems: true,
        },
        rationale: { type: "string", minLength: 1 },
        remainingUncertainty: { type: "string", minLength: 1 },
      },
      required: ["status", "focusSources", "rationale", "remainingUncertainty"],
      additionalProperties: false,
    },
  };
}

export async function materializeProjectLensCandidate(
  worktree: string,
  focusSources: readonly string[],
): Promise<{
  readonly outputPath: string;
  readonly bindingDigest: string;
  readonly subjectRevision: string;
}> {
  const selection = parseFocusSources(focusSources);
  const outputPath = resolve(worktree, PROJECT_LENS_OUTPUT_PATH);
  const buildBundle = buildProjectLensBundle as unknown as (input: {
    readonly repo: string;
    readonly intent: "understand";
    readonly audience: string;
    readonly question: string;
    readonly focusSources: readonly string[];
  }) => Promise<{
    readonly bindingDigest: string;
    readonly subject: { readonly revision: string };
    readonly [key: string]: unknown;
  }>;
  const bundle = await buildBundle({
    repo: worktree,
    intent: "understand",
    audience: AUDIENCE,
    question: QUESTION,
    focusSources: selection,
  });
  const validation = await validateProjectBundle(bundle);
  if (!validation.valid) {
    throw new Error(
      `Project Lens builder returned an invalid bundle: ${validation.errors
        .map((error: { message: string }) => error.message)
        .join(" ")}`,
    );
  }
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  return {
    outputPath,
    bindingDigest: bundle.bindingDigest,
    subjectRevision: bundle.subject.revision,
  };
}

export const createMissionRuntime: MissionRuntimeFactory = async (
  context,
): Promise<PreparedMissionExecution> => {
  if (context.recovery !== undefined) {
    throw new Error("the Project Lens dogfood runtime does not support recovery or replacement");
  }
  const worktree = requiredAbsolutePath(
    WORKTREE_ENV,
    "operator-selected detached Project Lens worktree",
  );
  const receiptPath = requiredAbsolutePath(
    AUTHORIZATION_RECEIPT_ENV,
    "local Principal authorization receipt",
  );
  const taskContext = requiredTaskExecutionContext();
  const authorizationValidation = validateProjectExecutionAuthorization({
    home: context.root,
    missionId: context.missionId,
    worktree,
    receiptPath,
    contract: projectLensAuthorizationContract(taskContext.binding.projectId),
  });
  assertTaskExecutionContext(taskContext, {
    projectId: authorizationValidation.receipt.projectId,
    missionId: context.missionId,
    authorizationId: authorizationValidation.receipt.authorizationId,
    proposalDigest: authorizationValidation.receipt.proposalDigest,
  });
  const activeAnchor = await context.timeline.latestReconciledAnchor(
    context.missionId,
  );
  if (activeAnchor === undefined) {
    throw new Error(
      "the Project Lens dogfood runtime requires the fresh reconciled Mission anchor formed by trusted launch",
    );
  }
  const launchAuthorizationRef = {
    authorizationId: authorizationValidation.receipt.authorizationId,
    proposalDigest: authorizationValidation.receipt.proposalDigest,
    claimSourceRef: relative(
      context.root,
      executionAuthorizationClaimPath(
        context.root,
        authorizationValidation.receipt.authorizationId,
      ),
    ),
  };
  const turn: MissionTurnStart = {
    version: MISSION_TURN_VERSION,
    turnId: `project-lens-dogfood-${randomUUID()}`,
    baselineWatermark: activeAnchor.reconciledWatermark,
    anchorDigest: digestAnchor(activeAnchor),
    sourceRefs: unique([
      ...SOURCE_REFS,
      ...taskContext.corrections.map((correction) => correction.sourceRef),
      `workbench-task:${taskContext.taskId}@${taskContext.taskRevision}`,
      `workbench-task-context:sha256:${workbenchTaskExecutionContextDigest(taskContext)}`,
      `authorization:${authorizationValidation.receipt.authorizationId}`,
      `proposal:${authorizationValidation.receipt.proposalId}@${authorizationValidation.receipt.proposalDigest}`,
    ]),
    launchAuthorizationRef,
    workbenchTaskContext: workbenchTaskExecutionContextRef(taskContext),
    guidanceRefs: workbenchTaskCorrectionGuidanceRefs(taskContext),
  };

  const expectedCall = projectLensCall(taskContext);
  const delegateInput = prepareDelegateInput(
    context.root,
    context.missionId,
    turn.turnId,
    expectedCall,
  );
  const selection = createValidationModel({ route });
  const abort = new AbortController();
  const delegate = new DelegateLoopSession({
    id: turn.turnId,
    instructions: [
      "This is one already-authorized Project Lens focus-selection contribution.",
      "Submit exactly the host-owned delegate_file reference and do not reconsider scope or provider policy.",
      `Use exactly this input reference: ${JSON.stringify(delegateInput.reference)}.`,
      "After settlement, return without claiming that the generated projection is accepted or integrated.",
    ].join("\n"),
    messages: [{
      role: "user",
      content: "Select one truthful Project Lens source arrival order for the authorized dogfood candidate.",
    }],
    tasks: [{
      subject: "Select Project Lens source arrival order",
      description: expectedCall.task,
    }],
    whole: {
      revision: PROJECT_LENS_EXECUTION_IDENTITY.wholeRevision,
      sourceRefs: [...expectedCall.sourceRefs],
      obligations: [OBLIGATION],
      settledContributionKeys: [],
      guardRefs: [],
      capabilityNeeds: ["read"],
      reconstructionOwner: "user-agent:project-lens-dogfood-runtime",
      workspace: projectLensProviderWorkspace(worktree),
    },
  }, {
    model: selection.model,
    delegateInputRoot: delegateInput.root,
    initialDelegateTool: "delegate_file",
    prepareContribution: async (call) => {
      if (stableStringify(call) !== stableStringify(expectedCall)) {
        throw new Error("the Project Lens parent changed its host-authorized contribution");
      }
      return {
        dependsOn: [],
        taskShape: {
          referenceProfile: { ...PROJECT_LENS_EXECUTION_IDENTITY.referenceProfile },
          evidence: {
            status: "admitted" as const,
            revision: PROJECT_LENS_EXECUTION_IDENTITY.referenceProfile.revision,
            refs: ["evidence:project-lens-current-builder-and-direct-tests"],
          },
          disposition: "reliable-primitive" as const,
          principalInstability:
            "source-order selection is bounded, but the generated explanation remains an unaccepted projection",
          guardRefs: [],
          reconstructionOwner: "user-agent:project-lens-dogfood-runtime",
          overloadDisposition: "escalate" as const,
        },
        cell: projectLensCell(worktree, call),
      };
    },
    timeline: context.timeline,
    createDriver: () => new AiSdkValidationDriver({ route }),
    concurrency: 1,
    maxModelSteps: EXPECTED_BUDGET.parent.maxModelSteps,
    maxDelegateBatches: 1,
    maxCallsPerStep: 1,
    maxOutputTokens: EXPECTED_BUDGET.parent.maxOutputTokensPerStep,
    signal: abort.signal,
  });
  const supervisor = new MissionSupervisorSession(
    context.missionId,
    delegate,
    context.timeline,
    turn.baselineWatermark,
  );
  let materialization: Promise<void> | undefined;
  const materializeFinished = async (
    transition: MissionSupervisorTransition,
  ): Promise<MissionSupervisorTransition> => {
    if (transition.kind !== "finished") return transition;
    materialization ??= materializeFinishedRun(
      context.timeline,
      context.root,
      context.missionId,
      turn,
      taskContext,
      transition.run,
      worktree,
    );
    await materialization;
    return transition;
  };
  const controller: MissionExecutionController = {
    advance: async () => await materializeFinished(await supervisor.advance()),
    resume: async () => await materializeFinished(await supervisor.resume()),
    observeInput: (input) => supervisor.observeInput(input),
    cancel: (reason) => abort.abort(reason),
  };
  const authorization = claimProjectExecutionAuthorization(
    authorizationValidation,
    { binding: { workbenchTaskContext: workbenchTaskExecutionContextRef(taskContext) } },
  );
  if (
    relative(context.root, authorization.claimPath)
      !== launchAuthorizationRef.claimSourceRef
  ) {
    throw new Error("execution authorization claim source changed after launch preflight");
  }
  return { turn, controller };
};

export async function materializeFinishedRun(
  timeline: FileMissionTimeline,
  home: string,
  missionId: string,
  turn: MissionTurnStart,
  taskContext: WorkbenchTaskExecutionContext,
  run: DelegateLoopRun,
  worktree: string,
): Promise<void> {
  const batch = run.batches[0];
  const outcome = batch?.outcomes[0];
  if (
    run.batches.length !== 1
    || batch?.outcomes.length !== 1
    || outcome?.key !== "project-lens-focus-selection"
    || outcome.status !== "completed"
    || outcome.runId === undefined
  ) {
    throw new Error("Project Lens materialization requires one completed focus-selection Cell");
  }
  const projection = await timeline.readResult(turn.turnId, batch.id, outcome.key);
  if (projection.semantic === undefined || projection.receipt.projection !== "full") {
    throw new Error("Project Lens focus selection is unavailable from the settled Cell");
  }
  const selected = parseFocusSelection(projection.semantic.output);
  await recordProjectLensMaterializationEffect({
    home,
    missionId,
    turn,
    taskContext,
    effectId: batch.id,
    cellId: outcome.cellId,
    runId: outcome.runId,
    worktree,
    focusSources: selected.focusSources,
  });
  const verification = await verifyProjectLensEffect({
    home,
    missionId,
    effectId: batch.id,
  });
  if (verification.verdict === "unverifiable") {
    throw new Error(
      `Project Lens independent verification was unavailable: ${verification.reason ?? "unknown reason"}`,
    );
  }
}

async function recordProjectLensMaterializationEffect(input: {
  readonly home: string;
  readonly missionId: string;
  readonly turn: MissionTurnStart;
  readonly taskContext: WorkbenchTaskExecutionContext;
  readonly effectId: string;
  readonly cellId: string;
  readonly runId: string;
  readonly worktree: string;
  readonly focusSources: readonly string[];
}): Promise<void> {
  const {
    home,
    missionId,
    turn,
    taskContext,
    effectId,
    cellId,
    runId,
    worktree,
    focusSources,
  } = input;
  if (
    missionId !== MISSION_ID
    || turn.launchAuthorizationRef === undefined
    || turn.workbenchTaskContext === undefined
    || !sameWorkbenchTaskExecutionContextRef(
      turn.workbenchTaskContext,
      workbenchTaskExecutionContextRef(taskContext),
    )
  ) {
    throw new Error("Project Lens materialization lineage does not match its Mission turn");
  }
  const runnerRoot = missionRunnerDirectory(home, missionId);
  const journal = new FileEffectJournal(runnerRoot);
  const baseHead = gitText(worktree, ["rev-parse", "--verify", "HEAD"]);
  const baselineStatus = gitBytes(
    worktree,
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
  );
  if (baselineStatus.byteLength !== 0) {
    throw new Error("Project Lens host materialization requires a clean Git-visible baseline");
  }
  const baselineDigest = sha256(Buffer.concat([
    Buffer.from(`${baseHead}\0`, "utf8"),
    baselineStatus,
    gitBytes(worktree, ["ls-files", "-s", "-z"]),
  ]));
  await journal.prepare(effectId, {
    missionId,
    turnId: turn.turnId,
    cellId,
    worktree: { root: worktree, baseHead, baselineDigest },
    writePaths: [PROJECT_LENS_OUTPUT_PATH],
    allowedCommands: [],
    authority: "withheld",
    writerRef: PROJECT_LENS_MATERIALIZER_REF,
    launchAuthorizationRef: turn.launchAuthorizationRef,
    workbenchTaskContext: workbenchTaskExecutionContextRef(taskContext),
  });
  await journal.start(effectId);
  await journal.observeRun(effectId, runId);
  try {
    const materialized = await materializeProjectLensCandidate(
      worktree,
      focusSources,
    );
    const bundleSha256 = await fileSha256(materialized.outputPath);
    if (bundleSha256 === null) {
      throw new Error("Project Lens host materializer did not retain its declared bundle");
    }
    if (
      gitText(worktree, ["rev-parse", "--verify", "HEAD"]) !== baseHead
      || gitBytes(
        worktree,
        ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
      ).byteLength !== 0
      || gitExitCode(worktree, [
        "check-ignore",
        "--quiet",
        "--",
        PROJECT_LENS_OUTPUT_PATH,
      ]) !== 0
    ) {
      throw new Error("Project Lens host materialization escaped its ignored bundle boundary");
    }
    const artifactDirectory = join(
      runnerRoot,
      "effect-artifacts",
      sha256(effectId).slice(0, 16),
    );
    const patchSource = Buffer.alloc(0);
    const patchDigest = sha256(patchSource);
    const patchPath = join(artifactDirectory, `${patchDigest}.patch`);
    await mkdir(artifactDirectory, { recursive: true });
    await writeFile(patchPath, patchSource, { flag: "wx" });
    await journal.quiesce(effectId, { reason: "completed", activeToolCalls: [] });
    await journal.settle(effectId, {
      patch: {
        ref: relative(runnerRoot, patchPath),
        digest: patchDigest,
      },
      changedPaths: [PROJECT_LENS_OUTPUT_PATH],
      outsideScope: { verdict: "clear", paths: [] },
      acceptance: {
        mechanical: {
          verdict: "passed",
          evidenceRefs: [`file:${relative(runnerRoot, patchPath)}`],
        },
        independent: { verdict: "not-run", evidenceRefs: [] },
        principal: { verdict: "withheld", evidenceRefs: [] },
      },
      materializedBundle: {
        path: PROJECT_LENS_OUTPUT_PATH,
        sha256: bundleSha256,
        tracking: "ignored",
      },
    });
  } catch (error) {
    const activity = await journal.activity(effectId).catch(() => undefined);
    if (activity !== undefined && activity.state !== "settled" && activity.state !== "uncertain") {
      await journal.uncertain(effectId, {
        reason: "effect-observation-incomplete",
        evidenceRefs: [`error:sha256:${sha256(errorMessage(error))}`],
      }).catch(() => undefined);
    }
    throw error;
  }
}

function prepareDelegateInput(
  root: string,
  missionId: string,
  turnId: string,
  call: DelegateCall,
): {
  readonly root: string;
  readonly reference: { readonly inputFile: string; readonly sha256: string };
} {
  const inputRoot = join(
    missionRunnerDirectory(root, missionId),
    "delegate-inputs",
    turnId,
  );
  const inputFile = "delegate-call.json";
  const content = `${stableStringify(call)}\n`;
  const sha256 = createHash("sha256").update(content).digest("hex");
  mkdirSync(inputRoot, { recursive: true, mode: 0o700 });
  writeFileSync(join(inputRoot, inputFile), content, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  return { root: inputRoot, reference: { inputFile, sha256 } };
}

function requiredTaskExecutionContext(): WorkbenchTaskExecutionContext {
  const source = process.env[WORKBENCH_TASK_EXECUTION_CONTEXT_ENV];
  if (source === undefined) {
    throw new Error(
      `the Project Lens runtime requires server-formed ${WORKBENCH_TASK_EXECUTION_CONTEXT_ENV}`,
    );
  }
  try {
    return WorkbenchTaskExecutionContextSchema.parse(JSON.parse(source));
  } catch (error) {
    throw new Error(
      `invalid Workbench task execution context: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function assertTaskExecutionContext(
  taskContext: WorkbenchTaskExecutionContext,
  expected: {
    readonly projectId: string;
    readonly missionId: string;
    readonly authorizationId: string;
    readonly proposalDigest: string;
  },
): void {
  if (
    taskContext.binding.projectId !== expected.projectId
    || taskContext.binding.missionId !== expected.missionId
    || taskContext.execution.authorizationId !== expected.authorizationId
    || taskContext.execution.proposalDigest !== expected.proposalDigest
  ) {
    throw new Error(
      "Workbench task execution context does not match the authorized project, Mission, and execution selector",
    );
  }
}

function requiredAbsolutePath(environmentName: string, label: string): string {
  const value = process.env[environmentName]?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error(`${environmentName} must name the ${label}`);
  }
  if (!isAbsolute(value)) {
    throw new Error(`${environmentName} must be an absolute path`);
  }
  return realpathSync(resolve(value));
}

function requiredNonempty(value: string, label: string): string {
  const checked = value.trim();
  if (checked.length === 0) throw new Error(`${label} must not be empty`);
  return checked;
}

function parseFocusSelection(value: unknown): ProjectLensFocusSelection {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Project Lens focus selection must be an object");
  }
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).sort().join(",")
      !== "focusSources,rationale,remainingUncertainty,status"
    || record.status !== "completed"
    || typeof record.rationale !== "string"
    || record.rationale.trim().length === 0
    || typeof record.remainingUncertainty !== "string"
    || record.remainingUncertainty.trim().length === 0
  ) {
    throw new Error("Project Lens focus selection does not match its closed output contract");
  }
  return {
    status: "completed",
    focusSources: parseFocusSources(record.focusSources),
    rationale: record.rationale,
    remainingUncertainty: record.remainingUncertainty,
  };
}

function parseFocusSources(
  value: unknown,
): typeof PROJECT_LENS_PROVIDER_READ_PATHS[number][] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Project Lens focusSources must be a non-empty list");
  }
  const allowed = new Set<string>(PROJECT_LENS_PROVIDER_READ_PATHS);
  if (
    !value.every((candidate): candidate is string =>
      typeof candidate === "string" && allowed.has(candidate)
    )
    || new Set(value).size !== value.length
  ) {
    throw new Error("Project Lens focusSources must be unique declared provider paths");
  }
  return value as typeof PROJECT_LENS_PROVIDER_READ_PATHS[number][];
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function gitText(root: string, args: readonly string[]): string {
  return gitBytes(root, args).toString("utf8").trim();
}

function gitBytes(root: string, args: readonly string[]): Buffer {
  const result = Bun.spawnSync(["git", "-C", root, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr.toString().trim() || `git ${args.join(" ")} failed`,
    );
  }
  return Buffer.from(result.stdout);
}

function gitExitCode(root: string, args: readonly string[]): number | null {
  const result = Bun.spawnSync(["git", "-C", root, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  return result.exitCode;
}

async function fileSha256(path: string): Promise<string | null> {
  try {
    return sha256(await readFile(path));
  } catch (error) {
    if (
      typeof error === "object"
      && error !== null
      && "code" in error
      && (error as { code?: unknown }).code === "ENOENT"
    ) return null;
    throw error;
  }
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
