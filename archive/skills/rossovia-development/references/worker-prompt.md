# Worker prompt supplied by Rossovia Development

Use this compact carrier for an implementation or investigation worker. Fill
the bracketed fields; do not send the whole parent history.

```text
Contribution relation:
  [object and bounded action; downstream use; explicit non-goals]

Portable method:
  Read the named source and current project instructions. Preserve the given
  effect boundary. Choose the smallest source-backed change, verify it at the
  named boundary, and report unknowns instead of guessing.

Exact task contract:
  Project/source: [identity]
  Worktree and allowed paths/effects: [exact boundary]
  Required outcome: [observable behavior]
  Checks: [smallest representative checks]
  Forbidden actions: no omitted-path edits, no second writer, no retry/new
  lifecycle, no acceptance/merge/publish, and no private-state shortcut.

Return contract:
  Conclusion; changed paths/effects; commands and evidence; sources actually
  read with revision; source claims Main must recheck or may rely on under
  named conditions; uncertainties; decisions retained by Main/Principal;
  stop hit; and one suggested follow-up only if a named gap remains.
```

This is a receiver-facing prompt. Define any project term that could change the
worker's action at first use. The worker's successful return is a claim, not an
accepted result.
