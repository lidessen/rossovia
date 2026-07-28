const authorityOrder = [
  "externalDisclosure",
  "budgetRelease",
  "write",
  "execute",
  "commit",
  "merge",
  "publish",
];

const authorizationAcknowledgementKeys = [
  "externalDisclosure",
  "forecastOnlyBudget",
  "oneUseLaunchAndIntegrationWithheld",
];

export function executionProposalView(proposal, authorization) {
  if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) {
    return null;
  }

  const decisions = Array.isArray(proposal.pendingDecisions)
    ? proposal.pendingDecisions.map(decisionView)
    : [];
  const provider = objectValue(proposal.externalProvider);
  const disclosure = objectValue(proposal.externalDisclosure);
  const worktree = objectValue(proposal.candidateWorktree);
  const scope = objectValue(proposal.scope);
  const budget = objectValue(proposal.budget);
  const parentBudget = objectValue(budget.parent);
  const delegatedCellBudget = objectValue(budget.delegatedCell);
  const authority = objectValue(proposal.authority);
  const authorityKeys = [
    ...authorityOrder.filter((key) => key in authority),
    ...Object.keys(authority).filter((key) => !authorityOrder.includes(key)).sort(),
  ];
  const authorizationProjection = authorizationView(authorization);
  const authorizationSource = objectValue(authorization);
  const currentStage = authorizationProjection.standing;
  const heading =
    currentStage === "authorization-consumed"
      ? "授权已消费 · 等待执行证据"
      : currentStage === "authorized-awaiting-execution"
        ? "已授权 · 等待执行证据"
        : currentStage === "awaiting-principal-authorization"
          ? "待授权执行提案"
          : "执行授权证据被阻断";

  return {
    proposalId: scalar(proposal.proposalId, "proposal ID 未投影"),
    proposalDigest: scalar(proposal.proposalDigest, "digest 未投影"),
    runtimeDigest: scalar(proposal.runtimeDigest, "runtime digest 未投影"),
    status: currentStage,
    proposalStatus: scalar(proposal.status, "status 未说明"),
    heading,
    contractOpen: currentStage === "awaiting-principal-authorization",
    mode: scalar(proposal.mode, "mode 未说明"),
    notStartedReason:
      authorizationProjection.standing === "authorization-consumed"
        ? "当前 artifact 不能再次授权或 HOLD。一次 launch authorization 已被 claim 消费；下一判断必须来自 runner / effect 证据，claim 本身不证明执行成功。"
        : authorizationProjection.standing === "authorized-awaiting-execution"
        ? "当前 artifact 不能再次授权或 HOLD。一次 launch authorization receipt 已存在；下一判断必须来自 runner / effect 证据。"
        : authorizationProjection.standing === "execution-source-not-authorizable"
            || authorizationProjection.standing === "invalid-receipt-evidence"
            || authorizationProjection.standing === "invalid-consumption-evidence"
          ? scalar(
              authorizationSource.reason,
              "执行来源或回执证据不可授权；请查看卡片内修复指引。",
            )
        : decisions.length
          ? `尚有 ${decisions.length} 项 Principal 决策未结；启动授权未成立。`
          : `提案状态为 ${scalar(proposal.status, "未知")}；启动授权尚未投影。`,
    runtime: [
      `proposal source status ${scalar(proposal.status, "status 未说明")}`,
      scalar(proposal.mode, "mode 未说明"),
      `${scalar(proposal.runtimeRef, "runtime 未说明")} · sha256 ${scalar(proposal.runtimeDigest, "runtime digest 未投影")}`,
      `${scalar(provider.name, "provider 未说明")} (${scalar(provider.boundary, "boundary 未说明")})`,
    ].join("\n"),
    disclosures: `${scalar(provider.name, "provider 未说明")} (${scalar(provider.boundary, "boundary 未说明")}) ← ${stringList(disclosure.dataCategories, "数据类别未说明").join(", ")}`,
    writeBoundary: [
      scalar(worktree.rootRef, "worktree rootRef 未说明"),
      worktree.binding === "operator-selected-at-launch"
        ? "启动时由 operator 绑定"
        : scalar(worktree.binding, "绑定方式未说明"),
      `read ${Array.isArray(scope.readPaths) && scope.readPaths.length
        ? scope.readPaths.join(", ")
        : "not declared by proposal v1"}`,
      `exclude ${Array.isArray(scope.excludePaths) && scope.excludePaths.length
        ? scope.excludePaths.join(", ")
        : "not declared by proposal v1"}`,
      `write ${stringList(scope.writePaths, "none declared").join(", ")}`,
    ].join("\n"),
    commands: stringList(scope.commands, "none declared").join("\n"),
    budgetLimits: [
      `parent max ${numberValue(parentBudget.maxModelSteps)} model steps · ${numberValue(parentBudget.maxOutputTokensPerStep)} output tokens/step`,
      `delegated cell max ${numberValue(delegatedCellBudget.maxSteps)} steps · ${numberValue(delegatedCellBudget.maxOutputTokensPerStep)} output tokens/step · ${durationValue(delegatedCellBudget.maxDurationMs)}`,
    ].join("\n"),
    tokenForecast: [
      `${numberValue(budget.estimatedTokens)} estimated tokens`,
      budget.estimatedTokensSemantics === "forecast-only-not-stop-condition"
        ? "forecast only · not a stop condition"
        : scalar(budget.estimatedTokensSemantics, "forecast semantics 未说明"),
    ].join("\n"),
    authority: authorityKeys.length
      ? `${authorityKeys.map((key) => `${key} ${scalar(authority[key], "未说明")}`).join(" · ")}\n这是 Proposal 创建时的边界；当前 receipt / claim authority 见上方阶段证据。`
      : "尚未投影\nProposal 本身不产生授权；当前阶段由 receipt / claim 决定。",
    authorization: authorizationProjection,
    decisions,
    compactReplyKey: decisions.length
      ? decisions.map((decision) => decision.compactReplyKey).join(" + ")
      : "未投影",
  };
}

