# 031 — Extensible Work Cell Orchestration

**Status:** implemented and verified
**Date:** 2026-07-15
**Approved by:** principal

## Concrete pressure

The generic [Work Cell core](027-general-work-cell-core-and-sequence-adapter.md)
executes one prepared, ephemeral Cell without requiring a Sequence or a domain
workflow. The [Swarm runtime](025-general-work-cell-swarm-runtime.md) has also
proved bounded concurrent release, stable input identity, sibling failure
isolation, and compact retained records for a fixed manifest.

That success exposes the next boundary. `runSwarm` currently owns its own work
cursor, worker pool, settlement loop, failure conversion, and persistence
shape. A FIFO queue, dependency graph, pipeline, or later remote worker carrier
would either copy those mechanics or add queue, priority, dependency, retry, and
lease vocabulary to `CellInput`. The first duplicates execution invariants; the
second makes a Cell responsible for relations that exist only among Cells.

The strongest keep-as-is case is to leave every execution form independent.
That remains correct for domain semantics such as deliberation and experiments,
but it is no longer sufficient for their shared execution mechanics. The
current Swarm and a queue both need bounded admission, fresh drivers, isolated
settlement, cancellation, and retained evidence; those are runtime invariants,
not domain judgments.

## Decision

Add a **Work Cell orchestration runtime** between execution-form adapters and
the unchanged Cell core:

```text
human / host / domain adapter
          │ defines already-prepared Cells and relations
          ▼
execution form: direct | swarm | queue | graph | pipeline
          │ implements a WorkSource
          ▼
orchestration kernel
  capacity · dispatch · attempt · settlement · cancellation · raw events
          │
          ▼
runCell → CellDriver → model/tools/workspace
          │
          ▼
CellRunRecord or runner error
```

The kernel owns only the mechanics common to more than one execution form. An
execution form owns which already-defined Cell becomes eligible next and what a
settlement makes eligible afterward. The kernel does not invent work, infer
dependencies, judge semantic quality, synthesize results, extend a budget, or
commit any result.

### Stable concepts

| Concept | Meaning | Authority boundary |
|---|---|---|
| **Cell** | one prepared executable contract | owns no relation to another Cell |
| **Work item** | stable caller identity plus one `CellInput` | does not imply an attempt or acceptance |
| **Lease** | one form-authorized dispatch of a work item | may authorize execution once for this live carrier; not exactly-once truth |
| **Attempt** | one invocation of `runCell` with a fresh driver | cannot accept its own result or schedule siblings |
| **Settlement** | retained attempt outcome or runner error returned to the source | may change eligibility; cannot establish semantic quality |
| **Work source** | supplies the next eligible lease and consumes settlements | owns form-specific ordering/dependency policy, not Cell execution |
| **Orchestration event** | append-only observation of dispatch and settlement transitions | raw evidence; a summary or queue view is its projection |

The minimum source protocol is deliberately smaller than a workflow DSL:

```ts
interface WorkSource {
  next(signal: AbortSignal): Promise<WorkLease | null>;
  settle(settlement: WorkSettlement): Promise<void>;
}
```

`next` may wait while an open queue is empty; it returns `null` only when that
source is closed and drained. The kernel starts no more than the caller's
declared concurrency, assigns a fresh attempt identity, executes the lease, and
returns exactly one settlement to the source for every lease it obtained.

This protocol does not promise globally exactly-once execution. A future
durable or remote source must use lease tokens, idempotency keys, expiry, and an
explicit at-least-once or at-most-once contract. The local in-process carrier
may prove exact-once dispatch only within one uninterrupted invocation.

## Execution forms

Execution forms are replaceable source implementations or adapters over them:

| Form | Eligibility rule | Settlement consequence | Result order |
|---|---|---|---|
| Direct | one supplied Cell | source drains | one result |
| Swarm | next member of a closed fixed manifest | no sibling dependency | manifest-order projection |
| Queue | next admitted item from an open bounded queue | item settles; producer may submit more until close | submission identity, not completion order |
| Graph | a node whose declared dependencies have settled under the graph policy | may release dependants or block them | node identity/topology projection |
| Pipeline / map-reduce | adapter lowers stages into a graph and artifact references | stage policy releases the next stage | adapter-defined projection |

