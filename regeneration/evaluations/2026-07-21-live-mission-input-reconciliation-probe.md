# Live Mission input reconciliation probe

**Date:** 2026-07-21

**Status:** read-only external-input mechanism supported; autonomous authority and writable effects remain unproven

## Question

Can one detached Mission receive newer Principal input while a real Flash parent
and child are active, withhold the stale parent at its next durable safe point,
reconcile the input through separately identified Flash proposer and verifier
Cells, commit only through an authority-bearing host request, and start a fresh
turn bound to the resulting intent anchor?

This is a low-consequence integration probe. It does not establish production
reliability, natural-language authority inference, or safe writable execution.

## Frozen shape

The probe runner is
[`live-mission-input-probe.ts`](../../operations/autonomy/experiments/live-mission-input-probe.ts).
It starts the detached Mission through the public CLI, using the trusted
[`flash-readonly-mission-runtime.ts`](../../operations/autonomy/experiments/flash-readonly-mission-runtime.ts)
adapter. Every model call used the explicit OpenCode Go `deepseek-v4-flash`
route with no fallback.

Before execution, the host seeded an authorized watermark-zero intent anchor.
Every turn start had to carry the digest of the active anchor. The parent could
form only one host-frozen read-only contribution, and the child could read only
[`operations/autonomy/package.json`](../../operations/autonomy/package.json),
with no write paths or command authority. The input requested continuation of
the same operation and explicitly preserved its source, effect, verification,
and human-authority constraints.

The reconciliation proposer and verifier were distinct Work Cell runs. Neither
could mutate Mission state. The probe supplied a separate fixture authority
reference when submitting the complete verified commit; that fixture simulates
the Principal gate and is not a production authorization mechanism.

## Retained run

The accepted post-correction run used Mission `live-input-1784676963445` in an
ephemeral home. It ran from `2026-07-21T23:36:03.445Z` to
`23:36:24.156Z`.

| Boundary | Retained observation |
|---|---|
| Authorized root | `mission.anchor-seeded` was the first Mission event; the initial turn carried its exact anchor digest |
| Live input | watermark 1 arrived 83 ms after the first turn began |
| Stale turn | stopped as `input-pending` at its first durable delegated-batch safe point; its child settlement remained evidence but was never resumed into the stale parent |
| Stale parent audit | the prepared checkpoint retained 1,378 cumulative parent-model tokens that had previously been lost from the settlement-only view |
| Reconciliation | proposer chose `continue`; a separately identified verifier returned `verified-transition` and preserved the full active anchor |
| Commit | the runner accepted the complete proposal, verification, evidence links, next anchor, and `principal:probe-fixture` authority reference, then advanced the reconciled watermark to 1 |
| Successor | began against the committed anchor digest at watermark 1 and finished with no uncovered obligation |
| Child result | both read-only attempts independently extracted `@atthis/autonomy`, `0.1.0`, and `ai` `7.0.28` from the declared source |
| Effects | no workspace additions, changes, removals, or command execution; no route fallback |

The proposer run `cfb1fd76-c20f-436b-a407-9b8c4f343ef0` used 1,590 tokens.
The verifier run `63b7f9d4-4f8e-45c1-8fdb-e0b7531b4a2c` used 2,209 tokens.
Including both parent attempts and both child attempts, the full trial used
12,429 recorded tokens. Stale computation is therefore visible as cost rather
than being mistaken for absent work.

The raw retained aggregate is
`/tmp/atthis-live-mission-input-probe-v2.json`. It contains the Mission,
parent, and child event streams; strict proposal and verification payloads;
Work Cell records; routes; usages; read traces; and effect diffs. The probe
removes its temporary runner home only after copying that evidence.

## Correction made during the probe

The first end-to-end run exposed that an `input-pending` settlement retained
the active batch reference but not the parent model's already-spent usage. The
parent now writes cumulative model usage into the durable
`DelegateBatchCheckpoint` before dispatch. Timeline recovery validates that
field through the same strict checkpoint schema. The accepted run above
demonstrates non-zero usage on both parent checkpoints.

This is deliberately a safe-point record, not a new semantic settlement or a
second accounting system. It closes the observed delegated-batch case without
claiming coverage for future interruption points that have no checkpoint.

## Decision

The mechanism claim is supported: a real external input can cross a running
Flash Mission, fence stale continuation at a durable barrier, pass through
independent proposal and verification, advance state only through an explicit
authority-bearing commit, and launch a new anchor-bound read-only turn.

The result remains guarded. It is one synthetic development input, one trusted
runtime adapter, one read-only operation, and fixture-supplied authority. The
next evidence focused on operational carrier recovery and several queued
inputs; its result and a discovered anchor-drift correction are retained in the
[queue-recovery probe](2026-07-21-live-mission-queue-recovery-probe.md). A
separately designed proposed-effect gate remains necessary before any writable
Cell is admitted. Automatic semantic commit, hidden authority inference, and
model-owned Mission closure remain out of scope.
