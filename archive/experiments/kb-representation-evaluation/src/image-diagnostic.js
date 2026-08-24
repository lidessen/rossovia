import { edges, nodes, svgRepresentation, textRepresentation } from "./fixture.js";

const edgeKey = ({ from, relation, to }) => `${from}\t${relation}\t${to}`;
const sparseKeys = new Set([
  "N04\tindexed_by\tN05",
  "N05\tenables\tN06",
  "N06\treturns\tN07",
  "N07\tsupports\tN08",
  "N02\tproduces\tN09",
  "N09\treviewed_by\tN10",
  "N10\tgates\tN11",
  "N14\tvisualizes\tN04",
  "N13\tchecks\tN09",
  "N01\tcontains\tN02",
  "N12\torders\tN02",
  "N15\tisolates\tN09",
  "N02\tassigned_to\tN03",
]);

const denseExtras = [
  { from: "N01", relation: "references", to: "N04", dy: 12 },
  { from: "N12", relation: "consults", to: "N05", dx: -40 },
  { from: "N03", relation: "queries", to: "N06", dx: 46 },
  { from: "N06", relation: "informs", to: "N08", dy: 18 },
  { from: "N07", relation: "annotates", to: "N09", dx: -44 },
  { from: "N09", relation: "revises", to: "N02", dy: 20 },
  { from: "N10", relation: "cites", to: "N07", dx: 46 },
  { from: "N11", relation: "archives", to: "N10", dy: 20 },
  { from: "N13", relation: "inspects", to: "N02", dy: 24 },
  { from: "N15", relation: "snapshots", to: "N04", dx: -42 },
  { from: "N14", relation: "maps", to: "N10", dy: 20 },
  { from: "N05", relation: "links", to: "N09", dx: 42 },
];

export const imageDiagnosticVariants = [
  { id: "image-edge-sparse-v1", tier: "sparse", nodes, edges: edges.filter((edge) => sparseKeys.has(edgeKey(edge))) },
  { id: "image-edge-medium-v1", tier: "medium", nodes, edges },
  { id: "image-edge-dense-v1", tier: "dense", nodes, edges: [...edges, ...denseExtras] },
];

const expectedByTier = {
  sparse: { n14Targets: "N04", n02InDegree: "2", n09RevisesN02: "no" },
  medium: { n14Targets: "N04,N07,N08", n02InDegree: "5", n09RevisesN02: "no" },
  dense: { n14Targets: "N04,N07,N08,N10", n02InDegree: "7", n09RevisesN02: "yes" },
};

export function diagnosticQuestions(variant) {
  const expected = expectedByTier[variant.tier];
  return [
    { id: "edge-positive", family: "edge", prompt: "是否存在 N04 --indexed_by--> N05？只回答 yes 或 no。", answer: "yes" },
    { id: "edge-direction", family: "edge", prompt: "是否存在 N05 --indexed_by--> N04？只回答 yes 或 no。", answer: "no" },
    { id: "edge-negative", family: "edge", prompt: "是否存在 N04 --supports--> N08？只回答 yes 或 no。", answer: "no" },
    { id: "edge-label", family: "edge", prompt: "N13 指向 N09 的直接关系名称是什么？", answer: "checks" },
    { id: "relation-chain", family: "multihop", prompt: "从 N04 开始依次沿 indexed_by、enables、returns、supports 四种关系，节点序列是什么？用 > 连接。", answer: "N04>N05>N06>N07>N08" },
    { id: "fanout", family: "incident", prompt: "N14 的所有直接出边目标有哪些？按 ID 升序，用逗号连接。", answer: expected.n14Targets },
    { id: "indegree", family: "incident", prompt: "N02 的入度是多少？只回答整数。", answer: expected.n02InDegree },
    { id: "dense-distractor", family: "edge", prompt: "是否存在 N09 --revises--> N02？只回答 yes 或 no。", answer: expected.n09RevisesN02 },
  ];
}

export function publicDiagnosticQuestions(variant) {
  return diagnosticQuestions(variant).map(({ answer: _answer, ...question }) => question);
}

export function diagnosticArtifacts(variant) {
  return {
    text: textRepresentation(variant),
    svg: svgRepresentation(variant),
    questions: `${JSON.stringify(publicDiagnosticQuestions(variant), null, 2)}\n`,
  };
}

export function scoreDiagnosticAnswers(variant, answers) {
  const submitted = new Map(answers.map((entry) => [entry.id, String(entry.answer ?? "").trim().replaceAll(/\s+/g, "")]));
  const results = diagnosticQuestions(variant).map((question) => ({
    id: question.id,
    family: question.family,
    expected: question.answer,
    actual: submitted.get(question.id) ?? null,
    pass: submitted.get(question.id) === question.answer,
  }));
  return { passed: results.filter((result) => result.pass).length, total: results.length, results };
}
