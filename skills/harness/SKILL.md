---
name: harness
description: >-
  Design, audit, and verify a project's durable agent context architecture.
  Use when configuring agent instructions, project context, skills, handoff
  artifacts, or context loading; when an agent forgets boundaries or is buried
  in irrelevant detail; or when checking whether a harness actually reaches its
  runtime. Do not use for drafting a one-off prompt or a vendor-specific command
  guide.
---

# Harness Architecture

## Principle expression

**Primary:** P09
**Supporting:** P10, P12, P08

## Scope

Own one decision: can an agent in this project's actual runtime receive the
smallest durable context that lets it make the intended next judgment?

Context is not whatever a familiar file convention claims to load. It is only
context when the selected runtime can discover it at the required moment. Map
that capability before assigning L1, L2, or L3. Preserve durable knowledge in
artifacts rather than in a session, and keep the human review surface to the
decisions whose failure invalidates the rest.

Do not use this skill for an isolated prompt, generic writing advice, task
planning, agent orchestration, or a tool-specific runbook. Use a local
instruction for a one-time prompt and a project adapter for vendor mechanics.

## Principle source

Use a host Sequence and interpretations when the host declares them. Otherwise
use this package's read-only fallback under references/sequence-snapshot. It
contains the full one-line Sequence and the readings for P08, P09, P10, and
P12, so this skill remains usable when installed alone. The fallback is a
versioned projection, not a source to edit from a target project.

## Dispatch

- With init, read and follow commands/init.md.
- With audit, read and follow commands/audit.md.
- With verify, read and follow commands/verify.md.
- With no argument, identify whether the stated problem is a context-runtime
  architecture gap. If it is, start with the capability map and choose audit or
  init. Otherwise route to the smaller form.

## Core method

1. **Map the runtime.** Establish which agent surfaces, instruction files,
   skill locations, hooks, and persistence mechanisms are actually discovered
   in this environment. Mark an unverified capability unknown; do not infer it
   from another tool's convention. Use references/runtime-capability-map.md.
2. **Place decision-relevant context.** Put stable orientation that the runtime
   demonstrably loads before action in L1. Put activated methods and current
   project shape in L2. Put volatile detail and raw material in L3. A pointer
   is better than duplication when the detail is not needed for the next
   judgment.
3. **Make continuity explicit.** Name a durable, discoverable state and
   evaluation record for a future agent, with a pointer from the activating
   layer. Do not make a conversation transcript or a UI view the only memory
   of a decision or its verification.
4. **Expose the review skeleton.** Show the runtime map, layer map, highest
   decision-changing gaps, and human decisions before detailed migration notes.
   Details remain reachable on demand rather than becoming mandatory review.
5. **Verify the path.** Test one real task in which the agent must discover the
   context and take the intended action, one nearby task that should not load
   the harness, and the actual loading path. Use references/evaluation.md.

## Completion standard

Call a harness **architecture-ready for evaluation** when its runtime capability
map is evidenced, its layer map names why each artifact is loaded when it is,
and its durable state and planned evaluation record are discoverable.

Call harness behavior **supported** only when a paired action comparison, a
boundary probe, and a context-path observation have retained evidence. Without
those runs, report an explicit verification gap rather than calling the harness
ready or improved. A parsed configuration or polished instruction proves
neither state.
