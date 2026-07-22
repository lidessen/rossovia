# Delegate-file Flash probe

**Observed:** 2026-07-20
**Status:** discovery probe; not capability admission

## Question

Can the explicit OpenCode Go `deepseek-v4-flash` profile use the autonomy
convener's new file-backed tool loop in the required order—write one valid
ordinary `DelegateCall`, then submit only its path and digest—without starting a
child before the host receives the final delegate step?

The implementation under test is the project-local
[`DelegateLoopSession`](../../operations/autonomy/src/delegate-loop.ts). It uses
AI SDK 7 `ToolLoopAgent`; `write_file` has a host-scoped executor, while
`delegate` and `delegate_file` deliberately have none. The complete final
delegate step is therefore returned to host admission before execution. The
reproducible probe is
[`delegate-file-capability-probe.ts`](../../operations/autonomy/experiments/delegate-file-capability-probe.ts).

## Fixed profile and fixture

- provider: `opencode-go`
- model: `deepseek-v4-flash`
- fallback: none
- parent harness: AI SDK 7 `ToolLoopAgent` through `DelegateLoopSession`
- child: deterministic local driver, so the observation spends model work only
  on the parent action sequence
- requested action: one `write_file` step followed by one `delegate_file` step
- packet: one 286-character, schema-valid contribution with one source and one
  obligation
- host checks: file scope, schema, SHA-256, ordinary delegate admission,
  checkpoint-before-dispatch, child settlement, and exact-packet retention in
  parent messages

This is a small instructed fixture. It tests protocol following and carrier
behavior, not autonomous task decomposition, semantic quality, large-file
economics, or general stability.

## Observations

| Run | Delegate result | Child | Exact packet retained in parent messages | Usage |
|---|---|---|---|---:|
| development | `delegate_file`, 286 bytes, expected digest | completed | original phrase-based metric invalid | 4,001 tokens |
| corrected confirmation | `write_file → delegate_file`, 286 bytes, expected digest | completed | no | 3,921 tokens |

Both runs produced the same packet digest:
`58fe9fec716cf2c04b2661c9cde508727d262745b648c3ad45de670961c65e48`.
Neither route used fallback. Total observed parent usage was 7,922 tokens.

The first run's compaction metric searched for a short task phrase. That phrase
could also occur in ordinary model prose, so the positive result could not
distinguish transcript replay from paraphrase. It was rejected as an invalid
measurement. The corrected run compared the complete persisted file content
against the retained parent messages and observed no exact copy. This
measurement correction is part of the evidence rather than a hidden cleanup.

Deterministic integration coverage separately exercises a 16 KB packet,
post-admission source mutation, parent-context compaction, mixed write/delegate
rejection, and the no-child-before-admission condition in
[`delegate-loop.test.ts`](../../operations/autonomy/test/delegate-loop.test.ts).

## Judgment

The two observations support the narrow claim that this explicit profile can
execute the instructed two-step file submission through the implemented
carrier, and that host admission and transcript compaction behave as designed
in the observed fixture.

Disposition remains **guarded / discovery evidence**. Two near-identical runs
do not establish a reliable primitive, and the deterministic child does not
test semantic decomposition or reconstruction. Promotion would require
repeated held-out tasks with varied valid packet contents and at least one
failure-sensitive case, while measuring protocol settlement separately from
packet correctness, obligation coverage, cumulative delivered context, and
human repair.

## Reopening observations

Reopen the mechanism if a representative run:

- mixes `write_file` with a delegate call in one step;
- writes a packet that cannot pass the ordinary `DelegateCall` schema;
- omits or changes the returned digest;
- retains the exact file content in later parent model messages;
- starts a child before complete-step admission; or
- uses materially more cumulative context than inline delegation for a packet
  whose later reuse does not repay that cost.
