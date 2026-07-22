# Strategy Case — Supervised Live Mission MVP

**Status:** proposed
**Human mandate:** design the minimum autonomous MVP after accepting the
generative system and human-governed autonomy model.
**Decision requested:** choose the first autonomous operating boundary and
authorize only its implementation mission.
**Approver:** Principal
**Evidence cutoff:** 2026-07-20 at `main` commit `182f0c9`

## Principal Decision Brief

**Recommendation: A — implement one Flash-first, multi-Agent supervised live
Mission: a continuously steerable event session that forms, executes, verifies,
and reconstructs bounded Work Cell contributions through several replaceable
Agent roles and can produce one draft PR, but cannot merge.**

| Key | Immediate authorized result | Main tradeoff / reopening signal |
|---|---|---|
| **A — Flash-first Agent formation** | Start one human-authorized local session; use Flash-class profiles by default for reconciliation, task formation, execution, reconstruction, and independent verification; permit bounded read-only Swarms and one writable Cell at a time; escalate only a specifically unsupported operation. | Tests whether economical Agents can form a reliable system through task shaping and checks; reopen if coordination/reconstruction dominates work or repeated Flash errors escape the guards. |
| **B — single-Agent live Mission** | Keep the live event session but let one model plan, execute, and summarize each turn. | Smaller, but repeats the oversized-context and self-verification problems that Work Cell, Swarm, and task shaping were created to address. |
| **C — frontier coordinator with Flash workers** | Put a stronger model permanently above Flash Cells to plan and synthesize every Mission. | May improve some global judgments, but makes the expensive model the real system, hides whether Flash-first engineering works, and creates a central semantic dependency. |

**Your reply:** `A`, `B`, `C`, or `explain <key>`.

## Concrete situation

| Statement | Classification | Source and exact status | Verification gap |
|---|---|---|---|
| Formal project work is currently human-initiated. | fact | [Decision 015](../../decisions/015-human-initiated-formal-operations.md), approved | none for current design |
| Operational autonomy under human governance is the accepted direction, but no autonomous transition has been implemented. | fact | [Decision 043](../../decisions/043-generative-system-and-human-governed-autonomy.md), accepted design | usefulness, controllability, and recovery remain untested |
| Work Cell executes one prepared, bounded attempt and retains its evidence; orchestration can release prepared Cells and cancel active attempts. | fact | [Decision 031](../../decisions/031-extensible-work-cell-orchestration.md), implemented and verified | no durable, steerable Mission source has exercised it |
| Work Cell Swarm has deterministic 256-Cell mechanical coverage and a four-Cell live DeepSeek V4 Flash smoke, while the retained evidence explicitly does not establish collective semantic intelligence. | fact | [Decision 025](../../decisions/025-general-work-cell-swarm-runtime.md), implemented and verified | live multi-role reconstruction and verification remain unproved |
| The project defines a conservative Flash-class execution profile as the ordinary task-shaping baseline; stronger profiles are explicit escalations, not silent baseline inflation. | fact | [Decision 040](../../decisions/040-task-shaping-core-skill.md), first slice implemented | the primitive map and transformations remain provisional |
| Model routing, explicit provider preference, and matched capability evaluation exist, but one orchestration invocation currently creates the same driver shape for every lease. | fact | [Decisions 034](../../decisions/034-validation-model-routing.md), [036](../../decisions/036-provider-observation-and-explicit-preference.md), and [037](../../decisions/037-model-capability-evaluation-seed.md) | heterogeneous per-Cell execution-profile selection is an implementation gap |
| Mission Record preserves cross-session obligations but explicitly does not schedule work. | fact | [Decision 021](../../decisions/021-git-tracked-mission-continuity.md), approved for pilot | no live runtime is linked to it |
| Intervention reconciliation preserves the effect of a Principal correction, but its current binding is session-local, advisory, and not durable across a hosted Mission. | fact | [Decision 024](../../decisions/024-platform-neutral-intervention-reconciliation.md), shadow/assist implemented | no active execution has been invalidated and safely resumed from a later correction |
| A Flash-first multi-Agent formation can provide useful autonomous continuity without either one frontier “brain” or uncontrolled collective behavior. | hypothesis | proposed pilot | must compare local correctness, reconstruction, omissions, usage, latency, and human repair with a single-Agent baseline |

### What “like GPT Live” means here

