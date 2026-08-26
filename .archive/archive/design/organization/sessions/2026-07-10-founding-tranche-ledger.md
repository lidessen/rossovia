# Founding Tranche Ledger

**Status:** selected — one founding baseline PR, review partitions pending transfer
**Campaign:** [formal operations preparation](2026-07-10-formal-operations-preparation.md)
**Observed base:** `main` at `23acfc9`; local working tree audited 2026-07-10

## Inventory conclusion

The local change set is a real regeneration and migration, not one ordinary
feature. It contains a staged early construction wave, an unstaged relocation
wave that removes the old active surfaces, and later untracked implementation
and method additions. The staged portion alone reports 125 paths and 6,054
insertions; the unstaged relocation reports 108 paths, 368 insertions, and
15,840 deletions. Therefore neither the index nor one apparent directory is a
safe release boundary.

The source-bearing architectural account is the archived
[base model](artifact-organization-v1/MODEL.md) and the current
[accepted-design carrier](../../DESIGN.md). This ledger classifies the current
Git evidence; it does not accept any pending design decision or change its
status.

## Review partitions

The following partitions remain necessary for review and commit organization,
but not as independently mergeable PRs. The root README, accepted design,
workflow, and later methods already cross-reference them; accepting one
partition alone would create a misleading or broken baseline. Therefore every
retained current change listed here enters **one**
`founding/regenerated-baseline` PR, whose commits and review checklist preserve
the partitions below.

| Partition | Necessary contents | Why these stay together | Explicitly exclude | Verification before PR |
|---|---|---|---|---|
| `sequence-core-regeneration` | `.agents/skills`, `.codex/hooks.json`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `principles/`, [founding mandate](../../FOUNDING-MANDATE.md), decisions 001–006, active core skills (`harness`, `principle-cultivation`, `skill-engineering`, `artifact-organization`, `disciplined-development`), snapshots and `scripts/sync-sequence-snapshot.py` | The mandate, Sequence, expressions, agent harness, and installable core must agree; their old competing skill surfaces must move together into `archive/` | local tool residue; public rename | snapshot dry run, link audit, core skill structure review, archive/source boundary review |
| `work-cell-runtime` | `packages/work-cell/`, decisions 007–008, its evaluation evidence and bounded-autonomy research/candidate material | Runtime contracts, project interaction, and their evidence must be reviewable as one executable slice | local run residue | locked dependency install, typecheck, deterministic tests, one retained live probe reference |
| `method-and-organization` | decisions 009–014; `practice-cycle`, `form-guidance`, `strategic-advisory`, `naming-and-articulation`, `work-estimation`; organization operating model, founding identity, and their evaluation/research records | These methods define the post-regeneration operating language and use one common Sequence/projection boundary | branch protection change or public rename | snapshots, local links, action/boundary evaluation review, Work Cell regression suite |
| `aesthetic-practice-pilot` | decision 017 and `design/aesthetics/`, including named reference assets and retained Cell run evidence | The seed, cases, references, and their non-authoritative acceptance boundary must travel together | public asset placement, visual runtime, or a project rename | reference digest check, link audit, and case-boundary review |
| `formal-operations-and-chronicle` | decisions 015 and 018; `design/operations/`, preparation campaign, `chronicle/`, Chronicle scripts/tests, `development-log/`, `.github/` template/workflow, and the operating sections of `DESIGN.md` | The protocol, its human decision interface, the common observation carrier, and the workflow that verifies both must not be split into a policy or CI configuration without its implementation surface | branch protection change, worktree creation, pushes, PR opening, or project rename | workflow YAML parse, Chronicle validation/tests, snapshot dry run, locked package install, typecheck, tests |

## Required relocation boundary

The first tranche includes the matching `archive/` relocations and old-root
deletions for retired articles, blueprints, legacy skills, regeneration notes,
and slides. They are one semantic move: keeping both trees active would create
competing install and documentation surfaces; deleting before archiving would
lose provenance. `archive/` remains evidence only, as stated in the
[artifact organization section](../../DESIGN.md#artifact-organization).

## Non-commit material

| Path class | Disposition | Reason |
|---|---|---|
| `.work-cell/` | ignored, do not stage | local run records are execution residue unless a reviewed evaluation is promoted separately |
| `.reasonix/` | ignored, do not stage | tool/session metadata, not organization evidence |
| `.DS_Store` | ignored; remove from any proposed stage | local filesystem noise |
| `packages/work-cell/node_modules/` | ignored | reproducible dependency installation, not source |

## Selected F2 baseline

The Principal selected one `founding/regenerated-baseline` PR. Its partitions
above guide commit order and review; none is discarded or accepted separately.
This is the minimum truthful transition because the current public explanation,
runtime, methods, operation carrier, and verification surface cross-reference
one another. If the full PR cannot be reviewed as an architecture transition,
the campaign is disconfirmed at F0 and must reopen the design boundary rather
than pretending a partial state is an independent release.

Do not create the branch from this dirty checkout. Create a clean sibling
worktree from `origin/main`, transfer every retained partition, and compare it
against this ledger before staging. The dirty root must retain no unassigned
source change when the baseline PR is ready.

## Human decisions pending

1. Choose or defer the project identity in
   [Founding Identity](../../FOUNDING-IDENTITY.md); `skills` remains the
   descriptive repository handle unless a later migration is explicitly approved.
2. Which exact person/role will provide the independent review observation for
   the first baseline?
