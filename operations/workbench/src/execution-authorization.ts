import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { z } from "zod";
import { loadHome, workspaceFor } from "./home";
import {
  MissionExecutionBoundarySchema,
  missionExecutionProposalDigest,
  MissionExecutionProposalSchema,
  type MissionExecutionProposal,
} from "./mission-execution-proposal";
import { parseMissionRecord } from "./missions";
import { runCommand } from "./process";
import { registeredProjectByQuery } from "./projects";
import { observeWorkspace, requiredGit } from "./workspace";

const nonempty = z.string().refine((value) => value.trim().length > 0, "must be a non-empty string");
const missionId = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const digest = z.string().regex(/^[0-9a-f]{64}$/);
const structuredRef = z.string().regex(
  /^[a-z][a-z0-9-]*:[^\s]+$/,
  "must be a structured reference such as conversation:thread/turn",
);
const principalRef = z.string().regex(
  /^principal:[^\s]+$/,
  "must identify the authorizing Principal as principal:<identity>",
);

const ExecutionBoundarySchema = MissionExecutionBoundarySchema;

const AuthorizedChoiceSchema = z.object({
  decisionId: missionId,
  replyKey: nonempty,
}).strict();

const ImmediateAuthorizedResultSchema = z.object({
  decisionId: missionId,
  result: nonempty,
}).strict();

const ExecutionAuthorizationReceiptBaseShape = {
  authorizationId: z.string().uuid(),
  projectId: nonempty,
  missionId,
  missionSource: z.object({
    path: nonempty,
    gitHead: z.string().regex(/^[0-9a-f]{40,64}$/),
  }).strict(),
  proposalId: missionId,
  proposalDigest: digest,
  choices: z.array(AuthorizedChoiceSchema).min(1),
  immediateAuthorizedResults: z.array(ImmediateAuthorizedResultSchema).min(1),
  executionBoundary: ExecutionBoundarySchema,
  authorityBoundary: z.object({
    kind: z.literal("single-execution"),
    maxUses: z.literal(1),
    externalDisclosure: z.literal("authorized-for-declared-boundary"),
    budgetRelease: z.literal("authorized-for-declared-budget"),
    write: z.literal("authorized-for-declared-paths"),
    execute: z.literal("authorized-once"),
    commit: z.literal("withheld"),
    merge: z.literal("withheld"),
    publish: z.literal("withheld"),
    productAcceptance: z.literal("withheld"),
  }).strict(),
  actorRef: principalRef,
  sourceRef: structuredRef,
  attributionBoundary: z.literal("references-are-attribution-not-authentication"),
  authorizedAt: nonempty,
} as const;

const PrincipalWorkbenchActionSchema = z.object({
  requestId: z.string().uuid(),
  channel: z.literal("local-principal-workbench-ui"),
  acknowledgements: z.object({
    externalDisclosure: z.literal(true),
    forecastOnlyBudget: z.literal(true),
    oneUseLaunchAndIntegrationWithheld: z.literal(true),
  }).strict(),
  identityAssurance: z.literal("unverified-local-interaction"),
}).strict();

const ExecutionAuthorizationReceiptV1Schema = z.object({
  version: z.literal("rosso.execution-authorization-receipt.v1"),
  ...ExecutionAuthorizationReceiptBaseShape,
}).strict();

const ExecutionAuthorizationReceiptV2Schema = z.object({
  version: z.literal("rosso.execution-authorization-receipt.v2"),
  ...ExecutionAuthorizationReceiptBaseShape,
  principalAction: PrincipalWorkbenchActionSchema,
}).strict();

export const ExecutionAuthorizationReceiptSchema = z.discriminatedUnion("version", [
  ExecutionAuthorizationReceiptV1Schema,
  ExecutionAuthorizationReceiptV2Schema,
]);

export type ExecutionAuthorizationReceipt = z.infer<typeof ExecutionAuthorizationReceiptSchema>;
export type PrincipalWorkbenchAction = z.infer<typeof PrincipalWorkbenchActionSchema>;

export interface ExecutionAuthorizationArguments {
  readonly project: string;
  readonly missionId: string;
  readonly proposalId: string;
  readonly proposalDigest: string;
  readonly choices: readonly string[];
  readonly actorRef: string;
  readonly sourceRef: string;
  readonly principalAction?: PrincipalWorkbenchAction;
}

export interface ExecutionAuthorizationResult {
  readonly receiptPath: string;
  readonly receipt: ExecutionAuthorizationReceipt;
}

