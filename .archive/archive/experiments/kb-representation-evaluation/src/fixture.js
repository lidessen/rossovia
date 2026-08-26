export const FIXTURE_ID = "kb-representation-round1-v1";

export const nodes = [
  { id: "N01", label: "项目", x: 110, y: 640 },
  { id: "N02", label: "任务", x: 590, y: 640 },
  { id: "N03", label: "Agent", x: 590, y: 470 },
  { id: "N04", label: "知识库", x: 110, y: 290 },
  { id: "N05", label: "索引", x: 350, y: 290 },
  { id: "N06", label: "检索", x: 590, y: 290 },
  { id: "N07", label: "证据", x: 830, y: 290 },
  { id: "N08", label: "决策", x: 1070, y: 290 },
  { id: "N09", label: "提交", x: 830, y: 640 },
  { id: "N10", label: "审查", x: 1070, y: 640 },
  { id: "N11", label: "主线", x: 1310, y: 640 },
  { id: "N12", label: "计划", x: 350, y: 840 },
  { id: "N13", label: "验证", x: 830, y: 840 },
  { id: "N14", label: "可视化", x: 470, y: 90 },
  { id: "N15", label: "工作树", x: 350, y: 640 },
];

export const edges = [
  { from: "N01", relation: "contains", to: "N02", dy: -12 },
  { from: "N01", relation: "has_worktree", to: "N15", dy: -12 },
  { from: "N15", relation: "hosts", to: "N02", dy: 16 },
  { from: "N12", relation: "orders", to: "N02", dy: 10 },
  { from: "N02", relation: "assigned_to", to: "N03", dx: 52 },
  { from: "N03", relation: "reads", to: "N04", dy: -12 },
  { from: "N04", relation: "indexed_by", to: "N05", dy: -12 },
  { from: "N05", relation: "enables", to: "N06", dy: -12 },
  { from: "N06", relation: "returns", to: "N07", dy: -12 },
  { from: "N13", relation: "checks", to: "N09", dx: 46 },
  { from: "N13", relation: "emits", to: "N07", dx: -48 },
  { from: "N07", relation: "supports", to: "N08", dy: -12 },
  { from: "N14", relation: "visualizes", to: "N04", dx: -42 },
  { from: "N14", relation: "visualizes", to: "N07", dx: 42 },
  { from: "N14", relation: "supports", to: "N08", dy: -18 },
  { from: "N08", relation: "prioritizes", to: "N02", dy: -16 },
  { from: "N02", relation: "produces", to: "N09", dy: -12 },
  { from: "N09", relation: "reviewed_by", to: "N10", dy: -12 },
  { from: "N10", relation: "gates", to: "N11", dy: -12 },
  { from: "N08", relation: "approves", to: "N09", dx: 52 },
  { from: "N03", relation: "updates", to: "N02", dx: -52 },
  { from: "N15", relation: "isolates", to: "N09", dy: 18 },
];

export const questions = [
  { id: "local-1", family: "local", prompt: "N04 通过 indexed_by 直接指向哪个节点？", answer: "N05" },
  { id: "local-2", family: "local", prompt: "N13 到 N09 的直接关系名称是什么？", answer: "checks" },
  { id: "multihop-1", family: "multihop", prompt: "沿有向边从 N04 到 N08 的最短节点路径是什么？用 > 连接节点 ID。", answer: "N04>N05>N06>N07>N08" },
  { id: "multihop-2", family: "multihop", prompt: "沿有向边从 N02 到 N11 的最短节点路径是什么？用 > 连接节点 ID。", answer: "N02>N09>N10>N11" },
  { id: "global-1", family: "global", prompt: "忽略边方向，哪个节点的总度数最高？若并列按 ID 最小者回答。", answer: "N02" },
  { id: "global-2", family: "global", prompt: "哪些节点的入度为 0？按 ID 升序，用逗号连接。", answer: "N01,N12,N13,N14" },
  { id: "global-3", family: "global", prompt: "不允许移除起点 N04 或终点 N08；分别单独移除哪些节点会阻断所有从 N04 到 N08 的有向路径？按 ID 升序，用逗号连接。", answer: "N05,N06,N07" },
];

