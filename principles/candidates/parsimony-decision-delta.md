# Candidate — Parsimony Requires Decision Delta

**Status:** candidate
**Observed in:** philosophy of explanation, statistical model selection, agent-system design

## Candidate sequence line

P17｜不增加不能带来可验证解释、预测或决策差异的实体、规则与层次｜奥卡姆剃刀 / 最小描述长度

## Recurrence

- William of Ockham’s formulation, commonly rendered “plurality should not be
  posited without necessity,” rejects explanatory multiplication with no need.
  The familiar “entities must not be multiplied” slogan is a later formulation,
  not the source text to treat as an exact quotation.
- Jorma Rissanen, “Modeling by Shortest Data Description” (1978), selects a
  model by the combined description length of model and data: structure earns
  its cost only when it compresses the observations it explains.
- `agent-worker/design/DESIGN.md:73-91` permits decomposition only when it
  reduces a named context, conflict, blast-radius, or comparison cost; it is not
  a default architectural virtue.

## Decision consequence

Before adding a component, skill, committee seat, rule, abstraction, or sequence
entry, name the distinct explanation, prediction, control response, or decision
it enables. If none can be tested, merge it into an existing structure or leave
the structure absent.

## Existing-sequence check

P15 selects a smallest valid transition after the present contradiction and hard
constraints are known. P10 prices human attention. Neither governs the model or
organizational vocabulary itself: P17 asks whether a new distinction earns its
existence by changing what the system can explain, predict, or decide.

## Counterexample / boundary

Do not remove a distinction merely because its benefit is not immediately
visible. If it separates disturbances that require different responses, it is
necessary; P18 states that lower bound. Parsimony compares adequate alternatives,
not a simpler inadequate model against a complete one.

## Expression probes

- Architecture: decline a new service or module unless the existing boundary
  cannot provide the required decision or control difference.
- Skill design: decline a new skill unless it owns a distinct trigger and changes
  a future judgment beyond the current skill corpus.

## Committee review

See [`2026-07-09-scale-control.md`](../reviews/2026-07-09-scale-control.md).

## Human decision

**Sequence:** pending — review recommends rejection as a new P-ID and retention
as a P15 expression probe.

**Alternate:** nominated by the human on 2026-07-10 for one bounded comparison
while simplifying `artifact-organization`. Nomination does not imply adoption.

## Trial 1 — artifact-organization simplification

**Status:** complete — overlap
**Task:** Reduce the five-command organization workflow without losing its
source-authority, inheritance, or minimum-transition decisions.

**Baseline without P17:** P15 and P16 already suggest collapsing `model`,
`target`, and `gap` into one read-only audit; keeping one approved `transition`;
and recording audit, execution, verification, and disposition in one campaign
record only when durable handoff is needed.

**Candidate delta:** Require every retained command, artifact, role, and gate to
name a distinct explanation, control response, or future decision. Remove or
make conditional any element that cannot do so.

**Disconfirming observation:** P17 removes or changes nothing beyond the
P15/P16 baseline, or every useful removal is already required by P15's existing
decision-cost and control-structure probes. That result is `overlap`, not
evidence for Sequence adoption.

**Observed result:** The P15/P16 baseline had already collapsed the workflow to
`audit` and `transition`, one optional campaign record, inline verification,
and conditional secondary gates. Applying P17 removed no additional command,
artifact, role, or gate. See the
[simplification evaluation](../../regeneration/evaluations/2026-07-10-artifact-organization-rewrite.md#p17-comparison).

**Outcome:** `overlap`. P17 made the necessity question explicit but produced no
independent decision delta. Retain the current Sequence and the P15 expression
probe; this trial supplies no adoption evidence.
