# Content, Attention, and Visual Form

## The dependency

Visual design is the organization of content for perception and action. Color,
type, spacing, grid, imagery, depth, and motion are means of allocating
attention and expressing relations; they are not independent decoration layers.

```text
content and actions
  -> attention path
     -> visual hierarchy
        -> layout and responsive relations
           -> semantic tokens and component roles
              -> case-specific treatment
                 -> observed comprehension and action
```

Do not reverse this dependency by choosing a palette or component style and
then forcing the content into it.

## Content structure

Inventory the content before styling it:

- facts, claims, labels, actions, navigation, status, help, and evidence;
- relationships such as sequence, grouping, comparison, containment, and
  dependency;
- what must be present now, what may be progressive, and what can be removed;
- content variability: length, language, missing values, error states, density,
  and user-generated material; and
- source and authority boundaries.

The interface cannot repair undifferentiated or falsely prioritized content by
adding visual emphasis.

## Attention path

Describe attention as a bounded sequence, not a vague wish to “focus”:

```text
Orient: what tells the person where they are and why this matters?
Primary: what must they perceive or do first?
Supporting: what helps them judge or complete that action?
Context: what must remain available without competing?
Recovery: what errors, changes, or exits must interrupt at the right strength?
```

For each region or element, name its attention role and the cost of receiving
too much or too little emphasis. Balance does not mean equal weight. It means
the available contrast, space, position, motion, and repetition are spent in
proportion to the user's present decision.

Use at least these checks:

- Can a new viewer orient before being asked to act?
- Is there one dominant next action or a truthful comparison among peers?
- Do persistent navigation and chrome recede when the main content requires
  concentration?
- Are secondary facts discoverable without appearing equally urgent?
- Do warnings and errors interrupt only when their consequence warrants it?
- Does the hierarchy survive long text, small screens, localization, and
  increased text size?

## From hierarchy to layout

Layout gives spatial form to content relations and the attention path.

- Proximity and containment express grouping.
- Reading order and position express sequence and priority.
- Alignment exposes shared structure and improves scanning.
- Scale and occupied area establish relative importance.
- Density reflects the user's task: scanning many comparable items differs
  from sustained reading or a single consequential decision.
- Negative space separates decisions and protects attention; it is not unused
  capacity.
- Responsive changes may alter composition while preserving the attention
  order and relationships.

Choose a grid, shell, panel model, or layout archetype only after naming these
relations. A mathematically consistent grid can still present every content
piece at the wrong weight.

## From roles to tokens

Tokens retain repeated decisions; they do not discover them. Prefer semantic
layers:

```text
primitive values
  -> functional roles
     -> component or pattern roles
```

For color, begin with roles such as canvas, surface, primary text, secondary
text, border, focus, action, selected, success, warning, and danger. Then assign
values that work across the required themes, contrast modes, displays, and
surrounding materials. Do not use a raw hue or brand color as both decoration
and interaction meaning.

Apply the same principle to typography, spacing, radius, elevation, and motion:
name the repeated relation before choosing the value. Create a token only when
at least two independent real consumers need the same semantic decision or when
a declared theme/context must substitute values coherently. Record those
consumers or substitutions beside the proposal. A one-off value remains local;
a complete-looking token table is not a design objective.

## Review the whole allocation

Review attention as a finite budget across the entire surface:

- Which three elements attract the eye first, and is that order intended?
- What is visually loud without changing the user's decision?
- What necessary content is quiet because the system spent contrast elsewhere?
- Does repetition build recognition or merely multiply competition?
- Does the system still work when content, state, or viewport changes?

A token audit can prove consistent substitution. A layout audit can prove
alignment and responsiveness. Neither proves that the content received the
right attention; inspect the rendered whole with representative users or the
named human reviewer.
