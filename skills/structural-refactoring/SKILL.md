---
name: structural-refactoring
description: >-
  Analyze, plan, execute, and verify behavior-preserving structural code changes.
  Use when asked to refactor code across meaningful boundaries: split a large
  file or module, extract responsibilities, untangle dependencies, reorganize a
  package, migrate callers, or assess the impact of a consequential refactor.
  Do not use for routine local cleanup, feature work that intentionally changes
  behavior, project artifact organization, or an unsettled architecture choice.
---

# Structural Refactoring

## Principle expression

**Primary:** P07
**Supporting:** P02, P13, P15

## Scope

Own one judgment: **how can the present code be reconstituted into a better
structure while preserving the behavior and constraints that matter?**

Treat a refactor as a semantic-preservation problem, not a file-moving task.
Do not infer boundaries from file length, directory fashion, an AST graph, or
the number of available agents. Do not use this skill to decide new product
behavior or accept its own result.

## Principle source

Use a host Sequence and matching interpretations when the host declares them.
Otherwise use this skill's read-only fallback under
`references/sequence-snapshot/`. Read only P07, P02, P13, and P15. A live task
may select a different current lead, but it does not create co-primary doctrine.

## Start

Ground the refactor before editing:

```text
Actual target and observed behavior:
Structural pressure or requested change:
Preservation contract:
Observed impact field:
Strongest no-refactor alternative:
Smallest candidate boundary:
Verification and acceptance owner:
```

If the requested change is a local cleanup whose impact is already visible,
work under ordinary disciplined development. If the desired architecture or
behavior is unsettled, route that decision before refactoring.

## Core method

1. **Recover the concrete whole.** Read the target, its callers, tests, public
   contracts, accepted design, and recent relevant history. Run the current
   verification surface when practical. Separate observed facts from inferred
   responsibilities and preferences.
2. **Classify the change.** Confirm that the task changes code structure while
   intending to preserve named observable behavior. Route adjacent problems
   through the boundaries below rather than hiding them inside the refactor.
3. **Build the smallest sufficient impact field.** Trace only what can change
   the boundary or verification decision:
   - public entry points and direct consumers;
   - state, effects, lifecycle, error, persistence, and concurrency boundaries;
   - dependency direction and strongly coupled definitions;
   - invariants and high-risk paths;
   - tests, types, build checks, and runtime observations able to expose drift.

   Prefer compiler, language-server, AST, call-site, and repository evidence
   for exhaustive facts. Use model judgment for responsibility, cohesion, and
   trade-offs. Never let a generated summary silently replace the source field.
4. **Compare boundaries.** Preserve the strongest no-refactor case and compare
   the fewest alternatives needed to expose the real trade-off. Reject a split
   that only shortens files while increasing cross-boundary traffic, duplicated
   state, unstable interfaces, or migration risk. Select the smallest boundary
   that resolves the named structural pressure and preserves hard constraints.
5. **Allocate attention proportionally.** Default to one agent with the whole
   impact field. Use Work Cells, subagents, or parallel specialist views only
   when distinct ownership, effects, callers, or preservation risks are likely
   to be missed and can be reviewed independently. Give every view the same
   authoritative field, retain dissent, and treat synthesis as a proposal. Do
   not vote facts into existence or require a swarm for routine work.
6. **Design reversible checkpoints.** Order moves by real dependencies so every
   checkpoint can typecheck or run a focused verification. Keep behavior change,
   API redesign, formatting churn, and unrelated cleanup out of the refactor
   unless they are necessary to preserve the contract and are named explicitly.
7. **Execute and observe one checkpoint at a time.** Update definitions and
   consumers together, inspect the diff, and run the smallest check capable of
   exposing the predicted failure. Stop and revise the impact field when an
   observation contradicts the plan.
8. **Settle through independent verification.** Compare the final structure
   against the preservation contract, public surface, impact field, and accepted
   boundary. Record traceable checks and residual risk. A designated reviewer or
   human accepts a consequential refactor; the implementing agent does not turn
   its report into fact.

## Boundaries and routing

| Observed need | Route |
|---|---|
| Small local cleanup with visible impact | ordinary `disciplined-development` |
| An implementation result must revise the next attempt | `practice-cycle` |
| Desired responsibilities or architecture are not yet accepted | project design or strategic owner first |
| Agent context delivery is the object being changed | `context-engineering` |
| Project documents, records, or artifact authority are being reorganized | `artifact-organization` |
| A repeated refactor judgment should become or change a skill | `skill-engineering` |
| Work amount, uncertainty, or model cost must be estimated | `work-estimation` |

Work Cell is an optional executor and evidence source, not this skill's owner or
a required stage. AST and code-graph tools are optional observations, not a
portable runtime dependency.

## Verification

Read [evaluation](references/evaluation.md) when designing a consequential
refactor, evaluating this skill, or deciding whether parallel analysis is worth
its cost. Retain only the probes that can change the implementation or acceptance
decision.

## Completion standard

A refactor is ready only when the structural pressure, preservation contract,
impact field, selected boundary, executable checkpoints, traceable verification,
and acceptance owner are explicit. Passing syntax or type checks proves only
the properties they observe. If behavior equivalence, caller impact, or ownership
remains uncertain, report the uncertainty and do not claim completion.
