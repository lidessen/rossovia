# Restructure Inventory

**Governing truth:**
[design/DESIGN.md](../../../DESIGN.md),
[design/decisions/](../../../decisions/) (001–006 adopted),
[principles/SEQUENCE.md](../../../../principles/SEQUENCE.md),
[regeneration/target-architecture.md](../../../../archive/regeneration/target-architecture.md) (proposed target, not yet executed),
[regeneration/function-map.md](../../../../archive/regeneration/function-map.md)

**Principal contradiction:** The principle-centered architecture and several
regenerated core skills already exist on disk, but the carrier still mixes
proposed regeneration plans, a partial public index, stale working notes,
pre-merge domain skills, and a large uncommitted layer—so agents and humans cannot
yet tell canonical truth from transitional or obsolete layout.

**Inventory date:** 2026-07-10

## Strongest no-action case

Do not delete or bulk-move `principles/`, `design/DESIGN.md`, adopted
`design/decisions/`, `principles/adopted/`, `principles/reviews/`, or the
canonical `skills/` tree. The `.claude/skills`, `.agents/skills`, and
`.agent/skills` symlinks correctly point at `skills/` and should not be treated
as duplicate semantic sources. `regeneration/evaluations/` is active behavior
evidence and must survive any cleanup.

---

| Path | Class | Governs / expresses | Successor or canonical owner | Inheritance to preserve | Notes |
|---|---|---|---|---|---|
| `principles/SEQUENCE.md` | canonical | Sole semantic source of P01–P16 | — | Full one-line sequence | Citation-free by contract |
| `principles/interpretations/` | canonical | Source-bound readings per P-ID | — | All P01–P16 files | Clarifications only; no shadow doctrine |
| `principles/research/` | canonical | Pre-proposal cited inquiry | — | `divide-and-conquer.md` disposition + links | No P-ID authority |
| `principles/candidates/` | incubating | Pending/incubating P19–P22 proposals | Human adoption or rejection | Committee links, trial evidence | Not clutter; active queue |
| `principles/adopted/` | canonical | Historical adoption evidence | — | Source links, decision record | Never delete for tidiness |
| `principles/reviews/` | canonical | Committee evidence | — | Team reports, synthesis, human decision | Never delete for tidiness |
| `principles/COUNCIL.md` | canonical | Governance projection only | — | Standing roster, active alternates | Not semantic source |
| `design/DESIGN.md` | canonical | Collection architecture truth | — | Modules, data flow, mechanisms | [006](../../../decisions/006-principle-lineage-cultivation.md) reflected |
| `design/decisions/001–006` | canonical | Adopted shape decisions | — | Context, recommendation, outcome | 006 enables research-before-proposal |
| `skills/` | canonical | Skill expressions (12 skills) | — | SKILL.md, commands, references, snapshots | Install/distribution source tree |
| `skills/*/references/sequence-snapshot/` | projection (packaged) | Offline lineage baseline per skill | `principles/` host when present | Regenerate via `scripts/sync-sequence-snapshot.py` | 4 skills packaged: harness, principle-cultivation, skill-engineering, project-restructure |
| `scripts/sync-sequence-snapshot.py` | canonical | Snapshot generator | — | Script + SNAPSHOT_SKILLS list | Do not hand-edit snapshots |
| `.claude/skills` → `skills/` | projection | Claude Code skill discovery | `skills/` | Symlink target | Not a second edit surface |
| `.agents/skills` → `skills/` | projection | Codex/agents skill discovery | `skills/` | Symlink target | Same |
| `.agent/skills` → `skills/` | projection | Agent skill discovery | `skills/` | Symlink target | Same |
| `AGENTS.md` | canonical (L1) | Codex harness + sequence rules | — | Principle-sequence section, research/propose path | Large uncommitted delta vs `main` |
| `CLAUDE.md` | canonical (L1) | Claude harness + cross-cutting principles | `setup-lidessen-skills` projection | Marker-managed principles block | Synced from cross-cutting-principles |
| `README.md` | canonical (index) | Public skill catalog | — | Accurate skill list + when-to-use | **Drift:** omits 4 installed skills (see below) |
| `skills/principle-cultivation/` | canonical | Lineage stewardship (P03) | — | research/propose commands, templates | Regenerated per 006; probes pass |
| `skills/skill-engineering/` | canonical | Skill authoring (P16) | — | create/rewrite/review/test, snapshots | First adopted regeneration slice per [003](../../../decisions/003-skill-engineering-first-slice.md) |
| `skills/harness/` | canonical | Context architecture (P09) | — | init/audit/verify, runtime map | Second slice per [005](../../../decisions/005-harness-runtime-evidenced-slice.md) |
| `skills/project-restructure/` | canonical | Carrier reconstitution (P07) | — | inventory/plan/execute/verify | New; probes defined, not run |
| `skills/design-driven/` | canonical | Architecture shape (P06) | Target: regenerated per [target-architecture](../../../../archive/regeneration/target-architecture.md) | Current loop + commands | Legacy form may remain until regen wave |
| `skills/goal-driven/` | canonical | Strategy layer (P04) | Target: regenerated | GOAL.md protocol | Listed for regen in target-architecture |
| `skills/evidence-driven/` | canonical | Execution evidence (P08) | Target: may broaden to verify-change | TDD overlay | Not yet regen-complete |
| `skills/reframe/` | canonical | Paradigm reconstitution (P07) | Target: regenerated | concepts/ workflow | Aligns with adopted P07 |
| `skills/setup-lidessen-skills/` | canonical | Collection adapter (P11) | Retain as project adapter | init/sync/audit, cross-cutting projection | Not a core method skill |
| `skills/article-refactor/` | incubating | Writing refactor (P06/P07) | Merge candidate → `argument-writing` | Inventory/skeleton/inline phases | [target-architecture](../../../../archive/regeneration/target-architecture.md) merge not executed |
| `skills/technical-article-writing/` | incubating | Argument writing (P04) | Merge candidate → `argument-writing` | Phase workflow | Same merge pending human choice |
| `skills/writing-profile/` | incubating | Voice calibration (P05) | Separate or defer per target-architecture | Profile artifact | Not in README index |
| `regeneration/target-architecture.md` | incubating | Proposed post-regen shape | Human choices §70–77 | Core/domain/adapter table | **Status: proposed** — blocks skill retire/merge until approved |
| `regeneration/function-map.md` | incubating | Analytical middle term | Feeds target-architecture | Candidate functions, boundaries | Pre-selection only |
| `regeneration/skill-inventory.md` | incubating | Concrete rewrite corpus inventory | — | Per-skill legacy assumptions | Excludes principle-cultivation by design |
| `regeneration/workspace-skill-inventory.md` | incubating | Cross-workspace source evidence | — | Moniro/Sikong/agent-worker refs | Input to regeneration |
| `regeneration/evaluations/` | canonical | Behavior probe evidence | — | All dated evaluation records | Authoritative probe location |
| `regeneration/principle-cultivation-v2.md` | superseded | Working regen notes | `regeneration/evaluations/2026-07-10-principle-cultivation-v2.md` | None if eval copy kept | Status still says "in progress"; duplicate |
| `blueprints/regenerate-principle-cultivation.md` | superseded | Completed regen blueprint | `regeneration/evaluations/2026-07-10-principle-cultivation-v2.md` + skill tree | Historical plan only | Marked complete 2026-07-10 |
| `regeneration/` (root loose files) | unclear | Mix of evidence + stale working notes | `regeneration/evaluations/` + archive subdir | See superseded row | Needs wave to collapse working notes |
| `articles/agent-harness/` | orphan | Long-form research article | Unclear vs collection scope | Research refs inside | Not a skill; predates principle-centered layout |
| `slides/` | orphan | Presentation assets (agent-evolution) | None in DESIGN.md | Static HTML/JS/CSS | Outside method corpus |
| `.codex/hooks.json` | projection | Codex local hooks | Owning tool config | Hook definitions | Not collection doctrine |
| `.DS_Store` (multiple) | orphan | macOS metadata | — | None | Safe to gitignore/delete in hygiene wave |
| `attention-driven` (absent) | — | Retired as mandatory skill | Expression probes in P09/P15/etc. | External agent-worker refs only | Correctly absent from `skills/` per [target-architecture](../../../../archive/regeneration/target-architecture.md) |
| Uncommitted git layer (`main`…working tree) | incubating | Entire new architecture on disk | First commit / release wave | All new paths above | **Largest carrier gap:** truth exists locally but not on `main` |

