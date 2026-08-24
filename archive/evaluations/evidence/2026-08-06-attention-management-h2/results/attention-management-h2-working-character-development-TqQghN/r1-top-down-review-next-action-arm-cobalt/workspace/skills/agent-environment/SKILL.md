---
name: agent-environment
description: >-
  Use this Skill, not a named task Skill, when that Skill or capability is the
  object of user-level setup, installation, migration, or configuration. An
  installed or runtime-discovered copy is target evidence, not a desired source.
  If the human has not supplied the selected capability's source, return
  `NEEDS_INPUT` before reading it, inventory, lookup, planning, or action; never
  inspect secret values. Use for "set up my agents on this machine", "migrate my
  AI coding setup", "新设备配置 Codex/Cursor/Claude Code", "update my global agent
  workflow", or reconstructing selected skills, harness guidance, plugins, MCP,
  hooks, permissions, runtimes, and authentication prerequisites. Setup does
  not imply marketplace discovery, CLI/provider installation, or full-toolbox
  adoption. Do not use for project-local agent workflow design, fleet policy,
  sessions/caches, or unrelated dotfiles.
---

# Agent Environment

## Principle expression

**Primary:** P12
**Supporting:** P14, P16, P15

## Scope

Own one recurring judgment: **what minimum user-level workflow source lets this
person reconstruct and evolve the intended coding-agent capabilities and
working agreements across tools and devices, and how can each projection be
reconciled and verified without copying secrets, opaque state, or accidental
machine history?**

This Skill owns inventory classification, portable workflow-source formation,
three-way reconciliation, migration receipts, and ordinary-entry verification.
It does not own project instructions, provider accounts, secret storage, tool
implementation, organization policy, or the acceptance of a personal working
agreement. Use an existing dotfiles or configuration manager as the carrier
when one is already trusted; do not replace it with a new framework.

Read [concepts](references/concepts.md) when `desired source`, `projection`,
`secret prerequisite`, `local state`, or `override` are being conflated. Read
[current tool surfaces](references/tool-surfaces.md) only for tools in scope,
and re-check their official documentation before writing because vendor
surfaces change.

## Principle source

Use a host Sequence and matching interpretations when the host declares them.
Otherwise use this Skill's read-only fallback in `references/sequence.md`.
Read only P12, P14, P16, and P15.

## Dispatch

Before dispatch or inspection, apply this source gate: when setup names a
selected capability but supplies no desired source or source locator, return a
plain final response with status `NEEDS_INPUT` and one scoped request for that
source. This is not an interactive-question tool call. Stop without listing or
reading skills, inventorying either device, consulting vendor material, or
forming a conditional installation plan. Treat an installed or runtime-listed
copy as target evidence, never as the missing desired source.

- With `audit`, read and follow `commands/audit.md`.
- With `setup`, read and follow `commands/setup.md`.
- With `reconcile`, read and follow `commands/reconcile.md`.
- With `migrate`, read and follow `commands/migrate.md`.
- With `verify`, read and follow `commands/verify.md`.
- With no argument, begin with a read-only audit. Do not infer authority to
  change user-level files from a request to inspect or recommend.

## Start

```text
Person and device(s) in scope:
Selected harness/tool and ordinary use path, if required:
Required capabilities and working agreements:
Requested setup surface and explicit exclusions:
Existing desired source or carrier, if any:
Prior source revision and receipt, if relevant:
Configuration that must remain machine-local:
Secret/authentication prerequisites, named but not read:
Target OS, shell, and trust constraints:
Human approval and rollback boundary:
Observation that would show successful reconstruction:
```

If the user has not authorized writes, stop after inventory and a proposed
reconciliation. Never print, copy, commit, or ask a model to summarize secret
values, authentication databases, session transcripts, caches, or machine
identifiers.

## Core method

