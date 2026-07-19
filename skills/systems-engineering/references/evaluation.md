# Evaluating a systems-engineering intervention

Use this reference only when a proposed control structure is being tested or a
reliability improvement is being claimed.

## Minimum comparison

Retain one real case with a known material disturbance, failure, near miss, or
cost problem. Compare:

```text
Baseline system and source revision:
Desired behavior and accepted tolerance:
Known disturbance or seeded failure:
Treatment and the control relation it changes:
Unchanged components and operating conditions:
Observable end-to-end outcomes:
Added work, latency, cost, and human attention:
Disconfirming result:
```

Prefer matched runs. When a live effect is unsafe or irreversible, use a
faithful replay, simulation, fixture, shadow path, or staged environment and
state what it cannot prove.

## Required judgments

1. Did the treatment detect, contain, recover from, or reduce the named failure
   under the declared operating conditions?
2. Did it preserve the intended outcome and hard authority constraints?
3. Did it create false positives, correlated misses, coordination failures,
   delays, or cost that change the decision?
4. Could a smaller control change have produced the same material improvement?
5. Is the result evidence about one component, integration, or end-to-end
   operation? Do not promote it across surfaces.
6. Who verified the evidence and who accepted the remaining risk?

Before evaluating operation, independently audit the proposal's specificity.
For each mechanism, field, threshold, duration, sample, protocol, or role added
by the proposal, classify `source-supported`, `owner-to-determine`, or
`unsupported-invention`. This verifier checks claim-to-source correspondence;
it does not redesign the system or turn preference into fact. The proposing
Agent's own boundary statement is not verification.

Give this verifier the governing case/source plus the accepted candidate
payload. Do not inject a full Agent transcript or raw run record when rejected
intermediate calls and unrelated trace state cannot change the judgment. The
verifier's own report remains a claim for designated settlement.

## Agent-system evidence

Record at least:

- execution profile revisions for relevant Cells;
- task and evidence boundaries;
- protocol completion separately from semantic settlement;
- material defects caught, escaped, or introduced;
- whether repeated attempts were meaningfully independent;
- retries, recovery, and source-state changes;
- actual versus estimated tokens, time, and money when available; and
- human review or repair burden.

Do not use raw reviewer count, test count, schema validity, token use, or model
reputation as a reliability proxy without connecting it to the failure path.

## Acceptance language

Use evidence-bounded conclusions:

- `proposed`: control relation designed but not exercised;
- `observed`: behavior recorded in the retained case;
- `supported in range`: matched evidence met the named tolerance under the
  declared operating conditions; or
- `not supported`: the treatment failed, moved the problem, or cost more than
  the accepted consequence justified.

Never report “reliable” without the range, tolerance, disturbance, evidence,
and residual risk.

## Reopening signals

Reopen the design when:

- the same material failure escapes the new control;
- operation exposes a new principal failure path;
- a control's false positives or coordination cost exceed the avoided loss;
- the environment, model, source, authority, or consequence changes; or
- the acceptance owner can no longer inspect the decision evidence within
  available human bandwidth.
