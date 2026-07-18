# Model Evaluation v2 Validity Gate

**Date:** 2026-07-18

**Status:** action and boundary behavior supported; attribution remains bounded

## Claim

Given raw comparison facts, the revised
[`model-evaluation` skill](../../skills/model-evaluation/SKILL.md) should check
comparison validity before interpreting outcomes. It should detect both domain
answers disclosed in a worker-visible packet and multiple material profile
differences, preserve the remaining protocol observations, and refuse a bare
model or automatic allocation claim.

The disconfirming observation was a response that returned `inconclusive` for a
secondary reason such as sample size while overlooking either design defect.

## Matched action probe

A fresh OpenCode Go DeepSeek V4 Flash Work Cell received the same prompt and the
same [raw comparison facts](fixtures/2026-07-18-model-evaluation-validity-raw.md)
on every run. It could also read the skill and the concrete
[Kimi](../../packages/work-cell/src/providers/kimi-coding.ts) and
[OpenCode Go](../../packages/work-cell/src/providers/opencode-go.ts) provider
implementations. The prompt asked what capability or allocation claim the facts
support; it did not state the expected diagnosis. Thinking remained disabled
and temperature remained 0 through the same driver path.

| Skill treatment | Run | Tokens | Observation |
|---|---|---:|---|
| guidance dispersed through ordinary method steps | `fdaf2b18-beaa-46c5-8bbd-f9be6f137255` | 8,546 | Returned `inconclusive`, but missed both answer leakage and the inference-policy confound. Failed. |
| validity gate added before outcome analysis | `c8d85207-f4f3-4884-a745-bf97568c3367` | 8,758 | Detected the multi-member profile difference, but still treated domain answers in `acceptance` as ordinary criteria. Partial. |
| gate distinguishes procedural conditions from domain conclusions | `c229f0e1-75b0-4bca-a229-a9aad205c3c8` | 8,968 | Detected both defects, limited evidence to answer-following and whole-profile observations, and requested matched policies plus evaluator-only criteria. Supported. |

The retained ignored record hashes are respectively
`c8a6b63e9ccc566f8926161b74fe238deb61aab19285feff3355217185eadf57`,
`542128bdb22c418c4b24b71bc780f578e67e92749c1da9e45b46ca3794367e31`,
and `d845ee8d49ef26716003ed413497b417d53615652b83e1deef9cdc259467ddd4`.
The first two failures remain retained rather than being overwritten by the
successful treatment.

An earlier probe that read the already corrected held-out report also reached
the desired conclusion, but it is excluded from action evidence because the
supplied source already contained the diagnosis.

## Boundary probe

A separate fresh Cell received only the skill and the retained
[Kimi provider integration report](2026-07-16-kimi-coding-provider.md), then
asked whether a quota or availability observation supports a capability or
degradation conclusion. Run `667df654-53cd-4381-877f-abdc91f1f2ec` used 6,748
tokens and declined both claims because no real task population, repeated
outcomes, or accepted baseline was present. It routed the next step back to a
bounded capability evaluation rather than manufacturing a benchmark. Its
retained record hash is
`c74ff7e1b369ee7b6b2330a8b9791d4599ceac3f9f133603d47b96ff1cf2ecee`.

## Mechanism evidence

The [v2 runtime](../../packages/work-cell/src/adapters/model-evaluation/runtime.ts)
now requires context and tool-surface policies plus a
`declaredInferencePolicy`. The name preserves its status as a claim rather than
pretending the adapter verified provider-internal settings. A case separates
worker-visible acceptance from evaluator-only reference criteria; the judge
receives only the latter, and the schema rejects normalized exact duplicates.
The durable record preserves both layers and calls route metadata
`selectedRouteIdentities` rather than claiming a verified hidden backend.

Deterministic tests prove the separation, duplicate rejection, balanced isolated
execution, failure retention, and judge-failure behavior. Semantic paraphrase
leakage remains a methodological judgment owned by the validity gate; the schema
does not pretend to solve it mechanically.

## Decision

The gate is ready for this first use. The supported behavior is narrow: it
prevents an invalid comparison from being promoted into a model capability or
allocation claim. It does not validate the original K3 versus Flash capability
comparison, admit either profile, or establish that one model is generally
better.
