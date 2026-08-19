const authorityKeys = [
  "commit",
  "merge",
  "publish",
  "productAcceptance",
];

function object(value) {
  return value && typeof value === "object" ? value : {};
}

function valueAt(value, key) {
  return Object.prototype.hasOwnProperty.call(object(value), key)
    ? object(value)[key]
    : undefined;
}

function migrationActionText(value) {
  return String(value).replaceAll("ADOPT", "AUTHORIZE MIGRATION");
}

function runnerStatus(runner) {
  const candidate = valueAt(runner, "status");
  return candidate && typeof candidate === "object" ? candidate : object(runner);
}

export function isIndependentWorkbenchTask(item) {
  const binding = object(valueAt(item, "binding"));
  return valueAt(binding, "kind") === "workbench-task"
    && valueAt(binding, "projectContext") === null;
}

export function intentLineagePresentation(activity) {
  const lineage = object(valueAt(activity, "intentLineage"));
  const standing = valueAt(lineage, "standing");
  if (standing === "seeded" || standing === "legacy-adopted") {
    const anchor = object(valueAt(lineage, "activeAnchor"));
    const complete =
      typeof valueAt(anchor, "id") === "string"
      && typeof valueAt(anchor, "revision") === "string"
      && Number.isInteger(valueAt(anchor, "reconciledWatermark"));
    return {
      standing: complete ? String(standing) : "unavailable",
      blocksSemanticWork: !complete,
      mode: complete ? null : "lineage-unverified",
    };
  }
  if (standing === "legacy-unanchored") {
    const complete =
      Number.isInteger(valueAt(lineage, "priorEventCount"))
      && Number(valueAt(lineage, "priorEventCount")) > 0
      && /^[a-f0-9]{64}$/.test(String(valueAt(lineage, "priorTimelineDigest") ?? ""));
    return {
      standing: complete ? "legacy-unanchored" : "unavailable",
      blocksSemanticWork: true,
      mode: complete ? "anchor-pending" : "lineage-unverified",
    };
  }
  if (standing === "uninitialized") {
    return {
      standing: "uninitialized",
      blocksSemanticWork: true,
      mode: "anchor-pending",
    };
  }
  return {
    standing: "unavailable",
    blocksSemanticWork: true,
    mode: "lineage-unverified",
  };
}

