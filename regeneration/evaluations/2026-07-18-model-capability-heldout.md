# Model Capability Held-out Run

**Date:** 2026-07-18

**Status:** protocol evidence retained; capability comparison invalidated

## Question

Did the deferred structured-settlement repair make the revised Kimi Coding K3
profile capable of repeated source-grounded repository boundary reasoning on
cases that did not teach the repair, and is that profile stable enough to guide
task allocation?

The comparison retained the existing OpenCode Go DeepSeek V4 Flash profile as
a matched control. This is a confirmation of one narrow execution profile, not
a general model ranking.

## Frozen field and identities

The frozen manifest SHA-256 was
`5e0d43b58de55e43505a3e4b40f369f05cae608d132cad41395896a9e994eece`.
The resulting evaluation record SHA-256 was
`8f59aaf5890cff45bd8268b5c8b848289106482ec5ef508b5c285636b401d609`.
The local raw record remains beneath the ignored
`.work-cell/heldout-confirmation/results/model-capability-heldout-2026-07-18-vnqBgc/`
directory. The run lasted from `2026-07-18T09:47:27.781Z` to
`2026-07-18T10:04:01.806Z`.

Both profiles received the same frozen files, read-only tool surface, task
instructions, output shapes, 300-second Cell boundary, and serial alternating
schedule. They did **not** receive matched inference or completion policies:

1. `kimi-coding-k3-ai-sdk-v7-tool-settlement-readonly-v2` selected
   `ai-sdk-v7/kimi-coding/k3`, with thinking enabled, interleaved reasoning
   history, temperature 1, and deferred structured settlement; and
2. `opencode-go-deepseek-v4-flash-ai-sdk-v7-inline-readonly-v1` selected
   `ai-sdk-v7/opencode-go/deepseek-v4-flash`, with thinking disabled and inline
   JSON settlement.

Those identifiers are observed route targets, not cryptographic proof of the
providers' hidden backend build or revision.

A direct DeepSeek API `deepseek-v4-flash` call was the blind semantic judge.
Neither held-out case appeared in the
[structured-settlement discovery and repair](2026-07-18-kimi-structured-settlement.md):

- **completion-contract orthogonality** used
  [decision 033](../../design/decisions/033-work-cell-terminal-contract.md),
  [`contracts.ts`](../../packages/work-cell/src/contracts.ts),
  [`run-cell.ts`](../../packages/work-cell/src/run-cell.ts), and
  [`ai-sdk-driver.ts`](../../packages/work-cell/src/ai-sdk-driver.ts) to ask what
  `terminalTools`, `outputSchema`, and artifacts independently prove; and
- **orchestration carrier boundary** used
  [decision 031](../../design/decisions/031-extensible-work-cell-orchestration.md),
  [`contracts.ts`](../../packages/work-cell/src/contracts.ts),
  [`orchestration.ts`](../../packages/work-cell/src/orchestration.ts), and
  [`swarm.ts`](../../packages/work-cell/src/swarm.ts) to recover the split among
  Cell core, static Swarm, orchestration kernel, and open WorkSource policy.

## Repeated outcomes

`passed` below means that Work Cell settled mechanically and validated the
declared output schema. Semantic acceptance is reported separately.

| Case | Profile | Repetition | Status | Reads | Duration | Recorded tokens |
|---|---|---:|---|---:|---:|---:|
| completion contracts | Kimi | 1 | passed | 4 | 148,557 ms | 33,841 |
| completion contracts | Kimi | 2 | passed | 4 | 199,191 ms | 34,899 |
| completion contracts | OpenCode Go | 1 | passed | 4 | 10,453 ms | 16,632 |
| completion contracts | OpenCode Go | 2 | passed | 4 | 10,048 ms | 16,584 |
| orchestration boundary | Kimi | 1 | cancelled | 4 | 300,005 ms | 0 at the top level; 20,987 retained in trace |
| orchestration boundary | Kimi | 2 | passed | 4 | 295,143 ms | 35,130 |
| orchestration boundary | OpenCode Go | 1 | passed | 4 | 10,575 ms | 15,925 |
| orchestration boundary | OpenCode Go | 2 | passed | 4 | 11,444 ms | 15,876 |

Every run used all four supplied sources. This directly disconfirms the
zero-read behavior of the original K3 profile and supports the discovery
claim: unsupported inline schema pressure, not a general inability to use the
read tool, caused the original placeholders.

All seven settled outputs satisfied the manifest's semantic conditions under
human inspection. However, those same conditions were included verbatim in the
worker-visible `task.acceptance` field. They supplied the expected repository
boundaries before investigation, so correctness here cannot distinguish
discovery from answer following. The outputs and reads remain useful protocol
evidence, not valid held-out capability evidence.

The Kimi outputs were substantially more verbose, but verbosity is not
capability evidence. The cancelled Kimi run read all sources and completed a
main model step, then exhausted the remaining Cell duration during deferred
structured settlement. Its logical output did not settle and was not accepted.

## Variation and resource observations

Kimi settled three of four runs. Its recorded duration ranged from 148,557 to
300,005 ms with a mean of 235,724 ms. The three completed records contain
103,870 tokens. The cancelled trace contains another 20,987 observed tokens,
so 124,857 is the auditable minimum for the four runs; the original profile
summary under-reported that total because its outer timeout won the driver
race before a `DriverResult` returned.

