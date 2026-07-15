# 020 — Bounded Work Cell Deliberation

**Status:** implemented and verified
**Date:** 2026-07-11
**Approved by:** principal

## Context

A material project decision can lose a relevant perspective when one agent
prepares the whole recommendation. The project needs a way to collect
independent, source-bound positions and preserve dissent without creating a
resident parliament, autonomous agent queue, or machine authority to approve a
proposal. Existing [Work Cell](../../packages/work-cell/README.md) evidence is
bounded and structured, but has no cell-to-cell messaging or deliberation
carrier. The existing [Decision Brief](../operations/DECISION-BRIEF.md) shows
the Principal options, but does not itself produce independent views.

## Decision

Add a limited `deliberate <manifest.json>` Work Cell CLI capability. A manifest
names one proposal docket, two to four real options, source locators, three to
five members, a status for every P-ID in the shared Sequence, and a
human-authorized allocation envelope. The sum of declared member caps may not
exceed that envelope. Each member
runs as a fresh read-only, command-free Work Cell and does not receive any
other member's result.

The CLI differentiates generic Cells by adding docket/member instructions to
their normal prompt surface. It asks every AI-driven member to return one
adapter-defined structured position in the generic Cell result carrier:

```text
support | oppose | reserve | discover
decision delta + strongest counterargument + unchanged alternative
```

The runtime retains the individual Cell records and emits a vote-and-dissent
**projection**. A count may expose agreement, disagreement, abstention, or
missing positions; it has no acceptance, budget, semantic, merge, or routing
authority. A split, missing position, failed check, or non-passing member
remains visibly unsettled rather than becoming a silent majority.

Every invocation uses a distinct retained output path. Before each later member
starts, the adapter subtracts observed prior use from the approved allocation;
if the remaining allocation cannot fund the member's declared cap, it records
that member as not run. A provider may still report a post-hoc overrun for one
already-started request, so the record exposes it and the adapter never retries
or expands the envelope automatically.

```text
proposal docket → independent member Cells → retained positions
                                      ↓
                      tally / dissent projection → verifier → Principal brief
```

This is sequential evidence transport, not Cell-to-Cell messaging, a voting
engine, a consensus algorithm, or a standing committee.

## Generic-core promotion gate

The Work Cell core owns only cross-context execution invariants. `CellInput`,
`CellSubmission`, the driver, and `runCell` must not acquire proposal roles,
vote labels, committee doctrine, or any other vocabulary specific to this
pilot. The adapter depends on the core; the core never imports the adapter.

A later request to promote an adapter mechanism into the core must show that it
serves at least two independent adapters and must retain an action, boundary,
and context-path probe. The proposed core field must describe a generic runtime
capability, not a convenient encoding of a single domain process. Human review
decides promotion. Until then, prompts, selected skills, tools, and adapter
schemas carry specialization at the edge.

## Boundary

- Invoke it only for an irreversible, high-cost, safety-relevant, semantic, or
  cross-boundary decision that has at least two consequential options.
- Do not invoke it for routine implementation, reversible local edits, or a
  factual check that an independent verifier already owns.
- Do not select one member per P-ID. The coverage declaration prevents silent
  omission; only three to five P-IDs with a decision delta become seats.
- The principal remains the only authority for durable commitment. The
  committee, member Cells, verifier, and summary cannot vote a fact into
  existence.
- The CLI does not grant write tools, commands, cell messaging, a scheduler,
  an independent budget increase, or any new automatic trigger. It only enforces
  the human-supplied allocation envelope; it does not forecast price or approve
  spend.

## Sequence expression

- **P04 / P05:** form only the perspectives that change this concrete decision.
- **P11 / P13:** execution, opinion, verification, and commitment remain
  separate; vote count is not acceptance.
- **P12 / P14:** individual records preserve recoverable reasoning; the tally
  is a projection, not a new source of truth.
- **P15 / P16:** add one bounded CLI surface that lets a major-decision
  practitioner obtain independent views without a general-purpose agent
  parliament.

## Acceptance

- A docket cannot silently omit a current P-ID, duplicate a member, or use more
  than five or fewer than three members.
- Members cannot receive write or command authority through the deliberation
  CLI, and do not see one another's results.
- A summary retains every declared position, dissent, and unsettled member;
  it cannot declare a proposal accepted.
- Deterministic tests cover a dissenting minority, omitted Sequence coverage,
  and attempted capability expansion.

## Disconfirming observation

Reopen this pilot if two real major-decision runs produce no decision-changing
view beyond an ordinary independent review, if independent members still
collapse into prompt-shaped repetition, or if a necessary cross-examination
requires more than sequential evidence transport. The first two observations
argue for retaining ordinary review; the last may justify a later form decision
for a distinct deliberation carrier.
