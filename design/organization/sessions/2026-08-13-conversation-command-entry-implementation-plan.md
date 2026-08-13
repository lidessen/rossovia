# Conversation Command Entry — Prepared Implementation Plan

**Status:** prepared implementation plan and process artifact. This file turns
the exact [System Case](./2026-08-13-conversation-command-entry-system-case.md)
at Git revision `6e8c3fa4edccc2ccf36e28deb23833d68cdbd923` and the committed
[Mission source](../../../operations/missions/conversation-command-entry.json)
into executable contributions. It is not design acceptance, product
acceptance, implementation evidence, or authority to mutate a Task, Mission,
provider, repository, or integration surface.

**Accepted code baseline:**
`23246d48b8e01792e34d8b0f4bed22f030b66bf1`, an ancestor of the planning
revision above.

**Stage handoff:** each contribution produces the artifact natural to its work:
source evidence, this plan and its worker packets, code/config/tests, or
behavioral/visual verification evidence. The producing commit identifies the
exact revision. The host may prove only that the declared path is readable,
exists or changed in that stage, and is bound to the stated revision/digest.
The next worker reads the artifact and its sources directly and may return a
correction. There is no stage manifest, promotion schema, content gate, or
generic review pack. Semantic verification and final Principal acceptance stay
with their named owners.

## Whole, Task Shape, and principal instability

The whole is one local, text-first browser conversation that can publish and
revise an ordinary Task in either of at least two registered projects, show
owner-backed ongoing work or truthful liveness uncertainty, accept another
message while events are arriving, reconnect without replaying an effect,
intervene at the correct response/tool/persistent-work layer, and return
evidence-linked output without making conversation or provider state a second
Task authority. DeepSeek `deepseek-v4-pro`, thinking enabled,
`reasoning=max`, is current coordinator policy; no substitute is implicit.

The reference profile is the exact repository/runtime above plus the proposed
DeepSeek coordinator carrier. Its evidence status is `discovery-needed`: there
is no accepted representative Pro/max coordinator run. No model operation in
this plan is called a reliable primitive.

| Requested operation | Disposition | Consequence |
|---|---|---|
| Schema validation, revision comparison, journal sequencing, source lookup | deterministic host mechanism, outside the model primitive claim | Unit tests can establish the specified mechanical behavior; they do not establish semantic intent or product success. |
| Inquiry synthesis from bounded current projections | `guarded` | Allow a settled answer with no action; retain sources and uncertainty and inspect it in live behavior. |
| Semantic choice among create, correct, continue, or control | `guarded`, evidence `discovery-needed` | The coordinator may emit one typed operation or abstain/ask. Code validates structure and current source facts, never intent by regex, keywords, or fixed phrases. |
| Canonical Task/Mission mutation | `guarded` | Re-read exact revisions and authority immediately before mutation; journal the returned canonical receipt, failure, or uncertainty. |
| DeepSeek Pro/max coordinator execution | `guarded`, evidence `discovery-needed` | One representative provider observation is required. Unavailable or mismatched provider/model blocks the turn visibly; requested max is never presented as observed max. |
| Temporary worker formation and synthesis | `transform`, evidence `discovery-needed` for this daily-use form | Use the existing catalog and bounded delegate settlements only when one contribution earns its cost; one coordinator reconstructs the result. |
| Current liveness, interruption, and recovery | `guarded` | Trust only an exact live Mission runner or the current coordinator process's exact execution handle. A retained `started` attempt alone remains unknown. |
| Browser daily-use outcome | `transform` | Establish non-UI behavior first, then project it through the same runtime and falsify it with one two-project walkthrough. |

The principal instability is the crash/reconnect interval between a durable
Principal message, model judgment, a canonical mutation, and its conversational
settlement. If that relation is not closed, later liveness, contributors, and UI
can all show or repeat the wrong work. Wave 1 therefore establishes monotonic
receipt and duplex delivery; Wave 2 closes typed action settlement; only then do
persistent work, temporary contributors, and UI become safe to add.

## Current-source map

