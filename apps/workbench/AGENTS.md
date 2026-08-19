# Rossovia Workbench — Agent Instructions

These scoped instructions own the natural-language-to-command mappings and
authority boundaries for Rossovia Workbench operations. Load only the entry
matching the current request. Run relative commands from the repository root;
being inside this directory does not change command ownership or scope.

## Rossovia workbench entry

Treat a natural-language request to initialize, extend, register, or use the
Rossovia workbench as an instruction to operate the existing workbench entry. Do
not make the human translate the request into CLI syntax. Select only the
mechanical action their words authorize:

- Before initializing the default home, if `~/.rosso` is absent and the legacy
  `~/.atthis` exists, run `./apps/gateway/rossovia migrate`. Do not create a
  second writable home or migrate when the target already exists.
- To initialize the workbench, run `./apps/gateway/rossovia init` and include
  one `--workspace-root <path>` for each root they explicitly supplied. Do not
  infer or scan `$HOME` when no root was supplied; an empty initialized home is
  valid, and roots can be added later. Initialization is complete only when the
  result reports `writeAccess: "verified"`: the command performs a
  create–rename–remove probe on every write-bearing home surface even when
  every home file already exists. If the
  home is readable but this probe fails, treat the selected Workbench capability
  as an incomplete user-level environment projection. Do not retry `init`,
  inspect hooks, or move state into the current project. Reconcile write access
  for the exact `ROSSO_HOME` through the selected harness's user-level setup,
  then verify it from a fresh session.
- When initialization explicitly includes the `multi-agent-delegation` setup
  capability, add `--setup multi-agent-delegation`. The module projects a
  compact fallback trigger into the selected harness; it is not a delegation
  runtime or a second owner of the method in
  [agent-delegation](../../skills/agent-delegation/SKILL.md). Each harness adapter
  owns only its projection path, syntax, and supported mechanics. The current
  Codex adapter writes one delimited user-instruction projection; this does not
  authorize other setup modules or whole-file replacement. After a repository
  update, a request to inspect or apply selected setup changes maps to
  `./apps/gateway/rossovia setup status` or `setup apply`. Status uses
  the last applied Git revision to filter the general `CHANGELOG.md` by selected
  functional-module prefix and the managed-block digest to distinguish source
  updates from local drift. Never apply across `drifted`, `conflict`, or
  `baseline-unavailable`.
- To add a later workspace root, run
  `./apps/gateway/rossovia root add <path>`. Discovery remains bounded and
  does not register the repositories it finds.
- To register a project, require an explicit local Git root and a verified
  stable project ID. Prefer a provider's immutable repository ID when one can
  be verified; otherwise ask for an explicitly assigned ID. Treat requested
  spoken names as aliases, never as identity, then run
  `./apps/gateway/rossovia register <path> --id <id>` with one `--alias`
  argument per alias.
- To continue or resume a named external project or task, extract the smallest
  intended name and run:

```text
./apps/gateway/rossovia resolve <name>
```

Treat the result as a verified routing projection, not task authority. Confirm
the returned Git status, then read the target's returned instruction files and
only the orientation files needed to recover the requested work. Do not infer
task completion from an alias, copy target facts into global memory, search a
Skill marketplace, or silently choose another project when resolution fails.
If the current harness cannot write the returned workspace, state that runtime
boundary rather than claiming the task has resumed.

If resolution has no explicit match and the person supplied a new workspace
root in the same request, add that root and retry. Refresh existing roots with
`./apps/gateway/rossovia scan` only when stale discovery is plausible. A
result marked `discovered` is a verified current location, not a stable project
identity or durable alias. Do not turn a natural-language request into broader
setup, marketplace search, automatic registration, or inferred task state.

## Rossovia preference entry

Treat an explicit natural-language request to remember, change, inspect, or
forget a personal default as authority to use the existing preference commands;
do not require the human to translate it into CLI syntax. Preserve the strength
of their wording: a preference remains a defeasible default, not a requirement.
Before a preference operation, apply the legacy-home guard above, then run
`./apps/gateway/rossovia init` without workspace roots. This is an idempotent
source initialization or completion and does not broaden discovery; it lets an
existing or new Rossovia workbench home acquire the preference files without making the
human perform setup first.

