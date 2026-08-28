# Top-down Theory, Architecture, and Skills Review

**Status:** candidate repair assembled; integration authority remains pending
**Date:** 2026-08-03
**Frozen baseline:** `cff6613fb18145990e973e74ebe189612bdedf24`
**Authority:** review and candidate-change evidence only; no Principle adoption,
architecture acceptance, merge, publication, or product-capability authority

## Review question

Can a person or Agent move reliably from project purpose through core
principles, accepted architecture, reusable Skills, situated work, mechanisms,
and evidence without a fast-changing lower mechanism redefining an upper
source? Where historical corrections recur, which owning layer should change?

The strongest preservation case was tested first: keep P01–P16, keep the
Founding Mandate distinct, keep all 22 current Skills, and avoid creating
another design root or evidence registry unless a concrete failure requires it.

## Evidence and method

The baseline was frozen before synthesis. Three fresh, read-only Agents reviewed
history, Principle coherence, and the complete active-Skill system
independently. The Main Agent retained synthesis and writes, then reconstructed
material claims through Git history, current sources, validation scripts, and
two fresh boundary probes. The harness returns, exact dispatch boundaries, and
their replay limitation are retained in the
[agent-return evidence](evidence/2026-08-03-top-down-review-agent-returns.md).

Observed historical shape:

- in the inclusive range `c0d80a5^..cff6613`,
  `principles/SEQUENCE.md` and `design/FOUNDING-MANDATE.md` each appear in
  two commits, while `design/DESIGN.md` appears in 17;
- `design/DESIGN.md` had grown to 517 lines before this candidate;
- root `AGENTS.md` grew from 99 lines at `c0d80a5` to 437 lines at the
  frozen baseline, mainly through Workbench-specific command and authorization
  protocols; and
- all 22 active Skills passed the packaged Sequence snapshot check and remained
  below the 500-line entry limit, but structural validity did not imply current
  behavior evidence.

## Stable vertical architecture

The candidate makes the following ownership order explicit:

1. objective reality, inherited knowledge, and practice remain outside project
   ownership;
2. the Founding Mandate owns project purpose, value boundary, human
   constituency, and explicitly adopted project-local working lines;
3. the Principle Sequence is the sole semantic root of compact cross-context
   core principles, not every project method;
4. accepted architecture owns durable authority, state, feedback,
   verification, and substitution relations;
5. Skills own reusable judgments and their behavior contracts;
6. a situated Mission or temporary formation owns the current object,
   contradiction, roles, scope, and acceptance relation;
7. mechanisms and adapters execute bounded effects and external protocols; and
8. evidence and projections return observations upward without acquiring
   authority over their sources.

Specificity and expected change generally increase downward, while the evidence
burden for change increases upward. This is not a dependency-direction law or a
claim that age proves truth. Lower evidence may reopen an upper layer but cannot
rewrite it directly.

## Principle review

