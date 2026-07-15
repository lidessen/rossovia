# Work Cell

An independent runtime for executing bounded agent work and retaining evidence.

One cell is ephemeral. It receives an intent, isolated workspace, capability
surface, prepared instructions and context, acceptance conditions, and budget,
then executes with bounded file and command tools. A caller may independently
declare terminal tools, a structured final output schema, and required output
artifacts. The runtime records the final output and verifies declared artifacts
without making any of those conditions part of another's tool schema.

The core does not require a Principle Sequence, genome, experiment treatment,
proposal role, or vote. Adapters prepare those domain-specific forms into the
generic `CellInput` contract. The Sequence adapter selects one lead P-ID and up
to three supports, loads only their interpretations, and retains the expression
as typed preparation evidence before invoking the unchanged core.

The package does not depend on an external agent engine. AI SDK is the first
driver adapter; `deepseek-v4-flash` is the default model. The core contract can
support another adapter without changing run records or experiment semantics.

## Completion contracts

Use only the conditions the task actually needs. They are orthogonal:

```json
{
  "terminalTools": [{
    "name": "finish_report",
    "description": "Signal that the report is complete.",
    "inputSchema": { "type": "object", "properties": {}, "additionalProperties": false }
  }],
  "outputSchema": {
    "type": "object",
    "properties": { "recommendation": { "type": "string" } },
    "required": ["recommendation"],
    "additionalProperties": false
  },
  "artifacts": [{ "path": "output/report.md", "instructions": "Write the report." }]
}
```

`terminalTools` dynamically become callable tools and require one declared tool
to be called. `outputSchema` validates the final logical result. `artifacts`
require a regular file in write scope that this run added or changed; the record
retains its SHA-256 and byte size. None implies the schema or payload of another.

## Work and budget boundary

A Cell may carry a versioned **Work Estimate** and **Execution Profile**. The
estimate names necessary state transitions and discovery branches without
claiming tokens, dollars, or person-days; the profile identifies the executor
and price revision that produced an observation. A completed record retains
those links beside actual usage, duration, verification, and price-derived cost.

The first slice intentionally does not predict cost or claim P50/P80/P95
accuracy. A later read-only calibration projection must be built from retained,
comparable observations; see [decision 014](../../design/decisions/014-work-estimation-and-calibrated-budgeting.md).

`budget.estimatedTokens` is a post-run estimate, not a token stop condition.
When present, the final summary compares it with actual total, input/output,
preparation/execution use, and read volume. A caller may declare
`estimatedTokensTolerance` as a relative absolute-error tolerance (for example,
`0.5` means ±50%); only then can the summary label a variance as requiring
review. No tolerance is silently invented. Provider context limits, step limits,
duration, and workspace limits remain separate execution boundaries.

## Project interaction

For a Sequence-bearing project, start with a read-only probe rather than a full
internal `CellInput` JSON object:

```bash
# Run from the project root or any descendant.
bun src/cli.ts probe "Find the current interaction friction" \
  --accept "Return traceable evidence" \
  --accept "Preserve the Work Cell authority boundary" \
  --scope packages/work-cell \
  --scope design

# Render the latest retained probe again without a model call.
bun src/cli.ts review
```

`probe` discovers `principles/SEQUENCE.md` and its interpretations, prepares a
generic executable Cell through the Sequence adapter, and remains read-only. It
excludes `.git`, `.work-cell`, and `node_modules` from the cell's readable
surface. Full records are retained in the host project's `.work-cell/runs/`;
the terminal summary is only a readable projection of that record.

The first interaction deliberately does not infer acceptance, write authority,
commands, experiment treatments, or principle adoption. Use the exact
interfaces below when those details must be supplied explicitly.

## Work Cell Swarm

A Swarm releases between one and 256 already-defined ordinary Cells under one
bounded concurrency value. It adds execution scale, failure isolation, stable
manifest-order records, and compact persistence; it does not add a shared mind,
task generation, communication, synthesis, voting, or semantic acceptance.
The input must declare `concurrency` explicitly; the runtime never turns an
omitted resource decision into a hidden 32-way release.

