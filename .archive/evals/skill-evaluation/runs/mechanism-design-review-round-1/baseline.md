# baseline run：Pasteur

trial：`mechanism-design-review / round-1`
role：baseline；candidate 未加载，未发生 candidate activation。

```yaml
case_id: M1
review_unit: Cross-process replay and recovery of one WorkCellEvent stream after coordinator restart
observed_facts: >-
  The protocol defines typed WorkCellEvent values but no stable event identity, sequence, duplicate,
  gap, or replay contract. RunRecord is the candidate public fact projection. The case supplies a
  consumer requirement for ordered recovery, deduplication, and gap detection.
hypotheses: >-
  The required retention horizon, replay authority, checkpoint boundary, late-event policy, and
  owner are not established.
object_and_owner: >-
  Object: a replayable cross-process event contract for one run. Unit: the run event stream and its
  restart boundary. Current owner: no named owner; protocol, record/evidence, coordinator, and
  retention responsibilities are implicated. Confusions: typed observation versus replay log,
  RunRecord versus event authority, and provider session versus causal identity.
destination: >-
  A bounded, authoritative relation must preserve event identity, run association, ordering,
  duplicate semantics, gap semantics, restart recovery, and retention. RunRecord must remain
  distinct from the event stream, and unknown effect observations must remain unknown.
simpler_alternatives: >-
  A bounded per-run durable journal may be smaller than a general event bus, replay store, or
  registry. RunRecord-only observation is insufficient for the stated in-flight restart consumer;
  prompt, skill, provider trace, and arrival order cannot provide crash-surviving causal identity.
recommendation: mechanism-candidate
nearest_owner_route: >-
  Route the candidate to protocol plus record/evidence and coordinator/retention owners. This is
  not a prompt or skill problem because restart identity, ordering, gap handling, and persistence
  must survive caller wording and provider replacement.
unknowns: >-
  The real consumer's exact recovery contract, retention authority, event-log durability boundary,
  sequence scope, duplicate identity, gap behavior, late-event correction policy, and acceptance
  owner remain unknown.
stop_and_effect_boundary: >-
  Stop at a bounded design candidate. Do not add event fields, durable storage, replay services,
  runtime state, or acceptance. If the consumer contract or owner cannot be specified, preserve
  unknown rather than expanding the mechanism.
evidence_standing: design observation
next_return: >-
  Obtain the real consumer's minimum replay and recovery contract, then run an independent protocol
  and record/evidence review with duplicate, gap, restart, and late-event fixtures before any
  implementation or acceptance decision.

case_id: M2
review_unit: Proposed future replay infrastructure without a current replay consumer
observed_facts: >-
  The current observation surface uses typed WorkCellEvent for realtime or best-effort observation,
  while RunRecord is the candidate public fact projection for completed runs. The source does not
  establish a current cross-process replay consumer or a replay contract.
hypotheses: >-
  A future consumer may need replay, but its required facts, retention, owner, and failure
  consequences are unspecified. Event arrival order is not established as effect order.
object_and_owner: >-
  Object: the current observation boundary, not a replay mechanism. Unit: Event observation and
  completed-run fact projection. Current owner: protocol and record/evidence owners; no replay owner
  exists. Confusions: future possibility versus present requirement, event order versus causal fact,
  and provider session lineage versus canonical evidence.
destination: >-
  Keep Event as observation-only and RunRecord as the candidate public fact projection. Consumers
  must not infer effect existence or absence from event order, duplicates, gaps, or unavailable
  observations.
simpler_alternatives: >-
  Retain the existing typed observation surface and explicit unknown/unavailable standing. If a real
  replay consumer appears, open a separate bounded mechanism review. Do not pre-create an event bus,
  replay store, lineage registry, or skill to encode a hypothetical need.
recommendation: no-proposal
nearest_owner_route: >-
  No current mechanism route is warranted. A future consumer should be routed to protocol and
  record/evidence owners with a concrete recovery contract and fixtures.
unknowns: >-
  Whether a future consumer will exist, what it must reconstruct, required retention, acceptable
  unknown behavior, and who would accept the contract are unknown.
stop_and_effect_boundary: >-
  Stop with the observation-only baseline. Produce no bus, store, registry, runtime gate, lineage
  inference, or acceptance claim.
evidence_standing: design observation
next_return: >-
  Reopen only when a real replay consumer and its minimum recovery obligation are named; then
  compare the existing observation baseline with a narrowly scoped mechanism candidate.

case_id: M3
review_unit: Choosing a carrier for mechanism judgment before stabilizing the judged object and failure relation
observed_facts: >-
  Harness theory separates method expression from base mechanisms. A mechanism is justified only
  when a named hard property cannot be preserved by existing mechanisms; conditional behavior should
  not be mechanismized. The proposal supplies carrier choices but no stable object, owner, failure
  consequence, or acceptance relation.
hypotheses: >-
  The recurring review difficulty may be a method-expression gap, a semantic-review gap, or a real
  lifecycle/effect/authority gap. The source does not establish which one it is.
object_and_owner: >-
  Object: currently undefined; it could be a review judgment, a method for expressing that judgment,
  or a hard runtime property. Unit and current owner are therefore unknown. Confusions: form
  selection versus mechanism admission, review recommendation versus acceptance, and checklist
  completeness versus generative semantic judgment.
destination: >-
  First stabilize the object, unit, source authority, owner, failure consequence, and acceptance
  relation. Only then can the result be routed to a method expression, existing owner, projection,
  or mechanism candidate.
simpler_alternatives: >-
  If the invariant remains unchanged and only judgment guidance is needed, use a bounded prompt or
  skill. If the issue is human-readable rendering, use a projection or reference. Reserve a
  runtime gate for a demonstrable hard effect, lifecycle, causal-identity, or persistent-evidence
  property.
recommendation: route-unknown
nearest_owner_route: >-
  Route first to an independent semantic/design reviewer to define the object and failure
  consequence, then to the existing method or mechanism owner selected by that result. No carrier
  can be chosen from the current proposal alone.
unknowns: >-
  The recurring failure, affected invariant, owner, irreversibility, required evidence, acceptance
  authority, and whether existing mechanisms can preserve the relation are all unknown.
stop_and_effect_boundary: >-
  Stop before selecting or activating any rule, reference, skill, projection, or runtime gate. Do
  not create a checklist, mechanism, implementation, or acceptance record from this review.
evidence_standing: unknown
next_return: >-
  Produce one bounded semantic fixture showing the failure and its consequence, with an independent
  reviewer identifying whether the needed relation is methodological, projected, or load-bearing
  runtime behavior.

cross_case_note: >-
  The task supports design observations about the typed Event boundary, RunRecord projection,
  owner separation, and the distinction between method expression and hard mechanism properties.
  M1 additionally needs a real replay consumer and restart/duplicate/gap fixtures; a mechanism claim
  needs matched baseline/treatment evidence, independent protocol and record/evidence review,
  acceptance, and adoption-regression evidence. M2 is adequately a no-proposal only while no real
  consumer exists; any future need requires that same consumer-bound review. M3 requires independent
  semantic review before form selection, and any resulting skill or mechanism requires its own
  acceptance and adoption regression. None of these observations is protocol acceptance or candidate
  activation.
```
