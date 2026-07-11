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

## Bounded deliberation

For a material proposal, `deliberate <manifest.json>` runs **three to five**
independent members sequentially. Members share one question, option set,
source list, and complete Sequence-coverage declaration, but do not receive one
another's results. Every member is forced to be read-only and command-free.

The manifest carries full `CellInput` objects whose `workspace.root` values are
absolute paths. The CLI adds the docket and member-role instructions to the
Cell's ordinary prompt surface. The generic Cell contract carries only an
optional `{ schema, value }` structured result; this adapter asks members to
use its own position schema with `support`, `oppose`, `reserve`, or `discover`,
plus a decision delta, strongest counterargument, and unchanged alternative.

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
  "members": [{ "id": "strategy", "role": "strategy seat", "input": { "...": "CellInput" } }]
}
```

In a real manifest, `sequenceCoverage` must account for **every** P-ID in the
shared Sequence exactly once, `members` must contain three to five entries, and
the sum of member token caps must not exceed the human-authorized allocation
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
record exposes any `overrunTokens`; it never retries or expands the envelope.

### Project-facing docket

`deliberate` remains the exact portable interface for adapters and fixtures.
For a Sequence-bearing project, use `deliberate-probe` to lower the human-sized
decision surface instead of hand-writing member `CellInput` JSON. It accepts a
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
  --budget-tokens 60000 --member-tokens 20000 \
  --budget-source "Principal Decision Brief: A"

# Only after inspecting the prepared docket and confirming the existing
# allocation, append --execute to start the independent members.
```

The evidence file labels each source excerpt with the full-source SHA-256 and
declares its character cap. An excerpt is not evidence that omitted material is
irrelevant: members must identify a material omission rather than broaden their
scope. See [decision 022](../../design/decisions/022-project-first-deliberation-interaction.md).

## Generic-core promotion rule

Work Cell is a general runtime. Prompts, selected skills, tools, and adapter
schemas differentiate it for a concrete practice. A proposal-specific role,
vote, workflow, or doctrine belongs in an adapter such as `deliberation.ts`,
not in `CellInput`, `CellSubmission`, the driver, or `runCell`.

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

# One cell input JSON
bun src/cli.ts run path/to/cell.json

# Matched baseline/treatment experiment
bun src/cli.ts experiment experiments/p23-bounded-autonomy.json

# Bounded independent deliberation; the result is evidence, never a vote that commits work.
bun src/cli.ts deliberate path/to/deliberation.json

# Prepare a compact project-facing deliberation packet; add --execute only after inspection.
bun src/cli.ts deliberate-probe "Question" --option A="..." --option B="..." \
  --seat P04="..." --seat P11="..." --seat P15="..." --source design/decision.md \
  --budget-tokens 60000 --member-tokens 20000 --budget-source "Principal approval"
```

Live commands require `DEEPSEEK_API_KEY`. Generated evidence is written beneath
`.work-cell/`, which is intentionally ignored because it may contain full model
traces and workspace diffs. Promote a reviewed result deliberately into
`regeneration/evaluations/`; do not treat raw output as accepted project fact.

## Independence boundary

- No external task board, scheduler, memory, daemon, or agent process.
- No cell-to-cell messaging. A parent may return child specifications; the
  local tree runner materializes fresh cells within hard depth and count limits.
- `deliberate` runs three to five read-only, command-free member Cells from one
  docket. Each member must state a structured position; the CLI preserves raw
  member records and emits a non-authoritative vote-and-dissent projection. It
  cannot create consensus, accept a proposal, allocate budget, or merge work.
- No Sequence mutation or automatic candidate adoption.
- Workspace containment is for local evaluation, not a hardened hostile-code
  sandbox. Commands use argv arrays, no shell, and an explicit executable list.
