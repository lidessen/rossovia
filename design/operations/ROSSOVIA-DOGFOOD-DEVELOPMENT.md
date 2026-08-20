# Rossovia Dogfood Development

**Status:** project-local development guidance. This is a prompt-like working
profile, not a mandatory protocol, a scheduler, or a new task lifecycle.

The conversational entry point is the on-demand
[`rossovia-development` Skill](../../skills/rossovia-development/SKILL.md).
Its [`dogfood` reference](../../skills/dogfood/SKILL.md) selects this local
mode. Keep this document as the detailed local-runtime reference rather than
resident Agent instructions; external-only delegation belongs to the parent
Skill, not this profile.

This note describes one useful way to develop Rossovia by running Rossovia on
itself. It is deliberately small: keep the existing Workbench, Task,
Chronicle, worker, and operating-protocol surfaces; do not introduce a second
control plane for dogfooding.

## The idea

Keep one known-good local runtime, make the next change in the repository,
rebuild and restart that runtime, use it for real work, and move forward when
the result is usable. If the new runtime has a serious regression, rebuild
from the last local tag and continue diagnosis from the candidate commit.

```text
known-good local runtime
        ↓
local source change → paired build → restart and smoke check
        ↓                         ↘ serious regression → rebuild last tag
     dogfood task
        ↓
default local read-only observer worker
        ↓
existing observation/log record
        ↓
human-triggered ordinary Task to read and comment on recent reviews
        ↓
next change, defer, or no-change decision
```

The observer and the review-processing prompt are conveniences. They do not
approve work, create a queue, change the Mission, or replace the normal branch,
review, and Principal decision path. See the
[Operating Protocol](OPERATING-PROTOCOL.md),
[Observation Chronicle](../../chronicle/README.md), and
[AI review decision](../decisions/023-ai-review-evidence-and-principal-confirmation.md)
for those authorities.

## 1. Preserve a reversible local snapshot

Before replacing the running copy:

1. Make the source identity explicit. Prefer a clean commit; if the work is
   intentionally local, record the exact dirty state before building.
2. Add a local-only tag to the known-good source commit, for example
   `dogfood/2026-08-20-<short-sha>`. Do not push this tag by default. The tag is
   a source rollback anchor, not proof that installed binaries came from it.
