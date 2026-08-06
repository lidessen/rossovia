import { canonicalJson, digestValue } from "./evidence-bundle.js";

export const SKILL_BUNDLE_VERSION = "human-agent-visualization.skill-evidence-bundle.v2";
export const SKILL_PROJECTION_VERSION = "human-agent-visualization.skill-lens-projection.v2";
export const SKILL_BUILDER_ID = "skill-lens-fixture-builder";
export const SKILL_BUILDER_REVISION = "prototype-r3";

const ARTIFACT_NAMES = [
  "request",
  "generalOwnerGateSource",
  "actionGapHypothesis",
  "minimumFormHypothesis",
  "skillSource",
  "rewriteCommand",
  "directReferences",
  "sequenceSource",
  "principleLineage",
  "runtimeObservation",
  "behaviorEvidence",
];

function evidence({
  authority,
  sourceRef,
  sourceRefs = [sourceRef],
  revision,
  standing,
  disconfirmingEvidence,
  excerpt,
}) {
  return {
    authority,
    sourceRef,
    sourceRefs,
    revision,
    freshness: { kind: "frozen", observedAt: "2026-08-05T18:00:00.000Z" },
    standing,
    disconfirmingEvidence,
    excerpt,
  };
}

function step(id, order, layer, title, summary, evidenceValue) {
  return { id, order, layer, title, summary, evidence: evidenceValue };
}

const REQUIRED_REWRITE_REFERENCES = [
  "references/expression-team.md",
  "references/expression-layers.md",
  "references/evaluation.md",
];

function dispatchMapFromSkill(content) {
  const dispatch = {};
  const prefix = "- With `";
  const separator = "`, read and follow ";
  for (const line of content.split("\n")) {
    if (!line.startsWith(prefix) || !line.includes(separator) || !line.endsWith(".")) continue;
    const separatorIndex = line.indexOf(separator);
    const operation = line.slice(prefix.length, separatorIndex);
    const commandPath = line.slice(separatorIndex + separator.length, -1);
    dispatch[operation] = commandPath;
  }
  return dispatch;
}

function directReferenceRefsFromRewrite(content) {
  return REQUIRED_REWRITE_REFERENCES
    .filter((reference) => content.includes(reference))
    .map((reference) => `skills/skill-engineering/${reference}`);
}

function lineageFromSkill(content) {
  const primaryLine = content.split("\n").find((line) => line.startsWith("**Primary:** "));
  const supportingLine = content.split("\n").find((line) => line.startsWith("**Supporting:** "));
  return {
    primary: primaryLine?.slice("**Primary:** ".length) ?? null,
    supporting: supportingLine
      ?.slice("**Supporting:** ".length)
      .split(",")
      .map((value) => value.trim()) ?? [],
  };
}

function sequenceContains(sequenceContent, principleId) {
  return sequenceContent.split("\n").some((line) => line.startsWith(`${principleId}｜`));
}

