# project-restructure:execute — Apply one approved wave

Apply exactly one wave from `restructure/PLAN.md`. Do not run later waves in the
same activation unless the user explicitly expands scope after verification.

## Preconditions

- `restructure/PLAN.md` exists.
- The target wave is named and, if required, human-approved.
- Verification criteria for the wave are already written in the plan.

If approval is missing for a destructive or authority-changing wave, stop and ask.

## Phase steps

1. **Restate the wave boundary.** List only the rows and operations in scope.
2. **Execute non-destructive steps first** when order matters:
   - regenerate successors or canonical targets;
   - update docs, indexes, and markers;
   - sync projections from canonical source;
   - run `python3 scripts/sync-sequence-snapshot.py` when sequence-dependent
     skills changed.
3. **Perform destructive steps only at the end** of the wave and only for rows
   approved as `archive` or `retire`.
4. **Record the wave log** in `restructure/PLAN.md` under the wave as:

```markdown
### Execution log

- <action> — <paths> — <result>
- **Blocked:** <item> — <reason>
```

5. **Stop after the wave.** Route to `verify` before starting the next wave.

## Execution rules

- Prefer moving truth into the canonical tree before deleting a superseded
  carrier.
- When syncing projections, copy from the declared canonical skill tree; do not
  treat a projection as the edit source.
- Do not amend git history unless the user explicitly requests it.
- Do not commit unless the user asks; still produce the execution log and changed
  files.

## Stop conditions

- If regeneration cannot preserve the named inheritance, halt the wave and mark
  the row `blocked` rather than deleting the old carrier.
- If a planned action would create a second semantic source, halt and route to
  `design-driven` or `principle-cultivation` as appropriate.