OpenCode Go settled four of four runs. Its duration ranged from 10,048 to
11,444 ms with a mean of 10,630 ms, and the four records contain 65,017 tokens.
This is a large and repeated latency difference for this task shape, not a
price comparison: both are subscription routes and neither run record claims a
marginal dollar cost.

The 24,000-token estimate with a declared plus-or-minus 100 percent tolerance
contained every settled result and the cancelled run's observed minimum. The
300-second duration was an explicit execution boundary, not a forecast. One
Kimi run used all of it, so task allocation cannot currently assume that this
profile will settle a small four-file boundary question within five minutes.
That run is right-censored evidence. One cutoff does not establish random
instability or reveal how long unconstrained completion would have taken.

## Why the result looked unlike public reports

The apparent conflict came from evaluating a different object and then naming
the conclusion too broadly. [Kimi's K3 model guide](https://www.kimi.com/code/docs/en/kimi-code/models.html)
positions K3 as the most capable option for long-horizon coding and says it used
maximum thinking by default at launch. Its
[benchmark guidance](https://platform.kimi.com/docs/guide/benchmark-best-practice)
allows coding runs up to 256k tokens and describes agentic tasks that may take
100–300 steps. A five-minute, four-file extraction task is therefore poorly
shaped to test the advertised long-horizon advantage, while its
thinking-enabled profile makes latency salient.

[DeepSeek's V4 release note](https://api-docs.deepseek.com/news/news260424/)
positions Flash as the fast, economical variant and reports near-Pro results on
simple agent tasks. [OpenCode Go](https://dev.opencode.ai/docs/go/) exposes both
DeepSeek V4 Flash and Kimi K3. Two community reports use a similar separation:
one Kimi user assigns analysis, planning, and debugging to Kimi while using
Flash for implementation, while a DeepSeek discussion treats Flash as a fast
daily implementer that benefits from decomposed tasks
([Kimi discussion](https://www.reddit.com/r/kimi/comments/1ttdnew/9982_only_11_days_left_thats_why_im_using_deepseek/),
[DeepSeek discussion](https://www.reddit.com/r/DeepSeek/comments/1tlxpp2/do_you_use_deepseek_v4_for_coding_what_do_you/)).
These community reports are anecdotal, but they align with the narrower runtime
observation rather than contradict it.

## Blind judgment and prompting observation

The orchestration comparison was skipped because one Kimi trial was cancelled.
The completion-contract judge marked all four conditions passed for Kimi,
marked three passed for OpenCode, and preferred Kimi. That preference is
unsupported: the judge claimed OpenCode had not explicitly rejected
substitution or cited concrete paths, even though both OpenCode outputs call the
contracts `independent, non-substitutable` and list the same complete relative
paths. More importantly, the conditions had already been disclosed to both
workers, so even a correct judge could not restore the missing held-out test.

A prompt-only judge treatment added instructions to assess the whole record and
to prove both sides of any claimed contrast. Replaying the same blind packet
still produced the same false distinction and consumed 11,806 tokens. The
treatment was therefore rejected and not shipped. This is useful prompting
evidence: stronger prose did not make the semantic judge reliable at detecting
a tie. The original 11,928-token judgment remains retained evidence, but its
preference is not admitted. Human inspection finds both candidates passed all
four conditions and the material result is a tie.

## Runtime audit correction

The cancelled run exposed a mechanism defect independent of model capability.
Completed AI SDK steps had cumulative usage in trace events, but
[`runCell`](../../packages/work-cell/src/run-cell.ts) recorded zero because the
outer duration race settled before the driver could return or throw its
usage-bearing error.

The runtime now gives a driver an explicit incremental usage observation
channel. The AI SDK investigation, terminal recovery, and structured-settlement
steps report completed provider usage through that channel. A successful
`DriverResult.usage` remains authoritative; the incremental observation is used
only when execution fails or is cancelled before a result returns. A
deterministic uncooperative-driver probe reports usage, ignores cancellation,
and proves that the cancelled Cell retains the observed execution total. This
does not retroactively rewrite the frozen evaluation record.

## Decision

The structured-settlement compatibility repair is supported: the revised K3
profile now reads the repository and can settle schema-valid answers. The run
also supports one operational claim: under these exact policies, DeepSeek Flash
completed this simple four-file task in roughly 10–12 seconds, while the K3
thinking-enabled, deferred-settlement profile did not reliably fit a five-minute
envelope.

No capability winner, stable default, or provider preference is admitted. The
profiles had different inference and completion policies, the case leaked its
reference answers, and the task did not exercise K3's claimed long-horizon
strength. Re-run capability comparison only with the v2 manifest: hide semantic
reference criteria from workers, record effective inference policy, use cases
with discriminating difficulty, and treat duration cutoffs as censored evidence.
Reopen judge automation only when a new mechanism, not more prompt emphasis,
can disconfirm fabricated contrasts on known semantic ties.

The corrected method and runtime contract are verified in the
[v2 validity-gate evaluation](2026-07-18-model-evaluation-v2-validity-gate.md),
including two retained failed treatments before the action probe detected both
answer leakage and profile-policy confounding.
