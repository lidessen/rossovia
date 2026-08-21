# Agent Runtime Technology Radar — 2026-08-14

**Status:** source-bound research; non-authoritative and rebuildable

**Observed:** 2026-08-14

**Question:** Which recent external developments should change Rossovia's
near-term model, execution-harness, or collaboration experiments?

**Decision boundary:** this record classifies candidates and names probes. It
does not adopt a provider, spend subscription quota, replace Rossovia state,
change model-routing policy, or accept a Task or Mission result.

Each development section below answers four questions explicitly: which
designs are worth absorbing, which Rossovia layer owns them, which minimal
falsifiable experiment settles the question, and what must not be adopted
today. The closing adoption backlog separates what is officially established
(`fact`), what Rossovia infers from its own boundaries (`inference`), what is
still unverified (`unknown`), and who may turn a row into a decision
(`authority`).

## Current disposition

| Development | Layer it belongs to | Current disposition | Why |
|---|---|---|---|
| DeepSeek Harness | Agent execution mechanism | **Watch and run a bounded carrier substitution probe** | It is a serious, plugin-composed execution harness with useful session and tool evidence, but it is a developer preview and does not own Rossovia's Task, Mission, authority, or acceptance semantics. |
| OpenAI Codex CLI / open-source harness | External execution carrier reference | **Reference and design one bounded substitution probe; do not adopt a route** | The official repository exposes separable CLI, Rust engine, SDK, project configuration, and documentation surfaces. They are useful carrier evidence, but they do not own Rossovia's Task, Mission, Run, authority, or method-expression layer. |
| GLM-5.3 through OpenCode Go | Model/provider policy | **Available for a bounded paid trial; not yet a production worker** | Official OpenCode Go documentation now lists the exact model identity, but no Rossovia tool-loop run has verified serving identity, evidence quality, cost, or behavior. |
| Delta | Conversation/worktree collaboration substrate | **Observe; do not integrate yet** | It directly addresses conversation-to-code lineage and live multi-user review, but is a private-beta product with no current agent permission framework or sandbox and with material hosted-data semantics. |

The three developments are adjacent but not interchangeable. DeepSeek Harness
is a candidate execution carrier, GLM-5.3 is a candidate model route, and Delta
is a candidate collaboration substrate. Rossovia's canonical Task/Mission
state, effect authority, Principal decisions, and acceptance evidence remain
separate from all three.

## Reference combination matrix

These references form a comparison set, not a stack to install. Each one is
assigned a useful question and a Rossovia owner; none is allowed to become a
second runtime, queue, fact source, or method-expression authority.

