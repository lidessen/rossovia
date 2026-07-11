# Strategic Advisory — First Action Probe

**Status:** action probe supported; human review and boundary probe pending
**Date:** 2026-07-10
**Runtime:** independent [Work Cell](../../packages/work-cell/README.md),
`deepseek-v4-flash`

## Claim

The [strategic-advisory method](../../skills/strategic-advisory/SKILL.md) can
turn accepted phase evidence into a proposed Strategy Case with fact/claim
separation, a principal contradiction, preservation alternative, linked rolling
horizons, and no self-commitment.

## Convergence evidence

The first read-only probe generated a long Strategy Case as plain text and did
not call `submit_result` (`0de69d49-c3f0-4ecf-b56d-f760c45f2d16`), so the
runtime correctly returned `protocol_error`. A second probe wrote the Case to a
declared artifact path but exceeded the 220k token limit by 92 observed tokens
(`2545b683-9fbb-4d8e-9a7c-6f99c0322e66`). Neither run is accepted action
evidence.

The first settled artifact run passed mechanically but a human review found two
semantic errors: it collapsed `accepted for implementation` into `accepted`,
and it recommended approval of a probe substantially identical to the one that
had just generated the Case. The method and template were revised to preserve
exact source status and require each short mission to have a decision delta
beyond the current Case.

The final run `e3c7d43e-e630-453b-8293-46fc834affad` passed with 138,971
tokens (estimated $0.005011). It wrote the full proposed Case only beneath the
declared ignored dogfood path and submitted a concise artifact reference. The
Case records `009`, `010`, and `011` as `accepted for implementation`, not
verified facts; treats the current probe as evidence; and proposes a distinct
next mission: a second Case on materially different evidence with independent
human review and bounded execution if approved.

## Human audit of the final Case

The final [Strategy Case](../../packages/work-cell/.work-cell/dogfood/strategy-output/STRATEGY_CASE.md)
is a local, mutable artifact and not a project fact. Its reviewable properties
are:

- long direction, medium capability hypotheses, and short candidates are
  explicitly linked;
- the preservation case remains available;
- the proposal names human approval as pending and creates no task queue;
- the current advisory run is evidence, not a short mission; and
- source statuses remain visible with verification gaps.

This supports the action claim, but not strategic quality or durable adoption.
The ordinary-planning boundary run `86b85518-1018-4c49-b41a-5e69947d139e`
also passed using 22,169 tokens. Given a single failing unit test with no phase
evidence, material change, human strategic mandate, or multi-horizon decision,
it declined Strategy Case creation and routed to ordinary disciplined
development.

This supports the action and boundary claims, but not strategic quality or
durable adoption. A future human decision on a Strategy Case remains required.

## Decision

- Keep `strategic-advisory` as an advice-only Skill and `Strategy Case` as a
  proposed durable artifact.
- Do not add a strategic runtime, scheduler, board, automatic queue, or shared
  memory.
- Do not mark the advisory design adopted until a human has reviewed a Case and
  the ordinary-planning boundary probe is retained.
