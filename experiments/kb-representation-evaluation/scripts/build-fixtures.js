import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { FIXTURE_ID, nodes, edges, publicQuestions, svgRepresentation, textRepresentation } from "../src/fixture.js";
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

const root = resolve(import.meta.dir, "..");
const destination = resolve(root, "fixtures/round1");
await mkdir(destination, { recursive: true });

await Bun.write(resolve(destination, "graph.json"), `${JSON.stringify({ id: FIXTURE_ID, directed: true, nodes, edges }, null, 2)}\n`);
await Bun.write(resolve(destination, "graph.txt"), textRepresentation());
await Bun.write(resolve(destination, "graph.svg"), svgRepresentation());
await Bun.write(resolve(destination, "questions.json"), `${JSON.stringify(publicQuestions(), null, 2)}\n`);

for (const variant of imageDiagnosticVariants) {
  const variantRoot = resolve(root, `fixtures/image-diagnostic/${variant.tier}`);
  const artifacts = diagnosticArtifacts(variant);
  await mkdir(variantRoot, { recursive: true });
  await Bun.write(resolve(variantRoot, "graph.txt"), artifacts.text);
  await Bun.write(resolve(variantRoot, "graph.svg"), artifacts.svg);
  await Bun.write(resolve(variantRoot, "questions.json"), artifacts.questions);
}

const recallRoot = resolve(root, "fixtures/recall-v1");
await mkdir(resolve(recallRoot, "sources"), { recursive: true });
await mkdir(resolve(recallRoot, "search"), { recursive: true });
await mkdir(resolve(recallRoot, "activation"), { recursive: true });
await Bun.write(resolve(recallRoot, "activation.txt"), recallTextRepresentation());
await Bun.write(resolve(recallRoot, "activation.svg"), recallSvgRepresentation());
await Bun.write(resolve(recallRoot, "questions.json"), `${JSON.stringify(publicRecallQuestions(), null, 2)}\n`);
await Bun.write(resolve(recallRoot, "manifest.json"), `${JSON.stringify({
  id: RECALL_FIXTURE_ID,
  upstream: UPSTREAM,
  graphPolicy: GRAPH_POLICY,
  concepts: recallConcepts,
  sources: recallSources.map(({ content: _content, ...source }) => source),
}, null, 2)}\n`);
for (const source of recallSources) {
  await Bun.write(resolve(recallRoot, `sources/${source.id}.md`), `${source.content}\n`);
}
for (const question of publicRecallQuestions()) {
  await Bun.write(resolve(recallRoot, `search/${question.id}.txt`), recallSearchRepresentation(question));
  await Bun.write(resolve(recallRoot, `activation/${question.id}.svg`), recallSvgRepresentation(question));
}

const recallV2Root = resolve(root, "fixtures/recall-v2");
const recallV2QuestionSets = {
  development: recallV2DevelopmentQuestions,
  confirmation: recallV2ConfirmationQuestions,
};
validateRecallV2Contract(Object.values(recallV2QuestionSets).flat());
await mkdir(resolve(recallV2Root, "sources"), { recursive: true });
for (const caseSet of Object.keys(recallV2QuestionSets)) {
  await mkdir(resolve(recallV2Root, "search", caseSet), { recursive: true });
  await mkdir(resolve(recallV2Root, "activation", caseSet), { recursive: true });
}
const passageHash = async (content) => {
  const value = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
  return `sha256:${[...new Uint8Array(value)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};
await Bun.write(resolve(recallV2Root, "manifest.json"), `${JSON.stringify({
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
}, null, 2)}\n`);
for (const source of recallV2Sources) {
  await Bun.write(resolve(recallV2Root, `sources/${source.sourceId}.md`), `${sourcePacketV2([source.sourceId])}\n`);
}
for (const [caseSet, questions] of Object.entries(recallV2QuestionSets)) {
  await Bun.write(resolve(recallV2Root, `questions-${caseSet}.json`), `${JSON.stringify(publicRecallV2Questions(questions), null, 2)}\n`);
  for (const question of questions) {
    await Bun.write(resolve(recallV2Root, `search/${caseSet}/${question.id}.txt`), recallV2SearchRepresentation(question));
    await Bun.write(resolve(recallV2Root, `activation/${caseSet}/${question.id}.svg`), recallV2SvgRepresentation(question));
  }
}

console.log(`Built ${FIXTURE_ID} in ${destination}`);
