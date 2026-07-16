# Code Review Cognitive Modeling Evaluation

**Date:** 2026-07-15

**Status:** supported boundary; behavioral advantage remains comparative

**Target:** [`skills/code-review`](../../skills/code-review/SKILL.md) and its
use through the generic [Work Cell orchestration runtime](../../design/decisions/031-extensible-work-cell-orchestration.md)

## Pressure, correction, and accepted intent

The prior independent orchestration review showed that parallel model calls can
complete the same mechanical contract while producing fabricated, contradictory,
or useful findings. The first interpretation over-promoted independent cognitive
models as the main Swarm value. The corrected pressure is scale control: a task
larger than one Cell's stable working envelope must be decomposed until every
Cell can model, investigate, verify, and report its local work reliably. Diverse
models may expose additional impact, but they are a secondary consequence of
partitioning rather than its primary justification.

The accepted boundary is:

- the `code-review` skill owns evidence-linked project/subsystem modeling,
  semantic review partitioning, impact analysis, finding qualification, model
  reconnection, and its advisory report contract;
- Work Cell orchestration owns only prepared-Cell release, concurrency,
  cancellation, settlement, retained records, and the mechanical time at which
  a later synthesis Cell runs; and
- multiple reports are not votes. A later review packet uses the coverage ledger
  to reconnect ownership, causal, constraint, and change relations against
  source evidence.

## Sequence expression team

| Seat | P-ID | Contribution |
|---|---|---|
| Primary | P02 | Review starts from source and actual implementation relations rather than a preferred architecture story. |
| Supporting | P04 | Attention follows the relation most capable of changing the acceptance decision. |
| Supporting | P08 | Findings and model relations need reachable failure stories and disconfirming checks. |
| Supporting | P14 | Review models, verdicts, and Swarm summaries remain projections over source and retained execution evidence. |

P02 remains the stable lineage because the distinctive review act is source-
grounded judgment. P04, P08, and P14 constrain attention, falsifiability, and
projection authority without creating another review doctrine.

## Chosen form

The smallest durable form is one installable `code-review` skill with:

- a carrier-independent core method in [`SKILL.md`](../../skills/code-review/SKILL.md);
- on-demand [review partitioning](../../skills/code-review/references/partitioning.md),
  [review modeling](../../skills/code-review/references/review-model.md),
  [risk lenses](../../skills/code-review/references/risk-lenses.md), and
  [behavioral evaluation](../../skills/code-review/references/evaluation.md);
- a generated standalone Sequence snapshot; and
- an explicit boundary in [decision 031](../../design/decisions/031-extensible-work-cell-orchestration.md).

Rejected forms:

- embedding reviewer roles, rubrics, or report shapes in the runtime, because
  this would specialize a general executor;
- treating a Swarm count, parallelism, or majority as scale control, because
  an oversized Cell remains oversized at lower concurrency and agreement cannot
  turn an inference into fact; and
- generating a durable project-wide architecture model by default, because a
  review model is temporary, resolution-bounded, and subordinate to source.

## Probes and observations

### Structural and installation probes

The generated snapshot check, snapshot test, and disposable-project installation
probe passed. The installed skill now contains seven files and needs no Work Cell,
provider, terminal tool, or host repository to apply its method.

### Three-model Swarm probes

The ignored local manifest ran three independent DeepSeek V4 Flash Cells over
different declared packets. It intentionally retained each terminal payload
instead of asking the runtime to synthesize a verdict.

| Run | Mechanical result | Usage / estimate | Cognitive observation |
|---|---|---:|---|
| `74141f2d-7361-4399-b89b-e81b2e410e01` | 3 passed | 71,550 / 180,000 | Four steps truncated one Cell before on-demand references; recovery misclassified missing investigation as missing files. |
| `c946a680-db31-485d-9ce2-11af3c06fa21` | 3 passed | 166,475 / 180,000 | One complete boundary model; two recovery reports were mechanically valid but cognitively wrong. The 7.5% estimate error was much lower once disclosure and steps matched the work. |
| `0b8609eb-b1d6-457e-b598-398b5db094dc` | 1 passed, 2 projected failed | 138,587 / 300,000 | All three terminal payloads existed. Two correct payloads were projected failed because the driver read AI SDK's absent structured-output getter after a terminal-only run. |

