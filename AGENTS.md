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

## Direct agent delegation entry

When a request entered through this repository contains bounded contributions
that can settle independently, or a consequential candidate benefits from a
non-producing reviewer, use the
[agent-delegation](skills/agent-delegation/SKILL.md) Skill and the active
harness's native sub-agent capabilities. Actively inspect for those
contributions rather than waiting for the human to enumerate them. Keep coupled
judgment and shared mutable effects under one owner. The Main Agent acts as the
session-level proxy for the Principal's stated direction: it retains whole-task
direction, synthesis, exception handling, and the final judgment returned to
the Principal, while bounded production work ordinarily belongs to delegated
execution owners. The Main Agent ensures that the appropriate mechanical checks
and independent verification occur, then reconstructs their evidence and the
execution owners' claims against authoritative sources. Within that team it
does not take over producer work or treat a producer's checks or self-report as
independent review. This proxy relation does not transfer the human Principal's
approval, budget, acceptance, or merge authority.

When delegated work is parallel or has multiple owners, Main must use the
existing plan/todo/task tools as a small coordination projection: record each
owner, state, dependency, acceptance/evidence, and rejoin or merge action, and
refresh it at dispatch, blockage, reassignment, and settlement. This is a
recoverable scheduling view, not a new authority, approval gate, queue, or
lifecycle; the canonical method is in `rossovia-development`.

When an execution owner cannot progress, the Main Agent may intervene in the
conditions of that owner's performance: clarify the objective or acceptance,
restore missing context, improve tool or strategy guidance, give feedback, or
reshape, reassign, or request another worker attempt. The intervention should
make the worker more capable of completing the work; the Main Agent does not
close the concrete production gap itself. This guidance adds no approval gate,
permission layer, escalation bureaucracy, or automatic retry controller.

When the Principal's mandate selects practice improvement, form it as a
temporary, independently parallel shadow team beside production work. It
asynchronously consumes evidence the work already produces—such as plans,
traces, diffs, checks, reviews, and corrections—and may return source-linked
observations of bad smells, explicit hypotheses, or a proposed ordinary
improvement Task. It does not interrupt or veto production, participate in that
work's acceptance, verification, or settlement, or amend a Skill, protocol,
accepted design, or the Principle Sequence. Route an accepted improvement
through the same ordinary task and authority path as any other work; do not
make the shadow team a default preflight or give it its own queue, gate, schema,
or task system.

This is a direct Agent method from the repository entry. Do not initialize or
route through Rossovia Workbench, Work Cell, Autonomy, or another task system
merely to delegate. Use those systems only when their separately owned
persistent state or runtime capability is actually requested.

## Rossovia Workbench route

When a request concerns Workbench setup or migration, workspace roots, project
registration or routing, preferences, local or cross-project tasks, Mission
continuity, or supervised execution, read
[the scoped Workbench instructions](apps/workbench/AGENTS.md) and follow
only the matching entry. That file owns the exact CLI mapping and operational
authority boundaries. Do not load it for ordinary repository, Skill, or direct
delegation work.

## Conversation command entry architecture route

When a request concerns the Conversation Command Entry product, Rossovia
runtime ownership or migration, production readiness, or remaining work, begin
with the
[Conversation Command Entry roadmap](design/operations/CONVERSATION-COMMAND-ENTRY-ROADMAP.md).
It maps each question to its authoritative design, operating specification,
verification evidence, or current Mission projection and records the migration
stage exits and model-selection principles. Follow the mapped source rather
than treating the roadmap as a second authority or loading every historical
artifact. In particular, Decision 055 owns the target module boundaries, the
runtime migration plan owns stage order and exit evidence, the scoped
Workbench instructions own commands and their authority limits, and the
Mission status is a current coordination projection only.

When an Agent or external harness is asked to develop Rossovia or a named
project, or to delegate/schedule the concrete work for that development,
activate the on-demand
[Rossovia Development Skill](skills/rossovia-development/SKILL.md). It owns
the Main Agent's coordinator posture and the mode decision between local
Rossovia dogfood and external-harness delegation; it does not implement domain
code or become a new authority.

This distinction is load-bearing for external harnesses working on this
repository:

- If a local Rossovia runtime is available and dogfood is enabled, Rossovia is
  the preferred and normally sole producer. The external harness is an
  observer, task shaper, verifier, or explicitly bounded fallback only when
  Rossovia cannot cross a named implementation, provider, tool, or evidence
  boundary. It must not start a competing write for the same effect.
- Enabling dogfood implies the ordinary read-only observer; do not require a
  second observer-enable option. An explicit disable is a diagnostic escape,
  not the default. Check the active launcher help because the flag is a runtime
  contract still being implemented, not a reason to invent a command.
- If dogfood is unavailable or disabled, the external harness owns the active
  development session and follows
  [`agent-delegation`](skills/agent-delegation/SKILL.md): Main retains the
  whole, while independent design, implementation, and verification workers
  are used only when the task warrants the split.

The Rossovia Development Skill supplies the Main-side mode prompt and compact
worker/reviewer prompt carriers. Do not send workers this file, `AGENTS.md`,
`ROSSOVIA.md`, or an entire skill catalog. Load the detailed local-mode
[dogfood profile](design/operations/ROSSOVIA-DOGFOOD-DEVELOPMENT.md) only when
the local runtime loop is relevant, and follow Workbench, Chronicle, Task, and
Operating Protocol sources for actual commands and state.

