# 029 — Visual Design as an Adaptive Skill

**Status:** implemented and provisionally verified
**Date:** 2026-07-15
**Approved by:** principal

## Observed action gap

The [aesthetic practice pilot](017-aesthetic-practice-pilot.md) established
source-bearing seeds, cases, studies, directions, and human review. The
[project-site pilot](028-project-site-ui-method-pilot.md) then exposed a
repeated agent-action gap across a home page, documentation catalog, and skill
guide: an agent can polish one surface while missing the perceptual relation
that must hold across the whole product. The first guide treatment became an
editorial island; only moving identity continuity into the shared shell made
the pages feel like one place. The observed correction is retained in the
[skill-guide study](../aesthetics/studies/2026-07-14-skill-guide-projection.md).

This is now broader than a site-local instruction. Agents repeatedly need to
shape a direction from a real object and audience, carry that relation through
implementation, and review the artifact in use without confusing a successful
surface treatment with a reusable style.

## Form decision

Create an installable `visual-design` skill with four entry points on
two timescales:

- `cultivate` forms a source-bearing provisional project direction from
  inherited work, direct and adjacent exemplars, cultural sources,
  counterexamples, comparative readings, and named human preference evidence;
- `shape` forms a task-specific Aesthetic Case from the object, audience,
  intended action, existing identity, constraints, contrasts, and review
  question;
- `design` is the common operation that turns content, attention, and one case
  into a coherent artifact or system using the actual
  project stack and available capabilities; and
- `review` inspects the rendered artifact in context, separating mechanical
  validity, perceptual judgment, and human acceptance.

## Name and public entry

The first working name, `aesthetic-cultivation`, described the internal method
but failed as a public action handle: an external user had to ask what it meant
before they could know when to install or invoke it. The name made the
low-frequency cultivation mechanism more visible than the common `design` and
`review` actions.

Three nearby relations were considered:

- `art-direction` preserves cross-surface direction but conventionally suggests
  guidance more strongly than hands-on implementation;
- `visual-direction` names the project-level result but hides ordinary design,
  redesign, and review; and
- `visual-design` names the common action while leaving direction formation as
  one conditional operation.

Use `visual-design`. Its operative boundary is: **organize content and intended
action into coherent visual form for a real audience, inheriting or forming the
project direction needed by the case.** The adaptive method, fixed-style
boundary, and human-acceptance boundary remain in the skill; the name is not
required to carry them all.

Reconsider the name if external users repeatedly route static canvas artwork,
pure UX research, or non-visual functional work here despite the trigger and
boundary description. Do not retain the working name as an alias: one method
has one install and activation handle.

The skill is a method for adaptive visual judgment. It is not a design system,
brand book, component library, visual runtime, style preset, or automatic
aesthetic evaluator. Project-local direction and existing design systems take
precedence; external systems are attributed evidence or implementation aids,
not surface language to copy.

`cultivate` is an infrequent project-formation action, not a mandatory task
preflight. It closes the gap between refusing a portable fixed style and asking
every agent to invent taste from scratch. A project direction is provisional
until representative artifacts and human review support it; established local
direction remains the preferred input to ordinary `shape`, `design`, and
`review` work.

## Built-in reference layer

The portable skill carries a selective
[design-reference index](../../skills/visual-design/references/design-sources/index.md)
and a stable
[content-to-presentation model](../../skills/visual-design/references/presentation-model.md).
The index is fallback context, not a bundled house style. An activation loads
only sources that expose different decisions relevant to its current
contradiction and still prefers a host project's accepted direction.

The first index uses official sources with complementary strengths:
[Apple HIG layout](https://developer.apple.com/design/human-interface-guidelines/layout)
for adaptive content/control hierarchy,
[Linear's redesign account](https://linear.app/now/how-we-redesigned-the-linear-ui)
for product-wide balance, density, and theme stress tests,
[IBM Carbon's grid usage](https://carbondesignsystem.com/elements/2x-grid/usage/)
for content-led spatial structure,
[GitHub Primer color usage](https://primer.style/product/getting-started/foundations/color-usage/)
for primitive/functional/component token layers, and
[GOV.UK layout guidance](https://design-system.service.gov.uk/styles/layout/)
for public-service clarity and bounded reading form. Their palettes,
components, platform conventions, and brand treatments remain non-portable.

Progressive disclosure follows the decision path rather than a fixed file
bundle: `SKILL.md` carries scope, routing, and universal gates; one selected
command carries the active operation; the presentation model loads only when
content hierarchy, attention, layout, or token design is unresolved; a short
source index selects one to three independent source files. A host Sequence
excludes the packaged fallback for that activation. Ordinary design does not
load sibling commands or the concepts reference without a concrete ambiguity.

## Non-fixed-style invariant

The stable method is the relation:

```text
object + audience + intended action + material conditions
  + selected source field + human preference evidence
  -> provisional project direction
  -> content structure and attention path
  -> case-specific relation, hierarchy, and layout
  -> semantic roles and case-specific treatment
  -> coherent system and artifact
  -> observation and human review
```

Palette, type, grid, imagery, density, motion, component shape, and tone are
contingent treatment decisions. They may become project-local direction only
through repeated independent cases and human review. No treatment from the
current Skills site enters the portable skill merely because the site was
accepted as coherent.

## Expression team

- **Primary P16:** the cultivated direction and each artifact's form must let
  the actual audience perceive, judge, or perform the intended action.
- **Supporting P07:** concrete sources are analyzed into decision-bearing
  relations and reconstituted as a new project direction and real artifacts,
  rather than averaged or copied.
- **Supporting P05:** each direction must be regenerated from the concrete
  history, constraints, actors, and state of the case.
- **Supporting P09:** content, controls, context, and recovery signals receive
  attention at the layer where they affect the current human judgment; the same
  layering governs progressive skill context.

P16 remains the stable lineage because the skill ultimately exists to make a
visual form effective for a real practitioner. P07 leads the current revision:
the principal correction identifies a missing movement from concrete admired
work, through comparative abstraction, back to one project direction and its
later concrete expressions. P05 still prevents that direction from becoming a
portable preset. The reference-informed design probe repeatedly selected P09
as its live lead and exposed both visual-attention allocation and skill-context
loading as stable, decision-changing concerns, so P09 replaces P03 in the
standing expression team. Artifact observation remains part of the method but
does not need a habitual seat.

## Ownership and routing

The skill owns project-direction cultivation, case-direction shaping, coherent
visual design, and artifact-in-use review. It does not own:

- project purpose, product claims, or factual source authority;
- naming and verbal articulation;
- accessibility standards, framework APIs, browser automation, or image
  generation capability;
- final aesthetic acceptance; or
- promotion of a local case into a shared direction without repeated evidence
  and human approval.

## Admission evidence

The skill is admitted provisionally when it passes three probes:

1. an action probe produces a usable, case-specific direction and next action;
2. a contrasting-context probe does not reproduce the Skills site's warm
   paper, red-black, editorial-grid treatment without evidence; and
3. a boundary probe routes a non-visual implementation task away from itself.

A fourth formation probe should show that `cultivate` selects sources by the
decisions they expose, produces contrasting directions and a falsifiable
project direction, and does not emit an arbitrary token kit or copy one admired
reference.

A presentation probe should show that the agent begins from content priority
and attention allocation, uses built-in references selectively, derives layout
from those relations, and introduces tokens only for repeated semantic roles.

Without a matched baseline, passing probes establish compatible behavior but
not causal improvement. Reopen or narrow the skill if agents still produce
style presets, if `shape` becomes a mandatory document for trivial work, or if
human reviewers cannot distinguish its output from generic design advice.
