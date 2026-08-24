# Work Estimation Concepts

## In plain words

Before asking what an executor will cost, identify what must actually become
true. A work estimate is a small map of those necessary changes and the unknowns
that must be investigated before committing more work.

## Domain vocabulary

| Term | Meaning | Not the same as |
|---|---|---|
| Work Estimate | proposed, source-bound work graph for one decision | a budget, plan, or cost forecast |
| Work node | smallest necessary state/evidence/settlement transition | a model call, person-day, or fixed stage |
| Discovery branch | bounded work that decides whether later work exists | hidden contingency or an approved implementation branch |
| Tolerance policy | resolution and uncertainty that the current decision can bear | a universal accuracy target |
| Execution projection | model/tool-specific resource interval derived from observations | a commitment or authoritative fact |
| Budget envelope | approved hard limit and continuation gate | a prediction |
| Execution observation | actual usage, outcome, verification, retry, and profile record | proof that a forecast was accurate |
| Calibration projection | rebuildable coverage/bias/drift view over observations | an approval authority |

## Essence

1. Work is defined by a required state transition, not by an executor's activity.
2. Unknown work is explicit as a branch with an observation, not hidden in a
   scalar buffer.
3. Estimate resolution is selected by whether uncertainty can change the current
   decision.
4. Conversion and control are different: a forecast may inform a hard envelope,
   but cannot approve or expand it.
5. Actual observations revise future conversion, not the already observed work.
