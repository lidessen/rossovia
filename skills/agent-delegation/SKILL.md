---
name: agent-delegation
description: >-
  Decide and operate bounded sub-agent contributions while one Main Agent
  retains the whole outcome, synthesis, and verification responsibility. Use
  when the user asks to use sub-agents, delegate, parallelize, form a swarm, or
  obtain an independent critic; when a non-trivial task contains independent
  investigations or disjoint implementation ownership; or when producer bias
  makes a fresh reviewer decision-relevant. Triggers include "use subagents",
  "delegate this", "parallel review", "多 Agent", "用 sub agent", "并行调查",
  and "找一个独立 reviewer". Do not use for a routine one-step task, to split
  coupled shared-state work among multiple writers, or as a replacement for a
  persistent orchestration runtime.
---

# Agent Delegation

## Principle expression

**Primary:** P09
**Supporting:** P15, P13, P05

## Scope

Use this Skill as the **Main Agent only**. Own one judgment:

> Which bounded contributions should the active environment delegate, what
> context and effect boundary should each role receive, and how should their
> evidence be reconnected to the whole?

This Skill operates delegation directly through the current harness. It does
not require or initialize Workbench, Work Cell, a task database, a daemon, or
another agent system. It does not own domain truth, semantic acceptance,
provider choice, concurrency policy, retry policy, or durable execution state.

Do not pass this file wholesale to a worker or reviewer. Main-side construction
lives in [delegation.md](references/delegation.md); worker-only and
reviewer-only contracts live in [worker.md](references/worker.md) and
[reviewer.md](references/reviewer.md).

## Principle source

Use a host `principles/SEQUENCE.md` and matching interpretations when present.
Otherwise use the read-only package in `references/sequence.md`. Read only P09,
P15, P13, and P05. P09 is the stable lead because delegation protects the Main
Agent's decision-relevant context; the supports constrain coordination cost,
claim admission, and case-specific coupling.

## Start

Before delegating, form this compact Main-side view:

```text
Whole outcome, source revision, and acceptance owner:
Load-bearing judgment and relations retained by Main:
Candidate contributions and their local evidence:
Effect or write ownership for each contribution:
Expected benefit: attention | latency | isolation | independent perspective:
Coordination or reconstruction cost:
Active harness capability and missing capability:
```

If the whole or semantic partition is not yet coherent, use the owning domain
method or `task-shaping` first. This Skill does not invent review packets,
refactoring boundaries, research questions, or project policy.

## Core method

1. **Actively inspect the task for contributions.** Do not wait for the human
   to enumerate sub-tasks. Look for independently inspectable source fields,
   disjoint effect owners, locally verifiable implementation units, or a fresh
   critic that can expose producer-correlated error.
2. **Choose the smallest useful topology.** Use the topology and contribution
   gate in `references/delegation.md`. Keep work direct when coordination costs
   more than it changes evidence or latency. Preserve two hard boundaries:
   shared mutable effects have one writer, and a review counts as independent
   only when its context is isolated from producer reasoning.
3. **Contract each contribution.** Read `references/delegation.md`. Give every
   worker an exact whole constraint, bounded contribution, sources and
   revision, effect ownership, required evidence, return shape, stop signal,
   and withheld authorities. Before release, load exactly one applicable role
   contract—`references/worker.md` or `references/reviewer.md`—and embed its
   complete contents in the native delegate prompt. Do not require a child to
   discover a Skill-relative path. Give a reviewer the exact candidate,
   acceptance contract, and narrow evidence in addition to its embedded role
   contract.
4. **Release through the active environment.** Use its supported sub-agent or
   delegation capability directly. Do not start another system merely to gain
   delegation. While contributions run, continue Main-side synthesis,
   preparation, or other non-conflicting work instead of waiting immediately.
5. **Steer without duplicating ownership.** Use the runtime-neutral steering
   map in `references/delegation.md`. Preserve the existing owner for a named
   gap; create a new delegate only for a genuinely distinct contribution or
   independent review.
6. **Reconnect evidence to the whole.** Use a temporary obligation map:

   ```text
   whole obligation -> delegate claim -> source/effect evidence
   -> Main or reviewer check -> standing
   ```

   Resolve disagreement against named sources and the frozen whole, never by
   vote or concatenation. Before using an exact claim from child-only sources
   as a premise, record its source scope and lineage, the exact admitted claim,
   remaining uncertainty, and who retains judgment. Without that relation,
   treat the return as a lead to verify rather than silently discarding it or
   promoting it to fact. Preserve dissent and `unverifiable` results.
7. **Keep claims and verification distinct.** A worker's successful return is
   a claim with evidence, not accepted fact. The Main Agent ensures appropriate
   verification occurs and retains the final response, but does not relabel a
   producer self-check as independent verification. A reviewer may reject or
   qualify the candidate; it cannot accept, merge, publish, or redesign it.
8. **Adapt from observed failure.** Apply the reshape signals in
   `references/delegation.md` instead of making a failing partition repeat
   longer. Route a result that changes the next practice to `practice-cycle`.

## Progressive loading

- Read `references/delegation.md` whenever constructing or supervising a
  delegated contribution.
- Load `references/worker.md` only to embed it in an implementation or
  investigation worker's prompt; it does not become Main-side policy.
- Load `references/reviewer.md` only to embed it in a non-producing reviewer's
  prompt; do not reuse the maker's role contract.
- Do not load all three role files merely because delegation is available.

## Boundaries

- Available agents and file count are not reasons to fan out.
- Parallel contributors must not own the same mutable effect or independently
  redefine one shared contract.
- Default to no recursive delegation. A worker may create children only when
  its envelope explicitly grants that bounded capability.
- Do not leak unrelated Main history as a substitute for a self-contained
  contribution contract.
- Do not optimize agent count, concurrency, output length, or activity. The
  measure is accepted work, decision-changing evidence, reduced Main attention,
  or reduced latency without added conflict.
- Runtime mechanics such as capacity, cancellation, retry, persistence, and
  recovery remain properties of the active harness.

## Completion standard

Delegation is complete when the whole remains owned, every contribution has a
bounded role and effect surface, returned claims are traceable, conflicts and
unknowns are reconstructed rather than voted away, appropriate verification
has occurred, and no sub-agent result silently gained human or project
acceptance authority.
