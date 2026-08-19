# Changelog

Entries use stable functional-module prefixes so agents can inspect only changes
that affect selected capabilities. `Action` is `none`, `reapply`, `manual`, or
`breaking`. Entries are append-only after publication; corrections add a later
entry instead of rewriting the applied Git interval.

## 2026-08-18

### [repo.layout] Rename operations/ to apps/

- Action: `breaking`
- Change: rename the top-level runtime directory `operations/` to `apps/`
  (225 files: `apps/workbench`, `apps/autonomy`, `apps/missions`) so the
  Rossovia runtime modules sit beside `packages/` in the standard monorepo
  naming and the abstract "operations" label no longer hides an application
  tree. All active references were synced: code, tests, mission-record
  convention paths (`join(root, "apps", "missions", ...)`), CLI help, ignore
  rules, CI workflows, and repository documentation. `design/operations/`
  (design documents) is untouched.
- Verify: run the Workbench typecheck and full test suite (820/820) and the
  Autonomy focused suites; confirm `LOCAL_BIN=<tmp> bun run build:local`
  installs and serves `rossovia --version` and the workbench UI; confirm no
  new broken markdown links versus the pre-change tree.

### [workbench.build] Local single-file build and install

- Action: `none`
- Change: add `bun run build:local` (scripts/build-local.ts) that compiles the
  Workbench CLI and the Autonomy runner into standalone binaries with
  `bun build --compile` and installs the pair into `~/.local/bin` as
  `rossovia` and `rossovia-autonomy`. UI assets are embedded through a
  generated module (`scripts/generate-ui-assets.ts`, `assets:generate`), the
  package version is inlined as a JSON import, and lazy `createRequire` loads
  of sibling Work Cell/Autonomy modules became direct `require` calls so the
  bundler statically includes them. The Workbench binary finds its Autonomy
  sibling at runtime (`ROSSOVIA_AUTONOMY` overrides).
- Verify: run `LOCAL_BIN=<tmp> bun run build:local`; assert
  `<tmp>/rossovia --version`, `worker list`, and `ui` serve the workbench
  page and snapshot without the source checkout; run the Workbench typecheck
  and test suite.

### [workbench.ui] Serve the Principal Workbench through the rossovia CLI

- Action: `none`
- Change: add `rossovia ui [--port <port>] [--root <path>]...` (starts-work)
  as the ordinary entry for serving the Principal Workbench web UI on
  127.0.0.1:4317. The CLI form reuses the server's exact option semantics and
  the leading-global `--home`; `bun run --cwd apps/workbench ui` remains
  the equivalent source-checkout entry. Help, the Workbench README, and the
  scoped Workbench agent instructions now route UI startup through the CLI.
- Verify: run the Workbench typecheck and test suite (new `ui-cli` test spawns
  the launcher, waits for `/api/snapshot`, asserts the served page and
  snapshot, and confirms a clean SIGTERM stop); open `http://127.0.0.1:4317`.

### [repo.layout] Upgrade repository directory structure

- Action: `breaking`
- Change: lift `regeneration/evaluations/` to the repo-root `evaluations/`
  (655 files; the directory name now matches its durable-evaluation content),
  merge the stale `development-log/` into `chronicle/projections/` as the first
  retained projection, declare `experiments/` and `design/research/` in the
  Repository map with owns/does-not-own boundaries, and remove `outputs/`
  (personal files) and `.work-cell/` (242M runtime data) from the workspace
  after backing up their unique untracked content. All active path references
  were synced, 178 link regressions from the directory lift were repaired, and
  19 stale `packages/work-cell/src/*` migration links were re-pointed to
  `src/integrations/ai-sdk/`.
- Verify: run Work Cell, Autonomy, and human-agent-visualization test suites,
  the Chronicle/sequence snapshot self-checks, and the site build with link
  verification; confirm repo-root markdown link baseline has no new broken
  links versus the pre-change tree.

## 2026-08-06

### [work-cell.model-evaluation] Add matched instruction-carrier comparisons

- Action: `manual`
- Change: model-evaluation v3 can compare two explicit instruction carriers
  over one shared execution member, retaining carrier, semantic-audit, fixture,
  schedule, and observed-identity evidence without exposing harness-owned arm
  metadata to the blind judge. Carrier comparisons pin the source fixture by a
  caller-declared aggregate digest before any driver or model call. Legacy v2
  manifests retain execution-profile semantics only.
