# Work Cell

An independent experimental runtime for testing whether a Sequence expression,
skill, or candidate principle changes real agent behavior.

One cell is ephemeral. It receives an intent, isolated workspace, capability
surface, acceptance conditions, budget, and the host Principle Sequence. It
first expresses one lead P-ID and up to three supports, loads only those
interpretations, then executes with bounded file and command tools. It must
finish with a structured artifact, evidence, check plan, and either completion,
partial work, failure, or child-cell specifications.

The package does not depend on an external agent engine. AI SDK is the first
driver adapter; `deepseek-v4-flash` is the default model. The core contract can
support another adapter without changing run records or experiment semantics.

## Work and budget boundary

A Cell may carry a versioned **Work Estimate** and **Execution Profile**. The
estimate names necessary state transitions and discovery branches without
claiming tokens, dollars, or person-days; the profile identifies the executor
and price revision that produced an observation. A completed record retains
those links beside actual usage, duration, verification, and price-derived cost.

For a differentiation tree, an optional root **Budget Envelope** controls the
aggregate declared token allocation. Before each Cell starts, the tree clamps
that Cell's token cap to the envelope's remaining amount. When no allocation
remains, later children are retained as unresolved evidence with
`budget_envelope`, and the tree settles as `partial`; it never silently expands
the envelope. This is an execution control, not a conversion forecast or a
spending approval.

The first slice intentionally does not predict cost or claim P50/P80/P95
accuracy. A later read-only calibration projection must be built from retained,
comparable observations; see [decision 014](../../design/decisions/014-work-estimation-and-calibrated-budgeting.md).

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

`probe` discovers `principles/SEQUENCE.md` and its interpretations, lowers the
intent and human-provided acceptance conditions into the unchanged core
contract, and remains read-only. It excludes `.git`, `.work-cell`, and
`node_modules` from the cell's readable surface. Full records are retained in
the host project's `.work-cell/runs/`; the terminal summary is only a readable
projection of that record.

The first interaction deliberately does not infer acceptance, write authority,
commands, treatments, or principle adoption. Use the exact interfaces below
when those details must be supplied explicitly.

## Exact interfaces

```bash
bun install
bun run typecheck
bun test

# One cell input JSON
bun src/cli.ts run path/to/cell.json

# Matched baseline/treatment experiment
bun src/cli.ts experiment experiments/p23-bounded-autonomy.json
```

Live commands require `DEEPSEEK_API_KEY`. Generated evidence is written beneath
`.work-cell/`, which is intentionally ignored because it may contain full model
traces and workspace diffs. Promote a reviewed result deliberately into
`regeneration/evaluations/`; do not treat raw output as accepted project fact.

## Independence boundary

- No external task board, scheduler, memory, daemon, or agent process.
- No cell-to-cell messaging. A parent may return child specifications; the
  local tree runner materializes fresh cells within hard depth and count limits.
- No Sequence mutation or automatic candidate adoption.
- Workspace containment is for local evaluation, not a hardened hostile-code
  sandbox. Commands use argv arrays, no shell, and an explicit executable list.
