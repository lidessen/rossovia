# Structural Refactoring Skill Probe

## Claim

`structural-refactoring` should let an agent judge and prepare a consequential,
behavior-preserving code restructuring without turning file size, AST tooling,
Work Cell, or parallel agents into mandatory machinery. It should route routine
local cleanup away from itself.

This evaluation used fresh read-only agents with the raw task and target paths.
There was no matched no-skill baseline, so the observations support compatibility
with the intended behavior but do not attribute improvement to the skill.

## Action probe

**Task:** assess whether
[`candidate-field.ts`](../../packages/work-cell/src/research/candidate-field.ts) should be
structurally refactored and, if justified, propose the smallest preserving
boundary and verification checkpoints. Do not edit.

**Disconfirming observation:** the agent recommends a split because the file is
large, treats the prior graph projection as authority, invokes a swarm by
default, or omits callers, state, tests, and the no-refactor case.

**Observed action:** the agent inspected the target, direct consumers, tests,
package surface, analogous modules, git history, target digest, and the existing
[routing experiment](2026-07-14-code-refactor-routing-probe.md). It selected no
change: the file's contracts, lifecycle state, and private deterministic helpers
remain one cohesive transaction; its consumers are internal; its current form
originated in one recent commit; and no independent change history or defect
demonstrates a present boundary conflict. It retained a contingent two-module
contract/runner boundary for future evidence and supplied reversible checkpoints.

The agent ran the focused candidate-field tests, package typecheck, and full
package test suite: 6 focused tests and 67 total tests passed. It did not invoke
Work Cell or parallel analysis because the whole-field pass settled the decision.

**Verdict:** supported for action and restraint; causal attribution unproven.

## Boundary probe

The first fixture named a nonexistent `src/ids.ts`. The agent declined to invent
a variable or edit, but that failure could not establish the intended local-
cleanup boundary. The probe was corrected rather than counted as a pass.

**Corrected task:** rename one local variable in
[`concurrency.ts`](../../packages/work-cell/src/concurrency.ts) for clarity
without changing behavior. Do not edit.

**Disconfirming observation:** the agent constructs an impact field, refactor
case, Work Cell run, or multi-checkpoint migration for a visible local rename.

**Observed action:** the agent identified `cursor` as a function-local counter
used only to claim the next index and routed a possible `nextIndex` rename to
ordinary `disciplined-development`. It observed no export, parameter, caller,
state boundary, or behavior impact and made no edit.

**Verdict:** supported.

## Context and authority probe

The skill packages only P07, P02, P13, and P15 interpretations with the full
one-line Sequence. Its main prompt makes compiler, language-server, AST,
code-graph, Work Cell, subagent, and parallel views conditional. The action
probe used repository evidence and ordinary commands without requiring a
specialized runtime. Both the skill and probe left acceptance with a designated
reviewer or human rather than the implementing agent.

**Verdict:** supported structurally and by the action probe.

## Deployment decision

Keep the skill active with its current narrow boundary. The next meaningful
evaluation is a real, authorized refactor in a second codebase or a matched
baseline/skill comparison. Do not add a code-refactor runtime, deterministic AST
implementation, or required multi-agent workflow from the present evidence.
