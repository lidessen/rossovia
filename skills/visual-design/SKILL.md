---
name: visual-design
description: >-
  Design, redesign, or review real interfaces, documents, illustrations, and
  related visual systems from their content, audience, intended action, and
  existing project direction. Use when creating UI, improving visual hierarchy
  or coherence, reviewing a rendered artifact, or when "the page works but
  feels generic/inconsistent". Also use to establish a continuing project's
  visual direction from selected references when none exists, or to turn an
  ambiguous style cue into provisional guidance for later design. Triggers include
  "design this interface", "redesign this page", "review the UI", "make these
  pages feel unified", "the direction is right but the components feel generic",
  "polish/refine the interface details", "align this logo or illustration with
  the product", "art direction", and "审美/视觉设计/组件细节/插画或品牌视觉统一/确立风格". Do not use
  for a purely functional code fix, naming task, or automatic aesthetic
  acceptance. Never impose a portable fixed style.
---

# Visual Design

## Principle expression

**Primary:** P16
**Supporting:** P07, P05, P09

## Scope

Own one recurring judgment: **how should an agent organize content and action
into coherent visual form for a real audience, while inheriting or cultivating
the project direction needed to keep related artifacts recognizable?**

Visual design is not surface styling. It makes content relations and intended
actions perceptible through hierarchy, layout, type, color, imagery, motion,
and interaction. Cultivate judgment rather than imposing a house style: no
treatment becomes a portable default merely because one project accepted it.

Use a project-declared visual direction or design system when one exists. This
skill may interpret and extend it for the present case; it does not replace it.

## Principle source

First detect whether the host declares a Sequence and matching interpretations.
When it does, read only host P16, P07, P05, and P09; do not inspect the packaged
snapshot. Only when the host lacks that source may you use the read-only fallback
in `references/sequence.md`. A live task may select a different
current lead, but it does not create co-primary doctrine.

## Domain vocabulary

- **Direction:** a generative stance with contrasts and a negative boundary,
  not a palette preset.
- **Style cue:** a person's provisional phrase for a desired perceptual family,
  such as “hand-drawn” or “editorial”; it opens inquiry and is not yet a
  direction, preset, or specification.
- **Visual language:** a provisional project-local relation between direction
  and formal tendencies—gesture, shape, rhythm, material, type, imagery, and
  motion—plus how strongly they appear across different surfaces.
- **Attention path:** the intended order and relative force of orientation,
  primary action, supporting judgment, context, and recovery signals.
- **System:** the smallest shared invariants that keep related surfaces
  recognizable while their functions differ.
- **Token:** a named repeated semantic decision with at least two independent
  consumers or a declared theme/context substitution.
- **Treatment:** the local color, type, spacing, imagery, depth, motion, and
  component choices that embody the direction.
- **Detail grammar:** the project-local relations among component anatomy,
  edges, spacing, depth, marks, states, and motion that let ordinary elements
  support the direction without becoming its primary source.

## Governing dependency

```text
content and actions -> attention path -> visual hierarchy and layout
project relation and sources -> provisional visual language
                         \       /
                   surface expression allocation
                         -> component expression and semantic roles
                            -> repeated tokens where justified
                            -> case-specific treatment
                               -> observed comprehension and action
```

Color, type, spacing, grid, depth, imagery, and motion allocate attention and
express content relations. Do not choose them independently and force content
into the result. A token retains a repeated semantic decision after its role is
known; it does not discover the role.

## Start

Establish only enough state to select the operation:

```text
Object and artifact state:
Audience and intended action:
Existing direction or design system:
Named style cue or supplied references, if any:
Requested outcome: establish | direction-only | design | refine | review
Available production and inspection capabilities:
```

If the request and artifact state already identify the operation, proceed
without asking the user to choose an internal stage. A small local adjustment
inside a clear system remains ordinary development work.

## User interaction

- Treat operation names as internal routing controls, not vocabulary the user
  must learn. Accept an ordinary request such as “redesign this page” or
  “review why these docs feel inconsistent” and infer the smallest path.
- When the user asks for a change, inspect and modify the real artifact, then
  verify the affected experience. When the user asks only for critique or
  review, return evidence and a smallest revision without editing unless they
  also authorize a change.
- Inherit an existing project direction or design system without requiring a
  setup exercise. Use `cultivate` only when a continuing project lacks one and
  forming it is part of the requested outcome.
- Ask only for a decision that materially blocks safe progress. Present the
  relevant options, tradeoff, and recommendation rather than asking the user to
  discover the choice space.
- Use the production, browser, rendering, accessibility, and image capabilities
  supplied by the host agent. State a missing capability instead of replacing
  real inspection or implementation with prose.

## Dispatch

Select exactly one operation before loading a command; operations are not
phases to combine. Once `refine` fits, treat the accepted direction and main
structure as inputs and load only `commands/refine.md` plus
`references/component-expression.md`. A discovered structural defect ends that
path and is reported for rerouting rather than loading a sibling command.

Common:

