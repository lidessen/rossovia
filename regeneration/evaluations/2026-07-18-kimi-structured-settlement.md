# Kimi Structured Settlement Evaluation

**Date:** 2026-07-18

**Status:** mechanism supported; revised capability profile requires held-out confirmation

**Prior evidence:** [Model Capability Evaluation Seed](2026-07-18-model-capability-seed.md)

**Design boundary:** [Validation Model Routing](../../design/decisions/034-validation-model-routing.md)

## Question

Why did the Kimi Coding `k3` execution profile complete repository-judgment
tasks without reading their sources, and what is the smallest compatibility
change that preserves both tool investigation and the caller's `outputSchema`?

The evaluated object remained the full profile: direct Kimi Coding route, `k3`,
AI SDK v7 Work Cell driver, frozen method-routing fixture, read-only tools, task
prompt, completion contract, and execution policy. This was a discovery probe,
not a general Kimi benchmark.

## Practice 1 — prompt-only treatment

The first hypothesis was that the ordinary prompt did not make investigation
salient enough. The baseline and treatment each ran twice in alternating order.
The treatment explicitly separated investigation from settlement, required
reading all three supplied `SKILL.md` files, rejected placeholders, and required
exact evidence paths. Model, route, fixture, tools, schema, and budget remained
fixed.

The hypothesis failed:

| Variant | Repetition | Status | Reads | Observation |
|---|---:|---|---:|---|
| baseline | 1 | failed | 0 | Output did not match schema. |
| baseline | 2 | failed | 0 | Output did not match schema. |
| stronger prompt | 1 | failed | 0 | Output did not match schema. |
| stronger prompt | 2 | passed | 0 | Put `pending investigation` into every field and guessed the three paths. |

The treated run IDs were `6afee395-6908-4b59-a708-f68085ab8c12` and
`3061e5da-86c7-4ef8-b7e2-45477f35f191`. Stronger wording changed neither tool
use nor semantic acceptance. More instruction was therefore not the next valid
repair.

## Practice 2 — completion treatment

The next probe kept the stronger prompt and every other condition fixed, while
changing only whether AI SDK received the task's `outputSchema`. Order was
again alternated across two repetitions.

| Completion mode | Repetition | Status | Reads | Observation |
|---|---:|---|---:|---|
| schema | 1 | passed | 0 | Produced a schema-valid answer that invented nonexistent scripts such as `eval_finder.py` and `update_leaderboard.py`. |
| schema | 2 | failed | 0 | Output did not match schema. |
| text | 1 | passed | 3 | Read every skill and returned the correct source-linked ownership boundary. |
| text | 2 | passed | 3 | Repeated the same correct investigation with reversed order. |

The schema run IDs were `c379640c-28e9-430d-9849-6f7fd70f85db` and
`683d6a3e-73e4-4a4c-bf02-5ce9f6f5bd62`; the text run IDs were
`b727d904-7a67-4f2b-b602-980a2c879d3a` and
`2fb9270a-80c9-4ac7-97c0-a361c38c5162`.

The official Moonshot AI SDK provider warns that this `k3` route does not
support `responseFormat`; its native capability check admits only model IDs
beginning with `kimi-k`. The controlled result shows why that warning matters
for this task: schema pressure changed not only result parsing but whether the
agent investigated at all.

## Practice 3 — compatibility prototype

Removing `outputSchema` permanently would weaken the caller contract. The next
prototype therefore reused each correct text run as retained evidence and gave
K3 one private `emit_structured_output` tool backed by the original schema. It
provided no repository tools and instructed the model to project rather than
investigate or add facts.

Both source runs settled on the first attempt. Their objects preserved the
correct routing and exact evidence paths. This supported a two-phase mechanism:

1. ordinary Work Cell tools produce evidence without unsupported response-format
   pressure; and
2. a separate schema tool projects that evidence into the caller's existing
   output contract.

The private tool is not a public terminal tool and does not merge terminal input
with logical output.

## Implementation and deterministic evidence

The provider selection now exposes `inline` or `tool-settlement` for structured
output. OpenCode Go and DeepSeek keep their inline-compatible path. A route
containing a Kimi Coding model that the Moonshot provider does not advertise as
native uses the deferred path.

The generic [AI SDK driver](../../packages/work-cell/src/ai-sdk-driver.ts)
removes the schema instruction and response format from the investigation loop,
then calls the internal
[structured settlement](../../packages/work-cell/src/structured-settlement.ts)
with retained text and tool evidence. The same compiled schema validates its
tool input and Work Cell independently validates the returned `output` again.
Trace events expose settlement start, attempts, route metadata, and completion.

The deterministic probe verifies that the main loop reads its source with no
response format, the settlement call has only the internal schema tool, the
final object passes, and inline routes remain unchanged. Route-policy tests also
show that a mixed route chooses the conservative tool-settlement mode when any
selected target lacks native support.

## Live post-fix evidence and budget audit

The first post-fix replay preserved the old 120-second maximum. Both repetitions
read all three skills, but one timed out before settlement and one timed out
during its first settlement attempt (`b9064930-b65a-4af5-b0d0-d1ccf1e33e8c`,
`f2370386-9f2f-4ffd-b660-08e4350545ac`). This rejected the old duration
assumption for the revised two-phase profile.

With the ordinary Work Cell 300-second limit, the original unstrengthened task
prompt then passed twice:

| Run | Reads | Settlement | Tokens | Duration |
|---|---:|---|---:|---:|
| `d16e0a80-f818-4753-9354-6cf9c88e798b` | 3 | first attempt | 18,671 | 130,211 ms |
| `b84ba661-fc49-46ce-87ff-7aecf432d420` | 3 | first attempt | 18,580 | 137,253 ms |

Both outputs correctly routed capability comparison, workload estimation, and
provider setup to their three owning skills, cited exact source paths, and kept
their authority boundaries distinct. The original estimate was 4,000 tokens
with ±200% tolerance, whose upper edge was 12,000; both actual runs exceeded it.
The revised profile therefore needs a new estimate rather than hiding the
additional investigation and settlement work.

## Revised judgment

Prompting effectiveness includes phase structure and completion protocol, not
only instruction wording. The evidence rejects “tell K3 more strongly to read”
and supports “remove unsupported schema pressure from investigation, then
settle retained evidence separately.”

The compatibility mechanism is ready for Work Cell use. The original profile's
failure record remains true; the driver revision creates a new profile. Because
the same method-routing case discovered and shaped the repair, these successful
runs are development evidence rather than held-out confirmation. Do not yet
admit a general K3 repository-cognition capability, change automatic routing,
or derive a degradation canary. The next capability probe must use new retained
cases and a budget appropriate to the two-phase profile.

The subsequent
[held-out run](2026-07-18-model-capability-heldout.md) shows that the revised
profile now reads and answers new source-grounded cases. It supports the
compatibility mechanism, but its capability comparison is invalid because the
worker packet disclosed the semantic reference answers and the profiles used
different inference policies. One K3 run reached the five-minute boundary; that
is right-censored envelope evidence, not proof of random instability.
