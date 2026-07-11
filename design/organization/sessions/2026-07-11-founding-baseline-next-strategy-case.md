# Founding Baseline — Next Strategy Case

**Status:** Principal resolution A recorded — review-and-integration gate active; no merge authorized yet
**Date:** 2026-07-11
**Human mandate:** establish a common, open, replaceable productive-AI capability
with concrete practice evidence, under the [founding mandate](../../FOUNDING-MANDATE.md)
**Decision requested:** admit this major proposal to a bounded independent vote
and separately authorize an envelope only after reviewing its docket/estimate
**Approver:** Principal
**Evidence cutoff:** local staged worktree and PR #13 state inspected 2026-07-11

## Principal Decision Brief

**Recommendation:** admit **A — complete the review-and-integration gate** to a
bounded independent vote. The immediate block is not a missing organization
design or deliberation feature. It is that the common baseline still lacks
current-head CI, explicit disposition of external review observations, and the
independent human review required before a Principal merge/return decision.

| Key | Result if adopted after vote | Main tradeoff / reopening signal |
|---|---|---|
| **A — review and integrate** | Turn the staged baseline into one reviewable PR checkpoint; give each external review thread an evidence-backed disposition; obtain fresh verification and independent human review; then present the ordinary merge/return decision. | Defers direct constitution inquiry and a revised live deliberation pilot until their substrate is inspectable. |
| B — design the organization constitution now | Begin the administrative-system inquiry using the local pilot as evidence. | Designs governance atop an unintegrated, externally unreviewed baseline; a review correction could invalidate the substrate. |
| C — fund a revised live deliberation pilot now | Issue a new human envelope and exercise `deliberate-probe --execute` before integration. | Spends new model budget before the revised interaction has passed PR review; prior pilot evidence does not compel this order. |
| D — hold | Make no new change until outside review arrives. | Avoids immediate integration risk but leaves known open review and the current staged checkpoint without disposition. |

**Your reply now:** `authorize vote`, `hold`, or `explain <topic>`. A vote
report will then return the A/B/C/D alternatives for a separate Principal
resolution; it does not choose one itself.

## Vote admission and formation

This is a major proposal: A/B/C/D lead to different commitment order, one
option requests a new model envelope, and all affect the founding baseline's
authority boundary. It therefore follows the bounded deliberation process in
[decision 020](../../decisions/020-bounded-work-cell-deliberation.md), rather
than a direct strategy-case reply.

| Seat | Decision question |
|---|---|
| P04 — contradiction | Which option most changes the actual founding bottleneck rather than merely shifting urgency? |
| P11 — authority | Which option best preserves the separation of direction, execution, verification, and commitment? |
| P13 — evidence | Which option rests on currently verified conditions, and which claim must remain conditional? |
| P15 — preservation | What is the strongest case for holding, and which transition is actually minimal? |

The preparation group may generate a compact `deliberate-probe` docket containing
this case, the mission record, PR review state, and current deterministic
verification evidence. It may not execute that docket until the Principal
approves a **new** allocation envelope: the earlier 192,000-token pilot is
exhausted and cannot be reused. The vote produces independent positions,
unsettled members, tally, and dissent; an independent verifier checks material
claims; the Principal then records the A/B/C/D resolution. No majority, tally,
or agent report can approve a budget, commit/push, merge, or create a mission.

The prepared [vote docket](2026-07-11-founding-baseline-vote-docket.md) and
[Work Estimate](2026-07-11-founding-baseline-vote-work-estimate.md) are
proposal inputs to that separate envelope gate, not an execution authorization.

## Concrete situation

| Statement | Classification | Source and exact status | Verification gap |
|---|---|---|---|
| The founding mission is active and requires a reviewable, human-governed baseline. | fact | [mission record](../../../operations/missions/founding-baseline.json): `active` | It does not itself settle any branch. |
| The bounded-deliberation, continuity, AX, and test-value slices are staged locally. | fact | current staged worktree; [decision 020](../../decisions/020-bounded-work-cell-deliberation.md), [021](../../decisions/021-git-tracked-mission-continuity.md), [022](../../decisions/022-project-first-deliberation-interaction.md), and [test-value evaluation](../../../regeneration/evaluations/2026-07-11-disciplined-development-test-value-gate.md) | They have not received fresh remote CI or independent human review. |
| Work Cell deterministic verification passes. | fact | `bun run typecheck` and `bun test`: 28 passing tests in the current worktree | This proves deterministic contracts, not revised model quality or cost. |
| The original deliberation pilot made no valid strategic selection and exhausted its authorized envelope. | fact | [docket disposition](2026-07-11-founding-priority-docket.md) and [Chronicle observation](../../../chronicle/records/2026/07/obs-20260711-deliberation-docket-usability-budget-failure.json) | A revised live pilot requires a new Principal envelope. |
| PR #13 is open as a draft, has a successful prior `verify` run, and has three unresolved external review threads. | fact | [PR #13](https://github.com/lidessen/skills/pull/13); threads on [workspace command containment](https://github.com/lidessen/skills/pull/13#discussion_r3562943162), [Chronicle path containment](https://github.com/lidessen/skills/pull/13#discussion_r3562943164), and [root envelope settlement](https://github.com/lidessen/skills/pull/13#discussion_r3562943187) | The successful remote check predates the current staged changes; explicit thread disposition and current-head CI remain absent. |
| The founding committee judged content conditionally fit; the preparation group required thread disposition and independent human review before merge. | fact | [founding baseline review](2026-07-11-founding-baseline-review.md) | The report is evidence, not the required independent review or merge authority. |

