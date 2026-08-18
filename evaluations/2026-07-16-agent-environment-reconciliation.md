# Agent Environment Reconciliation Probe

**Status:** action, command-evidence, and boundary behavior observed; comparative attribution unproven
**Date:** 2026-07-16
**Target expression:** [`agent-environment`](../skills/agent-environment/SKILL.md)
**Design boundary:** [decision 035](../design/decisions/035-portable-agent-environment.md)

## Claim and disconfirming observations

The first expression claims that a user can keep a non-secret personal workflow
source, reconcile its evolution into Codex, Cursor, and Claude Code projections,
preserve target-local state, and migrate to another device without copying
credentials, sessions, or opaque vendor directories.

The claim would be defeated if the agent mirrored a vendor home directory,
overwrote target-only configuration, treated a UI observation as a writable
source, fabricated semantic parity, supplied an unverified command, or called a
file write complete without an ordinary-entry/manual verification boundary.

## Read-only machine audit

A value-redacted audit of the development machine found Codex CLI `0.144.4`,
Claude Code `2.1.207`, Cursor and Cursor Agent present. User-level Codex, Claude,
and Cursor configuration surfaces and shared skill directories existed; no
`chezmoi` executable or conventional dotfiles/chezmoi source was observed.
Authentication status commands exited successfully for Codex and Claude Code
and unsuccessfully for Cursor Agent. No credential value, configuration value,
session, cache, or opaque application database was printed or ingested.

The first audit shell probe was discarded because it assigned to zsh's special
`path` variable and accidentally replaced `PATH`, producing false tool-absence
results. The corrected probe used a non-special variable and returned the facts
above. This failure supports keeping the Skill instruction-led until a repeated
mechanical invariant justifies a script.

## Three-way reconciliation action

**Raw task:** reconcile an isolated target from `workflow-v1` to an approved
`workflow-v2` using the prior source and receipt as baseline. The target carried
local Codex and Claude instructions, Claude JSON settings, a Cursor user-rule
observation, a fake credential, and a fake session. The Cell could write the two
managed instruction projections and a report, but could not run commands.

**Executor:** Work Cell run `e915bbfd-fe5f-48e6-ac4c-0334d465d2f3`, served by
OpenCode Go `deepseek-v4-flash` through the preferred validation route.

**Observed action:** the run:

- distinguished source delta from unchanged target drift;
- changed only the delimited Codex and Claude blocks from v1 to v2;
- retained both target-only instruction notes and the entire Claude settings
  file;
- left the Cursor observation, fake credential, and fake session unchanged;
- classified Cursor user rules as a manual Settings projection;
- called the required `finish_reconciliation` terminal tool with status
  `partial`; and
- wrote a receipt that reserved ordinary-entry verification and authorization
  for later human/tool action.

The raw Work Cell record was retained locally under the ignored `.work-cell/`
evidence area. It passed its file, artifact, and terminal contracts. This
supports the principal three-way action, preservation, and exclusion behavior.

## Failure and command-evidence correction

The full run's prose invented a plausible skills installer example even though
no current CLI help or web surface was available. A first focused counter-probe
(`e784f869-f69e-42ae-be6f-fdc5fbb841ec`) then stated that no exact command was
admitted but still copied exact commands from the bundled tool reference into
its residual actions. Instruction emphasis alone did not overcome the visible
command attractor.

The expression was corrected in two layers:

1. exact commands and configuration keys now require activation-local official
   documentation, inspected help, or runtime diagnostics in the receipt; and
2. the bundled tool reference no longer contains mutable skill update/list
   commands, only the official discovery route and evidence requirement.

Focused run `15b9bd02-8697-4a65-a7f0-a8bf7d57d272` then classified the action
`lookup-required`, omitted an update/install/list command, preserved package
provenance, and required target-local help plus later discovery verification.
It used 6,586 total tokens and changed no files. The correction therefore
changed the failed behavior without adding a runtime or vendor schema.

## Boundary probe

Fresh Work Cell run `082f617d-05d4-458a-a1b1-9902559b5af0` received a
repository-specific failure: agents ignore a checked-in release checklist and
skip the project verifier. It selected `improve-agent-workflow`, identified
project instructions/verifier as the likely owner, and explicitly declined a
user profile, migration, or cross-device setup. It used 5,741 total tokens and
changed no files.

## Estimate audit

The full action estimated 18,000 total tokens and observed 82,561: a 359%
relative miss, outside the declared 100% tolerance. Of 78,556 input tokens,
72,064 were cached. Ten tool-loop steps repeatedly carried the stable Skill and
fixture context; the semantic work was good, but the caller forecast counted
neither repeated cached input nor the file-by-file action path. Future
equivalent full reconciliation probes should estimate the whole loop from
observed step count and context, or use a smaller fixture when testing only one
gate. The estimate miss does not justify a low runtime ceiling or a third full
rerun.

## Structural and packaging gates

- The current system skill validator accepted `skills/agent-environment`; its
  unbundled PyYAML dependency was supplied through a temporary `uv` environment.
- `scripts/probe-skill-installation.py agent-environment` installed an
  11-file disposable source snapshot and verified identical packaged content.
- Every current `scripts/test-*.py` file passed when executed directly. An
  earlier `unittest discover` invocation ran zero tests because the files use
  hyphenated names; that empty result was discarded rather than reported as a
  pass.
- Work Cell typechecking and all 91 Bun tests passed.
- The site projected 16 skills, passed Astro diagnostics and production build,
  and Linkinator scanned 17 built links successfully.
- `git diff --check` reported no whitespace errors.

## Independent whole-change review

Read-only Work Cell run `076e9a6e-c303-419f-b5d3-ed246d8ad0cd` reviewed the
whole staged change through the `code-review` method, including the accepted
decision, every Skill command and direct reference, the behavioral evidence,
and the README, design, and site-catalog consumers. It proposed
`ready_with_residual_risk` and found no workflow-reconciliation, secret-boundary,
command-evidence, packaging, or routing defect.

The reviewer raised two scope observations: the Chinese catalog and site
manifest also admitted the already-existing `code-review` and
`project-cognition` Skills that the public catalogs had omitted. These are
retained as intentional catalog-completeness corrections in the same publication
slice. They change no Skill runtime or accepted method; the commit and review
record name them rather than hiding them as unrelated behavior.

The review estimated 30,000 total tokens and observed 441,503, including
308,224 cached input tokens. The 1,372% relative miss is outside its declared
150% tolerance. The reviewer repeatedly re-read a 1,066-line staged change
through one Cell and first reached a natural finish before the terminal-contract
recovery required `finish_review`. The recovery worked, but a future review of
this scale should use semantic packets or a prepared diff/model artifact rather
than repeatedly carrying the whole repository surface through one loop. This is
an orchestration and estimation observation, not evidence against the reviewed
Skill.

## Disposition

The Skill form and its setup/reconcile/migrate/verify split are supported for a
first installable slice. Action compatibility is observed, but no matched
baseline without the Skill was run, so improvement attribution remains
unproven. Reopen if a real second-device use cannot recover an applied baseline,
if tool-local improvements repeatedly fail to return as explicit source
candidates, or if structural merges recur often enough to justify a small
deterministic adapter.
