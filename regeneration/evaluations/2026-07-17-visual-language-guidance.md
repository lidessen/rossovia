# Visual Language Guidance Evaluation

## Claim

The portable [`visual-design`](../../skills/visual-design/SKILL.md) method should
turn an ambiguous style cue into a small, source-grounded choice among project
relations, recommend one, and allocate its expression across surfaces without
pretending that a direction is already a palette, component system, logo, or
page design. It should leave accepted design systems and ordinary local reviews
outside this heavier path.

The method should accumulate ways of observing design rather than portable
looks. For example, [Google's expressive-design research](https://design.google/library/expressive-material-design-google-research)
relates emotional intent to attention, task performance, preference, and
accessibility; [Bike New York](https://www.pentagram.com/work/bike-new-york-2/story)
ties hand-drawn variation to a mark people can reproduce and participate in;
and [The Pudding's process](https://pudding.cool/process/how-to-make-dope-shit-part-3/)
lets audience, argument, evidence, and narrative determine the visual form.
These are decision lenses and process evidence, not style presets.

## Matched action probe

**Raw task:** prepare selectable directions and a recommendation for an
independent-researcher knowledge website from the cue “hand-drawn doodle,” so a
later agent can design its home page, long-form reading page, navigation, and
logo. Do not design pages or produce a complete design specification.

Both baseline and treatment used OpenCode Go `deepseek-v4-flash`, the same raw
task, a read-only workspace, and the selected skill as the only method pointer.
The baseline used detached commit `eab5e62`; the treatment used the working
revision.

**Disconfirming observation:** the evaluator treats the cue as a preset, offers
cosmetic variants, copies familiar physical props, fixes fonts, colors, values,
components, or logo motifs without sources, gives every surface the same
expressive intensity, or asks the human to invent the candidate space.

### Baseline

- Run `193b75c2-6cfe-495f-8f75-4cd3ecc3bf1a` used 21,159 total tokens.
- It returned “Chalkboard Lab,” “Notebook Margin,” and “Sketch Prototype.”
- It prescribed dark chalkboards, paper and grid backgrounds, sticky-note
  elements, handwriting fonts, palette families, a notebook-and-pen logo motif,
  and token-like component treatments.
- The output understood the readability contradiction and offered a choice, but
  mostly varied familiar costumes inside one style label.

**Verdict:** claim failed. A general Aesthetic Case did not distinguish a style
cue from a direction or specification.

### Treatment evolution

The revision introduced a `style cue` and provisional `visual language`, a
direction-only return path, relation-led candidates, cross-surface expression
allocation, an anti-prop/metaphor check, open variables, and a conditional
source field.

Early treatment runs exposed two real failures instead of being erased:

1. candidate relations improved, but the output still supplied exact font
   examples, hexadecimal colors, pixel sizes, and logo motifs;
2. moving the boundary before the output template removed most exact values,
   but physical metaphors still regenerated paper, grids, collage, and drawing
   recipes; and
3. naming candidates by project relation and adding a direction-only return
   reduced the result from a full specification toward “thinking trace,”
   “diagrammatic clarity,” and different expression strengths across home,
   reading, navigation, and identity surfaces.

The final source-gated run `a54ed9c8-da33-4b63-8c3a-99266e07cf4d` loaded:

- `SKILL.md`;
- `commands/shape.md`;
- `references/presentation-model.md`;
- `references/visual-language.md`;
- `references/design-sources/index.md`; and
- `references/design-sources/expressive-research.md`.

It used 54,393 total tokens because each additional tool step replayed the
accumulated context. The answer separated the style cue's ambiguity, offered
three relationship-led candidates, recommended “thinking trace,” protected the
long-form reading surface, varied expression across logo, home, reading,
navigation, and mobile, left exact fonts, values, grid, and identity content
open, and rejected paper/sticky-note props as defaults.

The answer still over-specified some line, color, animation, and fragment
treatments, and it did not state how the inspected Google source changed the
recommendation. The command was therefore amended to require an explicit
source decision delta and transfer boundary; that final structural amendment
was not rerun because the preceding probe's 54,393-token cost was
disproportionate to verifying one output field.

**Verdict:** substantial supported improvement, not full support. The method now
creates a usable direction choice and protects later design freedom, but a
lower-cost model may still collapse relations into familiar treatments when
project and user references are absent. Such output remains a source-limited
hypothesis until real fragments and human selection test it.

## Boundary and context probe

**Raw task:** an accepted design system exists; review only mobile settings-page
field-group hierarchy and spacing; keep a decorative thumbnail unchanged; do
not invent values when no screenshot or source is supplied.

**Disconfirming observation:** load provisional visual-language or expressive
source guidance, reopen style, discuss the thumbnail, or invent spacing values.

Run `e42dcbbd-2632-4e0b-a347-5b94d7038c5d` loaded `SKILL.md` and
`commands/review.md`. It did not load `visual-language.md`, presentation,
asset-production, concepts, source index, or sibling commands. It kept the
accepted direction and thumbnail out of scope and declined to invent findings
without a rendered or source artifact.

**Verdict:** supported. The heavier visual-language and source-field path is
conditional rather than a mandatory preflight.

## Revision decision

Retain the P16/P07/P05/P09 expression team and the existing four operations.
The missing layer belongs inside `visual-design`, not in a separate style skill,
design-template catalog, generator, or deterministic classifier.

Retain:

- a style cue as an underdetermined human phrase;
- a provisional visual language as a project-local relation plus formal
  tendencies and cross-surface expression allocation;
- a small expressive-process source field selected by decision changed;
- real fragments and human aesthetic judgment as the promotion gate; and
- ordinary review/design paths that never load this context when the direction
  is already accepted.

Do not promote the probe's hand-drawn treatment, candidate names, palettes,
line recipes, page metaphors, or logo suggestions into portable guidance.
