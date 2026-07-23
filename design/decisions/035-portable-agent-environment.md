# Decision 035 — Portable User-Level Agent Environment

**Status:** accepted first slice
**Date:** 2026-07-16
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

No new daemon, database, dotfiles manager, cross-vendor schema, or migration
runtime is admitted. Deterministic scripts may be reconsidered only after a
repeated mechanical failure can name the invariant they must enforce.

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

Behavior attribution remains provisional until a fresh agent executes the
action and boundary scenarios without seeing this decision's intended answer.

## Reopening observations

Reopen the form if repeated reconciliations require the same error-prone
structural merge, if supported tool APIs make a deterministic adapter smaller
than agent-driven reconciliation, if a second non-coding agent domain needs the
same method, or if users consistently cannot distinguish the profile from a
general dotfiles source. Do not respond to one new vendor field by expanding
the common schema.
