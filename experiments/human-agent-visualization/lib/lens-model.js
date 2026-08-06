import { canonicalJson } from "./evidence-bundle.js";

const EXECUTION_PRESENTATIONS = {
  "current-effect-exact": {
    label: "当前 effect 已精确关联",
    provesCurrentExecution: true,
    granularity: "effect",
    explanation:
      "保留的 current effect 与这个任务上下文及授权精确关联，因此可以在 effect 粒度确认当前执行。",
    disconfirmingEvidence:
      "任务上下文、授权、effect selector 或当前载体任一不匹配，都会使这个精确状态失效。",
  },
  "current-turn-exact": {
    label: "当前 turn 已精确关联",
    provesCurrentExecution: true,
    granularity: "turn",
    explanation:
      "保留的 current turn 与这个任务上下文及授权精确关联，因此可以在 turn 粒度确认当前执行，但不能上升为 effect 粒度。",
    disconfirmingEvidence:
      "任务上下文、授权、turn 或当前载体任一不匹配，都会使这个精确状态失效。",
  },
  "authorization-consumption-verified": {
    label: "授权消费已验证",
    provesCurrentExecution: false,
    granularity: "launch authorization",
    explanation:
      "一个有边界的启动授权已经被消费；这不能证明 Agent 此刻正在执行该任务。",
    disconfirmingEvidence:
      "receipt 或 consumption claim 无效或不匹配时，连这条有边界的授权证据也不成立。",
  },
  "legacy-unproven": {
    label: "旧版证据未证明执行",
    provesCurrentExecution: false,
    granularity: "none",
    explanation:
      "旧版 runtime 引用无法与保留的任务上下文精确关联，因此当前执行未被证明。",
    disconfirmingEvidence:
      "精确的结构化任务上下文与 runtime 引用可以建立更强的当前状态。",
  },
  unavailable: {
    label: "当前执行证据不可用",
    provesCurrentExecution: false,
    granularity: "none",
    explanation:
      "保留的证据包没有这个任务的精确 current turn 或 current effect 证据，因此当前执行未被证明。",
    disconfirmingEvidence:
      "与这个任务上下文精确关联的 current turn 或 effect 引用可以建立当前执行。",
  },
};

export function executionStandingPresentation(standing) {
  const presentation = EXECUTION_PRESENTATIONS[standing];
  if (presentation === undefined) throw new TypeError(`Unknown execution standing '${standing}'`);
  return { standing, ...presentation };
}

function identityFor(bundle, sourceRef) {
  return bundle.sourceIdentities.find((identity) => identity.sourceRef === sourceRef) ?? null;
}

function evidence(bundle, {
  authority,
  sourceRef,
  sourceRefs = sourceRef === null ? [] : [sourceRef],
  revision,
  freshness,
  standing,
  disconfirmingEvidence,
}) {
  const identity = sourceRef === null ? null : identityFor(bundle, sourceRef);
  return {
    authority,
    sourceRef: sourceRef ?? "无——仅为临时解释",
    sourceRefs,
    revision: revision ?? identity?.revision ?? "未提供",
    freshness,
    standing,
    disconfirmingEvidence,
  };
}

function node(id, layer, x, y, label, detail, evidenceValue) {
  return { id, kind: "node", layer, x, y, label, detail, evidence: evidenceValue };
}

function edge(id, layer, from, to, label, relationState, evidenceValue, dotted = false) {
  return {
    id,
    kind: "edge",
    layer,
    from,
    to,
    label,
    relationState,
    dotted,
    evidence: evidenceValue,
  };
}

