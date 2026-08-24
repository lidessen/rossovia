export const EVIDENCE_BUNDLE_VERSION = "human-agent-visualization.evidence-bundle.v1";
export const WORK_ITEM_PROJECTION_VERSION =
  "human-agent-visualization.work-item-set-projection.v1";
export const RELATION_CONTRACT_VERSION = "execution-boundary.relations.v1";
export const BUILDER_ID = "execution-boundary-fixture-builder";
export const BUILDER_REVISION = "prototype-r1";
export const COMPARISON_POLICY = "exact-builder-revision";

const ARTIFACT_NAMES = [
  "snapshot",
  "principalTaskObservation",
  "otherBuilderInputs",
  "workItemSetProjection",
];

function canonicalValue(value, path = "$") {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${path} contains a non-finite number`);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => canonicalValue(entry, `${path}[${index}]`));
  }
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${path} must contain only JSON-compatible objects`);
    }
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalValue(value[key], `${path}.${key}`)]),
    );
  }
  throw new TypeError(`${path} contains unsupported ${typeof value}`);
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export async function digestValue(value) {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${[...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

function assertExecutionEvidence(input) {
  const authorizationStandings = new Set(["verified", "unavailable"]);
  const runtimeStandings = new Set(["exact", "legacy-unproven", "unavailable"]);
  if (!authorizationStandings.has(input?.authorizationConsumption?.standing)) {
    throw new TypeError("authorizationConsumption.standing is invalid");
  }
  if (!runtimeStandings.has(input?.currentTurn?.standing)) {
    throw new TypeError("currentTurn.standing is invalid");
  }
  if (!runtimeStandings.has(input?.currentEffect?.standing)) {
    throw new TypeError("currentEffect.standing is invalid");
  }
}

export function executionStandingFromEvidence(input) {
  assertExecutionEvidence(input);
  if (input.currentEffect.standing === "exact") return "current-effect-exact";
  if (input.currentTurn.standing === "exact") return "current-turn-exact";
  if (
    input.currentTurn.standing === "legacy-unproven"
    || input.currentEffect.standing === "legacy-unproven"
  ) return "legacy-unproven";
  if (input.authorizationConsumption.standing === "verified") {
    return "authorization-consumption-verified";
  }
  return "unavailable";
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function collectSourceIdentities(
  snapshot,
  principalTaskObservation,
  otherBuilderInputs,
) {
  const identities = [
    ...(snapshot.sourceIdentities ?? []),
    {
      kind: "principal-task-source",
      id: principalTaskObservation.task.id,
      sourceRef: principalTaskObservation.sourceRef,
      revision: String(principalTaskObservation.sourceRevision),
    },
    ...(otherBuilderInputs.sourceIdentities ?? []),
  ];
  return identities
    .map((identity) => ({
      kind: String(identity.kind),
      id: String(identity.id),
      sourceRef: String(identity.sourceRef),
      revision: String(identity.revision),
    }))
    .sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
}

export function buildWorkItemSetProjection({
  snapshot,
  principalTaskObservation,
  otherBuilderInputs,
  subject,
  relationContractVersion,
  builderRevision,
}) {
  if (principalTaskObservation.standing !== "available") {
    throw new TypeError("the Principal-task observation must be available");
  }
  const task = principalTaskObservation.task;
  const executionStanding = executionStandingFromEvidence(
    otherBuilderInputs.executionEvidence,
  );
  const sourceRefs = uniqueSorted([
    principalTaskObservation.sourceRef,
    ...collectSourceIdentities(
      snapshot,
      principalTaskObservation,
      otherBuilderInputs,
    ).map((identity) => identity.sourceRef),
  ]);

  return {
    version: WORK_ITEM_PROJECTION_VERSION,
    generatedAt: snapshot.generatedAt,
    builderRevision,
    relationContractVersion,
    subject,
    items: [
      {
        id: `principal-task:${task.id}`,
        kind: "principal-task",
        title: task.title,
        nextActor: task.nextActor,
        projectKey: task.binding.projectKey,
        missionId: task.binding.missionId,
        evidence: {
          freshness: {
            kind: "observed-at-build",
            observedAt: snapshot.generatedAt,
          },
          sourceRefs,
        },
        taskDetail: {
          sourceRevision: principalTaskObservation.sourceRevision,
          sourceRef: principalTaskObservation.sourceRef,
          projectAuthority: "context-only",
          missionContext: {
            missionId: task.binding.missionId,
            authority: "context-only",
            standing: "observed",
            sourceRef: otherBuilderInputs.mission.sourceRef,
            currentCarrier: otherBuilderInputs.currentCarrier === null
              ? null
              : {
                ...otherBuilderInputs.currentCarrier,
                relation: "same-mission-current-carrier",
                executionStanding: "execution-unproven",
              },
          },
          executionContext: {
            standing: executionStanding,
            latestLink: task.executionLink,
            authorizationConsumption:
              otherBuilderInputs.executionEvidence.authorizationConsumption,
            currentTurn: otherBuilderInputs.executionEvidence.currentTurn,
            currentEffect: otherBuilderInputs.executionEvidence.currentEffect,
          },
        },
      },
    ],
  };
}

function bindingPayload(bundle) {
  return {
    version: bundle.version,
    subject: bundle.subject,
    relationContractVersion: bundle.relationContractVersion,
    builder: bundle.builder,
    generatedAt: bundle.generatedAt,
    sourceIdentities: bundle.sourceIdentities,
    artifactDigests: Object.fromEntries(
      ARTIFACT_NAMES.map((name) => [name, bundle.artifacts[name]?.digest ?? null]),
    ),
  };
}

export async function createEvidenceBundle({
  snapshot,
  principalTaskObservation,
  otherBuilderInputs,
  subject,
  relationContractVersion = RELATION_CONTRACT_VERSION,
  builderRevision = BUILDER_REVISION,
}) {
  const builder = {
    id: BUILDER_ID,
    revision: builderRevision,
    comparisonPolicy: COMPARISON_POLICY,
  };
  const sourceIdentities = collectSourceIdentities(
    snapshot,
    principalTaskObservation,
    otherBuilderInputs,
  );
  const workItemSetProjection = buildWorkItemSetProjection({
    snapshot,
    principalTaskObservation,
    otherBuilderInputs,
    subject,
    relationContractVersion,
    builderRevision,
  });
  const artifactValues = {
    snapshot,
    principalTaskObservation,
    otherBuilderInputs,
    workItemSetProjection,
  };
  const artifacts = Object.fromEntries(
    await Promise.all(
      Object.entries(artifactValues).map(async ([name, value]) => [
        name,
        { value, digest: await digestValue(value) },
      ]),
    ),
  );
  const bundle = {
    version: EVIDENCE_BUNDLE_VERSION,
    subject,
    relationContractVersion,
    builder,
    generatedAt: snapshot.generatedAt,
    sourceIdentities,
    artifacts,
  };
  return {
    ...bundle,
    bindingDigest: await digestValue(bindingPayload(bundle)),
  };
}

function sameValue(left, right) {
  try {
    return canonicalJson(left) === canonicalJson(right);
  } catch {
    return false;
  }
}

function validationError(code, message) {
  return { code, message };
}

export async function validateEvidenceBundle(bundle) {
  const errors = [];
  if (bundle?.version !== EVIDENCE_BUNDLE_VERSION) {
    errors.push(validationError("bundle-version-invalid", "Evidence bundle version is invalid."));
  }
  if (bundle?.builder?.id !== BUILDER_ID) {
    errors.push(validationError("builder-id-invalid", "Fixture builder identity is invalid."));
  }
  if (bundle?.builder?.comparisonPolicy !== COMPARISON_POLICY) {
    errors.push(validationError("comparison-policy-invalid", "Builder comparison policy is invalid."));
  }
  if (!bundle?.subject?.id || !bundle?.subject?.taskContext?.taskId) {
    errors.push(validationError("subject-invalid", "Lens subject identity or task context is missing."));
  }
  if (!Number.isFinite(Date.parse(bundle?.generatedAt))) {
    errors.push(validationError("generated-at-invalid", "Bundle generatedAt is invalid."));
  }

  for (const name of ARTIFACT_NAMES) {
    const artifact = bundle?.artifacts?.[name];
    if (artifact === undefined || artifact.value === undefined || typeof artifact.digest !== "string") {
      errors.push(validationError("artifact-missing", `Artifact '${name}' is missing.`));
      continue;
    }
    try {
      const digest = await digestValue(artifact.value);
      if (digest !== artifact.digest) {
        errors.push(validationError("artifact-digest-mismatch", `Artifact '${name}' digest does not match.`));
      }
    } catch (error) {
      errors.push(validationError("artifact-invalid", `Artifact '${name}' is invalid: ${error.message}`));
    }
  }

  const snapshot = bundle?.artifacts?.snapshot?.value;
  const taskObservation = bundle?.artifacts?.principalTaskObservation?.value;
  const otherInputs = bundle?.artifacts?.otherBuilderInputs?.value;
  const retainedProjection = bundle?.artifacts?.workItemSetProjection?.value;

  if (snapshot && bundle?.generatedAt !== snapshot.generatedAt) {
    errors.push(validationError("generated-at-mismatch", "Bundle and snapshot generatedAt do not match."));
  }
  if (taskObservation && bundle?.subject?.taskContext) {
    const task = taskObservation.task;
    const context = bundle.subject.taskContext;
    if (
      task?.id !== context.taskId
      || task?.binding?.projectKey !== context.projectKey
      || task?.binding?.missionId !== context.missionId
    ) {
      errors.push(validationError("task-context-mismatch", "Retained task does not match the lens task context."));
    }
  }

  if (snapshot && taskObservation && otherInputs) {
    const expectedSources = collectSourceIdentities(snapshot, taskObservation, otherInputs);
    if (!sameValue(expectedSources, bundle.sourceIdentities)) {
      errors.push(validationError("source-identities-mismatch", "Retained source identities do not match builder inputs."));
    }
    try {
      const expectedProjection = buildWorkItemSetProjection({
        snapshot,
        principalTaskObservation: taskObservation,
        otherBuilderInputs: otherInputs,
        subject: bundle.subject,
        relationContractVersion: bundle.relationContractVersion,
        builderRevision: bundle.builder?.revision,
      });
      if (!sameValue(expectedProjection, retainedProjection)) {
        errors.push(validationError("projection-mismatch", "Retained projection was not derived from the retained builder inputs."));
      }
    } catch (error) {
      errors.push(validationError("projection-rebuild-failed", `Projection could not be rebuilt: ${error.message}`));
    }
  }

  try {
    const expectedBindingDigest = await digestValue(bindingPayload(bundle));
    if (expectedBindingDigest !== bundle?.bindingDigest) {
      errors.push(validationError("binding-digest-mismatch", "Evidence bundle binding digest does not match."));
    }
  } catch (error) {
    errors.push(validationError("binding-invalid", `Evidence bundle binding is invalid: ${error.message}`));
  }

  return { valid: errors.length === 0, errors };
}

function incompatibility(code, message) {
  return { code, message };
}

export async function comparisonCompatibility(current, prior) {
  const [currentValidation, priorValidation] = await Promise.all([
    validateEvidenceBundle(current),
    validateEvidenceBundle(prior),
  ]);
  const reasons = [];
  if (!currentValidation.valid) {
    reasons.push(incompatibility("current-bundle-invalid", "Current evidence bundle does not validate internally."));
  }
  if (!priorValidation.valid) {
    reasons.push(incompatibility("prior-bundle-invalid", "Prior evidence bundle does not validate internally."));
  }
  if (reasons.length > 0) return { compatible: false, reasons };

  if (current.subject.id !== prior.subject.id) {
    reasons.push(incompatibility("subject-identity-mismatch", "Lens subject identities differ."));
  }
  if (!sameValue(current.subject.taskContext, prior.subject.taskContext)) {
    reasons.push(incompatibility("task-context-mismatch", "Lens task contexts differ."));
  }
  if (current.relationContractVersion !== prior.relationContractVersion) {
    reasons.push(incompatibility("relation-contract-mismatch", "Relation-contract versions differ."));
  }
  if (
    current.builder.comparisonPolicy !== COMPARISON_POLICY
    || prior.builder.comparisonPolicy !== COMPARISON_POLICY
    || current.builder.id !== prior.builder.id
    || current.builder.revision !== prior.builder.revision
  ) {
    reasons.push(incompatibility(
      "builder-revision-incompatible",
      "Builder revisions are not comparison-compatible; this prototype requires an exact match.",
    ));
  }
  return { compatible: reasons.length === 0, reasons };
}