| Current symbol/source | Reuse | Minimal extension |
|---|---|---|
| [`createWorkbenchRequestHandler` and `Bun.serve`](../../../operations/workbench/src/ui/server.ts) | Loopback origin, bounded requests, static assets, snapshot and action routes | Give the main server a native Bun WebSocket upgrade/data handler and one injected conversation runtime; no transport framework. |
| [`saveJson`](../../../operations/workbench/src/home.ts) | Atomic rename for current JSON snapshots | Do not use it for the journal. Reuse the fsynced JSONL tail-repair pattern below. |
| [`FileMissionTimeline`](../../../operations/autonomy/src/delegate-timeline.ts) and [`FileEffectJournal`](../../../operations/autonomy/src/effect-journal.ts) | Process-serialized append, schema validation, newline framing, `sync()`, incomplete-tail truncation, monotonic sequence | Implement the smaller interaction event vocabulary in Workbench; do not import Mission/effect meanings into it. |
| [`resolveProject`](../../../operations/workbench/src/resolve.ts), [`observeWorkspace`](../../../operations/workbench/src/workspace.ts), and [`buildWorkbenchSnapshot`](../../../operations/workbench/src/ui/projection.ts) | Registered/discovered distinction, current primary identity, current Worktree inventory/head/status | Compose one bounded coordinator projection and re-resolve immediately before a project-bound action. |
| [`createLocalTaskControlPlane`](../../../operations/workbench/src/local-task-control-plane.ts) and Task mutations in [`tasks.ts`](../../../operations/workbench/src/tasks.ts) | Typed create/correct/revision checks, same-Task corrections, result/acceptance authority | Add a conversation host adapter that supplies causal source refs and exact current revisions; do not add conversation lifecycle to `tasks.json`. |
| [`runPrincipalTask`](../../../operations/workbench/src/task-run.ts) and [`showPrincipalTaskAttempts`](../../../operations/workbench/src/task-attempts.ts) | Exact Task/Worktree checks, immutable attempt input/start/settlement, requested-versus-observed evidence, same-session constraints | Factor preparation/settlement so a coordinator-owned asynchronous catalog attempt can use the same evidence family and exact lease rather than a parallel task-run database. |
| [`executeWorkbenchAction`](../../../operations/workbench/src/ui/actions.ts), [`AutonomyCliClient`](../../../operations/workbench/src/ui/autonomy-client.ts), and [`MissionRunnerStatus`](../../../operations/autonomy/src/mission-runner.ts) | Exact live runner identity/state, contribution/control/recovery, causal Mission input receipt | Use for a Task whose current exact execution link resolves to that Mission carrier. Do not infer a link from project/Mission names. |
| [`createDeepSeekModel`](../../../packages/work-cell/src/providers/deepseek.ts) | Explicit model, thinking policy, reasoning effort, response fingerprint middleware | Add a conversation coordinator in Autonomy using AI SDK already present there; retain requested policy and separately observed step/provider metadata. No fallback route. |
| [`DelegateLoopSession`](../../../operations/autonomy/src/delegate-loop.ts), [`WorkerCatalog`](../../../packages/work-cell/src/worker-catalog.ts), and [`createCurrentWorkerCatalog`](../../../operations/autonomy/src/worker-policy.ts) | Catalog list/spawn, hard capability filtering, durable batch settlement, cancellation, bounded result reads, host policy | Install the current catalog in the conversation host only after the single-coordinator slice; coordinator chooses semantic suitability, host only filters/validates. |
| [`app.js`](../../../operations/workbench/ui/app.js), [`index.html`](../../../operations/workbench/ui/index.html), and [`styles.css`](../../../operations/workbench/ui/styles.css) | Current Task/project/activity/result projections and responsive shell | Add composer/feed/reconnect/control presentation last; remove five-second polling as the only live path but retain snapshot refresh for canonical projections. |

## Chosen minimal representations

### Text duplex transport

Use Bun's native WebSocket support on the existing loopback `Bun.serve`; add no
dependency and no second HTTP server. The path is
`/api/conversations/<conversationId>/socket?after=<cursor>`. A client-generated
UUID conversation ID and UUID `clientMessageId` make reconnect independent of a
particular socket. `after` means the last durable journal sequence the client
has applied. On upgrade, the server sends every later settled event in order,
then subscribes the connection to new durable events and provisional events.
Inbound frames remain accepted while provider text or work events are outbound,
which supplies actual duplex behavior rather than long-poll turn-taking.

The first strict frame vocabulary is:

- client: `message.submit`, `response.interrupt`, `tool.interrupt`, and
  `work.control`; and
- server: durable `journal.event`, provisional `response.delta` /
  `activity.delta`, `projection.changed`, and typed `protocol.error`.

Only `journal.event` advances the reconnect cursor. Provisional deltas can be
lost on disconnect; the journal later records a settled, interrupted, failed,
or uncertain response. Response abort only aborts the coordinator generation.
Tool abort calls the named adapter and reports observed cancellation or
unknown. Persistent-work control requires an exact carrier target. The future
voice adapter will translate audio into the same `message.submit` and render
the same output events; WebRTC, VAD, audio state, and playback truncation never
enter this mechanism.

### Interaction journal

Use one file per conversation:
`$ROSSO_HOME/state/conversation-events/<conversationId>.jsonl`. A
`FileConversationJournal` owns one in-process writer queue per ID, validates
every event, appends one newline-delimited record, calls `sync()`, and uses the
existing timeline/effect rule on open: ignore an incomplete tail for reads and
truncate it before the next append. Sequence begins at zero and is the cursor.
The current Workbench server remains the sole writer; concurrent independent
Workbench writers are unsupported and must fail rather than pretend this
process-local queue is a file lock.

The minimal durable event families are `message.received`,
`coordinator.turn-started`, `action.requested`, `action.settled`,
`action.failed`, `action.uncertain`, and `coordinator.turn-settled|failed|interrupted`.
They retain stable message/turn/action IDs, payload digests, causal IDs,
requested coordinator policy, observed provider evidence when available, and
canonical source/evidence refs. They do not retain Task/Mission lifecycle,
current liveness, effect verdict, or acceptance; projections re-read those
owners.

Duplicate `clientMessageId` with the same digest returns the retained receipt
and never starts another turn; a different digest is a visible protocol
conflict. An `action.requested` is fsynced before calling its owner. Task action
source refs and Mission `inputId`s derive from the stable action ID. After a
crash, reconstruction first searches the canonical owner for that causal ID:
an exact match is settled into the journal, a provable absence under the same
source revision may be retried once, and drift or an uninspectable effect is
`action.uncertain`. The client never resends an action because it missed an ACK.
No retention/compaction threshold is introduced in this outcome; JSONL remains
readable and removable per conversation. Reopen storage only if observed size,
multiple writers, or atomicity tests defeat this boundary.

### Coordinator carrier, prompt, and evidence

Add `ConversationCoordinatorSession` in Autonomy, using a fresh AI SDK
`ToolLoopAgent` turn inside one Workbench-owned conversation session. Construct
the model only with `createDeepSeekModel({ model: "deepseek-v4-pro",
inferencePolicy: { thinking: "enabled", reasoningEffort: "max" } })` and the
declared `DEEPSEEK_API_KEY`; configure no reserve route. One `AbortController`
owns response cancellation for each turn. Provider unavailability, malformed
tool calls, or observed provider/model mismatch settles the turn as a visible
failure. It does not switch model, effort, or provider.

