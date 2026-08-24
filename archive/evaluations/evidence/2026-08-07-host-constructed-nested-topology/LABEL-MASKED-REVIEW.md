# Label-masked independent semantic review

**Status:** complete
**Reviewer:** fresh independent subagent; provider, model, token, and runtime
identity were not retained by the collaboration surface
**Reviewed:** frozen nine-file fixture, evaluator-only rubric, and
`development-02/blind-review.json` only

The reviewer was not given `blind-key.json`, the Work Cell records, summary,
README, prior results, or arm names. Random A/B labels hid the host mapping, but
candidate A's own references to a child report and absent raw sources could
reveal its information topology. This was therefore label masking, not a fully
blind review. The reviewer followed its instruction not to infer topology,
run tests, call a network, or edit files.

## Candidate A — rejected

Candidate A correctly found the adapter defect and proposed the complete local
adapter repair:

- derive `kind` from `event.result.outcome`; and
- make retry eligible only for a failed result with `retryable: true`.

It preserved identifier, time, public domain type, protocol text, tests, and
acceptance authority. It did not falsely claim to have executed tests.

It nevertheless failed the rubric because it did not independently establish
the second seeded defect. It called the child report's case-07 conclusion
plausible, but did not state the frozen failed/non-retryable input, the invalid
`expected.kind: "succeeded"`, and the required correction to `"failed"` as one
source-grounded finding. Its claim that the protocol and case sources were
absent explained the omission but did not make the final whole complete.

Disposition: `rejected`, confidence `0.99`.

## Candidate B — accepted

Candidate B found both seeded defects:

1. the adapter derives `kind` from retryability rather than declared outcome;
2. case 07 expects `succeeded` for a failed/non-retryable input.

It correctly retained failed plus retry `none`, cancelled plus retry `none`,
identifier, occurrence time, protocol, domain type, and tests. It identified
the latent non-failed-plus-retryable edge from protocol text, distinguished the
test-covered adapter repair from the independently reviewed case correction,
and withheld durable acceptance. It did not claim to have run tests.

Disposition: `accepted`, confidence `0.97`.

## Reveal

Only after the dispositions were returned did the Main Agent read
`development-02/blind-key.json`:

- Candidate A: `nested-parent`
- Candidate B: `direct`

The candidates are therefore not semantically equivalent. In this repetition,
the direct Cell was complete and the host-constructed nested parent lost one
decision-relevant relation during reconstruction.
