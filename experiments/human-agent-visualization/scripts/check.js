import { comparisonCompatibility, validateEvidenceBundle } from "../lib/evidence-bundle.js";
import { executionStandingPresentation } from "../lib/lens-model.js";
import { validateSkillEvidenceBundle } from "../lib/skill-evidence-bundle.js";
import { validateProjectBundle } from "../lib/project-evidence-bundle.js";
import { validateProjectBundleAgainstRepository } from "./project-lens-builder.js";
import { assertControlledFixturesCurrent } from "./fixture-consistency.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const { index, skillBundle } = await assertControlledFixturesCurrent();
assert(index.cases.length === 2, "The prototype must expose exactly two evidence cases.");
assert((await validateSkillEvidenceBundle(skillBundle)).valid, "The Skill Lens fixture must validate.");
assert(
  skillBundle.projection.value.standings.runtimeActivation === "activation-unavailable",
  "The Skill Lens must not fabricate runtime activation.",
);
assert(
  skillBundle.projection.value.standings.methodEligibility === "eligibility-unproven",
  "The Skill Lens must not promote a fixture hypothesis to method eligibility.",
);
assert(
  skillBundle.projection.value.standings.behaviorEvidence === "behavior-evidence-unavailable",
  "The Skill Lens must not fabricate behavior improvement.",
);

for (const fixtureCase of index.cases) {
  const validation = await validateEvidenceBundle(fixtureCase.current);
  assert(validation.valid, `${fixtureCase.id} current bundle must validate.`);
  const projection = fixtureCase.current.artifacts.workItemSetProjection.value;
  const standing = projection.items[0].taskDetail.executionContext.standing;
  executionStandingPresentation(standing);
  if (fixtureCase.prior !== null) {
    const compatibility = await comparisonCompatibility(fixtureCase.current, fixtureCase.prior);
    assert(compatibility.compatible, `${fixtureCase.id} prior bundle must be comparison-compatible.`);
  }
}

const exactCase = index.cases.find((fixtureCase) => fixtureCase.id === "exact-current-effect");
const consumedCase = index.cases.find((fixtureCase) => fixtureCase.id === "authorization-consumed-only");
assert(
  exactCase.current.artifacts.workItemSetProjection.value.items[0].taskDetail.executionContext.standing
    === "current-effect-exact",
  "The exact case must retain current-effect-exact.",
);
assert(
  exactCase.prior.artifacts.workItemSetProjection.value.items[0].taskDetail.executionContext.standing
    === "current-turn-exact",
  "The compatible prior must retain current-turn-exact.",
);
assert(
  consumedCase.current.artifacts.workItemSetProjection.value.items[0].taskDetail.executionContext.standing
    === "authorization-consumption-verified",
  "The consumed-only case must not be promoted to current execution.",
);

for (const path of ["index.html", "skill.html", "project.html", "styles.css", "app.js", "skill-app.js", "project-app.js", "server.js"]) {
  const file = Bun.file(new URL(`../${path}`, import.meta.url));
  assert(await file.exists(), `${path} must exist.`);
  assert(file.size > 0, `${path} must not be empty.`);
}

const build = await Bun.build({
  entrypoints: [
    new URL("../app.js", import.meta.url).pathname,
    new URL("../skill-app.js", import.meta.url).pathname,
    new URL("../project-app.js", import.meta.url).pathname,
  ],
  target: "browser",
  write: false,
});
assert(build.success, `Browser module build failed: ${build.logs.join("\n")}`);

const generated = new URL("../generated/project-evidence-bundle.json", import.meta.url);
if (await Bun.file(generated).exists()) {
  const projectValidation = await validateProjectBundle(await Bun.file(generated).json());
  assert(projectValidation.valid, "Generated Project Lens bundle must validate when present.");
  const generatedBundle = await Bun.file(generated).json();
  const repositoryValidation = await validateProjectBundleAgainstRepository(generatedBundle, { expectedBindingDigest: generatedBundle.bindingDigest });
  assert(repositoryValidation.valid, "Generated Project Lens bundle must match a fresh repository rebuild.");
}

console.log("Static sanity passed: fixtures validate and browser modules build.");