export function buildSkillLensProjection(inputs) {
  const {
    request,
    generalOwnerGateSource,
    actionGapHypothesis,
    minimumFormHypothesis,
    skillSource,
    rewriteCommand,
    directReferences,
    sequenceSource,
    principleLineage,
    runtimeObservation,
    behaviorEvidence,
  } = inputs;
  const dispatchMap = dispatchMapFromSkill(skillSource.content);
  const triggerCompatible = request.operation === "rewrite"
    && dispatchMap.rewrite === "commands/rewrite.md";
  const selectedReferenceRefs = directReferenceRefsFromRewrite(rewriteCommand.content);

  return {
    version: SKILL_PROJECTION_VERSION,
    subject: {
      id: "skill-engineering",
      operation: "rewrite",
      revision: skillSource.revision,
      sourceSetRevision: skillSource.sourceSetRevision,
    },
    question: request.question,
    standings: {
      triggerCompatibility: triggerCompatible ? "trigger-compatible" : "trigger-incompatible",
      methodEligibility: "eligibility-unproven",
      runtimeActivation: runtimeObservation.standing,
      behaviorEvidence: behaviorEvidence.standing,
    },
    steps: [
      step(
        "request",
        1,
        "source",
        "冻结 rewrite 请求",
        request.text,
        evidence({
          authority: "冻结的实验请求记录",
          sourceRef: request.sourceRef,
          revision: request.revision,
          standing: "retained-request",
          disconfirmingEvidence: "如果原始请求不是 rewrite 现有 Skill，当前 dispatch 选择必须重建。",
          excerpt: request.text,
        }),
      ),
      step(
        "trigger-compatibility",
        2,
        "projection",
        "触发兼容性",
        "请求要求 rewrite 现有 Skill；skill-engineering 明确声明 rewrite 路径。",
        evidence({
          authority: "请求 intent 与 Skill dispatch 的确定性等值检查",
          sourceRef: "derived:trigger-compatibility",
          sourceRefs: [request.sourceRef, skillSource.sourceRef],
          revision: SKILL_BUILDER_REVISION,
          standing: triggerCompatible ? "trigger-compatible" : "trigger-incompatible",
          disconfirmingEvidence: "请求 intent 改变，或 Skill 不再声明 rewrite dispatch，会推翻兼容性。",
          excerpt: "request.operation = rewrite ↔ declared operation = rewrite",
        }),
      ),
      step(
        "action-gap",
        3,
        "explanation",
        "Action-gap hypothesis",
        "具体请求没有保留 recurring failure 记录；这里只展示待验证的 fixture hypothesis。",
        evidence({
          authority: "Fixture-authored hypothesis；已采纳决定只支持通用 owner/gate",
          sourceRef: actionGapHypothesis.sourceRef,
          sourceRefs: [actionGapHypothesis.sourceRef, generalOwnerGateSource.sourceRef],
          revision: actionGapHypothesis.revision,
          standing: "fixture-hypothesis",
          disconfirmingEvidence: "真实 failure 若不重复、未定位到 Skill 表达层，或属于其他 owner，就推翻该 hypothesis。",
          excerpt: `${actionGapHypothesis.excerpt}\n\n通用 gate 来源摘录：\n${generalOwnerGateSource.excerpt}`,
        }),
      ),
      step(
        "minimum-form",
        4,
        "explanation",
        "Minimum-form hypothesis",
        "具体请求没有保留 minimum-form decision；rewrite-existing-skill 只是待验证假设。",
        evidence({
          authority: "Fixture-authored hypothesis；没有事实或接受权",
          sourceRef: minimumFormHypothesis.sourceRef,
          revision: minimumFormHypothesis.revision,
          standing: "fixture-hypothesis",
          disconfirmingEvidence: "若现有 command、reference 或项目局部说明已能闭合缺口，就不应 rewrite 整个 Skill。",
          excerpt: minimumFormHypothesis.excerpt,
        }),
      ),
      step(
        "method-eligibility",
        5,
        "projection",
        "方法适格性",
        "没有具体 recurring failure 与 minimum-form 决定，因此当前只能是 eligibility-unproven。",
        evidence({
          authority: "由缺失的具体 gate 输入重建的投影",
          sourceRef: "derived:method-eligibility",
          sourceRefs: [actionGapHypothesis.sourceRef, minimumFormHypothesis.sourceRef],
          revision: SKILL_BUILDER_REVISION,
          standing: "eligibility-unproven",
          disconfirmingEvidence: "保留可核对的 recurring failure、localized owner 与 minimum-form decision 后才可重建此 standing。",
          excerpt: "missing: retained recurring failure + retained minimum-form decision",
        }),
      ),
      step(
        "owned-judgment",
        6,
        "source",
        "拥有的判断",
        "判断可复用 Skill 是否是闭合 Agent 行动缺口的最小形式，并把它表达成可测试的行动路径。",
        evidence({
          authority: "skill-engineering 的 Scope 与 Core method",
          sourceRef: skillSource.sourceRef,
          revision: skillSource.revision,
          standing: "source-declared-scope",
          disconfirmingEvidence: "若问题不是 Skill trigger、表达、分层或行为评价，它必须路由给实际 owner。",
          excerpt: skillSource.scopeExcerpt,
        }),
      ),
      step(
        "rewrite-dispatch",
        7,
        "projection",
        "选择 rewrite dispatch",
        "所选 rewrite dispatch 要求／预计加载 owning SKILL.md、rewrite command 与其直接 references；这不是 observed loading。",
        evidence({
          authority: "从请求 operation 与直接 dispatch/reference 边确定性选择",
          sourceRef: "derived:selected-declared-path",
          sourceRefs: [skillSource.sourceRef, rewriteCommand.sourceRef, ...selectedReferenceRefs],
          revision: SKILL_BUILDER_REVISION,
          standing: "selected-declared-path",
          disconfirmingEvidence: "若操作改为 create/review/test，或 rewrite command 的直接依赖改变，必须重建选择。",
          excerpt: [rewriteCommand.sourceRef, ...selectedReferenceRefs].join("\n"),
        }),
      ),
      step(
        "principle-lineage",
        8,
        "source",
        "声明的 Principle lineage",
        `${principleLineage.primary} 为 Primary；${principleLineage.supporting.join("、")} 为 Supporting。声明不等于因果证明。`,
        evidence({
          authority: "Skill 声明与宿主 Sequence",
          sourceRef: principleLineage.sourceRef,
          sourceRefs: principleLineage.sourceRefs,
          revision: principleLineage.revision,
          standing: "declared-lineage-only",
          disconfirmingEvidence: "没有 expression-team 决策记录或行为对照时，不能声称某个 P-ID 导致行为改善。",
          excerpt: principleLineage.excerpt,
        }),
      ),
      step(
        "runtime-activation",
        9,
        "source",
        "Runtime activation",
        "冻结包没有保留 runtime 激活或实际文件加载轨迹。",
        evidence({
          authority: "冻结 runtime observation",
          sourceRef: runtimeObservation.sourceRef,
          revision: runtimeObservation.revision,
          standing: runtimeObservation.standing,
          disconfirmingEvidence: "绑定同一请求与 Skill revision 的 activation trace 可以把该 standing 提升为 observed。",
          excerpt: runtimeObservation.excerpt,
        }),
      ),
      step(
        "behavior-evidence",
        10,
        "source",
        "行为改善证据",
        "结构完整不证明 rewrite 改善了 Agent 行为；当前没有匹配 baseline/treatment 的结果。",
        evidence({
          authority: "冻结 evaluation evidence record",
          sourceRef: behaviorEvidence.sourceRef,
          sourceRefs: behaviorEvidence.sourceRefs,
          revision: behaviorEvidence.revision,
          standing: behaviorEvidence.standing,
          disconfirmingEvidence: "同一 action/boundary/context probes 的独立对照结果，才能支持改善或归因。",
          excerpt: behaviorEvidence.excerpt,
        }),
      ),
      step(
        "agent-reading",
        11,
        "explanation",
        "Agent 当前读法",
        "这条路径只支持触发兼容与 selected declared path；方法适格性、runtime 激活、遵循和行为改善均未被证明。",
        evidence({
          authority: "临时 Agent 解释",
          sourceRef: "无——仅为当前渲染",
          sourceRefs: [],
          revision: "ephemeral",
          standing: "ephemeral-explanation",
          disconfirmingEvidence: "隐藏 Agent 解释后，来源与投影仍必须支持相同边界判断。",
          excerpt: "trigger-compatible + eligibility-unproven + activation-unavailable + behavior-evidence-unavailable",
        }),
      ),
    ],
    authorityStop: {
      title: "必须停在这里",
      summary: "Skill 不得修改 Principle Sequence，也不得把结构完整或静态声明当成行为改善。",
      standing: "source-declared-boundary",
      sourceRef: skillSource.sourceRef,
      revision: skillSource.revision,
      disconfirmingEvidence: "若 owning SKILL.md 的 Operating boundaries 或 Completion standard 改变，必须重建这条边界。",
      excerpt: skillSource.boundaryExcerpt,
    },
  };
}

