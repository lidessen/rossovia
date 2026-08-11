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
  `~/.atthis` exists, run `./operations/workbench/rossovia migrate`. Do not create a
  second writable home or migrate when the target already exists.
- To initialize the workbench, run `./operations/workbench/rossovia init` and include
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
  `./operations/workbench/rossovia setup status` or `setup apply`. Status uses
  the last applied Git revision to filter the general `CHANGELOG.md` by selected
  functional-module prefix and the managed-block digest to distinguish source
  updates from local drift. Never apply across `drifted`, `conflict`, or
  `baseline-unavailable`.
- To add a later workspace root, run
  `./operations/workbench/rossovia root add <path>`. Discovery remains bounded and
  does not register the repositories it finds.
- To register a project, require an explicit local Git root and a verified
  stable project ID. Prefer a provider's immutable repository ID when one can
  be verified; otherwise ask for an explicitly assigned ID. Treat requested
  spoken names as aliases, never as identity, then run
  `./operations/workbench/rossovia register <path> --id <id>` with one `--alias`
  argument per alias.
- To continue or resume a named external project or task, extract the smallest
  intended name and run:

```text
./operations/workbench/rossovia resolve <name>
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
`./operations/workbench/rossovia scan` only when stale discovery is plausible. A
result marked `discovered` is a verified current location, not a stable project
identity or durable alias. Do not turn a natural-language request into broader
setup, marketplace search, automatic registration, or inferred task state.

## Rossovia preference entry

Treat an explicit natural-language request to remember, change, inspect, or
forget a personal default as authority to use the existing preference commands;
do not require the human to translate it into CLI syntax. Preserve the strength
of their wording: a preference remains a defeasible default, not a requirement.
Before a preference operation, apply the legacy-home guard above, then run
`./operations/workbench/rossovia init` without workspace roots. This is an idempotent
source initialization or completion and does not broaden discovery; it lets an
existing or new Rossovia workbench home acquire the preference files without making the
human perform setup first.

- Keep a session-only preference in the conversation and do not persist it.
- Use `./operations/workbench/rossovia preference set <id> --statement
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

Treat an explicit natural-language request to create, inspect, assign, correct,
rebind the Worktree context, link an already authorized execution, deliver a
retained correction, recover the linked execution, submit, accept, or reopen a
locally Principal-attributed task as authority to use the corresponding
existing Workbench task surface. Before the first operation, apply the
legacy-home guard above and run
`./operations/workbench/rossovia init` without workspace roots so the exact
Workbench home has a task source.

- Run `task list` or `task show <id>` before mutating an existing task and pass
  the returned source and task revisions to the requested mutation.
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
  follows its separately accepted Mission/runtime boundary. For a bounded
  contribution that fits the current harness, delegate directly through
  [agent-delegation](../../skills/agent-delegation/SKILL.md); Workbench retains the
  obligation and returned claim, not the sub-agent runtime or coordination
  state.
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
`./operations/workbench/rossovia project list`. Preserve its `complete` flag and each
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

## Workbench browser observation entry

When a request requires inspecting the Workbench UI in a real browser,
including the browser portion of an acceptance walkthrough, use the
repository-pinned browser entry documented in
[the Workbench README](README.md#browser-observation). Give every Agent or
worktree a distinct session name, repeat it across commands, and close the
session when the observation is complete:

```sh
bun run --cwd operations/workbench browser -- -s=<session> open <url>
```

Use screenshots together with the CLI's snapshot, console, and geometry
surfaces; a screenshot alone does not prove interaction or semantic
correctness. Keep generated `.playwright-cli/` state and disposable captures
out of Git. If the pinned browser binary is absent, provision it through the
same entry with
`bun run --cwd operations/workbench browser -- install-browser`. Keep this
pinned entry as the ordinary browser-observation path; when a fallback carrier
is necessary, record its identity and the reason the ordinary path was
unavailable.

## Mission continuity entry

When the human asks which work is in progress in this project, run
`./operations/workbench/rossovia mission list`. Treat its output as a projection over
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
./operations/workbench/rossovia execution inspect <project> <mission-id>
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
