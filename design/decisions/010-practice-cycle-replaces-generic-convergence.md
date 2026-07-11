# 010 — Practice Cycle Replaces Generic Convergence

**Status:** accepted for implementation
**Date:** 2026-07-10

## Context

The installed `task-convergence` supplies a generic
design–implement–verify–feedback loop. Its useful function is not universal
planning; it is ensuring that observed work can change the next judgment.
[`disciplined-development`](../../skills/disciplined-development/SKILL.md) is
the closer existing expression: it already grounds work in evidence, names a
concrete contradiction, selects a minimum transition, and requires falsifiable
verification. What it intentionally does not own is the conditional handoff
from one observed practice to the next.

## Decision

Add `skills/practice-cycle` as the repository replacement for the task-level
role of generic convergence. Its Primary P03 turns task work into
practice–observation–reflection–next practice; P02, P08, and P15 constrain the
cycle to actual evidence, disconfirming observations, and minimum transitions.

The new Skill is selected only when a non-trivial result must revise or settle a
later judgment. It does not impose a plan, a task board, a phase taxonomy, or a
feedback file on ordinary work. It delegates domain methods, form-selection,
execution, verification, and acceptance to their respective owners.

This repository skill does not modify the external installed `task-convergence`
package. A later installation decision requires action, boundary, and context
comparison evidence.

## Acceptance

- The Skill distinguishes ordinary disciplined development from a practice that
  must inform another judgment.
- It has a generated portable Sequence snapshot for P03/P02/P08/P15.
- Its action, boundary, context, and learning probes are concrete and can
  disconfirm the claimed behavior.
- A phase-completion use case can turn real evidence into either settlement,
  one next practice, or a route to a domain owner without constructing a generic
  plan.

## Implementation evidence

The [practice-cycle and form-guidance probes](../../regeneration/evaluations/2026-07-10-practice-cycle-and-form-guidance-probes.md)
show a completed Work Cell interaction phase being settled without absorbing a
new strategic aspiration into its unfinished work, plus a one-step task being
declined. A comparable baseline remains required before retiring any external
installation.
