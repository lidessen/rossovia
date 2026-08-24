# Decision 042 — Explicit Atthis User Preferences

**Status:** accepted first slice
**Date:** 2026-07-19
**Superseded in part by:** [Decision 046](046-user-project-preference-boundary.md),
which removes the machine preference source and treats machine conditions as
environment configuration or observation.
**Human mandate:** let a person state, retain, inspect, and retire preferences
through the ordinary Atthis workbench without turning Agent inference into
policy.

## Concrete need

The workbench can recover a verified project location and its declared task
continuity, but it has no source for personal defaults that should survive a
session. Harness memory is neither portable nor reliably available, while a
project instruction would wrongly turn one person's working preference into
shared project policy. The existing [environment profile](../../skills/agent-environment/assets/environment-profile.md)
already distinguishes portable working agreements from machine-local
overrides, and [Decision 038](038-atthis-workbench-entry.md) deliberately left
the Atthis `memory/`, `cognition/`, and `receipts/` schemas undefined rather
than populating them by inference.

The principal boundary is therefore not how to infer a preference. It is how
an explicit human default acquires durable but defeasible authority at the
smallest correct scope.

## Decision

Add two versioned preference sources and one append-only receipt stream:

| Artifact | Owns | Does not own |
|---|---|---|
| `config/preferences.json` | explicit personal defaults suitable for later migration, optionally scoped to one registered project ID | team policy, machine availability, inferred taste |
| `state/preferences.json` | explicit defaults or overrides for this machine, optionally scoped to one registered project ID | portable intent, provider observations, credentials |
| `receipts/preferences.jsonl` | set and retire events identified by metadata and record digest | active preference text or current preference truth |
| `preference list` output | compact applicable projection with deterministic precedence | independent fact or authority to override a constraint |
| memory or cognition observation | evidence that may justify asking about a preference | permission to activate one |
| target repository guidance | shared project requirements and accepted constraints | a person's private cross-project defaults |

Only `source: user-explicit` records are admitted. An Agent may preserve an
inferred pattern as non-authoritative evidence in an owning cognition method,
but it may not write that pattern into either preference source without the
person explicitly asking to remember, default, prefer, or otherwise retain it.

Every record has a stable caller-chosen ID, a statement kept at the strength
the person used, source and timestamps, and optional `projectId` and
`reopenWhen`. Project scope resolves through the stable registered project ID,
never through a copied alias. Preference text contains behavior, never a
credential value, token, session, or private environment dump.

For the same preference ID, applicability and precedence are deterministic:

1. exclude project-scoped records when no matching project was requested;
2. prefer a matching project record over a global record; and
3. at equal specificity, prefer the machine source over the user source.

Different IDs remain separate defaults. The projection does not attempt
semantic conflict detection, weighting, or automatic optimization. A
preference is defeasible: an Agent may depart from it when evidence or a higher
authority requires that, but must state the decision-changing reason.

## Ordinary agent entry

The human speaks naturally; the repository instruction lowers only explicit
intent into `preference set`, `list`, or `retire`. Session-only wording is not
persisted. A named personal project preference uses `--project`; a shared
requirement is routed to the target repository instead. Credential values are
never passed as preference text. Before an operation, the Agent runs idempotent
`atthis init` without workspace roots so an older or new home acquires the
preference sources without scanning a broader directory.

Before a material choice among models, providers, execution carriers,
verification forms, or expression defaults, an Agent may query the compact
applicable projection. This is on-demand context, not an always-injected user
profile. Provider availability, quota, and capability remain observations and
do not become true because a preference selected them; [Decision 036](036-provider-observation-and-explicit-preference.md)
preserves that separation for Work Cell routing.

## Minimum transition

- Extend idempotent `atthis init` to create both empty preference sources.
- Add `preference set`, `list`, and `retire`; do not add a general profile DSL.
- Retain digest-only receipts so audit history does not duplicate active text.
- Add one natural-language route to `AGENTS.md` and short agent/manual examples
  to both READMEs.
- Do not add automatic extraction, synchronization, domain tags, confidence
  scores, a preference Skill, or a background daemon.

## Verification

The integration probe must show that:

- user, machine, and project-scoped records remain distinct;
- a project-specific user preference beats a global machine preference, while
  retiring it reveals the next applicable default;
- an identical set is idempotent and creates no extra receipt;
- an unknown project and a non-user-explicit source fail closed;
- receipts retain digests but not preference statements; and
- a natural-language Agent can record, query, and retire a preference without
  reading or editing the source files directly.

Reopen this decision if real preference volume makes the compact list costly,
if migration needs a separately governed export/reconciliation protocol, if
two records with different IDs repeatedly conflict, or if a target harness
cannot activate the natural-language route without heavy global context.
