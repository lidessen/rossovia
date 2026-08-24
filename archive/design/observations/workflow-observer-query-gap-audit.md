# Workflow observer query-gap audit and bounded evidence projection

Audit of the workflow-observer evidence projection in
[`apps/workbench/src/workflow-observer.ts`](../../apps/workbench/src/workflow-observer.ts),
with the bounded, traceable input-goal/final-result projection added to close
the gap. The observer remains read-only; the review log remains append-only
evidence. No queue, lifecycle, enum, or permission mechanism was added.

## 1. Observed symptom

Observer reviews of settled task attempts frequently settle with standing
`query-gap` — or, when recorded, findings that only restate status summaries —
even when the full strict attempt evidence family (`attempt`, `input`,
`finalRecord`, `settlement`, `control`) is complete and `available`.

## 2. Concrete code path and root cause

The observer cell is launched by `runWorkflowObserver`
(`apps/workbench/src/workflow-observer.ts`). Its only information source is one
context block whose content is the JSON string built by
`workflowObserverContext(evidence)`; the cell has `readPaths: []`,
`writePaths: []`, and `allowedCommands: []`, so it cannot read the retained
evidence itself. The context builder then projected the evidence as follows:

- `CellInput.intent` — the original task goal — was reduced to a boolean
  `intentPresent` (`evidence.input?.intent !== undefined`).
- `CellInput.instructions` / `CellInput.acceptance` were reduced to counts
  (`instructionCount`, `acceptanceCount`); their text was dropped entirely.
- `CellRunRecord.finalText` — the final result body — was reduced to
  `{ present, characterCount, lineCount }`; the text was dropped entirely.
- The `limitation` string stated that "original input/result payloads … are
  not copied into the observer context", instructing the observer to report a
  visibility gap whenever a semantic judgment needed them.

Consequences:

1. The observer could never compare the original goal with the delivered
   result, could not check the acceptance criteria against the result text,
   and could not quote or anchor any semantic claim in the final result.
2. With the only honest options being "status summary" or "visibility gap",
   the review cell either produced `query-gap` records or findings that
   paraphrased the summary, which is exactly the reported symptom.
3. The old test
   (`apps/workbench/test/workflow-observer.test.ts`) codified the gap: it
   asserted the context contained no `intent`, `instructions`, `acceptance`,
   or `finalText` and no `"private original"` content at all.

Root cause: the projection conflated "raw provider steps / trace event
payloads" (which must not be copied) with the essential semantic payloads
(the input goal, acceptance criteria, and final result text). The hard
constraint is about transcripts and provider steps, not about bounded,
source-anchored goal/result snippets.

## 3. Change

In `workflowObserverContext` (single source file, plus its test and docs):

- `input.goal`: bounded prefix (2048 chars) of the original `intent` with
  `truncated`, `characterCount`, and the SHA-256 digest of the **full**
  intent text.
- `input.instructions` / `input.acceptance`: bounded text lists (≤16 items,
  ≤512 chars each) with a `truncated` flag covering both list-level and
  per-item slicing, in addition to the existing counts.
- `final.result`: bounded prefix of the final `finalText` with `truncated`,
  `characterCount`, `lineCount`, and the SHA-256 digest of the **full** final
  text.
- The four text projections above are evidence-only data, not observer
  instructions: each is wrapped in a structured marker (`evidenceOnly: true`,
  `boundary: "untrusted-task-evidence"`, and the exact retained
  `sourceLabel`), the context declares a top-level `dataBoundary` section
  naming the isolated fields and their meaning, and a constant
  `reviewProtocol` section (built from no evidence field, so task/result text
  can never overwrite it) leads the context after the observer instructions
  and states the review-only boundary. Every occurrence of
  task/result-supplied text therefore sits inside an explicitly marked,
  untrusted-for-review-only projection; the marker and framing reduce —
  without fully eliminating — the risk that a model misreads or follows
  instruction-like task text, and the observer's read-only posture bounds any
  successful injection to the review text itself (section 8).