export function anchorMigrationDecisionBriefPresentation(activity, runner, sourceContext) {
  const lineage = object(valueAt(activity, "intentLineage"));
  const projection = valueAt(activity, "anchorMigrationProposal");
  if (projection === null || projection === undefined) {
    return { standing: "absent", decisionable: false };
  }
  const projected = object(projection);
  if (valueAt(projected, "standing") === "stale") {
    return {
      standing: "stale",
      decisionable: false,
      reason: String(valueAt(projected, "reason") ?? "proposal target changed"),
    };
  }
  if (valueAt(projected, "standing") !== "awaiting-principal-decision") {
    return {
      standing: "unavailable",
      decisionable: false,
      reason: "proposal standing is unavailable",
    };
  }
  const proposal = object(valueAt(projected, "proposal"));
  const target = object(valueAt(proposal, "target"));
  const history = object(valueAt(proposal, "retainedHistory"));
  const adoption = object(valueAt(proposal, "proposedAdoption"));
  const anchor = object(valueAt(adoption, "anchor"));
  const decision = object(valueAt(proposal, "decision"));
  const options = object(valueAt(decision, "options"));
  const adopt = object(valueAt(options, "ADOPT"));
  const hold = object(valueAt(options, "HOLD"));
  const boundary = object(valueAt(proposal, "authorityBoundary"));
  const residualRisk = object(valueAt(proposal, "residualRisk"));
  const executionSequence = valueAt(proposal, "executionSequence");
  const missionSource = object(valueAt(proposal, "missionSource"));
  const source = object(sourceContext);
  const status = runnerStatus(runner);
  const protocolCapability = valueAt(target, "protocolCapability");
  const atomic = protocolCapability === "atomic-adopt-retire-v1";
  const legacy =
    protocolCapability === "legacy-response-verified-shutdown-v1";
  const expectedSequence = atomic
    ? [
      "append-anchor-and-retire-exact-carrier",
      "start-no-runtime-carrier",
    ]
    : [
      "request-unguarded-shutdown",
      "verify-exact-shutdown-response",
      "wait-exact-socket-release",
      "start-no-runtime-carrier",
      "append-exact-legacy-anchor",
    ];
  const protocolObservationExact =
    (atomic && Object.prototype.hasOwnProperty.call(status, "runtimeMode"))
    || (legacy && !Object.prototype.hasOwnProperty.call(status, "runtimeMode"));
  const requiredWithheld = [
    "carrierReplacement",
    "adoption",
    "reconciliation",
    "candidateWrite",
    "commit",
    "merge",
    "publish",
    "productAcceptance",
  ];
  const exact =
    valueAt(lineage, "standing") === "legacy-unanchored"
    && valueAt(history, "eventCount") === valueAt(lineage, "priorEventCount")
    && valueAt(history, "timelineDigest") === valueAt(lineage, "priorTimelineDigest")
    && valueAt(target, "runnerId") === valueAt(status, "runnerId")
    && valueAt(target, "pid") === valueAt(status, "pid")
    && valueAt(target, "startedAt") === valueAt(status, "startedAt")
    && valueAt(target, "socketPath") === valueAt(status, "socketPath")
    && valueAt(target, "state") === valueAt(status, "state")
    && valueAt(target, "live") === valueAt(runner, "live")
    && protocolObservationExact;
  const complete =
    valueAt(proposal, "version") === "rosso.mission-anchor-migration-proposal.v1"
    && typeof valueAt(proposal, "proposalId") === "string"
    && typeof valueAt(projected, "proposalDigest") === "string"
    && /^[a-f0-9]{64}$/.test(String(valueAt(projected, "proposalDigest")))
    && typeof valueAt(anchor, "id") === "string"
    && typeof valueAt(anchor, "revision") === "string"
    && typeof valueAt(anchor, "statement") === "string"
    && Array.isArray(valueAt(anchor, "sourceRefs"))
    && valueAt(anchor, "reconciledWatermark") === 0
    && (atomic || legacy)
    && Array.isArray(executionSequence)
    && JSON.stringify(executionSequence) === JSON.stringify(expectedSequence)
    && (
      atomic
        ? valueAt(residualRisk, "kind") === "none"
        : valueAt(residualRisk, "kind")
          === "post-effect-carrier-identity-verification"
    )
    && valueAt(decision, "recommendation") === "ADOPT"
    && valueAt(decision, "replyKey") === "ADOPT|HOLD"
    && typeof valueAt(adopt, "immediateResult") === "string"
    && typeof valueAt(adopt, "tradeoff") === "string"
    && typeof valueAt(hold, "immediateResult") === "string"
    && typeof valueAt(hold, "tradeoff") === "string"
    && valueAt(boundary, "standing") === "proposal-only"
    && valueAt(boundary, "externalDisclosure") === "none"
    && requiredWithheld.every((key) => valueAt(boundary, key) === "withheld");
  const sourceExact =
    valueAt(source, "standing") === "committed-primary"
    && valueAt(source, "projectId") === valueAt(missionSource, "projectId")
    && valueAt(source, "relativePath") === valueAt(missionSource, "relativePath")
    && valueAt(source, "gitHead") === valueAt(missionSource, "gitHead");
  if (!complete) {
    return {
      standing: "unavailable",
      decisionable: false,
      reason: "proposal evidence is incomplete or authority-bearing",
    };
  }
  if (!exact) {
    return {
      standing: "stale",
      decisionable: false,
      reason: "runner identity, protocol, liveness, or complete timeline no longer matches",
    };
  }
  if (!sourceExact) {
    return {
      standing: "stale",
      decisionable: false,
      reason: "the committed primary Mission source no longer matches",
    };
  }
  return {
    standing: "awaiting-principal-decision",
    decisionable: true,
    proposalId: String(valueAt(proposal, "proposalId")),
    proposalDigest: String(valueAt(projected, "proposalDigest")),
    migrationPath: atomic
      ? "atomic-append-retire"
      : "legacy-compatibility-saga",
    atomicAvailability: atomic
      ? "atomic carrier protocol verified"
      : "atomic unavailable · runtime mode unreported",
    target: `${valueAt(target, "runnerId")} · pid ${valueAt(target, "pid")} · ${valueAt(target, "startedAt")}\n${valueAt(target, "socketPath")}\n${valueAt(target, "state")} · live`,
    history: `${valueAt(history, "eventCount")} Mission events · ${valueAt(history, "timelineDigest")}`,
    steps: expectedSequence,
    effects: atomic
      ? [
        "append the exact Intent Anchor",
        "retire the current carrier",
        "start a no-runtime replacement carrier",
      ]
      : [
        "shutdown the current carrier",
        "start a no-runtime replacement carrier",
        "append the exact Intent Anchor to the Mission timeline",
      ],
    residualRisk: legacy
      ? "非原子兼容迁移：系统会先持久化一次性 attempt，才允许发出 shutdown；shutdown 影响发生后才核验 carrier 身份。只有绑定该 attempt 的 exact retirement 或 exact anchor adoption 能安全续接。若响应、socket、target 或 timeline 任一不确定，本次迁移行动授权永久失效，必须重新生成 Decision Brief 并获得新的 AUTHORIZE MIGRATION。"
      : "原子 append-and-retire request；target、source 或 timeline 漂移即停止并重新决策。",
    anchor: {
      id: String(valueAt(anchor, "id")),
      revision: String(valueAt(anchor, "revision")),
      statement: String(valueAt(anchor, "statement")),
      sourceRefs: valueAt(anchor, "sourceRefs"),
    },
    source: `${valueAt(missionSource, "relativePath")} @ ${valueAt(missionSource, "gitHead")}`,
    recommendation: "AUTHORIZE MIGRATION",
    replyKey: "AUTHORIZE MIGRATION|HOLD",
    options: {
      AUTHORIZE_MIGRATION: {
        immediateResult: migrationActionText(valueAt(adopt, "immediateResult")),
        tradeoff: migrationActionText(valueAt(adopt, "tradeoff")),
      },
      HOLD: {
        immediateResult: migrationActionText(valueAt(hold, "immediateResult")),
        tradeoff: migrationActionText(valueAt(hold, "tradeoff")),
      },
    },
    normalizedProtocolChoice: "ADOPT",
    boundary:
      "migration action only · reconciliation/candidate write/commit/merge/publish/product acceptance withheld · external disclosure none · no Principle Sequence proposal or adoption",
  };
}

