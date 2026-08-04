# Skill Evaluation Surface

Use an evaluation that can reveal a failure in the claimed agent behavior.
Choose only probes that change the deployment decision.

## Minimum probe set

| Probe | Question | Evidence to retain |
|---|---|---|
| Action | Does the agent make the intended judgment and take the enabled next action? | Raw task, output or changed artifact, and acceptance observation. |
| Boundary | Does it avoid triggering, overreaching, or claiming ownership outside its scope? | Boundary task and routing or refusal evidence. |
| Context | Does the required guidance appear at the layer where it affects the decision without loading irrelevant detail? | Loaded paths, omitted detail, and resulting action. |

Add an adversarial, long-context, or comparison probe only when the skill claims
to withstand that condition or the risk justifies it.

## Independent comparison

When a claim says the skill improves behavior, use a fresh evaluator with the
raw task and compare a baseline with a skill-enabled run on the same acceptance
condition. Without that comparison, evidence may show compatible behavior but
cannot attribute improvement to the skill. Do not leak the intended answer or
suspected failure.

If no independent evaluator or safe baseline is available, run the same probes
but label the result self-evaluated and attribution unproven. Structural checks,
prose review, and a passing happy path are not substitutes for this distinction.

## Prompt-composition attribution

Treat a prompt as a composition of possible carriers rather than attributing
behavior to its most visible label. A role, principle, rule, example, relation,
ordering, repetition, output contract, or hard prohibition may redirect the
Agent; none is load-bearing merely because it sounds precise.

Before claiming that an expression creates a stronger reasoning path:

1. Name the observable checkpoints it should change—for example object
   formation, relation recovery, contradiction diagnosis, action selection,
   constraint retention, or verification. Behavioral outputs can support these
   checkpoints; they do not by themselves establish an internal neural pathway.
2. Compare the smallest useful conditions. Include a no-treatment baseline,
   remove suspected decorative predicates one at a time, compare a role label
   with the relations it names, and vary order or paraphrase only when that is
   part of the claim. Keep task evidence, message authority, tools, result
   contract, and acceptance rubric fixed.
3. Qualify task headroom with repeated baselines before running the full matrix.
   Stop and retain the probe when the baseline is ceiling, or when every sample
   fails through the same action or hard boundary. Do not replace the task after
   seeing formal outputs; a new task starts a new campaign.
4. Score decision and boundary differences separately from vocabulary,
   confidence, length, or style. A longer explanation is not a stronger path.
   Preserve negative results, ceiling tasks that every condition solves, and
   floor tasks whose untreated samples all fail alike; they show where the probe
   cannot attribute improvement.
5. For a multilingual claim, use independently natural packets in each
   language and review their semantic alignment. Preserve object, actor,
   governing relation, source/projection and authority distinctions; do not
   translate API keys, enum values, IDs, or exact command names. A literal
   translation may be retained as a separate translation-effect condition.
6. Repeat decision-changing conditions across more than one task and fresh run.
   Add another model family before claiming a portable expression effect. With
   single-run or single-model evidence, report the observed output difference
   and leave causal attribution unresolved.

Prefer removing a role noun, adjective, repeated qualifier, prohibition, or
step when its ablation preserves the intended checkpoints and hard boundaries.
Do not mechanically prune frequent words: a relation such as ownership,
source/projection, proposer/verifier, or read-old/write-new may be expressed
repeatedly because different surfaces require the same invariant.

## Result record

```text
Claim:
Probe and supplied artifacts:
Expected disconfirming observation:
Observed action:
Evidence path or transcript anchor:
Verdict: supported | failed | inconclusive
Revision or deployment decision:
```

Retain failures and inconclusive results. They define the skill's boundary and
prevent a later rewrite from treating an untested assertion as fact.
