import { digestValue } from "./evidence-bundle.js";

export const PROJECT_BUNDLE_VERSION = "human-agent-visualization.project-evidence-bundle.v1";
export const PROJECT_BUILDER_ID = "local-project-lens-builder";
export const PROJECT_BUILDER_REVISION = "mvp-r3";

function validationError(code, message) {
  return { code, message };
}

function bindingPayload(bundle) {
  return {
    version: bundle.version,
    builder: bundle.builder,
    generatedAt: bundle.generatedAt,
    subject: bundle.subject,
    sourceDigests: bundle.sources.map(({ id, digest }) => ({ id, digest })),
    projectionDigest: bundle.projectionDigest,
  };
}

export async function finalizeProjectBundle(bundle) {
  const projectionDigest = await digestValue(bundle.projection);
  const withProjection = { ...bundle, projectionDigest };
  return {
    ...withProjection,
    bindingDigest: await digestValue(bindingPayload(withProjection)),
  };
}

export async function validateProjectBundle(bundle) {
  const errors = [];
  if (bundle?.version !== PROJECT_BUNDLE_VERSION) {
    errors.push(validationError("version-invalid", "Project evidence bundle version is invalid."));
  }
  if (bundle?.builder?.id !== PROJECT_BUILDER_ID || bundle?.builder?.revision !== PROJECT_BUILDER_REVISION) {
    errors.push(validationError("builder-invalid", "Project Lens builder identity is invalid."));
  }
  if (!bundle?.subject?.id || !bundle?.subject?.root || !bundle?.subject?.revision) {
    errors.push(validationError("subject-invalid", "Project subject identity, root, or revision is missing."));
  }
  if (!Number.isFinite(Date.parse(bundle?.generatedAt))) {
    errors.push(validationError("generated-at-invalid", "Project bundle generatedAt is invalid."));
  }
  if (!Array.isArray(bundle?.sources) || bundle.sources.length === 0) {
    errors.push(validationError("sources-missing", "Project bundle must retain at least one source."));
  }

  const sourceIds = new Set();
  for (const source of bundle?.sources ?? []) {
    if (!source?.id || !source?.sourceRef || !source?.revision || typeof source?.excerpt !== "string") {
      errors.push(validationError("source-invalid", "A retained project source is incomplete."));
      continue;
    }
    if (sourceIds.has(source.id)) errors.push(validationError("source-duplicate", `Duplicate source '${source.id}'.`));
    sourceIds.add(source.id);
    const expected = await digestValue({
      sourceRef: source.sourceRef,
      revision: source.revision,
      excerpt: source.excerpt,
    });
    if (source.digest !== expected) {
      errors.push(validationError("source-digest-mismatch", `Source '${source.sourceRef}' digest does not match.`));
    }
  }

  if (!Array.isArray(bundle?.projection?.steps) || bundle.projection.steps.length < 4) {
    errors.push(validationError("path-missing", "Project Lens guided path is incomplete."));
  }
  const layers = new Set(["source", "projection", "explanation"]);
  for (const step of bundle?.projection?.steps ?? []) {
    if (!step?.id || !layers.has(step.layer) || !step.title || !step.summary || !step.evidence) {
      errors.push(validationError("step-invalid", "A guided path step is incomplete."));
      continue;
    }
    for (const sourceRef of step.evidence.sourceRefs ?? []) {
      if (!bundle.sources.some((source) => source.sourceRef === sourceRef)) {
        errors.push(validationError("step-source-missing", `Step '${step.id}' references missing source '${sourceRef}'.`));
      }
    }
  }

  if (bundle?.projection) {
    const expectedProjection = await digestValue(bundle.projection);
    if (bundle.projectionDigest !== expectedProjection) {
      errors.push(validationError("projection-digest-mismatch", "Project projection digest does not match."));
    }
  }
  try {
    const expectedBinding = await digestValue(bindingPayload(bundle));
    if (bundle?.bindingDigest !== expectedBinding) {
      errors.push(validationError("binding-digest-mismatch", "Project bundle binding digest does not match."));
    }
  } catch (error) {
    errors.push(validationError("binding-invalid", `Project bundle binding is invalid: ${error.message}`));
  }
  return { valid: errors.length === 0, errors };
}
