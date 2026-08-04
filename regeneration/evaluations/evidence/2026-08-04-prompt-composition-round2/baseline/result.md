# Round-two baseline qualification result

**Result:** stopped before treatment
**Reason:** all four task-language strata met the frozen floor definition
**Treatment calls made:** 0
**Second-profile calls made:** 0

The frozen contract was externally anchored before the first output by the
`frozen-manifest.sha256` digest
`dd6e767b088f6ca171722dfb71793276f1632c6e720f2296d0d1851e60592fbe`.
The 36 raw run artifacts are bound by `runs.sha256`, whose digest is
`c761da10eb51896b79c4a321632b00df5b6973d12d852e1fe665685bdd877a93`.

All 12 requested `gpt-5.6-sol` / `low` processes produced distinct threads,
nonempty final answers, `turn.completed`, no error events, no non-message tool
items, empty stderr, and exit code 0. The JSONL does not expose provider route
identity; only the requested route and frozen client profile are reconstructable,
so provider identity is unavailable rather than inferred.

An independent, non-producing `gpt-5.6-terra` / `high` semantic scorer received
only the frozen rubric, task-language packets, and opaque output copies. It
marked no score as needing adjudication. The campaign owner separately checked
the gate-changing phrases against the raw outputs. A second independent reviewer
then audited only the frozen gate application.

| Stratum | Original runs | Fully correct | Frozen classification | Gate-changing repeated miss |
|---|---|---:|---|---|
| T1 English | `r2b-02`, `r2b-05`, `r2b-10` | 0 / 3 | floor | all three allocate work to Candidate B |
| T1 Chinese | `r2b-04`, `r2b-08`, `r2b-11` | 0 / 3 | floor | all three make B a default or production allocation |
| T2 English | `r2b-03`, `r2b-07`, `r2b-12` | 0 / 3 | floor | all three add unsupported continuation-decision status |
| T2 Chinese | `r2b-01`, `r2b-06`, `r2b-09` | 0 / 3 | floor | all three infer causal purpose from the prior chronology |

Under the frozen rule, a floor in any stratum stops the campaign. With four of
four strata at floor, K, KP, KE, KR, and second-profile treatment execution are
forbidden in this campaign. No carrier effect was tested, so the result neither
supports nor refutes relation kernels, Principle expressions, examples, roles,
or ordering.

The retained result is a fixture-validity finding: before a carrier matrix, a
baseline needs usable headroom rather than universal failure through one action
or hard boundary. A replacement task must start a new campaign; it cannot be
substituted into this one after results.