```json
{
  "version": "work-cell.swarm-input.v1",
  "id": "bounded-read-only-audit",
  "concurrency": 64,
  "cells": [
    { "...": "CellInput" }
  ]
}
```

Each Cell keeps its own prepared instructions, context, skills, tools, output
contracts, budget, and workspace policy. The runtime creates a fresh driver for
every Cell and retains one outcome for every manifest entry even when a sibling
fails. Result identity follows manifest order rather than completion order.

Cells may share a workspace root only when every Cell sharing it has empty
`writePaths` and `allowedCommands`. A writable or command-capable Cell must have
its own root in this first slice; the runtime does not infer safe disjoint write
scopes or create Git worktrees.

Each invocation creates `<manifest>.<run-id>.swarm/` beside the manifest. The
`cells/` directory contains one full outcome per Cell, while `index.json`
contains hashes, statuses, aggregate usage, and a post-run estimate audit. The
index is explicitly a rebuildable projection with no acceptance authority, so
callers can inspect or load only the results they need instead of injecting all
child output into one context.

The serialized boundaries are deliberately distinct. Input uses
`work-cell.swarm-input.v1`, each retained outcome uses
`work-cell.swarm-outcome.v1`, and the compact index uses
`work-cell.swarm-index.v1`. The in-memory `SwarmRun` has no serialization
version or stored summary; it keeps execution facts as `Date` values and derives
the non-authoritative summary only when a caller or persistence adapter needs it.

## Bounded deliberation

For a material proposal, `deliberate <manifest.json>` runs **three to five**
independent members sequentially. Members share one question, option set,
source list, and complete Sequence-coverage declaration, but do not receive one
another's results. Every member is forced to be read-only and command-free.

The manifest carries full Sequence-adapter input objects whose `workspace.root`
values are absolute paths. The adapter adds the docket and member-role
instructions before preparing each generic Cell. The deliberation adapter
supplies its own `outputSchema` for a position with `support`, `oppose`,
`reserve`, or `discover`, plus a decision delta, strongest counterargument, and
unchanged alternative; that schema is not a terminal-tool payload.

```json
{
  "version": "work-cell.deliberation.v1",
  "id": "formal-operations-proposal",
  "question": "Should this proposal proceed?",
  "sources": ["design/decision.md"],
  "options": [
    { "id": "A", "summary": "Proceed with the bounded change" },
    { "id": "B", "summary": "Keep the current form" }
  ],
  "budget": {
    "envelope": { "id": "decision-allocation", "version": "budget-envelope.v1", "maxTotalTokens": 120000 },
    "source": "Principal Decision Brief: A"
  },
  "sequenceCoverage": [
    { "pid": "P04", "status": "seat", "rationale": "Names the principal contradiction" },
    { "pid": "P11", "status": "guardrail", "rationale": "Protects authority separation" }
  ],
  "members": [{ "id": "strategy", "role": "strategy seat", "input": { "...": "SequenceCellInput" } }]
}
```

In a real manifest, `sequenceCoverage` must account for **every** P-ID in the
shared Sequence exactly once, `members` must contain three to five entries, and
the sum of member token estimates must not exceed the human-authorized allocation
envelope. This is an allocation boundary, not a cost forecast or an authority
to increase the envelope.
The emitted record retains the raw member records; its tally and dissent list
are a rebuildable projection with no authority to accept a proposal, release a
budget, amend the Sequence, or merge work. A human decision brief remains the
only route to a durable commitment.

Each invocation receives a UUID in its output filename. The adapter checks
actual observed use before starting every next member; if the remaining
allocation cannot fund that member's declared cap, it retains a
`not_run_budget_envelope` member instead of starting another model call. A
single provider call can still report more than its cap after the fact, so the
record exposes any `allocationOverrunTokens`; it never retries or expands the envelope.

### Project-facing docket

`deliberate` remains the exact portable interface for adapters and fixtures.
For a Sequence-bearing project, use `deliberate-probe` to lower the human-sized
decision surface instead of hand-writing member `SequenceCellInput` JSON. It accepts a
question, two to four options, three to five P-ID seats, project-relative
evidence paths, and a human-authorized allocation. It makes a unique ignored
directory containing a compact evidence packet, a copied Sequence/interpretation
set, and the generated exact manifest. Each member can read only `docket/` and
`principles/` from that packet, never the whole project tree.