export function reconciliationActionDecisionBriefPresentation(
  activity,
  runner,
  sourceContext,
) {
  const projection = valueAt(activity, "reconciliationAction");
  if (projection === null || projection === undefined) {
    return { standing: "absent", decisionable: false };
  }
  const projected = object(projection);
  const standing = valueAt(projected, "standing");
  const proposal = object(valueAt(projected, "proposal"));
  const target = object(valueAt(proposal, "target"));
  const lineage = object(valueAt(activity, "intentLineage"));
  const projectedAnchor = object(valueAt(lineage, "activeAnchor"));
  const proposalLineage = object(valueAt(proposal, "lineage"));
  const anchor = object(valueAt(proposalLineage, "anchor"));
  const input = object(valueAt(proposal, "input"));
  const correction = object(valueAt(activity, "currentCorrection"));
  const correctionVerification = object(valueAt(correction, "verification"));
  const correctionEvidence = object(valueAt(proposal, "correctionEvidence"));
  const execution = object(valueAt(proposal, "execution"));
  const carrier = object(valueAt(execution, "carrier"));
  const profile = object(valueAt(execution, "profile"));
  const disclosure = object(valueAt(execution, "externalDisclosure"));
  const settlement = object(valueAt(proposal, "conditionalSettlement"));
  const nextAnchor = object(valueAt(settlement, "nextAnchor"));
  const decision = object(valueAt(proposal, "decision"));
  const options = object(valueAt(decision, "options"));
  const settle = object(valueAt(options, "SETTLE_CONTINUE"));
  const reclassify = object(valueAt(options, "RECLASSIFY_CORRECTION"));
  const hold = object(valueAt(options, "HOLD"));
  const boundary = object(valueAt(proposal, "authorityBoundary"));
  const missionSource = object(valueAt(proposal, "missionSource"));
  const source = object(sourceContext);
  const status = runnerStatus(runner);
  const requiredWithheld = [
    "modelExecution",
    "externalDisclosure",
    "reconciliation",
    "candidateWrite",
    "commit",
    "merge",
    "publish",
    "productAcceptance",
  ];
  const complete =
    valueAt(proposal, "version")
      === "rosso.mission-reconciliation-action-proposal.v1"
    && typeof valueAt(proposal, "proposalId") === "string"
    && /^[a-f0-9]{64}$/.test(String(valueAt(projected, "proposalDigest")))
    && valueAt(execution, "adapter") === "codex-app-server.v1"
    && typeof valueAt(carrier, "canonicalExecutable") === "string"
    && typeof valueAt(carrier, "version") === "string"
    && valueAt(carrier, "toolPolicy")
      === "app-server-no-environment-structured-output-plan-only-v1"
    && valueAt(execution, "invocations") === 2
    && valueAt(execution, "isolation") === "fresh-disposable-no-environment"
    && valueAt(profile, "provider") === "openai"
    && typeof valueAt(profile, "model") === "string"
    && valueAt(disclosure, "provider") === "openai"
    && valueAt(disclosure, "repositoryFiles") === "none"
    && valueAt(disclosure, "candidateFiles") === "none"
    && JSON.stringify(valueAt(disclosure, "data")) === JSON.stringify([
      "active-intent-anchor",
      "watermark-1-correction-input",
      "reconciliation-proposal-to-independent-verifier",
      "bounded-work-cell-envelope-without-workspace-or-host-budget",
      "pinned-codex-system-developer-and-output-schema-context",
    ])
    && valueAt(settlement, "proposalDisposition") === "continue"
    && valueAt(settlement, "verificationVerdict") === "verified-transition"
    && valueAt(settlement, "otherwise")
      === "return-to-principal-without-commit"
    && valueAt(decision, "recommendation") === "SETTLE_CONTINUE"
    && valueAt(decision, "replyKey")
      === "SETTLE_CONTINUE|RECLASSIFY_CORRECTION|HOLD"
    && [settle, reclassify, hold].every((option) =>
      typeof valueAt(option, "immediateResult") === "string"
      && typeof valueAt(option, "tradeoff") === "string"
    )
    && valueAt(boundary, "standing") === "proposal-only"
    && requiredWithheld.every((key) => valueAt(boundary, key) === "withheld");
  const exact =
    (valueAt(lineage, "standing") === "legacy-adopted"
      || valueAt(lineage, "standing") === "seeded")
    && valueAt(projectedAnchor, "id") === valueAt(anchor, "id")
    && valueAt(projectedAnchor, "revision") === valueAt(anchor, "revision")
    && valueAt(projectedAnchor, "reconciledWatermark")
      === valueAt(anchor, "reconciledWatermark")
    && valueAt(target, "runnerId") === valueAt(status, "runnerId")
    && valueAt(target, "pid") === valueAt(status, "pid")
    && valueAt(target, "startedAt") === valueAt(status, "startedAt")
    && valueAt(target, "socketPath") === valueAt(status, "socketPath")
    && valueAt(target, "state") === valueAt(status, "state")
    && valueAt(target, "runtimeMode") === valueAt(status, "runtimeMode")
    && valueAt(target, "inputWatermark") === valueAt(status, "inputWatermark")
    && valueAt(target, "reconciledWatermark")
      === valueAt(status, "reconciledWatermark")
    && valueAt(target, "live") === valueAt(runner, "live")
    && valueAt(input, "inputId") === valueAt(correction, "inputId")
    && valueAt(input, "eventId") === valueAt(correction, "inputEventId")
    && valueAt(correction, "state") === "verification-passed"
    && valueAt(correction, "stale") === false
    && valueAt(correctionVerification, "verdict") === "passed"
    && valueAt(correctionVerification, "reportRef")
      === valueAt(correctionEvidence, "reportRef")
    && valueAt(correctionVerification, "reportDigest")
      === valueAt(correctionEvidence, "reportDigest")
    && valueAt(nextAnchor, "id") === valueAt(anchor, "id")
    && valueAt(nextAnchor, "statement") === valueAt(anchor, "statement")
    && valueAt(nextAnchor, "reconciledWatermark") === valueAt(input, "watermark");
  const sourceExact =
    valueAt(source, "standing") === "committed-primary"
    && valueAt(source, "projectId") === valueAt(missionSource, "projectId")
    && valueAt(source, "relativePath") === valueAt(missionSource, "relativePath")
    && valueAt(source, "gitHead") === valueAt(missionSource, "gitHead");
  if (!complete) {
    return {
      standing: "unavailable",
      decisionable: false,
      reason: "reconciliation action proposal contract is incomplete",
    };
  }
  if (!exact || !sourceExact) {
    return {
      standing: "stale",
      decisionable: false,
      reason:
        "runner, lineage, correction report, or committed Mission source no longer matches",
    };
  }
  if (standing !== "awaiting-principal-decision") {
    return {
      standing: String(standing ?? "unavailable"),
      decisionable: false,
      reason:
        standing === "authorized-awaiting-execution"
          ? "the exact one-use action is authorized and awaiting execution"
          : standing === "execution-attempt-consumed"
            ? "the one-use execution attempt was consumed without a terminal outcome; replay and completion claims are withheld"
          : "this proposal no longer accepts another Principal reply",
    };
  }
  if (valueAt(projected, "decision") !== null || valueAt(projected, "outcome") !== null) {
    return {
      standing: "unavailable",
      decisionable: false,
      reason: "proposal standing conflicts with retained decision or outcome evidence",
    };
  }
  return {
    standing: "awaiting-principal-decision",
    decisionable: true,
    proposalId: String(valueAt(proposal, "proposalId")),
    proposalDigest: String(valueAt(projected, "proposalDigest")),
    target:
      `${valueAt(target, "runnerId")} · pid ${valueAt(target, "pid")}`
      + ` · ${valueAt(target, "state")} · ${valueAt(target, "runtimeMode")}`,
    lineage:
      `${valueAt(anchor, "id")} · ${valueAt(anchor, "revision")}`
      + ` · watermark ${valueAt(anchor, "reconciledWatermark")}`,
    input:
      `${valueAt(input, "inputId")} · watermark ${valueAt(input, "watermark")}`
      + ` · ${valueAt(input, "sourceRef")}`,
    report:
      `${valueAt(correctionEvidence, "reportRef")}`
      + `\ndigest ${valueAt(correctionEvidence, "reportDigest")}`,
    execution:
      `2 fresh ${valueAt(execution, "adapter")} invocations`
      + ` · ${valueAt(profile, "model")} · ${valueAt(execution, "isolation")}`
      + ` · ${valueAt(execution, "maxDurationMsPerCell")}ms/cell`
      + `\n${valueAt(carrier, "version")}`
      + ` · ${valueAt(carrier, "toolPolicy")}`,
    disclosure:
      `OpenAI · ${valueAt(disclosure, "data").join(" · ")}`
      + " · repository files none · candidate files none",
    condition:
      "commit watermark 1 only when proposer=continue and independent verifier=verified-transition; every other result returns to Principal",
    recommendation: "SETTLE_CONTINUE",
    replyKey: "SETTLE_CONTINUE|RECLASSIFY_CORRECTION|HOLD",
    options: {
      SETTLE_CONTINUE: {
        immediateResult: String(valueAt(settle, "immediateResult")),
        tradeoff: String(valueAt(settle, "tradeoff")),
      },
      RECLASSIFY_CORRECTION: {
        immediateResult: String(valueAt(reclassify, "immediateResult")),
        tradeoff: String(valueAt(reclassify, "tradeoff")),
      },
      HOLD: {
        immediateResult: String(valueAt(hold, "immediateResult")),
        tradeoff: String(valueAt(hold, "tradeoff")),
      },
    },
    source:
      `${valueAt(missionSource, "relativePath")} @ ${valueAt(missionSource, "gitHead")}`,
    boundary:
      "exact two-Cell reconciliation action only · candidate write/commit/merge/publish/product acceptance withheld",
  };
}

