# Rossovia Workbench CLI Surface — Agent-Facing Audit

- **Method:** [improve-agent-workflow](../../skills/improve-agent-workflow/SKILL.md), command path
  [cli-surface.md](../../skills/improve-agent-workflow/commands/cli-surface.md)
- **Audited revision:** `4efe51852d6d9f188452ad33fd2ac5a5a01eb726` (worktree HEAD at audit time)
- **CLI entry:** `./operations/workbench/rossovia` → [`src/cli.ts`](src/cli.ts)
- **Mode:** read-only review. Mutating probes ran only against a disposable
  `--home` fixture under the pre-approved session temp directory
  (`/var/folders/wt/qwnhkx2n49b68l8ds407lkc00000gn/T/opencode/rosso-audit-home`),
  never against `~/.rosso` or the repository. This record proposes no product
  CLI change; it only records the audit and a first implementation packet for a
  later authorized task.

## Named agent action

A coding agent (this Work Cell, a delegated worker, or a harness hook) invokes
Rossovia from a noninteractive shell to set up, route, register, and operate
Workbench state: initialize a home, register/resolve projects, inspect tasks,
workers, preferences, setup status, missions, and execution authorizations —
forming each command from the CLI itself and recovering from failures without
re-reading governing prose for every call.

## Evidence collection

All probes ran with `stdin=/dev/null` in a noninteractive shell. `exit=` is the
process exit code; stdout/stderr were captured separately. State-mutating
probes are labeled `[fixture]` and used `--home <disposable>`.

### Per-family coverage

| Family | Observed | Absent | Unverified |
| --- | --- | --- | --- |
| top level | `--help`/`-h` exit 0 (41-line usage); unknown command exit 2 | `--version` (exit 2), `help <command>`, `list` overview | — |
| init | `init` exit 0 JSON (`writeAccess: "verified"`), idempotent re-run identical `[fixture]` | `init --help` exits 2 | `--setup` effect projection |
| setup | `setup status` exit 0 JSON `[fixture]` | `setup status --help` exits 2 | `setup apply` effect (not executed: mutating) |
| migrate | `migrate --from-home /nonexistent` exit 2, clear message | `migrate --help` exits 2 | real legacy-home migration |
| resolve | `resolve radar` / `resolve <id>` exit 0 JSON with `head`, `branch`, `registration: "registered"` `[fixture]`; unknown name exit 2 | `resolve --help` | — |
| register | `register <repo> --id <id> --alias <a>` exit 0 JSON `[fixture]`; missing path exit 2 | `register --help` | — |
| attach | source-defined `attach <project> <path>` ([attach.ts](src/attach.ts)) | `attach --help` | invocation (needs registered workspace) |
| project | `project list` exit 0 JSON `{complete: true}` `[fixture]`; source sets exit 2 when `complete: false` ([cli.ts:41](src/cli.ts)) | `project list --help` exits 2 | incomplete-projects path |
| worker | `worker list` exit 0 JSON (`deepseek-flash`, …) | `worker list --help` exits 2 | — |
| preference | `set`/`list`/`retire` exit 0 JSON `[fixture]`; retire-again exit 2 ("no user preference matches…") | `preference set --help` exits 2 | `--project` scoped set |
| execution | `execution inspect a b` exit 2 ("no project matches 'a'") | `execution inspect --help` exits 2 | real authorized receipt flow |
| task | `list`/`show` exit 0 JSON; `create` exit 0 JSON `[fixture]`; `show bogus` exit 2; revision-bound mutations validate revisions/actors/verdicts first (exit 2) | every `task* --help` exits 2 | `run`, `reconcile-attempt`, `link-execution` (effect-bearing) |
| contribution | source-defined `reconcile-lease <conversation-id> <batch-id> <key>` ([cli.ts:196](src/cli.ts)) | `contribution --help` exits 2 | invocation (lease recovery) |
| mission | `mission list` exit 0 JSON from repo root (reads `operations/missions`); cwd-dependent; `--root` must precede subcommand ([missions.ts:312](src/missions.ts)) — superseded by the T4 implementation update below | `mission --help`, `mission list --help` exit 2 | branch mutations |
| intervention | `intervention --help` exits 2 | any help | observe/status effect |
| correct | `correct --help` exits 2 ("--help requires a value") | any help | state-file correction |
| hook | `hook --help` exits 2 ("hook platform must be codex, claude, or cursor"); reads JSON payload from stdin; `artifact` writes consistency state to `$TMPDIR/rossovia-hooks/…` ([hooks.ts](src/hooks.ts)) | any help | executed hook payloads |
| statusline | `statusline` exit 0 non-TTY (`github-repository:1210540877`), `--cwd` variant | `statusline --help` exits 2 | TTY input mode |
| root | `root list` exit 0 JSON; `root add <repo>` exit 0 JSON `[fixture]` | `root --help` exits 2 | — |
| scan | `scan` exit 0 JSON `{indexedWorkspaces, index}` `[fixture]` | `scan --help` exits 2 | — |

