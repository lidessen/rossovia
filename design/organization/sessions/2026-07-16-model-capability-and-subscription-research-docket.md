# Model Capability and Subscription Harness Research Docket

**Status:** proposed inquiries; not an approved mission or task queue

**Date:** 2026-07-16

**Source:** principal direction in the 2026-07-16 preparation session

**Form decision:** retain one source-linked research docket until a concrete
probe is authorized; do not create active mission records for unstarted work

## Why these inquiries belong together

Fine-grained task allocation needs two kinds of evidence that the current
provider list does not supply:

1. what a model can reliably do under a named execution environment; and
2. what that execution actually costs or consumes under API or subscription
   access.

A model name alone is therefore not the evaluated subject. The minimum useful
identity is a versioned tuple such as **model + provider or plan + coding
harness + harness version + prompt/skill/tool profile + execution policy**.
Changing any member can change the observed capability. The eventual allocator
may consume this evidence, but it must not infer capability from price, public
leaderboards, or one successful run.

## Inquiry A — model capability cognition

### Decision to enable

Given a task shape and acceptable risk, which evaluated execution profile is
the least costly one that remains reliably capable, and when is a stronger
profile justified?

### Required model

The result should be a versioned, evidence-linked **capability profile**, not a
single intelligence score. Its dimensions should arise from real work the
system needs to allocate—for example bounded implementation, repository
cognition, code review, design judgment, instruction following, tool use,
structured settlement, and long-context recovery. Each dimension records:

- the task distribution and held-out cases;
- harness, context, skills, tools, permissions, and model identity;
- correctness or decision-quality criteria plus material failure classes;
- repeated-trial success, variance, latency, usage, and observed money or plan
  consumption;
- confidence and the evidence revision on which the claim rests.

