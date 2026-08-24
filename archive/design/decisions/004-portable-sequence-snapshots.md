# 004 — Portable Sequence Snapshots for Standalone Skills

**Status:** adopted

## Context

Skills are meant to be independently installable, but a skill that selects
P-ID teams cannot rely on the source collection's top-level principles directory
being present. Repeating principle explanations inside each SKILL.md would make
the skills drift into competing canons; requiring network access would make the
same skill fail when offline or when a remote refresh is unavailable.

## Decision

Every sequence-dependent portable skill bundles a versioned, read-only snapshot
under its direct references. The snapshot contains the one-line Sequence and
the source-bound interpretations that its runtime selection requires. A skill
that chooses teams for other skills, such as skill-engineering, bundles the
complete current interpretation set but loads only selected P-IDs.

The default carrier is one generated `references/sequence.md` containing
provenance, the full Sequence, and that skill's selected interpretations. A
skill that must choose arbitrary teams keeps its complete interpretation set
split under `references/sequence-interpretations/`; flattening that set would
force every activation to load irrelevant context. This is one distribution
projection with two disclosure shapes, not two authorities.

Resolve lineage in this order:

1. A declared host Sequence and interpretations directory, if present.
2. The packaged snapshot, sufficient for offline work.
3. An optional verified remote refresh for the current task only, when freshness
   materially changes a decision.

The packaged snapshot records its upstream source, ref, date, and Sequence
hash. It is a distribution projection, not a semantic source: target projects
and task runs never mutate it. A remote refresh is compared and used
ephemerally; a new upstream package release is the only durable refresh route.

## Consequences

- Standalone skills retain their lineage and can form P-ID teams offline.
- P09 still applies: the complete snapshot is stored locally, while only the
  sequence and selected interpretations are loaded for a task.
- A network path improves freshness but is never a hidden hard dependency.
- Packaging gains a snapshot-consistency check whenever a selected principle or
  interpretation changes.
- Ordinary skill packages avoid a repeated metadata/Sequence/interpretation
  directory tree, while team-selecting skills preserve file-level selective
  loading.

## Human approval

Approved in the instruction that a skill installed by itself must be
self-contained, with Sequence retrieval available on demand, on 2026-07-09.
