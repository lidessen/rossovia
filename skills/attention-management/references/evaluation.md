# Attention Treatment Evaluation

Use this reference to test a carrier, cue, reset, role-entry pass, catchphrase,
or habit action. Behavioral outputs can support a control claim; they cannot by
themselves establish a neural mechanism.

## Attribution gate

Freeze model/provider route, reasoning policy, system position, task revision,
tools, permissions, context, step and duration boundaries, sampling settings,
and result contract. Change one treatment member per comparison.

Qualify repeated untreated runs before a matrix. Stop if every baseline passes,
or if every baseline fails through the same execution boundary. A ceiling or
floor fixture cannot attribute improvement.

## Minimum adjacent comparisons

Run only the comparisons needed for the claim:

| Claim | Baseline | Treatment |
|---|---|---|
| role framing | neutral prompt | one-shot role framing |
| recurrence | one-shot framing plus equal total neutral padding | the same framing plus timed neutral recurrence |
| catchphrase semantics | timed neutral recurrence | equal-position, equal-token meaning-bearing phrase |
| habit content | boundary-triggered observation-only packet | same trigger, schema, and output limit with object/relation/decision reconstruction |
| integrated character | semantic-atom-matched Principle list | integrated prose containing the same atoms and no new priority |
| role-entry | accepted carrier with equal-cost control pass | same carrier plus bounded pre-action orientation |

Reverse execution order across repetitions when the harness does not randomize
it. Hide treatment identity and phrase wording from the semantic evaluator.

## Cases

Include at least:

- a local issue is solved while whole acceptance remains open: `return`;
- a discovered issue really blocks acceptance: `retain`;
- a Principal correction rejects an old assumption;
- a completed, paused, or replaced task is followed by a new one: `switch`;
- a worker or tool claims success without enough evidence;
- structurally matched cases with different domain narratives.

Use development cases to revise the treatment and held-out cases to confirm it.
Add a second model family before claiming portability.

## Measures

Primary measures:

- first consequential action after the boundary;
- hard-constraint and authority violations;
- irrelevant tool calls or local steps before return;
- correct retention of a genuinely load-bearing branch;
- whole-task acceptance.

Cost and confounder measures:

- input, output, and visible reasoning tokens;
- wall time and right-censored timeouts;
- tool calls and retries;
- within-treatment variation.

Do not count these as success:

- exact phrase reproduction;
- role or Principle word frequency;
- stylistic consistency, confidence, or explanation length.

If the treatment uses more reasoning or latency than its control, report the
whole-profile effect unless the resource difference falls inside a declared
equivalence band.

## Retained result

```text
Hypothesis ID and original conjecture:
Execution profiles and matched members:
Cases, repetitions, and order:
Primary action and boundary observations:
Resource and variance observations:
Alternative explanation:
Verdict: supported locally | rejected | inconclusive
Deployment decision:
Reopen signal:
Evidence paths:
```

When the host declares an owning hypothesis record, append the outcome there.
Otherwise preserve the conjecture and result in the target project's local
evidence surface or return packet. Never delete the original conjecture after
rejection; later evidence may explain why it failed or where its boundary
changes.