Deliberation, experiments, voting, strategic planning, and creative research
remain domain adapters. They may use an execution form, but their roles,
schemas, tallies, treatments, and acceptance rules do not enter the
orchestration kernel.

Code-review instructions follow the same boundary. The installable
[`code-review` skill](../../skills/code-review/SKILL.md) owns how one reviewer
constructs an evidence-linked project or subsystem model, recovers an impact
field, qualifies findings, and reports residual risk. A host may apply that
unchanged method to one Cell or lower its semantic partition plan into many
prepared Cells, but the
orchestration runtime owns only release and settlement and never embeds a
reviewer role, cognitive model, risk rubric, report doctrine, or merge verdict.

In review and other large tasks, the primary value of a Swarm is scale control.
A domain method decomposes work that exceeds one Cell's supported working scale
into semantically closed, locally verifiable packets; the kernel releases those
prepared Cells under bounded resource concurrency and isolated settlement.
Independent local models may expose incompatible ownership, causal, constraint,
or change relations, but that is a secondary benefit of sound partitioning, not
a kernel guarantee or the definition of Swarm.

If the whole must be reconstructed, the caller prepares a later Cell or stage
that receives a coverage ledger and the independent records, reconnects packet
boundaries, and resolves conflicts against source evidence. The kernel neither
chooses semantic cuts, concatenates all output into one hidden context, nor
converts agreement into truth.

Dynamic expansion is allowed only through a named source or adapter that
constructs and validates a new `CellInput` and records its provenance. A model
output cannot enqueue itself merely by looking like a task proposal.

## State, durability, and projections

The first kernel is in-process and ephemeral. It retains work-item identity,
attempt identity, timestamps, settlements, and raw lifecycle events for the
invocation. Existing `CellRunRecord` values remain the sources for Cell
execution facts.

A future durable queue is a separate carrier over the same protocol. Its
append-only submission, lease, settlement, cancellation, and close events
become the source of queue liveness; pending lists, dashboards, aggregate
usage, graph readiness, and CLI status are rebuildable projections. A database,
daemon, GitHub trigger, or hosted queue is not required by this decision and
cannot silently gain permission to start, accept, or merge work.

Large outputs cross orchestration boundaries by artifact reference, hash, and
small typed summaries. A source may load a full child record when its policy
actually needs it, but the kernel never concatenates all child output into a
shared model context.

## Failure, retry, and resource boundaries

- Every obtained lease produces one settlement even when driver construction or
  `runCell` throws. One failed item does not erase sibling evidence.
- A broken `WorkSource` protocol, such as returning one live lease twice, fails
  the orchestration rather than fabricating a second settlement. The thrown
  `OrchestrationRunError` retains every settlement and event observed before
  the internal abort so the fatal boundary does not erase sibling evidence.
- Cancellation stops new dispatch, propagates to active attempts, and retains
  already-observed settlements. It does not rewrite failure as success.
- Retry is not a default kernel behavior. A source may issue another attempt
  only under an explicit mechanical retry policy and must retain the prior
  attempt. Semantic dissatisfaction routes to review or a new Cell, not retry.
- Concurrency is an admission bound, not a budget forecast. Work estimates and
  actual usage remain separate observations.
- Cross-Cell workspace safety belongs to the execution form or an injected
  environment allocator. The kernel never infers that two writable scopes are
  conflict-free or creates a Git worktree without an explicit policy.
- Priority and fairness are source policies. The kernel must not hardcode FIFO
  and later pretend it is a universal scheduling law.

## Minimum transition

Implement only the slice needed to prove the boundary:

1. Add the small `WorkSource` / lease / settlement protocol and an in-process
   bounded orchestration kernel.
2. Implement an open in-memory queue source whose producer may submit Cells
   while execution is running and must explicitly close the source.
