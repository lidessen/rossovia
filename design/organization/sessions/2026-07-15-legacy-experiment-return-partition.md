# Legacy Experiment Return — Source, Value, and Status Partition

**Status:** prepared — partition complete; retention/disposal decision pending
**Mission:** [`formal-operations-transition`](../../../operations/missions/formal-operations-transition.json), branch `legacy-experiment-return`
**Review target:** protected staged index in the local `public-expression-readme` worktree
**Authority:** inventory and recommendation only; this record cannot integrate staged content, publish raw runs, delete the protected worktree, or approve a later mission

## Review question

Which parts of the 129-entry staged legacy index are durable evidence, later
mission candidates, superseded material, or material that should not return to
`main`?

The task is return, not salvage by default. A path being absent from `main`
proves only that it was not integrated. It does not establish current design
fitness, factual authority, or a reason to preserve raw model output in the
active repository.

## Protected source and reproducibility

The review did not modify, unstage, or reset the source worktree. Its protected
identity at review time was:

```text
index tree:  d2f00eae727720ffd141f0ef734e1e81a9315db6
patch sha256: e745285f45fc3e07efb0b5d49fd8d6f03f72f047c9e1ab1880cd6a82dd06440e
scope:       129 files, +25,366/-273
```

Each index blob was compared directly with `origin/main` at merge commit
`747588e7aa7883f2a799c092eca52fdf6c283c1a`: 18 paths exist with different
content, 111 are absent, and none are blob-identical. The path rules below are
mutually exclusive and cover all 129 paths; their counts are the completeness
check.

## Partition

| ID | Paths and count | Source/value judgment | Return status |
|---|---|---|---|
| N1 — naming surfaces | `design/FOUNDING-IDENTITY.md`; eight `design/aesthetics/cases/2026-07-12-*`; `design/decisions/013-naming-and-articulation.md`; six paths under `skills/naming-and-articulation/` — **16** | Draft identity, nomination, and active-Skill changes from an obsolete baseline. No project name was adopted. The staged Skill changes its Primary lineage from current P06 to P16, broadens its authority, and points to the retired snapshot layout. | **Superseded; do not integrate.** Preserve no active-file delta. A later naming practice must begin from current sources and the human aesthetic observations, not replay these drafts. |
| N2 — naming inquiry and summary evidence | `principles/research/{creative-naming-cognition,naming-and-articulation}.md`; non-JSON naming evaluation and fixture paths matching `regeneration/evaluations/2026-07-12-*`, `2026-07-13-creative-naming-*`, and `fixtures/creative-naming-representation/*` — **18** | Source-bound inquiry and summarized negative evidence: feature/format fixation, self-certified creative causality, failed carrier equivalence, and the handoff from naming to general divergent practice. These observations can change a future research design, but the staged links and claims have not been reconstructed against current `main`. | **Later research candidate.** Reconstruct only the decision-changing summaries and valid source links in a dedicated research return; no Sequence or naming-Skill change is implied. |
| N3 — naming raw carriers | JSON paths under the N2 evaluation patterns — **19** | Cell manifests, experiment specifications, and raw/result carriers. The repository's [regeneration boundary](../../../regeneration/README.md) keeps durable evaluations distinct from raw runtime authority; these files are not independently accepted facts. | **Do not return to `main`.** Retain the protected index until a human retention decision; check privacy before any remote archival carrier. |
| A — progressive adoption | `design/decisions/025-progressive-adoption.md`; `skills/skill-engineering/commands/create.md`; `skills/skill-engineering/references/targeted-adoption.md` — **3** | A coherent three-level distinction—full, partial, and target-specific adoption—with a portable target-Skill contract. The decision still says Principal approval pending and has no clean-target action/boundary/context probe. Its command edit is small but based on the older Skill package. | **Later implementation mission candidate.** Reconstruct against current `skill-engineering`; require a real target project, standalone installation probe, boundary probe, current Sequence package, review, and separate Principal PR disposition. |
| C1 — contended-loop conclusion evidence | `design/decisions/026-contended-agent-loop-pilot.md`; Markdown paths matching `regeneration/evaluations/2026-07-13-{contended-agent-loop,single-loop-triage}-*` — **5** | Useful negative and boundary evidence. The pilot proved exclusive append semantics, but not creative advantage; one run consumed 88,968 tokens, the single-history alternative consumed 354,886, and neither justified promotion. Current [general Work Cell core](../../decisions/027-general-work-cell-core-and-sequence-adapter.md) and later activation-field research supersede this runtime direction. | **Durable historical candidate, not an active decision.** If retained, reconstruct one compact evaluation that links the current successor and explicitly records non-promotion. |
| C2 — contended-loop implementation and raw runs | all 17 staged paths under `packages/work-cell/`; JSON paths matching the C1 evaluation patterns — **20** | The implementation targets `work-cell.run.v2`, puts Sequence genome/treatment/budget vocabulary into generic `CellInput`, and predates the accepted general-core/adapter split and current `run.v3`. Raw runs are evidence carriers, not current runtime contracts. | **Superseded; do not integrate.** No retained implementation mission is justified. Preserve locally only until the retention/privacy decision. |
| D1 — divergent-practice inquiry and summaries | `principles/candidates/bounded-autonomy.md`; `principles/research/agent-divergent-practice.md`; Markdown paths matching `regeneration/evaluations/2026-07-13-{agent-dialectic,agent-divergent}-*` and their fixtures — **15** | Cross-domain inquiry records that separate nominal branch count from effective variety and identify distinct evidence, tools, representations, histories, or environments as treatments rather than guarantees. The research explicitly keeps the Sequence unchanged and asks for action-capable, held-out, cross-domain evidence. The staged candidate edit is not valid P23 evidence. | **Later research candidate.** Reconstruct the inquiry and selected summaries under `principles/research/`; do not update a candidate or create a creativity Skill from this evidence. |
| D2 — divergent-practice raw carriers | JSON paths matching the D1 evaluation patterns — **32** | Manifests and run records contain high-volume model output and failed/retried experiments. They support source recovery but do not each carry a separate decision. | **Do not return to `main`.** Retain the protected index until a human retention decision; any remote preservation needs a privacy and repository-weight check. |
| L — development log | `development-log/2026-07.md` — **1** | A monolithic old-baseline log mixes the above experiments with later facts now retained in accepted decisions, evaluations, PRs, and this partition. Applying it would reintroduce stale chronology and duplicate authority. | **Superseded; do not integrate.** |

