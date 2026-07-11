---
name: naming-and-articulation
description: >-
  Choose and place a project, product, or concept name with its smallest useful
  definition and explanation. Use when naming a project or shared concept,
  defining terminology, clarifying status words, deciding where documentation
  belongs, or asking "what should we call this?" / "how should this be
  explained?" / "命名" / "术语" / "定义" / "说明". Do not use for branding,
  ordinary copyediting, one-off prose, or a Sequence change.
argument-hint: "[audit | name | explain]"
---

# Naming and Articulation

## Principle expression

**Primary:** P06
**Supporting:** P07, P16, P15

## Scope

Own one judgment: **given a concrete object, audience, and blocked decision,
what is the smallest name, operative definition, explanation, and source
location that makes the relevant relation usable without mistaking the label for
the object or creating needless taxonomy?**

A name is a handle, not a claim to exhaust essence. A definition is a decision
boundary, not a dictionary flourish. An explanation reconnects the boundary to
evidence and a reader's next action. Do not use this Skill for branding,
stylistic polish, ordinary variable naming, a one-off sentence, generic article
writing, skill-expression engineering, or a change to Sequence meaning.

## Principle source

Use a host Sequence and matching interpretations when present. Otherwise use
this package's read-only fallback under `references/sequence-snapshot/`. Read
only P06, P07, P16, and P15 for this skill's stable lineage.

## Start

State the concrete naming problem before suggesting words:

```text
Object and source evidence:
Actor, audience, and next decision:
Current terms and nearest confusing alternatives:
What must survive this session:
Strongest case for leaving it unnamed or local:
```

If one actor can finish the task without a shared distinction or later recovery,
keep the answer local. Do not manufacture a term, definition, glossary entry,
or documentation page.

## Core method

1. **Recover the relation before the word.** Read the actual object, history,
   owner, and evidence. Name the relation or boundary that changes an action;
   do not infer it from an attractive label, directory, or metaphor.
2. **Find the contrast.** State what the proposed term includes, excludes, and
   would otherwise be confused with. If no practical contrast exists, stop: a
   synonym or private phrase does not warrant a shared name.
3. **Generate few candidates from the relation.** Prefer a name that is compact,
   pronounceable in the host register, and durable across incidental
   implementation changes. A provisional name is allowed when action needs a
   handle before the object is fully known; mark its uncertainty rather than
   presenting it as final doctrine.
4. **Write only the needed layers.** Use [the articulation layers](references/articulation-layers.md):
   a name; an operative definition; an explanation; and, only if necessary, a
   projection. Every layer must enable a distinct reader action or recovery.
5. **Place the explanation with its authority.** A P-ID reading belongs in its
   interpretation; an architectural boundary in design; an agent method in the
   owning Skill or direct reference; an implementation detail near the code.
   A README index, glossary, or generated map points back to those sources and
   cannot become a second authority.
6. **Test action and stopping.** Ask the intended actor to distinguish the term
   from its nearest alternative and make the blocked decision. Remove a layer or
   term that does not change that decision. Route a new semantic consequence to
   `principle-cultivation`, a carrier choice to `form-guidance`, skill-expression
   wording to `skill-engineering`, and artifact placement to
   `artifact-organization`.

## Boundaries

- Do not make “the real name” a substitute for evidence. Names may be revised;
  their sources, status, and decision boundary must remain visible.
- Do not add a global glossary because several local terms exist. Create a
  rebuildable index only when cross-source discovery is the proven problem.
- Do not define a term at every layer. Put the canonical operative definition at
  its owning source; use shorter linked explanations elsewhere.
- Do not turn a metaphor, translation, marketing phrase, or generated summary
  into doctrine. It is an audience projection unless separately governed.
- Do not change the Sequence or interpret a P-ID beyond its source line. Route
  that question to `principle-cultivation`.

## Completion standard

The result is ready when it states the object, audience, contrast, chosen
name, operative boundary, source placement, and a disconfirming observation.
It is supported only when an action probe shows the reader makes the intended
distinction, a boundary probe declines a request with no shared decision, and a
context/authority probe preserves source and projection boundaries.
