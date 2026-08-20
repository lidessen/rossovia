# Rossovia Development Skill design

**Status:** design map for one reusable development Skill. It is a prompt-like
method, not a mandatory process, a new task lifecycle, or an external-harness
policy file.

The canonical entry is [`skills/rossovia-development/SKILL.md`](../../skills/rossovia-development/SKILL.md).
The local Rossovia loop is the [`dogfood` reference](../../skills/dogfood/SKILL.md)
and its detailed [development profile](ROSSOVIA-DOGFOOD-DEVELOPMENT.md).

## The problem

An external harness may be able to edit the repository even when local
Rossovia is available. If both act as producers, the project gets competing
worktrees, duplicated attempts, and unclear evidence. If the external harness
assumes dogfood always exists, development stops when the local runtime is not
available. One Skill therefore needs to choose the producer from observed
runtime capability without changing source authority or acceptance.

## Two modes, one contract

```text
local Rossovia available + dogfood enabled
    → Rossovia Task/Run produces
    → observer records standard evidence
    → external harness observes, shapes, verifies, or bounded-fallbacks

dogfood unavailable or disabled
    → external harness Main owns the session
    → delegated design / implementation / verification as warranted
    → Main reconnects claims and evidence
```

Both modes retain the same project source, one write owner, worktree boundary,
verification boundary, human intervention rule, and return contract. Only the
producer and context carrier change.

The Main Agent is the coordinator in both modes: it keeps the whole, assigns
independent bounded contributions, orders and steers them, and reconstructs
the result from source-linked evidence. It retains shared-contract judgment,
independent verification, integration, and the final handoff. Direct work is
reserved for trivial or tightly coupled changes and named permission,
security, privacy, or unavailable-capability boundaries; this is a topology
choice, not a new approval gate or mandatory fan-out.

For each parallel contribution, the coordination projection records its owner,
independent branch/worktree, conflict boundary, state, dependencies,
acceptance/evidence, rejoin or merge action, cleanup condition, and unmerged
progress. A commit is a handoff, not completion: the contribution settles only
after checks and a verifiable merge/rejoin result. Otherwise Main keeps it open,
suspended, blocked, or explicitly archived with remaining progress and a
reactivation or cleanup condition. Use existing plan/task/Mission and operating
protocol surfaces; this does not create a second tracker or lifecycle.

## Mode selection

The Skill must inspect the current runtime rather than infer mode from a
remembered command or installed package:

| Observation | Mode | Immediate consequence |
|---|---|---|
| Rossovia launcher/runtime reachable and dogfood explicitly enabled | local dogfood | do not start a competing external writer; observer is implied |
| Rossovia reachable but dogfood explicitly disabled | external-only | use external-harness delegation |
| Rossovia or dogfood status cannot be verified | external-only with a capability gap | record the missing capability; do not pretend dogfood ran |

The desired launcher shape is `--dogfood`, with an explicit observer opt-out for
diagnostics. This is a target contract until the active Workbench help confirms
it; the Skill must not fabricate an unavailable flag.

## Context and prompt carriers

The Main-side `SKILL.md` carries only the mode decision, shared loop, and
authority boundaries. It points to conditional references:

- local dogfood snapshot/build/restart/rollback and observer behavior;
- external worker prompt with exact paths/effects, checks, and return contract;
- external reviewer prompt with a fresh read-only boundary and risk-ranked
  return; and
- context-engineering, task-shaping, practice-cycle, and agent-delegation when
  those decisions are actually live.

Workers never receive the whole Main prompt, project `AGENTS.md`, `ROSSOVIA.md`,
or a full skill catalog by default. The active harness adapter constructs a
receiver-specific projection. A worker term that changes action or return is
defined at first use by its object, boundary, and immediate relevance.

## Local dogfood ownership

When local dogfood is on, Rossovia is the normal producer for the requested
change. The observer is a read-only ordinary worker over standard Task,
attempt, transcript, diff, and check APIs. It records a finding or query gap;
it cannot edit, retry, accept, merge, rollback, or create a special review
lifecycle. A human may directly edit when Rossovia is blocked by a named
capability gap, but the reason and return to the rebuild/restart loop are
retained.

## External-only ownership

When dogfood is absent or disabled, an external harness is not a fallback
observer; it is the active Main environment. Use `agent-delegation` only when a
named split buys attention, isolation, latency, or independent evidence:

```text
Main: whole, source context, scheduling, steering, synthesis, final verification
design worker: bounded investigation/proposal (read-only unless granted)
implementation worker: one write owner for exact paths
review worker: fresh, read-only, independent from producer reasoning
```

These are contributions, not a new organization or fixed three-stage gate. A
small coupled change stays direct.

## Human intervention and recovery

Rossovia-first is a preference for the local mode, not an exclusive authority.
When the normal producer cannot cross a real implementation/provider/tool/
evidence boundary, the user may intervene in source. The intervention must be
small, source-linked, verified, and returned to the same mode-aware loop.
Serious Rossovia self-regressions use the existing local tag → rebuild →
restart → smoke-check rollback path. External-harness review or worker success
never grants acceptance, merge, publication, or rollback authority.

## Reopen signals

Reopen this design if external and Rossovia writers can both mutate one effect;
dogfood mode enables a worker only through a second lifecycle; observer output
cannot be read through standard APIs; the launcher claims dogfood but does not
make observer behavior observable; or the worker/reviewer prompt cannot be
reconstructed from the task contract and source revisions.

## Open development TODO

These are prompt-shaped follow-up items, not mandatory gates or a new queue:

- decide whether the append-only JSON/evidence sources need a SQLite index for
  cross-project queries, and keep authority in the existing source files unless
  that decision is separately accepted;
- expose workflow observer and Principal-correction records through one
  secondary read-only surface with origin, authority, source refs, and
  disposition visible;
- finish the provider/worker/skill/home configuration map and its Settings
  projection without creating a second policy source;
- exercise local snapshot tag → rebuild → restart → smoke-check → rollback on
  a real Rossovia self-change;
- use product dogfood review for mobile conversation layout, Markdown/table
  rendering, source disclosure, and information density.
