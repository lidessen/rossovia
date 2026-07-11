# 007 — Independent Work Cell Runtime

**Status:** adopted and verified
**Date:** 2026-07-10

## Context

This collection can govern principle lineage and express principles as skills,
but it cannot yet run a realistic agent task and retain evidence that attributes
a behavioral difference to one skill or candidate principle. Existing forward
probes are useful but often lack a matched baseline, raw execution trajectory,
or a real isolated repository task.

The missing capability is a practice unit, not another methodology skill. It
must be implemented in this repository and remain independent of external agent
engines. Prior systems may motivate questions, but no external engine code,
protocol, process, task board, scheduler, or persistence service is a runtime
dependency.

## Decision

Create `packages/work-cell` as a standalone TypeScript package. A Work Cell is
one ephemeral, bounded agent run with five required inputs:

1. an intent;
2. an isolated workspace and access policy;
3. DNA: instructions, tools, and capabilities;
4. acceptance conditions and a finite budget;
5. a required structured submission.

The environment owns isolation, path and command boundaries, cancellation,
budget enforcement, mechanical check execution, trace capture, and evidence
persistence. The model owns investigation order, tool choice inside the granted
surface, local adaptation, and the decision to complete, return a partial, fail,
or request differentiation.

The core depends on a `CellDriver` interface. The first adapter uses Vercel AI
SDK and the official DeepSeek provider with `deepseek-v4-flash` as the default
economic model. SDK and provider types do not enter the core cell contract. A
future Pi adapter must implement the same driver boundary rather than change the
contract.

Before task execution, the cell differentiates against the host Sequence. The
environment exposes the complete one-line Sequence as a compact genome, but no
interpretations. In the first model step the cell must call `express_genes` to
select exactly one current lead and zero to three supporting P-IDs, with a
distinct decision contribution for each. The environment validates the IDs and
then loads only those interpretations into the next step. Selection is a cell
judgment; loading and cardinality enforcement are mechanical environment work.

Task capabilities and tools do not derive from P-IDs. The task contract grants
capabilities; gene expression shapes judgment within those capabilities. An
optional inherited skill lineage may inform selection but cannot force an
irrelevant lead. A candidate can appear only as a separately labelled human
treatment and never as an expressed P-ID.

## Cell contract

```text
CellInput
  id, intent
  workspace { root, read paths, write paths, allowed commands }
  genome { Sequence path, interpretations directory, optional inherited lineage }
  dna { base instructions, capabilities }
  capabilities required
  acceptance conditions
  budget { steps, tokens, duration, command output }
  optional treatment { id, instructions }

CellSubmission
  outcome: completed | partial | split | failed
  artifact { summary, files }
  evidence[]
  check_plan { steps[] }
  children[]

CellRunRecord
  immutable input and driver descriptor
  validated gene expression and loaded interpretation paths
  timestamps and terminal status
  submission and check results
  before/after workspace diff
  step and tool trajectory
  token use and estimated cost
  protocol, budget, and cancellation failures
```

The driver cannot accept its own output. A completed submission is promoted to
`passed` only after the environment executes the declared check plan. Semantic
quality remains a separate comparison-judge decision.

## Differentiation

A cell never invokes or communicates directly with another cell. When the task
exceeds its capability, scope, or budget, it submits `outcome: split` plus child
specifications containing intent, scope, required capabilities, acceptance, and
budget. The experiment runner may materialize those specifications as fresh
cells. Parent and children communicate only through recorded specifications and
artifacts.

The first slice supports one bounded differentiation tree with explicit maximum
depth and total-cell limits. It does not infer a global plan, maintain a durable
queue, or create named cell types.

## Evidence and comparison

An experiment freezes one fixture and acceptance condition, then runs matched
baseline and treatment variants in separate workspace copies. Each run retains
its full record and diff. A fresh judge receives blinded `A` and `B` evidence,
not the variant names, and returns one of:

- `supported`: treatment changes the accepted behavior for the better;
- `overlap`: both make the same material decision;
- `failed`: treatment makes the result worse or violates a boundary;
- `inconclusive`: evidence cannot attribute a difference.

The first experiment trials P23 bounded autonomy against the existing
P11/P13/P15/P16 baseline on a realistic skill-rewrite task. Any verdict is a
valid outcome and must be retained.

## Non-goals

- No dependency on Sikong or another orchestration runtime.
- No durable task board, worker pool, scheduler, shared memory, or service.
- No direct cell-to-cell messaging.
- No automatic Sequence adoption or candidate promotion.
- No central semantic router that prescribes the agent's process.
- No generalized sandbox security claim; the first workspace boundary is a
  local evaluation containment layer and commands remain allow-listed.

## Acceptance

The slice is accepted only when deterministic tests cover contract validation,
path and command boundaries, check-plan settlement, cancellation/budget
behavior, differentiation limits, evidence persistence, and blinded attribution;
and a live `deepseek-v4-flash` run completes one real isolated fixture plus the
P23 baseline/treatment comparison. The final dependency graph and source search
must show no external engine dependency.

## Implementation evidence

The accepted slice is implemented in [`packages/work-cell`](../../packages/work-cell/README.md).
Its deterministic suite covers expression validation, selective interpretation
loading, workspace and command containment, settlement, budgets and
cancellation, bounded child materialization, evidence persistence, and blinded
comparison validity. The package dependency graph contains AI SDK, the DeepSeek
provider, Zod, and development-only TypeScript/Bun types; source and dependency
searches contain no external agent-engine integration.

The first live matched run is preserved in the [P23 Work Cell evaluation](../../regeneration/evaluations/2026-07-10-work-cell-p23-live-comparison.md).
Both cells independently expressed P16 with P13/P15/P04, loaded only those
interpretations, passed their environment-executed checks, retained full local
traces and diffs, and reached a fresh blinded judge. The result was `overlap`,
so the runtime vertical slice is accepted while P23 is not promoted.