`coordinator.turn-started` retains the requested provider/model/thinking/effort,
prompt revision/digest, disclosed source refs/digests, and current source
revision selectors. Step callbacks retain the provider and model actually
reported; sanitized DeepSeek metadata/fingerprint and usage are stored with the
settlement. `reasoning=max` remains **requested** unless the provider returns a
documented observed effort field. Missing observed effort is `unavailable`, not
an inferred match. A provider observation fixture proves the evidence split;
one real turn is still required before the carrier is called demonstrated.

The prompt is a composable input artifact, not a personality constitution. Its
deterministic builder loads, in this order and only when relevant:

1. a versioned, short relation kernel: Principal direction; authoritative
   Project/Task/Mission/effect/carrier owners; one synthesis owner; provisional,
   verification, and acceptance boundaries;
2. a current compact projection of the active conversation Task, exact source
   revisions, candidate registered project/current primary/Worktrees, exact
   carrier activity, and unresolved correction;
3. the current Principal message with message/turn/correction lineage;
4. current policy: DeepSeek Pro/max, source-disclosure envelope, tools,
   workspace, budget supplied by the caller, and withheld effects;
5. project instruction/orientation files and applicable Skills only after a
   verified project route or current judgment requires them, by reference and
   bounded content; and
6. child result summaries first, with full child evidence loaded only through
   the existing keyed result-read operation when synthesis needs it.

Composition tests freeze ordering, omission, source digests, correction refresh,
and disclosure boundaries. A live observation must show that an inquiry can
settle with no action, that a materially ambiguous request asks rather than
guesses, and that a correction changes the same Task.

### Typed semantic operations and carrier liveness

The coordinator has read-only projection tools and at most one consequential
operation per Principal message:
`task_create`, `task_correct`, `task_continue`, or `work_control`. A status
inquiry needs none. The schemas carry exact expected Task/source revisions,
project ID/current primary head where applicable, exact Worktree path/head
before execution, and exact carrier target for control. Immediately before an
effect, `ConversationOperationHost` re-reads and compares those facts, then
calls the existing Task or Mission operation and returns its natural receipt.
The host never classifies prose. On ambiguity the coordinator abstains.

For persistent work, use two adapters behind one narrow current-activity query:

- a Task with an exact current execution link uses the existing live Mission
  runner and its status/control/recovery receipt; and
- an ordinary Task uses a coordinator-owned catalog execution attempt. Factor
  the existing `task-run` preparation, exact Worktree lease, input, and
  settlement into reusable functions. The attempt additionally retains
  conversation/turn/action IDs, selected worker/execution profile, and the
  delegate timeline/batch/contribution references. The live server registry
  holds the exact `DelegateBatchHandle`; its handle supplies current liveness
  and cancellation. The Work Cell/timeline supplies terminal evidence. No
  coordinator or journal status line becomes Task state.

When a catalog attempt settles, the host re-reads the exact Task revision and
validates the batch/Cell evidence before submitting the worker's result through
the existing Task result operation. A plain Cell result is
`agent-references-unverified`; only the existing exact Autonomy effect selector
may produce `runtime-verified-effect`. A correction or Task revision drift makes
the old result stale evidence and prevents submission. Neither path accepts the
Task.

Correction first mutates the same Task. If its ordinary execution handle is
live, the coordinator may explicitly cancel that exact attempt, await its
settlement, then start a replacement contribution from the latest Task revision
and correction list. Recovery/continuation is admitted only when the retained
Work Cell observation and current Worktree satisfy the existing same-session
and diff guards. If cancellation/session evidence is absent, the UI says
`interruption requested; outcome unknown` and does not launch over it. After a
server crash, a retained `started` attempt with no matching current handle is
unknown, never live; exact Mission runner reachability remains separately
queryable. This closes ordinary Task identity through existing attempt evidence,
not a Mission-per-chat or second Task table.

## Critical path: five capability waves

The waves are not a universal pipeline. Each exists because the next depends on
its observable output. Within a wave, packets sharing a contract are serial;
parallel work is permitted only in Wave 5 after the implementation commit is
frozen.

### Wave 1 — durable non-UI duplex receipt and reconstruction

**Whole contribution and visible result.** A local protocol client can submit a
message while server events are flowing, receive a durable cursor, disconnect,
reconnect from that cursor, and observe no duplicate message or mutation. It
does not call a model yet.

**Owned paths, one writer per surface.** Packet 1 owns
`operations/workbench/src/conversation/contracts.ts`,
`operations/workbench/src/conversation/journal.ts`, and
`operations/workbench/test/conversation-journal.test.ts`. Packet 2 then owns
`operations/workbench/src/conversation/transport.ts`,
`operations/workbench/src/ui/server.ts`,
`operations/workbench/test/conversation-transport.test.ts`, and the dependency
change only if Bun typing/runtime proves it necessary (none is expected).

**Inputs and output.** Input is the exact System Case plus the existing JSONL
patterns. Output is two serial code/test commits: Packet 1 freezes the journal;
Packet 2 adds the WebSocket route and fake echo turn. Those commits—not a stage
wrapper—are the implementation artifacts consumed by Wave 2.

**Decisions and deferred questions.** Freeze the path/frame/cursor behavior and
the receipt/settlement causal fields. Defer provider calls, canonical actions,
retention/compaction, cross-process writers, UI, and voice.

