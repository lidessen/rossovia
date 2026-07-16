# Legacy Index Retention

**Status:** proposed — read-only probe complete; final carrier action pending Principal confirmation
**Accepted design:** [accepted source/value/status partition](sessions/2026-07-15-legacy-experiment-return-partition.md), [formal operations mission](../../operations/missions/formal-operations-transition.json)

## Audit

The protected source remains the staged index in the local
`public-expression-readme` worktree. The probe did not modify, unstage, commit,
publish, or delete it. Its identity still matches the accepted partition:

```text
index tree:        d2f00eae727720ffd141f0ef734e1e81a9315db6
patch sha256:      e745285f45fc3e07efb0b5d49fd8d6f03f72f047c9e1ab1880cd6a82dd06440e
paths:             129
line delta:        +25,366/-273
staged blob bytes: 1,866,323
binary patch bytes: 1,873,498
```

The carrier contains 57 Markdown files, 55 JSON files, and 17 other files.
JSON occupies 1,198,279 bytes. Ten complete `.cell.run.json` records occupy
822,130 bytes and retain task inputs, model-generated process output, raw-step
structure, and absolute local workspace paths. They are process evidence, not
semantic sources or accepted runtime contracts. The partition and selected
source-bound summaries are the sufficient durable inheritance for current
decisions; raw carriers remain useful only as a bounded reopening source.

The current `lidessen/skills` GitHub repository is public. A filename-only and
key-shape scan over the staged blobs found:

- zero high-confidence API-token, cloud-key, private-key, or bearer-token
  patterns;
- zero email-address matches;
- zero JSON scalar fields named `apiKey`, `secret`, `password`,
  `authorization`, `accessToken`, `refreshToken`, or `clientSecret`;
- four source-code references to environment-variable credential loading, with
  no credential values embedded; and
- ten full run records containing the local `/Users/...` workspace path and
  transcript-shaped fields.

This is not an exhaustive secret-scanner certification: `gitleaks` and
`trufflehog` were not installed. It is sufficient to reject publication to the
current public repository, not sufficient to certify an unrestricted remote
archive.

The strongest keep-as-is case is recoverability: the worktree exposes the exact
index immediately and avoids an archive/restore failure. Its cost is a hidden,
mutable operational obligation whose branch, index, dependencies, and local
path must remain intact indefinitely; it is also easier to publish accidentally
than a sealed offline carrier.

## Material gap

The accepted partition removed active-mainline authority from the raw index but
left its only durable carrier as a live Git worktree. Authority and lifetime are
therefore misaligned: process evidence that must not enter the public repository
is being preserved by keeping an executable development surface alive.

A later naming, progressive-adoption, or divergent-practice inquiry may need to
reopen one omitted raw observation, so immediate deletion would discard unique
evidence. Conversely, leaving the worktree indefinitely prevents the formal
operations campaign from settling and makes accidental publication the default
failure mode.

## Transition

**Recommendation: A — create one sealed local archive, verify restoration, then
remove the live worktree and its merged branch.**

The archive should live outside the repository and contain only:

1. a Git bundle or equivalent immutable snapshot capable of restoring the exact
   staged tree;
2. the staged binary patch;
3. a small manifest naming the source commit, index tree, patch SHA-256, path
   count, byte count, creation time, and this audit; and
4. restrictive local file permissions.

Do not push an archive ref to `lidessen/skills`. A separate remote carrier would
require a private destination plus a stronger credential/privacy scan and is
not justified by the current evidence. Do not reconstruct selected future
candidates during this transition; they retain their own later acceptance
routes.

The transition requires a final Principal confirmation because archive creation
followed by worktree deletion changes the only current carrier of unique raw
evidence.

**Falsifiable acceptance:** restore the archive into a disposable directory and
reproduce both index tree
`d2f00eae727720ffd141f0ef734e1e81a9315db6` and patch SHA-256
`e745285f45fc3e07efb0b5d49fd8d6f03f72f047c9e1ab1880cd6a82dd06440e`.
If either differs, retain the original worktree and mark the transition failed.

## Verification

- Recomputed the staged index tree and binary-patch SHA-256 after PR #20 merged;
  both match the accepted partition.
- Counted staged paths and blob sizes directly from the Git index rather than
  the working tree.
- Inspected credential-shaped JSON keys without printing values.
- Scanned changed staged blobs for high-confidence credential prefixes, private
  key markers, emails, local paths, and transcript-shaped fields.
- Confirmed repository visibility through GitHub as `PUBLIC`.

The audit passes as a carrier decision input. It does not certify that every
raw model output is safe to publish, and it does not authorize deletion.

## Disposition

No carrier transition has been executed. Keep the protected worktree unchanged
until the Principal accepts or rejects the sealed-local-archive recommendation.
On successful archive/restore verification, record the archive manifest and
worktree removal here, settle `legacy-index-retention`, and move this campaign
record to `design/organization/sessions/` because its evidence remains relevant
to later source recovery.