```bash
# First prepare and inspect the bounded packet. This performs no model call.
bun src/cli.ts deliberate-probe "Which bounded line proceeds?" \
  --option A="Integrate the verified mechanism" \
  --option B="Keep the current form" \
  --seat P04="principal contradiction" \
  --seat P11="authority boundary" \
  --seat P15="unchanged alternative" \
  --source design/decision.md \
  --budget-tokens 60000 --member-estimated-tokens 20000 \
  --budget-source "Principal Decision Brief: A"

# Only after inspecting the prepared docket and confirming the existing
# allocation, append --execute to start the independent members.
```

The evidence file labels each source excerpt with the full-source SHA-256 and
declares its character cap. An excerpt is not evidence that omitted material is
irrelevant: members must identify a material omission rather than broaden their
scope. See [decision 022](../../design/decisions/022-project-first-deliberation-interaction.md).

## Generic-core promotion rule

Work Cell is a general runtime. Prepared instructions and context, selected
skills, tools, and adapter schemas differentiate it for a concrete practice. A
Sequence expression, experiment treatment, proposal-specific role, vote,
workflow, or doctrine belongs in an adapter, not in `CellInput`, `CellDriver`,
or `runCell`.

The public core barrel exports contracts, the driver interface, workspace,
`runCell`, the AI SDK driver, and the general Swarm runtime. Optional carriers
are explicit adapter entry points:

- `src/adapters/sequence/`
- `src/adapters/experiment/`
- `src/adapters/deliberation/`

Creative-field, naming, latent-routing, and idea-development code lives under
`src/research/`. Package scripts may execute those probes, but neither the main
barrel nor an adapter entry point promotes them into the stable runtime API.

Only a capability demonstrated by at least two independent adapters may be
considered for the core contract, and only if it names an execution invariant
rather than one domain's vocabulary. The promotion request must show an action
probe, a boundary probe, and a context-path probe; human review decides whether
the common capability belongs in the core.

## Exact interfaces

```bash
bun install
bun run typecheck
bun test

# One already-prepared generic Cell input JSON
bun src/cli.ts run path/to/cell.json

# Bounded concurrent release of ordinary independent Cells
bun src/cli.ts swarm path/to/swarm.json

# Matched baseline/treatment experiment
bun src/cli.ts experiment experiments/p23-bounded-autonomy.json

# Bounded independent deliberation; the result is evidence, never a vote that commits work.
bun src/cli.ts deliberate path/to/deliberation.json

# Prepare a compact project-facing deliberation packet; add --execute only after inspection.
bun src/cli.ts deliberate-probe "Question" --option A="..." --option B="..." \
  --seat P04="..." --seat P11="..." --seat P15="..." --source design/decision.md \
  --budget-tokens 60000 --member-estimated-tokens 20000 --budget-source "Principal approval"
```

Live commands require `DEEPSEEK_API_KEY`. Generated evidence is written beneath
`.work-cell/`, which is intentionally ignored because it may contain full model
traces and workspace diffs. Promote a reviewed result deliberately into
`regeneration/evaluations/`; do not treat raw output as accepted project fact.

## Independence boundary

- No external task board, scheduler, memory, daemon, or agent process.
- No cell-to-cell messaging, child-cell expansion, or implicit task tree.
- `swarm` releases one to 256 already-defined ordinary Cells with bounded
  concurrency. It preserves independent records but does not synthesize them,
  retry work, or decide whether any result is semantically good.
- `deliberate` runs three to five read-only, command-free member Cells from one
  docket. Each member must state a structured position; the CLI preserves raw
  member records and emits a non-authoritative vote-and-dissent projection. It
  cannot create consensus, accept a proposal, allocate budget, or merge work.
- No Sequence mutation or automatic candidate adoption.
- Workspace containment is for local evaluation, not a hardened hostile-code
  sandbox. Commands use argv arrays, no shell, and an explicit executable list.
