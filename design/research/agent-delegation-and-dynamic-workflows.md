# Agent Delegation and Dynamic Workflow Forms

**Status:** source-bound implementation research

**Observed:** 2026-07-20

**Question:** What is the smallest truthful Agent-facing primitive for dynamic
division of work in the supervised autonomy MVP?

## Finding

The recurring basic form is **Agent as tool**: a parent sends one bounded task
to a fresh Agent context, receives a compact result, and retains responsibility
for reconstruction. Independent calls produced in one model step may run in
parallel. A child may form another bounded contribution without receiving the
parent's outer authority; topology depth is an adaptive organization choice,
not a new authority layer. Handoff, shared teams, and model-authored workflows
solve different problems and should not be collapsed into that primitive.

## Compared forms

| Form | Implemented behavior | Suitable use |
|---|---|---|
| Agent as tool / subagent | Parent sends a task into an isolated context and resumes with the result. | Bounded investigation, execution, verification, and parallel evidence gathering. |
| Handoff | A selected Agent becomes active and continues the conversation or graph state. | User-facing routing or a specialist that should take over. |
| Fixed parallel batch | Parent emits several independent Agent/tool calls; the runtime dispatches them concurrently and returns all results. | A known, independent decomposition. |
| Dynamic workflow | A program chooses later Agent calls from earlier results and combines them. | Data-dependent map-reduce or sequencing that cannot fit one tool-call step. |
| Shared Agent team | Independent sessions share tasks and messages, normally under a lead. | Work requiring peer discussion or ongoing coordination, with higher state and token cost. |

## Implementation observations

### AI SDK

