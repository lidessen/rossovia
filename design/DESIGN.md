# Skills — Design

> A principle-centered collection in which a compact sequence governs the
> skills and project guidance that express it.

## Architecture

```
practice / inherited sources
        │
        ▼
principles/research/ ──► cited, non-authoritative inquiry
        │                        │
        │                        └──► no proposal is a valid disposition
        ▼
principles/candidates/ ──► selected review team ──► human decision
        │                                             │
        │                                             ▼
principles/SEQUENCE.md ──► interpretations ──► selected P-ID expressions
        │
        ├── skills/*/SKILL.md ─────────────► contextual expressions
        │
        └── CLAUDE.md / AGENTS.md ─────────► inlined L1 projections
                                                   │
                                             CLAUDE.md / AGENTS.md
```

## Modules

- **Principle sequence** — Owns the stable, one-line principle identifiers and
  names. Does not contain explanation, examples, workflows, or skill mappings.
- **Principle interpretations** — Own one mutable, source-bound reading per
  P-ID: its decision questions, boundaries, theoretical roots, and expression
  guidance. They clarify the sequence for agents but cannot add a decision
  meaning that the source line does not bear.
- **Principle cultivation** — Maintains the path from source-bound research to
  candidate proposal, selective review, human decision, interpretation, and
  downstream expression. It preserves lineage contracts but does not silently
  alter the sequence, source projects, or human authority.
- **Research records** — Hold cited inquiries in `principles/research/` before a
  P-ID-shaped proposal is warranted. They own no P-ID or semantic authority; a
  declared disposition records whether the inquiry remains open, needs no proposal,
  feeds one candidate, clarifies one existing P-ID, or has been superseded.
- **Candidate records** — Hold only pending or incubating proposals in
  `principles/candidates/`. They may be reviewed, rejected, revised, or
  human-nominated for bounded alternate trials without gaining semantic authority.
- **Adopted records** — Preserve the evidence and decision history of an
  accepted P-ID in `principles/adopted/`. They are historical derivatives, not
  alternate semantic sources.
- **Council topology** — Projects the sequence into a central committee, a
  human-approved standing committee, task-specific teams, and discoverable
  alternate candidates. It assigns organizational roles but never defines,
  explains, or ranks the sequence semantically.
- **Review records** — Preserve committee selection, independent reports, and
  synthesis as evidence. Do not interpret, extend, or supersede the sequence.
- **Skill corpus** — Owns context-specific methods and artifacts. Does not
  define a second principle system.
- **L1 projections** — Own the concise, tool-targeted expression of selected
  principles. Do not introduce or redefine sequence entries.
- **Portable sequence snapshots** — Let an independently installed
  sequence-dependent skill retain a versioned, read-only lineage baseline. A
  host source may govern its own task; an optional remote refresh is temporary
  and cannot mutate the packaged projection.
- **Work Cell runtime** — Owns one ephemeral practice unit and its evidence: a
  task-specific Sequence expression, isolated workspace tools, structured
  completion or differentiation, mechanical checks, trace/cost capture, and
  blinded baseline/treatment comparison. It can link executor-independent Work
  Estimates to executor/profile-specific observations and enforce a root token
  envelope across a sequential differentiation tree, returning `partial`
  evidence rather than silently expanding the limit. It is not a skill and has
  no semantic or adoption authority. Its project interaction shell discovers a host
  Sequence and lowers explicit human intent and acceptance into a read-only
  probe; it is a convenience projection, not a second runtime contract.
  For an approved material-decision pilot, its bounded `deliberate` CLI may run
  three to five independent read-only members from one docket and retain their
  structured positions. Its tally and dissent list are a projection, never a
  vote that accepts a proposal; see [decision 020](decisions/020-bounded-work-cell-deliberation.md).
  Its project-facing `deliberate-probe` adapter lowers a concise docket into a
  capped evidence packet and exact manifest for human inspection before a model
  call; see [decision 022](decisions/022-project-first-deliberation-interaction.md).

## Data Flow