- Keep a session-only preference in the conversation and do not persist it.
- Use `./apps/gateway/rossovia preference set <id> --statement
  <text>` for a personal default intended to survive this session.
- Add `--project <registered-name>` for a personal default limited to one
  registered project. Put shared project requirements in that target
  repository's governing source instead of Rossovia.
- Route device-specific capabilities, availability, quota, credentials, paths,
  and provider order to their owning environment or runtime configuration;
  they are not preference scope.
- Use `preference retire` only when the person explicitly withdraws the exact
  scoped record. Use `preference list [--project <registered-name>]` to inspect
  the compact applicable projection rather than reading raw preference files.

Never promote a pattern inferred from corrections, history, memory, or
cognition into an active preference. It may be offered as a candidate for human
confirmation when it would materially change later work. Never place API keys,
tokens, credentials, session data, or private environment dumps in preference
text. Before a material choice among models, providers, execution carriers,
verification forms, or expression defaults, query applicable preferences when
one could change the choice. A preference cannot override a current human
instruction, project constraint, authorization boundary, or contrary runtime
evidence; state the reason when departing from it.

## Rossovia local task entry

Treat an explicit natural-language request to create, inspect, assign, run, correct,
rebind the Worktree context, link an already authorized execution, deliver a
retained correction, recover the linked execution, submit, accept, or reopen a
locally Principal-attributed task as authority to use the corresponding
existing Workbench task surface. Before the first operation, apply the
legacy-home guard above and run
`./apps/gateway/rossovia init` without workspace roots so the exact
Workbench home has a task source.

- Run `task list` or `task show <id>` before mutating an existing task and pass
  the returned source and task revisions to revision-bound mutations. `task
  run` is the exception: it rereads the current Task immediately before its
  effect and does not expose revisions to the caller.
- Create a task only from an explicit current request. Do not turn an inferred
  preference, observation, project history, or Agent suggestion into task
  state.
- Add project, Worktree, or Mission context only when the human identifies it
  and the registered project's current primary observation verifies it. This
  remains local context; it is not a target-project task, execution
  association, write authority, or execution authorization. A current carrier
  for the same project and Mission remains execution-unproven unless
  runtime-owned evidence exposes the exact launch-authorization lineage.
- Rebind Worktree context only through `task rebind-worktree` for an unsettled
  task that already has exact project and Worktree context; optional Mission
  context is not required. Pass the currently retained Worktree path as
  `--expected-worktree`; the command verifies a Git-clean replacement against
  the same registered project's observed Worktrees, preserves project and any
  existing Mission identity, and appends the transition to task history.
  Rebinding does not launch work or authorize the new carrier.
- Link an execution only through `task link-execution` after the task has exact
  registered-project and Mission context. The command must revalidate the
  authorization claim and receipt before appending their stable selector and
  canonical claim reference, and require the consumption claim and Mission turn
  to carry the same Workbench task-context reference retained by the link. A
  link is evidence, not launch authority or lifecycle movement; exact current
  attribution additionally requires matching structured launch references on
  the runtime-owned turn and effect.
- `assign ... --next-actor agent` identifies the next responsible actor but
  does not launch an Agent or claim live Agent work. Starting execution still
  requires an explicit runtime action. For a bounded contribution that fits
  the current harness, delegate directly through
  [agent-delegation](../../skills/agent-delegation/SKILL.md); Workbench retains the
  obligation and returned claim, not the sub-agent runtime or coordination
  state.
