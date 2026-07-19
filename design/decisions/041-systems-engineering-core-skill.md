# 041 — Systems Engineering as the Whole-System Reliability Method

**Status:** first slice implemented; behavioral claims provisional

**Date:** 2026-07-19

**Authorized by:** principal

## Concrete pressure

`task-shaping` now judges whether one consequential task fits a conservative
Agent execution profile and can transform it without losing global obligations.
That does not answer the larger engineering question: which tasks, checks,
authorities, recovery paths, and resource margins should exist so a complete
workflow remains useful when its human and Agent parts make mistakes.

Recent Swarm cognition and review probes made the distinction concrete. A Work
Cell can settle its protocol while making a semantic error. Review Cells can
produce false positives, and a verifier can miss an explicit contradiction
despite receiving the evidence. Repetition can increase coverage but may repeat
correlated error. A later source or host check can still filter noise and admit
a real defect. The relevant outcome is therefore neither perfect Cells nor zero
review noise; it is whether the end-to-end system detects, contains, recovers
from, or explicitly accepts material failure at a justified cost.

The principal's engineering position is accepted as the concrete need: real
systems pursue workable approximations. People and models cannot be made
infallible. Stable bounded work, extra budget, repeated labor, quality control,
recovery, and human settlement can make the whole approach reliable behavior.
The controls remain proportional to consequence rather than forming a universal
precision bureaucracy.

## Source-bound theoretical result

The retained [engineering-reliability research](../../principles/research/engineering-reliability-from-fallible-components.md)
finds a close technical-science precedent in Qian Xuesen's *Engineering
Cybernetics*. The 1954 preface abstracts common design principles from different
controlled and guided engineering practices while leaving concrete component
construction to those practices. Later historical evidence records the
explicit idea of forming highly reliable systems from incompletely reliable
components.

This project adopts that relation, not a literal control-theory vocabulary for
every task. Agent review, Swarm composition, human settlement, resource audit,
and organizational authority are downstream engineering adaptations. The
research concludes `no-proposal`: P03, P04, P13, and P15 already support the
needed judgment.

## Form and name

Create an independently installable high-freedom Skill named
`systems-engineering`. Its operative definition is:

> Under actual goals, operating conditions, failure consequences, and accepted
> residual risk, compose and revise fallible parts so material error becomes
> observable, bounded, correctable, or explicitly accepted and the whole
> behaves reliably enough to use and maintain.

The name uses the established engineering domain rather than inventing a
project-local term. `reliability-engineering` was rejected because the method
also owns authority, feedback, recovery, and whole-system trade-offs rather
than only component reliability. `engineering-control` was rejected because it
suggests a control-system implementation or runtime. `engineering-judgment`
was rejected as too broad to distinguish the system relation from ordinary
development discipline.

The smallest truthful implementation is a Skill with conditional concepts and
evaluation references. It requires no runtime code and no mandatory artifact.
When consequence or handoff warrants one, it may produce a compact System Case;
otherwise a direct explanation or one changed boundary is sufficient.

## Expression team

- **Primary P03:** the system becomes knowable through operation, observation,
  reflection, and changed operation rather than through design claims alone.
- **Supporting P04:** identify the principal material failure or missing control
  relation instead of treating every possible error with equal machinery.
- **Supporting P13:** worker reports, reviewer opinions, tests, and terminal
  success remain claims until traceable verification and settlement.
- **Supporting P15:** select only the minimum control structure that changes the
  reliability contradiction while preserving consequence, authority, and
  recovery constraints.

The current task lead is P04 because the immediate architectural error is local
task optimization without an owner for the whole-system control gap. No new
Sequence line is proposed.

## Ownership boundary

| Concern | Owner |
|---|---|
| sufficient whole-system behavior under representative disturbance | `systems-engineering` |
| one task relative to an evidenced Agent execution envelope | `task-shaping` |
| reusable model/provider/harness capability evidence | `model-evaluation` |
| domain-specific semantic partition and acceptance | owning domain Skill and designated verifier |
| information delivery to a prepared unit | `context-engineering` |
| necessary work and resource conversion | `work-estimation` |
| execution queue, concurrency, provider, retries, and persistence | Work Cell or orchestration runtime |
| fact admission, effect commitment, and residual-risk acceptance | designated verifier and human or host authority |
| next bounded test after operation | `practice-cycle` |

