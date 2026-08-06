import { canonicalJson } from "../lib/evidence-bundle.js";
import { buildFixtureIndex } from "./build-fixtures.js";
import { buildSkillFixture } from "./skill-fixture.js";

const EXECUTION_FIXTURE = new URL("../fixtures/evidence-bundles.json", import.meta.url);
const SKILL_FIXTURE = new URL("../fixtures/skill-evidence-bundle.json", import.meta.url);

export function assertFixtureMatches(rebuilt, controlled, label) {
  if (canonicalJson(rebuilt) !== canonicalJson(controlled)) {
    throw new Error(`${label} fixture drifted; run bun run build:fixtures and review the generated diff.`);
  }
}

export async function assertControlledFixturesCurrent() {
  const [index, skillBundle, controlledIndex, controlledSkillBundle] = await Promise.all([
    buildFixtureIndex(),
    buildSkillFixture(),
    Bun.file(EXECUTION_FIXTURE).json(),
    Bun.file(SKILL_FIXTURE).json(),
  ]);
  assertFixtureMatches(index, controlledIndex, "Execution Lens");
  assertFixtureMatches(skillBundle, controlledSkillBundle, "Skill Lens");
  return { index, skillBundle };
}
