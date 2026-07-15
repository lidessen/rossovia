---
name: context-engineering
description: >-
  Design, audit, and verify how decision-relevant project information reaches an
  agent through the actual runtime. Use when an agent misses a governing
  boundary, receives irrelevant context, cannot discover an instruction or
  skill, or when deciding what should be always available, activated for a task,
  or retrieved on demand. Do not use to author domain knowledge, organize its
  source artifacts, write a one-off prompt, configure vendor hooks, or build an
  agent runtime.
---

# Context Engineering

## Principle expression

**Primary:** P09
**Supporting:** P02, P14, P08

## Scope

Own one judgment: **for a named agent action, which source information must
reach the agent, when must it become available, and what is the smallest
runtime-evidenced delivery path that preserves source authority?**

Context engineering owns delivery, not content. A project source, accepted
design, or domain skill supplies meaning; this skill decides how the selected
agent can discover the relevant part at the moment it changes action. Loaded
instructions, summaries, indexes, and retrieved fragments remain projections
unless separately governed as sources.

Do not assume that a familiar filename, three-layer model, hook, skill directory,
or memory mechanism exists in another runtime. Investigate the actual target.

## Principle source

Use a host Sequence and matching interpretations when the host declares them.
Otherwise use this skill's read-only fallback in `references/sequence.md`.
Read only P09, P02, P14, and P08.

## Start

```text
Target agent, runtime, and decision:
Observed context failure or placement question:
Authoritative source and status:
Current delivery path and evidence:
Moment the information must affect action:
Smallest suspected change:
Observation that would disconfirm it:
```

If the information itself is missing, ambiguous, or unaccepted, route to its
domain owner. Delivery cannot repair absent doctrine or decide what is true.

## Dispatch

- With `design`, read and follow `commands/design.md`.
- With `audit`, read and follow `commands/audit.md`.
- With `verify`, read and follow `commands/verify.md`.
- With no argument, inspect the actual failure and choose the smallest matching
  path. Default to read-only audit when a change was not requested.

## Core method

1. **Name the action and source.** Identify the concrete agent judgment that is
   failing and the authoritative project source that could change it. Separate
   missing content from failed delivery, and source facts from projections.
2. **Map the actual runtime.** Establish which instruction surfaces, skill
   metadata, on-demand resources, retrieval paths, and context-injection
   mechanisms this agent can really use. Mark documented capability, observed
   task loading, and unknown behavior separately. Use
   [delivery capability map](references/delivery-capability-map.md).
3. **Choose delivery timing.** Decide whether the information must be available
   before scoped action, when a method or task is activated, or only when a
   concrete detail becomes relevant. These are timing questions, not mandatory
   L1/L2/L3 containers. Map them to the runtime's native surfaces.
4. **Select the smallest path.** Prefer a discoverable pointer to a named source
   over copied doctrine. Compress only what the target decision can safely lose.
   Keep hard constraints reachable at the moment they govern action; remove
   detail that does not change that action.
5. **Preserve ownership boundaries.** Route source content and acceptance to the
   domain owner, source/lifetime conflicts to `artifact-organization`, skill
   expression failures to `skill-engineering`, and vendor-specific mechanics to
   a current project adapter. This skill may recommend a delivery projection;
   it does not become the source or runtime.
6. **Verify delivery and use.** Run a real task through the ordinary entry
   surface, observe the delivery path where possible, and check the named action.
   Use a boundary task to expose needless loading. Add a controlled baseline
   only when claiming comparative improvement, not merely to prove delivery.
7. **Externalize proportionally.** Return a conversation result for a bounded
   audit. Retain a delivery map or evaluation record only when a later actor must
   reproduce, approve, or revise the placement decision.

## Domain vocabulary

Read [concepts](references/concepts.md) when `context`, `source`, `delivery
projection`, or delivery timing are being conflated. Do not turn its timing
model into a required directory or file hierarchy.

## Completion standard

The result is ready when it names the target action, authoritative source,
actual runtime capabilities, selected delivery timing and path, source boundary,
and disconfirming observation. Claim delivery only from task-specific evidence;
claim improvement only from a comparable evaluation. Unknown runtime behavior
remains explicit rather than being filled by convention.
