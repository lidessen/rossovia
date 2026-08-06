import { digestValue } from "../lib/evidence-bundle.js";
import { createSkillEvidenceBundle } from "../lib/skill-evidence-bundle.js";

const REPOSITORY_ROOT = new URL("../../../", import.meta.url);

async function retainedSource(sourceRef, excerptRanges) {
  const content = await Bun.file(new URL(sourceRef, REPOSITORY_ROOT)).text();
  const lines = content.split("\n");
  return {
    authorship: "retained-source",
    sourceRef,
    revision: await digestValue(content),
    content,
    excerpt: excerptRanges
      .flatMap(([start, end]) => lines.slice(start - 1, end))
      .join("\n"),
  };
}

function repositoryRevision() {
  const result = Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: new URL(".", REPOSITORY_ROOT).pathname });
  if (result.exitCode !== 0) return "git:unavailable";
  return `git:${result.stdout.toString().trim()}`;
}

export async function buildSkillFixture() {
  const [skill, rewrite, expressionTeam, expressionLayers, evaluation, decision, sequence] = await Promise.all([
    retainedSource("skills/skill-engineering/SKILL.md", [[21, 32], [39, 48], [68, 110], [112, 139]]),
    retainedSource("skills/skill-engineering/commands/rewrite.md", [[1, 25]]),
    retainedSource("skills/skill-engineering/references/expression-team.md", [[1, 30]]),
    retainedSource("skills/skill-engineering/references/expression-layers.md", [[1, 20], [67, 79]]),
    retainedSource("skills/skill-engineering/references/evaluation.md", [[1, 27], [72, 82]]),
    retainedSource("design/decisions/003-skill-engineering-first-slice.md", [[5, 18], [20, 39], [50, 53]]),
    retainedSource("principles/SEQUENCE.md", [[3, 3], [15, 17], [31, 33]]),
  ]);

  const requestText = "请 rewrite 现有 skill-engineering：不要在原文上润色；从完整继承表面重构，并用同一 action、boundary 与 context probes 比较旧新行为。";
  const request = {
    authorship: "fixture-authored",
    sourceRef: "fixture:principal-request/skill-engineering-rewrite",
    revision: await digestValue(requestText),
    content: requestText,
    operation: "rewrite",
    question: "为什么 skill-engineering 与这个 rewrite 请求相关，它会走哪条证据路径，并在哪里停？",
    text: requestText,
  };
  const actionGapText = "Hypothesis：这个具体请求可能来自重复、已定位到 Skill 表达层的失败；当前 fixture 没有保留这些 failure records。";
  const actionGapHypothesis = {
    authorship: "fixture-authored",
    sourceRef: "fixture:hypothesis/skill-engineering-action-gap",
    revision: await digestValue(actionGapText),
    content: actionGapText,
    excerpt: actionGapText,
  };
  const minimumFormText = "Hypothesis：rewrite-existing-skill 可能是最小形式；当前 fixture 没有保留这个具体请求的 minimum-form decision。";
  const minimumFormHypothesis = {
    authorship: "fixture-authored",
    sourceRef: "fixture:hypothesis/skill-engineering-minimum-form",
    revision: await digestValue(minimumFormText),
    content: minimumFormText,
    excerpt: minimumFormText,
  };
  const skillSource = {
    ...skill,
    repositoryRevision: repositoryRevision(),
    declaredOperations: ["create", "rewrite", "review", "test", "refresh-sequence", "sync-sequence-snapshot"],
    scopeExcerpt: skill.content.split("\n").slice(20, 32).join("\n"),
    boundaryExcerpt: [
      ...skill.content.split("\n").slice(27, 32),
      ...skill.content.split("\n").slice(97, 110),
    ].join("\n"),
  };
  const rewriteCommand = rewrite;
  const directReferences = [expressionTeam, expressionLayers, evaluation];
  const lineageIds = ["P16", "P09", "P08", "P15"];
  const lineageSequenceExcerpt = lineageIds
    .map((principleId) => sequence.content.split("\n").find((line) => line.startsWith(`${principleId}｜`)))
    .join("\n");
  const lineageText = ["Primary: P16", "Supporting: P09, P08, P15", lineageSequenceExcerpt].join("\n");
  const principleLineage = {
    authorship: "deterministically-derived",
    sourceRef: "derived:skill-engineering-principle-lineage",
    sourceRefs: ["skills/skill-engineering/SKILL.md", "principles/SEQUENCE.md"],
    revision: await digestValue(lineageText),
    content: lineageText,
    primary: "P16",
    supporting: ["P09", "P08", "P15"],
    excerpt: lineageText,
  };
  const runtimeText = "这个冻结 fixture 没有绑定 Agent runtime activation trace 或实际 loaded-path event。";
  const runtimeObservation = {
    authorship: "fixture-authored",
    sourceRef: "fixture:runtime-observation/none",
    revision: await digestValue(runtimeText),
    content: runtimeText,
    standing: "activation-unavailable",
    excerpt: runtimeText,
  };
  const behaviorText = "没有保留同一 rewrite 请求的 baseline/treatment 行为比较；结构检查不能证明行为改善。";
  const behaviorEvidence = {
    authorship: "fixture-authored",
    sourceRef: "fixture:behavior-evidence/none",
    sourceRefs: ["fixture:behavior-evidence/none", evaluation.sourceRef],
    revision: await digestValue(behaviorText),
    content: behaviorText,
    standing: "behavior-evidence-unavailable",
    excerpt: `${behaviorText}\n\n${evaluation.excerpt}`,
  };

  return createSkillEvidenceBundle({
    request,
    generalOwnerGateSource: decision,
    actionGapHypothesis,
    minimumFormHypothesis,
    skillSource,
    rewriteCommand,
    directReferences,
    sequenceSource: sequence,
    principleLineage,
    runtimeObservation,
    behaviorEvidence,
  });
}
