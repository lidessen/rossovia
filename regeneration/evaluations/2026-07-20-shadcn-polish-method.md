# shadcn Polish Method Evaluation

## Claim

The [`visual-design`](../../skills/visual-design/SKILL.md) refine path should
help an agent improve an accepted shadcn interface without treating polish as
serial token tuning. It should distinguish missing visual evidence, a local
defect, system normalization, direction under-expression, and direction
mismatch; compare uncertain treatments against a fixed rendered baseline; and
change only the component relation and owner supported by the evidence.

It should not supply a portable shadcn look, infer visual traits from a style
name, restore registry defaults merely because local code differs, or make every
component share one border, radius, shadow, or motion treatment.

## External and project evidence

shadcn describes itself as an open-code component system whose source is added
to the host project, so locally installed components are project-owned code
with provenance rather than opaque library internals
([Introduction](https://ui.shadcn.com/docs)). Its theme supplies semantic roles
and a radius baseline, but those variables do not define a whole component
anatomy or aesthetic relation
([Theming](https://ui.shadcn.com/docs/theming)). Current shadcn surfaces make
the project and provenance inspectable through `info`, preset resolution, and
dry-run component diffs
([CLI v4](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4)); modern
components also expose `data-slot` as a stable composition surface
([Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)).

[Impeccable](https://github.com/pbakaus/impeccable) supplied useful comparison
mechanics: discover the existing system, classify drift, inspect the live work,
and preserve before/after snapshots. Its fixed aesthetic preferences were not
copied because this skill must remain direction-dependent.

The current MeowAsk project declares the `radix-nova` style in
[`components.json`](https://github.com/lidessen/meowask/blob/64a96f7b106f8c1e189f3ef7e3a90a021fdc0d97/components.json).
Current CLI inspection reported preset `b2fA`, Tailwind v4, Radix, Geist,
Lucide, and 20 installed components. Registry dry-run comparison showed that
[`Button`](https://github.com/lidessen/meowask/blob/64a96f7b106f8c1e189f3ef7e3a90a021fdc0d97/src/components/ui/button.tsx)
and
[`Dialog`](https://github.com/lidessen/meowask/blob/64a96f7b106f8c1e189f3ef7e3a90a021fdc0d97/src/components/ui/dialog.tsx)
carry substantial local border, shadow, radius, and lift treatment, while Input
matches the current registry source and Sheet differs little. Page consumers
also repeat border, radius, shadow, and translate classes. This proves split
ownership and implementation drift; it does not, by itself, prove which
treatment looks wrong.

## Baseline failure

A direct DeepSeek V4 Flash Sequence probe received the MeowAsk-shaped facts, an
accepted `cat-editorial doodle` label, the history of rejected radius/shadow/
color/class tweaks, and no rendered artifacts. Baseline run
`4f3d84b5-c253-4c51-8b84-19dd5779ebab` correctly noticed fragmented component
treatment but prescribed a uniform system of exact global values: three-pixel
borders, one large radius, one hard shadow, and one lift treatment across
Button, Dialog, Input, and Sheet. It treated identical treatment as acceptance.
The run used 32,259 tokens and cost $0.002596.

An early treatment probe exposed a subtler failure: replacing scattered classes
with one global token was still attractive even when the prompt warned against
uniform tuning. It also decomposed the word `doodle` into conventional visual
traits without an inspected direction source. The missing method was therefore
not another preferred style; it was an evidence gate plus a way to compare
relations before assigning an owner.

## Revision

The smallest revision keeps the existing `refine` operation and adds:

1. a two-row evidence trace for the accepted direction and current rendering;
2. four mismatch classes before ownership or treatment;
3. a temporary component ecology as the propagation unit, preserving role
   differences rather than assuming one primitive or the whole kit;
4. fixed-baseline comparison of two or three relation-level candidates when
   treatment is underdetermined or previous polish was rejected; and
5. a conditional shadcn reference for project discovery, registry provenance,
   ownership, variants, slots, and preset-change boundaries.

The shadcn material remains a conditionally loaded implementation adapter. The
generic refine path owns visual judgment; the adapter only makes shadcn's
actual ownership and inspection surfaces legible.

## Post-revision probes

All three counted probes used the ordinary Work Cell with the direct DeepSeek
V4 Flash route. This avoided the Sequence probe adapter's preliminary gene
expression, which forms an initial conclusion before the cell reads the skill
and would confound a prompt-method evaluation.

### Missing-evidence action probe

The task repeated the baseline facts and style label but supplied no direction
artifact, negative boundary, screenshot, live rendering, or human observation
of a specific perceptual relation.

- **Disconfirming behavior:** infer that the style label requires irregular
  edges, classify the mismatch, or propose candidate treatments.
- **Observed behavior:** the agent formed both evidence-trace rows, marked each
  ungrounded, returned `Evidence status: insufficient`, and stopped with the
  smallest specimen set, relation questions, implementation owners to inspect,
  and next observable evidence request. It proposed no aesthetic treatment.
- **Run:** `f3f3769b-822e-45eb-a561-4fc6be2bb87f`, 10,577 tokens.
- **Verdict:** supported.

### Sufficient-evidence action probe

The task supplied an inspected direction relation: lively illustrations carry
personality while the interface is a quiet editorial frame; controls may be
tactile but remain subordinate. It also supplied the negative boundary and an
inspected desktop/mobile observation that identical heavy edge-and-depth
treatment competes with the illustration and flattens component roles.

- **Disconfirming behavior:** choose one universal token recipe, make quiet
  Input and Sheet heavy, or tune production components before comparison.
- **Observed behavior:** the agent classified direction under-expression,
  selected the edge-and-depth relation across the smallest control/container
  ecology, preserved role differences and quiet forms, froze a representative
  baseline, and proposed distinct relational hypotheses for rendered
  comparison. Exact candidate values were kept provisional rather than
  promoted to tokens or design conclusions.
- **Run:** `e37dfd8c-676c-4c0c-8043-00622699171d`, 13,033 tokens.
- **Verdict:** supported for plan formation; no candidate was rendered or
  accepted in this probe.

### Local-defect boundary probe

The task supplied an accepted quiet system and an inspected observation that
one consumer's 16-pixel icon was optically one pixel low, while the shared
Button and neighboring components were coherent.

- **Disconfirming behavior:** invoke preset inspection, change a shared token or
  Button primitive, or require multi-candidate aesthetic exploration.
- **Observed behavior:** the agent classified a local defect, kept ownership in
  that consumer, proposed the supplied one-pixel upward optical correction, and
  required same-state rendered and human verification. No system or preset
  change was proposed.
- **Run:** `bf459f42-dd92-48a2-8e6c-ccef0aea987e`, 10,371 tokens.
- **Verdict:** supported.

## Claim limit

These probes support routing, evidence discipline, ownership choice, and the
replacement of serial value tuning with comparison-driven planning on one
Flash-class execution profile. They do not establish that the candidates will
be aesthetically good, that a selected treatment will survive implementation
across the whole product, that every provider will obey the evidence gate, or
that an agent can recover registry provenance when the current shadcn CLI is
unavailable. The next stronger test is a real browser-backed baseline/candidate
comparison in a shadcn product followed by human selection and an ordinary
downstream consumer check.
