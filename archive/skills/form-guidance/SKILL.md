---
name: form-guidance
description: >-
  Decide the smallest truthful form for a repeated problem before designing its
  implementation: no new artifact, local instruction, durable decision record,
  skill, runtime, projection, or bounded campaign. Use when asking "should this
  be a skill?", "what form should this take?", "how should this capability
  exist?", "is this another agent/runtime?", "should we add a command or
  document?", or when a generic workflow would hide an authority, inheritance,
  or recurrence decision. Do not use for ordinary implementation after the form
  is already accepted.
argument-hint: "[audit | decide]"
---

# Form Guidance

## Principle expression

**Primary:** P16
**Supporting:** P04, P14, P15

## Scope

Own one judgment: **what is the smallest form that lets the real actor make the
required recurring decision without creating false authority, duplicate memory,
or unnecessary machinery?**

Do not begin from a preferred noun such as skill, agent, runtime, dashboard, or
plan. A form decision answers *how a named domain judgment may exist*, never
what that domain judgment should recommend. Do not implement the chosen form,
organize its paths, change the Sequence, define a domain methodology, or accept
its result. Route those responsibilities after the form decision and stop.

## Principle source

Use a host Sequence and its matching interpretations when the host declares
them. Otherwise use this skill's read-only fallback in `references/sequence.md`.
Read only P16, P04, P14, and P15 for this
skill's stable lineage. A host task may select a different current lead, but it
does not create co-primary doctrine.

## Start

State the form question before proposing an artifact:

```text
Actor and next decision:
Observed recurring action gap:
Concrete evidence:
What must survive this session:
Who may verify and commit:
Strongest keep-as-is case:
```

If the action gap is one-off and no later actor must recover it, return a
conversation result. Do not manufacture a durable form.

## Core method

1. **Ground the concrete need.** Read the accepted design, actual runtime, and
   evidence of repeated action or decision failure. Separate observed facts from
   the proposed explanation. Name the actor whose next judgment is blocked.
2. **Name the principal form contradiction.** Use P04 to identify the mismatch
   whose resolution changes the available actions: for example, a durable
   decision hidden in chat, a runtime capability exposed only as internal JSON,
   or a recurring judgment re-invented every session. Keep secondary constraints
   explicit.
3. **Compare the keep-as-is case with candidate forms.** Use
   [the form matrix](references/form-matrix.md). A candidate must own a distinct
   decision, lifetime, authority boundary, or runtime capability. It may be a
   stack: a skill can prepare a decision artifact; a runtime can retain evidence;
   a CLI can project either. Do not collapse those roles into one “central” form.
4. **Test authority and reconstruction.** For each candidate, name its source,
   verifier, committer, and whether it can be rebuilt. A view, summary, index,
   dashboard, or generated plan is a projection unless explicitly promoted to a
   governed source. P14 forbids giving it fact authority merely because it is
   convenient.
5. **Choose the minimum valid form and owner.** Use P15: retain only distinctions needed
   to change the blocked decision while preserving hard constraints. Prefer an
   existing owner when it already supplies the gate. Route to
   `skill-engineering` for an agent-facing repeated judgment,
   `artifact-organization` for authority-and-lifetime layout,
   a project design decision for a new runtime capability, and
   `principle-cultivation` for a possible new Sequence meaning. If the selected
   form needs a new domain method, name that owner and its unsolved domain
   question; do not draft its doctrine, plan, or workflow here.
6. **Make the decision actionable.** Return a compact form decision: selected
   form stack, non-selected alternatives, content owner, ownership map,
   smallest next transition, acceptance observation, and what would disconfirm
   it. Use the
   [record template](references/form-decision-record.md) only when handoff,
   approval, or later recovery needs it.
7. **Verify the form, not its prose.** Run an action probe, a boundary probe,
   and a context/authority probe from [evaluation](references/evaluation.md).
   A new form is only supported when the intended actor can use it, it declines
   adjacent non-scope, and no projection silently becomes a source.

## Form boundary

- A **skill** teaches an agent a repeatable judgment at activation time. It does
  not own project facts, long-lived commitments, execution, or human approval.
- A **durable decision artifact** preserves an approved or reviewable judgment
  across sessions. It does not itself execute work.
- A **runtime** owns real execution boundaries, state transitions, evidence, or
  mechanical verification. It is justified only when a document or skill cannot
  provide that capability.
- A **projection** improves access to a declared source and must be rebuildable.
- A **bounded campaign record** coordinates one multi-session transition, then
  is promoted, archived, or discarded. It is not a permanent institution.
- A **new domain method** remains unformed after this Skill selects its carrier.
  Its problem definition, concepts, and decision method belong to its future
  owner; form-guidance records the handoff and does not fill that role.

## Completion standard

The form decision is ready when it names the action gap, strongest unchanged
alternative, selected form stack, authority/source map, smallest next
transition, and a falsifiable probe. If recurring need, ownership, or durable
decision consequence is unproven, retain the current form and record the
uncertainty rather than creating a new skill or system.