**Checks and observation.** Deterministic tests cover schema rejection,
monotonic cursors, fsync append seam, truncated-tail recovery, same-ID/same-digest
idempotency, same-ID/different-digest conflict, two simultaneous sockets,
inbound-during-outbound, reconnect replay, and exact loopback origin. A small
protocol client observes a submit, provisional echo, settlement, disconnect,
and ordered replay.

**Disconfirming/stop boundary.** Stop this representation if native Bun
WebSocket cannot accept inbound data while output streams, if one append can
produce two accepted cursors, or if crash-tail repair loses a previously fsynced
event. Do not add a framework before that evidence.

**Handoff.** Exact code/test commit to Packet 3, which reads the protocol and
journal source directly.

### Wave 2 — real coordinator, inquiry, and typed canonical action

**Whole contribution and visible result.** Through the non-UI socket, a
DeepSeek Pro/max turn can settle an inquiry with no mutation or request exactly
one typed create/correct/continue/control operation. Named project action fails
visibly unless the route is registered/current, and execution refuses a guessed
Worktree. Requested and observed provider facts are separate.

**Owned paths.** Packet 3 owns
`operations/autonomy/src/conversation-coordinator.ts`,
`operations/autonomy/src/conversation-prompt.ts`,
`operations/autonomy/src/index.ts`, and
`operations/autonomy/test/conversation-coordinator.test.ts`. Packet 4 then owns
`operations/workbench/src/conversation/runtime.ts`,
`operations/workbench/src/conversation/context.ts`,
`operations/workbench/src/conversation/operations.ts`,
`operations/workbench/src/ui/server.ts`,
`operations/workbench/src/task-run.ts`,
`operations/workbench/src/task-attempts.ts`, and their focused new/existing
tests. Packet 4 alone changes the shared Task-attempt mechanism.

**Inputs and output.** Input is Wave 1's exact Packet 2 commit, current
Task/project/Mission source APIs, and the DeepSeek adapter. Output is two serial
code/test commits: Packet 3 freezes coordinator/prompt behavior and Packet 4
binds canonical operations. When credentials are present, the Packet 3 return
also reports the natural live-probe observation; Packet 7 later owns its durable
verification copy. Wave 3 consumes the coordinator tool port and attempt
preparation functions at Packet 4's commit.

**Decisions and deferred questions.** The coordinator owns semantic judgment;
the host owns validation/effect. Freeze prompt composition, strict model policy,
operation schemas, causal source refs, exact project/current-primary/Worktree
checks, and one-action-per-message. Defer worker catalog tools, long-running
ordinary execution, UI, and claims about provider reliability.

**Checks and observation.** Fake-model tests cover no-action inquiry, create,
same-Task correct, continue vs resume distinction, control-layer distinction,
ambiguous abstention, stale revision, discovered project, changed primary head,
unobserved Worktree, canonical mutation success/failure, crash after effect but
before journal settlement, response abort, provider/model mismatch, no fallback,
prompt ordering, source digest, and disclosure envelope. One authorized live
DeepSeek observation asks a bounded status question and records requested
`deepseek/deepseek-v4-pro`, thinking/max, actual provider/model, metadata/
fingerprint, usage, and observed-effort availability.

**Disconfirming/stop boundary.** Stop provider rollout—not deterministic work—if
the model name cannot be requested, the runtime reports a different
provider/model, tool calls cannot be correlated, or max is rejected. Record the
failure; do not downgrade. Stop the action path if a project-bound mutation can
bypass registered/current resolution or an effect cannot be reconciled by its
causal source ID.

**Handoff.** Exact non-UI coordinator commit and provider observation (success
or visible failure) to Packet 5. A live failure leaves the operation guarded;
it does not invalidate deterministic protocol code.

### Wave 3 — owner-backed work, intervention, and temporary contributors

**Whole contribution and visible result.** An ordinary Task can begin a bounded
catalog-backed execution with attributable activity; a correction remains on
that Task and can interrupt/restart the exact ordinary carrier. A linked exact
Mission task continues to use Mission control/recovery. The coordinator can list
and form temporary evidence/execution/review contributions only when useful,
then remains the single synthesis owner.

**Owned paths.** Packet 5 owns
`operations/workbench/src/conversation/execution-carrier.ts`,
`operations/workbench/src/conversation/runtime.ts`,
`operations/workbench/src/task-run.ts`,
`operations/workbench/src/task-attempts.ts`,
`operations/workbench/src/ui/work-items.ts`,
`operations/autonomy/src/conversation-coordinator.ts`, and focused tests in
`operations/workbench/test/conversation-execution-carrier.test.ts`,
`operations/workbench/test/task-run.test.ts`,
`operations/workbench/test/ui-work-items.test.ts`, and
`operations/autonomy/test/conversation-coordinator.test.ts`. This packet is
serial after Packet 4 and is the sole writer to these shared contracts.

**Inputs and output.** Input is Wave 2's exact commit, `DelegateLoopSession`,
`WorkerCatalog`, current worker policy, Task attempt evidence, and Mission runner
actions. Output is a code/test commit that installs the catalog, persists
catalog-backed attempt references, projects exact liveness, and separates
response/tool/persistent controls.

**Decisions and deferred questions.** The catalog only returns runnable cards
matching hard labels; the coordinator judges descriptions and coordination
value. One Task/Worktree has one effectful execution owner. Evidence and review
workers are read-only unless their packet explicitly owns an isolated effect.
The caller-facing spawn tool accepts the contribution intent plus only
non-derivable constraints (for example an exact worker choice or image need).
The host's `prepareContribution` derives source refs, obligation refs,
acceptance, Task Shape admission, workspace, execution profile, and withheld
authority from the current Task and runtime sources; the coordinator does not
restate the internal `DelegateCall` envelope.
No title/role survives settlement. Defer catalog expansion, worker ranking,
automatic retries, standing teams, and recovery when an interrupted adapter
lacks observed session/diff evidence.