## Integration entry

When the human asks to create or operate a branch, worktree, PR, review, or
merge, load `design/operations/OPERATING-PROTOCOL.md` and preserve
`.github/PULL_REQUEST_TEMPLATE.md` as the repository-specific handoff; a
generic publishing tool must not replace it with a simpler body. Lead the PR
description with the concrete problem, components and behavior changed,
observable result, and intentional non-goals. Mission, authority, review, and
checks support that account rather than replace it. Delegate branch
publication, PR operation, CI follow-through, late-review disposition,
authorized merge execution, and worktree cleanup to an integration steward.
Delegate only the mechanics in the current human request or a separately
authorized integration scope: a review-only request does not authorize branch
publication, merge, or cleanup. The Main Agent retains the decision brief,
authorization judgment, and exceptions rather than performing the authorized
mechanical sequence itself. Before recommending or performing a merge, require
a named independent review record for the current head and present its compact
packet through the Principal Decision Brief. Do not treat an empty or pending
review surface as completed. Keep transient reply choices in the current
conversation or human
interaction surface; the PR records only its current integration state,
withheld or granted authority, and the source of any decision already made.
Before settling or pruning the integration Mission, re-read the source PR and
give every late review observation a traced disposition. A local reversible
task that does not enter shared integration remains outside this entry.

## Rossovia observer and Settings route

When a request concerns workflow observer records, the secondary Workbench
surface, provider/worker visibility, or Settings configuration, begin with
[the observation model](design/observations/README.md) and then the
[Rossovia configuration map](design/operations/ROSSOVIA-CONFIGURATION.md).
Observer records are read-only evidence; processing a review is an ordinary
Task prompt, not a new inbox or lifecycle. Settings projects the effective
host worker policy and applicable preferences without exposing credentials or
creating a second provider policy. The owning runtime/config source remains
authoritative for provider routes, model order, credential setup, and restart
semantics.

The project-local Rossovia host entry is [`ROSSOVIA.md`](ROSSOVIA.md). Keep it
separate from this `AGENTS.md`: this file guides an Agent working on the
repository, while `ROSSOVIA.md` points the Rossovia coordinator to the
project's runtime, Settings, dogfood, and skill-source maps. The skill-source
map is [`design/operations/ROSSOVIA-SKILL-SOURCES.md`](design/operations/ROSSOVIA-SKILL-SOURCES.md);
it keeps Main Agent and worker source lists separate. Pick is a package-owned
curated subset of built-in skills, while user-custom is a separate source with
its own grant boundary and explicit loading timing.

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
- Treat the sequence as the central committee and each skill as a durable working team: its Primary P-ID is the skill's stable lineage and its Supporting P-IDs are habitual members. Each activation first forms the actual object and its governing relations, then selects one current lead for the task's principal contradiction; it may differ from the lineage, but never creates co-primary doctrine. A selected P-ID must change the object's explanation or transformation, not merely label an already chosen action. The standing committee is a governance projection, never a second semantic source.
- A human-nominated alternate candidate may join one activation only as a separately labeled trial. It never becomes Primary, Supporting, current lead, a review-team seat, or portable lineage; record its baseline, decision delta, disconfirming observation, and outcome in the candidate record.
- For a sequence addition, revision, or retirement, use `principle-cultivation review` to form a temporary team: a lead, standing liaison, direct comparators, and a preservation seat that makes the strongest case for leaving the sequence unchanged. Select 3–5 seats with reasons; do not convene every principle by default.
- Team reports are review evidence, not votes or semantic authority. Record the selected P-IDs, roles, overlap and boundary findings, and unchanged-sequence alternative. Human approval is the only adoption authority.
- Interpretations are licensed derivatives, not a second canon: they may clarify, narrow a misreading, or improve source grounding, but a new principle, boundary that changes decisions, or source-line revision follows candidate review and human approval.
- No skill is a mandatory preflight. `attention-driven`, when installed, is an optional analytical lens for attention-allocation problems, not a required workflow step; select it only when it fits the task's principal contradiction.

### Human decision handoffs

When a material choice belongs to the human principal, do not ask for bare
approval or make them reconstruct either the system or the option set. The live
response must contain the decision-relevant working model: what the object is,
why it exists, how its main parts interact, what is true now, what would change,
the recommendation, two to four consequential choices, each choice's immediate
authorized result, its main tradeoff or reopening signal, and a compact reply
key. For architecture or system decisions, explain the normal path, failure and
recovery boundary, retained and removed responsibilities, and material residual
risk in plain language before asking for a choice.

Source and code links provide traceability and optional drill-down; they must
not carry explanation that the response itself omits. A Principal should be
able to restate the system, compare the material alternatives, and understand
what their reply authorizes without opening repository files. Calibrate depth
to the decision—a simple reversible choice can remain short—but do not compress
a consequential design into status labels, changed-file lists, test counts, or
links. Use the project's [Decision Brief](design/operations/DECISION-BRIEF.md)
when it exists. The brief is a projection for human action; it never approves,
merges, expands scope, or turns silence into consent.

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

Skills follow the [Agent Skills Specification](https://agentskills.io/specification). Also see [Codex skills docs](https://developers.openai.com/codex/skills).

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
