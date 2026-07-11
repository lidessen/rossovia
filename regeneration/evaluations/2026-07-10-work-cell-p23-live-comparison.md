# Work Cell — P23 Live Comparison

**Status:** Work Cell vertical slice supported; P23 result `overlap`
**Date:** 2026-07-10
**Runtime:** independent `packages/work-cell`, AI SDK 6.0.223,
`@ai-sdk/deepseek` 2.0.47, `deepseek-v4-flash` non-thinking mode
**Evaluator:** fresh blinded `deepseek-v4-flash` structured judge call

## Claim

The independent [Work Cell architecture](../../design/decisions/007-independent-work-cell-runtime.md)
can express a task-specific P-ID team from the Sequence, run matched isolated
repository tasks with and without one separately labelled candidate treatment,
mechanically settle each cell's declared checks, retain full run evidence, and
produce a blinded attribution result without depending on another agent engine.

The candidate claim under test was narrower: adding [P23 bounded
autonomy](../../principles/candidates/bounded-autonomy.md) should change a skill
rewrite beyond the P11/P13/P15/P16 baseline by protecting useful agent-owned
process space.

## Fixture and protocol

The frozen [experiment specification](../../packages/work-cell/experiments/p23-bounded-autonomy.json)
copied a deliberately stage-heavy artifact-organization skill fixture, overlaid
the current Sequence and interpretations, and created separate baseline and P23
workspace copies. Both variants received the same intent, tools, budget, and
five acceptance conditions. Only the treatment received the candidate line and
its boundary.

Each cell first saw only the one-line Sequence. Both independently expressed:

- **Lead:** P16
- **Supports:** P13, P15, P04

The runtime validated those IDs and loaded only the four corresponding
interpretations before execution. Both cells then edited only `SKILL.md`, called
the structured terminal submission tool, and supplied their own mechanical
check plans. The environment executed every declared check before settlement.

The judge received candidates labelled only `A` and `B`; the treatment metadata
and input instructions were absent from its evidence type. The random blind map
was `A = p23-treatment`, `B = baseline`.

## Runtime failures retained during convergence

The first live attempt failed before gene expression because DeepSeek V4's
default thinking mode rejected a forced `tool_choice`. The adapter now requests
non-thinking mode explicitly for deterministic tool protocol calls.

The second attempt completed gene expression and modified both workspaces but
failed terminal submission: the model encoded a nested `artifact` object as a
JSON string, then exhausted the token budget while repairing the invalid tool
call. The adapter now exposes a flat provider-facing terminal schema and maps it
into the unchanged core `CellSubmission` contract. The experiment runner also
skips judging any pair without two fully settled cell trees, preventing a failed
pair from being mislabeled `overlap`.

These failed attempts are local raw evidence, not P23 evidence. They changed the
adapter and comparison validity gates.

## Accepted live result

| | Baseline | P23 treatment |
|---|---:|---:|
| Cell status | `passed` | `passed` |
| Changed files | `SKILL.md` only | `SKILL.md` only |
| Expressed team | P16 + P13/P15/P04 | P16 + P13/P15/P04 |
| Mechanical checks | 6/6 passed | 10/10 passed |
| Total tokens | 63,533 | 74,601 |
| Cached input tokens | 52,480 | 62,720 |
| Estimated cell cost | $0.00215174 | $0.00245272 |
| Result length | 70 lines | 102 lines |

The blinded judge evaluated all five acceptance conditions as passing for both
variants. It found that both removed the fixed seven-stage workflow and
permanent campaign directory, preserved authority/evidence/routing/verification
boundaries, and allowed the agent to choose its investigation order. It returned
`preferred: tie`, which maps to **`overlap`**.

The judge used 41,408 tokens (512 cached input tokens). Its material finding was
that the longer treatment result added no decision or boundary that the baseline
lacked.

## Raw evidence and integrity

The runtime retained full step/tool traces, submissions, usage, checks, diffs,
and judge output under the ignored local directory:

`packages/work-cell/.work-cell/experiments/p23-bounded-autonomy-skill-expression-XTmO6Z/`

Because raw traces can contain complete workspace content, they are not promoted
automatically. The accepted run's integrity anchors are:

- experiment record: `55c712bcac49e9d3758c588c5679f225eee3b76800006e1b233d3f53ef5cf42f`
- baseline cell: `9d1c812d913eae8567296ed2a2d0000a9b2f190dfabb01175e81b3c34fea9fcc`
- treatment cell: `30497e4e1e0d394c32f56ef7eafc4785e87d8688e13ad4a1640cbaeb93dc8100`
- baseline diff: `c8e23a9c3e172e83f47ffcca04884d9439ba6dab3218f17b14bb500b5e3bdf47`
- treatment diff: `e87bc31e2bfd29d06d9209cf777b54c3154a88bbad295b12ae095f3e80c60d58`

This local path is mutable and machine-local; the hashes and this summarized
record preserve the accepted observation, not a portable replay bundle.

## Decision

- Retain the independent Work Cell implementation for further dogfood. The live
  run supports Sequence-targeted gene expression, isolated tool execution,
  structured submission, environment-side checks, cost capture, and blinded
  comparison.
- Record the P23 skill-expression probe as **`overlap`**. P15/P16 plus P11/P13
  already produced the same material autonomy boundary on this task.
- Do not adopt P23 and do not modify the Sequence. One planned multi-actor
  contract probe remains distinct and may expose a different boundary; until
  then P23 remains a candidate with weakened independent-decision evidence.

## Limitations

- One fixture and one repetition cannot establish cross-task behavior.
- Worker and judge used the same model/provider, though separate fresh calls.
- The fixture is a bounded repository snapshot rather than a long-running user
  project with external consequences.
- Mechanical checks establish declared structural properties; the blinded model
  judge supplied semantic comparison and is not human acceptance.
