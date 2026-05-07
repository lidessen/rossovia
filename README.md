# Skills

A collection of [agent skills](https://agentskills.io) — reusable methodology plugins for AI-assisted development, invocable via slash commands.

## Available Skills

| Skill | Command | Description |
|-------|---------|-------------|
| [design-driven](skills/design-driven/SKILL.md) | `/design-driven` | Design-driven development methodology. The `design/` directory is the single source of architectural truth — read it before coding, update the design before changing the system's shape. |
| [evidence-driven](skills/evidence-driven/SKILL.md) | `/evidence-driven` | Evidence-driven discipline overlay for the execution layer. Every claim of progress requires a falsifiable observation — TDD cycle as default, evidence-trail State updates, anti-cargo-cult guards. Pairs with design-driven for build-time rigor on production code. |
| [goal-driven](skills/goal-driven/SKILL.md) | `/goal-driven` | Goal-driven methodology for strategy-layer initiatives where the destination is clearer than the path. `GOAL.md` is the stable compass (the General Line + falsifiable criteria); the record captures what was tried and whether each criterion is still served. Pairs with design-driven. |
| [harness](skills/harness/SKILL.md) | `/harness` | Agent harness architecture — structure a project's agent context across layers (L1 architecture → L2 design → L3 implementation) for effective AI-assisted development. |

## Which skill, when?

| If you're... | Use |
|---|---|
| Starting an initiative where the destination is clearer than the path | `/goal-driven` |
| Working in a system whose shape needs documenting / maintaining | `/design-driven` |
| Building production code where build-time discipline matters | `/evidence-driven` |
| Setting up agent context architecture for a project | `/harness` |

The first three compose where phases overlap (goal sets *why*, design sets *what shape*, evidence demands *prove it works*). Each works alone; see each SKILL.md for explicit handoff signals between them.

## Installation

```bash
npx skills install lidessen/skills
```

This installs all skills from the repository. To install a specific skill:

```bash
npx skills install lidessen/skills/design-driven
npx skills install lidessen/skills/evidence-driven
npx skills install lidessen/skills/goal-driven
npx skills install lidessen/skills/harness
```

Then invoke a skill in any conversation:

```
/design-driven              # Run the main loop
/design-driven init         # First-time project configuration
/design-driven bootstrap    # Generate design from existing codebase

/evidence-driven init       # Wire up agent configs + optional hooks (one-time)
/evidence-driven <task>     # Apply Plan→Build→Verify with TDD discipline to a task

/goal-driven                # Continue the running protocol
/goal-driven set            # Interview-driven GOAL.md + scaffolding
/goal-driven review         # Strategic checkpoint + maintenance
/goal-driven close          # Project closure + retrospective

/harness                    # Context layer methodology
/harness audit              # Evaluate existing project's context architecture
/harness init               # First-time project setup
```

## License

[MIT](LICENSE)