- `evidence`: the four exact retained source refs, the file-byte SHA-256
  digests of the immutable CellInput and the retained final record, the
  digest algorithm, the snippet limit, and the bounded file-digest cap
  (`fileDigestLimitBytes`). The file-byte digests are read via
  descriptor-pinned canonical reads (`openPinnedEvidenceFile` /
  `confirmPinnedEvidenceFile`) streamed in 64 KiB chunks with an 8 MiB cap
  per file (`EVIDENCE_FILE_DIGEST_LIMIT_BYTES`), and the whole evidence
  family (cell input, attempt record, final record, settlement, and control
  receipt when retained) is bound to one pinned snapshot: a ref is rejected
  when absolute, lexically escaping home, resolving outside the canonical
  home tree (`realpath` containment), a symlink, or not a regular file;
  every present family member is pinned before any member is read; a
  mid-read replacement or rewrite degrades the digests to `unavailable`;
  a file above the cap is recorded as digest-unavailable instead of being
  fully read; and each member's pinned bytes are re-parsed with the exact
  schemas the strict reader used and compared with the strict-read values,
  so a rewrite of any family member between the strict read and the digest
  read degrades the whole review to a `query-gap` (`changed`) instead of
  recording old text next to new file digests (sections 8 and 9).
- The review record schema gains an optional `evidenceDigests` object
  (`inputFileDigest`, `finalRecordFileDigest`, `inputGoalDigest`,
  `finalResultDigest`), populated by `attemptSourceDigests(home, evidence)`
  when the sources are readable and within the cap; records without it
  (legacy, or digest-unavailable) still parse.
- `limitation` now states exactly what is not copied: raw provider steps,
  trace event payloads, and the untruncated text, plus the bounded-digest
  cap.

The observer can now semantically review: it sees the original goal and
acceptance criteria, the delivered final result, and digest/ref anchors it
can cite. A later ordinary Task can verify every digest against the retained
sources at the refs and read untruncated text — without the observer ever
receiving the full transcript or raw provider steps.

## 4. Bounds and exclusions

- Goal/result snippets: ≤ 2048 chars each; instructions/acceptance ≤ 16 items
  × 512 chars; existing capability/path/command lists keep their ≤64 × 256
  bound. Worst-case context stays well under 32 KB.
- Never projected: `rawSteps` (only `rawStepCount`), `preparation.rawSteps`,
  raw trace event payloads beyond the bounded whitelisted shapes below, the
  untruncated `intent`/`finalText`, and the full `CellInput`/`CellRunRecord`
  payloads. Digests are 64-char hex references, not content copies.
- Trace events (`final.trace`): `eventCount`/`typeCounts` keep covering the
  full retained trace, and a bounded chronological summary
  (`final.trace.events`) adds at most `OBSERVER_TRACE_EVENT_LIMIT` (64)
  retained events in observation order that also fit the
  `OBSERVER_TRACE_EVENTS_MAX_BYTES` (12 KiB) rendered-UTF-8 byte budget of
  the list. Each entry projects only its retained index, bounded timestamp,
  and bounded event type, plus — when the payload exactly matches a
  core-owned whitelisted shape — the authorized tool names of a
  `cell.tools.projected` event (exactly the single `tools` array) or the
  exact `{ name, toolCallId, outcome }` triplet of a `cell.tool.settled`
  event. Every other payload — all no-tool driver events, extra fields that
  could carry tool inputs or results, unknown outcomes, oversized
  identifiers — fails closed to timestamp and type, and an over-limit or
  over-budget trace is disclosed with `eventsTruncated` instead of being
  fabricated or carried past the caps.
- Core-owned emit boundary: an injected-tool run retains only core-owned
  trace events (`cell.started`, `cell.prepared`, `cell.tools.projected`,
  `cell.tool.settled`, `cell.capability_mismatch`, `cell.error`, and
  `cell.finished`); every Integration-originated driver event is dropped at
  the core boundary, the driver execution steps are omitted from the final
  `rawSteps`, and provider metadata is recorded as explicitly unavailable —
  so tool inputs, results, and provider payloads cannot re-enter the
  retained evidence through the driver path (section 14).

## 5. Verification