Representative raw evidence (command text, exit code, first output bytes):

```text
$ ./operations/workbench/rossovia task --help            -> exit 2, stderr: "rosso: missing required task command argument"
$ ./operations/workbench/rossovia mission --help          -> exit 2, stderr: "rosso: unknown mission command: --help"
$ ./operations/workbench/rossovia init --help             -> exit 2, stderr: "rosso: invalid init option sequence: --help"
$ ./operations/workbench/rossovia --version               -> exit 2, stderr: "rosso: invalid command; run rossovia --help"
$ ./operations/workbench/rossovia task list --home <tmp>  -> exit 2, stderr: "rosso: task list accepts no arguments"   # --home only accepted as leading global
$ ./operations/workbench/rossovia --home <tmp> init       -> exit 0, JSON {"home": ..., "writeAccess": "verified", ...}   # idempotent on re-run
$ ./operations/workbench/rossovia --home <tmp> task create --title "audit probe task" ... --expected-source-revision 0
    first run: exit 0 (task created, sourceRevision 1)
    identical retry: exit 2, stderr: "rosso: Principal task source revision is stale: expected 0, current 1"
```

No transcript archive of real agent invocations exists in
`chronicle/`, `development-log/`, or `experiments/` (grep for `rossovia` found
only product-name references); the only committed CLI-invocation tests are
[`test/source-runtime.test.ts:78`](test/source-runtime.test.ts) (launcher
`--help`, missing-Bun failure) and per-module tests that spawn
[`src/cli.ts`](src/cli.ts) directly. Agent-driven invocation evidence is
therefore **unverified** beyond this audit's own probes.

## Review dimensions (observed / absent / unverified)

1. **Discoverability — absent below top level.** Top-level `--help` exists; no
   subcommand accepts `--help`/`-h` anywhere. Every subcommand help probe exits 2
   with an unrelated parse error. No `--version`, no `help` command, no
   completion. Discovery cost: an agent must already know the exact syntax or
   read [AGENTS.md](AGENTS.md)/source before forming any first invocation.
2. **Grammar and composability — observed with constraints.** Consistent
   `--flag value` pairs, repeated flags for `--accept`/`--evidence-ref`;
   positionals validated. `--home` is a leading-only global (fine, but
   undocumented as such); `mission --root` must precede the subcommand; no `--`
   end-of-options handling. Values starting with `--` are handled
   inconsistently: the `task`/`init`/`namedOptions` parsers reject them,
   while `mission` `parseCommand` option values and `register`
   `--id`/`--alias` values consume them as-is — a parser inconsistency, not a
   universal rule.
3. **Stable selectors — observed.** Task UUIDs, project `--id` (alias is
   display name, never identity), mission ids, `head` sha + `branch` in
   `resolve`, and numeric `--expected-source-revision`/`--expected-revision`
   guards for revision-bound Task-source mutations. `task run` and
   `task reconcile-attempt` instead address their target with exact selectors
   (`--worker <worker-id>`, `--attempt <attempt-id>`); neither exposes
   revision guards to the caller.
4. **Read/effect boundary — absent in grammar.** Help lists verbs flat; no
   `list`/`get` vs mutation separation, no `--dry-run`/`--check`. `scan`,
   `root add`, `register`, `preference set`, `setup apply`, and the
   effect-bearing Task verbs (`create`/`run`/`assign`/`correct`/
   `link-execution`/`rebind-worktree`/`submit`/`append-review`/`accept`/
   `reopen`/`reconcile-attempt`) mutate with no preview form; `task list`,
   `task show`, and `task attempts` are the read-only exception. Source
   separates reads (list/show/inspect) from effects, but the CLI does not
   express it.
