# Candidate — Minimum Valid Transition

**Status:** adopted
**Observed in:** agent-worker, chiling, skills

## Candidate sequence line

P15｜只选择化解当前矛盾且保留硬约束的最小有效跃迁｜控制论 / 动态规划

## Recurrence

- `agent-worker/design/DESIGN.md:73-91` selects the smallest valid transition;
  decomposition is attracted only when it reduces context, conflict, blast
  radius, or comparison cost, and is explicitly not mandatory.
- `chiling/DESIGN.md:334-340` protects the first useful agent-facing control
  surface from being delayed by a human UI, while retaining validated patches
  and rule traces as hard constraints.
- `design/DESIGN.md:55-57` and `AGENTS.md:29` make skills optional
  contextual expressions rather than a mandatory pipeline or preflight.
- `moniro/.memory/decisions/2026-01-31-validation-skill.md:117-125` names
  adaptive workflows as a core method: there is no universal workflow, and a
  skill includes knowing when to deviate from its usual method.

## Decision consequence

Choose the smallest action, skill combination, decomposition, or release slice
that reduces the present principal contradiction while preserving acceptance,
safety, and authority constraints. Do not install a method as a universal stage
solely because it is usually useful; activate it only when its benefit exceeds
its present cost.

## Existing-sequence check

P04 identifies what dominates and P05 requires situation-specific judgment.
P10 explains why attention is scarce. None states the operational selection
rule: prefer the smallest valid transition and reject ceremonial stages.

## Counterexample / boundary

"Minimum" never means skipping a required protocol transition. If verification,
settlement, consent, or a safety gate is a hard constraint, it remains part of
the minimum valid path.

## Expression probes

- Skill selection: use `attention-driven` only for an actual attention-routing
  problem, never as a default preflight.
- Agent orchestration: split a task only when the split decreases a named risk
  or cost and can later integrate into the parent acceptance boundary.

## Human decision

adopted — approved by the human on 2026-07-09.

## Committee review

See [`2026-07-09-p13-p16-expansion.md`](../reviews/2026-07-09-p13-p16-expansion.md).