export function buildLensModel(bundle) {
  const snapshot = bundle.artifacts.snapshot.value;
  const observation = bundle.artifacts.principalTaskObservation.value;
  const inputs = bundle.artifacts.otherBuilderInputs.value;
  const projection = bundle.artifacts.workItemSetProjection.value;
  const task = observation.task;
  const workItem = projection.items[0];
  const executionContext = workItem.taskDetail.executionContext;
  const executionPresentation = executionStandingPresentation(executionContext.standing);
  const taskFreshness = { kind: "observed-at-build", observedAt: snapshot.generatedAt };
  const taskLink = task.executionLink;
  const carrier = workItem.taskDetail.missionContext.currentCarrier;
  const currentTurn = executionContext.currentTurn;
  const currentEffect = executionContext.currentEffect;
  const authorization = inputs.authorization;
  const claim = inputs.consumptionClaim;
  const mission = inputs.mission;

  const nodes = [
    node(
      "task",
      "source",
      110,
      92,
      task.title,
      `nextActor = ${task.nextActor}`,
      evidence(bundle, {
        authority: "Workbench 本地任务源",
        sourceRef: observation.sourceRef,
        revision: String(observation.sourceRevision),
        freshness: taskFreshness,
        standing: `nextActor=${task.nextActor}——只表示责任归属`,
        disconfirmingEvidence: "后续任务源修订可以改变责任归属，但仍不能证明 runtime 已启动。",
      }),
    ),
    node(
      "mission",
      "source",
      110,
      238,
      mission.title,
      "任务组语义（Mission）",
      evidence(bundle, {
        authority: "mission-semantics",
        sourceRef: mission.sourceRef,
        revision: mission.revision,
        freshness: taskFreshness,
        standing: "已观察到 Mission 上下文",
        disconfirmingEvidence: "Mission identity 缺失或不同，会使任务上下文关系断开。",
      }),
    ),
    node(
      "execution-link",
      "source",
      350,
      92,
      "任务执行链接",
      taskLink?.standing ?? "unavailable",
      evidence(bundle, {
        authority: "任务保留的 execution selector",
        sourceRef: taskLink?.sourceRef ?? observation.sourceRef,
        revision: String(observation.sourceRevision),
        freshness: taskFreshness,
        standing: taskLink?.standing ?? "unavailable",
        disconfirmingEvidence: "task-context digest 或授权不匹配，会使这条链接不可用。",
      }),
    ),
    node(
      "authorization",
      "source",
      110,
      390,
      "授权收据",
      "有边界的启动授权",
      evidence(bundle, {
        authority: authorization.authority,
        sourceRef: authorization.sourceRef,
        freshness: taskFreshness,
        standing: authorization.standing,
        disconfirmingEvidence: "receipt 过期、无效或不匹配，会移除这份有边界的启动权。",
      }),
    ),
    node(
      "consumption",
      "source",
      350,
      390,
      "消费声明",
      "只证明启动授权已消费",
      evidence(bundle, {
        authority: claim.authority,
        sourceRef: claim.sourceRef,
        freshness: taskFreshness,
        standing: claim.standing,
        disconfirmingEvidence: "receipt 或 claim 不匹配会移除消费证据；有效 claim 仍不能证明当前执行。",
      }),
    ),
    node(
      "carrier",
      "source",
      110,
      540,
      "同一任务组载体",
      "execution-unproven",
      evidence(bundle, {
        authority: "runner 观察",
        sourceRef: carrier?.sourceRef ?? "runner:unavailable",
        freshness: carrier?.freshness ?? { kind: "unverified", reason: "未保留载体。" },
        standing: "execution-unproven",
        disconfirmingEvidence: "必须存在精确的 current turn 或 effect 关联；只有 Mission identity 和 live 状态，永远不能建立任务执行。",
      }),
    ),
    node(
      "current-turn",
      "source",
      350,
      540,
      "当前轮次证据",
      currentTurn.standing,
      evidence(bundle, {
        authority: "runtime 执行证据",
        sourceRef: currentTurn.sourceRefs[0],
        sourceRefs: currentTurn.sourceRefs,
        freshness: taskFreshness,
        standing: currentTurn.standing,
        disconfirmingEvidence: currentTurn.reason,
      }),
    ),
    node(
      "current-effect",
      "source",
      590,
      540,
      "当前执行片段证据",
      currentEffect.standing,
      evidence(bundle, {
        authority: "runtime 执行证据",
        sourceRef: currentEffect.sourceRefs[0],
        sourceRefs: currentEffect.sourceRefs,
        freshness: taskFreshness,
        standing: currentEffect.standing,
        disconfirmingEvidence: currentEffect.reason,
      }),
    ),
    node(
      "exact-join",
      "projection",
      650,
      270,
      "精确执行关联",
      "可重建投影",
      evidence(bundle, {
        authority: "投影——没有事实权威",
        sourceRef: "derived:work-item-set-projection",
        sourceRefs: workItem.evidence.sourceRefs,
        revision: bundle.builder.revision,
        freshness: taskFreshness,
        standing: executionContext.standing,
        disconfirmingEvidence: executionPresentation.disconfirmingEvidence,
      }),
    ),
    node(
      "execution-standing",
      "projection",
      890,
      270,
      executionPresentation.label,
      executionPresentation.provesCurrentExecution
        ? `证明当前执行 · ${executionPresentation.granularity} 粒度`
        : "不能证明当前执行",
      evidence(bundle, {
        authority: "受来源约束的投影——没有独立事实权威",
        sourceRef: "derived:execution-standing",
        sourceRefs: workItem.evidence.sourceRefs,
        revision: bundle.builder.revision,
        freshness: taskFreshness,
        standing: executionContext.standing,
        disconfirmingEvidence: executionPresentation.disconfirmingEvidence,
      }),
    ),
    node(
      "agent-explanation",
      "explanation",
      890,
      92,
      "Agent 解释",
      "责任归属不等于执行",
      evidence(bundle, {
        authority: "临时 Agent 解释",
        sourceRef: null,
        revision: "仅当前渲染",
        freshness: { kind: "ephemeral" },
        standing: "临时解释",
        disconfirmingEvidence: "隐藏这一层后，必须仍能只从来源与投影证据重建相同状态。",
      }),
    ),
  ];

  const edges = [
    edge(
      "task-mission",
      "source",
      "task",
      "mission",
      "仅为上下文",
      "available",
      evidence(bundle, {
        authority: "仅为任务上下文",
        sourceRef: observation.sourceRef,
        freshness: taskFreshness,
        standing: "context-only",
        disconfirmingEvidence: "project 或 Mission identity 不匹配，会使这条上下文关系断开。",
      }),
    ),
    edge(
      "task-link",
      "source",
      "task",
      "execution-link",
      "保留执行链接",
      taskLink === null ? "unavailable" : "available",
      evidence(bundle, {
        authority: "任务保留的关系",
        sourceRef: observation.sourceRef,
        freshness: taskFreshness,
        standing: taskLink === null ? "unavailable" : taskLink.standing,
        disconfirmingEvidence: "链接缺失或 task-context digest 不匹配，会阻断精确归属。",
      }),
    ),
    edge(
      "link-join",
      "projection",
      "execution-link",
      "exact-join",
      "精确任务上下文",
      taskLink?.standing === "exact-task-context" ? "available" : "mismatched",
      evidence(bundle, {
        authority: "确定性等值检查",
        sourceRef: taskLink?.sourceRef ?? observation.sourceRef,
        freshness: taskFreshness,
        standing: taskLink?.standing ?? "unavailable",
        disconfirmingEvidence: "task-context 或 authorization selector 任一不匹配，都会阻断这条关联。",
      }),
    ),
    edge(
      "authorization-join",
      "projection",
      "authorization",
      "exact-join",
      "有边界的启动",
      authorization.standing === "authorization-consumed" ? "available" : "unavailable",
      evidence(bundle, {
        authority: authorization.authority,
        sourceRef: authorization.sourceRef,
        freshness: taskFreshness,
        standing: authorization.standing,
        disconfirmingEvidence: "receipt 必须与精确的 Mission、任务链接、proposal 和来源修订一致。",
      }),
    ),
    edge(
      "consumption-join",
      "projection",
      "consumption",
      "exact-join",
      "只证明授权消费",
      claim.standing === "verified" ? "available" : "unavailable",
      evidence(bundle, {
        authority: claim.authority,
        sourceRef: claim.sourceRef,
        freshness: taskFreshness,
        standing: `${claim.standing} — ${claim.evidenceBoundary}`,
        disconfirmingEvidence: "没有精确的 current turn 或 effect，授权消费证据永远不能建立当前执行。",
      }),
    ),
    edge(
      "carrier-join",
      "projection",
      "carrier",
      "exact-join",
      "只有同一 Mission",
      "informational",
      evidence(bundle, {
        authority: "仅观察的载体关系",
        sourceRef: carrier?.sourceRef ?? "runner:unavailable",
        freshness: carrier?.freshness ?? { kind: "unverified" },
        standing: "same-mission-current-carrier · execution-unproven",
        disconfirmingEvidence: "即使载体是 live running，在出现精确 runtime 关联前，这个任务的执行仍未被证明。",
      }),
      true,
    ),
    edge(
      "turn-join",
      "projection",
      "current-turn",
      "exact-join",
      "当前轮次",
      currentTurn.standing,
      evidence(bundle, {
        authority: "runtime 证据关联",
        sourceRef: currentTurn.sourceRefs[0],
        sourceRefs: currentTurn.sourceRefs,
        freshness: taskFreshness,
        standing: currentTurn.standing,
        disconfirmingEvidence: currentTurn.reason,
      }),
    ),
    edge(
      "effect-join",
      "projection",
      "current-effect",
      "exact-join",
      "当前执行片段",
      currentEffect.standing,
      evidence(bundle, {
        authority: "runtime 证据关联",
        sourceRef: currentEffect.sourceRefs[0],
        sourceRefs: currentEffect.sourceRefs,
        freshness: taskFreshness,
        standing: currentEffect.standing,
        disconfirmingEvidence: currentEffect.reason,
      }),
    ),
    edge(
      "join-standing",
      "projection",
      "exact-join",
      "execution-standing",
      "得出源执行状态",
      "source-defined",
      evidence(bundle, {
        authority: "可重建的状态投影",
        sourceRef: "derived:execution-standing",
        sourceRefs: workItem.evidence.sourceRefs,
        revision: bundle.builder.revision,
        freshness: taskFreshness,
        standing: executionContext.standing,
        disconfirmingEvidence: executionPresentation.disconfirmingEvidence,
      }),
    ),
    edge(
      "explanation-standing",
      "explanation",
      "agent-explanation",
      "execution-standing",
      "解释可见证据",
      "ephemeral",
      evidence(bundle, {
        authority: "临时 Agent 解释",
        sourceRef: null,
        revision: "仅当前渲染",
        freshness: { kind: "ephemeral" },
        standing: "临时解释",
        disconfirmingEvidence: "移除这条边后，仅看来源的视图仍必须保留相同状态。",
      }),
      true,
    ),
  ];

  const issueCandidates = executionPresentation.provesCurrentExecution
    ? []
    : ["effect-join", "turn-join", "link-join", "authorization-join", "consumption-join"];
  const firstIssueEdgeId = issueCandidates.find((id) => {
    const relation = edges.find((candidate) => candidate.id === id);
    return ["unavailable", "mismatched", "legacy-unproven"].includes(relation?.relationState);
  }) ?? null;

  return {
    subject: bundle.subject,
    generatedAt: bundle.generatedAt,
    bindingDigest: bundle.bindingDigest,
    execution: executionPresentation,
    nodes,
    edges,
    firstIssueEdgeId,
  };
}

