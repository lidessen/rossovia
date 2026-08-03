import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CellInput } from "../../../packages/work-cell/src/contracts";
import { AiSdkValidationDriver } from "../../../packages/work-cell/src/ai-sdk-driver";
import { createValidationModel } from "../../../packages/work-cell/src/validation-model";
import {
  executionAuthorizationClaimPath,
} from "../../workbench/src/execution-authorization-claim";
import {
  MissionExecutionProposalSchema,
  type MissionExecutionProposal,
} from "../../workbench/src/mission-execution-proposal";
import {
  WORKBENCH_TASK_EXECUTION_CONTEXT_ENV,
  WorkbenchTaskExecutionContextSchema,
  sameWorkbenchTaskExecutionContextRef,
  workbenchTaskCorrectionGuidanceRefs,
  workbenchTaskExecutionContextDigest,
  workbenchTaskExecutionContextRef,
  type WorkbenchTaskExecutionContext,
} from "../../workbench/src/task-execution-context";
import {
  DelegateLoopSession,
  type DelegateCall,
  type DelegateLoopRun,
} from "../src/delegate-loop";
import { stableStringify } from "../src/canonical-json";
import { IsolatedGitEffectObserver } from "../src/git-effect-observer";
import type { MissionExecutionController } from "../src/mission-execution-host";
import { missionRunnerDirectory } from "../src/mission-runner";
import type {
  MissionRuntimeFactory,
  MissionRuntimeRecoveryCapabilities,
  PreparedMissionExecution,
} from "../src/mission-runtime";
import { digestAnchor } from "../src/mission-reconciliation";
import { MissionSupervisorSession } from "../src/mission-supervisor";
import {
  MISSION_TURN_VERSION,
  type MissionTurnStart,
} from "../src/mission-turn";
import {
  claimProjectExecutionAuthorization,
  type ProjectExecutionAuthorizationContract,
  validateConsumedProjectExecutionAuthorization,
  validateProjectExecutionAuthorization,
} from "./project-execution-authorization";
import {
  validateAgentEraBlogSettledEffectEvidence,
} from "./agent-era-blog-effect-verifier";

const WORKTREE_ENV = "ROSSO_BLOG_EFFECT_ROOT";
const AUTHORIZATION_RECEIPT_ENV = "ROSSO_BLOG_AUTHORIZATION_RECEIPT";
const PROJECT_ID = "appgprj_6a66e0a058b081919d4bce580c0ed1ac";
const MISSION_ID = "principal-workbench-dogfood";
const PROPOSAL_ID = "agent-era-blog-personal-publication-roundtrip-v3";
const MISSION_SOURCE = "operations/missions/principal-workbench-dogfood.json";
const RUNTIME_REF =
  "source-project:operations/autonomy/experiments/agent-era-blog-publication-runtime.ts";
const RUNTIME_SOURCE_PATH = fileURLToPath(import.meta.url);
const PROFILE_ID = "agent-era-blog-publication-writer-v1";
const PROFILE_REVISION = "2026-07-29-personal-blog-correction-roundtrip";
const OBLIGATION = "implement-principal-corrected-personal-blog-roundtrip";
const CAPABILITY = "write";
const GUARD_REF =
  "guard:isolated-worktree-publication-contract-and-browser-verification";

const READ_PATHS = [
  "AGENTS.md",
  "DESIGN.md",
  MISSION_SOURCE,
  "package.json",
  "tsconfig.json",
  "drizzle.config.ts",
  "app/chatgpt-auth.ts",
  "app/page.tsx",
  "app/layout.tsx",
  "app/globals.css",
  "db/schema.ts",
  "drizzle/meta/_journal.json",
  "tests/rendered-html.test.mjs",
] as const;

const EXCLUDE_PATHS = [
  ".git",
  ".env",
  ".dev.vars",
  ".openai/hosting.json",
  ".wrangler",
  "node_modules",
  "dist",
  ".next",
] as const;

