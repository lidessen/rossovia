# 036 — Provider Observation and Explicit Preference

**Status:** first slice implemented and locally verified
**Date:** 2026-07-16
**Approved direction:** principal

## Concrete pressure

Work Cell originally treated the presence of `OPENCODE_API_KEY`,
`KIMI_CODE_API_KEY`, or `DEEPSEEK_API_KEY` as both credential availability and
permission to spend that provider. That collapsed three different facts:

1. a credential reference exists on this device;
2. the provider is currently available and has usable allowance; and
3. this person wants this workload to use that provider in this order.

The collapse becomes unsafe on a personal machine with several subscriptions,
pay-as-you-go keys, test-only gateways, and capacity intentionally reserved for
interactive work. Another user will make different choices from the same
credential inventory. A global environment variable is a possible secret
carrier, not a grant of execution authority.

## Comparative evidence

[Reasonix setup](https://reasonix.io/docs/#configuration-%E9%85%8D%E7%BD%AE)
keeps the provider's `api_key_env` name in configuration and the secret in its
global credential store; project `.env` files are explicitly not provider-key
fallbacks. Its source stages provider and credential edits, presents a summary,
asks for confirmation, and warns before one credential name is shared across
different endpoints. This most closely preserves discovery, intent, and commit
as separate transitions.

[OpenCode provider setup](https://opencode.ai/docs/providers) gives users a
clear `/connect` flow followed by explicit model selection, and custom provider
credentials do not by themselves complete provider configuration. However,
[its CLI also loads providers from credentials, environment variables, and a
project `.env`](https://github.com/anomalyco/opencode/blob/dev/packages/web/src/content/docs/cli.mdx).
That convenience is acceptable for an interactive coding tool but would make an
unattended Work Cell silently inherit unrelated host authority.

[Hermes configuration](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/configuration.md)
separates secrets in `.env` from model, provider, and fallback policy in
`config.yaml`, exposes a common provider registry, and supports explicit
provider order and exclusions. Its `auto` modes are useful interaction
defaults, but are not admitted into this runtime's automatic execution path.

## Decision

Use a small form stack with separate owners.

| Form | Owns | Does not own |
|---|---|---|
| provider catalog | supported provider IDs and candidate credential references | user permission or live availability |
| read-only discovery projection | whether named credential references are present | secret values, network probes, or route selection |
| provider profile | a human-confirmed ordered route and secret references | secret values or current allowance |
| provider observer adapter | one provider's current auth/quota evidence and source semantics | route preference or execution fallback |
| model route runtime | execution through the selected ordered targets | discovery, profile mutation, or semantic acceptance |

The first profile is `work-cell.provider-profile.v1`. It contains one explicit
`validation` route. Every target names a provider and an environment-variable
reference; optional model and base URL fields remain provider configuration,
not secrets. The default location is
`$XDG_CONFIG_HOME/work-cell/providers.json` (or
`~/.config/work-cell/providers.json`), and
`WORK_CELL_PROVIDER_PROFILE` may select another projection.

`provider discover` reports only provider ID, credential-reference name, and a
presence boolean. It performs no provider request and does not select anything.
`provider configure` accepts an ordered list or prompts for one, shows the
complete non-secret route, asks for confirmation, and atomically writes the
profile. Model execution fails closed when no explicit profile or route exists,
even when every known API key is present globally. It resolves only credentials
referenced by the selected route. The profile schema rejects unknown fields so
a misspelled model, endpoint, or credential setting cannot silently fall back
to another execution choice.

One invocation may explicitly observe a named provider. Observation has a
provider-neutral result with:

- current availability, separately from quota;
- normalized quota windows when a truthful source exists;
- `current`, `cached`, or `stale` quota freshness;
- observation and cache times; and
- evidence source plus authority class.

Provider adapters retain protocol differences. Codex reads
`account/rateLimits/read` through the local app-server without starting a model
turn. Claude reads current `claude auth status`; the generic `provider capture
claude` command receives Claude Code's documented statusline JSON stream and
writes only `rate_limits` plus its capture time to Work Cell's own XDG cache. It
may optionally forward the unchanged input to an existing statusline command,
but that command and its files are never data dependencies. A cache never proves
current auth and becomes stale when its shortest window has elapsed or every
recorded reset is past. Kimi uses its experimental provider usage endpoint. No
adapter fabricates allowance from per-call token usage.

Observation does not yet pre-empt a route. A later selector may use only a
current observation and must still remain subordinate to the profile: an
available provider omitted from the route remains unauthorized, while a stale
quota record cannot disable or enable one.

## Personal configuration boundary

Preferences such as “reserve Codex for interactive work,” “prefer OpenCode Go
and Kimi,” “use DeepSeek for pay-as-you-go fallback,” “use Vercel AI Gateway
only for tests,” or “drain then retire ZenMux” belong to a user environment
profile. Work Cell consumes only the route projection relevant to its own
purpose. It does not make one person's provider policy a project default.

The current route schema deliberately avoids a general rule language. Add a
second named route only when a second workload needs a different executable
order. Add conditions such as price, latency, task capability, or time windows
only after a real selector can name and verify that decision.

## Rejected alternatives

- **Use every recognized global environment variable.** Presence is not
  consent and makes unrelated shell state execution authority.
- **Probe every discovered credential before asking.** Discovery would spend
  network authority and may consume quota or trigger audit events before the
  user selects a provider.
- **Put secrets in the provider profile.** It would make a portable preference
  artifact a credential store and expose values to ordinary inspection.
- **One universal health endpoint.** Codex, Claude, Kimi, OpenCode Go, and API
  gateways expose different auth and allowance surfaces; a common result is
  useful, a fictitious common protocol is not.
- **Use cached quota as availability.** A stale percentage can outlive several
  reset windows; current auth and cache history are distinct evidence.
- **Create a Skill for provider selection.** This is enforced execution,
  secret-resolution, and observation behavior. A Skill may later teach provider
  integration judgment, but it cannot enforce the runtime boundary.

## Verification

- Discovery with fake secret values must expose only references and booleans.
- A model route with a selected provider but no referenced credential must fail
  before dispatch; a host with keys but no profile must also fail.
- A configured ordered route must construct the same order without contacting a
  model provider.
- Codex and Claude deterministic adapters must normalize their real wire shapes
  and keep cache evidence distinct from live auth.
- A live Codex observer must return allowance through app-server without
  creating a thread or turn.
- A Claude capture probe must discard transcript and display fields, retain only
  normalized rate limits, and let the observer report current auth separately
  from cache freshness.
- The complete Work Cell typecheck and test suite must pass.

## Sequence expression

- **P16:** discovery, confirmation, status, and execution use forms matched to
  the person's next action.
- **P11:** credential presence cannot grant execution authority; the user
  commits the route.
- **P14:** status views and cache-normalized quota are projections with named
  sources, never preference authority.
- **P15:** one ordered route and one normalized observation contract close the
  present gap without a policy language or central provider service.
