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

console.log(`Built ${FIXTURE_ID} in ${destination}`);
