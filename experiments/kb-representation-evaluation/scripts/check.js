import { resolve } from "node:path";
import { publicQuestions, svgRepresentation, textRepresentation } from "../src/fixture.js";
import { diagnosticArtifacts, imageDiagnosticVariants } from "../src/image-diagnostic.js";

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

console.log("KB representation fixtures are current.");
