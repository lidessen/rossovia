# Evidence-Linked Review Modeling

A review model is a temporary explanation of the relevant code system used to
reason about a proposed change. It is not a generated project canon, a complete
architecture document, or a substitute for source inspection.

## Choose the resolution

| Change shape | Minimum useful model |
|---|---|
| Local algorithm or branch | inputs, state transitions, outputs, callers, failure paths |
| Cross-module change | component responsibilities, ownership, call/effect flow, contracts |
| Runtime or platform change | subsystem boundaries, lifecycle, persistence, capabilities, external consumers |
| Bounded review packet | packet-local model plus explicit incoming/outgoing relations and unknown exterior context |

Do not model the whole repository at uniform detail. Preserve the whole at low
resolution and increase detail only around relations that can change the review
decision.

## Build four connected views

1. **Responsibility view** — what each relevant component promises and who owns
   state, effects, verification, and acceptance.
2. **Causal view** — how an input, event, or call travels through changed and
   unchanged code to an observable result.
3. **Constraint view** — public contracts, invariants, compatibility, security,
   resource, and lifecycle conditions that must remain true.
4. **Change view** — what relation differs before and after the patch, what the
   author expects, and where an unintended consequence could enter.

For every relation retain one of:

- a source anchor such as symbol/call site/schema/test/runtime observation;
- a labeled inference and the check that could disprove it; or
- an explicit missing relation that bounds the verdict.

## Revise rather than defend

Start with the smallest plausible model, then probe it through callers,
callees, state/effect boundaries, and counterexamples. When source evidence
contradicts the model, revise the model before judging the code. Do not preserve
an elegant architecture story by treating mismatching implementation as a bug
unless an accepted contract actually gives the story authority.

## Reconnecting partitioned models

The primary reason to use several review Cells is scale control: each Cell can
model and verify one semantically closed packet at a scale where it performs
reliably. Different local models may also expose assumptions that one large
model would suppress, but that is a secondary benefit, not the definition of a
Swarm. A later caller or review packet reconnects them by:

1. checking the shared source revision and coverage ledger;
2. aligning concrete entities and packet boundary relations;
3. separating source-backed relations from inference;
4. locating missing, duplicated, or conflicting responsibility, causal, and
   invariant relations;
5. checking the minimum source needed to resolve each conflict; and
6. retaining unresolved alternatives as residual risk.

Do not average models, select the longest report, or treat consensus as
verification. The value of multiple models is the exposure of missing relations
and reliable treatment of work that exceeds one Cell's stable scale;
orchestration count alone produces no such value.

## Compact model record

```text
Scope and source revision:
Whole at low resolution:
Detailed components and responsibilities:
State/effect owners:
Before/after causal path:
Load-bearing invariants:
Source-backed relations:
Inferences and disconfirming checks:
External relations not inspected:
Model conflicts or revisions during review:
```