The third run's retained models were materially different:

1. The boundary model aligned the skill and runtime ownership split and bounded
   uninspected implementation as residual risk.
2. The method-action model corrected an earlier evaluator's overclaim: skill
   wording is compatible with rejecting fabricated findings but is not evidence
   that agents will follow it. The earlier campaign contains counterexamples,
   so behavioral improvement remains unproven.
3. The packet-boundary model treated uninspected barrel exports and external
   consumers as missing relations, not automatic defects, and returned
   `ready_with_residual_risk`.

These relations would be lost by majority voting. They show a useful secondary
effect of independent packets, but this rehearsal did not begin from a task
that exceeded one Cell's stable scale and therefore does not establish the
primary scale-control benefit.

### Runtime defects exposed by dogfood

The first live attempt exceeded its five-minute Cell duration because
[`runCell`](../../packages/work-cell/src/run-cell.ts) awaited a driver promise
that did not settle after abort. The host now races driver completion against
the Cell signal, and a deterministic uncooperative-driver probe verifies prompt
cancellation settlement.

The third Swarm run exposed a second projection defect. The
[`AiSdkDeepSeekDriver`](../../packages/work-cell/src/ai-sdk-driver.ts) read the
AI SDK structured-output getter even though the Cell declared no `outputSchema`.
The terminal call and report already existed in trace, but the getter raised
`No output generated`. The driver now reads structured output only when that
independent contract is declared. A live single-Cell replay
`6aac07d9-cafd-4515-8633-c774f877788d` settled `passed`, retained
`submit_review`, and used 26,100 tokens.

## Findings

### Supported

- The skill/runtime ownership boundary is explicit and carrier-independent.
- Independent models exposed different decision-relevant relations that one
  aggregate verdict would have erased, as a secondary partition benefit.
- A bounded packet can name outgoing relations it cannot inspect without
  expanding authority or manufacturing a defect.
- Execution records can disconfirm their own projections; terminal trace was
  sufficient to locate the output-getter defect.

### Not yet proven

- This campaign does not prove scale control because the baseline did not first
  demonstrate that the whole task exceeded one Cell's stable working envelope.
  A controlled comparison must hold intent, revision, evidence access, report
  contract, and acceptance owner constant, then compare whole-task completion
  with semantic packets plus synthesis.
- The skill is a judgment method, not a compliance mechanism. DeepSeek Flash
  still produced incomplete or false reports when navigation consumed the
  investigation window and recovery forced submission.
- The current fixed Swarm retains independent records but does not itself run a
  dependent synthesis stage. A caller can prepare that later Cell through the
  general orchestration boundary; a graph/pipeline carrier remains future work.

## Decision

Keep the separation and retain the new `code-review` skill. Use a Swarm when
the necessary work exceeds one Cell's empirically supported working scale and a
semantic decomposition can preserve the original acceptance question. Treat
project or subsystem models and their boundary ledgers as first-class review
evidence, not runtime state. Follow partitioned review with a separately
prepared synthesis packet that reconnects boundaries against source. Do not
claim Swarm advantage from Cell count, token spend, pass count, report length,
model diversity, or agreement alone.

The next behavioral test should first identify a real change that exceeds a
comparable single Cell's stable envelope, then compare it with semantic packets
plus one synthesis Cell. Until that comparison is retained, the skill is
structurally usable, but the scale-control claim remains open empirical work.

That comparison is now retained in the
[project-cognition scale-control probe](2026-07-15-project-cognition-scale-control.md).
It supports targeted semantic partitioning for stable local completion, while
disconfirming lower-cost and automatic semantic-fidelity claims. It also opens a
separate controlled inquiry into individual Cell stability and behaviorally
measurable cognitive differentiation.
