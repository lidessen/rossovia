# Code Review Risk Lenses

Load only the sections touched by the proposed change. These are attention
prompts, not mandatory findings or a substitute for tracing actual callers.

## Public contract and compatibility

- exported types, serialized schemas, CLI/API behavior, error shapes;
- old records, callers, configuration, and migration or rollback paths;
- defaults that changed meaning without changing syntax.

## State, lifecycle, and effects

- ownership of mutable state and fact/derived-state boundaries;
- initialization, partial completion, cleanup, retry, and idempotency;
- persistence ordering, crash windows, and reconstructible projections.

## Concurrency, cancellation, and scheduling

- admission versus execution bounds;
- races across actual asynchronous boundaries rather than imagined
  interleavings inside synchronous regions;
- cancellation propagation, in-flight settlement, leaked waiters or leases;
- ordering assumptions, duplicate delivery, starvation, and backpressure.

## Capability and security boundaries

- filesystem/network/process scope, path containment, secret exposure;
- validation before effects, fail-open fallbacks, privilege expansion;
- user-controlled input crossing interpreters, shells, templates, or protocols.

## Agent and tool protocols

- tool schema validation, terminal conditions, missing or duplicate calls;
- distinction among tool input, logical output, artifacts, trace, and acceptance;
- context preservation across loops, recovery, retries, and summarization;
- model output treated as a proposal until deterministic or human verification.

## Resources and observability

- repeated context, unbounded output, concurrency multiplication, timeouts;
- estimates versus actual usage and post-run auditability;
- whether errors retain enough partial evidence to diagnose and resume.

## Verification quality

- checks that observe the user- or caller-visible contract;
- realistic failure stories rather than decorative assertions;
- deterministic tests for runtime mechanics and live/independent evaluation for
  model judgment, provider behavior, or usefulness claims.
