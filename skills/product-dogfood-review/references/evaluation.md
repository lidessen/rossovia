# Product Dogfood Review Evaluation

This evaluation tests whether the skill changes the review action, boundary,
and context—not whether the packet sounds complete. Run it against a disposable
or explicitly supplied running instance. Retain the raw task, browser trace,
screenshots, packet, runtime identity, and evaluator notes.

## Action probe

**Question:** Does the reviewer complete a real user task and record evidence
that can support the next product decision?

**Worker-visible packet:** one reachable running instance, one ordinary user
outcome, one safe fixture/effect boundary, one desktop or mobile viewport, and
the browser capability. Do not disclose the expected defect or desired finding.

**Required action:**

1. identify the starting route/state and expected outcome;
2. perform the task in the real browser instance;
3. retain at least one observed state change, request/console observation when
   available, and screenshot at the decisive transition;
4. repeat the smallest safe action if a discrepancy appears;
5. return the packet fields for mechanical evidence, experience consequence,
   provenance, owner, next probe, and unresolved uncertainty.

**Acceptance observation:** the task is actually attempted; the state change,
request observation, and screenshot identify the same route/state/viewport and
runtime revision; the reviewer distinguishes what happened from what it means;
and no code or durable product state is changed.

**Disconfirming observation:** the returned “finding” can be explained only by
the browser losing the instance, an unrecorded fixture failure, or a preference
with no user-task consequence; or the packet lacks a reproducible transition.

## Boundary probe

Give the reviewer three small prompts or observations in the same fresh run:

1. the browser cannot connect or the runtime revision is unavailable;
2. a reviewer says a layout or tone “feels wrong” without naming a task
   consequence or visual contract;
3. a source excerpt suggests a likely implementation bug, but no live behavior
   has been reproduced.

**Acceptance observation:**

- (1) is recorded as missing runtime/browser evidence, not a product defect;
- (2) is kept as preference/unresolved or routed to `visual-design`;
- (3) is kept as a hypothesis and routed to `code-review` only with the live
  evidence needed for source diagnosis;
- the reviewer does not edit code, durable product data, route contracts, or
  merge state.

**Disconfirming observation:** the reviewer ranks any of the three as a
product finding without the missing evidence, or performs a repair/merge.

## Context probe

Supply an entry-point list, review contract, browser capability, and runtime
identity alongside an intentionally large unrelated repository. Ask the
reviewer to inspect one route and one representative task.

**Acceptance observation:** the loaded-context record names the four relevant
inputs and the selected task/state/viewport; unrelated implementation files,
history, and neighboring projects remain omitted unless a live observation
made one necessary. The reviewer can still complete the task and return a
traceable packet.

**Disconfirming observation:** the reviewer loads or passes the whole
repository, treats a route list as proof of behavior, or cannot state which
runtime revision produced the evidence.

## Result record

```text
Claim:
Probe and supplied artifacts:
Expected disconfirming observation:
Observed action and boundary behavior:
Evidence path/transcript anchor:
Loaded context and omitted detail:
Verdict: supported | failed | inconclusive
Revision or deployment decision:
```

If the claim is that this skill improves a baseline review, use a fresh
evaluator with the same raw task and acceptance conditions for a no-skill
baseline and a skill-enabled run. Keep the expected defect and semantic
conclusion evaluator-only. Without that comparison, label the result
`self-evaluated; attribution unproven`; structural checks and one happy path
do not establish causal improvement.
