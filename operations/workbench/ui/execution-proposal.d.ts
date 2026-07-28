export interface ExecutionProposalOptionView {
  readonly replyKey: string;
  readonly label: string;
  readonly immediateResult: string;
  readonly tradeoff: string;
  readonly recommended: boolean;
}

export interface ExecutionProposalDecisionView {
  readonly id: string;
  readonly label: string;
  readonly proposal: string;
  readonly status: string;
  readonly compactReplyKey: string;
  readonly options: readonly ExecutionProposalOptionView[];
  readonly optionSummary: string;
}

export interface ExecutionProposalView {
  readonly proposalId: string;
  readonly proposalDigest: string;
  readonly runtimeDigest: string;
  readonly status: string;
  readonly proposalStatus: string;
  readonly heading: string;
  readonly contractOpen: boolean;
  readonly mode: string;
  readonly notStartedReason: string;
  readonly runtime: string;
  readonly disclosures: string;
  readonly writeBoundary: string;
  readonly commands: string;
  readonly budgetLimits: string;
  readonly tokenForecast: string;
  readonly authority: string;
  readonly authorization: {
    readonly standing:
      | "awaiting-principal-authorization"
      | "execution-source-not-authorizable"
      | "invalid-receipt-evidence"
      | "authorized-awaiting-execution"
      | "authorization-consumed"
      | "invalid-consumption-evidence";
    readonly receipt: string;
    readonly choices: string;
    readonly immediateAuthorizedResults: string;
    readonly authorityBoundary: string;
    readonly interactionEvidence: string;
    readonly orthogonalityNotice: string;
  };
  readonly decisions: readonly ExecutionProposalDecisionView[];
  readonly compactReplyKey: string;
}

export function executionProposalView(
  proposal: unknown,
  authorization?: unknown,
): ExecutionProposalView | null;

export interface ExecutionAuthorizationEligibility {
  readonly eligible: boolean;
  readonly state: "ready" | "incomplete" | "hold" | "blocked";
  readonly reason: string;
  readonly providerName: string;
  readonly buttonLabel: string;
  readonly normalizedChoices: readonly {
    readonly decisionId: string;
    readonly replyKey: string;
  }[];
  readonly missingDecisionIds: readonly string[];
  readonly missingAcknowledgements: readonly string[];
}

export interface ExecutionAuthorizationInput {
  readonly source: unknown;
  readonly project: {
    readonly projectKey?: unknown;
    readonly registration?: unknown;
  };
  readonly missionId: unknown;
  readonly proposal: unknown;
  readonly authorization: unknown;
  readonly choices: Readonly<Record<string, unknown>>;
  readonly acknowledgements: Readonly<Record<string, unknown>>;
  readonly pending?: boolean;
  readonly requestId?: unknown;
}

export interface ExecutionAuthorizationDraft {
  readonly choices: Record<string, string>;
  readonly acknowledgements: {
    externalDisclosure: boolean;
    forecastOnlyBudget: boolean;
    oneUseLaunchAndIntegrationWithheld: boolean;
  };
}

export interface ExecutionAuthorizationRefreshVerdict {
  readonly state: "authorized" | "unconfirmed" | "uncertain";
  readonly message: string;
}

export interface ExecutionAuthorizationRequest {
  readonly kind: "execution-authorization";
  readonly requestId: string;
  readonly target: {
    readonly projectKey: string;
    readonly missionId: string;
    readonly proposalId: string;
    readonly proposalDigest: string;
    readonly expectedStanding: "awaiting-principal-authorization";
  };
  readonly choices: readonly {
    readonly decisionId: string;
    readonly replyKey: string;
  }[];
  readonly acknowledgements: {
    readonly externalDisclosure: true;
    readonly forecastOnlyBudget: true;
    readonly oneUseLaunchAndIntegrationWithheld: true;
  };
}

export function executionAuthorizationEligibility(
  input: ExecutionAuthorizationInput,
): ExecutionAuthorizationEligibility;

export function createExecutionAuthorizationDraft(): ExecutionAuthorizationDraft;

export function executionAuthorizationRefreshVerdict(
  source: unknown,
  authorization: unknown,
): ExecutionAuthorizationRefreshVerdict;

export function buildExecutionAuthorizationRequest(
  input: ExecutionAuthorizationInput,
): ExecutionAuthorizationRequest;
