# Runtime Mapping for One Main and Many Children

Read this only after the Main has formed bounded semantic contributions. It
maps one organization to the execution carriers the active harness already
owns. It does not define another lifecycle, queue, team schema, or scheduler.

## Keep the semantic topology fixed

The portable unit is a **contribution contract**:

```text
requested overall outcome and constraints
  -> bounded work unit + sources + environment + effects
  -> one execution owner
  -> claim + evidence + uncertainty
  -> Main reconstruction against the whole
```

The carrier input is the complete receiver-facing child prompt: an optional
concrete contribution relation when it changes action, the canonical portable
method, the exact task contract, and the return contract. A title alone is not
an input layer. Differentiate an Agent with the actual object, action, sources,
environment, effects, non-goals, verification, and downstream use. The carrier
transports those semantics without interpreting them as lifecycle state or
adding a role enum.

## Select the execution carrier

| Condition | Mapping | Why |
|---|---|---|
| The contribution is trivial, coupled to Main judgment, or cheaper to keep local | direct Main work | avoids coordination and reconstruction cost |
| The contribution is session-local, bounded, and does not need crash-surviving identity or recovery | native delegate | isolates attention and can reduce latency with minimal durable machinery |
| The contribution needs durable identity, exact stop, restart recovery, retained usage, or shared-Worktree effect ownership | injected sub-worker tool backed by an explicit Run | lets the Main delegate from its current invocation while the active orchestration owner retains lifecycle and evidence |
| Independent read-only inquiry can remain ephemeral while effectful work needs durable ownership | bounded hybrid | maps different contributions to their smallest truthful carriers |

Choose per contribution, not once for every task. A hybrid is valid only when
each contribution has one owner and the Main can reconstruct both evidence
forms without dispatching the same work twice.

In the persistent mapping, a **Run** is the orchestration-owned identity and
lifecycle for one authorized execution; it matters when control or recovery
must survive the current session. A **Work Cell** is the standalone executor of
one bounded model invocation; it records that invocation but owns no child Run
lifecycle.

## Relation map

| Semantic relation | Native-delegate harness | Persistent-Run harness |
|---|---|---|
| Whole | Main's current request and frozen sources | current Principal request plus authoritative Project/Task standing |
| Child identity | one native child handle and prompt | one explicit Run ID and immutable request |
| Input | complete self-contained child prompt | the same complete child prompt passed to a sub-worker tool and lowered by its adapter into the child Run/Cell contract |
| Effects | only effects granted to that child by the current harness | exact Run capability plus the runtime's writer/effect owner |
| Progress | transient child messages or tool observations | owner-backed Run activity; unknown after lost liveness when evidence cannot reconstruct it |
| Correction | follow up the same child only for a named gap inside its existing ownership | correct the owning Task/premise; the owning Agent decides whether to request a new child Run, and Orchestration authorizes and creates it with lineage |
| Control | stop the exact native child when supported | stop the exact live Run through its lifecycle owner |
| Return | child claim plus source/effect evidence | Run outcome and execution evidence returned as a bounded claim |
| Review | a fresh non-producing child with isolated context | a separate read-only review Run or an equivalently independent native reviewer |
| Acceptance | retained by the Principal or other acceptance owner named by the whole, never Main by delegation alone | retained by the Workbench Task's named Principal acceptance owner |
| Usage | observed by the native harness at its available scope | Work Cell records per-invocation usage observations; Orchestration aggregates them across Runs |
| Budget standing | retained by the whole's named authority owner | owned by Orchestration against the authorized allocation; neither Cell nor adapter changes it |

The right column describes relations, not Rossovia command syntax. A concrete
host adapter owns only concrete protocol, command and schema translation,
external identifiers and errors, and safe transport replay semantics.
Orchestration owns Run authorization, identity, persistence, capacity,
scheduling, lifecycle control, and recovery. The owning Agent decides whether
a failed or corrected contribution warrants another attempt or new Run.

## Rossovia-class mapping

When Rossovia or another persistent runtime is already the requested owner:

1. Keep Project and Task meaning in Workbench. Do not create a child Task only
   to persist a prompt title; create one only when the contribution is
   independently managed domain work.
2. The Main Agent may itself execute inside one ordinary parent Run and Work
   Cell. Give that Cell no special team state. Through its caller-supplied tool
   surface, inject one sub-worker delegation capability only when the current
   task topology needs it.
3. Let the Main call that tool with the same complete child prompt used by a
   native delegate: any decision-relevant contribution relation, the portable
   method, exact task contract, and return contract. The tool adapter translates
   and submits that bounded request. Orchestration authorizes, creates, and
   persists one explicit child Run, then
   lowers its immutable input into a bounded Cell invocation. The capability
   returns an opaque child reference plus a compressed claim, evidence,
   uncertainty, and terminal standing. It never returns acceptance or transfers
   lifecycle ownership to the parent Cell. Progress and control, when exposed,
   address the opaque reference through the same host capability; they do not
   expose or duplicate the orchestration store.
4. Keep child lifecycle outside Work Cell. Orchestration owns child Run identity,
   start, capacity and scheduling, exact live control, terminal standing, and
   recovery. Work Cell records invocation-specific usage observations;
   Orchestration aggregates them across Runs and owns budget standing against
   the authorized allocation. The Worktree writer owner serializes shared
   effectful work; parallel read-only child Runs are not permission for parallel
   writers.
5. Let the Main reconstruct returned child evidence, decide whether another
   contribution is useful, and produce the whole's final response. Do not persist
   its temporary contribution graph as a team object by default. A producer pass
   remains a claim; semantic review and the named Principal acceptance owner
   keep their existing authority. Main synthesis never implies acceptance.
