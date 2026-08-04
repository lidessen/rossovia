# Autonomy Child-result Reconstruction Prerequisite

**Date:** 2026-07-26

**Status:** bounded reconstruction mechanism supported; matched production
comparison not yet run

## Allocation question

Can the project use a supervised Mission formation, rather than one ordinary
human-initiated Agent session, for complex read-only repository work without
losing child findings at the parent reconstruction boundary?

The eventual comparison may support only a whole-profile observation under a
frozen task, provider, model, tool surface, and execution policy. It cannot
establish that Mission formation is generally better.

## Comparison-validity gate

The first comparison design failed before execution. A settled child exposed a
`resultFile` path to the parent, but the parent had no tool that could consume
the child's semantic result. The existing package-extraction probe remained
valid because its parent only reported settlement and uncovered obligations; a
real reconstruction task would instead be dominated by this adapter gap.

Running repeated profiles at that point would have measured “one profile can
read its worker result and the other cannot,” not the value of supervised
formation.

## Smallest prerequisite transition

The delegate loop now provides a host-owned
`read_delegate_result({ batchId, key })` tool after a child settles:

- the model cannot supply a filesystem path;
- the parent loop and file timeline both verify the batch and child identity;
- only final text, structured output, artifact metadata, and verification
  evidence enter the semantic projection;
- projections larger than 32 KiB fail closed to digest-bearing metadata rather
  than flooding parent context; and
- a finished parent turn carries each successful read's digest receipt into its
  durable Mission settlement.

The full child timeline remains cold evidence. This transition adds no write
path, command authority, task-discovery authority, semantic acceptance, or
publication capability.

## Evidence

- [`delegate-loop.ts`](../../operations/autonomy/src/delegate-loop.ts) owns the
  batch/key-only parent tool and retained read receipts.
- [`delegate-timeline.ts`](../../operations/autonomy/src/delegate-timeline.ts)
  resolves the verified child settlement and produces the bounded projection.
- [`mission-turn.ts`](../../operations/autonomy/src/mission-turn.ts) retains the
  receipts without making them acceptance evidence.
- The integration test proves that a parent can use one child fact in its final
  reconstruction while cross-parent and unknown-child reads fail.
- The recovery test proves that a prepared but unsettled child cannot be read.
- A separate read-only source review found no blocker. Its defensive
  batch/key-check, non-empty persistence, and oversized-projection residuals
  were closed before the final run.
- `bun run typecheck` passed and `bun test` passed 48/48 after the transition.

Deterministic tests establish containment and retained evidence. They do not
establish that a live parent will request the right results, synthesize them
correctly, or outperform a single Agent. A read interrupted before the parent
turn settles is not yet independently journaled; the initial no-intervention
comparison must not claim that later steering boundary.

## First production comparison field

The first development case should replay the read-only review of the initial
versioned-setup implementation between base `2c6b73e` and head `56d7ac7`.
Workers may see only the frozen proposed change and its original mandate.
Later review records, the corrected head, regression tests, current design
projections, and the defect reference remain evaluator-only.

The hidden reference asks whether the reviewer discovers that the
`baseline-unavailable` apply path can mutate the target or receipt before its
baseline is verified. This is a real decision-changing failure with a later
independent correction and a reproducible isolated fixture.

Use the home-write repair ending at `9306ac6` as a held-out confirmation case,
not as additional instructions for the first case. Its later review records
must likewise remain evaluator-only.

## Remaining prerequisites

Before making a comparative claim:

1. record a normalized ordinary-session trial and a normalized Mission trial;
2. freeze one OpenCode Go `deepseek-v4-flash` route with no fallback, matching
   context, tools, permissions, budgets, and serial alternating order;
3. run at least two retained repetitions per profile;
4. judge outputs blind against evaluator-only criteria, retaining failures,
   interventions, usage, latency, and route evidence; and
5. keep the result a `probe` until the Principal accepts a bounded allocation
   claim.

A later steering comparison must first journal result-read receipts at tool
execution time if interrupted reads need to survive an unsettled parent turn.

No provider call or external repository-content transfer occurred in this
prerequisite transition.
