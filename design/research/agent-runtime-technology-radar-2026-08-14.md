# Agent Runtime Technology Radar — 2026-08-14

**Status:** source-bound research; non-authoritative and rebuildable

**Observed:** 2026-08-14

**Question:** Which recent external developments should change Rossovia's
near-term model, execution-harness, or collaboration experiments?

**Decision boundary:** this record classifies candidates and names probes. It
does not adopt a provider, spend subscription quota, replace Rossovia state,
change model-routing policy, or accept a Task or Mission result.

## Current disposition

| Development | Layer it belongs to | Current disposition | Why |
|---|---|---|---|
| DeepSeek Harness | Agent execution mechanism | **Watch and run a bounded carrier substitution probe** | It is a serious, plugin-composed execution harness with useful session and tool evidence, but it is a developer preview and does not own Rossovia's Task, Mission, authority, or acceptance semantics. |
| GLM-5.3 through OpenCode Go | Model/provider policy | **Available for a bounded paid trial; not yet a production worker** | Official OpenCode Go documentation now lists the exact model identity, but no Rossovia tool-loop run has verified serving identity, evidence quality, cost, or behavior. |
| Delta | Conversation/worktree collaboration substrate | **Observe; do not integrate yet** | It directly addresses conversation-to-code lineage and live multi-user review, but is a private-beta product with no current agent permission framework or sandbox and with material hosted-data semantics. |

The three developments are adjacent but not interchangeable. DeepSeek Harness
is a candidate execution carrier, GLM-5.3 is a candidate model route, and Delta
is a candidate collaboration substrate. Rossovia's canonical Task/Mission
state, effect authority, Principal decisions, and acceptance evidence remain
separate from all three.

## 1. DeepSeek Harness

### Officially established

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness/tree/47f943859bef60e4160492346772ded9b24f765a)
is an MIT-licensed open-source Agent harness built around the claim that
“everything is a plugin.” Its own README calls the project a developer preview
and warns that compatibility-breaking changes will occur. This review pins
upstream commit `47f943859bef60e4160492346772ded9b24f765a`; mutable `master`
must not be treated as the same candidate.

The [architecture](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/architecture.md)
uses the Cordis runtime to compose model routing, Agent loops, sessions, tools,
permissions, sandboxing, subagents, persistence, Web/headless/Python entries,
and optional telemetry as plugins. Its
[session subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/session.md)
is append-only and event-sourced: model context, replay, resume/fork,
transcripts, and downstream persistence are derived from retained session
events. This makes “model-visible means logged” a useful evidence property,
although it does not make the log a Rossovia Task or acceptance source.

The [tool execution pipeline](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/tool-execution-pipeline.md)
records the call before execution, runs hooks and permission/sandbox checks,
and then retains the result. The project also supplies subagent providers,
context compaction, a tool catalog, and provider-neutral plus DeepSeek-specific
model adapters. The current
[base composition](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/bundle/base/cordis.patch.yml)
includes DeepSeek V4 Flash/Pro policy alongside generic provider routing.

Two boundaries matter before any experiment:

- the [documented sandbox](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/sandbox.md)
  is primarily a filesystem boundary; it is not a complete process/network
  authority model; and
- telemetry is optional, but the
  [OpenTelemetry plugin](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/packages/session/session-telemetry-otel/README.md)
  can export captured session material when enabled. A probe should keep it
  disabled or local-only unless its exact payload and destination are approved.

### Rossovia interpretation

DeepSeek Harness overlaps with the lower execution-carrier responsibilities of
[Work Cell](../../packages/work-cell/README.md) and the conversation execution
runtime. It does **not** replace Workbench project identity, Tasks, Missions,
effect receipts, independent review, or Principal acceptance. Its local
goal/plan/todo/workflow plugins are runtime state, not an alternate canonical
control plane.

The interesting question is therefore not “should Rossovia move to DSH?” but
“can DSH implement one Work Cell driver boundary with equal or better evidence
and lower integration cost?” A useful substitution probe would:

