# Model — 摸清家底

> Archived v1 process artifact; superseded by the compact audit/transition form.

**Date:** 2026-07-10
**Last verified:** 2026-07-10 (disk state)
**Governing truth:** [design/DESIGN.md](../../../DESIGN.md) (incl. Artifact organization), [design/decisions/](../../../decisions/) 001–006, [principles/SEQUENCE.md](../../../../principles/SEQUENCE.md)

**Base-area question:** This carrier sustains a **principle-centered skill collection** — a compact semantic root, five active skills (four methodology, one behavioral), human-governed adoption, and portable expressions that must work when installed alone. The base must let stewards cultivate principles, engineer skills, harness context, reorganize the carrier, and apply disciplined development habits without campaigns becoming permanent institutions.

**Principal contradiction (P04):** The **根据地章程** and five **常备工作队** are settled on disk; the design record is adopted; the public index matches active skills. The remaining contradiction is a **growth** one rather than a **cleanup** one: the behavioral skill (`disciplined-development`) has no behavior evidence yet, and the public index does not yet list the fifth skill.

---

## 常备制度

| Layer | Path | Class | Role |
|---|---|---|---|
| 纲领 | `principles/SEQUENCE.md` | Semantic source | P01–P16; citation-free |
| 纲领释读 | `principles/interpretations/` | Living expression | One reading per P-ID; not second canon |
| 史志 | `principles/adopted/`, `principles/reviews/` | Durable evidence | Adoption and committee evidence |
| 调查 | `principles/research/` | Durable evidence | Pre-proposal inquiry; no P-ID authority |
| 候选 | `principles/candidates/` (6 records; 3 incubating) | Process → durable | Candidate queue; seeded-regeneration trial active |
| 根据地章程 | `design/DESIGN.md` | Semantic source | Collection architecture + artifact organization |
| 章程决议 | `design/decisions/001–006` (001–006 adopted) | Durable evidence | Shape decisions; 002 adopted 2026-07-10 |
| 专业工作队 | `skills/` (5 active) | Living expression | Install/distribution source |
| 通报 | `skills/*/references/sequence-snapshot/` | Projection | Offline lineage; regen via script |
| 通报 | `.claude/skills/` → `skills/` (symlink) | Projection | Claude Code discovery |
| 通报 | `.agents/skills/` → `skills/` (symlink) | Projection | OpenAI Codex discovery |
| 通报 | `.agent/skills/` → `skills/` (symlink) | Projection | Legacy agent discovery |
| 通报 | `.reasonix/skills/` (copy dir, not symlinked) | Projection | Reasonix discovery |
| 土壤 | `.reasonix/` (session metadata) | Process artifact | Tool-specific; not organizational |
| L1 通报 | `AGENTS.md`, `CLAUDE.md` | Projection | Harness + sequence rules at session edge |
| 公共索引 | `README.md` | Living expression | Entry catalog; must match active skills |
| 行为验收 | `regeneration/evaluations/` | Durable evidence | Probe records only at this path |
| 工具 | `scripts/sync-sequence-snapshot.py` | Living expression | Snapshot generator; 5 skills packaged |
| 治理投影 | `principles/COUNCIL.md` | Projection | Roster only; not semantic source |

**Active skills (常备工作队):**

| Skill | Lineage | Base function |
|---|---|---|
| `principle-cultivation` | P03 | Research → candidate → review → adoption path |
| `skill-engineering` | P16 | Create/rewrite/review/test skill expressions |
| `harness` | P09 | L1/L2/L3 context architecture |
| `artifact-organization` | P06 | Base layout + activity architecture; campaigns derived from gap |
| `disciplined-development` | P15 | Lightweight behavioral discipline for any development task |

---

## 领导班子

Who decides, verifies, and commits — P11: executor ≠ adopter.

| Domain | Decide | Verify | Commit |
|---|---|---|---|
| Sequence doctrine (P-ID add/revise/retire) | Human | `principle-cultivation` review team | Human → `SEQUENCE.md` + `adopted/` |
| Collection architecture | Human | `design/DESIGN.md` consistency | Human → `design/decisions/` |
| Base layout & artifact classes | Human | `artifact-organization verify` | Human → design organization section |
| Skill expression quality | Human (adopt/regen) | `skill-engineering test` | Human or regen wave |
| Agent context shape | Human (project) | `harness verify` | Human → harness artifacts |
| Public index accuracy | Human | README vs `skills/` tree | Human or small doc wave |
| Git release truth | Human | Diff vs adopted design | Human commit / tag |

`principles/COUNCIL.md` is **governance projection only** — roster, not semantic source.

---

## 活动残留

Past campaigns still visible; must not be mistaken for 常备制度.

| Path | Was | Status | Target disposition |
|---|---|---|---|
| `sessions/legacy-restructure/` | Migrated session files | Archived 2026-07-10 (Wave B) | Keep as evidence |
| `archive/skills/` (8 skills) | Pre-regen domain/adapter skills | Archived evidence | Keep; never reinstall as active without regen |
| `archive/regeneration/` | Working regen notes | Archived | Historical; not planning surface |
| `archive/blueprints/` | Plan→Build→Verify habit | Retired mechanism | Evidence only |
| `archive/articles/`, `archive/slides/` | Pre-collection content | Orphan | Out of method corpus |
| Uncommitted git layer | Local adoption wave | **Largest gap** | Release wave when human approves |
| `.DS_Store` | Hygiene noise | Resolved (Wave C) | Removed; .gitignore added |

**Resolved (no longer residue):** repo-root `restructure/`, root `blueprints/`, loose `regeneration/*.md` planning files — already moved or archived.

---

## 误设与表面混淆 (P06)

| Phenomenon | Often mistaken for | Test |
|---|---|---|
| `design/organization/` | Sixth top-level module | Process home only; promotes into `design/` or `archive/` |
| Packaged sequence snapshots | Second sequence | Rebuildable from `principles/` + script |
| Symlinked skill dirs (`.claude/skills/`, `.agents/skills/`, `.agent/skills/`) | Edit surface | Canonical tree is `skills/`; `.reasonix/skills/` is a copy, not a symlink |
| `archive/skills/*` | Install targets | Durable evidence of retired expressions |
| Campaign README updates | Adopted charter | Must match human-approved target |
| Agent running `transition` | 领导班子 | Waves execute; human adopts into design |

---

## Strongest keep-as-is case

Do not delete or bulk-move: `principles/SEQUENCE.md`, interpretations, adopted/reviews, `design/DESIGN.md`, adopted decisions, the five active skills under `skills/`, `regeneration/evaluations/`, or `archive/` evidence. Symlinks are correct. The base institutions are sound; Waves A/B/C executed — design record adopted, legacy files archived, hygiene cleaned. The remaining work is **growth**: add behavior evidence for `disciplined-development`, update README.md, and plan a git release wave.

---

*Next step:* evaluate `disciplined-development` behavior probes; update README.md when the skill has evidence; plan git release wave.
