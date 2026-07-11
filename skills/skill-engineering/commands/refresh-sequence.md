# Refresh the Portable Sequence

Refresh only when the current decision may depend on a newer Sequence than the
package's baseline. Refresh is optional; a network failure must not disable the
skill's baseline operation.

1. Read references/sequence-snapshot/SOURCE.md. Confirm the repository, ref,
   baseline hash, and why freshness matters now. Do not fetch merely because a
   network path exists.
2. Fetch the remote Sequence into a temporary location. Verify its one-line
   P-ID shape before using it. Fetch only the interpretation files for P-IDs
   selected after reading that Sequence.
3. Check every fetched interpretation's Sequence source line against its fetched
   P-ID line. Reject a partial, mismatched, unauthenticated, or malformed
   result; retain the packaged baseline in that case.
4. Use the verified remote material only for the current task and record its
   repository, ref or revision, hash, selected P-IDs, and retrieval time.
   Never overwrite references/sequence-snapshot from a task run.
5. If the remote material changes a target-skill selection, surface that as a
   lineage difference. Maintainers refresh packaged snapshots with
   `python3 scripts/sync-sequence-snapshot.py`; a target-project task run must
   not overwrite `references/sequence-snapshot`.

Do not treat a reachable URL as semantic authority. The fetch must identify the
configured source and pass the same source-line consistency check as the local
baseline.