5. **Structured output — observed with exceptions.** Most successful
   operational commands emit JSON on stdout. Exact exceptions: top-level help
   is human text, `statusline` is plain text, `mission init`/`prune` return a
   bare path string ([missions.ts:339](src/missions.ts)), `mission
   focus`/`suspend`/`resume`/`settle`/`close` are silent success, and
   `hook artifact` outputs conditionally (JSON or silent). The mission
   exceptions are repaired by the T4 implementation update below.
6. **Error and recovery — partial.** Outer CLI parser/dispatch failures and
   the incomplete `project list` case exit 2 with one stderr line prefixed
   `rosso:` (binary is `rossovia` — naming mismatch); the launcher exits 127
   with a clear message when Bun is missing; `hook` failures after platform
   parsing return fallback JSON (`systemMessage`, or a stderr note plus `{}`
   for cursor) with exit 0. No usage-error vs state-error distinction.
   Stale-revision errors do report the failed
   guard's current value (`expected 0, current 1` above; the source guard
   [tasks.ts:943](src/tasks.ts) runs before the Task guard
   [tasks.ts:653](src/tasks.ts) in existing-Task mutations, while
   `task create` has only the source guard), but one stale failure returns
   neither a fresh Task snapshot nor both current guard values, so when both
   drifted on an existing Task an agent still needs `task show` and another
   retry. No partial-state reporting beyond message text.
7. **Idempotency and retry — fails closed, retry needs a read.** `init` is
   idempotent (probe above). `task create` retry fails safely but only after
   the state advanced; recovery requires the revision loop. `preference retire`
   on a missing id errors clearly.
8. **Compatibility and deprecation — absent.** No `--version`; no deprecation
   notices. Version knowledge must come from outside the CLI (git, README).
9. **Help and examples — top-level only.** Usage names commands and flags but
   shows no type/default/required detail per flag, and no copy-pasteable
   noninteractive example per verb; subcommand help is absent entirely.
10. **Shell invocation safety — observed good.** No editor/TTY prompts found;
    all probes completed without hang; secrets are not echoed; `hook` reads
    stdin JSON (explicit contract); `statusline` degrades without TTY;
    launcher exits 127 with a clear message when Bun is missing (tested in
    [`test/source-runtime.test.ts:82`](test/source-runtime.test.ts)).

## Principal contradiction

**No subcommand-level help exists.** Every one of the 19 command families
below the top level fails its own `--help` with exit 2 and an unrelated
error, and `--version` does not exist. Because agents form first invocations
from the CLI surface, every fresh activation (worker, Work Cell, hook
consumer) pays a full governing-prose re-read or source inspection before
its first correct call, and every typo lands in an undifferentiated exit-2
parse error. This is the single mismatch whose repair most changes downstream
invocation cost, and it is fully backward-compatible to fix.

- **Owner of the contradiction:** the Workbench CLI contract in
  [`src/cli.ts`](src/cli.ts) and its dispatch table — not the skill, not
  domain policy.
- **Observation that would disconfirm it:** committed agent transcripts or
  hook logs showing correct first-try invocations formed purely from the CLI
  (i.e., discovery cost already borne elsewhere and never repeated). In that
  case the principal contradiction shifts to mutation ergonomics (revision
  loop, no `--dry-run`) — see finding T2.
- **Compatibility boundary:** repair is limited to additive help text,
  `help <command>`, and `--version`; no existing spelling, exit code, output
  shape, or flag semantics may change. Any rename or re-semantization is a
  breaking change for the CLI owner to authorize separately.

## Non-CLI-owner boundary case

Request: *"make the conversation composer preview pending contribution leases
before a batch is committed."* This is a conversation-UI/composer product
request owned by [`src/ui/`](src/ui) and [`src/conversation/`](src/conversation),
not by the CLI contract. Routing it to `cli-surface` would change a UI
projection through a shell grammar and mislocate the owner; it must be routed
to the composer/UI owner instead. The same holds for requests about how the
Workbench browser UI validates task results before acceptance — the CLI
`task submit` retains claims, but UI-side verification owns the UI action
([`src/ui/task-verified-result.ts`](src/ui/task-verified-result.ts)).

