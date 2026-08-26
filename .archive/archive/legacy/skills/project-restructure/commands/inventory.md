# project-restructure:inventory — Map the current carrier

Produce `restructure/INVENTORY.md`. Do not delete, move, or rewrite project files
in this phase.

## Preconditions

Read the governing truth first. At minimum check:

- `design/DESIGN.md` and adopted `design/decisions/*.md`
- Any accepted target architecture or regeneration plan in scope
- `principles/SEQUENCE.md` when the project is principle-centered
- `README.md` and skill index surfaces that describe the intended current shape

If no governing truth exists, stop and route to `design-driven` or `reframe`.

## Phase steps

1. **State the principal contradiction.** What makes the current carrier an
   obstacle now — duplicate mirrors, stale commands, pre-regeneration skills,
   orphaned docs, or layout that contradicts accepted design?
2. **Walk the carrier.** Inventory top-level modules, skill trees, projections,
   regeneration artifacts, blueprints, and other durable paths the project
   actually contains. Prefer filesystem evidence over memory.
3. **Classify each row** using one disposition:

   - `canonical` — owns truth or active method per governing design
   - `projection` — downstream copy or install target, not semantic source
   - `incubating` — deliberate experiment not yet promoted or retired
   - `superseded` — replaced by a named successor, still present on disk
   - `orphan` — no current owner in governing design
   - `unclear` — needs human or design clarification before any move

4. **Record inheritance needs.** For each non-canonical row, note what a later
   actor must still recover if the carrier is retired: links, decision gates,
   behavior evidence, or adopted records.
5. **Name the strongest no-action case.** Which rows look messy but are still
   the minimum valid carrier because no successor has proved recovery yet.

## Inventory artifact

Write `restructure/INVENTORY.md` with:

```markdown
# Restructure Inventory

**Governing truth:** <links to design / regeneration / sequence anchors>
**Principal contradiction:** <one sentence>
**Inventory date:** <ISO date>

| Path | Class | Governs / expresses | Successor or canonical owner | Inheritance to preserve | Notes |
|---|---|---|---|---|---|
```

Keep source links on claims that depend on design or review evidence.

## Stop conditions

- Stop after writing the inventory unless the user explicitly asks to continue
  to `plan` in the same activation.
- Do not collapse `.claude/` or `.agents/` into canonical without design
  evidence that they are mere projections.
- Do not mark `principles/`, adopted records, or review evidence as deletable
  clutter.
