import { z } from "zod";
import {
  authorizeExecution,
  inspectExecution,
  type ExecutionAuthorizationReceipt,
  type ExecutionInspection,
} from "../execution-authorization";
import { loadHome } from "../home";

const missionId = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const digest = z.string().regex(/^[0-9a-f]{64}$/);
const registeredProjectKey = z.string().refine(
  (value) => value.startsWith("registered:") && value.slice("registered:".length).trim().length > 0,
  "must be a registered:<project-id> key",
);

const ExecutionAuthorizationTargetSchema = z.object({
  projectKey: registeredProjectKey,
  missionId,
  proposalId: missionId,
  proposalDigest: digest,
  expectedStanding: z.literal("awaiting-principal-authorization"),
}).strict();

const ExecutionAuthorizationChoiceSchema = z.object({
  decisionId: missionId,
  replyKey: z.string().trim().min(1),
}).strict();

export const ExecutionAuthorizationActionRequestSchema = z.object({
  kind: z.literal("execution-authorization"),
  requestId: z.string().uuid(),
  target: ExecutionAuthorizationTargetSchema,
  choices: z.array(ExecutionAuthorizationChoiceSchema).min(1),
  acknowledgements: z.object({
    externalDisclosure: z.literal(true),
    forecastOnlyBudget: z.literal(true),
    oneUseLaunchAndIntegrationWithheld: z.literal(true),
  }).strict(),
}).strict();

export type ExecutionAuthorizationActionRequest = z.infer<
  typeof ExecutionAuthorizationActionRequestSchema
>;

export interface ExecutionAuthorizationActionResult {
  readonly receipt: ExecutionAuthorizationReceipt;
}

export class ExecutionAuthorizationActionError extends Error {
  constructor(
    readonly status: 400 | 409 | 500,
    readonly code:
      | "invalid-authorization-request"
      | "authorization-target-drift"
      | "stale-execution-proposal"
      | "authorization-already-exists"
      | "authorization-failed",
    message: string,
  ) {
    super(message);
  }
}

/**
 * Convert one fully acknowledged Principal action into a local authorization
 * receipt. This function never talks to the runner or any external provider.
 * `authorizeExecution` deliberately performs the authoritative committed
 * Mission read and all digest/choice checks again before persisting the receipt.
 */
export function executeExecutionAuthorizationAction(
  homeArgument: string | undefined,
  unparsed: unknown,
): ExecutionAuthorizationActionResult {
  const parsed = ExecutionAuthorizationActionRequestSchema.safeParse(unparsed);
  if (!parsed.success) {
    throw new ExecutionAuthorizationActionError(
      400,
      "invalid-authorization-request",
      z.prettifyError(parsed.error),
    );
  }

  const action = parsed.data;
  const projectId = action.target.projectKey.slice("registered:".length);
  const current = loadHome(homeArgument);
  if (!current.projects.projects.some((project) => project.id === projectId)) {
    throw new ExecutionAuthorizationActionError(
      409,
      "authorization-target-drift",
      `Registered project ${projectId} is not present in the current Workbench home.`,
    );
  }

  const inspection = inspectCurrentProposal(
    homeArgument,
    projectId,
    action.target.missionId,
  );
  assertCurrentProposal(action, inspection);
  validateChoices(action, inspection);

  try {
    const authorized = authorizeExecution(homeArgument, {
      project: projectId,
      missionId: action.target.missionId,
      proposalId: action.target.proposalId,
      proposalDigest: action.target.proposalDigest,
      choices: action.choices.map((choice) => `${choice.decisionId}=${choice.replyKey}`),
      actorRef: "principal:local-workbench-user",
      sourceRef: `principal-workbench-action:${action.requestId}`,
      principalAction: {
        requestId: action.requestId,
        channel: "local-principal-workbench-ui",
        acknowledgements: action.acknowledgements,
        identityAssurance: "unverified-local-interaction",
      },
    });
    return { receipt: authorized.receipt };
  } catch (error: unknown) {
    return reclassifyAuthorizationFailure(
      homeArgument,
      projectId,
      action,
      error,
    );
  }
}

