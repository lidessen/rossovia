# Work Estimate — Project Cognition Bootstrap Probe

**Status:** proposed for the approved discovery mission
**Decision horizon:** mission
**Current state and sources:** [Strategy Case](2026-07-16-project-cognition-bootstrap-strategy-case.md),
[scale-control probe](../../../regeneration/evaluations/2026-07-15-project-cognition-scale-control.md),
and Shilu's committed source tree
**Target state / decision:** determine whether a typed, semantically partitioned
project model improves a second-project cognition task and supports bounded
incremental refresh strongly enough to justify a later form decision
**Estimator:** session convener using `work-estimation`
**Human approver, if envelope follows:** Principal; no implementation envelope
is requested by this estimate

## Fixed experimental field

- **Subject repository:** `lidessen/shilu`
- **Bootstrap revision:** `aa53ed8f` — FTS5 + BM25 search, before the memory-backend change
- **Delta revision:** `1cac9bbf` — memory kinds, tag indexing, partial recall,
  CLI/MCP surfaces, storage/type validation, and regression coverage
- **Observed delta:** 11 paths, 279 insertions, 16 deletions across CLI, MCP,
  index, storage, types, and tests
- **Local carrier:** detached clean worktree at the bootstrap revision; the
  27-path dirty Shilu checkout is excluded from the evidence field
- **Candidate executor profile:** DeepSeek V4 Flash through the current Work
  Cell AI SDK adapter; model, provider, tools, terminal contract, and source
  revision must be retained per run

## Necessary work graph

| Node | Required transition | Depends on | Acceptance observation | Omit only if |
|---|---|---|---|---|
| W1 — freeze field and exclusions | turn the sibling checkout into a reproducible committed-source subject | approved Mission | both revisions, diff, included surfaces, privacy boundary, and dirty-tree exclusion are recorded | never |
| W2 — predeclare questions and scoring | make the comparison capable of refuting the cognition claim | W1 | withheld questions, relation rubric, material-error rule, and decision threshold exist before model output | never |
| W3 — strong whole-project baseline | observe what one capable Cell can reconstruct without partitioning | W2 | source-linked model, natural settlement state, usage, reads, unsupported claims, and answers are retained | the Cell cannot access the fixed source at all |
| W4 — semantic packet and typed-ledger preparation | let the caller choose a task- and project-specific cut from responsibility, causal, state, authority, evidence, and change relations without giving Swarm semantic authority | W2 | the partition plan states why this cut fits the decision; every required subsystem and cross-boundary relation has one declared packet owner or explicit shared edge | never |
| W5 — partitioned execution | obtain independently grounded local models at stable Cell scale | W4 | each accepted packet retains sources, relations, unknown exterior edges, settlement, and usage | W3 already answers every question with no material error and the Principal ends the comparison |
| W6 — faceted typed reconstruction | reconnect local models into a small index and bounded question-owned shards without averaging or treating agreement as truth | W5 | authority, state/persistence, lifecycle, public-contract, conflict, and impact shards preserve relation types, source anchors, missing edges, and coverage identity; no integrated monolith is required | no packet is accepted |
| W7 — withheld evaluation | determine whether the treatment changes downstream cognition quality | W3, W6 | source-checked answers compare coverage, relation recovery, uncertainty, unsupported claims, and material errors | never |
| W8 — delta invalidation plan | predict which packets and boundary edges the committed change affects before refresh | W6 | selected and preserved packets have source-backed reasons; uncertain impact is explicit | W7 rejects partitioned cognition outright |
| W9 — selective refresh | revise affected cognition without reconstructing all successful packets | W8 | changed packets settle, untouched packet records remain reused by identity/hash, and boundary synthesis is updated | W8 shows the delta truthfully affects every packet |
| W10 — delta audit | compare selective refresh with the actual diff and targeted source inspection | W9 | missed impacts, stale claims, refreshed answers, work avoided, and material errors are reported | selective refresh cannot settle |
| W11 — disposition | route supported evidence to `form-guidance` or close with no change | W7 and, if eligible, W10 | one explicit form-review or no-change return enters the Mission | never |

## Withheld decision questions

These questions are fixed before baseline or packet outputs. Execution Cells do
not receive them as a checklist; evaluators do.

1. Where does Shilu admit knowledge-changing operations, and which layer owns
   final validation and commit?
2. If an Entry is created or updated, which persisted and derived states must
   remain coherent before search can truthfully return it?
3. Which public surfaces expose equivalent capabilities, and where can their
   behavior drift despite sharing the core?
4. Which paths allow agent-produced interpretation to affect durable knowledge,
   and what prevents the agent from becoming commit authority?
5. What are the actual rollback, rebuild, and failure-recovery boundaries?
6. Before `1cac9bb`, what prevents Shilu from acting as a useful agent-memory
   backend even though it can already record and search entries?
