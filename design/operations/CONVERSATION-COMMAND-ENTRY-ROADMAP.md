# Conversation Command Entry roadmap

**Status:** navigation and phase projection; not design, implementation,
execution, integration, or acceptance authority

**Current-state source:** the primary-workspace
[`conversation-command-entry` Mission](../../operations/missions/conversation-command-entry.json),
read through the scoped Mission status operation

## Purpose and reading order

This roadmap gives a future Agent one entry to the Conversation Command Entry
product and the Rossovia runtime migration without making it reconstruct the
source hierarchy from repository history. It answers four questions: which
source owns a decision, when that source must be read, what evidence exits each
migration stage, and which current obligations remain open.

Read only the sources needed for the current judgment:

1. Start with [Decision 055](../decisions/055-rossovia-runtime-module-ownership.md)
   for module ownership and invariants.
2. Read the [runtime migration plan](../organization/rossovia-runtime-ownership-migration.md)
   when shaping or reviewing an ownership transition.
3. Read the scoped product case, implementation plan, or verification record
   only when the task concerns that product behavior or its historical
   evidence.
4. Read the [Workbench instructions](../../operations/workbench/AGENTS.md) for
   an actual Workbench, Task, Mission, or execution operation, and the
   [operating protocol](OPERATING-PROTOCOL.md) when work enters a branch,
   review, PR, merge, or cleanup path.
5. At a continuity safe point, read the official Mission status for current
   obligations. Never infer current status from this roadmap, an old plan, a
   branch name, or a verification snapshot.

## Source map

Here, **owner** means the source or authority that may change the fact's
meaning or settle it. A link or projection may report a fact but does not gain
that ownership.

| Source | Purpose | When to read | Owner |
|---|---|---|---|
| [Root `AGENTS.md`](../../AGENTS.md) | Repository entry and routing to the smallest governing source. | On repository entry; return to it when scope changes. | Repository guidance. |
| [Decision 055](../decisions/055-rossovia-runtime-module-ownership.md) | Accepted target ownership for Workbench, Orchestration Runtime, Work Cell, Integrations, and Presentation; also the authority, failure, and cardinality boundaries among them. | Before adding, moving, reviewing, or removing a runtime mechanism. | Accepted architecture; only a Principal-authorized decision can reopen it. |
| [Runtime ownership migration](../organization/rossovia-runtime-ownership-migration.md) | Ordered ownership transfers, stage exits, compatibility limits, and removal proof. | Before shaping a migration slice or claiming a stage complete. | The migration plan under Decision 055; each slice still needs its own authorization, evidence, review, and integration. |
| [Workbench `AGENTS.md`](../../operations/workbench/AGENTS.md) | Natural-language-to-command mappings and authority boundaries for setup, preferences, Tasks, Mission continuity, supervised execution, and browser observation. | Load only the entry matching a requested Workbench operation. | The scoped Workbench operating instruction surface. |
| [Human-Initiated Operating Protocol](OPERATING-PROTOCOL.md) | Human-triggered formation, branch/worktree discipline, independent review, Principal decision handoff, integration, and continuity safe points. | When work must survive a session or enter shared review, publication, merge, or cleanup. | Repository operating protocol; the Principal retains acceptance and merge authority. |
| [Conversation Command Entry System Case](../organization/sessions/2026-08-13-conversation-command-entry-system-case.md) | The original product problem, canonical-source map, duplex conversation relation, coordinator boundary, policy/non-goals, and falsification questions. | When reasoning about product behavior or why the entry exists. Do not use it as current accepted runtime architecture; its own status remains candidate. | Its source-bound design record; product settlement remains with the Mission acceptance. |
| [Prepared implementation plan](../organization/sessions/2026-08-13-conversation-command-entry-implementation-plan.md) | Historical capability-wave decomposition, ownership packets, named dogfood, checks, and prohibited additions for the first implementation. | When reconstructing the original implementation sequence or a wave's intended boundary. Do not use it as current implementation or authorization evidence. | The prepared process artifact; later accepted decisions and current source supersede it where they differ. |
| [P7 whole verification](../organization/sessions/2026-08-13-conversation-command-entry-verification.md) | Frozen behavioral, provider, event, and browser evidence plus F1–F6 findings at its named product revision. | When tracing what P7 actually observed or why a correction exists. Re-run current evidence before a readiness claim. | Independent verification evidence only; it cannot revise design or accept the product. |
| [`conversation-command-entry` Mission](../../operations/missions/conversation-command-entry.json) | Durable current cross-session contradiction, acceptance, branch obligations, return conditions, dispositions, and focus. | At continuity safe points and before reporting current work. Use the official status/check surfaces rather than editing or inferring. | The Git-tracked Mission record; it is coordination truth, not architecture, a backlog, launch authority, or acceptance. |
| This roadmap | A compact route through the sources, stage exits, current TODO families, and model policy. | On first orientation or when a later Agent cannot tell which document to trust. | Documentation projection. Source owners above retain every underlying fact. |