export function createExecutionAuthorizationDraft() {
  return {
    choices: {},
    acknowledgements: {
      externalDisclosure: false,
      forecastOnlyBudget: false,
      oneUseLaunchAndIntegrationWithheld: false,
    },
  };
}

export function executionAuthorizationRefreshVerdict(source, authorization) {
  const value = objectValue(authorization);
  if (source !== "live") {
    return {
      state: "uncertain",
      message:
        "授权提交结果不确定：实时刷新失败，不能从缓存或演示数据判断 receipt 是否存在。恢复实时连接后，以 receipt projection 裁决。",
    };
  }
  if (
    value.standing === "authorized-awaiting-execution"
    || value.standing === "authorization-consumed"
  ) {
    return {
      state: "authorized",
      message: value.standing === "authorization-consumed"
        ? "实时 projection 证明一次 launch authorization 已被严格绑定的 claim 消费；它不证明 runner、effect 或执行结果成功。"
        : "实时 receipt projection 只证明回执仍匹配已提交 proposal；runner 未自动启动，runtime 源码将在 adapter 启动前重新哈希校验。",
    };
  }
  return {
    state: "unconfirmed",
    message:
      "实时刷新尚未观察到有效 authorization receipt；当前提案仍待授权，请重新审阅后再决定是否签发。",
  };
}

