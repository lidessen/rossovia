import { createHash, randomUUID } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
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
  DelegateLoopSession,
  type DelegateCall,
} from "../src/delegate-loop";
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
  validateProjectExecutionAuthorization,
} from "./project-execution-authorization";

const WORKTREE_ENV = "ROSSO_BLOG_EFFECT_ROOT";
const AUTHORIZATION_RECEIPT_ENV = "ROSSO_BLOG_AUTHORIZATION_RECEIPT";
const PROJECT_ID = "appgprj_6a66e0a058b081919d4bce580c0ed1ac";
const MISSION_ID = "principal-workbench-dogfood";
const PROPOSAL_ID = "agent-era-blog-seeded-publication-roundtrip-v1";
const MISSION_SOURCE = "operations/missions/principal-workbench-dogfood.json";
const RUNTIME_REF =
  "source-project:operations/autonomy/experiments/agent-era-blog-publication-runtime.ts";
const RUNTIME_SOURCE_PATH = fileURLToPath(import.meta.url);
const PROFILE_ID = "agent-era-blog-publication-writer-v1";
const PROFILE_REVISION = "2026-07-27-seeded-publication-roundtrip";
const OBLIGATION = "implement-seeded-author-publication-reader-roundtrip";
const CAPABILITY = "write";
const GUARD_REF =
  "guard:isolated-worktree-publication-contract-and-browser-verification";

const READ_PATHS = [
  "AGENTS.md",
  "DESIGN.md",
  MISSION_SOURCE,
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "drizzle.config.ts",
  "vite.config.ts",
  "next.config.ts",
  "worker/index.ts",
  "app/page.tsx",
  "app/layout.tsx",
  "app/globals.css",
  "app/chatgpt-auth.ts",
  "app/blog/content.ts",
  "db/index.ts",
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
  "db/schema.ts",
  "db/publications.ts",
  "app/blog",
  "app/studio",
  "app/api/publications",
  "app/page.tsx",
  "app/layout.tsx",
  "app/globals.css",
  "drizzle",
  "tests/rendered-html.test.mjs",
  "tests/author-reader-flow.test.mjs",
  "package.json",
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
    "Seeded Blog publication task and acceptance instructions",
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
  resume: false,
  replace: false,
} as const satisfies MissionRuntimeRecoveryCapabilities;

const task = [
  "Implement the first complete seeded author-to-publication-to-reader roundtrip for the agent-era Blog from the current clean candidate HEAD.",
  "Preserve the accepted Reading Field visual direction and the authority boundary in AGENTS.md and DESIGN.md.",
  "Recreate or improve the six-table canonical/projection model and the strict deterministic projector; reject unknown, unlinked, or cross-revision claim/source references.",
  "Add D1 persistence that atomically inserts one post or immutable revision, its claims, sources, claim-source joins, and deterministic brief/source-map projections. A same-author slug creates a new revision; another author receives a conflict. Never UPDATE or overwrite an older publication revision.",
  "Add a protected /studio route using requireChatGPTUser and a fixed seeded composer. Client preview is disposable draft state only.",
  "Add POST /api/publications using getChatGPTUser. Reject anonymous requests and any caller-supplied projection payload, strictly parse the canonical draft, recompute projections on the server, and return the exact revision URL after an atomic D1 write.",
  "Add an anonymous /blog/[slug] reader that requires an exact revision selector and preserves it while switching canonical, brief, and source-map views. Derived views must visibly say deterministic and expose resolvable claim/source references.",
  "Replace the starter home shell and metadata with the Reading Field product entry; preserve mobile hierarchy and source access.",
  "Write one explicit SQL migration plus the Drizzle journal needed to create the six tables. Do not run or claim npm, Drizzle, Git, deployment, or network commands; this Cell has no command capability.",
  "Update package.json only so npm test runs both repository test files; do not add or remove dependencies.",
  "Add executable Node tests for auth boundaries, strict server authority, atomic rollback, immutable revisions, anonymous view continuity, and starter replacement. Independent host verification will run them in a dependency-backed disposable snapshot.",
  "Do not read or modify .openai/hosting.json, secrets, environment files, real D1 data, Git refs, Mission state, receipts, or Workbench timelines.",
  "Do not claim commit, merge, deployment, publication to production, or product acceptance.",
].join(" ");

