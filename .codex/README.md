# Codex hook bindings

The intervention adapter in this directory is a **local Codex projection** of the portable
intervention-reconciliation contract in
[Decision 024](../design/decisions/024-platform-neutral-intervention-reconciliation.md).
It is not part of the portable method and must be checked against current Codex
documentation when it changes.

## Effective guarantee

**Shadow / assist only.** `UserPromptSubmit` records a privacy-preserving
prompt observation and injects a reminder for the agent to compare a Principal
message with its active task. It does not decide that a correction occurred,
block writes, or accept work.

State is session-local under `$ROSSO_HOME/state/interventions/` (default
`~/.rosso/state/interventions/`). It stores the prompt hash and byte count,
never prompt text. Rossovia Workbench owns both the location and the generic
state commands and receipt format in
[`operations/workbench`](../operations/workbench/src/interventions.ts).
The Codex adapter supplies session identity but does not choose a separate
platform-owned state root. After observing a prompt, it injects a receipt
endpoint bound to that exact session-state file. It does not rediscover state
from the target repository path, so a session opened in this repository may
safely use the binding while switching among other repositories and returning
to earlier work.

Receipt persistence is not an authorization precondition. If the endpoint is
unavailable under the current runtime policy, the agent keeps the corrected
constraint active, reports the receipt as unresolved, and continues work that
is already authorized. It must not request broader filesystem access merely to
upgrade this assist-only record.

This repository deliberately ships no project-level Codex configuration that
grants access to a user home. When cross-project Workbench state is an accepted
personal capability, grant the actual Rossovia home in the user's
`~/.codex/config.toml`:

```toml
[sandbox_workspace_write]
writable_roots = ["~/.rosso"]
```

Alternatively, use Codex's `--add-dir "$ROSSO_HOME"` for one new session. These
grants do not retrofit a resumed session's frozen permission snapshot. A custom
`ROSSO_HOME` must receive its own grant; the adapter must not silently fall back
to a vendor directory.

Workbench `init` does not install hooks or grant harness permissions. It does
perform a no-residue create–rename–remove probe under the resolved home on every
run, including when the home is already complete. Success reports
`writeAccess: "verified"`; a readable existing home without that observation is
not a usable state surface for preferences, receipts, timelines, or later
updates.

## Enable and verify in a fresh Codex session

1. Run `./operations/workbench/src/cli.ts init` through the ordinary agent
   session and require `writeAccess: "verified"`. If it fails, reconcile the
   exact user-level grant above and start another fresh session; repeated init
   attempts cannot change a frozen sandbox.
2. Use `/hooks` to inspect and trust the project hook. Do not use a trust-bypass
   flag: hook review is part of the binding's safety boundary.
3. Send an ordinary task message. It should create an observation but no
   correction receipt.
4. Send a material correction. The agent must compare it with the active task;
   if it changes a target, hard boundary, concept relation, authority, or
   acceptance condition, it records a receipt before claiming a mutation
   implements the correction.
5. Inspect the resulting state:

   ```sh
   ./operations/workbench/src/cli.ts intervention status --session-id "$CODEX_THREAD_ID"
   ```

   Set `ROSSO_HOME` or pass Workbench's top-level `--home PATH` when using a
   non-default Rossovia home. Session identity, rather than the current target
   repository, keeps this lookup exact when several Codex sessions share the
   workbench or one session switches among target repositories.

The current lifecycle names, command-handler limitation, and project-hook
trust model come from the [Codex Hooks guide](https://learn.chatgpt.com/docs/hooks)
and [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference),
checked on 2026-07-22. The configuration reference also documents
`sandbox_workspace_write.writable_roots`; re-check these sources before changing
the user-level capability grant, adding a mutation gate, or adding stop
continuation.

## Artifact-consistency assist

`PostToolUse` receives Codex's canonical `apply_patch` input and records only
repository-relative paths for changed Skill artifacts, `README.md`,
`AGENTS.md`, or `CLAUDE.md`. A `Stop` hook consumes those paths for one final
consistency reminder. It does not parse the transcript: Codex documents that
format as unstable.

This reminder is project-local and advisory. Its per-session path set is
ephemeral under the operating system temporary directory, isolated by
repository and session identity, and removed after the stop continuation. It
contains no file content and is not a Workbench source, receipt, or acceptance
record. An invalid runtime payload degrades to a visible warning without
blocking an already-completed tool action.