**Checks and observation.** Deterministic tests cover list-before-spawn,
unavailable/missing-capability rejection, exact worker/profile retention,
single synthesis owner, zero-worker trivial inquiry, bounded parallel read-only
contributors, one effectful Worktree writer, cancellation, cancelled replacement
using the latest Task revision, server-restart liveness unknown, exact live
Mission control, false `started` liveness rejection, child result by keyed read,
stale-result rejection after correction, exact unverified/result-effect
submission, and no self-review/majority settlement. A fake slow worker permits
a second message to correct and interrupt while events stream. If a real worker
behavior is not already established mechanically, the later dogfood supplies
one observation rather than repeated spend.

**Disconfirming/stop boundary.** Stop ordinary execution if the live handle
cannot be correlated to exact Task/attempt/Worktree identity, cancellation can
leave an unclassified writer, or restart renders `started` as live. Stop
formation if the catalog host—not the coordinator—must infer semantic role, or
if synthesis must reread all child raw traces.

**Handoff.** Frozen non-UI runtime commit to Packet 6. The UI worker must consume
the same events and projections; it cannot repair runtime semantics in browser
state.

### Wave 4 — browser conversation projection, last

**Whole contribution and visible result.** The existing Workbench browser gains
a text composer and event feed with reconnect, response/tool/work interruption,
project/Task/activity/result evidence, requested-vs-observed coordinator facts,
and explicit Principal acceptance separation. It remains usable at desktop and
mobile sizes.

**Owned paths.** Packet 6 owns only
`operations/workbench/ui/index.html`,
`operations/workbench/ui/app.js`,
`operations/workbench/ui/styles.css`,
`operations/workbench/test/ui-static-assets.test.ts`,
`operations/workbench/test/ui-responsive-layout.test.ts`, and
`operations/workbench/test/ui-conversation.test.ts`. Runtime/server contracts
are frozen inputs; a discovered runtime defect returns to its owning packet as a
correction instead of being patched in UI.

**Inputs and output.** Input is Wave 3's exact commit and its event/projection
schemas. Output is a code/test commit. Browser-local state retains only
conversation ID, last applied cursor, composer draft, and presentation focus;
refresh reconstructs canonical facts from server owners.

**Decisions and deferred questions.** Add one conversation destination,
scrollable feed, multiline composer, provisional/settled styling, reconnect
standing, exact interrupt controls, project/task/activity/result links, and
requested/observed model evidence. Preserve existing Task acceptance actions
as distinct explicit controls. Responsive behavior uses the current shell and
mobile navigation. Defer voice/media, animation polish not needed for clarity,
and new design-system abstractions.

**Checks and observation.** DOM tests cover keyboard submit, multiline entry,
cursor persistence, ordered/deduplicated events, reconnect banner, provisional
loss, settled replay, correct control target, evidence links, acceptance
separation, reduced motion, focus, and narrow layout. A real-browser smoke check
at `1440x900` and `390x844` uses the pinned entry before handoff.

**Disconfirming/stop boundary.** Return a correction if the UI needs to own an
operation decision, canonical status, or replay rule; if refresh duplicates an
effect; if polling remains the only progress path; or if composer/feed/control
is unusable at 390 px.

**Handoff.** Frozen implementation commit to Packet 7. The implementation
worker does not accept its own daily-use behavior.

### Wave 5 — independent behavioral and browser verification

**Whole contribution and visible result.** One independent verification owner
reconstructs the whole from the exact implementation commit, runs deterministic
checks, performs the named two-project dogfood without Codex as hidden
coordinator, and records source-linked behavioral/visual evidence. It reports
findings or a bounded verification conclusion; neither is Principal acceptance.

**Owned paths.** Packet 7 owns only natural verification artifacts:
`design/organization/sessions/2026-08-13-conversation-command-entry-verification.md`
and files under
`design/organization/sessions/evidence/2026-08-13-conversation-command-entry/`
named for their content: `deterministic-tests.txt`,
`provider-observation.json`, `dogfood-events.jsonl`,
`desktop.snapshot.md`, `mobile.snapshot.md`, `console.txt`, `geometry.json`,
`desktop.png`, and `mobile.png`. It does not edit implementation, Mission, Task
fixtures, or this plan. Disposable browser state remains outside Git.

**Inputs and output.** Input is the exact Wave 4 commit plus this plan, System
Case, Mission, configured test Workbench home, declared credentials, and two
registered isolated test Worktrees. Output is the files above and their Git
revision. They are verification evidence, not a mandatory reusable pack or
content gate.