const acceptance = [
  "Canonical draft validation closes every claim-to-source relation and deterministic projections remain revision-bound, pure, and reconstructible.",
  "The candidate contains the six-table D1 schema, one explicit migration, and an atomic publication adapter whose failure cannot leave partial canonical or projection rows.",
  "Unauthenticated /studio is redirected and unauthenticated POST is rejected; valid publication is recomputed server-side and returns one exact immutable revision URL.",
  "Publishing the same slug twice as the same author preserves both exact revisions; another author cannot take the slug.",
  "Anonymous canonical, brief, and source-map views preserve one exact revision, visually distinguish canonical from deterministic projection material, and keep source references inspectable at desktop and mobile widths.",
  "The starter preview and codex-preview metadata are no longer the product entry surface.",
  "All changed paths remain inside the exact v2 write scope; no command, network, secret, Git, Mission, receipt, integration, deployment, or product-acceptance authority is exercised.",
] as const;

const expectedCall: DelegateCall = {
  key: "blog-seeded-publication-roundtrip",
  taskId: "task-1",
  task,
  sourceRefs: [...SOURCE_REFS],
  obligationRefs: [OBLIGATION],
  acceptance: [...acceptance],
  capabilityNeed: CAPABILITY,
};

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
  if (context.recovery !== undefined) {
    throw new Error(
      "the seeded publication trial cannot replay or replace an uncertain writable effect; inspect or retire its detached worktree first",
    );
  }
  const worktree = requiredAbsolutePath(
    WORKTREE_ENV,
    "operator-selected detached Blog worktree",
  );
  const receiptPath = requiredAbsolutePath(
    AUTHORIZATION_RECEIPT_ENV,
    "local Principal authorization receipt",
  );
  const authorizationValidation = validateProjectExecutionAuthorization({
    home: context.root,
    missionId: context.missionId,
    worktree,
    receiptPath,
    contract: blogPublicationAuthorizationContract(),
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
      `profile:${PROFILE_ID}@${PROFILE_REVISION}`,
      `authorization:${authorizationValidation.receipt.authorizationId}`,
      `proposal:${authorizationValidation.receipt.proposalId}@${authorizationValidation.receipt.proposalDigest}`,
    ],
    launchAuthorizationRef,
  };

  const selection = createValidationModel({ route });
  const abort = new AbortController();
  const delegate = new DelegateLoopSession({
    id: turn.turnId,
    instructions: [
      "This is one guarded, supervised end-to-end product contribution.",
      "Delegate exactly one writer using the exact JSON below; do not write product files in the parent loop.",
      JSON.stringify(expectedCall),
      "The writer has no command capability. Missing command-generated evidence must remain for the independent verifier.",
      "After settlement, report only status, changed artifacts, and uncovered acceptance obligations.",
      "A candidate diff never grants commit, merge, deployment, production publication, or product acceptance.",
    ].join("\n"),
    messages: [{
      role: "user",
      content:
        "Execute the one authorized seeded Blog publication roundtrip contribution.",
    }],
    tasks: [{
      subject: "Implement seeded Blog publication roundtrip",
      description: task,
    }],
    whole: {
      revision: "agent-era-blog-seeded-publication-roundtrip-v1",
      sourceRefs: [...SOURCE_REFS],
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
    prepareContribution: async (call) => prepareContribution(worktree, call),
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
  const authorization = claimProjectExecutionAuthorization(authorizationValidation);
  if (relative(context.root, authorization.claimPath) !== launchAuthorizationRef.claimSourceRef) {
    throw new Error("execution authorization claim source changed after launch preflight");
  }
  return { turn, controller };
};

function prepareContribution(worktree: string, call: DelegateCall) {
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
    cell: cell(worktree, call),
  };
}

function cell(worktree: string, call: DelegateCall): CellInput {
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
      instructions: "Reading Field product entry replacing the starter preview.",
    },
    {
      path: "app/layout.tsx",
      instructions: "Real product metadata without codex-preview.",
    },
    {
      path: "app/globals.css",
      instructions: "Responsive Reading Field visual hierarchy at desktop and mobile widths.",
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
