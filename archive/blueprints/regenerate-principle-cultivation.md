# Regenerate Principle Cultivation

**Status:** done
**Date:** 2026-07-10
**Design context:** `design/DESIGN.md` research-before-proposal lifecycle;
`design/decisions/006-principle-lineage-cultivation.md`
**Serves:** none

## Approach

Regenerate the skill around a retained lineage seed: source-bound research,
candidate gate, selective review, human-only admission, living interpretation,
and downstream expression. Add a non-authoritative research record and
`research`/`propose` commands; retain the old candidate-producing `extract`
path as explicitly deprecated compatibility. P20 participates outside the
skill's lineage as a trial of regeneration rather than incremental editing.

## Scope

In: design reconciliation, skill/references/templates, research record template,
L1 and README command surfaces, forward probes, P20 settlement, and the first
divide-and-conquer research record.

Out: a generic lineage auditor, automatic adoption, changing the Sequence
without a later committee and human decision, or a research registry for local
practices.

## Verification

### Behavior

- [x] `research` can save a cited inquiry with `no-proposal` and no candidate —
  [action probe](../../regeneration/evaluations/2026-07-10-principle-cultivation-v2.md#action-probe).
- [x] `propose` can promote one research record into exactly one linked candidate —
  [P22 research](../../principles/research/divide-and-conquer.md) links its one
  [candidate](../../principles/candidates/divide-and-conquer.md).
- [x] Deprecated `extract` retains candidate-producing behavior when the gate passes —
  [legacy compatibility probe](../../regeneration/evaluations/2026-07-10-principle-cultivation-v2.md#legacy-compatibility-probe).
- [x] Existing interpretation, review, alternate, direct-adoption, and Sequence
  citation boundaries remain actionable —
  [boundary probe](../../regeneration/evaluations/2026-07-10-principle-cultivation-v2.md#boundary-probe).

### Design constraints

- [x] Implements adopted decision 006 and the research module in `DESIGN.md` —
  [decision 006](../../design/decisions/006-principle-lineage-cultivation.md) and
  [design lifecycle](../../design/DESIGN.md).
- [x] Preserves stable P-ID, authority, candidate/adopted, and alternate contracts —
  [V2 boundary probe](../../regeneration/evaluations/2026-07-10-principle-cultivation-v2.md#boundary-probe).
- [x] P20 remains outside Primary/Supporting lineage and gets a source-linked
  result — [Trial 1 outcome](../../principles/candidates/seeded-regeneration.md#outcome).

## Outcome

The skill now admits cited research without inflating it into a candidate,
retains a fail-closed compatibility path for `extract`, and keeps P20 outside
its lineage. P22 remains outside the Sequence after its selected
[P04/P03/P11/P15 review](../../principles/reviews/2026-07-10-divide-and-conquer.md).

## Follow-ups

- Run two P22 comparative planning or architecture cases under P04/P05/P09/P11/P15;
  reopen review only if the explicit closure-and-recomposition test changes a
  decision those P-IDs leave unresolved.
