---
name: project-restructure
description: >-
  Restructure a repository or workspace carrier when accepted design has moved
  ahead of legacy layout — inventory concrete state, derive a functional map,
  plan minimal retire/merge/regenerate waves, and verify hard constraints after
  each slice. Triggers on "整理项目", "清理旧内容", "restructure the repo",
  "retire legacy paths", "repo cleanup", "carrier refactor", "保留新设计清理旧的",
  "project housekeeping after regeneration". Use after target architecture or
  design truth exists; not for unsettled paradigm exploration or Sequence change.
  Args — inventory, plan, execute, verify.
argument-hint: "[inventory | plan | execute | verify]"
---

# Project Restructure

## Principle expression

**Primary:** P07
**Supporting:** P12, P15, P04

## Principle source

Use a host Sequence and interpretations when the host declares them. Otherwise
use this package's read-only fallback under references/sequence-snapshot.

## Scope

Reconstitute an inherited project carrier: the repo still contains old shapes,
duplicate projections, stale commands, or pre-regeneration paths while the
accepted design, sequence, or target architecture has already moved on.

The objective is not a prettier tree. It is a carrier whose layout lets a later
actor recover the governing truth, retire what no longer owns a decision, and
take the smallest irreversible step that actually advances the new shape.

Do not use this skill when:

- The system's shape is still unsettled — route to `reframe`, then graduate into
  `design-driven`.
- The gap is only design-vs-code drift in an otherwise stable layout — use
  `design-driven audit`.
- The work is a Sequence or principle admission question — use
  `principle-cultivation`.
- The work is creating or testing one agent skill — use `skill-engineering`.
- The user wants a one-off file delete without a governing plan — do it directly.

## The code → carrier metaphor

| Code refactor | Project carrier analogue |
|---|---|
| Monolith | Repo with tangled legacy paths, duplicate mirrors, stale docs |
| Dead code | Obsolete skills, abandoned blueprints, superseded commands |
| Extract | Separate canonical source from projections (`.claude/`, `.agents/`) |
| Move module | Relocate artifacts to the design-aligned home |
| Interface | Accepted `design/`, sequence, regeneration target, adopted decisions |
| Implementation | Concrete files, symlinks, generated copies |
| Rename | Align naming to the new architecture without changing semantics |
| Delete / retire | Remove a carrier only after its preserved function is recoverable elsewhere |

Use this vocabulary when classifying inventory rows.

## Commands

- `/project-restructure inventory` → Read and follow `commands/inventory.md`.
- `/project-restructure plan` → Read and follow `commands/plan.md`.
- `/project-restructure execute` → Read and follow `commands/execute.md`.
- `/project-restructure verify` → Read and follow `commands/verify.md`.
- No argument → Identify whether accepted design truth exists. If not, route to
  `design-driven` or `reframe`. If yes, start with `inventory` unless a durable
  `restructure/INVENTORY.md` already exists, then continue from the next missing
  artifact.

Phases are sequential. Each phase produces a durable artifact under
`restructure/` so later sessions can resume without replaying discovery.

## Hard constraints

Never violate these while restructuring:

- Semantic source stays singular: `principles/SEQUENCE.md`, adopted design
  decisions, and declared host truth are not merged, duplicated, or silently
  rewritten.
- Historical evidence in `principles/adopted/`, `principles/reviews/`, and adopted
  `design/decisions/` is not deleted to reduce clutter.
- Destructive retirement, semantic moves, and authority-changing merges require
  explicit human approval per wave.
- Packaged sequence snapshots are regenerated with
  `python3 scripts/sync-sequence-snapshot.py`, not hand-edited.
- A projection (`.claude/`, `.agents/`, installer output) is not canonical merely
  because it exists; canonical source lives in the declared upstream tree unless
  design says otherwise.

## Handoffs

| Signal during restructure | Route to |
|---|---|
| DESIGN.md or target architecture is missing or contradicted | `design-driven` |
| A proposed cleanup changes sequence meaning | `principle-cultivation` |
| A cleanup reveals a missing reusable skill gate | `skill-engineering` |
| The initiative's destination, not its carrier, is unclear | `goal-driven` |
| Build/acceptance evidence is needed before retiring runtime paths | `evidence-driven` |

## Completion standard

A restructure wave is complete only when it has:

1. An inventory tied to source paths and governing design references.
2. A plan that names hard constraints, disposition per row, and the smallest
   valid wave boundary.
3. Human approval for any destructive or authority-changing step in that wave.
4. Verification evidence that canonical truth, snapshots, and required
   inheritance still hold.

If any item is missing, leave the repo unchanged and report the gap instead of
improvising a broad cleanup.
