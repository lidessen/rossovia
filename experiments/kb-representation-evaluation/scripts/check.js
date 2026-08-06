import { resolve } from "node:path";
import { publicQuestions, svgRepresentation, textRepresentation } from "../src/fixture.js";
import { diagnosticArtifacts, imageDiagnosticVariants } from "../src/image-diagnostic.js";
import {
  RECALL_FIXTURE_ID,
  GRAPH_POLICY,
  UPSTREAM,
  publicRecallQuestions,
  recallSearchRepresentation,
  recallSources,
  recallConcepts,
  recallSvgRepresentation,
  recallTextRepresentation,
} from "../src/recall-fixture.js";
import {
  RECALL_V2_FIXTURE_ID,
  publicRecallV2Questions,
  recallV2ConfirmationQuestions,
  recallV2DevelopmentQuestions,
  recallV2SearchRepresentation,
  recallV2Sources,
  recallV2SvgRepresentation,
  sourcePacketV2,
  validateRecallV2Contract,
} from "../src/recall-v2.js";

const fixtureRoot = resolve(import.meta.dir, "../fixtures/round1");
const expected = new Map([
  ["graph.txt", textRepresentation()],
  ["graph.svg", svgRepresentation()],
  ["questions.json", `${JSON.stringify(publicQuestions(), null, 2)}\n`],
]);

for (const [name, content] of expected) {
  const file = Bun.file(resolve(fixtureRoot, name));
  if (!(await file.exists())) throw new Error(`Missing fixture ${name}; run bun run build.`);
  if (await file.text() !== content) throw new Error(`Fixture ${name} is stale; run bun run build and inspect the diff.`);
}

for (const variant of imageDiagnosticVariants) {
  const artifacts = diagnosticArtifacts(variant);
  for (const [name, content] of [["graph.txt", artifacts.text], ["graph.svg", artifacts.svg], ["questions.json", artifacts.questions]]) {
    const file = Bun.file(resolve(import.meta.dir, `../fixtures/image-diagnostic/${variant.tier}/${name}`));
    if (!(await file.exists())) throw new Error(`Missing ${variant.tier} diagnostic ${name}; run bun run build.`);
    if (await file.text() !== content) throw new Error(`${variant.tier} diagnostic ${name} is stale.`);
  }
}

const recallRoot = resolve(import.meta.dir, "../fixtures/recall-v1");
const workerProfile = Bun.file(resolve(recallRoot, "worker-profile/opencode.json"));
if (!(await workerProfile.exists()) || JSON.parse(await workerProfile.text()).permission !== "deny") {
  throw new Error("Recall worker profile must deny all OpenCode tool permissions.");
}
if (!(await Bun.file(resolve(recallRoot, "activation.png")).exists())) {
  throw new Error("Missing recall fixture activation.png; run bun run render.");
}
const recallExpected = new Map([
  ["activation.txt", recallTextRepresentation()],
  ["activation.svg", recallSvgRepresentation()],
  ["questions.json", `${JSON.stringify(publicRecallQuestions(), null, 2)}\n`],
  ["manifest.json", `${JSON.stringify({
    id: RECALL_FIXTURE_ID,
    upstream: UPSTREAM,
    graphPolicy: GRAPH_POLICY,
    concepts: recallConcepts,
    sources: recallSources.map(({ content: _content, ...source }) => source),
  }, null, 2)}\n`],
]);
for (const [name, content] of recallExpected) {
  const file = Bun.file(resolve(recallRoot, name));
  if (!(await file.exists())) throw new Error(`Missing recall fixture ${name}; run bun run build.`);
  if (await file.text() !== content) throw new Error(`Recall fixture ${name} is stale.`);
}
for (const source of recallSources) {
  const file = Bun.file(resolve(recallRoot, `sources/${source.id}.md`));
  if (!(await file.exists()) || await file.text() !== `${source.content}\n`) {
    throw new Error(`Recall source ${source.id} is missing or stale.`);
  }
}
for (const question of publicRecallQuestions()) {
  const file = Bun.file(resolve(recallRoot, `search/${question.id}.txt`));
  if (!(await file.exists()) || await file.text() !== recallSearchRepresentation(question)) {
    throw new Error(`Recall search result ${question.id} is missing or stale.`);
  }
  const svg = Bun.file(resolve(recallRoot, `activation/${question.id}.svg`));
  if (!(await svg.exists()) || await svg.text() !== recallSvgRepresentation(question)) {
    throw new Error(`Recall activation graph ${question.id} is missing or stale.`);
  }
  if (!(await Bun.file(resolve(recallRoot, `activation/${question.id}.png`)).exists())) {
    throw new Error(`Recall activation PNG ${question.id} is missing; run bun run render.`);
  }
}