- `apps/workbench/test/workflow-observer.test.ts`:
  - updated projection test asserts bounded `input.goal` and `final.result`
    text with digests, `instructions`/`acceptance` values, the `evidence`
    ref/digest block, and still asserts no `finalText`/`rawSteps`/trace `data`
    and no `"rawSteps"` key anywhere in the serialized context;
  - new adversarial-fixture test puts prompt-injection-shaped text in all four
    evidence-only fields and asserts each stays reviewable inside an
    `evidenceOnly`-marked projection (exactly four markers matched on the
    `JSON.stringify` output as `"evidenceOnly":true`) with no unmarked
    instruction channel, and that the constant `reviewProtocol` framing is
    present, states the boundary, and carries none of the adversarial text;
  - new truncation test (5000-char goal/result → 2048-char snippets,
    `truncated: true`, full-text digests, bounded total size);
  - new `attemptSourceDigests` tests covering the exact file-byte and
    full-text digests, the unreadable/absent-source `unavailable`
    degradation, the `changed` degradation when any pinned family member no
    longer parses to the strict-read value (input/final text rewrites and
    attempt/settlement/control replacements), the size-cap refusal for
    retained sources above `EVIDENCE_FILE_DIGEST_LIMIT_BYTES`, and a
    retained source of exactly the cap size being fully digested within the
    bound; the optional control receipt appearing between the strict read
    and the digest phase degrading to `changed`;
  - new record round-trip test for optional `evidenceDigests`;
  - the three pre-existing query-gap/legacy tests are unchanged.
- Existing consumers are compatible: `readWorkflowReviews`/the UI projection
  spread records, so the optional field is additive; the legacy strict schema
  is untouched.

## 6. Scope

All changes are confined to the observer evidence projection:
`apps/workbench/src/workflow-observer.ts`, its test, and these observation
docs. No queue, lifecycle, enumeration, or permission mechanism was added;
no primary checkout was modified.

## 7. Boundary hardening (independent follow-up review)

A later independent review found three reachable boundary issues in the
projection above; each was fixed in the same bound Worktree with no change to
the evidence boundaries, the observer read-only posture, or the record schema.

1. **Per-item string truncation was not reported.** `boundedStrings` sliced
   every item to the item limit but set `truncated` only from the list length,
   so a single instruction/acceptance/capability item longer than the limit
   was silently truncated with `truncated: false`. `truncated` is now true
   when any retained item was sliced, and the focused test covers both a
   single 600-char item (→ 512-char projection, `truncated: true`) and a
   20-item list (→ 16-item projection, `truncated: true`), plus the default
   256-char capability item bound.

2. **Evidence-only text was not distinguishable from observer instructions.**
   `input.goal`, `input.instructions`, `input.acceptance`, and `final.result`
   carry untrusted text supplied by the reviewed task or its retained result;
   without an explicit boundary an observer model could misread them as
   control instructions. Each of those four fields is now wrapped in a
   structured marker — `evidenceOnly: true`, `boundary:
   "untrusted-task-evidence"`, and the exact retained `sourceLabel` — and the
   context declares a top-level `dataBoundary` section naming the four
   isolated fields and their meaning. Plain data fields only: no observer
   kind enum, schema, or record change. The adversarial fixture puts
   prompt-injection-shaped text in all four fields and asserts the text stays
   reviewable while every occurrence sits inside an `evidenceOnly`-marked
   projection and no unmarked instruction channel exists.

3. **Digest reads did not re-verify ref boundaries and had a replacement
   window.** `attemptSourceDigests` trusted caller-supplied refs and read the
   two retained files with plain `readFileSync`, so a crafted ref could read
   outside home (through `..` or a symlink) and a file replaced between the
   two reads could mix snapshots. The exported helper now uses
   `openPinnedEvidenceFile` / `confirmPinnedEvidenceFile`: each ref is
   rejected when absolute, lexically escaping home, resolving outside the
   canonical home tree (`realpath` containment), a symlink, or not a regular
   file; both files are opened and pinned before either is read; and after
   the reads each path is re-confirmed against the pinned inode, size,
   timestamps, and canonical path so a mid-read replacement degrades the
   digests to `unavailable` instead of recording mixed bytes. Boundary tests
   cover out-of-home `..` refs (with a readable target), absolute refs, a
   final-component symlink, a symlinked intermediate directory, an in-place
   rewrite, and a rename swap; the untouched happy path still yields the
   exact digests.