const WRITE_PATHS = [
  "DESIGN.md",
  "package.json",
  "app/page.tsx",
  "app/layout.tsx",
  "app/globals.css",
  "app/blog/SiteChrome.tsx",
  "app/blog/content.ts",
  "app/blog/reader.tsx",
  "app/blog/[slug]/page.tsx",
  "app/blog/[slug]/revision/[revisionId]/[view]/page.tsx",
  "app/studio/page.tsx",
  "app/studio/StudioComposer.tsx",
  "app/api/publications/route.ts",
  "db/schema.ts",
  "db/publications.ts",
  "drizzle/0000_seeded_publication.sql",
  "drizzle/meta/_journal.json",
  "tests/rendered-html.test.mjs",
  "tests/author-reader-flow.test.mjs",
] as const;

const EXPECTED_SCOPE = {
  readPaths: [...READ_PATHS],
  excludePaths: [...EXCLUDE_PATHS],
  writePaths: [...WRITE_PATHS],
  commands: [],
} as const satisfies Extract<
  MissionExecutionProposal,
  { version: "mission-execution-proposal.v2" }
>["scope"];

const EXPECTED_BUDGET = {
  parent: {
    maxModelSteps: 4,
    maxOutputTokensPerStep: 2_000,
  },
  delegatedCell: {
    maxSteps: 40,
    maxOutputTokensPerStep: 16_000,
    maxDurationMs: 900_000,
  },
  estimatedTokens: 160_000,
  estimatedTokensSemantics: "forecast-only-not-stop-condition",
} as const;

const EXTERNAL_PROVIDER = {
  name: "DeepSeek",
  boundary: "external",
} as const;

const EXTERNAL_DISCLOSURE = {
  dataCategories: [
    "Principal-authored Workbench task objective, acceptance conditions, and retained correction statements",
    "Personal Blog publication task and acceptance instructions",
    "The exact relative read paths declared by mission-execution-proposal.v2",
    "No secrets, environment files, hosting configuration, Workbench evidence, or real D1 data",
  ],
};

const SOURCE_REFS = [
  "file:AGENTS.md",
  "file:DESIGN.md",
  `file:${MISSION_SOURCE}`,
  "principal-choice:visual-direction=B@authorization-c34a27b1-0320-4ca5-aec9-59f8cce13475",
] as const;

const route = [{
  provider: "deepseek" as const,
  credential: { source: "env" as const, name: "DEEPSEEK_API_KEY" },
  model: "deepseek-v4-flash",
}];

export const missionRuntimeRecoveryCapabilities = {
  resume: true,
  replace: false,
} as const satisfies MissionRuntimeRecoveryCapabilities;

const baseTask = [
  "Implement one complete seeded author-to-publication-to-reader roundtrip for Lidessen's Chinese-primary personal Blog from the current clean candidate HEAD.",
  "Treat the supplied Workbench task objective, acceptance conditions, and retained Principal corrections as current product requirements.",
  "Make the author's identity, editorial hierarchy, sustained prose, and continuous reading path primary. Keep Reading Field, brief, and source-map affordances visibly secondary and rebuildable.",
  "Recreate or improve the six-table canonical/projection model and the strict deterministic projector; reject unknown, unlinked, or cross-revision claim/source references.",
  "Add D1 persistence that atomically inserts one post or immutable revision, its claims, sources, claim-source joins, and deterministic brief/source-map projections. A same-author slug creates a new revision; another author receives a conflict. Never UPDATE or overwrite an older publication revision.",
  "Add a protected /studio route using requireChatGPTUser and a fixed seeded composer. Client preview is disposable draft state only.",
  "Add POST /api/publications using getChatGPTUser. Reject anonymous requests and any caller-supplied projection payload, strictly parse the canonical draft, recompute projections on the server, and return the exact revision URL after an atomic D1 write.",
  "Add an anonymous /blog/[slug] reader that requires an exact revision selector and preserves it while switching canonical, brief, and source-map views. Derived views must visibly say deterministic and expose resolvable claim/source references.",
  "Replace the starter home shell and metadata with Lidessen's personal Blog entry; preserve Chinese content, mobile hierarchy, and optional source access.",
  "Own one stable non-empty seeded slug and use it consistently in the homepage, studio, publication API result, and reader. Reject empty or invalid slugs.",
  "Write one explicit SQL migration plus the Drizzle journal needed to create the six tables. Do not run or claim npm, Drizzle, Git, deployment, or network commands; this Cell has no command capability.",
  "Update package.json only so npm test runs both repository test files; do not add or remove dependencies.",
  "Add executable Node tests for auth boundaries, strict server authority, atomic rollback, immutable revisions, anonymous view continuity, and starter replacement. Independent host verification will run them in a dependency-backed disposable snapshot.",
  "Do not read or modify .openai/hosting.json, secrets, environment files, real D1 data, Git refs, Mission state, receipts, or Workbench timelines.",
  "Do not claim commit, merge, deployment, publication to production, or product acceptance.",
];

