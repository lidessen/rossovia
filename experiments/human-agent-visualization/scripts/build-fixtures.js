import { validateEvidenceBundle, comparisonCompatibility } from "../lib/evidence-bundle.js";
import { validateSkillEvidenceBundle } from "../lib/skill-evidence-bundle.js";
import { buildFixtureCases } from "./fixture-cases.js";
import { buildSkillFixture } from "./skill-fixture.js";

export async function buildFixtureIndex() {
  const cases = await buildFixtureCases();
  for (const fixtureCase of cases) {
    const validation = await validateEvidenceBundle(fixtureCase.current);
    if (!validation.valid) {
      throw new Error(`${fixtureCase.id} current bundle is invalid: ${JSON.stringify(validation.errors)}`);
    }
    if (fixtureCase.prior !== null) {
      const compatibility = await comparisonCompatibility(
        fixtureCase.current,
        fixtureCase.prior,
      );
      if (!compatibility.compatible) {
        throw new Error(`${fixtureCase.id} comparison is invalid: ${JSON.stringify(compatibility.reasons)}`);
      }
    }
  }
  return {
    version: "human-agent-visualization.fixture-index.v1",
    generatedAt: "2026-08-05T16:12:00.000Z",
    cases,
  };
}

export async function writeFixtureIndex(
  target = new URL("../fixtures/evidence-bundles.json", import.meta.url),
) {
  const index = await buildFixtureIndex();
  await Bun.write(target, `${JSON.stringify(index, null, 2)}\n`);
  return index;
}

export async function writeSkillFixture(
  target = new URL("../fixtures/skill-evidence-bundle.json", import.meta.url),
) {
  const bundle = await buildSkillFixture();
  const validation = await validateSkillEvidenceBundle(bundle);
  if (!validation.valid) {
    throw new Error(`Skill fixture is invalid: ${JSON.stringify(validation.errors)}`);
  }
  await Bun.write(target, `${JSON.stringify(bundle, null, 2)}\n`);
  return bundle;
}

if (import.meta.main) {
  const [index] = await Promise.all([writeFixtureIndex(), writeSkillFixture()]);
  console.log(`Built ${index.cases.length} execution cases and 1 frozen Skill Lens fixture.`);
}
