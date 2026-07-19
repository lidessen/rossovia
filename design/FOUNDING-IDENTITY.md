# Founding Identity — 在此 / Atthis

**Status:** provisionally adopted current project name
**Date:** 2026-07-18
**Approved by:** principal
**Authority:** [founding mandate](FOUNDING-MANDATE.md)
**Prior inquiry evidence:** [project naming expression study](aesthetics/studies/2026-07-13-project-naming-expression.md)

## Current name

The whole project is currently named **在此 / Atthis**. `Atthis` is the machine
and URL form; `在此` is the Chinese display name. This is an adopted working
identity, not a claim that the naming inquiry is permanently closed.

Atthis develops open, economical, verifiable AI production capability as a
common good. It includes the Principle Sequence, independently usable methods,
Work Cell and orchestration infrastructure, project operations, and future
working surfaces. It is not identical to this `skills` repository, a personal
task manager, one agent, one model provider, or one local directory.

The name is a compact handle for acting from the concrete situation at hand. It
does not encode the whole mandate, and the mandate does not depend on retaining
this name. Meaning may accrue through practice; the name must not become a
second doctrine.

## Current projections

| Surface | Current form | Authority boundary |
|---|---|---|
| Project display name | `在此 / Atthis` | current human-adopted identity |
| Machine namespace | `atthis` | lowercase technical projection |
| Methods repository | `skills` | repository handle, not the whole-project name |
| Public methods site | `skills.atthis.run` | public projection of this repository |
| Future user-level home | `~/.atthis` by default | relocatable local carrier, not project identity |

Repository, package, command, domain, and user-directory changes remain
separate migrations. Adopting the project name does not silently authorize any
of them.

## Rename and relocation contract

The first implementation of the Atthis workbench must make a later project or
namespace rename ordinary rather than destructive:

1. **Names and paths are not identity.** Persist an explicit stable project ID.
   Treat display names, spoken aliases, repository names, local checkout paths,
   and worktree paths as independently changeable attributes.
2. **Repository identity is source-linked.** Prefer a provider's immutable
   repository ID, accompanied by its current canonical locator, or an explicitly
   assigned stable ID over a repository name or folder basename. A renamed
   repository may retain old aliases without retaining its old local path.
3. **Resolve the home once.** A default such as `~/.atthis` must pass through one
   home-resolution boundary and support an explicit override. Code and records
   must not scatter or depend on the literal directory name.
4. **Keep stored references relocatable.** Use stable IDs and paths relative to
   the resolved home when they preserve meaning. Absolute machine paths belong
   only in the machine-local project mapping.
5. **Version durable records.** Configuration, mission, and mapping sources must
   declare a schema version. Rebuildable indexes and caches remain projections.
6. **Migrate by reconciliation.** A rename reads the prior source, writes the
   new carrier, verifies ordinary task recovery, and retains a receipt. The old
   namespace may remain a temporary read-only locator; it must not become a
   second writable source.

The observed `survey` checkout demonstrates the required distinction: GitHub
repository `1304098496` is currently located at `lidessen/meowask`, its package
and product name are `meowask`, and its local folder was renamed from `survey`
to `meowask` without changing repository identity. A project registry should
therefore be able to represent, for example:

```text
projectId: github-repository:1304098496
repository: github:lidessen/meowask
aliases: survey, meowask
localPath: <machine-local>/meowask
```

Changing any one of those fields must not silently create a second project or
make `继续 survey` unable to find the current worktree.

## Superseded proposal history

Earlier proposals such as `Gongqi / 公器`, `Gongsheng / 共生`, and
`Zhongqi / 众器` remain rejected inquiry evidence. They are not aliases or live
candidates. `skills` remains a useful repository handle but is no longer the
project's only public label.

## Reopening observations

Reopen the name when the principal decides its mouth-and-ear fit is wrong, when
ordinary users consistently mistake Atthis for a proprietary AI platform or a
task manager, or when another identity grows more naturally from practice.

Reopen the migration design if a repository rename, local-folder move, user-home
relocation, or project-name change breaks task recovery; requires editing many
unrelated files; duplicates writable state; or cannot preserve a traceable
rollback. A future replacement name must preserve the founding mandate and
stable IDs without requiring old names or paths to remain authoritative.
