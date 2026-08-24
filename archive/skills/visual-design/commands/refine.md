# Refine the Supporting Details

Use this path when a real interface already has an accepted or usable direction,
content hierarchy, and main layout, but its recurring components still feel
generic, uneven, or unrelated to that direction. The purpose is to realize the
design through supporting detail, not to disguise a weak structure with polish.

This command and `references/component-expression.md` are the complete generic
method for this path. When the project has a `components.json` identifying
shadcn, additionally read `references/component-systems/shadcn.md`; do not load
it merely because a project uses React, Tailwind, Radix, or component-shaped
files. An accepted direction is input, not a style cue to reopen. Do not load
sibling commands, `references/visual-language.md`,
`references/presentation-model.md`, `references/visual-seeds/`, or
`references/design-sources/`. If evidence reveals a material structural or
direction defect, stop and report the route change instead of continuing another
operation in the same activation.

## Evidence gate

Before setting `Evidence status`, form one of these evidence traces:

```text
Route: rendered-observation
Accepted direction source actually inspected -> relation and negative boundary observed:
Current rendering source actually inspected -> specific perceptual mismatch observed:

or

Route: explicit-conformance
Accepted project visual contract actually inspected -> concrete relation or established decision:
Implementation source actually inspected -> specific contradiction and affected consumer:
```

An inspected source is an artifact, image, recording, live rendering, or owning
project design source opened in this activation, or a human observation that
explicitly supplies the relation. A direction name declared in the task is not
its source. A component inventory, class list, registry diff, or the verdict
“ugly” cannot fill the rendered-observation route by itself. Implementation
source may fill the explicit-conformance route only when the owning visual
contract already states the concrete relation being violated; code cannot
invent the missing aesthetic decision.

Label each trace item as direct rendering, inspected owning source, explicit
human observation, supplied implementation summary, or inference. A supplied
summary may establish a bounded plan when the caller makes it authoritative,
but never report its consumers, states, or visual effects as directly
inspected. Before editing a shared owner, inspect the actual owner and affected
consumers.

Then set `Evidence status` to `sufficient` or `insufficient`. It is sufficient
only when both rows of one route are grounded:

- an accepted direction traceable beyond its label to inspectable artifacts and
  a negative boundary; and
- the current rendering, or a human observation that names the specific
  perceptual relation rather than only an outcome such as “ugly.”

or:

- an accepted project visual contract that states a concrete visual relation,
  role distinction, or established treatment; and
- implementation evidence of a specific contradiction and the consumers it
  affects.

Implementation evidence can identify what to inspect and where a selected
decision may belong; it cannot supply formal traits that were not observed.
When either trace row is ungrounded, set the status to `insufficient`, stop, and
return only:

```text
Object, accepted direction, and structure:
Evidence trace:
Evidence status: insufficient
Missing inspection capability or evidence:
Small representative component and state set to inspect:
Relation question each specimen can answer:
Likely implementation owners to trace, without proposed treatment:
Next observable action:
```

Do not continue the method below, classify the mismatch, or fill the ordinary
refine result. A comparison plan may name specimens and a relation question,
but not candidate treatments or aesthetic properties. A request to diagnose or
polish does not override this gate.

## Method

1. Read the owning direction or design system, the real implementation, the
   evidence required by the selected route, and
   `references/component-expression.md`. Compile the accepted direction into
   the smallest project visual contract needed here when the owning source has
   not already done so; do not reopen style selection. Reconstruct the content
   hierarchy and attention path only far enough to keep details subordinate to
   them. If either is materially wrong, name the defect and route the work to a
   broader design change instead of polishing around it.
2. Classify the observed mismatch before proposing treatment:
   - **system normalization** — a supported shared component, variant, token, or
     composition exists, but a consumer bypasses it or an accidental fork has
     drifted;
   - **direction under-expression** — the inherited system is mechanically
     coherent, but a repeated relation contradicts or fails to carry the
     accepted project direction;
   - **direction mismatch** — the accepted or inherited direction itself does
     not fit the product relation; stop and route to broader design work; or
   - **local defect** — one usage or state is wrong without implying a shared
     system change.

   A source diff, an upstream default, or a locally modified component is not
   enough to choose among these. Establish the classification in the rendered
   whole. Never respond to under-expression by inventing a uniform radius,
   border, shadow, spacing, color, or motion recipe.