```
project history / observed work
        │
        ▼
source-bound research ──► open | no-proposal | candidate | interpretation | superseded
                                      │
                                      ▼ when all candidate gates have evidence
                               candidate ──► temporary review team
                                                      │
                                                      ▼
                                               review evidence
                                                      │
                                  ┌───────────────────┴───────────────────┐
                                  ▼                                       ▼
                      human alternate nomination                 human adoption
                                  │                           ┌─────────────┴─────────────┐
                                  ▼                           ▼                           ▼
                 bounded trial + candidate evidence   Principle Sequence   adopted evidence
                                  │                           │
                                  └──────► next review        ├──► interpretations
                                                              └──► skill / L1 expressions
```

The downward lineage path is paired with an empirical return path:

```text
Sequence + selected interpretations + optional candidate treatment
                              │
                              ▼
                     ephemeral Work Cell
                              │
              artifact + evidence + checks + trace
                              │
                              ▼
             blinded comparison / accepted evaluation
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
       revise skill expression       candidate trial evidence
                                           │
                                           └──► later human review
```

The Work Cell does not close its own loop. Environment checks settle only the
declared mechanical result; a separate evaluator or human accepts the semantic
comparison. Failed and overlapping runs return evidence rather than being
discarded.

## Key Mechanisms

- **Source / expression separation** — The sequence is semantic source; a
  skill's loop, gates, and artifacts are its expression. Derived text must not
  become an alternative source.
- **Inline evidence edges** — Source-bearing derivatives such as research,
  interpretations, proposals, candidates, and reviews keep descriptive Markdown
  links on the claims they support. This lets a later reader reopen the evidence
  without turning a detached bibliography into a second source of meaning.
- **Living interpretation** — `interpretations/P<id>.md` gives agents a shared,
  revisable reading of one sequence entry. It is loaded only for selected P-IDs.
  A clarification may update the interpretation; a new decision consequence,
  irreducible boundary, or new principle must re-enter candidate cultivation.
- **Naming and articulation** — A shared name is a revisable handle for a
  decision-changing relation, not an essence or second source. Its operative
  definition belongs with the source that owns the affected decision; reader
  explanations and indexes are linked projections. The method must also decline
  terms that do not change action or recovery; see
  [decision 013](decisions/013-naming-and-articulation.md).
- **Work estimation and calibrated budgeting** — Work is a source-bound graph
  of necessary state transitions and discovery branches, separate from the
  executor-specific projection and human-approved hard envelope. Granularity
  and tolerances follow the decision horizon; calibration views are rebuildable
  projections of observed execution, never budget authority. See
  [decision 014](decisions/014-work-estimation-and-calibrated-budgeting.md).
- **Event-triggered reflection sidecar** — A decision-changing anomaly becomes
  a Chronicle observation and may route, at a main-task safe point, to one
  existing corrective owner. It is not a default reflection skill, scheduled
  agent, automatic retry, or authority to change the project; see
  [decision 019](decisions/019-event-triggered-reflection-sidecar.md).
- **Stable selection** — Every methodology skill names one primary sequence ID
  and at most three supporting IDs. A changed selection is a shape change to
  that skill.
- **Optional invocation** — Skills are contextual expressions, not a mandatory
  pipeline. `attention-driven` is an optional lens for attention-allocation
  problems and is never a universal preflight.
- **Research before proposal** — Research is a cited, revisable evidence layer;
  it may conclude that no proposal is warranted. Only a research record with
  plausible evidence for every candidate gate may create or update one candidate.
- **Cultivation gate** — A candidate may enter selective review, but only a
  human decision adds or materially revises a sequence item.
- **Orthogonal alternate nomination** — A human may nominate a reviewed
  candidate for bounded work trials without adopting it. The normal P-ID team
  remains authoritative; at most one alternate appears as a separately labeled
  hypothesis and returns comparison evidence to its candidate record.
- **Lifecycle separation** — Pending candidates and adopted evidence live in
  different directories. A status change to adopted moves the record rather than
  leaving a historical decision in the active proposal queue.