function inspectCurrentProposal(
  homeArgument: string | undefined,
  projectId: string,
  requestedMissionId: string,
): ExecutionInspection {
  try {
    return inspectExecution(homeArgument, projectId, requestedMissionId);
  } catch (error: unknown) {
    throw new ExecutionAuthorizationActionError(
      409,
      "authorization-target-drift",
      `The committed execution proposal is not currently authorizable: ${message(error)}`,
    );
  }
}

function assertCurrentProposal(
  action: ExecutionAuthorizationActionRequest,
  inspection: ExecutionInspection,
): void {
  if (
    inspection.proposalStatus !== action.target.expectedStanding
    || inspection.proposalId !== action.target.proposalId
    || inspection.proposalDigest !== action.target.proposalDigest
  ) {
    throw new ExecutionAuthorizationActionError(
      409,
      "stale-execution-proposal",
      "The execution proposal changed after the Principal action was formed; inspect and decide the current proposal.",
    );
  }
  if (inspection.receiptStanding !== "absent") {
    throw new ExecutionAuthorizationActionError(
      409,
      "authorization-already-exists",
      `Execution proposal ${inspection.proposalId} already has ${inspection.receiptStanding} receipt evidence.`,
    );
  }
}

function validateChoices(
  action: ExecutionAuthorizationActionRequest,
  inspection: ExecutionInspection,
): void {
  const selected = new Map<string, string>();
  for (const choice of action.choices) {
    if (selected.has(choice.decisionId)) {
      throw new ExecutionAuthorizationActionError(
        400,
        "invalid-authorization-request",
        `Execution decision ${choice.decisionId} was supplied more than once.`,
      );
    }
    selected.set(choice.decisionId, choice.replyKey);
  }

  const expected = new Set(inspection.pendingDecisions.map((decision) => decision.id));
  for (const decisionId of selected.keys()) {
    if (!expected.has(decisionId)) {
      throw new ExecutionAuthorizationActionError(
        400,
        "invalid-authorization-request",
        `Unknown execution decision: ${decisionId}.`,
      );
    }
  }
  for (const decision of inspection.pendingDecisions) {
    const replyKey = selected.get(decision.id);
    if (replyKey === undefined) {
      throw new ExecutionAuthorizationActionError(
        400,
        "invalid-authorization-request",
        `Missing execution decision: ${decision.id}.`,
      );
    }
    if (!decision.options.some((option) => option.replyKey === replyKey)) {
      throw new ExecutionAuthorizationActionError(
        400,
        "invalid-authorization-request",
        `Reply key '${replyKey}' is not declared for execution decision ${decision.id}.`,
      );
    }
  }
  if (selected.size !== expected.size) {
    throw new ExecutionAuthorizationActionError(
      400,
      "invalid-authorization-request",
      "Execution authorization choices must cover every pending decision exactly once.",
    );
  }
  if (selected.get("external-disclosure") !== "ALLOW") {
    throw new ExecutionAuthorizationActionError(
      400,
      "invalid-authorization-request",
      "external-disclosure=ALLOW is required before an execution authorization may be issued.",
    );
  }
}

function reclassifyAuthorizationFailure(
  homeArgument: string | undefined,
  projectId: string,
  action: ExecutionAuthorizationActionRequest,
  cause: unknown,
): never {
  try {
    const current = inspectExecution(homeArgument, projectId, action.target.missionId);
    if (
      current.proposalId !== action.target.proposalId
      || current.proposalDigest !== action.target.proposalDigest
    ) {
      throw new ExecutionAuthorizationActionError(
        409,
        "stale-execution-proposal",
        "The execution proposal changed while authorization was being issued; inspect and decide the current proposal.",
      );
    }
    if (current.receiptStanding !== "absent") {
      throw new ExecutionAuthorizationActionError(
        409,
        "authorization-already-exists",
        `Execution proposal ${current.proposalId} already has ${current.receiptStanding} receipt evidence.`,
      );
    }
  } catch (error: unknown) {
    if (error instanceof ExecutionAuthorizationActionError) throw error;
    throw new ExecutionAuthorizationActionError(
      409,
      "authorization-target-drift",
      `The committed execution proposal changed while authorization was being issued: ${message(error)}`,
    );
  }
  throw new ExecutionAuthorizationActionError(
    500,
    "authorization-failed",
    `The local authorization receipt could not be issued: ${message(cause)}`,
  );
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
