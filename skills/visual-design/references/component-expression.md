# Component Expression

Use this reference when an accepted direction must become perceptible through
recurring interface elements, or when a page has the right broad composition but
still feels assembled from unrelated defaults. These details are supporting
expression: they make a design continuous at ordinary scale, but they must not
become its premise.

## Read the detail field as relations

Do not begin by normalizing values. Inspect representative rendered components
and ask which repeated relation carries or contradicts the direction. Scan only
the families relevant to the current surface:

| Detail family | Inspect the relation, not a preset |
|---|---|
| Shape and anatomy | silhouette, corner behavior, edge character, proportions, control and container construction |
| Spacing and rhythm | internal padding, gaps, alignment, density, grouping, repeated vertical and horizontal cadence |
| Separation and depth | border, surface contrast, shadow, overlap, elevation, material continuity, what must remain flat |
| Type inside components | label hierarchy, weight, line height, numerals, truncation, alignment, relation to surrounding text |
| Icon and mark language | family, contour, stroke or fill, optical weight and size, caps and joins, alignment, metaphor clarity |
| State and response | hover, focus, pressed, selected, disabled, loading, success, warning, error, transition and reduced motion |
| Repetition and variation | which differences express role or hierarchy, and which merely look accidental |

The table is a scan surface, not a completion checklist. Retain only dimensions
that affect function, attention, identity, or continuity in this case. A detail
may remain deliberately neutral when stronger expression would reduce legibility,
predictability, density, or trust.

Do not translate a direction metaphor into component props. “Notebook” does not
require hand-drawn icons, irregular corners, paper shadows, or ruled spacing;
“craft” does not require every control to advertise its making. A detail earns
change through an observed contradiction in function, attention, identity, or
continuity—not because a library supplied it or because it could carry more
style.

## Form a component-expression map

Select a small specimen set that reveals the system under real use. Prefer the
most frequent component, the strongest action, an ordinary container or content
unit, navigation or form structure, and an icon-bearing or stateful control when
present. Add a component only when it exposes a different relation or risk.

For each decision record:

```text
Component or repeated role:
Observed mismatch or inherited strength:
Functional and attention requirement:
Direction relation to carry:
Detail families that matter:
Scope: inherited | shared | local | experiment | deliberately neutral
Consumers or states affected:
Disconfirming rendered observation:
```

Begin with the highest-leverage shared relation, not the easiest CSS property.
Incompatible icon construction across adjacent controls may fracture
continuity; uniform corner radii may flatten hierarchy; extra shadow may make
secondary containers compete with the primary action; generous spacing may
destroy the working density of an operational surface. The same property can
therefore require different treatment across roles while still belonging to
one system. Conversely, a coherent neutral icon family may already be the right
supporting treatment for an expressive project.

## Implement through real dependencies

Trace each retained decision to the smallest owning surface: local markup or
style, component variant, shared primitive, semantic token, asset source, or
motion behavior. Promote a decision only when multiple real consumers need the
same relation or a declared context must substitute it coherently. Do not edit a
global radius, shadow, spacing, or icon rule merely because doing so changes many
screens quickly.

Preserve functional contracts. Detail work must not weaken semantic structure,
keyboard and pointer operation, focus visibility, readable contrast, target size,
localization, content extremes, or reduced-motion behavior.

## Verify propagation in the rendered whole

Compare the prior and revised artifact, not just source values. Inspect:

- the strongest designed surface and an ordinary downstream surface;
- default, interactive, disabled, loading, success, warning, and error states
  that materially exist;
- representative content lengths, themes, and viewports; and
- at least one repeated component outside the edited focal region when a shared
  primitive or token changed.

Ask whether the details feel intentionally related, as if resolved by the same
design judgment, while remaining unequal where roles differ. Then ask the
inverse: which supporting detail now attracts attention without changing the
user's decision? Reduce or localize it.

Token consistency, snapshot success, and absence of CSS errors are mechanical
evidence only. Completion requires rendered evidence that the chosen relation
survives representative components and states; aesthetic acceptance remains
with the designated human.

When no rendered evidence is available, stop before treatment selection. Return
only the no-render fallback block defined in `commands/refine.md`; do not rename
its fields, append the ordinary refine result, or fill treatment fields. Do not
convert an inspection plan into fabricated visual findings.
