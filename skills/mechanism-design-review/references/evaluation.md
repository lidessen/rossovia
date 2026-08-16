# Mechanism-design-review evaluation notes

These notes retain decision-changing expression probes for the current Skill.
They are authoring evidence, not doctrine, a runtime gate, or proof of portable
behavior across models.

## Probe 1 — Flat action vocabulary versus relations

**Claim.** An unfamiliar Agent should classify Harness follow-up correctly from
effect, input, evidence, and authority relations without memorizing a growing
verb table.

**Supplied situations.** First artifact confirmation, repeated deterministic
checks, provider failure before effect, timeout after possible effect, crash
after final evidence, retained-session continuation, rerun without retained
session, format-only repair, adverse semantic review, and Principal acceptance.

**Disconfirming observation.** The evaluator needs new verbs, exception rules,
or contradictory meanings for the same verb.

**Baseline observation.** A flat list containing retry, continue, recover,
reverify, correct/revise, rerun, review, settlement, and acceptance failed. The
evaluator could not classify first-time verification, format-only repair,
terminal commit after recovery, or review follow-up as peer actions; it also
found that continuation was described as both the same execution and a
successor Run.

**Revision.** The Skill now derives observation, new execution, and live
control from effect relations, then returns domain mutation, owner-internal
transition, adapter replay, and execution reason to their owners
([current method](../SKILL.md#separate-observation-judgment-authority-and-next-action)).
Rossovia's public Orchestration design reduces execution to `run(request)` and
`stop(runId)`
([architecture application](../../../design/organization/sessions/2026-08-16-rossovia-runtime-module-review.md#harness-evidence-review-acceptance-and-minimal-action-semantics)).

**Recheck observation.** The same evaluator classified the difficult cases
without a new public verb. One residual was corrected: a command named test or
verify is still execution when it can mutate source, workspace, database, or an
external system.

**Verdict.** Supported for this evaluator and task set. Causal attribution and
cross-model portability remain unproved.

## Probe 2 — Three-question transfer before cases

**Claim.** Identity, causal origin, and destination should generate a treatment
for unfamiliar cases before worked examples are loaded.

**Procedure.** A fresh evaluator read the Skill but not
[`cases.md`](cases.md), then analyzed:

1. a proposed durable UI liveness registry after process restart while O2
   evidence remains and live handles do not;
2. a prompt-only “do not publish twice” rule for an irreversible third-party
   API that may time out after commit and has no idempotency key or status
   query; and
3. an automatic three-rerun policy after an independent semantic reviewer says
   quality is insufficient.

It then read the worked cases and reported whether they changed the results.

**Disconfirming observation.** The evaluator cannot identify the unique owner
and invariant before seeing an analogous example, or its conclusion changes
only because a case supplies a matching answer.

**Observed action before cases.** The evaluator derived:

- `simplify` the UI proposal to terminal/live/unknown projections from O2 and
  current handle owners rather than create a liveness registry;
- `mechanism-candidate` for durable one-shot publication identity with ambiguous
  timeout and no automatic replay, while recognizing that only provider
  idempotency/query can supply stronger delivery truth; and
- `simplify` semantic-review failure into retained review plus explicit domain
  correction or separately authorized execution, never automatic retry.

**Effect of cases.** Reading the five worked cases clarified transfer but did
not change any treatment. The third-party publication case had no direct worked
analogue, so its result depended on the effect/process-loss boundary rather than
case resemblance.

**Verdict.** Supported for one fresh evaluator. Reopen if unfamiliar Agents
classify novel crash, concurrency, or irreversible-effect proposals correctly
only after an analogous case is supplied. Repeat across another model family
before claiming portable expression effect.

## Probe 3 — Evidence-linked summary versus decision-ready explanation

**Claim.** A mechanism or architecture review intended for a Principal must let
that reader understand the object, normal path, current-to-target change,
material failure/recovery boundary, recommendation, and decision without opening
the linked code or reconstructing prior conversation.

**Observed failure.** A Rossovia architecture handoff reported corrected
cardinalities, ownership boundaries, validation results, and an independent
`READY` verdict with precise source links. The Principal could not analyze or
decide from the conversation because the response never introduced the system
as a whole or explained how the parts and alternatives related. Traceability was
present; usable decision context was not.

**Disconfirming observation.** After revision, a reader without repository
access still cannot explain the system, compare current and target relations,
identify the main tradeoff, or state what their decision authorizes.

**Revision.** The Skill now requires a self-contained working model before
findings and links: object and purpose, normal effect/evidence/acceptance path,
current-to-target delta, failure and recovery, retained and removed complexity,
recommendation, alternatives where real, and the exact decision. Links remain
inline evidence and optional drill-down rather than the missing explanation.

**Forward-test observation.** A fresh evaluator received only this Skill and
the corrected Rossovia architecture candidate. Without implementation code or
prior conversation, it explained the system purpose, five logical parts,
`Run → 0..1 Cell` relation, normal effect/evidence/review/acceptance path,
material failure and recovery cases, current-to-target consolidation,
intentional imprecision, recommendation, and the immediate authority conveyed
by each of three choices. It also distinguished architectural sufficiency from
unproved claims about current implementation behavior.

**Verdict.** Supported for one fresh evaluator and this architecture candidate.
The result shows that the revised form can carry a consequential design
decision without source reconstruction; it does not establish portability
across model families or prove the architecture's implementation claims.
