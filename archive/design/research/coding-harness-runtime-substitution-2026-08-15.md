# Coding Harness Runtime Substitution — 2026-08-15

**Status:** source-bound implementation research; recommends a bounded runtime
substitution but does not itself adopt dependencies or accept a Task

**Observed:** 2026-08-15

**Question:** After a raw Vercel AI SDK tool loop damaged an existing source
file, which established coding-harness mechanisms should Rossovia absorb before
ordinary Tasks move away from `opencode-cli`?

**Decision boundary:** Rossovia keeps canonical Task, Worktree lease, immutable
Cell input, attempt/final/settlement evidence, reconciliation, Mission, review,
and Principal acceptance. An imported harness may own the model/tool loop,
session mechanics, compaction, and model-facing tool protocol; it may not become
a second Task, workspace, authority, or acceptance owner.

## Executive conclusion

Do not continue the bespoke `ToolLoopAgent + write_file + edit_file` design, and
do not adopt the current Vercel Pi adapter unchanged.

The next bounded candidate should use Vercel AI SDK's `HarnessAgent` with Pi as
the in-process harness, while disabling every Pi filesystem/shell built-in and
supplying Rossovia's existing host-executed, scope-bound Work Cell tools. Reuse
Pi's native exact batch-edit implementation behind the host tool instead of
reimplementing text replacement. The harness sandbox remains an empty runtime
support surface; it does not contain or own the Git worktree. Stateless
Rossovia attempt lineage remains the ordinary continuation authority.

Reasonix is not the immediate runtime dependency. Its cache and recovery
mechanisms are stronger guidance for the next iteration: stable provider
prefixes, tiered deterministic tool-output reduction before summary, cache
diagnostics, atomic edit batches, and per-call permission/sandbox separation.

This shape uses community mechanisms where they are mature, preserves
Rossovia's existing owner boundaries, and keeps one replaceable harness adapter
rather than rebuilding a coding harness inside `AiSdkValidationDriver`.

## Pinned source set

