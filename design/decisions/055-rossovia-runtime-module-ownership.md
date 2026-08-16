# Decision 055 — Rossovia runtime module ownership

**Status:** accepted target architecture; staged migration pending
**Date:** 2026-08-16
**Approved by:** Principal-selected transition A
**Source review:** [Rossovia runtime module architecture review](../organization/sessions/2026-08-16-rossovia-runtime-module-review.md)
**Migration:** [Rossovia runtime ownership migration plan](../organization/rossovia-runtime-ownership-migration.md)

## Concrete pressure

Rossovia accumulated several useful but partially overlapping ways to describe
and supervise execution: ordinary Task runs, conversation carriers, Mission
runners, contributions, Swarm coordination, attempts, settlements, controls,
and recovery operations. The physical Workbench package also contains Project
and Task management, execution ownership, provider and host adapters, and
presentation code.

The individual mechanisms were often justified by a local failure. Their
accumulation nevertheless creates an architectural failure: more than one
record or component can appear to own execution standing, Worktree exclusion,
recovery, or result truth. A future Agent or maintainer must reconstruct the
system from implementation history before it can decide where new behavior
belongs or which mechanism may be removed.

The system needs one accepted ownership model before further execution
mechanisms are added or existing mechanisms are consolidated.

## Decision

Rossovia has four logical runtime modules and one replaceable presentation
layer. These are authority and responsibility boundaries, not a required
package, process, or deployment topology.

| Part | Owns | Does not own |
|---|---|---|
| **Workbench** | Project identity and Worktree binding; Principal-attributed Task objective, todos, corrections, lifecycle, claims, semantic reviews, and Principal acceptance | Conversation, worker selection, execution, live control, recovery, provider protocol, or UI state |
| **Orchestration Runtime** | Main-Agent context and judgment; worker-selection policy; one Run lifecycle; shared-Worktree writer ownership; live Run control; result attribution; optional Mission continuity and multi-Run strategies | Project or Task meaning, Cell internals, provider protocol, or result acceptance |
| **Work Cell** | One immutable bounded execution; caller-supplied capability boundary; one driver invocation; cancellation; mechanical verification; bounded trace and usage when available; at most one final | Workbench, Task, Mission, conversation, shared-Worktree authority, semantic review, or acceptance |
| **Integrations** | Translation to model providers, host tools, Git and workspace operations, Agent hosts, and launch environments | Project, Task, Run, Cell, Mission, or acceptance facts |
| **Presentation** | Temporary interaction state and rebuildable views through CLI, browser, WebSocket, or another client | Any domain or execution fact that must survive replacement of the client |

The target core is one contextual Agent function plus six enforceable
mechanisms:

- **O1 Main-Agent function** forms current context and decides whether to
  propose a Workbench mutation, request one Run, or do nothing. It is a
  replaceable judgment function, not a durable truth source.
- **W1 Project/Task repository** owns coherent domain mutation and rejects
  decisions formed from stale Task meaning.
- **O2 Run lifecycle** owns one explicit execution request, start, live
  control, terminal outcome, continuation lineage, recovery standing, and
  attribution.
- **O3 Worktree writer ownership** ensures at most one effectful Run writes one
  exact shared Worktree. It is paid only by shared effectful work.
- **C1 Cell envelope** executes one immutable `CellInput` through one supplied
  driver.
- **C2 capability and workspace boundary** exposes only caller-granted host
  effects.
- **C3 Cell finalization and evidence** evaluates declared mechanical
  conditions and emits at most one immutable final.

## Relations and cardinality

The ordinary relation is:

```text
Project 1 -> many Tasks
Task 1 -> many explicit Runs over time
Run 1 -> 0..1 Cell invocation
Cell invocation 1 -> 0..1 Cell final
```

A Run may fail before a Cell exists. A Cell may disappear before a trustworthy
final exists. Neither absence is filled by copied evidence or inferred
success. Multi-worker or collective behavior creates several explicit Runs; it
does not turn one Run into an implicit multi-Cell aggregate.

Workbench does not launch work. O1 reads current Workbench state and
Orchestration authorizes and supervises Runs. A Cell final returns through O2
as a bounded result claim. An independent reviewer judges semantic fitness,
and the Principal alone accepts or refuses the Workbench Task result.