## Tiered findings (ranked by cost to the named agent action; not a score table)

- **T1 (principal contradiction).** Subcommand `--help`, `help <command>`,
  `--version` are absent across all families. Repair removes the largest
  recurring discovery cost and gives failure output a first-class escape
  hatch.
- **T2.** Revision loop transparency and retry cost: every existing-Task
  mutation needs both the `--expected-source-revision` and
  `--expected-revision` guards fetched first (`task create` accepts only
  `--expected-source-revision`; a new Task has no prior Task revision to
  guard), and one stale failure reports only the first failed guard with its
  current value — no fresh Task snapshot, no second current guard — so when
  both drifted, recovery costs another `task show` plus one more retry.
  Repair: return the fresh Task snapshot and both current guard values with
  the stale failure; state the revision grammar in each subcommand's new
  help.
- **T3.** Undifferentiated error surface: one exit code (2) for outer-parser
  usage and state failures (hook fallbacks and the missing-Bun launcher are
  the exceptions); `rosso:` prefix vs `rossovia` binary name; no error
  categories. Repair: distinguish usage errors (still exit 2, message points
  at `rossovia help <command>`) from state failures; fix the prefix.
- **T4.** `mission` family grammar drift: cwd-dependent default root,
  `--root`-must-be-first, bare-path `init`/`prune` output, silent success on
  `focus`/`suspend`/`resume`/`settle`/`close` (`init`/`prune` are mutating
  path-returning commands, not silent), no `--home`. Repair: JSON for all
  outputs, help text documenting root resolution. Implemented — see the
  update below.
- **T5.** Read/effect boundary invisible: no `--dry-run`/`--check` forms, help
  does not mark mutating verbs. Repair: mark mutation in help; defer
  `--dry-run` to owner as a semantic addition. Implemented — see the update
  below.
- **T6.** `hook`/`statusline`/`intervention`/`correct` side channels
  (stdin payloads, `$TMPDIR` state, non-home state roots) are under-documented
  in the flat top-level help. Repair: per-command help (T1) with payload
  contract notes.

## First minimal implementation packet (not executed in this Task)

- **Owner:** Workbench CLI contract — [`src/cli.ts`](src/cli.ts) plus
  [`test/`](test/) as the regression surface. Human authorization required to
  start; this audit makes no product change.
- **Packet:** add a per-command usage table; when `--help`/`-h` is the final
  argument of any command path (or a `help <command>` spelling), print that
  command's usage and exit 0; add `--version` (package version
  `@rosso/workbench`); add a top-level pointer `run 'rossovia help <command>'
  for per-command usage`. Purely additive; zero change to previously valid
  non-help invocations, outputs, or exit codes. Existing subcommand
  `--help`/`-h` calls are the deliberate exception: they change from exit 2
  to exit 0 with usage on stdout.
- **Tests (ordinary entry path):** spawn the launcher from
  `test/workbench.test.ts` style for every family (`task --help`, `task create
  --help`, `mission list --help`, `init --help`, `statusline --help`, …):
  assert exit 0, usage on stdout, empty stderr; assert `--version` matches
  `package.json`; assert help touches no state (run with `ROSSO_HOME` pointing
  at an unwritable path); keep the existing invalid-call error tests green to
  prove no semantic drift. Boundary test: a genuinely invalid call (e.g.,
  `task show`) must still exit 2 with its current message.
- **Compatibility:** T1-only changes are backward-compatible by construction;
  T2–T6 items marked "Repair" above are proposals for the owner, not part of
  this packet.

## T4 implementation update (post-audit)

T4 is implemented at a Workbench head that follows the audited revision; the
public mission invocation/output contract changed as recorded here. This
section is the migration notice for consumers of the prior surface.

- `--root <path>` follows one composable grammar instead of
  must-precede-the-subcommand: it occupies exactly one of two family slots —
  one leading pair before the subcommand or one final pair after all verb
  arguments. Leading plus trailing is duplicate usage, and missing and
  duplicate roots are typed usage errors (exit 2) pointing at the nearest
  mission help path ([missions.ts:357](src/missions.ts)); arity and option
  failures keep the same T3 typed usage behavior. Any other `--root` token
  stays with the verb's own option values, so values such as
  `--title --root` keep persisting.
