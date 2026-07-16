# Project Cognition Scale-Control Probe

**Date:** 2026-07-15

**Source revision:** `ff1a4fe`

**Model:** `deepseek-v4-flash`, non-thinking mode

**Status:** scale-control value supported for decision usability; efficiency and
complete semantic fidelity unsupported

## Question

Can semantic divide-and-conquer turn a project-cognition task that exceeds one
Work Cell's stable scale into locally reliable models and reconnect them into a
whole useful for later architectural, workflow, impact, and prioritization
decisions?

The claim is not that more Cells, more tokens, or diverse opinions are better.
The treatment is supported only if the single Cell first exhibits concrete
scale failure, partitioned Cells produce locally grounded records, the whole can
be reconstructed without losing boundary relations, and withheld downstream
questions become answerable.

## Work graph and controls

The test held source revision, model family, project, modeling intent, terminal
report form, and human acceptance owner constant. It progressed through:

1. one whole-project baseline;
2. semantic partition by project ownership and causal closure;
3. targeted repartition of an overloaded packet;
4. one synthesis over compact terminal reports; and
5. previously withheld downstream questions checked against authoritative
   repository sources.

The subject included the [semantic root and skill system](../../AGENTS.md),
[project architecture](../../design/DESIGN.md), [Work Cell implementation](../../packages/work-cell/src),
formal organization, observation, and the public site. Local raw records remain
under `.work-cell/experiments/`; run IDs below make the retained observations
recoverable without promoting them into project facts.

## Baseline observation

Run `a7f42f10-c8df-4e16-b99c-b30f0ab4b1e7` used one Cell with broad read scope.
It mechanically passed after 632,261 tokens and approximately `$0.02098`, read
35 files, and concentrated almost entirely on the Work Cell runtime. Skills,
formal organization, observation, and the public product were largely absent.

Its terminal recovery submitted `insufficient` and falsely claimed that no file
had been read. The contradiction between trace and report is the decisive scale
failure: accumulated investigation no longer survived into the final cognitive
model. The 180,000-token estimate missed actual usage by 251%.

## Semantic partition observation

Run `02f0a26c-7a9b-40f0-a435-095a638773d9` released six prepared read-only
packets at concurrency six:

| Packet | Result | Tokens | Observation |
|---|---|---:|---|
| semantic authority | usable, natural submit | 114,195 | Modeled Sequence lineage and authority edges. |
| skill system | usable, natural submit | 168,708 | Modeled trigger, expression, packaging, evaluation, and installation. |
| atomic Cell core | insufficient, recovery | 335,518 | Still exceeded one Cell's stable working scale. |
| multi-Cell orchestration | usable, natural submit | 199,521 | Modeled prepared-work release, settlement, and semantic/runtime separation. |
| organization and observation | usable, natural submit | 156,116 | Modeled authority, missions, review, continuity, and Chronicle. |
| product and adoption | usable, natural submit | 232,564 | Modeled audience, site projection, naming, visual direction, and adoption gaps. |

The six-packet run used 1,206,622 tokens. Mechanical pass count alone would have
hidden the atomic-core failure; its semantic verdict and recovery trace forced
the next practice.

## Targeted adaptive repartition

Only the failed atomic-core packet was divided into:

- atomic validation/workspace/execution/verification/record; and
- AI SDK, project discovery, CLI, presentation, and persistence carriers.

Run `2b071381-fda4-45ab-ab8d-f89c37105fd9` produced two natural `usable`
submissions in 187,813 tokens and approximately `$0.01119`. This replaced a
335,518-token failure with two source-grounded models while reducing that local
work by about 44%. Estimate error was 21.7%, compared with the failed packet's
unbounded investigation behavior.

This is the strongest direct support for scale control: a semantic cut changed
both completion quality and necessary work without rerunning successful siblings.

## Synthesis observation

Run `260e946c-6747-4de0-b5c5-fafb881f3fd3` extracted only the seven accepted
terminal reports with `jq`, not their raw traces. All seven extraction commands
succeeded. Synthesis used 33,037 tokens and approximately `$0.00470`, submitted
naturally, and reconstructed:

- mission and authority hierarchy;
- subsystem responsibilities;
- five cross-system causal flows;
- source/record/projection distinctions;
- six change-impact routes;
- open composition, naming, adoption, triggering, calibration, and provider
  boundaries; and
- a cross-packet edge table.

Compact record handoff prevented the synthesis context from inheriting the full
1.39-million-token local execution history.

## Withheld-question evaluation

The questions tested semantic authority, skill lifecycle, Work Cell completion,
orchestration ownership, organizational authority, public-site/adoption status,
CellInput impact, and the generic composition gap. They were absent from the
modeling prompts.

One whole evaluator repeated the scale failure: after 433,591 tokens and many
source reads, its recovery claimed no evidence and returned an invalid
`unsupported` verdict. The evaluation was then divided into three independent
question families. Run `bd01caa2-18b3-4096-a4ac-dbf090163647` used 176,275
tokens; every member naturally submitted `synthesis_better`.

Those reports correctly established that the baseline supported none of the
eight questions and that the synthesis supported the skill lifecycle, runtime
completion contracts, semantic/runtime partition boundary, CellInput impact,
composition gap, organizational authority, site generation, and proposed—not
accepted—three-level adoption model.

