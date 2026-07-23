# Codex hook binding

This directory is a **local Codex projection** of the portable
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
upgrade this assist-only record. For ordinary `workspace-write` sessions, the
project [Codex configuration](config.toml) declares `~/.rosso` as one additional
writable root. This is a narrow capability grant for Workbench state, not a
general home-directory exception. A custom `ROSSO_HOME` outside that root must
be granted through the current Codex `writable_roots` setting or `--add-dir`
before the session starts; the adapter must not silently fall back to a vendor
directory.

## Enable and verify in a fresh Codex session

1. Start Codex in this repository and use `/hooks` to inspect and trust the
   project hook. Do not use a trust-bypass flag: hook review is part of the
   binding's safety boundary.
2. Send an ordinary task message. It should create an observation but no
   correction receipt.
3. Send a material correction. The agent must compare it with the active task;
   if it changes a target, hard boundary, concept relation, authority, or
   acceptance condition, it records a receipt before claiming a mutation
   implements the correction.
4. Inspect the resulting state:

   ```sh
   ./operations/workbench/src/cli.ts intervention status --cwd "$PWD"
   ```

   Set `ROSSO_HOME` or pass Workbench's top-level `--home PATH` when using a
   non-default Rossovia home.

The current lifecycle names, command-handler limitation, and project-hook
trust model come from the [Codex Hooks guide](https://learn.chatgpt.com/docs/hooks)
and [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference),
checked on 2026-07-22. The configuration reference also documents
`sandbox_workspace_write.writable_roots`; re-check these sources before changing
the capability grant, adding a mutation gate, or adding stop continuation.
