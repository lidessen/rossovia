# Changelog

Entries use stable functional-module prefixes so agents can inspect only changes
that affect selected capabilities. `Action` is `none`, `reapply`, `manual`, or
`breaking`. Entries are append-only after publication; corrections add a later
entry instead of rewriting the applied Git interval.

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