const baseAcceptance = [
  "Lidessen and the personal Blog identity establish the first hierarchy in metadata, chrome, homepage, and article.",
  "Title, dek or byline, publication metadata, sustained Chinese prose, headings, and code form one continuous editorial reading path.",
  "Reading Field, brief, and source-map controls remain secondary and never frame the page as a technical dashboard.",
  "Canonical draft validation closes every claim-to-source relation and deterministic projections remain revision-bound, pure, and reconstructible.",
  "The candidate contains the six-table D1 schema, one explicit migration, and an atomic publication adapter whose failure cannot leave partial canonical or projection rows.",
  "Unauthenticated /studio is redirected and unauthenticated POST is rejected; valid publication is recomputed server-side and returns one exact immutable revision URL.",
  "Publishing the same slug twice as the same author preserves both exact revisions; another author cannot take the slug.",
  "Anonymous canonical, brief, and source-map views preserve one exact revision, visually distinguish canonical from deterministic projection material, and keep source references inspectable at desktop and mobile widths.",
  "The starter preview and codex-preview metadata are no longer the product entry surface.",
  "One non-empty seeded slug is shared by homepage, studio, API result, and reader; empty or invalid slugs are rejected.",
  "All changed paths remain inside the exact v2 write scope; no command, network, secret, Git, Mission, receipt, integration, deployment, or product-acceptance authority is exercised.",
] as const;

export function currentBlogPublicationRuntimeDigest(): string {
  return createHash("sha256")
    .update(readFileSync(RUNTIME_SOURCE_PATH))
    .digest("hex");
}

export function blogPublicationAuthorizationContract():
  ProjectExecutionAuthorizationContract {
  return {
    projectId: PROJECT_ID,
    missionId: MISSION_ID,
    proposalId: PROPOSAL_ID,
    missionSource: MISSION_SOURCE,
    runtimeRef: RUNTIME_REF,
    runtimeDigest: currentBlogPublicationRuntimeDigest(),
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
      estimatedTokensSemantics:
        EXPECTED_BUDGET.estimatedTokensSemantics,
    },
    requiredChoices: [{
      decisionId: "external-disclosure",
      replyKey: "ALLOW",
    }],
  };
}

export function blogPublicationExecutionProposal(): Extract<
  MissionExecutionProposal,
  { version: "mission-execution-proposal.v2" }
> {
  const contract = blogPublicationAuthorizationContract();
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
      label: "Authorize the declared DeepSeek disclosure",
      proposal: "ALLOW the exact v2 read boundary",
      status: "pending",
      options: [{
        replyKey: "ALLOW",
        label: "Authorize exact disclosure",
        immediateResult:
          "Run one supervised publication writer with only the declared read and write paths.",
        tradeoff:
          "The declared project sources leave the local boundary and may incur model cost.",
      }, {
        replyKey: "HOLD",
        label: "Keep blocked",
        immediateResult:
          "Do not disclose project sources or start the publication writer.",
        tradeoff:
          "The author-reader MVP remains incomplete.",
      }],
      compactReplyKey: "ALLOW",
    }],
  }) as Extract<
    MissionExecutionProposal,
    { version: "mission-execution-proposal.v2" }
  >;
}

