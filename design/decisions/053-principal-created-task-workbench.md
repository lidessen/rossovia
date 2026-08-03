# Decision 053 — Workbench owns locally Principal-attributed tasks

**Status:** accepted MVP direction; supervised daily-use slice implemented and
exercised across registered projects; generic Agent execution and the full Blog
publication round trip remain pending
**Date:** 2026-07-28
**Extends:** [Decision 050](050-principal-workbench-supervised-mvp.md);
supersedes its receipt-only UI persistence boundary only for the local task
source defined here
**Human mandate:** make practical multi-project task management the current
Workbench goal so the system reliably solves real problems; Agent autonomy
supports that task system rather than replacing it.

## Concrete need

The first Principal Workbench can join project, Mission, runner, attention, and
Git observations into one task-shaped projection. It cannot yet create or
manage an ordinary task. In particular, its independent-task capability is
truthfully reported as unsupported because no source owns those facts.

That form is insufficient for daily use. A Principal needs to retain work that
may or may not already belong to a project, see human and Agent responsibility
through the same interaction, correct the same task over time, and distinguish
an Agent completion claim from verified or accepted completion.

Mission Records cannot absorb this need. A Mission preserves an authorized
cross-transition obligation and mainline return condition; it is not a general
backlog. Project task sources also remain owned by their projects and cannot be
copied into Rossovia merely to make the UI writable.

## Decision

Add one Workbench-owned source for tasks explicitly created through a local,
Principal-attributed Workbench action:

```text
$ROSSO_HOME/state/tasks.json
```

This source owns only a locally Principal-attributed work obligation:

- task identity, objective, and declared acceptance conditions;
- current lifecycle and next responsible actor;
- an optional local project and Worktree context;
- corrections retained against the same task;
- a submitted result claim and its evidence references; and
- a locally Principal-attributed acceptance or reopening of that task.

The source does not own a target project's task facts, Mission meaning, Git or
Worktree state, runner activity, effect evidence, commit, merge, publication,
or product acceptance. The Workbench UI and CLI are mutation adapters over this
source, not independent task truth. They retain supplied attribution but do not
authenticate a Principal identity; this MVP reports its local identity
assurance as `unverified-local-interaction`.

The implementation has three distinct interaction layers:

1. **Agent control plane.** Rossovia's sources, CLI, typed task port, routing,
   and evidence joins serve Agents and adapters. This layer owns the durable
   local task state and invariant mutation semantics.
2. **Principal workspace.** The human-facing multi-project task shell projects
   the control-plane state as projects, Worktrees, tasks, attention, detail,
   and actions. It owns navigation and interaction state, not task truth.
3. **Execution adapters.** Harness-native delegation and the bounded Autonomy
   adapters execute or observe work under their own authority and evidence
   contracts. They may return claims to a task, but Workbench does not become
   their scheduler or copy their live internal state.

The CLI and HTTP task adapters share the typed local-task control-plane port.
Cross-boundary launch, correction delivery, recovery, and runtime verification
remain separate adapters because their live checks and authority are not local
task mutations. Direct sub-agent delegation uses the active harness and the
`agent-delegation` method; a Workbench task may retain the resulting claim and
evidence, but delegation does not depend on Workbench runtime or UI state.

## Source and projection boundaries

| Source | Owns | Workbench may do |
|---|---|---|
| Workbench local-task source | locally Principal-attributed task meaning and lifecycle | create, correct, assign responsibility, receive a result claim, accept locally, reopen, and project |
| target project's declared task source | that project's native tasks and mutation rules | read through a declared query; mutate only through a separately declared mutation contract |
| project-local Mission Record | cross-transition obligation, contradiction, acceptance, and return condition | project as a distinct work item; never use as the default backlog |
| Git and observed Worktrees | repository location, bytes, branch, HEAD, and dirty state | attach observation context without manufacturing a task-to-Worktree authority binding |
| Mission runner and timeline | semantic input, live execution, interruption, reconciliation, and recovery | join exact live evidence and send only currently supported runner actions |
| effect and verification evidence | candidate changes and scoped judgments | cite or project; never turn a worker report into task acceptance |

A project-context task remains owned by the Workbench source. Its project ID
and selected Worktree identify where the Principal expects the work to matter;
they do not create a project task, authorize writes, or establish a
Mission-to-Worktree relation. A project-native task remains read-only until its
project declares a writable task contract.

## Task movement

The minimum useful movement is:

```text
Principal-attributed local action creates task
  -> Principal, Agent, or external actor becomes next responsible
  -> corrections remain attached to the same task
  -> an actor submits a result claim plus evidence references
  -> task becomes verifying and returns to the Principal
  -> a Principal-attributed local action accepts or reopens the obligation
```

