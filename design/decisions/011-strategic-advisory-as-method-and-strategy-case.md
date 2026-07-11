# 011 — Strategic Advisory as Method and Strategy Case

**Status:** accepted for implementation
**Date:** 2026-07-10

## Context

The corrected [form-guidance decision](009-form-guidance-replaces-generic-convergence.md)
identified a separate domain question after project phases: how to synthesize
verified evidence into a strategic recommendation for human approval. Its own
handoff boundary prevents it from defining that method. The accepted
[practice-cycle](010-practice-cycle-replaces-generic-convergence.md) likewise
settles or advances a practice but does not own multi-horizon strategic
synthesis.

The existing [Work Cell runtime](007-independent-work-cell-runtime.md) provides
bounded execution evidence, while its project interaction records show that
convenient summaries remain projections rather than sources. No component owns
the advice-only transformation from phase evidence to a human decision across
planning horizons.

## Decision

Add `skills/strategic-advisory` as the domain method for that transformation.
It is a repeated advisory judgment, not a central agent or orchestration
runtime. Its output is a proposed `Strategy Case`: a human-reviewable durable
decision artifact that separates verified facts, claims, alternatives, and
conditional horizons.

The initial form stack is deliberately small:

| Role | Owner |
|---|---|
| Strategic synthesis method | `strategic-advisory` Skill |
| Evidence and bounded mission execution | existing Work Cell or other designated execution owner |
| Proposed durable recommendation | Strategy Case artifact |
| Approval and resource commitment | designated human |
| Convenience view, if later needed | rebuildable projection of the Strategy Case |

No standalone strategic runtime, task board, worker pool, shared memory, or
automatic mission queue is created.

## Method

P07 leads: reconstruct the concrete phase situation from evidence, abstract the
relations that matter, then return to a concrete recommendation. P04 identifies
the principal contradiction; P13 keeps facts, claims, and options distinct; P15
limits recommendation to the minimum commitment that changes the contradiction
without breaking hard constraints.

The Strategy Case has three rolling horizons: long direction, medium capability
hypotheses, and short mission candidates. The horizons differ by commitment,
not merely date. A short mission must link upward through a capability to a
direction; no layer automatically commits work. Human approval alone makes a
short mission eligible for an execution owner.

## Acceptance

- The Skill carries a generated snapshot for P07/P04/P13/P15 and has a distinct
  phase-evidence trigger and non-scope.
- A Strategy Case template preserves fact/claim separation, preservation case,
  alternatives, linked horizons, replan signals, and named authority.
- A live action probe creates a proposed Strategy Case from actual phase
  evidence without self-commitment; a boundary probe declines ordinary planning.
- The final form retains no central strategic runtime or task-board residue.

## Implementation evidence

The [first strategic-advisory action probe](../../regeneration/evaluations/2026-07-10-strategic-advisory-action-probe.md)
records protocol and budget failures, source-status and self-reference repairs,
one final mechanically settled proposed Strategy Case, and an
ordinary-planning boundary result. Human review remains required before
adoption.