export function correctionPresentation(correction, currentEffect) {
  const candidate = object(correction);
  const authority = object(valueAt(candidate, "authority"));
  const scope = object(valueAt(candidate, "scope"));
  const verification = object(valueAt(candidate, "verification"));
  const execution = object(valueAt(candidate, "execution"));
  const stale = valueAt(candidate, "stale");
  const hasCompleteAuthority = authorityKeys.every(
    (key) => valueAt(authority, key) !== undefined,
  );
  const hasDisclosure = valueAt(scope, "externalDisclosure") !== undefined;
  const authorityValid =
    hasCompleteAuthority
    && authorityKeys.every((key) => valueAt(authority, key) === "withheld")
    && hasDisclosure
    && valueAt(scope, "externalDisclosure") === "none";
  const projectionComplete =
    typeof stale === "boolean"
    && typeof valueAt(verification, "verdict") === "string";
  const verdict = projectionComplete
    ? valueAt(verification, "verdict")
    : "unknown";
  const standing = !authorityValid || !projectionComplete
    ? "invalid"
    : stale
      ? "stale"
      : ["passed", "failed", "pending"].includes(verdict)
        ? verdict
        : "invalid";

  const cause = object(valueAt(candidate, "cause"));
  const effect = object(currentEffect);
  const effectVerification = object(valueAt(effect, "verification"));
  const independent = object(valueAt(effectVerification, "independent"));
  const causeVerdict =
    valueAt(cause, "effectId") !== undefined
    && valueAt(cause, "effectId") === valueAt(effect, "effectId")
      ? valueAt(independent, "verdict") ?? valueAt(independent, "status")
      : undefined;

  return {
    standing,
    verdict,
    causeVerdict: typeof causeVerdict === "string" ? causeVerdict : null,
    attribution: `input actor ${valueAt(candidate, "actorRef") ?? "未投影"} · input source ${valueAt(candidate, "sourceRef") ?? "未投影"} · executor ${valueAt(execution, "executorRef") ?? "未保留"}`,
    executionEvidence: valueAt(execution, "patchDigest") === undefined
      ? "controlled patch 未保留"
      : `patch ${String(valueAt(execution, "patchDigest")).slice(0, 12)} · manifest ${String(valueAt(execution, "manifestDigest") ?? "未投影").slice(0, 12)}`,
    boundary: authorityValid
      ? "external none · commit withheld · merge withheld · publish withheld · product acceptance withheld"
      : "authority or disclosure evidence missing/conflicting · correction is not accepted",
  };
}

