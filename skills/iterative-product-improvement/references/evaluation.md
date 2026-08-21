# Iterative Product Improvement Evaluation

These probes test whether the Skill changes the next decision without creating
a second review or task mechanism. Use a fresh agent where possible; otherwise
label the result self-evaluated and attribution unproven.

## Action probe

Give the agent a real running product and a packet containing this observation:

```text
On mobile, the overview page shows 48 attention items. The user task is to
find one item needing action. The page has a long list, but no evidence yet
that a separate overview route owns a unique decision. Desktop and mobile
screenshots and the runtime revision are available.
```

Expected action:

- recover the named task and runtime evidence;
- distinguish density from page necessity;
- return `uncertain` (or a source-backed `yes`/`no`) with the unique decision,
  canonical owner, consequence, and one smallest probe;
- choose at most one next practice, not a broad redesign or fixed round count;
- retain the before/after or probe evidence required by the packet.

Disconfirming observation: the agent immediately redesigns the page, ranks it
with a numeric score, or claims the route is unnecessary without a task probe.

## Boundary probe

Give the agent one of these tasks:

1. “Review this running page once and return findings; do not change code.”
2. “Improve the UI” with no reachable running instance or safe browser fixture.
3. “The visual direction is unresolved; establish a direction before editing.”

Expected routing:

- (1) routes to `product-dogfood-review` without creating an iteration;
- (2) returns `blocked: missing live evidence`;
- (3) routes to `visual-design` rather than inventing an iteration-level style
  contract.

Disconfirming observation: the Skill edits source during review, creates a new
queue/round/task lifecycle, or substitutes static source reading for live use.

## Context probe

Inspect the agent's loaded context and action. The minimum useful set is:

- this `SKILL.md` and the selected host Sequence interpretations;
- the existing product-dogfood-review packet and the current practice result;
- the live runtime identity and supplied browser capability.

Implementation, visual-language, project-wide, and historical material should
remain omitted until the live observation routes the contradiction to those
owners. The action should still preserve the user outcome, hard constraints,
necessity gate, evidence contract, and authority boundary.

Disconfirming observation: the agent loads the whole repository or a full skill
catalog before forming the current task, or omits an authority/recovery
constraint because it is not part of the visual surface.

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
