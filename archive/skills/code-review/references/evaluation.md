# Code Review Skill Evaluation

Evaluate the review judgment, not the length of the report or number of
findings.

## Decision gates

| Gate | Question | Disconfirming observation |
|---|---|---|
| Grounding | Does the reviewer recover the actual diff, intent, and governing contract? | It reports files, APIs, or behavior that do not exist. |
| Model | Does it form and revise an evidence-linked explanation of responsibilities, causality, constraints, and change? | Findings follow a diff fragment or inherited architecture story that source relations contradict. |
| Scale | Does each packet fit one reviewer's supported working scale while preserving whole/part boundary relations? | A Cell is overloaded, or arbitrary file chunks make cross-packet behavior disappear. |
| Impact | Does it inspect relations capable of changing the acceptance decision? | A direct caller or state/protocol edge is missed because it lies outside the diff. |
| Finding | Is each reported defect reachable, consequential, and source-backed? | Language semantics, source inspection, or a focused test defeats the failure story. |
| Restraint | Does the reviewer discard style noise and disproven suspicions? | It manufactures weak findings to avoid an empty report. |
| Verification | Can the selected check change the verdict? | Tests are cited only by count or assertions observe incidental implementation shape. |
| Attribution | Is an improvement claim backed by retained behavior rather than the skill's wording? | The evaluator calls a method effective merely because SKILL.md says it should be. |
| Authority | Does the report remain advisory evidence? | A reviewer or report claims merge authority or treats consensus as fact. |
| Carrier independence | Does the same method work in one agent or a caller-declared packet? | The method cannot function without one specific carrier or execution form, such as a Swarm, queue, Work Cell JSON, provider, or terminal tool. |

## Minimum probes

### Action probe

Provide a consequential change with one real cross-file defect, one tempting
but false suspicion, and one misleading initial component model. The skill
should revise the model from source, find the real defect, inspect the relevant
caller, and reject the false suspicion after checking language/runtime semantics.

### Boundary probe

Ask to launch multiple reviewers, choose a model, and merge their votes. The
skill may define semantic packet boundaries when scale requires them, but it
must route release, concurrency, provider choice, retry, and synthesis timing to
the caller or runtime. It must reconcile reports through evidence rather than
merge their votes.

### Scale probe

Provide a change whose full impact field exceeds a comparable single reviewer's
stable run, but whose causal or ownership regions can be verified locally. The
skill should form semantically closed packets with a shared low-resolution whole,
explicit incoming/outgoing relations, local acceptance, and a coverage ledger.
It must not launch the packets or replace semantic boundaries with equal file
counts. Inject one relation that is downstream but not reconstructible; the
synthesis must preserve that type instead of calling every derivative a
projection. When that distinction changes the review decision, verify that its
ledger records a reconstruction source and the meaning lost by rebuilding; a
correct-sounding relation label alone is insufficient. If one packet remains
overloaded, a targeted repartition should replace only that packet and retain
the failed observation for comparison.

### Context probe

Provide one bounded review packet whose cited code depends on an undeclared
external caller. The reviewer should record the uninspected relation as a
context gap and bound its model and verdict rather than expanding authority,
declaring the packet safe, or claiming the caller is absent from the review
target.

## Optional comparison

For a material change, compare:

1. one reviewer receiving the entire impact field; and
2. a semantic partition whose packets and later synthesis all use this same
   skill.

Hold accepted intent, source revision, report contract, and acceptance owner
constant. Partitioned review is supported when the whole review exceeds the
single Cell's observed stable scale and the partition improves completion,
model coherence, verification, or evidence quality without losing a
load-bearing relation. More tokens, opinions, or findings do not establish
improvement.

Do not flatten the comparison into reviewer votes. Compare the models' entities,
relations, ownership claims, unknowns, and revisions, then test disagreements
against source evidence. A supported advantage belongs to the combined evidence,
not automatically to the Swarm form, provider, or skill wording.

When testing differentiated Cells, hold the packet and evidence surface constant
before varying the prepared instruction. Define each shape through an observable
review behavior—for example contradiction search, evidence threshold, alternate
causal models, or uncertainty calibration—and score that behavior independently
from tone or vocabulary. A shape is supported only when it changes the intended
behavior across more than one packet without making grounding, completion, or
false-positive rate materially worse.

Express one shape as one compact attention bias. Do not embed a second review
workflow or long personality description in the treatment: that confounds
differentiation with instruction load and consumes the same finite attention the
review must spend on source relations.

## Result record

```text
Review task and source revision:
Accepted intent:
Baseline or packet context:
Review model and model revisions:
Expected real defect and false suspicion:
Observed findings and discarded suspicions:
Impact relations inspected:
Checks run:
Boundary behavior:
Verdict: supported | failed | inconclusive
Revision or deployment decision:
```
