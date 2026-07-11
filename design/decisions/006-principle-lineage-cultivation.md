# Separate Principle Research from Lineage Change

**Status:** adopted
**Date:** 2026-07-10

## Context

`principle-cultivation` currently sends `/extract` directly from evidence to a
candidate. That merges inquiry with a proposal to change the Sequence,
encourages candidate inflation, and leaves durable research nowhere to live when
it discovers useful distinctions but no new principle. The divide-and-conquer
question is the immediate case: historical and algorithmic evidence deserves
source-bound comparison before anyone decides whether it deserves P22.

## Recommendation

Add one missing state to the existing lineage and regenerate the skill around
that complete flow:

```text
practice / inherited sources
          ↓
source-bound research ──► no proposal is a valid disposition
          ↓ when all candidate gates have plausible evidence
candidate proposal ──► review team ──► human decision
                                      ↓
Sequence ──► interpretation ──► skill / workflow expressions
```

- Add `principles/research/<slug>.md` for a cited inquiry that owns no P-ID and
  has no semantic authority. Write one only when the user requests durable
  research or when it will immediately feed a proposal or interpretation;
  otherwise answer in conversation.
- Give each note one stable slug and a disposition:
  `open | no-proposal | candidate:<slug> | interpretation:P<id> |
  superseded:<slug>`. Re-running research updates that note rather than creating
  a duplicate. Research claims remain revisable evidence; candidates and reviews
  must perform their own Sequence-overlap and boundary checks.
- Add `/research <question|paths>` and `/propose <research-note>`. `propose`
  creates or updates one existing candidate record only when cross-context,
  decision delta, irreducibility, falsifiability, compactness, and admission cost
  each have plausible evidence; otherwise it records `no-proposal` or leaves the
  inquiry `open`.
- Keep `/extract` as a deprecated compatibility path with its existing output
  contract: it performs research and, when the same gate passes, creates a
  candidate. New guidance routes open-ended inquiry through `/research`; removal
  or semantic change to `/extract` requires a later decision.
- Preserve stable P-IDs, one interpretation path per adopted P-ID, selected
  review and retrospective review, human-only Sequence change, candidate/adopted
  directory separation, alternate-seat restrictions, skill lineage cardinality,
  portable-snapshot precedence, and source-linked downstream reconciliation.
  The first slice adds no lineage-audit command and changes no adoption
  transaction.
- Research may cite public sources and material the user placed in scope. It
  links rather than copies sensitive or licensed source content, retains exact
  local anchors when no durable URL exists, and records source limitations.
- Update `design/DESIGN.md`, README/L1 command guidance, the skill, and its
  self-contained templates together. The Sequence remains citation-free.

Implementation is accepted only when forward probes show: research can end
without a candidate; repeated `propose` resolves to one linked candidate;
legacy `extract` retains candidate-producing behavior; existing interpretation,
review, alternate, direct-adoption/retrospective-review, and portable-source
boundaries remain; and a citation request aimed at the Sequence is routed to a
source-bearing derivative.

This is “维护道统” only as lineage stewardship: reality and practice remain
outside the repository; the Sequence is a compact, revisable inheritance, not
truth owned by the maintainer.

## Alternatives seriously considered

**Incrementally add two commands without recomposing the skill.** Strongest when
prompt churn is the dominant risk. It leaves the main workflow assuming that
grounded inquiry normally ends in candidacy, so the new state remains secondary.

**Keep research inside candidate files.** Strongest for a very small corpus with
almost no rejected inquiries. It makes assigning a P-ID-shaped proposal the
price of preserving research and continues to inflate the active proposal queue.

**Split research and review into separate skills.** Strongest when each has
independent users and large protocols. Here both act on one small authority
graph; separate triggers would duplicate source resolution and boundaries.

**Keep the current shape.** Strongest if every durable inquiry is already an
admission proposal. The divide-and-conquer case demonstrates the contrary but
does not justify broader audit or registry machinery.

## Pre-mortem

A year later, `principles/research/` is a graveyard and every conversation
creates a ceremonial note. The failed assumption was that future utility could
be predicted. The first slice therefore admits a note only on explicit durable
request or an immediate proposal/interpretation handoff, requires a disposition,
and adds no automatic promotion, generic practice registry, retention daemon,
or semantic audit.

## Cold review

- **Completeness — transition and replay:** the first draft did not define
  identity, reruns, partial adoption, or migration. **Fixed:** research uses a
  stable slug and disposition; `propose` updates one linked candidate; the slice
  does not change the existing adoption transaction. Acceptance probes cover
  repeated proposal and the retained adoption boundaries.
- **Completeness — incomplete seed:** the first seed omitted stable IDs,
  interpretation cardinality, retrospective review, alternates, lineage limits,
  and snapshots. **Fixed:** all are now named as retained contracts and included
  in parity probes.
- **Completeness — audit and source boundary:** the proposed audit omitted many
  lineage failures, while research ingestion ignored privacy and licensing.
  **Fixed:** lineage audit is removed from this slice; scoped/public source,
  link-not-copy, anchor, and limitation boundaries are explicit.
- **Completeness — human authority:** the reviewer asked for authentication and
  conflict handling. **Defended:** this repository records an explicit human
  decision in files; it is not an online multi-principal authorization system.
  The proposal neither weakens nor expands that existing boundary.
- **Consistency — `/extract` and retrospective review:** the first alias silently
  changed output and the diagram implied review must precede adoption. **Fixed:**
  `extract` preserves candidate-producing behavior, and existing direct adoption
  plus retrospective review is explicitly retained.
- **Consistency — shadow authority and terminology:** research could become a
  practical interpretation layer, while “proposal” and “candidate” were
  ambiguous. **Fixed:** research is revisable evidence independently rechecked by
  later gates; “candidate proposal” is the existing candidate record, not a new
  artifact type.
- **Consistency — stale architecture:** the first draft omitted DESIGN updates.
  **Fixed:** DESIGN, L1/README, skill, and templates are one implementation unit.
- **Clarity — gate, disposition, regeneration:** “survives” and “plausible” were
  underspecified, dispositions had no vocabulary, and regeneration had no parity
  boundary. **Fixed:** all six existing gates, a closed disposition vocabulary,
  idempotent linkage, and action/boundary parity probes are specified.
- **Scope — four risk surfaces and ecosystem audit:** the first proposal bundled
  research storage, breaking command semantics, semantic audit, and regeneration
  while overstating repository visibility. **Fixed:** only the research/proposal
  state separation remains; no ecosystem or lineage-audit claim is made.
- **Scope — doctrinal centralization and scale:** “steward” could decide what is
  worth remembering, and audit cost was unbounded. **Fixed:** durable creation is
  limited to explicit request or immediate handoff; research cannot promote
  itself; the removed audit has no scaling claim.
- **YAGNI — one inquiry and a predicted graveyard:** one case did not justify all
  proposed machinery, and “will inform later” was not falsifiable. **Fixed:** the
  first slice adds only the missing state and two commands, with a concrete
  admission condition and no audit, daemon, or general practice registry.

## Outcome

Approved by the human on 2026-07-10. `design/DESIGN.md` now adds the
source-bound research layer and its no-authority boundary. The implementation
regenerates `principle-cultivation`, preserves legacy `extract` behavior, and
uses the human-nominated P20 only as a separately recorded alternate trial.