## Migration stage exits

These exits summarize the migration plan; the linked plan owns their full
meaning. A stage is not complete because files moved, a branch merged, or the
Mission focus advanced.

| Stage | Exit evidence |
|---|---|
| 0 — target relations | Decision 055 has accepted the names, ownership boundaries, cardinalities, and precision boundary. |
| 1 — Workbench purity | Project/Task operations work without execution or UI composition; stale Task meaning fails before mutation; acceptance remains Principal-owned; joined projections identify their external sources. |
| 2 — Run and writer ownership | Ordinary Task, conversation, and one strategy path use one Run contract; interruption, duplicate action, pre-Cell failure, no-final, stale Task, and writer-release failure remain truthful; a second writer for the exact Worktree is refused. |
| 3 — standalone Work Cell | Direct experiments and Orchestration use the same bounded Cell semantics; caller capabilities and driver substitution do not create upward dependencies; usage and cost standing stay attributable or explicitly unavailable. |
| 4 — Integration isolation | A provider and a host adapter can be substituted without changing core mechanism tests; adapter tests retain concrete quirks; one current-policy integration probe succeeds on the real task path. |
| 5 — replaceable Presentation | The create-to-accept story works through the selected Principal interface; reconnect rebuilds state without replaying effects; missing liveness stays unknown; the UI cannot manufacture or accept domain facts. |
| 6 — retirement by proof | Every retained legacy mechanism has a named consumer and unique property; every removed mechanism has consumer and failure-path proof; the main design describes the accepted owners as the current structure. |

## Current roadmap and later TODO

The safe integration baseline observed on 2026-08-18 is
`git:64b6186dad6916c6e4d954d0ffd0e2925a0485ad`. It composes the reviewed
foreground-stop and S2 skeleton work plus the explicitly labeled child-admission
WIP. The current documentation is being added on top of that baseline; it does
not turn any open Task, WIP slice, review, or Mission branch into accepted work.

P5 direct migration is blocked and is not part of this integration line. Its
Workbench Task is `98024d97-296d-4bcc-95c0-e32869cbafd2`; the recoverable local
checkpoint `bfe129f4014f5fcd44b4cb33d33abd805bbea72e` and later uncommitted
workspace bytes are incomplete WIP and must not be merged. The current P5
direction is direct removal of the old contribution peer lifecycle after its
real consumers are migrated to the canonical explicit Run owner. Retaining the
old lifecycle as a compatibility authority is not a completed migration. The
recorded DeepSeek attempt stopped on provider balance, and the Kimi attempt
stopped at its duration boundary without verification; neither is semantic or
integration evidence. Resume from the Task ledger and exact Git/worktree state,
not from model prose or this projection.

The immediate integration sequence is therefore: verify this safe baseline,
obtain fresh exact-head independent review, and merge only that reviewed
baseline. The later product sequence remains P5 direct migration, recovery,
Presentation, concentrated whole-product verification, fresh review, and a
separate authorized merge. Before acting, run the official Mission status and
check surfaces from the current authoritative workspace.

The remaining work falls into five bounded outcomes:

1. **Finish the ordinary single-Run control path.** Preserve the canonical Run
   and immutable Cell boundary while adding only a caller-explicit optional
   step cap; omission still means no step limit, and the emergency duration
   ceiling is not a budget. Complete the canonical foreground stop relation,
   then prove one representative daily single-Run path including stop,
   quiescence, writer release, reconnect, result truth, and attributable
   verification.
2. **Complete the caller-granted Cell tool capability.** The open S1 obligation
   adds only a provider-neutral optional tool boundary and its adapter
   translation. It exits through its exact Mission return condition and fresh
   independent review; child agents, orchestration policy, Task meaning, and
   acceptance remain outside it.
3. **Close the remaining P7 product findings.** F4/F5 must make terminal
   controls truthful and hand an exact ordinary-attempt result into the
   existing result-claim path without automatic submission or acceptance. F6
   must preserve concurrent successful project registrations as one
   fail-closed Workbench state transition without inventing a new authority.
4. **Complete P5 without a compatibility peer.** Enumerate every live consumer,
   move the contribution policy path onto one canonical explicit Run, remove
   the old peer lifecycle, and prove ordinary mapping, reconnect without replay,
   and absence of a legacy caller. A compatibility projection, tombstone-only
   file, timed-out workspace, or green unrelated baseline cannot close P5.
5. **Re-run the whole product claim after the owners return.** Reconstruct the
   current exact head, repeat representative deterministic/provider/browser
   evidence, and obtain a fresh independent semantic review. Only then is a
   Principal decision on Task/product acceptance or Mission settlement
   meaningful. Integration or green checks alone do not settle any of them.

After each bounded return, record its disposition in the Mission and keep exact
verification in the natural evidence source. Update this roadmap only when the
source map, stage relation, or material TODO family changes; do not mirror
attempt state, branch activity, or check output here.

## Model-selection principles

- Select from the semantic task shape and hard capability needs first. The
  host catalog may filter structural capability and availability; it must not
  rank a worker by role title or descriptive prose. The coordinator decides
  whether a contribution is worth its attention and coordination cost.
- Provider, model, reasoning effort, route, and fallback order are
  Orchestration policy. Provider request formats and returned metadata belong
  to Integrations. Work Cell receives one resolved execution binding and does
  not select a provider or total budget.
- The explicit current instruction, project constraint, available runtime
  evidence, and applicable human-confirmed preference outrank a default. A
  preference is defeasible and cannot grant credentials, disclosure, budget,
  or authority.
- Keep requested and observed identity separate. Retain the requested provider,
  model, thinking, and effort; report only adapter/provider-returned observation
  as observed. A required-profile mismatch or unavailable capability is visible,
  never a silent downgrade.
- Select a current worker through `worker list`, the host-owned
  [worker policy](../../operations/autonomy/src/worker-policy.ts), and the
  matching [Workbench instructions](../../operations/workbench/AGENTS.md#rossovia-local-task-entry).
  OpenCode Go is an AI SDK provider behind a current worker profile, not a
  default worker, harness, or fallback. Do not invent a combined provider/model
  identity that the catalog does not expose.
- The current
  [Mission acceptance](../../operations/missions/conversation-command-entry.json)
  requires DeepSeek Pro with thinking and `reasoning=max` for the conversation
  coordinator. That scoped requirement is not an ordinary implementation
  default. The Principal's desired future division of labor among ordinary
  implementation, architecture reasoning, and review remains a candidate until
  an owning preference or Orchestration policy records it; this roadmap does
  not set that ordering. Provider failure or timeout updates availability
  evidence but does not authorize silent fallback or a progress claim.
- Price, token, step, and duration choices are policy envelopes. Estimate
  before material spend, preserve normalized attributable usage/cost when
  available, and retain `unknown` rather than inventing zero. Ordinary
  execution has no implicit step limit; a caller may choose an explicit cap.
- Model output is a result claim, not correctness or acceptance. Mechanical
  checks establish declared structure and evidence; an independent reviewer
  judges semantic fitness; the Principal alone accepts the Task or product.
