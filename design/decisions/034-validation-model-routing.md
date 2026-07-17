# 034 — Validation Model Routing

**Status:** Superseded in preference ownership by decision 036; provider route mechanism retained
**Date:** 2026-07-16
**Approved by:** principal

## Concrete pressure

Work Cell validation runs currently bind every model call directly to the
official DeepSeek API. The principal has a prepaid OpenCode Go allowance and
wants validation to consume its DeepSeek V4 Flash capacity first, then continue
through the official DeepSeek API when that service is unavailable or its
allowance is exhausted.

The principal later added a Kimi Coding Plan subscription. Skills are easy to
update through package provenance; model subscriptions are different execution
capacity and must enter the provider route without turning a coding harness into
the Work Cell runtime.

[OpenCode Go documents](https://opencode.ai/docs/go/) a DeepSeek V4 Flash model
through an OpenAI-compatible endpoint. Its allowance is governed by separate
five-hour, weekly, and monthly dollar-value limits, so the runtime must not
pretend that one locally knowable counter determines availability.

[Kimi Code documents a third-party API](https://www.kimi.com/code/docs/en/)
with stable Coding Plan model IDs and both OpenAI- and Anthropic-compatible
endpoints. It requires clients to preserve their real identity, and its
membership quota is not a token-priced API tariff. The
[official AI SDK Moonshot provider](https://ai-sdk.dev/providers/ai-sdk-providers/moonshotai)
already preserves reasoning history needed by Kimi thinking models, so the
project does not reimplement that protocol.

## Decision

Route each non-streaming validation model call independently through the
human-confirmed targets in the selected provider profile:

1. When the route includes OpenCode Go, resolve its referenced credential and
   call its configured `deepseek-v4-flash` model.
2. When the route next includes Kimi, route an unavailable OpenCode call to
   Kimi Coding Plan's `kimi-for-coding` model. OpenCode and Kimi have independent
   model IDs; the route may not reuse one global ID across providers.
3. When Kimi reports membership, plan access, quota, authentication, timeout,
   rate-limit, server, or transport unavailability, route that model call to
   the official DeepSeek API only when it is a later selected target.
4. A route with one selected target uses that provider directly. Credential
   presence alone never selects or orders a target.
5. Do not fall back after caller cancellation, malformed requests, unsupported
   model names, or for a valid provider response
   that later fails a Work Cell tool, output, terminal, or verification
   contract. Those are not provider-availability failures.

Failover lives at the model-call boundary inside the existing AI SDK agent
loop. It does not restart a Cell or replay its prior tools. Each successful
call records the serving provider and provider-specific model in metadata; a
fallback record also retains a bounded classification of earlier failures.

The implementation has three owners:

- `model-route.ts` owns provider-neutral ordered execution, cancellation,
  target-owned fallback decisions, aggregate failure, and route evidence;
- `providers/` owns concrete model construction, request translation, provider
  error meaning, and provider pricing;
- `provider-profile.ts` owns the human-confirmed provider order and named
  credential references;
- `validation-model.ts` resolves that explicit profile into provider-specific
  model targets and fails closed when the profile or a referenced secret is
  absent.

Changing today's provider choice must not change the generic route mechanism.
Changing an endpoint or provider-specific response form must not change the
validation policy. [Decision 036](036-provider-observation-and-explicit-preference.md)
defines discovery, preference, and observation as separate forms. OpenCode Go
and Kimi Coding Plan are fixed-price subscriptions. Their published token
tariffs determine allowance consumption, not the marginal money spent by one
Cell. Any route containing either subscription therefore omits a dollar
estimate. A mixed route can also serve different calls from different
providers, and aggregate usage cannot assign them truthfully. Per-call
route-aware cost audit is a later capability, not permission to report
allowance-equivalent tariffs as actual spend or call subscription usage free.

Kimi's [experimental `/coding/v1/usages` endpoint](https://forum.moonshot.ai/t/error-code-429-were-receiving-too-many-requests-at-the-moment/191/7)
is admitted only as a provider adapter behind the generic read-only observer.
It may report the weekly and rolling
windows for a human or status integration, but it does not pre-empt a call,
trigger fallback, or become an execution dependency. Its normalized output is
explicitly marked experimental and fails visibly when the response shape
changes. The runtime does not infer a monthly window when the endpoint does not
name and reset one.

OpenCode Go's [published usage limits](https://opencode.ai/docs/go/#usage-limits)
have no documented quota API. Dashboard HTML scraping needs a workspace ID and
browser auth cookie, so it is not admitted into this provider observer: it
widens credential authority and couples execution tooling to a mutable page.
Per-call token usage remains evidence, but cannot truthfully represent account
allowance shared with other clients.

OpenCode Go accepts tool calls and JSON-object responses but its upstream does
not accept OpenAI's native `json_schema` response form. The provider adapter
therefore lowers `json_schema` to `json_object`, injects the same schema as a
call-local system constraint, and leaves final parsing and validation with AI
SDK and the caller's Zod schema. This is a representation translation, not a
weaker completion contract.

OpenCode Go is integrated as a provider using the
[AI SDK OpenAI-compatible provider](https://ai-sdk.dev/providers/openai-compatible-providers),
not as an OpenCode coding harness. [AI SDK Harnesses](https://ai-sdk.dev/v7/docs/ai-sdk-harnesses/overview)
own a larger runtime boundary—workspace, native tools, session state,
compaction, permissions, and sandbox—and are explicitly separate from the
provider/model abstraction. Work Cell deliberately retains direct control of
its tool loop, contracts, and custom architecture. A future harness-backed Cell
adapter is a separate decision, especially while the Harness API is
experimental.

Kimi thinking mode introduces one provider constraint that the runtime cannot
wish away. [Kimi's tool-use documentation](https://platform.kimi.com/docs/guide/migrating-from-openai-to-kimi)
admits only `auto` and `none` tool choice, while Work Cell may request a named
terminal tool during recovery. The Kimi adapter lowers `required` or named
selection to `auto`; the model still receives the terminal-only instruction,
and the unchanged runtime verifies that exactly one declared terminal tool was
actually called. A missing call remains a failed contract. The adapter also
enables thinking and interleaved reasoning history so later tool steps retain
the `reasoning_content` required by Kimi's documented protocol.

The provider uses the official AI SDK package's truthful AI SDK/runtime
User-Agent. It does not impersonate Kimi CLI, Claude Code, or another approved
client to obtain subscription access.

## Development-skill form

Three provider integrations now expose a reusable judgment: determine protocol
ownership, model identity, error meaning, tool and structured-output
compatibility, economic semantics, and the smallest live probe before declaring
support. That is a plausible future agent-facing `model-provider-integration`
Skill, not a new runtime.

Do not create it in this implementation slice. First complete a live Kimi
terminal-tool probe and retain the actual incompatibilities; then extract the
method from DeepSeek, OpenCode Go, and Kimi without copying Work Cell-specific
paths into a falsely generic Skill. Reopen this form decision earlier only if a
fresh agent cannot add Kimi correctly from this decision and the existing
provider extension points.

## Institutional prevention

This defect class is broader than model routing: a concrete current strategy
can be given a generic name while its implementation still embeds current
identities, protocol quirks, or preferences. The durable prevention form is a
project-level design gate in `AGENTS.md`, not a new Sequence principle or a
mandatory skill. P05, P15, and P16 already bear the needed judgment; the missing
piece was an always-present action form for repository work.

Any implementation that claims reuse now receives a substitution probe before
acceptance. Replace one current provider, model, artifact kind, or default
strategy with a plausible alternative. A correct boundary changes policy or an
adapter while leaving the mechanism unchanged. Its tests must expose the same
separation: neutral identities for mechanism behavior, concrete cases for
adapter quirks, and an integration probe for the actual project policy. A
one-off implementation is not forced through this gate unless it claims reuse
or a second variation makes the boundary real.

## Rejected alternatives

- **Restart the Cell with DeepSeek after an OpenCode Go failure.** Earlier
  writes and commands could execute twice, so a cost fallback would become an
  unsafe execution replay.
- **Read or predict the remote allowance locally.** OpenCode Go owns multiple
  mutable limits. The API response is the authoritative availability signal.
- **Use OpenCode CLI or the OpenCode harness.** The subscription exposes a
  direct model endpoint; adding a complete coding runtime would surrender the
  Work Cell boundaries this change is meant to preserve.
- **Fall back on every error.** Cancellation and local protocol failures must
  remain visible rather than being misclassified as provider exhaustion.
- **Treat Kimi Coding Plan as another DeepSeek endpoint.** Its stable model IDs,
  reasoning history, tool-choice restriction, identity requirement, and
  subscription economics are provider-owned differences.
- **Use Kimi CLI or Kimi Agent SDK as the model driver.** Those own a coding
  harness and agent loop. Work Cell only needs the documented model endpoint
  and retains its own tools, workspace, completion contracts, and evidence.

## Verification

- A deterministic two-provider probe must show that a successful primary call
  never touches the fallback.
- A quota/unavailability probe must show that only the failed model call moves
  to DeepSeek while an earlier tool action executes exactly once.
- A cancellation probe must show that no fallback call is attempted.
- Provider-neutral route tests must pass after replacing OpenCode and DeepSeek
  identities with arbitrary preferred and reserve targets.
- Adapter tests must keep OpenCode's JSON and error behavior outside the generic
  route tests, while the validation-policy test retains today's credential
  ordering.
- Kimi adapter tests must retain the real AI SDK client identity, thinking and
  reasoning-history settings, tool-choice translation, provider-specific model
  ID, and fail-closed handling of malformed requests.
- A low-cost live OpenCode Go call must exercise a real Work Cell terminal tool
  and retain the selected route in its record.
- A low-cost live structured call must return an AI SDK-validated object through
  the OpenCode route after the request-shape translation.
- Package typecheck and the full Work Cell test suite must remain green.
- Before Kimi is called live-verified, a low-cost Cell must call a terminal tool
  through the Coding Plan endpoint and retain `kimi-coding` plus the actual
  model in route metadata. A structured-output probe is separately required
  before claiming that capability through the stable Coding Plan alias.

The retained [validation evaluation](../../regeneration/evaluations/2026-07-16-opencode-go-validation-routing.md)
records deterministic failover and non-replay probes, the live terminal call,
the live structured-output call, the rejected native `json_schema` form, and
the independent review corrections. It also retains a large review-run estimate
miss as an unresolved orchestration observation rather than hiding it behind the
successful provider route.

## Sequence expression

- **P04 / P15:** spend the available prepaid capacity by changing only the
  model-call boundary that governs the present cost contradiction.
- **P13:** the remote provider response, not a guessed local quota counter,
  determines when fallback is justified and the selected route is retained.
- **P14:** route metadata is evidence attached to the call; summaries and cost
  projections must remain rebuildable from the execution record.
