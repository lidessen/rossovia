# Rossovia Home-Write Independent Review

**Date:** 2026-07-23

**Reviewer:** Lovelace, independent read-only review seat

**Target:** PR 58, Rossovia Workbench home capability setup

## First reviewed head

The reviewer inspected
`0ab575d6721c818d325598ff87fec7697f4cca18` against
`bc75061e090fa0143e7769c80622290e28dfa950` and returned
`changes_required`.

Two reachable failures changed the integration decision:

1. [`verifyHomeWrite`](../../operations/workbench/src/home.ts) exercised only
   `state/`, although the home root, `config/`, `receipts/`, and `cache/` also
   own mutable state. Read-only `config/` and `receipts/` fixtures still allowed
   `init` to report `writeAccess: "verified"` before later preference writes
   failed.
2. [`migrateLegacyHome`](../../operations/workbench/src/migration.ts) staged at
   a sibling of `ROSSO_HOME`. A runtime granted only the exact selected home
   could therefore pass ordinary in-home writes while the required first-run
   migration failed outside that capability.

The reviewer also retained one non-blocking boundary: UUID temporary names
prevent filename collisions, but do not make simultaneous read-modify-write
operations on the same JSON record transactional.

## Disposition

- Whole-home verification now performs a no-residue create–rename–remove probe
  on the home root and every declared write-bearing directory. The focused test
  makes each surface read-only in turn and rejects the success signal.
- Namespace migration now uses a marker and restartable contents entirely
  inside the exact target home. A failed or interrupted transaction retains the
  marker, clears incomplete contents, and rebuilds from the preserved legacy
  source. No sibling staging path remains.
- [Decision 044](../../design/decisions/044-rosso-identity-and-namespace-migration.md)
  and [Decision 047](../../design/decisions/047-bun-workbench-runtime.md) now
  state the restartable in-home contract instead of the incompatible
  whole-directory atomic-rename claim.

The correction requires a new independent review of the resulting head. The
first report remains failure evidence and cannot be promoted as acceptance.

## Second reviewed head

The reviewer inspected
`26ae09d5cf0acab85a64e7938f9dea09333ddd03`. Both first-report findings were
closed, including exact-root-only fresh and marked-retry migration probes.
However, the review retained one new reachable failure and again returned
`changes_required`: interruption or denial after target-directory creation but
before marker publication left an empty unmarked home that every later retry
rejected as an existing target.

The target preparation now recognizes only an empty unmarked target as the
recoverable pre-marker state and publishes the marker through the same
temporary-write-and-rename mechanism used by ordinary JSON state. A focused
test denies marker creation, restores permission, and requires the next
migration to succeed without manual directory removal. A nonempty unmarked
target remains protected from overwrite.

This correction also requires a new current-head review; neither prior
`changes_required` report is acceptance evidence.