function comparisonSignature(element) {
  return canonicalJson({
    label: element.label,
    ...(element.detail === undefined ? {} : { detail: element.detail }),
    ...(element.relationState === undefined
      ? {}
      : { relationState: element.relationState }),
    standing: element.evidence.standing,
  });
}

function comparisonSummary(element) {
  return {
    label: element.label,
    ...(element.detail === undefined ? {} : { detail: element.detail }),
    ...(element.relationState === undefined ? {} : { relationState: element.relationState }),
    standing: element.evidence.standing,
  };
}

export function diffLensModels(current, prior) {
  const priorElements = new Map(
    [...prior.nodes, ...prior.edges].map((element) => [element.id, element]),
  );
  const currentElements = [...current.nodes, ...current.edges];
  const states = Object.fromEntries(currentElements.map((element) => {
    const priorElement = priorElements.get(element.id);
    if (priorElement === undefined) return [element.id, "added"];
    return [
      element.id,
      comparisonSignature(element) === comparisonSignature(priorElement)
        ? "unchanged"
        : "changed",
    ];
  }));
  const currentIds = new Set(currentElements.map((element) => element.id));
  const removed = [...priorElements.keys()].filter((id) => !currentIds.has(id));
  const changes = Object.fromEntries(currentElements.flatMap((element) => {
    if (states[element.id] !== "changed") return [];
    return [[element.id, {
      before: comparisonSummary(priorElements.get(element.id)),
      after: comparisonSummary(element),
    }]];
  }));
  const counts = {
    changed: Object.values(states).filter((state) => state === "changed").length,
    added: Object.values(states).filter((state) => state === "added").length,
    removed: removed.length,
  };
  return { states, changes, removed, counts };
}
