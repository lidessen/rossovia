import { execFileSync, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CellInput } from "../../../packages/work-cell/src/contracts";
import { AiSdkValidationDriver } from "../../../packages/work-cell/src/ai-sdk-driver";
import { createValidationModel } from "../../../packages/work-cell/src/validation-model";
import {
  executionAuthorizationReceiptPath,
  ExecutionAuthorizationReceiptSchema,
  type ExecutionAuthorizationReceipt,
} from "../../workbench/src/execution-authorization";
import {
  missionExecutionProposalDigest,
  type MissionExecutionProposal,
} from "../../workbench/src/mission-execution-proposal";
import { parseMissionRecord } from "../../workbench/src/missions";
import { stableStringify } from "../src/canonical-json";
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

const WORKTREE_ENV = "ROSSO_BLOG_EFFECT_ROOT";
const AUTHORIZATION_RECEIPT_ENV = "ROSSO_BLOG_AUTHORIZATION_RECEIPT";
const PROJECT_ID = "appgprj_6a66e0a058b081919d4bce580c0ed1ac";
const MISSION_ID = "principal-workbench-dogfood";
const PROPOSAL_ID = "agent-era-blog-first-supervised-run-v1";
const MISSION_SOURCE = "operations/missions/principal-workbench-dogfood.json";
const RUNTIME_REF = "source-project:operations/autonomy/experiments/agent-era-blog-mission-runtime.ts";
const RUNTIME_SOURCE_PATH = fileURLToPath(import.meta.url);
const SOURCE_REFS = [
  "file:AGENTS.md",
  "file:DESIGN.md",
  `file:${MISSION_SOURCE}`,
] as const;
const OBLIGATION = "implement-canonical-content-and-projection-model";
const CAPABILITY = "write";
const GUARD_REF = "guard:isolated-worktree-independent-blog-verification";
const PROFILE_ID = "agent-era-blog-isolated-writer-v1";
const PROFILE_REVISION = "2026-07-26-first-trial";
const EXPECTED_SCOPE = {
  writePaths: ["db/schema.ts", "app/blog"],
  commands: [],
} as const;
const EXPECTED_BUDGET = {
  parent: {
    maxModelSteps: 4,
    maxOutputTokensPerStep: 2_000,
  },
  delegatedCell: {
    maxSteps: 14,
    maxOutputTokensPerStep: 16_000,
    maxDurationMs: 300_000,
  },
  estimatedTokens: 60_000,
  estimatedTokensSemantics: "forecast-only-not-stop-condition",
} as const;

const route = [{
  provider: "deepseek" as const,
  credential: { source: "env" as const, name: "DEEPSEEK_API_KEY" },
  model: "deepseek-v4-flash",
}];

export const missionRuntimeRecoveryCapabilities = {
  resume: false,
  replace: false,
} as const satisfies MissionRuntimeRecoveryCapabilities;

export function currentBlogRuntimeDigest(): string {
  return createHash("sha256")
    .update(readFileSync(RUNTIME_SOURCE_PATH))
    .digest("hex");
}

const task = [
  "Implement the non-visual canonical content and deterministic projection model for the first agent-era Blog slice.",
  "Read AGENTS.md, DESIGN.md, db/schema.ts, and the existing app structure before writing.",
  "Make db/schema.ts export posts, publicationRevisions, claims, sources, claimSources, and projections as distinct Drizzle tables preserving immutable revision snapshots and rebuildable projection provenance in D1.",
  "Create app/blog/content.ts exporting seededPublishedRevision and a pure buildReadingField(revision) function.",
  "The seed must contain at least two explicit claims, two sources, and a claim-to-source relation; the projector must return deterministic brief and source-map views with sourceRevisionId, generatorKind='deterministic', and closed claim/source references on every derived statement.",
  "Keep canonical author content distinct from disposable projections in types and data.",
  "Do not change page composition, styling, authentication, package dependencies, commands, Git refs, or publication state in this contribution.",
].join(" ");

