# Restructure Plan

**Inventory basis:** [MODEL-legacy-restructure.md](MODEL-legacy-restructure.md)
**Accepted design:** [design/DESIGN.md](../../../DESIGN.md), adopted decisions 001–006
**Human direction (2026-07-10):** Archive old documents and legacy skills first;
clean slowly. Retire the blueprint mechanism (legacy attention-driven /
design-driven task-orchestration pattern). `attention-driven` itself is not yet
transformed in agent-worker — do not pretend that migration is complete.

**Default:** retain current carrier unless a row clears its wave gate.

## Hard constraints

- Do not delete `principles/`, `principles/adopted/`, `principles/reviews/`, or
  adopted `design/decisions/`.
- Archive moves preserve source links and git history where possible; no bulk
  delete in early waves.
- Canonical skill tree remains `skills/`; `.claude|agents|agent/skills` stay
  symlinks to it.
- Blueprint retirement in this collection means: no repo-level `blueprints/`
  workflow and no new blueprint artifacts here; stripping blueprint sections from
  archived legacy skills is enough for now. A future `design-driven` regen
  removes the mechanism from active docs — blocked until a replacement task
  record exists (likely harness + evidence-driven handoff, not attention-driven
  as mandatory entry).

## Blueprint lineage (for the record)

The repo-level `blueprints/` folder and design-driven's Plan→Build→Verify
blueprint files are the same orchestration habit: durable task state between
plan and verify, popularized in this ecosystem through attention-driven-style
agent workflows (see agent-worker `CLAUDE.md` and `attention-driven` goal
pattern). Target-architecture already demotes attention-driven as a universal
entrypoint; this plan **archives** the habit in the skills collection without
waiting for agent-worker attention-driven regen to finish.

---

## Wave 1 — Archive infrastructure and stale working notes

**Resolves:** superseded regeneration notes and the completed blueprint file
clutter the active tree without governing truth.

**Transition types:** `archive`

**Rows:**

| Source | Destination |
|---|---|
| `blueprints/regenerate-principle-cultivation.md` | `archive/blueprints/` |
| `regeneration/principle-cultivation-v2.md` | `archive/regeneration/working-notes/` |
| `articles/` | `archive/articles/` |
| `slides/` | `archive/slides/` |

**Human approval required:** no — all rows already marked superseded/orphan in
inventory; blueprint is complete.

**Verification:** paths exist under `archive/`; repo root no longer has
`blueprints/` or `articles/` or `slides/`; evaluations remain in
`regeneration/evaluations/`.

---

## Wave 2 — Archive legacy skill corpus

**Resolves:** pre-regeneration methodology skills remain installable beside the
new principle-centered core, causing trigger and orchestration drift (including
blueprint coupling in design-driven / evidence-driven).

**Transition types:** `archive` (not delete)

**Rows — move `skills/<name>/` → `archive/skills/<name>/`:**

| Skill | Why archive now |
|---|---|
| `design-driven` | Legacy blueprint + layer-stack form; regen pending |
| `evidence-driven` | Tied to blueprint workflow; regen pending |
| `goal-driven` | Pre-regen strategy form |
| `reframe` | Pre-regen; P07 expression to be regenerated |
| `article-refactor` | Merge candidate; not active core |
| `technical-article-writing` | Merge candidate; not active core |
| `writing-profile` | Incubating domain skill; defer regen |

**Keep active in `skills/`:**

- `principle-cultivation`, `skill-engineering`, `harness`, `project-restructure`

**Human approval required:** yes — user requested archive of old skills
2026-07-10.

**Verification:** only four skill dirs remain under `skills/`; `archive/skills/`
contains eight; README lists active set only; symlinks still resolve.

### Wave 2b — 2026-07-10 — pass

- Archived `setup-lidessen-skills` → `archive/skills/` (user correction)
- Updated `README.md`, `CLAUDE.md` projection note

---

## Wave 3 — Archive regeneration pre-selection corpus

**Resolves:** `target-architecture.md` and sibling inventories are **proposed**
working material, not governing truth, but sit beside adopted `design/DESIGN.md`.

**Transition types:** `archive`

**Rows:**

| Source | Destination |
|---|---|
| `regeneration/skill-inventory.md` | `archive/regeneration/` |
| `regeneration/workspace-skill-inventory.md` | `archive/regeneration/` |
| `regeneration/function-map.md` | `archive/regeneration/` |
| `regeneration/target-architecture.md` | `archive/regeneration/` |

**Keep at `regeneration/`:** `evaluations/` only (behavior evidence).

**Human approval required:** yes — supersedes earlier “human gate before retire”
with explicit archive-not-delete.

**Verification:** `regeneration/` contains only `evaluations/`; archived files
reachable with stable paths.

---

## Wave 4 — Index and L1 truth (non-destructive)

**Resolves:** README and install examples still describe archived skills.

**Transition types:** `clarify`

**Rows:** `README.md`, optional `AGENTS.md` / `CLAUDE.md` skill list mentions

**Human approval required:** no

**Verification:** README §Available Skills matches five active skills; archived
skills mentioned only under an Archive section with pointer to `archive/`.

---

## Wave 5 — Blueprint mechanism removal from active expression (deferred)

**Resolves:** design-driven / evidence-driven blueprint protocol should not
return when those skills are regenerated.

**Blocked on:** replacement task-record pattern (design decisions + verification
items, or harness-layer handoff artifacts) — **not** on attention-driven regen
completing in agent-worker, though useful probes from attention-driven should
feed P09/P10/P15 when that regen happens.

**Human approval required:** yes, when regen slice starts.

---

## Deferred / rejected

| Idea | Disposition |
|---|---|
| Delete archived tree after move | **Rejected** — user asked slow cleanup |
| Archive `principles/candidates/` | **Rejected** — active governance queue |
| Archive `regeneration/evaluations/` | **Rejected** — behavior evidence |
| Restore attention-driven as skill here | **Rejected** per target-architecture |
| Strip blueprint from design-driven in place while it lives in archive | **Deferred** — archive suffices for now |

## Execution log

### Wave 1 — 2026-07-10 — pass

- Archived `blueprints/regenerate-principle-cultivation.md` → `archive/blueprints/`
- Removed empty repo-root `blueprints/`
- Archived `regeneration/principle-cultivation-v2.md` →
  `archive/regeneration/working-notes/`
- Archived `articles/agent-harness/` → `archive/articles/`
- Archived `slides/*` → `archive/slides/`

### Wave 2 — 2026-07-10 — pass

Archived to `archive/skills/`: `design-driven`, `evidence-driven`,
`goal-driven`, `reframe`, `article-refactor`, `technical-article-writing`,
`writing-profile`.

Active `skills/` retained: `principle-cultivation`, `skill-engineering`,
`harness`, `project-restructure`.

### Wave 2b — 2026-07-10 — pass

Archived `setup-lidessen-skills` → `archive/skills/`.

### Wave 3 — 2026-07-10 — pass

Archived to `archive/regeneration/`: `skill-inventory.md`,
`workspace-skill-inventory.md`, `function-map.md`, `target-architecture.md`.

`regeneration/evaluations/` remains active.

### Wave 4 — 2026-07-10 — pass

- Rewrote `README.md` for five active skills + Archive section
- Blueprint mechanism documented as retired in `archive/README.md`

### Wave 5 — deferred

Blocked on replacement task-record pattern for future design-driven regen.