3. Re-express the current fixed-manifest Swarm through that kernel without
   changing its public schemas, persisted records, ordering, workspace gate, or
   authority statement.
4. Keep `runCell`, `CellInput`, `CellDriver`, and `CellRunRecord` unchanged.
5. Do not add graph syntax, a daemon, remote workers, automatic retries, or a
   durable store in this slice.

The queue source is a runtime API first, not yet a CLI manifest. A static queue
file would be indistinguishable from Swarm and would falsely claim the dynamic
submission behavior this form exists to provide.

## Verification and disconfirmation

The boundary is supported only when:

- an action probe starts an empty queue, submits work after execution has begun,
  respects bounded concurrency, closes explicitly, and retains every settlement;
- the existing 256-Cell Swarm probe still proves fresh drivers, exact in-process
  dispatch, manifest-order records, sibling failure isolation, and compact
  persistence;
- a boundary probe shows that queue, dependency, retry, or domain vocabulary did
  not enter `CellInput`, `CellDriver`, or `runCell`; and
- a context probe shows that orchestration passes references and records rather
  than constructing one aggregate child-output prompt.

Reopen this decision if a second real execution form cannot implement the source
protocol without depending on kernel internals; if the kernel must interpret a
domain result to make progress; if cancellation loses already-settled evidence;
or if durable recovery requires changing the Cell contract rather than adding a
source/store carrier.

## Relation to earlier decisions

This decision activates the reopening path deliberately left by decision 025.
It preserves that decision's Swarm meaning and boundaries while moving its
shared mechanics into a reusable runtime. It does not revive the bounded
differentiation tree proposed by decision 007, and it preserves decision 027's
general-core/adapter split.

## Implementation evidence

- [`orchestration.ts`](../../packages/work-cell/src/orchestration.ts) defines the
  `WorkItem` → `WorkLease` → `WorkSettlement` boundary, bounded execution
  kernel, lifecycle events, and open in-memory queue without adding scheduling
  vocabulary to the Cell contract.
- [`multi-cell-workspace.ts`](../../packages/work-cell/src/multi-cell-workspace.ts)
  makes the existing conservative shared-workspace gate reusable by fixed and
  dynamically submitted multi-Cell carriers.
- [`swarm.ts`](../../packages/work-cell/src/swarm.ts) now lowers the unchanged
  fixed manifest through the orchestration kernel and retains an explicit
  manifest-order runner outcome for work cancelled before dispatch.
- The [orchestration action and boundary probes](../../packages/work-cell/test/orchestration.test.ts)
  start an empty queue, submit after workers are waiting, demonstrate bounded
  concurrency and explicit close, preserve workspace safety, and prove that
  `CellInput` rejects queue priority and dependency fields.
- The existing [Swarm probes](../../packages/work-cell/test/swarm.test.ts) still
  pass at 256 Cells and retain driver freshness, exact in-process dispatch,
  order, sibling failure isolation, cancellation outcomes, and compact
  persistence. With the later terminal and cancellation regressions included,
  the complete package passes 78 tests and 342 assertions plus TypeScript
  checking.
- The [independent review and correction record](../../regeneration/evaluations/2026-07-15-work-cell-orchestration-independent-review.md)
  retains failed review forms, finding dispositions, the fatal-source evidence
  repair, and the final focused `ready` verdict.

These checks establish the local source/kernel boundary. They do not establish
durable recovery, remote lease correctness, provider-scale concurrency beyond
the previously retained live smoke, or the fitness of a future graph source.

## Sequence expression

- **P04:** the principal contradiction is duplicated multi-Cell execution
  mechanics versus pollution of the atomic Cell contract.
- **P11 / P13:** sources decide eligibility, attempts execute, records verify
  mechanical outcomes, and external reviewers or humans retain acceptance.
- **P14:** queue views, indexes, readiness sets, and summaries remain
  reconstructible projections over declared records and events.
- **P15 / P16:** one small source protocol and one proven dynamic carrier enable
  new execution forms without imposing a workflow DSL or internal JSON on every
  caller.
