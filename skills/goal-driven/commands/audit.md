# goal-driven:audit — Periodic maintenance

Run periodically to keep `goals/` honest. Audit catches the slow drift
that the per-session protocol can't: stale criteria, naked verdicts,
forgotten STOPs, missed month rotation, GOAL.md inconsistencies.

If `goals/GOAL.md` does not exist or is still a stub, stop and ask
whether the human meant `/goal-driven bootstrap` instead.

## When to run

- ≥ 2 weeks since the last audit
- ≥ 30 new journal entries since the last audit
- A new agent picks up the project (sanity-check inherited state)
- The human says "things feel off" or "I'm not sure where we are"
- Before a major decision that depends on knowing where you actually stand

## Phase 1 — Surface drift

The point of audit is to make slow drift visible while it's still cheap
to correct. Drift comes in recognizable patterns; for each, ask whether
it's happening here. Record findings in conversation; don't write to
files yet.

**Index sync (only if `OPEN-STOPS.md` exists).** Every line in
OPEN-STOPS should resolve to a real STOP entry that's still open;
every unresolved STOP entry in the journals should appear as a line in
OPEN-STOPS. Mismatches mean the protocol was violated somewhere — the
audit fixes the index, but also note when the violation happened so the
underlying habit can be addressed.

**Criteria going silent.** A criterion is "stale" when it *should* be
observable but isn't — not when a counter says "no references in N
entries." Some criteria can't be measured early (no churn before
customers; no recall before evaluation runs); their early silence is
correct. For each active criterion, ask: should this be observable by
now? If yes and recent entries are silent or all-`unclear`, surface it
— either it's quietly going un-instrumented, or it stopped mattering. A
criterion that's been ✓ many times without an ✗ ever is worth a sanity
check on bar height. Surface candidates; don't classify — the human
knows whether silence is unmeasured-yet-mattering or on-its-way-out.

**Verdicts without evidence.** Scan recent entries for `✓` or `✗`
without a parenthetical citing observation from that session. Many
naked verdicts in a row mean the discipline is decaying — surface this
prominently, since it's the leading indicator of the whole skill failing.

**Rotation skipped or misfiled (only if using monthly journals).** The
most recent journal file should match the current month, and the
month's first entry should be a carry-over summary. If neither, rotation
happened wrong or not at all.

**GOAL.md contradicting itself.** Read end-to-end as if you'd never seen
it. Look for criteria conflicting with each other, invariants conflicting
with criteria, non-goals contradicting the north star, recent edits
that didn't make it into Revisions. The skill assumes GOAL.md is
internally consistent because it changes rarely; once that assumption
breaks, every later criteria check is judging against confused targets.

**Cross-skill drift (only if design-driven is installed).** Recent
`design/decisions/` adopted but not mentioned in the journal — a shape
change the goal layer missed. Design decisions that would violate GOAL
invariants. Goal pivots logged in journal that crossed module boundaries
without opening a design proposal. None are errors per se; they're worth
the human's attention.

## Phase 2 — Report and propose

Compile findings into a report posted in chat. Structure:

```
## Audit findings — YYYY-MM-DD

### Open STOPs sync
- <one bullet per orphan or missing line, with proposed fix>

### Stale criteria (candidates for retirement or instrumentation)
- C<N>: <0 / all-unclear / always-✓> in last 20 entries
  → suggest: <retire | instrument | leave>

### Naked verdicts
- <count> verdicts without evidence in last <N> entries
  (examples: <2-3 entry refs>)
  → suggest: ask human to recheck; tighten future verdicts

### Rotation
- <ok | issue with description>

### GOAL.md consistency
- <findings or "consistent">

### Cross-check with design-driven
- <findings or "no issues" or "n/a">
```

For each finding, propose a specific action.

## Phase 3 — Apply changes (after human approval)

Audit doesn't silently rewrite things. Each proposed action needs human
approval in chat.

### 3.1 Sync fixes

For OPEN-STOPS sync issues:
- If a STOP exists but isn't indexed: add the line to OPEN-STOPS.
- If OPEN-STOPS lists a STOP that was actually resolved: append the
  `→ resolved` follow-up to the original journal entry (date the audit if
  unclear when), then remove the OPEN-STOPS line.
- If a "STOP" entry is ambiguous (was it a real STOP or just a
  judgment?), surface it; don't guess.

### 3.2 Criterion retirement

Retiring a criterion is a GOAL.md change — it requires the same
line-by-line confirmation as bootstrap edits.

- Don't delete; mark `RETIRED YYYY-MM-DD (reason)`. Keep the ID. Old
  journal entries reference C2; if C2 disappears, the references break.
- Add a Revisions line: `- YYYY-MM-DD: retired C<N> (reason)`.

### 3.3 Naked verdict followup

Don't retroactively edit old entries to add evidence — that's
fabrication. Instead:

- Note the issue in the next journal entry's Observations.
- Tighten the protocol: agent re-reads SKILL.md's evidence rule and
  states: "I'll be stricter about evidence going forward."
- If a specific verdict was clearly wrong (e.g., "C2 ✓" three weeks ago
  but ongoing failures suggest C2 was never ✓), surface that as a
  Type A STOP candidate now.

### 3.4 Rotation fix

If May entries are in `journal-2026-04.md`:
- Move them to the correct file (cut from April, paste into a new
  May file).
- Add a carry-over entry at the top of May.
- Note in the audit's own journal entry that rotation was missed.

### 3.5 GOAL.md inconsistency

Each inconsistency is a small GOAL change. Same line-by-line confirmation
protocol as bootstrap. Do not bulk-edit GOAL.md.

### 3.6 Audit's own journal entry

Audit always logs a journal entry summarizing what was found and what was
applied:

```markdown
## YYYY-MM-DD — Audit
- What I did: ran /goal-driven audit.
- Observations: <summary of findings>.
- Criteria check: C1 unclear, C2 unclear, ... (audit doesn't measure
  criteria; just records that an audit happened)
- Judgment: no change to GOAL; <N> sync fixes applied; C<X> retired.
```

This makes audit visible in the timeline. Future audits can see when the
last one happened.

### 3.7 Commit

If files changed (OPEN-STOPS, GOAL.md, journals), commit them as one:
"goal-driven: audit YYYY-MM-DD — <one-line summary>".

## What audit is NOT

- Not a re-bootstrap. Don't propose new criteria during audit. If the
  human wants to add a criterion, they'll request it; audit's job is
  only to surface drift, not redesign.
- Not a STOP. Audit reports findings; the human acts. If a finding
  warrants a STOP (e.g., "we've been failing C2 for a month silently"),
  surface it as a candidate STOP, not a unilateral one.
- Not a code review. Audit reads `goals/`. If the underlying work has
  problems unrelated to the goal layer, that's outside scope.
