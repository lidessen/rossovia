# 034 — Validation Model Routing

**Status:** implemented and verified
**Date:** 2026-07-16
**Approved by:** principal

## Concrete pressure

Work Cell validation runs currently bind every model call directly to the
official DeepSeek API. The principal has a prepaid OpenCode Go allowance and
wants validation to consume its DeepSeek V4 Flash capacity first, then continue
through the official DeepSeek API when that service is unavailable or its
allowance is exhausted.

[OpenCode Go documents](https://opencode.ai/docs/go/) a DeepSeek V4 Flash model
through an OpenAI-compatible endpoint. Its allowance is governed by separate
five-hour, weekly, and monthly dollar-value limits, so the runtime must not
pretend that one locally knowable counter determines availability.

## Decision

Route each non-streaming validation model call independently:

1. When `OPENCODE_API_KEY` is present, call OpenCode Go's
   `deepseek-v4-flash` model first.
2. When that provider reports quota, authentication, timeout, rate-limit,
   server, or transport unavailability, retry the same model request through
   the official DeepSeek API using `DEEPSEEK_API_KEY`.
3. When no OpenCode Go key is present, use the official DeepSeek API directly.
4. Do not fall back after caller cancellation, or for a valid provider response
   that later fails a Work Cell tool, output, terminal, or verification
   contract. Those are not provider-availability failures.

Failover lives at the model-call boundary inside the existing AI SDK agent
loop. It does not restart a Cell or replay its prior tools. Each successful
call records the serving route in provider metadata; a fallback record also
retains a bounded classification of the primary failure.

The implementation has three owners:

- `model-route.ts` owns provider-neutral ordered execution, cancellation,
  target-owned fallback decisions, aggregate failure, and route evidence;
- `providers/` owns concrete model construction, request translation, provider
  error meaning, and provider pricing;
- `validation-model.ts` owns this project's present credential discovery and
  OpenCode Go → DeepSeek ordering.

Changing today's provider choice must not change the generic route mechanism.
Changing an endpoint or provider-specific response form must not change the
validation policy. The current pair has matching token prices, so the existing
aggregate cost estimator remains truthful. The validation policy fails closed
if these prices diverge; heterogeneous route pricing requires a separate
route-aware cost-audit change rather than silently applying one target's price
to another target's usage.

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
- A low-cost live OpenCode Go call must exercise a real Work Cell terminal tool
  and retain the selected route in its record.
- A low-cost live structured call must return an AI SDK-validated object through
  the OpenCode route after the request-shape translation.
- Package typecheck and the full Work Cell test suite must remain green.

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
