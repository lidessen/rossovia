# Rossovia runtime ownership migration

**Status:** active staged plan; no implementation slice authorized by this file alone
**Date:** 2026-08-16
**Architecture source:** [Decision 055](../decisions/055-rossovia-runtime-module-ownership.md)
**Review evidence:** [2026-08-16 runtime module review](sessions/2026-08-16-rossovia-runtime-module-review.md)
**Planning baseline:** `ddd21d10acc2b5efc2d9aae082b9f09ac0de0072`

## Purpose

Move Rossovia from overlapping implementation-specific execution owners to the
accepted Workbench, Orchestration Runtime, Work Cell, Integrations, and
Presentation boundaries without a big-bang rewrite.

This plan sequences ownership transfer. It is not a second architecture source,
a runtime migration controller, or an authorization to implement every stage.
Each stage becomes one or more ordinary bounded changes with its own evidence,
review, and integration authority.

## Migration rule

Every slice must be explainable as one ownership transition:

```text
current owner and consumers
  -> target owner exposes the required contract
  -> callers move to that contract
  -> old representation loses authority
  -> compatibility is bounded and observable
  -> old mechanism is disabled, demoted, or removed only after consumer proof
```

Do not begin with directory movement. Do not create a registry, migration
state machine, dual-write protocol, or permanent architecture gate to supervise
this plan. Existing Git history, Decisions, focused tests, and normal review
are sufficient coordination surfaces.

Throughout the migration:

- Workbench Task acceptance remains Principal-owned;
- no migration slice may infer success, replay an ambiguous effect, or weaken
  single-writer protection;
- Work Cell remains directly runnable for isolated experiments;
- ordinary Runs have no implicit step limit;
- old and new owners must not both be authoritative; and
- a compatibility adapter may translate old input or evidence, but may not
  create a second durable lifecycle.

## Stage 0 — Freeze the target relations

**Standing:** completed by Decision 055; implementation contracts remain to be
derived in their owning stages.

The accepted names are Project, Task, Run, Cell invocation, Cell final,
Mission Record, Integration, and projection. The accepted cardinalities are
`Task -> many Runs`, `Run -> 0..1 Cell`, and `Cell -> 0..1 final`.

No new ordinary execution mechanism should be added outside W1, O2, O3, C1,
C2, or C3 unless representative evidence shows a unique invariant that none of
them can own. This is design guidance, not a mandatory preflight or approval
mechanism.

## Stage 1 — Make Workbench a pure Project and Task manager

**Goal:** Workbench domain operations remain usable without importing
conversation, Mission execution, providers, live carriers, or presentation.

**Work:**

- define the smallest typed reads and coherent Project/Task mutations owned by
  W1;
- keep Task lifecycle, corrections, claims, reviews, and Principal acceptance
  in that boundary;
- convert Worktree state, Run activity, Mission standing, and evidence into
  source-linked observations rather than copied Task facts;
- route CLI, HTTP, and UI mutations through the same W1 contract; and
- mark execution-bearing Workbench modules as migration occupants rather than
  evidence that execution belongs to Workbench.

**Not part of this stage:** moving all files, changing the worker runtime,
inventing a generic storage framework, or strengthening Task revisioning beyond
the coherent mutations that act on asynchronously changing Task meaning.

**Exit evidence:** a Project/Task contract test runs without execution or UI
composition; stale Task meaning fails before mutation; acceptance still
requires the Principal-owned action; current projections can identify every
joined observation's external owner.

## Stage 2 — Consolidate O2 Run and O3 writer ownership

**Goal:** every ordinary execution and every shared effectful Worktree writer
has one lifecycle and recovery owner.

**Work:**

- define one Run request, Run identity, live `RunHandle`, terminal outcome,
  continuation lineage, and reconciliation boundary;
- make ordinary Task run the first complete O2 path;
- lower conversation carrier, Mission runner, contribution, dependency, and
  Swarm execution through explicit Runs rather than preserve peer lifecycles;
- preserve one O3 writer-ownership relation for an exact shared Worktree;
- keep O2 outcome independent from O3 cleanup standing; and
- reduce public execution effects to `run` and exact live `stop`, with
  inspection read-only and reconciliation owner-internal.

Move one producer path at a time. A temporary adapter may read prior attempt or
settlement evidence, but all newly created execution evidence for a migrated
path must have one canonical Run identity. Do not dual-write terminal authority.

**Exit evidence:** ordinary Task, conversation, and one strategy-driven path
use the same Run contract; duplicate action, process loss, pre-Cell failure,
no-final, exact stop, stale Task, and O3 release failure remain truthful; a
second exact Worktree writer is refused; no recovery path silently starts a
Cell or replays an effect.

## Stage 3 — Complete the standalone Work Cell boundary