All constraints from section 6 hold: the observer stays read-only, raw
provider steps and trace event payloads are still never copied, no queue,
lifecycle, enumeration, or permission mechanism was introduced, and only the
bound Worktree changed.

## 8. Second independent review: same-snapshot digests, bounded reads, review-only framing

A further independent read-only review found three reachable P1 issues in
section 3/7's implementation; each was fixed in the same bound Worktree with
no change to the evidence boundaries, the observer read-only posture, the
record schema, or the observer kind enum.

1. **Parse and digest could mix two snapshots.** `runWorkflowObserver`
   parses the strict evidence family first and computes file digests after,
   so a legitimate rewrite between the two reads could leave the parsed
   goal/result text from the old bytes next to digests of the new file
   bytes. `attemptSourceDigests` now re-parses the exact pinned bytes it
   digested and compares the goal/result text with what the strict reader
   saw: agreement yields `available` with all four digests from one pinned
   snapshot; disagreement (or unparseable pinned bytes) yields `changed`,
   and `runWorkflowObserver` degrades that review to a `query-gap` record
   stating that the evidence changed while it was being read — it never runs
   the observer cell on mixed snapshots. The strict parse and the digest
   read are still two points in time; the pinned-bytes consistency check is
   what guarantees the projected text and the digests describe the same
   snapshot.

2. **Digest reads were unbounded.** `attemptSourceDigests` read each
   retained record fully with `readFileSync`, so observer memory and
   latency grew with historical evidence size. Each file is now streamed in
   64 KiB chunks into its SHA-256 with an 8 MiB cap
   (`EVIDENCE_FILE_DIGEST_LIMIT_BYTES`): a file above the cap yields
   `unavailable`, the review proceeds without `evidenceDigests`, and the
   cap is honest metadata in the observer context
   (`evidence.fileDigestLimitBytes`) and in the `limitation` text. Memory
   per file is bounded by the cap plus one chunk; an over-cap file is read
   up to the cap bytes and then stopped — never fully read — and its
   partial digest is discarded, so a partial digest is never recorded.

3. **`evidenceOnly` is not a message boundary.** The marker is a JSON field
   inside the same prompt text, so no in-prompt marker can fully prevent
   task-text injection attempts. Claims are narrowed accordingly (sections 3
   and 7): the marker plus a constant `reviewProtocol` section — built from
   no evidence field, so task/result text can never overwrite it, and
   supplied after the observer instructions in the rendered prompt (the
   context section follows `CellInput.instructions` in
   `renderExecutionInstructions`) — state the review-only boundary and
   instruct the observer to treat instruction-like text inside evidence
   fields as reviewed content. The remaining guarantee is structural, not
   textual: the observer is read-only with no write, command, or acceptance
   authority, so any successful injection is limited to the review text
   itself. The adversarial fixture also asserts the constant framing is
   present, states the boundary, and carries none of the adversarial text.

All constraints from section 6 hold: the observer stays read-only, raw
provider steps and trace event payloads are still never copied, no queue,
lifecycle, enumeration, or permission mechanism was introduced, and only the
bound Worktree changed.

## 9. Third independent review: family-pinned snapshot and exact bounded reads

A further independent read-only review found two remaining evidence-boundary
issues in section 8's implementation; each was fixed in the same bound
Worktree with no change to the evidence boundaries, the observer read-only
posture, the record schema, or the observer kind enum.