export const createMissionRuntime: MissionRuntimeFactory = async (
  context,
): Promise<PreparedMissionExecution> => {
  const worktree = requiredAbsolutePath(
    WORKTREE_ENV,
    "operator-selected detached Blog worktree",
  );
  const receiptPath = requiredAbsolutePath(
    AUTHORIZATION_RECEIPT_ENV,
    "local Principal authorization receipt",
  );
  const taskContext = requiredTaskExecutionContext();
  if (context.recovery !== undefined) {
    const recovery = context.recovery;
    if (recovery.action !== "resume") {
      throw new Error(
        "the Blog publication runtime supports settlement-only resume, not replacement",
      );
    }
    return await recoverSettledPublicationExecution({
      context: { ...context, recovery },
      worktree,
      receiptPath,
      taskContext,
    });
  }
  const authorizationValidation = validateProjectExecutionAuthorization({
    home: context.root,
    missionId: context.missionId,
    worktree,
    receiptPath,
    contract: blogPublicationAuthorizationContract(),
  });
  assertTaskExecutionContext(taskContext, {
    missionId: context.missionId,
    authorizationId: authorizationValidation.receipt.authorizationId,
    proposalDigest: authorizationValidation.receipt.proposalDigest,
  });
  const activeAnchor = await context.timeline.latestReconciledAnchor(
    context.missionId,
  );
  if (activeAnchor === undefined) {
    throw new Error(
      "the seeded publication trial requires an authorized and reconciled Mission anchor",
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
    turnId: `agent-era-blog-publication-${randomUUID()}`,
    baselineWatermark: activeAnchor.reconciledWatermark,
    anchorDigest: digestAnchor(activeAnchor),
    sourceRefs: [
      ...SOURCE_REFS,
      ...taskContext.corrections.map((correction) => correction.sourceRef),
      `workbench-task:${taskContext.taskId}@${taskContext.taskRevision}`,
      `workbench-task-context:sha256:${workbenchTaskExecutionContextDigest(taskContext)}`,
      `profile:${PROFILE_ID}@${PROFILE_REVISION}`,
      `authorization:${authorizationValidation.receipt.authorizationId}`,
      `proposal:${authorizationValidation.receipt.proposalId}@${authorizationValidation.receipt.proposalDigest}`,
    ],
    launchAuthorizationRef,
    workbenchTaskContext: workbenchTaskExecutionContextRef(taskContext),
    guidanceRefs: workbenchTaskCorrectionGuidanceRefs(taskContext),
  };

  const selection = createValidationModel({ route });
  const abort = new AbortController();
  const expectedCall = publicationCall(taskContext);
  const delegateInput = prepareDelegateInput(
    context.root,
    context.missionId,
    turn.turnId,
    expectedCall,
  );
  const delegate = new DelegateLoopSession({
    id: turn.turnId,
    instructions: [
      "This is one guarded, supervised end-to-end product contribution for the exact Workbench task context.",
      "The Principal-authorized delegation decision is already complete. Submit exactly one writer through delegate_file; do not reconsider the task or write product files in the parent loop.",
      `Use exactly this host-owned input reference: ${JSON.stringify(delegateInput.reference)}.`,
      "The writer has no command capability. Missing command-generated evidence must remain for the independent verifier.",
      "After settlement, report only status, changed artifacts, and uncovered acceptance obligations.",
      "A candidate diff never grants commit, merge, deployment, production publication, or product acceptance.",
    ].join("\n"),
    messages: [{
      role: "user",
      content:
      "Execute the one authorized Principal-corrected personal Blog publication roundtrip contribution.",
    }],
    tasks: [{
      subject: "Implement Principal-corrected personal Blog roundtrip",
      description: expectedCall.task,
    }],
    whole: {
      revision: "agent-era-blog-personal-publication-roundtrip-v3",
      sourceRefs: [...expectedCall.sourceRefs],
      obligations: [OBLIGATION],
      settledContributionKeys: [],
      guardRefs: [GUARD_REF],
      capabilityNeeds: [CAPABILITY],
      reconstructionOwner: "principal:agent-era-blog-supervisor",
      workspace: blogPublicationWorkspace(worktree),
      effectPolicy: { kind: "isolated-writable-trial", root: worktree },
    },
  }, {
    model: selection.model,
    delegateInputRoot: delegateInput.root,
    initialDelegateTool: "delegate_file",
    prepareContribution: async (call) =>
      prepareContribution(worktree, expectedCall, call),
    timeline: context.timeline,
    createDriver: () => new AiSdkValidationDriver({ route }),
    executionObserver: new IsolatedGitEffectObserver({
      missionId: context.missionId,
      journalRoot: missionRunnerDirectory(context.root, context.missionId),
      leaseRoot: context.root,
      launchAuthorizationRef,
    }),
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
  const controller: MissionExecutionController = {
    advance: () => supervisor.advance(),
    resume: () => supervisor.resume(),
    observeInput: (input) => supervisor.observeInput(input),
    cancel: (reason) => abort.abort(reason),
  };
  const authorization = claimProjectExecutionAuthorization(
    authorizationValidation,
    {
      binding: {
        workbenchTaskContext: workbenchTaskExecutionContextRef(taskContext),
      },
    },
  );
  if (relative(context.root, authorization.claimPath) !== launchAuthorizationRef.claimSourceRef) {
    throw new Error("execution authorization claim source changed after launch preflight");
  }
  return { turn, controller };
};

async function recoverSettledPublicationExecution(input: {
  readonly context: Parameters<MissionRuntimeFactory>[0] & {
    readonly recovery: NonNullable<Parameters<MissionRuntimeFactory>[0]["recovery"]>;
  };
  readonly worktree: string;
  readonly receiptPath: string;
  readonly taskContext: WorkbenchTaskExecutionContext;
}): Promise<PreparedMissionExecution> {
  const { context, worktree, receiptPath, taskContext } = input;
  const authorization = validateConsumedProjectExecutionAuthorization({
    home: context.root,
    missionId: context.missionId,
    worktree,
    receiptPath,
    contract: blogPublicationAuthorizationContract(),
  });
  assertTaskExecutionContext(taskContext, {
    missionId: context.missionId,
    authorizationId: authorization.receipt.authorizationId,
    proposalDigest: authorization.receipt.proposalDigest,
  });
  const turn = context.recovery.interruptedTurn;
  const expectedTaskContext = workbenchTaskExecutionContextRef(taskContext);
  const expectedClaimSourceRef = relative(
    context.root,
    authorization.claimPath,
  );
  if (
    turn.launchAuthorizationRef?.authorizationId
      !== authorization.receipt.authorizationId
    || turn.launchAuthorizationRef.proposalDigest
      !== authorization.receipt.proposalDigest
    || turn.launchAuthorizationRef.claimSourceRef !== expectedClaimSourceRef
    || turn.workbenchTaskContext === undefined
    || authorization.workbenchTaskContext === null
    || !sameWorkbenchTaskExecutionContextRef(
      turn.workbenchTaskContext,
      expectedTaskContext,
    )
    || !sameWorkbenchTaskExecutionContextRef(
      authorization.workbenchTaskContext,
      expectedTaskContext,
    )
    || stableStringify(turn.guidanceRefs ?? [])
      !== stableStringify(workbenchTaskCorrectionGuidanceRefs(taskContext))
    || !turn.sourceRefs.includes(
      `workbench-task-context:sha256:${workbenchTaskExecutionContextDigest(taskContext)}`,
    )
  ) {
    throw new Error(
      "interrupted Blog turn does not match its consumed authorization and Workbench task guidance",
    );
  }

  const batchId = `${turn.turnId}:batch:1`;
  const recovered = await context.timeline.recoverBatch(turn.turnId, batchId);
  if (
    !recovered.ready
    || recovered.run?.kind !== "direct"
    || recovered.outcomes?.length !== 1
    || recovered.checkpoint.invocations.length !== 1
  ) {
    throw new Error(
      "Blog recovery requires one durably child-settled direct batch; no model or writer replay is permitted",
    );
  }
  const expectedCall = publicationCall(taskContext);
  const invocation = recovered.checkpoint.invocations[0]!;
  const record = recovered.run.record;
  if (
    stableStringify(invocation.call) !== stableStringify(expectedCall)
    || stableStringify(record.input)
      !== stableStringify(blogPublicationCell(worktree, expectedCall))
  ) {
    throw new Error(
      "retained Blog child settlement does not match the authorized contribution",
    );
  }
  const retainedEffect = await validateAgentEraBlogSettledEffectEvidence({
    home: context.root,
    missionId: context.missionId,
    effectId: batchId,
  });
  const activity = retainedEffect.activity;
  const changedPaths = uniqueSorted([
    ...record.workspaceDiff.added,
    ...record.workspaceDiff.changed,
    ...record.workspaceDiff.removed,
  ]);
  if (
    activity.prepared.missionId !== context.missionId
    || activity.prepared.turnId !== turn.turnId
    || activity.prepared.cellId !== record.cellId
    || activity.runId !== record.runId
    || retainedEffect.candidateRoot !== worktree
    || activity.prepared.worktree.baseHead !== authorization.gitHead
    || stableStringify(activity.prepared.writePaths)
      !== stableStringify([...WRITE_PATHS])
    || stableStringify(activity.prepared.launchAuthorizationRef)
      !== stableStringify(turn.launchAuthorizationRef)
    || stableStringify(activity.settlement.changedPaths)
      !== stableStringify(changedPaths)
  ) {
    throw new Error(
      "retained Blog effect does not match the child run, Worktree, scope, and launch authorization",
    );
  }

  const run = settlementOnlyRun(recovered);
  const recoveredDelegate = {
    async advance() {
      return { kind: "finished" as const, run };
    },
    async resume() {
      return { kind: "finished" as const, run };
    },
  };
  const supervisor = new MissionSupervisorSession(
    context.missionId,
    recoveredDelegate,
    context.timeline,
    turn.baselineWatermark,
  );
  const controller: MissionExecutionController = {
    advance: () => supervisor.advance(),
    resume: () => supervisor.resume(),
    observeInput: (receipt) => supervisor.observeInput(receipt),
    cancel: () => undefined,
  };
  return { turn, controller };
}

function settlementOnlyRun(
  recovered: Awaited<ReturnType<
    Parameters<MissionRuntimeFactory>[0]["timeline"]["recoverBatch"]
  >>,
): DelegateLoopRun {
  if (
    recovered.run === undefined
    || recovered.outcomes === undefined
    || recovered.outcomes.length !== 1
  ) {
    throw new Error("settlement-only reconstruction requires one retained run");
  }
  const outcome = recovered.outcomes[0]!;
  const invocation = recovered.checkpoint.invocations[0]!;
  const completed = outcome.status === "completed";
  const tasks = recovered.checkpoint.tasks.map((task) => {
    if (task.id !== invocation.call.taskId) return task;
    return completed
      ? { ...task, status: "completed" as const }
      : {
        ...task,
        status: "pending" as const,
        owner: undefined,
      };
  });
  return {
    status: "needs-attention",
    text:
      "Recovered one durably settled Blog child and Git effect without replaying the parent model, child driver, or writer.",
    messages: recovered.checkpoint.responseMessages,
    batches: [{
      id: recovered.checkpoint.id,
      invocations: recovered.checkpoint.invocations,
      outcomes: recovered.outcomes,
      run: recovered.run,
    }],
    tasks,
    uncoveredObligations: completed
      ? []
      : [...recovered.checkpoint.admission.whole.obligations],
    usage: recovered.checkpoint.parentUsage,
  };
}

function prepareContribution(
  worktree: string,
  expectedCall: DelegateCall,
  call: DelegateCall,
) {
  if (JSON.stringify(call) !== JSON.stringify(expectedCall)) {
    throw new Error(
      "the Blog parent changed its one host-authorized publication contribution",
    );
  }
  return {
    dependsOn: [],
    taskShape: {
      referenceProfile: { id: PROFILE_ID, revision: PROFILE_REVISION },
      evidence: {
        status: "provisional-observed" as const,
        revision: PROFILE_REVISION,
        refs: [
          "evidence:first-content-model-trial-settled-with-one-corrected-contract-failure",
        ],
      },
      disposition: "guarded" as const,
      principalInstability:
        "one writer must preserve the cross-layer author-publication-reader relation across many artifacts; exact scope, deterministic tests, independent D1 verification, and browser inspection contain but do not eliminate omission risk",
      guardRefs: [GUARD_REF],
      reconstructionOwner: "principal:agent-era-blog-supervisor",
      overloadDisposition: "repartition" as const,
    },
    cell: blogPublicationCell(worktree, call),
  };
}

export function blogPublicationCell(
  worktree: string,
  call: DelegateCall,
): CellInput {
  return {
    id: call.key,
    intent: call.task,
    workspace: blogPublicationWorkspace(worktree),
    instructions: [
      "Treat AGENTS.md and DESIGN.md as the product and authority source.",
      "Read only the exact declared paths; a missing optional path is absence, not permission to widen.",
      "Use write_file only for complete files inside the exact write scope.",
      "Keep canonical author content, published revisions, and deterministic projections distinct in types, storage, routes, and visual treatment.",
      "Prefer raw D1 prepared statements and one atomic batch in db/publications.ts; keep D1 access behind that server-only helper.",
      "Do not import client-supplied projections or trust client preview data at publication time.",
      "Do not run commands or infer success from written artifacts.",
      "Return needs_repartition rather than silently omitting a required end-to-end relation.",
    ],
    capabilities: ["read", "write"],
    context: [],
    capabilitiesRequired: [call.capabilityNeed],
    acceptance: [...call.acceptance],
    artifacts: artifactContracts(),
    budget: {
      maxSteps: EXPECTED_BUDGET.delegatedCell.maxSteps,
      estimatedTokens: EXPECTED_BUDGET.estimatedTokens,
      estimatedTokensTolerance: 1,
      maxDurationMs: EXPECTED_BUDGET.delegatedCell.maxDurationMs,
      maxCommandOutputBytes: 8_000,
    },
    executionProfile: {
      id: PROFILE_ID,
      version: "execution-profile.v1",
      provider: "deepseek",
      model: "deepseek-v4-flash",
      contextPolicy:
        "exact proposal-v2 read paths and exclusions; one isolated candidate writer",
      toolSurface: "list_files, read_file, write_file; no commands",
      parallelism: "serial",
    },
    outputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["completed", "needs_repartition", "unverifiable"],
        },
        summary: { type: "string" },
        files: {
          type: "array",
          items: { type: "string", enum: [...WRITE_PATHS] },
          minItems: 1,
          maxItems: WRITE_PATHS.length,
        },
        remainingRisk: { type: "string" },
      },
      required: ["status", "summary", "files", "remainingRisk"],
      additionalProperties: false,
    },
  };
}