- `design` — read `commands/design.md` for a real create, redesign, or
  visual-system task.
- `refine` — read `commands/refine.md` when the direction and main structure
  are sound but recurring components and interface details do not yet embody it.
- `review` — read `commands/review.md` for an existing rendered artifact.

Less frequent:

- `cultivate` — read `commands/cultivate.md` to establish a continuing
  project's provisional direction.
- `shape` — read `commands/shape.md` when a direction or Aesthetic Case is
  required without implementation, including when a named style cue must be
  expanded into guidance for later agents.

With no argument, infer the smallest matching operation. Default to `design`
for a requested change and `review` for critique.

## Progressive disclosure

Load this file and the selected Sequence interpretations first. Then load
exactly one command:

| Operation | Required next context | Conditional retrieval |
|---|---|---|
| `design` | command, host content/direction/system | component-expression reference when a direction must be realized across recurring interface elements; visual-language reference when a style cue remains unresolved or provisional guidance must be translated across surfaces; presentation model when content hierarchy, attention, layout, or a token system is unresolved; visual-asset production when a logo, icon, illustration, or motion asset is a primary object; source index and 1–3 detail files only when local interface guidance is insufficient |
| `refine` | command, host direction/system, rendered evidence, component-expression reference | shadcn reference when `components.json` identifies shadcn; report a route change when structure, direction, or a primary production asset must be reconsidered |
| `review` | command, owning direction, rendered evidence | presentation model only for an attention/hierarchy diagnosis; visual-asset production only when reviewing a production visual asset; never the source index by default |
| `cultivate` | command, presentation model | visual-language reference when a named style cue or expressive cross-surface relation is material; visual-seed index and selected cards when the host source field lacks inspectable visual contrast; design-source index only when formation or system evidence remains insufficient |
| `shape` | command, host content/direction, presentation model | visual-language reference when a style cue is ambiguous or later agents need a cross-surface guide; visual-seed index and exactly two selected cards for the first direction pass when no supplied or inherited visual source grounds the cue; one expressive-process source only when the origin or testing of a relation remains material; concepts only when terms beyond the vocabulary above are genuinely conflated |

The paths above are complete for routing; do not list the skill directory when
the operation is known. Never load sibling command files to complete a formal
sequence.

## Core method

Whichever operation is selected:

1. Begin with owning content, the actual audience action, inherited direction,
   and material constraints; distinguish observed facts from inferred taste.
2. Allocate attention before choosing layout or treatment. Balance means
   unequal emphasis proportional to the user's current decision, not equal
   visual weight.
3. When the direction remains unresolved, treat a named style as a cue to
   expand, compare, and situate. When an accepted direction exists, inherit it
   without reopening style formation merely because treatment is incomplete.
4. When forming or reopening a direction, use visual seeds to expose choices
   and process sources to understand how a relation was formed or tested. State
   the decision each source changes and what must not be copied. Prefer host
   sources; built-in references are fallback context. Do not retrieve them for
   implementation inside an accepted direction.
5. Translate the direction into the relevant details of recurring components
   and states. Let those details support content, attention, and identity; do
   not let a checklist of radii, shadows, spacing, or icons become the design.
   When the treatment remains aesthetically underdetermined or a prior polish
   attempt was rejected, compare a small number of relation-level rendered
   candidates against one fixed baseline before changing shared production
   primitives. Do not turn serial value tuning into a design method.
6. Derive tokens from repeated semantic roles. Admit one only when it has at
   least two independent consumers or a declared theme/context substitution;
   otherwise keep the value local. Raw values, trends, and component kits
   cannot establish content priority.
7. Inspect the real artifact across representative content, states, themes, and
   viewports. Mechanical checks admit work to human aesthetic review but cannot
   accept it.

## Boundaries

- Do not infer brand authority, product claims, or factual content from visual
  work. Route naming and articulation to its owning method.
- Do not prescribe a universal palette, font stack, grid, component language,
  motion system, or named visual trend.
- Do not copy an external design system's surface or treat the built-in seed and
  source indexes as a canon.
- Do not claim image generation, browser operation, rendering, or accessibility
  verification unless the runtime supplies it.
- Do not turn taste into deterministic lint; the designated human owns
  aesthetic acceptance.
- Do not make `cultivate → shape → design → review` mandatory. Enter at the
  unresolved judgment and stop when its acceptance condition is met.

## Completion standard

- `cultivate`: source field, comparative readings, human preference evidence,
  provisional direction, negative boundary, and disconfirming cases are clear.
- `shape`: content, attention path, relation, contrasts, direction, unknowns,
  negative boundary, and review question can guide production.
- `design`: a coherent real slice preserves the intended content hierarchy and
  attention path, carries the direction through its relevant component details,
  uses justified semantic roles, passes relevant checks, and is ready for human
  review.
- `refine`: the leading detail mismatch is corrected across representative
  components and states without disguising a structural defect or making
  supporting details compete with the content.
- `review`: observations, attention mismatch, owning layer, smallest revision
  or no-change case, and human acceptance question are explicit.
