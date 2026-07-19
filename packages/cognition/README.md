# Cognition

`@atthis/cognition` is an experimental mechanism for progressive cognition
formation. It is not a workspace index, one-layer knowledge graph, transcript
memory, universal ontology, or model runtime.

Its first slice separates five forms:

- immutable **sources** retain concrete material and observed practice outcomes;
- versioned **formation schemes** declare a domain's stages and legal moves;
- **cognitive artifacts** record one move, its exact inputs, rationale, stage,
  and proposed or active status;
- append-only **events** retain registration, capture, proposal, and admission;
- a **catalog** is a disposable lookup projection over formed artifacts.

Graphs, embeddings, full-text indexes, and visualizations may become other
projections. They do not define how cognition forms and never acquire fact
authority.

The operating loop is `notice -> filter/coalesce -> capture -> triage -> form ->
admit -> use -> observe -> inspect impact -> refresh`. JSON ingress lets a tool
or harness adapter capture ordinary work without inventing a vendor-specific
integration. It accepts a capture-worthy event after the adapter has applied
scope, privacy, identity, deduplication, and debounce; it is not a mandate to
persist every raw event. Capture is idempotent and does not admit knowledge.

## Small operational surface

The core deliberately offers only the routine actions needed to maintain a
formation lineage:

```bash
bun src/cli.ts init --home /tmp/cognition
bun src/cli.ts scheme add project-scheme.json \
  --by human:lidessen --basis "Project cognition experiment" \
  --home /tmp/cognition
bun src/cli.ts source add note.md --kind manual --home /tmp/cognition
printf '%s' '{"kind":"conversation","locator":"session:42","content":"Direct correction","actor":"hook:agent"}' \
  | bun src/cli.ts source ingest --home /tmp/cognition
bun src/cli.ts artifact propose \
  --scheme project --revision 1 --move observe \
  --title "Observed boundary" --body-file observation.md \
  --rationale "Directly represented from accepted design" \
  --input source:source_... --home /tmp/cognition
bun src/cli.ts artifact admit artifact_... \
  --by reviewer:project --basis "Checked against the named source" \
  --home /tmp/cognition
bun src/cli.ts artifact trace artifact_... --home /tmp/cognition
bun src/cli.ts artifact dependents artifact_... --home /tmp/cognition
bun src/cli.ts source dependents source_... --home /tmp/cognition
bun src/cli.ts artifact use artifact_... \
  --by agent:task --purpose "architecture decision" --home /tmp/cognition
bun src/cli.ts artifact supersede artifact_old \
  --with artifact_new --by reviewer:project --basis "Re-formed from revised source" \
  --home /tmp/cognition
bun src/cli.ts query authority --scheme project --stage model --home /tmp/cognition
bun src/cli.ts check --home /tmp/cognition
```

Schemes are domain-defined and immutable by `(id, revision)`. A move lists
ordered source or prior-stage artifact inputs and one output stage. Proposals
must match that formation contract. Higher artifacts may be explored from
proposed inputs, but cannot be admitted until every artifact input is active.
A later admission revalidates the recorded move, output stage, ordered inputs,
and every reachable source hash rather than trusting proposal-time state.
A feedback move can combine an admitted guidance artifact with a captured
practice outcome and return a new proposed observation; it never silently
rewrites earlier cognition.

This keeps maintenance local: `trace` explains an artifact's upstream
formation, `dependents` identifies the downstream field that may need review,
and `check` validates sources, schemes, artifacts, events, and the rebuildable
catalog. Trace and impact results are compact by default; use `artifact get` or
`source read` to expand one item on demand. Scheme design, semantic
decomposition, verification judgment, refresh policy, and authority remain
outside the deterministic package.

`query` reads only the rebuildable catalog so routine retrieval does not repeat
a full source and lineage inspection. Kernel mutations rebuild that catalog;
`check` is the explicit integrity and freshness gate after external damage,
manual file changes, or before a decision that requires source verification. It
reconciles required state transitions with operation evidence and returns
`healthy: false`; the CLI exits nonzero when evidence is damaged or missing or
the catalog is stale.

When a newly captured source revision is supplied to `source dependents`, the
impact field includes artifacts formed from its predecessor lineage. The new
revision therefore provides the ordinary refresh entry instead of requiring a
caller to remember and query the old source ID.

Work Cell or Swarm may execute one already-prepared formation move. The domain
method chooses the scheme and inputs; the host retains and admits any result.
Projects, Git, worktrees, models, prompts, providers, and task routing therefore
remain outside the core contracts.

The file-backed first slice has one writer. A host may form candidates in
parallel, but it must serialize capture, proposal retention, admission,
supersession, and catalog rebuild operations. The kernel does not yet claim a
cross-process locking or transactional commit protocol.

This package is the deterministic kernel, not the whole cognition system. A
domain Skill supplies formation judgment; CLI or tool adapters expose narrow
operations; harness hooks may notice events or request impact inspection; the
current agent, one Work Cell, or a Swarm supplies progressively more expensive
execution. Use deterministic checks and direct retrieval first, then the
current agent, then one Cell, and only then a Swarm when the source field must
be partitioned below one Cell's stable range and reconciliation is worth its
cost. Adapters coalesce ordinary events before capture; direct correction or
failed verification may request immediate inspection. Hooks never admit
cognition, and vendor-specific hook configuration stays in setup adapters
rather than this package.

A “Cognition Cell” is therefore only a generic Work Cell prepared for one
formation move. Domain methods decide semantic decomposition and relation
obligations; deterministic impact checks select candidate refresh regions;
Cells inspect bounded regions; a reconciliation formation reconnects their
boundaries; and an external verifier governs admission. Swarm provides scale
and queues, not cognition semantics.

Cheap Cell count is not evidence of value: differentiation must change source
scope, method, or contradiction, while a separate reconciliation preserves
cross-boundary relations and rejects correlated error.

Memory maintenance is deliberately asymmetric. Working context may disappear;
admitted cognition does not silently disappear. Low-use cognition can leave a
future hot retrieval projection while remaining cold and traceable. Source
revision, correction, contradiction, or failed practice triggers selective
review. A verified replacement explicitly supersedes its predecessor, and
source/artifact impact queries identify downstream cognition to inspect. The
kernel records use events but does not invent a decay score before real usage
evidence exists.