Only a locally Principal-attributed acceptance action settles a Workbench local
task. Submission by an Agent is a claim. The mechanism does not authenticate
the accepting person, and local settlement does not settle a Mission, accept
product meaning, or grant integration and publication authority.

Every mutation re-reads the current source, validates the expected source and
task revision, validates the whole next state, and atomically replaces the
local source. This detects a revision already stale when the mutation reads it,
and atomic replacement prevents a partially written source. Concurrent writers
that read the same revision are not supported and may overwrite one another;
the MVP does not claim compare-and-swap, cross-process serialization, or
distributed coordination.

## Agent execution boundary

This decision does not authorize a local task to create a Mission, select a
runtime, consume an execution receipt, or launch an Agent. The first
implementation may:

- assign `Agent` as the next responsible actor without claiming that an Agent
  is live;
- retain an optional registered-project Mission context after verifying that
  Mission in the project's current primary workspace, while treating it only
  as task relevance—not as an execution association;
- explicitly associate the task with an already authorized Mission execution;
- project that runner's activity, effects, verification, and recovery without
  copying them into the task source; and
- retain a correction locally while showing whether it has or has not been
  delivered to the associated runner.

Mission context alone cannot identify an execution. The same Mission may have
multiple authorizations and carriers, so an exact execution association
must retain a stable authorization selector such as `authorizationId` plus
`proposalDigest`, then re-verify the owning receipt and consumption claim.
Even that selector cannot attribute a current runner or effect unless its
runtime-owned evidence exposes the same launch-authorization lineage. Until
then, a runner with the same project and Mission is only a
`same-mission-current-carrier` observation with execution attribution
unproven; it cannot place the task in `Agent work`.

Exact execution references are append-only task evidence links, not task
lifecycle state. Each link retains the authorization ID, proposal digest,
canonical home-relative claim reference, local link time, and action source.
Before presenting a link as current, the Workbench revalidates the claim and
receipt, requires the consumption claim and Mission turn to carry the same
Workbench task-context reference retained by the link, then compares the
selector with the runtime-owned structured launch reference on the Mission turn
and effect. A missing legacy reference, a changed selector, a task-context
mismatch, or a turn/effect mismatch remains visible as unavailable or unproven
evidence; it never rewrites or silently removes the task link.

A task correction is local task state first. For a runtime with no structured
turn-guidance contract, an explicit delivery action is available only when the
latest link resolves to one exact current turn and one live runner. It
contributes the correction with a deterministic input ID bound to the task,
correction, and authorization, then appends the returned Mission input receipt
to that correction. Runner, Mission, authorization, or revision drift rejects
the action before new input is sent. After the Mission returns the exact
receipt, later local source or task revision movement cannot erase that
already-occurring external fact; the evidence append rechecks the correction
and execution selector instead. An exact retry reuses the retained receipt.
The receipt establishes delivery to that carrier only. It does not establish
understanding, application, verification, reconciliation, or task acceptance.
The local source owns the append-only receipt reference; the Mission timeline
owns the semantic input. Delivery changes neither task lifecycle nor next
actor.

The Blog launch adapter uses a stronger bounded form. The server serializes the
exact task objective, acceptance conditions, and every correction retained at
launch into one immutable task-execution context. The runtime binds each
launch-time correction to the Mission turn as a digest-backed `guidanceRef`.
Workbench may then show that correction as current-turn guidance without
claiming application. A correction created after that snapshot is visibly
deferred to the next authorized turn, blocks result submission for the current
task revision, and is not silently routed through the weaker live-input path.

An explicit recovery action is available only for the task's latest exact
execution when that execution resolves to one identified interrupted turn, one
live runner, and an advertised `resume` capability. The request binds the task
and source revisions, authorization ID, proposal digest, canonical consumption
claim, the latest link's Workbench task-context reference on that claim and the
Mission turn, the current task Worktree against the consumed candidate, turn
ID, Mission, runner ID, and expected interrupted state. The server rebuilds the
candidate and re-reads the runner's current activity immediately before sending
the guarded recovery command. Missing turn identity,
selector or task-context drift, another runner, or a capability change rejects
the action without a runner mutation. Recovery remains Autonomy state: the task
records no synthetic recovery event and changes neither lifecycle nor next
actor. The first Blog recovery implementation is narrower than arbitrary
resume: it settles only
when one direct child run and its Git effect are already durably settled and
still reproduce the consumed authorization, task guidance, Worktree, HEAD,
scope, changed paths, file hashes, and patch digest. It invokes no parent
model, child driver, or writer. An earlier interruption, uncertain effect,
missing child settlement, or drift remains interrupted. The adapter does not
expose replacement, abandonment, authorization reuse, or generic Mission
recovery from a task.

