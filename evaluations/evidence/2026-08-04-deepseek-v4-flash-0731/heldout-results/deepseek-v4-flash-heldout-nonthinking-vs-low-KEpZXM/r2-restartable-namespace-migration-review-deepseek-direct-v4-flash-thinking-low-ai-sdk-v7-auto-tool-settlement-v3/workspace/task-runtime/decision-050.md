# Decision 050 — Principal Workbench as a supervised operational projection

**Status:** accepted first MVP
**Date:** 2026-07-26
**Human mandate:** make the semi-autonomous Workbench system perceptible and
interactive across multiple projects and Git worktrees, with Codex supervising
the system during the first iteration.

## Concrete need

The existing autonomy mechanism can preserve Missions, accept Principal input,
and expose runner state, but its operational truth is dispersed across
Workbench registration, Git worktrees, project-local Mission Records, and
Mission-runner state. A human Principal cannot reliably judge whether the
system is working, which object an action will affect, or when intervention is
necessary by reading those sources independently.

The interface must support several projects and several worktrees without
collapsing distinct identities:

- a registered project is a durable Workbench identity;
- a Git worktree is an observed execution location;
- a Mission branch is a semantic line of work, not a Git branch; and
- a runner is an operational process bound only by an exact Mission ID.

## Decision

Add a local Principal Workbench to `apps/workbench`. It is a rebuildable
projection and a narrow human-participation surface, not a new source of
project, Mission, Git, or runner truth.

The first MVP uses three coupled views:

1. a global Principal-attention and project view;
2. a project view that preserves project, worktree, Mission, and runner
   distinctions; and
3. a supervision view with one persistent target address and only actions
   authorized for a currently proven live runner.

The operating mode is explicitly `supervised`: Codex is the supervisor and
Rossovia Workbench is the supervised subject. The UI may describe the future
unsupervised mode only as unavailable. It must not imply that the first MVP can
settle its own authority boundaries.

## Source and authority boundaries

| Source | Projection | Authority retained by source |
|---|---|---|
| Workbench home | registered project identity and primary workspace | project identity and configured location |
| Git | worktree path, branch, head, and dirty observation | repository and worktree state |
| project-local Mission Record | contradiction, acceptance, focus, semantic branches, and an optional pending execution proposal with an exact runtime source digest | Mission meaning and continuity; a proposal remains intent rather than authorization |
| local execution-authorization receipt | exact primary-Mission HEAD, proposal digest, runtime source digest, Principal choices, declared disclosure/budget/write boundary, and one launch; a Workbench-UI v2 receipt also retains the three explicit acknowledgements | only that bounded launch against the named runtime content; actor/source fields preserve attribution rather than authentication, and local UI interaction does not verify identity |
| runner status and live status command | operational state and freshness | current runner identity and state |
| isolated writable-effect journal | writer/run identity, frozen worktree and scope, safe tool activity, candidate diff, layered verification, uncertainty | effect evidence only; never integration or product acceptance |
| Principal Workbench UI | joined navigation, attention, proposed action, and a receipt-only Principal authorization form | no independent semantic authority and no runner, effect, integration, publication, or acceptance authority; it may persist only the exact bounded receipt after server-side revalidation |

For a legacy live carrier, the UI may also project one separately prepared
Intent Anchor migration brief. Only the brief view is read-only. Its
human-facing action is `AUTHORIZE MIGRATION`, because the action may shut down
or retire the exact carrier, start a no-runtime replacement, and append one
exact anchor. A trusted supervisor may normalize that exact reply for the
displayed proposal ID and digest to the retained internal protocol value
`ADOPT`; the wire value is not a Principle Sequence proposal or adoption.
`HOLD` causes none of those effects. Reconciliation and every later execution
or integration authority remain withheld.

An explicit repository root may be observed before registration, but it remains
`observed-unregistered`. The projection may show a Mission beside the Git
context in which it was read; this is observation context and never establishes
a Mission-to-worktree or Mission-to-Git-branch binding.

A pending execution proposal is authority-bearing only when read from the
registered primary workspace's committed Mission source. Other worktrees remain
observable and cannot become a second authorization surface. The proposal
identifies its content with a stable project-owned ID and a Workbench-computed
digest. It also identifies the supervisor-owned runtime by reference and
SHA-256 source digest, so changing the task or acceptance source under the same
path invalidates later receipt use. It declares external disclosure, a
device-neutral candidate-worktree reference, write and command scope, explicit
model-step and duration limits, a forecast-only token estimate, Principal
choices, and withheld authority. After an explicit choice, a local receipt may
release the declared disclosure, budget, write paths, and one execution for the
exact committed proposal digest. The proposal, receipt, runner, and writable
effect are independent state: none proves or implicitly binds the later ones.
An exact local worktree path enters local consumption or effect evidence only
after operator selection and launch preflight.

