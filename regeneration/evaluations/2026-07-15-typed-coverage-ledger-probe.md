# Typed Coverage Ledger Probe

**Date:** 2026-07-15

**Source revision:** `bf30826`

**Model:** `deepseek-v4-flash`, non-thinking mode

**Status:** typed reconstruction test supported for this repeated
source/projection error; direct source access alone unsupported as a repair

## Observed gap

The earlier
[project-cognition synthesis](2026-07-15-project-cognition-scale-control.md)
misclassified `principles/interpretations/P<id>.md` and `skills/*/SKILL.md` as
reconstructible projections. The accepted semantic-authority child report had
already made the same error: its prose called them a licensed derivative and a
contextual expression, while its `Projection?` column marked both `Yes`.

This probe isolates that relation judgment. Three artifacts were held constant:

- `principles/interpretations/P14.md` — licensed derivative, not reconstructible
  from its one-line semantic source without losing contextual guidance;
- `skills/code-review/SKILL.md` — contextual expression, not reconstructible
  from its selected principles and interpretations without losing the method;
  and
- `skills/code-review/references/sequence.md` — generated, read-only snapshot
  reconstructible from the canonical Sequence, selected interpretations, and
  sync script.

Every variant used the same model, two short instructions, three repetitions,
seven-step boundary, and terminal completion requirement. No role, personality,
or “think harder” instruction was added.

## Staged practice

| Variant | Evidence | Result contract | Correct classifications | Natural submit | Tokens |
|---|---|---|---:|---:|---:|
| report only | retained semantic-authority and skill-system reports | `Projection?` + free relation | 3/9 | 3/3 | 84,848 |
| source closed | reports, P14, actual skill/snapshot, AGENTS, Sequence, sync script | unchanged | 3/9 | 3/3 | 101,614 |
| typed ledger | same source-closed packet | relation type + reconstruction source + meaning lost | 9/9 | 3/3 | 131,655 |

Run `3a186d26-5b2d-4083-a284-85680addde7d` reproduced the inherited error in
all three report-only Cells. Each marked all three artifacts as projections.
They also stated that actual files were outside their read scope, yet submitted
`usable`; retained agreement substituted for direct acceptance evidence.

Run `41374cd5-358e-4960-a1c9-a39477b6f474` added the direct source files but
kept the result shape. It still failed in all three repetitions. One Cell wrote
that an interpretation's contextual guidance was not reconstructible from the
source line and nevertheless selected `projection: yes`. Another explicitly
said the authority relationship was being treated as projection despite the
failed reconstruction test. More evidence did not repair the decision because
the binary field still allowed the contradiction to survive.

Run `d36a956e-3864-43cc-9557-5f53b6b4cbb6` kept the source-closed packet and
instructions but replaced the result fields with:

```text
relation type
reconstruction source
meaning lost if rebuilt
source evidence
```

All three Cells then classified the interpretation as `licensed_derivative`,
the skill as `contextual_expression`, and the snapshot as
`reconstructible_projection`. Their loss accounts recovered the actual
decision boundary: decision questions and contextual guidance disappear when
an interpretation is reduced to its source line; scope, method, gates, and
report contracts disappear when a skill is reduced to selected principles;
the snapshot's semantic content is generated from named sources.

## Judgment

The Sequence already contained the needed principle. P14's
[interpretation](../../principles/interpretations/P14.md) explicitly separates
semantic-source authority from reconstructibility. The failure was in its
expression: a `Projection?` flag compressed two independent questions—authority
and lossless reconstruction—into one attractive label.

This supports a narrow method change in
[scale-controlled review partitioning](../../skills/code-review/references/partitioning.md):
when source/projection classification can change synthesis, the coverage ledger
must retain relation type, source anchor, reconstruction source, and meaning
lost by reconstruction. `contextual expression` must remain distinct from
licensed derivation and reconstructible projection.

The result does not justify making every Work Cell use this ledger, adding a
runtime relation taxonomy, or expanding ordinary review instructions. It is an
on-demand result contract for a partitioned review whose live contradiction is
relation preservation. The typed variant used 29.6% more tokens than the
source-closed variant, so its additional structure must be selected where this
classification affects the decision rather than applied as universal ceremony.

## Estimate audit

Each three-Cell phase estimated 120,000 tokens. Report-only used 84,848
(29.3% below), source-closed used 101,614 (15.3% below), and typed-ledger used
131,655 (9.7% above). The estimate became more accurate as the packet and
result work became explicit. These remained post-run comparisons, not runtime
stops.
