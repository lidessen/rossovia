---
name: skill-engineering
description: >-
  Design, rewrite, review, and test agent skills that improve a repeated agent
  action or judgment. Use when creating a skill, rewriting a SKILL.md, improving
  a known skill trigger or action layer, reducing skill-context bloat, or
  checking whether a skill instruction actually changes behavior. Triggers
  include "create a skill", "rewrite this skill", "review this SKILL.md",
  "improve this project skill", "skill design", and "test this skill prompt".
  If an agent-work failure has not yet been localized to a skill, let an
  agent-workflow diagnostic method identify the owning surface first.
---

# Skill Engineering

## Principle expression

**Primary:** P16
**Supporting:** P09, P08, P15

## Scope

Engineer an agent-facing expression only when an observed action gap recurs and
a reusable skill is the smallest form that can close it. The objective is not a
well-formatted prompt; it is an agent that can make the intended judgment and
take the intended action under its real context constraints.

Do not create a skill for a one-time request, a vendor command reference, an
implementation detail, or a behavior already owned by a more specific skill.
Use a project document, command, reference, or local adapter when that is the
truer form. Do not create, interpret, or revise Sequence entries here; route a
possible new principle to principle-cultivation.

This package is independently usable. It carries a read-only Sequence snapshot
in `references/sequence.md` and source-bound interpretations under
`references/sequence-interpretations/`. The package is a portable lineage
baseline, not a second semantic source.

## Dispatch

- With `create`, read and follow commands/create.md.
- With `rewrite`, read and follow commands/rewrite.md.
- With `review`, read and follow commands/review.md.
- With `test`, read and follow commands/test.md.
- With `refresh-sequence`, read and follow commands/refresh-sequence.md.
- With `sync-sequence-snapshot`, read and follow commands/sync-sequence-snapshot.md.
- With no argument, diagnose the stated agent-action gap, choose the smallest
  truthful form, and then use the matching path above.

## Principle source resolver

Resolve the target's lineage before selecting an expression team.

1. If the host project contains principles/SEQUENCE.md and its corresponding
   interpretations directory, treat that declared local source as authoritative
   for the current task.
2. Otherwise use this package's `references/sequence.md` and only the selected
   files under `references/sequence-interpretations/`. This fallback must be
   sufficient for offline use.
3. If freshness materially affects the decision, use refresh-sequence to obtain
   a temporary, verified remote comparison. Never overwrite the packaged
   snapshot from a task run. If refresh fails, continue with the baseline and
   report its version rather than inventing a current result.

When host and packaged lines differ, use the host source for its project and
report the lineage difference. Do not merge, edit, or silently reconcile them.

## Core method

1. **Ground the action gap.** State who must act, the concrete action or
   judgment that currently fails, the source evidence, and the observation that
   would show improvement. Do not begin from a skill name or a preferred file
   layout.
2. **Form the target expression team.** Resolve the Sequence through the
   source resolver, then read only the interpretations for nominated P-IDs.
   Select exactly one Primary and at most three Supporting P-IDs for the target
   expression. Record why each changes a decision and why an existing skill
   cannot own the same gate. Use references/expression-team.md. If the host has
   a human-nominated alternate candidate, keep it outside this lineage and add
   it only as a separate, temporary trial with an explicit baseline, candidate
   delta, and disconfirming observation.
3. **Choose the minimum form.** Prefer an existing skill, a command, a
   reference, or a project-local adapter when it already enables the action.
   Create a new skill only when it has a distinct repeated trigger, judgment,
   and durable artifact or decision gate.
4. **Make the expression actionable.** Put stable trigger and scope signals in
   frontmatter; put the active judgment and short work loop in SKILL.md; put
   volatile detail, variants, and long protocols behind direct references.
   Use references/expression-layers.md for register, doctrine-file shape, and
   P16 probes. Domain skills own organizational or methodological doctrine;
   this skill owns how that doctrine is expressed.
5. **Test behavior, not prose.** Define a task that would reveal the intended
   behavior, a boundary task that should not trigger or should route elsewhere,
   and the evidence each outcome must provide. When claiming improvement, use
   a comparable baseline or label attribution unproven. Use
   references/evaluation.md. Revise from observed failure rather than from
   aesthetic preference.
6. **Commit the smallest valid expression.** Preserve source links and record
   remaining uncertainty. In source-bearing research, interpretation, proposal,
   or review artifacts, keep descriptive inline links on the claims they support;
   a detached bibliography alone is insufficient. A passing format check proves
   only structure; do not claim behavior improvement without behavior evidence.

## Operating boundaries

- This skill's P16/P09/P08/P15 team governs the engineering process. Every
  target skill forms its own selected expression team; do not copy this team's
  P-IDs into the target by default.
- An expression team is not a principle-review committee. It has no vote and
  no authority over the Sequence.
- A nominated alternate candidate is not a P-ID expression member. Never place
  it in Primary or Supporting, let it lead the target, or package it into a
  standalone skill snapshot. At most one may participate in a host-local trial;
  route the result back to principle cultivation.
- Do not turn a successful local prompt into a general rule without a second
  context or a failure boundary.
- When a project-wide agent-work failure has not yet been localized to a skill,
  let an agent-workflow diagnostic owner identify the surface first when one is
  available. Once evidence selects skill trigger, expression, context layering,
  or behavior evaluation, this skill owns that work; do not keep both methods as
  parallel coordinators.
- Keep the review surface small enough for a human to inspect: target action,
  selected P-IDs, trigger/boundary, test evidence, and the changed files.

## Completion standard

Treat a skill change as ready only when it has a valid trigger description, a
selected expression team, an explicit non-scope, a layered context shape, and
evidence from an appropriate scenario. If one of these is absent, leave the
skill as a proposal or report the gap instead of asserting that the agent will
perform better.

When a nominated alternate participated, readiness also requires a separately
labeled trial result. A successful skill does not by itself prove the candidate
caused the success; report `overlap` or `inconclusive` unless the baseline
comparison isolates its decision delta.
