---
name: improve-agent-workflow
description: >-
  Diagnose and improve how coding agents work in an existing project: project
  skills, AGENTS instructions, prompt and context delivery, tools or CLI
  surfaces, hooks, verification, handoffs, and agent-facing workflow. Use when
  an agent repeatedly misses scope or instructions, the owning agent-facing
  surface is unclear, several surfaces interact, agent experience is costly or
  confusing, or a user asks Codex to improve how agents work in a company
  repository. Start from observed project evidence, change the smallest owning
  surface, and verify behavior through the ordinary agent entry path. If the
  issue is already localized to a skill's trigger, prompt, context layering, or
  behavior evaluation and a dedicated skill-engineering method is available,
  use that method directly. Do not use for ordinary product features, generic
  CI or business workflows, one-off prompt wording, or a process redesign with
  no observed agent-action gap.
---

# Improve Agent Workflow

## Principle expression

**Primary:** P04
**Supporting:** P02, P08, P15

## Scope

Own one judgment: **given an observed failure or friction in how agents work in
this project, which owning surface should change, and what is the smallest
change that improves the required action under the real runtime?**

The object is the project's agent-facing work system, not the whole project.
Possible owning surfaces include a project skill, governing instruction,
context-delivery path, prompt, tool or CLI contract, hook or adapter,
verification gate, and handoff record. Do not optimize product code, team
policy, CI, or business process unless it is directly part of the evidenced
agent action. Do not create a central orchestrator or require the project to
adopt this collection's vocabulary.

Use this skill as the external diagnostic entry when the owning surface is
unclear or several surfaces interact. When the user already names a known owner
and a dedicated method for it is available, enter that method directly. After
diagnosis selects an owner, hand off the domain judgment rather than keeping a
second coordinating layer active.

This package is independently usable. It carries a read-only Sequence snapshot
in `references/sequence.md`; the target project does not need this
repository or its other skills.

## Principle source

Use a host `principles/SEQUENCE.md` and matching interpretations when the host
declares them. Otherwise use this package's snapshot. Before diagnosing the
owner, read the Sequence and exactly the P04, P02, P08, and P15 interpretation
sections from the same source. Do not load other interpretations by default. A
host source governs its project; do not merge it with or overwrite it from the
snapshot.

## Start

Recover the concrete problem before naming a solution:

```text
Target agent, runtime, and ordinary entry path:
Required action or judgment:
Observed failure, friction, or cost:
Source evidence and current owner:
Hard constraints and human authority:
Smallest suspected change:
Observation that would disconfirm it:
```

If no recurring or consequential agent-action gap is evidenced, answer locally
or perform the ordinary task. Do not manufacture an agent-workflow project.

## Dispatch

- When the user asks to inspect, assess, or recommend without authorizing
  changes, read and follow `commands/audit.md`.
- When the user asks to fix, optimize, implement, or improve the project, read
  and follow `commands/improve.md`.
- With ambiguous intent, begin with the read-only audit and stop before edits.

## Domain vocabulary

Read [the agent-work model](references/agent-work-model.md) when `agent
workflow`, `owning surface`, `ordinary entry path`, or the difference among
guidance, capability, verification, and acceptance is unclear. These terms are
diagnostic relations, not a required project architecture or lifecycle.

## Core method

1. **Observe the actual work.** Read the target project's governing sources,
   the relevant agent surface, and evidence from a real or reproducible task.
   Separate the observed behavior from its proposed cause. A polished prompt,
   passing unit test, or agent self-report is not behavior evidence by itself.
2. **Trace the action journey.** Follow the task from human intent through
   discovery, guidance, action or tool use, verification, and handoff. This is
   an inspection model, not a mandatory pipeline. Read
   [the agent-work model](references/agent-work-model.md) only when the owning
   surface is unclear or several surfaces interact.
3. **Find the principal contradiction and owner.** Identify the one mismatch
   whose resolution changes downstream behavior. Distinguish missing or wrong
   domain truth from failed delivery, weak skill expression, tool friction,
   absent verification, and authority confusion. Route truth and acceptance to
   their actual owners; an agent-workflow change must not invent either.
4. **Compare the unchanged case with minimal interventions.** Prefer correcting
   an existing owner over adding another skill, file, hook, tool, or workflow.
   For each additional surface, name the decision it changes and the burden it
   adds. Retain hard constraints and normal project conventions.
5. **Act only within authorization.** For an audit, produce evidence and a
   smallest recommendation. For an improvement, change the smallest owning
   surface and its directly required consumers. If that surface is a skill,
   load [the skill-surface guide](references/skill-surface.md); do not load it
   for unrelated workflow work.
6. **Verify behavior through the ordinary path.** Re-run the representative
   task or the closest safe probe from the same entry surface. Add a boundary
   case that should not trigger or overreach. State what would falsify the
   improvement claim. Structural checks support packaging but cannot replace
   action evidence.
7. **Leave proportional inheritance.** Report the observation, changed owner,
   evidence, residual uncertainty, and human decision still required. Add a
   durable record only when a later actor must recover the reason, boundary, or
   verification result; do not create a standing improvement bureaucracy.

## Ownership boundaries

- **Domain source:** owns what is true or required. This skill may reveal a gap
  but must not silently author policy, architecture, or acceptance criteria.
- **Agent instruction or skill:** owns a reusable judgment at activation. It
  does not enforce runtime capability or accept its own result.
- **Context path:** owns when and how named source material reaches the agent;
  copies and summaries remain projections.
- **Tool, CLI, hook, or adapter:** owns mechanical capability and raw evidence,
  not semantic acceptance. Check the current runtime's documentation rather
  than embedding vendor-specific configuration as universal doctrine.
- **Verifier and human committer:** decide whether durable work is accepted.
  The actor that made the change may prepare evidence but cannot manufacture
  independent approval.

## Completion standard

The work is ready when it identifies the concrete agent action, observed gap,
principal contradiction, owning surface, smallest change or recommendation,
ordinary-path action evidence, boundary evidence, and residual human decision.
If the result only improves prose, adds machinery, or passes a synthetic check
without changing the named action, report it as inconclusive and continue from
the observed failure.
