const CUE_DEFINITIONS = [
  {
    key: "triggerCompatibility",
    card: "trigger",
    layer: "projection",
    origin: "确定性投影",
    fallback: "请求或声明未绑定时，不显示为兼容。",
  },
  {
    key: "methodEligibility",
    card: "eligibility",
    layer: "projection",
    origin: "确定性投影",
    fallback: "缺少 action-gap 或 minimum-form 证据时，保持未证明。",
  },
  {
    key: "runtimeActivation",
    card: "activation",
    layer: "source",
    origin: "冻结来源",
    fallback: "没有 runtime 轨迹时，显示不可用；不由声明补齐。",
  },
  {
    key: "behaviorEvidence",
    card: "behavior",
    layer: "source",
    origin: "冻结来源",
    fallback: "没有匹配评估时，显示不可用；不由结构完整补齐。",
  },
];

export function skillStandingCuePresentation(standings) {
  return CUE_DEFINITIONS.map((definition) => {
    const standing = standings[definition.key];
    if (typeof standing !== "string" || standing.length === 0) {
      throw new TypeError(`Missing Skill Lens standing '${definition.key}'`);
    }
    return {
      ...definition,
      standing,
      evidenceLimited: standing.includes("unavailable") || standing.includes("unproven"),
    };
  });
}
