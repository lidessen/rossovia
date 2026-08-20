---
name: rossovia-development
description: >-
  Use when an Agent or external harness must develop Rossovia itself or a named
  project through Rossovia's capabilities. It chooses between local Rossovia
  dogfood and external-harness delegation, keeps one write owner, supplies
  receiver-specific main/worker/reviewer prompts, and closes the loop through
  verification, rebuild/restart, observation, and rollback. Triggers include
  "develop Rossovia", "改进 Rossovia", "自我开发", "dogfood", "修一下项目",
  "用 Rossovia 修改自己", "重要设计多轮迭代", and "并行研究后综合".
argument-hint: "[project or repository] [requested improvement]"
---

# Rossovia Development

## Principle expression

**Primary:** P09
**Supporting:** P15, P16, P13

## Purpose

Use this Skill for the whole development relation, regardless of which harness
is currently available. It is not a project implementation recipe and it does
not create a second task system.

The first decision is the execution mode:

| Mode | Preferred producer | External harness role |
|---|---|---|
| Local dogfood available and enabled | Rossovia's own bounded Task/Run | observe, shape, verify, or make a bounded fallback change only when Rossovia cannot cross a named capability boundary |
| Local dogfood unavailable or disabled | the active external harness through explicit delegation | Main retains the whole; independent design, implementation, and verification workers are used when the task warrants them |

If local dogfood is enabled, observer startup is part of that mode. Do not add a
second `--enable-observer` requirement. A future/current launcher may expose
`--dogfood`, with an explicit observer opt-out; check the active Workbench help
before using a flag and report an unimplemented flag as a capability gap.

## Method-expression modes

The stable harness base supplies the real Task/Run/Cell, tools, workspace,
effect, evidence, and acceptance boundaries. Skills, system prompts, and
receiver-facing plans form the **runtime method-expression layer**: they choose
how an Agent approaches the task while preserving those base contracts. “Post-
training” is a useful analogy for this layer, not a runtime component or a
request to change model weights.

Select a method from the task relation, not from a preferred workflow:

- For a consequential design, use [`practice-cycle`](../practice-cycle/SKILL.md)
  when the first practice cannot honestly settle the question. Each bounded
  round records its observation, what changed, remaining uncertainty, and the
  next smallest practice. This is not an automatic retry, fixed iteration
  count, or second lifecycle.
- For an open research question with genuinely separable directions, use
  [`agent-delegation`](../agent-delegation/SKILL.md) to form differentiated,
  usually read-only explorations, then have Main reconstruct and synthesize the
  whole against the same sources and acceptance relation. Do not concatenate,
  vote, or select by a numeric score.

The Plan remains semantic: outcome, constraints, sources, contribution
boundaries, dependencies, coverage, evidence, acceptance, and round/rejoin
relations. It must not encode provider, worker count, concurrency, topology
depth, or a swarm runtime. Those are replaceable method/carrier choices. When a
named condition is judged, use `yes`, `no`, or `uncertain`; do not substitute a
numeric quality or confidence scale.

## Main operating posture

The Main Agent is the development coordinator. It keeps the whole outcome and
raises its attention above individual edits: shape bounded contributions,
assign each to one producer or reviewer, order dependencies, steer named gaps,
and reconstruct the result from source and check evidence. Main retains
whole-task direction, shared-contract judgment, exception handling, independent
verification, integration, and the final handoff; a worker's return never
transfers those responsibilities.

Concrete work is assigned by default when it can settle independently. Keep a
change direct when it is trivial, tightly coupled to one contract or mutable
state, or crosses a named permission, security, privacy, or unavailable
capability boundary. This is a task-shaping exception, not a new authority,
approval gate, queue, or reason to fan out unconditionally. Main should not
duplicate a delegated implementation merely to retain local control.

When work is parallel or has multiple owners, Main must maintain a small
coordination projection in the existing plan/todo/task tools before releasing
the work and as owners return. For every contribution, make the owner,
independent branch/worktree, conflict boundary, state, dependencies,
acceptance/evidence, rejoin or merge action, cleanup condition, and unmerged
progress explicit. Keep that projection current when work starts, blocks,
changes owner, merges, is archived, or settles. It is a recoverable scheduling
view, not a new task database, approval gate, authority, or lifecycle;
`attention-management` may restore the governing relation, and
`practice-cycle` may choose the next practice, but neither replaces this
coordination responsibility.

A commit is a handoff, not the end of parallel work. The contribution is
complete only after its checks and a verifiable merge/rejoin result; otherwise
Main records it as open, suspended, blocked, or explicitly archived with the
remaining progress and a reactivation or cleanup condition. Do not silently
leave an unmerged branch or worktree behind.

## Start

Recover this small object before changing anything:

```text
Project/repository and source identity:
Requested outcome and observable acceptance:
Local Rossovia runtime: available | unavailable | unknown
Dogfood mode: enabled | disabled | unknown
External harness and delegation capability:
One write owner and exact worktree/effect boundary:
Main-retained whole, ordering, and verification obligations:
Method expression: direct | multi-round practice | parallel exploration | nested
  (why this relation is needed):
Plan obligations, dependencies, coverage, acceptance, and round/rejoin relation:
Candidate bounded contributions and their owners:
Owner branch/worktree, conflict, rejoin/merge, cleanup, and unmerged state:
Human intervention or acceptance still required:
```

