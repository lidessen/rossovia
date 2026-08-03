import { spawnSync } from "node:child_process";
import {
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import {
  executionAuthorizationReceiptPath,
  ExecutionAuthorizationReceiptSchema,
  type ExecutionAuthorizationReceipt,
} from "../../workbench/src/execution-authorization";
import {
  executionAuthorizationClaimPath,
  executionAuthorizationReceiptDigest,
  ExecutionAuthorizationClaimSchema,
  validateExecutionAuthorizationClaim,
} from "../../workbench/src/execution-authorization-claim";
import {
  missionExecutionProposalDigest,
  type MissionExecutionProposal,
} from "../../workbench/src/mission-execution-proposal";
import { parseMissionRecord } from "../../workbench/src/missions";
import { stableStringify } from "../src/canonical-json";

export interface ProjectExecutionAuthorizationContract {
  readonly projectId: string;
  readonly missionId: string;
  readonly proposalId: string;
  readonly missionSource: string;
  readonly runtimeRef: string;
  readonly runtimeDigest: string;
  readonly proposalVersion: MissionExecutionProposal["version"];
  readonly externalProvider: MissionExecutionProposal["externalProvider"];
  readonly externalDisclosure: MissionExecutionProposal["externalDisclosure"];
  readonly candidateRootRef: string;
  readonly scope: MissionExecutionProposal["scope"];
  readonly budget: MissionExecutionProposal["budget"];
  readonly requiredChoices: readonly {
    readonly decisionId: string;
    readonly replyKey: string;
  }[];
}

export interface ConsumeProjectExecutionAuthorizationArguments {
  readonly home: string;
  readonly missionId: string;
  readonly worktree: string;
  readonly receiptPath: string;
  readonly contract: ProjectExecutionAuthorizationContract;
  readonly now?: () => string;
}

export interface ConsumedProjectExecutionAuthorization {
  readonly receipt: ExecutionAuthorizationReceipt;
  readonly proposal: MissionExecutionProposal;
  readonly claimPath: string;
  readonly gitHead: string;
  readonly worktree: string;
}

export interface ValidatedProjectExecutionAuthorization {
  readonly home: string;
  readonly missionId: string;
  readonly worktree: string;
  readonly receiptPath: string;
  readonly contract: ProjectExecutionAuthorizationContract;
  readonly receipt: ExecutionAuthorizationReceipt;
  readonly proposal: MissionExecutionProposal;
  readonly gitHead: string;
}

export interface RecoveredProjectExecutionAuthorization {
  readonly receipt: ExecutionAuthorizationReceipt;
  readonly proposal: MissionExecutionProposal;
  readonly claimPath: string;
  readonly gitHead: string;
  readonly worktree: string;
}

/**
 * Adapter-neutral one-use authorization consumption for project-specific
 * Mission runtimes. The contract is supplied by the runtime source; the
 * candidate Mission and Principal receipt must both reproduce it exactly.
 */
export function consumeProjectExecutionAuthorization(
  arguments_: ConsumeProjectExecutionAuthorizationArguments,
): ConsumedProjectExecutionAuthorization {
  return claimProjectExecutionAuthorization(
    validateProjectExecutionAuthorization(arguments_),
    arguments_.now,
  );
}

/**
 * Validates the complete authorization and candidate boundary without
 * consuming the receipt. Runtimes use this phase to finish every other
 * side-effect-free launch precondition before the one-use claim.
 */
export function validateProjectExecutionAuthorization(
  arguments_: ConsumeProjectExecutionAuthorizationArguments,
): ValidatedProjectExecutionAuthorization {
  const contract = arguments_.contract;
  const home = resolve(arguments_.home);
  const worktree = realpathSync(resolve(arguments_.worktree));
  if (arguments_.missionId !== contract.missionId) {
    throw new Error(
      `execution authorization Mission mismatch: expected ${contract.missionId}, received ${arguments_.missionId}`,
    );
  }

  const expectedReceiptPath = executionAuthorizationReceiptPath(
    home,
    contract.projectId,
    contract.missionId,
    contract.proposalId,
  );
  const receiptPath = resolve(arguments_.receiptPath);
  if (receiptPath !== expectedReceiptPath) {
    throw new Error(
      `execution authorization receipt must equal the deterministic path ${expectedReceiptPath}`,
    );
  }
  const receipt = readReceipt(receiptPath);
  assertReceiptIdentity(receipt, contract);

  const gitHead = worktreeHead(worktree);
  if (receipt.missionSource.gitHead !== gitHead) {
    throw new Error(
      `execution authorization Git head mismatch: receipt ${receipt.missionSource.gitHead}, candidate ${gitHead}`,
    );
  }

  const record = readCandidateMission(join(worktree, contract.missionSource));
  if (record.id !== contract.missionId) {
    throw new Error(
      `candidate Mission source names ${record.id}, expected ${contract.missionId}`,
    );
  }
  const proposal = record.executionProposal;
  if (proposal === undefined) {
    throw new Error(`candidate Mission ${contract.missionId} has no executionProposal`);
  }
  if (proposal.version !== contract.proposalVersion) {
    throw new Error(
      `candidate Mission proposal version is ${proposal.version}, expected ${contract.proposalVersion}`,
    );
  }
  if (proposal.proposalId !== contract.proposalId) {
    throw new Error(
      `candidate Mission proposal is ${proposal.proposalId}, expected ${contract.proposalId}`,
    );
  }
  const proposalDigest = missionExecutionProposalDigest(proposal);
  if (receipt.proposalDigest !== proposalDigest) {
    throw new Error(
      `execution authorization proposal digest mismatch: receipt ${receipt.proposalDigest}, candidate ${proposalDigest}`,
    );
  }

  assertCandidatePreflight(worktree);
  assertAdapterBoundary(proposal, contract);
  const boundary = executionBoundary(proposal);
  if (stableStringify(receipt.executionBoundary) !== stableStringify(boundary)) {
    throw new Error(
      "execution authorization boundary does not match the candidate Mission proposal",
    );
  }
  assertAuthorizedChoices(receipt, proposal, contract.requiredChoices);

  return {
    home,
    missionId: arguments_.missionId,
    worktree,
    receiptPath,
    contract,
    receipt,
    proposal,
    gitHead,
  };
}

/**
 * Revalidates an already-consumed one-use authorization without requiring the
 * candidate to be clean. This is a read-only recovery boundary: it can
 * recognize the exact dirty worktree produced by the consumed execution, but
 * it cannot create another claim or authorize another execution.
 */
export function validateConsumedProjectExecutionAuthorization(
  arguments_: ConsumeProjectExecutionAuthorizationArguments,
): RecoveredProjectExecutionAuthorization {
  const contract = arguments_.contract;
  const home = resolve(arguments_.home);
  const worktree = realpathSync(resolve(arguments_.worktree));
  if (arguments_.missionId !== contract.missionId) {
    throw new Error(
      `execution authorization Mission mismatch: expected ${contract.missionId}, received ${arguments_.missionId}`,
    );
  }
  const expectedReceiptPath = executionAuthorizationReceiptPath(
    home,
    contract.projectId,
    contract.missionId,
    contract.proposalId,
  );
  const receiptPath = resolve(arguments_.receiptPath);
  if (receiptPath !== expectedReceiptPath) {
    throw new Error(
      `execution authorization receipt must equal the deterministic path ${expectedReceiptPath}`,
    );
  }
  const receipt = readReceipt(receiptPath);
  assertReceiptIdentity(receipt, contract);
  const claimPath = executionAuthorizationClaimPath(
    home,
    receipt.authorizationId,
  );
  const claim = ExecutionAuthorizationClaimSchema.parse(
    JSON.parse(readFileSync(claimPath, "utf8")),
  );
  validateExecutionAuthorizationClaim(claim, {
    home,
    claimPath,
    receiptPath,
    receipt,
    projectId: contract.projectId,
    missionId: contract.missionId,
    proposalId: contract.proposalId,
    proposalDigest: receipt.proposalDigest,
  });
  assertCandidateIdentity(worktree);
  const gitHead = worktreeHead(worktree);
  if (
    claim.localEvidence.worktree !== worktree
    || claim.localEvidence.gitHead !== gitHead
    || receipt.missionSource.gitHead !== gitHead
  ) {
    throw new Error(
      "consumed execution authorization no longer matches the candidate worktree and HEAD",
    );
  }
  const missionDiff = gitResult(
    worktree,
    ["diff", "--quiet", gitHead, "--", contract.missionSource],
  );
  if (missionDiff.status !== 0) {
    throw new Error(
      "candidate Mission source changed after the execution authorization was consumed",
    );
  }
  const record = readCandidateMission(join(worktree, contract.missionSource));
  const proposal = record.executionProposal;
  if (
    record.id !== contract.missionId
    || proposal === undefined
    || proposal.version !== contract.proposalVersion
    || proposal.proposalId !== contract.proposalId
    || missionExecutionProposalDigest(proposal) !== receipt.proposalDigest
  ) {
    throw new Error(
      "candidate Mission proposal no longer matches the consumed execution authorization",
    );
  }
  assertAdapterBoundary(proposal, contract);
  if (
    stableStringify(receipt.executionBoundary)
    !== stableStringify(executionBoundary(proposal))
  ) {
    throw new Error(
      "consumed execution authorization boundary no longer matches the candidate Mission proposal",
    );
  }
  assertAuthorizedChoices(receipt, proposal, contract.requiredChoices);
  return {
    receipt,
    proposal,
    claimPath,
    gitHead,
    worktree,
  };
}

/**
 * Revalidates the candidate and receipt immediately before the atomic claim.
 * This keeps a prior validation useful for launch preparation without turning
 * it into stale authority.
 */
export function claimProjectExecutionAuthorization(
  validated: ValidatedProjectExecutionAuthorization,
  now: () => string = () => new Date().toISOString(),
): ConsumedProjectExecutionAuthorization {
  const refreshed = validateProjectExecutionAuthorization({
    home: validated.home,
    missionId: validated.missionId,
    worktree: validated.worktree,
    receiptPath: validated.receiptPath,
    contract: validated.contract,
  });
  if (
    stableStringify(refreshed.receipt)
      !== stableStringify(validated.receipt)
    || missionExecutionProposalDigest(refreshed.proposal)
      !== missionExecutionProposalDigest(validated.proposal)
    || refreshed.gitHead !== validated.gitHead
  ) {
    throw new Error(
      "execution authorization boundary drifted after launch preflight",
    );
  }
  const claimPath = claimAuthorization(
    refreshed.home,
    refreshed.receiptPath,
    refreshed.receipt,
    refreshed.worktree,
    refreshed.gitHead,
    now,
  );
  return {
    receipt: refreshed.receipt,
    proposal: refreshed.proposal,
    claimPath,
    gitHead: refreshed.gitHead,
    worktree: refreshed.worktree,
  };
}

function readReceipt(path: string): ExecutionAuthorizationReceipt {
  let source: string;
  try {
    if (!lstatSync(path).isFile()) throw new Error("not a regular file");
    source = readFileSync(path, "utf8");
  } catch (error: unknown) {
    throw new Error(
      `cannot read execution authorization receipt ${path}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  try {
    return ExecutionAuthorizationReceiptSchema.parse(JSON.parse(source));
  } catch (error: unknown) {
    throw new Error(
      `invalid execution authorization receipt ${path}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function assertReceiptIdentity(
  receipt: ExecutionAuthorizationReceipt,
  contract: ProjectExecutionAuthorizationContract,
): void {
  if (receipt.projectId !== contract.projectId) {
    throw new Error(
      `execution authorization project mismatch: expected ${contract.projectId}, received ${receipt.projectId}`,
    );
  }
  if (receipt.missionId !== contract.missionId) {
    throw new Error(
      `execution authorization receipt names Mission ${receipt.missionId}, expected ${contract.missionId}`,
    );
  }
  if (receipt.proposalId !== contract.proposalId) {
    throw new Error(
      `execution authorization receipt names proposal ${receipt.proposalId}, expected ${contract.proposalId}`,
    );
  }
  if (receipt.missionSource.path !== contract.missionSource) {
    throw new Error(
      `execution authorization Mission source must be ${contract.missionSource}`,
    );
  }
}

function assertAdapterBoundary(
  proposal: MissionExecutionProposal,
  contract: ProjectExecutionAuthorizationContract,
): void {
  if (proposal.runtimeRef !== contract.runtimeRef) {
    throw new Error(`proposal runtimeRef must be ${contract.runtimeRef}`);
  }
  if (proposal.runtimeDigest !== contract.runtimeDigest) {
    throw new Error(
      `proposal runtimeDigest must match the loaded runtime source: expected ${contract.runtimeDigest}, received ${proposal.runtimeDigest}`,
    );
  }
  if (
    stableStringify(proposal.externalProvider)
      !== stableStringify(contract.externalProvider)
  ) {
    throw new Error("proposal external provider does not match this runtime");
  }
  if (
    stableStringify(proposal.externalDisclosure)
      !== stableStringify(contract.externalDisclosure)
  ) {
    throw new Error("proposal external disclosure does not match this runtime");
  }
  if (proposal.candidateWorktree.rootRef !== contract.candidateRootRef) {
    throw new Error(
      `proposal candidate rootRef must be ${contract.candidateRootRef}`,
    );
  }
  if (stableStringify(proposal.scope) !== stableStringify(contract.scope)) {
    throw new Error(
      "proposal read, exclusion, write, or command boundary does not match this runtime",
    );
  }
  if (stableStringify(proposal.budget) !== stableStringify(contract.budget)) {
    throw new Error("proposal budget does not match this runtime");
  }
}

function assertAuthorizedChoices(
  receipt: ExecutionAuthorizationReceipt,
  proposal: MissionExecutionProposal,
  requiredChoices: ProjectExecutionAuthorizationContract["requiredChoices"],
): void {
  const selected = new Map<string, string>();
  for (const choice of receipt.choices) {
    if (selected.has(choice.decisionId)) {
      throw new Error(`execution authorization repeats decision ${choice.decisionId}`);
    }
    selected.set(choice.decisionId, choice.replyKey);
  }
  if (selected.size !== proposal.pendingDecisions.length) {
    throw new Error(
      "execution authorization choices must cover every pending decision exactly once",
    );
  }
  for (const decision of proposal.pendingDecisions) {
    const selectedReply = selected.get(decision.id);
    if (
      selectedReply === undefined
      || !decision.options.some((option) => option.replyKey === selectedReply)
    ) {
      throw new Error(
        `execution authorization has no declared reply for decision ${decision.id}`,
      );
    }
  }
  for (const required of requiredChoices) {
    if (selected.get(required.decisionId) !== required.replyKey) {
      throw new Error(
        `execution authorization requires ${required.decisionId}=${required.replyKey}`,
      );
    }
  }
  const expectedResults = proposal.pendingDecisions.map((decision) => {
    const selectedReply = selected.get(decision.id)!;
    const option = decision.options.find(
      (candidate) => candidate.replyKey === selectedReply,
    )!;
    return { decisionId: decision.id, result: option.immediateResult };
  });
  if (
    stableStringify(receipt.immediateAuthorizedResults)
      !== stableStringify(expectedResults)
  ) {
    throw new Error(
      "execution authorization immediate results do not match the selected proposal choices",
    );
  }
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

function worktreeHead(worktree: string): string {
  return gitText(worktree, ["rev-parse", "HEAD"]);
}

function assertCandidatePreflight(worktree: string): void {
  assertCandidateIdentity(worktree);
  if (
    gitText(worktree, ["status", "--porcelain=v1", "--untracked-files=all"])
      .length !== 0
  ) {
    throw new Error("candidate worktree must be clean before consuming authorization");
  }
}

function assertCandidateIdentity(worktree: string): void {
  const canonicalRoot = realpathSync(worktree);
  if (canonicalRoot !== worktree) {
    throw new Error(
      `candidate worktree must use its canonical absolute path: ${canonicalRoot}`,
    );
  }
  const top = realpathSync(gitText(worktree, ["rev-parse", "--show-toplevel"]));
  if (top !== worktree) {
    throw new Error("candidate path must be the exact Git worktree root");
  }
  if (!lstatSync(join(worktree, ".git")).isFile()) {
    throw new Error("candidate workspace must be a linked Git worktree");
  }
  const symbolicHead = gitResult(worktree, ["symbolic-ref", "-q", "HEAD"]);
  if (symbolicHead.status === 0) {
    throw new Error("candidate worktree must be detached before consuming authorization");
  }
  if (symbolicHead.status !== 1) {
    throw new Error(
      `cannot verify detached candidate HEAD: ${symbolicHead.stderr.trim()}`,
    );
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
    throw new Error("candidate workspace is not present in Git worktree list");
  }
}

function readCandidateMission(path: string) {
  try {
    return parseMissionRecord(JSON.parse(readFileSync(path, "utf8")));
  } catch (error: unknown) {
    throw new Error(
      `cannot read candidate Mission ${path}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function gitText(worktree: string, arguments_: readonly string[]): string {
  const result = gitResult(worktree, arguments_);
  if (result.status !== 0) {
    throw new Error(
      `git ${arguments_[0] ?? "command"} failed: ${result.stderr.trim()}`,
    );
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

function claimAuthorization(
  home: string,
  receiptPath: string,
  receipt: ExecutionAuthorizationReceipt,
  worktree: string,
  gitHead: string,
  now: () => string,
): string {
  const claimPath = executionAuthorizationClaimPath(
    home,
    receipt.authorizationId,
  );
  mkdirSync(dirname(claimPath), { recursive: true });
  const claim = ExecutionAuthorizationClaimSchema.parse({
    version: "rosso.execution-authorization-claim.v1",
    authorizationId: receipt.authorizationId,
    projectId: receipt.projectId,
    missionId: receipt.missionId,
    proposalId: receipt.proposalId,
    proposalDigest: receipt.proposalDigest,
    receipt: {
      ref: relative(home, receiptPath),
      digest: executionAuthorizationReceiptDigest(receipt),
    },
    localEvidence: { worktree, gitHead },
    claimedAt: now(),
  });
  validateExecutionAuthorizationClaim(claim, {
    home,
    claimPath,
    receiptPath,
    receipt,
    projectId: receipt.projectId,
    missionId: receipt.missionId,
    proposalId: receipt.proposalId,
    proposalDigest: receipt.proposalDigest,
  });
  try {
    writeFileSync(claimPath, `${JSON.stringify(claim, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
  } catch (error: unknown) {
    if (
      error !== null
      && typeof error === "object"
      && "code" in error
      && error.code === "EEXIST"
    ) {
      throw new Error(
        `execution authorization ${receipt.authorizationId} was already consumed`,
      );
    }
    throw new Error(
      `cannot claim execution authorization: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  return claimPath;
}
