# 008 — Project-first Work Cell Interaction

**Status:** adopted and verified
**Date:** 2026-07-10

## Sequence expression

- **Lead P16** — the runtime contract exists, but its JSON-first form does not
  yet let a project practitioner take the next action naturally.
- **Supporting P03** — interaction changes must come from running the current
  form against this repository and returning observed friction to implementation.
- **Supporting P07** — begin with this project's concrete use, extract only the
  stable interaction determinations, and return them as a portable interface.
- **Supporting P15** — add the smallest shell that changes usability while
  preserving the accepted Work Cell boundary.

## Observed contradiction

The exact `run <spec.json>` and `experiment <spec.json>` interfaces correctly
expose the full machine contract, but they require a person to understand
`CellInput`, genome paths, workspace policy, capabilities, DNA, budgets, and
record internals before asking a first project question. The contract is a good
portable substrate and a poor first human interaction.

Three read-only dogfood attempts against this repository selected the same
principal contradiction but failed at 90k, 90k, and 200k token budgets. The
traces exposed two independent causes:

1. listing `packages/work-cell` admitted prior `.work-cell` evidence into the
   next cell's context;
2. even after narrowing scope, repeated source-reading steps accumulated the
   full prior tool context, while the terminal output reported only
   `budget_exceeded` and token totals.

The final attempt did call `submit_result`, but the terminal step crossed the
budget and the useful provisional submission was visible only by inspecting the
raw trace. This is interaction evidence, not an accepted semantic result.

## Decision

Keep `CellInput`, `CellSubmission`, `CellRunRecord`, `run`, and `experiment` as
the exact portable layer. Add a thin project interaction shell with two actions:

```text
probe <intent> --accept <condition> [--scope <path> ...]
  discover project Sequence
  deterministically lower human intent into a read-only CellInput
  run one cell
  persist the complete record
  render a concise actionable summary

review [record]
  read a retained CellRunRecord
  render the same summary without rerunning the model
```

`probe` never invents acceptance, write authority, commands, or a treatment.
Acceptance remains an explicit human input. Its first slice is deliberately
read-only; later write-capable interactions must introduce an explicit authority
grant rather than silently widening `probe`.

When a cell has no command authority, its terminal protocol structurally admits
only an empty check plan. This is an environment constraint, not a prompt
convention: a model may propose a check only when the workspace grants a command
surface capable of executing it.

Project discovery walks upward from the current directory until it finds
`principles/SEQUENCE.md` and `principles/interpretations/`. That convention is
the first adapter for this repository, not a new core requirement. The shell
lowers it into the existing genome contract.

Workspace policy gains explicit excluded paths. A bare excluded segment such as
`node_modules` applies at any depth; a multi-segment path excludes that subtree.
Project probes exclude `.git`, `.work-cell`, and `node_modules` by default. The
workspace snapshot covers only possible write scopes when no command surface is
granted. Because an allowed command can have filesystem side effects, any cell
with command authority snapshots the readable workspace (still respecting
exclusions). A read-only probe therefore does not hash the entire repository.

## Interaction boundary

```text
human intent + human acceptance + optional scope
                         │
                         ▼
              project interaction adapter
       discovery + defaults + deterministic lowering
                         │
                         ▼
                    CellInput v1
                         │
                         ▼
                  Work Cell core
                         │
                         ▼
                  CellRunRecord v1
                         │
                         ▼
              human summary + raw record path
```

The summary is a projection, not a second record. It reports status, expressed
P-IDs, their principal contradiction and decision contributions, artifact or
provisional submission, evidence, verification, usage/cost, and failure
diagnostics. The raw record remains the evidence-bearing source.

## Non-goals

- No conversational session, TUI, task board, daemon, scheduler, or durable
  project state.
- No model-generated acceptance conditions or inferred write permission.
- No automatic promotion of a run into project fact.
- No replacement of the exact JSON interface.
- No claim that one Sequence filesystem convention is universal.

## Acceptance

- A person can run a read-only project probe by supplying intent, at least one
  acceptance condition, and optional scopes; no full `CellInput` is required.
- Discovery produces the same existing `CellInput` contract and fails clearly
  outside a Sequence-bearing project.
- Default exclusions prevent prior evidence and dependencies from appearing in
  file listings, and direct access to excluded paths is rejected.
- A read-only cell does not snapshot unrelated repository files.
- Probe and review render an actionable summary while retaining the full record.
- Deterministic tests cover lowering, discovery, exclusions, presentation, and
  the unchanged exact interface; one live project probe completes successfully.

## Implementation evidence

The [project probe evaluation](../../regeneration/evaluations/2026-07-10-work-cell-project-probe.md)
records the initial dogfood failures, the resulting boundary changes, and two
successful live probes. The accepted interface is implemented by
[`project.ts`](../../packages/work-cell/src/project.ts),
[`presentation.ts`](../../packages/work-cell/src/presentation.ts), and the
`probe` / `review` branches in [`cli.ts`](../../packages/work-cell/src/cli.ts).
