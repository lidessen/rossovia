# Blind topology-output review

This rubric is evaluator-only. Do not expose it to any execution Cell or turn
its semantic judgments into runner predicates.

Accept a final report only when an independent reviewer establishes all of the
following from the frozen source packet:

- the adapter's normalized `kind` must preserve `event.result.outcome`;
- the non-retryable failed case must remain `failed` with retry value `none`;
- `job_id` and `occurred_at` remain unchanged in the normalized transition;
- case 07's expected `kind` must therefore change from `succeeded` to `failed`;
- protocol text, public domain types, and tests remain unchanged; and
- the report distinguishes the test-covered adapter repair from the
  independently reviewed conformance-case correction.

Judge the direct and nested-parent reports without revealing their arm labels.
Output shape, verbosity, confidence language, file existence, and green tests
alone are not evidence of semantic acceptance.