1. **Recover intended work before files.** Name the recurring actions,
   capabilities, working agreements, and verification observations. Select only
   the setup surfaces needed to enable that work: a skill or capability,
   harness guidance/configuration, runtime tooling, authorization, or another
   bounded subset. These are composable surfaces, not mandatory levels. Do not
   infer a CLI install, provider route, or full environment from the word
   `setup`, and do not treat every file under a vendor home directory as desired
   state. Resolve the target harness from the request or active runtime only
   when a projection needs one. If the target is missing and would change the
   action, ask one scoped question; do not scan installed tools to guess it.
   Resolve a selected capability's desired source through the pre-dispatch
   source gate. Enter marketplace discovery only after an explicit request.
   For every projection, name its material ordinary-use benefit and added
   burden; preserve the unchanged environment when the gain is not material.
   Keep user scope thin: concise nearly-universal agreements, source locators,
   and native discovery of already-selected on-demand capabilities. A named
   capability is setup data, not an instruction to invoke it or install its
   target harness.
2. **Inventory through supported surfaces.** Inspect only what the selected
   capability can depend on. A skill setup may need source, installer, and
   discovery evidence; a harness setup may add instructions, plugins, MCP,
   hooks, or permissions; a runtime setup may add installation provenance,
   versions, and authentication *status*. Record paths and presence; redact
   values. For one skill, inspect only its source, the selected harness's
   discovery surface, and a same-name conflict there—not unrelated vendor
   directories. In a classify/propose-only task, the declared source locator
   and skill identity are sufficient unless compatibility or safety depends on
   its content; do not fetch or load the skill body merely to plan an
   installer-managed projection. Use official status or diagnostics commands
   when available. Treat the declared target device as the object; the active
   host running this Skill is not the target unless the human says so. When the
   target is another or hypothetical device and no target access is supplied,
   plan from declared facts and leave target observations unresolved.
3. **Classify every item.** Assign `desired source`, `tool projection`, `secret
   prerequisite`, `machine-local state`, `local override`, or `unknown`. Unknown
   and conflicting items block automatic copying; they do not become portable
   merely because they are readable.
4. **Select the smallest carrier.** Reuse an accepted dotfiles/configuration
   source when present. For one bounded capability, a source locator, explicit
   selection, and setup receipt may be sufficient. Prepare a small
   user-controlled profile from [the profile template](assets/environment-profile.md)
   only when recurring setup has multiple independently changing modules or
   needs later reconciliation. Store workflow intent, source locators, install
   provenance, non-secret modules, projection mappings, exclusions, and
   verification—not vendor caches or an export of `$HOME`.
5. **Plan per tool from current documentation.** Read only the relevant section
   of [tool surfaces](references/tool-surfaces.md), then verify the current
   official path and precedence. Prefer a supported import, installer, settings
   command, or structural merge over editing undocumented application stores.
   Choose an installation mechanism only after the desired source and selection
   are known. An installer's catalog or marketplace cannot supply missing setup
   intent.
   If current documentation, runtime help, or diagnostics are unavailable, name
   the lookup/manual action; never invent an exact command or configuration key.
   Treat discoverable vendor mechanics as `lookup-required`, not as missing
   human intent; ask the human only for a choice, authority boundary, or source
   that investigation cannot determine.
   Every exact command or key in a plan or receipt must carry the official page,
   inspected `--help`, or runtime diagnostic that admitted it in this activation.
   Words such as `example`, `equivalent`, or `likely` do not bypass this gate.
6. **Reconcile source evolution, not files alone.** For ongoing updates, compare
   the last applied source/projection, the target's current state, and the new
   approved source. Map changed workflow intent to affected tools before
   editing. A tool-local change is a target observation or candidate source
   change; it does not flow upstream without human adoption.
7. **Apply without taking ownership.** Back up or checkpoint each managed
   target; merge structured configuration by key; use clearly delimited blocks
   only for text projections; preserve unmanaged content byte-for-byte when the
   carrier promises that boundary. Do not replace a whole user configuration to
   make one setting match.
8. **Rehydrate secrets separately.** Retain only the credential's purpose,
   provider, required scope, preferred secure store, and status check. On the
   target device, use the tool's supported login or secret-manager path and let
   the human complete interactive authorization.
