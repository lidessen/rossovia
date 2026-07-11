# 021 — Git-Tracked Mission Continuity

**Status:** approved for pilot
**Date:** 2026-07-11
**Approved by:** principal

## Context

Git branches, worktrees, PRs, and CI preserve change history. The Observation
Chronicle preserves what was observed, by whom, and with which limitation.
Neither answers the operational continuity question for a material mission:
which lines of work remain open, why did they diverge, and what must they
return to the mainline before the mission may settle? The current operating
protocol requires unresolved work to remain explicit, but has no common source
that makes the relation inspectable across a long agent/human session.

## Decision

Adopt one Git-tracked **Mission Record** for a material, multi-session mission.
It lives at `operations/missions/<id>.json` while active and names:

```text
mainline contradiction + acceptance
  └── side branch: source, purpose, parent, return condition, status
                              └── close: disposition + mainline delta
```

The record is a small operational source, not a task board. It has one current
focus and a finite branch set. A branch is `open`, `integrating`, `suspended`,
or `closed`. `suspended` requires a reactivation signal. `closed` requires one
of `integrate`, `no-change`, or `abandon` and a concrete `mainlineDelta`; a
branch may not disappear because it produced an attractive report or partial
artifact.

`scripts/mission-record.py` creates, updates, validates, and renders the
record. It can require that the active record is Git-tracked and, at a critical
safe point, that its state is committed at `HEAD`. The record must be committed
with its opening and material updates on the mission branch. A mission settles
only after every branch closes and closure sources are named. Once this settled
state is committed, `prune` removes the record; Git history retains its final
source state, preventing the active directory from becoming an archive.

## Source boundaries

| Carrier | Owns | Does not own |
|---|---|---|
| Git worktree / PR / CI | source changes, proposed integration, mechanical checks | why an unfinished line must return |
| Chronicle | observation, method, limitation, correction | scheduling or mainline priority |
| Mission Record | open obligations, branch return contract, current focus | fact acceptance, automatic execution, or project strategy |
| `status` output | readable active-branch view | an independent source or decision authority |

A Work Cell may point to a Mission Record through a prompt or adapter-defined
result, but Work Cell remains an evidence-producing practice unit. It does not
own the mission graph or schedule the next branch.

## Boundary

- Do not create a record for one-step, local, reversible work.
- Do not use it as a global backlog, worker queue, issue tracker, resident
  manager, or automatic continuation mechanism.
- Do not retain a permanent closed-record library. Promote only a
  decision-changing result to its proper design, PR, evaluation, or Chronicle
  source; then prune the settled operational record after its final state is
  committed.
- At a material safe point, inspect `status`; this is conditional on a material
  mission, not a universal task preflight.
- `check --git` confirms tracking, not correctness of linked sources. Existing
  verification and human acceptance remain their own gates.

## Sequence expression

- **P03 / P04:** a completed practice must alter or explicitly leave unchanged
  the mainline; the live contradiction selects only needed branches.
- **P11 / P13:** a branch report is not self-acceptance; execution, verification,
  and commitment retain their separate holders.
- **P12 / P14:** the active record externalizes recoverable obligations while
  generated status remains a projection and settled history returns to Git.
- **P15 / P16:** one concise source and a small local command close the
  continuity gap without creating a task-management runtime.

## Acceptance

- A record cannot validate with a missing return condition, duplicate branch,
  active child of a closed branch, suspended branch without reactivation signal,
  or closed branch without a mainline delta.
- `check --git` rejects an untracked record; `--require-committed` rejects an
  uncommitted update at a material safe point.
- `close` rejects any unreturned branch; `prune` rejects a non-settled or
  uncommitted record.
- A current material mission uses one record without creating a global queue or
  permanent mission archive.

## Disconfirming observation

Reopen this pilot if a real mission record becomes mostly duplicated PR prose,
if agents repeatedly fail to update it before a safe point, or if concurrent
missions require global prioritization not expressible as independent records.
The first calls for a smaller carrier, the second for a better activation
surface, and the third for a separate form decision—not silent expansion into a
task board.
