# Archive

Historical carriers moved out of the active tree during the archived
[project-restructure transition](../design/organization/sessions/legacy-restructure/TRANSITION-legacy-restructure.md)
(2026-07-10).

**Policy:** Archive is read-mostly evidence. Do not treat files here as install
targets or governing design. The active skill tree is `skills/` at the repo
root. Regenerated skills may mine archived material with source links.

## Why this exists

The collection adopted a principle-centered architecture (`design/DESIGN.md`,
`principles/SEQUENCE.md`) while legacy methodology skills, regeneration working
notes, and the blueprint task-orchestration pattern (Plan→Build→Verify in
`blueprints/`) remained beside the new core. Those carriers are preserved here
until slow cleanup or explicit retirement.

## Blueprint mechanism

Repo-level `blueprints/` and design-driven's blueprint workflow came from the
same attention-allocation / task-scaffolding habit used in attention-driven
workflows elsewhere in the ecosystem. This collection no longer maintains that
pattern at the repo root. Useful observations should eventually land as
expression probes (P09, P10, P15) or harness handoff artifacts — not as a
parallel blueprint canon. `attention-driven` itself is still being transformed
outside this repo.

## Layout

| Path | Contents |
|---|---|
| `archive/skills/` | Pre-regeneration skills, `project-restructure` (superseded by artifact-organization), legacy `setup-lidessen-skills` |
| `archive/regeneration/` | Proposed target architecture and pre-selection inventories |
| `archive/regeneration/working-notes/` | Superseded in-flight regen notes |
| `archive/blueprints/` | Completed task blueprints from the transition period |
| `archive/articles/` | Long-form article drafts |
| `archive/slides/` | Presentation assets |

Active behavior evidence remains in
[`regeneration/evaluations/`](../regeneration/evaluations/).
