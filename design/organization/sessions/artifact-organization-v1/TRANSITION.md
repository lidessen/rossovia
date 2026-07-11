# Transition — 建设运动

> Archived v1 process artifact; superseded by the compact audit/transition form.

**Date:** 2026-07-10
**From:** [GAP.md](GAP.md)
**Wave:** A — 章程补完 (design adoption)

## Wave scope

Adopt decision 002 (`design/decisions/002-principle-first-skill-regeneration.md`) by changing its frontmatter status from `proposed` to `adopted`. No content changes to the decision body.

## Resolves

The regeneration movement is adopted-in-fact (4 skills regenerated, target architecture named, evaluation records produced) but the decision record still carries `proposed` status. This wave closes that gap — the design record matches the adopted reality.

## Approval

**Human approval required (P11).** This wave changes a semantic source record (`design/decisions/`). The agent may prepare the change but the human must adopt it.

## Verification checks

| Gate | Principle | Check | Expected evidence |
|---|---|---|---|
| Authority | P14 | Decision 002 content unchanged; only status field modified | Diff shows only `Status:` line changed |
| Authority | P14 | No other decision affected | `design/decisions/` tree unchanged except 002 |
| Admission | P13 | Evidence for adoption exists: 4 regenerated skills, evaluation records, target architecture | `regeneration/evaluations/` contains probe records for all 4 skills |
| Inheritance | P12 | Adoption date recorded in decision body | `**Status:** adopted` + `**Adopted:** 2026-07-10` |
| Layer | P09 | No process artifact promoted to institution by this change | Only 1 file modified; no new files created |

## Execution steps

1. Read `design/decisions/002-principle-first-skill-regeneration.md`.
2. Change `**Status:** proposed` to `**Status:** adopted`.
3. Add `**Adopted:** 2026-07-10` below the status line.
4. Do not change any other content.
5. Human reviews and commits.

## Execution log

| Step | Result | Date |
|---|---|---|
| Change decision 002 status: proposed → adopted | Done — added adopted date + approval note | 2026-07-10 |
| Wave B: README verified current; legacy session files archived | README already matched 4-skill catalog; MODEL/TRANSITION/VERIFY-legacy-restructure.md moved to sessions/legacy-restructure/ | 2026-07-10 |
| Wave C: Removed skills/.DS_Store; created .gitignore | 2 DS_Store files removed (skills/, .claude/skills/ already clean); .gitignore added; 7 archive/ DS_Store deferred (P12 — separate concern) | 2026-07-10 |

---

## Next waves (after this wave is verified)

| Wave | Name | GAP reference | Blocked on |
|---|---|---|---|
| B | 索引修正 — Public index accuracy | GAP.md Wave B | ✅ executed 2026-07-10 |
| C | 打扫 — Hygiene cleanup | GAP.md Wave C | ✅ executed 2026-07-10 |