- Verify: run the Work Cell typecheck and tests; confirm carrier comparisons
  reject unequal execution members, unpinned fixtures, and empty carriers, and
  skip judging after an observed serving identity mismatch.

### [skill.attention-management] Add governing-relation attention control

- Action: `none`
- Change: add an installable Skill for deciding whether a live Agent should
  continue, retain a load-bearing branch, return, switch, cue, or reset. Preserve
  integrated-character, role-entry, catchphrase, and habit-action conjectures
  in a source-linked research ledger without treating them as admitted behavior.
- Verify: check the generated Sequence snapshot and disposable installation
  package. Run matched action-level comparisons before adopting any experimental
  carrier or runtime adapter.

## 2026-08-05

### [experiment.personal-task-app] Add a local-first personal task slice

- Action: `none`
- Change: add a Chinese-primary browser app for capture, projects, Today,
  one-current-task focus, close-out, and Review over one canonical local store.
  Failed loads preserve the unreadable payload instead of allowing a later
  empty-state write to replace it.
- Verify: run the app tests and build check, then follow the browser walkthrough;
  confirm a second capture draft survives the first success toast disappearing.

### [experiment.human-agent-visualization] Add two frozen evidence lenses

- Action: `none`
- Change: add runnable Execution Boundary and Skill lenses that keep retained
  sources, rebuildable projections, and Agent explanations visibly distinct.
  Source-only mode suppresses derived comparison cues, and every Skill standing
  exposes its derivation layer and reconstructable evidence sources.
- Verify: rebuild the fixtures, run their validation tests and browser build,
  then inspect both lenses at desktop and mobile widths.

### [skill.document-writing] Let material constrain supported length

- Action: `none`
- Change: make source density constrain document scope and length, and add a
  paragraph-delta plus reversible compression probe without introducing fixed
  thresholds or surface-form bans.
- Verify: check the Sequence snapshot and disposable installation package;
  behavior improvement remains unproven until a matched comparison is run.

## 2026-08-04

### [work-cell.budget-approval] Add same-run soft-budget approval

- Action: `none`
- Change: AI SDK Work Cells pause ordinary tools at a completed-step soft-budget
  boundary, then either settle from reserved capacity or ask a host callback for
  an exact step/time increase and continue in the same run and transcript.
- Verify: run the Work Cell core and AI SDK driver tests; confirm allow applies
  exact sequential increments, denial and callback failure settle without later
  ordinary tools, and caller/hard limits dominate every phase.

### [workbench.statusline] Make the handled project the only persistent identity

- Action: `none`
- Change: Claude displays its session name with a registered-project/basename
  fallback; Codex displays only the native thread name in the footer and
  terminal tab. Task, runtime, and multi-Agent detail remain on their owning
  surfaces.
- Verify: name two Claude/Codex sessions for different projects while both use
  the Rossovia root; confirm each footer and Codex tab shows only its own name.

### [workbench.statusline] Project the current work locus through host-native surfaces

- Action: `none`
- Change: Claude Code invokes the read-only Rossovia locus and task-queue
  projection, while Codex uses its native project, directory, branch, and plan
  progress fields because its footer does not accept external commands.
- Verify: open this repository in each trusted host; confirm Claude shows the
  current Git path, branch, dirty state, and explicitly scoped task queues, and
  Codex shows only its supported native fields.

## 2026-07-23

### [workbench.setup.multi-agent-delegation] Add tool-neutral delegation setup

- Action: `reapply`
- Change: `rossovia init --setup multi-agent-delegation` selects tool-neutral
  delegation judgment; the initial Codex adapter renders it as a managed user
  instruction without prescribing one harness's agent or tool mechanics.
- Verify: give the agent two bounded independent tasks and confirm that it uses
  the active environment's supported delegation while retaining synthesis and
  verification.

### [workbench.intervention] Distinguish task switches from corrections

- Action: `none`
- Change: the intervention reminder records a correction only when a Principal
  message revises an assumption or constraint of a still-active task.
- Verify: start a new task after completing the prior task and confirm that no
  correction receipt is recorded.
