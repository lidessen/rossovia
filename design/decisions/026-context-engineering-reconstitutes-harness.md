# 026 — Context Engineering Reconstitutes Harness

**Status:** adopted
**Date:** 2026-07-14
**Approved by:** principal

## Context

[Decision 005](005-harness-runtime-evidenced-slice.md) corrected the inherited
Harness skill's assumption that familiar instruction files and hooks work across
agent products. The resulting skill established a real recurring gate: project
information must reach an agent through the actual runtime before it can change
the agent's action.

Continued use exposed a remaining form error. The active `harness` expression
combined runtime capability discovery, mandatory L1/L2/L3 placement, durable
continuity artifacts, human review compression, and baseline evaluation. Its
name also conventionally denotes a much broader agent runtime containing loops,
tools, memory, isolation, and evaluation. The skill's distinct judgment was
narrower than its inherited name and process.

## Decision

Replace the active `harness` skill with `context-engineering`.

Its operative definition is:

> For a named agent action, determine which authoritative project information
> must reach the agent, when it must become available, and the smallest
> runtime-evidenced delivery path that preserves source authority.

The skill owns context delivery only. It does not own source content, artifact
authority or lifetime, skill expression, vendor configuration, hooks, memory
stores, retrieval services, agent loops, or acceptance.

### Expression

- **Primary P09:** select information by the moment it changes attention and
  action rather than loading a flat permanent context.
- **P02:** investigate the actual target runtime instead of transferring a
  filename or capability convention from another product.
- **P14:** loaded instructions, summaries, indexes, and retrieved fragments are
  delivery projections and do not silently become sources.
- **P08:** distinguish documented capability, task-specific path evidence, and
  comparative behavior claims.

### Timing and runtime boundary

Before-action orientation, activation-time method, and on-demand detail remain
useful timing questions. L1/L2/L3 is one possible host projection, not a required
three-layer architecture. Each target maps timing to its runtime-native surfaces.

A vendor adapter may implement a selected path after checking current official
documentation. The skill does not embed vendor event names or implement the
runtime. Work Cell may provide evaluation evidence but is not required.

### Routing

| Need discovered during context work | Owner |
|---|---|
| missing or unaccepted domain content | domain design or methodology owner |
| source authority, lifetime, or duplicate record | `artifact-organization` |
| reusable skill trigger or prompt expression | `skill-engineering` |
| vendor hook, memory, retrieval, or runtime behavior | project adapter/runtime |
| context delivery timing, placement, or path verification | `context-engineering` |

## Migration

- The active skill path and command become `skills/context-engineering` and
  `/context-engineering` with `design`, `audit`, and `verify` paths.
- The inherited `init` path is retired; design does not imply installation or
  creation of a harness system.
- Project guidance and active routing use the new operative term. Historical
  decisions, evaluations, and archived evidence retain `harness` where it names
  the object observed at that time.
- No compatibility alias or runtime layer is added. A stale `/harness` reference
  must fail visibly and be migrated rather than preserving the old ambiguity.

## Acceptance

- A context omission routes to one delivery judgment without transferring
  doctrine, lifetime, or runtime ownership.
- A target can use actual runtime surfaces without adopting L1/L2/L3 labels.
- A bounded audit can finish in conversation; durable evaluation is conditional
  on handoff, approval, or later revision.
- Direct path evidence may support delivery; a controlled baseline is required
  only for a comparative improvement claim.
- An action probe and boundary probe distinguish context delivery from source
  authoring, artifact organization, skill engineering, and runtime implementation.

## Reopening observation

Reopen the form if repeated real tasks cannot separate context delivery from
runtime implementation, or if `context-engineering` repeatedly duplicates an
existing owner's decision instead of producing an independently useful placement
or path-verification result.

## Implementation evidence

The [rewrite action, boundary, and inherited/new probes](../../regeneration/evaluations/2026-07-14-context-engineering-rewrite-probe.md)
support the narrower delivery judgment and routing boundaries. They include one
task-specific Codex prompt-path observation but no matched ordinary-task baseline;
comparative behavior improvement therefore remains unproven.
