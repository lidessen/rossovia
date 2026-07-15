# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Guiding Principles

<!-- lidessen-setup:begin v=2 -->
### Principles over rules

Skills should help agents understand *why*, not just specify *what*. A skill that explains reasoning and principles produces better judgment across novel situations than one that mechanically lists rules. Favor broad principles over rigid prescriptions — give the agent enough context to generalize, not just enough rules to comply. ([Anthropic's constitution](https://www.anthropic.com/constitution): "If we want models to exercise good judgment across a wide range of novel situations, they need to be able to generalize — to apply broad principles rather than mechanically following specific rules.")

### Hierarchical context management

Agent context is finite — place stable orientation before scoped action,
task-specific methods on activation, and volatile detail on demand, then map
those timings to the actual runtime surfaces rather than assuming universal
L1/L2/L3 containers. Keep SKILL.md under 500 lines; split details into supporting
files. See [context-engineering](skills/context-engineering/SKILL.md) for the
delivery method and the [Agent Skills Specification](https://agentskills.io/specification#progressive-disclosure)
for the underlying progressive-disclosure surface.

### Design for finite human bandwidth

Agent throughput keeps rising; human review capacity doesn't. When designing a skill or shaping any output that lands in front of a human, treat the output like code architecture: humans review the skeleton (the 20% whose failure invalidates the rest), agents own the details within, and details should be cheap to throw out without disturbing the skeleton. Generalizes design-driven's 30/70 to all agent-human collaboration. See the [P10 interpretation](principles/interpretations/P10.md) for the active source-bound reading.

### Principal contradiction first

When a task has many decisions or moving parts, agents drift unless something forces sequencing. Identify the *principal contradiction* — the load-bearing decision whose resolution changes the shape of all downstream work — and lock it before drafting details. Operational test (cascade): for each candidate, ask "if this is wrong and the rest is right, does the rest still hold?" If no, it's principal; lock it first. If yes, it's secondary; defer. The same logic recurs across this repo at different layers — design-driven's 30/70 (skeleton vs flesh), goal-driven's General Line (destination before path), reframe's 3-5 abstract functions (essence before shape). This principle adds the *execution layer*: within a single task, locate the load-bearing decision before drafting downstream artifacts. Roots in Mao's [On Contradiction](https://www.marxists.org/reference/archive/mao/selected-works/volume-1/mswv1_17.htm) — the principal contradiction's existence and development determines the form of the others; grasp it and "纲举目张" follows. Re-evaluate at transitions: once the principal is resolved, the next layer's contradiction may become principal.
<!-- lidessen-setup:end -->

> The guidance between the markers was projected from [`archive/skills/setup-lidessen-skills/references/cross-cutting-principles.md`](archive/skills/setup-lidessen-skills/references/cross-cutting-principles.md) via the archived `setup-lidessen-skills` adapter. Edit that projection source and sync the markers here manually until a successor host-integration expression exists.

## Project Overview

This is a collection of agent skills — reusable methodology plugins for AI-assisted development. Skills are installed into a project and invoked via slash commands (e.g., `/design-driven`).

## Principle Sequence

`principles/SEQUENCE.md` is the collection's only semantic root of core principles. It contains one stable, unexplained principle per line. `principles/interpretations/P<id>.md` is that P-ID's living, source-bound reading: it reduces agent interpretation drift but cannot redefine or extend the source line. Skills and target-project guidance are downstream expressions.

### Source-bearing artifacts

Research, interpretations, proposals, candidates, and review records preserve
provenance as readable inline Markdown links at the claim they support. Prefer a
descriptive source title linked to the direct primary source; link repository
evidence to the most stable file heading or artifact anchor available. A
detached bibliography may supplement these links but must not replace them.
`principles/SEQUENCE.md` is the exception: keep its one-line entries free of
citations and explanation.

When creating or materially updating a skill:

- Read the sequence first and record exactly one Primary P-ID plus up to three Supporting P-IDs in `## Principle expression` near the top of `SKILL.md`.
- Then read only the corresponding `principles/interpretations/P<id>.md` files; do not load the entire interpretation layer by default. If a proposed interpretation adds a new decision consequence that its source line cannot bear, create a sequence candidate rather than extending the interpretation.
- Let the skill's decision gates, artifacts, and verification make that selection concrete; do not copy explanations of the principles into SKILL.md.
- A sequence-dependent skill must remain usable when installed alone. Bundle a versioned, read-only Sequence snapshot under direct references: include the full one-line sequence and the interpretations needed by its runtime selection. Generate snapshots with `python3 scripts/sync-sequence-snapshot.py`; do not hand-edit packaged snapshot files. Prefer a declared host Sequence when present; otherwise use the snapshot. A task may fetch a verified newer comparison on demand, but never edits the packaged snapshot or turns it into a second canon.
- Keep new project-local practices local. Propose a sequence candidate only when a principle is cross-context, decision-changing, and cannot be reduced to existing P-IDs.
- Preserve a durable, source-bound inquiry in `principles/research/` before a
  new candidate when the question is still open. Research has no P-ID or semantic
  authority; it may conclude `no-proposal`, and candidate/review gates recheck it.
- Use `principle-cultivation research` for durable inquiry (`no-proposal` is
  valid), `propose` only when the candidate gate passes, and `review`/`adopt`
  for human-gated Sequence change. The deprecated `extract` path still creates
  candidates when the gate passes. Never silently create a second canon.
- Keep only pending or incubating records in `principles/candidates/`. After human adoption, move the record to `principles/adopted/`; it remains evidence but no longer competes as an active proposal.
- Treat the sequence as the central committee and each skill as a durable working team: its Primary P-ID is the skill's stable lineage and its Supporting P-IDs are habitual members. Each activation selects one current lead for the task's principal contradiction; it may differ from the lineage, but never creates co-primary doctrine. The standing committee is a governance projection, never a second semantic source.
- A human-nominated alternate candidate may join one activation only as a separately labeled trial. It never becomes Primary, Supporting, current lead, a review-team seat, or portable lineage; record its baseline, decision delta, disconfirming observation, and outcome in the candidate record.
- For a sequence addition, revision, or retirement, use `principle-cultivation review` to form a temporary team: a lead, standing liaison, direct comparators, and a preservation seat that makes the strongest case for leaving the sequence unchanged. Select 3–5 seats with reasons; do not convene every principle by default.
- Team reports are review evidence, not votes or semantic authority. Record the selected P-IDs, roles, overlap and boundary findings, and unchanged-sequence alternative. Human approval is the only adoption authority.
- Interpretations are licensed derivatives, not a second canon: they may clarify, narrow a misreading, or improve source grounding, but a new principle, boundary that changes decisions, or source-line revision follows candidate review and human approval.
- No skill is a mandatory preflight. `attention-driven`, when installed, is an optional analytical lens for attention-allocation problems, not a required workflow step; select it only when it fits the task's principal contradiction.

### Human decision handoffs

When a material choice belongs to the human principal, do not ask for bare
approval or make them reconstruct the option set. Present the recommendation,
two to four consequential choices, each choice's immediate authorized result,
main tradeoff or reopening signal, and a compact reply key. Use the project's
[Decision Brief](design/operations/DECISION-BRIEF.md) when it exists. The brief
is a projection for human action; it never approves, merges, expands scope, or
turns silence into consent.

MIT licensed, maintained by Lidessen.

## Repository Structure

```
skills/
  <skill-name>/
    SKILL.md           ← Skill definition (frontmatter + main prompt)
    commands/           ← Subcommand instructions dispatched by SKILL.md
    references/         ← Reference material loaded on demand
    scripts/            ← Executable code (if needed)
    assets/             ← Templates, images, data files (if needed)
```

Each skill is a self-contained directory under `skills/`. The `SKILL.md` file is the entry point — its YAML frontmatter defines the skill's name, description, and argument hints, while the markdown body is the prompt that the agent executes when the skill is invoked. Subdirectories follow the [Agent Skills Specification](https://agentskills.io/specification) conventions; only create the ones the skill actually needs.

## Skill Format Specification

Skills follow the [Agent Skills Specification](https://agentskills.io/specification). Also see [Claude Code skills docs](https://code.claude.com/docs/en/skills).

A `SKILL.md` has two parts:

1. **Frontmatter** (`---` delimited YAML): `name`, `description` (used for trigger matching), and optional fields (`license`, `compatibility`, `metadata`, `allowed-tools`).
2. **Body** (markdown): The actual instructions Claude follows. May dispatch to sibling `.md` files based on arguments.

The `description` field is critical — it determines when the agent auto-triggers the skill. It should list concrete trigger phrases and use cases.

## Writing and Editing Skills

- Keep skill prompts methodology-focused, not implementation-focused. Skills teach Claude *how to think about a task*, not specific code to write.
- A skill is an expression of selected sequence principles, not an independent source of doctrine. Preserve its `## Principle expression` selection unless the skill's shape has changed.
- The body of SKILL.md is a prompt, not documentation. Write it as instructions Claude will follow, not as a reference humans will read.
- Subcommand files in `commands/` should be self-contained instructions — SKILL.md dispatches to them, they don't reference each other. Reference material goes in `references/`.
- Frontmatter `description` acts as the trigger classifier and shares an *aggregate* budget — Codex (and any harness following the [Agent Skills spec](https://developers.openai.com/codex/skills)) caps the combined skill list at ~2% of the context window, or ~8,000 chars when unknown, and tail-truncates descriptions when over budget. Two consequences: (a) **front-load** the key use case and trigger phrases so the value still matches even if its tail is clipped — treat methodology background, cross-skill relations, and `Args:` notes as tail content that's safe to lose; (b) keep each description compact (rough target: under ~800 chars) so a project with several installed skills doesn't push the list over the cap. Prefer a single-line YAML string; if readability really suffers, use the *folded* form (`description: >`), which still parses to one logical line. Avoid the *literal* form (`description: |`), which preserves line breaks and fragments triggers across short lines. Long prose and arg details belong in the SKILL.md body, not the frontmatter.
- When referencing another skill, use concept references: describe the *goal* first, then mention the skill as one way to achieve it. E.g., "Set up architectural documentation for the project — the design-driven skill can help with this." This keeps the skill functional even when the referenced skill isn't installed.
