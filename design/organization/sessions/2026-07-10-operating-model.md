# Operating Model Campaign

**Status:** pass
**Accepted design:** [Skills Design](../../DESIGN.md), [decision 012](../../decisions/012-bounded-adaptive-organization.md)

## Audit

The accepted design distinguished the Sequence, skills, Work Cell evidence,
human approval, and artifact campaigns, but had no inspectable cross-skill
contract for activation, handoff, evidence, and adaptation.

The strongest unchanged case was that existing skills already block a central
scheduler. That case rules out a new runtime or mandatory orchestrator, but it
does not give a later actor the repeated routing and authority contract.

## Material gap

The missing decision was: given an observed disturbance, which existing role
responds, what evidence crosses the handoff, and who may settle a durable
change? Leaving it implicit would force reconstruction from chat and isolated
prompts, risking ambiguous routing and collapsed authority.

## Transition

[Decision 012](../../decisions/012-bounded-adaptive-organization.md) and the
promoted [organization operating model](../../DESIGN.md#organization-operating-model)
add one human-governed coordination contract. They create no new skill, runtime,
board, queue, or standing coordinator.

## Verification

The [action and boundary probe](../../../regeneration/evaluations/2026-07-10-bounded-adaptive-organization-probe.md)
passed a constrained Work Cell route: it selected only conditionally relevant
roles, retained exact source statuses, named handoff/approval boundaries, and
rejected a mandatory pipeline or automatic amendment. Two preceding failed runs
are retained in that evaluation as context-scope and protocol recovery evidence.

**Verdict:** the artifact gap is closed and the contract is verified for human
review. Human adoption of the durable organization model remains a separate
authority decision.

## Disposition

Stable organization is promoted to `design/DESIGN.md`; this campaign is archived
as durable evidence because later actors must recover its gap, strongest
unchanged case, and verification limits.
