---
name: principle-cultivation
description: >-
  Steward a project's fallible principle lineage: preserve source-bound research,
  turn only gate-passing inquiries into candidates, convene selective P-ID
  reviews, clarify interpretations, trial human-nominated alternates, and
  prepare human-only Sequence decisions. Use for reusable-principle research,
  candidate proposals, principle reviews, interpretation drift, alternate trials,
  or maintaining a principle-centered skill collection.
---

# Principle Cultivation

## Principle expression

**Primary:** P03
**Supporting:** P04, P12, P15

## Principle source

Use a host Sequence and interpretations when the host declares them. Otherwise
use this package's read-only fallback in `references/sequence.md`. It
contains the full one-line Sequence and the readings for P03, P04, P12, and
P15, so this skill remains usable when installed alone. The fallback is a
versioned projection, not a source to edit from a target project.

## What this stewards

Treat `principles/SEQUENCE.md` as the only semantic source of core principles.
The repository does not own truth: practice and source material remain outside
it. It owns a compact, revisable lineage through which a later actor can recover
why a principle was researched, proposed, reviewed, adopted, clarified, or left
alone.

```text
source-bound research
        ↓ when the candidate gate has plausible evidence
candidate → selected review → human decision → Sequence → interpretation → expression
```

Research, candidates, adopted records, interpretations, and reviews are
derivatives. None may redefine the Sequence or gain authority merely by being
more detailed. A council or review member has an organizational role, not a
second doctrine.

Keep semantic admission, alternate participation, and standing-committee
membership separate. A human-nominated candidate can gather bounded work
evidence without becoming a P-ID, Primary, Supporting principle, current lead,
or review member.

## Commands

- `/principle-cultivation research <question|paths>` — create or update one
  cited inquiry in `principles/research/`; `no-proposal` is a valid result.
- `/principle-cultivation propose <research-note>` — apply the full candidate
  gate; create or update at most one linked candidate, never the Sequence.
- `/principle-cultivation extract <path...>` — deprecated compatibility path:
  research supplied evidence and create a candidate only when the same gate
  passes. Route open-ended inquiry to `research` instead.
- `/principle-cultivation review <candidate|sequence>` — select a temporary
  P-ID team, pressure-test the target, and write review evidence.
- `/principle-cultivation interpret <P-ID>` — create or revise one source-bound
  interpretation without changing the Sequence.
- `/principle-cultivation constitute` — run the exceptional founding review that
  nominates a standing committee; it never changes Sequence semantics itself.
- `/principle-cultivation nominate-alternate <candidate>` — prepare the separate
  human decision for a bounded trial; it never implies adoption.
- `/principle-cultivation trial <candidate> <task-or-path>` — add one nominated
  candidate as a separately labeled trial seat and retain comparison evidence.
- `/principle-cultivation adopt <candidate>` — prepare a human-approved sequence
  decision; append or revise a line only after explicit approval, then move its
  evidence to `principles/adopted/`.
- No argument — inspect the lineage's live research, candidates, interpretations,
  and pending decisions; report the next useful action without writing.

Read [references/source-citations.md](references/source-citations.md) whenever
writing a source-bearing artifact. Read
[references/research-template.md](references/research-template.md) for research,
[references/candidate-template.md](references/candidate-template.md) for a
proposal, [references/committee-protocol.md](references/committee-protocol.md)
and [references/committee-review-template.md](references/committee-review-template.md)
for review, and [references/interpretation-template.md](references/interpretation-template.md)
for an existing P-ID's reading.

## Route by artifact and authority

### Research

Use research when the user asks a durable question, supplies material worth
preserving, or needs to compare theory with project evidence. Do not save every
conversation: write `principles/research/<slug>.md` only on explicit durable
request or an immediate proposal/interpretation handoff.

1. State the question and the decision it might change; distinguish neighboring
   concepts before naming a principle.
2. Keep descriptive inline links beside evidence-dependent claims. Prefer direct
   public sources or artifacts the user placed in scope; link rather than copy
   sensitive or licensed material, and record a limitation when an anchor is
   mutable or local-only.