**Completeness:** `16 + 18 + 19 + 3 + 5 + 20 + 15 + 32 + 1 = 129`.

## Implementation and authority consequences

No staged implementation qualifies for direct return. In particular:

- the old Work Cell code would reverse the accepted generic-core/Sequence-adapter
  boundary and record version;
- the old naming Skill would reverse current lineage and packaging decisions;
- progressive adoption is the only retained implementation hypothesis, and its
  separate acceptance route is named in A;
- naming/divergent research may preserve decision-changing summaries, but no
  inquiry, model trace, candidate, or pilot can accept its own causal claim or
  amend the Sequence.

The strongest hold case is to leave the protected worktree indefinitely because
all bytes remain recoverable. That avoids premature deletion but preserves a
large, private, unreviewed operational obligation. The stronger return is to
accept this partition, reconstruct only the named future candidates when they
receive authority, and make an explicit retention decision for the raw index.

## Principal Decision Brief

**Recommendation: A — accept the partition and authorize bounded settlement.**

| Key | Immediate result | Tradeoff / reopening signal |
|---|---|---|
| **A — accept and settle** | Keep N2/D1 and A as separately gated future candidates; keep C1 only as compact negative evidence if reconstructed; abandon direct integration of N1/N3/C2/D2/L; perform a privacy check before choosing a raw-index retention carrier. | Requires one later retention decision before the protected worktree is removed; reopen if a named future candidate proves it needs a raw source absent from the summaries. |
| B — archive all 129 remotely | Preserve the exact index tree on a non-main archival ref before removing the worktree. | Maximizes recoverability but publishes 1.5 MiB of unreviewed raw/model material and perpetuates repository-state cost; requires privacy review first. |
| C — keep the worktree suspended | Make no retention or disposal change. | Avoids irreversible action now but leaves the Mission branch open and the hidden operational state in place. |

Acceptance of A does not approve either future candidate, publish any raw run,
or delete the worktree by itself. It authorizes the preparation group to perform
the named privacy/retention probe and return the final disposal action for human
confirmation.