const acceptance = [
  "db/schema.ts exposes distinct posts, publicationRevisions, claims, sources, claimSources, and projections tables without making projections canonical.",
  "app/blog/content.ts exposes seededPublishedRevision and pure buildReadingField(revision) test ports; repeated projection is deterministic, does not mutate its input, and binds every derived statement to one source revision and resolvable claim/source references.",
  "A projection built for one revision cannot be relabeled as belonging to a later revision of the same post.",
  "The contribution does not claim that a live LLM ran and does not add UI, authentication, dependency, Git, commit, merge, or publication authority.",
  "Both declared files are retained as Work Cell artifacts; independent build and product review remain withheld.",
] as const;

const expectedCall: DelegateCall = {
  key: "blog-content-model",
  taskId: "task-1",
  task,
  sourceRefs: [...SOURCE_REFS],
  obligationRefs: [OBLIGATION],
  acceptance: [...acceptance],
  capabilityNeed: CAPABILITY,
};

/**
 * First real writable Mission trial. The operator selects one clean detached
 * worktree through ROSSO_BLOG_EFFECT_ROOT; the model cannot select or widen it.
 */
export const createMissionRuntime: MissionRuntimeFactory = async (
  context,
): Promise<PreparedMissionExecution> => {
  if (context.recovery !== undefined) {
    throw new Error(
      "the first writable Blog trial cannot replay or replace an uncertain effect; inspect or discard its detached worktree first",
    );
  }
  const worktree = requiredWorktree();
  const authorization = consumeBlogExecutionAuthorization({
    home: context.root,
    missionId: context.missionId,
    worktree,
  });
  const activeAnchor = await context.timeline.latestReconciledAnchor(context.missionId);
  const baselineWatermark = activeAnchor?.reconciledWatermark ?? 0;
  const launchAuthorizationRef = {
    authorizationId: authorization.receipt.authorizationId,
    proposalDigest: authorization.receipt.proposalDigest,
    claimSourceRef: relative(context.root, authorization.claimPath),
  };
  const turn: MissionTurnStart = {
    version: MISSION_TURN_VERSION,
    turnId: `agent-era-blog-${randomUUID()}`,
    baselineWatermark,
    ...(activeAnchor === undefined ? {} : { anchorDigest: digestAnchor(activeAnchor) }),
    sourceRefs: [
      ...SOURCE_REFS,
      `profile:${PROFILE_ID}@${PROFILE_REVISION}`,
      `authorization:${authorization.receipt.authorizationId}`,
      `proposal:${authorization.receipt.proposalId}@${authorization.receipt.proposalDigest}`,
    ],
    launchAuthorizationRef,
  };
  const selection = createValidationModel({ route });
  const abort = new AbortController();
  const delegate = new DelegateLoopSession({
    id: turn.turnId,
    instructions: [
      "This is one supervised writable product contribution, not an open-ended implementation loop.",
      "Delegate exactly one contribution using the exact JSON below; do not write product files in the parent loop.",
      JSON.stringify(expectedCall),
      "After the child settles, report only its settlement status and uncovered obligations.",
      "Writing a candidate diff does not grant commit, merge, publication, or product-acceptance authority.",
    ].join("\n"),
    messages: [{
      role: "user",
      content: "Execute the one authorized canonical-content and deterministic-projection contribution.",
    }],
    tasks: [{ subject: "Implement Blog content model", description: task }],
    whole: {
      revision: "agent-era-blog-content-model-v1",
      sourceRefs: [...SOURCE_REFS],
      obligations: [OBLIGATION],
      settledContributionKeys: [],
      guardRefs: [GUARD_REF],
      capabilityNeeds: [CAPABILITY],
      reconstructionOwner: "principal:agent-era-blog-supervisor",
      workspace: {
        root: worktree,
        readPaths: ["."],
        writePaths: ["db/schema.ts", "app/blog"],
        excludePaths: [".git", ".env", ".dev.vars", ".openai/hosting.json"],
        allowedCommands: [],
      },
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
    maxModelSteps: 4,
    maxDelegateBatches: 1,
    maxCallsPerStep: 1,
    maxOutputTokens: 2_000,
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
  return { turn, controller };
};

export interface ConsumeBlogExecutionAuthorizationArguments {
  readonly home: string;
  readonly missionId: string;
  readonly worktree: string;
  readonly receiptPath?: string;
  readonly now?: () => string;
}

export interface ConsumedBlogExecutionAuthorization {
  readonly receipt: ExecutionAuthorizationReceipt;
  readonly claimPath: string;
  readonly gitHead: string;
}

/**
 * Validate and atomically consume one local Principal authorization before any
 * model or writable-effect object is created. A failed validation never falls
 * back to an unreceipted Blog execution.
 */
export function consumeBlogExecutionAuthorization(
  arguments_: ConsumeBlogExecutionAuthorizationArguments,
): ConsumedBlogExecutionAuthorization {
  const home = resolve(arguments_.home);
  const worktree = realpathSync(resolve(arguments_.worktree));
  if (arguments_.missionId !== MISSION_ID) {
    throw new Error(`Blog authorization mission mismatch: expected ${MISSION_ID}, received ${arguments_.missionId}`);
  }
  const expectedReceiptPath = executionAuthorizationReceiptPath(
    home,
    PROJECT_ID,
    MISSION_ID,
    PROPOSAL_ID,
  );
  const receiptPath = requiredReceiptPath(arguments_.receiptPath, expectedReceiptPath);
  const receipt = readReceipt(receiptPath);
  if (receipt.projectId !== PROJECT_ID) {
    throw new Error(`Blog authorization project mismatch: expected ${PROJECT_ID}, received ${receipt.projectId}`);
  }
  if (receipt.missionId !== MISSION_ID) {
    throw new Error(`Blog authorization receipt names Mission ${receipt.missionId}, expected ${MISSION_ID}`);
  }
  if (receipt.proposalId !== PROPOSAL_ID) {
    throw new Error(`Blog authorization receipt names proposal ${receipt.proposalId}, expected ${PROPOSAL_ID}`);
  }
  if (receipt.missionSource.path !== MISSION_SOURCE) {
    throw new Error(`Blog authorization Mission source must be ${MISSION_SOURCE}`);
  }

  const gitHead = worktreeHead(worktree);
  if (receipt.missionSource.gitHead !== gitHead) {
    throw new Error(
      `Blog authorization Git head mismatch: receipt ${receipt.missionSource.gitHead}, candidate ${gitHead}`,
    );
  }

  const missionPath = join(worktree, MISSION_SOURCE);
  const record = readCandidateMission(missionPath);
  if (record.id !== MISSION_ID) {
    throw new Error(`candidate Mission source names ${record.id}, expected ${MISSION_ID}`);
  }
  const proposal = record.executionProposal;
  if (proposal === undefined) throw new Error(`candidate Mission ${MISSION_ID} has no executionProposal`);
  if (proposal.proposalId !== PROPOSAL_ID) {
    throw new Error(`candidate Mission proposal is ${proposal.proposalId}, expected ${PROPOSAL_ID}`);
  }
  const proposalDigest = missionExecutionProposalDigest(proposal);
  if (receipt.proposalDigest !== proposalDigest) {
    throw new Error(
      `Blog authorization proposal digest mismatch: receipt ${receipt.proposalDigest}, candidate ${proposalDigest}`,
    );
  }

  assertCandidatePreflight(worktree);
  assertAdapterBoundary(proposal);
  const currentBoundary = executionBoundary(proposal);
  if (stableStringify(receipt.executionBoundary) !== stableStringify(currentBoundary)) {
    throw new Error("Blog authorization execution boundary does not match the candidate Mission proposal");
  }
  assertAuthorizedChoices(receipt, proposal);

  const claimPath = claimAuthorization(
    home,
    receiptPath,
    receipt,
    worktree,
    gitHead,
    arguments_.now ?? (() => new Date().toISOString()),
  );
  return { receipt, claimPath, gitHead };
}

function prepareContribution(worktree: string, call: DelegateCall) {
  if (stableStringify(call) !== stableStringify(expectedCall)) {
    throw new Error("the Blog parent changed its one host-authorized semantic contribution");
  }
  return {
    dependsOn: [],
    taskShape: {
      referenceProfile: { id: PROFILE_ID, revision: PROFILE_REVISION },
      evidence: {
        status: "provisional-observed" as const,
        revision: PROFILE_REVISION,
        refs: ["evidence:first-real-isolated-writable-blog-trial"],
      },
      disposition: "guarded" as const,
      principalInstability:
        "the model can create a candidate content architecture, but build correctness and product semantics require independent review",
      guardRefs: [GUARD_REF],
      reconstructionOwner: "principal:agent-era-blog-supervisor",
      overloadDisposition: "escalate" as const,
    },
    cell: cell(worktree, call),
  };
}

function cell(worktree: string, call: DelegateCall): CellInput {
  return {
    id: call.key,
    intent: call.task,
    workspace: {
      root: worktree,
      readPaths: ["."],
      writePaths: ["db/schema.ts", "app/blog"],
      excludePaths: [".git", ".env", ".dev.vars", ".openai/hosting.json"],
      allowedCommands: [],
    },
    instructions: [
      "Treat the project guidance and DESIGN.md as authority over generic blog conventions.",
      "Use write_file only for complete files inside the declared write scope.",
      "Preserve existing package and Cloudflare adapter boundaries.",
      "Do not infer that artifact verification or task completion means semantic acceptance.",
    ],
    capabilities: ["read", "write"],
    context: [],
    capabilitiesRequired: [call.capabilityNeed],
    acceptance: [...call.acceptance],
    artifacts: [
      {
        path: "db/schema.ts",
        instructions: "D1 schema exporting posts, publicationRevisions, claims, sources, claimSources, and projections with revision-scoped authority and provenance.",
      },
      {
        path: "app/blog/content.ts",
        instructions: "Export seededPublishedRevision plus pure buildReadingField(revision) for deterministic brief/source-map projections and black-box verification.",
      },
    ],
    budget: {
      maxSteps: 14,
      estimatedTokens: 60_000,
      estimatedTokensTolerance: 1,
      maxDurationMs: 300_000,
      maxCommandOutputBytes: 8_000,
    },
    executionProfile: {
      id: PROFILE_ID,
      version: "execution-profile.v1",
      provider: "deepseek",
      model: "deepseek-v4-flash",
      contextPolicy: "project guidance plus bounded repository reads; isolated candidate writes",
      toolSurface: "list_files, read_file, write_file; no commands",
      parallelism: "serial",
    },
    outputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["completed", "needs_repartition", "unverifiable"] },
        summary: { type: "string" },
        files: {
          type: "array",
          items: { type: "string", enum: ["db/schema.ts", "app/blog/content.ts"] },
          minItems: 2,
          maxItems: 2,
        },
        remainingRisk: { type: "string" },
      },
      required: ["status", "summary", "files", "remainingRisk"],
      additionalProperties: false,
    },
  };
}

