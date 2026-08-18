# Matched parent evidence-admission pair

**Audience:** maintainers and reviewers evaluating whether a bounded child
report can become a parent premise without transferring semantic authority.

**Status:** matched pair and label-masked independent semantic review complete.
Treatment was preferred; see [`RESULT.md`](RESULT.md).

**Pinned runtime revision:** `c41561db2d2295acec3b59c5581131e09408a02f`

This development probe tests whether explicit bounded evidence admission, not
only provider variance, explains the semantic recovery observed in the prior
parent-only treatment. It runs one fresh control parent and one fresh treatment
parent over the same frozen seven raw files and the same retained child output.

The runner randomizes and retains execution order. The two model-visible
contracts may differ only in instruction four. Each arm gets an isolated
read-only workspace, the same route, model, inference policy, schema, budget,
and child report. No child Cell or model judge runs.

The two 4,000-token fields are matched contract estimates, not credible usage
forecasts. The pinned same-contract historical parents consumed 43,213 tokens,
98,067 ms of serial runtime, and an estimated $0.00600458 together. Preflight
shows both the summed 8,000-token contract estimate and this evidence-based
planning forecast before authorization.

## Commands

From this directory, run the mechanical-only preflight:

```bash
bun run-parent-pair.ts --preflight ../2026-08-06-todo-return-trigger/fixture
```

The runner was committed after its pinned Work Cell runtime. Use the
[historical preflight reconstruction](../2026-08-07-host-constructed-nested-topology/REPRODUCTION.md)
to combine the exact evidence revision with that runtime; a clean checkout of
either revision alone is insufficient. Any other source-tree digest must fail
closed.

After explicit authorization for the already disclosed fixture and child
report, run into a new absolute output directory:

```bash
bun run-parent-pair.ts --run \
  ../2026-08-06-todo-return-trigger/fixture \
  /absolute/new/output-directory
```

The run retains `execution-order.json` before either external call, each raw
Cell record, `summary.json`, and—only when both arms are mechanically
comparable—a randomized `label-masked-review.json` plus separate
`label-key.json`. An independent reviewer sees the fixture, evaluator rubric,
and masked packet but not the key until its disposition is frozen.

The completed evidence is under [`development-01/`](development-01/). The
review disposition and post-reveal comparison are retained in
[`SEMANTIC-REVIEW.md`](SEMANTIC-REVIEW.md) and [`RESULT.md`](RESULT.md).

## Interpretation boundary

This pair strengthened the evidence-admission hypothesis: treatment fully
recovered the cross-partition case relation while control left one material
detail conditional. It cannot establish a stable general policy. Execution
order, backend fingerprint, and output variance remain context. The direct
single-Cell baseline remains the efficiency reference; the treatment's stronger
semantics came with higher token, duration, and cost than control.