3. Build the `rossovia` and `rossovia-autonomy` pair using the existing local
   build path. The pair matters; do not replace only one binary. See the
   [Workbench local-build instructions](../../apps/workbench/README.md#local-build-and-install).
4. Record the minimum useful identity: source commit/tag, build time, binary
   digests when available, process id/port, and smoke result. Use an existing
   task or observation record when one is already in scope; do not create a
   dogfood snapshot database merely to hold this information.

The current local build script compiles and installs the pair; it does not
promise an atomic two-file installation. Treat the stop/build/start sequence
as a short replacement window and verify the new process before calling it
known-good.

## 2. Roll forward or roll back

After the build, start the replacement in its normal foreground/runtime entry
and run a small smoke check: the process starts, the snapshot/status endpoint
responds, the main task entry is usable, and the intended browser or CLI path
works. Browser screenshots, snapshots, console output, and geometry are
evidence, not acceptance by themselves.

Use the last known-good tag when the replacement cannot boot or serve, the
snapshot identity is untrustworthy, a core task cannot be completed, state or
data is damaged, control/ownership evidence is false, or the process repeatedly
crashes. Rollback means stop the candidate, rebuild the pair from the tag,
restart, smoke-check, and retain the candidate commit and failure observation
for diagnosis. It does not mean resetting or deleting the development
worktree.

For a local usability, latency, wording, or visibility problem that does not
make the runtime unsafe or unusable, keep moving forward and record it as a
review observation. When uncertain, keep the old runtime as known-good and do
not silently label the new one current.

## 3. Dogfood task evidence

Use the real runtime for a real task. At the end, retain only enough evidence
to reconstruct what happened:

- source/runtime snapshot identity;
- task input and intended outcome;
- attempt/final/settlement status;
- transcript, trace, diff, checks, or browser/CLI evidence available through
  standard APIs;
- what was expected, what was observed, and what remains uncertain.

Worker success is not correctness. A product-facing pass can use the
[product dogfood review](../../skills/product-dogfood-review/SKILL.md); source,
tool, or evidence-surface questions can use the existing code-review,
context-engineering, or agent-tooling methods.

## 4. Local observer default

The intended launcher contract is that `--dogfood` implies this observer
default; callers should not need a second observer-enable flag. The current
runtime may still expose compatibility flags while that contract is being
implemented, so use the active `rossovia` help and report any mismatch rather
than assuming the design is already shipped.

When Rossovia starts locally through the Workbench UI, it enables one ordinary
read-only background worker for each settled conversation Run. The default
worker is the host-policy `deepseek-flash` card. Choose another worker or turn
the local default off at startup:

```text
rossovia ui --observer <worker-id>
rossovia ui --disable-observer
```

The per-task CLI opt-in remains available when running outside the UI:

```text
rossovia task run <task-id> --worker <worker-id> \
  --enable-observer --observer <observer-worker-id>
```

The observer is a thin adapter around the existing Work Cell and standard
attempt-evidence API, not a resident daemon or a second Task. A direct
invocation is also available for a settled attempt:

```text
rossovia observer --attempt <attempt-id> --worker <observer-worker-id>
```

The opinion is appended to the Workbench-owned source-native
`ROSSO_HOME/state/dogfood-reviews.jsonl` store. Each line is a versioned,
schema-validated review record and can be read back through the Workbench
observer reader. It is not a Chronicle projection or an authority over the
source Task, attempt, settlement, or any later disposition.
If the observer cannot query enough evidence, or its own run fails, it records
`query-gap`/`runner-failed` and exits. It must not block the completed task,
the next snapshot, a rebuild/restart, or a human repair.

Give the worker a complete, receiver-facing prompt similar to:

> Review this settled Rossovia dogfood task from the supplied standard API
> evidence. Check the task outcome, runtime snapshot, transcript/trace/diff and
> checks that are actually visible. Separate facts, interpretation, and
> uncertainty. Report at most the few findings that could change the next
> practice: defect, regression, friction, ambiguity, or observability/query
> gap. If the API cannot show something you need, report the exact missing
> surface and its consequence; do not bypass the API by reading private state.
> Record source locators and your worker/model profile. Do not edit files,
> retry the task, accept or merge anything, roll back the runtime, or create a
> follow-up task.

The worker should append a small review-like observation to an existing
log/Chronicle surface when that surface is available. Keep the original task
and transcript as the source; do not copy a full transcript into a second
log. The current thin path uses the small Workbench source-native JSONL store
above; it does not copy a full transcript or claim to be a Chronicle receipt.
A useful
record names the target task/attempt, snapshot identity, sources
consulted, findings, limitations, and a suggested next probe. An inability to
query a transcript or trace is itself a valid observability finding.

Choose the worker from the current `worker list` and host policy. A routine
observer can use an economical Flash-class profile; use a stronger profile
only when the review is ambiguous or consequential, and always record the
actual provider/model. Provider names, account availability, and model
ordering belong to host policy, not to this document.

## 5. Process recent reviews when asked

At a human-chosen safe point, use an ordinary Task with a prefilled prompt such
as “process recent Rossovia dogfood reviews”. The prompt should ask the worker
to read the recent review observations through standard APIs, avoid duplicates,
and for each item record one of: read/commented, routed to an ordinary change
Task, deferred with a reason, or no change.

The processing Task must add a new disposition/comment record or ordinary task
result; it must not mutate an immutable observation. “Read” means only that the
processing Task considered it—it does not mean fixed, accepted, merged, or
true. Creating a follow-up Task, changing source, rolling back, and accepting
work still require their normal authority and human decision.

This prompt is a shortcut for an ordinary Task. It is not a review inbox,
special queue, scheduled service, or new schema. If there are no recent
records, the correct result is an explicit no-op with the query boundary used.

## 6. Improve the log only when observation needs it

If an observer cannot reconstruct the task, the problem is not permission to
read private files. Record a visibility gap and propose the smallest standard
API/log improvement: a stable task or attempt id, source revision, timestamp,
status transition, digest, locator, or structured field. Prefer structured
evidence over larger transcripts. Land such an improvement through the normal
development path and then rebuild/restart the dogfood runtime.

## 7. Human intervention when Rossovia is the limitation

Rossovia dogfood is the default development path, not an exclusive authority.
When the current Rossovia implementation cannot solve the problem because of
an implementation, tooling, provider, or evidence-visibility limitation, the
user may intervene directly in the source code. Record the context and the
reason the normal path was insufficient, make the smallest direct change, and
then return to the same rebuild → restart → smoke-check → dogfood loop. A
failed observer, a `query-gap`, or an unavailable review worker never blocks
that intervention or the next snapshot cycle.

Direct editing does not silently mean that the change is accepted, merged, or
safe. Keep the normal review, verification, rollback, and Principal decision
boundaries once the runtime is usable again. If Rossovia can take the next
step, prefer Rossovia; use human intervention to cross a real capability
boundary, then make the gap visible as a candidate improvement.

## Safe points and boundaries

Useful safe points are after task settlement, after observer recording, before
build/restart, after the replacement smoke check, and before branch/PR/merge or
session handoff. Use Mission continuity only when the obligation genuinely
crosses a session; it is not a backlog or scheduler.

This profile does not make the following automatic: retries, fixes, task
creation, acceptance, merge, rollback, protocol changes, or Skill changes.
Observer startup is the one local UI default described above and can be
disabled explicitly. This profile also does not turn a local tag into a
published release.
Those actions remain ordinary, explicitly authorized work.

## Small implementation backlog (not a new mechanism)

If this working profile proves useful, implement only the smallest missing
pieces through normal Tasks:

1. make runtime snapshot identity easy to inspect;
2. keep the thin local observer default and its explicit disable/worker-choice
   flags useful without turning it into a resident service;
3. expose the standard evidence needed for review, or make its absence clear;
4. append review opinions to the existing observation/log surface;
5. keep “process recent reviews” as a reusable ordinary Task prompt;
6. perform one manual rollback drill.

Each item is optional and should be justified by a real dogfood observation.
Do not implement the whole list as a prerequisite to using the workflow.
