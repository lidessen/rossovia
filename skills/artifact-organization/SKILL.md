---
name: artifact-organization
description: >-
  Audit whether a project's artifact layout still expresses its accepted design,
  then apply one smallest safe organization transition when a material gap
  exists. Use for "organize the repo", "组织架构", "根据地", stale project
  structure, source/projection confusion, or campaign residue. Not for ordinary
  file cleanup, system-module design, Sequence change, or skill authoring.
argument-hint: "[audit | transition]"
---

# Artifact Organization

## Principle expression

**Primary:** P06
**Supporting:** P14, P12, P15

## Principle source

Use a host Sequence and interpretations when the host declares them. Otherwise
use this package's read-only fallback under references/sequence-snapshot.

## Scope

Own one decision: **does the carrier's current authority-and-lifetime layout
contradict accepted design, and what smallest organization transition closes
that gap?**

File structure is an expression, not the design. Classify artifacts by role
before moving paths: semantic source, durable evidence, living expression,
process artifact, or projection. Use
[references/artifact-classes.md](references/artifact-classes.md). Read
[references/concepts.md](references/concepts.md) only when the classification
itself is unclear, and [references/base-metaphor.md](references/base-metaphor.md)
only when the user invokes its vocabulary.

## Core method

1. **Read accepted design and actual state.** If no design governs the carrier,
   route to design work instead of inventing organization from folder names.
2. **Audit before changing.** Compare current roles and paths with the accepted
   target. Name one material gap and the strongest keep-as-is case. If no gap
   changes authority, inheritance, repeated action, or rebuildability, stop.
3. **Justify the form.** For every proposed artifact, role, gate, or path
   distinction, name the future decision it changes and the risk of omitting it.
   Merge, make conditional, or omit distinctions without a separate response.
4. **Apply one transition.** After any required approval, execute the smallest
   wave that closes the named gap. Preserve sources and durable evidence;
   regenerate projections from their declared source.
5. **Verify and settle in the same pass.** Check gap closure, source authority,
   recoverable inheritance, and absence of unnecessary residue. Promote stable
   organization into host design; archive or discard process material according
   to whether a later decision needs it.

## Commands

- `/artifact-organization audit` → `commands/audit.md`
- `/artifact-organization transition` → `commands/transition.md`
- No argument → run the read-only `audit` path and report whether a transition
  is warranted.

## Artifact policy

Default to a conversation result. Create one campaign record only when the work
needs durable handoff, approval, or multi-session continuation. That record
contains audit, gap, transition, verification, and disposition together; use
[references/artifact-paths.md](references/artifact-paths.md).

## Conditional boundaries

- A change to semantic authority, public index, or irreversible evidence
  requires the host's designated human approval.
- A missing base charter routes to host design; implementation drift without an
  organization gap routes to design reconciliation.
- Sequence doctrine routes to `principle-cultivation`; skill expression routes
  to `skill-engineering`.
- Do not create a campaign merely to delete noise or make a tree look tidy.

## Completion standard

The accepted design and actual carrier agree on artifact roles and paths; any
executed transition has a recorded acceptance result; required history remains
reachable; and no process artifact survives without a future decision it serves.
