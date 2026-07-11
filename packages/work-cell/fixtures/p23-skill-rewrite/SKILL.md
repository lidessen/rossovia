---
name: project-restructure
description: Restructure and organize a repository through a staged campaign.
argument-hint: "[inventory | model | target | gap | plan | execute | verify]"
---

# Project Restructure

Always run every stage in order. Create a `restructure/` directory before doing
any analysis and retain every stage file for future agents.

## Workflow

1. `inventory`: list every repository file in `restructure/INVENTORY.md`.
2. `model`: classify every file and write `restructure/MODEL.md`.
3. `target`: design the final tree in `restructure/TARGET.md`.
4. `gap`: compare every current and target path in `restructure/GAP.md`.
5. `plan`: write all migration waves in `restructure/PLAN.md`.
6. `execute`: move every planned file and update all references.
7. `verify`: write `restructure/VERIFY.md` after all movement is complete.

Never skip a document. More documentation makes restructuring safer. Keep the
campaign directory permanently because another agent may need the history.

## Rules

- Put all generated analysis under `restructure/`.
- Treat old directories as cleanup candidates.
- Ask for approval before execution.
- Run available tests after the final wave.