Read only the project `AGENTS.md`, Rossovia's `ROSSOVIA.md` when present, the
scoped Workbench instructions, and the design/test source that can change the
current decision. Do not send the whole host configuration or skill catalog to
a worker.

## Common development loop

1. Resolve the project and current source/worktree without scanning or
   registering unspecified folders.
2. Shape one bounded change: outcome, in-scope effect, non-goals, disconfirming
   checks, and a reconstructible return. Identify contributions that can settle
   independently and the whole obligations Main retains. Choose a method
   expression only after this relation is clear. Keep the Plan's semantic
   obligations, dependencies, coverage, acceptance, and round/rejoin relation
   separate from the execution carrier. If there are multiple owners, record
   the owner/branch/worktree/conflict/state/dependency/acceptance/rejoin/
   cleanup/unmerged map in the existing plan/todo/task surface before dispatch.
3. Determine the mode above and assign each contribution to one producer or
   reviewer. Never run the same write contribution through Rossovia and an
   external harness at once.
4. Execute through the selected owner and keep claims separate from
   verification and Principal acceptance.
5. Observe the settled result through standard evidence. Missing visibility is
   a query-gap improvement, not permission to read private state.
6. When Rossovia itself changes, preserve a local known-good tag, build the
   coupled runtime, restart, smoke-check, and either roll forward or rebuild
   from the tag after a serious regression.
7. Return source identity, task/worktree, changed behavior, checks, runtime
   identity, observer/reviewer evidence, limitations, and the next decision.

## Local dogfood mode

Read [the dogfood reference](references/dogfood.md) and the project-local
[dogfood development profile](../../design/operations/ROSSOVIA-DOGFOOD-DEVELOPMENT.md).
Rossovia is the sole normal producer for the named change. The external
harness may inspect the standard Task/attempt/transcript/diff/check surfaces,
write an observation, or take over only after recording why Rossovia could not
make the next truthful step. Its fallback change returns to the same rebuild →
restart → smoke-check loop.

The observer is read-only, non-blocking, and uses standard APIs. It records a
small opinion or an exact query gap after settlement; it does not edit, retry,
accept, merge, rollback, or create a review lifecycle.

## External-only mode

When local Rossovia is unavailable or explicitly disabled, use
[`agent-delegation`](../agent-delegation/SKILL.md) for non-trivial work:

- Main coordinates the whole outcome, source context, effect boundary, order,
  synthesis, and final verification; concrete bounded work belongs to its
  assigned owner.
- A design/investigation worker, implementation worker, and independent
  verification worker are separate contributions only when the split reduces a
  named attention, conflict, latency, or independence problem.
- Use the self-contained [worker prompt](references/worker-prompt.md) and
  [reviewer prompt](references/reviewer-prompt.md); do not send workers this
  whole Skill or unrelated host history.
- A worker return is evidence, never acceptance, merge, publication, or a new
  authority. Main reconnects every claim to source and check evidence.

For a trivial, tightly coupled, or authority-bound change, stay direct.
Delegation is a default work-shaping posture for bounded work, not a mandatory
preflight or an unconditional fan-out.

## Human intervention

If Rossovia is the preferred producer but an implementation, provider, tool, or
evidence boundary prevents progress, the user may edit the source directly.
Record the reason and exact change, verify it through the normal boundary, and
return to the same mode-aware loop. Direct intervention does not silently grant
acceptance, merge, publication, or rollback authority.

## Non-goals

- no new dogfood daemon, observer queue, retry controller, or task lifecycle;
- no competing Rossovia and external write owners;
- no automatic acceptance, merge, publication, or rollback;
- no provider/account ordering embedded in this Skill;
- no copying `AGENTS.md`, `ROSSOVIA.md`, a full catalog, or private state into
  worker prompts.

## Return contract

```text
Mode and why it was selected:
Project/source/worktree/Task identity:
Producer and effect boundary:
Change and observable result:
Checks and independent evidence:
Runtime snapshot/restart/observer status:
Plan/todo/task owner-branch-worktree-conflict-state-dependency-acceptance/
rejoin-cleanup-unmerged status:
Limitations, query gaps, or human intervention:
Next ordinary action and Principal decision:
```

## References

- [Runtime modes](references/runtime-modes.md)
- [Dogfood reference](references/dogfood.md)
- [Worker prompt](references/worker-prompt.md)
- [Reviewer prompt](references/reviewer-prompt.md)
- [Context engineering](../context-engineering/SKILL.md)
- [Agent delegation](../agent-delegation/SKILL.md)
- [Task shaping](../task-shaping/SKILL.md)
- [Practice cycle](../practice-cycle/SKILL.md)

## Principle source

When the host declares `principles/SEQUENCE.md`, it governs this activation;
read only P09, P15, P16, and P13. Otherwise use the packaged
[Sequence snapshot](references/sequence.md). The snapshot is a read-only
lineage projection, not a second canon.
