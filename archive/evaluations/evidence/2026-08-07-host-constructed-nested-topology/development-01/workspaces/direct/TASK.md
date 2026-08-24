# Northstar job-event maintenance

Repair `src/adapters/northstar-job-event.ts` so finished events conform to the
bundled Northstar v2 protocol without changing public domain types, protocol
text, or tests.

Also reconcile `conformance/northstar-job-events-v2/case-07.json` as one valid
input/expected-output conformance example for the repaired behavior.

Acceptance:

- `bun test` passes through a production adapter repair.
- Case 07 is valid under the bundled protocol and semantically consistent with
  the final adapter.
- No unrelated files or contracts change.