export function executionAuthorizationEligibility(input) {
  const value = objectValue(input);
  const proposal = objectValue(value.proposal);
  const authorization = objectValue(value.authorization);
  const project = objectValue(value.project);
  const choices = objectValue(value.choices);
  const acknowledgements = objectValue(value.acknowledgements);
  const decisions = Array.isArray(proposal.pendingDecisions)
    ? proposal.pendingDecisions.map((decision, index) => decisionView(decision, index))
    : [];
  const providerName = scalar(
    objectValue(proposal.externalProvider).name,
    "外部 provider",
  );
  const result = (state, reason, additions = {}) => ({
    eligible: state === "ready",
    state,
    reason,
    providerName,
    buttonLabel: `签发一次 ${providerName} 运行授权`,
    normalizedChoices: [],
    missingDecisionIds: [],
    missingAcknowledgements: [],
    ...additions,
  });

  if (value.source !== "live") {
    return result("blocked", "只有实时运行投影可以签发授权；演示或过期快照保持只读。");
  }
  if (project.registration !== "registered") {
    return result("blocked", "当前项目没有已注册身份，不能成为授权回执的精确目标。");
  }
  if (!scalarOrEmpty(project.projectKey)) {
    return result("blocked", "项目 projectKey 未投影，不能构造精确授权目标。");
  }
  if (!scalarOrEmpty(value.missionId)) {
    return result("blocked", "Mission ID 未投影，不能构造精确授权目标。");
  }
  if (proposal.status !== "awaiting-principal-authorization") {
    return result("blocked", "提案已不处于 awaiting-principal-authorization；请刷新后重新审阅。");
  }
  if (authorization.standing !== "awaiting-principal-authorization") {
    const blockedReason = scalarOrEmpty(authorization.reason);
    const remediation = scalarOrEmpty(authorization.remediation);
    return result(
      "blocked",
      authorization.standing === "authorized-awaiting-execution"
        ? "一次 launch 授权回执已存在；这不表示 runner、effect 或集成已经开始。"
        : authorization.standing === "authorization-consumed"
          ? "一次 launch 授权已被消费；claim 只证明消费，不表示 runner、effect、执行结果或集成成功。"
        : blockedReason
          ? `${blockedReason}${remediation ? ` ${remediation}` : ""}`
          : "授权 standing 未被实时投影为 awaiting-principal-authorization。",
    );
  }
  if (!scalarOrEmpty(proposal.proposalId) || !scalarOrEmpty(proposal.proposalDigest)) {
    return result("blocked", "Proposal ID 或 digest 未投影，不能把回执绑定到精确提案。");
  }
  if (decisions.length === 0) {
    return result("blocked", "提案没有可签发的 pending decisions。");
  }
  if (value.pending === true) {
    return result("blocked", "授权请求正在提交；等待回执或错误结果。");
  }

  const normalizedChoices = [];
  const missingDecisionIds = [];
  for (const decision of decisions) {
    const replyKey = scalarOrEmpty(choices[decision.id]);
    if (!replyKey) {
      missingDecisionIds.push(decision.id);
      continue;
    }
    if (!decision.options.some((option) => option.replyKey === replyKey)) {
      return result(
        "blocked",
        `决策 ${decision.id} 的选择不属于当前提案；请刷新后重新选择。`,
      );
    }
    normalizedChoices.push({ decisionId: decision.id, replyKey });
  }

  const externalDisclosure = decisions.find(
    (decision) => decision.id === "external-disclosure",
  );
  const disclosureCategories = objectValue(proposal.externalDisclosure).dataCategories;
  if (
    Array.isArray(disclosureCategories) &&
    disclosureCategories.length > 0 &&
    externalDisclosure === undefined
  ) {
    return result("blocked", "提案声明了外发数据，但没有 external-disclosure 决策。");
  }
  const disclosureChoice = normalizedChoices.find(
    (choice) => choice.decisionId === "external-disclosure",
  );
  if (disclosureChoice?.replyKey === "HOLD") {
    return result(
      "hold",
      "保持阻塞；未创建回执、未发送数据。HOLD 在本阶段不会被伪装成已持久化的撤回决定。",
      { normalizedChoices, missingDecisionIds },
    );
  }
  if (externalDisclosure && disclosureChoice?.replyKey !== "ALLOW") {
    return result(
      "blocked",
      "外发必须由 external-disclosure=ALLOW 显式授权；推荐值或沉默都不算同意。",
      { normalizedChoices, missingDecisionIds },
    );
  }
  if (missingDecisionIds.length > 0) {
    return result(
      "incomplete",
      `仍需显式选择：${missingDecisionIds.join("、")}。没有任何选项会被预选。`,
      { normalizedChoices, missingDecisionIds },
    );
  }

  const missingAcknowledgements = authorizationAcknowledgementKeys.filter(
    (key) => acknowledgements[key] !== true,
  );
  if (missingAcknowledgements.length > 0) {
    return result(
      "incomplete",
      `仍需逐项确认 ${missingAcknowledgements.length} 条授权边界。`,
      { normalizedChoices, missingAcknowledgements },
    );
  }

  return result(
    "ready",
    `将只创建一份绑定当前 digest 的 ${providerName} launch 回执；不会自动 start、commit、merge 或 publish。`,
    { normalizedChoices },
  );
}

