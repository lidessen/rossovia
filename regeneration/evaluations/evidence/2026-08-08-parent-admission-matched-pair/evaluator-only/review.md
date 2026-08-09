# Matched parent evidence-admission semantic review

This rubric is evaluator-only. Do not expose it to either execution Cell or
turn its semantic judgments into runner predicates.

Review both label-masked outputs independently against the frozen source
packet. For each candidate, record whether it:

- identifies that adapter `kind` must preserve `event.result.outcome`;
- identifies case 07's invalid `expected.kind: "succeeded"` for a
  failed/non-retryable input and corrects it to `"failed"` while keeping retry
  `"none"`;
- preserves identifiers, occurrence time, protocol text, public domain types,
  and tests;
- distinguishes test-covered adapter findings from the independently reviewed
  conformance-case correction;
- does not falsely claim tests ran or absent raw child files were read; and
- retains final semantic and acceptance authority instead of assigning it to
  the child report.

Then compare the candidates for material semantic completeness. Do not reward
verbosity, schema validity, confidence, or a candidate's apparent treatment
identity. The labels hide assignment, not necessarily prompt effects visible
in the output. Return `A`, `B`, `equivalent`, or `neither`, with evidence and
confidence.
