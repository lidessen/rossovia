# Held-out confirmation independent review

- **Reviewer:** Codex independent read-only seat `/root/heldout_code_case`
- **Date:** 2026-08-05
- **Verdict:** admit neither profile as a durable capability profile across the
  tested population.

The reviewer inspected only `heldout-model-evaluation.json`, the completed
`heldout-results/deepseek-v4-flash-heldout-nonthinking-vs-low-SSYYGT/evaluation.json`,
and its eight embedded trial records. It made no edits and called no provider.
The manifest SHA-256 `057f429827499eaf9e52887cb75e1bd56614783a8d2ba8db6e934fec12d63f1a`
matches `evaluation.json.sourceSha256`.

## Acceptance reconstruction

| Case | Non-thinking | Low |
|---|---:|---:|
| migration review, full semantic acceptance | 0/2 | 0/2 |
| task authority boundary, core semantic acceptance | 2/2 | 2/2 |

On the migration review, non-thinking repetition 1 found the target-creation,
failed marker-publication, empty-unmarked-target, and retry-lockout sequence,
but classified it as `ready_with_residual_risk` and offered an incomplete
either/or correction. Repetition 2 missed the seeded defect and approved with
unrelated findings. Both therefore fail the required merge-blocking verdict and
bounded correction. Both low records have no output because they reached the
180-second boundary.

All four task-boundary outputs support only exact guarded recovery, reject
immediate task acceptance and consumed-receipt reuse, preserve Workbench versus
runtime state ownership, and retain the required non-proofs. Some citations are
less exact than requested, so this is core semantic acceptance rather than an
exact reproduction of every reference phrase.

## Settlement and resource evidence

| Profile | Runtime settlement | Duration | Recorded tokens | Estimated cost |
|---|---:|---:|---:|---:|
| non-thinking | 4/4 | 36.266–147.989 s; mean 89.342 s | 208,281 | $0.02966725 |
| low | 2/4 | 56.525–180.004 s; mean 137.803 s | 137,427 | $0.02488395 |

Both low migration runs exhausted 16,000 reasoning tokens with a length finish,
entered structured settlement, and ended without output or
`structured.settlement.finished`. Low's lower aggregate cost is therefore
confounded by two cancellations. On the two settled task-boundary runs, low
averaged 95.604 seconds versus 38.433 seconds for non-thinking and cost about
$0.01258 versus $0.00881.

Non-thinking was stable on task-boundary reconstruction but unstable on the
discriminating migration judgment. This distinction prevents mechanical
`status: passed` from being promoted into semantic acceptance.

## Judge and admission boundary

The migration comparison was correctly skipped because low had two unsettled
trials. The task-boundary Kimi K3 comparison failed to call
`submit_judgement` after one recovery, so the record truthfully retains
`preferred: inconclusive`, unknown criteria, and the judge error. A separate
synthetic positive control can establish that the protocol sometimes settles;
it cannot replace the missing judgment on this evidence packet.

- **Non-thinking:** do not admit the broad profile. Retain only a promising
  narrow candidate for source-grounded authority-boundary analysis, with
  independent verification.
- **Low:** do not admit. It shows no held-out semantic advantage, fails to
  settle the complex review, and has high latency variation.
- **Reopen only with new evidence:** use a fresh held-out repository review
  after resolving the low reasoning/settlement boundary and verifying the judge
  on representative evidence volume before it sees held-out outputs.
