# PlugMem — Task-Agnostic Memory for Agent Work

**Status:** source-bound design research

**Observed:** 2026-08-20

**Disposition:** `open`

**Scope:** Decide whether PlugMem's separation of abstract knowledge, reusable
procedures, and source episodes is a useful research direction for Rossovia's
task, attempt, conversation, and workflow-observer evidence. This note records
the paper as a design reference; it does not adopt a memory mechanism, change
the Principle Sequence, or grant a projection authority over its sources.

**Source limitations:** The [ICML 2026 poster page](https://icml.cc/virtual/2026/poster/64446)
was supplied as the publication landing page, but its content was not
available to the browser during this inquiry. The paper's claims were checked
against the [arXiv paper](https://arxiv.org/abs/2603.03296),
the [OpenReview record](https://openreview.net/forum?id=NWKaQIKoGp), the
[Microsoft Research explanation](https://www.microsoft.com/en-us/research/blog/from-raw-interaction-to-reusable-knowledge-rethinking-memory-for-ai-agents/),
and the authors' [official repository README](https://github.com/TIMAN-group/PlugMem/blob/main/README.md).
The reported benchmark improvements are author-reported and have not been
reproduced in Rossovia.

> This record is cited, revisable design research. It is not a P-ID, an
> accepted runtime design, an implementation task, or an automatic proposal to
> add a database.

## Placement and relation to the principle lineage

This inquiry belongs under `design/research/`, not `principles/research/`.
It is a project-specific technical reference that may change a later Rossovia
design probe; it does not currently expose a new irreducible cross-context
principle. The existing [agent cognition and memory research](agent-cognition-memory-engineering.md)
already covers the relevant source/projection, memory formation, retrieval,
maintenance, cost, and authority risks. This note preserves the PlugMem
comparison without duplicating that broader inquiry or assigning it a new P-ID.

## Question

Can Rossovia gain useful decision-relevant continuity by turning selected
source-linked work evidence into compact, retrievable knowledge and procedures,
while keeping canonical Task, Run/attempt, conversation, observer, Git, and
review records as the sources of truth? If so, what is the smallest read-only
probe that can distinguish useful inheritance from plausible but harmful
abstraction?

## Distinctions

- **PlugMem memory types are functional representations, not Rossovia
  authorities.** Propositional/semantic knowledge describes a fact or concept;
  prescriptive/procedural knowledge describes how to act; episodic memory keeps
  the interaction or trajectory that can ground a retrieval. They must not be
  renamed into Task, attempt, correction, or observer records as if the
  categories were equivalent.
- **A retrieved memory is guidance, not acceptance.** A model-produced
  abstraction can be useful for attention and action, but it remains a
  projection until a named Rossovia source and owner admit a corresponding
  claim or decision.
- **A graph is an access form, not a canonical ledger.** Any future graph or
  search index must be deletable and rebuildable from source-native records; a
  graph edge cannot repair missing provenance or silently supersede a Task,
  attempt, review, correction, or accepted design.
- **Task-agnostic does not mean context-free.** A general representation may
  transfer across work types, but source scope, project identity, harness
  identity, privacy, retention, applicability, and revision still constrain
  whether a retrieved item may affect the current action.

## Evidence from PlugMem

The [paper abstract and introduction](https://arxiv.org/abs/2603.03296)
frame the problem as a trade-off between task-specific memory that does not
transfer and task-agnostic raw-history retrieval that is noisy and expensive.
PlugMem's stated response is to structure experience as reusable,
knowledge-centric representations rather than treating every raw trajectory as
an equally useful retrieval unit.

The paper describes three interlinked graphs: an episodic graph for source
experiences, a semantic graph for propositional knowledge, and a procedural
graph for prescriptive knowledge. It explicitly retains provenance links from
the abstract graphs back to episodic evidence, and alternates abstract and
specific retrieval before compressing the result into actionable guidance
([methodology, retrieval, and supported operations](https://arxiv.org/abs/2603.03296#3-methodology)).
The reported operations include create, retrieve, update, and delete, but the
main benchmark evaluation emphasizes create and retrieve; Rossovia should not
infer that semantic update/delete is safe merely because the API exposes it.

The authors report evaluation across long-horizon conversational QA,
multi-hop knowledge retrieval, and web-agent tasks, including lower injected
memory cost and higher information density in their experimental setting
([paper experiments](https://arxiv.org/abs/2603.03296#4-experiments)).
The [Microsoft Research account](https://www.microsoft.com/en-us/research/blog/from-raw-interaction-to-reusable-knowledge-rethinking-memory-for-ai-agents/)
confirms the intended shift from raw interaction history to structured,
decision-oriented reusable knowledge. The [official README](https://github.com/TIMAN-group/PlugMem/blob/main/README.md#memory)
documents the three memory types and a plugin surface with graph inspection,
retrieval/reasoning, and disk-backed episodic references. Its coding-agent
design is especially relevant as a comparison: the [coding design](https://github.com/TIMAN-group/PlugMem/blob/main/design_docs/plugmem_for_coding.md)
uses promotion signals, limited recall triggers, per-harness graph isolation,
and an explicit rule that static contract files remain authoritative.

## Existing Rossovia coverage

- [`agent-cognition-memory-engineering`](agent-cognition-memory-engineering.md)
  already identifies the useful lifecycle—capture, formation, retrieval,
  update, maintenance, and acceptance—and warns against unfiltered ingress,
  model-owned mutation, graph/index authority, stale inheritance, and hidden
  background work. PlugMem strengthens the case for comparing abstract
  knowledge with raw evidence; it does not remove those boundaries.
- [`observation-chronicle`](../../principles/research/observation-chronicle.md)
  and [Decision 018](../decisions/018-observation-chronicle-pilot.md) already
  separate source-native records, append-only observations, claims/reviews,
  and rebuildable projections. PlugMem's provenance edges are compatible with
  this shape only as a read-side relation.
- [`design/harness/THEORY.md`](../harness/THEORY.md) requires an Agent's
  return to preserve source identity, evidence, uncertainty, and downstream
  use. A memory retrieval should therefore be treated as receiver-specific
  context delivery, not a replacement for task formation or acceptance.
- [`context-engineering`](../../skills/context-engineering/SKILL.md) covers
  when task-relevant information reaches an Agent. PlugMem may be one future
  retrieval adapter, but the adapter cannot become the source of the content it
  delivers.

## Possible decision delta

PlugMem is worth retaining as an **open design direction**, with the following
candidate delta for a later bounded probe:

1. Keep canonical Task, attempt, conversation, observer, review, and Git
   records unchanged, then derive three explicitly non-authoritative views:
   source episodes, semantic/propositional observations, and
   procedural/prescriptive lessons.
2. Attach every derived node to a stable source locator, source revision or
   digest, extraction record, and applicability scope. Retrieval should be able
   to move from a compact abstraction back to the exact source witness before
   the result affects a decision.
3. Compare direct source lookup with an abstraction-first, source-verifying
   retrieval path. The returned guidance must be short and actionable, but it
   must carry enough provenance for the receiver or reviewer to reject stale or
   conflicting inheritance.
4. Admit no semantic memory automatically. A Principal correction, accepted
   decision, verified task result, or explicit review may remain an ordinary
   source-owned event; any later promotion into a durable knowledge view stays
   a normal review/Task decision.
5. Start with an offline, read-only fixture or disposable index probe. Do not
   introduce a graph store, daemon, SQLite schema, automatic background writer,
   or memory-specific lifecycle until a measured retrieval failure justifies
   its maintenance and repair cost.

This is a candidate research direction, not an implementation authorization.
The likely value is not “remember everything”; it is reducing the amount of
raw trace a later Agent must inspect while preserving a reversible path to the
source and making unsupported inheritance visible.

## Strongest no-proposal case

No new principle and no immediate runtime subsystem are warranted. P09 already
governs attention-layer placement; P12 governs durable inheritance; P13 keeps
claims, verification, and acceptance separate; P14 keeps rebuildable indexes
and views from acquiring fact authority; and P15 favors the smallest effective
probe. The existing cognition-memory research and Observation Chronicle pilot
cover the same decision tensions with Rossovia-specific ownership and
correction boundaries.

PlugMem's semantic/procedural/episodic vocabulary could therefore remain a
project-local adapter vocabulary, or even be rejected if an offline probe shows
that source-native lookup plus existing skills has lower total reconstruction
cost. Its paper results do not establish transfer to Rossovia's task/workflow
records, provider traces, or observer reviews. A graph would add extraction,
conflict, privacy, update, and stale-applicability costs before it proves that
it changes a later decision correctly.

## Research-skill form audit — no-proposal

This inquiry also tests whether the repository needs a standalone generic
`research` Skill so that future references do not land in the wrong authority
layer. The strongest keep-as-is case wins for now:

- [`principle-cultivation`](../../skills/principle-cultivation/SKILL.md) already
  owns source-bound inquiry when a question could change the cross-context
  Principle Sequence. Its research/candidate/review gates and
  `principles/research/` path are intentionally narrower than project design
  research.
- [`form-guidance`](../../skills/form-guidance/SKILL.md) already decides
  whether a recurring need deserves a skill, decision record, runtime,
  projection, campaign, or no new form. It prevents “research” from becoming a
  catch-all artifact type.
- [`artifact-organization`](../../skills/artifact-organization/SKILL.md) owns
  source/authority/lifetime placement when a document is at risk of landing in
  the wrong carrier. Its audit is the right route for a path conflict.
- [`project-cognition`](../../skills/project-cognition/SKILL.md) covers a
  source-linked working model when the research must persist to support named
  later project decisions. [`context-engineering`](../../skills/context-engineering/SKILL.md)
  then owns how an accepted source or projection reaches an Agent.

The repository's [design map](../README.md) and [repository map](../../README.md)
already distinguish `design/research/` (architecture- and mechanism-level
inquiry) from `principles/research/` (possible Sequence-level inquiry). A new
generic Skill would repeat these routing decisions while risking a third
research authority. Keep the alternative as a future candidate only if real
work shows repeated misplacement after these routes are used, or if a distinct
source-first research action cannot be expressed by the existing owners.

**Disposition:** `no-proposal` for an independent research Skill.

**Replacement entry:** start with `form-guidance` when the needed form is
unclear; select `principle-cultivation` for a possible Sequence meaning; use
`artifact-organization` for placement/authority conflict; and use the owning
project design or `project-cognition` for project-level research. This note is
the PlugMem research record, not a new general research workflow.

## Next evidence

Keep the disposition `open` until a small research probe can answer:

- Can a fresh Agent recover the relevant source witness and reject a stale or
  contradictory abstraction more reliably than direct source lookup?
- Does the compact guidance reduce exposed tokens and human reconstruction time
  without increasing unsupported claims, wrong inherited actions, or review
  burden?
- Which evidence classes, if any, generalize across projects, and which must be
  isolated by project, repository, harness, provider, or user?
- Can the derived view be deleted and rebuilt from the current source records
  with no loss of authority, correction history, or acceptance standing?

The probe should report source coverage, provenance completeness, retrieval
latency, token cost, false carryover, stale-memory impact, repair effort, and
whether the result changed a later decision. Only after those observations
should a normal design decision consider an index or memory adapter.
