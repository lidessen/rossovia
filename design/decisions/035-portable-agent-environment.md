# Decision 035 — Portable User-Level Agent Environment

**Status:** accepted deterministic setup slice
**Date:** 2026-07-16; Workbench setup reconciliation added 2026-07-23
**Human mandate:** support user-level setup for Codex, Cursor, Claude Code, and
later migration to other devices by applying this project's methodology.

## Concrete need

A person can accumulate durable instructions, skills, plugins, MCP servers,
hooks, permissions, installation choices, and authentication prerequisites
across several coding-agent tools. A second device should reconstruct the
intended work without hand-recreating every choice. Copying a vendor home
directory is unsafe and unfaithful: it mixes desired configuration with
credentials, sessions, caches, generated memories, indexes, and machine IDs.
After setup, workflow changes are harder than skill updates: skills usually
retain package provenance and an installer, while an instruction, permission,
hook, MCP server, agent role, or UI rule can change independently in both the
portable source and several target projections.

The archived `setup-lidessen-skills` adapter only projected selected project
guidance into repository instruction files. It neither owns user-level state
nor provides a current migration method. Current tools also expose materially
different surfaces: [Codex supports an import flow](https://learn.chatgpt.com/docs/import),
[Cursor user rules are defined in settings](https://docs.cursor.com/context/rules),
and [Claude Code separates user settings, instructions, skills, and generated
memory](https://code.claude.com/docs/en/settings). One copied directory or fixed
path table therefore cannot truthfully represent the common capability.

## Principal contradiction

The stable object is the person's intended capability and working agreement,
but the available carriers are vendor-specific, versioned, partly opaque, and
mixed with non-portable private state. Without a portable source, migration is
manual and lossy; without an applied baseline, later updates cannot distinguish
new intent from target drift. If the project creates a universal configuration
runtime, it would duplicate mature dotfiles/configuration systems and
continuously encode vendor implementation details.

## Decision

Add an independently installable `agent-environment` Skill with:

- a read-only audit path;
- setup, three-way reconciliation, migration, and verification methods;
- a small optional Markdown profile template for environments without an
  accepted dotfiles/configuration source;
- a classification boundary among desired source, tool projection, secret
  prerequisite, machine-local state, local override, and unknown; and
- an on-demand official-document routing reference for Codex, Cursor, Claude
  Code, and shared skill installation.

The Skill forms one expression with P12 as Primary and P14, P16, and P15 as
Supporting P-IDs. P12 owns sufficient cross-device inheritance; P14 prevents
tool projections and receipts from becoming the source; P16 requires ordinary
setup and verification actions; P15 keeps the first slice instruction-only
apart from its output template.

## Form and authority

| Form | Owns | Does not own |
|---|---|---|
| `agent-environment` Skill | recurring inventory, classification, three-way reconciliation, migration, and verification judgment | user intent, vendor facts, execution authority, or acceptance |
| portable profile or existing dotfiles source | human-approved non-secret desired state and provenance | credentials, sessions, generated memories, or runtime proof |
| tool-local configuration | projection usable by one installed tool/version | cross-tool truth |
| device receipt | prior applied revision and evidence for later reconciliation | desired-state authority |
| supported vendor installer/import/login | mechanical application or authorization | portable intent or semantic equivalence |

No new daemon, database, dotfiles manager, or cross-vendor schema is admitted.
The Workbench supplies one bounded deterministic setup adapter after repeated
pulls exposed a concrete failure: an Agent could not determine which approved
user-level behavior had been applied, which source changes affected it, or
whether the target projection had drifted.

## Workbench setup reconciliation slice

`rossovia init --setup multi-agent-delegation` records an explicit,
tool-neutral selection in the Workbench home. The module owns only when
delegation is justified, which work is independent, and what synthesis and
verification remain with the main Agent. It does not prescribe worker names,
tool calls, nesting, concurrency syntax, or result transport. The current Codex
adapter owns one delimited user-instruction projection; another harness must
provide its own adapter without changing the module judgment.
`setup status` and `setup apply` compare:

- the Git revision recorded by the last successful application;
- the current checkout revision and applicable entries from the repository's
  general `CHANGELOG.md`, filtered by stable functional-module prefix; and
- the digest of the currently installed managed block.

Published changelog entries are append-only so a Git interval can return the
complete `Action`, change description, and verification guidance for each
selected module.
The Git revision is the source-update baseline; it is not a release version.
Workbench derives the source checkout from its own tracked executable; callers
cannot bind a projection produced by one checkout to an unrelated repository
revision.
Relevant setup source and changelog files must be clean before Workbench records
that revision, so an immutable commit actually reconstructs the applied intent.
The projection digest detects target drift independently. A missing historical
revision reports `baseline-unavailable`. A missing or changed managed block
reports drift or conflict and is never overwritten automatically. Unmanaged
target content remains byte-preserved, and an existing target file receives a
rollback copy before application.

The portable profile remains the desired-state form for broader multi-tool or
multi-device setup. This Workbench slice owns only repeated mechanical
application and evidence for explicitly selected repository-defined modules;
its receipt does not become the desired source.

## Safety and migration boundaries

- Secrets are named by purpose, provider, scope, secure rehydration path, and
  status check; values never enter the profile or model context.
- Chats, sessions, caches, generated memories, telemetry, indexes, device IDs,
  and UI state are excluded by default.
- Existing target state is inventoried independently and preserved unless a
  human-authorized reconciliation names its disposition and rollback.
- Current vendor paths and schemas are read from official documentation during
  execution. The bundled reference is a routing surface, not a frozen API.
- When current documentation or runtime help is unavailable, the Skill records
  a lookup/manual action instead of synthesizing an exact command or key.
- Every exact command or configuration key requires activation-local evidence
  from an official page, inspected help, or runtime diagnostic. A receipt
  labels unverified mechanics `lookup-required` and omits their command text.
- Native import or settings-sync features may create projections, but the Skill
  audits them and does not treat them as the portable source.
- A selected capability that updates user-owned state is verified by a harmless
  create–rename–remove operation through the target runtime. Existing readable
  state, configuration syntax, or a separately privileged hook process cannot
  substitute for that ordinary-use observation.

## First-slice verification

The expression is supported only if:

1. it can inventory this development machine without exposing credentials;
2. an isolated old-source/new-source/target fixture can produce a profile and
   three-way reconciliation that preserves a target-only override, excludes a fake session/cache and
   credential, and routes an unsupported setting visibly;
3. a boundary prompt about project-local workflow routes away from this Skill;
4. the Skill installs through the repository's disposable packaging probe; and
5. Sequence snapshot, Markdown, site content, and existing repository checks
   remain valid.

The deterministic Workbench slice additionally requires a temporary Git source
and target-home probe that filters unrelated changelog entries, discovers an
applicable module entry, advances an unchanged baseline, rejects local managed
block drift, and fails visibly when the applied Git baseline is unavailable.

Behavior attribution remains provisional until a fresh agent executes the
action and boundary scenarios without seeing this decision's intended answer.

## Reopening observations

Reopen the form if repeated reconciliations require the same error-prone
structural merge, if supported tool APIs make a deterministic adapter smaller
than agent-driven reconciliation, if a second non-coding agent domain needs the
same method, or if users consistently cannot distinguish the profile from a
general dotfiles source. Do not respond to one new vendor field by expanding
the common schema.