export interface ExecutionInspection {
  readonly version: "rosso.execution-inspection.v1";
  readonly projectId: string;
  readonly missionId: string;
  readonly missionSource: {
    readonly path: string;
    readonly gitHead: string;
  };
  readonly proposalId: string;
  readonly proposalDigest: string;
  readonly mode: "supervised";
  readonly status: "awaiting-principal-authorization";
  readonly runtimeRef: string;
  readonly runtimeDigest: string;
  readonly provider: MissionExecutionProposal["externalProvider"];
  readonly disclosure: MissionExecutionProposal["externalDisclosure"];
  readonly candidateWorktree: MissionExecutionProposal["candidateWorktree"];
  readonly scope: MissionExecutionProposal["scope"];
  readonly budget: MissionExecutionProposal["budget"];
  readonly pendingDecisions: MissionExecutionProposal["pendingDecisions"];
  readonly authority: MissionExecutionProposal["authority"];
  readonly receiptPath: string;
  readonly receiptStanding: "absent" | "valid" | "malformed" | "stale";
}

interface ExecutionProposalContext {
  readonly projectId: string;
  readonly missionId: string;
  readonly sourceRelativePath: string;
  readonly gitHead: string;
  readonly proposal: MissionExecutionProposal;
  readonly proposalDigest: string;
  readonly receiptPath: string;
}

export function executionAuthorizationReceiptPath(
  home: string,
  projectId: string,
  missionIdArgument: string,
  proposalIdArgument: string,
): string {
  const checkedMissionId = missionId.parse(missionIdArgument);
  const checkedProposalId = missionId.parse(proposalIdArgument);
  const projectKey = createHash("sha256").update(projectId).digest("hex");
  return join(
    home,
    "receipts",
    "execution-authorizations",
    projectKey,
    checkedMissionId,
    `${checkedProposalId}.json`,
  );
}

export function inspectExecution(
  homeArgument: string | undefined,
  projectArgument: string,
  missionIdArgument: string,
): ExecutionInspection {
  const context = loadExecutionProposalContext(homeArgument, projectArgument, missionIdArgument);
  const proposal = context.proposal;
  return {
    version: "rosso.execution-inspection.v1",
    projectId: context.projectId,
    missionId: context.missionId,
    missionSource: {
      path: context.sourceRelativePath,
      gitHead: context.gitHead,
    },
    proposalId: proposal.proposalId,
    proposalDigest: context.proposalDigest,
    mode: proposal.mode,
    status: proposal.status,
    runtimeRef: proposal.runtimeRef,
    runtimeDigest: proposal.runtimeDigest,
    provider: proposal.externalProvider,
    disclosure: proposal.externalDisclosure,
    candidateWorktree: proposal.candidateWorktree,
    scope: proposal.scope,
    budget: proposal.budget,
    pendingDecisions: proposal.pendingDecisions,
    authority: proposal.authority,
    receiptPath: context.receiptPath,
    receiptStanding: inspectReceiptStanding(context),
  };
}

export function authorizeExecution(
  homeArgument: string | undefined,
  arguments_: ExecutionAuthorizationArguments,
  now: () => string = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
): ExecutionAuthorizationResult {
  const context = loadExecutionProposalContext(homeArgument, arguments_.project, arguments_.missionId);
  const checkedProposalId = missionId.parse(arguments_.proposalId);
  const suppliedDigest = digest.parse(arguments_.proposalDigest);
  const actorRef = principalRef.parse(arguments_.actorRef);
  const sourceRef = structuredRef.parse(arguments_.sourceRef);
  const proposal = context.proposal;
  if (proposal.proposalId !== checkedProposalId) {
    throw new Error(
      `proposal ID mismatch: expected ${proposal.proposalId}, received ${checkedProposalId}`,
    );
  }
  if (context.proposalDigest !== suppliedDigest) {
    throw new Error(
      `proposal digest mismatch: current ${context.proposalDigest}, received ${suppliedDigest}`,
    );
  }

  const selected = parseChoices(arguments_.choices);
  const { choices, immediateAuthorizedResults } = resolveSelectedChoices(proposal, selected);
  if (selected.get("external-disclosure") !== "ALLOW") {
    throw new Error("external-disclosure=ALLOW is required before an execution authorization may be issued");
  }

  const receiptPath = context.receiptPath;
  if (existsSync(receiptPath)) {
    throw new Error(
      `execution proposal ${checkedProposalId} already has an authorization receipt; use a new proposalId for a revised proposal`,
    );
  }

  const receipt = ExecutionAuthorizationReceiptSchema.parse({
    version: arguments_.principalAction === undefined
      ? "rosso.execution-authorization-receipt.v1"
      : "rosso.execution-authorization-receipt.v2",
    authorizationId: randomUUID(),
    projectId: context.projectId,
    missionId: context.missionId,
    missionSource: {
      path: context.sourceRelativePath,
      gitHead: context.gitHead,
    },
    proposalId: checkedProposalId,
    proposalDigest: context.proposalDigest,
    choices,
    immediateAuthorizedResults,
    executionBoundary: executionBoundary(proposal),
    authorityBoundary: {
      kind: "single-execution",
      maxUses: 1,
      externalDisclosure: "authorized-for-declared-boundary",
      budgetRelease: "authorized-for-declared-budget",
      write: "authorized-for-declared-paths",
      execute: "authorized-once",
      commit: "withheld",
      merge: "withheld",
      publish: "withheld",
      productAcceptance: "withheld",
    },
    actorRef,
    sourceRef,
    attributionBoundary: "references-are-attribution-not-authentication",
    authorizedAt: now(),
    ...(arguments_.principalAction === undefined
      ? {}
      : { principalAction: arguments_.principalAction }),
  });
  persistNewReceipt(receiptPath, receipt);
  return { receiptPath, receipt };
}