export function candidateEvidencePresentation(worktrees, activity, observedAt) {
  const effect = object(valueAt(activity, "currentEffect"));
  const correction = object(valueAt(activity, "currentCorrection"));
  const effectId = valueAt(effect, "effectId");
  const workspace = object(valueAt(effect, "workspace"));
  const workspaceRoot = valueAt(workspace, "root");

  if (
    typeof effectId !== "string"
    || typeof workspaceRoot !== "string"
    || Object.keys(correction).length === 0
  ) {
    return { standing: "absent" };
  }

  const candidates = Array.isArray(worktrees) ? worktrees : [];
  const worktree = candidates.find(
    (candidate) => valueAt(candidate, "path") === workspaceRoot,
  );
  if (worktree === undefined) {
    return {
      standing: "unavailable",
      reason: "Effect workspace 与已观察项目 worktree 无精确匹配；不能形成 Candidate 结论。",
    };
  }

  const cause = object(valueAt(correction, "cause"));
  const verification = object(valueAt(correction, "verification"));
  const authority = object(valueAt(correction, "authority"));
  const authorityValid = authorityKeys.every(
    (key) => valueAt(authority, key) === "withheld",
  );
  const correctionCurrent =
    valueAt(cause, "effectId") === effectId
    && valueAt(correction, "state") === "verification-passed"
    && valueAt(verification, "verdict") === "passed"
    && valueAt(correction, "stale") === false
    && valueAt(effect, "stale") === true;
  const reportRef = valueAt(verification, "reportRef");
  const reportDigest = valueAt(verification, "reportDigest");
  const evidenceComplete =
    typeof reportRef === "string"
    && /^[a-f0-9]{64}$/.test(String(reportDigest ?? ""))
    && typeof valueAt(correction, "recordedAt") === "string"
    && authorityValid;

  if (!correctionCurrent || !evidenceComplete) {
    return {
      standing: "unavailable",
      reason:
        "Effect、Correction、验证报告或 withheld authority 不完整/冲突；不能把当前 Candidate 解释为已验证。",
    };
  }

  const changedPaths = valueAt(correction, "changedFromFailedSubject");
  const scope = object(valueAt(correction, "scope"));
  const paths = Array.isArray(changedPaths)
    ? changedPaths
    : Array.isArray(valueAt(scope, "writePaths"))
      ? valueAt(scope, "writePaths")
      : [];
  const branch = valueAt(worktree, "gitBranch");
  const head = valueAt(worktree, "head");
  const dirty = valueAt(worktree, "dirty");

  return {
    standing: "verified-correction",
    headline: "修正验证通过 · 尚未集成",
    conclusion:
      `修正后的候选变更已通过独立验证；原 Effect 证据已 stale。`
      + `当前 Git 现场为 ${dirty === true ? "dirty" : dirty === false ? "clean" : "状态未知"}，`
      + "未获得集成或产品接受权限。",
    candidate: {
      path: workspaceRoot,
      branch: typeof branch === "string" ? branch : "detached",
      head: typeof head === "string" ? head : "unknown",
      dirty: dirty === true ? true : dirty === false ? false : null,
    },
    changedPaths: paths.map(String),
    recordedAt: String(valueAt(correction, "recordedAt")),
    observedAt: typeof observedAt === "string" ? observedAt : null,
    reportRef,
    reportDigest,
    boundary:
      "commit withheld · merge withheld · publish withheld · product acceptance withheld",
  };
}

