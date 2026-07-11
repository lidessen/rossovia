# Bounded Adaptive Organization — Action and Boundary Probe

**Status:** route behavior observed; human adoption pending
**Date:** 2026-07-10
**Runtime:** independent [Work Cell](../../packages/work-cell/README.md),
`deepseek-v4-flash`

## Claim

The proposed [organization operating model](../../design/decisions/012-bounded-adaptive-organization.md)
can turn concrete phase evidence into a minimal, conditional role formation
without turning a settled phase into a mandatory pipeline, central coordinator,
task queue, or automatic amendment.

## Action probe

The final constrained write run
`33e8ea13-fa52-442f-b575-1c3b9dc6da4b` passed with 123,983 tokens (estimated
$0.00443104). It could read only the named Sequence, interpretations, decisions,
skills, and prior evaluations; it could write only
`.work-cell/organization-route.md`; it had no command surface. The raw record
and route remain ignored local evidence at
`.work-cell/organization-route-cell.run.json` and
`.work-cell/organization-route.md`.

The produced route made these conditional handoffs:

1. [Decision 008](../../design/decisions/008-project-first-work-cell-interaction.md)
   is `adopted and verified`; the practice-cycle result may settle that phase,
   but does not activate further work automatically.
2. A later, evidenced carrier mismatch routes to
   [`form-guidance`](../../skills/form-guidance/SKILL.md); it selects a carrier
   and content owner, then stops.
3. Only settled evidence plus a human multi-horizon decision routes to
   [`strategic-advisory`](../../skills/strategic-advisory/SKILL.md), which
   produces a proposed Strategy Case. Human approval remains the gate before a
   mission is eligible for an execution owner.
4. In the absence of those triggers, work remains ordinary bounded work rather
   than invoking an organization process.

For each route the artifact named a triggering observation, source status,
receiver, durable verifier/committer where applicable, and reopening
observation. It retained the actual `accepted for implementation` status of
[decisions 009](../../design/decisions/009-form-guidance-replaces-generic-convergence.md),
[010](../../design/decisions/010-practice-cycle-replaces-generic-convergence.md),
[011](../../design/decisions/011-strategic-advisory-as-method-and-strategy-case.md),
and 012; none was represented as adopted or verified.

## Boundary and recovery evidence

- A broad read-only probe `1a95f261-fae1-47af-be00-273fc0a669e7` exceeded its
  120k budget after admitting whole `design` and `packages/work-cell` trees.
  The recovery was to narrow the evidence surface, not to introduce a context
  manager or central organizer.
- A first exact writable run failed before gene expression because its declared
  readable surface omitted `principles/SEQUENCE.md`. Adding only the required
  Sequence and selected interpretations repaired that capability boundary.
- The next writable run `c9e1c270-9552-4340-a413-178aa0de7cd3` wrote a useful
  route but exceeded budget before `submit_result`; it is not accepted action
  evidence. Raising the declared limit for the identical bounded task yielded
  the final submitted run above.

The final route explicitly rejected a fixed skill order, standing coordinator,
runtime, queue, and self-amendment. This supports the intended boundary of
[`artifact-organization`](../../skills/artifact-organization/SKILL.md): it can
settle carrier layout, but cannot conduct live routing or own strategy.

## Verdict and limits

The action and boundary probes support decision 012 as a **verified
organizational contract for human review**. They do not prove that the model
improves all future collaborations, that every listed role is behavior-tested,
or that the human has adopted the model. In particular, the final route used
the already observed practice-cycle, form-guidance, strategic-advisory, and Work
Cell paths; `harness`, `skill-engineering`, and `principle-cultivation` remain
declared routes whose organization-specific action evidence is still absent.

No mechanical check plan was declared because the target was a reviewable
coordination artifact rather than executable runtime behavior. The Work Cell's
successful structured submission, constrained workspace diff, retained source
statuses, and manual review of the produced route are the applicable evidence.
