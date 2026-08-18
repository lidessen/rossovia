# Decision 047 — Bun Workbench Runtime

**Status:** accepted direction; first migration slice implemented
**Date:** 2026-07-22
**Approved by:** principal continuation mandate
**Supersedes in part:** the Python carrier in
[Decision 038](038-atthis-workbench-entry.md),
[Decision 044](044-rosso-identity-and-namespace-migration.md), and
[Decision 045](045-rossovia-identity-and-carriers.md), plus the Python runtime
carriers in [Decision 021](021-git-tracked-mission-continuity.md) and
[Decision 024](024-platform-neutral-intervention-reconciliation.md)

## Concrete pressure

The Rossovia checkout is increasingly used as an entry into several projects.
Its workbench must feed status lines, hooks, timelines, cognition, and Work Cell
orchestration, but the high-frequency project runtime remained a 1,000-line
Python script while those integration surfaces use TypeScript and Bun. Keeping
the split would duplicate schemas, path handling, and process contracts at the
exact boundary expected to evolve most often.

This does not justify converting every Python maintenance script. Sequence
snapshot generation, Chronicle validation, and installation probes are
independent batch tools with no demonstrated runtime integration pressure.

## Decision

Adopt `operations/workbench/` as the active Bun/TypeScript workbench carrier.
Retain `~/.rosso`, `ROSSO_HOME`, `rosso.*` record versions, and the underlying
project identity and resolution contracts. The executable is
`operations/workbench/src/cli.ts`; the eventual installed command may be
`rossovia`, but packaging must not create a second state namespace.

Migrate by bounded command families and compare identity and resolution output
against the existing Python implementation before cutover. The first carrier
owns:

- initialization and bounded workspace-root scanning;
- project registration, attachment, resolution, and verified listing;
- corrected user/project preference operations from
  [Decision 046](046-user-project-preference-boundary.md); and
- restartable in-home legacy `~/.atthis` namespace migration;
- Git-tracked Mission Record lifecycle and validation; and
- privacy-preserving intervention observation, correction receipts, and the
  thin project-local Codex hook adapter.

The legacy Python implementation served as an independent behavior oracle
during the bounded migration. Remove it after equivalent Bun lifecycle and
boundary probes pass; do not retain a second executable as permanent
compatibility machinery.

Keep runtime mechanism separate from future presentation. Statusline, stop-hook,
timeline, and cognition features may consume typed workbench services, but they
do not belong in the CLI parser or redefine project identity. The Principal's
continuation mandate established shared runtime pressure for the existing
Mission and intervention command carriers; it did not authorize unrelated
maintenance scripts to move.

## Verification

- registered, discovered, partial-failure, and stale-workspace projections
  match retained Python fixtures;
- initialization, roots, register, and attach preserve their state contracts;
- initialization verifies a real no-residue write on every write-bearing home
  surface through the current runtime even when the Rossovia home is already
  structurally complete;
- preferences satisfy Decision 046 without a machine preference source;
- legacy migration preserves its source, stays within the exact target home,
  restarts an interrupted marked transaction, verifies a migrated workspace,
  writes a receipt, and rejects nonempty obsolete machine preferences;
- Bun type checking and tests run in repository CI; and
- ordinary instructions and README commands use the Bun carrier, and no
  superseded Python runtime command remains.