function bindingPayload(bundle) {
  return {
    version: bundle.version,
    subject: bundle.subject,
    builder: bundle.builder,
    generatedAt: bundle.generatedAt,
    sourceIdentities: bundle.sourceIdentities,
    projectionDigest: bundle.projection?.digest ?? null,
    artifactDigests: Object.fromEntries(
      ARTIFACT_NAMES.map((name) => [name, bundle.artifacts[name]?.digest ?? null]),
    ),
  };
}

function collectSourceIdentities(inputs) {
  return [
    inputs.generalOwnerGateSource,
    inputs.skillSource,
    inputs.rewriteCommand,
    ...inputs.directReferences,
    inputs.sequenceSource,
  ]
    .filter((source) => source.authorship === "retained-source")
    .map((source) => ({ sourceRef: source.sourceRef, revision: source.revision }));
}

export async function skillSourceSetRevision(inputs) {
  return digestValue(collectSourceIdentities(inputs));
}

export async function createSkillEvidenceBundle(inputs) {
  const artifactValues = { ...inputs };
  const artifacts = Object.fromEntries(await Promise.all(
    ARTIFACT_NAMES.map(async (name) => [
      name,
      { value: artifactValues[name], digest: await digestValue(artifactValues[name]) },
    ]),
  ));
  const projection = buildSkillLensProjection(artifactValues);
  const projectionArtifact = {
    value: projection,
    digest: await digestValue(projection),
  };
  const sourceIdentities = collectSourceIdentities(inputs);
  const bundle = {
    version: SKILL_BUNDLE_VERSION,
    subject: projection.subject,
    builder: { id: SKILL_BUILDER_ID, revision: SKILL_BUILDER_REVISION },
    generatedAt: "2026-08-05T18:00:00.000Z",
    sourceIdentities,
    artifacts,
    projection: projectionArtifact,
  };
  return { ...bundle, bindingDigest: await digestValue(bindingPayload(bundle)) };
}

