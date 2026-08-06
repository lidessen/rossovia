import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { FIXTURE_ID, nodes, edges, publicQuestions, svgRepresentation, textRepresentation } from "../src/fixture.js";
import { diagnosticArtifacts, imageDiagnosticVariants } from "../src/image-diagnostic.js";

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

console.log(`Built ${FIXTURE_ID} in ${destination}`);
