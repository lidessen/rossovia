# treatment run：Kant

trial：`mechanism-design-review / round-1`
role：treatment；只加载并激活 `.agents/skills/mechanism-design-review/SKILL.md` 一次。

```yaml
case_id: M1
review_unit: "A real cross-process replay consumer needs restart-safe event order, deduplication, gap detection, and replay; proposal adds a durable event log and related contracts."
observed_facts:
  - "WorkCellEvent is typed but currently lacks stable identity, sequence, duplicate, gap, and replay semantics."
  - "RunRecord is a candidate public fact projection, not an event-order replay source."
  - "The source requires provider sessions and natural language to remain non-canonical."
hypotheses:
  - "The named consumer's recovery requirements and durability boundary are real but are not independently evidenced by the authoritative sources."
  - "A durable log is the smallest owner capable of preserving the required cross-process relation."
object_and_owner: "The object is a durable, replayable event relation per run. Coordinator/runtime owns production and lifecycle; protocol and record/evidence owners define identity, ordering, deduplication, gap, retention, and replay semantics. It is not RunRecord, provider evidence, semantic review, or acceptance."
destination: "After coordinator restart, the named consumer can recover a run's ordered events, identify duplicates, detect gaps, and replay from a durable canonical source without inferring effects or acceptance; unconfirmed effects remain unknown."
simpler_alternatives:
  - "Prompt or skill: insufficient for crash-surviving cross-process identity and replay."
  - "RunRecord alone: insufficient to recover event order, duplicates, and gaps."
  - "Deterministic checks: can check a contract but cannot create durable replay authority."
  - "Observation-only Event contract: sufficient only if the replay consumer requirement is withdrawn."
recommendation: mechanism-candidate
nearest_owner_route: "Protocol and record/evidence owners, with coordinator/runtime ownership of durable event production and restart recovery; this remains a mechanism review because the required relation must survive process failure."
unknowns:
  - "Exact consumer recovery granularity and replay cursor semantics."
  - "Retention, compaction, durability, late-event, and failure behavior."
  - "Whether Event or RunRecord is authoritative for each recovered fact."
  - "Runtime, independent semantic-review, acceptance, and adoption evidence."
stop_and_effect_boundary: "Stop at a design candidate pending owner review and a consumer-bound probe. No event log, bus, store, registry, runtime state, external effect, or acceptance was created. A replay failure must stop recovery and return unknown, not infer effect absence or acceptance."
evidence_standing: "design observation; runtime replay validation unknown"
next_return: "Protocol and record/evidence owners should review a fixture covering normal, duplicate, out-of-order, gap, and post-restart streams when the named consumer and retention owner are available."

case_id: M2
review_unit: "A proposal adds an event bus, replay store, and lineage registry for a possible future consumer, while current Events are only realtime or best-effort observations."
observed_facts:
  - "No real cross-process replay consumer is supplied by the case."
  - "Typed Event currently supports observation but has no replay contract."
  - "RunRecord is the candidate public fact projection for completed runs."
  - "The authoritative sources reject creating mechanisms for future possibility alone."
hypotheses:
  - "A future consumer may later require replay or lineage recovery."
  - "Event order could safely serve as an effect authority; this is unsupported and conflicts with the source boundaries."
object_and_owner: "The current object is an observation surface, not a missing replay mechanism. Coordinator owns execution facts, RunRecord owns the retained fact projection, and any future replay consumer would own a new requirement. The proposed bus, store, and registry would be new mechanisms without a current owner-backed pressure."
destination: "Keep the current observation-only boundary, state that Event order cannot establish effect facts, and reopen the review only when a real replay consumer and recovery obligation exist."
simpler_alternatives:
  - "Keep typed Event for realtime or best-effort observation."
  - "Clarify the design text or skill that RunRecord remains the public fact projection."
  - "Use explicit unknown for missing, duplicate, or reordered observations."
  - "Do not infer effects, lineage, or acceptance from delivery order."
recommendation: no-proposal
nearest_owner_route: "Protocol and record/evidence owners may clarify the observation-only contract; no runtime mechanism owner is justified by the current case."
unknowns:
  - "Whether a future replay consumer will exist and what it will require."
  - "Future retention, durability, lineage, and acceptance ownership."
  - "Any matched evidence that event order is repeatedly insufficient for a real consumer."
stop_and_effect_boundary: "Stop before creating the bus, replay store, or registry. No workspace, runtime, persistence, external system, or acceptance effect was produced. If a future consumer appears, return to an independent mechanism review."
evidence_standing: "design observation; future consumer need unknown"
next_return: "Reopen with a named replay consumer, concrete restart failure, and a bounded recovery fixture; until then retain the observation-only design."

case_id: M3
review_unit: "A proposal chooses a mandatory rule, reference, skill, projection, or runtime gate before the review object, failure, owner, and acceptance relation are stable."
observed_facts:
  - "The proposal mixes form selection with mechanism selection."
  - "The authoritative sources require object, owner, failure, and destination analysis before adding mechanisms."
  - "A runtime gate would be justified only by a hard property existing owners cannot preserve."
hypotheses:
  - "The recurring checklist problem may be an expression or form problem rather than a mechanism problem."
  - "The appropriate carrier may differ by audience, authority, lifecycle, and enforcement need."
object_and_owner: "The object is an unresolved review judgment about the form of a design method. Form-selection owns choosing document, reference, skill, projection, tool, or runtime; concept-articulation may be needed first if the object or terms remain unstable. This is not yet a mechanism, acceptance decision, or runtime gate."
destination: "First stabilize the pressure, object, owner, failure consequence, evidence, and acceptance relation; then choose the smallest carrier that preserves those relations and keeps one canonical authority."
simpler_alternatives:
  - "Simplify the checklist into a human-readable review prompt or skill judgment."
  - "Reuse an existing owner or project document if the relation is already covered."
  - "Use a projection only when it can be rebuilt from a stable source."
  - "Consider a runtime gate only after a concrete hard invariant and bypass/crash consequence are evidenced."
recommendation: route-unknown
nearest_owner_route: "Route first to form-selection, with concept-articulation if the object or neighboring concepts are not stable; mechanism review should resume only after a concrete mechanism pressure is established."
unknowns:
  - "The actual recurring failure and its observable consequence."
  - "The intended audience, authority, lifecycle, and enforcement requirement."
  - "Whether any existing carrier already owns the judgment."
  - "Independent semantic review, acceptance, adoption, and regression evidence."
stop_and_effect_boundary: "Stop before selecting or installing a mandatory carrier or gate. No rule, skill, projection, runtime state, workflow, external effect, or acceptance authority was created."
evidence_standing: "design observation; carrier suitability and adoption unknown"
next_return: "A form-selection owner should compare the smallest candidate carriers after the review object and failure are stabilized; return to mechanism review only if a hard relation cannot survive without new state or control."

cross_case_note: "This task supports design observations about typed Events, RunRecord boundaries, the absence of replay semantics, the absence of a named consumer in M2, and the form/mechanism distinction. M1's mechanism-candidate status still requires a real consumer and owner-backed replay contract. Claims about improvement require matched baseline/treatment evidence; claims about semantic quality require independent semantic review; claims about adoption require acceptance and adoption/regression evidence. None of the three cases establishes acceptance, implementation authorization, runtime reliability, or a completed mechanism."
```