1. run the same bounded task through the current carrier and DSH headless mode
   with matched model, tools, permissions, and budget;
2. map DSH session events to one Work Cell final record without copying DSH
   state into Task/Mission authority;
3. test reopen, fork, compaction, cancellation, and crash recovery; and
4. compare filesystem, process, network, telemetry, and approval behavior.

Adoption is disproved if the adapter must let DSH own Task lifecycle or if a
successful-looking session cannot be reconstructed into Rossovia's existing
effect and acceptance evidence.

## 2. GLM-5.3 and OpenCode Go

### Direct answer

**Yes: as of 2026-08-14, OpenCode Go officially lists GLM-5.3.** The exact
native OpenCode selection is:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "opencode-go/glm-5.3"
}
```

OpenCode's current [Go documentation](https://opencode.ai/docs/go/) lists model
ID `glm-5.3`, an OpenAI-compatible base URL
`https://opencode.ai/zen/go/v1`, and Chat Completions at
`/chat/completions`. Its official integration entered OpenCode in
[`e23586a`](https://github.com/anomalyco/opencode/commit/e23586af2623f1bc2e8e6965d2d7acf7bd03d5c3).
Public model discovery establishes registry availability, not a successful
paid completion for this account.

[Z.ai's GLM-5.3 guide](https://docs.z.ai/guides/llm/glm-5.3) describes a
text-input/text-output reasoning model with a 1M context window, 128K model
output limit, function calling, structured output, MCP, streaming, and cache.
It is available to GLM Coding Plan users, including through OpenCode. The same
guide says the ordinary pay-as-you-go Model API is still “coming soon”; current
standard pricing and API-enum pages lag the launch. Vendor benchmark gains are
vendor evidence, not Rossovia capability evidence.

OpenCode Go and Z.ai Coding Plan are distinct subscription/provider routes.
For OpenCode Go the provider/model identity is `opencode-go/glm-5.3`; Z.ai's
separate model-switching aliases must not be used to infer which model actually
served a run. OpenCode currently advertises zero-day retention and no training
for this route in its privacy table; that is a provider claim, not an
independent audit.

One implementation caveat is easy to miss: the model registry advertises a
128K maximum output, while OpenCode's pinned
[provider transform](https://github.com/anomalyco/opencode/blob/4643e65ad6334de3e4e68dedc201d5fbb828c9fe/packages/opencode/src/provider/transform.ts#L18)
defaults model output to a 32K client cap. Raising the experimental override is
a separate policy experiment and is unnecessary for an initial compatibility
probe.

### Rossovia interpretation

Rossovia's current OpenCode CLI mechanism can already express a
provider/model pair and retain the observed identity. The smallest likely
integration is therefore a new **text-only trial worker card**, not a new
runtime adapter and not a replacement for the current vision-capable Kimi
worker. That inference remains unverified until a real run succeeds.

The first paid probe should use a disposable clean Worktree and one native tool
read at low reasoning effort. Admit the model only if the retained Work Cell
record shows:

- adapter `opencode-cli.v1`;
- provider/model exactly `opencode-go` / `opencode-go/glm-5.3`;
- a real session and completed tool call/result;
- the correct nonce, usage evidence, and an empty workspace diff.

Do not use the first probe to test 1M context, force 128K output, change the
current DeepSeek policy, or infer production quality from Z.ai benchmarks.

## 3. Delta

### What problem it addresses

Delta starts from the observation that Agent-generated code can outpace a
team's ability to reconstruct intent from commits and pull-request snapshots.
Important reasoning happens between commits; comments tied to line numbers
drift as the code changes; and an Agent transcript is often presented as a
stream rather than a shared, reviewable work artifact. Zed's
[DeltaDB announcement](https://zed.dev/blog/introducing-deltadb) summarizes the
premise as “software is made between commits.” The newer
[Delta product announcement](https://zed.dev/blog/introducing-delta) presents
Delta as a multiplayer environment where people and Agents work in shared
threads while conversation and code changes stay in context.

### How it addresses it

[DeltaDB](https://delta.dev/docs/concepts/delta-and-git) continuously records
messages, comments, worktree changes, and file edits as fine-grained deltas.
Each operation has a stable identity; each participant's machine holds a copy;
and the copies synchronize. A checkout remains a real directory for terminals
and ordinary tools. Git still owns commits and external integration, while
Delta retains the between-commit collaboration record.

Delta gives participants separate
[worktrees and machine placements](https://delta.dev/docs/concepts/worktrees-and-machines),
can run an Agent on a chosen local, teammate, or cloud machine, and synchronizes
the changes back into the thread. Comments attach to a conversation or code and
remain related as the code evolves. Its initial third-party Agent sync includes
Claude Code, and its review flow can move a managed checkout back through Git.

### Material limitations

Delta is still a private-beta product. More importantly, its own
[agentic safety documentation](https://delta.dev/docs/privacy-and-security/agentic-safety)
says there is currently no Agent permission framework and no Agent sandbox;
the Agent has unrestricted access to the device. Worktree trust is also not an
implemented safety boundary. That makes it unsuitable as Rossovia's execution
authority today.

The [data-storage documentation](https://delta.dev/docs/privacy-and-security/data-storage)
says file contents and Git objects are stored in Cloudflare R2, thread and
worktree deltas in Durable Objects backed by SQLite, and metadata in KV/D1,
alongside local copies. Deleting a thread does not retract already shared or
local copies, and the documented server-deletion semantics require careful
review before confidential repository use.

### Rossovia interpretation

Delta strongly validates the product direction of conversation as the daily
work entry and of stable causal links between discussion, code, and review. It
does not supply Rossovia's Task/Mission authority, effect admission, worker
permissions, or semantic acceptance. Adding DeltaDB now would create a second
state canon before a public interoperability boundary and acceptable safety
model exist.

The useful next action is observation, not integration. Reopen the question
when Delta publishes a stable API/export contract and materially stronger
permission/sandbox guarantees. Then test whether one Rossovia conversation
journal, Task attempt, and Git diff can project into a Delta thread while
Rossovia retains lifecycle and acceptance ownership.

## Cross-cutting consequence

The developments reinforce the repository's existing mechanism/adapter/policy
separation:

| Rossovia concern | Candidate evidence | Boundary to preserve |
|---|---|---|
| Work Cell or conversation execution mechanism | DeepSeek Harness | DSH may carry execution and session events; it does not own Task/Mission state or acceptance. |
| Provider/model policy | GLM-5.3 through OpenCode Go | A worker card may select it only after exact-identity evidence; the adapter stays provider-neutral. |
| Human/Agent collaboration projection | Delta | A thread may project conversation and code lineage; it must not become a second canonical control plane. |

Near-term order:

1. run one small GLM-5.3/OpenCode Go tool-loop probe after explicit quota
   authorization;
2. design one DSH-versus-current-carrier substitution probe with telemetry off;
3. monitor Delta's API, safety, data-deletion, and general-availability changes;
4. keep production policy unchanged until the corresponding probe has retained
   project-relative evidence and independent review.

## Invalidation signals

Refresh this record when any of the following changes:

- DeepSeek Harness leaves developer preview, publishes a stable plugin/session
  compatibility contract, or materially changes sandbox/telemetry behavior;
- OpenCode Go removes or renames `glm-5.3`, Z.ai opens the ordinary API, a
  Rossovia live probe produces exact serving evidence, or OpenCode changes its
  effective output cap;
- Delta publishes a stable interoperability API, reaches general availability,
  adds meaningful permissions/sandboxing, or changes hosted-data deletion; or
- Rossovia changes the ownership of Task/Mission state, Work Cell evidence, or
  conversation journals in a way that alters the layer comparison.
