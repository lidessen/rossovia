# 030 — One External Entry for Improving Agent Work

**Status:** implemented and verified
**Date:** 2026-07-15
**Approved by:** principal

## Concrete need

The principal repeatedly installs selected skills into existing projects,
including company repositories, then asks Codex to improve a project skill,
agent workflow, context path, tool interaction, or verification practice. The
real actor is an agent operating inside that target repository. Its next
decision is not merely how to edit a `SKILL.md`; it must first determine which
part of the project's agent-facing work system actually owns the observed
failure.

The current collection exposes precise owners after that diagnosis:
[`skill-engineering`](../../skills/skill-engineering/SKILL.md) for skill
expression, [`context-engineering`](../../skills/context-engineering/SKILL.md)
for source-to-agent delivery, and
[`form-guidance`](../../skills/form-guidance/SKILL.md) for low-frequency carrier
selection. Asking an external user to install and manually route among them
preserves the internal taxonomy but does not provide the requested project-level
entry. The user must already know whether the failure belongs to a skill,
context path, tool, verification gate, or handoff—the judgment that is blocked.

## Form comparison

| Candidate | Decision changed | Why selected or rejected |
|---|---|---|
| Keep the specialized skills only | each method remains exact once the owner is known | rejected as the sole external entry because it assumes the diagnosis and internal role vocabulary |
| Add guidance to `practice-cycle` | a completed practice could route into agent-work improvement | rejected because the generic cycle owns the next practice, not the domain model of an agent-facing work system |
| Expand `skill-engineering` | one familiar skill could edit several agent surfaces | rejected because it would collapse skill expression with context, capability, verification, and handoff ownership |
| Add an installable `improve-agent-workflow` skill | an external agent can localize one observed work failure and repair the smallest owner | selected because the judgment repeats, must survive sessions and repositories, and remains agent-facing guidance rather than runtime state |

The strongest unchanged alternative remains appropriate when the user already
knows the owner: install or invoke the specialized skill directly. The new
entry must route cleanly rather than duplicate their entire doctrine.

## Decision

Create `improve-agent-workflow` as a standalone skill. Its operative definition
is: **given an observed failure or friction in how agents work in a project,
locate the owning agent-facing surface and make the smallest ordinary-path-
verified change that improves the required action.**

The name expresses the external user's action. `agent-experience` names a
quality but hides the intervention; `agent-system-improvement` suggests a broad
redesign; `agent-workflow` alone names a category and is easily confused with
CI or business workflows. The description therefore names the concrete agent
surfaces and explicitly excludes generic CI, business process, and ordinary
product work.

The skill may inspect a task relation across human intent, discovery, guidance,
action capability, verification, and handoff. This is a diagnostic model, not a
required pipeline or new coordinator. It prefers correcting an existing owner
and must not require the target project to adopt this repository's Sequence,
organization model, or terminology.

## Expression team

- **Primary P04:** identify the mismatch whose correction changes the rest of
  the agent action rather than polishing the most visible symptom.
- **Supporting P02:** begin with the target repository, runtime, and observed
  behavior rather than an assumed best practice.
- **Supporting P08:** state an action or boundary observation capable of showing
  the improvement claim wrong.
- **Supporting P15:** change the smallest existing owner that resolves the gap
  while preserving host constraints and authority.

The current task lead is P04. P16 governs this skill's own usable expression
through skill engineering, but it is not a standing domain seat: the new
method's distinctive recurring judgment is localization of the principal
agent-work contradiction.

## Ownership and non-scope

- Host sources own project truth, policy, architecture, and acceptance.
- Project skills and instructions own reusable agent judgments; their details
  load only if the diagnosis selects that surface.
- Context paths own delivery, not content.
- Tools, CLIs, hooks, and adapters own mechanical capability and raw evidence,
  not semantic acceptance.
- Human or designated project verifiers retain commitment authority.
- The skill does not optimize product features, generic CI or business
  workflows, or one-off prose, and it does not create a standing improvement
  organization.

## Minimum transition and acceptance

Ship one `SKILL.md`, two conditional commands (`audit`, `improve`), an
agent-work diagnostic reference, a skill-specific reference, generated OpenAI
interface metadata, and a generated portable Sequence snapshot. Publish it in
the install index and site projection without making either projection a new
source.

Acceptance requires:

- a fresh external project can install only this skill and naturally trigger it
  from an agent-work failure;
- the action probe identifies and changes the existing owner rather than adding
  a generic workflow;
- a nearby product or CI task is declined or routed;
- only the required command and conditional reference are needed for the task;
- the result distinguishes structural validation, behavior evidence, and human
  acceptance.

Disconfirm the decision if ordinary users still need this collection's internal
role vocabulary, the skill repeatedly edits prose instead of the owning
capability, or it becomes an obligatory preflight for normal development.

## Implementation evidence

The implementation and forward-test evidence are retained in
[`2026-07-15-improve-agent-workflow-probe.md`](../../regeneration/evaluations/2026-07-15-improve-agent-workflow-probe.md).
