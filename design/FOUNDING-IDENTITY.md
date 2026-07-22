# Founding Identity — Rosso

**Status:** adopted current project name
**Date:** 2026-07-22
**Approved by:** principal
**Authority:** [founding mandate](FOUNDING-MANDATE.md)
**Prior inquiry evidence:** [project naming expression study](aesthetics/studies/2026-07-13-project-naming-expression.md)
**Namespace migration:** [decision 044](decisions/044-rosso-identity-and-namespace-migration.md)
**Repository and hosting carriers:** [decision 045](decisions/045-rosso-repository-and-hosting-carriers.md)

## Current name

The whole project is currently named **Rosso**. The name comes from the Italian
word for red and was selected through the title of Studio Ghibli's
[*Porco Rosso*](https://www.ghibli.jp/works/porco/). That provenance supplies
sound, visual character, and a cultural association; it does not make the film
or its characters project doctrine, imply affiliation, or exhaust what the
project may become.

Rosso develops open, economical, verifiable AI production capability as a
common good. It includes the Principle Sequence, independently usable methods,
Work Cell and orchestration infrastructure, project operations, and future
working surfaces. It is not identical to this `rosso` repository, a personal
task manager, one agent, one model provider, or one local directory.

The name is a compact handle for acting from the concrete situation at hand. It
does not encode the whole mandate, and the mandate does not depend on retaining
this name. Meaning may accrue through practice; the name must not become a
second doctrine.

## Current projections

| Surface | Current form | Authority boundary |
|---|---|---|
| Project display name | `Rosso` | current human-adopted identity |
| Machine namespace | `rosso` | lowercase technical projection |
| Methods repository | [`lidessen/rosso`](https://github.com/lidessen/rosso) | repository handle, not the whole-project name |
| Public methods site | `rosso.run` | public projection of this repository |
| User-level home | `~/.rosso` by default | relocatable local carrier, not project identity |

Repository, package, command, domain, and user-directory remain distinct
carriers even though decisions 044 and 045 coordinate their present migration.
The repository handle now matches the project name, but it remains a replaceable
carrier rather than the source of Rosso's identity.

## Rename and relocation contract

The first implementation of the Rosso workbench must make a later project or
namespace rename ordinary rather than destructive:

1. **Names and paths are not identity.** Persist an explicit stable project ID.
   Treat display names, spoken aliases, repository names, local checkout paths,
   and worktree paths as independently changeable attributes.
2. **Repository identity is source-linked.** Prefer a provider's immutable
   repository ID, accompanied by its current canonical locator, or an explicitly
   assigned stable ID over a repository name or folder basename. A renamed
   repository may retain old aliases without retaining its old local path.
3. **Resolve the home once.** A default such as `~/.rosso` must pass through one
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

The prior working identity `在此 / Atthis` and earlier proposals such as
`Gongqi / 公器`, `Gongsheng / 共生`, and `Zhongqi / 众器` remain inquiry and
migration evidence. They are not live display aliases. `atthis` may appear only
where a legacy source or historical record must be identified during migration.

## Reopening observations

Reopen the name when the principal decides its mouth-and-ear fit is wrong, when
ordinary users consistently confuse Rosso with the film or an unrelated brand,
or when another identity grows more naturally from practice.

Reopen the migration design if a repository rename, local-folder move, user-home
relocation, or project-name change breaks task recovery; requires editing many
unrelated files; duplicates writable state; or cannot preserve a traceable
rollback. A future replacement name must preserve the founding mandate and
stable IDs without requiring old names or paths to remain authoritative.
