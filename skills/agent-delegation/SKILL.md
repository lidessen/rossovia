---
name: agent-delegation
description: >-
  Decide and operate a portable one-Main/many-child working mode while the Main
  Agent retains the whole outcome, synthesis, and verification responsibility.
  Use when the user asks to use sub-agents, delegate, parallelize, form a swarm,
  coordinate several explicit Runs, or obtain an independent critic; when a
  non-trivial task contains independent investigations or disjoint implementation
  ownership; or when producer bias makes a fresh reviewer decision-relevant.
  Map the same semantic work units to the active harness, including native
  sub-agents in Codex-class tools or an injected sub-worker capability backed
  by explicit persistent Runs in Rossovia-class runtimes. Triggers include
  "use subagents", "one main many children",
  "delegate this", "parallel review", "一主多子", "多 Agent", "用 sub agent",
  "多 Run 编排", "并行调查", and "找一个独立 reviewer". Do not use for a
  routine one-step task, to split coupled shared-state work among multiple
  writers, or to create a second lifecycle beside the active runtime.
---

# Agent Delegation

## Principle expression

**Primary:** P09
**Supporting:** P15, P13, P05

## Scope

Use this Skill from the Agent that owns the **current whole**. A delegated
worker may become the local Main for a newly discovered sub-contribution
without becoming owner of its parent's whole. Own one judgment:

> Which bounded contributions should the active environment delegate, what
> context and effect boundary should each role receive, and how should their
> evidence be reconnected to the whole?

This Skill forms one semantic organization, then maps each bounded contribution
to the current harness. A session-local harness may use native delegates. A
Main Agent executing inside a generic Work Cell may receive one caller-injected
sub-worker tool whose adapter creates explicit child Runs in the persistent
orchestration owner. The mapping changes the execution carrier, not the task
partition, evidence relation, or authority; Work Cell gains no child lifecycle.