3. Find the leading detail mismatch: the repeated relation whose correction
   would make the largest number of ordinary elements feel intentional. Inspect
   representative components rather than compiling an exhaustive inventory.
   Include the most common action, container, navigation or form pattern, and an
   icon-bearing or stateful control when they exist. Select the smallest
   **component ecology** that shares the relation and must be judged together;
   do not assume one primitive or every component is the right propagation unit.
4. Form the smallest conformance and component-expression map needed for this
   case. For each retained detail family, state the functional role, applicable
   project-contract relation, current evidence, owning layer, affected
   component ecology, required action, verification, and whether the decision
   is inherited, local, shared, experimental, or deliberately neutral.
5. When one treatment follows directly from an accepted project contract or
   system relation, proceed to implementation without asking the human to
   choose the direction again. When the treatment is aesthetically underdetermined, a
   previous polish attempt was rejected, or the proposed correction depends on
   unobserved values, freeze the current rendered baseline and form two or three
   relation-level candidates in an isolated preview. Candidates must test
   meaningfully different visual hypotheses, not nearby values of the same
   radius, shadow, spacing, color, or animation. Render them with the same real
   content, viewport, theme, and consequential states. Eliminate candidates
   against the attention path, accepted direction, negative boundary, functional
   constraints. Select the evidence-dominant candidate and continue when one is
   materially better supported. Ask the designated human only when the
   remaining candidates are preference-equivalent but would materially change
   a shared project decision. Derive each hypothesis from an
   observed relation in the accepted artifacts; do not unpack a named style into
   conventional visual traits, introduce a new prop or metaphor, or cite an
   uninspected source. Values needed to render a candidate are provisional trial
   parameters, not tokens or design conclusions; label them as such and vary
   them only enough to make the tested relation observable. If the runtime
   cannot render comparable candidates, stop with a comparison plan; do not
   choose a treatment or its owning layer from prose alone.
6. Implement only the selected highest-leverage coherent slice through real
   owners and consumers. Change a shared primitive only when its component
   ecology genuinely needs the same relation; preserve intentional differences
   between roles. A new shared component variant or public styling API is also
   a promotion: require multiple real consumers or a declared context
   substitution, not one focal caller and anticipated reuse. Otherwise keep the
   treatment local. Remove superseded trial code. Preserve semantics,
   interaction contracts, focus, contrast, target size, content density, and
   reduced-motion behavior.
7. Inspect the rendered result beside the fixed baseline at representative content,
   viewports, themes, and interaction states. Confirm that repeated details now
   appear intentionally related, that ordinary downstream components still
   belong, and that the detail layer does not draw attention away from the
   user's decision. A consistent token table or uniform component treatment is
   not evidence of this result. When human feedback rejects a candidate, retain
   the rejected relation and reason in an existing project design source when
   one exists; do not create a new permanent polish ledger by default.
8. Return:

```text
Object, direction, and attention path preserved:
Evidence trace:
Project visual contract used or extended:
Mismatch classification and evidence:
Leading detail mismatch:
Representative components and states inspected or authoritatively supplied:
Component-expression map:
Owning system layer and component ecology:
Details deliberately kept neutral:
Fixed baseline and candidate relations, when comparison was required:
Selected and rejected candidates with evidence:
Shared primitives changed and affected consumers:
Local treatments retained:
Rendered comparison and mechanical checks:
Remaining mismatch or structural issue:
What remains an aesthetic judgment:
Human review question:
Observation that would require broader redesign:
```

Do not produce a universal polish checklist, restyle every available component,
or infer that identical radius, shadow, spacing, or icon treatment creates
coherence. Do not repeatedly mutate one production treatment after aesthetic
rejection without restoring a fixed baseline and changing the tested relation.
Supporting details should make the main design legible and continuous; they do
not replace its content relation, hierarchy, or direction.