**Goal:** Work Cell is a provider-neutral bounded execution kernel that can be
called by Orchestration or directly by an experiment without upward knowledge.

**Work:**

- stabilize `CellInput`, driver, capability, cancellation, verification,
  evidence, and final contracts as C1–C3;
- inject filesystem, process, model, and tool capabilities instead of reading
  Workbench or Orchestration state;
- keep provider selection and orchestration budgets outside the Cell while
  enforcing an explicit caller-selected envelope when present;
- preserve at most one driver invocation and at most one final; and
- rename or adapt current Cell `runId` concepts where needed so they cannot be
  confused with O2 Run identity.

**Exit evidence:** standalone prompt/model/tool experiments work in an isolated
workspace; an Orchestration caller and an experiment caller use the same Cell
contract; a substituted driver does not change C1–C3; package and dependency
inspection finds no upward Workbench, Mission, or conversation dependency.

## Stage 4 — Isolate Integrations from mechanism and policy

**Goal:** replacing a provider, host, launcher, or Agent-host binding changes
an adapter or policy, not W1, O2/O3, or C1–C3.

**Work:**

- move model/provider protocols, Pi and Vercel AI SDK quirks, Git/workspace
  operations, host tools, runtime launchers, setup observations, and Codex,
  Claude, Cursor, or other host bindings behind declared ports;
- keep worker catalog, provider choice, budgets, and defaults in Orchestration
  policy rather than Integration mechanism;
- quarantine compatibility and research adapters outside normal startup; and
- use the substitution probe from the root project guidance to detect leaked
  provider identifiers, endpoint shapes, and current preferences.

**Exit evidence:** one provider and one host adapter can be substituted without
changing core mechanism tests; adapter tests retain concrete protocol quirks;
one integration probe proves the selected current policy works for the actual
Rossovia task path.

## Stage 5 — Rebuild Presentation and retire duplicate projections

**Goal:** browser, CLI, and WebSocket present and control the accepted owners
without storing alternative Task, Run, Cell, or Mission truth.

**Work:**

- expose typed Workbench domain operations and Orchestration run/control
  operations to clients;
- build activity, status, reconnect, and history as projections carrying exact
  source identity and truthful `unknown`;
- remove or demote repeated snapshot, work-item, context, and liveness stores;
- keep drafts, cursors, navigation, and layout as presentation-local state; and
- verify that replacing or restarting a client changes no authoritative fact.

**Exit evidence:** the ordinary create -> run -> activity -> claim -> review ->
accept story works through the selected Principal interface; disconnect and
restart rebuild state without effect replay; a missing live handle displays
unknown rather than inferred liveness; no UI-only mutation can accept a Task or
manufacture Run standing.

## Stage 6 — Disable and remove only after ownership proof

After Stages 1–5, inspect current optional strategies, compatibility carriers,
hooks, setup observers, indexes, diagnostics, migrations, and research paths.
For each candidate, choose one ordinary disposition:

- **retain** because it preserves a named unique property;
- **strategy** because it creates or coordinates explicit Runs without owning
  their lifecycle;
- **adapter** because it translates one current external protocol;
- **projection** because it is rebuildable from named sources;
- **disabled by default** because no daily consumer currently needs it; or
- **remove** because its consumers have moved and its property is already owned.

Removal requires a focused proof that another named owner preserves the unique
fact or invariant, no current production caller needs the representation, the
ordinary end-to-end path still works, and ambiguous failure remains fail-closed.
This is a test of the proposed removal, not a new permanent admission process.

## Stage dependencies and parallel work

```text
Stage 0 target freeze
  -> Stage 1 Workbench purity
  -> Stage 2 O2/O3 consolidation
  -> Stage 3 Work Cell physical independence
  -> Stage 4 Integration isolation
  -> Stage 5 Presentation rebuild
  -> Stage 6 retirement
```

Contract probes for Work Cell and Integrations may be prepared earlier, but
authority does not move out of order. Independent research, documentation, and
adapter tests may proceed in parallel when they do not write the same contracts
or treat a future stage as already accepted implementation truth.

## Per-slice handoff

A migration slice is ready for review when its handoff explains, without
requiring code reconstruction:

- the old owner, target owner, and exact relation changing;
- the behavior and hard constraints preserved;
- the old representation's new standing: authoritative, compatibility-only,
  disabled, or removed;
- the normal and material failure/recovery paths before and after;
- the focused mechanical evidence and independent semantic review; and
- the residual risk and the authority still withheld.

The plan is complete only when `design/DESIGN.md` describes the accepted target
as current structure, ordinary operation uses one W1/O2/O3/C1–C3 path, all
remaining strategies and adapters have explicit non-authoritative boundaries,
and the retained legacy mechanisms each have a named current consumer and
unique property.
