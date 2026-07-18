# Model Capability Evaluation Seed

**Date:** 2026-07-18

**Status:** mechanism supported; capability evidence remains a probe

**Decision:** [037 — Model Capability Evaluation Seed](../../design/decisions/037-model-capability-evaluation-seed.md)

## Question

Can one small method and Work Cell adapter compare two explicit execution
profiles on repeated real repository-judgment tasks while preserving selected
route identity, failures, blind evidence, usage, and human admission authority?

The probe also asks a second, related question: can the same evidence expose a
prompting hypothesis without confusing a prompt/profile interaction with an
intrinsic model capability claim?

## Evaluated object and retained inputs

The evaluated object was the whole execution profile, not a bare model name.
Both profiles used AI SDK v7, the same frozen read-only fixture, task packet,
tools, output schemas, permissions, and serial schedule:

1. `kimi-coding-k3-ai-sdk-v7-readonly-v1`, routed to
   `ai-sdk-v7/kimi-coding/k3` through the direct Kimi Coding route; and
2. `opencode-go-deepseek-v4-flash-ai-sdk-v7-readonly-v1`, routed to
   `ai-sdk-v7/opencode-go/deepseek-v4-flash` through the direct OpenCode Go
   route.

An independent direct DeepSeek API route using `deepseek-v4-flash` performed
blind semantic comparison. The manifest SHA-256 was
`1450dc16dd72545d49a5bc55f95ad10c140631e288965264a457fd6cfa60c9cb`; the
result record SHA-256 was
`5a9744d9109e6f9bf312824747f263af922db8877c2037ef11c64e2495d5acd2`.
The run lasted from `2026-07-18T08:27:21.909Z` to
`2026-07-18T08:29:59.672Z` and retained 12 isolated trials: three cases, two
profiles, and two repetitions.

The cases asked the profiles to recover:

- the model-evaluation adapter versus generic Cell-core boundary;
- provider authority, declared routing, and selected route-identity evidence;
  and
- routing boundaries among `model-evaluation`, `work-estimation`, and
  `agent-environment`.

These were real accepted repository decisions and skill boundaries, not public
benchmark questions. They exercise a narrow repository-cognition and structured
settlement claim only.

## Trial evidence

`passed` below means that Work Cell's mechanical completion and output contract
settled. It does not mean that the semantic answer was accepted.

| Case | Profile | Repetition | Cell status | Read-file calls | Semantic observation |
|---|---|---:|---|---:|---|
| adapter/core | Kimi | 1 | passed | 0 | Returned `inconclusive` and “pending investigation” with directory-like paths. |
| adapter/core | Kimi | 2 | failed | 0 | Structured response did not match the schema. |
| adapter/core | OpenCode Go | 1 | passed | 8 | Correctly kept domain vocabulary in the adapter and cited the governing files. |
| adapter/core | OpenCode Go | 2 | passed | 8 | Repeated the same supported boundary. |
| provider authority | Kimi | 1 | passed | 0 | Returned `investigating` placeholders. |
| provider authority | Kimi | 2 | failed | 0 | Structured response did not match the schema. |
| provider authority | OpenCode Go | 1 | failed | 8 | Investigated the relevant sources, then failed final JSON parsing. |
| provider authority | OpenCode Go | 2 | passed | 8 | Correctly separated credential authority, declared route, and served target. |
| method routing | Kimi | 1 | passed | 0 | Returned `placeholder` for every requested boundary. |
| method routing | Kimi | 2 | passed | 0 | Returned `pending` for every requested boundary. |
| method routing | OpenCode Go | 1 | passed | 3 | Correctly routed all three concerns and preserved their authority boundaries. |
| method routing | OpenCode Go | 2 | passed | 3 | Repeated the same supported routing. |

The failed OpenCode Go provider-authority run retained eight `tool.read_file`
trace events even though it had no final structured output or `rawSteps`. The
paths include decisions 027, 036, and 037 plus the model-evaluation runtime,
Cell contracts, model route, provider profile, and validation model. Failure
therefore remained auditable rather than being converted into “no evidence.”

