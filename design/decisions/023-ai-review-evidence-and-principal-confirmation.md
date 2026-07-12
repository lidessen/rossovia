# Decision 023 — AI review evidence and Principal confirmation

**Status:** approved
**Date:** 2026-07-12
**Authority:** direct Principal direction

## Decision

For material code integration, replace the impractical requirement that a human
independently reproduce a line-by-line code review with this gate:

```text
independent AI review evidence → concise traceable review packet → Principal confirmation
```

The AI reviewer must be independent of the implementing agent's active context
or role. Its record names reviewed scope, current head, findings ranked by
merge effect, source/line evidence, checks, unresolved uncertainty, and an
explicit merge/return recommendation. A green CI check is supporting evidence,
not an AI review.

The Principal reviews the compact packet—not the entire diff by default—and
confirms whether the stated scope, unresolved risks, and merge consequence are
acceptable. The Principal may reopen evidence, return work, hold, or merge.

## Boundary

AI review evidence is neither fact admission nor merge authority. It cannot
resolve its own findings, waive missing evidence, or merge. Human confirmation
does not become performative: it remains responsible for accepting residual
risk, scope, and the durable integration consequence.

## Reopening observation

Reopen this decision if AI review repeatedly fails to submit a traceable
conclusion, misses material defects found shortly after merge, or produces a
packet too large for the Principal to understand the actual decision.
