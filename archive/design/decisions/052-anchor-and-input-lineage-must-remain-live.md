# Decision 052 — Anchor and input lineage must remain live

**Status:** Fixture implementation verified; live Mission adoption pending
Principal decision
**Date:** 2026-07-27
**Extends:** [Decision 024](024-platform-neutral-intervention-reconciliation.md),
[Decision 050](050-principal-workbench-supervised-mvp.md), and
[Decision 051](051-correction-effects-close-verification-loop.md)

## Observed failure

The first Blog trial exposed a protocol dead end after the local correction
passed its independent verifier:

- the retained input is a structured `correction`, but the proposal and
  verification boundaries accept only `contribution` and incorrectly group
  every other input with mechanical control;
- the live Mission timeline began work without an authorized initial intent
  anchor, while the existing seed operation correctly refuses to insert a
  genesis event after later history; and
- input watermark `1` therefore cannot acquire a verified reconciliation or
  advance the active lineage from watermark `0`.

The runner is live and the correction is verified. `input-pending` is therefore
not a new Principal decision and not evidence that the repair failed. It is an
implementation defect in the supervision protocol. Manually changing the
cached runner status, inserting a false first event, or pretending that the
correction was an ordinary contribution would erase the distinction between
authority, history, and projection.

## Decision

### A correction remains semantic input

A structured correction may enter the same proposal, independent verification,
and authority-bearing commit sequence as a contribution. Its structured cause,
subject, scope, planned verifier, and withheld authority are supplied to the
Cells as source evidence. They are not proof that the requested repair ran or
passed.

The reconciler still decides only how the input affects the active intent:

- `continue` preserves the current anchor statement while retaining the
  correction's response obligations;
- `correction` changes the anchor only when the human input materially changes
  an active constraint; and
- `decision-required` preserves unresolved authority, meaning, or scope.

An independent verifier checks the selected branch against the exact anchor and
input before a separate host authority may commit it. A reconciliation neither
executes the repair nor upgrades its verification, integration, publication, or
product-acceptance standing.

A `control` input is not silently reclassified as semantic input. Pause, resume,
stop, and effect approval remain lifecycle commands and require their own
observable settlement design; this slice does not manufacture that design in
the semantic reconciler.

### Fresh execution requires an initial anchor

A fresh runner may not start semantic work unless the timeline already has one
authorized anchor or the operator supplies one at carrier start. Missing anchor
authority fails before a runtime or turn begins. Optional CLI syntax must not
be interpreted as optional Mission authority.

### Existing unanchored history uses adoption, not a false seed

An experimental timeline that already contains events cannot be repaired by
relaxing `seedAnchor`. It may use one explicit legacy anchor-adoption event only
when all of these conditions hold:

1. the request names the exact Mission, authority source, semantic source,
   anchor, and pre-adoption history digest;
2. the anchor starts at reconciled watermark `0`;
3. the timeline has no seed, prior adoption, reconciliation, or active
   unsettled turn;
4. every retained turn began from watermark `0`; and
5. the append still observes the exact history named by the adoption request.

The adoption event is appended after the retained history. It records that a
human-authorized anchor is being attached to legacy experimental evidence; it
does not claim that the anchor historically preceded those events. Timeline
reconstruction accepts the adoption as the lineage root only after verifying
its bindings and all preceding events. Conflict and replay remain fail-closed.

Creating the capability does not authorize its use on the live Blog Mission.
The Principal must receive the exact proposed anchor, authority/source
references, history digest, immediate result, and rollback boundary before that
home is mutated.

## Authority and evidence

| Action | Owner |
|---|---|
| state the Mission purpose and approve a live legacy adoption | human Principal |
| retain the append-only adoption and reconciliation events | Mission timeline |
| propose the correction's effect on active intent | bounded reconciliation Cell |
| verify that proposal against the exact sources | independent verification Cell |
| commit a verified transition | separately declared host authority |
| execute and verify the Blog repair | Blog-local correction carrier and verifier |
| show current standing | rebuildable Workbench projection |

The execution-authorization receipt and its consumption claim are orthogonal to
this lineage. Workbench must project both truthfully: a consumed one-use launch
authorization is no longer `authorized-awaiting-execution`, but its claim still
does not prove that a runner, effect, or product result succeeded.

## Minimum verification

Before any live adoption:

- a fixture correction completes proposal, independent verification, and
  authority commit, while a control input remains rejected;
- a fresh runner without an existing or supplied anchor creates no turn;
- a legacy adoption is append-only, idempotent for the exact request, and
  rejects a changed history digest, conflicting source, existing lineage,
  nonzero prior baseline, or unsettled turn;
- reconstruction preserves every pre-adoption event and recovers the adopted
  anchor at watermark `0`;
- a valid authorization consumption claim changes only the authorization
  standing and exposes its candidate binding; and
- all existing autonomy and Workbench tests still pass.

After those checks, present a Principal Decision Brief for the exact live
adoption. Reopen this decision if a second non-legacy runtime needs late
adoption, if correction payloads cannot be reconciled without exposing repair
evidence as semantic authority, or if lifecycle controls need to share rather
than merely coexist with the semantic watermark.

## Fixture result

The bounded implementation now provides:

- semantic reconciliation and independent verification for `contribution` and
  `correction`, while rejecting `control`;
- an append-only `mission.anchor-adopted` event bound to the authority-bearing
  request's expected prior event count and timeline digest;
- reconstruction guards for conflicting lineage, stale history, unsettled
  turns, and nonzero legacy baselines;
- a guarded `mission adopt-anchor` operator command that requires the current
  runner ID and state and only runs through a no-runtime carrier;
- explicit `anchor-pending` and no-runtime `idle` standing so a control-only
  carrier cannot appear to be producing work (`input-pending` still takes
  precedence while an adopted lineage has unreconciled input); and
- a Workbench projection of one-use execution authorization consumption that
  remains separate from runner, effect, integration, and product result.

The autonomy package passes 86 tests and TypeScript checking in an environment
that permits its local Unix-socket runner tests. The Workbench UI passes 47
focused integration and presentation tests plus TypeScript checking. A
read-only projection against the current home validates the historical
authorization claim and now reports `authorization-consumed`.

The live Blog timeline remains unchanged. Its current candidate adoption target
is five retained events with digest
`d52a8a7bab55702859e075b29c85de66a82ae6a768bcd3814098a05923c3876b`;
both historical turns are settled at baseline `0`, and input watermark `1` is
the structured `blog-index-import-v1` correction. This digest is a volatile
precondition, not durable authority: it must be rechecked atomically when the
Principal chooses whether to adopt the proposed anchor.
