# Rossovia Workbench

Workbench is the repository's high-frequency project, mission, preference, and
hook runtime. Its checked-in entrypoint is:

```sh
./operations/workbench/rossovia --help
```

The launcher uses the self-contained `dist/rossovia.mjs` bundle with Node
22.12–26. Bun is a development and test tool, not a target-machine requirement.
From the repository root, rebuild the bundle with:

```sh
npm --prefix operations/workbench run build
```

The build uses a local Bun installation when present. With Node and Docker but
no Bun, use `npm --prefix operations/workbench run build:docker`; Docker
supplies Bun only inside the build container and exports the same Node bundle.

## Principal Workbench MVP

The local Principal Workbench is a rebuildable operational projection over
registered project identity, Git-observed worktrees, project-local Mission
records, and cached or live supervised-Mission runner state:

```sh
bun run --cwd operations/workbench ui
```

Open `http://127.0.0.1:4317`. Add another explicitly selected local repository
with `bun run --cwd operations/workbench ui -- --root <git-root>` or select
another port with `--port <port>`.

The default surface is a multi-project workbench rather than an operational
dashboard. Its left rail keeps the stable views—Overview, Needs you, Agent
work, Projects, Independent tasks, and Completed—while the center presents
projects, worktrees, and work items in one scan. Selecting a work item opens a
Peek with its next actor and evidence freshness before the existing
supervision and evidence details. A decision row opens that detail with
`查看并决策`; it never turns the row itself into an approval action.

The work-item layer is rebuilt on the server from the existing Project,
Mission, runner, and attention projections. Lifecycle, next actor, decision
attention, binding, and evidence freshness remain separate. Only a proven live
`running` carrier appears under Agent work. Cached running records and
unbound or ambiguous observations do not, and the latter never become
independent tasks. Workbench currently has no declared independent-task source,
so that view reports the capability as unsupported instead of showing a
factual zero.

On narrow screens the same shell uses three primary destinations—Overview,
Tasks, and Projects. Task filters do not rewrite the underlying projection,
and a consequential decision opens in a full-screen detail view. The client
refreshes the target before enabling its existing decision surface; final
authorization still depends on the server-side exact-target and digest checks
described below.

The MVP is intentionally supervised: Codex is the named supervisor and the
Workbench is the supervised subject. It may send a contribution, pause or
release a durable pause on a live runner, or choose an existing
interrupted-turn recovery only after rechecking the exact Mission, runner
identity, and state. That expected target travels into the same serialized
runner request that records the mutation; a replacement runner rejects an
action authorized for its
predecessor. Cached runner state never authorizes an action. Releasing a pause
returns to `input-pending` until the durable inputs are reconciled; the UI does
not claim that this alone resumed production. The UI does not expose `stop`,
`approve-effect`, reconciliation acceptance, publication, merge, or an
unsupervised mode.

Runner state also distinguishes control-plane reachability from production.
`anchor-pending` means no authorized intent anchor exists: the UI presents the
Principal migration gate and disables ordinary contribution or control
actions. `idle` means an anchor exists but the reachable carrier has no runtime
or current executor; input may be retained, but the UI does not describe that
as ongoing production.