| Source | Exact revision | Why it is in scope |
| --- | --- | --- |
| [Vercel AI SDK](https://github.com/vercel/ai/tree/8d05a5574aed8533df3f8e2e6a019cbf15bd4a15) | `8d05a5574aed8533df3f8e2e6a019cbf15bd4a15` | `HarnessAgent`, the Pi adapter, sandbox/session contracts, and combined host/built-in tool policy |
| [Pi](https://github.com/earendil-works/pi/tree/086c32e74530564922d011ade23ff582c9d63116) | `086c32e74530564922d011ade23ff582c9d63116` | embeddable coding session and native file-mutation semantics |
| [Reasonix](https://github.com/futureflowtech/reasonix/tree/e9f4e800f625e566ddc770ae8dd9e49cffb64ead) | `e9f4e800f625e566ddc770ae8dd9e49cffb64ead` | DeepSeek-oriented cache, compaction, permissions, and atomic tool contracts |
| [just-bash](https://github.com/vercel-labs/just-bash/tree/53b07e51cfcdb4ede723f77b9aa624166fd89211) | `53b07e51cfcdb4ede723f77b9aa624166fd89211` | local sandbox filesystem choices and their write-through boundary |

These revisions are evidence snapshots, not an instruction to track mutable
default branches.

## Triggering local observation

A real raw `AiSdkValidationDriver` run against DeepSeek reached 80 model steps
and retained provider/model/usage/task/diff evidence, but the first source edit
used a whole-file `write_file` after a partial read. It replaced
`packages/work-cell/src/contracts.ts` and removed 374 lines. The only worker
change was restored to the coordination commit before this inquiry.

That failure is not primarily a model-quality problem. The runtime offered a
tool whose easiest valid invocation was structurally unsafe for an existing
file, and it lacked the session/tool discipline mature coding harnesses already
provide. More prompting would leave the mechanism unchanged.

## What Vercel AI SDK already owns

Vercel's [HarnessAgent overview](https://github.com/vercel/ai/blob/8d05a5574aed8533df3f8e2e6a019cbf15bd4a15/content/docs/03-ai-sdk-harnesses/02-harness-agent.mdx)
separates provider/model abstraction from harness abstraction. A harness owns
workspace-facing tools, session and resume state, compaction, permissions, and
runtime configuration while `HarnessAgent` normalizes streaming, host tools,
approvals, and lifecycle into AI SDK shapes. The packages are explicitly
experimental, so the adapter and versions must be pinned and qualified rather
than treated as a stable platform promise.

The [tool contract](https://github.com/vercel/ai/blob/8d05a5574aed8533df3f8e2e6a019cbf15bd4a15/content/docs/03-ai-sdk-harnesses/03-tools.mdx)
has the mechanism Rossovia needs:

- built-in harness tools and host-executed AI SDK tools are distinct;
- `activeTools` or `inactiveTools` can remove built-ins before execution;
- host tools execute in the embedding process and can retain Work Cell's own
  capability checks; and
- user tools override the public combined tool surface on a name collision.

The current [Pi adapter](https://github.com/vercel/ai/blob/8d05a5574aed8533df3f8e2e6a019cbf15bd4a15/packages/harness-pi/src/pi-harness.ts)
runs Pi in the host Node process and uses a sandbox only as its remote
filesystem/shell. It supports built-in filtering, opaque session resume state,
skills, compaction events, and host tools. This is the right execution-loop
category for an ordinary Rossovia coding Task.

### Why the adapter cannot be admitted unchanged

The adapter does not expose Pi's current native edit contract. Its
[`editFile`](https://github.com/vercel/ai/blob/8d05a5574aed8533df3f8e2e6a019cbf15bd4a15/packages/harness-pi/src/pi-remote-ops.ts#L206-L221)
uses `indexOf` and replaces the first occurrence. It does not require a unique
match, batch non-overlapping replacements, serialize concurrent mutations, or
preserve the native edit result's patch evidence.

Pi's actual [native edit tool](https://github.com/earendil-works/pi/blob/086c32e74530564922d011ade23ff582c9d63116/packages/coding-agent/src/core/tools/edit.ts#L300-L367)
does all of the following:

- requires one or more exact replacements;
- requires every target to be unique and non-overlapping in the original file;
- applies a batch in memory before one write;
- serializes mutations to the same real file;
- keeps the mutation queue until an aborted filesystem operation settles;
- preserves BOM and line-ending form; and
- returns both a readable diff and a unified patch.

Using the adapter's built-in `edit` would therefore be a regression precisely
at the boundary that caused the local failure. The candidate must disable
adapter `edit` and `write`, then expose a host tool backed by Pi's native edit
implementation and Work Cell's declared workspace scope.

### Why the sandbox must not own the repository

The Pi adapter mirrors the sandbox workspace into a temporary host directory
for Pi resource loading. That mirror is not Rossovia's bound Git worktree.
Using Vercel Sandbox or a copy-on-write local filesystem for the repository
would introduce a second workspace and require a new synchronization/commit
authority after the run.

just-bash makes the distinction explicit in its
[filesystem contract](https://github.com/vercel-labs/just-bash/blob/53b07e51cfcdb4ede723f77b9aa624166fd89211/packages/just-bash/README.md#filesystem-options):
`OverlayFs` reads real files but retains writes in memory, while `ReadWriteFs`
writes through to disk. A raw `ReadWriteFs` root still does not know Work
Cell's narrower read/write/exclusion policy, and just-bash does not supply the
real `git`, `bun`, or repository-specific command environment by default.

The safe first candidate therefore gives the Pi sandbox no repository content
and disables all sandbox filesystem/shell built-ins. Model effects cross only
host-executed Work Cell tools. The exact bound worktree remains the one leased
and diffed by `runCell`.

## What Pi contributes

Pi's [SDK contract](https://github.com/earendil-works/pi/blob/086c32e74530564922d011ade23ff582c9d63116/packages/coding-agent/docs/sdk.md)
is an embeddable coding harness rather than a CLI-only carrier. It provides:

- `createAgentSession` and a replaceable runtime/session manager;
- retained message history and event streaming;
- steering, follow-up, abort, compaction, and session navigation;
- resource loading for skills and context files; and
- pluggable operations for read, write, edit, bash, grep, find, and list tools.

For Rossovia, Pi should own model-loop and session mechanics. It should not own
Task lifecycle, Worktree binding, provider preference, budget approval,
settlement, review, or acceptance.

The native edit implementation is admitted as a dependency-backed mechanism,
not copied prose or a simplified local approximation. A thin adapter may map
Pi's absolute path request to a Work Cell-relative path, but every read/access/
write still goes through the existing `Workspace` owner.

## What Reasonix contributes

Reasonix's [engineering contract](https://github.com/futureflowtech/reasonix/blob/e9f4e800f625e566ddc770ae8dd9e49cffb64ead/docs/SPEC.md)
keeps provider, tool, permission, plugin, and Agent-loop mechanisms separate.
The following designs are worth absorbing after the first harness transition:

1. **Cache-stable model sessions.** Planner and executor use separate append-only
   sessions instead of switching models inside one prefix.
2. **Tiered compaction.** Old tool output is deterministically snipped and then
   pruned before a summary call; user turns, prior digests, errors, and a recent
   tail remain intact. Summary is the rare cache-reset point.
3. **Observable cache behavior.** Cache-hit/miss usage and the reason a
   cacheable prefix changed are first-class diagnostics.
4. **Permission separate from sandbox.** Each tool call receives an
   allow/ask/deny decision; sandbox confinement is an independent mechanism.
5. **Canonical tool schemas.** The documented tool surface is generated from
   the same schemas the provider receives.

Reasonix's [tool contract](https://github.com/futureflowtech/reasonix/blob/e9f4e800f625e566ddc770ae8dd9e49cffb64ead/docs/TOOL_CONTRACT.md)
also distinguishes exact single replacement from atomic `multi_edit`, retaining
no mutation when any step fails. Its Go implementation is useful comparative
evidence, but importing a separate binary and building a new AI SDK bridge now
would duplicate the runtime transition rather than reduce it.

## Rossovia owner map after substitution

| Concern | Owner after the candidate | Explicit non-owner |
| --- | --- | --- |
| Task/Mission, project/worktree identity | Workbench | Pi, AI SDK, Reasonix |
| exact lease, attempt, final, settlement, reconciliation | shared Workbench/Work Cell execution-finalization mechanism | harness session |
| model-loop, streamed steps, compaction, steer/abort | Vercel `HarnessAgent` + Pi adapter | Workbench Task |
| provider/model choice and credentials | existing worker profile/provider policy mapped into the Pi adapter | Pi defaults |
| file and command effects | Work Cell host tools and `Workspace` policy | Pi sandbox built-ins |
| exact batch edit algorithm | Pi native edit implementation with Work Cell operations | bespoke replacement code; Vercel Pi remote `editFile` |
| todo/process obligation | existing Work Cell host task tools | Pi internal task state |
| continuation authority | exact prior Rossovia attempt lineage and cumulative owner-backed diff | Pi session ID alone |
| semantic correctness and acceptance | independent review and Principal | harness completion |

## Bounded implementation candidate

The first candidate should be a new `CellDriver`, not a rewrite of Work Cell:

1. Add the AI-SDK-7.0.28-compatible package set in the Work Cell package:
   `@ai-sdk/harness@1.0.33`, `@ai-sdk/harness-pi@1.0.33`,
   `@ai-sdk/sandbox-just-bash@1.0.33`, `just-bash@2.14.5`,
   `@earendil-works/pi-coding-agent@0.79.10`, and `ws@8.21.0`. The exact
   registry manifests were checked together: harness 1.0.33 depends on the
   repository's existing `ai@7.0.28`, provider 4.0.3, and provider-utils
   5.0.10. The inspected Pi 0.79.10 package already contains the unique,
   non-overlapping batch edit and same-file mutation queue described above.
   Do not select `latest` or silently upgrade the existing provider stack in
   this slice. Retain the resolved lockfile and Apache-2.0/MIT license metadata.
2. Construct `HarnessAgent` with the Pi adapter and an empty in-memory
   just-bash sandbox. Select the provider/model explicitly from the current
   worker execution profile; never accept an adapter default silently.
3. Disable every Pi built-in tool for the first production slice. Pass only the
   existing Work Cell host tools plus a Pi-native batch `edit_file`. Existing
   files may change only through that edit tool. A full writer may create a new
   file but must refuse to overwrite an existing file.
4. Preserve the current `CellDriver` result and incremental observation
   contract: driver/provider/model identity, fingerprint, usage, completed
   tasks, safe tool targets, raw normalized steps, and provider metadata.
5. Destroy or stop the harness session at terminal settlement. Retain its
   opaque resume state as observation only; ordinary continuation remains
   `continuedFromAttemptId` plus strict attempt-family validation.
6. Route both ordinary `task run` and the conversation carrier through the same
   catalog-selected driver and existing shared finalization owner. Keep
   `opencode-cli` only as an explicitly selected compatibility/experiment
   adapter.

## Qualification gates

The candidate is not production-admissible until deterministic tests prove:

- built-in Pi `read/write/edit/bash/grep/glob/ls` are absent from the actual
  model-visible tool set;
- the host tool set is exactly the declared Work Cell capability surface;
- an absent, duplicate, overlapping, stale, or out-of-scope edit leaves bytes
  unchanged;
- multiple disjoint exact edits commit once and retain patch/diff evidence;
- a full writer cannot overwrite an existing source file;
- command execution still uses the existing executable allow-list and
  workspace scope;
- a fresh run retains actual harness/provider/model/fingerprint/usage and one
  canonical workspace diff;
- an exact prior-attempt continuation accepts only the cumulative owner-backed
  diff and does not require a Pi or OpenCode session ID;
- cancellation, model/provider failure, malformed harness evidence, and runner
  interruption remain reconcilable through the existing final/settlement/lease
  order; and
- replacing Pi with a neutral fake `HarnessV1` changes the adapter/policy, not
  the Work Cell execution-finalization mechanism.

One low-cost live DeepSeek run follows deterministic qualification. It must use
the exact isolated worktree and ordinary Rossovia Task, show at least one read,
one Pi-native edit, one focused check, and a truthful terminal diff. No paid run
is evidence of semantic acceptance by itself.

## Rejected immediate alternatives

- **Continue raw `ToolLoopAgent` and add one local string replacement.** This
  keeps reimplementing a coding harness and repeats already-solved session,
  tool, and compaction problems.
- **Adopt `@ai-sdk/harness-pi` built-ins unchanged.** Its edit contract is
  weaker than current Pi and directly reopens the observed truncation class.
- **Put the repository in Vercel Sandbox or an overlay and sync it back.** That
  creates a second workspace truth and a new commit/reconciliation owner.
- **Use just-bash `ReadWriteFs` as the policy boundary.** Root confinement is
  not the same as Work Cell's read/write/exclusion/command capabilities.
- **Adopt Reasonix as a subprocess now.** It is a valuable reference harness,
  but a new binary bridge would duplicate the first transition and move model
  routing away from the explicitly requested Vercel AI SDK surface.
- **Use Pi directly without `HarnessAgent`.** This is technically viable but
  would bypass the explicitly requested Vercel AI SDK harness contract and
  make later harness substitution harder.

## Follow-up adoption backlog

After the first candidate is verified, evaluate these independently:

- Reasonix-style cache-prefix diagnostics in Work Cell step evidence;
- deterministic tool-output snip/prune before summary compaction;
- explicit steer/follow-up mapping from conversation correction delivery;
- checkpoint/rewind as retained evidence rather than hidden file rollback; and
- an upstream issue or patch for `@ai-sdk/harness-pi` to preserve Pi's native
  exact edit semantics instead of first-match replacement.

None of these follow-ups authorizes a second store, autonomous retry, Task
acceptance, or Mission settlement.