Work Cell remains independently callable for prompt, model, tool, and
verification experiments. A direct caller gains no Task, Mission, Run
recovery, or shared-Worktree authority. Direct effectful experiments use a
disposable or otherwise exclusively owned workspace.

## Lifecycle, failure, and recovery

The public execution effect vocabulary is intentionally small:

- `run(request)` creates one new Run and at most one Cell invocation;
- `stop(runId)` controls one exact live Run.

Inspection is read-only. Reconciliation is idempotent owner maintenance, not a
third Agent action. It starts no Cell, replays no effect, and mutates no Task.
Continuation and rerun are lineage or reasons on a newly authorized Run rather
than peer lifecycle verbs.

If a Cell has no trustworthy final, the Run remains truthfully `unknown`,
`no-final`, or unresolved according to the evidence O2 can establish. If an
effect may have committed without acknowledgement, the owner reconciles only
against canonical effect evidence and never blindly replays the effect. O2
execution outcome and O3 writer-ownership standing are independent: a Run may
be terminal while writer cleanup remains reconcile-required and blocks another
writer.

Mechanical observation, semantic review, acceptance, and next-action policy
remain separate. An adverse semantic review does not automatically retry an
execution; it supports a Task correction, acceptance refusal, or a separately
authorized new Run.

## Mission and strategy boundary

A Mission Record is an activated authoritative work-source fact inside
Orchestration when material cross-session return is required. Mission runners,
contribution plans, dependency graphs, and Swarm or collective behavior are
optional strategies that consume Mission or Task facts and create explicit
Runs. They are not additional Run lifecycles or top-level modules.

Ordinary reversible Tasks do not require a persistent Mission runner. Optional
strategies must remain disabled by default until representative practice shows
that they preserve a unique required property.

## Precision boundary

Rossovia retains exactness where a mistake could overwrite another writer,
repeat an irreversible effect, cross a capability or disclosure boundary,
resume the wrong causal execution, mutate stale Task meaning, or accept the
wrong result.

It permits explicit `unknown` for historical liveness, provider-native steps,
usage and cost, rich traces, advisory metadata, and rebuildable projections
when stronger reconstruction would require copied facts, guessed authority, or
another durable registry. Ordinary execution has no implicit step limit. A
caller may select an explicit budget when the work requires one.

## Consequences

- Workbench becomes a pure Project and Task management system even while
  current execution code remains physically colocated during migration.
- Attempts, settlements, carrier handles, control, continuation, and recovery
  consolidate around O2 Run identity rather than remain peer truth stores.
- Shared-Worktree exclusion consolidates under O3 rather than becoming a
  generic lock service.
- Provider, model, host, launcher, and Agent-host quirks move behind
  Integration ports; current product choices remain policy rather than core
  mechanism.
- UI status and activity are projections over Workbench and Orchestration
  owners, never a browser-owned liveness source.
- Existing mechanisms are not deleted merely because the target is accepted.
  Each must first be migrated, demoted, disabled, or shown to preserve no
  unique property.

## Migration authority

This decision authorizes the accompanying staged migration plan. It does not
accept current implementation behavior, authorize a big-bang rewrite, settle
existing Tasks or Missions, or approve deletion without a focused replacement
and consumer proof. Each migration slice removes or demotes one duplicate
owner while preserving the ordinary create -> run -> observe -> claim -> review
-> accept path.

## Verification

The architecture remains supported when representative implementation slices
show that:

1. Workbench Project and Task operations work without conversation, Mission,
   execution, provider, or UI ownership;
2. every ordinary execution has one O2 Run identity and at most one Cell;
3. two effectful Runs cannot concurrently write the same exact Worktree;
4. Work Cell runs standalone with substituted drivers and callers and has no
   upward Workbench or Orchestration dependency;
5. replacing an Integration or presentation client does not change Task, Run,
   Cell, Mission, or acceptance truth; and
6. interrupted, ambiguous, stale, and semantically inadequate work remains
   visible without effect replay or inferred acceptance.

## Reconsideration

Reopen this decision if representative practice proves that one current
duplicate mechanism preserves a unique non-reconstructible safety property;
one Run genuinely requires multiple Cells without that relation being an
Orchestration strategy; Work Cell cannot remain standalone and provider
neutral; or the accepted ownership model prevents a required recovery without
creating a more dangerous authority ambiguity. Reopen the named relation, not
the entire mechanism inventory, unless evidence crosses several owners.
