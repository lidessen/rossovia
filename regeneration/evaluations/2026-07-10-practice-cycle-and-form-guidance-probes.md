# Practice Cycle and Form Guidance — Live Probes

**Status:** action behavior observed; full boundary attribution pending
**Date:** 2026-07-10
**Runtime:** independent [Work Cell](../../packages/work-cell/README.md),
`deepseek-v4-flash`

## Practice-cycle action and domain boundary

The [practice-cycle method](../../skills/practice-cycle/SKILL.md) was given the
accepted Work Cell project-interaction phase and a future desire for strategic
advisory. The live run `4d36b094-e1c5-4483-9a4a-b12d630cd22c` passed using
84,552 tokens (estimated $0.003112).

It selected `settle`: the interaction phase had met its stated acceptance
conditions and retained its evidence. It treated the strategic-advisory desire
as a new domain question rather than an unresolved defect of the completed
phase. This supports the intended distinction: a practice cycle must not create
a generic next plan merely because another aspiration exists.

The raw record is local and ignored at
`packages/work-cell/.work-cell/dogfood/practice-cycle-work-cell-phase.run.json`.
The one-step boundary run `90d7975b-ca47-4cf6-a5eb-f32b55c0fd1a` also passed
using 13,907 tokens. Given a known one-line typo with no learning handoff, it
rejected the cycle, plan, and feedback artifact and routed to ordinary
disciplined development. The result is action/boundary evidence, not a
comparison proving that the method caused the distinction.

## Form-guidance action and handoff boundary

The corrected [form-guidance method](../../skills/form-guidance/SKILL.md) was
given the explicit recurring question of how strategic recommendations should
exist. The live run `5537216a-c77d-4fdb-82fb-5fb7066614ab` passed using 88,147
tokens (estimated $0.003730).

It retained only a candidate method Skill and a human-approved durable decision
artifact, then named the unresolved content-owner question: how to synthesize
phase evidence into a recommendation. It explicitly declined to define
horizons, roadmap, or workflow. This supports the revised handoff boundary:
form-guidance chooses a carrier and owner, then stops.

The raw record is local and ignored at
`packages/work-cell/.work-cell/dogfood/form-guidance-strategic-handoff.run.json`.
The one-off boundary run `8fee5269-5a17-43be-9d4a-459d5b36433f` passed using
33,082 tokens. For a single release-note sentence with no recurrence, handoff,
authority, or recovery need, it selected a direct conversation and rejected
every durable, runtime, projection, and campaign form. This is not a claim that
form-guidance improves all task planning.

## Decision

- Keep [practice-cycle](../../skills/practice-cycle/SKILL.md) as the candidate
  replacement for generic task convergence: it is closer to
  [disciplined-development](../../skills/disciplined-development/SKILL.md) than
  to form selection and activates only when observed work must revise a later
  judgment.
- Keep [form-guidance](../../skills/form-guidance/SKILL.md) as a low-frequency
  specialist. It is not a universal task preflight or the owner of strategic
  methodology.
- Do not retire the external `task-convergence` installation yet; no comparable
  baseline or one-step boundary probe establishes replacement attribution.
