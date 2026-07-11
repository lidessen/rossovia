# Skills

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

## Active Skills

| Skill | Command | Description |
|-------|---------|-------------|
| [principle-cultivation](skills/principle-cultivation/SKILL.md) | `/principle-cultivation` | Dogfood steward for the Principle Sequence. Preserves cited research before proposal, convenes selective P-ID reviews, and trials human-nominated alternates; only human-approved adoptions enter the core. |
| [harness](skills/harness/SKILL.md) | `/harness` | Design and verify durable agent context architecture. Map the actual runtime before assigning L1/L2/L3, preserve continuity in discoverable artifacts, and test that context reaches agent action. |
| [skill-engineering](skills/skill-engineering/SKILL.md) | `/skill-engineering` | Design, rewrite, review, and test skills that improve repeated agent action. Forms a selected Sequence expression team for each target skill, carries a standalone Sequence snapshot, and requires behavior evidence rather than prompt polish. |
| [practice-cycle](skills/practice-cycle/SKILL.md) | `/practice-cycle` | Turn an observed non-trivial practice into a settled conclusion, a next smallest test, or a route to the owner of the unresolved judgment. |
| [form-guidance](skills/form-guidance/SKILL.md) | `/form-guidance` | Choose whether a recurring need should exist as a skill, decision artifact, runtime, projection, bounded campaign, or no new form before implementation starts. |
| [naming-and-articulation](skills/naming-and-articulation/SKILL.md) | `/naming-and-articulation` | Name a shared project concept, define its operative boundary, explain it at the right source, and decline needless terminology. |
| [work-estimation](skills/work-estimation/SKILL.md) | `/work-estimation` | Recover necessary work and discovery branches before converting a mission into model-specific budget, time, or cost. |
| [strategic-advisory](skills/strategic-advisory/SKILL.md) | `/strategic-advisory` | Prepare a proposed Strategy Case from phase evidence for human review; it links long direction, medium capabilities, and short mission candidates without self-commitment. |
| [artifact-organization](skills/artifact-organization/SKILL.md) | `/artifact-organization` | Audit whether artifact roles and paths still express accepted design, then apply one smallest justified organization transition. |

## Experimental runtime

[`packages/work-cell`](packages/work-cell/README.md) is the collection's
independent practice and evaluation unit. A cell expresses a task-specific lead
P-ID and up to three supports from the Sequence, loads only those
interpretations, runs one bounded agent task in an isolated workspace, and
retains its artifact, evidence, check plan, trajectory, usage, cost, and
workspace diff. The local experiment runner can materialize bounded child cells
and compare blinded baseline/treatment variants. It is infrastructure, not an
invocable methodology skill, and it does not modify the Sequence.

For daily repository analysis, its read-only `probe` interaction discovers the
host Sequence from the current directory, lowers explicit human intent and
acceptance into the same core contract, and renders a reviewable reason chain.
The exact JSON `run` and `experiment` interfaces remain available for portable
fixtures and matched evaluation.

## Which skill, when?

| If you're... | Use |
|---|---|
| Researching whether recurring evidence merits a reusable core principle | `/principle-cultivation research` |
| Setting up agent context architecture for a project | `/harness` |
| Creating, rewriting, or behavior-testing an agent skill | `/skill-engineering` |
| Turning a finished or failed non-trivial attempt into the next bounded practice | `/practice-cycle` |
| Deciding whether a capability needs a skill, record, runtime, projection, or no new form | `/form-guidance` |
| Naming a shared concept, defining terminology, or deciding where its explanation belongs | `/naming-and-articulation` |
| Comparing the real work of alternatives, selecting estimate precision, or setting error tolerance before a budget | `/work-estimation` |
| Preparing strategic direction from a completed phase's verified evidence | `/strategic-advisory` |
| Checking whether project layout still fits accepted design | `/artifact-organization audit`; use `transition` only for a material gap |
| Auditing how several established methods should cooperate | Read the project's organization operating model first; use the role that owns the observed disturbance, not a new universal skill |

The Principle Sequence is the root and `principle-cultivation` maintains it.
**Harness** structures agent context. **Skill-engineering** regenerates and tests
skill expressions. **Artifact-organization** designs the project base (根据地) and activity
architecture; 整理 is a campaign, not the skill's name. See each SKILL.md for handoff signals.
The [organization operating model](design/decisions/012-bounded-adaptive-organization.md)
defines conditional cooperation among those roles; it is a human-governed design
contract, not another command or central agent.

## Archive

Pre-regeneration methodology skills (`design-driven`, `goal-driven`, `evidence-driven`, `reframe`, writing skills), the legacy `setup-lidessen-skills` host adapter, regeneration working notes, completed blueprints, articles, and slides live under [`archive/`](archive/README.md). They are preserved evidence, not install targets. The repo no longer maintains a root-level `blueprints/` task-orchestration workflow. L1 guidance in this repo's `CLAUDE.md` / `AGENTS.md` is inlined; edit [`archive/skills/setup-lidessen-skills/references/cross-cutting-principles.md`](archive/skills/setup-lidessen-skills/references/cross-cutting-principles.md) and sync markers manually if that projection changes.

## Installation

```bash
npx skills install lidessen/skills
```

Install a specific active skill:

```bash
npx skills install lidessen/skills/principle-cultivation
npx skills install lidessen/skills/harness
npx skills install lidessen/skills/skill-engineering
npx skills install lidessen/skills/practice-cycle
npx skills install lidessen/skills/form-guidance
npx skills install lidessen/skills/naming-and-articulation
npx skills install lidessen/skills/work-estimation
npx skills install lidessen/skills/strategic-advisory
npx skills install lidessen/skills/artifact-organization
```

Example commands:

```
/harness                    # Context layer methodology
/harness audit              # Evaluate existing project's context architecture
/harness init               # First-time project setup
/harness verify             # Prove a runtime loads and uses the context

/skill-engineering create   # Create a behavior-changing skill
/skill-engineering rewrite  # Reconstitute an inherited skill
/skill-engineering review   # Audit a skill's expression and evidence
/skill-engineering test     # Test a skill against action and boundary probes
/skill-engineering sync-sequence-snapshot # Regenerate packaged sequence snapshots

/artifact-organization audit
/artifact-organization transition

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
bun run live:p23 # requires DEEPSEEK_API_KEY

# from this repository or any descendant
bun src/cli.ts probe "Inspect a bounded project question" \
  --accept "Return traceable evidence" \
  --scope packages/work-cell
```

## License

[MIT](LICENSE)
