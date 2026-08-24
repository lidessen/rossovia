---
name: iterative-product-improvement
description: >-
  Run bounded, multi-round improvement of a real product or UI: observe a
  representative user task, decide whether a complex page or surface is
  necessary, choose the smallest useful change, implement it through the
  owning skill, and verify the changed experience in the browser before
  selecting the next practice. Use when asked to "多轮走查", "迭代改进 UI",
  "全面检查页面并持续修复", "这个复杂页面是否有必要", or to continue from
  an earlier product review. Do not use for a single read-only product review,
  visual direction formation alone, or implementation without live product
  evidence.
argument-hint: "[running product] [audience/task] [iteration boundary]"
---

# Iterative Product Improvement

## Principle expression

**Primary:** P03
**Supporting:** P15, P09, P13

This is an expression of the host Principle Sequence, not a new product-review
canon. P03 owns the change from one observed practice to the next; P15 keeps
that change minimum and constraint-preserving; P09 puts evidence at the layer
where it can change the current decision; P13 prevents a browser observation,
worker report, or attractive render from becoming accepted fact without a
traceable check. P16's action-form judgment remains owned by
`product-dogfood-review` and `visual-design`, rather than being copied here.

## Scope and existing owners

Own one judgment: **given a real product observation, what is the next smallest
practice that improves a named user outcome, and is the complexity being kept
or added necessary for that outcome?**

Compose the existing methods instead of replacing them:

- Use [`product-dogfood-review`](../product-dogfood-review/SKILL.md) for the
  read-only live task, page/state coverage, browser evidence, and maximum-three
  finding packet.
- Use [`practice-cycle`](../practice-cycle/SKILL.md) to turn that result into
  one next practice, a settled conclusion, or a route to another owner.
- Use [`visual-design`](../visual-design/SKILL.md) when the live contradiction is
  hierarchy, visual expression, component detail, or an accepted visual
  direction.
- Use [`disciplined-development`](../disciplined-development/SKILL.md),
  [`rossovia-development`](../rossovia-development/SKILL.md), or the project's
  implementation method only when a change is authorized. The implementation
  owner, acceptance owner, and merge authority remain external to this Skill.

This Skill does not create a round counter, review inbox, score, queue, task
system, page taxonomy, or automatic retry. “Round” is a recoverable description
of the next practice in the existing Plan/Task/evidence surface. It may end
after one practice or continue until no decision-changing observation remains.

## Start from the live object

Recover only enough context to choose the next practice:

```text
Running product, source/runtime revision, and identity:
Audience, important task, starting state, and success signal:
Existing review packet or prior practice result:
Pages/states/viewports currently covered and deferred:
Existing product and visual contracts:
Safe browser fixture and effect boundary:
Implementation, verification, acceptance, and merge owners:
Current hard constraints and unresolved uncertainty:
```

If there is no reachable running instance or safe browser boundary, stop with
`blocked: missing live evidence`. Do not turn static source inspection or a
screenshot into a product-use claim. If the request is only one read-only
review, route to `product-dogfood-review` and do not create an iteration.

## Context and attention

At activation, load the host `principles/SEQUENCE.md` and only P03, P15, P09,
and P13 interpretations. Load the existing product-review packet and the
current practice result. Load visual or implementation references only after a
live observation shows that they can change the next decision. Keep the Skill
prompt and the current task small; keep detailed screenshots, traces, and
volatile runtime facts in the review packet or on-demand evidence surface.

The stable context is the user outcome, hard constraint, and evidence contract.
The active context is the current page/state and one contradiction. Everything
else is deferred until it can affect the next practice. A safety, authority, or
recovery condition is never hidden merely because it is not currently central.

## Iterative loop

Each loop is a practice relation, not a mandatory ceremony:

1. **Observe.** Run or recover a representative user task in the real browser.
   Record the decisive state transition, expected versus actual result,
   viewport, and direct mechanical evidence. Separate experience observation,
   visual preference, source hypothesis, and human acceptance.
2. **Name the contradiction.** State what prevents the user's next valid
   action. Keep at most three decision-changing findings; put the rest in
   coverage or unresolved questions. Do not start with a page, component, or
   technology that has not been connected to a task consequence.
3. **Test necessity before polishing complexity.** For every complex page,
   panel, route, or information group implicated by the contradiction, answer
   `yes`, `no`, or `uncertain` to whether it is necessary. Use the gate in
   [necessity and iteration packet](references/necessity-and-iteration.md):
   name its unique user decision, canonical state owner, consequence if removed,
   retained complexity, and the smallest distinguishing probe. Complexity is
   not a defect by itself; a necessary page may still need a simpler expression.
