# 019 — Event-Triggered Reflection Sidecar

**Status:** approved for pilot
**Date:** 2026-07-11
**Approved by:** principal

## Context

The project needs a way for real anomalies to inform its own improvement
without turning every task into a self-analysis ritual or creating a resident
agent that treats reflection as authority. The current [Work Cell remediation
observation](../../chronicle/records/2026/07/obs-20260711-workcell-remediation-budget-signals.json)
records four independently bounded runs that exhausted their token budget before
structured submission. The finding can change a later Work Cell configuration
or continuation decision, but its raw traces would otherwise remain local
execution residue.

## Decision

Adopt an **event-triggered reflection sidecar**. It is a latent route beside a
main mission, not a second mission controller.

```text
source anomaly → Chronicle observation → reflection candidate → safe-point route → named owner
```

An anomaly may form a candidate only when it is decision-changing: a repeated
budget/verification failure, an independent reviewer contradiction, a human
correction, a source/projection conflict, or an outcome that cannot be
truthfully settled. The recorder preserves the observation, method, limitation,
and source ID. It does not diagnose a cause or start a new task automatically.

At a main-task safe point, the convener asks one bounded question: does this
observation change the next practice? If yes, it routes to the owner; if no,
the Chronicle record remains available without consuming further attention.

| Observation class | First route | Cannot do |
|---|---|---|
| failed acceptance, budget mismatch, or ambiguous execution | `practice-cycle` | silently retry, enlarge a budget, or declare success |
| recurring missing carrier or visibility gap | `form-guidance` | create a skill, runtime, dashboard, or agent by itself |
| repeated method misuse | `skill-engineering` | amend the owning skill without review |
| context omission | `context-engineering` | rewrite project doctrine or own runtime mechanics |
| irreducible principle pressure | `principle-cultivation` | alter the Sequence without human adoption |

## Boundary

The sidecar has no scheduled runner, autonomous queue, standing committee,
default task preflight, or independent token budget. It may consume only the
attention needed to preserve one concise observation and name a route. Any
investigation, retry, implementation, or budget increase remains a separately
bounded main-task decision.

The Chronicle is the source for the sidecar's observation; a development log,
dashboard, or agent summary is only a projection. A valid observation does not
accept a diagnosis, patch, strategy, or merge.

## Sequence expression

- **P02 / P08:** retain actual anomaly and limitation, then let contrary or
  repeated observation revise the explanation.
- **P03:** a failed practice changes only the next smallest practice, not the
  whole organization by reflex.
- **P12 / P14:** preserve a reusable observation while keeping reports and
  summaries reconstructible.
- **P13 / P15:** fact admission and minimum transition remain separate; the
  sidecar neither self-accepts nor self-expands.

## Acceptance

- A decision-changing anomaly can survive the session in the Chronicle with
  source IDs and limits.
- A later agent can route the anomaly to one existing owner without needing a
  universal reflection skill or daemon.
- The current Work Cell budget observation produces a proposed next practice
  rather than an automatic retry or model/budget claim.

## Disconfirming observation

Reopen this decision if the sidecar records many observations that never change
a later choice, or if a recurring anomaly cannot be routed without an
unrepresented judgment. The first case demands stricter selection; the second
may justify a new method or runtime only after form review.