`systems-engineering` may require a contribution whose local form is handed to
`task-shaping`; it does not shape all tasks itself. It may recommend independent
verification or redundancy; it does not create domain review packets or launch
a Swarm. It may define why recovery is required; the runtime owns how prepared
retries and queues execute.

## Engineering method

The first slice retains only the decision-changing control skeleton:

1. desired whole behavior, operating range, consequence, and residual risk;
2. actual source-to-effect-to-acceptance path;
3. disturbances and the principal failure/control gap;
4. observable signal;
5. authorized response and recovery;
6. minimum sufficient prevention, detection, containment, recovery, redundancy,
   or resource margin;
7. component contributions handed to local owners;
8. operation evidence, estimate audit, and reopening condition.

There are no universal assurance levels or required stages. Redundancy must
interrupt a named failure path and be independent enough to reveal correlated
error. Voting cannot settle facts. A human acceptance surface should compress
evidence to fit human bandwidth without hiding the material decision, sources,
uncertainty, or residual risk.

The method distinguishes a required control property from its concrete
representation. It may require whole-source verification before a global claim
is accepted, but it cannot thereby add a specialized field to Work Cell's
generic terminal contract. It may require staged, recoverable effects, but it
cannot invent rollout percentages, time margins, or monitoring windows without
domain evidence and owner authority. Resource estimate variance is a post-run
learning signal by default, not authority for a routine runtime stop.

## First-slice acceptance

The Skill passes structural acceptance when it:

1. remains under the repository's prompt-size boundary and carries a generated
   standalone Sequence snapshot;
2. selects P03 as Primary with P04, P13, and P15 as Supporting;
3. keeps its domain distinct from `task-shaping`, `model-evaluation`,
   `work-estimation`, orchestration runtime, and human acceptance;
4. treats perfect reliability as an invalid specification and requires an
   explicit operating range and residual risk;
5. makes controls proportional and optional rather than a fixed pipeline; and
6. includes source-bound concepts and a matched evaluation method.

Behavioral acceptance requires at least three contrasted cases:

- a low-consequence reversible task where the Skill declines extra machinery;
- a material Agent workflow failure where it identifies a whole-system control
  gap before shaping local units; and
- a high-consequence case where it justifies independent verification,
  containment, recovery, and explicit acceptance without treating reviewer
  count as truth.

The first behavioral probe should use an economical Flash-class profile. It may
support the prompt's boundary and decision effects; it cannot establish
universal system reliability.

## First-slice evidence

The [contrasted behavioral probe](../../regeneration/evaluations/2026-07-19-systems-engineering-first-slice.md)
supported the form boundary: all three simple-case runs retained the existing
CI/Git correction path, while review and migration cases identified the
relevant whole-system gaps without adding reviewers or claiming perfect Cells.

It also disconfirmed consequential direct settlement. DeepSeek V4 Flash
repeatedly invented plausible thresholds, durations, samples, mechanisms, and
roles, then sometimes claimed its own result contained no such invention. A
narrow independent specificity verifier caught the decision-changing errors.
Giving that verifier the accepted candidate rather than full run records cut
total usage from 109,694 to 58,054 tokens and removed rejected-call
contamination. The supported reference form is therefore candidate plus compact
claim/source verification plus host settlement; the verifier itself remains
fallible and non-authoritative.

## Reopening conditions

Reopen the form if it becomes generic architecture or planning, a mandatory
workflow, a runtime schema, a fixed assurance ladder, a synonym for “more
review,” or an owner of domain truth. Reopen the lineage if faithful use of its
P-ID team repeatedly leaves whole-system observability, recovery, or
residual-risk authority unaddressed. Reopen the name if users consistently
expect software architecture or control-theory implementation rather than the
operative system-reliability judgment.