1. **The whole evidence family is bound to one pinned snapshot.** The strict
   reader and the digest phase are still two points in time, and comparing
   only the input intent and final result text left attempt/settlement/
   control open to replacement between the two reads: the review could then
   record an old parsed summary next to digests of new file bytes.
   `attemptSourceDigests` now treats the complete family — cell input,
   attempt record, final record, settlement, and the control receipt when
   the strict reader retained one — as one snapshot: every present member is
   opened and pinned before any member is read, streamed in bounded chunks,
   re-confirmed against its pinned canonical path and inode, and then its
   pinned bytes are re-parsed with the exact schemas the strict reader used
   (`CellInputSchema`, `TaskRunAttemptSchema`, `CellRunRecordSchema`,
   `TaskRunSettlementSchema`, `ControlReceiptEvidenceSchema`) and compared
   field-for-field (deep equality) with the strict-read value. A member the
   strict reader did not retain must still be absent: a file appearing
   between the two reads is a family change too. Any difference — rewritten,
   appeared, or unparseable — yields `changed`, and `runWorkflowObserver`
   degrades that review to a `query-gap` record, so the observer cell never
   runs against mixed snapshots. The schema re-parse keeps schema-applied
   defaults identical on both sides, so byte-identical retained sources
   always compare equal. New tests replace the attempt record, the
   settlement, and the control receipt between the strict read and the
   digest read (each with input/final untouched) and assert `changed`, plus
   the appeared-member case; the existing digest fixtures were upgraded to
   schema-complete family records so the same pinned-snapshot guarantee is
   exercised end to end.

2. **Digest reads never exceed the public cap.** The bounded reader allocated
   a full chunk per iteration and only checked the cap after adding the
   chunk, so a file just above the 8 MiB cap could actually be read up to
   one chunk past the advertised limit ("cap plus one chunk"). Each
   iteration now reads at most the remaining budget — the last read is
   limited to the leftover budget — and a file whose pinned size exceeds the
   cap is detected from the pinned size and never read past the cap at all:
   actual bytes read per file are now provably ≤
   `EVIDENCE_FILE_DIGEST_LIMIT_BYTES`, and files at exactly the cap are
   fully digested. The observer context `limitation` text and this audit now
   state the exact bound and the family-pinned snapshot. Tests cover a
   retained source of exactly the cap size (fully digested, exact digest)
   and one above the cap (digest-unavailable, never fully read).

All constraints from section 6 hold: the observer stays read-only, raw
provider steps and trace event payloads are still never copied, no queue,
lifecycle, enumeration, or permission mechanism was introduced, and only the
bound Worktree changed.

## 10. Fourth independent review: vanished sources are a query gap, not an over-cap continuation

A further independent read-only review found one reachable P1 in section 9's
implementation: after the strict reader had accepted the complete evidence
family, a member deleted, replaced with an unreadable file, or replaced by a
symlink made `attemptSourceDigests` return `unavailable`, and
`runWorkflowObserver` only degraded `changed` to a `query-gap` — so it could
launch the observer cell against the old strict summary for a family that
could no longer be verified at its refs. The fix distinguishes the two
`unavailable` causes on the outcome itself:

1. **`sources-unreadable` degrades to a query gap.** The `unavailable`
   outcome now carries `reason: "over-cap" | "sources-unreadable"`.
   `sources-unreadable` means a retained source vanished or became
   unreadable (deleted, replaced by a symlink or non-regular file, moved
   out of bounds, or swapped mid-read) between the strict read and the
   pinned digest read; `runWorkflowObserver` treats it exactly like
   `changed`: the review records a `query-gap` with a finding that names
   the vanished/unreadable sources, and the observer cell never runs
   against an old parsed summary. An incomplete family (for example a
   runner-failed attempt that never retained a final record, or a settlement
   deleted before the strict read) still uses the generic incomplete-family
   finding, so message accuracy is preserved.

2. **`over-cap` continues under the bounded policy.** A source that is
   present and readable but exceeds `EVIDENCE_FILE_DIGEST_LIMIT_BYTES`
   remains the established bounded-policy case: the review proceeds and
   honestly records no `evidenceDigests`. The observer context
   `evidence.fileDigestLimitBytes` and the `limitation` text state the cap;
   the `limitation` text now also states that a family member rewritten,
   appearing, or vanishing during the review degrades the review to a
   query gap, while only the over-cap case proceeds without digests.

