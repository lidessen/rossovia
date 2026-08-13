# DeepSeek V4 Flash 0731 capability refresh

**Date:** 2026-08-04

**Status:** held-out confirmation rejects durable profile admission; no-admission decision accepted

## Question

After the public `deepseek-v4-flash` alias changed on 2026-07-31, what can the
current official route reliably do on bounded repository-judgment work, and
which supported thinking level is a practical default under a 180-second Cell
boundary?

This refresh evaluates whole execution profiles, not a model label in
isolation. The retained field, manifests, fixtures, invalid preflight, and raw
records are in the
[evidence directory](evidence/2026-08-04-deepseek-v4-flash-0731/README.md).

## Current public identity and provenance boundary

The [DeepSeek changelog](https://api-docs.deepseek.com/updates/) says the public
Flash alias moved to `DeepSeek-V4-Flash-0731` on 2026-07-31 after new
post-training. The evaluation records nevertheless retain only the requested
alias and selected provider route because their driver path did not yet project
`system_fingerprint`. A subsequent
[11-token capture probe](evidence/2026-08-04-deepseek-v4-flash-0731/fingerprint-capture-probe.md)
verified the repaired provider-metadata path. The
[Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/)
documents the value only as an opaque backend-configuration identifier, so
neither the old absence nor the new value proves a named hidden revision.

The initial OpenCode Go route was rejected as comparison evidence. It required
an explicit China-hosting opt-in that had not been authorized, failed before
model execution, and retained zero usage. The official direct API became the
valid route; no opt-in was inferred.

## Non-thinking Flash versus Pro control

The first valid field held provider, AI SDK v7 adapter, read-only fixture,
temperature 0, disabled thinking, inline JSON completion, cases, schedule, and
three repetitions constant. It ran 18 trials: three cases by two profiles by
three repetitions.

| Profile | Settled | Failed | Mean duration | Recorded tokens | Estimated marginal cost |
|---|---:|---:|---:|---:|---:|
| Flash | 5/9 | 4/9 | 46.59 s | 226,514 | $0.01783 |
| Pro control | 5/9 | 4/9 | 49.16 s | 343,648 | unavailable |

The result does not rank Flash and Pro. Most failures occurred after useful
source-grounded investigation because inline structured completion produced no
parseable object. All three semantic comparisons were therefore correctly
inconclusive. The similarity of the failure shape across both profiles makes
the completion protocol the strongest explanation, not equal model ability.

This discovery changed the direct DeepSeek adapter: structured output now uses
a separately verified tool-settlement phase by default. That repaired path was
then used for the inference-level development experiment. Because these same
cases exposed and shaped the repair, they are not held-out confirmation.

## Thinking-level development experiment

DeepSeek's current [thinking-mode guide](https://api-docs.deepseek.com/guides/thinking_mode/)
documents requested `low`, `high`, `xhigh`, and `max` values and says thinking
mode ignores sampling controls such as temperature. Flash maps `xhigh` to the
same effective `high` level, so the experiment does not spend a separate field
on that alias. Thinking mode supports tools but rejects a forced tool choice.
The first low/high attempt confirmed that incompatibility: all eight trials
investigated, then failed with `Thinking mode does not support this tool_choice`.
Those records remain protocol evidence, not model failures.

The adapter now passes the requested effort explicitly and lowers only forced
`required` or named tool selection to `auto` while Work Cell retains independent
schema verification. The repaired v2 development runs produced:

| Matched field | Level | Settled | Cancelled | Duration range | Recorded tokens | Estimated cost |
|---|---|---:|---:|---:|---:|---:|
| two cases, two repetitions | low | 4/4 | 0/4 | 59.79–129.03 s | 250,870 | $0.02054 |
| two cases, two repetitions | high | 2/4 | 2/4 | 127.10–180.01 s | 151,208 | $0.02635 |
| one repeated case, two repetitions | high | 1/2 | 1/2 | 123.27–180.01 s | 68,876 | $0.01107 |
| one repeated case, two repetitions | max | 1/2 | 1/2 | 166.49–180.00 s | 60,415 | $0.01297 |

The two high cancellations in the larger field were both on the seeded runtime
review. On the repeated delegation case, both high and max passed once and
timed out once. A passed output at each level recovered the governing boundary,
but this field cannot establish a quality advantage: unsettled repetitions
prevented comparison, and Kimi K3's inline structured judge also failed to
settle the otherwise complete low/high delegation comparison.

## Held-out confirmation

The confirmation field froze two tasks that did not expose or shape either
adapter repair: a previously reserved namespace-migration review from commit
`19d59df9a850f660f9a3f311314288e0143c9cd6`, and a new cross-layer recovery and
task-acceptance boundary. The historical migration source hash matches its Git
object. `heldout-inputs.sha256` binds the two-case manifest and eight
worker-visible source files. Both profiles used the same direct Flash alias,
read-only fixture, AI SDK v7 adapter, verified tool settlement, two repetitions,
balanced serial order, and 180-second Cell boundary; only disabled thinking
versus requested `low` differed.

| Profile | Settled | Cancelled | Mean duration | Recorded tokens | Estimated cost |
|---|---:|---:|---:|---:|---:|
| non-thinking | 4/4 | 0/4 | 89.34 s | 208,281 | $0.02967 |
| low | 2/4 | 2/4 | 137.80 s | 137,427 | $0.02488 |

The two low cancellations were both the migration review, each at the exact
180-second boundary after retaining 31,497 and 33,591 tokens. Non-thinking
settled that case twice, but did not satisfy the evaluator-only semantic gate:
one run reconstructed the pre-marker retry lockout but downgraded it to residual
risk, while the other missed that blocking defect and approved with findings.
Both profiles settled the narrower recovery-boundary case twice and consistently
allowed only exact recovery while withholding immediate local acceptance and
reuse of the consumed launch receipt.

The Kimi K3 judge path first passed an exact-route synthetic positive control in
one tool call, returning `tie` with full criterion coverage and 1,010 tokens.
That proves the repaired private-tool protocol can settle, not that it is robust
to long real evidence. In the confirmation run, the migration comparison was
correctly skipped because low had unsettled trials; K3 then failed to call the
settlement tool after one recovery on the otherwise complete recovery-boundary
comparison. That historical record reports zero judge usage because the
pre-fix failure path discarded the two unsettled attempts; it is not evidence
that the provider calls consumed no tokens. The repaired path now retains both
attempts and their usage while still returning an inconclusive judgment. No
blind preference is manufactured. The worker records and a
named independent review therefore carry the semantic assessment, while the
automated judge remains absent for this field. The
[named independent read-only review](evidence/2026-08-04-deepseek-v4-flash-0731/heldout-independent-review.md)
reconstructed the frozen criteria from the eight retained trial records and
recommended admission of neither profile.

## Allocation decision

For bounded, read-only repository review using this direct DeepSeek route and a
180-second Cell envelope:

- `low` is no longer a default candidate. It was the strongest development
  candidate, but failed to settle either held-out complex code review. Use it
  only as an explicit experiment with a larger budget or a smaller task packet.
- `high` and `max` are not daily defaults. They require a larger explicit time
  budget and a task whose expected value justifies right-censored outcomes.
- non-thinking is the more reliable settler under this envelope, but its two
  migration verdicts were not acceptance-grade. It may be used as a bounded
  candidate producer with independent verification, not admitted as a durable
  capability profile or semantic-review default.
- no global coding, long-horizon autonomy, write safety, or Pro-equivalence
  claim follows from these read-only cases.

The Principal accepted explicit **no admission** for both profiles on
2026-08-05. No provider preference changed. The decision reopens if a new
public backend or adapter changes execution identity, a larger duration
envelope is deliberately evaluated, or a new held-out field shows a
repeatable settlement and semantic-acceptance improvement. The opaque backend
fingerprint was identical across both profiles and all observed confirmation
runs; it detects a serving-configuration change but does not prove the named
public revision.

## Next confirmation

Do not tune or rerun these held-out cases as confirmation. Retain them as the
falsifying field. A later admission attempt needs new accepted tasks, a
predeclared duration envelope, the repaired worker settlement path, exact route
and opaque fingerprint retention, and a judge that passes both its synthetic
control and a representative evidence-volume control before seeing held-out
outputs. The accepted no-admission remains in force until one of those reopening
observations produces new accepted evidence.

## 2026-08-12 Workbench observation

An ordinary supervised Workbench Task→Work Cell loop produced two
whole-execution-profile observations the same day. They are scheduling and
task-shape observations only. They are **not a matched Flash-versus-Pro
comparison**, so no claim follows that Pro is weaker than Flash, that thinking
level causes the difference, or any price conclusion.

The Blog observation is a Flash `high` run on the bounded write task
`a83768b1-1218-4527-ab9e-e6180448877c` (localize the agent-era-blog development
preview to simplified-Chinese semantics), bound to the
`agent-era-blog/chinese-first-preview` worktree. A fresh attempt
(`3acf5aec-aaa1-4ce4-95b1-967d534c41cb`) settled in 74.7 s with session
`ses_00848fab7ffeiyd0Hhg045Hij3`; an explicit same-session continuation
(`673912d0-ebc8-4d67-8b15-0adccf7fdc2b`) settled in 44.8 s. The continuation
input contained the Principal correction (the Task's correction record itself
carries no delivery evidence), and the final Work Cell record retained that
input together with the same observed session; the result was verified,
independently reviewed, and closed at commit
`50caa7e5d53b75564f715ba96abe61cad86aedc8`. This is a bounded write completing
with an in-session correction under the 300-second envelope.

The Pro observation is the adapter-implementation Task
`b7c3a59e-aec2-4fe2-b025-4f829dec39f4` (retain observed usage on a cancelled
OpenCode attempt), bound to the `workbench-cancelled-usage` worktree. Three
attempts — Pro `high` (`d21612a9-b181-4569-bda0-59e0cf181e74`), Pro `high`
(`1a62e13f-5955-4132-8c17-c0f5f764c87f`), Pro `low`
(`14b76c23-9009-4a63-9bac-4c6f2a534f29`) — each ran to the 300-second
right-censoring boundary (300,725 / 300,738 / 300,736 ms), each reported a zero
workspace diff, no retained session, and top-level usage of 0, and each failed
settlement because the final record did not retain the observed session id.
The OpenCode runtime trace retained non-zero usage for all three (total tokens
1,169,704 / 495,996 / 469,323), but that usage was not carried into the final
top-level usage, so the final `0` is an observation gap rather than proof that
execution never started. The settlement record owns only `runner-failed` and
does not itself discard or attribute usage.
The failed adapter-only candidate (`1cfaaed8beb70f09de3eb4472b402a185da70711`)
was fully reverted by commit `5d67f067c57a47ee1f39d71336533ca8d645bb1f`, whose
tree equals the baseline commit `1f83296...` (the revert is not the baseline
commit itself), so the Task closed as **no-change**, accepted after an
independent review. For
the current profile and this adapter implementation form the 300-second
envelope is `unsupported-escalate`: the implementation moved to a native worker
and the DeepSeek attempts remain failure and budget evidence.

Two boundaries are preserved. First, the three Pro cancellations, the failed
Codex candidate, its revert, and the no-change closure are retained as
evidence; none of them is a capability admission. Second, top-level
`usage = 0` on a cancelled run does not mean the model never started — the
final Work Cell record did not incorporate the non-zero usage already retained
in the OpenCode runtime trace, so that zero is an observation gap, not proof of
non-execution. Flash's Blog run
is a bounded write success, but it is a single accepted Task, not a held-out
field; combined with the unmatched Pro timeouts it forms no reusable admission
and changes neither the accepted 2026-08-05 no-admission nor provider
preference.
