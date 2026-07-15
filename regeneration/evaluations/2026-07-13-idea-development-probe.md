# Idea Development Probe

**Status:** textual development did not produce an admissible new idea;
claim-level evidence challenge and stage-localized world contact are supported
as separate mechanisms
**Date:** 2026-07-13
**Model:** `deepseek-v4-flash`, non-thinking mode

## Question

Can an engineered process turn broad generation into a good idea rather than
merely a larger set of plausible suggestions? The immediate test asks what
previously unstated mechanism explains why the activation-field experiments
produced high surface diversity without a corresponding improvement in
creative quality, and what smallest architecture experiment would distinguish
that mechanism from its strongest alternative.

An idea is not admitted merely because it is novel, articulate, or preferred
by another model call. It must state a governing relation, cite the observations
it explains, make a risky prediction, identify a smallest discriminating probe,
change a concrete decision if supported, and expose both its strongest
alternative and failure condition.

## Treatments

The experimental [manifest](../../packages/work-cell/experiments/idea-development.json)
uses one fixed question and one evidence packet. The
[probe](../../packages/work-cell/src/research/idea-development-probe.ts) compares:

- a one-shot arm with nine independent complete proposals followed by one
  synthesis; and
- a development arm with three disjoint observers, three competing
  hypotheses, claim challenges, and three attack-and-inheritance developments
  followed by one synthesis.

Both arms use the same final idea contract. A claim-level evidence challenge
then checks the core mechanism against exact source passages. Only a
`supported` result may enter the blind comparison. A source ID with a plausible
but non-verbatim quotation fails closed; an unambiguous wrong source ID may be
rebound to the only source containing the exact quotation and the repair is
recorded. When neither arm survives, the comparison ends without judge calls.
The deterministic behavior is covered by
[`idea-development-probe.test.ts`](../../packages/work-cell/test/idea-development-probe.test.ts).

## First live run: fluent novelty without evidence

Run `b43ca9a3-bbc2-436a-8388-51c2112131a3` used 211,971 tokens. Three blind
same-model judges unanimously preferred the one-shot arm. Human inspection
accepted neither arm.

The preferred arm claimed that integration "recursively averages semantic
content" and thereby causes collapse. The implementation does not perform such
an average: it supplies local nodes to a model and asks it to form a new
relation. The development arm remained closer to the recorded failures but
returned to an already tested surface-level selector solution. Thus the vote
selected the more novel causal story even though its central mechanism was
fabricated.

This run invalidated evidence-reference presence as a verification mechanism
and same-model preference as an acceptance gate. It motivated the exact-claim
challenge used in the second run.

## Second live run: containment without discovery

Run `c999af31-60be-4026-81ca-007f3afdc461` used 265,716 tokens against a
300,000-token estimate, an 11.43% relative error.

| Stage | Tokens |
|---|---:|
| Nine baseline drafts | 86,789 |
| Baseline synthesis | 15,306 |
| Disjoint observations | 11,421 |
| Competing hypotheses | 29,354 |
| Attack-and-inheritance developments | 33,274 |
| Developed synthesis | 11,072 |
| Claim-level evidence challenges | 50,061 |
| Blind judges | 28,439 |

The one-shot arm attributed collapse to inherited cognitive shapes plus final
expression. Its challenge returned `mixed`: the cited integration prompt did
not establish a semantic basin, and expression remained a confound. The
development arm attributed collapse to model pretraining bias during
integration and proposed a negative-token prompt. Its challenge returned
`contradicted`: the proposal repeated the already unsuccessful family of
negative-prompt and novelty interventions and overclaimed what the integration
evidence established. Both arms were therefore correctly recorded as
`all-rejected`.

The original implementation still spent 28,439 tokens asking blind judges to
compare the two rejection notices; all three selected one notice. This exposed
a control-flow defect rather than useful judgment. The probe now short-circuits
when both gates reject, and the behavior has a deterministic regression test.

Several incomplete attempts before the retained run also exposed a record gap:
stage failures printed their local token use, but a process that exits before
the final record does not preserve total incomplete-run usage. The retained
budget audit is therefore accurate for completed runs, not a complete account
of all experimental expenditure.

## Contact with the actual process

The two generation arms could only rearrange the written evidence. To test
their recurring claim about integration, the next observation inspected all
eight retained 64-node activation-field records and measured the presence of
the concrete craft basin (`forge`, `anvil`, `workbench`, `workshop`, `hammer`,
`craft`, or `crucible`) at each stage.

| Stage | Nodes | Nodes in craft basin | Share |
|---|---:|---:|---:|
| Independent activation | 496 | 101 | 20.36% |
| First integration layer | 224 | 85 | 37.95% |
| Last integration layer | 68 | 38 | 55.88% |

The records span several treatments and include partial runs, so these
frequencies are diagnostic rather than a controlled causal estimate. Within
the records, however, the direction is clear: craft imagery already exists in
a minority of independent activations and becomes progressively more prevalent
through integration. In the two completed comparable records, activation
shares of 23.44% and 21.88% rose to first-layer shares of 43.75% and 37.50%; one
ended at 62.50%, while the other narrowed to 25.00% after its final bottleneck.

This disconfirms both simple stories produced by the textual arms. Integration
does not invent the basin from nothing, and final expression is not its sole
origin. The more precise mechanism candidate is **coherence amplification**:
familiar images arise among diverse activations, are easier for local
coalitions to connect into a shared story, and therefore gain representation
at successive bottlenecks. This is still a hypothesis. A controlled next probe
must replay the same activation set under different coalition-selection
mechanisms and compare basin survival before any language projection.

## What the experiment changed

Textual observation, debate, and synthesis are not yet an idea-development
engine. They improved differentiation of viewpoints but did not add a new
fact; the model eventually returned to familiar prompt-level interventions.
The evidence gate improved containment, not creativity.

A useful engineering loop for ideas therefore needs a different center of
gravity:

1. preserve several partial observations of one concrete contradiction;
2. form competing causal mechanisms rather than immediate solutions;
3. require each mechanism to predict an observable difference;
4. execute the cheapest world-facing probe using code, tools, retrieval, or a
   real user response;
5. let the resulting surprise mutate or eliminate the mechanisms; and
6. synthesize only the surviving relation, with human judgment retaining
   authority over significance and aesthetic force.

The next smallest controlled test is not another larger language field. Reuse
one immutable activation set and compare ordinary local coalition formation
against a treatment that preserves low-frequency semantic basins without
forbidding words or rewarding novelty directly. Measure basin representation
after every layer, then project both final sets under the same expression call.
That experiment can distinguish coherence amplification from projection-only
collapse without generating another activation population.
