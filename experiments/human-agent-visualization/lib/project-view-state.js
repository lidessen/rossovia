const LAYER_LABELS = {
  source: "来源",
  projection: "确定性投影",
  explanation: "Agent 解释",
};

export function projectEvidenceView(step, { sourceOnly = false } = {}) {
  if (!step) {
    return {
      title: sourceOnly ? "当前没有来源证据" : "没有可显示的证据",
      kind: sourceOnly ? LAYER_LABELS.source : "无",
      details: [],
      sourceRefs: [],
      excerpt: sourceOnly
        ? "这个证据包没有 source-layer step；派生投影已从仅看来源视图移除。"
        : "当前筛选条件没有可显示的证据。",
    };
  }

  const evidence = step.evidence;
  return {
    title: step.title,
    kind: LAYER_LABELS[step.layer],
    details: [
      ["权威边界", evidence.authority],
      ["Standing", evidence.standing],
      ["修订", evidence.revision],
      ["可推翻它的证据", evidence.disconfirmingEvidence],
    ],
    sourceRefs: evidence.sourceRefs ?? [],
    excerpt: evidence.excerpt || "没有可显示的来源摘录。",
  };
}