This follows the useful part of [OpenAI's evaluation guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices):
task-specific tests should reflect real-world distributions, combine metrics
with calibrated human judgment, include production and historical cases, and
continue to grow. Public benchmarks may be comparison evidence, but cannot
replace project-relative tasks. Fresh or private cases are also important
because public benchmark contamination can overstate generalization, as shown
by [Rethinking Benchmark and Contamination for Language Models](https://arxiv.org/abs/2311.04850).

### Smallest informative probe

Select three materially different, previously completed project tasks with
independent acceptance evidence. Run two candidate profiles more than once
under the same packet and permissions. Compare not only final correctness but
failure mode, intervention required, latency, usage, and retry cost. The probe
is disproved as an allocation basis if within-profile variance is as large as
the claimed difference between profiles.

## Inquiry B — rapid degradation check

### Decision to enable

Has a previously characterized execution profile become materially worse than
its own recent baseline, so that routing should pause or demand a fuller
evaluation?

This is a change detector, not a miniature general benchmark and not proof that
a model has globally become less intelligent. “Degradation” can originate in
the model alias, provider routing or load, quota fallback, harness version,
prompt/context delivery, tool permissions, or transient transport failure.
Those identities and conditions must be checked before attributing the change
to the model.

### Smallest informative probe

Derive a small canary set from the capability profile: a few short,
high-signal cases covering critical known strengths and characteristic failure
modes. Run paired or repeated trials against a pinned recent baseline. Report a
suspected regression only when the effect exceeds the baseline's observed
variance; otherwise report inconclusive and retain the samples. A single prompt
or one surprising answer is an observation, not a degradation verdict.

The full profile therefore precedes a trustworthy canary. The canary may later
be a fast CLI projection over stored cases and results; it should not own the
evaluation method or baseline authority.

## Inquiry C — subscription-backed coding harnesses

### Decision to enable

How can Work Cell or a later orchestrator use paid Codex, Claude Code, and
Cursor capacity without treating a product subscription as a raw model API or
coupling the execution core to each vendor's CLI flags?

### Current evidence

All three products expose an official non-interactive coding-agent surface and
retain their own authentication and session semantics:

| Harness | Subscription evidence | Programmatic surface |
|---|---|---|
| Codex CLI | [ChatGPT sign-in provides subscription access](https://developers.openai.com/codex/auth) | [`codex exec` is the scripted/non-interactive entry and supports JSONL, output schema, sandbox selection, and session resume](https://developers.openai.com/codex/cli/reference) |
| Claude Code | [Claude.ai Pro/Max and organization subscriptions are valid login methods](https://code.claude.com/docs/en/authentication) | [`claude -p` supports structured output, permissions, turn control, and resume/continue](https://code.claude.com/docs/en/cli-reference) |
| Cursor Agent CLI | [Cursor states that the CLI uses models from the Cursor subscription](https://cursor.com/blog/cli) | [print mode supports JSON/stream JSON, model selection, and session resume](https://docs.cursor.com/en/cli/reference/parameters) |

The preferred integration is therefore an explicit **harness runner adapter**,
usually launched as a fresh non-interactive process and resumed only through
the harness's documented session mechanism. Interactive PTY driving is a
fallback for capabilities with no stable headless surface, not the default.
Credentials remain owned by the installed harness. The project must not scrape
or copy subscription tokens, impersonate a provider API, or silently let an API
key override the intended subscription identity.

### Small generic runner contract

The execution core should know capabilities and normalized events, not vendor
flags. A first contract needs only:

- read-only availability, version, and active-auth-kind probe;
- start a non-interactive run in a named workspace;
- resume an exact prior session when supported;
- normalized progress events, final result, exit/error class, and session ID;
- declared workspace, permission, cancellation, and timeout policy;
- observed usage or quota projection when the harness exposes it; and
- evidence sufficient to distinguish “never started,” “failed,” and “outcome
  unknown after execution began.”

Tool ownership is the major boundary: a direct Work Cell provider executes
Work Cell's declared tools, while a coding harness already owns its agent loop,
repository context, tools, skills, and permission system. A harness runner is
therefore not another AI SDK provider adapter. The first probe should be
read-only and should compare equivalent small repository tasks across all
available harnesses before any write authority is added.

## What AgentParty contributes

[AgentParty](https://github.com/leeguooooo/AgentParty) is strong evidence that
subscription-backed harness composition is practical. Its most transferable
ideas are:

- separate message/dispatch protocol from the Codex, Claude, or Codex SDK
  runner;
- persist exact continuation identity rather than rebuilding every turn from a
  transcript;
- isolate per-runner session state while reusing the host harness's owned
  credential path;
- preserve delivery cursors, use wake budgets and loop guards, and expose a
  token-free local status projection; and
- let heterogeneous harnesses spend their own quotas and run comparable tasks.

These claims are visible both in its [public usage model](https://github.com/leeguooooo/AgentParty#readme)
and in the inspected implementation at commit
[`40544c2`](https://github.com/leeguooooo/AgentParty/tree/40544c262a39147332a30b696e241134403a66d1),
including the [runner/session implementation](https://github.com/leeguooooo/AgentParty/blob/40544c262a39147332a30b696e241134403a66d1/cli/src/commands/serve.ts)
and [status-line contract](https://github.com/leeguooooo/AgentParty/blob/40544c262a39147332a30b696e241134403a66d1/docs/statusline-contract.md).

AgentParty should not be adopted as the Work Cell core. It primarily solves
cross-agent communication, wake, and dispatch; it does not supply model
capability evaluation, and its resident service owns a much broader authority
surface than a bounded Cell. Its runner implementation is also heavily
harness-specific and licensed under Business Source License 1.1. Learn from
the boundaries and failure semantics; do not copy the service architecture or
code into a smaller execution mechanism.

## Likely durable forms, if probes justify them

| Concern | Method/strategy owner | Mechanism/evidence owner |
|---|---|---|
| Capability cognition | a model-evaluation method or Skill that selects task distributions, criteria, and interpretation | Work Cell/Swarm execute samples; durable evaluation records retain profile evidence |
| Rapid degradation check | the same evaluation owner selects canaries and thresholds | a small repeatable runner and comparison projection |
| Subscription use | local guidance selects harness and authority profile | a generic harness-runner protocol plus thin, version-checked vendor adapters |
| Task allocation | a later routing method combines capability confidence, work estimate, risk, and cost | allocator consumes profiles; it does not author or self-approve them |

No new principle is yet warranted. P02/P03/P05/P08 already require empirical,
task-specific, revisable knowledge; P10 makes cost and human intervention
material; P13 prevents an observed run or vendor label from becoming accepted
capability without traceable verification. The present gap is method and
evidence, not doctrine.

## Reactivation and ordering

This docket becomes actionable when the principal authorizes one of these
bounded probes:

1. **Harness probe first:** define the minimum runner contract and execute one
   read-only repository task through each locally available subscription. This
   establishes controlled execution identities and immediate practical value.
2. **Capability seed next:** evaluate two execution profiles on three retained
   real tasks with repeated trials and independent acceptance evidence.
3. **Canary last:** derive a fast degradation suite only after the capability
   seed exposes stable, high-signal cases and normal variance.

Starting any probe should create its own bounded mission only if it actually
forks into material multi-session work. Until then, this record is a retained
inquiry, not authorization to build.
