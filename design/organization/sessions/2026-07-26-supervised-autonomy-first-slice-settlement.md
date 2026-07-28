# Supervised Autonomy First-Slice Settlement

**Status:** accepted — option A
**Human mandate:** reconcile the implemented supervised-autonomy first slice
with the repository's accepted design and evidence boundaries.
**Decision:** recognize `operations/autonomy/` as an active, bounded
experimental capability while retaining human-initiated formal operation.
**Approver:** Principal
**Decision date:** 2026-07-26
**Evidence cutoff:** 2026-07-26 at `main` commit `5040d19`

## Principal Decision Brief

**Recommendation: A — recognize the implemented first slice as a maintained,
project-local experimental capability while preserving human-initiated formal
operation as the default.**

This is the smallest truthful settlement: it makes the implemented and verified
mechanism visible without promoting guarded read-only evidence into writable or
autonomous authority.

| Key | Choose this when | Immediate authorized result | Main tradeoff / reopening signal |
|---|---|---|---|
| **A — recognize bounded experiment** | The current local, supervised mechanism and its explicit non-capabilities are worth maintaining. | Record the first slice as accepted experimental capability; align Decision 043, DESIGN, README, and the autonomy README; keep every writable effect and autonomous completion gate closed. | Reopen if maintenance exceeds learning value, a production comparison contradicts usefulness, or callers repeatedly mistake it for an autonomous product. |
| **B — retain as research only** | Mechanical evidence is useful, but active capability status should wait for a matched production workflow. | Keep the code and evidence, classify the package as research-only, and require one bounded production comparison before reconsideration. | Design and CI continue carrying a substantial package that has no active operating role. |
| **C — prepare retirement** | The experiment no longer serves the project's near-term direction. | Authorize a separate, reversible archive/retirement transition; no source is deleted by this choice alone. | Recovery becomes more expensive if later practice needs the Mission mechanism again. |

**Current evidence:** deterministic and live read-only mechanism evidence plus an
[independent review](../../../regeneration/evaluations/2026-07-21-pr48-independent-review.md)
support a guarded first slice; writable effects, general capability, and
production advantage remain unproved.

**Decision recorded:** the Principal selected `A` on 2026-07-26.

## Concrete situation

| Statement | Classification | Source and status | Remaining gap |
|---|---|---|---|
| The accepted long direction is operational autonomy under human governance. | fact | [Decision 043](../../decisions/043-generative-system-and-human-governed-autonomy.md), accepted | does not itself approve a runtime transition |
| Ordinary formal operation remains human-initiated. | fact | [Decision 015](../../decisions/015-human-initiated-formal-operations.md), accepted | none for the current default |
| `operations/autonomy/` implements Mission input, turns, reconciliation, delegation, a local runner, supervision, and recovery. | fact | current [source](../../../operations/autonomy/src/) and [test suite](../../../operations/autonomy/test/) | active experimental status is settled here; broader operating authority remains closed |
| Read-only detached execution, external-input withholding, and graceful queue recovery have bounded support. | fact | [read-only](../../../regeneration/evaluations/2026-07-21-flash-readonly-mission-runtime-probe.md), [live-input](../../../regeneration/evaluations/2026-07-21-live-mission-input-reconciliation-probe.md), and [queue/recovery](../../../regeneration/evaluations/2026-07-21-live-mission-queue-recovery-probe.md) evaluations | production usefulness and abrupt-crash recovery remain unproved |
| PR 48 received independent source review and its then-current 45/45 autonomy tests passed. | fact | [independent review](../../../regeneration/evaluations/2026-07-21-pr48-independent-review.md) | review did not grant semantic or operating authority |
| The original Strategy Case remained `proposed` with `Human decision: pending` after implementation. | fact | [Strategy Case](2026-07-20-supervised-autonomy-mvp-strategy-case.md) | the later Principal disposition is recorded by this settlement |

## Principal contradiction and preservation case

Before this settlement, the implementation was substantial enough to be
typechecked and tested in CI while the governing design still described the
runtime transition as future. That mismatch made both errors plausible: later
work could ignore an implemented mechanism, or infer autonomous authority from
code that has only guarded read-only evidence.

The strongest preservation alternative was to keep the human-initiated
operating model unchanged and treat every autonomy artifact as research. The
Principal instead selected A, while preserving the same human-initiated default
and requiring later evidence before any broader capability claim.

## Settlement boundary

This acceptance does not:

- adopt or revise a Sequence principle;
- authorize writable effects, schedules, automatic retry, task discovery,
  autonomous Mission completion, publication, or merge;
- turn a local `actorRef` into authentication;
- claim that Flash-first formation is generally reliable or economical; or
- approve any authority beyond the bounded option A result.

The Principal's explicit selection of A recognizes the implemented first slice
as a maintained, project-local experimental capability. It does not convert the
experiment into accepted autonomous operation.

## Verification packet

Option A was recorded after rerunning:

```bash
cd operations/autonomy
bun run typecheck
bun test
```

Then verify:

1. Decision 043, DESIGN, both public READMEs, and the autonomy README use the
   same status and authority boundary.
2. The package remains project-local and `private`.
3. Writable effects, autonomous completion, remote authentication, and
   production advantage remain explicitly unproved.
4. The ordinary operating trigger remains human-authorized.

## Authority and disposition

- **Proposal prepared by:** the current human-authorized Codex session.
- **Independent verification available:** the PR 48 review and retained probe
  records linked above.
- **Human decision:** Principal selected option A on 2026-07-26.
- **Accepted execution owner:** the ordinary repository
  integration process; no autonomous process may approve or merge the
  settlement.