## README index drift (detail)

Skills present under `skills/` but **missing** from [README.md](../../../../README.md) §Available Skills:

| Skill | Why it matters |
|---|---|
| `setup-lidessen-skills` | Collection installer; L1 projection owner |
| `article-refactor` | Active domain expression; merge candidate |
| `technical-article-writing` | Active domain expression; merge candidate |
| `writing-profile` | Incubating domain expression |

Installation examples in README also omit `project-restructure`, `harness`, and
`setup-lidessen-skills`.

## Regenerated vs legacy skill posture

Per [target-architecture.md](../../../../archive/regeneration/target-architecture.md) (still
**proposed**):

| Posture | Skills |
|---|---|
| Retain / already regenerated | `principle-cultivation`, `skill-engineering`, `harness`, `project-restructure` |
| Regenerate when approved | `goal-driven`, `reframe`, `design-driven`, `evidence-driven` |
| Merge pending human choice | `technical-article-writing` + `article-refactor` → `argument-writing` |
| Incubate / defer | `writing-profile`, `investigate`, `reviewable-change` (latter two not in tree) |
| Adapter (keep) | `setup-lidessen-skills` |

## Recommended next step

Run `/project-restructure plan` to turn this inventory into staged waves.
Likely wave order (subject to your approval in plan):

1. **Index truth** — align README with all canonical skills; no deletions.
2. **Regeneration hygiene** — archive superseded `regeneration/principle-cultivation-v2.md` and completed `blueprints/` into `regeneration/archive/` or similar.
3. **Human gate** — resolve target-architecture §70–77 before any skill merge/retire.
4. **Commit wave** — stage the principle-centered layer onto `main` once verified.
5. **Deferred** — articles/slides relocation or retirement; writing-skill merge.