## Variation, judgment, and resources

Kimi produced four mechanically passed and two failed Cells, but none of its
six trials performed the investigation or satisfied the semantic task. Its six
runs used 4,732 total tokens, including 1,536 cached input tokens, with a mean
duration of 12,699 ms.

OpenCode Go produced five mechanically passed and one failed Cell. Five trials
performed the requested investigation and reached the supported repository
decision; one of those five failed only at final structured parsing. Its runs
used 131,636 total tokens, including 47,360 cached input tokens, with a mean
duration of 12,738 ms.

The raw token totals are not an efficiency comparison. Kimi's low usage came
with zero file reads and non-answers, while OpenCode Go actually loaded the
evidence. The first two case comparisons were correctly marked inconclusive
because at least one trial was unsettled. On the fully settled method-routing
case, the blind judge preferred the OpenCode Go candidate and marked all four
acceptance conditions passed for it and failed for the placeholder candidate.

## Disconfirming observation and correction

The first judge contract asked one model judge to assign named failure classes.
It labelled a placeholder response as a `universal-coordinator` failure even
though the retained output did not support that causal classification. A
stronger prompt repeated the mistake. The mechanism was therefore wrong, not
merely under-instructed: the judge now reports acceptance evidence, findings,
and preference only. Named failure classes remain review lenses in the durable
case record and require independent or human admission. A focused replay of the
corrected judge contract retained the same OpenCode Go preference and acceptance
findings without manufacturing a typed failure cause.

## Prompting hypothesis exposed by the evaluation

AI SDK warned that Kimi `k3` does not support `responseFormat`. Across six runs,
the profile either emitted schema-shaped placeholders or failed schema
validation, and it never called the available read tool. The narrow supported
claim is therefore that **this exact Kimi Coding, k3, AI SDK v7, output-schema,
and read-tools profile is currently unsuitable for these repository-judgment
tasks**.

That is not evidence that Kimi k3 is globally incapable. The strongest
alternative explanation is a prompt/protocol interaction: the structured-output
constraint may dominate evidence gathering for this adapter. The next probe
should keep model, route, fixture, read tools, and acceptance fixed while
changing only the prompting/completion treatment—for example separating
investigation from final structure or removing native response-format pressure.
These three discovery cases must not then be reported as held-out confirmation;
the revised profile needs separate retained cases.

That probe is now retained in the
[Kimi structured-settlement evaluation](2026-07-18-kimi-structured-settlement.md).
It rejected a prompt-only repair, isolated unsupported structured completion as
the behavior-changing condition, and verified a two-phase compatibility path.
The original six runs remain valid evidence about the original execution
profiles and the completion-protocol defect. The later
[held-out run](2026-07-18-model-capability-heldout.md) confirms that the repair
restores investigation and structured settlement. It does not confirm a model
capability comparison: the worker-visible acceptance disclosed the expected
answers, and K3 thinking plus deferred settlement was compared with non-thinking
Flash plus inline settlement.

OpenCode Go was operationally faster on these simple cases, but neither run
supports a broader model ranking. With only three cases and two repetitions, no
reusable profile is admitted and no automatic route should change.

## Deterministic and projection evidence

The adapter tests establish balanced alternating order, isolated fixture copies,
blind packets without profile identity or performance fingerprints, selected
route-identity aggregation, retained runner failure, judge skipping for
unsettled trials, preservation after judge failure, and fixture-overlay
containment. Work Cell type checking and the full test suite are the mechanical
acceptance gate. The installable skill also passes snapshot, standalone-install,
and frontmatter validation; the documentation projection builds the skill into
the public site.

## Decision

Keep the method/adapter boundary and the candidate-evidence authority. The seed
is useful enough to continue, but it does not yet justify a durable capability
profile, leaderboard, automatic allocator, or degradation canary. The completed
prompt treatment preserves that boundary: K3's investigation defect is
repaired, while the v1 held-out design is disqualified from capability
comparison. Treat prompting exploration as a first-class output of capability
evaluation while preserving discovery/confirmation separation.
