# Provider Observation and Preference Probe

**Status:** deterministic boundary and independent Claude capture verified
**Date:** 2026-07-16
**Design boundary:** [decision 036](../../design/decisions/036-provider-observation-and-explicit-preference.md)

## Claim and disconfirming observations

The implementation claims that credential discovery, human preference,
provider observation, and model execution are separate transitions. It also
claims that Claude quota capture is owned by Work Cell rather than a statusline
product. The claim is defeated if a secret value enters discovery output, a
global key can authorize model use without a profile, observing Codex starts a
model turn, Claude auth is inferred from cached quota, or Claude observation
requires another product's executable or cache format.

## Comparative evidence

- [Reasonix configuration](https://reasonix.io/docs/#configuration-%E9%85%8D%E7%BD%AE)
  keeps credential references separate from provider configuration and stages
  setup before confirmation.
- [OpenCode provider setup](https://opencode.ai/docs/providers) provides an
  explicit connection and model-selection flow, while its broader environment
  discovery is intentionally not copied into unattended execution authority.
- [Hermes configuration](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/configuration.md)
  separates secret carriers from provider order and fallback policy.
- [Codex app-server](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md)
  exposes account rate limits without requiring a model turn.
- [Claude Code statusline](https://code.claude.com/docs/en/statusline) supplies
  rate limits in the documented JSON input delivered to a configured command.

## Deterministic observations

- Discovery returned only provider IDs, environment-variable names, labels,
  and presence booleans; injected secret values did not occur in serialized
  output.
- Model construction failed before dispatch when all known global keys were
  present but the selected provider profile was absent.
- Explicit routes preserved their declared order and rejected a missing
  referenced credential. A misspelled execution field failed schema validation
  instead of being stripped and replaced by a default.
- Codex and Claude wire fixtures normalized into the same observation contract
  while retaining `local-runtime` and `local-cache` as different authorities.
- Claude capture discarded model display and transcript-path input, wrote only
  version, capture time, and rate limits to an owned cache, and marked cached
  evidence separately from current authentication. An empty `rate_limits`
  object produced no cache and no quota claim.
- A profile-selected model without a known price produced no dollar estimate
  instead of inheriting the default model's tariff.
- OpenCode Go's subscription tariff produced no marginal-dollar estimate;
  direct official DeepSeek V4 Flash retained its current provider price.
- The full package typecheck and test suite passed with 105 tests and no
  failures.

## Non-model live observations

A Codex app-server probe used only `account/rateLimits/read`; it created no
thread or turn. A Kimi provider probe read its experimental usage endpoint.
Neither observation was used to authorize or reorder a model route.

A synthetic Claude statusline record was piped directly into `provider capture
claude` while `/bin/cat` received the unchanged input through optional
forwarding. The owned cache contained no transcript path or display data, and
the Claude observer consumed that cache without inspecting the forwarding
command or any third-party files. This proves the protocol boundary without
spending a Claude model allowance.

The remaining deployment step is deliberately separate: after this branch is
stable, a user may configure Claude Code's statusline to invoke the installed
capture command, optionally forwarding to their existing statusline. Until
then, Claude authentication can still be observed, but no fresh quota is
claimed.