Result citations and runtime verification are different evidence classes.
Ordinary submission retains actor-supplied references as an unverified claim.
It never interprets a filename, `claim:` prefix, or other reference text as a
verdict. A separate UI-only submission may retain a runtime verification
selector when Autonomy projects an exact current verified effect and the
Workbench joins it to the task's latest authorization, structured turn/effect
lineage, the latest link's Workbench task-context reference on the consumption
claim and Mission turn, consumed candidate Worktree, and declared task Worktree
when present. The retained evidence link contains the authorization ID plus an
effect and unique verification-event selector; runtime verdicts, subject bytes,
scope, and freshness stay in Autonomy. Acceptance re-resolves the same
selector. Drift leaves the task in verification, while an explicit acceptance
of an ordinary claim records `agent-claim` as its basis. Both remain
Workbench-local acceptance only.

Starting a new Agent execution from a task is a separate bounded operating
trial. It requires an exact task revision, declared target project and
Worktree, target-project instructions and verification surfaces, accepted
resource/effect/data boundaries, and a distinct Principal action. Ordinary
local reversible steps inside an accepted execution envelope should not require
stepwise approval, but the envelope cannot be inferred from task creation.

The first implemented launch adapter is limited to the agent-era Blog
publication runtime. It accepts only an already-authorized execution selector
from the browser, derives the trusted runtime and environment bindings on the
server, supplies the immutable task-execution context, requires a clean
detached Worktree, and records the task link only after observing the
runtime-owned one-use consumption claim. This proves the shape of the task
entry; it is not a generic runtime registry or evidence that the
representative Blog task has completed the round trip.

## Principal Workbench form

Human decisions, Agent work, locally Principal-attributed tasks, project-native tasks, and
observed exceptions use one work-item visual grammar. Their source, next actor,
lifecycle, freshness, and allowed action remain distinct.

The minimum interaction provides:

- creation of an independent task or a task with observed project context;
- one multi-project task list with `Needs you`, `Agent work`, `Independent`,
  project, verifying, and completed views;
- a task detail that shows the current objective, acceptance, context,
  corrections, result claim, evidence references, and next valid action; and
- reload and process-restart recovery from the local source; and
- URL-backed restoration of stable view, filter, project, and item identities
  across reload, Back, and Forward without putting Worktree paths, drafts,
  evidence, receipts, or authorization data in the URL.

The task list is the current practical product surface. It remains a shell over
different underlying sources rather than the backend organization model for
Agents.

## Verification

The first implementation is supported only when:

1. create, list, assign, correct, submit, accept, and reopen survive reload and
   reject revisions already stale when read; concurrent same-revision writers
   remain outside the MVP guarantee;
2. missing or malformed task state makes the projection incomplete rather than
   displaying a factual zero;
3. project and Worktree context remains observation-only and unknown identities
   are rejected;
4. assigning an Agent without live runner evidence does not appear as active
   Agent work;
5. result submission enters verification and only a later locally
   Principal-attributed acceptance action settles the local task, with identity
   assurance still reported as unverified; actor-supplied references stay
   unverified, while a runtime-verified result must retain and revalidate an
   exact Autonomy selector and the latest link's Workbench task-context
   reference on its consumption claim and Mission turn at acceptance;
6. ordinary local task mutations never change Mission, Git, runner, effect,
   integration, or publication state; the explicit correction-delivery action
   may append one exact-target Mission contribution but gains no
   reconciliation, effect, acceptance, integration, or publication authority;
7. the explicit task recovery action is offered only for the latest exact
   interrupted execution with a current turn ID and runtime-declared resume
   capability, requires the latest link's Workbench task-context reference on
   the consumption claim and Mission turn, requires the current task Worktree
   to remain the consumed candidate, revalidates the full selector on the final
   activity read, and, for the Blog adapter, can settle only
   already-retained child and Git-effect evidence without replay; it leaves task
   lifecycle and responsibility unchanged; and
8. desktop and mobile operation can complete the movement without CLI or raw
   JSON.

The representative system trial uses `agent-era-blog`: retain one real task,
associate it with the correct project and Worktree, observe or start only a
separately authorized Agent execution, correct the same task, recover after an
interruption, return target-project-declared verification evidence, and obtain
local Principal-attributed acceptance.

Do not add automatic cross-project scheduling, a universal project-task
mutation protocol, generalized permissions, mandatory Swarms, decorative
activity visualization, or automatic merge and publication to complete this
MVP.
