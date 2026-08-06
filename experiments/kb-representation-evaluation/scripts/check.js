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

console.log("KB representation fixtures are current.");
