# Flash Read-only Mission Runtime Probe

**Date:** 2026-07-21

**Status:** detached parent/child mechanism supported; reusable capability claim remains guarded

## Question

Can the detached Mission carrier load one explicitly trusted runtime module,
run a real OpenCode Go DeepSeek V4 Flash parent Agent, delegate one bounded
read-only contribution to a real Flash Work Cell, park at the child barrier,
resume after durable settlement, and leave enough evidence for an independent
exact-value audit?

This is a low-consequence integration probe. It does not establish autonomous
project judgment, writable-effect safety, or a generally reliable Flash task
envelope.

## Frozen shape

The runtime module is
[`flash-readonly-mission-runtime.ts`](../../operations/autonomy/experiments/flash-readonly-mission-runtime.ts).
It selected only `opencode-go/deepseek-v4-flash`, with no fallback. The parent
was authorized to form exactly one host-declared semantic call; the host rejects
any change to its task, sources, obligations, acceptance, result contract, or
capability need before Cell admission.

The child could read only
[`operations/autonomy/package.json`](../../operations/autonomy/package.json).
It had no write paths and no allowed commands. Its bounded operation was to
extract the package name, package version, and exact `ai` dependency version.
The Task Shape remained `guarded`: prior repository runs provided protocol
observations, while an independent exact-output and read-trace audit owned
semantic acceptance.

## Retained run

The accepted post-gate run used Mission `flash-readonly-1784672607` in an
ephemeral `/tmp` home. The turn began at `2026-07-21T22:23:27.252Z`, the child
settled at `22:23:32.665Z`, and the Mission turn settled at `22:23:34.594Z`.

| Surface | Observation |
|---|---|
| Parent | emitted the one exact `delegate` call, parked, resumed, returned, and reported no uncovered obligation |
| Child route | `ai-sdk-v7 / opencode-go / deepseek-v4-flash` |
| Child tool evidence | one `tool.read_file` for `operations/autonomy/package.json`, 561 characters |
| Child output | `@atthis/autonomy`, `0.1.0`, `ai` `7.0.28`, correct source path |
| Effects | empty added, changed, and removed file sets; no command authority |
| Child settlement | Work Cell `passed`; contribution `completed` |
| Parent settlement | Mission turn `finished / returned`; zero uncovered obligations |
| Recorded usage | parent 2,457 tokens; child 2,382 tokens; 4,839 combined |

The exact values matched the source under deterministic inspection. The
separate Mission, parent, and child timelines retained the turn start and
settlement, admitted call, barrier readiness, route identity, structured child
output, read trace, workspace diff, and both usage records.

## Correction made during the probe

A preliminary successful run exposed a policy weakness by inspection: the
frozen whole constrained source, obligation, result contract, and capability,
but the probe-specific host still relied on the parent prompt to preserve the
exact task and acceptance text. The runtime now compares the complete proposed
`DelegateCall` with the one host-authorized contribution and fails closed on
any delta. The accepted run above occurred after that correction.

This correction belongs to the project-specific runtime adapter, not the
generic Work Cell or delegate protocol. A different Mission may authorize a
different semantic formation policy.

## Decision

The smallest live integration claim is supported: a detached Mission can carry
one real Flash parent-to-child read-only turn through ordinary Agent loops and
durable parent/child timelines without giving the model runtime-selection,
write, command, or acceptance authority.

The operation remains `guarded`, not `reliable-primitive`. Two successful
development runs—one before and one after the host gate—are insufficient to
establish a stable capability rate, and the bounded package extraction does not
stand in for project cognition or strategic planning. The next evidence should
exercise one real external input crossing a live safe point and require
explicit reconciliation before a replacement turn, while preserving the same
read-only effect boundary.