- Run `worker list` to inspect the host-owned worker descriptions, capabilities,
  provider/model/reasoning defaults, and availability. Run an ordinary open
  Agent-owned project task that already has one exact isolated Worktree with
  `task run <id> --worker <worker-id>`. Add `--continue <attempt-id>` to start
  a stateless continuation of the exact named prior-attempt lineage of the same
  still-open task in its current bound Worktree. Do not ask the
  human or calling Agent for driver, provider/model syntax, reasoning effort,
  session ID, or Task revisions.
  The ordinary run executes in-process through the shared catalog-backed Task
  Cell owner (`WorkerCatalog.createDriver` -> the AI SDK driver stack), never
  through an opencode-cli harness process. The OpenCode CLI driver exists only
  as an explicit Work Cell compatibility/experiment adapter, never as a
  default or fallback; OpenCode Go remains an AI SDK provider, not a harness.
  DeepSeek attempts retain the exact `ai-sdk-harness-pi-v1` mechanism and the
  host-selected reasoning policy. Ordinary model-visible command authority is
  empty: an exact argv is not confinement when Agent-edited tests or package
  scripts execute as host code. Run verification from the separate trusted
  host boundary until a filesystem-confined check owner exists; do not add
  bare `git`, bare `bun`, install, stash, or a shell.
  The 30-minute run ceiling is only an emergency ceiling; it is not an approval
  or budget mechanism.
  A fresh run remains Git-clean-only. An explicit continuation may retain a
  dirty Worktree only when every currently staged, unstaged, or non-ignored
  untracked path is present in the cumulative `workspaceDiff` union walked from
  the exact prior-attempt lineage: the anchor attempt and every predecessor
  along its exact `continuedFromAttemptId` chain must retain an available
  owner-backed passed final in the current bound Worktree executed by the same
  driver and model. A missing, malformed, differently driven, foreign-Worktree,
  non-passed, or cyclic lineage member fails closed. Ignored artifacts do not
  block, and path membership proves no content identity. Harness session ids
  are observation only and are never continuation authority. A harness session
  id observed in the new attempt's final Work Cell record is returned as
  observation; nothing requires or fabricates one.
  Mission context is not required. The command creates the Work Cell input and
  append-only attempt evidence inside the Workbench home, but its settlement
  neither submits nor accepts the task. An atomic lease in the exact Worktree Git metadata rejects
  overlapping writers across Workbench homes; a crash-retained lease is
  recovered only through `task reconcile-attempt` — never by manual lease
  deletion or stale-lock inference. Git-tracked paths always remain in
  Work Cell evidence even when one of their path segments is usually generated. A
  settled task is viewable history and cannot run.
- Run `task reconcile-attempt <id> --attempt <attempt-id>` as the only normal
  dead-runner recovery for one crash-retained attempt whose lease owner
  process is verifiably dead. The command re-reads the strict attempt
  evidence family (immutable attempt record, CellInput, final record, and
  settlement), the exact task/attempt/worktree lease bytes, and the recorded
  owner PID, and fails closed on a live or unknown owner, mismatched
  identity, a changed or missing lease, or invalid evidence. It finalizes
  exactly one of three shapes: an existing exact settlement plus a
  still-exact dead-owner lease retries only the lease release; a real owner
  final record without a settlement is validated against the immutable input
  and derives the shared normal settlement from it; otherwise it writes only
  the existing append-only `runner-failed` settlement with a truthful
  interrupted/no-final reason. The lease is released only after a durable
  settlement exists, and no Work Cell final status, usage, diff,
  verification, or session identity is ever forged from partial trace or
  database evidence; no Task lifecycle moves. This enables a fresh clean run,
  or — once an owner-backed final record exists — normal continuation. Do not
  reconcile a live run, guess an owner, or delete a lease file whose recorded
  PID cannot be confirmed dead.
- Run `task attempts <id>` to project the task's recorded attempts as a
  read-only view sorted by start time. The projection reads, never copies or
  rewrites, the existing attempt, final Work Cell record, and settlement files:
  selected worker and resolved driver/model/reasoning/session come from the
  attempt record; observed session/cell status/usage/workspace diff/verification
  come from the final record, and settlement status comes from the settlement. It carries the
  stable source references and exposes per-source `available`, `unavailable`,
  or `invalid` standing rather than dropping attributable malformed evidence.
  It never exposes the raw Work Cell trace and changes no task or attempt state.
