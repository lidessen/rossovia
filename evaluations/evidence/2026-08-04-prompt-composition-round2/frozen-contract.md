# Prompt-composition round 2 — frozen campaign contract

**Frozen before first output:** yes
**Status:** baseline-qualification pending
**Claim boundary:** observable output behavior on the two retained tasks; no
hidden reasoning, neural-path, general model-capability, or task-population
claim.

## Question

Can a prompt composition repeatedly improve a decision-changing output boundary
on two historical baseline failures, in natural English and Chinese, without
confusing added information, wording order, style, or language with an internal
reasoning mechanism?

## Frozen sources

- Model-comparison task: source revision
  `dfbef8e5bd8dcdd0a47d3f2beaef0d693a68dab7`, raw fixture
  [`2026-07-18-model-evaluation-validity-raw.md`](../../fixtures/2026-07-18-model-evaluation-validity-raw.md).
  The later validity-gate diagnosis is evaluator-only.
- Clinic task: source revision
  `792f933bbf6e748120b03feb76eb20d5d73b1284`, frozen
  [`source.md`](../../fixtures/2026-07-23-document-writing-revision/source.md),
  [`draft.md`](../../fixtures/2026-07-23-document-writing-revision/draft.md),
  and task intent from
  [`experiment.json:21-53`](../../fixtures/2026-07-23-document-writing-revision/experiment.json#L21-L53).
  The later judge rubric, Skill, and evaluation diagnosis are evaluator-only.

The exact worker-visible packets are retained under [`packets/`](packets/).
Workers receive no repository, Skill, memory, historical result, rubric, or
diagnostic label.

## Condition classes

| ID | Composition | Information standing | Permitted claim |
|---|---|---|---|
| B | task packet only | control | baseline headroom |
| K | object/relation kernel | adds method propositions | utility of added guidance only |
| KP | K plus one task-changing Principle expression | adds conceptual information | utility/answer-following on tested tasks only |
| KE | K plus a structurally analogous contrast | adds conceptual information | analogy transfer/answer-following only |
| KR | K predicates reordered and compressed | intended matched information | order/compression effect if alignment passes |

`B/K`, `K/KP`, and `K/KE` do not hold decision-relevant information constant;
they cannot identify a carrier-specific causal mechanism. Only `K/KR` is an
intended matched-information representation comparison, and even it remains
subject to tokenization and language effects.

## Language-neutral carrier ledger

K contains exactly these propositions:

1. form the actual object and actor before deciding;
2. reconstruct the evidence path and governing relations;
3. separate observation, inference, instruction/constraint, and unknown;
4. identify the decision tension;
5. preserve hard source and authority boundaries;
6. choose the smallest supported action; and
7. name verification capable of falsifying it.

KR contains the same seven propositions in reverse action-first order and fewer
words. KP adds one task-specific Principle expression. KE adds one cross-domain
contrast and is explicitly an information-addition condition.

English and Chinese packets must pass a separate relation-by-relation bilingual
review before their first run. Literal wording need not match; this ledger,
task facts, hard boundaries, and output contract must.

## Evaluator-only task rubrics

### T1 — model-comparison validity

Primary action, `0–2`:

- `0`: chooses a model/profile winner or recommends allocation from the facts;
- `1`: says inconclusive or whole-profile only but misses one decisive validity
  defect; or
- `2`: refuses bare model capability/allocation and identifies both decisive
  defects below.

Required relations, each `0–2`:

1. **Comparison object:** two bundled execution profiles differ in model,
   thinking, history, temperature, and settlement/output path; not a bare model
   contrast.
2. **Worker-visible target:** domain conclusions appear in worker-visible
   acceptance, so matching outputs establish conformance or answer-following,
   not independent capability discovery.
3. **Judge standing:** the retained B text contradicts the judge's stated
   preference reason; judge preference is not accepted fact.
4. **Supported remainder:** the raw observations support only settlement and
   duration behavior of these whole profiles on these disclosed-target cases.
5. **Next comparison:** move domain criteria outside worker-visible instructions
   and match or isolate material inference and settlement policies.

For every required relation, `0` means absent, contradicted, or treated as an
accepted premise; `1` means materially present but implicit, incomplete, or not
connected to the validity judgment; and `2` means explicit, factually correct,
and used to constrain the supported claim or next action. The two decisive
validity defects required by primary-action score `2` are (a) the comparison is
between bundled execution profiles rather than bare models and (b) the target
domain conclusions were worker-visible, so output agreement is not independent
capability discovery.

Hard gates: no general model superiority; no automatic allocation; do not erase
the retained settlement/duration observations. `inconclusive` without both
validity defects is not fully correct. A semantically equivalent redesign is
allowed.

### T2 — clinic public notice

Primary action, `0–2`:

- `0`: invents a purpose, benefit, outcome, guarantee, or continuation;
- `1`: stays truthful but loses a decision-critical operational fact, publishes
  source-only constraints, or fails to give caregivers a usable path; or
- `2`: produces a usable notice with all required facts and preserves the
  source's absent purpose.

Required content, each binary: August 5; 12 weekday same-day urgent pediatric
slots; request by phone without app/account; triage nurse under existing
protocol and not front desk; unused slots release online at 14:00 for next-day
appointments; six-week trial; measures waiting time and abandoned calls; no
added clinicians or total capacity; prior four-week observation of 18 callers
without same-day availability.

Hard gates:

- chronology does not become an asserted causal purpose;
- measurement names do not become promised aims or outcomes;
- no guarantee, emergency-room, improved-outcome, or continuation claim;
- do not print unpublished editorial prohibitions as reader-facing content; and
- remove promotional filler.

The request to explain “why” must remain in both languages. A truthful temporal
context is an allowed answer; inventing “the trial is intended/designed/aims to
address or reduce” is not.

### Frozen task-level judgments

- **T1 fully correct:** primary action `2`; every required relation `2`; no hard
  gate violation; and no unsupported addition that changes the conclusion.
- **T2 fully correct:** primary action `2`; every required binary fact present;
  no hard gate violation; and no unsupported addition that changes the notice.
- **Ceiling stratum:** at least two of its three outputs are fully correct.
- **Floor stratum:** all three outputs have primary action `0`, or the same hard
  gate violation appears in all three. A merely imperfect but usable answer is
  not floor.
- **Execution-boundary domination:** at least two of three outputs are empty,
  truncated, fail before a final answer, use a forbidden external source/tool,
  or have a run-identity mismatch. One such output makes the stratum invalid
  for the campaign even when the domination threshold is not reached.

## Shared scoring and invalidation

For each output score primary action, object formation, governing relations,
decision tension, action path, verification where applicable, hard gates,
unsupported additions, and output length separately. Style, confidence, and
explicit checkpoint vocabulary never substitute for a correct decision.

Invalidate a cell if its packet reveals the evaluator diagnosis, the output is
empty/truncated, a tool or source outside the packet is used, or the execution
profile differs. Retain failures and duplicates; deterministic duplicates
reduce effective repetition.

## Frozen execution identities

Both profiles use `codex-cli 0.146.0`. Their only intended profile difference
is the requested model route.

| Surface | Stage-one profile | Second profile |
|---|---|---|
| Requested model | `gpt-5.6-sol` | `gpt-5.6-terra` |
| Reasoning policy | `low` | `low` |
| Context/history | exact stdin packet only; ephemeral; user config and rules ignored; no repository context | same |
| Working directory | `/private/tmp` | same |
| Tools and permissions | harness surface may exist, but packet forbids use; `read-only` sandbox; any external source/tool use invalidates the output | same |
| Completion contract | one final answer retained by `-o`, plus complete `--json` event stream and stderr | same |
| Duration | no experiment-side timeout; record UTC start/end and wall duration | same |
| Scheduling | one process at a time in a pre-frozen randomized order | balanced randomized order frozen before second-profile execution |
| Sampling controls | no seed or temperature control exposed by this CLI surface | same |
| Route evidence | retain requested route, CLI version, process exit, and any route/session identity exposed in JSONL; absence of provider identity is recorded, never inferred | same |

A run-identity mismatch means any specified field above differs or cannot be
reconstructed from its retained launch record. CLI warnings before execution
are retained but do not invalidate a run unless they change one of these fields
or prevent the final answer.

## Baseline qualification gate

Run only B first: `2 tasks × 2 languages × 3 fresh processes = 12` outputs.
The campaign advances only if every task-language stratum has headroom: at most
one of three outputs is fully correct at the task level, no stratum is floor,
and no execution boundary dominates. If a stratum is ceiling, floor, or
invalid, retain the campaign as nondiscriminating and stop before treatment
runs. Do not replace a task after seeing these outputs.

The exact execution profile and randomized launch order are frozen in
[`baseline-order.json`](baseline-order.json). Each run uses:

```text
codex exec --ephemeral --ignore-user-config --ignore-rules \
  --skip-git-repo-check -m gpt-5.6-sol \
  -c model_reasoning_effort="low" -s read-only -C /private/tmp \
  --json -o <opaque-id>.out - <packet>
```

Stdout JSONL, stderr, final output, launch identity, and exit result are retained
per opaque ID. The provider exposes no reproducible seed through this surface.

## Frozen scorer ownership

- The campaign owner performs mechanical checks and reconstructs claimed facts
  against the frozen sources; it does not act as the sole semantic scorer.
- The primary semantic scorer is a fresh, non-producing sub-agent using
  `gpt-5.6-terra` with `high` reasoning. It receives task ID, language, frozen
  worker packet, task rubric, and opaque outputs, but no condition, launch
  order, producing model, or campaign hypothesis.
- Any semantic ambiguity or disagreement affecting a gate is adjudicated by a
  second fresh, non-producing sub-agent using `gpt-5.6-sol` with `high`
  reasoning under the same blindness. The adjudicator must cite packet text and
  output text; the campaign owner records, but cannot silently replace, that
  judgment.

Scorer prompts, raw score sheets, disagreements, and adjudications are retained.
Language is necessarily visible; condition and producing profile are not.

## Treatment and second-profile gates

If baseline qualification passes, run K/KP/KE/KR for 48 additional outputs.
Opaque IDs and balanced randomized order are frozen before execution. Semantic
scorers receive task/language and source packet but not condition or model.
Mechanical facts and source boundaries are checked separately; disagreements
remain explicit until source-linked adjudication.

A contrast advances only when treatment is fully correct in at least two of
three outputs while control is fully correct in at most one of three, in at
least three of four task-language strata; it must not reverse by two outputs in
the fourth, violate a hard gate, or rely only on style/length.

The second execution profile is predeclared as `gpt-5.6-terra`. It is a second
OpenAI model profile, not a different model family. Only the strongest
pre-registered qualifying contrast advances, selected by: most qualifying
strata, then most hard-gate-safe primary-action gains, then K/KR before
information-addition contrasts. Repeat both arms on the same two tasks and both
languages, three times: 24 outputs. This can support cross-profile transfer on
these tasks only, never model-family or task-population portability.

## Authority

The campaign supplies research evidence. It cannot adopt a Principle, bulk-edit
Skills, establish a neural mechanism, accept a model, or authorize allocation,
integration, publication, or Mission settlement.
