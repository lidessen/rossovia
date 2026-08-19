# Mission Records

`apps/missions/<id>.json` is the Git-tracked operational source for one
**material, multi-session mission**. It answers a different question from Git
or the Chronicle: which side branches remain obligated to return a result to
the current mainline?

Create no record for a one-step, reversible local edit. Create one only when a
mission can fork into work that a later session could otherwise forget or fail
to reconcile.

```text
Git / PR             → what changed and how it was integrated
Chronicle            → what was observed and with what limitation
Mission record       → what remains open, why it diverged, and how it returns
```

## Lifecycle

With an Agent operating from this repository, ask in natural language:

```text
What work is currently in progress in this project?
This investigation must survive the task switch; record its return condition.
We finished this branch without a code change; return it to the mainline.
```

The Agent applies the continuity gate in `AGENTS.md` and invokes the commands
below. Direct commands remain useful for automation and debugging.

```bash
./apps/gateway/rossovia mission list
./apps/gateway/rossovia mission init <id> \
  --title "…" \
  --mainline "…" \
  --accept "…" \
  --source "…"

git add apps/missions/<id>.json
git commit -m "ops: open <id> mission"

./apps/gateway/rossovia mission add-branch <id> <branch-id> \
  --kind investigation \
  --purpose "…" \
  --return-condition "…" \
  --source "…"

./apps/gateway/rossovia mission status <id>
./apps/gateway/rossovia mission settle <id> <branch-id> \
  --disposition no-change \
  --mainline-delta "…"
./apps/gateway/rossovia mission check <id> --git
```

Every branch begins with a source, purpose, parent, and return condition. It
can close only with one of `integrate`, `no-change`, or `abandon` plus a
`mainlineDelta`. A useful but unfinished branch stays `suspended` and names its
reactivation signal; it cannot disappear as “done”.

The mission root defaults to `<cwd>/apps/missions`, resolved to an
absolute path at invocation time. `--root <path>` overrides it through exactly
one of two family slots: one leading pair before the subcommand
(`mission --root <path> <verb> ...`) or one final pair after all verb
arguments (`mission <verb> ... --root <path>`). Mission records are Git-tracked
in the repository; the Workbench `--home` (ROSSO_HOME) never relocates them.
Run `rossovia help mission` or `rossovia mission <verb> --help` for the exact
grammar.

Every successful mission command prints one JSON object on stdout with empty
stderr. Mutating verbs (`init`, `add-branch`, `focus`, `suspend`, `resume`,
`settle`, `close`, `prune`) print a receipt naming the action, exact mission,
resolved root, record path, and resulting state:

```json
{
  "action": "init",
  "mission": "founding",
  "root": "/abs/repo/apps/missions",
  "path": "/abs/repo/apps/missions/founding.json",
  "status": {
    "id": "founding",
    "mainline": "active",
    "currentFocus": "mainline",
    "openBranches": []
  }
}
```

Migration note: earlier revisions printed a bare record path for
`init`/`prune` and nothing for the other mutations. Scripts should read the
receipt's `path` field instead of the old bare stdout, and may treat empty
stdout as a failure, not as silent success.

Before a material safe point—switching focus, opening/merging a PR, or reporting
phase completion—run `status`. A mission can settle only when all its branches
have returned. `close` retains closure sources in the record. After that state
is committed, `prune` removes the settled record; its complete final state
remains in Git history while the active directory stays small.

`list` validates every JSON record and projects only active Missions. It fails
closed rather than hiding a malformed record. It does not scan Git branches,
PRs, Issues, logs, or prose to infer new commitments.

## Boundaries

- This is not a scheduler, backlog, task board, worker queue, or authority to
  start work.
- The JSON record is the operational source; `status` output is a projection.
- A Work Cell, PR, review, or Chronicle record is linked as evidence. None is
  replaced or accepted by this record.
- `check --git` requires the record to be Git-tracked. `--require-committed`
  additionally requires its current state to be committed at `HEAD`.
