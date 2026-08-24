# Refining a shadcn Open-Code System

Load this reference only when the project has a `components.json` that declares
shadcn. It adapts the generic visual-refinement method to shadcn's ownership and
comparison surfaces; it does not supply a shadcn look, preferred preset, or
portable component treatment.

shadcn distributes component source into the project rather than retaining
visual ownership in an opaque package. Its documented model combines open code,
composition, distribution, defaults, and project customization
([shadcn introduction](https://ui.shadcn.com/docs)). Treat the installed source
as project code with provenance: neither immutable vendor code nor a blank
canvas for arbitrary local overrides.

## Establish the actual system baseline

Read `components.json`, the declared global CSS file, installed shared
components, their real consumers, and the project's design source. When the
runtime supplies the current shadcn CLI, use its read-only project surfaces
instead of guessing from remembered APIs:

```text
<project package runner> shadcn@latest info --json
<project package runner> shadcn@latest preset resolve --json
<project package runner> shadcn@latest add <component> --diff <file>
```

The current CLI exposes project info, preset resolution, and dry-run/diff
inspection specifically so people and Agents can see the installed system and
incoming component source before mutation
([shadcn CLI v4](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4)). Prefer an
installed official shadcn skill when one is available; otherwise consult the
current official docs for the detected base and component. Do not encode a
remembered Radix or Base UI API into the visual judgment.

Record four distinct facts:

```text
Declared base, style, preset, theme, icon library, and global CSS owner:
Installed primitives and variants relevant to the target:
Local differences from the current registry source:
Rendered relations that are accepted, accidental, or still unknown:
```

A registry diff proves provenance, not visual error. A project may have
deliberately departed from upstream. Conversely, internally consistent
upstream defaults may still under-express the accepted project direction.

## Locate ownership before changing treatment

| Layer | Owns | Does not decide |
|---|---|---|
| preset and theme | semantic color roles, font/icon selection, radius baseline, context substitution | page hierarchy or complete component anatomy |
| shared primitive | component anatomy, built-in variants, slot relations, ordinary states | feature-specific emphasis |
| composition or pattern | how primitives form fields, cards, menus, tables, and flows | unrelated global appearance |
| local consumer | layout, role-specific emphasis, exceptional content condition | repeated system defaults |
| accepted project direction | which relations the system should express and where expression stays quiet | vendor API mechanics |

shadcn theme tokens are semantic background/foreground pairs plus repeated
roles such as border, input, ring, and radius
([theming](https://ui.shadcn.com/docs/theming)). They are useful owners after a
repeated semantic decision exists. They do not by themselves discover a good
border, shadow, density, motion, or component relation.

Use current component variants and slots before adding per-consumer styling.
Modern shadcn primitives expose `data-slot` for targeted system composition
([Tailwind v4 support](https://ui.shadcn.com/docs/tailwind-v4)). A local
`className` remains appropriate for layout or a genuinely local treatment; it
must not become an invisible second variant system spread across pages.

## Compare one component ecology

Select the smallest relation-bearing ecology revealed by the actual surface,
for example:

- controls: Button, Input, Select, Toggle, their icons, and focus/error states;
- surfaces: Card, Dialog, Sheet, Popover, DropdownMenu, and their separation or
  depth behavior;
- navigation: Tabs, menu items, sidebar rows, and selected/current states;
- feedback: Field errors, Alert, Toast, progress, loading, and recovery; or
- dense display: Table, list rows, metrics, filters, and compact actions.

Do not automatically restyle every named member. Inspect them together to find
the shared relation, then preserve differences required by role, density,
modality, or interaction. “All components now have the same thick border,
radius, shadow, or hover lift” is evidence of homogenization, not polish.

## Use variants when aesthetic treatment is uncertain

If prior serial tweaks were rejected, restore or capture one fixed rendered
baseline. Form two or three isolated relation-level candidates using identical
real content and states. A useful comparison changes how the relation is
carried—for example spacing and type, edge and surface contrast, or structural
grouping—not merely nearby token values.

Do not change shared production primitives until one candidate survives the
project direction, negative boundary, functional constraints, rendered
comparison, and designated human judgment. When a candidate is selected,
implement it at the smallest owning layer and inspect at least one ordinary
downstream consumer outside the focal surface.

If the whole inherited preset or direction is wrong, stop refinement and route
to broader design work. The CLI can preview and apply presets, including
partial theme or font application, but applying one mutates the design system
and can reinstall components; it requires explicit change scope and inspection
([shadcn apply](https://ui.shadcn.com/docs/changelog/2026-04-shadcn-apply),
[partial preset apply](https://ui.shadcn.com/docs/changelog/2026-04-partial-preset-apply)).
Never use preset replacement as a polish shortcut.
