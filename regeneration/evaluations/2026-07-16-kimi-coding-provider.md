# Kimi Coding Plan Provider Probe

**Status:** deterministic and live terminal, structured-output, and quota observations verified
**Date:** 2026-07-16
**Design boundary:** [validation routing decision 034](../../design/decisions/034-validation-model-routing.md)

## Claim and disconfirming observations

The extension claims that Work Cell can use Kimi Coding Plan as an optional
subscription-backed validation provider without importing Kimi's coding harness,
spoofing another client, reusing DeepSeek's model ID, replaying a Cell, hiding a
malformed request, or applying a token price to subscription usage.

The claim is defeated if a configured Kimi key does not produce the route
`opencode-go -> kimi-coding -> deepseek`, if a quota failure restarts prior tool
work, if Kimi receives unsupported forced tool choice, if reasoning history is
lost between tool steps, if a 400/404 request defect silently falls through, or
if the record cannot identify the provider-specific model that served a call.

## Source observations

- [Kimi Code's official overview](https://www.kimi.com/code/docs/en/) admits
  third-party API access, gives the Coding Plan endpoint and stable model IDs,
  and requires the caller to preserve its real client identity.
- [Kimi's error reference](https://www.kimi.com/code/docs/en/kimi-code/error-reference.html)
  distinguishes membership, quota, rate-limit, malformed-request, model, and
  server failures. The adapter admits fallback only for provider availability,
  authentication/plan access, quota, timeout, and server/transport failures.
- [Kimi's OpenAI migration guide](https://platform.kimi.com/docs/guide/migrating-from-openai-to-kimi)
  documents that thinking-mode tool calls accept only `auto` and `none`, not
  `required` or a named tool.
- [The official AI SDK Moonshot provider](https://ai-sdk.dev/providers/ai-sdk-providers/moonshotai)
  supports thinking and interleaved reasoning history, so the project uses that
  provider instead of recreating `reasoning_content` transport.
- A [Kimi developer-support response](https://forum.moonshot.ai/t/error-code-429-were-receiving-too-many-requests-at-the-moment/191/7)
  identifies `/coding/v1/usages` as an experimental endpoint and explains that
  its numeric limits are percentages rather than token counts. The quota
  observer preserves that provisional status instead of treating it as a
  stable execution dependency.
- [OpenCode Go's official usage page](https://opencode.ai/docs/go/#usage-limits)
  names 5-hour, weekly, and monthly allowance windows but only directs users to
  the console. A live model-list request and a 89-token chat probe returned no
  quota or rate-limit headers; the implementation therefore does not claim
  API-key-only OpenCode allowance reporting.

## Deterministic observations

The focused adapter and policy tests exercised the real AI SDK provider against
an injected local fetch boundary and observed:

- requests target `https://api.kimi.com/coding/v1/chat/completions` with model
  `kimi-for-coding`;
- the API key is carried as Bearer authentication without its value entering
  retained evaluation output;
- the User-Agent truthfully identifies AI SDK 7 and Bun rather than Kimi CLI,
  Claude Code, or another client;
- thinking is enabled and `reasoning_history` is `interleaved`;
- the stable alias receives its required temperature of `1`, even when a
  generic validation caller requests temperature `0`;
- named and required tool choice are translated to `auto`, while ordinary
  `auto` remains unchanged;
- 402, 403, and 429 failures admit fallback, while 400 and 404 remain visible;
- a simulated Kimi 429 advances exactly one model call to DeepSeek and retains
  `kimi-coding`, `deepseek`, and the actual served model in route metadata;
- an explicit profile can select Kimi alone or OpenCode Go -> Kimi Coding ->
  DeepSeek, while globally present credentials with no profile remain
  unauthorized;
  and
- any route containing Kimi or OpenCode Go omits aggregate dollar estimation
  because subscription allowance is not marginal spend, and a fallback API's
  token usage is not attributable from one aggregate counter.

`bun run typecheck` and the full Work Cell suite passed after the live repairs.
A focused test initially expected
the Moonshot package name in User-Agent; the observed official provider instead
reported AI SDK and Bun. The expectation was corrected to retain the real
identity rather than changing production headers to satisfy the test.

## Live observations

The configured `KIMI_CODE_API_KEY` was discovered without reading or retaining
its value. All other validation credentials were disabled for the model probes.

The first terminal probe failed before execution with `invalid temperature:
only 1 is allowed for this model`. This disconfirmed the deterministic adapter:
generic validation callers request temperature 0, while the stable Kimi Coding
alias owns a fixed provider constraint. The adapter now translates only that
alias to temperature 1 and retains caller temperature for explicitly selected
other models. A focused regression test covers both branches.

After repair, terminal run `0e7bffa5-eba7-4165-9b46-9172303c43ac` passed through
`kimi-coding/kimi-for-coding`. It called the sole `finish_probe` tool exactly
once with `{ "status": "ok" }`; terminal verification passed with 364 input,
105 output, and 469 total tokens.

Independent structured-output run `cf9b780f-4169-4d19-8e89-14115dd59db7`
returned `{ "status": "ok", "observation": "The structured probe completed." }`.
AI SDK validated the declared object with 418 input, 96 output, and 514 total
tokens. The Moonshot adapter warned that the stable alias does not advertise
native JSON Schema; it lowered the request to JSON-object mode, and Work Cell's
final schema validation remained fail-closed.

The read-only quota command returned a weekly window, a 5-hour rolling window,
and concurrency 20 from the experimental Kimi endpoint. Both reported 100%
remaining during the probe. The response did not expose a separately named
monthly window, so the observer does not infer one from `totalQuota`.

This third provider case now supplies the concrete incompatibilities needed for
a later provider-integration Skill: endpoint and credential identity, model-ID
ownership, request translation, reasoning continuity, tool-choice support,
structured-output claims, error taxonomy, economics, quota observation, and
live probes. Extract that method separately; do not make Work Cell depend on a
development Skill at runtime.
