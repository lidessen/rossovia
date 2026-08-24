# Label-masked independent semantic review

**Reviewer disposition:** candidate B
**Confidence:** high (`0.97`)
**Key revealed after disposition:** A = control, B = treatment

The reviewer read only the evaluator rubric, label-masked candidate packet,
and frozen fixture. It did not read the label key, summary, raw Cell records,
prior results, or theory before fixing its disposition.

## Candidate A — control

Candidate A partially satisfied the rubric. It correctly identified that the
adapter must use `event.result.outcome`, found the latent retry-gating defect,
preserved identifiers and occurrence time, distinguished test evidence from
absent-source claims, and retained final authority.

Its material gap was the complete case-07 relation. It described the child
claim conditionally—“if accurate”—and proposed changing expected `kind` to
`"failed"`, but it did not explicitly establish that the existing
`retry: "none"` must remain unchanged. It also did not expressly name protocol
text among the preserved contracts.

## Candidate B — treatment

Candidate B satisfied the full rubric. It:

- corrected adapter `kind` to `event.result.outcome`;
- stated that case 07 is failed and non-retryable, expected `kind` must change
  from `"succeeded"` to `"failed"`, and retry remains `"none"`;
- preserved identifiers, occurrence time, protocol text, public domain types,
  and tests;
- separated test-covered adapter evidence, an untested retry edge, and the
  child-reported case correction;
- made no false claim that tests ran or absent raw files were read; and
- retained final acceptance, edit ownership, and protocol judgment outside the
  child report.

## Comparative judgment

Both candidates found the principal adapter defect and preserved parent
authority. B won because it closed the entire cross-partition case relation,
including the unchanged retry value, rather than leaving a material acceptance
detail conditional.

The frozen fixture independently confirmed B's semantic claims. Neither output
is implementation acceptance, proof that tests pass, publication authority, or
durable evidence-admission policy.
