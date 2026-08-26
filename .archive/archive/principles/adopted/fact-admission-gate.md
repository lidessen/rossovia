# Candidate — Fact Admission Gate

**Status:** adopted
**Observed in:** agent-worker, shilu, sikong, gosplan

## Candidate sequence line

P13｜主张不等于事实；事实须经可追溯的验证提交｜实践论 / 控制论

## Recurrence

- `agent-worker/design/DESIGN.md:3-12, 63-71` records worker output as Claim
  or evidence and creates Fact only through Contract settlement.
- `shilu/DESIGN.md:30-39` preserves raw evidence and requires agents to propose
  operations that the deterministic core validates and commits.
- `sikong/design/architecture/three-layers.md:100-120` makes L3 reports
  read-only projections; workspace acceptance belongs to L1 Verify/Commit.
- `gosplan/DESIGN.md:22-54` requires structured evidence, review, and immutable
  settlement before an allocation is final.
- `moniro/.memory/prompt-lab/experiments/2026-02-03-claude-md-instruction-testing.md:355-404`
  records a theory-to-design mapping as an unverified claim until an actual
  sub-agent experiment tests it; only then may it be codified as methodology.

## Decision consequence

When a skill, task protocol, product, or principle collection has durable
state, distinguish proposal/claim/report from accepted fact. Define the
verifier and commit point; do not let agent self-report, UI success, a
passing-looking transcript, or an attractive theoretical mapping make a fact by
implication.

## Existing-sequence check

P08 requires falsifiable evidence and P11 separates decision from execution.
Neither defines the state transition by which an adequately supported claim
becomes a durable fact. This candidate governs that admission boundary.

## Counterexample / boundary

Exploratory notes, hypotheses, and local drafts should remain claims; they do
not need a durable commit merely because they were observed. The principle
applies when a system would otherwise treat a result as shared or authoritative
state.

## Expression probes

- `principle-cultivation`: an extracted pattern stays a candidate until the
  human explicitly adopts a sequence line.
- Agent task runner: a worker report cannot close a task until the designated
  verifier accepts it and records the result.

## Human decision

adopted — approved by the human on 2026-07-09.

## Committee review

See [`2026-07-09-p13-p16-expansion.md`](../reviews/2026-07-09-p13-p16-expansion.md).
