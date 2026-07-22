# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Guiding Principles

### Principles over rules

Skills should help agents understand *why*, not just specify *what*. A skill that explains reasoning and principles produces better judgment across novel situations than one that mechanically lists rules. Favor broad principles over rigid prescriptions — give the agent enough context to generalize, not just enough rules to comply. ([Anthropic's constitution](https://www.anthropic.com/constitution): "If we want models to exercise good judgment across a wide range of novel situations, they need to be able to generalize — to apply broad principles rather than mechanically following specific rules.")

### Hierarchical context management

Agent context is finite — place stable orientation before scoped action,
task-specific methods on activation, and volatile detail on demand, then map
those timings to the actual runtime surfaces rather than assuming universal
L1/L2/L3 containers. Keep SKILL.md under 500 lines; split details into supporting
files. See [context-engineering](skills/context-engineering/SKILL.md) for the
delivery method and the [Agent Skills Specification](https://agentskills.io/specification#progressive-disclosure)
for the underlying progressive-disclosure surface.

### Separate mechanism, adapter, and policy

When an implementation claims to be reusable, keep three decisions distinct:
the mechanism owns invariant control flow and evidence, an adapter owns one
external system's protocol and error semantics, and policy owns today's
ordering, defaults, credentials, budgets, and product choice. Do not force this
split onto a one-off implementation that has no demonstrated variation.

Before accepting a reusable mechanism, run a substitution probe: replace one
current provider, model, artifact kind, or default strategy with a plausible
alternative. If the mechanism must change only because an identifier, endpoint,
request shape, pricing rule, or preference changed, move that knowledge into an
adapter or policy. Verify the boundary at all three levels: mechanism tests use
neutral identities, adapter tests retain concrete quirks, and one integration
probe proves the current policy solves the actual project problem.

## Project Overview

This is a collection of agent skills — reusable methodology plugins for AI-assisted development. Skills are installed into a project and invoked via slash commands (e.g., `/design-driven`).

## Rosso workbench entry

Treat a natural-language request to initialize, extend, register, or use the
Rosso workbench as an instruction to operate the existing workbench entry. Do
not make the human translate the request into CLI syntax. Select only the
mechanical action their words authorize:

- Before initializing the default home, if `~/.rosso` is absent and the legacy
  `~/.atthis` exists, run `python3 scripts/rosso.py migrate`. Do not create a
  second writable home or migrate when the target already exists.
- To initialize the workbench, run `python3 scripts/rosso.py init` and include
  one `--workspace-root <path>` for each root they explicitly supplied. Do not
  infer or scan `$HOME` when no root was supplied; an empty initialized home is
  valid, and roots can be added later.
- To add a later workspace root, run
  `python3 scripts/rosso.py root add <path>`. Discovery remains bounded and
  does not register the repositories it finds.
- To register a project, require an explicit local Git root and a verified
  stable project ID. Prefer a provider's immutable repository ID when one can
  be verified; otherwise ask for an explicitly assigned ID. Treat requested
  spoken names as aliases, never as identity, then run
  `python3 scripts/rosso.py register <path> --id <id>` with one `--alias`
  argument per alias.
- To continue or resume a named external project or task, extract the smallest
  intended name and run:

```text
python3 scripts/rosso.py resolve <name>
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
`python3 scripts/rosso.py scan` only when stale discovery is plausible. A
result marked `discovered` is a verified current location, not a stable project
identity or durable alias. Do not turn a natural-language request into broader
setup, marketplace search, automatic registration, or inferred task state.

## Rosso preference entry

Treat an explicit natural-language request to remember, change, inspect, or
forget a personal default as authority to use the existing preference commands;
do not require the human to translate it into CLI syntax. Preserve the strength
of their wording: a preference remains a defeasible default, not a requirement.
Before a preference operation, apply the legacy-home guard above, then run
`python3 scripts/rosso.py init` without workspace roots. This is an idempotent
source initialization or completion and does not broaden discovery; it lets an
existing or new Rosso home acquire the preference files without making the
human perform setup first.

- Keep a session-only preference in the conversation and do not persist it.
- Use `python3 scripts/rosso.py preference set <id> --scope user --statement
  <text>` for a personal default intended to survive this session.
- Use `--scope machine` only when the person limits the default to this device
  or it depends on machine-local capabilities. Availability and quota remain
  observations, not preferences.
- Add `--project <registered-name>` for a personal default limited to one
  registered project. Put shared project requirements in that target
  repository's governing source instead of Rosso.
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

## Rosso cross-project task entry

When the human asks for work in progress across registered projects, run
`python3 scripts/rosso.py project list`. Preserve its `complete` flag and each
project's availability status. For every available project, read its returned
instruction files—and no conventional filenames that were not returned—before
using only the task-continuity source that project declares. Run every relative
target command with its working directory set to the returned workspace path;
never reuse the Rosso workbench directory for a different project's query.
Report a project with no declared source as `unsupported`; do not infer
commitments from Git branches, PRs, Issues, logs, or repository names. Mark the
combined task view incomplete when the project inventory is incomplete or any
project is unverified, unsupported, or returns invalid task output. Once a
declared task query returns a valid projection, aggregate only that output; do
not open its underlying records merely to elaborate the answer. Keep every task
judgment scoped to the project that produced it. The combined answer is a
read-only projection: it neither copies task facts into Rosso nor authorizes
work in a target project.

## Mission continuity entry

When the human asks which work is in progress in this project, run
`python3 scripts/mission-record.py list`. Treat its output as a projection over
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

## Integration entry

When the human asks to create or operate a branch, worktree, PR, review, or
merge, load `design/operations/OPERATING-PROTOCOL.md` and preserve
`.github/PULL_REQUEST_TEMPLATE.md` as the repository-specific handoff; a
generic publishing tool must not replace it with a simpler body. Before
recommending or performing a merge, require a named independent review record
for the current head and present its compact packet through the Principal
Decision Brief. Do not treat an empty or pending review surface as completed.
Before settling or pruning the integration Mission, re-read the source PR and
give every late review observation a traced disposition. A local reversible
task that does not enter shared integration remains outside this entry.

## Principle Sequence

`principles/SEQUENCE.md` is the collection's only semantic root of core principles. It contains one stable, unexplained principle per line. `principles/interpretations/P<id>.md` is that P-ID's living, source-bound reading: it reduces agent interpretation drift but cannot redefine or extend the source line. Skills and target-project guidance are downstream expressions.

### Source-bearing artifacts

Research, interpretations, proposals, candidates, and review records preserve
provenance as readable inline Markdown links at the claim they support. Prefer a
descriptive source title linked to the direct primary source; link repository
evidence to the most stable file heading or artifact anchor available. A
detached bibliography may supplement these links but must not replace them.
`principles/SEQUENCE.md` is the exception: keep its one-line entries free of
citations and explanation.

When creating or materially updating a skill:

- Read the sequence first and record exactly one Primary P-ID plus up to three Supporting P-IDs in `## Principle expression` near the top of `SKILL.md`.
- Then read only the corresponding `principles/interpretations/P<id>.md` files; do not load the entire interpretation layer by default. If a proposed interpretation adds a new decision consequence that its source line cannot bear, create a sequence candidate rather than extending the interpretation.
- Let the skill's decision gates, artifacts, and verification make that selection concrete; do not copy explanations of the principles into SKILL.md.
- A sequence-dependent skill must remain usable when installed alone. Bundle a versioned, read-only Sequence projection as `references/sequence.md`: include the full one-line sequence and the interpretations needed by its runtime selection. A skill that must select arbitrary P-ID teams may keep those interpretations split under `references/sequence-interpretations/` for progressive disclosure. Generate the package with `python3 scripts/sync-sequence-snapshot.py`; do not hand-edit generated files. Prefer a declared host Sequence when present; otherwise use the package. A task may fetch a verified newer comparison on demand, but never edits the packaged projection or turns it into a second canon.
- Keep new project-local practices local. Propose a sequence candidate only when a principle is cross-context, decision-changing, and cannot be reduced to existing P-IDs.
- Preserve a durable, source-bound inquiry in `principles/research/` before a
  new candidate when the question is still open. Research has no P-ID or semantic
  authority; it may conclude `no-proposal`, and candidate/review gates recheck it.
- Use `principle-cultivation research` for durable inquiry (`no-proposal` is
  valid), `propose` only when the candidate gate passes, and `review`/`adopt`
  for human-gated Sequence change. The deprecated `extract` path still creates
  candidates when the gate passes. Never silently create a second canon.
- Keep only pending or incubating records in `principles/candidates/`. After human adoption, move the record to `principles/adopted/`; it remains evidence but no longer competes as an active proposal.
- Treat the sequence as the central committee and each skill as a durable working team: its Primary P-ID is the skill's stable lineage and its Supporting P-IDs are habitual members. Each activation selects one current lead for the task's principal contradiction; it may differ from the lineage, but never creates co-primary doctrine. The standing committee is a governance projection, never a second semantic source.
- A human-nominated alternate candidate may join one activation only as a separately labeled trial. It never becomes Primary, Supporting, current lead, a review-team seat, or portable lineage; record its baseline, decision delta, disconfirming observation, and outcome in the candidate record.
- For a sequence addition, revision, or retirement, use `principle-cultivation review` to form a temporary team: a lead, standing liaison, direct comparators, and a preservation seat that makes the strongest case for leaving the sequence unchanged. Select 3–5 seats with reasons; do not convene every principle by default.
- Team reports are review evidence, not votes or semantic authority. Record the selected P-IDs, roles, overlap and boundary findings, and unchanged-sequence alternative. Human approval is the only adoption authority.
- Interpretations are licensed derivatives, not a second canon: they may clarify, narrow a misreading, or improve source grounding, but a new principle, boundary that changes decisions, or source-line revision follows candidate review and human approval.
- No skill is a mandatory preflight. `attention-driven`, when installed, is an optional analytical lens for attention-allocation problems, not a required workflow step; select it only when it fits the task's principal contradiction.

### Human decision handoffs

When a material choice belongs to the human principal, do not ask for bare
approval or make them reconstruct the option set. Present the recommendation,
two to four consequential choices, each choice's immediate authorized result,
main tradeoff or reopening signal, and a compact reply key. Use the project's
[Decision Brief](design/operations/DECISION-BRIEF.md) when it exists. The brief
is a projection for human action; it never approves, merges, expands scope, or
turns silence into consent.

MIT licensed, maintained by Lidessen.

## Repository Structure

```
skills/
  <skill-name>/
    SKILL.md           ← Skill definition (frontmatter + main prompt)
    commands/           ← Subcommand instructions dispatched by SKILL.md
    references/         ← Reference material loaded on demand
    scripts/            ← Executable code (if needed)
    assets/             ← Templates, images, data files (if needed)
```

Each skill is a self-contained directory under `skills/`. The `SKILL.md` file is the entry point — its YAML frontmatter defines the skill's name, description, and argument hints, while the markdown body is the prompt that the agent executes when the skill is invoked. Subdirectories follow the [Agent Skills Specification](https://agentskills.io/specification) conventions; only create the ones the skill actually needs.

## Skill Format Specification

Skills follow the [Agent Skills Specification](https://agentskills.io/specification). Also see [Codex skills docs](https://code.Codex.com/docs/en/skills).

A `SKILL.md` has two parts:

1. **Frontmatter** (`---` delimited YAML): `name`, `description` (used for trigger matching), and optional fields (`license`, `compatibility`, `metadata`, `allowed-tools`).
2. **Body** (markdown): The actual instructions Codex follows. May dispatch to sibling `.md` files based on arguments.

The `description` field is critical — it determines when the agent auto-triggers the skill. It should list concrete trigger phrases and use cases.

## Writing and Editing Skills

- Keep skill prompts methodology-focused, not implementation-focused. Skills teach Codex *how to think about a task*, not specific code to write.
- A skill is an expression of selected sequence principles, not an independent source of doctrine. Preserve its `## Principle expression` selection unless the skill's shape has changed.
- The body of SKILL.md is a prompt, not documentation. Write it as instructions Codex will follow, not as a reference humans will read.
- Subcommand files in `commands/` should be self-contained instructions — SKILL.md dispatches to them, they don't reference each other. Reference material goes in `references/`.
- Frontmatter `description` is multi-line and acts as the trigger classifier. Include both the methodology description and concrete trigger phrases/argument hints.
- When referencing another skill, use concept references: describe the *goal* first, then mention the skill as one way to achieve it. E.g., "Set up architectural documentation for the project — the design-driven skill can help with this." This keeps the skill functional even when the referenced skill isn't installed.

## Safe installation verification

Never run `npx skills add .` from this repository or install a local checkout
back into the same worktree. `.agents/skills` is a symlink to `../skills`, so a
self-install can make the installer's target alias its source and destroy the
source tree. To verify packaging, use:

```bash
python3 scripts/probe-skill-installation.py <skill-name>
```

The probe copies one skill into a disposable source snapshot, installs it into
a separate disposable project, compares file hashes, and removes both. Do not
replace this with a direct local-source install merely to save setup time.

Before running an unfamiliar or potentially mutating external CLI, inspect the
working tree. Stage or commit any validated work—especially untracked artifacts
that would be costly to reconstruct—before the probe. A staged checkpoint makes
recovery possible; it does not make an unsafe source/target relation safe, so
the disposable probe remains mandatory.
