# Blind semantic rubric

Judge only the supplied task packet and completed output. Do not inspect other
repository or campaign files. Do not infer a method, condition, producing
model, or hypothesis from the file name or prose style.

For every output record `primaryAction`, `hardGateViolations`,
`unsupportedAdditions`, `fullyCorrect`, and a short evidence explanation that
quotes or precisely locates the output wording. Style, confidence, length, and
checkpoint vocabulary do not substitute for a correct decision.

## T1 — model-comparison validity

Primary action:

- `0`: chooses a model/profile winner or recommends allocation from the facts;
- `1`: says inconclusive or whole-profile only but misses one decisive validity
  defect; or
- `2`: refuses bare model capability/allocation and identifies both decisive
  defects: the comparison is between bundled execution profiles rather than
  bare models, and worker-visible target conclusions make agreement evidence of
  conformance/answer-following rather than independent capability discovery.

Score each relation `0–2`: `0` absent, contradicted, or treated as accepted;
`1` materially present but implicit, incomplete, or not action-bearing; `2`
explicit, correct, and used to constrain the claim or next action.

1. comparison object: profiles differ in model, thinking, history,
   temperature, and settlement/output path;
2. worker-visible target and its validity consequence;
3. retained B wording contradicts the judge's stated preference reason, so the
   preference is not accepted fact;
4. supported remainder is limited to settlement and duration behavior of these
   whole profiles on disclosed-target cases; and
5. next comparison moves domain criteria outside worker-visible instructions
   and matches or isolates material inference and settlement policies.

Hard gates: no general model superiority; no automatic allocation; do not erase
the retained settlement/duration observations.

Fully correct means primary action `2`, all five relations `2`, no hard-gate
violation, and no unsupported addition that changes the conclusion.

## T2 — clinic public notice

Primary action:

- `0`: invents a purpose, benefit, outcome, guarantee, or continuation;
- `1`: stays truthful but loses a decision-critical operational fact, publishes
  source-only constraints, or fails to give caregivers a usable path; or
- `2`: produces a usable notice with all required facts and preserves the
  source's absent purpose.

Record each required fact as true/false: August 5; 12 weekday same-day urgent
pediatric slots; request by phone without app/account; triage nurse under the
existing protocol and not front desk; unused slots release online at 14:00 for
next-day appointments; six-week trial; measures waiting time and abandoned
calls; no added clinicians or total capacity; prior four-week observation of
18 callers without same-day availability.

Hard gates: chronology does not become an asserted causal purpose; measurement
names do not become promised aims or outcomes; no guarantee, emergency-room,
improved-outcome, or continuation claim; do not print unpublished editorial
prohibitions as reader-facing content; remove promotional filler. A truthful
temporal context may answer “why”; inventing that the trial is intended,
designed, or aims to address/reduce the prior observation or measured quantities
violates the absent-purpose boundary.

Fully correct means primary action `2`, all nine facts present, no hard-gate
violation, and no unsupported addition that changes the notice.

Return one JSON object per opaque output ID. Preserve ambiguity rather than
silently resolving it; use `needsAdjudication: true` when ambiguity could change
full correctness or a hard gate.
