# 002 — Principle-First Skill Regeneration

**Status:** adopted
**Adopted:** 2026-07-10

## Context

The existing skills are useful evidence, but their present names, command
surfaces, directory conventions, and inter-skill stack describe a historical
concrete arrangement. Treating that arrangement as the target would merely
decorate old skills with P-IDs. The collection instead needs to regenerate its
skills as downstream expressions of the sequence, without losing functions
that the existing corpus has already discovered.

## Decision

Use a four-stage regeneration movement:

1. **Inventory the concrete.** Record each current skill, its artifacts,
   triggers, decisions, dependencies, and observed problems with source links.
   Do not modify its name or role during this stage.
2. **Abstract the function.** Separate the user contradiction and durable
   function from contingent form: skill name, command shape, file layout,
   historical layering story, and cross-reference wording.
3. **Select and regroup.** For each abstract function, decide whether it is
   retained, merged, retired, or better expressed as a command, reference, or
   project-local practice. The decision must identify a primary P-ID, up to
   three supports, and a distinct decision gate that another retained skill
   cannot already own.
4. **Regenerate the concrete.** Create the selected skills afresh from the
   target architecture; migrate source material only when it serves the new
   expression. Retire superseded forms explicitly after verification.

The method is an expression probe for adopted P07: concrete forms are analyzed
into source-linked determinations before they are reconstituted as a new
concrete architecture.

## Required artifacts

- [Concrete skill inventory](../../archive/regeneration/skill-inventory.md) —
  the source-linked concrete inventory.
- [Cross-project skill inventory](../../archive/regeneration/workspace-skill-inventory.md)
  — method-versus-runbook classification.
- [Function map](../../archive/regeneration/function-map.md) — abstract
  functions, contradictions, evidence, overlaps, and candidate principle
  lineages.
- [Target architecture](../../archive/regeneration/target-architecture.md) —
  retained skill families, their boundaries, and migration decisions.

## Selection constraints

- No current skill name has preservation privilege.
- A retained skill must own a distinct trigger, judgment, and artifact or
  decision gate. Otherwise merge it, demote it to a command/reference, or
  retire it.
- Do not create a new skill merely to expose another principle. A principle can
  be expressed as a supporting lineage, a decision gate, or a project-local
  practice when that is sufficient.
- Preserve source links during abstraction; a legacy form is evidence, not
  disposable noise.
- Do not rewrite a skill before the target architecture has an explicit human
  acceptance. This prevents locally attractive rewrites from silently deciding
  the collection's architecture.

## Consequences

- The skills become expressions of one semantic source rather than an inherited
  stack that happens to cite the sequence.
- Existing implementation detail is assessed by its decision value, not by the
  cost already spent writing it.
- The first deliverable is a reviewable map, not a burst of rewritten prompts.

## Human approval

Approved 2026-07-10 — regeneration movement executed: 4 skills regenerated (003–006), evaluation records produced, target architecture named in `design/organization/MODEL.md` → `TARGET.md` → `GAP.md` → `TRANSITION.md` loop.
