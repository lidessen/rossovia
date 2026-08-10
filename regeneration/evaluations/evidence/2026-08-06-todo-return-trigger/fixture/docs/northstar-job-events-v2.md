# Northstar job events v2

A `job.finished` event contains `job_id`, `occurred_at`, and a `result` with an
`outcome` of `succeeded`, `failed`, or `cancelled`.

The normalized transition keeps `job_id` and `occurred_at`. Its `kind` is the
event's declared outcome. Retry eligibility is independent of success and
cancellation: only a failed result with `retryable: true` is `eligible`; every
other transition has retry value `none`.
