# Candidate — Source / Projection Boundary

**Status:** adopted
**Observed in:** agent-worker, shilu, sikong, chiling

## Candidate sequence line

P14｜可由源重建者只是投影，不得拥有事实权｜系统论 / 事件溯源

## Recurrence

- `agent-worker/design/DESIGN.md:63-71` treats WorkItems, tracks, routes, and
  rewards as projections or strategy evidence over one signal-to-fact loop.
- `shilu/DESIGN.md:30-39` makes entries authoritative and indexes rebuildable.
- `sikong/design/architecture/three-layers.md:100-120` makes task-board views
  read-only projections rather than a second artifact/state source.
- `chiling/DESIGN.md:24-36, 334-340` makes the daemon semantic source while CLI
  and UI are clients of the same control plane.

## Decision consequence

For any representation of the same semantic entity, name the source explicitly.
Derived views, indexes, scores, and interfaces must be reconstructible or be
promoted to an independently governed source; they must not silently acquire
authority through convenience or visibility.

## Existing-sequence check

P12 requires durable, externalized memory but does not distinguish a durable
source from a rebuildable derivative. P11 allocates decision authority but does
not supply the replay/reconstruction test. This candidate governs both.

## Counterexample / boundary

Two stores are not automatically projections of one another. A transcript,
audit ledger, and work log may be deliberately independent records with
different semantics. Apply this candidate only after establishing that a
representation claims to describe the same state.

## Expression probes

- This repository: `principles/SEQUENCE.md` is source; skills and L1 guidance
  are expressions that cannot redefine it.
- Knowledge system: delete an index, rebuild it from entries, and confirm that
  no knowledge authority was lost.

## Human decision

adopted — approved by the human on 2026-07-09.

## Committee review

See [`2026-07-09-p13-p16-expansion.md`](../reviews/2026-07-09-p13-p16-expansion.md).