function requiredWorktree(): string {
  const value = process.env[WORKTREE_ENV]?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error(`${WORKTREE_ENV} must name the operator-selected detached Blog worktree`);
  }
  if (!isAbsolute(value)) throw new Error(`${WORKTREE_ENV} must be an absolute path`);
  return realpathSync(resolve(value));
}

function requiredReceiptPath(explicitPath: string | undefined, expectedPath: string): string {
  const value = explicitPath ?? process.env[AUTHORIZATION_RECEIPT_ENV]?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error(`${AUTHORIZATION_RECEIPT_ENV} must name the local Principal authorization receipt`);
  }
  if (!isAbsolute(value)) throw new Error(`${AUTHORIZATION_RECEIPT_ENV} must be an absolute path`);
  const path = resolve(value);
  if (path !== expectedPath) {
    throw new Error(
      `${AUTHORIZATION_RECEIPT_ENV} must equal the deterministic receipt path ${expectedPath}`,
    );
  }
  return path;
}

function readReceipt(path: string): ExecutionAuthorizationReceipt {
  let source: string;
  try {
    if (!lstatSync(path).isFile()) throw new Error("not a regular file");
    source = readFileSync(path, "utf8");
  } catch (error: unknown) {
    throw new Error(
      `cannot read Blog authorization receipt ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch (error: unknown) {
    throw new Error(
      `invalid JSON in Blog authorization receipt ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return ExecutionAuthorizationReceiptSchema.parse(value);
}

function worktreeHead(worktree: string): string {
  try {
    return execFileSync("git", ["-C", worktree, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error: unknown) {
    throw new Error(
      `cannot observe candidate Blog worktree HEAD: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function assertCandidatePreflight(worktree: string): void {
  let canonicalRoot: string;
  try {
    canonicalRoot = realpathSync(worktree);
  } catch (error: unknown) {
    throw new Error(
      `cannot resolve candidate Blog worktree: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (canonicalRoot !== worktree) {
    throw new Error(`candidate Blog worktree must use its canonical absolute path: ${canonicalRoot}`);
  }
  const top = realpathSync(gitText(worktree, ["rev-parse", "--show-toplevel"]));
  if (top !== worktree) throw new Error("candidate Blog path must be the exact Git worktree root");
  if (!lstatSync(join(worktree, ".git")).isFile()) {
    throw new Error("candidate Blog workspace must be a linked Git worktree");
  }
  if (gitText(worktree, ["status", "--porcelain=v1", "--untracked-files=all"]).length !== 0) {
    throw new Error("candidate Blog worktree must be clean before consuming authorization");
  }
  const symbolicHead = gitResult(worktree, ["symbolic-ref", "-q", "HEAD"]);
  if (symbolicHead.status === 0) {
    throw new Error("candidate Blog worktree must be detached before consuming authorization");
  }
  if (symbolicHead.status !== 1) {
    throw new Error(`cannot verify detached candidate Blog HEAD: ${symbolicHead.stderr.trim()}`);
  }
  const listed = gitText(worktree, ["worktree", "list", "--porcelain", "-z"])
    .split("\0")
    .filter((field) => field.startsWith("worktree "))
    .map((field) => field.slice("worktree ".length));
  if (!listed.some((path) => {
    try {
      return realpathSync(path) === worktree;
    } catch {
      return false;
    }
  })) {
    throw new Error("candidate Blog workspace is not present in Git worktree list");
  }
}

function gitText(worktree: string, arguments_: readonly string[]): string {
  const result = gitResult(worktree, arguments_);
  if (result.status !== 0) {
    throw new Error(`git ${arguments_[0] ?? "command"} failed: ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

function gitResult(
  worktree: string,
  arguments_: readonly string[],
): { readonly status: number | null; readonly stdout: string; readonly stderr: string } {
  const result = spawnSync("git", ["-C", worktree, ...arguments_], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error !== undefined) throw result.error;
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function readCandidateMission(path: string) {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(path, "utf8"));
  } catch (error: unknown) {
    throw new Error(
      `cannot read candidate Blog Mission ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return parseMissionRecord(value);
}

function executionBoundary(proposal: MissionExecutionProposal) {
  return {
    runtimeRef: proposal.runtimeRef,
    runtimeDigest: proposal.runtimeDigest,
    externalProvider: proposal.externalProvider,
    externalDisclosure: proposal.externalDisclosure,
    candidateWorktree: proposal.candidateWorktree,
    scope: proposal.scope,
    budget: proposal.budget,
  };
}

function assertAdapterBoundary(proposal: MissionExecutionProposal): void {
  if (proposal.runtimeRef !== RUNTIME_REF) {
    throw new Error(`Blog proposal runtimeRef must be ${RUNTIME_REF}`);
  }
  const observedRuntimeDigest = currentBlogRuntimeDigest();
  if (proposal.runtimeDigest !== observedRuntimeDigest) {
    throw new Error(
      `Blog proposal runtimeDigest must match the loaded runtime source: expected ${observedRuntimeDigest}, received ${proposal.runtimeDigest}`,
    );
  }
  if (
    proposal.externalProvider.name !== "DeepSeek" ||
    proposal.externalProvider.boundary !== "external"
  ) {
    throw new Error("Blog proposal must use the declared external DeepSeek provider");
  }
  if (proposal.candidateWorktree.rootRef !== `environment:${WORKTREE_ENV}`) {
    throw new Error(`Blog proposal candidate rootRef must be environment:${WORKTREE_ENV}`);
  }
  if (stableStringify(proposal.scope) !== stableStringify(EXPECTED_SCOPE)) {
    throw new Error("Blog proposal write scope or command boundary does not match this runtime");
  }
  if (stableStringify(proposal.budget) !== stableStringify(EXPECTED_BUDGET)) {
    throw new Error("Blog proposal budget does not match this runtime");
  }
}

function assertAuthorizedChoices(
  receipt: ExecutionAuthorizationReceipt,
  proposal: MissionExecutionProposal,
): void {
  const selected = new Map<string, string>();
  for (const choice of receipt.choices) {
    if (selected.has(choice.decisionId)) {
      throw new Error(`Blog authorization repeats decision ${choice.decisionId}`);
    }
    selected.set(choice.decisionId, choice.replyKey);
  }
  if (selected.size !== proposal.pendingDecisions.length) {
    throw new Error("Blog authorization choices must cover every pending decision exactly once");
  }
  for (const decision of proposal.pendingDecisions) {
    const replyKey = selected.get(decision.id);
    if (replyKey === undefined) {
      throw new Error(`Blog authorization is missing decision ${decision.id}`);
    }
    if (!decision.options.some((option) => option.replyKey === replyKey)) {
      throw new Error(`Blog authorization uses undeclared reply key ${replyKey} for ${decision.id}`);
    }
  }
  for (const decisionId of selected.keys()) {
    if (!proposal.pendingDecisions.some((decision) => decision.id === decisionId)) {
      throw new Error(`Blog authorization contains unknown decision ${decisionId}`);
    }
  }
  if (selected.get("external-disclosure") !== "ALLOW") {
    throw new Error("Blog authorization requires external-disclosure=ALLOW");
  }

  const expectedResults = proposal.pendingDecisions.map((decision) => {
    const replyKey = selected.get(decision.id)!;
    const option = decision.options.find((candidate) => candidate.replyKey === replyKey)!;
    return { decisionId: decision.id, result: option.immediateResult };
  });
  if (stableStringify(receipt.immediateAuthorizedResults) !== stableStringify(expectedResults)) {
    throw new Error("Blog authorization immediate results do not match the selected proposal choices");
  }
}

function claimAuthorization(
  home: string,
  receiptPath: string,
  receipt: ExecutionAuthorizationReceipt,
  worktree: string,
  gitHead: string,
  now: () => string,
): string {
  const claimPath = join(
    home,
    "state",
    "execution-authorization-claims",
    `${receipt.authorizationId}.json`,
  );
  mkdirSync(dirname(claimPath), { recursive: true });
  const claim = {
    version: "rosso.execution-authorization-claim.v1",
    authorizationId: receipt.authorizationId,
    projectId: receipt.projectId,
    missionId: receipt.missionId,
    proposalId: receipt.proposalId,
    proposalDigest: receipt.proposalDigest,
    receipt: {
      ref: relative(home, receiptPath),
      digest: createHash("sha256").update(stableStringify(receipt)).digest("hex"),
    },
    localEvidence: {
      worktree,
      gitHead,
    },
    claimedAt: now(),
  };
  try {
    writeFileSync(claimPath, `${JSON.stringify(claim, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error &&
      (error as { code?: unknown }).code === "EEXIST") {
      throw new Error(`Blog authorization ${receipt.authorizationId} was already consumed`);
    }
    throw new Error(
      `cannot claim Blog authorization in ROSSO_HOME: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return claimPath;
}
