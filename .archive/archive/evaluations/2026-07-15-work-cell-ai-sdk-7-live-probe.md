# Work Cell AI SDK 7 Live Probe

**Date:** 2026-07-15
**Branch:** `mission/work-cell-orchestration`
**Question:** Can the generic Work Cell driver make one real bounded
`deepseek-v4-flash` request after the AI SDK 7 / DeepSeek provider 3 migration
and retain the new usage and performance shape?

## Probe

The probe ran one read-only generic Cell through `bun src/cli.ts run` with no
terminal tool, output schema, artifact, command authority, or tool request. It
allowed two model steps but completed in one. The prompt requested one short
sentence; the declared estimate was 1,000 tokens with a ±100% audit tolerance.

The raw run was written under `/tmp` and was not promoted into the repository:
it contains no durable semantic result and the retained metrics below are the
only decision-changing evidence.

## Observation

| Field | Observed value |
|---|---:|
| Run ID | `07e811a8-61b2-487c-803a-af1343b2a65d` |
| Terminal status | `passed` |
| Driver | `ai-sdk-v7` / `deepseek` / `deepseek-v4-flash` |
| Input / output / total tokens | 620 / 30 / 650 |
| Cached input tokens | 0 |
| Duration | 864 ms |
| AI SDK step time | 855.750292 ms |
| AI SDK response time | 854.660125 ms |
| Effective output throughput | 35.10167272633668 tokens/s |

The returned sentence incorrectly claimed it could not make a provider call.
That content does not defeat this narrow compatibility probe: the retained
provider usage, model identity, timing, and successful HTTP completion establish
that the call occurred. It does show that a non-empty response is not a quality
acceptance condition and must not be presented as one.

## Disposition

The real provider path and v7 performance shape are supported. Response quality,
tool-scoped context, file references, durable execution, and revised terminal
semantics remain untested. The package may retain the migration, but those
features require separate probes rather than inference from this call.
