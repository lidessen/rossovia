# Target — 建设方针

> Archived v1 process artifact; superseded by the compact audit/transition form.

**Date:** 2026-07-10
**From:** [MODEL.md](MODEL.md) + [design/DESIGN.md](../../../DESIGN.md) + adopted decisions 001,003–006
**Status:** pending human adoption into design

## Organizational requirements (from design)

- One semantic source per concern; projections remain regenerable from source (P14)
- Every campaign must end: promote into design or archive — never a permanent headquarters
- Organization that changes authority or public index requires human approval (P11)
- Durable evidence is not deleted for tidiness (P12)
- Each institution answers: does the current principal contradiction require this now? Deferred items wait for a later wave (P15)

## Target 根据地布局

### Top-level modules

| Path | Class | Role | Change from MODEL |
|---|---|---|---|
| `principles/` | Semantic source + durable evidence | Sequence, interpretations, adopted/reviews, research, candidates | None |
| `skills/` (4 active) | Living expression | `principle-cultivation`, `skill-engineering`, `harness`, `artifact-organization` | None |
| `design/` | Semantic source + durable evidence | `DESIGN.md`, decisions 001–006 (002 adopted), organization sessions | Adopt decision 002 |
| `regeneration/evaluations/` | Durable evidence | Behavior probe records only | None |
| `archive/` | Durable evidence | Retired skills, regen notes, pre-collection content | None |
| `scripts/` | Living expression | `sync-sequence-snapshot.py` | None |
| `AGENTS.md`, `CLAUDE.md` | Projection (L1) | Harness + sequence rules at session edge | Keep; update when upstream changes |
| `README.md` | Living expression (public index) | Entry catalog matching active skills | Update to current 4-skill catalog |

### Projections

| Path | Relation to source | Rules |
|---|---|---|
| `skills/*/references/sequence-snapshot/` | Regen from `principles/` + `scripts/sync-sequence-snapshot.py` | Never hand-edit; regen on P-ID selection change |
| `.claude/skills/` | Symlink → `skills/` | Platform discovery only |
| `.agents/skills/` | Symlink → `skills/` | Platform discovery only |
| `.agent/skills/` | Symlink → `skills/` | Legacy discovery only |
| `.reasonix/skills/` | Copy dir (not symlinked) | Platform discovery; treat as disposable projection |
| `principles/COUNCIL.md` | Governance projection of SEQUENCE.md | Roster only; never semantic source |

### Non-modules (explicitly excluded from institution status)

| Path | Why not an institution |
|---|---|
| `design/organization/` | Process home; promotes into `design/` or `archive/` |
| `.reasonix/` | Tool-specific session metadata; not organizational |
| `.claude/settings.json`, `.codex/hooks.json` | Tool config; not organizational |
| `.DS_Store` | Hygiene noise; gitignored |

### Decision 002 — adopt-in-fact

The regeneration movement described in decision 002 has been executed: four skills regenerated from the sequence (003–006), the concrete inventory completed, function map produced, target architecture named. The decision remains `proposed` in its frontmatter.

**Target:** adopt decision 002 into `design/decisions/002-principle-first-skill-regeneration.md` with status changed to `adopted`. This is a design-truth change — requires human approval (P11).

## 活动架构

### Allowed campaign types

| Type | Governed by | Artifact home | Ends with |
|---|---|---|---|
| Organization wave | `artifact-organization transition` | `design/organization/` | promote to design OR archive |
| Regen wave | `skill-engineering` + adopted architecture | `regeneration/evaluations/` for probes | promote skill + archive session |
| Skill rewrite | `skill-engineering rewrite` | skill package + evaluation record | updated SKILL.md + probe evidence |
| Principle cultivation | `principle-cultivation` | `principles/research/`, `candidates/`, `reviews/` | adopted, rejected, or pending |

### Campaign lifecycle rules

1. Each campaign names a single wave with scope, resolves-clause, and verification checks in `TRANSITION.md`.
2. Destructive steps (archive, retire, merge) come last, only on approved paths.
3. One wave at a time; verify before the next (P15).
4. Campaign artifacts that change authority, semantic location, or public index require human approval before execution.
5. After a successful wave, promote stable target organization into `design/` — do not leave permanent truth only in process files.
6. After verification, session files are either promoted into `design/` or archived under `design/organization/sessions/<date>/` or `archive/`.

### Approval profile

| Change scope | Approver |
|---|---|
| Semantic source (SEQUENCE.md, design decisions) | Human |
| Public index (README.md) | Human |
| Authority table (领导班子) | Human |
| Skill expression (rewrite within existing gate) | `skill-engineering test` + human |
| Path relocation within same class | `artifact-organization transition` (human if public index affected) |
| Hygiene (.DS_Store, tool config) | Agent (no org impact) |

## Disposition per MODEL row

| MODEL row | Target disposition | Rationale |
|---|---|---|
| All 常备制度 rows except below | Keep as-is | Institutions are sound |
| 章程决议 — 002 proposed | Adopt into design | Executed in fact; status should match |
| `.reasonix/skills/` (copy dir) | Keep as projection | Platform requires copy; accept as disposable |
| `.reasonix/` (session metadata) | Keep; classify as process artifact | Tool-specific; not organizational |
| `principles/COUNCIL.md` | Keep; classify as projection | Already correct; just not in original table |
| `design/organization/*-legacy-restructure.md` | Archive after this wave | Superseded by MODEL.md → TARGET.md → GAP.md loop |
| `archive/skills/` (8 skills) | Keep; never reinstall as active without regen | Durable evidence |
| `archive/regeneration/`, `archive/blueprints/` | Keep | Historical evidence |
| `archive/articles/`, `archive/slides/` | Keep; out of method corpus | Not organizational concern |
| Uncommitted git layer | Release wave (separate from org wave) | Human-gated; not part of this org campaign |
| `.DS_Store` (skills/, .claude/skills/) | Remove; gitignore | Hygiene |
| README.md | Update to reflect current active skills | Public index must match |

## Non-goals (deferred)

- Reorganizing `archive/` beyond its current evidence role
- Cleaning `archive/articles/` or `archive/slides/` — out of method corpus
- Standardizing `.reasonix/` projection — tool-specific, not organizational
- Adding new P-IDs or changing the Sequence — route to `principle-cultivation`
- Git release — separate human-gated wave, not this org campaign

---

*Next step:* `/artifact-organization gap` → `GAP.md`