- The default mission root `<cwd>/operations/missions` (resolved to an
  absolute path) is documented in the mission family and every verb's help,
  together with the note that Workbench `--home` never relocates Git-tracked
  Mission records. Help resolution ignores `--root` tokens in the same two
  family slots, so `mission --root <path> list --help` and
  `mission list --root <path> --help` print the list usage.
- Every successful mission command prints one JSON object on stdout with empty
  stderr. `init`/`prune` receipts replace the prior bare path string;
  `add-branch`/`focus`/`suspend`/`resume`/`settle`/`close` replace prior silent
  success. Receipts name the action, exact mission, resolved root, record
  path, and resulting state projection. `list`/`status`/`check` output shapes
  and Mission domain/effect semantics (validation, Git tracking, focus rules)
  are unchanged.
- Migration notes for the prior bare/silent output: scripts that consumed the
  bare `init`/`prune` path must read the receipt's `path` field instead, and
  scripts must stop treating empty stdout as silent success for mutating
  verbs.

## T5 implementation update (post-audit)

T5 is implemented at a Workbench head that follows the audited revision; the
help surface now exposes one source-backed effect classification per
executable verb path.

- The shared help table in [`src/help.ts`](src/help.ts) carries one `effect`
  label per verb — `read-only`, `writes-state`, or `starts-work` — classified
  from each dispatch owner's source. `read-only` is reserved for success paths
  that write no state and start or control no execution; `writes-state` marks
  paths that may write Workbench home, session, managed, or Git-tracked
  Mission state; `starts-work` marks paths that may start or control an
  execution: `task run` launches or resumes a worker execution, and `hook
  artifact` may return a hook followup message that continues an active Agent
  run. A family's label is derived from its subcommand verbs at render time,
  so a family can never disagree with its own verbs.
- Top-level, family, and verb help render the labels consistently and
  compactly. Top-level help appends one `(label)` to every command line and
  prints a three-line legend; mixed families are marked `(mixed)` and list
  each subcommand's label, so an agent can drill down to the exact verb
  without guessing. Verb help prints an `effect: <label>` line directly under
  the usage line.
- The labels describe the possible effect on the success path. They are not
  authorization, a preview, a `--dry-run`, or an atomicity promise, and no
  `--dry-run`/`--check` form was added. The classification serves help
  rendering only — dispatch never reads it as a permission, gate, or
  execution control, and no parser, stdout/stderr, exit-code, or domain
  semantics changed outside the new help lines.
- Classification notes: `hook artifact` may write its `$TMPDIR` consistency
  state when a payload carries relevant changed paths, but its Cursor stop
  path can return `followup_message` and continue the active Agent run, so
  its label reads `starts-work`; `hook intervention` remains `writes-state`,
  and the `hook` family label therefore derives `mixed`.

## Verification of this audit

- Commands and evidence recorded above are real outputs at revision
  `4efe518`.
- Named checks (same order as
  [`.github/workflows/verify.yml`](../../.github/workflows/verify.yml) for the
  Workbench): `bun install --frozen-lockfile` in
  `packages/work-cell`, `packages/cognition`, `operations/autonomy`,
  `operations/workbench`; `bun run typecheck` (0 errors) and `bun test` (496
  pass, 0 fail) in `operations/workbench`; `typecheck` green in the two
  dependency packages required by the Workbench compile.
- `git diff --check` clean; links in this record resolve against worktree
  HEAD.

## Residual uncertainty and human decision

- Agent invocation evidence beyond this audit is unverified (no transcript
  archive in-repo); the disconfirming observation for T1 must come from real
  transcripts or hook logs if the owner disputes it.
- `setup apply`, `task run`, `reconcile-attempt`, `contribution
  reconcile-lease`, and hook payloads were not executed (effect-bearing);
  their behavior claims rest on source reading and existing tests.
- Human decision required: authorize the T1 packet (or nominate the alternate
  principal contradiction from T2), and decide whether `--dry-run` forms (T5)
  are worth a semantic change to the contract.
