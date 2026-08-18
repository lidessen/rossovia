# Confirmed incident facts

- On July 18 at 09:12 UTC, queue workers running release 1.8.0 began processing
  some delivery jobs more than once.
- Seven of 214 jobs were processed twice. Three customers received duplicate
  email notifications. No duplicate billing occurred.
- The on-call operator disabled the new scheduler at 09:41 UTC. The remaining
  backlog cleared at 10:08 UTC.
- The worker recorded its queue acknowledgement after calling the external
  email API. The queue's retry visibility timeout was 20 seconds.
- For the seven duplicated jobs, the email API call took longer than 20
  seconds. The queue made the jobs visible again before the first worker
  recorded its acknowledgement.
- The team rolled release 1.8.0 back and raised the visibility timeout to 90
  seconds as immediate containment.
- The Queue team owns the durable fix: attach an idempotency key to each
  delivery job and require the email boundary to reject a repeated key.
- The durable fix is due July 25.
- Current logs cannot establish whether shorter-latency duplicate attempts
  happened before July 18. This remains unknown.

Do not add motives, blame, customer reactions, financial impact, recurrence
claims, or assurances that are not present above.
