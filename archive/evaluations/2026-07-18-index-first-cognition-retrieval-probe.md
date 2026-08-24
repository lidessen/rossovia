# Index-first Cognition Retrieval Probe

**Date:** 2026-07-18
**Source revision:** `HEAD e6eb2d38440f` plus frozen staged tree
`25c339ebc42f6dd9440b4368b3ed62cbb1d5c647`
**Model:** DeepSeek `deepseek-v4-flash`
**Status:** routing and runtime-bounded expansion reduced attention cost but did
not improve the source-truth decision; retrieval alone is rejected as the
verifier repair

## Question

Can a rebuildable retrieval projection route a verifier to the smallest raw
evidence needed for one decision, while leaving fact authority with the frozen
source and improving either semantic discrimination or retrieval cost?

The retained reconciliation candidate supplied a useful counterexample. Its
`limitations[2]` falsely stated that the preceding work ended without satisfying
its terminal-tool contract. The retained four-Cell Swarm index recorded all
four Cells as passed, and each raw Cell record retained a passing terminal
verification. An earlier broad-source verifier had missed this defect.

## Controlled field

All Cells received the same candidate, frozen repository, four raw execution
records, terminal schema, acceptance conditions, model route, and read-only
tool surface. The evaluator did not disclose the known defect.

Two broad-source repetitions discovered relevant evidence without a navigation
projection. Two index-first repetitions additionally received a 6.3 KB typed
projection containing ten query-hook groups and source or artifact references.
The projection declared `authority: none`; workers had to expand raw references
and cite those sources rather than the index.

After the first result, a second two-repetition treatment added only line
locators to the execution-record references. It added no truth values or
summaries. This tested whether prompt-visible locators could make expansion
bounded without changing the evidence field.

Raw manifests, traces, and terminal submissions remain under the ignored
`.work-cell/cognition-rag-index-probe/` directory.

## Observations

| Run group | Repetitions | Known defect caught | Average tokens | Maximum duration | Approximate group cost |
|---|---:|---:|---:|---:|---:|
| broad raw-source discovery | 2 | 0/2 | 3,083,245 | 77.3s | included below |
| file-level index first | 2 | 0/2 | 591,963 | 33.0s | included below |
| index plus prompt line locators | 2 | 0/2 | 5,052,751 | 60.8s | $0.34107 |
| runtime-bounded selected fields | 1 | 0/1 | 169,104 | 21.1s | $0.01017 |

The first four-Cell comparison used 7,350,415 tokens and approximately
`$0.42066` in total. Within that run, file-level index-first delivery used
1,183,925 tokens versus 6,166,490 for broad discovery, an 80.8% reduction. This
supports an attention-routing effect for that execution, but token variance was
large and neither treatment improved the verifier verdict: all four Cells
returned `pass` with no defects.

The first indexed repetition opened only the first 100 lines of each raw Cell
record, while terminal verification appeared near lines 169–183. The corrected
index therefore named lines 1–200 or 1–205 for those records. Both later Cells
ignored the declared locators and called `read_file` without an end line,
loading all four 480–620 KB records. Their combined use rose to 10,105,502
tokens, and both again returned an unsafe `pass`.

This is not a failure of `read_file` range support: the same traces contain
successful bounded reads for repository source. It is a delivery-control
failure. A locator written in context remains advisory; the model may still
expand the whole artifact. A large execution trace is also the wrong retrieval
unit even when it is technically one file.

### Runtime-bounded expansion follow-up

The final treatment mechanically selected only `$.record.status` and
`$.record.verification.terminal` from each content-addressed raw record before
model access. Its 2.6 KB evidence page retained each source path, SHA-256, and
selector. Workspace policy excluded the four complete records, so the model
could not bypass the slice through `read_file`.

This delivery mechanism behaved as intended. The Cell read the candidate,
bounded retrieval index, Swarm index, and selected settlement page first; it
never opened a whole execution record. It used 169,104 tokens in 21.1 seconds,
94.5% fewer tokens than the broad-discovery average and 71.4% fewer than the
file-index average.

It nevertheless returned `pass` with no defects. The selected page stated four
`passed` statuses and four terminal results with `passed: true`, matching
`required` and `called` `submit_cognition` tools. The candidate's contrary
`limitations[2]` was present in the 14.8 KB candidate read immediately before
the page. The failure therefore cannot be attributed only to unavailable,
oversized, or unbounded execution evidence. Retrieval delivered the decisive
material, but the audit did not pair every candidate assertion with that
material.

## Revised judgment

The probe supports RAG-like retrieval as a **disposable attention index**, not
as knowledge or verification authority. File-level routing and runtime-bounded
expansion can substantially reduce retrieval cost, but this case gives no
evidence that either improves factual judgment. More retrieval prompt
instruction is not the next repair.

For large structured artifacts, bounded expansion needs a mechanism-enforced
reference rather than a prose locator. A candidate interface is:

```text
retrieve(query, decision) -> typed ranked references
expand(reference)         -> bounded content selected by the reference
trace(reference)          -> source path, revision/hash, selector, and lineage
```

`expand` must apply its selector in the runtime and return only that slice; it
must not rely on the model to copy a line range into a general file tool.
Generated execution pages may expose typed status and verification fields with
raw-record hashes and selectors, but remain rebuildable projections under P14.
Exact-value, negation, authority, and admission judgments still reopen the raw
source. The final treatment supports this delivery mechanism, but explicitly
disconfirms the stronger claim that bounded retrieval alone repairs the tested
verifier.

## Disposition and next practice

Do not add a vector database, generic RAG dependency, cognition authority path,
or reusable retrieval contract from this result. Do not claim a verified
quality improvement. Retain runtime-bounded expansion as a supported
cost-control direction only.

The next contradiction is audit coverage, not retrieval. The next smallest
probe should deterministically enumerate the candidate's atomic, decision-
changing paths—including each limitation—into an audit queue. Each entry must
settle as `supported`, `contradicted`, or `unverifiable` with a bounded evidence
reference; the terminal schema must reject omitted paths. Reuse the bounded
settlement evidence and run only the entry containing `limitations[2]` plus one
correct boundary claim before scaling to the whole candidate. Reject that form
if it still passes the false limitation or merely copies source text without a
claim-to-evidence judgment.