Tests: the focused suite now distinguishes the reasons at the helper level
(a retained member deleted between the strict read and the pinned read is
`sources-unreadable`; a present member above the cap is `over-cap`) and
through `runWorkflowObserver`: a settlement file replaced by a symlink to
valid settlement bytes — accepted by the strict reader, refused by the
pinned reader — yields a `query-gap` record naming the vanished/unreadable
sources with no `evidenceDigests`, and a settlement deleted before the read
yields a `query-gap` through the incomplete-family gate. The existing
`unavailable` assertions were updated only for the new `reason` field.

All constraints from section 6 hold: the observer stays read-only, the
complete family stays pinned to one canonical snapshot, the digest cap stays
strict, raw provider steps and trace event payloads are still never copied,
no queue, lifecycle, enumeration, or permission mechanism was introduced,
and only the bound Worktree changed.

## 11. Fifth independent review: non-retained members stay absent after the family is pinned and read

A further independent read-only review found the final evidence-consistency
boundary in section 9's implementation; both findings were fixed in the same
bound Worktree with no change to the evidence boundaries, the observer
read-only posture, the record schema, or the observer kind enum.

1. **A member the strict reader did not retain could appear between the
   absence check and the pinned read.** `attemptSourceDigests` verified
   that a non-retained member (the optional control receipt of a
   control-stopped attempt) was absent exactly once, inside the pin loop,
   and then continued: a receipt appearing between that check and the
   completion of the pinned reads (for example a concurrent stop settling
   the attempt while the observer digests) was never seen again, so the
   observer could still run against an old summary with no control receipt
   while `control.json` now exists in the family. Absence of every
   non-retained member is now confirmed **after** the whole family has been
   pinned, read, and re-confirmed against its pinned inode: the digest
   phase returns `changed` (and `runWorkflowObserver` records a query gap
   for it) for an appearance at any point before that final confirmation —
   before the digest phase or while members were being read — instead of
   returning an old-summary digest set. The new test performs a real strict
   read of a family without the optional receipt, writes `control.json` in
   the window between the strict read and the digest phase, and asserts the
   digest outcome is `changed`; the existing appeared-member test keeps
   passing against the same gate.

2. **Cap wording: over-cap sources are read up to the cap and stopped,
   never fully read.** The context `limitation` text and this audit
   (section 8.2) previously said an over-cap file was "never partially
   read". The bounded streaming reader does read such a file up to the cap
   bytes and then stops — the partial digest is discarded, so no partial
   digest is ever recorded — and the wording now states exactly that (read
   up to `EVIDENCE_FILE_DIGEST_LIMIT_BYTES` and stopped, never fully read)
   in the observer context `limitation`, the `streamPinnedEvidenceFile`
   documentation, and this audit.

All constraints from section 6 hold: the observer stays read-only, the
complete family stays pinned to one canonical snapshot, the digest cap stays
strict, raw provider steps and trace event payloads are still never copied,
no queue, lifecycle, enumeration, or permission mechanism was introduced,
and only the bound Worktree changed.

## 12. Sixth independent review: dangling-symlink absence confirmation for non-retained members

A further independent read-only review found one reachable P1 in section 11's
implementation: the final absence confirmation for members the strict reader
did not retain used `existsSync`, which follows symlinks — a dangling symlink
appearing at the optional control receipt path between the strict read and
the digest phase (or sitting there while the strict reader's own
`existsSync`-following read already missed it) reported `false`, so the
absence confirmation concluded the member was still absent and the observer
could run against an old summary while the receipt path now holds an entry.
The fix:

1. **Absence is confirmed with lstat presence, never `existsSync`.** The
   final absence confirmation now uses `lstatEntryExists` (a `lstatSync`
   probe): a broken symlink is still a directory entry that appeared, so it
   degrades the family to `changed` and `runWorkflowObserver` records a
   query gap — only a truly absent entry (no directory entry at all) passes
   the check. This closes the appearance window for every entry kind a
   concurrent writer can create at a non-retained ref, including ones whose
   target does not exist.

Tests: the focused suite now includes a broken-symlink appearance story
(strict read of a family without the receipt, then a dangling symlink at the
receipt path in the strict-read→digest window: `attemptSourceDigests` →
`changed`) and an end-to-end `runWorkflowObserver` story where the receipt
path holds a dangling symlink from the start — the strict reader's
`existsSync`-following read sees no receipt and accepts the family, the
lstat absence confirmation sees the directory entry, and the review records
a `query-gap` naming the changed evidence with no `evidenceDigests` and no
observer run. The existing real-receipt appearance test keeps passing
against the same gate.