6. A correction changes the Task or Run premise. The owning Agent decides
   whether it warrants another attempt or a new child Run, then submits that
   request through the same tool adapter for Orchestration authorization. Never
   implement automatic semantic retry or silently reuse the old child Run
   identity.

The injected tool is an Integration/host capability, not a Work Cell mechanism.
Its concrete schema and command names belong to the runtime adapter, but its
semantic input must preserve the requested overall outcome, bounded contribution,
sources, environment, effects, required evidence, stop signal, and withheld
authority. A standalone Work Cell can receive another implementation of the
same capability—or no delegation tool at all—without changing Cell core.

Its smallest portable semantic contract is:

```text
delegate(complete child prompt)
  -> opaque child reference
  -> terminal standing + claim + evidence + uncertainty
```

This is one injected capability, not permission for the model to invoke a
Rossovia CLI, edit Workbench state, or construct Run records. A host may split
start, observe, and control into separate tool operations when asynchronous
execution requires it, but all operations address the same opaque child and
the adapter preserves safe transport semantics around one lifecycle owned by
Orchestration; it does not make lifecycle or retry decisions.

The neutral Work Cell tool port and the read-only Run policy remain
role-agnostic: they carry an opaque model-visible tool capability and bounded
request, not a role enum, prompt registry, or team lifecycle. The Rossovia
adapter is responsible for preserving the complete child prompt when it maps
that request to the future `sub_worker` capability. Neither neutral layer
parses contribution language or promotes the portable method into persistent
state. Runtime-specific terms stay outside the child prompt unless they change
the child's action; when one is necessary, the caller defines its object,
boundary, and immediate relevance.

## Native-sub-agent mapping

When the active harness exposes session-local sub-agents:

1. Create one native child for each independently useful contribution.
2. Give it the same complete child prompt: any decision-relevant contribution
   relation, portable method, exact task contract, and return contract. Do not
   rely on inherited conversation history as its specification.
3. Follow up the same child only for a named gap inside its current ownership.
   Use a fresh child for a new contribution or independent review.
4. Treat liveness, cancellation, and context inheritance as current-harness
   facts. Do not invent durable Run records to imitate a persistent runtime.
5. Reconstruct each return into the Main obligation map before using it as a
   premise or presenting the whole result.

## Prompt-expression and carrier-transfer probes

Keep two judgments separate. Prompt expression asks whether a receiver-specific
prompt expresses the same underlying work more effectively. Carrier transfer
asks whether one already complete prompt keeps its meaning when transported by
different harnesses.

Use this frozen task shape for either judgment:

```text
Whole: one consequential change with two independent source investigations,
one effectful writer, and one fresh reviewer.

Expected semantic topology:
  investigators may run in parallel
  exactly one writer owns the shared effect
  reviewer starts only from the exact candidate
  Main synthesizes; reviewer does not accept
```

For the **prompt-expression comparison**, hold the underlying task facts fixed:
the requested result, sources and revisions, available capabilities, read and
effect limits, preserved constraints, verification obligations, decisions kept
elsewhere, and evidence required in the return. Use one carrier. Compare the
actual earlier title/jargon/runtime-map prompt (or a faithful retained fixture)
with the complete receiver-specific candidate. The two prompts may express and
order those facts differently; do not claim their literal task-contract text is
fixed or attribute the outcome to the contribution relation alone. The claim is
limited to the complete working-environment expression. Retain both unedited
prompts and their evidence.

For the **carrier-transfer comparison**, freeze one complete candidate prompt
verbatim and send that same model-visible text through the native delegate and
the injected sub-worker. The adapter may translate transport framing, identity,
and lifecycle evidence, but must not omit, add, or rewrite prompt semantics.
Retain the exact submitted prompt and carrier evidence for both executions.

If both judgments are run as a 2x2 experiment, treat prompt expression and
carrier as independent axes. Compare earlier versus candidate expression within
each carrier, and compare the identical prompt variant across carriers. An
interaction between axes needs its own evidence; it cannot be reported as
either a prompt-only or carrier-only effect.

Before execution, give each complete prompt to a fresh Agent and ask it to
restate only the object, boundary, allowed effects, non-goals, verification, and
required return. Needing to ask what a term means is a comprehension failure;
a successful restatement proves prompt comprehension, not task correctness.
After execution, have a fresh reviewer judge task fidelity, relation to the
whole, non-goal preservation, source and check evidence, and hand-off
reconstruction. Record irrelevant prompt/output language and the number of
corrective follow-ups needed to recover those relations as two counts: noise
statements and correction turns. Keep mechanical prompt and carrier checks
separate from that semantic judgment and from named-owner acceptance.

Across carriers, the work-unit cuts, effects, return claims, and acceptance
owner must remain equivalent. Native child handles versus child Run IDs,
progress evidence, and recovery behavior should differ because those belong to
the harness. The carrier probe fails if the injected carrier omits or rewrites
the frozen prompt, if Work Cell gains child lifecycle, if the persistent mapping
adds role types or a second lifecycle, if the native mapping fabricates durable
state, or if either mapping gives multiple writers the same effect. The prompt
probe fails when the candidate loses a fixed task fact or does not improve
execution and reconstruction enough to repay its expression cost. Until each
judgment has retained evidence, describe both Rossovia carrier transfer and the
receiver-specific prompt advantage as forward contracts or pending probes, not
observed results.

## Stop and reshape

Stop the mapping when:

- the carrier choice changes the meaning or acceptance of the work unit;
- the same contribution is dispatched through native and persistent carriers;
- a persistent runtime is initialized solely to obtain parallelism;
- a native delegate is asked to provide crash recovery or durable facts it does
  not own; or
- Main must replay every child investigation to understand the result.

Return to task shaping when the semantic cut is wrong. Return to the active
runtime owner when identity, control, recovery, or effect isolation is missing.
