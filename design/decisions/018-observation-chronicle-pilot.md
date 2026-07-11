# 018 — Observation Chronicle Pilot

**Status:** approved for implementation
**Date:** 2026-07-10
**Approved by:** principal

## Context

The project retains valuable but disconnected evidence: Work Cell run records,
Git and PR history, source-bound research, decisions, human review, and future
external observations. These records have different owners and formats. There
is no shared, low-cost way to state what was observed, how it was observed,
where the source remains, what is uncertain, and whether a later record corrects
an earlier interpretation.

The [source-bound inquiry](../../principles/research/observation-chronicle.md)
finds no Sequence gap. Its historical and technical evidence supports a narrow
recordkeeping form, not a centralized data platform or a project-wide personnel
archive.

## Decision

Adopt an **Observation Chronicle** pilot under `chronicle/`.

It has four distinct layers:

```text
source-native record → Chronicle receipt → claim / review / decision → projection
```

| Layer | Owner | Authority boundary |
|---|---|---|
| Source-native record | its creating system or human | retains the original observation and context |
| Chronicle receipt | recorder under the schema | declares provenance, method, limitation, and correction relation; does not interpret or accept |
| Claim, review, decision | the named review or governance process | may draw inferences or commit action; cannot rewrite the receipt/source |
| Projection | a named generator | may improve access or analysis; remains rebuildable and has no fact authority |

The first carrier is deliberately small:

- each `records/YYYY/MM/obs-*` file is one immutable observation record; this
  avoids a shared append-only file becoming a merge hotspot for parallel Git
  worktrees;
- a source-native system record may receive a compact JSON receipt, while a
  human or otherwise uninstrumented observation is a Markdown source record
  carrying the same machine-readable metadata;
- `schema/observation-record.v1.schema.json` owns the versioned minimum shape;
- `adapters/` documents mappings from Work Cell, Git/PR, and human observation;
- `projections/` defines how derived views remain non-authoritative;
- a local validator enforces shape, unique IDs, source requirements, digest
  syntax, and backward-only correction references.

A JSONL export may be generated later for transport or analysis. It is a
projection, never the sole or authoritative ledger.

## Recorder boundary

The recorder may create one schema-valid record, retain its provenance and
limitations, and link a correction. The recorder may not silently edit past
records, alter raw sources, infer causation, accept a claim, approve work, or
turn a valid record into a strategic fact.

For an uninstrumented observation, the observer writes the Markdown record or
delegates its transcription to an agent. The record names both observer and
recorder, preserves a minimal source/exact wording where feasible, and states
any platform-bound or unavailable source. An agent may draft or record its own
direct observation, but it cannot represent a human preference, approval, or
strategic decision without an explicit human source. The task convener checks
for a record only when an observation is an acceptance input, correction,
handoff need, explicitly requested retention, or otherwise decision-changing;
there is no universal journaling preflight.

“Append-only” means a correction is added instead of overwriting historical
content. It does **not** mean every record is public forever: access,
redaction, retention, and deletion of sensitive source material require their
own owner and policy. The pilot defaults to recording project/practice evidence,
not personal dossiers, rankings, or behavioral surveillance.

## Adapter boundary

| Adapter | May record | Must retain at source | Cannot infer |
|---|---|---|---|
| Work Cell | run status, measured usage, named check outcome | the run record and trace | semantic acceptance, capability quality, or a causal explanation |
| Git / PR | immutable revision IDs, review/check disposition | commit, PR, and CI records | that a merge or green CI proves the change correct |
| Human observation | a stated observation/acceptance and its scope | the authored Markdown observation or designated conversation/field record | that a preference is universal truth or final product acceptance |

Future issue, schedule, sensor, or external-event adapters remain proposals.
They require their own source, idempotency, access, and shadow-run decision;
this pilot does not activate them.

## Sequence expression

- **P02 / P08:** every receipt names source, method, and limitation, and can be
  explicitly corrected rather than insulated from contrary evidence.
- **P12:** the durable receipt lets a later actor reopen the relevant source
  without carrying an unbounded transcript.
- **P13:** observation, claim, verification, and acceptance remain separate.
- **P14:** any report, metric, or dashboard is a rebuildable projection.
- **P15:** JSONL plus three adapters closes the immediate inheritance gap while
  deferring a database, collector, dashboard, and new runtime.

## Acceptance

- A reader can distinguish source, receipt, claim/decision, and projection.
- The records have one direct human Markdown observation and one derived Work
  Cell receipt with source locators, SHA-256 digests where a local file exists,
  methods, and stated limitations.
- The schema and validator reject malformed data, duplicate IDs, a correction
  that points forward or nowhere, and a derived receipt without a source.
- A documented synthetic correction chain proves the correction mechanism
  without inventing a false project history.
- No database, daemon, scheduled collector, dashboard, personal record, or
  automatic decision authority is introduced.
