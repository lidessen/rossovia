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
