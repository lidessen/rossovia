# 003 — Skill Engineering as the First Regeneration Slice

**Status:** adopted

## Context

The collection needs a first downstream expression that improves agent action
itself: harnesses, skills, and other agent-facing instructions. Generic skill
format guidance is useful source material, but it cannot decide whether a
proposed behavior belongs in a reusable skill, which principles govern it, or
whether the resulting expression actually changes behavior.

## Decision

Create `skill-engineering` as the first regenerated skill. It owns one gate:

> Does this observed agent-action gap require a reusable, testable skill
> expression, and what is the smallest expression that closes it?

Its stable expression team is Primary P16 with P09, P08, and P15 supporting:

- P16 asks whether the form enables its actual agent to act.
- P09 separates always-needed guidance from activated method and on-demand
  detail.
- P08 requires a behavior claim to expose a test that could disconfirm it.
- P15 prevents a new skill, rule, file, or test layer that does not close the
  present gap.

For every target skill, `skill-engineering` forms a separate, temporary
**expression team**: exactly one target Primary P-ID and up to three target
supports, selected from the Sequence and justified by the target's live
contradiction. This team is downstream design work, not a principle-review
committee and never an authority over the Sequence. `principle-cultivation`
remains the sole route for proposing or changing principles.

The skill must test a target's trigger, action path, boundary, and context
load before treating it as a successful expression. If the gap is local,
one-time, tool-specific, or already covered by another skill, it writes a
smaller form or declines to create a skill.

## Consequences

- Harness and agent-engineering skills can now be regenerated from a shared
  method rather than copied from historical prompts.
- Instruction testing becomes a command/reference inside this skill first;
  it does not yet earn a separate `instruction-experiment` skill boundary.
- The broader target architecture remains proposed. This decision authorizes
  only the first `skill-engineering` slice.

## Human approval

Approved in the instruction to first form a Sequence-based skill that writes
and improves other skills on 2026-07-09.
