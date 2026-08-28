import {
  createEvidenceBundle,
  RELATION_CONTRACT_VERSION,
} from "../lib/evidence-bundle.js";

const PROJECT_KEY = "registered:rossovia";
const MISSION_ID = "human-agent-visualization";
const TASK_SOURCE_REF = ".rosso/state/tasks.json";
const MISSION_SOURCE_REF = "apps/missions/human-agent-visualization.json";

function subject(taskId) {
  return {
    lensId: "execution-boundary",
    id: `execution-boundary:${taskId}`,
    taskContext: {
      taskId,
      projectKey: PROJECT_KEY,
      missionId: MISSION_ID,
    },
  };
}

function caseInputs({
  taskId,
  title,
  generatedAt,
  gitRevision,
  taskRevision,
  authorizationId,
  runnerId,
  currentTurnStanding,
  currentEffectStanding,
  effectId,
}) {
  const runnerSourceRef = `.rosso/missions/${MISSION_ID}/runner-status.json`;
  const authorizationSourceRef = `.rosso/authorizations/${authorizationId}.json`;
  const claimSourceRef = `.rosso/authorization-claims/${authorizationId}.json`;
  const turnSourceRef = `.rosso/missions/${MISSION_ID}/turns/${runnerId}.json`;
  const effectSourceRef = `.rosso/missions/${MISSION_ID}/effects/${effectId}.json`;
  const taskContextDigest = `task-context:${taskId}:r${taskRevision}`;

  const snapshot = {
    version: "rosso.principal-workbench-snapshot.v1",
    generatedAt,
    complete: true,
    sourceIdentities: [
      {
        kind: "mission-semantic-source",
        id: MISSION_ID,
        sourceRef: MISSION_SOURCE_REF,
        revision: gitRevision,
      },
      {
        kind: "runner-observation",
        id: runnerId,
        sourceRef: runnerSourceRef,
        revision: generatedAt,
      },
    ],
    projects: [
      {
        projectKey: PROJECT_KEY,
        missions: [{ id: MISSION_ID, sourceRef: MISSION_SOURCE_REF }],
      },
    ],
    runners: [
      {
        runnerId,
        missionId: MISSION_ID,
        state: "running",
        sourceRef: runnerSourceRef,
        observedAt: generatedAt,
      },
    ],
  };

  const principalTaskObservation = {
    standing: "available",
    sourceRef: TASK_SOURCE_REF,
    sourceRevision: taskRevision,
    task: {
      id: taskId,
      title,
      nextActor: "agent",
      binding: {
        projectKey: PROJECT_KEY,
        missionId: MISSION_ID,
      },
      executionLink: {
        authorizationId,
        sourceRef: TASK_SOURCE_REF,
        taskContextDigest,
        standing: "exact-task-context",
      },
    },
  };

  const otherBuilderInputs = {
    mission: {
      id: MISSION_ID,
      title: "人—Agent 可视化",
      sourceRef: MISSION_SOURCE_REF,
      revision: gitRevision,
    },
    authorization: {
      authorizationId,
      sourceRef: authorizationSourceRef,
      standing: "authorization-consumed",
      authority: "bounded-launch-authorization",
    },
    consumptionClaim: {
      authorizationId,
      sourceRef: claimSourceRef,
      standing: "verified",
      authority: "launch-authorization-consumption-evidence",
      evidenceBoundary: "proves-one-launch-authorization-consumed-only",
    },
    currentCarrier: {
      runnerId,
      state: "running",
      live: true,
      sourceRef: runnerSourceRef,
      freshness: { kind: "live", observedAt: generatedAt },
    },
    executionEvidence: {
      authorizationConsumption: {
        standing: "verified",
        sourceRefs: [authorizationSourceRef, claimSourceRef],
        evidenceBoundary: "proves-one-launch-authorization-consumed-only",
      },
      currentTurn: {
        standing: currentTurnStanding,
        sourceRefs: [turnSourceRef],
        reason: currentTurnStanding === "unavailable"
          ? "这个任务上下文没有保留精确的 current turn 引用。"
          : "current turn 保留了精确的任务上下文和授权引用。",
      },
      currentEffect: {
        standing: currentEffectStanding,
        sourceRefs: [effectSourceRef],
        effectId,
        reason: currentEffectStanding === "unavailable"
          ? "这个任务上下文没有保留精确的 current effect 引用。"
          : "current effect 保留了精确的任务上下文和授权引用。",
      },
    },
    sourceIdentities: [
      {
        kind: "execution-authorization-receipt",
        id: authorizationId,
        sourceRef: authorizationSourceRef,
        revision: generatedAt,
      },
      {
        kind: "execution-authorization-claim",
        id: authorizationId,
        sourceRef: claimSourceRef,
        revision: generatedAt,
      },
      {
        kind: "current-turn-evidence",
        id: runnerId,
        sourceRef: turnSourceRef,
        revision: generatedAt,
      },
      {
        kind: "current-effect-evidence",
        id: effectId,
        sourceRef: effectSourceRef,
        revision: generatedAt,
      },
    ],
  };

  return { snapshot, principalTaskObservation, otherBuilderInputs };
}

async function bundleFor(config) {
  const inputs = caseInputs(config);
  return createEvidenceBundle({
    ...inputs,
    subject: subject(config.taskId),
    relationContractVersion: RELATION_CONTRACT_VERSION,
  });
}

export async function buildFixtureCases() {
  const exactPrior = await bundleFor({
    taskId: "task-exact-execution",
    title: "解释当前执行边界",
    generatedAt: "2026-08-05T16:00:00.000Z",
    gitRevision: "git:7cb8d66",
    taskRevision: 7,
    authorizationId: "auth-exact-01",
    runnerId: "runner-visual-01",
    currentTurnStanding: "exact",
    currentEffectStanding: "unavailable",
    effectId: "effect-visual-00",
  });
  const exactCurrent = await bundleFor({
    taskId: "task-exact-execution",
    title: "解释当前执行边界",
    generatedAt: "2026-08-05T16:08:00.000Z",
    gitRevision: "git:7cb8d66",
    taskRevision: 8,
    authorizationId: "auth-exact-01",
    runnerId: "runner-visual-01",
    currentTurnStanding: "exact",
    currentEffectStanding: "exact",
    effectId: "effect-visual-01",
  });
  const consumedOnly = await bundleFor({
    taskId: "task-consumed-only",
    title: "检查只有授权消费证据的执行主张",
    generatedAt: "2026-08-05T16:12:00.000Z",
    gitRevision: "git:7cb8d66",
    taskRevision: 3,
    authorizationId: "auth-consumed-02",
    runnerId: "runner-visual-02",
    currentTurnStanding: "unavailable",
    currentEffectStanding: "unavailable",
    effectId: "effect-visual-02",
  });

  return [
    {
      id: "exact-current-effect",
      label: "当前执行片段精确关联",
      description: "当前证据到达 current-effect-exact；兼容的上一份证据包停在 current-turn-exact。",
      current: exactCurrent,
      prior: exactPrior,
    },
    {
      id: "authorization-consumed-only",
      label: "只有授权消费证据",
      description: "启动授权的消费已经验证，但当前执行仍未被证明。",
      current: consumedOnly,
      prior: null,
    },
  ];
}