export function buildExecutionAuthorizationRequest(input) {
  const eligibility = executionAuthorizationEligibility(input);
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason);
  }

  const value = objectValue(input);
  const proposal = objectValue(value.proposal);
  const project = objectValue(value.project);
  const requestId = scalarOrEmpty(value.requestId);
  if (!uuidPattern.test(requestId)) {
    throw new Error("requestId must be a UUID");
  }

  return {
    kind: "execution-authorization",
    requestId,
    target: {
      projectKey: project.projectKey,
      missionId: value.missionId,
      proposalId: proposal.proposalId,
      proposalDigest: proposal.proposalDigest,
      expectedStanding: "awaiting-principal-authorization",
    },
    choices: eligibility.normalizedChoices,
    acknowledgements: {
      externalDisclosure: true,
      forecastOnlyBudget: true,
      oneUseLaunchAndIntegrationWithheld: true,
    },
  };
}

function authorizationView(authorization) {
  const value = objectValue(authorization);
  if (
    value.standing === "execution-source-not-authorizable"
    || value.standing === "invalid-receipt-evidence"
    || value.standing === "invalid-consumption-evidence"
  ) {
    const reason = scalar(value.reason, "授权证据不可用，但原因未投影。");
    const remediation = scalar(
      value.remediation,
      "修复来源或回执证据后刷新 Workbench；不要重复提交。",
    );
    return {
      standing: value.standing,
      receipt: `${reason}\nsource ${scalar(value.sourcePath, "未投影")}`,
      choices: "未建立新的授权选择",
      immediateAuthorizedResults: "未建立新的立即授权结果",
      authorityBoundary: "launch authority 未成立",
      interactionEvidence: "当前阻断证据不构成 Principal authorization",
      orthogonalityNotice: remediation,
    };
  }
  if (
    value.standing !== "authorized-awaiting-execution"
    && value.standing !== "authorization-consumed"
  ) {
    return {
      standing: "awaiting-principal-authorization",
      receipt: "无有效 authorization receipt 投影",
      choices: "尚未授权任何选择",
      immediateAuthorizedResults: "尚未授权任何立即结果",
      authorityBoundary: "launch authority 未投影",
      interactionEvidence: "尚无 Principal action evidence",
      orthogonalityNotice:
        "Proposal 仍待授权；runner 与 effect 必须分别由各自投影证明。",
    };
  }

  const choices = Array.isArray(value.choices) ? value.choices : [];
  const results = Array.isArray(value.immediateAuthorizedResults)
    ? value.immediateAuthorizedResults
    : [];
  const boundary = objectValue(value.authorityBoundary);
  const consumption = objectValue(value.consumption);
  const consumed = value.standing === "authorization-consumed";
  return {
    standing: consumed
      ? "authorization-consumed"
      : "authorized-awaiting-execution",
    receipt: [
      scalar(value.authorizationId, "authorization ID 未投影"),
      `authorized ${scalar(value.authorizedAt, "time 未投影")}`,
      ...(consumed
        ? [
          `consumed ${scalar(consumption.claimedAt, "claimedAt 未投影")}`,
          `candidate ${scalar(consumption.candidateWorktree, "worktree 未投影")}`,
          `candidate HEAD ${scalar(consumption.candidateHead, "HEAD 未投影")}`,
          `claim ${scalar(consumption.claimSourcePath, "claim source 未投影")}`,
        ]
        : []),
    ].join("\n"),
    choices: choices.length
      ? choices
          .map((choice) => {
            const item = objectValue(choice);
            return `${scalar(item.decisionId, "decision 未说明")}=${scalar(item.replyKey, "reply key 未说明")}`;
          })
          .join("\n")
      : "授权选择未投影",
    immediateAuthorizedResults: results.length
      ? results
          .map((result) => {
            const item = objectValue(result);
            return `${scalar(item.decisionId, "decision 未说明")}: ${scalar(item.result, "立即结果未说明")}`;
          })
          .join("\n")
      : "授权的立即结果未投影",
    authorityBoundary: Object.keys(boundary).length
      ? Object.entries(boundary)
          .map(([key, boundaryValue]) => `${key} ${scalar(boundaryValue, "未说明")}`)
          .join(" · ")
      : "authority boundary 未投影",
    interactionEvidence: principalActionEvidence(value),
    orthogonalityNotice: consumed
      ? "claim 只证明一次 launch authority 已被消费；runner、effect、执行成功、集成与产品验收仍须各自证明。"
      : "已授权一次 launch，但 runner / effect 尚未由此证明启动。",
  };
}