export function publicationCall(
  taskContext: WorkbenchTaskExecutionContext,
): DelegateCall {
  const checked = WorkbenchTaskExecutionContextSchema.parse(taskContext);
  const correctionInstructions = checked.corrections.length === 0
    ? ["No retained Principal correction accompanies this task revision."]
    : checked.corrections.map(
      (correction, index) =>
        `Retained Principal correction ${index + 1} (${correction.id}): ${correction.statement}`,
    );
  return {
    key: "blog-personal-publication-roundtrip",
    taskId: "task-1",
    task: [
      ...baseTask,
      `Workbench task objective: ${checked.objective}`,
      ...correctionInstructions,
    ].join(" "),
    sourceRefs: [
      ...SOURCE_REFS,
      ...checked.corrections.map((correction) => correction.sourceRef),
      `workbench-task:${checked.taskId}@${checked.taskRevision}`,
      `workbench-task-context:sha256:${workbenchTaskExecutionContextDigest(checked)}`,
    ],
    obligationRefs: [OBLIGATION],
    acceptance: [...baseAcceptance, ...checked.acceptance],
    capabilityNeed: CAPABILITY,
  };
}

function prepareDelegateInput(
  root: string,
  missionId: string,
  turnId: string,
  call: DelegateCall,
): {
  readonly root: string;
  readonly reference: {
    readonly inputFile: string;
    readonly sha256: string;
  };
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
  return {
    root: inputRoot,
    reference: { inputFile, sha256 },
  };
}

