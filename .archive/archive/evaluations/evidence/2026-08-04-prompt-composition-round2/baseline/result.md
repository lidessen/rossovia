# Round-two baseline qualification result

**Result:** stopped before treatment
**Reason:** retained outputs classify all four task-language strata as floor
**Treatment calls made:** 0
**Second-profile calls made:** 0

The session-time contract and manifest were committed only after the runs. The
repository therefore cannot prove their pre-run chronology or the external
anchor asserted during the session. The preserved contract bytes still match
the README digest recorded in
`session-manifest-recorded-before-run.sha256`; this is consistency evidence,
not pre-registration evidence. The 36 raw run artifacts are bound by
`runs.sha256`, whose digest is
`c761da10eb51896b79c4a321632b00df5b6973d12d852e1fe665685bdd877a93`.

All 12 requested `gpt-5.6-sol` / `low` processes produced distinct threads,
nonempty final answers, `turn.completed`, no error events, no non-message tool
items, empty stderr, and exit code 0. The JSONL does not expose provider route
identity; only the requested route and frozen client profile are reconstructable,
so provider identity is unavailable rather than inferred.

The retained score sheet reports a `gpt-5.6-terra` / `high` semantic scorer and
marks no score as needing adjudication. Its cited phrases match the raw outputs.
The repository does not retain the scorer dispatch transcript or the second
review transcript, so blindness and independence are attribution-unproven.

| Stratum | Original runs | Fully correct | Frozen classification | Gate-changing repeated miss |
|---|---|---:|---|---|
| T1 English | `r2b-02`, `r2b-05`, `r2b-10` | 0 / 3 | floor | all three allocate work to Candidate B |
| T1 Chinese | `r2b-04`, `r2b-08`, `r2b-11` | 0 / 3 | floor | all three make B a default or production allocation |
| T2 English | `r2b-03`, `r2b-07`, `r2b-12` | 0 / 3 | floor | all three add unsupported continuation-decision status |
| T2 Chinese | `r2b-01`, `r2b-06`, `r2b-09` | 0 / 3 | floor | all three infer causal purpose from the prior chronology |

Applying the preserved rule after the fact yields floor in all four strata. No
K, KP, KE, KR, or second-profile treatment execution occurred. No carrier effect
was tested, so the result neither supports nor refutes relation kernels,
Principle expressions, examples, roles, or ordering.

The retained result is a fixture-validity finding: before a carrier matrix, a
baseline needs usable headroom rather than universal failure through one action
or hard boundary. A replacement task must start a new campaign; it cannot be
substituted into this one after results.