## Human-participation boundary

The first MVP exposes only:

- a contribution to the selected Mission;
- pause or resume for a live runner in the matching state; and
- resume, replace, or abandon for a currently interrupted turn; and
- one receipt-only execution-authorization action for the registered primary
  Mission's exact committed proposal.

Every action carries Mission ID, runner ID, and expected runner state. The
server re-reads live runner status before execution, then carries runner ID and
expected state into the mutating runner request. The runner checks both inside
its serialized request queue before retaining an event, closing the
status-then-mutate replacement race. Cached state can inform attention but can
never authorize mutation.

The runner's append-only timeline supplies a bounded activity projection:
ordered input, reconciliation, turn, and delegation transitions plus a current
turn summary. For an explicitly admitted isolated writable trial, a separate
append-only effect journal adds the actual Cell/run, phase, scope-bound
`write_file` targets, worktree-relative diff, patch evidence, independent
verification standing, and `commit`/`merge`/`publish` authority fixed to
`withheld`. It deliberately omits file contents, contribution text, result
text, and hidden reasoning. Activity explains what the mechanism observed; it
is not semantic verification.

A writable trial is one guarded Cell in one clean disposable linked Git
worktree under an exclusive Workbench-home lease. It has no model-controlled
commands. New input and pause request cancellation but do not constitute
rollback; the Mission turn remains live until the child actually quiesces.
Process loss after effect start leaves the effect uncertain and blocks replay
until the worktree is inspected or discarded.

The MVP does not expose stop, effect approval, reconciliation acceptance,
publication, merge, bulk cross-project control, or an unsupervised mode. A
correction remains ordinary Mission input. A proposal choice becomes bounded
launch authority only through a receipt that rechecks the committed Mission,
proposal ID, digest, complete decision set, and retained authority boundary;
the Principal must make every choice without a preselected default and
explicitly acknowledge the declared disclosure, forecast-only token estimate,
and one-use/integration boundary. `HOLD` persists no receipt. `ALLOW` may issue
one v2 receipt whose `principalAction` retains the request ID, three
acknowledgements, local-UI channel, and
`unverified-local-interaction` identity assurance. Issuance never starts a
runner, consumes the receipt, writes the candidate, or grants commit, merge,
publication, or product acceptance.

## Verification and reconsideration

The first MVP is supported only when:

1. projection tests preserve registered identity, multiple worktrees, Mission
   semantics, exact runner binding, freshness, and incomplete-source evidence;
2. action tests prove live target rechecking and reject stale or unsupported
   commands;
3. a real browser renders the live projection at desktop and mobile widths,
   identifies the current target, distinguishes viewed worktree from action
   target, and disables mutation without a live runner;
4. the local server exposes only the declared static assets, pins
   authorization to its exact loopback origin, and prevents framing of the
   Principal surface; and
5. the interface labels unavailable or observation-only capabilities instead
   of filling gaps with inferred bindings.
6. a writable trial rejects shared/dirty/non-linked worktrees, concurrent
   writers, commands, scope widening, and replacement before quiescence; its
   retained patch and before/after hashes remain distinguishable from
   independent verification and Principal acceptance.
7. an execution receipt rejects dirty Mission sources, stale proposal digests,
   changed runtime source content, incomplete or unknown choices, undeclared
   disclosure, and reuse, while keeping commit, merge, publication, and product
   acceptance withheld.
8. UI authorization tests retain v2 Principal-action evidence, reject
   observation-only worktrees and invalid receipt evidence, and let refreshed
   receipt projection—not a network response assumption—settle an uncertain
   submission outcome.
9. an independent Agent that did not implement the current UI completes
   task-based desktop and mobile walkthroughs from a first-time Principal's
   perspective: identify the operating mode and live work, find every pending
   Principal decision, explain its immediate effect and withheld authority,
   and recover the evidence behind candidate, effect, correction, and
   authorization states. Implementation tests and the supervisor's own browser
   inspection cannot substitute for this usability evidence.

The experimental proposal and receipt shapes currently require
`runtimeDigest`; a legacy same-version record without it is malformed and
cannot launch. Before these contracts are reused across a persisted-version
boundary, introduce a new version or an explicit
`runtime-unbound-requires-fresh-authorization` standing. Compatibility must
never silently upgrade an older receipt into launch authority.

Reconsider the local single-user form when remote access, multiple Principals,
or shared action authority becomes a demonstrated need. Reconsider supervised
mode only after the system can present independently checkable evidence of its
own operating boundaries and the human explicitly authorizes an unsupervised
trial.