const recallV2Root = resolve(import.meta.dir, "../fixtures/recall-v2");
const recallV2QuestionSets = {
  development: recallV2DevelopmentQuestions,
  confirmation: recallV2ConfirmationQuestions,
};
validateRecallV2Contract(Object.values(recallV2QuestionSets).flat());
const fileHash = async (path) => {
  const value = await crypto.subtle.digest("SHA-256", await Bun.file(path).arrayBuffer());
  return `sha256:${[...new Uint8Array(value)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};
const passageHash = async (content) => {
  const value = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  return `sha256:${[...new Uint8Array(value)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};
const expectedV2Manifest = `${JSON.stringify({
  id: RECALL_V2_FIXTURE_ID,
  upstream: UPSTREAM,
  graphPolicy: GRAPH_POLICY,
  contract: "opaque-anchor-v2",
  caseSets: {
    development: "Q1-Q6 treatment diagnostics; never held-out confirmation",
    confirmation: "four question-held-out cases; same frozen corpus and graph",
  },
  sources: await Promise.all(recallV2Sources.map(async (source) => ({
    sourceId: source.sourceId,
    locator: source.locator,
    passages: await Promise.all(source.passages.map(async (passage) => ({
      anchorId: passage.anchorId,
      sha256: await passageHash(passage.content),
    }))),
  }))),
}, null, 2)}\n`;
const v2Manifest = Bun.file(resolve(recallV2Root, "manifest.json"));
if (!(await v2Manifest.exists()) || await v2Manifest.text() !== expectedV2Manifest) {
  throw new Error("Recall v2 manifest is missing or stale.");
}
for (const source of recallV2Sources) {
  const file = Bun.file(resolve(recallV2Root, `sources/${source.sourceId}.md`));
  if (!(await file.exists()) || await file.text() !== `${sourcePacketV2([source.sourceId])}\n`) {
    throw new Error(`Recall v2 source ${source.sourceId} is missing or stale.`);
  }
}
for (const [caseSet, questions] of Object.entries(recallV2QuestionSets)) {
  const publicQuestions = `${JSON.stringify(publicRecallV2Questions(questions), null, 2)}\n`;
  const questionFile = Bun.file(resolve(recallV2Root, `questions-${caseSet}.json`));
  if (!(await questionFile.exists()) || await questionFile.text() !== publicQuestions) {
    throw new Error(`Recall v2 ${caseSet} questions are missing or stale.`);
  }
  for (const question of questions) {
    const search = Bun.file(resolve(recallV2Root, `search/${caseSet}/${question.id}.txt`));
    if (!(await search.exists()) || await search.text() !== recallV2SearchRepresentation(question)) {
      throw new Error(`Recall v2 search ${caseSet}/${question.id} is missing or stale.`);
    }
    const svg = Bun.file(resolve(recallV2Root, `activation/${caseSet}/${question.id}.svg`));
    if (!(await svg.exists()) || await svg.text() !== recallV2SvgRepresentation(question)) {
      throw new Error(`Recall v2 activation ${caseSet}/${question.id} is missing or stale.`);
    }
    if (!(await Bun.file(resolve(recallV2Root, `activation/${caseSet}/${question.id}.png`)).exists())) {
      throw new Error(`Recall v2 activation PNG ${caseSet}/${question.id} is missing; run bun run render:recall:v2.`);
    }
  }
}
const renderManifestFile = Bun.file(resolve(recallV2Root, "render-manifest.json"));
if (!(await renderManifestFile.exists())) throw new Error("Recall v2 render manifest is missing; run bun run render:recall:v2.");
const renderManifest = JSON.parse(await renderManifestFile.text());
const expectedRendered = Object.entries(recallV2QuestionSets).flatMap(([caseSet, questions]) => (
  questions.map((question) => ({ caseSet, questionId: question.id }))
));
if (!Array.isArray(renderManifest.files) || renderManifest.files.length !== expectedRendered.length) {
  throw new Error("Recall v2 render manifest has the wrong file set.");
}
for (const expected of expectedRendered) {
  const retained = renderManifest.files.find((file) => file.caseSet === expected.caseSet && file.questionId === expected.questionId);
  if (!retained) throw new Error(`Recall v2 render manifest is missing ${expected.caseSet}/${expected.questionId}.`);
  const svg = resolve(recallV2Root, `activation/${expected.caseSet}/${expected.questionId}.svg`);
  const png = resolve(recallV2Root, `activation/${expected.caseSet}/${expected.questionId}.png`);
  if (retained.svgSha256 !== await fileHash(svg) || retained.pngSha256 !== await fileHash(png)) {
    throw new Error(`Recall v2 render hash mismatch for ${expected.caseSet}/${expected.questionId}.`);
  }
}

console.log("KB representation fixtures are current.");