function loadExecutionProposalContext(
  homeArgument: string | undefined,
  projectArgument: string,
  missionIdArgument: string,
): ExecutionProposalContext {
  const current = loadHome(homeArgument);
  const project = registeredProjectByQuery(current.projects, projectArgument);
  const workspace = workspaceFor(current.workspaces, project.id);
  const observed = observeWorkspace(project, workspace);
  const checkedMissionId = missionId.parse(missionIdArgument);
  const sourcePath = join(observed.path, "operations", "missions", `${checkedMissionId}.json`);
  if (!existsSync(sourcePath)) throw new Error(`mission record not found: ${sourcePath}`);
  if (!lstatSync(sourcePath).isFile()) {
    throw new Error(`mission record must be a regular Git-tracked file: ${sourcePath}`);
  }

  const sourceRelativePath = relative(observed.path, sourcePath);
  const gitHead = requiredGit(["rev-parse", "HEAD"], observed.path);
  const trackedAtHead = runCommand(
    "git",
    ["-C", observed.path, "cat-file", "-e", `${gitHead}:${sourceRelativePath}`],
  );
  if (trackedAtHead.exitCode !== 0) {
    throw new Error(`mission record is not Git-tracked at HEAD: ${sourceRelativePath}`);
  }
  const sourceDiff = runCommand(
    "git",
    ["-C", observed.path, "diff", "--quiet", gitHead, "--", sourceRelativePath],
  );
  if (sourceDiff.exitCode !== 0) {
    throw new Error(`mission record must match HEAD before execution inspection or authorization: ${sourceRelativePath}`);
  }

  const committedSource = requiredGit(
    ["show", `${gitHead}:${sourceRelativePath}`],
    observed.path,
  );
  let committedRecord: unknown;
  try {
    committedRecord = JSON.parse(committedSource);
  } catch (error: unknown) {
    throw new Error(
      `invalid JSON in committed Mission source ${sourceRelativePath}: `
      + `${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const record = parseMissionRecord(committedRecord);
  if (record.id !== checkedMissionId) {
    throw new Error(`mission source ID mismatch: expected ${checkedMissionId}, observed ${record.id}`);
  }
  const proposal = record.executionProposal;
  if (proposal === undefined) throw new Error(`mission ${checkedMissionId} has no pending executionProposal`);
  if (requiredGit(["rev-parse", "HEAD"], observed.path) !== gitHead) {
    throw new Error("repository HEAD changed during execution proposal inspection; retry against one stable revision");
  }
  const proposalDigest = missionExecutionProposalDigest(proposal);
  return {
    projectId: project.id,
    missionId: checkedMissionId,
    sourceRelativePath,
    gitHead,
    proposal,
    proposalDigest,
    receiptPath: executionAuthorizationReceiptPath(
      current.home,
      project.id,
      checkedMissionId,
      proposal.proposalId,
    ),
  };
}

function inspectReceiptStanding(
  context: ExecutionProposalContext,
): ExecutionInspection["receiptStanding"] {
  if (!existsSync(context.receiptPath)) return "absent";
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(context.receiptPath, "utf8"));
  } catch {
    return "malformed";
  }
  const parsed = ExecutionAuthorizationReceiptSchema.safeParse(value);
  if (!parsed.success) return "malformed";
  const receipt = parsed.data;
  try {
    if (
      receipt.projectId !== context.projectId
      || receipt.missionId !== context.missionId
      || receipt.proposalId !== context.proposal.proposalId
      || receipt.proposalDigest !== context.proposalDigest
      || receipt.missionSource.path !== context.sourceRelativePath
      || receipt.missionSource.gitHead !== context.gitHead
      || !sameValue(receipt.executionBoundary, executionBoundary(context.proposal))
    ) {
      return "stale";
    }
    const selected = new Map(receipt.choices.map((choice) => [choice.decisionId, choice.replyKey]));
    if (selected.size !== receipt.choices.length || selected.get("external-disclosure") !== "ALLOW") {
      return "stale";
    }
    const expected = resolveSelectedChoices(context.proposal, selected);
    if (
      !sameValue(receipt.choices, expected.choices)
      || !sameValue(receipt.immediateAuthorizedResults, expected.immediateAuthorizedResults)
    ) {
      return "stale";
    }
    return "valid";
  } catch {
    return "stale";
  }
}

function executionBoundary(proposal: MissionExecutionProposal): z.infer<typeof ExecutionBoundarySchema> {
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

function resolveSelectedChoices(
  proposal: MissionExecutionProposal,
  selected: ReadonlyMap<string, string>,
): {
  choices: Array<z.infer<typeof AuthorizedChoiceSchema>>;
  immediateAuthorizedResults: Array<z.infer<typeof ImmediateAuthorizedResultSchema>>;
} {
  const expectedDecisions = new Set(proposal.pendingDecisions.map((decision) => decision.id));
  for (const decisionId of selected.keys()) {
    if (!expectedDecisions.has(decisionId)) throw new Error(`unknown execution decision: ${decisionId}`);
  }
  for (const decision of proposal.pendingDecisions) {
    if (!selected.has(decision.id)) throw new Error(`missing execution decision: ${decision.id}`);
  }
  if (selected.size !== proposal.pendingDecisions.length) {
    throw new Error("execution authorization choices must cover every pending decision exactly once");
  }

  const choices: Array<z.infer<typeof AuthorizedChoiceSchema>> = [];
  const immediateAuthorizedResults: Array<z.infer<typeof ImmediateAuthorizedResultSchema>> = [];
  for (const decision of proposal.pendingDecisions) {
    const replyKey = selected.get(decision.id)!;
    const option = decision.options.find((candidate) => candidate.replyKey === replyKey);
    if (option === undefined) {
      throw new Error(`undeclared reply key '${replyKey}' for execution decision ${decision.id}`);
    }
    choices.push({ decisionId: decision.id, replyKey });
    immediateAuthorizedResults.push({ decisionId: decision.id, result: option.immediateResult });
  }
  return { choices, immediateAuthorizedResults };
}

function parseChoices(values: readonly string[]): Map<string, string> {
  if (values.length === 0) throw new Error("execution authorize requires at least one --choice decisionId=replyKey");
  const choices = new Map<string, string>();
  for (const value of values) {
    const separator = value.indexOf("=");
    if (separator <= 0 || separator === value.length - 1 || value.indexOf("=", separator + 1) !== -1) {
      throw new Error(`invalid execution choice '${value}'; expected decisionId=replyKey`);
    }
    const decisionId = missionId.parse(value.slice(0, separator));
    const replyKey = value.slice(separator + 1);
    if (choices.has(decisionId)) throw new Error(`duplicate execution decision: ${decisionId}`);
    choices.set(decisionId, replyKey);
  }
  return choices;
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonical(entry)]),
    );
  }
  return value;
}

function persistNewReceipt(path: string, receipt: ExecutionAuthorizationReceipt): void {
  mkdirSync(dirname(path), { recursive: true });
  try {
    writeFileSync(path, `${JSON.stringify(receipt, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
  } catch (error: unknown) {
    if (existsSync(path)) {
      throw new Error(`execution authorization receipt already exists: ${path}`);
    }
    throw new Error(
      `cannot persist execution authorization receipt at ${path}: `
      + `${error instanceof Error ? error.message : String(error)}. `
      + "The current runtime must grant write access to this exact ROSSO_HOME.",
    );
  }

  // Verify the durable local artifact against the same strict contract before
  // returning authority to a caller.
  ExecutionAuthorizationReceiptSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}
