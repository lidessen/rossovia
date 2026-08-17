# Runtime Mapping for One Main and Many Children

Read this only after the Main has formed bounded semantic contributions. It
maps one organization to the execution carriers the active harness already
owns. It does not define another lifecycle, queue, team schema, or scheduler.

## Keep the semantic topology fixed

The portable unit is a **contribution contract**:

```text
whole constraint
  -> bounded work unit + sources + environment + effects
  -> one execution owner
  -> claim + evidence + uncertainty
  -> Main reconstruction against the whole
```

The carrier input is the complete child prompt: one concrete temporary role
and purpose, the canonical portable working method, the task-specific
contribution contract, and the applicable complete worker or reviewer
contract. The first two layers shape the Agent's differentiation and method;
the carrier transports them without interpreting them as lifecycle state.

`researcher`, `implementer`, `reviewer`, and similar names are prompt context,
not runtime species. Change the task, sources, workspace, capabilities, budget,
effect boundary, or return contract to differentiate an Agent. Do not add a
role enum or team lifecycle merely because the current organization has several
purposes.

## Select the execution carrier

| Condition | Mapping | Why |
|---|---|---|
| The contribution is trivial, coupled to Main judgment, or cheaper to keep local | direct Main work | avoids coordination and reconstruction cost |
| The contribution is session-local, bounded, and does not need crash-surviving identity or recovery | native delegate | isolates attention and can reduce latency with minimal durable machinery |
| The contribution needs durable identity, exact stop, restart recovery, retained usage, or shared-Worktree effect ownership | injected sub-worker tool backed by an explicit Run | lets the Main delegate from its current Cell while the active orchestration owner retains lifecycle and evidence |
| Independent read-only inquiry can remain ephemeral while effectful work needs durable ownership | bounded hybrid | maps different contributions to their smallest truthful carriers |

Choose per contribution, not once for every task. A hybrid is valid only when
each contribution has one owner and the Main can reconstruct both evidence
forms without dispatching the same work twice.

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
   to encode `researcher`, `maker`, or `reviewer`; create one only when the
   contribution is independently managed domain work.
2. The Main Agent may itself execute inside one ordinary parent Run and Work
   Cell. Give that Cell no special team state. Through its caller-supplied tool
   surface, inject one sub-worker delegation capability only when the current
   task topology needs it.
3. Let the Main call that tool with the same complete child prompt used by a
   native delegate, including
   its temporary role and purpose, portable working method, task contract, and
   role contract. The tool adapter translates and submits that bounded request;
   Orchestration authorizes, creates, and persists one explicit child Run, then
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
semantic input must preserve the whole constraint, bounded contribution,
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
parses temporary roles or promotes the portable method into persistent state.

## Native-sub-agent mapping

When the active harness exposes session-local sub-agents:

1. Create one native child for each independently useful contribution.
2. Give it the same complete child prompt: temporary role and purpose,
   portable working method, task envelope, and applicable worker or reviewer
   contract. Do not rely on inherited conversation history as its
   specification.
3. Follow up the same child only for a named gap inside its current ownership.
   Use a fresh child for a new contribution or independent review.
4. Treat liveness, cancellation, and context inheritance as current-harness
   facts. Do not invent durable Run records to imitate a persistent runtime.
5. Reconstruct each return into the Main obligation map before using it as a
   premise or presenting the whole result.

## Portability probe

Use the same frozen fixture twice when claiming portability:

```text
Whole: one consequential change with two independent source investigations,
one effectful writer, and one fresh reviewer.

Expected semantic topology:
  investigators may run in parallel
  exactly one writer owns the shared effect
  reviewer starts only from the exact candidate
  Main synthesizes; reviewer does not accept
```

Run the same Main prompt and complete child prompts once with native delegates
and once inside a Work Cell supplied with the sub-worker tool. For each matched
contribution, retain the two complete child prompts and mechanically confirm
that they contain the same temporary role and purpose, portable working method,
task envelope, and role contract. Then have a fresh reviewer judge task fidelity,
source grounding, effect containment, evidence reconstruction, unknowns, and
the separation of producer claim, semantic review, and named acceptance; prompt
presence alone does not prove correct execution. The work-unit cuts, effect
ownership, return claims, and acceptance owner must remain equivalent. Native
child handles versus child Run IDs, progress evidence, and recovery behavior
should differ because those belong to the harness.

The probe fails if either carrier omits or rewrites the portable prompt layers,
if Work Cell gains child lifecycle, if the persistent mapping adds role types
or a second lifecycle, if the native mapping fabricates durable state, or if
either mapping gives multiple writers the same effect. Until retained evidence
exists from both carriers, describe Rossovia transfer as a forward contract or
pending probe, not observed portability.

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
