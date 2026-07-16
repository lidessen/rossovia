# 033 — Work Cell Terminal Contract

**Status:** implemented and verified
**Date:** 2026-07-15
**Approved by:** principal

## Concrete pressure

A Work Cell may declare caller-defined `terminalTools`, an `outputSchema`, and
required artifacts as independent completion contracts. The AI SDK driver
previously asked for another free-text response after every terminal call and,
when the main loop exhausted its steps, started a recovery loop with only the
empty final text rather than the accumulated tool context.

An independent review rehearsal exposed both failures. A reviewer used every
main-loop step for investigation, so recovery invoked `submit_review` without
the evidence it had gathered. The terminal payload correctly reported an
incomplete review, while the following free-text step invented findings against
files that did not exist. The Cell was mechanically marked passed even though
the readable report contradicted its authoritative terminal action.

## Decision

Keep the three completion contracts orthogonal, but give each one one clear
runtime meaning:

- `terminalTools` declares a one-of action contract. Exactly one declared tool
  must be called. Its caller-defined input is retained in the trace and is not
  silently reinterpreted as `outputSchema`.
- Without `outputSchema`, a valid terminal call ends the model loop immediately.
  The driver creates only a deterministic readable summary when the provider
  emitted no text; it does not ask the model to narrate or revise the action.
- With `outputSchema`, the terminal call satisfies only the action contract. One
  tool-free step may then produce the independently validated logical output.
- Artifacts remain workspace evidence verified by `runCell`; neither a terminal
  input nor a structured output implies that a file exists.

The main loop reserves one final action step for a terminal-only Cell and a
second tool-free result step when `outputSchema` is also declared. Ordinary
tools are disabled during that phase, and a sole terminal tool is explicitly
selected rather than merely requesting an unspecified tool. If a provider
still repeats a previously visible ordinary tool or the main loop otherwise
ends without the action, a bounded recovery loop receives a compact projection
of every successful tool result from the original trace, retains the prepared
task instructions and context that give those results meaning, and exposes only
the declared terminal tools. It does not replay old tool-call messages that the
provider could imitate, and it folds exact duplicate tool results without
discarding distinct partial reads. A rejected late action does not erase earlier
evidence; the recovery must not restart the task from an empty summary, invent a
new meaning for the terminal schema, or claim that retained reads never occurred.
The original trace and Cell input remain the evidence sources; the recovery
context is their rebuildable action-oriented projection.

This is protocol completion, not semantic acceptance. A `submit_review` payload
may still be unsupported or false; the host or committee must inspect its file
evidence before accepting the review.

## Rejected alternatives

- **Hardcode `submit_result` or `final_output`.** Tool names and input schemas
  belong to the caller; the generic driver only enforces the declared one-of
  contract.
- **Make terminal input equal structured output.** Some terminal tools are
  actions such as approve, reject, or escalate, while the logical result is a
  separate report. Coupling them removes valid combinations.
- **Trust a prompt to make the model stop.** Two live review attempts consumed
  every allowed step without submitting. A protocol cannot depend on the model
  voluntarily following a prose reminder.
- **Accept any terminal tool calls.** Calling both approve and reject is not a
  valid one-of disposition and now fails the Cell protocol.

## Verification

- A deterministic driver probe shows that the sole terminal tool is explicitly
  selected during the action phase, an attempted late read is not executed, and
  the loop stops immediately after the terminal call.
- An AI SDK probe calls two terminal tools in one step and observes an immediate
  failure plus `terminal.contract.violation` evidence. An independent generic
  driver returns both calls and `runCell` settles `protocol_error`, confirming
  that final contract authority does not belong to the adapter.
- Input validation rejects duplicate terminal names, and the AI SDK adapter
  rejects a terminal name that collides with an ordinary execution tool before
  model dispatch.
- Existing recovery and simultaneous `terminalTools + outputSchema` probes pass
  while retaining usage from both loops.
- A provider-behavior probe repeats an ordinary read despite a terminal-only
  final tool surface. The read is not executed, recovery retains the three
  earlier successful results, and the terminal action settles from that
  evidence instead of reporting an empty investigation.
- A live terminal-only review retained a valid tool payload but AI SDK's absent
  structured-output getter raised `No output generated`. The adapter now reads
  structured output only when `outputSchema` is declared; a live replay settles
  the same terminal form as passed without inventing another output contract.
- The [independent review record](../../regeneration/evaluations/2026-07-15-work-cell-orchestration-independent-review.md)
  retains the failed forms and fabricated findings, then a stronger-model
  correction review that submitted `ready` from the primary loop without
  recovery.
- The [cognitive-modeling evaluation](../../regeneration/evaluations/2026-07-15-code-review-cognitive-modeling.md)
  retains the terminal projection failure, its source payload, and the corrected
  provider replay.

Reopen this decision if a provider cannot reliably express an explicit tool
choice, if preserving response messages makes recovery exceed a real context
boundary, or if a caller needs terminal payloads promoted into a typed public
record rather than retained in trace evidence.

## Sequence expression

- **P16:** completion form must let the executor perform the promised action;
  prose that merely asks it to stop is not a functioning protocol.
- **P14:** the terminal call and its payload are retained source evidence;
  readable final text and verification summaries remain projections.
- **P15 / P08:** change only the failing closure path and keep disconfirming
  probes for late ordinary actions, double termination, and contextless recovery.
