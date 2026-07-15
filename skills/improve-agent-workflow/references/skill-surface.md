# Improving a Project Skill

Load this reference only after evidence identifies a project skill as the
owning surface. Do not create or rewrite a skill merely because the failing
actor is an agent.

This file is the minimum standalone skill-expression guidance bundled for cases
where `improve-agent-workflow` is installed alone. If the host provides a
dedicated skill-engineering method, route the selected skill work there and use
this file only as a compatibility boundary, not as a second canon.

## Recover the action

State the recurring trigger, actor, required judgment or action, current
failure, source evidence, and observation that would show improvement. Read the
whole target `SKILL.md` plus only the direct command or reference files used by
that action. Check project-level instructions and runtime discovery before
blaming the skill body.

## Inspect four expression layers

| Layer | It should do | Failure signal |
|---|---|---|
| Trigger | let the classifier match the real intent and decline neighbors | users must know a private command, or ordinary work activates it |
| Action | enable the next judgment and concrete action | prose explains the topic but the agent still cannot decide or act |
| Conditional context | supply detail only when it changes the live judgment | hard constraints are buried, or unrelated references load every time |
| Evidence | expose a result capable of changing the deployment decision | format checks or self-report stand in for task behavior |

## Change discipline

- Preserve the target skill's accepted action, Principle expression, and domain
  vocabulary unless evidence shows that its shape—not merely wording—changed.
- Keep trigger signals in frontmatter, the active method in `SKILL.md`, and
  conditional detail in direct references. Do not add an explanatory second
  canon.
- Prefer rewriting the smallest failed layer. Do not use a new command or file
  to avoid fixing an ambiguous core judgment.
- Keep the skill independently usable when that is part of its existing
  contract. Do not introduce undeclared dependencies on this collection.
- When current vendor behavior matters, verify it from the runtime or current
  primary documentation and keep volatile configuration local.

## Behavior probes

1. **Action:** give a fresh agent a representative raw task and only the
   context a normal user would provide. Observe the judgment and artifact.
2. **Boundary:** give it the nearest request that should not activate or should
   route elsewhere. Observe whether scope remains intact.
3. **Context:** verify that the decisive guidance was discoverable and that
   irrelevant detail was not required.

Use the same acceptance condition for baseline and changed runs when claiming
comparative improvement. If an independent run is unsafe or unavailable,
retain the probe and label attribution unproven rather than treating prompt
review as behavioral proof.
