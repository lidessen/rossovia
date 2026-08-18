# Host-constructed nested delegation topology probe

**Audience:** maintainers and reviewers deciding whether child-report-to-parent
integration is a useful delegation form; this is an evidence packet, not an
Agent operating guide.

**Status:** one mechanically comparable development repetition and independent
label-masked semantic review complete. The direct Cell was accepted; the
nested parent was rejected after losing one material case relation during
reconstruction.

**Pinned runtime revision:** `c41561db2d2295acec3b59c5581131e09408a02f`

**Question:** on one real multi-file compatibility review, does a bounded child
report let a parent preserve final-answer quality while changing attention
load, duration, and token cost relative to one Cell reading the whole source
set directly?

This probe exercises the consequence-proportional delegation relation recorded
in the
[delegation research](../../../design/research/agent-delegation-and-dynamic-workflows.md),
but it cannot establish that native autonomous re-delegation works. Work Cell
currently runs one Cell at a time, so the host constructs and records the
topology explicitly.

## Frozen task and source partition

The source is the nine-file
[Northstar todo-return fixture](../2026-08-06-todo-return-trigger/fixture/).
[`fixture.sha256`](fixture.sha256) freezes the exact file set and bytes. Workers
do not receive the source experiment path, prior results, this README, or the
evaluator-only rubric.

| Producer | Raw source granted | Returned object |
| --- | --- | --- |
| direct Cell | all nine files | final compatibility report |
| nested child | protocol and case 07 only | bounded protocol/case report |
| nested parent | the other seven files plus the schema-valid retained child report | final compatibility report |

The child and parent raw-source partitions are disjoint and their union equals
the direct Cell's raw source set. The direct and nested-parent Cells use the
same final output schema and retain final judgment. The child may report only
its bounded source relation; it cannot accept the whole or make implementation
claims.

The topology deliberately changes representation: the direct Cell sees two
raw sources that the nested parent sees only through a child report. That is
the treatment being tested, not an input-identity claim.

## Mechanical and semantic boundaries

[`run-topology.ts`](run-topology.ts) may verify only:

- packet, fixture, Work Cell source, and raw-source partition identity;
- Cell input and structured-output schema shape;
- read-only workspace preservation;
- configured route and observed serving-route consistency; and
- per-Cell duration and usage, with nested usage and duration summed across
  child and parent.

It records an independent before/after tree hash for every copied workspace.
It stops before the nested arm when the direct Cell has an invalid status,
output, workspace, or serving-route observation. It stops before the parent on
the same child failures or when the child's serving route differs from the
already admitted direct Cell. Each Cell gets one host-approved bounded budget
extension at most; the request and decision remain in the Work Cell record.
This avoids a silent hard cut while keeping the authorized probe bounded.

The runner does not encode semantic correctness. After execution, an
independent reviewer must review the two label-masked final reports against
[`evaluator-only/review.md`](evaluator-only/review.md). The reviewer does not
reward output shape, confidence, or verbosity and does not receive the arm key.
After a mechanically valid run, the host creates the historically named
`blind-review.json` with random A/B labels and a separate `blind-key.json`.
Candidate content may still reveal topology, so this is label masking rather
than full blinding. Grant the reviewer only the frozen fixture, rubric, and
label-masked packet; reveal the key after its disposition.

## Prepared runtime

[`packet.json`](packet.json) pins the runner, fixture manifest, evaluator
rubric, Work Cell source tree, topology, and one explicit
`deepseek/deepseek-v4-flash` route with low reasoning. The initial token
forecast is 12,000 across three Cells; it is a forecast, not a stop condition.
There is no fallback route and no external semantic judge call.

From this directory, the following command performs only local parsing, hash
verification, route-shape validation, schema compilation, and Cell-contract
validation:

```bash
bun run-topology.ts --preflight
```

The runner was committed after its pinned Work Cell runtime. Use the
[historical preflight reconstruction](REPRODUCTION.md) to combine the exact
evidence revision with that runtime; a clean checkout of either revision alone
is insufficient. Any other source-tree digest must fail closed.

The verified preflight reports `externalModelCalled: false`, a matching Work
Cell source-tree digest, nine matching fixture files, three parsed Cell
contracts, compiled schemas, and an available credential without disclosing
it. The runner also passes strict standalone TypeScript checking through the
repository's installed compiler and Bun types.

An authorized live run has this interface:

```bash
bun run-topology.ts --run <absolute-frozen-fixture-directory> <absolute-new-result-directory>
```

The output directory must not already exist or contain the fixture. The runner
creates neutral per-Cell workspaces there and retains three full Work Cell
records, `summary.json`, and—only after mechanical admission—the label-masked
packet and key. A live run spends external model capacity and
therefore requires an explicit Principal authorization; discoverable
credentials and a passing preflight are not permission to run it.

## Execution checkpoint

The first authorized attempt is retained under
[`development-01/summary.json`](development-01/summary.json). The direct Cell
failed after 6,034 ms because the sandbox could not connect to the API. Its
record retains zero input, output, and cached tokens, no observed serving route,
and identical before/after workspace-tree hashes. The runner correctly did not
start the child or parent.

A first network-enabled retry was rejected before process creation because the
authorization did not explicitly name disclosure of the nine frozen fixture
files to DeepSeek. After the Principal supplied that exact authorization,
[`development-02`](development-02/summary.json) completed mechanically and
created the label-masked packet. The independent
[`label-masked review`](LABEL-MASKED-REVIEW.md) rejected the nested-parent candidate and
accepted the direct candidate. [`RESULT.md`](RESULT.md) records the revealed
comparison, costs, bounded conclusion, and next probe.

## Interpretation after a run

A single development repetition can validate the mechanism and reveal gross
quality or cost loss. It cannot establish a general delegation advantage.
Treat the comparison as mechanically inconclusive if any Cell fails, writes to
its workspace, lacks a structured output, or observes a different serving
route. Backend fingerprints are retained as context but are not assumed stable
across requests.

Semantic review should record, for each label-masked final report, whether it finds
both seeded defects, preserves retry, identifier, time, protocol, domain, and
test contracts, and correctly withholds durable acceptance. Compare direct
usage and duration with child-plus-parent totals. Continue to a harder fixture
only if this minimum path completes mechanically and the compressed report
does not erase decision-relevant evidence.
