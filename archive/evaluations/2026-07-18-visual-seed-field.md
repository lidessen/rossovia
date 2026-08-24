# Visual Seed Field Evaluation

## Claim

The portable [`visual-design`](../skills/visual-design/SKILL.md) method should
help a person or agent choose among meaningful visual relations by consulting a
small field of real work. The field must improve the choice space without
becoming a style catalog, a house canon, or a source of borrowed identity
vocabulary. A seed should remain a linked artifact plus a compact observation
card; a live artifact, project evidence, a real fragment, and human judgment
remain the decision authorities.

## Curated field

The first field was assembled by visually inspecting the live primary work,
not by collecting style labels. It deliberately spans different relations:

- [Maggie Appleton](https://maggieappleton.com/) — authorial presence with
  differentiated epistemic status;
- [LOW←TECH MAGAZINE](https://solar.lowtechmagazine.com/) — infrastructure
  constraints made visible in publication form;
- [Are.na](https://www.are.na/) — quiet associative collection that protects
  heterogeneous sources;
- [The Pudding](https://pudding.cool/) — argument-specific visual form held by
  editorial continuity;
- [Excalidraw](https://plus.excalidraw.com/) — provisional marks as an
  approachable operational surface;
- [Ink & Switch Potluck](https://www.inkandswitch.com/potluck/) — prose
  gradually enriched into software; and
- [Bike New York](https://www.pentagram.com/work/bike-new-york-2/story) — a
  reproducible public identity that invites participation.

The cards retain the decision relation, useful contrast, fit, and transfer
boundary. No screenshots, fonts, marks, illustrations, or other third-party
assets are bundled. The live source must be reopened when its current visual
form matters.

## Action probes

**Raw task:** prepare selectable visual directions and a recommendation for an
independent-researcher knowledge website from the cue “hand-drawn doodle,” so a
later agent can design its home page, long-form reading page, navigation, and
logo. Do not design pages or produce a complete specification.

Both probes used OpenCode Go `deepseek-v4-flash`, a read-only workspace, and a
runtime with file reading but no live visual/browser capability.

**Disconfirming observation:** the agent claims it inspected an unavailable
artifact, treats a card as visual proof, retrieves the field indiscriminately,
copies a seed's palette or motifs, or allows a source metaphor to determine
candidate names and asset content.

### Probe 1

- Run `b4adf03a-709c-4cac-a108-a6c77ff43f35` used 49,085 total tokens
  (45,529 input, 3,556 output, 37,376 cached input).
- It selected Maggie Appleton, Excalidraw, and LOW←TECH MAGAZINE.
- The sources moved the candidate space away from “blackboard,” “notebook,” and
  “zine” costumes toward visible thinking, editorial authorship, and
  participation threshold.
- It nevertheless called unavailable cards “checked sources,” retrieved an
  unnecessary concepts reference, and used three seeds when two were enough.

The method was revised to label unavailable cards as unverified discovery
pointers, reserve the concepts reference for an actual vocabulary conflict, and
start from a smaller contrast field.

### Probe 2

- Run `e1068896-e338-45ee-9e06-a010cd938502` used 47,786 total tokens
  (44,731 input, 3,055 output, 37,248 cached input).
- It selected Maggie Appleton, Excalidraw, and Ink & Switch Potluck.
- It correctly disclosed that the runtime could not open the live work and that
  the cards were unverified pointers rather than inspected visual evidence.
- It still let Maggie Appleton's source metaphor dominate the recommendation:
  “knowledge as growth,” seed/sprout/branch logo implications, and growth-state
  labels survived despite the card's transfer warning.

This is a decision-changing failure. Negative wording on a source card is weaker
than the source's vivid nouns. The method was therefore revised so that the
first direction pass uses exactly two seeds; a third belongs to a later
iteration only after human feedback or a real fragment reveals a missing
contrast. It now also requires a final scan that removes seed-specific nouns,
motifs, and metaphors unless independent host-project evidence requires them.
The Maggie Appleton card was reframed around authorial presence and
differentiated epistemic status, not growth. All seven transfer boundaries were
also rewritten to name the transferable relation and the excluded layer rather
than injecting a vivid inventory of source-specific visual parts.

The final strict-two and source-vocabulary checks were not rerun as another full
action probe: the two preceding probes already used 96,871 tokens, and the last
revision directly constrains the observed retrieval and output surfaces. The
next real direction task should treat literal source-metaphor transfer as the
first rejection observation.

## Boundary probe

**Raw task:** an accepted design system exists; review only mobile settings-page
field-group hierarchy and spacing; keep a decorative thumbnail unchanged; do
not invent values when no screenshot or page source is supplied.

Run `27470d2d-4385-4c17-b45d-b03cbf18a9c6` used OpenCode Go
`deepseek-v4-flash` and loaded only `SKILL.md`, `commands/review.md`, and
`references/presentation-model.md`. It did not load the visual-language,
visual-seed, process-source, asset-production, concepts, or sibling-command
paths. It also declined to invent a visual finding without project artifacts.

**Verdict:** supported. The seed field remains conditional context for an
unresolved direction; it does not burden ordinary local review.

## Decision

Retain a small built-in seed field as fallback discovery context inside
`visual-design`, distinct from process and system sources. Prefer project and
user references, retrieve only a consequential contrast, inspect live artifacts
when possible, and transfer relations rather than treatments or identity
vocabulary. Expand the field only after real use demonstrates a missing choice;
do not complete style categories for their own sake.