The transferable idea is not speech, low audio latency, or one proprietary
model connection. It is a continuing session in which input and output are
event streams, the user may interrupt ongoing output, and history is corrected
to reflect what actually happened. OpenAI's current Realtime implementation,
for example, exposes interruption and history-update events; its ordinary
streaming agent runtime separately supports cancellation followed by resumption
from retained run state. See the official [Realtime guide](https://openai.github.io/openai-agents-python/realtime/guide/)
and [streaming interruption guide](https://openai.github.io/openai-agents-js/guides/streaming/).

Repository work has a different physical boundary: a partially generated
sentence is cheap to truncate; a partially executed command, file write, or
push is not. Therefore the MVP adopts **continuous input with safe-point
settlement**, not the false promise that arbitrary new text can safely rewrite
an already-running tool call.

## Principal contradiction and preservation case

**Principal contradiction:** the project can bound execution and preserve
obligations, but its current unit of interaction is still “receive a task, run,
return.” New human understanding arriving during work is merely another message;
it is not yet an ordered control input that can invalidate stale work, change
the active intent, and let useful autonomous work continue.

Resolving this contradiction tests more than an event trigger. It asks whether a
human can remain in a continuing relation with an executing system without
manually reconstructing every prompt, task, and handoff.

**Strongest preservation case:** ordinary Codex sessions already provide rich
interactive judgment. If a separate Mission session only duplicates chat,
creates state ceremony, or cannot react before the human would have completed
the work directly, the current human-initiated form should remain operative.

## Chosen semantic boundary

### Continuous does not mean one endless context

One Mission is long-lived; Agents and model calls are not. The system alternates
between short, reconstructible formations:

```text
human input ───────┐
human input ───────┼──► append-only Mission events ──► current intent projection
control input ─────┘                                      │
                                                          ▼
                                      form the smallest needed Agent team
                                   shape/decompose · execute · verify · rebuild
                                                          │
                                       evidence + status + proposed effect
                                                          │
                           new input? ── yes ──► reconcile before effect/next turn
                                  │
                                  no
                                  ▼
                         verify effect and continue or settle
```

The event stream is the operational source. Current intent, status, pending
work, and UI text are rebuildable projections. Each Agent receives only its
role, the accepted Mission contribution it owns, necessary source context,
incoming/outgoing relations, semantic acceptance, and the smallest flat
work-proof conditions it needs. No Agent inherits
an ever-growing hidden transcript or all sibling output by default.

### Two input planes

| Plane | Examples | Treatment |
|---|---|---|
| Natural-language contribution | correction, clarification, new evidence, question, changed preference | retain exact authorized input and source identity; the context-equipped Agent compares it with the active anchor and records its effect |
| Mechanical control | pause, resume, stop, approve an external effect | explicit CLI/API operation with actor and Mission identity; never inferred from a magic phrase |

A natural-language input is not forced into a rigid form before the human can
speak. Its reconciliation may continue the current reading, amend an invariant,
supersede the current direction, open a bounded side branch, or require a human
decision. A material correction uses the receipt shape already owned by
Decision 024. Recency alone is not authority: only an authorized Principal
input may change the envelope, and ambiguous conflict pauses for clarification.

### Safe points and stale-turn rule

The mandatory safe points are:

1. before preparing or dispatching a Cell;
2. after a Cell settles and before interpreting its result;
3. before any Git or external publication effect; and
4. before autonomously releasing the next turn.

Every turn starts at an input **watermark**. Input may arrive while the Cell is
running and is acknowledged immediately. If the watermark has advanced before
an effect or continuation, the turn is stale: its evidence remains inspectable,
but its proposed effect cannot be published until the new input is reconciled.
An explicit `pause` or `stop` also propagates cancellation to the active attempt;
already-observed evidence is retained and cancellation is not rewritten as
success.

This is a real interruption guarantee at bounded-turn/effect granularity. It is
not token-level prompt mutation. If practice later shows that one Cell is too
coarse for useful interruption latency, task shaping must make Cells smaller
before the runtime adopts a provider-specific live model connection.

## Flash-first multi-Agent formation

“Flash is the main force” is an allocation structure, not a model slogan or a
percentage target:

1. every ordinary operation is first judged against the named Flash-class
   execution profile;
2. reliable or guarded Flash primitives stay on Flash, including formation and
   verification work—not only mechanical worker tasks;
3. an oversized operation is first transformed into semantically closed,
   locally verifiable contributions with explicit coverage and reconstruction;
4. repetition, independent verification, and deliberate overlap are added when
   their expected containment value exceeds their coordination cost; and
5. only the irreducible operation that remains `unsupported-escalate` may move
   to a stronger profile or the human. The rest of the Mission remains on
   Flash.

This makes Flash structurally dominant: stronger models do not sit permanently
above the system, review every output, or define the normal task primitive.
Equally, “Flash-first” does not require wasteful decomposition when one stronger
call is demonstrably cheaper and more reliable than a large reconstruction
tree. That case is an explicit, evidence-linked escalation rather than a hidden
default.

Provider availability fallback and capability escalation are different
transitions. A `flash-main` route may fail over between providers that serve the
same admitted DeepSeek V4 Flash profile. Moving one contribution to Kimi,
Claude, GPT, or another materially different profile requires a named
capability-mismatch receipt and retained allocation decision; it cannot occur
silently because a provider returned an error. The first live pilot needs only
the Flash route. A multi-profile registry becomes justified only when a real
contribution reaches an escalation condition; deterministic fake profiles can
prove the selection seam beforehand.

### Roles are differentiated Agents, not hard-coded model classes

These names describe functions in the whole, not executable job descriptions.
Before any function becomes an Agent contribution, apply `task-shaping` against
the declared Flash reference profile. Retain the whole obligation, profile and
evidence revision, capability disposition, principal instability, local result
contract, coverage relation, reconstruction owner, and overload/repartition or
escalation signal. A role name, prompt, schema, or successful protocol
settlement does not establish a stable primitive.

| Temporary function | Task-shaped execution form | Boundary or escape |
|---|---|---|
| **Reconciliation** | a finite comparison between named new input and one source-linked active anchor, returning the supported intent delta and ambiguity | cannot silently reread the whole Mission, change the envelope, or resolve ambiguous authority; material ambiguity returns to the Principal |
| **Task formation** | the owning domain Skill forms semantic candidate units; `task-shaping` tests those operations against the Flash envelope and preserves whole coverage and reconstruction | cannot split by file count, tokens, or role label; unsupported semantic partition returns to the domain owner or escalates |
| **Local work** | one coherent contribution with bounded sources/effects, incoming/outgoing relations, local acceptance, required result shape, and a truthful overload signal | cannot choose siblings, expand scope, publish, accept itself, or hide `needs_repartition` behind nominal completion |
| **Verification** | finite claims or effects checked against named evidence and tolerance, with abstention where the packet cannot support a whole-source conclusion | cannot become “review everything,” infer absence beyond supplied evidence, or convert agreement into truth |
| **Reconstruction** | compact settlements, coverage entries, disagreements, boundary relations, and global invariants reconnected without replaying every child history | if reconstruction must reread all raw work or redo local judgments, the decomposition failed and must repartition or escalate |
| **Convening** | choose among currently admitted next transitions from a bounded Mission projection: direct work, shaped delegation, wait, request decision, effect proposal, or truthful settlement | cannot act as open-ended project manager, invent tasks outside the envelope, accept facts, select hidden provider policy, or merge |

An executable Agent is therefore the situated result of a Task Shape: one
coherent contribution plus only the selected domain Skill or method, necessary
context, bounded tools, completion contract, and admitted execution profile.
The functions above may be separate calls, or the same replaceable parent Agent
under different prepared contexts; they are not six permanent services or six
universal personas. Many Agents may use the same Flash model while remaining
meaningfully differentiated. “Multi-model” means the formation can select among
explicit, evaluated execution profiles for one bounded contribution; it does
not require every Mission to call every model.

Because comparable retained runs do not yet establish reconciliation, task
formation, verification, or reconstruction as reliable Flash primitives, the
first pilot treats their configured forms as bounded capability discovery with
guards and human supervision. It may promote a task form only through matched
evidence admitted by `model-evaluation`; it may not turn the pilot's intended
architecture into evidence that Flash already supports every role.

Agents exchange source-linked artifacts, coverage entries, and typed
settlements through the Mission adapter. The first slice has no free-form
Agent-to-Agent chat, shared hidden memory, self-created roles, or majority vote.
These would increase coordination volume without preserving why one contribution
should change the whole.

### Decomposition judgment and delegation mechanism

The Task-former Agent decides **whether and how** to divide the work. It applies
the owning domain Skill and `task-shaping` to the actual whole; direct execution
remains valid when decomposition removes no observed instability. A generic
`subagent` or `swarm` tool cannot infer semantic boundaries from file counts,
token quotas, or prompt text.

The runtime nevertheless must give that Agent an economical way to act on its
judgment. The implementation comparison in
[Agent Delegation and Dynamic Workflow Forms](../../research/agent-delegation-and-dynamic-workflows.md)
separates three often-confused mechanisms: an Agent called as a tool returns a
bounded result to its parent; a handoff changes the active conversational
Agent; and a dynamic workflow or team coordinates several calls through code or
shared state. This Mission needs the first form now. The latter two solve
different, later problems.

The convergent implementation pattern is therefore **Agent-as-tool first**.
Expose one ordinary project-facing **`delegate` tool** to the Mission convener.
One call carries one prepared contribution; several calls emitted in one model
step may be dispatched concurrently after common admission. The runtime groups
an accepted independent call batch into a bounded Swarm execution and retains a
formation projection, but the Flash Agent does not generate the core Swarm
manifest:

```text
Task-former Agent
  ├── delegate { contribution key, task, obligation/source refs,
  │              local acceptance, bounded capability need }
  ├── delegate { ... }   # optional same-step parallel call
  └── delegate { ... }
                  │
                  ▼
Mission adapter validates the batch against the whole and policy
                  │
                  ▼
one unit → direct Work Cell
independent units → bounded Swarm
later dependent units → named queue/graph adapter, not inferred by the kernel
```

The Agent receives compact settlement/artifact references for each call so it
can reconstruct, ask another question, or make a later delegation in the same
Mission turn. **Formation is the semantic projection retained from the common
whole plus one model-step's accepted delegation calls and their lowering; it is
not a second command or model-authored pre-execution manifest.** The adapter
rejects an apparently parallel batch whose units declare unresolved mutual
dependencies, duplicate ownership, invalid references, or work outside the
active envelope. Frozen obligations not yet assigned remain explicit in the
coverage projection; they block reconstruction, writable effect, and Mission
completion, but do not force the Agent to predict every later contribution
before a useful first delegation.

The Mission adapter admits only a contribution whose current Task Shape supports
direct or guarded execution, or whose declared transformation has produced a
locally closed unit. `unsupported-escalate` never lowers into an ordinary Flash
Cell merely because the Agent emitted a valid `delegate` call. The exact
runtime representation of that evidence is an implementation decision; it must
not make the model repeat the full Task Shape inside every tool input.

The `delegate` schema is model-visible but does not use an immediate per-call
tool executor. A small Mission-owned AI SDK Core loop first receives the whole
tool-call step, validates and records it atomically, then dispatches zero, one,
or several accepted Cells and appends compact tool results for the next model
step. Thus the `delegate` calls themselves are the submission boundary; a
second `submit_formation` tool would only duplicate the same decision. This
explicit step boundary is required because an ordinary nested-Agent tool
executor may begin each call before the Mission has validated common scope,
relations, and ownership.

The model-visible input is deliberately not `CellInput` or `SwarmInput`. It
contains only one contribution's semantic task, stable local key, source and
obligation references, local acceptance, and a bounded capability need. Mission
policy supplies the flat work-proof conditions and bounds concurrency,
workspace root, permissions, provider routes, estimates, output locations,
generated identities, and reconstruction ownership. The adapter lowers one
accepted call to `CellInput`; a same-step independent call batch lowers to
`SwarmInput`. If the tool grows until the Agent must provide the full runtime
manifest, the boundary has failed.

A worker that discovers overload may return `needs_repartition` with evidence,
but cannot spawn descendants. The next replaceable Task-former may reshape only
that failed region and issue a later bounded delegation batch. This keeps
dynamic division possible without granting every Cell an unbounded sub-Agent
tool.

Native Codex/Claude/Cursor sub-Agent tools may carry prepared units during an
ordinary supervised coding session, but they are host bindings, not the
autonomous system's source of task meaning. The autonomous MVP uses Work Cell
orchestration because it supplies stable model selection, cancellation,
workspace bounds, settlements, and comparable evidence. A future carrier may
replace it only if it preserves the same formation and settlement contract.

The selected form is therefore a stack, not a new decomposition Skill:
domain Skills own the semantic cut, `task-shaping` owns Flash-relative
transformation and reconstruction constraints, the Task-former Agent makes the
situated judgment, `delegate` makes one contribution actionable, and the
adapter plus Work Cell orchestration enforce and execute the resulting batch.
None can truthfully replace the others. `swarm` remains a runtime and
observability term for concurrent settled Cells, not an additional model tool.

A later `Workflow`-like tool is justified only when a retained case shows that
the number or inputs of later delegations must depend programmatically on
earlier results. Its code must run in an allowlisted sandbox, reach only Agent
tools, inherit cancellation and event lineage, and have a bounded call count.
Free-form peer messaging remains outside the MVP. A small host-owned Task system
is now inside it because centralized reconstruction needs durable IDs,
dependencies, ownership, and bounded tool authority; this is coordination state,
not a free-form Agent society or semantic acceptance source.

### Seeded work and truthful closure

A Mission may begin with prepared tasks, and a Task-former may add bounded work
under the current envelope before or during execution. Those tasks are useful
as a work source and attention scaffold, but **“all tasks completed” is not
the semantic completion condition**. A task is a proposed means; the accepted
Mission obligations and effect criteria are the durable reason work must exist.
The full task set remains in the Mission control plane; each Cell receives only
its own task, necessary relations and sources, semantic acceptance, and the
flat work-proof conditions it actually needs. A Cell-local projection of the
same Task kernel is an economical attention aid and process-evidence contribution
to work proof, not a semantic completion authority or a second Mission task source.

```text
accepted envelope + frozen obligations       source of required closure
                  │
                  ▼
prepared Task view                           rebuildable work projection
                  │
                  ▼
delegate calls → leases → settlements        execution evidence
                  │
                  ▼
verified obligation dispositions             closure evidence
```

For one fixed Swarm, a closed and drained source means only that every admitted
Cell has settled mechanically. For the continuing Mission, completion additionally
requires that every required obligation has an accepted evidence-linked
disposition, no input after the current watermark awaits reconciliation, no
attempt or writable effect remains live, final verification passes, and no
named human gate remains. An outstanding required obligation prevents closure
even if the task list is empty; a replaced, unnecessary, or explicitly
abandoned task does not block closure when its obligation is still accounted
for.

The model may propose, split, replace, or report a task complete. It cannot make
its checkbox authoritative. The Mission controller updates the task projection
from admitted task events and settlements, and records an obligation disposition
only from designated verification under the declared acceptance authority. New
authorized input may invalidate a disposition and reopen its obligation under a
later revision. A Cell that is blocked, fails, or needs repartition must still
be able to settle truthfully; requiring success for every pre-seeded task would
create an endless or dishonest loop.

The convener's loop therefore ends only through a terminal disposition checked
by the controller. The exact tool name and schema belong to the Mission runtime,
but its completion branch must evaluate the closure properties above; its
continue, wait, blocked, and effect-proposal branches must preserve outstanding
work rather than pretending that absence of another `delegate` call means done.

## Authority and continuation

One initial human approval authorizes a finite Mission outcome and its effect
envelope, not merely one model call. Inside that envelope, a temporary Mission
convener may form and release the next direct Cell or bounded set of prepared
Cells when all of these are true:

1. the accepted outcome remains incomplete;
2. the next step is traceable to the accepted envelope and current intent;
3. its reads, writes, tools, and external effects fit the declared bounds;
4. the previous attempt produced a settled record and required verification;
5. no input after the current watermark remains unreconciled; and
6. no named human gate or material ambiguity has been reached.

The convener is a replaceable role reconstructed each turn, not a resident
sovereign Agent. Domain Skills own semantic cuts; `task-shaping` owns the
Flash-relative envelope and transformation; the Mission adapter constructs and
validates prepared work, execution-profile references, coverage relations, and
provenance. Work Cell and the orchestration kernel remain generic; neither
learns Mission, conversation, GitHub, governance, or role vocabulary.

The MVP may run a bounded read-only Flash Swarm but runs at most one writable
Cell at a time. It has no automatic semantic retry: protocol/provider failure
pauses truthfully, while repetition for verification is separately prepared and
visible. Token values remain estimates for post-run audit under [Decision 014](../../decisions/014-work-estimation-and-calibrated-budgeting.md),
with the provider context boundary and a high human-approved runaway safety
ceiling serving as controls rather than pretending the forecast is exact.

The current orchestration kernel receives one driver factory for an invocation.
The smallest multi-model extension is a generic lease-aware driver resolver:
the Mission adapter assigns a validated execution-profile reference to prepared
work, and the runner resolves a fresh driver for that lease. Model/provider
identity remains outside `CellInput` task semantics and does not enter the
orchestration kernel as a hard-coded route. Until that mechanism is proved, the
adapter may execute separate homogeneous invocations per profile; it must not
claim heterogeneous Swarm support.

## Source, state, and recovery

| Concern | Owning source | Rebuildable projection |
|---|---|---|
| accepted purpose, scope, effects, and human gates | versioned Mission envelope approved by the Principal | current intent |
| continuing external input | append-only authorized input/control events with source identity and payload digest | unread inputs and watermark |
| interpretation change | reconciliation receipt linked to input event IDs | active anchor and changed surfaces |
| task formation and whole coverage | prepared-unit records with source revision, obligations, relations, and reconstruction owner | queue, readiness, and coverage views |
| task progression | admitted task events plus Work Cell settlements | pending, active, blocked, owned, and completed views |
| semantic closure | verified evidence-linked disposition of accepted obligations | completion readiness and remaining-work views |
| execution-profile choice | human-confirmed provider profiles plus admitted capability evidence and a per-contribution allocation receipt | current model route and escalation summary |
| execution fact | Work Cell attempt and settlement records | progress and usage summaries |
| repository effect | isolated worktree, branch, diff, CI, and at most one draft PR | current candidate summary |
| unresolved cross-session obligation | existing Git-tracked Mission Record | active-task view |
| accepted result | ordinary Principal disposition and Git history | completion status |

The first carrier is local and relocatable: an explicitly started Mission has a
background-capable supervisor/runner using a linked family of append-only
timelines under `ATTHIS_HOME`. The runner may detach so work, input ingestion,
and cancellation remain live after the initiating coding-agent turn returns;
it exits when the Mission settles or when its carrier is explicitly shut down.
This is a Mission-scoped execution host, not a permanently auto-started global
Agent or a new source of project truth. A small CLI projects start, status,
input, and control operations without making its status view authoritative.

Every delegated child owns a separate timeline linked by parent timeline ID,
batch ID, and call ID. The parent retains intent, formation, child references,
and barrier state; it does not absorb every child's execution history.
Sensitive/high-frequency dialogue does not enter Git automatically. Active
timelines under `ATTHIS_HOME/missions/` are created only by explicit Mission
start, have a declared retention/closure action, and do not turn ordinary
coding-agent transcripts into Atthis memory. At material safe points the
existing Mission Record retains only current focus and open return obligations,
not a duplicate transcript.

### Background carrier form

The selected form stack is:

1. a **runtime capability** owns background execution, safe-point input
   ingestion, cancellation propagation, and recovery observations;
2. append-only Mission and child events remain the durable operational source;
3. a **CLI projection** lets a human or coding Agent start and inspect the
   runner and submit explicit Mission controls; and
4. skills continue to prepare semantic judgments and tasks but own no process,
   Mission state, or lifecycle authority.

Process lifecycle and Mission lifecycle are distinct control planes. Stopping
the runner means “cease hosting work and leave recoverable state”; it must not
fabricate a semantic Mission stop. Mission `pause`, `resume`, and `stop` are
authorized durable control events with actor and Mission identity. A Mission
stop prevents later dispatch and cancels the active attempt; a runner restart
rebuilds from recorded state and never silently converts an interrupted attempt
into success or replays an effect.

A foreground-only session is no longer sufficient once delegation is
asynchronous and input may arrive from another turn. A permanently resident
global daemon is also not justified: process uptime is not semantic continuity,
and permanent residence adds credential, upgrade, multi-Mission, and stale
process burdens before evidence requires them. The minimum valid first carrier
is therefore an on-demand, background-capable Mission runner. Whether the local
implementation uses one operating-system process per active Mission or one
supervisor process for several Missions remains an implementation-owned choice;
the acceptance boundary does not depend on that topology.

The form is defeated if any of these observations occurs:

- the initiating CLI must remain attached for work to continue;
- another process cannot submit and observe a control while work is active;
- runner shutdown and Mission stop become indistinguishable;
- restart duplicates an effect, loses an acknowledged event, or resumes an
  unsettled attempt as though it had completed; or
- a status/PID file becomes authoritative over the event stream.

### Background carrier implementation checkpoint

The first verified slice now implements one on-demand process per Mission. A
short Unix-domain socket is only the live command carrier; the runner is the
sole writer for that Mission timeline and acknowledges an input only after its
event has been appended and synced. `runner-status.json` is written atomically
as a disposable projection. Restart derives `running`, `input-pending`,
`paused`, or terminal Mission state from the event stream rather than trusting
the previous status file.

The CLI currently exposes `runner start`, `runner status`, `runner shutdown`,
`mission input`, and `mission control`. A cross-process lifecycle test proves
durable input acknowledgement and idempotent replay, runner shutdown without a
Mission-stop event, reconstruction after two runner restarts, persistence of a
pause, and terminal Mission stop. A detached CLI smoke run separately proves
that the initiating process can exit while a later process submits input and
reads status.

The carrier retains append-only JSONL as the current event source rather than
introducing SQLite. Under the present one-runner-per-Mission single-writer
boundary, SQLite would add schema migration, database placement, locking, and
backup decisions without improving semantic recovery. A `turn-started` event
without its linked settlement is already a sufficient interrupted-attempt
signal. SQLite becomes a justified candidate when several processes must
transactionally claim shared work, cross-Mission query volume becomes an
observed bottleneck, or one global scheduler needs atomic leases. It should
first be evaluated as a rebuildable index or scheduling projection; convenience
alone does not promote it over the event stream as fact authority. Because an
acknowledged event always ends in a synced newline, recovery discards and then
truncates only an unterminated final fragment before the next mutation; invalid
JSON in any completed line still fails closed. This covers the relevant
single-writer crash tear without pretending arbitrary corruption is safe.

At this checkpoint the carrier boundary alone did **not** keep a model/Agent
loop executing when launched through the ordinary CLI, recover an interrupted
Cell, run several Missions, schedule work, or bind external events.

The next local slice now connects an injected Mission execution controller to
the runner without transferring event ownership. The runner first fsyncs an
input, then passes its receipt to the live supervisor; a small execution pump
advances the parent, parks without holding a model request open, wakes on either
the child barrier or new input, and resumes only through the supervisor gate.
Pause, stop, process signal, and runner shutdown cancel both the parked child
handle and the caller-supplied parent-turn abort path. A monotonic wake version
prevents an input arriving between one ready barrier and the next park from
being lost.

A socket-level deterministic integration uses the real AI SDK ToolLoopAgent,
two blocked Work Cells, the file timeline, supervisor, and runner together. It
shows that a source-linked correction is acknowledged from durable storage,
wakes the parked turn, preserves eventual child evidence, and prevents the
parent model's stale second call. This proves the local safe-point relation but
not autonomous model behavior.

The following recovery slice now brackets an injected execution with a
source-linked `mission.turn-started` event and one compact
`mission.turn-settled` event for `finished`, `input-pending`, or `failed`.
Settlements retain the baseline, result/withholding facts, usage, input links,
and active batch reference without copying child histories into the parent.
Exact settlement replay is idempotent; conflicts fail closed. A replacement
carrier that finds a start without settlement refuses both same-turn replay and
a fresh turn, leaving explicit recovery to a later authority-bearing action.
Carrier shutdown itself writes no semantic settlement, so interruption remains
distinguishable from Mission stop or successful return. Process uptime still
cannot be treated as semantic progress.

After a crash, the supervisor rebuilds the projection from the envelope,
parent/child timelines, Cell records, and repository state. A parent batch
cannot resume while any linked child timeline lacks a settlement. An attempt
with no settlement is marked interrupted and is never silently replayed. The
Principal may resume, replace, or abandon it.

The detached carrier now has one deliberately narrow runtime seam. An operator
may start it with `runner start <mission-id> --runtime <module-path>`. The
explicitly trusted local module exports `createMissionRuntime(context)` and
assembles project strategy, model, tools, one source-linked turn start, and its
execution controller from the runner-owned timeline. The module path is an
operational startup parameter: it is neither model-authored Mission input nor a
plugin registry, and credentials or arbitrary callbacks are not serialized
into Mission JSON. If a runner is already live, the CLI refuses to attach a
different runtime silently.

A cross-process deterministic fixture proves module loading, runner-owned
timeline injection, turn start, execution pumping, durable settlement, and
later shutdown. It does not establish Flash prompting quality or production
policy correctness.

The next recovery slice adds an explicit `mission recover` command over the
per-user Mission socket and retains one structured `mission.turn-recovered`
event with recovery ID plus actor and source references. `resume` requires the
trusted runtime adapter to reconstruct exactly the interrupted turn identity;
`replace` terminates the old attempt and embeds a different replacement turn
start in the same event, so a crash cannot expose a half-committed transition;
`abandon` terminates only the attempt and needs no runtime module. None is
inferred from model text or process restart. Unreconciled input prevents every
recovery disposition, stale results cannot settle a replaced or abandoned
turn, exact command replay is idempotent, and a conflicting use of the same
recovery ID fails closed. An accepted recovery event followed by another crash
remains visibly interrupted rather than silently replaying execution.

Deterministic timeline, cross-process runner, and ordinary CLI probes establish
these mechanics. A later [low-consequence live probe](../../../regeneration/evaluations/2026-07-21-flash-readonly-mission-runtime-probe.md)
loaded one trusted detached runtime, used a real OpenCode Go DeepSeek V4 Flash
parent to delegate one host-frozen contribution, settled a real read-only Flash
Cell, resumed at the durable barrier, and retained exact output, read trace,
route, effect-diff, and usage evidence across separate Mission, parent, and
child timelines. The host rejected any semantic delta from its one authorized
call. This supports the integration mechanism, not autonomous project judgment,
a generally reliable Flash envelope, or safe writable effects. The next
evidence step was one real external input crossing a live safe point followed
by explicit reconciliation and a replacement read-only turn.

That [follow-up live probe](../../../regeneration/evaluations/2026-07-21-live-mission-input-reconciliation-probe.md)
seeded one authorized initial anchor, bound both turn starts to active-anchor
digests, injected input while the first real Flash parent/child attempt was
running, withheld the stale parent at its delegated-batch checkpoint, and used
distinct real Flash proposer and verifier Cells before an authority-bearing
runner commit advanced the watermark. The runner then started a fresh
anchor-bound turn and completed the same source-grounded read-only operation.
The probe also exposed and corrected a usage-audit gap: cumulative parent-model
usage is now retained in the durable pre-dispatch checkpoint, so stale work is
visible as cost even though it cannot resume. This supports the external-input
control mechanism, not automatic semantic authority, writable effects, or a
general reliability claim.

The next [queue and carrier-recovery probe](../../../regeneration/evaluations/2026-07-21-live-mission-queue-recovery-probe.md)
retained two live inputs through three detached carrier processes. It stayed
`input-pending` after the first commit and across another restart, then started
exactly one successor turn at baseline 2 after the second verified commit. The
first successful ordering run also revealed that verifiers could rewrite a
`continue` anchor with redundant watermark prose. The corrected tool surface
lets `verify_continue` verify preserved constraints without proposing a new
statement; only `verify_correction` may do so, and the host commit gate rejects
continue-statement drift independently. A post-correction live run retained the
exact same statement across both reconciliations. This supports graceful
carrier replacement with an ordered read-only backlog, not ungraceful crash
recovery or writable effects. The next safety slice should retain and verify a
proposed effect without yet granting write or publication authority.

A later GitHub Issue/comment binding can implement the same event contract;
GitHub is not part of portable Work Cell input.

## Minimum operating loop

```text
authorize finite Mission envelope
        ↓
open Mission + background-capable supervisor and parent timeline
        ↓
ingest and acknowledge all events through watermark N
        ↓
Flash reconcile current intent and return a visible status
        ↓
shape against Flash envelope + freeze whole obligations
        ↓
form direct Cell or read-only Swarm → execute Flash Cells
        ↓
independent verification → reconstruct coverage and proposed effect
        ↓
settle all evidence; ingest events through watermark M
        ↓
M > N? ─ yes ─► withhold stale effect → reconcile → fresh turn
   │
   no
   ▼
deterministic host checks → one writable Cell/effect adapter → draft PR
        ↓
mission complete? ─ no ─► authorize next turn inside same envelope
        │
        yes / human gate / pause / failure
        ▼
return inspectable state to Principal for settlement
```

The human-facing stream should expose a small stable vocabulary—`received`,
`reconciling`, `working`, `effect withheld`, `waiting`, `paused`, `settled`—and
the active intent in plain language. It should update one status surface rather
than emit a new verbose report for every event.

## Alternatives

| Alternative | Capability cost | Evidence gained | Defeating condition |
|---|---|---|---|
| **A. Flash-first multi-Agent live Mission** | Mission event/session boundary, task formation and coverage records, bounded Swarm/direct execution, lease-aware driver resolution, reconstruction, and recovery tests | continuous steering plus evidence that economical differentiated Agents can advance and verify a whole | correction is lost, stale work publishes, reconstruction is unstable, or coordination costs exceed the saved frontier/human work |
| **B. Single-Agent live Mission** | Mission event/session boundary and one recurring Agent loop | continuous steering with less orchestration | one Agent misses cross-cutting obligations, self-verifies, or accumulates context beyond its stable scale |
| **C. Frontier-led hierarchy** | permanent stronger coordinator plus Flash worker pool and its provider dependency | potentially stronger global planning with cheap local execution | frontier usage/centrality remains load-bearing or its judgments still require the same independent reconstruction and verification |

## Rolling horizons

### Long direction

- A person and an agent-composed system share a continuous, inspectable control
  relation: either may produce observations while the system works, and the
  person retains purpose, interruption, acceptance, and exit authority.
- Sessions, models, and agents are replaceable; sources, effects, authority, and
  recovery survive their replacement.
- Economical Flash-class profiles remain the normal productive base; stronger
  profiles are scarce specialists selected by evidence, not permanent rulers.
- Reopen the direction if users cannot tell what the system currently believes,
  cannot stop effects in time, or must understand internal machinery merely to
  correct it.

### Medium capability hypotheses

| Capability | Evidence needed before expansion | Later use |
|---|---|---|
| turn-level live control | corrections at every safe-point timing are acknowledged and change/withhold the right work | GitHub comments, web UI, scheduled/event inputs |
| Flash-first formation | differentiated Flash Agents cover, execute, verify, and reconstruct a real whole with less human/frontier repair than the single-Agent baseline | ordinary autonomous development and cognition missions |
| bounded autonomous continuation | several useful formations advance one outcome without each becoming a new approval ritual | longer development and cognition missions |
| recoverable session state | kill/restart produces the same intent, obligations, and no duplicate effect | hosted or cross-device operation |
| compact context reconstruction | later turns remain grounded without replaying the entire transcript | long-lived missions and multi-project workbench |
| selective model escalation | an admitted capability mismatch routes only the unsupported contribution while retaining Flash work and route evidence | heterogeneous model allocation without a frontier bottleneck |

### First implementation and live pilot

1. Implement the local event/session boundary, prepared formation/coverage
   record, and lease-aware driver-resolution seam without adding Mission or role
   vocabulary to `CellInput` or orchestration.
2. Prove with deterministic fake drivers that one turn can release a small
   read-only differentiated formation, retain every settlement, reconstruct the
   whole, and allow only one separately verified writable effect.
3. Shape each function required by the first pilot against the declared
   DeepSeek V4 Flash execution profile and run bounded matched capability
   probes. Admit only the resulting direct or guarded forms; transform,
   repartition, or escalate unsupported operations rather than promoting them
   by title.
4. Run one low-consequence documentation Mission in this repository, using
   DeepSeek V4 Flash for all ordinary Agent roles. Allow the Principal to
   clarify before dispatch, correct while Cells run, redirect after settlement,
   pause/resume, and accept or reject the resulting draft PR.
5. Compare coverage, omissions, reconstruction repair, usage, latency, and
   supervision with a matched single-Flash-Agent run. Do not add a frontier
   profile unless the retained case reaches a named escalation condition.

### Local implementation checkpoint

The first bounded slice now implements the pre-dispatch contribution boundary
and an explicit AI SDK Core delegation loop in
[`operations/autonomy/`](../../../operations/autonomy/). A host-prepared
contribution retains its Task Shape reference, capability evidence status,
disposition, local Cell contract, coverage, reconstruction owner, and overload
route. The adapter validates the complete same-step batch before creating any
driver, rejects unfinished transformation or escalation, binds Cells to the
frozen profile, guards, read-only workspace, and flat work-proof conditions,
preserves uncovered obligations, and lowers one admitted unit to direct Cell
execution or several independent units to the existing Swarm.

The model-facing `delegate` tool carries only the contribution's stable key,
task, source and obligation references, local acceptance, and bounded capability
need. Host preparation supplies Task Shape, work-proof conditions,
workspace, execution profile, dependency state, and Cell material. One explicit
model step collects every same-response call before admission. After admission,
the host records the admitted batch, assistant response messages, whole
revision, and call-ID-to-child-timeline links on the parent before any driver
may start; a failed parent checkpoint prevents all dispatch. Each child records
its own opening, dispatch, full execution evidence, and settlement. Only after
every linked child timeline settles does the parent append one ready barrier
and receive compact settlement and artifact references. A loop return remains
distinct from Mission completion or semantic acceptance. The adapter names obligations not
owned by an admitted call `unassigned` and obligations not yet covered by a
successfully settled contribution `uncovered`; neither projection claims that
a worker has verified or closed the Mission obligation.

The deterministic probes in
[`delegate-admission.test.ts`](../../../operations/autonomy/test/delegate-admission.test.ts)
and [`delegate-loop.test.ts`](../../../operations/autonomy/test/delegate-loop.test.ts)
show that a role label cannot admit an unsupported contribution, one bad
contribution prevents every sibling from starting, one call lowers directly,
several calls lower through Swarm, a failed parent checkpoint starts no driver,
parent and child histories remain separate, an incomplete child set cannot
resume the parent, exact replays are idempotent, conflicting settlements fail
closed, and a truthful `needs_repartition` result stops continuation while
preserving its obligation. The local file carrier fsyncs each timeline event and
can reconstruct a prepared or fully settled batch. It deliberately does not yet
claim cross-process writer coordination or durable per-Cell settlement while an
in-process Swarm handle is still running.

The next local slice adds asynchronous lifecycle without changing semantic
authority. Generic `startSwarm` returns a cancellable in-process settlement
handle, while `runSwarm` remains the blocking convenience projection.
Mission-owned `startDelegateBatch` writes and dispatches the parent/child
timeline formation, starts execution, and returns a parked handle before the
children settle. `DelegateLoopSession.advance()` exposes that parked transition
without keeping a model call open; `resume()` admits child results into the
parent context only after the timeline barrier is ready. The existing
`runDelegateLoop` awaits those transitions only as a deterministic convenience
harness. This proves that a supervisor need not block on the batch, but does not
yet implement process-independent workers or per-Cell timeline settlement
before the whole in-process Swarm promise returns.

The following local slice adds the first Mission supervisor gate. Exact
source-linked contribution and mechanical-control inputs are retained on the
parent timeline with idempotent, monotonic input watermarks. A supervisor is
constructed from an explicit **reconciled watermark**; it never treats the
latest received watermark as understood merely because it is newer. If input
advances while a parent turn or delegated batch is active, the supervisor
returns `input-pending` and does not call the parent's `resume`, so a successful
stale child result cannot silently continue the model loop. A newly observed
`pause` or `stop` also cancels the active in-process handle once while retaining
its eventual evidence.

The supervisor gate alone does **not** interpret or reconcile natural-language input,
advance the reconciled watermark, atomically fence cross-process input append
against child dispatch, recover an in-memory parent model session after restart,
perform reconstruction judgment, gate writable effects, establish semantic
closure, or supply live Flash capability evidence. Those remain later slices
and must not be inferred from this structural result.

The first reconciliation slice keeps the operation inside the ordinary Work
Cell harness rather than calling a model generator directly. It supplies one
source-linked active anchor and exactly the next contribution as the only
context, grants no repository read, command, or write scope, and requires the
Agent loop to finish through exactly one caller-defined disposition tool:
`submit_continue`, `submit_correction`, or `request_decision`. Tool selection
is the disposition, so each model-facing input schema contains only its own
branch while the retained payload is still validated against the strict
internal `continue`, `correction`, or `decision-required` union. A proposal
cannot advance Mission state: the
parent timeline accepts it only with a separately identified verifier,
evidence references, and a next active anchor at exactly the next watermark.
`decision-required` remains uncommittable until the Principal resolves it.
The first held-out live probe produced six mechanically valid and semantically
matched proposals across the three dispositions through an explicit
OpenCode Go DeepSeek V4 Flash route, with no fallback, recovery, or unavailable
read-tool call. This supports one low-consequence Mission trial; it remains a
probe rather than an admitted general capability because the cases were small
synthetic projections, not independently accepted production inputs. See the
[probe record](../../../regeneration/evaluations/2026-07-20-mission-reconciliation-flash-probe.md).

The next guarded slice makes independent verification load-bearing. A verifier
receives only the exact anchor, input, and proposal—not the proposer's reasoning
or wider Mission history—and must choose `verify_transition`,
`verify_decision_required`, or `reject_proposal`. It can submit a checked
next-anchor statement but cannot mutate the timeline. A reconciliation commit
now carries the complete structured verification, proposal and verifier run
links, both evidence references, a separate authority reference, and a next
anchor whose statement must exactly match the verified statement. A fabricated
verifier label, reused proposal run, mismatched proposal digest, missing run
evidence, rejected verdict, or model-proposed state transition cannot advance
the watermark.

The first low-consequence live Mission treated the Principal's next `继续` as a
source-linked input. The proposer returned `continue`; a separate verifier
confirmed the branch and preserved the four active constraints. Both Cells
settled with one terminal call, using 3,978 total tokens. The trial remains
uncommitted so the model pair cannot turn its agreement into Mission authority;
the Principal is the next acceptance gate.

The delegate convener now uses a `ToolLoopAgent` carrier without giving
`delegate` or `delegate_file` direct executors. Host-scoped preparation tools
may run in earlier steps, but a final step must contain only delegate calls; the
carrier then returns that complete step for admission before any child driver
exists. The same loop exposes the host-owned Task kernel: the convener may
create/read/update tasks, every delegate call must bind one existing unblocked
task by `taskId`, and the pre-dispatch checkpoint retains the bound task state.
Child settlement advances that process state but does not prove correctness;
the final Task snapshot is retained with the durable Mission turn settlement.
An optional file writer lets the convener persist a large ordinary
`DelegateCall` and later submit only its path and digest. Completed write inputs
are compacted before the next model step and before parent response messages
are checkpointed, while the file, digest, admitted call, and child timeline
retain the execution evidence. This closes the direct-generation exception
without moving Mission semantics or workspace authority into Work Cell core.
Two low-cost OpenCode Go DeepSeek V4 Flash runs followed the instructed
`write_file → delegate_file` sequence without fallback; the corrected
measurement found no exact packet copy in retained parent messages. This is
guarded discovery evidence for the carrier, not admission of autonomous
decomposition or general stability; see the
[delegate-file Flash probe](../../../regeneration/evaluations/2026-07-20-delegate-file-flash-probe.md).

## Minimum implementation shape

- `operations/autonomy/` owns the project-specific Mission envelope and policy,
  including allowed effect classes and human gates.
- A small project-local TypeScript adapter owns linked append-only parent/child
  timelines, input watermarks, formation and coverage records,
  reconciliation/continuation decisions, admitted task events and closure
  evaluation, the explicit AI SDK Core step loop, recovery, and the visible
  status projection.
- The Mission convener receives one concise ordinary `delegate` tool. Its
  adapter validates one call or a same-step call batch against the frozen
  whole, retains the formation projection, lowers accepted calls into exact
  `CellInput`/orchestration records, and returns compact settlement/artifact
  references rather than all child context.
- The Work Cell package supplies unchanged atomic execution, settlement,
  cancellation, and orchestration semantics. Its driver factory may become
  lease-aware so a caller can resolve an already-selected execution profile;
  profile policy remains external.
- Domain Skills and task shaping prepare differentiated contributions; the
  runtime does not infer roles, splits, stability, or escalation from prompt
  text. Role labels remain projections over prepared Agent configurations, not
  runtime classes.
- Existing Mission Record retains material open obligations at session safe
  points; intervention reconciliation supplies the material-correction receipt.
- Git/worktree/PR code remains a separate effect adapter with no model
  credential. The model never commits, pushes, merges, changes doctrine, or
  expands its envelope.

If implementation requires conversation/role fields in `CellInput`, Mission
semantics or provider policy in the orchestration kernel, transcript text in a
Mission Record, a permanent manager process, or a stronger model that silently
reviews every Flash result, the boundary has failed and must return for review.

## Verification and disconfirmation

Deterministic probes must prove:

1. input appended before dispatch is present in the prepared formation;
2. input appended during blocked fake Cells advances the watermark, leaves
   every attempt's evidence intact, and prevents their stale effect from
   publication;
3. a material correction yields a linked reconciliation receipt before the next
   mutation, while an ordinary message does not fabricate one;
4. explicit pause/stop cancels active execution, prevents new dispatch, and
   survives restart without being inferred from natural-language phrases;
5. crash/restart reconstructs the same envelope, event order, current intent,
   coverage, open obligation, and effect state, without replaying an unsettled
   attempt;
6. a differentiated read-only formation maps every frozen obligation to a Cell
   or named reconstruction check, retains disagreements and missing evidence,
   and does not treat majority agreement as truth;
7. every executable Agent contribution names its Flash reference-profile and
   evidence status, capability disposition, local acceptance, coverage and
   reconstruction relation, and truthful overload path; a role label, valid
   schema, or protocol settlement alone cannot admit it as a stable primitive;
8. no Cell starts before the complete `delegate` tool-call step is admitted;
   one accepted call and one same-step independent call batch lower to direct
   and core Swarm execution respectively, while dependent same-step calls,
   duplicate ownership, invalid references, undeclared scope, nested spawn
   requests, and attempts to choose host-owned runtime plumbing fail before
   dispatch; unassigned obligations remain visible and prevent effect or
   completion rather than preventing every partial batch;
9. a worker's `needs_repartition` settlement does not launch descendants and
   can be reshaped by a later Task-former without rerunning passing siblings;
10. autonomous continuation releases only validated prepared work, admits at
   most one writable Cell, and stops on ambiguity, human gate, capability
   mismatch, failure, or completed acceptance;
11. two prepared Cells can select different explicit fake execution profiles
   through a generic lease-aware resolver, while replacement of their provider
   identities leaves orchestration behavior unchanged;
12. Work Cell and orchestration schemas reject Mission/session/role/control
   fields and the runtime never invents semantic decomposition;
13. model credentials and Git publication authority never coexist in one Cell;
14. one matched pilot uses Flash for all normal roles, compares it with a
    single-Flash-Agent baseline, and produces at most one draft PR plus evidence
    sufficient for a human to understand formation, coverage, escalation,
    redirection, withheld effects, and final disposition; and
15. an empty or fully checked task projection cannot close a Mission with an
    uncovered, failed, stale, or unverified required obligation; a blocked Cell
    can settle without fabricating success; and verified closure of all required
    obligations plus a drained source permits the terminal completion branch.

The hypothesis is disconfirmed if the user must wait for completion before a
correction matters; new input can race past an irreversible effect; context
reconstruction changes the mandate; Flash formation repeatedly loses global
relations, needs a stronger model for routine reconciliation, or spends more on
coordination and human repair than the single-Agent baseline; autonomous
continuation repeatedly chooses unverifiable work; or the session adds more
supervision and state maintenance than it removes.

## Minimum recommendation

- **Recommend now:** approve Alternative A and authorize only the deterministic
  local Flash-first multi-Agent implementation plus one separately gated live
  pilot.
- **Explicitly defer:** GitHub/event adapters, schedules, a web UI, true
  token-level interruption, parallel writable Cells, automatic retry,
  autonomous task discovery, multi-project operation, permanent frontier
  coordination, free-form Agent society, and automatic merge.
- **Expected design delta if the pilot passes:** Decision 015 may be narrowed
  from “every formal operation is human-started” to “every autonomous Mission
  has a human-approved envelope and remains continuously interruptible.”

## Authority and disposition

- **Proposal prepared by:** current human-authorized Codex session using
  `strategic-advisory`, `systems-engineering`, and `task-shaping`.
- **Independent verification needed:** before implementation approval, verify
  event ordering/locking, cancellation settlement, lease-aware driver
  substitution, Flash coverage/reconstruction, credential separation, and
  restart behavior against the actual repository runtime.
- **Human decision:** pending.
- **Accepted execution owner after approval:** an ordinary isolated mission
  worktree; no autonomous implementation starts from this proposed Case.