The live UI rechecks semantic lineage through Autonomy's complete-timeline
`intentLineage` projection. A `legacy-unanchored` Mission overrides an older
carrier's cached `input-pending` presentation, disables ordinary input,
control, and recovery in both the browser and action handler, and shows the
exact retained Mission event count and timeline digest in a separate read-only
Lineage Gate. The gate exposes no choices by itself. When Autonomy separately
projects a complete proposal-only migration brief bound to the exact
runner/state/liveness, complete history, committed Mission source, candidate
anchor, and proposal digest, Workbench adds a read-only migration-action
Principal Decision Brief with `AUTHORIZE MIGRATION`/`HOLD`. Only the proposal
view is read-only: `AUTHORIZE MIGRATION` permits carrier shutdown or retirement,
replacement, and one exact timeline append through the guarded settlement
protocol. The Brief has no form, button, receipt, or POST action:
the Principal replies through the supervised conversation, and any runner,
timeline, source, or proposal drift removes the reply key. The proposal itself
grants no carrier replacement, adoption, reconciliation, external disclosure,
candidate write, commit, merge, publication, or product-acceptance authority.
After an explicit `AUTHORIZE MIGRATION`, the trusted supervisor must bind that
human reply to the displayed proposal ID and digest, normalize it to the
legacy protocol value `ADOPT`, create the exact proposal-bound decision
artifact, and invoke
[Autonomy's guarded settlement surface](../autonomy/README.md#operator-surface);
Workbench does not translate a browser interaction or silence into that
decision. The Brief distinguishes an atomic append-and-retire path from a
pre-upgrade carrier's five-step compatibility saga. The compatibility variant
discloses that shutdown happens before its exact response can be verified,
binds runner ID, PID, start time, socket, protocol observation, and complete
history, and shows every shutdown, socket-release, replacement, and guarded
adoption step. Before the shutdown effect, Autonomy durably consumes the
proposal/decision pair into one exact-target attempt. Only attempt-bound exact
retirement or exact adoption evidence permits crash recovery; an orphan
attempt, ambiguity, or drift permanently invalidates the displayed choice,
removes the reply key, and requires a new Brief plus a new
`AUTHORIZE MIGRATION`. `HOLD` performs no mutation. Neither choice authorizes
reconciliation or resumes semantic production. Principle proposals and
Principle Sequence adoption remain exclusively governed by
`principle-cultivation`; this migration neither proposes nor adopts a
principle. The internal `ADOPT` value names only the existing anchor-migration
wire protocol.

After migration has been consumed and the exact correction report is still
current, Workbench can project a second, separate read-only Principal Decision
Brief for watermark reconciliation. It appears in the `监督与介入` action
surface rather than the project inventory. The Brief binds the live no-runtime
runner, active anchor, next correction input, byte-addressed passed report,
committed Mission source, two fresh no-environment Codex app-server Cells,
named model, compatible Codex app-server version, the remaining non-I/O plan
tool, OpenAI disclosure categories, conditional commit rule, and reply key
`SETTLE_CONTINUE|RECLASSIFY_CORRECTION|HOLD`. `SETTLE_CONTINUE` authorizes only
those two invocations and a guarded watermark commit when the proposer returns
`continue` and an independent verifier returns `verified-transition`;
`RECLASSIFY_CORRECTION` and `HOLD` run no model and commit no reconciliation.
The carrier disables local environments, dynamic tools, instruction sources,
workspace roots, and the other declared I/O and extension surfaces; it fails
closed on early protocol EOF, bounded shutdown failure, any unexpected server
request, or any undeclared item, including one received while the session is
being drained. This proves no direct repository or candidate-file disclosure
through the admitted carrier, not a tool-free Codex process: the bounded Cell
ID, intent, instructions, declared capabilities, context, acceptance criteria,
terminal contracts, execution profile, fixed system/developer instructions,
and output schema still cross the OpenAI boundary. The disposable workspace
policy and host budgets do not; only the final message is schema constrained.
The migration reply is one-use and cannot authorize this later action. The UI
remains read-only: a trusted supervisor must bind a new exact reply to the
displayed reconciliation proposal ID and digest. That supervisor must also
prove the Mission root is the registered primary workspace; a same-HEAD
secondary worktree is not an authority source. Candidate write, commit,
merge, publication, and product acceptance remain withheld.
If the one-use reconciliation attempt exists without a terminal outcome,
Workbench projects it as consumed and uncertain; it does not offer replay,
describe it as awaiting execution, or infer that reconciliation completed.

Runner reachability is three-valued at the observation boundary. A successful
exact socket response is `live`; a missing or refusing exact socket is
`unreachable`; permission denial, timeout, or an invalid response is
`unverified`. Workbench never lowers `unverified` to `live: false`: it keeps
cached evidence inspectable, withholds actions and migration reply keys, and
names the observer limitation.

Project identity remains sourced from the Workbench home. Extra repository
roots and their Git worktrees are observation-only until registered. Mission
branches remain semantic lines of work rather than inferred Git branches; a
missing Mission/worktree/PR binding is shown as missing instead of guessed.
The global view aggregates project evidence but has no cross-project acceptance
or bulk-control authority.

A project-local Mission may also declare one pending supervised
`executionProposal`. Workbench displays its stable proposal ID and computed
content digest, exact runtime source reference and SHA-256 content digest,
external provider and disclosure categories, device-neutral candidate-worktree
reference, read/exclusion/write/command scope, model-step and duration limits,
forecast-only token estimate, explicit choices, and every withheld authority.
The v1 compatibility contract did not declare read paths; Workbench labels that
absence instead of treating its broad disclosure prose as a precise boundary.
The v2 contract requires explicit relative read and exclusion paths while
retaining an empty command surface. The proposal is project semantic state, not
a runner, an effect, or an authorization receipt; all four states remain
orthogonal. Only the
registered primary workspace's committed Mission may project an authorizable
proposal. The same Mission observed in another worktree remains visible but
cannot become a second authorization source.

The card offers a receipt-only Principal action. It starts with no selected
decision, requires every choice plus three explicit acknowledgements, and
keeps `HOLD` blocked without writing a receipt or sending data. `ALLOW` can
create one v2 receipt after the server re-reads the committed primary Mission
and rechecks its HEAD, proposal ID, proposal and runtime digests, choices, and
existing-receipt standing. The receipt retains the local action request, acknowledgements,
actor/source attribution, and `unverified-local-interaction` assurance. It does
not authenticate a person, start or consume a runner, or grant commit, merge,
publication, or product acceptance. The limits shown as hard execution limits
cover model steps, per-step output tokens, and duration; the total token
estimate is forecast-only and is not a total input-token or monetary cap.
Workbench compares the receipt's runtime digest with the committed proposal; it
does not resolve or hash adapter-owned runtime source. The trusted adapter must
rehash that source and fail closed before it consumes the receipt, creates a
model driver, or admits a writable effect.

The operator-selected absolute worktree path first appears in local consumption
or effect evidence after launch preflight, never in the shared Mission source.
When the trusted adapter retains
`state/execution-authorization-claims/<authorizationId>.json`, Workbench joins
it only after strictly binding its authorization, project, Mission, proposal
and proposal digest, receipt reference, and canonical receipt digest to the
still-valid receipt and committed proposal. A valid `authorization-consumed`
standing shows the claim time, selected candidate worktree and HEAD, and claim
source. It proves only that the receipt's one launch authority was consumed; it
does not prove runner start, effect admission, execution success, integration,
or product acceptance. A malformed or mismatched claim is invalid evidence and
fails closed rather than restoring reusable launch authority.

Before asking for a launch choice, inspect the exact committed proposal:

```sh
./operations/workbench/rossovia --home <ROSSO_HOME> execution inspect \
  <project> <mission-id>
```

The local UI form is the direct interaction path. Alternatively, after an
explicit Principal answer in an authority-bearing conversation, the trusted
supervisor can bind the displayed proposal ID and digest to those choices:

```sh
./operations/workbench/rossovia --home <ROSSO_HOME> execution authorize \
  <project> <mission-id> \
  --proposal-id <id> \
  --proposal-digest <sha256> \
  --choice <decision-id>=<reply-key> \
  --actor-ref principal:<identity> \
  --source-ref <kind>:<reference>
```

Repeat `--choice` once for every pending decision. The command re-reads the
Git-tracked Mission at `HEAD`, rejects working-tree drift and stale digests, and
creates one immutable receipt under
`$ROSSO_HOME/receipts/execution-authorizations/`. The actor and source
references preserve attribution; they do not authenticate a person. The
receipt releases only the declared disclosure, budget, write paths, and one
execution. Commit, merge, publication, and product acceptance remain withheld.
CLI-issued v1 receipts do not claim the UI's durable acknowledgement evidence;
the UI labels that evidence unavailable instead of inventing it.

For an observed runner, the server also projects bounded recent Mission, turn,
and delegation events from the append-only timeline. When an admitted isolated
writable trial exists, it additionally joins the effect journal's actual
writer/run, phase, `write_file` target, frozen worktree and scope, attributable
candidate diff, layered verification, stale/uncertain standing, and permanently
withheld commit/merge/publication authority. This activity can explain what
changed, but it omits file contents, contribution text, result text, and hidden
model reasoning and does not prove semantic correctness. `pause` waits for the
active child to quiesce before the turn settles, but it does not roll back
already written candidate files; `replace` and `abandon` likewise never imply
worktree cleanup.

When an independent verifier supplies a subject HEAD and file hashes, the UI
shows its scoped `claim:` evidence and treats a later same-path byte change as
stale. A displayed pass therefore remains a time-bound claim about the named
candidate bytes, never a general product-acceptance badge.

UI acceptance also requires a task-based walkthrough by an independent Agent
that did not implement the current surface. At desktop and mobile widths, that
evaluator must be able to identify the operating mode and live work, find
pending Principal decisions, explain their immediate effect and withheld
authority, and recover the evidence behind candidate, effect, correction, and
authorization states. Static layout tests and the supervisor's own inspection
are supporting evidence, not a substitute for this user-perspective probe.

The durable source and action boundaries are recorded in
[Decision 050](../../design/decisions/050-principal-workbench-supervised-mvp.md).

## Hook projections

The portable hook behavior lives in `src/hooks.ts`; repository-root
`../../.codex/hooks.json`, `../../.claude/settings.json`, and
`../../.cursor/hooks.json` are thin lifecycle bindings.
They share privacy-preserving intervention state and path-only artifact
observations without claiming identical host capabilities.

| Capability | Codex | Claude Code | Cursor |
|---|---|---|---|
| Principal-message observation | yes | yes | no useful binding |
| Reconciliation context injection | yes | yes | unavailable on `beforeSubmitPrompt` |
| Changed-artifact observation | `PostToolUse` | `PostToolUse` | `afterFileEdit` |
| One bounded stop continuation | `decision: block` | `decision: block` | `followup_message` |

Cursor's prompt hook can currently validate or deny a submission but cannot add
context to it, so Rossovia does not install a pretend intervention adapter.
The active Agent still receives Principal corrections through ordinary
conversation. All three artifact bindings retain only relevant repository
paths in operating-system temporary state and clear them after the continuation.

The binding shapes were checked on 2026-07-23 against the
[Codex Hooks guide](https://learn.chatgpt.com/docs/hooks),
[Claude Code hooks reference](https://code.claude.com/docs/en/hooks), and
[Cursor hooks reference](https://cursor.com/docs/hooks). Recheck the owning
tool's current documentation before changing its JSON projection.