3. Check existing P-IDs without extending them. Record what each already covers,
   the possible remainder, and the strongest `no-proposal` conclusion.
4. Give the note one stable slug and exactly one disposition:
   `open`, `no-proposal`, `candidate:<slug>`, `interpretation:P<id>`, or
   `superseded:<slug>`. Update the same note on rerun; do not create duplicates.
5. A research note is revisable evidence. It cannot assign a P-ID, decide that a
   candidate is irreducible, or substitute for later candidate and review gates.

### Propose or extract

Use `propose` only from a research record. The legacy `extract` path performs
the same inquiry internally so existing callers retain its candidate-producing
behavior when the gate passes.

Before creating or updating a candidate, establish plausible evidence for every
gate:

- **Cross-context:** governs a class of choices, not one repository or anecdote.
- **Decision-changing:** names a future choice that changes.
- **Irreducible:** cannot be a straightforward combination of existing P-IDs.
- **Falsifiable in use:** has a counterexample, boundary, or failed expression.
- **Compact:** fits the one-line Sequence form without a hidden manual.
- **Admission cost:** earns permanent attention rather than merely describing a
  useful local mechanism.

If one gate is unresolved, keep the research `open` or `no-proposal`; never
invent a candidate merely to preserve an attractive phrase. If it passes, create
or update one `principles/candidates/<slug>.md`, link both artifacts, and leave
the Sequence unchanged.

### Interpret

Read the exact Sequence line first. A living interpretation may clarify shared
reading, decision questions, source fidelity, boundaries, and expression probes.
It must retain inline sources and stay character-for-character anchored to its
P-ID line. If clarification adds an irreducible decision consequence or a new
governing boundary, route to research and then proposal instead.

### Review and decide

The default is to retain the current Sequence. For an addition, revision,
retirement, or coherence check, follow `committee-protocol.md`:

1. Select 3–5 existing P-IDs by the present decision tension: lead, standing
   liaison, direct comparators, and a preservation seat. Do not summon all P-IDs.
2. Give each member the sequence, target, and evidence but not other reports.
   Require decision delta, overlap, boundary, unchanged alternative, and inline
   evidence. When delegation exists, assign independent agents; otherwise mark
   isolated passes self-reviewed.
3. Synthesize without counting votes. Preserve the Sequence unless recurrence,
   irreducibility, boundary, expression probes, and permanent attention cost all
   survive. Record dissent and the unchanged alternative.
4. Only the human may adopt, revise, retire, reject, nominate an alternate, or
   nominate standing members. Direct adoption remains valid but receives a
   retrospective review; the review never silently reverses it.

### Trial and reconcile

For a human-nominated alternate, keep the normal Sequence P-ID team intact and
add at most one separate trial seat. Before action, record baseline choice,
candidate delta, and a disconfirming observation. Afterward append a sourced
result—`strengthened`, `overlap`, `boundary failure`, or `failed`—and state
whether existing P-IDs already explain it. No trial authorizes an irreversible,
authority-changing, production, fact, or semantic action by itself.

After human adoption, update the Sequence, move evidence from candidates to
adopted, preserve stable IDs, and inspect only affected interpretations, skill
lineages, portable snapshots, and L1 projections. An adopted record is history,
not a second semantic source.

## Invariants

- `principles/SEQUENCE.md` is citation-free, one stable principle per line, and
  the sole semantic source.
- Research owns no P-ID or semantic authority. It has one stable slug and one
  declared disposition; candidates and reviews independently recheck its claims.
- Candidate records never gain semantic authority; `principles/candidates/`
  holds only pending or incubating records, and `principles/adopted/` holds
  adopted evidence.
- Every adopted P-ID has exactly one predictable interpretation path. It remains
  a revisable derivative and cannot redefine its source line.
- Principle IDs are stable and never reused. A new or changed line requires
  explicit human approval and a dated selected review, retrospectively if needed.
- A skill has exactly one Primary and at most three Supporting P-IDs. An alternate
  never enters lineage, leads work, sits on a sequence review, or enters a
  portable snapshot; one activation trials at most one alternate.
- Source-bearing artifacts use descriptive inline links at the claims they
  support. A bibliography may supplement but never replace claim-level evidence.
