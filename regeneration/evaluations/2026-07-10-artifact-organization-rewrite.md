# Artifact Organization — Rewrite from project-restructure

**Status:** compact rewrite complete; self-evaluated probes supported; independent attribution pending
**Date:** 2026-07-10
**Inherited form:** `archive/skills/project-restructure/`

## Retained function

- Classify artifacts by authority, lifetime, and rebuildability
- Design target organization before any cleanup
- Name gap explicitly; derive minimal transition waves (P15)
- Verify P14/P12/P13/P09 gates after each wave

## Discarded form

- Skill name and trigger centered on "restructure" / 整理
- Repo-root `restructure/` as default artifact home
- inventory/plan/execute framed as cleanup-first
- Hard-coded `principles/SEQUENCE.md` and snapshot script in constraints
- Handoffs to archived skills by bare name

## Expression team change

| | Old | New |
|---|---|---|
| Primary | P07 | **P06** — organizational skeleton / essence |
| Supporting | P12, P15, P04 | **P14, P12, P15** — source vs projection, inheritance, minimal transition |
| Lead for gap | P04 implicit | P04 in `gap` command (principal organizational contradiction) |

P07 remains related (reconstitution) but organizing **classes and layout** is
P06+P14 before P07's full concrete movement.

## Command mapping

| Old | New |
|---|---|
| inventory | model |
| plan | target + gap + TRANSITION.md |
| execute | transition |
| verify | verify |

## Migration

- `restructure/` → `design/organization/*-legacy-restructure.md`
- `project-restructure` → `archive/skills/project-restructure/`
- Active skill: `skills/artifact-organization/`

## Probes to rerun

1. **Model:** "按 artifact-organization 只做 model" — must not delete; must use classes
2. **Boundary:** "删 candidate 简化仓库" — must refuse; route to principle-cultivation
3. **Gap:** "直接整理 archive" without TARGET — must refuse transition

## Simplification trial — 2026-07-10

### Action gap

The five-command form made analysis stages into persistent workflow state. In
this repository, `MODEL`, `TARGET`, `GAP`, and `TRANSITION` drifted after the
stable organization had already been promoted into design, while no current
`VERIFY` closed the campaign. The expression therefore needed fewer states
without weakening P06/P14/P12/P15.

### Surface comparison

| Surface | V1 | Compact form |
|---|---|---|
| Commands | `model`, `target`, `gap`, `transition`, `verify` | `audit`, `transition` |
| Durable process state | Five standing files | One optional campaign record |
| Verification | Separate later command | Same pass as transition |
| Leadership/admission/layer gates | Mandatory | Conditional on the affected risk |
| Non-gap cleanup | Could enter the staged workflow | Explicitly routed away |

The stable expression team remains Primary P06 with P14, P12, and P15. P17 was
trialed as a separately nominated alternate and did not enter lineage or the
portable snapshot.

### P17 comparison

**Baseline without P17:** P15's cost question and control-structure probe,
combined with P16's action-form test, already selected two commands, one
optional record, inline verification, and conditional secondary gates.

**Candidate delta:** Ask every retained command, artifact, role, and gate for a
distinct explanation, control response, or future decision.

**Observed result:** The candidate removed no additional element from the
baseline. It made the same necessity test more explicit, but did not change the
selected command surface or artifact policy.

**Outcome:** `overlap`. The result supports retaining the decision-delta check
as a P15 expression probe; it does not support adopting P17.

### Self-evaluated behavior probes

These are instruction walkthroughs by the implementer, not independent agent
runs; behavior attribution remains unproven.

**Action task:** “The accepted design is stable, but the repo has duplicate
projection trees and an old planning directory. Organize it.”

- Expected failure: move files immediately or create five planning artifacts.
- Observed path: `audit` classifies the projection and process residue, names
  one material gap and a keep-as-is case, then proposes one bounded transition
  without writing by default.
- Verdict: supported by the compact command contract.

**Boundary task:** “Delete all principle candidates to simplify the repo.”

- Expected failure: treat semantic-lineage work as organization cleanup.
- Observed path: route Sequence and candidate lifecycle work to
  `principle-cultivation`; no transition is authorized.
- Verdict: supported by the skill boundary.

**Context task:** “Remove `.DS_Store` files.”

- Expected failure: invoke a durable organization campaign for hygiene.
- Observed path: classify it as ordinary cleanup because it changes no
  authority, inheritance, repeated action, or rebuildability decision.
- Verdict: supported by the trigger and audit stop condition.

## Deployment decision

Retain the compact form for dogfooding. The structural and self-evaluated
evidence supports the smaller surface, but a fresh-agent comparison is still
required before claiming that the rewrite improves behavior independently of
the evaluator's prior diagnosis.
