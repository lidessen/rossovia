# Current Stage Preparation Group Operational Review

**Status:** [draft PR #17](https://github.com/lidessen/skills/pull/17) opened — awaiting remote verification and review
**Content opinion:** [current-stage committee review](2026-07-15-current-stage-content-committee-review.md)
**Reviewed target:** `d66a125d04ad8294dbfe6742ba007ab9a5f3015b`
**Mission:** [`formal-operations-transition`](../../../operations/missions/formal-operations-transition.json), branch `current-stage-integration`

## Object and boundary

The preparation group reviews operation and maintenance: evidence retention,
verification, budget conversion, branch/PR handoff, recovery, and remaining
gates. It does not redefine project content, convert a model recommendation
into acceptance, push the branch, or merge.

## Independent review execution

The first authorized invocation failed after 40 main-loop steps because the
terminal recovery output did not inherit the structured output contract. Its
[failed-run Chronicle record](../../../chronicle/records/2026/07/obs-20260715-current-stage-review-output-recovery-failure.json)
retains the 3,281,432 reconstructed tokens, approximately USD 0.044763, the
incorrect zero-token settlement, and the absence of a usable review.

Commit `d66a125` repaired that runtime boundary and added a regression proving
that main-loop work, recovery terminal submission, structured output, and all
usage settle together. The Principal then authorized one corrected rerun. It
settled as `passed` in 79.272 seconds:

| Observation | Result |
|---|---:|
| Main-loop steps | 25 |
| File reads / listings | 59 / 8 |
| Input / cached input | 1,626,189 / 1,412,864 tokens |
| Output / total | 7,654 / 1,633,843 tokens |
| Revised-estimate ratio | 0.495104 of 3.3M |
| Estimated cost | USD 0.035965 |
| Terminal and output verification | passed / passed |

The successful run remains a local source record with digest
`2a11142e4e013113cebe2982e34ccc403694bba4f86cc53b33757c094dbb3161`;
its compact [Chronicle receipt](../../../chronicle/records/2026/07/obs-20260715-current-stage-independent-review-rerun.json)
retains the decision-relevant observations. The 14.9 MB raw trace is not added
to Git merely to make the review look more durable.

## Finding verification

The preparation group reproduced the review's only alleged blocker against the
exact target SHA and the current source tree. The named skill exists in both,
and `npm run build` succeeds with zero Astro diagnostics and eight generated
pages. The blocker and partition-C return are rejected. The CLI directory-path
message is reproducible from source but does not change safety, build, or
integration behavior. No correction branch is opened.

The report's cross-field inconsistency is retained as an operational
limitation: `outputSchema` verifies shape, while evidence and recommendation
consistency still require a caller-owned verifier. A future review-contract
improvement may separate active findings from retractions and validate
recommendation/partition agreement, but it is not a hidden precondition for
this PR because the current verifier performed that work explicitly.

## PR #17 AI review disposition

Gemini Code Assist submitted two unresolved inline threads on the first draft
head:

| Thread | Verification | Disposition |
|---|---|---|
| [Site dependency versions do not exist](https://github.com/lidessen/skills/pull/17#discussion_r3588326250) | npm registry resolves Astro `7.0.9`, Starlight `0.41.3`, and TypeScript `6.0.3`; the lockfile names their registry tarballs; local build and current-head `verify` pass. | **Rejected as stale model knowledge.** Do not downgrade working, locked dependencies to the reviewer's remembered 4.x/0.22.x/5.x examples. |
| [`mapConcurrent` is duplicated](https://github.com/lidessen/skills/pull/17#discussion_r3588326260) | `activation-field.ts`, `candidate-field.ts`, and `residual-readout.ts` contained structurally equivalent local implementations while `concurrency.ts` already owned ordered bounded mapping. | **Accepted.** All three modules now import the shared implementation; typecheck, 13 focused tests, and all 69 Work Cell tests / 300 assertions pass. |

These dispositions answer claims with runtime and repository evidence rather
than accepting or rejecting them by reviewer severity. Thread replies and
resolution occur only after the correction commit is pushed and its current-head
verification is visible.

## Current deterministic evidence

- Sequence snapshot dry-run passed for all packaged snapshots.
- Observation Chronicle validation and validator tests passed; the successful
  rerun receipt becomes the ninth project record.
- Mission Record tests and the active mission check passed.
- Work Cell frozen installation, typecheck, and all 69 tests / 300 assertions
  passed after the recovery repair.
- Site cold installation and prior link verification passed; the current fresh
  build again reports zero diagnostics and eight pages.
- Intervention reconciliation and install-source safety tests passed.
- `git diff --check` passes for the prepared evidence changes.

These are local and retained checks. Remote verification has not yet run on a
PR containing the complete current head.

## Operational opinion and next gate

The `current-stage-integration` branch was committed, pushed, and proposed as
[draft PR #17](https://github.com/lidessen/skills/pull/17). It is not ready to
merge yet. The remaining movement is:

1. wait for current-head remote verification and AI review comments;
2. disposition every material comment with evidence;
3. present a compact merge / return / hold brief to the Principal.

PR #16, the 129 staged sibling-worktree entries, preparation F4, and preparation
F5 remain separate open return obligations. Opening the integration PR does not
settle them or authorize merge.

## Reopening observation

Return to execution if the PR head differs materially from the reviewed target,
remote verification fails, a review comment reproduces a material defect, or
the retained raw-run digest no longer identifies the source used by these
reports. Return to the Principal if pushing/opening the PR is not authorized.
