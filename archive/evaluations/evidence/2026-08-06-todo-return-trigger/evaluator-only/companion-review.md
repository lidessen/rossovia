# Companion conformance review

This rubric is evaluator-only. Do not expose it to the worker or convert its
semantic judgments into harness predicates.

Accept the companion artifact only when an independent reviewer establishes
all of the following from the bundled protocol and the final adapter:

- the input is a valid Northstar v2 non-retryable failed event;
- the expected transition remains failed and has no retry eligibility;
- identifiers and occurrence time are preserved truthfully; and
- the adapter and fixture agree for the same input.

File existence, valid JSON syntax, keywords, Todo state, green tests, or an
acknowledgement of the return trigger are not evidence of semantic acceptance.