**Checks and observation.** Run focused Workbench, Autonomy, and Work Cell tests
plus all three typechecks; retain commands, exit codes, and output digest/text.
Retain requested provider/model/thinking/effort, observed provider/model,
observed-effort standing, fingerprint/metadata, request/turn ID, usage, and
terminal outcome. Use the [pinned browser observation
entry](../../../operations/workbench/README.md#browser-observation) with one
session name; retain snapshot, console, geometry, and screenshot evidence at
both sizes. The narrative links each conclusion to exact raw evidence and
canonical Task/Mission/attempt/effect refs.

**Disconfirming/stop boundary.** A duplicate Task/action, unregistered project
fallback, silent model downgrade, hidden Codex coordination, false liveness,
conflated interruption, missing correction lineage, stale evidence result,
browser console error, overflow, or lost settled reply is a finding and blocks
a success claim. It does not authorize redesign or acceptance.

**Handoff.** Exact verification commit and findings to the Principal. The
Principal separately decides product and local Task acceptance.

## Dependency and ownership map

```text
P1 journal contract
  -> P2 WebSocket transport/server
     -> P3 DeepSeek coordinator/prompt
        -> P4 canonical operations + attempt/liveness seams
           -> P5 catalog execution + temporary contributions
              -> P6 browser projection
                 -> P7 independent whole verification
```

P1 and P2 are serial because transport exposes the cursor contract. P3 and P4
are serial because the model tool port must freeze before the host effect
adapter. P4 and P5 are serial and share `task-run`, `task-attempts`, coordinator,
and runtime surfaces. P6 is the only UI writer and begins after runtime freeze.
Only P7's deterministic and browser observations may run concurrently, because
they write disjoint evidence files against one immutable implementation commit;
one verification owner reconciles them. No two packets concurrently write a
shared contract.

If a downstream worker finds a source contradiction, it returns the exact
source/path/failing observation to the prior owner. That correction relation is
sufficient; it does not create an approval gate.

## Mission and non-goal coverage

| Mission acceptance / System Case boundary | Owning wave | Evidence |
|---|---|---|
| Browser creates a local Task and corrects the same obligation without CLI forms | 2 runtime semantics, 4 projection, 5 dogfood | Task IDs/revisions/source refs before and after correction; browser events and snapshot |
| Attributable progress and settled output | 3, 4, 5 | exact attempt/carrier/timeline/Cell/effect refs; result claim standing remains separate |
| Explicit DeepSeek Pro reasoning=max; requested/observed retained; no downgrade | 2, 4, 5 | provider observation JSON and feed; mismatch/failure fixture |
| One synthesis owner; temporary catalog contributors only when useful | 3, 5 | zero-worker inquiry plus bounded worker list/spawn/result events and Cell refs |
| Duplex input during output/work | 1, 3, 5 | simultaneous socket test and changed-requirement dogfood event order |
| Provisional vs durable state | 1, 4, 5 | reconnect cursor replay excludes deltas and includes turn settlement |
| Explicit response/tool/persistent interruption | 2–4, 5 | distinct typed commands and exact adapter receipts/unknown standing |
| Reconstruct after connection loss without provider memory or replayed mutation | 1–2, 4–5 | reconnect replay, canonical causal reconciliation, unchanged Task count |
| Runtime and UI independently testable | 1–3 and 4, then 5 | non-UI protocol tests; DOM/browser artifacts |
| Multi-project representative daily use | 5 | named walkthrough below across two registered project IDs/Worktrees |
| Principal acceptance remains separate | all, especially 4–5 | no acceptance action in coordinator; browser explicit existing Task acceptance; narrative states withheld |
| No voice/audio/WebRTC/VAD first | all | no media fields/dependencies; voice adapter seam only |
| No scheduling or recurrence | all | absent contracts, storage, and UI |
| No all-to-all chat, standing roster/group, or organization simulator | 3 | catalog list/spawn only; formations end with bounded settlement |
| No voting, consensus, new review gate, autonomous acceptance/settlement/integration | all | one synthesis owner; review is evidence; withheld authorities in packets |
| No full Codex parity or generalized event/security/media platform | all | bounded protocol and exact existing authorities only |

## Named end-to-end dogfood: Two-Workbench Daily Correction

Packet 7 prepares a disposable Workbench home with two explicitly registered
projects—call them `skills-dogfood` and `worker-dogfood`—and one Git-clean
isolated Worktree for each, both present in current Workbench observations. The
fixture records real project IDs, primary heads, Worktree paths/heads, and
returned instruction files; these names are aliases, not identity.

1. Open the browser, start a new conversation, and say in ordinary language:
   “In skills-dogfood, add the bounded fixture result described by the project
   source.” Observe registered/current resolution and exact Worktree binding,
   one Task ID, durable message receipt, requested DeepSeek Pro/max, and an exact
   live ordinary catalog attempt.
2. While provisional response/activity events are still arriving, say: “Keep
   this same task, but the result must also preserve the second fixture
   invariant.” Observe a correction on the same Task ID, exact old-attempt
   interruption/settlement, and replacement execution from the new Task
   revision—or a visible unknown that prevents unsafe replacement.
3. Close the browser after the canonical correction but before its settled
   reply is observed. Reopen with the retained conversation ID/cursor. Confirm
   ordered receipt/settlement replay, current canonical Task/correction/activity
   re-read, and exactly one Task/mutation.
4. Use the explicit persistent-work interrupt on the exact active carrier;
   separately stop one coordinator response and demonstrate it does not imply
   the persistent interrupt. Record tool cancellation only if its adapter
   returns it; otherwise retain unknown.
5. In the same conversation, publish a separate bounded task for
   `worker-dogfood`. Confirm its stable registered identity and Worktree differ,
   while the first Task history remains intact. Let the second result settle.
6. Obtain evidence-linked result claims for both Tasks: each links its Task
   revision, attempt/carrier, Work Cell/timeline/effect or unverified claim
   standing, changed paths, checks, and candidate commit when produced. Do not
   press acceptance. The narrative ends with Principal acceptance explicitly
   withheld.

The coordinator for every step is the implemented DeepSeek carrier. Codex may
operate the browser and collect evidence as the independent verifier, but may
not interpret a Principal message, choose an operation, repair runtime state,
or synthesize a hidden result on the coordinator's behalf.

## Verification artifact and rollback plan

Deterministic tests use fakes for WebSocket scheduling, journal failure seams,
model streams/tool calls, project/Task sources, carriers, and catalog workers.
One live provider observation is enough for behavior that cannot be established
mechanically; it does not promote a reusable capability. The source-linked
verification narrative names exact commands/revisions and points to raw output,
provider identity, journal/canonical refs, and browser snapshot/console/
geometry/screenshots. Review observations may appear as findings in that
narrative; they do not become permission to begin, accept, merge, or publish.

Rollback is wave-local because canonical Task/Mission/effect ownership is not
migrated:

- Wave 1 can remove the WebSocket route and `conversation-events` files. A
  retained JSONL file is versioned, readable history; older code ignores it.
- Wave 2 can remove the coordinator/operation host. Any Task or Mission action
  it already committed remains in its canonical owner, referenced by the
  readable journal; rollback must not reverse it by deleting journal records.
- Wave 3 can disable catalog start/control and retain attempt/timeline evidence
  as read-only history. Existing CLI attempts remain readable. Unknown live
  work is inspected before removing an exact lease or carrier artifact.
- Wave 4 can remove the conversation UI while the non-UI protocol remains. No
  canonical migration or conversation data rewrite is needed.
- Wave 5 evidence can be reverted independently; doing so removes observations,
  not product state.

Persisted journal compatibility rule: readers reject an unknown major event
version and preserve the file; additive projection fields do not rewrite prior
lines. A future compactor/storage migration must be a separately tested reader
plus atomic replacement and is outside this plan.

## Prohibited implementation additions

Implementation workers must not add scheduling/recurrence; voice, audio, media,
WebRTC, VAD, or playback first; a standing command group, team/role database, or
all-to-all messaging; regex, keyword, or fixed-phrase semantic routing; a
generalized event bus, transport framework, storage platform, security system,
approval system, or media platform; new review/approval/promotion gates; silent
provider/model/effort downgrade; automatic Principal acceptance, Mission
settlement, commit, merge, publication, or product acceptance; or full Codex
feature parity.

## Prepared worker packets

These are locally coherent planning outputs, not launched Tasks. Every packet
inherits exact whole revision
`6e8c3fa4edccc2ccf36e28deb23833d68cdbd923`, the System Case, Mission, this
plan's whole/non-goals, and no authority beyond its explicit paths/effects.

### P1 — Interaction journal owner

- **Contribution:** implement the strict interaction schemas and fsynced
  per-conversation JSONL with cursor replay and duplicate reconciliation.
- **Owned paths/effects:**
  `operations/workbench/src/conversation/contracts.ts`,
  `operations/workbench/src/conversation/journal.ts`, and
  `operations/workbench/test/conversation-journal.test.ts`; local code/test
  writes and its Git commit only.
- **Sources:** System Case journal/lifecycle sections; existing
  `FileMissionTimeline` and `FileEffectJournal` append/repair behavior.
- **Local acceptance:** `bun test
  operations/workbench/test/conversation-journal.test.ts` and
  `bun run --cwd operations/workbench typecheck` pass; no Task/Mission/effect
  meaning appears in the schema.
- **Output:** code/tests at one exact commit; return changed paths, checks, and
  unresolved crash/storage observations. No wrapper artifact.
- **Stop:** fsynced monotonic append or same-ID reconciliation cannot be made
  truthful under the single-server writer boundary.
- **Withheld:** transport, model, canonical effects, UI, integration, semantic
  acceptance.
- **Next consumer:** P2 at the exact commit.

### P2 — Duplex transport owner

- **Contribution:** expose native Bun WebSocket replay/live delivery over P1's
  contract with an echo/fake runtime.
- **Owned paths/effects:**
  `operations/workbench/src/conversation/transport.ts`,
  `operations/workbench/src/ui/server.ts`, and
  `operations/workbench/test/conversation-transport.test.ts`; no dependencies
  unless current Bun compilation proves one necessary.
- **Sources:** P1 commit, current `server.ts`, package/runtime files.
- **Local acceptance:** `bun test
  operations/workbench/test/conversation-transport.test.ts`, Workbench
  typecheck, and a non-browser submit/stream/reconnect protocol observation
  pass.
- **Output:** code/tests commit and exact protocol behavior.
- **Stop:** Bun native transport fails the Wave 1 disconfirming signals.
- **Withheld:** model spend, Task/Mission mutation, UI, integration, acceptance.
- **Next consumer:** P3.

### P3 — Coordinator and prompt owner

- **Contribution:** implement one strict DeepSeek Pro/max coordinator turn,
  prompt composition, streaming, tools port, requested/observed evidence, and
  response interruption.
- **Owned paths/effects:**
  `operations/autonomy/src/conversation-coordinator.ts`,
  `operations/autonomy/src/conversation-prompt.ts`,
  `operations/autonomy/src/index.ts`, and
  `operations/autonomy/test/conversation-coordinator.test.ts`. Fake tests have
  no spend; the one live probe runs only under the already declared DeepSeek
  credential and disclosure envelope.
- **Sources:** P2 commit, System Case coordinator/provider sections, DeepSeek
  adapter, AI SDK patterns already in Autonomy.
- **Local acceptance:** `bun test
  operations/autonomy/test/conversation-coordinator.test.ts` and Autonomy
  typecheck pass; the live probe records success or a visible non-fallback
  failure.
- **Output:** code/tests commit plus natural provider observation when run.
- **Stop:** requested policy cannot be represented, observed identity conflicts,
  or source disclosure cannot be bounded.
- **Withheld:** canonical mutations, worker spawn, Task acceptance, UI,
  integration.
- **Next consumer:** P4.

### P4 — Canonical operation and activity seam owner

- **Contribution:** bind coordinator tools to verified project/current-primary/
  Worktree and existing Task/Mission operations; factor attempt
  preparation/settlement and expose a narrow exact-carrier activity port.
- **Owned paths/effects:**
  `operations/workbench/src/conversation/runtime.ts`,
  `operations/workbench/src/conversation/context.ts`,
  `operations/workbench/src/conversation/operations.ts`,
  `operations/workbench/src/ui/server.ts`,
  `operations/workbench/src/task-run.ts`,
  `operations/workbench/src/task-attempts.ts`, and their focused new/existing
  Workbench tests. Tests use disposable homes/repos; no real Task/Mission
  mutation outside fixtures.
- **Sources:** P3 commit, Task/project/Worktree/control APIs and tests named in
  the current-source map.
- **Local acceptance:** focused conversation operation, `task-run`, and
  `task-attempts` tests plus Workbench typecheck pass; no phrase routing and no
  journal-owned canonical state is present.
- **Output:** code/tests commit with exact interface/source lineage.
- **Stop:** action cannot be causally reconciled, project/current Worktree can be
  guessed, or existing authority must be weakened.
- **Withheld:** live work, catalog formation, UI, external integration,
  acceptance.
- **Next consumer:** P5.

### P5 — Persistent execution and formation owner

- **Contribution:** attach ordinary Task attempts to exact coordinator-owned
  delegate handles, install current WorkerCatalog list/spawn/result behavior,
  preserve exact Mission carrier route, and implement correction/interruption/
  guarded recovery. Keep public worker start at task intent plus non-derivable
  constraints; derive the current internal admission/evidence fields in the
  host adapter.
- **Owned paths/effects:**
  `operations/workbench/src/conversation/execution-carrier.ts`,
  `operations/workbench/src/conversation/runtime.ts`,
  `operations/workbench/src/task-run.ts`,
  `operations/workbench/src/task-attempts.ts`,
  `operations/workbench/src/ui/work-items.ts`,
  `operations/autonomy/src/conversation-coordinator.ts`,
  `operations/workbench/test/conversation-execution-carrier.test.ts`,
  `operations/workbench/test/task-run.test.ts`,
  `operations/workbench/test/ui-work-items.test.ts`, and
  `operations/autonomy/test/conversation-coordinator.test.ts`. One writer owns
  these shared contracts for this packet.
- **Sources:** P4 commit, DelegateLoop/WorkerCatalog/current worker policy,
  Mission runner actions, Work Cell records.
- **Local acceptance:** the four focused test files above and Workbench/
  Autonomy typechecks pass plus one bounded slow-worker observation when
  necessary; `started` alone is never live.
- **Output:** frozen non-UI implementation commit and exact residual unknowns.
- **Stop:** uncorrelated writer/cancellation, false liveness, duplicate Task
  authority, host semantic ranking, or self-review/voting is required.
- **Withheld:** UI, Principal acceptance, commit/merge/publish outside its own
  implementation commit.
- **Next consumer:** P6.

### P6 — Browser projection owner

- **Contribution:** implement composer/feed/reconnect/control/evidence UI over
  the frozen runtime, including desktop/mobile and accessibility behavior.
- **Owned paths/effects:** `operations/workbench/ui/index.html`,
  `operations/workbench/ui/app.js`, `operations/workbench/ui/styles.css`,
  `operations/workbench/test/ui-static-assets.test.ts`,
  `operations/workbench/test/ui-responsive-layout.test.ts`, and
  `operations/workbench/test/ui-conversation.test.ts`; no runtime contract
  edits.
- **Sources:** P5 exact commit, current UI shell/tests, pinned browser entry.
- **Local acceptance:** the three focused UI tests, Workbench typecheck, and
  desktop/mobile pinned-browser smoke observation pass without canonical
  browser state or console/layout defects.
- **Output:** implementation commit; disposable screenshots are not its product
  evidence unless P7 independently recreates them.
- **Stop:** a runtime semantic gap is required to make UI truthful; return an
  exact correction to P5.
- **Withheld:** runtime redesign, verification conclusion, Task/product
  acceptance, PR/push/merge/publish.
- **Next consumer:** P7.

### P7 — Independent whole verifier

- **Contribution:** verify the frozen whole and execute Two-Workbench Daily
  Correction, recording deterministic, provider, event, and visual evidence.
- **Owned paths/effects:**
  `design/organization/sessions/2026-08-13-conversation-command-entry-verification.md`
  and the exact named files under
  `design/organization/sessions/evidence/2026-08-13-conversation-command-entry/`;
  authorized local test-home/provider/browser effects within the declared
  envelope. No implementation edits.
- **Sources:** P6 commit, this plan, System Case, Mission, exact canonical runtime
  evidence, pinned browser instructions.
- **Local acceptance:** focused tests, all three package typechecks, the exact
  provider observation, and pinned browser snapshot/console/geometry/screenshot
  commands are retained; every Mission row is evidence-backed or an explicit
  finding and every disconfirming signal is checked.
- **Output:** source-linked narrative and named raw evidence at one exact commit.
  Mechanical checks prove files/revision only, not semantic acceptance.
- **Stop:** missing fixture/credential is recorded as unverified; any product
  contradiction is a finding returned to the owning implementation packet, not
  repaired here.
- **Withheld:** implementation, design revision, Task/Mission/Principal/product
  acceptance, integration, push/PR/merge/publish.
- **Next consumer:** Principal decision, with acceptance separate.