- **Principle organization** — The sequence is the central committee; all
  entries retain equal semantic authority. A compact, human-approved standing
  committee keeps the general line. A skill is a durable working team: its
  Primary P-ID is its stable lineage and its Supporting P-IDs are its habitual
  members. Each activation still selects one current lead for its principal
  contradiction; it may differ from the skill's lineage. A review forms a
  temporary version of that team.
- **Bounded adaptive organization** — The organization operating model verified
  for human approval selects a temporary formation of existing roles from observed disturbances.
  It makes activation, handoff, verifier/committer, and reopening observations
  explicit, but never becomes a mandatory pipeline, central planner, or second
  semantic source. See [decision 012](decisions/012-bounded-adaptive-organization.md).
- **Task-specific review team** — Select 3–5 temporary P-ID seats by role: a
  standing liaison, direct comparators for the present contradiction, and a
  preservation seat that argues the strongest unchanged-sequence alternative.
  P01, P10, and P15 are common sources for preservation, but none is a permanent
  veto. The team is evidence, never a vote or a second source of doctrine.
- **Default preservation** — A candidate must justify why the unchanged
  sequence is insufficient. If recurrence, irreducibility, boundary, or
  expression probes remain unresolved, retain the sequence and keep the record
  pending or reject it.
- **Downstream reconciliation** — An adopted sequence change triggers review of
  affected skill selections and L1 projections; unrelated skills remain intact.

## Key Decisions

- **One-line source over explanatory canon** — `principles/SEQUENCE.md` was
  chosen over expanding cross-cutting guidance. Explanation belongs in a
  source-bound interpretation, context-specific expression, or candidate record.
- **Research before doctrine** — A dedicated skill preserves source-bound
  inquiries before proposing changes to the sequence. A fixed list would freeze,
  while direct extraction would turn every observation into active doctrine.
- **Human adoption over automatic extraction** — Pattern recognition can
  propose a principle but cannot decide that it governs all future skills.
- **Trial before admission without shadow doctrine** — A promising candidate
  may earn evidence through human-nominated alternate participation while
  remaining outside skill lineage, review-team seats, and portable snapshots.
- **Formation over universal council** — Every principle need not attend every
  review. Selection is recorded with reasons so a task-specific team remains a
  focused collision of relevant constraints rather than a ritual parliament.

## Constraints

- Sequence IDs are stable; never reuse an ID after removal or replacement.
- A sequence item must be one line, cross-context, and decision-changing.
- Every sequence P-ID has exactly one predictable interpretation path,
  `principles/interpretations/P<id>.md`. Interpretations read their source line
  first, remain revisionable, and never acquire source authority.
- A skill has exactly one primary principle and no more than three supporting
  principles.
- A nominated alternate never occupies a skill's Primary/Supporting lineage or
  a sequence review seat; one work activation trials at most one alternate.
- A sequence addition, revision, or retirement has a dated review record that
  names the team lead, standing liaison, comparators, preservation seat, and
  their selection reasons. Direct human approval may precede it, but still
  receives a retrospective review record.
- Council topology and team reports are governance and evidence only. They never
  gain authority to modify the sequence or become a persistent explanatory canon.
- A research record has one stable slug and one disposition from `open`,
  `no-proposal`, `candidate:<slug>`, `interpretation:P<id>`, or
  `superseded:<slug>`. It is revisable evidence, not a source of semantic
  authority; candidate and review gates recheck its claims.
- Research, interpretations, proposals, candidates, and reviews retain readable
  inline links to direct sources or stable artifact anchors. The sequence itself
  remains citation-free.

## Artifact organization

The carrier is organized as a **根据地** (base area), not a folder tree to tidy.

| Layer | Role in this collection |
|---|---|
| 纲领 / semantic source | `principles/SEQUENCE.md`, adopted `design/decisions/` |
| 根据地章程 | `design/DESIGN.md` (+ adopted organization section) |
| 常备制度 / durable evidence | `principles/adopted/`, `principles/reviews/`, `regeneration/evaluations/` |
| 运行连续性 / active operational source | `operations/missions/*.json` — one Git-tracked, active mission record; settled state is retained in Git history then pruned |
| 专业工作队 / living expression | `skills/*/`, `principles/interpretations/` |
| 领导班子 | Human adoption authority; `COUNCIL.md` as governance projection only |
| 活动 / sessions | `design/organization/*` — campaign artifacts, not top-level modules |
| 通报 / projection | Sequence snapshots, symlinked skill paths, inlined L1 markers |

