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

## Authoring fixture — Theory expression without an exception table

**Purpose.** Show how the author currently derives several unrelated mechanism
decisions from object, epistemic claim, effect, causal identity, and authority.
This fixture does not show that a fresh reviewer can transfer the theory.

**Method.** Apply the portable
[harness theory](harness-theory.md) in its stated order: name the object and
owner; distinguish observation/mechanical conformance/semantic judgment/
authority; then classify the effect and recovery relation. The following are
worked derivations, not evaluator outputs or a claim about transfer.

| Unrelated pressure | Derivation before cases | Classification | What would disconfirm it |
| --- | --- | --- | --- |
| A release task requires `report.md`, a JSON manifest, and links to named source files. A proposal says a CI gate should declare the report "good enough." | Paths, bytes, schema, and declared references are reproducible conformance claims, so the checker can own them. Adequacy, relevance, and whether the report answers the actual brief depend on source interpretation and unencoded tradeoffs. | Keep mechanical artifact checking narrow; send consequential adequacy to an independent semantic reviewer; reserve acceptance for the Principal. Do not call the green check a semantic gate. | The acceptance contract specifies a governed, decidable adequacy predicate for this scope; automate that predicate while retaining any remainder for review. |
| A provider call with idempotency key `K` timed out before its acknowledgement. Separately, an Agent Run that prepared the request ended with an adverse review. A proposal calls both follow-ups `retry`. | Re-sending the same identified provider request is an adapter delivery question; provider idempotency/query decides whether replay is safe. Asking the Agent to act after adverse semantic review changes candidate meaning and crosses a new execution boundary. | The adapter may query or safely replay `K` without a new Agent Run. Correction plus a fresh, explicitly identified Run is required for the reviewed candidate; a generic automatic retry is rejected. | The provider lacks idempotency/status and the effect is irreversible: elevate the delivery boundary to a mechanism/authority problem rather than replay. Or a true live control can alter the existing Run without beginning another execution. |
| After restart, a UI has a terminal Cell final and old activity events but no surviving process handle. Product asks for a durable `running` ledger. The same product also sends an irreversible third-party publication request that can time out after commit. | Liveness is a transient observation: old events plus terminal evidence cannot prove a live process now. A UI record would be a projection pretending to be authority. Publication has a causal external effect that needs exact identity and protected authority across ambiguity. | Project `terminal` where final evidence exists and `unknown` for lost liveness; do not create a liveness fact. For publication, retain strict effect ownership, idempotency/query where available, and explicit authorization rather than borrowing the UI's relaxed precision. | A named recovery owner and reader need crash-surviving liveness state to preserve a hard safety property, with explicit write authority, a concurrency/consistency relation, and retirement path. Or publication is proven reversible and locally recoverable, reducing its effect-boundary requirement. |

**Coherence condition.** Each classification retains a different owner for
mechanical fact, semantic judgment, effect/recovery, and acceptance; it does
not introduce a public `retry`/`verify` verb, a semantic validator, or a
durable projection authority.

**Disconfirming observation.** The derivation needs a case-specific exception to
place one of the three situations, or reaches different answers while preserving
the same object, predicate, effect relation, and authority facts. In that case,
revise the theory's distinctions rather than append another vocabulary rule.

**Standing.** This is a source-visible authoring fixture for the new theory. It
is not an independent evaluator run, transfer evidence, proof of causal
expression effect, or a runtime gate.

## Authoring fixture — Phase-appropriate engineering tests

**Purpose.** Check that the testing relation changes coverage with uncertainty
and consequence rather than selecting either “minimal tests” or “exhaustive
tests” as a universal rule. This is a worked coherence fixture, not behavior or
transfer evidence.

| Current subject | Decision-relevant uncertainty | Derived evidence movement |
| --- | --- | --- |
| A new optional tool port whose request shape is still provisional | whether the host can inject one tool without changing callers that inject none | begin with a forward use, a known capability rejection, and no-tool compatibility; do not enumerate every provider and transport failure yet |
| Cancellation has been observed to return a terminal result before one admitted host effect finishes | whether the exact effect boundary and final evidence remain truthful | contain the affected path, reproduce the causal late effect, repair and retain that regression, and exercise adjacent effect channels only where they share the same owner or escape route |
| The same runtime relation is now a release candidate for restart and concurrent Worktree use | whether supported production disturbances can violate recovery or single-writer ownership | expand restart, process-loss, concurrency, recovery, and regression coverage under the intended profile; component happy paths alone are no longer sufficient |