- `task submit` retains actor-supplied references as an unverified result claim;
  their wording or prefix never establishes verification. The Workbench UI may
  instead submit the current Autonomy-verified execution only when the task's
  latest execution link, that link's Workbench task-context reference on the
  consumption claim and Mission turn, structured turn/effect lineage, candidate
  Worktree, and runtime-owned verification selector all match. The task retains
  that selector rather than copying runtime verdicts, and the UI must revalidate
  it before acceptance; stale or unavailable runtime evidence returns the
  result for correction or resubmission. Only an explicit, locally
  Principal-attributed acceptance settles the Workbench task. Attribution is
  not identity authentication, and local settlement never implies Mission,
  product, integration, merge, or publication acceptance.
- Append a structured independent assessment only with `task append-review`
  against the exact current result-claim ID while the task is `verifying`.
  Supply explicit independence basis/source identity and one full Git commit;
  do not infer either from reviewer prose, names, models, sessions, or result
  evidence references. The append is review evidence only: it preserves
  lifecycle, next actor, result resolution, and Principal acceptance. Review
  freshness is rebuilt by comparing that commit with the currently observed
  bound Worktree HEAD; independent or unreadable Worktree context is
  `unavailable`, never guessed.
- Keep corrections on the same task. Recording a correction changes only the
  local task. Deliver it to an Agent only through the Workbench UI's explicit
  delivery action after the task's latest execution link resolves to one exact
  current turn and live runner. The retained Mission input receipt proves
  delivery to that carrier, not that the Agent understood, applied, verified,
  or reconciled the correction. Exact replay is a no-op; target drift leaves
  the correction local-only. Do not manufacture delivery evidence through the
  task CLI or its domain helper.
- Recover a task-linked execution only through the Workbench UI's explicit
  recovery action when the latest execution link resolves to one exact
  interrupted turn, live runner, and runtime-declared `resume` capability. The
  server must require the latest link's Workbench task-context reference on the
  consumption claim and Mission turn, then revalidate the authorization,
  proposal digest, canonical claim, the required current task Worktree against
  the consumed candidate, turn ID, runner, and interrupted state. Immediately
  before recovery it must re-read the task source/revisions, canonical
  claim/receipt, and runner activity; any drift blocks the mutation. Recovery
  changes Autonomy state only; it does not
  reuse authorization, replace or abandon the runner, move the task lifecycle,
  or prove resumed production.
- Reopen a settled task before new work rather than erasing its accepted result
  history.

## Rossovia cross-project task entry

When the human asks for work in progress across registered projects, run
`./apps/gateway/rossovia project list`. Preserve its `complete` flag and each
project's availability status. For every available project, read its returned
instruction files—and no conventional filenames that were not returned—before
using only the task-continuity source that project declares. Run every relative
target command with its working directory set to the returned workspace path;
never reuse the Rossovia workbench directory for a different project's query.
Report a project with no declared source as `unsupported`; do not infer
commitments from Git branches, PRs, Issues, logs, or repository names. Mark the
combined task view incomplete when the project inventory is incomplete or any
project is unverified, unsupported, or returns invalid task output. Once a
declared task query returns a valid projection, aggregate only that output; do
not open its underlying records merely to elaborate the answer. Keep every task
judgment scoped to the project that produced it. The combined answer is a
read-only projection: it neither copies task facts into Rossovia nor authorizes
work in a target project.

## Rossovia UI entry

Treat a natural-language request to open, start, or use the Rossovia web UI
("open the workbench", "启动工作台", "show me the UI") as authority to serve
the Principal Workbench through the CLI and report its URL:

```sh
./apps/gateway/rossovia ui
```

Default surface: `http://127.0.0.1:4317` (loopback only). Add explicitly
selected local repositories with one `--root <path>` each and change the port
with `--port <port>`; the leading-global `--home` applies as usual. The
command is long-running: keep it in the foreground of a dedicated session and
stop it by interrupting that session — do not background it and forget it.
`bun run --cwd apps/gateway ui` is the equivalent source-checkout
entry; use the CLI form as the ordinary path. Serving the UI enables
controlling Tasks and Missions through the browser; it does not by itself run,
authorize, or accept any work.

