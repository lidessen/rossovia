# Worked mechanism-design cases

Use these cases after forming an independent identity–origin–destination
answer. They demonstrate derivation, not a taxonomy of approved solutions. A
new case with different relations may reach a different treatment.

## Case 1 — A mechanism-admission mechanism

**Identity.** The proposed object is a gate that records whether another
mechanism may enter the system. It does not own the proposed mechanism's fact or
effect; it duplicates design judgment and approval.

**Origin.** The pressure is real—defensive mechanisms accumulate—but the
observed failure is poor recurring judgment, not an untrusted caller bypassing
an enforceable safety boundary. The current owner is design guidance and human
architecture authority. The Rossovia candidate explicitly treats mechanism
review as guidance rather than another runtime gate
([architecture candidate](../../../design/organization/sessions/2026-08-16-rossovia-runtime-module-review.md#mechanism-discipline-is-guidance-not-another-gate)).

**Destination.** Agents should distinguish a unique invariant from policy,
adapter, projection, or fear. A prompt-level Skill changes that judgment without
adding a registry, lifecycle, recovery path, or approval queue.

**Treatment.** `prompt`, not a new mechanism. Retain the decision only in an
owning design that already needs it.

**Reopen when.** Representative work repeatedly introduces irreversible or
security-sensitive machinery despite clear guidance and before any existing
authority can observe or stop it.

## Case 2 — Artifact confirmation versus semantic review

**Identity.** An artifact checker is a mechanical observer. The producer owns a
result claim; an independent reviewer owns semantic judgment; the Principal
owns acceptance. These are relations among different actors, not phases of one
`verified` state. Work Cell's accepted terminal contract already distinguishes
mechanical evidence from semantic acceptance
([Decision 033](../../../design/decisions/033-work-cell-terminal-contract.md)).

**Origin.** One overloaded word—verification—was being used for path existence,
schema validity, test results, fitness to objective, and readiness to accept.
That lets a producer or checker accidentally certify its own work.

**Destination.** The checker confirms only declared, reproducible facts: path,
bytes, schema, references, or deterministic assertions. The reviewer judges
whether the output solves the objective. Acceptance remains a separate domain
decision.

**Treatment.** `simplify` the checker and preserve independent review. Do not
build a universal review queue; an Agent reviewer is an ordinary read-only Run,
and a human reviewer needs no runtime service.

**Reopen when.** A semantic requirement becomes a stable deterministic
contract. Encode that part as a mechanical assertion while leaving quality and
fitness judgments with review.

## Case 3 — Retry, continuation, recovery, and rerun verbs

**Identity.** Starting an execution, controlling a live execution, observing a
result, mutating Task meaning, and repairing owner state are different
operations owned by different modules. `Retry`, `continue`, `recover`, and
`rerun` mostly describe cause, lineage, or internal policy rather than peer
Harness actions.

**Origin.** A flat action vocabulary grew as each failure story acquired a new
verb. An unfamiliar-Agent probe then needed exceptions for first verification,
format repair, post-crash terminal commit, and review follow-up. The vocabulary
was representing implementation history rather than a stable effect model.

**Destination.** The public execution surface creates a new Run from an
explicit request or stops one supported live Run. A predecessor, review purpose,
or adapter continuation is data on the request. Safe transport replay remains
inside the adapter; settlement and reconciliation remain inside the lifecycle
owner; correction and acceptance remain domain mutations
([minimal action semantics](../../../design/organization/sessions/2026-08-16-rossovia-runtime-module-review.md#harness-evidence-review-acceptance-and-minimal-action-semantics)).

**Treatment.** `simplify` to `run(request)` and `stop(runId)` for Rossovia's
public Orchestration execution surface.

**Reopen when.** A live runtime demonstrates a genuinely distinct controllable
property—such as safe pause with retained exclusive resources—that cannot be
expressed as stop plus a later RunRequest.

## Case 4 — Workbench Task versioning

**Identity.** A Task revision belongs to the semantic Task entity. A repository
generation is storage coordination. Git HEAD is an external source observation.
Calling all three “versioning” hides their owners.

**Origin.** Independent actors can form decisions from Task revision N and
later mutate as if N were still current after the Task becomes N+1. That is a
real stale-semantic-decision failure. By contrast, exposing an aggregate source
revision to every caller makes unrelated Task changes conflict and does not by
itself provide atomic compare-and-swap
([versioning review](../../../design/organization/sessions/2026-08-16-rossovia-runtime-module-review.md#why-versioning-exists--and-where-it-should-stop)).

**Destination.** Reject mutations formed from stale Task meaning while keeping
storage serialization internal and Git freshness external.

**Treatment.** `reuse` one caller-facing Task entity revision; `simplify`
aggregate generation into the repository transaction owner. Do not add event
sourcing or per-field versions.

**Reopen when.** Multiple supported writers can still lose committed Home
updates; then the storage owner needs real serialization or atomic commit, not
another semantic revision.

## Case 5 — Worktree writer ownership

**Identity.** The object is the at-most-one-writer property for one Git
Worktree, not a Task lock, scheduler, generic resource lease, or success record.
It is used only by effectful Runs.

**Origin.** Two separately valid Runs can interleave long-lived tool effects in
the same Worktree. Prompt guidance cannot exclude concurrent processes, while
Git's short command locks do not cover the whole model/tool loop. The current
implementation uses an owner-identified lock with explicit reconciliation
([task-run owner](../../../operations/workbench/src/task-run.ts)).

**Destination.** Admit at most one writer and never let one owner release
another. Do not preserve richer owner history or liveness inference unless it
changes that safety result.

**Treatment.** `reuse` the ownership property and `simplify` its representation.
Prefer a process-scoped lock when the execution boundary proves all child
effects quiesce with the owner; retain a minimal durable claim only when an
orphan writer can survive and block safe automatic release
([O3 review](../../../design/organization/sessions/2026-08-16-rossovia-runtime-module-review.md#what-o3-actually-is)).

**Reopen when.** A focused probe demonstrates detached effects, an unreachable
owner without a reliable death signal, or a need for bounded automatic recovery.

## Case 6 — Test breadth during an unsettled runtime slice

**Identity.** The proposed object is evidence for one new optional runtime
boundary, not a release certification system. A test can establish the encoded
forward, boundary, or compatibility predicate; it does not establish that the
new interface is the final architecture or that the resulting Agent work is
semantically good.

**Origin.** The interface and ownership relation are still being discovered,
but a proposed plan begins with an exhaustive fault matrix. Most of those tests
would freeze provisional request shapes and fixtures before representative use
has shown which failures matter. At the same time, exact Worktree writer
ownership is already an accepted hard boundary, so an observed post-terminal
write cannot be deferred as ordinary hardening
([runtime ownership](../../../design/decisions/055-rossovia-runtime-module-ownership.md),
[terminal contract](../../../design/decisions/033-work-cell-terminal-contract.md)).

**Destination.** Advance the slice with the smallest evidence that can reject
the direction: ordinarily a forward path, the known or load-bearing boundary,
and a compatibility relation with the unchanged caller. If a causal probe
shows cancellation returning a final while an admitted effect can still write,
contain that path, repair the effect owner, and retain the focused regression
before releasing writer ownership. Add broader restart, concurrency, and fault
coverage when the relation stabilizes or when shared cause and consequence make
those cases decision-relevant.

**Treatment.** `simplify` the early test plan; do not create a coverage gate or
test-phase lifecycle. Preserve the strict safety regression because it protects
an already load-bearing invariant, not because every edge must be anticipated.

**Reopen when.** A new supported effect channel can bypass the repaired owner,
the runtime enters process-loss or concurrent-writer conditions, or a release
claim needs evidence from the intended operating profile.