## Principal contradiction and preservation case

- **Principal contradiction:** the project has accumulated enough design and
  implementation evidence to need a shared baseline, but that baseline is not
  yet a current, independently reviewable integration object. Continuing to add
  strategic design increases the cost of correcting an unsettled substrate.
- **Why it changes the remaining choices:** once the baseline has a current
  review/CI/Principal disposition, the organization inquiry can use accepted
  boundaries and a revised model pilot can be evaluated as a separate funded
  practice. Without it, both inherit uncertain code, records, and review state.
- **Strongest preservation case:** hold until an external reviewer responds.
  This avoids prematurely promoting a local branch, but fails to close the
  already-known review and continuity obligations that make outside review
  meaningful.
- **Secondary constraints:** no new model allocation is implied; no agent may
  self-accept, self-merge, or turn a tally into a commitment.

## Alternatives

| Alternative | Capability cost | Irreversible surface | Evidence gap | Defeating condition |
|---|---|---|---|---|
| Preserve / D | low immediate effort | none | leaves unresolved PR state | a valid reason that external review cannot be dispositioned now |
| A — review and integrate | bounded review, checkpoint, CI, and human attention | one reviewed commit/push only after Principal approval | whether all three thread fixes hold on current head | fresh CI failure, unresolved material review, or independent reviewer rejection |
| B — constitution first | a major design inquiry | new cross-project organization design | whether its substrate remains stable | any baseline correction changes its core premise |
| C — live pilot first | a new human model envelope | cost-bearing external execution record | whether AX improves model behavior/cost | no newly authorized envelope or prepared-docket review identifies a material gap |

## Budget assessment

No new model, time, or money envelope is requested for A at this decision point.
Its necessary work is a bounded integration practice: reconcile the staged
checkpoint; map each review observation to evidence and disposition; run fresh
verification; obtain independent human review; and return a merge/hold brief.
If a newly discovered defect changes implementation scope, stop and prepare a
separate Work Estimate before asking for a new execution envelope.

## Rolling horizons

### Long direction

Build a common, inspectable, replaceable productive-AI capability whose claims
are demonstrated on bounded work and whose people, communities, and AI systems
are not treated as extractable inputs. The protected boundaries are human
commitment authority, evidence traceability, replaceability, and economic
sufficiency.

### Medium capability hypotheses

| Capability | Enables long direction | Dependencies | Evidence gap | Revision signal |
|---|---|---|---|---|
| Accepted, reviewable foundation | Shared methods and runtime can be inspected, forked, and corrected without private session state | current PR integration and human review | whether baseline review finds a material contradiction | CI or independent review rejects the checkpoint |
| Bounded agent practice with usable AX | ordinary agents can prepare bounded tasks/decisions without reconstructing runtime plumbing | accepted Work Cell interfaces and a later funded pilot | real agent quality/cost effect | revised pilot provides no decision-changing value |
| Formal administrative organization | direction can guide planning, execution, statistics, inspection, and correction without becoming a second semantic source | accepted operating boundaries and concrete practice evidence | exact roles and mechanisms remain unmodeled | foundation review changes ownership/authority boundaries |

### Short mission candidates

| Mission | Decision delta beyond this Case | Linked capability | Linked direction | Acceptance evidence | Work Estimate / envelope after approval | Execution owner after approval |
|---|---|---|---|---|---|---|
| **A: review-and-integration gate** | Resolves whether the current baseline is an accepted common substrate rather than only a staged local claim. | Accepted, reviewable foundation | common inspectable productive-AI capability | current-head CI, three explicit thread dispositions, independent human review, Principal merge/return brief | bounded integration practice; no new model envelope requested | preparation group / integration steward under Principal authority |
| B: constitution inquiry | Produces a reviewable administrative model only after a stable substrate exists. | Formal administrative organization | accountable common capability | constitution review and authority-boundary checks | estimate after A settles | temporary design formation |
| C: revised live deliberation pilot | Tests whether compact packet AX changes a real model practice. | Bounded agent practice with usable AX | economic, evidence-bearing practice | prepared docket, new Principal envelope, retained raw result, independent evaluation | separate Work Estimate and new envelope | Work Cell adapter, verifier, Principal |

## Minimum recommendation

- **Recommended human commitment now:** authorize preparation of the independent
  vote; review and approve its envelope separately before any model call.
- **What remains conditional:** the A/B/C/D mission resolution follows the vote
  report and Principal confirmation. The organization constitution begins only
  after that resolution; any new model pilot also needs its own prepared-docket
  inspection and allocation.
- **Disconfirming observation / replan trigger:** a fresh check or independent
  review finds a material issue that cannot be bounded within the present
  checkpoint, or a review thread reveals that the proposed fixes are not
  adequate. Then return to the owning correction branch rather than merge.
- **Non-scope:** no new doctrine, committee vote, automatic scheduler, budget
  expansion, or merge authorization.

## Authority and disposition

- **Proposal prepared by:** strategic-advisory synthesis in the active human
  session.
- **Independent verification needed:** current-head CI and an independent human
  review observation.
- **Human decision:** Principal authorized the vote/envelope and confirmed
  **Option A — review and integrate**, 2026-07-11. The supporting vote report
  retained three valid supports and one P11 protocol gap; the gap remains an
  audit observation, not hidden consensus.
- **Accepted execution owner after approval:** the preparation group coordinates
  the operational gate; only the Principal decides commit/push/merge authority
  at the relevant boundary.
