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
- the Coding Plan endpoint receives its required temperature of `1`, even when
  a generic validation caller requests temperature `0` or selects `k3`;
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
generic validation callers request temperature 0, while the Kimi Coding
endpoint owns a fixed provider constraint. The adapter translates validation
temperature to 1 before transport.

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

## K3 and bounded tool recovery follow-up

The authenticated read-only [Coding Plan model catalog](https://api.kimi.com/coding/v1/models)
exposed `kimi-for-coding` as K2.7 Coding, a high-speed sibling, and `k3` with a
1,048,576-token context window. This catalog is live provider evidence, not a
portable promise that the same models remain available to every account.

The first K3 structured and terminal probes both failed before token use with
`invalid temperature: only 1 is allowed for this model`. This disproved the
earlier claim that explicitly selected models should retain caller
temperature. Fixed-temperature translation therefore belongs to the Coding
Plan endpoint, not the stable alias. After that repair:

- structured run `a77579d5-f3c5-4474-b473-e29b4f54f4f1` passed through
  `kimi-coding/k3` with 671 tokens;
- terminal run `1ccd4947-35a3-46e3-b187-2189961860a0` called `finish_probe`
  exactly once and passed with 646 tokens; and
- Sequence project probe `643a970a-cb25-40cd-87fe-3377ca978759` selected its
  P-ID team, read the declared README scope, called `finish_probe`, and passed
  through K3 without fallback with 9,455 tokens, within its declared 8,000 ±50%
  estimate.

Separately, two stable-alias Sequence probes ended naturally without calling
`express_genes`. Because Kimi thinking models accept only automatic or disabled
tool choice, translating a forced tool call to `auto` had removed the transport
guarantee. Sequence preparation now permits one explicit system-level recovery
call, then fails closed. Deterministic adapter tests show that a natural finish
can recover without replaying execution and that an exhausted recovery retains
both calls' actual usage instead of reporting zero. The later live K2.7 and K3
project probes passed without entering recovery, so live recovery frequency
remains unmeasured rather than inferred from the deterministic test.

This third provider case now supplies the concrete incompatibilities needed for
a later provider-integration Skill: endpoint and credential identity, model-ID
ownership, request translation, reasoning continuity, tool-choice support,
structured-output claims, error taxonomy, economics, quota observation, and
live probes. Extract that method separately; do not make Work Cell depend on a
development Skill at runtime.