## Workbench browser observation entry

When a request requires inspecting the Workbench UI in a real browser,
including the browser portion of an acceptance walkthrough, use the
repository-pinned browser entry documented in
[the Workbench README](README.md#browser-observation). Give every Agent or
worktree a distinct session name, repeat it across commands, and close the
session when the observation is complete:

```sh
bun run --cwd apps/gateway browser -- -s=<session> open <url>
```

Use screenshots together with the CLI's snapshot, console, and geometry
surfaces; a screenshot alone does not prove interaction or semantic
correctness. Keep generated `.playwright-cli/` state and disposable captures
out of Git. If the pinned browser binary is absent, provision it through the
same entry with
`bun run --cwd apps/gateway browser -- install-browser`. Keep this
pinned entry as the ordinary browser-observation path; when a fallback carrier
is necessary, record its identity and the reason the ordinary path was
unavailable.

## Mission continuity entry

When the human asks which work is in progress in this project, run
`./apps/gateway/rossovia mission list`. Treat its output as a projection over
the Git-tracked Mission Records, not as a backlog or authority to start work.

At a continuity safe point—before opening a branch, worktree, or PR; switching
project or main focus; ending or handing off a session; or claiming a material
phase complete—check whether an unresolved item must survive the transition.
Create or update a Mission Record only when it is an authorized obligation,
will remain unfinished across that safe point, could compromise acceptance or
mainline return if forgotten, and has a distinct return or closure condition.
Keep an immediate local step in the current plan. Keep an unapproved idea or
observation outside active task state; preserve it in an owning evidence source
only when it can change a later decision. Reuse an existing Mission, PR, Issue,
or other declared source when it already preserves the obligation without loss.

Lifecycle events trigger this check; words and tool events do not decide the
result. Do not infer a commitment from phrases, create a top-level Mission
beyond the human mandate, or automatically close a Mission from Git or PR
state. At a safe point for an existing Mission, run its `status` and `check`
commands and surface mismatches for settlement.

## Rossovia supervised execution entry

When the human asks what a pending supervised execution would disclose, spend,
write, or decide, run:

```text
./apps/gateway/rossovia execution inspect <project> <mission-id>
```

Treat the result as a projection of the exact committed Mission proposal, not
as execution authority. Present its proposal ID and digest, runtime reference
and source digest, consequential choices and immediate results, external
disclosure, hard execution limits, forecast-only token estimate, write/command
scope, and withheld authorities. Read `proposalStatus` as the committed
proposal's semantic state and `status` as the current local
authorization-evidence standing: receipt issuance changes the latter to
`authorized-awaiting-execution`, and an exactly validated consumption claim
changes it to `authorization-consumed`. Invalid receipt or consumption
evidence fails closed under its own standing; it does not restore reusable
launch authority.
Only the registered primary workspace's committed Mission is an authorization
source; the same Mission observed in another worktree remains observation-only.

Create a local launch receipt only after the human explicitly answers every
pending decision and explicitly allows any declared external disclosure. Re-run
`execution inspect`, bind the current proposal ID and digest, then run
`execution authorize` with one `--choice <decision-id>=<reply-key>` per
decision plus attributable Principal and source references. Do not infer
`ALLOW` from `continue`, silence, a preference, an earlier proposal, or a
recommendation. A valid receipt releases only its declared disclosure, budget,
write paths, and one execution against the exact runtime source digest; a
same-named runtime whose content changed is stale. It is not commit, merge,
publication, or product acceptance authority. Its actor and source references
preserve attribution and do not authenticate a person.

The local Principal Workbench UI may perform the same receipt-only operation
after the person explicitly selects every decision and checks all three
disclosure, forecast, and one-use/integration acknowledgements. Its v2 receipt
retains those acknowledgements with
`identityAssurance: "unverified-local-interaction"`. Treat `HOLD` as continued
blocking. Receipt issuance never starts the runner or grants integration,
publication, or product-acceptance authority.
