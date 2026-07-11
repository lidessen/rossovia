# Research — Principal Decision Briefs

**Disposition:** no-proposal
**Scope:** Determine whether repeated agent-to-human decision handoffs require a
new Sequence entry, a portable skill, or only a project-local decision-brief
protocol. The possible decision change is how a human receives a material
choice without reconstructing the agents' unresolved alternatives.
**Source limitations:** Current evidence is one project interaction and local
artifacts. It establishes a real expression failure here, not comparative proof
that every host or human needs the same presentation form.

> This record is cited, revisable research. It owns no P-ID, cannot redefine an
> interpretation, and does not propose a Sequence change by itself.

## Question

When agents prepare a material decision for a human, what minimum form lets the
human choose among real alternatives with their consequences, without turning a
recommendation into self-approval or adding a central planning layer?

## Distinctions

- A **Decision Brief** is a compact projection of a named source into options,
  recommendation, consequences, and reply keys. It is not the source of facts,
  a task queue, a vote, or an automatic default.
- A **Strategy Case**, Work Estimate, PR, or design decision retains evidence
  and durable rationale. It may contain a brief but is not replaced by it.
- A **bare approval request** asks the decider to reconstruct alternatives;
  a **false choice** invents options where evidence supports only one action or
  a bounded discovery probe.
- This inquiry does not assume that concise options are always better. A simple
  factual clarification, reversible local edit, or unready decision should not
  acquire a ceremonial option table.

## Evidence

The principal observed that a prior human gate named a needed selection without
presenting its choice set, forcing a follow-up question before a decision could
be made. The local [formal-operations entry](../../development-log/2026-07.md#2026-07-10---human-initiated-formal-operations-approved)
shows the system already separates agent execution from human-gated baseline
selection; the missing element was the human action surface, not a new holder
of authority.

The new local [Decision Brief protocol](../../design/operations/DECISION-BRIEF.md)
requires a recommendation, two to four consequential options, each option's
immediate authorized result, a tradeoff or reopening signal, and an explicit
reply key. Its boundary rejects simple clarifications, false options, silent
authorization, and pre-committed recommendations.

The same relation recurs, but with different durable sources: a
[Strategy Case](../../skills/strategic-advisory/references/strategy-case.md)
needs a direction/mission choice; a
[Work Estimate](../../skills/work-estimation/references/work-estimate.md) can
request an envelope or continuation; and a
[pull request](../../.github/PULL_REQUEST_TEMPLATE.md) needs a merge,
return-to-work, or hold disposition. A common presentation boundary can reduce
human reconstruction without merging their methods or authorities.

## Existing-sequence coverage

- **P10:** already treats human review capacity as scarce and requires the
  acceptance-relevant skeleton to be exposed; see its
  [expression probes](../interpretations/P10.md#expression-probes). A Decision
  Brief is one local expression of that review skeleton.
- **P11:** already separates proposal, verification, and commitment. The brief
  makes the Principal's choice legible but cannot convert an executor's
  recommendation into a decision; see [P11's boundary](../interpretations/P11.md#boundary-and-common-misreading).
- **P16:** already requires an action-facing form suitable for the actual
  practitioner. The Principal needs a choice surface, while an archive may need
  full rationale; see [P16's shared reading](../interpretations/P16.md#shared-reading).
- **P15:** already limits the brief to decision-changing options and permits a
  smallest discovery action when comparison is unresolved.
- **P12 / P14:** already require the named source to survive while preventing a
  convenient summary from becoming a second authority.

## Possible decision delta

Existing P-IDs justify the project-local protocol now. A later portable method
could teach an agent to decide when a brief is needed, distinguish real options
from false ones, compress evidence without hiding it, and choose an appropriate
human reply grammar across strategy, operations, incident, budget, permission,
and integration contexts.

That is not the same as a generic planning skill: its owner would be the
agent-to-human **decision handoff**, while each domain method still determines
the alternatives and evidence.

## Strongest no-proposal case

No new P-ID is warranted. The actionability problem is P16, the scarce-review
allocation is P10, authority separation is P11, and option parsimony/stopping
is P15. “Always present options” would be an overbroad rule and would violate
the same principles in one-option or one-off cases.

A new portable skill is also premature. The current protocol has one direct
interaction observation but no cross-host action probe showing that existing
domain methods and local instructions cannot produce the same result. Creating
a skill now would add distribution, lineage, snapshot, and trigger surface
before its distinct repeated agent judgment is evidenced.

## Disposition and next evidence

**Disposition:** `no-proposal`

Retain the local Decision Brief protocol and observe at least three materially
different gates: one strategic or naming choice, one resource/continuation or
permission choice, and one integration or incident disposition. For each,
compare whether the Principal can decide without reconstructing alternatives,
whether the brief preserves the named source and authority boundary, and
whether a nearby simple request correctly declines the form.

Reopen this inquiry for a portable-skill form only if those probes show a
repeated agent-facing judgment that is not adequately taught by the local
protocol or its existing domain methods. Reopen it for a Sequence candidate
only if a concrete decision remains ungoverned after P10/P11/P15/P16 have been
applied and a counterexample survives review.
