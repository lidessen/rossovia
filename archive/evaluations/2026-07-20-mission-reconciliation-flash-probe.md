# Mission reconciliation Flash capability probe

**Date:** 2026-07-20

**Status:** probe

**Admission authority:** Principal; no capability admission has been recorded

## Allocation decision

Should the explicit OpenCode Go DeepSeek V4 Flash execution profile be tried in
one low-consequence Mission as the ordinary one-anchor/one-input reconciliation
worker, while an independent verifier and the Principal retain state-transition
authority?

The bounded hypothesis is not that the model can interpret arbitrary
conversation history. It is that the whole execution profile can repeatedly
select `continue`, `correction`, or `decision-required` from one active intent
anchor and exactly the next contribution, then submit the fields required by
that branch through one terminal tool.

## Execution profile identity

- profile: `opencode-go-deepseek-v4-flash-reconciliation-v2`;
- route: one explicit `opencode-go` target, model `deepseek-v4-flash`, no
  fallback; the endpoint and model ID match the current
  [OpenCode Go endpoint table](https://opencode.ai/docs/go/#endpoints);
- harness: AI SDK 7 `ToolLoopAgent` through Work Cell and
  `atthis.mission-reconciliation.v1`;
- context: exactly one source-linked active anchor and next contribution;
- tools: exactly three caller-defined terminal disposition tools, with no file,
  command, or write authority;
- execution: serial, temperature zero, at most four steps and 120 seconds;
- raw local records:
  `/tmp/atthis-reconciliation-capability-probe-oneof-tools-v1.json` and
  `/tmp/atthis-reconciliation-capability-confirmation-v2.json`.

The provider route record proves only the selected OpenCode Go route and model
alias. It does not prove a hidden backend build or revision.

## Comparison-validity gate

The attribution target is the whole profile, not the bare model. Expected
dispositions remained evaluator-only in the probe runner and never entered the
Cell context. The three cases discriminate an unchanged direction, an explicit
constraint replacement, and a contribution whose referent and degree are
ambiguous. Transport or terminal failure would have defeated the hypothesis
before semantic matching was considered.

The cases are synthetic projections of actual autonomy design corrections, not
production tasks with independent acceptance provenance. The result may support
a low-consequence trial but cannot admit a reusable capability profile.

## Development observations

The first six calls never reached semantic evaluation: OpenCode Go rejected the
root `oneOf` terminal-tool schema before serving tokens. A direct seven-token
health call and simple tool calls succeeded, separating provider availability
from request-shape compatibility.

A flattened transport schema reached the model in six of six runs, but the
model populated fields from every visible branch. Work Cell passed the terminal
contract while strict internal reconciliation rejected all six payloads. The
smallest correction was not more prose or post-hoc field deletion. The one
union-shaped terminal action became three mutually exclusive terminal tools;
tool choice now carries the disposition and each input schema exposes only its
own fields.

The next six development runs selected the expected disposition in all cases,
but three runs first attempted `list_files` even though `readPaths` was empty.
The generic AI SDK driver now omits read tools when the Cell has no read scope.
A deterministic test preserves that capability-to-tool-surface relation. These
cases taught the treatment and were therefore excluded from confirmation.

## Held-out confirmation

Three new cases ran twice each after the prompt, terminal contract, and tool
surface were frozen:

| Case | Expected | Repeated result | Run IDs |
|---|---|---|---|
| continue with a new evidence obligation | `continue` | 2/2 passed and matched | `0253d693-ba09-400b-8f82-c1c7a3f067b8`, `cfda11c4-5295-464a-83f7-346d1a25826d` |
| replace blocking/shared delegation lifecycle | `correction` | 2/2 passed and matched | `3634e9f5-979c-4e56-9e97-1a3c10eea8a1`, `9706ee02-0403-465c-9929-48804c6252cc` |
| unclear permission relaxation | `decision-required` | 2/2 passed and matched | `e5803c37-d90f-4184-9e70-4241c4d6837d`, `f309e768-f43e-4127-89c7-777cdec727d5` |

All six runs:

- passed Work Cell terminal and artifact verification;
- selected the expected disposition and supplied every strict branch field;
- used exactly one terminal tool call with no terminal recovery;
- recorded `servedBy=opencode-go`, `model=deepseek-v4-flash`, `mode=direct`,
  and no failed route attempt;
- made no unavailable file or command call;
- consumed 9,851 total tokens, zero reported cached tokens, and 32.173 seconds
  of aggregate wall time.

Repeated wording differed, but the selected branch, governing distinction, and
material fields were stable. No judge model was needed because branch matching
and schema completion were mechanical; the human-readable payloads were
inspected for contradictions and none were found.

## Contrary evidence and boundary

The rejected union transport, six invalid flattened payloads, and unavailable
read-tool attempts remain contrary development evidence. They show that this
result depends materially on harness shape and cannot be attributed to the
model alone.

The confirmation field did not test noisy multi-turn history, disputed actor
authority, several simultaneous inputs, adversarial wording, non-Chinese input,
long anchors, or whether a proposed next anchor is correct. The reconciliation
Cell still cannot accept its own proposal, advance a watermark, publish an
effect, or close a Mission.

## Low-consequence live Mission trial

After the held-out field passed, the next interactive `继续` was retained as
input `input:2026-07-20:continue-after-flash-probe` on the local
`supervised-autonomy-mvp-local-trial` timeline. Its active anchor required the
next smallest guarded practice, terminal-tool Agent loops, separation of
proposal/verification/commit, and no model-owned Mission-state authority.

The proposer run `2aff6586-b253-4218-8a3c-6c03c7bd20e8` selected `continue`,
retained the active constraints as response obligations, and used 1,664 tokens.
The independent verifier run `beca8453-13f0-4d8a-b6df-745c95b82a7e` received
only the anchor, input, and proposal. It submitted `verified-transition`,
preserved all four constraints, repeated the anchor as the next-anchor
statement, and used 2,314 tokens. Neither run needed fallback or terminal
recovery.

The raw ignored evidence is retained at
`.work-cell/autonomy-trials/trial-1784610668045.json`. The trial has not advanced
the reconciled watermark. During review, the existing commit contract's plain
`verifierRef` string proved insufficiently load-bearing. The corrected contract
requires the complete verification payload, exact proposal digest and run,
distinct verifier run, both Work Cell evidence references, and exact equality
between the verified and committed next-anchor statements. Human authority
remains the final commit gate.

## Candidate use and reopening observation

This probe and first live trial support further read-only supervised Mission
practice with independent verification. They do not yet support automatic
profile allocation, writable effects, model-owned commit, or a general
reliability claim.

Reopen or reject the hypothesis if a live trial chooses the wrong disposition,
loses an active constraint or response obligation, uses an unavailable tool,
requires terminal recovery, exceeds its execution envelope, or creates more
human reconstruction work than direct reconciliation. Promotion requires
representative retained Mission inputs with independent acceptance evidence and
human admission.
