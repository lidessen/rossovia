# OpenCode Go validation routing evaluation

**Date:** 2026-07-16
**Decision:** [034 — Validation Model Routing](../../design/decisions/034-validation-model-routing.md)

## Question

Can every Work Cell validation entry prefer OpenCode Go's DeepSeek V4 Flash
model, move only an unavailable model call to the official DeepSeek API, and
retain enough evidence to audit the actual route without replaying prior tool
actions?

## Deterministic evidence

`bun run typecheck` passed. `bun test` passed 91 tests across 16 files with 390
expectations.

The added probes establish:

- provider-neutral preferred and reserve targets prove that route execution has
  no OpenCode or DeepSeek identity dependency;
- a target-owned failure policy moves one call to the next target and retains
  the failed target and classified reason;
- a caller cancellation makes zero fallback calls;
- the OpenCode adapter classifies 429 for fallback while keeping a 400 invalid
  request visible;
- after one successful `read_file`, a second-call 429 uses DeepSeek inside the
  same AI SDK loop and the read remains executed exactly once;
- the validation policy executes only the human-confirmed profile targets whose
  referenced credentials are available;
- the OpenCode adapter's JSON Schema lowering retains the schema instruction,
  JSON-object response mode, and disabled-thinking setting.

## Live evidence

A minimal terminal-only Cell ran through the documented
[OpenCode Go endpoint](https://opencode.ai/docs/go/) with no read, write, or
command authority:

- run ID: `46ddf578-6ea9-42e6-911c-68207138446c`;
- status: `passed`;
- terminal contract: `confirm_route` called exactly once;
- usage: 698 input, 45 output, 743 total tokens;
- recorded route: `routeId=validation`, `servedBy=opencode-go`,
  `mode=preferred`, with no failed attempts.

A separate structured-output call returned and validated
`{"status":"ok"}` through the same preferred route using 101 input and 5
output tokens.

## Disconfirming observation and correction

The first structured-output probe declared native `json_schema` support. The
OpenCode Go upstream rejected it with HTTP 400 `invalid_request_error`. Removing
that declaration still failed because JSON-object mode requires the request
context to ask explicitly for JSON and no longer carries the schema itself.

The corrected adapter translates AI SDK's `json_schema` request into the
endpoint's accepted `json_object` form, injects the original schema as a
call-local system constraint, and leaves the returned object subject to the
original AI SDK/Zod validation. The corrected live probe passed. HTTP 400 was
deliberately not added to the fallback set; doing so would conceal invalid
requests and silently shift structured workloads to the paid fallback.

## Institutional probe

The first implementation gave a provider-specific function a generic name. The
substitution probe replaced OpenCode Go and DeepSeek with neutral preferred and
reserve targets and showed that provider IDs, request adaptation, error
classification, environment variables, and pricing still lived in the route
mechanism. The corrected implementation separates:

- provider-neutral route execution and evidence in `model-route.ts`;
- concrete protocol and error behavior in `providers/`;
- current project ordering and credential policy in `validation-model.ts`.

The repository's always-present `AGENTS.md` now requires this substitution probe
for implementations that claim reuse. It deliberately does not force the same
abstraction onto one-off code with no demonstrated variation.

## Independent review and correction

A three-packet Work Cell review separated route mechanics, provider/policy
behavior, and governance evidence. Two Cells submitted valid terminal reports;
the governance Cell produced a review-shaped payload but failed terminal input
parsing, so its record remains protocol-error evidence rather than an accepted
review report.

Source inspection accepted and corrected these findings:

- provider defaults now live inside the DeepSeek adapter rather than leaking
  through one validation-wide `providerOptions` object;
- HTTP 409 remains visible instead of being guessed to mean provider
  unavailability;
- research records retain the configured route rather than falsely attributing
  OpenCode Go runs to `deepseek`;
- duplicated DeepSeek-specific usage normalization became one provider-neutral
  normalizer that prefers standard AI SDK cache details and can inspect any
  provider metadata key as a fallback;
- the non-streaming route restriction is now explicit at the route constructor.

The review's cached-token-loss claim was disproved by the retained run itself:
1,441,664 cached input tokens were recorded through OpenCode Go. The claim that
dropping `json_schema.name` could break the provider was also defeated by the
live structured-output probes, because the endpoint receives `json_object`
rather than a malformed native schema request. Treating an `APICallError`
without a status as transport unavailability remains consistent with the
accepted fallback contract; arbitrary non-API exceptions do not fall back.

The review run also exposed an unresolved execution-efficiency problem. Three
Cells consumed 1,848,487 aggregate tokens against a 44,000-token estimate, with
1,441,664 tokens served from cache. Repeated growing tool-loop context, not the
semantic packet count alone, dominated usage; one oversized terminal payload
also failed JSON parsing. This observation does not invalidate the review
findings, but it prevents claiming that the current review packet form is
cost-stable. Future review work should start with smaller evidence projections
and shorter terminal payloads rather than rerunning this whole Swarm unchanged.

A targeted correction review then used a 41-line evidence projection, seven
declared investigation steps, a compact terminal schema, and a 120,000-token
estimate. It settled `ready_with_residual_risk` with no findings at 66,627 total
tokens, including 30,848 cached input tokens—a 44.5% estimate error inside the
declared ±75% tolerance. Terminal recovery was still needed after a natural
finish, but the compact payload parsed and submitted successfully. This supports
the smaller projection form while leaving voluntary primary-loop termination as
an observed runtime weakness rather than declaring it solved.

GitHub's AI review of the first commit then found a narrower usage path: the
driver's step callbacks destructured provider metadata but passed `undefined`
to the normalizer. Final successful runs still used aggregate metadata, and
standard cache details kept the large OpenCode run accurate, but an error after
a completed step could lose provider-metadata-only cache evidence. Both primary
and terminal-recovery callbacks now pass their metadata, and a deterministic
failure-path test retains that completed step's cache usage.

## Revised finding

The routing mechanism is ready for validation use after an explicit provider
profile selects its targets. Credential presence alone does not prefer or
authorize OpenCode Go. The fallback boundary is one model call, not one Cell.
OpenCode Go's published token tariffs measure the fixed-price subscription's
allowance consumption rather than marginal spend, so subscription and mixed
routes no longer emit a dollar cost estimate. The generic mechanism, concrete
provider adapters, current policy, and project-level prevention gate have
separate owners. AI SDK Harnesses remain a separate, experimental future
adapter for delegating to complete coding runtimes and are not part of this
provider route.
