# project-restructure:plan — Choose minimal valid waves

Produce `restructure/PLAN.md` from an existing `restructure/INVENTORY.md`. Do not
execute destructive changes in this phase.

## Preconditions

- `restructure/INVENTORY.md` exists and is current enough for the stated goal.
- Governing design or target architecture is still the accepted truth.

If inventory is stale after major upstream changes, rerun `inventory` first.

## Phase steps

1. **Reconfirm hard constraints** from the skill and governing design. List what
   must not be broken: semantic sources, adopted history, human approval gates,
   portable snapshots, and any legal or audit obligations named in design.
2. **Group rows into waves.** A wave must be:
   - locally closable — its files and verification are bounded;
   - reversible or verifiable before the next wave when retirement is involved;
   - the smallest transition that materially reduces the named contradiction.
3. **Choose the transition type per row:**
   - `keep` — no move; maybe clarify ownership in docs
   - `clarify` — update docs or markers without relocating truth
   - `merge` — combine into a named canonical owner
   - `regenerate` — rebuild from retained seed, then retire old carrier
   - `project` — copy or sync to a declared projection target
   - `archive` — move out of active path with preserved links
   - `retire` — remove from active use only after regeneration or merge proof
4. **Require human approval** for every wave that includes `merge`, `regenerate`,
   `archive`, or `retire` on non-projection paths, or any semantic move.
5. **Define verification per wave.** Name the checks that must pass before the
   next wave: design alignment, snapshot sync, README/skill index truth, and
   absence of duplicate semantic sources.

## Plan artifact

Write `restructure/PLAN.md` with:

```markdown
# Restructure Plan

**Inventory basis:** restructure/INVENTORY.md
**Accepted design:** <links>
**Default:** retain current carrier unless a row clears its wave gate

## Hard constraints

- ...

## Wave 1 — <name>

**Resolves:** <part of principal contradiction>
**Transition type(s):** ...
**Rows:** ...
**Human approval required:** yes/no — <why>
**Verification:** ...

## Deferred / rejected

- <row or idea> — <why not minimum valid now>
```

## Stop conditions

- Do not schedule a big-bang wave that mixes canonical retirement, projection
  sync, and semantic redesign.
- Do not plan Sequence edits here; route those rows to `principle-cultivation`.
- Do not plan new skill authoring here unless the inventory shows a distinct
  repeated gate better owned by `skill-engineering`.
