# Gap — 方针与现状之差

> Archived v1 process artifact; superseded by the compact audit/transition form.

**Date:** 2026-07-10
**From:** [MODEL.md](MODEL.md) → [TARGET.md](TARGET.md)
**Status:** Waves A/B/C executed 2026-07-10; new growth gap identified

## Delta table

| Row | MODEL state | TARGET state | Delta class | Material? | Status |
|---|---|---|---|---|---|
| 章程决议 — decision 002 | `proposed` status | `adopted` status | authority | Yes | ✅ Wave A executed |
| README.md — skill catalog | 4-skill catalog | 5-skill catalog (add disciplined-development) | index visibility | Yes | ⏳ new gap |
| README.md — pre-regeneration | Already matched 4 active skills | — | — | — | ✅ Wave B executed (no change needed) |
| `design/organization/*-legacy-restructure.md` | Session files in process home | Archived to sessions/legacy-restructure/ | location | Yes | ✅ Wave B executed |
| `.DS_Store` (skills/, .claude/skills/) | Present on disk | Remove; gitignored | hygiene | Minor | ✅ Wave C executed |
| Uncommitted git layer | Local adoption wave | Separate human-gated release wave | authority | Yes | ⏳ deferred |
| `.reasonix/skills/` | Copy dir, not symlinked | Keep as disposable projection | location | No | — |
| `principles/COUNCIL.md` | On disk, not in institution table | Added to institution table | index visibility | No | ✅ resolved |
| `archive/articles/`, `archive/slides/` | Pre-collection orphans | Keep out of method corpus | none | No | — |

## Campaign themes

### ✅ Wave A: Design adoption — 章程补完 *(executed 2026-07-10)*

Decision 002 status changed from `proposed` to `adopted` with date and approval note.

### ✅ Wave B: Public index accuracy — 索引修正 *(executed 2026-07-10)*

README confirmed current; legacy-restructure files archived to sessions/legacy-restructure/.

### ✅ Wave C: Hygiene — 打扫 *(executed 2026-07-10)*

DS_Store removed from skills/; .gitignore created.

### ⏳ Wave D: Public index — add disciplined-development

**Principal contradiction (P04):** `disciplined-development` is an active 常备工作队 but README.md only lists 4 skills. However, the skill has no behavior evidence yet — adding it to the public index before testing would violate P08.

**Scope:** When `disciplined-development` has behavior evidence from at least one probe, update README.md to add it to the skill catalog, "Which skill, when?" table, installation commands, and example commands.

**Delta class:** index visibility

**Approval:** human required (P11: changes public index)

## Deferred (no campaign warranted)

| Item | Why deferred |
|---|---|
| Git release | Separate human-gated wave; not blocked by org design |
| `.reasonix/` projection standardization | Tool-specific; not organizational concern |
| `archive/` reorganization | No material gap — current layout is functional evidence |
| `archive/articles/`, `archive/slides/` cleanup | Out of method corpus; not worth a campaign |
| `archive/` DS_Store files (7 files) | Deferred from Wave C — not in active paths; P12 separate concern |
| New P-ID proposals | Route to `principle-cultivation` |
| disciplined-development behavior evidence | `skill-engineering test` before README update (Wave D) |

## Principal contradiction for current campaign

**Wave D is the principal contradiction for the index layer.** The behavioral skill exists and is active, but README.md does not list it. However, the skill needs behavior evidence first (P08) — adding untested instructions to the public index would violate the project's own standards. The load-bearing step is therefore `skill-engineering test` on `disciplined-development`, not the README update itself.

---

*Next step:* `skill-engineering test` → probe `disciplined-development` behavior
