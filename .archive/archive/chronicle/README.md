# Observation Chronicle

**Status:** approved pilot
**Authority:** [decision 018](../design/decisions/018-observation-chronicle-pilot.md)
**Research:** [Observation Chronicle inquiry](../principles/research/observation-chronicle.md)

The Observation Chronicle preserves a recoverable answer to four questions:
what was observed, by whom and how, where the source remains, and what limits or
later corrections apply. It is a project memory carrier, not a logging product,
personnel file, decision engine, or truth authority.

```text
source-native record → Observation Record → claim / review / decision → projection
```

The source-native record may be a Work Cell run record, Git object, PR review,
human field note, or another declared source. An Observation Record retains a
small provenance-preserving statement about it. A report, metric, dashboard, or
index must name its source records and remains rebuildable; it may not become a
fact source by convenience.

## Record forms

Each record occupies one immutable path under `records/YYYY/MM/`. Never update
an old observation to make it look as though it was always known; add a
`correction` record that identifies what changed. One file per record avoids a
shared JSONL append point becoming a conflict in parallel worktrees. A JSONL
stream can be generated later as a projection.

There are two source forms, both validated against
[`schema/observation-record.v1.schema.json`](schema/observation-record.v1.schema.json):

| Situation | Form | Who writes it |
|---|---|---|
| An existing system has an original record | JSON receipt | a thin adapter or the task agent acting as recorder |
| A person, agent, or external setting has no automatic original record | Markdown observation | the observer, or an explicitly named agent recorder |

The Markdown form begins with an `observation-record` JSON comment followed by
human-readable source text. The metadata lets tools validate it; the prose
preserves the observation that would otherwise exist only in a conversation or
memory. Use [`templates/manual-observation.md`](templates/manual-observation.md)
as the starting shape.

## Recorder boundary

The recorder may create a record, identify the observer and method, preserve
source locators/digests, state limitations, and append a correction. The
recorder may not alter a raw source, overwrite a historical record, infer
causation, accept work, approve a decision, or convert schema validity into
truth.

For a human preference, approval, or strategic judgment, an agent may transcribe
only an explicit source. It names `observer: principal` and itself as recorder;
it never upgrades an agent summary into a human position. An agent's own
observation is recorded as `raw` or `uncertain` until a named verifier or human
handles any separate acceptance.

## When to create a record

Record an observation only when at least one condition holds:

- it changes or may later reopen a decision;
- its original condition is likely to disappear or become hard to reproduce;
- it is an acceptance input, correction, or handoff requirement;
- the Principal explicitly asks for it to be retained.

This is not a universal task preflight and not a personal activity log.

## Work Cell boundary

Work Cell remains an optional producer of source evidence. Its run record can
receive an Observation Record through the Work Cell adapter. A complex
investigation may deliberately use a Work Cell to produce new material, but a
human observation, Git change, or ordinary handoff never has to invoke one.

## Validation

Run:

```bash
python3 scripts/validate-observation-chronicle.py
python3 scripts/test-observation-chronicle.py
```

The validator checks the committed records and synthetic examples. The test
script also proves rejection of duplicate IDs, ungrounded derived records, and
forward/missing corrections.

## Privacy and retention

Append-only means preserve the historical relation among project records. It
does not mean all material belongs in Git or must remain public forever. Store
only the minimum pointer, digest, and non-sensitive observation needed for the
decision; sensitive source retention, access, redaction, and deletion require a
separate owner and policy. Do not use this pilot to construct personal dossiers,
rank contributors, or infer behavioral profiles.