All constraints from section 6 hold: the observer stays read-only, the
complete family stays pinned to one canonical snapshot, the strict digest
cap and the vanished/unreadable vs over-cap distinction are unchanged, raw
provider steps and trace event payloads are still never copied, no queue,
lifecycle, enumeration, or permission mechanism was introduced, and only the
bound Worktree changed.

## 13. Seventh independent review: only ENOENT counts as absence for non-retained members

A further independent read-only review found one reachable P1 in section 12's
implementation: `lstatEntryExists` returned `false` for **every** `lstatSync`
failure, so an `EACCES`, `ELOOP`, or `ENOTDIR` error on the optional control
receipt path was misread as "the member is still absent". If the receipt's
parent directory or path became inaccessible between the strict read and the
digest phase, the observer could still run against an old summary with no
control receipt instead of degrading to a query gap. The fix:

1. **Only a true `ENOENT` is absence.** The final absence confirmation now
   uses a tri-state lstat classification
   (`checkNonRetainedMemberAbsence`): a present entry (including a dangling
   symlink, whose target does not resolve) is `present` → `changed`; no
   directory entry at all (`ENOENT`) is `absent` → the family proceeds; any
   other lstat failure (`EACCES`, `ELOOP`, `ENOTDIR`, ...) is `unverifiable`
   → the outcome is `unavailable`/`sources-unreadable`, and
   `runWorkflowObserver` writes a query gap naming the vanished/unreadable
   sources. An uncheckable ref is neither absence nor a confirmed appearance:
   the family can no longer be verified at its pinned refs, so the old
   summary must not launch the observer.

Tests: the focused suite now includes an lstat-error-path story — a complete
strict-valid family without the optional receipt (canonical ref passes the
absence check and the family digests are `available`), then the receipt path
made uncheckable by a symlink loop at an intermediate component
(`ELOOP` on the lstat): `attemptSourceDigests` returns
`sources-unreadable`, the same outcome `runWorkflowObserver` already
degrades to a query gap (the existing settlement-symlink end-to-end story
covers that wiring). The receipt ref shares its parent directory with the
retained members, so an end-to-end story where only the receipt path becomes
uncheckable is not constructible without also breaking the retained reads;
the direct helper test with a crafted `controlRef` isolates the new branch.
The existing real-receipt and dangling-symlink appearance stories keep
passing against the same gate.

All constraints from section 6 hold: the observer stays read-only, the
complete family stays pinned to one canonical snapshot, the strict digest
cap and the vanished/unreadable vs over-cap distinction are unchanged, raw
provider steps and trace event payloads are still never copied, no queue,
lifecycle, enumeration, or permission mechanism was introduced, and only the
bound Worktree changed.

## 14. Observer tool-settlement evidence: whitelisted settled tool actions and the core-owned emit boundary

The bounded chronological trace summary (section 4) reconstructs the real
tool actions of an injected-tool run from two core-owned retained events —
`cell.tools.projected` and `cell.tool.settled` — without ever copying tool
inputs, results, or provider payloads. Sections 1–13 remain the source-linked
historical record; this section documents the tool-settlement evidence
mechanism implemented after them. No mechanism, test, schema, cache,
lifecycle, Task, or observer state was changed for this documentation pass.

### 14.1 Observed symptom

The motivating dogfood attempt `b73ffd7e-13e8-4935-8222-8c9f8d1edadf`
claimed in its final text that it executed `list_files`/`read_file`, but its
retained final trace held only `cell.started`,
`cell.tools.projected: [sub_worker]`, and `cell.finished` — no
`cell.tool.settled` event at all. The standard observer could not
reconstruct any real tool action from the retained trace, and a worker's
self-report is not evidence: the review could not distinguish a real
invocation from an unverifiable claim.

### 14.2 Core-owned emit boundary and the retained settled evidence