**Coherence condition.** The first subject is allowed to advance without an
exhaustive matrix, the second cannot invoke “early phase” to defer a proven hard
boundary, and the third cannot invoke the original small probe as release
evidence. In every row, mechanical results retain their scoped claim and do not
replace semantic review or Principal acceptance.

**Disconfirming observation.** The method prescribes the same suite breadth
after uncertainty, supported conditions, or consequence changes; or it needs a
mandatory phase state, score, or coverage threshold to reach the three results.

**Standing.** This fixture demonstrates internal derivation only. A future
blinded evaluator must choose evidence for unfamiliar subjects without seeing
these expected movements before portability is claimed.

## Pending evaluation — Blinded theory transfer

**Standing:** `transfer-unverified`.

The authoring fixture above shows internal coherence, not transfer. A valid
next evaluation must separate authoring from evaluation:

1. give a fresh evaluator the portable theory but not `cases.md`, this file's
   worked derivation, or the expected classifications;
2. ask it to review at least three novel mechanism pressures whose domains,
   labels, and surface actions differ from the authored examples;
3. retain the unedited prompt, output, model/profile identity, and any request
   for an exception rule;
4. judge whether it derives object, claim scope, effect relation, authority,
   smallest treatment, and reopening evidence without inventing a new owner or
   mandatory workflow; and
5. include a control that receives the old flat vocabulary or no theory before
   claiming a causal improvement.

A separate organization-boundary probe should hold one Agent model and the
generic Project/Task/Run/Cell sidecar primitives fixed, then vary only task,
environment, capability, and return relations across direct work and two
temporary multi-Run organizations. Needing a new role type, lifecycle, or team
state merely to express one topology is a failure; a performance benefit is a
different empirical claim.

To test the phase-appropriate extension, present one unfamiliar engineering
subject at three different local standings: a provisional direction, an
observed load-bearing failure, and a release candidate under named operating
conditions. Keep the semantic objective fixed and hide the expected test
movements. Transfer fails if the evaluator prescribes the same breadth for all
three, turns the phases into lifecycle state, treats a test pass as semantic
acceptance, or cannot explain which outcome changes the next practice and what
cost the additional evidence incurs.

### Pending probe — Receiver-specific working environment

**Standing:** `transfer-unverified`; no arm has been run.

Use one frozen, bounded review task and the same sources, tool capabilities,
read/effect limits, verification request, and return contract in two prompt
arms:

- the **jargon-heavy control** adds a job title, unexplained project
  abbreviations, and the parent's runtime/module map; and
- the **receiver-specific candidate** replaces those additions with only the
  decision-relevant object/action, whole and downstream relation, explicit
  non-goals, and operational definitions for necessary project terms.

Give each complete prompt, without prior conversation, to a fresh Agent before
execution. Ask it to restate the object, relation to the whole, read and effect
boundary, non-goals, verification, and required return. A request to explain an
undeclared term is a comprehension failure. Then let separate fresh Agents
execute the same task. Retain unedited prompts and outputs, model/profile and
carrier identity, available tools and permissions, clarification requests,
corrective follow-ups, and timing/usage when observable.

Mechanical inspection checks only that the declared sources, capabilities,
effects, and return fields were actually present. A fresh source-aware reviewer
judges task fidelity, whole-relation preservation, non-goals, evidence quality,
and hand-off reconstruction. The acceptance owner remains separate. Compare
noise statements and correction turns as observations, not a score or gate.

The candidate is not supported merely because it is shorter or can be
restated. It must preserve or improve execution and reconstruction while
removing irrelevant context; a lost hard constraint, fabricated capability, or
weaker effect boundary is a failure. Repeated comprehension failures after the
candidate treatment reopen context delivery or prompt expression. Failures
caused by absent tools or unenforced effects return to their runtime owners.
Do not claim transfer until both arms have retained evidence under a named
execution profile and an independent review disposition.

Task shaping, context delivery, and delegation topology remain outside this
Skill's mechanism judgment. The working-environment probe may test whether the
reviewer recognizes and routes those upstream pressures, but it must not let
this Skill form units, choose delivery timing, or operate delegation itself.