Do not initialize Workbench, Work Cell, a task database, a daemon, or another
agent system merely to obtain delegation. Use an already-active persistent
runtime only when its separately owned Task standing, Run identity, control,
recovery, or effect isolation is part of the requested work. This Skill does not
own domain truth, semantic acceptance, provider choice, concurrency policy,
retry policy, or durable execution state.

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
Execution mapping: direct | native delegate | injected sub-worker | bounded hybrid:
Inherited whole, effect, and authority boundary if already delegated:
```

If the whole or semantic partition is not yet coherent, use the owning domain
method or `task-shaping` first. This Skill does not invent review packets,
refactoring boundaries, research questions, or project policy.

## Core method

1. **Actively inspect the task for contributions.** Do not wait for the human
   to enumerate sub-tasks. Look for independently inspectable source fields,
   disjoint effect owners, locally verifiable implementation units, or a fresh
   critic that can expose producer-correlated error.
2. **Choose the smallest useful semantic topology.** Use the topology and
   contribution gate in `references/delegation.md`. Describe work units,
   dependencies, effects, evidence, and returns before selecting runtime
   carriers. Keep work direct when coordination costs more than it changes
   evidence or latency. Preserve two hard boundaries: shared mutable effects
   have one writer, and a review counts as independent only when its context is
   isolated from producer reasoning.
3. **Contract each contribution.** Read `references/delegation.md`. Give every
   child four receiver-facing parts in this order: a concrete contribution
   relation only when it changes attention or responsibility; the concise
   portable method; the exact task contract; and the return contract. A
   contribution relation states the object and bounded action, downstream use,
   and explicit non-goals—it is never a title. Load exactly one applicable
   contract—`references/worker.md` or
   `references/reviewer.md`—and inline all of its execution and return
   constraints into those last two parts. Do this for native, injected, and
   nested children; never make a child discover a Skill-relative path. Omit
   parent and runtime internals that do not change the child's action. Define a
   necessary project term at first use by its object, boundary, and relevance.
4. **Map without changing meaning.** Read `references/runtime-mapping.md` when
   choosing between native delegates, a caller-injected sub-worker tool backed
   by explicit persistent Runs, or a bounded hybrid. Map one contribution to
   exactly one execution owner. A native child handle and a durable child Run
   ID are different lifecycle facts, but they must receive the same complete
   child prompt and return the same class of claim and evidence. Concrete work
   and responsibility differentiate the Agent; do not encode prompt language
   as runtime types or teach Work Cell the child lifecycle.
5. **Release through the active environment.** Use its supported delegation
   capability directly. Do not start another system merely to gain
   delegation, and never dispatch the same contribution through two carriers.
   While contributions run, continue Main-side synthesis, preparation, or other
   non-conflicting work instead of waiting immediately.
6. **Steer without duplicating ownership.** Use the runtime-neutral steering
   map in `references/delegation.md`. Preserve the existing owner for a named
   gap; create a new delegate only for a genuinely distinct contribution or
   independent review. In a persistent runtime, a changed Task premise normally
   produces a correction and a newly authorized Run; transport retry or control
   of one exact live Run does not become a fresh Agent execution.
7. **Reconnect evidence to the whole.** Use a temporary obligation map:

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
8. **Keep claims and verification distinct.** A worker's successful return is
   a claim with evidence, not accepted fact. The Main Agent ensures appropriate
   verification occurs and retains the final response, but does not relabel a
   producer self-check as independent verification. A reviewer may reject or
   qualify the candidate; it cannot accept, merge, publish, or redesign it.
9. **Adapt from observed failure.** Apply the reshape signals in
   `references/delegation.md` instead of making a failing partition repeat
   longer. Judge a nested delegation, direct execution, or other topology
   choice by task fidelity, inherited effect and authority boundaries,
   reconstructable evidence, and its actual attention, latency, and
   coordination consequences—not by conformance to a preferred depth. Route a
   result that changes the next practice to `practice-cycle`.

## Progressive loading

- Read `references/delegation.md` whenever constructing or supervising a
  delegated contribution.
- Read `references/runtime-mapping.md` when the active environment offers more
  than one execution carrier, when mapping the mode to a persistent Run
  runtime, or when moving the same topology between harnesses.
- Load `references/worker.md` only to inline its complete execution and return
  constraints into an implementation or investigation prompt; it does not
  become Main-side policy.
- Load `references/reviewer.md` only to inline its complete review and return
  constraints into a non-producing reviewer's prompt; do not reuse the maker's
  contract.
- Do not load every contract file merely because delegation is available.

## Boundaries

- Available agents and file count are not reasons to fan out.
- Parallel contributors must not own the same mutable effect or independently
  redefine one shared contract.
- Prefer direct work for an already local contribution. A delegated worker may
  re-delegate only when its envelope explicitly makes that posture available
  and a newly discovered bounded contribution has a concrete attention,
  latency, isolation, or independent-evidence benefit that can repay
  coordination cost. Keep granted effects and authority the same or narrower;
  disclose the nested topology and reconnect its evidence through the
  immediate parent.
- Deny a delegation capability only for a named consequence that lineage,
  effect containment, evidence, or recovery cannot safely govern. A process
  preference is guidance, not an authority boundary.
- Do not leak unrelated Main history as a substitute for a self-contained
  contribution contract.
- Do not optimize agent count, concurrency, output length, or activity. The
  measure is accepted work, decision-changing evidence, reduced Main attention,
  or reduced latency without added conflict.
- Runtime mechanics such as capacity, cancellation, retry, persistence, and
  recovery remain properties of the active harness.
- A native delegate handle is not silently promoted into a durable Run, and a
  persistent Run is not collapsed into a prompt-only child. Preserve the
  lifecycle evidence the chosen harness actually owns.
- In a persistent runtime, one child contribution maps to one explicit child
  Run and at most one execution unit under that runtime's contract. The Main may
  request it through an injected tool while itself executes inside a Work Cell;
  the adapter, not Work Cell, owns child identity and lifecycle. Multi-child
  work is several Runs related by the Main's current obligation map, not one
  implicit multi-execution aggregate or a coded team object.

## Completion standard

Delegation is complete when the whole remains owned, every contribution has a
bounded role and effect surface, returned claims are traceable, conflicts and
unknowns are reconstructed rather than voted away, appropriate verification
has occurred, nested contributions remain inside inherited authority and are
reconnected through their immediate parent, and no sub-agent result silently
gained human or project acceptance authority.
