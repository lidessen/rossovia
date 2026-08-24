# Work Estimate — Founding Baseline Major Proposal Vote

**Status:** 256k plan / 512k safety ceiling approved by Principal, 2026-07-11 — adapter enforcement and execution remain pending
**Decision horizon:** mission
**Current state and sources:** the [prepared vote docket](2026-07-11-founding-baseline-vote-docket.md), [Strategy Case](2026-07-11-founding-baseline-next-strategy-case.md), and [prior failed pilot observation](../../../chronicle/records/2026/07/obs-20260711-deliberation-docket-usability-budget-failure.json)
**Target state / decision:** produce an independently checkable advisory vote
on A/B/C/D, followed by a Principal resolution or explicit hold
**Estimator:** work-estimation method in the active human session
**Human approver, if envelope follows:** Principal

## Principal Decision Brief — envelope only

**Recommendation:** **A — adopt a 256,000-token campaign plan with a 512,000-token safety ceiling**:
each seat receives one initial attempt with a 48,000-token blast-radius ceiling;
the remaining 64,000 tokens are one **shared recovery pool**, not four
pre-assigned quotas. A valid position is never rerun. A failed or unsettled seat
may use the common pool on the same frozen packet and under the same P-ID role,
until the total cap is reached. This gives an important decision a bounded
completion path without turning the budget into a seat-by-seat production plan.
It is **not** a token forecast, price estimate, or authority for an unbounded
retry loop.

| Key | Immediate authorized result | Main tradeoff / reopening signal |
|---|---|---|
| **A — 256k campaign envelope** | Permit one initial 48k-ceiling attempt per seat, then dynamically use the shared 64k reserve only for unsettled seats; enforce one total, one frozen packet, and no retry of a valid position. | Highest bounded completion assurance without fixed per-seat reserve; requires the campaign-reserve adapter slice and still does not forecast actual use. |
| B — 192k campaign envelope | Permit one 48k-ceiling attempt per seat, with no shared recovery pool. | Lower hard cap, but a transient member failure cannot be repaired within the campaign. |
| C — no envelope / human-only review | Do not run models; Principal or an independent human reviewer compares A/B/C/D from the docket. | Avoids model cost but loses the independent Work Cell evidence experiment. |

**Disposition:** Principal approved a **256k plan / 512k safety ceiling**, 2026-07-11.
Crossing 256k records an audit variance but does not stop a valid vote; 512k is
the exceptional hard stop. This authorizes no model call before adapter
verification.
It does not choose A/B/C/D.

## Necessary work graph

| Node | Required transition | Depends on | Acceptance observation | Omit only if |
|---|---|---|---|---|
| Campaign reserve enforcement | Add an adapter-level campaign ledger that debits every initial/recovery attempt from one approved total, gives each seat one initial chance, and draws recovery from the common remaining pool. | approved envelope policy, existing single-run deliberation adapter | deterministic run proves valid positions are not rerun, only unsettled seats draw recovery, and aggregate attempts cannot exceed the campaign cap | Principal selects C human-only review |
| Freeze packet | Turn the source list into one generated, digest-labeled compact packet and exact manifest. | campaign reserve enforcement, prepared docket, current PR state | packet scope is capped; manifest has four seats, all P-ID coverage, no write/command authority | Principal selects C human-only review |
| Independent positions | Obtain one fresh read-only position per declared seat; recover only a failed/unsettled seat under the same frozen packet. | approved envelope, campaign ledger, frozen packet | retained raw initial/recovery records or explicit `not_run_budget_envelope` records | Principal selects C |
| Evidence verification | Check material assertions in positions against the packet and label unresolved claims. | retained positions | verifier observation names supported, unsupported, and omitted claims | no model positions were produced |
| Advisory projection | Rebuild tally, dissent, and unsettled state from raw records. | positions/verification | projection has no acceptance/budget/merge authority | Principal selects C, which uses a human review record instead |
| Principal resolution | Confirm A/B/C/D, reject, or request revision. | verifier observation and projection | recorded decision brief / mission update | Principal intentionally holds |

## Discovery branches

| Branch | Smallest discovery work | Opens when | Closes when | Later work made eligible |
|---|---|---|---|---|
| Envelope adequacy | One compact-packet vote with the selected, finite recovery reserve. | Principal chooses A or B | all positions settle, or partial/overrun evidence identifies the actual limit | calibrated envelope comparison only after retained comparable observations exist |
| Packet sufficiency | Member reports a material omission or verifier cannot check a decisive claim. | any position relies on absent source material | docket revision identifies the missing source and its cap | a later revised vote, under a new envelope if needed |
| Human-only route | Independent human review of the same docket. | Principal chooses C | reviewer records A/B/C/D recommendation and limits | Principal resolution without a model run |

## Resolution and tolerances

- **Structural tolerance:** no seat, packet source, or authority boundary may be
  omitted. A missing position is visible as unsettled, never inferred.
- **Forecast tolerance:** no P50/P80/P95 claim is allowed. There is one prior,
  non-comparable failed pilot; the new packet and runtime form have no calibrated
  reference class.
- **Decision tolerance:** if independent positions remain split, unsupported, or
  partial, the result is a Principal hold/revision decision rather than a forced
  majority selection.
- **Control tolerance:** the selected total campaign envelope and 48k
  per-attempt blast-radius ceiling are hard. Recovery draws from a shared
  remainder only for an unsettled seat; it is not a new approval. A packet
  change, increase, or continuation requires a new Principal decision.
- **Calibration tolerance:** retain packet shape, member caps, actual usage,
  outcome, and provider profile. One new run is evidence, not a usable
  calibration projection.

## Conversion handoff

- **Required executor profile:** current AI SDK DeepSeek adapter, model
  `deepseek-v4-flash`, read-only compact-packet workspace, no commands, a
  campaign-reserve adapter that retains each attempt, and current price revision
  retained in each run record.
- **Comparable observations / limits:** the earlier four-member pilot had broad
  workspace scopes and an overwritten first record; it is evidence of failure
  and boundary risk, not a calibrated cost reference for the new form.
- **Projection needed:** broad discovery envelope only; no price, P50/P80/P95,
  duration, or completion forecast.
- **Budget Envelope authority:** Principal only. The Work Cell enforces the
  chosen cap and reports partial/overrun evidence; it cannot expand it.

## Reopening observation

Reopen this estimate if the actual generated packet exceeds the documented
scope, a current PR review fact changes before execution, a member needs an
unlisted source to make a material judgment, the campaign reserve cannot be
enforced in the adapter, or the Principal judges 256k/192k too coarse for the
risk. In those cases revise the work graph or choose the human-only branch; do
not tune caps through unapproved retries.
