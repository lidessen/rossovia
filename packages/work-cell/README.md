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

The package does not depend on an external agent engine. AI SDK 7 is the first
driver adapter; `deepseek-v4-flash` is the default model. Validation calls use
only an explicitly supplied route or a human-confirmed provider profile. A
globally available credential is discoverable capacity, not permission to
spend it. Every configured fallback occurs at the individual model-call
boundary. It does not restart a Cell or replay its tools.
The driver retains the actual serving provider and model, per-step usage, and
performance in the ordinary Cell trace. The core contract can support another
adapter without changing run records or experiment semantics; see
[decision 032](../../design/decisions/032-ai-sdk-7-work-cell-driver.md) and
[decision 034](../../design/decisions/034-validation-model-routing.md).
The AI SDK driver exposes `list_files` and `read_file` only when `readPaths` is
non-empty, `write_file` only when write scope exists, and `run_command` only
when commands are allow-listed. An unavailable capability is absent from the
model-facing tool surface rather than present as a guaranteed failure.

Model routing has three extension points. `model-route.ts` executes an ordered
provider-neutral route and retains attempts; `providers/` owns each external
API's construction, request translation, error meaning, and pricing; and
`provider-profile.ts` owns explicit preference and credential references while
`validation-model.ts` resolves that selection into provider-specific models.
Adding or replacing a validation provider should change these policy and
adapter surfaces, not the generic route executor. OpenCode Go and Kimi Coding
Plan are fixed-price subscriptions: their token tariffs measure allowance
consumption, not marginal money spent by one Cell. Any subscription or mixed
route therefore retains usage and serving evidence but omits a dollar estimate
until cost audit can attribute usage per served call and distinguish allowance
from actual spend.

Provider observation is separate from execution preference. The generic
observation result keeps availability, quota freshness, normalized windows, and
source authority distinct. Codex is observed through its local app-server
without opening a model turn. Claude availability comes from `claude auth
status`; quota is captured from Claude Code's documented statusline input into
Work Cell's own cache. `provider capture claude` may forward the unchanged input
to any existing statusline command, but that command and its storage are never
dependencies.

