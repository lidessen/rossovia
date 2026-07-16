# 032 — AI SDK 7 Work Cell Driver Migration

**Status:** implemented and verified
**Date:** 2026-07-15
**Approved by:** principal

## Concrete need

Work Cell used AI SDK 6 as a replaceable driver edge while its core contracts
remained provider- and SDK-independent. [AI SDK 7](https://vercel.com/blog/ai-sdk-7)
adds scoped tool/runtime context, lifecycle and performance observations,
provider file references, approval hardening, finer timeouts, durable workflow
and harness adapters. The useful question is which changes strengthen the
existing driver without turning AI SDK into the Work Cell runtime.

The strongest unchanged case was to stay on AI SDK 6 until a missing feature
blocked work. It would avoid migration churn, but leave the supported driver on
the prior major and postpone a cheap compatibility check while the package is
still locally contained. The adapter boundary makes a bounded migration the
smaller risk.

## Decision

Upgrade the Work Cell package to `ai@7.0.28` and
[`@ai-sdk/deepseek@3.0.11`](https://www.npmjs.com/package/@ai-sdk/deepseek),
retaining AI SDK and provider types inside adapters. Apply only the required
API changes:

- `stepCountIs` becomes `isStepCount`;
- call and step overrides use `instructions` rather than `system`;
- per-step observation uses `onStepEnd` rather than `onStepFinish`;
- usage normalization reads cached input from
  `inputTokenDetails.cacheReadTokens` and still lowers it into the stable
  `CellUsage.cachedInputTokens` field; and
- the driver descriptor records `ai-sdk-v7`.

AI SDK 7 per-step performance is retained inside the existing
`agent.step.finished` and recovery trace events. This adds response/step time,
throughput, and tool-duration evidence without changing `CellRunRecord` or
making an SDK telemetry schema authoritative.

Do not add `WorkflowAgent`, `HarnessAgent`, MCP Apps, realtime media, a hosted
sandbox, provider-uploaded skills, or global telemetry registration in this
slice. A future durable orchestration carrier may evaluate `WorkflowAgent`, but
it must implement the accepted Work Source/settlement boundary rather than own
the Cell contract.

Scoped tool context is also deferred. Current built-in tools are constructed
inside the driver and close over the already-bounded `DriverContext`; no
third-party tool receives a shared secret object. Add `contextSchema` only when
an independently supplied tool needs a smaller capability grant.

## Migration observation

The official v7 codemod was invoked with `--dry --print`, but still modified the
working tree. Its API renames were useful; its usage rewrite also replaced this
project's unrelated internal `CellUsage.cachedInputTokens` accesses with SDK
`inputTokenDetails` accesses, causing TypeScript failures across core and
research code. The migration retained the SDK-boundary rewrites and corrected
the internal-domain false positives before verification.

This is a tool-specific observation, not a general claim that the codemod is
unsafe in every repository. Future use must run in a clean branch/worktree and
inspect `git diff` even when `--dry` was requested.

## Terminal semantics disposition

The migration itself made no terminal-contract behavior changes. The subsequent
independent review rehearsal exposed a real closure defect, now resolved by the
separate [Work Cell terminal contract](033-work-cell-terminal-contract.md).

Eve's framework `final_output` is a no-execute terminal tool whose input itself
is the schema-constrained final result. Work Cell deliberately keeps
`terminalTools`, `outputSchema`, and artifacts orthogonal: a caller-defined
terminal action is not automatically the logical output schema. The present
driver therefore performs a final output step after a terminal call and may run
one bounded recovery agent if a model ends naturally without the required call.

The adopted contract stops immediately after a terminal call when no structured
output is required, preserves one tool-free output step when both contracts are
declared, and retains recovery context without hardcoding Eve's `final_output`
or making one schema imply another.

## Verification

- TypeScript checking passes against AI SDK 7 and the DeepSeek v3 provider.
- The complete deterministic package suite passes 77 tests and 339 assertions,
  including terminal recovery, structured output, usage retention, dynamic
  orchestration, and the 256-Cell Swarm boundary.
- A low-cost live `deepseek-v4-flash` call passed through the real v7 adapter
  with 650 total tokens and retained v7 performance statistics; see the
  [live migration probe](../../regeneration/evaluations/2026-07-15-work-cell-ai-sdk-7-live-probe.md).

The live result proves provider-path compatibility and observation retention,
not response quality, tool context, file upload, durable recovery, or terminal
contract improvement.

## Sequence expression

- **P02 / P05:** migrate from current package and runtime evidence rather than
  adopting the release feature list as architecture.
- **P14:** SDK telemetry and performance fields remain retained evidence or
  projections inside the stable Work Cell record boundary.
- **P15:** take the compatible driver upgrade and observation gain while
  deferring unrelated runtime and terminal-contract changes.
