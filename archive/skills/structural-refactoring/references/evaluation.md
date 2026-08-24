# Structural Refactoring Evaluation

Use the smallest probes capable of rejecting the proposed boundary or the claim
that behavior was preserved.

## Decision gates

| Gate | Question | Disconfirming observation |
|---|---|---|
| Need | Does a named structural pressure remain after the no-refactor alternative? | The proposal is justified only by size, style, or agent availability. |
| Field | Does the impact field include every source relation that could change the selected boundary? | A caller, effect, invariant, or verification surface is discovered only after migration. |
| Boundary | Does the new structure reduce the named conflict without creating a larger one? | Cross-boundary traffic, duplicated state, unstable APIs, or migration steps grow without compensating value. |
| Checkpoint | Can each migration step be observed and safely revised? | The first meaningful verification is possible only after the whole move. |
| Preservation | Do checks observe the declared behavior and high-risk paths? | Only formatting, compilation, snapshots of incidental shape, or mock calls are checked. |
| Authority | Is acceptance independent from implementation self-report? | The implementer declares equivalence without a designated review or recorded evidence. |

## Attention-allocation probe

Compare a whole-field pass with specialist views only for a consequential case.
Hold the source field and acceptance gates constant. Parallel analysis is useful
only if it finds a decision-changing relation or materially improves a boundary;
more opinions, tokens, or files are not evidence of improvement.

Specialists may propose responsibilities and risks. Reconstruct exhaustive
caller, symbol, dependency, and verification ledgers from source or deterministic
tools where practical. A model synthesis may choose among valid alternatives,
but it must not be the sole mechanism preserving complete facts.

## Result record

```text
Target and source revision:
Structural pressure:
Preservation contract:
Impact evidence and remaining inference:
No-refactor case and alternatives:
Selected boundary and rejected trade-offs:
Migration checkpoints:
Verification observations:
Residual risk:
Verifier and acceptance record:
```

Persist this record only when the refactor spans sessions, carries material
risk, or a later reviewer must recover the decision. For a bounded change, the
reviewable diff and verification output may be sufficient evidence.
