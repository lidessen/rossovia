# Live Mission queue and carrier-recovery probe

**Date:** 2026-07-21

**Status:** ordered read-only queue recovery supported across graceful carrier restarts; crash and writable-effect claims remain unproven

## Question

Can a detached Mission retain two inputs that arrive during a real Flash turn,
recover their partially reconciled queue across replacement carrier processes,
refuse to start work after only the first commit, and start exactly one fresh
anchor-bound turn only after the final watermark is independently reconciled?

This is a low-consequence integration probe. It tests durable ordering and
restart projection, not arbitrary conversation understanding, ungraceful crash
recovery, or safe writable effects.

## Frozen shape

The probe runner is
[`live-mission-queue-recovery-probe.ts`](../../operations/autonomy/experiments/live-mission-queue-recovery-probe.ts).
It used the trusted
[`flash-readonly-mission-runtime.ts`](../../operations/autonomy/experiments/flash-readonly-mission-runtime.ts)
through three distinct detached carrier processes. Every model call used the
explicit OpenCode Go `deepseek-v4-flash` route with no fallback.

The two Principal fixture inputs arrived while the initial Flash parent and
read-only child were active. Both reaffirmed the same Mission and hard
boundaries. Each watermark used its own proposer and independently identified
verifier Work Cell. Neither Cell could mutate Mission state; the probe supplied
the complete verified commit with a separate `principal:probe-fixture`
authority reference.

The child could read only
[`operations/autonomy/package.json`](../../operations/autonomy/package.json),
with no write paths or command authority.

## Retained accepted run

The accepted post-correction run used Mission
`live-queue-recovery-1784683694124` from `2026-07-22T01:28:14.124Z` to
`01:28:54.351Z` UTC.

| Boundary | Retained observation |
|---|---|
| Carrier identity | three different processes: PIDs 62375, 62529, and 62806 |
| Initial disturbance | inputs 1 and 2 arrived 82 ms and 157 ms after the first turn began |
| Stale turn | settled `input-pending` at current watermark 2; its child evidence settled but never resumed the stale parent |
| First restart | projected `input-pending`, input 2 / reconciled 0; no new turn started |
| First commit | advanced only to reconciled 1 and remained `input-pending`; turn-start count stayed one |
| Second restart | projected input 2 / reconciled 1; still no new turn |
| Final commit | advanced to reconciled 2, then and only then opened the second Mission turn at baseline 2 |
| Anchor lineage | initial, watermark-1, and watermark-2 statements were byte-identical; only revision, sources, watermark, and digest lineage changed |
| Successor | completed the bounded read-only contribution with no uncovered obligation |
| Child result | both attempts independently extracted `@atthis/autonomy`, `0.1.0`, and `ai` `7.0.28` from the declared source |
| Effects | empty added, changed, and removed file sets; no command authority or route fallback |

The full accepted run recorded 17,253 tokens: the stale parent safe-point and
child, four reconciliation Cells, and the complete successor parent and child.
The raw retained aggregate is
`/tmp/atthis-live-mission-queue-recovery-v3.json`.

## What the failed practices changed

The first attempt failed before model execution because the experimental probe
reimplemented timeline filename hashing and guessed incorrectly. It now asks
`FileMissionTimeline.timelinePath()` for the runtime-owned representation. This
removed duplicate protocol knowledge rather than patching the guessed hash.

The next run completed its ordering and restart path but exposed semantic
drift: both verifier Cells appended the current watermark to the active intent
statement even though `reconciledWatermark` already owns that execution fact.
The transition was schema-valid, yet repeated operation would have mixed
ephemeral progress into durable purpose.

The verifier surface now separates the two semantic branches:

- `verify_continue` receives no next-statement field; the host retains the
  exact active statement because `continue` means no active constraint changed;
- `verify_correction` may submit a changed next statement; and
- the commit gate independently rejects any `continue` acceptance whose next
  statement differs from its proposal anchor.

The accepted run occurred after this correction. Both real Flash verifiers used
the reduced continue surface, and all three statements remained identical.
Deterministic tests also preserve correction's distinct ability to propose a
new statement.

## Decision

The bounded mechanism claim is supported: an ordered Mission input backlog can
survive graceful detached-carrier replacement, retain a partially reconciled
watermark, withhold execution until the backlog is empty, and then start one
fresh turn bound to the final active anchor.

The result remains guarded. The inputs were synthetic reaffirmations, restarts
were graceful, the authority was a probe fixture, and the only effect was
read-only. A process killed during a live transition, conflicting corrections,
automatic semantic authority, and writable execution remain outside this
claim. The next smallest safety practice is a proposed-effect gate that can
retain and independently inspect a candidate change without yet granting a
Cell write or publish authority.
