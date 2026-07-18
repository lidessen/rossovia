# Skills

[简体中文](README.zh-CN.md)

> The current methods repository for a project that makes productive AI a
> common, open, replaceable capability.

This repository contains [agent skills](https://agentskills.io) and an
experimental Work Cell for AI-assisted development. It is one working surface,
not the whole project, a model provider, or an opaque AI platform. Its semantic
root is the one-line [Principle Sequence](principles/SEQUENCE.md); each P-ID has
a living, source-bound [interpretation](principles/interpretations/) and each
skill is a context-specific expression of selected entries.

Its [founding mandate](design/FOUNDING-MANDATE.md) is to make productive AI a
widely accessible, open, replaceable common capability: enable ordinary people
to use economical open-model engineering systems on bounded production work,
with concrete evidence rather than dependence on opaque platform claims. Its
ethical boundary is liberation rather than extraction: human and AI capability
must not be organized as an unaccountable source of exploitation.

Start from the [founding mandate](design/FOUNDING-MANDATE.md) to understand why
the project exists, the [operating protocol](design/operations/OPERATING-PROTOCOL.md)
to see how human-authorized work proceeds, or the active skills below to use a
specific method.

## Repository map

| Path | Owns | Does not own |
|---|---|---|
| [`principles/`](principles/) | the one-line Sequence, interpretations, inquiries, candidates, and review/adoption evidence | skill workflows or project execution |
| [`skills/`](skills/) | the current installable methodology and behavioral expressions | the semantic source they express |
| [`packages/work-cell/`](packages/work-cell/) | a general bounded agent runtime, optional adapters, and experimental research implementations | planning, doctrine, or human acceptance |
| [`site/`](site/) | the static public home page and reproducible documentation projection | source facts, project identity, or hosting authority |
| [`design/`](design/) | accepted architecture, decisions, operations design, and retained design studies | live task state or raw runtime evidence |
| [`regeneration/evaluations/`](regeneration/evaluations/) | durable behavior and boundary evaluations | governing design or raw run authority |
| [`chronicle/`](chronicle/) | provenance-preserving observation receipts and correction chains | claims, decisions, or a universal activity log |
| [`operations/missions/`](operations/missions/) | return obligations for active multi-session missions | a backlog, scheduler, or Git history duplicate |
| [`development-log/`](development-log/) | curated development checkpoint summaries and method feedback | primary verification evidence |
| [`archive/`](archive/) | read-mostly historical carriers and superseded methods | current install targets or governing guidance |

## Active Skills

| Skill | Command | Description |
|-------|---------|-------------|
| [principle-cultivation](skills/principle-cultivation/SKILL.md) | `/principle-cultivation` | Dogfood steward for the Principle Sequence. Preserves cited research before proposal, convenes selective P-ID reviews, and trials human-nominated alternates; only human-approved adoptions enter the core. |
| [context-engineering](skills/context-engineering/SKILL.md) | `/context-engineering` | Decide how authoritative project information reaches an agent at the moment it changes action, using the actual runtime rather than a fixed layer or filename convention. |
| [improve-agent-workflow](skills/improve-agent-workflow/SKILL.md) | `/improve-agent-workflow` | Diagnose a real agent-work failure in an existing project, change the smallest owning surface, and verify the improvement through the ordinary agent entry path. |
| [skill-engineering](skills/skill-engineering/SKILL.md) | `/skill-engineering` | Design, rewrite, review, and test skills that improve repeated agent action. Forms a selected Sequence expression team for each target skill, carries a standalone Sequence snapshot, and requires behavior evidence rather than prompt polish. |
| [disciplined-development](skills/disciplined-development/SKILL.md) | `/disciplined-development` | Apply lightweight evidence, scope, and test-value discipline underneath a development task without creating another methodology workflow. |
| [practice-cycle](skills/practice-cycle/SKILL.md) | `/practice-cycle` | Turn an observed non-trivial practice into a settled conclusion, a next smallest test, or a route to the owner of the unresolved judgment. |
| [form-guidance](skills/form-guidance/SKILL.md) | `/form-guidance` | Choose whether a recurring need should exist as a skill, decision artifact, runtime, projection, bounded campaign, or no new form before implementation starts. |
| [naming-and-articulation](skills/naming-and-articulation/SKILL.md) | `/naming-and-articulation` | Name a shared project concept, define its operative boundary, explain it at the right source, and decline needless terminology. |
| [work-estimation](skills/work-estimation/SKILL.md) | `/work-estimation` | Recover necessary work and discovery branches before converting a mission into model-specific budget, time, or cost. |
| [model-evaluation](skills/model-evaluation/SKILL.md) | `/model-evaluation` | Build evidence-linked, task-specific capability profiles from matched repeated runs without turning model labels or one result into fact. |
| [strategic-advisory](skills/strategic-advisory/SKILL.md) | `/strategic-advisory` | Prepare a proposed Strategy Case from phase evidence for human review; it links long direction, medium capabilities, and short mission candidates without self-commitment. |
| [artifact-organization](skills/artifact-organization/SKILL.md) | `/artifact-organization` | Audit whether artifact roles and paths still express accepted design, then apply one smallest justified organization transition. |
| [structural-refactoring](skills/structural-refactoring/SKILL.md) | `/structural-refactoring` | Reconstitute code across meaningful boundaries while preserving declared behavior, caller impact, and verification authority. |
| [visual-design](skills/visual-design/SKILL.md) | `/visual-design` | Design or review content-led visual work, inheriting or forming a project direction without imposing a portable fixed style or claiming human acceptance. |
| [code-review](skills/code-review/SKILL.md) | `/code-review` | Review a proposed code change against its accepted intent and actual impact field, reporting only source-backed failure stories while leaving orchestration and merge authority external. |
| [project-cognition](skills/project-cognition/SKILL.md) | `/project-cognition` | Build or selectively refresh a source-linked, non-authoritative working model when later agents need reusable project understanding across substantial tasks. |
| [agent-environment](skills/agent-environment/SKILL.md) | `/agent-environment` | Audit, set up, reconcile, verify, or migrate a person's non-secret user-level coding-agent workflow across devices and tools without copying opaque machine state. |

## Experimental runtime

[`packages/work-cell`](packages/work-cell/README.md) is the collection's
independent practice and evaluation unit. Its core runs one caller-prepared,
bounded agent task and retains declared output artifacts, structured output,
terminal evidence, usage, cost, and workspace diff. Optional adapters lower
Sequence expressions, experiments, model evaluations, and deliberations into that generic
contract; research implementations remain outside the stable runtime surface.
It is infrastructure, not an invocable methodology skill, and it has no
planning, semantic, or acceptance authority.

For a Sequence-bearing repository, the read-only `probe` adapter discovers the
host Sequence, selects and loads a task expression, prepares a generic Cell,
and renders a reviewable reason chain. Exact JSON interfaces remain available
for generic runs, adapter fixtures, matched evaluation, and bounded
deliberation; see [decision 027](design/decisions/027-general-work-cell-core-and-sequence-adapter.md).

## Which skill, when?

| If you're... | Use |
|---|---|
| Researching whether recurring evidence merits a reusable core principle | `/principle-cultivation research` |
| Designing, auditing, or verifying how project context reaches an agent | `/context-engineering` |
| Installing one entry into an existing project to improve its agent skills, instructions, tools, verification, or handoffs from observed behavior | `/improve-agent-workflow` |
| Creating, rewriting, or behavior-testing an agent skill | `/skill-engineering` |
| Applying a lightweight evidence, scope, completion, or meaningful-test discipline to ordinary development | `/disciplined-development` |
| Turning a finished or failed non-trivial attempt into the next bounded practice | `/practice-cycle` |
| Deciding whether a capability needs a skill, record, runtime, projection, or no new form | `/form-guidance` |
| Naming a shared concept, defining terminology, or deciding where its explanation belongs | `/naming-and-articulation` |
| Comparing the real work of alternatives, selecting estimate precision, or setting error tolerance before a budget | `/work-estimation` |
| Comparing model, provider, plan, harness, or prompt/tool execution profiles on representative real tasks | `/model-evaluation` |
| Preparing strategic direction from a completed phase's verified evidence | `/strategic-advisory` |
| Checking whether project layout still fits accepted design | `/artifact-organization audit`; use `transition` only for a material gap |
| Splitting modules, extracting responsibilities, or untangling dependencies without intended behavior change | `/structural-refactoring` |
| Establishing, shaping, implementing, or reviewing a visual direction for an interface, document, illustration, or related product family | `/visual-design` |
| Building or refreshing reusable source-linked project understanding across substantial future tasks | `/project-cognition bootstrap` or `/project-cognition refresh` |
| Setting up, evolving, or migrating personal Codex, Cursor, Claude Code, skills, instructions, and related workflow configuration | `/agent-environment setup`, `/agent-environment reconcile`, or `/agent-environment migrate` |
| Auditing how several established methods should cooperate | Read the project's organization operating model first; use the role that owns the observed disturbance, not a new universal skill |

The Principle Sequence is the root and `principle-cultivation` maintains it.
**Context-engineering** selects and verifies context delivery. **Skill-engineering** regenerates and tests
skill expressions. **Artifact-organization** designs the project base (根据地) and activity
architecture; 整理 is a campaign, not the skill's name. See each SKILL.md for handoff signals.
The [organization operating model](design/decisions/012-bounded-adaptive-organization.md)
defines conditional cooperation among those roles; it is a human-governed design
contract, not another command or central agent.

## Archive

Pre-regeneration methodology skills (`design-driven`, `goal-driven`, `evidence-driven`, `reframe`, writing skills), the legacy `setup-lidessen-skills` host adapter, regeneration working notes, completed blueprints, articles, and slides live under [`archive/`](archive/README.md). They are preserved evidence, not install targets. The repo no longer maintains a root-level `blueprints/` task-orchestration workflow. L1 guidance in this repo's `CLAUDE.md` / `AGENTS.md` is inlined; edit [`archive/skills/setup-lidessen-skills/references/cross-cutting-principles.md`](archive/skills/setup-lidessen-skills/references/cross-cutting-principles.md) and sync markers manually if that projection changes.

## Installation

> Maintainers: do not test installation by running `npx skills add .` inside
> this checkout. Its local agent-skill path aliases the source tree. Use
> `python3 scripts/probe-skill-installation.py <skill-name>` for a disposable,
> hash-checked packaging probe.

List the skills in this repository before choosing one:

```bash
npx skills add lidessen/skills --list
```

Install one skill into the current project (the default scope):

```bash
npx skills add lidessen/skills --skill improve-agent-workflow
```

Add `-g` for a personal installation available across projects, or `-a codex`
(or another supported agent) when automatic agent detection is not the target.
The default project installation can be committed and shared with the project.
See the current [`skills` CLI reference](https://www.skills.sh/docs/cli) for
agent names, installation methods, updates, and removal.

## Daily use

Skills are normally selected from the user's intent: after installation, ask
the agent for the outcome in ordinary language. Internal operation names are
optional controls, not a workflow the user must memorize. For example:

```text
Redesign this settings page so the account state and primary action are clear.
Review the rendered docs site and explain why the pages do not feel coherent.
Establish a visual direction for this new product before implementing its site.
Our coding agent keeps missing this repository's scope boundary. Inspect the
actual path and make the smallest verified improvement.
This project skill produces plausible output but ignores its verification
source. Fix the owning surface and test it through the normal agent entry.
We keep reconstructing this project's architecture and change-impact model.
Build reusable project cognition from the current source without creating a new
source of truth.
Compare these two model execution profiles on retained real tasks and prepare a
bounded capability claim; do not produce a universal score.
```

For an explicit Codex activation, name the skill with `$` and optionally state
the operation:

```text
$visual-design redesign this settings page and verify it in the browser
$visual-design review the rendered docs experience; do not edit yet
$visual-design cultivate a reusable direction for this new product
$improve-agent-workflow audit why agents miss this project instruction
$improve-agent-workflow improve this repository's release-note skill and verify it
$project-cognition bootstrap this repository for future architecture and impact work
$project-cognition refresh the retained model across this revision
$model-evaluation compare these two execution profiles for repository review work
```

Other agents may expose explicit activation through a slash command, mention,
menu, or only model-driven selection. Those invocation forms belong to the
agent, not to this repository's portable command protocol. If a newly installed
skill is not discovered in an existing session, start a new agent session.

Within `visual-design`, `design` and `review` are the common paths.
`cultivate` is a low-frequency project-formation path, and `shape` is useful
when a direction is required without implementation. The skill uses browser,
rendering, image, and accessibility tools only when the host agent supplies
them; it does not pretend that prose is a rendered or tested artifact.

## Advanced operation controls

The following forms describe the skill argument convention. Replace `/` with
the explicit activation form supported by the chosen agent, or state the same
intent in natural language.

```text
/context-engineering design # Design one source-to-agent delivery path
/context-engineering audit  # Audit context delivery against the actual runtime
/context-engineering verify # Prove a task receives and uses the context

/skill-engineering create   # Create a behavior-changing skill
/skill-engineering rewrite  # Reconstitute an inherited skill
/skill-engineering review   # Audit a skill's expression and evidence
/skill-engineering test     # Test a skill against action and boundary probes
/skill-engineering sync-sequence-snapshot # Regenerate packaged sequence snapshots

/improve-agent-workflow audit   # Read-only localization of one agent-work gap
/improve-agent-workflow improve # Apply and verify the smallest owning change

/artifact-organization audit
/artifact-organization transition

/structural-refactoring       # Behavior-preserving structural code change

/visual-design design    # Common: create or redesign a real artifact/system
/visual-design review    # Common: review the rendered whole
/visual-design cultivate # Infrequent: establish a provisional project direction
/visual-design shape     # Advanced: form a direction without implementation

/project-cognition bootstrap # Create a justified reusable source-linked projection
/project-cognition refresh   # Refresh only changed semantic relations
/project-cognition verify    # Independently check a projection's decision field

/principle-cultivation research <question|paths>
/principle-cultivation propose <research-note>
/principle-cultivation review <candidate|sequence>
/principle-cultivation adopt <candidate>
```

Run the Work Cell package directly when developing the evaluation runtime:

```bash
cd packages/work-cell
bun install
bun run typecheck
bun test
bun run live:p23 # prefers OPENCODE_API_KEY; DEEPSEEK_API_KEY is the fallback

# from this repository or any descendant
bun src/cli.ts probe "Inspect a bounded project question" \
  --accept "Return traceable evidence" \
  --scope packages/work-cell
```

## License

[MIT](LICENSE)
