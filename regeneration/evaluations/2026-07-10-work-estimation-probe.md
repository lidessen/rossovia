# Work Estimation — Action and Boundary Probe

**Status:** action, boundary, tolerance, and context behavior observed; runtime slice pending
**Date:** 2026-07-10
**Runtime:** independent [Work Cell](../../packages/work-cell/README.md),
`deepseek-v4-flash`

## Claim

The proposed [`work-estimation`](../../skills/work-estimation/SKILL.md) method
can compare alternatives through executor-independent necessary work and
discovery branches, select decision-derived resolution/tolerances, and decline
a point token/cost/P80 forecast when no calibrated executor profile exists.

## Action probe

Constrained write run `faf7f81c-c6cc-46dc-822a-2f1d778cb5fb` passed with
107,380 tokens (estimated $0.00424468). It could read only the current budget
contracts, cell-tree implementation, decision 014, selected Sequence readings,
Strategy Case template, and target-skill references. It had no command surface
and could write only `.work-cell/work-estimation-record.md`.

The run compared three concrete alternatives:

1. a Strategy Case cost field only;
2. work-estimation method, source-bearing Work Estimate/Budget Card, runtime
   observation/envelope slice, and rebuildable calibration projection; and
3. an immediate central budget runtime.

It made separate necessary-work graphs and discovery branches for each, chose
the **capability** horizon, and selected alternative 2 as the minimum valid
transition. The record names an explicit branch for parent-envelope debit after
observing the then-working-tree `run-tree.ts` behavior. That exact source state
was not retained in Git; later committed tree code added aggregate envelope
handling, and the subsequent
[general-core reconstitution](../../design/decisions/027-general-work-cell-core-and-sequence-adapter.md)
retired cell-tree decomposition from the current runtime. The historical tree
diagnosis therefore cannot support a claim about the current implementation.
The retained output still demonstrates that it did not represent a work node as
a token, dollar, person-day, or fixed point.

## Boundary, tolerance, and context

The same run declined “estimate the exact DeepSeek token cost for this design
now.” It found that current records retain actual usage/cost but contain neither
a Work Estimate reference nor a comparable work-shape/executor-profile class;
therefore a point estimate or P80 would be a claim without calibration evidence.
It named a bounded executor-profile survey as the smallest discovery necessary
before a broad conversion envelope may be proposed.

The output kept Work Estimate, execution projection, Budget Envelope, execution
observation, and human approval distinct. Its tolerance decision was also
explicit: at capability resolution no conversion forecast is valid yet, so the
forecast tolerance is `not applicable`; the correct next step is discovery, not
more numerical detail. This is a context probe as well: it did not load a price
sheet and did not infer work from the selected model.

## Verdict and limits

This supports the behavior claim of the work-estimation method and the method
portion of [decision 014](../../design/decisions/014-work-estimation-and-calibrated-budgeting.md).
It does not prove general estimation quality, conversion accuracy, or parent
envelope enforcement; no matching reference class, aggregate runtime control,
or calibration projection exists yet. Those remain explicitly staged runtime
acceptance work, not gaps hidden by this passing probe.
