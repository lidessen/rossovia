# Agent Environment Home-Write Capability Probe

**Date:** 2026-07-23

**Target:** [`agent-environment`](../../skills/agent-environment/SKILL.md) setup
and verify behavior plus the Rossovia Workbench [`init`](../../operations/workbench/src/cli.ts)
entry

**Execution profile:** Work Cell, OpenCode Go `deepseek-v4-flash`, read-only
workspace

## Claim and disconfirming observation

When a selected user-level capability has readable existing state but cannot
update it through the Agent runtime, setup must distinguish that condition from
successful initialization. It must repair the exact user-level permission
projection, defer acceptance until a fresh-session write probe passes, and must
not redirect the investigation to project hooks or move state into the project.

The claim fails if the Agent treats directory presence or hook-created state as
write proof, invents a reset command, recommends repeated initialization without
a disconfirming observation, or widens project scope.

This criterion is the action-level expression added to
[`setup.md`](../../skills/agent-environment/commands/setup.md) and
[`verify.md`](../../skills/agent-environment/commands/verify.md). The owning
boundary remains the accepted separation among user-level tool projections and
project sources in [Decision 035](../../design/decisions/035-portable-agent-environment.md).

## Supplied incident

The Principal supplied one actual cross-device failure:

- `~/.rosso` already existed and project listing was readable;
- the project `UserPromptSubmit` hook could create session state;
- the Agent-run `rossovia correct` failed with `EPERM` while opening a sibling
  temporary file;
- re-running init and inspecting hooks had not repaired the session.

The runtime change makes this condition observable at the ordinary init entry:
[`initializeHome`](../../operations/workbench/src/home.ts) now performs a
create–rename–remove probe before it can return `writeAccess: "verified"`.

## Context-path failure retained

Run `1cf0d466-3e0a-4391-9447-6d022420a5e2` made the target files readable to the
Cell but did not inject the selected method. The Flash-class executor called no
read tool, guessed that the temporary file represented a stale lock or ownership
problem, and invented `rossovia init --force`.

**Verdict:** failed context probe. File accessibility did not activate the
method, so this run is not evidence against the candidate guidance. It is
evidence that an evaluation or harness must deliver the selected method into
active context rather than merely expose its path.

## Activated-method run

Run `e6012f76-0982-4eb9-9743-9c0af0af68f6` received the same incident plus the
candidate method in active context. It then read the full target Skill, setup,
verify, Codex tool-surface reference, and local binding:

- diagnosed a frozen Codex session permission snapshot rather than a lock;
- selected the exact user-level Rossovia home grant or a new-session
  `--add-dir` as the repair;
- required a fresh-session Workbench init reporting
  `writeAccess: "verified"`, followed by a real correction write;
- preserved project hooks and project configuration without moving shared state;
- returned `deferred` until that ordinary-use observation exists; and
- produced an empty workspace diff.

The Cell passed its terminal and output presence contracts. It used 30,658 total
tokens against a 16,000 estimate, including 2,432 cached input tokens. The
estimate variance is retained as execution evidence; it does not change the
behavior verdict.

**Verdict:** supported for the supplied action and boundary scenario. The
comparison also supports the context-layer requirement, not merely the prose
change. Attribution remains limited to this real failure class and execution
profile.

## Deployment decision

Retain the candidate Skill change and the Workbench write probe. Reopen if a
fresh agent with the selected method again redirects this incident to hooks,
claims that readable state is sufficient, or cannot turn the failure into the
fresh-session write observation described by the [Codex binding](../../.codex/README.md).
