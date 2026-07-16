# Project Cognition Bootstrap and Refresh Probe

**Date:** 2026-07-16
**Subject:** [`lidessen/shilu`](https://github.com/lidessen/shilu)
**Base revision:** `aa53ed8`
**Target revision:** `1cac9bb`
**Model:** DeepSeek V4 Flash through the Work Cell AI SDK 7 adapter
**Status:** bootstrap decision value and selective refresh supported in this
second project; durable form and general calibration remain unselected

## Question and fixed gates

The [Strategy Case](../../design/organization/sessions/2026-07-16-project-cognition-bootstrap-strategy-case.md)
and [Work Estimate](../../design/organization/sessions/2026-07-16-project-cognition-bootstrap-work-estimate.md)
asked whether source-linked semantic decomposition could build a more useful
project model than one whole-project Cell, then refresh a committed delta
without creating a second canon or rebuilding everything.

The gates were fixed before model output:

- compare against one strong whole-project baseline on withheld questions;
- preserve typed authority, causal, state, evidence, and projection relations;
- admit a cognition claim only through source checking, not mechanical pass or
  agreement;
- keep Work Cell and Swarm generic while a caller/domain method owns semantic
  decomposition;
- support incremental refresh only if at least one prior cognition facet is
  retained unchanged and no material changed edge is missed; and
- route any durable Skill/runtime/storage choice to a later form decision.

The dirty 27-path Shilu checkout was excluded. Detached worktrees supplied the
two committed source trees, so the probe did not read or mutate those local
changes.

## Baseline observation

Run `f0444c25-da3d-4705-97a3-e29ae99b7055` read 58 of 72 files, passed its
terminal and structured-output contracts, and used 435,974 tokens. It produced
a broad 16-component, 40-relation model, but no Go tests were read.

The model materially overstated source claims. Most importantly, it described
[`CommitOperations`](https://github.com/lidessen/shilu/blob/aa53ed8/pkg/core/operations.go)
as atomic all-or-nothing even though operations commit sequentially and no
rollback exists. It also described CLI/MCP equivalence too strongly and missed
several crash, event, review, and recovery relations. A mechanically valid,
wide-coverage model was therefore not a sufficient cognition baseline.

## Task-specific bootstrap decomposition

The caller selected five packets from the actual Shilu boundaries, not a fixed
runtime taxonomy:

1. mutation authority;
2. persistence and projections;
3. ingestion lifecycle;
4. public CLI/MCP surfaces; and
5. adversarial verification.

The first Swarm run `873ec989-5a24-4280-80b9-3fd073282446` used 1,746,173
tokens. Three packets passed. Two completed their investigation and terminal
call but exceeded or failed the separate response-format output path.
The verification packet correctly exposed the false batch-atomicity claim,
entry→index→event partial-failure ordering, approximate CLI/MCP parity, missing
event replay, and untested crash/concurrency boundaries.

Output-only retries did not justify accepting the failed packets. A compact
response-format retry still failed schema generation; a terminal-report retry
recovered public surfaces but persistence produced truncated invalid JSON. The
caller then applied the predeclared adaptive rule: split only persistence along
the durable-store versus catalog/runtime boundary. Run
`91dc66bf-80b1-421b-a24e-f86cb6ccec45` produced two valid children in 225,774
tokens with 5.9% estimate error. Successful siblings were not rerun.

This supports adaptive semantic partitioning, not the original five packet
names. The later delta used a different decomposition.

## Cognition carrier correction

A first synthesis attempted one integrated model artifact. The Principal
intervened that a large single file is difficult for agents to read and revise;
the run was stopped before an artifact or settled record existed. The corrected
shape became an index plus question-owned facets.

A second intervention rejected the opposite overcorrection: strict 8–12KB
chunking, nested manifests, and hard terminal string limits made the carrier and
protocol more complex without improving meaning. The retained minimum is:

```text
index.json
authority.json
state-persistence.json
lifecycle.json
public-contract.json
```

The index is about 2–3KB; base facet files are about 11–15KB. Size is soft
guidance. A facet splits by meaning only when one agent can no longer read and
revise its question coherently. Raw Cell records remain cold evidence referenced
by run identity and are never default context.

The faceted synthesis run `fb099041-50f4-44e1-811a-ccd45c1e7949` also exposed a
runtime issue: all four valid JSON artifacts were written, but three Cells
finished without the required terminal call and settled `protocol_error`.
Recovered artifacts were labeled as proposals rather than silently upgraded to
passed results.

## Withheld-question comparison

Two independent evaluators read the baseline, the simple carrier, and only the
Shilu source needed for five predeclared questions.

- The passed authority/lifecycle/recovery evaluator found the carrier materially
  better on Q1, Q4, and Q5. It recovered false batch atomicity, MCP human-actor
  bypass, review-resolution limitations, claimed-job recovery, partial event and
  index states, non-atomic file writes, and event-sequence restart risk that the
  baseline missed or understated.
- The Q2/Q3 evaluator completed a source-backed report but violated two overly
  strict report limits (`decisionDelta <= 800`, at most eight anchors), so its
  terminal call was rejected. The retained invalid payload found the carrier
  equal on basic entry/index/event coherence and more precise on CLI/MCP
  delegation and parity. This is recoverable proposal evidence, not a passed
  Cell.

The carrier therefore meets the predeclared decision delta: it recovered
multiple decision-relevant relations the baseline missed without an evaluator
finding a new material source error. It does not establish automatic correctness.

## Selective refresh

The committed delta `aa53ed8..1cac9bb` changed 11 paths across Entry shape and
validation, storage, catalog/FTS migration and tests, CLI, and MCP.

The caller did not reuse the bootstrap packet plan. It formed two changed-relation
clusters:

| Facet | Disposition | Reason |
|---|---|---|
| authority | reuse exact hash | memory surfaces are read-oriented; actor, validation/commit, review, and processor authority relations are invariant |
| lifecycle | reuse exact hash | source, job, processor, provider, review, retry, and terminal transitions are unchanged |
| state-persistence | refresh | Context, kinds, entry frontmatter, catalog schema/FTS, tags, partial recall, link search, migration, and tests changed |
| public-contract | refresh | CLI/MCP context and memory surfaces, parameters, delegation, and parity changed |

Run `07b5eec5-6933-4059-a873-06b8859c3489` refreshed only the two affected
facets, inspected all 11 paths, passed both Cells, and used 167,677 tokens. The
refreshed index preserved the two reused hashes.

Independent audit run `bca3f9a5-a32d-46b0-bcdc-95b43d97da22` read both source
revisions and the refreshed carrier. It used 1,002,055 tokens and confirmed:

- both reuse reasons remained valid;
- both refreshed facets covered every material changed relation in their source
  cluster;
- Q6 correctly distinguished record/search capability from agent-memory recall;
- Q7 preserved invariant authority/lifecycle relations while adding Context,
  kinds, FTS tags/OR recall, link search, public surfaces, and migration risks;
- Q8 recovered the callers, indexes, migrations, tests, and public contracts for
  future kind or search-tokenization changes.

Selective refresh is therefore supported in this delta. The low-cost refresh
does not make the million-token independent audit an ordinary per-change step;
that audit is calibration evidence for this phase.

## Work and cost audit

| Stage | Tokens | Recorded approximate cost | Settlement |
|---|---:|---:|---|
| whole-project baseline | 435,974 | `$0.03285` | passed, materially incomplete |
| first five packets | 1,746,173 | `$0.12404` | 3 passed, 2 output failures |
| compact + terminal retries | 1,322,061 | `$0.06539` | public recovered; persistence still invalid |
| targeted persistence split | 225,774 | `$0.01300` | 2 passed |
| faceted synthesis | 2,451,924 | `$0.11208` | 1 passed, 3 recoverable artifacts with protocol errors |
| withheld evaluation | 1,129,880 | `$0.03379` | 1 passed, 1 recoverable invalid terminal payload |
| selective delta refresh | 167,677 | `$0.00998` | 2 passed |
| independent delta audit | 1,002,055 | `$0.01729` | passed |
| **retained settled observations** | **8,481,518** | **`$0.40843`** | excludes two interrupted runs without retained usage |

The probe is not a cost-reduction result. Bootstrap and calibration were more
expensive than one model, while the proven incremental refresh was much cheaper
than reconstruction. Estimates were particularly poor when a Cell repeatedly
read inputs or retried terminal/artifact completion. Future projections must
separate investigation, synthesis, recovery, refresh, and audit profiles.

## Method and architecture conclusion

The evidence supports this boundary:

```text
domain Skill/method -> decomposition strategy and synthesis method
agent/caller        -> project-specific partition plan and adaptive repartition
context engineering -> deliver the selected cognition/source slice
Work Cell           -> bounded execution, tools, artifacts, verification, record
Swarm/kernel        -> release, concurrency, isolation, settlement
cognition carrier   -> small index + semantic facets + cold evidence references
human/source review -> fact admission and durable form decision
```

Work Cell and Swarm must not gain fixed `authority`, `lifecycle`, review, or
repository packet presets. A domain method may offer candidate cuts, but the
agent selects a plan from the actual project, named decision, responsibility,
causal, state, authority, evidence, and changed-relation field. Only the failed
or invalidated portion is repartitioned.

Current evidence justifies a `form-guidance` decision. It does not yet justify:

- copying Shilu's Entry authority into this repository;
- a database, vector index, daemon, or Shilu dependency;
- a universal project-cognition runtime inside Work Cell;
- strict file-size or report-length protocol limits; or
- treating model artifacts, terminal payloads, or consensus as facts.

The form review must compare no new artifact, an installable domain Skill, a
small source/ledger adapter with local projection storage, and a future optional
Shilu protocol. Independently, Work Cell should later examine artifact-first
terminal recovery and warning/noise retention as generic AX/runtime issues; that
repair is not part of the cognition domain method.

## Reopening observations

Reopen or reject the cognition claim if another project cannot form stable
semantic packets, a small change invalidates nearly every facet, reused hashes
hide a changed decision relation, index-routed context performs no better than
direct source reading, or maintaining the projection costs more than rebuilding
the relevant source model on demand.
