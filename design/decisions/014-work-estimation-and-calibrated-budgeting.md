# 014 — Work Estimation Precedes Calibrated Budgeting

**Status:** accepted for implementation
**Date:** 2026-07-10

## Context

The current Work Cell can enforce a per-cell token, step, duration, and command
output limit, then retain actual usage and price-derived cost. This is necessary
control and accounting, but it is neither a work estimate nor a planning
forecast. The current Strategy Case can compare capability cost, irreversible
surface, and evidence gaps, but cannot state how much work each alternative
requires, how precise the comparison must be, or whether the forecast is
calibrated.

The missing decision is not “how many tokens should an agent receive?” It is:
**what work is necessary to reach a verifiable next state, how much error may
the present decision tolerate, and only then how does a named execution profile
translate that work into resources?** The source-bound
[research](../../principles/research/work-estimation-and-calibrated-budgeting.md)
finds no need for a Sequence addition.

## Design working team

This is a temporary design formation, not a semantic authority or standing
committee.

| Seat | P-ID | Decision contribution |
|---|---|---|
| Current lead | P07 | Recover a necessary work graph from the concrete object, then return it to an executable mission. |
| Reality seat | P02 | Keep work nodes, assumptions, and executor conditions source-bound. |
| Calibration seat | P08 | Require observed coverage, bias, drift, and counterexamples for conversion claims. |
| Resolution seat | P15 | Select only necessary work and the coarsest estimate whose uncertainty cannot change the current decision. |
| Authority seat | P11 | Separate estimate, forecast, hard envelope, execution, verification, and human continuation approval. |

## Decision

Adopt a five-part budget assessment stack:

```text
Work Estimate → Tolerance Policy → Execution Projection → Budget Envelope
       ↑                                                           ↓
       └──── Execution Observation ← verified Work Cell result ───┘
                              ↓
                      Calibration Projection
```

### 1. Work Estimate — source-bearing proposed work

A Work Estimate is executor-independent. It records the current and target
state, source evidence, necessary work nodes, dependency edges, discovery
branches, verification, settlement, irreversible surface, and human decision
points. A node exists only when omitting it makes a required state transition or
acceptance observation impossible.

It contains no person-day, token, currency, model, or wall-clock claim.

### 2. Tolerance Policy — decision resolution

Granularity is selected by the decision, not globally:

| Decision | Required resolution | Budget consequence |
|---|---|---|
| Long direction | capability/work-family comparison | order-of-magnitude work envelope; no executable cap |
| Medium capability | dependency and discovery branch | P80 scenario envelope and replan signal |
| Short mission | necessary work nodes and acceptance | approved discovery allocation, execution envelope, continuation gate |
| Work Cell / tree | exact declared input and capability boundary | enforced hard cap and partial-result return |

The policy declares structural, forecast, decision, control, and calibration
tolerances. If the uncertainty interval cannot distinguish alternatives, budget
is not a valid selection reason; the next action is a bounded discovery probe.

### 3. Execution Projection — rebuildable forecast

An Execution Projection takes one Work Estimate and an `ExecutionProfile`:
model/provider/version, tool surface, context policy, parallelism policy, and
price revision. It returns P50/P80/P95 intervals for token, duration, cash,
expected completed cells, retry risk, and human attention gates.

The projection must state the reference class, sample count, matching limits,
and calibration status. With insufficient observations it returns `unknown` or
a deliberately broad discovery envelope; it must not fabricate point estimates.
It is rebuildable from named observations and never becomes a source of work
facts or approved commitments.

### 4. Budget Envelope — human-approved control

An envelope is separate from a forecast. It names the hard cap(s), allowed
discovery allocation, branch allocation, parent-tree total, stop/partial
behavior, and the authority that may release further funds. Crossing an envelope
returns evidence and a continuation decision; it never silently expands a limit.

### 5. Execution Observation and Calibration Projection

Each Work Cell result links to its Work Estimate and executor profile, retaining
actual usage, duration, cost basis, outcome, retry/protocol status, verification,
and human intervention when applicable. A calibration view groups observations
by work shape and executor profile, then reports interval coverage, systematic
bias, width, data sufficiency, and drift. It is a projection, not a fact source.

## Form and ownership

| Need | Selected form and owner | Non-selected alternative |
|---|---|---|
| Repeated agent judgment of necessary work and tolerance | `work-estimation` Skill | Strategy/ad hoc prompt alone would conflate work with price and omit a repeatable gate. |
| Cross-session plan/approval | Work Estimate plus Budget Card in its owning Strategy Case or decision artifact | A global estimate registry would duplicate authority. |
| Hard caps, actual observation, tree-total enforcement | Work Cell runtime | A document cannot prevent aggregate overspend. |
| Scenario and calibration access | Rebuildable read-only projection | A dashboard must not acquire work or approval authority. |
| Strategy comparison | `strategic-advisory` consumes cards | It must not invent conversion rates or commit resources. |

No central budget agent, scheduler, universal work-point scale, mandatory
preflight, or automatic continuation is created.

## Initial runtime contract slice

The next runtime slice must add:

1. an optional, versioned `WorkEstimate` reference/content to a Cell input and
   resulting record;
2. a versioned `ExecutionProfile` and price revision in observations;
3. a parent `BudgetEnvelope` whose remaining resource total is debited before a
   child Cell can run; child per-cell limits cannot duplicate parent capacity;
4. a `partial` settlement with observed work and remaining work when an envelope
   stops execution; and
5. no forecast engine until observations contain enough comparable, retained
   records to make its uncertainty explicit.

## Acceptance

- A `work-estimation` Skill forms a comparable work graph for document, skill,
  and runtime alternatives, selects a decision-derived tolerance, and declines
  point conversion without a calibrated executor profile.
- Strategy Case gains a Budget Card that keeps Work Estimate, projection,
  envelope, and approval status distinct.
- Runtime tests prove a split tree cannot spend more aggregate resource than its
  parent envelope and that a boundary produces `partial` evidence rather than an
  automatic continuation.
- A calibration projection reports sample count, interval coverage, bias, width,
  and drift; it labels insufficient evidence instead of inventing accuracy.
- All projections remain reconstructible and neither a cell nor a forecasting
  view can approve a budget or strategy.

## Implementation evidence

The [work-estimation action and boundary probe](../../regeneration/evaluations/2026-07-10-work-estimation-probe.md)
supports the method layer: it compares concrete alternatives through work graphs
and discovery branches, chooses capability-level tolerance, and refuses an
unsupported token/cost/P80 claim. It does not prove the pending runtime
calibration projection, or conversion accuracy.

The initial runtime envelope is now implemented and tested: a Cell input/record
can retain versioned Work Estimate and Execution Profile references plus a price
revision; a sequential differentiation tree clamps every Cell's token allocation
to a root Budget Envelope and settles `partial` with unresolved child evidence
when allocation is exhausted. It does not predict conversion or enforce an
aggregate wall-clock/cash envelope yet; those require corresponding observed
units and calibration evidence.