| Reference | Harness-base mechanism that may be assembled | Carrier experience to compare | Method-expression boundary | Smallest useful probe | Rossovia owner |
|---|---|---|---|---|---|
| [Vercel AI SDK](https://github.com/vercel/ai) + [eve](https://github.com/vercel/eve) | Embeddable harness, host-tool boundary, checkpointed workflow steps | Streaming, pause/resume, approvals, and durable step evidence | SDK normalizes execution; Skills/system prompts remain Rossovia's receiver-facing method | Existing carrier substitution and one restartable bounded Run | Work Cell adapter + Mission/Run continuity |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness/tree/47f943859bef60e4160492346772ded9b24f765a) | Plugin composition, session events, pre-effect tool records | Replay/fork/compaction and provider/subagent substitution | Plugins do not become Rossovia Task/Mission policy | §1 event/effect-evidence substitution probe | Work Cell driver and evidence boundary |
| [Pi](https://github.com/badlogic/pi-mono) | In-process coding session, host tools, steering and compaction | Session continuation, follow-up, abort, and resource loading | Resource/skill loading is a carrier surface, not Rossovia post-training authority | Current carrier with Pi session mechanics and host-scoped tools | Work Cell adapter |
| [Reasonix](https://github.com/futureflowtech/reasonix) | Deterministic compaction, cache diagnostics, permission/sandbox separation, atomic edits | Long-context cost/recovery and safe mutation behavior | Tool schemas and permissions remain local policy/mechanism boundaries | Compare one tool loop's cache, compaction, and atomic-edit evidence | Work Cell/tool adapter |
| [Hermes](https://github.com/NousResearch/hermes-agent) | Restart/drain markers and background execution as carrier observations | Resume-pending, notifications, and explicit stuck-run handling | Background mode does not create a Rossovia queue or automatic retry lifecycle | Restart a bounded Run and verify truthful unresolved standing | Run recovery + observer |
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code/cli-usage) | Headless/resumed CLI execution and bounded turn control | Continue/resume and max-turn execution ergonomics | CLI flags do not redefine Rossovia Task acceptance or method expression | Map one resumed session to a new lineage-bound Run | Agent-tooling adapter |
| [OpenAI Codex CLI / open-source harness](https://github.com/openai/codex/tree/ad9e8097fd3d0d2f1c1166575d2c6cd8cb9e1833) | Separated CLI, engine, SDK, project-config, and docs surfaces | Local execution carrier and machine-facing session/tool evidence | Codex model/provider and `.codex`/instructions remain external; Rossovia owns method expression | §4 read-only carrier substitution probe | Agent-tooling / Work Cell adapter |

The matrix keeps three questions separate: what can be assembled behind a
stable mechanism boundary, what is merely useful carrier experience, and what
must remain Rossovia's own post-training/method expression. A reference can
inform more than one question, but a single probe must still name one primary
owner and one acceptance relation.

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

### Absorbable designs, mapped to a Rossovia owner

| Absorbable design | Official basis | Rossovia owner | Minimal comparison experiment |
|---|---|---|---|
| Event-sourced, model-visible session logging | [session subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/session.md): append-only events derive context, replay, fork, transcript | [conversation journal](../../apps/workbench/src/conversation/contracts.ts) + Work Cell trace (`packages/work-cell`) | Reconstruct one Work Cell run's model-visible sequence from retained events alone, then diff against DSH's event set for the same task; a gap means the log misses what the model saw. |
| Plugin substitution without core change | [architecture](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/architecture.md): Cordis-composed model, tools, sandbox, persistence, telemetry | Work Cell driver boundary (AI SDK 7, `opencode-cli.v1` adapters) + provider profile ([decision 032](../../design/decisions/032-ai-sdk-7-work-cell-driver.md), [decision 034](../../design/decisions/034-validation-model-routing.md)) | Swap one Work Cell driver or provider target in place and show the Cell contract, terminal verification, and run record schema stay unchanged. |
| Pre-effect durable tool record | [tool execution pipeline](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/tool-execution-pipeline.md): call recorded before execution, result retained after | conversation journal `action.requested` (fsynced before any effect, per [`contracts.ts`](../../apps/workbench/src/conversation/contracts.ts)) | Compare crash-recovery behavior: can the durable pre-effect record reconstruct the intended effect after a kill at the same point, without replaying a committed mutation? |
| Provider and subagent neutrality | [architecture](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/architecture.md): subagent providers, provider-neutral + DeepSeek-specific adapters | provider-profile / model-route + worker catalog (`packages/work-cell`) | Replace the harness's model adapter identity and one subagent provider with neutral stand-ins and show the loop mechanism and evidence shape do not change. |
| Explicit session transformation | [session subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/session.md): replay, resume/fork, context compaction | conversation coordinator context management (`apps/autonomy`) | Fork or compact a session and verify the transform is a retained, replayable event — not an in-place mutation that loses the pre-transform evidence. |

Three of the five are already Rossovia practice (event-sourced journal, durable
pre-effect action record, provider-neutral driver boundary), so the real
question is whether DSH adds evidence fidelity or integration cost on top, not
whether Rossovia should move to DSH.

### What not to adopt now

DeepSeek Harness overlaps with the lower execution-carrier responsibilities of
[Work Cell](../../packages/work-cell/README.md) and the conversation execution
runtime. It does **not** replace Workbench project identity, Tasks, Missions,
effect receipts, independent review, or Principal acceptance. Its local
goal/plan/todo/workflow plugins are runtime state, not an alternate canonical
control plane. Its developer-preview status, unpinned plugin compatibility, and
filesystem-only sandbox mean the whole harness is not a production carrier
candidate today.

### Minimal falsifiable experiment: the substitution probe

The question is “can DSH implement one Work Cell driver boundary with equal or
better evidence and lower integration cost?” A useful probe would:

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

### Officially established

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

### Task fit: applicable, deferred, and not applicable

| Task class | Fit | Why |
|---|---|---|
| Text-only bounded tool-loop work in a disposable worktree | **Applicable once live-verified** | Text-in/text-out matches Rossovia's existing text worker shape; no vision dependency. |
| Provider-default text-only read plus one native tool call | **Applicable first probe** | Cheapest falsifiable admission test; exercises the same `opencode-cli` carrier Rossovia already runs for DeepSeek. |
| Low/high/max reasoning-effort variants | **Unknown; deferred** | Official evidence establishes the route and model, not built-in variants; discover the actual variant set from the live catalog or a retained request before any policy selects one. |
| Vision-capable work (screenshots, UI review) | **Not applicable now** | Current vision-capable Kimi worker already owns this; no GLM-5.3 vision evidence exists. |
| 1M-context or forced 128K-output workloads | **Deferred** | OpenCode's pinned client cap is 32K; context claims are vendor claims until a retained run observes them. |
| Structured-output validation routes | **Deferred** | GLM-5.3's structured output is documented upstream, but no Rossovia route has proven it; the existing OpenCode Go route already needs a `json_object` lowering ([decision 034](../../design/decisions/034-validation-model-routing.md)). |
| Production worker replacement | **Not applicable now** | No live Rossovia tool-loop evidence exists yet. |

### Complementary relation with DeepSeek and Kimi

GLM-5.3 does not displace the current workers. DeepSeek remains the text
default and pay-as-you-go fallback; Kimi remains the vision-capable Coding Plan
route; GLM-5.3 would be a third, text-only trial route on a separate
subscription. A new **text-only trial worker card** is the smallest likely
integration — not a new runtime adapter and not a replacement for the current
vision-capable Kimi worker. That inference remains unverified until a real run
succeeds.

### One low-risk real tool-loop trial

The first paid probe should use a disposable clean Worktree and one native tool
read at provider default: omit reasoning-effort and variant flags entirely, so
the probe exercises the route as served rather than a variant this route may
not provide. Admit the model only if the retained Work Cell record shows:

- adapter `opencode-cli.v1`;
- provider/model exactly `opencode-go` / `opencode-go/glm-5.3`;
- a real session and completed tool call/result;
- the correct nonce, usage evidence, and an empty workspace diff.

Reasoning-effort variant availability is an open unknown: official evidence
establishes the route and model identity, but variants are model-specific and
the pinned OpenCode [provider transform](https://github.com/anomalyco/opencode/blob/4643e65ad6334de3e4e68dedc201d5fbb828c9fe/packages/opencode/src/provider/transform.ts#L18)
does not prove a built-in low variant for this exact route. Before any policy
sets low/high/max, discover the actual variant set from the live catalog or
the retained probe request; never assume a variant exists because another
model's route has one.

Do not use the first probe to test 1M context, force 128K output, select a
reasoning-effort variant, change the current DeepSeek policy, or infer
production quality from Z.ai benchmarks.

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

### Absorbable collaboration designs

| Absorbable design | Official basis | Rossovia owner today | Absorb as |
|---|---|---|---|
| Between-commit stable identity | [delta-and-git](https://delta.dev/docs/concepts/delta-and-git): each operation has a stable identity; copies synchronize | conversation journal event IDs + Task/Mission source revisions | Design validation: Rossovia already gives conversation events, actions, and Task revisions stable identity. |
| Conversation–code lineage | [Delta announcement](https://zed.dev/blog/introducing-delta): shared threads keep conversation and code changes in context | conversation journal + Git effect observer (`apps/autonomy`) | Design validation of Rossovia's conversation-as-entry direction, not a copied mechanism. |
| Real-worktree compatibility | [delta-and-git](https://delta.dev/docs/concepts/delta-and-git): checkout remains a real directory for terminals and tools | disposable bound Worktrees (`task run`, Work Cell `workspace.root`) | Rossovia's disposable-worktree discipline already preserves this; no Delta dependency needed. |
| Git integration boundary | [delta-and-git](https://delta.dev/docs/concepts/delta-and-git): Git owns commits and external integration | Git-tracked Mission/Task records and commits | Keep Git canonical; treat any future Delta surface as a projection only. |

These four confirm Rossovia's existing product direction; none of them
requires adopting DeltaDB to be true.

### Rejection boundary: do not integrate DeltaDB now

Delta is still a private-beta product. Its own
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

Adding DeltaDB now would create a second state canon before a public
interoperability boundary and acceptable safety model exist. **Decision: do
not integrate DeltaDB; keep observing.**

### Observation signals for reopening

Reopen the question when Delta publishes:

- a stable API/export contract or general availability; and
- a materially stronger permission/sandbox guarantee than the current
  [agentic safety](https://delta.dev/docs/privacy-and-security/agentic-safety) position.

Then test whether one Rossovia conversation journal, Task attempt, and Git
diff can project into a Delta thread while Rossovia retains lifecycle and
acceptance ownership.

## 4. OpenAI Codex CLI and the open-source harness

### Officially established

The official [openai/codex repository](https://github.com/openai/codex/tree/ad9e8097fd3d0d2f1c1166575d2c6cd8cb9e1833)
is public and Apache-2.0 licensed at the pinned observation revision
`ad9e8097fd3d0d2f1c1166575d2c6cd8cb9e1833`. Its [README](https://github.com/openai/codex/blob/ad9e8097fd3d0d2f1c1166575d2c6cd8cb9e1833/README.md)
describes Codex CLI as a coding agent from OpenAI that runs locally. The
repository exposes distinct `codex-rs`, `codex-cli`, `sdk`, `.codex`, and
`docs` surfaces ([tree](https://github.com/openai/codex/tree/ad9e8097fd3d0d2f1c1166575d2c6cd8cb9e1833)).

Rossovia treats this repository as an **external harness/CLI/SDK reference**;
“Codex” here does not mean an OpenAI model, provider route, subscription, or
Rossovia runtime. The upstream directory layout is evidence for a comparison,
not a stable Rossovia contract. Installed flags, auth, session behavior, and
SDK APIs must be checked from the active version and official documentation
before any probe.

### What can be assembled, what is comparative only

The useful distinction is not “copy Codex” versus “ignore Codex,” but which
surface can be connected behind an existing boundary:

| Candidate contribution | Classification | Rossovia boundary |
|---|---|---|
| Separate engine, CLI, and SDK surfaces | **Directly assemblable carrier mechanism** | A future adapter may map one Codex execution surface to the existing Work Cell loop while Task/Mission/Run/Cell identity and settlement remain local. |
| Project configuration, skills, and context delivery surfaces | **Comparative carrier evidence** | Compare how context reaches a receiver and what is on-demand versus always present; Rossovia's Skills, system prompt, and source-selection policy remain the method-expression owner. |
| Session, turn, tool, and execution evidence exposed by a selected Codex surface | **Directly assemblable only after a probe** | Accept only evidence that can be retained as the existing Run/Cell transcript and terminal record without a second session authority. |
| Rust/Bazel implementation, Codex-specific UI, authentication/subscription behavior, model-facing defaults, and upstream repository instructions | **Comparative only** | Do not import them as Rossovia mechanism, provider policy, project configuration, or post-training. |

Codex can therefore inform the **harness base/carrier** and its context/tool
delivery adapters. It cannot replace Rossovia's psychology-based
method-expression layer (Skills, system prompts, practice choices, and
receiver-specific context), and it cannot own Task/Mission/Run, acceptance,
Principal authority, or observer records. No new lifecycle, queue, open-ended
`kind` field, or parallel source of truth follows from this comparison.

### Minimal falsifiable substitution probe

The smallest useful experiment is one read-only, bounded Task in a disposable
worktree:

1. run the same Task through the current carrier and an installed Codex CLI
   non-interactive surface, with matched input, workspace, permissions, and
   budget;
2. let the Codex adapter own only the model/tool loop and session mechanics;
3. retain the normal Rossovia Task, Run/Cell, source revision, terminal status,
   and empty-diff evidence; and
4. compare whether the model-visible context, tool results, cancellation, and
   incomplete-run evidence are reconstructible without a new queue or
   lifecycle.

The substitution is disproved if the adapter must make Codex the Task/Mission
authority, if a completed-looking session cannot produce the existing terminal
evidence, or if it requires copying Codex model/provider policy into Rossovia.
No production provider or worker policy changes on the basis of this probe.

### What not to adopt now

Do not make Codex's model identity, login/account path, `.codex` directory,
Rust/Bazel build, CLI configuration, upstream Skills, or SDK lifecycle a
Rossovia default. Do not use Codex's session or project files as a second
Mission/Task/Run store. The method-expression/post-training layer remains a
Rossovia responsibility; an external carrier may deliver it, but does not
define it.

## Adoption backlog

Sorted by priority; nothing here is an adoption decision. `fact` is
source-linked official evidence, `inference` is Rossovia's reading, `unknown`
is unresolved, and `authority` names who may move the row.

| # | Candidate | Layer | Action | Evidence class | Authority |
|---|---|---|---|---|---|
| 1 | GLM-5.3 / OpenCode Go | Model/provider policy | Run the one low-risk tool-loop probe in §2 (provider default, no reasoning-effort flag) after explicit quota authorization | `fact`: OpenCode Go lists `glm-5.3` ([docs](https://opencode.ai/docs/go/)); `unknown`: real serving identity, cost, behavior, low/high/max variant availability | Principal (quota spend); agent may prepare, not run, the probe |
| 2 | DeepSeek Harness | Execution mechanism | Design and run the §1 substitution probe with telemetry off | `fact`: plugin architecture, event-sourced session, pre-effect tool record ([architecture](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/architecture.md), [session](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/docs/subsystems/session.md)); `inference`: three of five mechanisms are already Rossovia practice; `unknown`: whether DSH adds fidelity at lower cost | Principal (bounded experiment approval); Work Cell owner (carrier change) |
| 3 | OpenAI Codex CLI / open-source harness | External execution carrier | Design and run the §4 substitution probe; keep it outside provider policy | `fact`: public CLI repository and separable CLI/engine/SDK/config/documentation surfaces ([repository](https://github.com/openai/codex/tree/ad9e8097fd3d0d2f1c1166575d2c6cd8cb9e1833)); `unknown`: adapter evidence fidelity, continuation, permissions, cost, and integration burden | Principal (bounded experiment approval); Work Cell owner (carrier change) |
| 4 | Delta / DeltaDB | Collaboration projection | Observe only; re-evaluate on the §3 signals | `fact`: private beta, no agent permission framework or sandbox ([agentic safety](https://delta.dev/docs/privacy-and-security/agentic-safety)), hosted storage ([data-storage](https://delta.dev/docs/privacy-and-security/data-storage)); `unknown`: stable API, deletion semantics | Principal (any hosted-data use or integration) |
| 5 | Production policy change | All layers | Keep unchanged | `fact`: no retained project-relative probe evidence exists yet | Independent review + Principal acceptance |

Until a row's probe has retained project-relative evidence and independent
review, production model, carrier, and collaboration policy stay as they are.

## Cross-cutting consequence

The developments reinforce the repository's existing mechanism/adapter/policy
separation:

| Rossovia concern | Candidate evidence | Boundary to preserve |
|---|---|---|
| Work Cell or conversation execution mechanism | DeepSeek Harness | DSH may carry execution and session events; it does not own Task/Mission state or acceptance. |
| External coding harness carrier | OpenAI Codex CLI | Codex may carry a model/tool loop and expose CLI/SDK/session surfaces; it does not own Task/Mission/Run/Cell, method expression, provider policy, or acceptance. |
| Provider/model policy | GLM-5.3 through OpenCode Go | A worker card may select it only after exact-identity evidence; the adapter stays provider-neutral. |
| Human/Agent collaboration projection | Delta | A thread may project conversation and code lineage; it must not become a second canonical control plane. |

Near-term order:

1. run one small GLM-5.3/OpenCode Go tool-loop probe after explicit quota
   authorization;
2. design one DSH-versus-current-carrier substitution probe with telemetry off;
3. design one Codex-versus-current-carrier substitution probe with no provider
   policy change;
4. monitor Delta's API, safety, data-deletion, and general-availability changes;
5. keep production policy unchanged until the corresponding probe has retained
   project-relative evidence and independent review.

## Invalidation signals

Refresh this record when any of the following changes:

- DeepSeek Harness leaves developer preview, publishes a stable plugin/session
  compatibility contract, or materially changes sandbox/telemetry behavior;
- OpenAI Codex changes the pinned CLI/engine/SDK surface, publishes a stable
  machine-facing session or app-server contract, or a substitution probe shows
  that its evidence/permission boundary cannot map to one Rossovia Run/Cell;
- OpenCode Go removes or renames `glm-5.3`, Z.ai opens the ordinary API, a
  Rossovia live probe produces exact serving evidence, or OpenCode changes its
  effective output cap;
- Delta publishes a stable interoperability API, reaches general availability,
  adds meaningful permissions/sandboxing, or changes hosted-data deletion; or
- Rossovia changes the ownership of Task/Mission state, Work Cell evidence, or
  conversation journals in a way that alters the layer comparison.
