# Candidate — Form Enables Action

**Status:** adopted
**Observed in:** moniro, skills

## Candidate sequence line

P16｜表达形式须使实践主体能够行动；形式错位，正确内容亦会失效｜辩证法 / 实践论

## Recurrence

- `moniro/.memory/notes/2026-02-01-fourth-reflection.md:42-86, 100-120`
  records a feedback-loop design that described an automatic system which did
  not exist. Recasting the same vision as a direct guide for the acting agent
  removed the false system assumptions and made the guidance usable.
- `moniro/.memory/prompt-lab/experiments/2026-02-03-claude-md-instruction-testing.md:381-404`
  compares two instruction forms for the same review task: a hard-coded method
  missed the actual inconsistency, while a goal-focused form let the agent
  select a useful investigation and find it.
- `AGENTS.md:60-63` distinguishes a `SKILL.md` body, which an agent executes,
  from human-facing reference material, and therefore requires each form to be
  written for its actual reader and action.

## Decision consequence

Before choosing an instruction, document, interface, or protocol shape, name
the acting subject and the action it must be able to take. Evaluate the form by
whether that subject can perform the action under real conditions, not only by
whether the represented content is correct or complete.

## Existing-sequence check

P05 demands concrete analysis, P06 distinguishes essence from appearance, and
P15 selects a minimum valid action. None tests whether the representation that
conveys an otherwise valid judgment gives its intended subject a usable path to
act. This candidate governs that form-to-action fit.

## Counterexample / boundary

The principle does not require every artifact to be an imperative instruction.
An archival record, proof, or audit trail may properly optimize for fidelity
rather than immediate execution. Apply it when an artifact is intended to
shape a subject's action; judge fit against that stated action and subject.

## Expression probes

- Skill authoring: replace a description of an imagined automatic workflow
  with an instruction that lets the agent make the required judgment; test it
  on a real task.
- Product design: prefer a CLI or MCP control surface when an agent must run a
  local operation, and verify completion of that operation rather than visual
  polish alone.

## Human decision

adopted — approved by the human on 2026-07-09.

## Committee review

See [`2026-07-09-p13-p16-expansion.md`](../reviews/2026-07-09-p13-p16-expansion.md).
