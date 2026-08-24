# Decision 044 — Rosso Identity and Namespace Migration

**Status:** accepted
**Date:** 2026-07-22
**Approved by:** principal
**Supersedes:** the project identity and machine-name projections in
[Founding Identity](../FOUNDING-IDENTITY.md); preserves the functional boundaries
of [Decision 038](038-atthis-workbench-entry.md) and
[Decision 042](042-atthis-explicit-user-preferences.md)
**Superseded in part by:** [Decision 045](045-rossovia-identity-and-carriers.md),
which later replaces the display name, public origin, and external carriers
while retaining the stable `rosso` runtime namespace, and
[Decision 047](047-bun-workbench-runtime.md), which replaces the Python
workbench carrier while preserving that namespace and migration contract.

## Decision

Adopt **Rosso** as the project display name and `rosso` as the current machine
namespace. Use **`rosso.run`** as the intended public origin. After the
principal limited the domain choice to `.run` and `.sh`, `.run` was selected
because the project includes methods, cognition, Work Cell, and autonomous
operation, while `.sh` would present it as a shell tool.

The name is a compact handle, not a new semantic root. It takes its linguistic
and aesthetic provenance from Studio Ghibli's
[*Porco Rosso*](https://www.ghibli.jp/works/porco/) and retains no claim of
affiliation. The Principle Sequence and founding mandate continue to own the
project's meaning.

## Current projections

- Display and site copy use `Rosso` without a translated display alias.
- Project-specific package namespaces use `@rosso/*`; current project protocol
  and record versions use `rosso.*`. The generic `@lidessen/work-cell` package
  retains its existing independent namespace.
- The workbench command is `scripts/rosso.py`; its default environment and home
  are `ROSSO_HOME` and `~/.rosso`.
- The cognition command is `rosso-cognition`; its default environment and home
  are `ROSSO_COGNITION_HOME` and `~/.rosso/cognition`.
- The repository remains `lidessen/skills`. Repository renaming is neither
  necessary nor authorized by this decision.
- Historical decisions, evaluations, and run records retain `Atthis` where it
  identifies the state that actually produced them.

## Workbench migration

`python3 scripts/rosso.py migrate` reconciles the default legacy `~/.atthis`
source into `~/.rosso`. It:

1. copies the source into a marked transaction inside the exact target home
   rather than mutating it or writing a sibling path;
2. changes only top-level structured `namespace` and `version` carrier fields
   from `atthis` to `rosso` while preserving project IDs, aliases, paths,
   nested user metadata, records, and content;
3. initializes newly required empty sources through the ordinary Rosso home
   boundary;
4. validates the migrated sources and resolves one registered alias against its
   current Git workspace when one exists;
5. writes a source-digest migration receipt and removes the transaction marker
   as the completion point. An interrupted marked target has its incomplete
   contents discarded and is rebuilt from the preserved source on retry.

The command refuses an existing completed or unrelated target and resumes only
a matching marked transaction or an empty target left before marker
publication. The marker is published through a temporary write and rename
inside the target. The old home remains recovery evidence, not a second
writable source. An agent that observes `~/.atthis` without `~/.rosso` must
migrate before ordinary initialization rather than silently creating two homes.

## Domain boundary

Repository configuration may declare `https://rosso.run` as the intended
canonical origin, but registration, DNS attachment, and production cutover are
separate external actions. Until those actions succeed, the prior deployed URL
may remain reachable and must not be described as already migrated.

## Verification

Acceptance requires:

- a legacy fixture migrates without changing its source and resolves the same
  stable project through the new command;
- a second migration cannot overwrite the target;
- workbench, cognition, Work Cell, autonomy, and site checks pass under the new
  namespace; and
- current authoritative surfaces contain no accidental `Atthis` reference,
  while retained historical evidence is not mechanically rewritten.
