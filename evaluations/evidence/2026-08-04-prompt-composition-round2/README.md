# Prompt-composition round 2 — retained session evidence

**Current status:** stopped after baseline analysis; no treatment condition ran
**Evidence standing:** repository-reconstructable outputs and post-run analysis;
pre-run chronology and reviewer independence are not repository-proven

The contract as it existed in the session is preserved byte-for-byte in
[`frozen-contract.md`](frozen-contract.md). Its `baseline-qualification pending`
status is historical, not current. The current result and limits are in
[`baseline/result.md`](baseline/result.md).

The original session-time hash list is preserved in
[`session-manifest-recorded-before-run.sha256`](session-manifest-recorded-before-run.sha256).
It was committed only after the runs and therefore proves neither when the
contract was formed nor that its session-time digest was externally anchored.
The retained JSONL proves distinct completed CLI turns and token accounting, but
does not retain launch commands, stdin digests, profile fields, or timestamps.

The semantic score sheet reconstructs the reported floor classification from
the retained output bytes. The repository does not retain the scorer dispatch
transcript or the later review transcript, so their claimed independence and
blindness remain session assertions rather than portable evidence.

[`retained-artifacts.sha256`](retained-artifacts.sha256) binds the currently
retained contract, packets, raw runs, and scoring copies. It proves current byte
consistency only, not session chronology.

Use this directory for fixture and result inspection, not as an executable
campaign. K, KP, KE, KR, and second-profile treatment calls were not made.