7. After `1cac9bb`, which prior architectural relations change, which remain
   invariant, and which new downstream risks appear?
8. If a future change modifies Entry kinds or search tokenization, what callers,
   indexes, migrations, tests, and user-facing contracts form the impact field?

## Evaluation rubric

Score relations, not prose volume:

- **source coverage:** required authoritative surfaces actually inspected;
- **relation recovery:** responsibility, causal, constraint, authority, and
  change edges supported by source anchors;
- **boundary preservation:** incoming/outgoing packet edges and unknown exterior
  context remain explicit;
- **uncertainty quality:** inference and missing evidence are not promoted to
  facts;
- **material errors:** a false authority, persistence, causal, rebuildability,
  or public-contract relation capable of changing a downstream decision;
- **action usability:** withheld questions can be answered with the minimum
  additional source inspection;
- **refresh locality:** successful unaffected packet artifacts are reused while
  every source-backed changed edge is reconsidered.

Partitioned cognition is supported only if it recovers at least one
decision-relevant source-backed relation or withheld answer the baseline misses,
without adding a material error. Incremental refresh is supported only if at
least one prior packet can be retained unchanged and the delta audit finds no
missed material impact. A richer graph, more tokens, or majority agreement does
not pass either gate.

## Discovery branches

| Branch | Smallest discovery work | Opens when | Closes when | Later work made eligible |
|---|---|---|---|---|
| D1 — baseline already sufficient | source-check all withheld answers against the baseline | W3 is complete and materially correct | no missed decision relation remains, or one is found | early no-change, or W4–W7 comparison |
| D2 — overloaded packet | split only the failing semantic packet along one state/authority boundary | one packet loses evidence, recovers falsely, or cannot settle | replacement children settle or remain unsupported | W6 synthesis |
| D3 — harness failure | reproduce terminal/tool/source-access failure without interpreting semantic output | trace contradicts terminal result or fixed source was unavailable | deterministic/runtime correction or explicit blocked result | retry only the affected run |
| D4 — unbounded delta | inspect changed symbols and packet edges before running refresh | every packet appears affected or selection has no evidence | a bounded affected set is justified, or incremental claim is rejected | W9 selective refresh or W11 no-change |
| D5 — promising result | independent source/authority review of W7 and W10 | both cognition and locality gates appear to pass | findings are corrected or upheld | later `form-guidance` decision |
| D6 — oversized cognition artifact | split one facet along its live decision question while retaining the same source hashes and coverage edges | one default-context file can no longer be read and revised locally by one Cell | every shard has one named question and the small index can reconstruct its references | W7 evaluation and W9 refresh |

## Resolution and tolerances

- **Structural tolerance:** preserve the whole repository at low resolution and
  model design, core/operations, storage/events, indexing/search, processor,
  runtime/job/source, CLI, MCP, and tests at relation-changing resolution.
  Examples and shell demos may remain low resolution; an omitted subsystem must
  be named rather than silently absent. Raw records may be large cold evidence;
  the usable cognition surface must be a small index plus bounded shards, each
  owning one decision question and independently readable/revisable by one Cell.
- **Forecast tolerance:** no calibrated token interval exists for Shilu. Record
  estimates only as non-controlling diagnostics and audit actual usage by Cell,
  phase, reads, duration, and retry. The model context window is the high safety
  boundary; semantic acceptance outranks a low estimate.
- **Decision tolerance:** one material relation error defeats a claimed pass
  until corrected. Small wording or non-decision omissions do not reverse the
  treatment choice.
- **Control tolerance:** run one baseline, one first packet set, targeted
  replacements only for failed packets, one compact synthesis, and one affected
  delta refresh. Do not rerun successful siblings by default.
- **Calibration tolerance:** this is one second-project observation, not a
  universal packet-size, cost, or model-performance profile.

## Conversion handoff

- **Required executor profile:** source-reading Work Cell with shell/read tools,
  caller-defined typed terminal output, retained run records, and DeepSeek V4
  Flash initially; a stronger model is eligible only to review a material
  synthesis conflict, not as the hidden baseline.
- **Comparable observations:** the 2026-07-15 project-cognition and typed-ledger
  probes; limits include a different repository, evolving Work Cell adapter, and
  no calibrated Shilu reference class.
- **Projection needed:** broad discovery envelope only; no P50/P80/P95 claim.
- **Budget Envelope authority:** Principal if actual continuation would expand
  beyond the declared baseline, packet set, targeted replacement, synthesis,
  and delta audit.

## Reopening observation

Re-estimate if the fixed Shilu commit cannot build or be read independently, the
source field materially differs from the recorded tree, the whole-project
baseline proves too small to exercise scale, or the delta touches every honest
semantic packet. Those observations may require a different second project or
delta; they do not authorize increasing orchestration count to preserve the
hypothesis.