function requiredTaskExecutionContext(): WorkbenchTaskExecutionContext {
  const source = process.env[WORKBENCH_TASK_EXECUTION_CONTEXT_ENV];
  if (source === undefined) {
    throw new Error(
      `the Blog runtime requires server-formed ${WORKBENCH_TASK_EXECUTION_CONTEXT_ENV}`,
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
    readonly missionId: string;
    readonly authorizationId: string;
    readonly proposalDigest: string;
  },
): void {
  if (
    taskContext.binding.projectId !== PROJECT_ID
    || taskContext.binding.missionId !== expected.missionId
    || taskContext.execution.authorizationId !== expected.authorizationId
    || taskContext.execution.proposalDigest !== expected.proposalDigest
  ) {
    throw new Error(
      "Workbench task execution context does not match the authorized project, Mission, and execution selector",
    );
  }
}

export function blogPublicationWorkspace(worktree: string) {
  return {
    root: worktree,
    readPaths: [...READ_PATHS],
    writePaths: [...WRITE_PATHS],
    excludePaths: [...EXCLUDE_PATHS],
    allowedCommands: [],
  };
}

function artifactContracts(): CellInput["artifacts"] {
  return [
    {
      path: "DESIGN.md",
      instructions:
        "Retain the personal Blog as the product surface and Reading Field as a secondary rebuildable projection.",
    },
    {
      path: "db/schema.ts",
      instructions:
        "Six canonical/projection Drizzle tables with immutable revision and provenance constraints.",
    },
    {
      path: "app/blog/content.ts",
      instructions:
        "Strict canonical draft validation plus pure deterministic revision-bound projection ports.",
    },
    {
      path: "db/publications.ts",
      instructions:
        "Server-only D1 atomic publication and exact immutable revision reader.",
    },
    {
      path: "app/api/publications/route.ts",
      instructions:
        "Authenticated strict POST route that recomputes projections server-side.",
    },
    {
      path: "app/studio/page.tsx",
      instructions: "Authenticated studio server boundary.",
    },
    {
      path: "app/studio/StudioComposer.tsx",
      instructions:
        "Fixed seeded author composer with disposable preview and explicit publish result.",
    },
    {
      path: "app/blog/[slug]/page.tsx",
      instructions:
        "Anonymous exact-revision canonical, brief, and source-map reader.",
    },
    {
      path: "app/page.tsx",
      instructions:
        "Lidessen personal Blog entry replacing the starter preview; Reading Field stays secondary.",
    },
    {
      path: "app/layout.tsx",
      instructions: "Real product metadata without codex-preview.",
    },
    {
      path: "app/globals.css",
      instructions:
        "Responsive editorial hierarchy at desktop and mobile widths with secondary Reading Field controls.",
    },
    {
      path: "drizzle/0000_seeded_publication.sql",
      instructions: "Explicit D1 SQL migration for the six-table schema.",
    },
    {
      path: "drizzle/meta/_journal.json",
      instructions: "Migration journal naming the explicit initial migration.",
    },
    {
      path: "tests/rendered-html.test.mjs",
      instructions: "Starter replacement and rendered route contract checks.",
    },
    {
      path: "tests/author-reader-flow.test.mjs",
      instructions:
        "Auth, atomic rollback, immutable revision, server authority, and anonymous view-continuity checks.",
    },
    {
      path: "package.json",
      instructions:
        "Run both test files without changing dependency declarations.",
    },
  ];
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

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}