4. **Choose one smallest practice.** Select the least irreversible change or
   probe that can alter the current understanding while preserving hard
   constraints. Prefer remove, merge, defer, or simplify when they solve the
   task; otherwise choose one local hierarchy, interaction, state, or recovery
   change. If necessity is `uncertain`, test before committing to polish.
5. **Assign and implement.** Route to the owning method and one write owner in
   an isolated branch/worktree when source changes are needed. Keep the Plan or
   Task's owner, dependency, acceptance, rejoin, and cleanup relation current.
   Do not let a review worker silently edit, accept, merge, or publish.
6. **Verify the changed experience.** Rebuild/restart the actual instance when
   required, then repeat the same user task and the smallest adjacent
   regression task at the relevant desktop/mobile states. Check loading, empty,
   error, disabled, long-content, and recovery states only where they can
   change the decision. Retain runtime identity, screenshot/trace, and the
   disconfirming observation. A green typecheck is not browser evidence.
7. **Reflect and choose disposition.** Record what changed, what did not, what
   the evidence now supports, and the next smallest practice. Use `yes`, `no`,
   or `uncertain` for named conditions; never use a 1–5 or 1–10 agent score.
   Settle when no decision-changing finding remains, continue when the result
   changes the next practice, or route a different owner when the contradiction
   belongs elsewhere. Do not continue merely to produce another round.

## Complexity necessity gate

Before retaining or enlarging a complex surface, answer:

```text
User task/decision that requires this surface:
Unique state or authority it owns:
What the user loses if it is removed or merged:
What complexity is essential versus accidental:
Simpler alternative considered:
Evidence now: yes | no | uncertain:
Smallest probe that could change this decision:
```

Use these dispositions:

- **yes:** retain the surface, then improve the leading comprehension or action
  failure; do not reopen its existence just because its treatment is rough.
- **no:** remove, merge, or route the content to its canonical owner; do not
  spend a polish round on an unnecessary page.
- **uncertain:** keep the current surface stable and run one safe task probe,
  comparison, or information-architecture experiment before redesigning it.

The gate is not a universal simplification rule. A page can be necessary
because it owns a distinct decision, recovery path, or authority boundary; a
page can be unnecessary even when it contains useful information if the user
has no distinct action there.

## Evidence and handoff

Use [the iteration packet](references/necessity-and-iteration.md) to return one
reconstructible record. Keep these claims separate:

- browser facts and source/runtime identity;
- experience interpretation and necessity disposition;
- worker or implementation claim;
- independent verification;
- human product, visual, acceptance, publication, or merge decision.

If the same finding survives a change, name the invariant that was preserved
and the failed variation rather than declaring the iteration ineffective. If a
query or route is not observable through the standard interface, record that as
an observability improvement candidate; do not read private state as a shortcut.

## Evaluation

Before treating this expression as behavior-proven, run the Action, Boundary,
and Context probes in [the evaluation reference](references/evaluation.md).
They test the decision checkpoints, not prose similarity. A structural or
installation pass is only `self-evaluated; attribution unproven` until a fresh
agent completes the same task packet against the same acceptance conditions.

## Boundaries

- Do not make multi-round work mandatory for a one-step fix or a complete
  review. The next practice must be earned by a result.
- Do not rank pages by visual complexity, number of controls, or agent score.
  Judge necessity through a user decision, state ownership, consequence, and
  evidence.
- Do not turn a preference into a product defect, or a worker report into
  acceptance. Route visual direction to `visual-design` and source diagnosis to
  `code-review`.
- Do not create a new observer, task, queue, runtime lifecycle, retry, score,
  or review schema for this loop. Use existing review packets and Plan/Task/Run
  evidence.
- Do not change source, product data, runtime configuration, Mission, PR, or
  worktree state during a review-only activation.
- Do not claim full page coverage when states, viewports, neighboring routes,
  or recovery paths remain unvisited.

## Completion standard

The activation is ready when the packet names the user task and live revision,
the current contradiction, the complexity necessity decision, the smallest
practice, the changed/unchanged evidence, and the next disposition. It is
`blocked` when live evidence or authority is missing, `inconclusive` when the
probe cannot distinguish the choices, and `settled` only when no
decision-changing next practice remains. These standings describe evidence;
they do not accept, merge, publish, or create a product fact.

## Principle source

When the host declares `principles/SEQUENCE.md`, it governs this activation;
read only P03, P15, P09, and P13. Otherwise use the packaged
[Sequence snapshot](references/sequence.md). The snapshot is a read-only
lineage projection, not a second canon.
