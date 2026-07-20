# Visual Style Realization Evaluation

## Claim

The [`visual-design`](../../skills/visual-design/SKILL.md) skill should let a
person select a project relation once for representative implementation, then
let later agents apply an accepted direction to real interfaces without
reopening aesthetic selection for every page or component.
The agent should compile the accepted direction into the smallest project-local
visual contract needed by the current artifact, map that contract to actual
implementation owners and consumers, implement the smallest coherent slice,
and leave final aesthetic acceptance to the designated human.

This mechanism must not become a portable style template, a mandatory schema,
a color-token-only audit, or a reason to add shared component APIs for one local
consumer. An unresolved style cue remains upstream formation work rather than a
false accepted contract.

## Prior gap

The earlier [shadcn polish evaluation](2026-07-20-shadcn-polish-method.md)
established evidence gating, component ecologies, and fixed-baseline comparison,
but its strongest treatment probe stopped at plan formation. The skill still
lacked an explicit bridge from an already selected direction to source-level
conformance. That allowed downstream work to reopen preference selection,
collapse the direction into token changes, or promote one focal treatment into
a shared primitive without checking ordinary consumers.

## Revision

The smallest revision keeps the existing operations and adds two project-local
working concepts:

1. a **project visual contract**, compiled from the accepted direction into
   expression responsibilities, role differences, established decisions, open
   dimensions, and a negative boundary; and
2. a temporary **conformance map** from each in-scope visual role to evidence,
   implementation owner, affected consumers, action, and verification.

The shared [component-expression
reference](../../skills/visual-design/references/component-expression.md)
defines this bridge for design, refine, and relevant review work. It explicitly
keeps one-consumer treatment local: a new variant, prop, or public styling hook
is a shared promotion even when placed in a reusable component file. The
[refine command](../../skills/visual-design/commands/refine.md) also admits an
explicit-conformance evidence route when an inspected project contract and
implementation source establish the contradiction without claiming that code
proves beauty.

The review also preserved the existing authority boundary: selecting a
provisional direction authorizes its representative implementation but does not
promote it to project authority. Only an accepted direction may compile into a
project visual contract; provisional work remains a case-scoped hypothesis.

## Action probe

The probe used a disposable MeowAsk-like fixture with an inspected accepted
`DESIGN.md`, one home CTA using a quiet `outline` Button variant, and three
intentionally quiet downstream consumers of that same variant. The task asked a
read-only Work Cell to return the concrete bounded action. DeepSeek V4 Flash was
selected directly because the OpenCode Go credential was not visible in the
current shell; the global provider profile was not changed.

**Disconfirming behavior:** ask the human to choose a style again, change the
shared outline variant, add a one-consumer shared CTA variant, reduce the work
to color tokens, replace the coherent icon family, or claim source inspection
proved aesthetic quality.

The probe evolved through three observations:

- run `53454d55-e964-46c9-9f1c-d8be453fe909` selected the correct conformance
  route and local scope but mislabeled supplied summaries as inspected evidence;
- run `cb40a480-ffe1-4dc3-a721-4358f309a52b` read the real fixture sources but
  still proposed a new shared variant for one consumer; and
- after adding provenance labels and the shared-promotion gate, run
  `4d6ad4d8-44c0-4f03-a9a5-5d2c251629bf` read the accepted design source, skill,
  refine command, component-expression reference, Button owner, home consumer,
  and quiet consumers; it kept the shared primitive unchanged and placed the
  treatment in the local home markup.

The final run also retained the Lucide icon family, considered component
anatomy, depth, interaction states, focus, contrast, viewports, and ordinary
consumers, and separated mechanical/rendered checks from the remaining human
aesthetic judgment. It used 16,823 tokens, including 9,728 cached input tokens.

**Verdict:** supported for routing, evidence provenance, implementation
ownership, propagation scope, and verification planning on this Flash-class
execution profile.

## Boundary probe

The boundary task supplied only the phrase “hand-drawn,” the function of a new
documentation site, and no project artifact, brand source, accepted direction,
or rendering. The first run correctly selected `shape` and did not claim an
accepted contract, but still expanded familiar notebook/workshop treatments
after acknowledging that no source could be inspected. That reproduced the
known style-cue failure rather than protecting the new contract boundary.

The [shape command](../../skills/visual-design/commands/shape.md) and
[visual-language reference](../../skills/visual-design/references/visual-language.md)
were tightened at the existing source gate: when no concrete artifact can be
inspected, stop at a source-acquisition action instead of generating candidates
and compensating with an evidence warning.

Run `e64599c9-d340-4c3c-b16f-9a58f2520c3e` then selected `shape`, stated the
recoverable project relation, named the missing source contrast and two source
roles to inspect, and explicitly declined candidate formation, implementation
values, or a project visual contract. It read only `SKILL.md`, `shape.md`, the
presentation model, and the visual-language reference. It used 29,600 tokens,
including 19,840 cached input tokens.

**Verdict:** supported. The realization mechanism does not promote an
uninspected style cue into accepted project authority.

## Provisional-authority probe

Whole-change review found a subtler authority conflict: the first revision said
that human selection settled the project direction, while the existing method
promotes a provisional direction only after representative artifacts and human
review. It also allowed `design` to call provisional implementation decisions a
project visual contract.

The correction distinguishes three states without adding another operation:
unresolved cue, selected relation for a representative case, and accepted
project direction. Selection is not repeated for each surface, but its first
implementation remains a case-scoped hypothesis until promotion.

Run `0fed8155-091e-424d-9464-8dff356cdde3` received a human-selected provisional
relation and a request for its first home-page slice. DeepSeek V4 Flash did not
reopen candidate selection, labeled the result `Provisional case hypothesis`,
reported that no project visual contract existed, kept tokens and component
variants local, and named the rendered human observation that would promote or
reject the relation. It used 34,946 tokens, including 24,192 cached input
tokens.

**Verdict:** supported for preserving one-time selection without silently
granting project authority. The probe planned but did not render or implement
the representative slice.

## Structural verification

- `python3 scripts/sync-sequence-snapshot.py visual-design --check` passed for
  the unchanged P16/P07/P05/P09 expression team.
- `python3 scripts/probe-skill-installation.py visual-design` installed an exact
  32-file disposable snapshot through `npx skills add` and passed.
- `git diff --check` passed, and `SKILL.md` remains below the repository's
  500-line limit.

## Claim limit

These probes show that one Flash-class agent can turn an inspected accepted
direction into a bounded code-owner decision without reopening style selection
or over-promoting one consumer. They do not prove that the eventual CSS values
will be beautiful, that a model can judge visual quality from source alone, or
that the proposed treatment survives a real browser-backed implementation.
Rendered comparison and named human review remain the next acceptance gate.