export function textRepresentation(graph = { id: FIXTURE_ID, nodes, edges }) {
  const lines = [
    `# fixture ${graph.id}`,
    "# Directed knowledge graph. Each EDGE is FROM RELATION TO.",
    "# Nodes",
    ...graph.nodes.map(({ id, label }) => `NODE\t${id}\t${label}`),
    "# Edges",
    ...graph.edges.map(({ from, relation, to }) => `EDGE\t${from}\t${relation}\t${to}`),
  ];
  return `${lines.join("\n")}\n`;
}

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function svgRepresentation(graph = { id: FIXTURE_ID, nodes, edges }) {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const boundaryPoint = (from, to, outward = 0) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const halfWidth = 65 + outward;
    const halfHeight = 28 + outward;
    const scale = 1 / Math.max(Math.abs(dx) / halfWidth, Math.abs(dy) / halfHeight);
    return { x: from.x + dx * scale, y: from.y + dy * scale };
  };
  const edgeMarkup = graph.edges.map((edge) => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    const start = boundaryPoint(from, to, 2);
    const end = boundaryPoint(to, from, 5);
    const dx = edge.dx ?? 0;
    const dy = edge.dy ?? 0;
    const midX = (from.x + to.x) / 2 + dx;
    const midY = (from.y + to.y) / 2 + dy;
    return `<g class="edge"><line x1="${start.x.toFixed(2)}" y1="${start.y.toFixed(2)}" x2="${end.x.toFixed(2)}" y2="${end.y.toFixed(2)}" marker-end="url(#arrow)"/><text x="${midX}" y="${midY}">${escapeXml(edge.relation)}</text></g>`;
  }).join("\n");
  const nodeMarkup = graph.nodes.map((node) => `<g class="node" transform="translate(${node.x - 65} ${node.y - 28})"><rect width="130" height="56" rx="14"/><text x="65" y="23" class="id">${node.id}</text><text x="65" y="44" class="label">${escapeXml(node.label)}</text></g>`).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="960" viewBox="0 0 1400 960">
<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>
<style>
  svg { background: #fbfaf7; }
  .edge line { stroke: #66706a; stroke-width: 2.2; }
  .edge text { font: 13px ui-monospace, SFMono-Regular, Menlo, monospace; text-anchor: middle; fill: #27332d; stroke: #fbfaf7; stroke-width: 5px; paint-order: stroke; }
  .node rect { fill: #eef5ef; stroke: #315f4d; stroke-width: 2; }
  .node text { text-anchor: middle; fill: #173b2d; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; }
  .node .id { font-size: 15px; font-weight: 700; }
  .node .label { font-size: 16px; }
</style>
<rect width="1400" height="960" fill="#fbfaf7"/>
<text x="52" y="52" font-family="-apple-system, BlinkMacSystemFont, PingFang SC, sans-serif" font-size="24" font-weight="700" fill="#173b2d">${escapeXml(graph.id)} · directed typed graph</text>
${edgeMarkup}
${nodeMarkup}
</svg>\n`;
}

export function publicQuestions() {
  return questions.map(({ answer: _answer, ...question }) => question);
}

export function normalizeAnswer(value) {
  return String(value ?? "").trim().replaceAll(/\s+/g, "");
}

export function scoreAnswers(answers) {
  const submitted = new Map(answers.map((entry) => [entry.id, normalizeAnswer(entry.answer)]));
  const results = questions.map((question) => ({
    id: question.id,
    family: question.family,
    expected: question.answer,
    actual: submitted.get(question.id) ?? null,
    pass: submitted.get(question.id) === normalizeAnswer(question.answer),
  }));
  return {
    passed: results.filter((result) => result.pass).length,
    total: results.length,
    byFamily: Object.fromEntries(["local", "multihop", "global"].map((family) => {
      const familyResults = results.filter((result) => result.family === family);
      return [family, { passed: familyResults.filter((result) => result.pass).length, total: familyResults.length }];
    })),
    results,
  };
}