9. **Verify through ordinary use paths.** Check parse/discovery, then run one
   harmless behavior probe per selected capability. A copied file is not proof
   that the intended agent or runtime loaded it. Confirm an adjacent unselected
   surface was not changed and preserve one relevant unmanaged item as boundary
   evidence. When the capability owns mutable user-level state, verify an actual
   no-residue create, rename, and remove through the target runtime; an existing
   readable directory is not evidence of write capability. Also confirm that
   the selected projection improved its named action
   without adding an unnecessary always-on instruction, runtime, updater, or
   duplicate source. When marketplace discovery is a live competing trigger,
   repeat the raw setup request through the ordinary classifier with the actual
   installed skill set; do not name this Skill or disclose the expected route.
10. **Return a reconciliation receipt.** Report applied, preserved, deferred,
   unsupported, and failed items; source revision; target/tool versions;
   rollback locations; manual authorization still required; and observations
   that should reopen the profile. The receipt is evidence, not a new source.
   Classify every mechanical action as `verified` or `lookup-required`; omit the
   command/key entirely for `lookup-required` actions.

## Ownership and routing

| Need | Owner |
|---|---|
| Personal user-level agent workflow setup, evolution, and migration | this Skill |
| Agent behavior inside one repository | project `AGENTS.md`, `CLAUDE.md`, rules, or `improve-agent-workflow` |
| General shell/editor/package dotfiles | existing dotfiles or configuration-management method |
| Install or update agent skills | current skills installer or the tool's supported package path |
| Secret value, login, account, or provider authorization | human plus supported credential store/login flow |
| Organization-wide enforced policy | organization administrator and managed configuration |
| Tool-specific current configuration semantics | vendor documentation and runtime diagnostics |

## Boundaries

- Do not make one vendor's hidden directory the cross-tool source of truth.
- Do not migrate chats, sessions, memories, caches, telemetry, indexes, UI
  layout, or device identifiers by default. Promote a specific item only after
  the user names the future decision it must support and its privacy boundary.
- Do not translate every setting across tools. Preserve common intent where a
  faithful projection exists; otherwise retain an explicit tool-specific
  commitment or `unsupported` result.
- Do not make full runtime installation the implicit meaning of setup. A
  skill-only or harness-only setup is complete when its declared capability and
  boundary probes pass; unselected surfaces are out of scope, not failures.
- Do not add a projection merely for cross-tool symmetry. Prefer each harness's
  smallest native, on-demand surface; leave an already sufficient environment
  unchanged rather than manufacturing setup parity.
- Do not turn user scope into an always-on control plane. A user-level setup is
  thin by default; move project truth and specialized behavior to the narrower
  project or on-demand surface that owns it.
- Do not turn setup into third-party capability discovery. Marketplace search
  is eligible only when the human explicitly asks to discover or compare
  candidates; it never fills a missing source in an otherwise selected setup.
- Do not make a generated tool configuration bidirectionally authoritative.
  Adopt a tool-local improvement into the workflow source explicitly, then
  project it outward in a later reconciliation.
- Do not bake current vendor paths or keys into universal doctrine. Re-check
  the linked official source during execution and record the observed version.
- Do not claim setup complete while authentication, an ordinary-entry probe,
  or an unresolved conflict remains hidden.
- Do not require Codex, Cursor, Claude Code, a particular OS, a dotfiles
  manager, or this repository after the Skill is installed.

## Completion standard

An environment setup, update, or migration is ready only when its declared
scope, desired source or source locator, and human owner are explicit; every
in-scope item has a state classification; secrets and local state remain outside
the desired source; existing target content has a rollback path; each selected
capability passes an ordinary-use verification or is visibly deferred; every
applied projection has a named material benefit and bounded burden; and the
receipt states residual manual work and deliberate no-ops. When a portable
profile is actually used,
source and target drift must be distinguished, and the profile must remain
updatable without copying opaque vendor state or overwriting target differences.