In the Work Cell core (`packages/work-cell/src/run-cell.ts`), a nonempty
caller-injected tool set (`RunCellOptions.tools`; for example the parent
Run's `sub_worker` tool) switches the run to the core-owned retained-
evidence projection:

- One `cell.tools.projected` event is emitted once, before any provider
dispatch and before the first settlement or the immutable final, carrying
the sorted union of the caller-injected names and the exact model-visible
surface the driver reports (`observeToolSurface`). A driver that never
reports its surface still gets the caller-injected names projected — the
projection is the truthful minimal surface, never a fabricated one.
- Every real invocation — caller-injected, host workspace, host task, or
declared terminal — is retained exactly once as `cell.tool.settled` with
exactly `{ name, toolCallId, outcome }` where outcome is `fulfilled`,
`rejected`, or `refused`; the gate's own settlements and the driver-reported
settlements share one deduplicated emitter, and an invocation refused after
the action phase closes keeps its bounded `refused` triplet without ever
invoking the caller implementation.
- A name outside the projected surface fails closed: no settled evidence is
retained for a tool that was not part of the model-visible set.
- Every Integration-originated driver event is dropped at the core boundary
for an injected-tool run (the `context.emit` wrapper), the driver execution
steps are omitted from the final `rawSteps`, and provider metadata (session
id, provider fingerprint) is recorded as explicitly unavailable — so tool
inputs, results, and provider payloads cannot re-enter retained evidence
through the driver path.

Both drivers that can carry injected tools — the AI SDK v7 driver
(`ai-sdk-v7`) and the Pi harness driver (`ai-sdk-harness-pi-v1`) — report
the exact model-visible surface before dispatch and report every real
invocation's bounded triplet through the core-owned channel, so host tools
such as `list_files`/`read_file` are projected and settled exactly like the
injected tool. A run without an injected tool set keeps the historical
driver-originated trace; those events never match the whitelisted shapes, so
the observer summary projects timestamp and type only and claims no tool
action.

### 14.3 The observer side

`apps/workbench/src/workflow-observer.ts`'s `final.trace` block keeps
`eventCount`/`typeCounts` over the full retained trace and adds the bounded
chronological summary: each of the first at most 64 retained events that
also fit the 12 KiB rendered-UTF-8 budget of the list projects its retained
index, bounded timestamp, and bounded event type, plus the whitelisted
payload only when the payload exactly matches a core-owned shape —
`cell.tools.projected` with exactly the single `tools` array, or
`cell.tool.settled` with exactly the `{ name, toolCallId, outcome }`
triplet. Every other payload (all no-tool driver events, extra fields,
unknown outcomes, oversized identifiers) fails closed, and over-limit or
over-budget traces are disclosed as `eventsTruncated`. `firstAt`/`lastAt`
and every event timestamp apply the same bounded timestamp rule.

### 14.4 Truthfulness boundary

Nothing is fabricated. A run with no real invocation retains the projection
and zero `cell.tool.settled` events; a refused call retains its bounded
`refused` triplet; a worker claim about a tool that never appears in the
projected surface or the settled evidence is exactly that — a claim — and
the observer reports the visibility gap instead of treating the self-report
as evidence. When the claimed tool was genuinely part of the model-visible
surface but no invocation evidence is retained, the fix is the input/routing
(ensuring the worker is granted and routed to the capability it claims),
never the fabrication of a settled event.

### 14.5 Verification

Core side (`packages/work-cell/test/host-tools.test.ts`): an injected-tool
run retains one bounded settled triplet per real host and injected
invocation and projects the actual model-visible surface (including
`list_files`/`read_file`), so the worker's real invocations are
reconstructable from the retained trace while paths, contents, and results
never enter any retained surface; an injected-tool run with no real
invocation retains the projection and zero settled evidence; host tool
settlements keep exactly the whitelisted triplet keys. Observer side
(`apps/workbench/test/workflow-observer.test.ts`): the bounded chronological
summary replays the retained observation order with the whitelisted tool
names and triplets, fails closed for enriched or malformed payloads and for
all no-tool driver events, explicitly truncates over-limit traces, and
enforces the real UTF-8 byte budget on the rendered list.