**Verdict: retain P01–P16.** The
[retained Principle review](evidence/2026-08-03-top-down-review-agent-returns.md#principle-coherence-return)
found no recurring decision failure requiring a new, revised, or retired
Sequence line. The pending change-rate-layering inquiry does not gain adoption
through this review; P09, P12, P14, and accepted architecture already carry the
demonstrated consequence.

The review made three non-Sequence repairs:

- twelve interpretations gained inline, claim-adjacent source links;
- P13 now remains narrowly explicit that fact settlement must use current,
  traceable source, evidence, and stated-result relations. Current effect
  authorization stays with accepted architecture and the responsible
  mechanism; and
- P14's overbroad Sequence-to-interpretation probe was replaced with a
  reconstructible source/projection case. Semantic-source authority belongs to
  architecture, not to P14's event-projection predicate.

The generic object-first selector remains directionally supported, not
universally generative. Domain methods still supply object relations that a
generic P-ID selector may miss.

## Architecture and delivery repairs

- Root design now distinguishes purpose, method canon, architecture, methods,
  situated formations, mechanisms, and evidence.
- The module list is explicitly a current capability map below the governing
  layers, not another architecture source.
- Root `AGENTS.md` retains a compact Workbench route and falls from 437 to 181
  lines. The command and authorization protocol moves intact to
  `apps/workbench/AGENTS.md`, where it is loaded only for Workbench
  requests.
- Current-effect revalidation is stated as an architecture discipline while
  concrete fields and protocols remain with their testable mechanisms.
- Controls must extend useful loops, expose failure, or support recovery.
  Transitional supervision and approval surfaces require an exit condition;
  mechanical safety alone does not prove useful autonomy.

## Active Skill evidence standing

The pointer is an evidence projection, not the source. “Supported” means only
the named retained claim; “partial” and “unproven” are first-class standings.

| Skill | Current retained evidence | Standing |
|---|---|---|
| agent-delegation | [first repository use and boundary](2026-08-03-agent-delegation-first-use.md) | observed-partial: read-only partition and coupled-state restraint supported; causal advantage and producing reconciliation unproven |
| agent-environment | [source/value boundary](2026-07-17-agent-environment-source-and-value-boundary.md), [ordinary routing](2026-08-03-agent-environment-routing-boundary.md) | partial: safe source-gate routing supported; full-toolbox action unproven |
| agent-tooling | [first slice](2026-07-23-agent-tooling-first-slice.md) | partial: action and boundary supported; real mutation and general model attribution unproven |
| artifact-organization | [rewrite evaluation](2026-07-10-artifact-organization-rewrite.md) | partial: action/boundary observed; independent causal attribution unproven |
| code-review | [cognitive-modeling review](2026-07-15-code-review-cognitive-modeling.md) | supported-bounded: proposed-change review and boundary observed; comparative advantage remains bounded |
| context-engineering | [rewrite probe](2026-07-14-context-engineering-rewrite-probe.md) | supported-bounded: delivery action and boundary observed |
| disciplined-development | [test-value gate](2026-07-11-disciplined-development-test-value-gate.md) | partial: deterministic gate observed; fresh-Agent attribution unproven |
| document-writing | [document probe](2026-07-23-document-writing-probe.md) | partial: source preservation and boundary observed; general writing superiority unproven |
| form-guidance | [practice/form probes](2026-07-10-practice-cycle-and-form-guidance-probes.md) | partial: action and boundary observed; causal attribution unproven |
| improve-agent-workflow | [workflow probe](2026-07-15-improve-agent-workflow-probe.md) | supported-bounded: diagnosis and handoff boundary observed in one task |
| model-evaluation | [validity gate](2026-07-18-model-evaluation-v2-validity-gate.md) | supported-bounded: invalid comparisons held and bounded profiles admitted |
| naming-and-articulation | [first probe](2026-07-10-naming-and-articulation-probe.md) | partial: action/boundary/context observed; human adoption pending |
| practice-cycle | [practice/form probes](2026-07-10-practice-cycle-and-form-guidance-probes.md) | partial: live one-step action/boundary observed; causal attribution unproven |
| principle-cultivation | [v2 evaluation](2026-07-10-principle-cultivation-v2.md) | supported-bounded: research/review/adoption boundary observed; regeneration attribution unproven |
| project-cognition | [positive probe](2026-07-16-project-cognition-skill-positive-probe.md), [bootstrap/refresh](2026-07-16-project-cognition-bootstrap-and-refresh.md) | supported-bounded: durable-model action and persistence boundary observed |
| skill-engineering | [standalone harness](2026-07-09-skill-engineering-standalone-harness.md) | partial: standalone action/context observed; direct boundary evidence thinner than current methods |
| strategic-advisory | [action probe](2026-07-10-strategic-advisory-action-probe.md) | partial: action and ordinary-planning boundary supported; strategic quality and human adoption unproven |
| structural-refactoring | [Skill probe](2026-07-14-structural-refactoring-skill-probe.md) | supported-bounded: action, restraint, authority, and behavior-preservation boundary observed |
| systems-engineering | [first slice](2026-07-19-systems-engineering-first-slice.md) | partial: whole-system action/boundary observed; consequential use remains human-gated |
| task-shaping | [first-slice probe](2026-07-18-task-shaping-first-slice-probe.md) | provisional: corrections retained; capability and transformation claims remain profile-relative |
| visual-design | [seed field](2026-07-18-visual-seed-field.md), [MeowAsk context](2026-07-17-visual-design-meowask-second-context.md) | supported-bounded: strongest multi-context action/boundary evidence; human visual acceptance remains external |
| work-estimation | [work probe](2026-07-10-work-estimation-probe.md) | supported-bounded: work graph, boundary, tolerance, and context observed; runtime conversion pending |

## Dispositions

1. Do not change the Sequence in this campaign.
2. Keep the Mandate, Sequence, architecture, Skills, formations, mechanisms,
   and evidence as distinct owners.
3. Keep volatile Workbench protocols scoped below the root Agent entry.
4. Treat Active Skills as installable/discoverable, not automatically
   behavior-proven; retain this table as the current evidence projection.
5. Keep `agent-environment` and `agent-delegation` explicitly partial until
   their unproven action/context claims receive representative evidence.
6. Correct local evaluation metadata when it contradicts retained evidence;
   do not build a new registry or admission bureaucracy from one inconsistency.

## Residual risk and reopening signals

- The review does not prove that every novel task will select the right P-ID or
  Skill.
- Interpretation citations improve provenance but do not independently validate
  the interpretations.
- Moving Workbench detail preserves text, but only path/link and command probes
  can establish that a later Agent receives it correctly.
- Reopen architecture if representative practice still causes lower runtime or
  UI policy to redefine upper authority, or if scoped delivery hides a
  material guard.
- Reopen the Sequence only when a recurring cross-context decision consequence
  cannot be reduced to an existing P-ID without semantic extension.

## Candidate verdict

The upper theory is stable enough to retain, but its reliability depends on
clear ownership, slower upper-layer change, source-bound interpretations,
scoped context delivery, and honest behavior evidence below it. Exact-head
verification and fresh independent review must still bind the integration
candidate; this source record supplies neither integration nor acceptance
authority.
