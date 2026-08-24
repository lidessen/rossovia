# Rossovia directory layout

**Status:** design map for the user home and project-local namespace. It
describes ownership and migration boundaries; it does not authorize a rename
or move in the current implementation.

## The three locations

Rossovia has three different physical concerns:

| Location | Owner | Holds | Must not hold |
| --- | --- | --- | --- |
| `~/.rossovia/` (canonical user home; current runtime alias is `~/.rosso/`) | Rossovia Workbench for one user/device | non-secret config, registered-project metadata, tasks, conversations, receipts, observer records, caches, backups, and references to workspaces | repository source as an implicit source of truth, API keys, provider sessions, or another harness's private home |
| project `.rossovia/` | the project plus the Rossovia host adapter | optional non-secret project-local host selection, skill-source selection, and presentation overrides | durable Workbench task state, credentials, generated transcripts, or a second project instruction system |
| Git repository and Git Worktrees | Git/project owner | source code, project `AGENTS.md`, design, tests, commits, branches, and isolated implementation effects | Workbench home state, provider secrets, or mutable cross-project task ledgers |

`ROSSO_HOME` remains the current environment variable and the current code
defaults to `~/.rosso`. The public layout should converge on `~/.rossovia`
through an explicit migration, not a silent fallback or a second writable home.
Until that migration is implemented, documentation and Settings must label the
observed `~/.rosso` path as the current runtime home and the `~/.rossovia` path
as the target naming, not claim that the rename already happened.

The project-local namespace is `.rossovia/`; do not introduce a parallel
`Rosso/` runtime directory. The host entry is the readable `ROSSOVIA.md` at the
project root. This keeps the directory for non-secret machine-readable
selection while keeping the host-facing explanation easy to discover.

## User home shape

The user home is a boundary, not a dump of every agent tool's home directory:

```text
~/.rossovia/
├── manifest.json                 # home/schema identity
├── config/
│   ├── projects.json             # registered project identity and aliases
│   ├── preferences.json          # user/project defaults, no secrets
│   ├── setup.json                # selected Workbench setup projections
│   └── skill-sources.json        # future host source selection, non-secret
├── skills/                       # user-owned skill authoring only
│   └── custom/                   # user-authored skills for the Main Agent
├── state/
│   ├── tasks.json                # Principal task source
│   ├── workspaces.json           # registered workspace bindings
│   ├── conversation-events/      # durable conversation journal
│   ├── task-attempts/            # attempt/final/settlement evidence
│   ├── workflow-reviews.jsonl    # project observer opinions, append-only records
│   ├── interventions/            # session-local correction observations
│   └── results/                   # source-native result projections
├── receipts/                     # preference/setup/authorization receipts
├── missions/                     # Mission projections owned by Workbench
├── cache/                        # disposable derived indexes
├── memory/                       # optional cognition projections, non-authoritative
├── backups/                      # recoverable prior source snapshots
├── workspaces/                   # optional user-selected checkout locations
└── worktrees/                    # optional Workbench-managed isolated checkouts
```

The names above describe current ownership, not a demand to create every
directory at startup. A directory is created by its owning feature when the
feature is initialized. `cache/` may be regenerated; `state/` and `receipts/`
are evidence-bearing; `backups/` are recovery aids; none becomes a semantic
source merely because it is readable.

`skills/custom/` is the user-authored source for the Main Agent and is not
granted to workers by default. Picked and builtin skills are both owned by the
installed Rossovia/harness package, not by the user home; `picked/` is simply
the package's curated built-in subset. Main Agent and worker packages may
therefore expose different compact sets.

The future host adapter may project these logical families to concrete roots as
follows (this is a target mapping, not a current filesystem contract):

```text
Main Agent = <host installation>/skills/picked
             + <host installation>/skills/builtin
             + ~/.rossovia/skills/custom
Worker     = <worker package>/skills/picked
             + <worker package>/skills/builtin
             + user-custom only when an explicit capability policy grants it
```

Project-local `.rossovia/config/skill-sources.json` can select or narrow which
package export is active, but it must not silently turn the whole repository
`skills/` collection into a built-in root or add user-authored bodies to
`picked/`. The active harness adapter remains responsible for resolving the
concrete roots, checking source digests, and loading bodies.

Provider credentials stay in the environment's supported secret store or
environment variables. Rossovia may project configured/unavailable status, but
never copies values into `config/`, `state/`, a browser snapshot, or a skill
prompt.

## Project-local `.rossovia/`

The project namespace is intentionally much smaller:

```text
project/
├── ROSSOVIA.md                    # host Agent entry and source pointers
└── .rossovia/
    ├── config/
    │   └── skill-sources.json     # optional project source selection
    └── README.md                  # boundary, if the project opts in
```

Project-local configuration is not automatically copied into a worker. The
host adapter may select a project skill or a project presentation preference,
then records the selected source/digest in the receiver-specific task
context. Project `.rossovia/` must not become a place for task attempts,
conversation journals, credentials, or generated model memory. Keep it
versioned only when the project deliberately wants the selection shared;
otherwise ignore it and keep the selection in the user home.

The initial implementation may have no `.rossovia/` directory at all. A
missing project namespace means “no project-local override”, not “scan the
repository for hidden Rossovia state”.

## Harness-specific homes are projections

Existing files illustrate why Rossovia must not absorb other harness homes:

- `.codex/` contains this repository's Codex hook/config projection;
- `.claude/` contains Claude Code hook/settings projection;
- `.reasonix/` contains Reasonix local task/session artifacts;
- `.vercel/` contains Vercel project linkage; and
- `.agents/` / `.agent/` may be harness skill or agent surfaces.

These are tool-local surfaces. Their current documentation and ignore rules
decide whether they are committed, ignored, or user-level. Rossovia can read a
declared status or create a supported projection, but it must not merge their
private state into `~/.rossovia` or infer a universal skill precedence from one
of them.

The comparison references reinforce this separation: [Claude Code settings]
(https://code.claude.com/docs/en/settings) separate user, project, local, and
managed scopes; [Hermes configuration](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/configuration.md)
keeps provider/model/API-key configuration distinct from its skill catalog;
and [Eve's project layout](https://github.com/vercel/eve/blob/main/docs/reference/project-layout.md)
uses an agent-local `agent/` tree rather than mounting every repository file.

## Directory decision rules

1. Put durable user defaults and Workbench evidence in the user home, not in a
   project repository.
2. Put project-specific host selections only in `ROSSOVIA.md` and optional
   `.rossovia/config/`, never in the project `AGENTS.md` by implication.
3. Keep project source and Worktree effects in Git; record their absolute
   paths as verified bindings, not as copied source in the user home.
4. Keep skills as source/provenance plus selected projections; do not copy all
   skill bodies into every Agent or worker context.
5. Keep caches, memory projections, and vendor homes non-authoritative and
   disposable unless an owning source explicitly says otherwise.
6. Any migration from `~/.rosso` to `~/.rossovia` must preserve source
   identity, receipts, and rollback, then pass a fresh home write/access probe;
   it must not create two competing live homes.

## Reopen signals

Reopen this map if a feature cannot identify whether a path is user config,
project config, source code, Workbench evidence, cache, or vendor-local state;
if two homes are writable at once; if a project `.rossovia/` starts accumulating
task/runtime state; or if a harness adapter needs a source that this ownership
map has not named.
