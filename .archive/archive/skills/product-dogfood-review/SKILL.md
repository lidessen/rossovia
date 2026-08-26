---
name: product-dogfood-review
description: >-
  Review a real running product from the user's point of view by inventorying
  its pages and states, completing representative tasks in a supplied browser,
  and returning a traceable, decision-sized review packet. Use when asked to
  "dogfood the product", "review every page from a user's perspective",
  "全面 review 页面/流程", or "从使用角度检查 UI". Do not use for a
  visual-contract or aesthetic review alone, source-level code review,
  accessibility/performance audit alone, implementation, worker topology, or
  merge authority.
argument-hint: "[running instance] [audience/task] [review boundary]"
---

# Product Dogfood Review

## Principle expression

**Primary:** P16
**Supporting:** P09, P05, P13

## Principle source

First detect whether the host project declares `principles/SEQUENCE.md` and
matching interpretations. When it does, that host source governs this task;
read only P16, P09, P05, and P13. When the host has no such source, use the
read-only packaged fallback in [references/sequence.md](references/sequence.md).
The packaged projection is a lineage baseline, not a second canon; never
silently reconcile it with a host source or edit it during a review.

## Scope

Own one recurring judgment: **can a real audience complete the important
tasks of a running product across its pages, states, and recovery paths, and
what is the smallest evidence-backed next decision?**

The object is a live product experience, not a screenshot or source tree. The
reviewer establishes a page/state inventory, selects representative user
tasks, operates the supplied browser against the actual running revision, and
returns a compact packet that another person can verify. A route that is not
covered remains visible as uncovered; an attractive render is not evidence of
successful use.

This skill is read-only by default. Browser actions may use an explicitly
provided fixture or test account, but the reviewer does not edit source code,
rewrite product data, publish, merge, or silently accept a design. If a task
requires a durable side effect and no safe fixture or authority is supplied,
stop at the boundary and record the missing probe.

## Start

Recover only the context that can change the next user-action decision:

```text
Object and audience:
User outcome or task family under review:
Running instance, runtime revision, and identity evidence:
In-scope entry points/pages and review contract:
Allowed browser capability, fixture, and effect boundary:
Required states, recovery paths, and viewports:
Existing visual or product contract, if one is accepted:
Acceptance owner and handoff destination:
```

If there is no reachable running instance, browser capability, or safe effect
boundary, report `blocked: missing runtime evidence`; do not substitute prose,
static source inspection, or a guessed route map for dogfood. Treat supplied
route lists and contracts as scope inputs, not as proof that a page works.

## Context discipline

At activation, load only the page/entry-point inventory, the project's review
contract and task sources, the browser capability description, and the current
runtime identity. Retrieve source, logs, or design material only after a live
observation shows that it can distinguish a mechanical cause, owner, or
verification path. Do not pass the whole repository to a review worker. Keep
volatile session traces and screenshots in the packet; do not promote them to
product truth without a named verifier.

## Core loop

1. **Form the use object.** State who is acting, the intended outcome, the
   starting condition, success signal, and recovery obligation. Separate an
   observed product contract from an inferred preference.
2. **Inventory before judging.** Enumerate every in-scope page or entry point,
   its reachable state families, important transitions, neighboring continuity,
   and coverage status. Give every page at least a reachability/state smoke;
   give each distinct user action a representative task. Do not claim full
   coverage when a page, state, or route remains unvisited.
3. **Shape a small task matrix.** Choose tasks that exercise the product's
   main user outcomes, not a checklist of controls. Include the highest-risk
   empty, loading, error, disabled, permission, long-content, and recovery
   states that can change the action. Sample desktop and mobile viewports and
   record why an untested combination is immaterial or deferred.
4. **Dogfood the real instance.** Navigate and act in the browser. For each
   task, record the action sequence, expected and actual state, observable
   state changes, request/console evidence when the capability exposes it,
   and a screenshot at the decisive transition or discrepancy. Reproduce a
   suspected defect once with the smallest safe action; do not repair it.
5. **Classify before ranking.** Keep mechanical facts (rendering, overflow,
   interaction, network/state transition, accessibility signal, and source
   integrity) separate from experience observations (orientation, action
   discoverability, continuity, comprehension, recovery, and effort) and from
   preference or human acceptance. A browser failure, visual preference, or
   source guess is not a product defect by itself.
6. **Return decision-sized findings.** Admit at most three findings that can
   change a product decision. Each finding needs direct evidence provenance,
   the real owning layer, affected pages/states, an invariant/variation
   statement, the smallest next probe, and a disconfirming observation. Put
   non-ranked observations in coverage or unresolved questions; do not turn a
   complete inventory into an unprioritized redesign backlog.
7. **Hand off without authority leakage.** Return the packet using
   [the page-review template](references/page-review-packet.md). Route visual
   contract mismatches to `visual-design`, source defects to `code-review`,
   and worker topology/context or independent-review questions to
   `agent-delegation`. Fixes, acceptance, publication, and merge are separate
   tasks owned by their designated actors.

## Evaluation before completion

Run the reproducible Action, Boundary, and Context probes in
[the evaluation reference](references/evaluation.md). The Action probe must
   complete one real user task and retain a state change, request observation,
   and screenshot. The Boundary probe must show that runtime/browser failure,
   preference, and code speculation are not promoted to product findings and
   that no code or durable product state is changed. The Context probe must
   retain the loaded entry points, review contract, browser capability, and
   runtime identity while showing that unrelated repository detail was omitted.

## Return contract

Return one packet containing:

```text
Object, audience, and task:
Runtime revision and instance identity:
Routes/pages, states/transitions, and viewports:
Coverage and deferred combinations:
Mechanical evidence:
Experience observations:
Maximum three findings with provenance and owner:
Invariant to preserve and variation to permit:
Smallest next probe and disconfirming observation:
Unresolved or human acceptance questions:
No-change cases:
Routing and effect/authority handoff:
```

Use `ready`, `ready-with-residual-risk`, `blocked`, or `inconclusive` only with
the evidence that supports the standing. A worker report is a claim and
review evidence, not acceptance or shared product fact.

## Boundaries

- Do not use visual polish or a design-system token difference as a proxy for
  task success; use `visual-design` when the question is conformance to an
  accepted visual direction or aesthetic acceptance.
- Do not infer a source defect from a failed interaction without reproducing
  the live behavior and recording the runtime boundary; use `code-review` for
  source-level diagnosis after that evidence exists.
- Do not make delegation, page ownership, or worker count part of the product
  verdict. Use `agent-delegation` to form isolated worker prompts and reconnect
  their packets; this skill owns the review object and evidence contract.
- Do not claim accessibility, performance, backend correctness, or product
  acceptance unless the supplied capability and designated authority provide
  direct evidence for that claim.
- Do not change code, durable data, route contracts, review sources, Mission
  state, Tasks, PRs, or runtime configuration as part of this review.
