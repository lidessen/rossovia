# Current Stage Review Packet

**Status:** reviewed — independent evidence retained and preparation-verified
**Review target:** `d66a125d04ad8294dbfe6742ba007ab9a5f3015b`
**Base:** `origin/main` at `89d6a85725a1be22eaa188c1f1a6b1840c604006`
**Mission:** [`formal-operations-transition`](../../../operations/missions/formal-operations-transition.json), branch `current-stage-integration`
**Authority:** evidence packet only; it cannot accept, push, merge, or broaden the review

## Review question

Does this 16-commit stage form one coherent, Sequence-faithful and operationally
safe integration candidate, or does a material defect require return to a named
owner before a PR is opened?

The target changes 205 paths (`+25,724/-906`). File count is not a quality
metric; it indicates that a diff-only pass is insufficient. Inspect the named
owning sources and trace material changes into their callers, projections, and
verification surfaces. Findings must cite exact files and lines, state impact,
and distinguish a blocking defect from a residual or historical record.

## Review partitions and dependency routes

### A — General Work Cell runtime and research boundary

**Owning decisions:** [general Swarm runtime](../../decisions/025-general-work-cell-swarm-runtime.md)
and [general core / Sequence adapter](../../decisions/027-general-work-cell-core-and-sequence-adapter.md).

**Primary surfaces:**

- `packages/work-cell/src/contracts.ts`, `driver.ts`, `run-cell.ts`,
  `workspace.ts`, `swarm.ts`, `concurrency.ts`, and `index.ts`;
- `packages/work-cell/src/adapters/{sequence,experiment,deliberation}/`;
- `packages/work-cell/src/research/` and `packages/work-cell/experiments/`;
- `packages/work-cell/src/cli.ts`, package scripts, README, and all 14 test files.

**Impact route:** serialized inputs → contract parsing → driver/workspace
authority → retained run/swarm records → CLI projection. Separately check the
public barrel and CLI so research or Sequence vocabulary does not re-enter the
general core by convenience.

**Principal review questions:**

1. Can a non-Sequence caller execute a Cell without domain vocabulary?
2. Do Swarm concurrency, shared-workspace, ordering, and persistence boundaries
   fail closed under real caller input?
3. Are adapter evidence and research mechanisms prevented from gaining core or
   acceptance authority?
4. Did the no-compatibility migration leave an active caller or document on a
   removed import/contract?

### B — Agent methodology reconstitution

**Owning decisions:** [context engineering replaces harness](../../decisions/026-context-engineering-reconstitutes-harness.md)
and the accepted [structural refactoring evaluation](../../../regeneration/evaluations/2026-07-14-structural-refactoring-skill-probe.md).

**Primary surfaces:**

- removal of `skills/harness/` and addition of `skills/context-engineering/`;
- `skills/structural-refactoring/`;
- updates to `skill-engineering`, `disciplined-development`, root agent
  instructions, README routing, snapshots, and archive descriptions.

**Impact route:** user intent → skill description trigger → SKILL method →
conditional references → packaged Sequence snapshot → README/site discovery.

**Principal review questions:**

1. Does `context-engineering` own information delivery without becoming a
   universal project harness or duplicating skill engineering?
2. Does deleting the active harness leave only explicitly historical references?
3. Does structural refactoring preserve behavior/authority rather than becoming
   a generic implementation workflow?
4. Are all portable skills usable alone with generated, source-identifiable
   Sequence snapshots?

### C — Public expression, visual method, and project website

**Owning decisions:** [site UI-method pilot](../../decisions/028-project-site-ui-method-pilot.md),
[visual-design skill](../../decisions/029-visual-design-skill.md), and
[agent-workflow improvement entry](../../decisions/030-improve-agent-workflow.md).

**Primary surfaces:**

- `site/`, `vercel.json`, README, retired-domain record, and Vercel projection;
- `skills/visual-design/`, its selective reference library, and evaluation;
- `skills/improve-agent-workflow/`, its handoff to `skill-engineering`, and
  evaluation;
- the source-to-guide projection in `site/scripts/sync-content.mjs`.

**Impact route:** accepted Markdown source → manifest-selected projection →
Astro content/navigation → generated page and links. Separately trace visual
guidance from concrete content/attention into tokens and layout; do not accept
the Skills site's treatment as a portable default.

**Principal review questions:**

1. Does the site remain a rebuildable projection rather than a new skill or
   design authority?
2. Can a materially different project use `visual-design` without inheriting a
   fixed style?
3. Do `improve-agent-workflow` and `skill-engineering` have an actionable,
   non-competing ownership boundary?
4. Are install/use instructions true for an external user and safe for a
   maintainer of this checkout?