The [AI SDK subagent guide](https://ai-sdk.dev/docs/agents/subagents) implements
a subagent as an ordinary tool. The tool executor calls another
`ToolLoopAgent`, propagates `abortSignal`, and returns its result. The child has
a fresh context unless history is explicitly passed. `toModelOutput` can show a
full child trace to the user while returning only a compact result to the
parent model. The [parallel tool-call cookbook](https://ai-sdk.dev/cookbook/node/call-tools-in-parallel)
uses one generation step for independent parallel calls.

This is enough for an ordinary single delegation, but its direct child executor
is not by itself an atomic admission boundary for a formation. The Mission
needs to inspect every `delegate` call produced by one model step before any
child starts. The local implementation therefore uses `ToolLoopAgent` as the
parent carrier while leaving `delegate` and `delegate_file` without executors.
Ordinary preparation tools such as a host-scoped `write_file` may execute and
continue the loop; one later step containing only delegate calls stops the
carrier, lets the host admit the complete final-step batch, and starts no child
before that admission. AI SDK is the Agent-loop carrier, not the source of
Mission semantics, authority, or task decomposition.

When `write_file` carries a large packet, the adapter replaces its completed
tool-call content with a compact persisted-length marker before the next model
step and before retaining parent response messages. The tool result preserves
the relative path, bytes, and digest; the expanded semantic call re-enters only
through host validation and admission, not transcript replay. The writer itself
is host-injected and scope-bound rather than authority granted by the model.

### Eve

At observed commit
[`0dfe6da`](https://github.com/vercel/eve/tree/0dfe6da7e48f683b97807b913be703ecee1b5b60),
Eve's root-only built-in `agent` tool and every declared subagent expose the
same small shape: `{ message, outputSchema? }`. Children start fresh; the root
copy shares its tools and sandbox but cannot recursively receive `agent` or
`Workflow`. Several calls in one response are dispatched concurrently. See
[the subagent contract](https://github.com/vercel/eve/blob/0dfe6da7e48f683b97807b913be703ecee1b5b60/docs/subagents.mdx)
and [its model-visible definition](https://github.com/vercel/eve/blob/0dfe6da7e48f683b97807b913be703ecee1b5b60/packages/eve/src/runtime/framework-tools/agent.ts).

Eve's experimental
[`Workflow`](https://github.com/vercel/eve/blob/0dfe6da7e48f683b97807b913be703ecee1b5b60/docs/guides/dynamic-workflows.md)
is deliberately a second layer. The model authors JavaScript inside an
allowlisted QuickJS sandbox; the program can call only the current Agent's
subagents, has a bounded call count, emits normal child-session events, and is
one durable step. It adds value when later calls or aggregation depend on
earlier results, not for a small fixed fan-out.

Eve also gives each child a session and event lineage, propagates parent
cancellation, and splits an enforced remaining token quota across a local
fan-out batch. The first two are applicable here. The token rule is not: this
project treats token figures primarily as forecasts and post-run audit, with a
high runaway ceiling rather than ordinary fine-grained hard allocation.

The more important runtime boundary is below the tool definition. Eve first
stores the complete action batch, originating assistant messages, and turn/step
coordinates in durable session state; only a later step dispatches the children.
The parent resumes only when every requested action has a result matched by call
ID and ordered back into the original batch. See
[`setPendingRuntimeActionBatch`](https://github.com/vercel/eve/blob/0dfe6da7e48f683b97807b913be703ecee1b5b60/packages/eve/src/harness/runtime-actions.ts),
the [dispatch step](https://github.com/vercel/eve/blob/0dfe6da7e48f683b97807b913be703ecee1b5b60/packages/eve/src/execution/dispatch-runtime-actions-step.ts),
and the [child input builder](https://github.com/vercel/eve/blob/0dfe6da7e48f683b97807b913be703ecee1b5b60/packages/eve/src/execution/subagent-tool.ts).
This is the applicable recovery pattern, with one important local
qualification: admit the complete batch and park its call identities and model
messages on the **parent timeline**, then give every child its own linked
timeline for dispatch and settlement evidence. The parent records references
and barrier readiness, not copies of every child history. Eve does not perform
this project's semantic Task Shape, coverage, or effect admission, so
structural parking cannot replace those checks.

### Claude Code

Claude Code distinguishes returned subagents, independently supervised
background sessions, communicating Agent teams, worktree isolation, and a
planned `/batch` split. Its [parallel-agent guide](https://code.claude.com/docs/en/agents)
describes subagents as isolated side workers that return a summary, `/batch` as
5–30 worktree-isolated contributions, and teams as a lead plus shared tasks and
mailboxes. The [team guide](https://code.claude.com/docs/en/agent-teams) warns
that teams are experimental, cost more tokens, and do not automatically isolate
writers in worktrees.

The [Claude Code changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)
advertises dynamic workflows over tens to hundreds of background Agents, but
does not publish a stable model-facing or persistence contract. It establishes
the usefulness of large dynamic fan-out, not an interface to reproduce.

Anthropic's production
[multi-Agent research retrospective](https://www.anthropic.com/engineering/multi-agent-research-system)
adds an important suitability boundary. Orchestrator-workers performed best on
valuable breadth-first work with independent directions and large context/tool
loads; tasks with shared context or dense dependencies were poorer fits, and
many coding tasks offered less true parallelism than research. The reported
multi-Agent runs also used roughly 15 times the tokens of ordinary chat. This
supports Flash-first, task-shaped fan-out and an explicit single-Agent baseline,
not swarm-by-default.

The same retrospective reports two practices that fit the existing design:
teach the lead to scale worker count and give each child an objective, output
form, tools/sources, and boundary; and let large child outputs persist as
artifacts while returning lightweight references to reduce both context loss
and token copying. It also identifies synchronous batch waiting as a steering
bottleneck, reinforcing the need for child session lineage, cancellation, and
safe-point reconciliation rather than invisible blocking.

### OpenAI Agents and the older Swarm experiment

The current [OpenAI Agents orchestration guide](https://openai.github.io/openai-agents-python/multi_agent/)
draws the decisive boundary: agents-as-tools keep a manager in control so it
can combine bounded specialist results; handoffs transfer control to the
specialist. The [tool reference](https://openai.github.io/openai-agents-python/tools/)
also makes nested Agent state explicit rather than automatically inheriting the
parent conversation.

The older educational
[OpenAI Swarm](https://github.com/openai/swarm/tree/6af0b4caf37dca4526dfd98e9fbd8ce36e7eeb22)
does not implement a parallel evidence swarm. Its loop treats a tool function
that returns an `Agent` as a request to switch `active_agent`, then continues
over the accumulated message history. It is useful evidence for handoff
minimalism, not for this project's divide-and-reconstruct mechanism.

### LangGraph Swarm

At observed commit
[`749d445`](https://github.com/langchain-ai/langgraph-swarm-py/tree/749d4450f248838f4340ec47da16e5a0f14d3078),
LangGraph Swarm similarly stores `active_agent`, routes the graph to that node,
and implements `transfer_to_*` tools as a state update plus `goto`. Its default
handoff copies the full shared message state; custom wrappers are needed for
isolated histories. See
[`swarm.py`](https://github.com/langchain-ai/langgraph-swarm-py/blob/749d4450f248838f4340ec47da16e5a0f14d3078/langgraph_swarm/swarm.py)
and
[`handoff.py`](https://github.com/langchain-ai/langgraph-swarm-py/blob/749d4450f248838f4340ec47da16e5a0f14d3078/langgraph_swarm/handoff.py).

## Consequences for the autonomy MVP

1. Expose a small typed `delegate` tool, not a model-facing core `SwarmInput`.
   Bind each call by `taskId` to one existing host-owned Task rather than
   duplicating a second delegate-only queue. Project TaskCreate/Update/List/Get
   according to the caller's authority; an executor or reviewer must not receive
   a forbidden operation or a wider update schema.
   When the semantic call is already present as a large JSON file, expose the
   separate `delegate_file` transport with only a relative path and optional
   digest. The host resolves it inside a declared root and freezes the validated
   ordinary delegate call before admission; file location never enters the
   in-memory semantic call contract.
2. One call means one bounded contribution. Calls from the same model step may
   become one runtime Swarm batch only after the Mission controller has seen
   and admitted the whole step and their dependencies permit it. No child may
   start from an ordinary per-call tool executor before that admission.
3. Keep the Mission convener active so it can compare, reconstruct, and decide
   the next bounded action. Do not use handoff for ordinary decomposition.
4. Record formation as a projection of the frozen whole plus accepted delegate
   calls and their settlements; do not require a duplicate `submit_formation`.
   The complete `delegate` tool-call step is itself the submission boundary.
   Unassigned obligations remain visible and block effect or completion, but
   need not block an earlier useful partial batch.
5. Keep child histories isolated and return compact structured results,
   artifact references, and the child result-file path. Preserve full execution
   evidence outside parent model context. A file-backed input remains a small
   path-bearing tool call in parent messages; its expanded content belongs to
   admission evidence and the child execution, not a replay into the parent.
6. Make cancellation, session lineage, permissions, workspace bounds, provider
   resolution, and concurrency runtime-owned.
7. Persist an admitted batch and its call-ID-to-child-timeline mapping on the
   parent before constructing any child driver. A failed parent checkpoint must
   start no child. Each child owns its execution timeline; the parent may append
   a ready barrier and resume only after every linked child timeline contains a
   compatible settlement, ordered by the original calls.
8. Do not make recursive delegation a universal forbidden operation. A concrete
   MVP adapter may omit it while child lineage, effect containment, recovery,
   and cost visibility are not representable; record that as a capability
   limit, not organizational doctrine. When nesting is available, the child
   inherits the outer effect and authority boundary, names the local benefit,
   and reconnects compact evidence through its immediate parent.
9. Keep parallel writers isolated; retain the MVP rule of read-only fan-out and
   one separately verified writer.

The canonical lifecycle is asynchronous even when a caller chooses to await it:
the parent parks after formation and dispatch, child timelines settle
independently, and a later parent step receives tool results only after the
barrier and input-watermark reconciliation. A blocking `run` function remains a
useful convenience over that lifecycle for tests, CLI use, and short bounded
calls; it is not the Mission control-plane contract.

The local prototype expresses this boundary as an explicit parent-loop state
machine: `advance` may return `parked`, while `resume` remains `parked` until
the linked child-timeline barrier is complete. Only then is a compact tool
result appended and another model step permitted. This proves the park/resume
shape.

The first supervisor gate keeps two watermarks distinct: **received** input is
durable evidence that something arrived, while **reconciled** input is the
explicit baseline the current parent formation may rely on. If received input
advances beyond that baseline, `input-pending` withholds parent continuation;
it does not offer an acknowledgement operation that could masquerade as
semantic reconciliation. An explicit later reconciliation step must form a new
parent baseline. Cross-process append/dispatch fencing is still open.

Reconciliation itself is shaped as one guarded Work Cell, not a bare structured
generation: one anchor and one next input enter active context, and a
`submit_reconciliation` terminal tool closes the Agent loop. The runtime retains
the Cell record and attaches its run identity to the proposal. A different
verifier must supply evidence and the next source-linked anchor before the
timeline advances. This separates tool-loop completion, semantic proposal,
verification, and state commit.

## Local host-constructed topology probe

The
[2026-08-07 Northstar topology repetition](../../regeneration/evaluations/evidence/2026-08-07-host-constructed-nested-topology/RESULT.md)
provides one bounded counterexample to treating a compact child result as
automatically usable parent evidence. A direct Cell read nine related files. A
host-constructed nested arm gave two protocol/case files to a child and the
other seven files plus the schema-valid child report to a parent. All Cells
matched route and backend identity, retained read-only workspaces, and produced
valid output. In a label-masked independent semantic review, direct was
accepted while nested was rejected: the parent repaired the adapter but
downgraded the exact case defect to a plausible child claim because its raw
sources were absent. Candidate content exposed clues about information
topology, so the review did not provide full blinding.

Nested used 2.00× the direct tokens, 1.37× the serial duration, and 1.54× the
estimated API cost in that repetition. This does not establish a general
single-Agent advantage, but it narrows consequence 5: compactness, schema
validity, lineage, and a source path do not by themselves make a returned claim
a load-bearing premise.

The follow-up
[parent-only evidence-admission treatment](../../regeneration/evaluations/evidence/2026-08-08-parent-evidence-admission/RESULT.md)
pinned the old parent input and changed only its fourth instruction after
normalizing non-semantic runtime identifiers. It explicitly described how the
schema-valid retained child report could serve as bounded evidence without
becoming semantic verification or acceptance. The treatment parent recovered
case 07 and passed independent semantic review. This supports evidence
admission as a real handoff design variable, but one repetition cannot separate
the instruction effect from provider variance or establish durable guidance.

The reconstructed treatment still used 1.84× the direct tokens, 1.58× the
serial duration, and 1.45× the estimated API cost. When dense relations are
cheap to inspect directly, delegation may therefore add reconstruction cost
without reducing attention enough to compensate even when semantics recover.

The subsequent
[matched parent pair](../../regeneration/evaluations/evidence/2026-08-08-parent-admission-matched-pair/RESULT.md)
ran fresh control and treatment parents over the same frozen child output and
seven-file raw partition. Order was randomized and retained; route, backend
fingerprint, schema, budget, read-only workspace, and normalized contract were
matched. A label-masked independent reviewer preferred treatment with high
confidence. Both parents found the adapter defect, but control kept case 07
conditional and omitted that retry remains `"none"`; treatment recovered the
complete relation while retaining parent judgment.

This is paired support for evidence status as a decision-changing handoff
relation, not proof of a universal prompt string. The fresh control performed
better than the old control, so provider-run variance remains visible. The
portable consequence is to state source scope and lineage, which exact claims
may serve as premises, what remains uncertain, and who retains judgment—not to
make child conclusions authoritative. The reconstructed treatment used 2.41×
the direct tokens, 1.92× the serial duration, and 1.76× the cost; use direct
inspection when a small source set is densely coupled. More replication is
needed only to estimate stability or test generalization, not to justify more
handoff machinery now.

## Open verification

- Can the selected Flash model reliably emit several valid `delegate` calls in
  one step without omitting frozen obligations?
- Does a small typed contribution schema outperform one free-form message after
  accounting for validation repair and token cost?
- Can compact settlements support reconstruction without replaying child
  histories?
- Which real task first requires a data-dependent Workflow rather than a later
  ordinary Agent step?
- When does one nested bounded contribution reduce attention or latency enough
  to justify its coordination and token cost without broadening effects?

These are pilot questions, not reasons to add team messaging or model-authored
workflow code now. They also do not justify a blanket ban on nested delegation
in a carrier that can already preserve lineage, effects, evidence, and recovery.
