# Decision 045 — Rossovia Identity and Carriers

**Status:** accepted
**Date:** 2026-07-22
**Approved by:** principal
**Supersedes:** the display-name, public-origin, and repository-retention
boundaries in [Decision 044](044-rosso-identity-and-namespace-migration.md)
**Superseded in part by:** [Decision 047](047-bun-workbench-runtime.md), which
replaces `scripts/rosso.py` as the active workbench carrier without renaming
the retained `rosso` machine namespace.

## Decision

Adopt **Rossovia** as the current project display name. It is a coined handle
formed from Italian [`rosso`](https://www.treccani.it/vocabolario/rosso/) and
[`via`](https://www.treccani.it/vocabolario/via2/): red and a road, way, or
method. It is not presented as a standard Italian phrase or a new semantic
root. The Principle Sequence and founding mandate continue to own the project's
meaning.

Rename the GitHub repository to
[`lidessen/rossovia`](https://github.com/lidessen/rossovia) and the existing
Vercel project to `rossovia`. Keep Vercel project ID
`prj_8WQXh6u0fZFHmck51pXFbT1OjhXu` and its deployment history. Use
[`rossovia.dev`](https://rossovia.dev) as the current public origin.
`rossovia.land` remains registered but unbound and unused until a later
human-authorized hosting decision.

Remove the `rosso.run` project binding without a redirect while retaining the
domain registration. Existing machine and protocol carriers—`~/.rosso`,
`ROSSO_HOME`, `scripts/rosso.py`, `@rosso/*`, and `rosso.*` versions—remain
unchanged in this transition. They are stable internal compatibility surfaces,
not the source of the project display name. Historical records retain the names
that produced them, and local checkout directories need not follow the remote
slug.

The transitional `skills.atthis.run` alias remains a separate retirement
decision; this decision does not silently authorize its deletion.

## Verification

- GitHub resolves the repository as `lidessen/rossovia`, and local `origin` uses
  that canonical URL.
- Vercel resolves the same project ID under the name `rossovia`.
- [`rossovia.dev`](https://rossovia.dev) is verified, bound to that project,
  and serves over HTTPS.
- `rossovia.land` has no project binding, while `rosso.run` remains registered
  but has no project binding and does not redirect.
