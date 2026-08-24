# Research — Work Estimation and Calibrated Budgeting

**Disposition:** no-proposal
**Scope:** Determine whether the recurring judgment of estimating necessary work,
choosing evaluation resolution/tolerance, and converting it into an agent budget
requires a new Sequence entry or a downstream method and runtime contract.
**Source limitations:** The evidence is this collection's current Work Cell and
strategy artifacts. It establishes a project design gap, not a general claim
that one conversion model fits every executor.

> This record is cited, revisable research. It owns no P-ID, cannot redefine an
> interpretation, and does not propose a Sequence change by itself.

## Question

How should this collection estimate the work needed to reach a verifiable next
state independently of any executor, then convert that work into model-specific
time, money, token, and control budgets with explicit evaluation granularity and
error tolerance?

## Distinctions

- **Work estimate** is an executor-independent account of necessary state
  transitions, discovery branches, verification, and settlement. It is not a
  person-day, token count, or price estimate.
- **Execution projection** applies an observed executor profile to a work
  estimate and returns uncertain resource intervals. It is not a commitment or
  a fact source.
- **Budget envelope** is the human-approved hard limit and continuation gate.
  It is not the forecast that informed it.
- **Execution observation** records actual consumption and outcomes. A later
  calibration projection may be rebuilt from those records.

## Evidence

The current [Work Cell contract](../../packages/work-cell/src/contracts.ts)
retains an executor-independent `WorkEstimate`, an executor-specific
`ExecutionProfile`, a caller token estimate and tolerance, step/duration limits,
and command-output caps. Its [run record](../../packages/work-cell/src/run-cell.ts)
retains those inputs beside actual usage, duration, and price-derived cost. It
still does not infer a time/cost forecast, conversion confidence, or calibrated
reference class; those remain external projections rather than core facts.

The current [Strategy Case](../../skills/strategic-advisory/references/strategy-case.md)
compares capability cost and irreversible surface, but has no place to compare
the same work under different executor profiles, state forecast uncertainty, or
approve a budget envelope.

The earlier cell-tree mechanism examined by the first probe is no longer a
current runtime contract. The general-core reconstitution keeps aggregate
allocation rules with the adapter or caller that introduces the collection;
the core does not infer a parent-wide budget or work decomposition. See
[decision 027](../../design/decisions/027-general-work-cell-core-and-sequence-adapter.md).

The [practice-cycle](../../skills/practice-cycle/SKILL.md) already supplies the
required empirical loop: observed practice revises the next smallest practice.
The [form-guidance method](../../skills/form-guidance/SKILL.md) distinguishes the
needed stack: agent method, durable decision artifact, runtime state, and
projection have different owners and cannot be collapsed into a central budget
agent.

## Existing-sequence coverage

- **P07:** derives a necessary work graph from the concrete object and returns
  it to an executable mission without treating a checklist as the object.
- **P02:** keeps work nodes and assumptions grounded in actual sources and
  conditions rather than executor folklore.
- **P08:** makes a conversion forecast answerable to coverage, bias, drift, and
  a disconfirming execution observation.
- **P15:** chooses the smallest work graph and the coarsest resolution whose
  error cannot alter the present decision, while retaining hard constraints.
- **P11 / P13:** keep forecast, execution, verification, and human-approved
  budget commitment separate.

## Possible decision delta

The existing P-IDs support a downstream `work-estimation` method, a Work Cell
runtime contract for observation/envelope enforcement, a Strategy Case budget
card, and a rebuildable calibration projection. They change recurring planning
and execution choices without changing Sequence meaning.

## Strongest no-proposal case

No new P-ID is warranted. “Work first, conversion second” is P07/P02 applied to
this object; calibrating a forecast is P08; resolution and stopping are P15;
approval separation is P11/P13. A budgeting principle would restate their
combination while creating permanent semantic surface.

## Disposition and next evidence

**Disposition:** `no-proposal`

Test a work-estimation method against the concrete document/skill/runtime
alternatives. It must construct comparable work graphs, select a tolerance based
on the decision, and decline a point price/token estimate when no calibrated
executor profile exists. A failed probe that cannot be explained by current
P-IDs reopens this inquiry.
