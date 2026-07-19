# Decision 038 — Relocatable Atthis Workbench Entry

**Status:** accepted first slice
**Date:** 2026-07-18
**Human mandate:** enter this repository, say `继续 XX`, recover the matching
repository and worktree, and continue without making names or local paths into
project identity.

## Concrete need

Atthis has three distinct uses: developing this project as a whole, installing
one independent Skill into another project, and using this checkout as an entry
to work across several projects. The third use requires user-level continuity,
but neither global Skill installation nor a model session can own it. Sessions
are opaque and per-harness; Git knows current code state but not the spoken name
by which the person expects to recover it.

The local `survey` checkout supplied a direct migration case. Its product,
package, and GitHub repository are now named `meowask`, while the local folder
remained `survey` until it was moved. Any resolver keyed only by folder basename
or current repository name would either lose the old spoken route or create a
duplicate project.

## Decision

Adopt one relocatable Atthis user home, defaulting to `~/.atthis` and overridable
through the `ATTHIS_HOME` environment variable or CLI `--home`. Its first slice
separates:

| Source or projection | Owns | Does not own |
|---|---|---|
| `config/projects.json` | stable project ID, current repository locator, spoken aliases | local paths, Git observations, task state |
| `state/workspaces.json` | this machine's current Git-root path for a project ID | portable project identity or repository truth |
| `state/roots.json` | workspace roots explicitly supplied for this machine | discovered repository identity or portable configuration |
| `cache/workspaces.json` | rebuildable Git-root, remote, and lookup-alias observations | stable project identity, durable aliases, or task state |
| target Git repository | remote, HEAD, branch, tracked changes, governing project files | Atthis aliases or cross-project priority |
| `resolve` output | current joined view with Git verification and context pointers | an independent source or authority to start work |

`scripts/atthis.py` owns only these mechanical actions:

- `init` creates versioned sources and the declared empty directories;
- `register` joins one explicit stable ID to a repository, aliases, and current
  local Git root;
- `attach` changes only the machine-local path after verifying that the target
  has the registered origin; and
- `root add` records a machine-local workspace root and refreshes its bounded
  discovery index;
- `scan` rebuilds the cache from configured roots; and
- `resolve` prefers an explicit registration, otherwise may use one exact,
  unambiguous indexed candidate marked `discovered`. It fails closed on a
  missing path, wrong Git root, or origin mismatch before returning current Git
  and context evidence.

`init --workspace-root <path>` may configure and scan a root during initial
setup; `root add <path>` provides the same entry when the person supplies it
later. Scanning is bounded to two directory levels, stops descending at a Git
root, and does not read repository content. A Git root without `origin` remains
discoverable by its folder alias, but the result exposes the missing repository
locator and cannot claim remote identity verification.
An initialized repository without a first commit remains discoverable with a
null `head`; absence of `HEAD` is an observed state, not index corruption.
Overlapping configured roots are de-duplicated by their observed Git root.
Because `cache/workspaces.json` is a projection, `scan` must recreate it even
when it has been deleted or damaged; source validation cannot make the cache a
precondition for rebuilding itself. Repository verification also normalizes
common HTTPS and SSH transports to the same host/path identity so moving to a
new device or clone protocol does not falsely look like a repository change.

The durable directories `missions/`, `memory/`, `cognition/`, and `receipts/`
are initialized as empty ownership boundaries, not populated by inference.
`cache/` is explicitly rebuildable. This slice does not define their later
record schemas.

## Ordinary agent entry

The repository `AGENTS.md` carries one small always-available route: when the
human asks to continue a named external project or task from this checkout, the
agent resolves the extracted name, verifies the returned workspace, then reads
only the target's returned instruction and orientation files before choosing a
task method. The resolver does not read those files into output or copy their
content into global memory.

An exact project alias is sufficient for the first probe. A later task/mission
entry may point to a project ID and project-local continuity source, but it must
not expand the project registry into a global backlog or make resolution an
authority to execute. Runtime write permission also remains external: if the
current harness cannot write the returned path, the agent must report that
boundary or re-enter through a currently documented harness surface.

## Migration boundary

- Stable IDs are not display names, repository names, aliases, or paths. Use a
  provider's immutable repository ID when available; retain its current locator
  separately.
- Stable IDs and spoken aliases share one case-folded lookup namespace. The
  registry rejects a key that would make either an ID or alias ambiguous.
- Repeating `register` for an existing stable ID must name the same normalized
  repository. It may refresh transport or local attachment, but cannot rebind
  old aliases to another repository; identity migration requires a later
  explicit operation with its own verification and receipt.
- A folder move changes only `state/workspaces.json`; a repository rename
  updates the locator while retaining stable ID and useful old aliases.
- All root lookup passes through one home resolver. Durable records use paths
  relative to that home when a path is necessary.
- A future Atthis rename must reconcile old source to new carrier, verify an
  ordinary alias resolution, and retain a receipt. Old and new homes may not
  remain competing writable sources.
- Secrets, sessions, transcripts, vendor caches, and model-created summaries do
  not enter this home automatically.
- Scanning never registers a project. An indexed candidate can support immediate
  verified navigation, but durable aliases and rename continuity begin only
  after explicit registration.

## Verification

The integration probe creates a Git repository at `survey`, registers its
stable ID and alias, renames the folder to `meowask`, and requires resolution to
fail while the mapping is stale. It then rejects attachment to a different
origin, attaches the renamed root, and requires `resolve survey` to return the
same ID, the new path, clean Git state, and actual orientation files.

The first live setup is supported only when the same command resolves the real
`meowask` checkout through both its old and current aliases without modifying
that repository. A second probe supplies a workspace root, discovers an
unregistered repository, resolves it as `discovered`, and confirms that the
portable project source remains unchanged.

The retained integration probe also removes the workspace cache and requires
`scan` to rebuild it, then attaches an SSH-form clone to a project registered
with an HTTPS locator and requires the stable project identity to survive the
transport change.

## Reopening observations

Reopen this slice if ordinary agents do not activate the resolver from a plain
`继续 XX` request, if users need task identity before project alias resolution
is useful, if repository providers lack a usable stable identity, if a home
rename requires scattered code changes, or if the two JSON sources create more
reconciliation burden than the path/identity distinction prevents.
