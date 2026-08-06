import { describe, expect, test } from "bun:test";
import {
  comparisonCompatibility,
  createEvidenceBundle,
  digestValue,
  executionStandingFromEvidence,
  validateEvidenceBundle,
} from "../lib/evidence-bundle.js";
import {
  buildLensModel,
  diffLensModels,
  executionStandingPresentation,
} from "../lib/lens-model.js";
import { buildFixtureCases } from "../scripts/fixture-cases.js";
import {
  createSkillEvidenceBundle,
  validateSkillEvidenceBundle,
} from "../lib/skill-evidence-bundle.js";
import { buildSkillFixture } from "../scripts/skill-fixture.js";
import { assertFixtureMatches } from "../scripts/fixture-consistency.js";
import { skillStandingCuePresentation } from "../lib/skill-cue-presentation.js";
import {
  applySourceOnlyMode,
  comparisonPresentationState,
} from "../lib/lens-view-state.js";

describe("frozen evidence bundle", () => {
  test("binds exact retained inputs, derived projection, and deterministic digests", async () => {
    const [fixtureCase] = await buildFixtureCases();
    const validation = await validateEvidenceBundle(fixtureCase.current);
    expect(validation).toEqual({ valid: true, errors: [] });
    expect(fixtureCase.current.bindingDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    for (const artifact of Object.values(fixtureCase.current.artifacts)) {
      expect(artifact.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    }

    const tampered = structuredClone(fixtureCase.current);
    tampered.artifacts.snapshot.value.generatedAt = "2026-08-05T17:00:00.000Z";
    const rejected = await validateEvidenceBundle(tampered);
    expect(rejected.valid).toBeFalse();
    expect(rejected.errors.map((error) => error.code)).toContain("artifact-digest-mismatch");
    expect(rejected.errors.map((error) => error.code)).toContain("generated-at-mismatch");
  });

  test("rejects a projection that was not derived from the retained builder inputs", async () => {
    const [fixtureCase] = await buildFixtureCases();
    const tampered = structuredClone(fixtureCase.current);
    tampered.artifacts.workItemSetProjection.value.items[0]
      .taskDetail.executionContext.standing = "unavailable";
    tampered.artifacts.workItemSetProjection.digest = await digestValue(
      tampered.artifacts.workItemSetProjection.value,
    );
    const rejected = await validateEvidenceBundle(tampered);
    expect(rejected.valid).toBeFalse();
    expect(rejected.errors.map((error) => error.code)).toContain("projection-mismatch");
    expect(rejected.errors.map((error) => error.code)).toContain("binding-digest-mismatch");
  });
});

describe("comparison compatibility", () => {
  test("source-only clears an enabled comparison and gates every derived cue", () => {
    const next = applySourceOnlyMode({ sourceOnly: true, comparisonEnabled: true });
    expect(next).toEqual({ sourceOnly: true, comparisonEnabled: false });
    expect(comparisonPresentationState({
      ...next,
      comparisonAvailable: true,
    })).toEqual({ controlVisible: false, cuesVisible: false });

    const returned = applySourceOnlyMode({
      sourceOnly: false,
      comparisonEnabled: next.comparisonEnabled,
    });
    expect(comparisonPresentationState({
      ...returned,
      comparisonAvailable: true,
    })).toEqual({ controlVisible: true, cuesVisible: false });
  });

  test("allows only internally valid bundles with the same subject, contract, and exact builder revision", async () => {
    const [fixtureCase] = await buildFixtureCases();
    expect(await comparisonCompatibility(fixtureCase.current, fixtureCase.prior))
      .toEqual({ compatible: true, reasons: [] });

    const inputs = {
      snapshot: fixtureCase.prior.artifacts.snapshot.value,
      principalTaskObservation:
        fixtureCase.prior.artifacts.principalTaskObservation.value,
      otherBuilderInputs: fixtureCase.prior.artifacts.otherBuilderInputs.value,
    };
    const differentSubject = await createEvidenceBundle({
      ...inputs,
      subject: { ...fixtureCase.prior.subject, id: "execution-boundary:different-subject" },
    });
    const subjectResult = await comparisonCompatibility(fixtureCase.current, differentSubject);
    expect(subjectResult.compatible).toBeFalse();
    expect(subjectResult.reasons.map((reason) => reason.code)).toContain("subject-identity-mismatch");

    const differentContract = await createEvidenceBundle({
      ...inputs,
      subject: fixtureCase.prior.subject,
      relationContractVersion: "execution-boundary.relations.v2",
    });
    const contractResult = await comparisonCompatibility(fixtureCase.current, differentContract);
    expect(contractResult.compatible).toBeFalse();
    expect(contractResult.reasons.map((reason) => reason.code)).toContain("relation-contract-mismatch");

    const differentBuilder = await createEvidenceBundle({
      ...inputs,
      subject: fixtureCase.prior.subject,
      builderRevision: "prototype-r2",
    });
    const builderResult = await comparisonCompatibility(fixtureCase.current, differentBuilder);
    expect(builderResult.compatible).toBeFalse();
    expect(builderResult.reasons.map((reason) => reason.code)).toContain("builder-revision-incompatible");
  });

  test("does not compare a different task context as source drift", async () => {
    const cases = await buildFixtureCases();
    const result = await comparisonCompatibility(cases[0].current, cases[1].current);
    expect(result.compatible).toBeFalse();
    expect(result.reasons.map((reason) => reason.code)).toContain("subject-identity-mismatch");
    expect(result.reasons.map((reason) => reason.code)).toContain("task-context-mismatch");
  });

  test("highlights semantic execution changes without build metadata noise", async () => {
    const [fixtureCase] = await buildFixtureCases();
    const diff = diffLensModels(
      buildLensModel(fixtureCase.current),
      buildLensModel(fixtureCase.prior),
    );
    const changed = Object.entries(diff.states)
      .filter(([, state]) => state === "changed")
      .map(([id]) => id);

    expect(changed).toEqual([
      "current-effect",
      "exact-join",
      "execution-standing",
      "effect-join",
      "join-standing",
    ]);
    expect(diff.counts).toEqual({ changed: 5, added: 0, removed: 0 });
    expect(diff.states.task).toBe("unchanged");
    expect(diff.states["current-turn"]).toBe("unchanged");
    expect(diff.changes["effect-join"]).toEqual({
      before: {
        label: "当前执行片段",
        relationState: "unavailable",
        standing: "unavailable",
      },
      after: {
        label: "当前执行片段",
        relationState: "exact",
        standing: "exact",
      },
    });
  });
});

describe("execution standing", () => {
  test("maps exact runtime evidence before bounded authorization evidence", () => {
    const evidence = (currentTurn, currentEffect, authorizationConsumption = "verified") => ({
      authorizationConsumption: { standing: authorizationConsumption },
      currentTurn: { standing: currentTurn },
      currentEffect: { standing: currentEffect },
    });
    expect(executionStandingFromEvidence(evidence("exact", "exact")))
      .toBe("current-effect-exact");
    expect(executionStandingFromEvidence(evidence("exact", "unavailable")))
      .toBe("current-turn-exact");
    expect(executionStandingFromEvidence(evidence("legacy-unproven", "unavailable")))
      .toBe("legacy-unproven");
    expect(executionStandingFromEvidence(evidence("unavailable", "unavailable")))
      .toBe("authorization-consumption-verified");
    expect(executionStandingFromEvidence(evidence("unavailable", "unavailable", "unavailable")))
      .toBe("unavailable");
  });

  test("never promotes consumed authorization or a same-Mission carrier to execution proof", async () => {
    const cases = await buildFixtureCases();
    const model = buildLensModel(cases[1].current);
    expect(model.execution.standing).toBe("authorization-consumption-verified");
    expect(model.execution.provesCurrentExecution).toBeFalse();
    expect(executionStandingPresentation("authorization-consumption-verified")
      .provesCurrentExecution).toBeFalse();
    const carrier = model.nodes.find((node) => node.id === "carrier");
    expect(carrier.evidence.standing).toBe("execution-unproven");
    expect(model.firstIssueEdgeId).toBe("effect-join");
  });
});

describe("frozen Skill Lens evidence", () => {
  test("labels every standing cue with its derivation layer and honest fallback", async () => {
    const bundle = await buildSkillFixture();
    const cues = skillStandingCuePresentation(bundle.projection.value.standings);
    expect(cues.map(({ card, layer, evidenceLimited }) => ({ card, layer, evidenceLimited })))
      .toEqual([
        { card: "trigger", layer: "projection", evidenceLimited: false },
        { card: "eligibility", layer: "projection", evidenceLimited: true },
        { card: "activation", layer: "source", evidenceLimited: true },
        { card: "behavior", layer: "source", evidenceLimited: true },
      ]);
    expect(cues.every((cue) => cue.origin.length > 0 && cue.fallback.length > 0)).toBeTrue();
    expect(cues.find((cue) => cue.card === "activation").fallback)
      .toContain("不由声明补齐");
    expect(cues.find((cue) => cue.card === "behavior").fallback)
      .toContain("不由结构完整补齐");
  });

  test("binds the rewrite request to a deterministic guided path without promoting unavailable evidence", async () => {
    const bundle = await buildSkillFixture();
    expect(await validateSkillEvidenceBundle(bundle)).toEqual({ valid: true, errors: [] });
    expect(bundle.subject.sourceSetRevision).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(bundle.projection.value.standings).toEqual({
      triggerCompatibility: "trigger-compatible",
      methodEligibility: "eligibility-unproven",
      runtimeActivation: "activation-unavailable",
      behaviorEvidence: "behavior-evidence-unavailable",
    });
    expect(bundle.projection.value.steps.map((step) => step.id)).toEqual([
      "request",
      "trigger-compatibility",
      "action-gap",
      "minimum-form",
      "method-eligibility",
      "owned-judgment",
      "rewrite-dispatch",
      "principle-lineage",
      "runtime-activation",
      "behavior-evidence",
      "agent-reading",
    ]);
    const dispatch = bundle.projection.value.steps.find((step) => step.id === "rewrite-dispatch");
    expect(dispatch.evidence.sourceRefs).toEqual([
      "skills/skill-engineering/SKILL.md",
      "skills/skill-engineering/commands/rewrite.md",
      "skills/skill-engineering/references/expression-team.md",
      "skills/skill-engineering/references/expression-layers.md",
      "skills/skill-engineering/references/evaluation.md",
    ]);
    expect(dispatch.evidence.standing).toBe("selected-declared-path");
    const behavior = bundle.projection.value.steps.find((step) => step.id === "behavior-evidence");
    expect(behavior.evidence.sourceRefs).toEqual([
      "fixture:behavior-evidence/none",
      "skills/skill-engineering/references/evaluation.md",
    ]);
    expect(behavior.evidence.excerpt).toBe([
      bundle.artifacts.behaviorEvidence.value.content,
      bundle.artifacts.directReferences.value.find(
        (reference) => reference.sourceRef === "skills/skill-engineering/references/evaluation.md",
      ).excerpt,
    ].join("\n\n"));
    expect(bundle.projection.value.steps.find((step) => step.id === "action-gap")).toMatchObject({
      layer: "explanation",
      evidence: { standing: "fixture-hypothesis" },
    });
    expect(bundle.projection.value.steps.find((step) => step.id === "minimum-form")).toMatchObject({
      layer: "explanation",
      evidence: { standing: "fixture-hypothesis" },
    });
    expect(bundle.projection.value.authorityStop.standing).toBe("source-declared-boundary");
    expect(bundle.sourceIdentities.every((identity) => !identity.sourceRef.startsWith("fixture:")))
      .toBeTrue();
  });

  test("rejects deletion of the retained rewrite dispatch after all derived digests and binding are rebuilt", async () => {
    const bundle = await buildSkillFixture();
    const values = Object.fromEntries(
      Object.entries(bundle.artifacts).map(([name, artifact]) => [name, structuredClone(artifact.value)]),
    );
    const rewriteDeclaration = "- With `rewrite`, read and follow commands/rewrite.md.\n";
    expect(values.skillSource.content).toContain(rewriteDeclaration);
    values.skillSource.content = values.skillSource.content.replace(rewriteDeclaration, "");
    values.skillSource.revision = await digestValue(values.skillSource.content);
    values.skillSource.declaredOperations = values.skillSource.declaredOperations
      .filter((operation) => operation !== "rewrite");
    const rebound = await createSkillEvidenceBundle(values);
    const result = await validateSkillEvidenceBundle(rebound);
    expect(result.valid).toBeFalse();
    expect(result.errors.map((entry) => entry.code)).toContain("dispatch-declaration-mismatch");
    expect(result.errors.map((entry) => entry.code)).toContain("standing-invariant-failed");
  });

  test("rejects retained source content whose declared revision was not recomputed", async () => {
    const bundle = await buildSkillFixture();
    const tampered = structuredClone(bundle);
    const reference = tampered.artifacts.directReferences.value[0];
    reference.content = `${reference.content}\nTampered retained content.`;
    tampered.artifacts.directReferences.digest = await digestValue(
      tampered.artifacts.directReferences.value,
    );
    const result = await validateSkillEvidenceBundle(tampered);
    expect(result.valid).toBeFalse();
    expect(result.errors.map((entry) => entry.code)).toContain("source-revision-mismatch");
  });

  test("rejects behavior evidence that hides a source used by its excerpt", async () => {
    const bundle = await buildSkillFixture();
    const values = Object.fromEntries(
      Object.entries(bundle.artifacts).map(([name, artifact]) => [name, structuredClone(artifact.value)]),
    );
    values.behaviorEvidence.sourceRefs = [values.behaviorEvidence.sourceRef];
    const rebound = await createSkillEvidenceBundle(values);
    const result = await validateSkillEvidenceBundle(rebound);
    expect(result.valid).toBeFalse();
    expect(result.errors.map((entry) => entry.code))
      .toContain("behavior-evidence-sources-mismatch");
  });

  test("rejects a source-set identity that no longer matches the retained sources", async () => {
    const bundle = await buildSkillFixture();
    const values = Object.fromEntries(
      Object.entries(bundle.artifacts).map(([name, artifact]) => [name, structuredClone(artifact.value)]),
    );
    values.skillSource.sourceSetRevision = "sha256:stale";
    const rebound = await createSkillEvidenceBundle(values);
    const result = await validateSkillEvidenceBundle(rebound);
    expect(result.valid).toBeFalse();
    expect(result.errors.map((entry) => entry.code))
      .toContain("source-set-revision-mismatch");
  });

  test("rejects a controlled fixture that drifted from its in-memory rebuild", async () => {
    const rebuilt = await buildSkillFixture();
    const drifted = structuredClone(rebuilt);
    drifted.subject.sourceSetRevision = "sha256:stale";
    expect(() => assertFixtureMatches(rebuilt, drifted, "Skill Lens"))
      .toThrow("Skill Lens fixture drifted");
  });
});