function error(code, message) {
  return { code, message };
}

function revisionRecords(values) {
  return [
    values.request,
    values.generalOwnerGateSource,
    values.actionGapHypothesis,
    values.minimumFormHypothesis,
    values.skillSource,
    values.rewriteCommand,
    ...values.directReferences,
    values.sequenceSource,
    values.principleLineage,
    values.runtimeObservation,
    values.behaviorEvidence,
  ];
}

function excerptLinesAppearInOrder(content, excerpt) {
  let cursor = 0;
  for (const line of excerpt.split("\n").filter((candidate) => candidate.length > 0)) {
    const index = content.indexOf(line, cursor);
    if (index === -1) return false;
    cursor = index + line.length;
  }
  return true;
}

function selectedSequenceExcerpt(content, principleIds) {
  return principleIds
    .map((principleId) => content.split("\n").find((line) => line.startsWith(`${principleId}｜`)))
    .filter(Boolean)
    .join("\n");
}

export async function validateSkillEvidenceBundle(bundle) {
  const errors = [];
  if (bundle?.version !== SKILL_BUNDLE_VERSION) errors.push(error("bundle-version-invalid", "Skill evidence bundle version is invalid."));
  if (bundle?.builder?.id !== SKILL_BUILDER_ID || bundle?.builder?.revision !== SKILL_BUILDER_REVISION) {
    errors.push(error("builder-invalid", "Skill Lens builder identity or revision is invalid."));
  }
  for (const name of ARTIFACT_NAMES) {
    const artifact = bundle?.artifacts?.[name];
    if (artifact?.value === undefined || typeof artifact?.digest !== "string") {
      errors.push(error("artifact-missing", `Artifact '${name}' is missing.`));
      continue;
    }
    if (await digestValue(artifact.value) !== artifact.digest) {
      errors.push(error("artifact-digest-mismatch", `Artifact '${name}' digest does not match.`));
    }
  }
  if (errors.some((entry) => entry.code === "artifact-missing")) return { valid: false, errors };

  const values = Object.fromEntries(ARTIFACT_NAMES.map((name) => [name, bundle.artifacts[name].value]));
  for (const record of revisionRecords(values)) {
    if (typeof record?.content !== "string" || await digestValue(record.content) !== record?.revision) {
      errors.push(error("source-revision-mismatch", `${record?.sourceRef ?? "unknown source"} revision does not digest its retained content.`));
    }
    if (record?.authorship === "retained-source"
      && typeof record.excerpt === "string"
      && !excerptLinesAppearInOrder(record.content, record.excerpt)) {
      errors.push(error("source-excerpt-mismatch", `${record.sourceRef} excerpt cannot be reconstructed from retained content.`));
    }
  }

  const expectedAuthorship = {
    request: "fixture-authored",
    generalOwnerGateSource: "retained-source",
    actionGapHypothesis: "fixture-authored",
    minimumFormHypothesis: "fixture-authored",
    skillSource: "retained-source",
    rewriteCommand: "retained-source",
    sequenceSource: "retained-source",
    principleLineage: "deterministically-derived",
    runtimeObservation: "fixture-authored",
    behaviorEvidence: "fixture-authored",
  };
  for (const [name, authorship] of Object.entries(expectedAuthorship)) {
    if (values[name]?.authorship !== authorship) {
      errors.push(error("authorship-mismatch", `${name} must be labeled ${authorship}.`));
    }
  }
  if (values.directReferences.some((reference) => reference.authorship !== "retained-source")) {
    errors.push(error("authorship-mismatch", "Every direct reference must be labeled retained-source."));
  }

  const dispatchMap = dispatchMapFromSkill(values.skillSource.content);
  if (dispatchMap.rewrite !== "commands/rewrite.md"
    || canonicalJson(Object.keys(dispatchMap)) !== canonicalJson(values.skillSource.declaredOperations)) {
    errors.push(error("dispatch-declaration-mismatch", "declaredOperations or rewrite dispatch does not match retained SKILL.md content."));
  }
  const expectedDirectReferences = directReferenceRefsFromRewrite(values.rewriteCommand.content);
  const actualDirectReferences = values.directReferences.map((reference) => reference.sourceRef);
  if (expectedDirectReferences.length !== REQUIRED_REWRITE_REFERENCES.length
    || canonicalJson(expectedDirectReferences) !== canonicalJson(actualDirectReferences)) {
    errors.push(error("rewrite-direct-references-mismatch", "Rewrite direct references do not match retained rewrite command content."));
  }

  const declaredLineage = lineageFromSkill(values.skillSource.content);
  const lineageIds = [declaredLineage.primary, ...declaredLineage.supporting];
  const lineageSequenceExcerpt = selectedSequenceExcerpt(values.sequenceSource.content, lineageIds);
  const expectedLineageContent = [
    `Primary: ${declaredLineage.primary}`,
    `Supporting: ${declaredLineage.supporting.join(", ")}`,
    lineageSequenceExcerpt,
  ].join("\n");
  if (declaredLineage.primary === null
    || lineageIds.some((principleId) => !sequenceContains(values.sequenceSource.content, principleId))
    || values.principleLineage.primary !== declaredLineage.primary
    || canonicalJson(values.principleLineage.supporting) !== canonicalJson(declaredLineage.supporting)
    || values.principleLineage.content !== expectedLineageContent
    || canonicalJson(values.principleLineage.sourceRefs)
      !== canonicalJson([values.skillSource.sourceRef, values.sequenceSource.sourceRef])) {
    errors.push(error("principle-lineage-mismatch", "Principle lineage cannot be reconstructed from retained SKILL.md and Sequence content."));
  }

  if (!excerptLinesAppearInOrder(values.skillSource.content, values.skillSource.scopeExcerpt)
    || !excerptLinesAppearInOrder(values.skillSource.content, values.skillSource.boundaryExcerpt)) {
    errors.push(error("skill-excerpt-mismatch", "Skill scope or boundary excerpt cannot be reconstructed from retained SKILL.md content."));
  }
  if (values.skillSource.sourceSetRevision !== await skillSourceSetRevision(values)) {
    errors.push(error(
      "source-set-revision-mismatch",
      "Skill source-set revision cannot be reconstructed from retained source identities.",
    ));
  }
  const evaluationReference = values.directReferences.find(
    (reference) => reference.sourceRef === "skills/skill-engineering/references/evaluation.md",
  );
  const expectedBehaviorSourceRefs = evaluationReference === undefined
    ? []
    : [values.behaviorEvidence.sourceRef, evaluationReference.sourceRef];
  const expectedBehaviorExcerpt = evaluationReference === undefined
    ? null
    : `${values.behaviorEvidence.content}\n\n${evaluationReference.excerpt}`;
  if (evaluationReference === undefined
    || canonicalJson(values.behaviorEvidence.sourceRefs) !== canonicalJson(expectedBehaviorSourceRefs)
    || values.behaviorEvidence.excerpt !== expectedBehaviorExcerpt) {
    errors.push(error(
      "behavior-evidence-sources-mismatch",
      "Behavior evidence excerpt must expose and reconstruct both its fixture record and retained evaluation source.",
    ));
  }
  const rebuilt = buildSkillLensProjection(values);
  if (canonicalJson(collectSourceIdentities(values)) !== canonicalJson(bundle.sourceIdentities)) {
    errors.push(error("source-identities-mismatch", "Skill Lens source identities do not match retained inputs."));
  }
  if (bundle?.projection?.value === undefined
    || typeof bundle?.projection?.digest !== "string"
    || canonicalJson(rebuilt) !== canonicalJson(bundle.projection.value)
    || await digestValue(bundle.projection.value) !== bundle.projection.digest) {
    errors.push(error("projection-mismatch", "Retained Skill Lens projection cannot be rebuilt from retained inputs."));
  }
  if (canonicalJson(rebuilt.subject) !== canonicalJson(bundle?.subject)) {
    errors.push(error("subject-mismatch", "Skill Lens subject does not match the rebuilt projection."));
  }
  const required = rebuilt.standings;
  if (required.triggerCompatibility !== "trigger-compatible"
    || required.methodEligibility !== "eligibility-unproven"
    || required.runtimeActivation !== "activation-unavailable"
    || required.behaviorEvidence !== "behavior-evidence-unavailable") {
    errors.push(error("standing-invariant-failed", "Skill Lens standing boundary was promoted or lost."));
  }
  if (await digestValue(bindingPayload(bundle)) !== bundle?.bindingDigest) {
    errors.push(error("binding-digest-mismatch", "Skill evidence bundle binding digest does not match."));
  }
  return { valid: errors.length === 0, errors };
}