Kimi exposes a separate, experimental read-only usage endpoint, described by a
[Kimi developer-support response](https://forum.moonshot.ai/t/error-code-429-were-receiving-too-many-requests-at-the-moment/191/7).
It is an observer, not part of model execution or fallback: `bun run
provider:observe:kimi` shows weekly and rolling-window percentages and reset
times, while `bun src/cli.ts provider observe kimi-coding --json` emits the normalized status for a
status bar or another tool. If this undocumented response changes, quota
display fails visibly without disabling Kimi model calls. The endpoint does not
currently expose a separately named monthly window, so Work Cell does not
invent one from the plan's total quota field.

[OpenCode Go documents](https://opencode.ai/docs/go/#usage-limits) 5-hour,
weekly, and monthly limits, but currently directs users to its console rather
than publishing a quota API. Work Cell does not copy the community workaround
of scraping an authenticated workspace page. Model response usage remains
available per call; it is not mislabeled as the account's remaining allowance.

## Live run observation

The final Cell record remains the durable audit source, but callers do not need
to wait for settlement to learn how a run is proceeding. `runCell` accepts an
optional `onTrace` observer that receives the same bounded events retained in
the final trace. A synchronous observer failure is retained as
`cell.observer.failed`, detaches that projection, and never changes Cell
execution or settlement. The AI SDK driver emits model/provider identity and
step start, tool start and finish, completed-step usage, terminal and
structured-settlement transitions, errors, and final status.

The `run` CLI writes those events incrementally to a run-ID-scoped JSONL file
beside the input, prints its path and a compact live projection to stderr, and
returns the path in its final stdout JSON while that sink remains writable. If
the sink fails, the Cell continues, records `cell.observer.failed`, and does not
claim the partial path as an available result. A background caller can tail a
healthy file without parsing a partial final record.

When a live observer is attached, the AI SDK driver uses its streaming agent
path. Provider-exposed reasoning produces bounded start, character-progress,
and finish events; response production is projected the same way. Raw
reasoning text is neither copied into the trace nor treated as a portable
contract. Tool names, bounded tool evidence, tool duration, serving route, and
completed-step token use remain visible. Usage is reported only when the
provider settles a step; Work Cell does not estimate an in-flight token count.

The model route may select a fallback only before a provider returns a stream.
Once streaming begins, a later error belongs to that one response and is never
spliced into another provider's partial output.

## Orchestration runtime

`runCell` remains the atomic execution boundary. Multi-Cell execution is built
above it through a small `WorkSource` protocol: a source yields one eligible
lease, the orchestration kernel runs that ordinary Cell with a fresh driver,
and the source receives the retained settlement. The kernel owns bounded
capacity, attempt identity, cancellation propagation, failure conversion, and
raw lifecycle events. It does not invent tasks, interpret a result, retry work,
or accept semantic quality.

An `InMemoryCellQueue` is the first open source implementation. It may begin
empty, accept already-prepared Cells while execution is running, and finishes
only after its producer explicitly closes it and every dispatched Cell settles:

```ts
const queue = new InMemoryCellQueue();
const running = runOrchestration(queue, createDriver, { concurrency: 4 });

await queue.submit(firstCell);
await queue.submit(secondCell);
queue.close();

const run = await running;
```

The queue is currently in-process and ephemeral. It is a runtime API rather
than a static CLI manifest: a closed static list is already a Swarm. A future
durable queue, dependency graph, pipeline, or remote worker carrier implements
the same source/settlement boundary and separately declares leases,
idempotency, persistence, retry, and workspace-allocation policy. Those
concerns do not enter `CellInput`, `CellDriver`, or `runCell`; see
[decision 031](../../design/decisions/031-extensible-work-cell-orchestration.md).

## Work proof

Use only the presence conditions the task actually needs. Declare them directly;
there is no `resultContract` or review-pack wrapper:

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
  "artifacts": [{ "path": "output/report.md", "instructions": "Write the report." }],
  "tasks": [
    { "subject": "Inspect the bounded source", "description": "Read the declared source." },
    { "subject": "Write the report", "description": "Create output/report.md." }
  ]
}
```

`terminalTools` dynamically become callable tools and require one declared tool
to be called exactly once. Without `outputSchema`, that call ends the model loop;
with `outputSchema`, one tool-free step may still produce the independent
logical result. Terminal names must be unique, and a driver must reject names
that collide with its ordinary execution tools before dispatch. The terminal
input remains trace evidence and is not silently
treated as that result. `outputSchema` validates the final logical result. `artifacts`
require a regular file in write scope that this run added or changed; the record
retains its SHA-256 and byte size. `tasks` optionally seeds host-owned work with
stable IDs, descriptions, status, ownership, and dependencies. The default
driver exposes `task_create`, `task_update`, `task_list`, and `task_get`; a host
may instead project read-update or read-only Task tools, so authority is removed
from the actual tool schemas rather than merely discouraged in a prompt. Simple
work need not create tasks. Once tasks exist, the Cell must finish without
`pending` or `in_progress` tasks. Task settlement contributes low-cost process
evidence to mechanical work proof, but a completed task is not evidence that
the underlying work is correct. Do not copy every instruction or acceptance
condition into tasks. None implies the schema or payload of another.
See [decision 033](../../design/decisions/033-work-cell-terminal-contract.md).

This proof answers **whether**, never **whether it is correct**. A tool call can
be mistaken, schema-valid output can be false, and an artifact can contain the
wrong work. Correctness is judged separately
by a designated Agent against the task, sources, acceptance, and evidence. The
runtime does not require a generic review pack; use one only when a domain review
is large enough to need partitioning and reconstruction.

`run` and `swarm` default to the manager Task surface for backward-compatible
interactive use. A host can narrow that authority without changing the Cell or
Swarm manifest:

```bash
bun src/cli.ts run cell.json --task-tools read-update
bun src/cli.ts swarm review-swarm.json --task-tools read-only
```

`read-update` removes Task creation and structural mutation; `read-only`
exposes only `task_list` and `task_get`. This is a host execution choice, not a
model-authored `CellInput` field. A read-only review that needs a guaranteed
submission should declare its caller-owned terminal tool; `outputSchema` alone
validates a logical result but is not a stop action.

The AI SDK driver may change how it obtains `outputSchema` when a selected
provider does not support native structured responses. It first completes the
ordinary investigation without response-format pressure, then uses a private
schema tool to project the retained evidence. The internal tool is not added to
`terminalTools`; the caller still declares one output contract and Work Cell
still validates it independently. Trace and usage expose the extra settlement
phase instead of pretending it was one provider-native response.

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

Drivers report completed provider-step usage incrementally as well as in their
final result. The final result remains authoritative on success; incremental
observations are the audit fallback when cancellation or failure wins before a
result returns. A timeout therefore does not turn already-observed model work
into zero usage.

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
bounded concurrency value. Its value is scale control: a caller or domain skill
first decomposes oversized work until each Cell has a coherent, locally
verifiable task; the runtime then controls concurrent resource pressure, failure
isolation, stable manifest-order records, and compact persistence. It does not
add a shared mind, task generation, communication, synthesis, voting, or
semantic acceptance, and it never infers semantic partitions itself.
It is the closed fixed-manifest execution form over the common orchestration
kernel, not a second Cell runtime.
The input must declare `concurrency` explicitly; the runtime never turns an
omitted resource decision into a hidden 32-way release.

`startSwarm` returns an in-process handle after admission so a supervisor may
observe other inputs or cancel while Cells run. `runSwarm` starts the same
carrier and awaits its final settlement for CLI, tests, and short direct calls.
The handle does not make the Swarm durable or remote; those remain carrier
properties above the atomic Cell contract.

`startSwarmFromFile` is the file-backed asynchronous carrier for tools and
supervisors that should not copy a large manifest through model context. Its
tool-sized input is `{ "inputFile": "relative/path.json", "sha256": "..." }`;
the host owns both the resolution root and output root. Before dispatch it reads
once, validates the ordinary `SwarmInput`, records its digest, and freezes that
parsed value. The returned handle immediately names `status.json` and
`index.json`; the latter links to independent Cell records after settlement.
The file reference is transport metadata and is not added to `SwarmInput` or
`SwarmRun`.

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

Differentiate Cells primarily through their bounded intent, semantic packet,
evidence surface, local acceptance question, and flat work-proof conditions. These fields
shape what the Cell must notice without spending active context on a simulated
personality. Add at most one compact attention bias only when a controlled probe
shows that the local task needs it; semantic relevance alone is not evidence of
need. A verbose role or "think harder" prompt can push the same packet outside
its stable working envelope, while even a short label can redirect source order
and worsen a mismatched authority judgment. A task-matched state-transition
bias also tripled median use on an already stable packet without improving its
judgment; see the
[cross-project differentiation probe](../../regeneration/evaluations/2026-07-15-cross-project-cell-differentiation.md).
Stability therefore belongs to the whole prepared Cell shape, not to the model
name or token count alone; see the
[stability and sparse-differentiation probe](../../regeneration/evaluations/2026-07-15-cell-stability-and-sparse-differentiation.md).

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
`runCell`, the AI SDK driver, the orchestration protocol and in-memory queue,
and the general Swarm runtime. Optional carriers are explicit adapter entry
points:

- `src/adapters/sequence/`
- `src/adapters/experiment/`
- `src/adapters/model-evaluation/`
- `src/adapters/deliberation/`
- `src/adapters/cognition/`

The cognition adapter lowers one caller-prepared formation move into a generic
Cell and remains an explicit adapter entry point. It does not enter the main
core barrel or grant Work Cell scheme selection, memory state, semantic truth,
or admission authority.

The model-evaluation v2 adapter compares whole execution profiles, not bare
model names. Its manifest explicitly records context and tool-surface policies
plus a declared inference policy; separates procedural worker acceptance from
evaluator-only reference criteria; and reports selected route identities
without claiming to verify a provider's hidden backend build or inference
settings.

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

# Repeated real-task evidence for two explicit execution profiles.
bun src/cli.ts model evaluate path/to/model-evaluation.json

# Bounded independent deliberation; the result is evidence, never a vote that commits work.
bun src/cli.ts deliberate path/to/deliberation.json

# Inventory known credential references without exposing values, probing, or selecting.
bun src/cli.ts provider discover

# Confirm and store an explicit validation route; omit --route for an interactive prompt.
bun src/cli.ts provider configure \
  --route opencode-go,kimi-coding,deepseek

# Read-only provider observations; add --json for integrations.
bun src/cli.ts provider observe kimi-coding
bun src/cli.ts provider observe codex
bun src/cli.ts provider observe claude

# Configure this as a Claude Code statusline sink. It reads statusline JSON from stdin.
# --forward may preserve an existing statusline, but is never an observation dependency.
bun src/cli.ts provider capture claude

# Prepare a compact project-facing deliberation packet; add --execute only after inspection.
bun src/cli.ts deliberate-probe "Question" --option A="..." --option B="..." \
  --seat P04="..." --seat P11="..." --seat P15="..." --source design/decision.md \
  --budget-tokens 60000 --member-estimated-tokens 20000 --budget-source "Principal approval"
```

Live model commands require an explicit route and every credential referenced
by that route. The default profile is
`$XDG_CONFIG_HOME/work-cell/providers.json` (or
`~/.config/work-cell/providers.json`); `WORK_CELL_PROVIDER_PROFILE` can select
another file. Credential discovery never creates this profile. Kimi uses
`kimi-for-coding` by default; callers may explicitly select another model
admitted by their membership through the profile's model field. The current
`provider configure` command selects and orders providers only, so a non-default
model is set by directly editing that strict, non-secret profile. The runtime
reacts to provider responses rather than
mirroring remote allowance counters. To use one provider directly, configure a
one-target route; merely setting one key does not authorize it.

Generated evidence is written beneath `.work-cell/`, which is intentionally
ignored because it may contain full model traces and workspace diffs. Promote a
reviewed result deliberately into `regeneration/evaluations/`; do not treat raw
output as accepted project fact.

## Independence boundary

- No external task board, scheduler, memory, daemon, or agent process.
- No cell-to-cell messaging, child-cell expansion, or implicit task tree.
- The in-process queue dispatches already-prepared Cells only. It is not durable,
  does not poll for work, and cannot grant itself retry or acceptance authority.
- `swarm` releases one to 256 already-defined ordinary Cells with bounded
  concurrency. It preserves independent records but does not synthesize them,
  retry work, or decide whether any result is semantically good.
- `deliberate` runs three to five read-only, command-free member Cells from one
  docket. Each member must state a structured position; the CLI preserves raw
  member records and emits a non-authoritative vote-and-dissent projection. It
  cannot create consensus, accept a proposal, allocate budget, or merge work.
- `model evaluate` runs one frozen task field through two explicit profiles,
  retains repeated and blind-judge evidence, and emits descriptive observations.
  It cannot admit a capability profile, rank models globally, or alter provider
  preference.
- No Sequence mutation or automatic candidate adoption.
- Workspace containment is for local evaluation, not a hardened hostile-code
  sandbox. Commands use argv arrays, no shell, and an explicit executable list.