However, the semantic evaluator missed a material synthesis error even while
quoting the disconfirming source. The synthesis classified interpretations and
skills as reconstructible projections. The project instead defines
interpretations as licensed derivatives and skills as contextual method
expressions; [P14's interpretation](../../principles/interpretations/P14.md)
explicitly says that `SEQUENCE.md` being their semantic source is an authority
relation, not proof that contextual guidance is reconstructible. L1 guidance,
portable snapshots, site views, and rendered summaries may be projections;
downstream semantic artifacts are not automatically projections.

The final human disposition is therefore seven decision areas supported and one
materially flawed, not the evaluators' unanimous error-free claim.

## Work and cost audit

| Treatment | Tokens | Approx. recorded cost | Cognitive result |
|---|---:|---:|---|
| one-Cell baseline | 632,261 | `$0.02098` | insufficient |
| first six packets | 1,206,622 | `$0.04891` | five usable, one overloaded |
| targeted replacement | 187,813 | `$0.01119` | two usable |
| synthesis | 33,037 | `$0.00470` | usable with one material relation error |
| full partition treatment | 1,427,472 | `$0.06481` | decision-usable for most withheld questions |

The observed treatment cost 2.26 times the baseline tokens and about 3.1 times
its recorded price. A calibrated repeat that omits the known failed packet would
use approximately 1,091,954 tokens and `$0.04892`, still 1.73 times the tokens
and 2.33 times the price of the unusable baseline.

Scale control is therefore not a cost-reduction claim. It trades more aggregate
work for stable local completion, failure isolation, selective retry, compact
handoff, and downstream usability. Whether that trade is justified depends on
the decision's importance and required coverage.

## Method revision

The experiment changes the method in five ways:

1. Treat a mechanically passed run whose recovery contradicts retained reads as
   a scale failure.
2. Repartition only the failing packet; never rerun successful siblings by
   default.
3. Type coverage-ledger edges as semantic authority, licensed derivation,
   reconstructible projection, causal dependency, execution evidence, or
   acceptance authority. Synthesis must preserve the type.
4. Pass compact source-linked records or artifacts to synthesis rather than raw
   child traces.
5. Apply the same scale discipline to evaluation; independent question families
   can be evaluated separately when one verifier cannot retain reports, sources,
   and disconfirming checks coherently.

## Next research: Cell stability and differentiation

Swarm performance depends on two independent claims that this experiment must
not collapse:

1. **Stable individual performance:** one prepared Cell can retain its evidence,
   complete its local acceptance question, and settle naturally at the assigned
   scale.
2. **Effective differentiation:** a prepared cognitive shape changes what the
   Cell notices, tests, or preserves in a way useful to the whole—not merely its
   vocabulary, tone, or self-description.

The stable envelope is not one universal token number. It is an empirical range
for a tuple of packet structure, model, instruction, evidence access, tools,
terminal contract, and acceptance question. Measure natural completion,
evidence retention, unsupported claims, contradiction recovery, usage, duration,
and retry behavior across repeated packets. A mechanically passed recovery that
contradicts its trace remains outside the supported envelope.

Differentiation needs a controlled phenotype comparison. Reuse the same bounded
packet and source visibility with at least these treatments:

- a neutral method control;
- a rigor treatment that raises the evidence threshold and searches for
  disconfirming observations;
- a deliberative treatment that develops and compares alternate causal models;
  and
- a label-only control whose role name changes but whose operative method does
  not.

Keep each treatment to one attention-changing bias, not an embedded workflow or
long personality description. Agent attention is finite: a complex role prompt
changes context load and execution burden at the same time as the intended
phenotype, making the comparison uninterpretable. Put shared procedure in the
task structure, evidence packet, and result contract; let the treatment change
only the one observation tendency under test.

Hold model, source revision, tools, report contract, and acceptance owner
constant. Score source selection, relation recovery, disconfirming checks,
uncertainty calibration, false positives, natural settlement, and downstream
contribution separately from lexical difference. Repeat the comparison on more
than one semantic packet: a phenotype is useful only if the intended behavioral
delta survives context change without materially degrading grounding or stable
completion.

Existing evidence makes this a real open question rather than an implementation
todo. The [activation-field scale probe](2026-07-13-activation-field-scale-probe.md)
found that P-ID labels and weights were insufficient, while expanded phenotype
prompts increased lexical differentiation without improving final task quality.
The [latent-routing probe](2026-07-14-latent-routing-probe.md) found that
prompt-only heads over the same visible field still shared a strong salience
ordering. Therefore `rigorous`, `deliberative`, or similar names must not become
runtime presets until behavioral evidence distinguishes them.

Prepared instructions, skills, and adapters may express experimental shapes.
The general Work Cell and Swarm contracts should continue to transport those
Cells without owning a taxonomy of cognitive personalities.

The follow-up
[stability and sparse-differentiation probe](2026-07-15-cell-stability-and-sparse-differentiation.md)
found that even one short role label can materially redirect source order, but
neither a rigor label nor compact rigor/deliberation biases improved this
authority-and-causality packet over the neutral control. It also rejected long
phenotype prompts as a valid comparison because they consume the attention they
claim to shape. Cell function should therefore be expressed first through task,
evidence, acceptance, and result boundaries; sparse attention bias remains a
local, falsifiable treatment.

## Disposition

The proposed medium-project cognitive-modeling test was valid and
decision-changing. It supports semantic partitioning as a way to control Cell
working scale and recover a useful whole from a task that one Cell failed. It
does not support automatic correctness, lower total cost, fixed packet sizes,
or majority acceptance.

The next experiment should reuse this exact project and revision shape but test
whether a typed coverage ledger prevents the interpretation/projection error in
one targeted synthesis comparison. A general project-cognition skill or a new
runtime carrier should not be created from this single context without a form
decision and a second project probe.
