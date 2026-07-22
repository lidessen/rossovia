# Decision 046 — User and Project Preference Boundary

**Status:** accepted
**Date:** 2026-07-22
**Approved by:** principal
**Supersedes in part:** [Decision 042](042-atthis-explicit-user-preferences.md)

## Correction

Decision 042 treated `user`, `machine`, and optional `projectId` as if they
formed one preference precedence model. They do not. User and project answer
where an explicit personal default applies. Machine answers where a runtime
fact or local configuration is stored. Combining them made a device-specific
override look like preference authority and forced callers to choose a storage
carrier as part of an ordinary preference action.

The correction has no retained-data migration burden: both current Rossovia
preference sources were empty when this decision was reopened. The Bun
workbench migration therefore adopts the corrected model directly rather than
reproducing the obsolete source split.

## Decision

Use one portable preference source, `config/preferences.json`:

- a record without `projectId` is a user preference across projects;
- a record with a stable registered `projectId` is that user's preference for
  one project;
- for the same preference ID, the matching project record overrides the global
  user record; and
- only explicit human intent may create or retire either record.

The command surface has no `--scope` selector. `--project <registered-name>` is
the only narrowing operation. Projections may label an applicable record as
`user` or `project` for readability, but the source of authority remains the
person and the project distinction is represented by `projectId`.

Do not create `state/preferences.json`. Machine availability, credentials,
quota, tool installation, paths, and provider routing remain observations or
local environment configuration. Use their existing owners—such as the agent
environment profile and Work Cell provider profile—rather than translating
them into a second preference hierarchy. A genuine device-only behavioral
override must first identify the runtime or environment carrier that enforces
it; this decision does not add a general local override language.

Preference receipts remain digest-only and append-only, but their next schema
does not carry a machine/user source selector. It records action, preference
ID, optional project ID, timestamp, and record digest. An identical set remains
idempotent and creates no receipt. Source and receipt writes retain preflight
validation and rollback behavior.

## Ordinary entry

- `preference set <id> --statement <text>` records a cross-project user default.
- Add `--project <registered-name>` for one project.
- `preference list [--project <registered-name>]` returns the compact applicable
  projection.
- `preference retire <id> [--project <registered-name>]` removes that exact
  record.

A requirement shared by a team still belongs in the target repository. A
session-only preference stays in the conversation. Inferred behavior remains
non-authoritative cognition evidence until the person explicitly adopts it.

## Verification

- initialization creates only the portable preference source;
- global and project records remain independently addressable;
- a matching project record overrides, and retirement reveals, its global
  counterpart;
- identical writes create no duplicate receipt;
- malformed receipts block source mutation;
- receipts contain no preference statement; and
- machine capability or provider state does not appear in the preference
  contract or command surface.
