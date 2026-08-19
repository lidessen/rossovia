# Conversation Command Entry — Candidate System Case

**Status:** candidate system design — not reviewed, not accepted, and not
implementation authority

**Date:** 2026-08-13

**Mission:** [conversation-command-entry](../../../apps/missions/conversation-command-entry.json)

**Repository evidence baseline:** `23246d48b8e01792e34d8b0f4bed22f030b66bf1`;
the design worktree began at `2ca83a619b9869ded320f952b0773549a4e7d555`,
whose only delta from that baseline was the Mission record

**Reader and use:** the fresh design reviewer who must try to falsify this
candidate, then—only if no material finding remains—the implementation planner
who must turn supported properties into an implementation plan

This document uses four claim labels deliberately:

- **Observed** means the statement is linked to accepted repository evidence or
  the named official primary source.
- **Design inference** means the relation proposed here follows from the
  observed sources but is not yet accepted architecture.
- **Current policy** means a replaceable present choice, not mechanism or
  provider truth.
- **Unknown** means neither this design nor the cited evidence settles the
  implementation or observed capability.

The draft [Autonomous Collective Intelligence program](../../AUTONOMOUS-COLLECTIVE-INTELLIGENCE.md#natural-interaction)
is used only as recorded Principal direction: it asks for natural correction of
the same living object and says UI forms must remain projections. Its own status
and present-standing section explicitly make it a target, not accepted
architecture or current authority.

## The daily situation this system must make sufficient

A Principal opens one local browser surface and says, in ordinary language,
that a result is needed in a named project. The system acknowledges the message,
resolves the spoken name to a registered project's current primary observation,
and shows which existing source now carries the obligation. Project-bound
execution begins only after an exact currently observed Worktree is retained on
the Task. Ambiguous, merely discovered, unregistered, or stale resolution is
shown instead of silently creating an independent Task or guessing a Worktree.
While work and response text are still arriving, the Principal can add a changed
constraint. The coordinator judges that message against the live object, records
it as a correction to the same Task or Mission rather than inventing a
replacement obligation, and makes the delivery and its effect on later work
visible.

The Principal can leave the page and return. The reconstructed view distinguishes
what was merely being generated, what message or action was durably settled,
what an owner-backed live carrier currently reports as running, and what result
is only a submitted claim. An ordinary Task attempt marked `started` without a
current carrier observation appears as liveness unknown, never as active work.
The view links progress and outcomes to the Task, Mission timeline, execution
attempt, effect, and verification evidence that actually own those facts.
Stopping a response does not silently stop a tool or persistent task; persistent
work can be interrupted or recovered only through an exact carrier that exposes
that control. Final result acceptance remains an explicit Principal action under
the existing task boundary.

This is sufficient for the first product outcome when the Principal can, without
using CLI forms:

1. publish one new local obligation from an explicit message after any named
   project has a verified registered/current route;
2. correct or continue that same still-open obligation in a later message;
3. observe attributable owner-backed ongoing work, or a truthful unknown when
   liveness/control evidence is absent, plus interruption and recovery where the
   exact carrier supports them;
4. reconnect without losing settled conversation or work identity;
5. receive a result with its evidence standing, and keep acceptance distinct
   from production and review; and
6. use the entry for ordinary local multi-project direction without depending on
   a Codex conversation as the session-level coordinator.

The accepted [Mission acceptance](../../../apps/missions/conversation-command-entry.json)
owns product settlement. This candidate describes a system relation that could
satisfy it; neither this document nor its author accepts that outcome.

## Present path and principal control gap

**Observed.** Workbench currently exposes separate paths rather than one
conversation runtime:

- Spoken project names are aliases for a routing projection, not project or Task
  identity. `resolve` distinguishes registered from merely discovered projects;
  Task project context requires a registered project and its current primary
  observation, while `task run` additionally requires an exact existing
  Worktree binding
  ([Workbench route](../../../apps/workbench/AGENTS.md#rossovia-workbench-entry),
  [resolution](../../../apps/workbench/src/resolve.ts#L15-L51),
  [Task binding](../../../apps/workbench/src/tasks.ts#L793-L850),
  [run binding](../../../apps/workbench/src/task-run.ts#L149-L164)).
- Local Principal Tasks are created and mutated in
  [`state/tasks.json`](../../../apps/workbench/src/tasks.ts#L147-L238),
  using source and task revisions; correction reopens the same unsettled task,
  and submitted output remains a claim until explicit acceptance.
- CLI `task run` lowers one open task into immutable attempt input, a Work Cell
  final record, and append-only settlement evidence. Its immutable initial
  record says only `started`; it carries no process identity, heartbeat, or live
  observation, and the ordinary Task control plane has no pause/resume/stop
  operation. The attempt projection intentionally omits the raw trace and takes
  requested and observed facts from their respective sources
  ([task run](../../../apps/workbench/src/task-run.ts#L423-L471),
  [attempt projection](../../../apps/workbench/src/task-attempts.ts#L11-L108),
  [Task control plane](../../../apps/workbench/src/local-task-control-plane.ts#L49-L66)).
- A live Mission runner receives exact contribution, control, correction, and
  recovery through its runner boundary, while the Mission timeline retains
  ordered inputs, turns, delegation, and reconciliation
  ([Mission input contract](../../../apps/autonomy/src/mission-input.ts),
  [Workbench runner actions](../../../apps/workbench/src/ui/actions.ts#L28-L74),
  [Mission runner](../../../apps/autonomy/src/mission-runner.ts)).
- The browser server exposes snapshot reads and form-style POST mutations, and
  task launch is restricted to two trusted runtime adapters
  ([server routes](../../../apps/workbench/src/ui/server.ts#L81-L187),
  [runtime adapters](../../../apps/workbench/src/ui/task-execution-runtime-adapter.ts)).
  The browser refreshes `/api/snapshot` on a five-second polling interval rather
  than consuming a duplex event stream
  ([browser polling](../../../apps/workbench/ui/app.js#L278-L304)).

**Design inference.** The principal gap is not another chat renderer. It is an
owned relation from one incoming Principal message, through coordinator judgment
and—when warranted—an authoritative mutation, to attributable operational
events and a reconstructable settled reply. Putting conversational prose over
the current HTTP forms would leave semantic routing, verified project context,
in-flight correction, current liveness/control, provisional output, causal
identity, and reconnect recovery unowned.

## Canonical authority and state map

The conversation entry must preserve the sources already distinguished by the
repository. Each row states what the source owns and what the new surface may do
with it.

| Canonical source | Existing ownership | Conversation-entry relation |
|---|---|---|
| Registered project source and current workspace observation | A stable registered project ID owns project identity; a spoken alias resolves only to a routing projection. Project context is valid only from the registered project's current primary observation, and execution requires an exact observed Worktree ([Workbench route](../../../apps/workbench/AGENTS.md#rossovia-workbench-entry), [resolution](../../../apps/workbench/src/resolve.ts#L15-L51), [Task binding](../../../apps/workbench/src/tasks.ts#L793-L850)). | Before a project-bound Task mutation, the coordinator requires one unambiguous registered/current resolution; before execution, it requires the exact retained Worktree binding. Discovered, unregistered, ambiguous, stale, or unwritable results remain visible and cannot fall back to an independent Task or guessed Worktree. The exact pre-action representation is for planning. |
| Local Task source | `state/tasks.json` owns the explicit local obligation, lifecycle, corrections, result claims, and Principal settlement; reviews add evidence without changing task standing ([Task source](../../../apps/workbench/src/tasks.ts#L147-L260), [review and acceptance](../../../apps/workbench/src/tasks.ts#L330-L384)). | The coordinator calls typed Task operations against current revisions. The journal references returned Task identity and revision; it never copies or decides task lifecycle. |
| Git Mission record | A Mission record owns a material multi-session objective, open branches, acceptance, and return conditions; it is not a scheduler, backlog, or launch authority ([Mission Records](../../../apps/missions/README.md#boundaries)). | The entry projects Mission state and may route explicit input to an existing Mission. It does not create a Mission merely because a conversation exists. |
| Authorization receipt | One receipt releases only its declared disclosure, budget, paths, and one launch; commit, merge, publish, and product acceptance stay withheld ([authorization receipt](../../../apps/workbench/src/execution-authorization.ts#L65-L111)). | The UI can present and invoke the existing authorization action when explicitly directed. A conversation message cannot imply or enlarge a receipt. |
| Mission timeline | Ordered input receipts, turns, child delegation settlements, recovery, and reconciliation are durable Mission execution history ([timeline event contract](../../../apps/autonomy/src/delegate-timeline-events.ts), [turn contract](../../../apps/autonomy/src/mission-turn.ts)). | Conversation events refer to timeline event and turn identities. The feed does not rewrite timeline meaning into its own status. |
| Effect journal | Prepared, started, tool, quiescence, verification, settlement, and uncertainty events own effect evidence; Principal acceptance remains withheld there ([effect journal](../../../apps/autonomy/src/effect-journal.ts#L30-L150)). | The feed projects effect facts and controls only through the owning runtime. It never infers effect completion from coordinator prose. |
| Work Cell record and task-attempt evidence | One Cell record owns one bounded run's input, driver identity, trace, usage, workspace diff, structural verification, and terminal status; completion is process evidence, not correctness. An ordinary attempt's retained `started` state is start evidence, not a current-running observation ([Work Cell contracts](../../../packages/work-cell/src/contracts.ts#L218-L260), [attempt sources](../../../apps/workbench/src/task-attempts.ts#L11-L108)). | The entry shows selected operational events and evidence references. It neither promotes a run to Task authority nor exposes raw trace as the main conversation, and it renders current liveness unknown unless an exact runtime-owned observation proves it. |
| **Candidate coordinator and execution-carrier observation** | **Design inference:** current coordinator/attempt liveness and authorized interruption/recovery must be owned by the exact carrier and correlated to durable conversation, Task, and attempt identity. Existing Mission runners expose such live status and controls; ordinary local Task attempts and their control plane do not ([Mission action status](../../../apps/workbench/src/ui/actions.ts#L28-L74), [Task control plane](../../../apps/workbench/src/local-task-control-plane.ts#L49-L66)). | The UI projects only owner-backed liveness/control. For the first persistent-work capability, execution uses an exact carrier with observable liveness and authorized control, such as a live Mission carrier, or start/control remains fail-visible. The final product must still acquire this property for ordinary daily Tasks; its representation is `[owning runtime/planning to determine]`. |
| **Candidate interaction journal** | **Design inference:** the smallest missing durable source owns only receipt and settlement of conversational messages, causal correlation between a message/response/action and canonical source references, and reconnect ordering. | It must not own objective, lifecycle, authorization, effect truth, verification, or acceptance. Any work status it shows is rebuilt from the canonical sources above. |
| Browser UI and provider session | The current UI already builds read-only projections; the draft Principal direction says conversation must not become the backend domain model ([server projection](../../../apps/workbench/src/ui/server.ts#L309-L419), [draft direction](../../AUTONOMOUS-COLLECTIVE-INTELLIGENCE.md#workbench-is-a-perceptual-surface)). | Both are replaceable shells. Neither is a durable work identity or recovery source. |

### Why one interaction journal is justified

**Design inference.** Reconnect needs facts that the existing sources do not
own: that a Principal message was received, which settled coordinator response
answered it, which typed action was attempted, and which canonical receipt or
failure the action produced. A Task cannot truthfully store a message that did
not become an obligation; a Mission timeline should not absorb ordinary local
conversation; a provider session cannot survive provider replacement or its own
session limit.

The journal therefore retains communication and its order monotonically and
references canonical work evidence. Whether its physical representation is
append-only is for planning. Provisional text may be streamed to the current
connection, but it becomes reconstructable only when settled or when an
interruption/failure is durably recorded. A projection re-reads current Task,
Mission, attempt, effect, and owner-backed carrier observations rather than
treating an old conversational status line or attempt start as current truth.
Retention duration, physical format, compaction, and exact event representation
are **unknown** and belong to implementation planning.

This is a new source for interaction delivery only, justified by the Mission's
reconnect and attributable-conversation acceptance. If planning finds that these
facts can be reconstructed without loss from an existing accepted source, it
should remove the journal rather than duplicate them.

## Text-first duplex command and event relation

**Observed external analogue.** OpenAI Realtime documents a stateful session
with conversation items and responses over long-lived transports, incremental
text deltas followed by completion, correlated asynchronous function calls and
results, explicit response interruption, and optional automatic or manual turn
detection
([Realtime guide](https://developers.openai.com/api/docs/guides/realtime),
[conversations](https://developers.openai.com/api/docs/guides/realtime-conversations),
[WebSocket](https://developers.openai.com/api/docs/guides/realtime-websocket),
[VAD and manual turns](https://developers.openai.com/api/docs/guides/realtime-vad)).
Its browser guidance also keeps ordinary API credentials outside the browser
([WebRTC](https://developers.openai.com/api/docs/guides/realtime-webrtc)). The
Agents SDK material treats interruption, transport, and correlated tracing as
explicit runtime concerns
([Python Realtime](https://openai.github.io/openai-agents-python/realtime/guide/),
[transport](https://openai.github.io/openai-agents-js/guides/voice-agents/transport/),
[tracing](https://openai.github.io/openai-agents-js/guides/tracing/)).

These sources establish useful properties, not Rossovia's transport or state
authority. The first slice requires one local, long-lived, bidirectional channel
that can accept another Principal command while coordinator output and work
events are arriving. Whether the adapter is WebSocket or another local duplex
transport is **unknown**: current repository evidence does not make that choice,
and the implementation planner owns it.

### Required lifecycle properties

1. **Receive and correlate.** A Principal message is durably receipted before
   any semantic action claims to have used it. Conversation, response, action,
   tool, Task, Mission input, turn, attempt, and effect identities remain
   distinguishable and causally referable. This requirement does not prescribe
   their exact schema.
2. **Stream provisional output.** Text deltas and activity hints may arrive
   immediately, but the UI visibly marks them provisional. They cannot create a
   Task, settle a response, prove a tool effect, or become reconnect state merely
   by appearing on screen.
3. **Settle messages and actions.** A coordinator response becomes settled only
   with its durable journal record. A requested action becomes settled only with
   the receipt, source revision, timeline event, attempt reference, or explicit
   failure returned by its canonical owner. Operational events are typed
   projections of those sources, not natural-language claims generated for the
   UI. A non-mutating inquiry may instead settle a response from the current
   canonical projection without requesting any action.
4. **Continue asynchronous effects.** A function/tool call can remain in flight
   after the response that requested it. Its eventual result correlates to that
   call and canonical effect evidence; the coordinator may continue useful
   non-conflicting work while it waits.
5. **Reconstruct after disconnect.** Reconnection reads the interaction journal
   from the last settled position, then re-reads the referenced Task, Mission,
   attempt, effect, and exact-carrier observations. It does not replay a
   Principal mutation merely because the client missed its acknowledgement, and
   it does not ask a provider session to remember durable work. A retained
   `started` attempt without a current carrier observation remains liveness
   unknown after reconnect.
6. **Reconcile conflicts visibly.** Stale revisions, duplicate delivery,
   uncertain effects, provider failure, and disconnect during action settlement
   remain observable states with a recovery path. The default response is to
   reconstruct and retry only the uncommitted part, not to hide the error or add
   a new prohibition.

The following flow is illustrative, not a normative event schema:

```text
Principal message
  -> durable interaction receipt
  -> coordinator provisional text ...
  -> if mutation is warranted: typed Task/Mission/tool action requested
     -> canonical owner validates and mutates, or returns a visible failure
     -> settled action references canonical evidence
  -> settled coordinator response
  -> later operational events continue to update the projection
```

### Interruption is three different controls

- **Response interruption** stops generation and closes or marks the provisional
  response. It has no implied effect on an already dispatched tool or persistent
  task.
- **Tool interruption** requests cancellation at the owning adapter. If dispatch
  has not begun, it may prevent the call; if a custom tool is already running,
  cancellation is **unknown unless that adapter returns observed cancellation**.
  The supplied OpenAI sources do not establish cancellation of already-running
  custom tools.
- **Task or Mission interruption** uses the existing persistent control and
  recovery semantics only where its exact carrier exposes them. Mission input
  already distinguishes contribution from
  `pause`, `resume`, `stop`, and effect approval
  ([Mission input](../../../apps/autonomy/src/mission-input.ts#L68-L91));
  turn recovery separately distinguishes resume, replace, and abandon
  ([turn recovery](../../../apps/autonomy/src/mission-turn.ts#L111-L150)).
  The ordinary local Task surface exposes no matching control. A stopped
  response therefore cannot be interpreted as a stopped Task, and an ordinary
  Task cannot be presented as interrupted without an owning carrier observation.

### Current liveness is not start evidence

**Observed.** An ordinary Task attempt is written as `started` before the
synchronous runner returns, but that record contains neither a process identity
nor a heartbeat; its projection can therefore show retained start evidence
without establishing that work is currently running
([attempt creation](../../../apps/workbench/src/task-run.ts#L423-L471),
[attempt status](../../../apps/workbench/src/task-attempts.ts#L11-L39)).
The ordinary local Task command surface has no pause, resume, stop, or recovery
command, whereas current Workbench runner controls target an exact live Mission
runner ([Task commands](../../../apps/workbench/src/local-task-control-plane.ts#L49-L66),
[Mission controls](../../../apps/workbench/src/ui/actions.ts#L28-L74)).

**Design inference.** Every “currently active” coordinator or attempt indication
requires a fresh runtime-owned observation correlated to the durable coordinator,
Task, attempt, and carrier identities, plus an owner-backed account of supported
interruption/recovery. The exact representation remains
`[owning runtime/planning to determine]`. Until it exists, ordinary attempt
liveness is unknown. The first persistent-work slice may use an exact live
Mission carrier that already exposes the required observation/control boundary;
otherwise it must leave starting or controlling that work visibly unavailable.
This containment does not narrow product acceptance: ordinary daily Task
publication, correction, visible ongoing work, and results remain required once
an owning carrier supplies this property.

**Unknown.** The official Realtime sources supplied for this case do not
establish transparent reconnect/resume, event replay, action idempotency, or
already-running custom-tool cancellation. They document a current session
limit of 60 minutes, which is another reason Rossovia work identity must outlive
the provider session
([Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)).
Rossovia owns reconnect and replay behavior; planning must select a local
representation and test its failure cases.

## From one explicit message to the existing Task and Mission operations

**Design inference.** The coordinator, not deterministic phrase matching,
decides what an explicit message means in the current conversation and source
state. A status question or other non-mutating inquiry settles a response from
the current canonical projection and interaction history without creating a
Task or action; this is not a fifth work operation. Before a consequential
mutation it reads the referenced Task or Mission and current revision, considers
the active obligation and latest correction, then emits one typed operation.
The host checks structure, source existence, current revision, target identity,
scope, and available authority. It does not decide semantic intent or quality by
regular expression, keyword, or fixed phrase.

When the message names a project, project resolution precedes Task formation or
mutation. The spoken alias must resolve unambiguously to a registered project's
current primary observation; execution additionally requires one exact observed
Worktree retained in the Task binding. Ambiguous, unregistered, merely discovered,
stale, or unwritable resolution produces a settled visible limitation. It cannot
fall back to an independent unbound Task or a guessed Worktree
([routing boundary](../../../apps/workbench/AGENTS.md#rossovia-workbench-entry),
[resolution states](../../../apps/workbench/src/resolve.ts#L15-L51),
[Task context](../../../apps/workbench/AGENTS.md#rossovia-local-task-entry)).

The semantic choices are:

- **Create** when the explicit message forms a new local obligation. The
  coordinator supplies the objective and acceptance it can truthfully recover;
  the Task source returns the new identity and revision.
- **Correct** when the message changes a constraint or expected outcome of a
  still-active obligation. It appends correction to that Task and, when an exact
  linked Mission runner exists, uses the existing correction-delivery path.
- **Continue** when the message requests more work on the same unchanged
  obligation. This is not a new Task state or database operation. The coordinator
  chooses the currently valid existing continuation after reading the owning
  source and an exact carrier observation. A same-session attempt is reusable
  evidence only under its existing continuation checks; `started` alone does not
  establish a running session. If no owner-backed live/recovery path exists, the
  coordinator reports liveness unknown or continuation unavailable rather than
  launching over uncertainty.
- **Control** when the message is actually about pausing, resuming, stopping, or
  recovering an execution. The coordinator calls the matching operation only on
  an exact carrier that owns and exposes it. Ordinary Task state has no such
  control today, so its absence is visible rather than simulated. Response,
  tool, and persistent-task interruption remain separate.

A word such as “继续” can mean continue, resume, or acceptance in different
contexts, so it is deliberately not a routing token. If the coordinator cannot
form one supported operation without changing the obligation materially, it
asks for the missing judgment. A fresh reviewer judges consequential semantic
artifacts; code verifies only the typed boundary and source/effect evidence.

## Coordinator context and temporary contribution topology

### One synthesis owner

The minimum useful topology is:

```text
Principal <-> one local coordinator -> temporary bounded contributions
                                      -> fresh read-only review when warranted
```

The coordinator owns conversation-level reconstruction and the next semantic
action. It does not own Task acceptance, Mission settlement, effect truth, or
the correctness of a producer's result. Current delegation already supports
typed contribution source/obligation/acceptance/capability needs, an optional
worker catalog, durable batch settlement, and full or metadata-only result reads
([delegate loop](../../../apps/autonomy/src/delegate-loop.ts#L38-L105),
[durable batch boundary](../../../apps/autonomy/src/delegate-loop.ts#L188-L255)).

### Context arrives when it changes judgment

The coordinator prompt/context should be composed from these distinct layers;
the exact carrier is for planning:

1. A short disposition-and-relation kernel names the Principal relation,
   authoritative sources, current obligation, effect/acceptance boundaries, and
   the fact that the coordinator must reconstruct rather than vote or concatenate.
   It is refreshed on the first consequential action, correction, phase switch,
   recovery, and material worker return—not repeated before every token.
2. A compact current projection points to the authoritative Task/Mission state,
   active turn or attempt, unresolved correction, and relevant evidence standing.
   Volatile state stays in those sources and is re-read before mutation.
3. The current Principal message and its source/correction lineage provide the
   live semantic input.
4. Current execution policy states requested model, reasoning, capability,
   budget, workspace, and withheld effects separately from the semantic task.
5. Principles, Skills, and larger project sources load on demand only when they
   can change the present judgment.
6. Child contributions return compact conclusions, source scope, admissible
   claims, uncertainty, evidence references, and judgment owner. The coordinator
   reads full evidence by reference when needed before admitting a claim.

### Temporary command, staff, execution, and review contributions

“Command,” “staff,” and “execution” describe a relation to the current work,
not permanent agents or a roster:

- The coordinator carries the temporary **command contribution**: it keeps the
  Principal's direction, source revision, whole-task obligations, and final
  synthesis coherent.
- A **staff/evidence contribution** exists only when an independent source
  investigation, alternative analysis, or read-only review can expose a
  correlated error or reduce the coordinator's attention cost.
- An **execution contribution** owns one bounded effectful change with explicit
  source, acceptance, capability, stop condition, and withheld authority.
- A **fresh reviewer contribution** is non-producing and read-only for a
  consequential candidate. It returns findings against the candidate and
  sources; it does not vote, approve, accept, or merge.

The coordinator forms one or more of these only when the actual contributions
are independently executable or reviewable and the saved latency, attention,
or error exposure exceeds coordination cost. The delegation packet carries the
whole revision, source boundary, contribution, local acceptance, capability
need, dependencies, stop condition, and withheld authority. Several returns are
reconstructed against sources and the whole; they are never concatenated or
settled by majority.

This is not a permanent committee or another gate. The formation ends when its
bounded contribution returns or stops. No role persists into the next task by
title, no team state competes with Task/Mission state, and an ordinary reversible
action does not acquire review ceremony merely because the runtime can spawn
workers.

**Observed boundary.** WorkerCatalog is a generic lookup and driver-binding
mechanism whose contents remain host policy; hard labels filter capability and
the selected Cell retains exact worker and execution-profile evidence
([WorkerCatalog](../../../packages/work-cell/src/worker-catalog.ts#L38-L100),
[catalog tests](../../../packages/work-cell/test/worker-catalog.test.ts#L16-L83)).
The current host helper offers DeepSeek Flash for text/code and Kimi for vision,
but the catalog is optional on the delegate loop and is not installed by the
Workbench server
([current worker policy](../../../apps/autonomy/src/worker-policy.ts),
[optional catalog boundary](../../../apps/autonomy/src/delegate-loop.ts#L123-L149),
[Workbench server](../../../apps/workbench/src/ui/server.ts)). The host
must not rank workers by role name or prose; semantic coordinator judgment chooses
among structurally capable candidates.

## DeepSeek Pro `reasoning=max` is policy, not mechanism

**Current policy.** For development and local daily use, the conversation
coordinator requests provider `deepseek`, model `deepseek-v4-pro`, thinking
enabled, and reasoning effort `max`. Failure to obtain this requested profile is
visible and blocks that coordinator attempt; there is no silent downgrade to
Flash, a lower effort, or another provider. A later explicit policy change may
select a different profile without changing the conversation, action, event,
reconnect, or authority mechanisms.

**Observed carrier capability.** The direct DeepSeek adapter accepts an explicit
model and thinking policy and passes reasoning effort through provider options
([DeepSeek adapter](../../../packages/work-cell/src/integrations/ai-sdk/providers/deepseek.ts#L17-L35),
[model construction](../../../packages/work-cell/src/integrations/ai-sdk/providers/deepseek.ts#L132-L151)).
The OpenCode path accepts Workbench `--model` and `--reasoning-effort`, retains
the requested values in attempt evidence, and maps reasoning effort to
OpenCode's provider-specific `--variant`
([task run carrier](../../../apps/workbench/src/task-run.ts#L95-L126),
[attempt evidence](../../../apps/workbench/src/task-run.ts#L455-L471),
[OpenCode adapter](../../../packages/work-cell/src/opencode-cli-driver.ts#L79-L135)).
DeepSeek's official thinking-mode and chat-completion documentation currently
list native `low`, `high`, and `max` reasoning effort; compatibility values
`medium` and `xhigh` map to `high`
([thinking mode](https://api-docs.deepseek.com/guides/thinking_mode),
[chat completion](https://api-docs.deepseek.com/api/create-chat-completion/)).

Requested and observed evidence must remain separate:

- **Requested:** policy identity, provider, model, thinking mode, and effort
  attached to the coordinator launch or attempt.
- **Observed:** the adapter's returned provider/model identity, session or
  request evidence, terminal state, and provider fingerprint/metadata when the
  provider supplies it. Current Work Cell records already distinguish requested
  input from driver and session observation
  ([Work Cell observation](../../../packages/work-cell/src/contracts.ts#L218-L260),
  [attempt projection](../../../apps/workbench/src/task-attempts.ts#L46-L81)).
- **Unknown:** accepted repository evidence does not currently prove that a
  `deepseek-v4-pro` coordinator has run successfully, nor that the provider
  returns an independently observable confirmation of `max`. Until such
  evidence exists, the UI must say “requested max” and show observed effort as
  unavailable rather than equating configuration with adoption.

The current generic `ExecutionProfile` binds provider and model but has no
reasoning-effort property
([execution profile](../../../packages/work-cell/src/contracts.ts#L40-L49)).
Planning must choose the owning policy/evidence carrier without silently
changing that shared contract. The local adapter accepts `low`, `high`, `xhigh`,
and `max`; under the current official contract `xhigh` is a compatibility alias
for `high`, not a distinct native level
([local schema](../../../packages/work-cell/src/integrations/ai-sdk/providers/deepseek.ts#L17-L23)).

## Capability slices and disconfirming observations

These are dependency-ordered capability slices, not implementation tasks or a
file plan. A later planning owner decides representation and sequencing inside
each slice.

### 1. Non-UI text vertical slice

One local text entry reaches the coordinator under the explicit DeepSeek Pro
`reasoning=max` policy and produces provisional then settled text. It can answer
an inquiry from canonical projections without mutation, or choose one typed Task
create/correct/continue/control action and return its canonical receipt. A named
project must first resolve to registered/current context; execution also requires
its exact observed Worktree binding.

**Disconfirming observation:** semantic routing requires UI state; an action can
be claimed without a canonical source receipt; the coordinator silently runs a
different model/effort; a named project falls back to an unbound Task or guessed
Worktree; or the slice needs a second Task authority.

### 2. Durable liveness, reconnect, and correction slice

The interaction journal retains received and settled communication with causal
references. A client disconnect during output or action settlement reconstructs
without replaying an already committed mutation. A later Principal message can
correct the same in-flight obligation, and response/tool/task interruption
remain distinct. Persistent work starts only through an exact carrier with
owner-backed current liveness and authorized interruption/recovery; the first
slice may use an exact live Mission carrier, while ordinary Task liveness remains
unknown until an owning runtime supplies equivalent evidence.

**Disconfirming observation:** reconstruction depends on provider memory; an
uncertain action is duplicated; a correction creates a replacement Task without
semantic reason; `started` is displayed as currently running; unsupported Task
controls are simulated; or a stopped response stops persistent work implicitly.

### 3. Temporary-team slice

The coordinator can list structurally capable workers, form only the bounded
evidence/execution/review contributions earned by the case, park while children
settle, read their evidence, and reconstruct a whole response. Formation and
returns are visible through canonical timeline/Cell evidence.

**Disconfirming observation:** role labels become persistent state; the host
ranks semantic suitability; workers accept their own output; majority replaces
source reconstruction; or team formation is required for a trivial action.

### 4. Browser conversation slice

Only after the preceding behavior works without UI, the local browser becomes a
text composer and live event projection over the same coordinator/runtime. It
shows provisional and settled text, task/mission identity, owner-backed current
activity or visible liveness unknown, corrections, interruptions,
requested-versus-observed model evidence, result standing, and reconnect
recovery. One representative multi-project daily-use
walkthrough exercises new-task publication, requirement update, ongoing work,
intervention, and final result.

**Disconfirming observation:** the browser owns semantic state; five-second
snapshot polling remains the only progress channel; a refresh loses settled
conversation or duplicates an effect; or the walkthrough needs Codex to supply
hidden coordination. It also fails if named-project routing can drift silently
or ordinary `started` evidence is rendered as live work without an owner-backed
observation.

## Alternatives considered

| Alternative | Disposition | Decisive reason |
|---|---|---|
| Chat UI over current APIs only | Rejected as the whole design; useful only as a late adapter. | Current APIs are form mutations plus snapshot polling. They do not own in-flight semantic routing, provisional/settled distinction, causal tool correlation, or reconnect recovery. |
| One permanent coordinator only | Held as the minimum default topology, rejected as an exclusive topology. | One synthesis owner is necessary, but disjoint execution or fresh evidence review sometimes adds real latency or correlated-error benefit. Refusing temporary contributions would preserve an avoidable bottleneck. |
| Standing command group | Rejected. | Permanent command/staff/execution roles add coordination and correlated doctrine without new authority or evidence. Contributions should form from the current task and dissolve on return. |
| Provider Realtime session as canonical state | Rejected. | Provider sessions are adapter state, have bounded lifetime, and the official sources do not establish Rossovia-grade replay or reconnect. They cannot own Tasks, Missions, effects, or acceptance. |
| New conversation task database | Rejected. | It would duplicate `state/tasks.json` and Mission records, forcing reconciliation between two obligation sources. The only justified new durable state is communication receipt/settlement and causal references. |

## Intentional non-goals

- Natural voice, audio, WebRTC media, VAD, and playback truncation in the first
  slice. They are future input/output adapters over the same text-first system.
- Scheduling or recurrence. The Principal goal does not require a scheduler,
  and Mission records explicitly are not one.
- All-to-all worker chat, a standing roster, a permanent command group, or a
  generalized organization simulator.
- Voting, consensus, or another approval gate. Evidence is reconstructed against
  sources; existing authority owners settle their own decisions.
- Autonomous result acceptance, Mission settlement, commit, merge, publication,
  or product acceptance.
- Full Codex feature parity. The target is sufficient daily Rossovia direction,
  observation, correction, and result handling.
- A generalized media platform or a new security/approval system.
- Exact transport, event schema, storage engine, retention threshold, animation,
  or page layout in this design. Those require planning and UI design owners.

## Compact System Case

**Desired behavior, operating range, and acceptance owner:** A local Principal
can issue and revise ordinary multi-project work through a browser conversation,
observe owner-backed ongoing work or visible liveness unknown plus settled
evidence, disconnect and reconstruct, and receive a result without Codex acting
as the hidden daily coordinator. The Mission's
acceptance list and ultimately the Principal own product acceptance.

**System boundary and effect path:** Principal message → durable interaction
receipt → one local coordinator → verified project/current-workspace route when
named → optional typed existing Task/Mission/tool operation → canonical
source/effect/carrier evidence → duplex event projection → settled response and
later Task result claim. A non-mutating inquiry omits the operation. The browser
and provider session remain adapters.

**Principal disturbance or failure path:** A conversational message or
provisional model output is mistaken for durable work state, causing correction,
reconnect, interruption, or result settlement to target the wrong object or
duplicate an effect. A second material path is that a spoken alias or `started`
attempt is mistaken for verified project identity, Worktree, or current liveness.

**Observable signal and evidence source:** Interaction receipt/settlement and
causal references; registered project resolution and current primary/Worktree
observation; current Task/Mission revisions; Mission timeline input/turn events;
attempt start/terminal evidence kept distinct from owner-backed carrier
liveness/control; effect journal settlement or uncertainty; explicit result and
review standing.

**Control action, authority, and recovery:** The coordinator makes semantic
choices; the host validates typed structure, existence, revision, target, scope,
and authority; project-bound action waits for verified registered/current context
and exact Worktree where execution needs it; canonical owners return receipts;
reconnect rebuilds from settled communication and live owner sources. Missing
project or liveness/control evidence fails visibly, and only uncommitted work is
retried. Independent reviewers judge consequential candidate semantics; the
Principal keeps acceptance.

**Required component contributions and local owners:** Conversation mechanism
owns duplex correlation and reconstruction; the interaction journal owns only
communication facts; provider/runtime adapters own streaming and error semantics;
current policy owns DeepSeek Pro `max`; Task, Mission, authorization, effect, and
Work Cell sources retain their accepted boundaries; registered-project/current
workspace sources own routing context; the exact carrier owns liveness and
interruption/recovery; UI owns presentation and input adaptation.

**Expected work, margin, and audit signal:** Planning begins with the non-UI
vertical slice, then liveness/recovery/correction, temporary formation, and UI.
Each slice has an explicit disconfirming observation above. No token, time, or
cost estimate is introduced by this design; the planning owner must estimate the
supported work and recovery margin.

**Residual risk and who accepts it:** Natural-language intent can still be
misclassified; provider identity/effort observation may be incomplete; tool
cancellation and disconnect settlement may be ambiguous; ordinary Task liveness
has no accepted owner-backed representation yet; and project or activity
projections may lag their canonical sources. The coordinator exposes uncertainty,
the independent reviewer judges consequential semantic candidates, and only the
Principal may accept the remaining product and authority risk.

**Operational measure and reopening condition:** The representative daily-use
walkthrough must complete new-task publication, same-obligation correction,
visible ongoing work, explicit intervention, reconnect, and evidence-linked
result without duplicate authority or Codex coordination. Reopen the design if
operation requires a second task source, loses or duplicates an action after
disconnect, silently changes model/effort, guesses project/Worktree context,
presents attempt start as current liveness, conflates interruption levels, or
turns temporary contributions into a permanent organization.

## What the next reviewer must try to falsify

The fresh reviewer should compare this candidate with the named sources and
return exact findings, not redesign it. In particular, try to show that:

1. the interaction journal duplicates an existing authority or lacks Mission
   justification;
2. any material observed claim is unsupported, stale at the stated revision, or
   improperly treats the draft ACI program as accepted design;
3. the duplex lifecycle permits provisional output, stale UI state, or provider
   session memory to mutate or settle canonical work;
4. a named project can bypass registered/current-primary resolution, create an
   independent Task on resolution failure, or execute in a guessed Worktree;
5. create/correct/continue/control relies on code-level phrase matching, a
   non-mutating inquiry is forced into mutation, or semantic judgment is unowned;
6. attempt `started` can be presented as current liveness, or Task controls are
   claimed without an exact carrier that owns them;
7. response, tool, and persistent-task interruption can still be conflated;
8. temporary contributions introduce a standing committee, vote, self-review,
   or new gate;
9. DeepSeek Pro `max` leaks from current policy into reusable mechanism, silently
   downgrades, or presents requested effort as observed fact;
10. a capability slice presupposes UI, transport, schema, threshold, or runtime
   behavior not owned by the evidence; or
11. any existing project, Task, Mission, authorization, effect, Work Cell,
    verification, or Principal acceptance boundary has been weakened.

Until that independent review returns no material finding and the Principal
accepts the architecture, this System Case remains a candidate only.