function principalActionEvidence(authorization) {
  const action = objectValue(authorization.principalAction);
  const acknowledgements = objectValue(action.acknowledgements);
  const durableAcknowledgements = action.channel === "local-principal-workbench-ui"
    ? [
        `externalDisclosure=${acknowledgements.externalDisclosure === true}`,
        `forecastOnlyBudget=${acknowledgements.forecastOnlyBudget === true}`,
        `oneUseLaunchAndIntegrationWithheld=${acknowledgements.oneUseLaunchAndIntegrationWithheld === true}`,
      ].join(" · ")
    : "ack evidence unavailable for this receipt version";
  return [
    `${scalar(authorization.actorRef, "actor 未投影")} · ${scalar(authorization.sourceRef, "source 未投影")}`,
    scalar(authorization.attributionBoundary, "attribution boundary 未投影"),
    action.channel === "local-principal-workbench-ui"
      ? `${action.channel} · ${scalar(action.identityAssurance, "identity assurance 未投影")}`
      : "interaction channel unavailable",
    durableAcknowledgements,
  ].join("\n");
}

function decisionView(decision, index) {
  const value = objectValue(decision);
  const compactReplyKey = scalar(value.compactReplyKey, "reply key 未投影");
  const options = Array.isArray(value.options)
    ? value.options.map((option) => optionView(option, compactReplyKey))
    : [];
  return {
    id: scalar(value.id, `D${index + 1}`),
    label: scalar(value.label, "决策项未命名"),
    proposal: scalar(value.proposal, "推荐方案未说明"),
    status: scalar(value.status, "status 未说明"),
    compactReplyKey,
    options,
    optionSummary: options.length
      ? options
          .map(
            (option) =>
              `${option.replyKey} ${option.label} — ${option.immediateResult}；权衡：${option.tradeoff}`,
          )
          .join("\n")
      : "选项未投影",
  };
}

function optionView(option, compactReplyKey) {
  const value = objectValue(option);
  const replyKey = scalar(value.replyKey, "?");
  return {
    replyKey,
    label: scalar(value.label, "未命名选项"),
    immediateResult: scalar(value.immediateResult, "立即结果未说明"),
    tradeoff: scalar(value.tradeoff, "权衡未说明"),
    recommended: replyKey === compactReplyKey,
  };
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function stringList(value, fallback) {
  if (!Array.isArray(value) || value.length === 0) return [fallback];
  return value.map((item) => scalar(item, fallback));
}

function scalar(value, fallback) {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function scalarOrEmpty(value) {
  return typeof value === "string" && value.length > 0 ? value : "";
}

function numberValue(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("en-US")
    : "未说明";
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function durationValue(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "duration 未说明";
  const minutes = value / 60_000;
  return `${value.toLocaleString("en-US")} ms${Number.isInteger(minutes) ? ` (${minutes}m)` : ""}`;
}
