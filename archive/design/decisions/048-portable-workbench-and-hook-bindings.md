# Decision 048 — Portable Workbench and capability-honest hook bindings

**Status:** capability-honest multi-harness hook design remains accepted and
implemented; checked-in Node bundle and Node-only target-runtime choice
superseded by [Decision 054](054-bun-source-workbench-runtime.md)
**Date:** 2026-07-23
**Supersedes in part:** [Decision 047](047-bun-workbench-runtime.md)'s
target-machine Bun requirement and [Decision 024](024-platform-neutral-intervention-reconciliation.md)'s
single Codex binding

## Concrete pressure

Rossovia is used as a workbench checkout on machines that may have Node and
Docker but not Bun. Its project hooks also need to work in Codex, Claude Code,
and Cursor without copying one host's lifecycle contract into the others.
Keeping Bun in every hook command made ordinary use depend on a development
tool. Keeping separate hook programs had already produced duplicated behavior,
transcript parsing, and platform drift.

## Decision

Keep TypeScript and Bun for repository development, tests, and the preferred
build path. Make the target runtime a checked-in, self-contained Node bundle at
`apps/workbench/dist/rossovia.mjs`, reached through the stable
`apps/gateway/rossovia` launcher.

The Workbench source uses Node standard-library runtime APIs. `npm run build`
uses local Bun when present; `npm run build:docker` builds the same bundle in a
bounded Bun container when the host has Node and Docker but no Bun. Docker is a
build carrier, not an ordinary execution dependency. The generated bundle is
checked in so a clone can run immediately, and repository verification rebuilds
it before tests so source and projection drift is visible.

Own portable hook behavior in Workbench and keep vendor files as thin
projections:

| Host | Intervention assist | Artifact observation | Stop notification |
|---|---|---|---|
| Codex | `UserPromptSubmit` observation and context injection | canonical `apply_patch` input | one-shot non-blocking `systemMessage` |
| Claude Code | `UserPromptSubmit` observation and context injection | `Write`, `Edit`, and `NotebookEdit` inputs | one-shot non-blocking `systemMessage` |
| Cursor | no installed prompt adapter because current `beforeSubmitPrompt` cannot inject context | `afterFileEdit` path | bounded `followup_message` |

Capability absence lowers the guarantee. It does not authorize transcript
parsing, prompt rewriting, or a synthetic parity layer. Shared state records
only prompt evidence or relevant paths; semantic judgment remains with the
Agent and acceptance remains outside the hook.

## Boundary consequences

- `apps/workbench/src/hooks.ts` normalizes host payloads and owns common
  behavior; platform JSON files own event names and command wiring.
- No hook command invokes Bun, parses an unstable transcript, or discovers its
  executable by following the Agent's current target repository.
- The receipt endpoint injected into Codex and Claude names the running bundle
  and exact platform-qualified session-state file, so target switching or an
  identical vendor-local session identifier cannot silently rebind it.
- Cursor receives artifact consistency but not intervention injection until its
  documented lifecycle can carry additional prompt context.
- User-level provider credentials and model selection remain personal
  `agent-environment` projections, not repository hook configuration.

## Verification

- all prior Workbench behavior tests pass after replacing Bun process APIs;
- the checked-in bundle performs initialization under Node with Bun absent from
  `PATH`;
- Codex and Claude intervention probes resolve one Rossovia state file across
  target changes;
- Codex, Claude, and Cursor artifact payloads normalize to the same path-only
  evidence and each platform receives only a documented output shape;
- all three project configuration files parse and invoke the portable launcher;
- the Docker build exports a Node-runnable single-file bundle.

The host capability claims are bound to the
[Codex Hooks guide](https://learn.chatgpt.com/docs/hooks),
[Claude Code hooks reference](https://code.claude.com/docs/en/hooks), and
[Cursor hooks reference](https://cursor.com/docs/hooks), checked on 2026-07-23.
On 2026-08-14 the host guides were re-checked. Codex `Stop` supports both the
shared top-level `systemMessage` output field, surfaced as a warning in the UI
or event stream, and `decision: block` with a reason, which continues the agent
loop. Claude's `Stop` hook supports `decision: block` as well and additionally
supports an `additionalContext` continuation. Rossovia deliberately returns
only the one-shot non-blocking `systemMessage` notification and never uses a
block or continuation: a non-blocking `systemMessage` only prompts the user,
while `decision: block` and `additionalContext` both extend the agent loop.
Installing a binding is not a behavioral-benefit claim: mechanical trigger does
not equal behavior improvement, and the Codex/Claude notification cannot make
an Agent fix anything.

## Reconsideration

Reopen this decision if Node itself becomes unavailable on a supported target,
if checked-in bundle drift cannot be detected economically, or if a host adds a
materially stronger documented lifecycle capability. Do not expand the portable
contract merely because one vendor adds a field.