**活动架构:** an organization campaign begins with a read-only
`artifact-organization audit` and runs one `transition` only for a material
gap. Durable coordination uses one campaign record; settlement promotes stable
organization into design and archives or discards the record instead of leaving
a permanent headquarters.

`artifact-organization` owns base layout and activity rules; 整理 is a derived
campaign, not a peer institution.

## Organization operating model

The collection's organization is a bounded adaptive system, not a permanent
agent hierarchy. Its slow constraints, activated methods, practice evidence,
and human commitments have distinct lifetimes and authorities:

```text
Sequence + accepted design → organization contract → conditional skill formation
        ↑                                                    ↓
human approval ← reviewed evidence / durable record ← Work Cell or campaign
```

The verified-for-approval contract is [decision 012](decisions/012-bounded-adaptive-organization.md):
it specifies which evidence activates each standing role, what its output must
carry, where it routes, and which commitments it cannot make. It has three
operating movements:

1. **Sense** a traceable disturbance in evidence, handoff, context, authority,
   or a settled phase; a self-report alone is not a signal.
2. **Form** only the temporary team needed by the present contradiction; no
   skill is a universal preflight and no formation may self-commit.
3. **Settle or adapt** through the role that owns the gap. A durable role,
   source, or authority change requires reviewable evidence and human approval;
   it is never an automatic organizational mutation.

`artifact-organization` remains the carrier-layout specialist in this model.
It can audit where the contract and its evidence live, but it does not run the
formation, select strategic content, or act as an organization runtime.

## Human-initiated formal operations

The collection's formal operating mode begins with a human-authorized agent
session, not a permanent controller. The agent reads the harness and only the
methods relevant to the concrete mandate, then forms a temporary team whose
planning, execution, verification, integration, and correction seats remain
separate. [`decision 015`](decisions/015-human-initiated-formal-operations.md)
defines the preparation protocol: isolated Git worktrees and branches carry
bounded missions; pull requests retain proposed integration and mechanical
checks; only a named human decides durable approval and merge.

Schedules, GitHub Issues, comments, and other events may later be designed as
non-authoritative intake adapters. They cannot turn into a task queue, approve
resources, accept a result, or mutate `main` merely by triggering an agent.
The first formalization is a finite founding campaign, so the present
uncommitted transition is divided into reviewable baseline tranches rather than
silently treated as a release.

For a material mission that forks across sessions, a Git-tracked Mission Record
holds only the current mainline, open branches, and their return contracts. It
does not duplicate Git/PR history or Chronicle observations, and it is pruned
after its settled state is committed. [`decision 021`](decisions/021-git-tracked-mission-continuity.md)
defines the boundary and local validation surface.

## Founding mandate

[`FOUNDING-MANDATE.md`](FOUNDING-MANDATE.md) records the human-given purpose
that directs this project: make productive AI capability a broadly accessible,
open, replaceable common capability, and prove economical open arrangements on
bounded production work. Its liberation and non-exploitation boundary requires
that this capability not become an opaque mechanism for extracting from people,
communities, AI systems, or other living conditions. It is the long-direction
input for Strategy Cases, not a second semantic root, a promise of universal
model parity, or authority to commit a mission or budget.

## Aesthetic practice pilot

The [aesthetic practice pilot](decisions/017-aesthetic-practice-pilot.md)
adapts mature design-system, editorial, art-direction, and contribution forms
to make the mandate perceptible in real documents, UI, and visual work. Its
seed, cases, studies, directions, and attributed references live in
[`design/aesthetics/`](aesthetics/README.md). This is an evidence-led cultural
practice, not a static brand manual, a propaganda authority, or a replacement
for human review and actual user context.

## Non-goals

- A comprehensive philosophy textbook or quotation archive.
- A registry of every local practice, implementation detail, or preference.
- A mandatory research note for every question, or automatic promotion from
  research to doctrine.
- Automatic propagation of a new principle into every skill.