export function runnerPresentation(runner) {
  const status = runnerStatus(runner);
  const cachedMode = valueAt(status, "state") ?? valueAt(status, "status") ?? "unknown";
  const live = valueAt(runner, "live");
  if (live === false) {
    return {
      mode: "carrier-unreachable",
      cachedMode: String(cachedMode),
      live: false,
    };
  }
  const activity = object(valueAt(runner, "activity"));
  const lineage = intentLineagePresentation(activity);
  if (lineage.mode !== null) {
    return {
      mode: lineage.mode,
      cachedMode: String(cachedMode),
      live: live === true ? true : null,
      intentLineage: lineage.standing,
    };
  }
  return {
    mode: String(cachedMode),
    cachedMode: String(cachedMode),
    live: live === true ? true : null,
  };
}

export function verifiedCorrectionAwaitsSystemSettlement(runner) {
  const status = runnerStatus(runner);
  const activity = object(valueAt(runner, "activity"));
  const lineage = intentLineagePresentation(activity);
  const correction = object(valueAt(activity, "currentCorrection"));
  const verification = object(valueAt(correction, "verification"));
  return (
    lineage.blocksSemanticWork === false
    &&
    valueAt(status, "state") === "input-pending"
    && Number(valueAt(status, "inputWatermark")) > Number(valueAt(status, "reconciledWatermark"))
    && valueAt(correction, "state") === "verification-passed"
    && valueAt(verification, "verdict") === "passed"
    && valueAt(correction, "stale") === false
  );
}
