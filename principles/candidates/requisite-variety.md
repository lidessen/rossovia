# Candidate — Requisite Variety

**Status:** candidate
**Observed in:** cybernetics, acceptance systems, agent-system design

## Candidate sequence line

P18｜控制者的有效多样性不得低于被控扰动的必要多样性｜控制论 / 必要多样性

## Recurrence

- W. Ross Ashby, *An Introduction to Cybernetics* (1956), derives the Law of
  Requisite Variety: a regulator can reduce disturbance variety only through
  corresponding variety in its available responses.
- `agent-worker/design/DESIGN.md:3-12, 63-71` distinguishes claim, evidence,
  contract settlement, fact, and projection rather than allowing one worker
  report to control every transition.
- `chiling/DESIGN.md:334-340` keeps validated patches at the control boundary;
  a small control surface still has to distinguish a proposed change from a
  validated one.

## Decision consequence

When simplifying a controller, skill, review team, or architecture, enumerate
the disturbances or state distinctions that demand different responses. Collapse
only distinctions whose response, acceptance, and recovery path are genuinely
the same; otherwise retain enough variety to control the object.

## Existing-sequence check

P15 requires preserving hard constraints but does not identify the minimum
response variety those constraints need. P11 separates decision from execution,
but only at an authority boundary. P18 supplies the adequacy test for a
controller’s own complexity.

## Counterexample / boundary

Necessary variety does not require one component, agent, or rule per event. A
general mechanism may cover many cases when it can actually distinguish and
respond to the differences that matter. This candidate sets a lower bound, not
permission for uncontrolled growth.

## Expression probes

- Review formation: use a small team, but test whether its existing control path
  can represent, verify, and respond to every unresolved material tension.
- Simplification: merge two workflow states only after showing that their valid
  response and acceptance behavior is identical.

## Committee review

See [`2026-07-09-scale-control.md`](../reviews/2026-07-09-scale-control.md).

## Human decision

pending — incubation requires repeated cases where existing authority,
fact-admission, source-authority, and minimum-transition checks all hold but the
controller still lacks a necessary distinguish-and-respond capability.