### D — Operations, evidence, and recovery

**Owning sources:** [operating protocol](../../operations/OPERATING-PROTOCOL.md),
[Observation Chronicle](../../../chronicle/README.md), and
[formal transition strategy](2026-07-15-formal-operations-transition-strategy-case.md).

**Primary surfaces:**

- `.github/workflows/verify.yml`, `.gitignore`, Mission Record changes, and
  preparation records;
- Chronicle incident record and install-probe implementation/tests;
- Sequence snapshot generator changes and site/skill validation paths.

**Impact route:** human authorization → Mission Record/worktree → local checks →
PR verify → AI review packet → Principal disposition → branch return and
recovery evidence.

**Principal review questions:**

1. Does a green workflow now cover the deterministic contracts the transition
   actually depends on?
2. Can install verification ever expose the live source tree as an installer
   target, including through a symlink alias?
3. Do Chronicle, Mission Record, Git, and generated projections retain distinct
   authority and lifetimes?
4. Does any current record claim independent review, semantic acceptance, or
   formal-operation completion that has not occurred?

## Current mechanical evidence

At the review target plus the CI-test correction included in that target:

- all packaged Sequence snapshots pass `--all --dry-run`;
- Chronicle validates eight records and its validator tests pass;
- Mission Record tests and the active transition record check pass;
- Work Cell installs with its frozen lock, typechecks, and passes 69 tests
  across 14 files (300 assertions);
- the site passes a cold `npm ci`, Astro reports zero diagnostics, eight pages
  build, and 17 internal links/fragments return 200;
- intervention reconciliation and five install-safety tests pass;
- the two new skills pass structural validation and disposable installation
  hash checks (20 `visual-design` files and 12 `improve-agent-workflow` files).

These checks establish declared deterministic behavior and packaging. They do
not establish semantic fitness, independent review, production traffic, or
human aesthetic acceptance.

## Prior invocation disposition

Run `e63a2355-9af6-4d89-8701-c5c3ed5f5576` inspected repository sources but
did not retain a structured review. Its recovery loop called `submit_review`,
then the runtime read the empty main-loop output and settled as `failed` with an
incorrect zero-token usage. The [Chronicle receipt](../../../chronicle/records/2026/07/obs-20260715-current-stage-review-output-recovery-failure.json)
retains the reconstructed 3,281,432-token audit and its limitations. The
runtime correction and regression test are included in this review target.
This failed run is operational evidence only; none of its lost prose is a
finding, recommendation, or independent review.

The separately authorized corrected rerun settled successfully. Its
[Chronicle receipt](../../../chronicle/records/2026/07/obs-20260715-current-stage-independent-review-rerun.json),
[content committee report](2026-07-15-current-stage-content-committee-review.md),
and [preparation operational review](2026-07-15-current-stage-preparation-operational-review.md)
retain the raw recommendation, factual dispositions, execution audit, and next
gate. The preparation verifier rejected the report's alleged partition-C
blocker using target-tree evidence and a fresh successful site build.

## Known residuals and exclusions

- [PR #16](https://github.com/lidessen/skills/pull/16) remains a separate return
  obligation. Its Chinese README and Sequence-rendering work are not part of
  this target and must not be mistaken for accidental deletions here.
- The sibling PR #16 worktree contains 129 staged entries not represented by
  its PR. They are recovery-protected but explicitly excluded from this review;
  do not read them as dependencies unless a target source proves the link.
- `bun src/cli.ts swarm --help` currently treats `--help` as a manifest path and
  returns `ENOENT`. This is a retained AX observation, not a blocking contract
  claim in the current decisions.
- The 256-Cell deterministic path is tested; the retained live smoke exercised
  four concurrent provider calls, not 256.
- `visual-design` remains provisionally verified and requires real human review
  in a second product context before stronger acceptance language.
- The self-install incident lacks pre-incident hashes for two formerly
  untracked packages; current package contents have independent structural and
  disposable-install evidence.
- The site cold install reports two dependency install scripts awaiting npm's
  optional `allowScripts` review, but install/build succeeds with zero audit
  vulnerabilities. Treat this as supply-chain follow-up, not hidden proof of
  safety.

## Required reviewer output

Return:

1. risk-ranked findings with exact source locations and downstream impact;
2. a partition-by-partition disposition: fit, fit with residual, or return;
3. any context or caller route inspected beyond the diff;
4. the strongest unchanged/hold case;
5. a final recommendation: open one integration PR, return a named partition,
   or hold for one bounded discovery;
6. explicit limits of the review.

No finding may be resolved by changing files during this review. The reviewer
submits evidence to the preparation group; only the Principal later decides PR
integration.
